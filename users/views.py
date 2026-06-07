from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from django.db.models import Count
from users.models import CustomUser
import secrets
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import timedelta
from users.serializers import (
    RegisterSerializer, UserSerializer,
    UpdateProfileSerializer, validate_password_strength,
)
from users.models import CustomUser, EmailVerificationToken

MAX_VERIFICATION_SENDS = 5


def _send_verification(user, new_email: str = '') -> tuple[bool, str]:
    """
    Send (or resend) a verification email, enforcing a MAX_VERIFICATION_SENDS limit.

    - new_email: if set, this is an email-change flow; the token stores new_email.
    - Returns (success: bool, message: str).
    - Updates the existing token in-place on resend (preserves send_count).
    """
    existing = EmailVerificationToken.objects.filter(user=user).first()

    if existing and existing.send_count >= MAX_VERIFICATION_SENDS:
        return False, (
            f'Verification email has already been sent {MAX_VERIFICATION_SENDS} times. '
            'Contact support if you need further assistance.'
        )

    recipient = new_email or user.email

    if existing:
        # Update token in-place — new secret, extended expiry, increment count
        existing.token      = secrets.token_urlsafe(64)
        existing.expires_at = timezone.now() + timedelta(hours=24)
        existing.send_count += 1
        if new_email:
            existing.new_email = new_email
        existing.save(update_fields=['token', 'expires_at', 'send_count', 'new_email'])
        token_obj = existing
    else:
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token=secrets.token_urlsafe(64),
            expires_at=timezone.now() + timedelta(hours=24),
            new_email=new_email,
            send_count=1,
        )

    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token_obj.token}"

    if new_email:
        subject = 'Confirm your new Envirr email address'
        body = (
            f"Hi {user.username},\n\n"
            f"You requested to change your email to {new_email}.\n"
            f"Click the link below to confirm. It expires in 24 hours.\n\n"
            f"{verify_url}\n\n"
            f"If you didn't request this, your current email is unchanged.\n\n"
            f"— The Envirr Team"
        )
    else:
        subject = 'Verify your Envirr email address'
        body = (
            f"Hi {user.username},\n\n"
            f"Click the link below to verify your email and activate your account. "
            f"This link expires in 24 hours.\n\n"
            f"{verify_url}\n\n"
            f"If you didn't create this account, ignore this email.\n\n"
            f"— The Envirr Team"
        )

    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )

    remaining = MAX_VERIFICATION_SENDS - token_obj.send_count
    msg = f'Verification email sent to {recipient}.'
    if remaining > 0:
        msg += f' You can resend {remaining} more time{"s" if remaining != 1 else ""}.'
    return True, msg


class LoginRateThrottle(ScopedRateThrottle):
    scope = 'login'


def set_auth_cookies(response, access_token, refresh_token=None):
    opts = dict(httponly=True, secure=not settings.DEBUG, samesite='Lax', path='/')
    response.set_cookie('access_token', access_token, **opts)
    if refresh_token:
        response.set_cookie('refresh_token', refresh_token, **opts)
    return response


def clear_auth_cookies(response):
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/')
    return response


class CookieTokenObtainPairView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=400)

        user = CustomUser.objects.filter(username__iexact=username).first()

        if not user or not user.check_password(password):
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 10:
                    user.is_active = False
                    user.save(update_fields=['failed_login_attempts', 'is_active'])
                    return Response(
                        {'detail': 'Your account has been locked after too many failed attempts. '
                                   'Contact support to regain access.'},
                        status=403,
                    )
                user.save(update_fields=['failed_login_attempts'])
            return Response(
                {'detail': 'No active account found with the given credentials.'},
                status=401,
            )

        if not user.is_active:
            # Distinguish between unverified email and admin-locked account
            if not user.email_verified:
                return Response(
                    {'detail': 'Please verify your email address before logging in. '
                               'Check your inbox for the verification link.'},
                    status=403,
                )
            return Response(
                {'detail': 'Your account has been locked. Contact support to regain access.'},
                status=403,
            )

        # Successful login — reset failure counter
        if user.failed_login_attempts:
            user.failed_login_attempts = 0
            user.save(update_fields=['failed_login_attempts'])

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        response = Response({'message': 'Login successful'}, status=200)
        set_auth_cookies(response, access, str(refresh))
        return response


