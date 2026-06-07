import { useState, useRef } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

// ── Grid config ────────────────────────────────────────────────────────────────
const W = 420, H = 360;
const RANGE = 10;
const CELL = W / (2 * RANGE);

function toSvg(mx: number, my: number) {
  return { sx: W / 2 + mx * CELL, sy: H / 2 - my * CELL };
}
function toMath(sx: number, sy: number) {
  return { mx: Math.round((sx - W / 2) / CELL), my: Math.round((H / 2 - sy) / CELL) };
}
function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
function fmtDist(d: number) {
  const sq = Math.round(d * d);
  if (Math.abs(d - Math.round(d)) < 0.001) return `${Math.round(d)}`;
  return `√${sq}`;
}

// ── Challenges ─────────────────────────────────────────────────────────────────
type ChallengeType = 'distance' | 'collinear' | 'rightangle';

interface Challenge {
  id: number;
  type: ChallengeType;
  points: { x: number; y: number; label: string }[];
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  hint: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    type: 'distance',
    points: [
      { x: 3, y: 4, label: 'A(3, 4)' },
      { x: 7, y: 1, label: 'D(7, 1)' },
    ],
    question: 'What is the distance between A(3, 4) and D(7, 1)?',
    options: ['4 units', '5 units', '7 units', '√50 units'],
    correct: '5 units',
    hint: 'Horizontal leg: 7−3=4. Vertical leg: 4−1=3. Distance = √(4²+3²) = √25 = 5.',
    explanation: 'AD = √[(7−3)²+(1−4)²] = √[16+9] = √25 = 5. A classic 3-4-5 right triangle!',
  },
  {
    id: 2,
    type: 'distance',
    points: [
      { x: 0, y: 0, label: 'O(0, 0)' },
      { x: 5, y: 12, label: 'P(5, 12)' },
    ],
    question: 'What is the distance from the origin O(0, 0) to P(5, 12)?',
    options: ['13 units', '17 units', '√119 units', '7 units'],
    correct: '13 units',
    hint: 'OP = √(5²+12²) = √(25+144) = √169. What is √169?',
    explanation: 'OP = √(25+144) = √169 = 13 units. (5, 12, 13) is a Pythagorean triple.',
  },
  {
    id: 3,
    type: 'collinear',
    points: [
      { x: -3, y: -4, label: 'M(−3,−4)' },
      { x: 0, y: 0, label: 'A(0,0)' },
      { x: 6, y: 8, label: 'G(6,8)' },
    ],
    question: 'MA = 5, AG = 10, MG = 15. Are M(−3,−4), A(0,0), G(6,8) collinear?',
    options: ['Yes — MA + AG = MG', 'No — they form a triangle', 'Cannot tell without a graph', 'No — MA + MG ≠ AG'],
    correct: 'Yes — MA + AG = MG',
    hint: '5 + 10 = 15 = MG. The sum of two smaller distances equals the largest.',
    explanation: 'MA + AG = 5 + 10 = 15 = MG. Point A lies between M and G on the same line → collinear.',
  },
  {
    id: 4,
    type: 'rightangle',
    points: [
      { x: 0, y: 0, label: 'A(0,0)' },
      { x: 3, y: 0, label: 'B(3,0)' },
      { x: 0, y: 4, label: 'C(0,4)' },
    ],
    question: 'AB = 3, AC = 4, BC = 5. Is triangle ABC right-angled? If yes, where is the right angle?',
    options: ['No — not right-angled', 'Yes — right angle at A', 'Yes — right angle at B', 'Yes — right angle at C'],
    correct: 'Yes — right angle at A',
    hint: 'Check: AB² + AC² = 9 + 16 = 25 = BC². The right angle is at A (opposite the hypotenuse BC).',
    explanation: '3² + 4² = 5² ✓. By the converse of Baudhāyana–Pythagoras, right angle is at A — the vertex between the two legs.',
  },
  {
    id: 5,
    type: 'distance',
    points: [
      { x: 2, y: 1, label: 'A(2,1)' },
      { x: -1, y: 2, label: 'B(−1,2)' },
    ],
    question: 'The distance between A(2, 1) and B(−1, 2) is √___ units. Choose the correct value.',
    options: ['√5', '√10', '√14', '√20'],
    correct: '√10',
    hint: 'Horizontal shift: 2−(−1)=3. Vertical shift: 1−2=−1. Distance = √(3²+1²) = √(9+1).',
    explanation: 'AB = √[(2−(−1))²+(1−2)²] = √[9+1] = √10 units.',
  },
];

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about distances and coordinates',
  points: [
    'Distance formula: d = √[(x₂−x₁)² + (y₂−y₁)²] — derived from the Baudhāyana–Pythagoras theorem.',
    'Squaring eliminates the sign: (x₂−x₁)² = (x₁−x₂)², so direction doesn\'t matter.',
    'Three points are collinear iff the largest distance equals the sum of the other two.',
    'A triangle is right-angled iff a² + b² = c² (converse of Pythagoras). The right angle is at the vertex opposite c.',
    'Special case: distance from origin to (x, y) = √(x²+y²).',
  ],
};

