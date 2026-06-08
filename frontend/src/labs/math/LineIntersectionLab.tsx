import { useState, useMemo } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about pairs of linear equations',
  points: [
    'Two linear equations represent two straight lines on the same coordinate plane.',
    'If the lines intersect at one point \u2014 unique solution. That crossing point IS the solution.',
    'If the lines are parallel \u2014 no solution. They never meet, no matter how far you extend them.',
    'If the lines are coincident (same line) \u2014 infinitely many solutions. Every point on the line works.',
    'You can tell which case just by comparing ratios a\u2081/a\u2082, b\u2081/b\u2082, c\u2081/c\u2082 \u2014 no drawing needed.',
  ],
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

// Each equation stored as ax + by = c  (standard: ax + by - c = 0)
interface LineEq { a: number; b: number; c: number; label: string }

interface Challenge {
  id: number;
  eq1: LineEq;
  eq2: LineEq;
  answer: 'intersecting' | 'parallel' | 'coincident';
  why: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    eq1: { a: 1, b: 1, c: 5, label: 'x + y = 5' },
    eq2: { a: 2, b: -1, c: 4, label: '2x \u2212 y = 4' },
    answer: 'intersecting',
    why: 'a\u2081/a\u2082 = 1/2 \u2260 b\u2081/b\u2082 = 1/(\u22121) \u2192 the lines cross at exactly one point.',
  },
  {
    id: 2,
    eq1: { a: 1, b: 2, c: 4, label: 'x + 2y = 4' },
    eq2: { a: 2, b: 4, c: 12, label: '2x + 4y = 12' },
    answer: 'parallel',
    why: 'a\u2081/a\u2082 = b\u2081/b\u2082 = 1/2 but c\u2081/c\u2082 = 4/12 = 1/3 \u2260 1/2 \u2192 parallel, no solution.',
  },
  {
    id: 3,
    eq1: { a: 2, b: 3, c: 9, label: '2x + 3y = 9' },
    eq2: { a: 4, b: 6, c: 18, label: '4x + 6y = 18' },
    answer: 'coincident',
    why: 'All ratios a\u2081/a\u2082 = b\u2081/b\u2082 = c\u2081/c\u2082 = 1/2 \u2192 same line, infinite solutions.',
  },
  {
    id: 4,
    eq1: { a: 3, b: -1, c: 2, label: '3x \u2212 y = 2' },
    eq2: { a: 1, b: 1, c: 6, label: 'x + y = 6' },
    answer: 'intersecting',
    why: 'a\u2081/a\u2082 = 3/1 = 3 \u2260 b\u2081/b\u2082 = \u22121/1 \u2192 lines intersect at one point.',
  },
  {
    id: 5,
    eq1: { a: 1, b: -1, c: 1, label: 'x \u2212 y = 1' },
    eq2: { a: 2, b: -2, c: 4, label: '2x \u2212 2y = 4' },
    answer: 'parallel',
    why: 'a\u2081/a\u2082 = b\u2081/b\u2082 = 1/2 but c\u2081/c\u2082 = 1/4 \u2260 1/2 \u2192 parallel, no solution.',
  },
];

const BUTTONS: { key: Challenge['answer']; label: string }[] = [
  { key: 'intersecting', label: 'Intersecting (unique)' },
  { key: 'parallel', label: 'Parallel (no solution)' },
  { key: 'coincident', label: 'Coincident (infinite)' },
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
};

// ── SVG grid helpers ──────────────────────────────────────────────────────────
const W = 340, H = 340;
const RANGE = 7; // -7 to 7

function toSvg(x: number, y: number): [number, number] {
  return [
    (x + RANGE) / (2 * RANGE) * W,
    H - (y + RANGE) / (2 * RANGE) * H,
  ];
}

function linePoints(eq: LineEq): [[number, number], [number, number]] | null {
  const { a, b, c } = eq;
  // ax + by = c
  if (b === 0 && a === 0) return null;
  if (b === 0) {
    // vertical line x = c/a
    const x = c / a;
    return [toSvg(x, -RANGE), toSvg(x, RANGE)];
  }
  // y = (c - ax) / b
  const xA = -RANGE, yA = (c - a * xA) / b;
  const xB = RANGE, yB = (c - a * xB) / b;
  return [toSvg(xA, yA), toSvg(xB, yB)];
}

