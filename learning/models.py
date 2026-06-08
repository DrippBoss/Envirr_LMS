from django.db import models
from django.conf import settings

CLASS_CHOICES = [(str(i), f'Class {i}') for i in range(9, 13)]

class ContentTemplate(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    template_type = models.CharField(max_length=50, help_text="E.g., LESSON_VIDEO, CHAPTER_TEST_10")
    config_json = models.JSONField(default=dict, help_text="Default configuration JSON for Node and Questions")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class CourseUnit(models.Model):
    title = models.CharField(max_length=100)
    subject = models.CharField(max_length=100)
    class_grade = models.CharField(max_length=5, choices=CLASS_CHOICES)
    board = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField(default=0)
    icon = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    assigned_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_courses',
        limit_choices_to={'role': 'teacher'},
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title} ({self.class_grade})"

class LearningPath(models.Model):
    unit = models.ForeignKey(CourseUnit, null=True, on_delete=models.SET_NULL, related_name='paths')
    title = models.CharField(max_length=255)
    class_grade = models.CharField(max_length=5, choices=CLASS_CHOICES)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class NodeType(models.TextChoices):
    LESSON = 'LESSON', 'Lesson Node'
    CHAPTER_TEST = 'CHAPTER_TEST', 'Chapter Test'
    LAB = 'LAB', 'Lab Node'

class LabCategory(models.TextChoices):
    INTERACTIVE = 'INTERACTIVE', 'Interactive Explorer'
    CREATIVE = 'CREATIVE', 'Creative Builder'
    SIMULATION = 'SIMULATION', 'Simulation'

