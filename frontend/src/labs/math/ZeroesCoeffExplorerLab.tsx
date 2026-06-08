import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about zeroes & coefficients',
  points: [
    'For any quadratic ax² + bx + c, the sum of zeroes α + β = −b/a.',
    'The product of zeroes αβ = c/a — always, regardless of what the zeroes actually are.',
    'These relations let you find facts about zeroes without solving the quadratic at all.',
    'Reconstruction: any quadratic with zeroes α, β can be written as k[x² − (α+β)x + αβ] for any non-zero k.',
    'If b = 0, the zeroes are symmetric about the origin (sum = 0, e.g. x² − 9 has zeroes +3 and −3).',
  ],
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

interface CoeffChallenge {
  id: number;
  a: number; b: number; c: number;
  label: string;
  ask: 'sum' | 'product';
  correctAnswer: number;
  hint: string;
}

const CHALLENGES: CoeffChallenge[] = [
  { id: 1, a: 1, b: -5, c: 6,  label: 'x\u00b2 \u2212 5x + 6',    ask: 'sum',     correctAnswer: 5,   hint: '\u03b1 + \u03b2 = \u2212b/a = \u2212(\u22125)/1 = 5' },
  { id: 2, a: 1, b: -5, c: 6,  label: 'x\u00b2 \u2212 5x + 6',    ask: 'product', correctAnswer: 6,   hint: '\u03b1\u03b2 = c/a = 6/1 = 6' },
  { id: 3, a: 1, b: 3,  c: -10, label: 'x\u00b2 + 3x \u2212 10',  ask: 'sum',     correctAnswer: -3,  hint: '\u03b1 + \u03b2 = \u2212b/a = \u22123/1 = \u22123' },
  { id: 4, a: 1, b: 3,  c: -10, label: 'x\u00b2 + 3x \u2212 10',  ask: 'product', correctAnswer: -10, hint: '\u03b1\u03b2 = c/a = \u221210/1 = \u221210' },
  { id: 5, a: 2, b: -8, c: 6,  label: '2x\u00b2 \u2212 8x + 6',   ask: 'sum',     correctAnswer: 4,   hint: '\u03b1 + \u03b2 = \u2212b/a = \u2212(\u22128)/2 = 8/2 = 4' },
];

type StepStatus = 'idle' | 'correct' | 'wrong';

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

function toFraction(num: number, den: number): string {
  if (den === 0) return 'undefined';
  const sign = (num < 0) !== (den < 0) ? '-' : '';
  const g = gcd(Math.abs(num), Math.abs(den));
  const n = Math.abs(num) / g;
  const d = Math.abs(den) / g;
  return d === 1 ? `${sign}${n}` : `${sign}${n}/${d}`;
}

export default function ZeroesCoeffExplorerLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<StepStatus>('idle');
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);

  // Free-play
  const [fpA, setFpA] = useState(1);
  const [fpB, setFpB] = useState(-5);
  const [fpC, setFpC] = useState(6);

  const allDone = completed.length === CHALLENGES.length;
  const current = CHALLENGES[cIdx];

  const checkAnswer = () => {
    const val = parseInt(input.trim());
    if (isNaN(val)) return;
    if (val === current.correctAnswer) {
      setStatus('correct');
      setCompleted(prev => [...prev, current.id]);
      setTimeout(() => {
        if (cIdx < CHALLENGES.length - 1) {
          setCIdx(i => i + 1);
          setInput('');
          setStatus('idle');
          setShowHint(false);
        }
      }, 900);
    } else {
      setStatus('wrong');
      setTimeout(() => setStatus('idle'), 1200);
    }
  };

  const safeA = fpA || 1;
  const fpSum = toFraction(-fpB, safeA);
  const fpProd = toFraction(fpC, safeA);

  return (
    <LabShell
      title={nodeTitle} xpReward={xpReward} onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ completed, fpA, fpB, fpC }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>

        {/* Progress strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {CHALLENGES.map((c, i) => (
            <div key={c.id} style={{
              flex: 1, height: 6, borderRadius: 99,
              background: completed.includes(c.id) ? '#10b981' : i === cIdx ? '#6366f1' : '#1e293b',
              transition: 'background 0.3s',
            }} />
          ))}
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {completed.length}/{CHALLENGES.length}
          </span>
        </div>

        {/* Challenge panel */}
        {!allDone ? (
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Find {current.ask === 'sum' ? '\u03b1 + \u03b2' : '\u03b1\u03b2'}
              </span>
            </div>

            {/* Polynomial display */}
            <div style={{ background: '#0f172a', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.02em' }}>
                p(x) = {current.label}
              </span>
            </div>

            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>
              Find <span style={{ color: '#6366f1' }}>{current.ask === 'sum' ? '\u03b1 + \u03b2' : '\u03b1\u03b2'}</span> for this polynomial. (Enter an integer.)
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="number"
                value={input}
                onChange={e => { setInput(e.target.value); setStatus('idle'); }}
                onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                disabled={status === 'correct'}
                placeholder="Your answer..."
                style={{
                  flex: 1, background: status === 'correct' ? '#052e16' : status === 'wrong' ? '#2d0000' : '#0f172a',
                  border: `2px solid ${status === 'correct' ? '#10b981' : status === 'wrong' ? '#ef4444' : '#334155'}`,
                  borderRadius: 10, color: '#f1f5f9', padding: '0.65rem 0.9rem',
                  fontSize: '1.15rem', outline: 'none', transition: 'all 0.2s',
                }}
              />
              <button
                onClick={checkAnswer}
                disabled={!input || status === 'correct'}
                style={{
                  background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.95rem',
                  cursor: !input || status === 'correct' ? 'not-allowed' : 'pointer',
                  opacity: !input || status === 'correct' ? 0.4 : 1,
                }}
              >
                {status === 'correct' ? '\u2713' : 'Check'}
              </button>
            </div>

            {status === 'wrong' && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>Not quite \u2014 try again!</p>
            )}
            {status === 'correct' && (
              <p style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                \u2713 Correct! {current.ask === 'sum' ? '\u03b1 + \u03b2' : '\u03b1\u03b2'} = {current.correctAnswer}
              </p>
            )}

            <button
              onClick={() => setShowHint(h => !h)}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
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
          <div style={{ background: '#052e16', border: '2px solid #10b981', borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
              🎯 All challenges complete! Save & finish below.
            </p>
          </div>
        )}

        {/* Free-play explorer */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: '1.25rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem' }}>
            {'Free Explorer \u2014 ax\u00b2 + bx + c'}
          </p>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
            {([
              { label: 'a', val: fpA, set: setFpA, color: '#6366f1', noZero: true },
              { label: 'b', val: fpB, set: setFpB, color: '#f59e0b', noZero: false },
              { label: 'c', val: fpC, set: setFpC, color: '#10b981', noZero: false },
            ] as const).map(({ label, val, set, color, noZero }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 800, color, fontSize: '0.95rem' }}>{label} = {val}</span>
                  <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                    {label === 'a' ? 'shape & direction' : label === 'b' ? 'tilt & symmetry' : 'starting height'}
                  </span>
                </div>
                <input
                  type="range" className="lab-slider"
                  min={-9} max={9} step={1}
                  value={val}
                  onChange={e => {
                    let v = parseInt(e.target.value);
                    if (noZero && v === 0) v = 1;
                    (set as (n: number) => void)(v);
                  }}
                  style={{ accentColor: color }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#334155', marginTop: '2px' }}>
                  <span>-9</span><span>0</span><span>9</span>
                </div>
              </div>
            ))}
          </div>

          {/* Polynomial label */}
          <div style={{ background: '#1e293b', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', textAlign: 'center' }}>
            <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '1.1rem' }}>
              {'p(x) = '}{fpA}{'x\u00b2 '}{fpB >= 0 ? '+ ' : '\u2212 '}{Math.abs(fpB)}{'x '}{fpC >= 0 ? '+ ' : '\u2212 '}{Math.abs(fpC)}
            </span>
          </div>

          {/* Formula result cards */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { formula: '\u03b1 + \u03b2 = \u2212b/a', value: fpSum, color: '#6366f1', simple: 'sum of zeroes' },
              { formula: '\u03b1\u03b2 = c/a',           value: fpProd, color: '#10b981', simple: 'product of zeroes' },
            ].map(({ formula, value, color, simple }) => (
              <div key={formula} style={{ flex: 1, background: '#1e293b', borderRadius: 10, padding: '0.9rem', textAlign: 'center', border: `2px solid ${color}30` }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.15rem' }}>{simple}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem' }}>{formula}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Consequence rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: '#1e293b', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
              <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>{'a='+safeA}</span>
              <div>
                <div style={{ color: '#f1f5f9', fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '0.2rem' }}>
                  {safeA > 0 ? 'Parabola opens upward (\u222a) \u2014 zeroes are real only if b\u00b2 \u2265 4ac.' : 'Parabola opens downward (\u2229) \u2014 zeroes are real only if b\u00b2 \u2265 4ac.'}
                </div>
                <div style={{ color: '#475569', fontSize: '0.72rem' }}>{'a \u2260 0 is required for a quadratic'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: '#1e293b', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
              <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>{'b='+fpB}</span>
              <div>
                <div style={{ color: '#f1f5f9', fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '0.2rem' }}>
                  {'Changing b shifts both zeroes left or right together. When b = 0, the zeroes are equal in size but opposite in sign (like +3 and \u22123).'}
                </div>
                <div style={{ color: '#475569', fontSize: '0.72rem' }}>{'\u03b1 + \u03b2 = \u2212b/a = '}{fpSum}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: '#1e293b', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
              <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>{'c='+fpC}</span>
              <div>
                <div style={{ color: '#f1f5f9', fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '0.2rem' }}>
                  {'c is the y-intercept \u2014 where the parabola crosses the y-axis. It also equals the product of both zeroes (times a).'}
                </div>
                <div style={{ color: '#475569', fontSize: '0.72rem' }}>{'\u03b1\u03b2 = c/a = '}{fpProd}</div>
              </div>
            </div>
          </div>

          {/* Reconstruction */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center' }}>
            {'Rebuild from zeroes: x\u00b2 \u2212 ('}{fpSum}{')x + ('}{fpProd}{')'}
          </div>
        </div>
      </div>
    </LabShell>
  );
}
