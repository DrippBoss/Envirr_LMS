import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about factorising quadratics',
  points: [
    'A quadratic equation ax\u00b2+bx+c=0 has at most 2 roots \u2014 the x-values where the parabola crosses the x-axis.',
    'Factorisation: split bx into px+qx where pq=ac and p+q=b, then group and factor.',
    'Zero Product Property: (x\u2212p)(x\u2212q)=0 \u2192 x=p or x=q.',
    'A repeated root (x\u2212p)\u00b2=0 means the parabola just touches the x-axis at its vertex.',
    'If no integer split works for bx, use the quadratic formula \u2014 it always works when D\u22650.',
  ],
};

const CHALLENGES = [
  {
    id: 1,
    equation: 'x\u00b2 \u2212 5x + 6 = 0',
    partialFactor: '(x \u2212 2)(x \u2212 ___)',
    answer: '3',
    roots: 'x = 2 or x = 3',
    explanation: 'pq = 6, p+q = \u22125 \u2192 \u22122 and \u22123. So (x\u22122)(x\u22123)=0.',
  },
  {
    id: 2,
    equation: 'x\u00b2 \u2212 3x \u2212 10 = 0',
    partialFactor: '(x \u2212 5)(x + ___)',
    answer: '2',
    roots: 'x = 5 or x = \u22122',
    explanation: 'pq = \u221210, p+q = \u22123 \u2192 \u22125 and 2. So (x\u22125)(x+2)=0.',
  },
  {
    id: 3,
    equation: '2x\u00b2 + x \u2212 6 = 0',
    partialFactor: '(2x \u2212 3)(x + ___)',
    answer: '2',
    roots: 'x = 3/2 or x = \u22122',
    explanation: 'pq = 2\u00d7(\u22126)=\u221212, p+q = 1 \u2192 4 and \u22123. Factor: (2x\u22123)(x+2)=0.',
  },
  {
    id: 4,
    equation: 'x\u00b2 \u2212 6x + 9 = 0',
    partialFactor: '(x \u2212 ___)\u00b2',
    answer: '3',
    roots: 'x = 3 (repeated root)',
    explanation: 'Perfect square: (x\u22123)\u00b2=0. The parabola just touches the x-axis at x=3.',
  },
  {
    id: 5,
    equation: '6x\u00b2 \u2212 x \u2212 2 = 0',
    partialFactor: '(3x \u2212 2)(2x + ___)',
    answer: '1',
    roots: 'x = 2/3 or x = \u22121/2',
    explanation: 'pq = 6\u00d7(\u22122)=\u221212, p+q = \u22121 \u2192 \u22124 and 3. Factor: (3x\u22122)(2x+1)=0.',
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
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

function ParabolaPlot({
  a,
  b,
  c,
}: {
  a: number;
  b: number;
  c: number;
}) {
  const W = 280;
  const H = 160;
  const xMin = -8;
  const xMax = 8;
  const yMin = -12;
  const yMax = 12;

  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) =>
    H - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * H;

  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = xMin + (i / 40) * (xMax - xMin);
    const y = a * x * x + b * x + c;
    pts.push(`${toSx(x)},${toSy(y)}`);
  }

  const D = b * b - 4 * a * c;
  const intercepts: number[] = [];
  if (D >= 0) {
    const r1 = (-b + Math.sqrt(D)) / (2 * a);
    const r2 = (-b - Math.sqrt(D)) / (2 * a);
    intercepts.push(r1);
    if (Math.abs(r1 - r2) > 0.001) intercepts.push(r2);
  }

  return (
    <svg
      width={W}
      height={H}
      style={{ display: 'block', margin: '0 auto', background: '#0f172a', borderRadius: 8 }}
    >
      {/* axes */}
      <line
        x1={0}
        y1={toSy(0)}
        x2={W}
        y2={toSy(0)}
        stroke="#334155"
        strokeWidth={1}
      />
      <line
        x1={toSx(0)}
        y1={0}
        x2={toSx(0)}
        y2={H}
        stroke="#334155"
        strokeWidth={1}
      />
      {/* parabola */}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={COLORS.primary}
        strokeWidth={2.5}
      />
      {/* x-intercept dots */}
      {intercepts
        .filter((x) => x >= xMin && x <= xMax)
        .map((x, i) => (
          <circle
            key={i}
            cx={toSx(x)}
            cy={toSy(0)}
            r={5}
            fill={COLORS.warning}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
    </svg>
  );
}

export default function QuadraticRootsLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showRoots, setShowRoots] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const [allDone, setAllDone] = useState(false);

  // Free play state
  const [fp, setFp] = useState({ a: 1, b: -5, c: 6 });

  const challenge = CHALLENGES[challengeIdx];

  const handleSubmit = () => {
    if (userInput.trim().toLowerCase() === challenge.answer.toLowerCase()) {
      setShowRoots(true);
      setWrongAttempt(false);
    } else {
      setWrongAttempt(true);
      setTimeout(() => setWrongAttempt(false), 900);
    }
  };

  const handleNext = () => {
    if (challengeIdx < CHALLENGES.length - 1) {
      setChallengeIdx((idx) => idx + 1);
      setUserInput('');
      setShowRoots(false);
      setWrongAttempt(false);
    } else {
      setAllDone(true);
    }
  };

  // Free play discriminant / roots
  const fpD = fp.b * fp.b - 4 * fp.a * fp.c;
  const fpHasRoots = fpD >= 0;
  const fpSqrtD = fpHasRoots ? Math.sqrt(fpD) : 0;
  const fpR1 = fpHasRoots ? ((-fp.b + fpSqrtD) / (2 * fp.a)).toFixed(3) : null;
  const fpR2 = fpHasRoots ? ((-fp.b - fpSqrtD) / (2 * fp.a)).toFixed(3) : null;

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      onComplete={onComplete}
      takeaway={TAKEAWAY}
      artifact={{ challengeIdx, allDone }}
    >
      <div style={{ maxWidth: 580, margin: '0 auto', fontFamily: 'inherit' }}>

        {/* ── MICRO-CHALLENGES ── */}
        {!allDone ? (
          <div>
            {/* Progress */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <span style={{ color: COLORS.dim, fontSize: '0.82rem', fontWeight: 600 }}>
                {'Challenge ' + (challengeIdx + 1) + ' of ' + CHALLENGES.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {CHALLENGES.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: i < challengeIdx
                        ? COLORS.success
                        : i === challengeIdx
                        ? COLORS.primary
                        : COLORS.border,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Equation display */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '1.6rem',
                fontWeight: 700,
                color: COLORS.primary,
                letterSpacing: '0.02em',
                marginBottom: '1.25rem',
                padding: '1rem',
                background: COLORS.surface,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {challenge.equation}
            </div>

            {/* Partial factor + input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
                fontSize: '1.05rem',
                color: COLORS.text,
                fontWeight: 600,
              }}
            >
              <span>{challenge.partialFactor.replace('___', '')}</span>
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !showRoots) handleSubmit(); }}
                disabled={showRoots}
                placeholder="?"
                style={{
                  width: 64,
                  padding: '0.4rem 0.6rem',
                  borderRadius: 6,
                  border: `2px solid ${wrongAttempt ? COLORS.red : showRoots ? COLORS.success : COLORS.border}`,
                  background: '#0f172a',
                  color: COLORS.text,
                  fontSize: '1rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              {challenge.partialFactor.includes('___') && (
                <span style={{ color: COLORS.dim, fontSize: '0.85rem' }}>{'= 0'}</span>
              )}
            </div>

            {/* Submit button */}
            {!showRoots && (
              <button
                onClick={handleSubmit}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 8,
                  border: 'none',
                  background: wrongAttempt ? COLORS.red : COLORS.primary,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: '1rem',
                }}
              >
                {wrongAttempt ? 'Try again!' : 'Check Answer'}
              </button>
            )}

            {/* Correct feedback */}
            {showRoots && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 10,
                  background: '#022c22',
                  border: `1px solid ${COLORS.success}`,
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    color: COLORS.success,
                    fontWeight: 700,
                    fontSize: '1rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  {'\u2713 Correct!  Roots: ' + challenge.roots}
                </div>
                <div style={{ color: COLORS.dim, fontSize: '0.88rem', lineHeight: 1.5 }}>
                  {challenge.explanation}
                </div>
                <button
                  onClick={handleNext}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem 1.25rem',
                    borderRadius: 8,
                    border: 'none',
                    background: COLORS.success,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {challengeIdx < CHALLENGES.length - 1 ? 'Next Challenge \u2192' : 'Finish Challenges!'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              borderRadius: 10,
              background: '#022c22',
              border: `1px solid ${COLORS.success}`,
              color: COLORS.success,
              fontWeight: 700,
              fontSize: '1.1rem',
              marginBottom: '1.5rem',
            }}
          >
            {'\uD83C\uDF89 All challenges complete! Click \u201cSave & Finish Lab\u201d below.'}
          </div>
        )}

        {/* ── SEPARATOR ── */}
        <div
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            margin: '1.5rem 0',
          }}
        />

        {/* ── FREE PLAY ── */}
        <div>
          <h3
            style={{
              color: COLORS.text,
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            {'Free Play: Explore any quadratic'}
          </h3>

          {/* a, b, c number inputs */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {(['a', 'b', 'c'] as const).map((key) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  flex: '1 1 70px',
                }}
              >
                <span style={{ color: COLORS.dim, fontSize: '0.8rem', fontWeight: 600 }}>
                  {key === 'a' ? 'a (leading)' : key === 'b' ? 'b (linear)' : 'c (constant)'}
                </span>
                <input
                  type="number"
                  value={fp[key]}
                  onChange={(e) =>
                    setFp((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))
                  }
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.border}`,
                    background: '#0f172a',
                    color: COLORS.text,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </label>
            ))}
          </div>

          {/* Equation preview */}
          <div
            style={{
              textAlign: 'center',
              color: COLORS.dim,
              fontSize: '0.85rem',
              marginBottom: '0.75rem',
            }}
          >
            {fp.a + 'x\u00b2 + (' + fp.b + ')x + (' + fp.c + ') = 0'}
          </div>

          {/* D display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: COLORS.dim, fontSize: '0.88rem' }}>
              {'D = b\u00b2 \u2212 4ac ='}
            </span>
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.1rem',
                color: fpD > 0 ? COLORS.success : fpD === 0 ? COLORS.warning : COLORS.red,
              }}
            >
              {fpD}
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                padding: '0.15rem 0.55rem',
                borderRadius: 999,
                background:
                  fpD > 0
                    ? '#022c22'
                    : fpD === 0
                    ? '#451a03'
                    : '#450a0a',
                color: fpD > 0 ? COLORS.success : fpD === 0 ? COLORS.warning : COLORS.red,
                fontWeight: 700,
              }}
            >
              {fpD > 0 ? 'Two real roots' : fpD === 0 ? 'One repeated root' : 'No real roots'}
            </span>
          </div>

          {/* Roots display */}
          {fpHasRoots ? (
            <div
              style={{
                textAlign: 'center',
                color: COLORS.text,
                fontSize: '0.92rem',
                marginBottom: '0.75rem',
              }}
            >
              {'x = '}
              <span style={{ color: COLORS.warning, fontWeight: 700 }}>{fpR1}</span>
              {fpR1 !== fpR2 ? (
                <>
                  {' and x = '}
                  <span style={{ color: COLORS.warning, fontWeight: 700 }}>{fpR2}</span>
                </>
              ) : (
                <span style={{ color: COLORS.dim }}>{' (repeated)'}</span>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: COLORS.red,
                fontSize: '0.88rem',
                marginBottom: '0.75rem',
                fontWeight: 600,
              }}
            >
              {'\u2716 D < 0 \u2014 no real roots (parabola does not cross x-axis)'}
            </div>
          )}

          {/* SVG parabola */}
          {fp.a !== 0 && (
            <ParabolaPlot a={fp.a} b={fp.b} c={fp.c} />
          )}
          {fp.a === 0 && (
            <div style={{ textAlign: 'center', color: COLORS.red, fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {'a cannot be 0 (not a quadratic)'}
            </div>
          )}
        </div>
      </div>
    </LabShell>
  );
}
