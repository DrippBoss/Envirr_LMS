from django.contrib import admin
from .models import (
    CourseUnit, LearningPath, LearningNode, LessonQuestion, NodeProgress, SessionAnswer,
    Flashcard, FlashcardDeck, DeckCard, RevisionNode, RevisionNodeProgress, WeakSpot,
    FlashcardProgress, UnitPrerequisiteSeen, ContentTemplate
)

class DeckCardInline(admin.TabularInline):
    model = DeckCard
    extra = 1

class LessonQuestionInline(admin.StackedInline):
    model = LessonQuestion
    extra = 1

@admin.register(CourseUnit)
class CourseUnitAdmin(admin.ModelAdmin):
    change_list_template = "admin/learning/courseunit/change_list.html"
    list_display = ('title', 'subject', 'class_grade', 'board', 'is_published', 'order')
    list_filter = ('class_grade', 'subject', 'is_published')
    search_fields = ('title', 'subject')

@admin.register(ContentTemplate)
class ContentTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'template_type', 'created_at')
    search_fields = ('name', 'template_type')

@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ('title', 'unit', 'class_grade', 'is_active')
    list_filter = ('class_grade', 'is_active', 'unit')
    search_fields = ('title',)

@admin.register(LearningNode)
class LearningNodeAdmin(admin.ModelAdmin):
    list_display = ('title', 'path', 'node_type', 'order')
    list_filter = ('node_type', 'path')
    inlines = [LessonQuestionInline]

@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'chapter', 'card_type')
    list_filter = ('subject', 'chapter', 'card_type')
    search_fields = ('title', 'concept')

@admin.register(FlashcardDeck)
class FlashcardDeckAdmin(admin.ModelAdmin):
    list_display = ('title', 'purpose')
    list_filter = ('purpose',)
    inlines = [DeckCardInline]

@admin.register(RevisionNode)
class RevisionNodeAdmin(admin.ModelAdmin):
    list_display = ('title', 'path', 'appears_after_node', 'side')
    list_filter = ('path', 'side')

# Progress/Tracking Models (mostly read-only for admin)
@admin.register(NodeProgress)
class NodeProgressAdmin(admin.ModelAdmin):
    list_display = ('student', 'node', 'status', 'current_step', 'xp_earned')
    list_filter = ('status', 'current_step')
    search_fields = ('student__user__username', 'node__title')

@admin.register(WeakSpot)
class WeakSpotAdmin(admin.ModelAdmin):
    list_display = ('student', 'concept', 'wrong_count', 'is_resolved')
    list_filter = ('is_resolved', 'subject', 'chapter')

admin.site.register(SessionAnswer)
admin.site.register(RevisionNodeProgress)
admin.site.register(FlashcardProgress)
admin.site.register(UnitPrerequisiteSeen)
