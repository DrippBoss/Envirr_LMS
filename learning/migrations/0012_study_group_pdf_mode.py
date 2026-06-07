from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0011_add_group_sessions'),
        ('users', '0001_initial'),
    ]

    operations = [
        # session_type on GroupSession
        migrations.AddField(
            model_name='groupsession',
            name='session_type',
            field=models.CharField(
                choices=[('questions', 'Questions'), ('pdf', 'PDF Paper')],
                default='questions',
                max_length=20,
            ),
        ),

        # image + question_number + is_system on GroupChatMessage
        migrations.AddField(
            model_name='groupchatmessage',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='group_chat_images/'),
        ),
        migrations.AddField(
            model_name='groupchatmessage',
            name='question_number',
            field=models.IntegerField(blank=True, null=True, help_text='PDF question number (1-based)'),
        ),
        migrations.AddField(
            model_name='groupchatmessage',
            name='is_system',
            field=models.BooleanField(default=False, help_text='AI/system generated message'),
        ),
        # Make sender nullable
        migrations.AlterField(
            model_name='groupchatmessage',
            name='sender',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='chat_messages',
                to='users.studentprofile',
            ),
        ),
        # Make message blank-able
        migrations.AlterField(
            model_name='groupchatmessage',
            name='message',
            field=models.TextField(blank=True),
        ),

        # GroupDoubt model
        migrations.CreateModel(
            name='GroupDoubt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_number', models.IntegerField(help_text='1-based question number in PDF')),
                ('doubt_count', models.IntegerField(default=1)),
                ('escalated_to_ai', models.BooleanField(default=False)),
                ('escalated_to_teacher', models.BooleanField(default=False)),
                ('ai_response', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='doubts',
                    to='learning.groupsession',
                )),
            ],
            options={
                'unique_together': {('session', 'question_number')},
            },
        ),
    ]
