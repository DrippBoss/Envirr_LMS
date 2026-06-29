"""
Run every `seed_*` command to populate demo course content in one shot.

Idempotent at the orchestrator level: the individual seeders create nodes/cards
with plain `.create()` (re-running one duplicates its content), so this command
SKIPS entirely when course content already exists. Pass --force to seed anyway.

After seeding it mirrors data-migration 0021 (unpublish any published unit that
has no nodes on its active paths) so a freshly-seeded DB matches a migrated one.

Used by the one-click runner (scripts/run.*) and safe to run by hand:
    python manage.py seed_all
"""
from django.core.management import call_command, get_commands
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run all seed_* commands to populate demo course content (skips if content already exists)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Seed even if content already exists (WARNING: may create duplicate nodes).",
        )

    def handle(self, *args, **opts):
        from learning.models import CourseUnit

        if CourseUnit.objects.exists() and not opts["force"]:
            self.stdout.write(self.style.WARNING(
                "Course content already present — skipping seed. Use --force to re-run."
            ))
            return

        seeders = sorted(
            name for name in get_commands()
            if name.startswith("seed_") and name != "seed_all"
        )
        if not seeders:
            self.stdout.write(self.style.WARNING("No seed_* commands found."))
            return

        self.stdout.write(f"Running {len(seeders)} seeders...")
        ok = failed = 0
        for name in seeders:
            try:
                call_command(name)
                self.stdout.write(self.style.SUCCESS(f"  ✓ {name}"))
                ok += 1
            except Exception as e:  # one bad seeder shouldn't abort the rest
                self.stdout.write(self.style.ERROR(f"  ✗ {name}: {e}"))
                failed += 1

        unpublished = self._unpublish_empty_units()

        self.stdout.write(self.style.SUCCESS(
            f"Seeding complete: {ok} ok, {failed} failed, {unpublished} empty unit(s) unpublished."
        ))

    def _unpublish_empty_units(self) -> int:
        """Mirror of migration 0021 — published units with no active-path nodes."""
        from learning.models import CourseUnit, LearningPath, LearningNode

        count = 0
        for unit in CourseUnit.objects.filter(is_published=True):
            active_path_ids = list(
                LearningPath.objects.filter(unit=unit, is_active=True).values_list("id", flat=True)
            )
            if LearningNode.objects.filter(path_id__in=active_path_ids).count() == 0:
                unit.is_published = False
                unit.save(update_fields=["is_published"])
                count += 1
        return count
