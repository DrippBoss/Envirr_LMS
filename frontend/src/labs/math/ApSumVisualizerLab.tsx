import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about AP sums',
  points: [
    "Gauss's insight: pairing first and last terms gives (a+l), and there are n/2 such pairs \u2192 S = n/2(a+l).",
    'The formula S\u2099 = n/2[2a+(n\u22121)d] works even without knowing the last term.',
    'When d < 0, the AP has both positive and negative terms \u2014 the sum can be 0 or negative.',
    'a\u2099 = S\u2099 \u2212 S\u2099\u208B\u2081: each new term is the increase in sum from (n\u22121) to n terms.',
    'For sum of first n positive integers: S\u2099 = n(n+1)/2 \u2014 a special case with a=1, d=1.',
  ],
};

interface Challenge {
  id: number;
  label: string;
  given: string;
  answer: string;
  hint: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    label: 'Sum of first 10 terms',
    given: 'AP: 2, 7, 12, \u2026  (a=2, d=5, n=10)',
    answer: '245',
    hint: 'S\u2081\u2080 = 10/2 \u00d7 [2\u00d72 + 9\u00d75] = 5 \u00d7 [4+45] = 5 \u00d7 49 = 245',
  },
  {
    id: 2,
    label: 'Sum of first 12 terms (negative AP)',
    given: 'AP: \u221237, \u221233, \u221229, \u2026  (a=\u221237, d=4, n=12)',
    answer: '-180',
    hint: 'S\u2081\u2082 = 12/2 \u00d7 [2(\u221237)+11\u00d74] = 6 \u00d7 [\u221274+44] = 6 \u00d7 (\u221230) = \u2212180',
  },
  {
    id: 3,
    label: "Gauss's classic: 1+2+3+\u2026+100",
    given: 'AP: 1, 2, 3, \u2026, 100  (a=1, d=1, n=100)',
    answer: '5050',
    hint: 'S\u2081\u2080\u2080 = 100/2 \u00d7 (1+100) = 50 \u00d7 101 = 5050',
  },
  {
    id: 4,
    label: 'Find S\u2081\u2086 given a and d',
    given: 'a = 5,  d = 3,  n = 16',
    answer: '440',
    hint: 'S\u2081\u2086 = 16/2 \u00d7 [2\u00d75+15\u00d73] = 8 \u00d7 [10+45] = 8 \u00d7 55 = 440',
  },
  {
    id: 5,
    label: 'Sum of first 15 multiples of 8',
    given: 'AP: 8, 16, 24, \u2026  (a=8, d=8, n=15)',
    answer: '960',
    hint: 'S\u2081\u2085 = 15/2 \u00d7 (8+120) = 15/2 \u00d7 128 = 15 \u00d7 64 = 960',
  },
];

