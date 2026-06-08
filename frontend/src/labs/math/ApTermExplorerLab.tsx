import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about AP terms',
  points: [
    'The nth term formula a\u2099 = a + (n\u22121)d extends from the first term by (n\u22121) steps of d.',
    'If d > 0 terms increase; if d < 0 terms decrease; if d = 0 all terms are equal.',
    'To find which position a value v occupies: solve v = a + (n\u22121)d for n. If n is not a positive integer, v is not a term.',
    'Given two terms a\u209A and a\u1D69, solve two simultaneous equations to find a and d.',
    'The last term l of a finite AP = a + (m\u22121)d where m is the total number of terms.',
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
    label: 'Find the 10th term',
    given: 'a = 2,  d = 5,  n = 10',
    find: 'a\u2081\u2080 = ?',
    answer: '47',
    hint: 'a\u2081\u2080 = 2 + (10\u22121)\u00d75 = 2 + 45 = 47',
  },
  {
    id: 2,
    label: 'Find which term equals \u221262',
    given: 'a = 10,  d = \u22123,  a\u2099 = \u221262',
    find: 'n = ?',
    answer: '25',
    hint: '\u221262 = 10 + (n\u22121)(\u22123) \u2192 \u221272 = \u22123(n\u22121) \u2192 n\u22121 = 24 \u2192 n = 25',
  },
  {
    id: 3,
    label: 'Find the common difference',
    given: 'a\u2083 = 5,  a\u2087 = 9',
    find: 'd = ?',
    answer: '1',
    hint: 'a + 2d = 5 and a + 6d = 9. Subtract: 4d = 4 \u2192 d = 1',
  },
  {
    id: 4,
    label: 'Find the 15th term (negative d)',
    given: 'a = \u22127,  d = \u22122,  n = 15',
    find: 'a\u2081\u2085 = ?',
    answer: '-35',
    hint: 'a\u2081\u2085 = \u22127 + (15\u22121)(\u22122) = \u22127 + (\u221228) = \u221235',
  },
  {
    id: 5,
    label: 'Find the first term from two given terms',
    given: 'a\u2081\u2081 = 38,  a\u2081\u2086 = 73',
    find: 'a (first term) = ?',
    answer: '-32',
    hint: 'a+10d=38 and a+15d=73. Subtract: 5d=35\u2192d=7. Then a=38\u221270=\u221232',
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
  amber: '#f59e0b',
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

function NumberLine({ a, d, n }: { a: number; d: number; n: number }) {
  const W = 520;
  const H = 100;
  const terms = Array.from({ length: 15 }, (_, i) => ({ idx: i + 1, val: a + i * d }));
  const vals = terms.map((t) => t.val);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = maxV - minV || 1;
  const pad = 30;

  const toX = (v: number) => pad + ((v - minV) / span) * (W - 2 * pad);
  const cy = H / 2;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', background: '#0f172a', borderRadius: 8 }}
    >
      {/* axis */}
      <line x1={pad} y1={cy} x2={W - pad} y2={cy} stroke="#334155" strokeWidth={1.5} />
      {terms.map(({ idx, val }) => {
        const cx = toX(val);
        const isSelected = idx === n;
        const color = val > 0 ? COLORS.green : val < 0 ? COLORS.red : COLORS.amber;
        return (
          <g key={idx}>
            <circle
              cx={cx}
              cy={cy}
              r={isSelected ? 9 : 5}
              fill={isSelected ? COLORS.primary : color}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={2}
              opacity={isSelected ? 1 : 0.7}
            />
            {isSelected && (
              <text
                x={cx}
                y={cy - 16}
                textAnchor="middle"
                fill={COLORS.primary}
                fontSize={11}
                fontWeight="700"
              >
                {'a\u2099=' + val}
              </text>
            )}
            {(idx === 1 || idx % 5 === 0) && !isSelected && (
              <text x={cx} y={cy + 20} textAnchor="middle" fill={COLORS.dim} fontSize={9}>
                {idx}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ApTermExplorerLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [fp, setFp] = useState({ a: 2, d: 3, n: 5 });

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

  const fpTerm = fp.a + (fp.n - 1) * fp.d;

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
            {/* Progress dots */}
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

            {/* Challenge card */}
            <div style={{ padding: '1.25rem', borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, marginBottom: '0.75rem' }}>
              <div style={{ color: COLORS.dim, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                {challenge.label}
              </div>
              <div style={{ color: COLORS.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                {challenge.given}
              </div>
              <div style={{ color: COLORS.primary, fontSize: '1rem', fontWeight: 600 }}>
                {'Find: ' + challenge.find}
              </div>
            </div>

            {/* Input */}
            <div style={{ padding: '1rem', borderRadius: 10, background: COLORS.surface, border: `1px solid ${correct ? COLORS.success : COLORS.border}`, marginBottom: '0.75rem' }}>
              {!correct ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="Your answer"
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
                    {'\u2713 Correct! ' + challenge.find.replace('?', challenge.answer)}
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
          <h3 style={{ color: COLORS.text, fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            {'Free Play: Explore a\u2099 = a + (n\u22121)d live'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {([
              { key: 'a' as const, label: 'a (first term)', min: -20, max: 20, step: 1 },
              { key: 'd' as const, label: 'd (common diff)', min: -10, max: 10, step: 1 },
              { key: 'n' as const, label: 'n (term number)', min: 1, max: 15, step: 1 },
            ] as const).map(({ key, label, min, max, step }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: 140, color: COLORS.dim, fontSize: '0.82rem', fontWeight: 600, flexShrink: 0 }}>
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

          {/* Formula display */}
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <span style={{ color: COLORS.dim, fontSize: '0.9rem' }}>
              {'a\u2099 = ' + fp.a + ' + (' + fp.n + '\u22121)\u00d7' + fp.d + ' = '}
            </span>
            <span style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: fpTerm > 0 ? COLORS.green : fpTerm < 0 ? COLORS.red : COLORS.amber,
            }}>
              {fpTerm}
            </span>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {[['positive', COLORS.green], ['zero', COLORS.amber], ['negative', COLORS.red], ['selected n', COLORS.primary]].map(([label, color]) => (
              <span key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4, color: COLORS.dim, fontSize: '0.75rem' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color as string }} />
                {label}
              </span>
            ))}
          </div>

          <NumberLine a={fp.a} d={fp.d} n={fp.n} />
        </div>
      </div>
    </LabShell>
  );
}
