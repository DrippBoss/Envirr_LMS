import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'envirr_backend.settings')
django.setup()

from learning.models import CourseUnit, LearningPath, LearningNode, LessonQuestion, QuestionType

def seed_polynomials():
    print("Seeding Polynomials course...")
    
    # 1. Create or get CourseUnit
    unit, created = CourseUnit.objects.get_or_create(
        title="Polynomials",
        subject="Mathematics",
        class_grade="10",
        defaults={
            "board": "CBSE",
            "order": 2,
            "icon": "functions",
            "description": "Learn about degrees, zeroes, and polynomial arithmetic.",
            "is_published": True
        }
    )
    
    # 2. Create LearningPath
    path, _ = LearningPath.objects.get_or_create(
        unit=unit,
        title="Foundations of Polynomials",
        class_grade="10",
        defaults={
            "description": "Understanding terms, coefficients, and roots."
        }
    )
    
    # 3. Create LearningNode
    node, _ = LearningNode.objects.get_or_create(
        path=path,
        title="Factorizing Quadratics",
        node_type="LESSON",
        order=1,
        defaults={
            "xp_reward": 20,
            "practice_question_count": 3
        }
    )
    
    # Clear existing questions for this node
    node.questions.all().delete()
    
    # 4. Create Questions
    # Q1: Normal MCQ
    LessonQuestion.objects.create(
        node=node,
        question_type=QuestionType.MCQ,
        question_text="What is the degree of the polynomial 4x³ + 2x² - 5?",
        options_json={"A": "1", "B": "2", "C": "3", "D": "4"},
        correct_answer="C",
        hint="Look at the highest power of x.",
        order=1
    )
    
    # Q2: Rearrange Question
    LessonQuestion.objects.create(
        node=node,
        question_type=QuestionType.REARRANGE,
        question_text="Tap the terms to build the factorization of x² + 5x + 6.",
        options_json={"chips": ["(x+1)", "(x-2)", "(x+2)", "(x+3)", "(x-3)"]},
        correct_answer="(x+2)(x+3)",
        hint="Think of two numbers that add to 5 and multiply to 6.",
        order=2
    )

    # Q3: Rearrange Question
    LessonQuestion.objects.create(
        node=node,
        question_type=QuestionType.REARRANGE,
        question_text="Reorder the polynomial 2 + 5x² - 3x to standard form.",
        options_json={"chips": ["+", "-", "5x²", "3x", "2"]},
        correct_answer="5x² - 3x + 2",
        hint="Standard form means arranging from highest power to lowest.",
        order=3
    )

    print(f"Successfully seeded: Unit '{unit.title}' -> Node '{node.title}' with {node.questions.count()} questions.")


if __name__ == "__main__":
    seed_polynomials()
