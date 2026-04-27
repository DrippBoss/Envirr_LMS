from rest_framework import serializers
from ai_engine.models import QuestionBank, MCQOption, CaseStudyPart

class MCQOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MCQOption
        fields = ['id', 'option_label', 'option_text', 'is_correct', 'order']

class CaseStudyPartSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseStudyPart
        fields = ['id', 'part_number', 'part_text', 'part_answer', 'question_type', 'marks']

class QuestionBankSerializer(serializers.ModelSerializer):
    options = MCQOptionSerializer(many=True, read_only=True)
    case_parts = CaseStudyPartSerializer(many=True, read_only=True)
    class Meta:
        model = QuestionBank
        fields = ['id', 'subject', 'chapter', 'question_type', 'difficulty', 'marks', 'question_text', 'answer_text', 'options', 'case_parts']

class ManualSectionSerializer(serializers.Serializer):
    type = serializers.CharField()
    name = serializers.CharField()
    questions = serializers.ListField(child=serializers.CharField())

class CustomQuestionSerializer(serializers.Serializer):
    type = serializers.CharField()
    marks = serializers.IntegerField()
    difficulty = serializers.CharField(default="medium")
    question_text = serializers.CharField()
    answer_text = serializers.CharField(required=False, allow_blank=True)
    section_type = serializers.CharField()

class ManualPaperCreateSerializer(serializers.Serializer):
    title = serializers.CharField()
    board = serializers.CharField(default="CBSE")
    grade = serializers.CharField(default="10th")
    subject = serializers.CharField()
    sections = serializers.ListField(child=ManualSectionSerializer())
    custom_questions = serializers.ListField(child=CustomQuestionSerializer(), required=False, default=list)

class GeneratePaperSerializer(serializers.Serializer):
    board = serializers.CharField(max_length=50, default="CBSE")
    grade = serializers.CharField(max_length=50, default="10th")
    subject = serializers.CharField()
    chapter = serializers.CharField(required=False, allow_blank=True, default='')
    chapters = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    paper_type = serializers.CharField()
    max_marks = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard', 'mixed'])
    include_answers = serializers.BooleanField(default=True)
    custom_instructions = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        # Normalise: always resolve to a non-empty `chapters` list
        chapters = data.get('chapters') or []
        chapter  = data.get('chapter', '').strip()
        if not chapters and chapter:
            chapters = [chapter]
        if not chapters:
            raise serializers.ValidationError("Provide at least one chapter.")
        data['chapters'] = chapters
        data['chapter']  = chapters[0]   # keep single-chapter field for LaTeX title fallback
        return data
