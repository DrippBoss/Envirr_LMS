import os
import subprocess
import requests
import json
import re
from celery import shared_task
from django.conf import settings
from ai_engine.models import QuestionPaper, PaperSection, QuestionBank, PaperQuestion, DoubtTicket, DoubtResponse
from users.models import CustomUser

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

    return f"""Task: Generate unique {board} questions for Class {class_level} {subject}, Chapter: "{chapter}".
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
    if not text:
        return text
    import re
    text = str(text)
    
    # Escape LaTeX special reserved characters to prevent fatal compilation errors
    for char in ['%', '&', '#', '_']:
        text = text.replace(char, f'\\{char}')
    text = text.replace('$', r'\$')
        
    # Smart replace roots (Note: we inject $ here, so don't escape $ after this)
    text = re.sub(r'√\s*\(([^)]+)\)', r'$\\sqrt{\1}$', text)
    text = re.sub(r'√\s*(\d+|\w+)', r'$\\sqrt{\1}$', text)
    text = text.replace('√', r'$\sqrt{\quad}$') # unmatched fallback
    
    unicode_map = {
        'θ': r'$\theta$', 'α': r'$\alpha$', 'β': r'$\beta$',
        'γ': r'$\gamma$', 'π': r'$\pi$', 'Σ': r'$\sum$', 'Δ': r'$\Delta$',
    }
    for char, rep in unicode_map.items():
        text = text.replace(char, rep)
    return text

def construct_latex(config, paper):
    latex = []
    latex.append(r"\documentclass[12pt]{article}")
    latex.append(r"\usepackage[utf8]{inputenc}")
    latex.append(r"\usepackage{amsmath, amssymb, amsfonts, graphicx, enumitem}")
    latex.append(r"\usepackage[margin=1in]{geometry}")
    
    # Always include watermark for now
    latex.append(r"\usepackage{draftwatermark}")
    latex.append(r"\SetWatermarkText{Envirr Question Paper}")
    
    latex.append(r"\begin{document}")
    latex.append(f"\\begin{{center}} \\LARGE \\textbf{{{config.get('subject', 'Assessment')}}} \\\\ \\large \\textbf{{{config.get('chapter', 'Unit Test')}}} \\end{{center}}")
    latex.append(f"\\begin{{center}} \\small Board: {config.get('board', 'N/A')} | Grade: {config.get('grade', 'N/A')} | Max Marks: {config.get('max_marks', 80)} \\end{{center}}")
    latex.append(r"\vspace{0.5cm}")
    
    # Iterate through database sections
    sections = paper.sections.all().order_by('order')
        
    for sec in sections:
        q_label = str(sec.section_name)
        latex.append(f"\\section*{{{q_label} - {sec.question_type.replace('_', ' ').title()}}}")
        latex.append(f"\\textit{{Note: Each question carries {sec.marks_per_question} mark(s)}}\\vspace{{0.2cm}}")
        latex.append(r"\begin{enumerate}")
        
        paper_qs = sec.paper_questions.all().order_by('order_in_section')
        for pq in paper_qs:
            q = pq.question
            q_text = process_latex_text(q.question_text)

            latex.append(f"\\item {q_text}")
            
            # Fetch options for MCQs
            if q.question_type in ['MCQ', 'ASSERTION_REASON']:
                opts = q.options.all().order_by('order')
                if opts.exists():
                    latex.append(r"\begin{enumerate}[label=\alph*.]")
                    for opt in opts:
                        opt_text = process_latex_text(opt.option_text)
                        latex.append(f"\\item {opt_text}")
                    latex.append(r"\end{enumerate}")
            
            # Fetch parts for Case Studies
            if q.question_type == 'CASE':
                parts = q.case_parts.all().order_by('part_number')
                if parts.exists():
                    latex.append(r"\begin{enumerate}[label=(\roman*)]")
                    for part in parts:
                        part_text = process_latex_text(part.part_text)
                        latex.append(f"\\item {part_text} \\hfill ({part.marks} mark{'s' if part.marks > 1 else ''})")
                    latex.append(r"\end{enumerate}")

            latex.append(r"\vspace{0.5cm}")
        latex.append(r"\end{enumerate}")
        latex.append(r"\vspace{0.5cm}")

    latex.append(r"\end{document}")
    
    return "\n".join(latex)

def calculate_marks_distribution(total_marks):
    if total_marks <= 20: return [
        {"type": "MCQ", "count": 4, "marks": 1, "sec": "Section A"},
        {"type": "VERY_SHORT", "count": 2, "marks": 2, "sec": "Section B"},
        {"type": "SHORT", "count": 2, "marks": 3, "sec": "Section C"},
        {"type": "CASE", "count": 1, "marks": 4, "sec": "Section E"},
    ]
    if total_marks <= 40: return [
        {"type": "MCQ", "count": 10, "marks": 1, "sec": "Section A"},
        {"type": "VERY_SHORT", "count": 4, "marks": 2, "sec": "Section B"},
        {"type": "SHORT", "count": 3, "marks": 3, "sec": "Section C"},
        {"type": "LONG", "count": 1, "marks": 5, "sec": "Section D"},
        {"type": "CASE", "count": 1, "marks": 4, "sec": "Section E"},
    ]
    if total_marks <= 60: return [
        {"type": "MCQ", "count": 15, "marks": 1, "sec": "Section A"},
        {"type": "VERY_SHORT", "count": 5, "marks": 2, "sec": "Section B"},
        {"type": "SHORT", "count": 6, "marks": 3, "sec": "Section C"},
        {"type": "LONG", "count": 2, "marks": 5, "sec": "Section D"},
        {"type": "CASE", "count": 2, "marks": 4, "sec": "Section E"},
    ]
    return [
        {"type": "MCQ", "count": 16, "marks": 1, "sec": "Section A"},
        {"type": "ASSERTION_REASON", "count": 4, "marks": 1, "sec": "Section A"},
        {"type": "VERY_SHORT", "count": 6, "marks": 2, "sec": "Section B"},
        {"type": "SHORT", "count": 8, "marks": 3, "sec": "Section C"},
        {"type": "LONG", "count": 2, "marks": 5, "sec": "Section D"},
        {"type": "CASE", "count": 3, "marks": 4, "sec": "Section E"},
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
        
        # Phase 1: Bank Synthesis
        for sec, req in section_models:
            db_qs = list(QuestionBank.objects.filter(
                subject=config_data.get('subject'),
                chapter=config_data.get('chapter'),
                question_type=req['type']
            ).order_by('?')[:req['count']])
            
            for i, q in enumerate(db_qs):
                PaperQuestion.objects.create(
                    section=sec,
                    question=q,
                    order_in_section=i+1,
                    was_ai_generated=False
                )
            
            deficit = req['count'] - len(db_qs)
            if deficit > 0:
                gaps.append({"sec_id": sec.id, "type": req['type'], "count": deficit, "marks": req['marks']})
                
        # Phase 2: Batch AI Generation
        if gaps:
            prompt = _build_prompt(
                config_data.get('grade'), 
                config_data.get('subject'), 
                config_data.get('chapter'), 
                gaps, 
                config_data.get('difficulty'), 
                config_data.get('board')
            )
            
            # Using Local AI (Ollama - Llama3) as fallback for database gaps
            url = "http://host.docker.internal:11434/api/generate"
            payload = { "model": "llama3", "prompt": prompt, "format": "json", "stream": False }
            
            try:
                response = requests.post(url, json=payload, timeout=240)
                response.raise_for_status()
                data = response.json()
                raw_json_str = data.get('response', '[]')
                
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
                    
                    last_order = sec.paper_questions.count()
                    for q_dict in found:
                        q_dict['_used'] = True
                        new_q = QuestionBank.objects.create(
                            subject=config_data.get('subject'),
                            chapter=config_data.get('chapter'),
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
                print(f"Local AI Generation Failure: {e}")
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
