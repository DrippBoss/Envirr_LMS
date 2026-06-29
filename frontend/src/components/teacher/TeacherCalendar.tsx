import { useEffect, useState, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface CalEvent {
  id: number; title: string; description: string; event_type: string;
  start: string; end: string | null; all_day: boolean;
  subject: string; class_grade: string;
}

const TYPE_META: Record<string, { label: string; dot: string; chip: string }> = {
  CLASS:    { label: 'Class',    dot: 'bg-primary',   chip: 'bg-primary/10 text-primary' },
  EXAM:     { label: 'Exam',     dot: 'bg-error',     chip: 'bg-error/10 text-error' },
  DEADLINE: { label: 'Deadline', dot: 'bg-tertiary',  chip: 'bg-tertiary/10 text-tertiary' },
  REMINDER: { label: 'Reminder', dot: 'bg-secondary', chip: 'bg-secondary/10 text-secondary' },
  OTHER:    { label: 'Other',    dot: 'bg-outline',   chip: 'bg-surface-container-highest text-on-surface-variant' },
};

const inputCls = "w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-outline";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function TeacherCalendar() {
  const { success, error: toastError } = useToast();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const blankForm = { title: '', description: '', event_type: 'CLASS', start: '', end: '', subject: '', class_grade: '', section: '' };
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<{ id: number; name: string; class_grade: string }[]>([]);

  useEffect(() => { api.get('/teacher/sections/').then(r => setSections(r.data)).catch(() => {}); }, []);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const fetchEvents = useCallback(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString();
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0).toISOString();
    api.get(`/teacher/calendar/?from=${from}&to=${to}`)
      .then(r => setEvents(r.data))
      .catch(() => toastError('Could not load calendar.'));
  }, [cursor, toastError]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Build the month grid (Mon-first, 6 weeks).
  const grid: Date[] = (() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  })();

  const eventsOn = (d: Date) => events.filter(e => sameDay(new Date(e.start), d));
  const selectedEvents = eventsOn(selected).sort((a, b) => a.start.localeCompare(b.start));

  const openCreate = (day: Date) => {
    const at = new Date(day); at.setHours(9, 0, 0, 0);
    setForm({ ...blankForm, start: toLocalInput(at) });
    setShowForm(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start) { toastError('Title and start time are required.'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.end) delete payload.end;
      if (!payload.section) delete payload.section; else payload.section = Number(payload.section);
      await api.post('/teacher/calendar/', payload);
      success('Event added.');
      setShowForm(false);
      setForm(blankForm);
      fetchEvents();
    } catch (err: any) {
      toastError(err?.response?.data?.detail || 'Could not add event.');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/teacher/calendar/${id}/`);
      setEvents(prev => prev.filter(e => e.id !== id));
      success('Event removed.');
    } catch { toastError('Could not remove event.'); }
  };

  const shiftMonth = (n: number) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const today = new Date();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className={labelCls}>Schedule</p>
          <h2 className="text-xl font-black font-headline text-on-surface">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors" aria-label="Previous month">
            <span className="material-symbols-outlined text-lg text-on-surface-variant">chevron_left</span>
          </button>
          <button onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(new Date()); }} className="px-3 h-9 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-bold text-on-surface-variant transition-colors">Today</button>
          <button onClick={() => shiftMonth(1)} className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-colors" aria-label="Next month">
            <span className="material-symbols-outlined text-lg text-on-surface-variant">chevron_right</span>
          </button>
          <button onClick={() => openCreate(selected)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95">
            <span className="material-symbols-outlined text-lg">add</span> New Event
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Month grid */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-3">
          <div className="grid grid-cols-7 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-wider text-outline py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const isSel = sameDay(d, selected);
              const dayEvents = eventsOn(d);
              return (
                <button key={i} onClick={() => setSelected(new Date(d))}
                  className={`min-h-[64px] rounded-lg p-1.5 text-left flex flex-col gap-1 transition-all border ${
                    isSel ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-surface-container-high'
                  } ${inMonth ? '' : 'opacity-40'}`}>
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-on-primary' : 'text-on-surface'}`}>{d.getDate()}</span>
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 4).map(e => (
                      <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_META[e.event_type]?.dot || 'bg-outline'}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day panel */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-on-surface">{selected.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
            <button onClick={() => openCreate(selected)} className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">add</span> Add
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-outline text-xs py-6 text-center">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(e => {
                const m = TYPE_META[e.event_type] || TYPE_META.OTHER;
                return (
                  <div key={e.id} className="group bg-surface-container-low rounded-xl p-3 border border-outline-variant/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{e.title}</p>
                        <p className="text-[10px] text-outline mt-0.5">
                          {new Date(e.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          {e.subject ? ` · ${e.subject}` : ''}{e.class_grade ? ` · Grade ${e.class_grade}` : ''}
                        </p>
                      </div>
                      <button onClick={() => remove(e.id)} className="material-symbols-outlined text-base text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete">delete</button>
                    </div>
                    <span className={`inline-block mt-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${m.chip}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={create}
            className="bg-surface-container-low rounded-2xl border border-outline-variant/15 p-6 w-full max-w-md space-y-4 animate-scale-in">
            <h3 className="text-lg font-black font-headline text-on-surface">New Event</h3>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Title</label>
              <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Algebra revision class" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Type</label>
                <select className={inputCls} value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Grade (optional)</label>
                <select className={inputCls} value={form.class_grade} onChange={e => setForm(f => ({ ...f, class_grade: e.target.value }))}>
                  <option value="">All</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
                </select>
              </div>
            </div>
            {sections.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Target class (optional)</label>
                <select className={inputCls} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                  <option value="">No specific class</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name} (Grade {s.class_grade})</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Start</label>
                <input type="datetime-local" className={inputCls} value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>End (optional)</label>
                <input type="datetime-local" className={inputCls} value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Subject (optional)</label>
              <input className={inputCls} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Mathematics" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all active:scale-95 disabled:opacity-60">
                {saving ? 'Adding…' : 'Add Event'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-3 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-all">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
