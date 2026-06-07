import os
import subprocess
import json
import re
from celery import shared_task
from django.conf import settings
from ai_engine.models import QuestionPaper, PaperSection, QuestionBank, PaperQuestion, DoubtTicket, DoubtResponse, MCQOption, CaseStudyPart
from users.models import CustomUser

def _run_pdflatex(tex_path, temp_dir):
    """Run pdflatex with timeout and proper error detection. Returns pdf_path."""
    pdf_path = tex_path.replace('.tex', '.pdf')
    try:
        process = subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', f'-output-directory={temp_dir}', tex_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=temp_dir,
            timeout=120
        )
    except FileNotFoundError:
        raise Exception("pdflatex is not installed on this server.")
    except subprocess.TimeoutExpired:
        raise Exception("pdflatex timed out after 120 seconds.")
    if process.returncode != 0 or not os.path.exists(pdf_path):
        error_log = process.stdout.decode('utf-8', errors='replace')[-2000:]
        raise Exception(f"pdflatex failed (exit {process.returncode}):\n{error_log}")
    return pdf_path


def parse_chapter_entries(entries):
    """
    Parse chapter chip entries that may include subtopic specifiers.

    Supported formats:
      "Polynomials"                          → chapter="Polynomials",  concept=None
      "Polynomials: Zeros of Polynomials"    → chapter="Polynomials",  concept="Zeros of Polynomials"
      "Real Numbers > HCF and LCM"           → chapter="Real Numbers", concept="HCF and LCM"

    Returns a list of (chapter, concept_or_None) tuples.
    """
    result = []
    for entry in entries:
        entry = entry.strip()
        for sep in [':', '>']:
            if sep in entry:
                parts = entry.split(sep, 1)
                result.append((parts[0].strip(), parts[1].strip()))
                break
        else:
            result.append((entry, None))
    return result


def _fetch_evenly(chapter_entries, subject, q_type, total_count):
    """
    Fetch `total_count` questions distributed as evenly as possible across
    all chapter_entries.  Returns (questions, chapter_deficits) where
    chapter_deficits is a list of (chapter, concept, deficit_count).
    """
    n = len(chapter_entries)
    base, remainder = divmod(total_count, n)
    questions = []
    deficits = []

    for i, (chapter, concept) in enumerate(chapter_entries):
        quota = base + (1 if i < remainder else 0)
        if quota == 0:
            continue
        qs = QuestionBank.objects.filter(
            subject__iexact=subject,
            chapter__icontains=chapter,
            question_type=q_type,
        )
        if concept:
            qs = qs.filter(concept__icontains=concept)
        fetched = list(qs.order_by('?')[:quota])
        questions.extend(fetched)
        deficit = quota - len(fetched)
        if deficit > 0:
            deficits.append((chapter, concept, deficit))

    return questions, deficits


def _build_prompt(class_level, subject, chapter, requirements, difficulty, board):
    type_definitions = {
        "MCQ":              "4 options (A-D), exactly 1 correct. Populate 'options' array.",
        "ASSERTION_REASON": 'Assertion (A) + Reason (R) question. options MUST be exactly these 4 fixed texts: [{"label":"A","text":"Both A and R are true and R is the correct explanation of A.","correct":?},{"label":"B","text":"Both A and R are true but R is NOT the correct explanation of A.","correct":?},{"label":"C","text":"A is true but R is false.","correct":?},{"label":"D","text":"A is false but R is true.","correct":?}]. Set correct=true on exactly one.',
        "VERY_SHORT":       "2-mark short answer. 'options' and 'parts' must be [].",
        "SHORT":            "3-mark answer (2-3 sentences). 'options' and 'parts' must be [].",
        "LONG":             "5-mark detailed answer. 'options' and 'parts' must be [].",
        "CASE":             "Passage as 'question'. Exactly 3 sub-questions in 'parts' array. 'options' must be [].",
    }
    req_summary = [f"{req['count']}x {req['type']} ({req['marks']} Marks each): {type_definitions.get(req['type'], '')}" for req in requirements]
    requirements_text = "\n".join(req_summary)

    chapter_label = chapter if isinstance(chapter, str) else ', '.join(chapter)
    return f"""Task: Generate unique {board} questions for Class {class_level} {subject}, Chapter(s): "{chapter_label}".
Difficulty: {difficulty}

Requirements:
{requirements_text}

Rules:
1. ANY and ALL mathematical symbols or equations MUST be wrapped in LaTeX delimiters ($...$).
2. Return ONLY a JSON array. No markdown fences.
3. NO REPETITION. Keep varied concept vectors.
4. ZERO IMPROVISATION: The 'type' field MUST be an EXACT match from this list: ['MCQ', 'ASSERTION_REASON', 'VERY_SHORT', 'SHORT', 'LONG', 'CASE'].
5. Structure EVERY object exactly like this:
[{{
  "question": "text or passage",
  "answer": "model answer or correct option text",
  "difficulty": "{difficulty}",
  "type": "TYPE_FROM_LIST",
  "marks": integer,
  "options": [
    {{"label": "A", "text": "option text", "correct": true}},
    {{"label": "B", "text": "option text", "correct": false}},
    {{"label": "C", "text": "option text", "correct": false}},
    {{"label": "D", "text": "option text", "correct": false}}
  ],
  "parts": [
    {{"text": "sub-question text", "answer": "sub-answer", "marks": integer}}
  ]
}}]
6. MCQ / ASSERTION_REASON: 'options' must have exactly 4 items, exactly 1 with correct=true. 'parts' must be [].
7. VERY_SHORT / SHORT / LONG: 'options' must be []. 'parts' must be [].
8. CASE: 'options' must be []. 'parts' must have exactly 3 sub-questions."""

