import { useState } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../EmptyState';

interface TimelineItem { phase: string; minutes: number; activity: string; }
interface LessonPlan {
  title: string; summary: string; objectives: string[]; materials: string[];
  timeline: TimelineItem[]; key_concepts: string[]; assessment: string[]; homework: string[];
}

const inputCls = "w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-outline";

function List({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
        <h3 className="text-sm font-black text-on-surface">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant leading-relaxed">
            <span className="material-symbols-outlined text-secondary text-base mt-0.5 shrink-0">check_circle</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TeacherLessonPlanner() {
  const { error: toastError, success } = useToast();
  const [subject, setSubject] = useState('Mathematics');
  const [grade, setGrade] = useState('10');
  const [board, setBoard] = useState('CBSE');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) { toastError('Enter a topic to plan.'); return; }
    setLoading(true);
    setPlan(null);
    try {
      const res = await api.post('/ai/lesson-planner/', {
        subject, grade, board, topic: topic.trim(), duration_mins: duration, notes: notes.trim(),
      });
      setPlan(res.data.plan);
      success('Lesson plan ready.');
    } catch (err: any) {
      toastError(err?.response?.data?.error || 'Could not generate the plan. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">AI-Powered</p>
        <h1 className="text-xl font-black font-headline text-on-surface">Lesson Planner</h1>
        <p className="text-outline text-xs mt-1">Generate a structured, classroom-ready plan for any topic in seconds.</p>
      </div>

      {/* Form */}
      <form onSubmit={generate} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Board</label>
            <select className={inputCls} value={board} onChange={e => setBoard(e.target.value)}>
              <option>CBSE</option><option>ICSE</option><option>IB Curriculum</option><option>IGCSE</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Grade</label>
            <select className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}>
              <option value="9">Grade 9</option><option value="10">Grade 10</option>
              <option value="11">Grade 11</option><option value="12">Grade 12</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Subject</label>
            <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Mathematics" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Class length</label>
            <select className={inputCls} value={duration} onChange={e => setDuration(Number(e.target.value))}>
              <option value={30}>30 min</option><option value={45}>45 min</option>
              <option value={60}>60 min</option><option value={90}>90 min</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Topic</label>
          <input className={inputCls} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Quadratic Equations — completing the square" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Notes (optional)</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any focus, prior knowledge, or constraints…" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95 disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'auto_awesome'}</span>
          {loading ? 'Planning…' : 'Generate Lesson Plan'}
        </button>
      </form>

      {/* Result */}
      {loading && (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-10 flex flex-col items-center justify-center text-center animate-fade-in">
          <span className="material-symbols-outlined text-4xl text-primary animate-pulse mb-3">neurology</span>
          <p className="text-sm font-bold text-on-surface">Designing your lesson…</p>
          <p className="text-xs text-outline mt-1">Structuring objectives, timeline and assessment.</p>
        </div>
      )}

      {!loading && plan && (
        <div className="space-y-5 animate-fade-in-up">
          <div className="bg-surface-container rounded-2xl border border-primary/20 p-6">
            <h2 className="text-lg font-black font-headline text-on-surface">{plan.title}</h2>
            {plan.summary && <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{plan.summary}</p>}
          </div>

          <List icon="flag" title="Learning Objectives" items={plan.objectives} />

          {plan.timeline?.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                <h3 className="text-sm font-black text-on-surface">Lesson Timeline</h3>
              </div>
              <div className="space-y-3">
                {plan.timeline.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-12 text-center">
                        <span className="text-xs font-black text-primary">{t.minutes}'</span>
                      </div>
                      {i < plan.timeline.length - 1 && <div className="w-px flex-1 bg-outline-variant/20 mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-bold text-on-surface">{t.phase}</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">{t.activity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <List icon="lightbulb" title="Key Concepts" items={plan.key_concepts} />
            <List icon="inventory_2" title="Materials" items={plan.materials} />
            <List icon="quiz" title="Assessment" items={plan.assessment} />
            <List icon="home_work" title="Homework" items={plan.homework} />
          </div>
        </div>
      )}

      {!loading && !plan && (
        <EmptyState icon="edit_calendar" title="No plan yet"
          message="Fill in a topic above and generate a structured lesson plan." />
      )}
    </div>
  );
}
