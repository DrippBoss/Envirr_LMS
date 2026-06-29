/**
 * Shared, API-ready data contracts for the reusable chart components.
 * Charts are pure presentational primitives: pass typed data, get SVG.
 */
export interface TimePoint { day: string; count: number; }
export interface DonutSlice { label: string; value: number; colorVar: string; }
export type AccentVar =
  | 'primary' | 'secondary' | 'tertiary' | 'error';
