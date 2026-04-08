import random
from django.db.models import Count, Q
from ai_engine.models import QuestionBank, QuestionPaper, PaperQuestion

def get_fresh_questions(teacher, config: dict, required_count: int):
    """
    Implements the 70% Unique rule. Guarantees paper freshness utilizing history exclusion.
    """
    
    base_qs = QuestionBank.objects.filter(
        subject=config.get('subject'),
        chapter=config.get('chapter'),
        marks=config.get('marks', 1),
        difficulty=config.get('difficulty', 'medium'),
        question_type=config.get('type', 'mcq')
    )

    # Identifies questions recently used by THIS exact teacher in prior generated papers.
    used_subquery = PaperQuestion.objects.filter(
        paper__created_by=teacher
    ).values_list('question_id', flat=True)

    never_used = list(base_qs.exclude(id__in=used_subquery))
    previously_used = list(base_qs.filter(id__in=used_subquery))

    fresh_amount = int(required_count * 0.70)
    recycled_amount = required_count - fresh_amount

    # Safety Fallback: Shrink fresh demands dynamically if Bank lacks depth.
    if len(never_used) < fresh_amount:
        fresh_amount = len(never_used)
        recycled_amount = required_count - fresh_amount

    selected = random.sample(never_used, fresh_amount)
    
    if len(previously_used) >= recycled_amount:
        selected += random.sample(previously_used, recycled_amount)
    else:
        # Final desperate fallback for absolute starvation gaps.
        remaining_needed = required_count - len(selected)
        selected += random.sample(previously_used, min(len(previously_used), remaining_needed))

    return selected
