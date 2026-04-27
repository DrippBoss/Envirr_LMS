from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from django.db.models import Count
from users.models import CustomUser
from users.serializers import RegisterSerializer, UserSerializer


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

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=400)

        user = CustomUser.objects.filter(username=username).first()
        if not user or not user.check_password(password):
            return Response({'detail': 'No active account found with the given credentials.'}, status=401)

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

class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


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
