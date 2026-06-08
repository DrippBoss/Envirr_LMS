from django.core.management.base import BaseCommand
from courses.models import Subject, Course
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 1 — Coordinate Geometry (NCERT Ganita Manjari, Class 9, 2026-27)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 1 — Coordinate Geometry (Class 9, 2026-27)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )

        subj, _ = Subject.objects.get_or_create(name='Mathematics', defaults={'created_by': admin_user})
        Course.objects.get_or_create(
            name='Coordinate Geometry', subject=subj,
            defaults={'status': 'published', 'created_by': admin_user}
        )

        unit, _ = CourseUnit.objects.get_or_create(
            title='Coordinate Geometry', subject='Mathematics',
            class_grade='9', board='CBSE', order=1, icon='grid_on',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Coordinate Geometry', class_grade='9'
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
        # NODE 1 — History & Why Coordinates?
        # ═══════════════════════════════════════════════════════════════════════
        n1 = lesson(1, "History & Why Coordinates?", 10,
            description=(
                "Coordinate geometry has roots stretching back thousands of years — "
                "from the grid-planned streets of the Sindhu-Sarasvatī Civilisation to "
                "Baudhāyana's geometric constructions, Āryabhaṭa's celestial maps, and "
                "Brahmagupta's formalisation of zero and negative numbers. Descartes "
                "(1637 CE) unified algebra and geometry by showing that any point in a "
                "plane is fully described by just two numbers."
            ),
            objectives=[
                "Describe what a coordinate system is and why it is useful",
                "Name at least two ancient Indian contributions to coordinate geometry",
                "Explain the role of Brahmagupta's work on zero in enabling negative axes",
                "State Descartes's key insight: any point in 2-D space needs exactly two numbers",
            ])

        q(n1, QuestionType.MCQ,
          "Which ancient Indian civilisation first used a large-scale grid system for city streets?",
          {"A": "Gupta Empire", "B": "Maurya Empire",
           "C": "Sindhu-Sarasvatī Civilisation", "D": "Chola Dynasty"},
          "Sindhu-Sarasvatī Civilisation",
          hint="Think of the city streets oriented North–South and East–West at uniform distances.",
          explanation=(
              "The Sindhu-Sarasvatī Civilisation built streets in a precise grid — effectively a "
              "coordinate system — thousands of years ago, as described in Ganita Manjari Section 1.1."
          ),
          concept="History of Coordinate Geometry")

        q(n1, QuestionType.MCQ,
          "Brahmagupta's formalisation of zero and negative numbers is essential for coordinate geometry because:",
          {"A": "It allows us to measure in metres",
           "B": "The origin is zero and negative axes represent values less than zero",
           "C": "It gave us the decimal system",
           "D": "It defined the concept of a parabola"},
          "The origin is zero and negative axes represent values less than zero",
          hint="Without negative numbers, the axes can only extend in one direction.",
          explanation=(
              "Brahmagupta (c. 628 CE) formalised zero and negative numbers. "
              "Without this, the four-quadrant Cartesian plane would be impossible — "
              "the 'origin' is zero and the negative axes represent values less than zero."
          ),
          concept="History of Coordinate Geometry")

        q(n1, QuestionType.MCQ,
          "René Descartes (1637 CE) made coordinate geometry what it is today. His key insight was:",
          {"A": "Any point in 3-D space needs two numbers",
           "B": "Any point in a 2-D plane can be defined by exactly two numbers",
           "C": "Negative numbers can be used in algebra",
           "D": "The Earth's surface can be described using longitude alone"},
          "Any point in a 2-D plane can be defined by exactly two numbers",
          hint="Two numbers — the distances from two perpendicular axes.",
          explanation=(
              "Descartes showed that any point in a two-dimensional plane is fully described by "
              "two numbers representing its perpendicular distances from two reference axes. "
              "This unified geometry and algebra."
          ),
          concept="History of Coordinate Geometry")

        q(n1, QuestionType.FILL_BLANK,
          "A coordinate system assigns ___ numbers to every point in a 2-D plane.",
          {"tip": "Think: x-coordinate and y-coordinate."},
          "two",
          hint="One number for the horizontal position and one for the vertical.",
          explanation="Every point in a 2-D plane is uniquely described by an ordered pair (x, y) — two numbers.",
          concept="What is a Coordinate System?")

        q(n1, QuestionType.MULTI_SELECT,
          "Select ALL contributions that helped develop coordinate geometry:",
          {"choices": [
              {"id": 1, "text": "Sindhu-Sarasvatī grid-planned streets (practical coordinate system)"},
              {"id": 2, "text": "Brahmagupta's formalisation of zero and negative numbers"},
              {"id": 3, "text": "Āryabhaṭa replacing chords with sines for celestial mapping"},
              {"id": 4, "text": "Newton's law of universal gravitation"},
              {"id": 5, "text": "Descartes unifying geometry and algebra via coordinates"},
          ]},
          "1,2,3,5",
          hint="Newton's gravity law is physics, not directly related to coordinate geometry's development.",
          explanation=(
              "1 ✓ (grid streets), 2 ✓ (zero & negatives enable the Cartesian plane), "
              "3 ✓ (Āryabhaṭa's celestial coordinates), 4 ✗ (Newton's gravity is unrelated), "
              "5 ✓ (Descartes's unification)."
          ),
          concept="History of Coordinate Geometry")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 2 — The Cartesian Plane: Axes, Origin & Quadrants
        # ═══════════════════════════════════════════════════════════════════════
        n2 = lesson(2, "The Cartesian Plane — Axes, Origin & Quadrants", 15,
            description=(
                "The 2-D Cartesian coordinate system uses two perpendicular lines: the horizontal "
                "x-axis and vertical y-axis, crossing at the origin O = (0, 0). Distances to the "
                "right of O or above O are positive; left or below are negative. The axes divide "
                "the plane into four quadrants with distinct sign patterns for (x, y)."
            ),
            objectives=[
                "Name the two coordinate axes and the origin, and state its coordinates",
                "Describe the sign convention for each of the four quadrants",
                "State the form of coordinates for points on each axis: (x, 0) and (0, y)",
                "Explain why (x, y) ≠ (y, x) when x ≠ y",
            ])

        q(n2, QuestionType.MCQ,
          "The point of intersection of the x-axis and y-axis is called the:",
          {"A": "Vertex", "B": "Origin", "C": "Midpoint", "D": "Centre"},
          "Origin",
          hint="It is the reference point with coordinates (0, 0).",
          explanation="The origin O is where both axes cross. Its coordinates are (0, 0) — zero distance from both axes.",
          concept="Origin and Axes")

        q(n2, QuestionType.MCQ,
          "A point P lies on the y-axis, 4 units above the origin. Its coordinates are:",
          {"A": "(4, 0)", "B": "(0, 4)", "C": "(0, −4)", "D": "(4, 4)"},
          "(0, 4)",
          hint="Points on the y-axis have x-coordinate = 0. Above origin means y > 0.",
          explanation=(
              "On the y-axis, x = 0. Four units above O means y = +4. So the point is (0, 4). "
              "General form of a y-axis point: (0, y)."
          ),
          concept="Points on Axes")

        q(n2, QuestionType.MCQ,
          "Point Q has coordinates (−5, 3). In which quadrant does Q lie?",
          {"A": "Quadrant I", "B": "Quadrant II", "C": "Quadrant III", "D": "Quadrant IV"},
          "Quadrant II",
          hint="Quadrant II has negative x and positive y.",
          explanation=(
              "x = −5 (negative), y = 3 (positive) → Quadrant II. "
              "Sign patterns: Q-I (+,+), Q-II (−,+), Q-III (−,−), Q-IV (+,−)."
          ),
          concept="Quadrants")

        q(n2, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about the Cartesian plane:",
          {"choices": [
              {"id": 1, "text": "Points on the x-axis have the form (x, 0)"},
              {"id": 2, "text": "Points on the y-axis have the form (0, y)"},
              {"id": 3, "text": "All four quadrants are separated by the coordinate axes"},
              {"id": 4, "text": "Points in Quadrant III have positive x and negative y"},
              {"id": 5, "text": "The origin O has coordinates (0, 0)"},
          ]},
          "1,2,3,5",
          hint="Quadrant III has BOTH x and y negative.",
          explanation=(
              "1 ✓ (x-axis form) | 2 ✓ (y-axis form) | 3 ✓ (axes divide the plane) | "
              "4 ✗ (Q-III is (−, −)) | 5 ✓ (origin definition)."
          ),
          concept="Cartesian Plane — Key Facts")

        q(n2, QuestionType.MCQ,
          "Point S has coordinates (3, −5). Point T has coordinates (−5, 3). Which is correct?",
          {"A": "S and T are the same point",
           "B": "S is in Quadrant IV and T is in Quadrant II",
           "C": "S is in Quadrant II and T is in Quadrant IV",
           "D": "Both S and T are in Quadrant I"},
          "S is in Quadrant IV and T is in Quadrant II",
          hint="x positive, y negative → Q-IV. x negative, y positive → Q-II.",
          explanation=(
              "S(3, −5): x > 0, y < 0 → Quadrant IV. T(−5, 3): x < 0, y > 0 → Quadrant II. "
              "Also note: (3, −5) ≠ (−5, 3), illustrating that order in a coordinate pair matters."
          ),
          concept="Quadrants and Order of Coordinates")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 3 — Plotting, Reading & Real-World Grids
        # ═══════════════════════════════════════════════════════════════════════
        n3 = lesson(3, "Plotting, Reading & Real-World Grids", 15,
            description=(
                "Plot points on the Cartesian plane by moving x units horizontally then y units "
                "vertically from the origin. Read coordinates of given points. Apply coordinates "
                "to real-world problems like floor plans (as Shalini did to help Reiaan navigate "
                "his new room using a pin-and-thread grid)."
            ),
            objectives=[
                "Plot any given (x, y) point on a Cartesian grid step by step",
                "Read the coordinates of points marked on a grid",
                "Represent a floor plan on a grid and identify object positions using coordinates",
                "Use coordinates to find the width of a segment parallel to an axis",
            ])

        q(n3, QuestionType.MCQ,
          "Reiaan's room has corners at O(0,0), A(12,0), B(12,10), and C(0,10). "
          "What is the length of the room (along the x-axis)?",
          {"A": "10 ft", "B": "12 ft", "C": "22 ft", "D": "120 ft"},
          "12 ft",
          hint="The length along the x-axis is the x-coordinate of A (or B).",
          explanation=(
              "O is at (0,0) and A is at (12,0). The length OA = 12 − 0 = 12 ft. "
              "For segments parallel to an axis, the distance is simply the difference in the varying coordinate."
          ),
          concept="Reading Coordinates — Floor Plan")

        q(n3, QuestionType.MCQ,
          "D₁ is the point (8, 0) and R₁ is the point (11.5, 0) — these mark the ends of Reiaan's room door. "
          "How wide is the door?",
          {"A": "3 ft", "B": "3.5 ft", "C": "8 ft", "D": "11.5 ft"},
          "3.5 ft",
          hint="Both points lie on the x-axis. Width = difference in x-coordinates.",
          explanation="Width = x(R₁) − x(D₁) = 11.5 − 8 = 3.5 ft.",
          concept="Distance Along an Axis")

        q(n3, QuestionType.FILL_BLANK,
          "To plot the point (−3, 4), you move 3 units to the ___ of the origin, then 4 units upward.",
          {"tip": "Negative x means moving in the opposite direction to positive x."},
          "left",
          hint="Positive x → right. Negative x → left.",
          explanation=(
              "x = −3 means 3 units to the left of the origin. y = 4 means 4 units upward. "
              "The point lands in Quadrant II."
          ),
          concept="Plotting Points")

        q(n3, QuestionType.MCQ,
          "B₁(0, 1.5) and B₂(0, 4) mark the ends of a bathroom door on the y-axis. "
          "How wide is the bathroom door?",
          {"A": "1.5 ft", "B": "2.5 ft", "C": "4 ft", "D": "5.5 ft"},
          "2.5 ft",
          hint="Both points are on the y-axis. Width = difference in y-coordinates.",
          explanation="Width = y(B₂) − y(B₁) = 4 − 1.5 = 2.5 ft.",
          concept="Distance Along an Axis")

        q(n3, QuestionType.REARRANGE,
          "Place these steps in the correct order to plot point (5, −3):",
          {"chips": ["Start at origin O(0,0)",
                     "Move 5 units to the RIGHT (x = 5)",
                     "Move 3 units DOWNWARD (y = −3)",
                     "Mark the point"]},
          "Start at origin O(0,0) → Move 5 units to the RIGHT (x = 5) → Move 3 units DOWNWARD (y = −3) → Mark the point",
          hint="Always start at origin, move horizontally first, then vertically.",
          explanation=(
              "Standard plotting procedure: (1) Start at O. (2) Move x units right/left. "
              "(3) Move y units up/down. (4) Mark. Point (5, −3) lies in Quadrant IV."
          ),
          concept="Plotting Points — Step by Step")

        # ── LAB 1 (order=4) ────────────────────────────────────────────────────
        lab(4, "Coordinate Grid Explorer Lab", 25,
            lab_type="COORDINATE_GRID",
            lab_category=LabCategory.INTERACTIVE,
            required=3)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 5 — Distance Between Two Points: The Formula
        # ═══════════════════════════════════════════════════════════════════════
        n5 = lesson(5, "Distance Between Two Points", 20,
            description=(
                "To find the distance between any two points A(x₁, y₁) and D(x₂, y₂), "
                "draw a right-angled triangle with AD as the hypotenuse. The horizontal leg "
                "has length |x₂ − x₁| and the vertical leg |y₂ − y₁|. By the "
                "Baudhāyana–Pythagoras theorem:\n"
                "AD = √[(x₂ − x₁)² + (y₂ − y₁)²].\n"
                "This works for any two points regardless of which quadrant they lie in."
            ),
            objectives=[
                "State the distance formula: √[(x₂−x₁)² + (y₂−y₁)²]",
                "Identify the horizontal and vertical legs of the right triangle used in the derivation",
                "Compute the distance between two given points with integer coordinates",
                "Explain why squaring eliminates the sign of (x₂−x₁) and (y₂−y₁)",
            ])

        q(n5, QuestionType.MCQ,
          "The distance between A(3, 4) and D(7, 1) is:",
          {"A": "3 units", "B": "4 units", "C": "5 units", "D": "7 units"},
          "5 units",
          hint="CD = 7−3 = 4, AC = 4−1 = 3. Use the Pythagoras theorem: √(4²+3²).",
          explanation=(
              "Horizontal leg: x₂−x₁ = 7−3 = 4. Vertical leg: y₁−y₂ = 4−1 = 3. "
              "AD = √(4²+3²) = √(16+9) = √25 = 5 units. (This is a 3-4-5 Pythagorean triple!)"
          ),
          concept="Distance Formula")

        q(n5, QuestionType.FILL_BLANK,
          "The distance between M(9, 6) and D(7, 1) is √___ units.",
          {"tip": "Horizontal shift: 9−7 = 2. Vertical shift: 6−1 = 5."},
          "29",
          hint="DM = √(2²+5²) = √(4+25) = √29.",
          explanation=(
              "x-shift: 9−7 = 2. y-shift: 6−1 = 5. Distance = √(4+25) = √29 units. "
              "As computed in Ganita Manjari Fig. 1.7."
          ),
          concept="Distance Formula")

        q(n5, QuestionType.MCQ,
          "The distance between the origin O(0, 0) and point P(6, 8) is:",
          {"A": "10 units", "B": "14 units", "C": "√28 units", "D": "48 units"},
          "10 units",
          hint="OP = √(6²+8²) = √(36+64) = √100 = 10.",
          explanation=(
              "OP = √[(6−0)²+(8−0)²] = √[36+64] = √100 = 10 units. "
              "(6, 8, 10) is a 3-4-5 triple scaled by 2."
          ),
          concept="Distance from Origin")

        q(n5, QuestionType.MCQ,
          "To find the distance between A'(−3, 4) and D'(−7, 1), the horizontal leg has length:",
          {"A": "3", "B": "4", "C": "7", "D": "10"},
          "4",
          hint="Horizontal leg = |x₂ − x₁| = |−7 − (−3)| = |−4| = 4.",
          explanation=(
              "x-shift = x(D') − x(A') = −7 − (−3) = −4. We square it, so the sign doesn't matter. "
              "Horizontal leg = 4. (This is the reflection of the A-D triangle in the y-axis — "
              "the distance is preserved.)"
          ),
          concept="Distance Formula with Negative Coordinates")

        q(n5, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about the distance formula:",
          {"choices": [
              {"id": 1, "text": "Distance = √[(x₂−x₁)² + (y₂−y₁)²]"},
              {"id": 2, "text": "It doesn't matter whether (x₂−x₁) is positive or negative, because we square it"},
              {"id": 3, "text": "For points on the same horizontal line (y₁=y₂), distance = |x₂−x₁|"},
              {"id": 4, "text": "Distance between two different points can be zero"},
              {"id": 5, "text": "The formula is derived using the Baudhāyana–Pythagoras theorem"},
          ]},
          "1,2,3,5",
          hint="Distance between two distinct points is always positive (never zero).",
          explanation=(
              "1 ✓ (formula) | 2 ✓ (squaring eliminates sign) | 3 ✓ (y-shift = 0, simplifies) | "
              "4 ✗ (distinct points always have positive distance) | 5 ✓ (derivation uses Pythagoras)."
          ),
          concept="Distance Formula — Properties")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 6 — Collinearity & Right-Angled Triangles via Distance
        # ═══════════════════════════════════════════════════════════════════════
        n6 = lesson(6, "Collinearity & Right-Angled Triangles", 20,
            description=(
                "Use the distance formula to check if three points lie on the same straight line "
                "(collinearity) and to verify if a triangle is right-angled. Three points A, B, C "
                "are collinear if AB + BC = AC (the two shorter distances add up to the longest). "
                "A triangle is right-angled if its sides satisfy a² + b² = c² (Pythagorean condition)."
            ),
            objectives=[
                "Test collinearity: compute all three pairwise distances and check if the sum of two equals the third",
                "Classify a triangle as right-angled using the converse of the Baudhāyana–Pythagoras theorem",
                "Determine if a given set of three points forms a triangle or are collinear",
                "Distinguish between collinear and non-collinear point sets using coordinates",
            ])

        q(n6, QuestionType.MCQ,
          "To check if M(−3, −4), A(0, 0), G(6, 8) are collinear, you compute MA = 5, AG = √(36+64) = 10, "
          "MG = √(81+144) = 15. These points are:",
          {"A": "Non-collinear — they form a triangle",
           "B": "Collinear — MA + AG = MG",
           "C": "Collinear — they share the same x-coordinate",
           "D": "Non-collinear — MA + MG = AG"},
          "Collinear — MA + AG = MG",
          hint="If the sum of the two smaller distances equals the largest, the points are collinear.",
          explanation=(
              "MA = 5, AG = 10, MG = 15. Since MA + AG = 5 + 10 = 15 = MG, point A lies between M and G. "
              "Hence M, A, G are collinear."
          ),
          concept="Collinearity via Distance")

        q(n6, QuestionType.MCQ,
          "Three points R(−5, −1), B(−2, −5), C(4, −12) have distances "
          "RB = 5, BC = √85, RC = √130. Are they collinear?",
          {"A": "Yes, because RB + BC = RC",
           "B": "No, because RB + BC ≠ RC",
           "C": "Yes, because all three have negative y-coordinates",
           "D": "Cannot be determined without plotting"},
          "No, because RB + BC ≠ RC",
          hint="Check: does 5 + √85 = √130? Approximate: 5 + 9.22 ≈ 14.22, but √130 ≈ 11.4.",
          explanation=(
              "5 + √85 ≈ 5 + 9.22 = 14.22 ≠ √130 ≈ 11.40. "
              "None of the three pairwise sums equals the third distance, so these three points form a triangle, "
              "not a straight line."
          ),
          concept="Collinearity via Distance")

        q(n6, QuestionType.MCQ,
          "A triangle has side lengths a = 3, b = 4, c = 5 (computed using the distance formula). "
          "What type of triangle is it?",
          {"A": "Equilateral", "B": "Isosceles", "C": "Scalene obtuse", "D": "Right-angled"},
          "Right-angled",
          hint="Check: a² + b² = 9 + 16 = 25 = c². Satisfies the Pythagorean condition.",
          explanation=(
              "3² + 4² = 9 + 16 = 25 = 5². By the converse of the Baudhāyana–Pythagoras theorem, "
              "the triangle is right-angled (with hypotenuse c = 5)."
          ),
          concept="Right-Angled Triangle via Distance")

        q(n6, QuestionType.FILL_BLANK,
          "Points A(0,0), B(3,0), C(0,4) form a triangle. BC = 5. Since AB² + AC² = 9 + 16 = 25 = BC², "
          "the right angle is at vertex ___.",
          {"tip": "In a right-angled triangle, the right angle is at the vertex opposite the hypotenuse."},
          "A",
          hint="BC is the hypotenuse (longest side). The right angle is at A — the vertex NOT on the hypotenuse.",
          explanation=(
              "AB = 3, AC = 4, BC = 5. Since AB² + AC² = BC², the right angle is between AB and AC, "
              "i.e., at vertex A(0,0)."
          ),
          concept="Right Angle Identification")

        q(n6, QuestionType.MULTI_SELECT,
          "Select ALL correct methods to determine collinearity of three points A, B, C:",
          {"choices": [
              {"id": 1, "text": "Compute AB, BC, AC and check if the largest equals the sum of the other two"},
              {"id": 2, "text": "Check if the area of triangle ABC equals zero"},
              {"id": 3, "text": "Check if all three points have the same y-coordinate"},
              {"id": 4, "text": "Check if the slope from A to B equals the slope from B to C"},
              {"id": 5, "text": "Check if all three points are in the same quadrant"},
          ]},
          "1,2,4",
          hint="Same quadrant or same y-coordinate does not guarantee collinearity.",
          explanation=(
              "1 ✓ (distance method) | 2 ✓ (zero area ↔ collinear) | "
              "3 ✗ (same y means horizontal line, but general collinearity needs more) | "
              "4 ✓ (equal slopes ↔ collinear, provided they share a point) | "
              "5 ✗ (same quadrant does not imply collinearity)."
          ),
          concept="Methods for Collinearity")

        # ── LAB 2 (order=7) ────────────────────────────────────────────────────
        lab(7, "Distance & Collinearity Lab", 25,
            lab_type="DISTANCE_EXPLORER",
            lab_category=LabCategory.INTERACTIVE,
            required=4)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 8 — Midpoint of a Line Segment
        # ═══════════════════════════════════════════════════════════════════════
        n8 = lesson(8, "Midpoint of a Line Segment", 20,
            description=(
                "The midpoint M of the segment joining S(x₁, y₁) and T(x₂, y₂) is:\n"
                "M = ((x₁+x₂)/2, (y₁+y₂)/2)\n"
                "Each coordinate of the midpoint is the average of the corresponding coordinates "
                "of the endpoints. This formula extends naturally to find points of trisection "
                "and other division points."
            ),
            objectives=[
                "State the midpoint formula: M = ((x₁+x₂)/2, (y₁+y₂)/2)",
                "Compute the midpoint given integer or simple fractional coordinates",
                "Verify midpoint by checking it lies on the segment and is equidistant from both ends",
                "Use the midpoint formula in reverse to find an unknown endpoint given the midpoint",
            ])

        q(n8, QuestionType.MCQ,
          "The midpoint of the segment joining S(−3, 0) and T(3, 0) is:",
          {"A": "(3, 0)", "B": "(−3, 0)", "C": "(0, 0)", "D": "(0, 3)"},
          "(0, 0)",
          hint="Midpoint x = (−3+3)/2 = 0. Midpoint y = (0+0)/2 = 0.",
          explanation=(
              "M = ((−3+3)/2, (0+0)/2) = (0/2, 0/2) = (0, 0). "
              "The midpoint is the origin — which makes sense by symmetry since the two points "
              "are reflections of each other in the y-axis."
          ),
          concept="Midpoint Formula")

        q(n8, QuestionType.FILL_BLANK,
          "The midpoint of A(4, 7) and B(16, −2) has x-coordinate ___.",
          {"tip": "x-midpoint = (4 + 16)/2"},
          "10",
          hint="(4+16)/2 = 20/2 = 10.",
          explanation=(
              "x-midpoint = (4+16)/2 = 10. y-midpoint = (7+(−2))/2 = 5/2 = 2.5. "
              "So M = (10, 2.5). This is also the point P (closer to A) found using midpoint reasoning in "
              "Ganita Manjari Exercise *11."
          ),
          concept="Midpoint Formula")

        q(n8, QuestionType.MCQ,
          "M(−7, 1) is the midpoint of A(3, −4) and B(x, y). Find x.",
          {"A": "−17", "B": "17", "C": "−5", "D": "10"},
          "−17",
          hint="(3 + x)/2 = −7 → 3 + x = −14 → x = −17.",
          explanation=(
              "Midpoint formula: (3+x)/2 = −7 → 3+x = −14 → x = −17. "
              "Similarly: (−4+y)/2 = 1 → y = 6. So B = (−17, 6)."
          ),
          concept="Finding Endpoint from Midpoint")

        q(n8, QuestionType.MCQ,
          "Is M(3, 4) the midpoint of S(2, 3) and T(4, 5)?",
          {"A": "Yes, because (2+4)/2 = 3 and (3+5)/2 = 4",
           "B": "No, because M is not equidistant from S and T",
           "C": "Yes, because M lies in Quadrant I",
           "D": "No, because the x-coordinates of S and T are not equal"},
          "Yes, because (2+4)/2 = 3 and (3+5)/2 = 4",
          hint="Check both coordinates: average of x-values and average of y-values.",
          explanation=(
              "x-midpoint = (2+4)/2 = 3 ✓. y-midpoint = (3+5)/2 = 4 ✓. "
              "So M(3, 4) is indeed the midpoint of ST."
          ),
          concept="Verifying a Midpoint")

        q(n8, QuestionType.MULTI_SELECT,
          "Select ALL pairs (S, T) for which M(0, 5) is the midpoint:",
          {"choices": [
              {"id": 1, "text": "S(0, 0) and T(0, 10)"},
              {"id": 2, "text": "S(−2, 3) and T(2, 7)"},
              {"id": 3, "text": "S(4, 2) and T(−4, 8)"},
              {"id": 4, "text": "S(1, 4) and T(−1, 6)"},
              {"id": 5, "text": "S(0, 5) and T(0, 5)"},
          ]},
          "1,2,3,4",
          hint="For each pair, check (x₁+x₂)/2 = 0 and (y₁+y₂)/2 = 5.",
          explanation=(
              "1: (0+0)/2=0 ✓, (0+10)/2=5 ✓ | "
              "2: (−2+2)/2=0 ✓, (3+7)/2=5 ✓ | "
              "3: (4+(−4))/2=0 ✓, (2+8)/2=5 ✓ | "
              "4: (1+(−1))/2=0 ✓, (4+6)/2=5 ✓ | "
              "5: S=T, so it's a degenerate case (not a true segment) — excluded."
          ),
          concept="Midpoint Formula — Multiple Cases")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 9 — Applications: Circles, City Grids & Geometric Properties
        # ═══════════════════════════════════════════════════════════════════════
        n9 = lesson(9, "Applications — Circles, City Grids & Geometry", 25,
            description=(
                "Apply coordinate geometry to real-world problems: find the radius of a circle "
                "given its centre and a point on it (distance = radius); check if a quadrilateral "
                "is a square using side and diagonal distances; model a city street grid using "
                "coordinates; and use the midpoint formula to locate trisection points on a segment."
            ),
            objectives=[
                "Find the radius of a circle as the distance from its centre to any point on it",
                "Check whether a given point is inside, on, or outside a circle",
                "Use coordinates to verify geometric properties of quadrilaterals (square, rectangle)",
                "Model a real-world city grid problem using a coordinate system",
            ])

        q(n9, QuestionType.MCQ,
          "Points A(1, −8), B(−4, 7) and C(−7, −4) all lie on a circle centred at O(0,0). "
          "OA = √(1+64) = √65. OB = √(16+49) = √65. OC = √(49+16) = √65. "
          "What is the radius of the circle?",
          {"A": "√65", "B": "65", "C": "8", "D": "√45"},
          "√65",
          hint="Radius = distance from centre O to any point on the circle.",
          explanation=(
              "OA = OB = OC = √65. Since all three points are equidistant from O, "
              "they lie on a circle of radius √65 centred at the origin."
          ),
          concept="Circle Radius via Distance Formula")

        q(n9, QuestionType.MCQ,
          "A circle K has centre O(0,0) and radius √65. Point D is at (−5, 6). "
          "OD = √(25+36) = √61. Is D inside, on, or outside circle K?",
          {"A": "On the circle (OD = radius)",
           "B": "Inside the circle (OD < radius)",
           "C": "Outside the circle (OD > radius)",
           "D": "Cannot determine without a graph"},
          "Inside the circle (OD < radius)",
          hint="Compare OD with the radius: √61 vs √65.",
          explanation=(
              "OD = √61 < √65 = radius. Since D is closer to the centre than the radius, "
              "D lies INSIDE circle K."
          ),
          concept="Inside, On, or Outside a Circle")

        q(n9, QuestionType.MCQ,
          "A(2,1), B(−1,2), C(−2,−1), D(1,−2) are the vertices of a quadrilateral. "
          "AB = BC = CD = DA = √10 and diagonal AC = BD = √20. ABCD is:",
          {"A": "A rectangle (not a square)", "B": "A rhombus (not a square)",
           "C": "A square", "D": "A general quadrilateral"},
          "A square",
          hint="All sides equal AND both diagonals equal → square.",
          explanation=(
              "All four sides = √10 (equal sides → rhombus). Diagonals AC = BD = √20 = √2 × √10 "
              "(equal diagonals → rectangle). A rhombus with equal diagonals is a square. "
              "Area = (1/2) × d₁ × d₂ = (1/2) × √20 × √20 = 10 sq units."
          ),
          concept="Quadrilateral Verification via Coordinates")

        q(n9, QuestionType.MCQ,
          "A city has 10 N–S streets and 10 E–W streets, all 200 m apart, crossing at the city centre. "
          "Using the centre as origin, the intersection of the 2nd N–S street and 5th E–W street "
          "is labelled (2, 5). How many street intersections can be labelled (4, 3)?",
          {"A": "One", "B": "Two", "C": "Four", "D": "Zero"},
          "One",
          hint="Each ordered pair (a, b) labels exactly one intersection: the ath N–S with the bth E–W street.",
          explanation=(
              "Street label (4, 3) identifies a unique intersection: the 4th N–S street meets the 3rd E–W street. "
              "Ordered pairs identify unique positions, just like coordinates — order matters, so (4,3) ≠ (3,4)."
          ),
          concept="Coordinates in Real-World Grid Problems")

        q(n9, QuestionType.FILL_BLANK,
          "The study table in Reiaan's room has three feet at (8,9), (11,9), and (11,7). "
          "The fourth foot is at (8, ___).",
          {"tip": "The table is a rectangle. The missing corner shares its x-coordinate with (8,9) and its y-coordinate with (11,7)."},
          "7",
          hint="The rectangle's fourth corner has x = 8 (same column as (8,9)) and y = 7 (same row as (11,7)).",
          explanation=(
              "Rectangle corners: (8,9), (11,9), (11,7), (8,7). The fourth foot is at (8,7). "
              "Width (along x): 11−8 = 3 ft. Length (along y): 9−7 = 2 ft."
          ),
          concept="Floor Plan and Coordinates")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 10 — Chapter Test
        # ═══════════════════════════════════════════════════════════════════════
        nt = test(10, "Coordinate Geometry — Chapter 1 Final Assessment", 50)

        q(nt, QuestionType.MCQ,
          "The coordinates of the origin are:",
          {"A": "(1, 1)", "B": "(1, 0)", "C": "(0, 1)", "D": "(0, 0)"},
          "(0, 0)",
          hint="The origin is where the two axes cross.",
          explanation="The origin O is defined as the point where the x-axis and y-axis intersect. Its coordinates are (0, 0).",
          concept="Origin")

        q(nt, QuestionType.MCQ,
          "Point P(−4, −6) lies in:",
          {"A": "Quadrant I", "B": "Quadrant II", "C": "Quadrant III", "D": "Quadrant IV"},
          "Quadrant III",
          hint="Both x and y are negative → Quadrant III.",
          explanation="Quadrant III is the region where x < 0 and y < 0. P(−4, −6) has both coordinates negative, so it lies in Q-III.",
          concept="Quadrants")

        q(nt, QuestionType.MCQ,
          "The distance between points (0,0) and (5, 12) is:",
          {"A": "13 units", "B": "17 units", "C": "√119 units", "D": "7 units"},
          "13 units",
          hint="√(5²+12²) = √(25+144) = √169 = 13.",
          explanation="Distance = √(5²+12²) = √(25+144) = √169 = 13 units. (5, 12, 13) is a Pythagorean triple.",
          concept="Distance Formula")

        q(nt, QuestionType.FILL_BLANK,
          "The midpoint of the segment joining (0, 0) and (0, −10) is (0, ___).",
          {"tip": "y-midpoint = (0 + (−10))/2"},
          "−5",
          hint="(0 + (−10))/2 = −10/2 = −5. x-midpoint = (0+0)/2 = 0.",
          explanation="Midpoint = ((0+0)/2, (0+(−10))/2) = (0, −5). This lies on the y-axis, as expected.",
          concept="Midpoint Formula")

        q(nt, QuestionType.MCQ,
          "Points A(2, 3), B(3, 4), C(4, 5). AB = BC = √2, AC = 2√2. These points are:",
          {"A": "Collinear — AB + BC = AC",
           "B": "Non-collinear — they form an equilateral triangle",
           "C": "Non-collinear — they form a right-angled triangle",
           "D": "Collinear — they all lie in Quadrant I"},
          "Collinear — AB + BC = AC",
          hint="√2 + √2 = 2√2 = AC. The sum of the two smaller distances equals the largest.",
          explanation=(
              "AB = √[(3−2)²+(4−3)²] = √2. BC = √2. AC = √[(4−2)²+(5−3)²] = √8 = 2√2. "
              "Since AB + BC = 2√2 = AC, the three points are collinear."
          ),
          concept="Collinearity via Distance")

        q(nt, QuestionType.MCQ,
          "M(3, 0) is the midpoint of segment ST where S is (−3, 0). Find T.",
          {"A": "(9, 0)", "B": "(6, 0)", "C": "(0, 0)", "D": "(3, 3)"},
          "(9, 0)",
          hint="(−3 + x)/2 = 3 → −3 + x = 6 → x = 9. y: (0 + y)/2 = 0 → y = 0.",
          explanation=(
              "Using the midpoint formula: (−3+x)/2 = 3 → x = 9. (0+y)/2 = 0 → y = 0. "
              "So T = (9, 0)."
          ),
          concept="Finding Endpoint from Midpoint")

        q(nt, QuestionType.MCQ,
          "A point has x-coordinate equal to −5. It lies on the line through W parallel to the y-axis. "
          "Which quadrants can this point lie in?",
          {"A": "Quadrant I and II only",
           "B": "Quadrant II and III only",
           "C": "Quadrant I and IV only",
           "D": "All four quadrants"},
          "Quadrant II and III only",
          hint="x = −5 (negative). y can be positive (Q-II) or negative (Q-III). y = 0 puts it on the x-axis.",
          explanation=(
              "x = −5 is fixed and negative. y can be any value: positive → Q-II, negative → Q-III, "
              "zero → on the x-axis (not in any quadrant). So it can lie in Q-II or Q-III."
          ),
          concept="Fixed Coordinate and Quadrant Location")

        q(nt, QuestionType.FILL_BLANK,
          "A circle is centred at O(0,0). Point E is at (0, 9). OE = ___.",
          {"tip": "OE = √(0² + 9²)"},
          "9",
          hint="OE = √(0+81) = √81 = 9.",
          explanation="OE = √[(0−0)²+(9−0)²] = √81 = 9. E lies on the y-axis, so the distance is simply |9|.",
          concept="Distance from Origin")

        q(nt, QuestionType.REARRANGE,
          "Arrange the distance formula for points (x₁,y₁) and (x₂,y₂):",
          {"chips": ["√(", "(x₂−x₁)²", "+", "(y₂−y₁)²", ")"]},
          "√( (x₂−x₁)² + (y₂−y₁)² )",
          hint="Square both coordinate differences, add them, then take the square root.",
          explanation=(
              "Derived using the Baudhāyana–Pythagoras theorem. The horizontal leg is |x₂−x₁|, "
              "vertical leg is |y₂−y₁|, and the distance is the hypotenuse."
          ),
          concept="Distance Formula")

        q(nt, QuestionType.MULTI_SELECT,
          "Select ALL correct statements:",
          {"choices": [
              {"id": 1, "text": "The coordinates of any point on the x-axis are of the form (x, 0)"},
              {"id": 2, "text": "If x ≠ y, then the point (x, y) and the point (y, x) are different"},
              {"id": 3, "text": "The midpoint formula averages the x and y coordinates separately"},
              {"id": 4, "text": "Three points forming a right-angled triangle are always collinear"},
              {"id": 5, "text": "Reflection in the y-axis preserves distances between points"},
          ]},
          "1,2,3,5",
          hint="A right-angled triangle has three non-collinear vertices — they form a triangle, not a line.",
          explanation=(
              "1 ✓ (form of x-axis points) | 2 ✓ (ordered pairs, order matters) | "
              "3 ✓ (midpoint formula definition) | 4 ✗ (triangle vertices are non-collinear by definition) | "
              "5 ✓ (reflection is an isometry — preserves all distances, as shown in Ganita Manjari Fig. 1.9)."
          ),
          concept="Chapter Summary — Multiple Concepts")

        # ═══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════════

        prereq_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Coordinate Geometry — Foundations",
            purpose=DeckPurpose.PREREQUISITE,
        )
        for title, body, card_type, concept in [
            (
                "What is the Cartesian plane?",
                "A 2-D plane with two perpendicular axes: horizontal x-axis and vertical y-axis, "
                "crossing at the origin O(0, 0). Every point is described by an ordered pair (x, y).",
                FlashcardType.CONCEPT, "Cartesian Plane"
            ),
            (
                "Four quadrants — sign patterns",
                "Quadrant I: (+, +)\nQuadrant II: (−, +)\nQuadrant III: (−, −)\nQuadrant IV: (+, −)\n"
                "Axes themselves don't belong to any quadrant.",
                FlashcardType.CONCEPT, "Quadrants"
            ),
            (
                "Points on axes",
                "x-axis: form (x, 0) — y-coordinate is zero.\n"
                "y-axis: form (0, y) — x-coordinate is zero.\n"
                "Origin: (0, 0) — on both axes.",
                FlashcardType.CONCEPT, "Points on Axes"
            ),
            (
                "Baudhāyana–Pythagoras Theorem",
                "In a right-angled triangle with legs a, b and hypotenuse c:\nc² = a² + b²\n"
                "This is the foundation of the distance formula.",
                FlashcardType.CONCEPT, "Pythagorean Theorem"
            ),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=card_type,
                subject='Mathematics', chapter='Coordinate Geometry', concept=concept,
            )
            DeckCard.objects.create(deck=prereq_deck, card=card,
                                    order=DeckCard.objects.filter(deck=prereq_deck).count() + 1)

        formula_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Coordinate Geometry — Key Formulae",
            purpose=DeckPurpose.POST_NODE,
        )
        for title, body, concept in [
            (
                "Distance Formula",
                "Distance between (x₁, y₁) and (x₂, y₂):\n"
                "d = √[(x₂−x₁)² + (y₂−y₁)²]\n\n"
                "Special cases:\n"
                "• Same row (y₁=y₂): d = |x₂−x₁|\n"
                "• Same column (x₁=x₂): d = |y₂−y₁|\n"
                "• From origin: d = √(x²+y²)",
                "Distance Formula"
            ),
            (
                "Midpoint Formula",
                "Midpoint M of segment joining S(x₁,y₁) and T(x₂,y₂):\n"
                "M = ( (x₁+x₂)/2 , (y₁+y₂)/2 )\n\n"
                "Reverse: if M and one endpoint are known, solve for the other endpoint.",
                "Midpoint Formula"
            ),
            (
                "Collinearity Test",
                "Three points A, B, C are collinear iff the largest of AB, BC, AC "
                "equals the sum of the other two.\n\n"
                "Equivalently: area of △ABC = 0.",
                "Collinearity"
            ),
            (
                "Right-Angled Triangle Check",
                "Compute the three side lengths a, b, c (c = largest).\n"
                "Triangle is right-angled iff a² + b² = c².\n"
                "The right angle is at the vertex opposite the hypotenuse c.",
                "Right-Angled Triangle"
            ),
            (
                "Circle: Radius and Position",
                "Circle centred at O with radius r:\n"
                "• Point P is ON circle iff OP = r\n"
                "• Point P is INSIDE iff OP < r\n"
                "• Point P is OUTSIDE iff OP > r",
                "Circle via Coordinates"
            ),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.FORMULA,
                subject='Mathematics', chapter='Coordinate Geometry', concept=concept,
            )
            DeckCard.objects.create(deck=formula_deck, card=card,
                                    order=DeckCard.objects.filter(deck=formula_deck).count() + 1)

        RevisionNode.objects.create(
            path=path,
            title="Coordinate Geometry Revision",
            appears_after_node=n9,
            side='right',
            xp_reward=20,
            is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "\nChapter 1 — Coordinate Geometry seeded successfully!\n"
            "  • 7 lesson nodes (orders 1, 2, 3, 5, 6, 8, 9)\n"
            "  • 2 lab nodes: COORDINATE_GRID (order=4), DISTANCE_EXPLORER (order=7)\n"
            "  • 1 chapter test (order=10, 10 questions)\n"
            "  • 35 lesson questions + 10 test questions\n"
            "  • 2 flashcard decks (4 prerequisite + 5 formula cards) + 1 revision node\n"
            "  • Aligned with NCERT Ganita Manjari Class 9, Chapter 1 (2026-27)\n"
            "  • Covers: CG-4, C-4.5, CG-9 learning outcomes"
        ))
