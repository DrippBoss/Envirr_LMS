from django.db import migrations

# The Grade-10 "Quadratic Equations" course existed twice:
#   * a complete, correct unit (7 lessons + 2 labs + scoped test + prereq deck)
#     that was left UNPUBLISHED, and
#   * a broken placeholder unit (default "New Video Lesson"/"New Test Node" nodes,
#     an empty lesson, a typo'd path) that was PUBLISHED.
# So students were served the junk while the real course was hidden. Swap the
# publish flags, matched on robust content markers rather than fragile row ids:
#   - real course = a unit containing the lesson "Introduction to Quadratic Equations"
#   - placeholder = a unit containing default-named nodes ("New Test Node" / "New Video Lesson")

REAL_MARKER = "Introduction to Quadratic Equations"
PLACEHOLDER_MARKERS = ["New Test Node", "New Video Lesson"]


def fix(apps, schema_editor):
    CourseUnit = apps.get_model("learning", "CourseUnit")
    LearningNode = apps.get_model("learning", "LearningNode")

    real_ids = set(
        LearningNode.objects.filter(title=REAL_MARKER)
        .values_list("path__unit_id", flat=True)
    )
    real_ids.discard(None)
    CourseUnit.objects.filter(id__in=real_ids).update(is_published=True)

    junk_ids = set(
        LearningNode.objects.filter(title__in=PLACEHOLDER_MARKERS)
        .values_list("path__unit_id", flat=True)
    )
    junk_ids.discard(None)
    junk_ids -= real_ids  # never unpublish the real course
    CourseUnit.objects.filter(id__in=junk_ids).update(is_published=False)


def noop(apps, schema_editor):
    # Reverse is a no-op: we don't want to restore the broken published state.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0019_deactivate_orphan_polynomials_path"),
    ]

    operations = [
        migrations.RunPython(fix, noop),
    ]
