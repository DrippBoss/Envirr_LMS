import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

interface GraphChallenge {
  id: number;
  a: number; b: number; c: number;
  label: string;
  question: string;
  correctCount: 0 | 1 | 2;
  hint: string;
}

const CHALLENGES: GraphChallenge[] = [
  { id: 1, a: 1,  b: -3, c: 2,  label: 'x\u00b2 \u2212 3x + 2',  question: 'How many real zeroes does x\u00b2 \u2212 3x + 2 have?',  correctCount: 2, hint: 'b\u00b2\u22124ac = 9\u22128 = 1 > 0. The parabola crosses the x-axis at two points.' },
  { id: 2, a: 1,  b: -2, c: 1,  label: 'x\u00b2 \u2212 2x + 1',  question: 'How many real zeroes does x\u00b2 \u2212 2x + 1 have?',  correctCount: 1, hint: 'b\u00b2\u22124ac = 4\u22124 = 0. The parabola just touches the x-axis at its vertex.' },
  { id: 3, a: 1,  b: 0,  c: 4,  label: 'x\u00b2 + 4',           question: 'How many real zeroes does x\u00b2 + 4 have?',           correctCount: 0, hint: 'b\u00b2\u22124ac = 0\u221216 = \u221216 < 0. The parabola floats above the x-axis.' },
  { id: 4, a: -1, b: 0,  c: 9,  label: '\u2212x\u00b2 + 9',      question: 'How many real zeroes does \u2212x\u00b2 + 9 have?',      correctCount: 2, hint: 'a < 0 \u2192 opens downward. b\u00b2\u22124ac = 0+36 = 36 > 0. Two zeroes at x=\u00b13.' },
  { id: 5, a: 2,  b: -4, c: 2,  label: '2x\u00b2 \u2212 4x + 2',  question: 'How many real zeroes does 2x\u00b2 \u2212 4x + 2 have?',  correctCount: 1, hint: 'b\u00b2\u22124ac = 16\u221216 = 0. One repeated zero at x=1.' },
];

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about parabolas',
  points: [
    'The sign of \u2018a\u2019 controls direction: a > 0 opens upward (\u222a), a < 0 opens downward (\u2229).',
    'The magnitude of \u2018a\u2019 controls width: larger |a| makes the parabola narrower.',
    '\u2018c\u2019 is the y-intercept \u2014 the height where the parabola crosses the y-axis.',
    '\u2018b\u2019 shifts the axis of symmetry: x = \u2212b / 2a.',
    'Discriminant b\u00b2 \u2212 4ac: > 0 means 2 zeroes, = 0 means 1 zero, < 0 means no real zeroes.',
  ],
};

type Status = 'idle' | 'correct' | 'wrong';

function disc(a: number, b: number, c: number) { return b * b - 4 * a * c; }
function zeroCount(a: number, b: number, c: number): 0 | 1 | 2 {
  const d = disc(a, b, c);
  return d > 0 ? 2 : d === 0 ? 1 : 0;
}
function roots(a: number, b: number, c: number): number[] {
  const d = disc(a, b, c);
  if (d < 0) return [];
  if (d === 0) return [-b / (2 * a)];
  return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
}

const SVG_W = 400, SVG_H = 200, X_RANGE = 5, Y_RANGE = 12;

function parabolaPoints(a: number, b: number, c: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const mx = -X_RANGE + (i / 80) * 2 * X_RANGE;
    const my = a * mx * mx + b * mx + c;
    const px = ((mx + X_RANGE) / (2 * X_RANGE)) * SVG_W;
    const py = SVG_H / 2 - (my / Y_RANGE) * (SVG_H / 2);
    pts.push(`${px.toFixed(1)},${Math.max(0, Math.min(SVG_H, py)).toFixed(1)}`);
  }
  return pts.join(' ');
}
function toSvgX(mathX: number) { return ((mathX + X_RANGE) / (2 * X_RANGE)) * SVG_W; }

