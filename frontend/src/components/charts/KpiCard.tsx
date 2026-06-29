import type { ReactNode } from 'react';
import Sparkline from './Sparkline';
import type { AccentVar } from './types';

const ACCENT_TEXT: Record<AccentVar, string> = {
  primary: 'text-primary', secondary: 'text-secondary',
  tertiary: 'text-tertiary', error: 'text-error',
};

/** Enterprise KPI card: label, big value, optional delta chip, sparkline & footer. */
export default function KpiCard({
  label, value, icon, accent = 'primary', delta, sparkline, footer,
}: {
  label: string;
  value: string | number;
  icon?: string;
  accent?: AccentVar;
  delta?: number;
  sparkline?: number[];
  footer?: ReactNode;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 flex flex-col gap-3 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</p>
        {icon && <span className={`material-symbols-outlined text-lg ${ACCENT_TEXT[accent]}`}>{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-black text-on-surface font-headline leading-none">{value}</span>
        {delta !== undefined && (
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${up ? 'text-secondary' : 'text-error'}`}>
            {up ? '+' : ''}{delta}%
            <span className="material-symbols-outlined text-sm">{up ? 'trending_up' : 'trending_down'}</span>
          </span>
        )}
      </div>
      {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} colorVar={accent} />}
      {footer && <div className="pt-2 border-t border-outline-variant/10">{footer}</div>}
    </div>
  );
}
