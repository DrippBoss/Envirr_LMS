import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

// ── Challenges ─────────────────────────────────────────────────────────────────
type ChallengeKind = 'classify' | 'convert';

interface AlgebraStep {
  text: string;
  highlight?: boolean;
}

interface Challenge {
  id: number;
  kind: ChallengeKind;
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  hint: string;
  // For classify: prime factorisation display
  numerator?: number;
  denominator?: number;
  factorisationLabel?: string;    // e.g. "20 = 2² × 5"
  terminates?: boolean;
  // For convert: algebra steps shown one at a time
  algebraSteps?: AlgebraStep[];
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    kind: 'classify',
    question: 'Look at the prime factorisation of the denominator. Does 7/20 terminate?',
    options: ['Yes, it terminates', 'No, it repeats'],
    correct: 'Yes, it terminates',
    explanation: 'Denominator 20 = 2² × 5 — only primes 2 and 5, so 7/20 = 0.35 (terminates).',
    hint: 'A fraction terminates if and only if its denominator (in lowest terms) has no prime factors other than 2 and 5.',
    numerator: 7,
    denominator: 20,
    factorisationLabel: '20 = 2² × 5',
    terminates: true,
  },
  {
    id: 2,
    kind: 'classify',
    question: 'Does 4/15 terminate or repeat?',
    options: ['Terminates', 'Repeats'],
    correct: 'Repeats',
    explanation: 'Denominator 15 = 3 × 5. The factor 3 (not 2 or 5) makes it repeat: 4/15 = 0.2666… = 0.2̄6̄',
    hint: 'Check: does 15 have any prime factor other than 2 or 5?',
    numerator: 4,
    denominator: 15,
    factorisationLabel: '15 = 3 × 5',
    terminates: false,
  },
  {
    id: 3,
    kind: 'convert',
    question: 'Convert 0.̄6 to p/q. Let x = 0.666… What do you multiply by?',
    options: ['10', '100', '1000', '7'],
    correct: '10',
    explanation: 'One digit repeats → multiply by 10¹. Then 10x = 6.6̄, subtract x = 0.6̄ to get 9x = 6, so x = 2/3.',
    hint: 'The multiplier is 10^(number of repeating digits). Here 1 digit repeats.',
    algebraSteps: [
      { text: 'Let x = 0.666…' },
      { text: 'Multiply both sides by 10:' },
      { text: '10x = 6.666…', highlight: true },
      { text: 'Subtract the first equation:' },
      { text: '10x − x = 6.666… − 0.666…' },
      { text: '9x = 6', highlight: true },
      { text: 'x = 6/9 = 2/3', highlight: true },
    ],
  },
  {
    id: 4,
    kind: 'convert',
    question: 'Convert 0.̄4̄5 to p/q. Two digits repeat — multiply by 100. 100x = 45.45̄, so 99x = 45, x = ?',
    options: ['45/99 = 5/11', '45/100', '45/90', '5/9'],
    correct: '45/99 = 5/11',
    explanation: 'Two repeating digits → multiply by 100. 99x = 45 → x = 45/99. Simplify: GCD(45,99) = 9, so x = 5/11.',
    hint: 'Two repeating digits → 10² = 100. Subtract to cancel the repeating part.',
    algebraSteps: [
      { text: 'Let x = 0.454545…' },
      { text: 'Multiply both sides by 100:' },
      { text: '100x = 45.454545…', highlight: true },
      { text: 'Subtract the first equation:' },
      { text: '100x − x = 45.454545… − 0.454545…' },
      { text: '99x = 45', highlight: true },
      { text: 'x = 45/99 = 5/11', highlight: true },
    ],
  },
  {
    id: 5,
    kind: 'convert',
    question: 'Challenge: Convert 0.1̄6 to p/q. (One non-repeating digit "1", then "6" repeats)',
    options: ['1/6', '16/90', '1/5', '16/100'],
    correct: '1/6',
    explanation: '10x = 1.6̄, 100x = 16.6̄. Subtract: 90x = 15, so x = 15/90 = 1/6.',
    hint: 'Shift past the non-repeating digit first (×10), then shift past the repeating block (×100). Subtract the two equations.',
    algebraSteps: [
      { text: 'Let x = 0.1666…' },
      { text: 'Multiply by 10 to shift past non-repeating "1":' },
      { text: '10x = 1.666…', highlight: true },
      { text: 'Multiply by 100 to shift past "1" and "6":' },
      { text: '100x = 16.666…', highlight: true },
      { text: 'Subtract: 100x − 10x = 16.666… − 1.666…' },
      { text: '90x = 15', highlight: true },
      { text: 'x = 15/90 = 1/6', highlight: true },
    ],
  },
];

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about decimal expansions',
  points: [
    'A rational number terminates ↔ its denominator (in lowest terms) has only 2s and 5s as prime factors.',
    'To convert a repeating decimal to p/q: multiply by 10ⁿ (n = repeating digit count), subtract, solve.',
    'For a mixed repeating decimal (some digits don\'t repeat): first shift past the non-repeating part, then eliminate the repeating part.',
    'The repeating block of 1/7 is 142857 — a cyclic number that permutes when multiplied by 1 through 6.',
    'Rational numbers are exactly those with terminating or repeating decimal expansions.',
  ],
};