class LearningNode(models.Model):
    path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='nodes')
    title = models.CharField(max_length=255)
    node_type = models.CharField(max_length=20, choices=NodeType.choices)
    order = models.PositiveIntegerField()
    xp_reward = models.PositiveIntegerField(default=10)
    is_bonus = models.BooleanField(default=False)
    description = models.TextField(blank=True, help_text="About this lesson text shown on the video page")
    objectives_json = models.JSONField(default=list, blank=True, help_text="List of learning objective strings")

    youtube_url = models.URLField(blank=True)
    video_file = models.FileField(upload_to='lesson_videos/', null=True, blank=True)
    video_duration_seconds = models.PositiveIntegerField(null=True, blank=True)

    practice_question_count = models.PositiveIntegerField(default=5)
    starting_lives = models.PositiveIntegerField(default=3)

    test_question_count = models.PositiveIntegerField(default=10)
    test_pass_percentage = models.PositiveIntegerField(default=70)
    question_filter = models.JSONField(default=dict, blank=True)

    # Lab-only fields
    lab_type = models.CharField(max_length=60, blank=True, help_text="Registry key, e.g. HCF_LCM_VISUALIZER")
    lab_category = models.CharField(max_length=20, choices=LabCategory.choices, blank=True)
    lab_required_completions = models.PositiveIntegerField(
        default=0, help_text="Number of non-lab nodes that must be completed to unlock this lab"
    )

    # Mastery-based unlock
    unlock_min_stars = models.PositiveSmallIntegerField(
        default=0, help_text="Minimum stars (1-3) required on the preceding lesson node to unlock this node. 0 = no requirement."
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        unique_together = [['path', 'order']]

    def __str__(self):
        return f"{self.path.title} - {self.title}"

class QuestionType(models.TextChoices):
    MCQ = 'MCQ', 'Multiple Choice'
    FILL_BLANK = 'FILL_BLANK', 'Fill in the Blank'
    TRUE_FALSE = 'TRUE_FALSE', 'True/False'
    MATCH = 'MATCH', 'Match'
    PROOF_PUZZLE = 'PROOF_PUZZLE', 'Proof Puzzle'
    REARRANGE = 'REARRANGE', 'Rearrange / Picker'
    MULTI_SELECT = 'MULTI_SELECT', 'Select All That Apply'
    SHORT_ANSWER = 'SHORT_ANSWER', 'Short Answer'
    LONG_ANSWER = 'LONG_ANSWER', 'Long Answer'

class LessonQuestion(models.Model):
    node = models.ForeignKey(LearningNode, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)
    question_text = models.TextField()
    options_json = models.JSONField(default=dict, blank=True)
    correct_answer = models.CharField(max_length=500)
    hint = models.TextField(blank=True)
    explanation = models.TextField(blank=True)
    concept = models.CharField(max_length=150, blank=True)
    has_image = models.BooleanField(default=False)
    image = models.ImageField(upload_to='question_images/', null=True, blank=True)
    image_description = models.TextField(blank=True)
    source_question = models.ForeignKey(
        'ai_engine.QuestionBank',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='lesson_copies',
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q for {self.node.title}"

class CompletionStatus(models.TextChoices):
    LOCKED = 'LOCKED', 'Locked'
    UNLOCKED = 'UNLOCKED', 'Unlocked'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'

class NodeStep(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    VIDEO_DONE = 'VIDEO_DONE', 'Video Watched'
    PRACTICE = 'PRACTICE', 'In Practice'
    COMPLETED = 'COMPLETED', 'Completed'

class NodeProgress(models.Model):
    from users.models import StudentProfile # inline import to avoid circular dependency initially if needed, though they are in different apps

    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='node_progress')
    node = models.ForeignKey(LearningNode, on_delete=models.CASCADE, related_name='student_progress')
    status = models.CharField(max_length=20, choices=CompletionStatus.choices, default='LOCKED')
    current_step = models.CharField(max_length=20, choices=NodeStep.choices, default='NOT_STARTED')
    lives_remaining = models.PositiveIntegerField(default=3)
    best_score = models.FloatField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    stars = models.PositiveSmallIntegerField(default=0)
    xp_earned = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_attempted_at = models.DateTimeField(null=True, blank=True)
    flashcard_shown = models.BooleanField(default=False)
    lab_artifact = models.JSONField(null=True, blank=True, help_text="Stores lab output for CREATIVE labs")

    class Meta:
        unique_together = [['student', 'node']]

    def __str__(self):
        return f"{self.student.user.username} - {self.node.title}"

class WeakSpot(models.Model):
    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='weak_spots')
    concept = models.CharField(max_length=150)
    subject = models.CharField(max_length=100)
    chapter = models.CharField(max_length=100)
    wrong_count = models.PositiveIntegerField(default=0)
    last_wrong_at = models.DateTimeField(auto_now=True)
    is_resolved = models.BooleanField(default=False)

    class Meta:
        unique_together = [['student', 'concept', 'subject', 'chapter']]
        ordering = ['-wrong_count']

    def __str__(self):
        return f"WeakSpot: {self.concept} ({self.student.user.username})"

class SessionAnswer(models.Model):
    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE)
    node = models.ForeignKey(LearningNode, on_delete=models.CASCADE)
    question = models.ForeignKey(LessonQuestion, on_delete=models.CASCADE)
    given_answer = models.CharField(max_length=500)
    is_correct = models.BooleanField()
    answered_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.is_correct and self.question.concept:
            weak, _ = WeakSpot.objects.get_or_create(
                student=self.student,
                concept=self.question.concept,
                subject=self.node.path.unit.subject,
                chapter=self.node.path.title,
            )
            weak.wrong_count += 1
            weak.is_resolved = False
            weak.save()

class FlashcardType(models.TextChoices):
    CONCEPT = 'CONCEPT', 'Concept Card'
    FORMULA = 'FORMULA', 'Formula Card'
    EXAMPLE = 'EXAMPLE', 'Example Card'
    MNEMONIC = 'MNEMONIC', 'Mnemonic Card'
    SUMMARY = 'SUMMARY', 'Summary Card'

