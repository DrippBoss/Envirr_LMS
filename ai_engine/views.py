import re
import requests as http_requests
import json
import os
import base64
import hashlib
import logging
from rest_framework.throttling import ScopedRateThrottle

logger = logging.getLogger(__name__)
from rest_framework.parsers import MultiPartParser, FormParser


class AiTutorRateThrottle(ScopedRateThrottle):
    scope = 'ai_tutor'
from django.http import FileResponse, Http404
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import views, response, status, permissions, generics
from ai_engine.serializers import (
    GeneratePaperSerializer, QuestionBankSerializer, ManualPaperCreateSerializer,
    QuestionBankEditorSerializer, QuestionBankEditSerializer, MCQOptionSerializer,
)
from ai_engine.tasks import generate_paper_task, compile_manual_paper_task
from ai_engine.models import QuestionPaper, QuestionBank, MCQOption
from envirr_backend.pagination import StandardResultsPagination
from envirr_backend.cache_utils import qbank_meta_version, QBANK_META_TTL
from django.core.cache import cache

class GeneratePaperAPIView(views.APIView):
    """Printed / PDF exam-paper generation (teacher/admin).

    Asynchronously builds a ``QuestionPaper`` PDF from QuestionBank via the
    Celery ``generate_paper_task`` (gap-fill with Groq + LaTeX render). This is
    deliberately a separate flow from the in-app interactive chapter test
    (``learning.views.ChapterTestStartView``), which serves QuestionBank
    questions as JSON for live answering. Both read from QuestionBank but
    produce different outputs (printable exam vs interactive test) and are
    intentionally NOT converged (see OQ2).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        papers = QuestionPaper.objects.filter(created_by=request.user).order_by('-created_at')[:5]
        data = []
        for p in papers:
            data.append({
                "id": p.id,
                "title": p.title,
                "created_at": p.created_at,
                "config": p.config,
                "pdf_url": p.secure_pdf_path.url if p.secure_pdf_path else None,
                "status": p.status,
                "error_message": p.error_message or None,
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
            "message": "Paper generation triggered successfully.",
            "paper_id": paper.id,
            "task_id": celery_task.id
        }, status=status.HTTP_202_ACCEPTED)

class QuestionBankListView(generics.ListAPIView):
    serializer_class = QuestionBankSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination

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
        user = request.user
        subject = request.query_params.get('subject')

        # Redis-cached: question-bank metadata changes only when questions are
        # added/edited/removed, which busts the shared version token.
        assigned_key = ''
        if user.role == 'teacher':
            assigned_key = ','.join(sorted(user.assigned_subjects or []))
        ver = qbank_meta_version()
        cache_key = f"qbmeta:{ver}:{user.role}:{assigned_key}:{subject or ''}"
        cached = cache.get(cache_key)
        if cached is not None:
            return response.Response(cached)

        qs = QuestionBank.objects.all()

        # Scope teachers to their assigned subjects; if none assigned yet, show all
        if user.role == 'teacher':
            assigned = user.assigned_subjects or []
            if assigned:
                qs = qs.filter(subject__in=assigned)

        if subject:
            qs = qs.filter(subject__iexact=subject)
            chapters = list(qs.values_list('chapter', flat=True).distinct().order_by('chapter'))
            payload = {'chapters': chapters}
        else:
            subjects = list(qs.values_list('subject', flat=True).distinct().order_by('subject'))
            payload = {'subjects': subjects}

        cache.set(cache_key, payload, QBANK_META_TTL)
        return response.Response(payload)


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
            "paper_id": paper.id,
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
    throttle_classes = [AiTutorRateThrottle]

    # Prefixes that, if injected by a user, would let them escape the prompt framing
    _INJECT_PATTERNS = re.compile(
        r'(\[SYSTEM\]|\bStudent\s*:|\bEnvirr\s*AI\s*:)',
        re.IGNORECASE,
    )

    @staticmethod
    def _sanitize(text: str) -> str:
        """Strip prompt-injection role/system markers from user-supplied text."""
        return AiTutorView._INJECT_PATTERNS.sub('', text).strip()

    def post(self, request):
        message = self._sanitize(request.data.get('message', ''))
        raw_history = request.data.get('history', [])

        if not message:
            return response.Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Only accept known role values; sanitize content of every turn
        history = [
            h for h in raw_history
            if isinstance(h, dict) and h.get('role') in ('user', 'ai')
        ]

        # Build conversation context for the prompt
        context_lines = [f"[SYSTEM]: {TUTOR_SYSTEM_PROMPT}", ""]
        for turn in history[-6:]:  # last 3 exchanges
            role_label = "Student" if turn.get('role') == 'user' else "Envirr AI"
            context_lines.append(f"{role_label}: {self._sanitize(turn.get('content', ''))}")
        context_lines.append(f"Student: {message}")
        context_lines.append("Envirr AI:")

        prompt = "\n".join(context_lines)

        try:
            # AI tutor runs on Gemini (cloud). Paper generation / ingestion use Groq.
            api_key = getattr(settings, 'GEMINI_API_KEY', None)
            if not api_key:
                raise Exception('GEMINI_API_KEY not configured.')
            model_alias = getattr(settings, 'GEMINI_TUTOR_MODEL', 'gemini-2.0-flash')
            # Map friendly aliases to valid v1beta model ids; pass specific ids through unchanged.
            _MODEL_ALIASES = {
                'gemini-flash': 'gemini-2.0-flash',
                'flash': 'gemini-2.0-flash',
                'gemini-pro': 'gemini-2.5-pro',
            }
            api_model = _MODEL_ALIASES.get(model_alias, model_alias)
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{api_model}:generateContent?key={api_key}"
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            res = http_requests.post(url, json=payload, timeout=60)
            res.raise_for_status()
            data = res.json()
            raw = ''
            if isinstance(data, dict) and data.get('candidates'):
                try:
                    raw = data['candidates'][0]['content']['parts'][0]['text']
                except Exception:
                    raw = json.dumps(data)
            else:
                raw = data.get('output', '') or data.get('response', '') or json.dumps(data)
            raw = str(raw).strip()
        except Exception:
            logger.exception('AI tutor request failed')
            # Keep the detailed error (which may include the upstream URL + API key) in the
            # server log only; return a generic message so secrets never reach the client.
            return response.Response(
                {'error': 'AI service is temporarily unavailable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

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
        safe_title = "".join(c if c.isalnum() or c in " _-" else "_" for c in paper.title)
        filename = f"{safe_title[:100]}.pdf"
        fh = open(path, 'rb')
        response = FileResponse(fh, as_attachment=True, filename=filename)
        response['Content-Length'] = os.path.getsize(path)
        return response


def _can_edit_questions(user):
    return user.role == 'admin' or (user.role == 'teacher' and user.can_edit_questions)


class QuestionBankDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not _can_edit_questions(request.user):
            return response.Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        q = get_object_or_404(QuestionBank, pk=pk)
        return response.Response(QuestionBankEditorSerializer(q, context={'request': request}).data)

    def patch(self, request, pk):
        if not _can_edit_questions(request.user):
            return response.Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        q = get_object_or_404(QuestionBank, pk=pk)

        remove_image = request.data.get('remove_image') in [True, 'true', '1']
        if remove_image and q.image:
            q.image.delete(save=False)
            q.image = None
            q.has_image = False
            q.save(update_fields=['image', 'has_image'])

        serializer = QuestionBankEditSerializer(q, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        if 'image' in request.FILES:
            instance.has_image = True
            instance.save(update_fields=['has_image'])

        # Recompute hash when question text changes so duplicates stay detectable
        if 'question_text' in request.data:
            from django.db import IntegrityError
            from ai_engine.models import QuestionBank
            instance.question_hash = QuestionBank.compute_hash(
                instance.subject, instance.chapter,
                instance.question_type, instance.question_text,
            )
            try:
                instance.save(update_fields=['question_hash'])
            except IntegrityError:
                # D2: edited text now collides with another question's hash. Keep
                # the edit (other fields already saved) but log it instead of
                # silently swallowing, and restore the persisted hash in-memory.
                logger.warning(
                    "QuestionBank hash collision on edit of id=%s (subject=%s, "
                    "chapter=%s, type=%s) — hash not updated.",
                    instance.pk, instance.subject, instance.chapter, instance.question_type,
                )
                instance.refresh_from_db(fields=['question_hash'])

        return response.Response(QuestionBankEditorSerializer(instance, context={'request': request}).data)

    def delete(self, request, pk):
        if request.user.role != 'admin':
            return response.Response({'error': 'Only admins can delete questions.'}, status=status.HTTP_403_FORBIDDEN)
        q = get_object_or_404(QuestionBank, pk=pk)
        q.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)


VALID_QUESTION_TYPES = {'MCQ', 'ASSERTION_REASON', 'VERY_SHORT', 'SHORT', 'LONG', 'CASE'}
MARKS_FOR_TYPE = {'MCQ': 1, 'ASSERTION_REASON': 1, 'VERY_SHORT': 2, 'SHORT': 3, 'LONG': 5, 'CASE': 4}
OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']


def _call_groq_text(prompt: str, api_key: str) -> str:
    from groq import Groq
    client = Groq(api_key=api_key)
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=6000,
    )
    return resp.choices[0].message.content.strip()


def _call_groq_vision(b64_image: str, mime: str, prompt: str, api_key: str) -> str:
    from groq import Groq
    client = Groq(api_key=api_key)
    resp = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_image}"}},
                {"type": "text", "text": prompt},
            ],
        }],
        temperature=0.4,
        max_tokens=6000,
    )
    return resp.choices[0].message.content.strip()


def _parse_groq_json(raw: str) -> list:
    """Strip markdown fences and parse JSON array from Groq response."""
    raw = re.sub(r'```(?:json)?', '', raw).strip().rstrip('`').strip()
    # Find the outermost JSON array in case there's leading/trailing text
    match = re.search(r'\[[\s\S]*\]', raw)
    if match:
        raw = match.group(0)
    data = json.loads(raw)
    if isinstance(data, dict):
        for v in data.values():
            if isinstance(v, list):
                return v
        return [data]
    return data if isinstance(data, list) else []


def _build_extract_pool_prompt(subject: str, chapter: str, grade: str, board: str,
                                difficulty: str, count: int,
                                content_type: str = "text", content: str = "") -> str:
    content_block = f"\n\n===CONTENT===\n{content}\n===END===" if content_type == "text" else ""
    return f"""You are an expert CBSE/ICSE question setter.
