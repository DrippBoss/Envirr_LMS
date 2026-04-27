from django.core.management.base import BaseCommand
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    NodeType, QuestionType,
)


class Command(BaseCommand):
    help = 'Seeds / reseeds the Polynomials (Class 10 Algebra) course with MCQ + REARRANGE questions'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding Polynomials course…')

        # ── CourseUnit ────────────────────────────────────────────────────────
        unit, _ = CourseUnit.objects.get_or_create(
            title='Polynomials',
            subject='Mathematics',
            class_grade='10',
            defaults={
                'board': 'CBSE',
                'order': 2,
                'icon': 'functions',
                'description': 'Zeroes, factors, and graphs of polynomial expressions.',
                'is_published': True,
            }
        )
        unit.is_published = True
        unit.save()

        # ── LearningPath ──────────────────────────────────────────────────────
        path, _ = LearningPath.objects.get_or_create(
            unit=unit,
            title='Polynomials',
            class_grade='10',
        )

        # Wipe old nodes (cascades to LessonQuestion)
        LearningNode.objects.filter(path=path).delete()
        self.stdout.write('  Old nodes cleared.')

        # ── Nodes ─────────────────────────────────────────────────────────────
        nodes_meta = [
            {'title': 'What is a Polynomial?',              'xp': 10, 'type': NodeType.LESSON,       'video': ''},
            {'title': 'Zeroes of a Polynomial',             'xp': 15, 'type': NodeType.LESSON,       'video': ''},
            {'title': 'Relationship between Zeroes & Coefficients', 'xp': 20, 'type': NodeType.LESSON, 'video': ''},
            {'title': 'Division Algorithm',                 'xp': 20, 'type': NodeType.LESSON,       'video': ''},
            {'title': 'Factorising Quadratics',             'xp': 20, 'type': NodeType.LESSON,       'video': ''},
            {'title': 'Graphs of Polynomials',              'xp': 20, 'type': NodeType.LESSON,       'video': ''},
            {'title': 'Polynomials — Final Test',           'xp': 50, 'type': NodeType.CHAPTER_TEST, 'video': ''},
        ]

        nodes = []
        for idx, meta in enumerate(nodes_meta, start=1):
            n = LearningNode.objects.create(
                path=path,
                title=meta['title'],
                node_type=meta['type'],
                order=idx,
                xp_reward=meta['xp'],
                practice_question_count=5 if meta['type'] == NodeType.LESSON else 0,
                test_question_count=10 if meta['type'] == NodeType.CHAPTER_TEST else 0,
                youtube_url=meta['video'],
            )
            nodes.append(n)

        # ── Questions ─────────────────────────────────────────────────────────
        # Format for MCQ: {'type': 'MCQ', 'q': ..., 'opts': {...}, 'ans': KEY, 'hint': ...}
        # Format for REARRANGE: {'type': 'REARRANGE', 'q': ..., 'chips': [...], 'ans': 'space-joined answer', 'hint': ...}

        q_library = [
            # Node 1 — What is a Polynomial?
            [
                {'type': 'MCQ',
                 'q': 'Which of the following is a polynomial?',
                 'opts': {'A': 'x + 1/x', 'B': '√x + 2', 'C': 'x² + 3x + 5', 'D': '1/x²'},
                 'ans': 'C', 'hint': 'All exponents must be non-negative integers.'},
                {'type': 'MCQ',
                 'q': 'The degree of the polynomial 4x³ − 2x + 7 is:',
                 'opts': {'A': '1', 'B': '2', 'C': '3', 'D': '4'},
                 'ans': 'C', 'hint': 'The degree is the highest power of x.'},
                {'type': 'MCQ',
                 'q': 'A polynomial with exactly one term is called a:',
                 'opts': {'A': 'Binomial', 'B': 'Trinomial', 'C': 'Monomial', 'D': 'Quadratic'},
                 'ans': 'C', 'hint': 'Mono = one.'},
                {'type': 'REARRANGE',
                 'q': 'Arrange the terms of the polynomial in standard (descending) form: 7 + 3x − 5x²',
                 'chips': ['-5x²', '+', '3x', '+', '7'],
                 'ans': '-5x² + 3x + 7',
                 'hint': 'Highest degree first.'},
                {'type': 'REARRANGE',
                 'q': 'Write the standard form of: 1 − x³ + 2x',
                 'chips': ['-x³', '+', '2x', '+', '1'],
                 'ans': '-x³ + 2x + 1',
                 'hint': 'Descending powers of x.'},
            ],
            # Node 2 — Zeroes of a Polynomial
            [
                {'type': 'MCQ',
                 'q': 'The zero of the linear polynomial 2x − 6 is:',
                 'opts': {'A': '6', 'B': '3', 'C': '-3', 'D': '2'},
                 'ans': 'B', 'hint': 'Set 2x − 6 = 0.'},
                {'type': 'MCQ',
                 'q': 'How many zeroes can a quadratic polynomial have at most?',
                 'opts': {'A': '1', 'B': '2', 'C': '3', 'D': '0'},
                 'ans': 'B', 'hint': 'Degree = max number of zeroes.'},
                {'type': 'MCQ',
                 'q': 'For p(x) = x² − 4, one zero is x = 2. The other zero is:',
                 'opts': {'A': '4', 'B': '-2', 'C': '0', 'D': '2'},
                 'ans': 'B', 'hint': 'x² = 4 gives x = ±2.'},
                {'type': 'REARRANGE',
                 'q': 'For p(x) = x² − 5x + 6, arrange the factored form using the correct factors.',
                 'chips': ['(x', '-', '2)', '(x', '-', '3)'],
                 'ans': '(x - 2) (x - 3)',
                 'hint': 'Find two numbers that multiply to 6 and add to -5.'},
                {'type': 'MCQ',
                 'q': 'A polynomial p(x) has p(3) = 0. This means:',
                 'opts': {'A': 'x = 0 is a zero', 'B': 'x = 3 is a zero', 'C': 'p(x) = 3', 'D': 'Degree is 3'},
                 'ans': 'B', 'hint': 'If p(a) = 0 then a is a zero.'},
            ],
            # Node 3 — Relationship between Zeroes & Coefficients
            [
                {'type': 'MCQ',
                 'q': 'For a quadratic ax² + bx + c, the sum of zeroes is:',
                 'opts': {'A': 'c/a', 'B': '-b/a', 'C': 'b/a', 'D': '-c/a'},
                 'ans': 'B', 'hint': 'Sum = −b/a.'},
                {'type': 'MCQ',
                 'q': 'For a quadratic ax² + bx + c, the product of zeroes is:',
                 'opts': {'A': 'b/a', 'B': '-b/a', 'C': 'c/a', 'D': '-c/a'},
                 'ans': 'C', 'hint': 'Product = c/a.'},
                {'type': 'MCQ',
                 'q': 'The zeroes of x² − 3x + 2 are 1 and 2. Their sum is:',
                 'opts': {'A': '2', 'B': '3', 'C': '-3', 'D': '1'},
                 'ans': 'B', 'hint': '1 + 2 = 3 = −(−3)/1.'},
                {'type': 'REARRANGE',
                 'q': 'Build the quadratic whose zeroes are 3 and −2 using the standard formula k(x − α)(x − β):',
                 'chips': ['(x', '-', '3)', '(x', '+', '2)'],
                 'ans': '(x - 3) (x + 2)',
                 'hint': 'Substitute α = 3, β = −2.'},
                {'type': 'MCQ',
                 'q': 'If the zeroes of ax² + bx + c are equal, then b² − 4ac equals:',
                 'opts': {'A': '1', 'B': '-1', 'C': '0', 'D': '4ac'},
                 'ans': 'C', 'hint': 'Equal zeroes ⟹ discriminant = 0.'},
            ],
            # Node 4 — Division Algorithm
            [
                {'type': 'MCQ',
                 'q': 'In the Division Algorithm p(x) = g(x)·q(x) + r(x), what must be true of r(x)?',
                 'opts': {'A': 'deg r = deg g', 'B': 'deg r < deg g', 'C': 'r(x) = 0', 'D': 'deg r > deg q'},
                 'ans': 'B', 'hint': 'The remainder degree is always less than the divisor.'},
                {'type': 'MCQ',
                 'q': 'When p(x) is divided by (x − a) and the remainder is 0, then:',
                 'opts': {'A': 'a is not a zero', 'B': '(x − a) is not a factor', 'C': '(x − a) is a factor of p(x)', 'D': 'p(a) ≠ 0'},
                 'ans': 'C', 'hint': 'This is the Factor Theorem.'},
                {'type': 'REARRANGE',
                 'q': 'Write the Division Algorithm relationship in order:',
                 'chips': ['p(x)', '=', 'g(x)', '·', 'q(x)', '+', 'r(x)'],
                 'ans': 'p(x) = g(x) · q(x) + r(x)',
                 'hint': 'Dividend = Divisor × Quotient + Remainder.'},
                {'type': 'MCQ',
                 'q': 'Dividing x³ − 3x + 2 by (x − 1) gives quotient x² + x − 2 and remainder:',
                 'opts': {'A': '1', 'B': '-1', 'C': '0', 'D': '2'},
                 'ans': 'C', 'hint': 'Verify: substitute x = 1 into p(x).'},
                {'type': 'REARRANGE',
                 'q': 'Factor x² + 5x + 6 completely using its roots −2 and −3:',
                 'chips': ['(x', '+', '2)', '(x', '+', '3)'],
                 'ans': '(x + 2) (x + 3)',
                 'hint': '−2 and −3 are the roots, so (x+2)(x+3).'},
            ],
            # Node 5 — Factorising Quadratics
            [
                {'type': 'MCQ',
                 'q': 'Factorise x² − 9:',
                 'opts': {'A': '(x−3)²', 'B': '(x+9)(x−1)', 'C': '(x+3)(x−3)', 'D': '(x−9)(x+1)'},
                 'ans': 'C', 'hint': 'Difference of squares: a² − b² = (a+b)(a−b).'},
                {'type': 'REARRANGE',
                 'q': 'Arrange to show the factored form of x² + 7x + 12:',
                 'chips': ['(x', '+', '3)', '(x', '+', '4)'],
                 'ans': '(x + 3) (x + 4)',
                 'hint': 'Find two numbers that multiply to 12 and add to 7.'},
                {'type': 'MCQ',
                 'q': 'Which method is used to factorise 2x² + 5x + 3?',
                 'opts': {'A': 'Difference of squares', 'B': 'Splitting the middle term', 'C': 'Completing the square only', 'D': 'None'},
                 'ans': 'B', 'hint': 'Split 5x into 2x and 3x.'},
                {'type': 'REARRANGE',
                 'q': 'Factor 3x² − 10x + 8 by splitting the middle term correctly:',
                 'chips': ['(3x', '-', '4)', '(x', '-', '2)'],
                 'ans': '(3x - 4) (x - 2)',
                 'hint': 'Product = 3×8 = 24; find pair: −6 and −4.'},
                {'type': 'MCQ',
                 'q': 'The discriminant b² − 4ac for x² − 4x + 4 equals:',
                 'opts': {'A': '32', 'B': '0', 'C': '8', 'D': '-8'},
                 'ans': 'B', 'hint': '(−4)² − 4(1)(4) = 16 − 16 = 0.'},
            ],
            # Node 6 — Graphs of Polynomials
            [
                {'type': 'MCQ',
                 'q': 'The graph of a linear polynomial is a:',
                 'opts': {'A': 'Parabola', 'B': 'Straight line', 'C': 'Cubic curve', 'D': 'Circle'},
                 'ans': 'B', 'hint': 'ax + b = 0 is linear.'},
                {'type': 'MCQ',
                 'q': 'How many times does the graph of a quadratic polynomial cross the x-axis at most?',
                 'opts': {'A': '1', 'B': '2', 'C': '3', 'D': '4'},
                 'ans': 'B', 'hint': 'Degree 2 ⟹ at most 2 zeroes.'},
                {'type': 'MCQ',
                 'q': 'If a quadratic has no real zeroes, its graph:',
                 'opts': {'A': 'Touches the x-axis once', 'B': 'Crosses the x-axis twice', 'C': 'Does not intersect the x-axis', 'D': 'Is a straight line'},
                 'ans': 'C', 'hint': 'Negative discriminant ⟹ no real roots.'},
                {'type': 'REARRANGE',
                 'q': 'For a "smiling" parabola (opens upward) write the sign condition on the leading coefficient:',
                 'chips': ['a', '>', '0'],
                 'ans': 'a > 0',
                 'hint': 'When a > 0 the parabola opens upward.'},
                {'type': 'MCQ',
                 'q': 'The number of zeroes of a polynomial equals the number of times its graph:',
                 'opts': {'A': 'Reaches a peak', 'B': 'Intersects the y-axis', 'C': 'Intersects the x-axis', 'D': 'Changes direction'},
                 'ans': 'C', 'hint': 'A zero is where p(x) = 0, i.e. the x-axis.'},
            ],
        ]

        for node_idx, q_set in enumerate(q_library):
            node = nodes[node_idx]
            for qdata in q_set:
                if qdata['type'] == 'REARRANGE':
                    LessonQuestion.objects.create(
                        node=node,
                        question_type=QuestionType.REARRANGE,
                        question_text=qdata['q'],
                        options_json=qdata['chips'],   # list of chip strings
                        correct_answer=qdata['ans'],
                        hint=qdata['hint'],
                    )
                else:
                    LessonQuestion.objects.create(
                        node=node,
                        question_type=QuestionType.MCQ,
                        question_text=qdata['q'],
                        options_json=qdata['opts'],
                        correct_answer=qdata['opts'][qdata['ans']],
                        hint=qdata['hint'],
                    )

        self.stdout.write(self.style.SUCCESS(
            f'Polynomials seeded: {len(nodes)} nodes, {sum(len(q) for q in q_library)} lesson questions.'
        ))
