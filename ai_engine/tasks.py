import os
import subprocess
import requests
import json
from celery import shared_task
from django.conf import settings
from ai_engine.models import GeneratedPaper, QuestionBank, PaperQuestion, DoubtTicket, DoubtResponse
from users.models import CustomUser

def construct_latex(config, questions):
    # Handle common unicode math symbols that might slip past the AI's prompt
    unicode_map = {
        '√': r'$\sqrt{\quad}$',
        'θ': r'$\theta$',
        'α': r'$\alpha$',
        'β': r'$\beta$',
        'γ': r'$\gamma$',
        'π': r'$\pi$',
        'Σ': r'$\sum$',
        'Δ': r'$\Delta$',
    }

    latex = []
    latex.append(r"\documentclass[12pt]{article}")
    latex.append(r"\usepackage[utf8]{inputenc}")
    latex.append(r"\usepackage{amsmath, amssymb, amsfonts, graphicx}")
    latex.append(r"\usepackage[margin=1in]{geometry}")
    
    if not config.get('include_answers', True):
        latex.append(r"\usepackage{draftwatermark}")
        latex.append(r"\SetWatermarkText{Envirr Document Generator}")
    
    latex.append(r"\begin{document}")
    latex.append(f"\\begin{{center}} \\LARGE \\textbf{{{config.get('subject', 'Assessment')}}} \\\\ \\large \\textbf{{{config.get('chapter', 'Unit Test')}}} \\end{{center}}")
    latex.append(f"\\begin{{center}} \\small Board: {config.get('board', 'N/A')} | Grade: {config.get('grade', 'N/A')} | Max Marks: {config.get('max_marks', 80)} \\end{{center}}")
    latex.append(r"\vspace{0.5cm}")
    
    latex.append(r"\begin{enumerate}")
    for q in questions:
        q_text = q.question_text
        a_text = q.answer_text
        for char, replacement in unicode_map.items():
            q_text = q_text.replace(char, replacement)
            if a_text:
                a_text = a_text.replace(char, replacement)

        latex.append(f"\\item \\textbf{{[{q.marks} Marks]}} {q_text}")
        if config.get('include_answers', True) and a_text and str(a_text).lower() != "none":
            latex.append(f"\\\\ \\textit{{Answer: {a_text}}}\\vspace{{0.5cm}}")
        else:
            latex.append(r"\vspace{0.5cm}")
    latex.append(r"\end{enumerate}")
    latex.append(r"\end{document}")
    
    return "\n".join(latex)

def parse_rubric(max_marks):
    # Generates exact counts required mapped back from old Express logic
    if max_marks <= 20: return {1: 5, 2: 2, 3: 2, 5: 1}
    elif max_marks <= 40: return {1: 10, 2: 4, 3: 4, 5: 2} 
    else: return {1: 20, 2: 8, 3: 8, 5: 4}

@shared_task(bind=True, max_retries=3)
def generate_paper_task(self, config_data, user_id, paper_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        paper = GeneratedPaper.objects.get(id=paper_id)
        max_marks = config_data.get('max_marks', 80)
        rubric = parse_rubric(max_marks)
        
        selected_questions = []
        
        # Phase 1: Bank Synthesis
        for g_marks, count_needed in rubric.items():
            db_qs = list(QuestionBank.objects.filter(
                subject=config_data.get('subject'),
                chapter=config_data.get('chapter'),
                marks=g_marks
            ).order_by('?')[:count_needed])
            
            selected_questions.extend(db_qs)
            deficit = count_needed - len(db_qs)
            
            # Phase 2: JSON Targeted AI Extraction Loop
            if deficit > 0:
                prompt = f'''
                You are a test generator.
                Subject: {config_data.get('subject')}
                Chapter: {config_data.get('chapter')}
                Grade: {config_data.get('grade')}
                Board: {config_data.get('board')}
                Generate EXACTLY {deficit} distinct questions worth {g_marks} marks each.
                Difficulty: {config_data.get('difficulty')}
                Custom Instructions: {config_data.get('custom_instructions')}
                
                You MUST return ONLY a strict JSON array of objects. 
                Format: [{{"question_text": "...", "answer_text": "..."}}]
                DO NOT INCLUDE MARKDOWN FENCES. JUST RAW JSON.
                '''
                
                url = "http://host.docker.internal:11434/api/generate"
                payload = { "model": "llama3", "prompt": prompt, "format": "json", "stream": False }
                
                try:
                    response = requests.post(url, json=payload, timeout=120)
                    response.raise_for_status()
                    data = response.json()
                    raw_json_str = data.get('response', '[]')
                    
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
                        
                    for q_dict in new_q_dicts:
                        if not isinstance(q_dict, dict): continue
                        
                        new_q = QuestionBank.objects.create(
                            subject=config_data.get('subject'),
                            chapter=config_data.get('chapter'),
                            question_type='short_answer' if g_marks > 1 else 'mcq',
                            marks=g_marks,
                            difficulty=config_data.get('difficulty', 'medium'),
                            question_text=q_dict.get('question_text', 'Fallback Question'),
                            answer_text=q_dict.get('answer_text', 'Fallback Answer'),
                            is_ai_generated=True
                        )
                        selected_questions.append(new_q)
                except Exception as e:
                    print(f"Llama3 Network or JSON Parsing Failure: {e}")
                    pass 
                    
        # Phase 3: Final Document String Compilation
        latex_content = construct_latex(config_data, selected_questions)
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
        
        for sq in selected_questions: PaperQuestion.objects.create(paper=paper, question=sq)
        
        for ext in ['.tex', '.log', '.aux', '.out']:
            junk_file = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk_file): os.remove(junk_file)
                
        return paper.id
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
