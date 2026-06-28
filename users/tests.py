from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings

from rest_framework.test import APIClient

from users.models import StudentProfile

User = get_user_model()

# Run auth/throttle-touching tests against an in-memory cache so they don't
# require a live Redis (matching CI, which has no Redis service).
LOCMEM_CACHE = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
}


class StudentProfileSignalTests(TestCase):
    def test_student_user_gets_a_profile(self):
        user = User.objects.create_user(username="stud", password="pw", role="student")
        self.assertTrue(StudentProfile.objects.filter(user=user).exists())

    def test_teacher_user_has_no_student_profile(self):
        user = User.objects.create_user(username="teach", password="pw", role="teacher")
        self.assertFalse(StudentProfile.objects.filter(user=user).exists())


@override_settings(CACHES=LOCMEM_CACHE)
class LoginApiTests(TestCase):
    def setUp(self):
        cache.clear()  # isolate per-test throttle state
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="alice", password="Secret123!", role="student",
        )

    def test_successful_login_sets_httponly_auth_cookies(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "Secret123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access_token", resp.cookies)
        self.assertIn("refresh_token", resp.cookies)
        self.assertTrue(resp.cookies["access_token"]["httponly"])

    def test_wrong_password_returns_401_and_counts_failure(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "WRONG"},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 1)

    def test_account_locks_after_ten_failed_attempts(self):
        for _ in range(10):
            self.client.post(
                "/api/auth/login/",
                {"username": "alice", "password": "WRONG"},
                format="json",
            )
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertGreaterEqual(self.user.failed_login_attempts, 10)

    def test_me_requires_authentication(self):
        resp = self.client.get("/api/auth/me/")
        self.assertIn(resp.status_code, (401, 403))
