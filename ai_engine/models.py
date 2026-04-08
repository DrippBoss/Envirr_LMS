import hashlib
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from courses.models import Lesson

class QuestionType(models.TextChoices):
    MCQ              = "MCQ",              "Multiple Choice"
    ASSERTION_REASON = "ASSERTION_REASON", "Assertion & Reason"
    VERY_SHORT       = "VERY_SHORT",       "Very Short Answer"
    SHORT            = "SHORT",            "Short Answer"
    LONG             = "LONG",             "Long Answer"
    CASE             = "CASE",             "Case Study"

class Difficulty(models.TextChoices):
    EASY   = "easy",   "Easy"
    MEDIUM = "medium", "Medium"
    HARD   = "hard",   "Hard"

class BloomLevel(models.TextChoices):
    REMEMBER   = "remember",   "Remember"
    UNDERSTAND = "understand", "Understand"
    APPLY      = "apply",      "Apply"
    ANALYZE    = "analyze",    "Analyze"
    EVALUATE   = "evaluate",   "Evaluate"
    CREATE     = "create",     "Create"

class IngestionStatus(models.TextChoices):
    PENDING    = "pending",    "Pending"
    PROCESSING = "processing", "Processing"
    DONE       = "done",       "Done"
    FAILED     = "failed",     "Failed"

class SourceDocument(models.Model):
    title        = models.CharField(max_length=255)
    subject      = models.CharField(max_length=100)
    chapter      = models.CharField(max_length=100, blank=True)
    board        = models.CharField(max_length=50, blank=True)
    class_grade  = models.CharField(max_length=20, blank=True)
    file_hash    = models.CharField(max_length=64, unique=True)
    status       = models.CharField(
                       max_length=20,
                       choices=IngestionStatus.choices,
                       default=IngestionStatus.PENDING
                   )
    page_count   = models.IntegerField(null=True, blank=True)
    uploaded_at  = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    notes        = models.TextField(blank=True)

    class Meta:
        ordering = ["-uploaded_at"]
        verbose_name = "Source Document"

    def __str__(self):
        return f"{self.title} ({self.board} {self.class_grade})"

class QuestionBank(models.Model):
    subject       = models.CharField(max_length=100, db_index=True)
    chapter       = models.CharField(max_length=100, db_index=True)
    concept       = models.CharField(max_length=150, blank=True)
    question_type = models.CharField(max_length=20,  choices=QuestionType.choices, db_index=True)
    marks         = models.PositiveIntegerField(
                        validators=[MinValueValidator(1), MaxValueValidator(20)]
                    )
    difficulty    = models.CharField(max_length=10, choices=Difficulty.choices, db_index=True)
    bloom_level   = models.CharField(max_length=20, choices=BloomLevel.choices, blank=True)

    question_text = models.TextField()
    answer_text   = models.TextField()
    has_image     = models.BooleanField(default=False)
    image         = models.ImageField(upload_to="question_images/", null=True, blank=True)

    tags            = models.JSONField(default=list, blank=True)
    question_hash   = models.CharField(max_length=64, unique=True)
    is_ai_generated = models.BooleanField(default=False, db_index=True)
    is_verified     = models.BooleanField(default=False, db_index=True)
    times_used      = models.PositiveIntegerField(default=0)
    last_used_at    = models.DateTimeField(null=True, blank=True)

    source_document = models.ForeignKey(
                          SourceDocument,
                          null=True, blank=True,
                          on_delete=models.SET_NULL,
                          related_name="questions"
                      )
    source_page     = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["subject", "chapter", "question_type"]
        indexes = [
            models.Index(fields=["subject", "chapter", "question_type", "difficulty"],
                         name="idx_question_filter"),
            models.Index(fields=["is_ai_generated", "is_verified"],
                         name="idx_ai_quality"),
            models.Index(fields=["subject", "chapter", "bloom_level"],
                         name="idx_bloom"),
        ]
        verbose_name = "Question"
        verbose_name_plural = "Question Bank"

    def save(self, *args, **kwargs):
        if not self.question_hash:
            raw = f"{self.subject}{self.chapter}{self.question_text.strip().lower()}"
            self.question_hash = hashlib.sha256(raw.encode()).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.question_type}] {self.question_text[:80]}"

class MCQOption(models.Model):
    question    = models.ForeignKey(
                      QuestionBank,
                      on_delete=models.CASCADE,
                      related_name="options"
                  )
    option_label = models.CharField(max_length=1)
    option_text  = models.TextField()
    is_correct   = models.BooleanField(default=False)
    order        = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        unique_together = [["question", "option_label"]]
        verbose_name = "MCQ Option"

    def __str__(self):
        return f"{self.option_label}) {self.option_text[:60]}"

