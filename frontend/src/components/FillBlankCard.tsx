import { useState, useRef, useEffect } from 'react';
import ResultBottomSheet from './ResultBottomSheet';

interface FillBlankCardProps {
    question: any;
    onSubmit: (answer: string) => Promise<boolean>;
    result?: { is_correct: boolean; correct_answer: string; hint: string; explanation: string } | null;
    onSkip?: () => void;
    onNext?: () => void;
    qIndex: number;
    total: number;
}

export default function FillBlankCard({ question, onSubmit, result, onSkip, onNext, qIndex, total }: FillBlankCardProps) {
    const [answer, setAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);
    const progress = Math.round(((qIndex + 1) / total) * 100);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = async () => {
        if (!answer.trim() || status === 'checking') return;
        setStatus('checking');
        const correct = await onSubmit(answer.trim());
        setStatus(correct ? 'correct' : 'wrong');
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
    };

    return (
        <div className="fixed inset-0 z-[60] bg-background selection:bg-primary-container/30 flex flex-col">

            {/* ── Top bar ── */}
            <header className="fixed top-0 left-0 w-full z-[65] flex items-center justify-between px-5 h-14 bg-background border-b border-outline-variant/10 backdrop-blur-xl">
                <div className="flex items-center gap-3 w-52 shrink-0">
                    <button
                        className="material-symbols-outlined text-outline hover:text-on-surface transition-colors"
                        onClick={onSkip}
                    >
                        close
                    </button>
                    <div className="leading-none">
                        <span className="font-black text-base text-white font-headline">Envirr</span>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-outline font-bold">Fill in the Blank</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    <span className="px-4 py-1.5 text-sm font-bold text-primary border-b-2 border-primary pb-0.5">Mathematics</span>
                </div>

                <div className="flex items-center gap-2 w-52 justify-end shrink-0">
                    <span className="text-xs font-bold text-outline font-label">{qIndex + 1} / {total}</span>
                    <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10">
                        <span className="material-symbols-outlined text-outline text-sm">edit</span>
                        <span className="text-sm font-bold text-on-surface font-headline">Practice</span>
                    </div>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="flex-1 pt-14 pb-24 overflow-y-auto">
                <div className="flex flex-col justify-center max-w-3xl mx-auto w-full px-6 py-8 min-h-full">

                    {/* Question # row */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-center">
                                <span className="text-base font-black text-on-surface font-headline">{qIndex + 1}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>text_fields</span>
                                <span className="text-xs font-black uppercase tracking-wider">Fill Blank</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/10">
                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                            <span className="text-xs font-bold text-on-surface-variant">+10 XP</span>
                        </div>
                    </div>

                    {/* Question canvas */}
                    <div className="bg-surface-container-lowest p-10 rounded-[2rem] border border-outline-variant/10 shadow-2xl relative overflow-hidden mb-8">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <span className="material-symbols-outlined" style={{ fontSize: '9rem' }}>text_fields</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold font-headline text-on-surface leading-tight relative z-10">
                            {question.question_text.split('___').map((part: string, i: number, arr: string[]) => (
                                <span key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                        <span className="inline-block min-w-[80px] border-b-2 border-primary/50 mx-2 text-center text-primary/40 italic">
                                            ___
                                        </span>
                                    )}
                                </span>
                            ))}
                        </h2>
                    </div>

                    {/* Input */}
                    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 mb-6">
                        <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-3 font-label">Your Answer</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            onKeyDown={handleKey}
                            disabled={status !== 'idle'}
                            placeholder="Type your answer here..."
                            className="w-full bg-transparent border-none border-b-2 border-b-transparent focus:border-b-primary text-lg text-on-surface placeholder:text-outline/40 py-4 px-2 outline-none font-body transition-colors disabled:opacity-60"
                        />
                        {question.options_json?.tip && status === 'idle' && (
                            <p className="text-xs text-outline italic mt-3">Tip: {question.options_json.tip}</p>
                        )}
                    </div>

                </div>
            </main>

            {/* ── Bottom bar ── */}
            <footer className="fixed bottom-0 left-0 w-full z-[65] border-t border-outline-variant/10 bg-background/90 backdrop-blur-xl">
                <div className="h-1 bg-surface-container-highest">
                    <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between px-6 py-3 gap-4">
                    <button
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-all font-bold text-sm"
                        onClick={onSkip}
                    >
                        <span className="material-symbols-outlined text-base">skip_next</span>
                        Skip
                    </button>

                    {!result && (
                        <button
                            className="px-8 py-3 rounded-xl bg-gradient-to-br from-secondary-container to-secondary text-on-secondary-fixed font-black font-headline tracking-tight text-sm shadow-lg hover:shadow-secondary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={handleSubmit}
                            disabled={!answer.trim() || status === 'checking'}
                        >
                            {status === 'checking' ? 'CHECKING...' : 'CHECK ANSWER'}
                        </button>
                    )}
                </div>
            </footer>

            <ResultBottomSheet
                result={result ?? null}
                onContinue={onNext!}
                isLast={qIndex === total - 1}
            />
        </div>
    );
}
