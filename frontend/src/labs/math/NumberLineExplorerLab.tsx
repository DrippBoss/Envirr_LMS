import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

// ── Number line config ─────────────────────────────────────────────────────────
const W = 480;
const H = 120;
const RANGE = 2;            // line spans -2 to +2
const CELL = W / (2 * RANGE); // pixels per unit  (480 / 4 = 120)
const ORIGIN = W / 2;       // 240

function toX(v: number): number {
  return ORIGIN + v * CELL;
}

// ── Challenges ─────────────────────────────────────────────────────────────────
interface Challenge {
  id: number;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  markerValue: number | null;   // null = no single marker (e.g. challenge 4)
  shadeRegion: [number, number] | null;  // for challenge 4
  zoomMode: boolean;            // for challenge 5
  hint: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    question: 'Which number does the marker show?',
    options: ['1/4', '1/2', '3/4', '2/3'],
    correct: '1/2',
    explanation: '1/2 is exactly halfway between 0 and 1. The marker sits at the midpoint of the positive unit interval.',
    markerValue: 0.5,
    shadeRegion: null,
    zoomMode: false,
    hint: 'Count how many equal parts the interval [0, 1] is divided into, and which tick the marker is on.',
  },
  {
    id: 2,
    question: 'Which number does the marker show?',
    options: ['−1/2', '−3/4', '−1', '3/4'],
    correct: '−3/4',
    explanation: 'The marker is to the LEFT of zero (negative) and 3/4 of the way from 0 to −1. Negative rational numbers lie left of zero.',
    markerValue: -0.75,
    shadeRegion: null,
    zoomMode: false,
    hint: 'The marker is left of zero — count how far it is from 0 toward −1.',
  },
  {
    id: 3,
    question: 'Point P is shown. Which rational number does it represent?',
    options: ['4/3', '5/4', '5/3', '7/4'],
    correct: '5/3',
    explanation: '5/3 ≈ 1.667. The point is between 1 and 2, closer to 2. 5 ÷ 3 = 1.666…, which matches.',
    markerValue: 5 / 3,
    shadeRegion: null,
    zoomMode: false,
    hint: '5/3 = 1 + 2/3. The point is 2/3 of the way from 1 to 2.',
  },
  {
    id: 4,
    question: 'A rational number between 0 and 1 is chosen. Which is between 1/3 and 1/2?',
    options: ['5/12', '1/4', '2/3', '3/4'],
    correct: '5/12',
    explanation: 'The average of 1/3 and 1/2 is (1/3 + 1/2) / 2 = (2/6 + 3/6) / 2 = 5/12. The shaded region marks the interval [1/3, 1/2].',
    markerValue: null,
    shadeRegion: [1 / 3, 1 / 2],
    zoomMode: false,
    hint: 'Average the two endpoints: (1/3 + 1/2) ÷ 2 — convert to a common denominator first.',
  },
  {
    id: 5,
    question: 'Zoom challenge: In the interval (0, 0.1), how many rational numbers exist?',
    options: ['Exactly 10', 'Exactly 100', 'Finitely many', 'Infinitely many'],
    correct: 'Infinitely many',
    explanation: 'Between any two distinct rational numbers there are infinitely many more rationals. This property is called density — the rationals are dense in the real line.',
    markerValue: null,
    shadeRegion: null,
    zoomMode: true,
    hint: 'Can you always find a rational between two given rationals? (Hint: yes — take their average.)',
  },
];

const TAKEAWAY: Takeaway = {
  title: 'What you discovered on the number line',
  points: [
    'Every rational number p/q corresponds to a unique point on the number line.',
    'Between any two rational numbers there are infinitely many more — this is called density.',
    'Fractions with the same denominator are equally spaced on the number line.',
    'Negative rational numbers lie to the left of zero; positive ones to the right.',
    'Zooming into any interval reveals new rational numbers that were invisible at the larger scale.',
  ],
};

