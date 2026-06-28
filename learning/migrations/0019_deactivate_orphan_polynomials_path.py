from django.db import migrations

# The "Polynomials" Grade-10 unit shipped with a second, incomplete path
# ("Foundations of Polynomials") holding a single lesson and no test/labs. It was
# unreachable from the dashboard (only paths[0] is linked) and not integrated.
# Deactivate it so it's hidden everywhere (CourseUnitSerializer / LearningPathView
# only surface active paths). Reversible if the path is ever built out.

ORPHAN_TITLE = "Foundations of Polynomials"


def deactivate(apps, schema_editor):
    LearningPath = apps.get_model("learning", "LearningPath")
    LearningPath.objects.filter(title=ORPHAN_TITLE).update(is_active=False)


def reactivate(apps, schema_editor):
    LearningPath = apps.get_model("learning", "LearningPath")
    LearningPath.objects.filter(title=ORPHAN_TITLE).update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0018_flashcard_image_flashcard_image_description"),
    ]

    operations = [
        migrations.RunPython(deactivate, reactivate),
    ]
