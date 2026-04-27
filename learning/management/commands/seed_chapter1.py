import random
from django.core.management.base import BaseCommand
from courses.models import Subject, Course
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType,
    QuestionType, FlashcardType, DeckPurpose
)

class Command(BaseCommand):
    help = 'Seeds Chapter 1 — Real Numbers with full syllabus coverage'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 1 — Real Numbers...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )

        subj, _ = Subject.objects.get_or_create(name='Mathematics', defaults={'created_by': admin_user})
        course, _ = Course.objects.get_or_create(
            name='Real Numbers', subject=subj,
            defaults={'status': 'published', 'created_by': admin_user}
        )

        unit, _ = CourseUnit.objects.get_or_create(
            title='Number Systems', subject='Mathematics',
            class_grade='10', board='CBSE', order=1, icon='numbers',
            defaults={'is_published': True}
        )

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Real Numbers', class_grade='10'
        )

        self.stdout.write("Wiping old nodes and flashcards for clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # ── Nodes ──────────────────────────────────────────────────────────────
        nodes_data = [
            {
                "title": "Introduction to Real Numbers",
                "xp": 10, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=2rE_N0_Dpr8",
                "description": "Learn how natural numbers, integers, rationals, and irrationals fit together on the number line. This lesson lays the foundation for the entire chapter.",
                "objectives": [
                    "Classify numbers as natural, whole, integer, rational, or irrational",
                    "Understand the real number line and its completeness",
                    "Identify terminating vs non-terminating decimals",
                    "Distinguish between rational and irrational numbers",
                ],
            },
            {
                "title": "Euclid's Division Algorithm & HCF",
                "xp": 15, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=cIw2sADGbwA",
                "description": "Master Euclid's Division Lemma and the systematic algorithm for finding HCF of any two positive integers — step by step.",
                "objectives": [
                    "State and apply Euclid's Division Lemma",
                    "Execute the Euclidean algorithm step-by-step",
                    "Identify co-prime numbers",
                    "Solve HCF word problems",
                ],
            },
            {
                "title": "LCM & Real-Life Applications",
                "xp": 15, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=1xNmcEIT4iM",
                "description": "Understand LCM through prime factorization and the HCF-LCM product relationship. Apply both to real-life problems.",
                "objectives": [
                    "Find LCM using prime factorization",
                    "Apply the HCF × LCM = Product formula",
                    "Solve real-life problems involving HCF and LCM",
                ],
            },
            {
                "title": "Fundamental Theorem of Arithmetic",
                "xp": 20, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=XKb0yE_2m7o",
                "description": "Every composite number has a unique prime factorization. Learn this powerful theorem and use it to solve HCF, LCM, and divisibility problems.",
                "objectives": [
                    "State the Fundamental Theorem of Arithmetic",
                    "Express any composite number as a unique product of primes",
                    "Use prime factorization to find HCF and LCM efficiently",
                    "Understand and apply the uniqueness of prime factorization",
                ],
            },
            {
                "title": "Irrational Numbers — Identify & Classify",
                "xp": 20, "type": NodeType.LESSON,
                "video_url": "https://www.youtube.com/watch?v=H74tqiawD8o",
                "description": "Explore irrational numbers — what makes them irrational, how to identify them, and the rules for operations between rationals and irrationals.",
                "objectives": [
                    "Define irrational numbers and give examples",
                    "Identify irrational numbers from a mixed list",
                    "Apply rules for sums, products, and quotients of rationals and irrationals",
                    "Recognise common misconceptions (e.g. 22/7 is not π)",
                ],
            },
            {
                "title": "Proving Irrationality",
                "xp": 25, "type": NodeType.LESSON,
                "video_url": "",
                "description": "Learn the proof by contradiction technique and apply it to prove that √2, √3, √5, and composite expressions like 3+2√5 are irrational.",
                "objectives": [
                    "Understand proof by contradiction",
                    "Prove algebraically that √2 is irrational",
                    "Prove algebraically that √3 and √5 are irrational",
                    "Prove that composite irrationals like 3+2√5 are irrational",
                ],
            },
            {
                "title": "Chapter 1 — Real Numbers Final Test",
                "xp": 50, "type": NodeType.CHAPTER_TEST,
                "video_url": "", "description": "", "objectives": [],
            },
        ]

        nodes = []
        for idx, nd in enumerate(nodes_data, start=1):
            is_test = nd['type'] == NodeType.CHAPTER_TEST
            n = LearningNode.objects.create(
                path=path,
                title=nd['title'],
                node_type=nd['type'],
                order=idx,
                xp_reward=nd['xp'],
                practice_question_count=5 if not is_test else 0,
                test_question_count=10 if is_test else 0,
                youtube_url=nd.get('video_url', ''),
                description=nd.get('description', ''),
                objectives_json=nd.get('objectives', []),
            )
            nodes.append(n)

        # ── Questions ──────────────────────────────────────────────────────────
        # Helper to create a question
        def q(node, qtype, text, opts, ans, hint='', explanation='', concept=''):
            LessonQuestion.objects.create(
                node=node, question_type=qtype, question_text=text,
                options_json=opts, correct_answer=ans,
                hint=hint, explanation=explanation, concept=concept,
            )

        # ── Node 1: Introduction to Real Numbers — 5 MCQ ──────────────────────
        n1 = nodes[0]
        q(n1, QuestionType.MCQ,
          "Which of the following is NOT a rational number?",
          {"A": "1/2", "B": "√2", "C": "0", "D": "-5"}, "√2",
          hint="Rational numbers can be expressed as p/q where q ≠ 0.")
        q(n1, QuestionType.MCQ,
          "Every integer is a...",
          {"A": "Whole number", "B": "Rational number", "C": "Natural number", "D": "Irrational number"}, "Rational number",
          hint="Can any integer x be written as x/1?")
        q(n1, QuestionType.MCQ,
          "The sum of a rational and an irrational number is always:",
          {"A": "Rational", "B": "Irrational", "C": "Integer", "D": "Zero"}, "Irrational",
          hint="Try adding 1/2 + √2 and see if the result terminates or repeats.")
        q(n1, QuestionType.MCQ,
          "What is the decimal expansion of 1/3?",
          {"A": "Terminating", "B": "Non-terminating repeating", "C": "Non-terminating non-repeating", "D": "None"}, "Non-terminating repeating",
          hint="1 ÷ 3 = 0.3333… — the digit 3 repeats forever.")
        q(n1, QuestionType.MCQ,
          "Is π (pi) rational or irrational?",
          {"A": "Rational", "B": "Irrational", "C": "Integer", "D": "Both"}, "Irrational",
          hint="π = 3.14159265… it neither terminates nor repeats.")

        # ── Node 2: Euclid's Division Algorithm & HCF — 3 MCQ + 2 FILL_BLANK ──
        n2 = nodes[1]
        q(n2, QuestionType.MCQ,
          "If HCF(a, b) = 1, then a and b are called:",
          {"A": "Prime", "B": "Co-prime", "C": "Composite", "D": "Even"}, "Co-prime",
          hint="They share no common factor other than 1.")
        q(n2, QuestionType.MCQ,
          "By Euclid's lemma: a = bq + r. We stop the algorithm when:",
          {"A": "q = 0", "B": "r = 0", "C": "r = b", "D": "a = b"}, "r = 0",
          hint="The HCF is the last non-zero divisor.")
        q(n2, QuestionType.MCQ,
          "HCF of two consecutive integers is always:",
          {"A": "0", "B": "1", "C": "2", "D": "Depends on the numbers"}, "1",
          hint="Try HCF(7, 8) or HCF(14, 15).")
        q(n2, QuestionType.FILL_BLANK,
          "Using Euclid's algorithm — first step: 225 = 135 × 1 + ___",
          {"tip": "Compute 225 − 135 × 1"}, "90",
          hint="225 minus 135 is the remainder.", concept="Euclid Algorithm Step")
        q(n2, QuestionType.FILL_BLANK,
          "Second step: 135 = 90 × 1 + ___",
          {"tip": "Compute 135 − 90 × 1"}, "45",
          hint="Continue dividing: 135 minus 90.", concept="Euclid Algorithm Step")

        # ── Node 3: LCM & Real-Life Applications — 5 MCQ ─────────────────────
        n3 = nodes[2]
        q(n3, QuestionType.MCQ,
          "For any two positive integers a and b: HCF(a, b) × LCM(a, b) =",
          {"A": "a + b", "B": "a − b", "C": "a × b", "D": "a / b"}, "a × b",
          hint="This is the product formula — memorise it.")
        q(n3, QuestionType.MCQ,
          "If HCF(26, 91) = 13, then LCM(26, 91) is:",
          {"A": "13", "B": "182", "C": "2366", "D": "14"}, "182",
          hint="LCM = (26 × 91) / 13 = 2366 / 13.")
        q(n3, QuestionType.MCQ,
          "Three bells ring at intervals of 6, 8, and 12 minutes. After how many minutes will all three ring together?",
          {"A": "12", "B": "16", "C": "24", "D": "48"}, "24",
          hint="Find LCM(6, 8, 12). 6=2×3, 8=2³, 12=2²×3. LCM = 2³×3.")
        q(n3, QuestionType.MCQ,
          "What is the largest square tile (in metres) that can exactly tile a floor 18m × 24m without cutting?",
          {"A": "2", "B": "3", "C": "6", "D": "9"}, "6",
          hint="Find HCF(18, 24) — the largest common divisor.")
        q(n3, QuestionType.MCQ,
          "If one number is a multiple of another, their LCM is:",
          {"A": "The smaller number", "B": "The larger number", "C": "Their product", "D": "1"}, "The larger number",
          hint="Try LCM(3, 9). Since 9 is a multiple of 3, LCM = 9.")

        # ── Node 4: Fundamental Theorem of Arithmetic — 3 MCQ + 2 FILL_BLANK ──
        n4 = nodes[3]
        q(n4, QuestionType.MCQ,
          "The Fundamental Theorem of Arithmetic applies to:",
          {"A": "Prime numbers only", "B": "Composite numbers", "C": "Fractions", "D": "Negative integers"}, "Composite numbers",
          hint="It says every ___ number can be uniquely expressed as a product of primes.")
        q(n4, QuestionType.MCQ,
          "Can any number ending in 0 have a prime factorization without both 2 and 5?",
          {"A": "Yes", "B": "No", "C": "Only if it ends in 00", "D": "Sometimes"}, "No",
          hint="A number ending in 0 is divisible by 10 = 2 × 5.")
        q(n4, QuestionType.MCQ,
          "The number 6ⁿ (for any positive integer n) can never end in the digit:",
          {"A": "2", "B": "4", "C": "6", "D": "0"}, "0",
          hint="6¹=6, 6²=36, 6³=216 — the last digit is always 6. It would need a factor of 5 to end in 0.")
        q(n4, QuestionType.FILL_BLANK,
          "Complete the prime factorization: 1260 = 2² × 3² × 5 × ___",
          {"tip": "Divide 1260 by 2²×3²×5 = 180 to find the missing prime."}, "7",
          hint="1260 ÷ 180 = 7.", concept="Prime Factorization")
        q(n4, QuestionType.FILL_BLANK,
          "The Fundamental Theorem of Arithmetic states that the prime factorization of every composite number is ___.",
          {"tip": "This is the key property that makes the theorem powerful."}, "unique",
          hint="No matter how you factor a composite number, you always get the same primes.", concept="FTA Uniqueness")

        # ── Node 5: Irrational Numbers — 3 MCQ + 1 MULTI_SELECT + 1 FILL_BLANK ─
        n5 = nodes[4]
        q(n5, QuestionType.MCQ,
          "The product of a non-zero rational number and an irrational number is:",
          {"A": "Always rational", "B": "Always irrational", "C": "Sometimes rational", "D": "Always zero"}, "Always irrational",
          hint="Try 2 × √3 = 2√3 — can this ever be written as p/q?")
        q(n5, QuestionType.MCQ,
          "2 + √3 is:",
          {"A": "Rational", "B": "Irrational", "C": "An integer", "D": "A natural number"}, "Irrational",
          hint="Rational + irrational = irrational (always).")
        q(n5, QuestionType.MCQ,
          "22/7 and π — which statement is true?",
          {"A": "They are equal", "B": "22/7 is an approximation of π, but π is irrational", "C": "Both are irrational", "D": "Both are rational"}, "22/7 is an approximation of π, but π is irrational",
          hint="22/7 = 3.142857… (repeating) is rational. π = 3.14159… (non-repeating) is irrational.")
        # MULTI_SELECT — select all irrationals from a list of 8
        q(n5, QuestionType.MULTI_SELECT,
          "From the numbers below, select ALL that are irrational:",
          {"choices": [
              {"id": 1, "text": "√2"},
              {"id": 2, "text": "3/4"},
              {"id": 3, "text": "√3"},
              {"id": 4, "text": "0.75"},
              {"id": 5, "text": "π"},
              {"id": 6, "text": "22/7"},
              {"id": 7, "text": "√5"},
              {"id": 8, "text": "1.5"},
          ]},
          "1,3,5,7",
          hint="Remember: 22/7 is a rational approximation of π, not π itself.",
          explanation="√2, √3, √5 are irrational (roots of primes). π is irrational. 3/4, 0.75, 22/7, and 1.5 are all rational.",
          concept="Identifying Irrationals")
        q(n5, QuestionType.FILL_BLANK,
          "The sum of a rational number and an irrational number is always ___.",
          {"tip": "Think about what happens to the non-terminating, non-repeating part."}, "irrational",
          hint="The irrational part cannot be cancelled by a rational number.", concept="Operations with Irrationals")

        # ── Node 6: Proving Irrationality — 2 MCQ + 3 PROOF_PUZZLE ───────────
        n6 = nodes[5]
        q(n6, QuestionType.MCQ,
          "In the proof that √2 is irrational, after showing a² = 2b² we conclude 2 divides a. Why?",
          {"A": "Because a is even", "B": "By the Fundamental Theorem of Arithmetic — if p divides a², p divides a for any prime p", "C": "Because b is odd", "D": "Because a² > b²"}, "By the Fundamental Theorem of Arithmetic — if p divides a², p divides a for any prime p",
          hint="This key lemma (if prime p divides a², then p divides a) is the engine of all irrationality proofs.",
          concept="Irrationality Proof Key Lemma")
        q(n6, QuestionType.MCQ,
          "To prove 3 + 2√5 is irrational, we assume it equals a rational r. What is √5 expressed as?",
          {"A": "(r + 3) / 2", "B": "(r − 3) / 2", "C": "r − 3", "D": "2r − 3"}, "(r − 3) / 2",
          hint="Rearrange: 3 + 2√5 = r → 2√5 = r − 3 → √5 = (r − 3)/2.",
          concept="Composite Irrational Proof")

        # PROOF_PUZZLE 1 — Prove √2 is irrational (7 steps, shuffled in options_json)
        puzzle1_steps_ordered = [
            {"id": 1, "text": "Assume √2 = a/b where a, b are integers with HCF(a, b) = 1"},
            {"id": 2, "text": "Squaring both sides: 2 = a²/b², so a² = 2b²"},
            {"id": 3, "text": "Since 2 divides a², by FTA, 2 must divide a"},
            {"id": 4, "text": "Let a = 2c for some integer c"},
            {"id": 5, "text": "Substituting: (2c)² = 2b²  →  4c² = 2b²  →  b² = 2c²"},
            {"id": 6, "text": "Since 2 divides b², 2 must divide b"},
            {"id": 7, "text": "Both a and b are divisible by 2 — contradicts HCF(a, b) = 1. ∴ √2 is irrational ∎"},
        ]
        shuffled1 = [puzzle1_steps_ordered[i] for i in [3, 0, 5, 1, 6, 2, 4]]  # display order
        q(n6, QuestionType.PROOF_PUZZLE,
          "Arrange these steps in the correct logical order to prove that √2 is irrational:",
          {"steps": shuffled1}, "1,2,3,4,5,6,7",
          hint="Start with the assumption, then square both sides.",
          explanation="This is proof by contradiction. Assuming √2 is rational leads to both a and b being even, contradicting HCF(a,b)=1.",
          concept="Proof: √2 is Irrational")

        # PROOF_PUZZLE 2 — Prove √3 is irrational (6 steps, shuffled)
        puzzle2_steps_ordered = [
            {"id": 1, "text": "Assume √3 = a/b where a, b are integers with HCF(a, b) = 1"},
            {"id": 2, "text": "Squaring: 3b² = a², so 3 divides a²"},
            {"id": 3, "text": "By FTA, since 3 divides a², 3 divides a. Let a = 3c"},
            {"id": 4, "text": "Substituting: 9c² = 3b²  →  b² = 3c², so 3 divides b"},
            {"id": 5, "text": "Both a and b are divisible by 3 — contradicts HCF(a, b) = 1"},
            {"id": 6, "text": "Therefore √3 is irrational ∎"},
        ]
        shuffled2 = [puzzle2_steps_ordered[i] for i in [2, 5, 0, 4, 1, 3]]
        q(n6, QuestionType.PROOF_PUZZLE,
          "Arrange these steps in the correct logical order to prove that √3 is irrational:",
          {"steps": shuffled2}, "1,2,3,4,5,6",
          hint="The structure mirrors the √2 proof — same contradiction technique.",
          explanation="The proof works for any prime p: assuming √p = a/b leads to p dividing both a and b.",
          concept="Proof: √3 is Irrational")

        # PROOF_PUZZLE 3 — Prove 3 + 2√5 is irrational (5 steps, shuffled)
        puzzle3_steps_ordered = [
            {"id": 1, "text": "Assume 3 + 2√5 is rational — call it r (where r = p/q in lowest terms)"},
            {"id": 2, "text": "Rearranging: 2√5 = r − 3"},
            {"id": 3, "text": "Therefore √5 = (r − 3) / 2"},
            {"id": 4, "text": "Since r is rational, (r − 3)/2 is also rational — so √5 would be rational"},
            {"id": 5, "text": "But √5 is irrational — this is a contradiction. ∴ 3 + 2√5 is irrational ∎"},
        ]
        shuffled3 = [puzzle3_steps_ordered[i] for i in [2, 0, 4, 1, 3]]
        q(n6, QuestionType.PROOF_PUZZLE,
          "Arrange these steps to prove that 3 + 2√5 is irrational:",
          {"steps": shuffled3}, "1,2,3,4,5",
          hint="Assume it is rational, then isolate √5 and reach a contradiction.",
          explanation="For any expression a + b√p (a,b rational, p prime), assume it is rational r, isolate √p = (r-a)/b, show this is rational — contradiction.",
          concept="Proof: Composite Irrational")

        # ── Chapter Test — 4 MCQ + 2 FILL_BLANK + 2 PROOF_PUZZLE + 2 MULTI_SELECT
        nt = nodes[6]

        # MCQ (4)
        q(nt, QuestionType.MCQ,
          "HCF of 36 and 84 is:",
          {"A": "4", "B": "6", "C": "12", "D": "18"}, "12",
          hint="36=2²×3², 84=2²×3×7. Take lowest powers of common primes: 2²×3=12.")
        q(nt, QuestionType.MCQ,
          "LCM of 12, 15, and 20 is:",
          {"A": "30", "B": "60", "C": "120", "D": "180"}, "60",
          hint="12=2²×3, 15=3×5, 20=2²×5. LCM = 2²×3×5 = 60.")
        q(nt, QuestionType.MCQ,
          "If HCF(a, b) = 12 and a × b = 1800, then LCM(a, b) is:",
          {"A": "120", "B": "150", "C": "1800", "D": "21600"}, "150",
          hint="LCM = a×b / HCF = 1800 / 12 = 150.")
        q(nt, QuestionType.MCQ,
          "The number 6ⁿ can NEVER end in the digit:",
          {"A": "2", "B": "6", "C": "0", "D": "4"}, "0",
          hint="6¹=6, 6²=36, 6³=216 — last digit always 6. A factor of 5 is needed to produce 0.")

        # FILL_BLANK (2)
        q(nt, QuestionType.FILL_BLANK,
          "If p/q (in lowest terms) has denominator of the form 2ᵐ × 5ⁿ only, its decimal expansion is ___.",
          {"tip": "Think about what denominators allow exact division in base 10."}, "terminating",
          hint="Only factors of 2 and 5 divide powers of 10 cleanly.",
          concept="Decimal Expansion Rule")
        q(nt, QuestionType.FILL_BLANK,
          "Complete: 3825 = 3² × 5² × ___",
          {"tip": "Divide 3825 by 3²×5² = 225 to find the last prime."}, "17",
          hint="3825 ÷ 225 = 17.", concept="Prime Factorization")

        # PROOF_PUZZLE 1 — Prove √5 is irrational (4 steps)
        tp1_ordered = [
            {"id": 1, "text": "Assume √5 = a/b with HCF(a, b) = 1"},
            {"id": 2, "text": "Then 5b² = a², so 5 divides a. Let a = 5c"},
            {"id": 3, "text": "Substituting: 25c² = 5b²  →  b² = 5c², so 5 divides b"},
            {"id": 4, "text": "5 divides both a and b — contradicts HCF(a, b) = 1. ∴ √5 is irrational ∎"},
        ]
        q(nt, QuestionType.PROOF_PUZZLE,
          "Arrange these four steps to prove that √5 is irrational:",
          {"steps": [tp1_ordered[i] for i in [2, 0, 3, 1]]}, "1,2,3,4",
          hint="Assume rational, square both sides, find the contradiction.",
          concept="Proof: √5 is Irrational")

        # PROOF_PUZZLE 2 — Prove 5 − √3 is irrational (5 steps)
        tp2_ordered = [
            {"id": 1, "text": "Assume 5 − √3 is rational — call it r"},
            {"id": 2, "text": "Rearranging: −√3 = r − 5, so √3 = 5 − r"},
            {"id": 3, "text": "Since r is rational, 5 − r is also rational"},
            {"id": 4, "text": "This means √3 is rational"},
            {"id": 5, "text": "But √3 is irrational — contradiction. ∴ 5 − √3 is irrational ∎"},
        ]
        q(nt, QuestionType.PROOF_PUZZLE,
          "Arrange these five steps to prove that 5 − √3 is irrational:",
          {"steps": [tp2_ordered[i] for i in [3, 0, 4, 2, 1]]}, "1,2,3,4,5",
          hint="Isolate √3 and show it would have to be rational — contradiction.",
          concept="Proof: Composite Irrational")

        # MULTI_SELECT 1 — select all rational numbers (tests classification + √4 = 2 insight)
        q(nt, QuestionType.MULTI_SELECT,
          "Select ALL numbers from the list that are rational:",
          {"choices": [
              {"id": 1, "text": "√4"},
              {"id": 2, "text": "√7"},
              {"id": 3, "text": "0.142857142857…"},
              {"id": 4, "text": "√11"},
              {"id": 5, "text": "3.14"},
              {"id": 6, "text": "π"},
              {"id": 7, "text": "22/7"},
              {"id": 8, "text": "√2 × √8"},
          ]},
          "1,3,5,7,8",
          hint="√4=2 (rational). 0.142857…=1/7 (repeating, rational). 3.14 terminates. √2×√8=√16=4.",
          explanation="√4=2, 0.142857…=1/7, 3.14, 22/7 are rational. √2×√8=4 is rational. √7, √11, π are irrational.",
          concept="Rational vs Irrational Classification")

        # MULTI_SELECT 2 — terminating decimal test (key application of FTA + decimal rule)
        q(nt, QuestionType.MULTI_SELECT,
          "Select ALL fractions whose decimal expansion terminates:",
          {"choices": [
              {"id": 1, "text": "3/8"},
              {"id": 2, "text": "1/6"},
              {"id": 3, "text": "7/20"},
              {"id": 4, "text": "5/12"},
              {"id": 5, "text": "11/25"},
              {"id": 6, "text": "4/7"},
              {"id": 7, "text": "17/8"},
              {"id": 8, "text": "2/15"},
          ]},
          "1,3,5,7",
          hint="Check if the denominator (in lowest terms) has only 2 and/or 5 as prime factors.",
          explanation="3/8: 8=2³ ✓ | 1/6: 6=2×3 ✗ | 7/20: 20=2²×5 ✓ | 5/12: 12=2²×3 ✗ | 11/25: 25=5² ✓ | 4/7: 7 ✗ | 17/8: 8=2³ ✓ | 2/15: 15=3×5 ✗",
          concept="Terminating Decimal Rule")

        # ── Revision Node ──────────────────────────────────────────────────────
        rev_node = RevisionNode.objects.create(
            path=path,
            title="Real Numbers Revision ✨",
            appears_after_node=nodes[5],
            side=random.choice(['left', 'right']),
            xp_reward=20,
            is_mandatory=False
        )

        # ── Flashcard Decks ────────────────────────────────────────────────────
        pre_deck = FlashcardDeck.objects.create(
            title="Chapter 1 Prerequisites", purpose=DeckPurpose.PREREQUISITE, course_unit=unit
        )
        for card_data in [
            ("What is a Prime Number?",
             "A prime number is a natural number greater than 1 that has no positive divisors other than 1 and itself. Examples: 2, 3, 5, 7, 11, 13. Note: 2 is the only even prime.",
             "Prime Numbers"),
            ("Rational vs Irrational Numbers",
             "Rational numbers can be written as p/q (q ≠ 0). Decimals either terminate (0.75) or repeat (0.333…). Irrational numbers cannot be written as fractions — like √2 = 1.41421356…",
             "Rational/Irrational"),
            ("Divisibility Rules",
             "By 2 → last digit even | By 3 → digit sum divisible by 3 | By 5 → ends in 0 or 5 | By 9 → digit sum divisible by 9 | By 11 → alternating digit-sum difference is 0 or divisible by 11.",
             "Divisibility Rules"),
            ("HCF and LCM Basics",
             "HCF: largest number dividing both without remainder. LCM: smallest number both divide into. Key identity: HCF(a,b) × LCM(a,b) = a × b.",
             "HCF LCM"),
            ("Proof by Contradiction",
             "Assume the opposite of what you want to prove. Show this assumption leads to an impossibility (contradiction). Conclude the original statement must be true. Used to prove irrationality of √2, √3, √5.",
             "Proof Technique"),
        ]:
            fc = Flashcard.objects.create(
                title=card_data[0], body=card_data[1],
                card_type=FlashcardType.CONCEPT,
                subject="Mathematics", chapter="Real Numbers", concept=card_data[2]
            )
            DeckCard.objects.create(deck=pre_deck, card=fc)

        post_deck = FlashcardDeck.objects.create(
            title="Real Numbers Review", purpose=DeckPurpose.POST_NODE, learning_node=nodes[0]
        )
        for card_data in [
            ("Real Number Hierarchy",
             "Natural ⊂ Whole ⊂ Integers ⊂ Rational ⊂ Real. Irrational numbers fill the gaps between rationals on the number line. Together, rationals + irrationals = Real Numbers.",
             FlashcardType.SUMMARY, "Number Classification"),
            ("Decimal Expansion Rule",
             "If p/q (in lowest terms) has denominator = 2ᵐ × 5ⁿ only, the decimal terminates. Otherwise it repeats. Example: 7/8 = 7/2³ terminates (0.875). 1/3 repeats (0.333…).",
             FlashcardType.SUMMARY, "Decimal Expansion"),
            ("The √2 Proof Sketch",
             "Assume √2 = a/b (lowest terms). Then a² = 2b² → 2 divides a → let a=2c → b²=2c² → 2 divides b. Both divisible by 2 contradicts HCF(a,b)=1. Same logic works for √3 and √5.",
             FlashcardType.SUMMARY, "Irrationality Proof"),
        ]:
            fc = Flashcard.objects.create(
                title=card_data[0], body=card_data[1],
                card_type=card_data[2],
                subject="Mathematics", chapter="Real Numbers", concept=card_data[3]
            )
            DeckCard.objects.create(deck=post_deck, card=fc)

        rev_deck = FlashcardDeck.objects.create(
            title="Revision Deck", purpose=DeckPurpose.SIDE_REVISION, revision_node=rev_node
        )
        for card_data in [
            ("FTA — Uniqueness",
             "Every composite number can be expressed as a product of primes in exactly one way (ignoring order). This uniqueness is what makes FTA powerful. Example: 1260 = 2²×3²×5×7 — always.",
             "Fundamental Theorem"),
            ("Proving Irrationality — Template",
             "To prove √p is irrational (p prime): (1) Assume √p = a/b, HCF=1. (2) Show p divides a². (3) By FTA, p divides a. (4) Let a=pc, substitute. (5) Show p divides b. (6) Contradiction.",
             "Irrationality Proof"),
            ("Composite Irrationals",
             "To prove a+b√p is irrational: assume it equals rational r, isolate √p = (r−a)/b. Since r,a,b are rational, (r−a)/b is rational — but √p is irrational. Contradiction.",
             "Composite Irrational"),
            ("HCF × LCM = Product",
             "For any two positive integers a and b: HCF(a,b) × LCM(a,b) = a × b. Example: HCF(12,18)=6, LCM=(12×18)/6=36.",
             "HCF LCM Relationship"),
            ("Operations with Irrationals",
             "Rational ± Rational = Rational | Rational ± Irrational = Irrational | Non-zero Rational × Irrational = Irrational | Irrational × Irrational = either (√2×√2=2 rational, √2×√3=√6 irrational).",
             "Irrational Operations"),
        ]:
            fc = Flashcard.objects.create(
                title=card_data[0], body=card_data[1],
                card_type=FlashcardType.CONCEPT,
                subject="Mathematics", chapter="Real Numbers", concept=card_data[2]
            )
            DeckCard.objects.create(deck=rev_deck, card=fc)

        self.stdout.write(self.style.SUCCESS("Chapter 1 seeded successfully! 7 nodes, mixed question types."))
