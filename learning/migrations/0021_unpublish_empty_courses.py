from django.db import migrations

# Some units were published with no content at all (no active path nodes), e.g.
# the Grade-9 "Circles" unit. A published-but-empty unit shows students a course
# that opens to a blank map. Unpublish any published unit that has zero nodes on
# its active paths. Reversible (the unit can be re-published once it has content).


def unpublish_empty(apps, schema_editor):
    CourseUnit = apps.get_model("learning", "CourseUnit")
    LearningPath = apps.get_model("learning", "LearningPath")
    LearningNode = apps.get_model("learning", "LearningNode")
    for unit in CourseUnit.objects.filter(is_published=True):
        active_path_ids = list(
            LearningPath.objects.filter(unit=unit, is_active=True).values_list("id", flat=True)
        )
        node_count = LearningNode.objects.filter(path_id__in=active_path_ids).count()
        if node_count == 0:
            unit.is_published = False
            unit.save(update_fields=["is_published"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0020_fix_quadratic_equations_publish_state"),
    ]

    operations = [
        migrations.RunPython(unpublish_empty, noop),
    ]