// ── SVG: prime factorisation tree ──────────────────────────────────────────────
function FactorisationPanel({
  denominator,
  factorisationLabel,
  terminates,
}: {
  denominator: number;
  factorisationLabel: string;
  terminates: boolean;
}) {
  const accent = terminates ? '#10b981' : '#f59e0b';
  const bg = terminates ? '#052e16' : '#1c1a00';
  const border = terminates ? '#10b981' : '#f59e0b';
  const label = terminates ? 'TERMINATES' : 'REPEATS';

  // Build a simple factor tree for small denominators
  // We'll display it as SVG boxes connected by lines
  const svgW = 320;
  const svgH = 130;

  // Simple factorisation display — boxes at top (root) branching down
  const rootLabel = String(denominator);
  // Parse factors from factorisationLabel string for display
  // We display root → factor pairs visually

  // Hardcoded trees for our two denominators (20 and 15)
  type Node = { label: string; x: number; y: number; prime: boolean };
  const nodes20: Node[] = [
    { label: '20', x: 160, y: 18, prime: false },
    { label: '4', x: 90, y: 58, prime: false },
    { label: '5', x: 230, y: 58, prime: true },
    { label: '2', x: 55, y: 98, prime: true },
    { label: '2', x: 125, y: 98, prime: true },
  ];
  const edges20 = [[0, 1], [0, 2], [1, 3], [1, 4]];

  const nodes15: Node[] = [
    { label: '15', x: 160, y: 18, prime: false },
    { label: '3', x: 100, y: 70, prime: true },
    { label: '5', x: 220, y: 70, prime: true },
  ];
  const edges15 = [[0, 1], [0, 2]];

  const nodes = denominator === 20 ? nodes20 : nodes15;
  const edges = denominator === 20 ? edges20 : edges15;

  // Color each prime: 2 and 5 are green (ok), others amber (causes repeat)
  function primeColor(label: string) {
    if (label === '2' || label === '5') return '#10b981';
    return '#f59e0b';
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Factorisation tree SVG */}
      <div style={{ background: '#0f172a', borderRadius: 12, padding: '0.75rem', border: '1px solid #1e293b', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Prime factorisation tree — {rootLabel}
        </p>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
          {edges.map(([from, to], i) => (
            <line key={i}
              x1={nodes[from].x} y1={nodes[from].y + 14}
              x2={nodes[to].x} y2={nodes[to].y - 14}
              stroke="#334155" strokeWidth={1.5} />
          ))}
          {nodes.map((node, i) => (
            <g key={i}>
              <rect
                x={node.x - 18} y={node.y - 14} width={36} height={28} rx={6}
                fill={node.prime ? (primeColor(node.label) === '#10b981' ? '#052e16' : '#1c1500') : '#1e293b'}
                stroke={node.prime ? primeColor(node.label) : '#334155'}
                strokeWidth={node.prime ? 2 : 1}
              />
              <text x={node.x} y={node.y + 5}
                fill={node.prime ? primeColor(node.label) : '#94a3b8'}
                fontSize={13} textAnchor="middle" fontWeight="800">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Factorisation label + verdict */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <code style={{ fontSize: '0.9rem', color: '#e2e8f0', background: '#1e293b', padding: '4px 12px', borderRadius: 8 }}>
          {factorisationLabel}
        </code>
        <span style={{
          fontSize: '0.75rem', fontWeight: 800, padding: '3px 12px', borderRadius: 99,
          background: bg, color: accent, border: `1.5px solid ${border}`,
          letterSpacing: '0.08em',
        }}>
          {label}
        </span>
      </div>
      {!terminates && (
        <p style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.4rem' }}>
          ⚠ Factor 3 (amber box) is neither 2 nor 5 — this forces a repeating block.
        </p>
      )}
      {terminates && (
        <p style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.4rem' }}>
          ✓ All prime factors are 2 or 5 (green boxes) — the decimal terminates.
        </p>
      )}
    </div>
  );
}

// ── SVG: algebra steps ─────────────────────────────────────────────────────────
function AlgebraPanel({ steps }: { steps: AlgebraStep[] }) {
  const [revealed, setRevealed] = useState(1);

  const canRevealMore = revealed < steps.length;

  return (
    <div style={{ background: '#0f172a', borderRadius: 12, padding: '1rem', border: '1px solid #1e293b', marginBottom: '0.75rem' }}>
      <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Algebra steps — click to reveal
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {steps.slice(0, revealed).map((step, i) => (
          <div key={i} style={{
            padding: '0.45rem 0.75rem',
            background: step.highlight ? '#1e1b4b' : 'transparent',
            border: step.highlight ? '1px solid #6366f1' : '1px solid transparent',
            borderRadius: 8,
            transition: 'all 0.2s',
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              color: step.highlight ? '#a5b4fc' : '#94a3b8',
              fontWeight: step.highlight ? 700 : 400,
            }}>
              {step.text}
            </span>
          </div>
        ))}
      </div>
      {canRevealMore && (
        <button onClick={() => setRevealed(r => r + 1)}
          style={{
            marginTop: '0.75rem', padding: '0.4rem 1rem',
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 8, color: '#6366f1', fontSize: '0.8rem',
            fontWeight: 700, cursor: 'pointer',
          }}>
          Reveal next step →
        </button>
      )}
      {!canRevealMore && (
        <p style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.5rem', fontWeight: 700 }}>
          ✓ All steps revealed.
        </p>
      )}
    </div>
  );
}

// ── Long division simulator ────────────────────────────────────────────────────
interface DecimalResult {
  intPart: number;
  nonRepeating: string;
  repeatingBlock: string;
}

function simulateLongDivision(num: number, den: number): DecimalResult {
  if (den === 0) return { intPart: 0, nonRepeating: '', repeatingBlock: '' };

  const intPart = Math.floor(Math.abs(num) / Math.abs(den));
  let remainder = Math.abs(num) % Math.abs(den);

  const digits: string[] = [];
  const remaindersSeen = new Map<number, number>(); // remainder → digit index

  while (remainder !== 0 && digits.length < 50) {
    if (remaindersSeen.has(remainder)) {
      // Found the repeating cycle
      const cycleStart = remaindersSeen.get(remainder)!;
      return {
        intPart,
        nonRepeating: digits.slice(0, cycleStart).join(''),
        repeatingBlock: digits.slice(cycleStart).join(''),
      };
    }
    remaindersSeen.set(remainder, digits.length);
    remainder *= 10;
    digits.push(String(Math.floor(remainder / den)));
    remainder = remainder % den;
  }

  return { intPart, nonRepeating: digits.join(''), repeatingBlock: '' };
}

function primeFactors(n: number): number[] {
  const factors: number[] = [];
  for (let p = 2; p * p <= n; p++) {
    while (n % p === 0) { factors.push(p); n = Math.floor(n / p); }
  }
  if (n > 1) factors.push(n);
  return factors;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ── Free play: fraction classifier ────────────────────────────────────────────
function FractionClassifier() {
  const [input, setInput] = useState('7/12');
  const [result, setResult] = useState<null | {
    num: number;
    den: number;
    reducedNum: number;
    reducedDen: number;
    factors: number[];
    terminates: boolean;
    reason: string;
    decimal: DecimalResult;
    factorisationStr: string;
  }>(null);
  const [error, setError] = useState('');

  function classify() {
    setError('');
    setResult(null);
    const parts = input.trim().split('/');
    if (parts.length !== 2) { setError('Please enter a fraction like 7/12'); return; }
    const num = parseInt(parts[0].trim(), 10);
    const den = parseInt(parts[1].trim(), 10);
    if (isNaN(num) || isNaN(den) || den === 0) { setError('Invalid fraction. Denominator must be non-zero.'); return; }

    const g = gcd(Math.abs(num), Math.abs(den));
    const reducedNum = num / g;
    const reducedDen = den / g;

    const factors = primeFactors(Math.abs(reducedDen));
    const terminates = factors.every(f => f === 2 || f === 5);

    const uniqueFactors = Array.from(new Set(factors));
    const factorisationStr = uniqueFactors.length === 0
      ? `${reducedDen} = 1`
      : `${reducedDen} = ` + (() => {
        const counts = new Map<number, number>();
        factors.forEach(f => counts.set(f, (counts.get(f) ?? 0) + 1));
        return Array.from(counts.entries())
          .map(([f, exp]) => exp === 1 ? `${f}` : `${f}${['', '²', '³', '⁴', '⁵', '⁶'][exp] ?? `^${exp}`}`)
          .join(' × ');
      })();

    const badFactors = factors.filter(f => f !== 2 && f !== 5);
    const reason = terminates
      ? `All prime factors of ${reducedDen} are 2 or 5.`
      : `Factor${badFactors.length > 1 ? 's' : ''} ${[...new Set(badFactors)].join(', ')} cause${badFactors.length === 1 ? 's' : ''} the decimal to repeat.`;

    const decimal = simulateLongDivision(Math.abs(reducedNum), Math.abs(reducedDen));

    setResult({ num, den, reducedNum, reducedDen, factors, terminates, reason, decimal, factorisationStr });
  }

  return (
    <div>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'center' }}>
        Enter any fraction to classify its decimal expansion.
      </p>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && classify()}
          placeholder="e.g. 7/12"
          style={{
            flex: 1, padding: '0.5rem 0.75rem',
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 8, color: '#f1f5f9', fontSize: '0.9rem',
            outline: 'none', fontFamily: 'monospace',
          }}
        />
        <button onClick={classify} style={{
          padding: '0.5rem 1.25rem',
          background: '#6366f1', border: 'none', borderRadius: 8,
          color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
        }}>
          Classify
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{error}</p>
      )}

      {result && (() => {
        const { reducedNum, reducedDen, terminates, reason, decimal, factorisationStr, num, den } = result;
        const accent = terminates ? '#10b981' : '#f59e0b';
        const bg = terminates ? '#052e16' : '#1c1500';
        const border = terminates ? '#10b981' : '#f59e0b';

        const isNeg = (num < 0) !== (den < 0);
        const sign = isNeg ? '−' : '';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

            {/* Reduced form */}
            {(Math.abs(num) !== Math.abs(reducedNum) || Math.abs(den) !== Math.abs(reducedDen)) && (
              <div style={{ background: '#1e293b', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                Reduced form: <strong style={{ color: '#e2e8f0' }}>{sign}{reducedNum}/{reducedDen}</strong>
              </div>
            )}

            {/* Factorisation */}
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '0.6rem 0.75rem', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                Denominator factorisation
              </span>
              <code style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{factorisationStr}</code>
            </div>

            {/* Verdict */}
            <div style={{ background: bg, borderRadius: 8, padding: '0.6rem 0.75rem', border: `1.5px solid ${border}` }}>
              <span style={{ fontWeight: 800, color: accent, fontSize: '0.9rem' }}>
                {terminates ? '✓ TERMINATES' : '↻ REPEATS'}
              </span>
              <p style={{ fontSize: '0.8rem', color: accent, margin: '0.25rem 0 0', opacity: 0.85 }}>{reason}</p>
            </div>

            {/* Decimal expansion */}
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '0.75rem', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                Decimal expansion (first 20 places)
              </span>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span style={{ color: '#e2e8f0' }}>
                  {sign}{decimal.intPart}.{decimal.nonRepeating.slice(0, 20)}
                </span>
                {decimal.repeatingBlock && (
                  <>
                    <span style={{ color: '#f59e0b', fontWeight: 800 }}>
                      {(decimal.repeatingBlock.repeat(Math.ceil(20 / decimal.repeatingBlock.length))).slice(0, Math.max(0, 20 - decimal.nonRepeating.length))}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.4rem' }}>
                      (block: <span style={{ color: '#f59e0b' }}>"{decimal.repeatingBlock}"</span> repeats)
                    </span>
                  </>
                )}
                {!decimal.repeatingBlock && (
                  <span style={{ color: '#10b981', marginLeft: 2 }}>
                    {decimal.nonRepeating.length < 20 ? '' : '…'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main Lab ───────────────────────────────────────────────────────────────────
export default function DecimalExpansionLab({ nodeTitle, xpReward, onComplete }: Props) {
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: '#6366f1', color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Challenge {cIdx + 1}
              </span>
              <span style={{
                background: current.kind === 'classify' ? '#1e3a5f' : '#1e1b4b',
                color: current.kind === 'classify' ? '#60a5fa' : '#a5b4fc',
                fontSize: '0.68rem', fontWeight: 700,
                padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {current.kind === 'classify' ? 'Classify' : 'Convert'}
              </span>
            </div>

            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>
              {current.question}
            </p>

            {/* Visual panel */}
            {current.kind === 'classify' && current.denominator !== undefined && current.factorisationLabel && current.terminates !== undefined && (
              <FactorisationPanel
                denominator={current.denominator}
                factorisationLabel={current.factorisationLabel}
                terminates={current.terminates}
              />
            )}
            {current.kind === 'convert' && current.algebraSteps && (
              <AlgebraPanel steps={current.algebraSteps} key={current.id} />
            )}

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
                    textAlign: 'center',
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
                Not quite — study the working above carefully and try again.
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
              🎯 All challenges done! Try the classifier below.
            </p>
          </div>
        )}

        {/* Free play */}
        <div style={{ background: '#0f172a', borderRadius: 16, padding: '1.25rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Free Play — Fraction Classifier
          </p>
          <FractionClassifier />
        </div>
      </div>
    </LabShell>
  );
}
