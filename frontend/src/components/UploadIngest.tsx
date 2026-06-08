import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../context/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ExtractedQuestion {
  _id: number;
  question_text: string;
  answer_text: string;
  question_type: string;
  marks: number;
  difficulty: string;
  options: { option_text: string; is_correct: boolean }[];
  source: 'doc' | 'ai';
}

interface BuildSection {
  name: string;
  type: string;
  marks: number;
  target: number;
  questions: ExtractedQuestion[];
}

type Step = 'config' | 'extracting' | 'build' | 'compiling' | 'done';

// ─── Constants ─────────────────────────────────────────────────────────────────
const Q_TYPES  = ['MCQ', 'ASSERTION_REASON', 'VERY_SHORT', 'SHORT', 'LONG', 'CASE'];
const Q_LABELS: Record<string, string> = {
  MCQ: 'MCQ', ASSERTION_REASON: 'A&R', VERY_SHORT: 'V.Short',
  SHORT: 'Short', LONG: 'Long', CASE: 'Case',
};
const DEF_MARKS: Record<string, number> = {
  MCQ: 1, ASSERTION_REASON: 1, VERY_SHORT: 2, SHORT: 3, LONG: 5, CASE: 4,
};
const TYPE_COLOR: Record<string, string> = {
  MCQ: 'bg-primary/10 text-primary',
  ASSERTION_REASON: 'bg-secondary/10 text-secondary',
  VERY_SHORT: 'bg-tertiary/10 text-tertiary',
  SHORT: 'bg-[#22c55e]/10 text-[#22c55e]',
  LONG: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  CASE: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
};
const COMPILE_STEPS = ['Saving questions', 'Setting up sections', 'Compiling LaTeX', 'Building PDF'];
const SECTION_LETTERS = 'ABCDEFGHIJ';
const inputCls = "w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors";


