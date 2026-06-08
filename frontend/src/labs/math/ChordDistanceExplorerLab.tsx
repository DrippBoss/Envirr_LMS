import React, { useState, useCallback, useRef } from 'react';
import LabShell from '../LabShell';
import type { LabProps } from '../LabDispatcher';

const CX = 200;
const CY = 185;
const R = 130;
const W = 420;
const H = 370;

type DragTarget = 'A' | 'B' | null;

interface Observation {
  chordLen: number;
  distFromCentre: number;
}

function toPoint(angle: number) {
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
}

function chordLen(a: number, b: number) {
  const p1 = toPoint(a);
  const p2 = toPoint(b);
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function distFromCentre(a: number, b: number) {
  // Distance from centre to chord = R * |cos(Δ/2)|
  const delta = a - b;
  return R * Math.abs(Math.cos(delta / 2));
}

function midpoint(a: number, b: number) {
  const p1 = toPoint(a);
  const p2 = toPoint(b);
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

const TAKEAWAY = {
  title: 'Chord–Distance Takeaway',
  points: [
    'The perpendicular from the centre to a chord always bisects the chord.',
    'Equal chords are equidistant from the centre.',
    'Chord length = 2√(r² − d²), where d is the perpendicular distance.',
    'Longer chord → smaller distance from centre (closer to centre).',
    'The diameter is the longest chord — it passes through the centre (d = 0).',
  ],
};

export default function ChordDistanceExplorerLab({ nodeTitle, xpReward, onComplete }: LabProps) {
  const [alpha, setAlpha] = useState(-0.8);          // angle for endpoint A
  const [beta, setBeta] = useState(Math.PI + 0.4);  // angle for endpoint B
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const cLen = Math.round(chordLen(alpha, beta));
  const dCentre = Math.round(distFromCentre(alpha, beta));

  const getAngleFromEvent = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const my = ((e.clientY - rect.top) / rect.height) * H;
    return Math.atan2(my - CY, mx - CX);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGElement>, target: DragTarget) => {
    e.stopPropagation();
    setDragging(target);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const angle = getAngleFromEvent(e);
    if (dragging === 'A') setAlpha(angle);
    else setBeta(angle);
  }, [dragging, getAngleFromEvent]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const record = () => {
    setObservations(prev => [...prev.slice(-4), { chordLen: cLen, distFromCentre: dCentre }]);
  };

  const pA = toPoint(alpha);
  const pB = toPoint(beta);
  const mid = midpoint(alpha, beta);

  // Tasks
  const task1 = observations.some(o => o.chordLen > 220);       // long chord (≈ diameter)
  const task2 = observations.some(o => o.distFromCentre < 25);  // chord near centre
  const task3 = observations.some(o => o.distFromCentre > 90);  // chord near edge
  const allDone = task1 && task2 && task3;

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ observations, tasksCompleted: { task1, task2, task3 } }}
    >
      <div style={{ display: 'flex', gap: '1.25rem', padding: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* SVG Canvas */}
        <div style={{ flex: '1 1 300px' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 0.5rem' }}>
            Drag the blue points (A, B) along the circle. Then click Record.
          </p>
          <svg
            ref={svgRef}
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{ background: '#0f172a', borderRadius: 10, border: '1px solid #1e293b', cursor: dragging ? 'grabbing' : 'default' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Circle */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#334155" strokeWidth={2} />

            {/* Radius labels */}
            <line x1={CX} y1={CY} x2={CX + R} y2={CY} stroke="#475569" strokeWidth={1} strokeDasharray="3 2" />
            <text x={CX + R / 2 - 4} y={CY - 6} fill="#475569" fontSize={11}>r={R}</text>

            {/* Perpendicular from centre to chord */}
            <line x1={CX} y1={CY} x2={mid.x} y2={mid.y}
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />

            {/* Right angle marker at midpoint */}
            {(() => {
              const dx = mid.x - CX;
              const dy = mid.y - CY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const ux = dx / len * 8;
              const uy = dy / len * 8;
              const vx = -uy;
              const vy = ux;
              return (
                <path
                  d={`M ${mid.x - ux} ${mid.y - uy} L ${mid.x - ux + vx} ${mid.y - uy + vy} L ${mid.x + vx} ${mid.y + vy}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                />
              );
            })()}

            {/* Chord */}
            <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y}
              stroke="#6366f1" strokeWidth={3} />

            {/* Midpoint of chord */}
            <circle cx={mid.x} cy={mid.y} r={4} fill="#f59e0b" />
            <text x={mid.x + 6} y={mid.y - 5} fill="#f59e0b" fontSize={11}>M</text>

            {/* Centre */}
            <circle cx={CX} cy={CY} r={5} fill="#e2e8f0" />
            <text x={CX + 7} y={CY - 5} fill="#e2e8f0" fontSize={12} fontWeight="bold">O</text>

            {/* Endpoint A */}
            <circle cx={pA.x} cy={pA.y} r={10} fill="#38bdf8" opacity={0.2}
              style={{ cursor: 'grab' }} onMouseDown={e => handleMouseDown(e, 'A')} />
            <circle cx={pA.x} cy={pA.y} r={6} fill="#38bdf8"
              style={{ cursor: 'grab' }} onMouseDown={e => handleMouseDown(e, 'A')} />
            <text x={pA.x + (pA.x > CX ? 9 : -18)} y={pA.y + 4} fill="#38bdf8" fontSize={13} fontWeight="bold">A</text>

            {/* Endpoint B */}
            <circle cx={pB.x} cy={pB.y} r={10} fill="#38bdf8" opacity={0.2}
              style={{ cursor: 'grab' }} onMouseDown={e => handleMouseDown(e, 'B')} />
            <circle cx={pB.x} cy={pB.y} r={6} fill="#38bdf8"
              style={{ cursor: 'grab' }} onMouseDown={e => handleMouseDown(e, 'B')} />
            <text x={pB.x + (pB.x > CX ? 9 : -18)} y={pB.y + 4} fill="#38bdf8" fontSize={13} fontWeight="bold">B</text>

            {/* Live measurements */}
            <rect x={8} y={8} width={180} height={54} rx={6} fill="#1e293b" opacity={0.9} />
            <text x={16} y={26} fill="#94a3b8" fontSize={12}>Chord AB = <tspan fill="#6366f1" fontWeight="bold">{cLen} px</tspan></text>
            <text x={16} y={44} fill="#94a3b8" fontSize={12}>Dist OM = <tspan fill="#f59e0b" fontWeight="bold">{dCentre} px</tspan></text>
            <text x={16} y={56} fill="#475569" fontSize={10}>Formula check: 2√(r²−d²) = {Math.round(2 * Math.sqrt(Math.max(0, R * R - dCentre * dCentre)))}</text>
          </svg>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={record}
              style={{
                padding: '0.45rem 1.2rem',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              📊 Record Observation
            </button>
            <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
              {observations.length} / 5 max recorded
            </span>
          </div>
        </div>

        {/* Right panel: missions + observations table */}
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Missions */}
          <h3 style={{ color: '#e2e8f0', fontSize: '0.95rem', margin: 0 }}>
            Missions ({[task1, task2, task3].filter(Boolean).length}/3)
          </h3>
          {[
            { done: task1, label: 'Long chord', sub: 'Record a chord with length > 220 px (near diameter)' },
            { done: task2, label: 'Close to centre', sub: 'Record a chord with distance < 25 px from centre' },
            { done: task3, label: 'Far from centre', sub: 'Record a chord with distance > 90 px from centre' },
          ].map((m, i) => (
            <div key={i} style={{
              padding: '0.65rem',
              background: m.done ? '#0f2b1f' : '#1e293b',
              borderRadius: 8,
              border: `1px solid ${m.done ? '#22c55e' : '#334155'}`,
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>{m.done ? '✅' : '⬜'}</span>
                <span style={{ color: m.done ? '#22c55e' : '#e2e8f0', fontSize: '0.82rem', fontWeight: 600 }}>
                  {m.label}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.73rem', margin: '0.2rem 0 0 1.5rem' }}>{m.sub}</p>
            </div>
          ))}

          {/* Observation table */}
          {observations.length > 0 && (
            <div style={{ marginTop: '0.25rem' }}>
              <h4 style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 0.4rem' }}>Recorded Observations</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ color: '#6366f1', padding: '3px 6px', textAlign: 'left', borderBottom: '1px solid #334155' }}>Chord</th>
                    <th style={{ color: '#f59e0b', padding: '3px 6px', textAlign: 'left', borderBottom: '1px solid #334155' }}>Dist</th>
                  </tr>
                </thead>
                <tbody>
                  {observations.map((o, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ color: '#e2e8f0', padding: '3px 6px' }}>{o.chordLen} px</td>
                      <td style={{ color: '#e2e8f0', padding: '3px 6px' }}>{o.distFromCentre} px</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                Notice: longer chord → smaller distance!
              </p>
            </div>
          )}

          <div style={{ padding: '0.6rem', background: '#1e293b', borderRadius: 8, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
            <strong style={{ color: '#94a3b8' }}>Key Formula:</strong><br />
            Chord = 2√(r² − d²)<br />
            where d = OM (perpendicular distance)
          </div>
        </div>
      </div>
    </LabShell>
  );
}
