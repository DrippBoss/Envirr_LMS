from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ai_engine', '0003_alter_casestudypart_question_type_and_more'),
        ('learning', '0004_alter_lessonquestion_question_type'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='courseunit',
            name='assigned_teacher',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'role': 'teacher'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_courses',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='lessonquestion',
            name='source_question',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='lesson_copies',
                to='ai_engine.questionbank',
            ),
        ),
    ]