class CookieTokenRefreshView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'detail': 'Refresh token not found'}, status=401)

        try:
            refresh = RefreshToken(refresh_token)
            access = str(refresh.access_token)
            response = Response({'message': 'Token refreshed'}, status=200)
            response.set_cookie(
                'access_token', access,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Lax',
                path='/',
            )
            return response
        except TokenError:
            return Response({'detail': 'Invalid or expired refresh token'}, status=401)


class LogoutView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, _request):
        response = Response({'message': 'Logged out'}, status=200)
        clear_auth_cookies(response)
        return response


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

class UserDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        serializer.update(request.user, serializer.validated_data)
        return Response(
            UserSerializer(request.user).data,
            status=200,
        )


class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password', '')
        new_password     = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not current_password or not new_password or not confirm_password:
            return Response(
                {'detail': 'current_password, new_password and confirm_password are all required.'},
                status=400,
            )

        if not user.check_password(current_password):
            return Response(
                {'detail': 'Your current password is incorrect.'},
                status=400,
            )

        if new_password != confirm_password:
            return Response(
                {'detail': 'New password and confirm password do not match.'},
                status=400,
            )

        try:
            validate_password_strength(new_password)
        except Exception as e:
            return Response({'detail': str(e.detail[0]) if hasattr(e, 'detail') else str(e)}, status=400)

        if new_password == current_password:
            return Response(
                {'detail': 'New password must be different from your current password.'},
                status=400,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        # Issue fresh tokens so the user stays logged in after the change
        refresh = RefreshToken.for_user(user)
        response = Response({'detail': 'Password changed successfully.'}, status=200)
        set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class SendVerificationEmailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user

        # For email-change resends, target is the pending email
        new_email = user.pending_email or ''

        if user.email_verified and not new_email:
            return Response({'detail': 'Your email is already verified.'}, status=400)

        ok, msg = _send_verification(user, new_email=new_email)
        status_code = 200 if ok else 429
        return Response({'detail': msg}, status=status_code)


class VerifyEmailView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        """
        Validate the token exists and is not expired — does NOT consume it.
        Safe for email scanners to call repeatedly.
        """
        token_str = request.query_params.get('token', '').strip()
        if not token_str:
            return Response({'detail': 'Verification token is missing.'}, status=400)

        try:
            token_obj = EmailVerificationToken.objects.get(token=token_str)
        except EmailVerificationToken.DoesNotExist:
            return Response({'detail': 'Invalid or already used verification link.'}, status=400)

        if token_obj.is_expired:
            token_obj.delete()
            return Response({'detail': 'This verification link has expired. Please request a new one.'}, status=400)

        return Response({'detail': 'Token is valid. Click confirm to activate your account.'}, status=200)

    def post(self, request):
        """
        Consume the token and activate the account.
        Only triggered by an explicit user action (button click), not by scanners.
        """
        token_str = request.data.get('token', '').strip()
        if not token_str:
            return Response({'detail': 'Verification token is missing.'}, status=400)

        try:
            token_obj = EmailVerificationToken.objects.select_related('user').get(token=token_str)
        except EmailVerificationToken.DoesNotExist:
            return Response({'detail': 'Invalid or already used verification link.'}, status=400)

        if token_obj.is_expired:
            token_obj.delete()
            return Response({'detail': 'This verification link has expired. Please request a new one.'}, status=400)

        user = token_obj.user

        if token_obj.new_email:
            # Email change flow — swap pending email in
            user.email = token_obj.new_email
            user.pending_email = ''
            user.email_verified = True
            user.save(update_fields=['email', 'pending_email', 'email_verified'])
            token_obj.delete()
            return Response({'detail': f'Email updated to {user.email}. You can now log in with your new email.'}, status=200)

        # Registration flow — activate account
        user.email_verified = True
        user.is_active = True
        user.save(update_fields=['email_verified', 'is_active'])
        token_obj.delete()
        return Response({'detail': 'Email verified! Your account is now active. You can log in.'}, status=200)


class ToggleCourseBuilderView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, user_id):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)
        try:
            target = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        if target.role != 'teacher':
            return Response({'error': 'Only teachers can be granted course-builder access.'}, status=400)
        target.can_build_courses = not target.can_build_courses
        target.save(update_fields=['can_build_courses'])
        return Response({'can_build_courses': target.can_build_courses})


