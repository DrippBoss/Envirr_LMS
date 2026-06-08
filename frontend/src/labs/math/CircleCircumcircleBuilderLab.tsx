import React, { useState, useCallback } from 'react';
import LabShell from '../LabShell';
import type { LabProps } from '../LabDispatcher';

interface Point { x: number; y: number; }

const W = 540;
const H = 400;

function dist(a: Point, b: Point) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function circumcircle(p1: Point, p2: Point, p3: Point): { cx: number; cy: number; r: number } | null {
  const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  if (Math.abs(D) < 1e-4) return null;
  const ux =
    ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) +
      (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) +
      (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) /
    D;
  const uy =
    ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) +
      (p2.x * p2.x + p2.y * p2.y) * (p1.x - p3.x) +
      (p3.x * p3.x + p3.y * p3.y) * (p2.x - p1.x)) /
    D;
  const r = dist(p1, { x: ux, y: uy });
  return { cx: ux, cy: uy, r };
}

function perpBisector(a: Point, b: Point, extend = 180): [Point, Point] {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [{ x: mx - extend * nx, y: my - extend * ny }, { x: mx + extend * nx, y: my + extend * ny }];
}

function maxAngleDeg(p1: Point, p2: Point, p3: Point): number {
  const a = dist(p2, p3);
  const b = dist(p1, p3);
  const c = dist(p1, p2);
  const angles = [
    Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c)))),
    Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c)))),
    Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b)))),
  ];
  return Math.max(...angles) * (180 / Math.PI);
}

type TriType = 'acute' | 'right' | 'obtuse';

function getType(pts: Point[]): TriType | null {
  if (pts.length < 3) return null;
  const m = maxAngleDeg(pts[0], pts[1], pts[2]);
  if (m > 91) return 'obtuse';
  if (m < 89) return 'acute';
  return 'right';
}

const TYPE_COLORS: Record<TriType, string> = {
  acute: '#22c55e',
  right: '#f59e0b',
  obtuse: '#ef4444',
};
const TYPE_LABEL: Record<TriType, string> = {
  acute: 'Acute △ — circumcentre INSIDE',
  right: 'Right △ — circumcentre ON hypotenuse',
  obtuse: 'Obtuse △ — circumcentre OUTSIDE',
};

const TAKEAWAY = {
  title: 'Circumcircle Takeaway',
  points: [
    'Every triangle has a unique circumcircle — passing through all 3 vertices.',
    'Acute triangle: circumcentre lies inside the triangle.',
    'Right triangle: circumcentre lies at the midpoint of the hypotenuse.',
    'Obtuse triangle: circumcentre lies outside the triangle.',
    'The circumcentre is where the perpendicular bisectors of the sides meet.',
  ],
};

