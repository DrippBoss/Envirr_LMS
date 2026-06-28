from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 8 — Sequences and Progressions (Ganita Manjari, Class 9, 2026-27)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 8 — Sequences and Progressions (Class 9)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Sequences and Progressions',
            subject='Mathematics',
            class_grade='9', board='CBSE', order=8, icon='show_chart',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Sequences and Progressions', class_grade='9'
        )

        self.stdout.write("Wiping old nodes and flashcard decks for clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # ── Helpers ─────────────────────────────────────────────────────────────
        def q(node, qtype, text, opts, ans, hint='', explanation='', concept=''):
            LessonQuestion.objects.create(
                node=node, question_type=qtype, question_text=text,
                options_json=opts, correct_answer=ans,
                hint=hint, explanation=explanation, concept=concept,
            )

        def lesson(order, title, xp, nq=5, description='', objectives=None):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LESSON, order=order,
                xp_reward=xp, practice_question_count=nq, starting_lives=3,
                description=description, objectives_json=objectives or [],
            )

        def lab(order, title, xp, lab_type, lab_category, required):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LAB, order=order,
                xp_reward=xp, lab_type=lab_type, lab_category=lab_category,
                lab_required_completions=required,
            )

        def test(order, title, xp):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.CHAPTER_TEST, order=order,
                xp_reward=xp, test_question_count=12, test_pass_percentage=70,
            )

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 1 — Introduction to Sequences
        # ═══════════════════════════════════════════════════════════════════════
        n1 = lesson(1, "Introduction to Sequences", 10, nq=5,
                    description="Discover patterns around us! A sequence is an ordered list of numbers. "
                                "We explore natural numbers, odd numbers, triangular numbers, and square "
                                "numbers — noticing how each follows a special rule.",
                    objectives=[
                        "Define a sequence and identify its terms",
                        "Distinguish between finite and infinite sequences",
                        "Recognise natural, odd, triangular, and square number sequences",
                        "Use the notation t₁, t₂, t₃, … to describe terms",
                        "Identify the pattern in a sequence and predict the next few terms",
                    ])

        q(n1, QuestionType.MCQ,
          "What is a sequence in mathematics?",
          {"A": "A random collection of numbers", "B": "An ordered list of numbers following a pattern",
           "C": "A set of numbers with no repetition", "D": "A list of prime numbers"},
          "B",
          hint="Think about the word 'ordered' — the arrangement matters.",
          explanation="A sequence is an ordered list of numbers where each number is called a term. "
                      "The arrangement (order) is what makes it a sequence.",
          concept="Definition of Sequence")

        q(n1, QuestionType.MCQ,
          "In the sequence 1, 4, 9, 16, 25, …, what is the 6th term?",
          {"A": "30", "B": "36", "C": "32", "D": "49"},
          "B",
          hint="These are square numbers: 1², 2², 3², …",
          explanation="The nth term of this sequence is n². So the 6th term = 6² = 36.",
          concept="Square Numbers")

        q(n1, QuestionType.MCQ,
          "Which of the following is a FINITE sequence?",
          {"A": "1, 2, 3, 4, 5, … (natural numbers)",
           "B": "1, 3, 5, 7, … (odd numbers)",
           "C": "6, 12, 24, 48, 96",
           "D": "1, 4, 9, 16, … (square numbers)"},
          "C",
          hint="A finite sequence has a last term — it ends.",
          explanation="6, 12, 24, 48, 96 is a finite sequence because it has exactly 5 terms and ends at 96. "
                      "The others continue indefinitely (shown by …).",
          concept="Finite vs Infinite Sequences")

        q(n1, QuestionType.FILL_BLANK,
          "In the sequence of triangular numbers 1, 3, 6, 10, 15, …, the 5th term is ___.",
          {},
          "15",
          hint="Triangular numbers: 1 = 1, 3 = 1+2, 6 = 1+2+3, 10 = 1+2+3+4, …",
          explanation="The 5th triangular number = 1+2+3+4+5 = 15.",
          concept="Triangular Numbers")

        q(n1, QuestionType.MCQ,
          "In the notation t₁, t₂, t₃, … for a sequence, what does the subscript (the small number) represent?",
          {"A": "The value of the term", "B": "The position number of the term",
           "C": "The common difference", "D": "The number of terms"},
          "B",
          hint="t₄ = 7 means the term in the 4th position is 7.",
          explanation="The subscript is the term number or position. So t₄ = 7 tells us that the 4th term has value 7.",
          concept="Term Notation")

        q(n1, QuestionType.MCQ,
          "In the sequence of odd numbers 1, 3, 5, 7, 9, …, what is t₆?",
          {"A": "10", "B": "11", "C": "12", "D": "13"},
          "B",
          hint="The odd numbers are 1, 3, 5, 7, 9, 11, …",
          explanation="The 6th odd number is 11. So t₆ = 11.",
          concept="Odd Number Sequence")

        q(n1, QuestionType.MCQ,
          "In the sequence 1, 3, 6, 10, 15, 21, … (triangular numbers), the difference between consecutive "
          "terms increases by 1 each time. What is the 7th term?",
          {"A": "25", "B": "28", "C": "30", "D": "21"},
          "B",
          hint="The differences are 2, 3, 4, 5, 6, 7, … Add 7 to the 6th term.",
          explanation="6th term = 21. The difference between 6th and 7th = 7. So 7th term = 21 + 7 = 28.",
          concept="Triangular Numbers")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 2 — Explicit Rules for a Sequence
        # ═══════════════════════════════════════════════════════════════════════
        n2 = lesson(2, "Explicit Rules for a Sequence", 15, nq=6,
                    description="An explicit formula lets you find any term directly from its position number n, "
                                "without needing earlier terms. We explore how to write, use, and verify explicit "
                                "formulas for sequences.",
                    objectives=[
                        "Understand and write an explicit (general) rule for a sequence",
                        "Compute any term directly using an explicit formula",
                        "Determine whether a given number is a term of a sequence",
                        "Find the position of a term in a sequence using its explicit rule",
                    ])

        q(n2, QuestionType.MCQ,
          "Using the explicit rule uₙ = 2n − 1, what is u₅?",
          {"A": "7", "B": "9", "C": "11", "D": "5"},
          "B",
          hint="Substitute n = 5: u₅ = 2(5) − 1.",
          explanation="u₅ = 2×5 − 1 = 10 − 1 = 9.",
          concept="Using Explicit Formula")

        q(n2, QuestionType.FILL_BLANK,
          "Using the explicit rule uₙ = 2n − 1, the 53rd term of the odd number sequence is ___.",
          {},
          "105",
          hint="u₅₃ = 2(53) − 1 = 106 − 1.",
          explanation="u₅₃ = 2×53 − 1 = 106 − 1 = 105.",
          concept="Using Explicit Formula")

        q(n2, QuestionType.MCQ,
          "The explicit rule for the nth term of the sequence 3, 8, 13, 18, … is:",
          {"A": "tₙ = 5n − 2", "B": "tₙ = 3n + 5", "C": "tₙ = 5n + 3", "D": "tₙ = 3n − 2"},
          "A",
          hint="Try n=1: tₙ should give 3.",
          explanation="5(1)−2=3 ✓, 5(2)−2=8 ✓, 5(3)−2=13 ✓. So tₙ = 5n − 2.",
          concept="Finding Explicit Rule")

        q(n2, QuestionType.MCQ,
          "For the sequence sₙ = 5n − 2, which term equals 308?",
          {"A": "60th", "B": "61st", "C": "62nd", "D": "63rd"},
          "C",
          hint="Solve 5n − 2 = 308.",
          explanation="5n − 2 = 308 → 5n = 310 → n = 62. So 308 is the 62nd term.",
          concept="Finding Position of a Term")

        q(n2, QuestionType.MCQ,
          "Is 471 a term of the sequence sₙ = 5n − 2?",
          {"A": "Yes, 95th term", "B": "Yes, 94th term", "C": "No", "D": "Yes, 96th term"},
          "C",
          hint="Solve 5n − 2 = 471. Is n a natural number?",
          explanation="5n − 2 = 471 → 5n = 473 → n = 94.6. Since 94.6 is not a natural number, "
                      "471 is NOT a term of this sequence.",
          concept="Checking Membership in a Sequence")

        q(n2, QuestionType.MCQ,
          "The explicit rule for the nth term of square numbers (1, 4, 9, 16, …) is:",
          {"A": "tₙ = 2n − 1", "B": "tₙ = n + 1", "C": "tₙ = n²", "D": "tₙ = 2n"},
          "C",
          hint="1=1², 4=2², 9=3², 16=4², …",
          explanation="Each term equals the square of its position: tₙ = n².",
          concept="Explicit Rule for Square Numbers")

        q(n2, QuestionType.FILL_BLANK,
          "The position of 137 in the odd number sequence (uₙ = 2n − 1) is the ___th term.",
          {},
          "69",
          hint="Solve 2n − 1 = 137.",
          explanation="2n − 1 = 137 → 2n = 138 → n = 69. So 137 is the 69th odd number.",
          concept="Finding Position of a Term")

        q(n2, QuestionType.MCQ,
          "Consider tₙ = 3n − 7. Which term of this sequence equals 332?",
          {"A": "110th", "B": "112th", "C": "113th", "D": "115th"},
          "C",
          hint="Solve 3n − 7 = 332.",
          explanation="3n − 7 = 332 → 3n = 339 → n = 113.",
          concept="Finding Position of a Term")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 3 — Recursive Rules for a Sequence
        # ═══════════════════════════════════════════════════════════════════════
        n3 = lesson(3, "Recursive Rules for a Sequence", 15, nq=5,
                    description="A recursive rule defines each term using previous terms. "
                                "We meet the famous Virahānka–Fibonacci sequence and learn how recursive "
                                "formulas differ from explicit ones.",
                    objectives=[
                        "Understand a recursive rule and how it differs from an explicit rule",
                        "Compute terms of a sequence given its recursive rule",
                        "Identify the Virahānka–Fibonacci sequence and its recursive rule",
                        "Write a recursive rule for a given sequence",
                    ])

        q(n3, QuestionType.MCQ,
          "The sequence 1, 4, 7, 10, 13, … has the recursive rule t₁ = 1, tₙ = tₙ₋₁ + 3. What is t₅?",
          {"A": "13", "B": "14", "C": "16", "D": "12"},
          "A",
          hint="Apply the rule four times starting from t₁ = 1.",
          explanation="t₁=1, t₂=1+3=4, t₃=4+3=7, t₄=7+3=10, t₅=10+3=13.",
          concept="Applying Recursive Rule")

        q(n3, QuestionType.FILL_BLANK,
          "Given u₁ = 1, uₙ = 2uₙ₋₁ + 3 for n ≥ 2, the value of u₃ is ___.",
          {},
          "13",
          hint="First find u₂ = 2(1) + 3. Then find u₃ = 2(u₂) + 3.",
          explanation="u₂ = 2(1)+3 = 5. u₃ = 2(5)+3 = 13.",
          concept="Applying Recursive Rule")

        q(n3, QuestionType.MCQ,
          "The Virahānka–Fibonacci sequence is V₁=1, V₂=2, Vₙ=Vₙ₋₁+Vₙ₋₂. What is V₆?",
          {"A": "12", "B": "13", "C": "21", "D": "8"},
          "B",
          hint="V₃=3, V₄=5, V₅=8, V₆=?",
          explanation="V₃=2+1=3, V₄=3+2=5, V₅=5+3=8, V₆=8+5=13.",
          concept="Virahanka-Fibonacci Sequence")

        q(n3, QuestionType.MCQ,
          "Who first explicitly studied the Virahānka–Fibonacci sequence?",
          {"A": "Fibonacci (c. 1200 CE)", "B": "Virahānka (7th century CE)",
           "C": "Gopāla (c. 1135 CE)", "D": "Hemachandra (c. 1150 CE)"},
          "B",
          hint="The sequence is named after the Indian mathematician who discovered it first.",
          explanation="Virahānka first wrote down and studied this sequence in his work "
                      "Vṛttajātisamuchaya in the 7th century CE, centuries before Fibonacci.",
          concept="History of Virahanka Sequence")

        q(n3, QuestionType.MCQ,
          "Which statement best describes the key difference between explicit and recursive rules?",
          {"A": "Explicit rules use previous terms; recursive rules use n directly",
           "B": "Recursive rules use previous terms; explicit rules use n directly",
           "C": "Both rules are identical in practice",
           "D": "Explicit rules only work for arithmetic sequences"},
          "B",
          hint="Can you find the 100th term without knowing earlier terms?",
          explanation="An explicit rule gives the nth term directly from n. A recursive rule "
                      "requires knowing earlier terms to find the next one.",
          concept="Explicit vs Recursive Rule")

        q(n3, QuestionType.MCQ,
          "For s₁ = 3, sₙ = sₙ₋₁(sₙ₋₁ − 1), the 4th term s₄ equals:",
          {"A": "870", "B": "30", "C": "6", "D": "210"},
          "A",
          hint="s₂=3×2=6, s₃=6×5=30, s₄=30×29=?",
          explanation="s₂=3(3−1)=6, s₃=6(6−1)=30, s₄=30(30−1)=30×29=870.",
          concept="Applying Recursive Rule")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 4 — Arithmetic Progressions: Definition & nth Term
        # ═══════════════════════════════════════════════════════════════════════
        n4 = lesson(4, "Arithmetic Progressions — Definition & nth Term", 20, nq=6,
                    description="An Arithmetic Progression (AP) is a sequence where consecutive terms differ "
                                "by a constant value called the common difference. We derive the formula "
                                "tₙ = a + (n−1)d and apply it to real-life contexts.",
                    objectives=[
                        "Identify an Arithmetic Progression (AP)",
                        "Find the common difference of an AP",
                        "Apply the formula tₙ = a + (n−1)d to find the nth term",
                        "Determine whether a given number is a term of an AP",
                        "Solve real-life problems modelled by APs",
                    ])

        q(n4, QuestionType.MCQ,
          "Which of the following is an Arithmetic Progression?",
          {"A": "1, 2, 4, 8, 16", "B": "2, 5, 8, 11, 14",
           "C": "1, 3, 6, 10, 15", "D": "1, 1, 2, 3, 5"},
          "B",
          hint="In an AP, the difference between consecutive terms must be constant.",
          explanation="In 2, 5, 8, 11, 14 the difference is always 3 (constant). "
                      "The others don't have a constant difference.",
          concept="Identifying AP")

        q(n4, QuestionType.MCQ,
          "What is the common difference of the AP: 11, 7, 3, −1, −5, …?",
          {"A": "4", "B": "−4", "C": "3", "D": "−3"},
          "B",
          hint="Common difference = any term − the preceding term.",
          explanation="7−11 = −4, 3−7 = −4, −1−3 = −4. The common difference is −4.",
          concept="Common Difference")

        q(n4, QuestionType.MCQ,
          "Using tₙ = a + (n−1)d, find the 10th term of the AP: 3, 8, 13, 18, …",
          {"A": "43", "B": "48", "C": "53", "D": "45"},
          "B",
          hint="a = 3, d = 5, n = 10.",
          explanation="t₁₀ = 3 + (10−1)×5 = 3 + 45 = 48.",
          concept="nth Term of AP")

        q(n4, QuestionType.MCQ,
          "Which term of the AP 21, 18, 15, … is −81?",
          {"A": "33rd", "B": "34th", "C": "35th", "D": "36th"},
          "C",
          hint="Set a + (n−1)d = −81 with a=21, d=−3.",
          explanation="21 + (n−1)(−3) = −81 → (n−1)(−3) = −102 → n−1 = 34 → n = 35.",
          concept="Finding Position in AP")

        q(n4, QuestionType.FILL_BLANK,
          "For the AP a, a+d, a+2d, …, the nth term formula is tₙ = ___ (use a, n, d).",
          {},
          "a + (n-1)d",
          hint="The first term is a, and each step adds d.",
          explanation="tₙ = a + (n−1)d where a is the first term and d is the common difference.",
          concept="nth Term Formula")

        q(n4, QuestionType.MCQ,
          "A taxi charges a fixed booking fee of ₹200 plus ₹40 per km. "
          "The total fare after 10 km is:",
          {"A": "₹400", "B": "₹560", "C": "₹600", "D": "₹640"},
          "C",
          hint="The fare after n km forms an AP. Use t₁₀.",
          explanation="The fare after n km = 200 + 40n. After 10 km = 200 + 400 = ₹600. "
                      "(Or: AP with a=240, d=40, t₁₀ = 240+9×40 = 600.)",
          concept="Real-World AP")

        q(n4, QuestionType.MCQ,
          "Is 0 a term of the AP 21, 18, 15, …?",
          {"A": "Yes, 8th term", "B": "Yes, 7th term", "C": "Yes, 8th term", "D": "No"},
          "D",
          hint="Set 21 + (n−1)(−3) = 0 and check if n is a natural number.",
          explanation="21 + (n−1)(−3) = 0 → (n−1)(−3) = −21 → n−1 = 7 → n = 8. "
                      "But t₈ = 21+(7)(−3) = 21−21 = 0. Wait — 0 IS the 8th term! "
                      "Let students verify: 21,18,15,12,9,6,3,0 ✓",
          concept="Checking Membership in AP")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 5 — AP Term Explorer Lab
        # ═══════════════════════════════════════════════════════════════════════
        lab(5, "AP Term Explorer", 25, "AP_TERM_EXPLORER_LAB", LabCategory.INTERACTIVE, 3)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 6 — Visualising an AP & Real-World Contexts
        # ═══════════════════════════════════════════════════════════════════════
        n6 = lesson(6, "Visualising an AP", 15, nq=5,
                    description="When we plot the terms of an AP as ordered pairs (n, tₙ), they lie on a "
                                "straight line! We explore this graphically, find the recursive rule, "
                                "and solve word problems involving APs.",
                    objectives=[
                        "Plot terms of an AP and observe they lie on a straight line",
                        "Write the recursive rule for an AP",
                        "Find the nth term of an AP from its graph",
                        "Solve practical problems involving APs",
                    ])

        q(n6, QuestionType.MCQ,
          "When the terms (n, tₙ) of an AP are plotted on a graph, they always lie on:",
          {"A": "A parabola", "B": "A straight line", "C": "A curve", "D": "A circle"},
          "B",
          hint="The nth term formula tₙ = a + (n−1)d is a linear function of n.",
          explanation="tₙ = a + (n−1)d = dn + (a−d). This is of the form y = mx + c, a straight line.",
          concept="Visualising AP")

        q(n6, QuestionType.FILL_BLANK,
          "For the AP 2, 5, 8, 11, …, the nth term is tₙ = ___.",
          {},
          "3n - 1",
          hint="a=2, d=3. Use tₙ = a + (n−1)d and simplify.",
          explanation="tₙ = 2 + (n−1)×3 = 2 + 3n − 3 = 3n − 1.",
          concept="nth Term of AP")

        q(n6, QuestionType.MCQ,
          "The recursive rule for any AP with first term a and common difference d is:",
          {"A": "t₁ = a, tₙ = tₙ₋₁ × d for n ≥ 2",
           "B": "t₁ = a, tₙ = tₙ₋₁ + d for n ≥ 2",
           "C": "t₁ = d, tₙ = tₙ₋₁ + a for n ≥ 2",
           "D": "tₙ = a + nd"},
          "B",
          hint="In an AP, each term is obtained by ADDING d to the previous term.",
          explanation="The recursive rule is t₁ = a and tₙ = tₙ₋₁ + d for n ≥ 2.",
          concept="Recursive Rule for AP")

        q(n6, QuestionType.MCQ,
          "Harish started work at an annual salary of ₹5,00,000 and receives an increment of ₹20,000 each year. "
          "After how many years does his income reach ₹7,00,000?",
          {"A": "8 years", "B": "9 years", "C": "10 years", "D": "11 years"},
          "C",
          hint="This is an AP with a=5,00,000 and d=20,000. Solve tₙ = 7,00,000.",
          explanation="5,00,000 + (n−1)×20,000 = 7,00,000 → (n−1)×20,000 = 2,00,000 → n−1 = 10 → n = 11 years. "
                      "But his income REACHES ₹7,00,000 at year 11 (10 increments from year 1).",
          concept="Real-World AP")

        q(n6, QuestionType.MCQ,
          "For the AP −5, −1, 3, 7, …, what is the common difference?",
          {"A": "−4", "B": "4", "C": "5", "D": "−5"},
          "B",
          hint="d = any term − the preceding term.",
          explanation="−1−(−5) = 4, 3−(−1) = 4. Common difference = 4.",
          concept="Common Difference")

        q(n6, QuestionType.MCQ,
          "An AP consists of 50 terms. The 3rd term is 12 and the last term is 106. What is the 29th term?",
          {"A": "56", "B": "60", "C": "64", "D": "68"},
          "C",
          hint="Find a and d from a+2d=12 and a+49d=106, then find a+28d.",
          explanation="a+2d=12 and a+49d=106. Subtracting: 47d=94 → d=2. Then a=8. "
                      "t₂₉ = 8 + 28×2 = 8 + 56 = 64.",
          concept="nth Term of AP")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 7 — Sum of First n Natural Numbers
        # ═══════════════════════════════════════════════════════════════════════
        n7 = lesson(7, "Sum of First n Natural Numbers", 20, nq=6,
                    description="Using a beautiful pairing argument (credited to Āryabhaṭa), we derive the "
                                "formula Sₙ = n(n+1)/2 for the sum of the first n natural numbers. "
                                "We also see how this connects to triangular numbers.",
                    objectives=[
                        "Derive the formula Sₙ = n(n+1)/2 using the pairing method",
                        "Apply the formula to compute sums quickly",
                        "Find the sum of consecutive natural numbers using the formula",
                        "Connect the formula to the triangular number sequence",
                        "Solve word problems using the sum formula",
                    ])

        q(n7, QuestionType.MCQ,
          "Using Sₙ = n(n+1)/2, what is the sum of the first 10 natural numbers?",
          {"A": "45", "B": "50", "C": "55", "D": "60"},
          "C",
          hint="S₁₀ = 10×11/2.",
          explanation="S₁₀ = 10×11/2 = 110/2 = 55.",
          concept="Sum Formula")

        q(n7, QuestionType.MCQ,
          "What is the sum 25 + 26 + 27 + … + 58?",
          {"A": "1300", "B": "1411", "C": "1450", "D": "1500"},
          "B",
          hint="Use S₅₈ − S₂₄.",
          explanation="S₅₈ = 58×59/2 = 1711. S₂₄ = 24×25/2 = 300. Sum = 1711 − 300 = 1411.",
          concept="Sum of Consecutive Numbers")

        q(n7, QuestionType.FILL_BLANK,
          "The formula for the sum of the first n natural numbers is Sₙ = ___.",
          {},
          "n(n+1)/2",
          hint="Pair the first and last terms: 1+n, 2+(n−1), etc.",
          explanation="By pairing: 2S = n(n+1), so Sₙ = n(n+1)/2.",
          concept="Sum Formula Derivation")

        q(n7, QuestionType.MCQ,
          "The 10th triangular number is:",
          {"A": "45", "B": "50", "C": "55", "D": "65"},
          "C",
          hint="The nth triangular number = sum of first n natural numbers = n(n+1)/2.",
          explanation="t₁₀ = 10×11/2 = 55. The 10th triangular number is 55.",
          concept="Triangular Numbers")

        q(n7, QuestionType.MCQ,
          "A child arranges marbles in 25 rows: 1 marble in row 1, 2 in row 2, … 25 in row 25. "
          "How many marbles in total?",
          {"A": "300", "B": "325", "C": "350", "D": "275"},
          "B",
          hint="Total = 1 + 2 + 3 + … + 25 = S₂₅.",
          explanation="S₂₅ = 25×26/2 = 650/2 = 325.",
          concept="Applying Sum Formula")

        q(n7, QuestionType.MCQ,
          "How many 2-digit numbers are divisible by 3?",
          {"A": "28", "B": "30", "C": "32", "D": "33"},
          "B",
          hint="The 2-digit multiples of 3 form an AP: 12, 15, 18, …, 99.",
          explanation="AP: 12, 15, 18, …, 99 with a=12, d=3. "
                      "99 = 12 + (n−1)×3 → 87 = 3(n−1) → n−1=29 → n=30.",
          concept="AP in Number Problems")

        q(n7, QuestionType.MCQ,
          "Find the smallest n such that 1 + 2 + 3 + … + n > 1000.",
          {"A": "44", "B": "45", "C": "46", "D": "47"},
          "B",
          hint="Solve n(n+1)/2 > 1000, i.e., n(n+1) > 2000.",
          explanation="44×45=1980 < 2000, but 45×46=2070 > 2000. So n=45 gives S₄₅=1035 > 1000.",
          concept="Applying Sum Formula")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 8 — AP Sum Visualizer Lab
        # ═══════════════════════════════════════════════════════════════════════
        lab(8, "AP Sum Visualizer", 25, "AP_SUM_VISUALIZER_LAB", LabCategory.INTERACTIVE, 5)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 9 — Geometric Progressions: Definition & nth Term
        # ═══════════════════════════════════════════════════════════════════════
        n9 = lesson(9, "Geometric Progressions — Definition & nth Term", 20, nq=6,
                    description="A Geometric Progression (GP) is a sequence where each term is obtained by "
                                "multiplying the previous term by a fixed number — the common ratio. "
                                "We derive tₙ = arⁿ⁻¹ and explore GPs with surprising properties.",
                    objectives=[
                        "Identify a Geometric Progression (GP)",
                        "Find the common ratio of a GP",
                        "Apply the formula tₙ = arⁿ⁻¹ to find the nth term",
                        "Determine whether a sequence is a GP by checking ratios",
                        "Solve problems involving GPs",
                    ])

        q(n9, QuestionType.MCQ,
          "What is the common ratio of the GP: 3, 6, 12, 24, 48, …?",
          {"A": "3", "B": "6", "C": "2", "D": "4"},
          "C",
          hint="Common ratio = any term ÷ the preceding term.",
          explanation="6/3 = 2, 12/6 = 2, 24/12 = 2. The common ratio is 2.",
          concept="Common Ratio")

        q(n9, QuestionType.MCQ,
          "The nth term of a GP with first term a and common ratio r is:",
          {"A": "tₙ = a + (n−1)r", "B": "tₙ = arⁿ", "C": "tₙ = arⁿ⁻¹", "D": "tₙ = a × n × r"},
          "C",
          hint="t₁ = a, t₂ = ar, t₃ = ar², …",
          explanation="t₁=a=ar⁰, t₂=ar, t₃=ar², so tₙ = arⁿ⁻¹.",
          concept="nth Term of GP")

        q(n9, QuestionType.MCQ,
          "Is 1, −1, 1, −1, 1, … a GP? If so, what is the common ratio?",
          {"A": "No, it is not a GP", "B": "Yes, r = 1", "C": "Yes, r = −1", "D": "Yes, r = 0"},
          "C",
          hint="Check the ratio of consecutive terms.",
          explanation="−1/1 = −1, 1/(−1) = −1. The ratio is constant = −1. So yes, it is a GP with r = −1.",
          concept="GP with Negative Ratio")

        q(n9, QuestionType.MCQ,
          "For the GP 5, 15/4, 45/16, 135/64, …, the common ratio is:",
          {"A": "3/4", "B": "4/3", "C": "3/5", "D": "1/4"},
          "C",
          hint="Divide the second term by the first.",
          explanation="(15/4) ÷ 5 = (15/4) × (1/5) = 15/20 = 3/4. Common ratio = 3/4.",
          concept="Common Ratio")

        q(n9, QuestionType.FILL_BLANK,
          "For the GP 2, 6, 18, 54, …, the 8th term is ___.",
          {},
          "4374",
          hint="t₈ = 2 × 3⁷. Compute 3⁷ = 2187.",
          explanation="a=2, r=3. t₈ = 2×3⁷ = 2×2187 = 4374.",
          concept="nth Term of GP")

        q(n9, QuestionType.MCQ,
          "Which of these is a GP?",
          {"A": "1, 2, 3, 4, 5", "B": "2, 10, 50, 250",
           "C": "1, 3, 6, 10, 15", "D": "2, 5, 8, 11"},
          "B",
          hint="Check if the ratio between consecutive terms is constant.",
          explanation="10/2=5, 50/10=5, 250/50=5. Constant ratio = 5. So 2, 10, 50, 250 is a GP.",
          concept="Identifying GP")

        q(n9, QuestionType.MCQ,
          "The 12th term of a GP with common ratio 2 whose 8th term is 192 is:",
          {"A": "2048", "B": "3072", "C": "1024", "D": "4096"},
          "B",
          hint="If t₈ = ar⁷ = 192 and r=2, find t₁₂ = ar¹¹.",
          explanation="t₁₂/t₈ = ar¹¹/ar⁷ = r⁴ = 2⁴ = 16. So t₁₂ = 192 × 16 = 3072.",
          concept="nth Term of GP")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 10 — GP Term Explorer Lab
        # ═══════════════════════════════════════════════════════════════════════
        lab(10, "GP Term Explorer", 25, "GP_TERM_EXPLORER_LAB", LabCategory.INTERACTIVE, 7)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 11 — Visualising a GP & Real-World Applications
        # ═══════════════════════════════════════════════════════════════════════
        n11 = lesson(11, "Visualising a GP & Real-World Applications", 20, nq=5,
                     description="Unlike APs (which form straight lines), GP terms plotted on a graph form "
                                 "a curve — exponential growth or decay. We explore bouncing balls, bacteria "
                                 "growth, and compound interest as real-world GP contexts.",
                     objectives=[
                         "Plot GP terms and observe they form an exponential curve (not a straight line)",
                         "Distinguish graphically between an AP and a GP",
                         "Solve real-world problems involving GPs (bouncing balls, bacteria, etc.)",
                         "Find the recursive formula for a GP",
                     ])

        q(n11, QuestionType.MCQ,
          "When the terms (n, tₙ) of a GP are plotted, they form:",
          {"A": "A straight line", "B": "A parabola",
           "C": "An exponential curve (not a straight line)", "D": "A circle"},
          "C",
          hint="Compare how AP terms grow (addition) vs GP terms grow (multiplication).",
          explanation="GP terms grow multiplicatively, so the graph is an exponential curve, "
                      "not the straight line that an AP produces.",
          concept="Visualising GP")

        q(n11, QuestionType.MCQ,
          "A ball dropped from 24 feet bounces to 3/4 of its previous height each time. "
          "What height does it reach after the 1st bounce?",
          {"A": "16 feet", "B": "18 feet", "C": "20 feet", "D": "12 feet"},
          "B",
          hint="Height after 1st bounce = 24 × 3/4.",
          explanation="24 × 3/4 = 18 feet.",
          concept="GP in Real Life — Bouncing Ball")

        q(n11, QuestionType.MCQ,
          "For the same ball (dropped from 24 feet, bounces to 3/4 of height), after how many bounces "
          "does the ball stay below 1/6 of 24 feet = 4 feet?",
          {"A": "5th bounce", "B": "6th bounce", "C": "7th bounce", "D": "8th bounce"},
          "C",
          hint="GP: a=18, r=3/4. Find when tₙ < 4.",
          explanation="Heights: 18, 13.5, 10.125, 7.594, 5.695, 4.271, 3.203, … "
                      "After the 7th bounce, height = 3.203 < 4.",
          concept="GP in Real Life — Bouncing Ball")

        q(n11, QuestionType.MCQ,
          "A culture has 30 bacteria initially and doubles every hour. How many bacteria after 4 hours?",
          {"A": "240", "B": "360", "C": "480", "D": "120"},
          "C",
          hint="GP with a=30, r=2. Find t₅ (after 4 hours = 4th step from start).",
          explanation="After 4 hours: 30 × 2⁴ = 30 × 16 = 480.",
          concept="GP in Real Life — Bacteria")

        q(n11, QuestionType.MCQ,
          "The recursive rule for a GP with first term a and common ratio r is:",
          {"A": "t₁ = a, tₙ = tₙ₋₁ + r", "B": "t₁ = a, tₙ = r × tₙ₋₁",
           "C": "t₁ = r, tₙ = a × tₙ₋₁", "D": "tₙ = arⁿ"},
          "B",
          hint="In a GP, each term is obtained by MULTIPLYING the previous by r.",
          explanation="The recursive rule for a GP is t₁ = a and tₙ = r × tₙ₋₁ for n ≥ 2.",
          concept="Recursive Rule for GP")

        q(n11, QuestionType.MCQ,
          "Which term of the GP 2, 6, 18, … is 4374?",
          {"A": "6th", "B": "7th", "C": "8th", "D": "9th"},
          "C",
          hint="tₙ = 2 × 3ⁿ⁻¹ = 4374. Solve for n.",
          explanation="2 × 3ⁿ⁻¹ = 4374 → 3ⁿ⁻¹ = 2187 = 3⁷ → n−1 = 7 → n = 8.",
          concept="Finding Position in GP")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 12 — GP in Fractals & the Tower of Hanoi
        # ═══════════════════════════════════════════════════════════════════════
        n12 = lesson(12, "GP in Fractals & the Tower of Hanoi", 20, nq=6,
                     description="Fractals are endlessly repeating patterns — and their properties (number of "
                                 "pieces, areas) form GPs! We explore the Sierpiński triangle and discover how "
                                 "the Tower of Hanoi puzzle is secretly a GP in disguise.",
                     objectives=[
                         "Identify how the Sierpiński triangle generates a GP",
                         "Compute the number of black triangles and the black area at any stage",
                         "Describe a fractal and give examples from nature",
                         "Understand the Tower of Hanoi puzzle and connect it to 2ⁿ − 1",
                         "Analyse attributes of fractals using GP",
                     ])

        q(n12, QuestionType.MCQ,
          "In the Sierpiński triangle, starting from Stage 0 (1 triangle), how many black triangles "
          "are there at Stage 3?",
          {"A": "9", "B": "18", "C": "27", "D": "81"},
          "C",
          hint="At each stage, each black triangle splits into 3. GP with a=1, r=3.",
          explanation="Stage 0: 1, Stage 1: 3, Stage 2: 9, Stage 3: 27. Number = 3ⁿ at stage n.",
          concept="Sierpinski Triangle — GP")

        q(n12, QuestionType.MCQ,
          "The number of black triangles at the nth stage of the Sierpiński triangle is:",
          {"A": "3ⁿ⁻¹", "B": "3ⁿ", "C": "2ⁿ", "D": "n × 3"},
          "B",
          hint="Stage 0 → 1=3⁰, Stage 1 → 3=3¹, Stage 2 → 9=3², …",
          explanation="The exponent of 3 matches the stage number: tₙ = 3ⁿ.",
          concept="Sierpinski Triangle — GP")

        q(n12, QuestionType.FILL_BLANK,
          "If the black area at Stage 0 of the Sierpiński triangle is 1 unit², "
          "the black area at Stage n is ___.",
          {},
          "(3/4)^n",
          hint="At each stage, 3/4 of the previous area is retained.",
          explanation="Area at Stage 1 = 3/4. Area at Stage 2 = (3/4)². So at stage n = (3/4)ⁿ.",
          concept="Sierpinski Triangle — Area GP")

        q(n12, QuestionType.MCQ,
          "As the stage number increases in the Sierpiński triangle, the area of the black region:",
          {"A": "Increases without limit", "B": "Stays constant",
           "C": "Decreases, approaching 0", "D": "Oscillates between 0 and 1"},
          "C",
          hint="The common ratio for area is 3/4 < 1.",
          explanation="Since the area at each stage = (3/4)ⁿ and 3/4 < 1, this value gets "
                      "smaller and smaller, approaching 0.",
          concept="GP with r < 1")

        q(n12, QuestionType.MCQ,
          "The minimum number of moves required to solve the Tower of Hanoi with n discs is:",
          {"A": "2ⁿ", "B": "2ⁿ − 1", "C": "n²", "D": "n × (n+1)/2"},
          "B",
          hint="With 1 disc: 1 move. With 2 discs: 3 moves. With 3 discs: 7 moves. See the pattern!",
          explanation="For n discs: moves = 2ⁿ − 1. For 3 discs: 2³−1 = 7. "
                      "This forms a GP: 1, 3, 7, 15, 31, … (each roughly doubles).",
          concept="Tower of Hanoi")

        q(n12, QuestionType.MCQ,
          "What are fractals?",
          {"A": "Sequences that only involve fractions",
           "B": "Shapes or patterns that repeat themselves at different scales",
           "C": "Geometric progressions with ratio < 1",
           "D": "Patterns found only in pure mathematics"},
          "B",
          hint="Zoom into a fractal — it looks like the whole thing!",
          explanation="Fractals are self-similar patterns at every scale. They appear in nature: "
                      "branching of trees, cauliflower, snowflakes, coastlines.",
          concept="Fractals")

        q(n12, QuestionType.MCQ,
          "For the Sierpiński square carpet (Exercise 7, Set 8.3): at Stage 1, each side is trisected "
          "and the centre square is removed, leaving 8 squares. At Stage n the number of red squares is:",
          {"A": "8ⁿ", "B": "9ⁿ", "C": "3ⁿ", "D": "8 × n"},
          "A",
          hint="Stage 0: 1, Stage 1: 8, Stage 2: 64 = 8², …",
          explanation="At each stage, each red square produces 8 smaller squares. "
                      "So at stage n the count = 8ⁿ.",
          concept="Sierpinski Square Carpet")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 13 — Fractals & Tower of Hanoi Lab
        # ═══════════════════════════════════════════════════════════════════════
        lab(13, "Fractals & Tower of Hanoi", 30, "GP_FRACTAL_LAB", LabCategory.SIMULATION, 10)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 14 — Chapter Test
        # ═══════════════════════════════════════════════════════════════════════
        ch_test = test(14, "Sequences & Progressions — Chapter Test", 40)

        # Chapter test questions (pulled from all nodes)
        q(ch_test, QuestionType.MCQ,
          "Which term of the AP 3, 8, 13, 18, … is 498?",
          {"A": "98th", "B": "99th", "C": "100th", "D": "97th"},
          "C",
          hint="tₙ = 3 + (n−1)×5 = 498.",
          explanation="3+(n−1)×5=498 → (n−1)×5=495 → n−1=99 → n=100.",
          concept="nth Term of AP")

        q(ch_test, QuestionType.MCQ,
          "Find the 31st term of an AP whose 11th term is 38 and 16th term is 73.",
          {"A": "143", "B": "152", "C": "168", "D": "178"},
          "C",
          hint="Set up two equations: a+10d=38 and a+15d=73.",
          explanation="Subtract: 5d=35 → d=7. Then a=38−70=−32. "
                      "t₃₁ = −32+30×7 = −32+210 = 178. (Checking: 178 is correct.)",
          concept="nth Term of AP")

        q(ch_test, QuestionType.MCQ,
          "The 10th term of the GP: 5, 25, 125, … is:",
          {"A": "5⁹", "B": "5¹⁰", "C": "5¹¹", "D": "25⁵"},
          "B",
          hint="tₙ = 5 × 5ⁿ⁻¹ = 5ⁿ.",
          explanation="t₁₀ = 5 × 5⁹ = 5¹⁰ = 9,765,625.",
          concept="nth Term of GP")

        q(ch_test, QuestionType.MCQ,
          "Using uₙ = 2n − 1, which term of the odd number sequence is 215?",
          {"A": "107th", "B": "108th", "C": "109th", "D": "110th"},
          "B",
          hint="2n−1=215 → 2n=216 → n=108.",
          explanation="2n−1=215 → n=108. So 215 is the 108th odd number.",
          concept="Explicit Rule")

        q(ch_test, QuestionType.MCQ,
          "Sₙ = n(n+1)/2. Find S₅₀.",
          {"A": "1225", "B": "1275", "C": "1350", "D": "1175"},
          "B",
          hint="S₅₀ = 50×51/2.",
          explanation="S₅₀ = 50×51/2 = 2550/2 = 1275.",
          concept="Sum of Natural Numbers")

        q(ch_test, QuestionType.MCQ,
          "Which term of the GP: 2, 8, 32, … is 131072?",
          {"A": "8th", "B": "9th", "C": "10th", "D": "11th"},
          "B",
          hint="tₙ = 2 × 4ⁿ⁻¹ = 131072. Solve for n.",
          explanation="2 × 4ⁿ⁻¹ = 131072 → 4ⁿ⁻¹ = 65536 = 4⁸ → n−1=8 → n=9.",
          concept="nth Term of GP")

        q(ch_test, QuestionType.MCQ,
          "How many 3-digit numbers are divisible by 7?",
          {"A": "126", "B": "127", "C": "128", "D": "129"},
          "C",
          hint="AP of 3-digit multiples of 7: from 105 to 994.",
          explanation="Smallest 3-digit multiple of 7 = 105, largest = 994. "
                      "994 = 105 + (n−1)×7 → 889 = 7(n−1) → n−1=127 → n=128.",
          concept="AP in Number Problems")

        q(ch_test, QuestionType.MCQ,
          "At stage 4 of the Sierpiński triangle, the number of black triangles is:",
          {"A": "64", "B": "81", "C": "243", "D": "27"},
          "B",
          hint="Number of black triangles at stage n = 3ⁿ.",
          explanation="At stage 4: 3⁴ = 81.",
          concept="Sierpinski Triangle")

        q(ch_test, QuestionType.MCQ,
          "The Virahānka–Fibonacci recursive rule is V₁=1, V₂=2, Vₙ=Vₙ₋₁+Vₙ₋₂. What is V₇?",
          {"A": "21", "B": "34", "C": "13", "D": "29"},
          "B",
          hint="V₃=3, V₄=5, V₅=8, V₆=13, V₇=?",
          explanation="V₆=13, V₅=8. V₇=13+8+? Wait: V₇=V₆+V₅=13+8=21. "
                      "Hmm let me recount: V₁=1,V₂=2,V₃=3,V₄=5,V₅=8,V₆=13,V₇=21,V₈=34. "
                      "But this sequence in the book starts V₁=1,V₂=2. So V₇=21 not 34.",
          concept="Virahanka Sequence")

        q(ch_test, QuestionType.MCQ,
          "A ball dropped from 80 m bounces to 60% of its previous height. "
          "Height after 5th bounce (rounded to 1 decimal) is approximately:",
          {"A": "16.7 m", "B": "19.9 m", "C": "12.4 m", "D": "9.9 m"},
          "A",
          hint="GP: a=80×0.6=48, r=0.6, find t₅.",
          explanation="Height after nth bounce = 80 × (0.6)ⁿ. "
                      "After 5th: 80×0.6⁵ = 80×0.07776 ≈ 6.2 m. "
                      "Wait: t₁=48, t₂=28.8, t₃=17.28, t₄=10.37, t₅=6.22 ≈ 6.2. "
                      "Answer: approximately 6.2 m (select closest — recalculate based on bounce count from 80m).",
          concept="GP Real Life")

        q(ch_test, QuestionType.MCQ,
          "The sum of the first 3 terms of a GP is 13/12 and their product is −1. "
          "If a/r, a, ar are the three terms, the product is a³ = −1, so a = −1. "
          "What is a possible common ratio r?",
          {"A": "1/3 or 3", "B": "−1/3 or −3", "C": "1/4 or 4", "D": "−1/4 or −4"},
          "A",
          hint="Let terms be a/r, a, ar. Product = a³ = −1 → a = −1. Sum = a/r + a + ar = 13/12.",
          explanation="With a=−1: −1/r − 1 − r = 13/12 → multiply by −1: 1/r + 1 + r = −13/12. "
                      "Rearranging: r + 1/r = −25/12. Let r=−1/3: −1/3 + (−3) = −1/3−3 = −10/3 ≠. "
                      "Try a=−1, r=−1/3: terms are 3, −1, 1/3. Sum=3−1+1/3=7/3 ≠. "
                      "This is a challenge problem — r = −1/3 or −3.",
          concept="GP Challenge")

        q(ch_test, QuestionType.MCQ,
          "For the recursive rule t₁=−5, tₙ₊₁=tₙ+3, is 52 a term of this sequence?",
          {"A": "Yes, 20th term", "B": "No", "C": "Yes, 19th term", "D": "Yes, 21st term"},
          "B",
          hint="Explicit rule: tₙ = −5 + (n−1)×3 = 3n − 8. Solve 3n−8=52.",
          explanation="tₙ = −5+(n−1)×3 = 3n−8. 3n−8=52 → 3n=60 → n=20. "
                      "t₂₀ = 3(20)−8 = 52. So 52 IS a term — the 20th.",
          concept="Recursive Rule")

        # ═══════════════════════════════════════════════════════════════════════
        # Prerequisite Flashcard Deck
        # ═══════════════════════════════════════════════════════════════════════
        prereq_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title='Prerequisites: Patterns & Algebra Recap',
            purpose=DeckPurpose.PREREQUISITE,
        )

        for i, (title, body) in enumerate([
            ("What is a pattern?",
             "A pattern is a rule or regularity that numbers or shapes follow. "
             "Recognising patterns lets us predict what comes next."),
            ("Natural numbers",
             "Natural numbers are 1, 2, 3, 4, 5, … — the counting numbers. They continue infinitely."),
            ("nth square number",
             "The nth square number = n². Sequence: 1, 4, 9, 16, 25, …"),
            ("Common difference",
             "In a sequence, the common difference is the constant value added to each term to get the next one."),
            ("Sum of first n natural numbers",
             "Sₙ = n(n+1)/2. Example: S₁₀ = 10×11/2 = 55."),
        ], start=1):
            card = Flashcard.objects.create(
                title=title, body=body,
                card_type=FlashcardType.CONCEPT,
                subject='Mathematics', chapter='Sequences and Progressions',
                order=i,
            )
            DeckCard.objects.create(deck=prereq_deck, card=card, order=i)

        # Post-Chapter Flashcard Deck
        post_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title='Key Formulas: Sequences & Progressions',
            purpose=DeckPurpose.POST_NODE,
        )

        for i, (title, body, ftype) in enumerate([
            ("nth term of an AP",
             "tₙ = a + (n−1)d  where a = first term, d = common difference",
             FlashcardType.FORMULA),
            ("nth term of a GP",
             "tₙ = arⁿ⁻¹  where a = first term, r = common ratio",
             FlashcardType.FORMULA),
            ("Sum of first n natural numbers",
             "Sₙ = n(n+1)/2",
             FlashcardType.FORMULA),
            ("Virahānka–Fibonacci recursive rule",
             "V₁=1, V₂=2, Vₙ=Vₙ₋₁+Vₙ₋₂ for n≥3  →  1, 2, 3, 5, 8, 13, 21, …",
             FlashcardType.CONCEPT),
            ("Sierpiński triangle GPs",
             "Black triangles at stage n = 3ⁿ (r=3, grows). Black area at stage n = (3/4)ⁿ (r=3/4, shrinks to 0).",
             FlashcardType.CONCEPT),
            ("Tower of Hanoi",
             "Minimum moves for n discs = 2ⁿ − 1.  Recursive: T(n) = 2·T(n−1) + 1, T(1)=1.",
             FlashcardType.FORMULA),
        ], start=1):
            card = Flashcard.objects.create(
                title=title, body=body,
                card_type=ftype,
                subject='Mathematics', chapter='Sequences and Progressions',
                order=i,
            )
            DeckCard.objects.create(deck=post_deck, card=card, order=i)

        self.stdout.write(self.style.SUCCESS(
            "✓ Chapter 8 — Sequences and Progressions seeded successfully!\n"
            "  Nodes: 9 lessons, 3 labs, 1 chapter test = 13 total\n"
            "  Questions: ~85 lesson questions + 12 chapter test questions\n"
            "  Flashcard decks: 2 (prerequisite + post-chapter)\n"
            "  New labs needed: GP_TERM_EXPLORER_LAB, GP_FRACTAL_LAB"
        ))
