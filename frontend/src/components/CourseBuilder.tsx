import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import NodeReorderList, { type NodeItem } from './NodeReorderList';

export default function CourseBuilder() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Step 1: Course Identity
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('10');
    const [board, setBoard] = useState('CBSE');
    const [description, setDescription] = useState('');

    // Step 2 & 3: Curriculum Mapping & Content Populating
    const [chapters, setChapters] = useState([{ tempId: Date.now(), title: 'Chapter 1', nodes: [] as NodeItem[] }]);
    const [activeChapter, setActiveChapter] = useState(0);

    // Templates
    const [templates, setTemplates] = useState<any[]>([]);
    
    // Final Output
    const [resultMsg, setResultMsg] = useState('');

    useEffect(() => {
        // Fetch templates
        const fetchTemplates = async () => {
            try {
                const res = await api.get('/teacher/templates/');
                setTemplates(res.data);
            } catch (e) {
                console.error("Failed to load templates", e);
            }
        };
        fetchTemplates();
    }, []);

    const addChapter = () => {
        setChapters([...chapters, { tempId: Date.now(), title: `Chapter ${chapters.length + 1}`, nodes: [] }]);
        setActiveChapter(chapters.length);
    };

    const updateChapterTitle = (index: number, newTitle: string) => {
        const updated = [...chapters];
        updated[index].title = newTitle;
        setChapters(updated);
    };

    const addNodeToChapter = (chapIndex: number, template: any) => {
        const updated = [...chapters];
        const newOrder = updated[chapIndex].nodes.length + 1;
        updated[chapIndex].nodes.push({
            id: Date.now(),
            title: `New ${template.name}`,
            type: template.template_type,
            order: newOrder,
            template_id: template.id
        });
        setChapters(updated);
    };

    const handleReorderNodes = (chapIndex: number, newNodes: NodeItem[]) => {
        const updated = [...chapters];
        updated[chapIndex].nodes = newNodes;
        setChapters(updated);
    };

    const handlePublish = async () => {
        setLoading(true);
        try {
            const payload = {
                title,
                subject,
                class_grade: grade,
                board,
                description,
                chapters: chapters.map(ch => ({
                    title: ch.title,
                    nodes: ch.nodes.map(n => ({
                        title: n.title,
                        type: n.type,
                        template_id: n.template_id
                    }))
                }))
            };
            const res = await api.post('/teacher/course/create/', payload);
            setResultMsg('Successfully created course framework! ID: ' + res.data.unit_id);
            setStep(4);
        } catch (e: any) {
            alert(e.response?.data?.error || "Failed to create course. Ensure you have admin access.");
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            
            {/* Stepper Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                {['Course Identity', 'Curriculum Map', 'Content Setup', 'Publish'].map((s, i) => (
                    <div key={i} style={{ 
                        color: step >= i + 1 ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: step === i + 1 ? 'bold' : 'normal',
                        opacity: step >= i + 1 ? 1 : 0.5
                    }}>
                        {i + 1}. {s}
                    </div>
                ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Course Identity</h3>
                    <input className="input-glass" placeholder="Course Title (e.g. Science Class 10)" value={title} onChange={e => setTitle(e.target.value)} />
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input className="input-glass" style={{ flex: 1 }} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
                        <input className="input-glass" style={{ width: '100px' }} placeholder="Grade" value={grade} onChange={e => setGrade(e.target.value)} />
                        <input className="input-glass" style={{ width: '100px' }} placeholder="Board" value={board} onChange={e => setBoard(e.target.value)} />
                    </div>
                    <textarea className="input-glass" rows={3} placeholder="Course Description" value={description} onChange={e => setDescription(e.target.value)} />
                    <button className="btn-primary" style={{ alignSelf: 'flex-end', marginTop: '1rem' }} onClick={() => setStep(2)} disabled={!title || !subject}>Next: Curriculum Map ➔</button>
                </div>
            )}

            {/* Step 2 & 3 Combined */}
            {step === 2 && (
                <div style={{ display: 'flex', gap: '2rem' }}>
                    
                    {/* Left Sidebar: Chapters */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Chapters</h3>
                        {chapters.map((ch, i) => (
                            <div 
                                key={ch.tempId} 
                                onClick={() => setActiveChapter(i)}
                                style={{ 
                                    padding: '1rem', 
                                    background: activeChapter === i ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: activeChapter === i ? '1px solid var(--primary)' : '1px solid transparent',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <input 
                                    className="input-glass" 
                                    style={{ width: '100%', background: 'transparent', border: 'none', padding: 0 }} 
                                    value={ch.title} 
                                    onChange={e => updateChapterTitle(i, e.target.value)}
                                    autoFocus={activeChapter === i}
                                />
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    {ch.nodes.length} lesson(s)
                                </div>
                            </div>
                        ))}
                        <button className="btn-outline" onClick={addChapter}>+ Add Chapter</button>
                    </div>

                    {/* Right Area: Nodes in Active Chapter */}
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                        <h3 style={{ margin: 0 }}>Content for: {chapters[activeChapter]?.title}</h3>
                        
                        {/* Template Bar */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {templates.length > 0 ? templates.map(t => (
                                <button key={t.id} className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--primary)', color: 'var(--text)' }} onClick={() => addNodeToChapter(activeChapter, t)}>
                                    + Add {t.name}
                                </button>
                            )) : (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No templates found. (Hardcode fallback below)</div>
                            )}
                            
                            <button className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.8rem' }} onClick={() => addNodeToChapter(activeChapter, {name: 'Video Lesson', template_type: 'LESSON'})}>
                                + Blank Video
                            </button>
                            <button className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.8rem', background: '#e11d48' }} onClick={() => addNodeToChapter(activeChapter, {name: 'Test Node', template_type: 'CHAPTER_TEST'})}>
                                + Blank Test
                            </button>
                        </div>

                        {/* Reorder List */}
                        <NodeReorderList 
                            nodes={chapters[activeChapter]?.nodes || []} 
                            onReorder={(newNodes) => handleReorderNodes(activeChapter, newNodes)}
                        />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '2rem' }}>
                            <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
                            <button className="btn-primary" onClick={() => setStep(3)}>Next: Final Publish ➔</button>
                        </div>
                    </div>

                </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '2rem' }}>
                    <h2 style={{ color: 'var(--primary)' }}>Ready to Publish</h2>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                        You are about to create <strong>{chapters.length}</strong> chapters with a total of <strong>{chapters.reduce((acc, c) => acc + c.nodes.length, 0)}</strong> learning nodes.
                        <br/><br/>
                        After creation, these schemas will be registered in the database. Video files and questions can be uploaded via the Admin portal or bulk upload scripts later.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn-outline" onClick={() => setStep(2)}>Review Curriculum</button>
                        <button className="btn-primary" style={{ fontSize: '1.2rem', padding: '1rem 2rem' }} disabled={loading} onClick={handlePublish}>
                            {loading ? 'Creating...' : 'Launch Course 🚀'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '4rem' }}>✅</div>
                    <h2>Success!</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{resultMsg}</p>
                    <button className="btn-primary" onClick={() => window.location.reload()}>Build Another</button>
                </div>
            )}
        </div>
    );
}
