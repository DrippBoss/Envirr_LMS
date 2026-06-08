import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

// ── Grid config ────────────────────────────────────────────────────────────────
const W = 400, H = 400;
const RANGE = 7;           // grid goes from -7 to +7
const CELL = W / (2 * RANGE);   // pixels per unit

function toSvg(mathX: number, mathY: number) {
  return { sx: W / 2 + mathX * CELL, sy: H / 2 - mathY * CELL };
}

// ── Challenges ─────────────────────────────────────────────────────────────────
interface Challenge {
  id: number;
  point: { x: number; y: number };
  label: string;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    point: { x: 3, y: 4 },
    label: 'A(3, 4)',
    question: 'Point A(3, 4) is plotted. Which quadrant is it in?',
    options: ['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV'],
    correct: 'Quadrant I',
    explanation: 'x = 3 > 0 and y = 4 > 0 → both positive → Quadrant I.',
  },
  {
    id: 2,
    point: { x: -5, y: 3 },
    label: 'B',
    question: 'What are the coordinates of point B?',
    options: ['(5, 3)', '(−5, 3)', '(3, −5)', '(−5, −3)'],
    correct: '(−5, 3)',
    explanation: 'The point is 5 units to the LEFT (x = −5) and 3 units UP (y = 3). Coordinates: (−5, 3).',
  },
  {
    id: 3,
    point: { x: 2, y: -6 },
    label: 'C(2, −6)',
    question: 'Point C(2, −6) is plotted. Which quadrant is it in?',
    options: ['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV'],
    correct: 'Quadrant IV',
    explanation: 'x = 2 > 0 and y = −6 < 0 → positive x, negative y → Quadrant IV.',
  },
  {
    id: 4,
    point: { x: 0, y: 4 },
    label: 'D(0, 4)',
    question: 'Where does point D(0, 4) lie?',
    options: ['On the x-axis', 'On the y-axis', 'In Quadrant I', 'In Quadrant II'],
    correct: 'On the y-axis',
    explanation: 'x = 0 → the point lies on the y-axis. All y-axis points have the form (0, y).',
  },
  {
    id: 5,
    point: { x: -3, y: -4 },
    label: 'E(−3, −4)',
    question: 'Point E(−3, −4) is plotted. What is the x-coordinate?',
    options: ['3', '−3', '−4', '4'],
    correct: '−3',
    explanation: 'The x-coordinate is the distance from the y-axis: 3 units to the LEFT, so x = −3.',
  },
];

const TAKEAWAY: Takeaway = {
  title: 'What you practised with the coordinate grid',
  points: [
    'Every point in a 2-D plane is uniquely described by an ordered pair (x, y).',
    'Quadrant I: (+, +)  |  Quadrant II: (−, +)  |  Quadrant III: (−, −)  |  Quadrant IV: (+, −)',
    'Points on the x-axis have y = 0; points on the y-axis have x = 0.',
    'The order in a coordinate pair matters: (−5, 3) ≠ (3, −5).',
    'The x-coordinate tells you how far to go left/right; y tells you up/down from the origin.',
  ],
};

