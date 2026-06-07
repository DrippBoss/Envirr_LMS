"""Mock Test v2 views — imported in urls.py."""
import random
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import views
from rest_framework.response import Response

from .models import WeakSpot, MockTestAttempt
from .views import IsStudent


def _serialize_bank_question(bq):
    opts, correct_key = {}, ''
    if bq.question_type in ('MCQ', 'ASSERTION_REASON'):
        for o in bq.options.order_by('order'):
            opts[o.option_label] = o.option_text
            if o.is_correct:
                correct_key = o.option_label
    case_parts = []
    if bq.question_type == 'CASE':
        for p in bq.case_parts.order_by('part_number'):
            case_parts.append({
                'part_number': p.part_number,
                'part_text':   p.part_text,
                'part_answer': p.part_answer,
                'marks':       p.marks,
            })
    return {
        'id':            bq.id,
        'question_type': bq.question_type,
        'question_text': bq.question_text,
        'marks':         bq.marks,
        'difficulty':    bq.difficulty,
        'chapter':       bq.chapter,
        'subject':       bq.subject,
        'has_image':     bq.has_image,
        'image_url':     bq.image.url if bq.has_image and bq.image else None,
        'options_json':  opts,
        'correct_key':   correct_key,
        'answer_text':   bq.answer_text or '',
        'case_parts':    case_parts,
    }


def _grade(bq, given: str):
    """Return (is_correct, correct_display). is_correct=None means self-mark."""
    given = (given or '').strip()
    if bq.question_type in ('MCQ', 'ASSERTION_REASON'):
        correct_opt = bq.options.filter(is_correct=True).first()
        if not correct_opt:
            return False, ''
        ck = correct_opt.option_label
        opts = {o.option_label: o.option_text for o in bq.options.all()}
        return given.lower() == ck.lower(), f"{ck}: {opts.get(ck, '')}"
    elif bq.question_type == 'VERY_SHORT':
        correct = (bq.answer_text or '').strip()
        return given.lower() == correct.lower(), correct
    else:
        return None, bq.answer_text or ''


class MockTestGenerateView(views.APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        from ai_engine.models import QuestionBank

        subject    = request.data.get('subject', 'Mathematics')
        chapters   = request.data.get('chapters', [])
        count      = min(int(request.data.get('count', 10)), 40)
        difficulty = request.data.get('difficulty', 'mixed')
        time_limit = request.data.get('time_limit')
        types      = request.data.get('types') or ['MCQ', 'ASSERTION_REASON', 'VERY_SHORT', 'SHORT', 'LONG']

        qs = QuestionBank.objects.filter(
            subject__iexact=subject, question_type__in=types
        ).prefetch_related('options', 'case_parts')
        if chapters:
            qs = qs.filter(chapter__in=chapters)
        if difficulty != 'mixed':
            qs = qs.filter(difficulty=difficulty)

        pool = list(qs)
        random.shuffle(pool)
        selected = pool[:count]

        attempt = MockTestAttempt.objects.create(
            student=request.user.profile,
            subject=subject,
            chapters=chapters,
            difficulty=difficulty,
            time_limit=time_limit,
            question_ids=[q.id for q in selected],
            total=len(selected),
        )
        return Response({
            'attempt_id': attempt.id,
            'questions':  [_serialize_bank_question(q) for q in selected],
        })


class MockTestSubmitView(views.APIView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_id):
        from ai_engine.models import QuestionBank

        attempt = get_object_or_404(MockTestAttempt, pk=attempt_id, student=request.user.profile)
        if attempt.completed:
            return Response({'detail': 'Already submitted.'}, status=400)

        answers    = request.data.get('answers', {})
        time_taken = request.data.get('time_taken')

        questions = {
            q.id: q for q in QuestionBank.objects.filter(id__in=attempt.question_ids)
                          .prefetch_related('options', 'case_parts')
        }

        results, score, chapter_map = [], 0, {}

        for qid in attempt.question_ids:
            bq = questions.get(qid)
            if not bq:
                continue
            given = str(answers.get(str(qid), '')).strip()
            is_correct, correct_display = _grade(bq, given)

            results.append({
                'id':              qid,
                'question_text':   bq.question_text,
                'question_type':   bq.question_type,
                'chapter':         bq.chapter,
                'marks':           bq.marks,
                'given':           given,
                'correct_display': correct_display,
                'is_correct':      is_correct,
                'image_url':       bq.image.url if bq.has_image and bq.image else None,
            })

            ch = bq.chapter
            chapter_map.setdefault(ch, {'correct': 0, 'total': 0})
            chapter_map[ch]['total'] += 1

            if is_correct is True:
                score += 1
                chapter_map[ch]['correct'] += 1
                WeakSpot.objects.filter(
                    student=request.user.profile, chapter=ch, is_resolved=False
                ).update(is_resolved=True)
            elif is_correct is False:
                spot, _ = WeakSpot.objects.get_or_create(
                    student=request.user.profile,
                    chapter=ch,
                    concept=ch,
                    defaults={'subject': bq.subject, 'wrong_count': 0},
                )
                spot.wrong_count += 1
                spot.last_wrong_at = timezone.now()
                spot.is_resolved = False
                spot.save()

        attempt.answers      = answers
        attempt.results      = results
        attempt.score        = score
        attempt.time_taken   = time_taken
        attempt.completed    = True
        attempt.completed_at = timezone.now()
        attempt.save()

        auto_gradeable = [r for r in results if r['is_correct'] is not None]
        auto_total     = len(auto_gradeable)
        auto_score     = sum(1 for r in auto_gradeable if r['is_correct'])

        return Response({
            'score':             score,
            'total':             attempt.total,
            'auto_score':        auto_score,
            'auto_total':        auto_total,
            'pct':               round(auto_score / auto_total * 100) if auto_total else 0,
            'time_taken':        time_taken,
            'results':           results,
            'chapter_breakdown': [
                {'chapter': ch, **v, 'pct': round(v['correct'] / v['total'] * 100) if v['total'] else 0}
                for ch, v in chapter_map.items()
            ],
        })


class MockTestHistoryView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        attempts = MockTestAttempt.objects.filter(
            student=request.user.profile, completed=True
        )[:20]
        return Response([{
            'id':           a.id,
            'subject':      a.subject,
            'chapters':     a.chapters,
            'score':        a.score,
            'total':        a.total,
            'pct':          round(a.score / a.total * 100) if a.total else 0,
            'time_taken':   a.time_taken,
            'difficulty':   a.difficulty,
            'completed_at': a.completed_at,
        } for a in attempts])
