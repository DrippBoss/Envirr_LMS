import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about HCF & LCM',
  points: [
    'HCF (Highest Common Factor) is the largest number that divides both a and b without a remainder.',
    'LCM (Lowest Common Multiple) is the smallest number that is divisible by both a and b.',
    'The golden identity: HCF(a, b) × LCM(a, b) = a × b — always holds for any two positive integers.',
    "Euclid's Algorithm finds HCF efficiently: replace the larger number by the remainder — repeat until remainder is 0.",
    'Prime factorisation: HCF picks the lowest power of each shared prime; LCM picks the highest power of every prime.',
  ],
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

interface Challenge {
  id: number;
  a: number;
  b: number;
  ask: 'HCF' | 'LCM';
  hint: string;
}

const CHALLENGES: Challenge[] = [
  { id: 1, a: 12,  b: 18,  ask: 'HCF', hint: 'Prime factorise both: 12 = 2²×3, 18 = 2×3²' },
  { id: 2, a: 12,  b: 18,  ask: 'LCM', hint: 'LCM = (12×18) ÷ HCF(12,18)' },
  { id: 3, a: 96,  b: 404, ask: 'HCF', hint: '96 = 2⁵×3, 404 = 2²×101' },
  { id: 4, a: 6,   b: 20,  ask: 'LCM', hint: 'LCM = (6×20) ÷ HCF(6,20)' },
  { id: 5, a: 336, b: 54,  ask: 'HCF', hint: '336 = 2⁴×3×7, 54 = 2×3³' },
];

function gcd(x: number, y: number): number {
  return y === 0 ? x : gcd(y, x % y);
}

function getAnswer(c: Challenge): number {
  const h = gcd(c.a, c.b);
  return c.ask === 'HCF' ? h : (c.a * c.b) / h;
}

type StepStatus = 'idle' | 'correct' | 'wrong';

export default function HcfLcmVisualizerLab({ nodeTitle, xpReward, onComplete }: Props) {
  // Free-play state
  const [fpA, setFpA] = useState(12);
  const [fpB, setFpB] = useState(18);
  const fpHcf = gcd(Math.abs(fpA), Math.abs(fpB));
  const fpLcm = fpHcf > 0 ? (Math.abs(fpA) * Math.abs(fpB)) / fpHcf : 0;

  // Challenge state
  const [cIdx, setCIdx] = useState(0);
  const [input, setInput] = useState('');
  const [stepStatus, setStepStatus] = useState<StepStatus>('idle');
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);

  const allDone = completed.length === CHALLENGES.length;
  const current = CHALLENGES[cIdx];

  const checkAnswer = () => {
    const val = parseInt(input.trim());
    if (isNaN(val)) return;
    const correct = getAnswer(current);
    if (val === correct) {
      setStepStatus('correct');
      setCompleted(prev => [...prev, current.id]);
      setTimeout(() => {
        if (cIdx < CHALLENGES.length - 1) {
          setCIdx(i => i + 1);
          setInput('');
          setStepStatus('idle');
          setShowHint(false);
        }
      }, 900);
    } else {
      setStepStatus('wrong');
      setTimeout(() => setStepStatus('idle'), 1200);
    }
  };

  return (
    <LabShell
      title={nodeTitle} xpReward={xpReward} onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ challengesCompleted: completed, fpA, fpB, fpHcf, fpLcm }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>

        {/* ── Progress row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {CHALLENGES.map((c, i) => (
            <div
              key={c.id}
              style={{
                flex: 1, height: 6, borderRadius: 99,
                background: completed.includes(c.id) ? '#10b981' : i === cIdx ? '#6366f1' : '#1e293b',
                transition: 'background 0.3s',
              }}
            />
          ))}
          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {completed.length}/{CHALLENGES.length}
          </span>
        </div>

        {/* ── Micro-Challenge panel ── */}
        {!allDone ? (
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{
                background: '#6366f1', color: '#fff', fontSize: '0.7rem',
                fontWeight: 800, padding: '2px 10px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Find the {current.ask}</span>
            </div>

            <p style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>
              What is the <span style={{ color: current.ask === 'HCF' ? '#6366f1' : '#10b981' }}>{current.ask}</span> of{' '}
              <strong>{current.a}</strong> and <strong>{current.b}</strong>?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="number"
                value={input}
                onChange={e => { setInput(e.target.value); setStepStatus('idle'); }}
                onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                placeholder="Your answer..."
                disabled={stepStatus === 'correct'}
                style={{
                  flex: 1,
                  background: stepStatus === 'correct' ? '#052e16' : stepStatus === 'wrong' ? '#2d0000' : '#0f172a',
                  border: `2px solid ${stepStatus === 'correct' ? '#10b981' : stepStatus === 'wrong' ? '#ef4444' : '#334155'}`,
                  borderRadius: 10,
                  color: '#f1f5f9',
                  padding: '0.65rem 0.9rem',
                  fontSize: '1.15rem',
                  outline: 'none',
                  transition: 'border 0.2s, background 0.2s',
                }}
              />
              <button
                onClick={checkAnswer}
                disabled={!input || stepStatus === 'correct'}
                style={{
                  background: '#6366f1', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '0.65rem 1.25rem',
                  fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                  opacity: !input || stepStatus === 'correct' ? 0.4 : 1,
                }}
              >
                {stepStatus === 'correct' ? '✓' : 'Check'}
              </button>
            </div>

            {stepStatus === 'wrong' && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                Not quite — try again!
              </p>
            )}
            {stepStatus === 'correct' && (
              <p style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                ✓ Correct! {current.ask} ({current.a}, {current.b}) = {getAnswer(current)}
              </p>
            )}

            <button
              onClick={() => setShowHint(h => !h)}
              style={{
                background: 'none', border: 'none', color: '#6366f1',
                fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline',
              }}
            >
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                💡 {current.hint}
              </p>
            )}
          </div>
        ) : (
          <div style={{
            background: '#052e16', border: '2px solid #10b981',
            borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '2rem',
          }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
              🎯 All challenges complete! Save & finish below.
            </p>
          </div>
        )}

        {/* ── Free-play explorer ── */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: '1.25rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Free Explorer — Euclid's Algorithm
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            {([['A', fpA, setFpA], ['B', fpB, setFpB]] as const).map(([label, val, set]) => (
              <label key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Number {label}</span>
                <input
                  type="number"
                  min={1} max={9999}
                  value={val}
                  onChange={e => (set as (v: number) => void)(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    background: '#1e293b', border: '1px solid #334155',
                    borderRadius: 8, color: '#f1f5f9',
                    padding: '0.5rem 0.7rem', fontSize: '1rem', width: '100%',
                  }}
                />
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'HCF', value: fpHcf, color: '#6366f1' },
              { label: 'LCM', value: fpLcm, color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                flex: 1, background: '#1e293b', borderRadius: 10,
                padding: '0.9rem', textAlign: 'center', border: `2px solid ${color}`,
              }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            HCF × LCM = {fpA} × {fpB} ={' '}
            <span style={{ color: '#a5b4fc' }}>{fpA * fpB}</span>
            {'  '}|{'  '}
            {fpHcf} × {fpLcm} ={' '}
            <span style={{ color: fpHcf * fpLcm === fpA * fpB ? '#10b981' : '#ef4444' }}>{fpHcf * fpLcm}</span>
            {fpHcf * fpLcm === fpA * fpB && <span style={{ color: '#10b981', marginLeft: 4 }}>✓ Identity holds</span>}
          </p>
        </div>
      </div>
    </LabShell>
  );
}