// ── Grid SVG component ─────────────────────────────────────────────────────────
function CoordGrid({ point, label, showLabel }: { point: { x: number; y: number }; label: string; showLabel: boolean }) {
  const ticks = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];
  const { sx, sy } = toSvg(point.x, point.y);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }}>
      {/* Grid lines */}
      {ticks.map(n => (
        <g key={n}>
          <line x1={toSvg(n, 0).sx} y1={0} x2={toSvg(n, 0).sx} y2={H} stroke="#1e293b" strokeWidth={1} />
          <line x1={0} y1={toSvg(0, n).sy} x2={W} y2={toSvg(0, n).sy} stroke="#1e293b" strokeWidth={1} />
        </g>
      ))}
      {/* Axes */}
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#334155" strokeWidth={1.5} />
      <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#334155" strokeWidth={1.5} />
      {/* Axis arrows */}
      <polygon points={`${W - 2},${H / 2} ${W - 8},${H / 2 - 4} ${W - 8},${H / 2 + 4}`} fill="#334155" />
      <polygon points={`${W / 2},2 ${W / 2 - 4},8 ${W / 2 + 4},8`} fill="#334155" />
      {/* Axis labels */}
      <text x={W - 14} y={H / 2 - 8} fill="#475569" fontSize={12} fontWeight="700">x</text>
      <text x={W / 2 + 6} y={14} fill="#475569" fontSize={12} fontWeight="700">y</text>
      {/* Tick labels */}
      {[-6, -4, -2, 2, 4, 6].map(n => (
        <g key={n}>
          <text x={toSvg(n, 0).sx - 4} y={H / 2 + 16} fill="#374151" fontSize={9} textAnchor="middle">{n}</text>
          <text x={W / 2 + 5} y={toSvg(0, n).sy + 4} fill="#374151" fontSize={9}>{-n}</text>
        </g>
      ))}
      {/* Quadrant labels */}
      <text x={W * 0.75} y={H * 0.22} fill="#1e293b" fontSize={11} fontWeight="800" textAnchor="middle">Q-I</text>
      <text x={W * 0.25} y={H * 0.22} fill="#1e293b" fontSize={11} fontWeight="800" textAnchor="middle">Q-II</text>
      <text x={W * 0.25} y={H * 0.82} fill="#1e293b" fontSize={11} fontWeight="800" textAnchor="middle">Q-III</text>
      <text x={W * 0.75} y={H * 0.82} fill="#1e293b" fontSize={11} fontWeight="800" textAnchor="middle">Q-IV</text>
      {/* Dashed guide lines to axes */}
      {showLabel && <>
        <line x1={sx} y1={sy} x2={sx} y2={H / 2} stroke="#6366f1" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
        <line x1={sx} y1={sy} x2={W / 2} y2={sy} stroke="#6366f1" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      </>}
      {/* Origin */}
      <text x={W / 2 + 4} y={H / 2 + 14} fill="#374151" fontSize={9}>O</text>
      {/* The plotted point */}
      <circle cx={sx} cy={sy} r={7} fill="#6366f1" stroke="#0f172a" strokeWidth={2} />
      <circle cx={sx} cy={sy} r={3} fill="#fff" />
      {showLabel && (
        <text
          x={sx + (point.x >= 0 ? 11 : -11)}
          y={sy + (point.y >= 0 ? -10 : 18)}
          fill="#a5b4fc"
          fontSize={13}
          fontWeight="800"
          textAnchor={point.x >= 0 ? 'start' : 'end'}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

// ── Free-play grid ─────────────────────────────────────────────────────────────
function FreePlayGrid() {
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState<{ x: number; y: number } | null>(null);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * W;
    const rawY = ((e.clientY - rect.top) / rect.height) * H;
    const mathX = Math.round((rawX - W / 2) / CELL);
    const mathY = Math.round((H / 2 - rawY) / CELL);
    if (mathX >= -RANGE && mathX <= RANGE && mathY >= -RANGE && mathY <= RANGE) {
      setHover({ x: mathX, y: mathY });
    }
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * W;
    const rawY = ((e.clientY - rect.top) / rect.height) * H;
    const mathX = Math.round((rawX - W / 2) / CELL);
    const mathY = Math.round((H / 2 - rawY) / CELL);
    if (mathX >= -RANGE && mathX <= RANGE && mathY >= -RANGE && mathY <= RANGE) {
      setPinned({ x: mathX, y: mathY });
    }
  }

  const ticks = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];
  const activePoint = pinned ?? hover;

  function quadrant(x: number, y: number) {
    if (x === 0 || y === 0) return x === 0 && y === 0 ? 'Origin' : x === 0 ? 'y-axis' : 'x-axis';
    if (x > 0 && y > 0) return 'Quadrant I';
    if (x < 0 && y > 0) return 'Quadrant II';
    if (x < 0 && y < 0) return 'Quadrant III';
    return 'Quadrant IV';
  }

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'center' }}>
        Hover to preview · Click to pin a point
      </p>
      <svg
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
      >
        {ticks.map(n => (
          <g key={n}>
            <line x1={toSvg(n, 0).sx} y1={0} x2={toSvg(n, 0).sx} y2={H} stroke="#1e293b" strokeWidth={1} />
            <line x1={0} y1={toSvg(0, n).sy} x2={W} y2={toSvg(0, n).sy} stroke="#1e293b" strokeWidth={1} />
          </g>
        ))}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#334155" strokeWidth={1.5} />
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#334155" strokeWidth={1.5} />
        <polygon points={`${W - 2},${H / 2} ${W - 8},${H / 2 - 4} ${W - 8},${H / 2 + 4}`} fill="#334155" />
        <polygon points={`${W / 2},2 ${W / 2 - 4},8 ${W / 2 + 4},8`} fill="#334155" />
        <text x={W - 14} y={H / 2 - 8} fill="#475569" fontSize={12} fontWeight="700">x</text>
        <text x={W / 2 + 6} y={14} fill="#475569" fontSize={12} fontWeight="700">y</text>
        {[-6, -4, -2, 2, 4, 6].map(n => (
          <g key={n}>
            <text x={toSvg(n, 0).sx - 4} y={H / 2 + 16} fill="#374151" fontSize={9} textAnchor="middle">{n}</text>
            <text x={W / 2 + 5} y={toSvg(0, n).sy + 4} fill="#374151" fontSize={9}>{-n}</text>
          </g>
        ))}
        <text x={W / 2 + 4} y={H / 2 + 14} fill="#374151" fontSize={9}>O</text>

        {/* Hover crosshair */}
        {hover && (() => { const { sx, sy } = toSvg(hover.x, hover.y); return (
          <>
            <line x1={sx} y1={0} x2={sx} y2={H} stroke="#6366f1" strokeWidth={1} strokeDasharray="3,3" opacity={0.3} />
            <line x1={0} y1={sy} x2={W} y2={sy} stroke="#6366f1" strokeWidth={1} strokeDasharray="3,3" opacity={0.3} />
            <circle cx={sx} cy={sy} r={5} fill="#6366f1" opacity={0.5} />
          </>
        ); })()}

        {/* Pinned point */}
        {pinned && (() => { const { sx, sy } = toSvg(pinned.x, pinned.y); return (
          <>
            <line x1={sx} y1={sy} x2={sx} y2={H / 2} stroke="#10b981" strokeWidth={1} strokeDasharray="4,3" />
            <line x1={sx} y1={sy} x2={W / 2} y2={sy} stroke="#10b981" strokeWidth={1} strokeDasharray="4,3" />
            <circle cx={sx} cy={sy} r={7} fill="#10b981" stroke="#0f172a" strokeWidth={2} />
            <circle cx={sx} cy={sy} r={3} fill="#fff" />
          </>
        ); })()}
      </svg>

      {activePoint && (
        <div style={{ marginTop: '0.75rem', background: '#0f172a', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid #1e293b', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: pinned && activePoint === pinned ? '#10b981' : '#6366f1' }}>
            ({activePoint.x}, {activePoint.y})
          </span>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
            {quadrant(activePoint.x, activePoint.y)}
          </span>
          {pinned && activePoint === pinned && (
            <button onClick={() => setPinned(null)}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid #334155', borderRadius: 6, color: '#64748b', fontSize: '0.72rem', padding: '3px 8px', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Lab ───────────────────────────────────────────────────────────────────
export default function CoordinateGridLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);

  const allDone = completed.length === CHALLENGES.length;
  const current = CHALLENGES[cIdx];

  function check(opt: string) {
    if (status !== 'idle') return;
    setSelected(opt);
    if (opt === current.correct) {
      setStatus('correct');
      setCompleted(prev => [...prev, current.id]);
      setTimeout(() => {
        if (cIdx < CHALLENGES.length - 1) {
          setCIdx(i => i + 1);
          setSelected(null);
          setStatus('idle');
          setShowHint(false);
        }
      }, 1100);
    } else {
      setStatus('wrong');
      setTimeout(() => { setStatus('idle'); setSelected(null); }, 1200);
    }
  }

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ completed }}
    >
      <div style={{ maxWidth: 500, margin: '0 auto', paddingBottom: '1rem' }}>

        {/* Progress bar */}
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
            <span style={{ background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '0.75rem' }}>
              Challenge {cIdx + 1}
            </span>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>
              {current.question}
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <CoordGrid point={current.point} label={current.label} showLabel={current.id !== 2} />
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {current.options.map(opt => {
                const isSelected = selected === opt;
                const isCorrect = status === 'correct' && isSelected;
                const isWrong = status === 'wrong' && isSelected;
                return (
                  <button key={opt} onClick={() => check(opt)} disabled={status !== 'idle'} style={{
                    padding: '0.65rem 0.5rem',
                    background: isCorrect ? '#052e16' : isWrong ? '#2d0000' : '#0f172a',
                    border: `2px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#334155'}`,
                    borderRadius: 10, color: '#f1f5f9',
                    fontWeight: 700, fontSize: '0.85rem', cursor: status === 'idle' ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {status === 'correct' && (
              <p style={{ color: '#10b981', fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                ✓ Correct! {current.explanation}
              </p>
            )}
            {status === 'wrong' && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                Not quite — look at the signs of x and y carefully.
              </p>
            )}

            <button onClick={() => setShowHint(h => !h)}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                💡 Quadrant signs: Q-I (+,+) | Q-II (−,+) | Q-III (−,−) | Q-IV (+,−)
              </p>
            )}
          </div>
        ) : (
          <div style={{ background: '#052e16', border: '2px solid #10b981', borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
              🎯 All challenges done! Explore the grid freely below.
            </p>
          </div>
        )}

        {/* Free-play */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: '1.25rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Free Explorer — Click anywhere on the grid
          </p>
          <FreePlayGrid />
        </div>
      </div>
    </LabShell>
  );
}
