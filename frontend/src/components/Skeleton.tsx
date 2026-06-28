/**
 * Reusable loading skeleton with a sweeping shimmer (see `.shimmer` in index.css).
 * Use in place of bare `animate-pulse` blocks for a more premium loading feel.
 *
 *   <Skeleton className="h-5 w-2/3" />
 */
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer bg-surface-container-highest rounded-xl ${className}`} />;
}
