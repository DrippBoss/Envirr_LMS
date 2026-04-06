import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Update Serializers
SERIALIZERS_PY = """from rest_framework import serializers

class GeneratePaperSerializer(serializers.Serializer):
    board = serializers.CharField(max_length=50, default="CBSE")
    grade = serializers.CharField(max_length=50, default="10th")
    subject = serializers.CharField()
    chapter = serializers.CharField()
    paper_type = serializers.CharField()
    max_marks = serializers.IntegerField()
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'])
    include_answers = serializers.BooleanField(default=True)
    custom_instructions = serializers.CharField(required=False, allow_blank=True)
"""

with open(os.path.join(BASE_DIR, 'ai_engine', 'serializers.py'), 'w') as f:
    f.write(SERIALIZERS_PY)

# 2. Update Tasks
TASKS_PY = """import os
import subprocess
import requests
import json
from celery import shared_task
from django.conf import settings
from ai_engine.models import GeneratedPaper, QuestionBank, PaperQuestion, DoubtTicket, DoubtResponse
from users.models import CustomUser

def construct_latex(config, questions):
    # Assembles combined cache into rigid LaTeX document wrapper
    latex = []
    latex.append(r"\\documentclass[12pt]{article}")
    latex.append(r"\\usepackage{amsmath, amssymb, graphicx}")
    latex.append(r"\\usepackage[margin=1in]{geometry}")
    
    if not config.get('include_answers', True):
        # Fake watermark for 'No Answers' testing via legacy constraints
        latex.append(r"\\usepackage{draftwatermark}")
        latex.append(r"\\SetWatermarkText{Envirr Document Generator}")
    
    latex.append(r"\\begin{document}")
    latex.append(f"\\\\begin{{center}} \\\\LARGE \\\\textbf{{{config.get('subject', 'Assessment')}}} \\\\end{{center}}")
    latex.append(f"\\\\begin{{center}} \\\\large Board: {config.get('board', 'N/A')} | Grade: {config.get('grade', 'N/A')} | Marks: {config.get('max_marks', 80)} \\\\end{{center}}")
    latex.append(r"\\vspace{1cm}")
    
    latex.append(r"\\begin{enumerate}")
    for q in questions:
        latex.append(f"\\\\item \\\\textbf{{[{q.marks} Marks]}} {q.question_text}")
        if config.get('include_answers', True) and q.answer_text and str(q.answer_text).lower() != "none":
            latex.append(f"\\\\\\\\ \\\\textit{{Answer: {q.answer_text}}}\\\\vspace{{0.5cm}}")
        else:
            latex.append(r"\\vspace{1cm}")
    latex.append(r"\\end{enumerate}")
    latex.append(r"\\end{document}")
    
    return "\\n".join(latex)

def parse_rubric(max_marks):
    # Generates exact counts required mapped back from old Express logic
    if max_marks <= 20: return {1: 5, 2: 2, 3: 2, 5: 1}
    elif max_marks <= 40: return {1: 10, 2: 4, 3: 4, 5: 2} 
    else: return {1: 20, 2: 8, 3: 8, 5: 4}

@shared_task(bind=True, max_retries=3)
def generate_paper_task(self, config_data, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)
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
                    for q_dict in new_q_dicts:
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
        if process.returncode != 0 or not os.path.exists(pdf_path):
            raise Exception(f"pdflatex compilation failed")
            
        paper = GeneratedPaper.objects.create(
            created_by=user, title=f"Generated {config_data.get('subject')} Exam", config=config_data
        )
        paper.secure_pdf_path.name = os.path.relpath(pdf_path, settings.BASE_DIR)
        paper.save()
        
        for sq in selected_questions: PaperQuestion.objects.create(paper=paper, question=sq)
        
        for ext in ['.tex', '.log', '.aux', '.out']:
            junk_file = os.path.join(temp_dir, f"{unique_id}{ext}")
            if os.path.exists(junk_file): os.remove(junk_file)
                
        return paper.id
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
"""

with open(os.path.join(BASE_DIR, 'ai_engine', 'tasks.py'), 'w') as f:
    f.write(TASKS_PY)

# 3. Update Frontend Map
TEACHER_PANEL_TSX = """import { useState } from 'react';
import { api } from '../context/AuthContext';

export default function TeacherPanel() {
    const [loading, setLoading] = useState(false);
    
    // Expanded Legacy State Map
    const [board, setBoard] = useState('CBSE');
    const [grade, setGrade] = useState('10th');
    const [subject, setSubject] = useState('Mathematics');
    const [chapter, setChapter] = useState('');
    const [paperType, setPaperType] = useState('Exam');
    const [marks, setMarks] = useState(80);
    const [difficulty, setDifficulty] = useState('medium');
    const [includeAnswers, setIncludeAnswers] = useState(true);
    const [customInstructions, setCustomInstructions] = useState('');

    const handleAIGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { board, grade, subject, chapter, paper_type: paperType, max_marks: marks, difficulty, include_answers: includeAnswers, custom_instructions: customInstructions };
            const res = await api.post('/ai/generate-paper/', payload);
            alert("AI Bank DB Synthesis Triggered: " + res.data.message);
        } catch (err) {
            alert("Failed to trigger Llama3 Synthesis.");
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in grid-dashboard">
            <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                <h2>Local AI Generator (Llama3 Database Interlock)</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Pings Ollama locally to synthesize discrete JSON fields into QuestionBank safely parsing your rubric structure.</p>
                
                <form onSubmit={handleAIGenerate} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                    <select className="input-glass" value={board} onChange={e=>setBoard(e.target.value)}>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                    </select>
                    <select className="input-glass" value={grade} onChange={e=>setGrade(e.target.value)}>
                        <option value="9th">9th Grade</option>
                        <option value="10th">10th Grade</option>
                        <option value="11th">11th Grade</option>
                        <option value="12th">12th Grade</option>
                    </select>
                    
                    <input className="input-glass" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} required />
                    <input className="input-glass" placeholder="Chapter(s)" value={chapter} onChange={e=>setChapter(e.target.value)} required />
                    <input className="input-glass" type="number" placeholder="Total Marks" value={marks} onChange={e=>setMarks(Number(e.target.value))} required />
                    
                    <select className="input-glass" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                    <input className="input-glass" placeholder="Custom Strict Instructions..." value={customInstructions} onChange={e=>setCustomInstructions(e.target.value)} style={{ gridColumn: '1 / -1' }}/>
                    
                    <button type="submit" className="btn-primary" disabled={loading} style={{ gridColumn: '1 / -1' }}>
                        {loading ? 'Synthesizing JSON Database...' : 'Compile Smart Test Array 🚀'}
                    </button>
                </form>
            </div>
        </div>
    );
}
"""

with open(os.path.join(BASE_DIR, 'frontend', 'src', 'pages', 'TeacherPanel.tsx'), 'w', encoding='utf-8') as f:
    f.write(TEACHER_PANEL_TSX)

print("Scaffold complete: AI Serializers, Database Synthesis Cache in Llama3, React Interface Updates")
