from django.db import models
from django.conf import settings
from courses.models import Lesson

class QuestionBank(models.Model):
    TYPE_CHOICES = (
        ('mcq', 'Multiple Choice'),
        ('case_study', 'Case Study'),
        ('short_answer', 'Short Answer'),
    )
    DIFFICULTY_CHOICES = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )
    subject = models.CharField(max_length=255)
    chapter = models.CharField(max_length=255)
    concept = models.CharField(max_length=255, blank=True)
    question_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    marks = models.PositiveIntegerField()
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    question_text = models.TextField()
    answer_text = models.TextField() # Represents options context or exact text
    is_ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.subject}] {self.chapter} - {self.marks}M"

class GeneratedPaper(models.Model):
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='generated_papers')
    title = models.CharField(max_length=255)
    config = models.JSONField(help_text="Stores the parameters used to generate this paper")
    secure_pdf_path = models.FileField(upload_to='generated_papers/', null=True, blank=True)
    share_link = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class PaperQuestion(models.Model):
    paper = models.ForeignKey(GeneratedPaper, on_delete=models.CASCADE, related_name='paper_questions')
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE, related_name='used_in_papers')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('paper', 'question')

    def __str__(self):
        return f"{self.question} in {self.paper}"

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
