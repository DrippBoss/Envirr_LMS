import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Lightweight contextual tooltip. Shows on hover AND keyboard focus, so it is
 * accessible. Wrap any trigger element:
 *
 *   <Tooltip label="Reset your streak">
 *     <button>…</button>
 *   </Tooltip>
 */
export default function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const pos = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 ${pos} z-50 whitespace-nowrap rounded-lg bg-inverse-surface text-inverse-on-surface text-xs font-semibold px-2.5 py-1.5 shadow-lg animate-fade-in pointer-events-none`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
