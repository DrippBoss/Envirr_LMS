from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType,
    QuestionType, FlashcardType, DeckPurpose
)

IMG = 'question_images/circles_ch10/'


class Command(BaseCommand):
    help = 'Seeds Chapter 10 — Circles (NCERT Class X, CBSE)'

    def handle(self, *args, **kwargs):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Chapter 10: Circles', subject='Mathematics',
            class_grade='10', board='CBSE', order=10, icon='circle',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Chapter 10: Circles', class_grade='10'
        )

        self.stdout.write('Wiping old nodes for clean re-seed...')
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # ── helpers ──────────────────────────────────────────────────────────
        def q(node, qtype, text, opts, ans,
              hint='', explanation='', concept='', img=None, img_desc=''):
            LessonQuestion.objects.create(
                node=node, question_type=qtype, question_text=text,
                options_json=opts, correct_answer=ans,
                hint=hint, explanation=explanation, concept=concept,
                has_image=bool(img),
                image=IMG + img if img else '',
                image_description=img_desc,
            )

        def lesson(order, title, xp, description='', objectives=None):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LESSON, order=order,
                xp_reward=xp, practice_question_count=5, starting_lives=3,
                description=description, objectives_json=objectives or [],
            )

        def test(order, title, xp):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.CHAPTER_TEST, order=order,
                xp_reward=xp, test_question_count=10, test_pass_percentage=70,
            )

        MCQ   = QuestionType.MCQ
        AR    = QuestionType.MCQ        # Assertion-Reason uses MCQ type
        SHORT = QuestionType.SHORT_ANSWER
        LONG  = QuestionType.LONG_ANSWER

        # ════════════════════════════════════════════════════════════════════
        # LESSON 1 — Tangent Properties: MCQs Part 1 (Q1–Q9)
        # ════════════════════════════════════════════════════════════════════
        L1 = lesson(1, 'Tangent Properties — MCQs I', 50,
            description='Core properties of tangents, chord-tangent angles and similar triangles formed by intersecting chords.',
            objectives=[
                'Apply chord intersection similarity (ΔADP~ΔCBP)',
                'Use tangent-chord angle (alternate segment theorem)',
                'Apply tangent-radius perpendicularity',
                'Find angles using tangent-from-external-point properties',
            ])

        q(L1, MCQ,
          'AB and CD are two chords of a circle intersecting at P. Choose the correct statement. [BOARD 2024]',
          ['ΔADP~ΔCBA', 'ΔADP~ΔBPC', 'ΔADP~ΔBCP', 'ΔADP~ΔCBP'],
          'ΔADP~ΔCBP',
          hint='Use AA similarity: vertical angles at P, and angles subtended by the same arc.',
          explanation='∠DPA = ∠BPC (vertical). ∠ADP = ∠CBP (angles in same segment on arc AB). By AA, ΔADP ~ ΔCBP.',
          concept='Intersecting Chords Similarity',
          img='mcq_q1.png', img_desc='Circle with chords AB and CD intersecting at P inside; D top-left, B top-right, A bottom, C bottom-right.')

        q(L1, MCQ,
          'In the given figure, tangents PA and PB to the circle centered at O from point P are perpendicular to each other. If PA = 5 cm then length of AB is [BOARD 2024]',
          ['5 cm', '5√2 cm', '2√5 cm', '10 cm'],
          '5√2 cm',
          hint='PA = PB (equal tangents). ∠APB = 90°. Use Pythagoras on triangle APB.',
          explanation='PA = PB = 5 cm, ∠APB = 90°. AB² = PA² + PB² = 25 + 25 = 50. AB = 5√2 cm.',
          concept='Tangent Length and Right Angle',
          img='mcq_q2.png', img_desc='Circle with center O; tangents PA and PB from external point P perpendicular to each other; A top, B bottom.')

        q(L1, MCQ,
          'In the given figure, AT is tangent to a circle centered at O. If ∠CAT = 40° then ∠CBA is equal to [BOARD 2024]',
          ['70°', '50°', '65°', '40°'],
          '40°',
          hint='Apply the Alternate Segment Theorem: angle between tangent and chord = inscribed angle in alternate segment.',
          explanation='By Alternate Segment Theorem, ∠CBA (inscribed angle for chord CA in alternate segment) = ∠CAT = 40°.',
          concept='Alternate Segment Theorem',
          img='mcq_q3.png', img_desc='Circle with center O; tangent AT at A going right; B at top, C on circle near A; ∠CAT = 40° marked.')

        q(L1, MCQ,
          'In the given figure, PT is tangent to a circle with centre O. Chord PQ subtends an angle of 65° at the centre. The measure of ∠QPT is [BOARD 2023 & BOARD 2024]',
          ['65°', '57.5°', '67.5°', '32.5°'],
          '32.5°',
          hint='OT ⊥ PT (tangent-radius). In isosceles △OPQ, find ∠OPQ, then ∠QPT = 90° − ∠OPQ.',
          explanation='∠OPQ = ∠OQP = (180° − 65°)/2 = 57.5°. ∠QPT = ∠OPT − ∠OPQ = 90° − 57.5° = 32.5°.',
          concept='Tangent-Chord Angle',
          img='mcq_q4.png', img_desc='Circle with center O; tangent PT from P; chord PQ with ∠POQ = 65° at center; T is tangent direction arrow.')

        q(L1, MCQ,
          'The maximum number of common tangents that can be drawn to two circles intersecting at two distinct points is [BOARD 2024]',
          ['4', '3', '2', '1'],
          '2',
          hint='Two intersecting circles share 2 common tangents (both external). Internal tangents cannot be drawn at intersection points.',
          explanation='When two circles intersect at two distinct points, only 2 external common tangents exist. Internal tangents do not exist in this case.',
          concept='Common Tangents to Two Circles')

        q(L1, MCQ,
          'In the given figure, if PT is a tangent to a circle with centre O and ∠TPO = 35° then the measure of ∠x is [BOARD 2024]',
          ['110°', '115°', '120°', '125°'],
          '125°',
          hint='OT ⊥ PT. In △OTP: ∠TOP = 90° − 35° = 55°. x is the supplementary angle at O.',
          explanation='∠OTP = 90°, ∠TPO = 35°, so ∠TOP = 55°. The angle x = 180° − 55° = 125° (angles on a straight line at O).',
          concept='Tangent-Radius Angle',
          img='mcq_q6.png', img_desc='Circle with center O; tangent PT from external point P; ∠TPO = 35° at P; x marked inside circle at O.')

        q(L1, MCQ,
          'In the given figure, PT is a tangent at T to the circle with centre O. If ∠TPO = 25° then x is [BOARD 2023]',
          ['25°', '65°', '90°', '115°'],
          '115°',
          hint='∠OTP = 90°. In △OTP: ∠TOP = 65°. x is the angle on the opposite side of OP at O.',
          explanation='∠OTP = 90°, ∠TPO = 25°, so ∠TOP = 65°. x = 180° − 65° = 115°.',
          concept='Tangent-Radius Angle',
          img='mcq_q7.png', img_desc='Circle with center O; tangent PT from P with ∠TPO = 25°; x marked inside circle on the far side of O from T.')

        q(L1, MCQ,
          'In the given figure, PA is a tangent from an external point P to a circle with centre O. If ∠POB = 115° then ∠APO is',
          ['25°', '30°', '40°', '65°'],
          '25°',
          hint='OA ⊥ PA (tangent-radius). AB is a diameter so ∠AOP + ∠POB = 180°. Use right triangle OAP.',
          explanation='∠AOP = 180° − 115° = 65° (AB is diameter). In right △OAP: ∠APO = 90° − 65° = 25°.',
          concept='Tangent from External Point',
          img='mcq_q8.png', img_desc='Circle with center O; tangent PA from external point P; ∠POB = 115° at O; A top-left, B right, P bottom.')

        q(L1, MCQ,
          'In the given figure, AC and AB are tangents to a circle centered at O. If ∠COD = 120° then ∠BAO is [BOARD 2023]',
          ['30°', '60°', '45°', '90°'],
          '30°',
          hint='OB ⊥ AB, OC ⊥ AC. In quadrilateral ABOC: sum of angles = 360°. Use symmetry of two tangents.',
          explanation='∠OBA = ∠OCA = 90°. ∠BOC = 360° − 120° − 90° − 90° = 60°. By symmetry ∠BAO = ∠BOC/2 = 30°.',
          concept='Two Tangents from External Point',
          img='mcq_q9.png', img_desc='Circle with center O; tangents AB and AC from external point A; ∠COD = 120° at O; B top-right, D right, C bottom.')

        # ════════════════════════════════════════════════════════════════════
        # LESSON 2 — Tangent Properties: MCQs Part 2 (Q10–Q25)
        # ════════════════════════════════════════════════════════════════════
        L2 = lesson(2, 'Tangent Properties — MCQs II', 60,
            description='Advanced MCQs on tangent-chord angles, tangent lengths, inscribed figures and arc ratios.',
            objectives=[
                'Apply tangent-chord angle theorem to find unknown angles',
                'Use properties of tangent lengths from external points',
                'Solve problems on inscribed and circumscribed figures',
                'Apply arc-angle relationships',
            ])

        q(L2, MCQ,
          'In the given figure, PT is a tangent at a point C to the circle with centre O. If ∠ACP = 118° then ∠x is',
          ['28°', '32°', '42°', '38°'],
          '28°',
          hint='OC ⊥ PT (tangent-radius). ∠PCT = 180° − 118° = 62°. ∠OCP = 90° − 62° = 28°. △OAC isosceles.',
          explanation='∠PCT = 62°. ∠OCP = 90° − 62° = 28°. OA = OC (radii) → △OAC isosceles → ∠OAC = ∠OCA = 28°. So x = 28°.',
          concept='Tangent-Chord Angle',
          img='mcq_q10.png', img_desc='Circle with center O; tangent PT at C going upper-right; triangle ABC inscribed; x = ∠OAC at vertex A; ∠ACP = 118°.')

        q(L2, MCQ,
          'In the given figure, three circles with centres P, Q and R are drawn, such that the circles with centres Q and R touch each other externally and they touch the circle with centre P internally. If PQ = 10 cm, PR = 8 cm and QR = 12 cm then the diameter of the largest circle is',
          ['30 cm', '20 cm', '10 cm', '40 cm'],
          '30 cm',
          hint='Let radii be rP, rQ, rR. Internal tangency: PQ = rP − rQ, PR = rP − rR. External: QR = rQ + rR.',
          explanation='rP − rQ = 10, rP − rR = 8, rQ + rR = 12. Solving: rP = 15. Diameter = 30 cm.',
          concept='Circles Touching Each Other',
          img='mcq_q11.png', img_desc='Large circle with centre P containing two smaller circles with centres Q and R; Q and R touch each other externally and touch P internally.')

        q(L2, MCQ,
          'In the given figure, O is the centre of the circle. MN is the chord and the tangent ML at point M makes an angle of 70° with MN. The measure of ∠MON is [BOARD 2024]',
          ['120°', '140°', '70°', '90°'],
          '140°',
          hint='OM ⊥ ML (tangent-radius). ∠OMN = 90° − 70° = 20°. △OMN isosceles (OM = ON). Use angle sum.',
          explanation='∠OML = 90°, ∠NML = 70°, so ∠OMN = 20°. OM = ON → ∠ONM = 20°. ∠MON = 180° − 20° − 20° = 140°.',
          concept='Tangent-Chord and Central Angle',
          img='mcq_q12.png', img_desc='Circle with center O; chord MN; tangent ML at M making 70° with MN; L below M.')

        q(L2, MCQ,
          'If an arc subtends an angle of 90° at the centre of a circle, then the ratio of its length to the circumference of the circle is [BOARD 2024]',
          ['2:3', '1:4', '4:1', '1:3'],
          '1:4',
          hint='Arc length / Circumference = central angle / 360°.',
          explanation='90°/360° = 1/4. Ratio = 1:4.',
          concept='Arc Length Ratio')

        q(L2, MCQ,
          'In the given figure, O is the centre of the circle and PQ is the chord. If the tangent PR at P makes an angle of 50° with PQ, then the ∠POQ is [BOARD 2023]',
          ['50°', '40°', '100°', '130°'],
          '100°',
          hint='Tangent-chord angle = half the arc. ∠RPQ = 50° → arc PQ = 100° → ∠POQ = 100°.',
          explanation='By tangent-chord theorem: ∠RPQ = ½ arc PQ → arc PQ = 100°. Central angle ∠POQ = 100°.',
          concept='Tangent-Chord Angle and Central Angle',
          img='mcq_q14a.png', img_desc='Circle with center O; chord PQ; tangent PR at P making 50° with PQ; R to the left of P on tangent line.')

        q(L2, MCQ,
          'In the given figure, AB and AC are tangents to the circle. If ∠ABC = 42° then the measure of ∠BAC is [BOARD 2024]',
          ['96°', '42°', '106°', '86°'],
          '96°',
          hint='AB = AC (equal tangent lengths) → △ABC isosceles → ∠ABC = ∠ACB = 42°.',
          explanation='∠BAC = 180° − 42° − 42° = 96°.',
          concept='Tangents from External Point — Isosceles Triangle',
          img='mcq_q15.png', img_desc='Circle with tangents AB and AC from external point A; B at upper right, C at lower right; ∠ABC = 42° marked.')

        q(L2, MCQ,
          'In the given figure, QR is the common tangent to the two given circles touching externally at A. The tangent at A meets QR at P. If AP = 4.2 cm then the length of QR is [BOARD 2024]',
          ['4.2 cm', '2.1 cm', '8.4 cm', '6.3 cm'],
          '8.4 cm',
          hint='PQ = PA and PR = PA (tangent lengths from P to each circle).',
          explanation='PQ = PA = 4.2 cm and PR = PA = 4.2 cm. QR = PQ + PR = 8.4 cm.',
          concept='Common External Tangent',
          img='mcq_q16.png', img_desc='Two circles touching externally at A; common tangent QR at bottom; tangent at A meets QR at P; Q left, P center, R right.')

        q(L2, MCQ,
          'The area of the square inscribed in a circle of radius 5√2 cm is [BOARD 2024]',
          ['50 cm²', '100 cm²', '25 cm²', '200 cm²'],
          '100 cm²',
          hint='Diagonal of square = diameter = 2 × 5√2 = 10√2 cm. Side = diagonal/√2.',
          explanation='Side = 10√2/√2 = 10 cm. Area = 10² = 100 cm².',
          concept='Square Inscribed in Circle')

        q(L2, MCQ,
          'A chord of a circle of radius 10 cm subtends a right angle at its centre. The length of the chord (in cm) is [BOARD 2024]',
          ['5√2', '10√2', '5/√2', '5'],
          '10√2',
          hint='Use chord formula: chord = 2r sin(θ/2) where θ = 90°.',
          explanation='chord = 2 × 10 × sin(45°) = 20 × (1/√2) = 10√2 cm.',
          concept='Chord Length and Central Angle',
          img='mcq_q18.png', img_desc='Circle with center O and radius 10 cm; chord AB subtending 90° at center; right angle marked at O between OA and OB.')

        q(L2, MCQ,
          'In the given figure, AB = BC = 10 cm. If AC = 7 cm, then the length of BP is [BOARD 2023]',
          ['3.5 cm', '7 cm', '6.5 cm', '5 cm'],
          '6.5 cm',
          hint='Let BP = BQ = x, AP = AR = y, CR = CQ = z. Set up equations using tangent lengths.',
          explanation='x + y = 10, x + z = 10 → y = z. y + z = 7 → y = 3.5. BP = x = 10 − 3.5 = 6.5 cm.',
          concept='Tangent Lengths — Incircle of Triangle',
          img='mcq_q19.png', img_desc='Triangle ABC circumscribing a circle; tangent points P on BC, Q on AB, R on AC; AB = BC = 10 cm, AC = 7 cm.')

        q(L2, MCQ,
          'In the given figure, the quadrilateral PQRS circumscribes a circle. Here PA + CS is equal to [BOARD 2023]',
          ['QR', 'PR', 'PS', 'PQ'],
          'PS',
          hint='Use tangent length property: from each vertex, both tangent lengths are equal.',
          explanation='PA = PD, QA = QB, RC = RB, SC = SD. PA + CS = PD + SD = PS.',
          concept='Tangent Lengths — Circumscribed Quadrilateral',
          img='mcq_q20.png', img_desc='Quadrilateral PQRS circumscribing a circle; tangent points A on PS, B on QR, C on RS, D on PQ labeled.')

        q(L2, MCQ,
          'In the given figure, PQ is a tangent to the circle with centre O. If ∠OPQ = x, ∠POQ = y then x + y is [BOARD 2023]',
          ['45°', '90°', '60°', '180°'],
          '90°',
          hint='OQ ⊥ PQ (radius to tangent point Q). In △OPQ: ∠OQP = 90°.',
          explanation='∠OQP = 90° (tangent-radius). ∠OPQ + ∠POQ + 90° = 180°. So x + y = 90°.',
          concept='Tangent-Radius Right Angle',
          img='mcq_q21.png', img_desc='Circle with center O; tangent PQ from P; Q on circle at top; x = ∠OPQ at P, y = ∠POQ at O.')

        q(L2, MCQ,
          'The length of tangent drawn to a circle of radius 9 cm from a point 41 cm from the centre is [BOARD 2023]',
          ['40 cm', '9 cm', '41 cm', '50 cm'],
          '40 cm',
          hint='Tangent length = √(d² − r²) where d = distance from point to centre.',
          explanation='Tangent = √(41² − 9²) = √(1681 − 81) = √1600 = 40 cm.',
          concept='Tangent Length Formula')

        q(L2, MCQ,
          'In the given figure, TA is a tangent to the circle with centre O such that OT = 4 cm, ∠OTA = 30° then length of TA is [BOARD 2023]',
          ['2√3 cm', '2 cm', '2√2 cm', '√3 cm'],
          '2√3 cm',
          hint='OA ⊥ TA (tangent-radius). cos(30°) = TA/OT.',
          explanation='TA = OT × cos(30°) = 4 × (√3/2) = 2√3 cm.',
          concept='Tangent Length using Trigonometry',
          img='mcq_q23.png', img_desc='Circle with center O; tangent TA from T; OT = 4 cm, ∠OTA = 30° at T; A at bottom right.')

        q(L2, MCQ,
          'In the given figure, PA and PB are tangents from an external point P to circle with centre C and Q is any point on the circle. Then the measure of ∠AQB is [BOARD 2023]',
          ['62.5°', '125°', '55°', '90°'],
          '62.5°',
          hint='∠ACB = 180° − ∠APB. ∠AQB = ∠ACB/2 (inscribed angle in major arc).',
          explanation='∠ACB = 180° − 55° = 125°. ∠AQB = 125°/2 = 62.5° (Q on major arc).',
          concept='Tangents from External Point and Inscribed Angle',
          img='mcq_q24.png', img_desc='Circle with centre C; tangents PA and PB from external P; ∠APB = 55°; Q on major arc AB; ∠AQB to find.')

        q(L2, MCQ,
          'In the given figure, if ∠AOB = 125° then ∠COD is equal to',
          ['62.5°', '45°', '35°', '55°'],
          '55°',
          hint='In quadrilateral ABCD circumscribing a circle: ∠AOB + ∠COD = 180°.',
          explanation='∠COD = 180° − ∠AOB = 180° − 125° = 55°.',
          concept='Opposite Central Angles in Circumscribed Quadrilateral',
          img='mcq_q25.png', img_desc='Quadrilateral ABCD with all sides tangent to circle centered at O; diagonals AC and BD shown; ∠AOB = 125° at O.')

        # ════════════════════════════════════════════════════════════════════
        # LESSON 3 — Assertion-Reason MCQs (Q26–Q28)
        # ════════════════════════════════════════════════════════════════════
        L3 = lesson(3, 'Assertion-Reason Questions', 30,
            description='Assertion-Reason format MCQs on fundamental circle theorems.',
            objectives=['Evaluate the truth of assertions and reasons independently',
                        'Determine whether the reason correctly explains the assertion'])

        AR_OPTS = [
            'Both A and R are true and R is the correct explanation of A',
            'Both A and R are true but R is NOT the correct explanation of A',
            'A is true but R is false',
            'A is false but R is true',
        ]

        q(L3, AR,
          'Assertion (A): The tangents drawn at the end points of a diameter of a circle, are parallel.\nReason (R): Diameter of a circle is the longest chord. [BOARD 2024]',
          AR_OPTS,
          'Both A and R are true but R is NOT the correct explanation of A',
          hint='A: tangent ⊥ radius at each end → both tangents ⊥ same line → parallel. R: true but irrelevant to parallelism.',
          explanation='A is true (each tangent ⊥ diameter, so they are parallel). R is true (diameter is longest chord). But R does not explain A.',
          concept='Assertion-Reason — Parallel Tangents')

        q(L3, AR,
          'Assertion (A): A tangent to a circle is perpendicular to the radius through the point of contact.\nReason (R): The length of the tangents drawn from an external point to a circle are equal. [BOARD 2023]',
          AR_OPTS,
          'Both A and R are true but R is NOT the correct explanation of A',
          hint='Both A and R state different (independent) true theorems about tangents.',
          explanation='A is true (tangent ⊥ radius). R is true (equal tangent lengths). Neither explains the other.',
          concept='Assertion-Reason — Tangent Properties')

        q(L3, AR,
          'Assertion (A): If PA and PB are tangents drawn from an external point P to a circle with centre O, then the quadrilateral AOBP is cyclic.\nReason (R): The angle between two tangents drawn from an external point to a circle is supplementary to the angle subtended by the line segment joining the points of contact at the centre. [BOARD 2023]',
          AR_OPTS,
          'Both A and R are true and R is the correct explanation of A',
          hint='∠OAP = ∠OBP = 90°, so ∠AOB + ∠APB = 180° (opposite angles supplement) → AOBP is cyclic.',
          explanation='∠OAP = ∠OBP = 90°. ∠AOB + ∠APB = 180° (by R). Opposite angles sum to 180° → AOBP is cyclic. R explains A.',
          concept='Assertion-Reason — Cyclic Quadrilateral from Tangents')

        # ════════════════════════════════════════════════════════════════════
        # LESSON 4 — 2-Mark Problems
        # ════════════════════════════════════════════════════════════════════
        L4 = lesson(4, '2-Mark Problems', 60,
            description='Short-answer problems on tangent-chord angles, tangent lengths and circle properties.',
            objectives=['Find unknown angles using tangent-chord relationships',
                        'Calculate tangent lengths and related measurements',
                        'Apply inscribed angle and tangent properties numerically'])

        q(L4, SHORT,
          'In the given figure, AB and CD are tangents to a circle centered at O. Is ∠BAC = ∠DCA? Justify your answer. [BOARD 2024]',
          {},
          'Yes, ∠BAC = ∠DCA',
          hint='Both are tangent-chord angles for the same chord AC from the same circle.',
          explanation='By Alternate Segment Theorem: ∠BAC = ½ arc AC (from tangent AB, chord AC) and ∠DCA = ½ arc AC (from tangent CD, chord CA). So ∠BAC = ∠DCA.',
          concept='Alternate Segment Theorem',
          img='2m_q1.png', img_desc='Circle with center O; tangents AB at A (going upper-left) and CD at C (going upper-right); chord AC at bottom.')

        q(L4, SHORT,
          'In the given figure, a circle centered at O has radius 7 cm. OC is median of △OAB. Find the length of median OC. [BOARD 2024]',
          {},
          'OC = 7√2/2 cm',
          hint='From the figure, ∠AOB = 90°. AB² = OA² + OB² = 98. Use median length formula.',
          explanation='OA = OB = 7 cm, ∠AOB = 90° → AB = 7√2. OC (median) = √((2×49+2×49−98)/4) = √(98/4) = 7√2/2 ≈ 4.95 cm.',
          concept='Median Length in Isosceles Right Triangle',
          img='2m_q2.png', img_desc='Circle with center O on coordinate axes; A at bottom on Y\', B on X-axis; C inside circle between O and B; OC is median of △OAB.')

        q(L4, SHORT,
          'From an external point P, two tangents PA and PB are drawn to the circle with centre O. Prove that OP is the perpendicular bisector of chord AB. [BOARD 2024]',
          {},
          'Proved using congruent triangles',
          hint='Show △OPA ≅ △OPB, then deduce the midpoint and perpendicularity.',
          explanation='OA = OB (radii), PA = PB (tangents), OP common → △OPA ≅ △OPB (SSS). So ∠OMA = ∠OMB = 90° and AM = BM where M = OP ∩ AB → OP ⊥ bisects AB.',
          concept='OP as Perpendicular Bisector')

        q(L4, SHORT,
          'In the given figure, O is the centre of the circle. If ∠AOB = 145° then find the value of x. [BOARD 2024]',
          {},
          'x = 72.5°',
          hint='C is on the major arc. Inscribed angle = ½ × central angle for same arc.',
          explanation='∠ACB = ½ × ∠AOB = ½ × 145° = 72.5°. So x = 72.5°.',
          concept='Inscribed Angle Theorem',
          img='2m_q4.png', img_desc='Circle with center O; A at left, B at right on circle; C at bottom with x = ∠ACB; ∠AOB = 145° at center.')

        q(L4, SHORT,
          'In the given figure, AB is the diameter of a circle with centre O and AT is a tangent. If ∠AOQ = 58° then find ∠ATQ.',
          {},
          '∠ATQ = 61°',
          hint='OA ⊥ AT. △OAQ isosceles (OA=OQ). Find ∠QAT then use right triangle AQT.',
          explanation='∠OAQ = (180°−58°)/2 = 61°. ∠QAT = 90°−61° = 29°. ∠ATQ = 90°−29° = 61° (right angle at A in △ATQ).',
          concept='Tangent and Inscribed Angle',
          img='2m_q5.png', img_desc='Circle with diameter AB horizontal; center O; Q on circle upper-right; tangent AT from A going right; ∠AOQ = 58° at O.')

        q(L4, SHORT,
          'In the given figure, PQ is a chord of the circle centered at O. PT is a tangent to a circle at P. If ∠QPT = 55° then find ∠PRQ. [BOARD 2023]',
          {},
          '∠PRQ = 55°',
          hint='Apply the Alternate Segment Theorem at point P.',
          explanation='By Alternate Segment Theorem: ∠PRQ = ∠QPT = 55°.',
          concept='Alternate Segment Theorem',
          img='2m_q6.png', img_desc='Circle with center O; tangent PT at P going right; chord PQ; R on major arc; ∠QPT = 55°.')

        q(L4, SHORT,
          'In the given figure, O is the centre of the circle. PT and PQ are tangents to the circle from an external point P. If ∠TPQ = 70° find ∠TRQ.',
          {},
          '∠TRQ = 125°',
          hint='∠TOQ = 360°−90°−90°−70° = 110°. ∠TRQ = ½ × reflex ∠TOQ.',
          explanation='In quadrilateral OTPQ: ∠TOQ = 360°−90°−90°−70° = 110°. ∠TRQ = ½×(360°−110°) = 125°.',
          concept='Tangents from External Point and Inscribed Angle',
          img='2m_q7.png', img_desc='Circle with center O; tangents PT and PQ from P; R on major arc TQ; ∠TPQ = 70° at P.')

        q(L4, SHORT,
          'In the given figure, △ABC is circumscribing a circle. Find the length of BC, if AR = 4 cm, BR = 3 cm and AC = 11 cm. [BOARD 2024]',
          {},
          'BC = 10 cm',
          hint='Use tangent lengths from each vertex: AP = AR, BP = BR, CQ = CP.',
          explanation='AP = AR = 4, BR = BP = 3, CP = AC − AP = 11 − 4 = 7. BC = BP + CP = 3 + 7 = 10 cm.',
          concept='Tangent Lengths — Incircle of Triangle',
          img='2m_q8.png', img_desc='△ABC circumscribing circle; tangent points R on AB, P on BC, Q on AC; AR = 4 cm, BR = 3 cm, AQ = 11 cm labeled.')

        q(L4, SHORT,
          'If two tangents inclined at an angle of 60° are drawn to a circle of radius 3 cm, then find the length of each tangent. [BOARD 2024]',
          {},
          '3√3 cm',
          hint='Half angle = 30°. tan(30°) = radius / tangent length.',
          explanation='In right △OTP: ∠OPT = 30°. tan(30°) = OT/TP → TP = r/tan(30°) = 3/(1/√3) = 3√3 cm.',
          concept='Tangent Length using Trigonometry')

        # ════════════════════════════════════════════════════════════════════
        # LESSON 5 — 2-Mark Proofs
        # ════════════════════════════════════════════════════════════════════
        L5 = lesson(5, '2-Mark Proofs', 60,
            description='Standard proofs on tangent properties, parallel tangents and equal tangent lengths.',
            objectives=['Prove tangents at ends of diameter are parallel',
                        'Prove AB = CD for common tangents of two circles',
                        'Prove AB + CD = BC + AD for circumscribed quadrilateral'])

        q(L5, SHORT,
          'Prove that the tangents drawn at the ends of a diameter of a circle are parallel. [BOARD 2023 & BOARD 2024]',
          {},
          'Proved using perpendicularity',
          hint='Each tangent is perpendicular to the radius (diameter) at the point of contact.',
          explanation='Let AB be diameter. Tangent at A ⊥ AB and tangent at B ⊥ AB (both perpendicular to the same line AB). Two lines both perpendicular to the same line are parallel.',
          concept='Parallel Tangents at Diameter Ends')

        q(L5, SHORT,
          'In the given figure, O is the centre of the circle. AB and AC are tangents drawn to the circle from point A. If ∠BAC = 65°, then find the measure of ∠BOC. [BOARD 2023]',
          {},
          '∠BOC = 115°',
          hint='In quadrilateral ABOC: ∠OBA = ∠OCA = 90°. Use angle sum property.',
          explanation='∠OBA = ∠OCA = 90°. Sum of angles in quadrilateral ABOC = 360°. ∠BOC = 360° − 90° − 90° − 65° = 115°.',
          concept='Angle in Circumscribed Quadrilateral',
          img='2m_q11.png', img_desc='Circle with center O; tangents AB and AC from external point A; ∠BAC = 65°; B and C on circle.')

        q(L5, SHORT,
          'In the given figure, PT is a tangent to the circle centered at O. OC is the perpendicular to chord AB. Prove that PA.PB = PC² − AC². [BOARD 2023]',
          {},
          'Proved using Pythagoras theorem',
          hint='Use the power of point P and the relation OC ⊥ AB → AC = CB.',
          explanation='OC ⊥ AB → AC = CB. PA.PB = (PC−AC)(PC+AC) = PC²−AC² (using power of external point and chord midpoint).',
          concept='Power of a Point',
          img='2m_q12.png', img_desc='Circle with center O; tangent PT from P upper-left; chord AB with C as midpoint (OC ⊥ AB); B at left, A at bottom-right, P at right.')

        q(L5, SHORT,
          'In the given figure, PA is a tangent to the circle drawn from the external point P and PBC is the secant to the circle with BC as diameter. If ∠AOC = 130° then find ∠APB. [BOARD 2023]',
          {},
          '∠APB = 40°',
          hint='Arc AC = 130°. Arc AB = 360° − 130° − 180° = 50°. Use tangent-secant angle.',
          explanation='∠APB = ½|arc AC − arc AB| = ½|130° − 50°| = 40°.',
          concept='Tangent-Secant Angle',
          img='2m_q13.png', img_desc='Circle with center O; tangent PA from P; secant PBC where BC is diameter; ∠AOC = 130° at O; P at left, B at bottom, C at right.')

        q(L5, SHORT,
          'In the given figure, from a point P, two tangents PT and PS are drawn to a circle with centre O such that ∠SPT = 120°, prove that OP = 2 PS.',
          {},
          'Proved using right triangle',
          hint='By symmetry ∠OPT = ∠OPS = 60°. In right △OTP: cos(60°) = PT/OP.',
          explanation='∠SPT = 120° → ∠OPS = 60°. OT ⊥ PT → in right △OTP: cos(60°) = PT/OP → OP = 2PT = 2PS.',
          concept='Tangent Length and External Point',
          img='2m_q14.png', img_desc='Circle with center O; tangents PT and PS from P; ∠SPT = 120°; T at top, S at bottom, P at far left.')

        q(L5, SHORT,
          'In the given figure, two tangents RQ and RP are drawn from an external point R to the circle with centre O. If ∠PRQ = 120° then prove that OR = PR + RQ.',
          {},
          'Proved using right triangle',
          hint='By symmetry ∠ORP = 60°. In right △OPR: cos(60°) = PR/OR → PR = OR/2.',
          explanation='∠ORP = 60°. ∠OPR = 90°. PR = OR cos(60°) = OR/2. RQ = PR. PR + RQ = 2PR = OR.',
          concept='Tangent Length Relation',
          img='2m_q15.png', img_desc='Circle with center O; tangents RQ and RP from external R; ∠PRQ = 120°; P at top, Q at bottom, R at far right.')

        q(L5, SHORT,
          'In the given figure, common tangents AB and CD to the two circles with centres O₁ and O₂ intersect at E. Prove that AB = CD.',
          {},
          'Proved using equal tangent lengths',
          hint='Use equal tangent lengths from E to each circle: EA = EC and EB = ED.',
          explanation='EA = EC (tangent from E to circle O₁). EB = ED (tangent from E to circle O₂). AB = EA + EB = EC + ED = CD.',
          concept='Common Tangents to Two Circles',
          img='2m_q16.png', img_desc='Two circles with centers O₁ and O₂; common tangents AB and CD crossing at E; A and C on left circle, B and D on right circle.')

        q(L5, SHORT,
          'If a quadrilateral circumscribing a circle with centre O then prove that AB + CD = BC + AD.',
          {},
          'Proved using tangent lengths from each vertex',
          hint='Let tangent lengths from A, B, C, D be p, q, r, s respectively.',
          explanation='AP = AS = p, BP = BQ = q, CQ = CR = r, DS = DR = s. AB+CD = (p+q)+(r+s). BC+AD = (q+r)+(p+s) = same. Proved.',
          concept='Circumscribed Quadrilateral Property',
          img='2m_q17.png', img_desc='Quadrilateral ABCD circumscribing circle O; tangent points P on AB, Q on BC, R on CD, S on DA.')

        # ════════════════════════════════════════════════════════════════════
        # LESSON 6 — 3-Mark Problems & Proofs
        # ════════════════════════════════════════════════════════════════════
        L6 = lesson(6, '3-Mark Problems & Proofs', 70,
            description='Multi-step problems and proofs on tangents, inscribed circles, concentric circles and chord properties.',
            objectives=['Prove ∠POQ = 90° for tangents to a semicircle',
                        'Find inscribed circle radius from given measurements',
                        'Prove parallelogram circumscribing a circle is a rhombus',
                        'Apply equal tangent lengths in complex figures'])

        q(L6, SHORT,
          'In the given figure, AB is a diameter of the circle with centre O. AQ, BP and PQ are tangents to the circle. Prove that ∠POQ = 90°. [BOARD 2024]',
          {},
          'Proved using angle sum',
          hint='Use equal tangent lengths from P and Q to the circle, then find angles in quadrilateral OAPQ.',
          explanation='QA = QO₁ (tangent from Q at A). PB = PO₁ (tangent from P at B). In △OPQ: using the tangent properties at semicircle endpoints, ∠POQ = 90°.',
          concept='Tangents to Semicircle',
          img='3m_q1.png', img_desc='Circle with diameter AB horizontal; center O; tangent AQ from A going upper-right; tangent BP from B going downward; PQ tangent line; ∠POQ to prove = 90°.')

        q(L6, SHORT,
          'A circle with centre O and radius 8 cm is inscribed in a quadrilateral ABCD in which P, Q, R, S are the points of contact as shown. If AD is perpendicular to DC, BC = 30 cm and BS = 24 cm then find the length DC. [BOARD 2024]',
          {},
          'DC = 14 cm',
          hint='BQ = BS = 24. CQ = BC − BQ = 6. Since ∠D = 90°, DS = DR = r = 8.',
          explanation='BQ = BS = 24. CQ = 30 − 24 = 6 = CR. ∠ADC = 90° → tangent lengths from D = r = 8 → DR = DS = 8. DC = DR + CR = 8 + 6 = 14 cm.',
          concept='Inscribed Circle in Quadrilateral',
          img='3m_q2.png', img_desc='Quadrilateral ABCD with inscribed circle O radius 8; AD ⊥ DC; contact points P on AB, Q on BC, R on CD, S on DA; right angle at D.')

        q(L6, SHORT,
          'In the given figure, PQ is tangent to a circle centered at O and ∠BAQ = 30°. Show that BP = BQ. [BOARD 2024]',
          {},
          'Proved: BP = BQ',
          hint='Alternate segment: ∠BQP = ∠BAQ = 30°. Show △BPQ is isosceles.',
          explanation='By Alternate Segment Theorem at Q: ∠BQP = ∠BAQ = 30°. In △BPQ: ∠BPQ = 180° − ∠BQP − ∠PBQ = ∠BQP (by the symmetry of equal arcs). So △BPQ is isosceles → BP = BQ.',
          concept='Alternate Segment Theorem — Isosceles Triangle',
          img='3m_q3.png', img_desc='Circle with center O; tangent PQ at Q; chord AB; ∠BAQ = 30° at A; B and Q on circle, P on tangent line, A on circle.')

        q(L6, SHORT,
          'In the given figure, AB, BC, CD and DA are tangents to the circle with centre O forming a quadrilateral ABCD. Show that ∠AOB + ∠COD = 180°. [BOARD 2024]',
          {},
          'Proved using angle bisectors',
          hint='OA bisects ∠DAB, OB bisects ∠ABC. Use angle sum in △AOB.',
          explanation='In △AOB: ∠AOB = 180° − ½(∠DAB + ∠ABC). Similarly ∠COD = 180° − ½(∠BCD + ∠CDA). Sum = 360° − ½×360° = 180°.',
          concept='Opposite Central Angles in Circumscribed Quadrilateral',
          img='3m_q4.png', img_desc='Quadrilateral ABCD circumscribing circle O; all four sides tangent; diagonals AC and BD drawn; O at center.')

        q(L6, SHORT,
          'Prove that the tangents drawn at the end points of a chord of a circle makes equal angles with the chord. [BOARD 2024]',
          {},
          'Proved using Alternate Segment Theorem',
          hint='Let AB be chord. Tangent at A and tangent at B. Use alternate segment theorem twice.',
          explanation='Let tangent at A meet chord AB at angle α. By Alternate Segment Theorem: α = inscribed angle subtended by AB on opposite arc. Similarly tangent at B makes same angle. Hence equal angles.',
          concept='Tangents at Chord Ends Make Equal Angles')

        q(L6, SHORT,
          'Prove that parallelogram circumscribing a circle is a rhombus. [BOARD 2024]',
          {},
          'Proved using tangent property',
          hint='AB + CD = BC + AD (tangent property). Use AB = CD and BC = AD (parallelogram).',
          explanation='For a parallelogram: AB = CD and BC = AD. By tangent property: AB + CD = BC + AD → 2AB = 2BC → AB = BC. All sides equal → rhombus.',
          concept='Parallelogram Circumscribing a Circle is Rhombus')

        q(L6, SHORT,
          'Two tangents TP and TQ are drawn to a circle with centre O from an external point T. Prove that ∠PTQ = 2∠OPQ. [BOARD 2023]',
          {},
          'Proved using isosceles triangle',
          hint='TP = TQ (tangents). Let ∠OPQ = θ. ∠OPT = 90°. Deduce ∠TPQ and ∠PTQ.',
          explanation='TP = TQ → △TPQ isosceles → ∠TPQ = ∠TQP. Let ∠OPQ = θ. ∠TPQ = 90° − θ. ∠PTQ = 180° − 2∠TPQ = 180° − 2(90°−θ) = 2θ = 2∠OPQ.',
          concept='Angle Between Two Tangents',
          img='3m_q7.png', img_desc='Circle with center O; tangents TP and TQ from external T; P at top, Q at bottom, T at right; ∠PTQ and ∠OPQ shown.')

        q(L6, SHORT,
          'In the given figure, a circle is inscribed in a quadrilateral ABCD in which ∠B = 90°. If AD = 17 cm, AB = 20 cm and DS = 3 cm then find the radius of the circle. [BOARD 2023]',
          {},
          'r = 6 cm',
          hint='DS = DR = 3 (tangents from D). AS = AD − DS = 14. AP = AS = 14. BP = AB − AP = 6. r = BP (right angle at B).',
          explanation='DS = DR = 3. AS = AP = 17 − 3 = 14. BP = BQ = 20 − 14 = 6. Since ∠B = 90° and circle inscribed: r = BP = 6 cm.',
          concept='Inscribed Circle Radius in Right-Angle Quadrilateral',
          img='3m_q8.png', img_desc='Quadrilateral ABCD with inscribed circle; ∠B = 90°; tangent points R on AD, S on CD, P on AB, Q on BC; r = radius marked.')

        q(L6, SHORT,
          'In the given figure, O is the centre of the circle and QPR is a tangent to it at P. Prove that ∠QAP + ∠APR = 90°. [BOARD 2023]',
          {},
          'Proved using tangent-radius and isosceles triangle',
          hint='OP ⊥ QPR. In isosceles △OAP (OA = OP): ∠OAP = ∠OPA. Use ∠OPA + ∠APR = 90°.',
          explanation='OP ⊥ PR → ∠OPR = 90°. OA = OP → ∠OAP = ∠OPA. ∠QAP = ∠OAP (given figure). ∠QAP + ∠APR = ∠OPA + ∠APR = ∠OPR = 90°.',
          concept='Tangent-Radius and Isosceles Triangle Proof',
          img='3m_q9.png', img_desc='Circle with center O; tangent QPR at P; A on circle with OA drawn; B on circle; Q-P-R tangent line at bottom.')

        q(L6, SHORT,
          'Prove that the angle between the two tangents drawn from an external point to a circle is supplementary to the angle subtended by the line segment joining the points of contact at the centre. [BOARD 2023]',
          {},
          'Proved using quadrilateral angle sum',
          hint='In quadrilateral OAPB: ∠OAP = ∠OBP = 90°. Use sum of angles = 360°.',
          explanation='∠OAP = ∠OBP = 90°. In quadrilateral OAPB: ∠AOB + ∠APB = 360° − 90° − 90° = 180°. Hence supplementary.',
          concept='Angle Between Tangents is Supplementary to Centre Angle')

        q(L6, SHORT,
          'Two concentric circles are of radii 5 cm and 3 cm. Find the length of the chord of the larger circle which touches the smaller circle. [BOARD 2023]',
          {},
          '8 cm',
          hint='Chord of larger circle is tangent to smaller. Distance from centre to chord = 3. Use Pythagoras.',
          explanation='Let M be midpoint of chord AB. OM = 3 (tangent to inner circle). OA = 5. AM = √(25−9) = 4. AB = 8 cm.',
          concept='Chord Tangent to Inner Concentric Circle')

        q(L6, SHORT,
          'In the given figure, two circles touch each other at the point C. Prove that the common tangent to the circles at C, bisects the common tangent at P and Q.',
          {},
          'Proved using equal tangent lengths',
          hint='Let T be point on common tangent PQ. Use equal tangent lengths from T to each circle.',
          explanation='Let T be on PQ. TP = TC (tangent from T to left circle). TQ = TC (tangent from T to right circle). So TP = TQ → T is midpoint of PQ.',
          concept='Common Tangent at Point of Tangency',
          img='3m_q12.png', img_desc='Two circles touching at C; common external tangent PQ; tangent at C meeting PQ at T; P on left, T at center, Q on right.')

        q(L6, SHORT,
          'In the given figure, PA and PB are tangents to a circle from an external point P such that PA = 4 cm and ∠BAC = 135°. Find the length of the chord AB.',
          {},
          'AB = 4√2 cm',
          hint='∠APB = 180° − 2×(180°−135°) = 90°. PA = PB = 4 cm. Use Pythagoras in right isosceles △APB.',
          explanation='∠BAC = 135° → arc BC (minor) = 90°. ∠APB = 90°. PA = PB = 4. AB = √(4²+4²) = 4√2 cm.',
          concept='Tangent Lengths and Chord',
          img='3m_q13.png', img_desc='Circle with external point P at top; tangents PA and PB, PA = 4 cm; chord AB; ∠BAC = 135° at A; C at bottom on circle.')

        # ════════════════════════════════════════════════════════════════════
        # LESSON 7 — 5-Mark Problems & Proofs
        # ════════════════════════════════════════════════════════════════════
        L7 = lesson(7, '5-Mark Problems & Proofs', 100,
            description='Complex proofs and problems requiring multi-step reasoning on tangents, inscribed circles and chord properties.',
            objectives=['Find side lengths of triangle circumscribing circle',
                        'Find length of common chord of two intersecting circles',
                        'Prove AQ = ½ perimeter for excircle tangent',
                        'Apply tangent properties to find tangent/chord lengths'])

        q(L7, LONG,
          'A triangle ABC is drawn to circumscribe a circle of radius 4 cm such that the segments BD and DC are of lengths 10 cm and 8 cm respectively. Find the lengths of the sides AB and AC, if it is given that area △ABC = 90 cm². [BOARD 2023]',
          {},
          'AB = 14.5 cm, AC = 12.5 cm',
          hint='Let AE = AF = x. Use Area = r × s where s = semiperimeter.',
          explanation='BD = BE = 10, DC = CF = 8. AE = AF = x. s = x+18. Area = r·s = 4(x+18) = 90 → x = 4.5. AB = 14.5 cm, AC = 12.5 cm.',
          concept='Triangle Circumscribing Circle — Side Lengths',
          img='5m_q1.png', img_desc='△ABC with inscribed circle O radius 4 cm; D on BC; BD = 10 cm, DC = 8 cm; A at apex.')

        q(L7, LONG,
          'Two circles with centres O and O\' of radii 6 cm and 8 cm respectively intersect at two points P and Q such that OP and O\'P are tangents to the two circles. Find the length of the common chord PQ. [BOARD 2023]',
          {},
          'PQ = 9.6 cm',
          hint='OP tangent to circle O\' → OP ⊥ O\'P. OO\' = √(6²+8²) = 10. Altitude from P to OO\' = 4.8.',
          explanation='∠OPO\' = 90°. OO\' = √(36+64) = 10. Altitude from P = (6×8)/10 = 4.8. PQ = 2×4.8 = 9.6 cm.',
          concept='Common Chord of Two Circles',
          img='5m_q2.png', img_desc='Two intersecting circles with centers O and O\'; common chord PQ; P at top, Q at bottom; A = intersection of OO\' and PQ.')

        q(L7, LONG,
          'Two tangents TP and TQ are drawn to a circle with centre O from an external point T. Prove that ∠PTQ = 2∠OPQ. [BOARD 2023]',
          {},
          'Proved',
          hint='TP = TQ → △TPQ isosceles. OT bisects ∠PTQ. Let ∠OPQ = θ, ∠OPT = 90°.',
          explanation='TP = TQ → ∠TPQ = ∠TQP. Let ∠OPQ = θ. ∠TPQ = 90° − θ. ∠PTQ = 180°−2(90°−θ) = 2θ = 2∠OPQ.',
          concept='Angle Between Two Tangents',
          img='5m_q3.png', img_desc='Circle with center O; tangents TP and TQ from T; P at top, Q at bottom, T at left; ∠PTQ and ∠OPQ to prove.')

        q(L7, LONG,
          'A circle touches the side BC of △ABC at a point P and touches AB and AC when produced at Q and R respectively. Show that AQ = ½ (Perimeter of △ABC). [BOARD 2023]',
          {},
          'Proved',
          hint='Use equal tangent lengths: AQ = AB + BQ = AB + BP. AR = AC + CP. AQ = AR.',
          explanation='AQ = AR, BQ = BP, CR = CP. 2AQ = AQ + AR = AB+BQ + AC+CP = AB+BP + AC+CP = AB+BC+CA = perimeter. So AQ = ½ perimeter.',
          concept='Excircle Tangent Length',
          img='5m_q4.png', img_desc='△ABC with excircle touching BC at P; AB extended to Q, AC extended to R; A at apex, B and C at base.')

        q(L7, LONG,
          'Prove that parallelogram circumscribing a circle is a rhombus. [BOARD 2023]',
          {},
          'Proved',
          hint='AB + CD = BC + AD (tangent property). Use AB = CD, BC = AD for parallelogram.',
          explanation='Parallelogram: AB = CD, BC = AD. Tangent property: AB + CD = BC + AD → 2AB = 2BC → AB = BC. All sides equal → rhombus.',
          concept='Parallelogram Circumscribing Circle is Rhombus')

        q(L7, LONG,
          'Prove that rectangle circumscribing a circle is a square.',
          {},
          'Proved',
          hint='Use tangent property AB + CD = BC + AD with rectangle conditions AB = CD, BC = AD.',
          explanation='Rectangle: AB = CD, BC = AD, all angles = 90°. AB + CD = BC + AD → 2AB = 2BC → AB = BC. All sides equal and right angles → square.',
          concept='Rectangle Circumscribing Circle is Square')

        q(L7, LONG,
          'In the given figure, tangents PQ and PR are drawn to a circle such that ∠RPQ = 30°. A chord RS is drawn parallel to the tangent PQ. Find the ∠RQS. [BOARD 2023]',
          {},
          '∠RQS = 30°',
          hint='∠PRQ = ∠PQR = 75°. RS ∥ PQ → use alternate segment theorem at R.',
          explanation='∠PQR = ∠PRQ = 75°. Tangent at R: ∠PRS = 30° (alternate interior, RS ∥ PQ). By Alternate Segment: ∠RQS = ∠PRS = 30°.',
          concept='Tangent-Chord Angle with Parallel Chord',
          img='5m_q7.png', img_desc='Circle with center O; tangents PQ and PR from P; chord RS parallel to PQ; ∠RPQ = 30° at P; S at top-left, R at top-right.')

        q(L7, LONG,
          'In the given figure, PQ is a chord of length 8 cm of circle of radius 5 cm with centre O. The tangents at P and Q intersect at a point T. Find the length of TP.',
          {},
          'TP = 20/3 cm',
          hint='OM ⊥ PQ (M midpoint). OM = 3, PM = 4. In △TPM use TP² = OT² − OP² and TM = OT − OM.',
          explanation='OM = √(25−16) = 3. Let TP = t. OT² = 25+t². TM = √(25+t²) − 3. TM² + 16 = t² → (OT−3)² + 16 = OT²−25 → OT = 25/3. TP = 20/3 cm.',
          concept='Tangent Length from External Point',
          img='5m_q8.png', img_desc='Circle with center O; chord PQ = 8 cm, radius = 5 cm; tangents at P and Q meeting at T; P at top, Q at bottom, T at left; radii 5 and half-chord 8 labeled.')

        q(L7, LONG,
          'PB is a tangent to the circle with centre O to B. AB is a chord of length 24 cm at a distance of 5 cm from the centre. If the tangent is length 20 cm, then find the length of PO.',
          {},
          'PO = √569 cm',
          hint='Half-chord = 12 cm, distance from centre = 5 cm → radius = 13 cm. ∠OBP = 90°.',
          explanation='Radius OB = √(12²+5²) = 13 cm. ∠OBP = 90° (radius ⊥ tangent). PO² = OB² + PB² = 169 + 400 = 569. PO = √569 cm.',
          concept='Tangent and Chord Relationship',
          img='5m_q9.png', img_desc='Circle with center O; tangent PB from P; chord AB horizontal with midpoint M on OA; PB = 20 cm labeled; P at right.')

        q(L7, LONG,
          'In the given figure, O is the centre of a circle of radius 5 cm. T is a point such that OT = 13 cm and OT intersects circle at E. If AB is a tangent to the circle at E, find the length of AB, where TP and TQ are two tangents to the circle.',
          {},
          'AB = 20/3 cm',
          hint='TE = OT − OE = 8 cm. TP = √(OT²−r²) = 12. At point A on tangent AB: AE = AP = TP tangent from A. cos(∠ETO) gives AE.',
          explanation='TE = 13−5 = 8. TP = 12. AE = TE×tan(∠OTP) using similar triangles: AE = 5×8/12 = 10/3. AB = 2AE = 20/3 cm.',
          concept='Tangent at Point on Secant',
          img='5m_q10.png', img_desc='Circle with center O radius 5; T external at distance 13; E on circle on line OT; tangent AB at E perpendicular to OT; P and Q tangent points from T; 5 and 13 labeled.')

        q(L7, LONG,
          'In the given figure, O is the centre of the circle. Determine ∠APC, if DA and DC are tangents and ∠ADC = 50°.',
          {},
          '∠APC = 65°',
          hint='In quadrilateral DAOC: ∠OAD = ∠OCD = 90°. Find ∠AOC. OD bisects ∠AOC, perpendicular to AC.',
          explanation='∠AOC = 360°−90°−90°−50° = 130°. OD ⊥ AC at P (by symmetry). ∠APC = 90° − ½(180°−130°) = 90°−25° = 65°.',
          concept='Tangents from External Point — Perpendicular Bisector',
          img='5m_q11.png', img_desc='Circle with center O; tangents DA and DC from external point D; ∠ADC = 50°; P is intersection of chord AC and line OD inside circle.')

        # ════════════════════════════════════════════════════════════════════
        # LESSON 8 — Case Study Question
        # ════════════════════════════════════════════════════════════════════
        L8 = lesson(8, 'Case Study — Backyard Incircle', 50,
            description='A real-world application of circles inscribed in a right triangle.',
            objectives=['Apply tangent length properties in a real context',
                        'Find the radius of an inscribed circle',
                        'Identify quadrilateral type from geometric properties'])

        q(L8, SHORT,
          'A backyard is in the shape of triangle ABC with right angle at B. AB = 7 m and BC = 15 m. A circular pit was dug inside it such that it touches the walls AC, BC and AB at P, Q and R respectively such that AP = x m. [BOARD 2024]\n\n(i) Find the length of AR in terms of x.',
          {},
          'AR = x (tangent lengths from A are equal: AR = AP = x)',
          hint='Tangent lengths from a point to a circle are equal.',
          explanation='AR and AP are both tangents from A to the inscribed circle. So AR = AP = x.',
          concept='Case Study — Tangent Lengths',
          img='case_q1.png', img_desc='Right triangle ABC: A at top, B at bottom-left with right angle, C at bottom-right; inscribed circle touching AB at R, BC at Q, AC at P; AB = 7 m, BC = 15 m.')

        q(L8, SHORT,
          'A backyard is in the shape of triangle ABC with right angle at B. AB = 7 m and BC = 15 m. AP = x m.\n\n(ii)(a) Find the length PC in terms of x and hence find the value of x.',
          {},
          'x = 3',
          hint='AC = √(AB²+BC²). PC = AC − x. BR = BQ = AB − AR = 7 − x. CQ = CP = BC − BQ.',
          explanation='AC = sqrt(49+225) = sqrt(274). BQ = BR = 7-x, CQ = CP = 15-(7-x) = 8+x. AC = x+(8+x) = 8+2x = sqrt(274). So x = (sqrt(274)-8)/2 approx 4.27. For incircle: r = (AB+BC-AC)/2 = (7+15-sqrt(274))/2 approx 2.72. x = AB - r approx 4.28.',
          concept='Case Study — Find x')

        q(L8, SHORT,
          'A backyard is in the shape of triangle ABC with right angle at B. AB = 7 m and BC = 15 m. AP = x m.\n\n(ii)(b) Find x and hence find the radius r of the circle.',
          {},
          'r = 7 − x = BQ = BR',
          hint='For incircle of right triangle: r = (a + b − c)/2 where c is hypotenuse.',
          explanation='r = (AB + BC − AC)/2 = (7 + 15 − √274)/2 ≈ (22 − 16.55)/2 ≈ 2.72 m. Also r = BR = AB − AR = 7 − x.',
          concept='Case Study — Incircle Radius')

        q(L8, SHORT,
          'A backyard is in the shape of triangle ABC with right angle at B. AB = 7 m and BC = 15 m.\n\n(iii) Write the type of quadrilateral BQOR.',
          {},
          'Square',
          hint='BQ = BR = r and ∠B = 90°, ∠OQB = ∠ORB = 90° (radius ⊥ tangent).',
          explanation='BQ = BR = r (tangent lengths from B). OQ = OR = r (radii). ∠B = ∠OQB = ∠ORB = 90°. All angles = 90° and all sides = r → BQOR is a square.',
          concept='Case Study — Quadrilateral Type')

        # ════════════════════════════════════════════════════════════════════
        # CHAPTER TEST
        # ════════════════════════════════════════════════════════════════════
        T1 = test(9, 'Chapter 10 — Circles: Full Chapter Test', 150)

        q(T1, MCQ,
          'From a point P, the length of tangent to a circle is 24 cm and the distance of P from the centre is 25 cm. The radius of the circle is',
          ['7 cm', '12 cm', '15 cm', '24.5 cm'],
          '7 cm',
          hint='r² = d² − t² where d = distance, t = tangent length.',
          explanation='r = √(25²−24²) = √(625−576) = √49 = 7 cm.',
          concept='Tangent Length Formula')

        q(T1, MCQ,
          'The tangent to a circle is perpendicular to the radius at the point of contact. If PA is tangent and OA is radius then ∠OAP =',
          ['45°', '60°', '90°', '180°'],
          '90°',
          hint='This is the fundamental tangent-radius theorem.',
          explanation='By the tangent-radius theorem, OA ⊥ PA → ∠OAP = 90°.',
          concept='Tangent-Radius Perpendicularity')

        q(T1, MCQ,
          'Two tangents PA and PB are drawn to a circle with centre O. If ∠APB = 80° then ∠AOB =',
          ['80°', '100°', '160°', '40°'],
          '100°',
          hint='∠AOB + ∠APB = 180° (supplementary).',
          explanation='∠OAP = ∠OBP = 90°. In quadrilateral OAPB: ∠AOB = 360°−90°−90°−80° = 100°.',
          concept='Angle Between Tangents and Centre Angle')

        q(T1, MCQ,
          'In the given figure, if the angle between two tangents drawn from an external point P to a circle of radius r and centre O is 60°, then PO =',
          ['r', '2r', 'r√3', 'r/2'],
          '2r',
          hint='∠OPT = 30°. sin(30°) = OT/PO = r/PO.',
          explanation='∠OPT = 30°, sin(30°) = r/PO → PO = r/sin(30°) = 2r.',
          concept='Tangent Angle and Distance to Centre')

        q(T1, MCQ,
          'A chord PQ of a circle is parallel to the tangent drawn at a point R of the circle. Prove that R bisects the arc PRQ.',
          ['Arc PR = Arc RQ', 'Arc PR > Arc RQ', 'Arc PR < Arc RQ', 'Cannot be determined'],
          'Arc PR = Arc RQ',
          hint='PQ ∥ tangent at R → alternate segment angles are equal → chords PR = RQ → arcs equal.',
          explanation='PQ ∥ tangent at R → ∠RPQ = ∠PRT (alternate). By converse: PR = RQ → R bisects arc.',
          concept='Chord Parallel to Tangent')

        q(T1, MCQ,
          'The length of the tangent from a point A at distance 5 cm from the centre of a circle is 4 cm. The radius of the circle is',
          ['3 cm', '4 cm', '√41 cm', '√7 cm'],
          '3 cm',
          hint='r² = 5² − 4² = 25 − 16 = 9.',
          explanation='r = √(25−16) = √9 = 3 cm.',
          concept='Tangent Length Formula')

        q(T1, MCQ,
          'If PA and PB are tangents from P to a circle with centre O, and ∠AOB = 110°, then ∠APB =',
          ['70°', '55°', '110°', '35°'],
          '70°',
          hint='∠APB + ∠AOB = 180°.',
          explanation='∠APB = 180° − 110° = 70°.',
          concept='Supplementary Angles — Tangents and Centre')

        q(T1, MCQ,
          'In △ABC, a circle is inscribed touching the sides AB, BC, CA at P, Q, R. If AB = 10 cm, AR = 7 cm and RC = 5 cm, then BC =',
          ['9 cm', '8 cm', '12 cm', '3 cm'],
          '8 cm',
          hint='AR = AP, BQ = BP, CR = CQ. Find AC then use tangent lengths.',
          explanation='AR = AP = 7. AC = AR + RC = 12. BP = AB − AP = 3. BQ = BP = 3. CQ = CR = 5. BC = BQ + QC = 3 + 5 = 8 cm.',
          concept='Incircle Tangent Lengths')

        q(T1, MCQ,
          'Tangent PA and secant PBC are drawn from an external point P. If PA = 6 cm and PB = 4 cm, then PC =',
          ['9 cm', '6 cm', '4 cm', '3 cm'],
          '9 cm',
          hint='PA² = PB × PC (tangent-secant theorem).',
          explanation='PA² = PB × PC → 36 = 4 × PC → PC = 9 cm.',
          concept='Tangent-Secant Theorem')

        q(T1, MCQ,
          'The angle in a semicircle is',
          ['45°', '60°', '90°', '120°'],
          '90°',
          hint='Angle subtended by a diameter at any point on the circle = 90°.',
          explanation='By Thales\' theorem, any angle inscribed in a semicircle is 90°.',
          concept='Angle in Semicircle')

        # ── Flashcard Deck ───────────────────────────────────────────────────
        deck = FlashcardDeck.objects.create(
            course_unit=unit,
            title='Circles — Key Theorems',
            purpose=DeckPurpose.POST_NODE,
        )
        cards_data = [
            ('Tangent-Radius Theorem',
             'A tangent to a circle is perpendicular to the radius at the point of contact.\nOT ⊥ tangent at T.',
             'Tangent Properties'),
            ('Equal Tangent Lengths',
             'Tangents from an external point to a circle are equal in length.\nPA = PB if PA and PB are tangents from P.',
             'Tangent Properties'),
            ('Alternate Segment Theorem',
             'Angle between tangent and chord = inscribed angle in the alternate segment.\n∠TAB = ∠ACB (C in alternate segment).',
             'Tangent-Chord Angle'),
            ('Tangents from External Point — Angle',
             '∠AOB + ∠APB = 180° (supplementary)\nwhere PA, PB are tangents from P to circle with centre O.',
             'Tangent Angle'),
            ('Circumscribed Quadrilateral',
             'If a quadrilateral circumscribes a circle:\nAB + CD = BC + AD',
             'Tangent Lengths'),
            ('Chord Tangent Length Relation',
             'PA² = PB × PC (tangent-secant from external P)\nwhere PA = tangent, PBC = secant.',
             'Power of a Point'),
        ]
        for title, body, concept in cards_data:
            card = Flashcard.objects.create(
                title=title, body=body, card_type=FlashcardType.FORMULA,
                subject='Mathematics', chapter='Chapter 10: Circles', concept=concept,
            )
            DeckCard.objects.create(
                deck=deck, card=card,
                order=DeckCard.objects.filter(deck=deck).count() + 1
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded Chapter 10: Circles'))
        self.stdout.write('  8 lesson nodes + 1 chapter test')
        self.stdout.write('  6 flashcard key theorems')
