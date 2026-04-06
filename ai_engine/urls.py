from django.urls import path
from ai_engine.views import GeneratePaperAPIView

urlpatterns = [
    path('generate-paper/', GeneratePaperAPIView.as_view(), name='generate_paper'),
]
