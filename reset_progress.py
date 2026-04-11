
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'envirr_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from learning.models import UnitPrerequisiteSeen, NodeProgress, RevisionNodeProgress

User = get_user_model()
username = 'fixed_test_student14_v3'

try:
    user = User.objects.get(username=username)
    profile = user.profile
    
    # Delete all progress
    UnitPrerequisiteSeen.objects.filter(student=profile).delete()
    NodeProgress.objects.filter(student=profile).delete()
    RevisionNodeProgress.objects.filter(student=profile).delete()
    
    print(f"Successfully reset progress for {username}")
except User.DoesNotExist:
    print(f"User {username} not found")
except Exception as e:
    print(f"Error resetting progress: {e}")
