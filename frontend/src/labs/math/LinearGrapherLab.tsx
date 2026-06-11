import { useState, useMemo } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about y = ax + b',
  points: [
    'Every linear equation y = ax + b draws a straight line on the coordinate plane.',
    'a is the slope — it controls the steepness. Positive a → line goes up; negative a → line goes down.',
    'b is the y-intercept — the point (0, b) where the line crosses the y-axis.',
    'Lines with the same slope but different b are parallel and never meet.',
    'Linear growth has positive slope; linear decay has negative slope.',
  ],
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

interface Challenge {
  id: number;
  question: string;
  a: number;
  b: number;
  askSlope: boolean;
  answer: number;
  why: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    question: 'The line y = 3x − 2 is shown. What is the y-intercept?',
    a: 3, b: -2, askSlope: false, answer: -2,
    why: 'The y-intercept is b = −2. The line crosses the y-axis at (0, −2).',
  },
  {
    id: 2,
    question: 'The line y = −2x + 4 is shown. What is the slope?',
    a: -2, b: 4, askSlope: true, answer: -2,
    why: 'Slope a = −2. Negative slope → linear decay (line goes downward left-to-right).',
  },
  {
    id: 3,
    question: 'The line y = x + 5 is shown. What is the y-intercept?',
    a: 1, b: 5, askSlope: false, answer: 5,
    why: 'b = 5. The line crosses the y-axis at (0, 5), 5 units above the origin.',
  },
  {
    id: 4,
    question: 'The line y = 2x − 3 is shown. What is the slope?',
    a: 2, b: -3, askSlope: true, answer: 2,
    why: 'Slope a = 2. Positive slope → linear growth. For every 1 unit right, the line rises 2 units.',
  },
  {
    id: 5,
    question: 'The line y = −x + 0 is shown. What is the y-intercept?',
    a: -1, b: 0, askSlope: false, answer: 0,
    why: 'b = 0. The line passes through the origin (0, 0). Lines y = ax all pass through the origin.',
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
  orange: '#f97316',
};

const W = 340, H = 340;
const RANGE = 7;

function toSvg(x: number, y: number): [number, number] {
  return [
    (x + RANGE) / (2 * RANGE) * W,
    H - (y + RANGE) / (2 * RANGE) * H,
  ];
}

function lineEndpoints(a: number, b: number): [[number, number], [number, number]] {
  const xA = -RANGE, yA = a * xA + b;
  const xB = RANGE, yB = a * xB + b;
  return [toSvg(xA, yA), toSvg(xB, yB)];
}

function GridLines() {
  return (
    <>
      {Array.from({ length: 13 }, (_, i) => i - 6).map(v => {
        const [x1, y1] = toSvg(v, -RANGE);
        const [x2, y2] = toSvg(v, RANGE);
        const [hx1, hy1] = toSvg(-RANGE, v);
        const [hx2, hy2] = toSvg(RANGE, v);
        return (
          <g key={v}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={v === 0 ? '#475569' : '#1e293b'} strokeWidth={v === 0 ? 1.5 : 1} />
            <line x1={hx1} y1={hy1} x2={hx2} y2={hy2} stroke={v === 0 ? '#475569' : '#1e293b'} strokeWidth={v === 0 ? 1.5 : 1} />
            {v !== 0 && (
              <>
                <text x={toSvg(v, 0)[0]} y={toSvg(0, 0)[1] + 14} textAnchor="middle" fontSize="9" fill="#475569">{v}</text>
                <text x={toSvg(0, 0)[0] - 12} y={toSvg(0, v)[1] + 4} textAnchor="middle" fontSize="9" fill="#475569">{v}</text>
              </>
            )}
          </g>
        );
      })}
    </>
  );
}

interface LineGraphProps {
  a: number;
  b: number;
  color: string;
  showYIntercept?: boolean;
  showSlope?: boolean;
}

function LineGraph({ a, b, color, showYIntercept, showSlope }: LineGraphProps) {
  const [p1, p2] = lineEndpoints(a, b);
  const [ix, iy] = toSvg(0, b); // y-intercept point
  const [rx1, ry1] = toSvg(1, a * 1 + b);
  const [rx0, ry0] = toSvg(0, b);

  return (
    <>
      <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      {showYIntercept && (
        <circle cx={ix} cy={iy} r={5} fill={C.gold} stroke="#fff" strokeWidth={1.5} />
      )}
      {showSlope && (
        <>
          <line x1={rx0} y1={ry0} x2={rx1} y2={ry0} stroke={C.gold} strokeWidth={1.5} strokeDasharray="4,3" />
          <line x1={rx1} y1={ry0} x2={rx1} y2={ry1} stroke={C.orange} strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={rx1 + 8} y={(ry0 + ry1) / 2 + 4} fontSize="10" fill={C.orange} fontWeight="bold">
            {a > 0 ? '+' : ''}{a}
          </text>
        </>
      )}
    </>
  );
}

