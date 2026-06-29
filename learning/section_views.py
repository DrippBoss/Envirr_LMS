"""
Sections / class roster — teacher management + student join.

A Section is a named class a teacher owns. Members are StudentProfiles, added
by the teacher (search + add) or self-enrolled via the section's join code.
Assignments and calendar events can target a section for named-student delivery.
"""
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from users.models import StudentProfile
from .views import IsStudent
from .wizard_views import IsTeacherOrAdmin
from .models import Section, SectionMembership
from .serializers import SectionSerializer, SectionMemberSerializer


def _owned_sections(user):
    qs = Section.objects.all()
    if user.role != 'admin':
        qs = qs.filter(teacher=user)
    return qs


# ── Teacher ──────────────────────────────────────────────────────────────────
class TeacherSectionListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request):
        qs = _owned_sections(request.user).prefetch_related('memberships')
        return Response(SectionSerializer(qs, many=True).data)

    def post(self, request):
        ser = SectionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(teacher=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)


class TeacherSectionDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request, pk):
        section = get_object_or_404(_owned_sections(request.user), pk=pk)
        data = SectionSerializer(section).data
        members = section.memberships.select_related('student__user')
        data['members'] = SectionMemberSerializer(members, many=True).data
        return Response(data)

    def patch(self, request, pk):
        section = get_object_or_404(_owned_sections(request.user), pk=pk)
        ser = SectionSerializer(section, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        get_object_or_404(_owned_sections(request.user), pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SectionMembersView(APIView):
    """Add a student to a section (by student_id or username)."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request, pk):
        section = get_object_or_404(_owned_sections(request.user), pk=pk)
        sid = request.data.get('student_id')
        username = (request.data.get('username') or '').strip()
        if sid:
            profile = StudentProfile.objects.filter(pk=sid, user__role='student').first()
        elif username:
            profile = StudentProfile.objects.filter(user__username=username, user__role='student').first()
        else:
            return Response({'detail': 'student_id or username required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not profile:
            return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
        SectionMembership.objects.get_or_create(section=section, student=profile)
        members = section.memberships.select_related('student__user')
        return Response(SectionMemberSerializer(members, many=True).data, status=status.HTTP_201_CREATED)


class SectionMemberRemoveView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def delete(self, request, pk, student_id):
        section = get_object_or_404(_owned_sections(request.user), pk=pk)
        SectionMembership.objects.filter(section=section, student_id=student_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentSearchView(APIView):
    """Search students to add to a section (?grade=, ?q=)."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def get(self, request):
        qs = StudentProfile.objects.select_related('user').filter(user__role='student')
        grade = request.query_params.get('grade')
        if grade:
            qs = qs.filter(class_grade=grade)
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(user__username__icontains=q) | Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
            )
        out = [{
            'id': p.id,
            'name': p.user.get_full_name() or p.user.username,
            'username': p.user.username,
            'class_grade': p.class_grade,
        } for p in qs[:25]]
        return Response(out)


# ── Student ──────────────────────────────────────────────────────────────────
class StudentSectionListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        sections = request.user.profile.sections.all()
        return Response(SectionSerializer(sections, many=True).data)


class StudentSectionJoinView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        code = (request.data.get('join_code') or '').strip().upper()
        if not code:
            return Response({'detail': 'A join code is required.'}, status=status.HTTP_400_BAD_REQUEST)
        section = Section.objects.filter(join_code=code).first()
        if not section:
            return Response({'detail': 'No class found for that code.'}, status=status.HTTP_404_NOT_FOUND)
        SectionMembership.objects.get_or_create(section=section, student=request.user.profile)
        return Response(SectionSerializer(section).data, status=status.HTTP_201_CREATED)
