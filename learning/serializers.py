from rest_framework import serializers
from .models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion, 
    NodeProgress, Flashcard, FlashcardDeck, RevisionNode, 
    RevisionNodeProgress, WeakSpot, FlashcardProgress
)

class CourseUnitSerializer(serializers.ModelSerializer):
    paths = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = CourseUnit
        fields = ('id', 'title', 'subject', 'class_grade', 'board', 'order', 'icon', 'description', 'paths', 'progress_percentage')

    def get_paths(self, obj):
        return LearningPathSerializer(obj.paths.filter(is_active=True), many=True, context=self.context).data
        
    def get_progress_percentage(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated or user.role != 'student':
            return 0
        total_nodes = LearningNode.objects.filter(path__unit=obj).count()
        if total_nodes == 0: return 0
        completed_nodes = NodeProgress.objects.filter(
            student=user.profile,
            node__path__unit=obj,
            status='COMPLETED'
        ).count()
        return int((completed_nodes / total_nodes) * 100)

class SimpleLearningNodeSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = LearningNode
        fields = ('id', 'title', 'node_type', 'order', 'xp_reward', 'is_bonus', 'status', 'progress')
        
    def get_status(self, obj):
        user = self.context['request'].user
        if hasattr(user, 'profile'):
            prog = NodeProgress.objects.filter(student=user.profile, node=obj).first()
            if prog: return prog.status
        return 'LOCKED'
        
    def get_progress(self, obj):
        user = self.context['request'].user
        if hasattr(user, 'profile'):
            prog = NodeProgress.objects.filter(student=user.profile, node=obj).first()
            if prog:
                return {
                    'current_step': prog.current_step,
                    'stars': prog.stars,
                    'xp_earned': prog.xp_earned,
                }
        return None

class RevisionNodeSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    cards_for_you = serializers.SerializerMethodField()
    
    class Meta:
        model = RevisionNode
        fields = ('id', 'title', 'appears_after_node', 'side', 'xp_reward', 'is_mandatory', 'status', 'cards_for_you')
        
    def get_status(self, obj):
        user = self.context['request'].user
        if hasattr(user, 'profile'):
            prog = RevisionNodeProgress.objects.filter(student=user.profile, revision_node=obj).first()
            if prog and prog.completed: return 'COMPLETED'
            return 'UNLOCKED' # If they can see it, it's unlocked since progress objects are only created when unlocked
        return 'LOCKED'
        
    def get_cards_for_you(self, obj):
        user = self.context['request'].user
        if hasattr(user, 'profile'):
             # How many weak spots match the deck?
             active_weak_spots = WeakSpot.objects.filter(
                 student=user.profile, 
                 is_resolved=False
             ).values_list('concept', flat=True)
             
             deck = getattr(obj, 'deck', None)
             if deck:
                 d = deck.first()
                 if d:
                     return d.cards.filter(concept__in=active_weak_spots).count()
        return 0

class LearningPathSerializer(serializers.ModelSerializer):
    nodes = serializers.SerializerMethodField()
    revision_nodes = serializers.SerializerMethodField()

    class Meta:
        model = LearningPath
        fields = ('id', 'title', 'description', 'nodes', 'revision_nodes')

    def get_nodes(self, obj):
        nodes = obj.nodes.all()
        return SimpleLearningNodeSerializer(nodes, many=True, context=self.context).data
        
    def get_revision_nodes(self, obj):
        rnodes = obj.revision_nodes.all()
        # only show them if unlocked (progress exists)
        user = self.context['request'].user
        if hasattr(user, 'profile'):
            unlocked_ids = RevisionNodeProgress.objects.filter(student=user.profile).values_list('revision_node_id', flat=True)
            rnodes = rnodes.filter(id__in=unlocked_ids)
            return RevisionNodeSerializer(rnodes, many=True, context=self.context).data
        return []

class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ('id', 'title', 'body', 'card_type', 'has_formula', 'formula_text', 'example_text')

class FlashcardDeckSerializer(serializers.ModelSerializer):
    cards = FlashcardSerializer(many=True, read_only=True)
    class Meta:
        model = FlashcardDeck
        fields = ('id', 'title', 'purpose', 'cards')

class FullLearningNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningNode
        fields = '__all__'

class LessonQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonQuestion
        fields = ('id', 'question_type', 'question_text', 'options_json') # correct_answer explicitly omitted
