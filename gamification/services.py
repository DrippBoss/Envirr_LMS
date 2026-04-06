from django.db import transaction
from django.utils import timezone
from gamification.models import Streak, StudentXP
from datetime import timedelta

XP_REWARDS = {
    'quiz_passed': 50,
    'doubt_resolved': 20,
    'practice_question': 5,
}

@transaction.atomic
def update_streak_and_xp(student, activity_type: str):
    """
    Atomically updates the user's streak and XP based on an activity.
    Ensures safe concurrent accesses via select_for_update.
    """
    today = timezone.localdate()
    
    # 1. Update Streak
    streak, created = Streak.objects.select_for_update().get_or_create(student=student)
    
    if streak.last_activity_date != today:
        if streak.last_activity_date == today - timedelta(days=1):
            # Consecutive day
            streak.current_streak += 1
            streak.is_broken = False
        else:
            # Missed a day or first time
            streak.current_streak = 1
            streak.is_broken = False if not streak.last_activity_date else True
            
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
            
        streak.last_activity_date = today
        streak.save()

    # 2. Update XP
    xp_amount = XP_REWARDS.get(activity_type, 0)
    if xp_amount > 0:
        student_xp, created = StudentXP.objects.select_for_update().get_or_create(student=student)
        student_xp.total_xp += xp_amount
        
        # Calculate Level (Every 500 XP = 1 Level)
        new_level = max(1, (student_xp.total_xp // 500) + 1)
        student_xp.current_level = new_level
        
        # Append to XP History
        current_history = student_xp.xp_history
        if not isinstance(current_history, list):
            current_history = []
            
        current_history.append({
            'source': activity_type,
            'amount': xp_amount,
            'date': timezone.now().isoformat()
        })
        student_xp.xp_history = current_history
        student_xp.save()
