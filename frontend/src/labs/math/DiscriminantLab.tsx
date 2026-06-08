import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about the discriminant',
  points: [
    'The discriminant D=b\u00b2\u22124ac tells you how many real roots exist BEFORE solving.',
    'D>0: Two distinct real roots \u2014 parabola crosses x-axis at two points.',
    'D=0: One repeated root \u2212b/2a \u2014 parabola vertex just touches x-axis.',
    'D<0: No real roots \u2014 parabola has no x-intercepts at all.',
    'Named \u201cdiscriminant\u201d because it discriminates between the three root cases.',
  ],
};

interface Challenge {
  id: number;
  equation: string;
  a: number;
  b: number;
  c: number;
  dAnswer: string;
  dValue: number;
  nature: string;
  hint: string;
  useCustomD?: boolean;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    equation: '2x\u00b2 \u2212 4x + 3 = 0',
    a: 2,
    b: -4,
    c: 3,
    dAnswer: '-8',
    dValue: -8,
    nature: 'No real roots',
    hint: 'b\u00b2\u22124ac = (\u22124)\u00b2\u22124(2)(3) = 16\u221224',
  },
  {
    id: 2,
    equation: 'x\u00b2 \u2212 5x + 6 = 0',
    a: 1,
    b: -5,
    c: 6,
    dAnswer: '1',
    dValue: 1,
    nature: 'Two distinct real roots',
    hint: 'b\u00b2\u22124ac = 25\u221224',
  },
  {
    id: 3,
    equation: '3x\u00b2 \u2212 4\u221a3x + 4 = 0',
    a: 3,
    b: -7,
    c: 4,
    dAnswer: '0',
    dValue: 0,
    nature: 'Two equal real roots',
    hint: 'b\u00b2\u22124ac = 48\u221248 = 0',
    useCustomD: true,
  },
  {
    id: 4,
    equation: 'x\u00b2 + 7x \u2212 60 = 0',
    a: 1,
    b: 7,
    c: -60,
    dAnswer: '289',
    dValue: 289,
    nature: 'Two distinct real roots',
    hint: 'b\u00b2\u22124ac = 49+240',
  },
  {
    id: 5,
    equation: 'x\u00b2 + 2x + 1 = 0',
    a: 1,
    b: 2,
    c: 1,
    dAnswer: '0',
    dValue: 0,
    nature: 'Two equal real roots',
    hint: 'b\u00b2\u22124ac = 4\u22124',
  },
];

const NATURE_OPTIONS = ['Two distinct real roots', 'Two equal real roots', 'No real roots'];

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

function Parabola({ a, b, c, color }: { a: number; b: number; c: number; color: string }) {
  const W = 280;
  const H = 140;
  const xMin = -8;
  const xMax = 8;
  const yMin = -10;
  const yMax = 15;

  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) =>
    H - ((Math.max(yMin, Math.min(yMax, y)) - yMin) / (yMax - yMin)) * H;

  const points: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = xMin + (i / 40) * (xMax - xMin);
    const y = a * x * x + b * x + c;
    points.push(`${toSx(x)},${toSy(y)}`);
  }

  const D = b * b - 4 * a * c;
  const intercepts: number[] = [];
  if (D >= 0) {
    intercepts.push((-b + Math.sqrt(D)) / (2 * a));
    if (D > 0) intercepts.push((-b - Math.sqrt(D)) / (2 * a));
  }

  return (
    <svg
      width={W}
      height={H}
      style={{ display: 'block', margin: '0 auto', background: '#0f172a', borderRadius: 8 }}
    >
      {/* axes */}
      <line x1={0} y1={toSy(0)} x2={W} y2={toSy(0)} stroke="#334155" strokeWidth={1} />
      <line x1={toSx(0)} y1={0} x2={toSx(0)} y2={H} stroke="#334155" strokeWidth={1} />
      {/* parabola */}
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2.5} />
      {/* intercepts */}
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

function getNatureColor(D: number): string {
  if (D > 0) return COLORS.success;
  if (D === 0) return COLORS.warning;
  return COLORS.red;
}