class CaseStudyPart(models.Model):
    parent_question = models.ForeignKey(
                          QuestionBank,
                          on_delete=models.CASCADE,
                          related_name="case_parts"
                      )
    part_number   = models.PositiveSmallIntegerField()
    part_text     = models.TextField()
    part_answer   = models.TextField()
    question_type = models.CharField(
                        max_length=20,
                        choices=QuestionType.choices,
                        default=QuestionType.SHORT
                    )
    marks = models.PositiveIntegerField(
                validators=[MinValueValidator(1), MaxValueValidator(10)]
            )

    class Meta:
        ordering = ["part_number"]
        unique_together = [["parent_question", "part_number"]]
        verbose_name = "Case Study Part"

    def __str__(self):
        return f"Part {self.part_number} of Q#{self.parent_question_id}"

class QuestionPaper(models.Model):
    # From Legacy GeneratedPaper API
    created_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='generated_papers')
    config        = models.JSONField(help_text="Stores the parameters used to generate this paper", null=True, blank=True)
    secure_pdf_path = models.FileField(upload_to='generated_papers/', null=True, blank=True)
    share_link    = models.CharField(max_length=255, unique=True, null=True, blank=True)

    # From New Relational Schema
    title         = models.CharField(max_length=255)
    subject       = models.CharField(max_length=100)
    class_grade   = models.CharField(max_length=20, blank=True)
    board         = models.CharField(max_length=50, blank=True)
    total_marks   = models.PositiveIntegerField(default=80)
    duration_mins = models.PositiveIntegerField(default=180)
    instructions  = models.TextField(blank=True)
    is_template   = models.BooleanField(default=False, db_index=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Question Paper"

    def __str__(self):
        label = "[TEMPLATE] " if self.is_template else ""
        return f"{label}{self.title} — {self.subject} ({self.total_marks}M)"

class PaperSection(models.Model):
    paper              = models.ForeignKey(
                             QuestionPaper,
                             on_delete=models.CASCADE,
                             related_name="sections"
                         )
    section_name        = models.CharField(max_length=50)
    question_type       = models.CharField(max_length=20, choices=QuestionType.choices)
    marks_per_question  = models.PositiveIntegerField()
    question_count      = models.PositiveIntegerField()
    difficulty_mix      = models.JSONField(
                              default=dict,
                              blank=True
                          )
    bloom_mix           = models.JSONField(
                              default=dict,
                              blank=True
                          )
    order               = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Paper Section"

    @property
    def section_marks(self):
        return self.marks_per_question * self.question_count

    def __str__(self):
        return f"{self.paper} — {self.section_name} ({self.question_count}×{self.marks_per_question}M)"

class PaperQuestion(models.Model):
    section           = models.ForeignKey(
                            PaperSection,
                            on_delete=models.CASCADE,
                            related_name="paper_questions"
                        )
    question          = models.ForeignKey(
                            QuestionBank,
                            on_delete=models.CASCADE,
                            related_name="paper_appearances"
                        )
    order_in_section  = models.PositiveSmallIntegerField()
    marks_override    = models.PositiveIntegerField(
                            null=True, blank=True
                        )
    was_ai_generated  = models.BooleanField(default=False)

    class Meta:
        ordering = ["order_in_section"]
        unique_together = [["section", "order_in_section"]]
        verbose_name = "Paper Question"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            from django.utils import timezone
            QuestionBank.objects.filter(pk=self.question_id).update(
                times_used=models.F("times_used") + 1,
                last_used_at=timezone.now()
            )

    def __str__(self):
        return f"Q#{self.question_id} in {self.section}"


class FailedIngestion(models.Model):
    source_document = models.ForeignKey(
                          SourceDocument,
                          null=True, blank=True,
                          on_delete=models.SET_NULL,
                          related_name="failures"
                      )
    raw_json        = models.TextField()
    error_reason    = models.TextField()
    created_at      = models.DateTimeField(auto_now_add=True)
    is_resolved     = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Failed Ingestion"

    def __str__(self):
        return f"Failed ingestion from doc#{self.source_document_id} at {self.created_at:%Y-%m-%d %H:%M}"


class DoubtTicket(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('answered', 'Answered'),
        ('resolved', 'Resolved'),
    )
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doubts')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='doubts')
    question_text = models.TextField()
    image_url = models.ImageField(upload_to='doubts/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Doubt by {self.student} on {self.lesson} - {self.status}"

class DoubtResponse(models.Model):
    doubt = models.ForeignKey(DoubtTicket, on_delete=models.CASCADE, related_name='responses')
    responder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='doubt_responses', blank=True)
    response_text = models.TextField()
    is_ai_generated = models.BooleanField(default=False)
    confidence_score = models.FloatField(null=True, blank=True, help_text="If AI generated, the confidence out of 1.0")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Response to {self.doubt.id} by {'AI' if self.is_ai_generated else self.responder}"
