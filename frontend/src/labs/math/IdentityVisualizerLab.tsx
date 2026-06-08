import React, { useState } from 'react';
import LabShell from '../LabShell';
import type { LabProps } from '../LabDispatcher';

// ── Types ────────────────────────────────────────────────────────────────────
type IdentityKey = 'sum_sq' | 'diff_sq' | 'diff_of_sq' | 'sum_cube';

interface Challenge {
  id: number;
  prompt: string;
  identity: IdentityKey;
  a: number;
  b: number;
  question: string;
  answer: string;
  hint: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const CHALLENGES: Challenge[] = [
  {
    id: 1,
    prompt: 'Use (a+b)² to evaluate 103²',
    identity: 'sum_sq',
    a: 100, b: 3,
    question: 'What is (100 + 3)² expanded?',
    answer: '10609',
    hint: '100² + 2×100×3 + 3² = 10000 + 600 + 9',
  },
  {
    id: 2,
    prompt: 'Use (a−b)² to evaluate 97²',
    identity: 'diff_sq',
    a: 100, b: 3,
    question: 'What is (100 − 3)² expanded?',
    answer: '9409',
    hint: '100² − 2×100×3 + 3² = 10000 − 600 + 9',
  },
  {
    id: 3,
    prompt: 'Use (a+b)(a−b) to evaluate 52 × 48',
    identity: 'diff_of_sq',
    a: 50, b: 2,
    question: 'What is (50+2)(50−2)?',
    answer: '2496',
    hint: '50² − 2² = 2500 − 4',
  },
  {
    id: 4,
    prompt: 'Use (a+b)² to simplify (3x + 4y)²',
    identity: 'sum_sq',
    a: 3, b: 4,
    question: 'Coefficient of xy in the expansion of (3x+4y)²?',
    answer: '24',
    hint: 'Coefficient of xy = 2 × 3 × 4',
  },
  {
    id: 5,
    prompt: 'Use (a−b)² to find (2p − 5q)²',
    identity: 'diff_sq',
    a: 2, b: 5,
    question: 'Coefficient of pq in (2p−5q)²?',
    answer: '-20',
    hint: '−2 × 2 × 5 = −20',
  },
];

const TAKEAWAY = {
  title: 'Algebraic Identities — Key Insights',
  points: [
    '(a+b)² = a² + 2ab + b²  ← geometric: big square = 4 pieces',
    '(a−b)² = a² − 2ab + b²  ← remove the L-shaped strip twice',
    '(a+b)(a−b) = a² − b²  ← difference of squares, no middle term',
    'These identities let you compute squares of 3-digit numbers mentally',
    'Every identity has a geometric proof using area models',
    'The middle term 2ab is why (a+b)² ≠ a² + b²',
  ],
};

// ── Geometry Renderers ───────────────────────────────────────────────────────
const SQ = 260;

function SumSquareViz({ a, b }: { a: number; b: number }) {
  const total = a + b;
  const aFrac = a / total;
  const bFrac = b / total;
  const aPx = aFrac * SQ;
  const bPx = bFrac * SQ;

  return (
    <svg width={SQ + 60} height={SQ + 60} style={{ display: 'block', margin: '0 auto' }}>
      {/* a² */}
      <rect x={30} y={0} width={aPx} height={aPx} fill="#6366f1" fillOpacity={0.7} stroke="#818cf8" strokeWidth={1.5} />
      <text x={30 + aPx / 2} y={aPx / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontWeight={700}>a²</text>
      {/* ab (top right) */}
      <rect x={30 + aPx} y={0} width={bPx} height={aPx} fill="#f59e0b" fillOpacity={0.7} stroke="#fbbf24" strokeWidth={1.5} />
      <text x={30 + aPx + bPx / 2} y={aPx / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontWeight={700}>ab</text>
      {/* ab (bottom left) */}
      <rect x={30} y={aPx} width={aPx} height={bPx} fill="#f59e0b" fillOpacity={0.7} stroke="#fbbf24" strokeWidth={1.5} />
      <text x={30 + aPx / 2} y={aPx + bPx / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontWeight={700}>ab</text>
      {/* b² */}
      <rect x={30 + aPx} y={aPx} width={bPx} height={bPx} fill="#10b981" fillOpacity={0.7} stroke="#34d399" strokeWidth={1.5} />
      <text x={30 + aPx + bPx / 2} y={aPx + bPx / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontWeight={700}>b²</text>
      {/* Labels */}
      <text x={30 + aPx / 2} y={SQ + 20} textAnchor="middle" fill="#a5b4fc" fontSize={13}>a = {a}</text>
      <text x={30 + aPx + bPx / 2} y={SQ + 20} textAnchor="middle" fill="#6ee7b7" fontSize={13}>b = {b}</text>
      <text x={30 + SQ / 2} y={SQ + 40} textAnchor="middle" fill="#f8fafc" fontSize={13} fontWeight={600}>(a+b)² = a² + 2ab + b²</text>
    </svg>
  );
}

function DiffSquareViz({ a, b }: { a: number; b: number }) {
  const total = a;
  const aPx = SQ;
  const bFrac = b / total;
  const bPx = Math.min(bFrac * SQ, SQ - 20);

  return (
    <svg width={SQ + 60} height={SQ + 60} style={{ display: 'block', margin: '0 auto' }}>
      {/* big a² square */}
      <rect x={30} y={0} width={aPx} height={aPx} fill="#1e1b4b" stroke="#6366f1" strokeWidth={1.5} />
      {/* (a-b)² region */}
      <rect x={30} y={0} width={aPx - bPx} height={aPx - bPx} fill="#6366f1" fillOpacity={0.8} stroke="#818cf8" strokeWidth={1.5} />
      <text x={30 + (aPx - bPx) / 2} y={(aPx - bPx) / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={14} fontWeight={700}>(a−b)²</text>
      {/* top-right strip */}
      <rect x={30 + aPx - bPx} y={0} width={bPx} height={aPx - bPx} fill="#f59e0b" fillOpacity={0.6} stroke="#fbbf24" strokeWidth={1} />
      <text x={30 + aPx - bPx / 2} y={(aPx - bPx) / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11}>ab−b²</text>
      {/* bottom strip */}
      <rect x={30} y={aPx - bPx} width={aPx - bPx} height={bPx} fill="#f59e0b" fillOpacity={0.6} stroke="#fbbf24" strokeWidth={1} />
      <text x={30 + (aPx - bPx) / 2} y={aPx - bPx / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11}>ab−b²</text>
      {/* corner b² */}
      <rect x={30 + aPx - bPx} y={aPx - bPx} width={bPx} height={bPx} fill="#ef4444" fillOpacity={0.7} stroke="#f87171" strokeWidth={1.5} />
      <text x={30 + aPx - bPx / 2} y={aPx - bPx / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontWeight={700}>b²</text>
      <text x={30 + SQ / 2} y={SQ + 20} textAnchor="middle" fill="#f8fafc" fontSize={13} fontWeight={600}>(a−b)² = a² − 2ab + b²</text>
    </svg>
  );
}

function DiffOfSqViz({ a, b }: { a: number; b: number }) {
  const aPx = SQ;
  const bFrac = b / a;
  const bPx = Math.min(bFrac * SQ, SQ - 20);
  const rPx = aPx - bPx;

  return (
    <svg width={SQ + 80} height={SQ + 60} style={{ display: 'block', margin: '0 auto' }}>
      {/* a² square */}
      <rect x={30} y={0} width={aPx} height={aPx} fill="#1e1b4b" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2" />
      {/* (a+b)(a-b) = big rect minus corner */}
      <rect x={30} y={0} width={aPx} height={rPx} fill="#6366f1" fillOpacity={0.75} stroke="#818cf8" strokeWidth={1.5} />
      <text x={30 + aPx / 2} y={rPx / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontWeight={700}>(a+b)(a−b)</text>
      {/* b² corner (removed) */}
      <rect x={30 + aPx - bPx} y={rPx} width={bPx} height={bPx} fill="#ef4444" fillOpacity={0.5} stroke="#f87171" strokeDasharray="4 2" strokeWidth={1.5} />
      <text x={30 + aPx - bPx / 2} y={rPx + bPx / 2} textAnchor="middle" dominantBaseline="middle" fill="#fca5a5" fontSize={12}>−b²</text>
      <text x={30 + SQ / 2} y={SQ + 20} textAnchor="middle" fill="#f8fafc" fontSize={13} fontWeight={600}>(a+b)(a−b) = a² − b²</text>
    </svg>
  );
}

// ── Sliders ──────────────────────────────────────────────────────────────────
const sliderStyle: React.CSSProperties = {
  width: '100%', accentColor: '#6366f1', cursor: 'pointer',
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function IdentityVisualizerLab({ nodeTitle, xpReward, onComplete }: LabProps) {
  const [mode, setMode] = useState<'challenges' | 'explore'>('challenges');
  const [cIdx, setCIdx] = useState(0);
  const [userAns, setUserAns] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [solved, setSolved] = useState<boolean[]>(new Array(CHALLENGES.length).fill(false));
  const [showHint, setShowHint] = useState(false);
  const [showTakeaway, setShowTakeaway] = useState(false);

  // free-play
  const [fpIdentity, setFpIdentity] = useState<IdentityKey>('sum_sq');
  const [fpA, setFpA] = useState(5);
  const [fpB, setFpB] = useState(3);

  const challenge = CHALLENGES[cIdx];
  const allSolved = solved.every(Boolean);

  function checkAnswer() {
    const clean = userAns.trim().replace(/\s/g, '');
    if (clean === challenge.answer) {
      const next = solved.map((v, i) => (i === cIdx ? true : v));
      setSolved(next);
      setFeedback('correct');
      if (next.every(Boolean)) setTimeout(() => setShowTakeaway(true), 800);
    } else {
      setFeedback('wrong');
    }
  }

  function renderViz(identity: IdentityKey, a: number, b: number) {
    if (identity === 'sum_sq') return <SumSquareViz a={a} b={b} />;
    if (identity === 'diff_sq') return <DiffSquareViz a={a} b={b} />;
    if (identity === 'diff_of_sq') return <DiffOfSqViz a={a} b={b} />;
    return null;
  }

  function computeResult(identity: IdentityKey, a: number, b: number) {
    if (identity === 'sum_sq') return `${a}² + 2·${a}·${b} + ${b}² = ${a ** 2 + 2 * a * b + b ** 2}`;
    if (identity === 'diff_sq') return `${a}² − 2·${a}·${b} + ${b}² = ${a ** 2 - 2 * a * b + b ** 2}`;
    if (identity === 'diff_of_sq') return `${a}² − ${b}² = ${a ** 2 - b ** 2}`;
    return '';
  }

  const IDENTITY_LABELS: Record<IdentityKey, string> = {
    sum_sq: '(a+b)²',
    diff_sq: '(a−b)²',
    diff_of_sq: '(a+b)(a−b)',
    sum_cube: '(a+b)³',
  };

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      badgeLabel="IDENTITY LAB"
      onSaveFinish={() => onComplete({ solved: solved.filter(Boolean).length })}
      showTakeaway={showTakeaway}
      takeaway={TAKEAWAY}
      onDismissTakeaway={() => { setShowTakeaway(false); onComplete({ solved: CHALLENGES.length }); }}
    >
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['challenges', 'explore'] as const).map(tab => (
          <button key={tab} onClick={() => setMode(tab)} style={{
            padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: mode === tab ? '#6366f1' : '#1e293b',
            color: mode === tab ? 'white' : '#94a3b8',
          }}>{tab === 'challenges' ? `Challenges (${solved.filter(Boolean).length}/${CHALLENGES.length})` : 'Free Explore'}</button>
        ))}
      </div>

      {mode === 'challenges' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left: challenge panel */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {CHALLENGES.map((_c, i) => (
                <div key={i} onClick={() => { setCIdx(i); setFeedback(null); setUserAns(''); setShowHint(false); }}
                  style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: solved[i] ? '#10b981' : i === cIdx ? '#6366f1' : '#1e293b',
                    color: solved[i] || i === cIdx ? 'white' : '#64748b',
                    border: i === cIdx ? '2px solid #818cf8' : '2px solid transparent',
                  }}>{i + 1}</div>
              ))}
            </div>

            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>Challenge {cIdx + 1} of {CHALLENGES.length}</p>
            <h3 style={{ color: '#f8fafc', fontSize: 15, marginBottom: 12, lineHeight: 1.4 }}>{challenge.prompt}</h3>
            <p style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 16 }}>{challenge.question}</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={userAns}
                onChange={e => { setUserAns(e.target.value); setFeedback(null); }}
                onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                placeholder="Your answer…"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${feedback === 'correct' ? '#10b981' : feedback === 'wrong' ? '#ef4444' : '#334155'}`, background: '#1e293b', color: '#f8fafc', fontSize: 14, outline: 'none' }}
              />
              <button onClick={checkAnswer} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Check</button>
            </div>

            {feedback === 'correct' && <p style={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>Correct! Well done.</p>}
            {feedback === 'wrong' && <p style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>Not quite. Try again.</p>}

            <button onClick={() => setShowHint(!showHint)} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && <p style={{ color: '#fcd34d', fontSize: 13, marginTop: 8, padding: 10, background: '#1e293b', borderRadius: 8 }}>{challenge.hint}</p>}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => { setCIdx(Math.max(0, cIdx - 1)); setFeedback(null); setUserAns(''); setShowHint(false); }}
                disabled={cIdx === 0}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: cIdx === 0 ? '#1e293b' : '#334155', color: cIdx === 0 ? '#475569' : '#cbd5e1', cursor: cIdx === 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                ← Prev
              </button>
              <button onClick={() => { setCIdx(Math.min(CHALLENGES.length - 1, cIdx + 1)); setFeedback(null); setUserAns(''); setShowHint(false); }}
                disabled={cIdx === CHALLENGES.length - 1}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: cIdx === CHALLENGES.length - 1 ? '#1e293b' : '#334155', color: cIdx === CHALLENGES.length - 1 ? '#475569' : '#cbd5e1', cursor: cIdx === CHALLENGES.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                Next →
              </button>
            </div>

            {allSolved && (
              <button onClick={() => setShowTakeaway(true)} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #6366f1)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                View Key Insights
              </button>
            )}
          </div>

          {/* Right: visualisation */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Geometric Proof</p>
            {renderViz(challenge.identity, challenge.a, challenge.b)}
          </div>
        </div>
      )}

      {mode === 'explore' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Controls */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
            <h4 style={{ color: '#f8fafc', marginBottom: 16, fontSize: 14 }}>Free Explorer</h4>

            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Identity</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {(['sum_sq', 'diff_sq', 'diff_of_sq'] as IdentityKey[]).map(k => (
                <button key={k} onClick={() => setFpIdentity(k)} style={{
                  padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 13,
                  background: fpIdentity === k ? '#6366f1' : '#1e293b',
                  color: fpIdentity === k ? 'white' : '#94a3b8',
                }}>{IDENTITY_LABELS[k]}</button>
              ))}
            </div>

            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>a = {fpA}</label>
            <input type="range" min={1} max={12} value={fpA} onChange={e => setFpA(+e.target.value)} style={sliderStyle} />

            <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginTop: 12, marginBottom: 4 }}>b = {fpB}</label>
            <input type="range" min={1} max={fpIdentity === 'diff_of_sq' ? fpA - 1 : 10} value={fpB} onChange={e => setFpB(+e.target.value)} style={sliderStyle} />

            <div style={{ marginTop: 20, padding: 12, background: '#1e293b', borderRadius: 8 }}>
              <p style={{ color: '#a5b4fc', fontSize: 12, marginBottom: 4 }}>Result:</p>
              <p style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600 }}>{computeResult(fpIdentity, fpA, fpB)}</p>
            </div>
          </div>

          {/* Viz */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {renderViz(fpIdentity, fpA, fpB)}
          </div>
        </div>
      )}
    </LabShell>
  );
}
