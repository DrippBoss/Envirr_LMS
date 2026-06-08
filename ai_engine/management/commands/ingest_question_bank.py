"""
Ingest a question-bank PDF into ai_engine.QuestionBank using Groq Vision (free tier).

Usage (inside Docker):
  docker cp path/to/bank.pdf envirr_lms-web-1:/tmp/bank.pdf
  docker exec envirr_lms-web-1 python manage.py ingest_question_bank \
      --pdf //tmp/bank.pdf \
      --subject Mathematics \
      --chapter "Triangles" \
      --board CBSE --grade 10 \
      --api-key gsk_...

Groq free tier: 14,400 RPD, no billing needed.
Model: llama-3.2-90b-vision-preview

Requirements (in requirements.txt):
  PyMuPDF>=1.24.0
  groq>=0.11.0
"""

import base64
import hashlib
import io
import json
import os
import re
import time

import fitz  # PyMuPDF
from groq import Groq
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from PIL import Image

from ai_engine.models import (
    CaseStudyPart,
    Difficulty,
    IngestionStatus,
    MCQOption,
    QuestionBank,
    QuestionType,
    SourceDocument,
)


# ── LaTeX → plain-text cleaner (safety net for model output) ──────────────────

_SUB_DIGITS = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')
_SUP_MAP    = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'}
_SUB_LTRS   = {'n':'ₙ','m':'ₘ','p':'ₚ','k':'ₖ','q':'q','i':'ᵢ','r':'ᵣ'}
_FRAC_UNI   = {
    ('1','2'):'½',('1','3'):'⅓',('2','3'):'⅔',
    ('1','4'):'¼',('3','4'):'¾',
    ('1','8'):'⅛',('3','8'):'⅜',('5','8'):'⅝',('7','8'):'⅞',
}

def _sup(s):
    return ''.join(_SUP_MAP.get(c, c) for c in s)

def _sub(s):
    out = ''
    for c in s:
        if c.isdigit():   out += c.translate(_SUB_DIGITS)
        elif c in _SUB_LTRS: out += _SUB_LTRS[c]
        elif c == '+':    out += '₊'
        elif c == '-':    out += '₋'
        else:             out += c
    return out

def clean_latex_text(text: str) -> str:
    import re as _re
    # mixed fractions first: 4\frac{1}{2} → 4½
    def _mixed(m):
        w, n, d = m.group(1), m.group(2), m.group(3)
        return w + _FRAC_UNI.get((n, d), f'{n}/{d}')
    text = _re.sub(r'(-?\d+)\\frac\{(\d+)\}\{(\d+)\}', _mixed, text)
    # plain \frac{a}{b}
    def _frac(m):
        n, d = m.group(1).strip(), m.group(2).strip()
        return _FRAC_UNI.get((n, d), f'{n}/{d}') if (n.isdigit() and d.isdigit()) else f'{n}/{d}'
    text = _re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', _frac, text)
    # \sqrt{x}
    def _sqrt(m):
        inner = m.group(1).strip()
        return ('√' + inner) if _re.match(r'^[\w.]+$', inner) else ('√(' + inner + ')')
    text = _re.sub(r'\\sqrt\{([^{}]+)\}', _sqrt, text)
    text = _re.sub(r'\\sqrt\s*(\d+)', lambda m: '√' + m.group(1), text)
    # superscripts / subscripts
    text = _re.sub(r'\^\{([^{}]+)\}', lambda m: _sup(m.group(1)), text)
    text = _re.sub(r'\^(\d)',          lambda m: _SUP_MAP.get(m.group(1), m.group(1)), text)
    text = _re.sub(r'_\{([^{}]+)\}',  lambda m: _sub(m.group(1)), text)
    text = _re.sub(r'_(\d)',           lambda m: m.group(1).translate(_SUB_DIGITS), text)
    text = _re.sub(r'_([nmkpq])',      lambda m: _SUB_LTRS.get(m.group(1), m.group(1)), text)
    # ellipsis
    for pat in [r'\\cdot\\cdot\\cdot', r'\\cdots', r'\\ldots', r'\\dots']:
        text = _re.sub(pat, '...', text)
    # operators & symbols
    for pat, rep in [
        (r'\\times','×'),(r'\\div','÷'),(r'\\pm','±'),(r'\\mp','∓'),
        (r'\\neq','≠'),(r'\\ne\b','≠'),(r'\\leq','≤'),(r'\\geq','≥'),
        (r'\\le\b','≤'),(r'\\ge\b','≥'),(r'\\infty','∞'),
        (r'\\alpha','α'),(r'\\beta','β'),(r'\\theta','θ'),(r'\\pi','π'),
        (r'\\left',''),(r'\\right',''),
    ]:
        text = _re.sub(pat, rep, text)
    text = text.replace('$', '')
    text = _re.sub(r'\\[a-zA-Z]+', '', text)
    text = text.replace('{', '').replace('}', '')
    text = _re.sub(r' {2,}', ' ', text).strip()
    return text


