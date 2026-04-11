import { useState } from 'react';

interface QuestionCardProps {
    question: any;
    onSubmit: (answer: string) => Promise<boolean>; // Returns true if correct
    result?: { is_correct: boolean, correct_answer: string, hint: string, explanation: string } | null;
}

export default function QuestionCard({ question, onSubmit, result }: QuestionCardProps) {
    const [selected, setSelected] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle');

    const handleSubmit = async () => {
        if (!selected) return;
        setStatus('checking');
        const correct = await onSubmit(selected);
        setStatus(correct ? 'correct' : 'wrong');
        // Reset when moving to next question (handled by parent changing question prop)
    };

    // Keep it robust to render correct answer if wrong
    const disabled = status !== 'idle';

    return (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                {question.question_text}
            </h3>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {question.question_type === 'MCQ' && Object.entries(question.options_json).map(([key, val]) => (
                    <button 
                        key={key}
                        onClick={() => setSelected(val as string)}
                        disabled={disabled}
                        style={{
                            padding: '15px 20px',
                            background: selected === val ? 'rgba(58, 130, 246, 0.4)' : 'rgba(255,255,255,0.05)',
                            border: `2px solid ${selected === val ? '#3A82F6' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '12px',
                            color: '#fff',
                            textAlign: 'left',
                            cursor: disabled ? 'default' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {val as string}
                    </button>
                ))}

                {(question.question_type === 'FILL_BLANK' || question.question_type === 'MATCH') && (
                    <input 
                        className="input-glass" 
                        value={selected} 
                        onChange={e => setSelected(e.target.value)} 
                        disabled={disabled}
                        placeholder="Type your answer here..."
                        style={{ padding: '15px' }}
                    />
                )}

                {question.question_type === 'TRUE_FALSE' && ['True', 'False'].map(val => (
                    <button 
                        key={val}
                        onClick={() => setSelected(val)}
                        disabled={disabled}
                        style={{
                            padding: '20px',
                            background: selected === val ? 'rgba(58, 130, 246, 0.4)' : 'rgba(255,255,255,0.05)',
                            border: `2px solid ${selected === val ? '#3A82F6' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '1.2rem',
                            cursor: disabled ? 'default' : 'pointer'
                        }}
                    >
                        {val}
                    </button>
                ))}
            </div>

            <div style={{ marginTop: '2rem', minHeight: '80px' }}>
                {status === 'idle' && (
                    <button className="btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={!selected}>
                        Check Answer
                    </button>
                )}
                
                {status === 'checking' && (
                     <button className="btn-primary" style={{ width: '100%', opacity: 0.7 }} disabled>
                        Checking...
                    </button>
                )}

                {status === 'correct' && result && (
                    <div className="animate-fade-in" style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '12px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>✅</span>
                            <strong>Correct!</strong> {result.explanation && <span style={{display: 'block', color: '#e2e8f0', fontSize: '0.9rem', marginTop: '5px'}}>{result.explanation}</span>}
                        </div>
                    </div>
                )}

                {status === 'wrong' && result && (
                    <div className="animate-fade-in" style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '12px', color: '#ef4444' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>❌</span>
                            <strong>Incorrect.</strong>
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '5px' }}>
                            Correct Answer: <strong>{result.correct_answer}</strong>
                        </div>
                        {result.hint && <div style={{ color: '#fcd34d', fontSize: '0.8rem' }}>💡 Hint: {result.hint}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
