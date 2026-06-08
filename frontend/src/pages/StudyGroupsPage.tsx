import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import MathText from '../components/MathText';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SessionBrief {
  id: number; title: string; status: string; session_type: 'questions' | 'pdf';
  question_count: number; time_limit: number | null; started_at: string | null;
  pdf_url: string | null;
}
interface GroupSummary {
  id: number; name: string; subject: string; description: string;
  invite_code: string; max_members: number; member_count: number;
  created_at: string; creator_username: string;
  active_session: SessionBrief | null;
}
interface Member {
  student_id: number; username: string; avatar_url: string;
  class_grade: string; role: 'admin' | 'member'; joined_at: string;
  total_xp: number; level: number; streak: number;
  current_node: { title: string; path_title: string } | null;
  is_me: boolean;
}
interface GroupDetail extends GroupSummary { members: Member[]; }

interface BankQuestion {
  id: number; question_type: string; question_text: string; marks: number;
  difficulty: string; chapter: string; subject: string; has_image: boolean;
  image_url: string | null; options_json: Record<string, string>;
  correct_key: string; answer_text: string;
  case_parts: { part_number: number; part_text: string; part_answer: string; marks: number }[];
}
interface MemberProgress {
  student_id: number; username: string; avatar_url: string;
  answered: number; total: number; submitted: boolean;
  score: number | null; is_me: boolean;
}
interface ChatMsg {
  id: number; sender_id: number | null; username: string; avatar_url: string;
  message: string; image_url: string | null; question_number: number | null;
  question_id: number | null; is_doubt: boolean; is_system: boolean;
  created_at: string; is_me: boolean;
}
interface TeacherPaper {
  id: number; title: string; subject: string; class_grade: string;
  total_marks: number; duration_mins: number; question_count: number;
  created_by: string; question_ids: number[]; pdf_url: string | null; has_pdf: boolean;
}
interface DoubtInfo {
  question_number: number; doubt_count: number;
  escalated_to_ai: boolean; escalated_to_teacher: boolean; can_escalate: boolean;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 9 }: { url: string; name: string; size?: number }) {
  const i = name.slice(0, 2).toUpperCase();
  const c = ['bg-primary/20 text-primary', 'bg-secondary/20 text-secondary', 'bg-tertiary/20 text-tertiary'];
  const col = c[name.charCodeAt(0) % c.length];
  if (url) return <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  return <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-black shrink-0 ${col}`}>{i}</div>;
}
function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '00')}`;
}