function Parabola({ a, b, c, stroke, showRoots }: { a: number; b: number; c: number; stroke: string; showRoots?: boolean }) {
  const axisY = SVG_H / 2;
  const axisX = toSvgX(0);
  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block', borderRadius: 10, background: '#0f172a', border: '1px solid #334155' }}>
      {/* Grid */}
      {[-4,-3,-2,-1,1,2,3,4].map(x => (
        <line key={x} x1={toSvgX(x)} y1={0} x2={toSvgX(x)} y2={SVG_H} stroke="#1e293b" strokeWidth={1} />
      ))}
      {/* Axes */}
      <line x1={0} y1={axisY} x2={SVG_W} y2={axisY} stroke="#334155" strokeWidth={1.5} />
      <line x1={axisX} y1={0} x2={axisX} y2={SVG_H} stroke="#334155" strokeWidth={1.5} />
      <text x={SVG_W - 12} y={axisY - 5} fill="#475569" fontSize={10}>x</text>
      <text x={axisX + 4} y={12} fill="#475569" fontSize={10}>y</text>
      {/* Curve */}
      <polyline points={parabolaPoints(a, b, c)} fill="none" stroke={stroke} strokeWidth={2.5} />
      {/* Root dots */}
      {showRoots && roots(a, b, c).map((r, i) => (
        <circle key={i} cx={toSvgX(r)} cy={axisY} r={5} fill="#10b981" stroke="#0f172a" strokeWidth={2} />
      ))}
      {/* Label */}
      <text x={8} y={16} fill={stroke} fontSize={11} fontWeight="700">
        p(x) = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}
      </text>
    </svg>
  );
}

