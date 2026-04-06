import { useState, useEffect } from 'react';
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

    const [papers, setPapers] = useState<any[]>([]);

    const fetchPapers = async () => {
        try {
            const res = await api.get('/ai/generate-paper/');
            setPapers(res.data);
        } catch (err) {
            console.error("Failed to fetch papers", err);
        }
    };

    useEffect(() => {
        fetchPapers();
        const interval = setInterval(fetchPapers, 5000); // Auto-refresh for async updates
        return () => clearInterval(interval);
    }, []);

    const handleAIGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { board, grade, subject, chapter, paper_type: paperType, max_marks: marks, difficulty, include_answers: includeAnswers, custom_instructions: customInstructions };
            const res = await api.post('/ai/generate-paper/', payload);
            alert("AI Bank DB Synthesis Triggered: " + res.data.message);
            fetchPapers();
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

            <div className="glass-panel" style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>
                <h2>My Generated Papers</h2>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    {papers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No papers generated yet.</p>
                    ) : (
                        papers.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>{p.title}</h3>
                                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {new Date(p.created_at).toLocaleDateString()} • {p.config.board} • {p.config.grade} • {p.config.max_marks} Marks
                                    </p>
                                </div>
                                {p.pdf_url ? (
                                    <a href={`http://localhost:8000${p.pdf_url}`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
                                        Download PDF
                                    </a>
                                ) : (
                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Synthesizing...</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
