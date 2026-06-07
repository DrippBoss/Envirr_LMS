from django.db import models
from django.conf import settings

class Streak(models.Model):
    student = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streak')
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    is_broken = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - Streak: {self.current_streak}"

class StudentXP(models.Model):
    student = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='xp')
    total_xp = models.PositiveIntegerField(default=0)
    current_level = models.PositiveIntegerField(default=1)
    xp_history = models.JSONField(default=list, help_text="Log of {source, amount, date}")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.total_xp} XP (Level {self.current_level})"


class Badge(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon        = models.CharField(max_length=50, help_text='Material Symbols icon name')
    criteria    = models.CharField(max_length=50, help_text='e.g. complete_course')

    def __str__(self):
        return self.name


class StudentBadge(models.Model):
    student   = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='badges')
    badge     = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='holders')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'badge')

    def __str__(self):
        return f"{self.student} — {self.badge.name}"
