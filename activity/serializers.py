from rest_framework import serializers
from activity.models import QuizSubmission

class QuizSubmitSerializer(serializers.Serializer):
    quiz_id = serializers.IntegerField()
    answers = serializers.JSONField(help_text="Format: {'question_id': 'option/answer'}")

class QuizSubmissionResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizSubmission
        fields = '__all__'
