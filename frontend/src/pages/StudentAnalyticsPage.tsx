import { useEffect, useState } from "react";
import { api } from "../context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

type XPData = {
  total: number;
  level: number;
  xp_in_level: number;
  xp_to_next: number;
  xp_per_level: number;
  max_level: number;
};

type StreakData = { current: number; longest: number };

type CompletionData = {
  total_known: number;
  completed: number;
  in_progress: number;
};

type SubjectData = {
  subject: string;
  completed: number;
  in_progress: number;
};

type MockData = {
  total: number;
  avg_score: number;
  best_score: number;
};

type WeakSpot = {
  concept: string;
  subject: string;
  chapter: string;
  wrong_count: number;
};

type RecentNode = {
  node_id: number;
  node_title: string;
  subject: string;
  stars: number;
  xp_earned: number;
  completed_at: string;
};

type AnalyticsData = {
  xp: XPData;
  streak: StreakData;
  completion: CompletionData;
  subjects: SubjectData[];
  mock_tests: MockData;
  weak_spots: WeakSpot[];
  recent_completed: RecentNode[];
};

// ── Subject colour map (mirrors StudentDashboard) ──────────────────────────────

const SUBJECT_COLOURS: Record<string, { bar: string; badge: string }> = {
  Mathematics: { bar: "bg-primary",   badge: "bg-primary/10 text-primary"   },
  Science:     { bar: "bg-secondary", badge: "bg-secondary/10 text-secondary" },
  English:     { bar: "bg-tertiary",  badge: "bg-tertiary/10 text-tertiary"  },
};
const DEFAULT_COLOUR = { bar: "bg-primary", badge: "bg-primary/10 text-primary" };

