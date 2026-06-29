"""
Assignments & Calendar — teacher CRUD + student views.

Assignments are targeted by class grade (mirrors the rest of the app's
scoping); a student sees an assignment when their profile grade matches.
Calendar events with a matching (or blank) class_grade surface to students as
a read-only agenda alongside their assignment due-dates.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .views import IsStudent
from .wizard_views import IsTeacherOrAdmin
from .models import Assignment, AssignmentSubmission, CalendarEvent, SubmissionStatus
from .serializers import (
    AssignmentSerializer, AssignmentSubmissionSerializer, CalendarEventSerializer,
)


# ── Teacher: assignments ─────────────────────────────────────────────────────
class TeacherAssignmentListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request):
        qs = Assignment.objects.prefetch_related('submissions')
        if request.user.role != 'admin':
            qs = qs.filter(created_by=request.user)
        return Response(AssignmentSerializer(qs, many=True).data)

    def post(self, request):
        ser = AssignmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(created_by=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)


class TeacherAssignmentDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def _get(self, request, pk):
        qs = Assignment.objects.all()
        if request.user.role != 'admin':
            qs = qs.filter(created_by=request.user)
        return get_object_or_404(qs, pk=pk)

    def patch(self, request, pk):
        a = self._get(request, pk)
        ser = AssignmentSerializer(a, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        self._get(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssignmentSubmissionListView(APIView):
    """Submissions for one assignment (grading queue)."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request, pk):
        qs = Assignment.objects.all()
        if request.user.role != 'admin':
            qs = qs.filter(created_by=request.user)
        assignment = get_object_or_404(qs, pk=pk)
        subs = assignment.submissions.select_related('student__user')
        return Response(AssignmentSubmissionSerializer(subs, many=True).data)


class GradeSubmissionView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request, pk):
        sub = get_object_or_404(
            AssignmentSubmission.objects.select_related('assignment'), pk=pk,
        )
        if request.user.role != 'admin' and sub.assignment.created_by_id != request.user.id:
            return Response({'detail': 'Not your assignment.'}, status=status.HTTP_403_FORBIDDEN)
        marks = request.data.get('marks')
        try:
            sub.marks = float(marks) if marks is not None and marks != '' else None
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid marks.'}, status=status.HTTP_400_BAD_REQUEST)
        sub.feedback = (request.data.get('feedback') or '').strip()
        sub.status = SubmissionStatus.GRADED
        sub.graded_at = timezone.now()
        sub.save(update_fields=['marks', 'feedback', 'status', 'graded_at'])
        return Response(AssignmentSubmissionSerializer(sub).data)


# ── Teacher: calendar ────────────────────────────────────────────────────────
class TeacherCalendarListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request):
        qs = CalendarEvent.objects.all()
        if request.user.role != 'admin':
            qs = qs.filter(created_by=request.user)
        frm, to = request.query_params.get('from'), request.query_params.get('to')
        if frm:
            qs = qs.filter(start__gte=frm)
        if to:
            qs = qs.filter(start__lte=to)
        return Response(CalendarEventSerializer(qs, many=True).data)

    def post(self, request):
        ser = CalendarEventSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(created_by=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)


class TeacherCalendarDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def _get(self, request, pk):
        qs = CalendarEvent.objects.all()
        if request.user.role != 'admin':
            qs = qs.filter(created_by=request.user)
        return get_object_or_404(qs, pk=pk)

    def patch(self, request, pk):
        ev = self._get(request, pk)
        ser = CalendarEventSerializer(ev, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        self._get(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Student: assignments ─────────────────────────────────────────────────────
class StudentAssignmentListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        profile = request.user.profile
        qs = Assignment.objects.filter(is_published=True, class_grade=profile.class_grade)
        subs = {
            s.assignment_id: s
            for s in AssignmentSubmission.objects.filter(
                student=profile, assignment__in=qs,
            )
        }
        ser = AssignmentSerializer(qs, many=True, context={'my_subs': subs})
        return Response(ser.data)


class StudentAssignmentSubmitView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, pk):
        profile = request.user.profile
        assignment = get_object_or_404(
            Assignment, pk=pk, is_published=True, class_grade=profile.class_grade,
        )
        sub, _ = AssignmentSubmission.objects.get_or_create(
            assignment=assignment, student=profile,
        )
        sub.note = (request.data.get('note') or '').strip()
        if request.FILES.get('submission_file'):
            sub.submission_file = request.FILES['submission_file']
        # Re-submitting before grading keeps it in the submitted state.
        if sub.status != SubmissionStatus.GRADED:
            sub.status = SubmissionStatus.SUBMITTED
        sub.save()
        return Response(AssignmentSubmissionSerializer(sub).data, status=status.HTTP_201_CREATED)


class StudentAgendaView(APIView):
    """Upcoming calendar events (grade-matched) + assignment due-dates."""
    permission_classes = [IsStudent]

    def get(self, request):
        profile = request.user.profile
        now = timezone.now()
        from django.db.models import Q
        events = CalendarEvent.objects.filter(
            Q(class_grade=profile.class_grade) | Q(class_grade=''),
            start__gte=now,
        )[:50]
        items = [{
            'type': 'event',
            'event_type': e.event_type,
            'title': e.title,
            'subject': e.subject,
            'at': e.start.isoformat(),
        } for e in events]
        due = Assignment.objects.filter(
            is_published=True, class_grade=profile.class_grade,
            due_date__gte=now,
        )
        items += [{
            'type': 'assignment_due',
            'event_type': 'DEADLINE',
            'title': f'Due: {a.title}',
            'subject': a.subject,
            'at': a.due_date.isoformat(),
            'assignment_id': a.id,
        } for a in due]
        items.sort(key=lambda x: x['at'])
        return Response(items)
