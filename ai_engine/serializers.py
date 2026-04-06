from rest_framework import serializers

class GeneratePaperSerializer(serializers.Serializer):
    board = serializers.CharField(max_length=50, default="CBSE")
    grade = serializers.CharField(max_length=50, default="10th")
    subject = serializers.CharField()
    chapter = serializers.CharField()
    paper_type = serializers.CharField()
    max_marks = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])
    include_answers = serializers.BooleanField(default=True)
    custom_instructions = serializers.CharField(required=False, allow_blank=True)