// ─── Component ─────────────────────────────────────────────────────────────────
export default function UploadIngest() {
  const [step, setStep] = useState<Step>('config');

  // Config
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  // subject & chapter come from silent auto-detect, never shown to user
  const [subject, setSubject]   = useState('');
  const [chapter, setChapter]   = useState('');
  const [title, setTitle]       = useState('');
  const [grade, setGrade]       = useState('Grade 10');
  const [board, setBoard]       = useState('CBSE');
  const [difficulty, setDiff]   = useState('medium');
  const [count, setCount]       = useState(20);

  // Build
  const [pool, setPool]             = useState<ExtractedQuestion[]>([]);
  const [sections, setSections]     = useState<BuildSection[]>([]);
  const [poolFilter, setPoolFilter] = useState('all');
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [gapFilling, setGapFilling]   = useState<Set<number>>(new Set()); // section indices loading
  const [gapError, setGapError]       = useState('');
  const [docSummary, setDocSummary]   = useState('');

  // Compile/done
  const [compileStep, setCompileStep] = useState(0);
  const [paperId, setPaperId]         = useState<number | null>(null);
  const [pdfUrl, setPdfUrl]           = useState('');
  const [seededCount, setSeededCount] = useState(0);
  const [error, setError]             = useState('');

  const fileRef  = useRef<HTMLInputElement>(null);
  const nextIdRef = useRef(0); // monotonic ID counter for pool questions

  // ── Derived ─────────────────────────────────────────────────────────────────
  const visiblePool = pool.filter(q =>
    !assignedIds.has(q._id) &&
    (poolFilter === 'all' || q.question_type === poolFilter)
  );
  const totalAssigned = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const totalMarks    = sections.reduce((s, sec) => s + sec.questions.length * sec.marks, 0);

  // ── File drop ────────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) setFile(f);
  }, []);

  // ── Silent auto-detect: fires in background whenever file changes ────────────
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const fd = new FormData();
    fd.append('file', file);
    api.post('ai/ingest-upload/detect/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }).then(res => {
      if (cancelled) return;
      const d = res.data;
      if (d.subject)    setSubject(d.subject);
      if (d.chapter)    setChapter(d.chapter);
      if (d.grade)      setGrade(d.grade);
      if (d.board)      setBoard(d.board);
      if (d.difficulty) setDiff(d.difficulty);
    }).catch(() => { /* non-fatal — extraction will use empty defaults */ });
    return () => { cancelled = true; };
  }, [file]);

  // ── Extract full question pool ────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;
    setError(''); setStep('extracting');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('subject', subject || 'General');
    fd.append('chapter', chapter || subject || 'General');
    fd.append('grade', grade);
    fd.append('board', board);
    fd.append('difficulty', difficulty);
    fd.append('count', String(count));
    try {
      const res = await api.post('ai/ingest-upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      nextIdRef.current = 0;
      const qs: ExtractedQuestion[] = (res.data.questions ?? []).map((q: any) => ({
        ...q,
        _id: nextIdRef.current++,
        source: 'doc' as const,
      }));
      setPool(qs);
      setDocSummary(subject ? `${subject} — ${chapter || subject}` : 'Uploaded document');
      // Start with pre-built sections (empty) — user picks questions from pool
      setSections([
        { name: 'Section A', type: 'MCQ',        marks: 1, target: 5, questions: [] },
        { name: 'Section B', type: 'VERY_SHORT', marks: 2, target: 3, questions: [] },
        { name: 'Section C', type: 'SHORT',      marks: 3, target: 3, questions: [] },
        { name: 'Section D', type: 'LONG',       marks: 5, target: 2, questions: [] },
      ]);
      setAssignedIds(new Set());
      setStep('build');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Extraction failed. Please retry.');
      setStep('config');
    }
  };

  // ── Section helpers ──────────────────────────────────────────────────────────
  const addSection = () => {
    const idx = sections.length;
    setSections(p => [...p, {
      name: `Section ${SECTION_LETTERS[idx] ?? idx + 1}`,
      type: 'SHORT', marks: 3, target: 3, questions: [],
    }]);
  };

  const updateSection = (si: number, field: keyof Pick<BuildSection, 'name'|'type'|'marks'|'target'>, val: any) =>
    setSections(p => p.map((s, i) => {
      if (i !== si) return s;
      const next = { ...s, [field]: val };
      if (field === 'type') next.marks = DEF_MARKS[val as string] ?? s.marks;
      return next;
    }));

  const removeSection = (si: number) => {
    const freed = sections[si].questions.map(q => q._id);
    setAssignedIds(prev => { const n = new Set(prev); freed.forEach(id => n.delete(id)); return n; });
    setSections(p => p.filter((_, i) => i !== si));
  };

  // ── Assignment ────────────────────────────────────────────────────────────────
  const assignQuestion = (q: ExtractedQuestion, si: number) => {
    setSections(p => p.map((s, i) => i !== si ? s : { ...s, questions: [...s.questions, q] }));
    setAssignedIds(prev => new Set(prev).add(q._id));
  };

  const unassignQuestion = (si: number, qId: number) => {
    setSections(p => p.map((s, i) => i !== si ? s : { ...s, questions: s.questions.filter(q => q._id !== qId) }));
    setAssignedIds(prev => { const n = new Set(prev); n.delete(qId); return n; });
  };

  // ── Gap fill for a specific section ──────────────────────────────────────────
  const handleGapFill = async (si: number) => {
    const sec = sections[si];
    const gap = sec.target - sec.questions.length;
    if (gap <= 0) return;
    setGapFilling(prev => new Set(prev).add(si));
    setGapError('');
    try {
      const res = await api.post('ai/ingest-upload/gap-fill/', {
        subject,
        chapter: chapter || subject,
        question_type: sec.type,
        count: gap,
        difficulty,
        doc_summary: docSummary,
      });
      const newQs: ExtractedQuestion[] = (res.data.questions ?? []).map((q: any) => ({
        ...q,
        _id: nextIdRef.current++,
        source: 'ai' as const,
      }));
      setPool(prev => [...prev, ...newQs]);
    } catch (err: any) {
      setGapError(err?.response?.data?.error ?? 'Gap fill failed. Please retry.');
    } finally {
      setGapFilling(prev => { const n = new Set(prev); n.delete(si); return n; });
    }
  };

  // ── Compile ──────────────────────────────────────────────────────────────────
  const handleCompile = async () => {
    const filled = sections.filter(s => s.questions.length > 0);
    if (!filled.length) return;
    setError(''); setStep('compiling'); setCompileStep(1);
    const paperConfig = {
      title: title || `${subject} — ${chapter || 'Uploaded Content'}`,
      subject, chapter: chapter || subject,
      chapters: [chapter || subject],
      grade, board, difficulty,
      max_marks: totalMarks,
    };
    try {
      const res = await api.post('ai/ingest-upload/compile/', {
        paper_config: paperConfig,
        sections: filled.map(s => ({
          name: s.name, type: s.type, marks: s.marks,
          questions: s.questions,
        })),
      });
      setPaperId(res.data.paper_id);
      setSeededCount(totalAssigned);
      setCompileStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Compilation failed.');
      setStep('build');
    }
  };

  // Poll for PDF
  useEffect(() => {
    if (step !== 'compiling' || !paperId) return;
    const t3 = setTimeout(() => setCompileStep(3), 5000);
    const t4 = setTimeout(() => setCompileStep(4), 10000);
    const poll = setInterval(async () => {
      try {
        const res = await api.get('ai/generate-paper/');
        const paper = (res.data as any[]).find((p: any) => p.id === paperId);
        if (paper?.pdf_url) {
          clearInterval(poll); clearTimeout(t3); clearTimeout(t4);
          setPdfUrl(paper.pdf_url); setStep('done');
        }
      } catch {}
    }, 3000);
    return () => { clearInterval(poll); clearTimeout(t3); clearTimeout(t4); };
  }, [step, paperId]);

  const reset = () => {
    setStep('config'); setFile(null); setSubject(''); setChapter(''); setTitle('');
    setGrade('Grade 10'); setBoard('CBSE'); setDiff('medium'); setCount(20);
    setPool([]); setAssignedIds(new Set()); setSections([]);
    setPoolFilter('all'); setDocSummary(''); setGapFilling(new Set()); setGapError('');
    setError(''); setPaperId(null); setPdfUrl(''); setSeededCount(0); setCompileStep(0);
    nextIdRef.current = 0;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1 — CONFIG
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'config') return (
    <div className="max-w-xl mx-auto space-y-5 p-6">

      {/* Disclaimer */}
      <div className="flex gap-3 bg-tertiary/10 border border-tertiary/20 rounded-2xl px-4 py-3">
        <span className="material-symbols-outlined text-tertiary text-lg mt-0.5 shrink-0">warning</span>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface">Math disclaimer:</strong> PDF extraction often garbles equations and symbols. Best for text-heavy subjects (Biology, History, Economics). For Mathematics, results may be inaccurate.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/50'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <span className="material-symbols-outlined text-4xl text-outline/40 mb-2 block">upload_file</span>
        {file ? (
          <div>
            <p className="font-bold text-on-surface">{file.name}</p>
            <p className="text-xs text-outline mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
          </div>
        ) : (
          <>
            <p className="font-semibold text-on-surface">Drop a PDF or image here</p>
            <p className="text-xs text-outline mt-1">PDF, JPG, PNG, WEBP — under 10 pages recommended</p>
          </>
        )}
      </div>

      {/* Paper settings */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-outline">Paper Settings</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline block mb-1.5">Board</label>
            <select value={board} onChange={e => setBoard(e.target.value)} className={inputCls}>
              {['CBSE','ICSE','IB Curriculum','IGCSE'].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline block mb-1.5">Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className={inputCls}>
              {['Grade 9','Grade 10','Grade 11','Grade 12'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline block mb-1.5">Difficulty</label>
            <div className="flex gap-1.5">
              {['easy','medium','hard'].map(d => (
                <button key={d} type="button" onClick={() => setDiff(d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-black capitalize border transition-all ${difficulty === d ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-highest border-outline-variant/15 text-outline'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-outline block mb-1.5">Questions to extract</label>
            <input type="number" min={5} max={30} value={count} onChange={e => setCount(+e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {error && <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-sm text-error">{error}</div>}

      <button onClick={handleExtract} disabled={!file}
        className="w-full py-4 rounded-2xl bg-primary text-on-primary font-black text-sm uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all shadow-lg">
        <span className="material-symbols-outlined text-xl">auto_awesome</span>
        Extract Questions from Document
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2 — EXTRACTING
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'extracting') return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[380px] gap-6 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-primary" style={{ animation: 'spin 2s linear infinite' }}>motion_blur</span>
      </div>
      <div className="space-y-2">
        <p className="font-black text-on-surface text-lg">Reading Your Document</p>
        <p className="text-sm text-outline">Groq AI is extracting questions from your content. Usually 20–40 seconds...</p>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <span key={i} className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3 — BUILD PAPER
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'build') return (
    <div className="flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-outline-variant/10 bg-surface-container-low">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setStep('config')} className="text-outline hover:text-on-surface transition-colors shrink-0">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="min-w-0">
            <p className="font-black text-on-surface text-sm truncate">{subject}{chapter ? ` — ${chapter}` : ''}</p>
            <p className="text-[10px] text-outline">{pool.length} extracted · {totalAssigned} assigned · {totalMarks}M total</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Paper title (optional)"
            className="hidden md:block bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary w-44" />
          <button onClick={handleCompile} disabled={totalAssigned === 0}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-black text-xs uppercase tracking-widest disabled:opacity-40 flex items-center gap-1.5 hover:brightness-110 transition-all shadow-md">
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            Compile PDF
          </button>
        </div>
      </div>

      {(error || gapError) && (
        <div className="mx-6 mt-3 bg-error/10 border border-error/30 rounded-xl px-4 py-2 text-sm text-error">
          {error || gapError}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid md:grid-cols-[1fr_380px]">

        {/* ── LEFT: Question Pool ── */}
        <div className="flex flex-col border-r border-outline-variant/10">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-3">
              Question Pool
              <span className="normal-case font-normal text-outline/60 ml-1">— click a section button to assign</span>
            </p>
            {/* Type filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {['all', ...Q_TYPES].map(t => {
                const poolCount = t === 'all'
                  ? pool.filter(q => !assignedIds.has(q._id)).length
                  : pool.filter(q => !assignedIds.has(q._id) && q.question_type === t).length;
                return (
                  <button key={t} onClick={() => setPoolFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${poolFilter === t ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline hover:text-on-surface'}`}>
                    {t === 'all' ? `All (${poolCount})` : `${Q_LABELS[t]} (${poolCount})`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[560px] px-4 pb-4 space-y-2">
            {visiblePool.length === 0 && (
              <div className="text-center py-10 text-outline text-sm italic">
                {pool.filter(q => !assignedIds.has(q._id)).length === 0
                  ? 'All questions assigned.'
                  : 'No questions match this filter.'}
              </div>
            )}
            {visiblePool.map(q => {
              const matchingSi = sections.findIndex(s => s.type === q.question_type);
              return (
                <div key={q._id} className="group flex items-start gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant/10 hover:border-primary/20 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${TYPE_COLOR[q.question_type] ?? 'bg-outline/10 text-outline'}`}>
                        {Q_LABELS[q.question_type] ?? q.question_type}
                      </span>
                      <span className="text-[10px] text-outline font-bold">{q.marks}M · {q.difficulty}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${q.source === 'ai' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-surface-container-highest text-outline'}`}>
                        {q.source === 'ai' ? 'AI' : 'Doc'}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-snug line-clamp-2">{q.question_text}</p>
                  </div>
                  <button
                    onClick={() => { if (matchingSi !== -1) assignQuestion(q, matchingSi); }}
                    disabled={matchingSi === -1}
                    title={matchingSi === -1 ? `No ${q.question_type} section — add one first` : `Add to ${sections[matchingSi].name}`}
                    className="shrink-0 w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Paper Structure ── */}
        <div className="flex flex-col">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-outline">Paper Structure</p>
            <button onClick={addSection}
              className="text-[10px] font-black text-primary hover:underline flex items-center gap-0.5">
              <span className="material-symbols-outlined text-sm">add</span>Add Section
            </button>
          </div>

          <div className="overflow-y-auto max-h-[560px] px-4 pb-4 space-y-3">
            {sections.map((sec, si) => {
              const gap       = sec.target - sec.questions.length;
              const isLoading = gapFilling.has(si);
              const isFull    = gap <= 0;

              return (
                <div key={si} className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
                  {/* Section header row */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-container-high">
                    <input value={sec.name} onChange={e => updateSection(si, 'name', e.target.value)}
                      className="flex-1 bg-transparent text-sm font-bold text-on-surface focus:outline-none min-w-0" />
                    <select value={sec.type} onChange={e => updateSection(si, 'type', e.target.value)}
                      className="bg-surface-container rounded-lg px-1.5 py-1 text-[10px] font-black text-on-surface border border-outline-variant/20 focus:outline-none">
                      {Q_TYPES.map(t => <option key={t} value={t}>{Q_LABELS[t]}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <input type="number" min={1} max={10} value={sec.marks}
                        onChange={e => updateSection(si, 'marks', +e.target.value)}
                        className="w-8 bg-surface-container rounded text-center text-[10px] font-black text-on-surface border border-outline-variant/20 focus:outline-none py-1" />
                      <span className="text-[10px] text-outline">M</span>
                    </div>
                    <button onClick={() => removeSection(si)} className="text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  {/* Progress bar + target input */}
                  <div className="px-3 pt-2 pb-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-secondary' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (sec.questions.length / Math.max(sec.target, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-black tabular-nums shrink-0 ${isFull ? 'text-secondary' : 'text-outline'}`}>
                      {sec.questions.length}/{sec.target}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-outline">target</span>
                      <input type="number" min={1} max={20} value={sec.target}
                        onChange={e => updateSection(si, 'target', Math.max(1, +e.target.value))}
                        className="w-8 bg-surface-container-high rounded text-center text-[10px] font-black text-on-surface border border-outline-variant/20 focus:outline-none py-0.5" />
                    </div>
                  </div>

                  {/* Assigned questions list */}
                  <div className="px-3 py-1.5 space-y-1 min-h-[32px]">
                    {sec.questions.length === 0 && (
                      <p className="text-[10px] text-outline/50 italic py-0.5">No questions yet</p>
                    )}
                    {sec.questions.map((q, qi) => (
                      <div key={qi} className="flex items-start gap-1.5 group">
                        <span className={`shrink-0 mt-0.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${q.source === 'ai' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-surface-container-highest text-outline'}`}>
                          {q.source === 'ai' ? 'AI' : 'Doc'}
                        </span>
                        <p className="flex-1 text-xs text-on-surface line-clamp-1 leading-snug">{q.question_text}</p>
                        <button onClick={() => unassignQuestion(si, q._id)}
                          className="text-outline opacity-0 group-hover:opacity-100 hover:text-error transition-all shrink-0">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Gap fill button */}
                  {!isFull && (
                    <div className="px-3 pb-2.5">
                      <button
                        onClick={() => handleGapFill(si)}
                        disabled={isLoading}
                        className="w-full py-1.5 rounded-lg border border-dashed border-[#f59e0b]/40 text-[#f59e0b] text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#f59e0b]/5 transition-all disabled:opacity-50"
                      >
                        {isLoading ? (
                          <><span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />Generating...</>
                        ) : (
                          <><span className="material-symbols-outlined text-sm">auto_awesome</span>Fill {gap} missing with AI</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Section footer */}
                  <div className="px-3 py-1.5 bg-surface-container-highest/50 border-t border-outline-variant/10 flex justify-between">
                    <span className="text-[10px] text-outline">{sec.questions.length} question{sec.questions.length !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] font-bold text-on-surface">{sec.questions.length * sec.marks}M</span>
                  </div>
                </div>
              );
            })}

            {totalAssigned > 0 && (
              <div className="flex justify-between px-1 pt-1 border-t border-outline-variant/20">
                <span className="text-xs font-black text-outline uppercase tracking-wider">Total</span>
                <span className="text-sm font-black text-on-surface">{totalMarks} marks</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 4 — COMPILING
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'compiling') return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[380px] gap-8 p-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-primary">picture_as_pdf</span>
      </div>
      <div className="text-center space-y-1">
        <p className="font-black text-on-surface text-lg">Building Your Paper</p>
        <p className="text-sm text-outline">Seeding questions and compiling LaTeX PDF...</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {COMPILE_STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${compileStep > i + 1 ? 'bg-secondary' : compileStep === i + 1 ? 'bg-primary animate-pulse' : 'bg-surface-container-highest'}`}>
              {compileStep > i + 1
                ? <span className="material-symbols-outlined text-xs text-on-secondary">check</span>
                : <span className="text-[10px] font-black text-outline">{i + 1}</span>}
            </div>
            <span className={`text-sm font-semibold transition-colors duration-300 ${compileStep > i + 1 ? 'text-secondary' : compileStep === i + 1 ? 'text-on-surface' : 'text-outline/40'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 5 — DONE
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[380px] gap-6 p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-secondary">task_alt</span>
      </div>
      <div className="space-y-2">
        <p className="font-black text-on-surface text-2xl">Paper Ready!</p>
        <p className="text-sm text-outline">{seededCount} question{seededCount !== 1 ? 's' : ''} seeded to your Question Bank.</p>
      </div>
      <div className="flex flex-col w-full gap-3">
        {paperId && (
          <button
            onClick={async () => {
              try {
                const res = await api.get(`ai/generate-paper/${paperId}/download/`, { responseType: 'blob' });
                const url = URL.createObjectURL(res.data);
                const a   = document.createElement('a');
                a.href     = url;
                a.download = `${title || subject || 'paper'}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                setError('Download failed. Please try again.');
              }
            }}
            className="w-full py-4 rounded-2xl bg-primary text-on-primary font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg"
          >
            <span className="material-symbols-outlined text-xl">download</span>Download PDF
          </button>
        )}
        <button onClick={reset}
          className="w-full py-3 rounded-2xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:border-primary/40 hover:text-on-surface transition-all">
          Create Another Paper
        </button>
      </div>
    </div>
  );
}
