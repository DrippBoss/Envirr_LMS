from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission


class IsStudent(BasePermission):
    """Allows access only to users with a StudentProfile (i.e. role=student)."""
    message = 'A student profile is required to access this resource.'

    def has_permission(self, request, _view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile')
        )
from .models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion, NodeProgress, 
    FlashcardDeck, FlashcardProgress, SessionAnswer, RevisionNode, RevisionNodeProgress, UnitPrerequisiteSeen,
    Flashcard
)
from .serializers import (
    CourseUnitSerializer, LearningPathSerializer, FlashcardDeckSerializer, 
    LessonQuestionSerializer, FullLearningNodeSerializer, FlashcardSerializer
)
from .services import (
    unlock_next_nodes, award_node_xp, calculate_stars, 
    get_personalised_revision_deck, get_post_node_cards
)
from django.shortcuts import get_object_or_404
import random
from ai_engine.models import QuestionBank

class DashboardView(generics.ListAPIView):
    serializer_class = CourseUnitSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profile'): return CourseUnit.objects.none()
        return CourseUnit.objects.filter(class_grade=user.profile.class_grade, is_published=True)

class UnitPrerequisitesView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request, unit_id):
        unit = get_object_or_404(CourseUnit, pk=unit_id)
        # Check if already seen
        if UnitPrerequisiteSeen.objects.filter(student=request.user.profile, course_unit=unit).exists():
            return Response({'status': 'already_seen', 'deck': None})
            
        deck = unit.prereq_decks.first()
        if not deck:
            return Response({'status': 'no_prerequisites', 'deck': None})
            
        return Response({'status': 'presend', 'deck': FlashcardDeckSerializer(deck).data})

    def post(self, request, unit_id):
        unit = get_object_or_404(CourseUnit, pk=unit_id)
        UnitPrerequisiteSeen.objects.get_or_create(student=request.user.profile, course_unit=unit)
        
        # Unlock first node of first path
        first_path = unit.paths.filter(is_active=True).first()
        if first_path:
            first_node = first_path.nodes.order_by('order').first()
            if first_node:
                NodeProgress.objects.get_or_create(
                    student=request.user.profile,
                    node=first_node,
                    defaults={'status': 'UNLOCKED'}
                )
        return Response({'status': 'success'})

class MapDataView(views.APIView):
    permission_classes = [IsStudent]
    
    def get(self, request, path_id):
        path = get_object_or_404(LearningPath, pk=path_id)
        unit = path.unit

        # Check prerequisites
        if unit and not UnitPrerequisiteSeen.objects.filter(student=request.user.profile, course_unit=unit).exists():
            # If there are NO prereq decks at all, we can allow it
            if unit.prereq_decks.exists():
                return Response({'error': 'PREREQUISITES_NOT_SEEN', 'unit_id': unit.id}, status=403)
        
        # Ensure first node is at least UNLOCKED if they reached the map
        first_node = path.nodes.order_by('order').first()
        if first_node:
             NodeProgress.objects.get_or_create(
                 student=request.user.profile,
                 node=first_node,
                 defaults={'status': 'UNLOCKED'}
             )
             
        return Response(LearningPathSerializer(path, context={'request': request}).data)

class NodeStartView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog, _ = NodeProgress.objects.get_or_create(student=request.user.profile, node=node)
        
        if prog.status == 'LOCKED':
            return Response({'error': 'Node is locked'}, status=403)
            
        if prog.status == 'UNLOCKED':
            prog.status = 'IN_PROGRESS'
        
        path = node.path
        unit = path.unit if path else None
        breadcrumb = {
            'title': node.title,
            'path_title': path.title if path else '',
            'path_id': path.id if path else None,
            'subject': unit.subject if unit else 'Mathematics',
            'grade': f"Grade {path.class_grade or (unit.class_grade if unit else '')}",
        }

        if node.node_type == 'CHAPTER_TEST':
            prog.current_step = 'PRACTICE'
            prog.save()
            return Response({'step': 'PRACTICE', 'node_type': 'CHAPTER_TEST', **breadcrumb})

        # If no video exists, advance straight to practice so NodePracticeView won't block
        video_url = node.youtube_url or (node.video_file.url if node.video_file else None)
        if not video_url and prog.current_step in ('NOT_STARTED', 'VIDEO_DONE'):
            prog.current_step = 'PRACTICE'
            if prog.lives_remaining == 0:
                prog.lives_remaining = node.starting_lives
        prog.save()
        return Response({
            'step': prog.current_step,
            'node_type': 'LESSON',
            'video_url': video_url,
            'description': node.description,
            'objectives': node.objectives_json,
            **breadcrumb,
        })

