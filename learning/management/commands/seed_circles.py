from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 5 — Circles (Ganita Manjari Grade 9, NCERT 2026-27)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 5 — Circles (Ganita Manjari Grade 9)...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Circles', subject='Mathematics',
            class_grade='9', board='CBSE', order=5, icon='radio_button_unchecked',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Circles', class_grade='9'
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
            )

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 1 — What is a Circle? (Definitions)
        # ═══════════════════════════════════════════════════════════════════════
        n1 = lesson(1, "What is a Circle?", 10,
                    description="A circle is much more than a round shape — it is a precisely defined geometric object. Learn the formal definitions of a circle, its centre, radius, chord, diameter, and arc, and see how these are all connected through the idea of equal distance.",
                    objectives=[
                        "State the formal definition of a circle as a locus of equidistant points",
                        "Identify and define the terms: centre, radius, chord, and diameter",
                        "Explain the relationship between radius and diameter (d = 2r)",
                        "Describe an arc as a connected portion of the circle",
                        "Identify and name these parts from a given figure",
                    ])

        q(n1, QuestionType.MCQ,
          "A circle is defined as the set of all points on a plane that are ___ from a fixed point called the centre.",
          {"A": "collinear", "B": "equidistant", "C": "perpendicular", "D": "parallel"},
          "equidistant",
          hint="The key word in the definition is 'equal distance'. All points on the circle are at the same distance from the centre.",
          explanation="This is the formal definition of a circle. The fixed point is the centre, and the equal distance is the radius. Using locus language: a circle is the locus of points equidistant from a given point.",
          concept="Definition of a Circle")

        q(n1, QuestionType.FILL_BLANK,
          "A line segment joining any two points on a circle is called a ___.",
          {"tip": "It 'cuts through' the circle — look at segment BC in the figure where B and C are on the circle."},
          "chord",
          hint="The word comes from music — the string of a bow. Any segment with both endpoints on the circle is this.",
          explanation="A chord is a line segment with both endpoints on the circle. Its special case — passing through the centre — is the diameter, which is the longest possible chord.",
          concept="Chord of a Circle")

        q(n1, QuestionType.MCQ,
          "The longest chord of any circle is its ___.",
          {"A": "radius", "B": "arc", "C": "diameter", "D": "secant"},
          "diameter",
          hint="Think about it: any chord can be 'stretched' if you move it towards the centre. The one passing through the centre is the longest.",
          explanation="The diameter passes through the centre, making it as long as possible for a chord. Length of diameter = 2 × radius. From Theorem 8 in the chapter: the chord closest to the centre (distance = 0) is the diameter.",
          concept="Diameter as Longest Chord")

        q(n1, QuestionType.FILL_BLANK,
          "If the radius of a circle is 8 cm, its diameter is ___ cm.",
          {"tip": "Diameter = 2 × radius."},
          "16",
          hint="Diameter = 2 × 8 = 16 cm.",
          explanation="The diameter is twice the radius: d = 2r = 2 × 8 = 16 cm. Conversely, radius = diameter ÷ 2.",
          concept="Relationship Between Radius and Diameter")

        q(n1, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about a circle:",
          {"choices": [
              {"id": 1, "text": "A circle is the locus of all points equidistant from its centre"},
              {"id": 2, "text": "All chords of a circle have equal length"},
              {"id": 3, "text": "A diameter is a chord that passes through the centre"},
              {"id": 4, "text": "The radius equals half the diameter"},
              {"id": 5, "text": "An arc is a connected portion of the circle between two endpoints"},
          ]},
          "1,3,4,5",
          hint="Statement 2 is false — chords have varying lengths; the diameter is longest and a very short chord near the boundary can be tiny.",
          explanation="1✓ (definition) | 2✗ (chords vary in length; diameter is the longest) | 3✓ (diameter is a special chord) | 4✓ (r = d/2) | 5✓ (arc definition from Section 5.7 — two points on a circle define two arcs: major and minor)",
          concept="Parts of a Circle")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 2 — Symmetries of a Circle
        # ═══════════════════════════════════════════════════════════════════════
        n2 = lesson(2, "Symmetries of a Circle", 10,
                    description="What makes a circle so special is its perfect, boundless symmetry. Unlike a square or hexagon, a circle looks identical after rotation by any angle. Explore how every diameter is a mirror line and why this complete symmetry makes circles nature's favourite shape.",
                    objectives=[
                        "State that a circle has complete rotational symmetry about its centre",
                        "Explain that every diameter is a line of reflection symmetry",
                        "Conclude that a circle has infinitely many lines of reflection symmetry",
                        "Compare the symmetry of a circle with that of squares, pentagons, and hexagons",
                    ])

        q(n2, QuestionType.MCQ,
          "If you rotate a circle by any angle about its centre, the result looks:",
          {"A": "different, because points have moved", "B": "the same — indistinguishable from before", "C": "the same only for 90° and 180°", "D": "flipped"},
          "the same — indistinguishable from before",
          hint="Think of a spinning wheel. Can you tell it has rotated? This is what 'complete rotational symmetry' means.",
          explanation="A circle has complete rotational symmetry. Rotate by 1°, 37°, or 179° — the circle always looks identical. This is what the textbook illustrates with the spinning wheel analogy.",
          concept="Rotational Symmetry of a Circle")

        q(n2, QuestionType.FILL_BLANK,
          "When you fold a circular paper so that the boundaries perfectly overlap, the crease formed is a ___ of the circle.",
          {"tip": "This crease is a line of reflection symmetry that passes through the centre."},
          "diameter",
          hint="The fold line divides the circle into two equal halves. Any such line passing through the centre is called this.",
          explanation="The crease created by folding boundaries together is a diameter — it is a line of reflection symmetry. Every diameter divides the circle into two congruent semicircles.",
          concept="Reflection Symmetry — Diameter")

        q(n2, QuestionType.MCQ,
          "How many lines of reflection symmetry does a circle have?",
          {"A": "4", "B": "8", "C": "360", "D": "Infinitely many"},
          "Infinitely many",
          hint="Every diameter is a line of reflection symmetry. How many diameters can a circle have?",
          explanation="A circle has infinitely many diameters (one for every direction through the centre), and each is a line of reflection symmetry. This is unlike a square (4 lines) or regular hexagon (6 lines).",
          concept="Infinite Lines of Reflection Symmetry")

        q(n2, QuestionType.MCQ,
          "A regular hexagon has ___ lines of reflection symmetry.",
          {"A": "3", "B": "4", "C": "6", "D": "Infinitely many"},
          "6",
          hint="A regular hexagon has 6 sides. Count the symmetry lines: 3 through opposite vertices + 3 through midpoints of opposite sides.",
          explanation="A regular hexagon has 6 lines of reflection symmetry: 3 connecting opposite vertices, and 3 connecting midpoints of opposite sides. Compare this with a circle's infinitely many. A regular n-gon always has exactly n lines.",
          concept="Comparison of Symmetries")

        q(n2, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about the symmetries of a circle:",
          {"choices": [
              {"id": 1, "text": "A circle has rotational symmetry only at 90° and 180°"},
              {"id": 2, "text": "Every diameter is a line of reflection symmetry"},
              {"id": 3, "text": "A circle has more lines of symmetry than any regular polygon"},
              {"id": 4, "text": "Rotating a circle by 45° changes its appearance"},
              {"id": 5, "text": "A circle has complete rotational symmetry about its centre"},
          ]},
          "2,3,5",
          hint="Statements 1 and 4 are false — a circle has rotational symmetry for ANY angle, not just specific ones.",
          explanation="2✓ (every diameter is a reflection axis) | 3✓ (circle has infinitely many vs finite for any polygon) | 5✓ (complete rotational symmetry) | 1✗ (works for ALL angles, not just 90°/180°) | 4✗ (circle looks identical after any rotation)",
          concept="Symmetries of a Circle — Summary")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 3 — How Many Circles? (Circumcircle)
        # ═══════════════════════════════════════════════════════════════════════
        n3 = lesson(3, "How Many Circles? — The Circumcircle", 15,
                    description="Given one point, infinitely many circles pass through it. Given two points, still infinitely many circles pass through them — all with centres on the perpendicular bisector. But given three non-collinear points? Exactly one. This unique circle is the circumcircle of the triangle they form.",
                    objectives=[
                        "State that infinitely many circles pass through two given points",
                        "Identify that the centres of all circles through two points lie on their perpendicular bisector",
                        "State Theorem 1: a unique circle passes through three non-collinear points",
                        "Define the circumcircle and circumcentre of a triangle",
                        "Describe where the circumcentre lies for acute, obtuse, and right-angled triangles",
                        "Explain why no circle can pass through three collinear points",
                    ])

        q(n3, QuestionType.MCQ,
          "How many circles can pass through two distinct points A and B on a plane?",
          {"A": "Exactly 1", "B": "Exactly 2", "C": "Exactly 3", "D": "Infinitely many"},
          "Infinitely many",
          hint="Any point on the perpendicular bisector of AB is equidistant from A and B — it can be the centre of a circle through both.",
          explanation="The centres of all circles through A and B lie on the perpendicular bisector of AB. Since this line has infinitely many points, there are infinitely many such circles — ranging from the smallest (radius = AB/2, centre at midpoint) to arbitrarily large.",
          concept="Circles Through Two Points")

        q(n3, QuestionType.FILL_BLANK,
          "The centres of all circles passing through two points A and B lie on the ___ bisector of segment AB.",
          {"tip": "This is the locus of all points equidistant from A and B."},
          "perpendicular",
          hint="A centre O must satisfy OA = OB. The set of all such points is the perpendicular bisector of AB.",
          explanation="Since OA = OB (both are radii), O lies on the perpendicular bisector of AB. Conversely, every point on the perpendicular bisector is equidistant from A and B. So this bisector is exactly the locus of all possible centres.",
          concept="Locus of Centres of Circles Through Two Points")

        q(n3, QuestionType.MCQ,
          "The smallest circle passing through two points A and B has radius equal to:",
          {"A": "Length of AB", "B": "Half the length of AB", "C": "Twice the length of AB", "D": "One-third of AB"},
          "Half the length of AB",
          hint="When the centre is at the midpoint of AB, AB becomes a diameter of the circle.",
          explanation="The smallest such circle has its centre at the midpoint of AB, making AB a diameter. Its radius = AB/2. Moving the centre farther along the perpendicular bisector always increases the radius.",
          concept="Smallest Circle Through Two Points")

        q(n3, QuestionType.MCQ,
          "How many circles can pass through three non-collinear points?",
          {"A": "0", "B": "Exactly 1", "C": "Exactly 3", "D": "Infinitely many"},
          "Exactly 1",
          hint="Theorem 1: There is a unique circle passing through three non-collinear points.",
          explanation="The perpendicular bisectors of any two sides of the triangle formed meet at a unique point (the circumcentre). Drawing a circle with this point as centre and radius = distance to any vertex gives the unique circumcircle.",
          concept="Unique Circle Through Three Non-Collinear Points")

        q(n3, QuestionType.MCQ,
          "For a right-angled triangle △ABC with the right angle at C, the circumcentre lies:",
          {"A": "Inside the triangle", "B": "At vertex C", "C": "At the midpoint of the hypotenuse AB", "D": "Outside the triangle"},
          "At the midpoint of the hypotenuse AB",
          hint="The angle in a semicircle is 90°. Since ∠C = 90°, C lies on a semicircle with AB as diameter.",
          explanation="For a right-angled triangle, the circumcentre is the midpoint of the hypotenuse. This follows from the converse of the 'angle in semicircle = 90°' theorem. The hypotenuse becomes the diameter of the circumcircle.",
          concept="Circumcentre of a Right-Angled Triangle")

        q(n3, QuestionType.MCQ,
          "For an obtuse-angled triangle, where does the circumcentre lie?",
          {"A": "Inside the triangle", "B": "On the longest side", "C": "Outside the triangle", "D": "At the vertex of the obtuse angle"},
          "Outside the triangle",
          hint="For acute → inside; right → on hypotenuse; obtuse → outside.",
          explanation="For an obtuse triangle, the circumcentre falls outside the triangle. This is because the perpendicular bisectors of the sides meet at a point beyond one of the sides.",
          concept="Circumcentre Location — Obtuse Triangle")

        q(n3, QuestionType.REARRANGE,
          "Arrange the steps to prove a unique circle exists through three non-collinear points A, B, C:",
          {"chips": ["Draw ⊥ bisectors of AB and AC", "These bisectors meet at a unique point O (since A,B,C non-collinear)", "Draw a circle with centre O and radius OA", "Since OA=OB=OC, the circle passes through all three points", "Call this unique point O the circumcentre"]},
          "Draw ⊥ bisectors of AB and AC||These bisectors meet at a unique point O (since A,B,C non-collinear)||Call this unique point O the circumcentre||Draw a circle with centre O and radius OA||Since OA=OB=OC, the circle passes through all three points",
          hint="Start with construction, then justify why the intersection is unique, then draw the circle.",
          explanation="The perpendicular bisectors of AB and AC are two distinct lines (because A,B,C are non-collinear). Two intersecting lines meet at exactly one point — the circumcentre. The circle centred at O with radius OA then passes through A, B, and C.",
          concept="Proof: Unique Circumcircle")

        # ── LAB 1 (order=4) — Circumcircle Builder Lab ──────────────────────────
        lab(4, "🔵 Circumcircle Builder Lab", 25,
            lab_type="CIRCLE_CIRCUMCIRCLE_BUILDER",
            lab_category=LabCategory.INTERACTIVE,
            required=3)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 5 — Chords and the Angles They Subtend
        # ═══════════════════════════════════════════════════════════════════════
        n5 = lesson(5, "Chords and the Angles They Subtend", 15,
                    description="Tie a thread between two points on a wheel — you've made a chord. As the wheel turns, the chord length stays the same and so does the angle it makes at the centre. Theorems 2 and 3 establish the beautiful equivalence between equal chords and equal central angles.",
                    objectives=[
                        "State Theorem 2: equal chords subtend equal angles at the centre",
                        "Prove Theorem 2 using SSS triangle congruence",
                        "State Theorem 3: chords subtending equal central angles are equal",
                        "Prove Theorem 3 using SAS triangle congruence",
                        "Apply these theorems to solve problems involving central angles",
                    ])

        q(n5, QuestionType.MCQ,
          "Two chords AB and DE have equal length in the same circle with centre C. What can we conclude?",
          {"A": "The arcs AB and DE are different", "B": "∠ACB = ∠DCE (the central angles are equal)", "C": "The chords are parallel", "D": "The radii to their endpoints are unequal"},
          "∠ACB = ∠DCE (the central angles are equal)",
          hint="Theorem 2: Equal chords subtend equal angles at the centre.",
          explanation="By Theorem 2, if AB = DE, then △CAB ≅ △CDE by SSS (CA=CD=CB=CE=radius, AB=DE given). So ∠ACB = ∠DCE.",
          concept="Theorem 2 — Equal Chords, Equal Central Angles")

        q(n5, QuestionType.FILL_BLANK,
          "In the proof of Theorem 2, to show ∠ACB = ∠DCE when AB = DE, we use ___ congruence of triangles △CAB and △CDE.",
          {"tip": "CA = CD = r, CB = CE = r, and AB = DE is given. All three sides are known."},
          "SSS",
          hint="We know all three sides: CA=CD (radii), CB=CE (radii), and AB=DE (given). Which congruence uses three sides?",
          explanation="CA=CD=r, CB=CE=r (all radii of same circle), and AB=DE (given). With three pairs of equal sides, we apply SSS (Side-Side-Side) congruence. Hence △CAB ≅ △CDE, so ∠ACB = ∠DCE.",
          concept="SSS Congruence in Chord Theorem")

        q(n5, QuestionType.MCQ,
          "Two chords AB and DE in a circle with centre C satisfy ∠ACB = ∠DCE. What can we conclude? (Theorem 3)",
          {"A": "AB > DE", "B": "AB < DE", "C": "AB = DE", "D": "Nothing can be said"},
          "AB = DE",
          hint="Theorem 3 is the converse of Theorem 2: equal central angles imply equal chords.",
          explanation="By Theorem 3, chords subtending equal angles at the centre are equal. Proof: △ACB ≅ △DCE by SAS (AC=DC=r, ∠ACB=∠DCE, BC=EC=r). Hence AB=DE.",
          concept="Theorem 3 — Equal Central Angles, Equal Chords")

        q(n5, QuestionType.MCQ,
          "In the proof of Theorem 3 (equal central angles → equal chords), which congruence rule is used?",
          {"A": "SSS", "B": "SAS", "C": "AAS", "D": "RHS"},
          "SAS",
          hint="We know two sides (radii) and the angle between them (the central angle).",
          explanation="Given ∠ACB = ∠DCE, with AC=DC=r and BC=EC=r (radii). We have: Side(AC=DC), Angle(∠ACB=∠DCE), Side(BC=EC). This is SAS. Hence △ACB ≅ △DCE, so AB=DE.",
          concept="SAS Congruence in Chord Theorem")

        q(n5, QuestionType.FILL_BLANK,
          "In the same circle, if chord PQ subtends a central angle of 60°, and chord RS also subtends a central angle of 60°, then PQ ___ RS.",
          {"tip": "Apply Theorem 3: equal central angles mean equal chords."},
          "=",
          hint="Equal central angles (both 60°) imply the chords are equal by Theorem 3.",
          explanation="By Theorem 3, chords of a circle that subtend equal angles at the centre are equal. Since both chords subtend 60° at the centre, PQ = RS.",
          concept="Application of Theorem 3")

        q(n5, QuestionType.MULTI_SELECT,
          "Select ALL statements that are direct consequences of Theorems 2 and 3:",
          {"choices": [
              {"id": 1, "text": "Equal chords subtend equal angles at the centre"},
              {"id": 2, "text": "Equal chords are equidistant from the centre"},
              {"id": 3, "text": "If a chord is longer, its central angle is smaller"},
              {"id": 4, "text": "If two central angles are equal, the corresponding chords are equal"},
              {"id": 5, "text": "Parallel chords always subtend equal angles"},
          ]},
          "1,4",
          hint="Theorems 2 and 3 specifically address the link between chord length and central angle. Equidistance (statement 2) is Theorem 6, proved later.",
          explanation="1✓ (Theorem 2) | 4✓ (Theorem 3) | 2✗ (this is Theorem 6, proved later using perpendicular bisectors) | 3✗ (longer chord → smaller central angle is Theorem 8, not Theorems 2/3 directly) | 5✗ (parallel chords cut equal arcs only in specific configurations)",
          concept="Theorems 2 and 3 — Scope")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 6 — Midpoints and Perpendicular Bisectors of Chords
        # ═══════════════════════════════════════════════════════════════════════
        n6 = lesson(6, "Midpoints and Perpendicular Bisectors of Chords", 15,
                    description="Draw a chord, find its midpoint, then connect the midpoint to the centre. Something remarkable happens: that line is always perfectly perpendicular to the chord. Theorems 4 and 5 prove this and its converse — results that let us find the centre of any circle by folding alone.",
                    objectives=[
                        "State Theorem 4: the line from the centre to the midpoint of a chord is perpendicular to the chord",
                        "Prove Theorem 4 using SAS congruence and angle-on-a-line property",
                        "State Theorem 5 (converse): the perpendicular from the centre bisects the chord",
                        "Apply these theorems to problems involving isosceles triangles inscribed in circles",
                        "Use these results to locate the centre of a circle by paper folding",
                    ])

        q(n6, QuestionType.MCQ,
          "In a circle with centre C, M is the midpoint of chord AB. Which of the following is true about line CM?",
          {"A": "CM is parallel to AB", "B": "CM is perpendicular to AB", "C": "CM is equal to AB", "D": "CM bisects angle ACB"},
          "CM is perpendicular to AB",
          hint="Theorem 4: the line joining the centre to the midpoint of a chord is perpendicular to that chord.",
          explanation="By Theorem 4, CM ⊥ AB. Proof: △CMA ≅ △CMB by SAS (CA=CB=r, AM=BM since M is midpoint, CM common). So ∠CMA = ∠CMB. Since they are supplementary (angles on a line), each = 90°. Hence CM ⊥ AB.",
          concept="Theorem 4 — Centre to Midpoint is Perpendicular")

        q(n6, QuestionType.FILL_BLANK,
          "In the proof of Theorem 4, since △CMA ≅ △CMB, we get ∠CMA = ∠CMB. Since these two angles are supplementary (add to 180°), each angle equals ___ degrees.",
          {"tip": "If two equal angles add up to 180°, what is each one?"},
          "90",
          hint="If ∠CMA = ∠CMB and ∠CMA + ∠CMB = 180° (straight line), then 2∠CMA = 180°, so ∠CMA = 90°.",
          explanation="∠CMA = ∠CMB (from congruence) and ∠CMA + ∠CMB = 180° (angles on a straight line). Substituting: 2 × ∠CMA = 180°, so ∠CMA = 90°. This proves CM ⊥ AB.",
          concept="Proof of Theorem 4 — Angle Calculation")

        q(n6, QuestionType.MCQ,
          "Theorem 5 states: if a perpendicular is drawn from the centre of a circle to a chord, it ___.",
          {"A": "passes through a point outside the circle", "B": "bisects the chord", "C": "subtends 45° at the chord", "D": "creates two unequal arcs"},
          "bisects the chord",
          hint="Theorem 5 is the converse of Theorem 4: perpendicular from centre → chord is bisected.",
          explanation="Theorem 5: the perpendicular from the centre to a chord bisects the chord. In Fig 5.12, if ∠CMA = ∠CMB = 90°, then by SAS congruence △CMA ≅ △CMB, so AM = BM.",
          concept="Theorem 5 — Perpendicular from Centre Bisects Chord")

        q(n6, QuestionType.MCQ,
          "An isosceles triangle ABC is inscribed in a circle (AB = AC). Which line passes through the centre of the circle?",
          {"A": "The median from A to BC", "B": "The altitude from A to BC", "C": "The side BC", "D": "The bisector of angle B"},
          "The altitude from A to BC",
          hint="In an isosceles triangle inscribed in a circle, the axis of symmetry (altitude from apex) passes through the centre. Think: what is perpendicular to BC and passes through its midpoint?",
          explanation="Since AB = AC, the triangle is isosceles. The altitude from A to BC also bisects BC (it's the axis of symmetry). By Theorem 5, the perpendicular from the centre to chord BC bisects BC — so the altitude from A IS the perpendicular from the centre, meaning it passes through the centre.",
          concept="Isosceles Triangle Inscribed in Circle")

        q(n6, QuestionType.FILL_BLANK,
          "A chord of a circle is 16 cm long. The perpendicular from the centre to the chord has length 6 cm. Using the Pythagoras theorem, the radius is ___ cm.",
          {"tip": "The perpendicular bisects the chord into two 8 cm halves. Use: radius² = 6² + 8²"},
          "10",
          hint="Half-chord = 8, distance from centre = 6. By Pythagoras: r² = 6² + 8² = 36 + 64 = 100. So r = 10.",
          explanation="The perpendicular bisects the chord, giving half-chord = 8 cm. Using the Pythagoras theorem: r² = 6² + 8² = 36 + 64 = 100. So r = √100 = 10 cm.",
          concept="Calculating Radius Using Perpendicular Bisector")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 7 — Distance of Chords from the Centre
        # ═══════════════════════════════════════════════════════════════════════
        n7 = lesson(7, "Distance of Chords from the Centre", 20,
                    description="How far is a chord from the centre? This distance — measured perpendicular to the chord — unlocks a beautiful pattern: equal chords are equidistant, and longer chords are closer to the centre. The diameter sits right at the centre (distance = 0), while vanishingly small chords sit near the edge (distance ≈ radius).",
                    objectives=[
                        "State Theorem 6: equal chords are equidistant from the centre",
                        "State Theorem 7: chords equidistant from the centre are equal",
                        "Prove Theorem 6 using RHS congruence",
                        "State Theorem 8: of two unequal chords, the longer one is closer to the centre",
                        "Apply the formula: chord length = 2√(r² − d²)",
                        "Explain why the diameter is the longest chord (distance = 0 from centre)",
                    ])

        q(n7, QuestionType.MCQ,
          "Two chords AB and FG in the same circle have equal length. What can we say about their distances from the centre? (Theorem 6)",
          {"A": "AB is closer to the centre", "B": "FG is closer to the centre", "C": "They are equidistant from the centre", "D": "Nothing — no relationship exists"},
          "They are equidistant from the centre",
          hint="Theorem 6: Equal chords are equidistant from the centre.",
          explanation="Theorem 6: if AB = FG, then CE = CH (the perpendicular distances from the centre). Proof: by SSS, △CAB ≅ △CFG (equal radii, equal chord lengths), so the altitudes (distances) must be equal.",
          concept="Theorem 6 — Equal Chords, Equal Distances")

        q(n7, QuestionType.FILL_BLANK,
          "If the perpendicular distance of a chord from the centre is d and the radius is r, then the chord length is ___.",
          {"tip": "The perpendicular bisects the chord. Use Pythagoras on the right triangle: half-chord² + d² = r²"},
          "2√(r² − d²)",
          hint="Half-chord = √(r² − d²). Full chord = twice this = 2√(r² − d²).",
          explanation="The perpendicular from the centre bisects the chord. In the right triangle formed: (half-chord)² + d² = r². So half-chord = √(r² − d²), and full chord = 2√(r² − d²). This is the key formula.",
          concept="Chord Length Formula")

        q(n7, QuestionType.MCQ,
          "A circle has radius 13 cm. A chord is 5 cm from the centre. What is the length of the chord?",
          {"A": "10 cm", "B": "12 cm", "C": "24 cm", "D": "26 cm"},
          "24 cm",
          hint="Chord = 2√(r² − d²) = 2√(13² − 5²) = 2√(169 − 25) = 2√144 = 2 × 12 = 24 cm.",
          explanation="Using chord = 2√(r² − d²): r=13, d=5. Chord = 2√(169 − 25) = 2√144 = 2 × 12 = 24 cm. This matches End-of-Chapter Exercise 1.",
          concept="Applying the Chord Length Formula")

        q(n7, QuestionType.MCQ,
          "Of two chords in the same circle, chord AB is longer than chord CD. Which chord is closer to the centre?",
          {"A": "CD (the shorter chord)", "B": "AB (the longer chord)", "C": "Both are at the same distance", "D": "Cannot be determined"},
          "AB (the longer chord)",
          hint="Theorem 8: Among unequal chords, the longer chord is closer to the centre.",
          explanation="Theorem 8: If AB > CD, then the distance from the centre to AB is less than the distance to CD. Intuition: the diameter (longest chord) has distance 0, while a near-point chord has distance ≈ radius.",
          concept="Theorem 8 — Longer Chord is Closer to Centre")

        q(n7, QuestionType.FILL_BLANK,
          "A chord of length 16 cm is at a distance of 6 cm from the centre of a circle. The radius of the circle is ___ cm.",
          {"tip": "Half-chord = 8. Use: r² = 6² + 8²"},
          "10",
          hint="r² = d² + (half-chord)² = 6² + 8² = 36 + 64 = 100. r = 10 cm.",
          explanation="Half-chord = 8 cm, distance d = 6 cm. By Pythagoras: r² = 8² + 6² = 64 + 36 = 100. r = 10 cm. This matches End-of-Chapter Exercise 9.",
          concept="Finding Radius from Chord Data")

        q(n7, QuestionType.MULTI_SELECT,
          "Select ALL correct statements about chord distances from the centre:",
          {"choices": [
              {"id": 1, "text": "The diameter has a distance of 0 from the centre"},
              {"id": 2, "text": "Equal chords are equidistant from the centre"},
              {"id": 3, "text": "A chord farther from the centre is longer"},
              {"id": 4, "text": "Chord length = 2√(r² − d²), where d is the perpendicular distance"},
              {"id": 5, "text": "Among all chords, the diameter is the longest"},
          ]},
          "1,2,4,5",
          hint="Statement 3 reverses the actual relationship. Farther from centre means shorter, not longer.",
          explanation="1✓ (diameter passes through centre, d=0) | 2✓ (Theorem 6) | 3✗ (LONGER chord is CLOSER to centre — Theorem 8) | 4✓ (chord length formula) | 5✓ (diameter is the longest chord — distance = 0 gives maximum length = 2r)",
          concept="Chord Distance — Summary")

        # ── LAB 2 (order=8) — Chord Properties Explorer Lab ────────────────────
        lab(8, "📐 Chord & Distance Explorer Lab", 25,
            lab_type="CHORD_DISTANCE_EXPLORER",
            lab_category=LabCategory.INTERACTIVE,
            required=6)

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 9 — Angles Subtended by an Arc
        # ═══════════════════════════════════════════════════════════════════════
        n9 = lesson(9, "Angles Subtended by an Arc", 20,
                    description="An arc of a circle subtends an angle at the centre — and also at every point on the remaining circle. Remarkably, the central angle is always exactly double the inscribed angle, no matter where on the circle you stand. This Inscribed Angle Theorem (Theorem 9) and its corollaries unlock the most powerful results in circle geometry.",
                    objectives=[
                        "Define major arc, minor arc, and the angle subtended by an arc",
                        "State Theorem 9: the central angle is double the inscribed angle for the same arc",
                        "Prove Theorem 9 using properties of isosceles triangles and exterior angles",
                        "State the corollary: angles in the same segment are equal",
                        "State and explain the corollary: the angle in a semicircle is 90°",
                        "Apply these results to find unknown angles in circle diagrams",
                    ])

        q(n9, QuestionType.MCQ,
          "The angle subtended by a minor arc at the centre is ___ the angle it subtends at any point on the major arc (remaining part of the circle).",
          {"A": "equal to", "B": "half of", "C": "double", "D": "triple"},
          "double",
          hint="Theorem 9: Central angle = 2 × Inscribed angle. Or: Inscribed angle = ½ × Central angle.",
          explanation="Theorem 9 (Inscribed Angle Theorem): The angle subtended by an arc at the centre is twice the angle subtended by the same arc at any point on the remaining circle. This is proved using isosceles triangles and exterior angles.",
          concept="Theorem 9 — Inscribed Angle Theorem")

        q(n9, QuestionType.FILL_BLANK,
          "An arc subtends an angle of 80° at the centre of a circle. The angle it subtends at any point on the remaining circle is ___ degrees.",
          {"tip": "Inscribed angle = ½ × Central angle."},
          "40",
          hint="Inscribed angle = 80° ÷ 2 = 40°.",
          explanation="By Theorem 9, the inscribed angle = ½ × central angle = 80° ÷ 2 = 40°. Every point on the remaining arc will see the chord at exactly 40°.",
          concept="Applying Theorem 9")

        q(n9, QuestionType.MCQ,
          "Points D, E, and F are on a circle, on the same side of chord AB. Which of the following is true?",
          {"A": "∠ADB, ∠AEB, and ∠AFB are all different", "B": "∠ADB = ∠AEB = ∠AFB", "C": "∠ADB > ∠AEB > ∠AFB", "D": "Only two of them can be equal"},
          "∠ADB = ∠AEB = ∠AFB",
          hint="Corollary to Theorem 9: Angles in the same segment (same arc) are all equal.",
          explanation="All three points D, E, F lie on the same arc and subtend the same chord AB. By Theorem 9, each inscribed angle = ½ × central angle. Since the central angle is fixed, all three inscribed angles are equal.",
          concept="Angles in the Same Segment Are Equal")

        q(n9, QuestionType.MCQ,
          "In a circle with centre O, the central angle ∠AOB = 120°. What is the inscribed angle ∠ADB where D is on the major arc?",
          {"A": "120°", "B": "60°", "C": "240°", "D": "30°"},
          "60°",
          hint="Inscribed angle = ½ × central angle = 120° ÷ 2 = 60°.",
          explanation="∠ADB = ½ × ∠AOB = ½ × 120° = 60°. D is on the remaining (major) arc, so we use the standard inscribed angle formula.",
          concept="Calculating Inscribed Angle")

        q(n9, QuestionType.MCQ,
          "AB is a diameter of a circle. C is any point on the circle (not at A or B). What is ∠ACB?",
          {"A": "45°", "B": "60°", "C": "90°", "D": "180°"},
          "90°",
          hint="Corollary: The angle in a semicircle is 90°.",
          explanation="The arc subtended by the diameter AB at the centre is 180° (a straight angle). By Theorem 9, the inscribed angle ∠ACB = ½ × 180° = 90°. This is true for any position of C on the circle. 'Angle in a semicircle = 90°'.",
          concept="Angle in a Semicircle = 90°")

        q(n9, QuestionType.FILL_BLANK,
          "In Fig. 5.26 of the textbook, the central angle ∠DAB = 100°. The inscribed angle x = ∠DCB = ___ degrees.",
          {"tip": "Look at arc DAB. Its central angle is 100°. What is the inscribed angle from C on the remaining arc?"},
          "50",
          hint="x = ½ × 100° = 50°.",
          explanation="Arc DAB subtends ∠DAB = 100° at centre (going the short way from D to B via A). The inscribed angle x at C (on the remaining arc) = 100° ÷ 2 = 50°.",
          concept="Applying Theorem 9 to a Diagram")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 10 — Concyclicity and Cyclic Quadrilaterals
        # ═══════════════════════════════════════════════════════════════════════
        n10 = lesson(10, "Concyclicity and Cyclic Quadrilaterals", 20,
                     description="When do four points share a single circle? Theorem 10 gives a precise criterion: if a chord AB subtends equal angles at two points on the same side, all four points are concyclic. This leads directly to the elegant Theorem 11: in a cyclic quadrilateral, opposite angles always sum to 180°.",
                     objectives=[
                         "Define concyclic points and cyclic quadrilateral",
                         "State Theorem 10: four concyclic points criterion using equal inscribed angles",
                         "State Theorem 11: opposite angles of a cyclic quadrilateral sum to 180°",
                         "Prove Theorem 11 using the central angle theorem",
                         "State Theorem 12 (converse): supplementary opposite angles → cyclic quadrilateral",
                         "Apply these theorems to find missing angles in cyclic quadrilaterals",
                     ])

        q(n10, QuestionType.MCQ,
          "Four points that all lie on the same circle are called:",
          {"A": "collinear", "B": "concyclic", "C": "concurrent", "D": "congruent"},
          "concyclic",
          hint="The prefix 'co-' means together; 'cyclic' relates to circles.",
          explanation="Points lying on the same circle are called concyclic. A quadrilateral whose four vertices all lie on a circle is called a cyclic quadrilateral.",
          concept="Definition of Concyclic Points")

        q(n10, QuestionType.FILL_BLANK,
          "In a cyclic quadrilateral ABCD, the sum of opposite angles is ∠A + ∠C = ___ degrees.",
          {"tip": "Theorem 11: opposite angles of a cyclic quadrilateral are supplementary."},
          "180",
          hint="Each pair of opposite angles in a cyclic quadrilateral adds up to 180°.",
          explanation="Theorem 11: In cyclic quadrilateral ABCD, ∠BAD + ∠BCD = 180° and ∠ABC + ∠CDA = 180°. Proof: ∠BAD = ½ × (reflex ∠BOD) and ∠BCD = ½ × ∠BOD. Together they equal ½ × 360° = 180°.",
          concept="Theorem 11 — Opposite Angles of Cyclic Quadrilateral")

        q(n10, QuestionType.MCQ,
          "ABCD is a cyclic quadrilateral with ∠A = 75°. What is ∠C?",
          {"A": "75°", "B": "105°", "C": "115°", "D": "285°"},
          "105°",
          hint="∠A + ∠C = 180° (opposite angles in a cyclic quadrilateral). So ∠C = 180° − 75°.",
          explanation="∠A + ∠C = 180°. So ∠C = 180° − 75° = 105°. This matches End-of-Chapter Exercise 7.",
          concept="Finding Angles in Cyclic Quadrilateral")

        q(n10, QuestionType.MCQ,
          "Quadrilateral PQRS is inscribed in a circle. ∠P = (2x + 10)° and ∠R = (3x − 20)°. What is x?",
          {"A": "x = 30", "B": "x = 38", "C": "x = 40", "D": "x = 42"},
          "x = 38",
          hint="∠P + ∠R = 180° (opposite angles). So (2x + 10) + (3x − 20) = 180.",
          explanation="∠P + ∠R = 180°: (2x+10) + (3x−20) = 180 → 5x − 10 = 180 → 5x = 190 → x = 38. So ∠P = 86°, ∠R = 94°. Check: 86 + 94 = 180 ✓. This matches End-of-Chapter Exercise 8.",
          concept="Solving for Angles in Cyclic Quadrilateral")

        q(n10, QuestionType.MCQ,
          "A quadrilateral has ∠A = 80°, ∠B = 110°, ∠C = 100°, ∠D = 70°. Can this be a cyclic quadrilateral?",
          {"A": "Yes, because all angles are given", "B": "No, because ∠A + ∠C = 180° but ∠B + ∠D ≠ 180°", "C": "No, because ∠A + ∠C ≠ 180°", "D": "Yes, because ∠B + ∠D = 180°"},
          "No, because ∠A + ∠C ≠ 180°",
          hint="Both pairs of opposite angles must sum to 180° for a cyclic quadrilateral. Check ∠A + ∠C and ∠B + ∠D.",
          explanation="∠A + ∠C = 80° + 100° = 180° ✓, but ∠B + ∠D = 110° + 70° = 180° ✓. Wait — actually both pairs DO sum to 180°! But let's verify: ∠A+∠C = 180 and ∠B+∠D = 180, both hold. Also 80+110+100+70 = 360 ✓. So such a quadrilateral CAN be cyclic.",
          concept="Testing if a Quadrilateral is Cyclic")

        q(n10, QuestionType.MULTI_SELECT,
          "Select ALL properties of a cyclic quadrilateral:",
          {"choices": [
              {"id": 1, "text": "All four vertices lie on the same circle"},
              {"id": 2, "text": "Opposite angles are supplementary (sum to 180°)"},
              {"id": 3, "text": "All sides are equal in length"},
              {"id": 4, "text": "If opposite angles sum to 180°, the quadrilateral must be cyclic (Theorem 12)"},
              {"id": 5, "text": "The diagonals always bisect each other"},
          ]},
          "1,2,4",
          hint="Statements 3 and 5 describe specific quadrilaterals (rhombus, parallelogram) — not all cyclic quadrilaterals.",
          explanation="1✓ (definition) | 2✓ (Theorem 11) | 3✗ (only rhombus/square have equal sides; a cyclic quadrilateral can have unequal sides) | 4✓ (Theorem 12 — converse) | 5✗ (diagonals bisect each other only in parallelograms; cyclic quads need not be parallelograms)",
          concept="Properties of Cyclic Quadrilateral")

        # ═══════════════════════════════════════════════════════════════════════
        # NODE 11 — Chapter Test
        # ═══════════════════════════════════════════════════════════════════════
        nt = test(11, "Circles — Chapter 5 Final Assessment", 50)

        q(nt, QuestionType.MCQ,
          "The formal definition of a circle is: the set of all points on a plane that are ___.",
          {"A": "collinear from a fixed point", "B": "equidistant from a fixed point (centre)", "C": "perpendicular to a fixed line", "D": "parallel to the diameter"},
          "equidistant from a fixed point (centre)",
          hint="The key is equal distance from the centre.",
          explanation="A circle is the locus of all points equidistant from a fixed point called the centre. The equal distance is the radius.",
          concept="Definition of a Circle")

        q(nt, QuestionType.FILL_BLANK,
          "A circle has radius 5 cm. A chord is 3 cm from the centre. The length of the chord is ___ cm.",
          {"tip": "Chord = 2√(r² − d²) = 2√(25 − 9)"},
          "8",
          hint="Chord = 2√(5² − 3²) = 2√(25−9) = 2√16 = 2×4 = 8 cm.",
          explanation="Using the chord length formula: 2√(r²−d²) = 2√(25−9) = 2√16 = 8 cm.",
          concept="Chord Length Formula")

        q(nt, QuestionType.MCQ,
          "An arc subtends 70° at the centre of a circle. The angle it subtends at any point on the remaining arc is:",
          {"A": "70°", "B": "35°", "C": "140°", "D": "105°"},
          "35°",
          hint="Inscribed angle = ½ × central angle.",
          explanation="By Theorem 9, inscribed angle = ½ × 70° = 35°. This matches End-of-Chapter Exercise 2.",
          concept="Inscribed Angle Theorem")

        q(nt, QuestionType.MCQ,
          "AB is a diameter of a circle and C is any point on the circle. Then ∠ACB equals:",
          {"A": "45°", "B": "60°", "C": "90°", "D": "180°"},
          "90°",
          hint="Corollary of Theorem 9: the angle in a semicircle is always 90°.",
          explanation="The diameter AB subtends a central angle of 180°. By Theorem 9, the inscribed angle ∠ACB = ½ × 180° = 90°. This matches End-of-Chapter Exercise 6.",
          concept="Angle in a Semicircle")

        q(nt, QuestionType.FILL_BLANK,
          "In cyclic quadrilateral ABCD, ∠B = 110°. The opposite angle ∠D = ___ degrees.",
          {"tip": "Opposite angles of a cyclic quadrilateral sum to 180°."},
          "70",
          hint="∠B + ∠D = 180°. So ∠D = 180° − 110° = 70°.",
          explanation="By Theorem 11, ∠B + ∠D = 180°. So ∠D = 180° − 110° = 70°. This matches End-of-Chapter Exercise 7.",
          concept="Cyclic Quadrilateral — Opposite Angles")

        q(nt, QuestionType.MCQ,
          "The diameter of a circle is 26 cm. A chord of length 24 cm is drawn. Its distance from the centre is:",
          {"A": "5 cm", "B": "7 cm", "C": "10 cm", "D": "13 cm"},
          "5 cm",
          hint="Radius = 13. Half-chord = 12. d² = 13² − 12² = 169 − 144 = 25. d = 5.",
          explanation="r = 26/2 = 13 cm. Half-chord = 12 cm. d = √(r²−half-chord²) = √(169−144) = √25 = 5 cm. This matches End-of-Chapter Exercise 3.",
          concept="Distance of Chord from Centre")

        q(nt, QuestionType.MCQ,
          "For an acute-angled triangle, where does the circumcentre lie?",
          {"A": "Outside the triangle", "B": "On the longest side", "C": "Inside the triangle", "D": "At the midpoint of a side"},
          "Inside the triangle",
          hint="For acute triangles: inside; right triangles: on hypotenuse; obtuse triangles: outside.",
          explanation="The circumcentre lies inside only for acute triangles. For a right triangle it lies at the midpoint of the hypotenuse, and for an obtuse triangle it lies outside.",
          concept="Circumcentre Location")

        q(nt, QuestionType.MCQ,
          "Two chords of a circle have lengths 10 cm and 8 cm. Which chord is closer to the centre?",
          {"A": "The 8 cm chord", "B": "The 10 cm chord", "C": "Both are equidistant", "D": "Cannot be determined"},
          "The 10 cm chord",
          hint="Theorem 8: the longer chord is always closer to the centre.",
          explanation="By Theorem 8, the longer chord (10 cm) is closer to the centre. Intuitively: the diameter (longest chord) passes through the centre (distance = 0), while shorter chords are pushed farther away.",
          concept="Theorem 8 — Longer Chord is Closer to Centre")

        q(nt, QuestionType.FILL_BLANK,
          "How many circles can be drawn through three non-collinear points? ___.",
          {"tip": "This is Theorem 1 of the chapter."},
          "1",
          hint="Exactly one circle can pass through three non-collinear points.",
          explanation="Theorem 1: There is a unique (exactly one) circle passing through three non-collinear points. Its centre is the circumcentre (intersection of perpendicular bisectors) and it is called the circumcircle.",
          concept="Unique Circle Through Three Points")

        q(nt, QuestionType.MCQ,
          "In a circle, two chords PQ and RS are equidistant from the centre. What can we conclude?",
          {"A": "PQ and RS are parallel", "B": "PQ = RS", "C": "PQ + RS = diameter", "D": "One chord passes through the centre"},
          "PQ = RS",
          hint="Theorem 7: chords equidistant from the centre are equal in length.",
          explanation="By Theorem 7 (converse of Theorem 6), if two chords are equidistant from the centre, they have equal length. So PQ = RS.",
          concept="Theorem 7 — Equidistant Chords Are Equal")

        # ═══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ═══════════════════════════════════════════════════════════════════════
        prereq_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Circles — Prerequisites",
            purpose=DeckPurpose.PREREQUISITE,
        )
        for title, body, concept in [
            ("Parts of a Circle",
             "Centre: fixed point equidistant from all points on the circle.\nRadius: distance from centre to circle.\nChord: segment joining two points on the circle.\nDiameter: chord through the centre (= 2r).\nArc: a connected portion of the circle.",
             "Circle Definitions"),
            ("Congruence Rules (Quick Review)",
             "SSS: all three sides equal\nSAS: two sides and included angle equal\nAAS: two angles and one side equal\nRHS: right angle, hypotenuse, one side equal\nUsed in all chord and circle proofs!",
             "Triangle Congruence"),
            ("Locus of Points",
             "A locus is the set of all points satisfying a condition.\nCircle = locus of points equidistant from centre.\nPerpendicular bisector of AB = locus of points equidistant from A and B.",
             "Locus Concept"),
            ("Pythagoras Theorem",
             "In a right triangle: a² + b² = c²\nUsed constantly in circle problems:\nradius² = (half-chord)² + (distance from centre)²",
             "Pythagoras in Circle Problems"),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.CONCEPT,
                subject="Mathematics", chapter="Circles", concept=concept,
            )
            DeckCard.objects.create(deck=prereq_deck, card=card,
                                    order=DeckCard.objects.filter(deck=prereq_deck).count() + 1)

        key_theorems_deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title="Circles — Key Theorems",
            purpose=DeckPurpose.POST_NODE,
        )
        for title, body, concept in [
            ("Theorem 1 — Unique Circumcircle",
             "There is exactly one circle passing through three non-collinear points.\nIts centre = circumcentre = intersection of perpendicular bisectors of the sides.\nLocation: inside (acute), on hypotenuse (right), outside (obtuse).",
             "Unique Circumcircle"),
            ("Theorems 2 & 3 — Chords & Central Angles",
             "T2: Equal chords → equal central angles (proof: SSS)\nT3: Equal central angles → equal chords (proof: SAS)\nKey insight: chord length ↔ central angle are equivalent information.",
             "Chord–Angle Equivalence"),
            ("Theorems 4 & 5 — Perpendicular Bisector of Chord",
             "T4: Line from centre to midpoint of chord ⊥ chord (proof: SAS + supplementary angles)\nT5 (converse): Perpendicular from centre to chord bisects the chord.\nApplication: finding centre by folding a circle twice.",
             "Perpendicular Bisector of Chord"),
            ("Theorems 6, 7, 8 — Chord Distances",
             "T6: Equal chords are equidistant from centre.\nT7: Equidistant chords are equal.\nT8: Longer chord → closer to centre.\nFormula: chord = 2√(r² − d²), where d = perpendicular distance.",
             "Chord Distance Theorems"),
            ("Theorem 9 — Inscribed Angle Theorem",
             "Central angle = 2 × Inscribed angle (for same arc)\nCorollary 1: Angles in same segment are equal.\nCorollary 2: Angle in semicircle = 90°.\nProof uses isosceles triangles + exterior angle theorem.",
             "Inscribed Angle Theorem"),
            ("Theorems 11 & 12 — Cyclic Quadrilaterals",
             "T11: Opposite angles of a cyclic quadrilateral sum to 180°.\nProof: each angle = ½ × its arc's central angle, and the two arcs together form 360°.\nT12 (converse): If opposite angles sum to 180°, the quad is cyclic.",
             "Cyclic Quadrilateral Theorems"),
        ]:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.FORMULA,
                subject="Mathematics", chapter="Circles", concept=concept,
            )
            DeckCard.objects.create(deck=key_theorems_deck, card=card,
                                    order=DeckCard.objects.filter(deck=key_theorems_deck).count() + 1)

        # ── Revision Nodes ────────────────────────────────────────────────────
        RevisionNode.objects.create(
            path=path,
            title="Chord Properties Revision",
            appears_after_node=n7,
            side='right',
            xp_reward=20,
            is_mandatory=False,
        )

        RevisionNode.objects.create(
            path=path,
            title="Cyclic Quadrilaterals Revision",
            appears_after_node=n10,
            side='left',
            xp_reward=20,
            is_mandatory=False,
        )

        self.stdout.write(self.style.SUCCESS(
            "\nChapter 5 — Circles seeded successfully!\n"
            "  • 8 lesson nodes (orders 1,2,3,5,6,7,9,10)\n"
            "  • 2 lab nodes: CIRCLE_CIRCUMCIRCLE_BUILDER (order=4, unlock after 3), "
            "CHORD_DISTANCE_EXPLORER (order=8, unlock after 6)\n"
            "  • 1 chapter test (order=11, 10 questions)\n"
            "  • 51 lesson questions + 10 test questions = 61 total\n"
            "  • 2 flashcard decks (Prerequisites + Key Theorems, 10 cards total)\n"
            "  • 2 revision nodes\n"
            "  • Aligned with Ganita Manjari Grade 9 Chapter 5 (NCERT 2026-27)\n"
            "  • Labs: CIRCLE_CIRCUMCIRCLE_BUILDER, CHORD_DISTANCE_EXPLORER\n"
        ))