// ── Create / Join modal ────────────────────────────────────────────────────────
function CreateJoinModal({ onClose, onDone }: { onClose: () => void; onDone: (g: GroupSummary) => void }) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState(6);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 placeholder:text-outline/40';

  async function handleCreate() {
    if (!name.trim()) { setError('Group name is required.'); return; }
    setLoading(true); setError('');
    try {
      const r = await api.post('student/study-groups/', { name: name.trim(), subject, description, max_members: maxMembers });
      onDone(r.data);
    } catch (e: any) { setError(e.response?.data?.detail || 'Failed to create group.'); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!code.trim()) { setError('Invite code is required.'); return; }
    setLoading(true); setError('');
    try {
      const r = await api.post('student/study-groups/join/', { invite_code: code.trim() });
      onDone(r.data);
    } catch (e: any) { setError(e.response?.data?.detail || 'Invalid or expired code.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-black font-headline text-on-surface">Study Group</h2>
          <button onClick={onClose} className="text-outline hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="flex mx-5 mb-4 gap-1 bg-surface-container-highest rounded-xl p-1">
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black capitalize transition-all ${tab === t ? 'bg-primary/15 text-primary' : 'text-outline hover:text-on-surface'}`}>
              {t === 'create' ? 'Create Group' : 'Join with Code'}
            </button>
          ))}
        </div>
        <div className="px-5 pb-5 space-y-3">
          {tab === 'create' ? (<>
            <input className={inputCls} placeholder="Group name *" value={name} onChange={e => setName(e.target.value)} />
            <input className={inputCls} placeholder="Subject (e.g. Mathematics)" value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Short description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
            <div>
              <div className="flex justify-between mb-1 text-xs text-outline"><span>Max members</span><span className="font-black text-primary">{maxMembers}</span></div>
              <input type="range" min={2} max={6} value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-outline mt-0.5"><span>2</span><span>6</span></div>
            </div>
          </>) : (
            <input className={inputCls} placeholder="6-character invite code" value={code}
              onChange={e => setCode(e.target.value.toUpperCase())} maxLength={8} />
          )}
          {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
          <button onClick={tab === 'create' ? handleCreate : handleJoin} disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-on-primary text-sm font-black hover:bg-primary/90 disabled:opacity-50 transition-all">
            {loading ? 'Please wait…' : tab === 'create' ? 'Create Group' : 'Join Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Start Session modal ────────────────────────────────────────────────────────
function StartSessionModal({
  groupId, onClose, onStarted,
}: { groupId: number; onClose: () => void; onStarted: (session: SessionBrief, questions: BankQuestion[]) => void }) {
  const [tab, setTab] = useState<'teacher' | 'smart_hybrid' | 'ai'>('teacher');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [selChapters, setSelChapters] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [types, setTypes] = useState<string[]>(['MCQ', 'VERY_SHORT', 'SHORT']);
  const [timeLimitMin, setTimeLimitMin] = useState<number | null>(60);
  const [title, setTitle] = useState('Study Session');
  const [teacherPapers, setTeacherPapers] = useState<TeacherPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<TeacherPaper | null>(null);
  const [pdfMode, setPdfMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50';

  useEffect(() => {
    api.get('/ai/questions/meta/').then(r => {
      setSubjects(r.data.subjects ?? []);
      if (r.data.subjects?.length) setSubject(r.data.subjects[0]);
    });
    api.get('student/study-groups/teacher-papers/').then(r => setTeacherPapers(r.data));
  }, []);

  useEffect(() => {
    if (!subject) return;
    api.get(`/ai/questions/meta/?subject=${encodeURIComponent(subject)}`).then(r => {
      setChapters(r.data.chapters ?? []); setSelChapters([]);
    });
  }, [subject]);

  const TYPE_LABELS: Record<string, string> = { MCQ: 'MCQ', ASSERTION_REASON: 'A&R', VERY_SHORT: 'Very Short', SHORT: 'Short', LONG: 'Long' };

  async function handleStart() {
    setLoading(true); setError('');
    try {
      let body: any = { title, time_limit: timeLimitMin ? timeLimitMin * 60 : null };
      if (tab === 'teacher' && selectedPaper) {
        const effectivePdfMode = pdfMode && selectedPaper.has_pdf;
        body = { ...body, source: 'teacher_paper', paper_id: selectedPaper.id, session_type: effectivePdfMode ? 'pdf' : 'questions' };
      } else if (tab === 'smart_hybrid') {
        body = { ...body, source: 'smart_hybrid', subject, chapters: selChapters, count, difficulty, types };
      } else {
        body = { ...body, source: 'ai_generated', session_type: 'questions', subject, chapters: selChapters, count, difficulty, types };
      }
      const r = await api.post(`student/study-groups/${groupId}/sessions/`, body);
      onStarted(r.data.session, r.data.questions ?? []);
    } catch (e: any) { setError(e.response?.data?.detail || 'Failed to start session.'); }
    finally { setLoading(false); }
  }

  const tabDefs = [
    { key: 'teacher', label: 'Teacher Paper', icon: 'description' },
    { key: 'smart_hybrid', label: 'Smart Hybrid', icon: 'auto_awesome' },
    { key: 'ai', label: 'AI Questions', icon: 'psychology' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-black font-headline text-on-surface">Start Study Session</h2>
          <button onClick={onClose} className="text-outline hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="px-5 overflow-y-auto flex-1 space-y-4 pb-2">
          <input className={inputCls} placeholder="Session title" value={title} onChange={e => setTitle(e.target.value)} />

          {/* Source tabs */}
          <div className="flex gap-1 bg-surface-container-highest rounded-xl p-1">
            {tabDefs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all flex flex-col items-center gap-0.5 ${tab === t.key ? 'bg-secondary/15 text-secondary' : 'text-outline hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-base">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Teacher Papers tab */}
          {tab === 'teacher' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-surface-container-high rounded-xl px-3 py-2.5 border border-outline-variant/15">
                <div>
                  <p className="text-xs font-black text-on-surface">PDF Mode</p>
                  <p className="text-[10px] text-outline/60">Students view PDF · solve on paper · chat + share pics</p>
                </div>
                <button onClick={() => setPdfMode(p => !p)}
                  className={`w-11 h-6 rounded-full relative transition-all ${pdfMode ? 'bg-secondary' : 'bg-outline-variant/30'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pdfMode ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              {teacherPapers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No teacher papers available.</p>
              ) : teacherPapers.map(p => (
                <button key={p.id} onClick={() => setSelectedPaper(p)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selectedPaper?.id === p.id ? 'border-secondary/50 bg-secondary/10' : 'border-outline-variant/15 bg-surface-container-high hover:border-outline-variant/40'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black text-on-surface">{p.title}</p>
                    {p.has_pdf && <span className="text-[9px] font-black bg-secondary/15 text-secondary px-1.5 py-0.5 rounded-full shrink-0">PDF</span>}
                  </div>
                  <p className="text-[11px] text-outline/60">{p.subject} · {p.question_count} q · {p.total_marks}M · by {p.created_by}</p>
                </button>
              ))}
              {pdfMode && selectedPaper && !selectedPaper.has_pdf && (
                <p className="text-[11px] text-orange-400 font-bold">⚠ This paper has no PDF. Will use question mode instead.</p>
              )}
            </div>
          )}

          {/* Smart Hybrid tab */}
          {tab === 'smart_hybrid' && (
            <div className="space-y-3">
              <div className="bg-secondary/5 border border-secondary/15 rounded-xl px-3 py-2.5 text-xs text-secondary font-bold">
                AI generates a custom paper for your group based on the topic you choose.
              </div>
              <select className={inputCls} value={subject} onChange={e => setSubject(e.target.value)}>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
              {chapters.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1.5">Chapters</p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {chapters.map(c => (
                      <button key={c} onClick={() => setSelChapters(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${selChapters.includes(c) ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface-container-high border-outline-variant/20 text-slate-400'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex justify-between mb-1 text-xs text-outline"><span>Questions</span><span className="font-black text-primary">{count}</span></div>
                <input type="range" min={5} max={30} step={5} value={count} onChange={e => setCount(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard', 'mixed'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all ${difficulty === d ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface-container-high border-outline-variant/15 text-slate-500'}`}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {/* AI Questions tab */}
          {tab === 'ai' && (
            <div className="space-y-3">
              <select className={inputCls} value={subject} onChange={e => setSubject(e.target.value)}>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
              {chapters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {chapters.map(c => (
                    <button key={c} onClick={() => setSelChapters(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${selChapters.includes(c) ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface-container-high border-outline-variant/20 text-slate-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPE_LABELS).map(([k, label]) => (
                  <button key={k} onClick={() => setTypes(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all text-left ${types.includes(k) ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-surface-container-high border-outline-variant/15 text-slate-500'}`}>
                    <span className="material-symbols-outlined text-sm">{types.includes(k) ? 'check_box' : 'check_box_outline_blank'}</span>
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <div className="flex justify-between mb-1 text-xs text-outline"><span>Questions</span><span className="font-black text-primary">{count}</span></div>
                <input type="range" min={5} max={30} step={5} value={count} onChange={e => setCount(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard', 'mixed'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all ${difficulty === d ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface-container-high border-outline-variant/15 text-slate-500'}`}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {/* Timer */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1.5">Time Limit</p>
            <div className="flex gap-2 flex-wrap">
              {[null, 20, 30, 45, 60, 90, 120].map(t => (
                <button key={String(t)} onClick={() => setTimeLimitMin(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${timeLimitMin === t ? 'bg-tertiary/15 border-tertiary/40 text-tertiary' : 'bg-surface-container-high border-outline-variant/15 text-slate-500'}`}>
                  {t === null ? 'No limit' : `${t} min`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 shrink-0">
          {error && <p className="text-xs text-red-400 font-bold mb-2">{error}</p>}
          <button onClick={handleStart} disabled={loading || (tab === 'teacher' && !selectedPaper)}
            className="w-full py-3 rounded-xl bg-secondary text-on-secondary text-sm font-black hover:bg-secondary/90 disabled:opacity-50 transition-all">
            {loading ? 'Starting…' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chat panel (shared between PDF and question modes) ────────────────────────
function ChatPanel({
  groupId, sessionId, sessionType, questions, doubts, onDoubtRaised,
  answerKey, rightTab, onTabChange, width, fullScreen = false,
}: {
  groupId: number; sessionId: number; sessionType: 'questions' | 'pdf';
  questions: BankQuestion[]; doubts: DoubtInfo[]; onDoubtRaised: () => void;
  answerKey: { question_number: number; answer: string }[];
  rightTab: 'chat' | 'key'; onTabChange: (t: 'chat' | 'key') => void;
  width: number; fullScreen?: boolean;
}) {
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isDoubt, setIsDoubt] = useState(false);
  const [questionNumber, setQuestionNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const lastMsgId = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`student/study-groups/${groupId}/sessions/${sessionId}/chat/`).then(r => {
      setChat(r.data);
      if (r.data.length) lastMsgId.current = r.data[r.data.length - 1].id;
    });
  }, [groupId, sessionId]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await api.get(`student/study-groups/${groupId}/sessions/${sessionId}/chat/?since=${lastMsgId.current}`);
        const newMsgs: ChatMsg[] = r.data;
        if (newMsgs.length) {
          setChat(prev => [...prev, ...newMsgs]);
          lastMsgId.current = newMsgs[newMsgs.length - 1].id;
        }
      } catch { /* silent */ }
    }, 4000);
    return () => clearInterval(poll);
  }, [groupId, sessionId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  async function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setSending(true);
    setChatError('');
    try {
      const r = await api.post(
        `student/study-groups/${groupId}/sessions/${sessionId}/chat/`,
        {
          message: text,
          is_doubt: isDoubt,
          ...(questionNumber ? { question_number: questionNumber } : {}),
        },
      );
      setChat(prev => [...prev, r.data]);
      lastMsgId.current = r.data.id;
      setChatInput('');
      setIsDoubt(false);
      setQuestionNumber('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail) setChatError(detail);
    } finally { setSending(false); }
  }

  async function raiseDoubt() {
    const qNum = parseInt(questionNumber || '0');
    if (!qNum) return;
    try {
      await api.post(`student/study-groups/${groupId}/sessions/${sessionId}/doubts/`, { question_number: qNum });
      onDoubtRaised();
      setQuestionNumber('');
    } catch { /* ignore */ }
  }

  async function escalate(qNum: number, target: 'ai' | 'teacher') {
    try {
      await api.post(`student/study-groups/${groupId}/sessions/${sessionId}/doubts/${qNum}/escalate/`, { target });
      onDoubtRaised();
    } catch { /* ignore */ }
  }

  return (
    <div style={fullScreen ? undefined : { width }} className={`${fullScreen ? 'flex-1 w-full' : 'shrink-0'} border-l border-outline-variant/15 flex flex-col bg-surface-container overflow-hidden`}>
      {/* Tabs */}
      <div className="flex border-b border-outline-variant/10 shrink-0">
        <button onClick={() => onTabChange('chat')}
          className={`flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${rightTab === 'chat' ? 'text-secondary border-b-2 border-secondary' : 'text-outline hover:text-on-surface'}`}>
          <span className="material-symbols-outlined text-sm">chat</span>
          Group Chat
        </button>
        <button onClick={() => onTabChange('key')}
          className={`flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${rightTab === 'key' ? 'text-green-400 border-b-2 border-green-400' : 'text-outline hover:text-on-surface'}`}>
          <span className="material-symbols-outlined text-sm">key</span>
          Answer Key
        </button>
      </div>

      {/* Answer Key tab */}
      {rightTab === 'key' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          <p className="text-[10px] text-outline/50 text-center mb-3">Verify as you go · Answers only</p>
          {answerKey.length === 0 ? (
            <p className="text-xs text-outline/40 text-center py-10">No answer key available.</p>
          ) : answerKey.map(k => (
            <div key={k.question_number} className="flex gap-3 items-start bg-surface-container-high rounded-xl px-3 py-2.5 border border-outline-variant/10">
              <span className="text-[11px] font-black text-outline shrink-0 w-7">Q{k.question_number}</span>
              <span className="text-[11px] text-green-400 font-bold leading-relaxed break-words">{k.answer || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chat tab */}
      {rightTab === 'chat' && <>
      {/* Doubt escalation cards */}
      {doubts.filter(d => d.can_escalate).length > 0 && (
        <div className="border-b border-orange-500/20 bg-orange-500/5 px-3 py-2 space-y-1.5 shrink-0">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Group Doubts</p>
          {doubts.filter(d => d.can_escalate).map(d => (
            <div key={d.question_number} className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-2">
              <p className="text-[11px] font-black text-orange-300 mb-1.5">{d.doubt_count} students stuck on Q{d.question_number}</p>
              <div className="flex gap-1.5">
                <button onClick={() => escalate(d.question_number, 'ai')}
                  className="flex-1 py-1 rounded-lg bg-secondary/15 text-secondary text-[10px] font-black border border-secondary/20 hover:bg-secondary/25 transition-all">
                  Ask AI
                </button>
                <button onClick={() => escalate(d.question_number, 'teacher')}
                  className="flex-1 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black border border-primary/20 hover:bg-primary/20 transition-all">
                  Notify Teacher
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {chat.length === 0 && (
          <p className="text-center text-outline/40 text-xs py-8">No messages yet. Say hi!</p>
        )}
        {chat.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.is_me ? 'flex-row-reverse' : ''}`}>
            {!msg.is_system && <Avatar url={msg.avatar_url} name={msg.username} size={7} />}
            {msg.is_system && (
              <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-sm">smart_toy</span>
              </div>
            )}
            <div className={`max-w-[82%] space-y-1 flex flex-col ${msg.is_me ? 'items-end' : 'items-start'}`}>
              {(msg.is_doubt || msg.question_number) && !msg.is_system && (
                <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">help</span>
                  Doubt {msg.question_number ? `· Q${msg.question_number}` : ''}
                </span>
              )}
              {msg.is_system && (
                <span className="text-[9px] font-black text-secondary uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">smart_toy</span>
                  AI Assistant
                </span>
              )}
              <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                msg.is_system ? 'bg-secondary/10 border border-secondary/20 text-slate-200 rounded-tl-sm max-w-full' :
                msg.is_me ? 'bg-primary/20 text-on-surface rounded-tr-sm' :
                msg.is_doubt ? 'bg-orange-500/15 border border-orange-500/20 text-on-surface rounded-tl-sm' :
                'bg-surface-container-high text-on-surface-variant rounded-tl-sm'
              }`}>
                {!msg.is_me && !msg.is_system && <p className="text-[10px] font-black text-outline/60 mb-0.5">{msg.username}</p>}
                {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="px-3 py-2 border-t border-outline-variant/10 shrink-0 space-y-2">
        {/* Raise doubt */}
        <div className="flex gap-1.5 items-center">
          <input
            className="flex-1 bg-surface-container-highest border border-orange-500/20 rounded-lg px-2.5 py-1.5 text-[11px] text-on-surface focus:outline-none focus:border-orange-500/40 placeholder:text-outline/30"
            placeholder="Q number (e.g. 3)"
            value={questionNumber}
            onChange={e => setQuestionNumber(e.target.value)}
            type="number" min="1"
          />
          <button onClick={raiseDoubt} disabled={!questionNumber}
            className="px-2.5 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 text-[10px] font-black border border-orange-500/20 hover:bg-orange-500/25 disabled:opacity-40 transition-all whitespace-nowrap">
            Raise Doubt
          </button>
        </div>

        {/* Moderation error */}
        {chatError && (
          <div className="flex items-start gap-2 px-3 py-2 mb-2 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
            <span className="material-symbols-outlined text-sm shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
            <span className="flex-1">{chatError}</span>
            <button onClick={() => setChatError('')} className="shrink-0 hover:opacity-70">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            className={`flex-1 bg-surface-container-highest border rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none placeholder:text-outline/40 transition-colors ${
              chatError ? 'border-error/40 focus:border-error/60' : 'border-outline-variant/20 focus:border-primary/50'
            }`}
            placeholder="Type a message…"
            value={chatInput}
            onChange={e => { setChatInput(e.target.value); if (chatError) setChatError(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
          />
          <button onClick={sendChat} disabled={sending || !chatInput.trim()}
            className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40 transition-all">
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </div>
      </div>

      </>}
    </div>
  );
}

// ── Session Room ───────────────────────────────────────────────────────────────
function SessionRoom({
  groupId, sessionId, initialSession, initialQuestions, onSessionEnd,
}: {
  groupId: number; sessionId: number; initialSession: SessionBrief;
  initialQuestions: BankQuestion[]; onSessionEnd: () => void;
}) {
  const [session, setSession] = useState<SessionBrief>(initialSession);
  const [questions, setQuestions] = useState<BankQuestion[]>(initialQuestions);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const syncAnswers = (updated: Record<string, string>) => { answersRef.current = updated; setAnswers(updated); };
  const [currentIdx, setCurrentIdx] = useState(0);
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const [doubts, setDoubts] = useState<DoubtInfo[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isTimed, setIsTimed] = useState(false);
  const [rightTab, setRightTab] = useState<'chat' | 'key'>('chat');
  const [answerKey, setAnswerKey] = useState<{ question_number: number; answer: string }[]>([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [rightWidth, setRightWidth] = useState(320);
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPdf = session.session_type === 'pdf';

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startW = rightWidth;
    function onMove(ev: MouseEvent) {
      const delta = startX - ev.clientX;
      setRightWidth(Math.min(600, Math.max(240, startW + delta)));
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // Fetch answer key immediately — this is revision, not an exam
  useEffect(() => {
    api.get(`student/study-groups/${groupId}/sessions/${sessionId}/answer-key/`)
      .then(r => setAnswerKey(r.data.answer_key ?? []))
      .catch(() => {});
  }, [groupId, sessionId]);

  // Fetch PDF as blob to bypass X-Frame-Options: DENY on the media server
  useEffect(() => {
    if (!isPdf || !session.pdf_url) return;
    let objectUrl: string;
    fetch(`${import.meta.env.VITE_API_URL}${session.pdf_url}`)
      .then(r => r.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      })
      .catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [isPdf, session.pdf_url]);

  useEffect(() => {
    api.get(`student/study-groups/${groupId}/sessions/${sessionId}/`).then(r => {
      const d = r.data;
      if (d.questions?.length) setQuestions(d.questions);
      if (d.my_answers) syncAnswers(d.my_answers);
      if (d.my_submitted) setSubmitted(true);
      setMemberProgress(d.member_progress ?? []);
      setDoubts(d.doubts ?? []);
      const tl = d.session?.time_limit;
      const startedAt = d.session?.started_at;
      if (startedAt) {
        const elapsedSec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
        if (tl) { setIsTimed(true); setTimeLeft(Math.max(0, tl - elapsedSec)); }
        else { setElapsed(elapsedSec); }
      }
      if (d.session) setSession(d.session);
    });
  }, [groupId, sessionId]);

  // Poll member progress + doubts every 4s
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await api.get(`student/study-groups/${groupId}/sessions/${sessionId}/`);
        setMemberProgress(r.data.member_progress ?? []);
        setDoubts(r.data.doubts ?? []);
        if (r.data.session?.status === 'completed') { clearInterval(poll); onSessionEnd(); }
      } catch { /* silent */ }
    }, 4000);
    return () => clearInterval(poll);
  }, [groupId, sessionId, onSessionEnd]);

  // Auto-save (question mode only)
  useEffect(() => {
    if (submitted || isPdf) return;
    saveTimer.current = setInterval(() => {
      api.post(`student/study-groups/${groupId}/sessions/${sessionId}/save/`, { answers: answersRef.current }).catch(() => {});
    }, 10000);
    return () => { if (saveTimer.current) clearInterval(saveTimer.current); };
  }, [groupId, sessionId, submitted, isPdf]);

  // Countdown
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleDone(); return; }
    const t = setTimeout(() => setTimeLeft(tl => tl !== null ? tl - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  // Elapsed counter
  useEffect(() => {
    if (isTimed || submitted) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isTimed, submitted]);

  async function handleDone() {
    if (submitted) return;
    try {
      await api.post(`student/study-groups/${groupId}/sessions/${sessionId}/submit/`, { answers: answersRef.current });
      setSubmitted(true);
    } catch (e: any) {
      if (e.response?.data?.detail === 'Already submitted.') setSubmitted(true);
    }
  }

  const q = questions[currentIdx];
  const answered = Object.keys(answers).filter(k => answers[k]).length;
  const timerWarning = timeLeft !== null && timeLeft < 120;

  return (
    <div className="fixed inset-0 bg-background z-[60] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 border-b border-outline-variant/15 bg-surface-container shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-outline font-bold truncate">{session.title}</p>
          {isPdf
            ? <p className="text-sm font-black text-on-surface">{submitted ? 'Done ✓' : 'Solve on paper · Chat'}</p>
            : <p className="text-sm font-black text-on-surface">{answered}/{questions.length} answered</p>
          }
        </div>

        {/* Member dots — hidden on phones to save space */}
        <div className="hidden sm:flex items-center gap-1.5">
          {memberProgress.map(m => (
            <div key={m.student_id} title={`${m.username}${m.submitted ? ' ✓' : ''}`}
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black transition-all ${
                m.submitted ? 'border-green-500 bg-green-500/20 text-green-400' :
                m.answered > 0 ? 'border-primary/60 bg-primary/10 text-primary' :
                'border-outline-variant/30 bg-surface-container-high text-outline'
              } ${m.is_me ? 'ring-2 ring-secondary ring-offset-1 ring-offset-surface-container' : ''}`}>
              {m.submitted ? '✓' : isPdf ? m.username[0] : m.answered}
            </div>
          ))}
        </div>

        {/* Timer */}
        {isTimed && timeLeft !== null ? (
          <div className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-xl text-xs md:text-sm font-black font-mono border ${
            timerWarning ? 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse' :
            timeLeft < 300 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
            'text-on-surface bg-surface-container-high border-outline-variant/20'
          }`}>
            <span className="material-symbols-outlined text-sm">timer</span>
            {fmt(timeLeft)}
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-xl text-xs md:text-sm font-black font-mono border border-outline-variant/20 text-outline bg-surface-container-high">
            <span className="material-symbols-outlined text-sm">schedule</span>
            {fmt(elapsed)}
          </div>
        )}

        {!submitted && (
          <button onClick={handleDone}
            className="px-3 md:px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-black hover:bg-primary/90 transition-all shrink-0">
            {isPdf ? 'Done' : 'Submit'}
          </button>
        )}
        {submitted && (
          <span className="px-2 md:px-3 py-2 rounded-xl bg-green-500/10 text-green-400 text-xs font-black border border-green-500/20 shrink-0">Done ✓</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {isPdf ? (
          /* ── PDF Mode ── */
          <div className={`${isMobile ? 'flex-1' : 'flex-1'} flex flex-col min-h-0 relative`}>
            {pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                className="w-full flex-1 min-h-0"
                title="Question Paper"
              />
            ) : session.pdf_url ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-outline">
                <div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
                <p className="text-sm">Loading paper…</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-outline text-sm">
                PDF not available for this paper.
              </div>
            )}
            {submitted && (
              <div className="absolute top-3 left-3 bg-green-500/20 border border-green-500/40 rounded-xl px-3 py-2 text-green-400 text-xs font-black">
                Marked as done — check the answer key when session ends
              </div>
            )}
          </div>
        ) : (
          /* ── Question Mode ── */
          <div className="flex-1 flex flex-col min-w-0">
            {/* Question nav strip */}
            <div className="flex gap-1 px-4 py-2 overflow-x-auto border-b border-outline-variant/10 bg-surface-container shrink-0">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrentIdx(i)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-black shrink-0 transition-all border ${
                    i === currentIdx ? 'bg-primary text-on-primary border-primary' :
                    answers[String(questions[i].id)] ? 'bg-secondary/15 text-secondary border-secondary/30' :
                    'bg-surface-container-high text-outline border-outline-variant/20'
                  }`}>{i + 1}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {submitted && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-green-400 font-black text-sm">Submitted! Waiting for others…</p>
                </div>
              )}

              {q && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-outline">Q{currentIdx + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-bold">{q.question_type.replace('_', ' ')}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-bold">{q.marks}M</span>
                    <span className="text-[10px] text-outline/50 ml-auto">{q.chapter}</span>
                  </div>

                  <div className="text-sm text-on-surface leading-relaxed"><MathText text={q.question_text} /></div>
                  {q.has_image && q.image_url && (
                    <img src={q.image_url} alt="question" className="max-w-xs rounded-xl border border-outline-variant/20" />
                  )}

                  {(q.question_type === 'MCQ' || q.question_type === 'ASSERTION_REASON') && (
                    <div className="space-y-2">
                      {Object.entries(q.options_json).map(([key, text]) => (
                        <button key={key} disabled={submitted}
                          onClick={() => syncAnswers({ ...answersRef.current, [q.id]: key })}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all text-sm ${
                            answers[String(q.id)] === key ? 'border-primary/50 bg-primary/10 text-on-surface' :
                            'border-outline-variant/20 bg-surface-container-high text-on-surface-variant hover:border-outline-variant/40 disabled:cursor-default'
                          }`}>
                          <span className={`w-6 h-6 rounded-full border text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${answers[String(q.id)] === key ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/40 text-outline'}`}>{key}</span>
                          <MathText text={text} />
                        </button>
                      ))}
                    </div>
                  )}

                  {(q.question_type === 'VERY_SHORT' || q.question_type === 'SHORT') && (
                    <textarea disabled={submitted} rows={q.question_type === 'VERY_SHORT' ? 2 : 4}
                      className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 resize-none disabled:opacity-60"
                      placeholder="Your answer…" value={answers[String(q.id)] || ''}
                      onChange={e => syncAnswers({ ...answersRef.current, [q.id]: e.target.value })} />
                  )}

                  {q.question_type === 'LONG' && (
                    <textarea disabled={submitted} rows={6}
                      className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 resize-none disabled:opacity-60"
                      placeholder="Your answer…" value={answers[String(q.id)] || ''}
                      onChange={e => syncAnswers({ ...answersRef.current, [q.id]: e.target.value })} />
                  )}

                  {q.question_type === 'CASE' && q.case_parts.map(p => (
                    <div key={p.part_number} className="space-y-2">
                      <p className="text-xs font-bold text-outline">Part {p.part_number} ({p.marks}M)</p>
                      <div className="text-sm text-on-surface"><MathText text={p.part_text} /></div>
                      <textarea disabled={submitted} rows={3}
                        className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 resize-none disabled:opacity-60"
                        placeholder={`Answer for Part ${p.part_number}…`}
                        value={answers[`${q.id}_p${p.part_number}`] || ''}
                        onChange={e => syncAnswers({ ...answersRef.current, [`${q.id}_p${p.part_number}`]: e.target.value })} />
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
                      className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold disabled:opacity-40 hover:bg-surface-container-highest transition-all">
                      Previous
                    </button>
                    <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))} disabled={currentIdx === questions.length - 1}
                      className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold disabled:opacity-40 hover:bg-surface-container-highest transition-all">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop: drag handle + inline chat panel */}
        {!isMobile && (
          <>
            <div
              onMouseDown={startDrag}
              className="w-3 shrink-0 cursor-col-resize group relative flex items-center justify-center"
              title="Drag to resize"
            >
              <div className={`w-0.5 h-12 rounded-full transition-colors ${dragging ? 'bg-secondary' : 'bg-outline-variant/30 group-hover:bg-secondary/60'}`} />
            </div>
            <ChatPanel
              groupId={groupId} sessionId={sessionId}
              sessionType={session.session_type}
              questions={questions} doubts={doubts}
              onDoubtRaised={() => {
                api.get(`student/study-groups/${groupId}/sessions/${sessionId}/`).then(r => setDoubts(r.data.doubts ?? []));
              }}
              answerKey={answerKey}
              rightTab={rightTab}
              onTabChange={setRightTab}
              width={rightWidth}
            />
          </>
        )}
      </div>

      {/* Desktop drag overlay — blocks iframe stealing pointer events */}
      {!isMobile && dragging && <div className="fixed inset-0 z-[70] cursor-col-resize" />}

      {/* Mobile: floating chat button */}
      {isMobile && !mobileChatOpen && (
        <button
          onClick={() => setMobileChatOpen(true)}
          className="fixed bottom-6 right-4 z-[65] w-14 h-14 rounded-full bg-secondary text-on-secondary shadow-2xl flex items-center justify-center"
          aria-label="Open group chat"
        >
          <span className="material-symbols-outlined text-2xl">chat</span>
          {doubts.filter(d => d.can_escalate).length > 0 && (
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-orange-400 border-2 border-background" />
          )}
        </button>
      )}

      {/* Mobile: chat bottom sheet */}
      {isMobile && mobileChatOpen && (
        <div className="fixed inset-0 z-[65] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setMobileChatOpen(false)} />
          {/* Sheet */}
          <div className="h-[70vh] flex flex-col rounded-t-2xl overflow-hidden border-t border-outline-variant/15 bg-surface-container">
            {/* Sheet handle bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-outline-variant/40 mx-auto" />
              </div>
              <button
                onClick={() => setMobileChatOpen(false)}
                className="ml-auto text-outline hover:text-on-surface transition-colors"
                aria-label="Close chat"
              >
                <span className="material-symbols-outlined">keyboard_arrow_down</span>
              </button>
            </div>
            <ChatPanel
              groupId={groupId} sessionId={sessionId}
              sessionType={session.session_type}
              questions={questions} doubts={doubts}
              onDoubtRaised={() => {
                api.get(`student/study-groups/${groupId}/sessions/${sessionId}/`).then(r => setDoubts(r.data.doubts ?? []));
              }}
              answerKey={answerKey}
              rightTab={rightTab}
              onTabChange={setRightTab}
              width={0}
              fullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Session Results ────────────────────────────────────────────────────────────
function SessionResults({ groupId, sessionId, onBack }: { groupId: number; sessionId: number; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`student/study-groups/${groupId}/sessions/${sessionId}/results/`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [groupId, sessionId]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin" /></div>;
  if (!data) return null;

  const isPdf = data.session?.session_type === 'pdf';
  const sorted = [...(data.members ?? [])].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-lg font-black font-headline text-on-surface">Session Results</h2>
          <p className="text-xs text-slate-500">{data.session?.title} · {isPdf ? 'PDF Mode' : 'Question Mode'}</p>
        </div>
      </div>

      {/* Participation list for PDF sessions */}
      <div className="space-y-2">
        {sorted.map((m: any, i: number) => (
          <div key={m.student_id}
            className={`bg-surface-container rounded-2xl border p-3.5 flex items-center gap-3 ${m.is_me ? 'border-secondary/30' : 'border-outline-variant/10'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-400/20 text-on-surface-variant' : i === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-surface-container-high text-outline'}`}>
              {i + 1}
            </div>
            <Avatar url={m.avatar_url} name={m.username} size={9} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-on-surface">{m.username}</span>
                {m.is_me && <span className="text-[9px] font-black bg-secondary/15 text-secondary px-1.5 py-0.5 rounded-full">You</span>}
              </div>
              {!isPdf && m.total > 0 && (
                <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(m.score / m.total) * 100}%` }} />
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              {isPdf ? (
                <p className="text-sm font-black">{m.submitted ? <span className="text-green-400">Done ✓</span> : <span className="text-outline">Pending</span>}</p>
              ) : (
                <>
                  <p className="text-sm font-black text-on-surface">{m.submitted ? `${m.score}/${m.total}` : '—'}</p>
                  <p className="text-[10px] text-outline/60">{m.submitted && m.total ? `${Math.round((m.score / m.total) * 100)}%` : 'Pending'}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Answer key for question sessions */}
      {!isPdf && data.questions && (
        <div>
          <h3 className="text-sm font-black text-on-surface mb-3">Answer Key</h3>
          <div className="space-y-3">
            {(data.questions ?? []).map((q: BankQuestion, i: number) => (
              <div key={q.id} className="bg-surface-container rounded-xl border border-outline-variant/10 p-3">
                <p className="text-xs font-black text-outline mb-1">Q{i + 1} · {q.question_type.replace('_', ' ')} · {q.marks}M</p>
                <div className="text-sm text-on-surface mb-2"><MathText text={q.question_text} /></div>
                {q.correct_key && <p className="text-xs text-green-400 font-bold">Answer: {q.correct_key}: {q.options_json[q.correct_key]}</p>}
                {!q.correct_key && q.answer_text && <p className="text-xs text-green-400 font-bold">Model answer: {q.answer_text.slice(0, 120)}{q.answer_text.length > 120 ? '…' : ''}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group detail ───────────────────────────────────────────────────────────────
function GroupDetailView({ groupId, onBack }: { groupId: number; onBack: () => void }) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'members' | 'leaderboard'>('members');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [sessionRoom, setSessionRoom] = useState<{ sessionId: number; session: SessionBrief; questions: BankQuestion[] } | null>(null);
  const [showResults, setShowResults] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(() => {
    setError('');
    Promise.all([
      api.get(`student/study-groups/${groupId}/`),
      api.get(`student/study-groups/${groupId}/leaderboard/`),
    ]).then(([gRes, lbRes]) => {
      setGroup(gRes.data);
      setLeaderboard(lbRes.data);
    }).catch(() => setError('Failed to load group.'))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  function copyCode() {
    if (!group) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function leaveGroup() {
    if (!window.confirm('Leave this group?')) return;
    setLeaving(true);
    try { await api.delete(`student/study-groups/${groupId}/`); onBack(); }
    catch { setLeaving(false); }
  }

  function handleSessionStarted(session: SessionBrief, questions: BankQuestion[]) {
    setShowStartModal(false);
    setSessionRoom({ sessionId: session.id, session, questions });
  }

  function joinExistingSession(activeSession: SessionBrief) {
    api.get(`student/study-groups/${groupId}/sessions/${activeSession.id}/`).then(r => {
      setSessionRoom({ sessionId: activeSession.id, session: activeSession, questions: r.data.questions ?? [] });
    });
  }

  if (sessionRoom) return (
    <SessionRoom groupId={groupId} sessionId={sessionRoom.sessionId}
      initialSession={sessionRoom.session} initialQuestions={sessionRoom.questions}
      onSessionEnd={() => { const sid = sessionRoom.sessionId; setSessionRoom(null); setShowResults(sid); load(); }} />
  );

  if (showResults) return (
    <div className="pt-20 pb-16 px-4 max-w-xl mx-auto">
      <SessionResults groupId={groupId} sessionId={showResults} onBack={() => { setShowResults(null); load(); }} />
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin" /></div>;
  if (error) return (
    <div className="text-center py-16 space-y-3">
      <p className="text-red-400 text-sm font-bold">{error}</p>
      <button onClick={onBack} className="px-4 py-2 rounded-xl bg-surface-container text-sm font-bold border border-outline-variant/20">Go Back</button>
    </div>
  );
  if (!group) return null;

  const myRole = group.members.find(m => m.is_me)?.role;
  const activeSession = group.active_session;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black font-headline text-on-surface truncate">{group.name}</h2>
          {group.subject && <p className="text-xs text-secondary font-bold">{group.subject}</p>}
        </div>
        <button onClick={leaveGroup} disabled={leaving}
          className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-all disabled:opacity-40">
          Leave
        </button>
      </div>

      {/* Active session banner */}
      {activeSession && (
        <div className="rounded-2xl border bg-secondary/10 border-secondary/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-widest text-outline">Active Session</p>
                {activeSession.session_type === 'pdf' && (
                  <span className="text-[9px] font-black bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full">PDF Mode</span>
                )}
              </div>
              <p className="text-sm font-black text-on-surface">{activeSession.title}</p>
              <p className="text-[11px] text-outline/60">
                {activeSession.session_type === 'pdf' ? 'Solve on paper · ' : `${activeSession.question_count} questions · `}
                {activeSession.time_limit && activeSession.started_at
                  ? `${fmt(Math.max(0, activeSession.time_limit - Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 1000)))} left`
                  : activeSession.time_limit
                  ? `${Math.round(activeSession.time_limit / 60)} min`
                  : 'Untimed'}
              </p>
            </div>
            <button onClick={() => joinExistingSession(activeSession)}
              className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-black hover:bg-secondary/90 transition-all shrink-0">
              Join Now
            </button>
          </div>
        </div>
      )}

      {/* Invite code + Start session */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/5 border border-secondary/15 rounded-2xl px-3 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-outline/60 mb-1">Invite Code</p>
          <p className="text-lg font-black tracking-[0.2em] text-secondary font-mono">{group.invite_code}</p>
          <button onClick={copyCode} className="mt-1.5 flex items-center gap-1 text-[10px] text-outline hover:text-secondary transition-colors font-bold">
            <span className="material-symbols-outlined text-xs">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {myRole === 'admin' && !activeSession && (
          <button onClick={() => setShowStartModal(true)}
            className="bg-secondary/10 border border-secondary/25 rounded-2xl px-3 py-3 flex flex-col items-start justify-between hover:bg-secondary/15 transition-all">
            <span className="material-symbols-outlined text-secondary text-xl mb-2">play_circle</span>
            <p className="text-sm font-black text-on-surface">Start Session</p>
            <p className="text-[10px] text-outline/50">Teacher paper · AI · Smart Hybrid</p>
          </button>
        )}
        {myRole !== 'admin' && !activeSession && (
          <div className="bg-surface-container border border-outline-variant/10 rounded-2xl px-3 py-3 flex flex-col justify-center items-center text-center">
            <span className="material-symbols-outlined text-outline text-xl mb-1">hourglass_empty</span>
            <p className="text-xs text-outline/60 font-bold">Waiting for admin to start session</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Members', value: `${group.member_count}/${group.max_members}`, icon: 'group' },
          { label: 'Your Role', value: myRole === 'admin' ? 'Admin' : 'Member', icon: myRole === 'admin' ? 'shield_person' : 'person' },
          { label: 'Invite Code', value: group.invite_code, icon: 'key' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container rounded-xl border border-outline-variant/10 p-3 text-center">
            <span className="material-symbols-outlined text-outline text-lg mb-1 block">{s.icon}</span>
            <p className="text-sm font-black text-on-surface">{s.value}</p>
            <p className="text-[10px] text-outline/60">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-highest rounded-xl p-1">
        {(['members', 'leaderboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-black capitalize transition-all ${tab === t ? 'bg-secondary/15 text-secondary' : 'text-outline hover:text-on-surface'}`}>
            {t === 'leaderboard' ? 'Leaderboard' : 'Members'}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="space-y-2">
          {group.members.map(m => (
            <div key={m.student_id}
              className={`bg-surface-container rounded-2xl border p-3.5 flex items-center gap-3 ${m.is_me ? 'border-secondary/30' : 'border-outline-variant/10'}`}>
              <Avatar url={m.avatar_url} name={m.username} size={10} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-black text-on-surface">{m.username}</span>
                  {m.is_me && <span className="text-[9px] font-black bg-secondary/15 text-secondary px-1.5 py-0.5 rounded-full">You</span>}
                  {m.role === 'admin' && <span className="text-[9px] font-black bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">Admin</span>}
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">Lv{m.level} · {m.total_xp.toLocaleString()} XP</span>
                {m.current_node && <p className="text-[10px] text-outline/50 mt-1 truncate">Studying: {m.current_node.title}</p>}
              </div>
              {m.streak > 0 && <div className="text-center shrink-0"><p className="text-lg">🔥</p><p className="text-[10px] font-black text-orange-400">{m.streak}d</p></div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-2">
          {leaderboard.map((entry: any) => (
            <div key={entry.student_id}
              className={`bg-surface-container rounded-2xl border p-3.5 flex items-center gap-3 ${entry.is_me ? 'border-secondary/30' : 'border-outline-variant/10'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' : entry.rank === 2 ? 'bg-slate-400/20 text-on-surface-variant' : entry.rank === 3 ? 'bg-orange-600/20 text-orange-400' : 'bg-surface-container-high text-outline'}`}>
                {entry.rank}
              </div>
              <Avatar url={entry.avatar_url} name={entry.username} size={9} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-black text-on-surface">{entry.username}</span>
                  {entry.is_me && <span className="text-[9px] font-black bg-secondary/15 text-secondary px-1.5 py-0.5 rounded-full">You</span>}
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">Lv{entry.level} · {entry.total_xp.toLocaleString()} XP</span>
              </div>
              {entry.streak > 0 && <div className="text-center shrink-0"><p>🔥</p><p className="text-[10px] font-black text-orange-400">{entry.streak}d</p></div>}
            </div>
          ))}
        </div>
      )}

      {showStartModal && (
        <StartSessionModal groupId={groupId} onClose={() => setShowStartModal(false)} onStarted={handleSessionStarted} />
      )}
    </div>
  );
}

// ── Group card ─────────────────────────────────────────────────────────────────
function GroupCard({ group, onClick }: { group: GroupSummary; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left bg-surface-container rounded-2xl border border-outline-variant/10 p-4 hover:border-secondary/30 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-secondary text-xl">group</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline/60">{group.member_count}/{group.max_members}</span>
          {group.active_session && (
            <span className="flex items-center gap-1 text-[9px] font-black text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {group.active_session.session_type === 'pdf' ? 'Live · PDF' : 'Live'}
            </span>
          )}
        </div>
      </div>
      <h3 className="text-sm font-black text-on-surface mb-0.5">{group.name}</h3>
      {group.subject && <p className="text-[11px] text-secondary font-bold mb-1">{group.subject}</p>}
      {group.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{group.description}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-outline/40 font-mono tracking-widest">{group.invite_code}</span>
        <span className="text-secondary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
          Open <span className="material-symbols-outlined text-sm">chevron_right</span>
        </span>
      </div>
    </button>
  );
}

// ── Live session types ────────────────────────────────────────────────────────
interface LiveSession {
  session_id: number; session_title: string; session_type: string;
  group_id: number; group_name: string; subject: string; invite_code: string;
  member_count: number; max_members: number; question_count: number;
  time_limit: number | null; started_at: string; created_by: string; is_member: boolean;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudyGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const fetchGroups = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('student/study-groups/'),
      api.get('student/study-groups/discover/'),
    ]).then(([gRes, dRes]) => {
      setGroups(gRes.data);
      setLiveSessions(dRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function quickJoin(session: LiveSession) {
    if (session.is_member) { setSelectedId(session.group_id); return; }
    setJoiningId(session.session_id);
    try {
      const r = await api.post('student/study-groups/join/', { invite_code: session.invite_code });
      setGroups(prev => prev.find(x => x.id === r.data.id) ? prev : [r.data, ...prev]);
      setSelectedId(r.data.id);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Could not join.');
    } finally { setJoiningId(null); }
  }

  function handleCreatedOrJoined(g: GroupSummary) {
    setShowModal(false);
    setGroups(prev => prev.find(x => x.id === g.id) ? prev : [g, ...prev]);
    setSelectedId(g.id);
  }

  if (selectedId) return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-xl mx-auto">
        <GroupDetailView groupId={selectedId} onBack={() => { setSelectedId(null); fetchGroups(); }} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors text-outline hover:text-on-surface">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-black font-headline text-on-surface">Study Groups</h1>
              <p className="text-xs text-slate-500">Solve together · Learn together</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary/15 text-secondary text-sm font-black border border-secondary/20 hover:bg-secondary/20 transition-all">
            <span className="material-symbols-outlined text-base">add</span>New
          </button>
        </div>

        {/* Live Now */}
        {liveSessions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest text-green-400">Live Now</p>
            </div>
            {liveSessions.map(s => (
              <div key={s.session_id}
                className="bg-surface-container rounded-2xl border border-green-500/20 p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-black text-on-surface truncate">{s.group_name}</p>
                    {s.session_type === 'pdf' && <span className="text-[9px] font-black bg-secondary/15 text-secondary px-1.5 py-0.5 rounded-full shrink-0">PDF</span>}
                  </div>
                  <p className="text-[11px] text-secondary font-bold">{s.subject || 'Study Session'}</p>
                  <p className="text-[10px] text-outline/50 mt-0.5">
                    {s.session_type === 'pdf' ? 'Paper-based · ' : `${s.question_count} q · `}
                    {s.member_count}/{s.max_members} members · by {s.created_by}
                  </p>
                </div>
                <button onClick={() => quickJoin(s)} disabled={joiningId === s.session_id}
                  className="px-4 py-2 rounded-xl bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-black hover:bg-green-500/25 transition-all disabled:opacity-50 shrink-0">
                  {joiningId === s.session_id ? '…' : s.is_member ? 'Rejoin' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map(i => <div key={i} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4 h-44 animate-pulse" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-secondary text-3xl">group</span>
            </div>
            <div>
              <p className="text-on-surface font-black text-base mb-1">No groups yet</p>
              <p className="text-slate-500 text-sm">Create one or join with an invite code.</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-xl bg-secondary/15 text-secondary font-black border border-secondary/20 hover:bg-secondary/20 transition-all">
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map(g => <GroupCard key={g.id} group={g} onClick={() => setSelectedId(g.id)} />)}
          </div>
        )}
      </div>

      {showModal && <CreateJoinModal onClose={() => setShowModal(false)} onDone={handleCreatedOrJoined} />}
    </div>
  );
}
