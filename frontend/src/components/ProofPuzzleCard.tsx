import { useState, useRef } from 'react';
import ResultBottomSheet from './ResultBottomSheet';

interface Step { id: number; text: string; }

interface ProofPuzzleCardProps {
    question: any;
    onSubmit: (answer: string) => Promise<boolean>;
    result?: { is_correct: boolean; correct_answer: string; hint: string; explanation: string } | null;
    onSkip?: () => void;
    onNext?: () => void;
    qIndex: number;
    total: number;
}

export default function ProofPuzzleCard({ question, onSubmit, result, onSkip, onNext, qIndex, total }: ProofPuzzleCardProps) {
    const rawSteps: Step[] = question.options_json?.steps ?? [];
    const [steps, setSteps] = useState<Step[]>(rawSteps);
    const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle');
    const dragIndex = useRef<number | null>(null);
    const progress = Math.round(((qIndex + 1) / total) * 100);

    // ── Drag handlers ──────────────────────────────────────────────
    const onDragStart = (i: number) => { dragIndex.current = i; };

    const onDragOver = (e: React.DragEvent, i: number) => {
        e.preventDefault();
        if (dragIndex.current === null || dragIndex.current === i) return;
        const next = [...steps];
        const [moved] = next.splice(dragIndex.current, 1);
        next.splice(i, 0, moved);
        dragIndex.current = i;
        setSteps(next);
    };

    const onDragEnd = () => { dragIndex.current = null; };

    // ── Touch drag (mobile) ────────────────────────────────────────
    const touchStart = useRef<{ index: number; y: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent, i: number) => {
        touchStart.current = { index: i, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const dy = e.touches[0].clientY - touchStart.current.y;
        if (Math.abs(dy) < 20) return;
        const direction = dy > 0 ? 1 : -1;
        const from = touchStart.current.index;
        const to = from + direction;
        if (to < 0 || to >= steps.length) return;
        const next = [...steps];
        [next[from], next[to]] = [next[to], next[from]];
        touchStart.current = { index: to, y: e.touches[0].clientY };
        setSteps(next);
    };

    const onTouchEnd = () => { touchStart.current = null; };

    // ── Submit ─────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (status === 'checking') return;
        setStatus('checking');
        const answer = steps.map(s => s.id).join(',');
        const correct = await onSubmit(answer);
        setStatus(correct ? 'correct' : 'wrong');
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
                        <p className="text-[9px] uppercase tracking-[0.15em] text-outline font-bold">Proof Puzzle</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    <span className="px-4 py-1.5 text-sm font-bold text-primary border-b-2 border-primary pb-0.5">Mathematics</span>
                </div>

                <div className="flex items-center gap-2 w-52 justify-end shrink-0">
                    <span className="text-xs font-bold text-outline font-label">{qIndex + 1} / {total}</span>
                    <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10">
                        <span className="material-symbols-outlined text-outline text-sm">reorder</span>
                        <span className="text-sm font-bold text-on-surface font-headline">Puzzle</span>
                    </div>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="flex-1 pt-14 pb-24 overflow-y-auto">
                <div className="max-w-3xl mx-auto w-full px-6 py-8">

                    {/* Question # row */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-center">
                                <span className="text-base font-black text-on-surface font-headline">{qIndex + 1}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary/10 text-tertiary rounded-full border border-tertiary/20">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>puzzle</span>
                                <span className="text-xs font-black uppercase tracking-wider">Proof Puzzle</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/10">
                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                            <span className="text-xs font-bold text-on-surface-variant">+10 XP</span>
                        </div>
                    </div>

                    {/* Question canvas */}
                    <div className="bg-surface-container-lowest p-10 rounded-[2rem] border border-outline-variant/10 shadow-2xl relative overflow-hidden mb-3">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <span className="material-symbols-outlined" style={{ fontSize: '9rem' }}>account_tree</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold font-headline text-on-surface leading-tight relative z-10">
                            {question.question_text}
                        </h2>
                    </div>

                    {/* Instruction */}
                    <div className="flex items-center gap-2 text-outline text-xs font-medium mb-5 px-1">
                        <span className="material-symbols-outlined text-sm">drag_indicator</span>
                        Drag to arrange the steps in the correct logical order
                    </div>

                    {/* Draggable steps */}
                    <div className="space-y-3 mb-6">
                        {steps.map((step, i) => (
                            <div
                                key={step.id}
                                draggable={status === 'idle'}
                                onDragStart={() => onDragStart(i)}
                                onDragOver={e => onDragOver(e, i)}
                                onDragEnd={onDragEnd}
                                onTouchStart={e => onTouchStart(e, i)}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                className={`flex items-center p-5 rounded-2xl border-2 transition-all duration-200 select-none ${
                                    status === 'idle'
                                        ? 'bg-surface-container-low border-outline-variant/20 cursor-grab active:cursor-grabbing hover:border-primary-fixed-dim/40 active:shadow-lg active:scale-[1.01]'
                                        : status === 'correct'
                                        ? 'bg-secondary/5 border-secondary-container/50 cursor-default'
                                        : 'bg-surface-container-low border-outline-variant/20 cursor-default'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm mr-4 shrink-0 transition-colors ${
                                    status === 'correct'
                                        ? 'bg-secondary-container text-on-secondary-container'
                                        : 'bg-surface-container-highest text-outline'
                                }`}>
                                    {i + 1}
                                </div>
                                <p className="flex-1 text-sm font-medium text-on-surface-variant leading-relaxed">{step.text}</p>
                                {status === 'idle' && (
                                    <span className="material-symbols-outlined text-outline-variant/50 ml-3 shrink-0">drag_indicator</span>
                                )}
                                {status === 'correct' && (
                                    <span className="material-symbols-outlined text-secondary ml-3 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Result feedback */}
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
                            disabled={status === 'checking'}
                        >
                            {status === 'checking' ? 'CHECKING...' : 'CHECK ORDER'}
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
