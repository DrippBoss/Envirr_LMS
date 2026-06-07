import { useState } from 'react';
import LabShell, { type Takeaway } from '../LabShell';

const TAKEAWAY: Takeaway = {
  title: 'What you discovered about Fractals & Tower of Hanoi',
  points: [
    'In the Sierpiński triangle, black triangles at stage n = 3ⁿ — a GP with r = 3.',
    'The black area at stage n = (3/4)ⁿ — a GP with r = 3/4 < 1, so the area shrinks to 0.',
    'While the COUNT of triangles grows without limit, their total AREA vanishes — a beautiful paradox!',
    'Fractals are self-similar at every scale. They arise naturally in trees, coastlines, snowflakes.',
    'Tower of Hanoi with n discs requires exactly 2ⁿ − 1 minimum moves — another GP!',
    'The recursive rule for Hanoi is T(n) = 2·T(n−1) + 1, with T(1) = 1.',
  ],
};

const C = {
  primary: '#8b5cf6',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  dim: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  red: '#ef4444',
  bg: '#0f172a',
  tri: '#10b981',
  hole: '#0f172a',
};

interface Props {
  nodeTitle: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
}

// ── Sierpiński triangle drawn recursively via SVG ──────────────────────────

function drawTriangles(
  cx: number, cy: number, size: number, depth: number, maxDepth: number,
  result: { cx: number; cy: number; size: number }[]
) {
  if (depth === maxDepth) {
    result.push({ cx, cy, size });
    return;
  }
  const half = size / 2;
  const h = (Math.sqrt(3) / 2) * size;
  // Three children: top, bottom-left, bottom-right
  drawTriangles(cx, cy - h / 3, half, depth + 1, maxDepth, result);
  drawTriangles(cx - half / 2, cy + h / 6, half, depth + 1, maxDepth, result);
  drawTriangles(cx + half / 2, cy + h / 6, half, depth + 1, maxDepth, result);
}

function triPath(cx: number, cy: number, size: number): string {
  const h = (Math.sqrt(3) / 2) * size;
  const top = [cx, cy - (2 * h) / 3];
  const bl = [cx - size / 2, cy + h / 3];
  const br = [cx + size / 2, cy + h / 3];
  return `M ${top[0]},${top[1]} L ${bl[0]},${bl[1]} L ${br[0]},${br[1]} Z`;
}

