from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 2 — Introduction to Linear Polynomials (Ganita Manjari, Class 9, 2026-27)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 2 — Introduction to Linear Polynomials (Class 9, 2026-27)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Introduction to Linear Polynomials', subject='Mathematics',
            class_grade='9', board='CBSE', order=2, icon='show_chart',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Introduction to Linear Polynomials', class_grade='9'
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
        # NODE 1 — Algebraic Expressions & Polynomials
        # ═══════════════════════════════════════════════════════════════════════
        n1 = lesson(1, "Algebraic Expressions & Polynomials", 10,
                    description="Build the vocabulary of algebra — terms, variables, coefficients, and constants. Discover how algebraic expressions arise naturally from real-life situations, and meet the special family called polynomials.",
                    objectives=[
                        "Identify terms, variables, coefficients, and constants in an algebraic expression",
                        "Distinguish between multi-variable and single-variable expressions",
                        "Define a polynomial in one variable",
                        "Recognise examples and non-examples of polynomials",
                    ])

        q(n1, QuestionType.MCQ,
          "In the expression 4x + 5y + 3, the coefficient of y is:",
          {"A": "4", "B": "5", "C": "3", "D": "1"},
          "B",
          hint="The coefficient is the number multiplying the variable.",
          explanation="5y means 5 times y, so the coefficient of y is 5.",
          concept="Coefficients")

        q(n1, QuestionType.MCQ,
          "In the expression 4x + 5y + 3, which of the following is a constant?",
          {"A": "4x", "B": "5y", "C": "3", "D": "x"},
          "C",
          hint="A constant has no variable attached to it.",
          explanation="The term 3 does not contain any variable, so it is the constant term.",
          concept="Constants and Terms")

        q(n1, QuestionType.FILL_BLANK,
          "Raju bought x red boxes (4 pens each) and y blue boxes (5 pencils each), and got 3 extra pens free. The algebraic expression for the total is ___.",
          {"tip": "Think: x red boxes give 4x pens, y blue boxes give 5y pencils, plus 3 free pens."},
          "4x + 5y + 3",
          hint="Multiply: pens = 4 × (number of red boxes), pencils = 5 × (number of blue boxes), then add the free pens.",
          explanation="x red boxes → 4x pens; y blue boxes → 5y pencils; 3 extra pens → total = 4x + 5y + 3.",
          concept="Building Algebraic Expressions")

        q(n1, QuestionType.MCQ,
          "Which of the following is a one-variable (univariate) polynomial?",
          {"A": "4x + 5y + 3", "B": "200l + 160w + 50lw", "C": "10x − x²", "D": "xy + 2"},
          "C",
          hint="A univariate polynomial has exactly one variable throughout.",
          explanation="10x − x² uses only the variable x, making it a univariate polynomial. The others use two variables.",
          concept="Univariate Polynomials")

        q(n1, QuestionType.MCQ,
          "In 5y³ + y² + 2y − 1, the constant term is:",
          {"A": "5", "B": "2", "C": "1", "D": "−1"},
          "D",
          hint="The constant term has no variable attached.",
          explanation="The term −1 contains no variable, so it is the constant term of the polynomial.",
          concept="Constants and Terms")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 2 — Degree, Terms & Coefficients
        # ═══════════════════════════════════════════════════════════════════════
        n2 = lesson(2, "Degree, Terms & Coefficients", 10,
                    description="Master the language of polynomials — learn to find the degree, name the type (linear, quadratic, cubic, constant), and extract coefficients of any term. These are the building blocks for everything that follows.",
                    objectives=[
                        "Find the degree of a polynomial in one variable",
                        "Classify polynomials as linear, quadratic, cubic, or constant",
                        "Extract the coefficient of any specified term",
                        "Solve Exercise Set 2.1 problems confidently",
                    ])

        q(n2, QuestionType.MCQ,
          "What is the degree of the polynomial 5y³ + y² + 2y − 1?",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "C",
          hint="The degree is the highest power of the variable.",
          explanation="The highest power of y is 3 (in the term 5y³), so the degree is 3. This is a cubic polynomial.",
          concept="Degree of a Polynomial")

        q(n2, QuestionType.MCQ,
          "A polynomial of degree 2 is called a:",
          {"A": "Linear polynomial", "B": "Quadratic polynomial", "C": "Cubic polynomial", "D": "Constant polynomial"},
          "B",
          hint="Recall: degree 0 = constant, 1 = linear, 2 = quadratic, 3 = cubic.",
          explanation="Polynomials of degree 2 are called quadratic polynomials. Example: x² + 5x + 1.",
          concept="Classifying Polynomials")

        q(n2, QuestionType.FILL_BLANK,
          "The degree of the polynomial 4z − 3 is ___.",
          {"tip": "Look for the highest power of z."},
          "1",
          hint="4z = 4z¹, so the highest power is 1.",
          explanation="4z − 3 has the variable z raised to the power 1, so its degree is 1. It is a linear polynomial.",
          concept="Degree of a Polynomial")

        q(n2, QuestionType.MCQ,
          "What is the coefficient of x³ in the polynomial x⁴ − 3x³ + 6x² − 2x + 7?",
          {"A": "1", "B": "−3", "C": "6", "D": "−2"},
          "B",
          hint="Find the term containing x³ and read its coefficient.",
          explanation="The term −3x³ contains x³, so its coefficient is −3.",
          concept="Coefficients")

        q(n2, QuestionType.MCQ,
          "The constant 8 is a polynomial of degree:",
          {"A": "8", "B": "1", "C": "Undefined", "D": "0"},
          "D",
          hint="Write 8 as 8x⁰. What is the power of x?",
          explanation="8 = 8x⁰, so the variable is raised to the power 0. Hence degree = 0, and it is a constant polynomial.",
          concept="Degree of a Polynomial")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 3 — Introduction to Linear Polynomials
        # ═══════════════════════════════════════════════════════════════════════
        n3 = lesson(3, "Introduction to Linear Polynomials", 10,
                    description="Focus on polynomials of degree 1 — linear polynomials. See how they arise in perimeter problems, membership fees, and as input-output machines (functions). Practise evaluating a linear polynomial at given values.",
                    objectives=[
                        "Recognise and write linear polynomials",
                        "Evaluate a linear polynomial for given values of the variable",
                        "Translate a word problem into a linear equation",
                        "Understand a linear polynomial as an input-output function",
                    ])

        q(n3, QuestionType.MCQ,
          "The perimeter of a square of side x is 4x. This is a linear polynomial because:",
          {"A": "It involves multiplication", "B": "x has degree 1", "C": "4 is a constant", "D": "It has only one term"},
          "B",
          hint="A linear polynomial has the highest power of the variable equal to 1.",
          explanation="4x = 4x¹; the power of x is 1, so 4x is a linear polynomial of degree 1.",
          concept="Linear Polynomials")

        q(n3, QuestionType.MCQ,
          "A chess club charges ₹200 as joining fee plus ₹50 per match played. If m matches are played, the total amount paid is:",
          {"A": "50m", "B": "200m + 50", "C": "200 + 50m", "D": "250m"},
          "C",
          hint="Fixed fee + (rate × number of matches) = ?",
          explanation="Joining fee ₹200 is fixed; each match costs ₹50 extra. So total = 200 + 50m.",
          concept="Linear Polynomials in Context")

        q(n3, QuestionType.MCQ,
          "For the linear polynomial 2x + 3, what is the value when x = 4?",
          {"A": "9", "B": "14", "C": "11", "D": "8"},
          "C",
          hint="Substitute x = 4: compute 2 × 4 + 3.",
          explanation="2(4) + 3 = 8 + 3 = 11.",
          concept="Evaluating Polynomials")

        q(n3, QuestionType.FILL_BLANK,
          "The value of the linear polynomial 5x − 3 when x = 2 is ___.",
          {"tip": "Substitute x = 2 into 5x − 3."},
          "7",
          hint="5 × 2 − 3 = 10 − 3 = ?",
          explanation="5(2) − 3 = 10 − 3 = 7.",
          concept="Evaluating Polynomials")

        q(n3, QuestionType.MCQ,
          "The sum of two numbers is 64. One number is 10 more than the other. If the smaller number is x, the linear equation formed is:",
          {"A": "x + 10 = 64", "B": "2x + 10 = 64", "C": "x + x = 64", "D": "x − 10 = 64"},
          "B",
          hint="Smaller = x; larger = x + 10; sum = x + (x + 10).",
          explanation="The two numbers are x and x + 10. Their sum: x + (x + 10) = 2x + 10 = 64.",
          concept="Linear Equations from Word Problems")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 4 — LAB: Linear Pattern Explorer
        # ═══════════════════════════════════════════════════════════════════════
        lab(4, "Linear Pattern Explorer", 20,
            lab_type="LINEAR_PATTERN_EXPLORER",
            lab_category=LabCategory.INTERACTIVE,
            required=3)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 5 — Exploring Linear Patterns
        # ═══════════════════════════════════════════════════════════════════════
        n5 = lesson(5, "Exploring Linear Patterns", 10,
                    description="Discover how linear polynomials describe growing and shrinking patterns. From tile arrangements to savings accounts, learn to find the nth-term expression and use it to answer questions about any stage of the pattern.",
                    objectives=[
                        "Identify a linear pattern from a sequence",
                        "Find the nth-term expression for a linear pattern",
                        "Use the nth-term to find specific values and solve reverse problems",
                        "Distinguish linear patterns from non-linear ones",
                    ])

        q(n5, QuestionType.MCQ,
          "In a growing tile pattern, Stage 1 has 1 tile, Stage 2 has 3, Stage 3 has 5, Stage 4 has 7. The number of tiles at Stage n is:",
          {"A": "2n", "B": "2n − 1", "C": "n + 2", "D": "3n − 2"},
          "B",
          hint="Check: for n = 1, 2(1)−1 = 1 ✓; for n = 2, 2(2)−1 = 3 ✓.",
          explanation="Each stage adds 2 tiles. The pattern 1, 3, 5, 7… is described by 2n − 1 (twice the stage number minus 1).",
          concept="Linear Patterns — nth Term")

        q(n5, QuestionType.FILL_BLANK,
          "Using the expression 2n − 1, how many tiles will be in the 15th stage of the pattern?",
          {"tip": "Substitute n = 15 into 2n − 1."},
          "29",
          hint="2 × 15 − 1 = 30 − 1 = ?",
          explanation="2(15) − 1 = 30 − 1 = 29 tiles.",
          concept="Linear Patterns — nth Term")

        q(n5, QuestionType.MCQ,
          "Bela has ₹100 for pocket money and spends ₹5 every day. The amount left after n days is:",
          {"A": "100 + 5n", "B": "5n − 100", "C": "100 − 5n", "D": "5n"},
          "C",
          hint="She starts with ₹100 and loses ₹5 per day.",
          explanation="Amount left after n days = 100 − 5n. After 12 days: 100 − 60 = ₹40.",
          concept="Linear Patterns in Context")

        q(n5, QuestionType.MCQ,
          "What property makes a sequence a LINEAR pattern?",
          {"A": "All terms are equal", "B": "The difference between consecutive terms is constant", "C": "Each term is double the previous", "D": "Terms are all prime numbers"},
          "B",
          hint="Think about what makes a pattern 'linear' — what stays the same?",
          explanation="A linear pattern has a constant difference between consecutive terms. This constant difference is the coefficient of n in the nth-term expression.",
          concept="Definition of Linear Patterns")

        q(n5, QuestionType.MULTI_SELECT,
          "Which of the following are linear patterns? (Select ALL that apply)",
          {"choices": [
              {"id": 1, "text": "1, 4, 9, 16, 25 (perfect squares)"},
              {"id": 2, "text": "2, 5, 8, 11, 14 (increases by 3 each time)"},
              {"id": 3, "text": "1, 2, 4, 8, 16 (doubles each time)"},
              {"id": 4, "text": "100, 95, 90, 85, 80 (decreases by 5 each time)"},
          ]},
          "2,4",
          hint="Check whether the difference between consecutive terms is constant.",
          explanation="Sequences 2, 5, 8, 11, 14 (difference = 3) and 100, 95, 90, 85, 80 (difference = −5) are linear. The others have non-constant differences.",
          concept="Identifying Linear Patterns")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 6 — Linear Growth and Decay
        # ═══════════════════════════════════════════════════════════════════════
        n6 = lesson(6, "Linear Growth and Decay", 10,
                    description="Linear polynomials model two kinds of real-world change: growth (a quantity increases at a steady rate) and decay (a quantity decreases at a steady rate). Learn to identify, build, and reason about both types.",
                    objectives=[
                        "Define linear growth and linear decay",
                        "Build a linear model from a word description",
                        "Make a table of values and describe the rate of change",
                        "Solve real-world problems involving linear growth and decay",
                    ])

        q(n6, QuestionType.MCQ,
          "The cost of a journey is C(d) = 100 + 60d (₹). As the distance d increases by 1 km, the cost increases by:",
          {"A": "₹100", "B": "₹160", "C": "₹60", "D": "₹6"},
          "C",
          hint="The coefficient of d tells you how much C changes per unit of d.",
          explanation="Each extra km adds ₹60 (the coefficient of d). The constant 100 is the base/starting cost.",
          concept="Linear Growth")

        q(n6, QuestionType.MCQ,
          "The height of water in a tank is given by h(t) = 3 − 0.5t metres. This represents:",
          {"A": "Linear growth", "B": "Linear decay", "C": "Constant quantity", "D": "Quadratic growth"},
          "B",
          hint="Is the quantity increasing or decreasing as t increases?",
          explanation="As t increases by 1, h decreases by 0.5 m (negative coefficient). This is linear decay.",
          concept="Linear Decay")

        q(n6, QuestionType.FILL_BLANK,
          "Using C(d) = 100 + 60d, what is the cost of a 5 km journey (in ₹)?",
          {"tip": "Substitute d = 5 into the formula."},
          "400",
          hint="100 + 60 × 5 = 100 + 300 = ?",
          explanation="C(5) = 100 + 60(5) = 100 + 300 = ₹400.",
          concept="Linear Growth")

        q(n6, QuestionType.MCQ,
          "A mobile phone bought for ₹10,000 loses ₹800 in value every year. Its value v after t years is:",
          {"A": "v = 10000 + 800t", "B": "v = 800t − 10000", "C": "v = 10000 − 800t", "D": "v = 800 × 10000/t"},
          "C",
          hint="Value starts at ₹10,000 and decreases by ₹800 each year.",
          explanation="v = 10000 − 800t. The value decreases (linear decay) at ₹800 per year. After 3 years: 10000 − 2400 = ₹7600.",
          concept="Linear Decay")

        q(n6, QuestionType.MCQ,
          "A telecom scheme gives ₹600 balance, which reduces by ₹15 per day. After how many days will the balance run out?",
          {"A": "30 days", "B": "40 days", "C": "50 days", "D": "45 days"},
          "B",
          hint="Set balance = 0 in b(x) = 600 − 15x and solve for x.",
          explanation="b(x) = 600 − 15x = 0 → 15x = 600 → x = 40 days.",
          concept="Linear Decay")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 7 — Linear Relationships: Finding y = ax + b
        # ═══════════════════════════════════════════════════════════════════════
        n7 = lesson(7, "Linear Relationships: Finding y = ax + b", 10,
                    description="When two quantities vary together linearly, their relationship can be written as y = ax + b. Learn to find a and b from just two data points — a powerful skill for modelling real situations like billing plans, temperature conversions, and more.",
                    objectives=[
                        "Set up a pair of simultaneous equations from two data points",
                        "Solve for a and b in y = ax + b",
                        "Interpret a as rate of change and b as the starting value",
                        "Apply the technique to real-world billing and measurement problems",
                    ])

        q(n7, QuestionType.MCQ,
          "In y = ax + b, the value of a represents the:",
          {"A": "y-intercept", "B": "Constant term", "C": "Rate of change (slope)", "D": "Value of y when x = 0"},
          "C",
          hint="Think of how much y changes for each unit change in x.",
          explanation="In y = ax + b, a is the slope — it tells you how much y changes for each 1-unit increase in x.",
          concept="Slope as Rate of Change")

        q(n7, QuestionType.MCQ,
          "A telecom bill: 10 GB → ₹350; 20 GB → ₹550. Using y = ax + b, the value of a (cost per GB) is:",
          {"A": "₹20", "B": "₹150", "C": "₹35", "D": "₹55"},
          "A",
          hint="Find the change in bill ÷ change in data: (550 − 350) ÷ (20 − 10) = ?",
          explanation="Change in bill = ₹200 over 10 GB, so cost per GB = 200/10 = ₹20. Hence a = 20.",
          concept="Finding Linear Relationship from Two Points")

        q(n7, QuestionType.FILL_BLANK,
          "Using the telecom data (10 GB → ₹350, a = 20), the fixed monthly fee b equals ___.",
          {"tip": "Substitute x = 10, y = 350, a = 20 into 350 = 20(10) + b and solve."},
          "150",
          hint="350 = 200 + b → b = 350 − 200 = ?",
          explanation="350 = 20(10) + b → 350 = 200 + b → b = 150. The fixed monthly fee is ₹150.",
          concept="Finding Linear Relationship from Two Points")

        q(n7, QuestionType.MCQ,
          "In the telecom equation y = 20x + 150, the number 150 represents:",
          {"A": "Cost per GB", "B": "Fixed monthly fee", "C": "Total bill for 10 GB", "D": "A discount amount"},
          "B",
          hint="What does y equal when x = 0?",
          explanation="When x = 0 (no data used), y = 0 + 150 = ₹150. This is the fixed monthly fee — you pay it regardless.",
          concept="Interpreting y-intercept")

        q(n7, QuestionType.MCQ,
          "A learning platform: 10 modules → ₹400; 14 modules → ₹500. In y = ax + b, what is a?",
          {"A": "₹10", "B": "₹25", "C": "₹40", "D": "₹100"},
          "B",
          hint="Change in bill ÷ change in modules = (500 − 400) ÷ (14 − 10) = ?",
          explanation="(500 − 400) ÷ (14 − 10) = 100 ÷ 4 = ₹25 per module.",
          concept="Finding Linear Relationship from Two Points")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 8 — LAB: Linear Grapher
        # ═══════════════════════════════════════════════════════════════════════
        lab(8, "Linear Grapher Lab", 25,
            lab_type="LINEAR_GRAPHER_LAB",
            lab_category=LabCategory.INTERACTIVE,
            required=7)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 9 — Visualising Linear Relationships
        # ═══════════════════════════════════════════════════════════════════════
        n9 = lesson(9, "Visualising Linear Relationships", 10,
                    description="Bring y = ax + b to life on the coordinate plane. Understand slope as steepness, y-intercept as where the line crosses the y-axis, and discover why parallel lines share the same slope. Plot lines, read graphs, and connect algebra with geometry.",
                    objectives=[
                        "Plot a linear equation y = ax + b by finding two points",
                        "Identify the slope a and y-intercept b from a graph or equation",
                        "Determine if a line represents growth (positive slope) or decay (negative slope)",
                        "Recognise that lines with the same slope are parallel",
                    ])

        q(n9, QuestionType.MCQ,
          "The line y = 2x + 1 cuts the y-axis at the point:",
          {"A": "(1, 0)", "B": "(0, 2)", "C": "(0, 1)", "D": "(2, 1)"},
          "C",
          hint="The y-axis is where x = 0. Substitute x = 0.",
          explanation="At x = 0: y = 2(0) + 1 = 1. So the line crosses the y-axis at (0, 1). The y-intercept is 1.",
          concept="y-intercept")

        q(n9, QuestionType.MCQ,
          "Lines y = 2x − 1, y = 2x + 1, y = 2x + 5 all have the same slope. These lines are:",
          {"A": "Intersecting at one point", "B": "Parallel to each other", "C": "The same line", "D": "Perpendicular"},
          "B",
          hint="What happens to lines with equal slopes but different y-intercepts?",
          explanation="Lines with the same slope (a = 2) but different y-intercepts (−1, 1, 5) are parallel — they never intersect.",
          concept="Parallel Lines")

        q(n9, QuestionType.MCQ,
          "In the equation y = ax + b, when a > 1, the line y = ax is ______ compared to y = x:",
          {"A": "Less steep", "B": "Equally steep", "C": "Steeper", "D": "Horizontal"},
          "C",
          hint="A larger slope means the line rises faster — it is steeper.",
          explanation="When a > 1, each unit of x produces more than 1 unit of y-rise, making the line steeper than y = x (which has slope 1).",
          concept="Slope and Steepness")

        q(n9, QuestionType.FILL_BLANK,
          "The y-intercept of the line y = 3x − 2 is ___.",
          {"tip": "Set x = 0 in y = 3x − 2."},
          "-2",
          hint="y = 3(0) − 2 = −2. The line crosses the y-axis at (0, −2).",
          explanation="The y-intercept is b = −2. The line cuts the y-axis 2 units below the origin.",
          concept="y-intercept")

        q(n9, QuestionType.MCQ,
          "Which of the following lines represents linear DECAY (decreasing quantity)?",
          {"A": "y = 3x + 1", "B": "y = x + 5", "C": "y = −2x + 3", "D": "y = 5x"},
          "C",
          hint="A negative slope means the quantity decreases as x increases.",
          explanation="y = −2x + 3 has slope a = −2 (negative). As x increases, y decreases — linear decay. A positive slope means growth.",
          concept="Slope and Growth/Decay")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 10 — Chapter Test
        # ═══════════════════════════════════════════════════════════════════════
        nt = test(10, "Chapter 2 Test: Introduction to Linear Polynomials", 30)

        q(nt, QuestionType.MCQ,
          "The degree of the polynomial 2x² − 5x + 3 is:",
          {"A": "1", "B": "2", "C": "3", "D": "5"},
          "B",
          hint="Look for the highest power of x.",
          explanation="The highest power of x is 2 (in 2x²), so the degree is 2. It is a quadratic polynomial.",
          concept="Degree of a Polynomial")

        q(nt, QuestionType.MCQ,
          "Which polynomial is linear?",
          {"A": "x² + 1", "B": "y³ + 2y − 1", "C": "3z + 7", "D": "−9"},
          "C",
          hint="A linear polynomial has degree 1.",
          explanation="3z + 7 has degree 1 (z¹), so it is linear. x² + 1 is quadratic (degree 2), y³ + 2y − 1 is cubic (degree 3), −9 is constant (degree 0).",
          concept="Classifying Polynomials")

        q(nt, QuestionType.FILL_BLANK,
          "The value of 5x − 3 when x = −1 is ___.",
          {"tip": "Substitute x = −1 into 5x − 3."},
          "-8",
          hint="5(−1) − 3 = −5 − 3 = ?",
          explanation="5(−1) − 3 = −5 − 3 = −8.",
          concept="Evaluating Polynomials")

        q(nt, QuestionType.MCQ,
          "The number of tiles at Stage n in the pattern 1, 3, 5, 7, ... is 2n − 1. How many tiles are at Stage 26?",
          {"A": "49", "B": "51", "C": "53", "D": "55"},
          "B",
          hint="Substitute n = 26 into 2n − 1.",
          explanation="2(26) − 1 = 52 − 1 = 51 tiles.",
          concept="Linear Patterns — nth Term")

        q(nt, QuestionType.MCQ,
          "A plant has height 1.75 ft and grows 0.5 ft per month. The height after 7 months is:",
          {"A": "3.75 ft", "B": "4.25 ft", "C": "5 ft", "D": "3.5 ft"},
          "B",
          hint="Height = 1.75 + 0.5 × 7.",
          explanation="h = 1.75 + 0.5(7) = 1.75 + 3.5 = 4.25 ft (linear growth).",
          concept="Linear Growth")

        q(nt, QuestionType.MCQ,
          "An auto-rikshaw fare is ₹25 for the first 2 km, then ₹15 per km. The fare for n km (n ≥ 2) is:",
          {"A": "15n + 25", "B": "15n − 5", "C": "25 + 15n", "D": "15(n − 2)"},
          "B",
          hint="Fare = ₹25 + ₹15 × (n − 2). Expand.",
          explanation="Fare = 25 + 15(n − 2) = 25 + 15n − 30 = 15n − 5.",
          concept="Linear Patterns in Context")

        q(nt, QuestionType.MCQ,
          "A telecom bill: 10 GB → ₹350; 20 GB → ₹550. What will the bill be for 15 GB?",
          {"A": "₹450", "B": "₹400", "C": "₹475", "D": "₹500"},
          "A",
          hint="Find y = 20x + 150 (a = 20, b = 150) and substitute x = 15.",
          explanation="y = 20(15) + 150 = 300 + 150 = ₹450.",
          concept="Linear Relationships")

        q(nt, QuestionType.FILL_BLANK,
          "The line y = −3x + 4 has y-intercept ___.",
          {"tip": "Read off the value of b in y = ax + b."},
          "4",
          hint="In y = ax + b, b is the y-intercept. Here b = 4.",
          explanation="y = −3x + 4 → b = 4. The line crosses the y-axis at (0, 4).",
          concept="y-intercept")

        q(nt, QuestionType.MCQ,
          "Which pair of lines is PARALLEL?",
          {"A": "y = 2x + 1 and y = 3x + 1", "B": "y = 2x + 1 and y = 2x − 3", "C": "y = 2x + 1 and y = −2x + 1", "D": "y = x and y = −x"},
          "B",
          hint="Parallel lines have the same slope (a) but different y-intercepts (b).",
          explanation="y = 2x + 1 and y = 2x − 3 both have slope 2 but different y-intercepts (+1 vs −3). They are parallel.",
          concept="Parallel Lines")

        q(nt, QuestionType.MCQ,
          "In y = ax + b, if a is fixed and b changes, what happens to the graph?",
          {"A": "The slope changes, the y-intercept stays the same", "B": "The line shifts up or down but stays parallel", "C": "The line rotates about the origin", "D": "The line becomes horizontal"},
          "B",
          hint="Changing b shifts where the line meets the y-axis, but a (slope) is unchanged.",
          explanation="Changing b while keeping a fixed shifts the line up or down, producing parallel lines. The slope (steepness) is unchanged.",
          concept="Parallel Lines")

        # ═══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════════
        prereq_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Linear Polynomials — Key Vocabulary",
            purpose=DeckPurpose.PREREQUISITE,
        )
        for i, (front, back) in enumerate([
            ("What is a polynomial?",
             "An algebraic expression in one variable, involving that variable raised to non-negative integer powers. E.g., 5y³ + y² + 2y − 1."),
            ("What is the DEGREE of a polynomial?",
             "The highest power of the variable. E.g., degree of 3z + 7 is 1; degree of x² + 5x + 1 is 2."),
            ("What is a LINEAR polynomial?",
             "A polynomial of degree 1. It has the form ax + b where a ≠ 0. E.g., 2x + 3, 4z − 7."),
            ("What is a linear pattern?",
             "A sequence where the difference between consecutive terms is constant. E.g., 3, 7, 11, 15 (difference = 4)."),
            ("What do a and b represent in y = ax + b?",
             "a = slope (rate of change / steepness of the line). b = y-intercept (where the line crosses the y-axis)."),
        ], start=1):
            card = Flashcard.objects.create(title=front, body=back, card_type=FlashcardType.CONCEPT,
                                            subject='Mathematics', chapter='Introduction to Linear Polynomials', order=i)
            DeckCard.objects.create(deck=prereq_deck, card=card, order=i)

        key_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Linear Polynomials — Key Results",
            purpose=DeckPurpose.POST_NODE,
        )
        for i, (front, back) in enumerate([
            ("Linear Growth vs Linear Decay",
             "Growth: quantity increases by a fixed amount → positive slope (a > 0). Decay: quantity decreases by a fixed amount → negative slope (a < 0)."),
            ("How do you find y = ax + b from two points?",
             "1. Use both points to form two equations. 2. Subtract to find a. 3. Substitute back to find b."),
            ("What is the y-intercept?",
             "The value of y when x = 0. In y = ax + b, the y-intercept is b. The line crosses the y-axis at (0, b)."),
            ("When are two lines parallel?",
             "When they have the same slope (a) but different y-intercepts (b). E.g., y = 2x + 1 and y = 2x − 5 are parallel."),
            ("nth-term of a linear sequence",
             "If the first term is t₁ and common difference is d, the nth term = t₁ + (n−1)d = (a)n + b, a linear polynomial in n."),
            ("What does slope tell us about a line?",
             "Positive slope → line goes up left-to-right (growth). Negative slope → line goes down (decay). Larger |a| → steeper line."),
        ], start=1):
            card = Flashcard.objects.create(title=front, body=back, card_type=FlashcardType.FORMULA,
                                            subject='Mathematics', chapter='Introduction to Linear Polynomials', order=i)
            DeckCard.objects.create(deck=key_deck, card=card, order=i)

        # ═══════════════════════════════════════════════════════════════════════
        # REVISION NODE
        # ═══════════════════════════════════════════════════════════════════════
        RevisionNode.objects.create(
            path=path,
            title='Linear Polynomials — Chapter Revision',
            appears_after_node=n9,
            side='right',
            is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "✓ Chapter 2 — Introduction to Linear Polynomials seeded successfully! "
            "(9 lessons, 2 labs, 1 test, 2 flashcard decks)"
        ))
