from django.urls import path
from ai_engine.views import GeneratePaperAPIView, QuestionBankListView, QuestionBankMetaView, ManualPaperCreateView, AiTutorView, PaperDownloadView

urlpatterns = [
    path('generate-paper/', GeneratePaperAPIView.as_view(), name='generate_paper'),
    path('generate-paper/<int:pk>/download/', PaperDownloadView.as_view(), name='paper_download'),
    path('questions/', QuestionBankListView.as_view(), name='question_bank_list'),
    path('questions/meta/', QuestionBankMetaView.as_view(), name='question_bank_meta'),
    path('manual-paper/', ManualPaperCreateView.as_view(), name='manual_paper_create'),
    path('tutor/', AiTutorView.as_view(), name='ai_tutor'),
]