class Flashcard(models.Model):
    title = models.CharField(max_length=150)
    body = models.TextField()
    card_type = models.CharField(max_length=20, choices=FlashcardType.choices)
    subject = models.CharField(max_length=100)
    chapter = models.CharField(max_length=100)
    concept = models.CharField(max_length=150, blank=True)
    has_formula = models.BooleanField(default=False)
    formula_text = models.TextField(blank=True)
    example_text = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class RevisionNode(models.Model):
    path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='revision_nodes')
    title = models.CharField(max_length=255)
    appears_after_node = models.ForeignKey(LearningNode, on_delete=models.CASCADE, related_name='side_revision')
    side = models.CharField(max_length=10, choices=[('left','Left'),('right','Right')], default='right')
    xp_reward = models.PositiveIntegerField(default=15)
    is_mandatory = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Revision Node'

    def __str__(self):
        return self.title

class DeckPurpose(models.TextChoices):
    PREREQUISITE = 'PREREQUISITE', 'Course Prerequisites'
    POST_NODE = 'POST_NODE', 'Post-Node Revision'
    SIDE_REVISION = 'SIDE_REVISION', 'Side Revision Node'

class FlashcardDeck(models.Model):
    title = models.CharField(max_length=150)
    purpose = models.CharField(max_length=20, choices=DeckPurpose.choices)
    cards = models.ManyToManyField(Flashcard, through='DeckCard')

    course_unit = models.ForeignKey(CourseUnit, null=True, blank=True,
                        on_delete=models.CASCADE, related_name='prereq_decks')
    learning_node = models.ForeignKey(LearningNode, null=True, blank=True,
                        on_delete=models.CASCADE, related_name='revision_decks')
    revision_node = models.ForeignKey(RevisionNode, null=True, blank=True,
                        on_delete=models.CASCADE, related_name='deck')

    class Meta:
        verbose_name = 'Flashcard Deck'

    def __str__(self):
        return self.title

class DeckCard(models.Model):
    deck = models.ForeignKey(FlashcardDeck, on_delete=models.CASCADE)
    card = models.ForeignKey(Flashcard, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = [['deck', 'card']]

class RevisionNodeProgress(models.Model):
    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE)
    revision_node = models.ForeignKey(RevisionNode, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    xp_earned = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [['student', 'revision_node']]

class FlashcardProgress(models.Model):
    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE)
    card = models.ForeignKey(Flashcard, on_delete=models.CASCADE)
    seen = models.BooleanField(default=False)
    marked_known = models.BooleanField(default=False)
    times_seen = models.PositiveIntegerField(default=0)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [['student', 'card']]

class UnitPrerequisiteSeen(models.Model):
    student = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE)
    course_unit = models.ForeignKey(CourseUnit, on_delete=models.CASCADE)
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['student', 'course_unit']]


import secrets
import string

def _invite_code():
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(6))


class StudyGroup(models.Model):
    MAX_MEMBERS = 6
    name        = models.CharField(max_length=100)
    subject     = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    invite_code = models.CharField(max_length=8, unique=True, default=_invite_code)
    creator     = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='created_groups')
    max_members = models.PositiveIntegerField(default=10)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.invite_code})'


class StudyGroupMember(models.Model):
    ROLE_CHOICES = [('admin', 'Admin'), ('member', 'Member')]
    group           = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='memberships')
    student         = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='group_memberships')
    role            = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    joined_at       = models.DateTimeField(auto_now_add=True)
    violation_count = models.PositiveIntegerField(default=0)
    muted_until     = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [['group', 'student']]
        ordering = ['joined_at']

    def __str__(self):
        return f'{self.student} in {self.group}'


