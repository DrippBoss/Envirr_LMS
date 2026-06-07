import secrets
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    name = models.CharField(max_length=150, blank=True)
    mobile = models.CharField(max_length=15, blank=True)
    can_build_courses = models.BooleanField(default=False)
    can_edit_questions = models.BooleanField(default=False)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    email = models.EmailField(unique=True, blank=False)
    email_verified = models.BooleanField(default=False)
    pending_email = models.EmailField(blank=True)
    assigned_subjects = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.username} - ({self.role})"


class BannedIP(models.Model):
    ip_address = models.GenericIPAddressField(unique=True)
    reason     = models.TextField(blank=True)
    banned_at  = models.DateTimeField(auto_now_add=True)
    banned_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='bans_issued'
    )

    class Meta:
        verbose_name = 'Banned IP'
        verbose_name_plural = 'Banned IPs'

    def __str__(self):
        return f"{self.ip_address} — banned {self.banned_at:%Y-%m-%d}"

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

class EmailVerificationToken(models.Model):
    user       = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verification_token')
    token      = models.CharField(max_length=96, unique=True)
    expires_at = models.DateTimeField()
    new_email  = models.EmailField(blank=True)  # set when verifying an email change
    send_count = models.PositiveIntegerField(default=1)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(64)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"VerificationToken({self.user.username})"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_student_profile(sender, instance, created, **kwargs):
    if created and instance.role == 'student':
        StudentProfile.objects.get_or_create(user=instance)

