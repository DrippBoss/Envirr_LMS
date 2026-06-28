import { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ProgressBar from '../ProgressBar';
import EmptyState from '../EmptyState';
import Skeleton from '../Skeleton';
import Tooltip from '../Tooltip';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Kpis {
  students: number; active_7d: number; courses: number;
  avg_completion: number; avg_accuracy: number;
  pending_doubts: number; compiling_papers: number;
}
interface SubjectPerf { subject: string; students: number; completion: number; accuracy: number; }
interface WeakTopic { subject: string; chapter: string; concept: string; students: number; total_wrong: number; }
interface Activity { type: 'completion' | 'doubt' | 'paper'; student: string; detail: string; subject: string; status?: string; at: string; }
interface DashboardData { kpis: Kpis; subjects: SubjectPerf[]; weak_topics: WeakTopic[]; activity: Activity[]; }

type Tab = 'overview' | 'exam' | 'doubts' | 'course' | 'approvals' | 'assigned' | 'questions' | 'planner';

const ACTIVITY_META: Record<Activity['type'], { icon: string; color: string }> = {
  completion: { icon: 'task_alt',    color: 'text-secondary' },
  doubt:      { icon: 'help',        color: 'text-primary' },
  paper:      { icon: 'description', color: 'text-tertiary' },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── KPI stat card ────────────────────────────────────────────────────────────
function Stat({ icon, label, value, suffix = '', color, hint }: {
  icon: string; label: string; value: number; suffix?: string; color: string; hint?: string;
}) {
  return (
    <Tooltip label={hint || label}>
      <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/10 flex items-center gap-3 w-full animate-fade-in-up">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-surface-container-highest ${color} shrink-0`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xl font-black text-on-surface font-headline leading-none">{value}{suffix}</p>
          <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1 truncate">{label}</p>
        </div>
      </div>
    </Tooltip>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TeacherDashboardHome({
  userName, pendingDoubts, onNavigate,
}: {
  userName: string;
  pendingDoubts: number;
  onNavigate: (tab: Tab, examMode?: string) => void;
}) {
  const { error: toastError } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/teacher/dashboard/')
      .then(r => { if (alive) setData(r.data); })
      .catch(() => { if (alive) toastError('Could not load class analytics.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [toastError]);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // ── This-week activity histogram (derived from the real activity feed) ──
  const weekDays = (() => {
    const days: { label: string; date: Date; count: number }[] = [];
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      days.push({ label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], date: d, count: 0 });
    }
    (data?.activity || []).forEach(a => {
      const ad = new Date(a.at);
      const hit = days.find(d => d.date.toDateString() === ad.toDateString());
      if (hit) hit.count += 1;
    });
    return days;
  })();
  const maxDay = Math.max(1, ...weekDays.map(d => d.count));

  // ── Productivity shortcuts ──
  const shortcuts: { icon: string; title: string; desc: string; tab: Tab; mode?: string; color: string }[] = [
    { icon: 'auto_awesome', title: 'Generate Paper', desc: 'AI / manual / hybrid exam builder', tab: 'exam', mode: 'ai', color: 'text-primary' },
    { icon: 'edit_calendar', title: 'AI Lesson Planner', desc: 'Draft a structured class plan', tab: 'planner', color: 'text-secondary' },
    { icon: 'account_tree', title: 'Course Builder', desc: 'Build a new course framework', tab: 'course', color: 'text-tertiary' },
    { icon: 'edit_note', title: 'Edit Courses', desc: 'Update your assigned courses', tab: 'assigned', color: 'text-primary' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-headline text-on-surface tracking-tight">
            {greeting()}, {userName} 👋
          </h1>
          <p className="text-outline text-sm mt-1">{today} · Here's your teaching workspace at a glance.</p>
        </div>
        <button
          onClick={() => onNavigate('exam', 'ai')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
          Generate Paper
        </button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="groups" label="Students" value={k?.students ?? 0} color="text-primary" hint="Students engaged with your subjects" />
        <Stat icon="bolt" label="Active (7d)" value={k?.active_7d ?? 0} color="text-secondary" hint="Students active in the last 7 days" />
        <Stat icon="trending_up" label="Avg Completion" value={k?.avg_completion ?? 0} suffix="%" color="text-tertiary" hint="Average node completion across your classes" />
        <Stat icon="target" label="Avg Accuracy" value={k?.avg_accuracy ?? 0} suffix="%" color="text-primary" hint="Average answer accuracy across your classes" />
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {shortcuts.map(s => (
            <button
              key={s.title}
              onClick={() => onNavigate(s.tab, s.mode)}
              className="group bg-surface-container rounded-2xl border border-outline-variant/10 p-4 text-left hover:border-primary/30 hover:bg-surface-container-high transition-all active:scale-[0.98]"
            >
              <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
              <p className="text-sm font-black text-on-surface mt-2">{s.title}</p>
              <p className="text-[11px] text-outline leading-snug mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main split ── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left column */}
        <div className="space-y-6">
          {/* Class performance */}
          <section className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black font-headline text-on-surface">Class Performance</h2>
              <span className="text-[10px] text-outline font-bold uppercase tracking-widest">by subject</span>
            </div>
            {data && data.subjects.length > 0 ? (
              <div className="space-y-4">
                {data.subjects.map(s => (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-on-surface">{s.subject}</span>
                      <span className="text-[11px] text-outline">
                        {s.students} student{s.students !== 1 ? 's' : ''} · {s.accuracy}% accuracy
                      </span>
                    </div>
                    <ProgressBar value={s.completion} className="h-2" barClassName="bg-primary" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="insights" title="No activity yet"
                message="Class performance appears once your students start learning." />
            )}
          </section>

          {/* Weak topics */}
          <section className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black font-headline text-on-surface">Class Weak Topics</h2>
              <span className="text-[10px] text-outline font-bold uppercase tracking-widest">needs attention</span>
            </div>
            {data && data.weak_topics.length > 0 ? (
              <div className="space-y-2">
                {data.weak_topics.map((w, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-outline-variant/10 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-error text-base">priority_high</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface truncate">{w.concept || w.chapter}</p>
                      <p className="text-[11px] text-outline truncate">{w.subject} · {w.chapter}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-error">{w.students}</p>
                      <p className="text-[10px] text-outline">student{w.students !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="verified" title="No weak spots flagged"
                message="Concepts your students struggle with will surface here." />
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pending work */}
          <section className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
            <h2 className="text-base font-black font-headline text-on-surface mb-3">Pending Work</h2>
            <button onClick={() => onNavigate('overview')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all mb-2">
              <span className="material-symbols-outlined text-error">pending_actions</span>
              <span className="text-sm font-bold text-on-surface flex-1 text-left">Doubts to answer</span>
              <span className="text-sm font-black text-error">{pendingDoubts}</span>
            </button>
            <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-high">
              <span className="material-symbols-outlined text-tertiary">hourglass_top</span>
              <span className="text-sm font-bold text-on-surface flex-1 text-left">Papers compiling</span>
              <span className="text-sm font-black text-tertiary">{k?.compiling_papers ?? 0}</span>
            </div>
          </section>

          {/* This week */}
          <section className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
            <h2 className="text-base font-black font-headline text-on-surface mb-4">This Week</h2>
            <div className="flex items-end justify-between gap-2 h-24">
              {weekDays.map((d, i) => {
                const isToday = d.date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full flex items-end justify-center flex-1">
                      <div
                        className={`w-2.5 rounded-full transition-[height] duration-700 ${isToday ? 'bg-primary' : 'bg-primary/40'}`}
                        style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
                        title={`${d.count} event${d.count !== 1 ? 's' : ''}`}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-outline'}`}>{d.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-outline mt-3 text-center">Recent class activity per day</p>
          </section>

          {/* Recent activity */}
          <section className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
            <h2 className="text-base font-black font-headline text-on-surface mb-3">Recent Activity</h2>
            {data && data.activity.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar">
                {data.activity.map((a, i) => {
                  const m = ACTIVITY_META[a.type];
                  const verb = a.type === 'completion' ? 'completed' : a.type === 'doubt' ? 'asked about' : 'generated';
                  return (
                    <div key={i} className="flex items-start gap-3 animate-fade-in">
                      <span className={`material-symbols-outlined text-lg ${m.color} mt-0.5`}>{m.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-on-surface leading-snug">
                          {a.student && <span className="font-bold">{a.student} </span>}
                          <span className="text-on-surface-variant">{verb} </span>
                          <span className="font-semibold">{a.detail}</span>
                        </p>
                        <p className="text-[10px] text-outline mt-0.5">{a.subject ? `${a.subject} · ` : ''}{relTime(a.at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="history" title="No recent activity" className="py-8" />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
