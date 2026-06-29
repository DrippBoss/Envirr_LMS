/** Tiny inline trend line (no axes). Used inside KPI cards. */
export default function Sparkline({
  data, colorVar = 'primary', className = '',
}: {
  data: number[];
  colorVar?: string;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${31 - ((v - min) / range) * 28}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={`w-full h-8 ${className}`} aria-hidden>
      <polyline
        points={pts} fill="none" stroke={`rgb(var(--color-${colorVar}))`}
        strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
