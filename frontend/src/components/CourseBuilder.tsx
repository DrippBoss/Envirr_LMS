import { useState, useEffect } from 'react';
import { api, useAuth } from '../context/AuthContext';
import NodeReorderList, { type NodeItem } from './NodeReorderList';

const inputCls = "w-full px-4 py-3 bg-surface-container-lowest rounded-xl text-on-surface border border-outline-variant/15 focus:outline-none focus:border-primary/50 transition-all placeholder:text-outline/50 text-sm";

const COURSE_ICONS = [
    'calculate', 'science', 'biotech', 'history_edu', 'language',
    'public', 'menu_book', 'school', 'functions', 'atom',
    'eco', 'palette', 'music_note', 'computer', 'engineering',
    'auto_stories', 'psychology', 'gavel', 'architecture', 'sports_soccer',
];

const CARD_TYPES = ['CONCEPT', 'FORMULA', 'EXAMPLE', 'MNEMONIC', 'SUMMARY'];

const Q_TYPES = [
    { value: 'MCQ', label: 'MCQ' },
    { value: 'ASSERTION_REASON', label: 'Assertion & Reason' },
    { value: 'FILL_BLANK', label: 'Fill in the Blank' },
    { value: 'TRUE_FALSE', label: 'True / False' },
    { value: 'MATCH', label: 'Match' },
    { value: 'PROOF_PUZZLE', label: 'Proof Puzzle' },
    { value: 'REARRANGE', label: 'Rearrange / Picker' },
    { value: 'VERY_SHORT', label: 'Very Short' },
    { value: 'SHORT', label: 'Short Answer' },
    { value: 'LONG', label: 'Long Answer' },
    { value: 'CASE', label: 'Case Study' },
];

interface DraftCard {
    tempId: number;
    title: string;
    body: string;
    card_type: string;
    has_formula: boolean;
    formula_text: string;
    example_text: string;
    concept: string;
}

interface DraftDeck {
    tempId: number;
    title: string;
    purpose: 'PREREQUISITE' | 'POST_NODE' | 'SIDE_REVISION';
    node_key: string;
    cards: DraftCard[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</label>
            {children}
        </div>
    );
}

function newCard(): DraftCard {
    return { tempId: Date.now() + Math.random(), title: '', body: '', card_type: 'CONCEPT', has_formula: false, formula_text: '', example_text: '', concept: '' };
}

interface CourseBuilderProps {
    editUnitId?: number;
    onEditDone?: () => void;
}

