/** Vertical bar chart with hover tooltips. Dependency-free. */
export default function BarChart({
  data, xLabels, tooltips, height = 160, colorVar = 'primary',
}: {
  data: number[];
  xLabels?: string[];
  tooltips?: string[];
  height?: number;
  colorVar?: string;
}) {
  const max = Math.max(...data, 1);
  if (!data.some(v => v > 0)) {
    return (
      <div className="flex items-center justify-center text-xs text-outline" style={{ height }}>
        No data for this period.
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height }}>
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all hover:opacity-80 cursor-default"
            style={{
              height: `${Math.max(2, (v / max) * 100)}%`,
              background: `linear-gradient(to top, rgb(var(--color-${colorVar}) / 0.7), rgb(var(--color-${colorVar}) / 0.15))`,
            }}
            title={tooltips?.[i] ?? String(v)}
          />
        ))}
      </div>
      {xLabels && xLabels.length > 0 && (
        <div className="flex justify-between text-[10px] text-outline mt-2 px-0.5">
          {xLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}