class NodeVideoCompleteView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        if prog.current_step in ['VIDEO_DONE', 'NOT_STARTED']:
            prog.current_step = 'PRACTICE'
            # Reset lives if not completed
            if prog.status != 'COMPLETED':
                prog.lives_remaining = node.starting_lives
            prog.save()
        return Response({'step': 'PRACTICE', 'lives': prog.lives_remaining})

class NodePracticeView(views.APIView):
    permission_classes = [IsStudent]
    
    def get(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        
        if prog.current_step not in ['PRACTICE', 'COMPLETED']:
            return Response({'error': 'Finish the video lesson first!'}, status=403)
            
        questions = list(node.questions.all())
        random.shuffle(questions)
        count = node.test_question_count if node.node_type == 'CHAPTER_TEST' else node.practice_question_count
        questions = questions[:count]
        return Response(LessonQuestionSerializer(questions, many=True).data)

class NodePracticeAnswerView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        
        if prog.current_step not in ['PRACTICE', 'COMPLETED']:
            return Response({'error': 'Finish the video lesson first!'}, status=403)
        
        q_id = request.data.get('question_id')
        given_answer = request.data.get('given_answer')
        q = get_object_or_404(LessonQuestion, pk=q_id, node=node)
        
        if q.question_type == 'MULTI_SELECT':
            # given_answer is comma-separated selected IDs e.g. "3,1,5,7"
            # correct_answer is sorted comma-separated IDs e.g. "1,3,5,7"
            given_ids = sorted(int(x) for x in str(given_answer).strip().split(',') if x.strip().isdigit())
            correct_ids = sorted(int(x) for x in str(q.correct_answer).strip().split(',') if x.strip().isdigit())
            is_correct = given_ids == correct_ids
        elif q.question_type == 'PROOF_PUZZLE':
            # given_answer is "0,1,2,3" — compare to correct order stored in correct_answer
            is_correct = str(given_answer).strip() == str(q.correct_answer).strip()
        elif q.question_type == 'REARRANGE':
            # Remove all whitespace for robust math/text comparison
            given = "".join(str(given_answer).split()).lower()
            
            # Accommodate AI generating multiple possible valid sequences separated by '|'
            possible_corrects = [ "".join(c.split()).lower() for c in str(q.correct_answer).split('|') ]
            is_correct = given in possible_corrects
            
            # Fallback for commutative binomial factors: (x-2)(x-3) should be identical to (x-3)(x-2)
            if not is_correct:
                import re
                given_factors = re.findall(r'\(([^)]+)\)', given)
                # Ensure the entire string is just these factors (no loose variables outside)
                if given_factors and "".join(f"({f})" for f in given_factors) == given:
                    for pc in possible_corrects:
                        pc_factors = re.findall(r'\(([^)]+)\)', pc)
                        if pc_factors and "".join(f"({f})" for f in pc_factors) == pc:
                            if sorted(given_factors) == sorted(pc_factors):
                                is_correct = True
                                break
        elif q.question_type in ('MCQ', 'ASSERTION_REASON') and q.options_json:
            # Frontend always sends the option KEY (e.g. 'C').
            # correct_answer may be stored as a KEY ('C') or as option TEXT ('a³b²') — handle both.
            given = str(given_answer).strip().upper()
            stored = str(q.correct_answer).strip()
            is_correct = (
                given == stored.upper()                                   # key vs key
                or q.options_json.get(given, '').lower() == stored.lower()  # resolve key → text vs text
            )
        else:
            # Normalize all whitespace so "a × b", "a×b", "a  ×  b" all match
            given_norm = "".join(str(given_answer).lower().split())
            correct_norm = "".join(str(q.correct_answer).lower().split())
            is_correct = given_norm == correct_norm
        
        SessionAnswer.objects.create(
            student=request.user.profile,
            node=node,
            question=q,
            given_answer=given_answer,
            is_correct=is_correct
        )
        
        node_failed = False
        if not is_correct and prog.status != 'COMPLETED':
            # For tests, we still reduce lives. Frontend sets lives to 99 visually so tests don't break early.
            # However, if we want to let tests finish and evaluate at the end, we shouldn't fail early.
            if node.node_type != 'CHAPTER_TEST':
                prog.lives_remaining = max(0, prog.lives_remaining - 1)
                prog.save()
                if prog.lives_remaining == 0:
                    node_failed = True
                
        return Response({
            'is_correct': is_correct,
            'correct_answer': q.correct_answer,
            'explanation': q.explanation,
            'hint': q.hint if not is_correct else '',
            'lives_remaining': prog.lives_remaining,
            'node_failed': node_failed
        })

class NodePracticeRetryView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        prog.lives_remaining = node.starting_lives
        prog.current_step = 'NOT_STARTED'
        prog.attempts += 1
        prog.save()
        return Response({'status': 'reset'})

class NodePracticeCompleteView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        
        if prog.status != 'COMPLETED':
            if node.node_type == 'CHAPTER_TEST':
                # Check pass percentage
                total_questions = node.test_question_count
                answers = SessionAnswer.objects.filter(student=request.user.profile, node=node).order_by('-answered_at')[:total_questions]
                correct_count = sum(1 for a in answers if a.is_correct)
                score_pct = (correct_count / total_questions * 100) if total_questions > 0 else 0
                
                if score_pct >= node.test_pass_percentage:
                    prog.status = 'COMPLETED'
                    prog.current_step = 'COMPLETED'
                    prog.stars = 3
                    prog.xp_earned = node.xp_reward
                    prog.save()
                    from django.utils import timezone
                    prog.completed_at = timezone.now()
                    prog.save()
                    award_node_xp(request.user.profile, node, node.xp_reward, is_test=True)
                    unlock_next_nodes(request.user.profile, node)
                else:
                    prog.status = 'IN_PROGRESS'
                    prog.current_step = 'NOT_STARTED'  # Force retry
                    prog.attempts += 1
                    prog.save()
                    return Response({'status': 'failed', 'score': score_pct})
            else:
                prog.status = 'COMPLETED'
                prog.current_step = 'COMPLETED'
                wrong_answers = node.starting_lives - prog.lives_remaining
                prog.stars = calculate_stars(wrong_answers, node.practice_question_count)
                prog.xp_earned = node.xp_reward
                prog.save()
                
                from django.utils import timezone
                prog.completed_at = timezone.now()
                prog.save()
                
                award_node_xp(request.user.profile, node, node.xp_reward)
                unlock_next_nodes(request.user.profile, node)
            
        return Response({'status': 'success', 'stars': prog.stars, 'xp': prog.xp_earned})

class NodeRevisionCardsView(views.APIView):
    permission_classes = [IsStudent]
    
    def get(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        cards = get_post_node_cards(request.user.profile, node)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        prog.flashcard_shown = True
        prog.save()
        return Response(FlashcardSerializer(cards, many=True).data)

class FlashcardMarkSeenView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, card_id):
        card = get_object_or_404(Flashcard, pk=card_id)
        fp, _ = FlashcardProgress.objects.get_or_create(student=request.user.profile, card=card)
        fp.seen = True
        fp.times_seen += 1
        fp.save()
        
        if request.data.get('known'):
            fp.marked_known = True
            fp.save()
            
        return Response({'status': 'success'})

class RevisionNodeDetailView(views.APIView):
    permission_classes = [IsStudent]
    
    def get(self, request, rev_id):
        rnode = get_object_or_404(RevisionNode, pk=rev_id)
        cards = get_personalised_revision_deck(request.user.profile, rnode)
        return Response(FlashcardSerializer(cards, many=True).data)
        
    def post(self, request, rev_id):
        rnode = get_object_or_404(RevisionNode, pk=rev_id)
        prog, _ = RevisionNodeProgress.objects.get_or_create(student=request.user.profile, revision_node=rnode)
        if not prog.completed:
            prog.completed = True
            prog.xp_earned = rnode.xp_reward
            prog.save()
            award_node_xp(request.user.profile, rnode, rnode.xp_reward)
        return Response({'status': 'success', 'xp_earned': prog.xp_earned})

class ChapterTestStartView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id, node_type='CHAPTER_TEST')
        # Pull from QuestionBank
        count = node.test_question_count
        qs = QuestionBank.objects.filter(**node.question_filter).order_by('?')[:count]
        data = []
        for q in qs:
            data.append({
                'id': q.id,
                'question_type': q.question_type,
                'question_text': q.question_text,
                # For MCQ, add options manually if needed, or assume it's part of context. 
                # Let's keep it simple for now and just pass raw text as placeholders
            })
        return Response(data)

