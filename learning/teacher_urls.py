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

urlpatterns = [
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