function getNatureLabel(D: number): string {
  if (D > 0) return 'Two distinct real roots';
  if (D === 0) return 'Two equal real roots';
  return 'No real roots';
}

export default function DiscriminantLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [dInput, setDInput] = useState('');
  const [dCorrect, setDCorrect] = useState(false);
  const [natureSelected, setNatureSelected] = useState('');
  const [wrongD, setWrongD] = useState(false);
  const [wrongNature, setWrongNature] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Free play state
  const [fp, setFp] = useState({ a: 1, b: -3, c: 2 });

  const challenge = CHALLENGES[challengeIdx];
  const natureCorrect = natureSelected === challenge.nature;

  const handleDSubmit = () => {
    const cleaned = dInput.trim().replace(/\s/g, '');
    const expected = challenge.dAnswer.replace(/\s/g, '');
    if (cleaned === expected) {
      setDCorrect(true);
      setWrongD(false);
    } else {
      setWrongD(true);
      setTimeout(() => setWrongD(false), 900);
    }
  };

  const handleNatureSelect = (option: string) => {
    if (natureSelected === challenge.nature) return; // already got it right
    setNatureSelected(option);
    if (option !== challenge.nature) {
      setWrongNature(true);
      setTimeout(() => {
        setWrongNature(false);
        setNatureSelected('');
      }, 800);
    }
  };

  const handleNext = () => {
    if (challengeIdx < CHALLENGES.length - 1) {
      setChallengeIdx((idx) => idx + 1);
      setDInput('');
      setDCorrect(false);
      setNatureSelected('');
      setWrongD(false);
      setWrongNature(false);
      setShowHint(false);
    } else {
      setAllDone(true);
    }
  };

  // Free play discriminant / roots
  const fpD = fp.b * fp.b - 4 * fp.a * fp.c;
  const fpSqrtD = fpD >= 0 ? Math.sqrt(fpD) : 0;
  const fpNatureColor = getNatureColor(fpD);
  const fpParabolaColor = fpD > 0 ? COLORS.success : fpD === 0 ? COLORS.warning : COLORS.red;

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
                      background:
                        i < challengeIdx
                          ? COLORS.success
                          : i === challengeIdx
                          ? COLORS.primary
                          : COLORS.border,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Equation */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '1.5rem',
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

            {/* Step 1: Enter D */}
            <div
              style={{
                padding: '1rem',
                borderRadius: 10,
                background: COLORS.surface,
                border: `1px solid ${dCorrect ? COLORS.success : COLORS.border}`,
                marginBottom: '0.75rem',
              }}
            >
              <div
                style={{
                  color: COLORS.text,
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  marginBottom: '0.6rem',
                }}
              >
                {'Step 1: Compute D = b\u00b2 \u2212 4ac'}
              </div>

              {!dCorrect ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={dInput}
                    onChange={(e) => setDInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleDSubmit(); }}
                    placeholder="D = ?"
                    style={{
                      flex: '1 1 100px',
                      padding: '0.45rem 0.7rem',
                      borderRadius: 6,
                      border: `2px solid ${wrongD ? COLORS.red : COLORS.border}`,
                      background: '#0f172a',
                      color: COLORS.text,
                      fontSize: '1rem',
                      fontWeight: 700,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                  />
                  <button
                    onClick={handleDSubmit}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: 6,
                      border: 'none',
                      background: wrongD ? COLORS.red : COLORS.primary,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {wrongD ? 'Incorrect' : 'Check D'}
                  </button>
                  <button
                    onClick={() => setShowHint((v) => !v)}
                    style={{
                      padding: '0.45rem 0.8rem',
                      borderRadius: 6,
                      border: `1px solid ${COLORS.border}`,
                      background: 'transparent',
                      color: COLORS.dim,
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {showHint ? 'Hide hint' : 'Hint'}
                  </button>
                </div>
              ) : (
                <div style={{ color: COLORS.success, fontWeight: 700, fontSize: '0.95rem' }}>
                  {'\u2713 D = ' + challenge.dValue}
                </div>
              )}

              {showHint && (
                <div
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    background: '#0f172a',
                    color: COLORS.warning,
                    fontSize: '0.84rem',
                  }}
                >
                  {challenge.hint}
                </div>
              )}
            </div>

            {/* Step 2: Nature of roots */}
            {dCorrect && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 10,
                  background: COLORS.surface,
                  border: `1px solid ${natureCorrect ? COLORS.success : COLORS.border}`,
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    color: COLORS.text,
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  {'Step 2: What is the nature of roots?'}
                </div>

                {!natureCorrect ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {NATURE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleNatureSelect(opt)}
                        style={{
                          padding: '0.6rem 1rem',
                          borderRadius: 8,
                          border: `2px solid ${
                            natureSelected === opt && wrongNature
                              ? COLORS.red
                              : COLORS.border
                          }`,
                          background:
                            natureSelected === opt && wrongNature ? '#450a0a' : '#0f172a',
                          color:
                            natureSelected === opt && wrongNature ? COLORS.red : COLORS.text,
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        color: COLORS.success,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {'\u2713 Correct: ' + challenge.nature}
                    </div>
                    <button
                      onClick={handleNext}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: 8,
                        border: 'none',
                        background: COLORS.success,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                      }}
                    >
                      {challengeIdx < CHALLENGES.length - 1 ? 'Next Challenge \u2192' : 'Finish Challenges!'}
                    </button>
                  </div>
                )}
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
        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: '1.5rem 0' }} />

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
            {'Free Play: Explore D = b\u00b2 \u2212 4ac live'}
          </h3>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {[
              { key: 'a' as const, label: 'a', min: 1, max: 9, step: 1 },
              { key: 'b' as const, label: 'b', min: -9, max: 9, step: 1 },
              { key: 'c' as const, label: 'c', min: -9, max: 9, step: 1 },
            ].map(({ key, label, min, max, step }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    width: 80,
                    color: COLORS.dim,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {label + ' = ' + fp[key]}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={fp[key]}
                  onChange={(e) =>
                    setFp((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                  style={{ flex: 1, accentColor: COLORS.primary }}
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

          {/* D badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: COLORS.dim, fontSize: '0.88rem' }}>{'D ='}</span>
            <span
              style={{
                fontWeight: 900,
                fontSize: '1.5rem',
                color: fpNatureColor,
              }}
            >
              {fpD}
            </span>
            <span
              style={{
                padding: '0.2rem 0.7rem',
                borderRadius: 999,
                background:
                  fpD > 0
                    ? '#022c22'
                    : fpD === 0
                    ? '#451a03'
                    : '#450a0a',
                color: fpNatureColor,
                fontWeight: 700,
                fontSize: '0.82rem',
              }}
            >
              {getNatureLabel(fpD)}
            </span>
          </div>

          {/* Root values */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              minHeight: '1.5rem',
            }}
          >
            {fpD > 0 ? (
              <span style={{ color: COLORS.text }}>
                {'x = '}
                <span style={{ color: COLORS.warning, fontWeight: 700 }}>
                  {((-fp.b + fpSqrtD) / (2 * fp.a)).toFixed(3)}
                </span>
                {' or x = '}
                <span style={{ color: COLORS.warning, fontWeight: 700 }}>
                  {((-fp.b - fpSqrtD) / (2 * fp.a)).toFixed(3)}
                </span>
              </span>
            ) : fpD === 0 ? (
              <span style={{ color: COLORS.text }}>
                {'x = '}
                <span style={{ color: COLORS.warning, fontWeight: 700 }}>
                  {(-fp.b / (2 * fp.a)).toFixed(3)}
                </span>
                <span style={{ color: COLORS.dim }}>{' (repeated root)'}</span>
              </span>
            ) : (
              <span style={{ color: COLORS.red, fontWeight: 600 }}>
                {'No real roots (D < 0)'}
              </span>
            )}
          </div>

          {/* SVG parabola */}
          <Parabola a={fp.a} b={fp.b} c={fp.c} color={fpParabolaColor} />
        </div>
      </div>
    </LabShell>
  );
}
