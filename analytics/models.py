from django.db import models
from django.conf import settings

class StudentPerformance(models.Model):
    student = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='performance')
    overall_accuracy = models.FloatField(default=0.0)
    last_assessed = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - Accuracy: {self.overall_accuracy}%"

class WeakConceptTracking(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='weak_concepts')
    concept_name = models.CharField(max_length=255)
    failure_count = models.PositiveIntegerField(default=1)
    needs_intervention = models.BooleanField(default=False)
    last_failed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'concept_name')

    def __str__(self):
        return f"{self.student} struggle with {self.concept_name} ({self.failure_count} failures)"
