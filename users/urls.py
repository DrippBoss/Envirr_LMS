from django.urls import path
from .views import (
    RegisterView, UserDetailView, ChangePasswordView,
    SendVerificationEmailView, VerifyEmailView,
    CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView,
    AdminAnalyticsView, ToggleCourseBuilderView, ToggleQuestionEditorView,
    ToggleUserStatusView, DeleteUserView, AssignSubjectsView,
)

urlpatterns = [
    path('login/',           CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/',   CookieTokenRefreshView.as_view(),    name='token_refresh'),
    path('register/',        RegisterView.as_view(),               name='auth_register'),
    path('me/',              UserDetailView.as_view(),             name='auth_me'),
    path('logout/',          LogoutView.as_view(),                 name='auth_logout'),
    path('change-password/',    ChangePasswordView.as_view(),         name='change_password'),
    path('send-verification/',  SendVerificationEmailView.as_view(),  name='send_verification'),
    path('verify-email/',       VerifyEmailView.as_view(),            name='verify_email'),
    path('admin/analytics/', AdminAnalyticsView.as_view(),        name='admin_analytics'),
    path('admin/users/<int:user_id>/toggle-course-builder/', ToggleCourseBuilderView.as_view(), name='toggle_course_builder'),
    path('admin/users/<int:user_id>/toggle-question-editor/', ToggleQuestionEditorView.as_view(), name='toggle_question_editor'),
    path('admin/users/<int:user_id>/toggle-status/', ToggleUserStatusView.as_view(), name='toggle_user_status'),
    path('admin/users/<int:user_id>/delete/', DeleteUserView.as_view(), name='delete_user'),
    path('admin/users/<int:user_id>/assign-subjects/', AssignSubjectsView.as_view(), name='assign_subjects'),
]
