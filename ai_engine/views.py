from rest_framework import views, response, status, permissions, generics
from ai_engine.serializers import GeneratePaperSerializer, QuestionBankSerializer, ManualPaperCreateSerializer
from ai_engine.tasks import generate_paper_task, compile_manual_paper_task
from ai_engine.models import QuestionPaper, QuestionBank

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

class QuestionBankListView(generics.ListAPIView):
    serializer_class = QuestionBankSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = QuestionBank.objects.all().order_by('-id')
        subject = self.request.query_params.get('subject')
        chapter = self.request.query_params.get('chapter')
        qtype = self.request.query_params.get('type')
        if subject: qs = qs.filter(subject__iexact=subject)
        if chapter: qs = qs.filter(chapter__iexact=chapter)
        if qtype: qs = qs.filter(question_type=qtype)
        return qs

class ManualPaperCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ManualPaperCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create pending placeholder so UI shows Synthesizing/Compiling
        paper = QuestionPaper.objects.create(
            created_by=request.user, 
            title=serializer.validated_data.get('title'),
            config=serializer.validated_data, # store the raw layout
            subject=serializer.validated_data.get('subject'),
            class_grade=serializer.validated_data.get('grade'),
            board=serializer.validated_data.get('board'),
            total_marks=0 # will be calculated in task
        )

        celery_task = compile_manual_paper_task.delay(serializer.validated_data, request.user.id, paper.id)
        
        return response.Response({
            "message": "Manual Paper compilation triggered.",
            "task_id": celery_task.id
        }, status=status.HTTP_202_ACCEPTED)