def process_latex_text(text):
    """
    Prepare question text for pdflatex:
    1. Escape LaTeX special chars in plain-text regions.
    2. Convert Unicode math symbols (subscripts, superscripts, fractions, roots,
       Greek letters) back to proper LaTeX so PDFs render correctly.
    Existing $...$ regions are passed through unchanged.
    """
    if not text:
        return text
    text = str(text)

    # Split on existing $...$ / $$...$$ math regions — leave them untouched.
    segments = re.split(r'(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)', text)

    # Unicode subscript/superscript digit maps
    _sub_to_ascii = str.maketrans('₀₁₂₃₄₅₆₇₈₉₊₋', '0123456789+-')
    _sup_to_ascii = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789')
    _sub_letter   = {'ₙ': 'n', 'ₘ': 'm', 'ₚ': 'p', 'ₖ': 'k', 'ᵢ': 'i', 'ᵣ': 'r'}
    _frac_to_latex = {
        '½': r'\frac{1}{2}', '⅓': r'\frac{1}{3}', '⅔': r'\frac{2}{3}',
        '¼': r'\frac{1}{4}', '¾': r'\frac{3}{4}',
        '⅛': r'\frac{1}{8}', '⅜': r'\frac{3}{8}',
        '⅝': r'\frac{5}{8}', '⅞': r'\frac{7}{8}',
    }

    def _unicode_math_to_latex(seg):
        # Unicode fractions → \frac{}{} wrapped in $...$
        for uni, ltx in _frac_to_latex.items():
            seg = seg.replace(uni, f'${ltx}$')

        # Unicode superscripts (²³ etc.) attached to a preceding token → $x^{n}$
        # e.g. "3n²" → "$3n^{2}$", "n²+1" → "$n^{2}$+1"
        def _sup_repl(m):
            base = m.group(1)
            exp  = m.group(2).translate(_sup_to_ascii)
            return f'${base}^{{{exp}}}$'
        seg = re.sub(r'([\w]+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)', _sup_repl, seg)

        # Unicode subscripts — handle runs of subscript digits/letters
        # e.g. "a₁₈" → "$a_{18}$", "aₙ" → "$a_{n}$", "Sₙ₋₁" → "$S_{n-1}$"
        def _sub_repl(m):
            base  = m.group(1)
            subsc = m.group(2)
            # decode each subscript char
            decoded = ''
            for c in subsc:
                if c in _sub_letter:
                    decoded += _sub_letter[c]
                else:
                    decoded += c.translate(_sub_to_ascii)
            return f'${base}_{{{decoded}}}$'
        # subscript letter chars
        sub_chars = ''.join(_sub_letter.keys()) + '₀₁₂₃₄₅₆₇₈₉₊₋'
        seg = re.sub(rf'([A-Za-z])([{re.escape(sub_chars)}]+)', _sub_repl, seg)

        # √ — already handled below but catch any remaining
        seg = re.sub(r'√\s*\(([^)]+)\)', r'$\\sqrt{\1}$', seg)
        seg = re.sub(r'√\s*([\w.]+)',    r'$\\sqrt{\1}$', seg)
        seg = seg.replace('√', r'$\sqrt{\;\;}$')

        # Greek / special Unicode → LaTeX
        for char, rep in [
            ('θ', r'$\theta$'), ('α', r'$\alpha$'), ('β', r'$\beta$'),
            ('γ', r'$\gamma$'), ('π', r'$\pi$'),    ('Σ', r'$\sum$'),
            ('Δ', r'$\Delta$'), ('∞', r'$\infty$'), ('±', r'$\pm$'),
            ('×', r'$\times$'), ('÷', r'$\div$'),   ('≠', r'$\neq$'),
            ('≤', r'$\leq$'),   ('≥', r'$\geq$'),
        ]:
            seg = seg.replace(char, rep)

        return seg

    result = []
    for seg in segments:
        if seg.startswith('$'):
            result.append(seg)          # existing LaTeX math — unchanged
        else:
            # Escape LaTeX special chars in plain text
            for char in ['%', '#']:
                seg = seg.replace(char, f'\\{char}')
            seg = seg.replace('&', r'\&')
            # Convert Unicode math → LaTeX
            seg = _unicode_math_to_latex(seg)
            result.append(seg)

    return ''.join(result)