const COLORS = {
  primary: '#6366f1',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  dim: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  red: '#ef4444',
  green: '#10b981',
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

function BarChart({ a, d, n, showGauss }: { a: number; d: number; n: number; showGauss: boolean }) {
  const W = 520;
  const H = 160;
  const terms = Array.from({ length: n }, (_, i) => a + i * d);
  const maxAbs = Math.max(...terms.map(Math.abs), 1);
  const barW = Math.max(4, Math.min(28, (W - 20) / n - 2));
  const totalW = n * (barW + 2) - 2;
  const startX = (W - totalW) / 2;
  const zeroY = H * 0.6;
  const scaleH = (zeroY - 10) / maxAbs;

  const getBarX = (i: number) => startX + i * (barW + 2);
  const getBarProps = (val: number) => {
    if (val >= 0) {
      const h = Math.max(2, val * scaleH);
      return { y: zeroY - h, height: h };
    } else {
      const h = Math.max(2, Math.abs(val) * scaleH);
      return { y: zeroY, height: h };
    }
  };
  const getBarColor = (val: number) => (val >= 0 ? COLORS.green : COLORS.red);

  const lastTerm = a + (n - 1) * d;
  const sum = (n * (a + lastTerm)) / 2;

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', background: '#0f172a', borderRadius: 8 }}
      >
        {/* zero axis */}
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="#334155" strokeWidth={1.5} />

        {/* bars */}
        {terms.map((val, i) => {
          const { y, height } = getBarProps(val);
          const bx = getBarX(i);
          return (
            <rect
              key={i}
              x={bx}
              y={y}
              width={barW}
              height={height}
              fill={getBarColor(val)}
              opacity={0.8}
              rx={2}
            />
          );
        })}

        {/* Gauss arcs */}
        {showGauss &&
          Array.from({ length: Math.floor(n / 2) }, (_, i) => {
            const i1 = i;
            const i2 = n - 1 - i;
            if (i1 >= i2) return null;
            const x1 = getBarX(i1) + barW / 2;
            const x2 = getBarX(i2) + barW / 2;
            const midX = (x1 + x2) / 2;
            const arcY = 8 + i * 12;
            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${zeroY - 2} Q ${midX} ${arcY} ${x2} ${zeroY - 2}`}
                  fill="none"
                  stroke={COLORS.warning}
                  strokeWidth={1.5}
                  opacity={0.7}
                />
                <text x={midX} y={arcY - 2} textAnchor="middle" fill={COLORS.warning} fontSize={8} fontWeight="700">
                  {terms[i1] + terms[i2]}
                </text>
              </g>
            );
          })}

        {/* bar labels (only if few terms) */}
        {n <= 12 &&
          terms.map((val, i) => {
            const bx = getBarX(i) + barW / 2;
            const { y, height } = getBarProps(val);
            const labelY = val >= 0 ? y - 3 : y + height + 10;
            return (
              <text key={i} x={bx} y={labelY} textAnchor="middle" fill={COLORS.dim} fontSize={9}>
                {val}
              </text>
            );
          })}
      </svg>

      {/* Sum display below chart */}
      <div style={{ textAlign: 'center', marginTop: '0.5rem', color: COLORS.dim, fontSize: '0.85rem' }}>
        {'S\u2099 = n/2[2a+(n\u22121)d] = '}
        <span style={{ color: COLORS.primary, fontWeight: 900, fontSize: '1.2rem' }}>{sum}</span>
      </div>
    </div>
  );
}

export default function ApSumVisualizerLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [fp, setFp] = useState({ a: 2, d: 3, n: 8 });
  const [showGauss, setShowGauss] = useState(false);

  const challenge = CHALLENGES[challengeIdx];

  const handleSubmit = () => {
    const cleaned = input.trim().replace(/\s/g, '');
    const expected = challenge.answer.replace(/\s/g, '');
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

  const fpLastTerm = fp.a + (fp.n - 1) * fp.d;
  const fpSum = (fp.n * (fp.a + fpLastTerm)) / 2;

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
              <span style={{ color: COLORS.dim, fontSize: '0.82rem', fontWeight: 600 }}>
                {'Challenge ' + (challengeIdx + 1) + ' of ' + CHALLENGES.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {CHALLENGES.map((_, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < challengeIdx ? COLORS.success : i === challengeIdx ? COLORS.primary : COLORS.border }} />
                ))}
              </div>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, marginBottom: '0.75rem' }}>
              <div style={{ color: COLORS.dim, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                {challenge.label}
              </div>
              <div style={{ color: COLORS.text, fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                {challenge.given}
              </div>
              <div style={{ color: COLORS.primary, fontSize: '0.95rem', fontWeight: 600 }}>
                {'Find: S = ?'}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: 10, background: COLORS.surface, border: `1px solid ${correct ? COLORS.success : COLORS.border}`, marginBottom: '0.75rem' }}>
              {!correct ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="Sum = ?"
                    style={{ flex: '1 1 120px', padding: '0.45rem 0.7rem', borderRadius: 6, border: `2px solid ${wrong ? COLORS.red : COLORS.border}`, background: '#0f172a', color: COLORS.text, fontSize: '1rem', fontWeight: 700, outline: 'none', transition: 'border-color 0.2s' }}
                  />
                  <button
                    onClick={handleSubmit}
                    style={{ padding: '0.45rem 1rem', borderRadius: 6, border: 'none', background: wrong ? COLORS.red : COLORS.primary, color: '#fff', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    {wrong ? 'Wrong' : 'Check'}
                  </button>
                  <button
                    onClick={() => setShowHint((v) => !v)}
                    style={{ padding: '0.45rem 0.8rem', borderRadius: 6, border: `1px solid ${COLORS.border}`, background: 'transparent', color: COLORS.dim, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    {showHint ? 'Hide hint' : 'Hint'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ color: COLORS.success, fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    {'\u2713 Correct! S = ' + challenge.answer}
                  </div>
                  <button
                    onClick={handleNext}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: COLORS.success, color: '#fff', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}
                  >
                    {challengeIdx < CHALLENGES.length - 1 ? 'Next Challenge \u2192' : 'Finish Challenges!'}
                  </button>
                </div>
              )}
              {showHint && !correct && (
                <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: '#0f172a', color: COLORS.warning, fontSize: '0.84rem' }}>
                  {challenge.hint}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', borderRadius: 10, background: '#022c22', border: `1px solid ${COLORS.success}`, color: COLORS.success, fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            {'\uD83C\uDF89 All challenges complete! Click \u201cSave & Finish Lab\u201d below.'}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: '1.5rem 0' }} />

        {/* FREE PLAY */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: COLORS.text, fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              {'Free Play: Visualise S\u2099 = n/2[2a+(n\u22121)d]'}
            </h3>
            <button
              onClick={() => setShowGauss((v) => !v)}
              style={{ padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${showGauss ? COLORS.warning : COLORS.border}`, background: showGauss ? '#451a03' : 'transparent', color: showGauss ? COLORS.warning : COLORS.dim, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              {showGauss ? 'Hide Gauss pairs' : 'Show Gauss pairs'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {([
              { key: 'a' as const, label: 'a (first term)', min: -15, max: 20, step: 1 },
              { key: 'd' as const, label: 'd (common diff)', min: -8, max: 8, step: 1 },
              { key: 'n' as const, label: 'n (terms)', min: 2, max: 16, step: 1 },
            ] as const).map(({ key, label, min, max, step }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: 150, color: COLORS.dim, fontSize: '0.82rem', fontWeight: 600, flexShrink: 0 }}>
                  {label + ' = ' + fp[key]}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={fp[key]}
                  onChange={(e) => setFp((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  style={{ flex: 1, accentColor: COLORS.primary }}
                />
              </label>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '0.75rem', color: COLORS.dim, fontSize: '0.84rem' }}>
            {'a\u2099 = ' + fpLastTerm + '  \u2022  '}
            <span style={{ color: COLORS.text, fontWeight: 700 }}>
              {'S\u2099 = ' + fpSum}
            </span>
            {showGauss && (
              <span style={{ color: COLORS.warning, marginLeft: '0.5rem' }}>
                {'  (each pair sums to ' + (fp.a + fpLastTerm) + ')'}
              </span>
            )}
          </div>

          <BarChart a={fp.a} d={fp.d} n={fp.n} showGauss={showGauss} />

          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {[['positive term', COLORS.green], ['negative term', COLORS.red], ['Gauss pair arc', COLORS.warning]].map(([label, color]) => (
              <span key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4, color: COLORS.dim, fontSize: '0.75rem' }}>
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
