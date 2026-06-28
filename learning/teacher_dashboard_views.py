"""
Teacher dashboard aggregate endpoint.

Surfaces real class-performance analytics, a recent-activity feed and a
pending-work summary, all computed live from existing models
(NodeProgress, SessionAnswer, WeakSpot, DoubtTicket, QuestionPaper).
No new persistence — everything here is derived from data students already
generate. Teachers are scoped to their `assigned_subjects` (falling back to
the subjects of their assigned courses); admins see everything.
"""
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone

from .wizard_views import IsTeacherOrAdmin
from .models import CourseUnit, NodeProgress, SessionAnswer, WeakSpot
from ai_engine.models import DoubtTicket, QuestionPaper


def _teacher_subjects(user):
    """Subjects this user may see. None ⇒ unrestricted (admin / no scoping)."""
    if getattr(user, 'role', None) == 'admin':
        return None
    subjects = list(getattr(user, 'assigned_subjects', None) or [])
    if not subjects:
        # Fall back to the subjects of courses assigned to this teacher.
        subjects = list(
            CourseUnit.objects.filter(assigned_teacher=user)
            .values_list('subject', flat=True).distinct()
        )
    return subjects


class TeacherDashboardView(APIView):
    """GET /api/teacher/dashboard/ — class analytics, activity & pending work."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request):
        user = request.user
        subjects = _teacher_subjects(user)
        now = timezone.now()
        week_ago = now - timedelta(days=7)

        # ── Scoped querysets ────────────────────────────────────────────────
        progress = NodeProgress.objects.select_related(
            'student__user', 'node__path__unit'
        )
        answers = SessionAnswer.objects.all()
        weak = WeakSpot.objects.filter(is_resolved=False)
        doubts = DoubtTicket.objects.select_related(
            'student', 'lesson__path__unit'
        )
        if subjects is not None:
            if not subjects:
                # Teacher with no subjects and no assigned courses → empty dashboard.
                return Response(self._empty_payload())
            progress = progress.filter(node__path__unit__subject__in=subjects)
            answers = answers.filter(node__path__unit__subject__in=subjects)
            weak = weak.filter(subject__in=subjects)
            doubts = doubts.filter(
                Q(lesson__isnull=True) | Q(lesson__path__unit__subject__in=subjects)
            )

        # ── Headline KPIs ───────────────────────────────────────────────────
        total_rows = progress.count()
        completed_rows = progress.filter(status='COMPLETED').count()
        students_engaged = progress.values('student').distinct().count()
        active_7d = (
            progress.filter(last_attempted_at__gte=week_ago)
            .values('student').distinct().count()
        )
        ans_total = answers.count()
        ans_correct = answers.filter(is_correct=True).count()

        avg_completion = round(100 * completed_rows / total_rows) if total_rows else 0
        avg_accuracy = round(100 * ans_correct / ans_total) if ans_total else 0

        courses_qs = CourseUnit.objects.filter(is_published=True)
        if subjects is not None:
            courses_qs = courses_qs.filter(subject__in=subjects)
        course_count = (
            CourseUnit.objects.filter(assigned_teacher=user).count()
            if getattr(user, 'role', None) == 'teacher' else courses_qs.count()
        )

        pending_doubts = doubts.exclude(status='resolved').count()
        compiling_papers = QuestionPaper.objects.filter(
            created_by=user, status__in=['pending', 'processing']
        ).count()

        # ── Per-subject performance ─────────────────────────────────────────
        subj_perf = []
        subj_keys = subjects if subjects is not None else list(
            progress.values_list('node__path__unit__subject', flat=True).distinct()
        )
        for subj in subj_keys:
            p = progress.filter(node__path__unit__subject=subj)
            a = answers.filter(node__path__unit__subject=subj)
            p_total = p.count()
            if not p_total and not a.count():
                continue
            a_total = a.count()
            subj_perf.append({
                'subject': subj,
                'students': p.values('student').distinct().count(),
                'completion': round(100 * p.filter(status='COMPLETED').count() / p_total) if p_total else 0,
                'accuracy': round(100 * a.filter(is_correct=True).count() / a_total) if a_total else 0,
            })
        subj_perf.sort(key=lambda s: s['students'], reverse=True)

        # ── Class-wide weak topics ──────────────────────────────────────────
        weak_topics = list(
            weak.values('subject', 'chapter', 'concept')
            .annotate(students=Count('student', distinct=True),
                      total_wrong=Count('id'))
            .order_by('-students', '-total_wrong')[:8]
        )

        # ── Recent activity feed (merged + sorted) ──────────────────────────
        feed = []
        for np in (progress.filter(status='COMPLETED', completed_at__isnull=False)
                   .order_by('-completed_at')[:10]):
            feed.append({
                'type': 'completion',
                'student': np.student.user.get_full_name() or np.student.user.username,
                'detail': np.node.title,
                'subject': np.node.path.unit.subject if np.node.path and np.node.path.unit else '',
                'at': np.completed_at.isoformat(),
            })
        for d in doubts.order_by('-created_at')[:10]:
            feed.append({
                'type': 'doubt',
                'student': d.student.get_full_name() or d.student.username,
                'detail': d.question_text[:120],
                'subject': d.lesson.path.unit.subject if d.lesson and d.lesson.path and d.lesson.path.unit else '',
                'status': d.status,
                'at': d.created_at.isoformat(),
            })
        for paper in QuestionPaper.objects.filter(created_by=user).order_by('-created_at')[:6]:
            feed.append({
                'type': 'paper',
                'student': '',
                'detail': paper.title,
                'subject': getattr(paper, 'subject', '') or '',
                'status': paper.status,
                'at': paper.created_at.isoformat(),
            })
        feed.sort(key=lambda e: e['at'], reverse=True)
        feed = feed[:14]

        return Response({
            'kpis': {
                'students': students_engaged,
                'active_7d': active_7d,
                'courses': course_count,
                'avg_completion': avg_completion,
                'avg_accuracy': avg_accuracy,
                'pending_doubts': pending_doubts,
                'compiling_papers': compiling_papers,
            },
            'subjects': subj_perf,
            'weak_topics': weak_topics,
            'activity': feed,
            'scope': 'all' if subjects is None else subjects,
        })

    @staticmethod
    def _empty_payload():
        return {
            'kpis': {'students': 0, 'active_7d': 0, 'courses': 0, 'avg_completion': 0,
                     'avg_accuracy': 0, 'pending_doubts': 0, 'compiling_papers': 0},
            'subjects': [], 'weak_topics': [], 'activity': [], 'scope': [],
        }
