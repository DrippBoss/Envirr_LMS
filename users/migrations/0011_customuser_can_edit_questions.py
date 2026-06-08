from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_emailverificationtoken_send_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='can_edit_questions',
            field=models.BooleanField(default=False),
        ),
    ]