export default function CircleCircumcircleBuilderLab({ nodeTitle, xpReward, onComplete }: LabProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [tasksDone, setTasksDone] = useState({ acute: false, right: false, obtuse: false });

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length >= 3) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    // keep at least 30px from edges
    const px = Math.max(30, Math.min(W - 30, x));
    const py = Math.max(30, Math.min(H - 30, y));
    const next = [...points, { x: px, y: py }];
    setPoints(next);
    if (next.length === 3) {
      const t = getType(next);
      if (t) setTasksDone(prev => ({ ...prev, [t]: true }));
    }
  }, [points]);

  const reset = () => setPoints([]);

  const triType = getType(points);
  const cc = points.length === 3 ? circumcircle(points[0], points[1], points[2]) : null;
  const pb1 = points.length === 3 ? perpBisector(points[0], points[1]) : null;
  const pb2 = points.length === 3 ? perpBisector(points[1], points[2]) : null;

  const allDone = tasksDone.acute && tasksDone.right && tasksDone.obtuse;
  const doneCount = Object.values(tasksDone).filter(Boolean).length;

  return (
    <LabShell
      title={nodeTitle}
      xpReward={xpReward}
      onComplete={onComplete}
      disableFinish={!allDone}
      takeaway={TAKEAWAY}
      artifact={{ tasksDone, attemptsNeeded: doneCount }}
    >
      <div style={{ display: 'flex', gap: '1.5rem', padding: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* SVG Canvas */}
        <div style={{ flex: '1 1 340px' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
            {points.length < 3
              ? `Click to place point ${points.length + 1} of 3`
              : `Triangle built! Type: ${triType} — click Reset to try another type.`}
          </p>
          <svg
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{
              background: '#0f172a',
              borderRadius: 10,
              cursor: points.length < 3 ? 'crosshair' : 'default',
              border: '1px solid #1e293b',
            }}
            onClick={handleCanvasClick}
          >
            {/* Grid */}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 54} y1={0} x2={i * 54} y2={H} stroke="#1e293b" strokeWidth={1} />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 50} x2={W} y2={i * 50} stroke="#1e293b" strokeWidth={1} />
            ))}

            {/* Circumcircle */}
            {cc && (
              <circle
                cx={cc.cx}
                cy={cc.cy}
                r={cc.r}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            )}

            {/* Perpendicular bisectors */}
            {pb1 && (
              <line x1={pb1[0].x} y1={pb1[0].y} x2={pb1[1].x} y2={pb1[1].y}
                stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
            )}
            {pb2 && (
              <line x1={pb2[0].x} y1={pb2[0].y} x2={pb2[1].x} y2={pb2[1].y}
                stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
            )}

            {/* Triangle sides */}
            {points.length >= 2 && (
              <polyline
                points={points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2}
              />
            )}
            {points.length === 3 && (
              <line
                x1={points[2].x} y1={points[2].y}
                x2={points[0].x} y2={points[0].y}
                stroke="#38bdf8"
                strokeWidth={2}
              />
            )}

            {/* Circumcentre */}
            {cc && (
              <>
                <circle cx={cc.cx} cy={cc.cy} r={5} fill="#6366f1" />
                <text x={cc.cx + 8} y={cc.cy - 6} fill="#6366f1" fontSize={12} fontWeight="bold">O</text>
              </>
            )}

            {/* Vertex points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={7} fill="#38bdf8" />
                <text x={p.x + 9} y={p.y - 7} fill="#e2e8f0" fontSize={13} fontWeight="bold">
                  {['A', 'B', 'C'][i]}
                </text>
              </g>
            ))}

            {/* Type badge */}
            {triType && (
              <rect x={8} y={H - 32} width={W - 16} height={26} rx={6} fill={TYPE_COLORS[triType]} opacity={0.2} />
            )}
            {triType && (
              <text x={W / 2} y={H - 13} fill={TYPE_COLORS[triType]} fontSize={13} fontWeight="bold" textAnchor="middle">
                {TYPE_LABEL[triType]}
              </text>
            )}
          </svg>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.4rem 1rem',
                background: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Reset Points
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ color: '#f59e0b' }}>─ ─</span> Perp. bisectors
              <span style={{ color: '#6366f1' }}>○</span> Circumcircle
              <span style={{ color: '#6366f1' }}>●</span> Circumcentre O
            </div>
          </div>
        </div>

        {/* Missions panel */}
        <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '0.95rem', margin: 0 }}>
            Missions ({doneCount}/3)
          </h3>

          {([
            { key: 'acute', label: 'Build an acute triangle', sub: 'All angles < 90° → circumcentre inside', color: '#22c55e' },
            { key: 'right', label: 'Build a right triangle', sub: 'One angle ≈ 90° → circumcentre on hypotenuse', color: '#f59e0b' },
            { key: 'obtuse', label: 'Build an obtuse triangle', sub: 'One angle > 90° → circumcentre outside', color: '#ef4444' },
          ] as const).map(m => (
            <div key={m.key} style={{
              padding: '0.75rem',
              background: tasksDone[m.key] ? '#0f2b1f' : '#1e293b',
              borderRadius: 8,
              border: `1px solid ${tasksDone[m.key] ? m.color : '#334155'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>{tasksDone[m.key] ? '✅' : '⬜'}</span>
                <span style={{ color: tasksDone[m.key] ? m.color : '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                  {m.label}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.25rem 0 0 1.5rem' }}>{m.sub}</p>
            </div>
          ))}

          <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#1e293b', borderRadius: 8, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
            <strong style={{ color: '#94a3b8' }}>Tip:</strong> For a right triangle, try placing two points far apart and the third roughly where the perpendicular from the midpoint would land.
          </div>
        </div>
      </div>
    </LabShell>
  );
}
