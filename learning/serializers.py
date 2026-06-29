from rest_framework import serializers
from .models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion,
    NodeProgress, Flashcard, FlashcardDeck, RevisionNode,
    RevisionNodeProgress, WeakSpot
)


def build_learning_context(request):
    """Build a serializer context that pre-fetches all of a student's progress
    in a handful of flat queries, eliminating the per-node N+1 in the nested
    CourseUnit -> Path -> Node serializers. Serializers read from these maps
    when present and fall back to per-object queries otherwise."""
    ctx = {'request': request}
    user = getattr(request, 'user', None)
    if not (user and user.is_authenticated and hasattr(user, 'profile')):
        return ctx
    profile = user.profile
    ctx['progress_map'] = {
        p.node_id: p for p in NodeProgress.objects.filter(student=profile)
    }
    ctx['revision_progress_map'] = {
        p.revision_node_id: p for p in RevisionNodeProgress.objects.filter(student=profile)
    }
    ctx['weak_concepts'] = set(
        WeakSpot.objects.filter(student=profile, is_resolved=False)
        .values_list('concept', flat=True)
    )
    return ctx

class CourseUnitSerializer(serializers.ModelSerializer):
    paths = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = CourseUnit
        fields = ('id', 'title', 'subject', 'class_grade', 'board', 'order', 'icon', 'description', 'paths', 'progress_percentage')

    def get_paths(self, obj):
        # Python-filter the prefetched paths to avoid a per-unit query.
        active_paths = [p for p in obj.paths.all() if p.is_active]
        return LearningPathSerializer(active_paths, many=True, context=self.context).data

    def get_progress_percentage(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated or user.role != 'student':
            return 0
        # Walk prefetched paths/nodes; count completions from the progress map.
        node_ids = [
            n.id
            for p in obj.paths.all()
            for n in p.nodes.all()
            if not n.is_archived
        ]
        total_nodes = len(node_ids)
        if total_nodes == 0:
            return 0
        pmap = self.context.get('progress_map')
        if pmap is not None:
            completed_nodes = sum(
                1 for nid in node_ids
                if (prog := pmap.get(nid)) and prog.status == 'COMPLETED'
            )
        else:
            completed_nodes = NodeProgress.objects.filter(
                student=user.profile, node_id__in=node_ids, status='COMPLETED'
            ).count()
        return int((completed_nodes / total_nodes) * 100)

class SimpleLearningNodeSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = LearningNode
        fields = ('id', 'title', 'node_type', 'order', 'xp_reward', 'is_bonus',
                  'unlock_min_stars', 'lab_type', 'lab_category', 'lab_required_completions',
                  'status', 'progress')
        
    def _progress(self, obj):
        pmap = self.context.get('progress_map')
        if pmap is not None:
            return pmap.get(obj.id)
        user = self.context['request'].user
        if hasattr(user, 'profile'):
            return NodeProgress.objects.filter(student=user.profile, node=obj).first()
        return None

    def get_status(self, obj):
        prog = self._progress(obj)
        return prog.status if prog else 'LOCKED'

    def get_progress(self, obj):
        prog = self._progress(obj)
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
            rmap = self.context.get('revision_progress_map')
            if rmap is not None:
                prog = rmap.get(obj.id)
            else:
                prog = RevisionNodeProgress.objects.filter(student=user.profile, revision_node=obj).first()
            if prog and prog.completed: return 'COMPLETED'
            return 'UNLOCKED' # If they can see it, it's unlocked since progress objects are only created when unlocked
        return 'LOCKED'

    def get_cards_for_you(self, obj):
        user = self.context['request'].user
        if hasattr(user, 'profile'):
             # How many weak spots match the deck?
             weak = self.context.get('weak_concepts')
             if weak is None:
                 weak = set(WeakSpot.objects.filter(
                     student=user.profile,
                     is_resolved=False
                 ).values_list('concept', flat=True))

             deck = getattr(obj, 'deck', None)
             if deck:
                 d = deck.first()
                 if d:
                     return sum(1 for c in d.cards.all() if c.concept in weak)
        return 0

class LearningPathSerializer(serializers.ModelSerializer):
    nodes = serializers.SerializerMethodField()
    revision_nodes = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()
    unit_id = serializers.IntegerField(read_only=True)
    unit_title = serializers.SerializerMethodField()

    class Meta:
        model = LearningPath
        fields = ('id', 'title', 'description', 'subject', 'grade', 'unit_id', 'unit_title', 'nodes', 'revision_nodes')

    def get_unit_title(self, obj):
        return obj.unit.title if obj.unit else ''

    def get_subject(self, obj):
        return obj.unit.subject if obj.unit else 'Mathematics'

    def get_grade(self, obj):
        return f"Grade {obj.class_grade}" if obj.class_grade else (f"Grade {obj.unit.class_grade}" if obj.unit else '')

    def get_nodes(self, obj):
        # Python-filter the prefetched nodes to avoid a per-path query.
        nodes = [n for n in obj.nodes.all() if not n.is_archived]
        return SimpleLearningNodeSerializer(nodes, many=True, context=self.context).data
        
    def get_revision_nodes(self, obj):
        rnodes = obj.revision_nodes.all()
        # only show them if unlocked (progress exists)
        user = self.context['request'].user
        if hasattr(user, 'profile'):
            rmap = self.context.get('revision_progress_map')
            if rmap is not None:
                unlocked_ids = set(rmap.keys())
                rnodes = [r for r in rnodes if r.id in unlocked_ids]
            else:
                unlocked_ids = RevisionNodeProgress.objects.filter(student=user.profile).values_list('revision_node_id', flat=True)
                rnodes = rnodes.filter(id__in=unlocked_ids)
            return RevisionNodeSerializer(rnodes, many=True, context=self.context).data
        return []

class FlashcardSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Flashcard
        fields = ('id', 'title', 'body', 'card_type', 'has_formula', 'formula_text',
                  'example_text', 'image', 'image_description')

    def get_image(self, obj):
        # Relative /media/... URL; the frontend reaches it through the same-origin proxy.
        return obj.image.url if obj.image else None

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
    options_json = serializers.SerializerMethodField()
    hint = serializers.CharField()

    class Meta:
        model = LessonQuestion
        fields = ('id', 'question_type', 'question_text', 'options_json', 'hint')  # correct_answer explicitly omitted

    def get_options_json(self, obj):
        if obj.question_type == 'PROOF_PUZZLE':
            import random as _rnd
            steps = list(obj.options_json.get('steps', []))
            _rnd.shuffle(steps)
            return {'steps': steps}
        return obj.options_json


# ── Assignments & Calendar ──────────────────────────────────────────────────
from .models import Assignment, AssignmentSubmission, CalendarEvent, Section, SectionMembership


class SectionMemberSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='student.id', read_only=True)
    name = serializers.SerializerMethodField()
    username = serializers.CharField(source='student.user.username', read_only=True)

    class Meta:
        model = SectionMembership
        fields = ['id', 'name', 'username', 'joined_at']

    def get_name(self, obj):
        u = obj.student.user
        return u.get_full_name() or u.username


class SectionSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = [
            'id', 'name', 'class_grade', 'subject', 'board',
            'join_code', 'member_count', 'created_at',
        ]
        read_only_fields = ['join_code', 'created_at']

    def get_member_count(self, obj):
        return obj.memberships.count()


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_username = serializers.CharField(source='student.user.username', read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'student', 'student_name', 'student_username',
            'note', 'submission_file', 'status', 'marks', 'feedback',
            'submitted_at', 'graded_at',
        ]
        read_only_fields = ['status', 'marks', 'feedback', 'submitted_at', 'graded_at']

    def get_student_name(self, obj):
        u = obj.student.user
        return u.get_full_name() or u.username


class AssignmentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    submission_count = serializers.SerializerMethodField()
    graded_count = serializers.SerializerMethodField()
    attached_paper_title = serializers.CharField(source='attached_paper.title', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    # Per-student fields (populated only in the student list view via context).
    my_status = serializers.SerializerMethodField()
    my_marks = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'subject', 'class_grade', 'board',
            'created_by', 'created_by_name', 'due_date', 'max_marks',
            'attached_paper', 'attached_paper_title', 'section', 'section_name',
            'is_published', 'created_at', 'submission_count', 'graded_count',
            'my_status', 'my_marks',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_submission_count(self, obj):
        return obj.submissions.count()

    def get_graded_count(self, obj):
        return obj.submissions.filter(status='GRADED').count()

    def _my_sub(self, obj):
        subs = self.context.get('my_subs')
        if subs is None:
            return None
        return subs.get(obj.id)

    def get_my_status(self, obj):
        sub = self._my_sub(obj)
        return sub.status if sub else 'PENDING'

    def get_my_marks(self, obj):
        sub = self._my_sub(obj)
        return sub.marks if sub else None


class CalendarEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    section_name = serializers.CharField(source='section.name', read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'description', 'event_type', 'start', 'end',
            'all_day', 'subject', 'class_grade', 'assignment', 'section',
            'section_name', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username
