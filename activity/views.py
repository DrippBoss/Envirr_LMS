from rest_framework import views, response, status, permissions
from activity.serializers import QuizSubmitSerializer, QuizSubmissionResponseSerializer
from activity.services import evaluate_quiz
from courses.models import Quiz
from courses.services import check_enrollment_access
from django.shortcuts import get_object_or_404

class SubmitQuizView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiz = get_object_or_404(Quiz, id=serializer.validated_data['quiz_id'])

        if not check_enrollment_access(request.user, quiz.unit):
            return response.Response(
                {'error': 'You are not enrolled in this course.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        submission = evaluate_quiz(request.user, quiz, serializer.validated_data['answers'])
        res_serial = QuizSubmissionResponseSerializer(submission)
        return response.Response(res_serial.data, status=status.HTTP_201_CREATED)
