import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about GP terms',
  points: [
    'The nth term formula tₙ = arⁿ⁻¹ multiplies the first term by r exactly (n−1) times.',
    'If r > 1, terms grow exponentially (very fast). If 0 < r < 1, terms shrink toward 0.',
    'If r = −1, terms alternate between a and −a. If r < 0, terms alternate in sign.',
    'To find which position a value v occupies: solve arⁿ⁻¹ = v for n.',
    'Given two terms, divide one by the other to find a power of r, then extract r.',
    'GP points on a graph form a curve (exponential), not a straight line like an AP.',
  ],
};

interface Challenge {
  id: number;
  label: string;
  given: string;
  find: string;
  answer: string;
  hint: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    label: 'Find the 6th term',
    given: 'a = 3,  r = 2,  n = 6',
    find: 't₆ = ?',
    answer: '96',
    hint: 't₆ = 3 × 2⁵ = 3 × 32 = 96',
  },
  {
    id: 2,
    label: 'Find which term equals 4374',
    given: 'GP: 2, 6, 18, …   (a=2, r=3)',
    find: 'n = ?',
    answer: '8',
    hint: '2 × 3ⁿ⁻¹ = 4374 → 3ⁿ⁻¹ = 2187 = 3⁷ → n−1 = 7 → n = 8',
  },
  {
    id: 3,
    label: 'Find the common ratio',
    given: 'GP: 5, 15/4, 45/16, …',
    find: 'r = ? (enter as decimal)',
    answer: '0.75',
    hint: 'r = t₂/t₁ = (15/4) ÷ 5 = 15/20 = 3/4 = 0.75',
  },
  {
    id: 4,
    label: 'Find the 10th term',
    given: 'GP: 5, 25, 125, …   (a=5, r=5)',
    find: 't₁₀ = ? (scientific notation: 5^10)',
    answer: '9765625',
    hint: 't₁₀ = 5 × 5⁹ = 5¹⁰ = 9,765,625',
  },
  {
    id: 5,
    label: 'Find the 12th term from 8th',
    given: 'GP with r = 2,  t₈ = 192',
    find: 't₁₂ = ?',
    answer: '3072',
    hint: 't₁₂/t₈ = r⁴ = 2⁴ = 16,  so t₁₂ = 192 × 16 = 3072',
  },
];

