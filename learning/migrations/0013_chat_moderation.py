from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0012_study_group_pdf_mode'),
        ('users', '0001_initial'),
    ]

    operations = [
        # Add violation tracking to StudyGroupMember
        migrations.AddField(
            model_name='studygroupmember',
            name='violation_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='studygroupmember',
            name='muted_until',
            field=models.DateTimeField(null=True, blank=True),
        ),

        # New ChatModerationEvent model
        migrations.CreateModel(
            name='ChatModerationEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('blocked_text', models.TextField()),
                ('reason', models.CharField(max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='moderation_events',
                    to='learning.groupsession',
                )),
                ('sender', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='moderation_events',
                    to='users.studentprofile',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
