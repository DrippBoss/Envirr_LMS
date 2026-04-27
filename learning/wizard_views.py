from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    ContentTemplate, RevisionNode, Flashcard, FlashcardDeck, DeckCard,
)
from ai_engine.models import QuestionBank

User = get_user_model()


class IsAdminRole(BasePermission):
    """Allows access only to users with role == 'admin'."""
    def has_permission(self, request, _view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'admin'
        )


class IsTeacherOrAdmin(BasePermission):
    """Allows access to teachers and admins."""
    def has_permission(self, request, _view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) in ('admin', 'teacher')
        )


class AdminWizardBaseView(APIView):
    """Admin-only base view."""
    permission_classes = [IsAuthenticated, IsAdminRole]


class WizardTemplateListView(AdminWizardBaseView):
    def get(self, request):
        templates = ContentTemplate.objects.all().values(
            'id', 'name', 'template_type', 'description', 'config_json'
        )
        return Response(list(templates))


class WizardCourseCreateView(APIView):
    """Teachers submit for review; admins auto-publish."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    @transaction.atomic
    def post(self, request):
        data = request.data
        is_admin = getattr(request.user, 'role', None) == 'admin'

        unit = CourseUnit.objects.create(
            title=data.get('title', 'New Unit'),
            subject=data.get('subject', 'General Subject'),
            class_grade=data.get('class_grade', '10'),
            board=data.get('board', ''),
            description=data.get('description', ''),
            icon=data.get('icon', 'school'),
            order=CourseUnit.objects.count() + 1,
            is_published=is_admin,  # teachers submit for review; admins auto-publish
        )

        total_nodes = 0
        total_questions = 0

        # Maps node_client_key → created object (LearningNode or RevisionNode)
        lesson_node_map: dict = {}   # key → LearningNode
        revision_node_map: dict = {} # key → RevisionNode
        node_id_map: dict = {}       # key → LearningNode.id (for video upload)

        for ch_idx, chap_data in enumerate(data.get('chapters', [])):
            path = LearningPath.objects.create(
                unit=unit,
                title=chap_data.get('title', f'Chapter {ch_idx + 1}'),
                description=chap_data.get('description', ''),
                class_grade=unit.class_grade,
                is_active=True,
            )
            last_lesson_node = None
            lesson_node_order = 0

            for node_data in chap_data.get('nodes', []):
                node_type = node_data.get('type', 'LESSON')
                question_ids = node_data.get('question_ids', [])
                node_client_key = node_data.get('node_client_key', '')

                # ── REVISION ──────────────────────────────────────────────────
                if node_type == 'REVISION':
                    parent_key = node_data.get('appears_after_node_key', '')
                    parent_node = (
                        lesson_node_map.get(parent_key)
                        if parent_key and parent_key in lesson_node_map
                        else last_lesson_node
                    )
                    if parent_node:
                        rn = RevisionNode.objects.create(
                            path=path,
                            title=node_data.get('title', 'Revision'),
                            appears_after_node=parent_node,
                            side=node_data.get('side', 'right'),
                            xp_reward=node_data.get('xp_reward', 15),
                        )
                        revision_node_map[node_client_key] = rn
                        total_nodes += 1
                    continue  # RevisionNode has no LessonQuestion FK

                # ── LESSON / CHAPTER_TEST ──────────────────────────────────────
                xp_reward = node_data.get('xp_reward', 10)
                starting_lives = node_data.get('starting_lives', 3)
                practice_count = (
                    len(question_ids) if question_ids
                    else node_data.get('practice_question_count', 5)
                )
                test_question_count = node_data.get('test_question_count', 10)
                test_pass_percentage = node_data.get('test_pass_percentage', 70)
                is_bonus = bool(node_data.get('is_bonus', False))

                template_id = node_data.get('template_id')
                if template_id:
                    try:
                        t = ContentTemplate.objects.get(id=template_id)
                        xp_reward = node_data.get('xp_reward') or t.config_json.get('xp_reward', xp_reward)
                        if not question_ids:
                            practice_count = t.config_json.get('practice_question_count', practice_count)
                        if 'node_type' in t.config_json:
                            node_type = t.config_json['node_type']
                    except ContentTemplate.DoesNotExist:
                        pass

                lesson_node_order += 1
                node = LearningNode.objects.create(
                    path=path,
                    title=node_data.get('title', f'Node {lesson_node_order}'),
                    node_type=node_type,
                    order=lesson_node_order,
                    xp_reward=xp_reward,
                    is_bonus=is_bonus,
                    starting_lives=starting_lives,
                    practice_question_count=practice_count,
                    test_question_count=test_question_count,
                    test_pass_percentage=test_pass_percentage,
                    youtube_url=node_data.get('youtube_url', ''),
                )
                last_lesson_node = node
                lesson_node_map[node_client_key] = node
                node_id_map[node_client_key] = node.id
                total_nodes += 1

                # Copy QuestionBank questions → LessonQuestion
                # Accept both new {id, hint, explanation} objects and legacy bare ids
                raw_questions = node_data.get('questions') or [
                    {'id': qid, 'hint': '', 'explanation': ''} for qid in question_ids
                ]
                for q_entry in raw_questions:
                    qid = q_entry['id'] if isinstance(q_entry, dict) else q_entry
                    custom_hint = q_entry.get('hint', '') if isinstance(q_entry, dict) else ''
                    custom_explanation = q_entry.get('explanation', '') if isinstance(q_entry, dict) else ''
                    try:
                        qb = QuestionBank.objects.get(id=qid)
                        if qb.question_type in ('MCQ', 'ASSERTION_REASON'):
                            opts = list(qb.options.values('option_label', 'option_text', 'is_correct'))
                            options_json = {o['option_label']: o['option_text'] for o in opts}
                            correct = next((o['option_label'] for o in opts if o['is_correct']), '')
                        else:
                            options_json = {}
                            correct = qb.answer_text or ''
                        LessonQuestion.objects.create(
                            node=node,
                            question_type=qb.question_type,
                            question_text=qb.question_text,
                            options_json=options_json,
                            correct_answer=correct[:500],
                            concept=qb.concept,
                            hint=custom_hint,
                            explanation=custom_explanation,
                            source_question=qb,
                        )
                        total_questions += 1
                    except QuestionBank.DoesNotExist:
                        pass

        # ── Flashcard Decks ────────────────────────────────────────────────────
        total_flashcards = 0
        for deck_data in data.get('flashcard_decks', []):
            purpose = deck_data.get('purpose', 'PREREQUISITE')
            node_key = deck_data.get('node_key') or ''
            cards_data = deck_data.get('cards', [])
            if not cards_data:
                continue

            deck_kwargs: dict = {
                'title': deck_data.get('title', 'Flashcard Deck'),
                'purpose': purpose,
            }
            if purpose == 'PREREQUISITE':
                deck_kwargs['course_unit'] = unit
            elif purpose == 'POST_NODE' and node_key in lesson_node_map:
                deck_kwargs['learning_node'] = lesson_node_map[node_key]
            elif purpose == 'SIDE_REVISION' and node_key in revision_node_map:
                deck_kwargs['revision_node'] = revision_node_map[node_key]
            else:
                # PREREQUISITE fallback or unmatched key
                deck_kwargs['course_unit'] = unit

            deck = FlashcardDeck.objects.create(**deck_kwargs)

            for order, card_data in enumerate(cards_data, 1):
                card = Flashcard.objects.create(
                    title=card_data.get('title', ''),
                    body=card_data.get('body', ''),
                    card_type=card_data.get('card_type', 'CONCEPT'),
                    subject=unit.subject,
                    chapter='',
                    concept=card_data.get('concept', ''),
                    has_formula=bool(card_data.get('has_formula', False)),
                    formula_text=card_data.get('formula_text', ''),
                    example_text=card_data.get('example_text', ''),
                    order=order,
                )
                DeckCard.objects.create(deck=deck, card=card, order=order)
                total_flashcards += 1

        message = 'Course created and published' if is_admin else 'Course submitted for admin review'
        return Response({
            'message': message,
            'published': is_admin,
            'unit_id': unit.id,
            'nodes': total_nodes,
            'questions': total_questions,
            'flashcards': total_flashcards,
            'node_id_map': node_id_map,
        }, status=status.HTTP_201_CREATED)


class WizardPendingCoursesView(AdminWizardBaseView):
    """List courses pending admin approval."""
    def get(self, _request):
        pending = list(
            CourseUnit.objects.filter(is_published=False)
            .order_by('-id')
            .values('id', 'title', 'subject', 'class_grade', 'board', 'description', 'icon')
        )
        # Annotate each entry with node/question counts
        for p in pending:
            paths = LearningPath.objects.filter(unit_id=p['id'])
            p['chapters'] = paths.count()
            p['nodes'] = LearningNode.objects.filter(path__in=paths).count()
        return Response(pending)


class WizardApproveView(AdminWizardBaseView):
    """Approve or reject a pending course."""
    @transaction.atomic
    def post(self, request, pk):
        action = request.data.get('action')
        try:
            unit = CourseUnit.objects.get(id=pk, is_published=False)
        except CourseUnit.DoesNotExist:
            return Response({'error': 'Pending course not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'approve':
            unit.is_published = True
            unit.save()
            return Response({'message': f'"{unit.title}" approved and published'})
        elif action == 'reject':
            title = unit.title
            unit.delete()
            return Response({'message': f'"{title}" rejected and removed'})
        return Response({'error': 'action must be approve or reject'}, status=status.HTTP_400_BAD_REQUEST)


class WizardReorderView(AdminWizardBaseView):
    @transaction.atomic
    def post(self, request):
        model_name = request.data.get('model')
        updates = request.data.get('updates', [])

        if model_name == 'LearningNode':
            for u in updates:
                LearningNode.objects.filter(id=u['id']).update(order=u['order'])
        elif model_name == 'CourseUnit':
            for u in updates:
                CourseUnit.objects.filter(id=u['id']).update(order=u['order'])

        return Response({'message': 'Reordered successfully'})


class WizardBulkUploadView(AdminWizardBaseView):
    def post(self, request):
        node_id = request.data.get('node_id')
        files = request.FILES.getlist('files')

        if not node_id or not files:
            return Response(
                {'error': 'node_id and files are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            node = LearningNode.objects.get(id=node_id)
            for f in files:
                if f.name.endswith('.mp4'):
                    node.video_file = f
                    node.save()
                    break
            return Response({'message': 'Files uploaded successfully'})
        except LearningNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)


class WizardTeacherListView(AdminWizardBaseView):
    """Return all users with role=teacher for the assign dropdown."""
    def get(self, _request):
        teachers = list(
            User.objects.filter(role='teacher')
            .values('id', 'username', 'first_name', 'last_name', 'email')
        )
        return Response(teachers)


class WizardAssignTeacherView(AdminWizardBaseView):
    """Assign (or unassign) a teacher to an existing published course."""
    def post(self, request, pk):
        teacher_id = request.data.get('teacher_id')
        try:
            unit = CourseUnit.objects.get(id=pk)
        except CourseUnit.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

        if teacher_id:
            try:
                teacher = User.objects.get(id=teacher_id, role='teacher')
            except User.DoesNotExist:
                return Response({'error': 'Teacher not found'}, status=status.HTTP_404_NOT_FOUND)
            unit.assigned_teacher = teacher
        else:
            unit.assigned_teacher = None
        unit.save()
        return Response({'message': 'Assignment updated', 'unit_id': unit.id})


class WizardAssignedCoursesView(APIView):
    """
    Admin: all published courses with assignment info.
    Teacher: only courses assigned to them.
    """
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request):
        role = getattr(request.user, 'role', None)
        if role == 'admin':
            qs = CourseUnit.objects.filter(is_published=True).order_by('order')
        else:
            qs = CourseUnit.objects.filter(is_published=True, assigned_teacher=request.user)

        result = []
        for unit in qs:
            paths = LearningPath.objects.filter(unit=unit)
            node_count = LearningNode.objects.filter(path__in=paths).count()
            teacher = unit.assigned_teacher
            result.append({
                'id': unit.id,
                'title': unit.title,
                'subject': unit.subject,
                'class_grade': unit.class_grade,
                'board': unit.board,
                'icon': unit.icon,
                'description': unit.description,
                'chapters': paths.count(),
                'nodes': node_count,
                'assigned_teacher_id': teacher.id if teacher else None,
                'assigned_teacher_name': teacher.username if teacher else None,
            })
        return Response(result)


class WizardCourseStructureView(APIView):
    """
    GET  /teacher/courses/<id>/structure/  — full editable tree
    PUT  /teacher/courses/<id>/structure/  — full replacement (delete + recreate paths/nodes)
    """
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def _can_edit(self, request, unit):
        role = getattr(request.user, 'role', None)
        if role == 'admin':
            return True
        return role == 'teacher' and unit.assigned_teacher_id == request.user.id

    def get(self, request, pk):
        try:
            unit = CourseUnit.objects.get(id=pk)
        except CourseUnit.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
        if not self._can_edit(request, unit):
            return Response({'error': 'Not assigned to you'}, status=status.HTTP_403_FORBIDDEN)

        chapters = []
        for path in unit.paths.all().order_by('id'):
            nodes = []
            for node in path.nodes.all().order_by('order'):
                questions = []
                for q in node.questions.all().order_by('order'):
                    questions.append({
                        'id': q.id,
                        'source_question_id': q.source_question_id,
                        'question_type': q.question_type,
                        'question_text': q.question_text,
                        'hint': q.hint,
                        'explanation': q.explanation,
                        'concept': q.concept,
                        'options_json': q.options_json,
                        'correct_answer': q.correct_answer,
                    })
                nodes.append({
                    'id': node.id,
                    'title': node.title,
                    'type': node.node_type,
                    'order': node.order,
                    'xp_reward': node.xp_reward,
                    'is_bonus': node.is_bonus,
                    'starting_lives': node.starting_lives,
                    'practice_question_count': node.practice_question_count,
                    'test_question_count': node.test_question_count,
                    'test_pass_percentage': node.test_pass_percentage,
                    'youtube_url': node.youtube_url,
                    'questions': questions,
                })
            # revision nodes for this path
            rev_nodes = []
            for rn in path.revision_nodes.all():
                rev_nodes.append({
                    'id': rn.id,
                    'title': rn.title,
                    'side': rn.side,
                    'xp_reward': rn.xp_reward,
                    'appears_after_node_id': rn.appears_after_node_id,
                    'type': 'REVISION',
                })
            chapters.append({
                'id': path.id,
                'title': path.title,
                'description': path.description,
                'nodes': nodes,
                'revision_nodes': rev_nodes,
            })

        return Response({
            'id': unit.id,
            'title': unit.title,
            'subject': unit.subject,
            'class_grade': unit.class_grade,
            'board': unit.board,
            'icon': unit.icon,
            'description': unit.description,
            'chapters': chapters,
        })

    @transaction.atomic
    def put(self, request, pk):
        try:
            unit = CourseUnit.objects.get(id=pk)
        except CourseUnit.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
        if not self._can_edit(request, unit):
            return Response({'error': 'Not assigned to you'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data

        # Update unit metadata
        unit.title = data.get('title', unit.title)
        unit.subject = data.get('subject', unit.subject)
        unit.class_grade = data.get('class_grade', unit.class_grade)
        unit.board = data.get('board', unit.board)
        unit.icon = data.get('icon', unit.icon)
        unit.description = data.get('description', unit.description)
        unit.save()

        # Wipe and recreate chapters/nodes (simplest safe approach)
        unit.paths.all().delete()

        total_nodes = 0
        total_questions = 0
        lesson_node_map: dict = {}
        revision_node_map: dict = {}

        for ch_idx, chap_data in enumerate(data.get('chapters', [])):
            path = LearningPath.objects.create(
                unit=unit,
                title=chap_data.get('title', f'Chapter {ch_idx + 1}'),
                description=chap_data.get('description', ''),
                class_grade=unit.class_grade,
                is_active=True,
            )
            last_lesson_node = None
            lesson_node_order = 0

            for node_data in chap_data.get('nodes', []):
                node_type = node_data.get('type', 'LESSON')
                node_client_key = node_data.get('node_client_key', '')

                if node_type == 'REVISION':
                    parent_key = node_data.get('appears_after_node_key', '')
                    parent_node = (
                        lesson_node_map.get(parent_key)
                        if parent_key and parent_key in lesson_node_map
                        else last_lesson_node
                    )
                    if parent_node:
                        rn = RevisionNode.objects.create(
                            path=path,
                            title=node_data.get('title', 'Revision'),
                            appears_after_node=parent_node,
                            side=node_data.get('side', 'right'),
                            xp_reward=node_data.get('xp_reward', 15),
                        )
                        revision_node_map[node_client_key] = rn
                        total_nodes += 1
                    continue

                lesson_node_order += 1
                node = LearningNode.objects.create(
                    path=path,
                    title=node_data.get('title', f'Node {lesson_node_order}'),
                    node_type=node_type,
                    order=lesson_node_order,
                    xp_reward=node_data.get('xp_reward', 10),
                    is_bonus=bool(node_data.get('is_bonus', False)),
                    starting_lives=node_data.get('starting_lives', 3),
                    practice_question_count=node_data.get('practice_question_count', 5),
                    test_question_count=node_data.get('test_question_count', 10),
                    test_pass_percentage=node_data.get('test_pass_percentage', 70),
                    youtube_url=node_data.get('youtube_url', ''),
                )
                last_lesson_node = node
                lesson_node_map[node_client_key] = node
                total_nodes += 1

                raw_questions = node_data.get('questions') or [
                    {'id': qid, 'hint': '', 'explanation': ''} for qid in node_data.get('question_ids', [])
                ]
                for q_entry in raw_questions:
                    qid = q_entry['id'] if isinstance(q_entry, dict) else q_entry
                    custom_hint = q_entry.get('hint', '') if isinstance(q_entry, dict) else ''
                    custom_explanation = q_entry.get('explanation', '') if isinstance(q_entry, dict) else ''
                    try:
                        qb = QuestionBank.objects.get(id=qid)
                        if qb.question_type in ('MCQ', 'ASSERTION_REASON'):
                            opts = list(qb.options.values('option_label', 'option_text', 'is_correct'))
                            options_json = {o['option_label']: o['option_text'] for o in opts}
                            correct = next((o['option_label'] for o in opts if o['is_correct']), '')
                        else:
                            options_json = {}
                            correct = qb.answer_text or ''
                        LessonQuestion.objects.create(
                            node=node,
                            question_type=qb.question_type,
                            question_text=qb.question_text,
                            options_json=options_json,
                            correct_answer=correct[:500],
                            concept=qb.concept,
                            hint=custom_hint,
                            explanation=custom_explanation,
                            source_question=qb,
                        )
                        total_questions += 1
                    except QuestionBank.DoesNotExist:
                        pass

        return Response({
            'message': 'Course updated successfully',
            'unit_id': unit.id,
            'nodes': total_nodes,
            'questions': total_questions,
        })
