import { useState } from 'react';
import ResultBottomSheet from './ResultBottomSheet';

interface Choice { id: number; text: string; }

interface MultiSelectCardProps {
    question: any;
    onSubmit: (answer: string) => Promise<boolean>;
    result?: { is_correct: boolean; correct_answer: string; hint: string; explanation: string } | null;
    onSkip?: () => void;
    onNext?: () => void;
    qIndex: number;
    total: number;
}

export default function MultiSelectCard({ question, onSubmit, result, onSkip, onNext, qIndex, total }: MultiSelectCardProps) {
    const choices: Choice[] = question.options_json?.choices ?? [];
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle');
    const progress = Math.round(((qIndex + 1) / total) * 100);

    const toggle = (id: number) => {
        if (status !== 'idle') return;
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (selected.size === 0 || status === 'checking') return;
        setStatus('checking');
        const answer = [...selected].sort((a, b) => a - b).join(',');
        const correct = await onSubmit(answer);
        setStatus(correct ? 'correct' : 'wrong');
    };

    const correctIds = new Set(
        String(result?.correct_answer ?? '').split(',').map(Number).filter(Boolean)
    );

    return (
        <div className="fixed inset-0 z-[60] bg-background selection:bg-primary-container/30 flex flex-col">

            {/* ── Top bar ── */}
            <header className="fixed top-0 left-0 w-full z-[65] flex items-center justify-between px-5 h-14 bg-background border-b border-outline-variant/10 backdrop-blur-xl">
                <div className="flex items-center gap-3 w-52 shrink-0">
                    <button className="material-symbols-outlined text-outline hover:text-on-surface transition-colors" onClick={onSkip}>
                        close
                    </button>
                    <div className="leading-none">
                        <span className="font-black text-base text-white font-headline">Envirr</span>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-outline font-bold">Select All That Apply</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    <span className="px-4 py-1.5 text-sm font-bold text-primary border-b-2 border-primary pb-0.5">Mathematics</span>
                </div>

                <div className="flex items-center gap-2 w-52 justify-end shrink-0">
                    <span className="text-xs font-bold text-outline font-label">{qIndex + 1} / {total}</span>
                    <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10">
                        <span className="material-symbols-outlined text-outline text-sm">checklist</span>
                        <span className="text-sm font-bold text-on-surface font-headline">Multi</span>
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
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full border border-secondary/20">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>checklist</span>
                                <span className="text-xs font-black uppercase tracking-wider">Select All Correct</span>
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
                            <span className="material-symbols-outlined" style={{ fontSize: '9rem' }}>checklist</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold font-headline text-on-surface leading-tight relative z-10">
                            {question.question_text}
                        </h2>
                    </div>

                    {/* Instruction */}
                    <div className="flex items-center justify-between text-xs font-medium mb-5 px-1">
                        <div className="flex items-center gap-2 text-outline">
                            <span className="material-symbols-outlined text-sm">touch_app</span>
                            Tap to select — there may be more than one correct answer
                        </div>
                        {selected.size > 0 && status === 'idle' && (
                            <span className="text-secondary font-bold">{selected.size} selected</span>
                        )}
                    </div>

                    {/* Choices grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {choices.map((choice) => {
                            const isSelected = selected.has(choice.id);
                            const isChecked = status !== 'idle';
                            const isCorrectChoice = correctIds.has(choice.id);

                            let chipClass = 'bg-surface-container-low border-outline-variant/20 hover:border-primary/40 cursor-pointer';
                            let numberClass = 'bg-surface-container-highest text-outline';
                            let icon = null;

                            if (isSelected && !isChecked) {
                                chipClass = 'bg-primary/10 border-primary/60 cursor-pointer';
                                numberClass = 'bg-primary/20 text-primary';
                            }
                            if (isChecked) {
                                if (isCorrectChoice) {
                                    chipClass = 'bg-secondary/10 border-secondary/50 cursor-default';
                                    numberClass = 'bg-secondary-container text-on-secondary-container';
                                    icon = <span className="material-symbols-outlined text-secondary text-lg shrink-0 ml-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>;
                                } else if (isSelected && !isCorrectChoice) {
                                    chipClass = 'bg-error/10 border-error/40 cursor-default';
                                    numberClass = 'bg-error-container text-on-error-container';
                                    icon = <span className="material-symbols-outlined text-error text-lg shrink-0 ml-2" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>;
                                } else {
                                    chipClass = 'bg-surface-container-low border-outline-variant/20 cursor-default opacity-50';
                                }
                            }

                            return (
                                <div
                                    key={choice.id}
                                    onClick={() => toggle(choice.id)}
                                    className={`flex items-center p-4 rounded-2xl border-2 transition-all duration-150 select-none ${chipClass}`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs mr-3 shrink-0 transition-colors ${numberClass}`}>
                                        {choice.id}
                                    </div>
                                    <p className="flex-1 text-sm font-semibold text-on-surface leading-snug">{choice.text}</p>
                                    {icon}
                                </div>
                            );
                        })}
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
                            disabled={selected.size === 0 || status === 'checking'}
                        >
                            {status === 'checking' ? 'CHECKING...' : 'CHECK ANSWERS'}
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
