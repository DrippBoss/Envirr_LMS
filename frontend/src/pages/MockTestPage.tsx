import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import MathText from '../components/MathText';

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'config' | 'loading' | 'quiz' | 'results';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

interface BankQuestion {
  id: number;
  question_type: string;
  question_text: string;
  marks: number;
  difficulty: string;
  chapter: string;
  subject: string;
  has_image: boolean;
  image_url: string | null;
  options_json: Record<string, string>;
  correct_key: string;
  answer_text: string;
  case_parts: { part_number: number; part_text: string; part_answer: string; marks: number }[];
}

interface ResultEntry {
  id: number;
  question_text: string;
  question_type: string;
  chapter: string;
  marks: number;
  given: string;
  correct_display: string;
  is_correct: boolean | null;
  self_marked: boolean | null;
  image_url: string | null;
}

interface SubmitResponse {
  score: number; total: number; auto_score: number; auto_total: number;
  pct: number; time_taken: number | null; results: ResultEntry[];
  chapter_breakdown: { chapter: string; correct: number; total: number; pct: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'MCQ', ASSERTION_REASON: 'Assertion & Reason',
  VERY_SHORT: 'Very Short', SHORT: 'Short Answer',
  LONG: 'Long Answer', CASE: 'Case Study',
};

const AUTO_GRADED = ['MCQ', 'ASSERTION_REASON', 'VERY_SHORT'];

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Config screen ─────────────────────────────────────────────────────────────
function ConfigScreen({ onStart }: { onStart: (cfg: any) => void }) {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [selChapters, setSelChapters] = useState<string[]>([]);
  const [count, setCount] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [timeLimitMin, setTimeLimitMin] = useState<number | null>(null);
  const [types, setTypes] = useState<string[]>(['MCQ', 'ASSERTION_REASON', 'VERY_SHORT']);

  useEffect(() => {
    api.get('/ai/questions/meta/').then(r => {
      setSubjects(r.data.subjects ?? []);
      if (r.data.subjects?.length) setSubject(r.data.subjects[0]);
    });
  }, []);

  useEffect(() => {
    if (!subject) return;
    api.get(`/ai/questions/meta/?subject=${encodeURIComponent(subject)}`).then(r => {
      setChapters(r.data.chapters ?? []);
      setSelChapters([]);
    });
  }, [subject]);

  const toggleChapter = (c: string) =>
    setSelChapters(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const toggleType = (t: string) =>
    setTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const inputCls = 'w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50';

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-primary text-3xl">auto_awesome</span>
          </div>
          <h1 className="text-2xl font-black font-headline text-on-surface">AI Mock Test</h1>
          <p className="text-slate-400 text-sm">Configure your personalised practice session.</p>
        </div>

        {/* Subject */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-outline">Subject</p>
          <select className={inputCls} value={subject} onChange={e => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Chapters */}
          <p className="text-xs font-black uppercase tracking-widest text-outline">Chapters <span className="normal-case font-normal text-outline/60">(leave blank for all)</span></p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {chapters.map(c => (
              <button key={c} onClick={() => toggleChapter(c)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  selChapters.includes(c)
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-surface-container-high border-outline-variant/20 text-slate-400 hover:border-outline-variant/40'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Question types */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-outline">Question Types</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TYPE_LABELS).map(([k, label]) => (
              <button key={k} onClick={() => toggleType(k)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left ${
                  types.includes(k)
                    ? 'bg-secondary/10 border-secondary/30 text-secondary'
                    : 'bg-surface-container-high border-outline-variant/15 text-slate-500'
                }`}>
                <span className="material-symbols-outlined text-base">
                  {types.includes(k) ? 'check_box' : 'check_box_outline_blank'}
                </span>
                {label}
                {!AUTO_GRADED.includes(k) && <span className="ml-auto text-[9px] text-outline opacity-60">self-mark</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Count + Difficulty + Timer */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-xs font-black uppercase tracking-widest text-outline">Questions</p>
              <span className="text-sm font-black text-primary">{count}</span>
            </div>
            <input type="range" min={5} max={40} step={5} value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-outline mt-1"><span>5</span><span>40</span></div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-outline mb-2">Difficulty</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['easy','medium','hard','mixed'] as Difficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                    difficulty === d
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-surface-container-high border-outline-variant/15 text-slate-500'
                  }`}>{d}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-outline mb-2">Time Limit</p>
            <div className="flex flex-wrap gap-2">
              {[null, 10, 20, 30, 45, 60].map(t => (
                <button key={String(t)} onClick={() => setTimeLimitMin(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    timeLimitMin === t
                      ? 'bg-tertiary/15 border-tertiary/40 text-tertiary'
                      : 'bg-surface-container-high border-outline-variant/15 text-slate-500'
                  }`}>{t === null ? 'No limit' : `${t} min`}</button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onStart({ subject, chapters: selChapters, count, difficulty, time_limit: timeLimitMin ? timeLimitMin * 60 : null, types })}
          disabled={types.length === 0}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-on-primary font-black text-base hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
        >
          Generate Test →
        </button>
      </div>
    </div>
  );
}

// ── Quiz screen ───────────────────────────────────────────────────────────────
function QuizScreen({
  questions, attemptId, timeLimit,
  onComplete,
}: {
  questions: BankQuestion[]; attemptId: number; timeLimit: number | null;
  onComplete: (resp: SubmitResponse) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [selfMark, setSelfMark] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit ?? null);
  const startTs = useRef(Date.now());

  // Timer
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setSecondsLeft(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const q = questions[idx];
  const isAutoGraded = AUTO_GRADED.includes(q.question_type);
  const answered = answers[q.id] !== undefined;

  const setAnswer = (val: string) => setAnswers(p => ({ ...p, [q.id]: val }));
  const toggleFlag = () => setFlagged(p => { const s = new Set(p); s.has(q.id) ? s.delete(q.id) : s.add(q.id); return s; });

  const handleSubmit = async () => {
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTs.current) / 1000);
    const allAnswers: Record<string, string> = {};
    const selfMarks: Record<string, boolean> = {};
    // Send the student's real answer text, and report self-marks separately so
    // the backend keeps them out of the auto-graded score (no inflation).
    questions.forEach(bq => {
      if (AUTO_GRADED.includes(bq.question_type)) {
        if (answers[bq.id] !== undefined) allAnswers[String(bq.id)] = answers[bq.id];
      } else {
        allAnswers[String(bq.id)] = answers[bq.id] || '';
        if (selfMark[bq.id] !== undefined) selfMarks[String(bq.id)] = selfMark[bq.id];
      }
    });
    try {
      const res = await api.post(`student/mock-test/${attemptId}/submit/`, { answers: allAnswers, self_marks: selfMarks, time_taken: timeTaken });
      onComplete(res.data);
    } catch { setSubmitting(false); }
  };

  const progress = ((idx + 1) / questions.length) * 100;
  const answeredCount = new Set([...Object.keys(answers), ...Object.keys(selfMark)]).size;

  return (
    <div className="min-h-screen bg-background selection:bg-primary-container/30">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-background/95 border-b border-outline-variant/10 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-sm">auto_awesome</span>
          <span className="text-sm font-bold text-on-surface">Mock Test</span>
          <span className="text-xs text-outline">{answeredCount}/{questions.length} answered</span>
        </div>
        {secondsLeft !== null && (
          <span className={`text-sm font-black tabular-nums px-3 py-1 rounded-full border ${
            secondsLeft < 120 ? 'text-error border-error/30 bg-error/10' : 'text-tertiary border-tertiary/30 bg-tertiary/10'
          }`}>
            <span className="material-symbols-outlined text-xs mr-1" style={{ fontVariationSettings:"'FILL' 1" }}>timer</span>
            {fmt(secondsLeft)}
          </span>
        )}
        <button
          onClick={handleSubmit} disabled={submitting}
          className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-black hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </header>

      {/* Progress bar */}
      <div className="fixed top-14 left-0 w-full h-1 bg-surface-container-highest z-40">
        <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex pt-16 min-h-screen">
        {/* Nav sidebar */}
        <aside className="hidden md:flex flex-col w-20 shrink-0 items-center pt-6 border-r border-outline-variant/10 gap-2 overflow-y-auto pb-6">
          {questions.map((bq, i) => {
            const isAnswered = answers[bq.id] !== undefined || selfMark[bq.id] !== undefined;
            const isFlagged = flagged.has(bq.id);
            return (
              <button key={bq.id} onClick={() => setIdx(i)}
                className={`w-10 h-10 rounded-xl text-xs font-black flex items-center justify-center border transition-all relative ${
                  i === idx ? 'bg-primary text-on-primary border-primary' :
                  isAnswered ? 'bg-secondary/15 text-secondary border-secondary/30' :
                  'bg-surface-container text-outline border-outline-variant/15 hover:border-outline-variant/30'
                }`}>
                {i + 1}
                {isFlagged && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-error text-[8px] flex items-center justify-center text-on-surface">!</span>}
              </button>
            );
          })}
        </aside>

        {/* Question area */}
        <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
          {/* Meta */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-surface-container border border-outline-variant/15 text-outline">
                Q{idx + 1} of {questions.length}
              </span>
              <span className="text-[10px] font-bold text-outline">{q.chapter}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                q.difficulty === 'hard' ? 'bg-error/10 text-error' :
                q.difficulty === 'medium' ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'
              }`}>{q.difficulty}</span>
            </div>
            <button onClick={toggleFlag} className={`p-1.5 rounded-lg border transition-all ${
              flagged.has(q.id) ? 'border-error/40 text-error bg-error/10' : 'border-outline-variant/20 text-outline hover:text-on-surface'
            }`}>
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: flagged.has(q.id) ? "'FILL' 1" : "'FILL' 0" }}>flag</span>
            </button>
          </div>

          {/* Question card */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4 md:p-6 space-y-5">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-outline shrink-0 mt-1 w-16">{TYPE_LABELS[q.question_type] ?? q.question_type}</span>
              <p className="text-sm text-on-surface leading-relaxed flex-1"><MathText text={q.question_text} /></p>
            </div>

            {q.has_image && q.image_url && (
              <img src={q.image_url} alt="diagram" className="rounded-xl border border-outline-variant/20 max-h-52 object-contain mx-auto" />
            )}

            {/* MCQ / A&R options */}
            {(q.question_type === 'MCQ' || q.question_type === 'ASSERTION_REASON') && Object.keys(q.options_json).length > 0 && (
              <div className="space-y-2">
                {Object.entries(q.options_json).map(([label, text]) => (
                  <button key={label} onClick={() => setAnswer(label)}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                      answers[q.id] === label
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-surface-container-high border-outline-variant/15 text-on-surface-variant hover:border-outline-variant/40'
                    }`}>
                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${
                      answers[q.id] === label ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/30 text-outline'
                    }`}>{label.toUpperCase()}</span>
                    <MathText text={text} />
                  </button>
                ))}
              </div>
            )}

            {/* CASE parts */}
            {q.question_type === 'CASE' && q.case_parts.length > 0 && (
              <div className="space-y-3 border-t border-outline-variant/10 pt-4">
                {q.case_parts.map(part => (
                  <div key={part.part_number} className="space-y-2">
                    <p className="text-xs font-bold text-outline">Part {part.part_number} ({part.marks}M)</p>
                    <p className="text-sm text-on-surface-variant"><MathText text={part.part_text} /></p>
                    <textarea rows={2} placeholder="Your answer…"
                      value={answers[q.id * 1000 + part.part_number] || ''}
                      onChange={e => setAnswers(p => ({ ...p, [q.id * 1000 + part.part_number]: e.target.value }))}
                      className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50 resize-none" />
                  </div>
                ))}
              </div>
            )}

            {/* VERY_SHORT */}
            {q.question_type === 'VERY_SHORT' && (
              <input type="text" placeholder="Your answer…"
                value={answers[q.id] || ''}
                onChange={e => setAnswer(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50" />
            )}

            {/* SHORT / LONG — text + self-mark */}
            {(q.question_type === 'SHORT' || q.question_type === 'LONG') && (
              <div className="space-y-3">
                <textarea rows={q.question_type === 'LONG' ? 5 : 3} placeholder="Write your answer…"
                  value={answers[q.id] || ''}
                  onChange={e => setAnswer(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50 resize-none" />
                {q.answer_text && (
                  <details className="text-xs text-outline">
                    <summary className="cursor-pointer hover:text-on-surface transition-colors">Show model answer</summary>
                    <div className="mt-2 p-3 bg-surface-container-highest rounded-xl text-on-surface-variant leading-relaxed">
                      <MathText text={q.answer_text} />
                    </div>
                  </details>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <p className="text-xs text-outline flex-1">Mark yourself:</p>
                  <button onClick={() => setSelfMark(p => ({ ...p, [q.id]: true }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selfMark[q.id] === true ? 'bg-secondary/15 border-secondary/40 text-secondary' : 'border-outline-variant/20 text-outline'}`}>
                    ✓ Correct
                  </button>
                  <button onClick={() => setSelfMark(p => ({ ...p, [q.id]: false }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selfMark[q.id] === false ? 'bg-error/15 border-error/40 text-error' : 'border-outline-variant/20 text-outline'}`}>
                    ✗ Wrong
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prev / Next */}
          <div className="flex gap-3 mt-4">
            <button disabled={idx === 0} onClick={() => setIdx(i => i - 1)}
              className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-on-surface hover:border-outline-variant/40 font-bold transition-all disabled:opacity-30">
              ← Previous
            </button>
            {idx < questions.length - 1 ? (
              <button onClick={() => setIdx(i => i + 1)}
                className="flex-1 py-3 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface font-bold hover:border-primary/30 transition-all">
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Finish Test →'}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({ resp, onRetry, onDashboard }: {
  resp: SubmitResponse; onRetry: () => void; onDashboard: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const { pct, auto_score, auto_total, time_taken, results, chapter_breakdown } = resp;
  const grade = pct >= 80 ? { label: 'Excellent!', color: 'text-secondary', icon: 'emoji_events' }
              : pct >= 60 ? { label: 'Good Job!',  color: 'text-primary',   icon: 'thumb_up'    }
              :             { label: 'Keep Going',  color: 'text-error',     icon: 'fitness_center' };

  const selfMarkCount = results.filter(r => r.is_correct === null).length;

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Score card */}
        <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/10 text-center space-y-4">
          <span className={`material-symbols-outlined text-6xl ${grade.color}`} style={{ fontVariationSettings:"'FILL' 1" }}>{grade.icon}</span>
          <div>
            <p className={`text-5xl font-black font-headline ${grade.color}`}>{pct}%</p>
            <p className="text-on-surface font-bold text-lg mt-1">{grade.label}</p>
            <p className="text-slate-500 text-sm mt-1">{auto_score} / {auto_total} auto-graded correct{selfMarkCount > 0 ? ` · ${selfMarkCount} self-marked` : ''}</p>
            {time_taken && <p className="text-slate-600 text-xs mt-1">⏱ {fmt(time_taken)}</p>}
          </div>
          <div className="h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 80 ? 'bg-secondary' : pct >= 60 ? 'bg-primary' : 'bg-error'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Chapter breakdown */}
        {chapter_breakdown.length > 0 && (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-outline">By Chapter</p>
            {chapter_breakdown.sort((a, b) => a.pct - b.pct).map(ch => (
              <div key={ch.chapter}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-on-surface-variant font-medium truncate mr-2">{ch.chapter}</span>
                  <span className={`font-black shrink-0 ${ch.pct >= 70 ? 'text-secondary' : ch.pct >= 50 ? 'text-primary' : 'text-error'}`}>
                    {ch.correct}/{ch.total}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${ch.pct >= 70 ? 'bg-secondary' : ch.pct >= 50 ? 'bg-primary' : 'bg-error'}`}
                    style={{ width: `${ch.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review toggle */}
        <button onClick={() => setShowReview(v => !v)}
          className="w-full py-3 rounded-xl bg-surface-container border border-outline-variant/10 text-sm font-bold text-on-surface-variant hover:border-outline-variant/30 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">{showReview ? 'expand_less' : 'expand_more'}</span>
          {showReview ? 'Hide' : 'Show'} Question Review
        </button>

        {showReview && (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 divide-y divide-outline-variant/10 overflow-hidden">
            {results.map((r, i) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-4">
                <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                  r.is_correct === true ? 'text-secondary' : r.is_correct === false ? 'text-error' : 'text-tertiary'
                }`} style={{ fontVariationSettings:"'FILL' 1" }}>
                  {r.is_correct === true ? 'check_circle' : r.is_correct === false ? 'cancel' : 'help'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-outline mb-0.5">Q{i + 1} · {r.chapter} · {r.question_type}</p>
                  <p className="text-sm text-on-surface-variant leading-snug line-clamp-2">
                    <MathText text={r.question_text} />
                  </p>
                  {r.is_correct === false && r.correct_display && (
                    <p className="text-xs text-secondary mt-1">Answer: <MathText text={r.correct_display} /></p>
                  )}
                  {r.is_correct === null && (
                    <p className="text-xs text-tertiary mt-1">
                      Self-marked{r.self_marked === true ? ' correct' : r.self_marked === false ? ' wrong' : ''} · not counted in score · see model answer
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onDashboard}
            className="flex-1 py-3.5 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-on-surface font-bold transition-all">
            Dashboard
          </button>
          <button onClick={onRetry}
            className="flex-1 py-3.5 rounded-xl bg-primary text-on-primary font-black hover:brightness-110 active:scale-95 transition-all">
            New Test →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MockTestPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('config');
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const handleStart = async (cfg: any) => {
    setPhase('loading');
    try {
      const res = await api.post('student/mock-test/generate/', cfg);
      setQuestions(res.data.questions);
      setAttemptId(res.data.attempt_id);
      setTimeLimit(cfg.time_limit ?? null);
      setPhase('quiz');
    } catch {
      setPhase('config');
    }
  };

  const handleComplete = (resp: SubmitResponse) => {
    setResult(resp);
    setPhase('results');
  };

  if (phase === 'loading') return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-outline text-xs font-bold uppercase tracking-[0.2em]">Building your test…</p>
      </div>
    </div>
  );

  if (phase === 'config') return <ConfigScreen onStart={handleStart} />;

  if (phase === 'quiz' && questions.length > 0 && attemptId) return (
    <QuizScreen
      questions={questions}
      attemptId={attemptId}
      timeLimit={timeLimit}
      onComplete={handleComplete}
    />
  );

  if (phase === 'results' && result) return (
    <ResultsScreen
      resp={result}
      onRetry={() => { setPhase('config'); setResult(null); }}
      onDashboard={() => navigate('/')}
    />
  );

  return null;
}
