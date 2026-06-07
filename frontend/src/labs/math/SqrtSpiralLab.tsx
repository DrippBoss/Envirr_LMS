import { useState, useMemo } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

// ── Spiral geometry ────────────────────────────────────────────────────────────
const W = 480, H = 480;
const CX = 240, CY = 240;
const SCALE = 55;
const MAX_TRIANGLES = 15;

interface SpiralPoint {
  x: number;
  y: number;
}

/** Pre-compute all outer points of the spiral (points[0] to points[MAX_TRIANGLES]).
 *  points[k] is the outer vertex after triangle k has been built.
 *  Triangle k uses: center, points[k-1], points[k]  (1-indexed k from 1..MAX_TRIANGLES)
 */
function buildSpiralPoints(): SpiralPoint[] {
  const pts: SpiralPoint[] = [];
  // points[0]: distance 1 from center along positive x-axis
  pts.push({ x: CX + SCALE, y: CY });
  let angle = 0;
  for (let k = 1; k <= MAX_TRIANGLES; k++) {
    angle += Math.atan2(1, Math.sqrt(k));
    const r = Math.sqrt(k + 1) * SCALE;
    pts.push({ x: CX + r * Math.cos(-angle), y: CY + r * Math.sin(-angle) });
  }
  return pts;
}

const SPIRAL_POINTS = buildSpiralPoints();

/** HSL color for triangle k (1-indexed) */
function triColor(k: number): string {
  const hue = (k * 25) % 360;
  return `hsl(${hue}, 85%, 62%)`;
}

/** Format the hypotenuse label for triangle k: hypotenuse = √(k+1) */
function hypLabel(k: number): string {
  const n = k + 1;
  const sq = Math.round(Math.sqrt(n));
  if (sq * sq === n) return `${sq}`;         // perfect square → integer
  return `√${n}`;                        // √n
}

/** Is n a perfect square? */
function isPerfectSquare(n: number): boolean {
  const sq = Math.round(Math.sqrt(n));
  return sq * sq === n;
}

// ── Spiral SVG component ───────────────────────────────────────────────────────
interface SpiralSVGProps {
  count: number;         // how many triangles to draw (1..MAX_TRIANGLES)
  highlightLast?: boolean;
}

function SpiralSVG({ count, highlightLast }: SpiralSVGProps) {
  const center = { x: CX, y: CY };

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{
        display: 'block',
        borderRadius: 12,
        background: '#0f172a',
        border: '1px solid #1e293b',
      }}
    >
      {/* Subtle radial glow at center */}
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="15%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={70} fill="url(#centerGlow)" />

      {/* Draw triangles from 1..count */}
      {Array.from({ length: count }, (_, i) => {
        const k = i + 1;                        // triangle index (1-based)
        const color = triColor(k);
        const isLast = highlightLast && k === count;
        const p0 = SPIRAL_POINTS[k - 1];       // inner outer point
        const p1 = SPIRAL_POINTS[k];            // outer outer point

        const triPts = `${center.x},${center.y} ${p0.x},${p0.y} ${p1.x},${p1.y}`;

        // Midpoint of the outer edge (the "1 unit" leg between p0 and p1)
        const edgeMidX = (p0.x + p1.x) / 2;
        const edgeMidY = (p0.y + p1.y) / 2;

        // Label position: nudge the outer point label outward from center
        const dx = p1.x - CX;
        const dy = p1.y - CY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const labelX = p1.x + (dx / len) * 14;
        const labelY = p1.y + (dy / len) * 14;

        return (
          <g key={k}>
            {/* Triangle fill */}
            <polygon
              points={triPts}
              fill={color}
              fillOpacity={isLast ? 0.28 : 0.13}
              stroke={color}
              strokeWidth={isLast ? 2.2 : 1.4}
              strokeLinejoin="round"
            />

            {/* Outer "1 unit" edge highlight */}
            <line
              x1={p0.x} y1={p0.y}
              x2={p1.x} y2={p1.y}
              stroke="#ffffff"
              strokeWidth={isLast ? 2 : 1.2}
              strokeOpacity={isLast ? 0.9 : 0.5}
            />

            {/* "1" label on the outer edge — only show on last triangle for clarity */}
            {isLast && (
              <text
                x={edgeMidX + (p1.x - p0.x) * 0.0 + (p1.y - p0.y > 0 ? 5 : -5)}
                y={edgeMidY + (p0.x - p1.x) * 0.0 + (p1.x - p0.x > 0 ? -5 : 5)}
                fill="#cbd5e1"
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
              >
                1
              </text>
            )}

            {/* Hypotenuse label at outer point */}
            <text
              x={labelX}
              y={labelY}
              fill={isPerfectSquare(k + 1) ? '#fde68a' : color}
              fontSize={9.5}
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {hypLabel(k)}
            </text>
          </g>
        );
      })}

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={4} fill="#ffffff" />
      <circle cx={CX} cy={CY} r={2} fill="#0f172a" />

      {/* First outer point dot (leg 1 start) */}
      {count > 0 && (
        <circle cx={SPIRAL_POINTS[0].x} cy={SPIRAL_POINTS[0].y} r={2.5} fill="#94a3b8" />
      )}
    </svg>
  );
}