class GroupSession(models.Model):
    STATUS = [('waiting', 'Waiting'), ('active', 'Active'), ('completed', 'Completed')]
    SESSION_TYPE = [('questions', 'Questions'), ('pdf', 'PDF Paper')]

    group        = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='sessions')
    title        = models.CharField(max_length=150)
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE, default='questions')
    question_ids = models.JSONField(default=list, help_text='Ordered QuestionBank PKs')
    source       = models.CharField(max_length=20, default='ai_generated')
    source_paper = models.ForeignKey(
        'ai_engine.QuestionPaper', null=True, blank=True, on_delete=models.SET_NULL
    )
    status       = models.CharField(max_length=15, choices=STATUS, default='waiting')
    time_limit   = models.PositiveIntegerField(null=True, blank=True, help_text='Seconds')
    created_by   = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='created_sessions')
    started_at   = models.DateTimeField(null=True, blank=True)
    ended_at     = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.group.name} — {self.title} [{self.status}]'


class GroupSessionProgress(models.Model):
    session      = models.ForeignKey(GroupSession, on_delete=models.CASCADE, related_name='progress')
    student      = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='session_progress')
    answers      = models.JSONField(default=dict, help_text='{"<qid>": "<answer>"}')
    submitted    = models.BooleanField(default=False)
    score        = models.PositiveIntegerField(default=0)
    total        = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True)
    joined_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['session', 'student']]

    def __str__(self):
        return f'{self.student.user.username} — {self.session}'


class GroupChatMessage(models.Model):
    session          = models.ForeignKey(GroupSession, on_delete=models.CASCADE, related_name='chat_messages')
    sender           = models.ForeignKey('users.StudentProfile', null=True, blank=True, on_delete=models.SET_NULL, related_name='chat_messages')
    message          = models.TextField(blank=True)
    image            = models.ImageField(upload_to='group_chat_images/', null=True, blank=True)
    question_number  = models.IntegerField(null=True, blank=True, help_text='PDF question number (1-based)')
    question_id      = models.IntegerField(null=True, blank=True, help_text='QuestionBank PK for question-mode doubts')
    is_doubt         = models.BooleanField(default=False)
    is_system        = models.BooleanField(default=False, help_text='AI/system generated message')
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        sender_name = self.sender.user.username if self.sender else 'System'
        return f'{sender_name}: {self.message[:40]}'


class GroupDoubt(models.Model):
    session              = models.ForeignKey(GroupSession, on_delete=models.CASCADE, related_name='doubts')
    question_number      = models.IntegerField(help_text='1-based question number in PDF')
    doubt_count          = models.IntegerField(default=1)
    escalated_to_ai      = models.BooleanField(default=False)
    escalated_to_teacher = models.BooleanField(default=False)
    ai_response          = models.TextField(blank=True)
    created_at           = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['session', 'question_number']]

    def __str__(self):
        return f'Doubt Q{self.question_number} in {self.session}'


class ChatModerationEvent(models.Model):
    session      = models.ForeignKey(GroupSession, on_delete=models.CASCADE, related_name='moderation_events')
    sender       = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='moderation_events')
    blocked_text = models.TextField()
    reason       = models.CharField(max_length=300)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[BLOCKED] {self.sender} in {self.session_id}: {self.blocked_text[:40]}'


class MockTestAttempt(models.Model):
    student      = models.ForeignKey('users.StudentProfile', on_delete=models.CASCADE, related_name='mock_attempts')
    subject      = models.CharField(max_length=100)
    chapters     = models.JSONField(default=list)
    difficulty   = models.CharField(max_length=20, default='mixed')
    time_limit   = models.PositiveIntegerField(null=True, blank=True, help_text='Seconds; null = untimed')
    question_ids = models.JSONField(default=list, help_text='Ordered list of QuestionBank PKs')
    answers      = models.JSONField(default=dict, help_text='{"<qid>": "<given>"}')
    results      = models.JSONField(default=dict, help_text='Per-question grading output')
    score        = models.PositiveIntegerField(default=0)
    total        = models.PositiveIntegerField(default=0)
    time_taken   = models.PositiveIntegerField(null=True, blank=True, help_text='Seconds')
    completed    = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'MockTest #{self.pk} — {self.student} — {self.score}/{self.total}'
