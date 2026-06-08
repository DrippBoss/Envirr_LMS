import React, { useState, useCallback } from 'react';
import LabShell from '../LabShell';
import type { LabProps } from '../LabDispatcher';

// ── Types ────────────────────────────────────────────────────────────────────
interface MatchPair {
  expression: string;
  factored: string;
  identity: string;
}

interface Level {
  id: number;
  title: string;
  instruction: string;
  pairs: MatchPair[];
}

// ── Data ─────────────────────────────────────────────────────────────────────
const LEVELS: Level[] = [
  {
    id: 1,
    title: 'Perfect Squares',
    instruction: 'Match each expression with its factored form using (a±b)².',
    pairs: [
      { expression: 'x² + 6x + 9',   factored: '(x + 3)²',   identity: '(a+b)²' },
      { expression: 'x² − 10x + 25', factored: '(x − 5)²',   identity: '(a−b)²' },
      { expression: '4x² + 12x + 9', factored: '(2x + 3)²',  identity: '(a+b)²' },
      { expression: '9y² − 24y + 16', factored: '(3y − 4)²', identity: '(a−b)²' },
    ],
  },
  {
    id: 2,
    title: 'Difference of Squares',
    instruction: 'Match using (a+b)(a−b) = a² − b².',
    pairs: [
      { expression: 'x² − 16',      factored: '(x+4)(x−4)',    identity: 'a²−b²' },
      { expression: '9x² − 25',     factored: '(3x+5)(3x−5)',  identity: 'a²−b²' },
      { expression: '4a² − 49b²',   factored: '(2a+7b)(2a−7b)', identity: 'a²−b²' },
      { expression: '100 − y²',     factored: '(10+y)(10−y)',  identity: 'a²−b²' },
    ],
  },
  {
    id: 3,
    title: 'Cubic Identities',
    instruction: 'Match using (a+b)³ and (a−b)³ identities.',
    pairs: [
      { expression: 'x³ + 3x² + 3x + 1',  factored: '(x + 1)³',  identity: '(a+b)³' },
      { expression: 'x³ − 6x² + 12x − 8', factored: '(x − 2)³',  identity: '(a−b)³' },
      { expression: '8a³ + 12a²b + 6ab² + b³', factored: '(2a + b)³', identity: '(a+b)³' },
      { expression: 'a³ + b³',             factored: '(a+b)(a²−ab+b²)', identity: 'sum of cubes' },
    ],
  },
  {
    id: 4,
    title: 'Mixed Challenge',
    instruction: 'Identify the identity and match — all types mixed.',
    pairs: [
      { expression: 'x² − y²',          factored: '(x+y)(x−y)',       identity: 'a²−b²' },
      { expression: 'x² + 2xy + y²',    factored: '(x + y)²',         identity: '(a+b)²' },
      { expression: 'a³ − b³',          factored: '(a−b)(a²+ab+b²)',  identity: 'diff of cubes' },
      { expression: '(a+b+c)²',         factored: 'a²+b²+c²+2ab+2bc+2ca', identity: '3-term sq.' },
    ],
  },
];

const TAKEAWAY = {
  title: 'Factorization — Key Insights',
  points: [
    'x² + 2ax + a² = (x+a)² — look for perfect square trinomials',
    'a² − b² = (a+b)(a−b) — any difference of squares factorises',
    'a³ + b³ = (a+b)(a²−ab+b²) — sum of cubes always factors',
    'a³ − b³ = (a−b)(a²+ab+b²) — difference of cubes always factors',
    'Recognising the identity pattern is the key skill, not memorising formulas',
    'Every quadratic perfect square has no middle mixed term after factoring',
  ],
};

