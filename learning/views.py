from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profile'): return CourseUnit.objects.none()
        return CourseUnit.objects.filter(class_grade=user.profile.class_grade, is_published=True)

class UnitPrerequisitesView(views.APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]
    
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
    permission_classes = [IsAuthenticated]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog, _ = NodeProgress.objects.get_or_create(student=request.user.profile, node=node)
        
        if prog.status == 'LOCKED':
            return Response({'error': 'Node is locked'}, status=403)
            
        if prog.status == 'UNLOCKED':
            prog.status = 'IN_PROGRESS'
        
        if node.node_type == 'CHAPTER_TEST':
            prog.current_step = 'PRACTICE'
            prog.save()
            return Response({'step': 'PRACTICE', 'node_type': 'CHAPTER_TEST'})
            
        # Keep it at NOT_STARTED so they see the video first
        prog.save()
        
        # If it was already completed, we still let them review
        video_url = node.youtube_url or (node.video_file.url if node.video_file else None)
        return Response({
            'step': prog.current_step,
            'node_type': 'LESSON',
            'video_url': video_url,
        })

class NodeVideoCompleteView(views.APIView):
    permission_classes = [IsAuthenticated]
    
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
    permission_classes = [IsAuthenticated]
    
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
    permission_classes = [IsAuthenticated]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        
        if prog.current_step not in ['PRACTICE', 'COMPLETED']:
            return Response({'error': 'Finish the video lesson first!'}, status=403)
        
        q_id = request.data.get('question_id')
        given_answer = request.data.get('given_answer')
        q = get_object_or_404(LessonQuestion, pk=q_id, node=node)
        
        is_correct = str(given_answer).lower().strip() == str(q.correct_answer).lower().strip()
        
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
    permission_classes = [IsAuthenticated]
    
    def post(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        prog.lives_remaining = node.starting_lives
        prog.current_step = 'NOT_STARTED'
        prog.attempts += 1
        prog.save()
        return Response({'status': 'reset'})

class NodePracticeCompleteView(views.APIView):
    permission_classes = [IsAuthenticated]
    
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
    permission_classes = [IsAuthenticated]
    
    def get(self, request, node_id):
        node = get_object_or_404(LearningNode, pk=node_id)
        cards = get_post_node_cards(request.user.profile, node)
        prog = get_object_or_404(NodeProgress, student=request.user.profile, node=node)
        prog.flashcard_shown = True
        prog.save()
        return Response(FlashcardSerializer(cards, many=True).data)

class FlashcardMarkSeenView(views.APIView):
    permission_classes = [IsAuthenticated]
    
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
    permission_classes = [IsAuthenticated]
    
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
    permission_classes = [IsAuthenticated]
    
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
    permission_classes = [IsAuthenticated]
    
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
