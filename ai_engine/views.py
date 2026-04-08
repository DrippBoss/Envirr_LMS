from rest_framework import views, response, status, permissions
from ai_engine.serializers import GeneratePaperSerializer
from ai_engine.tasks import generate_paper_task
from ai_engine.models import QuestionPaper

class GeneratePaperAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        papers = QuestionPaper.objects.filter(created_by=request.user).order_by('-created_at')
        data = []
        for p in papers:
            data.append({
                "id": p.id,
                "title": p.title,
                "created_at": p.created_at,
                "config": p.config,
                "pdf_url": p.secure_pdf_path.url if p.secure_pdf_path else None
            })
        return response.Response(data)

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = GeneratePaperSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create pending placeholder so UI shows "Synthesizing..."
        paper = QuestionPaper.objects.create(
            created_by=request.user, 
            title=f"Generated {serializer.validated_data.get('subject')} Exam", 
            config=serializer.validated_data,
            subject=serializer.validated_data.get('subject'),
            class_grade=serializer.validated_data.get('grade'),
            board=serializer.validated_data.get('board'),
            total_marks=serializer.validated_data.get('max_marks', 80)
        )

        # Fully Integrated Async Invocation!
        celery_task = generate_paper_task.delay(serializer.validated_data, request.user.id, paper.id)
        
        return response.Response({
            "message": "Paper generation triggered successfully. You will be notified via our Async Task stream.",
            "task_id": celery_task.id
        }, status=status.HTTP_202_ACCEPTED)
