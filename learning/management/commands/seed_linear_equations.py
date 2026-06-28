from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 3 \u2014 Pair of Linear Equations in Two Variables (NCERT Class 10)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 3 \u2014 Pair of Linear Equations in Two Variables...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Pair of Linear Equations in Two Variables',
            subject='Mathematics',
            class_grade='10', board='CBSE', order=3, icon='linear_scale',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Pair of Linear Equations in Two Variables', class_grade='10'
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

        def lesson(order, title, xp, nq=5, description='', objectives=None):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LESSON, order=order,
                xp_reward=xp, practice_question_count=nq, starting_lives=3,
                description=description,
                objectives_json=objectives or [],
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

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 1 \u2014 Introduction to Linear Equations in Two Variables
        # ═══════════════════════════════════════════════════════════════════════
        n1 = lesson(1, "Introduction to Linear Equations in Two Variables", 10, nq=5,
                    description="A linear equation in two variables is any equation of the form ax+by+c=0, "
                                "where a and b are not both zero. A single such equation has infinitely many solutions.",
                    objectives=[
                        "Define a linear equation in two variables and identify the standard form ax+by+c=0",
                        "Recognise which expressions are and are not linear equations in two variables",
                        "Find solutions by substituting values for one variable",
                        "Write equations in standard form given a verbal description",
                    ])

        q(n1, QuestionType.MCQ,
          "Which of the following is a linear equation in two variables?",
          {"A": "x\u00b2+y=5", "B": "2x+3y=7", "C": "xy=4", "D": "x/y=3"},
          "2x+3y=7",
          hint="A linear equation in two variables has degree 1 for both variables.",
          explanation="A linear equation in two variables has the form ax+by+c=0, where a and b are not both zero "
                      "and both variables appear with power 1 only. xy=4 has degree 2; x/y=3 is not polynomial.",
          concept="Definition of Linear Equation in Two Variables")

        q(n1, QuestionType.MCQ,
          "The general form of a linear equation in two variables is:",
          {"A": "ax+by+c=0", "B": "ax\u00b2+bx+c=0", "C": "ax+b=0", "D": "ax+by=0"},
          "ax+by+c=0",
          hint="The general form includes a constant term c.",
          explanation="ax+by+c=0 where a, b are not both zero. ax+b=0 is linear in one variable; "
                      "ax+by=0 is a special case (c=0) but the complete general form includes c.",
          concept="General Form ax+by+c=0")

        q(n1, QuestionType.MCQ,
          "How many solutions does a single linear equation in two variables (like 2x+3y=6) have?",
          {"A": "0", "B": "1", "C": "2", "D": "Infinitely many"},
          "Infinitely many",
          hint="For each value of x there is exactly one value of y.",
          explanation="For any value of x, we can find a corresponding y. Since x can be any real number, "
                      "there are infinitely many (x,y) pairs satisfying 2x+3y=6.",
          concept="Number of Solutions of a Single Linear Equation")

        q(n1, QuestionType.MCQ,
          "Which equation represents 'twice a number x added to three times another number y equals 12'?",
          {"A": "2x\u22123y=12", "B": "2x+3y=12", "C": "3x+2y=12", "D": "x+y=12"},
          "2x+3y=12",
          hint="'Twice x' means 2x; 'three times y' means 3y.",
          explanation="'Twice x' = 2x, 'three times y' = 3y, 'equals 12' gives 2x+3y=12.",
          concept="Forming Linear Equations from Words")

        q(n1, QuestionType.FILL_BLANK,
          "For x+y=5, if x=2 then y=___.",
          {"tip": "Substitute x=2 into x+y=5 and solve for y"},
          "3",
          hint="2+y=5 \u2192 y=3.",
          explanation="x+y=5. Substituting x=2: 2+y=5 \u2192 y=3. So (2,3) is one solution of x+y=5.",
          concept="Finding Solutions by Substitution")

        q(n1, QuestionType.FILL_BLANK,
          "Write 3y=5\u22122x in standard form ax+by+c=0. The value of c is ___.",
          {"tip": "Move all terms to the left side: 2x+3y\u22125=0"},
          "-5",
          hint="3y=5\u22122x \u2192 2x+3y\u22125=0. Here a=2, b=3, c=\u22125.",
          explanation="Rearranging: 3y=5\u22122x \u2192 2x+3y=5 \u2192 2x+3y\u22125=0. So c=\u22125.",
          concept="Standard Form ax+by+c=0")

        q(n1, QuestionType.FILL_BLANK,
          "For the equation 5x+2y=10, if y=0 then x=___.",
          {"tip": "Set y=0 and solve 5x=10"},
          "2",
          hint="5x+2(0)=10 \u2192 5x=10 \u2192 x=2.",
          explanation="Setting y=0: 5x=10 \u2192 x=2. So (2,0) is a solution \u2014 the x-intercept.",
          concept="Finding a Specific Solution")

        q(n1, QuestionType.MULTI_SELECT,
          "Select ALL equations that are linear equations in two variables:",
          {"choices": [
              {"id": 1, "text": "2x+3y=7"},
              {"id": 2, "text": "x\u00b2+y=4"},
              {"id": 3, "text": "x\u2212y=0"},
              {"id": 4, "text": "xy+3=10"},
              {"id": 5, "text": "0\u00b7x+5y=15"},
          ]},
          "1,3,5",
          hint="Both variables must appear with power 1. No xy or x\u00b2 terms allowed.",
          explanation="id1: yes (degree 1 in both). id2: no (x\u00b2 has degree 2). id3: yes. "
                      "id4: no (xy is degree 2). id5: yes (a=0 is allowed; b=5\u22600 so it qualifies).",
          concept="Identifying Linear Equations in Two Variables")

        q(n1, QuestionType.REARRANGE,
          "Rearrange to standard form ax+by+c=0: 3y = 5 \u2212 2x",
          {"chips": ["2x", "+", "3y", "\u2212", "5", "=", "0"]},
          "2x + 3y \u2212 5 = 0",
          hint="Move all terms to one side: add 2x to both sides, subtract 5.",
          explanation="3y=5\u22122x \u2192 2x+3y=5 \u2192 2x+3y\u22125=0. Standard form: a=2, b=3, c=\u22125.",
          concept="Rearranging to Standard Form")

        q(n1, QuestionType.REARRANGE,
          "Express as ax+by+c=0: 4x = 7 \u2212 3y",
          {"chips": ["4x", "+", "3y", "\u2212", "7", "=", "0"]},
          "4x + 3y \u2212 7 = 0",
          hint="Move 3y to the left and 7 to the right, then bring 7 left.",
          explanation="4x=7\u22123y \u2192 4x+3y=7 \u2192 4x+3y\u22127=0. Here a=4, b=3, c=\u22127.",
          concept="Rearranging to Standard Form")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 2 \u2014 Graphical Representation of a Linear Equation
        # ═══════════════════════════════════════════════════════════════════════
        n2 = lesson(2, "Graphical Representation of a Linear Equation", 15, nq=5,
                    description="Every linear equation in two variables graphs as a straight line. "
                                "We plot it by finding two convenient points (usually the x and y intercepts) "
                                "and drawing the line through them.",
                    objectives=[
                        "State that the graph of ax+by+c=0 is always a straight line",
                        "Find the x-intercept (set y=0) and y-intercept (set x=0)",
                        "Check whether a given point lies on a line by substitution",
                        "Understand that a vertical line x=k and horizontal line y=k are special cases",
                    ])

        q(n2, QuestionType.MCQ,
          "The graph of a linear equation in two variables is:",
          {"A": "Parabola", "B": "Circle", "C": "Straight line", "D": "Hyperbola"},
          "Straight line",
          hint="Linear means degree 1 \u2014 all degree-1 equations in two variables graph as lines.",
          explanation="Every linear equation ax+by+c=0 graphs as a perfectly straight line on the coordinate plane.",
          concept="Graph of a Linear Equation is a Straight Line")

        q(n2, QuestionType.MCQ,
          "Minimum number of points needed to draw the graph of a linear equation:",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "2",
          hint="Two points uniquely determine a straight line.",
          explanation="Two points uniquely determine a straight line. We typically find the x-intercept and y-intercept.",
          concept="Plotting a Linear Graph")

        q(n2, QuestionType.MCQ,
          "Does the point (1, 2) lie on the line x+y=3?",
          {"A": "Yes, because 1+2=3", "B": "No, because 1+2\u22603", "C": "Only at the origin", "D": "Cannot be determined"},
          "Yes, because 1+2=3",
          hint="Substitute x=1, y=2 into the equation.",
          explanation="Check: 1+2=3. The equation is satisfied, so (1,2) lies on the line x+y=3.",
          concept="Checking if a Point Lies on a Line")

        q(n2, QuestionType.MCQ,
          "The graph of x=5 is:",
          {"A": "A horizontal line", "B": "A vertical line passing through (5,0)", "C": "A line through the origin", "D": "A parabola"},
          "A vertical line passing through (5,0)",
          hint="x=5 means x is always 5, regardless of y.",
          explanation="x=5 means every point has x-coordinate 5. This is a vertical line crossing the x-axis at (5,0).",
          concept="Special Cases: Vertical and Horizontal Lines")

        q(n2, QuestionType.FILL_BLANK,
          "The x-intercept of 3x+2y=6 (set y=0) is x=___.",
          {"tip": "Set y=0 in 3x+2y=6 to get 3x=6"},
          "2",
          hint="3x+2(0)=6 \u2192 3x=6 \u2192 x=2.",
          explanation="Setting y=0: 3x=6 \u2192 x=2. The x-intercept is the point (2,0).",
          concept="Finding the x-intercept")

        q(n2, QuestionType.FILL_BLANK,
          "The y-intercept of 2x+y=8 (set x=0) is y=___.",
          {"tip": "Set x=0 in 2x+y=8 to get y=8"},
          "8",
          hint="2(0)+y=8 \u2192 y=8.",
          explanation="Setting x=0: y=8. The y-intercept is the point (0,8).",
          concept="Finding the y-intercept")

        q(n2, QuestionType.FILL_BLANK,
          "For 2x+3y=12, find y when x=3.",
          {"tip": "Sub x=3: 2(3)+3y=12 \u2192 6+3y=12 \u2192 3y=6"},
          "2",
          hint="2(3)+3y=12 \u2192 6+3y=12 \u2192 3y=6 \u2192 y=2.",
          explanation="Substituting x=3: 6+3y=12 \u2192 3y=6 \u2192 y=2. So (3,2) is a point on the line 2x+3y=12.",
          concept="Finding Points on a Line")

        q(n2, QuestionType.FILL_BLANK,
          "How many integer-coordinate points on the line y=2x+1 have x from \u22122 to 2 (inclusive)?",
          {"tip": "Try x=\u22122, \u22121, 0, 1, 2 \u2014 each gives an integer y"},
          "5",
          hint="For each integer x from \u22122 to 2, y=2x+1 gives an integer. Count: 5 values.",
          explanation="x=\u22122\u2192y=\u22123, x=\u22121\u2192y=\u22121, x=0\u2192y=1, x=1\u2192y=3, x=2\u2192y=5. All 5 are integer points.",
          concept="Integer Solutions on a Line")

        q(n2, QuestionType.MULTI_SELECT,
          "Which of the following points lie on the line 2x+y=7?",
          {"choices": [
              {"id": 1, "text": "(1, 5)"},
              {"id": 2, "text": "(3, 1)"},
              {"id": 3, "text": "(0, 7)"},
              {"id": 4, "text": "(2, 4)"},
              {"id": 5, "text": "(4, 0)"},
          ]},
          "1,2,3",
          hint="Substitute each point into 2x+y=7 and check.",
          explanation="(1,5): 2+5=7 \u2713 | (3,1): 6+1=7 \u2713 | (0,7): 0+7=7 \u2713 | (2,4): 4+4=8 \u2717 | (4,0): 8+0=8 \u2717",
          concept="Points on a Line")

        q(n2, QuestionType.REARRANGE,
          "To plot the line 3x\u22122y=6, arrange the steps in order:",
          {"chips": ["Find x-intercept (set y=0)", "Find y-intercept (set x=0)", "Plot both points", "Draw line through them"]},
          "Find x-intercept (set y=0) Find y-intercept (set x=0) Plot both points Draw line through them",
          hint="Standard approach: find two convenient points (intercepts), then join them.",
          explanation="Step 1: y=0 \u2192 3x=6 \u2192 x=2, point (2,0). Step 2: x=0 \u2192 \u22122y=6 \u2192 y=\u22123, point (0,\u22123). "
                      "Plot both and draw a line through them.",
          concept="Steps to Plot a Linear Equation")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 3 \u2014 Consistency \u2014 Intersecting, Parallel & Coincident Lines
        # ═══════════════════════════════════════════════════════════════════════
        n3 = lesson(3, "Consistency \u2014 Intersecting, Parallel & Coincident Lines", 20, nq=5,
                    description="A pair of linear equations can be consistent (at least one solution) or inconsistent "
                                "(no solution). We classify by comparing ratios a\u2081/a\u2082, b\u2081/b\u2082, c\u2081/c\u2082.",
                    objectives=[
                        "Classify a pair as intersecting, parallel, or coincident using ratio comparisons",
                        "Define consistent (unique or infinite solutions) and inconsistent (no solution)",
                        "Apply the ratio conditions to determine the number of solutions without solving",
                        "Find the value of k for which a pair has infinite or no solutions",
                    ])

        q(n3, QuestionType.MCQ,
          "If a\u2081/a\u2082 \u2260 b\u2081/b\u2082, the pair of equations has:",
          {"A": "No solution", "B": "Infinitely many solutions", "C": "Unique solution", "D": "Two solutions"},
          "Unique solution",
          hint="Different ratios of x and y coefficients means the lines must cross.",
          explanation="When a\u2081/a\u2082 \u2260 b\u2081/b\u2082, the lines have different slopes \u2014 they intersect at exactly one point.",
          concept="Intersecting Lines \u2014 Unique Solution")

        q(n3, QuestionType.MCQ,
          "Lines 2x+3y=9 and 4x+6y=18 are:",
          {"A": "Intersecting at one point", "B": "Parallel", "C": "Coincident", "D": "Perpendicular"},
          "Coincident",
          hint="Divide the second equation by 2.",
          explanation="4x+6y=18 \u00f7 2 gives 2x+3y=9 \u2014 identical to the first equation. "
                      "All ratios a\u2081/a\u2082=b\u2081/b\u2082=c\u2081/c\u2082=1/2. Infinitely many solutions.",
          concept="Coincident Lines \u2014 Infinite Solutions")

        q(n3, QuestionType.MCQ,
          "For a\u2081/a\u2082 = b\u2081/b\u2082 \u2260 c\u2081/c\u2082, the lines are:",
          {"A": "Coincident", "B": "Intersecting", "C": "Parallel", "D": "Perpendicular"},
          "Parallel",
          hint="Same direction (equal first two ratios) but different position (c ratio differs).",
          explanation="When the first two ratios are equal but c\u2081/c\u2082 differs, the lines are parallel \u2014 "
                      "same slope, different y-intercept. No solution exists.",
          concept="Parallel Lines \u2014 No Solution")

        q(n3, QuestionType.MCQ,
          "The pair x+y=5 and 2x+2y=10 represents:",
          {"A": "Inconsistent pair with no solution", "B": "Consistent pair with unique solution",
           "C": "Dependent pair with infinitely many solutions", "D": "Perpendicular lines"},
          "Dependent pair with infinitely many solutions",
          hint="Divide the second equation by 2.",
          explanation="2x+2y=10 \u00f7 2 gives x+y=5 \u2014 identical. Ratios: 1/2=1/2=5/10=1/2. "
                      "All equal \u2192 coincident \u2192 infinitely many solutions (dependent pair).",
          concept="Dependent / Coincident Pair")

        q(n3, QuestionType.FILL_BLANK,
          "The pair x+2y=4 and 2x+4y=12 has ___ solution(s).",
          {"tip": "Compare a\u2081/a\u2082, b\u2081/b\u2082, c\u2081/c\u2082: check if a\u2081/a\u2082 = b\u2081/b\u2082 but \u2260 c\u2081/c\u2082"},
          "0",
          hint="a\u2081/a\u2082=1/2, b\u2081/b\u2082=2/4=1/2, c\u2081/c\u2082=4/12=1/3. Since 1/2=1/2 but \u22601/3 \u2192 parallel \u2192 no solution.",
          explanation="The first two ratios are equal (1/2) but c\u2081/c\u2082=1/3\u22601/2. Parallel lines \u2014 no intersection.",
          concept="Identifying Inconsistent Pairs")

        q(n3, QuestionType.FILL_BLANK,
          "For k\u00b7x+3y=9 and 2x+y=3 to have infinitely many solutions, k=___.",
          {"tip": "Need a\u2081/a\u2082=b\u2081/b\u2082=c\u2081/c\u2082. From b and c ratios: 3/1=9/3=3, so k/2=3"},
          "6",
          hint="b\u2081/b\u2082=3/1=3, c\u2081/c\u2082=9/3=3. For infinite solutions: a\u2081/a\u2082=3 also, so k=6.",
          explanation="For coincident lines: k/2=3/1=9/3=3 \u2192 k=6. Verify: 6x+3y=9 \u00f7 3 gives 2x+y=3 \u2713.",
          concept="Finding k for Infinite Solutions")

        q(n3, QuestionType.FILL_BLANK,
          "Lines y=3x+2 and y=3x\u22125 are ___ (write: intersecting/parallel/coincident).",
          {"tip": "Both have slope 3 but different y-intercepts \u2014 they never meet"},
          "parallel",
          hint="Same slope (3) means same direction. Different y-intercepts (2 vs \u22125) means different positions.",
          explanation="Converting to standard form: 3x\u2212y+2=0 and 3x\u2212y\u22125=0. "
                      "a\u2081/a\u2082=1, b\u2081/b\u2082=1, c\u2081/c\u2082=2/\u22125 \u2260 1. Parallel lines.",
          concept="Identifying Parallel Lines from Slope Form")

        q(n3, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about a pair where a\u2081/a\u2082 = b\u2081/b\u2082 \u2260 c\u2081/c\u2082:",
          {"choices": [
              {"id": 1, "text": "The lines are parallel"},
              {"id": 2, "text": "No solution exists"},
              {"id": 3, "text": "The pair is inconsistent"},
              {"id": 4, "text": "The pair has a unique solution"},
              {"id": 5, "text": "The lines never meet"},
          ]},
          "1,2,3,5",
          hint="Equal first-two ratios with different c ratio means parallel lines.",
          explanation="id1 \u2713 (parallel). id2 \u2713 (no intersection). id3 \u2713 (inconsistent = no solution). "
                      "id4 \u2717 (unique solution requires a\u2081/a\u2082\u2260b\u2081/b\u2082). id5 \u2713 (parallel lines never meet).",
          concept="Properties of Parallel Lines")

        q(n3, QuestionType.MULTI_SELECT,
          "Which pairs are consistent (have at least one solution)?",
          {"choices": [
              {"id": 1, "text": "x+y=5 and x\u2212y=3"},
              {"id": 2, "text": "x+2y=4 and 2x+4y=12"},
              {"id": 3, "text": "2x+3y=9 and 4x+6y=18"},
              {"id": 4, "text": "x\u2212y=1 and 2x\u22122y=4"},
              {"id": 5, "text": "3x+y=7 and x\u2212y=1"},
          ]},
          "1,3,5",
          hint="Consistent means intersecting (unique) OR coincident (infinite). Parallel = inconsistent.",
          explanation="id1: a/a=1/1\u2260b/b=1/\u22121 \u2192 intersecting \u2713. id2: 1/2=1/2\u22601/3 \u2192 parallel \u2717. "
                      "id3: ratios all 1/2 \u2192 coincident \u2713. id4: 1/2=\u22121/\u22122=1/2\u22601/4 \u2192 parallel \u2717. "
                      "id5: a/a=3/1\u2260b/b=1/\u22121 \u2192 intersecting \u2713.",
          concept="Identifying Consistent Pairs")

        q(n3, QuestionType.MULTI_SELECT,
          "A pair is called 'dependent' when:",
          {"choices": [
              {"id": 1, "text": "Lines are coincident"},
              {"id": 2, "text": "Infinitely many solutions exist"},
              {"id": 3, "text": "a\u2081/a\u2082 = b\u2081/b\u2082 = c\u2081/c\u2082"},
              {"id": 4, "text": "The determinant a\u2081b\u2082\u2212a\u2082b\u2081 = 0 and lines overlap"},
              {"id": 5, "text": "a\u2081/a\u2082 \u2260 b\u2081/b\u2082"},
          ]},
          "1,2,3,4",
          hint="Dependent means one equation is a multiple of the other.",
          explanation="id1 \u2713, id2 \u2713, id3 \u2713 (all ratios equal), id4 \u2713 (det=0 and same line). "
                      "id5 \u2717 (unequal first two ratios means intersecting, not dependent).",
          concept="Dependent / Coincident Pairs")

        q(n3, QuestionType.REARRANGE,
          "Arrange the three consistency cases from 'most solutions' to 'least solutions':",
          {"chips": ["Coincident lines (infinite solutions)", "Intersecting lines (unique solution)", "Parallel lines (no solution)"]},
          "Coincident lines (infinite solutions) Intersecting lines (unique solution) Parallel lines (no solution)",
          hint="Infinite > one > zero solutions.",
          explanation="Coincident: all points on the line are solutions (infinite). "
                      "Intersecting: exactly one crossing point. Parallel: no intersection at all.",
          concept="Ordering Consistency Cases")

        q(n3, QuestionType.REARRANGE,
          "To classify a pair a\u2081x+b\u2081y+c\u2081=0 and a\u2082x+b\u2082y+c\u2082=0, arrange the steps:",
          {"chips": ["Compute a\u2081/a\u2082", "Compute b\u2081/b\u2082", "Compute c\u2081/c\u2082", "Compare all three ratios", "State intersecting/parallel/coincident"]},
          "Compute a\u2081/a\u2082 Compute b\u2081/b\u2082 Compute c\u2081/c\u2082 Compare all three ratios State intersecting/parallel/coincident",
          hint="You need all three ratios before you can classify.",
          explanation="Compute the three ratios first, then compare: "
                      "a\u2081/a\u2082\u2260b\u2081/b\u2082 \u2192 intersecting; equal first two, \u2260 third \u2192 parallel; all equal \u2192 coincident.",
          concept="Classification Steps")

        # ── LAB 1 (order=4) ───────────────────────────────────────────────────
        lab(4, "Line Intersection Explorer", 25,
            lab_type="LINE_INTERSECTION_LAB",
            lab_category=LabCategory.INTERACTIVE,
            required=3)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 5 \u2014 Substitution Method
        # ═══════════════════════════════════════════════════════════════════════
        n5 = lesson(5, "Substitution Method", 20, nq=5,
                    description="The substitution method solves a pair by expressing one variable in terms of the "
                                "other, substituting into the second equation, and solving. "
                                "Best when one coefficient is 1.",
                    objectives=[
                        "Express one variable in terms of the other from a simpler equation",
                        "Substitute into the second equation and solve the resulting single-variable equation",
                        "Back-substitute to find the second variable",
                        "Verify the solution in both original equations",
                    ])

        q(n5, QuestionType.MCQ,
          "The first step in the substitution method is:",
          {"A": "Add both equations", "B": "Express one variable in terms of the other",
           "C": "Multiply both equations", "D": "Subtract one equation from the other"},
          "Express one variable in terms of the other",
          hint="Substitution = replace one variable with an expression in the other.",
          explanation="We isolate one variable (say y) from one equation, then substitute that expression into "
                      "the other equation, reducing it to one variable.",
          concept="First Step of Substitution Method")

        q(n5, QuestionType.MCQ,
          "Solve by substitution: x+y=5 and 2x+y=7. Find x:",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "2",
          hint="From eq1: y=5\u2212x. Substitute into eq2.",
          explanation="From x+y=5: y=5\u2212x. Substituting into 2x+y=7: 2x+(5\u2212x)=7 \u2192 x=2. Then y=3.",
          concept="Solving by Substitution \u2014 Basic")

        q(n5, QuestionType.MCQ,
          "Using substitution on x+y=5 and y=x\u22121, find y:",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "2",
          hint="y is already expressed in terms of x. Substitute into x+y=5.",
          explanation="Substitute y=x\u22121 into x+y=5: x+(x\u22121)=5 \u2192 2x=6 \u2192 x=3, y=3\u22121=2.",
          concept="Solving by Substitution \u2014 y Given Directly")

        q(n5, QuestionType.FILL_BLANK,
          "From x+2y=7, express x in terms of y: x=___.",
          {"tip": "Move 2y to the right side"},
          "7\u22122y",
          hint="x+2y=7 \u2192 x=7\u22122y.",
          explanation="Subtracting 2y from both sides: x=7\u22122y. This can be substituted into the other equation.",
          concept="Expressing a Variable")

        q(n5, QuestionType.FILL_BLANK,
          "Solve x\u2212y=3 and x+y=7 by substitution. Value of x is ___.",
          {"tip": "From eq1: x=y+3. Substitute into x+y=7: (y+3)+y=7"},
          "5",
          hint="(y+3)+y=7 \u2192 2y=4 \u2192 y=2. Then x=y+3=5.",
          explanation="From x\u2212y=3: x=y+3. Into x+y=7: (y+3)+y=7 \u2192 2y=4 \u2192 y=2, x=5. Verify: 5\u22122=3 \u2713 and 5+2=7 \u2713.",
          concept="Solving by Substitution \u2014 Full Solution")

        q(n5, QuestionType.FILL_BLANK,
          "Solve x+2y=8 and x=y+2 by substitution. Find y:",
          {"tip": "Sub x=y+2 into x+2y=8: (y+2)+2y=8 \u2192 3y=6"},
          "2",
          hint="(y+2)+2y=8 \u2192 3y=6 \u2192 y=2.",
          explanation="Substituting x=y+2: (y+2)+2y=8 \u2192 3y=6 \u2192 y=2. Then x=2+2=4. Verify: 4+4=8 \u2713.",
          concept="Solving by Substitution \u2014 Variable Given")

        q(n5, QuestionType.FILL_BLANK,
          "For 5x+2y=16 and x=2, substitution gives y=___.",
          {"tip": "Sub x=2: 5(2)+2y=16 \u2192 10+2y=16 \u2192 2y=6"},
          "3",
          hint="10+2y=16 \u2192 2y=6 \u2192 y=3.",
          explanation="5(2)+2y=16 \u2192 10+2y=16 \u2192 2y=6 \u2192 y=3. Verify: 5(2)+2(3)=10+6=16 \u2713.",
          concept="Substitution with x Given")

        q(n5, QuestionType.MULTI_SELECT,
          "Substitution method is most convenient when:",
          {"choices": [
              {"id": 1, "text": "One equation has a variable with coefficient 1"},
              {"id": 2, "text": "Both equations have large coefficients like 17 and 23"},
              {"id": 3, "text": "One equation directly gives y in terms of x (like y=3x+2)"},
              {"id": 4, "text": "The equations involve decimals throughout"},
              {"id": 5, "text": "One variable can be easily isolated without fractions"},
          ]},
          "1,3,5",
          hint="Substitution is easiest when isolation gives no fractions.",
          explanation="id1 \u2713 (coefficient 1 means isolation is immediate). id2 \u2717 (large coefficients make fractions messy). "
                      "id3 \u2713 (y already isolated). id4 \u2717 (decimals suit elimination better). id5 \u2713.",
          concept="When to Use Substitution")

        q(n5, QuestionType.REARRANGE,
          "Arrange the steps of the substitution method in correct order:",
          {"chips": ["Express y in terms of x from one equation", "Substitute into the other equation",
                     "Solve for x", "Back-substitute to find y", "Verify in both original equations"]},
          "Express y in terms of x from one equation Substitute into the other equation Solve for x Back-substitute to find y Verify in both original equations",
          hint="Expression \u2192 substitution \u2192 solve \u2192 back-substitute \u2192 verify.",
          explanation="Each step depends on the previous. You must express first, then substitute, then solve, "
                      "back-substitute, and finally verify in BOTH equations.",
          concept="Steps of Substitution Method")

        q(n5, QuestionType.REARRANGE,
          "Solve x+y=10 and 2x\u2212y=2 by substitution. Arrange the working steps:",
          {"chips": ["y = 10 \u2212 x", "2x \u2212 (10 \u2212 x) = 2", "3x = 12, so x = 4", "y = 10 \u2212 4 = 6", "Check: 4+6=10 \u2713 and 8\u22126=2 \u2713"]},
          "y = 10 \u2212 x 2x \u2212 (10 \u2212 x) = 2 3x = 12, so x = 4 y = 10 \u2212 4 = 6 Check: 4+6=10 \u2713 and 8\u22126=2 \u2713",
          hint="From eq1 express y, substitute into eq2, solve, back-substitute, verify.",
          explanation="From x+y=10: y=10\u2212x. Into 2x\u2212y=2: 2x\u2212(10\u2212x)=2 \u2192 3x=12 \u2192 x=4, y=6.",
          concept="Substitution \u2014 Worked Example")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 6 \u2014 Elimination Method
        # ═══════════════════════════════════════════════════════════════════════
        n6 = lesson(6, "Elimination Method", 20, nq=5,
                    description="The elimination method multiplies one or both equations so that the coefficient "
                                "of one variable becomes equal in both equations. Adding or subtracting then "
                                "eliminates that variable. Best when coefficients can be equalised easily.",
                    objectives=[
                        "Multiply equations to make coefficients of one variable equal",
                        "Add or subtract equations to eliminate one variable",
                        "Solve for the remaining variable and back-substitute",
                        "Recognise when elimination reveals 0=k (no solution) or 0=0 (infinite solutions)",
                    ])

        q(n6, QuestionType.MCQ,
          "In the elimination method, we multiply equations to make:",
          {"A": "Constants equal", "B": "Coefficients of one variable numerically equal",
           "C": "Both equations identical", "D": "The right-hand sides equal"},
          "Coefficients of one variable numerically equal",
          hint="Equal coefficients allow us to add/subtract and cancel that variable.",
          explanation="We make the coefficient of x (or y) the same in both equations so that "
                      "addition or subtraction eliminates it.",
          concept="Goal of the Elimination Method")

        q(n6, QuestionType.MCQ,
          "Solve 2x+3y=11 and 2x\u22123y=1 by elimination. Find x:",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "3",
          hint="The x-coefficients are already equal. Add both equations.",
          explanation="Adding: (2x+3y)+(2x\u22123y)=11+1 \u2192 4x=12 \u2192 x=3. "
                      "Back-substitute: 6+3y=11 \u2192 y=5/3.",
          concept="Elimination by Addition")

        q(n6, QuestionType.MCQ,
          "Solve 3x\u2212y=8 and x+y=4 by elimination (add). Find x:",
          {"A": "2", "B": "3", "C": "4", "D": "5"},
          "3",
          hint="Adding eliminates y since +y and \u2212y cancel.",
          explanation="Adding: (3x\u2212y)+(x+y)=8+4 \u2192 4x=12 \u2192 x=3. Then y=4\u22123=1. Verify: 9\u22121=8 \u2713.",
          concept="Elimination by Addition \u2014 Basic")

        q(n6, QuestionType.FILL_BLANK,
          "Solve 3x+4y=10 and x\u2212y=1. Multiply eq2 by 3 and subtract from eq1 to get 7y=___.",
          {"tip": "eq1: 3x+4y=10; eq2\u00d73: 3x\u22123y=3. Subtract eq2\u00d73 from eq1."},
          "7",
          hint="3x+4y\u2212(3x\u22123y)=10\u22123 \u2192 7y=7.",
          explanation="eq1 minus eq2\u00d73: (3x+4y)\u2212(3x\u22123y)=10\u22123 \u2192 7y=7 \u2192 y=1. Then x=y+1=2.",
          concept="Elimination by Subtraction")

        q(n6, QuestionType.FILL_BLANK,
          "Solve x+y=5 and 3x\u22122y=5 by elimination. Multiply eq1 by 2 and add to eq2. Find x:",
          {"tip": "eq1\u00d72: 2x+2y=10. Add to 3x\u22122y=5 \u2192 5x=15"},
          "3",
          hint="2x+2y+3x\u22122y=10+5 \u2192 5x=15 \u2192 x=3.",
          explanation="2x+2y=10 (eq1\u00d72). Adding 3x\u22122y=5: 5x=15 \u2192 x=3. Then y=5\u22123=2. Verify: 9\u22124=5 \u2713.",
          concept="Elimination by Multiplication and Addition")

        q(n6, QuestionType.FILL_BLANK,
          "Solve 2x+y=8 and x+2y=7. Add both equations to get 3x+3y=15, so x+y=___.",
          {"tip": "3(x+y)=15 \u2192 x+y=?"},
          "5",
          hint="3x+3y=15 \u2192 x+y=5.",
          explanation="Adding: 3x+3y=15 \u2192 x+y=5. Now subtract eq2 from eq1: x\u2212y=1. "
                      "From x+y=5 and x\u2212y=1: x=3, y=2.",
          concept="Elimination \u2014 Adding Both Equations")

        q(n6, QuestionType.MULTI_SELECT,
          "In which cases does elimination give the result 0=k (k\u22600)?",
          {"choices": [
              {"id": 1, "text": "Parallel lines (inconsistent pair)"},
              {"id": 2, "text": "Intersecting lines (unique solution)"},
              {"id": 3, "text": "Coincident lines"},
              {"id": 4, "text": "The pair has no solution"},
              {"id": 5, "text": "a\u2081/a\u2082 = b\u2081/b\u2082 \u2260 c\u2081/c\u2082"},
          ]},
          "1,4,5",
          hint="0=k (k\u22600) is a contradiction \u2014 no solution exists.",
          explanation="id1 \u2713 (parallel \u2192 no solution \u2192 contradiction after elimination). "
                      "id2 \u2717 (unique solution gives a valid equation). id3 \u2717 (coincident gives 0=0). "
                      "id4 \u2713. id5 \u2713 (this ratio condition describes parallel lines).",
          concept="What 0=k Means in Elimination")

        q(n6, QuestionType.MULTI_SELECT,
          "Elimination method is preferred over substitution when:",
          {"choices": [
              {"id": 1, "text": "Both equations already have the same coefficient for one variable"},
              {"id": 2, "text": "One variable has coefficient 1 in one equation"},
              {"id": 3, "text": "Coefficients can be equalised by multiplying by small integers"},
              {"id": 4, "text": "The equations involve fractions that would complicate substitution"},
              {"id": 5, "text": "One equation directly gives y in terms of x"},
          ]},
          "1,3,4",
          hint="Elimination avoids isolation, which helps when coefficients are large or fractional.",
          explanation="id1 \u2713 (already equal \u2192 just add/subtract). id2 \u2717 (coefficient 1 favours substitution). "
                      "id3 \u2713 (small multipliers keep work clean). id4 \u2713 (no isolation needed). "
                      "id5 \u2717 (direct expression favours substitution).",
          concept="When to Use Elimination")

        q(n6, QuestionType.REARRANGE,
          "Arrange the elimination method steps in order:",
          {"chips": ["Choose a variable to eliminate", "Multiply equations to equalise its coefficients",
                     "Add or subtract the equations", "Solve for the remaining variable",
                     "Back-substitute to find the other variable", "Verify in both equations"]},
          "Choose a variable to eliminate Multiply equations to equalise its coefficients Add or subtract the equations Solve for the remaining variable Back-substitute to find the other variable Verify in both equations",
          hint="Plan \u2192 equalise \u2192 eliminate \u2192 solve \u2192 back-substitute \u2192 verify.",
          explanation="Each step follows logically from the previous. Verification is the final but essential step.",
          concept="Steps of Elimination Method")

        q(n6, QuestionType.REARRANGE,
          "Solve 4x+3y=24 and x+y=7 by elimination. Arrange the working:",
          {"chips": ["Multiply eq2 by 3: 3x+3y=21", "Subtract from eq1: x=3",
                     "Substitute x=3 into x+y=7: y=4", "Verify: 4(3)+3(4)=12+12=24 \u2713"]},
          "Multiply eq2 by 3: 3x+3y=21 Subtract from eq1: x=3 Substitute x=3 into x+y=7: y=4 Verify: 4(3)+3(4)=12+12=24 \u2713",
          hint="Make y-coefficients equal (both 3), subtract, solve for x, then find y.",
          explanation="4x+3y\u2212(3x+3y)=24\u221221 \u2192 x=3. Then 3+y=7 \u2192 y=4.",
          concept="Elimination \u2014 Worked Example")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 7 \u2014 Forming Equations from Word Problems
        # ═══════════════════════════════════════════════════════════════════════
        n7 = lesson(7, "Forming Equations from Word Problems", 25, nq=5,
                    description="Real-world situations often give two conditions involving two unknowns. "
                                "We define variables, translate each condition into a linear equation, "
                                "solve the pair, and verify the answer in the original problem.",
                    objectives=[
                        "Identify the two unknowns in a word problem and define variables for them",
                        "Translate verbal conditions into linear equations accurately",
                        "Solve the formed pair using substitution or elimination",
                        "Verify the answer satisfies both original word-problem conditions",
                    ])

        q(n7, QuestionType.MCQ,
          "The sum of two numbers is 36 and their difference is 10. The smaller number is:",
          {"A": "10", "B": "13", "C": "23", "D": "26"},
          "13",
          hint="x+y=36, x\u2212y=10. Add both equations to find the larger number.",
          explanation="x+y=36, x\u2212y=10. Adding: 2x=46 \u2192 x=23 (larger). y=36\u221223=13 (smaller).",
          concept="Sum and Difference of Two Numbers")

        q(n7, QuestionType.MCQ,
          "5 pencils and 7 pens cost \u20b950. 7 pencils and 5 pens cost \u20b946. Cost of one pen (\u20b9):",
          {"A": "3", "B": "4", "C": "5", "D": "6"},
          "5",
          hint="Set up 5p+7q=50 and 7p+5q=46, then add and subtract.",
          explanation="5p+7q=50 and 7p+5q=46. Add: 12(p+q)=96 \u2192 p+q=8. "
                      "Subtract: \u22122p+2q=4 \u2192 q\u2212p=2. So q=5, p=3.",
          concept="Cost Problems \u2014 Two Equations")

        q(n7, QuestionType.MCQ,
          "A fraction becomes 9/11 when 2 is added to both numerator and denominator. "
          "It becomes 5/6 when 3 is added to both. The original fraction is:",
          {"A": "5/7", "B": "7/9", "C": "3/5", "D": "7/11"},
          "7/9",
          hint="Let the fraction be n/d. Form two equations from the two conditions.",
          explanation="(n+2)/(d+2)=9/11 \u2192 11n\u22129d=\u22124. (n+3)/(d+3)=5/6 \u2192 6n\u22125d=\u22123. "
                      "Solving: n=7, d=9. Original fraction is 7/9.",
          concept="Fraction Problems")

        q(n7, QuestionType.MCQ,
          "The present ages of A and B differ by 3 years. Six years ago, A\u2019s age was 4 times B\u2019s age. "
          "A\u2019s present age is:",
          {"A": "7", "B": "10", "C": "13", "D": "15"},
          "10",
          hint="A=B+3. Six years ago: (A\u22126)=4(B\u22126).",
          explanation="A=B+3 and (A\u22126)=4(B\u22126). Substituting: B+3\u22126=4B\u221224 \u2192 3B=21 \u2192 B=7, A=10.",
          concept="Age Problems")

        q(n7, QuestionType.FILL_BLANK,
          "Two numbers sum to 64 and one exceeds the other by 10. The larger number is ___.",
          {"tip": "x+y=64 and x\u2212y=10. Add both equations: 2x=74"},
          "37",
          hint="2x=74 \u2192 x=37 (larger). y=64\u221237=27 (smaller).",
          explanation="x+y=64 and x\u2212y=10. Adding: 2x=74 \u2192 x=37. Subtracting: 2y=54 \u2192 y=27.",
          concept="Sum and Difference Problems")

        q(n7, QuestionType.FILL_BLANK,
          "A boat goes 30 km upstream in 6 hours and 30 km downstream in 3 hours. "
          "Speed of stream (km/h) = ___.",
          {"tip": "Upstream speed = b\u2212s = 30/6 = 5. Downstream speed = b+s = 30/3 = 10."},
          "2.5",
          hint="b\u2212s=5 and b+s=10. Subtract: 2s=5 \u2192 s=2.5.",
          explanation="Upstream: b\u2212s=5. Downstream: b+s=10. Subtracting: 2s=5 \u2192 s=2.5 km/h.",
          concept="Speed, Time and Distance Problems")

        q(n7, QuestionType.FILL_BLANK,
          "Cost of 2 kg apples and 1 kg grapes is \u20b9160. Cost of 1 kg apples and 2 kg grapes is \u20b9200. "
          "Cost of 1 kg grapes = \u20b9___.",
          {"tip": "2a+g=160 and a+2g=200. Subtract eq1 from eq2 to find g\u2212a."},
          "80",
          hint="2a+g=160, a+2g=200. Subtract: \u2212a+g=40 \u2192 g=a+40. Sub: 2a+(a+40)=160 \u2192 3a=120 \u2192 a=40, g=80.",
          explanation="a=40, g=80. Verify: 2(40)+80=160 \u2713 and 40+2(80)=200 \u2713.",
          concept="Cost Problems")

        q(n7, QuestionType.FILL_BLANK,
          "The numerator of a fraction increases by 4 makes it 3/4; denominator decreases by 2 makes it 1/2. "
          "Original denominator = ___.",
          {"tip": "(n+4)/d=3/4 and n/(d\u22122)=1/2. From 2nd: 2n=d\u22122 \u2192 d=2n+2."},
          "12",
          hint="From 2nd: d=2n+2. Into 1st: 4(n+4)=3(2n+2) \u2192 4n+16=6n+6 \u2192 2n=10 \u2192 n=5, d=12.",
          explanation="(5+4)/12=9/12=3/4 \u2713. 5/(12\u22122)=5/10=1/2 \u2713.",
          concept="Fraction Problems \u2014 Two Conditions")

        q(n7, QuestionType.REARRANGE,
          "Form the equations for: 'Two numbers sum to 64 and one exceeds the other by 10'",
          {"chips": ["x", "+", "y", "=", "64", "and", "x", "\u2212", "y", "=", "10"]},
          "x + y = 64 and x \u2212 y = 10",
          hint="Sum \u2192 x+y=64. 'Exceeds by 10' \u2192 x\u2212y=10.",
          explanation="Let x = larger, y = smaller. Sum: x+y=64. x exceeds y by 10: x\u2212y=10.",
          concept="Forming Equations from Words")

        q(n7, QuestionType.REARRANGE,
          "A class of 40 students: 3 times the girls equals twice the boys. Form the two equations:",
          {"chips": ["g", "+", "b", "=", "40", "and", "3g", "=", "2b"]},
          "g + b = 40 and 3g = 2b",
          hint="Total: g+b=40. Condition: 3g=2b.",
          explanation="Let g = girls, b = boys. Total: g+b=40. 3 times girls = twice boys: 3g=2b. "
                      "Solving: g=40\u2212b, 3(40\u2212b)=2b \u2192 120=5b \u2192 b=24, g=16.",
          concept="Forming Equations from a Scenario")

        q(n7, QuestionType.MULTI_SELECT,
          "Which word problems naturally lead to a pair of linear equations?",
          {"choices": [
              {"id": 1, "text": "Sum and difference of two numbers given"},
              {"id": 2, "text": "Ages of two people with two conditions"},
              {"id": 3, "text": "Area of a square given one side"},
              {"id": 4, "text": "Cost of two items given in two purchase combinations"},
              {"id": 5, "text": "Speed of boat upstream and downstream with two journeys"},
          ]},
          "1,2,4,5",
          hint="We need exactly two unknowns and two conditions to form a solvable pair.",
          explanation="id1 \u2713 (two numbers, two conditions). id2 \u2713 (two ages, two conditions). "
                      "id3 \u2717 (one unknown, one equation). id4 \u2713 (two items, two total costs). id5 \u2713.",
          concept="Recognising Word Problems That Use Pairs")

        q(n7, QuestionType.MULTI_SELECT,
          "When forming equations from word problems, which steps are essential?",
          {"choices": [
              {"id": 1, "text": "Define variables clearly with units"},
              {"id": 2, "text": "Always use x and y (no other letter names)"},
              {"id": 3, "text": "Translate each condition into one equation"},
              {"id": 4, "text": "Verify the solution satisfies both original conditions"},
              {"id": 5, "text": "Guess-and-check first to estimate the answer"},
          ]},
          "1,3,4",
          hint="Variable naming, equation forming, and verification are the core steps.",
          explanation="id1 \u2713 (clear definitions prevent errors). id2 \u2717 (any letter is fine, e.g. p, q, n, d). "
                      "id3 \u2713 (one condition \u2192 one equation). id4 \u2713 (always verify in original problem). "
                      "id5 \u2717 (not a required step).",
          concept="Process for Word Problems")

        # ── LAB 2 (order=8) ───────────────────────────────────────────────────
        lab(8, "Equation Solver Lab", 25,
            lab_type="EQUATION_SOLVER_LAB",
            lab_category=LabCategory.INTERACTIVE,
            required=6)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 9 \u2014 Applications & Verification
        # ═══════════════════════════════════════════════════════════════════════
        n9 = lesson(9, "Applications & Verification", 20, nq=5,
                    description="Apply both substitution and elimination to real-world multi-step problems. "
                                "Always verify your solution in both original equations and the original conditions.",
                    objectives=[
                        "Solve real-world problems involving fares, denominations, and rates",
                        "Verify solutions by substituting back into both equations",
                        "Identify and classify pairs from ratio conditions (cumulative from Node 3)",
                        "Choose the more efficient method (substitution vs elimination) for a given problem",
                    ])

        q(n9, QuestionType.MCQ,
          "Auto-rickshaw fare: \u20b925 fixed for the first 2 km, then \u20b915 per km after that. Fare for 10 km:",
          {"A": "\u20b9125", "B": "\u20b9145", "C": "\u20b9155", "D": "\u20b9175"},
          "\u20b9145",
          hint="Extra distance = 10\u22122 = 8 km at \u20b915/km.",
          explanation="\u20b925 + 15\u00d7(10\u22122) = \u20b925 + \u20b9120 = \u20b9145.",
          concept="Fare/Rate Problems")

        q(n9, QuestionType.MCQ,
          "Meena withdrew \u20b92000 using only \u20b950 and \u20b9100 notes \u2014 25 notes total. Number of \u20b9100 notes:",
          {"A": "5", "B": "10", "C": "15", "D": "20"},
          "15",
          hint="50x+100y=2000 and x+y=25. Multiply eq2 by 50 and subtract.",
          explanation="50x+100y=2000, x+y=25. Multiply eq2 by 50: 50x+50y=1250. "
                      "Subtract: 50y=750 \u2192 y=15. Then x=10. Verify: 50(10)+100(15)=2000 \u2713.",
          concept="Denomination Problems")

        q(n9, QuestionType.MCQ,
          "Library: fixed charge for 3 days then \u20b9d extra per day. "
          "Saritha paid \u20b927 for 7 days, Susy paid \u20b921 for 5 days. Fixed charge (\u20b9):",
          {"A": "\u20b912", "B": "\u20b915", "C": "\u20b918", "D": "\u20b921"},
          "\u20b915",
          hint="f+4d=27 and f+2d=21. Subtract to find d, then find f.",
          explanation="f+4d=27, f+2d=21. Subtracting: 2d=6 \u2192 d=3. Then f=21\u22126=15. "
                      "Verify: 15+4(3)=27 \u2713.",
          concept="Fixed and Variable Rate Problems")

        q(n9, QuestionType.FILL_BLANK,
          "Verify (4, 2) is the solution of 2x+3y=14 and x\u2212y=2. Check the 2nd equation: 4\u22122=___.",
          {"tip": "Simply compute 4\u22122"},
          "2",
          hint="4\u22122=2 which equals the RHS. So (4,2) satisfies x\u2212y=2.",
          explanation="Check eq1: 2(4)+3(2)=8+6=14 \u2713. Check eq2: 4\u22122=2 \u2713. Solution verified.",
          concept="Verification of a Solution")

        q(n9, QuestionType.FILL_BLANK,
          "A motorboat travels 20 km upstream in 2 hours and returns downstream in 1 hour. "
          "Speed of current (km/h) = ___.",
          {"tip": "Upstream speed b\u2212s=10. Downstream speed b+s=20. Subtract to find 2s."},
          "5",
          hint="b\u2212s=10 and b+s=20. Subtracting: \u22122s=\u221210 \u2192 s=5.",
          explanation="Upstream: 20/2=10 km/h = b\u2212s. Downstream: 20/1=20 km/h = b+s. "
                      "Adding: 2b=30 \u2192 b=15. Subtracting: 2s=10 \u2192 s=5 km/h.",
          concept="Upstream/Downstream Problems")

        q(n9, QuestionType.FILL_BLANK,
          "Ratio of incomes A:B = 9:7 and expenditures A:B = 4:3. Each saves \u20b92000. A\u2019s income = \u20b9___.",
          {"tip": "9k\u22124m=2000 and 7k\u22123m=2000. Multiply: 27k\u221212m=6000 and 28k\u221212m=8000."},
          "18000",
          hint="Subtracting: k=2000. A\u2019s income = 9k = 9\u00d72000 = 18000.",
          explanation="9k\u22124m=2000 (1) and 7k\u22123m=2000 (2). (1)\u00d73: 27k\u221212m=6000. (2)\u00d74: 28k\u221212m=8000. "
                      "Subtracting: k=2000. A=9\u00d72000=\u20b918000.",
          concept="Income/Expenditure Problems")

        q(n9, QuestionType.MULTI_SELECT,
          "To verify a solution (x\u2080, y\u2080) for a pair of equations, you must:",
          {"choices": [
              {"id": 1, "text": "Substitute into the first equation only"},
              {"id": 2, "text": "Substitute into both equations"},
              {"id": 3, "text": "Check that both equations give true statements"},
              {"id": 4, "text": "Confirm the point lies on both lines graphically"},
              {"id": 5, "text": "Ensure x\u2080 and y\u2080 are positive"},
          ]},
          "2,3",
          hint="A solution must satisfy ALL equations in the pair.",
          explanation="id1 \u2717 (one equation is insufficient). id2 \u2713 (must check both). id3 \u2713 (both must be true). "
                      "id4 \u2717 (graphical check is optional, not required). id5 \u2717 (solutions can be negative).",
          concept="Verification Requirements")

        q(n9, QuestionType.MULTI_SELECT,
          "A and B together finish a job in 3 days; A alone takes 5 days. "
          "Which equations correctly model B\u2019s daily work rate?",
          {"choices": [
              {"id": 1, "text": "1/a + 1/b = 1/3, where a=5"},
              {"id": 2, "text": "a + b = 3, where a=5"},
              {"id": 3, "text": "3(1/a + 1/b) = 1, where a=5"},
              {"id": 4, "text": "1/5 + 1/b = 1/3"},
              {"id": 5, "text": "b = 3 \u2212 a = \u22122"},
          ]},
          "1,3,4",
          hint="Rate + Rate = combined rate. A\u2019s rate=1/5, combined rate=1/3.",
          explanation="id1 \u2713 (combined rate equation with a=5). id2 \u2717 (days don\u2019t add like that). "
                      "id3 \u2713 (multiply by 3: same as id1). id4 \u2713 (substituting a=5 directly). "
                      "id5 \u2717 (incorrect algebra).",
          concept="Work Rate Problems")

        q(n9, QuestionType.REARRANGE,
          "Steps to solve a word-problem pair end-to-end:",
          {"chips": ["Define variables", "Form two equations from conditions",
                     "Solve by substitution or elimination", "Find both variable values",
                     "Verify in original word problem conditions"]},
          "Define variables Form two equations from conditions Solve by substitution or elimination Find both variable values Verify in original word problem conditions",
          hint="Always end with verification in the ORIGINAL problem (not just the equations).",
          explanation="Defining variables first prevents confusion. Verification in the original word problem "
                      "catches errors from mis-translating conditions into equations.",
          concept="End-to-End Problem Solving Steps")

        q(n9, QuestionType.REARRANGE,
          "Coach buys 7 bats & 6 balls for \u20b93800; 3 bats & 5 balls for \u20b91750. "
          "Arrange elimination steps to find bat price:",
          {"chips": [
              "7b+6c=3800 (\u00d75) \u2192 35b+30c=19000",
              "3b+5c=1750 (\u00d76) \u2192 18b+30c=10500",
              "Subtract: 17b=8500 \u2192 b=500",
              "Verify: 7(500)+6c=3800 \u2192 c=50",
          ]},
          "7b+6c=3800 (\u00d75) \u2192 35b+30c=19000 3b+5c=1750 (\u00d76) \u2192 18b+30c=10500 Subtract: 17b=8500 \u2192 b=500 Verify: 7(500)+6c=3800 \u2192 c=50",
          hint="Multiply to make c-coefficients equal (both 30), then subtract.",
          explanation="Eliminating c: 19000\u221210500=8500 with 17b \u2192 b=500. Then c=50. "
                      "Verify in second equation: 3(500)+5(50)=1500+250=1750 \u2713.",
          concept="Elimination \u2014 Real-World Application")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 10 \u2014 Chapter Test
        # ═══════════════════════════════════════════════════════════════════════
        nt = test(10, "Linear Equations \u2014 Chapter 3 Final Assessment", 50, nq=12)

        q(nt, QuestionType.MCQ,
          "Lines x+2y\u22124=0 and 2x+4y\u221212=0 represent:",
          {"A": "Intersecting lines", "B": "Parallel lines", "C": "Coincident lines", "D": "Perpendicular lines"},
          "Parallel lines",
          hint="Compare a\u2081/a\u2082, b\u2081/b\u2082, c\u2081/c\u2082.",
          explanation="a\u2081/a\u2082=1/2, b\u2081/b\u2082=2/4=1/2, c\u2081/c\u2082=\u22124/\u221212=1/3. "
                      "Since 1/2=1/2 but \u22601/3 \u2192 parallel lines.",
          concept="Classification Using Ratios")

        q(nt, QuestionType.MCQ,
          "Substitution on 2x+y=9 and x=y gives:",
          {"A": "x=2, y=2", "B": "x=3, y=3", "C": "x=4, y=4", "D": "x=5, y=5"},
          "x=3, y=3",
          hint="Sub x=y into 2x+y=9.",
          explanation="x=y so 2y+y=9 \u2192 3y=9 \u2192 y=3, x=3. Verify: 6+3=9 \u2713.",
          concept="Substitution Method")

        q(nt, QuestionType.MCQ,
          "Number of solutions of 3x+2y=5 and 9x+6y=10:",
          {"A": "0", "B": "1", "C": "2", "D": "Infinitely many"},
          "0",
          hint="Multiply eq1 by 3 and compare with eq2.",
          explanation="3\u00d7(3x+2y=5) gives 9x+6y=15 \u2260 10. "
                      "a\u2081/a\u2082=b\u2081/b\u2082=1/3 but c\u2081/c\u2082=5/10=1/2\u22601/3 \u2192 parallel, no solution.",
          concept="Identifying No-Solution Pairs")

        q(nt, QuestionType.MCQ,
          "Elimination: 3x+y=9 and x+y=5. Find x:",
          {"A": "1", "B": "2", "C": "3", "D": "4"},
          "2",
          hint="Subtract eq2 from eq1 to eliminate y.",
          explanation="(3x+y)\u2212(x+y)=9\u22125 \u2192 2x=4 \u2192 x=2. Then y=5\u22122=3. Verify: 6+3=9 \u2713.",
          concept="Elimination Method")

        q(nt, QuestionType.MCQ,
          "Akhila: ride tickets cost \u20b93 each, hoopla tickets \u20b94 each. "
          "She bought half as many hoopla tickets as ride tickets and spent \u20b920 total. "
          "Number of ride tickets:",
          {"A": "2", "B": "3", "C": "4", "D": "5"},
          "4",
          hint="Let r=ride tickets, h=hoopla. h=r/2 and 3r+4h=20.",
          explanation="h=r/2 so 3r+4(r/2)=20 \u2192 3r+2r=20 \u2192 5r=20 \u2192 r=4.",
          concept="Word Problem \u2014 Substitution")

        q(nt, QuestionType.FILL_BLANK,
          "Solve x+y=14 and x\u2212y=4. Value of x=___.",
          {"tip": "Add both equations: 2x=18"},
          "9",
          hint="Adding: 2x=18 \u2192 x=9. Then y=14\u22129=5.",
          explanation="x+y=14 and x\u2212y=4. Adding: 2x=18 \u2192 x=9, y=5. Verify: 9+5=14 \u2713 and 9\u22125=4 \u2713.",
          concept="Elimination by Addition")

        q(nt, QuestionType.FILL_BLANK,
          "Ratio of incomes A:B = 9:7, expenditures A:B = 4:3. Each saves \u20b92000. Income of A = \u20b9___.",
          {"tip": "9k\u22124m=2000 and 7k\u22123m=2000. Multiply and subtract to find k."},
          "18000",
          hint="k=2000 (from subtraction after multiplying). A\u2019s income=9k=18000.",
          explanation="27k\u221212m=6000 and 28k\u221212m=8000. Subtract: k=2000. A=9\u00d72000=\u20b918000.",
          concept="Income/Expenditure Word Problem")

        q(nt, QuestionType.FILL_BLANK,
          "For ax+by+c=0 and dx+ey+f=0 to be coincident, the condition is a/d = b/e = ___.",
          {"tip": "All three coefficient ratios must be equal"},
          "c/f",
          hint="For coincident lines, a/d = b/e = c/f.",
          explanation="Coincident lines are the same line \u2014 every ratio of corresponding coefficients is equal.",
          concept="Condition for Coincident Lines")

        q(nt, QuestionType.MULTI_SELECT,
          "Select ALL pairs that have a unique solution:",
          {"choices": [
              {"id": 1, "text": "x+y=5 and 2x+2y=10"},
              {"id": 2, "text": "x\u2212y=3 and x+y=7"},
              {"id": 3, "text": "2x+3y=4 and 4x+6y=9"},
              {"id": 4, "text": "3x\u2212y=2 and x+y=6"},
              {"id": 5, "text": "x+2y=4 and 2x+4y=8"},
          ]},
          "2,4",
          hint="Unique solution requires a\u2081/a\u2082 \u2260 b\u2081/b\u2082.",
          explanation="id1: coincident (ratios all 1/2) \u2717. id2: 1/1\u22601/\u22121 \u2192 intersecting \u2713. "
                      "id3: 1/2=3/6\u22601/9? No: c ratio=4/9\u22601/2 but a=b ratios \u2192 parallel \u2717. "
                      "id4: 3/1\u22601/1 \u2192 intersecting \u2713. id5: 1/2=2/4 ratios equal \u2192 coincident \u2717.",
          concept="Identifying Unique-Solution Pairs")

        q(nt, QuestionType.MULTI_SELECT,
          "Which statements about substitution and elimination are TRUE?",
          {"choices": [
              {"id": 1, "text": "Both methods always give the same answer"},
              {"id": 2, "text": "Substitution is most convenient when one coefficient is 1"},
              {"id": 3, "text": "Elimination is preferred when coefficients are already equal"},
              {"id": 4, "text": "If elimination gives 0=0, lines are coincident"},
              {"id": 5, "text": "If elimination gives 0=5, lines are coincident"},
          ]},
          "1,2,3,4",
          hint="0=k (k\u22600) means no solution (parallel); 0=0 means infinite solutions (coincident).",
          explanation="id1 \u2713 (solution is unique to the equations). id2 \u2713. id3 \u2713. id4 \u2713 (0=0 is always true). "
                      "id5 \u2717 (0=5 is a contradiction \u2192 parallel, not coincident).",
          concept="Comparing Substitution and Elimination")

        q(nt, QuestionType.REARRANGE,
          "The correct condition for coincident lines (arrange in ratio form):",
          {"chips": ["a\u2081/a\u2082", "=", "b\u2081/b\u2082", "=", "c\u2081/c\u2082"]},
          "a\u2081/a\u2082 = b\u2081/b\u2082 = c\u2081/c\u2082",
          hint="All three ratios must be equal for the lines to be the same.",
          explanation="This is the coincident lines condition from NCERT. "
                      "All coefficient ratios equal means one equation is a scalar multiple of the other.",
          concept="Coincident Lines Condition")

        q(nt, QuestionType.REARRANGE,
          "Arrange consistency cases from most to least solutions:",
          {"chips": ["Coincident \u2014 infinite solutions", "Intersecting \u2014 one solution", "Parallel \u2014 no solution"]},
          "Coincident \u2014 infinite solutions Intersecting \u2014 one solution Parallel \u2014 no solution",
          hint="Infinite > one > zero.",
          explanation="Coincident: every point is a solution. Intersecting: exactly one point. Parallel: no point.",
          concept="Summary of Consistency Cases")

        # ═══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════════
        prereq_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Linear Equations \u2014 Prerequisites",
            purpose=DeckPurpose.PREREQUISITE,
        )
        for title, body, concept in [
            ("What is a linear equation in two variables?",
             "Any equation of the form ax+by+c=0 where a, b are not both zero and both have degree 1.\n"
             "Examples: 2x+3y=7, x\u2212y=0.\nNon-examples: x\u00b2+y=5 (degree 2), xy=4 (degree 2).",
             "Definition"),
            ("How many solutions does one linear equation have?",
             "Infinitely many. For each value of x you can find a corresponding y.\n"
             "The graph is a straight line, and every point on the line is a solution.",
             "Solutions of a Single Equation"),
            ("How do you find the x-intercept of ax+by+c=0?",
             "Set y=0 and solve for x.\nExample: 3x+2y=6 \u2192 y=0 \u2192 3x=6 \u2192 x=2. x-intercept is (2,0).",
             "x-intercept"),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.CONCEPT,
                subject="Mathematics", chapter="Linear Equations in Two Variables", concept=concept,
            )
            DeckCard.objects.create(deck=prereq_deck, card=card,
                                    order=DeckCard.objects.filter(deck=prereq_deck).count() + 1)

        methods_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Consistency Conditions & Solution Methods",
            purpose=DeckPurpose.POST_NODE,
        )
        for title, body, concept in [
            ("Consistency ratio conditions",
             "For a\u2081x+b\u2081y+c\u2081=0 and a\u2082x+b\u2082y+c\u2082=0:\n"
             "\u2022 a\u2081/a\u2082 \u2260 b\u2081/b\u2082 \u2192 Intersecting (unique solution)\n"
             "\u2022 a\u2081/a\u2082 = b\u2081/b\u2082 \u2260 c\u2081/c\u2082 \u2192 Parallel (no solution)\n"
             "\u2022 a\u2081/a\u2082 = b\u2081/b\u2082 = c\u2081/c\u2082 \u2192 Coincident (infinite solutions)",
             "Consistency Conditions"),
            ("Substitution method \u2014 key steps",
             "1. Express y (or x) from the simpler equation.\n"
             "2. Substitute into the other equation.\n"
             "3. Solve for the remaining variable.\n"
             "4. Back-substitute. 5. Verify in both equations.\n"
             "Best when: one coefficient = 1.",
             "Substitution Method"),
            ("Elimination method \u2014 key steps",
             "1. Multiply to equalise one variable\u2019s coefficients.\n"
             "2. Add or subtract to eliminate it.\n"
             "3. Solve. 4. Back-substitute. 5. Verify.\n"
             "Clues: 0=0 \u2192 coincident; 0=k (k\u22600) \u2192 parallel.",
             "Elimination Method"),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.FORMULA,
                subject="Mathematics", chapter="Linear Equations in Two Variables", concept=concept,
            )
            DeckCard.objects.create(deck=methods_deck, card=card,
                                    order=DeckCard.objects.filter(deck=methods_deck).count() + 1)

        RevisionNode.objects.create(
            path=path,
            title="Linear Equations Revision",
            appears_after_node=n9,
            side='right',
            xp_reward=20,
            is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "\nChapter 3 seeded successfully!\n"
            "  \u2022 7 lesson nodes (orders 1,2,3,5,6,7,9)\n"
            "  \u2022 2 lab nodes: LINE_INTERSECTION_LAB (order=4, unlock after 3), "
            "EQUATION_SOLVER_LAB (order=8, unlock after 6)\n"
            "  \u2022 1 chapter test (order=10, 12 questions)\n"
            "  \u2022 10+10+12+10+10+12+10+12 = 96 questions total\n"
            "  \u2022 2 flashcard decks + 1 revision node\n"
            "  \u2022 Cumulative design: each node builds on prior concepts\n"
            "  \u2022 Aligned with NCERT Class 10 Chapter 3 (Pair of Linear Equations in Two Variables)"
        ))
