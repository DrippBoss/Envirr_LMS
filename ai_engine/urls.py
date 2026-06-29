from django.urls import path
from ai_engine.views import (
    GeneratePaperAPIView, QuestionBankListView, QuestionBankCreateView, QuestionBankMetaView,
    ManualPaperCreateView, AiTutorView, PaperDownloadView,
    QuestionBankDetailView, MCQOptionsUpdateView, QuestionBankEditorListView,
    IngestUploadView, CompileIngestPaperView, DetectDocumentView, GapFillView,
    StudentDoubtView, TeacherDoubtListView, TeacherDoubtRespondView,
    AiLessonPlannerView,
)

urlpatterns = [
    path('generate-paper/', GeneratePaperAPIView.as_view(), name='generate_paper'),
    path('generate-paper/<int:pk>/download/', PaperDownloadView.as_view(), name='paper_download'),
    path('questions/', QuestionBankListView.as_view(), name='question_bank_list'),
    path('questions/create/', QuestionBankCreateView.as_view(), name='question_bank_create'),
    path('questions/meta/', QuestionBankMetaView.as_view(), name='question_bank_meta'),
    path('questions/editor/', QuestionBankEditorListView.as_view(), name='question_bank_editor_list'),
    path('questions/<int:pk>/', QuestionBankDetailView.as_view(), name='question_bank_detail'),
    path('questions/<int:pk>/options/', MCQOptionsUpdateView.as_view(), name='question_options_update'),
    path('manual-paper/', ManualPaperCreateView.as_view(), name='manual_paper_create'),
    path('tutor/', AiTutorView.as_view(), name='ai_tutor'),
    path('lesson-planner/', AiLessonPlannerView.as_view(), name='ai_lesson_planner'),
    path('ingest-upload/', IngestUploadView.as_view(), name='ingest_upload'),
    path('ingest-upload/detect/', DetectDocumentView.as_view(), name='ingest_detect'),
    path('ingest-upload/gap-fill/', GapFillView.as_view(), name='ingest_gap_fill'),
    path('ingest-upload/compile/', CompileIngestPaperView.as_view(), name='ingest_upload_compile'),
    path('doubts/', StudentDoubtView.as_view(), name='student_doubts'),
    path('doubts/teacher/', TeacherDoubtListView.as_view(), name='teacher_doubts'),
    path('doubts/<int:pk>/respond/', TeacherDoubtRespondView.as_view(), name='teacher_doubt_respond'),
]
