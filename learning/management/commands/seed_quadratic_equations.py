from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 4 \u2014 Quadratic Equations'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 4 \u2014 Quadratic Equations...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Quadratic Equations',
            subject='Mathematics',
            class_grade='10', board='CBSE', order=4, icon='functions',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Quadratic Equations', class_grade='10'
        )

        self.stdout.write("Wiping old nodes and flashcards for clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

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

        def test(order, title, xp, nq=12):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.CHAPTER_TEST, order=order,
                xp_reward=xp, test_question_count=nq, test_pass_percentage=70,
            )

        # ── Create nodes ──────────────────────────────────────────────────────
        n1  = lesson(1,  "Introduction to Quadratic Equations",          10, nq=5)
        n2  = lesson(2,  "Forming Quadratic Equations from Word Problems", 15, nq=5)
        n3  = lesson(3,  "Solution by Factorisation",                    20, nq=5)
        n4  = lab(4,     "Quadratic Roots Explorer", 25,
                         "QUADRATIC_ROOTS_LAB", LabCategory.INTERACTIVE, 3)
        n5  = lesson(5,  "Completing the Square",                        20, nq=5)
        n6  = lesson(6,  "The Quadratic Formula",                        20, nq=5)
        n7  = lesson(7,  "Nature of Roots and Discriminant",             25, nq=5)
        n8  = lab(8,     "Discriminant Explorer", 25,
                         "DISCRIMINANT_LAB", LabCategory.INTERACTIVE, 6)
        n9  = lesson(9,  "Applications and Word Problems",               20, nq=5)
        n10 = test(10,   "Quadratic Equations \u2014 Final Assessment",  50, nq=12)

        # ══════════════════════════════════════════════════════════════════════
        # NODE 1 — Introduction to Quadratic Equations
        # ══════════════════════════════════════════════════════════════════════

        q(n1, QuestionType.MCQ,
          "Which of the following is a quadratic equation?",
          {"A": "3x+5=0", "B": "x\u00b2+3x+2=0", "C": "x\u00b3\u22122x=0", "D": "1/x+x=2"},
          "x\u00b2+3x+2=0",
          explanation="A quadratic equation has degree exactly 2 in the form ax\u00b2+bx+c=0 with a\u22600.",
          concept="Definition of Quadratic Equation")

        q(n1, QuestionType.MCQ,
          "The standard form of a quadratic equation is:",
          {"A": "ax+b=0", "B": "ax\u00b2+bx+c=0", "C": "ax\u00b3+bx\u00b2+cx+d=0", "D": "ax\u00b2+bx=0"},
          "ax\u00b2+bx+c=0",
          explanation="ax\u00b2+bx+c=0 where a, b, c are real numbers and a\u22600. ax\u00b2+bx=0 is only a special case with c=0.",
          concept="Standard Form ax\u00b2+bx+c=0")

        q(n1, QuestionType.MCQ,
          "In 3x\u00b2\u22125x+2=0, the value of b (coefficient of x) is:",
          {"A": "3", "B": "\u22125", "C": "2", "D": "5"},
          "\u22125",
          explanation="Comparing with ax\u00b2+bx+c=0: a=3, b=\u22125, c=2.",
          concept="Identifying a, b, c")

        q(n1, QuestionType.MCQ,
          "Which is NOT a quadratic equation after simplification?",
          {"A": "(x+1)\u00b2=2(x\u22123)",
           "B": "x(x+1)+8=(x+2)(x\u22122)",
           "C": "x(2x+3)=x\u00b2+1",
           "D": "(x+2)\u00b3=x\u00b3\u22124"},
          "x(x+1)+8=(x+2)(x\u22122)",
          explanation="Expanding: x\u00b2+x+8=x\u00b2\u22124 \u2192 x+12=0. This is linear (degree 1), not quadratic.",
          concept="Identifying Quadratic Equations")

        q(n1, QuestionType.FILL_BLANK,
          "The maximum number of roots a quadratic equation can have is ___.",
          {"tip": "A degree-2 polynomial has at most how many zeroes?"},
          "2",
          concept="Number of Roots")

        q(n1, QuestionType.FILL_BLANK,
          "In 2x\u00b2+x\u2212300=0, the constant term c = ___.",
          {"tip": "Identify the term with no x variable in ax\u00b2+bx+c=0"},
          "\u2212300",
          concept="Identifying a, b, c")

        q(n1, QuestionType.FILL_BLANK,
          "Simplify x(2x+3)=x\u00b2+1 to standard form ax\u00b2+bx+c=0. The value of a is ___.",
          {"tip": "LHS=2x\u00b2+3x. Subtract x\u00b2+1: x\u00b2+3x\u22121=0. What is the coefficient of x\u00b2?"},
          "1",
          concept="Reducing to Standard Form")

        q(n1, QuestionType.MULTI_SELECT,
          "Select ALL quadratic equations:",
          {"choices": [
              {"id": 1, "text": "2x\u00b2\u22123x+1=0"},
              {"id": 2, "text": "x(x+1)+8=(x+2)(x\u22122)"},
              {"id": 3, "text": "(x\u22122)\u00b2+1=2x\u22123"},
              {"id": 4, "text": "x(2x+3)=x\u00b2+1"},
              {"id": 5, "text": "(x+2)\u00b3=x\u00b3\u22124"},
          ]},
          "1,3,4,5",
          explanation="id2 reduces to x+12=0 (linear). id1: yes. id3: x\u00b2\u22126x+8=0 yes. id4: x\u00b2+3x\u22121=0 yes. id5: 6x\u00b2+12x+12=0 yes.",
          concept="Identifying Quadratic Equations")

        q(n1, QuestionType.REARRANGE,
          "Rearrange (x\u22122)\u00b2+1=2x\u22123 into standard form:",
          {"chips": ["x\u00b2", "\u2212", "6x", "+", "8", "=", "0"]},
          "x\u00b2 \u2212 6x + 8 = 0",
          concept="Reducing to Standard Form")

        q(n1, QuestionType.REARRANGE,
          "Express 2x\u00b2+x=300 in standard form ax\u00b2+bx+c=0:",
          {"chips": ["2x\u00b2", "+", "x", "\u2212", "300", "=", "0"]},
          "2x\u00b2 + x \u2212 300 = 0",
          concept="Standard Form ax\u00b2+bx+c=0")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 2 — Forming Quadratic Equations from Word Problems
        # ══════════════════════════════════════════════════════════════════════

        q(n2, QuestionType.MCQ,
          "John and Jivanti have 45 marbles; both lose 5. Product of remaining = 124. Equation for John's count x:",
          {"A": "x\u00b2\u221245x+324=0",
           "B": "x\u00b2+45x+324=0",
           "C": "x\u00b2\u221245x\u2212124=0",
           "D": "x\u00b2+45x\u2212324=0"},
          "x\u00b2\u221245x+324=0",
          explanation="(x\u22125)(40\u2212x)=124 \u2192 \u2212x\u00b2+45x\u2212200=124 \u2192 x\u00b2\u221245x+324=0.",
          concept="Forming Equations from Word Problems")

        q(n2, QuestionType.MCQ,
          "Cottage produces x toys/day; each costs (55\u2212x) rupees; total = \u20b9750. Equation:",
          {"A": "x\u00b2\u221255x+750=0",
           "B": "x\u00b2+55x\u2212750=0",
           "C": "x\u00b2\u221255x\u2212750=0",
           "D": "55x+x\u00b2=750"},
          "x\u00b2\u221255x+750=0",
          explanation="x(55\u2212x)=750 \u2192 \u2212x\u00b2+55x=750 \u2192 x\u00b2\u221255x+750=0.",
          concept="Forming Equations from Word Problems")

        q(n2, QuestionType.MCQ,
          "Rectangular plot area=528 m\u00b2. Length=one more than twice breadth x. Equation:",
          {"A": "2x\u00b2+x\u2212528=0",
           "B": "x\u00b2+2x\u2212528=0",
           "C": "2x\u00b2+x+528=0",
           "D": "x\u00b2\u22122x\u2212528=0"},
          "2x\u00b2+x\u2212528=0",
          explanation="Length=2x+1. Area=x(2x+1)=528 \u2192 2x\u00b2+x\u2212528=0.",
          concept="Forming Equations from Word Problems")

        q(n2, QuestionType.MCQ,
          "Product of two consecutive positive integers is 306. If smaller is x, the equation is:",
          {"A": "x\u00b2+x\u2212306=0 only",
           "B": "x(x+1)=306 only",
           "C": "Both A and B represent the same equation",
           "D": "x\u00b2\u2212x=306"},
          "Both A and B represent the same equation",
          explanation="x(x+1)=306 expands to x\u00b2+x\u2212306=0.",
          concept="Forming Equations from Word Problems")

        q(n2, QuestionType.FILL_BLANK,
          "Rohan's mother is 26 years older. Product of ages 3 years from now=360. If Rohan=x, equation is x\u00b2+___x\u2212273=0.",
          {"tip": "Ages in 3 years: (x+3) and (x+29). Product=360 \u2192 x\u00b2+32x+87=360 \u2192 x\u00b2+32x\u2212273=0"},
          "32",
          concept="Forming Equations from Word Problems")

        q(n2, QuestionType.FILL_BLANK,
          "Train travels 480 km at speed v km/h. 8 km/h less \u2192 3 more hours. Equation: v\u00b2\u22128v\u2212___=0.",
          {"tip": "480/v+3=480/(v\u22128). Cross multiply: 3v(v\u22128)=480\u00d78 \u2192 v\u00b2\u22128v\u22121280=0"},
          "1280",
          concept="Forming Equations \u2014 Speed Problems")

        q(n2, QuestionType.FILL_BLANK,
          "Two numbers sum to 27 and product is 182. Equation: x\u00b2\u221227x+___=0.",
          {"tip": "x(27\u2212x)=182 \u2192 x\u00b2\u221227x+182=0"},
          "182",
          concept="Forming Equations from Word Problems")

        q(n2, QuestionType.MULTI_SELECT,
          "Which word problems lead to a quadratic equation?",
          {"choices": [
              {"id": 1, "text": "Product of two consecutive integers is known"},
              {"id": 2, "text": "Sum of two numbers equals 15 (only one condition)"},
              {"id": 3, "text": "Area of rectangle given with length in terms of breadth"},
              {"id": 4, "text": "Train speed with two time-distance conditions"},
              {"id": 5, "text": "A number added to 5 equals 8"},
          ]},
          "1,3,4",
          concept="Recognising Quadratic Word Problems")

        q(n2, QuestionType.REARRANGE,
          "For 'altitude of right triangle is 7 cm less than base, hypotenuse=13 cm', base=x. Form the equation:",
          {"chips": ["x\u00b2", "\u2212", "7x", "\u2212", "60", "=", "0"]},
          "x\u00b2 \u2212 7x \u2212 60 = 0",
          explanation="alt=x\u22127. x\u00b2+(x\u22127)\u00b2=169 \u2192 2x\u00b2\u221214x\u2212120=0 \u2192 x\u00b2\u22127x\u221260=0.",
          concept="Forming Equations \u2014 Pythagoras")

        q(n2, QuestionType.REARRANGE,
          "Arrange steps to form a quadratic from a word problem:",
          {"chips": [
              "Assign the unknown as x",
              "Express all quantities in terms of x",
              "Set up equation from the numerical constraint",
              "Expand and collect all terms to one side",
              "Verify a\u22600",
          ]},
          "Assign the unknown as x Express all quantities in terms of x Set up equation from the numerical constraint Expand and collect all terms to one side Verify a\u22600",
          concept="Problem-Solving Strategy")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 3 — Solution by Factorisation
        # ══════════════════════════════════════════════════════════════════════

        q(n3, QuestionType.MCQ,
          "To solve x\u00b2\u22125x+6=0 by splitting the middle term, we write \u22125x as:",
          {"A": "\u22122x and \u22123x", "B": "2x and \u22123x", "C": "\u22122x and 3x", "D": "\u22126x and x"},
          "\u22122x and \u22123x",
          explanation="Need p+q=\u22125 and pq=1\u00d76=6. Those are \u22122 and \u22123.",
          concept="Splitting the Middle Term")

        q(n3, QuestionType.MCQ,
          "Roots of x\u00b2\u22123x\u221210=0 by factorisation:",
          {"A": "3 and 10", "B": "\u22122 and 5", "C": "2 and \u22125", "D": "5 and 10"},
          "\u22122 and 5",
          explanation="(x\u22125)(x+2)=0 \u2192 x=5 or x=\u22122.",
          concept="Factorisation Method")

        q(n3, QuestionType.MCQ,
          "Roots of 2x\u00b2+x\u22126=0 are:",
          {"A": "3/2 and \u22122", "B": "\u22123/2 and 2", "C": "3 and \u22122", "D": "3/2 and 2"},
          "3/2 and \u22122",
          explanation="2x\u00b2+4x\u22123x\u22126=2x(x+2)\u22123(x+2)=(2x\u22123)(x+2). Roots: x=3/2 or x=\u22122.",
          concept="Factorisation Method")

        q(n3, QuestionType.MCQ,
          "If x=2 is a root of x\u00b2\u22125x+k=0, then k equals:",
          {"A": "\u22126", "B": "6", "C": "\u22122", "D": "2"},
          "6",
          explanation="Substitute x=2: 4\u221210+k=0 \u2192 k=6.",
          concept="Verifying a Root")

        q(n3, QuestionType.FILL_BLANK,
          "Roots of 100x\u00b2\u221220x+1=0. It factors as (10x\u22121)\u00b2. The repeated root is x=___.",
          {"tip": "Set 10x\u22121=0 \u2192 x=1/10"},
          "1/10",
          concept="Repeated Roots")

        q(n3, QuestionType.FILL_BLANK,
          "For x\u00b2\u22123x\u221210=0, factored form is (x\u22125)(x+___)=0.",
          {"tip": "(x\u22125)(x+k)=x\u00b2+(k\u22125)x\u22125k. Need \u22125k=\u221210 and k\u22125=\u22123."},
          "2",
          concept="Factorisation Method")

        q(n3, QuestionType.FILL_BLANK,
          "Two numbers sum=27, product=182. Solve x\u00b2\u221227x+182=0: roots are 13 and ___.",
          {"tip": "If one root is 13, other = 27\u221213 (sum of roots=27)"},
          "14",
          concept="Applying Factorisation to Word Problems")

        q(n3, QuestionType.FILL_BLANK,
          "For 2x\u00b2\u22125x+3=0, after factoring (2x\u22123)(x\u22121)=0, roots are x=3/2 and x=___.",
          {"tip": "Set x\u22121=0"},
          "1",
          concept="Factorisation Method")

        q(n3, QuestionType.MULTI_SELECT,
          "Which factored forms are correct?",
          {"choices": [
              {"id": 1, "text": "x\u00b2\u22123x\u221210=(x\u22125)(x+2)"},
              {"id": 2, "text": "2x\u00b2+x\u22126=(2x\u22123)(x+2)"},
              {"id": 3, "text": "6x\u00b2\u2212x\u22122=(3x\u22122)(2x+1)"},
              {"id": 4, "text": "x\u00b2\u22126x+8=(x\u22122)(x\u22124)"},
              {"id": 5, "text": "x\u00b2+5x+6=(x+1)(x+6)"},
          ]},
          "1,2,3,4",
          explanation="id5: (x+1)(x+6)=x\u00b2+7x+6\u2260x\u00b2+5x+6. All others are correct.",
          concept="Factorisation Method")

        q(n3, QuestionType.MULTI_SELECT,
          "Factorisation by splitting the middle term works easily when:",
          {"choices": [
              {"id": 1, "text": "The discriminant b\u00b2\u22124ac is a perfect square"},
              {"id": 2, "text": "Roots are rational numbers"},
              {"id": 3, "text": "Product ac has small factors"},
              {"id": 4, "text": "a=0"},
              {"id": 5, "text": "Two integers exist with product=ac and sum=b"},
          ]},
          "1,2,3,5",
          concept="When to Use Factorisation")

        q(n3, QuestionType.REARRANGE,
          "Solve x\u00b2\u22125x+6=0 by factorisation:",
          {"chips": [
              "Find p,q: pq=6 and p+q=\u22125 \u2192 p=\u22122, q=\u22123",
              "Split: x\u00b2\u22122x\u22123x+6=0",
              "Group: x(x\u22122)\u22123(x\u22122)=0",
              "(x\u22122)(x\u22123)=0",
              "x=2 or x=3",
          ]},
          "Find p,q: pq=6 and p+q=\u22125 \u2192 p=\u22122, q=\u22123 Split: x\u00b2\u22122x\u22123x+6=0 Group: x(x\u22122)\u22123(x\u22122)=0 (x\u22122)(x\u22123)=0 x=2 or x=3",
          concept="Factorisation Steps")

        q(n3, QuestionType.REARRANGE,
          "Solve prayer-hall equation 2x\u00b2+x\u2212300=0:",
          {"chips": [
              "Split: 2x\u00b2\u221224x+25x\u2212300=0",
              "2x(x\u221212)+25(x\u221212)=0",
              "(x\u221212)(2x+25)=0",
              "x=12 or x=\u221212.5",
              "x=12 m (breadth cannot be negative)",
          ]},
          "Split: 2x\u00b2\u221224x+25x\u2212300=0 2x(x\u221212)+25(x\u221212)=0 (x\u221212)(2x+25)=0 x=12 or x=\u221212.5 x=12 m (breadth cannot be negative)",
          concept="Factorisation Applied to Word Problems")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 5 — Completing the Square
        # ══════════════════════════════════════════════════════════════════════

        q(n5, QuestionType.MCQ,
          "To complete the square in x\u00b2+6x=5, we add ___ to both sides:",
          {"A": "3", "B": "6", "C": "9", "D": "36"},
          "9",
          explanation="(b/2)\u00b2=(6/2)\u00b2=9. Result: (x+3)\u00b2=14.",
          concept="Completing the Square")

        q(n5, QuestionType.MCQ,
          "x\u00b2+4x+___=(x+2)\u00b2. The blank is:",
          {"A": "2", "B": "4", "C": "8", "D": "16"},
          "4",
          explanation="(b/2)\u00b2=(4/2)\u00b2=4.",
          concept="Perfect Square Trinomial")

        q(n5, QuestionType.MCQ,
          "Solving x\u00b2+4x\u22125=0 by completing the square gives:",
          {"A": "x=1 or x=\u22125", "B": "x=\u22121 or x=5", "C": "x=2 or x=\u22125", "D": "x=1 or x=5"},
          "x=1 or x=\u22125",
          explanation="x\u00b2+4x=5 \u2192 (x+2)\u00b2=9 \u2192 x+2=\u00b13 \u2192 x=1 or x=\u22125.",
          concept="Completing the Square")

        q(n5, QuestionType.MCQ,
          "For 2x\u00b2+8x=1, divide by 2 first to get x\u00b2+4x=___.",
          {"A": "\u22121/2", "B": "1/2", "C": "2", "D": "\u22122"},
          "1/2",
          explanation="Divide 2x\u00b2+8x=1 by 2: x\u00b2+4x=1/2.",
          concept="Completing the Square \u2014 Non-unit Leading Coefficient")

        q(n5, QuestionType.FILL_BLANK,
          "For x\u00b2\u22126x+5=0 move constant: x\u00b2\u22126x=\u22125. Complete the square: (x\u22123)\u00b2=___.",
          {"tip": "Add (6/2)\u00b2=9 to both sides: (x\u22123)\u00b2=\u22125+9=4"},
          "4",
          concept="Completing the Square")

        q(n5, QuestionType.FILL_BLANK,
          "Solve x\u00b2+2x\u22123=0 by completing the square: (x+1)\u00b2=___.",
          {"tip": "x\u00b2+2x=3. Add (2/2)\u00b2=1: (x+1)\u00b2=3+1=4"},
          "4",
          concept="Completing the Square")

        q(n5, QuestionType.FILL_BLANK,
          "Completing the square derivation: after adding (b/2a)\u00b2 to x\u00b2+(b/a)x=\u2212c/a, RHS becomes ___.",
          {"tip": "\u2212c/a+b\u00b2/4a\u00b2=(b\u00b2\u22124ac)/4a\u00b2"},
          "(b\u00b2\u22124ac)/4a\u00b2",
          concept="Deriving the Quadratic Formula")

        q(n5, QuestionType.MULTI_SELECT,
          "Correct steps when completing the square for ax\u00b2+bx+c=0:",
          {"choices": [
              {"id": 1, "text": "Divide by a so x\u00b2 coefficient becomes 1"},
              {"id": 2, "text": "Move constant to right side"},
              {"id": 3, "text": "Add (b/2a)\u00b2 to both sides"},
              {"id": 4, "text": "Take \u00b1 square root of both sides"},
              {"id": 5, "text": "Method only works when b is even"},
          ]},
          "1,2,3,4",
          concept="Completing the Square Steps")

        q(n5, QuestionType.REARRANGE,
          "Complete the square to solve x\u00b2+6x+5=0:",
          {"chips": [
              "x\u00b2+6x=\u22125",
              "x\u00b2+6x+9=\u22125+9",
              "(x+3)\u00b2=4",
              "x+3=\u00b12",
              "x=\u22121 or x=\u22125",
          ]},
          "x\u00b2+6x=\u22125 x\u00b2+6x+9=\u22125+9 (x+3)\u00b2=4 x+3=\u00b12 x=\u22121 or x=\u22125",
          concept="Completing the Square")

        q(n5, QuestionType.REARRANGE,
          "Derive the quadratic formula from ax\u00b2+bx+c=0:",
          {"chips": [
              "Divide by a: x\u00b2+(b/a)x+c/a=0",
              "Move constant: x\u00b2+(b/a)x=\u2212c/a",
              "Add (b/2a)\u00b2: (x+b/2a)\u00b2=(b\u00b2\u22124ac)/4a\u00b2",
              "Take square root: x+b/2a=\u00b1\u221a(b\u00b2\u22124ac)/2a",
              "x=(\u2212b\u00b1\u221a(b\u00b2\u22124ac))/2a",
          ]},
          "Divide by a: x\u00b2+(b/a)x+c/a=0 Move constant: x\u00b2+(b/a)x=\u2212c/a Add (b/2a)\u00b2: (x+b/2a)\u00b2=(b\u00b2\u22124ac)/4a\u00b2 Take square root: x+b/2a=\u00b1\u221a(b\u00b2\u22124ac)/2a x=(\u2212b\u00b1\u221a(b\u00b2\u22124ac))/2a",
          concept="Deriving the Quadratic Formula")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 6 — The Quadratic Formula
        # ══════════════════════════════════════════════════════════════════════

        q(n6, QuestionType.MCQ,
          "The quadratic formula for ax\u00b2+bx+c=0 is:",
          {"A": "x=(\u2212b\u00b1\u221a(b\u00b2\u22124ac))/2a",
           "B": "x=(b\u00b1\u221a(b\u00b2+4ac))/2a",
           "C": "x=(\u2212b\u00b1\u221a(b\u00b2\u22124ac))/a",
           "D": "x=(b\u00b1\u221a(b\u00b2\u22124ac))/2a"},
          "x=(\u2212b\u00b1\u221a(b\u00b2\u22124ac))/2a",
          concept="Quadratic Formula")

        q(n6, QuestionType.MCQ,
          "Positive root of x\u00b2+7x\u221260=0 using the quadratic formula:",
          {"A": "3", "B": "4", "C": "5", "D": "6"},
          "5",
          explanation="D=49+240=289. \u221a289=17. x=(\u22127+17)/2=5 or (\u22127\u221217)/2=\u221212.",
          concept="Applying the Quadratic Formula")

        q(n6, QuestionType.MCQ,
          "For 2x\u00b2\u22124x+3=0, the discriminant is:",
          {"A": "\u22128", "B": "8", "C": "40", "D": "\u221240"},
          "\u22128",
          explanation="b\u00b2\u22124ac=(\u22124)\u00b2\u22124(2)(3)=16\u221224=\u22128.",
          concept="Computing the Discriminant")

        q(n6, QuestionType.MCQ,
          "Solve 3x\u00b2\u22122x+1/3=0. The roots are:",
          {"A": "1/3 and 1/3", "B": "\u22121/3 and \u22121/3", "C": "1/3 and \u22121/3", "D": "No real roots"},
          "1/3 and 1/3",
          explanation="D=4\u22124(3)(1/3)=4\u22124=0. x=2/6=1/3 (repeated).",
          concept="Quadratic Formula \u2014 Equal Roots")

        q(n6, QuestionType.FILL_BLANK,
          "For x\u00b2+7x\u221260=0: discriminant = 7\u00b2+4\u00d760 = ___.",
          {"tip": "b\u00b2\u22124ac=49\u22124(1)(\u221260)=49+240=289"},
          "289",
          concept="Computing the Discriminant")

        q(n6, QuestionType.FILL_BLANK,
          "\u221a289 = ___.",
          {"tip": "17\u00b2=289"},
          "17",
          concept="Computing the Discriminant")

        q(n6, QuestionType.FILL_BLANK,
          "Using formula: x=(\u22127\u00b117)/2 for x\u00b2+7x\u221260=0. Positive root = ___.",
          {"tip": "(\u22127+17)/2=10/2=5"},
          "5",
          concept="Applying the Quadratic Formula")

        q(n6, QuestionType.MULTI_SELECT,
          "The quadratic formula gives real roots when:",
          {"choices": [
              {"id": 1, "text": "b\u00b2\u22124ac > 0 (two distinct roots)"},
              {"id": 2, "text": "b\u00b2\u22124ac = 0 (one repeated root)"},
              {"id": 3, "text": "b\u00b2\u22124ac < 0 (no real roots)"},
              {"id": 4, "text": "a \u2260 0"},
              {"id": 5, "text": "b must be negative"},
          ]},
          "1,2,4",
          concept="Quadratic Formula Conditions")

        q(n6, QuestionType.REARRANGE,
          "Apply the quadratic formula to 2x\u00b2\u22125x+3=0:",
          {"chips": [
              "a=2, b=\u22125, c=3",
              "D=(\u22125)\u00b2\u22124(2)(3)=25\u221224=1",
              "x=(5\u00b11)/4",
              "x=6/4=3/2 or x=4/4=1",
              "Roots: 3/2 and 1",
          ]},
          "a=2, b=\u22125, c=3 D=(\u22125)\u00b2\u22124(2)(3)=25\u221224=1 x=(5\u00b11)/4 x=6/4=3/2 or x=4/4=1 Roots: 3/2 and 1",
          concept="Applying the Quadratic Formula")

        q(n6, QuestionType.REARRANGE,
          "Solve x\u00b2+2x\u221235=0 by the quadratic formula:",
          {"chips": [
              "D=4+140=144",
              "\u221aD=12",
              "x=(\u22122\u00b112)/2",
              "x=5 or x=\u22127",
          ]},
          "D=4+140=144 \u221aD=12 x=(\u22122\u00b112)/2 x=5 or x=\u22127",
          concept="Applying the Quadratic Formula")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 7 — Nature of Roots and Discriminant
        # ══════════════════════════════════════════════════════════════════════

        q(n7, QuestionType.MCQ,
          "If b\u00b2\u22124ac > 0, the equation ax\u00b2+bx+c=0 has:",
          {"A": "No real roots",
           "B": "Two equal real roots",
           "C": "Two distinct real roots",
           "D": "Infinitely many roots"},
          "Two distinct real roots",
          concept="Nature of Roots")

        q(n7, QuestionType.MCQ,
          "If the discriminant equals zero, the quadratic equation has:",
          {"A": "Irrational roots",
           "B": "No real solution",
           "C": "Two equal real roots",
           "D": "Complex roots"},
          "Two equal real roots",
          explanation="D=0 means x=\u2212b/2a \u2014 one repeated root.",
          concept="Nature of Roots")

        q(n7, QuestionType.MCQ,
          "Nature of roots of 2x\u00b2\u22123x+5=0:",
          {"A": "Two distinct real roots",
           "B": "Two equal real roots",
           "C": "No real roots",
           "D": "One positive one negative"},
          "No real roots",
          explanation="D=(\u22123)\u00b2\u22124(2)(5)=9\u221240=\u221231 < 0.",
          concept="Applying Discriminant")

        q(n7, QuestionType.MCQ,
          "For kx\u00b2+2x+1=0 to have two equal real roots, k equals:",
          {"A": "0", "B": "1", "C": "2", "D": "4"},
          "1",
          explanation="D=4\u22124k=0 \u2192 k=1.",
          concept="Finding k for Equal Roots")

        q(n7, QuestionType.FILL_BLANK,
          "Discriminant of 3x\u00b2\u22124\u221a3x+4=0: b\u00b2\u22124ac = (4\u221a3)\u00b2\u22124(3)(4) = 48\u2212___ = 0.",
          {"tip": "4\u00d73\u00d74=48"},
          "48",
          concept="Computing the Discriminant")

        q(n7, QuestionType.FILL_BLANK,
          "For 2x\u00b2+kx+3=0 to have two equal roots, k=\u00b1___ (simplified).",
          {"tip": "D=k\u00b2\u221224=0 \u2192 k=\u00b1\u221a24=\u00b12\u221a6"},
          "2\u221a6",
          concept="Finding k for Equal Roots")

        q(n7, QuestionType.FILL_BLANK,
          "For kx(x\u22122)+6=0 (kx\u00b2\u22122kx+6=0) to have equal roots, k=___.",
          {"tip": "D=4k\u00b2\u221224k=4k(k\u22126)=0. Since k\u22600 (must be quadratic), k=6."},
          "6",
          concept="Finding k for Equal Roots")

        q(n7, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about D=b\u00b2\u22124ac:",
          {"choices": [
              {"id": 1, "text": "D>0 means two distinct real roots"},
              {"id": 2, "text": "D=0 means no real roots"},
              {"id": 3, "text": "D<0 means no real roots"},
              {"id": 4, "text": "D is called discriminant because it discriminates between root types"},
              {"id": 5, "text": "D=0 means parabola y=ax\u00b2+bx+c is tangent to the x-axis"},
          ]},
          "1,3,4,5",
          concept="Discriminant Properties")

        q(n7, QuestionType.MULTI_SELECT,
          "Which equations have two distinct real roots?",
          {"choices": [
              {"id": 1, "text": "x\u00b2+2x+1=0"},
              {"id": 2, "text": "x\u00b2\u22125x+6=0"},
              {"id": 3, "text": "2x\u00b2\u22124x+3=0"},
              {"id": 4, "text": "x\u00b2+7x\u221260=0"},
              {"id": 5, "text": "3x\u00b2\u22122x+1/3=0"},
          ]},
          "2,4",
          explanation="id1: D=0; id2: D=1>0; id3: D=16\u221224<0; id4: D=289>0; id5: D=0.",
          concept="Applying Discriminant")

        q(n7, QuestionType.MULTI_SELECT,
          "For a rectangular park of perimeter 80m and area 400m\u00b2, which are true?",
          {"choices": [
              {"id": 1, "text": "The equation is x\u00b2\u221240x+400=0"},
              {"id": 2, "text": "Discriminant=0"},
              {"id": 3, "text": "Length=breadth=20m"},
              {"id": 4, "text": "The park is a square"},
              {"id": 5, "text": "The design is impossible"},
          ]},
          "1,2,3,4",
          explanation="l+b=40, lb=400 \u2192 x\u00b2\u221240x+400=0. D=0. Equal roots x=20. 20\u00d720 square \u2014 possible.",
          concept="Discriminant Applied to Word Problems")

        q(n7, QuestionType.REARRANGE,
          "Check discriminant of 3x\u00b2\u22122x+1/3=0 and find root:",
          {"chips": [
              "a=3, b=\u22122, c=1/3",
              "D=(\u22122)\u00b2\u22124(3)(1/3)=4\u22124=0",
              "Two equal real roots",
              "x=\u2212b/2a=2/6=1/3",
              "Root: x=1/3 (repeated)",
          ]},
          "a=3, b=\u22122, c=1/3 D=(\u22122)\u00b2\u22124(3)(1/3)=4\u22124=0 Two equal real roots x=\u2212b/2a=2/6=1/3 Root: x=1/3 (repeated)",
          concept="Discriminant Calculation")

        q(n7, QuestionType.REARRANGE,
          "Arrange the three discriminant cases from most roots to least:",
          {"chips": [
              "D>0 \u2014 two distinct real roots",
              "D=0 \u2014 one repeated real root",
              "D<0 \u2014 no real roots",
          ]},
          "D>0 \u2014 two distinct real roots D=0 \u2014 one repeated real root D<0 \u2014 no real roots",
          concept="Nature of Roots Summary")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 9 — Applications and Word Problems
        # ══════════════════════════════════════════════════════════════════════

        q(n9, QuestionType.MCQ,
          "Altitude of right triangle is 7 cm less than base. Hypotenuse=13 cm. The base is:",
          {"A": "5 cm", "B": "9 cm", "C": "12 cm", "D": "7 cm"},
          "12 cm",
          explanation="x\u00b2+(x\u22127)\u00b2=169 \u2192 x\u00b2\u22127x\u221260=0 \u2192 (x\u221212)(x+5)=0 \u2192 x=12.",
          concept="Quadratic Equations \u2014 Geometry")

        q(n9, QuestionType.MCQ,
          "Pottery: x articles/day; cost per article=(2x+3) rupees; total=\u20b990. x equals:",
          {"A": "5", "B": "6", "C": "7", "D": "8"},
          "6",
          explanation="x(2x+3)=90 \u2192 2x\u00b2+3x\u221290=0. D=9+720=729=27\u00b2. x=(\u22123+27)/4=6.",
          concept="Quadratic Equations \u2014 Cost Problems")

        q(n9, QuestionType.MCQ,
          "Two consecutive positive integers whose sum of squares is 365:",
          {"A": "12 and 13", "B": "13 and 14", "C": "14 and 15", "D": "15 and 16"},
          "13 and 14",
          explanation="n\u00b2+(n+1)\u00b2=365 \u2192 n\u00b2+n\u2212182=0 \u2192 (n\u221213)(n+14)=0 \u2192 n=13.",
          concept="Quadratic Equations \u2014 Number Problems")

        q(n9, QuestionType.MCQ,
          "Sum of ages of two friends is 20. Four years ago, product of ages was 48. This situation is:",
          {"A": "Possible; ages are 8 and 12",
           "B": "Possible; ages are 10 and 10",
           "C": "Not possible (D<0)",
           "D": "Possible; ages are 6 and 14"},
          "Not possible (D<0)",
          explanation="(x\u22124)(16\u2212x)=48 \u2192 x\u00b2\u221220x+112=0. D=400\u2212448=\u221248<0. No real solution.",
          concept="Checking Feasibility Using Discriminant")

        q(n9, QuestionType.FILL_BLANK,
          "Two numbers sum to 27, product to 182. They are 14 and ___.",
          {"tip": "x\u00b2\u221227x+182=0 \u2192 (x\u221213)(x\u221214)=0 \u2192 x=13 or 14"},
          "13",
          concept="Applying Factorisation to Word Problems")

        q(n9, QuestionType.FILL_BLANK,
          "Pole problem: x\u00b2+7x\u221260=0. Discriminant = 7\u00b2+4\u00d760 = ___.",
          {"tip": "49+240=289"},
          "289",
          concept="Discriminant in Word Problems")

        q(n9, QuestionType.MULTI_SELECT,
          "When solving a real-life quadratic, which steps are mandatory?",
          {"choices": [
              {"id": 1, "text": "Check discriminant to verify real solutions exist"},
              {"id": 2, "text": "Find both roots"},
              {"id": 3, "text": "Reject any root contradicting physical constraints"},
              {"id": 4, "text": "Always use the quadratic formula"},
              {"id": 5, "text": "Verify accepted root satisfies the original problem"},
          ]},
          "1,2,3,5",
          concept="Problem-Solving Strategy")

        q(n9, QuestionType.MULTI_SELECT,
          "Which signals suggest the quadratic formula is better than factorisation?",
          {"choices": [
              {"id": 1, "text": "Discriminant is not a perfect square"},
              {"id": 2, "text": "Coefficients are large"},
              {"id": 3, "text": "Answer is expected to be irrational"},
              {"id": 4, "text": "a=1 always"},
              {"id": 5, "text": "ac has no small integer factor pairs summing to b"},
          ]},
          "1,2,3,5",
          concept="Choosing the Right Method")

        q(n9, QuestionType.REARRANGE,
          "Solve 'altitude 7 less than base, hypotenuse 13' end-to-end:",
          {"chips": [
              "Let base=x, altitude=x\u22127",
              "x\u00b2+(x\u22127)\u00b2=169",
              "2x\u00b2\u221214x\u2212120=0 \u2192 x\u00b2\u22127x\u221260=0",
              "(x\u221212)(x+5)=0 \u2192 x=12 or x=\u22125",
              "x=12 cm (base), altitude=5 cm",
          ]},
          "Let base=x, altitude=x\u22127 x\u00b2+(x\u22127)\u00b2=169 2x\u00b2\u221214x\u2212120=0 \u2192 x\u00b2\u22127x\u221260=0 (x\u221212)(x+5)=0 \u2192 x=12 or x=\u22125 x=12 cm (base), altitude=5 cm",
          concept="Quadratic Equations \u2014 Geometry")

        q(n9, QuestionType.REARRANGE,
          "Check if a word-problem quadratic has a real solution:",
          {"chips": [
              "Form ax\u00b2+bx+c=0 from the word problem",
              "Compute D=b\u00b2\u22124ac",
              "If D<0 \u2192 situation is impossible",
              "If D\u22650 \u2192 solve for roots",
              "Reject physically invalid roots",
          ]},
          "Form ax\u00b2+bx+c=0 from the word problem Compute D=b\u00b2\u22124ac If D<0 \u2192 situation is impossible If D\u22650 \u2192 solve for roots Reject physically invalid roots",
          concept="Problem-Solving Strategy")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 10 — Chapter Test
        # ══════════════════════════════════════════════════════════════════════

        q(n10, QuestionType.MCQ,
          "Which equation is NOT quadratic after simplification?",
          {"A": "(x+2)\u00b3=x\u00b3\u22124",
           "B": "x(x+1)+8=(x+2)(x\u22122)",
           "C": "x(2x+3)=x\u00b2+1",
           "D": "(x\u22122)\u00b2+1=2x\u22123"},
          "x(x+1)+8=(x+2)(x\u22122)",
          concept="Identifying Quadratic Equations")

        q(n10, QuestionType.MCQ,
          "Roots of x\u00b2\u22125x+6=0:",
          {"A": "2 and 3", "B": "\u22122 and \u22123", "C": "1 and 6", "D": "2 and \u22123"},
          "2 and 3",
          concept="Factorisation Method")

        q(n10, QuestionType.MCQ,
          "Nature of roots of 2x\u00b2\u22126x+3=0:",
          {"A": "No real roots",
           "B": "Two equal real roots",
           "C": "Two distinct real roots",
           "D": "Cannot be determined"},
          "Two distinct real roots",
          explanation="D=36\u221224=12>0.",
          concept="Nature of Roots")

        q(n10, QuestionType.MCQ,
          "For 2x\u00b2+kx+3=0 to have equal roots, k=:",
          {"A": "\u00b1\u221a6", "B": "\u00b12\u221a6", "C": "\u00b16", "D": "\u00b1\u221a3"},
          "\u00b12\u221a6",
          explanation="D=k\u00b2\u221224=0 \u2192 k=\u00b12\u221a6.",
          concept="Finding k for Equal Roots")

        q(n10, QuestionType.MCQ,
          "Positive root of x\u00b2+7x\u221260=0:",
          {"A": "3", "B": "5", "C": "7", "D": "12"},
          "5",
          concept="Applying the Quadratic Formula")

        q(n10, QuestionType.FILL_BLANK,
          "Discriminant of x\u00b2\u22125x+6=0 is ___.",
          {"tip": "b\u00b2\u22124ac=(\u22125)\u00b2\u22124(1)(6)=25\u221224"},
          "1",
          concept="Computing the Discriminant")

        q(n10, QuestionType.FILL_BLANK,
          "Rectangular mango grove: length=twice breadth, area=800m\u00b2. Breadth=___m.",
          {"tip": "2b\u00b2=800 \u2192 b\u00b2=400 \u2192 b=20"},
          "20",
          concept="Quadratic Equations \u2014 Area Problems")

        q(n10, QuestionType.FILL_BLANK,
          "For kx(x\u22122)+6=0 to have equal roots, k=___.",
          {"tip": "D=4k(k\u22126)=0 \u2192 k=6 (since k\u22600)"},
          "6",
          concept="Finding k for Equal Roots")

        q(n10, QuestionType.MULTI_SELECT,
          "Select ALL equations with no real roots:",
          {"choices": [
              {"id": 1, "text": "2x\u00b2\u22123x+5=0"},
              {"id": 2, "text": "x\u00b2\u22124x+4=0"},
              {"id": 3, "text": "2x\u00b2\u22124x+3=0"},
              {"id": 4, "text": "x\u00b2+5x+10=0"},
              {"id": 5, "text": "3x\u00b2\u22124\u221a3x+4=0"},
          ]},
          "1,3,4",
          explanation="id1: D=9\u221240<0; id2: D=0 (equal roots); id3: D=16\u221224<0; id4: D=25\u221240<0; id5: D=0.",
          concept="Nature of Roots")

        q(n10, QuestionType.MULTI_SELECT,
          "Which statements about ax\u00b2+bx+c=0 (a\u22600) are TRUE?",
          {"choices": [
              {"id": 1, "text": "It has at most 2 roots"},
              {"id": 2, "text": "If one root is 0 then c=0"},
              {"id": 3, "text": "Sum of roots = \u2212b/a"},
              {"id": 4, "text": "Product of roots = c/a"},
              {"id": 5, "text": "Graph y=ax\u00b2+bx+c is always a parabola"},
          ]},
          "1,2,3,4,5",
          concept="Properties of Quadratic Equations")

        q(n10, QuestionType.REARRANGE,
          "Arrange the three discriminant cases:",
          {"chips": [
              "b\u00b2\u22124ac > 0 \u2192 two distinct real roots",
              "b\u00b2\u22124ac = 0 \u2192 two equal real roots",
              "b\u00b2\u22124ac < 0 \u2192 no real roots",
          ]},
          "b\u00b2\u22124ac > 0 \u2192 two distinct real roots b\u00b2\u22124ac = 0 \u2192 two equal real roots b\u00b2\u22124ac < 0 \u2192 no real roots",
          concept="Nature of Roots Summary")

        q(n10, QuestionType.REARRANGE,
          "Steps to solve a quadratic word problem end-to-end:",
          {"chips": [
              "Assign variable and form ax\u00b2+bx+c=0",
              "Compute D=b\u00b2\u22124ac",
              "If D\u22650 solve for roots",
              "Reject physically invalid roots",
              "State the final answer",
          ]},
          "Assign variable and form ax\u00b2+bx+c=0 Compute D=b\u00b2\u22124ac If D\u22650 solve for roots Reject physically invalid roots State the final answer",
          concept="Problem-Solving Strategy")

        # ══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ══════════════════════════════════════════════════════════════════════

        self.stdout.write("Creating flashcard decks...")

        # Deck 1 — Formulae
        deck1 = FlashcardDeck.objects.create(
            title="Quadratic Equations \u2014 Formulae",
            course_unit=unit,
            purpose=DeckPurpose.PREREQUISITE,
        )

        cards_deck1 = [
            {
                "title": "Quadratic Formula",
                "body": "x = (\u2212b \u00b1 \u221a(b\u00b2\u22124ac)) / 2a, provided D = b\u00b2\u22124ac \u2265 0.",
                "type": FlashcardType.FORMULA,
                "concept": "Quadratic Formula",
            },
            {
                "title": "Discriminant",
                "body": "D = b\u00b2\u22124ac.\nD > 0: two distinct real roots.\nD = 0: one repeated root \u2212b/2a.\nD < 0: no real roots.",
                "type": FlashcardType.FORMULA,
                "concept": "Discriminant",
            },
            {
                "title": "Sum and Product of Roots",
                "body": "For ax\u00b2+bx+c=0 with roots \u03b1,\u03b2:\n\u03b1 + \u03b2 = \u2212b/a\n\u03b1 \u00d7 \u03b2 = c/a",
                "type": FlashcardType.FORMULA,
                "concept": "Vieta's Formulas",
            },
            {
                "title": "Standard Form",
                "body": "ax\u00b2 + bx + c = 0, a \u2260 0. Degree = 2. At most 2 real roots.",
                "type": FlashcardType.CONCEPT,
                "concept": "Standard Form",
            },
        ]

        for order, card_data in enumerate(cards_deck1, start=1):
            fc = Flashcard.objects.create(
                title=card_data["title"],
                body=card_data["body"],
                card_type=card_data["type"],
                concept=card_data["concept"],
                subject='Mathematics',
                chapter='Quadratic Equations',
            )
            DeckCard.objects.create(deck=deck1, card=fc, order=order)

        # Deck 2 — Methods
        deck2 = FlashcardDeck.objects.create(
            title="Quadratic Equations \u2014 Methods",
            course_unit=unit,
            purpose=DeckPurpose.POST_NODE,
        )

        cards_deck2 = [
            {
                "title": "Factorisation Method",
                "body": "Split bx into px+qx where pq=ac and p+q=b. Group and set each factor to 0.",
                "type": FlashcardType.CONCEPT,
                "concept": "Factorisation",
            },
            {
                "title": "Completing the Square",
                "body": "Step 1: Divide by a.\nStep 2: Move constant right.\nStep 3: Add (b/2a)\u00b2 to both sides.\nStep 4: Take \u00b1 square root.",
                "type": FlashcardType.CONCEPT,
                "concept": "Completing the Square",
            },
            {
                "title": "When to Use Which Method",
                "body": "Factorisation: D is a perfect square, small coefficients.\nQuadratic Formula: always works when D\u22650.\nCompleting the Square: when deriving the formula explicitly.",
                "type": FlashcardType.CONCEPT,
                "concept": "Method Selection",
            },
            {
                "title": "Rejecting Invalid Roots",
                "body": "Physical problems need positive values. Always check both roots against context (length, age, speed must be positive).",
                "type": FlashcardType.CONCEPT,
                "concept": "Applications",
            },
        ]

        for order, card_data in enumerate(cards_deck2, start=1):
            fc = Flashcard.objects.create(
                title=card_data["title"],
                body=card_data["body"],
                card_type=card_data["type"],
                concept=card_data["concept"],
                subject='Mathematics',
                chapter='Quadratic Equations',
            )
            DeckCard.objects.create(deck=deck2, card=fc, order=order)

        # ══════════════════════════════════════════════════════════════════════
        # REVISION NODE
        # ══════════════════════════════════════════════════════════════════════

        RevisionNode.objects.create(
            path=path, title="Quadratic Equations Revision",
            appears_after_node=n9, side='right', xp_reward=20, is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "\nChapter 4 seeded successfully!\n"
            "  \u2022 7 lesson nodes (orders 1,2,3,5,6,7,9)\n"
            "  \u2022 2 lab nodes: QUADRATIC_ROOTS_LAB (order=4, unlock after 3), "
            "DISCRIMINANT_LAB (order=8, unlock after 6)\n"
            "  \u2022 1 chapter test (order=10, 12 questions)\n"
            "  \u2022 10+10+12+10+10+12+10+12 = 96 questions total\n"
            "  \u2022 2 flashcard decks + 1 revision node\n"
            "  \u2022 Aligned with NCERT Class 10 Chapter 4 (Quadratic Equations)"
        ))
