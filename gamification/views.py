from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from gamification.models import Streak, StudentXP, StudentBadge


class UserGamificationStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        streak, _ = Streak.objects.get_or_create(student=request.user)
        xp, _ = StudentXP.objects.get_or_create(student=request.user)

        badges = []
        if hasattr(request.user, 'profile'):
            badges = list(
                StudentBadge.objects
                .filter(student=request.user.profile)
                .select_related('badge')
                .values('badge__name', 'badge__description', 'badge__icon', 'earned_at')
            )
            badges = [
                {
                    'name': b['badge__name'],
                    'description': b['badge__description'],
                    'icon': b['badge__icon'],
                    'earned_at': b['earned_at'],
                }
                for b in badges
            ]

        return Response({
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
            'total_xp': xp.total_xp,
            'current_level': xp.current_level,
            'badges': badges,
        })


class LeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profile'):
            return Response([])

        grade = request.user.profile.class_grade

        # Get all students in the same grade ordered by XP
        from users.models import StudentProfile
        profiles = (
            StudentProfile.objects
            .filter(class_grade=grade)
            .select_related('user', 'user__xp', 'user__streak')
        )

        ranked = []
        for p in profiles:
            xp_obj = getattr(p.user, 'xp', None)
            streak_obj = getattr(p.user, 'streak', None)
            ranked.append({
                'student_id': p.id,
                'name': p.user.name or p.user.username,
                'username': p.user.username,
                'avatar_url': p.avatar_url,
                'total_xp': xp_obj.total_xp if xp_obj else 0,
                'current_level': xp_obj.current_level if xp_obj else 1,
                'current_streak': streak_obj.current_streak if streak_obj else 0,
                'is_me': p.user_id == request.user.id,
            })

        ranked.sort(key=lambda x: x['total_xp'], reverse=True)

        for i, entry in enumerate(ranked[:50]):
            entry['rank'] = i + 1

        return Response(ranked[:50])
