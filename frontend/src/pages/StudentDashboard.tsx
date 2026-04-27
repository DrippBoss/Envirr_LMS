import { useEffect, useState } from "react";
import { api, useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PrerequisiteModal from "../components/PrerequisiteModal";
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

  useEffect(() => {
    Promise.all([
      api.get("gamification/stats/").then(r => setStats(r.data)).catch(console.error),
      api.get("student/dashboard/").then(r => {
        const data: CourseUnit[] = r.data;
        setUnits(data);
        if (data.length > 0) {
          const first = data[0].subject;
          setSelectedSubject(first);
        }
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

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-8 md:py-10">
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

              <h1 className="text-3xl md:text-4xl font-black font-headline text-white tracking-tight mb-2">
                {getGreeting()}, {user?.username ?? "Commander"} 👋
              </h1>
              <p className="text-on-surface-variant text-sm md:text-base mb-6 leading-relaxed">
                You're on a{" "}
                <span className="text-secondary font-bold">{stats?.current_streak ?? 0}-day roll!</span>{" "}
                Keep the momentum going to unlock the "Scholar" badge.
              </p>

              <button
                onClick={handleContinueLearning}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-xp-glow group"
              >
                Continue Learning
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>

            {/* Hero image */}
            <div className="hidden md:block w-48 h-48 shrink-0 opacity-90">
              <img src={heroImg} alt="Learning" className="w-full h-full object-contain drop-shadow-xl" />
            </div>
          </div>
        </section>

        {/* ── My Courses ───────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-black font-headline text-white">My Courses</h2>
              <p className="text-slate-500 text-sm mt-0.5">Select a subject to browse your courses</p>
            </div>
            {selectedSubject && (
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

          {/* Course grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface-container rounded-2xl p-5 animate-pulse border border-outline-variant/10">
                  <div className="h-10 w-10 bg-surface-container-highest rounded-xl mb-4" />
                  <div className="h-5 bg-surface-container-highest rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-container-highest rounded w-1/2 mb-4" />
                  <div className="h-1.5 bg-surface-container-highest rounded-full" />
                </div>
              ))}
            </div>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3">rocket_launch</span>
              <h3 className="text-base font-black font-headline text-white mb-1">No courses yet</h3>
              <p className="text-slate-500 text-sm">Your courses will appear here once your teacher publishes them.</p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 text-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
              <p className="text-slate-500 text-sm">No courses found for <strong className="text-white">{selectedSubject}</strong>.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnits.map(unit => {
                const meta = SUBJECT_META[unit.subject] ?? DEFAULT_META;
                const pct = unit.progress_percentage;
                const isStarted = pct > 0;
                const isDone = pct >= 100;
                return (
                  <div
                    key={unit.id}
                    onClick={() => unit.paths?.[0] && handleUnitSelect(unit.id, unit.paths[0].id)}
                    className="group bg-surface-container rounded-2xl border border-outline-variant/10 hover:border-outline-variant/25 hover:bg-surface-container-high transition-all cursor-pointer flex flex-col p-5"
                  >
                    {/* Top row: icon + status badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${meta.iconBg}`}>
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {unit.icon || meta.icon}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        isDone
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : isStarted
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-surface-container-highest text-slate-500 border-outline-variant/15'
                      }`}>
                        {isDone ? 'Done' : isStarted ? `${pct}%` : 'New'}
                      </span>
                    </div>

                    {/* Title + meta */}
                    <h3 className="text-sm font-black font-headline text-white leading-tight mb-1 line-clamp-2 flex-1">
                      {unit.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Grade {unit.class_grade} · {unit.board}
                    </p>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${meta.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* CTA */}
                    <div className={`flex items-center gap-1 text-xs font-bold ${meta.iconBg.split(' ')[1]} group-hover:gap-2 transition-all`}>
                      <span>{isDone ? 'Review' : isStarted ? 'Continue' : 'Start'}</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Bottom grid ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left col — Weak Concepts + Bento */}
          <div className="lg:col-span-2 space-y-6">

            {/* Weak Concepts */}
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="material-symbols-outlined text-error text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                  <h2 className="text-base font-black font-headline text-white">Weak Concepts</h2>
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

            {/* Bento: AI Mock + Study Groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* AI Mock Test card */}
              <div
                className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 flex flex-col justify-between hover:border-primary/30 transition-all group cursor-pointer"
                onClick={() => navigate('/mock-test')}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
                </div>
                <div>
                  <h4 className="text-base font-black font-headline text-white mb-1">AI Mock Test</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Personalized quiz based on your weak spots.</p>
                  <span className="text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                    Start Now
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </span>
                </div>
              </div>

              {/* Study Groups card */}
              <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 flex flex-col justify-between hover:border-secondary/30 transition-all group">
                <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-secondary text-2xl">group</span>
                </div>
                <div>
                  <h4 className="text-base font-black font-headline text-white mb-1">Study Groups</h4>
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
                          <span className="text-xs font-bold text-white truncate mr-2">{g.path_title}</span>
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
              <h2 className="text-base font-black font-headline text-white mb-0.5">Recent Activity</h2>
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
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
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
