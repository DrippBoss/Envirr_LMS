from django.contrib import admin
from .models import (
    QuestionBank, QuestionPaper, PaperSection, PaperQuestion,
    SourceDocument, MCQOption, CaseStudyPart, FailedIngestion,
    DoubtTicket, DoubtResponse
)

@admin.register(QuestionBank)
class QuestionBankAdmin(admin.ModelAdmin):
    list_display = ('subject', 'chapter', 'question_type', 'marks', 'difficulty', 'is_ai_generated')
    list_filter = ('subject', 'question_type', 'difficulty', 'is_ai_generated')
    search_fields = ('question_text', 'chapter', 'subject')

@admin.register(QuestionPaper)
class QuestionPaperAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('title',)

class PaperQuestionInline(admin.TabularInline):
    model = PaperQuestion
    extra = 1

@admin.register(PaperSection)
class PaperSectionAdmin(admin.ModelAdmin):
    list_display = ('paper', 'section_name', 'question_type', 'marks_per_question', 'question_count')
    inlines = [PaperQuestionInline]

admin.site.register(SourceDocument)
admin.site.register(MCQOption)
admin.site.register(CaseStudyPart)
admin.site.register(FailedIngestion)
admin.site.register(PaperQuestion)
admin.site.register(DoubtTicket)
admin.site.register(DoubtResponse)