// ── Helpers ────────────────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`material-symbols-outlined text-sm ${i <= count ? "text-tertiary" : "text-outline/30"}`}
          style={{ fontVariationSettings: i <= count ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-container-highest rounded-xl animate-pulse ${className}`} />;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StudentAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("student/analytics/")
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load analytics. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-5xl text-error mb-3 block">error_outline</span>
          <p className="text-on-surface font-bold mb-1">Something went wrong</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const xp = data?.xp;
  const streak = data?.streak;
  const completion = data?.completion;
  const mockTests = data?.mock_tests;
  const subjects = data?.subjects ?? [];
  const weakSpots = data?.weak_spots ?? [];
  const recentNodes = data?.recent_completed ?? [];

  const xpPct = xp ? Math.min(100, Math.round((xp.xp_in_level / xp.xp_per_level) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 lg:pb-16">
      <div className="max-w-5xl mx-auto px-4 md:px-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-black font-headline text-on-surface tracking-tight">My Progress</h1>
          <p className="text-slate-500 text-sm mt-1">Your full learning report at a glance</p>
        </div>

        {/* ── Stat cards row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* XP */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total XP</span>
            </div>
            {loading ? <Skeleton className="h-8 w-24 mt-1" /> : (
              <p className="text-2xl font-black text-primary">{(xp?.total ?? 0).toLocaleString()}</p>
            )}
          </div>

          {/* Level */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Level</span>
            </div>
            {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-black text-secondary">{xp?.level ?? 1}</p>
            )}
          </div>

          {/* Current streak */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-tertiary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Streak</span>
            </div>
            {loading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className="text-2xl font-black text-tertiary">{streak?.current ?? 0} <span className="text-sm font-bold text-slate-500">days</span></p>
            )}
          </div>

          {/* Nodes completed */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-on-surface text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            </div>
            {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-black text-on-surface">{completion?.completed ?? 0} <span className="text-sm font-bold text-slate-500">nodes</span></p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left / centre col ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* XP level bar */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black font-headline text-on-surface">Level Progress</h2>
                {!loading && xp && (
                  <span className="text-xs font-bold text-slate-500">
                    {xp.level < xp.max_level
                      ? `${xp.xp_to_next.toLocaleString()} XP to Lv ${xp.level + 1}`
                      : "Max Level!"}
                  </span>
                )}
              </div>
              {loading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <>
                  <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{xp?.xp_in_level.toLocaleString()} / {xp?.xp_per_level.toLocaleString()} XP</span>
                    <span>Lv {xp?.level} → Lv {Math.min((xp?.level ?? 1) + 1, xp?.max_level ?? 20)}</span>
                  </div>
                </>
              )}

              {/* Streak sub-row */}
              {!loading && streak && (
                <div className="flex gap-4 mt-4 pt-4 border-t border-outline-variant/10">
                  <div className="text-center">
                    <p className="text-lg font-black text-tertiary">{streak.current}</p>
                    <p className="text-[11px] text-slate-500">Current streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-on-surface">{streak.longest}</p>
                    <p className="text-[11px] text-slate-500">Best streak</p>
                  </div>
                </div>
              )}
            </div>

            {/* Subjects breakdown */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
              <h2 className="text-base font-black font-headline text-on-surface mb-4">Subject Breakdown</h2>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : subjects.length === 0 ? (
                <p className="text-slate-500 text-sm py-2">No subject data yet — complete a few nodes first.</p>
              ) : (
                <div className="space-y-4">
                  {subjects.map(s => {
                    const col = SUBJECT_COLOURS[s.subject] ?? DEFAULT_COLOUR;
                    const total = s.completed + s.in_progress;
                    const completedPct = total > 0 ? Math.round((s.completed / total) * 100) : 0;
                    return (
                      <div key={s.subject}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{s.subject}</span>
                          <span className="text-xs text-slate-500">
                            <span className="text-on-surface font-bold">{s.completed}</span> done · <span className="text-on-surface font-bold">{s.in_progress}</span> in progress
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${col.bar} transition-all duration-700`}
                            style={{ width: `${completedPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mock test performance */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h2 className="text-base font-black font-headline text-on-surface">Mock Test Performance</h2>
              </div>
              {loading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : mockTests?.total === 0 ? (
                <p className="text-slate-500 text-sm py-2">No completed mock tests yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-high rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-on-surface">{mockTests?.total ?? 0}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tests taken</p>
                  </div>
                  <div className="bg-surface-container-high rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-secondary">{mockTests?.avg_score ?? 0}%</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Avg score</p>
                  </div>
                  <div className="bg-surface-container-high rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-tertiary">{mockTests?.best_score ?? 0}%</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Best score</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right col ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Weak spots */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-error text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                <h2 className="text-base font-black font-headline text-on-surface">Weak Spots</h2>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
                </div>
              ) : weakSpots.length === 0 ? (
                <p className="text-slate-500 text-sm">No unresolved weak spots — great work!</p>
              ) : (
                <div className="space-y-2">
                  {weakSpots.map((ws, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-container-high rounded-xl">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{ws.concept || ws.chapter}</p>
                        <p className="text-[11px] text-slate-500 truncate">{ws.subject}</p>
                      </div>
                      <span className="ml-2 shrink-0 text-xs font-black text-error bg-error/10 px-2 py-0.5 rounded-full">
                        {ws.wrong_count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recently completed nodes */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-outline-variant/10">
                <h2 className="text-base font-black font-headline text-on-surface">Recent Completions</h2>
              </div>
              {loading ? (
                <div className="divide-y divide-outline-variant/10">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                      <Skeleton className="w-9 h-9 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentNodes.length === 0 ? (
                <p className="text-slate-500 text-sm px-5 py-4">No completed nodes yet.</p>
              ) : (
                <div className="divide-y divide-outline-variant/10">
                  {recentNodes.map(n => {
                    const col = SUBJECT_COLOURS[n.subject] ?? DEFAULT_COLOUR;
                    return (
                      <div key={n.node_id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface-container-high transition-colors">
                        <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${col.badge}`}>
                          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-on-surface truncate leading-tight">{n.node_title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRow count={n.stars ?? 0} />
                            <span className="text-[11px] text-primary font-bold">+{n.xp_earned} XP</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(n.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-primary/4 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full bg-secondary/4 blur-[100px]" />
      </div>
    </div>
  );
}