export default function CourseBuilder({ editUnitId, onEditDone }: CourseBuilderProps = {}) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isEditMode = !!editUnitId;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Course Identity
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('Mathematics');
    const [grade, setGrade] = useState('10');
    const [board, setBoard] = useState('CBSE');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('calculate');

    // Step 2: Curriculum Map
    const [chapters, setChapters] = useState([{ tempId: Date.now(), title: 'Chapter 1', description: '', nodes: [] as NodeItem[] }]);
    const [activeChapter, setActiveChapter] = useState(0);
    const [templates, setTemplates] = useState<any[]>([]);

    // Step 3: Configure Nodes
    const [activeNodeKey, setActiveNodeKey] = useState<string | null>(null);
    const [qbChapter, setQbChapter] = useState('');
    const [qbType, setQbType] = useState('MCQ');
    const [qbResults, setQbResults] = useState<any[]>([]);
    const [qbLoading, setQbLoading] = useState(false);
    const [availableChapters, setAvailableChapters] = useState<string[]>([]);
    const [videoFiles, setVideoFiles] = useState<Record<string, File>>({});
    const [expandedQId, setExpandedQId] = useState<number | null>(null);

    // Step 4: Flashcards
    const [decks, setDecks] = useState<DraftDeck[]>([]);
    const [activeDeckIdx, setActiveDeckIdx] = useState<number | null>(null);

    // Step 6: Done
    const [resultMsg, setResultMsg] = useState('');

    const steps = ['Identity', 'Curriculum', 'Configure', 'Flashcards', 'Review', 'Done'];

    useEffect(() => {
        api.get('/teacher/templates/').then(r => setTemplates(r.data)).catch(console.error);
    }, []);

    // Pre-fill state when editing an existing course
    useEffect(() => {
        if (!editUnitId) return;
        api.get(`/teacher/courses/${editUnitId}/structure/`).then(r => {
            const d = r.data;
            setTitle(d.title ?? '');
            setSubject(d.subject ?? 'Mathematics');
            setGrade(d.class_grade ?? '10');
            setBoard(d.board ?? '');
            setDescription(d.description ?? '');
            setIcon(d.icon ?? 'calculate');
            setChapters((d.chapters ?? []).map((ch: any, ci: number) => ({
                tempId: ch.id,
                title: ch.title,
                description: ch.description ?? '',
                nodes: [
                    ...(ch.nodes ?? []).map((n: any, ni: number) => ({
                        id: n.id,
                        title: n.title,
                        type: n.type,
                        order: n.order ?? ni + 1,
                        xp_reward: n.xp_reward ?? 10,
                        is_bonus: n.is_bonus ?? false,
                        starting_lives: n.starting_lives ?? 3,
                        practice_question_count: n.practice_question_count ?? 5,
                        test_question_count: n.test_question_count ?? 10,
                        test_pass_percentage: n.test_pass_percentage ?? 70,
                        youtube_url: n.youtube_url ?? '',
                        selectedQuestions: (n.questions ?? []).map((q: any) => ({
                            id: q.source_question_id ?? q.id,
                            question_text: q.question_text,
                            question_type: q.question_type,
                            hint: q.hint ?? '',
                            explanation: q.explanation ?? '',
                            concept: q.concept ?? '',
                        })),
                    })),
                    ...(ch.revision_nodes ?? []).map((rn: any) => {
                        const parentIdx = (ch.nodes ?? []).findIndex((n: any) => n.id === rn.appears_after_node_id);
                        return {
                            id: rn.id,
                            title: rn.title,
                            type: 'REVISION' as const,
                            order: 0,
                            side: rn.side ?? 'right',
                            xp_reward: rn.xp_reward ?? 15,
                            appears_after_node_key: parentIdx >= 0 ? `${ci}-${parentIdx}` : '',
                        };
                    }),
                ],
            })));
            setStep(1);
        }).catch(console.error);
    }, [editUnitId]);

    useEffect(() => {
        if (!subject) return;
        api.get(`/ai/questions/meta/?subject=${encodeURIComponent(subject)}`)
            .then(r => setAvailableChapters(r.data.chapters ?? []))
            .catch(console.error);
    }, [subject]);

    useEffect(() => {
        if (step === 3 && qbChapter) fetchQbQuestions();
    }, [qbChapter, qbType, step]);

    const fetchQbQuestions = async () => {
        if (!qbChapter) return;
        setQbLoading(true);
        try {
            const res = await api.get(`/ai/questions/?subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(qbChapter)}&type=${encodeURIComponent(qbType)}`);
            setQbResults(res.data);
        } catch { setQbResults([]); }
        finally { setQbLoading(false); }
    };

    // ── Chapter & Node helpers ─────────────────────────────────────────────────
    const addChapter = () => {
        setChapters(prev => [...prev, { tempId: Date.now(), title: `Chapter ${prev.length + 1}`, description: '', nodes: [] }]);
        setActiveChapter(chapters.length);
    };

    const updateChapterTitle = (idx: number, val: string) =>
        setChapters(prev => prev.map((c, i) => i === idx ? { ...c, title: val } : c));

    const updateChapterDescription = (idx: number, val: string) =>
        setChapters(prev => prev.map((c, i) => i === idx ? { ...c, description: val } : c));

    const deleteChapter = (idx: number) => {
        if (chapters.length <= 1) return;
        setChapters(prev => prev.filter((_, i) => i !== idx));
        setActiveChapter(prev => Math.min(prev, chapters.length - 2));
    };

    const deleteNode = (chapIdx: number, nodeIdx: number) => {
        const key = `${chapIdx}-${nodeIdx}`;
        setChapters(prev => prev.map((ch, i) => {
            if (i !== chapIdx) return ch;
            return { ...ch, nodes: ch.nodes.filter((_, j) => j !== nodeIdx).map((n, j) => ({ ...n, order: j + 1 })) };
        }));
        if (activeNodeKey === key) setActiveNodeKey(null);
    };

    const renameNode = (chapIdx: number, nodeIdx: number, title: string) =>
        setChapters(prev => prev.map((ch, i) =>
            i !== chapIdx ? ch : { ...ch, nodes: ch.nodes.map((n, j) => j === nodeIdx ? { ...n, title } : n) }
        ));

    const addNodeToChapter = (chapIdx: number, template: any) => {
        const nodeType: string = template.template_type ?? template.type ?? 'LESSON';

        setChapters(prev => prev.map((ch, i) => {
            if (i !== chapIdx) return ch;

            let typeDefaults: Partial<NodeItem> =
                nodeType === 'REVISION'
                    ? { side: 'right', xp_reward: 15 }
                    : nodeType === 'CHAPTER_TEST'
                    ? { test_question_count: 10, test_pass_percentage: 70, xp_reward: 20 }
                    : { starting_lives: 3, practice_question_count: 5, xp_reward: 10, youtube_url: '', is_bonus: false };

            if (nodeType === 'REVISION') {
                const lastLessonIdx = ch.nodes.reduce(
                    (last, n, j) => (n.type === 'LESSON' || n.type === 'CHAPTER_TEST') ? j : last, -1
                );
                typeDefaults = {
                    ...typeDefaults,
                    appears_after_node_key: lastLessonIdx >= 0 ? `${chapIdx}-${lastLessonIdx}` : '',
                };
            }

            return {
                ...ch, nodes: [...ch.nodes, {
                    id: Date.now(),
                    title: template.name ? `New ${template.name}` : (nodeType === 'REVISION' ? 'Revision' : `Node ${ch.nodes.length + 1}`),
                    type: nodeType,
                    order: ch.nodes.length + 1,
                    template_id: template.id ?? null,
                    selectedQuestions: [],
                    ...typeDefaults,
                }],
            };
        }));
    };

    const handleReorderNodes = (chapIdx: number, newNodes: NodeItem[]) =>
        setChapters(prev => prev.map((ch, i) => i === chapIdx ? { ...ch, nodes: newNodes } : ch));

    const getNode = (key: string) => {
        const [ci, ni] = key.split('-').map(Number);
        return chapters[ci]?.nodes[ni];
    };

    const updateNode = (key: string, patch: Partial<NodeItem>) => {
        const [ci, ni] = key.split('-').map(Number);
        setChapters(prev => prev.map((ch, i) => {
            if (i !== ci) return ch;
            return { ...ch, nodes: ch.nodes.map((n, j) => j === ni ? { ...n, ...patch } : n) };
        }));
    };

    const addQuestionToNode = (key: string, q: any) => {
        const node = getNode(key);
        if (!node) return;
        if ((node.selectedQuestions ?? []).some((x: any) => x.id === q.id)) return;
        updateNode(key, { selectedQuestions: [...(node.selectedQuestions ?? []), { ...q, hint: '', explanation: '' }] });
    };

    const removeQuestionFromNode = (key: string, qId: number) => {
        const node = getNode(key);
        if (!node) return;
        updateNode(key, { selectedQuestions: (node.selectedQuestions ?? []).filter((x: any) => x.id !== qId) });
        if (expandedQId === qId) setExpandedQId(null);
    };

    const updateQuestionAnnotation = (key: string, qId: number, patch: { hint?: string; explanation?: string }) => {
        const node = getNode(key);
        if (!node) return;
        updateNode(key, {
            selectedQuestions: (node.selectedQuestions ?? []).map((q: any) =>
                q.id === qId ? { ...q, ...patch } : q
            ),
        });
    };

    // ── Deck helpers ───────────────────────────────────────────────────────────
    const addDeck = (purpose: DraftDeck['purpose']) => {
        const d: DraftDeck = {
            tempId: Date.now(),
            title: purpose === 'PREREQUISITE' ? 'Prerequisites' : 'Flashcard Deck',
            purpose,
            node_key: '',
            cards: [newCard()],
        };
        setDecks(prev => {
            setActiveDeckIdx(prev.length);
            return [...prev, d];
        });
    };

    const updateDeck = (idx: number, patch: Partial<DraftDeck>) =>
        setDecks(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));

    const removeDeck = (idx: number) => {
        setDecks(prev => prev.filter((_, i) => i !== idx));
        setActiveDeckIdx(null);
    };

    const addCard = (deckIdx: number) =>
        setDecks(prev => prev.map((d, i) => i === deckIdx ? { ...d, cards: [...d.cards, newCard()] } : d));

    const updateCard = (deckIdx: number, cardIdx: number, patch: Partial<DraftCard>) =>
        setDecks(prev => prev.map((d, i) => i === deckIdx
            ? { ...d, cards: d.cards.map((c, j) => j === cardIdx ? { ...c, ...patch } : c) }
            : d));

    const removeCard = (deckIdx: number, cardIdx: number) =>
        setDecks(prev => prev.map((d, i) => i === deckIdx
            ? { ...d, cards: d.cards.filter((_, j) => j !== cardIdx) }
            : d));

    // ── Publish ────────────────────────────────────────────────────────────────
    const handlePublish = async () => {
        setLoading(true);
        try {
            const payload = {
                title, subject, class_grade: grade, board, description, icon,
                chapters: chapters.map((ch, ci) => ({
                    title: ch.title,
                    description: ch.description ?? '',
                    nodes: ch.nodes.map((n, ni) => ({
                        title: n.title,
                        type: n.type,
                        template_id: n.template_id,
                        node_client_key: `${ci}-${ni}`,
                        youtube_url: n.youtube_url ?? '',
                        questions: (n.selectedQuestions ?? []).map((q: any) => ({
                                            id: q.id,
                                            hint: q.hint ?? '',
                                            explanation: q.explanation ?? '',
                                        })),
                        is_bonus: n.is_bonus ?? false,
                        starting_lives: n.starting_lives ?? 3,
                        practice_question_count: n.practice_question_count ?? 5,
                        xp_reward: n.xp_reward ?? 10,
                        test_question_count: n.test_question_count ?? 10,
                        test_pass_percentage: n.test_pass_percentage ?? 70,
                        side: n.side ?? 'right',
                                        appears_after_node_key: n.appears_after_node_key ?? '',
                    }))
                })),
                flashcard_decks: decks
                    .map(d => ({
                        title: d.title,
                        purpose: d.purpose,
                        node_key: d.node_key || null,
                        cards: d.cards
                            .filter(c => c.title.trim() || c.body.trim())
                            .map(c => ({
                                title: c.title,
                                body: c.body,
                                card_type: c.card_type,
                                has_formula: c.has_formula,
                                formula_text: c.formula_text,
                                example_text: c.example_text,
                                concept: c.concept,
                            })),
                    }))
                    .filter(d => d.cards.length > 0),
            };

            let d: any;
            if (isEditMode) {
                const res = await api.put(`/teacher/courses/${editUnitId}/structure/`, payload);
                d = res.data;
                setResultMsg(`Course updated! ${d.nodes} nodes · ${d.questions} questions`);
                setStep(6);
                onEditDone?.();
            } else {
                const res = await api.post('/teacher/course/create/', payload);
                d = res.data;
                const nodeIdMap: Record<string, number> = d.node_id_map ?? {};

                // Upload any pending video files
                for (const [nodeKey, file] of Object.entries(videoFiles)) {
                    const nodeId = nodeIdMap[nodeKey];
                    if (!nodeId) continue;
                    const fd = new FormData();
                    fd.append('node_id', String(nodeId));
                    fd.append('files', file);
                    await api.post('/teacher/course/upload/', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                }

                setResultMsg(`Course published! ID: ${d.unit_id} · ${d.nodes} nodes · ${d.questions} questions · ${d.flashcards ?? 0} flashcards`);
                setStep(6);
            }
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to create course.');
        }
        setLoading(false);
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const allConfigurableNodes: { key: string; chapTitle: string; node: NodeItem }[] = chapters.flatMap((ch, ci) =>
        ch.nodes.map((n, ni) => ({ key: `${ci}-${ni}`, chapTitle: ch.title, node: n }))
    );
    const lessonTestNodes = allConfigurableNodes.filter(x => x.node.type === 'LESSON' || x.node.type === 'CHAPTER_TEST');
    const revisionNodes = allConfigurableNodes.filter(x => x.node.type === 'REVISION');

    const totalNodes = chapters.reduce((s, ch) => s + ch.nodes.length, 0);
    const totalQs = chapters.reduce((s, ch) => ch.nodes.reduce((ns, n) => ns + (n.selectedQuestions?.length ?? 0), s), 0);
    const totalFlashcards = decks.reduce((s, d) => s + d.cards.filter(c => c.title.trim() || c.body.trim()).length, 0);

    const activeNode = activeNodeKey ? getNode(activeNodeKey) : null;
    const activeDeck = activeDeckIdx !== null ? decks[activeDeckIdx] : null;

    // ── Stepper ────────────────────────────────────────────────────────────────
    const Stepper = () => (
        <div className="flex items-center gap-0 border-b border-outline-variant/10 pb-4 mb-6 overflow-x-auto">
            {steps.map((s, i) => (
                <div key={i} className="flex items-center shrink-0">
                    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                        step === i + 1 ? 'text-primary font-bold'
                        : step > i + 1 ? 'text-secondary font-bold'
                        : 'text-slate-500'
                    }`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black border shrink-0 ${
                            step === i + 1 ? 'border-primary bg-primary/10 text-primary'
                            : step > i + 1 ? 'border-secondary bg-secondary/10 text-secondary'
                            : 'border-outline-variant/30 text-slate-500'
                        }`}>
                            {step > i + 1 ? '✓' : i + 1}
                        </span>
                        <span className="text-xs font-bold hidden sm:inline">{s}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`w-4 h-px mx-0.5 shrink-0 ${step > i + 1 ? 'bg-secondary/40' : 'bg-outline-variant/15'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    // ── Step 1: Course Identity ────────────────────────────────────────────────
    if (step === 1) return (
        <div className="flex flex-col gap-5">
            <Stepper />
            <h3 className="text-base font-black text-on-surface font-headline">Course Identity</h3>

            <Field label="Course Title">
                <input className={inputCls} placeholder="e.g. Mathematics — Real Numbers" value={title} onChange={e => setTitle(e.target.value)} />
            </Field>

            <div className="grid grid-cols-3 gap-3">
                <Field label="Subject">
                    <select className={inputCls} value={subject} onChange={e => setSubject(e.target.value)}>
                        {['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography'].map(s => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Grade">
                    <select className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}>
                        {['9', '10', '11', '12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                </Field>
                <Field label="Board">
                    <select className={inputCls} value={board} onChange={e => setBoard(e.target.value)}>
                        {['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE'].map(b => <option key={b}>{b}</option>)}
                    </select>
                </Field>
            </div>

            <Field label="Description">
                <textarea className={inputCls} rows={3} placeholder="What will students learn in this course?" value={description} onChange={e => setDescription(e.target.value)} />
            </Field>

            <Field label="Course Icon">
                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-10 gap-1.5">
                        {COURSE_ICONS.map(ic => (
                            <button key={ic} type="button" title={ic}
                                onClick={() => setIcon(ic)}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                                    icon === ic
                                        ? 'bg-primary/15 border-primary/40 text-primary'
                                        : 'bg-surface-container border-outline-variant/10 text-slate-400 hover:border-primary/25 hover:text-primary'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{ic}</span>
                            </button>
                        ))}
                    </div>
                    <input className={inputCls} placeholder="Or type a custom Material Symbol name..." value={icon} onChange={e => setIcon(e.target.value)} />
                </div>
            </Field>

            <div className="flex justify-end">
                <button
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => setStep(2)}
                    disabled={!title.trim()}
                >
                    Next: Curriculum Map
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
            </div>
        </div>
    );

    // ── Step 2: Curriculum Map ─────────────────────────────────────────────────
    if (step === 2) return (
        <div className="flex flex-col gap-4">
            <Stepper />
            <div className="flex gap-4 min-h-[440px]">
                <div className="w-44 flex-shrink-0 flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Chapters</p>
                    {chapters.map((ch, i) => (
                        <div key={ch.tempId} onClick={() => setActiveChapter(i)}
                            className={`p-3 rounded-xl cursor-pointer border transition-all ${
                                activeChapter === i
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'bg-surface-container-lowest border-outline-variant/10 text-slate-400 hover:border-outline-variant/25'
                            }`}
                        >
                            <div className="flex items-center gap-1">
                                <input
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-outline/50 min-w-0"
                                    value={ch.title}
                                    onChange={e => updateChapterTitle(i, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                />
                                {chapters.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); deleteChapter(i); }}
                                        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-outline/30 hover:text-error hover:bg-error/10 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{ch.nodes.length} node(s)</div>
                        </div>
                    ))}
                    <button
                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-outline-variant/20 text-slate-500 hover:border-primary/30 hover:text-primary text-xs font-bold transition-all mt-1"
                        onClick={addChapter}
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Chapter
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-3 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-black text-on-surface font-headline">
                            Content for: <span className="text-primary">{chapters[activeChapter]?.title}</span>
                        </h3>
                        <textarea
                            className={`${inputCls} resize-none text-xs`}
                            rows={2}
                            placeholder="Chapter description (optional)..."
                            value={chapters[activeChapter]?.description ?? ''}
                            onChange={e => updateChapterDescription(activeChapter, e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 pb-3 border-b border-outline-variant/10">
                        {templates.map(t => (
                            <button key={t.id}
                                className="px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant/15 text-xs font-bold text-slate-300 hover:border-primary/30 hover:text-primary transition-all"
                                onClick={() => addNodeToChapter(activeChapter, t)}
                            >
                                + {t.name}
                            </button>
                        ))}
                        <button
                            className="px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant/15 text-xs font-bold text-slate-300 hover:border-primary/30 hover:text-primary transition-all"
                            onClick={() => addNodeToChapter(activeChapter, { name: 'Video Lesson', template_type: 'LESSON' })}
                        >
                            + Blank Lesson
                        </button>
                        <button
                            className="px-3 py-1.5 bg-error-container/10 rounded-lg border border-error-container/20 text-xs font-bold text-error hover:bg-error-container/20 transition-all"
                            onClick={() => addNodeToChapter(activeChapter, { name: 'Test Node', template_type: 'CHAPTER_TEST' })}
                        >
                            + Chapter Test
                        </button>
                        <button
                            className="px-3 py-1.5 bg-tertiary/10 rounded-lg border border-tertiary/20 text-xs font-bold text-tertiary hover:bg-tertiary/20 transition-all"
                            onClick={() => addNodeToChapter(activeChapter, { template_type: 'REVISION' })}
                        >
                            + Revision Node
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <NodeReorderList
                            nodes={chapters[activeChapter]?.nodes || []}
                            onReorder={n => handleReorderNodes(activeChapter, n)}
                            onRename={(idx, title) => renameNode(activeChapter, idx, title)}
                            onDelete={idx => deleteNode(activeChapter, idx)}
                            getAnnotation={(node) => {
                                if (node.type !== 'REVISION') return null;
                                const key = node.appears_after_node_key;
                                if (!key) return '↳ no parent set';
                                const [ci, ni] = key.split('-').map(Number);
                                const parent = chapters[ci]?.nodes[ni];
                                return parent ? `↳ after: ${parent.title}` : '↳ parent not found';
                            }}
                        />
                    </div>

                    <div className="flex justify-between pt-3 border-t border-outline-variant/10">
                        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/15 text-slate-400 hover:text-white text-sm font-bold transition-all" onClick={() => setStep(1)}>
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Back
                        </button>
                        <button
                            className="flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all disabled:opacity-40"
                            onClick={() => { setStep(3); if (allConfigurableNodes.length) setActiveNodeKey(allConfigurableNodes[0].key); }}
                            disabled={totalNodes === 0}
                        >
                            Configure Nodes
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Step 3: Configure Nodes ────────────────────────────────────────────────
    if (step === 3) return (
        <div className="flex flex-col gap-4">
            <Stepper />
            <div className="grid grid-cols-[200px_1fr] gap-4 min-h-[520px]">

                {/* Left: node list */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px] pr-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Nodes</p>
                    {allConfigurableNodes.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No nodes yet.</p>
                    )}
                    {allConfigurableNodes.map(({ key, chapTitle, node }) => (
                        <button
                            key={key}
                            onClick={() => setActiveNodeKey(key)}
                            className={`text-left p-3 rounded-xl border transition-all ${
                                activeNodeKey === key
                                    ? 'bg-primary/10 border-primary/30'
                                    : 'bg-surface-container-lowest border-outline-variant/10 hover:border-outline-variant/25'
                            }`}
                        >
                            <p className={`text-xs font-bold truncate ${activeNodeKey === key ? 'text-primary' : 'text-on-surface'}`}>{node.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{chapTitle}</p>
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                                    node.type === 'LESSON' ? 'bg-primary/10 text-primary border-primary/20'
                                    : node.type === 'CHAPTER_TEST' ? 'bg-error/10 text-error border-error/20'
                                    : 'bg-tertiary/10 text-tertiary border-tertiary/20'
                                }`}>{node.type === 'CHAPTER_TEST' ? 'TEST' : node.type === 'REVISION' ? 'REV' : 'LESS'}</span>
                                {(node.selectedQuestions?.length ?? 0) > 0 && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                        {node.selectedQuestions!.length}Q
                                    </span>
                                )}
                                {node.youtube_url && <span className="material-symbols-outlined text-xs text-primary">play_circle</span>}
                                {videoFiles[key] && <span className="material-symbols-outlined text-xs text-secondary">video_file</span>}
                                {node.is_bonus && <span className="material-symbols-outlined text-xs text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Right: node config */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 flex flex-col gap-4 overflow-y-auto max-h-[520px]">
                    {!activeNode ? (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                            Select a node on the left to configure it.
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3">
                                <input
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-black text-white font-headline placeholder:text-outline/40 min-w-0"
                                    value={activeNode.title}
                                    onChange={e => updateNode(activeNodeKey!, { title: e.target.value })}
                                    placeholder="Node title..."
                                />
                                <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                    activeNode.type === 'LESSON' ? 'bg-primary/10 text-primary border-primary/20'
                                    : activeNode.type === 'CHAPTER_TEST' ? 'bg-error/10 text-error border-error/20'
                                    : 'bg-tertiary/10 text-tertiary border-tertiary/20'
                                }`}>{activeNode.type}</span>
                            </div>

                            {/* ── LESSON ── */}
                            {activeNode.type === 'LESSON' && (
                                <>
                                    <Field label="Video">
                                        <div className="flex flex-col gap-2">
                                            <input
                                                className={inputCls}
                                                placeholder="YouTube URL (https://www.youtube.com/watch?v=...)"
                                                value={activeNode.youtube_url ?? ''}
                                                onChange={e => updateNode(activeNodeKey!, { youtube_url: e.target.value })}
                                            />
                                            {!activeNode.youtube_url && (
                                                <label className="flex items-center gap-2 px-4 py-2.5 bg-surface-container border border-dashed border-outline-variant/20 rounded-xl cursor-pointer hover:border-primary/30 transition-all">
                                                    <span className="material-symbols-outlined text-outline text-base">upload_file</span>
                                                    <span className="text-xs text-slate-400">
                                                        {videoFiles[activeNodeKey!] ? videoFiles[activeNodeKey!].name : 'Upload .mp4 instead'}
                                                    </span>
                                                    <input type="file" accept="video/mp4" className="sr-only"
                                                        onChange={e => {
                                                            const f = e.target.files?.[0];
                                                            if (f) setVideoFiles(prev => ({ ...prev, [activeNodeKey!]: f }));
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </Field>
                                    <div className="grid grid-cols-4 gap-3">
                                        <Field label="Starting Lives">
                                            <input type="number" min={1} max={10} className={inputCls}
                                                value={activeNode.starting_lives ?? 3}
                                                onChange={e => updateNode(activeNodeKey!, { starting_lives: Number(e.target.value) })}
                                            />
                                        </Field>
                                        <Field label="Practice Qs">
                                            <input type="number" min={1} max={50} className={inputCls}
                                                value={activeNode.practice_question_count ?? 5}
                                                onChange={e => updateNode(activeNodeKey!, { practice_question_count: Number(e.target.value) })}
                                            />
                                        </Field>
                                        <Field label="XP Reward">
                                            <input type="number" min={0} className={inputCls}
                                                value={activeNode.xp_reward ?? 10}
                                                onChange={e => updateNode(activeNodeKey!, { xp_reward: Number(e.target.value) })}
                                            />
                                        </Field>
                                        <Field label="Bonus Node">
                                            <button
                                                type="button"
                                                onClick={() => updateNode(activeNodeKey!, { is_bonus: !(activeNode.is_bonus ?? false) })}
                                                className={`h-[46px] rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                                                    activeNode.is_bonus
                                                        ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                                                        : 'bg-surface-container border-outline-variant/15 text-slate-500 hover:border-outline-variant/30'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-base" style={activeNode.is_bonus ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
                                                {activeNode.is_bonus ? 'Bonus' : 'Standard'}
                                            </button>
                                        </Field>
                                    </div>
                                </>
                            )}

                            {/* ── CHAPTER_TEST ── */}
                            {activeNode.type === 'CHAPTER_TEST' && (
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Test Questions">
                                        <input type="number" min={1} max={100} className={inputCls}
                                            value={activeNode.test_question_count ?? 10}
                                            onChange={e => updateNode(activeNodeKey!, { test_question_count: Number(e.target.value) })}
                                        />
                                    </Field>
                                    <Field label="Pass % Required">
                                        <input type="number" min={0} max={100} className={inputCls}
                                            value={activeNode.test_pass_percentage ?? 70}
                                            onChange={e => updateNode(activeNodeKey!, { test_pass_percentage: Number(e.target.value) })}
                                        />
                                    </Field>
                                    <Field label="XP Reward">
                                        <input type="number" min={0} className={inputCls}
                                            value={activeNode.xp_reward ?? 20}
                                            onChange={e => updateNode(activeNodeKey!, { xp_reward: Number(e.target.value) })}
                                        />
                                    </Field>
                                </div>
                            )}

                            {/* ── REVISION ── */}
                            {activeNode.type === 'REVISION' && (() => {
                                const chapIdx = Number(activeNodeKey!.split('-')[0]);
                                const parentCandidates = chapters[chapIdx]?.nodes
                                    .map((n, ni) => ({ key: `${chapIdx}-${ni}`, node: n }))
                                    .filter(({ node }) => node.type === 'LESSON' || node.type === 'CHAPTER_TEST') ?? [];
                                return (
                                    <div className="flex flex-col gap-3">
                                        <Field label="Branches from Node">
                                            <select className={inputCls}
                                                value={activeNode.appears_after_node_key ?? ''}
                                                onChange={e => updateNode(activeNodeKey!, { appears_after_node_key: e.target.value })}
                                            >
                                                <option value="">— none (floats at start) —</option>
                                                {parentCandidates.map(({ key, node }) => (
                                                    <option key={key} value={key}>{node.title}</option>
                                                ))}
                                            </select>
                                            {!activeNode.appears_after_node_key && (
                                                <p className="text-[10px] text-error/70 mt-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">warning</span>
                                                    Revision node needs a parent lesson to branch from on the map.
                                                </p>
                                            )}
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Map Side">
                                                <select className={inputCls}
                                                    value={activeNode.side ?? 'right'}
                                                    onChange={e => updateNode(activeNodeKey!, { side: e.target.value as 'left' | 'right' })}
                                                >
                                                    <option value="right">Right branch</option>
                                                    <option value="left">Left branch</option>
                                                </select>
                                            </Field>
                                            <Field label="XP Reward">
                                                <input type="number" min={0} className={inputCls}
                                                    value={activeNode.xp_reward ?? 15}
                                                    onChange={e => updateNode(activeNodeKey!, { xp_reward: Number(e.target.value) })}
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Question picker (LESSON + CHAPTER_TEST) ── */}
                            {(activeNode.type === 'LESSON' || activeNode.type === 'CHAPTER_TEST') && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Chapter">
                                            <select className={inputCls} value={qbChapter} onChange={e => setQbChapter(e.target.value)}>
                                                <option value="">— select chapter —</option>
                                                {availableChapters.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Question Type">
                                            <select className={inputCls} value={qbType} onChange={e => setQbType(e.target.value)}>
                                                {Q_TYPES.map(qt => (
                                                    <option key={qt.value} value={qt.value}>{qt.label}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Available */}
                                        <div className="flex flex-col gap-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-outline">Available ({qbResults.length})</p>
                                            <div className="overflow-y-auto space-y-2 max-h-52 pr-1 no-scrollbar">
                                                {qbLoading && <div className="flex justify-center py-6"><div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>}
                                                {!qbLoading && !qbChapter && <p className="text-xs text-slate-500 italic py-4 text-center">Select a chapter to browse.</p>}
                                                {!qbLoading && qbChapter && qbResults.length === 0 && <p className="text-xs text-slate-500 italic py-4 text-center">No questions found.</p>}
                                                {qbResults.map(q => {
                                                    const alreadyAdded = (activeNode.selectedQuestions ?? []).some((x: any) => x.id === q.id);
                                                    return (
                                                        <div key={q.id} className="flex items-start gap-2 p-3 bg-surface-container rounded-xl border border-outline-variant/10 hover:border-primary/20 transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                                                        q.difficulty === 'hard' ? 'bg-error/10 text-error' :
                                                                        q.difficulty === 'medium' ? 'bg-tertiary/10 text-tertiary' :
                                                                        'bg-secondary/10 text-secondary'
                                                                    }`}>{q.difficulty}</span>
                                                                    <span className="text-[10px] text-outline font-bold">{q.marks}M</span>
                                                                </div>
                                                                <p className="text-xs text-on-surface-variant leading-snug line-clamp-2">{q.question_text}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => addQuestionToNode(activeNodeKey!, q)}
                                                                disabled={alreadyAdded}
                                                                className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                                                    alreadyAdded
                                                                        ? 'bg-secondary/10 text-secondary cursor-default'
                                                                        : 'bg-surface-container-highest border border-outline-variant/20 text-outline hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                                                                }`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">{alreadyAdded ? 'check' : 'add'}</span>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Selected */}
                                        <div className="flex flex-col gap-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-outline">Selected ({activeNode.selectedQuestions?.length ?? 0})</p>
                                            <div className="overflow-y-auto space-y-2 max-h-52 pr-1 no-scrollbar">
                                                {(activeNode.selectedQuestions?.length ?? 0) === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-6 border border-dashed border-outline-variant/15 rounded-xl text-slate-500">
                                                        <span className="material-symbols-outlined text-2xl mb-1 text-outline-variant/40">playlist_add</span>
                                                        <p className="text-xs">No questions added yet</p>
                                                    </div>
                                                ) : (
                                                    activeNode.selectedQuestions!.map((q: any, idx: number) => {
                                                        const isOpen = expandedQId === q.id;
                                                        return (
                                                            <div key={q.id} className={`flex flex-col bg-secondary/5 border rounded-xl transition-all ${isOpen ? 'border-secondary/30' : 'border-secondary/15'}`}>
                                                                {/* Question row */}
                                                                <div className="flex items-start gap-2 p-3">
                                                                    <span className="text-[10px] font-black text-secondary shrink-0 w-5 mt-0.5">{idx + 1}</span>
                                                                    <p className="text-xs text-on-surface-variant leading-snug flex-1 line-clamp-2">{q.question_text}</p>
                                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                                        <button
                                                                            title={isOpen ? 'Collapse' : 'Add hint / explanation'}
                                                                            onClick={() => setExpandedQId(isOpen ? null : q.id)}
                                                                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isOpen ? 'text-secondary bg-secondary/10' : 'text-outline hover:text-secondary'}`}
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">edit_note</span>
                                                                        </button>
                                                                        <button onClick={() => removeQuestionFromNode(activeNodeKey!, q.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-outline hover:text-error transition-colors">
                                                                            <span className="material-symbols-outlined text-sm">close</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {/* Expandable hint/explanation */}
                                                                {isOpen && (
                                                                    <div className="flex flex-col gap-2 px-3 pb-3 border-t border-secondary/10 pt-2">
                                                                        <div className="flex flex-col gap-1">
                                                                            <label className="text-[9px] font-black uppercase tracking-widest text-outline">Hint</label>
                                                                            <textarea
                                                                                rows={2}
                                                                                className={`${inputCls} text-xs resize-none`}
                                                                                placeholder="Optional hint shown after a wrong attempt..."
                                                                                value={q.hint ?? ''}
                                                                                onChange={e => updateQuestionAnnotation(activeNodeKey!, q.id, { hint: e.target.value })}
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <label className="text-[9px] font-black uppercase tracking-widest text-outline">Explanation</label>
                                                                            <textarea
                                                                                rows={2}
                                                                                className={`${inputCls} text-xs resize-none`}
                                                                                placeholder="Explanation shown after the question is answered..."
                                                                                value={q.explanation ?? ''}
                                                                                onChange={e => updateQuestionAnnotation(activeNodeKey!, q.id, { explanation: e.target.value })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-2">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/15 text-slate-400 hover:text-white text-sm font-bold transition-all" onClick={() => setStep(2)}>
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back
                </button>
                <button className="flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all" onClick={() => setStep(4)}>
                    Flashcards
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
            </div>
        </div>
    );

    // ── Step 4: Flashcards ─────────────────────────────────────────────────────
    if (step === 4) return (
        <div className="flex flex-col gap-4">
            <Stepper />
            <div className="grid grid-cols-[220px_1fr] gap-4 min-h-[500px]">

                {/* Left: deck list */}
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Flashcard Decks</p>
                    {decks.length === 0 && (
                        <p className="text-xs text-slate-500 italic py-3">No decks yet. Add one below.</p>
                    )}
                    {decks.map((d, i) => (
                        <button key={d.tempId} onClick={() => setActiveDeckIdx(i)}
                            className={`text-left p-3 rounded-xl border transition-all ${
                                activeDeckIdx === i
                                    ? 'bg-primary/10 border-primary/30'
                                    : 'bg-surface-container-lowest border-outline-variant/10 hover:border-outline-variant/25'
                            }`}
                        >
                            <p className={`text-xs font-bold truncate ${activeDeckIdx === i ? 'text-primary' : 'text-on-surface'}`}>{d.title || '(untitled)'}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                                    d.purpose === 'PREREQUISITE' ? 'bg-primary/10 text-primary border-primary/20'
                                    : d.purpose === 'POST_NODE' ? 'bg-secondary/10 text-secondary border-secondary/20'
                                    : 'bg-tertiary/10 text-tertiary border-tertiary/20'
                                }`}>{d.purpose === 'PREREQUISITE' ? 'PRE' : d.purpose === 'POST_NODE' ? 'POST' : 'REV'}</span>
                                <span className="text-[10px] text-slate-500">{d.cards.length} card(s)</span>
                            </div>
                        </button>
                    ))}
                    <div className="flex flex-col gap-1.5 mt-2">
                        <button onClick={() => addDeck('PREREQUISITE')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-primary/20 text-primary/70 hover:border-primary/40 hover:text-primary text-xs font-bold transition-all">
                            <span className="material-symbols-outlined text-sm">add</span>
                            Prerequisite Deck
                        </button>
                        <button onClick={() => addDeck('POST_NODE')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-secondary/20 text-secondary/70 hover:border-secondary/40 hover:text-secondary text-xs font-bold transition-all">
                            <span className="material-symbols-outlined text-sm">add</span>
                            Post-Node Deck
                        </button>
                        {revisionNodes.length > 0 && (
                            <button onClick={() => addDeck('SIDE_REVISION')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-tertiary/20 text-tertiary/70 hover:border-tertiary/40 hover:text-tertiary text-xs font-bold transition-all">
                                <span className="material-symbols-outlined text-sm">add</span>
                                Side Revision Deck
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: deck editor */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 flex flex-col gap-4 overflow-y-auto max-h-[500px]">
                    {activeDeck === null ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <span className="material-symbols-outlined text-4xl text-outline-variant/30">style</span>
                            <p className="text-sm">Select a deck or create one to add flashcards.</p>
                            <p className="text-xs text-outline">Skip this step if your course has no prerequisite or revision content yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <input
                                    className={inputCls}
                                    placeholder="Deck title..."
                                    value={activeDeck.title}
                                    onChange={e => updateDeck(activeDeckIdx!, { title: e.target.value })}
                                />
                                <button onClick={() => removeDeck(activeDeckIdx!)} className="shrink-0 w-9 h-9 rounded-xl bg-error/10 border border-error/20 text-error hover:bg-error/20 transition-all flex items-center justify-center">
                                    <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                            </div>

                            {activeDeck.purpose === 'POST_NODE' && lessonTestNodes.length > 0 && (
                                <Field label="Attach to Node (optional)">
                                    <select className={inputCls} value={activeDeck.node_key} onChange={e => updateDeck(activeDeckIdx!, { node_key: e.target.value })}>
                                        <option value="">— course-wide —</option>
                                        {lessonTestNodes.map(({ key, chapTitle, node }) => (
                                            <option key={key} value={key}>{chapTitle} › {node.title}</option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                            {activeDeck.purpose === 'SIDE_REVISION' && revisionNodes.length > 0 && (
                                <Field label="Attach to Revision Node">
                                    <select className={inputCls} value={activeDeck.node_key} onChange={e => updateDeck(activeDeckIdx!, { node_key: e.target.value })}>
                                        <option value="">— select —</option>
                                        {revisionNodes.map(({ key, chapTitle, node }) => (
                                            <option key={key} value={key}>{chapTitle} › {node.title}</option>
                                        ))}
                                    </select>
                                </Field>
                            )}

                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-outline">Cards ({activeDeck.cards.length})</p>
                                <button onClick={() => addCard(activeDeckIdx!)} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all">
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Add Card
                                </button>
                            </div>

                            <div className="space-y-3">
                                {activeDeck.cards.map((card, ci) => (
                                    <div key={card.tempId} className="flex flex-col gap-2 p-4 bg-surface-container rounded-xl border border-outline-variant/10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-outline w-5 text-center">{ci + 1}</span>
                                            <select
                                                className="text-[10px] font-black uppercase tracking-wide bg-surface-container-high border border-outline-variant/15 rounded-lg px-2 py-1 text-outline focus:outline-none"
                                                value={card.card_type}
                                                onChange={e => updateCard(activeDeckIdx!, ci, { card_type: e.target.value })}
                                            >
                                                {CARD_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                            </select>
                                            <button onClick={() => removeCard(activeDeckIdx!, ci)} className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-outline/50 hover:text-error transition-colors">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                        <input className={inputCls} placeholder="Card title / heading..." value={card.title} onChange={e => updateCard(activeDeckIdx!, ci, { title: e.target.value })} />
                                        <textarea className={inputCls} rows={3} placeholder="Card body — supports LaTeX: $x^2 + y^2 = r^2$" value={card.body} onChange={e => updateCard(activeDeckIdx!, ci, { body: e.target.value })} />
                                        <input className={inputCls} placeholder="Concept tag (e.g. HCF, Polynomial)" value={card.concept} onChange={e => updateCard(activeDeckIdx!, ci, { concept: e.target.value })} />
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${card.has_formula ? 'bg-secondary' : 'bg-outline-variant/30'}`}
                                                onClick={() => updateCard(activeDeckIdx!, ci, { has_formula: !card.has_formula })}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${card.has_formula ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-xs text-slate-400 font-bold">Has formula</span>
                                        </div>
                                        {card.has_formula && (
                                            <input className={inputCls} placeholder="LaTeX formula (e.g. \frac{a}{b})" value={card.formula_text} onChange={e => updateCard(activeDeckIdx!, ci, { formula_text: e.target.value })} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-2">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/15 text-slate-400 hover:text-white text-sm font-bold transition-all" onClick={() => setStep(3)}>
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back
                </button>
                <button className="flex items-center gap-2 px-5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all" onClick={() => setStep(5)}>
                    Review & Publish
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
            </div>
        </div>
    );

    // ── Step 5: Review & Publish ───────────────────────────────────────────────
    if (step === 5) return (
        <div className="flex flex-col items-center gap-6 py-6 text-center">
            <Stepper />
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon || 'rocket_launch'}</span>
            </div>

            <div>
                <h2 className="text-2xl font-black font-headline text-on-surface mb-2">Ready to Launch</h2>
                <p className="text-slate-500 text-sm max-w-md">
                    <strong className="text-white">{title}</strong> · {subject} · Grade {grade} · {board}
                </p>
            </div>

            <div className="grid grid-cols-4 gap-3 w-full max-w-lg">
                {[
                    { icon: 'account_tree', label: 'Chapters', value: chapters.length },
                    { icon: 'school', label: 'Nodes', value: totalNodes },
                    { icon: 'quiz', label: 'Questions', value: totalQs },
                    { icon: 'style', label: 'Flashcards', value: totalFlashcards },
                ].map(s => (
                    <div key={s.label} className="bg-surface-container rounded-xl p-3 border border-outline-variant/10 text-center">
                        <span className="material-symbols-outlined text-primary text-xl block mb-1">{s.icon}</span>
                        <p className="text-lg font-black text-white font-headline">{s.value}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="w-full max-w-md text-left space-y-2">
                {chapters.map((ch, ci) => (
                    <div key={ch.tempId} className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-high">
                            <span className="text-sm font-bold text-white">{ch.title}</span>
                            <span className="text-[10px] text-outline font-bold">{ch.nodes.length} node(s)</span>
                        </div>
                        {ch.nodes.map((n, ni) => {
                            const isRevision = n.type === 'REVISION';
                            const parentKey = n.appears_after_node_key;
                            const parentNode = parentKey ? (() => { const [pci, pni] = parentKey.split('-').map(Number); return chapters[pci]?.nodes[pni]; })() : null;
                            return (
                                <div key={`${ci}-${ni}`} className={`border-t border-outline-variant/10 ${isRevision ? 'bg-tertiary/5' : ''}`}>
                                    {isRevision && parentNode && (
                                        <div className="flex items-center gap-1.5 px-4 pt-1.5 pb-0">
                                            <div className="w-3 h-3 border-b-2 border-l-2 border-tertiary/30 rounded-bl ml-2" />
                                            <span className="text-[9px] text-tertiary/60 font-bold">branches from: {parentNode.title}</span>
                                        </div>
                                    )}
                                    <div className={`flex items-center gap-3 px-4 py-2 ${isRevision ? 'pl-8' : ''}`}>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            n.type === 'LESSON' ? 'bg-primary/10 text-primary'
                                            : n.type === 'CHAPTER_TEST' ? 'bg-error/10 text-error'
                                            : 'bg-tertiary/10 text-tertiary'
                                        }`}>{n.type === 'CHAPTER_TEST' ? 'TEST' : n.type === 'REVISION' ? 'REV' : n.type}</span>
                                        <span className="text-xs text-on-surface-variant flex-1 truncate">{n.title}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {n.is_bonus && <span className="material-symbols-outlined text-xs text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>}
                                            {n.youtube_url && <span className="material-symbols-outlined text-xs text-primary">play_circle</span>}
                                            {videoFiles[`${ci}-${ni}`] && <span className="material-symbols-outlined text-xs text-secondary">video_file</span>}
                                            {isRevision && (
                                                <span className={`text-[9px] font-bold ${n.side === 'left' ? 'text-tertiary' : 'text-tertiary'}`}>
                                                    {n.side === 'left' ? '← left' : 'right →'}
                                                </span>
                                            )}
                                            {!isRevision && <span className="text-[10px] text-secondary font-bold">{n.selectedQuestions?.length ?? 0}Q</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {(!title.trim() || chapters.every(c => c.nodes.length === 0)) && (
                <div className="flex items-start gap-3 bg-error-container/10 border border-error-container/20 rounded-xl px-4 py-3 text-error text-sm text-left w-full max-w-md">
                    <span className="material-symbols-outlined text-base mt-0.5">warning</span>
                    <div>
                        {!title.trim() && <div>Course title cannot be empty.</div>}
                        {title.trim() && chapters.every(c => c.nodes.length === 0) && <div>Add at least one node before publishing.</div>}
                    </div>
                </div>
            )}

            <div className="flex gap-3">
                <button className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-outline-variant/15 text-slate-400 hover:text-white font-bold text-sm transition-all" onClick={() => setStep(4)}>
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back
                </button>
                <button
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-secondary-container to-secondary text-on-secondary-container font-black text-sm rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={loading || !title.trim() || chapters.every(c => c.nodes.length === 0)}
                    onClick={handlePublish}
                >
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
                    {loading
                        ? (isEditMode ? 'Saving…' : isAdmin ? 'Publishing…' : 'Submitting…')
                        : (isEditMode ? 'Save Changes' : isAdmin ? 'Publish Course' : 'Submit for Review')}
                </button>
            </div>
        </div>
    );

    // ── Step 6: Done ───────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
            <Stepper />
            <div className="w-20 h-20 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
                <h2 className="text-2xl font-black font-headline text-on-surface mb-2">
                    {isAdmin ? 'Course Published!' : 'Submitted for Review!'}
                </h2>
                <p className="text-slate-500 text-sm max-w-sm">{resultMsg}</p>
                <p className="text-xs text-outline mt-2">
                    {isAdmin
                        ? 'Students can now see and enroll in this course from their dashboard.'
                        : 'An admin will review and approve your course before it goes live.'}
                </p>
            </div>
            <button
                className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all"
                onClick={() => window.location.reload()}
            >
                <span className="material-symbols-outlined text-base">add</span>
                Build Another Course
            </button>
        </div>
    );
}