class ChapterTestCompleteView(views.APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        score_pct = request.data.get('score', 0)
        
        passed = score_pct >= node.test_pass_percentage
        if passed:
            prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
            prog.status = 'COMPLETED'
            prog.current_step = 'COMPLETED'
            prog.stars = 3
            prog.xp_earned = node.xp_reward
            prog.save()
            award_node_xp(request.user.profile, node, node.xp_reward, is_test=True)
            unlock_next_nodes(request.user.profile, node)
        
        return Response({'passed': passed})


class WeakConceptsView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        spots = (
            request.user.profile.weak_spots
            .filter(is_resolved=False)
            .order_by('-wrong_count')[:8]
        )
        data = [
            {
                'id': s.id,
                'concept': s.concept,
                'subject': s.subject,
                'chapter': s.chapter,
                'wrong_count': s.wrong_count,
            }
            for s in spots
        ]
        return Response(data)


class ActivityFeedView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        answers = (
            SessionAnswer.objects
            .filter(student=request.user.profile)
            .select_related('node', 'question')
            .order_by('-answered_at')[:20]
        )
        seen_nodes = set()
        feed = []
        for a in answers:
            node_id = a.node_id
            if node_id in seen_nodes:
                continue
            seen_nodes.add(node_id)
            feed.append({
                'type': 'lesson',
                'title': f"Practiced: {a.node.title}",
                'node_id': node_id,
                'is_correct': a.is_correct,
                'answered_at': a.answered_at,
            })
            if len(feed) >= 6:
                break
        return Response(feed)


class MockTestQuestionsView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        import random
        from ai_engine.models import QuestionBank

        student = request.user.profile

        # Priority 1: chapters from unresolved weak spots
        weak_chapters = list(
            WeakSpot.objects.filter(student=student, is_resolved=False)
            .values_list('chapter', flat=True).distinct()[:4]
        )

        # Priority 2: chapters from nodes the student has practiced
        if not weak_chapters:
            weak_chapters = list(
                SessionAnswer.objects.filter(student=student)
                .select_related('question')
                .values_list('question__concept', flat=True)
                .distinct()[:4]
            )
            weak_chapters = [c for c in weak_chapters if c]

        if weak_chapters:
            bank_qs = list(QuestionBank.objects.filter(chapter__in=weak_chapters))
        else:
            # No history yet — pull from any published chapter
            bank_qs = list(QuestionBank.objects.all())

        random.shuffle(bank_qs)
        bank_qs = bank_qs[:10]

        result = []
        for bq in bank_qs:
            if bq.question_type in ('MCQ', 'ASSERTION_REASON'):
                opts = bq.options.all().order_by('order')
                options_json = {o.option_label: o.option_text for o in opts}
            else:
                options_json = {}

            result.append({
                'id': bq.id,
                'question_type': bq.question_type,
                'question_text': bq.question_text,
                'options_json': options_json,
                'chapter': bq.chapter,
                'subject': bq.subject,
            })

        return Response(result)


class MockTestCheckView(views.APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        from ai_engine.models import QuestionBank
        from django.utils import timezone

        question_id = request.data.get('question_id')
        given_answer = str(request.data.get('given_answer', '')).strip()

        bq = get_object_or_404(QuestionBank, pk=question_id)

        if bq.question_type in ('MCQ', 'ASSERTION_REASON'):
            opts = bq.options.all().order_by('order')
            options_json = {o.option_label: o.option_text for o in opts}
            correct_opt = opts.filter(is_correct=True).first()
            correct_key = correct_opt.option_label if correct_opt else ''
            correct_text = options_json.get(correct_key, '')

            given_up = given_answer.upper()
            is_correct = (
                given_up == correct_key.upper()
                or options_json.get(given_up, '').lower() == correct_text.lower()
            )
            correct_display = f"{correct_key}: {correct_text}" if correct_key else ''
        else:
            correct_display = (bq.answer_text or '')[:500]
            is_correct = given_answer.lower() == correct_display.lower()

        # Update WeakSpot on wrong answer
        if not is_correct:
            spot, _ = WeakSpot.objects.get_or_create(
                student=request.user.profile,
                chapter=bq.chapter,
                concept=bq.concept or bq.chapter,
                defaults={'subject': bq.subject, 'wrong_count': 0}
            )
            spot.wrong_count += 1
            spot.last_wrong_at = timezone.now()
            spot.save()

        return Response({
            'is_correct': is_correct,
            'correct_answer': correct_display,
            'explanation': (bq.answer_text or '')[:600],
            'hint': '',
        })


class StudyGroupsView(views.APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        from django.db.models import Count
        active = (
            NodeProgress.objects
            .filter(status='IN_PROGRESS')
            .exclude(student=request.user.profile)
            .select_related('node__path__unit')
            .values(
                'node__path__id',
                'node__path__title',
                'node__path__unit__subject',
                'node__path__unit__class_grade',
            )
            .annotate(count=Count('student', distinct=True))
            .order_by('-count')[:6]
        )

        return Response([
            {
                'path_id': item['node__path__id'],
                'path_title': item['node__path__title'],
                'subject': item['node__path__unit__subject'] or 'Mathematics',
                'grade': item['node__path__unit__class_grade'] or '',
                'active_count': item['count'],
            }
            for item in active
        ])