def construct_latex(config, paper):
    latex = []
    latex.append(r"\documentclass[12pt]{article}")
    latex.append(r"\usepackage[utf8]{inputenc}")
    latex.append(r"\usepackage{amsmath, amssymb, amsfonts, graphicx, enumitem}")
    latex.append(r"\usepackage[margin=1in]{geometry}")
    # needspace: jump to next page if fewer than N lines remain (prevents orphaned options)
    latex.append(r"\usepackage{needspace}")

    # Always include watermark for now
    latex.append(r"\usepackage{draftwatermark}")
    latex.append(r"\SetWatermarkText{Envirr Question Paper}")

    # Suppress overfull/underfull box warnings in log (cleaner compile)
    latex.append(r"\hbadness=10000")
    latex.append(r"\vbadness=10000")

    latex.append(r"\begin{document}")
    raw = config.get('chapters') or ([config.get('chapter')] if config.get('chapter') else [])
    parsed = parse_chapter_entries(raw)
    chapter_title = ' \\& '.join(
        f"{ch} ({con})" if con else ch for ch, con in parsed
    ) if parsed else 'Unit Test'
    latex.append(f"\\begin{{center}} \\LARGE \\textbf{{{config.get('subject', 'Assessment')}}} \\\\ \\large \\textbf{{{chapter_title}}} \\end{{center}}")
    latex.append(f"\\begin{{center}} \\small Board: {config.get('board', 'N/A')} | Grade: {config.get('grade', 'N/A')} | Max Marks: {config.get('max_marks', 80)} \\end{{center}}")
    latex.append(r"\vspace{0.5cm}")

    # Iterate through database sections (continuous question numbering across sections)
    sections = paper.sections.all().order_by('order')
    running_q_num = 0   # tracks global question counter
    last_section_name = None  # suppress duplicate section headers (e.g. MCQ + A/R both in Section A)

    for sec in sections:
        q_label = str(sec.section_name)
        if q_label != last_section_name:
            latex.append(f"\\section*{{{q_label}}}")
            last_section_name = q_label
        marks_note = f"{sec.marks_per_question} mark(s)" if sec.marks_per_question > 0 else "Variable marks"
        latex.append(f"\\textit{{Note: Each question carries {marks_note}}}\\vspace{{0.2cm}}")
        # Resume numbering from where the last section left off
        latex.append(r"\begin{enumerate}[leftmargin=*]")
        latex.append(f"\\setcounter{{enumi}}{{{running_q_num}}}")

        paper_qs = sec.paper_questions.all().order_by('order_in_section')
        for pq in paper_qs:
            q = pq.question
            q_text = process_latex_text(q.question_text)
            running_q_num += 1

            has_opts  = q.question_type in ['MCQ', 'ASSERTION_REASON']
            has_parts = q.question_type == 'CASE'
            has_img   = q.has_image and q.image
            opts      = q.options.all().order_by('order') if has_opts else []
            parts     = q.case_parts.all().order_by('part_number') if has_parts else []

            # Build LaTeX for the diagram (if any) — path must be absolute for pdflatex
            img_latex = ''
            if has_img:
                img_path = os.path.join(settings.MEDIA_ROOT, str(q.image)).replace('\\', '/')
                img_latex = (
                    f"\\begin{{center}}\\includegraphics[width=0.40\\textwidth,keepaspectratio]"
                    f"{{{img_path}}}\\end{{center}}"
                )

            # Estimate line count for this block to decide needspace amount
            img_lines = 8 if has_img else 0
            if has_opts and opts:
                latex.append(f"\\needspace{{{9 + img_lines}\\baselineskip}}")
            elif has_parts and parts:
                part_count = len(parts)
                latex.append(f"\\needspace{{{part_count + 4 + img_lines}\\baselineskip}}")
            else:
                latex.append(f"\\needspace{{{4 + img_lines}\\baselineskip}}")

            if has_opts and opts:
                # Keep question text + diagram + all options together — no page break inside
                latex.append(f"\\item \\begin{{minipage}}[t]{{\\linewidth}}")
                latex.append(q_text)
                if img_latex:
                    latex.append(img_latex)
                latex.append(r"\begin{enumerate}[label=\alph*., leftmargin=1.5em, topsep=2pt, itemsep=1pt]")
                for opt in opts:
                    opt_text = process_latex_text(opt.option_text)
                    latex.append(f"\\item {opt_text}")
                latex.append(r"\end{enumerate}")
                latex.append(r"\end{minipage}")
            elif has_parts and parts:
                latex.append(f"\\item {q_text}")
                if img_latex:
                    latex.append(img_latex)
                latex.append(r"\begin{enumerate}[label=(\roman*), leftmargin=1.5em, topsep=2pt, itemsep=2pt]")
                for part in parts:
                    part_text = process_latex_text(part.part_text)
                    latex.append(f"\\item {part_text} \\hfill ({part.marks} mark{'s' if part.marks > 1 else ''})")
                latex.append(r"\end{enumerate}")
            else:
                latex.append(f"\\item {q_text}")
                if img_latex:
                    latex.append(img_latex)

            latex.append(r"\vspace{0.4cm}")

        latex.append(r"\end{enumerate}")
        latex.append(r"\vspace{0.3cm}")

    latex.append(r"\end{document}")

    return "\n".join(latex)

