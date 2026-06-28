from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings

from rest_framework.test import APIClient

from ai_engine.models import DoubtTicket
from learning.models import CourseUnit, LearningNode, LearningPath, NodeType

User = get_user_model()
LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


@override_settings(CACHES=LOCMEM)
class DoubtApiTests(TestCase):
    """Student raises a doubt -> teacher (scoped to subject) answers it."""

    def setUp(self):
        cache.clear()
        self.student = User.objects.create_user(username="dstud", email="dstud@t.com", password="pw", role="student")
        self.teacher = User.objects.create_user(username="dteach", email="dteach@t.com", password="pw", role="teacher")
        self.teacher.assigned_subjects = ["Mathematics"]
        self.teacher.save()

        self.unit = CourseUnit.objects.create(
            title="Numbers", subject="Mathematics", class_grade="10",
            board="CBSE", order=1, is_published=True,
        )
        self.path = LearningPath.objects.create(
            unit=self.unit, title="Real Numbers", class_grade="10", is_active=True,
        )
        self.node = LearningNode.objects.create(
            path=self.path, title="Intro", node_type=NodeType.LESSON, order=1,
        )
        self.sc = APIClient(); self.sc.force_authenticate(self.student)
        self.tc = APIClient(); self.tc.force_authenticate(self.teacher)

    def test_student_creates_and_lists_doubt(self):
        r = self.sc.post(
            "/api/ai/doubts/",
            {"question_text": "Why is √2 irrational?", "lesson": self.node.id},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["status"], "open")
        self.assertEqual(r.data["subject"], "Mathematics")  # resolved via lesson
        listing = self.sc.get("/api/ai/doubts/")
        self.assertEqual(len(listing.data), 1)

    def test_teacher_cannot_create_doubt(self):
        r = self.tc.post("/api/ai/doubts/", {"question_text": "x"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_blank_question_rejected(self):
        r = self.sc.post("/api/ai/doubts/", {"question_text": "   "}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_teacher_sees_doubt_in_assigned_subject(self):
        DoubtTicket.objects.create(student=self.student, question_text="q", lesson=self.node)
        r = self.tc.get("/api/ai/doubts/teacher/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)

    def test_teacher_scope_excludes_other_subject(self):
        other = User.objects.create_user(username="sciteach", email="sciteach@t.com", password="pw", role="teacher")
        other.assigned_subjects = ["Science"]
        other.save()
        DoubtTicket.objects.create(student=self.student, question_text="math q", lesson=self.node)
        c = APIClient(); c.force_authenticate(other)
        r = c.get("/api/ai/doubts/teacher/")
        self.assertEqual(len(r.data), 0)  # the Mathematics doubt is out of scope

    def test_respond_sets_status_and_records_response(self):
        d = DoubtTicket.objects.create(student=self.student, question_text="q", lesson=self.node)
        r = self.tc.post(
            f"/api/ai/doubts/{d.id}/respond/",
            {"response_text": "Because of Theorem 1.2."}, format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "answered")
        self.assertEqual(len(r.data["responses"]), 1)

        self.tc.post(
            f"/api/ai/doubts/{d.id}/respond/",
            {"response_text": "Resolved.", "resolve": True}, format="json",
        )
        d.refresh_from_db()
        self.assertEqual(d.status, "resolved")
