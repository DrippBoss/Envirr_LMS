import { useEffect, useState, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../EmptyState';
import Skeleton from '../Skeleton';

interface Assignment {
  id: number; title: string; description: string; subject: string;
  class_grade: string; board: string; due_date: string | null; max_marks: number;
  submission_count: number; graded_count: number; created_at: string;
}
interface Submission {
  id: number; student_name: string; student_username: string; note: string;
  submission_file: string | null; status: string; marks: number | null;
  feedback: string; submitted_at: string;
}

const inputCls = "w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-outline";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No due date';

export default function TeacherAssignments() {
  const { success, error: toastError } = useToast();
  const [view, setView] = useState<'list' | 'create' | 'submissions'>('list');
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Assignment | null>(null);

  // Create form
  const [form, setForm] = useState({ title: '', description: '', subject: 'Mathematics', class_grade: '10', board: 'CBSE', due_date: '', max_marks: 20, section: '' });
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<{ id: number; name: string; class_grade: string }[]>([]);

  useEffect(() => { api.get('/teacher/sections/').then(r => setSections(r.data)).catch(() => {}); }, []);

  const fetchList = useCallback(() => {
    setLoading(true);
    api.get('/teacher/assignments/')
      .then(r => setItems(r.data))
      .catch(() => toastError('Could not load assignments.'))
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toastError('A title is required.'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form, max_marks: Number(form.max_marks) };
      if (!payload.due_date) delete payload.due_date;
      if (!payload.section) delete payload.section; else payload.section = Number(payload.section);
      await api.post('/teacher/assignments/', payload);
      success('Assignment created.');
      setForm({ title: '', description: '', subject: 'Mathematics', class_grade: '10', board: 'CBSE', due_date: '', max_marks: 20, section: '' });
      setView('list');
      fetchList();
    } catch (err: any) {
      toastError(err?.response?.data?.detail || 'Could not create assignment.');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/teacher/assignments/${id}/`);
      setItems(prev => prev.filter(a => a.id !== id));
      success('Assignment deleted.');
    } catch { toastError('Could not delete.'); }
  };

  // ── Submissions / grading sub-view ──
  if (view === 'submissions' && active) {
    return <SubmissionsPanel assignment={active} onBack={() => { setView('list'); fetchList(); }} />;
  }

  // ── Create form ──
  if (view === 'create') {
    return (
      <div className="space-y-5 max-w-2xl">
        <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-xs font-bold text-outline hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span> Back to assignments
        </button>
        <h2 className="text-xl font-black font-headline text-on-surface">New Assignment</h2>
        <form onSubmit={create} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Polynomials worksheet" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Instructions</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What should students do?" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Subject</label>
              <input className={inputCls} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Grade</label>
              <select className={inputCls} value={form.class_grade} onChange={e => setForm(f => ({ ...f, class_grade: e.target.value }))}>
                <option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Max marks</label>
              <input type="number" min={0} className={inputCls} value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: Number(e.target.value) }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Due date</label>
              <input type="datetime-local" className={inputCls} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Target</label>
            <select className={inputCls} value={form.section}
              onChange={e => {
                const sid = e.target.value;
                const sec = sections.find(s => String(s.id) === sid);
                setForm(f => ({ ...f, section: sid, class_grade: sec ? sec.class_grade : f.class_grade }));
              }}>
              <option value="">Whole grade {form.class_grade}</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Grade {s.class_grade})</option>)}
            </select>
            <p className="text-[10px] text-outline">Pick a class to assign only its members, or leave on the whole grade.</p>
          </div>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95 disabled:opacity-60">
            <span className="material-symbols-outlined text-lg">add_task</span>
            {saving ? 'Creating…' : 'Create Assignment'}
          </button>
        </form>
      </div>
    );
  }

  // ── List ──
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className={labelCls}>Coursework</p>
          <h2 className="text-xl font-black font-headline text-on-surface">Assignments</h2>
        </div>
        <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95">
          <span className="material-symbols-outlined text-lg">add</span> New
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon="assignment" title="No assignments yet"
          message="Create your first assignment to share coursework with a class."
          action={<button onClick={() => setView('create')} className="btn-primary text-sm">New Assignment</button>} />
      ) : (
        <div className="space-y-3">
          {items.map(a => {
            const overdue = a.due_date && new Date(a.due_date) < new Date();
            return (
              <div key={a.id} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 animate-fade-in-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-on-surface truncate">{a.title}</h3>
                    <p className="text-[11px] text-outline mt-0.5">{a.subject || '—'} · Grade {a.class_grade}{a.board ? ` · ${a.board}` : ''} · {a.max_marks} marks</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${overdue ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>
                    {overdue ? 'Overdue' : 'Open'}
                  </span>
                </div>
                {a.description && <p className="text-sm text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">{a.description}</p>}
                <div className="flex items-center gap-4 mt-3 text-xs text-outline">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">event</span>{fmtDate(a.due_date)}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">inbox</span>{a.submission_count} submitted</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">grading</span>{a.graded_count} graded</span>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant/10">
                  <button onClick={() => { setActive(a); setView('submissions'); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all">
                    <span className="material-symbols-outlined text-sm">grading</span> Submissions
                  </button>
                  <button onClick={() => remove(a.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-outline text-xs font-bold hover:text-error transition-all ml-auto">
                    <span className="material-symbols-outlined text-sm">delete</span> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Submissions + grading ──
function SubmissionsPanel({ assignment, onBack }: { assignment: Assignment; onBack: () => void }) {
  const { success, error: toastError } = useToast();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, { marks: string; feedback: string }>>({});

  useEffect(() => {
    api.get(`/teacher/assignments/${assignment.id}/submissions/`)
      .then(r => {
        setSubs(r.data);
        const d: Record<number, { marks: string; feedback: string }> = {};
        r.data.forEach((s: Submission) => { d[s.id] = { marks: s.marks?.toString() ?? '', feedback: s.feedback ?? '' }; });
        setDrafts(d);
      })
      .catch(() => toastError('Could not load submissions.'))
      .finally(() => setLoading(false));
  }, [assignment.id, toastError]);

  const grade = async (id: number) => {
    const d = drafts[id];
    try {
      const r = await api.post(`/teacher/submissions/${id}/grade/`, { marks: d.marks, feedback: d.feedback });
      setSubs(prev => prev.map(s => s.id === id ? r.data : s));
      success('Graded.');
    } catch { toastError('Could not save grade.'); }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-outline hover:text-on-surface transition-colors">
        <span className="material-symbols-outlined text-base">arrow_back</span> Back to assignments
      </button>
      <div>
        <p className={labelCls}>Submissions · {assignment.max_marks} marks</p>
        <h2 className="text-xl font-black font-headline text-on-surface">{assignment.title}</h2>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : subs.length === 0 ? (
        <EmptyState icon="inbox" title="No submissions yet" message="Submissions from students will appear here for grading." />
      ) : (
        <div className="space-y-3">
          {subs.map(s => (
            <div key={s.id} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-black text-on-surface">{s.student_name}</p>
                  <p className="text-[10px] text-outline">Submitted {new Date(s.submitted_at).toLocaleString()}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${s.status === 'GRADED' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>{s.status}</span>
              </div>
              {s.note && <p className="text-sm text-on-surface-variant italic mb-2">“{s.note}”</p>}
              {s.submission_file && (
                <a href={s.submission_file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-3">
                  <span className="material-symbols-outlined text-sm">attach_file</span> View attachment
                </a>
              )}
              <div className="flex items-end gap-2 mt-2">
                <div className="flex flex-col gap-1 w-24">
                  <label className={labelCls}>Marks</label>
                  <input type="number" min={0} max={assignment.max_marks} className={inputCls}
                    value={drafts[s.id]?.marks ?? ''} onChange={e => setDrafts(d => ({ ...d, [s.id]: { ...d[s.id], marks: e.target.value } }))} />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className={labelCls}>Feedback</label>
                  <input className={inputCls} value={drafts[s.id]?.feedback ?? ''} onChange={e => setDrafts(d => ({ ...d, [s.id]: { ...d[s.id], feedback: e.target.value } }))} placeholder="Optional note to student" />
                </div>
                <button onClick={() => grade(s.id)} className="px-4 py-3 rounded-xl bg-secondary text-on-secondary text-sm font-bold hover:brightness-110 transition-all active:scale-95">
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
