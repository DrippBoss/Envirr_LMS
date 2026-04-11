import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import LivesBar from '../components/LivesBar';
import QuestionCard from '../components/QuestionCard';
import FlashcardModal, { type Flashcard } from '../components/FlashcardModal';

type NodeState = 'loading' | 'video' | 'practice' | 'failed' | 'complete';

export default function NodePage() {
    const { nodeId } = useParams();
    const navigate = useNavigate();
    const [state, setState] = useState<NodeState>('loading');
    
    const [nodeData] = useState<any>(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [questions, setQuestions] = useState<any[]>([]);
    const [qIndex, setQIndex] = useState(0);
    const [lives, setLives] = useState(3);
    const [maxLives, setMaxLives] = useState(3);
    
    // Result object when answering
    const [result, setResult] = useState<any>(null);
    
    // Post completion revision cards
    const [revisionCards, setRevisionCards] = useState<Flashcard[]>([]);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [stars, setStars] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);

    useEffect(() => {
        loadNode();
    }, [nodeId]);

    const loadNode = async () => {
        try {
            const res = await api.post(`student/nodes/${nodeId}/start/`);
            setVideoUrl(res.data.video_url || '');
            
            if (res.data.node_type === 'CHAPTER_TEST') {
                await loadTestQuestions();
            } else {
                // EXPLICIT REQUIREMENT: Always start at video state for lessons
                // so students understand the concept first.
                // We only jump to practice if they are already COMPLETED and just want to review?
                // No, user said "when i click a node a video should appear first".
                if (res.data.step === 'COMPLETED') {
                    // Even if completed, let's show the video first for review
                    setState('video');
                } else {
                    setState('video');
                }
            }
        } catch (e) {
            console.error(e);
            navigate('/');
        }
    };

    const loadPracticeQuestions = async () => {
        const res = await api.get(`student/nodes/${nodeId}/practice/`);
        setQuestions(res.data);
        setQIndex(0);
        setResult(null);
        setState('practice');
    };

    const loadTestQuestions = async () => {
        const res = await api.get(`student/nodes/${nodeId}/practice/`);
        setQuestions(res.data);
        setQIndex(0);
        setResult(null);
        setState('practice');
        // Chapter tests do not have lives!
        setLives(99); 
    };

    const handleVideoComplete = async () => {
        const res = await api.post(`student/nodes/${nodeId}/video-complete/`);
        setLives(res.data.lives);
        setMaxLives(res.data.lives);
        await loadPracticeQuestions();
    };

    const handleAnswerSubmit = async (answer: string) => {
        if (!nodeData && lives !== 99) {
            // First time submit, we need max lives, but we get it from answer response anyway
        }

        const res = await api.post(`student/nodes/${nodeId}/practice/answer/`, {
            question_id: questions[qIndex].id,
            given_answer: answer
        });

        setResult({
            is_correct: res.data.is_correct,
            correct_answer: res.data.correct_answer,
            explanation: res.data.explanation,
            hint: res.data.hint
        });
        
        if (lives !== 99) { // If not test
            setLives(res.data.lives_remaining);
        }

        return res.data.is_correct;
    };

    const handleNextQuestion = async () => {
        if (lives !== 99 && lives <= 0) { // Failed
            setState('failed');
            return;
        }

        if (qIndex < questions.length - 1) {
            setQIndex(i => i + 1);
            setResult(null);
        } else {
            // Completed!
            const comp = await api.post(`student/nodes/${nodeId}/practice/complete/`);
            
            if (comp.data.status === 'failed') {
                setState('failed');
                return;
            }
            
            setStars(comp.data.stars || 0);
            setXpEarned(comp.data.xp || 0);
            
            // Fetch revision cards
            const revRes = await api.get(`student/nodes/${nodeId}/revision-cards/`);
            setRevisionCards(revRes.data);
            
            setState('complete');
        }
    };

    const handleRetry = async () => {
        await api.post(`student/nodes/${nodeId}/practice/retry/`);
        // Instead of loadPracticeQuestions, we go back to the videohub
        setState('video');
    };

    const finishNode = () => {
        navigate(-1); // Back to map
    };

    if (state === 'loading') return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    if (state === 'video') {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>
                <button onClick={() => navigate(-1)} style={{ alignSelf: 'flex-start', background: 'none', color: '#3A82F6', marginBottom: '1rem' }}>← Back to Map</button>
                <h2 style={{ marginBottom: '2rem' }}>Watch this lesson</h2>
                
                <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem' }}>
                    {videoUrl ? (
                        videoUrl.includes('youtube') ? (
                            <iframe width="100%" height="100%" src={videoUrl.replace('watch?v=', 'embed/')} frameBorder="0" allowFullScreen></iframe>
                        ) : (
                            <video src={videoUrl} controls style={{ width: '100%', height: '100%' }}></video>
                        )
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'rgba(56, 189, 248, 0.15)', filter: 'blur(60px)', borderRadius: '50%' }}></div>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: '#38bdf8', opacity: 0.8, zIndex: 1 }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <polygon points="10 8 16 12 10 16 10 8"></polygon>
                            </svg>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '1.25rem', zIndex: 1, fontWeight: 600 }}>Video Lesson Enhancements Underway</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '80%', textAlign: 'center', zIndex: 1, lineHeight: '1.5' }}>Our instructors are currently recording a high-quality video for this topic. In the meantime, you can skip straight to the practice questions!</p>
                        </div>
                    )}
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', marginTop: '1rem' }}>
                    <button className="btn-premium-large" onClick={handleVideoComplete} style={{ width: '100%', maxWidth: '400px', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                        {videoUrl ? "I've watched this — Start Challenge →" : "Start Practice Challenge →"}
                    </button>
                    
                    <button 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.15)', 
                            color: '#ffffff', 
                            border: '2px solid rgba(255, 255, 255, 0.3)', 
                            cursor: 'pointer', 
                            fontSize: '1rem', 
                            padding: '14px 32px',
                            borderRadius: '12px',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            width: '100%',
                            maxWidth: '400px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}
                        onClick={handleVideoComplete}
                        onMouseOver={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                        </svg>
                        Skip to Practice Quiz
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'practice') {
        const q = questions[qIndex];
        const isTest = lives === 99;
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                        Question {qIndex + 1} of {questions.length}
                    </div>
                    {!isTest && <LivesBar lives={lives} maxLives={maxLives} />}
                </div>

                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '3rem' }}>
                    <div style={{ width: `${(qIndex / questions.length) * 100}%`, height: '100%', background: '#10b981', borderRadius: '4px', transition: 'width 0.3s' }}></div>
                </div>

                {/* Key is needed to completely unmount and remount QuestionCard when qIndex changes, resetting its state */}
                <QuestionCard key={qIndex} question={q} onSubmit={handleAnswerSubmit} result={result} />

                {result && (
                    <button className="btn-primary animate-fade-in" onClick={handleNextQuestion} style={{ marginTop: '2rem', minWidth: '200px' }}>
                        {qIndex === questions.length - 1 ? 'Finish' : 'Next Question'} →
                    </button>
                )}
            </div>
        );
    }

    if (state === 'failed') {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💔</div>
                <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>{lives === 99 ? 'Test Failed!' : 'Out of lives!'}</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{lives === 99 ? 'You did not meet the required passing score. Review the chapter and try again.' : 'Review the video and try again to master this concept.'}</p>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={handleRetry}>Try Again</button>
                    <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', background: 'transparent', color: '#e2e8f0' }}>Back to Map</button>
                </div>
            </div>
        );
    }

    if (state === 'complete') {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                <div style={{ fontSize: '3rem', letterSpacing: '10px', marginBottom: '1rem' }}>
                    {'⭐'.repeat(stars)}{'🌑'.repeat(3-stars)}
                </div>
                <h1 style={{ color: '#10b981', marginBottom: '1rem', fontSize: '2.5rem' }}>Node Complete!</h1>
                <div style={{ fontSize: '1.2rem', color: '#f59e0b', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '2rem' }}>💎</span> +{xpEarned} XP
                </div>
                
                {revisionCards.length > 0 && !showRevisionModal ? (
                    <button className="btn-primary" onClick={() => setShowRevisionModal(true)}>
                        Before you go — Quick Revision →
                    </button>
                ) : (
                    <button className="btn-primary" onClick={finishNode}>
                        Continue to Map →
                    </button>
                )}

                {showRevisionModal && (
                    <FlashcardModal 
                        cards={revisionCards} 
                        onComplete={() => { setShowRevisionModal(false); finishNode(); }} 
                        finalButtonText="Back to Map"
                    />
                )}
            </div>
        );
    }

    return null;
}
