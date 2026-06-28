from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings

from rest_framework.test import APIClient

from gamification.models import StudentXP
from learning.models import (
    CompletionStatus,
    CourseUnit,
    LearningNode,
    LearningPath,
    LessonQuestion,
    NodeProgress,
    NodeStep,
    NodeType,
)
from learning.services import calculate_stars

User = get_user_model()

# Auth/throttle-touching tests run against an in-memory cache (no Redis needed,
# matching CI).
LOCMEM_CACHE = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
}


class CalculateStarsTests(TestCase):
    """Star thresholds: 0 wrong -> 3, 1-2 wrong -> 2, 3+ wrong -> 1."""

    def test_no_wrong_answers_is_three_stars(self):
        self.assertEqual(calculate_stars(0, 10), 3)

    def test_up_to_two_wrong_is_two_stars(self):
        self.assertEqual(calculate_stars(1, 10), 2)
        self.assertEqual(calculate_stars(2, 10), 2)

    def test_more_than_two_wrong_is_one_star(self):
        self.assertEqual(calculate_stars(3, 10), 1)
        self.assertEqual(calculate_stars(9, 10), 1)


@override_settings(CACHES=LOCMEM_CACHE)
class LearningFlowTests(TestCase):
    """End-to-end API coverage of the core node flow: start -> answer -> complete."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="flowstudent", password="pw", role="student",
        )
        self.profile = self.user.profile
        self.profile.class_grade = "9"
        self.profile.save()
        self.client.force_authenticate(user=self.user)

        self.unit = CourseUnit.objects.create(
            title="Numbers", subject="Mathematics", class_grade="9",
            board="CBSE", order=1, is_published=True,
        )
        self.path = LearningPath.objects.create(
            unit=self.unit, title="Real Numbers", class_grade="9", is_active=True,
        )
        self.node1 = LearningNode.objects.create(
            path=self.path, title="Intro", node_type=NodeType.LESSON, order=1,
            xp_reward=10, practice_question_count=1, starting_lives=3,
        )
        self.node2 = LearningNode.objects.create(
            path=self.path, title="Next", node_type=NodeType.LESSON, order=2,
            xp_reward=10, unlock_min_stars=0,
        )
        self.q1 = LessonQuestion.objects.create(
            node=self.node1, question_type="MCQ", question_text="Pick C",
            options_json={"A": "wrong", "B": "wrong", "C": "right", "D": "wrong"},
            correct_answer="C",
        )
        # NodeProgress defaults to LOCKED; unlock node1 so it can be started.
        self.prog1 = NodeProgress.objects.create(
            student=self.profile, node=self.node1, status=CompletionStatus.UNLOCKED,
        )

    def _start(self, node):
        return self.client.post(f"/api/student/nodes/{node.id}/start/", {}, format="json")

    def _answer(self, node, question, given):
        return self.client.post(
            f"/api/student/nodes/{node.id}/practice/answer/",
            {"question_id": question.id, "given_answer": given}, format="json",
        )

    def test_start_lesson_without_video_advances_to_practice(self):
        resp = self._start(self.node1)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["step"], NodeStep.PRACTICE)

    def test_correct_mcq_answer_by_option_key(self):
        self._start(self.node1)
        resp = self._answer(self.node1, self.q1, "C")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["is_correct"])

    def test_wrong_mcq_answer_reduces_lives(self):
        self._start(self.node1)
        resp = self._answer(self.node1, self.q1, "A")
        self.assertFalse(resp.data["is_correct"])
        self.assertEqual(resp.data["lives_remaining"], 2)

    def test_stored_text_answer_resolved_via_option_key(self):
        # correct_answer stored as the option TEXT rather than the key.
        q2 = LessonQuestion.objects.create(
            node=self.node1, question_type="MCQ", question_text="text-stored",
            options_json={"A": "alpha", "B": "beta", "C": "gamma", "D": "delta"},
            correct_answer="gamma",
        )
        self._start(self.node1)
        resp = self._answer(self.node1, q2, "C")
        self.assertTrue(resp.data["is_correct"])

    def test_cross_grade_start_is_denied(self):
        other_unit = CourseUnit.objects.create(
            title="G10", subject="Mathematics", class_grade="10",
            board="CBSE", order=2, is_published=True,
        )
        other_path = LearningPath.objects.create(
            unit=other_unit, title="G10 Path", class_grade="10", is_active=True,
        )
        other_node = LearningNode.objects.create(
            path=other_path, title="G10 Node", node_type=NodeType.LESSON, order=1,
        )
        NodeProgress.objects.create(
            student=self.profile, node=other_node, status=CompletionStatus.UNLOCKED,
        )
        resp = self._start(other_node)
        self.assertEqual(resp.status_code, 403)

    def test_complete_lesson_awards_xp_and_unlocks_next(self):
        self._start(self.node1)
        resp = self.client.post(
            f"/api/student/nodes/{self.node1.id}/practice/complete/", {}, format="json",
        )
        self.assertEqual(resp.status_code, 200)

        self.prog1.refresh_from_db()
        self.assertEqual(self.prog1.status, CompletionStatus.COMPLETED)
        self.assertTrue(
            NodeProgress.objects.filter(
                student=self.profile, node=self.node2,
                status=CompletionStatus.UNLOCKED,
            ).exists()
        )
        xp = StudentXP.objects.get(student=self.user)
        self.assertGreaterEqual(xp.total_xp, self.node1.xp_reward)

    def test_my_progress_analytics_returns_full_report(self):
        # Regression for the "My Progress" page 500 (missing MockTestAttempt
        # import): the analytics view must execute end to end — including the
        # mock-test stats section — and return the full report.
        resp = self.client.get("/api/student/analytics/")
        self.assertEqual(resp.status_code, 200)
        for key in ("xp", "streak", "completion", "subjects", "mock_tests"):
            self.assertIn(key, resp.data)


class ChatModerationTests(TestCase):
    """Server-side study-group chat moderation (check_message)."""

    def test_clean_message_allowed(self):
        from learning.moderation import check_message
        self.assertFalse(check_message("What is the distance formula?").blocked)

    def test_blank_message_allowed(self):
        from learning.moderation import check_message
        self.assertFalse(check_message("   ").blocked)

    def test_contact_info_is_blocked(self):
        from learning.moderation import check_message
        # at least one common contact form should be caught
        results = [
            check_message("call me at 9876543210").blocked,
            check_message("email me at foo@bar.com").blocked,
        ]
        self.assertTrue(any(results))
