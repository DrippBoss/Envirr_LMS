import { useState, useEffect, useCallback, useRef } from 'react';
import { api, useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MCQOption {
  id: number;
  option_label: string;
  option_text: string;
  is_correct: boolean;
  order: number;
}

interface Question {
  id: number;
  subject: string;
  chapter: string;
  concept: string;
  question_type: string;
  difficulty: string;
  marks: number;
  bloom_level: string;
  question_text: string;
  answer_text: string;
  has_image: boolean;
  image_url: string | null;
  image_description: string;
  is_verified: boolean;
  is_ai_generated: boolean;
  times_used: number;
  options: MCQOption[];
  case_parts: any[];
}

interface ListResponse {
  count: number;
  page: number;
  page_size: number;
  results: Question[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const Q_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'MCQ', label: 'MCQ' },
  { value: 'ASSERTION_REASON', label: 'Assertion & Reason' },
  { value: 'VERY_SHORT', label: 'Very Short' },
  { value: 'SHORT', label: 'Short Answer' },
  { value: 'LONG', label: 'Long Answer' },
  { value: 'CASE', label: 'Case Study' },
  { value: 'REARRANGE', label: 'Rearrange' },
];

const BLOOM_LEVELS = ['', 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const TYPE_PILL: Record<string, string> = {
  MCQ:              'bg-primary/10   text-primary   border-primary/25',
  ASSERTION_REASON: 'bg-secondary/10 text-secondary border-secondary/25',
  VERY_SHORT:       'bg-tertiary/10  text-tertiary  border-tertiary/25',
  SHORT:            'bg-tertiary/10  text-tertiary  border-tertiary/25',
  LONG:             'bg-outline/10   text-outline   border-outline-variant/25',
  CASE:             'bg-error/10     text-error     border-error/25',
  REARRANGE:        'bg-outline/10   text-outline   border-outline-variant/25',
};

const DIFF_PILL: Record<string, string> = {
  easy:   'bg-secondary/10 text-secondary border-secondary/25',
  medium: 'bg-tertiary/10  text-tertiary  border-tertiary/25',
  hard:   'bg-error/10     text-error     border-error/25',
};

const pill = (extra: string) =>
  `text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${extra}`;

const inputCls =
  'w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/40 transition-colors';

// ─── Single question card ─────────────────────────────────────────────────────
function QuestionCard({
  question: initialQ,
  isAdmin,
  onUpdated,
  onDeleted,
}: {
  question: Question;
  isAdmin: boolean;
  onUpdated: (q: Question) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing]         = useState(false);
  const [q, setQ]                     = useState(initialQ);

  // edit-mode state
  const [qText, setQText]             = useState(q.question_text);
  const [aText, setAText]             = useState(q.answer_text);
  const [difficulty, setDifficulty]   = useState(q.difficulty);
  const [marks, setMarks]             = useState(q.marks);
  const [bloom, setBloom]             = useState(q.bloom_level || '');
  const [imgDesc, setImgDesc]         = useState(q.image_description || '');
  const [options, setOptions]         = useState<MCQOption[]>(q.options.map(o => ({ ...o })));
  const [newFile, setNewFile]         = useState<File | null>(null);
  const [removeImg, setRemoveImg]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveOk, setSaveOk]           = useState(false);
  const [err, setErr]                 = useState('');
  const [confirmDel, setConfirmDel]   = useState(false);
  const [deleting, setDeleting]       = useState(false);

  const isMCQ = ['MCQ', 'ASSERTION_REASON'].includes(q.question_type);
  const previewUrl = newFile ? URL.createObjectURL(newFile) : removeImg ? null : q.image_url;

  const startEdit = () => {
    setQText(q.question_text);
    setAText(q.answer_text);
    setDifficulty(q.difficulty);
    setMarks(q.marks);
    setBloom(q.bloom_level || '');
    setImgDesc(q.image_description || '');
    setOptions(q.options.map(o => ({ ...o })));
    setNewFile(null);
    setRemoveImg(false);
    setErr('');
    setSaveOk(false);
    setConfirmDel(false);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setErr(''); };

  const save = async () => {
    setSaving(true); setErr(''); setSaveOk(false);
    try {
      const fd = new FormData();
      fd.append('question_text',   qText);
      fd.append('answer_text',     aText);
      fd.append('difficulty',      difficulty);
      fd.append('marks',           String(marks));
      fd.append('bloom_level',     bloom);
      fd.append('image_description', imgDesc);
      if (removeImg)  fd.append('remove_image', 'true');
      if (newFile)    fd.append('image', newFile);

      const patchRes = await api.patch(`/ai/questions/${q.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      let updated: Question = patchRes.data;

      if (isMCQ && options.length > 0) {
        const optRes = await api.put(`/ai/questions/${q.id}/options/`, { options });
        updated = { ...updated, options: optRes.data };
      }

      setQ(updated);
      onUpdated(updated);
      setNewFile(null); setRemoveImg(false);
      setSaveOk(true);
      setEditing(false);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.response?.data?.error ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/ai/questions/${q.id}/`);
      onDeleted(q.id);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Delete failed.');
      setDeleting(false); setConfirmDel(false);
    }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      editing
        ? 'border-primary/30 bg-surface-container shadow-lg shadow-primary/5'
        : 'border-outline-variant/10 bg-surface-container'
    }`}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-outline">#{q.id}</span>
            <span className={pill(TYPE_PILL[q.question_type] ?? 'text-outline bg-surface-container border-outline-variant/20')}>
              {q.question_type.replace('_', ' ')}
            </span>
            <span className={pill(DIFF_PILL[q.difficulty] ?? 'text-outline bg-surface-container border-outline-variant/20')}>
              {q.difficulty}
            </span>
            <span className="text-[10px] text-on-surface-variant font-bold">{q.marks}m</span>
            {q.is_ai_generated && <span className={pill('bg-secondary/10 text-secondary border-secondary/20')}>AI</span>}
            {q.is_verified && (
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }} title="Verified">verified</span>
            )}
            {saveOk && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Saved
              </span>
            )}
          </div>
          <p className="text-[11px] text-outline truncate">
            {q.subject} · {q.chapter}{q.concept ? ` · ${q.concept}` : ''}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!editing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit
            </button>
          ) : (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-outline hover:text-on-surface transition-all"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-outline-variant/10 mx-5" />

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-5">

        {/* Error banner */}
        {err && (
          <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            {err}
          </div>
        )}

        {/* ── QUESTION TEXT ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Question</p>
          {editing ? (
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              value={qText}
              onChange={e => setQText(e.target.value)}
            />
          ) : (
            <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
          )}
        </div>

        {/* ── DIAGRAM ── */}
        {(q.has_image || editing) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Diagram</p>
            <div className="rounded-xl border border-outline-variant/15 overflow-hidden bg-surface-container-low">
              {/* Image display — always shown large */}
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={q.image_description || 'Question diagram'}
                  className="w-full max-h-80 object-contain p-3 bg-surface-container-lowest"
                />
              ) : (
                editing && (
                  <div className="flex flex-col items-center justify-center py-8 text-outline gap-2">
                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    <p className="text-xs">No diagram — upload one below</p>
                  </div>
                )
              )}

              {/* Edit controls */}
              {editing && (
                <div className="px-4 py-3 border-t border-outline-variant/10 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:border-primary/30 hover:text-primary cursor-pointer transition-all">
                      <span className="material-symbols-outlined text-base">upload</span>
                      {newFile ? newFile.name : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { setNewFile(e.target.files?.[0] ?? null); setRemoveImg(false); }}
                      />
                    </label>
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={() => { setRemoveImg(true); setNewFile(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-error/20 text-error text-xs font-bold hover:bg-error/10 transition-all"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    className={`${inputCls} text-xs py-2`}
                    placeholder="Alt text / figure description…"
                    value={imgDesc}
                    onChange={e => setImgDesc(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MCQ OPTIONS ── */}
        {isMCQ && (q.options.length > 0 || (editing && options.length > 0)) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Options</p>
            <div className="space-y-2">
              {(editing ? options : q.options).map((opt, idx) => (
                <div
                  key={opt.id ?? idx}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    opt.is_correct
                      ? 'border-secondary/35 bg-secondary/10'
                      : 'border-outline-variant/15 bg-surface-container-highest'
                  }`}
                >
                  {/* Label */}
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    opt.is_correct ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-outline'
                  }`}>
                    {opt.option_label}
                  </span>

                  {/* Text */}
                  {editing ? (
                    <input
                      className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none min-w-0"
                      value={opt.option_text}
                      onChange={e => setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, option_text: e.target.value } : o))}
                      placeholder={`Option ${opt.option_label}`}
                    />
                  ) : (
                    <span className={`flex-1 text-sm ${opt.is_correct ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                      {opt.option_text}
                    </span>
                  )}

                  {/* Correct indicator / toggle */}
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => setOptions(prev => prev.map(o => ({ ...o, is_correct: o.id === opt.id })))}
                      className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border transition-all shrink-0 ${
                        opt.is_correct
                          ? 'bg-secondary/20 text-secondary border-secondary/30'
                          : 'text-outline border-outline-variant/20 hover:text-secondary hover:bg-secondary/10 hover:border-secondary/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: opt.is_correct ? "'FILL' 1" : "'FILL' 0" }}>
                        check_circle
                      </span>
                      {opt.is_correct ? 'Correct' : 'Mark'}
                    </button>
                  ) : (
                    opt.is_correct && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-secondary shrink-0">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Correct
                      </span>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ANSWER ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Answer / Explanation</p>
          {editing ? (
            <div className="rounded-xl border border-secondary/25 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 border-b border-secondary/15">
                <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Model Answer</span>
              </div>
              <textarea
                className="w-full bg-transparent px-3 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none resize-none"
                rows={4}
                value={aText}
                onChange={e => setAText(e.target.value)}
                placeholder="Enter the answer or explanation…"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-secondary/20 bg-secondary/5 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-secondary/15">
                <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Model Answer</span>
              </div>
              <p className="px-3 py-3 text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{q.answer_text || '—'}</p>
            </div>
          )}
        </div>

        {/* ── METADATA (edit only) ── */}
        {editing && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Metadata</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-outline font-bold block mb-1">Difficulty</label>
                <select className={inputCls} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-outline font-bold block mb-1">Marks</label>
                <input type="number" min={1} max={20} className={inputCls} value={marks} onChange={e => setMarks(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-[10px] text-outline font-bold block mb-1">Bloom Level</label>
                <select className={inputCls} value={bloom} onChange={e => setBloom(e.target.value)}>
                  {BLOOM_LEVELS.map(l => <option key={l} value={l}>{l || '— None —'}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── SAVE / DELETE (edit only) ── */}
        {editing && (
          <div className="flex items-center gap-3 pt-1 border-t border-outline-variant/10">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-black hover:brightness-110 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">{saving ? 'progress_activity' : 'save'}</span>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>

            {isAdmin && !confirmDel && (
              <button
                onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-error/20 text-error text-sm font-bold hover:bg-error/10 transition-all ml-auto"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete
              </button>
            )}
            {isAdmin && confirmDel && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-bold text-error">Delete permanently?</span>
                <button
                  onClick={doDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-error text-on-error text-xs font-black hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/20 text-outline text-xs font-bold hover:text-on-surface transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function QuestionEditor({ isAdmin }: { isAdmin: boolean }) {
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [subjects, setSubjects]           = useState<string[]>([]);
  const [chapters, setChapters]           = useState<string[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterChapter, setFilterChapter] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterDiff, setFilterDiff]       = useState('');
  const [searchInput, setSearchInput]     = useState('');
  const [search, setSearch]               = useState('');

  const [listData, setListData]           = useState<ListResponse | null>(null);
  const [page, setPage]                   = useState(1);
  const [loading, setLoading]             = useState(false);

  useEffect(() => {
    api.get('/ai/questions/meta/').then(r => setSubjects(r.data.subjects ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setFilterChapter(''); setChapters([]);
    if (!filterSubject) return;
    api.get(`/ai/questions/meta/?subject=${encodeURIComponent(filterSubject)}`)
      .then(r => setChapters(r.data.chapters ?? [])).catch(() => {});
  }, [filterSubject]);

  const fetchList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), page_size: '20' });
      if (filterSubject) params.set('subject', filterSubject);
      if (filterChapter) params.set('chapter', filterChapter);
      if (filterType)    params.set('type', filterType);
      if (filterDiff)    params.set('difficulty', filterDiff);
      if (search)        params.set('search', search);
      const res = await api.get(`/ai/questions/editor/?${params}`);
      setListData(res.data);
      setPage(p);
    } catch { setListData(null); }
    finally  { setLoading(false); }
  }, [filterSubject, filterChapter, filterType, filterDiff, search]);

  useEffect(() => { fetchList(1); }, [fetchList]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [page]);

  const handleUpdated = (updated: Question) => {
    setListData(prev =>
      prev ? { ...prev, results: prev.results.map(q => q.id === updated.id ? updated : q) } : prev
    );
  };

  const handleDeleted = (id: number) => {
    setListData(prev =>
      prev ? { ...prev, count: prev.count - 1, results: prev.results.filter(q => q.id !== id) } : prev
    );
  };

  const totalPages = listData ? Math.ceil(listData.count / (listData.page_size || 20)) : 0;

  const { user } = useAuth();
  const hasNoSubjects = user?.role === 'teacher' && (!user?.assigned_subjects || user.assigned_subjects.length === 0);

  return (
    <div ref={topRef} className="space-y-5">
      {/* ── Page header ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Question Bank</p>
        <h2 className="text-xl font-black font-headline text-on-surface">Question Editor</h2>
        <p className="text-outline text-xs mt-0.5">Each card shows the full question, diagram, options and answer. Click <strong className="text-on-surface-variant">Edit</strong> on any card to modify it inline.</p>
      </div>

      {hasNoSubjects && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-tertiary/10 border border-tertiary/20 text-tertiary text-sm">
          <span className="material-symbols-outlined text-base shrink-0">info</span>
          <span>No subjects assigned yet — showing all questions. Ask an admin to assign your subjects via the Admin Dashboard → Users → SUBJECTS.</span>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer"
            value={filterSubject}
            onChange={e => { setFilterSubject(e.target.value); setFilterChapter(''); }}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer disabled:opacity-40"
            value={filterChapter}
            onChange={e => setFilterChapter(e.target.value)}
            disabled={!filterSubject}
          >
            <option value="">{filterSubject ? 'All Chapters' : '— Pick subject —'}</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            className="bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            {Q_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select
            className="bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer"
            value={filterDiff}
            onChange={e => setFilterDiff(e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">search</span>
            <input
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50"
              placeholder="Search question text…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput); }}
            />
          </div>

          <button
            onClick={() => setSearch(searchInput)}
            className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
          >
            Search
          </button>

          {(filterSubject || filterChapter || filterType || filterDiff || search) && (
            <button
              onClick={() => { setFilterSubject(''); setFilterChapter(''); setFilterType(''); setFilterDiff(''); setSearch(''); setSearchInput(''); }}
              className="px-3 py-2 rounded-xl border border-outline-variant/20 text-outline hover:text-on-surface text-xs font-bold transition-all"
            >
              Clear
            </button>
          )}

          {listData && (
            <span className="text-[10px] text-outline ml-auto hidden md:block">
              {listData.count} question{listData.count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Question cards ── */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-outline-variant/10 bg-surface-container p-5 space-y-3 animate-pulse">
              <div className="flex gap-2">
                <div className="h-4 w-12 bg-surface-container-high rounded-full" />
                <div className="h-4 w-16 bg-surface-container-high rounded-full" />
              </div>
              <div className="h-4 bg-surface-container-high rounded-full w-full" />
              <div className="h-4 bg-surface-container-high rounded-full w-4/5" />
              <div className="h-4 bg-surface-container-high rounded-full w-3/5" />
              <div className="h-16 bg-surface-container-high rounded-xl" />
            </div>
          ))}
        </div>
      ) : listData?.results.length === 0 ? (
        <div className="bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 p-16 flex flex-col items-center gap-3 text-center">
          <span className="material-symbols-outlined text-4xl text-outline-variant/40">manage_search</span>
          <p className="text-sm font-black text-on-surface">No Questions Found</p>
          <p className="text-xs text-outline">Adjust the filters or clear the search to find questions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listData?.results.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              isAdmin={isAdmin}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            onClick={() => fetchList(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-outline-variant/20 text-outline hover:text-on-surface text-sm font-bold disabled:opacity-40 transition-all"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
            Prev
          </button>
          <span className="text-sm text-outline">
            Page <span className="font-bold text-on-surface">{page}</span> of {totalPages}
          </span>
          <button
            onClick={() => fetchList(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-outline-variant/20 text-outline hover:text-on-surface text-sm font-bold disabled:opacity-40 transition-all"
          >
            Next
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
