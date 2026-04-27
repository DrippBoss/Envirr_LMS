import os
import subprocess
import requests
import json
import re
from celery import shared_task
from django.conf import settings
from ai_engine.models import QuestionPaper, PaperSection, QuestionBank, PaperQuestion, DoubtTicket, DoubtResponse
from users.models import CustomUser

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
            subject=subject,
            chapter=chapter,
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
        "MCQ": "4 options (A-D). One correct answer.",
        "ASSERTION_REASON": "Assertion/Reason (a,b,c,d options)",
        "VERY_SHORT": "2-mark short answer. Options MUST be [].",
        "SHORT": "3-mark answer (2-3 sentences). Options MUST be [].",
        "LONG": "5-mark detailed answer. Options MUST be [].",
        "CASE": "Passage as 'question', 3 sub-questions.",
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
5. Structure EVERY object perfectly like this:
[{{
  "question": "text or passage",
  "answer": "answer text",
  "difficulty": "{difficulty}",
  "type": "TYPE_FROM_LIST",
  "marks": integer
}}]"""

def process_latex_text(text):
    """
    Safely escape LaTeX special characters in question text while preserving
    existing $...$ math regions unchanged.
    """
    if not text:
        return text
    text = str(text)

    # Split into alternating [text, $math$, text, $math$, ...] segments.
    # $$...$$ display math comes before $...$ so the longer pattern wins.
    segments = re.split(r'(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)', text)

    result = []
    for seg in segments:
        if seg.startswith('$'):
            # Math region — pass through completely unchanged
            result.append(seg)
        else:
            # Text region — escape the chars that break LaTeX outside math mode
            for char in ['%', '#']:
                seg = seg.replace(char, f'\\{char}')
            # & only needs escaping outside tables; safe to escape in plain text
            seg = seg.replace('&', r'\&')

            # Convert Unicode root symbol to LaTeX
            seg = re.sub(r'√\s*\(([^)]+)\)', r'$\\sqrt{\1}$', seg)
            seg = re.sub(r'√\s*(\d+|\w+)', r'$\\sqrt{\1}$', seg)
            seg = seg.replace('√', r'$\sqrt{\quad}$')

            # Convert common Unicode math letters to LaTeX
            unicode_map = {
                'θ': r'$\theta$', 'α': r'$\alpha$', 'β': r'$\beta$',
                'γ': r'$\gamma$', 'π': r'$\pi$',   'Σ': r'$\sum$',
                'Δ': r'$\Delta$',
            }
            for char, rep in unicode_map.items():
                seg = seg.replace(char, rep)

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

    for sec in sections:
        q_label = str(sec.section_name)
        latex.append(f"\\section*{{{q_label} — {sec.question_type.replace('_', ' ').title()}}}")
        latex.append(f"\\textit{{Note: Each question carries {sec.marks_per_question} mark(s)}}\\vspace{{0.2cm}}")
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
            opts      = q.options.all().order_by('order') if has_opts else []
            parts     = q.case_parts.all().order_by('part_number') if has_parts else []

            # Estimate line count for this block to decide needspace amount
            if has_opts and opts:
                # question (2 lines) + 4 options (1 line each) + spacing = ~8 lines
                latex.append(r"\needspace{9\baselineskip}")
            elif has_parts and parts:
                part_count = len(parts)
                latex.append(f"\\needspace{{{part_count + 4}\\baselineskip}}")
            else:
                latex.append(r"\needspace{4\baselineskip}")

            if has_opts and opts:
                # Keep question text + all options together — no page break inside
                latex.append(f"\\item \\begin{{minipage}}[t]{{\\linewidth}}")
                latex.append(q_text)
                latex.append(r"\begin{enumerate}[label=\alph*., leftmargin=1.5em, topsep=2pt, itemsep=1pt]")
                for opt in opts:
                    opt_text = process_latex_text(opt.option_text)
                    latex.append(f"\\item {opt_text}")
                latex.append(r"\end{enumerate}")
                latex.append(r"\end{minipage}")
            elif has_parts and parts:
                latex.append(f"\\item {q_text}")
                latex.append(r"\begin{enumerate}[label=(\roman*), leftmargin=1.5em, topsep=2pt, itemsep=2pt]")
                for part in parts:
                    part_text = process_latex_text(part.part_text)
                    latex.append(f"\\item {part_text} \\hfill ({part.marks} mark{'s' if part.marks > 1 else ''})")
                latex.append(r"\end{enumerate}")
            else:
                latex.append(f"\\item {q_text}")

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
        # Sec A: 8 MCQ + 2 A/R  Sec B: 4×2  Sec C: 4×3  Sec D: 2×5  Sec E: 2×4  = 50
        return [
            {"type": "MCQ",              "count": 8, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2, "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 4, "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 4, "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 2, "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 2, "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 60:
        # Sec A: 13 MCQ + 2 A/R  Sec B: 5×2  Sec C: 5×3  Sec D: 2×5  Sec E: 2×4  = 60
        return [
            {"type": "MCQ",              "count": 13, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 5,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 5,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 2,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 2,  "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 70:
        # Sec A: 13 MCQ + 2 A/R  Sec B: 6×2  Sec C: 6×3  Sec D: 3×5  Sec E: 3×4  = 72≈70
        return [
            {"type": "MCQ",              "count": 13, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 6,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 6,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 3,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 3,  "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 80:
        # Sec A: 13 MCQ + 2 A/R  Sec B: 7×2  Sec C: 7×3  Sec D: 4×5  Sec E: 3×4  = 80
        return [
            {"type": "MCQ",              "count": 13, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 7,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 7,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 4,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 3,  "marks": 4, "sec": "Section E"},
        ]
    if total_marks <= 90:
        # Sec A: 14 MCQ + 2 A/R  Sec B: 7×2  Sec C: 7×3  Sec D: 5×5  Sec E: 4×4  = 90
        return [
            {"type": "MCQ",              "count": 14, "marks": 1, "sec": "Section A"},
            {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
            {"type": "VERY_SHORT",       "count": 7,  "marks": 2, "sec": "Section B"},
            {"type": "SHORT",            "count": 7,  "marks": 3, "sec": "Section C"},
            {"type": "LONG",             "count": 5,  "marks": 5, "sec": "Section D"},
            {"type": "CASE",             "count": 4,  "marks": 4, "sec": "Section E"},
        ]
    # ≤100 (default)
    # Sec A: 18 MCQ + 2 A/R  Sec B: 8×2  Sec C: 7×3  Sec D: 5×5  Sec E: 5×4  = 100
    return [
        {"type": "MCQ",              "count": 18, "marks": 1, "sec": "Section A"},
        {"type": "ASSERTION_REASON", "count": 2,  "marks": 1, "sec": "Section A"},
        {"type": "VERY_SHORT",       "count": 8,  "marks": 2, "sec": "Section B"},
        {"type": "SHORT",            "count": 7,  "marks": 3, "sec": "Section C"},
        {"type": "LONG",             "count": 5,  "marks": 5, "sec": "Section D"},
        {"type": "CASE",             "count": 5,  "marks": 4, "sec": "Section E"},
    ]

@shared_task(bind=True, max_retries=3)
def generate_paper_task(self, config_data, user_id, paper_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        paper = QuestionPaper.objects.get(id=paper_id)
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
            
            # Using Gemini as fallback for database gaps
            gemini_api_key = settings.GEMINI_API_KEY
            gemini_url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-2.0-flash:generateContent?key={gemini_api_key}"
            )
            gemini_payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            }

            try:
                response = requests.post(gemini_url, json=gemini_payload, timeout=120)
                response.raise_for_status()
                data = response.json()
                raw_json_str = (
                    data.get('candidates', [{}])[0]
                    .get('content', {})
                    .get('parts', [{}])[0]
                    .get('text', '[]')
                )

                # Cleanup potential code fences
                raw_json_str = re.sub(r'```(?:json)?', '', raw_json_str).strip()

                new_q_dicts = json.loads(raw_json_str)
                
                if isinstance(new_q_dicts, dict):
                    for k, v in new_q_dicts.items():
                        if isinstance(v, list):
                            new_q_dicts = v
                            break
                    else:
                        new_q_dicts = [new_q_dicts]
                
                if not isinstance(new_q_dicts, list):
                    new_q_dicts = []
                    
                # Distribute back to sections
                for gap in gaps:
                    sec = PaperSection.objects.get(id=gap['sec_id'])
                    needed = gap['count']
                    found = [qd for qd in new_q_dicts if qd.get('type') == gap['type'] and qd.get('_used') is not True][:needed]
                    
                    # Determine which chapter to tag AI questions with
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
                            question_text=q_dict.get('question', 'Fallback Question'),
                            answer_text=q_dict.get('answer', 'Fallback Answer'),
                            is_ai_generated=True
                        )
                        last_order += 1
                        PaperQuestion.objects.create(
                            section=sec,
                            question=new_q,
                            order_in_section=last_order,
                            was_ai_generated=True
                        )
            except Exception as e:
                print(f"Gemini AI Generation Failure: {e}")
                pass 
                
        # Phase 3: Final Document String Compilation
        latex_content = construct_latex(config_data, paper)
        temp_dir = os.path.join(settings.BASE_DIR, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        unique_id = f"paper_{self.request.id}"
        tex_path = os.path.join(temp_dir, f"{unique_id}.tex")
        pdf_path = os.path.join(temp_dir, f"{unique_id}.pdf")
        
        with open(tex_path, 'w', encoding='utf-8') as f: f.write(latex_content)
            
        process = subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', f'-output-directory={temp_dir}', tex_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=temp_dir
        )
        if not os.path.exists(pdf_path):
            raise Exception("pdflatex compilation failed to output a PDF")
            
        from django.core.files import File
        with open(pdf_path, 'rb') as f:
            paper.secure_pdf_path.save(f"{unique_id}.pdf", File(f))
        paper.save()
        
        for ext in ['.tex', '.log', '.aux', '.out']:
            junk_file = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk_file): os.remove(junk_file)
                
        return paper.id
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)

@shared_task(bind=True, max_retries=3)
def compile_manual_paper_task(self, config_data, user_id, paper_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        paper = QuestionPaper.objects.get(id=paper_id)
        
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
        unique_id = f"paper_manual_{self.request.id}"
        tex_path = os.path.join(temp_dir, f"{unique_id}.tex")
        pdf_path = os.path.join(temp_dir, f"{unique_id}.pdf")
        
        with open(tex_path, 'w', encoding='utf-8') as f: f.write(latex_content)
            
        process = subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', f'-output-directory={temp_dir}', tex_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=temp_dir
        )
        if not os.path.exists(pdf_path):
            raise Exception("pdflatex compilation failed to output a PDF")
            
        from django.core.files import File
        with open(pdf_path, 'rb') as f:
            paper.secure_pdf_path.save(f"{unique_id}.pdf", File(f))
        paper.save()
        
        for ext in ['.tex', '.log', '.aux', '.out']:
            junk_file = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk_file): os.remove(junk_file)
                
        return paper.id
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