class ToggleQuestionEditorView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, user_id):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)
        try:
            target = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        if target.role != 'teacher':
            return Response({'error': 'Only teachers can be granted question-editor access.'}, status=400)
        target.can_edit_questions = not target.can_edit_questions
        target.save(update_fields=['can_edit_questions'])
        return Response({'can_edit_questions': target.can_edit_questions})


class ToggleUserStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, user_id):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin access required.'}, status=403)
        if request.user.id == user_id:
            return Response({'detail': 'You cannot change your own status.'}, status=400)
        try:
            target = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        if target.role == 'admin':
            return Response({'detail': 'Admin status cannot be changed here.'}, status=400)

        target.is_active = not target.is_active
        # Reset failed login counter when admin re-activates an account
        if target.is_active:
            target.failed_login_attempts = 0
        target.save(update_fields=['is_active', 'failed_login_attempts'])

        state = 'activated' if target.is_active else 'deactivated'
        return Response({'is_active': target.is_active, 'detail': f'User {state} successfully.'}, status=200)


class AssignSubjectsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, user_id):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin access required.'}, status=403)
        try:
            target = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        if target.role != 'teacher':
            return Response({'detail': 'Subjects can only be assigned to teachers.'}, status=400)
        subjects = request.data.get('subjects', [])
        if not isinstance(subjects, list):
            return Response({'detail': 'subjects must be a list of strings.'}, status=400)
        target.assigned_subjects = [s.strip() for s in subjects if isinstance(s, str) and s.strip()]
        target.save(update_fields=['assigned_subjects'])
        return Response({'assigned_subjects': target.assigned_subjects})


class DeleteUserView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, user_id):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin access required.'}, status=403)
        if request.user.id == user_id:
            return Response({'detail': 'You cannot delete your own account.'}, status=400)
        try:
            target = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        if target.role == 'admin':
            return Response({'detail': 'Admin accounts cannot be deleted via this panel.'}, status=400)
        username = target.username
        target.delete()
        return Response({'detail': f'User "{username}" has been permanently deleted.'}, status=200)


class AdminAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)

        from ai_engine.models import QuestionBank, QuestionPaper
        from django.db.models import Count

        # User counts
        role_counts = CustomUser.objects.values('role').annotate(n=Count('id'))
        counts_by_role = {r['role']: r['n'] for r in role_counts}
        total_users = sum(counts_by_role.values())

        # Question bank breakdown by subject
        qbank_by_subject = (
            QuestionBank.objects
            .values('subject')
            .annotate(total=Count('id'), ai_gen=Count('id'))
            .order_by('-total')[:6]
        )

        # Recent papers
        papers = QuestionPaper.objects.select_related('created_by').order_by('-created_at')[:10]
        paper_data = []
        for p in papers:
            paper_data.append({
                'id': p.id,
                'title': p.title,
                'subject': p.subject,
                'board': p.board or 'CBSE',
                'grade': p.class_grade or '10',
                'total_marks': p.total_marks,
                'created_by': p.created_by.username if p.created_by else 'AI_GEN',
                'created_at': p.created_at.strftime('%b %d, %Y'),
                'mode': p.config.get('mode', 'full_ai') if p.config else 'full_ai',
            })

        # Recent users
        users = CustomUser.objects.order_by('-date_joined')[:10]
        user_data = [
            {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'role': u.role,
                'date_joined': u.date_joined.strftime('%b %d, %Y'),
                'is_active': u.is_active,
                'can_build_courses': u.can_build_courses,
                'can_edit_questions': u.can_edit_questions,
                'assigned_subjects': u.assigned_subjects,
            }
            for u in users
        ]

        return Response({
            'kpi': {
                'total_users': total_users,
                'students': counts_by_role.get('student', 0),
                'teachers': counts_by_role.get('teacher', 0),
                'admins': counts_by_role.get('admin', 0),
                'total_questions': QuestionBank.objects.count(),
                'total_papers': QuestionPaper.objects.count(),
            },
            'qbank_by_subject': list(qbank_by_subject),
            'papers': paper_data,
            'users': user_data,
        })
