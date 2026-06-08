from django.core.management.base import BaseCommand
from courses.models import Subject, Course
from learning.models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, NodeType, LabCategory,
    QuestionType, FlashcardType, DeckPurpose
)


class Command(BaseCommand):
    help = 'Seeds Chapter 5 \u2014 Arithmetic Progressions'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Chapter 5 \u2014 Arithmetic Progressions...")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'is_superuser': True, 'is_staff': True, 'email': 'admin@example.com'}
        )

        subj, _ = Subject.objects.get_or_create(name='Mathematics', defaults={'created_by': admin_user})
        Course.objects.get_or_create(
            name='Arithmetic Progressions', subject=subj,
            defaults={'status': 'published', 'created_by': admin_user}
        )

        unit, _ = CourseUnit.objects.get_or_create(
            title='Arithmetic Progressions',
            subject='Mathematics',
            class_grade='10', board='CBSE', order=5, icon='trending_up',
            defaults={'is_published': True}
        )
        unit.is_published = True
        unit.save()

        path, _ = LearningPath.objects.get_or_create(
            unit=unit, title='Arithmetic Progressions', class_grade='10'
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
        n1  = lesson(1,  "Introduction to Arithmetic Progressions",   10, nq=10)
        n2  = lesson(2,  "Identifying APs and Common Difference",     15, nq=10)
        n3  = lesson(3,  "nth Term of an AP",                         20, nq=12)
        n4  = lab(4,     "AP Term Explorer", 25,
                         "AP_TERM_EXPLORER_LAB", LabCategory.INTERACTIVE, 3)
        n5  = lesson(5,  "Sum Formula \u2014 Derivation",             20, nq=10)
        n6  = lesson(6,  "Applying the Sum Formula",                  20, nq=10)
        n7  = lesson(7,  "AP Word Problems",                          25, nq=12)
        n8  = lab(8,     "AP Sum Visualizer", 25,
                         "AP_SUM_VISUALIZER_LAB", LabCategory.INTERACTIVE, 6)
        n9  = lesson(9,  "Advanced Problems and Special Cases",       20, nq=10)
        n10 = test(10,   "Arithmetic Progressions \u2014 Final Assessment", 50, nq=12)

        # ══════════════════════════════════════════════════════════════════════
        # NODE 1 — Introduction to Arithmetic Progressions
        # ══════════════════════════════════════════════════════════════════════

        q(n1, QuestionType.MCQ,
          "Which sequence is an Arithmetic Progression?",
          {"A": "1,2,4,8,...", "B": "1,4,9,16,...", "C": "3,7,11,15,...", "D": "1,1,2,3,5,..."},
          "3,7,11,15,...",
          explanation="Each term is obtained by adding the fixed number 4 to the preceding term.",
          concept="Definition of AP")

        q(n1, QuestionType.MCQ,
          "The common difference of the AP: 100, 70, 40, 10, ... is:",
          {"A": "30", "B": "\u221230", "C": "10", "D": "\u221210"},
          "\u221230",
          explanation="d = 70 \u2212 100 = \u221230. The common difference can be negative.",
          concept="Common Difference")

        q(n1, QuestionType.MCQ,
          "Which of the following is NOT an AP?",
          {"A": "2,2,2,2,...",
           "B": "\u22123,\u22122,\u22121,0,...",
           "C": "10000,12500,15625,19531.25",
           "D": "\u22121.0,\u22121.5,\u22122.0,\u22122.5,..."},
          "10000,12500,15625,19531.25",
          explanation="This is a geometric sequence (each term is 5/4 times the previous). Consecutive differences are not constant.",
          concept="Identifying an AP")

        q(n1, QuestionType.MCQ,
          "The general form of an AP with first term a and common difference d is:",
          {"A": "a,ad,ad\u00b2,ad\u00b3,...",
           "B": "a,a+d,a+2d,a+3d,...",
           "C": "a,a\u2212d,a\u22122d,a\u22123d,...",
           "D": "a+d,a+2d,a+3d,..."},
          "a,a+d,a+2d,a+3d,...",
          explanation="Each successive term is obtained by adding d to the previous term.",
          concept="General Form of AP")

        q(n1, QuestionType.FILL_BLANK,
          "A taxi charges \u20b915 for the first km and \u20b98 for each additional km. The fare after 1, 2, 3, ... km is 15, 23, ___.",
          {"tip": "Add \u20b98 each time: 15, 23, 31, ..."},
          "31",
          concept="AP in Daily Life")

        q(n1, QuestionType.FILL_BLANK,
          "In the AP: \u22123, \u22122, \u22121, 0, ..., the common difference d = ___.",
          {"tip": "d = second term \u2212 first term = \u22122 \u2212 (\u22123)"},
          "1",
          concept="Common Difference")

        q(n1, QuestionType.MULTI_SELECT,
          "Which of the following lists form an AP?",
          {"choices": [
              {"id": 1, "text": "8000, 8500, 9000, 9500 (salary \u20b9500 annual increment)"},
              {"id": 2, "text": "10000, 12500, 15625 (compound interest growth)"},
              {"id": 3, "text": "45, 43, 41, 39, 37, 35, 33, 31 (ladder rung lengths)"},
              {"id": 4, "text": "1, 1, 2, 3, 5, 8 (Fibonacci sequence)"},
              {"id": 5, "text": "50, 100, 150, 200, 250 (\u20b950 monthly savings)"},
          ]},
          "1,3,5",
          explanation="id2: differences 2500, 3125 \u2014 not constant. id4: differences 0,1,1,2,3 \u2014 not constant.",
          concept="Identifying an AP")

        q(n1, QuestionType.MULTI_SELECT,
          "Which statements about an AP\u2019s common difference d are TRUE?",
          {"choices": [
              {"id": 1, "text": "d can be positive"},
              {"id": 2, "text": "d can be negative"},
              {"id": 3, "text": "d can be zero"},
              {"id": 4, "text": "d must be a whole number"},
              {"id": 5, "text": "d = any term minus the term before it"},
          ]},
          "1,2,3,5",
          explanation="d can be any real number \u2014 positive, negative, or zero. It need not be an integer.",
          concept="Common Difference")

        q(n1, QuestionType.REARRANGE,
          "Verify that 4, 10, 16, 22, ... is an AP:",
          {"chips": [
              "a\u2082 \u2212 a\u2081 = 10 \u2212 4 = 6",
              "a\u2083 \u2212 a\u2082 = 16 \u2212 10 = 6",
              "a\u2084 \u2212 a\u2083 = 22 \u2212 16 = 6",
              "All differences equal 6",
              "AP with d = 6",
          ]},
          "a\u2082 \u2212 a\u2081 = 10 \u2212 4 = 6 a\u2083 \u2212 a\u2082 = 16 \u2212 10 = 6 a\u2084 \u2212 a\u2083 = 22 \u2212 16 = 6 All differences equal 6 AP with d = 6",
          concept="Verifying an AP")

        q(n1, QuestionType.REARRANGE,
          "Write the first four terms of the AP with a = \u22127, d = \u22122:",
          {"chips": ["\u22127", "\u22129", "\u221211", "\u221213"]},
          "\u22127 \u22129 \u221211 \u221213",
          concept="Writing Terms of AP")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 2 — Identifying APs and Common Difference
        # ══════════════════════════════════════════════════════════════════════

        q(n2, QuestionType.MCQ,
          "For the AP: 3/2, 1/2, \u22121/2, \u22123/2, ..., the common difference is:",
          {"A": "1", "B": "\u22121", "C": "1/2", "D": "\u22121/2"},
          "\u22121",
          explanation="d = 1/2 \u2212 3/2 = \u22121.",
          concept="Common Difference")

        q(n2, QuestionType.MCQ,
          "Which of the following is an AP?",
          {"A": "2, 4, 8, 16, ...",
           "B": "2, 5/2, 3, 7/2, ...",
           "C": "1, 3, 9, 27, ...",
           "D": "a, a\u00b2, a\u00b3, a\u2074, ..."},
          "2, 5/2, 3, 7/2, ...",
          explanation="d = 5/2 \u2212 2 = 1/2 is constant. The others are geometric sequences.",
          concept="Identifying an AP")

        q(n2, QuestionType.MCQ,
          "In the AP: \u22125, \u22121, 3, 7, ..., the first term a and common difference d are:",
          {"A": "a=\u22125, d=4", "B": "a=\u22125, d=\u22124", "C": "a=5, d=4", "D": "a=\u22121, d=4"},
          "a=\u22125, d=4",
          explanation="a = \u22125. d = \u22121 \u2212 (\u22125) = 4.",
          concept="Finding a and d")

        q(n2, QuestionType.MCQ,
          "The list 1, 1, 2, 3, 5, 8, ... (Fibonacci sequence) is:",
          {"A": "AP with d=1", "B": "AP with d=0", "C": "Not an AP", "D": "AP with d=2"},
          "Not an AP",
          explanation="a\u2082\u2212a\u2081=0, a\u2083\u2212a\u2082=1, a\u2084\u2212a\u2083=1. Differences are not all equal, so it is not an AP.",
          concept="Identifying an AP")

        q(n2, QuestionType.FILL_BLANK,
          "For the AP: 0.6, 1.7, 2.8, 3.9, ..., the common difference d = ___.",
          {"tip": "1.7 \u2212 0.6 = ?"},
          "1.1",
          concept="Common Difference")

        q(n2, QuestionType.FILL_BLANK,
          "If a = 4 and d = \u22123, the first four terms are 4, 1, \u22122, ___.",
          {"tip": "Keep adding d = \u22123: ..., \u22122 + (\u22123) = ?"},
          "\u22125",
          concept="Writing Terms of AP")

        q(n2, QuestionType.MULTI_SELECT,
          "Which of the following are APs? Select all that apply.",
          {"choices": [
              {"id": 1, "text": "\u22121.2, \u22123.2, \u22125.2, \u22127.2 (d = \u22122)"},
              {"id": 2, "text": "0.2, 0.22, 0.222, 0.2222 (differences not constant)"},
              {"id": 3, "text": "0, \u22124, \u22128, \u221212 (d = \u22124)"},
              {"id": 4, "text": "\u22121/2, \u22121/2, \u22121/2, \u22121/2 (d = 0)"},
              {"id": 5, "text": "1, 3, 9, 27 (geometric, ratio = 3)"},
          ]},
          "1,3,4",
          explanation="id2: differences 0.02, 0.002, ... \u2014 not constant. id5: geometric, not arithmetic.",
          concept="Identifying an AP")

        q(n2, QuestionType.MULTI_SELECT,
          "For the AP: 3, 3+\u221a2, 3+2\u221a2, 3+3\u221a2, ..., which are true?",
          {"choices": [
              {"id": 1, "text": "It is an AP"},
              {"id": 2, "text": "Common difference is \u221a2"},
              {"id": 3, "text": "Common difference is 3"},
              {"id": 4, "text": "Next term is 3+4\u221a2"},
              {"id": 5, "text": "It is NOT an AP because \u221a2 is irrational"},
          ]},
          "1,2,4",
          explanation="d = (3+\u221a2)\u22123 = \u221a2. The common difference can be irrational. Next term = 3+3\u221a2+\u221a2 = 3+4\u221a2.",
          concept="AP with Irrational Difference")

        q(n2, QuestionType.REARRANGE,
          "Verify that \u221210, \u22126, \u22122, 2, ... is an AP and find d:",
          {"chips": [
              "a\u2082 \u2212 a\u2081 = \u22126 \u2212 (\u221210) = 4",
              "a\u2083 \u2212 a\u2082 = \u22122 \u2212 (\u22126) = 4",
              "a\u2084 \u2212 a\u2083 = 2 \u2212 (\u22122) = 4",
              "All differences are equal",
              "AP with d = 4",
          ]},
          "a\u2082 \u2212 a\u2081 = \u22126 \u2212 (\u221210) = 4 a\u2083 \u2212 a\u2082 = \u22122 \u2212 (\u22126) = 4 a\u2084 \u2212 a\u2083 = 2 \u2212 (\u22122) = 4 All differences are equal AP with d = 4",
          concept="Verifying an AP")

        q(n2, QuestionType.REARRANGE,
          "Write the first four terms of AP when a = \u22121, d = 1/2:",
          {"chips": [
              "a\u2081 = \u22121",
              "a\u2082 = \u22121 + 1/2 = \u22121/2",
              "a\u2083 = \u22121/2 + 1/2 = 0",
              "a\u2084 = 0 + 1/2 = 1/2",
          ]},
          "a\u2081 = \u22121 a\u2082 = \u22121 + 1/2 = \u22121/2 a\u2083 = \u22121/2 + 1/2 = 0 a\u2084 = 0 + 1/2 = 1/2",
          concept="Writing Terms of AP")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 3 — nth Term of an AP
        # ══════════════════════════════════════════════════════════════════════

        q(n3, QuestionType.MCQ,
          "The nth term (general term) of an AP with first term a and common difference d is:",
          {"A": "a+nd", "B": "a+(n\u22121)d", "C": "na+d", "D": "a\u2212(n\u22121)d"},
          "a+(n\u22121)d",
          explanation="a\u2099 = a + (n\u22121)d. For n=1: a, for n=2: a+d, etc.",
          concept="nth Term Formula")

        q(n3, QuestionType.MCQ,
          "The 10th term of the AP: 2, 7, 12, ... is:",
          {"A": "45", "B": "47", "C": "50", "D": "52"},
          "47",
          explanation="a=2, d=5. a\u2081\u2080 = 2 + 9\u00d75 = 47.",
          concept="nth Term Formula")

        q(n3, QuestionType.MCQ,
          "The 30th term of the AP: 10, 7, 4, ... is:",
          {"A": "97", "B": "77", "C": "\u221277", "D": "\u221287"},
          "\u221277",
          explanation="a=10, d=\u22123. a\u2083\u2080 = 10 + 29\u00d7(\u22123) = 10 \u2212 87 = \u221277.",
          concept="nth Term Formula")

        q(n3, QuestionType.MCQ,
          "Which term of the AP: 21, 18, 15, ... is \u221281?",
          {"A": "30th", "B": "32nd", "C": "35th", "D": "38th"},
          "35th",
          explanation="\u221281 = 21 + (n\u22121)(\u22123) \u2192 \u2212102 = \u22123(n\u22121) \u2192 n\u22121=34 \u2192 n=35.",
          concept="Finding n Given aₙ")

        q(n3, QuestionType.FILL_BLANK,
          "For the AP: 3, 8, 13, 18, ..., which term equals 78? n = ___.",
          {"tip": "78 = 3 + (n\u22121)\u00d75 \u2192 75 = (n\u22121)\u00d75 \u2192 n\u22121 = 15"},
          "16",
          concept="Finding n Given aₙ")

        q(n3, QuestionType.FILL_BLANK,
          "How many two-digit numbers are divisible by 3? (AP: 12, 15, ..., 99). n = ___.",
          {"tip": "99 = 12 + (n\u22121)\u00d73 \u2192 87 = (n\u22121)\u00d73 \u2192 n\u22121 = 29"},
          "30",
          concept="Counting Terms")

        q(n3, QuestionType.FILL_BLANK,
          "An AP has 3rd term = 5 and 7th term = 9. Common difference d = ___.",
          {"tip": "a+2d=5 and a+6d=9. Subtract: 4d=4"},
          "1",
          concept="Finding a and d")

        q(n3, QuestionType.FILL_BLANK,
          "The 11th term from the last of AP: 10, 7, 4, ..., \u221262 is ___.",
          {"tip": "Total terms: \u221262=10+(n\u22121)(\u22123) \u2192 n=25. Required = (25\u221211+1)=15th. a\u2081\u2085=10+14\u00d7(\u22123)."},
          "\u221232",
          concept="Terms from the Last")

        q(n3, QuestionType.MULTI_SELECT,
          "For the AP: 21, 18, 15, ..., select ALL true statements:",
          {"choices": [
              {"id": 1, "text": "d = \u22123"},
              {"id": 2, "text": "The 8th term is 0"},
              {"id": 3, "text": "The 35th term is \u221281"},
              {"id": 4, "text": "All terms are positive"},
              {"id": 5, "text": "The 10th term is \u22126"},
          ]},
          "1,2,3,5",
          explanation="id4 false: 8th term=0, later terms are negative. id5: a\u2081\u2080=21+9\u00d7(\u22123)=\u22126 \u2713.",
          concept="nth Term Formula")

        q(n3, QuestionType.MULTI_SELECT,
          "Which statements about checking if value v is a term of AP (a, d) are TRUE?",
          {"choices": [
              {"id": 1, "text": "Solve v = a+(n\u22121)d for n"},
              {"id": 2, "text": "n must be a positive integer for v to be a term"},
              {"id": 3, "text": "If n is a fraction, then v is not a term"},
              {"id": 4, "text": "v is always a term of some AP"},
              {"id": 5, "text": "If d=0 and v\u2260a, then v is not a term"},
          ]},
          "1,2,3,5",
          explanation="id4 is false \u2014 e.g. 301 is not a term of 5,11,17,... because n=151/3 is not an integer.",
          concept="Checking if Value is a Term")

        q(n3, QuestionType.REARRANGE,
          "Check whether 301 is a term of 5, 11, 17, 23, ...:",
          {"chips": [
              "a=5, d=6. Set a\u2099=301",
              "301 = 5 + (n\u22121)\u00d76",
              "296 = (n\u22121)\u00d76",
              "n\u22121 = 296/6 = 49.33...",
              "Not a positive integer \u2192 301 is NOT a term",
          ]},
          "a=5, d=6. Set a\u2099=301 301 = 5 + (n\u22121)\u00d76 296 = (n\u22121)\u00d76 n\u22121 = 296/6 = 49.33... Not a positive integer \u2192 301 is NOT a term",
          concept="Checking if Value is a Term")

        q(n3, QuestionType.REARRANGE,
          "Determine the AP whose 3rd term is 5 and 7th term is 9:",
          {"chips": [
              "a + 2d = 5  ...(1)",
              "a + 6d = 9  ...(2)",
              "Subtract (1) from (2): 4d = 4 \u2192 d = 1",
              "Substitute into (1): a = 3",
              "AP: 3, 4, 5, 6, 7, ...",
          ]},
          "a + 2d = 5  ...(1) a + 6d = 9  ...(2) Subtract (1) from (2): 4d = 4 \u2192 d = 1 Substitute into (1): a = 3 AP: 3, 4, 5, 6, 7, ...",
          concept="Finding a and d")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 5 — Sum Formula — Derivation
        # ══════════════════════════════════════════════════════════════════════

        q(n5, QuestionType.MCQ,
          "The sum of first n terms of an AP (Gauss\u2019s formula) is:",
          {"A": "n\u00d7[a+(n\u22121)d]",
           "B": "n/2\u00d7[2a+(n\u22121)d]",
           "C": "n/2\u00d7[a+(n\u22121)d]",
           "D": "n\u00d7[2a+(n\u22121)d]"},
          "n/2\u00d7[2a+(n\u22121)d]",
          explanation="Derived by writing S forwards and backwards then adding: 2S = n[2a+(n\u22121)d].",
          concept="Sum Formula")

        q(n5, QuestionType.MCQ,
          "If first term a, last term l, and n terms: sum S =",
          {"A": "n(a+l)", "B": "n/2\u00d7(a+l)", "C": "n/2\u00d7(a\u2212l)", "D": "(a+l)/n"},
          "n/2\u00d7(a+l)",
          explanation="Each of the n pairs (first+last) sums to (a+l), and there are n/2 such pairs.",
          concept="Sum Formula with Last Term")

        q(n5, QuestionType.MCQ,
          "Sum of first 100 positive integers (Gauss\u2019s result) is:",
          {"A": "5000", "B": "5050", "C": "4950", "D": "10100"},
          "5050",
          explanation="S = 100\u00d7101/2 = 5050.",
          concept="Sum of Natural Numbers")

        q(n5, QuestionType.MCQ,
          "Sum of first 22 terms of AP: 8, 3, \u22122, ... is:",
          {"A": "979", "B": "\u2212979", "C": "869", "D": "\u2212869"},
          "\u2212979",
          explanation="a=8, d=\u22125, n=22. S = 22/2\u00d7[16+21(\u22125)] = 11\u00d7(\u221289) = \u2212979.",
          concept="Applying Sum Formula")

        q(n5, QuestionType.FILL_BLANK,
          "Sum of first n positive integers: S\u2099 = n(n+1)/___.",
          {"tip": "S = n/2(1+n) = n(n+1)/2"},
          "2",
          concept="Sum of Natural Numbers")

        q(n5, QuestionType.FILL_BLANK,
          "Sum of first 21 terms of AP: 100, 150, 200, ... (a=100, d=50) = ___.",
          {"tip": "S\u2082\u2081 = 21/2\u00d7[200 + 20\u00d750] = 21/2\u00d71200 = 21\u00d7600"},
          "12600",
          concept="Applying Sum Formula")

        q(n5, QuestionType.FILL_BLANK,
          "If S\u2099 is the sum of first n terms, then the nth term a\u2099 = S\u2099 \u2212 S___.",
          {"tip": "a\u2099 = S\u2099 \u2212 S\u2099\u208b\u2081"},
          "n\u22121",
          concept="nth Term from Sum")

        q(n5, QuestionType.MULTI_SELECT,
          "Select all correct statements about S\u2099 = n/2[2a+(n\u22121)d]:",
          {"choices": [
              {"id": 1, "text": "Works for any AP given a, d, n"},
              {"id": 2, "text": "If last term l is known, use S\u2099=n/2(a+l) instead"},
              {"id": 3, "text": "d must be positive for the formula to work"},
              {"id": 4, "text": "a\u2099 = S\u2099 \u2212 S\u2099\u208b\u2081"},
              {"id": 5, "text": "S\u2081 = a (first term)"},
          ]},
          "1,2,4,5",
          explanation="id3 is false \u2014 the formula works for any d (positive, negative, or zero).",
          concept="Sum Formula")

        q(n5, QuestionType.REARRANGE,
          "Derive S\u2099 = n/2[2a+(n\u22121)d] step by step:",
          {"chips": [
              "Write S = a + (a+d) + (a+2d) + ... + [a+(n\u22121)d]",
              "Reverse: S = [a+(n\u22121)d] + [a+(n\u22122)d] + ... + (a+d) + a",
              "Add term-wise: each pair sums to [2a+(n\u22121)d]",
              "2S = n \u00d7 [2a+(n\u22121)d]",
              "S = n/2 \u00d7 [2a+(n\u22121)d]",
          ]},
          "Write S = a + (a+d) + (a+2d) + ... + [a+(n\u22121)d] Reverse: S = [a+(n\u22121)d] + [a+(n\u22122)d] + ... + (a+d) + a Add term-wise: each pair sums to [2a+(n\u22121)d] 2S = n \u00d7 [2a+(n\u22121)d] S = n/2 \u00d7 [2a+(n\u22121)d]",
          concept="Deriving Sum Formula")

        q(n5, QuestionType.REARRANGE,
          "Apply the formula: sum of first 22 terms of AP 8, 3, \u22122, ...:",
          {"chips": [
              "a=8, d=3\u22128=\u22125, n=22",
              "S = 22/2 \u00d7 [2(8) + 21(\u22125)]",
              "= 11 \u00d7 [16 \u2212 105]",
              "= 11 \u00d7 (\u221289)",
              "= \u2212979",
          ]},
          "a=8, d=3\u22128=\u22125, n=22 S = 22/2 \u00d7 [2(8) + 21(\u22125)] = 11 \u00d7 [16 \u2212 105] = 11 \u00d7 (\u221289) = \u2212979",
          concept="Applying Sum Formula")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 6 — Applying the Sum Formula
        # ══════════════════════════════════════════════════════════════════════

        q(n6, QuestionType.MCQ,
          "If S\u2081\u2084 = 1050 and a = 10, the 20th term is:",
          {"A": "100", "B": "150", "C": "200", "D": "250"},
          "200",
          explanation="1050 = 14/2[20+13d] = 140+91d \u2192 d=10. a\u2082\u2080=10+19\u00d710=200.",
          concept="Finding Terms from Sum")

        q(n6, QuestionType.MCQ,
          "How many terms of AP: 24, 21, 18, ... give sum 78?",
          {"A": "4 only", "B": "13 only", "C": "4 or 13", "D": "5 or 10"},
          "4 or 13",
          explanation="Two answers because d<0. n\u00b2\u221217n+52=0 \u2192 (n\u22124)(n\u221213)=0 \u2192 n=4 or 13.",
          concept="Number of Terms Given Sum")

        q(n6, QuestionType.MCQ,
          "Sum of first 24 terms of AP with a\u2099 = 3 + 2n is:",
          {"A": "642", "B": "660", "C": "672", "D": "700"},
          "672",
          explanation="a\u2081=5, d=2. S\u2082\u2084 = 24/2\u00d7[10+23\u00d72] = 12\u00d756 = 672.",
          concept="Sum from nth Term Formula")

        q(n6, QuestionType.MCQ,
          "Given a = 2, d = 8, S\u2099 = 90, find n:",
          {"A": "4", "B": "5", "C": "6", "D": "8"},
          "5",
          explanation="S\u2099 = n/2[4+8(n\u22121)] = n(4n\u22122) = 90 \u2192 2n\u00b2\u2212n\u221245=0 \u2192 n=5.",
          concept="Finding n Given Sum")

        q(n6, QuestionType.FILL_BLANK,
          "AP: 7, 13, 19, ..., 205. Number of terms n = ___.",
          {"tip": "205 = 7 + (n\u22121)\u00d76 \u2192 198 = (n\u22121)\u00d76 \u2192 n\u22121 = 33"},
          "34",
          concept="Counting Terms")

        q(n6, QuestionType.FILL_BLANK,
          "Sum of first 40 positive integers divisible by 6 (AP: 6, 12, 18, ...). S\u2084\u2080 = ___.",
          {"tip": "a=6, d=6, n=40. S=40/2\u00d7[12+39\u00d76]=20\u00d7[12+234]=20\u00d7246"},
          "4920",
          concept="Sum of Multiples")

        q(n6, QuestionType.FILL_BLANK,
          "AP: 18, 15.5, 13, ..., \u221247. Number of terms n = ___.",
          {"tip": "\u221247 = 18 + (n\u22121)\u00d7(\u22122.5) \u2192 \u221265 = (n\u22121)\u00d7(\u22122.5) \u2192 n\u22121 = 26"},
          "27",
          concept="Counting Terms")

        q(n6, QuestionType.MULTI_SELECT,
          "AP: 24, 21, 18, ... sum=78 gives n=4 or 13. Which statements explain this?",
          {"choices": [
              {"id": 1, "text": "S\u2084 = S\u2081\u2083 = 78"},
              {"id": 2, "text": "Terms 5th to 13th sum to zero"},
              {"id": 3, "text": "Some terms between 5th and 13th are negative"},
              {"id": 4, "text": "d is negative so terms eventually become negative"},
              {"id": 5, "text": "The equation n\u00b2\u221217n+52=0 has two positive integer roots"},
          ]},
          "1,2,3,4,5",
          explanation="All five statements are correct explanations of why two values of n give the same sum.",
          concept="Two Values of n")

        q(n6, QuestionType.REARRANGE,
          "Find how many terms of AP: 9, 17, 25, ... give sum 636:",
          {"chips": [
              "a=9, d=8, S\u2099=636",
              "636 = n/2 \u00d7 [18 + 8(n\u22121)]",
              "1272 = n(8n+10)",
              "8n\u00b2 + 10n \u2212 1272 = 0",
              "4n\u00b2 + 5n \u2212 636 = 0 \u2192 (n\u221212)(4n+53)=0 \u2192 n=12",
          ]},
          "a=9, d=8, S\u2099=636 636 = n/2 \u00d7 [18 + 8(n\u22121)] 1272 = n(8n+10) 8n\u00b2 + 10n \u2212 1272 = 0 4n\u00b2 + 5n \u2212 636 = 0 \u2192 (n\u221212)(4n+53)=0 \u2192 n=12",
          concept="Finding n Given Sum")

        q(n6, QuestionType.REARRANGE,
          "Find sum of AP: 7 + 10\u00bd + 14 + ... + 84:",
          {"chips": [
              "a=7, d=3.5, last term l=84",
              "n: 84=7+(n\u22121)\u00d73.5 \u2192 n=23",
              "S = 23/2 \u00d7 (7+84)",
              "= 23/2 \u00d7 91",
              "= 1046.5",
          ]},
          "a=7, d=3.5, last term l=84 n: 84=7+(n\u22121)\u00d73.5 \u2192 n=23 S = 23/2 \u00d7 (7+84) = 23/2 \u00d7 91 = 1046.5",
          concept="Sum Formula with Last Term")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 7 — AP Word Problems
        # ══════════════════════════════════════════════════════════════════════

        q(n7, QuestionType.MCQ,
          "Reena\u2019s starting salary is \u20b98000 with \u20b9500 annual increment. Her salary in the 15th year is:",
          {"A": "\u20b914,000", "B": "\u20b914,500", "C": "\u20b915,000", "D": "\u20b915,500"},
          "\u20b915,000",
          explanation="a\u2081\u2085 = 8000 + 14\u00d7500 = 8000 + 7000 = 15000.",
          concept="AP in Salary Problems")

        q(n7, QuestionType.MCQ,
          "A manufacturer produced 600 TV sets in year 3 and 700 in year 7. Production in year 1 is:",
          {"A": "500", "B": "525", "C": "550", "D": "575"},
          "550",
          explanation="a+2d=600, a+6d=700 \u2192 4d=100 \u2192 d=25. a=550.",
          concept="AP in Production Problems")

        q(n7, QuestionType.MCQ,
          "In a flower bed, first row=23 rose plants, each row has 2 fewer plants. Last row=5. Number of rows:",
          {"A": "8", "B": "9", "C": "10", "D": "12"},
          "10",
          explanation="5 = 23 + (n\u22121)(\u22122) \u2192 \u221218 = (n\u22121)(\u22122) \u2192 n=10.",
          concept="AP in Counting Problems")

        q(n7, QuestionType.MCQ,
          "Subba Rao started at \u20b95000/year in 1995 with \u20b9200/year increment. Year his income reaches \u20b97000:",
          {"A": "2004", "B": "2005", "C": "2010", "D": "2015"},
          "2005",
          explanation="7000 = 5000+(n\u22121)\u00d7200 \u2192 n\u22121=10 \u2192 n=11. 11th year from 1995: 1995+(11\u22121)=2005.",
          concept="AP in Salary Problems")

        q(n7, QuestionType.FILL_BLANK,
          "\u20b91000 at 8% simple interest per year. Interest forms AP: 80, 160, 240, ... Interest at end of 30 years = \u20b9___.",
          {"tip": "a=80, d=80. a\u2083\u2080 = 80 + 29\u00d780 = 80\u00d730"},
          "2400",
          concept="AP and Simple Interest")

        q(n7, QuestionType.FILL_BLANK,
          "TV manufacturer: 600 sets in year 3, 700 in year 7, d=25, a=550. Total production in first 7 years = ___.",
          {"tip": "S\u2087 = 7/2\u00d7[2\u00d7550+6\u00d725] = 7/2\u00d7[1100+150] = 7/2\u00d71250"},
          "4375",
          concept="Sum in Production Problems")

        q(n7, QuestionType.FILL_BLANK,
          "Ramkali saves \u20b95 in week 1, increasing \u20b91.75 each week. In which week does she save \u20b920.75? n = ___.",
          {"tip": "20.75 = 5 + (n\u22121)\u00d71.75 \u2192 15.75 = (n\u22121)\u00d71.75 \u2192 n\u22121=9"},
          "10",
          concept="AP in Savings Problems")

        q(n7, QuestionType.MULTI_SELECT,
          "\u20b9700 in 7 cash prizes, each \u20b920 less than previous. Which are true?",
          {"choices": [
              {"id": 1, "text": "Prizes form AP with d = \u221220"},
              {"id": 2, "text": "Sum of all prizes = 700"},
              {"id": 3, "text": "If largest prize = a: a+(a\u221220)+...+(a\u2212120)=700"},
              {"id": 4, "text": "Largest prize = \u20b9160"},
              {"id": 5, "text": "Smallest prize = \u20b940"},
          ]},
          "1,2,3,4,5",
          explanation="7a\u221220(0+1+2+3+4+5+6)=700 \u2192 7a\u2212420=700 \u2192 a=160. Smallest=160\u2212120=40.",
          concept="AP in Prize Distribution")

        q(n7, QuestionType.MULTI_SELECT,
          "200 logs stacked: 20 in bottom row, 19 in next, 18 next, ... Which are true?",
          {"choices": [
              {"id": 1, "text": "Rows form AP with a=20, d=\u22121"},
              {"id": 2, "text": "Number of rows = 16"},
              {"id": 3, "text": "Top row has 5 logs"},
              {"id": 4, "text": "Sum formula verifies total = 200"},
              {"id": 5, "text": "Number of rows = 20"},
          ]},
          "1,2,3,4",
          explanation="S\u2099=200: n/2(20+(21\u2212n))=200 \u2192 n(41\u2212n)=400 \u2192 n=16. Top row=20\u221215=5 logs. \u2713",
          concept="AP in Stacking Problems")

        q(n7, QuestionType.MULTI_SELECT,
          "School plants trees: Class I=1/section, ..., Class XII=12/section, 3 sections each. Select all true:",
          {"choices": [
              {"id": 1, "text": "Each class contributes 3\u00d7class_number trees"},
              {"id": 2, "text": "Total = 3\u00d7(1+2+...+12)"},
              {"id": 3, "text": "Total trees = 234"},
              {"id": 4, "text": "This uses AP sum with a=3, d=3, n=12"},
              {"id": 5, "text": "1+2+...+12 = 78"},
          ]},
          "1,2,3,4,5",
          explanation="S\u2081\u2082 = 12\u00d713/2 = 78. Total = 3\u00d778 = 234.",
          concept="AP in School Problems")

        q(n7, QuestionType.REARRANGE,
          "Find Reena\u2019s salary in year 25 (a=8000, d=500):",
          {"chips": [
              "a\u2099 = a + (n\u22121)d",
              "a\u2082\u2085 = 8000 + (25\u22121)\u00d7500",
              "= 8000 + 24\u00d7500",
              "= 8000 + 12000",
              "= \u20b920,000",
          ]},
          "a\u2099 = a + (n\u22121)d a\u2082\u2085 = 8000 + (25\u22121)\u00d7500 = 8000 + 24\u00d7500 = 8000 + 12000 = \u20b920,000",
          concept="AP in Salary Problems")

        q(n7, QuestionType.REARRANGE,
          "Find total TV production in first 7 years (a=550, d=25):",
          {"chips": [
              "S\u2087 = 7/2 \u00d7 [2\u00d7550 + 6\u00d725]",
              "= 7/2 \u00d7 [1100 + 150]",
              "= 7/2 \u00d7 1250",
              "= 7 \u00d7 625",
              "= 4375 TV sets",
          ]},
          "S\u2087 = 7/2 \u00d7 [2\u00d7550 + 6\u00d725] = 7/2 \u00d7 [1100 + 150] = 7/2 \u00d7 1250 = 7 \u00d7 625 = 4375 TV sets",
          concept="Sum in Production Problems")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 9 — Advanced Problems and Special Cases
        # ══════════════════════════════════════════════════════════════════════

        q(n9, QuestionType.MCQ,
          "If S\u2099 = 4n \u2212 n\u00b2 for an AP, the first term a\u2081 is:",
          {"A": "4", "B": "3", "C": "2", "D": "1"},
          "3",
          explanation="a\u2081 = S\u2081 = 4(1) \u2212 1\u00b2 = 3.",
          concept="nth Term from Sum Formula")

        q(n9, QuestionType.MCQ,
          "For AP with S\u2099 = 4n \u2212 n\u00b2, the nth term a\u2099 is:",
          {"A": "4\u2212n", "B": "5\u22122n", "C": "3\u22122n", "D": "n\u22123"},
          "5\u22122n",
          explanation="a\u2099 = S\u2099 \u2212 S\u2099\u208b\u2081 = (4n\u2212n\u00b2)\u2212(4(n\u22121)\u2212(n\u22121)\u00b2) = 5\u22122n.",
          concept="nth Term from Sum Formula")

        q(n9, QuestionType.MCQ,
          "Two APs have same common difference. Their 100th terms differ by 100. Their 1000th terms differ by:",
          {"A": "100", "B": "1000", "C": "900", "D": "10"},
          "100",
          explanation="a\u2099=a+(n\u22121)d and b\u2099=b+(n\u22121)d. Difference = a\u2212b always. So both 100th and 1000th terms differ by a\u2212b=100.",
          concept="Difference of APs")

        q(n9, QuestionType.MCQ,
          "If sum of first 7 terms is 49 and sum of first 17 terms is 289, sum of first n terms is:",
          {"A": "n", "B": "n\u00b2", "C": "n\u00b2+n", "D": "2n"},
          "n\u00b2",
          explanation="S\u2087=49=7\u00b2, S\u2081\u2087=289=17\u00b2. Pattern: S\u2099=n\u00b2. Verified: a=1, d=2.",
          concept="Sum as Function of n")

        q(n9, QuestionType.FILL_BLANK,
          "For S\u2099 = 4n \u2212 n\u00b2, the 10th term a\u2081\u2080 = ___.",
          {"tip": "a\u2099 = 5\u22122n. a\u2081\u2080 = 5\u221220 = \u221215. Or: S\u2081\u2080\u2212S\u2089=(40\u2212100)\u2212(36\u221281)."},
          "\u221215",
          concept="nth Term from Sum Formula")

        q(n9, QuestionType.FILL_BLANK,
          "AP: 3, 8, 13, ..., 253. The 20th term from the last = ___.",
          {"tip": "Total terms: 253=3+(n\u22121)5 \u2192 n=51. 20th from last = (51\u221220+1)=32nd. a\u2083\u2082=3+31\u00d75."},
          "158",
          concept="Terms from the Last")

        q(n9, QuestionType.MULTI_SELECT,
          "For S\u2099 = 4n \u2212 n\u00b2, which are true?",
          {"choices": [
              {"id": 1, "text": "a\u2081 = 3"},
              {"id": 2, "text": "a\u2082 = 1"},
              {"id": 3, "text": "The AP is 3, 1, \u22121, \u22123, ..."},
              {"id": 4, "text": "d = \u22122"},
              {"id": 5, "text": "S\u2081\u2080 = \u221260"},
          ]},
          "1,2,3,4,5",
          explanation="S\u2082=4(2)\u22124=4. a\u2082=4\u22123=1. AP: 3,1,\u22121,... d=\u22122. S\u2081\u2080=40\u2212100=\u221260.",
          concept="nth Term from Sum Formula")

        q(n9, QuestionType.MULTI_SELECT,
          "Which correctly describe the arithmetic mean?",
          {"choices": [
              {"id": 1, "text": "If a, b, c are in AP then b = (a+c)/2"},
              {"id": 2, "text": "b is called the arithmetic mean of a and c"},
              {"id": 3, "text": "Arithmetic mean of 3 and 9 is 6"},
              {"id": 4, "text": "Arithmetic mean is always the middle term of a 3-term AP"},
              {"id": 5, "text": "Formula b=(a+c)/2 only works when d > 0"},
          ]},
          "1,2,3,4",
          explanation="id5 is false \u2014 the arithmetic mean formula works regardless of the sign of d.",
          concept="Arithmetic Mean")

        q(n9, QuestionType.REARRANGE,
          "Find S\u2099 = n\u00b2 from S\u2087 = 49 and S\u2081\u2087 = 289:",
          {"chips": [
              "S\u2087=49: 7/2[2a+6d]=49 \u2192 2a+6d=14",
              "S\u2081\u2087=289: 17/2[2a+16d]=289 \u2192 2a+16d=34",
              "Subtract: 10d=20 \u2192 d=2",
              "2a+12=14 \u2192 a=1",
              "S\u2099 = n/2[2+2(n\u22121)] = n\u00b2",
          ]},
          "S\u2087=49: 7/2[2a+6d]=49 \u2192 2a+6d=14 S\u2081\u2087=289: 17/2[2a+16d]=289 \u2192 2a+16d=34 Subtract: 10d=20 \u2192 d=2 2a+12=14 \u2192 a=1 S\u2099 = n/2[2+2(n\u22121)] = n\u00b2",
          concept="Sum as Function of n")

        q(n9, QuestionType.REARRANGE,
          "Find the 31st term of AP whose 11th term = 38 and 16th term = 73:",
          {"chips": [
              "a+10d=38  ...(1)",
              "a+15d=73  ...(2)",
              "Subtract: 5d=35 \u2192 d=7",
              "From (1): a=38\u221270=\u221232",
              "a\u2083\u2081 = \u221232 + 30\u00d77 = 178",
          ]},
          "a+10d=38  ...(1) a+15d=73  ...(2) Subtract: 5d=35 \u2192 d=7 From (1): a=38\u221270=\u221232 a\u2083\u2081 = \u221232 + 30\u00d77 = 178",
          concept="Finding a and d")

        # ══════════════════════════════════════════════════════════════════════
        # NODE 10 — Chapter Test
        # ══════════════════════════════════════════════════════════════════════

        q(n10, QuestionType.MCQ,
          "Which is NOT an AP?",
          {"A": "2, 5/2, 3, 7/2, ...",
           "B": "\u221210, \u22126, \u22122, 2, ...",
           "C": "1, 3, 9, 27, ...",
           "D": "3, 3, 3, 3, ..."},
          "1, 3, 9, 27, ...",
          explanation="Ratios constant (\u00d73), not differences. This is a geometric progression.",
          concept="Identifying an AP")

        q(n10, QuestionType.MCQ,
          "The 11th term of AP: \u22123, \u22121/2, 2, ... is:",
          {"A": "28", "B": "22", "C": "25", "D": "20"},
          "22",
          explanation="a=\u22123, d=5/2. a\u2081\u2081=\u22123+10\u00d7(5/2)=\u22123+25=22.",
          concept="nth Term Formula")

        q(n10, QuestionType.MCQ,
          "If 3rd and 9th terms of an AP are 4 and \u22128 respectively, which term is zero?",
          {"A": "4th", "B": "5th", "C": "6th", "D": "7th"},
          "5th",
          explanation="a+2d=4, a+8d=\u22128 \u2192 6d=\u221212 \u2192 d=\u22122, a=8. 8+(n\u22121)(\u22122)=0 \u2192 n=5.",
          concept="Finding n Given aₙ")

        q(n10, QuestionType.MCQ,
          "Sum of first 15 multiples of 8 is:",
          {"A": "920", "B": "960", "C": "1000", "D": "1080"},
          "960",
          explanation="AP: 8,16,...,120. S\u2081\u2085=15/2\u00d7(8+120)=15/2\u00d7128=960.",
          concept="Sum of Multiples")

        q(n10, QuestionType.MCQ,
          "Sum of first 15 terms of AP: a\u2099 = 9 \u2212 5n is:",
          {"A": "\u2212480", "B": "\u2212465", "C": "\u2212450", "D": "\u2212420"},
          "\u2212465",
          explanation="a\u2081=4, d=\u22125. S\u2081\u2085=15/2\u00d7[8+14\u00d7(\u22125)]=15/2\u00d7(\u221262)=\u2212465.",
          concept="Sum from nth Term Formula")

        q(n10, QuestionType.FILL_BLANK,
          "AP: 3, 15, 27, 39, ... Which term is 132 more than its 54th term? n = ___.",
          {"tip": "a\u2099\u2212a\u2085\u2084=132. (n\u221254)\u00d7d=132. d=12. n\u221254=11."},
          "65",
          concept="nth Term Formula")

        q(n10, QuestionType.FILL_BLANK,
          "AP of 50 terms: 3rd term=12, last term=106. The 29th term = ___.",
          {"tip": "a+2d=12, a+49d=106 \u2192 47d=94 \u2192 d=2, a=8. a\u2082\u2089=8+28\u00d72."},
          "64",
          concept="nth Term Formula")

        q(n10, QuestionType.FILL_BLANK,
          "Sum of odd numbers between 0 and 50 (AP: 1, 3, 5, ..., 49). Sum = ___.",
          {"tip": "n=25, a=1, l=49. S=25/2\u00d7(1+49)=25\u00d725."},
          "625",
          concept="Sum Formula")

        q(n10, QuestionType.MULTI_SELECT,
          "For AP: a\u2099 = 3 + 4n, which are true?",
          {"choices": [
              {"id": 1, "text": "It is an AP with d = 4"},
              {"id": 2, "text": "a\u2081 = 7"},
              {"id": 3, "text": "S\u2081\u2085 = 525"},
              {"id": 4, "text": "a\u2081 = 3 (incorrect)"},
              {"id": 5, "text": "S\u2081\u2085 = 15/2\u00d7[14+56] = 525"},
          ]},
          "1,2,3,5",
          explanation="a\u2081=3+4=7. d=4. S\u2081\u2085=15/2\u00d7(14+56)=15/2\u00d770=525.",
          concept="Sum from nth Term Formula")

        q(n10, QuestionType.MULTI_SELECT,
          "Construction penalty: \u20b9200 day 1, \u20b9250 day 2, \u20b9300 day 3, ... For 30-day delay:",
          {"choices": [
              {"id": 1, "text": "AP with a=200, d=50"},
              {"id": 2, "text": "Penalty on 30th day = \u20b91650"},
              {"id": 3, "text": "Total penalty = S\u2083\u2080"},
              {"id": 4, "text": "Total penalty = \u20b927750"},
              {"id": 5, "text": "Total penalty = \u20b927000"},
          ]},
          "1,2,3,4",
          explanation="a\u2083\u2080=200+29\u00d750=1650. S\u2083\u2080=30/2\u00d7(200+1650)=15\u00d71850=27750.",
          concept="AP Word Problems")

        q(n10, QuestionType.REARRANGE,
          "Determine AP whose 3rd term=16 and 7th term exceeds 5th term by 12:",
          {"chips": [
              "7th exceeds 5th by 12 \u2192 2d=12 \u2192 d=6",
              "a\u2083 = a+2d = 16 \u2192 a+12=16 \u2192 a=4",
              "AP: 4, 10, 16, 22, 28, ...",
          ]},
          "7th exceeds 5th by 12 \u2192 2d=12 \u2192 d=6 a\u2083 = a+2d = 16 \u2192 a+12=16 \u2192 a=4 AP: 4, 10, 16, 22, 28, ...",
          concept="Finding a and d")

        q(n10, QuestionType.REARRANGE,
          "Sum of first 51 terms of AP with 2nd term=14, 3rd term=18:",
          {"chips": [
              "d = 18 \u2212 14 = 4",
              "a = 14 \u2212 4 = 10",
              "S\u2085\u2081 = 51/2 \u00d7 [2\u00d710 + 50\u00d74]",
              "= 51/2 \u00d7 [20 + 200]",
              "= 51/2 \u00d7 220 = 51\u00d7110 = 5610",
          ]},
          "d = 18 \u2212 14 = 4 a = 14 \u2212 4 = 10 S\u2085\u2081 = 51/2 \u00d7 [2\u00d710 + 50\u00d74] = 51/2 \u00d7 [20 + 200] = 51/2 \u00d7 220 = 51\u00d7110 = 5610",
          concept="Applying Sum Formula")

        # ══════════════════════════════════════════════════════════════════════
        # FLASHCARD DECKS
        # ══════════════════════════════════════════════════════════════════════

        self.stdout.write("Creating flashcard decks...")

        deck1 = FlashcardDeck.objects.create(
            title="Arithmetic Progressions \u2014 Formulae",
            course_unit=unit,
            purpose=DeckPurpose.PREREQUISITE,
        )

        cards_deck1 = [
            {
                "title": "nth Term Formula",
                "body": "a\u2099 = a + (n\u22121)d\nWhere a = first term, d = common difference, n = position.\nLast term: l = a + (m\u22121)d for m-term AP.",
                "type": FlashcardType.FORMULA,
                "concept": "nth Term",
            },
            {
                "title": "Sum Formula (with d)",
                "body": "S\u2099 = n/2 \u00d7 [2a + (n\u22121)d]\nDerived by Gauss: write sum forwards + backwards, add pairs.",
                "type": FlashcardType.FORMULA,
                "concept": "Sum Formula",
            },
            {
                "title": "Sum Formula (with last term)",
                "body": "S\u2099 = n/2 \u00d7 (a + l)\nUse when first term a and last term l are both known.",
                "type": FlashcardType.FORMULA,
                "concept": "Sum Formula",
            },
            {
                "title": "Sum of First n Positive Integers",
                "body": "S\u2099 = n(n+1)/2\nSpecial case: a=1, d=1. Gauss computed 1+2+...+100=5050.",
                "type": FlashcardType.FORMULA,
                "concept": "Special Sums",
            },
            {
                "title": "General Form of AP",
                "body": "a, a+d, a+2d, a+3d, ...\nCommon difference d = a\u2096\u208a\u2081 \u2212 a\u2096 for any k.",
                "type": FlashcardType.CONCEPT,
                "concept": "AP Definition",
            },
        ]

        for order, card_data in enumerate(cards_deck1, start=1):
            fc = Flashcard.objects.create(
                title=card_data["title"],
                body=card_data["body"],
                card_type=card_data["type"],
                concept=card_data["concept"],
                subject='Mathematics',
                chapter='Arithmetic Progressions',
            )
            DeckCard.objects.create(deck=deck1, card=fc, order=order)

        deck2 = FlashcardDeck.objects.create(
            title="Arithmetic Progressions \u2014 Methods",
            course_unit=unit,
            purpose=DeckPurpose.POST_NODE,
        )

        cards_deck2 = [
            {
                "title": "Finding Which Term a Value Is",
                "body": "Set v = a+(n\u22121)d and solve for n.\nIf n is not a positive integer \u2192 v is not a term of the AP.",
                "type": FlashcardType.CONCEPT,
                "concept": "nth Term",
            },
            {
                "title": "nth Term from Sum",
                "body": "a\u2099 = S\u2099 \u2212 S\u2099\u208b\u2081\nUseful when S\u2099 is given as a formula (e.g. S\u2099=4n\u2212n\u00b2).",
                "type": FlashcardType.CONCEPT,
                "concept": "Sum and Terms",
            },
            {
                "title": "Two-Equation Method",
                "body": "Given a\u209a and a\u1d67: form two equations a+(p\u22121)d=a\u209a and a+(q\u22121)d=a\u1d67.\nSubtract to find d, then substitute to find a.",
                "type": FlashcardType.CONCEPT,
                "concept": "Solving for a and d",
            },
            {
                "title": "Rejecting Invalid Roots",
                "body": "In word problems (lengths, counts, years): n must be a positive integer.\nReject negative or fractional solutions.",
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
                chapter='Arithmetic Progressions',
            )
            DeckCard.objects.create(deck=deck2, card=fc, order=order)

        # ══════════════════════════════════════════════════════════════════════
        # REVISION NODE
        # ══════════════════════════════════════════════════════════════════════

        RevisionNode.objects.create(
            path=path,
            appears_after_node=n9,
            side='right',
            xp_reward=20,
            title="AP Quick Review",
        )

        self.stdout.write(self.style.SUCCESS(
            "\nChapter 5 seeded successfully!\n"
            "  \u2022 7 lesson nodes (orders 1,2,3,5,6,7,9)\n"
            "  \u2022 2 lab nodes: AP_TERM_EXPLORER_LAB (order=4, unlock after 3), AP_SUM_VISUALIZER_LAB (order=8, unlock after 6)\n"
            "  \u2022 1 chapter test (order=10, 12 questions)\n"
            "  \u2022 10+10+12+10+10+12+10+12 = 86 questions total\n"
            "  \u2022 2 flashcard decks + 1 revision node\n"
            "  \u2022 Aligned with NCERT Class 10 Chapter 5 (Arithmetic Progressions)"
        ))
