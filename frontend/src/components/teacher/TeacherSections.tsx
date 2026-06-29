import { useEffect, useState, useCallback } from 'react';
import { api } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../EmptyState';
import Skeleton from '../Skeleton';

interface Section { id: number; name: string; class_grade: string; subject: string; board: string; join_code: string; member_count: number; }
interface Member { id: number; name: string; username: string; joined_at: string; }
interface StudentHit { id: number; name: string; username: string; class_grade: string; }

const inputCls = "w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors";
const labelCls = "text-[10px] font-black uppercase tracking-widest text-outline";

export default function TeacherSections() {
  const { success, error: toastError } = useToast();
  const [view, setView] = useState<'list' | 'create' | 'manage'>('list');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Section | null>(null);
  const [form, setForm] = useState({ name: '', class_grade: '10', subject: '', board: 'CBSE' });
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(() => {
    setLoading(true);
    api.get('/teacher/sections/').then(r => setSections(r.data))
      .catch(() => toastError('Could not load sections.'))
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toastError('A class name is required.'); return; }
    setSaving(true);
    try {
      await api.post('/teacher/sections/', form);
      success('Class created.');
      setForm({ name: '', class_grade: '10', subject: '', board: 'CBSE' });
      setView('list'); fetchList();
    } catch { toastError('Could not create class.'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    try { await api.delete(`/teacher/sections/${id}/`); setSections(p => p.filter(s => s.id !== id)); success('Class deleted.'); }
    catch { toastError('Could not delete.'); }
  };

  if (view === 'manage' && active) {
    return <ManagePanel section={active} onBack={() => { setView('list'); fetchList(); }} />;
  }

  if (view === 'create') {
    return (
      <div className="space-y-5 max-w-xl">
        <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-xs font-bold text-outline hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span> Back to classes
        </button>
        <h2 className="text-xl font-black font-headline text-on-surface">New Class</h2>
        <form onSubmit={create} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Class name</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 10-A Mathematics" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Grade</label>
              <select className={inputCls} value={form.class_grade} onChange={e => setForm(f => ({ ...f, class_grade: e.target.value }))}>
                <option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Subject</label>
              <input className={inputCls} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Board</label>
              <select className={inputCls} value={form.board} onChange={e => setForm(f => ({ ...f, board: e.target.value }))}>
                <option>CBSE</option><option>ICSE</option><option>State</option><option>Other</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95 disabled:opacity-60">
            <span className="material-symbols-outlined text-lg">group_add</span>{saving ? 'Creating…' : 'Create Class'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className={labelCls}>Roster</p>
          <h2 className="text-xl font-black font-headline text-on-surface">Classes</h2>
        </div>
        <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95">
          <span className="material-symbols-outlined text-lg">add</span> New
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">{[1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : sections.length === 0 ? (
        <EmptyState icon="groups" title="No classes yet"
          message="Create a class to group students and target assignments at named members."
          action={<button onClick={() => setView('create')} className="btn-primary text-sm">New Class</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {sections.map(s => (
            <div key={s.id} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 animate-fade-in-up">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base font-black text-on-surface truncate">{s.name}</h3>
                  <p className="text-[11px] text-outline mt-0.5">Grade {s.class_grade}{s.subject ? ` · ${s.subject}` : ''}{s.board ? ` · ${s.board}` : ''}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-black text-primary shrink-0">
                  <span className="material-symbols-outlined text-base">person</span>{s.member_count}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-outline">Join code</span>
                <code className="text-xs font-black text-on-surface bg-surface-container-highest px-2 py-0.5 rounded-lg tracking-widest">{s.join_code}</code>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant/10">
                <button onClick={() => { setActive(s); setView('manage'); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all">
                  <span className="material-symbols-outlined text-sm">manage_accounts</span> Manage
                </button>
                <button onClick={() => remove(s.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-outline text-xs font-bold hover:text-error transition-all ml-auto">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManagePanel({ section, onBack }: { section: Section; onBack: () => void }) {
  const { success, error: toastError } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(() => {
    api.get(`/teacher/sections/${section.id}/`)
      .then(r => setMembers(r.data.members || []))
      .catch(() => toastError('Could not load members.'))
      .finally(() => setLoading(false));
  }, [section.id, toastError]);

  useEffect(() => { refresh(); }, [refresh]);

  const search = async () => {
    setSearching(true);
    try {
      const r = await api.get(`/teacher/students/?grade=${section.class_grade}&q=${encodeURIComponent(q)}`);
      setHits(r.data);
    } catch { toastError('Search failed.'); }
    finally { setSearching(false); }
  };

  const add = async (student_id: number) => {
    try {
      const r = await api.post(`/teacher/sections/${section.id}/members/`, { student_id });
      setMembers(r.data);
      setHits(h => h.filter(x => x.id !== student_id));
      success('Student added.');
    } catch { toastError('Could not add student.'); }
  };

  const removeMember = async (id: number) => {
    try { await api.delete(`/teacher/sections/${section.id}/members/${id}/`); setMembers(m => m.filter(x => x.id !== id)); }
    catch { toastError('Could not remove.'); }
  };

  const memberIds = new Set(members.map(m => m.id));

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-outline hover:text-on-surface transition-colors">
        <span className="material-symbols-outlined text-base">arrow_back</span> Back to classes
      </button>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className={labelCls}>Grade {section.class_grade}{section.subject ? ` · ${section.subject}` : ''}</p>
          <h2 className="text-xl font-black font-headline text-on-surface">{section.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline">Join code</span>
          <code className="text-sm font-black text-on-surface bg-surface-container-highest px-3 py-1 rounded-lg tracking-widest">{section.join_code}</code>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Members */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
          <h3 className="text-sm font-black text-on-surface mb-3">Members ({members.length})</h3>
          {loading ? <Skeleton className="h-24" /> : members.length === 0 ? (
            <p className="text-outline text-xs py-6 text-center">No students yet. Add them from the right, or share the join code.</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-black text-xs">{m.name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface truncate">{m.name}</p>
                    <p className="text-[10px] text-outline">@{m.username}</p>
                  </div>
                  <button onClick={() => removeMember(m.id)} className="material-symbols-outlined text-base text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove">person_remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add students */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
          <h3 className="text-sm font-black text-on-surface mb-3">Add students</h3>
          <div className="flex gap-2 mb-3">
            <input className={inputCls} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder={`Search grade ${section.class_grade} students…`} />
            <button onClick={search} disabled={searching} className="px-4 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all disabled:opacity-60">
              <span className="material-symbols-outlined text-lg">search</span>
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
            {hits.length === 0 ? (
              <p className="text-outline text-xs py-6 text-center">Search to find students by name or username.</p>
            ) : hits.map(h => (
              <div key={h.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-on-surface truncate">{h.name}</p>
                  <p className="text-[10px] text-outline">@{h.username} · Grade {h.class_grade}</p>
                </div>
                {memberIds.has(h.id) ? (
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Added</span>
                ) : (
                  <button onClick={() => add(h.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:brightness-110 transition-all">
                    <span className="material-symbols-outlined text-sm">add</span> Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
