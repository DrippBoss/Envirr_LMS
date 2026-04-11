import { useState, useEffect } from 'react';
import { api, useAuth } from '../context/AuthContext';
import CourseBuilder from '../components/CourseBuilder';

export default function TeacherPanel() {
    const { user } = useAuth();
    const [mode, setMode] = useState<'ai' | 'manual' | 'course'>('manual');
    const [loading, setLoading] = useState(false);
    
    // AI Generator State
    const [board, setBoard] = useState('CBSE');
    const [grade, setGrade] = useState('10th');
    const [subject, setSubject] = useState('Mathematics');
    const [chapter, setChapter] = useState('');
    const [paperType] = useState('Standard Unit Test');
    const [marks, setMarks] = useState(80);
    const [difficulty, setDifficulty] = useState('medium');
    const [includeAnswers] = useState(true);
    const [customInstructions, setCustomInstructions] = useState('');

    // Manual Generator State
    const [libSubject, setLibSubject] = useState('Mathematics');
    const [libChapter, setLibChapter] = useState('Real Numbers');
    const [libType, setLibType] = useState('MCQ');
    const [libraryQs, setLibraryQs] = useState<any[]>([]);

    const [paperTitle, setPaperTitle] = useState('Custom Generated Exam');
    const [manualSections, setManualSections] = useState<any[]>([
        { type: 'MCQ', name: 'Section A - MCQs', questions: [] },
        { type: 'ASSERTION_REASON', name: 'Section A2 - Assertion Reason', questions: [] },
        { type: 'VERY_SHORT', name: 'Section B - Very Short', questions: [] },
        { type: 'SHORT', name: 'Section C - Short Answer', questions: [] },
        { type: 'LONG', name: 'Section D - Long Answer', questions: [] },
        { type: 'CASE', name: 'Section E - Case Study', questions: [] },
    ]);
    
    // Custom Question State
    const [cqText, setCqText] = useState('');
    const [cqMarks, setCqMarks] = useState(1);
    const [cqType, setCqType] = useState('MCQ');
    const [customQuestionsRaw, setCustomQuestionsRaw] = useState<any[]>([]);
    
    // Papers display
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
        const interval = setInterval(fetchPapers, 5000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Manual Library Questions
    const fetchLibrary = async () => {
        try {
            const res = await api.get(`/ai/questions/?subject=${encodeURIComponent(libSubject)}&chapter=${encodeURIComponent(libChapter)}&type=${encodeURIComponent(libType)}`);
            setLibraryQs(res.data);
        } catch (err) {
            console.error("Failed to fetch library", err);
        }
    };

    useEffect(() => {
        if (mode === 'manual') fetchLibrary();
    }, [libSubject, libChapter, libType, mode]);

    const addToBin = (q: any) => {
        setManualSections(prev => {
            const next = [...prev];
            const sec = next.find(s => s.type === q.question_type);
            if (sec && !sec.questions.some((existing: any) => existing.id === q.id)) {
                sec.questions.push(q);
            }
            return next;
        });
    };

    const removeFromBin = (type: string, id: any) => {
        setManualSections(prev => {
            const next = [...prev];
            const sec = next.find(s => s.type === type);
            if (sec) sec.questions = sec.questions.filter((q: any) => q.id !== id);
            return next;
        });
        if (typeof id === 'string' && id.startsWith('custom-')) {
            setCustomQuestionsRaw(prev => prev.filter(c => 'custom-' + c.tempId !== id));
        }
    };

    const moveItem = (type: string, index: number, dir: number) => {
        setManualSections(prev => {
            const next = [...prev];
            const sec = next.find(s => s.type === type);
            if (!sec) return next;
            
            const newIndex = index + dir;
            if (newIndex < 0 || newIndex >= sec.questions.length) return next;
            
            const temp = sec.questions[index];
            sec.questions[index] = sec.questions[newIndex];
            sec.questions[newIndex] = temp;
            return next;
        });
    };

    const handleAddCustom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cqText) return;
        const cId = Date.now();
        const cqObj = {
            tempId: cId,
            id: 'custom-' + cId,
            question_type: cqType,
            marks: cqMarks,
            difficulty: 'medium',
            question_text: cqText,
            answer_text: ''
        };
        
        setCustomQuestionsRaw(prev => [...prev, {
            type: cqType,
            marks: cqMarks,
            difficulty: 'medium',
            question_text: cqText,
            answer_text: '',
            section_type: cqType
        }]);
        
        addToBin(cqObj);
        setCqText('');
    };

    const handleCompileManual = async () => {
        setLoading(true);
        try {
            const payloadSections = manualSections
                .filter(s => s.questions.length > 0)
                .map(s => ({
                    type: s.type,
                    name: s.name,
                    questions: s.questions.map((q: any) => q.id)
                }));
            
            if (payloadSections.length === 0) {
                alert("Please add some questions to the Selection Bin first!");
                setLoading(false);
                return;
            }

            const payload = {
                title: paperTitle,
                board: board,
                grade: grade,
                subject: libSubject,
                sections: payloadSections,
                custom_questions: customQuestionsRaw
            };

            const res = await api.post('/ai/manual-paper/', payload);
            alert("Compilation Triggered: " + res.data.message);
            fetchPapers();
        } catch (err) {
            alert("Failed to trigger manual compilation.");
            console.error(err);
        }
        setLoading(false);
    };

    const handleAIGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { board, grade, subject, chapter, paper_type: paperType, max_marks: marks, difficulty, include_answers: includeAnswers, custom_instructions: customInstructions };
            const res = await api.post('/ai/generate-paper/', payload);
            alert("AI Synthesis Triggered: " + res.data.message);
            fetchPapers();
        } catch (err) {
            alert("Failed to trigger AI Synthesis.");
        }
        setLoading(false);
    };

    const totalMarks = manualSections.reduce((acc, sec) => acc + sec.questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0), 0);

    return (
        <div className="animate-fade-in grid-dashboard">
            <div className="glass-panel" style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginBottom: '-1rem' }}>
                <button className={`btn-primary ${mode==='ai'?'':'btn-outline'}`} onClick={()=>setMode('ai')}>AI Generator</button>
                <button className={`btn-primary ${mode==='manual'?'':'btn-outline'}`} onClick={()=>setMode('manual')}>Manual Picker</button>
                {user?.role === 'admin' && (
                    <button className={`btn-primary ${mode==='course'?'':'btn-outline'}`} onClick={()=>setMode('course')}>Course Builder (Admin)</button>
                )}
            </div>

            {mode === 'course' ? (
                <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                    <h2>Course Framework Builder</h2>
                    <CourseBuilder />
                </div>
            ) : mode === 'manual' ? (
                <>
                    <div className="glass-panel" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
                        <h2>Question Library</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input className="input-glass" placeholder="Subject" value={libSubject} onChange={e=>setLibSubject(e.target.value)} />
                            <input className="input-glass" placeholder="Chapter Search" value={libChapter} onChange={e=>setLibChapter(e.target.value)} />
                            <select className="input-glass" value={libType} onChange={e=>setLibType(e.target.value)}>
                                <option value="MCQ">MCQ</option>
                                <option value="ASSERTION_REASON">Assertion & Reason</option>
                                <option value="VERY_SHORT">Very Short</option>
                                <option value="SHORT">Short</option>
                                <option value="LONG">Long</option>
                                <option value="CASE">Case Study</option>
                            </select>
                        </div>
                        <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                            {libraryQs.length === 0 ? <p style={{color:'var(--text-muted)'}}>No questions found for this filter.</p> : libraryQs.map(q => (
                                <div key={q.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ flex: 1, marginRight: '1rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                                            {q.difficulty.toUpperCase()} • {q.marks} MARKS • {q.chapter}
                                        </div>
                                        <div style={{ fontSize: '0.9rem' }}>{q.question_text.length > 150 ? q.question_text.substring(0,150) + '...' : q.question_text}</div>
                                    </div>
                                    <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', height: 'fit-content' }} onClick={()=>addToBin(q)}>Add +</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Selection Bin</h2>
                            <h3 style={{ color: 'var(--primary)' }}>Total Marks: {totalMarks}</h3>
                        </div>
                        <input className="input-glass" placeholder="Exam Title" value={paperTitle} onChange={e=>setPaperTitle(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }}/>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {totalMarks === 0 && <p style={{color:'var(--text-muted)'}}>Bin is empty. Add questions from the Library!</p>}
                            {manualSections.filter(s => s.questions.length > 0).map(sec => (
                                <div key={sec.type} style={{ marginBottom: '1rem' }}>
                                    <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', margin: '0.5rem 0', color: 'var(--primary)' }}>{sec.name}</h4>
                                    {sec.questions.map((q: any, idx: number) => (
                                        <div key={q.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.3rem', display: 'flex', alignItems: 'center' }}>
                                            <div style={{ marginRight: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                                <button onClick={()=>moveItem(sec.type, idx, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0.2rem' }}>▲</button>
                                                <button onClick={()=>moveItem(sec.type, idx, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0.2rem' }}>▼</button>
                                            </div>
                                            <div style={{ flex: 1, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                ({q.marks}m) {q.question_text}
                                            </div>
                                            <button onClick={()=>removeFromBin(sec.type, q.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '0.5rem' }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0' }}>Add Custom Question</h4>
                            <form onSubmit={handleAddCustom} style={{ display: 'grid', gridTemplateColumns: 'min-content 60px 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                                <select className="input-glass" style={{ padding: '0.5rem', fontSize: '0.8rem' }} value={cqType} onChange={e=>setCqType(e.target.value)}>
                                    <option value="MCQ">MCQ</option>
                                    <option value="ASSERTION_REASON">A&R</option>
                                    <option value="VERY_SHORT">V.Short</option>
                                    <option value="SHORT">Short</option>
                                    <option value="LONG">Long</option>
                                    <option value="CASE">Case</option>
                                </select>
                                <input className="input-glass" type="number" min="1" max="10" placeholder="Mk" style={{ padding: '0.5rem', fontSize: '0.8rem' }} value={cqMarks} onChange={e=>setCqMarks(Number(e.target.value))} />
                                <input className="input-glass" placeholder="Type prompt here..." style={{ padding: '0.5rem', fontSize: '0.8rem' }} value={cqText} onChange={e=>setCqText(e.target.value)} required />
                                <button type="submit" className="btn-primary" style={{ padding: '0.5rem' }}>+</button>
                            </form>
                        </div>

                        <button className="btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }} disabled={loading} onClick={handleCompileManual}>
                            {loading ? 'Compiling LaTeX PDF...' : 'Compile Custom Paper 📝'}
                        </button>
                    </div>
                </>
            ) : (
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
            )}

            <div className="glass-panel" style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>
                <h2>Generated History</h2>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    {papers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No papers generated yet.</p>
                    ) : (
                        papers.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>{p.title}</h3>
                                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {new Date(p.created_at).toLocaleDateString()} • {p.config.board} • {p.config.grade} • {p.total_marks || p.config.max_marks} Marks
                                    </p>
                                </div>
                                {p.pdf_url ? (
                                    <a href={`http://localhost:8000${p.pdf_url}`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
                                        Download PDF
                                    </a>
                                ) : (
                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Safely Compiling...</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