# ── Prompt ────────────────────────────────────────────────────────────────────

EXTRACTION_PROMPT = """
You are a mathematics expert extracting and SOLVING questions from a question bank PDF page.

IMPORTANT: The PDF does NOT have answers marked. You must SOLVE each question yourself
using your mathematics knowledge to determine which option is correct.

Return ONLY a valid JSON object — no markdown fences, no extra text, NO whitespace or newlines in the JSON (compact single-line format to save tokens).

Schema:
{
  "questions": [
    {
      "number": 1,
      "type": "MCQ",
      "marks": 1,
      "text": "full question text exactly as written",
      "has_diagram": true,
      "diagram_bbox": [0.25, 0.10, 0.75, 0.38],
      "options": [
        {"label": "a", "text": "option text", "is_correct": false},
        {"label": "b", "text": "option text", "is_correct": false},
        {"label": "c", "text": "option text", "is_correct": true},
        {"label": "d", "text": "option text", "is_correct": false}
      ],
      "answer_text": "brief working: e.g. By BPT: AE/EC = DE/BC so x = ay/(a+b)",
      "difficulty": "medium",
      "board_tag": "BOARD 2023",
      "case_parts": []
    }
  ]
}

Rules:
1. type must be one of: MCQ, ASSERTION_REASON, VERY_SHORT, SHORT, LONG, CASE
   - 1-mark with a/b/c/d options -> MCQ
   - 1-mark no options -> VERY_SHORT
   - 2-mark -> SHORT
   - 3-5 mark -> LONG
   - Case study / passage-based -> CASE
2. diagram_bbox: if has_diagram is true give [x1,y1,x2,y2] as fractions 0.0-1.0 of page
   dimensions (origin top-left). Tight crop around the figure. Omit key if no diagram.
3. difficulty: "easy" for recall, "medium" for 1-step, "hard" for multi-step or BOARD questions.
4. board_tag: extract "BOARD 2023", "BOARD 2024", "COMPARTMENT 2023" etc. null if absent.
5. SOLVE each MCQ mathematically then mark exactly one option is_correct: true.
   Put brief working in answer_text (e.g. "By BPT: 2/3=2/x so x=3").
6. For ASSERTION_REASON: put both statements in text, solve to find correct option.
7. For CASE: fill case_parts and solve each sub-question.
8. Include ALL questions on the page. Ignore headers, footers, page numbers.
9. CRITICAL — NEVER use LaTeX notation in any text field. Write all math as plain Unicode:
   - Subscripts: a₁, a₂, aₙ, Sₙ (use Unicode subscript characters)
   - Superscripts: x², n³, 10th, nth (use ² ³ or just write "th")
   - Fractions: write as 1/2, (a+b)/c, or use Unicode ½ ¼ ¾
   - Square roots: √2, √(x+1)
   - Special: × ÷ ± ≠ ≤ ≥ ∞ π α β θ
   - Ellipsis: ... (three dots)
   - Do NOT use $, \frac, \sqrt, \cdot, \alpha, _{}, ^{} or any backslash commands.
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _difficulty(marks: int, explicit: str) -> str:
    mapping = {"easy": Difficulty.EASY, "medium": Difficulty.MEDIUM, "hard": Difficulty.HARD}
    if explicit in mapping:
        return mapping[explicit]
    return {1: Difficulty.EASY, 2: Difficulty.MEDIUM}.get(marks, Difficulty.HARD)


def _qtype(raw: str) -> str:
    return {
        "MCQ":              QuestionType.MCQ,
        "ASSERTION_REASON": QuestionType.ASSERTION_REASON,
        "VERY_SHORT":       QuestionType.VERY_SHORT,
        "SHORT":            QuestionType.SHORT,
        "LONG":             QuestionType.LONG,
        "CASE":             QuestionType.CASE,
        "REARRANGE":        QuestionType.REARRANGE,
    }.get(raw.upper(), QuestionType.SHORT)


def _crop_image(pix: fitz.Pixmap, bbox: list, page_w: int, page_h: int) -> bytes:
    x1 = max(0, int(bbox[0] * page_w))
    y1 = max(0, int(bbox[1] * page_h))
    x2 = min(page_w, int(bbox[2] * page_w))
    y2 = min(page_h, int(bbox[3] * page_h))
    if x2 <= x1 or y2 <= y1:
        return b""
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    buf = io.BytesIO()
    img.crop((x1, y1, x2, y2)).save(buf, format="PNG")
    return buf.getvalue()


def _compute_hash(subject: str, chapter: str, text: str) -> str:
    return hashlib.sha256(f"{subject}{chapter}{text.strip().lower()}".encode()).hexdigest()


def _extract_partial_questions(text: str) -> list:
    """Brace-counting extraction of complete question objects from truncated JSON."""
    arr_start = text.find('[', text.find('"questions"') if '"questions"' in text else 0)
    if arr_start == -1:
        return []
    questions = []
    i = arr_start + 1
    while i < len(text):
        while i < len(text) and text[i] in ' \n\r\t':
            i += 1
        if i >= len(text) or text[i] != '{':
            break
        depth, j, in_str, esc = 0, i, False, False
        while j < len(text):
            c = text[j]
            if esc:
                esc = False
            elif c == '\\' and in_str:
                esc = True
            elif c == '"':
                in_str = not in_str
            elif not in_str:
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        try:
                            q = json.loads(text[i:j+1])
                            if "text" in q and "number" in q:
                                questions.append(q)
                        except json.JSONDecodeError:
                            pass
                        i = j + 1
                        break
            j += 1
        else:
            break  # truncated object — stop
        while i < len(text) and text[i] in ' \n\r\t,':
            i += 1
    return questions


def _safe_json(text: str) -> dict | None:
    text = re.sub(r"^```[a-z]*\n?", "", text.strip())
    text = re.sub(r"\n?```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Recover complete objects from truncated response
    questions = _extract_partial_questions(text)
    if questions:
        return {"questions": questions}
    return None


# ── Command ───────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Ingest a question-bank PDF into QuestionBank via Groq Vision"

    def add_arguments(self, parser):
        parser.add_argument("--pdf",        required=True,  help="Path to the PDF file")
        parser.add_argument("--subject",    required=True,  help='e.g. "Mathematics"')
        parser.add_argument("--chapter",    required=True,  help='e.g. "Triangles"')
        parser.add_argument("--board",      default="CBSE", help="Board name")
        parser.add_argument("--grade",      default="10",   help="Class grade")
        parser.add_argument("--api-key",    default="",     help="Groq API key (or set GROQ_API_KEY env var)")
        parser.add_argument("--model",      default="meta-llama/llama-4-scout-17b-16e-instruct", help="Groq vision model")
        parser.add_argument("--dpi",        default=150,    type=int,   help="Page render DPI (150 keeps images under Groq size limit)")
        parser.add_argument("--delay",      default=5,      type=int,   help="Seconds between pages")
        parser.add_argument("--start-page", default=1,      type=int,   help="First page (1-indexed)")
        parser.add_argument("--end-page",   default=0,      type=int,   help="Last page (0=all)")
        parser.add_argument("--dry-run",    action="store_true",        help="Parse only, no DB writes")

    def handle(self, *args, **options):
        pdf_path = options["pdf"]
        subject  = options["subject"]
        chapter  = options["chapter"]
        board    = options["board"]
        grade    = options["grade"]
        dry_run  = options["dry_run"]
        model_id = options["model"]
        dpi      = options["dpi"]
        delay    = options["delay"]

        if not os.path.exists(pdf_path):
            raise CommandError(f"PDF not found: {pdf_path}")

        api_key = options["api_key"] or os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise CommandError("Groq API key required. Pass --api-key or set GROQ_API_KEY env var.")

        client = Groq(api_key=api_key)

        # ── SourceDocument ──────────────────────────────────────────────────
        with open(pdf_path, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()

        doc         = fitz.open(pdf_path)
        total_pages = len(doc)
        start_page  = max(1, options["start_page"]) - 1
        end_page    = (options["end_page"] or total_pages) - 1

        if not dry_run:
            src_doc, created = SourceDocument.objects.get_or_create(
                file_hash=file_hash,
                defaults={
                    "title": f"{subject} — {chapter}", "subject": subject,
                    "chapter": chapter, "board": board, "class_grade": grade,
                    "page_count": total_pages, "status": IngestionStatus.PROCESSING,
                }
            )
            if not created:
                src_doc.status = IngestionStatus.PROCESSING
                src_doc.save(update_fields=["status"])
        else:
            src_doc = None
            self.stdout.write(self.style.WARNING("DRY RUN — nothing will be written to DB."))

        # ── Page loop ───────────────────────────────────────────────────────
        matrix = fitz.Matrix(dpi / 72.0, dpi / 72.0)
        total_created = total_skipped = total_errors = 0
        pages = list(range(start_page, end_page + 1))

        self.stdout.write(
            f"\nIngesting {len(pages)} pages | {subject} — {chapter} | model: {model_id}\n"
        )

        for page_idx in pages:
            page     = doc[page_idx]
            page_num = page_idx + 1
            # Skip page if already fully processed in a previous run
            if not dry_run and src_doc:
                already = QuestionBank.objects.filter(
                    source_document=src_doc, source_page=page_num
                ).count()
                if already > 0:
                    self.stdout.write(
                        f"  Page {page_num}/{total_pages} ... already saved ({already} questions) — skipped"
                    )
                    total_skipped += already
                    continue

            self.stdout.write(f"  Page {page_num}/{total_pages} ...", ending=" ")

            pix    = page.get_pixmap(matrix=matrix)
            page_w, page_h = pix.width, pix.height

            # Build list of image crops to send: full page first, halves as fallback
            def _encode_crop(p: fitz.Pixmap, y0: int, y1: int) -> str:
                img = Image.frombytes("RGB", [p.width, p.height], p.samples).crop((0, y0, p.width, y1))
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                return base64.standard_b64encode(buf.getvalue()).decode()

            def _call_groq(b64: str) -> str | None:
                for attempt in range(4):
                    try:
                        resp = client.chat.completions.create(
                            model=model_id,
                            messages=[{"role": "user", "content": [
                                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                                {"type": "text", "text": EXTRACTION_PROMPT},
                            ]}],
                            max_tokens=8192,
                            temperature=0.1,
                        )
                        return resp.choices[0].message.content
                    except Exception as exc:
                        err = str(exc)
                        if "429" in err or "rate_limit" in err.lower():
                            wait = 60 * (attempt + 1)
                            self.stdout.write(self.style.WARNING(
                                f"Rate limited — waiting {wait}s (attempt {attempt+1}/4)..."
                            ))
                            time.sleep(wait)
                        else:
                            self.stdout.write(self.style.ERROR(f"GROQ ERROR: {exc}"))
                            return None
                return None

            # Try full page first
            raw_text = _call_groq(_encode_crop(pix, 0, page_h))
            parsed   = _safe_json(raw_text) if raw_text else None

            # If truncated/failed, split into top and bottom halves
            if not parsed or "questions" not in parsed:
                self.stdout.write(self.style.WARNING("truncated — splitting into halves..."), ending=" ")
                mid = page_h // 2
                all_questions = []
                for y0, y1 in [(0, mid), (mid, page_h)]:
                    time.sleep(delay)
                    half_text = _call_groq(_encode_crop(pix, y0, y1))
                    if half_text:
                        half_parsed = _safe_json(half_text)
                        if half_parsed and "questions" in half_parsed:
                            all_questions.extend(half_parsed["questions"])
                if all_questions:
                    parsed = {"questions": all_questions}
                else:
                    self.stdout.write(self.style.ERROR("FAILED both halves — skipping page."))
                    total_errors += 1
                    continue

            questions    = parsed["questions"]
            page_created = 0
            self.stdout.write(f"{len(questions)} questions", ending="")

            for q in questions:
                text = clean_latex_text((q.get("text") or "").strip())
                if not text:
                    continue

                q_hash = _compute_hash(subject, chapter, text)

                if dry_run:
                    correct = next(
                        (o["label"] for o in q.get("options", []) if o.get("is_correct")), "?"
                    )
                    self.stdout.write(
                        f"\n    [{q.get('type','?')} {q.get('marks','?')}m] ans={correct}  {text[:70]}"
                    )
                    total_created += 1
                    continue

                if QuestionBank.objects.filter(question_hash=q_hash).exists():
                    total_skipped += 1
                    continue

                # Crop diagram
                diagram_file      = None
                image_description = ""
                has_image         = bool(q.get("has_diagram"))
                if has_image and q.get("diagram_bbox"):
                    crop = _crop_image(pix, q["diagram_bbox"], page_w, page_h)
                    if crop:
                        safe = re.sub(r"[^a-z0-9]", "_", text[:30].lower())
                        diagram_file      = ContentFile(crop, name=f"p{page_num}_q{q.get('number',0)}_{safe}.png")
                        image_description = f"Diagram for: {text[:80]}"

                try:
                    marks_raw = int(q.get("marks") or 1)
                    qb = QuestionBank(
                        subject=subject, chapter=chapter,
                        question_type=_qtype(q.get("type", "SHORT")),
                        marks=max(1, marks_raw),
                        difficulty=_difficulty(max(1, marks_raw), q.get("difficulty") or ""),
                        question_text=text,
                        answer_text=q.get("answer_text") or "",
                        has_image=has_image and diagram_file is not None,
                        image_description=image_description,
                        tags=[q["board_tag"]] if q.get("board_tag") else [],
                        question_hash=q_hash,
                        is_ai_generated=False, is_verified=False,
                        source_document=src_doc, source_page=page_num,
                    )
                    if diagram_file:
                        qb.image.save(diagram_file.name, diagram_file, save=False)
                    qb.save()

                    for i, opt in enumerate(q.get("options") or []):
                        if not isinstance(opt, dict):
                            continue
                        MCQOption.objects.create(
                            question=qb,
                            option_label=str(opt.get("label", "")).strip()[:1].lower(),
                            option_text=str(opt.get("text", "")).strip(),
                            is_correct=bool(opt.get("is_correct")),
                            order=i,
                        )

                    for part in q.get("case_parts") or []:
                        if not isinstance(part, dict):
                            continue
                        CaseStudyPart.objects.get_or_create(
                            parent_question=qb,
                            part_number=int(part.get("part_number", 1)),
                            defaults=dict(
                                part_text=str(part.get("text", "")).strip(),
                                part_answer=str(part.get("answer", "")).strip(),
                                question_type=_qtype(part.get("type", "SHORT")),
                                marks=max(1, int(part.get("marks") or 1)),
                                has_image=bool(part.get("has_diagram")),
                            ),
                        )

                    total_created += 1
                    page_created  += 1

                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"\n    DB error: {exc}"))
                    total_errors += 1

            if not dry_run:
                self.stdout.write(f"  -> {page_created} saved")
            else:
                self.stdout.write("")

            if page_idx < pages[-1]:
                time.sleep(delay)

        if src_doc and not dry_run:
            src_doc.status = IngestionStatus.DONE if total_errors == 0 else IngestionStatus.FAILED
            src_doc.save(update_fields=["status"])

        doc.close()
        self.stdout.write(self.style.SUCCESS(
            f"\nDone!  Created: {total_created}  Skipped: {total_skipped}  Errors: {total_errors}"
        ))
