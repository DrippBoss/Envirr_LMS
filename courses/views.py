from rest_framework import viewsets, permissions
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
