import { useState, useEffect } from 'react';
import { api, useAuth } from '../context/AuthContext';
import CourseBuilder from '../components/CourseBuilder';

// ─── Types ────────────────────────────────────────────────────────────────────
type ExamMode = 'ai' | 'manual' | 'hybrid' | 'course';
type NavTab = 'overview' | 'exam' | 'doubts' | 'course' | 'analytics' | 'approvals' | 'assigned';

// ─── Paper structure: mirrors backend calculate_marks_distribution exactly ─────
interface DistRow { type: string; label: string; count: number; marks: number; sec: string; }

function getPaperDistribution(totalMarks: number): DistRow[] {
  // Every bracket sums exactly to its target marks. Verified:
  // ≤15  → totalMarks × 1 = totalMarks
  // ≤20  → 4+2+4+6+4       = 20
  // ≤25  → 4+2+4+6+5+4     = 25
  // ≤30  → 4+2+6+9+5+4     = 30
  // ≤40  → 7+2+6+12+5+8    = 40
  // ≤50  → 10+2+8+12+10+8  = 50
  // ≤60  → 15+2+10+15+10+8 = 60
  // ≤70  → 11+2+12+18+15+12= 70
  // ≤80  → 11+2+14+21+20+12= 80
  // ≤90  → 12+2+14+21+25+16= 90
  // ≤100 → 16+2+16+21+25+20= 100
  if (totalMarks <= 15) return [
    { type: 'MCQ', label: 'MCQ (1-mark)', count: totalMarks, marks: 1, sec: 'Section A' },
  ];
  if (totalMarks <= 20) return [
    { type: 'MCQ',              label: 'MCQ',              count: 4,  marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 2,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 2,  marks: 3, sec: 'Section C' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 1,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 25) return [
    { type: 'MCQ',              label: 'MCQ',              count: 4,  marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 2,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 2,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 1,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 1,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 30) return [
    { type: 'MCQ',              label: 'MCQ',              count: 4,  marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 3,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 3,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 1,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 1,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 40) return [
    { type: 'MCQ',              label: 'MCQ',              count: 7,  marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 3,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 4,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 1,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 2,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 50) return [
    { type: 'MCQ',              label: 'MCQ',              count: 10, marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 4,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 4,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 2,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 2,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 60) return [
    { type: 'MCQ',              label: 'MCQ',              count: 15, marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 5,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 5,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 2,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 2,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 70) return [
    { type: 'MCQ',              label: 'MCQ',              count: 11, marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 6,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 6,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 3,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 3,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 80) return [
    { type: 'MCQ',              label: 'MCQ',              count: 11, marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 7,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 7,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 4,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 3,  marks: 4, sec: 'Section E' },
  ];
  if (totalMarks <= 90) return [
    { type: 'MCQ',              label: 'MCQ',              count: 12, marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 7,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 7,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 5,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 4,  marks: 4, sec: 'Section E' },
  ];
  // ≤100
  return [
    { type: 'MCQ',              label: 'MCQ',              count: 16, marks: 1, sec: 'Section A' },
    { type: 'ASSERTION_REASON', label: 'Assertion Reason', count: 2,  marks: 1, sec: 'Section A' },
    { type: 'VERY_SHORT',       label: 'Very Short (2m)',  count: 8,  marks: 2, sec: 'Section B' },
    { type: 'SHORT',            label: 'Short Answer (3m)',count: 7,  marks: 3, sec: 'Section C' },
    { type: 'LONG',             label: 'Long Answer (5m)', count: 5,  marks: 5, sec: 'Section D' },
    { type: 'CASE',             label: 'Case Study (4m)',  count: 5,  marks: 4, sec: 'Section E' },
  ];
}

/** Builds the CBSE structure description string to send to the AI */
function getPaperStructurePrompt(totalMarks: number): string {
  const dist = getPaperDistribution(totalMarks);
  const secA = dist.filter(r => r.sec === 'Section A');
  const secB = dist.find(r => r.sec === 'Section B');
  const secC = dist.find(r => r.sec === 'Section C');
  const secD = dist.find(r => r.sec === 'Section D');
  const secE = dist.find(r => r.sec === 'Section E');

  const parts: string[] = [];
  if (secA.length) {
    const mcq = secA.find(r => r.type === 'MCQ');
    const ar  = secA.find(r => r.type === 'ASSERTION_REASON');
    const desc = [mcq && `${mcq.count} MCQ`, ar && `${ar.count} Assertion-Reason`].filter(Boolean).join(' + ');
    parts.push(`Section A: ${desc} (1 mark each)`);
  }
  if (secB) parts.push(`Section B: ${secB.count} Very Short Answer (${secB.marks} marks each)`);
  if (secC) parts.push(`Section C: ${secC.count} Short Answer (${secC.marks} marks each)`);
  if (secD) parts.push(`Section D: ${secD.count} Long Answer (${secD.marks} marks each)`);
  if (secE) parts.push(`Section E: ${secE.count} Case Study (${secE.marks} marks each, with subparts 1+1+2)`);

  return `CBSE paper structure for ${totalMarks} marks — ${parts.join('; ')}.`;
}

// ─── Marks Distribution Panel ──────────────────────────────────────────────────
function MarksDistributionPanel({ marks }: { marks: number }) {
  const dist = getPaperDistribution(marks);
  const computed = dist.reduce((sum, r) => sum + r.count * r.marks, 0);
  const mismatch = computed !== marks;

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-6 h-fit">
      <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Marks Distribution</p>
      <h3 className="text-base font-black text-white font-headline mb-4">Question Breakdown</h3>
      <div className="space-y-0">
        {dist.map((row, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-outline-variant/10 last:border-0">
            <div>
              <span className="text-sm text-on-surface-variant">{row.label}</span>
              <span className="ml-2 text-[10px] text-outline font-bold">{row.sec}</span>
            </div>
            <div className="flex gap-3 text-xs items-center">
              <span className="text-outline">{row.count}Q</span>
              <span className="text-outline">×{row.marks}</span>
              <span className="text-white font-bold w-8 text-right">{row.count * row.marks}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 mt-1">
        <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Computed Total</span>
        <div className="flex items-center gap-2">
          {mismatch && (
            <span className="text-[10px] text-tertiary font-bold">≈{marks}M target</span>
          )}
          <span className={`font-black ${mismatch ? 'text-tertiary' : 'text-primary'}`}>{computed} marks</span>
        </div>
      </div>
      {mismatch && (
        <p className="text-[10px] text-outline mt-2 leading-relaxed">
          Standard CBSE pattern for this range totals {computed}M. Adjust Total Marks to {computed} for exact alignment.
        </p>
      )}
    </div>
  );
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',   icon: 'grid_view',      label: 'Overview' },
  { id: 'doubts',     icon: 'help_outline',   label: 'Doubt Solver' },
  { id: 'exam',       icon: 'science',        label: 'Exam Factory' },
  { id: 'analytics',  icon: 'bar_chart',      label: 'Analytics' },
  { id: 'assigned',   icon: 'edit_note',      label: 'Edit Courses' },
  { id: 'course',     icon: 'account_tree',   label: 'Course Builder' },
  { id: 'approvals',  icon: 'fact_check',     label: 'Approvals' },
];

// ─── Static doubt data (until a doubt backend model exists) ──────────────────
const PENDING_DOUBTS = [
  { id: 1, student: 'Arjun K.', subject: 'Physics', topic: 'Electromagnetic Induction', age: '1h ago', priority: 'high',
    text: "Could you explain why the induced current direction opposes the change in magnetic flux according to Lenz's law? The diagram in Figure 4.2 seems to contradict the right-hand rule..." },
  { id: 2, student: 'Sneha R.', subject: 'Mathematics', topic: 'Calculus: Integrals', age: '3h ago', priority: 'normal',
    text: "I'm struggling with the substitution method in question 14. When I set u = cos(x), the du part becomes problematic with the power of sin..." },
];

const RESOLVED_DOUBTS = [
  { id: 10, student: 'Rohan M.', subject: 'Chemistry', time: 'Yesterday, 6:20 PM',
    text: '"The oxidation state of Manganese here is..." ' },
  { id: 11, student: 'Priya G.', subject: 'Biology', time: 'Yesterday, 3:45 PM',
    text: '"The process of DNA transcription starts..."' },
  { id: 12, student: 'Kabir S.', subject: 'Physics', time: 'Wednesday, 12:30 PM',
    text: '"For a body in circular motion, the tension..."' },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, iconColor }: { icon: string; label: string; value: string; sub?: string; iconColor: string }) {
  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-surface-container-highest ${iconColor}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-black text-white font-headline">{value}</p>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-outline mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-3">{children}</p>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-surface-container-highest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors";

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TeacherPanel() {
  const { user } = useAuth();
  const [navTab, setNavTab] = useState<NavTab>('overview');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [examMode, setExamMode] = useState<ExamMode>('ai');
  const [loading, setLoading] = useState(false);

  // AI Generator State
  const [board, setBoard] = useState('CBSE');
  const [grade, setGrade] = useState('10th');
  const [subject, setSubject] = useState('Mathematics');
  const [chapter, setChapter] = useState('');
  const [marks, setMarks] = useState(80);
  const [difficulty, setDifficulty] = useState('medium');
  const [customInstructions, setCustomInstructions] = useState('');

  // Manual Generator State
  const [libGrade, setLibGrade] = useState('10');
  const [libSubject, setLibSubject] = useState('');
  const [libChapter, setLibChapter] = useState('');
  const [libType, setLibType] = useState('MCQ');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [libraryQs, setLibraryQs] = useState<any[]>([]);
  const [paperTitle, setPaperTitle] = useState('Custom Generated Exam');
  const [manualSections, setManualSections] = useState<any[]>([
    { type: 'MCQ',              name: 'Section A – MCQs',            questions: [] },
    { type: 'ASSERTION_REASON', name: 'Section A2 – Assertion Reason', questions: [] },
    { type: 'VERY_SHORT',       name: 'Section B – Very Short',       questions: [] },
    { type: 'SHORT',            name: 'Section C – Short Answer',     questions: [] },
    { type: 'LONG',             name: 'Section D – Long Answer',      questions: [] },
    { type: 'CASE',             name: 'Section E – Case Study',       questions: [] },
  ]);

  // Full AI: sections + progress step
  const [numSections, setNumSections] = useState(3);
  const [aiStep, setAiStep] = useState(0); // 0=idle 1=analyzing 2=generating 3=structuring 4=compiling

  // Full AI: editable marks distribution
  const distFromMarks = (total: number) =>
    getPaperDistribution(total).map(r => ({ label: r.label, count: r.count, marks: r.marks }));

  const [aiDistRows, setAiDistRows] = useState(() => distFromMarks(80));

  useEffect(() => {
    setAiDistRows(distFromMarks(marks));
  }, [marks]);

  const updateDistRow = (i: number, field: 'count' | 'marks', val: number) => {
    setAiDistRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: Math.max(0, val) } : r));
  };

  // Chapter chips for Smart Hybrid
  const [chapterChips, setChapterChips] = useState<string[]>([]);
  const [chipInput, setChipInput] = useState('');

  const addChip = () => {
    const v = chipInput.trim();
    if (v && !chapterChips.includes(v)) setChapterChips(prev => [...prev, v]);
    setChipInput('');
  };
  const removeChip = (c: string) => setChapterChips(prev => prev.filter(x => x !== c));

  // Custom Question State
  const [cqText, setCqText] = useState('');
  const [cqMarks, setCqMarks] = useState(1);
  const [cqType, setCqType] = useState('MCQ');
  const [customQuestionsRaw, setCustomQuestionsRaw] = useState<any[]>([]);

  // Approvals state (admin only)
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // Assigned courses (teacher edit mode)
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
  const [editUnitId, setEditUnitId] = useState<number | null>(null);

  // Papers display
  const [papers, setPapers] = useState<any[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const fetchPapers = async () => {
    try {
      const res = await api.get('/ai/generate-paper/');
      setPapers(res.data);
    } catch (err) {
      console.error('Failed to fetch papers', err);
    }
  };

  const fetchPendingCourses = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await api.get('/teacher/courses/pending/');
      setPendingCourses(res.data);
    } catch (err) {
      console.error('Failed to fetch pending courses', err);
    }
  };

  const fetchAssignedCourses = async () => {
    if (user?.role !== 'teacher' && user?.role !== 'admin') return;
    try {
      const res = await api.get('/teacher/courses/assigned/');
      setAssignedCourses(res.data);
    } catch (err) {
      console.error('Failed to fetch assigned courses', err);
    }
  };

  useEffect(() => {
    fetchPendingCourses();
    fetchAssignedCourses();
  }, [user?.role]);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    setApprovingId(id);
    try {
      const res = await api.post(`/teacher/courses/${id}/review/`, { action });
      alert(res.data.message);
      setPendingCourses(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Action failed');
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    fetchPapers();
    const interval = setInterval(fetchPapers, 5000);
    // Clock for elapsed-time display on pending papers
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  // Fetch distinct subjects once when entering manual mode
  useEffect(() => {
    if (examMode !== 'manual') return;
    api.get('/ai/questions/meta/').then(r => {
      setAvailableSubjects(r.data.subjects ?? []);
      if (!libSubject && r.data.subjects?.length) setLibSubject(r.data.subjects[0]);
    }).catch(console.error);
  }, [examMode]);

  // Fetch chapters whenever subject changes
  useEffect(() => {
    if (!libSubject) return;
    setLibChapter('');
    setAvailableChapters([]);
    api.get(`/ai/questions/meta/?subject=${encodeURIComponent(libSubject)}`).then(r => {
      setAvailableChapters(r.data.chapters ?? []);
      if (r.data.chapters?.length) setLibChapter(r.data.chapters[0]);
    }).catch(console.error);
  }, [libSubject]);

  useEffect(() => {
    if (examMode === 'manual' && libSubject && libChapter) fetchLibrary();
  }, [libSubject, libChapter, libType, examMode]);

  const fetchLibrary = async () => {
    try {
      const res = await api.get(`/ai/questions/?subject=${encodeURIComponent(libSubject)}&chapter=${encodeURIComponent(libChapter)}&type=${encodeURIComponent(libType)}`);
      setLibraryQs(res.data);
    } catch (err) {
      console.error('Failed to fetch library', err);
    }
  };

  const addToBin = (q: any) => {
    setManualSections(prev =>
      prev.map(sec =>
        sec.type === q.question_type && !sec.questions.some((e: any) => e.id === q.id)
          ? { ...sec, questions: [...sec.questions, q] }
          : sec
      )
    );
  };

  const removeFromBin = (type: string, id: any) => {
    setManualSections(prev =>
      prev.map(sec =>
        sec.type === type
          ? { ...sec, questions: sec.questions.filter((q: any) => q.id !== id) }
          : sec
      )
    );
    if (typeof id === 'string' && id.startsWith('custom-')) {
      setCustomQuestionsRaw(prev => prev.filter(c => 'custom-' + c.tempId !== id));
    }
  };

  const moveItem = (type: string, index: number, dir: number) => {
    setManualSections(prev =>
      prev.map(sec => {
        if (sec.type !== type) return sec;
        const ni = index + dir;
        if (ni < 0 || ni >= sec.questions.length) return sec;
        const qs = [...sec.questions];
        [qs[index], qs[ni]] = [qs[ni], qs[index]];
        return { ...sec, questions: qs };
      })
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cqText) return;
    const cId = Date.now();
    const cqObj = { tempId: cId, id: 'custom-' + cId, question_type: cqType, marks: cqMarks, difficulty: 'medium', question_text: cqText, answer_text: '' };
    setCustomQuestionsRaw(prev => [...prev, { type: cqType, marks: cqMarks, difficulty: 'medium', question_text: cqText, answer_text: '', section_type: cqType }]);
    addToBin(cqObj);
    setCqText('');
  };

  const handleCompileManual = async () => {
    const payloadSections = manualSections
      .filter(s => s.questions.length > 0)
      .map(s => ({ type: s.type, name: s.name, questions: s.questions.map((q: any) => q.id) }));

    if (payloadSections.length === 0) {
      alert('Add at least one question to the bin first.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/ai/manual-paper/', {
        title: paperTitle,
        board,
        grade,
        subject: libSubject,
        sections: payloadSections,
        custom_questions: customQuestionsRaw,
      });
      await fetchPapers();
      alert('Paper queued for compilation. Your PDF will appear in "Generated History" below once ready (usually under a minute).');
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.response?.data?.error ?? err?.message ?? 'Unknown error';
      alert(`Compilation failed: ${detail}`);
      console.error('Manual compile error:', err?.response?.data ?? err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedChapters = chapterChips.length > 0 ? chapterChips : (chapter.trim() ? [chapter.trim()] : []);
    if (resolvedChapters.length === 0) {
      alert('Please enter at least one chapter before generating.');
      return;
    }

    setLoading(true);
    setAiStep(1);
    try {
      const structureHint = getPaperStructurePrompt(marks);
      const distHint = aiDistRows.map(r => `${r.label}: ${r.count}×${r.marks}m`).join(', ');
      const fullInstructions = [structureHint, distHint, customInstructions].filter(Boolean).join(' ');
      setAiStep(2);
      const res = await api.post('/ai/generate-paper/', {
        board, grade, subject,
        chapters: resolvedChapters,
        chapter: resolvedChapters[0],
        paper_type: 'Standard Unit Test',
        max_marks: marks,
        difficulty,
        include_answers: true,
        custom_instructions: fullInstructions,
      });
      setAiStep(3);
      await new Promise(r => setTimeout(r, 600));
      setAiStep(4);
      await new Promise(r => setTimeout(r, 800));
      alert('AI Synthesis Triggered: ' + res.data.message);
      fetchPapers();
    } catch (err: any) {
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message ?? 'Unknown error';
      alert('Failed to trigger AI Synthesis.\n\n' + detail);
    }
    setLoading(false);
    setAiStep(0);
  };

  const totalMarks = manualSections.reduce((acc, sec) => acc + sec.questions.reduce((s: number, q: any) => s + (q.marks || 0), 0), 0);
  const totalQs    = manualSections.reduce((acc, sec) => acc + sec.questions.length, 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex pt-16">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 fixed left-0 top-16 h-[calc(100vh-4rem)] bg-surface-container border-r border-outline-variant/10 z-40 py-5 px-3">
        {/* Identity */}
        <div className="px-3 mb-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-outline/60 mb-2">Instructor Portal</p>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-lg">school</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-none truncate">{user?.username || 'Educator'}</p>
              <p className="text-outline text-[10px] mt-0.5">Senior Educator</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map(item => {
            if (item.id === 'course' && user?.role !== 'admin' && user?.role !== 'teacher' && !user?.can_build_courses) return null;
            if (item.id === 'approvals' && user?.role !== 'admin') return null;
            if (item.id === 'assigned' && user?.role !== 'teacher' && user?.role !== 'admin') return null;
            const active = navTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNavTab(item.id as NavTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
                {item.id === 'approvals' && pendingCourses.length > 0 && (
                  <span className="ml-auto text-[10px] font-black bg-tertiary text-on-tertiary rounded-full w-4 h-4 flex items-center justify-center">{pendingCourses.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Generate Exam CTA */}
        <button
          onClick={() => setNavTab('exam')}
          className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg"
        >
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          Generate Exam
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="md:ml-60 flex-1 p-6 pb-16">
        <div className="max-w-6xl mx-auto">

          {/* ── KPI Row (Overview) ── */}
          {navTab === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <KpiCard icon="pending_actions" label="Pending Doubts"    value={String(PENDING_DOUBTS.length)}      sub="4 High Priority"         iconColor="text-error" />
              <KpiCard icon="task_alt"        label="Doubts Resolved"   value={String(RESOLVED_DOUBTS.length + 139)} sub="+12% from last week"   iconColor="text-secondary" />
              <KpiCard icon="schedule"        label="Avg Response Time" value="18m"                                 sub="Top 5% of Educators"    iconColor="text-primary" />
            </div>
          )}

          {/* ── KPI Row (Exam/other tabs) ── */}
          {navTab !== 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <KpiCard icon="quiz"            label="Questions Available" value="1,248"                             sub="Across all subjects"    iconColor="text-primary" />
              <KpiCard icon="description"     label="Papers Generated"   value={String(papers.length)}             sub="All time"               iconColor="text-secondary" />
              <KpiCard icon="pending_actions" label="Compiling"          value={String(papers.filter(p => !p.pdf_url).length)} sub="In queue"   iconColor="text-tertiary" />
            </div>
          )}

          {/* ── Overview Tab ── */}
          {navTab === 'overview' && (
            <div className="grid lg:grid-cols-[1fr_300px] gap-6">
              {/* Left: Pending Doubts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-black font-headline text-white">Pending Doubts</h2>
                  <span className="text-[10px] text-outline font-bold uppercase tracking-widest">Auto-refresh in 30s</span>
                </div>

                {PENDING_DOUBTS.map(doubt => (
                  <div key={doubt.id} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-primary font-black text-xs">{doubt.student[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-none">{doubt.student}</p>
                          <p className="text-[10px] text-outline mt-0.5">{doubt.subject} · {doubt.topic}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doubt.priority === 'high' && (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-error/10 text-error px-2 py-0.5 rounded-full border border-error/20">High</span>
                        )}
                        <span className="text-[10px] text-outline">{doubt.age}</span>
                      </div>
                    </div>

                    {/* Doubt text */}
                    <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{doubt.text}</p>

                    {/* Reply area */}
                    {replyingTo === doubt.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface border border-outline-variant/15 focus:outline-none focus:border-primary/50 resize-none placeholder:text-outline/50"
                          rows={3}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your expert explanation here..."
                        />
                        <div className="flex gap-2">
                          <button
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:brightness-110 transition-all"
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          >
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Mark as Resolved
                          </button>
                          <button
                            className="px-4 py-2 rounded-lg text-outline text-xs font-bold hover:text-on-surface transition-all"
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                        onClick={() => setReplyingTo(doubt.id)}
                      >
                        <span className="material-symbols-outlined text-sm">reply</span>
                        Reply
                      </button>
                    )}
                  </div>
                ))}

                {/* Generate Exam Paper section */}
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                    <h2 className="text-lg font-black font-headline text-white">Generate Exam Paper</h2>
                  </div>
                  <p className="text-outline text-xs mb-5">Create assessments tailored to current chapter progress.</p>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { id: 'manual', icon: 'list_alt',     title: 'Manual Picker',  desc: 'Total control. Browse our exhaustive question bank and hand-pick every problem for the paper.',    cta: 'Start Manual Session', color: 'border-outline-variant/15' },
                      { id: 'hybrid', icon: 'tune',          title: 'Smart Hybrid',   desc: 'Define difficulty and chapter weightings. We\'ll suggest a mix of classic and new AI-refined questions.', cta: 'Launch Configurator', color: 'border-primary/30', badge: 'RECOMMENDED', btnCls: 'bg-primary text-on-primary' },
                      { id: 'ai',     icon: 'auto_awesome',  title: 'Full AI',        desc: 'Instant generation. Describe your learning goal, and our LLM will build a completely unique assessment.',  cta: 'Generate via AI',     color: 'border-outline-variant/15' },
                    ].map(mode => (
                      <div
                        key={mode.id}
                        className={`bg-surface-container rounded-2xl border p-5 flex flex-col gap-3 hover:bg-surface-container-high transition-all cursor-pointer ${mode.color}`}
                        onClick={() => { setNavTab('exam'); setExamMode(mode.id as ExamMode); }}
                      >
                        {mode.badge && (
                          <span className="self-start text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{mode.badge}</span>
                        )}
                        <span className="material-symbols-outlined text-on-surface-variant text-2xl">{mode.icon}</span>
                        <div>
                          <h4 className="text-sm font-black text-white mb-1">{mode.title}</h4>
                          <p className="text-[11px] text-outline leading-relaxed">{mode.desc}</p>
                        </div>
                        <button
                          className={`mt-auto w-full py-2 rounded-lg text-xs font-bold border border-outline-variant/20 hover:border-primary/30 transition-all ${mode.btnCls ?? 'text-on-surface-variant bg-surface-container-highest hover:text-on-surface'}`}
                        >
                          {mode.cta}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Resolved History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black font-headline text-white">Resolved History</h2>
                  <button className="text-primary text-xs font-bold hover:underline">View Full Archive</button>
                </div>
                <div className="space-y-3">
                  {RESOLVED_DOUBTS.map(r => (
                    <div key={r.id} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-white">{r.student}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">Resolved</span>
                      </div>
                      <p className="text-[10px] text-outline mb-1">{r.subject} · {r.time}</p>
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed italic">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Doubt Solver ── */}
          {navTab === 'doubts' && (
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-10 flex flex-col items-center justify-center min-h-[40vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">help_outline</span>
              </div>
              <h2 className="text-xl font-black font-headline text-white mb-2">Doubt Queue</h2>
              <p className="text-outline text-sm max-w-xs">Student doubt resolution will appear here once students start submitting questions from their lesson pages.</p>
            </div>
          )}

          {/* ── Edit Assigned Courses ── */}
          {navTab === 'assigned' && (user?.role === 'teacher' || user?.role === 'admin') && (
            editUnitId ? (
              <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setEditUnitId(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to My Courses
                  </button>
                </div>
                <CourseBuilder editUnitId={editUnitId} onEditDone={() => { setEditUnitId(null); fetchAssignedCourses(); }} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionLabel>Assigned to You</SectionLabel>
                    <h2 className="text-xl font-black font-headline text-white">Edit Courses</h2>
                    <p className="text-outline text-xs mt-1">Courses assigned to you by an admin for editing.</p>
                  </div>
                  <button
                    onClick={fetchAssignedCourses}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/20 text-outline hover:text-on-surface hover:border-outline-variant/40 text-xs font-bold transition-all"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    Refresh
                  </button>
                </div>

                {assignedCourses.length === 0 ? (
                  <div className="bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/15 p-16 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant/40 mb-3">edit_note</span>
                    <h3 className="text-sm font-black text-white mb-1">No Courses Assigned</h3>
                    <p className="text-outline text-xs max-w-xs">An admin will assign courses to you when they need edits.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignedCourses.map(course => (
                      <div key={course.id} className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-xl">{course.icon || 'school'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white truncate">{course.title}</p>
                          <p className="text-[11px] text-outline mt-0.5">
                            {course.subject} · Grade {course.class_grade}
                            {course.board ? ` · ${course.board}` : ''}
                            · {course.chapters} ch · {course.nodes} nodes
                          </p>
                        </div>
                        <button
                          onClick={() => setEditUnitId(course.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                          Edit Course
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── Course Builder ── */}
          {navTab === 'course' && (user?.role === 'admin' || user?.role === 'teacher' || user?.can_build_courses) && (
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-6">
              <SectionLabel>{user?.role === 'admin' ? 'Admin' : 'Teacher'}</SectionLabel>
              <h2 className="text-xl font-black font-headline text-white mb-6">Course Framework Builder</h2>
              <CourseBuilder />
            </div>
          )}

          {/* ── Approvals ── */}
          {navTab === 'approvals' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel>Admin Review</SectionLabel>
                  <h2 className="text-xl font-black font-headline text-white">Course Approvals</h2>
                  <p className="text-outline text-xs mt-1">Review and approve courses submitted by teachers.</p>
                </div>
                <button
                  onClick={fetchPendingCourses}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/20 text-outline hover:text-on-surface hover:border-outline-variant/40 text-xs font-bold transition-all"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Refresh
                </button>
              </div>

              {pendingCourses.length === 0 ? (
                <div className="bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-secondary">fact_check</span>
                  </div>
                  <h3 className="text-base font-black text-white mb-1">All Clear</h3>
                  <p className="text-outline text-sm max-w-xs">No courses pending review. Any teacher submissions will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingCourses.map(course => (
                    <div key={course.id} className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl">
                          <span className="material-symbols-outlined text-primary text-2xl">{course.icon || 'school'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h3 className="text-base font-black text-white leading-tight">{course.title}</h3>
                              <p className="text-xs text-outline mt-0.5">{course.subject} · Grade {course.class_grade} · {course.board}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full border border-tertiary/20">Pending Review</span>
                            </div>
                          </div>
                          {course.description && (
                            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed line-clamp-2">{course.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-outline">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">menu_book</span>
                              {course.chapters} chapter{course.chapters !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">account_tree</span>
                              {course.nodes} node{course.nodes !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-outline-variant/10">
                        <button
                          onClick={() => handleReview(course.id, 'approve')}
                          disabled={approvingId === course.id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary text-sm font-bold hover:bg-secondary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          {approvingId === course.id ? 'Processing…' : 'Approve & Publish'}
                        </button>
                        <button
                          onClick={() => handleReview(course.id, 'reject')}
                          disabled={approvingId === course.id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-bold hover:bg-error/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-base">cancel</span>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Exam Factory ── */}
          {navTab === 'exam' && (
            <>
              {/* Mode Selector */}
              <div className="flex gap-2 mb-6 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/10 w-fit">
                {[
                  { id: 'ai',     icon: 'auto_awesome',   label: 'Full AI' },
                  { id: 'hybrid', icon: 'tune',           label: 'Smart Hybrid' },
                  { id: 'manual', icon: 'list_alt',       label: 'Manual Picker' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setExamMode(m.id as ExamMode)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      examMode === m.id
                        ? 'bg-primary text-on-primary shadow-lg'
                        : 'text-on-surface-variant hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                    {m.label}
                    {m.id === 'hybrid' && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full">REC</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Full AI Generator ── */}
              {examMode === 'ai' && (() => {
                const aiComputed = aiDistRows.reduce((s, r) => s + r.count * r.marks, 0);
                const aiMismatch = aiComputed !== marks;
                const steps = ['Analyzing requirements', 'Generating questions', 'Structuring sections', 'Compiling LaTeX PDF'];
                return (
                  <div className="max-w-4xl mx-auto space-y-8">
                    {/* Centered header */}
                    <div className="text-center">
                      <h1 className="text-4xl font-black font-headline text-on-surface mb-3 tracking-tight">AI Exam Generator</h1>
                      <div className="flex items-center justify-center gap-4 text-outline text-sm flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-secondary">verified</span>
                          Fully AI-powered
                        </span>
                        <span className="w-1 h-1 rounded-full bg-outline-variant inline-block" />
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">database_off</span>
                          No question bank required
                        </span>
                        <span className="w-1 h-1 rounded-full bg-outline-variant inline-block" />
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-tertiary">auto_awesome</span>
                          Any topic
                        </span>
                      </div>
                    </div>

                    {/* Main card */}
                    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-2xl overflow-hidden">
                      <form onSubmit={handleAIGenerate} className="p-8 space-y-8">

                        {/* 2×2 inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Field label="Board">
                            <select className={inputCls} value={board} onChange={e => setBoard(e.target.value)}>
                              <option>CBSE</option><option>ICSE</option><option>IB Curriculum</option><option>IGCSE</option>
                            </select>
                          </Field>
                          <Field label="Grade">
                            <select className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}>
                              <option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option>
                            </select>
                          </Field>
                          <Field label="Subject">
                            <input className={inputCls} placeholder="e.g. Physics" value={subject} onChange={e => setSubject(e.target.value)} required />
                          </Field>
                          <Field label="Topic / Chapter">
                            <input className={inputCls} placeholder="e.g. Quantum Physics" value={chapter} onChange={e => setChapter(e.target.value)} required />
                          </Field>
                          <Field label="Total Marks">
                            <input className={inputCls} type="number" value={marks} onChange={e => setMarks(Number(e.target.value))} required />
                          </Field>
                          <Field label="Difficulty">
                            <div className="grid grid-cols-4 gap-2">
                              {(['easy', 'medium', 'hard', 'mixed'] as const).map(d => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setDifficulty(d)}
                                  className={`py-2.5 rounded-xl text-xs font-black capitalize border transition-all ${
                                    difficulty === d
                                      ? 'bg-primary/10 border-primary text-primary'
                                      : 'bg-surface-container-lowest border-outline-variant/15 text-outline hover:text-on-surface hover:border-outline-variant/30'
                                  }`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </Field>
                        </div>

                        {/* Number of sections */}
                        <Field label="Number of Sections">
                          <div className="flex gap-4">
                            {[2, 3, 4].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setNumSections(n)}
                                className={`flex-1 py-3 text-center rounded-xl font-black text-sm border transition-all ${
                                  numSections === n
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-outline-variant/15 bg-surface-container-lowest text-outline hover:border-outline-variant/30 hover:text-on-surface'
                                }`}
                              >
                                {n} Sections
                              </button>
                            ))}
                          </div>
                        </Field>

                        {/* Custom instructions */}
                        <Field label="Custom Instructions">
                          <textarea
                            className={`${inputCls} resize-none`}
                            rows={3}
                            placeholder="Focus more on numerical problems, include at least one case-based study..."
                            value={customInstructions}
                            onChange={e => setCustomInstructions(e.target.value)}
                          />
                        </Field>

                        {/* Marks distribution table */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-outline uppercase tracking-widest px-1">Marks Distribution</h3>
                          <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10">
                            <table className="w-full text-sm text-left">
                              <thead>
                                <tr className="bg-surface-container-high/40 text-outline text-xs">
                                  <th className="px-4 py-3 font-bold">Question Type</th>
                                  <th className="px-4 py-3 font-bold text-center">Num Questions</th>
                                  <th className="px-4 py-3 font-bold text-center">Marks / Ques</th>
                                  <th className="px-4 py-3 font-bold text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/10">
                                {aiDistRows.map((row, i) => (
                                  <tr key={i} className="hover:bg-surface-container/30 transition-colors">
                                    <td className="px-4 py-3 text-on-surface font-medium">{row.label}</td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        className="w-16 mx-auto block bg-transparent border-none text-center focus:ring-0 focus:outline-none text-on-surface text-sm"
                                        value={row.count}
                                        onChange={e => updateDistRow(i, 'count', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        className="w-16 mx-auto block bg-transparent border-none text-center focus:ring-0 focus:outline-none text-on-surface text-sm"
                                        value={row.marks}
                                        onChange={e => updateDistRow(i, 'marks', Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-on-surface">{row.count * row.marks}</td>
                                  </tr>
                                ))}
                                <tr className="bg-surface-container-high/25">
                                  <td colSpan={3} className="px-4 py-3 font-black text-on-surface">Total</td>
                                  <td className={`px-4 py-3 text-right font-black text-lg ${aiMismatch ? 'text-error' : 'text-secondary'}`}>
                                    {aiComputed} / {marks}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          {aiMismatch && (
                            <p className="flex items-center gap-1.5 text-[11px] text-error font-medium px-1">
                              <span className="material-symbols-outlined text-sm">error</span>
                              Marks distribution ({aiComputed}) does not match Total Marks ({marks}).
                            </p>
                          )}
                        </div>

                        {/* Info banner */}
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
                          <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                          <p className="text-sm text-primary-fixed-dim leading-relaxed">
                            This paper will be saved to the database and may be surfaced to students for practice. AI-generated papers are reviewed periodically to ensure curriculum alignment.
                          </p>
                        </div>

                        {/* Generate button + progress */}
                        <div className="space-y-5">
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#d29922', color: '#0a0e14', boxShadow: '0 10px 30px rgba(210,153,34,0.15)' }}
                          >
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            {loading ? 'Generating…' : 'Generate with AI'}
                          </button>

                          {/* 4-step progress indicator */}
                          {aiStep > 0 && (
                            <div className="flex flex-col items-center gap-3 py-1">
                              <div className="flex items-center gap-1">
                                {steps.map((_, i) => (
                                  <span
                                    key={i}
                                    className={`h-1.5 w-8 rounded-full transition-all ${
                                      i + 1 < aiStep ? 'bg-secondary' :
                                      i + 1 === aiStep ? 'bg-outline animate-pulse' :
                                      'bg-surface-container-highest'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-[11px] font-black uppercase tracking-widest text-outline">
                                {steps.map((label, i) => (
                                  <span key={i} className="flex items-center gap-1">
                                    {i > 0 && <span className="material-symbols-outlined text-xs text-outline/40">chevron_right</span>}
                                    <span className={
                                      i + 1 < aiStep ? 'text-secondary flex items-center gap-1' :
                                      i + 1 === aiStep ? 'text-on-surface animate-pulse' :
                                      'text-outline/40'
                                    }>
                                      {label}
                                      {i + 1 < aiStep && <span className="material-symbols-outlined text-xs">check_circle</span>}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}

              {/* ── Smart Hybrid ── */}
              {examMode === 'hybrid' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-[1fr_300px] gap-6">
                    {/* Config panel */}
                    <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-6 space-y-5">
                      <div>
                        <SectionLabel>Paper Configuration</SectionLabel>
                        <h2 className="text-xl font-black font-headline text-white">Smart Exam Generator</h2>
                        <p className="text-outline text-xs mt-1">Pulls from question bank · AI fills the gaps</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Board">
                          <select className={inputCls} value={board} onChange={e => setBoard(e.target.value)}>
                            <option>CBSE</option><option>ICSE</option>
                          </select>
                        </Field>
                        <Field label="Grade">
                          <select className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}>
                            <option>9th</option><option>10th</option><option>11th</option><option>12th</option>
                          </select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Difficulty">
                          <select className={inputCls} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </Field>
                        <Field label="Subject">
                          <input className={inputCls} placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} required />
                        </Field>
                      </div>

                      {/* Chapter chips */}
                      <Field label="Chapters / Topics">
                        <div className="flex flex-wrap gap-2 p-3 bg-surface-container-highest rounded-xl border border-outline-variant/20 min-h-[44px]">
                          {chapterChips.map(c => (
                            <span key={c} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold">
                              {c}
                              <button type="button" onClick={() => removeChip(c)} className="hover:text-error transition-colors leading-none">×</button>
                            </span>
                          ))}
                          <input
                            className="flex-1 min-w-[160px] bg-transparent text-sm text-on-surface placeholder:text-outline/50 outline-none"
                            placeholder='+ Add Chapter or "Chapter: Subtopic"'
                            value={chipInput}
                            onChange={e => setChipInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip(); } }}
                            onBlur={addChip}
                          />
                        </div>
                        <p className="text-[10px] text-outline mt-1.5">
                          Tip: Use <span className="text-primary font-bold">Chapter: Subtopic</span> to focus on specific topics, e.g. <em>Polynomials: Zeros of Polynomials</em>
                        </p>
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Total Marks">
                          <input className={inputCls} type="number" value={marks} onChange={e => setMarks(Number(e.target.value))} required />
                        </Field>
                        <Field label="Custom Instructions">
                          <input className={inputCls} placeholder="Include focus on word problems..." value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} />
                        </Field>
                      </div>

                      {/* AI auto-fill toggle */}
                      <div className="flex items-start gap-4 p-4 bg-surface-container-highest rounded-xl border border-outline-variant/10">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">Auto-fill with AI if bank is insufficient</p>
                          <p className="text-xs text-outline leading-relaxed mt-0.5">
                            Our intelligence engine will synthesise high-quality questions matching CBSE standards if the internal vault doesn't meet your quota.
                          </p>
                        </div>
                        <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer shrink-0 mt-0.5">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Marks distribution + Data Insight */}
                    <div className="flex flex-col gap-4">
                      <MarksDistributionPanel marks={marks} />
                      <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-outline mb-3">Data Insight</p>
                        <div className="space-y-2">
                          {[
                            { label: 'Conceptual', pct: 72, color: 'bg-primary' },
                            { label: 'Application', pct: 28, color: 'bg-secondary' },
                          ].map(item => (
                            <div key={item.label}>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-on-surface-variant">{item.label}</span>
                                <span className="text-on-surface">{item.pct}%</span>
                              </div>
                              <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-outline mt-3">Difficulty profile: 72% Conceptual; 28% Application</p>
                      </div>
                    </div>
                  </div>

                  {/* Full-width compile button */}
                  <button
                    onClick={handleAIGenerate as any}
                    disabled={loading}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-tertiary to-tertiary-container text-on-tertiary font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg"
                  >
                    <span className="material-symbols-outlined text-xl">tune</span>
                    {loading ? 'Compiling Smart Test Array...' : 'Compile Smart Test Array'}
                  </button>

                  {/* Step progress indicator */}
                  <div className="flex items-center gap-0">
                    {[
                      { n: 1, label: 'Fetching from question bank', active: loading },
                      { n: 2, label: 'AI generating missing questions', active: false },
                      { n: 3, label: 'Compiling LaTeX PDF', active: false },
                    ].map((step, i) => (
                      <div key={step.n} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                            step.active
                              ? 'bg-secondary border-secondary text-on-secondary shadow-[0_0_12px_rgba(39,166,64,0.4)]'
                              : 'bg-surface-container border-outline-variant/30 text-outline'
                          }`}>
                            {step.n}
                          </div>
                          <p className={`text-[10px] mt-1.5 font-bold text-center leading-tight ${step.active ? 'text-secondary' : 'text-outline'}`}>
                            {step.label}
                          </p>
                        </div>
                        {i < 2 && <div className="h-px w-8 bg-outline-variant/20 mb-5 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Manual Picker ── */}
              {examMode === 'manual' && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Question Library */}
                  <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-6 flex flex-col">
                    <SectionLabel>Question Library</SectionLabel>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-black font-headline text-white">Browse Questions</h2>
                      <span className="text-xs text-outline">{libraryQs.length} found</span>
                    </div>

                    {/* Filters — cascading dropdowns */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Field label="Grade">
                        <select className={inputCls} value={libGrade} onChange={e => setLibGrade(e.target.value)}>
                          {['9','10','11','12'].map(g => (
                            <option key={g} value={g}>Grade {g}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Subject">
                        <select
                          className={inputCls}
                          value={libSubject}
                          onChange={e => setLibSubject(e.target.value)}
                          disabled={availableSubjects.length === 0}
                        >
                          {availableSubjects.length === 0
                            ? <option value="">Loading…</option>
                            : availableSubjects.map(s => <option key={s} value={s}>{s}</option>)
                          }
                        </select>
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <Field label="Chapter">
                        <select
                          className={inputCls}
                          value={libChapter}
                          onChange={e => setLibChapter(e.target.value)}
                          disabled={availableChapters.length === 0}
                        >
                          {availableChapters.length === 0
                            ? <option value="">Select subject first</option>
                            : availableChapters.map(c => <option key={c} value={c}>{c}</option>)
                          }
                        </select>
                      </Field>
                      <Field label="Question Type">
                        <select className={inputCls} value={libType} onChange={e => setLibType(e.target.value)}>
                          <option value="MCQ">MCQ</option>
                          <option value="ASSERTION_REASON">Assertion &amp; Reason</option>
                          <option value="VERY_SHORT">Very Short</option>
                          <option value="SHORT">Short Answer</option>
                          <option value="LONG">Long Answer</option>
                          <option value="CASE">Case Study</option>
                        </select>
                      </Field>
                    </div>

                    {/* Question list */}
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[460px] pr-1 no-scrollbar">
                      {libraryQs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                          <span className="material-symbols-outlined text-3xl text-outline mb-2">search_off</span>
                          <p className="text-outline text-sm">No questions match this filter.</p>
                        </div>
                      ) : libraryQs.map(q => (
                        <div key={q.id} className="group flex items-start gap-3 p-4 bg-surface-container-high rounded-xl border border-outline-variant/10 hover:border-primary/20 transition-all">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                q.difficulty === 'hard' ? 'bg-error/10 text-error' :
                                q.difficulty === 'medium' ? 'bg-tertiary/10 text-tertiary' :
                                'bg-secondary/10 text-secondary'
                              }`}>{q.difficulty}</span>
                              <span className="text-[10px] text-outline font-bold">{q.marks}M · {q.chapter}</span>
                            </div>
                            <p className="text-sm text-on-surface-variant leading-snug line-clamp-2">
                              {q.question_text}
                            </p>
                          </div>
                          <button
                            onClick={() => addToBin(q)}
                            className="shrink-0 w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Paper Preview */}
                  <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-black font-headline text-white">Paper Preview</h2>
                        <p className="text-[10px] text-outline mt-0.5">
                          {libSubject} · {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs font-bold text-outline">{totalQs}Qs</span>
                          <span className="text-outline/40">·</span>
                          <span className="text-lg font-black text-white font-headline">{totalMarks}</span>
                          <span className="text-xs text-outline font-bold">/ {marks}</span>
                        </div>
                        <p className="text-[9px] text-outline uppercase font-bold tracking-widest">Total Marks</p>
                      </div>
                    </div>

                    <input
                      className={`${inputCls} mb-4`}
                      placeholder="Exam Title"
                      value={paperTitle}
                      onChange={e => setPaperTitle(e.target.value)}
                    />

                    {/* Sections */}
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[340px] pr-1 no-scrollbar">
                      {manualSections.map(sec => {
                        const secMarks = sec.questions.reduce((s: number, q: any) => s + (q.marks || 0), 0);
                        return (
                          <div key={sec.type} className="rounded-xl border border-outline-variant/10 overflow-hidden">
                            {/* Section header */}
                            <div className="flex items-center justify-between px-3 py-2 bg-surface-container-highest">
                              <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">{sec.name}</span>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-outline">
                                <span>{sec.questions.length}Q</span>
                                <span>·</span>
                                <span>{secMarks}M</span>
                              </div>
                            </div>

                            {/* Questions */}
                            {sec.questions.length === 0 ? (
                              <div className="px-3 py-2.5 flex items-center gap-2 text-outline/50">
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                <span className="text-[11px]">No questions added yet</span>
                              </div>
                            ) : sec.questions.map((q: any, idx: number) => (
                              <div key={q.id} className="flex items-center gap-2 px-3 py-2 border-t border-outline-variant/10 hover:bg-surface-container-high transition-colors">
                                <span className="text-[10px] font-black text-primary shrink-0 w-6">{q.marks}M</span>
                                <span className="text-xs text-on-surface-variant flex-1 truncate">{q.question_text}</span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button onClick={() => moveItem(sec.type, idx, -1)} className="w-5 h-5 flex items-center justify-center text-outline hover:text-on-surface rounded transition-colors">
                                    <span className="material-symbols-outlined text-sm">expand_less</span>
                                  </button>
                                  <button onClick={() => moveItem(sec.type, idx, 1)} className="w-5 h-5 flex items-center justify-center text-outline hover:text-on-surface rounded transition-colors">
                                    <span className="material-symbols-outlined text-sm">expand_more</span>
                                  </button>
                                  <button onClick={() => removeFromBin(sec.type, q.id)} className="w-5 h-5 flex items-center justify-center text-outline hover:text-error rounded transition-colors ml-1">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Question */}
                    <div className="mt-4 p-4 bg-surface-container-highest rounded-xl border border-outline-variant/10">
                      <p className="text-[10px] font-black uppercase tracking-wider text-outline mb-3">Add Custom Question</p>
                      <form onSubmit={handleAddCustom} className="flex gap-2">
                        <select className={`${inputCls} w-28 shrink-0`} value={cqType} onChange={e => setCqType(e.target.value)}>
                          <option value="MCQ">MCQ</option>
                          <option value="ASSERTION_REASON">A&R</option>
                          <option value="VERY_SHORT">V.Short</option>
                          <option value="SHORT">Short</option>
                          <option value="LONG">Long</option>
                          <option value="CASE">Case</option>
                        </select>
                        <input className={`${inputCls} w-14 shrink-0`} type="number" min="1" max="10" placeholder="Mk" value={cqMarks} onChange={e => setCqMarks(Number(e.target.value))} />
                        <input className={`${inputCls} flex-1`} placeholder="Question prompt..." value={cqText} onChange={e => setCqText(e.target.value)} required />
                        <button type="submit" className="shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-all flex items-center justify-center">
                          <span className="material-symbols-outlined text-xl">add</span>
                        </button>
                      </form>
                    </div>

                    <button
                      onClick={handleCompileManual}
                      disabled={loading || totalMarks === 0}
                      className="mt-4 w-full py-4 rounded-2xl bg-tertiary text-on-tertiary font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                    >
                      <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                      {loading ? 'Compiling LaTeX PDF...' : 'Compile & Download PDF'}
                      {!loading && totalMarks > 0 && (
                        <span className="ml-1 opacity-70 text-xs">↓</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Generated Papers History ── */}
              <div className="mt-8 bg-surface-container rounded-2xl border border-outline-variant/10 p-6">
                <SectionLabel>Generated History</SectionLabel>
                <h3 className="text-base font-black font-headline text-white mb-4">Paper Archive</h3>

                {papers.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-surface-container-high rounded-xl border border-dashed border-outline-variant/20">
                    <span className="material-symbols-outlined text-outline">description</span>
                    <p className="text-outline text-sm">No papers generated yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {papers.map(p => (
                      <div key={p.id} className="flex items-center gap-4 p-4 bg-surface-container-high rounded-xl border border-outline-variant/10 hover:border-outline-variant/20 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                          <span className={`material-symbols-outlined text-xl ${p.pdf_url ? 'text-secondary' : 'text-primary'}`}>
                            {p.pdf_url ? 'check_circle' : 'hourglass_top'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.title}</p>
                          <p className="text-xs text-outline mt-0.5">
                            {new Date(p.created_at).toLocaleDateString()} · {p.config?.board} · {p.config?.grade} · {p.total_marks || p.config?.max_marks} Marks
                          </p>
                        </div>
                        {p.pdf_url ? (
                          <button
                            onClick={async () => {
                              const res = await api.get(`/ai/generate-paper/${p.id}/download/`, { responseType: 'blob' });
                              const url = URL.createObjectURL(res.data);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${p.title ?? 'paper'}.pdf`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="shrink-0 px-4 py-2 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold hover:bg-secondary/20 transition-all"
                          >
                            Download PDF
                          </button>
                        ) : (() => {
                          const elapsed = Math.floor((now - new Date(p.created_at).getTime()) / 1000);
                          const isStuck = elapsed > 90;
                          return (
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <span className={`text-xs font-bold animate-pulse ${isStuck ? 'text-error' : 'text-primary'}`}>
                                {isStuck ? 'Taking long…' : 'Compiling...'}
                              </span>
                              <span className="text-[10px] text-outline tabular-nums">{elapsed}s elapsed</span>
                              {isStuck && (
                                <button onClick={fetchPapers} className="text-[10px] text-primary underline">Refresh</button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-primary/3 blur-[100px]" />
        <div className="absolute bottom-0 left-64 w-[30%] h-[40%] rounded-full bg-secondary/3 blur-[100px]" />
      </div>
    </div>
  );
}