Extract and generate a pool of {count} varied exam questions from the {'content below' if content_type == 'text' else 'image'}.
Subject: {subject} | Chapter: {chapter} | Grade: {grade} | Board: {board} | Difficulty: {difficulty}

Generate a MIXED pool — aim for roughly: 40% MCQ, 20% VERY_SHORT, 25% SHORT, 15% LONG.

Return ONLY a JSON array (no markdown, no extra text):
[{{
  "question_text": "...",
  "answer_text": "...",
  "question_type": "MCQ|VERY_SHORT|SHORT|LONG",
  "marks": 1|2|3|5,
  "difficulty": "<easy|medium|hard>",
  "options": [{{"option_text": "...", "is_correct": true|false}}]
}}]

Rules:
1. Base ALL questions strictly on the provided content — do not invent
2. MCQ: exactly 4 options, exactly 1 marked is_correct=true
3. Non-MCQ: "options" must be []
4. No duplicate or near-duplicate questions{content_block}"""


class IngestUploadView(views.APIView):
    """POST /api/ai/ingest-upload/ — extract a question pool from uploaded PDF or image."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file')
        if not file:
            return response.Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        subject    = request.data.get('subject', 'General')
        chapter    = request.data.get('chapter', subject)
        grade      = request.data.get('grade', 'Grade 10')
        board      = request.data.get('board', 'CBSE')
        difficulty = request.data.get('difficulty', 'medium')
        count      = min(int(request.data.get('count', 20)), 30)

        from django.conf import settings as django_settings
        api_key = django_settings.GROQ_API_KEY
        if not api_key:
            return response.Response({'error': 'Groq API key not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        name_lower = file.name.lower()
        is_pdf   = name_lower.endswith('.pdf')
        is_image = any(name_lower.endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.webp'))

        if not (is_pdf or is_image):
            return response.Response({'error': 'Only PDF and image files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if is_pdf:
                import fitz
                doc = fitz.open(stream=file.read(), filetype="pdf")
                extracted_text = "\n".join(page.get_text() for page in doc)[:12000]
                doc.close()
                prompt = _build_extract_pool_prompt(subject, chapter, grade, board, difficulty, count,
                                                    "text", extracted_text)
                raw = _call_groq_text(prompt, api_key)
            else:
                b64  = base64.b64encode(file.read()).decode('utf-8')
                mime = ('image/jpeg' if name_lower.endswith(('.jpg', '.jpeg'))
                        else 'image/png' if name_lower.endswith('.png') else 'image/webp')
                prompt = _build_extract_pool_prompt(subject, chapter, grade, board, difficulty, count, "image")
                raw = _call_groq_vision(b64, mime, prompt, api_key)

            questions = _parse_groq_json(raw)
            pool = []
            for idx, q in enumerate(questions):
                q_type = q.get('question_type', 'SHORT')
                if q_type not in VALID_QUESTION_TYPES:
                    q_type = 'SHORT'
                pool.append({
                    '_id':           idx,
                    'question_text': q.get('question_text', ''),
                    'answer_text':   q.get('answer_text', ''),
                    'question_type': q_type,
                    'marks':         q.get('marks', MARKS_FOR_TYPE.get(q_type, 2)),
                    'difficulty':    q.get('difficulty', difficulty),
                    'options':       q.get('options', []),
                })

            return response.Response({'questions': pool, 'count': len(pool)})

        except json.JSONDecodeError:
            return response.Response({'error': 'AI returned malformed JSON. Please retry.'}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return response.Response({'error': f'Processing failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _build_detect_prompt(content_type: str, content: str = "") -> str:
    content_block = f"\n\n===CONTENT===\n{content}\n===END===" if content_type == "text" else ""
    return f"""Analyze this {'document' if content_type == 'text' else 'image'} and identify its academic details.
Return ONLY a JSON object (no markdown):
{{
  "subject": "<academic subject, e.g. Biology, Physics, History>",
  "chapter": "<specific chapter or topic, e.g. Heredity and Evolution>",
  "grade": "<grade level, e.g. Grade 10>",
  "board": "<board, e.g. CBSE or ICSE>",
  "difficulty": "<easy|medium|hard>"
}}{content_block}"""


def _build_gap_fill_prompt(subject: str, chapter: str, q_type: str, count: int,
                            difficulty: str, doc_summary: str = "") -> str:
    TYPE_DESC = {
        'MCQ':              'Multiple Choice — 4 options (A–D), exactly 1 correct',
        'ASSERTION_REASON': 'Assertion & Reason — one assertion, one reason, 4 standard options (a=both correct reason correct, b=both correct reason wrong, c=assertion wrong, d=both wrong), exactly 1 correct',
        'VERY_SHORT':       'Very Short Answer — 1–2 sentences, 2 marks',
        'SHORT':            'Short Answer — 2–4 sentences, 3 marks',
        'LONG':             'Long Answer — detailed paragraph, 5 marks',
        'CASE':             'Case Study — a short passage followed by 3 sub-questions',
    }
    marks = MARKS_FOR_TYPE.get(q_type, 2)
    context_line = f"\nDocument context: This is from a document about {doc_summary}." if doc_summary else ""
    return f"""Generate exactly {count} {q_type} question(s) for a CBSE/ICSE exam.
Subject: {subject} | Chapter/Topic: {chapter} | Difficulty: {difficulty}{context_line}

Question type: {TYPE_DESC.get(q_type, q_type)}

Return ONLY a JSON array (no markdown):
[{{
  "question_text": "...",
  "answer_text": "...",
  "question_type": "{q_type}",
  "marks": {marks},
  "difficulty": "{difficulty}",
  "options": [{{"option_text": "...", "is_correct": true|false}}]
}}]
Rules:
1. Questions must be specifically about {subject} — {chapter}
2. {"Exactly 4 options, exactly 1 marked is_correct=true" if q_type in ("MCQ", "ASSERTION_REASON") else '"options" must be []'}
3. No markdown, just the JSON array"""


class DetectDocumentView(views.APIView):
    """POST /api/ai/ingest-upload/detect/ — fast subject/chapter detection from uploaded file."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file')
        if not file:
            return response.Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings as django_settings
        api_key = django_settings.GROQ_API_KEY
        if not api_key:
            return response.Response({'error': 'Groq API key not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        name_lower = file.name.lower()
        is_pdf   = name_lower.endswith('.pdf')
        is_image = any(name_lower.endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.webp'))

        if not (is_pdf or is_image):
            return response.Response({'error': 'Only PDF and image files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if is_pdf:
                import fitz
                doc = fitz.open(stream=file.read(), filetype="pdf")
                # Only first 2 pages needed for detection — keeps it fast
                text = "\n".join(page.get_text() for page in list(doc)[:2])[:3000]
                doc.close()
                prompt = _build_detect_prompt("text", text)
                raw = _call_groq_text(prompt, api_key)
            else:
                b64  = base64.b64encode(file.read()).decode('utf-8')
                mime = ('image/jpeg' if name_lower.endswith(('.jpg', '.jpeg'))
                        else 'image/png' if name_lower.endswith('.png') else 'image/webp')
                prompt = _build_detect_prompt("image")
                raw = _call_groq_vision(b64, mime, prompt, api_key)

            raw = re.sub(r'```(?:json)?', '', raw).strip().rstrip('`').strip()
            detected = json.loads(raw)

            return response.Response({
                'subject':    detected.get('subject', ''),
                'chapter':    detected.get('chapter', ''),
                'grade':      detected.get('grade', 'Grade 10'),
                'board':      detected.get('board', 'CBSE'),
                'difficulty': detected.get('difficulty', 'medium'),
            })

        except json.JSONDecodeError:
            return response.Response({'error': 'Detection failed — unexpected AI response format.'}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return response.Response({'error': f'Detection failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GapFillView(views.APIView):
    """POST /api/ai/ingest-upload/gap-fill/ — generate AI questions to fill a section gap."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        subject     = request.data.get('subject', 'General')
        chapter     = request.data.get('chapter', subject)
        q_type      = request.data.get('question_type', 'SHORT')
        count       = min(int(request.data.get('count', 3)), 10)
        difficulty  = request.data.get('difficulty', 'medium')
        doc_summary = request.data.get('doc_summary', '')

        if q_type not in VALID_QUESTION_TYPES:
            return response.Response({'error': f'Invalid question type: {q_type}'}, status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings as django_settings
        api_key = django_settings.GROQ_API_KEY
        if not api_key:
            return response.Response({'error': 'Groq API key not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            prompt = _build_gap_fill_prompt(subject, chapter, q_type, count, difficulty, doc_summary)
            raw    = _call_groq_text(prompt, api_key)
            qs     = _parse_groq_json(raw)

            pool = []
            for idx, q in enumerate(qs[:count]):
                qt = q.get('question_type', q_type)
                if qt not in VALID_QUESTION_TYPES:
                    qt = q_type
                pool.append({
                    'question_text': q.get('question_text', ''),
                    'answer_text':   q.get('answer_text', ''),
                    'question_type': qt,
                    'marks':         q.get('marks', MARKS_FOR_TYPE.get(qt, 2)),
                    'difficulty':    q.get('difficulty', difficulty),
                    'options':       q.get('options', []),
                    'source':        'ai',
                })

            return response.Response({'questions': pool})

        except json.JSONDecodeError:
            return response.Response({'error': 'AI returned malformed JSON. Please retry.'}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return response.Response({'error': f'Gap fill failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompileIngestPaperView(views.APIView):
    """POST /api/ai/ingest-upload/compile/ — compile reviewed ingest questions into a PDF paper."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['teacher', 'admin']:
            return response.Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        sections     = request.data.get('sections', [])
        paper_config = request.data.get('paper_config', {})

        if not sections:
            return response.Response({'error': 'No sections provided.'}, status=status.HTTP_400_BAD_REQUEST)

        total_marks = sum(len(s.get('questions', [])) * s.get('marks', 1) for s in sections)
        title = (paper_config.get('title') or
                 f"{paper_config.get('subject', 'Paper')} — {paper_config.get('chapter', 'Uploaded Content')}")

        paper = QuestionPaper.objects.create(
            created_by=request.user,
            title=title[:255],
            config=paper_config,
            subject=paper_config.get('subject', '')[:100],
            class_grade=paper_config.get('grade', '')[:20],
            board=paper_config.get('board', 'CBSE')[:50],
            total_marks=total_marks,
        )

        from ai_engine.tasks import compile_ingest_paper_task
        celery_task = compile_ingest_paper_task.delay(paper_config, sections, request.user.id, paper.id)

        return response.Response({'paper_id': paper.id, 'task_id': celery_task.id}, status=status.HTTP_202_ACCEPTED)


class MCQOptionsUpdateView(views.APIView):
    """PUT /api/ai/questions/<pk>/options/ — replace text and correct flag of existing MCQ options."""
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        if not _can_edit_questions(request.user):
            return response.Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        q = get_object_or_404(QuestionBank, pk=pk)
        options_data = request.data.get('options', [])
        for opt_data in options_data:
            opt_id = opt_data.get('id')
            if opt_id:
                MCQOption.objects.filter(id=opt_id, question=q).update(
                    option_text=opt_data.get('option_text', ''),
                    is_correct=bool(opt_data.get('is_correct', False)),
                )
        return response.Response(MCQOptionSerializer(q.options.all(), many=True).data)


class QuestionBankEditorListView(generics.ListAPIView):
    """Paginated question list for the editor — returns full editor payload."""
    serializer_class = QuestionBankEditorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not _can_edit_questions(user):
            return QuestionBank.objects.none()
        qs = QuestionBank.objects.prefetch_related('options', 'case_parts').order_by('-id')

        # Scope teachers to their assigned subjects; if none assigned yet, show all
        if user.role == 'teacher':
            assigned = user.assigned_subjects or []
            if assigned:
                qs = qs.filter(subject__in=assigned)

        subject = self.request.query_params.get('subject')
        chapter = self.request.query_params.get('chapter')
        qtype = self.request.query_params.get('type')
        difficulty = self.request.query_params.get('difficulty')
        search = self.request.query_params.get('search', '').strip()
        if subject:
            qs = qs.filter(subject__iexact=subject)
        if chapter:
            qs = qs.filter(chapter__iexact=chapter)
        if qtype:
            qs = qs.filter(question_type=qtype)
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        if search:
            qs = qs.filter(question_text__icontains=search)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 30)), 100)
        total = qs.count()
        offset = (page - 1) * page_size
        items = qs[offset:offset + page_size]
        serializer = self.get_serializer(items, many=True)
        return response.Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
        })


# ── Doubts: student raises a doubt, teacher answers it ───────────────────────
from ai_engine.models import DoubtTicket, DoubtResponse
from ai_engine.serializers import DoubtTicketSerializer


class StudentDoubtView(views.APIView):
    """Student raises and lists their own doubts."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'student':
            return response.Response({'detail': 'Students only.'}, status=status.HTTP_403_FORBIDDEN)
        qs = (DoubtTicket.objects.filter(student=request.user)
              .select_related('lesson', 'lesson__path', 'lesson__path__unit')
              .prefetch_related('responses', 'responses__responder')
              .order_by('-created_at'))
        return response.Response(DoubtTicketSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role != 'student':
            return response.Response({'detail': 'Students only.'}, status=status.HTTP_403_FORBIDDEN)
        text = (request.data.get('question_text') or '').strip()
        if not text:
            return response.Response({'detail': 'A question is required.'}, status=status.HTTP_400_BAD_REQUEST)
        lesson = None
        lesson_id = request.data.get('lesson')
        if lesson_id:
            from learning.models import LearningNode
            lesson = LearningNode.objects.filter(pk=lesson_id).first()
        ticket = DoubtTicket.objects.create(student=request.user, question_text=text, lesson=lesson)
        return response.Response(DoubtTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class TeacherDoubtListView(views.APIView):
    """Teacher/admin lists doubts to answer (teachers scoped to assigned subjects)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('teacher', 'admin'):
            return response.Response({'detail': 'Teachers/admins only.'}, status=status.HTTP_403_FORBIDDEN)
        qs = (DoubtTicket.objects
              .select_related('student', 'lesson', 'lesson__path', 'lesson__path__unit')
              .prefetch_related('responses', 'responses__responder')
              .order_by('-created_at'))
        if request.user.role == 'teacher':
            subjects = getattr(request.user, 'assigned_subjects', None) or []
            if subjects:
                from django.db.models import Q
                qs = qs.filter(Q(lesson__isnull=True) | Q(lesson__path__unit__subject__in=subjects))
        return response.Response(DoubtTicketSerializer(qs, many=True).data)


class TeacherDoubtRespondView(views.APIView):
    """Teacher/admin posts a response to a doubt and marks it answered/resolved."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ('teacher', 'admin'):
            return response.Response({'detail': 'Teachers/admins only.'}, status=status.HTTP_403_FORBIDDEN)
        doubt = get_object_or_404(DoubtTicket, pk=pk)
        text = (request.data.get('response_text') or '').strip()
        if not text:
            return response.Response({'detail': 'A response is required.'}, status=status.HTTP_400_BAD_REQUEST)
        DoubtResponse.objects.create(doubt=doubt, responder=request.user, response_text=text)
        doubt.status = 'resolved' if request.data.get('resolve') else 'answered'
        doubt.save(update_fields=['status', 'updated_at'])
        return response.Response(DoubtTicketSerializer(doubt).data)
