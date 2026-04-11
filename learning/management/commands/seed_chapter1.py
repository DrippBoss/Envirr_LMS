import random
from django.core.management.base import BaseCommand
from courses.models import Subject, Course
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion, 
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, 
    QuestionType, FlashcardType, DeckPurpose
)

class Command(BaseCommand):
    help = 'Seeds Chapter 1 data for the Gamified student learning panel'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 1...")

        # 1. Base Setup (Courses & Subject)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(username='admin', defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'})
        
        subj, _ = Subject.objects.get_or_create(name='Mathematics', defaults={'created_by': admin_user})
        course, _ = Course.objects.get_or_create(
            name='Real Numbers',
            subject=subj,
            defaults={'status': 'published', 'created_by': admin_user}
        )

        # 2. CourseUnit & LearningPath
        unit, unit_created = CourseUnit.objects.get_or_create(
            title='Number Systems',
            subject='Mathematics',
            class_grade='10',
            board='CBSE',
            order=1,
            icon='numbers',
            defaults={'is_published': True}
        )

        path, path_created = LearningPath.objects.get_or_create(
            unit=unit,
            title='Real Numbers',
            class_grade='10'
        )
        
        # Wipe old data related to this path and unit to ensure a clean re-seed
        self.stdout.write("Wiping old nodes and flashcards to allow clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # 3. Create Nodes
        nodes_data = [
            {
                "title": "Introduction to Real Numbers", 
                "xp": 10, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=2rE_N0_Dpr8"
            },
            {
                "title": "HCF — The Easy Way", 
                "xp": 15, "type": NodeType.LESSON,
                "video_url": "" # Intentional blank to test placeholder
            },
            {
                "title": "LCM — Step by Step", 
                "xp": 15, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=1xNmcEIT4iM"
            },
            {
                "title": "Irrational Numbers Explained", 
                "xp": 20, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=H74tqiawD8o"
            },
            {
                "title": "Prime Factorization", 
                "xp": 20, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=XKb0yE_2m7o"
            },
            {
                "title": "Chapter 1 — Real Numbers Final Test", 
                "xp": 50, "type": NodeType.CHAPTER_TEST,
                "video_url": ""
            },
        ]
        
        nodes = []
        for idx, nd in enumerate(nodes_data, start=1):
            n = LearningNode.objects.create(
                path=path,
                title=nd['title'],
                node_type=nd['type'],
                order=idx,
                xp_reward=nd['xp'],
                practice_question_count=5 if nd['type'] == NodeType.LESSON else 0,
                test_question_count=10 if nd['type'] == NodeType.CHAPTER_TEST else 0,
                youtube_url=nd.get('video_url', '')
            )
            nodes.append(n)

        # 4. Questions for Lesson Nodes (stub data => actual data)
        questions_library = [
            # Node 1: Intro to Real Numbers
            [
                {"q": "Which of the following is NOT a rational number?", "opts": {"A": "1/2", "B": "√2", "C": "0", "D": "-5"}, "ans": "B", "hint": "Rational numbers can be expressed as p/q."},
                {"q": "Every integer is a...", "opts": {"A": "Whole number", "B": "Rational number", "C": "Natural number", "D": "Irrational number"}, "ans": "B", "hint": "Can an integer x be written as x/1?"},
                {"q": "The sum of a rational and an irrational number is always:", "opts": {"A": "Rational", "B": "Irrational", "C": "Integer", "D": "Zero"}, "ans": "B", "hint": "Adding a non-terminating, non-repeating decimal to a fraction."},
                {"q": "What is the decimal expansion of 1/3?", "opts": {"A": "Terminating", "B": "Non-terminating repeating", "C": "Non-terminating non-repeating", "D": "None"}, "ans": "B", "hint": "1 divided by 3 is 0.3333..."},
                {"q": "Is 3.14159... (π) rational or irrational?", "opts": {"A": "Rational", "B": "Irrational", "C": "Integer", "D": "Both"}, "ans": "B", "hint": "Pi does not terminate or repeat."}
            ],
            # Node 2: HCF
            [
                {"q": "HCF of 12 and 18 is:", "opts": {"A": "2", "B": "3", "C": "6", "D": "36"}, "ans": "C", "hint": "Find the largest number that divides both."},
                {"q": "If HCF(a, b) = 1, then a and b are called:", "opts": {"A": "Prime", "B": "Co-prime", "C": "Composite", "D": "Even"}, "ans": "B", "hint": "They have no common factors other than 1."},
                {"q": "By Euclid's lemma, a = bq + r. For HCF finding, we stop when:", "opts": {"A": "q = 0", "B": "r = 0", "C": "r = b", "D": "a = b"}, "ans": "B", "hint": "The remainder must be zero."},
                {"q": "The HCF of two consecutive even numbers is always:", "opts": {"A": "1", "B": "2", "C": "0", "D": "4"}, "ans": "B", "hint": "Try 2 and 4, or 4 and 6."},
                {"q": "HCF of 9 and 27 is:", "opts": {"A": "3", "B": "9", "C": "27", "D": "1"}, "ans": "B", "hint": "9 divides 27."}
            ],
            # Node 3: LCM
            [
                {"q": "LCM of 4 and 5 is:", "opts": {"A": "1", "B": "9", "C": "20", "D": "40"}, "ans": "C", "hint": "They are co-prime, so multiply them."},
                {"q": "For any two positive integers a, b: HCF(a,b) × LCM(a,b) =", "opts": {"A": "a+b", "B": "a-b", "C": "a×b", "D": "a/b"}, "ans": "C", "hint": "Product formula."},
                {"q": "Find LCM of 6 and 8:", "opts": {"A": "24", "B": "48", "C": "14", "D": "2"}, "ans": "A", "hint": "Multiples of 8: 8, 16, 24... does 6 divide 24?"},
                {"q": "If one number is a multiple of another, their LCM is:", "opts": {"A": "The smaller number", "B": "The larger number", "C": "Their product", "D": "1"}, "ans": "B", "hint": "Try 3 and 9."},
                {"q": "If HCF(26, 91) = 13, then LCM(26, 91) is:", "opts": {"A": "13", "B": "182", "C": "2366", "D": "14"}, "ans": "B", "hint": "Use the LCM * HCF = Product formula: (26*91)/13."}
            ],
            # Node 4: Irrational
            [
                {"q": "Which of these is irrational?", "opts": {"A": "√4", "B": "√9", "C": "√2", "D": "√16"}, "ans": "C", "hint": "Which one is not a perfect square?"},
                {"q": "If p is a prime, then √p is always:", "opts": {"A": "Rational", "B": "Irrational", "C": "Integer", "D": "Whole number"}, "ans": "B", "hint": "Roots of primes are never whole numbers."},
                {"q": "The product of a non-zero rational and irrational number is:", "opts": {"A": "Always rational", "B": "Always irrational", "C": "Sometimes rational", "D": "One"}, "ans": "B", "hint": "Try 2 * √3."},
                {"q": "2 + √3 is:", "opts": {"A": "Rational", "B": "Irrational", "C": "Integer", "D": "Natural"}, "ans": "B", "hint": "Sum of rational and irrational."},
                {"q": "Is the number 0.1010010001... rational or irrational?", "opts": {"A": "Rational", "B": "Irrational", "C": "Integer", "D": "Complex"}, "ans": "B", "hint": "It neither terminates nor repeats the same pattern."}
            ],
            # Node 5: Prime Factorization
            [
                {"q": "The prime factorization of 12 is:", "opts": {"A": "2×6", "B": "3×4", "C": "2²×3", "D": "12×1"}, "ans": "C", "hint": "Break it down until only prime numbers are left."},
                {"q": "Fundamental Theorem of Arithmetic applies to:", "opts": {"A": "Prime numbers", "B": "Composite numbers", "C": "Fractions", "D": "Negative numbers"}, "ans": "B", "hint": "It says every __ number can be uniquely expressed as a product of primes."},
                {"q": "Prime factorization of 150 gives how many 5s?", "opts": {"A": "1", "B": "2", "C": "3", "D": "0"}, "ans": "B", "hint": "150 = 15 * 10 = 3 * 5 * 2 * 5."},
                {"q": "Can any number ending in 0 have a prime factorization without 2 and 5?", "opts": {"A": "Yes", "B": "No", "C": "Only if it ends in 00", "D": "Sometimes"}, "ans": "B", "hint": "10 = 2 * 5."},
                {"q": "The total number of prime factors of 30 is:", "opts": {"A": "2", "B": "3", "C": "4", "D": "1"}, "ans": "B", "hint": "30 = 2 * 3 * 5."}
            ]
        ]

        for i in range(1, 6): # Nodes 1-5
            node = nodes[i-1]
            q_set = questions_library[i-1]
            for j, qdata in enumerate(q_set):
                LessonQuestion.objects.create(
                    node=node,
                    question_type=QuestionType.MCQ,
                    question_text=qdata["q"],
                    options_json=qdata["opts"],
                    correct_answer=qdata["opts"][qdata["ans"]], # We need the actual value since frontend uses value generally
                    concept=f"Concept {i}.{j+1}",
                    hint=qdata["hint"]
                )

        # 5. Revision Node
        rev_node = RevisionNode.objects.create(
            path=path,
            title="Number Types Revision ✨",
            appears_after_node=nodes[4], # After Node 5
            side=random.choice(['left', 'right']),
            xp_reward=20,
            is_mandatory=False
        )

        # 6. Flashcards and Decks
        
        # Prerequisite Deck
        pre_deck = FlashcardDeck.objects.create(
            title="Chapter 1 Prerequisites", purpose=DeckPurpose.PREREQUISITE, course_unit=unit
        )
        pre_concepts = ["Prime Elements", "Factorization Basics", "Rational/Irrational", "Divisibility Rules", "Understanding HCF"]
        for c in pre_concepts:
            fc = Flashcard.objects.create(
                title=f"What is {c}?",
                body=f"Definition of {c}.",
                card_type=FlashcardType.CONCEPT,
                subject="Mathematics",
                chapter="Real Numbers",
                concept=c
            )
            DeckCard.objects.create(deck=pre_deck, card=fc)

        # Post-Node Deck (for Node 1)
        post_deck = FlashcardDeck.objects.create(
            title="Real Numbers Review", purpose=DeckPurpose.POST_NODE, learning_node=nodes[0]
        )
        for i in range(3):
            fc = Flashcard.objects.create(
                title=f"Review Concept {i+1}",
                body=f"Key takeaway {i+1}",
                card_type=FlashcardType.SUMMARY,
                subject="Mathematics",
                chapter="Real Numbers",
                concept=f"Concept {i+1}"
            )
            DeckCard.objects.create(deck=post_deck, card=fc)

        # Revision Node Deck
        rev_deck = FlashcardDeck.objects.create(
            title="Revision Deck", purpose=DeckPurpose.SIDE_REVISION, revision_node=rev_node
        )
        rev_concepts = ["Concept 1", "Concept 2", "Concept 3", "Concept 4", "Rational vs Irrational"]
        for c in rev_concepts:
            fc = Flashcard.objects.create(
                title=f"Revise: {c}",
                body=f"Deep dive into {c}.",
                card_type=FlashcardType.CONCEPT,
                subject="Mathematics",
                chapter="Real Numbers",
                concept=c
            )
            DeckCard.objects.create(deck=rev_deck, card=fc)

        self.stdout.write(self.style.SUCCESS("Chapter 1 seeded successfully!"))
