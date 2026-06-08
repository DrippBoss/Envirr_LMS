from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0008_add_unlock_min_stars'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MockTestAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(max_length=100)),
                ('chapters', models.JSONField(default=list)),
                ('difficulty', models.CharField(default='mixed', max_length=20)),
                ('time_limit', models.PositiveIntegerField(blank=True, help_text='Seconds; null = untimed', null=True)),
                ('question_ids', models.JSONField(default=list, help_text='Ordered list of QuestionBank PKs')),
                ('answers', models.JSONField(default=dict, help_text='{"<qid>": "<given>"}')),
                ('results', models.JSONField(default=dict, help_text='Per-question grading output')),
                ('score', models.PositiveIntegerField(default=0)),
                ('total', models.PositiveIntegerField(default=0)),
                ('time_taken', models.PositiveIntegerField(blank=True, help_text='Seconds', null=True)),
                ('completed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mock_attempts', to='users.studentprofile')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
