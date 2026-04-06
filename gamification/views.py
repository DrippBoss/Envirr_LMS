from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from gamification.models import Streak, StudentXP

class UserGamificationStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        streak, _ = Streak.objects.get_or_create(student=request.user)
        xp, _ = StudentXP.objects.get_or_create(student=request.user)
        return Response({
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
            'total_xp': xp.total_xp,
            'current_level': xp.current_level,
        })
