import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about linear patterns',
  points: [
    'A linear pattern has a constant difference between consecutive terms.',
    'The nth term of any linear pattern is a linear polynomial: T(n) = an + b.',
    'The coefficient a equals the constant difference between terms.',
    'You can use the nth-term formula to find any term — or reverse it to find which term equals a given value.',
    'Real-world situations like savings, fares, and tile patterns all follow this structure.',
  ],
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

interface Challenge {
  id: number;
  context: string;
  sequence: number[];
  question: string;
  nthTerm: string;     // e.g. "2n − 1"
  evalAt: number;      // which n to evaluate
  answer: number;      // correct value at evalAt
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    context: 'Tiles in a growing cross pattern',
    sequence: [1, 3, 5, 7, 9],
    question: 'How many tiles are in Stage 15?',
    nthTerm: '2n − 1',
    evalAt: 15,
    answer: 29,
  },
  {
    id: 2,
    context: 'Bela's pocket money (₹100, spends ₹5/day)',
    sequence: [95, 90, 85, 80, 75],
    question: 'How much is left on Day 12?',
    nthTerm: '100 − 5n',
    evalAt: 12,
    answer: 40,
  },
  {
    id: 3,
    context: 'Chess club (₹200 fee + ₹50/match)',
    sequence: [250, 300, 350, 400, 450],
    question: 'What is the total cost for 11 matches?',
    nthTerm: '200 + 50n',
    evalAt: 11,
    answer: 750,
  },
  {
    id: 4,
    context: 'Rally members (starts 120, drops 9/hour)',
    sequence: [111, 102, 93, 84, 75],
    question: 'How many members remain after 8 hours?',
    nthTerm: '120 − 9n',
    evalAt: 8,
    answer: 48,
  },
  {
    id: 5,
    context: 'Matchstick hexagon chain (new hexagon each stage)',
    sequence: [6, 11, 16, 21, 26],
    question: 'How many matchsticks at Stage 15?',
    nthTerm: '5n + 1',
    evalAt: 15,
    answer: 76,
  },
];

const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  primary: '#6366f1',
  green: '#10b981',
  red: '#ef4444',
  gold: '#f59e0b',
  text: '#f1f5f9',
  dim: '#94a3b8',
  teal: '#14b8a6',
};

function DiffBadge({ diff }: { diff: number }) {
  const sign = diff >= 0 ? '+' : '';
  return (
    <span style={{
      display: 'inline-block', padding: '1px 8px', borderRadius: 99,
      background: diff >= 0 ? '#052e16' : '#2d0000',
      color: diff >= 0 ? C.green : C.red,
      fontSize: '0.72rem', fontWeight: 800,
    }}>
      {sign}{diff} each step
    </span>
  );
}