// ── Challenges ─────────────────────────────────────────────────────────────────
interface Challenge {
  id: number;
  trianglesShown: number;   // how many triangles to render in SVG
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  hint: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    trianglesShown: 1,
    question:
      'We draw a right triangle with both legs = 1 unit. The hypotenuse is √(1² + 1²) = ?',
    options: ['√3', '√2', '2', '1.5'],
    correct: '√2',
    explanation:
      'By the Baudhāyana-Pythagoras theorem: 1² + 1² = 2, so hypotenuse = √2 ≈ 1.414.',
    hint:
      'Add the squares of both legs: 1² + 1² = 1 + 1 = 2. Take the square root.',
  },
  {
    id: 2,
    trianglesShown: 2,
    question:
      'We use the previous hypotenuse (√2) as one leg, and add another leg of 1. The new hypotenuse = √(√2² + 1²) = ?',
    options: ['√5', '√3', '√4', '2'],
    correct: '√3',
    explanation:
      '(√2)² + 1² = 2 + 1 = 3. So the new hypotenuse = √3 ≈ 1.732.',
    hint:
      'Remember: (√2)² = 2. So 2 + 1² = 3, and hypotenuse = √3.',
  },
  {
    id: 3,
    trianglesShown: 3,
    question:
      'Adding one more triangle with one leg = √3 and the other = 1. The hypotenuse = √(3+1) = √4. But √4 is special — it equals exactly:',
    options: ['√5 ≈ 2.236', 'π ≈ 3.14', '2 (a perfect square!)', '√3 ≈ 1.732'],
    correct: '2 (a perfect square!)',
    explanation:
      '√4 = 2 — a rational number! The spiral occasionally hits rational lengths at perfect square steps: √1, √4=2, √9=3, √16=4.',
    hint:
      '4 = 2 × 2. What whole number, multiplied by itself, gives 4?',
  },
  {
    id: 4,
    trianglesShown: 5,
    question:
      'After 5 triangles, the longest hypotenuse is √6. Is √6 rational or irrational?',
    options: [
      'Rational, because 6 is even',
      'Irrational, because 6 is not a perfect square',
      'Rational, because it can be written as 6/1',
      'Cannot be determined',
    ],
    correct: 'Irrational, because 6 is not a perfect square',
    explanation:
      '√n is irrational whenever n is not a perfect square. Since 6 = 2 × 3 (not a perfect square), √6 is irrational.',
    hint:
      'Ask: does any whole number squared equal 6? 2²=4, 3²=9 — neither equals 6.',
  },
  {
    id: 5,
    trianglesShown: 8,
    question:
      'The spiral shows hypotenuses √2, √3, √4, √5, √6, √7, √8, √9. Which of these are rational?',
    options: [
      'All of them',
      'Only √2 and √8',
      '√4 = 2 and √9 = 3',
      'None of them',
    ],
    correct: '√4 = 2 and √9 = 3',
    explanation:
      '√4 = 2 and √9 = 3 are rational (perfect squares). The rest — √2, √3, √5, √6, √7, √8 — are all irrational.',
    hint:
      'Perfect squares in the list: 4 = 2² and 9 = 3². All others are not perfect squares.',
  },
];

