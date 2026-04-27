from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, UserDetailView,
    CookieTokenObtainPairView, LogoutView,
    AdminAnalyticsView, ToggleCourseBuilderView,
)

urlpatterns = [
    path('login/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('me/', UserDetailView.as_view(), name='auth_me'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('admin/analytics/', AdminAnalyticsView.as_view(), name='admin_analytics'),
    path('admin/users/<int:user_id>/toggle-course-builder/', ToggleCourseBuilderView.as_view(), name='toggle_course_builder'),
]