function ConsequencePanel({ a, b, c }: { a: number; b: number; c: number }) {
  const d = disc(a, b, c);
  const axis = (-b / (2 * a)).toFixed(2);
  const count = zeroCount(a, b, c);
  const absA = Math.abs(a);
  const narrowness = absA >= 3 ? 'very narrow' : absA >= 2 ? 'narrow' : absA <= 0.5 ? 'very wide' : 'standard width';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
      {[
        {
          param: 'a',
          value: a,
          color: '#6366f1',
          simple: a > 0
            ? `Think of it like a bowl \u2014 it opens upward. The lowest point is called the vertex.`
            : `Think of it like an upside-down bowl \u2014 it opens downward. The highest point is the vertex.`,
          detail: a > 0
            ? `a > 0 \u2192 opens \u222a (upward) \u2014 ${narrowness}`
            : `a < 0 \u2192 opens \u2229 (downward) \u2014 ${narrowness}`,
        },
        {
          param: 'b',
          value: b,
          color: '#f59e0b',
          simple: `Imagine folding the parabola in half \u2014 the fold line is at x = ${axis}. Both sides match perfectly.`,
          detail: `Axis of symmetry: x = \u2212b/2a = ${axis}`,
        },
        {
          param: 'c',
          value: c,
          color: '#10b981',
          simple: `When x = 0 (the y-axis), the curve is at height ${c}. So the graph always starts at (0, ${c}).`,
          detail: `y-intercept = ${c}`,
        },
      ].map(({ param, value, color, simple, detail }) => (
        <div key={param} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: '#1e293b', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
          <span style={{ color, fontWeight: 800, fontSize: '0.9rem', minWidth: 28, flexShrink: 0 }}>{param}={value}</span>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '0.2rem' }}>{simple}</div>
            <div style={{ color: '#475569', fontSize: '0.72rem' }}>{detail}</div>
          </div>
        </div>
      ))}
      <div style={{
        display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: '#1e293b', borderRadius: 8, padding: '0.6rem 0.75rem',
        borderLeft: `3px solid ${count === 2 ? '#10b981' : count === 1 ? '#f59e0b' : '#ef4444'}`,
      }}>
        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: count === 2 ? '#10b981' : count === 1 ? '#f59e0b' : '#ef4444', flexShrink: 0 }}>
          {count === 2 ? '2 zeroes' : count === 1 ? '1 zero' : '0 zeroes'}
        </span>
        <div>
          <div style={{ color: '#f1f5f9', fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '0.2rem' }}>
            {count === 2
              ? 'The curve crosses the x-axis at two points — two answers exist.'
              : count === 1
              ? 'The curve just touches the x-axis at one point — one repeated answer.'
              : 'The curve never reaches the x-axis — no real answers.'}
          </div>
          <div style={{ color: '#475569', fontSize: '0.72rem' }}>
            {'b²\u22124ac'} = {d.toFixed(0)}{' '}{d > 0 ? '> 0' : d === 0 ? '= 0' : '< 0'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PolynomialGrapherLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [selected, setSelected] = useState<0 | 1 | 2 | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);

  // Free-play sliders
  const [fpA, setFpA] = useState(1);
  const [fpB, setFpB] = useState(-3);
  const [fpC, setFpC] = useState(2);

  const allDone = completed.length === CHALLENGES.length;
  const current = CHALLENGES[cIdx];

  const check = (val: 0 | 1 | 2) => {
    if (status !== 'idle') return;
    setSelected(val);
    if (val === current.correctCount) {
      setStatus('correct');
      setCompleted(prev => [...prev, current.id]);
      setTimeout(() => {
        if (cIdx < CHALLENGES.length - 1) {
          setCIdx(i => i + 1);
          setSelected(null);
          setStatus('idle');
          setShowHint(false);
        }
      }, 1000);
    } else {
      setStatus('wrong');
      setTimeout(() => { setStatus('idle'); setSelected(null); }, 1200);
    }
  };

  const safeA = fpA === 0 ? 1 : fpA;

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      onComplete={onComplete}
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
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>
              {current.question}
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <Parabola
                a={current.a} b={current.b} c={current.c}
                stroke={status === 'correct' ? '#10b981' : status === 'wrong' ? '#ef4444' : '#6366f1'}
                showRoots={status === 'correct'}
              />
            </div>

            {/* Answer buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              {([0, 1, 2] as const).map(count => {
                const isSelected = selected === count;
                const isCorrect = status === 'correct' && isSelected;
                const isWrong = status === 'wrong' && isSelected;
                return (
                  <button key={count} onClick={() => check(count)} disabled={status !== 'idle'} style={{
                    flex: 1, padding: '0.65rem 0.5rem',
                    background: isCorrect ? '#052e16' : isWrong ? '#2d0000' : '#0f172a',
                    border: `2px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#334155'}`,
                    borderRadius: 10, color: '#f1f5f9',
                    fontWeight: 700, fontSize: '0.85rem', cursor: status === 'idle' ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}>
                    {count === 0 ? '0 zeroes' : count === 1 ? '1 zero' : '2 zeroes'}
                  </button>
                );
              })}
            </div>

            {status === 'correct' && (
              <p style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                ✓ Correct! Discriminant = {disc(current.a, current.b, current.c).toFixed(0)}
                {current.correctCount > 0 ? ` — zeroes at x = ${roots(current.a, current.b, current.c).map(r => r.toFixed(0)).join(', ')}` : ''}
              </p>
            )}
            {status === 'wrong' && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                Not quite — look at where the parabola meets the x-axis.
              </p>
            )}

            <button onClick={() => setShowHint(h => !h)} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>💡 {current.hint}</p>
            )}
          </div>
        ) : (
          <div style={{ background: '#052e16', border: '2px solid #10b981', borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
              🎯 All challenges complete! Explore freely below, then finish.
            </p>
          </div>
        )}

        {/* ── Free-play explorer with sliders ── */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: '1.25rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem' }}>
            Free Explorer — p(x) = ax² + bx + c
          </p>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
            {([
              { label: 'a', val: fpA, set: setFpA, color: '#6366f1', note: fpA === 0 ? '(treated as 1 — a cannot be 0)' : fpA > 0 ? 'opens \u222a' : 'opens \u2229' },
              { label: 'b', val: fpB, set: setFpB, color: '#f59e0b', note: `axis of symmetry x = ${(-fpB / (2 * safeA)).toFixed(1)}` },
              { label: 'c', val: fpC, set: setFpC, color: '#10b981', note: `y-intercept = ${fpC}` },
            ] as const).map(({ label, val, set, color, note }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 800, color, fontSize: '0.95rem' }}>{label} = {val}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{note}</span>
                </div>
                <input
                  type="range"
                  className="lab-slider"
                  min={-9} max={9} step={1}
                  value={val}
                  onChange={e => (set as (n: number) => void)(parseInt(e.target.value))}
                  style={{ accentColor: color }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#334155', marginTop: '2px' }}>
                  <span>-9</span><span>0</span><span>9</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live parabola */}
          <Parabola a={safeA} b={fpB} c={fpC} stroke="#6366f1" showRoots />

          {/* Consequence panel */}
          <ConsequencePanel a={safeA} b={fpB} c={fpC} />
        </div>
      </div>
    </LabShell>
  );
}
