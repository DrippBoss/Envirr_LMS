import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';

interface ConceptKey {
    title: string;
    body: string;
    symbol?: string;
}

interface Message {
    id: number;
    role: 'user' | 'ai';
    content: string;
    concept_key?: ConceptKey | null;
    timestamp: Date;
}

const NAV_LINKS = [
    { icon: 'dashboard', label: 'Dashboard', path: '/' },
    { icon: 'psychology', label: 'Ask AI Tutor', path: '/tutor', active: true },
    { icon: 'menu_book', label: 'Curriculum', path: '/course' },
    { icon: 'leaderboard', label: 'Rankings', path: '#' },
];

function formatTime(d: Date) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const STARTERS = [
    "How do I prove √2 is irrational?",
    "Explain Newton's second law",
    "Difference between mitosis and meiosis?",
];

const CACHE_KEY = 'envirr_tutor_history';
const MAX_CACHED = 120; // messages

function loadCached(userId?: number): Message[] {
    try {
        const raw = localStorage.getItem(`${CACHE_KEY}_${userId ?? 'guest'}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch {
        return [];
    }
}

function saveCached(msgs: Message[], userId?: number) {
    try {
        const trimmed = msgs.slice(-MAX_CACHED);
        localStorage.setItem(`${CACHE_KEY}_${userId ?? 'guest'}`, JSON.stringify(trimmed));
    } catch {
        // localStorage quota exceeded — ignore
    }
}

export default function AiTutor() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const initialised = useRef(false);

    const streak = (user as any)?.streak_days ?? 0;

    // Load from cache once user is known
    useEffect(() => {
        if (initialised.current) return;
        initialised.current = true;
        const cached = loadCached(user?.id);
        if (cached.length) setMessages(cached);
    }, [user?.id]);

    // Persist every time messages change (skip the very first empty render)
    useEffect(() => {
        if (!initialised.current) return;
        saveCached(messages, user?.id);
    }, [messages, user?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: Message = { id: Date.now(), role: 'user', content: text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const history = messages.map(m => ({ role: m.role, content: m.content }));

        try {
            const res = await api.post('/ai/tutor/', { message: text, history });
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'ai',
                content: res.data.reply,
                concept_key: res.data.concept_key ?? null,
                timestamp: new Date(),
            }]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'ai',
                content: err.response?.data?.error ?? 'The AI tutor is currently unavailable. Please try again shortly.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden pt-16">

            {/* ── Sidebar ── */}
            <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 hidden lg:flex flex-col p-4 gap-1 bg-background border-r border-outline-variant/10 z-40">
                {/* Brand */}
                <div className="flex items-center gap-3 px-3 py-4 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    </div>
                    <div>
                        <p className="text-white font-black font-headline leading-none text-base">Envirr</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">Academic Orbit</p>
                    </div>
                </div>

                {/* Nav links */}
                {NAV_LINKS.map(link => (
                    <button
                        key={link.label}
                        onClick={() => navigate(link.path)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            link.active
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-400 hover:text-white hover:bg-surface-container-high'
                        }`}
                    >
                        <span
                            className="material-symbols-outlined text-xl"
                            style={{ fontVariationSettings: link.active ? "'FILL' 1" : "'FILL' 0" }}
                        >
                            {link.icon}
                        </span>
                        {link.label}
                    </button>
                ))}

                {/* Streak card */}
                <div className="mt-auto p-4 bg-surface-container rounded-xl border border-outline-variant/10">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Today's Streak</p>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-tertiary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            local_fire_department
                        </span>
                        <span className="text-xl font-black font-headline text-white">
                            {streak} {streak === 1 ? 'Day' : 'Days'}
                        </span>
                    </div>
                </div>
            </aside>

            {/* ── Main area ── */}
            <main className="relative flex flex-col flex-1 lg:ml-64 h-full min-w-0">

                {/* Scrollable chat */}
                <section className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-6 no-scrollbar pb-52">

                    {/* Empty / welcome state */}
                    {messages.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-nebula">
                                <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black font-headline text-white mb-2">Envirr AI Tutor</h2>
                                <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                                    Ask anything from your syllabus. I'll guide you through it step by step — no direct answers, just the right nudges.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {STARTERS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                        className="px-4 py-2 bg-surface-container rounded-xl border border-outline-variant/10 text-sm text-slate-400 hover:text-white hover:border-primary/20 transition-all"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Session tag */}
                    {messages.length > 0 && (
                        <div className="flex justify-center">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10">
                                Session: {messages[0]?.content.slice(0, 30)}{messages[0]?.content.length > 30 ? '…' : ''}
                            </span>
                        </div>
                    )}

                    {/* Message list */}
                    {messages.map(msg => (
                        <div key={msg.id}>
                            {msg.role === 'user' ? (
                                /* User bubble — right aligned */
                                <div className="flex flex-col items-end gap-1 max-w-xl ml-auto group">
                                    <div className="bg-primary-container text-on-primary-container px-5 py-4 rounded-2xl rounded-tr-none shadow-lg">
                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-600 mr-1 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            ) : (
                                /* AI bubble — left aligned */
                                <div className="flex items-start gap-3 max-w-2xl group">
                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-surface-container-high border border-outline-variant/10 flex items-center justify-center mt-0.5">
                                        <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                                    </div>
                                    <div className="flex flex-col gap-3 min-w-0 flex-1">
                                        {/* Text card */}
                                        <div className="bg-surface-container text-on-surface px-5 py-4 rounded-2xl rounded-tl-none border border-outline-variant/10 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-0.5 h-full bg-primary/40 rounded-full" />
                                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap pl-1">{msg.content}</p>
                                        </div>

                                        {/* Concept Key bento card */}
                                        {msg.concept_key && (
                                            <div className="bg-surface-container-low rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 border border-outline-variant/10 relative overflow-hidden">
                                                <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
                                                <div className="space-y-2">
                                                    <div className="inline-flex items-center gap-1.5 bg-secondary/10 px-2.5 py-1 rounded-full text-secondary text-[10px] font-black uppercase tracking-widest">
                                                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                                                        Concept Key
                                                    </div>
                                                    <h3 className="text-white font-headline font-bold text-base">{msg.concept_key.title}</h3>
                                                    <p className="text-slate-400 text-sm leading-snug">{msg.concept_key.body}</p>
                                                </div>
                                                <div className="bg-surface-container-highest rounded-xl p-4 flex items-center justify-center border border-outline-variant/10">
                                                    <div className="text-center">
                                                        <span className="material-symbols-outlined text-primary text-4xl mb-1">functions</span>
                                                        {msg.concept_key.symbol && (
                                                            <p className="text-[11px] font-mono text-slate-400 mt-1">{msg.concept_key.symbol}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Timestamp + feedback */}
                                        <div className="flex items-center gap-3 ml-1">
                                            <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                                                Socratic Guidance • {formatTime(msg.timestamp)}
                                            </span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="material-symbols-outlined text-slate-500 hover:text-secondary text-sm transition-colors">thumb_up</button>
                                                <button className="material-symbols-outlined text-slate-500 hover:text-error text-sm transition-colors">thumb_down</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div className="flex items-start gap-3 max-w-2xl">
                            <div className="w-9 h-9 shrink-0 rounded-xl bg-surface-container-high border border-outline-variant/10 flex items-center justify-center mt-0.5">
                                <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                            </div>
                            <div className="bg-surface-container px-5 py-4 rounded-2xl rounded-tl-none border border-outline-variant/10 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </section>

                {/* ── Fixed bottom input ── */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
                    <div className="max-w-3xl mx-auto space-y-3 pointer-events-auto">

                        {/* Quick action pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/10 text-slate-300 text-xs font-bold hover:bg-surface-container-highest transition-all active:scale-95">
                                <span className="material-symbols-outlined text-sm">photo_camera</span>
                                Upload Photo of Problem
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/10 text-slate-300 text-xs font-bold hover:bg-surface-container-highest transition-all active:scale-95">
                                <span className="material-symbols-outlined text-sm">mic</span>
                                Voice Ask
                            </button>
                            <div className="h-4 w-px bg-outline-variant/20 hidden md:block" />
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full border border-outline-variant/10 text-slate-400 text-xs font-bold hover:text-white hover:bg-surface-container transition-all"
                                onClick={() => {
                                    setMessages([]);
                                    localStorage.removeItem(`${CACHE_KEY}_${user?.id ?? 'guest'}`);
                                }}
                            >
                                <span className="material-symbols-outlined text-sm">add_comment</span>
                                New Chat
                            </button>
                        </div>

                        {/* Input row */}
                        <div className="flex items-center gap-2 bg-surface-container rounded-2xl px-4 py-2 border border-outline-variant/15 focus-within:border-primary/30 transition-all shadow-nebula">
                            <input
                                ref={inputRef}
                                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-slate-500 text-sm py-2"
                                placeholder="Type your follow-up or ask a new question..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                disabled={loading}
                            />
                            <button
                                onClick={send}
                                disabled={!input.trim() || loading}
                                className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container transition-all hover:brightness-110 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-xp-glow shrink-0"
                            >
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                            </button>
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center justify-between px-1">
                            <span className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                AI is active
                            </span>
                            <button className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-wider px-3 py-1.5 border border-outline-variant/10 rounded-lg hover:border-outline-variant/25 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-sm">record_voice_over</span>
                                Escalate to Teacher
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Mobile bottom nav ── */}
            <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-5 pt-3 bg-background/90 backdrop-blur-2xl border-t border-outline-variant/10 lg:hidden">
                {NAV_LINKS.slice(0, 4).map(link => (
                    <button
                        key={link.label}
                        onClick={() => navigate(link.path)}
                        className={`flex flex-col items-center gap-1 ${link.active ? 'text-primary' : 'text-slate-500'}`}
                    >
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: link.active ? "'FILL' 1" : "'FILL' 0" }}>
                            {link.icon}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">{link.label.split(' ')[0]}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
