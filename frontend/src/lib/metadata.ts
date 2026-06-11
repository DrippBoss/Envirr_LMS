// App metadata (FH #31) — single source of truth fetched from /api/metadata/.
// The backend owns grades, boards, xp math, initial lives, subjects, etc.
// We fetch once, memoize, and fall back to baked-in defaults if the request
// fails so the UI never hard-breaks offline.
import { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';

export interface Option { value: string; label: string; }
export interface SubjectMeta { name: string; icon: string; color: string; }
export interface PaperSection { name: string; type: string; marks: number; target: number; }

export interface AppMetadata {
  grades: Option[];
  boards: Option[];
  gamification: { xp_per_level: number; max_level: number };
  node: { initial_lives: number };
  subjects: SubjectMeta[];
  auto_graded_types: string[];
  ai_tutor: { history_limit: number };
  paper_section_defaults: PaperSection[];
}

// Mirrors the backend defaults; used until the fetch resolves and as a hard
// fallback. Keep these in sync with learning/views.py MetadataView.
export const METADATA_DEFAULTS: AppMetadata = {
  grades: [
    { value: '9', label: 'Class 9' },
    { value: '10', label: 'Class 10' },
    { value: '11', label: 'Class 11' },
    { value: '12', label: 'Class 12' },
  ],
  boards: [
    { value: 'CBSE', label: 'CBSE' },
    { value: 'ICSE', label: 'ICSE' },
    { value: 'State', label: 'State Board' },
    { value: 'Other', label: 'Other' },
  ],
  gamification: { xp_per_level: 500, max_level: 100 },
  node: { initial_lives: 3 },
  subjects: [
    { name: 'Mathematics', icon: 'functions', color: 'primary' },
    { name: 'Science', icon: 'science', color: 'secondary' },
    { name: 'English', icon: 'menu_book', color: 'tertiary' },
  ],
  auto_graded_types: ['MCQ', 'ASSERTION_REASON', 'VERY_SHORT'],
  ai_tutor: { history_limit: 120 },
  paper_section_defaults: [
    { name: 'Section A', type: 'MCQ', marks: 1, target: 5 },
    { name: 'Section B', type: 'VERY_SHORT', marks: 2, target: 3 },
    { name: 'Section C', type: 'SHORT', marks: 3, target: 3 },
    { name: 'Section D', type: 'LONG', marks: 5, target: 2 },
  ],
};

// color token -> static (purge-safe) Tailwind classes. The API only ever sends
// a token key; never let dynamic class strings reach the markup or Tailwind's
// purge will strip them.
export const SUBJECT_COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  secondary: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/30' },
  tertiary: { bg: 'bg-tertiary/10', text: 'text-tertiary', border: 'border-tertiary/30' },
};

export function colorClasses(token: string) {
  return SUBJECT_COLOR_CLASSES[token] ?? SUBJECT_COLOR_CLASSES.primary;
}

let _cache: AppMetadata | null = null;
let _inflight: Promise<AppMetadata> | null = null;

export async function fetchMetadata(): Promise<AppMetadata> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = api
    .get('metadata/')
    .then((res): AppMetadata => {
      const merged: AppMetadata = { ...METADATA_DEFAULTS, ...res.data };
      _cache = merged;
      return merged;
    })
    .catch((): AppMetadata => METADATA_DEFAULTS)
    .finally(() => {
      _inflight = null;
    });
  return _inflight;
}

// React hook — returns defaults synchronously, swaps in the live values once
// fetched. Components can render immediately without a loading branch.
export function useMetadata(): AppMetadata {
  const [meta, setMeta] = useState<AppMetadata>(_cache ?? METADATA_DEFAULTS);
  useEffect(() => {
    let alive = true;
    fetchMetadata().then((m) => {
      if (alive) setMeta(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return meta;
}
