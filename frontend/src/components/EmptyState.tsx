import type { ReactNode } from 'react';

/**
 * Polished empty-state placeholder. Replaces bare "Nothing here yet" text with
 * an iconed, centred panel and optional call-to-action.
 *
 *   <EmptyState icon="groups" title="No study groups yet"
 *     message="Create one to study with friends."
 *     action={<button className="btn-primary">New group</button>} />
 */
export default function EmptyState({
  icon = 'inbox',
  title,
  message,
  action,
  className = '',
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 animate-fade-in-up ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl text-outline">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-on-surface">{title}</h3>
      {message && <p className="mt-1 text-sm text-on-surface-variant max-w-xs">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
