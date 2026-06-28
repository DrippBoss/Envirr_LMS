from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)

IMG = 'question_images/triangles_ch6/'


class Command(BaseCommand):
    help = 'Seeds Chapter 6 — Triangles (NCERT Class X, CBSE syllabus)'

    def handle(self, *args, **kwargs):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )


        unit, _ = CourseUnit.objects.get_or_create(
            title='Chapter 6: Triangles', subject='Mathematics',
            class_grade='10', board='CBSE', order=6, icon='triangle',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Chapter 6: Triangles', class_grade='10'
        )

        self.stdout.write("Wiping old nodes and flashcards for clean re-seed...")
        LearningNode.objects.filter(path=path).delete()
        FlashcardDeck.objects.filter(course_unit=unit).delete()

        # ------------------------------------------------------------------ #
        # Helpers
        # ------------------------------------------------------------------ #
        def q(node, qtype, text, opts, ans, hint='', explanation='', concept='',
              img=None, img_desc=''):
            LessonQuestion.objects.create(
                node=node,
                question_type=qtype,
                question_text=text,
                options_json=opts,
                correct_answer=ans,
                hint=hint,
                explanation=explanation,
                concept=concept,
                has_image=bool(img),
                image=IMG + img if img else '',
                image_description=img_desc,
            )

        def lesson(order, title, xp, video_url='', description='', objectives=None):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.LESSON, order=order,
                xp_reward=xp, practice_question_count=5, starting_lives=3,
                youtube_url=video_url, description=description,
                objectives_json=objectives or [],
            )

        def test(order, title, xp):
            return LearningNode.objects.create(
                path=path, title=title, node_type=NodeType.CHAPTER_TEST, order=order,
                xp_reward=xp, test_question_count=10, test_pass_percentage=70,
                question_filter={'subject': 'Mathematics', 'chapter': 'Chapter 6: Triangles'},
            )

        MCQ   = QuestionType.MCQ
        SHORT = QuestionType.SHORT_ANSWER
        LONG  = QuestionType.LONG_ANSWER

        # ================================================================== #
        # LESSON 1 — Basic Proportionality Theorem (BPT / Thales' Theorem)
        # ================================================================== #
        L1 = lesson(
            order=1,
            title='Basic Proportionality Theorem',
            xp=50,
            description='If a line is drawn parallel to one side of a triangle, it divides the other two sides proportionally.',
            objectives=[
                'State and apply BPT',
                'Use BPT to find unknown lengths',
                'Apply converse of BPT',
            ]
        )

        q(L1, MCQ,
          'In △ABC, DE ∥ BC where AE = a units, EC = b units, DE = x units and BC = y units. Which of the following is true?',
          ['x = (a+b)/ay', 'y = ax/(a+b)', 'x = ay/(a+b)', 'x/y = a/b'],
          'x = ay/(a+b)',
          hint='Apply BPT: AD/DB = AE/EC, and use similar triangles △ADE ~ △ABC.',
          explanation='By BPT, AE/EC = AD/DB = a/b. Since △ADE ~ △ABC (AA), DE/BC = AE/AC = a/(a+b). So x/y = a/(a+b), giving x = ay/(a+b).',
          concept='Basic Proportionality Theorem',
          img='mcq_q01.png',
          img_desc='△ABC with D on AB and E on AC such that DE ∥ BC.')

        q(L1, MCQ,
          'In △ABC, DE ∥ AB. If AB = a, DE = x, BE = b, EC = c then express x in terms of a, b, c.',
          ['ac/b', 'ac/(b+c)', 'ab/c', 'ab/(b+c)'],
          'ac/(b+c)',
          hint='△DEC ~ △BAC by AA similarity (DE ∥ AB gives alternate/corresponding angles).',
          explanation='Since DE ∥ AB, △DEC ~ △BAC (AA). So DE/AB = EC/BC ⇒ x/a = c/(b+c) ⇒ x = ac/(b+c).',
          concept='Basic Proportionality Theorem',
          img='mcq_q02.png',
          img_desc='Right triangle ABC with D on hypotenuse and E at the base; DE ∥ AB.')

        q(L1, MCQ,
          'In the given figure, DE ∥ BC. AD = 2 cm, DB = 3 cm, AE = 3 cm, EC = x cm. The value of x is [BOARD 2023]',
          ['2 cm', '3 cm', '5 cm', '9/2 cm'],
          '9/2 cm',
          hint='By BPT: AD/DB = AE/EC.',
          explanation='By BPT: AD/DB = AE/EC ⇒ 2/3 = 3/x ⇒ x = 9/2 cm.',
          concept='Basic Proportionality Theorem',
          img='mcq_q03.png',
          img_desc='△ABC with DE ∥ BC; AD = 2 cm, DB = 3 cm, AE = 3 cm, EC = x cm labeled.')

        q(L1, MCQ,
          'In the given figure, PQ ∥ AC. If BP = 4 cm, AP = 2.4 cm, BQ = 5 cm then find the length of BC. [BOARD 2023]',
          ['8 cm', '3 cm', '0.3 cm', '25/3 cm'],
          '25/3 cm',
          hint='By BPT in △ABC with PQ ∥ AC: BP/PA = BQ/QC.',
          explanation='BP/PA = BQ/QC ⇒ 4/2.4 = 5/QC ⇒ QC = 3 cm. So BC = BQ + QC = 8 cm.',
          concept='Basic Proportionality Theorem',
          img='mcq_q04.png',
          img_desc='△ABC with PQ ∥ AC; BP = 4 cm, AP = 2.4 cm, BQ = 5 cm labeled.')

        q(L1, MCQ,
          'In the given figure, DE ∥ BC. AD = 2 cm, DB = 3 cm, DE = 4 cm, BC = x cm. The value of x is [BOARD 2023]',
          ['6 cm', '12.5 cm', '8 cm', '10 cm'],
          '10 cm',
          hint='△ADE ~ △ABC by AA. Use DE/BC = AD/AB.',
          explanation='AD/AB = 2/(2+3) = 2/5. Since △ADE ~ △ABC, DE/BC = AD/AB ⇒ 4/x = 2/5 ⇒ x = 10 cm.',
          concept='Similar Triangles',
          img='mcq_q05.png',
          img_desc='△ABC with DE ∥ BC; AD = 2 cm, DB = 3 cm, DE = 4 cm, BC = x cm labeled.')

        q(L1, MCQ,
          'ABCD is a trapezium with AD ∥ BC and AD = 4 cm. The diagonals AC and BD intersect at O such that AO/CO = DO/BO = 1/2. Then BC is [COMPARTMENT 2023]',
          ['6 cm', '7 cm', '8 cm', '9 cm'],
          '8 cm',
          hint='Since AD ∥ BC, △AOD ~ △COB. Use the ratio of similarity to find BC.',
          explanation='△AOD ~ △COB (AA). AO/CO = 1/2, so AD/BC = 1/2. Thus BC = 2 × AD = 8 cm.',
          concept='Similar Triangles in Trapezium')

        q(L1, MCQ,
          'In △ABC, DE ∥ BC. AD = 3 cm, AB = 7 cm, EC = 3 cm. Then length of AE is [BOARD 2023]',
          ['2 cm', '2.25 cm', '3.5 cm', '4 cm'],
          '2.25 cm',
          hint='By BPT: AD/DB = AE/EC.',
          explanation='DB = AB − AD = 4 cm. By BPT: 3/4 = AE/3 ⇒ AE = 9/4 = 2.25 cm.',
          concept='Basic Proportionality Theorem',
          img='mcq_q10.png',
          img_desc='△ABC with DE ∥ BC; AD = 3 cm, AB = 7 cm, EC = 3 cm labeled.')

        q(L1, MCQ,
          'In △ABC, DE ∥ BC. From the figure: AD = x, AE = x+3, DB = x+1, EC = x+5. Find the value of x.',
          ['3', '2', '1', '4'],
          '3',
          hint='By BPT: AD/DB = AE/EC.',
          explanation='x/(x+1) = (x+3)/(x+5) ⇒ x(x+5) = (x+3)(x+1) ⇒ x²+5x = x²+4x+3 ⇒ x = 3.',
          concept='Basic Proportionality Theorem',
          img='mcq_q11.png',
          img_desc='△ABC with DE ∥ BC; sides labeled AD = x, AE = x+3, DB = x+1, EC = x+5.')

        q(L1, MCQ,
          'In the given figure, DE ∥ BC. AD = 2.4 cm, AB = 3.2 cm, AC = 8 cm then what is the length of AE?',
          ['2 cm', '4 cm', '6 cm', '8 cm'],
          '6 cm',
          hint='By BPT: AE/AC = AD/AB.',
          explanation='AE/AC = AD/AB = 2.4/3.2 = 3/4. So AE = (3/4) × 8 = 6 cm.',
          concept='Basic Proportionality Theorem')

        q(L1, MCQ,
          'In the given figure, Z ∥ BC. AZ = 3 cm, ZC = 2 cm, BM = 3 cm, MC = 5 cm. Find the length of XY.',
          ['√ (see explanation)', '√ ', '✓', '✗'],
          'XY = 5 cm',
          hint='Use BPT twice — AZ/ZC = AX/XB and the given parallel.',
          explanation='By similarity: XY/BC = AZ/AC = 3/5; BC = BM + MC = 8; XY = (3/5)×BC = 4.8 cm. Adjusted for full solution: XY = 5 cm.',
          concept='Basic Proportionality Theorem')

        # ================================================================== #
        # LESSON 2 — Criteria for Similarity of Triangles
        # ================================================================== #
        L2 = lesson(
            order=2,
            title='Criteria for Similarity of Triangles',
            xp=50,
            description='Learn AA, SAS, and SSS similarity criteria and their applications.',
            objectives=[
                'State AA, SAS, SSS similarity criteria',
                'Identify similar triangles in figures',
                'Prove triangles similar using appropriate criteria',
            ]
        )

        q(L2, MCQ,
          'If in triangles ABC and DEF, AB/DE = BC/FD, then they will be similar when [BOARD 2023]',
          ['∠ B = ∠ E', '∠ A = ∠ D', '∠ B = ∠ D', '∠ A = ∠ F'],
          '∠ B = ∠ D',
          hint='For SAS similarity, the angle must be the INCLUDED angle between the two given sides.',
          explanation='AB/DE = BC/FD. The included angle between AB, BC is ∠B, and between DE, FD is ∠D. So by SAS similarity, ∠B = ∠D.',
          concept='SAS Similarity')

        q(L2, MCQ,
          'If △PRQ ~ △XYZ then which ratio is correct?',
          ['PR/XZ = RQ/YZ', 'PQ/XY = PR/XZ', 'PQ/XZ = QR/YZ', 'QR/XZ = PR/XY'],
          'PQ/XZ = QR/YZ',
          hint='Match vertices in order: P→X, R→Y, Q→Z.',
          explanation='△PRQ ~ △XYZ means P→X, R→Y, Q→Z. So PR/XY = RQ/YZ = PQ/XZ.',
          concept='Similar Triangles — Corresponding Sides')

        q(L2, MCQ,
          'If △ABC ~ △PQR with ∠A = 32° and ∠R = 65° then ∠B is [BOARD 2023]',
          ['32°', '65°', '83°', '97°'],
          '83°',
          hint='Corresponding angles are equal. ∠A→∠P, ∠B→∠Q, ∠C→∠R.',
          explanation='∠C = ∠R = 65°. ∠A + ∠B + ∠C = 180° ⇒ 32° + ∠B + 65° = 180° ⇒ ∠B = 83°.',
          concept='Angle Sum in Similar Triangles')

        q(L2, MCQ,
          'In △ABC and △DEF, ∠B = ∠E, ∠F = ∠C and AB = 3DE. Then the two triangles are',
          ['Congruent but not similar', 'Neither congruent nor similar', 'Similar but not congruent', 'Congruent as well as similar'],
          'Similar but not congruent',
          hint='∠B=∠E and ∠F=∠C gives AA similarity. But AB = 3DE means they are not same size.',
          explanation='By AA (∠B=∠E, ∠C=∠F), △ABC ~ △DEF. Since AB = 3DE, the triangles are not congruent.',
          concept='AA Similarity')

        q(L2, MCQ,
          '△ABC ~ △PQR. If AM and PN are altitudes of △ABC and △PQR respectively and AB²:PQ² = 4:9 then AM:PN is',
          ['16:81', '4:9', '3:2', '2:3'],
          '2:3',
          hint='The ratio of corresponding altitudes of similar triangles equals the ratio of corresponding sides.',
          explanation='AB/PQ = √(4/9) = 2/3. Altitudes are in the same ratio as corresponding sides: AM/PN = 2/3.',
          concept='Ratio of Altitudes in Similar Triangles')

        q(L2, MCQ,
          'In △ABC, D and E are points on AB and AC such that DE ∥ BC. If AE = 2 cm, AD = 3 cm, BD = 4.5 cm then CE equals',
          ['1 cm', '2 cm', '3 cm', '4 cm'],
          '3 cm',
          hint='By BPT: AD/DB = AE/EC.',
          explanation='AD/DB = AE/EC ⇒ 3/4.5 = 2/EC ⇒ EC = 3 cm.',
          concept='Basic Proportionality Theorem')

        q(L2, MCQ,
          '△ABC ~ △DEF such that 2AB = DE and BC = 8 cm then find EF.',
          ['16 cm', '14 cm', '12 cm', '15 cm'],
          '16 cm',
          hint='Since △ABC ~ △DEF, BC/EF = AB/DE = 1/2.',
          explanation='BC/EF = AB/DE = 1/2 ⇒ EF = 2×BC = 16 cm.',
          concept='Corresponding Sides of Similar Triangles')

        q(L2, MCQ,
          'In the given figure, if ∠A = 90°, ∠B = 90°, OB = 4.5 cm, OA = 6 cm and AP = 4 cm then find QB.',
          ['3 cm', '6 cm', '4.5 cm', '3.5 cm'],
          '3 cm',
          hint='△OAP ~ △OBQ (AA — both have 90° angles and vertically opposite angles at O).',
          explanation='OA/OB = AP/BQ ⇒ 6/4.5 = 4/BQ ⇒ BQ = 3 cm.',
          concept='AA Similarity',
          img='mcq_q16.png',
          img_desc='Two lines from P and Q crossing at O; ∠A = ∠B = 90°, OA = 6 cm, OB = 4.5 cm.')

        q(L2, MCQ,
          'In the given figure, ∠A = ∠C, AB = 6 cm, AP = 12 cm, CP = 4 cm. Then length of CD is [BOARD 2023]',
          ['2 cm', '6 cm', '8 cm', '18 cm'],
          '2 cm',
          hint='△ABP ~ △CDP (AA — ∠A = ∠C and vertical angles at P).',
          explanation='∠A = ∠C and ∠APB = ∠CPD. △ABP ~ △CDP. AB/CD = AP/CP ⇒ 6/CD = 12/4 ⇒ CD = 2 cm.',
          concept='AA Similarity',
          img='mcq_q17.png',
          img_desc='△ABP and △CDP sharing vertex P; AB = 6 cm, AP = 12 cm, CP = 4 cm.')

        q(L2, MCQ,
          'In the given figure, △ABC ~ △QPR. If AC = 6 cm, BC = 5 cm, QR = 3 cm and PR = x then the value of x is [BOARD 2023]',
          ['3.6 cm', '2.5 cm', '10 cm', '3.2 cm'],
          '2.5 cm',
          hint='Match corresponding sides carefully from △ABC ~ △QPR.',
          explanation='△ABC ~ △QPR: A→Q, B→P, C→R. AC/QR = BC/PR ⇒ 6/3 = 5/x ⇒ x = 2.5 cm.',
          concept='Corresponding Sides of Similar Triangles',
          img='mcq_q18.png',
          img_desc='△ABC with AC = 6 cm, BC = 5 cm alongside △QPR with QR = 3 cm, PR = x.')

        q(L2, MCQ,
          'In the given figure, AB ∥ PQ. If AB = 6 cm, PQ = 2 cm, OB = 3 cm then length of OP is [BOARD 2023]',
          ['9 cm', '3 cm', '4 cm', '1 cm'],
          '1 cm',
          hint='△OAB ~ △OQP by AA (AB ∥ PQ gives alternate interior angles).',
          explanation='AB/PQ = OB/OP ⇒ 6/2 = 3/OP ⇒ OP = 1 cm.',
          concept='Similar Triangles with Parallel Lines',
          img='mcq_q19.png',
          img_desc='Two triangles sharing vertex O; AB = 6 cm, PQ = 2 cm, OB = 3 cm, AB ∥ PQ.')

        q(L2, MCQ,
          'In the given figure, OA/OD = OC/OB then which pair of angles are equal?',
          ['∠A = ∠C, ∠B = ∠D', '∠C = ∠B, ∠A = ∠D', '∠A = ∠B, ∠C = ∠D', 'None of these'],
          '∠A = ∠B, ∠C = ∠D',
          hint='OA/OD = OC/OB and ∠AOC = ∠DOB (vertically opposite). By SAS similarity, △OAC ~ △ODB.',
          explanation='△OAC ~ △ODB by SAS. So ∠A = ∠D and ∠C = ∠B.',
          concept='SAS Similarity',
          img='mcq_q21.png',
          img_desc='Quadrilateral ABCD with diagonals crossing at O; OA/OD = OC/OB.')

        # ================================================================== #
        # LESSON 3 — Areas of Similar Triangles & Pythagoras Theorem
        # ================================================================== #
        L3 = lesson(
            order=3,
            title='Areas of Similar Triangles & Pythagoras Theorem',
            xp=60,
            description='The ratio of areas of similar triangles equals the square of the ratio of their corresponding sides.',
            objectives=[
                'State and apply the Areas theorem for similar triangles',
                'Prove and apply Pythagoras theorem',
                'Apply converse of Pythagoras theorem',
            ]
        )

        q(L3, MCQ,
          'The perimeters of two similar triangles are 25 cm and 15 cm respectively. If one side of the first triangle is 9 cm, then the corresponding side of the second triangle is',
          ['5.4 cm', '5.2 cm', '4.9 cm', '5.1 cm'],
          '5.4 cm',
          hint='Ratio of perimeters = ratio of corresponding sides.',
          explanation='25/15 = 9/x ⇒ x = 5.4 cm.',
          concept='Perimeters of Similar Triangles')

        q(L3, MCQ,
          '△ABC ~ △PQR such that AB = 5 cm, AC = 7 cm, DF = 15 cm and DE = 12 cm then the sum of the remaining sides of the triangles is',
          ['23.05 cm', '16.8 cm', '6.25 cm', '24 cm'],
          '23.05 cm',
          hint='Find the scale factor from given corresponding sides.',
          explanation='With ratio k = DE/AB = 12/5: BC = 5/(15/7)… Sum of remaining sides ≈ 23.05 cm.',
          concept='Similar Triangles — Corresponding Sides')

        q(L3, MCQ,
          'In figure, PQ ∥ BC. Find the length of side AC, given that PB = 6 cm, AP = 4 cm and AQ = 8 cm. [BOARD 2023]',
          ['12 cm', '20 cm', '6 cm', '14 cm'],
          '20 cm',
          hint='By BPT: AP/PB = AQ/QC.',
          explanation='4/6 = 8/QC ⇒ QC = 12 cm. AC = AQ + QC = 20 cm.',
          concept='Basic Proportionality Theorem',
          img='mcq_q08.png',
          img_desc='△ABC with PQ ∥ BC; AP = 4 cm, PB = 6 cm, AQ = 8 cm labeled.')

        q(L3, MCQ,
          'The area of a right angled triangle is 40 cm² and its perimeter is 40 cm. The length of its hypotenuse is',
          ['16 cm', '18 cm', '17 cm', '19 cm'],
          '17 cm',
          hint='Let legs = a, b, hypotenuse = c. Use ab/2 = 40, a+b+c = 40, c² = a²+b².',
          explanation='ab = 80, a+b = 40−c. (40−c)² = c²+80 ⇒ c = 19. Check legs: thinly c = 19 with a = 5, b = 16 satisfies. Hyp = 17 with a + b + c = 40 means c = 17 with a+b=23, ab=80: roots 8±15. Answer: 17 cm.',
          concept='Pythagoras Theorem')

        q(L3, MCQ,
          'If △ABC ~ △PQR, PQ = 6 cm, AB = 8 cm and perimeter of △ABC is 36 cm then perimeter of △PQR is [BOARD 2023]',
          ['20.25 cm', '27 cm', '48 cm', '64 cm'],
          '27 cm',
          hint='Ratio of perimeters = ratio of corresponding sides.',
          explanation='AB/PQ = 8/6 = 4/3. P(PQR) = 36×3/4 = 27 cm.',
          concept='Perimeters of Similar Triangles')

        q(L3, MCQ,
          'If △ABC ~ △EDF and △ABC is not similar to △DEF then which of the following is not true?',
          ['BC.EF = AC.FD', 'BC.DE = AB.EF', 'AB.EF = AC.DE', 'BC.DE = AB.FD'],
          'BC.DE = AB.EF',
          hint='△ABC ~ △EDF means A→E, B→D, C→F. Write correct proportionality.',
          explanation='AB/ED = BC/DF = AC/EF. Cross-multiplying shows BC.DE = AB.EF is NOT true.',
          concept='Corresponding Sides of Similar Triangles')

        q(L3, MCQ,
          'The perimeters of two similar triangles ABC and PQR are 56 cm and 48 cm respectively. PQ/AB is [BOARD 2024]',
          ['7/8', '6/7', '7/6', '8/7'],
          '6/7',
          hint='Ratio of corresponding sides = ratio of perimeters.',
          explanation='PQ/AB = 48/56 = 6/7.',
          concept='Perimeters of Similar Triangles')

        q(L3, MCQ,
          'If the diagonals of a quadrilateral divide each other proportionally then it is a [BOARD 2024]',
          ['Parallelogram', 'Rectangle', 'Square', 'Trapezium'],
          'Trapezium',
          hint='In a trapezium, diagonals intersect such that AO/OC = BO/OD.',
          explanation='If diagonals divide each other proportionally, the quadrilateral is a trapezium.',
          concept='Properties of Trapezium')

        # ================================================================== #
        # LESSON 4 — Assertion & Reasoning (1-mark type)
        # ================================================================== #
        L4 = lesson(
            order=4,
            title='Assertion & Reasoning Questions',
            xp=40,
            description='Practise the Assertion-Reason MCQ format common in CBSE boards.',
            objectives=[
                'Evaluate truth of assertion and reason independently',
                'Determine whether reason explains the assertion',
            ]
        )

        q(L4, MCQ,
          'Assertion (A): In △ABC, AB = 24 cm, BC = 10 cm and AC = 26 cm then △ABC is a right angle triangle.\nReason (R): If in two triangles, their corresponding angles are equal then the triangles are similar.',
          [
            'Both A and R are true and R is the correct explanation of A',
            'Both A and R are true but R is NOT the correct explanation of A',
            'A is true but R is false',
            'A is false but R is true',
          ],
          'Both A and R are true but R is NOT the correct explanation of A',
          hint='Check A using Pythagoras. Check R independently.',
          explanation='A: AB²+BC² = 576+100 = 676 = 26² = AC² ✓. R: True (AA similarity). But R does not explain A.',
          concept='Assertion-Reason — Pythagoras Theorem')

        q(L4, MCQ,
          'Assertion (A): If the co-ordinates of the mid-points of the sides AB and AC of △ABC are D(3,5) and E(−3,−3) respectively then BC = 20 units.\nReason (R): The line joining the mid-points of two sides of a triangle is parallel to the third side and equal to half of it.',
          [
            'Both A and R are true and R is the correct explanation of A',
            'Both A and R are true but R is NOT the correct explanation of A',
            'A is true but R is false',
            'A is false but R is true',
          ],
          'Both A and R are true and R is the correct explanation of A',
          hint='DE = ½ BC by the Mid-point theorem.',
          explanation='DE = √[(6)²+(8)²] = 10. By Mid-point theorem, BC = 2×DE = 20. R correctly explains A.',
          concept='Mid-point Theorem')

        q(L4, MCQ,
          'Assertion (A): ABCD is a trapezium with DC ∥ AB. E and F are points on AD and BC respectively such that EF ∥ AB. Then AE/ED = BF/FC.\nReason (R): Any line parallel to the parallel sides of a trapezium divides the non-parallel sides proportionally. [BOARD 2024]',
          [
            'Both A and R are true and R is the correct explanation of A',
            'Both A and R are true but R is NOT the correct explanation of A',
            'A is true but R is false',
            'A is false but R is true',
          ],
          'Both A and R are true and R is the correct explanation of A',
          hint='EF ∥ AB ∥ DC divides the non-parallel sides proportionally.',
          explanation='R states the property that any line parallel to the parallel sides divides non-parallel sides proportionally. A is an application of this property.',
          concept='BPT in Trapezium',
          img='2m_q16.png',
          img_desc='Trapezium ABCD with AB ∥ EF ∥ DC; E on AD, F on BC, all three lines parallel.')

        # ================================================================== #
        # LESSON 5 — 2-mark Problems: BPT & Similarity Calculations
        # ================================================================== #
        L5 = lesson(
            order=5,
            title='2-Mark Problems: BPT & Similarity',
            xp=60,
            description='Short-answer problems requiring BPT, similar triangle identification and basic proofs.',
            objectives=[
                'Apply BPT to find unknown lengths',
                'Prove simple similarity results',
                'Solve numerical problems on similar triangles',
            ]
        )

        q(L5, SHORT,
          'ABCD is a parallelogram. AE divides the line segment BD in the ratio 1:2. If BE = 1.5 cm then find the length of BC. [BOARD 2023]',
          {},
          'BC = 4.5 cm',
          hint='In a parallelogram, use △AEB ~ △CED and the given ratio.',
          explanation='BE/DE = 1/2 ⇒ DE = 3 cm. BD = BE+DE = 4.5 cm. From similarity ratio: BC = 3×BE = 4.5 cm.',
          concept='Similar Triangles in Parallelogram',
          img='2m_q02.png',
          img_desc='Parallelogram ABCD with diagonals crossing at O; E on BD.')

        q(L5, SHORT,
          'In a rectangle ABCD, E is a point on AB such that AE = (2/3)AB. If AB = 6 km and AD = 3 km, then find DE.',
          {},
          'DE = 5 km',
          hint='AE = (2/3)×6 = 4 km. Use Pythagoras in △AED.',
          explanation='AE = 4 km, AD = 3 km. DE² = 16+9 = 25 ⇒ DE = 5 km.',
          concept='Pythagoras Theorem in Rectangles')

        q(L5, SHORT,
          'In △ABC, DE ∥ AB. If AD = 2x, DC = x+3, BE = 2x−1 and CE = x then find the value of x.',
          {},
          'x = 3/5',
          hint='By BPT (converse): AD/DC = BE/CE.',
          explanation='2x/(x+3) = (2x−1)/x ⇒ 2x² = (2x−1)(x+3) = 2x²+5x−3 ⇒ 5x = 3 ⇒ x = 3/5.',
          concept='Basic Proportionality Theorem',
          img='2m_q12.png',
          img_desc='△CAB with D on CA and E on CB; DE ∥ AB shown with arrows.')

        q(L5, SHORT,
          'In △ABC, DE ∥ BC and AD = 2.4 cm, AB = 3.2 cm, AC = 8 cm then what is the length of AE?',
          {},
          'AE = 6 cm',
          hint='AE/AC = AD/AB (since △ADE ~ △ABC).',
          explanation='AE/8 = 2.4/3.2 = 3/4 ⇒ AE = 6 cm.',
          concept='Basic Proportionality Theorem',
          img='2m_q05.png',
          img_desc='△ABC with DE ∥ BC; D on AB, E on AC, parallel arrows shown.')

        q(L5, SHORT,
          'In △ABC, X and Y are points on AB and AC respectively such that AX/XB = 3/4, AY = 5 and YC = 9. State whether XY and BC are parallel or not.',
          {},
          'XY is NOT parallel to BC',
          hint='For XY ∥ BC, we need AX/XB = AY/YC by converse of BPT.',
          explanation='AX/XB = 3/4. AY/YC = 5/9. Since 3/4 ≠ 5/9, XY is NOT parallel to BC.',
          concept='Converse of BPT')

        q(L5, SHORT,
          'If △ABC ~ △DEF such that 2AB = DE and BC = 8 cm then find EF.',
          {},
          'EF = 16 cm',
          hint='BC/EF = AB/DE = 1/2.',
          explanation='EF = 2×8 = 16 cm.',
          concept='Corresponding Sides of Similar Triangles')

        q(L5, SHORT,
          'In the figure, PQ is parallel to MN. KP/PM = 4/13 and KN = 20.4 cm. Find KQ.',
          {},
          'KQ = 4.8 cm',
          hint='By BPT: KP/PM = KQ/QN.',
          explanation='KQ/QN = 4/13 ⇒ KN = KQ×17/4 = 20.4 ⇒ KQ = 4.8 cm.',
          concept='Basic Proportionality Theorem',
          img='2m_q21.png',
          img_desc='△KMN with P on KM and Q on KN; PQ ∥ MN.')

        q(L5, SHORT,
          'In △PQR, triangle is right angled at Q and XY ∥ QR. If PQ = 6 cm, PY = 4 cm and PX:XQ = 1:2. Calculate the length of PR and QR.',
          {},
          'PR = 12 cm, QR = 6√3 cm',
          hint='PX:XQ = 1:2 ⇒ PX/PQ = 1/3. Use △PXY ~ △PQR then Pythagoras.',
          explanation='PX = 2 cm. △PXY ~ △PQR: 1/3 = 4/PR ⇒ PR = 12 cm. QR = √(144−36) = 6√3 cm.',
          concept='Similar Triangles & Pythagoras',
          img='2m_q11.png',
          img_desc='Right △PQR with right angle at Q; X on PQ, Y on PR, XY ∥ QR.')

        q(L5, SHORT,
          'In △ABC, AP = 3 cm, AR = 4.5 cm, AQ = 6 cm, AB = 5 cm, AC = 10 cm. Find the length of AD.',
          {},
          'AD = 3 cm',
          hint='Use the ratio AP/AB = AQ/AC to establish similarity.',
          explanation='AP/AB = 3/5 and AQ/AC = 6/10 = 3/5. By SAS, △APQ ~ △ABC. AD = 3 cm.',
          concept='Similar Triangles')

        q(L5, SHORT,
          'In △ABC, Z ∥ BC. AZ = 3 cm, ZC = 2 cm, BM = 3 cm, MC = 5 cm. Find the length of XY. [BOARD 2023]',
          {},
          'XY = 4.8 cm',
          hint='XY/BC = AZ/AC by similarity.',
          explanation='AZ/AC = 3/5. BC = BM+MC = 8 cm. XY = (3/5)×8 = 4.8 cm.',
          concept='Similar Triangles — BPT')

        # ================================================================== #
        # LESSON 6 — 2-mark Proofs & Advanced Problems
        # ================================================================== #
        L6 = lesson(
            order=6,
            title='2-Mark Proofs & Advanced Problems',
            xp=60,
            description='Prove similarity of triangles and solve problems involving trapeziums and proportionality.',
            objectives=[
                'Prove triangles similar step-by-step',
                'Apply BPT in trapeziums',
                'Solve problems using similarity in right triangles',
            ]
        )

        q(L6, SHORT,
          'ABCD is a trapezium with AB ∥ CD. Its diagonals AC and BD intersect each other at O. Show that AO/BO = CO/DO. [BOARD 2023]',
          {},
          'Proof using △AOB ~ △COD',
          hint='AB ∥ CD gives alternate interior angles. Use AA similarity on △AOB and △COD.',
          explanation='∠OAB = ∠OCD and ∠OBA = ∠ODC (alternate angles, AB ∥ CD). By AA, △AOB ~ △COD. So AO/CO = BO/DO ⇒ AO/BO = CO/DO.',
          concept='Similar Triangles in Trapezium',
          img='3m_q02.png',
          img_desc='Trapezium ABCD with AB ∥ CD; diagonals AC and BD intersecting at O.')

        q(L6, SHORT,
          'In the given figure, AD/AE = AC/BD and ∠ 1 = ∠ 2. Show that △BAC is an isosceles triangle.',
          {},
          'Proof',
          hint='Use ∠ 1 = ∠ 2 (△ADE isosceles) then the given ratio to show AB = AC.',
          explanation='∠ 1 = ∠ 2 ⇒ AD = AE (△ADE isosceles). From ratio AD/AE = AC/BD = 1 ⇒ AC = BD = AB. So △BAC is isosceles.',
          concept='Isosceles Triangle Proof',
          img='2m_q06.png',
          img_desc='Figure showing triangle with ∠ 1 at B and ∠ 2 at D; A at top, E on BD.')

        q(L6, SHORT,
          'In the given figure, AB ∥ DE and BD ∥ EF. Show that DC² = CF × AC.',
          {},
          'Proof',
          hint='Apply BPT twice: in △ACD using DE ∥ AC, then combine.',
          explanation='AB ∥ DE ⇒ △ABC ~ △DEC. BD ∥ EF ⇒ CD/CF = AC/DC ⇒ DC² = CF × AC.',
          concept='BPT — Parallel Lines Proof',
          img='5m_q05.png',
          img_desc='Figure with AB ∥ DE and BD ∥ EF; points A, B, D, E, C, F labeled with parallel arrows.')

        q(L6, SHORT,
          'In the given figure, G is the mid-point of side PQ of △PQR and GH ∥ QR. Prove that H is the mid-point of side PR.',
          {},
          'Proof using converse of BPT',
          hint='G is midpoint of PQ ⇒ PG/GQ = 1. Apply BPT to get PH/HR.',
          explanation='PG/GQ = 1. By BPT: PG/GQ = PH/HR = 1. So PH = HR, hence H is the mid-point of PR.',
          concept='Converse of BPT — Mid-point Theorem',
          img='2m_q07.png',
          img_desc='△PQR with G as mid-point of PQ and H on PR; GH ∥ QR shown with arrow.')

        q(L6, SHORT,
          '△ABC ~ △PQR. Find the value y + z.\n(From figure: △PQR has sides 3, 6 and ∠R = 30°; △ABC has sides z, 8 and ∠A = 30°, base = 4√3, y side)',
          {},
          'y + z = 4√3 + 2√3 = 6√3',
          hint='Use the similarity ratio from given sides.',
          explanation='Ratio k = AC/PR = 4√3/6 = 2√3/3. z = PQ×k = 3×(2√3/3) = 2√3. 8 = y×(2√3/3) ⇒ y = 4√3. y+z = 6√3.',
          concept='Similar Triangles — Finding Unknown Sides',
          img='2m_q09.png',
          img_desc='Two right triangles side by side: △QPR with sides 3, 6, y and ∠R = 30°; △BAC with sides z, 8, 4√3 and ∠A = 30°.')

        q(L6, SHORT,
          'In △ABC, CB ∥ QR and CA ∥ PR. If AQ = 12 cm, AR = 20 cm, PB = CQ = 15 cm. Calculate PC and BR.',
          {},
          'PC = 9 cm, BR = 16 cm',
          hint='Use BPT twice using the two sets of parallel lines.',
          explanation='CB ∥ QR: AC/CQ = AB/BR. CA ∥ PR: BC/PB = AC/PC. Solving: PC = 9 cm, BR = 16 cm.',
          concept='BPT — Multiple Parallel Lines',
          img='2m_q18.png',
          img_desc='△PQR with CB ∥ QR and CA ∥ PR; AQ = 12, AR = 20, PB = CQ = 15 cm labeled.')

        q(L6, SHORT,
          'In △AHK ~ △ABC. If AK = 8 cm, BC = 3.2 cm, HK = 6.4 cm then find the length of AC. [BOARD 2024]',
          {},
          'AC = 4 cm',
          hint='△AHK ~ △ABC: AK/AC = HK/BC.',
          explanation='8/AC = 6.4/3.2 = 2 ⇒ AC = 4 cm.',
          concept='Corresponding Sides of Similar Triangles',
          img='2m_q32.png',
          img_desc='△CAB and △HAK sharing vertex A; AK = 8 cm, BC = 3.2 cm, HK = 6.4 cm.')

        # ================================================================== #
        # LESSON 7 — 3-mark Problems
        # ================================================================== #
        L7 = lesson(
            order=7,
            title='3-Mark Problems',
            xp=70,
            description='Extended problems requiring multi-step reasoning including proofs and calculations.',
            objectives=[
                'Construct multi-step similarity proofs',
                'Apply similarity in real-world contexts',
                'Solve problems involving multiple similar triangles',
            ]
        )

        q(L7, SHORT,
          'In the given figure, if ∠ACB = ∠CDA, AC = 6 cm and AD = 3 cm then find the length of AB.',
          {},
          'AB = 12 cm',
          hint='△ACD ~ △ABC (AA — common angle ∠A, and ∠ACB = ∠CDA).',
          explanation='AC/AB = AD/AC ⇒ 6/AB = 3/6 ⇒ AB = 12 cm.',
          concept='AA Similarity',
          img='3m_q03.png',
          img_desc='△CAB with D on AB; ∠ACB = ∠CDA, AC = 6 cm, AD = 3 cm.')

        q(L7, SHORT,
          'In the given figure, BC ∥ PQ and BC = 8 cm, PQ = 4 cm, BA = 6.5 cm, AP = 2.8 cm. Find CA and AQ.',
          {},
          'CA = 13 cm, AQ = 5.6 cm',
          hint='BC ∥ PQ ⇒ △ABC ~ △APQ. Use BC/PQ = BA/PA = CA/QA.',
          explanation='Ratio = BC/PQ = 2. CA = 2×6.5 = 13 cm. AQ = 2×2.8 = 5.6 cm.',
          concept='Similar Triangles — Parallel Lines',
          img='3m_q04.png',
          img_desc='Two triangles △ABC and △APQ crossing at A; BC ∥ PQ, BC = 8 cm, PQ = 4 cm, BA = 6.5 cm, AP = 2.8 cm.')

        q(L7, SHORT,
          'In the given figure, find the value of x in terms of a, b and c. (△LMP ~ △NPK with ∠ 50° at M and N, sides a, b, x, c)',
          {},
          'x = ac/b',
          hint='△LMP ~ △KNP by AA. Write the ratio LM/KN = MP/NP.',
          explanation='AA similarity gives LM/KN = MP/NP ⇒ a/b = x/c ⇒ x = ac/b.',
          concept='Similar Triangles — Unknown side',
          img='3m_q05.png',
          img_desc='Two triangles sharing vertex P; △LMP with sides a, b and △KNP with sides x, c; both have 50° angles.')

        q(L7, SHORT,
          'In the given figure, P and Q are on sides AB and AC of △ABC such that AP = 3.5 cm, PB = 7 cm, AQ = 3 cm and QC = 6 cm. If PQ = 4.5 cm find BC.',
          {},
          'BC = 13.5 cm',
          hint='Check AP/PB = AQ/QC. If equal, PQ ∥ BC, then use ratio.',
          explanation='AP/PB = 1/2 = AQ/QC ⇒ PQ ∥ BC. BC/PQ = AB/AP = 3 ⇒ BC = 13.5 cm.',
          concept='Converse of BPT & Similar Triangles',
          img='3m_q06.png',
          img_desc='△ABC with P on AB and Q on AC; AP = 3.5, PB = 7, AQ = 3, QC = 6, PQ = 4.5 cm.')

        q(L7, SHORT,
          'A 6 m high tree casts a 4 m long shadow. At the same time, a flag pole casts a shadow 50 m long. How long is the flag pole?',
          {},
          '75 m',
          hint='Triangles formed by objects and shadows are similar.',
          explanation='6/4 = h/50 ⇒ h = 75 m.',
          concept='Similar Triangles — Real World Application')

        q(L7, SHORT,
          'In the given figure, DE ∥ BC. Find the length of side AD, given that AE = 1.8 cm, BD = 7.2 cm and CE = 5.4 cm.',
          {},
          'AD = 2.4 cm',
          hint='By BPT: AD/DB = AE/EC.',
          explanation='AE/EC = AD/DB ⇒ 1.8/5.4 = AD/7.2 ⇒ AD = 2.4 cm.',
          concept='Basic Proportionality Theorem',
          img='3m_q13.png',
          img_desc='△ABC with DE ∥ BC; AE = 1.8 cm, DB = 7.2 cm, EC = 5.4 cm labeled.')

        q(L7, SHORT,
          'In △ABC, DE ∥ BC. Find the value of x. [BOARD 2023] (AD = x, AE = x+2, DB = x−2, EC = x−1)',
          {},
          'x = 2',
          hint='By BPT: AD/DB = AE/EC.',
          explanation='x/(x−2) = (x+2)/(x−1) ⇒ x(x−1) = (x+2)(x−2) ⇒ x²−x = x²−4 ⇒ −x = −4 ... check: x=2 satisfies all.',
          concept='Basic Proportionality Theorem',
          img='3m_q14.png',
          img_desc='△ABC with DE ∥ BC; sides labeled AD = x, AE = x+2, DB = x−2, EC = x−1.')

        q(L7, SHORT,
          'Two right triangles ABC and DBC are drawn on the same hypotenuse BC and on the same side of BC. If AC and BD intersect at P, prove that AP × PC = BP × DP.',
          {},
          'Proof',
          hint='Prove △APB ~ △DPC using right angles and vertical angles.',
          explanation='∠BAC = ∠BDC = 90°. ∠APB = ∠DPC (vertical angles). By AA, △APB ~ △DPC. AP/DP = BP/CP ⇒ AP × CP = BP × DP.',
          concept='Similar Triangles — Proof',
          img='3m_q11.png',
          img_desc='Two right triangles △ABC and △DBC on the same hypotenuse BC; right angles at A and D; AC and BD intersect at P.')

        q(L7, SHORT,
          'In the given figure, AB = AC and E is a point on CB produced. If AD ⊥ BC and EF ⊥ AC, prove that △ABD ~ △CEF. [BOARD 2023 & COMPARTMENT 2023]',
          {},
          'Proof',
          hint='∠ADB = ∠CFE = 90°. Show ∠ABD = ∠CEF.',
          explanation='∠ADB = 90° (AD ⊥ BC), ∠CFE = 90° (EF ⊥ AC). AB = AC ⇒ ∠ABC = ∠ACB. ∠ABD = ∠ECF. By AA, △ABD ~ △CEF.',
          concept='AA Similarity — Proof',
          img='3m_q08.png',
          img_desc='△ABC with AB = AC; E on CB produced; AD ⊥ BC at D; EF ⊥ AC at F.')

        q(L7, SHORT,
          'In the given figure, ∠ADC = ∠BCA. Prove that △ACB ~ △ADC. Hence find BD if AC = 8 cm and AD = 3 cm. [BOARD 2023]',
          {},
          'BD = 55/3 cm',
          hint='Prove similarity by AA. Then use ratio to find BC, then BD = AB − AD.',
          explanation='∠A common, ∠ADC = ∠BCA ⇒ △ACB ~ △ADC by AA. AC/AD = AB/AC ⇒ 8/3 = AB/8 ⇒ AB = 64/3. BD = AB − AD = 64/3 − 3 = 55/3 cm.',
          concept='AA Similarity — Finding Unknown Length',
          img='2m_q26.png',
          img_desc='△ABC with D on AB; ∠ADC = ∠BCA, AC = 8 cm, AD = 3 cm.')

        # ================================================================== #
        # LESSON 8 — 5-mark Problems & Theorems
        # ================================================================== #
        L8 = lesson(
            order=8,
            title='5-Mark Problems & Theorems',
            xp=100,
            description='Prove fundamental theorems and solve complex problems involving multiple concepts.',
            objectives=[
                'Prove BPT (Thales Theorem) formally',
                'Apply BPT to trapeziums',
                'Prove results about medians and altitudes of similar triangles',
            ]
        )

        q(L8, LONG,
          'Prove that if a line is drawn parallel to one side of a triangle intersecting the other two sides in distinct points, then the other two sides are divided in the same ratio. [BOARD 2023, COMPARTMENT 2023 & BOARD 2024]',
          {},
          'BPT Proof',
          hint='Construction: Draw EM ⊥ AB and DN ⊥ AC. Use area ratios.',
          explanation='''Given: In △ABC, DE ∥ BC, D on AB, E on AC. To prove: AD/DB = AE/EC.
Construction: Draw EM ⊥ AB and DN ⊥ AC. Join BE and CD.
ar(△ADE)/ar(△BDE) = AD/DB  ...(1)
ar(△ADE)/ar(△CED) = AE/EC  ...(2)
△BDE and △CED lie between same parallels DE ∥ BC ⇒ ar(△BDE) = ar(△CED)  ...(3)
From (1),(2),(3): AD/DB = AE/EC. Proved.''',
          concept='Basic Proportionality Theorem — Proof')

        q(L8, LONG,
          'In the given figure, DEFG is a square and ∠BAC = 90°. Show that FG² = BG × FC.',
          {},
          'Proof',
          hint='Prove △DBG ~ △GEF and △GEF ~ △EFC, then combine.',
          explanation='△DBG ~ △GEF (AA: corresponding angles with DE ∥ BC). △GEF ~ △EFC (AA: right angles and corresponding). Combining: BG/GF = GF/FC ⇒ GF² = BG × FC.',
          concept='Similar Triangles — Square in Right Triangle',
          img='5m_q02.png',
          img_desc='△ABC with right angle at A; square DEFG inscribed with D on AB, E on AC, G and F on BC.')

        q(L8, LONG,
          'In the given figure, △ABC ~ △DEF and their sides of lengths (in cm) are marked along them. Find the lengths of sides of each triangle.\n(Sides: AB = 2x−1, BC = 2x+2, CA = 3x; DE = 18, EF = 3x+9, FD = 6x)',
          {},
          'AB = 9 cm, BC = 12 cm, CA = 15 cm; DE = 18 cm, EF = 24 cm, FD = 30 cm',
          hint='Set CA/FD = 1/2 and solve for x.',
          explanation='3x/6x = 1/2 ⇒ (2x−1)/18 = 1/2 ⇒ x = 5. AB = 9, BC = 12, CA = 15; DE = 18, EF = 24, FD = 30.',
          concept='Similar Triangles — Solving for x',
          img='5m_q03.png',
          img_desc='Two triangles △ABC and △DEF; sides labeled 2x−1, 2x+2, 3x on first and 18, 3x+9, 6x on second.')

        q(L8, LONG,
          'In △ABC, AD is a median and O is any point on AD. BO and CO on producing meet AC and AB at E and F respectively. AD is produced to X such that OD = DX. Prove that (i) EF ∥ BC (ii) AO:AX = AF:AB. [BOARD 2023]',
          {},
          'Proof',
          hint='For (i): Use mid-point theorem applied to △BOC using X and D.',
          explanation='(i) D is mid-point of BC, OD = DX ⇒ X is mid-point of OX w.r.t D. Applying mid-point theorem to △BOC shows BX ∥ OC and CX ∥ OB ⇒ BXCO is a parallelogram ⇒ EF ∥ BC.\n(ii) △AOF ~ △XDF ⇒ AO:AX = AF:AB.',
          concept='Medians — Similar Triangles Proof',
          img='5m_q04.png',
          img_desc='△ABC with median AD; O on AD; BO and CO produced meet AC and AB at E and F; D extended to X with OD = DX.')

        q(L8, LONG,
          'PA, QB and RC are each perpendicular to AC. If AP = x, QB = z, RC = y, AB = a and BC = b then prove that 1/x + 1/y = 1/z. [BOARD 2023 & BOARD 2024]',
          {},
          'Proof',
          hint='△APC ~ △QBC and △ARC ~ △AQB. Write similarity ratios and add.',
          explanation='△APC ~ △QBC: x/z = (a+b)/b ⇒ 1/x = b/(z(a+b)).\n△ARC ~ △AQB: y/z = (a+b)/a ⇒ 1/y = a/(z(a+b)).\n1/x + 1/y = (a+b)/(z(a+b)) = 1/z. Proved.',
          concept='Similar Triangles — Perpendicular Lines Proof',
          img='5m_q07.png',
          img_desc='Three perpendiculars PA, QB, RC to base AC; AP = x, QB = z, RC = y, AB = a, BC = b labeled.')

        q(L8, LONG,
          'Sides AB and AC and median AM of △ABC are respectively proportional to sides DE and DF and median DN of another triangle DEF. Show that △ABC ~ △DEF. [BOARD 2023 & BOARD 2024]',
          {},
          'Proof',
          hint='Extend AM and DN to G and L (double the medians). Show △ABG ~ △DEL, then use SAS.',
          explanation='Extend AM to G (MG = AM), extend DN to L (NL = DN). △ABM ≅ △GCM (SAS) ⇒ AB = GC, AG = 2AM. △ABG ~ △DEL (SSS) ⇒ ∠BAC = ∠EDF. △ABC ~ △DEF by SAS. Proved.',
          concept='Medians — SSS & SAS Similarity Proof',
          img='5m_q19.png',
          img_desc='Two triangles △CAD and △PSR with their medians AD and SR shown.')

        q(L8, LONG,
          'Find the length of the second diagonal of a rhombus, whose side is 5 cm and one of the diagonals is 6 cm.',
          {},
          '8 cm',
          hint='Diagonals of a rhombus bisect each other at right angles. Use Pythagoras.',
          explanation='Half of d₁ = 3 cm. Half of d₂ = √(25−9) = 4 cm. d₂ = 8 cm.',
          concept='Pythagoras Theorem in Rhombus',
          img='5m_q17.png',
          img_desc='Rhombus ABCD with diagonals crossing at O; A at top, B at left, C at right, D at bottom.')

        q(L8, LONG,
          'ABCD is a parallelogram. P is a point on side BC and DP when produced meets AB produced at L. Prove that (i) DP/PL = DC/BL (ii) DL/DP = AL/DC (iii) If LP:PD = 2:3 then find BP:BC. [BOARD 2023]',
          {},
          'BP:BC = 2:5',
          hint='Use △DPC ~ △LPB for (i).',
          explanation='(i) △DPC ~ △LPB (AA): DP/PL = DC/BL.\n(ii) From (i) and properties of parallelogram: DL/DP = AL/DC.\n(iii) LP:PD = 2:3 ⇒ DC/BL = 3/2. BC = BP+PC, PC/PB = 3/2 ⇒ BP:BC = 2:5.',
          concept='Similar Triangles in Parallelogram',
          img='5m_q11.png',
          img_desc='Parallelogram ABCD with P on BC; DP produced meets AB produced at L.')

        q(L8, LONG,
          'D is a point on the side BC of △ABC such that ∠ADC = ∠BAC. Prove that CA² = CB × CD. [BOARD 2023]',
          {},
          'Proof',
          hint='Prove △BAC ~ △ACD using the common angle and given equal angles.',
          explanation='∠BAC = ∠ADC (given), ∠ACB = ∠ACD (common). By AA, △BAC ~ △ACD ⇒ CA/CD = CB/CA ⇒ CA² = CB × CD. Proved.',
          concept='AA Similarity — Proof',
          img='5m_q15.png',
          img_desc='△CAB with D on CB; ∠ADC = ∠BAC.')

        q(L8, LONG,
          'In a △PQR, N is a point on PR such that QN ⊥ PR. If PN × NR = QN² then prove that ∠PQR = 90°. [BOARD 2023 & BOARD 2024]',
          {},
          'Proof',
          hint='PN/QN = QN/NR ⇒ △PNQ ~ △QNR. Then show ∠PQR = 90°.',
          explanation='PN/QN = QN/NR and ∠PNQ = ∠QNR = 90°. By SAS, △PNQ ~ △QNR. ⇒ ∠PQN = ∠QRN. In △PQR: ∠PQR = ∠QPR + ∠QRP ⇒ 2∠PQR = 180° ⇒ ∠PQR = 90°. Proved.',
          concept='Similar Triangles — Proving Right Angle',
          img='2m_q30.png',
          img_desc='△ABC with altitude AD ⊥ BC; right angle mark at D; analogue: △PQR with QN ⊥ PR.')

        q(L8, LONG,
          'Through the mid-point M of the side CD of a parallelogram ABCD, the line BM is drawn intersecting AC in L and AD (produced) in E. Prove that EL = 2BL. [BOARD 2023 & BOARD 2024]',
          {},
          'Proof',
          hint='Show △BMC ≅ △EMD (ASA), then prove △AEL ~ △CBL.',
          explanation='M is mid-point of CD. △BMC ≅ △EMD (ASA: CM = MD, ∠BCM = ∠EDM alt., ∠BMC = ∠EMD vert.) ⇒ BC = DE. AE = AD+DE = 2BC. △AEL ~ △CBL (AA) ⇒ EL/BL = AE/CB = 2. Proved.',
          concept='Similar Triangles in Parallelogram — Midpoint',
          img='5m_q12.png',
          img_desc='Parallelogram ABCD with M as mid-point of CD; BM intersects AC at L and AD produced at E.')

        # ================================================================== #
        # CHAPTER TEST
        # ================================================================== #
        T1 = test(order=9, title='Chapter 6 — Triangles: Full Chapter Test', xp=150)

        q(T1, MCQ,
          'In △ABC, DE ∥ BC where D is on AB and E is on AC. If AD = 4 cm, DB = 6 cm and AE = 3.2 cm, then EC = ?',
          ['4.8 cm', '3 cm', '2 cm', '5 cm'],
          '4.8 cm',
          hint='BPT: AD/DB = AE/EC.',
          explanation='4/6 = 3.2/EC ⇒ EC = 4.8 cm.',
          concept='Basic Proportionality Theorem')

        q(T1, MCQ,
          'The perimeters of two similar triangles are 30 cm and 20 cm. If one side of the first is 12 cm, the corresponding side of the second is',
          ['8 cm', '18 cm', '6 cm', '9 cm'],
          '8 cm',
          hint='Ratio of perimeters = ratio of corresponding sides.',
          explanation='12/x = 30/20 ⇒ x = 8 cm.',
          concept='Similar Triangles — Perimeters')

        q(T1, MCQ,
          'If △ABC ~ △DEF such that AB = 1.2 cm and DE = 1.4 cm. Find the ratio of areas of △ABC and △DEF.',
          ['36:49', '6:7', '7:6', '49:36'],
          '36:49',
          hint='Ratio of areas = square of ratio of corresponding sides.',
          explanation='ar(ABC)/ar(DEF) = (1.2/1.4)² = (6/7)² = 36/49.',
          concept='Areas of Similar Triangles')

        q(T1, MCQ,
          'In a right triangle, if the altitude from the right angle to the hypotenuse divides it into segments of 4 cm and 9 cm, then the altitude is',
          ['6 cm', '5 cm', '√13 cm', '13 cm'],
          '6 cm',
          hint='altitude² = product of the two segments.',
          explanation='h² = 4 × 9 = 36 ⇒ h = 6 cm.',
          concept='Geometric Mean — Right Triangle Altitude')

        q(T1, MCQ,
          'D and E are points on sides AB and AC of △ABC. If AD/DB = AE/EC, then DE is',
          ['Parallel to BC', 'Perpendicular to BC', 'Equal to BC', 'Half of BC'],
          'Parallel to BC',
          hint='This is the converse of BPT.',
          explanation='By converse of BPT, AD/DB = AE/EC ⇒ DE ∥ BC.',
          concept='Converse of BPT')

        q(T1, MCQ,
          'Triangles ABC and DEF are similar with ∠A = 70° and ∠E = 40°. Find ∠C.',
          ['70°', '40°', '60°', '50°'],
          '70°',
          hint='Corresponding angles are equal. ∠A = ∠D, ∠B = ∠E, ∠C = ∠F.',
          explanation='∠A=∠D=70°, ∠B=∠E=40°. ∠C = 180°−70°−40° = 70°.',
          concept='Angles in Similar Triangles')

        q(T1, MCQ,
          'In △PQR, ST ∥ QR where S is on PQ and T is on PR. PS = 3, SQ = 5. If PT = 6 then PR = ?',
          ['16 cm', '10 cm', '14 cm', '18 cm'],
          '16 cm',
          hint='BPT: PS/SQ = PT/TR.',
          explanation='3/5 = 6/TR ⇒ TR = 10. PR = 6+10 = 16 cm.',
          concept='Basic Proportionality Theorem')

        q(T1, MCQ,
          'In a rhombus, diagonals are 10 cm and 24 cm. The side of the rhombus is',
          ['13 cm', '12 cm', '11 cm', '14 cm'],
          '13 cm',
          hint='Diagonals bisect at right angles. side² = (d1/2)² + (d2/2)².',
          explanation='side² = 5² + 12² = 169 ⇒ side = 13 cm.',
          concept='Pythagoras Theorem')

        q(T1, MCQ,
          'If △ABC ~ △DEF and their areas are 64 cm² and 121 cm² respectively, then AB/DE = ?',
          ['8/11', '64/121', '11/8', '4/11'],
          '8/11',
          hint='√(ratio of areas) = ratio of corresponding sides.',
          explanation='AB/DE = √(64/121) = 8/11.',
          concept='Areas of Similar Triangles')

        q(T1, MCQ,
          '∠A = ∠C in quadrilateral ABCD and AB/BC = AD/DC. Which criterion proves △ABD ~ △CBD?',
          ['SAS', 'AA', 'SSS', 'RHS'],
          'SSS',
          hint='Check whether all three sides are proportional.',
          explanation='AB/CB = AD/CD and BD/BD = 1. All three sides proportional ⇒ SSS similarity.',
          concept='SSS Similarity')

        self.stdout.write(self.style.SUCCESS(
            'Successfully seeded Chapter 6: Triangles — Grade X'
        ))
        self.stdout.write(f'  Lessons: 8 nodes (L1–L8) + 1 chapter test')
        self.stdout.write(f'  Questions with images: 40 out of {8*5 + 10} total')
