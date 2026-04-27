import requests as http_requests
import json
import os
from django.http import FileResponse, Http404
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

class QuestionBankMetaView(views.APIView):
    """Return distinct subjects and (optionally) chapters from the question bank."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subject = request.query_params.get('subject')
        qs = QuestionBank.objects.all()
        if subject:
            qs = qs.filter(subject__iexact=subject)
            chapters = list(qs.values_list('chapter', flat=True).distinct().order_by('chapter'))
            return response.Response({'chapters': chapters})
        subjects = list(QuestionBank.objects.values_list('subject', flat=True).distinct().order_by('subject'))
        return response.Response({'subjects': subjects})


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


TUTOR_SYSTEM_PROMPT = """You are Envirr AI — a Socratic tutor for Indian school students (Classes 9–12, CBSE/ICSE).
Your role is to guide students to the answer through questions and hints, not give it directly.
Keep responses concise (2–4 short paragraphs max). Use plain text — no markdown headers or bullet lists.
For math expressions write them inline (e.g. sqrt(5), a/b, 5b^2).
If the student's question involves a key proof technique or concept, include a JSON block at the very end of your response in this exact format (and only when relevant):
CONCEPT_KEY:{"title":"<concept name>","body":"<1-2 sentence plain-text explanation>","symbol":"<single relevant math symbol or word, e.g. Σ or ∫>"}
Do not include CONCEPT_KEY if it is not genuinely useful."""


class AiTutorView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])  # [{role: 'user'|'ai', content: str}]

        if not message:
            return response.Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Build conversation context for the prompt
        context_lines = [f"[SYSTEM]: {TUTOR_SYSTEM_PROMPT}", ""]
        for turn in history[-6:]:  # last 3 exchanges
            role_label = "Student" if turn.get('role') == 'user' else "Envirr AI"
            context_lines.append(f"{role_label}: {turn.get('content', '')}")
        context_lines.append(f"Student: {message}")
        context_lines.append("Envirr AI:")

        prompt = "\n".join(context_lines)

        try:
            res = http_requests.post(
                "http://host.docker.internal:11434/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False},
                timeout=60,
            )
            res.raise_for_status()
            raw = res.json().get('response', '').strip()
        except Exception as e:
            return response.Response({'error': f'AI service unavailable: {str(e)}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Parse optional CONCEPT_KEY block
        concept_key = None
        if 'CONCEPT_KEY:' in raw:
            parts = raw.split('CONCEPT_KEY:', 1)
            reply_text = parts[0].strip()
            try:
                concept_key = json.loads(parts[1].strip())
            except (json.JSONDecodeError, IndexError):
                pass
        else:
            reply_text = raw

        return response.Response({'reply': reply_text, 'concept_key': concept_key})


class PaperDownloadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            paper = QuestionPaper.objects.get(id=pk, created_by=request.user)
        except QuestionPaper.DoesNotExist:
            raise Http404
        if not paper.secure_pdf_path:
            raise Http404
        path = paper.secure_pdf_path.path
        if not os.path.exists(path):
            raise Http404
        filename = f"{paper.title.replace(' ', '_')}.pdf"
        return FileResponse(open(path, 'rb'), as_attachment=True, filename=filename)
