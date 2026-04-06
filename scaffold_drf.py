import os

files_to_write = {
    # USERS
    "users/serializers.py": '''from rest_framework import serializers
from users.models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'role')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'role')
        
    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'student')
        )
        return user
''',
    "users/views.py": '''from rest_framework import generics, permissions
from rest_framework.response import Response
from users.models import CustomUser
from users.serializers import RegisterSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user
''',
    "users/urls.py": '''from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, UserDetailView

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('me/', UserDetailView.as_view(), name='auth_me'),
]
''',

    # COURSES
    "courses/serializers.py": '''from rest_framework import serializers
from courses.models import Subject, Course, Unit, Lesson, Quiz, QuizQuestion

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = '__all__'

class UnitSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    class Meta:
        model = Unit
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    units = UnitSerializer(many=True, read_only=True)
    class Meta:
        model = Course
        fields = '__all__'
''',
    "courses/views.py": '''from rest_framework import viewsets, permissions
from courses.models import Course, Unit, Lesson
from courses.serializers import CourseSerializer, UnitSerializer, LessonSerializer
from activity.models import StudentEnrollment
from courses.services import can_unlock_unit

class IsTeacherOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['teacher', 'admin']

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrReadOnly]

    def get_queryset(self):
        if self.request.user.role == 'student':
            enrolled_courses = StudentEnrollment.objects.filter(student=self.request.user).values_list('course_id', flat=True)
            return Course.objects.filter(id__in=enrolled_courses, status='published')
        elif self.request.user.role == 'teacher':
            return Course.objects.filter(created_by=self.request.user)
        return Course.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
''',
    "courses/urls.py": '''from django.urls import path, include
from rest_framework.routers import DefaultRouter
from courses.views import CourseViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')

urlpatterns = [
    path('', include(router.urls)),
]
''',

    # ACTIVITY
    "activity/serializers.py": '''from rest_framework import serializers
from activity.models import QuizSubmission

class QuizSubmitSerializer(serializers.Serializer):
    quiz_id = serializers.IntegerField()
    answers = serializers.JSONField(help_text="Format: {'question_id': 'option/answer'}")

class QuizSubmissionResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizSubmission
        fields = '__all__'
''',
    "activity/views.py": '''from rest_framework import views, response, status, permissions
from activity.serializers import QuizSubmitSerializer, QuizSubmissionResponseSerializer
from activity.services import evaluate_quiz
from courses.models import Quiz
from django.shortcuts import get_object_or_404

class SubmitQuizView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiz = get_object_or_404(Quiz, id=serializer.validated_data['quiz_id'])
        
        # NOTE: Enrollment enforcement logic can be bound here optionally.
        
        submission = evaluate_quiz(request.user, quiz, serializer.validated_data['answers'])
        res_serial = QuizSubmissionResponseSerializer(submission)
        return response.Response(res_serial.data, status=status.HTTP_201_CREATED)
''',
    "activity/urls.py": '''from django.urls import path
from activity.views import SubmitQuizView

urlpatterns = [
    path('quiz/submit/', SubmitQuizView.as_view(), name='submit_quiz'),
]
''',

    # GAMIFICATION
    "gamification/views.py": '''from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from gamification.models import Streak, StudentXP

class UserGamificationStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        streak, _ = Streak.objects.get_or_create(student=request.user)
        xp, _ = StudentXP.objects.get_or_create(student=request.user)
        return Response({
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
            'total_xp': xp.total_xp,
            'current_level': xp.current_level,
        })
''',
    "gamification/urls.py": '''from django.urls import path
from gamification.views import UserGamificationStatsView

urlpatterns = [
    path('stats/', UserGamificationStatsView.as_view(), name='gamification_stats'),
]
''',

    # AI ENGINE
    "ai_engine/serializers.py": '''from rest_framework import serializers

class GeneratePaperSerializer(serializers.Serializer):
    subject = serializers.CharField()
    chapter = serializers.CharField()
    max_marks = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])
    paper_type = serializers.CharField()
    custom_instructions = serializers.CharField(required=False, allow_blank=True)
''',
    "ai_engine/views.py": '''from rest_framework import views, response, status, permissions
from ai_engine.serializers import GeneratePaperSerializer

class GeneratePaperAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = GeneratePaperSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Async invocation will happen here in Phase 5 via Celery.
        # celery_task = generate_paper_task.delay(serializer.data, request.user.id)
        
        return response.Response({
            "message": "Paper generation triggered successfully.",
            "task_id": "phase-5-placeholder-id"
        }, status=status.HTTP_202_ACCEPTED)
''',
    "ai_engine/urls.py": '''from django.urls import path
from ai_engine.views import GeneratePaperAPIView

urlpatterns = [
    path('generate-paper/', GeneratePaperAPIView.as_view(), name='generate_paper'),
]
''',

    # BACKEND MAIN URLS
    "envirr_backend/urls.py": '''from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/activity/', include('activity.urls')),
    path('api/gamification/', include('gamification.urls')),
    path('api/ai/', include('ai_engine.urls')),
]
'''
}

for filepath, content in files_to_write.items():
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Scaffolded {filepath}")
