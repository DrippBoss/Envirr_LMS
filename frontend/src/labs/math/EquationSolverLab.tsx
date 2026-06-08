import { useState, useMemo } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about solving pairs of equations',
  points: [
    'Substitution works best when one equation already has a variable with coefficient 1 \u2014 easy to isolate.',
    'Elimination works best when coefficients of one variable are already equal or easily made equal.',
    'Both methods ALWAYS give the same answer \u2014 the solution is a property of the equations, not the method.',
    'If elimination gives 0=0, the lines are coincident (infinite solutions). If 0=k (k\u22600), lines are parallel (no solution).',
    'Always verify by substituting back into BOTH original equations.',
  ],
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

interface Step {
  label: string;
  text: string;
  blank: string; // the expected answer for the fill-in blank
  hint: string;
}

interface Challenge {
  id: number;
  eq1Label: string;
  eq2Label: string;
  method: string;
  steps: Step[];
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    eq1Label: 'x + y = 5',
    eq2Label: 'x \u2212 y = 1',
    method: 'Elimination (add)',
    steps: [
      {
        label: 'Set up',
        text: 'The y-coefficients are +1 and \u22121. Adding the equations eliminates y.',
        blank: 'add',
        hint: 'Type "add" \u2014 we will add both equations to eliminate y.',
      },
      {
        label: 'Eliminate',
        text: 'Adding: (x+y)+(x\u2212y) = 5+1 \u2192 2x = 6 \u2192 x = ___',
        blank: '3',
        hint: '2x=6 \u2192 x=3.',
      },
      {
        label: 'Back-substitute',
        text: 'x=3. Substitute into x+y=5: 3+y=5 \u2192 y = ___',
        blank: '2',
        hint: '3+y=5 \u2192 y=2.',
      },
      {
        label: 'Verify',
        text: 'Check eq2: x\u2212y = 3\u22122 = ___',
        blank: '1',
        hint: '3\u22122=1. Matches RHS=1. \u2713',
      },
    ],
  },
  {
    id: 2,
    eq1Label: '2x + y = 7',
    eq2Label: 'y = x + 1',
    method: 'Substitution (y given)',
    steps: [
      {
        label: 'Substitute',
        text: 'y=x+1 is already expressed. Substitute into 2x+y=7: 2x+(x+1)=7 \u2192 3x+1=7 \u2192 3x = ___',
        blank: '6',
        hint: '2x+(x+1)=7 \u2192 3x=6.',
      },
      {
        label: 'Solve for x',
        text: '3x=6 \u2192 x = ___',
        blank: '2',
        hint: 'x=6\u00f73=2.',
      },
      {
        label: 'Back-substitute',
        text: 'x=2. Into y=x+1: y = ___',
        blank: '3',
        hint: 'y=2+1=3.',
      },
      {
        label: 'Verify',
        text: 'Check eq1: 2(2)+3 = ___',
        blank: '7',
        hint: '4+3=7. Matches RHS=7. \u2713',
      },
    ],
  },
  {
    id: 3,
    eq1Label: '3x + 2y = 12',
    eq2Label: 'x \u2212 y = 1',
    method: 'Substitution',
    steps: [
      {
        label: 'Express x',
        text: 'From x\u2212y=1, express x: x = ___',
        blank: 'y+1',
        hint: 'x\u2212y=1 \u2192 x=y+1.',
      },
      {
        label: 'Substitute',
        text: 'Substitute x=y+1 into 3x+2y=12: 3(y+1)+2y=12 \u2192 5y+3=12 \u2192 5y = ___',
        blank: '9',
        hint: '3y+3+2y=12 \u2192 5y=9.',
      },
      {
        label: 'Solve for y',
        text: '5y=9 \u2192 y = ___',
        blank: '9/5',
        hint: 'y=9\u00f75=9/5=1.8.',
      },
      {
        label: 'Verify',
        text: 'x=y+1=9/5+1=14/5. Check 3x+2y: 3(14/5)+2(9/5) = 42/5+18/5 = ___',
        blank: '12',
        hint: '60/5=12. Matches RHS=12. \u2713',
      },
    ],
  },
  {
    id: 4,
    eq1Label: '5x \u2212 2y = 4',
    eq2Label: '3x + 2y = 12',
    method: 'Elimination (add)',
    steps: [
      {
        label: 'Set up',
        text: 'y-coefficients are \u22122 and +2. Adding eliminates y.',
        blank: 'add',
        hint: 'Type "add" \u2014 \u22122y+2y=0.',
      },
      {
        label: 'Eliminate',
        text: 'Adding: (5x\u22122y)+(3x+2y)=4+12 \u2192 8x = ___',
        blank: '16',
        hint: '8x=16.',
      },
      {
        label: 'Solve for x',
        text: '8x=16 \u2192 x = ___',
        blank: '2',
        hint: 'x=2.',
      },
      {
        label: 'Back-substitute',
        text: 'x=2 into 3x+2y=12: 6+2y=12 \u2192 2y=6 \u2192 y = ___',
        blank: '3',
        hint: '2y=6 \u2192 y=3.',
      },
    ],
  },
  {
    id: 5,
    eq1Label: '2x + 3y = 13',
    eq2Label: 'x + 2y = 8',
    method: 'Elimination (multiply)',
    steps: [
      {
        label: 'Equalise x-coefficients',
        text: 'Multiply eq2 by 2: 2x+4y=16. Now subtract eq1 from this: (2x+4y)\u2212(2x+3y) = 16\u221213 \u2192 y = ___',
        blank: '3',
        hint: '4y\u22123y=3 and 16\u221213=3, so y=3.',
      },
      {
        label: 'Solve for x',
        text: 'y=3. Substitute into x+2y=8: x+6=8 \u2192 x = ___',
        blank: '2',
        hint: 'x=8\u22126=2.',
      },
      {
        label: 'Verify in eq1',
        text: 'Check eq1: 2(2)+3(3) = 4+9 = ___',
        blank: '13',
        hint: '4+9=13. Matches RHS=13. \u2713',
      },
      {
        label: 'Verify in eq2',
        text: 'Check eq2: 2+2(3) = 2+6 = ___',
        blank: '8',
        hint: '8. Matches RHS=8. \u2713',
      },
    ],
  },
];