export default function LinearGrapherLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showWhy, setShowWhy] = useState(false);

  // Free-play
  const [fp, setFp] = useState({ a: 1, b: 0 });

  const allDone = completed.length === CHALLENGES.length;
  const ch = CHALLENGES[cIdx];

  const fpConsequence = useMemo(() => {
    if (fp.a > 0) return { color: C.green, text: `📈 Linear growth — slope a = ${fp.a} (positive). Every step right, y rises by ${fp.a}.` };
    if (fp.a < 0) return { color: C.red, text: `📉 Linear decay — slope a = ${fp.a} (negative). Every step right, y falls by ${Math.abs(fp.a)}.` };
    return { color: C.dim, text: `➡️ Horizontal line — slope = 0. y is always ${fp.b}, no matter what x is.` };
  }, [fp]);

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
          setShowWhy(false);
        }
      }, 1300);
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

        {/* Progress */}
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

        {/* Challenge */}
        {!allDone ? (
          <div style={{ background: C.surface, borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ background: C.primary, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{ fontSize: '0.82rem', color: C.gold, fontWeight: 700, fontFamily: 'monospace' }}>
                y = {ch.a}x {ch.b >= 0 ? '+' : '−'} {Math.abs(ch.b)}
              </span>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.text, marginBottom: '1.25rem' }}>
              {ch.question}
            </div>

            {/* Graph */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <svg width={W} height={H} style={{ borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
                <GridLines />
                <LineGraph
                  a={ch.a} b={ch.b}
                  color={C.primary}
                  showYIntercept={!ch.askSlope}
                  showSlope={ch.askSlope}
                />
              </svg>
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={ch.askSlope ? 'Enter slope (a)' : 'Enter y-intercept (b)'}
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
              <div style={{ color: C.green, fontWeight: 700, fontSize: '0.9rem' }}>
                ✓ Correct! {ch.askSlope ? `Slope a` : 'y-intercept b'} = {ch.answer}
                {' '}<button onClick={() => setShowWhy(w => !w)} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                  {showWhy ? 'Hide' : 'Why?'}
                </button>
              </div>
            )}
            {feedback === 'wrong' && (
              <div style={{ color: C.red, fontSize: '0.85rem' }}>
                Not quite — {ch.askSlope ? 'the slope is the coefficient of x' : 'the y-intercept is b (set x = 0)'}. Try again.
              </div>
            )}
            {showWhy && (
              <div style={{ marginTop: '0.5rem', background: C.bg, borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: C.dim, fontStyle: 'italic' }}>
                💡 {ch.why}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#052e16', border: `2px solid ${C.green}`, borderRadius: 16, padding: '1.25rem', textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: C.green, margin: 0 }}>
              🎯 All 5 challenges complete! Save & finish below.
            </p>
          </div>
        )}

        {/* Free-play */}
        <div style={{ background: C.bg, borderRadius: 16, padding: '1.25rem', border: `1px solid ${C.surface}` }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Free Explorer — Drag to change slope and y-intercept
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: C.primary, fontWeight: 700 }}>
                <span>Slope a</span><span>{fp.a}</span>
              </div>
              <input type="range" min={-5} max={5} step={1} value={fp.a}
                onChange={e => setFp(p => ({ ...p, a: parseInt(e.target.value) }))}
                style={{ accentColor: C.primary }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: C.gold, fontWeight: 700 }}>
                <span>y-intercept b</span><span>{fp.b}</span>
              </div>
              <input type="range" min={-6} max={6} step={1} value={fp.b}
                onChange={e => setFp(p => ({ ...p, b: parseInt(e.target.value) }))}
                style={{ accentColor: C.gold }} />
            </label>
          </div>

          <div style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 800, color: C.gold, marginBottom: '1rem', fontFamily: 'monospace' }}>
            y = {fp.a}x {fp.b >= 0 ? '+' : '−'} {Math.abs(fp.b)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <svg width={W} height={H} style={{ borderRadius: 12, background: '#0a0f1e', border: `1px solid ${C.border}` }}>
              <GridLines />
              <LineGraph
                a={fp.a} b={fp.b}
                color={C.primary}
                showYIntercept
                showSlope
              />
              {/* y-intercept label */}
              {(() => {
                const [ix, iy] = toSvg(0, fp.b);
                return (
                  <text x={ix + 10} y={iy - 8} fontSize="11" fill={C.gold} fontWeight="bold">
                    ({0}, {fp.b})
                  </text>
                );
              })()}
            </svg>
          </div>

          <div style={{
            background: C.surface, borderRadius: 12, padding: '0.85rem 1rem',
            border: `2px solid ${fpConsequence.color}`,
          }}>
            <div style={{ color: C.text, fontSize: '0.85rem', lineHeight: 1.6 }}>
              {fpConsequence.text}
            </div>
            <div style={{ color: C.dim, fontSize: '0.75rem', marginTop: '0.3rem' }}>
              y-intercept: line crosses y-axis at (0, {fp.b}).
              {fp.a !== 0 ? ` Slope: for every +1 in x, y changes by ${fp.a > 0 ? '+' : ''}${fp.a}.` : ''}
            </div>
          </div>
        </div>

      </div>
    </LabShell>
  );
}
