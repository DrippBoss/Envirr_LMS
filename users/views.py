import logging
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle

security_logger = logging.getLogger('envirr.security')
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.db.models import Count
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
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

# Page size for the admin dashboard user table. The analytics endpoint returns
# the first page; AdminUsersListView serves page 2+ for the "Show More" button.
ADMIN_USERS_PAGE_SIZE = 20


def _serialize_admin_user(u):
    """Shape a CustomUser for the admin dashboard user table. Shared by the
    analytics summary (first page) and the paginated users list (Show More)."""
    return {
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

# Generic responses for unauthenticated account-recovery endpoints. We always
# return the same message whether or not the account exists so the endpoints
# can't be used to enumerate valid usernames/emails.
GENERIC_RECOVERY_MSG = (
    'If an account matching that information exists, we have sent an email '
    'with further instructions. Please check your inbox.'
)


def _send_password_reset(user) -> None:
    """Email a password-reset link using Django's stateless token generator.

    The token encodes the user's pk, a timestamp, and a hash of the current
    password — so it auto-invalidates once the password changes or after
    PASSWORD_RESET_TIMEOUT. No DB model is needed.
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

    body = (
        f"Hi {user.username},\n\n"
        f"We received a request to reset your Envirr password. "
        f"Click the link below to choose a new one. This link expires in "
        f"{settings.PASSWORD_RESET_TIMEOUT // 3600} hours.\n\n"
        f"{reset_url}\n\n"
        f"If you didn't request this, you can safely ignore this email — "
        f"your password will remain unchanged.\n\n"
        f"— The Envirr Team"
    )
    send_mail(
        subject='Reset your Envirr password',
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


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


class AccountRecoveryThrottle(ScopedRateThrottle):
    """Tight rate limit for the unauthenticated resend / password-reset
    endpoints to blunt email-bombing and enumeration brute-forcing."""
    scope = 'account_recovery'


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
                # Atomically increment the failure counter under a row lock so
                # concurrent failed attempts cannot race past the lockout
                # threshold (S1). Without the lock, N simultaneous requests can
                # each read the same count and all write count+1, letting an
                # attacker exceed 10 tries before is_active flips to False.
                with transaction.atomic():
                    locked = CustomUser.objects.select_for_update().get(pk=user.pk)
                    locked.failed_login_attempts += 1
                    if locked.failed_login_attempts >= 10:
                        locked.is_active = False
                        locked.save(update_fields=['failed_login_attempts', 'is_active'])
                        security_logger.error(
                            'account_locked username=%r attempts=%d ip=%s',
                            locked.username, locked.failed_login_attempts,
                            request.META.get('REMOTE_ADDR', ''),
                        )
                        return Response(
                            {'detail': 'Your account has been locked after too many failed attempts. '
                                       'Contact support to regain access.'},
                            status=403,
                        )
                    locked.save(update_fields=['failed_login_attempts'])
                    security_logger.warning(
                        'failed_login username=%r attempts=%d ip=%s',
                        locked.username, locked.failed_login_attempts,
                        request.META.get('REMOTE_ADDR', ''),
                    )
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


class ResendVerificationView(APIView):
    """Unauthenticated email-verification resend (#26).

    Replaces the old frontend hack of logging the user in just to call the
    authenticated send-verification endpoint. Accepts a username, looks up an
    unverified account, and resends — always returning a generic message so it
    can't be used to probe which usernames exist.
    """
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [AccountRecoveryThrottle]

    def post(self, request):
        username = request.data.get('username', '').strip()
        if not username:
            return Response({'detail': 'Username is required.'}, status=400)

        user = CustomUser.objects.filter(username__iexact=username).first()
        # Only resend for accounts that exist and still need verification.
        if user and not user.email_verified:
            _send_verification(user, new_email=user.pending_email or '')

        return Response({'detail': GENERIC_RECOVERY_MSG}, status=200)


class PasswordResetRequestView(APIView):
    """Step 1 of forgot-password (#7): email a reset link.

    Accepts username or email. Enumeration-safe: always returns the same
    generic message regardless of whether a matching account was found.
    """
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [AccountRecoveryThrottle]

    def post(self, request):
        identifier = (request.data.get('username') or request.data.get('email') or '').strip()
        if not identifier:
            return Response({'detail': 'Enter your username or email.'}, status=400)

        user = CustomUser.objects.filter(username__iexact=identifier).first()
        if not user:
            user = CustomUser.objects.filter(email__iexact=identifier).first()

        # Only send to active, verified accounts with an email on file. A
        # locked or unverified account can't reset its way back in — they go
        # through verification/support instead.
        if user and user.is_active and user.email:
            _send_password_reset(user)

        return Response({'detail': GENERIC_RECOVERY_MSG}, status=200)


class PasswordResetConfirmView(APIView):
    """Step 2 of forgot-password (#7): consume the token, set new password."""
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [AccountRecoveryThrottle]

    def post(self, request):
        uid_b64          = request.data.get('uid', '')
        token            = request.data.get('token', '')
        new_password     = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not uid_b64 or not token:
            return Response({'detail': 'This reset link is invalid or incomplete.'}, status=400)
        if not new_password or not confirm_password:
            return Response({'detail': 'new_password and confirm_password are required.'}, status=400)
        if new_password != confirm_password:
            return Response({'detail': 'New password and confirm password do not match.'}, status=400)

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({'detail': 'This reset link is invalid or has expired.'}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This reset link is invalid or has expired.'}, status=400)

        try:
            validate_password_strength(new_password)
        except Exception as e:
            return Response({'detail': str(e.detail[0]) if hasattr(e, 'detail') else str(e)}, status=400)

        user.set_password(new_password)
        # A successful reset proves email ownership and should clear a lockout.
        user.failed_login_attempts = 0
        user.save(update_fields=['password', 'failed_login_attempts'])

        return Response({'detail': 'Your password has been reset. You can now log in.'}, status=200)


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
        security_logger.info(
            'permission_change admin=%s target=%s can_build_courses=%s',
            request.user.username, target.username, target.can_build_courses,
        )
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
        security_logger.info(
            'permission_change admin=%s target=%s can_edit_questions=%s',
            request.user.username, target.username, target.can_edit_questions,
        )
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
        security_logger.warning(
            'user_status_change admin=%s target=%s action=%s',
            request.user.username, target.username, state,
        )
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
        role = target.role
        target.delete()
        security_logger.warning(
            'user_deleted admin=%s target=%s role=%s',
            request.user.username, username, role,
        )
        return Response({'detail': f'User "{username}" has been permanently deleted.'}, status=200)


class AdminAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)

        from ai_engine.models import QuestionBank, QuestionPaper
        from learning.models import SessionAnswer, MockTestAttempt
        from django.db.models import Count, Q, Avg, F, FloatField, ExpressionWrapper
        from django.db.models.functions import TruncDate
        from django.utils import timezone
        from datetime import timedelta

        # User counts
        role_counts = CustomUser.objects.values('role').annotate(n=Count('id'))
        counts_by_role = {r['role']: r['n'] for r in role_counts}
        total_users = sum(counts_by_role.values())

        # ── Daily active students (last 30 days) ──────────────────────
        # A student is "active" on a day if they answered a lesson question
        # or started a mock test that day. Counted as distinct StudentProfiles.
        start = timezone.localdate() - timedelta(days=29)
        active_pairs = set()
        for source, ts_field in (
            (SessionAnswer.objects, 'answered_at'),
            (MockTestAttempt.objects, 'created_at'),
        ):
            rows = (
                source.filter(**{f'{ts_field}__date__gte': start})
                .annotate(day=TruncDate(ts_field))
                .values_list('day', 'student_id')
                .distinct()
            )
            active_pairs.update(rows)
        per_day = {}
        for day, _sid in active_pairs:
            per_day[day] = per_day.get(day, 0) + 1
        day_bars = [per_day.get(start + timedelta(days=i), 0) for i in range(30)]

        # ── Subject-wise average mock-test score ──────────────────────
        subject_scores = [
            {'label': r['subject'], 'pct': round(r['avg_pct'] or 0)}
            for r in (
                MockTestAttempt.objects
                .filter(completed=True, total__gt=0)
                .values('subject')
                .annotate(avg_pct=Avg(ExpressionWrapper(
                    F('score') * 100.0 / F('total'), output_field=FloatField())))
                .order_by('-avg_pct')[:6]
            )
        ]

        # ── Weak concepts (highest error rate from lesson answers) ─────
        weak_rows = (
            SessionAnswer.objects
            .exclude(question__concept='')
            .values('question__concept', 'node__path__unit__subject')
            .annotate(total=Count('id'), wrong=Count('id', filter=Q(is_correct=False)))
            .filter(total__gte=3, wrong__gt=0)
        )
        weak_concepts = sorted(
            (
                {
                    'name': r['question__concept'],
                    'subject': r['node__path__unit__subject'] or 'General',
                    'error_rate': round(r['wrong'] / r['total'] * 100),
                    'wrong': r['wrong'],
                }
                for r in weak_rows
            ),
            key=lambda c: (c['error_rate'], c['wrong']),
            reverse=True,
        )[:5]

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

        # Recent users (first page; the dashboard pages the rest via AdminUsersListView)
        users = CustomUser.objects.order_by('-date_joined')[:ADMIN_USERS_PAGE_SIZE]
        user_data = [_serialize_admin_user(u) for u in users]

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
            'day_bars': day_bars,
            'subject_scores': subject_scores,
            'weak_concepts': weak_concepts,
            'papers': paper_data,
            'users': user_data,
        })


class AdminUsersListView(APIView):
    """Paginated list of all users for the admin dashboard's "Show More Users"
    button. Page 1 mirrors the recent users embedded in the analytics payload;
    page 2+ extends the table. Ordered newest-first to stay consistent."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)

        from envirr_backend.pagination import StandardResultsPagination

        class _AdminUsersPagination(StandardResultsPagination):
            page_size = ADMIN_USERS_PAGE_SIZE

        qs = CustomUser.objects.order_by('-date_joined')
        paginator = _AdminUsersPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        data = [_serialize_admin_user(u) for u in page]
        return paginator.get_paginated_response(data)
