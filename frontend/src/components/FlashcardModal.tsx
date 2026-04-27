import { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

export interface Flashcard {
    id: number;
    title: string;
    body: string;
    card_type: string;
    has_formula: boolean;
    formula_text: string;
    example_text: string;
}

interface FlashcardModalProps {
    title?: string;
    subtitle?: string;
    cards: Flashcard[];
    onComplete: () => void;
    onSkip?: () => void;
    showSkip?: boolean;
    finalButtonText?: string;
}

export default function FlashcardModal({
    title = "Quick Revision",
    subtitle,
    cards,
    onComplete,
    onSkip,
    showSkip = true,
    finalButtonText = "I'm Ready — Start Learning",
}: FlashcardModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
            else if (e.key === 'ArrowLeft') handlePrev();
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') setIsFlipped(f => !f);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const markSeen = (cardId: number, known = false) => {
        api.post(`student/flashcards/${cardId}/seen/`, { known }).catch(console.error);
    };

    const handleNext = () => {
        setIsFlipped(false);
        if (currentIndex < cards.length - 1) {
            markSeen(cards[currentIndex].id);
            setCurrentIndex(i => i + 1);
        } else {
            markSeen(cards[currentIndex].id);
            onComplete();
        }
    };

    const handlePrev = () => {
        setIsFlipped(false);
        if (currentIndex > 0) setCurrentIndex(i => i - 1);
    };

    const progressPct = cards.length > 0 ? Math.round(((currentIndex + 1) / cards.length) * 100) : 0;

    // ── Empty state ──────────────────────────────────────────────────────────
    if (cards.length === 0) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-xl">
                <div className="bg-surface-container rounded-3xl border border-outline-variant/10 p-10 flex flex-col items-center text-center max-w-sm mx-4 shadow-2xl">
                    <span className="material-symbols-outlined text-4xl text-slate-500 mb-4">layers_clear</span>
                    <h2 className="text-xl font-black font-headline text-white mb-2">No cards found</h2>
                    <p className="text-slate-500 text-sm mb-6">Nothing to review right now.</p>
                    <button
                        onClick={onComplete}
                        className="px-8 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    const currentCard = cards[currentIndex];
    const isLast = currentIndex === cards.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/92 backdrop-blur-xl px-4 py-8">

            {/* ── Header ── */}
            <div className="w-full max-w-2xl flex items-start justify-between mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Card {currentIndex + 1} of {cards.length}
                    </p>
                    <h2 className="text-2xl font-black font-headline text-white leading-tight">{title}</h2>
                    {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
                </div>
                {showSkip && (
                    <button
                        onClick={onSkip ?? onComplete}
                        className="shrink-0 ml-4 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/20 text-slate-400 text-sm hover:text-white hover:border-outline-variant/40 transition-all"
                    >
                        <span className="material-symbols-outlined text-base">close</span>
                        Skip
                    </button>
                )}
            </div>

            {/* ── Progress bar ── */}
            <div className="w-full max-w-2xl mb-6">
                <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-slate-600">{progressPct}% complete</span>
                    <span className="text-[10px] text-slate-600">{cards.length - currentIndex - 1} remaining</span>
                </div>
            </div>

            {/* ── Flip card ── */}
            <div
                className="w-full max-w-2xl cursor-pointer select-none"
                style={{ perspective: '1500px', height: '340px' }}
                onClick={() => setIsFlipped(f => !f)}
            >
                <div
                    className="relative w-full h-full transition-transform duration-500"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-3xl bg-surface-container border border-outline-variant/10 shadow-2xl"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        {/* Card type badge */}
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-6 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                            {currentCard.card_type || 'Concept'}
                        </span>
                        <h3 className="text-2xl md:text-3xl font-black font-headline text-white text-center leading-tight mb-6">
                            {currentCard.title}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-600 text-xs mt-auto">
                            <span className="material-symbols-outlined text-base">touch_app</span>
                            <span>Tap to reveal · Space or → to advance</span>
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 flex flex-col items-start justify-start p-8 rounded-3xl bg-surface-container border border-outline-variant/10 shadow-2xl overflow-y-auto"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        <p className="text-base text-on-surface-variant leading-relaxed mb-4">
                            {currentCard.body}
                        </p>

                        {currentCard.has_formula && currentCard.formula_text && (
                            <div className="w-full mt-2 px-5 py-4 bg-primary/8 border border-primary/20 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Formula</p>
                                <p className="text-primary font-bold text-lg font-headline">{currentCard.formula_text}</p>
                            </div>
                        )}

                        {currentCard.example_text && (
                            <div className="w-full mt-3 px-5 py-4 bg-secondary/8 border-l-4 border-secondary rounded-r-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">Example</p>
                                <p className="text-on-surface-variant text-sm italic leading-relaxed">{currentCard.example_text}</p>
                            </div>
                        )}

                        {/* "Got it" button on back face */}
                        <button
                            className="mt-auto w-full py-3 rounded-xl bg-secondary/15 border border-secondary/25 text-secondary font-bold text-sm hover:bg-secondary/25 transition-all flex items-center justify-center gap-2"
                            onClick={e => { e.stopPropagation(); markSeen(currentCard.id, true); handleNext(); }}
                        >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Got it — Next card
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Dot indicators ── */}
            <div className="flex items-center gap-1.5 mt-5">
                {cards.map((_, i) => (
                    <div
                        key={i}
                        onClick={() => { setIsFlipped(false); setCurrentIndex(i); }}
                        className={`rounded-full transition-all duration-300 cursor-pointer ${
                            i === currentIndex
                                ? 'w-5 h-2 bg-primary'
                                : i < currentIndex
                                ? 'w-2 h-2 bg-secondary/60'
                                : 'w-2 h-2 bg-surface-container-highest'
                        }`}
                    />
                ))}
            </div>

            {/* ── Navigation ── */}
            <div className="flex items-center gap-3 mt-5 w-full max-w-2xl">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border border-outline-variant/20 text-slate-400 text-sm font-bold hover:text-white hover:border-outline-variant/40 transition-all disabled:opacity-0 disabled:pointer-events-none"
                >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Prev
                </button>

                <button
                    onClick={handleNext}
                    className={`flex-1 py-3.5 rounded-xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                        isLast
                            ? 'bg-gradient-to-br from-secondary-container to-secondary text-on-secondary-container hover:brightness-110'
                            : 'bg-gradient-to-br from-primary to-primary-container text-on-primary hover:brightness-110'
                    }`}
                >
                    {isLast ? (
                        <>
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                            {finalButtonText}
                        </>
                    ) : (
                        <>
                            Next Card
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                    )}
                </button>
            </div>

            {/* Keyboard hint */}
            <p className="mt-3 text-[10px] text-slate-700 uppercase tracking-wider">
                ← → navigate · Space flip · ↑↓ flip
            </p>
        </div>
    );
}
