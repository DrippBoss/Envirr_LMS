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


@override_settings(CACHES=LOCMEM)
class QuestionBankCreateTests(TestCase):
    """Inline question authoring writes to the shared QuestionBank (unverified)."""

    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.teacher = User.objects.create_user(username="qbteach", email="qb@t.com", password="pw", role="teacher")
        self.student = User.objects.create_user(username="qbstud", email="qbs@t.com", password="pw", role="student")

    def _payload(self, text="What is 2+2?"):
        return {"subject": "Mathematics", "chapter": "Arithmetic", "question_type": "SHORT",
                "marks": 2, "difficulty": "easy", "question_text": text, "answer_text": "4"}

    def test_teacher_creates_shared_unverified_question(self):
        c = APIClient(); c.force_authenticate(self.teacher)
        r = c.post("/api/ai/questions/create/", self._payload(), format="json")
        self.assertEqual(r.status_code, 201)
        from ai_engine.models import QuestionBank
        q = QuestionBank.objects.get(id=r.data["id"])
        self.assertFalse(q.is_ai_generated)
        self.assertFalse(q.is_verified)
        self.assertEqual(q.subject, "Mathematics")

    def test_duplicate_reuses_existing(self):
        c = APIClient(); c.force_authenticate(self.teacher)
        first = c.post("/api/ai/questions/create/", self._payload(), format="json")
        again = c.post("/api/ai/questions/create/", self._payload(), format="json")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.data["id"], first.data["id"])

    def test_invalid_type_rejected(self):
        c = APIClient(); c.force_authenticate(self.teacher)
        bad = {**self._payload(), "question_type": "FILL_BLANK"}
        self.assertEqual(c.post("/api/ai/questions/create/", bad, format="json").status_code, 400)

    def test_student_forbidden(self):
        c = APIClient(); c.force_authenticate(self.student)
        self.assertEqual(c.post("/api/ai/questions/create/", self._payload(), format="json").status_code, 403)


class BulkIngestUtilTests(TestCase):
    """Pure helpers in ai_engine.bulk_ingest (no Groq/network)."""

    def test_safe_json_parses_clean(self):
        from ai_engine.bulk_ingest import safe_json
        out = safe_json('{"questions":[{"text":"Q1","type":"MCQ"}]}')
        self.assertEqual(len(out["questions"]), 1)

    def test_safe_json_recovers_truncated(self):
        from ai_engine.bulk_ingest import safe_json
        # Truncated mid-second-object: should still recover the first complete one.
        out = safe_json('{"questions":[{"text":"Q1","number":1},{"text":"Q2"')
        self.assertIsNotNone(out)
        self.assertGreaterEqual(len(out["questions"]), 1)

    def test_compute_hash_stable_and_case_insensitive(self):
        from ai_engine.bulk_ingest import compute_hash
        a = compute_hash("Math", "Algebra", "What is 2+2?")
        b = compute_hash("Math", "Algebra", "what is 2+2?  ")
        self.assertEqual(a, b)

    def test_clean_latex(self):
        from ai_engine.bulk_ingest import clean_latex_text
        self.assertNotIn("\frac", clean_latex_text(r"\frac{1}{2}"))


class IngestFolderCommandTests(TestCase):
    """Folder discovery + path→metadata mapping (dry-run, no Groq)."""

    def test_dry_run_maps_metadata_from_path(self):
        import os, tempfile
        from io import StringIO
        from django.core.management import call_command
        with tempfile.TemporaryDirectory() as root:
            nested = os.path.join(root, "Mathematics", "Algebra", "Quadratic Equations")
            os.makedirs(nested)
            open(os.path.join(nested, "p1.pdf"), "w").close()
            os.makedirs(os.path.join(root, "Science"))
            open(os.path.join(root, "Science", "p2.docx"), "w").close()
            out = StringIO()
            call_command("ingest_folder", folder=root, dry_run=True, stdout=out)
            text = out.getvalue()
        self.assertIn("subject=Mathematics", text)
        self.assertIn("chapter=Algebra — Quadratic Equations", text)
        self.assertIn("subject=Science", text)
        self.assertIn("Discovered 2 file(s)", text)