// ── SVG: static number line ────────────────────────────────────────────────────
function NumberLine({
  markerValue,
  shadeRegion,
  zoomMode,
}: {
  markerValue: number | null;
  shadeRegion: [number, number] | null;
  zoomMode: boolean;
}) {
  const axisY = H / 2;
  // ticks every 0.5 units
  const ticks: number[] = [];
  for (let v = -2; v <= 2; v += 0.5) ticks.push(v);
  const labeledTicks = [-2, -1, 0, 1, 2];

  if (zoomMode) {
    // Show a zoomed-in view of (0, 0.1) with many dots
    const zW = W;
    const zH = H;
    const zAxisY = zH / 2;
    const zOrigin = 40;
    const zEnd = zW - 40;
    const zRange = 0.1;
    const zScale = (zEnd - zOrigin) / zRange;

    const dots: number[] = [];
    for (let n = 1; n <= 9; n++) dots.push(n / 100);
    for (let n = 1; n <= 9; n++) dots.push(n / 90);
    for (let n = 1; n <= 9; n++) dots.push(n / 110);
    for (let n = 2; n <= 9; n += 2) dots.push(n / 200);
    const uniqueDots = Array.from(new Set(dots.map(d => Math.round(d * 10000) / 10000)))
      .filter(d => d > 0 && d < 0.1)
      .sort((a, b) => a - b);

    function zToX(v: number) { return zOrigin + v * zScale; }

    return (
      <svg width="100%" viewBox={`0 0 ${zW} ${zH}`}
        style={{ display: 'block', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }}>
        {/* axis */}
        <line x1={zOrigin} y1={zAxisY} x2={zEnd} y2={zAxisY} stroke="#334155" strokeWidth={2} />
        {/* arrowhead */}
        <polygon points={`${zEnd},${zAxisY} ${zEnd - 6},${zAxisY - 4} ${zEnd - 6},${zAxisY + 4}`} fill="#334155" />
        {/* boundary ticks */}
        <line x1={zOrigin} y1={zAxisY - 8} x2={zOrigin} y2={zAxisY + 8} stroke="#6366f1" strokeWidth={2} />
        <line x1={zEnd} y1={zAxisY - 8} x2={zEnd} y2={zAxisY + 8} stroke="#6366f1" strokeWidth={2} />
        <text x={zOrigin} y={zAxisY + 22} fill="#a5b4fc" fontSize={11} textAnchor="middle" fontWeight="700">0</text>
        <text x={zEnd} y={zAxisY + 22} fill="#a5b4fc" fontSize={11} textAnchor="middle" fontWeight="700">0.1</text>
        {/* label */}
        <text x={zW / 2} y={18} fill="#64748b" fontSize={10} textAnchor="middle">Zoomed in — interval (0, 0.1)</text>
        {/* packed dots */}
        {uniqueDots.map((d, i) => (
          <circle key={i} cx={zToX(d)} cy={zAxisY} r={3.5}
            fill={i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#8b5cf6' : '#a78bfa'}
            opacity={0.9} />
        ))}
        {/* "..." label to imply more */}
        <text x={zW / 2} y={zAxisY - 16} fill="#f59e0b" fontSize={12} textAnchor="middle" fontWeight="700">
          … infinitely many rational points …
        </text>
      </svg>
    );
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }}>
      {/* Shaded region for challenge 4 */}
      {shadeRegion && (() => {
        const [lo, hi] = shadeRegion;
        const x1 = toX(lo), x2 = toX(hi);
        return (
          <>
            <rect x={x1} y={axisY - 18} width={x2 - x1} height={36}
              fill="#6366f1" opacity={0.18} rx={3} />
            <line x1={x1} y1={axisY - 20} x2={x1} y2={axisY + 20} stroke="#8b5cf6" strokeWidth={2} />
            <line x1={x2} y1={axisY - 20} x2={x2} y2={axisY + 20} stroke="#8b5cf6" strokeWidth={2} />
            <text x={x1} y={axisY - 24} fill="#a5b4fc" fontSize={10} textAnchor="middle" fontWeight="700">1/3</text>
            <text x={x2} y={axisY - 24} fill="#a5b4fc" fontSize={10} textAnchor="middle" fontWeight="700">1/2</text>
          </>
        );
      })()}

      {/* Axis */}
      <line x1={12} y1={axisY} x2={W - 12} y2={axisY} stroke="#334155" strokeWidth={2} />
      {/* Arrowheads */}
      <polygon points={`${W - 8},${axisY} ${W - 16},${axisY - 4} ${W - 16},${axisY + 4}`} fill="#334155" />
      <polygon points={`8,${axisY} 16,${axisY - 4} 16,${axisY + 4}`} fill="#334155" />

      {/* Ticks */}
      {ticks.map(v => {
        const x = toX(v);
        const isMajor = Number.isInteger(v);
        return (
          <line key={v} x1={x} y1={axisY - (isMajor ? 8 : 4)} x2={x} y2={axisY + (isMajor ? 8 : 4)}
            stroke={isMajor ? '#475569' : '#2d3748'} strokeWidth={isMajor ? 1.5 : 1} />
        );
      })}

      {/* Tick labels */}
      {labeledTicks.map(v => (
        <text key={v} x={toX(v)} y={axisY + 22}
          fill="#475569" fontSize={11} textAnchor="middle" fontWeight={v === 0 ? '700' : '400'}>
          {v}
        </text>
      ))}

      {/* Marker / point */}
      {markerValue !== null && (() => {
        const mx = toX(markerValue);
        const isNeg = markerValue < 0;
        // arrow pointing down to the marker
        return (
          <>
            <line x1={mx} y1={axisY - 36} x2={mx} y2={axisY - 12}
              stroke="#f59e0b" strokeWidth={2}
              markerEnd="url(#arrow)" />
            <polygon points={`${mx},${axisY - 10} ${mx - 4},${axisY - 17} ${mx + 4},${axisY - 17}`}
              fill="#f59e0b" />
            <circle cx={mx} cy={axisY} r={6} fill="#6366f1" stroke="#0f172a" strokeWidth={2} />
            <circle cx={mx} cy={axisY} r={2.5} fill="#fff" />
            <text x={mx + (isNeg ? -10 : 10)} y={axisY - 38}
              fill="#fbbf24" fontSize={11} fontWeight="800"
              textAnchor={isNeg ? 'end' : 'start'}>
              P
            </text>
          </>
        );
      })()}
    </svg>
  );
}

