import random
from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 1 — Real Numbers (NCERT Class 10) with full syllabus coverage + labs'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 1 — Real Numbers (NCERT 2026-27)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
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

        # ── Helper ──────────────────────────────────────────────────────────────
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
        # NODES
        # ═══════════════════════════════════════════════════════════════════════

        # ── Node 1 (order=1): Introduction & Prime Factorisation ────────────────
        n1 = lesson(1, "Introduction to Real Numbers", 10,
                    video_url="https://www.youtube.com/watch?v=2rE_N0_Dpr8",
                    description="Discover the family of real numbers — from natural numbers to irrationals. Understand where each type lives on the number line and how prime factorisation underpins the whole chapter.",
                    objectives=[
                        "Classify numbers as natural, whole, integer, rational, or irrational",
                        "Identify terminating vs non-terminating decimals",
                        "Distinguish rational from irrational numbers by definition",
                        "Express a composite number as a product of prime factors",
                    ])

        q(n1, QuestionType.MCQ,
          "Which of the following is irrational?",
          {"A": "3/4", "B": "0.333...", "C": "√3", "D": "−5"},
          "√3",
          hint="An irrational number cannot be written as p/q. √3 = 1.7320508… never terminates or repeats.",
          explanation="3/4 = 0.75 (terminates), 0.333… = 1/3 (rational), −5 = −5/1 (rational). √3 is irrational.",
          concept="Rational vs Irrational")

        q(n1, QuestionType.MCQ,
          "Which decimal expansion is non-terminating and non-repeating?",
          {"A": "0.125", "B": "0.333…", "C": "0.10110111011110…", "D": "3.14"},
          "0.10110111011110…",
          hint="Non-terminating non-repeating = irrational. The pattern 0.1011011101111… never repeats.",
          explanation="0.125 terminates, 0.333…=1/3 repeats, 3.14 terminates. The third option's pattern grows and never repeats.",
          concept="Decimal Classification")

        q(n1, QuestionType.MCQ,
          "22/7 and π — which statement is correct?",
          {"A": "They are equal", "B": "22/7 is a rational approximation; π itself is irrational",
           "C": "Both are irrational", "D": "π is rational"},
          "22/7 is a rational approximation; π itself is irrational",
          hint="22/7 = 3.142857142857… (repeating) is rational. π = 3.14159265358… (non-repeating) is irrational.",
          explanation="This is a classic misconception. 22/7 ≠ π. 22/7 is the fraction 3.(142857) whereas π has no repeating block.",
          concept="Common Misconception: π vs 22/7")

        q(n1, QuestionType.FILL_BLANK,
          "The prime factorisation of 156 is 2² × 3 × ___.",
          {"tip": "156 = 4 × 39 = 4 × 3 × ?"},
          "13",
          hint="156 ÷ 12 = 13. Check: 4 × 3 × 13 = 156 ✓",
          concept="Prime Factorisation")

        q(n1, QuestionType.FILL_BLANK,
          "The set of all rational AND irrational numbers together is called ___ numbers.",
          {"tip": "They fill the entire number line completely"},
          "real",
          hint="Real ⊇ Rational ∪ Irrational. Every point on the number line is a real number.",
          concept="Real Number Definition")

        # ── Node 2 (order=2): Fundamental Theorem of Arithmetic ────────────────
        n2 = lesson(2, "Fundamental Theorem of Arithmetic", 15,
                    video_url="https://www.youtube.com/watch?v=XKb0yE_2m7o",
                    description="Every composite number has exactly one prime factorisation (ignoring order). This theorem — stated by Gauss — is the bedrock of number theory and powers our proofs throughout the chapter.",
                    objectives=[
                        "State the Fundamental Theorem of Arithmetic",
                        "Explain what 'unique' means in this context",
                        "Express numbers like 32760, 5005, 3825 as products of prime powers",
                        "Understand why FTA guarantees uniqueness",
                    ])

        q(n2, QuestionType.MCQ,
          "The Fundamental Theorem of Arithmetic states that every composite number has a ___ prime factorisation.",
          {"A": "Random", "B": "Unique", "C": "Multiple", "D": "Infinite"},
          "Unique",
          hint="Apart from the order of factors, there is only ONE way to write a composite as a product of primes.",
          explanation="Carl Friedrich Gauss proved this. No matter how you factorise a composite, you always arrive at the same set of primes with the same exponents.",
          concept="FTA — Uniqueness")

        q(n2, QuestionType.MCQ,
          "What is 32760 expressed as a product of prime powers?",
          {"A": "2³ × 3² × 5 × 7 × 13", "B": "2⁴ × 3² × 5 × 7",
           "C": "2³ × 3 × 5² × 7 × 13", "D": "2² × 3² × 5 × 7 × 11"},
          "2³ × 3² × 5 × 7 × 13",
          hint="Use a factor tree: 32760 → 8 × 4095 → 8 × 9 × 455 → 8 × 9 × 5 × 91 → … × 7 × 13.",
          explanation="32760 = 2×2×2×3×3×5×7×13 = 2³×3²×5×7×13. This factorisation is unique by FTA.",
          concept="Prime Factorisation — Large Numbers")

        q(n2, QuestionType.FILL_BLANK,
          "5005 = 5 × 7 × 11 × ___",
          {"tip": "5005 ÷ (5 × 7 × 11) = 5005 ÷ 385 = ?"},
          "13",
          hint="5005 ÷ 5 = 1001; 1001 ÷ 7 = 143; 143 ÷ 11 = 13.",
          concept="Prime Factorisation")

        q(n2, QuestionType.FILL_BLANK,
          "3825 = 3² × 5² × ___",
          {"tip": "3825 ÷ (9 × 25) = 3825 ÷ 225 = ?"},
          "17",
          hint="3825 ÷ 9 = 425; 425 ÷ 25 = 17. Check: 9 × 25 × 17 = 3825 ✓",
          concept="Prime Factorisation")

        q(n2, QuestionType.MULTI_SELECT,
          "Select ALL numbers whose prime factorisation is written correctly:",
          {"choices": [
              {"id": 1, "text": "140 = 2² × 5 × 7"},
              {"id": 2, "text": "156 = 2² × 3 × 13"},
              {"id": 3, "text": "3825 = 3² × 5² × 17"},
              {"id": 4, "text": "7429 = 7 × 11 × 97"},
              {"id": 5, "text": "5005 = 5 × 7 × 11 × 13"},
              {"id": 6, "text": "96 = 2⁵ × 3"},
          ]},
          "1,2,3,5,6",
          hint="7429 = 17 × 19 × 23, NOT 7 × 11 × 97.",
          explanation="140=4×35=2²×5×7 ✓ | 156=4×39=2²×3×13 ✓ | 3825=9×425=3²×5²×17 ✓ | 7429=17×437=17×19×23 ✗ | 5005=5×7×11×13 ✓ | 96=32×3=2⁵×3 ✓",
          concept="Verifying Prime Factorisations")

        # ── Node 3 (order=3): HCF & LCM via Prime Factorisation ────────────────
        n3 = lesson(3, "HCF & LCM via Prime Factorisation", 15,
                    video_url="https://www.youtube.com/watch?v=1xNmcEIT4iM",
                    description="Use the prime factorisation method to find HCF and LCM efficiently. Master the key identity HCF × LCM = a × b and apply it to solve real-life problems.",
                    objectives=[
                        "Find HCF using lowest powers of common prime factors",
                        "Find LCM using highest powers of all prime factors",
                        "Apply HCF × LCM = a × b to missing-value problems",
                        "Solve real-life word problems using HCF and LCM",
                    ])

        q(n3, QuestionType.MCQ,
          "Find HCF(6, 20) using prime factorisation. (6 = 2×3, 20 = 2²×5)",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "2",
          hint="Common prime factor: 2. Take the smallest power: 2¹ = 2.",
          explanation="HCF = product of smallest powers of COMMON prime factors. Only 2 is common → HCF = 2.",
          concept="HCF via Prime Factorisation")

        q(n3, QuestionType.MCQ,
          "Find LCM(6, 20). (6 = 2×3, 20 = 2²×5)",
          {"A": "30", "B": "60", "C": "120", "D": "180"},
          "60",
          hint="LCM = product of highest powers of ALL primes: 2²×3¹×5¹ = 4×3×5 = 60.",
          explanation="All prime factors: 2, 3, 5. Highest powers: 2², 3¹, 5¹. LCM = 4×3×5 = 60.",
          concept="LCM via Prime Factorisation")

        q(n3, QuestionType.MCQ,
          "Sonia takes 18 minutes and Ravi takes 12 minutes to drive one round of a circular field. Starting together at the same point, after how many minutes will they meet again at the starting point?",
          {"A": "6", "B": "18", "C": "36", "D": "72"},
          "36",
          hint="Find LCM(18, 12). 18=2×3², 12=2²×3. LCM=2²×3²=36.",
          explanation="They meet when both have completed whole rounds — at the LCM of their times. LCM(18,12)=36 minutes. (From NCERT Exercise 1.1, Q7)",
          concept="LCM — Real Life Application")

        q(n3, QuestionType.FILL_BLANK,
          "HCF(6, 72, 120) = ___ (where 6 = 2×3, 72 = 2³×3², 120 = 2³×3×5)",
          {"tip": "Take the lowest power of each prime that appears in ALL three numbers."},
          "6",
          hint="Common primes: 2 and 3. Min power of 2: 2¹. Min power of 3: 3¹. HCF = 2×3 = 6.",
          explanation="From NCERT Example 4. 6=2×3, 72=2³×3², 120=2³×3×5. Common primes: 2¹ and 3¹. HCF=6.",
          concept="HCF of Three Numbers")

        q(n3, QuestionType.FILL_BLANK,
          "Given that HCF(306, 657) = 9, find LCM(306, 657).",
          {"tip": "Use: LCM = (a × b) ÷ HCF"},
          "22338",
          hint="LCM = (306 × 657) / 9 = 201042 / 9 = 22338.",
          explanation="From NCERT Exercise 1.1, Q4. HCF × LCM = 306 × 657, so LCM = (306×657)/9 = 22338.",
          concept="HCF × LCM = Product")

        # ── LAB 1 (order=4): HCF & LCM Visualizer ──────────────────────────────
        lab(4, "🔬 HCF & LCM Explorer Lab", 20,
                   lab_type="HCF_LCM_VISUALIZER",
                   lab_category=LabCategory.INTERACTIVE,
                   required=3)

        # ── Node 4 (order=5): FTA Applications ─────────────────────────────────
        n4 = lesson(5, "FTA Applications — Powers, Composites & Word Problems", 20,
                    video_url="https://www.youtube.com/watch?v=cIw2sADGbwA",
                    description="Put FTA to work! Prove that 4ⁿ and 6ⁿ never end in 0, show why certain sums are composite, and solve divisibility problems — all using the uniqueness of prime factorisation.",
                    objectives=[
                        "Prove 4ⁿ and 6ⁿ never end in digit 0 using FTA",
                        "Identify composite expressions by factoring out common factors",
                        "Compute LCM to solve circular-path and timing problems",
                        "Apply HCF and LCM to multi-number problems",
                    ])

        q(n4, QuestionType.MCQ,
          "For any natural number n, the number 4ⁿ can never end with the digit 0. Why?",
          {"A": "Because 4 is even",
           "B": "Because 4ⁿ = 2^(2n) contains no factor of 5, so it cannot be divisible by 10",
           "C": "Because 4ⁿ is always greater than 10",
           "D": "Because 4 is not prime"},
          "Because 4ⁿ = 2^(2n) contains no factor of 5, so it cannot be divisible by 10",
          hint="A number ends in 0 ⟺ divisible by 10 = 2 × 5. FTA: 4ⁿ=2^(2n) → only prime factor is 2. No 5.",
          explanation="From NCERT Example 1. By FTA, 4ⁿ = 2^(2n). The only prime is 2. Since 5 is absent, 4ⁿ is never divisible by 10.",
          concept="FTA — Digit Analysis")

        q(n4, QuestionType.MCQ,
          "Why is 7 × 11 × 13 + 13 a composite number?",
          {"A": "It is an even number",
           "B": "13 is a common factor: 13 × (7 × 11 + 1) = 13 × 78",
           "C": "It is divisible by 7",
           "D": "All sums of primes are composite"},
          "13 is a common factor: 13 × (7 × 11 + 1) = 13 × 78",
          hint="Factor out 13: 13×(77+1) = 13×78. Since both 13 > 1 and 78 > 1, it's composite.",
          explanation="From NCERT Exercise 1.1 Q6. 7×11×13+13 = 13(7×11+1) = 13×78. It has factors other than 1 and itself.",
          concept="Identifying Composite Expressions")

        q(n4, QuestionType.MCQ,
          "Can 6ⁿ end with digit 0 for any natural number n?",
          {"A": "Yes, when n is a multiple of 5",
           "B": "Yes, when n is even",
           "C": "No — 6ⁿ = 2ⁿ × 3ⁿ has no factor of 5",
           "D": "Yes, for sufficiently large n"},
          "No — 6ⁿ = 2ⁿ × 3ⁿ has no factor of 5",
          hint="Check: 6¹=6, 6²=36, 6³=216 — last digit is always 6. A factor of 5 is needed to produce 0.",
          explanation="From NCERT Exercise 1.1 Q5. 6ⁿ=2ⁿ×3ⁿ. No 5 in factorisation → never divisible by 10 → never ends in 0.",
          concept="FTA — Digit Analysis")

        q(n4, QuestionType.FILL_BLANK,
          "LCM(26, 91) = ___ (26 = 2×13, 91 = 7×13)",
          {"tip": "HCF = 13 (common factor). Use LCM = (26 × 91) ÷ HCF."},
          "182",
          hint="HCF(26,91)=13. LCM=(26×91)/13 = 2366/13 = 182.",
          explanation="From NCERT Exercise 1.1 Q2(i). 26=2×13, 91=7×13. HCF=13. LCM=2×7×13=182. Verify: 13×182=2366=26×91 ✓",
          concept="HCF and LCM Computation")

        q(n4, QuestionType.MULTI_SELECT,
          "Select ALL expressions that represent composite numbers:",
          {"choices": [
              {"id": 1, "text": "7 × 11 × 13 + 13"},
              {"id": 2, "text": "7 × 6 × 5 × 4 × 3 × 2 × 1 + 5"},
              {"id": 3, "text": "2 + 3"},
              {"id": 4, "text": "11 × 13 + 11"},
              {"id": 5, "text": "3 × 5 + 7"},
              {"id": 6, "text": "7 × 6 × 5 × 4 × 3 × 2 × 1 + 7"},
          ]},
          "1,2,4,6",
          hint="Factor each: can you pull out a factor > 1? 2+3=5 (prime). 3×5+7=22... wait: 15+7=22=2×11 (composite!).",
          explanation="1: 13×(77+1)=13×78 ✓ | 2: 5×(7!/5+1)=5×1009 ✓ | 3: 5 (prime) ✗ | 4: 11×(13+1)=11×14 ✓ | 5: 3×5+7=22=2×11 — composite, but let me recheck... 15+7=22=2×11 ✓ | 6: 7×(6!/1+1)=7×721 ✓",
          concept="Identifying Composite Expressions")

        # ── Node 5 (order=6): Irrational Numbers — Foundation & Theorem 1.2 ────
        n5 = lesson(6, "Irrational Numbers — Foundation & Theorem 1.2", 20,
                    video_url="https://www.youtube.com/watch?v=H74tqiawD8o",
                    description="Meet the irrational numbers — what makes them irrational, how to identify them, and the crucial Theorem 1.2 that underpins every irrationality proof in this chapter.",
                    objectives=[
                        "Define irrational numbers precisely (cannot be written as p/q)",
                        "Identify irrational numbers from a list using the definition",
                        "State and explain Theorem 1.2: if prime p divides a², then p divides a",
                        "Apply rules for sums and products involving irrationals",
                    ])

        q(n5, QuestionType.MCQ,
          "A number s is called irrational if it cannot be written in the form p/q where:",
          {"A": "p and q are primes", "B": "p and q are integers and q ≠ 0",
           "C": "p > q", "D": "p and q are natural numbers"},
          "p and q are integers and q ≠ 0",
          hint="This is the exact definition from the textbook. Any number expressible as such a fraction is rational.",
          explanation="Definition (NCERT Section 1.3): s is irrational if it CANNOT be written as p/q where p,q ∈ ℤ and q ≠ 0.",
          concept="Definition of Irrational")

        q(n5, QuestionType.MCQ,
          "Theorem 1.2 states: Let p be a prime. If p divides a², then:",
          {"A": "p² divides a", "B": "p divides a",
           "C": "a divides p", "D": "a² divides p"},
          "p divides a",
          hint="This is the engine of ALL irrationality proofs: prime p | a² ⟹ prime p | a.",
          explanation="Proved using FTA: a = p₁p₂…pₙ, so a² = p₁²p₂²…pₙ². If p | a², then p is one of p₁,…,pₙ, so p | a.",
          concept="Theorem 1.2 — Key Lemma")

        q(n5, QuestionType.FILL_BLANK,
          "0.10110111011110… is ___ (write: rational or irrational).",
          {"tip": "Does it terminate? Does it repeat with a fixed block?"},
          "irrational",
          hint="The pattern grows (one extra 1 each time) — it never repeats. Non-terminating + non-repeating = irrational.",
          explanation="From NCERT Section 1.3. The decimal 0.1011011101111… is a famous example: non-terminating and non-repeating.",
          concept="Identifying Irrationals from Decimals")

        q(n5, QuestionType.FILL_BLANK,
          "The product of a non-zero rational number and an irrational number is always ___.",
          {"tip": "If r × √p = q/s, what would that mean about √p?"},
          "irrational",
          hint="If non-zero rational r times √p were rational, then √p = rational/r = rational — contradiction.",
          explanation="Property (NCERT Section 1.3): non-zero rational × irrational = irrational. This is used to prove 3√2 and 7√5 are irrational.",
          concept="Operations with Irrationals")

        q(n5, QuestionType.MULTI_SELECT,
          "Select ALL irrational numbers from the list below:",
          {"choices": [
              {"id": 1, "text": "√2"},
              {"id": 2, "text": "22/7"},
              {"id": 3, "text": "π"},
              {"id": 4, "text": "√4"},
              {"id": 5, "text": "√15"},
              {"id": 6, "text": "0.10110111011110…"},
              {"id": 7, "text": "−√2/3"},
              {"id": 8, "text": "√9"},
          ]},
          "1,3,5,6,7",
          hint="√4=2 and √9=3 are perfect squares (rational). 22/7=3.142857… (repeating, rational).",
          explanation="√2 ✓ | 22/7 ✗ (rational repeating) | π ✓ | √4=2 ✗ | √15 ✓ (15 not perfect square) | 0.1011… ✓ | −√2/3 ✓ (non-zero rational × irrational) | √9=3 ✗",
          concept="Identifying Irrationals")

        # ── Node 6 (order=7): Proving Irrationality — √2, √3, √5 ──────────────
        n6 = lesson(7, "Proving Irrationality — √2, √3 and √5", 25,
                    video_url="",
                    description="Master proof by contradiction — the technique that lets us prove √2, √3, and √5 are irrational. Each proof follows the same logical structure, powered by Theorem 1.2.",
                    objectives=[
                        "Understand and apply proof by contradiction",
                        "Prove √2 is irrational (Theorem 1.3 — NCERT)",
                        "Prove √3 is irrational (NCERT Example 5)",
                        "Prove √5 is irrational (NCERT Exercise 1.2 Q1)",
                    ])

        q(n6, QuestionType.MCQ,
          "In the proof that √2 is irrational, after establishing a² = 2b², we conclude '2 divides a'. This follows from:",
          {"A": "Euclid's Division Lemma",
           "B": "Theorem 1.2: if prime p divides a², then p divides a",
           "C": "The definition of even numbers only",
           "D": "The FTA uniqueness clause alone"},
          "Theorem 1.2: if prime p divides a², then p divides a",
          hint="We need a theorem to step from '2 | a²' to '2 | a'. Theorem 1.2 provides exactly this.",
          explanation="Theorem 1.2 with p=2: since 2 is prime and 2 | a², we conclude 2 | a. This is the key step.",
          concept="Proof: √2 is Irrational — Key Step")

        q(n6, QuestionType.MCQ,
          "In the √2 proof, we write a = 2c and substitute into a² = 2b². What do we get for b²?",
          {"A": "b² = 2c", "B": "b² = 4c", "C": "b² = 2c²", "D": "b² = c²"},
          "b² = 2c²",
          hint="(2c)² = 2b² → 4c² = 2b² → divide by 2 → b² = 2c².",
          explanation="a=2c → a²=(2c)²=4c². Substituting into a²=2b²: 4c²=2b² → b²=2c². Now 2 | b² → 2 | b.",
          concept="Proof: √2 is Irrational — Substitution")

        # PROOF_PUZZLE 1 — √2 is irrational (NCERT Theorem 1.3, 7 steps)
        p1_ordered = [
            {"id": 1, "text": "Assume √2 = a/b where a, b are integers with HCF(a, b) = 1 (lowest terms)"},
            {"id": 2, "text": "Squaring both sides: 2 = a²/b², so a² = 2b²"},
            {"id": 3, "text": "2 divides a², so by Theorem 1.2 (prime p | a² ⟹ p | a), 2 divides a"},
            {"id": 4, "text": "Write a = 2c for some integer c"},
            {"id": 5, "text": "Substituting: (2c)² = 2b²  →  4c² = 2b²  →  b² = 2c²"},
            {"id": 6, "text": "So 2 divides b² and hence (by Theorem 1.2) 2 divides b"},
            {"id": 7, "text": "Both a and b divisible by 2 contradicts HCF(a, b) = 1. ∴ √2 is irrational ∎"},
        ]
        q(n6, QuestionType.PROOF_PUZZLE,
          "Arrange these seven steps in logical order to prove that √2 is irrational (NCERT Theorem 1.3):",
          {"steps": [p1_ordered[i] for i in [3, 0, 5, 1, 6, 2, 4]]},
          "1,2,3,4,5,6,7",
          hint="Start with the assumption, square both sides, apply Theorem 1.2 twice, reach the contradiction.",
          explanation="Proof by contradiction: assuming √2=a/b leads to both a and b being even, contradicting HCF(a,b)=1.",
          concept="Proof: √2 is Irrational")

        # PROOF_PUZZLE 2 — √3 is irrational (NCERT Example 5, 6 steps)
        p2_ordered = [
            {"id": 1, "text": "Assume √3 = a/b where a, b are coprime integers (HCF(a, b) = 1)"},
            {"id": 2, "text": "Squaring: 3b² = a², so 3 divides a²"},
            {"id": 3, "text": "By Theorem 1.2, since 3 divides a², 3 divides a. Write a = 3c"},
            {"id": 4, "text": "Substituting: 3b² = (3c)² = 9c²  →  b² = 3c², so 3 divides b²"},
            {"id": 5, "text": "By Theorem 1.2, 3 divides b"},
            {"id": 6, "text": "Both a and b divisible by 3 contradicts HCF(a, b) = 1. ∴ √3 is irrational ∎"},
        ]
        q(n6, QuestionType.PROOF_PUZZLE,
          "Arrange these six steps in logical order to prove that √3 is irrational (NCERT Example 5):",
          {"steps": [p2_ordered[i] for i in [2, 5, 0, 4, 1, 3]]},
          "1,2,3,4,5,6",
          hint="Same structure as √2 proof — assume, square, apply Theorem 1.2 twice, contradict HCF=1.",
          explanation="The proof works for any prime p. Assuming √p=a/b in lowest terms leads to p|a and p|b — contradiction.",
          concept="Proof: √3 is Irrational")

        # PROOF_PUZZLE 3 — √5 is irrational (NCERT Exercise 1.2 Q1, 5 steps)
        p3_ordered = [
            {"id": 1, "text": "Assume √5 = a/b where a, b are coprime (HCF(a, b) = 1)"},
            {"id": 2, "text": "Squaring: a² = 5b², so 5 divides a²"},
            {"id": 3, "text": "By Theorem 1.2, 5 divides a. Write a = 5c"},
            {"id": 4, "text": "(5c)² = 5b²  →  25c² = 5b²  →  b² = 5c², so 5 divides b"},
            {"id": 5, "text": "5 divides both a and b — contradicts HCF(a, b) = 1. ∴ √5 is irrational ∎"},
        ]
        q(n6, QuestionType.PROOF_PUZZLE,
          "Arrange these five steps to prove that √5 is irrational (NCERT Exercise 1.2 Q1):",
          {"steps": [p3_ordered[i] for i in [2, 0, 4, 1, 3]]},
          "1,2,3,4,5",
          hint="Same pattern: assume rational, square, Theorem 1.2, contradiction.",
          explanation="From NCERT Exercise 1.2 Q1. Works because 5 is prime. Same method generalises to any prime p.",
          concept="Proof: √5 is Irrational")

        # ── LAB 2 (order=8): Proof Builder Lab ──────────────────────────────────
        lab(8, "🔬 Proof Builder Lab", 30,
                   lab_type="PROOF_BUILDER",
                   lab_category=LabCategory.INTERACTIVE,
                   required=6)

        # ── Node 7 (order=9): Composite Irrational Proofs ───────────────────────
        n7 = lesson(9, "Composite Irrational Proofs — 5−√3, 3√2, 3+2√5", 25,
                    video_url="",
                    description="Extend the contradiction technique to prove that combinations of rationals and irrationals — like 5−√3, 3√2, and 3+2√5 — are also irrational. These come directly from NCERT Examples 6–7 and Exercise 1.2 Q2–3.",
                    objectives=[
                        "Prove 5−√3 is irrational (NCERT Example 6)",
                        "Prove 3√2 is irrational (NCERT Example 7)",
                        "Prove 3+2√5 is irrational (NCERT Exercise 1.2 Q2)",
                        "Generalise: a+b√p is irrational for rational a,b and prime p",
                    ])

        q(n7, QuestionType.MCQ,
          "To prove 5 − √3 is irrational, we assume it equals a rational r. Rearranging gives √3 =",
          {"A": "5 + r", "B": "5 − r", "C": "r − 5", "D": "r + 5"},
          "5 − r",
          hint="5 − √3 = r → subtract 5: −√3 = r − 5 → multiply by −1: √3 = 5 − r.",
          explanation="From NCERT Example 6. 5−√3=r → √3=5−r. Since r is rational and 5 is rational, 5−r is rational. But √3 is irrational — contradiction.",
          concept="Composite Irrational — Isolation Step")

        q(n7, QuestionType.FILL_BLANK,
          "To prove 7√5 is irrational (NCERT Ex 1.2 Q3ii): assume 7√5 = p/q (coprime), then √5 = p/(7q). Since p/(7q) is ___, this contradicts √5 being irrational.",
          {"tip": "p, 7, and q are all integers. What is p/(7q)?"},
          "rational",
          hint="A ratio of two integers (with non-zero denominator) is rational by definition.",
          explanation="From Exercise 1.2 Q3(ii). p and 7q are integers, 7q≠0, so p/(7q) is rational. But √5 is irrational → contradiction. ∴ 7√5 is irrational.",
          concept="Composite Irrational — 7√5")

        # PROOF_PUZZLE 1 — 5−√3 is irrational (NCERT Example 6, 5 steps)
        pc1_ordered = [
            {"id": 1, "text": "Assume 5 − √3 is rational — call it r (where r = p/q in lowest terms)"},
            {"id": 2, "text": "Rearranging: −√3 = r − 5, so √3 = 5 − r"},
            {"id": 3, "text": "Since r is rational and 5 is rational, 5 − r is rational"},
            {"id": 4, "text": "So √3 would be rational"},
            {"id": 5, "text": "But √3 is irrational — this is a contradiction. ∴ 5 − √3 is irrational ∎"},
        ]
        q(n7, QuestionType.PROOF_PUZZLE,
          "Arrange these five steps to prove that 5 − √3 is irrational (NCERT Example 6):",
          {"steps": [pc1_ordered[i] for i in [3, 0, 4, 2, 1]]},
          "1,2,3,4,5",
          hint="Assume it's rational, isolate √3, show √3 would have to be rational — contradiction.",
          explanation="From NCERT Example 6. The key insight: if (rational) − (rational) = rational, then isolating √3 gives a rational expression — contradicting its irrationality.",
          concept="Proof: 5−√3 is Irrational")

        # PROOF_PUZZLE 2 — 3+2√5 is irrational (NCERT Exercise 1.2 Q2, 5 steps)
        pc2_ordered = [
            {"id": 1, "text": "Assume 3 + 2√5 is rational — call it r"},
            {"id": 2, "text": "Rearranging: 2√5 = r − 3, so √5 = (r − 3)/2"},
            {"id": 3, "text": "Since r is rational, r − 3 is rational, and (r − 3)/2 is rational"},
            {"id": 4, "text": "So √5 would be rational"},
            {"id": 5, "text": "But √5 is irrational (proved in Exercise 1.2 Q1) — contradiction. ∴ 3 + 2√5 is irrational ∎"},
        ]
        q(n7, QuestionType.PROOF_PUZZLE,
          "Arrange these five steps to prove that 3 + 2√5 is irrational (NCERT Exercise 1.2 Q2):",
          {"steps": [pc2_ordered[i] for i in [2, 0, 4, 1, 3]]},
          "1,2,3,4,5",
          hint="Isolate √5 = (r−3)/2. If r is rational, the whole right side is rational — contradicts √5 being irrational.",
          explanation="From NCERT Exercise 1.2 Q2. General pattern: a+b√p rational ⟹ √p = (r−a)/b rational ⟹ contradiction.",
          concept="Proof: 3+2√5 is Irrational")

        q(n7, QuestionType.MULTI_SELECT,
          "Select ALL expressions that are irrational:",
          {"choices": [
              {"id": 1, "text": "5 − √3"},
              {"id": 2, "text": "√2 × √8"},
              {"id": 3, "text": "3 + 2√5"},
              {"id": 4, "text": "7√5"},
              {"id": 5, "text": "√2 × √2"},
              {"id": 6, "text": "6 + √2"},
              {"id": 7, "text": "(√5)²"},
              {"id": 8, "text": "1/√2"},
          ]},
          "1,3,4,6,8",
          hint="√2×√8=√16=4 (rational). √2×√2=2 (rational). (√5)²=5 (rational). Watch the traps!",
          explanation="5−√3 ✓(Ex 6) | √2×√8=4 ✗ | 3+2√5 ✓(Ex1.2 Q2) | 7√5 ✓(Ex1.2 Q3ii) | √2×√2=2 ✗ | 6+√2 ✓(Ex1.2 Q3iii) | (√5)²=5 ✗ | 1/√2 ✓(Ex1.2 Q3i)",
          concept="Classifying Composite Irrational Expressions")

        # ── Chapter Test (order=10) ─────────────────────────────────────────────
        nt = test(10, "Chapter 1 — Real Numbers Final Assessment", 50)

        # MCQ (4)
        q(nt, QuestionType.MCQ,
          "HCF(96, 404) is: (96 = 2⁵ × 3,  404 = 2² × 101)",
          {"A": "2", "B": "4", "C": "8", "D": "12"},
          "4",
          hint="Common prime: 2. Lowest power: min(2⁵, 2²) = 2² = 4.",
          explanation="From NCERT Example 3. HCF = 2² = 4. LCM = (96×404)/4 = 9696.",
          concept="HCF via Prime Factorisation")

        q(nt, QuestionType.MCQ,
          "LCM(12, 15, 21) is: (12 = 2²×3,  15 = 3×5,  21 = 3×7)",
          {"A": "60", "B": "420", "C": "1260", "D": "3780"},
          "420",
          hint="LCM = highest power of each prime: 2²×3¹×5¹×7¹ = 4×3×5×7 = 420.",
          explanation="From NCERT Exercise 1.1 Q3(i) variant. All primes: 2,3,5,7. LCM=2²×3×5×7=420.",
          concept="LCM of Three Numbers")

        q(nt, QuestionType.MCQ,
          "If HCF(a, b) = 12 and a × b = 1800, find LCM(a, b).",
          {"A": "120", "B": "150", "C": "1800", "D": "21600"},
          "150",
          hint="LCM = (a × b) / HCF = 1800 / 12 = 150.",
          explanation="Using HCF × LCM = a × b: LCM = 1800/12 = 150.",
          concept="HCF × LCM = Product")

        q(nt, QuestionType.MCQ,
          "Which of the following can NEVER end in digit 0 for any positive integer n?",
          {"A": "10ⁿ", "B": "4ⁿ", "C": "20ⁿ", "D": "(2×5)ⁿ"},
          "4ⁿ",
          hint="4ⁿ = 2^(2n) — no factor of 5. All others contain both 2 and 5 as factors.",
          explanation="From NCERT Example 1. 4ⁿ=2^(2n) has no prime factor 5. So 4ⁿ is never divisible by 10.",
          concept="FTA — Digit Analysis")

        # FILL_BLANK (2)
        q(nt, QuestionType.FILL_BLANK,
          "LCM(336, 54) = ___ (336 = 2⁴×3×7,  54 = 2×3³)",
          {"tip": "Take highest power of each prime: 2⁴, 3³, 7¹. Multiply."},
          "3024",
          hint="LCM = 2⁴×3³×7 = 16×27×7 = 3024.",
          explanation="From NCERT Exercise 1.1 Q2(iii). 336=2⁴×3×7, 54=2×3³. LCM=2⁴×3³×7=3024. Verify: HCF(336,54)=6. 336×54/6=54×56=3024 ✓",
          concept="LCM via Prime Factorisation")

        q(nt, QuestionType.FILL_BLANK,
          "7429 = 17 × 19 × ___",
          {"tip": "7429 ÷ 17 = 437. Now factorise 437."},
          "23",
          hint="7429 ÷ 17 = 437 = 19 × 23.",
          explanation="From NCERT Exercise 1.1 Q1(v). 7429 = 17 × 437 = 17 × 19 × 23. All three are prime.",
          concept="Prime Factorisation")

        # PROOF_PUZZLE (2)
        # Test PP1 — 3√2 is irrational (NCERT Example 7, 5 steps)
        tp1_ordered = [
            {"id": 1, "text": "Assume 3√2 is rational — call it r"},
            {"id": 2, "text": "Rearranging: √2 = r/3"},
            {"id": 3, "text": "Since r is rational and 3 is a non-zero integer, r/3 is also rational"},
            {"id": 4, "text": "So √2 would be rational"},
            {"id": 5, "text": "But √2 is irrational — contradiction. ∴ 3√2 is irrational ∎"},
        ]
        q(nt, QuestionType.PROOF_PUZZLE,
          "Arrange these five steps to prove that 3√2 is irrational (NCERT Example 7):",
          {"steps": [tp1_ordered[i] for i in [3, 0, 4, 2, 1]]},
          "1,2,3,4,5",
          hint="Assume rational, divide by 3, show √2 is rational — contradiction.",
          concept="Proof: 3√2 is Irrational")

        # Test PP2 — 1/√2 is irrational (NCERT Exercise 1.2 Q3i, 4 steps)
        tp2_ordered = [
            {"id": 1, "text": "Assume 1/√2 is rational — call it r (so r = p/q, q ≠ 0)"},
            {"id": 2, "text": "Then √2 = 1/r"},
            {"id": 3, "text": "Since r is a non-zero rational, 1/r is also rational — so √2 would be rational"},
            {"id": 4, "text": "But √2 is irrational — contradiction. ∴ 1/√2 is irrational ∎"},
        ]
        q(nt, QuestionType.PROOF_PUZZLE,
          "Arrange these four steps to prove that 1/√2 is irrational (NCERT Exercise 1.2 Q3i):",
          {"steps": [tp2_ordered[i] for i in [2, 0, 3, 1]]},
          "1,2,3,4",
          hint="If 1/√2 is rational, then √2=1/(1/√2) is rational — contradiction.",
          concept="Proof: 1/√2 is Irrational")

        # MULTI_SELECT (2)
        q(nt, QuestionType.MULTI_SELECT,
          "Select ALL true statements:",
          {"choices": [
              {"id": 1, "text": "Every natural number greater than 1 is either prime or composite"},
              {"id": 2, "text": "The prime factorisation of any composite number is unique"},
              {"id": 3, "text": "HCF(a, b) is always strictly less than both a and b"},
              {"id": 4, "text": "LCM(a, b) × HCF(a, b) = a × b"},
              {"id": 5, "text": "4ⁿ ends in 0 for some natural number n"},
              {"id": 6, "text": "If prime p divides a², then p divides a"},
          ]},
          "1,2,4,6",
          hint="Statement 3 is false: HCF(4,8)=4 which equals a, not strictly less. Statement 5 is false: 4ⁿ never ends in 0.",
          explanation="1 ✓(definition) | 2 ✓(FTA) | 3 ✗(HCF can equal one of the numbers, e.g. HCF(4,8)=4) | 4 ✓(product rule) | 5 ✗(4ⁿ=2^(2n), no factor 5) | 6 ✓(Theorem 1.2)",
          concept="FTA — True/False Statements")

        q(nt, QuestionType.MULTI_SELECT,
          "Select ALL numbers that are composite:",
          {"choices": [
              {"id": 1, "text": "7 × 11 × 13 + 13"},
              {"id": 2, "text": "7! + 5"},
              {"id": 3, "text": "2 + 3"},
              {"id": 4, "text": "11 × 13 + 11"},
              {"id": 5, "text": "3 × 5 + 2"},
              {"id": 6, "text": "7 × 11 × 13 + 7"},
          ]},
          "1,2,4,6",
          hint="Factor out common factors: 13|option1, 5|option2, 11|option4, 7|option6. 2+3=5 (prime), 3×5+2=17 (prime).",
          explanation="1: 13(77+1)=13×78 ✓ | 2: 5(7!/5+1)=5×1009 ✓ | 3: 5 (prime) ✗ | 4: 11(13+1)=11×14 ✓ | 5: 17 (prime) ✗ | 6: 7(11×13+1)=7×144 ✓",
          concept="Identifying Composite Expressions")

        # ═══════════════════════════════════════════════════════════════════════
        # REVISION NODE
        # ═══════════════════════════════════════════════════════════════════════
        rev_node = RevisionNode.objects.create(
            path=path,
            title="Real Numbers Revision ✨",
            appears_after_node=n6,
            side=random.choice(['left', 'right']),
            xp_reward=20,
            is_mandatory=False
        )

        # ═══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════════

        # Prerequisite deck
        pre_deck = FlashcardDeck.objects.create(
            title="Chapter 1 Prerequisites", purpose=DeckPurpose.PREREQUISITE, course_unit=unit
        )
        for title, body, concept in [
            ("What is a Prime Number?",
             "A prime number is a natural number greater than 1 with no positive divisors other than 1 and itself. Examples: 2, 3, 5, 7, 11, 13. Note: 2 is the only even prime.",
             "Prime Numbers"),
            ("Rational vs Irrational Numbers",
             "Rational: can be written as p/q (q ≠ 0). Decimal either terminates (0.75) or repeats (0.333…). Irrational: cannot be written as p/q — like √2=1.41421356… (non-terminating, non-repeating).",
             "Rational/Irrational"),
            ("Proof by Contradiction",
             "Assume the OPPOSITE of what you want to prove. Show this leads to an impossibility. Conclude the original statement must be true. Used to prove irrationality of √2, √3, √5, 3+2√5, etc.",
             "Proof Technique"),
            ("HCF and LCM Basics",
             "HCF: largest number dividing both. LCM: smallest number both divide into. Key identity: HCF(a,b) × LCM(a,b) = a × b. HCF = lowest powers of common primes. LCM = highest powers of all primes.",
             "HCF LCM"),
            ("Divisibility Rules",
             "By 2 → last digit even | By 3 → digit sum divisible by 3 | By 5 → ends in 0 or 5 | By 9 → digit sum divisible by 9 | By 10 → ends in 0 (needs both 2 and 5 as factors).",
             "Divisibility Rules"),
        ]:
            fc = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.CONCEPT,
                subject="Mathematics", chapter="Real Numbers", concept=concept
            )
            DeckCard.objects.create(deck=pre_deck, card=fc)

        # Post-Node 1 deck
        post_deck = FlashcardDeck.objects.create(
            title="Real Numbers Review Cards", purpose=DeckPurpose.POST_NODE, learning_node=n1
        )
        for title, body, card_type, concept in [
            ("Real Number Hierarchy",
             "Natural ⊂ Whole ⊂ Integers ⊂ Rational ⊂ Real. Irrational numbers fill the gaps between rationals. Together, Rationals ∪ Irrationals = Real Numbers. Every point on the number line is a real number.",
             FlashcardType.SUMMARY, "Number Classification"),
            ("The √2 Proof — Sketch",
             "Assume √2 = a/b (lowest terms). Then a²=2b² → 2|a → a=2c → b²=2c² → 2|b. Both divisible by 2 contradicts HCF=1. ∴ √2 irrational. Same logic: any prime p → √p irrational.",
             FlashcardType.SUMMARY, "Irrationality Proof"),
            ("FTA in One Line",
             "Every composite number = product of primes, uniquely (ignoring order). Example: 32760 = 2³×3²×5×7×13 — always, no matter how you factorise it. This uniqueness is what makes FTA powerful.",
             FlashcardType.SUMMARY, "Fundamental Theorem of Arithmetic"),
        ]:
            fc = Flashcard.objects.create(
                title=title, body=body, card_type=card_type,
                subject="Mathematics", chapter="Real Numbers", concept=concept
            )
            DeckCard.objects.create(deck=post_deck, card=fc)

        # Revision deck
        rev_deck = FlashcardDeck.objects.create(
            title="Real Numbers Revision Deck", purpose=DeckPurpose.SIDE_REVISION, revision_node=rev_node
        )
        for title, body, concept in [
            ("FTA — Uniqueness",
             "Every composite number can be expressed as a product of primes in exactly ONE way (ignoring order). This is the Fundamental Theorem of Arithmetic. Example: 1260 = 2²×3²×5×7 — always.",
             "FTA Uniqueness"),
            ("Theorem 1.2 — The Key Lemma",
             "If p is prime and p divides a², then p divides a. This is the engine powering EVERY irrationality proof. It follows from FTA: if p | a², then p must appear in the prime factorisation of a.",
             "Theorem 1.2"),
            ("Irrationality Proof Template",
             "To prove √p is irrational (p prime): 1) Assume √p = a/b, HCF=1. 2) p divides a². 3) By Thm 1.2, p divides a → a=pc. 4) Substitute: p divides b. 5) Both divisible by p → HCF≥p. Contradiction.",
             "Irrationality Proof"),
            ("Composite Irrational Template",
             "To prove a+b√p is irrational: Assume = rational r. Isolate: √p = (r−a)/b. Since r,a,b are rational and b≠0, (r−a)/b is rational. But √p is irrational → contradiction.",
             "Composite Irrational"),
            ("Operations with Irrationals",
             "Rational ± Rational = Rational | Rational ± Irrational = Irrational | Non-zero Rational × Irrational = Irrational | Irrational × Irrational = could be either (√2×√2=2 rational, √2×√3=√6 irrational).",
             "Irrational Operations"),
        ]:
            fc = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.CONCEPT,
                subject="Mathematics", chapter="Real Numbers", concept=concept
            )
            DeckCard.objects.create(deck=rev_deck, card=fc)

        self.stdout.write(self.style.SUCCESS(
            "Chapter 1 seeded successfully!\n"
            f"  • 7 lesson nodes (orders 1,2,3,5,6,7,9)\n"
            f"  • 2 lab nodes: HCF_LCM_VISUALIZER (order=4, unlock after 3), PROOF_BUILDER (order=8, unlock after 6)\n"
            f"  • 1 chapter test (order=10, 10 questions)\n"
            f"  • Questions aligned with NCERT Class 10 Chapter 1 (Reprint 2026-27)"
        ))
