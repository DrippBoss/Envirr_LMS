import { useId } from 'react';

/**
 * Gradient-filled area/line chart (Vercel-style). Dependency-free SVG.
 * Pass a numeric series + optional x labels; rendering scales responsively.
 */
export default function AreaChart({
  data, xLabels, height = 180, colorVar = 'primary', valueFormatter = (n: number) => String(n),
}: {
  data: number[];
  xLabels?: string[];
  height?: number;
  colorVar?: string;
  valueFormatter?: (n: number) => string;
}) {
  const gid = useId().replace(/:/g, '');
  const W = 600, H = 180;
  const max = Math.max(...data, 1);

  if (!data.some(v => v > 0)) {
    return (
      <div className="flex items-center justify-center text-xs text-outline" style={{ height }}>
        No data for this period.
      </div>
    );
  }

  const stepX = data.length > 1 ? W / (data.length - 1) : W;
  const y = (v: number) => H - (v / max) * (H - 12) - 4;
  const pts = data.map((v, i) => [i * stepX, y(v)] as const);
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;
  const stroke = `rgb(var(--color-${colorVar}))`;

  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* y-axis max label */}
        <span className="absolute left-0 top-0 text-[10px] text-outline">{valueFormatter(max)}</span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full" aria-hidden>
          <defs>
            <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1="0" y1={H * f} x2={W} y2={H * f}
              stroke="rgb(var(--color-outline-variant))" strokeOpacity="0.15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={areaPath} fill={`url(#area-${gid})`} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5"
            vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {xLabels && xLabels.length > 0 && (
        <div className="flex justify-between text-[10px] text-outline mt-2 px-0.5">
          {xLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}