// ── Free play: density explorer ────────────────────────────────────────────────
function DensityExplorer() {
  const [zoom, setZoom] = useState(1);

  // Pre-calculated fractions visible at each zoom level, centred on 0.5
  const fractionSets: Record<number, { v: number; label: string }[]> = {
    1: [
      { v: 0, label: '0' }, { v: 0.5, label: '1/2' }, { v: 1, label: '1' },
    ],
    2: [
      { v: 0, label: '0' }, { v: 0.25, label: '1/4' }, { v: 0.5, label: '1/2' },
      { v: 0.75, label: '3/4' }, { v: 1, label: '1' },
    ],
    4: [
      { v: 0, label: '0' },
      { v: 0.125, label: '1/8' }, { v: 0.25, label: '1/4' }, { v: 0.375, label: '3/8' },
      { v: 0.5, label: '1/2' }, { v: 0.625, label: '5/8' }, { v: 0.75, label: '3/4' },
      { v: 0.875, label: '7/8' }, { v: 1, label: '1' },
    ],
    8: [
      { v: 0, label: '0' },
      { v: 1 / 16, label: '1/16' }, { v: 2 / 16, label: '1/8' },
      { v: 3 / 16, label: '3/16' }, { v: 4 / 16, label: '1/4' },
      { v: 5 / 16, label: '5/16' }, { v: 6 / 16, label: '3/8' },
      { v: 7 / 16, label: '7/16' }, { v: 8 / 16, label: '1/2' },
      { v: 9 / 16, label: '9/16' }, { v: 10 / 16, label: '5/8' },
      { v: 11 / 16, label: '11/16' }, { v: 12 / 16, label: '3/4' },
      { v: 13 / 16, label: '13/16' }, { v: 14 / 16, label: '7/8' },
      { v: 15 / 16, label: '15/16' }, { v: 1, label: '1' },
    ],
  };

  const closestZoom = ([1, 2, 4, 8] as number[]).reduce((prev, cur) =>
    Math.abs(cur - zoom) < Math.abs(prev - zoom) ? cur : prev
  );
  const fractions = fractionSets[closestZoom];

  // The visible window shrinks as we zoom in — centred on 0.5
  const halfWindow = 0.5 / closestZoom;
  const lo = 0.5 - halfWindow;
  const hi = 0.5 + halfWindow;
  const svgW = W;
  const svgH = 90;
  const axisY = svgH / 2;
  const padX = 30;

  function fpToX(v: number) {
    return padX + ((v - lo) / (hi - lo)) * (svgW - 2 * padX);
  }

  const visible = fractions.filter(f => f.v >= lo && f.v <= hi);

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem', textAlign: 'center' }}>
        Density Explorer: Zoom in to discover infinitely many rationals!
      </p>

      {/* Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: 28 }}>1×</span>
        <input type="range" min={1} max={8} step={1} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#6366f1' }} />
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: 28 }}>8×</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a5b4fc', minWidth: 32 }}>
          {zoom}×
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: '0.5rem' }}>
        {/* Axis */}
        <line x1={padX} y1={axisY} x2={svgW - padX} y2={axisY} stroke="#334155" strokeWidth={2} />

        {/* Boundary labels */}
        <text x={padX} y={axisY + 20} fill="#475569" fontSize={10} textAnchor="middle">{lo.toFixed(4).replace(/\.?0+$/, '') || '0'}</text>
        <text x={svgW - padX} y={axisY + 20} fill="#475569" fontSize={10} textAnchor="middle">{hi.toFixed(4).replace(/\.?0+$/, '') || '1'}</text>

        {/* Fraction points */}
        {visible.map(({ v, label }, i) => {
          const x = fpToX(v);
          const isHalf = label === '1/2';
          return (
            <g key={i}>
              <line x1={x} y1={axisY - 10} x2={x} y2={axisY + 10}
                stroke={isHalf ? '#f59e0b' : '#6366f1'} strokeWidth={isHalf ? 2 : 1.5} />
              <circle cx={x} cy={axisY} r={isHalf ? 5 : 4}
                fill={isHalf ? '#f59e0b' : '#6366f1'} stroke="#0f172a" strokeWidth={1.5} />
              <text x={x} y={axisY - 16}
                fill={isHalf ? '#fbbf24' : '#a5b4fc'}
                fontSize={9} textAnchor="middle" fontWeight={isHalf ? '800' : '600'}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      <p style={{ fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>
        Showing <strong style={{ color: '#a5b4fc' }}>{visible.length}</strong> rationals in [{lo.toFixed(3)}, {hi.toFixed(3)}].
        {closestZoom < 8 ? ' Zoom in more to see fractions with larger denominators!' : ' Even here, infinitely many more exist between each pair!'}
      </p>
    </div>
  );
}

// ── Main Lab ───────────────────────────────────────────────────────────────────
export default function NumberLineExplorerLab({ nodeTitle, xpReward, onComplete }: Props) {
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
      <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: '1rem' }}>

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
            <span style={{
              background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 800,
              padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase',
              letterSpacing: '0.08em', display: 'inline-block', marginBottom: '0.75rem',
            }}>
              Challenge {cIdx + 1}
            </span>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>
              {current.question}
            </p>

            {/* Number line SVG */}
            <div style={{ marginBottom: '1.25rem' }}>
              <NumberLine
                markerValue={current.markerValue}
                shadeRegion={current.shadeRegion}
                zoomMode={current.zoomMode}
              />
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
                    fontWeight: 700, fontSize: '0.85rem',
                    cursor: status === 'idle' ? 'pointer' : 'default',
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
                Not quite — look at the marker's position more carefully.
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
              🎯 All challenges done! Explore density in the free play below.
            </p>
          </div>
        )}

        {/* Free play */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: '1.25rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Free Play — Density Explorer
          </p>
          <DensityExplorer />
        </div>
      </div>
    </LabShell>
  );
}
