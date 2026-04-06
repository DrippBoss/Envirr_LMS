from rest_framework import views, response, status, permissions
from activity.serializers import QuizSubmitSerializer, QuizSubmissionResponseSerializer
from activity.services import evaluate_quiz
from courses.models import Quiz
from django.shortcuts import get_object_or_404

class SubmitQuizView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiz = get_object_or_404(Quiz, id=serializer.validated_data['quiz_id'])
        
        # NOTE: Enrollment enforcement logic can be bound here optionally.
        
        submission = evaluate_quiz(request.user, quiz, serializer.validated_data['answers'])
        res_serial = QuizSubmissionResponseSerializer(submission)
        return response.Response(res_serial.data, status=status.HTTP_201_CREATED)