export default function LinearPatternExplorerLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showFormula, setShowFormula] = useState(false);

  // Free-play state
  const [fp, setFp] = useState({ a: 2, b: -1 });
  const fpSeq = Array.from({ length: 7 }, (_, i) => fp.a * (i + 1) + fp.b);
  const fpDiff = fp.a;

  const allDone = completed.length === CHALLENGES.length;
  const ch = CHALLENGES[cIdx];
  const diff = ch.sequence[1] - ch.sequence[0];

  const handleSubmit = () => {
    if (feedback !== 'idle') return;
    const val = parseInt(input.trim(), 10);
    if (val === ch.answer) {
      setFeedback('correct');
      setCompleted(prev => [...prev, ch.id]);
      setTimeout(() => {
        if (cIdx < CHALLENGES.length - 1) {
          setCIdx(i => i + 1);
          setFeedback('idle');
          setInput('');
          setShowFormula(false);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('idle'), 1400);
    }
  };

  return (
    <LabShell
      title={nodeTitle} xpReward={xpReward} onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ challengesCompleted: completed, fp }}
    >
      <div style={{ maxWidth: 620, margin: '0 auto', paddingBottom: '1rem' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {CHALLENGES.map((c, i) => (
            <div key={c.id} style={{
              flex: 1, height: 6, borderRadius: 99,
              background: completed.includes(c.id) ? C.green : i === cIdx ? C.primary : C.surface,
              transition: 'background 0.3s',
            }} />
          ))}
          <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: C.dim, whiteSpace: 'nowrap' }}>
            {completed.length}/{CHALLENGES.length}
          </span>
        </div>

        {/* Challenge panel */}
        {!allDone ? (
          <div style={{ background: C.surface, borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ background: C.primary, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                Challenge {cIdx + 1}
              </span>
              <DiffBadge diff={diff} />
            </div>

            {/* Context */}
            <div style={{ fontSize: '0.85rem', color: C.dim, marginBottom: '1rem', fontStyle: 'italic' }}>
              {ch.context}
            </div>

            {/* Sequence table */}
            <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 12px', background: C.bg, color: C.dim, fontWeight: 700, borderRadius: '8px 0 0 0', textAlign: 'center' }}>n</th>
                    {ch.sequence.map((_, i) => (
                      <th key={i} style={{ padding: '6px 12px', background: C.bg, color: C.primary, fontWeight: 700, textAlign: 'center' }}>
                        {i + 1}
                      </th>
                    ))}
                    <th style={{ padding: '6px 12px', background: C.bg, color: C.gold, fontWeight: 700, borderRadius: '0 8px 0 0', textAlign: 'center' }}>
                      {ch.evalAt}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', background: '#0f172a', color: C.dim, fontWeight: 700, textAlign: 'center', borderTop: `1px solid ${C.border}` }}>T(n)</td>
                    {ch.sequence.map((val, i) => (
                      <td key={i} style={{ padding: '8px 12px', background: '#0f172a', color: C.text, fontWeight: 600, textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
                        {val}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', background: '#0f172a', textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: '1.2rem', color: C.gold, fontWeight: 800 }}>?</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Difference arrows */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: C.dim }}>Constant difference:</span>
              {ch.sequence.slice(1).map((val, i) => (
                <span key={i} style={{ fontSize: '0.78rem', color: diff >= 0 ? C.green : C.red, fontWeight: 700 }}>
                  {diff >= 0 ? '+' : ''}{diff}
                </span>
              ))}
            </div>

            {/* Formula reveal */}
            <div style={{ marginBottom: '1.25rem' }}>
              <button
                onClick={() => setShowFormula(f => !f)}
                style={{
                  background: 'none', border: `1px solid ${C.border}`, color: C.dim,
                  padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem',
                }}
              >
                {showFormula ? 'Hide formula hint' : 'Show nth-term formula'}
              </button>
              {showFormula && (
                <div style={{
                  marginTop: '0.5rem', background: C.bg, borderRadius: 8,
                  padding: '0.6rem 1rem', fontSize: '0.95rem',
                  color: C.gold, fontWeight: 700, fontFamily: 'monospace',
                }}>
                  T(n) = {ch.nthTerm}
                </div>
              )}
            </div>

            {/* Question */}
            <div style={{ fontSize: '1rem', fontWeight: 700, color: C.text, marginBottom: '1rem' }}>
              {ch.question}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your answer"
                style={{
                  flex: 1, padding: '0.6rem 1rem', borderRadius: 10, fontSize: '1rem',
                  background: C.bg,
                  border: `2px solid ${feedback === 'correct' ? C.green : feedback === 'wrong' ? C.red : C.border}`,
                  color: C.text, outline: 'none',
                }}
              />
              <button
                onClick={handleSubmit}
                style={{
                  padding: '0.6rem 1.4rem', borderRadius: 10, fontWeight: 700,
                  background: C.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                Check
              </button>
            </div>

            {feedback === 'correct' && (
              <div style={{ marginTop: '0.75rem', color: C.green, fontWeight: 700 }}>
                ✓ Correct! T({ch.evalAt}) = {ch.answer}
              </div>
            )}
            {feedback === 'wrong' && (
              <div style={{ marginTop: '0.75rem', color: C.red, fontSize: '0.85rem' }}>
                Not quite — use the formula T(n) = {ch.nthTerm} and substitute n = {ch.evalAt}.
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#052e16', border: `2px solid ${C.green}`, borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: C.green, margin: 0 }}>
              🎯 All 5 patterns solved! Save & finish below.
            </p>
          </div>
        )}

        {/* Free-play explorer */}
        <div style={{ background: C.bg, borderRadius: 16, padding: '1.25rem', border: `1px solid ${C.surface}` }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Build Your Own Pattern — Free Explorer
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: C.teal, fontWeight: 700 }}>
                <span>Slope (a) — constant difference</span>
                <span>{fp.a}</span>
              </div>
              <input
                type="range" min={-8} max={8} step={1} value={fp.a}
                onChange={e => setFp(p => ({ ...p, a: parseInt(e.target.value) }))}
                style={{ accentColor: C.teal }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: C.primary, fontWeight: 700 }}>
                <span>Starting shift (b)</span>
                <span>{fp.b}</span>
              </div>
              <input
                type="range" min={-10} max={10} step={1} value={fp.b}
                onChange={e => setFp(p => ({ ...p, b: parseInt(e.target.value) }))}
                style={{ accentColor: C.primary }}
              />
            </label>
          </div>

          {/* Formula display */}
          <div style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 800, color: C.gold, marginBottom: '1rem', fontFamily: 'monospace' }}>
            T(n) = {fp.a}n {fp.b >= 0 ? '+' : '−'} {Math.abs(fp.b)}
          </div>

          {/* Sequence table */}
          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '5px 10px', background: C.surface, color: C.dim, fontWeight: 700, textAlign: 'center' }}>n</th>
                  {fpSeq.map((_, i) => (
                    <th key={i} style={{ padding: '5px 10px', background: C.surface, color: C.primary, fontWeight: 700, textAlign: 'center' }}>
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '7px 10px', background: C.bg, color: C.dim, fontWeight: 700, textAlign: 'center', borderTop: `1px solid ${C.border}` }}>T(n)</td>
                  {fpSeq.map((val, i) => (
                    <td key={i} style={{ padding: '7px 10px', background: C.bg, color: C.text, fontWeight: 600, textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
                      {val}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Consequence */}
          <div style={{
            background: C.surface, borderRadius: 12, padding: '0.85rem 1rem',
            border: `2px solid ${fpDiff >= 0 ? C.green : C.red}`,
          }}>
            <div style={{ color: C.text, fontSize: '0.85rem', lineHeight: 1.6 }}>
              {fpDiff > 0
                ? `📈 Linear growth — each term increases by ${fpDiff}.`
                : fpDiff < 0
                  ? `📉 Linear decay — each term decreases by ${Math.abs(fpDiff)}.`
                  : '➡️ Constant sequence — all terms equal b (slope = 0).'}
            </div>
            <div style={{ color: C.dim, fontSize: '0.75rem', marginTop: '0.3rem' }}>
              The constant difference {fpDiff} is the slope a of the linear polynomial T(n) = {fp.a}n {fp.b >= 0 ? '+' : '−'} {Math.abs(fp.b)}.
            </div>
          </div>
        </div>

      </div>
    </LabShell>
  );
}
