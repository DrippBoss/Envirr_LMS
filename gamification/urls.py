from django.urls import path
from gamification.views import UserGamificationStatsView

urlpatterns = [
    path('stats/', UserGamificationStatsView.as_view(), name='gamification_stats'),
]
