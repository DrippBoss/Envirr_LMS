import { useEffect, useState } from "react";
import { api, useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PrerequisiteModal from "../components/PrerequisiteModal";
import { useMetadata } from "../lib/metadata";
import heroImg from "../assets/hero.png";

type CourseUnit = {
  id: number;
  title: string;
  description: string;
  progress_percentage: number;
  subject: string;
  class_grade: string;
  board: string;
  icon?: string;
  paths?: { id: number }[];
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Static subject meta — safe for Tailwind purging
const SUBJECT_META: Record<string, { icon: string; iconBg: string; bar: string }> = {
  Mathematics: { icon: "functions",  iconBg: "bg-primary/10 text-primary",   bar: "bg-primary"   },
  Science:     { icon: "science",    iconBg: "bg-secondary/10 text-secondary", bar: "bg-secondary" },
  English:     { icon: "menu_book",  iconBg: "bg-tertiary/10 text-tertiary",  bar: "bg-tertiary"  },
};
const DEFAULT_META = { icon: "school", iconBg: "bg-primary/10 text-primary", bar: "bg-primary" };

export default function StudentDashboard() {
  const [units, setUnits]               = useState<CourseUnit[]>([]);
  const [stats, setStats]               = useState<any>(null);
  const [weakConcepts, setWeakConcepts] = useState<any[]>([]);
  const [activity, setActivity]         = useState<any[]>([]);
  const [studyGroups, setStudyGroups]       = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [prereqCards, setPrereqCards]   = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate  = useNavigate();
  const meta = useMetadata();
  const xpPerLevel = meta.gamification.xp_per_level;

  useEffect(() => {
    Promise.all([
      api.get("gamification/stats/").then(r => setStats(r.data)).catch(console.error),
      api.get("student/dashboard/").then(r => {
        const data: CourseUnit[] = r.data?.results ?? r.data;
        setUnits(data);
        // Default to "All" so every course is visible immediately
      }).catch(console.error),
      api.get("student/weak-concepts/").then(r => setWeakConcepts(r.data)).catch(() => {}),
      api.get("student/activity/").then(r => setActivity(r.data)).catch(() => {}),
      api.get("student/study-groups/").then(r => setStudyGroups(r.data)).catch(() => {}),
    ]).finally(() => setIsLoading(false));
  }, []);

  const subjects = [...new Set(units.map(u => u.subject))];
  const filteredUnits = selectedSubject ? units.filter(u => u.subject === selectedSubject) : units;

  const handleUnitSelect = async (unitId: number, firstPathId: number) => {
    try {
      const { data } = await api.get(`student/units/${unitId}/prerequisites/`);
      if (data.status === "already_seen" || data.status === "no_prerequisites") {
        navigate(`map/${firstPathId}`);
      } else {
        setSelectedUnitId(unitId);
        setPrereqCards(data.deck.cards);
        setShowPrereqModal(true);
      }
    } catch {
      navigate(`map/${firstPathId}`);
    }
  };

  const handlePrereqComplete = async () => {
    if (!selectedUnitId) return;
    await api.post(`student/units/${selectedUnitId}/prerequisites/`);
    setShowPrereqModal(false);
    const unit = units.find(u => u.id === selectedUnitId) as any;
    if (unit?.paths?.[0]) navigate(`map/${unit.paths[0].id}`);
  };

  const handleContinueLearning = () => {
    const inProgress = units.find(u => u.progress_percentage > 0 && u.progress_percentage < 100);
    const target = inProgress ?? units[0];
    if (target?.paths?.[0]) handleUnitSelect(target.id, target.paths[0].id);
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-16">
      <div className="max-w-5xl mx-auto px-4 md:px-6">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-surface-container border border-outline-variant/10 mt-8 mb-8 shadow-nebula">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-primary/8 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-4 md:px-8 py-6 md:py-10">
            {/* Left copy */}
            <div className="flex-1 min-w-0">
              {/* Stats inline row */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/10">
                  <span className="material-symbols-outlined text-tertiary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span className="text-tertiary font-bold text-xs">{stats?.current_streak ?? 0}-day streak</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/10">
                  <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
                  <span className="text-primary font-bold text-xs">{(stats?.total_xp ?? 0).toLocaleString()} XP</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/10">
                  <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  <span className="text-secondary font-bold text-xs">Lv {stats?.current_level ?? 1}</span>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-black font-headline text-on-surface tracking-tight mb-2">
                {getGreeting()}, {user?.name || user?.username || "Commander"} 👋
              </h1>
              <p className="text-on-surface-variant text-sm md:text-base mb-3 leading-relaxed">
                You're on a{" "}
                <span className="text-secondary font-bold">{stats?.current_streak ?? 0}-day roll!</span>{" "}
                {(() => {
                  const xpInLevel = (stats?.total_xp ?? 0) % xpPerLevel;
                  const xpToNext  = xpPerLevel - xpInLevel;
                  const lvl       = stats?.current_level ?? 1;
                  return `${xpToNext} XP to Level ${lvl + 1} — keep going!`;
                })()}
              </p>

              {/* XP level progress bar */}
              {stats && (
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>{(stats.total_xp % xpPerLevel).toLocaleString()} / {xpPerLevel} XP</span>
                    <span>Lv {stats.current_level} → Lv {stats.current_level + 1}</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${((stats.total_xp % xpPerLevel) / xpPerLevel) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Badges row */}
              {stats?.badges && stats.badges.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {stats.badges.map((b: any) => (
                    <div key={b.name} className="flex items-center gap-1.5 px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-full">
                      <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                      <span className="text-secondary text-xs font-black">{b.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-4 text-slate-600 text-xs">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Scholar badge — complete any full course to unlock</span>
                </div>
              )}

              <button
                onClick={handleContinueLearning}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-xp-glow group"
              >
                Continue Learning
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>

            {/* Hero image */}
            <div className="hidden md:block w-32 h-32 md:w-48 md:h-48 shrink-0 opacity-90">
              <img src={heroImg} alt="Learning" className="w-full h-full object-contain drop-shadow-xl" />
            </div>
          </div>
        </section>

        {/* ── My Courses ───────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-black font-headline text-on-surface">My Courses</h2>
              <p className="text-slate-500 text-sm mt-0.5">Pick up where you left off</p>
            </div>
            {!isLoading && (
              <span className="text-[10px] font-black uppercase tracking-widest text-outline">
                {filteredUnits.length} course{filteredUnits.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Subject tabs */}
          {isLoading ? (
            <div className="flex gap-2 mb-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-9 w-28 bg-surface-container rounded-full animate-pulse" />
              ))}
            </div>
          ) : subjects.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-5">
              {/* All tab */}
              <button
                onClick={() => setSelectedSubject(null)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedSubject === null
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-surface-container border-outline-variant/15 text-slate-400 hover:border-outline-variant/30 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
                All
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  selectedSubject === null ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-slate-500'
                }`}>{units.length}</span>
              </button>

              {subjects.map(subj => {
                const meta = SUBJECT_META[subj] ?? DEFAULT_META;
                const count = units.filter(u => u.subject === subj).length;
                const isActive = selectedSubject === subj;
                return (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-surface-container border-outline-variant/15 text-slate-400 hover:border-outline-variant/30 hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{meta.icon}</span>
                    {subj}
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-slate-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Course list */}
          {isLoading ? (
            <div className="space-y-4">
              {/* Hero skeleton */}
              <div className="bg-surface-container rounded-2xl p-6 animate-pulse border border-outline-variant/10">
                <div className="flex gap-5">
                  <div className="w-14 h-14 bg-surface-container-highest rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-surface-container-highest rounded w-2/3" />
                    <div className="h-3 bg-surface-container-highest rounded w-1/3" />
                    <div className="h-3 bg-surface-container-highest rounded w-full mt-2" />
                    <div className="h-1.5 bg-surface-container-highest rounded-full mt-3" />
                  </div>
                </div>
              </div>
              {/* Compact skeletons */}
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-surface-container rounded-xl p-4 animate-pulse border border-outline-variant/10 flex items-center gap-3">
                    <div className="w-9 h-9 bg-surface-container-highest rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface-container-highest rounded w-3/4" />
                      <div className="h-1.5 bg-surface-container-highest rounded-full" />
                    </div>
                    <div className="h-5 w-10 bg-surface-container-highest rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3">rocket_launch</span>
              <h3 className="text-base font-black font-headline text-on-surface mb-1">No courses yet</h3>
              <p className="text-slate-500 text-sm">Your courses will appear here once your teacher publishes them.</p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
              <p className="text-slate-500 text-sm">No courses found for <strong className="text-on-surface">{selectedSubject}</strong>.</p>
            </div>
          ) : (() => {
            // Hero = highest in-progress unit; fallback to first unit
            const heroUnit = filteredUnits.find(u => u.progress_percentage > 0 && u.progress_percentage < 100)
              ?? filteredUnits[0];
            const restUnits = filteredUnits.filter(u => u.id !== heroUnit.id);
            const heroMeta = SUBJECT_META[heroUnit.subject] ?? DEFAULT_META;
            const heroPct = heroUnit.progress_percentage;
            const heroIsDone = heroPct >= 100;

            return (
              <div className="space-y-3">
                {/* ── Hero card ── */}
                <div
                  onClick={() => heroUnit.paths?.[0] && handleUnitSelect(heroUnit.id, heroUnit.paths[0].id)}
                  className="group relative overflow-hidden bg-surface-container rounded-2xl border border-outline-variant/10 hover:border-outline-variant/30 transition-all cursor-pointer p-6"
                >
                  {/* Subtle subject-tinted glow */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute top-0 right-0 w-1/2 h-full opacity-5 bg-gradient-to-l ${heroMeta.bar} via-transparent to-transparent`} />
                  </div>

                  <div className="relative flex gap-5 items-start">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${heroMeta.iconBg}`}>
                      <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {heroUnit.icon || heroMeta.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-base font-black font-headline text-on-surface leading-snug">
                          {heroUnit.title}
                        </h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                          heroIsDone
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : heroPct > 0
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-surface-container-highest text-slate-500 border-outline-variant/15'
                        }`}>
                          {heroIsDone ? 'Done' : heroPct > 0 ? `${heroPct}%` : 'New'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mb-3">
                        Grade {heroUnit.class_grade} · {heroUnit.board}
                      </p>

                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mb-4">
                        <div
                          className={`h-full rounded-full transition-all ${heroMeta.bar}`}
                          style={{ width: `${heroPct}%` }}
                        />
                      </div>

                      <button className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all group-hover:gap-3 ${heroMeta.iconBg}`}>
                        {heroIsDone ? 'Review Course' : heroPct > 0 ? 'Continue Learning' : 'Start Course'}
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Compact list ── */}
                {restUnits.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {restUnits.map(unit => {
                      const meta = SUBJECT_META[unit.subject] ?? DEFAULT_META;
                      const pct = unit.progress_percentage;
                      const isDone = pct >= 100;
                      return (
                        <div
                          key={unit.id}
                          onClick={() => unit.paths?.[0] && handleUnitSelect(unit.id, unit.paths[0].id)}
                          className="group flex items-center gap-3 bg-surface-container rounded-xl border border-outline-variant/10 hover:border-outline-variant/25 hover:bg-surface-container-high transition-all cursor-pointer px-4 py-3"
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {unit.icon || meta.icon}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate leading-tight mb-1">{unit.title}</p>
                            <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${meta.bar}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                            isDone
                              ? 'bg-secondary/10 text-secondary border-secondary/20'
                              : pct > 0
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-surface-container-highest text-slate-500 border-outline-variant/15'
                          }`}>
                            {isDone ? 'Done' : pct > 0 ? `${pct}%` : 'New'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* ── Bottom grid ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-3 lg:gap-6">

          {/* Left col — Weak Concepts + Bento */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">

            {/* Weak Concepts */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="material-symbols-outlined text-error text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                  <h2 className="text-base font-black font-headline text-on-surface">Weak Concepts</h2>
                </div>
                <p className="text-slate-500 text-xs">Topics you've answered wrong the most — focus here.</p>
              </div>
              <div className="px-6 py-4">
                {weakConcepts.length === 0 ? (
                  <p className="text-slate-500 text-sm py-2">No weak spots yet — keep practicing!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {weakConcepts.map(spot => (
                      <button
                        key={spot.id}
                        onClick={() => navigate('/mock-test')}
                        title="Practice your weak spots in a mock test"
                        className="px-3.5 py-1.5 bg-surface-container-high rounded-full text-sm font-medium border border-outline-variant/20 hover:border-error/40 hover:text-error transition-all flex items-center gap-1.5"
                      >
                        <span className="text-error text-xs font-black">{spot.wrong_count}×</span>
                        {spot.concept || spot.chapter}
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bento: AI Mock + Study Groups + Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* AI Mock Test card */}
              <div
                className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 flex flex-col justify-between hover:border-primary/30 transition-all group cursor-pointer"
                onClick={() => navigate('/mock-test')}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
                </div>
                <div>
                  <h4 className="text-base font-black font-headline text-on-surface mb-1">AI Mock Test</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Personalized quiz based on your weak spots.</p>
                  <span className="text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                    Start Now
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </span>
                </div>
              </div>

              {/* My Progress card */}
              <div
                className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 flex flex-col justify-between hover:border-tertiary/30 transition-all group cursor-pointer"
                onClick={() => navigate('/analytics')}
              >
                <div className="w-11 h-11 rounded-xl bg-tertiary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-tertiary text-2xl">insights</span>
                </div>
                <div>
                  <h4 className="text-base font-black font-headline text-on-surface mb-1">My Progress</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Full report: XP, streaks, subjects & mock scores.</p>
                  <span className="text-tertiary font-bold text-xs uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Report
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </span>
                </div>
              </div>

              {/* Study Groups card */}
              <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 flex flex-col justify-between hover:border-secondary/30 transition-all group cursor-pointer"
                onClick={() => navigate('/study-groups')}>
                <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-secondary text-2xl">group</span>
                </div>
                <div>
                  <h4 className="text-base font-black font-headline text-on-surface mb-1">Study Groups</h4>
                  {studyGroups.length === 0 ? (
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">No one is studying right now. Start a session!</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {studyGroups.slice(0, 3).map(g => (
                        <button
                          key={g.path_id}
                          onClick={() => navigate(`/map/${g.path_id}`)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-surface-container-high rounded-xl hover:bg-surface-container-highest transition-colors group/item"
                        >
                          <span className="text-xs font-bold text-on-surface truncate mr-2">{g.path_title}</span>
                          <span className="text-xs text-secondary font-bold shrink-0 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                            {g.active_count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-secondary font-bold text-xs uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                    {studyGroups.length === 0 ? 'Be First' : 'Browse All'}
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right col — Activity Feed */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-black font-headline text-on-surface mb-0.5">Recent Activity</h2>
              <p className="text-slate-500 text-xs">Your path to mastery</p>
            </div>

            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden divide-y divide-outline-variant/10">
              {activity.length === 0 && !isLoading ? (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                  No activity yet — complete your first lesson!
                </div>
              ) : isLoading ? (
                [1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-surface-container-highest shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface-container-highest rounded w-3/4" />
                      <div className="h-2.5 bg-surface-container-highest rounded w-1/3" />
                    </div>
                  </div>
                ))
              ) : (
                activity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-high transition-colors">
                    <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${item.is_correct ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {item.is_correct ? 'task_alt' : 'menu_book'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(item.answered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
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

      {showPrereqModal && (
        <PrerequisiteModal
          cards={prereqCards}
          unitName={units.find(u => u.id === selectedUnitId)?.title ?? ""}
          onComplete={handlePrereqComplete}
        />
      )}
    </div>
  );
}
