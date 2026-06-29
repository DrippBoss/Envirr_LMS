import type { DonutSlice } from './types';

/** Donut/ring chart with a centred total and legend. Dependency-free SVG. */
export default function DonutChart({
  slices, size = 150, thickness = 16, centerLabel, centerValue,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgb(var(--color-surface-container-highest))" strokeWidth={thickness} />
          {total > 0 && slices.map((s, i) => {
            const len = (s.value / total) * circ;
            const seg = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={`rgb(var(--color-${s.colorVar}))`} strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} />
            );
            acc += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-on-surface font-headline leading-none">{centerValue ?? total}</span>
          {centerLabel && <span className="text-[9px] text-outline uppercase tracking-widest mt-1">{centerLabel}</span>}
        </div>
      </div>
      <div className="space-y-2 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: `rgb(var(--color-${s.colorVar}))` }} />
            <span className="text-on-surface-variant truncate flex-1">{s.label}</span>
            <span className="font-bold text-on-surface">{s.value}</span>
          </div>
        ))}
        {total === 0 && <p className="text-xs text-outline">No data yet.</p>}
      </div>
    </div>
  );
}
