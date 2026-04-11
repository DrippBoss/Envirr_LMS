from django.urls import path
from ai_engine.views import GeneratePaperAPIView, QuestionBankListView, ManualPaperCreateView

urlpatterns = [
    path('generate-paper/', GeneratePaperAPIView.as_view(), name='generate_paper'),
    path('questions/', QuestionBankListView.as_view(), name='question_bank_list'),
    path('manual-paper/', ManualPaperCreateView.as_view(), name='manual_paper_create'),
]
