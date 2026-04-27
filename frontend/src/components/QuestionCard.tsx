import { useState, useMemo } from 'react';
import MathText from './MathText';

interface QuestionCardProps {
    question: any;
    onSubmit: (answer: string) => Promise<boolean>; // Returns true if correct
    result?: { is_correct: boolean, correct_answer: string, hint: string, explanation: string } | null;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuestionCard({ question, onSubmit, result }: QuestionCardProps) {
    const [selected, setSelected] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle');
    const [selectedChips, setSelectedChips] = useState<number[]>([]);

    const rawChips = Array.isArray(question.options_json) ? question.options_json : (question.options_json?.chips || []);
    
    // Memoize the shuffled indices of the chips so they stay constant across re-renders for the same question
    const shuffledBankIndices = useMemo(() => {
        const arr = rawChips.map((_: any, i: number) => i);
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }, [question.id]);

    const handleSubmit = async () => {
        if (question.question_type === 'REARRANGE' ? selectedChips.length === 0 : !selected) return;
        setStatus('checking');
        // For MCQ / ASSERTION_REASON the backend stores the option label (A/B/C/D).
        // selected holds the option text, so look up the matching key before submitting.
        let answer = selected;
        if (question.question_type === 'MCQ' || question.question_type === 'ASSERTION_REASON') {
            const entry = Object.entries(question.options_json as Record<string, string>)
                .find(([, v]) => v === selected);
            if (entry) answer = entry[0];
        } else if (question.question_type === 'REARRANGE') {
            answer = selectedChips.map(idx => rawChips[idx]).join("");
        }
        const correct = await onSubmit(answer);
        setStatus(correct ? 'correct' : 'wrong');
    };

    const disabled = status !== 'idle';

    // Determine border/bg classes for each option
    const getOptionClasses = (val: string) => {
        if (status === 'correct' && selected === val) {
            return 'bg-secondary/5 border-2 border-secondary-container shadow-[0_0_20px_rgba(39,166,64,0.15)]';
        }
        if (status === 'wrong' && selected === val) {
            return 'bg-error/5 border-2 border-error-container shadow-[0_0_20px_rgba(147,0,10,0.15)]';
        }
        if (status === 'wrong' && result && result.correct_answer === val) {
            return 'bg-secondary/5 border-2 border-secondary-container';
        }
        if (selected === val) {
            return 'bg-primary/5 border-2 border-primary-container shadow-[0_0_20px_rgba(88,166,255,0.15)]';
        }
        return 'bg-surface-container-low border-2 border-outline-variant/20 hover:border-primary-fixed-dim/40';
    };

    const getLetterClasses = (val: string) => {
        if (status === 'correct' && selected === val) {
            return 'bg-secondary-container text-on-secondary-container';
        }
        if (status === 'wrong' && selected === val) {
            return 'bg-error-container text-on-error-container';
        }
        if (selected === val) {
            return 'bg-primary-container text-on-primary-container';
        }
        return 'bg-surface-container-highest text-outline group-hover:bg-primary-fixed-dim group-hover:text-on-primary-fixed';
    };

    return (
        <div className="w-full space-y-8">
            {/* Question Canvas — Bento card with decorative background icon */}
            <div className="bg-surface-container-lowest p-10 rounded-[2rem] border border-outline-variant/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <span className="material-symbols-outlined" style={{ fontSize: '9rem' }}>functions</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold font-headline text-on-surface leading-tight relative z-10">
                    <MathText text={question.question_text} />
                </h2>
            </div>

            {/* MCQ / Assertion-Reason — 2-column Bento Grid */}
            {(question.question_type === 'MCQ' || question.question_type === 'ASSERTION_REASON') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(question.options_json).map(([key, val], i) => (
                        <button
                            key={key}
                            onClick={() => !disabled && setSelected(val as string)}
                            disabled={disabled}
                            className={`group flex items-center p-6 rounded-2xl transition-all duration-200 text-left ${getOptionClasses(val as string)}`}
                        >
                            <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-bold mr-4 transition-colors ${getLetterClasses(val as string)}`}>
                                {OPTION_LETTERS[i] || key}
                            </div>
                            <span className={`text-lg font-medium ${selected === val ? 'font-bold text-primary-container' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                                <MathText text={val as string} />
                            </span>
                            {/* Check icon for selected */}
                            {selected === val && status === 'idle' && (
                                <span className="material-symbols-outlined ml-auto text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            )}
                            {selected === val && status === 'correct' && (
                                <span className="material-symbols-outlined ml-auto text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            )}
                            {selected === val && status === 'wrong' && (
                                <span className="material-symbols-outlined ml-auto text-error" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* True/False — 2 column */}
            {question.question_type === 'TRUE_FALSE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['True', 'False'].map((val, i) => (
                        <button
                            key={val}
                            onClick={() => !disabled && setSelected(val)}
                            disabled={disabled}
                            className={`group flex items-center p-6 rounded-2xl transition-all duration-200 text-left ${getOptionClasses(val)}`}
                        >
                            <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-bold mr-4 transition-colors ${getLetterClasses(val)}`}>
                                {OPTION_LETTERS[i]}
                            </div>
                            <span className={`text-xl font-medium ${selected === val ? 'font-bold text-primary-container' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                                {val}
                            </span>
                            {selected === val && status === 'idle' && (
                                <span className="material-symbols-outlined ml-auto text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Fill in the Blank / Match / Short / Long Answer — text input */}
            {(question.question_type === 'FILL_BLANK' || question.question_type === 'MATCH' ||
              question.question_type === 'VERY_SHORT' || question.question_type === 'SHORT' ||
              question.question_type === 'LONG') && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
                    {(question.question_type === 'LONG' || question.question_type === 'SHORT') ? (
                        <textarea
                            className="w-full bg-transparent border-none text-lg text-on-surface placeholder:text-outline/40 py-4 px-2 outline-none font-body resize-none"
                            rows={question.question_type === 'LONG' ? 5 : 3}
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                            disabled={disabled}
                            placeholder="Write your answer here..."
                        />
                    ) : (
                        <input
                            className="w-full bg-transparent border-none border-b-2 border-b-transparent focus:border-b-primary text-lg text-on-surface placeholder:text-outline/40 py-4 px-2 outline-none font-body transition-colors"
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                            disabled={disabled}
                            placeholder="Type your answer here..."
                            onKeyDown={e => e.key === 'Enter' && !disabled && handleSubmit()}
                        />
                    )}
                </div>
            )}

            {/* Rearrange Picker UI */}
            {question.question_type === 'REARRANGE' && (
                <div className="space-y-6">
                    {/* Selected Box Line */}
                    <div className="min-h-[80px] p-4 bg-surface-container-lowest rounded-2xl border-b-4 border-outline-variant/20 flex flex-wrap gap-2 items-center">
                        {selectedChips.map((chipIdx, idx) => (
                            <button
                                key={`sel-${idx}`}
                                onClick={() => {
                                    if (disabled) return;
                                    setSelectedChips(prev => prev.filter((_, i) => i !== idx));
                                }}
                                disabled={disabled}
                                className={`px-4 py-2 rounded-xl border-b-4 font-bold text-lg transition-transform hover:-translate-y-1 ${
                                    status === 'correct' ? 'bg-secondary text-on-secondary border-secondary-container' : 
                                    status === 'wrong' ? 'bg-error text-on-error border-error-container' :
                                    'bg-primary-container text-on-primary-container border-primary'
                                }`}
                            >
                                <MathText text={rawChips[chipIdx] || ''} />
                            </button>
                        ))}
                    </div>
                    
                    <div className="h-px w-full bg-outline-variant/10"></div>
                    
                    {/* Bank of chips */}
                    <div className="flex flex-wrap gap-3 p-4 justify-center">
                        {shuffledBankIndices.map((originalIdx: number) => {
                            const text = rawChips[originalIdx];
                            const isSelected = selectedChips.includes(originalIdx);
                            if (isSelected) {
                                return (
                                    <div key={`bank-${originalIdx}`} className="px-4 py-2 rounded-xl border-b-4 border-transparent bg-surface-container-lowest/50 text-transparent font-bold text-lg select-none px-4 box-content border-outline-variant/5">
                                        <MathText text={text} />
                                    </div>
                                );
                            }
                            return (
                                <button
                                    key={`bank-${originalIdx}`}
                                    onClick={() => {
                                        if (disabled) return;
                                        setSelectedChips(prev => [...prev, originalIdx]);
                                    }}
                                    disabled={disabled}
                                    className="px-4 py-2 rounded-xl border-b-4 bg-surface-container-low border-outline-variant/20 font-bold text-lg text-on-surface hover:bg-surface-container transition-all hover:-translate-y-1 active:translate-y-1 active:border-b-0"
                                >
                                    <MathText text={text} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Submit Button — only visible in idle state, styled like stitch CHECK ANSWER */}
            {status === 'idle' && (
                <div className="flex justify-end">
                    <button
                        className="px-8 py-4 md:w-64 rounded-xl bg-gradient-to-br from-secondary-container to-secondary text-on-secondary-fixed font-black font-headline tracking-tight text-lg shadow-lg hover:shadow-secondary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handleSubmit}
                        disabled={(question.question_type === 'REARRANGE' ? selectedChips.length === 0 : !selected)}
                    >
                        CHECK ANSWER
                    </button>
                </div>
            )}

            {status === 'checking' && (
                <div className="flex justify-end">
                    <button
                        className="px-8 py-4 md:w-64 rounded-xl bg-gradient-to-br from-secondary-container to-secondary text-on-secondary-fixed font-black font-headline tracking-tight text-lg opacity-70"
                        disabled
                    >
                        CHECKING...
                    </button>
                </div>
            )}
        </div>
    );
}