def calculate_marks_distribution(total_marks):
    # Tiers mirror paper_structure.txt exactly.
    # Section A always ends with 2 Assertion-Reason (1 mark each).
    if total_marks <= 15:
        # Only 1-mark questions to reach total
        return [
            {"type": "MCQ", "count": total_marks, "marks": 1, "sec": "Section A"},
        ]
    if total_marks <= 20:
        # Sec A: 4 MCQ + 2 A/R = 6×1  Sec B: 2×2  Sec C: 2×3  Sec E: 1×4  = 20
        return [
            {"type": "MCQ",              "count": 4, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2, "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 2, "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 2, "marks": 3, "sec": "Section C"},
            {"type": "CASE",             "count": 1, "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 25:
        # Sec A: 4 MCQ + 2 A/R  Sec B: 2×2  Sec C: 2×3  Sec D: 1×5  Sec E: 1×4  = 25
        return [
            {"type": "MCQ",              "count": 4, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2, "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 2, "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 2, "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 1, "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 1, "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 30:
        # Sec A: 4 MCQ + 2 A/R  Sec B: 3×2  Sec C: 3×3  Sec D: 1×5  Sec E: 1×4  = 30
        return [
            {"type": "MCQ",              "count": 4, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2, "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 3, "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 3, "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 1, "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 1, "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 40:
        # Sec A: 7 MCQ + 2 A/R  Sec B: 3×2  Sec C: 3×3  Sec D: 1×5  Sec E: 2×4  = 38≈40
        return [
            {"type": "MCQ",              "count": 7, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2, "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 3, "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 3, "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 1, "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 2, "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 50:
        # Sec A: 10 MCQ + 2 A/R  Sec B: 4×2  Sec C: 4×3  Sec D: 2×5  Sec E: 2×4  = 50
        return [
            {"type": "MCQ",              "count": 10, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 4,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 4,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 2,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 2,  "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 60:
        # Sec A: 15 MCQ + 2 A/R  Sec B: 5×2  Sec C: 5×3  Sec D: 2×5  Sec E: 2×4  = 60
        return [
            {"type": "MCQ",              "count": 15, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 5,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 5,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 2,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 2,  "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 70:
        # Sec A: 11 MCQ + 2 A/R  Sec B: 6×2  Sec C: 6×3  Sec D: 3×5  Sec E: 3×4  = 70
        return [
            {"type": "MCQ",              "count": 11, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 6,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 6,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 3,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 3,  "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 80:
        # Sec A: 11 MCQ + 2 A/R  Sec B: 7×2  Sec C: 7×3  Sec D: 4×5  Sec E: 3×4  = 80
        return [
            {"type": "MCQ",              "count": 11, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 7,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 7,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 4,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 3,  "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 90:
        # Sec A: 12 MCQ + 2 A/R  Sec B: 7×2  Sec C: 7×3  Sec D: 5×5  Sec E: 4×4  = 90
        return [
            {"type": "MCQ",              "count": 12, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 7,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 7,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 5,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 4,  "marks": 4, "sec": "Section E"},
        ]
    # ≤100 (default)
    # Sec A: 16 MCQ + 2 A/R  Sec B: 8×2  Sec C: 7×3  Sec D: 5×5  Sec E: 5×4  = 100
    return [
        {"type": "MCQ",              "count": 16, "marks": 1, "sec": "Section A"},
        {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
        {"type": "VERY_SHORT",       "count": 8,  "marks": 2, "sec": "Section B"},
        {"type": "SHORT",            "count": 7,  "marks": 3, "sec": "Section C"},
        {"type": "LONG",             "count": 5,  "marks": 5, "sec": "Section D"},
        {"type": "CASE",             "count": 5,  "marks": 4, "sec": "Section E"},
    ]

@shared_task(bind=True, max_retries=3)
def generate_paper_task(self, config_data, user_id, paper_id):
    from celery.exceptions import MaxRetriesExceededError
    try:
        user = CustomUser.objects.get(id=user_id)
        paper = QuestionPaper.objects.get(id=paper_id)
        QuestionPaper.objects.filter(id=paper_id).update(status='processing')
        max_marks = config_data.get('max_marks', 80)
        
        distribution = calculate_marks_distribution(max_marks)
        
        gaps = []
        
        # Setup PaperSections
        section_models = []
        for idx, req in enumerate(distribution):
            sec = PaperSection.objects.create(
                paper=paper,
                section_name=req['sec'],
                question_type=req['type'],
                marks_per_question=req['marks'],
                question_count=req['count'],
                order=idx
            )
            section_models.append((sec, req))
        
        # Resolve & parse chapter/subtopic entries
        raw_chapters = config_data.get('chapters') or []
        if not raw_chapters:
            ch = config_data.get('chapter', '')
            if ch:
                raw_chapters = [ch]
        chapter_entries = parse_chapter_entries(raw_chapters)  # [(chapter, concept|None), ...]

        # Phase 1: Bank Synthesis — evenly distributed across all chapter entries
        for sec, req in section_models:
            db_qs, chapter_deficits = _fetch_evenly(
                chapter_entries,
                config_data.get('subject'),
                req['type'],
                req['count'],
            )

            for i, q in enumerate(db_qs):
                PaperQuestion.objects.create(
                    section=sec,
                    question=q,
                    order_in_section=i+1,
                    was_ai_generated=False,
                )

            total_deficit = sum(d for _, _, d in chapter_deficits)
            if total_deficit > 0:
                gaps.append({
                    "sec_id": sec.id,
                    "type": req['type'],
                    "count": total_deficit,
                    "marks": req['marks'],
                    "chapter_entries": chapter_deficits,  # [(chapter, concept, deficit)]
                })
                
        # Phase 2: Batch AI Generation
        if gaps:
            # Build chapter label for the AI prompt from all gap entries
            all_gap_chapters = []
            for g in gaps:
                for ch, concept, _ in g.get('chapter_entries', []):
                    label = f"{ch}: {concept}" if concept else ch
                    if label not in all_gap_chapters:
                        all_gap_chapters.append(label)
            chapter_label_for_prompt = all_gap_chapters or [config_data.get('chapter', '')]

            prompt = _build_prompt(
                config_data.get('grade'),
                config_data.get('subject'),
                chapter_label_for_prompt,
                gaps,
                config_data.get('difficulty'),
                config_data.get('board'),
            )
            
            # Using Groq to fill question bank gaps
            if not settings.GROQ_API_KEY:
                raise Exception("GROQ_API_KEY is not configured. Cannot generate AI questions.")
            try:
                from groq import Groq
                groq_client = Groq(api_key=settings.GROQ_API_KEY)
                groq_resp = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.4,
                    max_tokens=6000,
                )
                raw_json_str = groq_resp.choices[0].message.content.strip()
                # Strip any markdown fences
                raw_json_str = re.sub(r'```(?:json)?', '', raw_json_str).strip().rstrip('`').strip()
                arr_match = re.search(r'\[[\s\S]*\]', raw_json_str)
                if arr_match:
                    raw_json_str = arr_match.group(0)

                try:
                    new_q_dicts = json.loads(raw_json_str)
                except json.JSONDecodeError:
                    # Groq often returns LaTeX backslashes unescaped (\sqrt, \alpha etc.)
                    # Fix: walk the string and double any lone backslash
                    fixed = []
                    i = 0
                    while i < len(raw_json_str):
                        ch = raw_json_str[i]
                        if ch == '\\':
                            nxt = raw_json_str[i + 1] if i + 1 < len(raw_json_str) else ''
                            if nxt == '\\':
                                fixed.append('\\\\')  # already escaped — keep
                                i += 2
                            else:
                                fixed.append('\\\\')  # lone backslash — escape it
                                i += 1
                        else:
                            fixed.append(ch)
                            i += 1
                    new_q_dicts = json.loads(''.join(fixed))

                if isinstance(new_q_dicts, dict):
                    for v in new_q_dicts.values():
                        if isinstance(v, list):
                            new_q_dicts = v
                            break
                    else:
                        new_q_dicts = [new_q_dicts]

                if not isinstance(new_q_dicts, list):
                    new_q_dicts = []

                # Validate each question has required fields before saving
                valid_q_dicts = []
                for qd in new_q_dicts:
                    if not isinstance(qd, dict):
                        continue
                    q_text = qd.get('question') or qd.get('question_text', '')
                    q_type = qd.get('type') or qd.get('question_type', '')
                    if not q_text or not q_type:
                        continue
                    # Build a clean normalised copy — never mutate the original
                    valid_q_dicts.append({
                        **qd,
                        'question': q_text,
                        'answer':   qd.get('answer') or qd.get('answer_text', ''),
                        'type':     q_type,
                    })
                new_q_dicts = valid_q_dicts

                # Distribute generated questions back into their sections
                for gap in gaps:
                    sec = PaperSection.objects.get(id=gap['sec_id'])
                    needed = gap['count']
                    found = [
                        qd for qd in new_q_dicts
                        if qd.get('type') == gap['type'] and not qd.get('_used')
                    ][:needed]

                    gap_chapter_entries = gap.get('chapter_entries', [])
                    ai_chapter = gap_chapter_entries[0][0] if gap_chapter_entries else config_data.get('chapter', 'AI Generated')

                    last_order = sec.paper_questions.count()
                    for q_dict in found:
                        q_dict['_used'] = True
                        new_q = QuestionBank.objects.create(
                            subject=config_data.get('subject'),
                            chapter=ai_chapter,
                            question_type=q_dict.get('type', gap['type']),
                            marks=gap['marks'],
                            difficulty=config_data.get('difficulty', 'medium'),
                            question_text=q_dict.get('question', 'AI Generated Question'),
                            answer_text=q_dict.get('answer', ''),
                            is_ai_generated=True,
                        )

                        # Create MCQ / Assertion-Reason options
                        if gap['type'] in ('MCQ', 'ASSERTION_REASON'):
                            for opt in q_dict.get('options', [])[:4]:
                                MCQOption.objects.create(
                                    question=new_q,
                                    option_label=opt.get('label', 'A'),
                                    option_text=opt.get('text', opt.get('option_text', '')),
                                    is_correct=bool(opt.get('correct', opt.get('is_correct', False))),
                                    order={'A': 1, 'B': 2, 'C': 3, 'D': 4}.get(opt.get('label', 'A'), 1),
                                )

                        # Create Case Study sub-questions
                        if gap['type'] == 'CASE':
                            for part_i, part in enumerate(q_dict.get('parts', [])[:4], start=1):
                                CaseStudyPart.objects.create(
                                    parent_question=new_q,
                                    part_number=part_i,
                                    part_text=part.get('text', ''),
                                    part_answer=part.get('answer', ''),
                                    marks=part.get('marks', 1),
                                    question_type='SHORT',
                                )

                        last_order += 1
                        PaperQuestion.objects.create(
                            section=sec,
                            question=new_q,
                            order_in_section=last_order,
                            was_ai_generated=True,
                        )
            except Exception as e:
                raise Exception(f"AI question generation failed: {e}")

        # Phase 3: Final Document String Compilation
        latex_content = construct_latex(config_data, paper)
        temp_dir = os.path.join(settings.BASE_DIR, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        unique_id = f"paper_{paper.id}"
        tex_path = os.path.join(temp_dir, f"{unique_id}.tex")
        pdf_path = os.path.join(temp_dir, f"{unique_id}.pdf")
        
        with open(tex_path, 'w', encoding='utf-8') as f:
            f.write(latex_content)

        pdf_path = _run_pdflatex(tex_path, temp_dir)

        from django.core.files import File
        with open(pdf_path, 'rb') as f:
            paper.secure_pdf_path.save(f"{unique_id}.pdf", File(f))
        paper.save()

        for ext in ['.tex', '.log', '.aux', '.out']:
            junk_file = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk_file): os.remove(junk_file)

        QuestionPaper.objects.filter(id=paper_id).update(status='done')
        return paper.id
    except Exception as exc:
        try:
            raise self.retry(exc=exc, countdown=30)
        except MaxRetriesExceededError:
            QuestionPaper.objects.filter(id=paper_id).update(
                status='failed',
                error_message=str(exc)[:1000],
            )
            raise

@shared_task(bind=True, max_retries=3)
def compile_ingest_paper_task(self, paper_config, sections_with_questions, user_id, paper_id):
    """
    Compile a question paper from AI-generated ingest questions.
    sections_with_questions: [{name, type, marks, questions: [{question_text, answer_text, marks, difficulty, options}]}]
    Only the questions the teacher kept (passed in) are seeded to QuestionBank.
    """
    import hashlib as _hashlib
    from ai_engine.models import MCQOption
    from celery.exceptions import MaxRetriesExceededError
    OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']

    try:
        paper = QuestionPaper.objects.get(id=paper_id)
        QuestionPaper.objects.filter(id=paper_id).update(status='processing')
        subject = paper_config.get('subject', 'General')
        chapter = paper_config.get('chapter', 'General')
        total_marks = 0

        for idx, sec_data in enumerate(sections_with_questions):
            questions = sec_data.get('questions', [])
            if not questions:
                continue

            sec = PaperSection.objects.create(
                paper=paper,
                section_name=sec_data['name'],
                question_type=sec_data['type'],
                marks_per_question=sec_data.get('marks', 1),
                question_count=len(questions),
                order=idx,
            )

            for q_idx, q_data in enumerate(questions):
                q_text = q_data.get('question_text', '').strip()
                if not q_text:
                    continue

                raw_hash = f"{subject}{chapter}{q_text.lower()}"
                q_hash = _hashlib.sha256(raw_hash.encode()).hexdigest()

                # get_or_create to handle duplicate content gracefully
                bank_q, created = QuestionBank.objects.get_or_create(
                    question_hash=q_hash,
                    defaults={
                        'subject':       subject,
                        'chapter':       chapter,
                        'question_type': sec_data['type'],
                        'marks':         q_data.get('marks', sec_data.get('marks', 1)),
                        'difficulty':    q_data.get('difficulty', 'medium'),
                        'question_text': q_text,
                        'answer_text':   q_data.get('answer_text', ''),
                        'is_ai_generated': True,
                    }
                )

                if created and sec_data['type'] in ('MCQ', 'ASSERTION_REASON'):
                    for opt_i, opt in enumerate(q_data.get('options', [])[:5]):
                        MCQOption.objects.create(
                            question=bank_q,
                            option_label=OPTION_LABELS[opt_i],
                            option_text=opt.get('option_text', ''),
                            is_correct=bool(opt.get('is_correct', False)),
                            order=opt_i + 1,
                        )

                total_marks += bank_q.marks
                PaperQuestion.objects.create(
                    section=sec,
                    question=bank_q,
                    order_in_section=q_idx + 1,
                    was_ai_generated=True,
                )

        paper.total_marks = total_marks
        paper.save()

        # Compile PDF using existing LaTeX pipeline
        latex_content = construct_latex(paper_config, paper)
        temp_dir = os.path.join(settings.BASE_DIR, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        unique_id = f"paper_ingest_{paper.id}"
        tex_path = os.path.join(temp_dir, f"{unique_id}.tex")
        pdf_path = os.path.join(temp_dir, f"{unique_id}.pdf")

        with open(tex_path, 'w', encoding='utf-8') as f:
            f.write(latex_content)

        pdf_path = _run_pdflatex(tex_path, temp_dir)

        from django.core.files import File
        with open(pdf_path, 'rb') as f:
            paper.secure_pdf_path.save(f"{unique_id}.pdf", File(f))
        paper.save()

        for ext in ('.tex', '.log', '.aux', '.out'):
            junk = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk):
                os.remove(junk)

        QuestionPaper.objects.filter(id=paper_id).update(status='done')
        return paper.id

    except Exception as exc:
        try:
            raise self.retry(exc=exc, countdown=30)
        except MaxRetriesExceededError:
            QuestionPaper.objects.filter(id=paper_id).update(
                status='failed',
                error_message=str(exc)[:1000],
            )
            raise


@shared_task(bind=True, max_retries=3)
def compile_manual_paper_task(self, config_data, user_id, paper_id):
    from celery.exceptions import MaxRetriesExceededError
    try:
        user = CustomUser.objects.get(id=user_id)
        paper = QuestionPaper.objects.get(id=paper_id)
        QuestionPaper.objects.filter(id=paper_id).update(status='processing')
        
        # Phase 1: Save Custom Questions
        custom_qs = config_data.get('custom_questions', [])
        custom_map = {}
        for idx, cq in enumerate(custom_qs):
            new_q = QuestionBank.objects.create(
                subject=config_data.get('subject'),
                chapter="Custom",
                question_type=cq.get('type'),
                marks=cq.get('marks', 1),
                difficulty=cq.get('difficulty', 'medium'),
                question_text=cq.get('question_text'),
                answer_text=cq.get('answer_text', ''),
                is_ai_generated=False
            )
            # Map string ID to real DB ID
            custom_map[f"custom-{idx}"] = new_q

        # Phase 2: Setup Sections & Links
        total_paper_marks = 0
        sections_data = config_data.get('sections', [])
        
        for idx, sec_data in enumerate(sections_data):
            sec_type = sec_data.get('type')
            q_ids = sec_data.get('questions', [])
            
            if not q_ids:
                continue
                
            sec = PaperSection.objects.create(
                paper=paper,
                section_name=sec_data.get('name'),
                question_type=sec_type,
                marks_per_question=0, # Variable in manual
                question_count=len(q_ids),
                order=idx
            )
            
            # Link questions in exact array order
            order = 1
            for q_id in q_ids:
                q_id_str = str(q_id)
                if q_id_str.startswith('custom-'):
                    q = custom_map.get(q_id_str)
                else:
                    q = QuestionBank.objects.filter(id=q_id).first()
                
                if q:
                    total_paper_marks += q.marks
                    PaperQuestion.objects.create(
                        section=sec,
                        question=q,
                        order_in_section=order,
                        was_ai_generated=q.is_ai_generated
                    )
                    order += 1
                    
        # Update exact total marks
        paper.total_marks = total_paper_marks
        paper.save()

        # Phase 3: Fast PDF Compilation
        latex_content = construct_latex(config_data, paper)
        temp_dir = os.path.join(settings.BASE_DIR, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        unique_id = f"paper_manual_{paper.id}"
        tex_path = os.path.join(temp_dir, f"{unique_id}.tex")
        pdf_path = os.path.join(temp_dir, f"{unique_id}.pdf")
        
        with open(tex_path, 'w', encoding='utf-8') as f:
            f.write(latex_content)

        pdf_path = _run_pdflatex(tex_path, temp_dir)

        from django.core.files import File
        with open(pdf_path, 'rb') as f:
            paper.secure_pdf_path.save(f"{unique_id}.pdf", File(f))
        paper.save()

        for ext in ['.tex', '.log', '.aux', '.out']:
            junk_file = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk_file): os.remove(junk_file)

        QuestionPaper.objects.filter(id=paper_id).update(status='done')
        return paper.id
    except Exception as exc:
        try:
            raise self.retry(exc=exc, countdown=30)
        except MaxRetriesExceededError:
            QuestionPaper.objects.filter(id=paper_id).update(
                status='failed',
                error_message=str(exc)[:1000],
            )
            raise
