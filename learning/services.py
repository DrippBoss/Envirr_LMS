from django.db import transaction
from django.utils import timezone
from learning.models import (
    LearningNode, NodeProgress, CompletionStatus, RevisionNode, 
    RevisionNodeProgress, WeakSpot, Flashcard, DeckCard
)
from gamification.services import update_streak_and_xp, level_for_xp

@transaction.atomic
def unlock_next_nodes(student_profile, completed_node):
    path = completed_node.path

    # 1. Find the next sequential non-lab node
    next_node = LearningNode.objects.filter(
        path=path,
        order__gt=completed_node.order,
        is_archived=False,
    ).exclude(node_type='LAB').order_by('order').first()

    if next_node:
        can_unlock = True

        # 1a. Star-based mastery gate: check stars earned on the just-completed node
        if next_node.unlock_min_stars > 0:
            completed_prog = NodeProgress.objects.filter(
                student=student_profile, node=completed_node
            ).first()
            if not completed_prog or completed_prog.stars < next_node.unlock_min_stars:
                can_unlock = False

        # 1b. Lab gate: any LAB node sitting between completed_node and next_node must be done
        if can_unlock:
            intervening_labs = LearningNode.objects.filter(
                path=path, node_type='LAB',
                order__gt=completed_node.order,
                order__lt=next_node.order,
                is_archived=False,
            )
            for lab in intervening_labs:
                lab_done = NodeProgress.objects.filter(
                    student=student_profile, node=lab, status=CompletionStatus.COMPLETED
                ).exists()
                if not lab_done:
                    can_unlock = False
                    break

        if can_unlock:
            NodeProgress.objects.get_or_create(
                student=student_profile,
                node=next_node,
                defaults={'status': CompletionStatus.UNLOCKED}
            )

    # 2. Find any RevisionNode branching off this node
    revision_nodes = RevisionNode.objects.filter(appears_after_node=completed_node)
    for rnode in revision_nodes:
        RevisionNodeProgress.objects.get_or_create(
            student=student_profile,
            revision_node=rnode
        )

    # 3. Unlock lab nodes based on completion threshold
    completed_count = NodeProgress.objects.filter(
        student=student_profile,
        node__path=path,
        status=CompletionStatus.COMPLETED,
    ).exclude(node__node_type='LAB').count()

    lab_nodes = LearningNode.objects.filter(path=path, node_type='LAB', is_archived=False)
    for lab in lab_nodes:
        if lab.lab_required_completions > 0 and completed_count >= lab.lab_required_completions:
            NodeProgress.objects.get_or_create(
                student=student_profile,
                node=lab,
                defaults={'status': CompletionStatus.UNLOCKED}
            )

@transaction.atomic
def award_node_xp(student_profile, node, xp_amount, is_test=False):
    # Determine the activity type for gamification
    activity_type = 'quiz_passed' if is_test else 'lesson_completed'
    
    # We will slightly modify update_streak_and_xp usage since we want to specify xp amount directly
    # Wait, update_streak_and_xp relies on XP_REWARDS dict. Let's just directly add the XP or extend Gamification
    from gamification.models import StudentXP, Streak
    from datetime import timedelta
    
    # 1. Update Streak (simplified version of the gamification logic, ensuring we don't break existing stuff)
    today = timezone.localdate()
    streak, _ = Streak.objects.select_for_update().get_or_create(student=student_profile.user)
    
    # Only increment streak if this is a new day
    if streak.last_activity_date != today:
        if streak.last_activity_date == today - timedelta(days=1):
            streak.current_streak += 1
            streak.is_broken = False
        else:
            streak.current_streak = 1
            streak.is_broken = False if not streak.last_activity_date else True
            
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
            
        streak.last_activity_date = today
        streak.save()

    # 2. Add specific XP
    if xp_amount > 0:
        student_xp, _ = StudentXP.objects.select_for_update().get_or_create(student=student_profile.user)
        student_xp.total_xp += xp_amount
        student_xp.current_level = level_for_xp(student_xp.total_xp)
        
        current_history = student_xp.xp_history
        if not isinstance(current_history, list): current_history = []
        current_history.append({
            'source': f"learning_node_{node.id}",
            'amount': xp_amount,
            'date': timezone.now().isoformat()
        })
        student_xp.xp_history = current_history
        student_xp.save()

    # 3. Check and award badges
    from gamification.services import check_and_award_badges
    return check_and_award_badges(student_profile, node)

def calculate_stars(wrong_count, total_questions):
    if wrong_count == 0:
        return 3
    elif wrong_count <= 2:
        return 2
    return 1

def _get_prioritized_cards(student_profile, deck, limit=None):
    if not deck:
        return []
    
    # Get active weak spots
    active_weak_spots = WeakSpot.objects.filter(
        student=student_profile, 
        is_resolved=False
    ).values_list('concept', flat=True)
    
    deck_cards = list(deck.cards.all())
    
    # Sort: cards matching weak concepts first, then random/order
    # To maintain some stability, we'll sort by matching weak spot (True first), then order
    def sort_key(card):
        is_weak = card.concept in active_weak_spots
        return (not is_weak, card.order)
        
    deck_cards.sort(key=sort_key)
    
    if limit:
        return deck_cards[:limit]
    return deck_cards

def get_personalised_revision_deck(student_profile, revision_node):
    deck = getattr(revision_node, 'deck', None)
    if deck: # actually related_name is deck on RevisionNode
        d = deck.first() # returns the FlashcardDeck
        if d:
            return _get_prioritized_cards(student_profile, d)
    return []

def get_post_node_cards(student_profile, node):
    decks = node.revision_decks.all()
    if decks.exists():
        return _get_prioritized_cards(student_profile, decks.first(), limit=3)
    return []
