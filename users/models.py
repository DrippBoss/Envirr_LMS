from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    can_build_courses = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} - ({self.role})"

class StudentProfile(models.Model):
    CLASS_CHOICES = [(str(i), f'Class {i}') for i in range(9, 13)]
    BOARD_CHOICES = [('CBSE', 'CBSE'), ('ICSE', 'ICSE'), ('State', 'State Board'), ('Other', 'Other')]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    class_grade = models.CharField(max_length=5, choices=CLASS_CHOICES, blank=True)
    board = models.CharField(max_length=50, choices=BOARD_CHOICES, blank=True)
    avatar_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} — Class {self.class_grade}"

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_student_profile(sender, instance, created, **kwargs):
    if created and instance.role == 'student':
        StudentProfile.objects.get_or_create(user=instance)

