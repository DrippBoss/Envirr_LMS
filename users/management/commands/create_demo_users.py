"""
Create (or reset) demo login accounts — one per role — for local/staging testing.

Idempotent: re-running updates the existing accounts (role, active, verified,
password) rather than erroring. Accounts are active + email-verified so they can
log in immediately without the SMTP verification step.

Used by the one-click runner (scripts/run.*) and safe to run by hand:
    python manage.py create_demo_users
    python manage.py create_demo_users --password "MyPass123!"
"""
from django.core.management.base import BaseCommand

DEFAULT_PASSWORD = "Envirr@Demo123"

# (username, role, extra field defaults)
DEMO_USERS = [
    ("demo_student", "student", {"class_grade": "10", "board": "CBSE"}),
    ("demo_teacher", "teacher", {"assigned_subjects": ["Mathematics"], "can_build_courses": True}),
    ("demo_admin",   "admin",   {"is_staff": True, "is_superuser": True}),
]


class Command(BaseCommand):
    help = "Create/reset demo accounts (demo_student / demo_teacher / demo_admin)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password", default=DEFAULT_PASSWORD,
            help=f"Password for all demo accounts (default: {DEFAULT_PASSWORD}).",
        )

    def handle(self, *args, **opts):
        from users.models import CustomUser

        password = opts["password"]
        for username, role, extra in DEMO_USERS:
            user, created = CustomUser.objects.get_or_create(
                username=username,
                defaults={"email": f"{username}@demo.local", "role": role},
            )
            user.role = role
            user.is_active = True
            if hasattr(user, "email_verified"):
                user.email_verified = True
            for field, value in extra.items():
                if hasattr(user, field):
                    setattr(user, field, value)
            user.set_password(password)
            user.save()
            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  {verb}: {username} ({role})"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Demo accounts ready — password: {password}"))
        self.stdout.write("  student → demo_student   teacher → demo_teacher   admin → demo_admin")