const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  primary: '#6366f1',
  green: '#10b981',
  red: '#ef4444',
  text: '#f1f5f9',
  dim: '#94a3b8',
};

// ── Cramer's rule solver ──────────────────────────────────────────────────────
function solveLinear(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number) {
  const det = a1 * b2 - a2 * b1;
  if (det === 0) return null;
  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  return { x, y };
}

function fmtNum(n: number) {
  if (n === Math.round(n)) return String(n);
  return n.toFixed(2);
}

function classify(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number) {
  const det = a1 * b2 - a2 * b1;
  if (det !== 0) return 'intersecting';
  const detX = c1 * b2 - c2 * b1;
  const detY = a1 * c2 - a2 * c1;
  return detX === 0 && detY === 0 ? 'coincident' : 'parallel';
}

// ── Worked solution renderer ──────────────────────────────────────────────────
function SubstitutionSteps({ a1, b1, c1, a2, b2, c2 }: { a1: number; b1: number; c1: number; a2: number; b2: number; c2: number }) {
  const cls = classify(a1, b1, c1, a2, b2, c2);
  if (cls !== 'intersecting') {
    return (
      <div style={{ color: C.red, fontSize: '0.85rem', marginTop: '0.5rem' }}>
        {cls === 'parallel'
          ? 'These lines are parallel \u2014 no solution. When you substitute, you get a contradiction like 0 = k (k \u2260 0).'
          : 'These lines are coincident \u2014 infinitely many solutions. Substitution gives 0 = 0.'}
      </div>
    );
  }
  const sol = solveLinear(a1, b1, c1, a2, b2, c2)!;
  const steps = [
    `From eq1: ${a1}x + ${b1}y = ${c1}`,
    `Express y: y = (${c1} \u2212 ${a1}x) / ${b1}`,
    `Substitute into eq2: ${a2}x + ${b2} \u00d7 ((${c1} \u2212 ${a1}x) / ${b1}) = ${c2}`,
    `Multiply through and collect x terms \u2192 x = ${fmtNum(sol.x)}`,
    `Back-substitute: y = ${fmtNum(sol.y)}`,
    `Solution: x = ${fmtNum(sol.x)}, y = ${fmtNum(sol.y)}`,
  ];
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} style={{ fontSize: '0.82rem', color: i === steps.length - 1 ? C.green : C.dim, marginBottom: '0.3rem' }}>
          {i + 1}. {s}
        </div>
      ))}
    </div>
  );
}