// ── Takeaway ───────────────────────────────────────────────────────────────────
const TAKEAWAY: Takeaway = {
  title: 'What you discovered about the Square Root Spiral',
  points: [
    'Each new triangle adds a leg of length 1, using the previous hypotenuse as the other leg.',
    'The hypotenuses trace √1, √2, √3, √4, … — a complete sequence of square roots.',
    '√n is rational only when n is a perfect square (√1=1, √4=2, √9=3, √16=4, …).',
    'All other √n values are irrational — they cannot be expressed as p/q fractions.',
    'The spiral visually proves that irrational lengths are real and constructible, even if they cannot be written as fractions.',
  ],
};

// ── Free-play builder ──────────────────────────────────────────────────────────
function FreePlayBuilder() {
  const FREEPLAY_START = CHALLENGES[CHALLENGES.length - 1].trianglesShown;
  const [count, setCount] = useState(FREEPLAY_START);

  function addTriangle() {
    setCount(c => Math.min(MAX_TRIANGLES, c + 1));
  }
  function reset() {
    setCount(FREEPLAY_START);
  }

  // Stats: how many hypotenuses shown are rational
  const rationals = useMemo(() => {
    const r: number[] = [];
    for (let k = 1; k <= count; k++) {
      if (isPerfectSquare(k + 1)) r.push(k + 1);
    }
    return r;
  }, [count]);

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'center' }}>
        Build the spiral one triangle at a time — up to 15!
      </p>

      <SpiralSVG count={count} highlightLast />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        <button
          onClick={addTriangle}
          disabled={count >= MAX_TRIANGLES}
          style={{
            background: count >= MAX_TRIANGLES ? '#1e293b' : '#6366f1',
            color: count >= MAX_TRIANGLES ? '#475569' : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0.5rem 1.1rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: count >= MAX_TRIANGLES ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          + Add triangle T{count + 1 <= MAX_TRIANGLES ? count + 1 : MAX_TRIANGLES}
        </button>

        <button
          onClick={reset}
          style={{
            background: 'none',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '0.5rem 1.1rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>

        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
          Triangles built: <span style={{ color: '#a5b4fc', fontWeight: 800 }}>{count}</span> / {MAX_TRIANGLES}
        </span>
      </div>

      {/* Info strip */}
      <div style={{
        marginTop: '0.85rem',
        background: '#0f172a',
        borderRadius: 10,
        padding: '0.75rem 1rem',
        border: '1px solid #1e293b',
        fontSize: '0.8rem',
        color: '#94a3b8',
        lineHeight: 1.65,
      }}>
        <span style={{ color: '#a5b4fc', fontWeight: 700 }}>Latest hypotenuse: </span>
        <span style={{
          color: isPerfectSquare(count + 1) ? '#fde68a' : '#6ee7b7',
          fontWeight: 800,
        }}>
          {hypLabel(count)}
          {isPerfectSquare(count + 1) ? ' ← rational!' : ' (irrational)'}
        </span>
        {'  '}
        {rationals.length > 0 && (
          <span style={{ color: '#64748b' }}>
            {' | '}Rational hypotenuses so far:{' '}
            <span style={{ color: '#fde68a', fontWeight: 700 }}>
              {rationals.map(n => `√${n}=${Math.round(Math.sqrt(n))}`).join(', ')}
            </span>
          </span>
        )}
      </div>

      {/* Color legend strip */}
      <div style={{ display: 'flex', gap: 3, marginTop: '0.6rem', flexWrap: 'wrap' }}>
        {Array.from({ length: count }, (_, i) => {
          const k = i + 1;
          return (
            <div
              key={k}
              title={`T${k}: hyp ${hypLabel(k)}`}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: triColor(k),
                opacity: 0.85,
                cursor: 'default',
              }}
            />
          );
        })}
      </div>
      <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.3rem' }}>
        Hover each color swatch to see its triangle and hypotenuse.
        <span style={{ color: '#fde68a' }}> Yellow labels</span> = rational (perfect square).
      </p>
    </div>
  );
}

