import { useState, useEffect } from 'react';
import './Flashcard.css';
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
    finalButtonText = "I'm Ready — Start Learning" 
}: FlashcardModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                setIsFlipped(f => !f);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const markSeen = (cardId: number, known: boolean = false) => {
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
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
        }
    };

    if (cards.length === 0) {
        return (
            <div className="modal-overlay animate-fade-in">
                <div className="glass-panel" style={{ textAlign: 'center' }}>
                    <h2>No cards found.</h2>
                    <button className="btn-primary" onClick={onComplete} style={{ marginTop: '1rem' }}>Continue</button>
                </div>
            </div>
        );
    }

    const currentCard = cards[currentIndex];

    return (
        <div className="modal-overlay animate-fade-in">
            {showSkip && (
                <button 
                    onClick={onSkip || onComplete} 
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'rgba(255,255,255,0.5)' }}
                >
                    Skip
                </button>
            )}

            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>{title}</h2>
                {subtitle && <p style={{ color: '#94a3b8', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>{subtitle}</p>}
            </div>

            <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
                    <div className="flashcard-front">
                        <div className="flashcard-title" style={{ fontSize: '2rem' }}>{currentCard.title}</div>
                        <div className="flashcard-hint" style={{ fontSize: '1rem', opacity: 0.6 }}>[ Tap to flip & reveal ]</div>
                    </div>
                    <div className="flashcard-back">
                        <div className="flashcard-body" style={{ fontSize: '1.25rem', color: '#e2e8f0' }}>
                            {currentCard.body}
                        </div>
                        {currentCard.has_formula && (
                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', color: '#818cf8', fontSize: '1.5rem', fontWeight: 600 }}>
                                {currentCard.formula_text}
                            </div>
                        )}
                        {currentCard.example_text && (
                            <div style={{ marginTop: '2rem', padding: '1rem', borderLeft: '4px solid #10b981', background: 'rgba(16,185,129,0.05)', fontStyle: 'italic', fontSize: '1rem', textAlign: 'left' }}>
                                <span style={{ color: '#10b981', fontWeight: 700, marginRight: '8px' }}>Example:</span>
                                {currentCard.example_text}
                            </div>
                        )}
                        
                        <button 
                            className="btn-success"
                            onClick={(e) => { e.stopPropagation(); markSeen(currentCard.id, true); handleNext(); }}
                            style={{ position: 'absolute', bottom: '2rem', padding: '12px 24px', borderRadius: '30px', fontWeight: 600, border: 'none', color: 'white', cursor: 'pointer' }}
                        >
                            I understand this ✓
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '3rem' }}>
                {cards.map((_, i) => (
                    <div key={i} style={{ 
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: i === currentIndex ? 'var(--primary-accent)' : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.3s'
                    }} />
                ))}
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginTop: '3rem', width: '100%', maxWidth: '600px', justifyContent: 'center', alignItems: 'center' }}>
                <button 
                    onClick={handlePrev} 
                    disabled={currentIndex === 0} 
                    style={{ opacity: currentIndex === 0 ? 0 : 0.6, background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '30px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                    ← Previous
                </button>
                
                <button 
                    className="btn-premium-large" 
                    onClick={handleNext}
                    style={{ minWidth: '200px' }}
                >
                    {currentIndex === cards.length - 1 ? finalButtonText : 'Next Card →'}
                </button>
            </div>
        </div>
    );
}
