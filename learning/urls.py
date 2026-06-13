from django.urls import path
from .views import (
    DashboardView, UnitPrerequisitesView, MapDataView,
    NodeStartView, NodeVideoCompleteView, NodePracticeView,
    NodePracticeAnswerView, NodePracticeRetryView, NodePracticeCompleteView,
    NodeRevisionCardsView, FlashcardMarkSeenView, RevisionNodeDetailView,
    ChapterTestStartView, ChapterTestCompleteView, LabCompleteView,
    WeakConceptsView, ActivityFeedView,
    MockTestQuestionsView, MockTestCheckView,
    StudentAnalyticsView,
)
from .mock_test_views import MockTestGenerateView, MockTestSubmitView, MockTestHistoryView
from .study_group_views import (
    StudyGroupListCreateView, StudyGroupJoinView,
    StudyGroupDetailView, StudyGroupLeaderboardView,
    TeacherPapersView, DiscoverSessionsView,
    GroupSessionCreateView, GroupSessionDetailView,
    GroupSessionSaveAnswersView, GroupSessionSubmitView,
    GroupSessionResultsView, GroupSessionAnswerKeyView,
    GroupChatView, GroupDoubtView, GroupDoubtEscalateView,
    ModerationLogView,
)

urlpatterns = [
    path('analytics/', StudentAnalyticsView.as_view(), name='student-analytics'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('weak-concepts/', WeakConceptsView.as_view(), name='weak-concepts'),
    path('activity/', ActivityFeedView.as_view(), name='activity-feed'),
    path('mock-test/questions/', MockTestQuestionsView.as_view(), name='mock-test-questions'),
    path('mock-test/check/', MockTestCheckView.as_view(), name='mock-test-check'),
    path('mock-test/generate/', MockTestGenerateView.as_view(), name='mock-test-generate'),
    path('mock-test/<int:attempt_id>/submit/', MockTestSubmitView.as_view(), name='mock-test-submit'),
    path('mock-test/history/', MockTestHistoryView.as_view(), name='mock-test-history'),
    path('study-groups/', StudyGroupListCreateView.as_view(), name='study-groups'),
    path('study-groups/join/', StudyGroupJoinView.as_view(), name='study-group-join'),
    path('study-groups/<int:group_id>/', StudyGroupDetailView.as_view(), name='study-group-detail'),
    path('study-groups/<int:group_id>/leaderboard/', StudyGroupLeaderboardView.as_view(), name='study-group-leaderboard'),
    path('study-groups/teacher-papers/', TeacherPapersView.as_view(), name='teacher-papers'),
    path('study-groups/discover/', DiscoverSessionsView.as_view(), name='study-groups-discover'),
    path('study-groups/<int:group_id>/sessions/', GroupSessionCreateView.as_view(), name='session-create'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/', GroupSessionDetailView.as_view(), name='session-detail'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/save/', GroupSessionSaveAnswersView.as_view(), name='session-save'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/submit/', GroupSessionSubmitView.as_view(), name='session-submit'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/results/', GroupSessionResultsView.as_view(), name='session-results'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/chat/', GroupChatView.as_view(), name='session-chat'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/answer-key/', GroupSessionAnswerKeyView.as_view(), name='session-answer-key'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/doubts/', GroupDoubtView.as_view(), name='session-doubts'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/doubts/<int:q_num>/escalate/', GroupDoubtEscalateView.as_view(), name='session-doubt-escalate'),
    path('study-groups/<int:group_id>/sessions/<int:session_id>/moderation/', ModerationLogView.as_view(), name='session-moderation'),
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

    path('nodes/<int:node_id>/lab/complete/', LabCompleteView.as_view(), name='lab-complete'),
    
    path('revision-nodes/<int:rev_id>/', RevisionNodeDetailView.as_view(), name='revision-node'),
    path('flashcards/<int:card_id>/seen/', FlashcardMarkSeenView.as_view(), name='flashcard-seen'),
]