// ── Main Lab ───────────────────────────────────────────────────────────────────
export default function SqrtSpiralLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showFreePlay, setShowFreePlay] = useState(false);

  const allDone = completed.length === CHALLENGES.length;
  const current = CHALLENGES[cIdx];

  function check(opt: string) {
    if (status !== 'idle') return;
    setSelected(opt);
    if (opt === current.correct) {
      setStatus('correct');
      setCompleted(prev => (prev.includes(current.id) ? prev : [...prev, current.id]));
      setTimeout(() => {
        if (cIdx < CHALLENGES.length - 1) {
          setCIdx(i => i + 1);
          setSelected(null);
          setStatus('idle');
          setShowHint(false);
        } else {
          // Last challenge done — reveal free play
          setShowFreePlay(true);
          setSelected(null);
          setStatus('idle');
          setShowHint(false);
        }
      }, 1400);
    } else {
      setStatus('wrong');
      setTimeout(() => {
        setStatus('idle');
        setSelected(null);
      }, 1200);
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
      <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: '1rem' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {CHALLENGES.map((c, i) => (
            <div
              key={c.id}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 99,
                background: completed.includes(c.id)
                  ? '#10b981'
                  : i === cIdx
                  ? '#6366f1'
                  : '#1e293b',
                transition: 'background 0.3s',
              }}
            />
          ))}
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {completed.length}/{CHALLENGES.length}
          </span>
        </div>

        {/* Challenge panel */}
        {!allDone ? (
          <div style={{
            background: '#1e293b',
            borderRadius: 16,
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #334155',
          }}>
            {/* Badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: '#6366f1',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 10px',
                borderRadius: 99,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Wheel of Theodorus — T{current.trianglesShown}
              </span>
            </div>

            {/* Question */}
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', lineHeight: 1.5 }}>
              {current.question}
            </p>

            {/* Spiral SVG */}
            <div style={{ marginBottom: '0.85rem' }}>
              <SpiralSVG count={current.trianglesShown} highlightLast />
            </div>

            {/* Options grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {current.options.map(opt => {
                const isSel = selected === opt;
                const isOk = status === 'correct' && isSel;
                const isBad = status === 'wrong' && isSel;
                return (
                  <button
                    key={opt}
                    onClick={() => check(opt)}
                    disabled={status !== 'idle'}
                    style={{
                      padding: '0.65rem 0.5rem',
                      background: isOk ? '#052e16' : isBad ? '#2d0000' : '#0f172a',
                      border: `2px solid ${isOk ? '#10b981' : isBad ? '#ef4444' : '#334155'}`,
                      borderRadius: 10,
                      color: '#f1f5f9',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: status === 'idle' ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {status === 'correct' && (
              <p style={{ color: '#10b981', fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                ✓ {current.explanation}
              </p>
            )}
            {status === 'wrong' && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                Not quite — think about which numbers are perfect squares.
              </p>
            )}

            {/* Hint toggle */}
            <button
              onClick={() => setShowHint(h => !h)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
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
            background: '#052e16',
            border: '2px solid #10b981',
            borderRadius: 16,
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
              🎯 All challenges done! Build the full spiral below.
            </p>
          </div>
        )}

        {/* Free-play builder — visible once all challenges are done */}
        {showFreePlay || allDone ? (
          <div style={{
            background: '#0f172a',
            borderRadius: 16,
            padding: '1.25rem',
            border: '1px solid #1e293b',
          }}>
            <p style={{
              fontSize: '0.78rem',
              color: '#64748b',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '1rem',
            }}>
              Free Builder — Wheel of Theodorus
            </p>
            <FreePlayBuilder />
          </div>
        ) : null}

      </div>
    </LabShell>
  );
}
