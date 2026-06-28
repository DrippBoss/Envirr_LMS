from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from gamification.models import Streak, StudentXP
from gamification.services import (
    MAX_LEVEL,
    XP_PER_LEVEL,
    level_for_xp,
    update_streak_and_xp,
)

User = get_user_model()


class LevelForXpTests(TestCase):
    """XP -> level mapping, including the D3 upper-bound cap."""

    def test_zero_and_sub_threshold_xp_is_level_1(self):
        self.assertEqual(level_for_xp(0), 1)
        self.assertEqual(level_for_xp(XP_PER_LEVEL - 1), 1)

    def test_level_increments_every_xp_per_level(self):
        self.assertEqual(level_for_xp(XP_PER_LEVEL), 2)
        self.assertEqual(level_for_xp(XP_PER_LEVEL * 2), 3)

    def test_level_never_below_one(self):
        self.assertEqual(level_for_xp(-100), 1)

    def test_level_capped_at_max_level(self):
        # D3 regression: a very high XP total must not exceed MAX_LEVEL.
        huge = XP_PER_LEVEL * (MAX_LEVEL + 50)
        self.assertEqual(level_for_xp(huge), MAX_LEVEL)


class UpdateStreakAndXpTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="learner", password="pw", role="student",
        )

    def test_first_activity_awards_xp_and_starts_streak(self):
        update_streak_and_xp(self.user, "practice_question")  # +5 XP
        xp = StudentXP.objects.get(student=self.user)
        streak = Streak.objects.get(student=self.user)
        self.assertEqual(xp.total_xp, 5)
        self.assertEqual(xp.current_level, 1)
        self.assertEqual(streak.current_streak, 1)
        self.assertEqual(len(xp.xp_history), 1)

    def test_unknown_activity_awards_no_xp(self):
        update_streak_and_xp(self.user, "nonexistent_activity")
        self.assertFalse(StudentXP.objects.filter(student=self.user).exists())

    def test_consecutive_day_increments_streak(self):
        update_streak_and_xp(self.user, "practice_question")
        streak = Streak.objects.get(student=self.user)
        # Simulate the prior activity having happened yesterday.
        streak.last_activity_date = timezone.localdate() - timedelta(days=1)
        streak.save()

        update_streak_and_xp(self.user, "practice_question")
        streak.refresh_from_db()
        self.assertEqual(streak.current_streak, 2)
        self.assertEqual(streak.longest_streak, 2)