function EliminationSteps({ a1, b1, c1, a2, b2, c2 }: { a1: number; b1: number; c1: number; a2: number; b2: number; c2: number }) {
  const cls = classify(a1, b1, c1, a2, b2, c2);
  if (cls !== 'intersecting') {
    return (
      <div style={{ color: C.red, fontSize: '0.85rem', marginTop: '0.5rem' }}>
        {cls === 'parallel'
          ? 'Parallel lines \u2014 after elimination you get 0 = k (k \u2260 0). No solution.'
          : 'Coincident lines \u2014 after elimination you get 0 = 0. Infinite solutions.'}
      </div>
    );
  }
  const sol = solveLinear(a1, b1, c1, a2, b2, c2)!;
  const lcm = Math.abs(b1 * b2) / gcd(Math.abs(b1), Math.abs(b2));
  const m1 = lcm / Math.abs(b1);
  const m2 = lcm / Math.abs(b2);
  const steps = [
    `Multiply eq1 by ${m1}: ${a1 * m1}x + ${b1 * m1}y = ${c1 * m1}`,
    `Multiply eq2 by ${m2}: ${a2 * m2}x + ${b2 * m2}y = ${c2 * m2}`,
    `Subtract (or add) to eliminate y \u2192 ${a1 * m1 - a2 * m2}x = ${c1 * m1 - c2 * m2}`,
    `Solve: x = ${fmtNum(sol.x)}`,
    `Back-substitute: y = ${fmtNum(sol.y)}`,
    `Solution: x = ${fmtNum(sol.x)}, y = ${fmtNum(sol.y)}`,
  ];
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} style={{ fontSize: '0.82rem', color: i === steps.length - 1 ? C.green : C.dim, marginBottom: '0.3rem' }}>
          {i + 1}. {s}
        </div>
      ))}
    </div>
  );
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EquationSolverLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [cIdx, setCIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [input, setInput] = useState('');
  const [stepStatus, setStepStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);

  // Free-play state
  const [fp, setFp] = useState({ a1: 1, b1: 1, c1: 5, a2: 1, b2: -1, c2: 1 });
  const [method, setMethod] = useState<'substitution' | 'elimination'>('substitution');

  const allDone = completed.length === CHALLENGES.length;
  const ch = CHALLENGES[cIdx];
  const step = ch.steps[stepIdx];
  const isLastStep = stepIdx === ch.steps.length - 1;

  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/×/g, '*');

  const checkStep = () => {
    const val = normalise(input);
    const expected = normalise(step.blank);
    if (val === expected) {
      setStepStatus('correct');
      setShowHint(false);
      if (isLastStep) {
        setCompleted(prev => [...prev, ch.id]);
        setTimeout(() => {
          if (cIdx < CHALLENGES.length - 1) {
            setCIdx(i => i + 1);
            setStepIdx(0);
            setInput('');
            setStepStatus('idle');
          }
        }, 900);
      } else {
        setTimeout(() => {
          setStepIdx(i => i + 1);
          setInput('');
          setStepStatus('idle');
        }, 700);
      }
    } else {
      setStepStatus('wrong');
      setTimeout(() => setStepStatus('idle'), 1200);
    }
  };

  const fpClass = useMemo(() => classify(fp.a1, fp.b1, fp.c1, fp.a2, fp.b2, fp.c2), [fp]);

  return (
    <LabShell
      title={nodeTitle} xpReward={xpReward} onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ challengesCompleted: completed, fp }}
    >
      <div style={{ maxWidth: 580, margin: '0 auto', paddingBottom: '1rem' }}>

        {/* ── Progress ── */}
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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ background: C.primary, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{ fontSize: '0.75rem', color: C.dim }}>{ch.method}</span>
            </div>

            {/* Equations */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[ch.eq1Label, ch.eq2Label].map((label, i) => (
                <div key={i} style={{
                  flex: 1, background: C.bg, borderRadius: 10, padding: '0.6rem 0.9rem',
                  border: `2px solid ${i === 0 ? C.primary : C.green}`,
                  textAlign: 'center', fontSize: '0.95rem', fontWeight: 700,
                  color: i === 0 ? C.primary : C.green,
                }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Step cards */}
            <div style={{ marginBottom: '1.25rem' }}>
              {ch.steps.map((s, i) => {
                const isActive = i === stepIdx;
                const isDone = i < stepIdx || (completed.includes(ch.id));
                return (
                  <div key={i} style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '0.5rem',
                    borderRadius: 10,
                    border: `1px solid ${isActive ? C.primary : isDone ? C.green : C.border}`,
                    background: isActive ? C.bg : isDone ? '#052e16' : '#0a0f1e',
                    opacity: isActive || isDone ? 1 : 0.4,
                    transition: 'all 0.25s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isActive ? '0.5rem' : 0 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 800,
                        background: isDone ? C.green : isActive ? C.primary : C.border,
                        color: '#fff',
                      }}>
                        {isDone ? '\u2713' : i + 1}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isActive ? C.text : isDone ? C.green : C.dim }}>
                        {s.label}
                      </span>
                    </div>
                    {(isActive || isDone) && (
                      <div style={{ fontSize: '0.88rem', color: C.dim, marginTop: '0.25rem', lineHeight: 1.55 }}>
                        {s.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input */}
            {!completed.includes(ch.id) && (
              <>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    value={input}
                    onChange={e => { setInput(e.target.value); setStepStatus('idle'); }}
                    onKeyDown={e => e.key === 'Enter' && checkStep()}
                    placeholder={`Answer for step ${stepIdx + 1}...`}
                    disabled={stepStatus === 'correct'}
                    style={{
                      flex: 1,
                      background: stepStatus === 'correct' ? '#052e16' : stepStatus === 'wrong' ? '#2d0000' : C.bg,
                      border: `2px solid ${stepStatus === 'correct' ? C.green : stepStatus === 'wrong' ? C.red : C.border}`,
                      borderRadius: 10, color: C.text, padding: '0.65rem 0.9rem',
                      fontSize: '1rem', outline: 'none', transition: 'border 0.2s, background 0.2s',
                    }}
                  />
                  <button
                    onClick={checkStep}
                    disabled={!input || stepStatus === 'correct'}
                    style={{
                      background: C.primary, color: '#fff', border: 'none',
                      borderRadius: 10, padding: '0.65rem 1.25rem',
                      fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                      opacity: !input || stepStatus === 'correct' ? 0.4 : 1,
                    }}
                  >
                    {stepStatus === 'correct' ? '\u2713' : 'Check'}
                  </button>
                </div>

                {stepStatus === 'wrong' && (
                  <p style={{ color: C.red, fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                    Not quite \u2014 try again!
                  </p>
                )}

                <button
                  onClick={() => setShowHint(h => !h)}
                  style={{ background: 'none', border: 'none', color: C.primary, fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  {showHint ? 'Hide hint' : 'Show hint'}
                </button>
                {showHint && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: C.dim, fontStyle: 'italic' }}>
                    {'💡 '}{step.hint}
                  </p>
                )}
              </>
            )}

            {completed.includes(ch.id) && (
              <div style={{ textAlign: 'center', color: C.green, fontWeight: 700, fontSize: '0.95rem', padding: '0.5rem' }}>
                {'✓ Problem solved! '}{cIdx < CHALLENGES.length - 1 ? 'Moving to next...' : 'All done!'}
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
            {'Free Explorer \u2014 Enter any pair and see the worked solution'}
          </p>

          {/* Equation inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {(['a1', 'b1', 'c1'] as const).map(k => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700 }}>
                  {k === 'a1' ? 'a\u2081 (x-coeff)' : k === 'b1' ? 'b\u2081 (y-coeff)' : 'c\u2081 (constant)'}
                </span>
                <input
                  type="number"
                  value={fp[k]}
                  onChange={e => setFp(prev => ({ ...prev, [k]: parseInt(e.target.value) || 0 }))}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '0.45rem 0.6rem', fontSize: '0.95rem' }}
                />
              </label>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['a2', 'b2', 'c2'] as const).map(k => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>
                  {k === 'a2' ? 'a\u2082 (x-coeff)' : k === 'b2' ? 'b\u2082 (y-coeff)' : 'c\u2082 (constant)'}
                </span>
                <input
                  type="number"
                  value={fp[k]}
                  onChange={e => setFp(prev => ({ ...prev, [k]: parseInt(e.target.value) || 0 }))}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '0.45rem 0.6rem', fontSize: '0.95rem' }}
                />
              </label>
            ))}
          </div>

          {/* Equation display */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { a: fp.a1, b: fp.b1, c: fp.c1, color: '#a5b4fc' },
              { a: fp.a2, b: fp.b2, c: fp.c2, color: '#6ee7b7' },
            ].map(({ a, b, c, color }, i) => {
              const bSign = b >= 0 ? '+' : '\u2212';
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color }}>
                  {`${a}x ${bSign} ${Math.abs(b)}y = ${c}`}
                </div>
              );
            })}
          </div>

          {/* Method toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['substitution', 'elimination'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1, padding: '0.55rem', borderRadius: 8,
                  border: `2px solid ${method === m ? C.primary : C.border}`,
                  background: method === m ? '#312e81' : C.surface,
                  color: C.text, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Worked solution */}
          <div style={{ background: C.surface, borderRadius: 12, padding: '1rem', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: C.primary, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.06em' }}>
              {method === 'substitution' ? 'Substitution Method' : 'Elimination Method'}
              {fpClass !== 'intersecting' && (
                <span style={{ marginLeft: 8, color: fpClass === 'parallel' ? C.red : '#f59e0b', textTransform: 'none', fontSize: '0.78rem' }}>
                  {fpClass === 'parallel' ? '\u2014 no solution (parallel)' : '\u2014 infinite solutions (coincident)'}
                </span>
              )}
            </div>
            {method === 'substitution'
              ? <SubstitutionSteps a1={fp.a1} b1={fp.b1} c1={fp.c1} a2={fp.a2} b2={fp.b2} c2={fp.c2} />
              : <EliminationSteps a1={fp.a1} b1={fp.b1} c1={fp.c1} a2={fp.a2} b2={fp.b2} c2={fp.c2} />
            }
          </div>
        </div>

      </div>
    </LabShell>
  );
}
