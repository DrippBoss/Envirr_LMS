from django.db import transaction
from django.conf import settings
from django.utils import timezone
from gamification.models import Streak, StudentXP, Badge, StudentBadge
from datetime import timedelta

XP_REWARDS = {
    'quiz_passed': 50,
    'doubt_resolved': 20,
    'practice_question': 5,
}

# D3: cap the XP level so a high-XP student can't reach an unbounded level
# (e.g. 10000+). Configurable via settings.GAMIFICATION_MAX_LEVEL.
XP_PER_LEVEL = 500
MAX_LEVEL = getattr(settings, 'GAMIFICATION_MAX_LEVEL', 100)


def level_for_xp(total_xp):
    """Single source of truth for XP→level, capped at MAX_LEVEL."""
    return min(MAX_LEVEL, max(1, (total_xp // XP_PER_LEVEL) + 1))

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
        
        # Calculate Level (every XP_PER_LEVEL XP = 1 level), capped at MAX_LEVEL
        student_xp.current_level = level_for_xp(student_xp.total_xp)
        
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


def check_and_award_badges(student_profile, node) -> dict | None:
    """
    Check if completing this node earns the student any badge.
    Returns the newly earned badge dict or None.
    Currently checks: Scholar (complete every node in a course).
    """
    from learning.models import LearningNode, NodeProgress

    unit = getattr(getattr(node, 'path', None), 'unit', None)
    if not unit:
        return None

    total_nodes = LearningNode.objects.filter(path__unit=unit, is_archived=False).count()
    if total_nodes == 0:
        return None

    completed_nodes = NodeProgress.objects.filter(
        student=student_profile,
        node__path__unit=unit,
        node__is_archived=False,
        status='COMPLETED',
    ).count()

    if completed_nodes < total_nodes:
        return None

    try:
        scholar = Badge.objects.get(criteria='complete_course')
    except Badge.DoesNotExist:
        return None

    _, created = StudentBadge.objects.get_or_create(
        student=student_profile,
        badge=scholar,
    )
    if created:
        return {'name': scholar.name, 'description': scholar.description, 'icon': scholar.icon}
    return None
