import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';

// ── Static mock data for chart visuals ───────────────────────────
const DAY_BARS = [32, 41, 28, 47, 52, 44, 38, 55, 49, 36, 43, 58, 62, 51,
    45, 39, 48, 54, 61, 57, 42, 38, 46, 53, 59, 64, 50, 44, 41, 67];

const SUBJECT_SCORES = [
    { label: 'Mathematics', pct: 82, color: 'bg-secondary' },
    { label: 'Physics', pct: 74, color: 'bg-primary-container' },
    { label: 'Biology', pct: 91, color: 'bg-secondary' },
    { label: 'Chemistry', pct: 68, color: 'bg-error' },
];

const WEAK_CONCEPTS = [
    { rank: '01', name: 'Irrational Proofs', meta: 'Mathematics • 42% Error Rate', severity: 'error' },
    { rank: '02', name: 'Chemical Bonding', meta: 'Chemistry • 38% Error Rate', severity: 'tertiary' },
    { rank: '03', name: 'Circular Motion', meta: 'Physics • 35% Error Rate', severity: 'tertiary' },
    { rank: '04', name: 'Photosynthesis', meta: 'Biology • 29% Error Rate', severity: 'outline' },
];

type AdminTab = 'overview' | 'approvals' | 'courses';

const SIDEBAR_LINKS: { icon: string; label: string; tab: AdminTab | null }[] = [
    { icon: 'dashboard',      label: 'Overview',         tab: 'overview' },
    { icon: 'fact_check',     label: 'Course Approvals', tab: 'approvals' },
    { icon: 'collections_bookmark', label: 'Courses',   tab: 'courses' },
    { icon: 'group',          label: 'Users',            tab: null },
    { icon: 'quiz',           label: 'Question Bank',    tab: null },
    { icon: 'inventory_2',    label: 'Paper Database',   tab: null },
    { icon: 'psychology_alt', label: 'Weak Concepts',    tab: null },
    { icon: 'terminal',       label: 'System Logs',      tab: null },
];

const MODE_BADGE: Record<string, string> = {
    full_ai: 'bg-primary/10 text-primary',
    smart_hybrid: 'bg-secondary/10 text-secondary',
    manual: 'bg-tertiary-container/10 text-tertiary-container',
};
const MODE_LABEL: Record<string, string> = {
    full_ai: 'Full AI',
    smart_hybrid: 'Smart Hybrid',
    manual: 'Manual',
};