function SierpinskiViz({ stage }: { stage: number }) {
  const W = 320;
  const H = 260;
  const cx = W / 2;
  const cy = H * 0.55;
  const size = 230;

  const triangles: { cx: number; cy: number; size: number }[] = [];
  drawTriangles(cx, cy, size, 0, stage, triangles);

  const count = Math.pow(3, stage);
  const area = Math.pow(3 / 4, stage);

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', background: C.bg, borderRadius: 8 }}
      >
        {triangles.map((t, i) => (
          <path key={i} d={triPath(t.cx, t.cy, t.size)} fill={C.tri} stroke={C.bg} strokeWidth={0.5} />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, padding: '0.6rem', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ color: C.dim, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Black triangles</div>
          <div style={{ color: C.tri, fontSize: '1.2rem', fontWeight: 900 }}>3^{stage} = {count}</div>
          <div style={{ color: C.dim, fontSize: '0.7rem' }}>GP: r = 3</div>
        </div>
        <div style={{ flex: 1, padding: '0.6rem', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ color: C.dim, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Black area</div>
          <div style={{ color: C.warning, fontSize: '1.2rem', fontWeight: 900 }}>{(area * 100).toFixed(1)}%</div>
          <div style={{ color: C.dim, fontSize: '0.7rem' }}>GP: r = 3/4</div>
        </div>
      </div>
    </div>
  );
}

// ── Tower of Hanoi ─────────────────────────────────────────────────────────

type PegId = 0 | 1 | 2;
type TowerState = number[][];

function hanoiMinMoves(n: number): number {
  return Math.pow(2, n) - 1;
}

function initTower(n: number): TowerState {
  const discs = Array.from({ length: n }, (_, i) => n - i);
  return [discs, [], []];
}

function TowerViz({ state, n, selected, onPegClick }: {
  state: TowerState;
  n: number;
  selected: PegId | null;
  onPegClick: (peg: PegId) => void;
}) {
  const W = 320;
  const H = 180;
  const pegXs = [80, 160, 240];
  const baseY = H - 20;
  const pegH = 120;
  const discH = 14;
  const maxW = 60;
  const minW = 18;

  const discColor = (size: number) => {
    const hue = Math.round(((size - 1) / (n - 1 || 1)) * 240);
    return `hsl(${hue}, 70%, 55%)`;
  };

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', background: C.bg, borderRadius: 8, cursor: 'pointer' }}
    >
      {/* Base */}
      <rect x={10} y={baseY} width={W - 20} height={6} rx={3} fill="#334155" />

      {pegXs.map((px, pi) => {
        const isSelected = selected === pi;
        const peg = state[pi];
        const label = ['A', 'B', 'C'][pi];

        return (
          <g key={pi} onClick={() => onPegClick(pi as PegId)} style={{ cursor: 'pointer' }}>
            {/* Peg rod */}
            <rect
              x={px - 4} y={baseY - pegH} width={8} height={pegH}
              rx={4}
              fill={isSelected ? C.primary : '#475569'}
              opacity={0.9}
            />
            {/* Selection ring */}
            {isSelected && (
              <circle cx={px} cy={baseY - pegH - 8} r={8} fill="none" stroke={C.primary} strokeWidth={2} />
            )}
            {/* Peg label */}
            <text x={px} y={baseY + 16} textAnchor="middle" fill={C.dim} fontSize={11} fontWeight="600">
              {label}
            </text>

            {/* Discs */}
            {peg.map((size, di) => {
              const discW = minW + ((size - 1) / n) * (maxW - minW);
              const dy = baseY - (di + 1) * discH - 2;
              return (
                <rect
                  key={size}
                  x={px - discW / 2}
                  y={dy}
                  width={discW}
                  height={discH - 2}
                  rx={4}
                  fill={discColor(size)}
                  stroke={C.bg}
                  strokeWidth={1}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function TowerGame({ n }: { n: number }) {
  const [state, setState] = useState<TowerState>(() => initTower(n));
  const [selected, setSelected] = useState<PegId | null>(null);
  const [moves, setMoves] = useState(0);
  const [error, setError] = useState('');
  const [won, setWon] = useState(false);
  const minMoves = hanoiMinMoves(n);

  const handlePegClick = (peg: PegId) => {
    if (won) return;
    setError('');

    if (selected === null) {
      if (state[peg].length === 0) {
        setError('That peg is empty — pick one with discs.');
        return;
      }
      setSelected(peg);
    } else {
      if (selected === peg) {
        setSelected(null);
        return;
      }
      const fromPeg = state[selected];
      const toPeg = state[peg];
      const disc = fromPeg[fromPeg.length - 1];
      if (toPeg.length > 0 && toPeg[toPeg.length - 1] < disc) {
        setError('Invalid! You can't place a larger disc on a smaller one.');
        setSelected(null);
        return;
      }
      // Valid move
      const next: TowerState = state.map((p) => [...p]) as TowerState;
      next[peg].push(next[selected].pop()!);
      setState(next);
      setMoves((m) => m + 1);
      setSelected(null);

      // Check win
      if (next[2].length === n) {
        setWon(true);
      }
    }
  };

  const reset = () => {
    setState(initTower(n));
    setSelected(null);
    setMoves(0);
    setError('');
    setWon(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{ color: C.dim, fontSize: '0.82rem' }}>
            Moves: <strong style={{ color: C.text }}>{moves}</strong>
          </span>
          <span style={{ color: C.dim, fontSize: '0.82rem' }}>
            Minimum: <strong style={{ color: C.warning }}>{minMoves} = 2^{n}−1</strong>
          </span>
        </div>
        <button onClick={reset} style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, fontSize: '0.78rem', cursor: 'pointer' }}>
          Reset
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '0.4rem', padding: '0.3rem 0.6rem', borderRadius: 6, background: '#450a0a', color: C.red, fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      <TowerViz state={state} n={n} selected={selected} onPegClick={handlePegClick} />

      <p style={{ color: C.dim, fontSize: '0.75rem', marginTop: '0.4rem', textAlign: 'center' }}>
        Click a peg to pick up its top disc, then click another peg to place it there.
        Move all discs to peg C.
      </p>

      {won && (
        <div style={{ marginTop: '0.6rem', padding: '0.75rem', borderRadius: 8, background: '#022c22', border: `1px solid ${C.success}`, textAlign: 'center' }}>
          <div style={{ color: C.success, fontWeight: 700, fontSize: '1rem' }}>
            🏆 Solved in {moves} moves!{moves === minMoves ? ' Perfect — minimum moves!' : ` (minimum is ${minMoves})`}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Lab Component ─────────────────────────────────────────────────────

type Tab = 'fractal' | 'hanoi';

export default function GpFractalLab({ nodeTitle, xpReward, onComplete }: Props) {
  const [tab, setTab] = useState<Tab>('fractal');
  const [stage, setStage] = useState(0);
  const [hanoiN, setHanoiN] = useState(3);
  const [hanoiKey, setHanoiKey] = useState(0);

  // GP data for table
  const tableRows = Array.from({ length: 6 }, (_, i) => ({
    stage: i,
    triangles: Math.pow(3, i),
    area: Math.pow(3 / 4, i),
  }));

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      onComplete={onComplete}
      takeaway={TAKEAWAY}
      artifact={{ tab, stage, hanoiN }}
    >
      <div style={{ maxWidth: 580, margin: '0 auto', fontFamily: 'inherit' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', background: C.surface, borderRadius: 10, padding: 4 }}>
          {([['fractal', '🔺 Sierpiński Triangle'], ['hanoi', '🗼 Tower of Hanoi']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '0.55rem 0.5rem', borderRadius: 7, border: 'none',
                background: tab === t ? C.primary : 'transparent',
                color: tab === t ? '#fff' : C.dim,
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── FRACTAL TAB ─────────────────────────────── */}
        {tab === 'fractal' && (
          <div>
            <p style={{ color: C.dim, fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              Drag the stage slider and watch the Sierpiński triangle grow.
              Count the black triangles and track the shrinking area — both form GPs!
            </p>

            {/* Stage slider */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ color: C.dim, fontSize: '0.82rem', fontWeight: 600, flexShrink: 0, width: 100 }}>
                Stage: {stage}
              </span>
              <input
                type="range" min={0} max={5} step={1} value={stage}
                onChange={(e) => setStage(Number(e.target.value))}
                style={{ flex: 1, accentColor: C.primary }}
              />
            </label>

            <SierpinskiViz stage={stage} />

            {/* GP Table */}
            <div style={{ marginTop: '1.25rem' }}>
              <h4 style={{ color: C.text, fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                The Two GPs in the Sierpiński Triangle
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      {['Stage n', 'Black triangles (3ⁿ)', 'Black area ((3/4)ⁿ)'].map((h) => (
                        <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: C.dim, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr key={row.stage} style={{ background: row.stage === stage ? '#1e1b4b' : 'transparent' }}>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: row.stage === stage ? C.primary : C.text, fontWeight: row.stage === stage ? 700 : 400 }}>{row.stage}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: C.tri, fontWeight: 600 }}>{row.triangles}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: C.warning }}>{(row.area * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: C.surface, border: `1px solid ${C.border}` }}>
                <p style={{ color: C.dim, fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
                  <strong style={{ color: C.tri }}>Triangles:</strong> GP with a=1, r=3. As n→∞, count → ∞ &nbsp;|&nbsp;
                  <strong style={{ color: C.warning }}>Area:</strong> GP with a=1, r=3/4. As n→∞, area → 0.
                  <br />The count grows without limit while the area vanishes — a remarkable paradox!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── HANOI TAB ───────────────────────────────── */}
        {tab === 'hanoi' && (
          <div>
            <p style={{ color: C.dim, fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              Move all discs from peg A to peg C. You may only move one disc at a time,
              and a larger disc can never rest on a smaller one.
            </p>

            {/* Disc count selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: C.dim, fontSize: '0.82rem', fontWeight: 600 }}>Discs:</span>
              {[2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => { setHanoiN(d); setHanoiKey((k) => k + 1); }}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: 6,
                    border: `1px solid ${hanoiN === d ? C.primary : C.border}`,
                    background: hanoiN === d ? C.primary : 'transparent',
                    color: hanoiN === d ? '#fff' : C.dim,
                    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              ))}
              <span style={{ color: C.dim, fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                Min moves: <strong style={{ color: C.warning }}>{hanoiMinMoves(hanoiN)} = 2^{hanoiN}−1</strong>
              </span>
            </div>

            <TowerGame key={hanoiKey} n={hanoiN} />

            {/* Pattern table */}
            <div style={{ marginTop: '1.25rem' }}>
              <h4 style={{ color: C.text, fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Minimum Moves — the Hidden GP
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      {['Discs (n)', '2ⁿ − 1', 'Moves'].map((h) => (
                        <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: C.dim, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <tr key={d} style={{ background: d === hanoiN ? '#1e1b4b' : 'transparent' }}>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: d === hanoiN ? C.primary : C.text, fontWeight: d === hanoiN ? 700 : 400 }}>{d}</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: C.dim }}>2^{d}−1</td>
                        <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center', color: C.warning, fontWeight: 600 }}>{hanoiMinMoves(d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: C.surface, border: `1px solid ${C.border}` }}>
                <p style={{ color: C.dim, fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
                  The sequence 1, 3, 7, 15, 31, 63, … of minimum moves is <em>not</em> a GP (differences double, not the terms).
                  But it follows <strong style={{ color: C.text }}>T(n) = 2·T(n−1) + 1</strong>, and the explicit formula is
                  <strong style={{ color: C.warning }}> T(n) = 2ⁿ − 1</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </LabShell>
  );
}
