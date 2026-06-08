from django.core.management.base import BaseCommand
from courses.models import Subject, Course
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Algebraic Identities (Ganita Manjari Class 9, NCERT 2026-27)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Algebraic Identities (Class 9, 2026-27)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )

        subj, _ = Subject.objects.get_or_create(name='Mathematics', defaults={'created_by': admin_user})
        Course.objects.get_or_create(
            name='Algebraic Identities', subject=subj,
            defaults={'status': 'published', 'created_by': admin_user}
        )

        unit, _ = CourseUnit.objects.get_or_create(
            title='Algebraic Identities', subject='Mathematics',
            class_grade='9', board='CBSE', order=7, icon='functions',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Algebraic Identities', class_grade='9'
        )

        self.stdout.write("Wiping old nodes and flashcards for clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # ── Helpers ───────────────────────────────────────────────────────────
        def q(node, qtype, text, opts, ans, hint='', explanation='', concept=''):
            LessonQuestion.objects.create(
                node=node, question_type=qtype, question_text=text,
                options_json=opts, correct_answer=ans,
                hint=hint, explanation=explanation, concept=concept,
            )

        def lesson(order, title, xp, description='', objectives=None):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LESSON, order=order,
                xp_reward=xp, practice_question_count=5, starting_lives=3,
                description=description, objectives_json=objectives or [],
            )

        def lab(order, title, xp, lab_type, required=2):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LAB, order=order,
                xp_reward=xp, lab_type=lab_type,
                lab_category=LabCategory.INTERACTIVE, lab_required_completions=required,
            )

        def test(order, title, xp):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.CHAPTER_TEST, order=order,
                xp_reward=xp, test_question_count=10, test_pass_percentage=70,
            )

        # ═══════════════════════════════════════════════════════════════════
        # NODE 1 — Expressions and Identities: What's the Difference?
        # ═══════════════════════════════════════════════════════════════════
        n1 = lesson(1, "Expressions and Identities: What's the Difference?", 10,
                    description="An algebraic expression is built from variables and constants using operations. An identity is a special equation that holds true for ALL values of the variables — not just some. This crucial distinction is the foundation of the entire chapter.",
                    objectives=[
                        "Distinguish between an algebraic expression and an algebraic equation",
                        "Define an algebraic identity as an equation true for all variable values",
                        "Verify a proposed identity by substituting multiple values",
                        "Identify terms, coefficients, and degrees in a polynomial expression",
                        "Explain why (a+b)² ≠ a² + b² with a counter-example",
                    ])

        q(n1, QuestionType.MCQ,
          "Which of the following is an algebraic identity?",
          {"A": "x + 5 = 12", "B": "(x+y)² = x² + 2xy + y²", "C": "2x − 3 = 7", "D": "x² = 4"},
          "B",
          hint="An identity holds for ALL values of x and y, not just specific ones.",
          explanation="(x+y)² = x² + 2xy + y² is true for every real x and y — that makes it an identity. The others are equations that are true only for specific values of the variable.",
          concept="Identity vs Equation")

        q(n1, QuestionType.TRUE_FALSE,
          "(a + b)² = a² + b² is an algebraic identity.",
          {},
          "False",
          hint="Try a = 2, b = 3: LHS = 25, RHS = 13.",
          explanation="Substituting a=2, b=3: LHS=(2+3)²=25, RHS=4+9=13. Since 25≠13, it is NOT an identity. The correct identity is (a+b)² = a² + 2ab + b² — the middle term 2ab is missing from the false claim.",
          concept="Verifying Identities")

        q(n1, QuestionType.MCQ,
          "To verify that an equation is an identity, you should:",
          {"A": "Check one specific value of the variable", "B": "Check that it holds for all values of the variable", "C": "Draw its graph", "D": "Factor the left side only"},
          "B",
          hint="The word 'identity' comes from the Latin for 'same everywhere'.",
          explanation="An identity must hold for every value of the variables. Checking one value is not enough — the equation 2x=x+x also holds for one value, but is actually an identity; x²=2x is NOT an identity even though it holds at x=2.",
          concept="What Makes an Identity")

        q(n1, QuestionType.FILL_BLANK,
          "If a = 4 and b = 3, the value of 2ab in the expansion of (a+b)² is ___.",
          {"tip": "2ab = 2 × 4 × 3"},
          "24",
          hint="2ab = 2 × 4 × 3 = 24.",
          explanation="2ab = 2 × 4 × 3 = 24. So (4+3)² = 16 + 24 + 9 = 49 = 7². This confirms (a+b)² = a² + 2ab + b².",
          concept="Expanding (a+b)²")

        q(n1, QuestionType.MCQ,
          "The number of terms in the expansion of (a + b + c)² is:",
          {"A": "3", "B": "4", "C": "6", "D": "9"},
          "C",
          hint="Count: a², b², c², 2ab, 2bc, 2ca.",
          explanation="(a+b+c)² = a² + b² + c² + 2ab + 2bc + 2ca — exactly 6 terms. Three square terms and three cross-product terms.",
          concept="Three-Term Square")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 2 — The Square of a Sum: (a+b)²
        # ═══════════════════════════════════════════════════════════════════
        n2 = lesson(2, "The Square of a Sum: (a+b)²", 15,
                    description="Discover the most widely used algebraic identity: (a+b)² = a² + 2ab + b². Starting from a geometric proof — a square of side (a+b) cut into four pieces — you'll see where every term comes from and how to use this identity to calculate squares of large numbers mentally.",
                    objectives=[
                        "State and prove (a+b)² = a² + 2ab + b² geometrically and algebraically",
                        "Apply the identity to expand (px + qy)² type expressions",
                        "Use the identity to evaluate squares like 103², 51², mentally",
                        "Identify the 'middle term' 2ab as the key component",
                        "Write 2ab when given a² and b², and vice versa",
                    ])

        q(n2, QuestionType.MCQ,
          "Expand: (x + 5)²",
          {"A": "x² + 25", "B": "x² + 5x + 25", "C": "x² + 10x + 25", "D": "x² + 10x + 5"},
          "C",
          hint="Use (a+b)² = a² + 2ab + b². Here a=x, b=5.",
          explanation="(x+5)² = x² + 2(x)(5) + 5² = x² + 10x + 25. The middle term is 2×x×5 = 10x, not 5x.",
          concept="Expanding (a+b)²")

        q(n2, QuestionType.FILL_BLANK,
          "Using (a+b)², evaluate 104²: (100+4)² = 10000 + ___ + 16 = ___.",
          {"tip": "Middle term = 2 × 100 × 4"},
          "800",
          hint="2 × 100 × 4 = 800. So 104² = 10000 + 800 + 16 = 10816.",
          explanation="(100+4)² = 100² + 2(100)(4) + 4² = 10000 + 800 + 16 = 10816.",
          concept="Mental Computation Using (a+b)²")

        q(n2, QuestionType.MCQ,
          "If (x + k)² = x² + 14x + 49, what is k?",
          {"A": "7", "B": "14", "C": "49", "D": "√14"},
          "A",
          hint="Compare 2k = 14.",
          explanation="(x+k)² = x² + 2kx + k². So 2k = 14 → k = 7. Check: k² = 49 ✓.",
          concept="Finding Unknown in Identity")

        q(n2, QuestionType.MCQ,
          "Expand: (3x + 4y)²",
          {"A": "9x² + 16y²", "B": "9x² + 12xy + 16y²", "C": "9x² + 24xy + 16y²", "D": "6x² + 24xy + 8y²"},
          "C",
          hint="a=3x, b=4y. Middle term = 2(3x)(4y) = 24xy.",
          explanation="(3x+4y)² = (3x)² + 2(3x)(4y) + (4y)² = 9x² + 24xy + 16y².",
          concept="Expanding (px+qy)²")

        q(n2, QuestionType.PROOF_PUZZLE,
          "Arrange the steps to prove (a+b)² = a² + 2ab + b² algebraically:",
          {"steps": [
              {"id": 1, "text": "(a+b)² = (a+b)(a+b)"},
              {"id": 2, "text": "= a(a+b) + b(a+b)"},
              {"id": 3, "text": "= a² + ab + ba + b²"},
              {"id": 4, "text": "= a² + 2ab + b²  (since ab = ba)"},
          ]},
          "1,2,3,4",
          hint="Start by writing (a+b)² as a product, then expand using distributive law.",
          explanation="Step 1: Write as product. Step 2: Distribute the first factor (a+b) into each term. Step 3: Expand using a×a=a², a×b=ab, b×a=ba, b×b=b². Step 4: Combine ab + ba = 2ab.",
          concept="Algebraic Proof of (a+b)²")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 3 — The Square of a Difference: (a−b)²
        # ═══════════════════════════════════════════════════════════════════
        n3 = lesson(3, "The Square of a Difference: (a−b)²", 15,
                    description="The companion identity: (a−b)² = a² − 2ab + b². The geometric proof shows what happens when you remove an L-shaped strip from a big square, leaving a smaller square plus an unexpected b² corner. This identity is essential for computing differences of squares mentally.",
                    objectives=[
                        "State and prove (a−b)² = a² − 2ab + b²",
                        "Distinguish (a−b)² from (a+b)² — only the sign of the middle term changes",
                        "Expand expressions like (5x − 3y)² correctly",
                        "Use the identity to compute 97², 98² mentally",
                        "Solve for unknowns given a perfect-square trinomial",
                    ])

        q(n3, QuestionType.MCQ,
          "Expand: (x − 7)²",
          {"A": "x² − 49", "B": "x² − 7x + 49", "C": "x² − 14x + 49", "D": "x² + 14x + 49"},
          "C",
          hint="(a−b)² = a² − 2ab + b². Here a=x, b=7.",
          explanation="(x−7)² = x² − 2(x)(7) + 7² = x² − 14x + 49.",
          concept="Expanding (a−b)²")

        q(n3, QuestionType.FILL_BLANK,
          "Evaluate 98² using (a−b)²: (100−2)² = 10000 − ___ + 4 = ___.",
          {"tip": "Middle term = 2 × 100 × 2"},
          "400",
          hint="2 × 100 × 2 = 400. So 98² = 10000 − 400 + 4 = 9604.",
          explanation="(100−2)² = 100² − 2(100)(2) + 2² = 10000 − 400 + 4 = 9604.",
          concept="Mental Computation Using (a−b)²")

        q(n3, QuestionType.MCQ,
          "Which expression equals (2p − 5q)²?",
          {"A": "4p² − 10pq + 25q²", "B": "4p² + 20pq + 25q²", "C": "4p² − 20pq + 25q²", "D": "2p² − 20pq + 5q²"},
          "C",
          hint="a=2p, b=5q. Middle term = −2(2p)(5q) = −20pq.",
          explanation="(2p−5q)² = (2p)² − 2(2p)(5q) + (5q)² = 4p² − 20pq + 25q².",
          concept="Expanding (ap−bq)²")

        q(n3, QuestionType.TRUE_FALSE,
          "(a−b)² = (b−a)²",
          {},
          "True",
          hint="(b−a) = −(a−b). What happens when you square a negative?",
          explanation="(b−a)² = (−(a−b))² = (−1)²(a−b)² = (a−b)². Squaring removes the sign, so both sides are equal.",
          concept="Symmetry of Squaring")

        q(n3, QuestionType.MCQ,
          "If x² − kx + 9 = (x−3)², what is k?",
          {"A": "3", "B": "6", "C": "9", "D": "−6"},
          "B",
          hint="Compare −kx = −2(x)(3).",
          explanation="(x−3)² = x² − 6x + 9. So k = 6.",
          concept="Identifying Unknowns in (a−b)²")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 4 — LAB: Identity Visualizer
        # ═══════════════════════════════════════════════════════════════════
        n4 = lab(4, "Identity Visualizer Lab", 25, "IDENTITY_VISUALIZER_LAB", required=2)

        # ═══════════════════════════════════════════════════════════════════
        # NODE 5 — Difference of Two Squares: (a+b)(a−b) = a² − b²
        # ═══════════════════════════════════════════════════════════════════
        n5 = lesson(5, "Difference of Two Squares: (a+b)(a−b) = a² − b²", 15,
                    description="This identity has no middle term — making it one of the fastest mental computation tools in mathematics. (a+b)(a−b) = a² − b². See why using a geometric cut-and-rearrange proof, and discover how to multiply numbers like 52×48 or 103×97 instantly.",
                    objectives=[
                        "State and prove (a+b)(a−b) = a² − b²",
                        "Apply the identity for mental multiplication: 52×48, 103×97, etc.",
                        "Factorise difference-of-squares expressions like 16x² − 9y²",
                        "Recognise when an expression is a difference of two perfect squares",
                        "Explain why the middle term vanishes in this product",
                    ])

        q(n5, QuestionType.MCQ,
          "Evaluate 52 × 48 using (a+b)(a−b):",
          {"A": "2496", "B": "2506", "C": "2500", "D": "2304"},
          "A",
          hint="Write as (50+2)(50−2) = 50² − 2² = 2500 − 4.",
          explanation="52×48 = (50+2)(50−2) = 50² − 4 = 2500 − 4 = 2496.",
          concept="Mental Multiplication via a²−b²")

        q(n5, QuestionType.MCQ,
          "Factorise: 25x² − 49",
          {"A": "(5x − 7)²", "B": "(5x + 7)(5x − 7)", "C": "(25x + 7)(x − 7)", "D": "(5x − 49)(5x + 1)"},
          "B",
          hint="25x² = (5x)² and 49 = 7². Use (a+b)(a−b).",
          explanation="25x² − 49 = (5x)² − 7² = (5x+7)(5x−7).",
          concept="Factorising a²−b²")

        q(n5, QuestionType.FILL_BLANK,
          "Evaluate 103 × 97 using (a+b)(a−b): (100+3)(100−3) = 100² − 3² = ___.",
          {"tip": "10000 − 9"},
          "9991",
          hint="100² = 10000, 3² = 9. Subtract.",
          explanation="103 × 97 = (100+3)(100−3) = 10000 − 9 = 9991.",
          concept="Mental Computation via Difference of Squares")

        q(n5, QuestionType.MULTI_SELECT,
          "Select ALL expressions that are differences of two perfect squares:",
          {"choices": [
              {"id": 1, "text": "x² − 4"},
              {"id": 2, "text": "x² + 9"},
              {"id": 3, "text": "4a² − 25b²"},
              {"id": 4, "text": "9x² − 7"},
              {"id": 5, "text": "16p² − 81q²"},
          ]},
          "1,3,5",
          hint="Both terms must be perfect squares, and they must be subtracted.",
          explanation="1✓ x²−4=(x²−2²) | 2✗ addition, not subtraction | 3✓ (2a)²−(5b)² | 4✗ 7 is not a perfect square | 5✓ (4p)²−(9q)²",
          concept="Identifying Difference of Squares")

        q(n5, QuestionType.MCQ,
          "Which of the following equals (m − n)(m + n)?",
          {"A": "m² + n²", "B": "m² − n²", "C": "m² − 2mn + n²", "D": "(m − n)²"},
          "B",
          hint="(a+b)(a−b) = a²−b². Here a=m, b=n.",
          explanation="(m−n)(m+n) = (m+n)(m−n) = m² − n². Order doesn't matter in multiplication.",
          concept="Applying a²−b² Identity")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 6 — The Three-Variable Identity: (a+b+c)²
        # ═══════════════════════════════════════════════════════════════════
        n6 = lesson(6, "The Three-Variable Identity: (a+b+c)²", 20,
                    description="Extend the squaring identity to three terms. (a+b+c)² = a² + b² + c² + 2ab + 2bc + 2ca. This is the foundation for understanding perfect-square trinomials in two variables and provides a critical tool in coordinate geometry and statistics.",
                    objectives=[
                        "State and expand (a+b+c)² = a² + b² + c² + 2ab + 2bc + 2ca",
                        "Identify the six terms and where each comes from",
                        "Apply to find (x+y+z)² when given x+y+z and xy+yz+zx",
                        "Use to evaluate expressions like (2+3+4)² without a calculator",
                        "Verify by substituting specific values",
                    ])

        q(n6, QuestionType.MCQ,
          "Expand (a + b + c)²:",
          {"A": "a² + b² + c²", "B": "a² + b² + c² + ab + bc + ca", "C": "a² + b² + c² + 2ab + 2bc + 2ca", "D": "(a+b)² + c²"},
          "C",
          hint="There are 6 terms: three squares and three cross-products, each doubled.",
          explanation="(a+b+c)(a+b+c): each pair of unlike terms produces a cross product. The three pairs (a,b), (b,c), (c,a) each appear twice, giving 2ab + 2bc + 2ca.",
          concept="Expanding (a+b+c)²")

        q(n6, QuestionType.FILL_BLANK,
          "If x+y+z = 10 and xy+yz+zx = 25, then (x+y+z)² = x²+y²+z² + 2(xy+yz+zx). So x²+y²+z² = ___.",
          {"tip": "100 = x²+y²+z² + 2(25)"},
          "50",
          hint="100 = x²+y²+z² + 50, so x²+y²+z² = 50.",
          explanation="(x+y+z)² = x²+y²+z² + 2(xy+yz+zx). So 100 = x²+y²+z² + 50, giving x²+y²+z² = 50.",
          concept="Using (a+b+c)² in Reverse")

        q(n6, QuestionType.MCQ,
          "What is the coefficient of bc in (a + b + c)²?",
          {"A": "1", "B": "2", "C": "4", "D": "0"},
          "B",
          hint="b and c appear in the cross-product bc twice: once from b×c and once from c×b.",
          explanation="When expanding, b×c + c×b = 2bc. So the coefficient of bc is 2.",
          concept="Coefficient in (a+b+c)²")

        q(n6, QuestionType.MCQ,
          "Expand (1 + x + x²)²: what is the coefficient of x²?",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "C",
          hint="a=1, b=x, c=x². The x² terms come from: b² = x² and 2ac = 2·1·x².",
          explanation="(1+x+x²)² has x² terms: b² = x² (coefficient 1) and 2ac = 2·1·x² (coefficient 2). Total = 3. Full expansion: 1 + 2x + 3x² + 2x³ + x⁴.",
          concept="Collecting Terms in (a+b+c)²")

        q(n6, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about (a+b+c)²:",
          {"choices": [
              {"id": 1, "text": "It has exactly 6 terms when a, b, c are distinct"},
              {"id": 2, "text": "The term 2bc comes from b×c + c×b"},
              {"id": 3, "text": "Setting c=0 gives (a+b)² = a² + 2ab + b²"},
              {"id": 4, "text": "The sum of all coefficients equals 9 (set a=b=c=1)"},
              {"id": 5, "text": "The identity works only for positive values"},
          ]},
          "1,2,3,4",
          hint="Statement 5 is wrong — algebraic identities hold for all real numbers.",
          explanation="1✓ (a²,b²,c²,2ab,2bc,2ca) | 2✓ (cross-product explanation) | 3✓ (c=0 simplifies) | 4✓ (1+1+1+2+2+2=9=(1+1+1)²) | 5✗ (identities hold for all real values)",
          concept="Properties of (a+b+c)²")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 7 — Cubic Identities: (a+b)³ and (a−b)³
        # ═══════════════════════════════════════════════════════════════════
        n7 = lesson(7, "Cubic Identities: (a+b)³ and (a−b)³", 20,
                    description="Raise the bar to degree 3. (a+b)³ = a³ + 3a²b + 3ab² + b³ and its partner (a−b)³ = a³ − 3a²b + 3ab² − b³. These identities connect to Pascal's Triangle and open the door to factorisation of cubic polynomials.",
                    objectives=[
                        "State and expand (a+b)³ = a³ + 3a²b + 3ab² + b³",
                        "State and expand (a−b)³ = a³ − 3a²b + 3ab² − b³",
                        "Apply to compute cubes like 101³, 99³ mentally",
                        "Derive a³ + b³ and a³ − b³ from the cubic identities",
                        "Connect coefficients 1,3,3,1 to Pascal's Triangle row 3",
                    ])

        q(n7, QuestionType.MCQ,
          "Expand: (x + 2)³",
          {"A": "x³ + 8", "B": "x³ + 6x² + 12x + 8", "C": "x³ + 2x² + 4x + 8", "D": "x³ + 3x² + 3x + 8"},
          "B",
          hint="(a+b)³ = a³ + 3a²b + 3ab² + b³. a=x, b=2.",
          explanation="(x+2)³ = x³ + 3x²(2) + 3x(4) + 8 = x³ + 6x² + 12x + 8.",
          concept="Expanding (a+b)³")

        q(n7, QuestionType.MCQ,
          "Evaluate 101³ using (100+1)³. Which is correct?",
          {"A": "1030301", "B": "1030000", "C": "1010101", "D": "1003001"},
          "A",
          hint="(100+1)³ = 100³ + 3·100²·1 + 3·100·1² + 1³ = 1000000 + 30000 + 300 + 1.",
          explanation="101³ = (100+1)³ = 1000000 + 30000 + 300 + 1 = 1030301.",
          concept="Mental Computation Using (a+b)³")

        q(n7, QuestionType.FILL_BLANK,
          "In the expansion of (a−b)³, the sign pattern is: a³ ___ 3a²b + 3ab² ___ b³.",
          {"tip": "Alternate signs starting with −."},
          "−",
          hint="(a−b)³ = a³ − 3a²b + 3ab² − b³. Both middle signs are: − then +, then −.",
          explanation="(a−b)³ = a³ − 3a²b + 3ab² − b³. The signs alternate starting with − on the 3a²b term.",
          concept="Sign Pattern in (a−b)³")

        q(n7, QuestionType.MCQ,
          "Which identity do you get by adding (a+b)³ + (a−b)³?",
          {"A": "2a³ + 2b³", "B": "2a³ + 6ab²", "C": "2a³ − 6a²b", "D": "6a²b + 6ab²"},
          "B",
          hint="Add term by term and see which cancel.",
          explanation="(a+b)³ + (a−b)³ = (a³+3a²b+3ab²+b³) + (a³−3a²b+3ab²−b³) = 2a³ + 6ab² = 2a(a²+3b²). The 3a²b and b³ terms cancel.",
          concept="Adding Cubic Expansions")

        q(n7, QuestionType.MCQ,
          "From (a+b)³, derive a³ + b³ = ?",
          {"A": "(a+b)(a²+ab+b²)", "B": "(a+b)(a²−ab+b²)", "C": "(a−b)(a²+ab+b²)", "D": "(a+b)³ − 3ab"},
          "B",
          hint="a³+b³ = (a+b)³ − 3ab(a+b). Factor out (a+b).",
          explanation="(a+b)³ = a³+3a²b+3ab²+b³ = a³+b³ + 3ab(a+b). Rearranging: a³+b³ = (a+b)³ − 3ab(a+b) = (a+b)[(a+b)²−3ab] = (a+b)(a²+2ab+b²−3ab) = (a+b)(a²−ab+b²).",
          concept="Deriving a³+b³")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 8 — Sum and Difference of Cubes: a³+b³ and a³−b³
        # ═══════════════════════════════════════════════════════════════════
        n8 = lesson(8, "Sum and Difference of Cubes: a³+b³ and a³−b³", 20,
                    description="Two powerful factorisation identities for cubic expressions. a³ + b³ = (a+b)(a²−ab+b²) and a³ − b³ = (a−b)(a²+ab+b²). Memorise these and you can factorise any sum or difference of cubes instantly.",
                    objectives=[
                        "State a³+b³ = (a+b)(a²−ab+b²) and a³−b³ = (a−b)(a²+ab+b²)",
                        "Verify by expanding back",
                        "Factorise expressions like 8x³ + 27y³ and 64a³ − 125b³",
                        "Identify perfect cube terms in an expression",
                        "Use the identity to simplify algebraic fractions",
                    ])

        q(n8, QuestionType.MCQ,
          "Factorise: x³ − 27",
          {"A": "(x − 3)(x² + 3x + 9)", "B": "(x − 3)(x² − 3x + 9)", "C": "(x + 3)(x² − 3x + 9)", "D": "(x − 3)³"},
          "A",
          hint="27 = 3³. Use a³−b³ = (a−b)(a²+ab+b²).",
          explanation="x³−27 = x³−3³ = (x−3)(x²+3x+9). Here a=x, b=3: a²+ab+b² = x²+3x+9.",
          concept="Factorising a³−b³")

        q(n8, QuestionType.MCQ,
          "Factorise: 8x³ + 125y³",
          {"A": "(2x+5y)(4x²+10xy+25y²)", "B": "(2x+5y)(4x²−10xy+25y²)", "C": "(8x+125y)(x²−xy+y²)", "D": "(2x−5y)(4x²+10xy+25y²)"},
          "B",
          hint="8x³=(2x)³, 125y³=(5y)³. Use a³+b³=(a+b)(a²−ab+b²).",
          explanation="8x³+125y³ = (2x)³+(5y)³ = (2x+5y)((2x)²−(2x)(5y)+(5y)²) = (2x+5y)(4x²−10xy+25y²).",
          concept="Factorising a³+b³")

        q(n8, QuestionType.FILL_BLANK,
          "The second factor in a³−b³ = (a−b)(a²+___+b²) is:",
          {"tip": "Middle term of the quadratic factor."},
          "ab",
          hint="a³−b³ = (a−b)(a²+ab+b²). The middle term is +ab.",
          explanation="a³−b³ = (a−b)(a²+ab+b²). Note the + sign on ab, unlike the sum of cubes a³+b³ = (a+b)(a²−ab+b²) which has −ab.",
          concept="Sum vs Difference of Cubes Signs")

        q(n8, QuestionType.TRUE_FALSE,
          "a³ + b³ = (a + b)³",
          {},
          "False",
          hint="Try a=1, b=1: LHS = 2, RHS = 8.",
          explanation="a³+b³ = 1+1 = 2 but (a+b)³ = 2³ = 8. The correct factorisation is a³+b³ = (a+b)(a²−ab+b²).",
          concept="Common Misconception: Sum of Cubes")

        q(n8, QuestionType.MCQ,
          "Which of these expressions is NOT factorisable using a³+b³ or a³−b³?",
          {"A": "27a³ − 8b³", "B": "a³ + b³ + c³", "C": "x³ − 1", "D": "64m³ + n³"},
          "B",
          hint="a³+b³+c³ requires a different identity (involving 3abc).",
          explanation="a³+b³ and a³−b³ handle exactly two cube terms. The expression a³+b³+c³ needs the identity a³+b³+c³−3abc = (a+b+c)(a²+b²+c²−ab−bc−ca).",
          concept="Limits of Sum/Diff of Cubes")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 9 — LAB: Factorization Explorer
        # ═══════════════════════════════════════════════════════════════════
        n9 = lab(9, "Factorization Explorer Lab", 25, "FACTORIZATION_EXPLORER_LAB", required=2)

        # ═══════════════════════════════════════════════════════════════════
        # NODE 10 — Applying Identities: Numerical Computations & Proofs
        # ═══════════════════════════════════════════════════════════════════
        n10 = lesson(10, "Applying Identities: Numerical Computations & Proofs", 20,
                     description="Identities become powerful tools when applied to real calculations. Mental arithmetic with large numbers, simplifying complex algebraic expressions, and proving further results — this node ties together everything learnt and builds fluency through application.",
                     objectives=[
                         "Compute expressions like a² + b² given (a+b) and ab",
                         "Evaluate (a+b)³ and (a−b)³ given a+b and ab",
                         "Simplify fractions using identity factorisations",
                         "Prove numerical results using identities (e.g., 99³ + 1 = 100 × ...)",
                         "Select the most efficient identity for a given problem",
                     ])

        q(n10, QuestionType.MCQ,
          "If x + y = 5 and xy = 6, find x² + y².",
          {"A": "25", "B": "13", "C": "19", "D": "12"},
          "B",
          hint="x²+y² = (x+y)² − 2xy.",
          explanation="x²+y² = (x+y)² − 2xy = 25 − 12 = 13.",
          concept="x²+y² from (x+y) and xy")

        q(n10, QuestionType.MCQ,
          "If a − b = 4 and ab = 12, find a² + b².",
          {"A": "40", "B": "28", "C": "16", "D": "24"},
          "A",
          hint="a²+b² = (a−b)² + 2ab.",
          explanation="a²+b² = (a−b)² + 2ab = 16 + 24 = 40.",
          concept="x²+y² from (x−y) and xy")

        q(n10, QuestionType.MCQ,
          "Simplify: (x³ − 8) ÷ (x − 2)",
          {"A": "x² + 2", "B": "x² + 2x + 4", "C": "x² − 2x + 4", "D": "x² − 4"},
          "B",
          hint="x³−8 = x³−2³. Factorise using a³−b³.",
          explanation="x³−8 = (x−2)(x²+2x+4). Dividing by (x−2) gives x²+2x+4.",
          concept="Simplifying Fractions with Identities")

        q(n10, QuestionType.FILL_BLANK,
          "If x + 1/x = 5, then x² + 1/x² = (x + 1/x)² − 2 = ___.",
          {"tip": "25 − 2"},
          "23",
          hint="(x+1/x)² = x²+2+1/x² = 25. So x²+1/x² = 23.",
          explanation="(x+1/x)² = x² + 2(x)(1/x) + 1/x² = x² + 2 + 1/x² = 25. So x²+1/x² = 23.",
          concept="Reciprocal Expressions with Identities")

        q(n10, QuestionType.MCQ,
          "Using identities, prove 99³ + 1 is divisible by 100. Which identity helps?",
          {"A": "(a−b)²", "B": "a³+b³ = (a+b)(a²−ab+b²)", "C": "(a+b)³", "D": "(a+b)(a−b)"},
          "B",
          hint="99³ + 1³ = (99+1)(99²−99+1).",
          explanation="99³ + 1³ = (99+1)(99²−99·1+1²) = 100 × (9801−99+1) = 100 × 9703. Since 100 is a factor, it's divisible by 100.",
          concept="Divisibility via Identities")

        # ═══════════════════════════════════════════════════════════════════
        # NODE 11 — CHAPTER TEST
        # ═══════════════════════════════════════════════════════════════════
        n11 = test(11, "Algebraic Identities — Chapter Test", 40)

        q(n11, QuestionType.MCQ,
          "Which is the correct expansion of (2x − 3y)²?",
          {"A": "4x² − 6xy + 9y²", "B": "4x² − 12xy + 9y²", "C": "4x² + 12xy + 9y²", "D": "2x² − 12xy + 3y²"},
          "B",
          hint="(a−b)² = a² − 2ab + b². Middle term = 2(2x)(3y) = 12xy.",
          explanation="(2x−3y)² = 4x² − 2(2x)(3y) + 9y² = 4x² − 12xy + 9y².",
          concept="(a−b)²")

        q(n11, QuestionType.MCQ,
          "Factorise: 4a² − 36b²",
          {"A": "4(a−3b)²", "B": "(2a+6b)(2a−6b)", "C": "4(a+3b)(a−3b)", "D": "2(2a−9b²)"},
          "C",
          hint="Take out common factor 4 first, then use a²−b².",
          explanation="4a²−36b² = 4(a²−9b²) = 4(a+3b)(a−3b).",
          concept="Difference of Squares with Common Factor")

        q(n11, QuestionType.FILL_BLANK,
          "Evaluate 999² using (1000−1)²: 1000000 − 2000 + 1 = ___.",
          {"tip": "Subtract and add."},
          "998001",
          hint="1000000 − 2000 + 1 = 998001.",
          explanation="999² = (1000−1)² = 1000²−2(1000)(1)+1² = 1000000−2000+1 = 998001.",
          concept="Mental Computation")

        q(n11, QuestionType.MCQ,
          "If p + q = 7 and pq = 10, what is p³ + q³?",
          {"A": "133", "B": "343", "C": "217", "D": "147"},
          "A",
          hint="p³+q³ = (p+q)³ − 3pq(p+q) = 343 − 3(10)(7).",
          explanation="p³+q³ = (p+q)(p²−pq+q²) = (p+q)((p+q)²−3pq) = 7(49−30) = 7×19 = 133.",
          concept="Sum of Cubes from Sum and Product")

        q(n11, QuestionType.MCQ,
          "Factorise: 27x³ − 64",
          {"A": "(3x−4)(9x²+12x+16)", "B": "(3x−4)(9x²−12x+16)", "C": "(3x+4)(9x²−12x+16)", "D": "(27x−1)(x²+4x+64)"},
          "A",
          hint="27x³=(3x)³, 64=4³. Use a³−b³.",
          explanation="27x³−64 = (3x)³−4³ = (3x−4)((3x)²+(3x)(4)+4²) = (3x−4)(9x²+12x+16).",
          concept="Difference of Cubes")

        q(n11, QuestionType.MCQ,
          "What is the value of (a+b+c)² when a=1, b=2, c=3?",
          {"A": "14", "B": "36", "C": "49", "D": "44"},
          "B",
          hint="a+b+c = 6, so (a+b+c)² = 36.",
          explanation="(1+2+3)² = 6² = 36. We can verify: 1+4+9+2(2)+2(6)+2(3) = 14+4+12+6 = 36 ✓.",
          concept="(a+b+c)² Application")

        q(n11, QuestionType.MCQ,
          "Which identity has NO middle term?",
          {"A": "(a+b)²", "B": "(a−b)²", "C": "(a+b)(a−b)", "D": "(a+b)³"},
          "C",
          hint="The middle terms cancel when expanding (a+b)(a−b).",
          explanation="(a+b)(a−b) = a² − b². The +ab and −ab terms cancel, leaving no middle term.",
          concept="Identity Without Middle Term")

        q(n11, QuestionType.FILL_BLANK,
          "The coefficient of x²y in the expansion of (x+y)³ is ___.",
          {"tip": "Use (a+b)³ = a³+3a²b+3ab²+b³. The x²y term is 3a²b."},
          "3",
          hint="3a²b = 3x²y. Coefficient = 3.",
          explanation="(x+y)³ = x³ + 3x²y + 3xy² + y³. The x²y term has coefficient 3.",
          concept="Coefficient in Cubic Expansion")

        q(n11, QuestionType.TRUE_FALSE,
          "a³ − b³ = (a − b)³",
          {},
          "False",
          hint="Try a=2, b=1: LHS=7, RHS=1.",
          explanation="a³−b³ = (a−b)(a²+ab+b²) ≠ (a−b)³. For a=2, b=1: LHS=7 but (a−b)³=1.",
          concept="Difference of Cubes vs Cube of Difference")

        q(n11, QuestionType.MCQ,
          "If x² + y² = 29 and xy = 10, find (x + y)²:",
          {"A": "29", "B": "39", "C": "49", "D": "59"},
          "C",
          hint="(x+y)² = x²+y²+2xy = 29+20.",
          explanation="(x+y)² = x²+2xy+y² = 29+2(10) = 49. So x+y = ±7.",
          concept="Reconstructing (x+y)² from Components")

        # ═══════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════
        self.stdout.write("Creating flashcard decks...")

        prereq_deck = FlashcardDeck.objects.create(
            title='Algebraic Identities — Prerequisites',
            purpose=DeckPurpose.PREREQUISITE,
            course_unit=unit,
            learning_node=n1,
        )

        prereq_cards_data = [
            {
                "title": "What is an algebraic identity?",
                "body": "An equation that holds true for ALL values of the variables. Example: (a+b)² = a² + 2ab + b² is true for every a and b.",
                "type": FlashcardType.CONCEPT,
                "concept": "Identity Definition",
            },
            {
                "title": "How is an identity different from an equation?",
                "body": "An equation holds for specific values (2x=6 is only true for x=3). An identity holds for all values — it's a universal truth about algebraic form.",
                "type": FlashcardType.CONCEPT,
                "concept": "Identity vs Equation",
            },
            {
                "title": "What is a polynomial? What is its degree?",
                "body": "A polynomial in x is a sum of terms of the form axⁿ where n is a whole number. Its degree is the highest power of x present.",
                "type": FlashcardType.CONCEPT,
                "concept": "Polynomial Review",
            },
            {
                "title": "What is the distributive law?",
                "body": "a(b+c) = ab + ac. This is the fundamental rule used to expand all algebraic identities.",
                "type": FlashcardType.FORMULA,
                "concept": "Distributive Law",
            },
            {
                "title": "Perfect cube numbers",
                "body": "1³=1, 2³=8, 3³=27, 4³=64, 5³=125, 6³=216, 7³=343, 8³=512, 9³=729, 10³=1000. Recognising these speeds up factorisation.",
                "type": FlashcardType.MNEMONIC,
                "concept": "Perfect Cubes",
            },
        ]

        for i, cd in enumerate(prereq_cards_data):
            fc = Flashcard.objects.create(
                title=cd["title"],
                body=cd["body"],
                card_type=cd["type"],
                concept=cd["concept"],
                subject='Mathematics',
                chapter='Algebraic Identities',
                order=i,
            )
            DeckCard.objects.create(deck=prereq_deck, card=fc, order=i)

        formula_deck = FlashcardDeck.objects.create(
            title='Algebraic Identities — All Identities',
            purpose=DeckPurpose.POST_NODE,
            course_unit=unit,
            learning_node=n10,
        )

        formula_cards_data = [
            {
                "title": "(a+b)²",
                "body": "(a+b)² = a² + 2ab + b²\nGeometric proof: square of side (a+b) = 4 pieces: a², ab, ab, b²",
                "type": FlashcardType.FORMULA,
                "concept": "Square of Sum",
            },
            {
                "title": "(a−b)²",
                "body": "(a−b)² = a² − 2ab + b²\nOnly the sign of 2ab changes from (a+b)²",
                "type": FlashcardType.FORMULA,
                "concept": "Square of Difference",
            },
            {
                "title": "(a+b)(a−b)",
                "body": "(a+b)(a−b) = a² − b²\nNo middle term — used for fast mental multiplication: 52×48=(50+2)(50−2)=2496",
                "type": FlashcardType.FORMULA,
                "concept": "Difference of Squares",
            },
            {
                "title": "(a+b+c)²",
                "body": "(a+b+c)² = a²+b²+c² + 2ab + 2bc + 2ca\n6 terms: 3 squares + 3 cross-products",
                "type": FlashcardType.FORMULA,
                "concept": "Three-Term Square",
            },
            {
                "title": "(a+b)³",
                "body": "(a+b)³ = a³ + 3a²b + 3ab² + b³\nCoefficients 1,3,3,1 from Pascal's Triangle",
                "type": FlashcardType.FORMULA,
                "concept": "Cube of Sum",
            },
            {
                "title": "(a−b)³",
                "body": "(a−b)³ = a³ − 3a²b + 3ab² − b³\nSigns alternate: +,−,+,−",
                "type": FlashcardType.FORMULA,
                "concept": "Cube of Difference",
            },
            {
                "title": "a³ + b³",
                "body": "a³+b³ = (a+b)(a²−ab+b²)\nSign of middle term in bracket: MINUS",
                "type": FlashcardType.FORMULA,
                "concept": "Sum of Cubes",
            },
            {
                "title": "a³ − b³",
                "body": "a³−b³ = (a−b)(a²+ab+b²)\nSign of middle term in bracket: PLUS",
                "type": FlashcardType.FORMULA,
                "concept": "Difference of Cubes",
            },
        ]

        for i, cd in enumerate(formula_cards_data):
            fc = Flashcard.objects.create(
                title=cd["title"],
                body=cd["body"],
                card_type=cd["type"],
                concept=cd["concept"],
                subject='Mathematics',
                chapter='Algebraic Identities',
                order=i,
            )
            DeckCard.objects.create(deck=formula_deck, card=fc, order=i)

        # ═══════════════════════════════════════════════════════════════════
        # REVISION NODE
        # ═══════════════════════════════════════════════════════════════════
        RevisionNode.objects.create(
            path=path,
            title='Algebraic Identities — Chapter Revision',
            appears_after_node=n10,
            side='right',
            xp_reward=20,
            is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "\nAlgebraic Identities seeded successfully!\n"
            "  • 8 lesson nodes (orders 1,2,3,5,6,7,8,10)\n"
            "  • 2 lab nodes: IDENTITY_VISUALIZER_LAB (order=4), FACTORIZATION_EXPLORER_LAB (order=9)\n"
            "  • 1 chapter test (order=11, 10 questions)\n"
            "  • 5+5+5+5+5+5+5+5+10 = 50 questions total\n"
            "  • 2 flashcard decks (5 prereq + 8 formula cards) + 1 revision node\n"
            "  • Aligned with NCERT Ganita Manjari Class 9, Algebraic Identities (2026-27)\n"
            "  • Labs: IDENTITY_VISUALIZER_LAB, FACTORIZATION_EXPLORER_LAB"
        ))