// ── Two-point distance grid ────────────────────────────────────────────────────
function TwoPointGrid({ pts, showTriangle }: { pts: { x: number; y: number; label: string }[]; showTriangle: boolean }) {
  const ticks = [-8, -6, -4, -2, 2, 4, 6, 8];
  const colors = ['#6366f1', '#f59e0b', '#10b981'];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }}>
      {/* Grid */}
      {Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE).map(n => (
        <g key={n}>
          <line x1={toSvg(n, 0).sx} y1={0} x2={toSvg(n, 0).sx} y2={H} stroke="#1e293b" strokeWidth={n === 0 ? 1.5 : 0.7} />
          <line x1={0} y1={toSvg(0, n).sy} x2={W} y2={toSvg(0, n).sy} stroke="#1e293b" strokeWidth={n === 0 ? 1.5 : 0.7} />
        </g>
      ))}
      {/* Axes */}
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#334155" strokeWidth={1.5} />
      <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#334155" strokeWidth={1.5} />
      <polygon points={`${W - 2},${H / 2} ${W - 8},${H / 2 - 4} ${W - 8},${H / 2 + 4}`} fill="#334155" />
      <polygon points={`${W / 2},2 ${W / 2 - 4},8 ${W / 2 + 4},8`} fill="#334155" />
      <text x={W - 12} y={H / 2 - 7} fill="#475569" fontSize={11} fontWeight="700">x</text>
      <text x={W / 2 + 5} y={12} fill="#475569" fontSize={11} fontWeight="700">y</text>
      {ticks.map(n => (
        <g key={n}>
          <text x={toSvg(n, 0).sx} y={H / 2 + 14} fill="#374151" fontSize={8} textAnchor="middle">{n}</text>
          <text x={W / 2 + 4} y={toSvg(0, n).sy + 3} fill="#374151" fontSize={8}>{-n}</text>
        </g>
      ))}
      <text x={W / 2 + 4} y={H / 2 + 14} fill="#374151" fontSize={8}>O</text>

      {/* Right-angle helper triangle for 2-point challenges */}
      {showTriangle && pts.length === 2 && (() => {
        const p1 = toSvg(pts[0].x, pts[0].y);
        const p2 = toSvg(pts[1].x, pts[1].y);
        const corner = toSvg(pts[1].x, pts[0].y);  // right-angle corner
        return (
          <>
            <line x1={p1.sx} y1={p1.sy} x2={corner.sx} y2={corner.sy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
            <line x1={corner.sx} y1={corner.sy} x2={p2.sx} y2={p2.sy} stroke="#10b981" strokeWidth={1.5} strokeDasharray="5,3" />
            <rect x={corner.sx - 5} y={corner.sy - 5} width={8} height={8} fill="none" stroke="#475569" strokeWidth={1} />
            <text x={(p1.sx + corner.sx) / 2} y={corner.sy + 14} fill="#f59e0b" fontSize={10} textAnchor="middle" fontWeight="700">
              |x₂−x₁| = {Math.abs(pts[1].x - pts[0].x)}
            </text>
            <text x={corner.sx + 8} y={(corner.sy + p2.sy) / 2} fill="#10b981" fontSize={10} fontWeight="700">
              |y₂−y₁| = {Math.abs(pts[1].y - pts[0].y)}
            </text>
          </>
        );
      })()}

      {/* Connecting line */}
      {pts.length >= 2 && (() => {
        const p1 = toSvg(pts[0].x, pts[0].y);
        const p2 = toSvg(pts[1].x, pts[1].y);
        return <line x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy} stroke="#6366f1" strokeWidth={2} strokeDasharray={pts.length === 3 ? undefined : '6,3'} />;
      })()}
      {pts.length === 3 && (() => {
        const p2 = toSvg(pts[1].x, pts[1].y);
        const p3 = toSvg(pts[2].x, pts[2].y);
        return <line x1={p2.sx} y1={p2.sy} x2={p3.sx} y2={p3.sy} stroke="#6366f1" strokeWidth={2} />;
      })()}
      {pts.length === 3 && (() => {
        const p1 = toSvg(pts[0].x, pts[0].y);
        const p3 = toSvg(pts[2].x, pts[2].y);
        return <line x1={p1.sx} y1={p1.sy} x2={p3.sx} y2={p3.sy} stroke="#6366f1" strokeWidth={2} />;
      })()}

      {/* Points */}
      {pts.map((p, i) => {
        const { sx, sy } = toSvg(p.x, p.y);
        const col = colors[i % colors.length];
        const labelX = sx + (p.x >= 0 ? 11 : -11);
        const labelY = sy + (p.y >= 0 ? -10 : 18);
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r={7} fill={col} stroke="#0f172a" strokeWidth={2} />
            <circle cx={sx} cy={sy} r={3} fill="#fff" />
            <text x={labelX} y={labelY} fill={col} fontSize={11} fontWeight="800" textAnchor={p.x >= 0 ? 'start' : 'end'}>
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Free-play: drag two points, see live distance ──────────────────────────────
function FreePlayDistance() {
  const [ptA, setPtA] = useState({ x: -4, y: 3 });
  const [ptB, setPtB] = useState({ x: 3, y: -2 });
  const dragging = useRef<'A' | 'B' | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function getSvgCoords(e: React.MouseEvent | React.TouchEvent) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rawX = ((clientX - rect.left) / rect.width) * W;
    const rawY = ((clientY - rect.top) / rect.height) * H;
    const { mx, my } = toMath(rawX, rawY);
    return { x: Math.max(-RANGE, Math.min(RANGE, mx)), y: Math.max(-RANGE, Math.min(RANGE, my)) };
  }

  function onMouseDown(pt: 'A' | 'B') { return () => { dragging.current = pt; }; }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const c = getSvgCoords(e);
    if (!c) return;
    if (dragging.current === 'A') setPtA(c);
    else setPtB(c);
  }
  function onMouseUp() { dragging.current = null; }

  const d = dist(ptA.x, ptA.y, ptB.x, ptB.y);
  const dStr = fmtDist(d);
  const dx = Math.abs(ptB.x - ptA.x);
  const dy = Math.abs(ptB.y - ptA.y);
  const ticks = [-8, -6, -4, -2, 2, 4, 6, 8];

  const { sx: ax, sy: ay } = toSvg(ptA.x, ptA.y);
  const { sx: bx, sy: by } = toSvg(ptB.x, ptB.y);
  const { sx: cx, sy: cy } = toSvg(ptB.x, ptA.y);

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'center' }}>
        Drag either point to see the distance update live
      </p>
      <svg
        ref={svgRef}
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', cursor: dragging.current ? 'grabbing' : 'default', touchAction: 'none' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE).map(n => (
          <g key={n}>
            <line x1={toSvg(n, 0).sx} y1={0} x2={toSvg(n, 0).sx} y2={H} stroke="#1e293b" strokeWidth={n === 0 ? 1.5 : 0.7} />
            <line x1={0} y1={toSvg(0, n).sy} x2={W} y2={toSvg(0, n).sy} stroke="#1e293b" strokeWidth={n === 0 ? 1.5 : 0.7} />
          </g>
        ))}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#334155" strokeWidth={1.5} />
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#334155" strokeWidth={1.5} />
        {ticks.map(n => (
          <g key={n}>
            <text x={toSvg(n, 0).sx} y={H / 2 + 14} fill="#374151" fontSize={8} textAnchor="middle">{n}</text>
            <text x={W / 2 + 4} y={toSvg(0, n).sy + 3} fill="#374151" fontSize={8}>{-n}</text>
          </g>
        ))}

        {/* Helper triangle */}
        <line x1={ax} y1={ay} x2={cx} y2={cy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
        <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#10b981" strokeWidth={1.5} strokeDasharray="5,3" />
        {dx > 0 && dy > 0 && <rect x={cx - 5} y={cy - 5} width={8} height={8} fill="none" stroke="#475569" strokeWidth={1} />}

        {/* Hypotenuse */}
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#6366f1" strokeWidth={2.5} />

        {/* Mid-label on hypotenuse */}
        <text x={(ax + bx) / 2 + 6} y={(ay + by) / 2 - 6} fill="#a5b4fc" fontSize={12} fontWeight="800">{dStr}</text>

        {/* Leg labels */}
        {dx > 0 && <text x={(ax + cx) / 2} y={cy + 14} fill="#f59e0b" fontSize={10} textAnchor="middle" fontWeight="700">{dx}</text>}
        {dy > 0 && <text x={cx + 6} y={(cy + by) / 2 + 3} fill="#10b981" fontSize={10} fontWeight="700">{dy}</text>}

        {/* Point A */}
        <circle cx={ax} cy={ay} r={10} fill="transparent" style={{ cursor: 'grab' }} onMouseDown={onMouseDown('A')} />
        <circle cx={ax} cy={ay} r={7} fill="#6366f1" stroke="#0f172a" strokeWidth={2} style={{ pointerEvents: 'none' }} />
        <circle cx={ax} cy={ay} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
        <text x={ax + (ptA.x >= 0 ? 11 : -11)} y={ay - 10} fill="#a5b4fc" fontSize={11} fontWeight="800"
          textAnchor={ptA.x >= 0 ? 'start' : 'end'} style={{ pointerEvents: 'none' }}>
          A({ptA.x},{ptA.y})
        </text>

        {/* Point B */}
        <circle cx={bx} cy={by} r={10} fill="transparent" style={{ cursor: 'grab' }} onMouseDown={onMouseDown('B')} />
        <circle cx={bx} cy={by} r={7} fill="#f59e0b" stroke="#0f172a" strokeWidth={2} style={{ pointerEvents: 'none' }} />
        <circle cx={bx} cy={by} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
        <text x={bx + (ptB.x >= 0 ? 11 : -11)} y={by + 18} fill="#fde68a" fontSize={11} fontWeight="800"
          textAnchor={ptB.x >= 0 ? 'start' : 'end'} style={{ pointerEvents: 'none' }}>
          B({ptB.x},{ptB.y})
        </text>
      </svg>

      {/* Formula breakdown */}
      <div style={{ marginTop: '0.75rem', background: '#0f172a', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid #1e293b', fontFamily: 'monospace', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.7 }}>
        <span style={{ color: '#a5b4fc', fontWeight: 800 }}>d</span> = √[
        (<span style={{ color: '#f59e0b' }}>{ptB.x}</span>−<span style={{ color: '#6366f1' }}>{ptA.x}</span>)² + (
        <span style={{ color: '#10b981' }}>{ptB.y}</span>−<span style={{ color: '#6366f1' }}>{ptA.y}</span>)²] = √[
        <span style={{ color: '#f59e0b' }}>{dx}²</span>+<span style={{ color: '#10b981' }}>{dy}²</span>] = √
        {dx * dx + dy * dy} = <span style={{ color: '#a5b4fc', fontWeight: 800 }}>{dStr}</span>
        {Number.isInteger(d) ? ' units' : ' units (exact)'}
      </div>
    </div>
  );
}

// ── Main Lab ───────────────────────────────────────────────────────────────────
export default function DistanceExplorerLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showTriangle, setShowTriangle] = useState(false);

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
          setShowTriangle(false);
        }
      }, 1200);
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
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '1rem' }}>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {current.type === 'distance' ? '📏 Distance' : current.type === 'collinear' ? '📐 Collinearity' : '📐 Right Triangle'}
              </span>
            </div>

            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>
              {current.question}
            </p>

            {/* Grid */}
            <div style={{ marginBottom: '0.75rem' }}>
              <TwoPointGrid pts={current.points} showTriangle={showTriangle && current.type === 'distance'} />
            </div>

            {current.type === 'distance' && (
              <button
                onClick={() => setShowTriangle(t => !t)}
                style={{ marginBottom: '0.75rem', background: 'none', border: '1px solid #334155', borderRadius: 6, color: '#64748b', fontSize: '0.72rem', padding: '4px 10px', cursor: 'pointer' }}>
                {showTriangle ? 'Hide' : 'Show'} right triangle
              </button>
            )}

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {current.options.map(opt => {
                const isSel = selected === opt;
                const isOk = status === 'correct' && isSel;
                const isBad = status === 'wrong' && isSel;
                return (
                  <button key={opt} onClick={() => check(opt)} disabled={status !== 'idle'} style={{
                    padding: '0.65rem 0.5rem',
                    background: isOk ? '#052e16' : isBad ? '#2d0000' : '#0f172a',
                    border: `2px solid ${isOk ? '#10b981' : isBad ? '#ef4444' : '#334155'}`,
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
                ✓ {current.explanation}
              </p>
            )}
            {status === 'wrong' && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                Not quite — try applying the formula carefully.
              </p>
            )}

            <button onClick={() => setShowHint(h => !h)}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
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
              🎯 All challenges done! Explore the distance formula freely below.
            </p>
          </div>
        )}

        {/* Free-play */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: '1.25rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Free Explorer — Drag Points A & B
          </p>
          <FreePlayDistance />
        </div>
      </div>
    </LabShell>
  );
}
