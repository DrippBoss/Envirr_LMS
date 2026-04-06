import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Create celery.py
CELERY_PY = """import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'envirr_backend.settings')

app = Celery('envirr_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()
"""

with open(os.path.join(BASE_DIR, 'envirr_backend', 'celery.py'), 'w') as f:
    f.write(CELERY_PY)

# 2. Update __init__.py
INIT_PY = """from .celery import app as celery_app

__all__ = ('celery_app',)
"""

with open(os.path.join(BASE_DIR, 'envirr_backend', '__init__.py'), 'w') as f:
    f.write(INIT_PY)

# 3. Create ai_engine/tasks.py
TASKS_PY = """import os
import subprocess
import requests
from celery import shared_task
from django.conf import settings
from ai_engine.models import GeneratedPaper, DoubtTicket, DoubtResponse
from users.models import CustomUser

def extract_latex_code(raw_text):
    cleaned_text = raw_text.strip()
    if cleaned_text.startswith("```latex"):
        cleaned_text = cleaned_text[len("```latex"):]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
            
    start_marker = r'\\documentclass'
    end_marker = r'\\end{document}'
    
    start_idx = cleaned_text.find(start_marker)
    end_idx = cleaned_text.rfind(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        return cleaned_text[start_idx:end_idx + len(end_marker)].strip()
    return cleaned_text.strip()

@shared_task(bind=True, max_retries=3)
def generate_paper_task(self, config_data, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        
        chapter = config_data.get('chapter', 'All')
        marks = config_data.get('max_marks', 80)
        
        prompt = f'''
        You are an expert LaTeX formatter and question paper generator.
        Generate a complete LaTeX document for a question paper.
        Subject: {config_data.get('subject', 'General')}
        Chapter: {chapter}
        Marks: {marks}
        Difficulty: {config_data.get('difficulty', 'medium')}
        Use "\\\\documentclass[12pt]{{article}}". Include amsmath, amssymb, graphicx.
        Return ONLY the raw LaTeX code starting with \\\\documentclass and ending with \\\\end{{document}}.
        '''
        
        # We check os.environ dynamically for Docker injection compatibility
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise Exception("GEMINI_API_KEY not configured safely.")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        raw_text = data['candidates'][0]['content']['parts'][0]['text']
        latex_content = extract_latex_code(raw_text)
        
        temp_dir = os.path.join(settings.BASE_DIR, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        
        unique_id = f"paper_{self.request.id}"
        tex_path = os.path.join(temp_dir, f"{unique_id}.tex")
        pdf_path = os.path.join(temp_dir, f"{unique_id}.pdf")
        
        with open(tex_path, 'w', encoding='utf-8') as f:
            f.write(latex_content)
            
        process = subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', f'-output-directory={temp_dir}', tex_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=temp_dir
        )
        
        if process.returncode != 0 or not os.path.exists(pdf_path):
            raise Exception(f"pdflatex compilation failed: {process.stdout.decode('utf-8')}")
            
        paper = GeneratedPaper.objects.create(
            created_by=user,
            title=f"Generated {config_data.get('subject')} Paper",
            config=config_data,
        )
        
        paper.secure_pdf_path.name = os.path.relpath(pdf_path, settings.BASE_DIR)
        paper.save()
        
        for ext in ['.tex', '.log', '.aux', '.out']:
            junk_file = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk_file):
                os.remove(junk_file)
                
        return paper.id

    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)

@shared_task(bind=True, max_retries=2)
def process_doubt_async(self, ticket_id):
    try:
        ticket = DoubtTicket.objects.get(id=ticket_id)
        
        mock_ai_explanation = f"AI hint for Doubt #{ticket.id} on {ticket.lesson}: Re-read the primary definitions in the linked syllabus notes."
        
        DoubtResponse.objects.create(
            doubt=ticket,
            response_text=mock_ai_explanation,
            is_ai_generated=True,
            confidence_score=0.85
        )
        
        ticket.status = 'answered'
        ticket.save()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=15)
"""

with open(os.path.join(BASE_DIR, 'ai_engine', 'tasks.py'), 'w') as f:
    f.write(TASKS_PY)

# 4. Integrate Call in API View
API_VIEW_PY = """from rest_framework import views, response, status, permissions
from ai_engine.serializers import GeneratePaperSerializer
from ai_engine.tasks import generate_paper_task

class GeneratePaperAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = GeneratePaperSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Fully Integrated Async Invocation!
        celery_task = generate_paper_task.delay(serializer.validated_data, request.user.id)
        
        return response.Response({
            "message": "Paper generation triggered successfully. You will be notified via our Async Task stream.",
            "task_id": celery_task.id
        }, status=status.HTTP_202_ACCEPTED)
"""

with open(os.path.join(BASE_DIR, 'ai_engine', 'views.py'), 'w') as f:
    f.write(API_VIEW_PY)

print("Scaffolded Celery Worker Pipeline Config & AI Task Integrations")
