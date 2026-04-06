from django.db import transaction
from courses.models import Quiz, Lesson, Unit
from activity.models import QuizSubmission, UnitCompletion
from gamification.services import update_streak_and_xp

@transaction.atomic
def evaluate_quiz(student, quiz: Quiz, user_answers: dict) -> QuizSubmission:
    """
    Evaluates a quiz submission, calculates score, determines pass/fail, and triggers atomic gamification hooks.
    """
    questions = quiz.questions.all()
    total_questions = questions.count()
    if total_questions == 0:
        raise ValueError("Cannot evaluate an empty quiz.")

    correct_count = 0
    for q in questions:
        provided_answer = user_answers.get(str(q.id)) or user_answers.get(q.id)
        if provided_answer and str(provided_answer).strip().lower() == str(q.correct_answer).strip().lower():
            correct_count += 1
            
    score_percentage = (correct_count / total_questions) * 100
    passed = score_percentage >= quiz.passing_percentage
    
    submission = QuizSubmission.objects.create(
        student=student,
        quiz=quiz,
        score=score_percentage,
        passed=passed
    )
    
    # Gamification hook
    if passed:
        update_streak_and_xp(student, 'quiz_passed')
        complete_unit_if_eligible(student, quiz.lesson.unit)
        
    return submission

@transaction.atomic
def complete_unit_if_eligible(student, unit: Unit):
    """
    Validates if all gated quizzes in the given unit block are passed. 
    If so, officially generates a UnitCompletion for interlocking unlocks.
    """
    lessons_with_quizzes = Lesson.objects.filter(unit=unit, quiz__isnull=False).values_list('quiz__id', flat=True)
    if not lessons_with_quizzes:
        return # If somehow no quizzes exist, skip.

    passed_quizzes = QuizSubmission.objects.filter(
        student=student, 
        quiz_id__in=lessons_with_quizzes, 
        passed=True
    ).values_list('quiz_id', flat=True).distinct()
    
    if len(passed_quizzes) == len(lessons_with_quizzes):
        UnitCompletion.objects.get_or_create(student=student, unit=unit)
