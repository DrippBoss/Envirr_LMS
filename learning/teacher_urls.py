from django.urls import path
from .wizard_views import (
    WizardTemplateListView, 
    WizardCourseCreateView, 
    WizardReorderView, 
    WizardBulkUploadView
)

urlpatterns = [
    path('templates/', WizardTemplateListView.as_view(), name='wizard-templates'),
    path('course/create/', WizardCourseCreateView.as_view(), name='wizard-course-create'),
    path('course/reorder/', WizardReorderView.as_view(), name='wizard-course-reorder'),
    path('course/upload/', WizardBulkUploadView.as_view(), name='wizard-course-upload'),
]
