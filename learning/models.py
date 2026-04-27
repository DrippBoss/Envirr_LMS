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

class LessonQuestion(models.Model):
    node = models.ForeignKey(LearningNode, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)
    question_text = models.TextField()
    options_json = models.JSONField(default=dict, blank=True)
    correct_answer = models.CharField(max_length=500)
    hint = models.TextField(blank=True)
    explanation = models.TextField(blank=True)
    concept = models.CharField(max_length=150, blank=True)
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
