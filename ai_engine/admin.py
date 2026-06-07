from django.contrib import admin
from .models import (
    QuestionBank, QuestionPaper, PaperSection, PaperQuestion,
    SourceDocument, MCQOption, CaseStudyPart, FailedIngestion,
    DoubtTicket, DoubtResponse
)

class MCQOptionInline(admin.TabularInline):
    model = MCQOption
    extra = 0
    fields = ('option_label', 'option_text', 'is_correct', 'order')

class CaseStudyPartInline(admin.TabularInline):
    model = CaseStudyPart
    extra = 0
    fields = ('part_number', 'part_text', 'part_answer', 'question_type', 'marks')

@admin.register(QuestionBank)
class QuestionBankAdmin(admin.ModelAdmin):
    list_display  = ('id', 'subject', 'chapter', 'question_type', 'marks', 'difficulty', 'is_verified', 'is_ai_generated')
    list_filter   = ('subject', 'chapter', 'question_type', 'marks', 'difficulty', 'is_verified', 'is_ai_generated')
    search_fields = ('question_text', 'answer_text', 'chapter', 'subject')
    list_editable = ('chapter', 'question_type', 'marks', 'difficulty', 'is_verified')
    list_per_page = 50
    inlines       = [MCQOptionInline, CaseStudyPartInline]
    readonly_fields = ('question_hash', 'source_document', 'source_page', 'created_at')

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
