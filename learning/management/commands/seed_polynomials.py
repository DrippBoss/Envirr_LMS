from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 2 — Polynomials (NCERT Class 10, 2026-27 reduced syllabus)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 2 — Polynomials (NCERT 2026-27)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Polynomials', subject='Mathematics',
            class_grade='10', board='CBSE', order=2, icon='functions',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Polynomials', class_grade='10'
        )

        self.stdout.write("Wiping old nodes and flashcards for clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # ── Helpers ──────────────────────────────────────────────────────────────
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
                question_filter={'subject': 'Mathematics', 'chapter': 'Polynomials'},
            )

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 1 — Introduction to Polynomials
        # ═══════════════════════════════════════════════════════════════════════
        n1 = lesson(1, "Introduction to Polynomials", 10,
                    description="Meet the polynomial family \u2014 linear, quadratic, and cubic. Learn the vocabulary of degree, coefficient, and leading term, and how to evaluate a polynomial at a given point.",
                    objectives=[
                        "Define a polynomial in one variable and identify its terms",
                        "Classify polynomials by degree: linear (1), quadratic (2), cubic (3)",
                        "Find the value of a polynomial at a given point",
                        "Identify the leading coefficient and constant term",
                    ])

        q(n1, QuestionType.MCQ,
          "Which of the following is NOT a polynomial?",
          {"A": "x\u00b2 + 3x \u2212 5", "B": "2x\u00b3 \u2212 x + 7", "C": "x + 1/x", "D": "4"},
          "x + 1/x",
          hint="A polynomial allows only non-negative integer powers of the variable. 1/x = x\u207b\u00b9 is not allowed.",
          explanation="x + 1/x = x + x\u207b\u00b9 \u2014 the exponent \u22121 is negative, so this is NOT a polynomial.",
          concept="Definition of Polynomial")

        q(n1, QuestionType.MCQ,
          "The degree of the polynomial 3x\u2074 \u2212 2x\u00b2 + x \u2212 8 is:",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "4",
          hint="Degree = highest power of the variable.",
          explanation="The highest exponent of x is 4 (in the term 3x\u2074). So the degree is 4.",
          concept="Degree of a Polynomial")

        q(n1, QuestionType.MCQ,
          "A quadratic polynomial has degree:",
          {"A": "0", "B": "1", "C": "2", "D": "3"},
          "2",
          hint="Quad = square (power 2). Quadratic means degree exactly 2.",
          explanation="Linear = degree 1 (ax + b), Quadratic = degree 2 (ax\u00b2 + bx + c), Cubic = degree 3.",
          concept="Types of Polynomials")

        q(n1, QuestionType.FILL_BLANK,
          "The value of p(x) = x\u00b2 \u2212 3x + 2 at x = 1 is ___.",
          {"tip": "Substitute x = 1: p(1) = 1\u00b2 \u2212 3(1) + 2"},
          "0",
          hint="p(1) = 1 \u2212 3 + 2 = 0. This also means x = 1 is a zero of p(x).",
          explanation="p(1) = 1 \u2212 3 + 2 = 0. When p(a) = 0, a is called a zero of the polynomial.",
          concept="Value of a Polynomial")

        q(n1, QuestionType.REARRANGE,
          "Arrange the polynomial in standard (descending) form: 5 \u2212 4x + 3x\u00b2",
          {"chips": ["3x\u00b2", "\u2212", "4x", "+", "5"]},
          "3x\u00b2 \u2212 4x + 5",
          hint="Standard form: highest degree first, then descending powers.",
          explanation="Descending order: 3x\u00b2 (degree 2), then \u22124x (degree 1), then +5 (degree 0).",
          concept="Standard Form of a Polynomial")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 2 — Zeroes of a Polynomial
        # ═══════════════════════════════════════════════════════════════════════
        n2 = lesson(2, "Zeroes of a Polynomial", 15,
                    description="A zero (or root) of a polynomial p(x) is a value k where p(k) = 0. Learn to find zeroes algebraically and understand that a polynomial of degree n has at most n zeroes.",
                    objectives=[
                        "Define a zero of a polynomial precisely",
                        "Find the zero of a linear polynomial by setting p(x) = 0",
                        "Verify that a given value is a zero by substitution",
                        "State the maximum number of zeroes for polynomials by degree",
                    ])

        q(n2, QuestionType.MCQ,
          "The zero of the linear polynomial p(x) = 2x + 6 is:",
          {"A": "6", "B": "\u22126", "C": "3", "D": "\u22123"},
          "\u22123",
          hint="Set p(x) = 0: 2x + 6 = 0 \u2192 x = \u22123.",
          explanation="2x + 6 = 0 \u2192 2x = \u22126 \u2192 x = \u22123. Verify: p(\u22123) = 2(\u22123)+6 = \u22126+6 = 0 \u2713",
          concept="Zero of a Linear Polynomial")

        q(n2, QuestionType.MCQ,
          "p(x) = x\u00b2 \u2212 4. Is x = 2 a zero of p(x)?",
          {"A": "Yes, because p(2) = 0", "B": "No, because p(2) = 8", "C": "Yes, because degree is 2", "D": "No, because it is quadratic"},
          "Yes, because p(2) = 0",
          hint="Check: p(2) = 4 \u2212 4 = 0.",
          explanation="p(2) = (2)\u00b2 \u2212 4 = 4 \u2212 4 = 0, so x = 2 is indeed a zero.",
          concept="Verification of a Zero")

        q(n2, QuestionType.FILL_BLANK,
          "A polynomial of degree 3 (cubic) can have at most ___ zeroes.",
          {"tip": "The maximum number of zeroes equals the degree."},
          "3",
          hint="A polynomial of degree n has at most n zeroes. Cubic \u2192 degree 3 \u2192 at most 3 zeroes.",
          explanation="This is a key theorem: a polynomial of degree n has at most n real zeroes.",
          concept="Maximum Number of Zeroes")

        q(n2, QuestionType.MCQ,
          "For p(x) = (x \u2212 1)(x + 3), the zeroes are:",
          {"A": "1 and 3", "B": "\u22121 and 3", "C": "1 and \u22123", "D": "\u22121 and \u22123"},
          "1 and \u22123",
          hint="Set each factor to 0: x \u2212 1 = 0 gives x = 1; x + 3 = 0 gives x = \u22123.",
          explanation="Zeroes occur where (x\u22121)=0 \u2192 x=1, and (x+3)=0 \u2192 x=\u22123. Verify: p(1)=0\xd74=0 \u2713, p(\u22123)=(\u22124)(0)=0 \u2713",
          concept="Finding Zeroes from Factored Form")

        q(n2, QuestionType.MULTI_SELECT,
          "Select ALL values that are zeroes of p(x) = x\u00b2 \u2212 5x + 6:",
          {"choices": [
              {"id": 1, "text": "x = 0"},
              {"id": 2, "text": "x = 2"},
              {"id": 3, "text": "x = 3"},
              {"id": 4, "text": "x = 6"},
              {"id": 5, "text": "x = \u22122"},
          ]},
          "2,3",
          hint="p(2) = 4 \u2212 10 + 6 = 0 \u2713. p(3) = 9 \u2212 15 + 6 = 0 \u2713. Check the others.",
          explanation="p(2)=4\u221210+6=0 \u2713, p(3)=9\u221215+6=0 \u2713, p(0)=6\u22600, p(6)=36\u221230+6=12\u22600, p(\u22122)=4+10+6=20\u22600",
          concept="Zeroes of a Quadratic")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 3 — Geometrical Meaning of Zeroes
        # ═══════════════════════════════════════════════════════════════════════
        n3 = lesson(3, "Geometrical Meaning of Zeroes", 15,
                    description="The graph of a linear polynomial is a straight line; the graph of a quadratic is a parabola. The x-intercepts of the graph are exactly the zeroes. A quadratic can have 0, 1, or 2 zeroes depending on where the parabola intersects the x-axis.",
                    objectives=[
                        "Describe the graph of a linear polynomial (straight line, one x-intercept)",
                        "Describe the graph of a quadratic polynomial (parabola, opens up if a>0, down if a<0)",
                        "Relate the number of x-intercepts to the number of real zeroes",
                        "Identify whether a quadratic has 0, 1, or 2 zeroes from its discriminant",
                    ])

        q(n3, QuestionType.MCQ,
          "The graph of a linear polynomial ax + b (a \u2260 0) is:",
          {"A": "A parabola", "B": "A straight line", "C": "A circle", "D": "A cubic curve"},
          "A straight line",
          hint="Linear means degree 1. All degree-1 functions graph as straight lines.",
          explanation="y = ax + b is the slope-intercept form. It crosses the x-axis exactly once \u2014 giving exactly one zero.",
          concept="Graph of Linear Polynomial")

        q(n3, QuestionType.MCQ,
          "The graph of a quadratic polynomial ax\u00b2 + bx + c is called a:",
          {"A": "Hyperbola", "B": "Straight line", "C": "Parabola", "D": "Ellipse"},
          "Parabola",
          hint="Quadratics always produce the characteristic U-shaped (or \u2229-shaped) curve.",
          explanation="From NCERT Section 2.2. The graph of y = ax\u00b2 + bx + c is a parabola \u2014 opens upward if a > 0, downward if a < 0.",
          concept="Graph of Quadratic Polynomial")

        q(n3, QuestionType.MCQ,
          "A parabola touches the x-axis at exactly one point (vertex on x-axis). How many real zeroes does this quadratic have?",
          {"A": "0", "B": "1", "C": "2", "D": "Cannot be determined"},
          "1",
          hint="If the parabola is tangent to the x-axis, there is exactly one (repeated) zero.",
          explanation="When the vertex lies on the x-axis, the quadratic has one repeated zero. The graph touches but does not cross the x-axis.",
          concept="Zeroes from Graph \u2014 Tangent Case")

        q(n3, QuestionType.FILL_BLANK,
          "If the graph of a quadratic polynomial does not intersect the x-axis at all, the number of real zeroes is ___.",
          {"tip": "The parabola floats entirely above or below the x-axis."},
          "0",
          hint="No x-intercepts means no real values where p(x) = 0, i.e., zero real zeroes.",
          explanation="This happens when the discriminant b\u00b2 \u2212 4ac < 0. The parabola is entirely above (a>0) or below (a<0) the x-axis.",
          concept="Zeroes from Graph \u2014 No Real Zeroes")

        q(n3, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about the geometrical meaning of zeroes:",
          {"choices": [
              {"id": 1, "text": "A zero of p(x) is the x-coordinate of a point where the graph meets the x-axis"},
              {"id": 2, "text": "A quadratic graph can cross the x-axis at most 2 times"},
              {"id": 3, "text": "The graph of a linear polynomial always passes through the origin"},
              {"id": 4, "text": "A parabola opening upward (a > 0) can have 0, 1, or 2 real zeroes"},
              {"id": 5, "text": "If a quadratic (a > 0) has 2 zeroes, the vertex is below the x-axis"},
          ]},
          "1,2,4,5",
          hint="Statement 3 is false: p(x) = 2x + 6 does not pass through origin (p(0) = 6 \u2260 0).",
          explanation="1 \u2713 (definition) | 2 \u2713 (max zeroes = degree = 2) | 3 \u2717 (y-intercept = constant, can be non-zero) | 4 \u2713 (all three cases) | 5 \u2713 (vertex below x-axis + opens up \u2192 crosses twice)",
          concept="Geometrical Meaning of Zeroes")

        # ── LAB 1 (order=4) ──────────────────────────────────────────────────────
        lab(4, "Polynomial Grapher Lab", 25,
            lab_type="POLYNOMIAL_GRAPHER",
            lab_category=LabCategory.INTERACTIVE,
            required=3)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 5 — Zeroes of Linear & Quadratic Polynomials
        # ═══════════════════════════════════════════════════════════════════════
        n5 = lesson(5, "Zeroes of Linear & Quadratic Polynomials", 15,
                    description="Deepen the algebraic technique for finding zeroes. For linear p(x)=ax+b, the zero is \u2212b/a. For quadratic, use factorisation. Connect the graphical picture to the algebra.",
                    objectives=[
                        "Derive the zero of a linear polynomial as \u2212b/a",
                        "Find zeroes of a quadratic by factorisation",
                        "Verify zeroes satisfy p(zero) = 0",
                        "Understand that a constant polynomial (non-zero) has no zeroes",
                    ])

        q(n5, QuestionType.MCQ,
          "The zero of a linear polynomial p(x) = ax + b is:",
          {"A": "b/a", "B": "a/b", "C": "\u2212b/a", "D": "\u2212a/b"},
          "\u2212b/a",
          hint="ax + b = 0 \u2192 ax = \u2212b \u2192 x = \u2212b/a.",
          explanation="From NCERT Section 2.2. Setting ax + b = 0 and solving: x = \u2212b/a. This is the single zero of every linear polynomial.",
          concept="Zero of Linear Polynomial \u2014 Formula")

        q(n5, QuestionType.FILL_BLANK,
          "The zero of p(x) = 3x \u2212 9 is x = ___.",
          {"tip": "Set 3x \u2212 9 = 0 and solve for x."},
          "3",
          hint="3x \u2212 9 = 0 \u2192 3x = 9 \u2192 x = 3. Using formula: \u2212b/a = \u2212(\u22129)/3 = 9/3 = 3.",
          explanation="p(3) = 9 \u2212 9 = 0. \u2713",
          concept="Zero of Linear Polynomial")

        q(n5, QuestionType.MCQ,
          "How many zeroes does the constant polynomial p(x) = 7 have?",
          {"A": "0", "B": "1", "C": "7", "D": "Infinitely many"},
          "0",
          hint="p(x) = 7 never equals 0 for any x \u2014 the graph is a horizontal line at y = 7.",
          explanation="A non-zero constant has no zero. If p(x) = 7 then p(x) = 0 has no solution.",
          concept="Zeroes of Constant Polynomial")

        q(n5, QuestionType.REARRANGE,
          "Write the factored form of x\u00b2 \u2212 7x + 12 (factors in ascending order by root value):",
          {"chips": ["(x", "\u2212", "3)", "(x", "\u2212", "4)"]},
          "(x \u2212 3) (x \u2212 4)",
          hint="Find two numbers that multiply to 12 and add to \u22127: \u22123 and \u22124.",
          explanation="x\u00b2 \u2212 7x + 12 = (x \u2212 3)(x \u2212 4). Zeroes: x = 3 and x = 4.",
          concept="Factorisation to Find Zeroes")

        q(n5, QuestionType.FILL_BLANK,
          "The zeroes of p(x) = x\u00b2 \u2212 2x \u2212 8 are x = 4 and x = ___.",
          {"tip": "x\u00b2 \u2212 2x \u2212 8 = (x \u2212 4)(x + ?)"},
          "\u22122",
          hint="x\u00b2 \u2212 2x \u2212 8 = (x \u2212 4)(x + 2). So the zeroes are x = 4 and x = \u22122.",
          explanation="Factors: two numbers multiplying to \u22128 and adding to \u22122: +4 and \u22122. So (x\u22124)(x+2), zeroes are 4 and \u22122.",
          concept="Zeroes of Quadratic by Factorisation")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 6 — Relationship: Zeroes & Coefficients
        # ═══════════════════════════════════════════════════════════════════════
        n6 = lesson(6, "Relationship: Zeroes & Coefficients", 20,
                    description="For a quadratic p(x) = ax\u00b2 + bx + c with zeroes \u03b1 and \u03b2: their sum is \u2212b/a and their product is c/a. These elegant relationships connect the graph to the algebra.",
                    objectives=[
                        "State the sum of zeroes formula: \u03b1 + \u03b2 = \u2212b/a",
                        "State the product of zeroes formula: \u03b1\u03b2 = c/a",
                        "Apply both formulas to specific quadratics (integer-answer cases)",
                        "Verify the formulas by directly finding zeroes and computing sum/product",
                    ])

        q(n6, QuestionType.MCQ,
          "For ax\u00b2 + bx + c with zeroes \u03b1 and \u03b2, which of the following is correct?",
          {
              "A": "\u03b1 + \u03b2 = b/a and \u03b1\u03b2 = c/a",
              "B": "\u03b1 + \u03b2 = \u2212b/a and \u03b1\u03b2 = c/a",
              "C": "\u03b1 + \u03b2 = \u2212b/a and \u03b1\u03b2 = \u2212c/a",
              "D": "\u03b1 + \u03b2 = c/a and \u03b1\u03b2 = \u2212b/a",
          },
          "\u03b1 + \u03b2 = \u2212b/a and \u03b1\u03b2 = c/a",
          hint="Sum = \u2212(coefficient of x)/(leading coefficient). Product = constant term / leading coefficient.",
          explanation="From NCERT Section 2.3. Key formulae: sum of zeroes = \u2212b/a, product of zeroes = c/a. Note the negative sign only on the sum.",
          concept="Sum and Product of Zeroes \u2014 Formulae")

        q(n6, QuestionType.FILL_BLANK,
          "For p(x) = x\u00b2 \u2212 5x + 6, the sum of zeroes (\u03b1 + \u03b2) = ___.",
          {"tip": "Use \u03b1 + \u03b2 = \u2212b/a. Here a = 1, b = \u22125."},
          "5",
          hint="\u03b1 + \u03b2 = \u2212(\u22125)/1 = 5. Verify: the zeroes are 2 and 3, and 2 + 3 = 5 \u2713",
          explanation="a=1, b=\u22125, c=6. Sum = \u2212b/a = \u2212(\u22125)/1 = 5. (Zeroes are 2 and 3.)",
          concept="Sum of Zeroes")

        q(n6, QuestionType.FILL_BLANK,
          "For p(x) = x\u00b2 \u2212 5x + 6, the product of zeroes (\u03b1\u03b2) = ___.",
          {"tip": "Use \u03b1\u03b2 = c/a. Here a = 1, c = 6."},
          "6",
          hint="\u03b1\u03b2 = c/a = 6/1 = 6. Verify: zeroes are 2 and 3, and 2 \xd7 3 = 6 \u2713",
          explanation="a=1, b=\u22125, c=6. Product = c/a = 6/1 = 6. (Zeroes are 2 and 3.)",
          concept="Product of Zeroes")

        q(n6, QuestionType.MCQ,
          "For p(x) = 2x\u00b2 + 5x \u2212 3, the product of zeroes is:",
          {"A": "5/2", "B": "\u22125/2", "C": "\u22123/2", "D": "3/2"},
          "\u22123/2",
          hint="Product = c/a = \u22123/2.",
          explanation="a=2, b=5, c=\u22123. Product of zeroes = c/a = \u22123/2. Sum = \u2212b/a = \u22125/2.",
          concept="Product of Zeroes")

        q(n6, QuestionType.MULTI_SELECT,
          "For p(x) = 3x\u00b2 \u2212 x \u2212 2, select ALL correct statements:",
          {"choices": [
              {"id": 1, "text": "Sum of zeroes = 1/3"},
              {"id": 2, "text": "Product of zeroes = \u22122/3"},
              {"id": 3, "text": "Sum of zeroes = \u22121/3"},
              {"id": 4, "text": "Product of zeroes = 2/3"},
              {"id": 5, "text": "The zeroes are 1 and \u22122/3"},
          ]},
          "1,2,5",
          hint="a=3, b=\u22121, c=\u22122. Sum = \u2212(\u22121)/3 = 1/3. Product = \u22122/3.",
          explanation="Sum=\u2212b/a=1/3 \u2713, Product=c/a=\u22122/3 \u2713. Zeroes: 3x\u00b2\u2212x\u22122=(3x+2)(x\u22121), so x=1 and x=\u22122/3 \u2713",
          concept="Sum and Product of Zeroes \u2014 Verification")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 7 — Forming a Polynomial from Its Zeroes
        # ═══════════════════════════════════════════════════════════════════════
        n7 = lesson(7, "Forming a Polynomial from Its Zeroes", 20,
                    description="Given the zeroes \u03b1 and \u03b2, you can reconstruct the quadratic: p(x) = k[x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2] for any non-zero k. The standard form uses k = 1.",
                    objectives=[
                        "Apply the formula p(x) = x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2 to construct a quadratic",
                        "Handle cases where zeroes are fractions, integers, or one is zero",
                        "Verify the reconstructed polynomial has the given zeroes",
                        "Understand that infinitely many quadratics share the same zeroes (the k factor)",
                    ])

        q(n7, QuestionType.MCQ,
          "A quadratic polynomial with zeroes \u03b1 and \u03b2 can be written as:",
          {
              "A": "x\u00b2 + (\u03b1+\u03b2)x + \u03b1\u03b2",
              "B": "x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2",
              "C": "x\u00b2 \u2212 (\u03b1+\u03b2)x \u2212 \u03b1\u03b2",
              "D": "x\u00b2 + (\u03b1+\u03b2)x \u2212 \u03b1\u03b2",
          },
          "x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2",
          hint="Expand (x\u2212\u03b1)(x\u2212\u03b2) = x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2.",
          explanation="(x \u2212 \u03b1)(x \u2212 \u03b2) = x\u00b2 \u2212 \u03b2x \u2212 \u03b1x + \u03b1\u03b2 = x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2. This is the standard reconstruction formula.",
          concept="Forming a Polynomial from Zeroes")

        q(n7, QuestionType.FILL_BLANK,
          "A quadratic with zeroes 3 and \u22122 is p(x) = x\u00b2 \u2212 ___x \u2212 6.",
          {"tip": "Sum = 3 + (\u22122) = 1. So the coefficient of x is \u2212(sum) = \u22121."},
          "1",
          hint="Sum of zeroes = 3 + (\u22122) = 1. Product = 3 \xd7 (\u22122) = \u22126. So p(x) = x\u00b2 \u2212 1x \u2212 6.",
          explanation="p(x) = x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2 = x\u00b2 \u2212 (1)x + (\u22126) = x\u00b2 \u2212 x \u2212 6.",
          concept="Forming Polynomial \u2014 Integer Zeroes")

        q(n7, QuestionType.MCQ,
          "Find the quadratic polynomial with zeroes 1/2 and \u22121. (Take k = 2 to clear fractions.)",
          {"A": "2x\u00b2 + x \u2212 1", "B": "2x\u00b2 \u2212 x \u2212 1", "C": "2x\u00b2 + x + 1", "D": "x\u00b2 \u2212 x \u2212 1"},
          "2x\u00b2 + x \u2212 1",
          hint="Sum = 1/2 + (\u22121) = \u22121/2. Product = (1/2)(\u22121) = \u22121/2. With k=2: 2x\u00b2 + x \u2212 1.",
          explanation="Sum = \u22121/2, Product = \u22121/2. Polynomial = k(x\u00b2 + x/2 \u2212 1/2). k=2 gives 2x\u00b2 + x \u2212 1. Verify: p(1/2)=0 \u2713, p(\u22121)=0 \u2713.",
          concept="Forming Polynomial \u2014 Fraction Zeroes")

        q(n7, QuestionType.REARRANGE,
          "Arrange the standard reconstruction formula for a quadratic with zeroes \u03b1 and \u03b2:",
          {"chips": ["x\u00b2", "\u2212", "(\u03b1+\u03b2)x", "+", "\u03b1\u03b2"]},
          "x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2",
          hint="Derived by expanding (x \u2212 \u03b1)(x \u2212 \u03b2).",
          explanation="(x\u2212\u03b1)(x\u2212\u03b2) = x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2. The minus sign before the sum and plus before the product are key.",
          concept="Reconstruction Formula")

        q(n7, QuestionType.MCQ,
          "A quadratic polynomial has zeroes \u22123 and 4. Sum = 1, product = \u221212. Which polynomial matches?",
          {"A": "x\u00b2 + x \u2212 12", "B": "x\u00b2 \u2212 x + 12", "C": "x\u00b2 \u2212 x \u2212 12", "D": "x\u00b2 + x + 12"},
          "x\u00b2 \u2212 x \u2212 12",
          hint="p(x) = x\u00b2 \u2212 (sum)x + (product) = x\u00b2 \u2212 (1)x + (\u221212) = x\u00b2 \u2212 x \u2212 12.",
          explanation="Sum = \u22123 + 4 = 1, Product = (\u22123)(4) = \u221212. So p(x) = x\u00b2 \u2212 x \u2212 12. Verify: p(4)=16\u22124\u221212=0 \u2713, p(\u22123)=9+3\u221212=0 \u2713.",
          concept="Forming Polynomial from Zeroes")

        # ── LAB 2 (order=8) ──────────────────────────────────────────────────────
        lab(8, "Zeroes & Coefficients Explorer Lab", 25,
            lab_type="ZEROES_COEFF_EXPLORER",
            lab_category=LabCategory.INTERACTIVE,
            required=6)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 9 — Applications & Verification
        # ═══════════════════════════════════════════════════════════════════════
        n9 = lesson(9, "Applications & Verification", 20,
                    description="Apply the zeroes-coefficients relationships to reverse problems: given one zero, find the other; given sum and product, find the polynomial; verify relationships for NCERT examples.",
                    objectives=[
                        "Given one zero and the polynomial, find the second zero using the formula",
                        "Verify that computed zeroes satisfy both the sum and product relations",
                        "Construct polynomials from given sum and product conditions",
                        "Solve NCERT Exercise 2.2 style problems",
                    ])

        q(n9, QuestionType.MCQ,
          "If one zero of p(x) = 2x\u00b2 \u2212 5x + k is 2, find k.",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "2",
          hint="Substitute x = 2: 2(4) \u2212 5(2) + k = 0 \u2192 8 \u2212 10 + k = 0 \u2192 k = 2.",
          explanation="p(2) = 0 \u2192 2(4)\u22125(2)+k=0 \u2192 8\u221210+k=0 \u2192 k=2.",
          concept="Finding Unknown Coefficient")

        q(n9, QuestionType.FILL_BLANK,
          "For p(x) = x\u00b2 \u2212 3x + 2 with zeroes 1 and 2, the product 1 \xd7 2 = ___. (Verify \u03b1\u03b2 = c/a.)",
          {"tip": "Directly multiply the two zeroes."},
          "2",
          hint="1 \xd7 2 = 2. And c/a = 2/1 = 2. Both match \u2713.",
          explanation="Zeroes: 1 and 2. Product \u03b1\u03b2 = 2. Formula: c/a = 2/1 = 2. Sum \u03b1+\u03b2 = 3 = \u2212b/a = \u2212(\u22123)/1 = 3. Both verified.",
          concept="Verification of Zeroes-Coefficients Relation")

        q(n9, QuestionType.MCQ,
          "One zero of p(x) = x\u00b2 \u2212 7x + 10 is 5. Using the product formula \u03b1\u03b2 = c/a, what is the other zero?",
          {"A": "1", "B": "2", "C": "3", "D": "7"},
          "2",
          hint="\u03b1\u03b2 = c/a = 10/1 = 10. If one zero is 5, then 5 \xd7 \u03b2 = 10 \u2192 \u03b2 = 2.",
          explanation="Product of zeroes = 10. One zero = 5. So other zero = 10 \xf7 5 = 2. Verify: sum = 5 + 2 = 7 = \u2212(\u22127)/1 \u2713.",
          concept="Finding the Other Zero")

        q(n9, QuestionType.MULTI_SELECT,
          "Which of the following quadratics have sum of zeroes = 0?",
          {"choices": [
              {"id": 1, "text": "x\u00b2 \u2212 9"},
              {"id": 2, "text": "x\u00b2 + 4"},
              {"id": 3, "text": "x\u00b2 \u2212 3x + 2"},
              {"id": 4, "text": "x\u00b2 \u2212 16"},
              {"id": 5, "text": "2x\u00b2 + 0x \u2212 8"},
          ]},
          "1,2,4,5",
          hint="Sum of zeroes = \u2212b/a. Sum = 0 when b = 0 (no x term).",
          explanation="Sum=0 iff b=0. x\u00b2\u22129: b=0 \u2713 | x\u00b2+4: b=0 \u2713 | x\u00b2\u22123x+2: b=\u22123\u22600 \u2717 | x\u00b2\u221216: b=0 \u2713 | 2x\u00b2+0x\u22128: b=0 \u2713",
          concept="Zero Sum Condition")

        q(n9, QuestionType.FILL_BLANK,
          "The quadratic with sum of zeroes = \u22121 and product of zeroes = \u22126 is p(x) = x\u00b2 + x \u2212 ___.",
          {"tip": "p(x) = x\u00b2 \u2212 (sum)x + (product) = x\u00b2 \u2212 (\u22121)x + (\u22126) = x\u00b2 + x \u2212 ?"},
          "6",
          hint="p(x) = x\u00b2 \u2212 (\u22121)x + (\u22126) = x\u00b2 + x \u2212 6.",
          explanation="Sum = \u22121, Product = \u22126. p(x) = x\u00b2 + x \u2212 6. Zeroes are \u22123 and 2: (\u22123)+2=\u22121 \u2713, (\u22123)(2)=\u22126 \u2713.",
          concept="Constructing Polynomial from Sum and Product")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 10 — Chapter Test
        # ═══════════════════════════════════════════════════════════════════════
        nt = test(10, "Polynomials \u2014 Chapter 2 Final Assessment", 50)

        q(nt, QuestionType.MCQ,
          "Which expression is a polynomial?",
          {"A": "\u221ax + 3", "B": "x\u00b2 + 2x \u2212 5", "C": "1/x + x", "D": "x^(1/2)"},
          "x\u00b2 + 2x \u2212 5",
          hint="Only non-negative integer exponents are allowed in a polynomial.",
          explanation="x\u00b2 + 2x \u2212 5 has degrees 2, 1, 0 \u2014 all non-negative integers. The others involve fractional or negative exponents.",
          concept="Definition of Polynomial")

        q(nt, QuestionType.MCQ,
          "The number of zeroes of p(x) = (x \u2212 2)(x + 1)(x \u2212 5) is:",
          {"A": "1", "B": "2", "C": "3", "D": "0"},
          "3",
          hint="Each factor (x \u2212 a) gives one zero.",
          explanation="Zeroes at x = 2, x = \u22121, x = 5. Three distinct zeroes.",
          concept="Number of Zeroes")

        q(nt, QuestionType.FILL_BLANK,
          "The zero of p(x) = 5x + 15 is x = ___.",
          {"tip": "5x + 15 = 0 \u2192 x = ?"},
          "\u22123",
          hint="5x = \u221215 \u2192 x = \u22123. Formula: \u2212b/a = \u221215/5 = \u22123.",
          explanation="p(\u22123) = 5(\u22123) + 15 = \u221215 + 15 = 0 \u2713.",
          concept="Zero of Linear Polynomial")

        q(nt, QuestionType.MCQ,
          "For p(x) = x\u00b2 + 2x + 1, which best describes the graph?",
          {
              "A": "Crosses the x-axis at two distinct points",
              "B": "Touches the x-axis at exactly one point",
              "C": "Does not intersect the x-axis",
              "D": "Is a straight line",
          },
          "Touches the x-axis at exactly one point",
          hint="Discriminant: b\u00b2 \u2212 4ac = 4 \u2212 4 = 0. One repeated zero.",
          explanation="p(x) = (x+1)\u00b2. Discriminant = 4 \u2212 4(1)(1) = 0. One repeated zero at x = \u22121. Graph is tangent to x-axis.",
          concept="Graph and Discriminant")

        q(nt, QuestionType.FILL_BLANK,
          "For p(x) = 2x\u00b2 \u2212 8x + 6, the sum of zeroes \u03b1 + \u03b2 = ___.",
          {"tip": "Sum = \u2212b/a = \u2212(\u22128)/2"},
          "4",
          hint="\u03b1 + \u03b2 = \u2212b/a = 8/2 = 4.",
          explanation="a=2, b=\u22128. Sum = \u2212(\u22128)/2 = 4. Product = c/a = 6/2 = 3. Zeroes are 1 and 3.",
          concept="Sum of Zeroes")

        q(nt, QuestionType.MCQ,
          "For p(x) = 3x\u00b2 + 7x \u2212 6, the product of its zeroes is:",
          {"A": "7/3", "B": "\u22127/3", "C": "2", "D": "\u22122"},
          "\u22122",
          hint="Product = c/a = \u22126/3 = \u22122.",
          explanation="a=3, b=7, c=\u22126. Product = c/a = \u22126/3 = \u22122.",
          concept="Product of Zeroes")

        q(nt, QuestionType.REARRANGE,
          "Arrange the formula for a quadratic polynomial formed from zeroes \u03b1 and \u03b2:",
          {"chips": ["x\u00b2", "\u2212", "(\u03b1+\u03b2)", "x", "+", "\u03b1\u03b2"]},
          "x\u00b2 \u2212 (\u03b1+\u03b2) x + \u03b1\u03b2",
          hint="Expand (x \u2212 \u03b1)(x \u2212 \u03b2).",
          explanation="Standard reconstruction formula: x\u00b2 \u2212 (sum)x + (product).",
          concept="Reconstruction Formula")

        q(nt, QuestionType.MCQ,
          "Find the quadratic polynomial whose zeroes are \u221a2 and \u2212\u221a2.",
          {
              "A": "x\u00b2 + 2",
              "B": "x\u00b2 \u2212 2",
              "C": "x\u00b2 \u2212 \u221a2",
              "D": "x\u00b2 + \u221a2 x \u2212 2",
          },
          "x\u00b2 \u2212 2",
          hint="Sum = \u221a2 + (\u2212\u221a2) = 0. Product = (\u221a2)(\u2212\u221a2) = \u22122. p(x) = x\u00b2 \u2212 2.",
          explanation="Sum = 0 (b = 0), Product = \u22122. p(x) = x\u00b2 \u2212 2. Verify: p(\u221a2) = 2 \u2212 2 = 0 \u2713.",
          concept="Forming Polynomial from Zeroes")

        q(nt, QuestionType.MULTI_SELECT,
          "Select ALL true statements about a quadratic ax\u00b2 + bx + c with zeroes \u03b1 and \u03b2:",
          {"choices": [
              {"id": 1, "text": "\u03b1 + \u03b2 = \u2212b/a"},
              {"id": 2, "text": "\u03b1\u03b2 = b/a"},
              {"id": 3, "text": "\u03b1\u03b2 = c/a"},
              {"id": 4, "text": "\u03b1 + \u03b2 = c/a"},
              {"id": 5, "text": "The graph is a parabola"},
              {"id": 6, "text": "A quadratic always has exactly 2 real zeroes"},
          ]},
          "1,3,5",
          hint="\u03b1\u03b2 = c/a (not b/a). A quadratic can have 0, 1, or 2 real zeroes.",
          explanation="1 \u2713 (sum formula) | 2 \u2717 (product is c/a not b/a) | 3 \u2713 (product formula) | 4 \u2717 (sum is \u2212b/a not c/a) | 5 \u2713 (always parabola) | 6 \u2717 (can have 0 or 1 real zeroes)",
          concept="Zeroes and Coefficients \u2014 True/False")

        q(nt, QuestionType.MCQ,
          "One zero of p(x) = x\u00b2 \u2212 4x + k is 1. Find k.",
          {"A": "2", "B": "3", "C": "4", "D": "5"},
          "3",
          hint="p(1) = 0 \u2192 1 \u2212 4 + k = 0 \u2192 k = 3.",
          explanation="p(1) = 0: (1)\u00b2 \u2212 4(1) + k = 0 \u2192 1 \u2212 4 + k = 0 \u2192 k = 3. Other zero: product = k/1 = 3, so other zero = 3.",
          concept="Finding Unknown Coefficient")

        # ═══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════════
        prereq_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Polynomials \u2014 Prerequisites",
            purpose=DeckPurpose.PREREQUISITE,
        )
        for title, body, concept in [
            ("What is a polynomial?",
             "An expression a\u2099x\u207f + \u2026 + a\u2081x + a\u2080 where each exponent is a non-negative integer. Examples: x\u00b2+3x\u22125, 4x\u00b3\u22122. Non-examples: x+1/x, \u221ax.",
             "Definition of Polynomial"),
            ("Types of polynomials by degree",
             "Degree 0: Constant | Degree 1: Linear (ax+b) | Degree 2: Quadratic (ax\u00b2+bx+c) | Degree 3: Cubic",
             "Types of Polynomials"),
            ("What is a zero of a polynomial?",
             "A value k such that p(k) = 0. Geometrically: x-coordinate where graph meets x-axis. A degree-n polynomial has at most n zeroes.",
             "Zeroes of a Polynomial"),
            ("Parabola basics",
             "Graph of ax\u00b2+bx+c. Opens up if a>0, down if a<0. Can have 0, 1, or 2 x-intercepts (real zeroes).",
             "Geometrical Meaning"),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.CONCEPT,
                subject="Mathematics", chapter="Polynomials", concept=concept,
            )
            DeckCard.objects.create(deck=prereq_deck, card=card,
                                    order=DeckCard.objects.filter(deck=prereq_deck).count() + 1)

        post_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Zeroes & Coefficients \u2014 Key Formulae",
            purpose=DeckPurpose.POST_NODE,
        )
        for title, body, concept in [
            ("Sum of zeroes formula",
             "For ax\u00b2+bx+c with zeroes \u03b1, \u03b2:\n\u03b1 + \u03b2 = \u2212b/a\nExample: x\u00b2\u22125x+6 \u2192 \u03b1+\u03b2 = 5",
             "Sum of Zeroes"),
            ("Product of zeroes formula",
             "For ax\u00b2+bx+c with zeroes \u03b1, \u03b2:\n\u03b1\u03b2 = c/a\nExample: x\u00b2\u22125x+6 \u2192 \u03b1\u03b2 = 6",
             "Product of Zeroes"),
            ("Reconstruction formula",
             "Given zeroes \u03b1 and \u03b2:\np(x) = x\u00b2 \u2212 (\u03b1+\u03b2)x + \u03b1\u03b2\n(or k times this for any k\u22600)",
             "Forming Polynomial from Zeroes"),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.FORMULA,
                subject="Mathematics", chapter="Polynomials", concept=concept,
            )
            DeckCard.objects.create(deck=post_deck, card=card,
                                    order=DeckCard.objects.filter(deck=post_deck).count() + 1)

        RevisionNode.objects.create(
            path=path,
            title="Polynomials Revision",
            appears_after_node=n9,
            side='right',
            xp_reward=20,
            is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "\nChapter 2 seeded successfully!\n"
            "  \u2022 7 lesson nodes (orders 1,2,3,5,6,7,9)\n"
            "  \u2022 2 lab nodes: POLYNOMIAL_GRAPHER (order=4, unlock after 3), ZEROES_COEFF_EXPLORER (order=8, unlock after 6)\n"
            "  \u2022 1 chapter test (order=10, 10 questions)\n"
            "  \u2022 35 lesson questions + 10 test questions\n"
            "  \u2022 2 flashcard decks + 1 revision node\n"
            "  \u2022 Aligned with NCERT Class 10 Chapter 2 (2026-27 reduced syllabus)"
        ))
