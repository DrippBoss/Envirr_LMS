import { useEffect, useState, useCallback } from 'react';
import { api } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

interface Assignment {
  id: number; title: string; description: string; subject: string;
  class_grade: string; due_date: string | null; max_marks: number;
  created_by_name: string; my_status: string; my_marks: number | null;
}
interface AgendaItem { type: string; event_type: string; title: string; subject: string; at: string; }

const STATUS_META: Record<string, { label: string; chip: string }> = {
  PENDING:   { label: 'To do',     chip: 'bg-tertiary/10 text-tertiary' },
  SUBMITTED: { label: 'Submitted', chip: 'bg-primary/10 text-primary' },
  GRADED:    { label: 'Graded',    chip: 'bg-secondary/10 text-secondary' },
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No due date';

export default function StudentAssignmentsPage() {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<Assignment[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/student/assignments/').then(r => setItems(r.data)),
      api.get('/student/agenda/').then(r => setAgenda(r.data)).catch(() => {}),
    ])
      .catch(() => toastError('Could not load assignments.'))
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const submit = async (id: number) => {
    setSubmitting(true);
    try {
      let payload: any = { note };
      let config: any = undefined;
      if (file) {
        const fd = new FormData();
        fd.append('note', note);
        fd.append('submission_file', file);
        payload = fd;
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      }
      await api.post(`/student/assignments/${id}/submit/`, payload, config);
      success('Submitted!');
      setOpenId(null); setNote(''); setFile(null);
      fetchAll();
    } catch {
      toastError('Could not submit. Try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 lg:pb-16">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black font-headline text-on-surface tracking-tight">Assignments</h1>
          <p className="text-outline text-sm mt-1">Coursework from your teachers and what's coming up.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Assignments */}
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)
            ) : items.length === 0 ? (
              <EmptyState icon="assignment_turned_in" title="No assignments"
                message="When your teacher sets coursework, it'll show up here." />
            ) : (
              items.map(a => {
                const m = STATUS_META[a.my_status] || STATUS_META.PENDING;
                const overdue = a.due_date && new Date(a.due_date) < new Date() && a.my_status === 'PENDING';
                return (
                  <div key={a.id} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 animate-fade-in-up">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-on-surface truncate">{a.title}</h3>
                        <p className="text-[11px] text-outline mt-0.5">{a.subject || '—'} · by {a.created_by_name} · {a.max_marks} marks</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${m.chip}`}>{m.label}</span>
                    </div>
                    {a.description && <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{a.description}</p>}
                    <div className={`flex items-center gap-1 mt-3 text-xs ${overdue ? 'text-error font-bold' : 'text-outline'}`}>
                      <span className="material-symbols-outlined text-sm">event</span>{fmtDate(a.due_date)}{overdue ? ' · overdue' : ''}
                    </div>

                    {a.my_status === 'GRADED' ? (
                      <div className="mt-3 pt-3 border-t border-outline-variant/10 flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>grading</span>
                        <span className="text-sm font-black text-on-surface">{a.my_marks ?? '—'} / {a.max_marks}</span>
                      </div>
                    ) : openId === a.id ? (
                      <div className="mt-3 pt-3 border-t border-outline-variant/10 space-y-2">
                        <textarea className="w-full bg-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface border border-outline-variant/15 focus:outline-none focus:border-primary/50 resize-none" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)…" />
                        <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-outline file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-surface-container-highest file:text-on-surface file:text-xs file:font-bold" />
                        <div className="flex gap-2">
                          <button disabled={submitting} onClick={() => submit(a.id)} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:brightness-110 transition-all disabled:opacity-60">
                            {submitting ? 'Submitting…' : 'Submit'}
                          </button>
                          <button onClick={() => { setOpenId(null); setNote(''); setFile(null); }} className="px-4 py-2 rounded-lg text-outline text-xs font-bold hover:text-on-surface transition-all">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setOpenId(a.id); setNote(''); setFile(null); }}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all">
                        <span className="material-symbols-outlined text-sm">upload</span>
                        {a.my_status === 'SUBMITTED' ? 'Update submission' : 'Submit work'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Upcoming agenda */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
            <h2 className="text-base font-black font-headline text-on-surface mb-3">Upcoming</h2>
            {loading ? (
              <Skeleton className="h-40" />
            ) : agenda.length === 0 ? (
              <p className="text-outline text-xs py-6 text-center">Nothing scheduled yet.</p>
            ) : (
              <div className="space-y-3">
                {agenda.map((it, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-lg text-primary mt-0.5">
                      {it.event_type === 'EXAM' ? 'quiz' : it.event_type === 'DEADLINE' ? 'flag' : 'event'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface leading-snug">{it.title}</p>
                      <p className="text-[10px] text-outline mt-0.5">{it.subject ? `${it.subject} · ` : ''}{fmtDate(it.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
