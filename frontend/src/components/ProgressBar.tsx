import { useEffect, useState } from 'react';

/**
 * Animated progress bar. The fill grows from 0 to `value`% on mount and
 * smoothly transitions whenever `value` changes, for a premium feel.
 *
 *   <ProgressBar value={72} barClassName="bg-secondary" />
 */
export default function ProgressBar({
  value,
  className = 'h-2',
  barClassName = 'bg-primary',
}: {
  value: number;
  /** Track classes — pass a height here (defaults to `h-2`). */
  className?: string;
  barClassName?: string;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Defer one tick so the transition animates from 0 on first paint.
    const id = setTimeout(() => setWidth(Math.max(0, Math.min(100, value))), 50);
    return () => clearTimeout(id);
  }, [value]);

  return (
    <div className={`rounded-full bg-surface-container-highest overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${barClassName}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
