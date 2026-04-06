from django.urls import path
from activity.views import SubmitQuizView

urlpatterns = [
    path('quiz/submit/', SubmitQuizView.as_view(), name='submit_quiz'),
]
