"""Study Group views — imported in urls.py."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import views
from rest_framework.response import Response

from .models import (
    StudyGroup, StudyGroupMember, NodeProgress,
    GroupSession, GroupSessionProgress, GroupChatMessage, GroupDoubt,
    ChatModerationEvent,
)
from .views import IsStudent


# ── Serialiser helpers ────────────────────────────────────────────────────────

def _xp(user):
    try: return user.xp
    except Exception: return None

def _streak(user):
    try: return user.streak
    except Exception: return None


def _serialize_member(m, my_profile=None):
    user = m.student.user
    xp_obj = _xp(user)
    streak_obj = _streak(user)
    active = (
        NodeProgress.objects
        .filter(student=m.student, status='IN_PROGRESS')
        .select_related('node__path')
        .order_by('-last_attempted_at')
        .first()
    )
    return {
        'student_id':   m.student.id,
        'username':     user.username,
        'avatar_url':   m.student.avatar_url or '',
        'class_grade':  m.student.class_grade,
        'role':         m.role,
        'joined_at':    m.joined_at,
        'total_xp':     xp_obj.total_xp if xp_obj else 0,
        'level':        xp_obj.current_level if xp_obj else 1,
        'streak':       streak_obj.current_streak if streak_obj else 0,
        'current_node': {
            'title':      active.node.title,
            'path_title': active.node.path.title,
        } if active else None,
        'is_me': my_profile is not None and m.student_id == my_profile.id,
    }


def _serialize_group(group, include_members=False, my_profile=None):
    active_session = group.sessions.filter(status__in=['waiting', 'active']).first()
    data = {
        'id':               group.id,
        'name':             group.name,
        'subject':          group.subject,
        'description':      group.description,
        'invite_code':      group.invite_code,
        'max_members':      group.max_members,
        'member_count':     group.memberships.count(),
        'created_at':       group.created_at,
        'creator_username': group.creator.user.username,
        'active_session':   _serialize_session_brief(active_session) if active_session else None,
    }
    if include_members:
        serialized = [_serialize_member(m, my_profile) for m in group.memberships.select_related('student__user')]
        data['members'] = sorted(serialized, key=lambda x: x['total_xp'], reverse=True)
    return data


def _serialize_session_brief(s):
    pdf_url = None
    if s.session_type == 'pdf' and s.source_paper and s.source_paper.secure_pdf_path:
        pdf_url = s.source_paper.secure_pdf_path.url  # relative: /media/...
    return {
        'id':             s.id,
        'title':          s.title,
        'status':         s.status,
        'session_type':   s.session_type,
        'question_count': len(s.question_ids),
        'time_limit':     s.time_limit,
        'started_at':     s.started_at,
        'pdf_url':        pdf_url,
    }


def _serialize_question(bq):
    opts = {}
    correct_key = ''
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


def _grade_one(bq, given: str):
    """Auto-grade MCQ and A&R only. Everything else is self-review (returns None)."""
    given = (given or '').strip()
    if bq.question_type in ('MCQ', 'ASSERTION_REASON'):
        correct = bq.options.filter(is_correct=True).first()
        if not correct:
            return False, ''
        ck = correct.option_label
        opts = {o.option_label: o.option_text for o in bq.options.all()}
        return given.lower() == ck.lower(), f'{ck}: {opts.get(ck, "")}'
    return None, bq.answer_text or ''


def _serialize_chat_msg(m, my_profile=None):
    return {
        'id':              m.id,
        'sender_id':       m.sender.id if m.sender else None,
        'username':        m.sender.user.username if m.sender else 'AI Assistant',
        'avatar_url':      (m.sender.avatar_url or '') if m.sender else '',
        'message':         m.message,
        'image_url':       m.image.url if m.image else None,
        'question_number': m.question_number,
        'question_id':     m.question_id,
        'is_doubt':        m.is_doubt,
        'is_system':       m.is_system,
        'created_at':      m.created_at,
        'is_me':           my_profile is not None and m.sender == my_profile,
    }


# ── Discovery ────────────────────────────────────────────────────────────────

class DiscoverSessionsView(views.APIView):
    """Public: any student can see groups that currently have an active session."""
    permission_classes = [IsStudent]

    def get(self, request):
        active_sessions = (
            GroupSession.objects
            .filter(status='active')
            .select_related('group__creator__user', 'created_by__user')
            .order_by('-started_at')[:20]
        )
        my_group_ids = set(
            StudyGroupMember.objects
            .filter(student=request.user.profile)
            .values_list('group_id', flat=True)
        )
        result = []
        for s in active_sessions:
            g = s.group
            if not g.is_active:
                continue
            result.append({
                'session_id':     s.id,
                'session_title':  s.title,
                'session_type':   s.session_type,
                'group_id':       g.id,
                'group_name':     g.name,
                'subject':        g.subject,
                'invite_code':    g.invite_code,
                'member_count':   g.memberships.count(),
                'max_members':    g.max_members,
                'question_count': len(s.question_ids),
                'time_limit':     s.time_limit,
                'started_at':     s.started_at,
                'created_by':     s.created_by.user.username,
                'is_member':      g.id in my_group_ids,
            })
        return Response(result)


# ── Group CRUD ────────────────────────────────────────────────────────────────

class StudyGroupListCreateView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        memberships = (
            StudyGroupMember.objects
            .filter(student=request.user.profile)
            .select_related('group__creator__user')
            .prefetch_related('group__memberships', 'group__sessions')
            .order_by('-joined_at')
        )
        return Response([_serialize_group(m.group, my_profile=request.user.profile) for m in memberships])

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': 'name is required.'}, status=400)
        group = StudyGroup.objects.create(
            name=name,
            subject=request.data.get('subject', ''),
            description=request.data.get('description', ''),
            max_members=min(int(request.data.get('max_members', 6)), StudyGroup.MAX_MEMBERS),
            creator=request.user.profile,
        )
        StudyGroupMember.objects.create(group=group, student=request.user.profile, role='admin')
        return Response(_serialize_group(group), status=201)


class StudyGroupJoinView(views.APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        code = (request.data.get('invite_code') or '').strip().upper()
        group = get_object_or_404(StudyGroup, invite_code=code, is_active=True)
        if group.memberships.count() >= group.max_members:
            return Response({'detail': 'Group is full.'}, status=400)
        _, created = StudyGroupMember.objects.get_or_create(
            group=group, student=request.user.profile, defaults={'role': 'member'}
        )
        if not created:
            return Response({'detail': 'Already a member.'}, status=400)
        return Response(_serialize_group(group), status=200)


class StudyGroupDetailView(views.APIView):
    permission_classes = [IsStudent]

    def _membership(self, group_id, profile):
        group = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        membership = group.memberships.filter(student=profile).first()
        return group, membership

    def get(self, request, group_id):
        group, membership = self._membership(group_id, request.user.profile)
        if not membership:
            return Response({'detail': 'Not a member.'}, status=403)
        return Response(_serialize_group(group, include_members=True, my_profile=request.user.profile))

    def delete(self, request, group_id):
        group, membership = self._membership(group_id, request.user.profile)
        if not membership:
            return Response({'detail': 'Not a member.'}, status=403)
        remaining = group.memberships.count()
        if membership.role == 'admin' and remaining > 1:
            next_m = group.memberships.exclude(student=request.user.profile).order_by('joined_at').first()
            if next_m:
                next_m.role = 'admin'
                next_m.save()
        membership.delete()
        if remaining == 1:
            group.is_active = False
            group.save()
        return Response({'detail': 'Left group.'})


class StudyGroupLeaderboardView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request, group_id):
        group = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)
        members = group.memberships.select_related('student__user').all()
        board = []
        for m in members:
            xp_obj = _xp(m.student.user)
            streak_obj = _streak(m.student.user)
            board.append({
                'student_id': m.student.id,
                'username':   m.student.user.username,
                'avatar_url': m.student.avatar_url or '',
                'total_xp':  xp_obj.total_xp if xp_obj else 0,
                'level':     xp_obj.current_level if xp_obj else 1,
                'streak':    streak_obj.current_streak if streak_obj else 0,
                'is_me':     m.student == request.user.profile,
            })
        board.sort(key=lambda x: x['total_xp'], reverse=True)
        for i, entry in enumerate(board, 1):
            entry['rank'] = i
        return Response(board)


# ── Teacher papers list ───────────────────────────────────────────────────────

def _grade_digits(value):
    """Extract the numeric grade from a free-form label ('10th', 'Grade 10' -> '10')."""
    return ''.join(ch for ch in str(value or '') if ch.isdigit())


class TeacherPapersView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        from ai_engine.models import QuestionPaper, PaperQuestion

        user = request.user
        papers = QuestionPaper.objects.select_related('created_by').order_by('-created_at')

        # This endpoint is student-only (IsStudent permission requires a
        # StudentProfile), so scope papers to the student's own grade — they must
        # not be able to enumerate papers from other grades (S5). Ungraded papers
        # are treated as universal and remain visible. An admin is exempted in the
        # unlikely event one carries a profile and reaches this view.
        student_grade = None
        if getattr(user, 'role', 'student') != 'admin':
            student_grade = _grade_digits(getattr(getattr(user, 'profile', None), 'class_grade', ''))

        result = []
        for p in papers[:200]:
            # Grade gate for students: their own grade, plus ungraded (universal) papers.
            if student_grade is not None:
                paper_grade = _grade_digits(p.class_grade)
                if paper_grade and paper_grade != student_grade:
                    continue
            qids = list(
                PaperQuestion.objects.filter(section__paper=p)
                .values_list('question_id', flat=True).distinct()
            )
            if not qids and not p.secure_pdf_path:
                continue
            pdf_url = request.build_absolute_uri(p.secure_pdf_path.url) if p.secure_pdf_path else None
            result.append({
                'id':             p.id,
                'title':          p.title,
                'subject':        p.subject,
                'class_grade':    p.class_grade,
                'total_marks':    p.total_marks,
                'duration_mins':  p.duration_mins,
                'question_count': len(qids),
                'created_by':     p.created_by.username,
                'created_at':     p.created_at,
                'question_ids':   qids,
                'pdf_url':        pdf_url,
                'has_pdf':        bool(pdf_url),
            })
            if len(result) >= 30:
                break
        return Response(result)


# ── Session management ────────────────────────────────────────────────────────

class GroupSessionCreateView(views.APIView):
    """Admin creates a study session for the group."""
    permission_classes = [IsStudent]

    def post(self, request, group_id):
        from ai_engine.models import QuestionBank

        group = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        membership = group.memberships.filter(student=request.user.profile, role='admin').first()
        if not membership:
            return Response({'detail': 'Only the group admin can start a session.'}, status=403)

        if group.sessions.filter(status__in=['waiting', 'active']).exists():
            return Response({'detail': 'A session is already active.'}, status=400)

        source       = request.data.get('source', 'ai_generated')
        session_type = request.data.get('session_type', 'questions')
        title        = (request.data.get('title') or 'Study Session').strip()
        time_limit   = request.data.get('time_limit')

        if source == 'teacher_paper':
            paper_id = request.data.get('paper_id')
            from ai_engine.models import QuestionPaper, PaperQuestion
            paper = get_object_or_404(QuestionPaper, pk=paper_id)
            question_ids = list(
                PaperQuestion.objects.filter(section__paper=paper)
                .values_list('question_id', flat=True).distinct()
            )
            session = GroupSession.objects.create(
                group=group, title=title,
                session_type=session_type,
                question_ids=question_ids,
                source='teacher_paper', source_paper=paper,
                time_limit=time_limit,
                created_by=request.user.profile,
                status='active', started_at=timezone.now(),
            )
        elif source == 'smart_hybrid':
            # AI-generated PDF paper for the group
            subject    = request.data.get('subject', 'Mathematics')
            chapters   = request.data.get('chapters', [])
            count      = min(int(request.data.get('count', 10)), 30)
            difficulty = request.data.get('difficulty', 'mixed')
            types      = request.data.get('types') or ['MCQ', 'VERY_SHORT', 'SHORT']

            import random
            qs = QuestionBank.objects.filter(subject__iexact=subject, question_type__in=types)
            if chapters:
                qs = qs.filter(chapter__in=chapters)
            if difficulty != 'mixed':
                qs = qs.filter(difficulty=difficulty)
            pool = list(qs.values_list('id', flat=True))
            random.shuffle(pool)
            question_ids = pool[:count]

            session = GroupSession.objects.create(
                group=group, title=title,
                session_type='questions',
                question_ids=question_ids,
                source='smart_hybrid',
                time_limit=time_limit,
                created_by=request.user.profile,
                status='active', started_at=timezone.now(),
            )
        else:
            # AI question-mode session
            subject    = request.data.get('subject', 'Mathematics')
            chapters   = request.data.get('chapters', [])
            count      = min(int(request.data.get('count', 10)), 30)
            difficulty = request.data.get('difficulty', 'mixed')
            types      = request.data.get('types') or ['MCQ', 'ASSERTION_REASON', 'VERY_SHORT']

            import random
            qs = QuestionBank.objects.filter(subject__iexact=subject, question_type__in=types)
            if chapters:
                qs = qs.filter(chapter__in=chapters)
            if difficulty != 'mixed':
                qs = qs.filter(difficulty=difficulty)
            pool = list(qs.values_list('id', flat=True))
            random.shuffle(pool)
            question_ids = pool[:count]

            session = GroupSession.objects.create(
                group=group, title=title,
                session_type='questions',
                question_ids=question_ids,
                source='ai_generated',
                time_limit=time_limit,
                created_by=request.user.profile,
                status='active', started_at=timezone.now(),
            )

        GroupSessionProgress.objects.create(session=session, student=request.user.profile)

        resp = {'session': _serialize_session_brief(session)}
        if session.session_type == 'questions' and session.question_ids:
            questions = list(
                QuestionBank.objects.filter(id__in=session.question_ids)
                .prefetch_related('options', 'case_parts')
            )
            q_map = {q.id: q for q in questions}
            ordered_qs = [q_map[qid] for qid in session.question_ids if qid in q_map]
            resp['questions'] = [_serialize_question(q) for q in ordered_qs]
        return Response(resp, status=201)


class GroupSessionDetailView(views.APIView):
    """Poll this to get session state + member progress (frontend polls every 4s)."""
    permission_classes = [IsStudent]

    def get(self, request, group_id, session_id):
        from ai_engine.models import QuestionBank

        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group)

        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        my_progress, _ = GroupSessionProgress.objects.get_or_create(
            session=session, student=request.user.profile
        )

        # Auto-end session when timer has expired
        if (
            session.status == 'active'
            and session.time_limit
            and session.started_at
        ):
            elapsed = (timezone.now() - session.started_at).total_seconds()
            if elapsed >= session.time_limit:
                session.status   = 'completed'
                session.ended_at = timezone.now()
                session.save()

        all_progress = GroupSessionProgress.objects.filter(session=session).select_related('student__user')
        member_progress = []
        for p in all_progress:
            member_progress.append({
                'student_id': p.student.id,
                'username':   p.student.user.username,
                'avatar_url': p.student.avatar_url or '',
                'answered':   len([v for v in p.answers.values() if v]),
                'total':      len(session.question_ids),
                'submitted':  p.submitted,
                'score':      p.score if p.submitted else None,
                'is_me':      p.student == request.user.profile,
            })

        # Doubts for PDF sessions
        doubts = []
        if session.session_type == 'pdf':
            for d in GroupDoubt.objects.filter(session=session):
                doubts.append({
                    'question_number':      d.question_number,
                    'doubt_count':          d.doubt_count,
                    'escalated_to_ai':      d.escalated_to_ai,
                    'escalated_to_teacher': d.escalated_to_teacher,
                    'can_escalate':         d.doubt_count >= 2 and not d.escalated_to_ai and not d.escalated_to_teacher,
                })

        resp = {
            'session':         _serialize_session_brief(session),
            'my_answers':      my_progress.answers,
            'my_submitted':    my_progress.submitted,
            'member_progress': member_progress,
            'doubts':          doubts,
        }
        if session.session_type == 'questions' and session.question_ids:
            questions = list(
                QuestionBank.objects.filter(id__in=session.question_ids)
                .prefetch_related('options', 'case_parts')
            )
            q_map = {q.id: q for q in questions}
            ordered_qs = [q_map[qid] for qid in session.question_ids if qid in q_map]
            resp['questions'] = [_serialize_question(q) for q in ordered_qs]
        return Response(resp)


class GroupSessionSaveAnswersView(views.APIView):
    permission_classes = [IsStudent]

    def post(self, request, group_id, session_id):
        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group, status='active')
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        progress, _ = GroupSessionProgress.objects.get_or_create(
            session=session, student=request.user.profile
        )
        if progress.submitted:
            return Response({'detail': 'Already submitted.'}, status=400)

        progress.answers = request.data.get('answers', {})
        progress.save()
        return Response({'detail': 'Saved.'})


class GroupSessionSubmitView(views.APIView):
    """Member submits / marks done. PDF sessions just mark submitted with no scoring."""
    permission_classes = [IsStudent]

    def post(self, request, group_id, session_id):
        from ai_engine.models import QuestionBank

        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group, status='active')
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        progress, _ = GroupSessionProgress.objects.get_or_create(
            session=session, student=request.user.profile
        )
        if progress.submitted:
            return Response({'detail': 'Already submitted.'}, status=400)

        if session.session_type == 'pdf':
            # No grading for PDF sessions
            progress.submitted    = True
            progress.submitted_at = timezone.now()
            progress.save()
            score, total = None, 0
        else:
            answers = request.data.get('answers', {})
            questions = {
                q.id: q for q in
                QuestionBank.objects.filter(id__in=session.question_ids).prefetch_related('options')
            }
            score = 0
            for qid in session.question_ids:
                bq = questions.get(qid)
                if not bq:
                    continue
                given = str(answers.get(str(qid), '')).strip()
                is_correct, _ = _grade_one(bq, given)
                if is_correct is True:
                    score += 1
            progress.answers      = answers
            progress.submitted    = True
            progress.score        = score
            progress.total        = len(session.question_ids)
            progress.submitted_at = timezone.now()
            progress.save()
            total = len(session.question_ids)

        # End session when everyone has submitted
        all_submitted = not GroupSessionProgress.objects.filter(
            session=session, submitted=False
        ).exists()
        if all_submitted:
            session.status   = 'completed'
            session.ended_at = timezone.now()
            session.save()

        return Response({'score': score, 'total': total})


class GroupSessionResultsView(views.APIView):
    """Full results for a completed session."""
    permission_classes = [IsStudent]

    def get(self, request, group_id, session_id):
        from ai_engine.models import QuestionBank

        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group)
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        all_progress = (
            GroupSessionProgress.objects
            .filter(session=session)
            .select_related('student__user')
        )
        resp = {
            'session': _serialize_session_brief(session),
            'members': [
                {
                    'student_id': p.student.id,
                    'username':   p.student.user.username,
                    'avatar_url': p.student.avatar_url or '',
                    'answers':    p.answers,
                    'score':      p.score,
                    'total':      p.total,
                    'submitted':  p.submitted,
                    'is_me':      p.student == request.user.profile,
                }
                for p in all_progress
            ],
        }
        if session.session_type == 'questions' and session.question_ids:
            questions = list(
                QuestionBank.objects.filter(id__in=session.question_ids)
                .prefetch_related('options', 'case_parts')
            )
            q_map = {q.id: q for q in questions}
            resp['questions'] = [_serialize_question(q_map[qid]) for qid in session.question_ids if qid in q_map]
        return Response(resp)


# ── Answer Key ────────────────────────────────────────────────────────────────

class GroupSessionAnswerKeyView(views.APIView):
    """Returns short answer key only — available after session ends."""
    permission_classes = [IsStudent]

    def get(self, request, group_id, session_id):
        from ai_engine.models import QuestionBank, PaperQuestion

        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group)
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        key = []
        if session.session_type == 'pdf' and session.source_paper:
            # Get answer key from teacher paper questions in order
            pqs = (
                PaperQuestion.objects
                .filter(section__paper=session.source_paper)
                .select_related('question')
                .order_by('section__section_name', 'order_in_section')
            )
            for i, pq in enumerate(pqs, 1):
                q = pq.question
                short_answer = ''
                if q.question_type in ('MCQ', 'ASSERTION_REASON'):
                    correct_opt = q.options.filter(is_correct=True).first()
                    if correct_opt:
                        short_answer = f'{correct_opt.option_label}: {correct_opt.option_text[:60]}'
                else:
                    short_answer = (q.answer_text or '')[:80]
                key.append({'question_number': i, 'answer': short_answer})
        elif session.question_ids:
            questions = list(
                QuestionBank.objects.filter(id__in=session.question_ids)
                .prefetch_related('options')
            )
            q_map = {q.id: q for q in questions}
            for i, qid in enumerate(session.question_ids, 1):
                q = q_map.get(qid)
                if not q:
                    continue
                if q.question_type in ('MCQ', 'ASSERTION_REASON'):
                    correct_opt = q.options.filter(is_correct=True).first()
                    short_answer = f'{correct_opt.option_label}: {correct_opt.option_text[:60]}' if correct_opt else ''
                else:
                    short_answer = (q.answer_text or '')[:80]
                key.append({'question_number': i, 'answer': short_answer})

        return Response({'answer_key': key})


# ── Doubt tracking ────────────────────────────────────────────────────────────

class GroupDoubtView(views.APIView):
    """Raise a doubt on a PDF question number."""
    permission_classes = [IsStudent]

    def post(self, request, group_id, session_id):
        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group)
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        q_num = request.data.get('question_number')
        if not q_num:
            return Response({'detail': 'question_number is required.'}, status=400)

        doubt, created = GroupDoubt.objects.get_or_create(
            session=session, question_number=int(q_num),
            defaults={'doubt_count': 0},
        )
        doubt.doubt_count += 1
        doubt.save()

        # Post a system chat message when doubt is raised
        sender_name = request.user.profile.user.username
        GroupChatMessage.objects.create(
            session=session,
            sender=request.user.profile,
            message=f'{sender_name} is stuck on Q{q_num}',
            question_number=int(q_num),
            is_doubt=True,
        )

        return Response({
            'question_number': doubt.question_number,
            'doubt_count':     doubt.doubt_count,
            'can_escalate':    doubt.doubt_count >= 2 and not doubt.escalated_to_ai and not doubt.escalated_to_teacher,
        }, status=201)


class GroupDoubtEscalateView(views.APIView):
    """Escalate a group doubt to AI or teacher."""
    permission_classes = [IsStudent]

    def post(self, request, group_id, session_id, q_num):
        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group)
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        doubt = get_object_or_404(GroupDoubt, session=session, question_number=q_num)
        target = request.data.get('target', 'ai')

        if target == 'ai' and not doubt.escalated_to_ai:
            doubt.escalated_to_ai = True
            doubt.save()

            # Call AI for a hint/answer
            ai_text = _get_ai_hint(session, q_num)
            doubt.ai_response = ai_text
            doubt.save()

            GroupChatMessage.objects.create(
                session=session,
                sender=None,
                message=f'[AI Assistant — Q{q_num}]\n{ai_text}',
                question_number=q_num,
                is_system=True,
            )

        elif target == 'teacher' and not doubt.escalated_to_teacher:
            doubt.escalated_to_teacher = True
            doubt.save()

            teacher_name = 'the teacher'
            if session.source_paper:
                teacher_name = session.source_paper.created_by.get_full_name() or session.source_paper.created_by.username

            GroupChatMessage.objects.create(
                session=session,
                sender=None,
                message=f'[System] Q{q_num} has been escalated to {teacher_name}. They will be notified.',
                question_number=q_num,
                is_system=True,
            )

        return Response({'detail': 'Escalated.'})


def _get_ai_hint(session, q_num):
    """Generate a brief AI hint for a PDF question."""
    try:
        from ai_engine.models import PaperQuestion
        if session.source_paper:
            pqs = list(
                PaperQuestion.objects
                .filter(section__paper=session.source_paper)
                .select_related('question')
                .order_by('section__section_name', 'order_in_section')
            )
            if 1 <= q_num <= len(pqs):
                q = pqs[q_num - 1].question
                answer_text = q.answer_text or ''
                if q.question_type in ('MCQ', 'ASSERTION_REASON'):
                    correct = q.options.filter(is_correct=True).first()
                    hint = f'The correct answer is option {correct.option_label}.' if correct else answer_text[:200]
                else:
                    hint = answer_text[:300] if answer_text else 'No hint available for this question.'
                return f'Hint for Question {q_num}: {hint}'
    except Exception:
        pass
    return f'No AI hint available for Question {q_num} at this time. Please ask your teacher.'


# ── Chat ──────────────────────────────────────────────────────────────────────

class GroupChatView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request, group_id, session_id):
        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group)
        if not group.memberships.filter(student=request.user.profile).exists():
            return Response({'detail': 'Not a member.'}, status=403)

        since = request.query_params.get('since')
        msgs  = session.chat_messages.select_related('sender__user')
        if since:
            msgs = msgs.filter(id__gt=int(since))

        return Response([_serialize_chat_msg(m, request.user.profile) for m in msgs])

    def post(self, request, group_id, session_id):
        group      = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session    = get_object_or_404(GroupSession, pk=session_id, group=group)
        membership = group.memberships.filter(student=request.user.profile).first()
        if not membership:
            return Response({'detail': 'Not a member.'}, status=403)

        # Image sharing is disabled
        if request.FILES.get('image'):
            return Response({'detail': 'Image sharing is not allowed in study group chats.'}, status=400)

        text = (request.data.get('message') or '').strip()
        if not text:
            return Response({'detail': 'Message is required.'}, status=400)

        # Mute check
        if membership.muted_until and membership.muted_until > timezone.now():
            muted_str = membership.muted_until.strftime('%H:%M')
            return Response(
                {'detail': f'You are muted until {muted_str} due to repeated violations.'},
                status=403,
            )

        # Moderation
        from .moderation import check_message
        result = check_message(text)
        if result.blocked:
            ChatModerationEvent.objects.create(
                session=session,
                sender=request.user.profile,
                blocked_text=text[:500],
                reason=result.reason,
            )
            membership.violation_count += 1
            count = membership.violation_count
            if count >= 8:
                membership.muted_until = timezone.now() + timezone.timedelta(hours=24)
            elif count >= 5:
                membership.muted_until = timezone.now() + timezone.timedelta(minutes=15)
            elif count >= 3:
                membership.muted_until = timezone.now() + timezone.timedelta(minutes=5)
            membership.save(update_fields=['violation_count', 'muted_until'])
            return Response({'detail': result.reason}, status=400)

        q_num    = request.data.get('question_number')
        q_id     = request.data.get('question_id')
        is_doubt = str(request.data.get('is_doubt', 'false')).lower() in ('true', '1')

        msg = GroupChatMessage.objects.create(
            session=session,
            sender=request.user.profile,
            message=text,
            question_number=int(q_num) if q_num else None,
            question_id=int(q_id) if q_id else None,
            is_doubt=is_doubt,
        )
        return Response(_serialize_chat_msg(msg, request.user.profile), status=201)


class ModerationLogView(views.APIView):
    """GET — returns the moderation event log for a session. Admin only."""
    permission_classes = [IsStudent]

    def get(self, request, group_id, session_id):
        group   = get_object_or_404(StudyGroup, pk=group_id, is_active=True)
        session = get_object_or_404(GroupSession, pk=session_id, group=group)
        membership = group.memberships.filter(student=request.user.profile, role='admin').first()
        if not membership:
            return Response({'detail': 'Admin access required.'}, status=403)

        events = (
            session.moderation_events
            .select_related('sender__user')
            .order_by('-created_at')[:100]
        )
        return Response([{
            'id':           e.id,
            'username':     e.sender.user.username,
            'blocked_text': e.blocked_text,
            'reason':       e.reason,
            'timestamp':    e.created_at,
        } for e in events])
