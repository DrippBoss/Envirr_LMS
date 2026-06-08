from django.urls import path
from gamification.views import UserGamificationStatsView, LeaderboardView

urlpatterns = [
    path('stats/',       UserGamificationStatsView.as_view(), name='gamification_stats'),
    path('leaderboard/', LeaderboardView.as_view(),           name='leaderboard'),
]
