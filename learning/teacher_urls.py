from django.urls import path
from .wizard_views import (
    WizardTemplateListView,
    WizardCourseCreateView,
    WizardReorderView,
    WizardBulkUploadView,
    WizardPendingCoursesView,
    WizardApproveView,
    WizardTeacherListView,
    WizardAssignTeacherView,
    WizardAssignedCoursesView,
    WizardCourseStructureView,
)
from .teacher_dashboard_views import TeacherDashboardView
from .assignment_views import (
    TeacherAssignmentListCreateView, TeacherAssignmentDetailView,
    AssignmentSubmissionListView, GradeSubmissionView,
    TeacherCalendarListCreateView, TeacherCalendarDetailView,
)
from .section_views import (
    TeacherSectionListCreateView, TeacherSectionDetailView,
    SectionMembersView, SectionMemberRemoveView, StudentSearchView,
)

urlpatterns = [
    path('dashboard/', TeacherDashboardView.as_view(), name='teacher-dashboard'),
    # Assignments
    path('assignments/', TeacherAssignmentListCreateView.as_view(), name='teacher-assignments'),
    path('assignments/<int:pk>/', TeacherAssignmentDetailView.as_view(), name='teacher-assignment-detail'),
    path('assignments/<int:pk>/submissions/', AssignmentSubmissionListView.as_view(), name='teacher-assignment-submissions'),
    path('submissions/<int:pk>/grade/', GradeSubmissionView.as_view(), name='teacher-grade-submission'),
    # Calendar
    path('calendar/', TeacherCalendarListCreateView.as_view(), name='teacher-calendar'),
    path('calendar/<int:pk>/', TeacherCalendarDetailView.as_view(), name='teacher-calendar-detail'),
    # Sections / roster
    path('sections/', TeacherSectionListCreateView.as_view(), name='teacher-sections'),
    path('sections/<int:pk>/', TeacherSectionDetailView.as_view(), name='teacher-section-detail'),
    path('sections/<int:pk>/members/', SectionMembersView.as_view(), name='teacher-section-members'),
    path('sections/<int:pk>/members/<int:student_id>/', SectionMemberRemoveView.as_view(), name='teacher-section-member-remove'),
    path('students/', StudentSearchView.as_view(), name='teacher-student-search'),
    path('templates/', WizardTemplateListView.as_view(), name='wizard-templates'),
    path('course/create/', WizardCourseCreateView.as_view(), name='wizard-course-create'),
    path('course/reorder/', WizardReorderView.as_view(), name='wizard-course-reorder'),
    path('course/upload/', WizardBulkUploadView.as_view(), name='wizard-course-upload'),
    # static collection endpoints first (before parameterised <int:pk> patterns)
    path('courses/pending/', WizardPendingCoursesView.as_view(), name='wizard-courses-pending'),
    path('courses/assigned/', WizardAssignedCoursesView.as_view(), name='wizard-courses-assigned'),
    path('teachers/', WizardTeacherListView.as_view(), name='wizard-teacher-list'),
    # parameterised per-course endpoints
    path('courses/<int:pk>/review/', WizardApproveView.as_view(), name='wizard-course-review'),
    path('courses/<int:pk>/assign/', WizardAssignTeacherView.as_view(), name='wizard-course-assign'),
    path('courses/<int:pk>/structure/', WizardCourseStructureView.as_view(), name='wizard-course-structure'),
]