// ── Shuffle helper ────────────────────────────────────────────────────────────
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Match Game Component ──────────────────────────────────────────────────────
function MatchGame({ level, onComplete }: { level: Level; onComplete: () => void }) {
  const [leftShuffle] = useState(() => shuffled(level.pairs));
  const [rightShuffle] = useState(() => shuffled(level.pairs));
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);

  const tryMatch = useCallback((expr: string, fact: string) => {
    const pair = level.pairs.find(p => p.expression === expr && p.factored === fact);
    if (pair) {
      setMatched(prev => {
        const next = new Set(prev);
        next.add(expr);
        if (next.size === level.pairs.length) setTimeout(onComplete, 600);
        return next;
      });
      setWrong([]);
    } else {
      setWrong([expr, fact]);
      setTimeout(() => setWrong([]), 900);
    }
    setSelectedLeft(null);
    setSelectedRight(null);
  }, [level.pairs, onComplete]);

  const handleLeft = (expr: string) => {
    if (matched.has(expr)) return;
    if (selectedLeft === expr) { setSelectedLeft(null); return; }
    setSelectedLeft(expr);
    if (selectedRight) tryMatch(expr, selectedRight);
  };

  const handleRight = (fact: string) => {
    const ownerPair = level.pairs.find(p => p.factored === fact);
    if (ownerPair && matched.has(ownerPair.expression)) return;
    if (selectedRight === fact) { setSelectedRight(null); return; }
    setSelectedRight(fact);
    if (selectedLeft) tryMatch(selectedLeft, fact);
  };

  const btnStyle = (key: string, isLeft: boolean): React.CSSProperties => {
    const ownerExpr = isLeft ? key : (level.pairs.find(p => p.factored === key)?.expression ?? key);
    const isMatched = matched.has(ownerExpr);
    const isSelected = isLeft ? selectedLeft === key : selectedRight === key;
    const isWrong = wrong.includes(key);
    return {
      padding: '10px 14px', borderRadius: 10, border: `2px solid ${isMatched ? '#10b981' : isWrong ? '#ef4444' : isSelected ? '#818cf8' : '#334155'}`,
      background: isMatched ? '#064e3b' : isWrong ? '#450a0a' : isSelected ? '#1e1b4b' : '#1e293b',
      color: isMatched ? '#6ee7b7' : isWrong ? '#fca5a5' : isSelected ? '#a5b4fc' : '#cbd5e1',
      cursor: isMatched ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'center',
      transition: 'all 0.15s', opacity: isMatched ? 0.8 : 1,
    };
  };

  return (
    <div>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>{level.instruction}</p>
      <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>Click one from each column to match. {matched.size}/{level.pairs.length} matched.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ color: '#6366f1', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>EXPRESSIONS</p>
          {leftShuffle.map(p => (
            <button key={p.expression} onClick={() => handleLeft(p.expression)} style={btnStyle(p.expression, true)}>
              {p.expression}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ color: '#10b981', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>FACTORED FORMS</p>
          {rightShuffle.map(p => (
            <button key={p.factored} onClick={() => handleRight(p.factored)} style={btnStyle(p.factored, false)}>
              {p.factored}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Identity Reference Card ───────────────────────────────────────────────────
function ReferenceCard() {
  const identities = [
    { name: '(a+b)²', expansion: 'a² + 2ab + b²', color: '#6366f1' },
    { name: '(a−b)²', expansion: 'a² − 2ab + b²', color: '#8b5cf6' },
    { name: '(a+b)(a−b)', expansion: 'a² − b²', color: '#f59e0b' },
    { name: '(a+b+c)²', expansion: 'a²+b²+c²+2ab+2bc+2ca', color: '#10b981' },
    { name: '(a+b)³', expansion: 'a³+3a²b+3ab²+b³', color: '#06b6d4' },
    { name: '(a−b)³', expansion: 'a³−3a²b+3ab²−b³', color: '#3b82f6' },
    { name: 'a³+b³', expansion: '(a+b)(a²−ab+b²)', color: '#ec4899' },
    { name: 'a³−b³', expansion: '(a−b)(a²+ab+b²)', color: '#ef4444' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {identities.map(id => (
        <div key={id.name} style={{ padding: '10px 14px', borderRadius: 10, background: '#0f172a', border: `1.5px solid ${id.color}30` }}>
          <p style={{ color: id.color, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{id.name}</p>
          <p style={{ color: '#cbd5e1', fontSize: 12 }}>= {id.expansion}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FactorizationExplorerLab({ nodeTitle, xpReward, onComplete }: LabProps) {
  const [tab, setTab] = useState<'game' | 'reference'>('game');
  const [levelIdx, setLevelIdx] = useState(0);
  const [levelsDone, setLevelsDone] = useState<boolean[]>(new Array(LEVELS.length).fill(false));
  const [showTakeaway, setShowTakeaway] = useState(false);
  const [key, setKey] = useState(0);

  const allDone = levelsDone.every(Boolean);

  function handleLevelComplete() {
    const next = levelsDone.map((v, i) => (i === levelIdx ? true : v));
    setLevelsDone(next);
    if (next.every(Boolean)) {
      setTimeout(() => setShowTakeaway(true), 500);
    } else {
      const nextIdx = next.findIndex(v => !v);
      if (nextIdx !== -1) { setLevelIdx(nextIdx); setKey(k => k + 1); }
    }
  }

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      badgeLabel="FACTORIZATION LAB"
      onSaveFinish={() => onComplete({ levels: levelsDone.filter(Boolean).length })}
      showTakeaway={showTakeaway}
      takeaway={TAKEAWAY}
      onDismissTakeaway={() => { setShowTakeaway(false); onComplete({ levels: LEVELS.length }); }}
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['game', 'reference'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: tab === t ? '#6366f1' : '#1e293b',
            color: tab === t ? 'white' : '#94a3b8',
          }}>{t === 'game' ? `Match Game (${levelsDone.filter(Boolean).length}/${LEVELS.length})` : 'Identity Reference'}</button>
        ))}
      </div>

      {tab === 'reference' && <ReferenceCard />}

      {tab === 'game' && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
          {/* Level selector */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LEVELS.map((lv, i) => (
              <button key={lv.id} onClick={() => { setLevelIdx(i); setKey(k => k + 1); }} style={{
                padding: '10px 12px', borderRadius: 10, border: `2px solid ${levelsDone[i] ? '#10b981' : i === levelIdx ? '#6366f1' : '#334155'}`,
                background: levelsDone[i] ? '#064e3b' : i === levelIdx ? '#1e1b4b' : '#1e293b',
                color: levelsDone[i] ? '#6ee7b7' : i === levelIdx ? '#a5b4fc' : '#94a3b8',
                cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600,
              }}>
                {levelsDone[i] ? '✓ ' : ''}{lv.title}
              </button>
            ))}

            {allDone && (
              <button onClick={() => setShowTakeaway(true)} style={{ marginTop: 8, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #6366f1)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Key Insights
              </button>
            )}
          </div>

          {/* Game area */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 700 }}>Level {levelIdx + 1}: {LEVELS[levelIdx].title}</h3>
            </div>
            <MatchGame key={`${levelIdx}-${key}`} level={LEVELS[levelIdx]} onComplete={handleLevelComplete} />
          </div>
        </div>
      )}
    </LabShell>
  );
}
