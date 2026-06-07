import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about proof by contradiction',
  points: [
    'Every irrationality proof starts the same way: assume the number IS rational (= a/b, HCF = 1), then derive a contradiction.',
    "Theorem 1.2 (Euclid's Lemma) is the engine: if a prime p divides a², then p also divides a.",
    'The contradiction is always the same: both a and b end up divisible by the prime — breaking HCF(a, b) = 1.',
    'Compound irrationals (3 + 2√5, 5 − √3) work by isolating the irrational part and showing it would have to be rational.',
    'Proof by contradiction is a universal tool: assume the opposite of what you want to prove, then show that leads to a logical impossibility.',
  ],
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

const PROOFS = [
  {
    id: 'sqrt2',
    label: '√2 is irrational',
    ref: 'NCERT Theorem 1.3',
    steps: [
      'Assume √2 = a/b where a, b are coprime integers (HCF = 1).',
      'Squaring: 2 = a²/b², so a² = 2b².',
      'Since 2 divides a², by Theorem 1.2 (prime p | a² ⟹ p | a), 2 divides a.',
      'Write a = 2c for some integer c.',
      'Substituting: (2c)² = 2b² → 4c² = 2b² → b² = 2c².',
      'So 2 divides b² and hence (by Theorem 1.2) 2 divides b.',
      'Both a and b divisible by 2 contradicts HCF(a, b) = 1. ∴ √2 is irrational. ∎',
    ],
  },
  {
    id: 'sqrt3',
    label: '√3 is irrational',
    ref: 'NCERT Example 5',
    steps: [
      'Assume √3 = a/b where a, b are coprime (HCF = 1).',
      'Squaring: 3b² = a², so 3 divides a².',
      'By Theorem 1.2, since 3 divides a², 3 divides a. Write a = 3c.',
      'Substituting: 3b² = (3c)² = 9c² → b² = 3c², so 3 divides b².',
      'By Theorem 1.2, 3 divides b.',
      'Both a and b divisible by 3 contradicts HCF(a, b) = 1. ∴ √3 is irrational. ∎',
    ],
  },
  {
    id: 'sqrt5',
    label: '√5 is irrational',
    ref: 'NCERT Exercise 1.2, Q1',
    steps: [
      'Assume √5 = a/b where a, b are coprime (HCF = 1).',
      'Squaring: a² = 5b², so 5 divides a².',
      'By Theorem 1.2, 5 divides a. Write a = 5c.',
      '(5c)² = 5b² → 25c² = 5b² → b² = 5c², so 5 divides b.',
      '5 divides both a and b — contradicts HCF(a, b) = 1. ∴ √5 is irrational. ∎',
    ],
  },
  {
    id: '5-sqrt3',
    label: '5 − √3 is irrational',
    ref: 'NCERT Example 6',
    steps: [
      'Assume 5 − √3 is rational — call it r.',
      'Rearranging: −√3 = r − 5, so √3 = 5 − r.',
      'Since r is rational and 5 is rational, 5 − r is rational.',
      'So √3 would be rational.',
      'But √3 is irrational — contradiction. ∴ 5 − √3 is irrational. ∎',
    ],
  },
  {
    id: '3sqrt2',
    label: '3√2 is irrational',
    ref: 'NCERT Example 7',
    steps: [
      'Assume 3√2 is rational — call it r.',
      'Rearranging: √2 = r/3.',
      'Since r is rational and 3 is a non-zero integer, r/3 is rational.',
      'So √2 would be rational.',
      'But √2 is irrational — contradiction. ∴ 3√2 is irrational. ∎',
    ],
  },
  {
    id: '3+2sqrt5',
    label: '3 + 2√5 is irrational',
    ref: 'NCERT Exercise 1.2, Q2',
    steps: [
      'Assume 3 + 2√5 is rational — call it r.',
      'Rearranging: 2√5 = r − 3, so √5 = (r − 3)/2.',
      'Since r is rational, r − 3 is rational, and (r − 3)/2 is rational.',
      'So √5 would be rational.',
      'But √5 is irrational — contradiction. ∴ 3 + 2√5 is irrational. ∎',
    ],
  },
];

const COLORS = {
  primary: '#6366f1',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  dim: '#94a3b8',
  success: '#10b981',
};

export default function ProofBuilderLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [selectedId, setSelectedId] = useState(PROOFS[0].id);
  const [revealed, setRevealed] = useState<number>(0);

  const proof = PROOFS.find(p => p.id === selectedId)!;
  const done = revealed >= proof.steps.length;

  const handleSwitch = (id: string) => {
    setSelectedId(id);
    setRevealed(0);
  };

  const revealNext = () => {
    if (revealed < proof.steps.length) setRevealed(r => r + 1);
  };

  return (
    <LabShell
      title={nodeTitle} xpReward={xpReward} onComplete={onComplete}
      takeaway={TAKEAWAY}
      artifact={{ proof: selectedId, steps_revealed: revealed }}
    >
      <div style={{ maxWidth: 580, margin: '0 auto' }}>

        {/* Proof selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {PROOFS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSwitch(p.id)}
              style={{
                padding: '0.5rem 0.25rem',
                borderRadius: 8,
                border: `2px solid ${selectedId === p.id ? COLORS.primary : COLORS.border}`,
                background: selectedId === p.id ? '#312e81' : COLORS.surface,
                color: COLORS.text,
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                lineHeight: 1.3,
                textAlign: 'center',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Ref badge */}
        <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#a5b4fc' }}>
          {proof.ref}
        </div>

        {/* Steps */}
        <div style={{ marginBottom: '1.5rem' }}>
          {proof.steps.map((step, i) => {
            const isVisible = i < revealed;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  borderRadius: 8,
                  background: isVisible ? COLORS.surface : '#0f172a',
                  border: `1px solid ${isVisible ? COLORS.primary : COLORS.border}`,
                  opacity: isVisible ? 1 : 0.35,
                  transition: 'all 0.35s ease',
                }}
              >
                <span style={{ color: COLORS.primary, fontWeight: 700, minWidth: 22, flexShrink: 0 }}>
                  {i + 1}.
                </span>
                <span style={{ color: isVisible ? COLORS.text : COLORS.dim, fontSize: '0.92rem', lineHeight: 1.5 }}>
                  {isVisible ? step : '??? '}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: COLORS.border, borderRadius: 3, marginBottom: '1rem' }}>
          <div
            style={{
              height: '100%',
              background: done ? COLORS.success : COLORS.primary,
              borderRadius: 3,
              width: `${(revealed / proof.steps.length) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {!done ? (
          <button
            onClick={revealNext}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 8,
              border: 'none',
              background: COLORS.primary,
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Reveal Step {revealed + 1} of {proof.steps.length}
          </button>
        ) : (
          <div style={{ textAlign: 'center', color: COLORS.success, fontWeight: 700, fontSize: '1rem', padding: '0.5rem' }}>
            Proof complete! ✓ Try another proof or click "Save & Finish Lab" below.
          </div>
        )}
      </div>
    </LabShell>
  );
}
