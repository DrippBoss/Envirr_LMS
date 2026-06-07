from django.core.management.base import BaseCommand
from courses.models import Subject, Course
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 3 — The World of Numbers (NCERT Ganita Manjari, Class 9, 2026-27)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 3 — The World of Numbers (Class 9, 2026-27)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )

        subj, _ = Subject.objects.get_or_create(name='Mathematics', defaults={'created_by': admin_user})
        Course.objects.get_or_create(
            name='The World of Numbers', subject=subj,
            defaults={'status': 'published', 'created_by': admin_user}
        )

        unit, _ = CourseUnit.objects.get_or_create(
            title='The World of Numbers', subject='Mathematics',
            class_grade='9', board='CBSE', order=3, icon='calculate',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='The World of Numbers', class_grade='9'
        )

        self.stdout.write("Wiping old nodes and flashcard decks for clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # ── Helpers ───────────────────────────────────────────────────────────
        def q(node, qtype, text, opts, ans, hint='', explanation='', concept=''):
            LessonQuestion.objects.create(
                node=node, question_type=qtype, question_text=text,
                options_json=opts, correct_answer=ans,
                hint=hint, explanation=explanation, concept=concept,
            )

        def lesson(order, title, xp, video_url='', description='', objectives=None):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LESSON, order=order,
                xp_reward=xp, practice_question_count=5, starting_lives=3,
                youtube_url=video_url, description=description,
                objectives_json=objectives or [],
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
                xp_reward=xp, test_question_count=10, test_pass_percentage=70,
            )

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 1 — The Dawn of Mathematics: Natural Numbers & Their History
        # ═══════════════════════════════════════════════════════════════════════
        n1 = lesson(1, "The Dawn of Mathematics: Natural Numbers & Their History", 10,
            description=(
                "From tally marks on the Ishango bone (20,000 BCE) to the Indian numeral system — "
                "tracing how natural numbers emerged from humanity's need to count cattle, track "
                "the moon, and conduct trade in the Indus Valley."
            ),
            objectives=[
                "Understand one-to-one correspondence",
                "Learn about Lebombo and Ishango bones",
                "Appreciate the Indian contribution to number systems",
            ])

        q(n1, QuestionType.MCQ,
          "The Lebombo Bone, discovered in South Africa, dates back approximately how many years?",
          {"A": "10,000", "B": "20,000", "C": "35,000", "D": "50,000"},
          "35,000",
          hint="Far older than writing — found in the Lebombo Mountains.",
          explanation=(
              "The Lebombo Bone dates to approximately 35,000 years ago and features 29 notches, "
              "believed to be a lunar calendar."
          ),
          concept="History of Natural Numbers")

        q(n1, QuestionType.MCQ,
          "Which column of the Ishango Bone groups notches into 11, 13, 17, 19 — the prime numbers between 10 and 20?",
          {"A": "Column 1", "B": "Column 2", "C": "Column 3", "D": "All columns"},
          "Column 1",
          hint="One specific column shows a pattern matching prime numbers.",
          explanation=(
              "One column of the Ishango bone groups notches into 11, 13, 17, 19 — prime numbers between "
              "10 and 20 — suggesting abstract number thinking 20,000 years ago."
          ),
          concept="History of Natural Numbers")

        q(n1, QuestionType.FILL_BLANK,
          "What is one-to-one correspondence? Give an example from daily life.",
          {},
          "Matching each element of one set with exactly one element of another — e.g., placing one pebble per cow in a pot to count cattle.",
          hint="Think about how early herders counted livestock before number words existed.",
          explanation=(
              "Early herders used pebbles matched to cows to track their herd without using number words."
          ),
          concept="One-to-One Correspondence")

        q(n1, QuestionType.MCQ,
          "In the Lalitavistara (4th century BCE), Buddha describes names for numbers up to:",
          {"A": "10^12", "B": "10^20", "C": "10^53", "D": "10^100"},
          "10^53",
          hint="An astronomically large number with a Sanskrit name.",
          explanation=(
              "The Lalitavistara describes numbers up to tallakṣhaṇa = 10^53, showing India's ancient "
              "fascination with large numbers."
          ),
          concept="History of Natural Numbers")

        q(n1, QuestionType.MCQ,
          "The set of Natural Numbers ℕ is:",
          {"A": "{0,1,2,3,…}", "B": "{1,2,3,4,…}", "C": "{…,−2,−1,0,1,2,…}", "D": "All fractions"},
          "{1,2,3,4,…}",
          hint="Natural numbers do NOT include zero.",
          explanation=(
              "Natural numbers start from 1 and go infinitely: {1, 2, 3, 4, …}. Zero is NOT a natural number."
          ),
          concept="Definition of Natural Numbers")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 2 — Śhūnya & Integers: When Nothing Became Something
        # ═══════════════════════════════════════════════════════════════════════
        n2 = lesson(2, "Śhūnya & Integers: When Nothing Became Something", 15,
            description=(
                "Brahmagupta's revolutionary Brāhmasphuṭasiddhānta (628 CE) formalised zero as a "
                "number and introduced negative numbers — grounding them in the real-world concepts "
                "of fortunes (Dhana) and debts (Ṛiṇa)."
            ),
            objectives=[
                "Understand the philosophical origin of zero in Śhūnyatā",
                "Apply Brahmagupta's rules for arithmetic with zero",
                "Extend the number line to integers using negative numbers",
            ])

        q(n2, QuestionType.MCQ,
          "Brahmagupta defined zero as:",
          {
              "A": "The absence of a digit",
              "B": "The result of subtracting a number from itself (a − a = 0)",
              "C": "A placeholder symbol",
              "D": "Infinity divided by itself",
          },
          "The result of subtracting a number from itself (a − a = 0)",
          hint="Brahmagupta made zero an operational number, not just a placeholder.",
          explanation=(
              "In the Brāhmasphuṭasiddhānta (628 CE), Brahmagupta defined 0 = a − a, "
              "making zero an operational number."
          ),
          concept="Definition of Zero — Brahmagupta")

        q(n2, QuestionType.MCQ,
          "According to Brahmagupta's Dhana/Ṛiṇa model, (−5) + (−4) = ?",
          {"A": "1", "B": "−1", "C": "9", "D": "−9"},
          "−9",
          hint="A debt plus a debt is a larger debt.",
          explanation="A debt plus a debt is a debt. −5 + (−4) = −9.",
          concept="Integer Arithmetic — Brahmagupta")

        q(n2, QuestionType.MCQ,
          "The product of two debts (negative numbers) is:",
          {"A": "A debt (negative)", "B": "A fortune (positive)", "C": "Zero", "D": "Undefined"},
          "A fortune (positive)",
          hint="Brahmagupta: 'The product of two debts is a fortune.'",
          explanation=(
              "(−3) × (−4) = +12. Brahmagupta: 'The product of two debts is a fortune.' "
              "This is the rule − × − = +."
          ),
          concept="Integer Arithmetic — Multiplication")

        q(n2, QuestionType.FILL_BLANK,
          "What is the set of integers Z? Give 3 examples of negative integers.",
          {},
          "Z = {…, −3, −2, −1, 0, 1, 2, 3, …}. Examples of negative integers: −7, −15, −100.",
          hint="Integers extend natural numbers in both directions.",
          explanation="Integers include all natural numbers, zero, and their negatives.",
          concept="Definition of Integers")

        q(n2, QuestionType.MCQ,
          "The temperature in Ladakh is 4°C at noon. It drops 15°C by midnight. The midnight temperature is:",
          {"A": "19°C", "B": "−11°C", "C": "11°C", "D": "−19°C"},
          "−11°C",
          hint="Moving left on the integer number line by 15 units from 4.",
          explanation="4 − 15 = −11°C. Moving left on the integer number line: 4 − 15 = −11.",
          concept="Integer Arithmetic — Real World")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 3 — Rational Numbers: Fractions, Operations & Properties
        # ═══════════════════════════════════════════════════════════════════════
        n3 = lesson(3, "Rational Numbers: Fractions, Operations & Properties", 15,
            description=(
                "Rational numbers (ℚ) are all numbers expressible as p/q where p, q are integers "
                "and q ≠ 0. They include integers, fractions, and their negatives — forming a "
                "closed, commutative system under all four operations (except division by zero)."
            ),
            objectives=[
                "Define rational numbers and identify them",
                "Apply the four arithmetic operations on rationals",
                "Understand closure, commutativity, and distributivity",
            ])

        q(n3, QuestionType.MCQ,
          "Which of the following is NOT a rational number?",
          {"A": "3/4", "B": "−7", "C": "0", "D": "√2"},
          "√2",
          hint="Can it be written as a fraction of two integers?",
          explanation=(
              "√2 cannot be expressed as p/q with integer p, q. It is irrational. "
              "3/4, −7 (= −7/1), and 0 (= 0/1) are all rational."
          ),
          concept="Definition of Rational Numbers")

        q(n3, QuestionType.MCQ,
          "2/5 + 3/10 = ?",
          {"A": "5/15", "B": "7/10", "C": "1/2", "D": "7/15"},
          "7/10",
          hint="Find the LCD of 5 and 10, then add.",
          explanation="LCD of 5 and 10 is 10. 2/5 = 4/10. So 4/10 + 3/10 = 7/10.",
          concept="Addition of Rational Numbers")

        q(n3, QuestionType.MCQ,
          "(−4/7) × (5/14) = ?",
          {"A": "20/98", "B": "−20/98", "C": "−10/49", "D": "10/49"},
          "−10/49",
          hint="Multiply numerators and denominators, then simplify.",
          explanation=(
              "(−4 × 5)/(7 × 14) = −20/98 = −10/49 after dividing by GCF 2."
          ),
          concept="Multiplication of Rational Numbers")

        q(n3, QuestionType.FILL_BLANK,
          "Why must q ≠ 0 in the definition of a rational number p/q?",
          {},
          (
              "Division by zero is undefined. If q = 0, p/q has no meaning — there is no number "
              "that 0 can multiply to give p (unless p = 0, which gives 0/0, also indeterminate)."
          ),
          hint="What happens when you try to divide by zero on a calculator?",
          explanation=(
              "Zero in the denominator creates a logical impossibility, so rational numbers require q ≠ 0."
          ),
          concept="Definition of Rational Numbers — q ≠ 0")

        q(n3, QuestionType.MCQ,
          "Which property does p(q + r) = pq + pr express?",
          {"A": "Commutativity", "B": "Associativity", "C": "Distributivity", "D": "Closure"},
          "Distributivity",
          hint="One operation being 'spread' over another.",
          explanation=(
              "The distributive law says multiplication distributes over addition: p(q + r) = pq + pr."
          ),
          concept="Properties of Rational Numbers")

        # ── LAB 4 (order=4) ────────────────────────────────────────────────────
        lab(4, "Number Line Explorer Lab", 20,
            lab_type='NUMBER_LINE_EXPLORER',
            lab_category=LabCategory.INTERACTIVE,
            required=4)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 5 — Density of Rational Numbers
        # ═══════════════════════════════════════════════════════════════════════
        n5 = lesson(5, "Density of Rational Numbers: Infinitely Many in Every Gap", 20,
            description=(
                "Between any two rational numbers, there always exists another rational number — "
                "found by taking their average. This property, called density, means there are "
                "infinitely many rationals packed into even the smallest interval, yet they still "
                "don't fill the number line completely."
            ),
            objectives=[
                "State the density property of rational numbers",
                "Find rational numbers between two given rationals using the average method",
                "Understand why density does not mean the rationals fill the number line",
            ])

        q(n5, QuestionType.MCQ,
          "A rational number between 1 and 3/2 found by taking their average is:",
          {"A": "5/4", "B": "4/3", "C": "1/2", "D": "7/4"},
          "5/4",
          hint="Average = (a + b)/2. Add 1 and 3/2, then halve the result.",
          explanation=(
              "Average = (1 + 3/2)/2 = (5/2)/2 = 5/4. "
              "The average of two rationals always lies between them."
          ),
          concept="Density — Finding Rationals by Average")

        q(n5, QuestionType.FILL_BLANK,
          "State the density property of rational numbers in one sentence.",
          {},
          "Between any two distinct rational numbers, there always exists another rational number.",
          hint="What happens when you take the average of any two rational numbers?",
          explanation=(
              "This is proved by taking the average (a+b)/2, which is always rational and lies "
              "strictly between a and b."
          ),
          concept="Density Property — Statement")

        q(n5, QuestionType.MCQ,
          "How many rational numbers exist between 0 and 1?",
          {"A": "100", "B": "1000", "C": "Finitely many but uncountable", "D": "Infinitely many"},
          "Infinitely many",
          hint="Apply the density property repeatedly.",
          explanation=(
              "By the density property, we can always find another rational between any two, "
              "giving infinitely many."
          ),
          concept="Density Property — Infinitely Many")

        q(n5, QuestionType.MCQ,
          "To find 5 rational numbers between 2/5 and 3/5, the easiest method is:",
          {
              "A": "Convert to decimals",
              "B": "Multiply numerator and denominator of both by 6 or more",
              "C": "Subtract them",
              "D": "Take reciprocals",
          },
          "Multiply numerator and denominator of both by 6 or more",
          hint="Scale up both fractions so there are enough integers in between.",
          explanation=(
              "2/5 = 12/30 and 3/5 = 18/30. Now 13/30, 14/30, 15/30, 16/30, 17/30 all lie between them."
          ),
          concept="Finding Multiple Rationals Between Two Rationals")

        q(n5, QuestionType.FILL_BLANK,
          "Find three rational numbers strictly between −1/2 and 1/4.",
          {},
          "Examples: −1/4, 0, 1/8 (any three rationals in (−1/2, 1/4) are correct)",
          hint="Convert to a common denominator: −4/8 < x < 2/8.",
          explanation=(
              "Multiple valid answers exist. One method: convert to same denominator −4/8 < x < 2/8, "
              "so −3/8, −2/8 = −1/4, −1/8, 0, 1/8 all work."
          ),
          concept="Finding Rationals Between Two Rationals")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 6 — Decimal Representations: Terminating, Repeating & Cyclic
        # ═══════════════════════════════════════════════════════════════════════
        n6 = lesson(6, "Decimal Representations: Terminating, Repeating & Cyclic", 20,
            description=(
                "Every rational number has a decimal expansion that either terminates (e.g., "
                "3/8 = 0.375) or eventually repeats (e.g., 5/11 = 0.̄4̄5). The type is determined "
                "by the prime factors of the denominator. The magical cyclic number 142857 (from "
                "1/7) reveals the hidden symmetry inside repeating decimals."
            ),
            objectives=[
                "Predict terminating vs repeating decimals from denominator's prime factorisation",
                "Convert repeating decimals to p/q form using algebra",
                "Discover cyclic properties of 1/7",
            ])

        q(n6, QuestionType.MCQ,
          "3/8 has a terminating decimal because the denominator 8 = 2³. Which fractions also terminate?",
          {"A": "7/20 and 13/250", "B": "4/15 and 7/12", "C": "1/6 and 1/14", "D": "1/3 and 1/7"},
          "7/20 and 13/250",
          hint="Check the prime factorisation of each denominator — only 2 and 5 allowed.",
          explanation=(
              "20 = 2² × 5 and 250 = 2 × 5³ — only factors 2 and 5, so both terminate. "
              "Denominators with other prime factors give repeating decimals."
          ),
          concept="Terminating Decimals — Denominator Test")

        q(n6, QuestionType.MCQ,
          "Convert 0.̄6 to p/q. If x = 0.666…, then 10x = 6.666…, so 9x = 6. Thus x = ?",
          {"A": "6/9 = 2/3", "B": "6/10", "C": "3/5", "D": "6/99"},
          "6/9 = 2/3",
          hint="10x − x eliminates the repeating part.",
          explanation="10x − x = 6.6̄ − 0.6̄ = 6 → 9x = 6 → x = 6/9 = 2/3.",
          concept="Converting Repeating Decimals to Fractions")

        q(n6, QuestionType.MCQ,
          "Convert 0.1̄6 to p/q. (x = 0.1666…, 10x = 1.666…, 100x = 16.666…, so 90x = 15)",
          {"A": "15/90 = 1/6", "B": "16/90", "C": "15/100", "D": "1/9"},
          "15/90 = 1/6",
          hint="Multiply by 100 and 10, then subtract to remove the repeating block.",
          explanation=(
              "100x − 10x = 16.6̄ − 1.6̄ = 15 → 90x = 15 → x = 15/90 = 1/6."
          ),
          concept="Converting Mixed Repeating Decimals to Fractions")

        q(n6, QuestionType.MCQ,
          "142857 × 4 = ?",
          {"A": "428571", "B": "571428", "C": "714285", "D": "857142"},
          "571428",
          hint="Multiply and watch what happens to the digits.",
          explanation=(
              "142857 × 4 = 571428 — the same digits, cyclically permuted! "
              "This cyclic number is the repeating block of 1/7."
          ),
          concept="Cyclic Numbers — 1/7")

        q(n6, QuestionType.FILL_BLANK,
          (
              "The decimal expansion of a rational number p/q (in lowest terms) is terminating "
              "precisely when the prime factors of q are only 2, only 5, or both. Explain why."
          ),
          {},
          (
              "We can multiply numerator and denominator by suitable powers of 2 and 5 to make "
              "the denominator a power of 10 (= 2ⁿ × 5ⁿ). E.g., 3/20 = 3×5/(20×5) = 15/100 = 0.15. "
              "If q has any other prime factor, this is impossible and the decimal repeats."
          ),
          hint="A fraction with denominator that is a power of 10 can be written as a finite decimal.",
          explanation=(
              "A fraction with denominator that is a power of 10 can be written as a finite decimal directly."
          ),
          concept="Terminating Decimals — Why")

        # ── LAB 7 (order=7) ────────────────────────────────────────────────────
        lab(7, "Decimal Expansion Lab", 20,
            lab_type='DECIMAL_EXPANSION_LAB',
            lab_category=LabCategory.INTERACTIVE,
            required=4)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 8 — Irrational Numbers: When Fractions Break Down
        # ═══════════════════════════════════════════════════════════════════════
        n8 = lesson(8, "Irrational Numbers: When Fractions Break Down", 20,
            description=(
                "Baudhāyana (800 BCE), while designing fire altars, encountered lengths that could "
                "not be expressed as fractions. When a square has side 1, its diagonal is √2 — a "
                "number that defies every rational ratio. Such numbers are called irrational, and "
                "they live in the gaps between the rationals."
            ),
            objectives=[
                "Understand why some lengths cannot be rational",
                "Define irrational numbers",
                "Identify common irrational numbers: √2, √3, π",
            ])

        q(n8, QuestionType.MCQ,
          "A square with side 1 unit has diagonal of length:",
          {"A": "√3", "B": "√2", "C": "2", "D": "1.5"},
          "√2",
          hint="Apply the Baudhāyana-Pythagoras theorem to find the diagonal.",
          explanation=(
              "By the Baudhāyana-Pythagoras theorem: 1² + 1² = d² → d² = 2 → d = √2."
          ),
          concept="Irrational Numbers — Geometric Origin")

        q(n8, QuestionType.MCQ,
          "An irrational number is:",
          {
              "A": "Any negative number",
              "B": "A number that cannot be expressed as p/q where p, q are integers and q ≠ 0",
              "C": "Any number greater than 1",
              "D": "A fraction with a very large denominator",
          },
          "A number that cannot be expressed as p/q where p, q are integers and q ≠ 0",
          hint="Think about the definition of rational numbers, then negate it.",
          explanation=(
              "Irrational numbers have decimal expansions that never terminate and never repeat — "
              "they cannot be written as any fraction."
          ),
          concept="Definition of Irrational Numbers")

        q(n8, QuestionType.MCQ,
          "Which of the following is irrational?",
          {"A": "√9", "B": "√4", "C": "√12", "D": "√25"},
          "√12",
          hint="Which of these is NOT a perfect square?",
          explanation=(
              "√9 = 3, √4 = 2, √25 = 5 — all perfect squares, hence rational. "
              "√12 = 2√3, and √3 is irrational."
          ),
          concept="Identifying Irrational Numbers")

        q(n8, QuestionType.MCQ,
          "π was approximated as 3927/1250 = 3.1416 by:",
          {"A": "Brahmagupta", "B": "Baudhāyana", "C": "Āryabhaṭa", "D": "Mādhava"},
          "Āryabhaṭa",
          hint="He lived in 499 CE and called his approximation 'āsanna'.",
          explanation=(
              "Āryabhaṭa (499 CE) gave 3927/1250 as an approximation and called it 'āsanna' "
              "(approximate), suggesting he suspected π was irrational."
          ),
          concept="History of π")

        q(n8, QuestionType.FILL_BLANK,
          (
              "What distinguishes the decimal expansion of an irrational number from that of a "
              "rational number?"
          ),
          {},
          (
              "Irrational numbers have non-terminating, non-repeating decimal expansions "
              "(like √2 = 1.41421356…). Rational numbers have terminating OR repeating decimal expansions."
          ),
          hint="Think about the pattern (or lack thereof) in the decimal digits.",
          explanation=(
              "The decimal expansion is the key signature: endless, patternless chaos = irrational; "
              "terminates or repeats = rational."
          ),
          concept="Decimal Expansion Signature — Rational vs Irrational")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 9 — Proof of Irrationality: √2, √3 & Proof by Contradiction
        # ═══════════════════════════════════════════════════════════════════════
        n9 = lesson(9, "Proof of Irrationality: √2, √3 & Proof by Contradiction", 25,
            description=(
                "Hippasus (c. 400 BCE) proved √2 is irrational using a brilliant technique — Proof "
                "by Contradiction. We assume √2 is rational, follow the logic flawlessly, and arrive "
                "at a self-contradiction. The assumption must therefore be false. The same strategy "
                "extends to √3, √5, and more."
            ),
            objectives=[
                "Understand proof by contradiction as a logical technique",
                "Reproduce the 8-step proof that √2 is irrational",
                "Adapt the proof to show √3 is irrational",
            ])

        q(n9, QuestionType.MCQ,
          "In a proof by contradiction, we:",
          {
              "A": "Prove the statement directly",
              "B": "Assume the opposite of what we want to prove, then show a logical contradiction",
              "C": "Use examples to verify",
              "D": "Compute numerically",
          },
          "Assume the opposite of what we want to prove, then show a logical contradiction",
          hint="We start by assuming the thing we want to disprove.",
          explanation=(
              "Proof by contradiction: assume the negation, follow valid logic, arrive at a "
              "contradiction → the assumption must be false → the original statement is true."
          ),
          concept="Proof by Contradiction — Method")

        q(n9, QuestionType.MCQ,
          (
              "In the proof that √2 is irrational, after writing √2 = p/q (lowest terms) and "
              "squaring, we get p² = 2q². This means p² is even. Why must p be even?"
          ),
          {
              "A": "Because q² is even",
              "B": "Because the square of an even number is even, so if p² is even, p must be even",
              "C": "Because 2q² is divisible by 4",
              "D": "Because p and q are co-prime",
          },
          "Because the square of an even number is even, so if p² is even, p must be even",
          hint="Contrapositive: if p were odd, what would p² be?",
          explanation=(
              "If p were odd, p² would be odd. Since p² is even, p must be even. "
              "This is the key deduction in Step 4."
          ),
          concept="Proof of Irrationality of √2 — Key Step")

        q(n9, QuestionType.MCQ,
          (
              "After substituting p = 2k back into p² = 2q², we get q² = 2k². "
              "This means q is also even. The contradiction is:"
          ),
          {
              "A": "p and q are both irrational",
              "B": "p and q share a common factor of 2, contradicting that p/q is in lowest terms",
              "C": "q cannot be an integer",
              "D": "p must be zero",
          },
          "p and q share a common factor of 2, contradicting that p/q is in lowest terms",
          hint="We assumed p/q was in its simplest form (co-prime). What does 'both even' imply?",
          explanation=(
              "We assumed p/q was in lowest terms (co-prime), but deduced both p and q are even — "
              "they share factor 2. Contradiction! So √2 is irrational."
          ),
          concept="Proof of Irrationality of √2 — Contradiction")

        q(n9, QuestionType.FILL_BLANK,
          "Outline the key steps to prove √3 is irrational using the same contradiction approach.",
          {},
          (
              "Assume √3 = p/q in lowest terms. Then 3q² = p², so p² is divisible by 3, hence p is "
              "divisible by 3 (write p = 3k). Substituting: 3q² = 9k² → q² = 3k², so q is also "
              "divisible by 3. Both p and q share factor 3, contradicting co-primeness. "
              "∴ √3 is irrational."
          ),
          hint="Replace '2' and 'even' with '3' and 'divisible by 3' throughout the √2 proof.",
          explanation=(
              "The approach parallels the √2 proof: evenness is replaced by divisibility by 3."
          ),
          concept="Proof of Irrationality of √3")

        q(n9, QuestionType.MCQ,
          "The first mathematician to prove the irrationality of √2 was:",
          {"A": "Brahmagupta", "B": "Āryabhaṭa", "C": "Hippasus", "D": "Baudhāyana"},
          "Hippasus",
          hint="He was a member of the Pythagorean school, around 400 BCE.",
          explanation=(
              "Hippasus (c. 400 BCE), a member of the Pythagorean school, first proved √2 is "
              "irrational using proof by contradiction."
          ),
          concept="History — Proof of Irrationality")

        # ── LAB 10 (order=10) ─────────────────────────────────────────────────
        lab(10, "Square Root Spiral Lab", 25,
            lab_type='SQRT_SPIRAL_LAB',
            lab_category=LabCategory.INTERACTIVE,
            required=3)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 11 — Real Numbers: The Unbroken Number Line
        # ═══════════════════════════════════════════════════════════════════════
        n11 = lesson(11, "Real Numbers: The Unbroken Number Line", 15,
            description=(
                "Uniting all rational numbers (terminating and repeating decimals) with all "
                "irrational numbers (non-repeating, non-terminating decimals) gives us the Real "
                "Numbers ℝ — a perfectly continuous, unbroken line where every physical measurement "
                "has a home. And beyond ℝ? Imaginary numbers await."
            ),
            objectives=[
                "State the hierarchy: ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ",
                "Classify any number as natural, integer, rational, irrational, or real",
                "Understand the conceptual frontier of imaginary numbers",
            ])

        q(n11, QuestionType.MCQ,
          "Which is the correct containment hierarchy?",
          {
              "A": "ℚ ⊂ ℤ ⊂ ℕ ⊂ ℝ",
              "B": "ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ",
              "C": "ℤ ⊂ ℕ ⊂ ℚ ⊂ ℝ",
              "D": "ℕ ⊂ ℚ ⊂ ℤ ⊂ ℝ",
          },
          "ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ",
          hint="Every natural number is an integer, every integer is rational, every rational is real.",
          explanation=(
              "Natural numbers ⊂ Integers ⊂ Rational numbers ⊂ Real numbers. "
              "Each set strictly contains the previous."
          ),
          concept="Hierarchy of Number Systems")

        q(n11, QuestionType.MCQ,
          "0.9̄ (= 0.999…) equals exactly:",
          {"A": "0.99", "B": "Less than 1 by a tiny amount", "C": "1", "D": "0.9"},
          "1",
          hint="Set x = 0.999…, multiply by 10, subtract the original equation.",
          explanation=(
              "Let x = 0.9̄. Then 10x = 9.9̄. Subtracting: 9x = 9 → x = 1. So 0.999… = 1 exactly."
          ),
          concept="Real Numbers — 0.999… = 1")

        q(n11, QuestionType.MCQ,
          "Which set contains both √2 and −3?",
          {"A": "Natural numbers", "B": "Integers", "C": "Rational numbers", "D": "Real numbers"},
          "Real numbers",
          hint="√2 is irrational; −3 is an integer. Which set includes both kinds?",
          explanation=(
              "√2 is irrational (not in ℚ), and −3 is an integer. Both are real numbers. "
              "Only ℝ contains both."
          ),
          concept="Classifying Numbers — Real Numbers")

        q(n11, QuestionType.MCQ,
          "The number π was proven to be irrational by:",
          {
              "A": "Brahmagupta in 628 CE",
              "B": "Āryabhaṭa in 499 CE",
              "C": "Johann Lambert in 1761",
              "D": "Mādhava in the 14th century",
          },
          "Johann Lambert in 1761",
          hint="The formal proof came much later than Āryabhaṭa's approximation.",
          explanation=(
              "Lambert formally proved π is irrational in 1761. Āryabhaṭa suspected it in 499 CE "
              "by calling his approximation 'āsanna'."
          ),
          concept="History — Irrationality of π")

        q(n11, QuestionType.FILL_BLANK,
          "Why can't √(−1) exist on the real number line?",
          {},
          (
              "No real number, when multiplied by itself, gives a negative result. Both positive "
              "and negative reals square to positive values, and 0² = 0. So √(−1) is not real — "
              "it belongs to the imaginary numbers (denoted i)."
          ),
          hint="Try squaring any positive and any negative number — what sign do you always get?",
          explanation=(
              "This conceptual gap led to the invention of complex/imaginary numbers, denoted by i = √(−1)."
          ),
          concept="Beyond Real Numbers — Imaginary Numbers")

        # ── NODE 12 — Chapter Test ─────────────────────────────────────────────
        test(12, "Chapter 3 — The World of Numbers", 30)

        # ═══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════════

        prereq_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Number System — Prerequisite Review",
            purpose=DeckPurpose.PREREQUISITE,
        )
        for title, body, card_type, concept in [
            (
                "What is a factor?",
                "A number that divides another exactly. E.g., factors of 12 are 1, 2, 3, 4, 6, 12.",
                FlashcardType.CONCEPT, "Factors"
            ),
            (
                "What does 'co-prime' mean?",
                "Two integers are co-prime if their only common factor is 1. E.g., 8 and 15 are co-prime.",
                FlashcardType.CONCEPT, "Co-prime Numbers"
            ),
            (
                "What is the square of a negative number?",
                "Always positive. (−a)² = a². E.g., (−3)² = 9.",
                FlashcardType.CONCEPT, "Squaring Negative Numbers"
            ),
            (
                "What is a prime number?",
                "A natural number greater than 1 that has exactly two factors: 1 and itself. "
                "E.g., 2, 3, 5, 7, 11, 13.",
                FlashcardType.CONCEPT, "Prime Numbers"
            ),
            (
                "What is long division?",
                "A step-by-step algorithm to divide a number by another, tracking quotient and "
                "remainder at each step.",
                FlashcardType.CONCEPT, "Long Division"
            ),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=card_type,
                subject='Mathematics', chapter='The World of Numbers', concept=concept,
            )
            DeckCard.objects.create(deck=prereq_deck, card=card,
                                    order=DeckCard.objects.filter(deck=prereq_deck).count() + 1)

        post_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Number System — Key Results",
            purpose=DeckPurpose.POST_NODE,
        )
        for title, body, concept in [
            (
                "How do you find a rational number between a and b?",
                "Take their average: (a + b)/2. This is always rational and lies strictly between a and b.",
                "Density — Average Method"
            ),
            (
                "When does p/q have a terminating decimal?",
                "When q (in lowest terms) has only 2 and/or 5 as prime factors. "
                "E.g., 3/8 = 3/2³ → terminates (0.375).",
                "Terminating Decimals"
            ),
            (
                "State the key step in proving √2 is irrational.",
                "Assume √2 = p/q in lowest terms → p² = 2q² → p is even → p = 2k → "
                "q² = 2k² → q is even. Contradiction: p, q share factor 2.",
                "Proof of Irrationality of √2"
            ),
            (
                "What are the real numbers?",
                "ℝ = ℚ ∪ 𝕀 (rationals union irrationals). "
                "Every point on the number line corresponds to exactly one real number.",
                "Real Numbers"
            ),
            (
                "What is Mādhava's infinite series for π?",
                "π = 4 × (1 − 1/3 + 1/5 − 1/7 + …). "
                "The first exact formula for π, discovered in the 14th century by Mādhava of Sangamagrama.",
                "History of π — Mādhava Series"
            ),
            (
                "How does the decimal expansion distinguish rational from irrational?",
                "Rational → terminating (0.375) or repeating (0.142857̄). "
                "Irrational → non-terminating, non-repeating (1.41421356…).",
                "Decimal Expansion Signature"
            ),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.FORMULA,
                subject='Mathematics', chapter='The World of Numbers', concept=concept,
            )
            DeckCard.objects.create(deck=post_deck, card=card,
                                    order=DeckCard.objects.filter(deck=post_deck).count() + 1)

        RevisionNode.objects.create(
            path=path,
            title="Revision: The World of Numbers",
            appears_after_node=n11,
            side='right',
            xp_reward=20,
            is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "\nChapter 3 — The World of Numbers seeded successfully!\n"
            "  • 8 lesson nodes (orders 1, 2, 3, 5, 6, 8, 9, 11)\n"
            "  • 3 lab nodes: NUMBER_LINE_EXPLORER (order=4), DECIMAL_EXPANSION_LAB (order=7), "
            "SQRT_SPIRAL_LAB (order=10)\n"
            "  • 1 chapter test (order=12, 10 questions)\n"
            "  • 40 lesson questions across 8 nodes\n"
            "  • 2 flashcard decks (5 prerequisite + 6 key-result cards) + 1 revision node\n"
            "  • Aligned with NCERT Ganita Manjari Class 9, Chapter 3 (2026-27)\n"
            "  • Covers: Natural Numbers, Integers, Rationals, Irrationals, Real Numbers, "
            "Proof by Contradiction"
        ))