const C = {
  primary: '#8b5cf6',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  dim: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  red: '#ef4444',
  green: '#10b981',
  amber: '#f59e0b',
  bg: '#0f172a',
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

function GpBarChart({ a, r, n }: { a: number; r: number; n: number }) {
  const W = 520;
  const H = 140;
  const COUNT = 10;
  const terms = Array.from({ length: COUNT }, (_, i) => ({
    idx: i + 1,
    val: a * Math.pow(r, i),
  }));

  const maxAbs = Math.max(...terms.map((t) => Math.abs(t.val)), 1);
  const centerY = H * 0.6;
  const barW = (W - 60) / COUNT - 4;
  const scale = (centerY - 10) / maxAbs;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', background: C.bg, borderRadius: 8 }}
    >
      {/* zero axis */}
      <line x1={20} y1={centerY} x2={W - 10} y2={centerY} stroke="#334155" strokeWidth={1} />

      {terms.map(({ idx, val }) => {
        const x = 20 + (idx - 1) * ((W - 60) / COUNT + 4);
        const barH = Math.min(Math.abs(val) * scale, centerY - 4);
        const positive = val >= 0;
        const isSelected = idx === n;
        const color = isSelected ? C.primary : positive ? C.green : C.red;
        const barY = positive ? centerY - barH : centerY;

        return (
          <g key={idx}>
            <rect
              x={x}
              y={barY}
              width={barW}
              height={Math.max(barH, 2)}
              fill={color}
              opacity={isSelected ? 1 : 0.55}
              rx={2}
            />
            <text
              x={x + barW / 2}
              y={H - 4}
              textAnchor="middle"
              fill={isSelected ? C.primary : C.dim}
              fontSize={9}
              fontWeight={isSelected ? '700' : '400'}
            >
              {idx}
            </text>
            {isSelected && (
              <text
                x={x + barW / 2}
                y={positive ? barY - 4 : barY + barH + 12}
                textAnchor="middle"
                fill={C.primary}
                fontSize={10}
                fontWeight="700"
              >
                {Math.round(val * 1000) / 1000}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function GpTermExplorerLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [fp, setFp] = useState({ a: 3, r: 2, n: 4 });

  const challenge = CHALLENGES[challengeIdx];

  const handleSubmit = () => {
    const cleaned = input.trim().replace(/,/g, '');
    const expected = challenge.answer.replace(/,/g, '');
    if (cleaned === expected) {
      setCorrect(true);
      setWrong(false);
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 900);
    }
  };

  const handleNext = () => {
    if (challengeIdx < CHALLENGES.length - 1) {
      setChallengeIdx((i) => i + 1);
      setInput('');
      setCorrect(false);
      setWrong(false);
      setShowHint(false);
    } else {
      setAllDone(true);
    }
  };

  const fpTerm = fp.a * Math.pow(fp.r, fp.n - 1);
  const fpDisplay = Math.abs(fpTerm) > 1e9 ? fpTerm.toExponential(3) : (Math.round(fpTerm * 10000) / 10000).toString();

  const rOptions = [-3, -2, -1, -0.5, 0.5, 0.75, 2, 3];

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      onComplete={onComplete}
      takeaway={TAKEAWAY}
      artifact={{ challengeIdx, allDone }}
    >
      <div style={{ maxWidth: 580, margin: '0 auto', fontFamily: 'inherit' }}>

        {/* CHALLENGES */}
        {!allDone ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: C.dim, fontSize: '0.82rem', fontWeight: 600 }}>
                {'Challenge ' + (challengeIdx + 1) + ' of ' + CHALLENGES.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {CHALLENGES.map((_, i) => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: i < challengeIdx ? C.success : i === challengeIdx ? C.primary : C.border,
                  }} />
                ))}
              </div>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, marginBottom: '0.75rem' }}>
              <div style={{ color: C.dim, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                {challenge.label}
              </div>
              <div style={{ color: C.text, fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                {challenge.given}
              </div>
              <div style={{ color: C.primary, fontSize: '1rem', fontWeight: 600 }}>
                {'Find: ' + challenge.find}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: 10, background: C.surface, border: `1px solid ${correct ? C.success : C.border}`, marginBottom: '0.75rem' }}>
              {!correct ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="Your answer"
                    style={{
                      flex: '1 1 120px', padding: '0.45rem 0.7rem', borderRadius: 6,
                      border: `2px solid ${wrong ? C.red : C.border}`,
                      background: C.bg, color: C.text, fontSize: '1rem', fontWeight: 700,
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    style={{ padding: '0.45rem 1rem', borderRadius: 6, border: 'none', background: wrong ? C.red : C.primary, color: '#fff', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}
                  >
                    {wrong ? 'Wrong' : 'Check'}
                  </button>
                  <button
                    onClick={() => setShowHint((v) => !v)}
                    style={{ padding: '0.45rem 0.8rem', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    {showHint ? 'Hide hint' : 'Hint'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ color: C.success, fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    {'✓ Correct! ' + challenge.find.replace('?', challenge.answer)}
                  </div>
                  <button
                    onClick={handleNext}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: C.success, color: '#fff', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}
                  >
                    {challengeIdx < CHALLENGES.length - 1 ? 'Next Challenge →' : 'Finish Challenges!'}
                  </button>
                </div>
              )}
              {showHint && !correct && (
                <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: C.bg, color: C.warning, fontSize: '0.84rem' }}>
                  {challenge.hint}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', borderRadius: 10, background: '#022c22', border: `1px solid ${C.success}`, color: C.success, fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            🎉 All challenges complete! Click "Save & Finish Lab" below.
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, margin: '1.5rem 0' }} />

        {/* FREE PLAY */}
        <div>
          <h3 style={{ color: C.text, fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            {'Free Play: Explore tₙ = a · rⁿ⁻¹ live'}
          </h3>
          <p style={{ color: C.dim, fontSize: '0.8rem', marginBottom: '1rem' }}>
            Drag the sliders and watch the bar chart update. Notice how the curve shape changes with r.
          </p>

          {/* Slider: a */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <span style={{ width: 160, color: C.dim, fontSize: '0.82rem', fontWeight: 600, flexShrink: 0 }}>
              {'a (first term) = ' + fp.a}
            </span>
            <input
              type="range" min={-10} max={10} step={1} value={fp.a}
              onChange={(e) => setFp((p) => ({ ...p, a: Number(e.target.value) }))}
              style={{ flex: 1, accentColor: C.primary }}
            />
          </label>

          {/* Discrete r selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ width: 160, color: C.dim, fontSize: '0.82rem', fontWeight: 600, flexShrink: 0 }}>
              {'r (common ratio) = ' + fp.r}
            </span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {rOptions.map((rv) => (
                <button
                  key={rv}
                  onClick={() => setFp((p) => ({ ...p, r: rv }))}
                  style={{
                    padding: '0.25rem 0.5rem', borderRadius: 5, border: `1px solid ${fp.r === rv ? C.primary : C.border}`,
                    background: fp.r === rv ? C.primary : 'transparent',
                    color: fp.r === rv ? '#fff' : C.dim,
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {rv}
                </button>
              ))}
            </div>
          </div>

          {/* Slider: n */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ width: 160, color: C.dim, fontSize: '0.82rem', fontWeight: 600, flexShrink: 0 }}>
              {'n (term number) = ' + fp.n}
            </span>
            <input
              type="range" min={1} max={10} step={1} value={fp.n}
              onChange={(e) => setFp((p) => ({ ...p, n: Number(e.target.value) }))}
              style={{ flex: 1, accentColor: C.primary }}
            />
          </label>

          {/* Formula display */}
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <span style={{ color: C.dim, fontSize: '0.9rem' }}>
              {'tₙ = ' + fp.a + ' × ' + fp.r + '^(' + fp.n + '−1) = '}
            </span>
            <span style={{
              fontSize: '1.6rem', fontWeight: 900,
              color: fpTerm > 0 ? C.green : fpTerm < 0 ? C.red : C.amber,
            }}>
              {fpDisplay}
            </span>
          </div>

          {/* GP type badge */}
          {(() => {
            let label = '';
            let color = C.amber;
            if (fp.r > 1) { label = 'Exponential Growth (r > 1)'; color = C.green; }
            else if (fp.r === 1) { label = 'Constant Sequence (r = 1)'; color = C.amber; }
            else if (fp.r > 0 && fp.r < 1) { label = 'Decay toward 0 (0 < r < 1)'; color = C.warning; }
            else if (fp.r === -1) { label = 'Alternating ±a (r = −1)'; color = '#a78bfa'; }
            else if (fp.r < 0) { label = 'Alternating + Changing magnitude (r < 0)'; color = C.red; }
            return label ? (
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, border: `1px solid ${color}`, color, fontSize: '0.78rem', fontWeight: 700 }}>
                  {label}
                </span>
              </div>
            ) : null;
          })()}

          {/* Bar chart */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ color: C.dim, fontSize: '0.75rem', marginBottom: '4px', textAlign: 'right' }}>
              term index →
            </div>
            <GpBarChart a={fp.a} r={fp.r} n={fp.n} />
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[['positive', C.green], ['negative', C.red], ['selected n', C.primary]].map(([label, color]) => (
              <span key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.dim, fontSize: '0.75rem' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color as string }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </LabShell>
  );
}