function initials(name: string) {
    return name.slice(0, 2).toUpperCase();
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userFilter, setUserFilter] = useState('');
    const [localUsers, setLocalUsers] = useState<any[]>([]);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [pendingCourses, setPendingCourses] = useState<any[]>([]);
    const [approvingId, setApprovingId] = useState<number | null>(null);
    const [publishedCourses, setPublishedCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [assigningId, setAssigningId] = useState<number | null>(null);

    const fetchPublishedCourses = () =>
        api.get('/teacher/courses/assigned/').then(r => setPublishedCourses(r.data)).catch(() => {});

    useEffect(() => {
        api.get('/auth/admin/analytics/')
            .then(r => { setData(r.data); setLocalUsers(r.data.users ?? []); })
            .catch(() => setData(null))
            .finally(() => setLoading(false));
        api.get('/teacher/courses/pending/')
            .then(r => setPendingCourses(r.data))
            .catch(() => {});
        fetchPublishedCourses();
        api.get('/teacher/teachers/').then(r => setTeachers(r.data)).catch(() => {});
    }, []);

    const handleAssign = async (unitId: number, teacherId: number | '') => {
        setAssigningId(unitId);
        try {
            await api.post(`/teacher/courses/${unitId}/assign/`, { teacher_id: teacherId || null });
            setPublishedCourses(prev => prev.map(c =>
                c.id === unitId
                    ? {
                        ...c,
                        assigned_teacher_id: teacherId || null,
                        assigned_teacher_name: teacherId
                            ? (teachers.find(t => t.id === teacherId)?.username ?? null)
                            : null,
                    }
                    : c
            ));
        } catch (err: any) {
            alert(err?.response?.data?.error ?? 'Assignment failed');
        } finally {
            setAssigningId(null);
        }
    };

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

    const kpi = data?.kpi ?? {};
    const papers: any[] = data?.papers ?? [];
    const qbank: any[] = data?.qbank_by_subject ?? [];

    const toggleCourseBuilder = async (userId: number) => {
        setTogglingId(userId);
        try {
            const res = await api.post(`/auth/admin/users/${userId}/toggle-course-builder/`);
            setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, can_build_courses: res.data.can_build_courses } : u));
        } catch {
            // ignore — user sees no change
        } finally {
            setTogglingId(null);
        }
    };

    const filteredUsers = localUsers.filter(u =>
        u.username.toLowerCase().includes(userFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(userFilter.toLowerCase())
    );

    const maxBar = Math.max(...DAY_BARS);

    return (
        <div className="flex h-screen bg-background overflow-hidden">

            {/* ── Sidebar ── */}
            <aside className="fixed left-0 top-0 h-screen w-64 hidden lg:flex flex-col p-4 gap-1 bg-surface-container-lowest border-r border-outline-variant/10 z-40">
                <div className="flex items-center gap-3 px-3 py-4 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                    </div>
                    <div>
                        <p className="text-white font-black font-headline leading-none text-base">Envirr</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">Admin Console</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-0.5 flex-1">
                    {SIDEBAR_LINKS.map(link => {
                        const active = link.tab !== null && activeTab === link.tab;
                        return (
                            <button
                                key={link.label}
                                onClick={() => link.tab && setActiveTab(link.tab)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    active
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-slate-400 hover:text-white hover:bg-surface-container-high'
                                }`}
                            >
                                <span className="material-symbols-outlined text-xl">{link.icon}</span>
                                {link.label}
                                {link.tab === 'approvals' && pendingCourses.length > 0 && (
                                    <span className="ml-auto text-[10px] font-black bg-error text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                        {pendingCourses.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Admin identity + logout */}
                <div className="pt-4 border-t border-outline-variant/10 px-3 py-3 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-xs font-black text-primary">
                            {user?.username?.[0]?.toUpperCase() ?? 'A'}
                        </div>
                        <div className="overflow-hidden flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-200 truncate">{user?.username ?? 'Administrator'}</p>
                            <p className="text-[10px] text-slate-500 truncate">Admin Console</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-surface-container-high transition-all"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 lg:ml-64 overflow-y-auto no-scrollbar">

                {/* Top bar */}
                <header className="sticky top-0 z-30 flex justify-between items-center h-14 px-6 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10">
                    <div className="relative w-80">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">search</span>
                        <input
                            className="w-full bg-surface-container rounded-full py-2 pl-10 pr-4 text-sm border-none focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-slate-600 text-on-surface"
                            placeholder="Search analytics, users, or concepts..."
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="relative text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full" />
                        </button>
                        <button className="text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                    </div>
                </header>

                <div className="p-6 md:p-8 space-y-8">

                    {/* ── Course Approvals Tab ── */}
                    {activeTab === 'approvals' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Admin Review</p>
                                    <h2 className="text-3xl font-extrabold font-headline tracking-tight text-white">Course Approvals</h2>
                                    <p className="text-slate-500 text-sm mt-1">Review and publish courses submitted by teachers.</p>
                                </div>
                                <button
                                    onClick={() => api.get('/teacher/courses/pending/').then(r => setPendingCourses(r.data)).catch(() => {})}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-white hover:border-outline-variant/40 text-xs font-bold transition-all"
                                >
                                    <span className="material-symbols-outlined text-base">refresh</span>
                                    Refresh
                                </button>
                            </div>

                            {pendingCourses.length === 0 ? (
                                <div className="bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/15 p-20 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-3xl text-secondary">fact_check</span>
                                    </div>
                                    <h3 className="text-base font-black text-white mb-1">All Clear</h3>
                                    <p className="text-slate-500 text-sm max-w-xs">No courses pending review. Teacher submissions will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingCourses.map(course => (
                                        <div key={course.id} className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-primary text-2xl">{course.icon || 'school'}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                                        <div>
                                                            <h3 className="text-base font-black text-white">{course.title}</h3>
                                                            <p className="text-xs text-slate-500 mt-0.5">{course.subject} · Grade {course.class_grade} · {course.board}</p>
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full border border-tertiary/20 shrink-0">Pending</span>
                                                    </div>
                                                    {course.description && (
                                                        <p className="text-sm text-slate-400 mt-2 leading-relaxed line-clamp-2">{course.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-5 mt-3 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-sm">menu_book</span>
                                                            {course.chapters} chapter{course.chapters !== 1 ? 's' : ''}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-sm">account_tree</span>
                                                            {course.nodes} node{course.nodes !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-outline-variant/10">
                                                <button
                                                    onClick={() => handleReview(course.id, 'approve')}
                                                    disabled={approvingId === course.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/10 border border-secondary/25 text-secondary text-sm font-bold hover:bg-secondary/20 transition-all disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                                    {approvingId === course.id ? 'Processing…' : 'Approve & Publish'}
                                                </button>
                                                <button
                                                    onClick={() => handleReview(course.id, 'reject')}
                                                    disabled={approvingId === course.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-bold hover:bg-error/20 transition-all disabled:opacity-50"
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

                    {/* ── Courses Tab ── */}
                    {activeTab === 'courses' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Admin</p>
                                    <h2 className="text-3xl font-extrabold font-headline tracking-tight text-white">Course Management</h2>
                                    <p className="text-slate-500 text-sm mt-1">Assign published courses to teachers for editing.</p>
                                </div>
                                <button
                                    onClick={fetchPublishedCourses}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-white hover:border-outline-variant/40 text-xs font-bold transition-all"
                                >
                                    <span className="material-symbols-outlined text-base">refresh</span>
                                    Refresh
                                </button>
                            </div>

                            {publishedCourses.length === 0 ? (
                                <div className="bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/15 p-20 flex flex-col items-center justify-center text-center">
                                    <span className="material-symbols-outlined text-4xl text-outline-variant/40 mb-3">collections_bookmark</span>
                                    <h3 className="text-base font-black text-white mb-1">No Published Courses</h3>
                                    <p className="text-slate-500 text-sm max-w-xs">Approve courses from the Approvals tab first.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {publishedCourses.map(course => (
                                        <div key={course.id} className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-primary text-xl">{course.icon || 'school'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                                    <div>
                                                        <p className="text-sm font-black text-white truncate">{course.title}</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            {course.subject} · Grade {course.class_grade}
                                                            {course.board ? ` · ${course.board}` : ''}
                                                            · {course.chapters} ch · {course.nodes} nodes
                                                        </p>
                                                    </div>
                                                    {course.assigned_teacher_name && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-full shrink-0">
                                                            <span className="material-symbols-outlined text-sm">person</span>
                                                            {course.assigned_teacher_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <select
                                                    className="bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
                                                    value={course.assigned_teacher_id ?? ''}
                                                    onChange={e => handleAssign(course.id, e.target.value ? Number(e.target.value) : '')}
                                                    disabled={assigningId === course.id}
                                                >
                                                    <option value="">— Unassigned —</option>
                                                    {teachers.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.username}{t.first_name ? ` (${t.first_name})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {assigningId === course.id && (
                                                    <span className="material-symbols-outlined text-primary text-base animate-spin">progress_activity</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Overview Tab ── */}
                    {activeTab === 'overview' && <>

                    {/* Page header */}
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-extrabold font-headline tracking-tight text-white mb-1">Overview Dashboard</h2>
                            <p className="text-slate-500 text-sm">Real-time performance metrics and platform health.</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface text-sm font-bold rounded-xl hover:bg-surface-container-highest transition-all border border-outline-variant/10">
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                Last 30 Days
                            </button>
                            <button className="px-4 py-2 bg-primary-container text-on-primary-container text-sm font-black rounded-xl hover:brightness-110 transition-all">
                                Export Report
                            </button>
                        </div>
                    </div>

                    {/* ── KPI Row ── */}
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-32 bg-surface-container-high rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {/* Total Users */}
                            <div className="p-5 bg-surface-container-low rounded-xl space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Users</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-extrabold text-white">{kpi.total_users?.toLocaleString() ?? '—'}</span>
                                    <span className="text-secondary text-[10px] font-bold flex items-center gap-0.5">
                                        +4.2% <span className="material-symbols-outlined text-sm">trending_up</span>
                                    </span>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-outline-variant/10">
                                    <div className="flex justify-between text-[10px] text-slate-500"><span>Students</span><span>{kpi.students?.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-[10px] text-slate-500"><span>Teachers</span><span>{kpi.teachers?.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-[10px] text-slate-500"><span>Admins</span><span>{kpi.admins?.toLocaleString()}</span></div>
                                </div>
                            </div>

                            {/* Active Students */}
                            <div className="p-5 bg-surface-container-low rounded-xl space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Students</p>
                                <span className="text-2xl font-extrabold text-white">{kpi.students?.toLocaleString() ?? '—'}</span>
                                <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-secondary w-3/4 rounded-full" />
                                </div>
                                <p className="text-[10px] text-slate-500">Registered on platform</p>
                            </div>

                            {/* Question Bank */}
                            <div className="p-5 bg-surface-container-low rounded-xl space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Question Bank</p>
                                <span className="text-2xl font-extrabold text-white">{kpi.total_questions?.toLocaleString() ?? '—'}</span>
                                <div className="flex gap-0.5 h-1.5 mt-1">
                                    <div className="bg-primary rounded-l-full" style={{ width: '65%' }} />
                                    <div className="bg-tertiary rounded-r-full" style={{ width: '35%' }} />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-500">
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> 65% AI</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-tertiary inline-block" /> 35% Manual</span>
                                </div>
                            </div>

                            {/* Papers Created */}
                            <div className="p-5 bg-surface-container-low rounded-xl space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Papers Created</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-extrabold text-white">{kpi.total_papers?.toLocaleString() ?? '—'}</span>
                                    <span className="material-symbols-outlined text-primary">description</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">Monthly generation rate</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-secondary text-xs font-bold">+12%</span>
                                    <span className="text-slate-600 text-[10px]">vs prev month</span>
                                </div>
                            </div>

                            {/* Avg Score */}
                            <div className="p-5 bg-surface-container-low rounded-xl space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg. Platform Score</p>
                                <span className="text-2xl font-extrabold text-white">78%</span>
                                <div className="relative pt-4">
                                    <div className="w-full h-1 bg-surface-container-highest rounded-full" />
                                    <div className="absolute top-4 w-1.5 h-3 bg-white rounded-full -translate-x-1/2" style={{ left: '78%' }} />
                                </div>
                                <p className="text-[10px] text-slate-500">Benchmark: 75% Target</p>
                            </div>
                        </div>
                    )}

                    {/* ── Charts Row ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Daily Active Students bar chart */}
                        <div className="lg:col-span-3 bg-surface-container-low rounded-2xl p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-200">Daily Active Students (30D)</h3>
                                <span className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Current Period
                                </span>
                            </div>
                            <div className="h-40 flex items-end gap-0.5">
                                {DAY_BARS.map((val, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-gradient-to-t from-primary/30 to-primary/5 rounded-t hover:from-primary/50 transition-all cursor-default"
                                        style={{ height: `${(val / maxBar) * 100}%` }}
                                        title={`Day ${i + 1}: ${val}k`}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600 mt-3 px-1">
                                <span>1 Oct</span><span>10 Oct</span><span>20 Oct</span><span>30 Oct</span>
                            </div>
                        </div>

                        {/* Subject-wise scores */}
                        <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-slate-200 mb-6">Subject-wise Average Quiz Score</h3>
                            <div className="space-y-5">
                                {SUBJECT_SCORES.map(s => (
                                    <div key={s.label} className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-400">{s.label}</span>
                                            <span className="text-white">{s.pct}%</span>
                                        </div>
                                        <div className="h-2 bg-surface-container-highest rounded-full relative">
                                            <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                                            <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: '75%' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Triple panel ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Q-Bank Health */}
                        <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-outline-variant/10">
                                <h3 className="text-sm font-bold text-slate-200">Question Bank Health</h3>
                            </div>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-slate-500 font-bold border-b border-outline-variant/10">
                                        <th className="px-4 py-3 text-left">Subject</th>
                                        <th className="px-4 py-3 text-left">Total</th>
                                        <th className="px-4 py-3 text-left">AI-Gen</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {(qbank.length ? qbank : [
                                        { subject: 'Mathematics', total: 4201, ai_gen: 3100, status: 'Healthy', statusColor: 'text-secondary' },
                                        { subject: 'Physics', total: 3892, ai_gen: 2400, status: 'Review', statusColor: 'text-tertiary' },
                                        { subject: 'Biology', total: 5103, ai_gen: 4200, status: 'Healthy', statusColor: 'text-secondary' },
                                    ]).map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-surface-container-high/50 transition-colors">
                                            <td className="px-4 py-3 text-slate-200">{row.subject}</td>
                                            <td className="px-4 py-3 font-medium">{(row.total ?? row.total)?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-400">{(row.ai_gen ?? Math.floor(row.total * 0.65))?.toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={row.statusColor ?? (i % 2 === 0 ? 'text-secondary' : 'text-tertiary')}>
                                                    {row.status ?? (i % 2 === 0 ? 'Healthy' : 'Review')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* AI Review Queue */}
                        <div className="bg-surface-container-low rounded-2xl flex flex-col overflow-hidden">
                            <div className="px-5 py-4 border-b border-outline-variant/10 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-200">AI Review Queue</h3>
                                <span className="px-2 py-0.5 bg-error/15 text-error text-[10px] font-black rounded-full">14 PENDING</span>
                            </div>
                            <div className="p-4 space-y-3 overflow-y-auto">
                                {[
                                    { tag: 'CBSE 10th Math', diff: 'MEDIUM', diffColor: 'text-primary', q: 'Prove that √5 is irrational. Select the correct primary step in the proof by contradiction.' },
                                    { tag: 'CBSE 12th Physics', diff: 'HARD', diffColor: 'text-error', q: 'A particle moves in a circle of radius r. Find the centripetal acceleration in terms of angular velocity.' },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 bg-surface-container-lowest rounded-xl border-l-4 border-primary space-y-3">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="px-2 py-0.5 bg-surface-container rounded text-slate-400">{item.tag}</span>
                                            <span className={`font-black ${item.diffColor}`}>{item.diff}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed italic">"{item.q}"</p>
                                        <div className="flex gap-2 pt-1">
                                            <button className="flex-1 py-1.5 bg-secondary/10 text-secondary text-[10px] font-black rounded-lg hover:bg-secondary/20 transition-colors">APPROVE</button>
                                            <button className="flex-1 py-1.5 bg-error/10 text-error text-[10px] font-black rounded-lg hover:bg-error/20 transition-colors">REJECT</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weak Concept Trends */}
                        <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-outline-variant/10">
                                <h3 className="text-sm font-bold text-slate-200">Weak Concept Trends</h3>
                            </div>
                            <div className="p-3 space-y-1">
                                {WEAK_CONCEPTS.map(c => (
                                    <div key={c.rank} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-high rounded-xl transition-colors group">
                                        <span className="text-xs font-black text-slate-600 w-5">{c.rank}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-200 truncate">{c.name}</p>
                                            <p className="text-[10px] text-slate-500">{c.meta}</p>
                                        </div>
                                        <span className={`material-symbols-outlined text-${c.severity} text-base opacity-0 group-hover:opacity-100 transition-opacity`}>warning</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Paper Database ── */}
                    <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-outline-variant/10 flex justify-between items-center">
                            <h3 className="text-lg font-bold font-headline text-white">Paper Database</h3>
                            <button className="text-xs text-primary font-black hover:underline">View All Papers</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-slate-500 border-b border-outline-variant/10">
                                        {['Paper ID', 'Board / Grade', 'Subject', 'Mode', 'Creator', 'Date'].map(h => (
                                            <th key={h} className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {(loading ? [] : papers).map((p: any) => (
                                        <tr key={p.id} className="hover:bg-surface-container-high/40 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-primary">#{`EB-${p.id}-X`}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-white font-bold text-xs">{p.board}</div>
                                                <div className="text-[10px] text-slate-500">Grade {p.grade}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 text-xs">{p.subject}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded-full ${MODE_BADGE[p.mode] ?? 'bg-surface-container text-slate-400'}`}>
                                                    {MODE_LABEL[p.mode] ?? p.mode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{p.created_by}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{p.created_at}</td>
                                        </tr>
                                    ))}
                                    {!loading && papers.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">No papers generated yet.</td>
                                        </tr>
                                    )}
                                    {loading && Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="h-5 bg-surface-container-high rounded animate-pulse" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── User Management ── */}
                    <div className="bg-surface-container-low rounded-2xl overflow-hidden pb-4">
                        <div className="px-6 py-5 border-b border-outline-variant/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-lg font-bold font-headline text-white">User Management</h3>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">filter_list</span>
                                    <input
                                        className="w-full bg-surface-container-lowest rounded-xl text-xs py-2 pl-9 pr-4 border border-outline-variant/10 focus:ring-1 focus:ring-primary/20 focus:outline-none placeholder:text-slate-600 text-on-surface"
                                        placeholder="Filter by username or email..."
                                        value={userFilter}
                                        onChange={e => setUserFilter(e.target.value)}
                                    />
                                </div>
                                <button className="p-2 bg-surface-container-high rounded-xl hover:bg-surface-container-highest transition-all border border-outline-variant/10">
                                    <span className="material-symbols-outlined text-sm text-slate-400">download</span>
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-slate-500 border-b border-outline-variant/10">
                                    <tr>
                                        {['Username', 'Role', 'Join Date', 'Status', 'Actions'].map((h, i) => (
                                            <th key={h} className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {filteredUsers.map((u: any) => (
                                        <tr key={u.id} className="hover:bg-surface-container-high/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-black text-primary border border-outline-variant/10">
                                                        {initials(u.username)}
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold text-xs">{u.username}</div>
                                                        <div className="text-[10px] text-slate-500">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold capitalize ${
                                                        u.role === 'admin' ? 'text-primary' :
                                                        u.role === 'teacher' ? 'text-tertiary' : 'text-slate-300'
                                                    }`}>{u.role}</span>
                                                    {u.can_build_courses && (
                                                        <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary text-[9px] font-black rounded uppercase tracking-wider">
                                                            Course Builder
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{u.date_joined}</td>
                                            <td className="px-6 py-4">
                                                <div className={`w-8 h-4 rounded-full flex items-center px-1 ${u.is_active ? 'bg-secondary/20' : 'bg-surface-container-high'}`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${u.is_active ? 'bg-secondary ml-auto' : 'bg-slate-600'}`} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {u.role === 'teacher' && (
                                                        <button
                                                            disabled={togglingId === u.id}
                                                            onClick={() => toggleCourseBuilder(u.id)}
                                                            className={`text-[10px] font-black px-3 py-1.5 border rounded-lg transition-all disabled:opacity-50 ${
                                                                u.can_build_courses
                                                                    ? 'text-secondary border-secondary/30 hover:bg-secondary/5'
                                                                    : 'text-outline border-outline-variant/20 hover:text-secondary hover:border-secondary/30'
                                                            }`}
                                                        >
                                                            {togglingId === u.id ? '…' : u.can_build_courses ? 'REVOKE BUILDER' : 'GRANT BUILDER'}
                                                        </button>
                                                    )}
                                                    <button
                                                        className="text-[10px] font-black text-primary px-3 py-1.5 border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                                                        onClick={() => navigate(`/admin/users/${u.id}`)}
                                                    >
                                                        CHANGE ROLE
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">No users found.</td>
                                        </tr>
                                    )}
                                    {loading && Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="h-8 bg-surface-container-high rounded-xl animate-pulse" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 pt-4 flex justify-center">
                            <button className="text-xs text-slate-500 hover:text-primary font-bold transition-colors">Show More Users</button>
                        </div>
                    </div>

                    </>}

                </div>
            </main>

            {/* Ambient glow */}
            <div className="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] left-64 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
        </div>
    );
}