function intersection(e1: LineEq, e2: LineEq): [number, number] | null {
  const det = e1.a * e2.b - e2.a * e1.b;
  if (det === 0) return null;
  const x = (e1.c * e2.b - e2.c * e1.b) / det;
  const y = (e1.a * e2.c - e2.a * e1.c) / det;
  if (Math.abs(x) > RANGE - 0.5 || Math.abs(y) > RANGE - 0.5) return null;
  return [x, y];
}

// ── Free-play consequence ─────────────────────────────────────────────────────
function classifyFreePlay(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number) {
  const det = a1 * b2 - a2 * b1;
  if (det !== 0) return 'intersecting' as const;
  // det === 0
  const detC1 = a1 * c2 - a2 * c1;
  const detC2 = b1 * c2 - b2 * c1;
  if (detC1 === 0 && detC2 === 0) return 'coincident' as const;
  return 'parallel' as const;
}

function ratioStr(n: number, d: number) {
  if (d === 0) return '\u221e';
  const v = n / d;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LineIntersectionLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showWhy, setShowWhy] = useState(false);

  // Free-play sliders
  const [fp, setFp] = useState({ a1: 1, b1: 1, c1: 5, a2: 2, b2: -1, c2: 4 });

  const allDone = completed.length === CHALLENGES.length;
  const ch = CHALLENGES[cIdx];

  const handleAnswer = (key: Challenge['answer']) => {
    if (feedback !== 'idle') return;
    if (key === ch.answer) {
      setFeedback('correct');
      setCompleted(prev => [...prev, ch.id]);
      setTimeout(() => {
        if (cIdx < CHALLENGES.length - 1) {
          setCIdx(i => i + 1);
          setFeedback('idle');
          setShowWhy(false);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('idle'), 1200);
    }
  };

  const fpClass = classifyFreePlay(fp.a1, fp.b1, fp.c1, fp.a2, fp.b2, fp.c2);
  const fpEq1: LineEq = { a: fp.a1, b: fp.b1, c: fp.c1, label: '' };
  const fpEq2: LineEq = { a: fp.a2, b: fp.b2, c: fp.c2, label: '' };
  const fpIntersect = fpClass === 'intersecting' ? intersection(fpEq1, fpEq2) : null;

  const fpConsequence = useMemo(() => {
    if (fpClass === 'intersecting') {
      const pt = intersection(fpEq1, fpEq2);
      return {
        color: C.green,
        simple: pt
          ? `The lines cross at exactly one point: (${pt[0].toFixed(2)}, ${pt[1].toFixed(2)}). One solution!`
          : 'The lines cross at one point (outside the visible range). One solution!',
        detail: `a\u2081/a\u2082 = ${ratioStr(fp.a1, fp.a2)}, b\u2081/b\u2082 = ${ratioStr(fp.b1, fp.b2)} \u2014 ratios differ \u2192 intersecting`,
      };
    }
    if (fpClass === 'coincident') {
      return {
        color: C.primary,
        simple: 'The lines are the same! Every single point on the line is a solution \u2014 infinitely many.',
        detail: `a\u2081/a\u2082 = b\u2081/b\u2082 = c\u2081/c\u2082 = ${ratioStr(fp.a1, fp.a2)} \u2014 all equal \u2192 coincident`,
      };
    }
    return {
      color: C.red,
      simple: 'The lines are parallel \u2014 they never meet. No solution exists.',
      detail: `a\u2081/a\u2082 = b\u2081/b\u2082 = ${ratioStr(fp.a1, fp.a2)}, but c\u2081/c\u2082 = ${ratioStr(fp.c1, fp.c2)} \u2014 differs \u2192 parallel`,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fp, fpClass]);

  const sliders = [
    { key: 'a1' as const, label: 'a\u2081', color: C.primary },
    { key: 'b1' as const, label: 'b\u2081', color: C.primary },
    { key: 'c1' as const, label: 'c\u2081', color: C.primary },
    { key: 'a2' as const, label: 'a\u2082', color: C.green },
    { key: 'b2' as const, label: 'b\u2082', color: C.green },
    { key: 'c2' as const, label: 'c\u2082', color: C.green },
  ];

  return (
    <LabShell
      title={nodeTitle} xpReward={xpReward} onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ challengesCompleted: completed, fp }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '1rem' }}>

        {/* ── Progress bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {CHALLENGES.map((c, i) => (
            <div key={c.id} style={{
              flex: 1, height: 6, borderRadius: 99,
              background: completed.includes(c.id) ? C.green : i === cIdx ? C.primary : C.surface,
              transition: 'background 0.3s',
            }} />
          ))}
          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: C.dim, whiteSpace: 'nowrap' }}>
            {completed.length}/{CHALLENGES.length}
          </span>
        </div>

        {/* ── Challenge panel ── */}
        {!allDone ? (
          <div style={{ background: C.surface, borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ background: C.primary, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{ fontSize: '0.75rem', color: C.dim }}>Classify the pair</span>
            </div>

            {/* Equations display */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {[
                { eq: ch.eq1, color: C.primary },
                { eq: ch.eq2, color: C.green },
              ].map(({ eq, color }) => (
                <div key={eq.label} style={{
                  flex: 1, minWidth: 130,
                  background: C.bg, borderRadius: 10, padding: '0.75rem 1rem',
                  border: `2px solid ${color}`, textAlign: 'center',
                  fontSize: '1.05rem', fontWeight: 700, color,
                }}>
                  {eq.label}
                </div>
              ))}
            </div>

            {/* SVG Grid */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <svg width={W} height={H} style={{ borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                {/* Grid lines */}
                {Array.from({ length: 13 }, (_, i) => i - 6).map(v => {
                  const [x1, y1] = toSvg(v, -RANGE);
                  const [x2, y2] = toSvg(v, RANGE);
                  const [hx1, hy1] = toSvg(-RANGE, v);
                  const [hx2, hy2] = toSvg(RANGE, v);
                  return (
                    <g key={v}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={v === 0 ? '#475569' : '#1e293b'} strokeWidth={v === 0 ? 1.5 : 1} />
                      <line x1={hx1} y1={hy1} x2={hx2} y2={hy2} stroke={v === 0 ? '#475569' : '#1e293b'} strokeWidth={v === 0 ? 1.5 : 1} />
                    </g>
                  );
                })}
                {/* Lines */}
                {[
                  { eq: ch.eq1, color: C.primary },
                  { eq: ch.eq2, color: C.green },
                ].map(({ eq, color }) => {
                  const pts = linePoints(eq);
                  if (!pts) return null;
                  return (
                    <line key={eq.label}
                      x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]}
                      stroke={color} strokeWidth={2.5} strokeLinecap="round"
                    />
                  );
                })}
                {/* Intersection dot (shown after correct) */}
                {feedback === 'correct' && ch.answer === 'intersecting' && (() => {
                  const pt = intersection(ch.eq1, ch.eq2);
                  if (!pt) return null;
                  const [sx, sy] = toSvg(pt[0], pt[1]);
                  return <circle cx={sx} cy={sy} r={6} fill={C.gold} stroke="#fff" strokeWidth={2} />;
                })()}
              </svg>
            </div>

            {/* Answer buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {BUTTONS.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => handleAnswer(btn.key)}
                  disabled={feedback !== 'idle'}
                  style={{
                    flex: 1, minWidth: 140,
                    padding: '0.65rem 0.5rem',
                    borderRadius: 10, border: `2px solid ${C.border}`,
                    background: feedback === 'correct' && ch.answer === btn.key ? '#052e16'
                      : feedback === 'wrong' ? '#2d0000' : C.bg,
                    color: feedback === 'correct' && ch.answer === btn.key ? C.green
                      : C.text,
                    fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {feedback === 'correct' && (
              <div style={{ color: C.green, fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {'✓ Correct! '}
                <button onClick={() => setShowWhy(w => !w)} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                  {showWhy ? 'Hide why' : 'Why?'}
                </button>
              </div>
            )}
            {feedback === 'wrong' && (
              <div style={{ color: C.red, fontSize: '0.85rem' }}>Not quite \u2014 check the ratios and try again.</div>
            )}
            {showWhy && (
              <div style={{ marginTop: '0.5rem', background: C.bg, borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: C.dim, fontStyle: 'italic' }}>
                {'💡 '}{ch.why}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#052e16', border: `2px solid ${C.green}`, borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: C.green, margin: 0 }}>
              {'🎯 All challenges complete! Save & finish below.'}
            </p>
          </div>
        )}

        {/* ── Free-Play ── */}
        <div style={{ background: C.bg, borderRadius: 16, padding: '1.25rem', border: `1px solid ${C.surface}` }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            {'Free Explorer \u2014 Drag sliders and watch the lines move'}
          </p>

          {/* Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {sliders.map(({ key, label, color }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color }}>
                  <span style={{ fontWeight: 700 }}>{label}</span>
                  <span>{fp[key]}</span>
                </div>
                <input
                  type="range" min={-9} max={9} step={1}
                  value={fp[key]}
                  onChange={e => setFp(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  style={{ accentColor: color, width: '100%' }}
                />
              </label>
            ))}
          </div>

          {/* Equation labels */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              { a: fp.a1, b: fp.b1, c: fp.c1, color: C.primary },
              { a: fp.a2, b: fp.b2, c: fp.c2, color: C.green },
            ].map(({ a, b, c, color }, i) => {
              const bSign = b >= 0 ? '+' : '\u2212';
              const label = `${a}x ${bSign} ${Math.abs(b)}y = ${c}`;
              return (
                <div key={i} style={{ flex: 1, minWidth: 130, textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color }}>
                  {label}
                </div>
              );
            })}
          </div>

          {/* SVG Free play */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <svg width={W} height={H} style={{ borderRadius: 10, background: '#0a0f1e', border: `1px solid ${C.border}` }}>
              {Array.from({ length: 13 }, (_, i) => i - 6).map(v => {
                const [x1, y1] = toSvg(v, -RANGE);
                const [x2, y2] = toSvg(v, RANGE);
                const [hx1, hy1] = toSvg(-RANGE, v);
                const [hx2, hy2] = toSvg(RANGE, v);
                return (
                  <g key={v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={v === 0 ? '#475569' : '#1e293b'} strokeWidth={v === 0 ? 1.5 : 1} />
                    <line x1={hx1} y1={hy1} x2={hx2} y2={hy2} stroke={v === 0 ? '#475569' : '#1e293b'} strokeWidth={v === 0 ? 1.5 : 1} />
                  </g>
                );
              })}
              {[
                { eq: fpEq1, color: C.primary },
                { eq: fpEq2, color: C.green },
              ].map(({ eq, color }, i) => {
                const pts = linePoints(eq);
                if (!pts) return null;
                return (
                  <line key={i}
                    x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]}
                    stroke={color} strokeWidth={2.5} strokeLinecap="round"
                    opacity={0.9}
                  />
                );
              })}
              {fpIntersect && (() => {
                const [sx, sy] = toSvg(fpIntersect[0], fpIntersect[1]);
                return <circle cx={sx} cy={sy} r={6} fill={C.gold} stroke="#fff" strokeWidth={2} />;
              })()}
            </svg>
          </div>

          {/* Consequence panel */}
          <div style={{
            background: C.surface, borderRadius: 12, padding: '0.9rem 1rem',
            border: `2px solid ${fpConsequence.color}`,
          }}>
            <div style={{ color: C.text, fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.35rem' }}>
              {fpConsequence.simple}
            </div>
            <div style={{ color: '#475569', fontSize: '0.75rem' }}>
              {fpConsequence.detail}
            </div>
          </div>
        </div>

      </div>
    </LabShell>
  );
}
