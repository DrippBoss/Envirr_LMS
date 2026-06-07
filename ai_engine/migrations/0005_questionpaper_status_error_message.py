from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_engine', '0004_alter_casestudypart_question_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='questionpaper',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending',    'Pending'),
                    ('processing', 'Processing'),
                    ('done',       'Done'),
                    ('failed',     'Failed'),
                ],
                default='pending',
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='questionpaper',
            name='error_message',
            field=models.TextField(blank=True, default=''),
        ),
    ]
