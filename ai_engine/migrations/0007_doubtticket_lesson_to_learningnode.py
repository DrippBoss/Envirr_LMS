# Generated manually 2026-06-13 — S4 fix
# DoubtTicket.lesson retargeted from legacy courses.Lesson to
# learning.LearningNode (nullable, SET_NULL).
#
# Existing rows whose lesson_id references courses_lesson rows would point to
# stale / non-existent IDs in learning_learningnode, so we NULL them out before
# altering the FK constraint.

from django.db import migrations, models
import django.db.models.deletion


def null_stale_lesson_refs(apps, schema_editor):
    """
    Existing DoubtTicket rows have lesson_id values that reference
    courses_lesson.id.  After the FK is re-pointed to learning_learningnode
    those IDs are meaningless, so reset them to NULL now.
    """
    DoubtTicket = apps.get_model('ai_engine', 'DoubtTicket')
    DoubtTicket.objects.update(lesson=None)


class Migration(migrations.Migration):

    dependencies = [
        ('ai_engine', '0006_questionpaper_status_error_message'),
        ('learning', '0016_alter_studygroup_max_members'),
    ]

    operations = [
        # 1. Null out stale references before altering the FK target.
        migrations.RunPython(null_stale_lesson_refs, migrations.RunPython.noop),
        # 2. Re-point the FK to the active LearningNode model.
        migrations.AlterField(
            model_name='doubtticket',
            name='lesson',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='doubts',
                to='learning.learningnode',
            ),
        ),
    ]
