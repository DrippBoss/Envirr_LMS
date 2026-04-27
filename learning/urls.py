from django.urls import path
from .views import (
    DashboardView, UnitPrerequisitesView, MapDataView,
    NodeStartView, NodeVideoCompleteView, NodePracticeView,
    NodePracticeAnswerView, NodePracticeRetryView, NodePracticeCompleteView,
    NodeRevisionCardsView, FlashcardMarkSeenView, RevisionNodeDetailView,
    ChapterTestStartView, ChapterTestCompleteView,
    WeakConceptsView, ActivityFeedView,
    MockTestQuestionsView, MockTestCheckView, StudyGroupsView,
)

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('weak-concepts/', WeakConceptsView.as_view(), name='weak-concepts'),
    path('activity/', ActivityFeedView.as_view(), name='activity-feed'),
    path('mock-test/questions/', MockTestQuestionsView.as_view(), name='mock-test-questions'),
    path('mock-test/check/', MockTestCheckView.as_view(), name='mock-test-check'),
    path('study-groups/', StudyGroupsView.as_view(), name='study-groups'),
    path('units/<int:unit_id>/prerequisites/', UnitPrerequisitesView.as_view(), name='unit-prerequisites'),
    path('paths/<int:path_id>/map/', MapDataView.as_view(), name='map-data'),
    
    path('nodes/<int:node_id>/start/', NodeStartView.as_view(), name='node-start'),
    path('nodes/<int:node_id>/video-complete/', NodeVideoCompleteView.as_view(), name='node-video-complete'),
    
    path('nodes/<int:node_id>/practice/', NodePracticeView.as_view(), name='node-practice'),
    path('nodes/<int:node_id>/practice/answer/', NodePracticeAnswerView.as_view(), name='node-practice-answer'),
    path('nodes/<int:node_id>/practice/retry/', NodePracticeRetryView.as_view(), name='node-practice-retry'),
    path('nodes/<int:node_id>/practice/complete/', NodePracticeCompleteView.as_view(), name='node-practice-complete'),
    
    path('nodes/<int:node_id>/revision-cards/', NodeRevisionCardsView.as_view(), name='node-revision-cards'),
    
    path('nodes/<int:node_id>/test/start/', ChapterTestStartView.as_view(), name='test-start'),
    path('nodes/<int:node_id>/test/complete/', ChapterTestCompleteView.as_view(), name='test-complete'),
    
    path('revision-nodes/<int:rev_id>/', RevisionNodeDetailView.as_view(), name='revision-node'),
    path('flashcards/<int:card_id>/seen/', FlashcardMarkSeenView.as_view(), name='flashcard-seen'),
]
