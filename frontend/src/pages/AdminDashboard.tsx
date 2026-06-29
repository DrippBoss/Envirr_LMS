import { useState, useEffect } from 'react';
import { api, useAuth } from '../context/AuthContext';
import KpiCard from '../components/charts/KpiCard';
import AreaChart from '../components/charts/AreaChart';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';

// ── Chart helpers ────────────────────────────────────────────────
const subjectBarColor = (pct: number) =>
    pct >= 80 ? 'bg-secondary' : pct >= 60 ? 'bg-primary-container' : 'bg-error';

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
    const { logout, user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userFilter, setUserFilter] = useState('');
    const [localUsers, setLocalUsers] = useState<any[]>([]);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [togglingQEditorId, setTogglingQEditorId] = useState<number | null>(null);
    const [togglingStatusId, setTogglingStatusId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: number; username: string } | null>(null);
    const [allSubjects, setAllSubjects] = useState<string[]>([]);
    const [subjectEditorUserId, setSubjectEditorUserId] = useState<number | null>(null);
    const [subjectEditorValue, setSubjectEditorValue] = useState<string[]>([]);
    const [savingSubjects, setSavingSubjects] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [pendingCourses, setPendingCourses] = useState<any[]>([]);
    const [approvingId, setApprovingId] = useState<number | null>(null);
    const [publishedCourses, setPublishedCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [assigningId, setAssigningId] = useState<number | null>(null);
    const [usersPage, setUsersPage] = useState(1);
    const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
    const [health, setHealth] = useState<any>(null);

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
        api.get('/ai/questions/meta/').then(r => setAllSubjects(r.data.subjects ?? [])).catch(() => {});
        api.get('/auth/admin/system-health/').then(r => setHealth(r.data)).catch(() => {});
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
    const dayBars: number[] = data?.day_bars ?? [];
    const subjectScores: any[] = data?.subject_scores ?? [];
    const weakConcepts: any[] = data?.weak_concepts ?? [];

    // ── Chart-ready series (from the extended analytics payload) ──
    const growth: { day: string; count: number }[] = data?.user_growth ?? [];
    const growthCounts = growth.map(g => g.count);
    const cumulativeGrowth = growthCounts.reduce<number[]>((acc, n) => {
        acc.push((acc[acc.length - 1] ?? (kpi.total_users ?? 0) - growthCounts.reduce((s, x) => s + x, 0)) + n);
        return acc;
    }, []);
    const newThisWeek = growthCounts.slice(-7).reduce((s, n) => s + n, 0);
    const aiUsage = data?.ai_usage ?? { ai_generated: 0, manual: 0, verified: 0, unverified: 0 };
    const paperModes: { mode: string; count: number }[] = data?.paper_modes ?? [];
    const reviewQueue: any[] = data?.review_queue ?? [];
    const recentActivity: any[] = data?.recent_activity ?? [];
    const verifiedPct = kpi.total_questions
        ? Math.round((aiUsage.verified / kpi.total_questions) * 100) : 0;

    // Sparse 30-day x labels for the growth/engagement axes.
    const growthLabels = ['30d', '20d', '10d', 'Today'];
    const relTimeShort = (iso: string) => {
        const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
        if (h < 1) return 'now';
        if (h < 24) return `${h}h`;
        return `${Math.floor(h / 24)}d`;
    };

    const handleDeleteUser = async () => {
        if (!confirmDelete) return;
        setDeletingId(confirmDelete.id);
        try {
            await api.delete(`/auth/admin/users/${confirmDelete.id}/delete/`);
            setLocalUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
            setConfirmDelete(null);
        } catch (err: any) {
            alert(err?.response?.data?.detail ?? 'Failed to delete user.');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleUserStatus = async (userId: number) => {
        setTogglingStatusId(userId);
        try {
            const res = await api.post(`/auth/admin/users/${userId}/toggle-status/`);
            setLocalUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, is_active: res.data.is_active } : u
            ));
        } catch (err: any) {
            alert(err?.response?.data?.detail ?? 'Failed to update status.');
        } finally {
            setTogglingStatusId(null);
        }
    };

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

    const openSubjectEditor = (u: any) => {
        setSubjectEditorUserId(u.id);
        setSubjectEditorValue(u.assigned_subjects ?? []);
    };

    const saveAssignedSubjects = async () => {
        if (subjectEditorUserId === null) return;
        setSavingSubjects(true);
        try {
            const res = await api.post(`/auth/admin/users/${subjectEditorUserId}/assign-subjects/`, { subjects: subjectEditorValue });
            setLocalUsers(prev => prev.map(u => u.id === subjectEditorUserId ? { ...u, assigned_subjects: res.data.assigned_subjects } : u));
            setSubjectEditorUserId(null);
        } catch { /* ignore; editor state is reset in finally */ }
        finally { setSavingSubjects(false); }
    };

    const toggleQuestionEditor = async (userId: number) => {
        setTogglingQEditorId(userId);
        try {
            const res = await api.post(`/auth/admin/users/${userId}/toggle-question-editor/`);
            setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, can_edit_questions: res.data.can_edit_questions } : u));
        } catch {
            // ignore — user sees no change
        } finally {
            setTogglingQEditorId(null);
        }
    };

    const filteredUsers = localUsers.filter(u =>
        u.username.toLowerCase().includes(userFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(userFilter.toLowerCase())
    );

    const hasMoreUsers = localUsers.length < (kpi.total_users ?? 0);

    const handleShowMoreUsers = async () => {
        if (loadingMoreUsers || !hasMoreUsers) return;
        setLoadingMoreUsers(true);
        try {
            const res = await api.get(`/auth/admin/users/?page=${usersPage + 1}`);
            const incoming: any[] = res.data?.results ?? [];
            setLocalUsers(prev => {
                const seen = new Set(prev.map(u => u.id));
                return [...prev, ...incoming.filter(u => !seen.has(u.id))];
            });
            setUsersPage(p => p + 1);
        } catch {
            // ignore — button stays available for retry
        } finally {
            setLoadingMoreUsers(false);
        }
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden">

            {/* ── Mobile sidebar backdrop ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside className={`fixed left-0 top-0 h-screen w-64 flex-col p-4 gap-1 bg-surface-container-lowest border-r border-outline-variant/10 z-40 transition-transform duration-200 ${sidebarOpen ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex items-center gap-3 px-3 py-4 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                    </div>
                    <div>
                        <p className="text-on-surface font-black font-headline leading-none text-base">Envirr</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">Admin Console</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-0.5 flex-1">
                    {SIDEBAR_LINKS.map(link => {
                        const active = link.tab !== null && activeTab === link.tab;
                        return (
                            <button
                                key={link.label}
                                onClick={() => { if (link.tab) { setActiveTab(link.tab); setSidebarOpen(false); } }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    active
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-slate-400 hover:text-on-surface hover:bg-surface-container-high'
                                }`}
                            >
                                <span className="material-symbols-outlined text-xl">{link.icon}</span>
                                {link.label}
                                {link.tab === 'approvals' && pendingCourses.length > 0 && (
                                    <span className="ml-auto text-[10px] font-black bg-error text-on-surface rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
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
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-on-surface hover:bg-surface-container-high transition-all"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 lg:ml-64 overflow-y-auto no-scrollbar">

                {/* Top bar */}
                <header className="sticky top-0 z-30 flex justify-between items-center h-14 px-4 md:px-6 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Hamburger — mobile only */}
                        <button
                            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-on-surface hover:bg-surface-container-high transition-colors shrink-0"
                            onClick={() => setSidebarOpen(v => !v)}
                            aria-label="Open sidebar"
                        >
                            <span className="material-symbols-outlined text-xl">menu</span>
                        </button>
                    </div>
                    {/* Notifications and settings icons removed until backend models exist */}
                </header>

                <div className="p-6 md:p-8 space-y-8">

                    {/* ── Course Approvals Tab ── */}
                    {activeTab === 'approvals' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Admin Review</p>
                                    <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Course Approvals</h2>
                                    <p className="text-slate-500 text-sm mt-1">Review and publish courses submitted by teachers.</p>
                                </div>
                                <button
                                    onClick={() => api.get('/teacher/courses/pending/').then(r => setPendingCourses(r.data)).catch(() => {})}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-on-surface hover:border-outline-variant/40 text-xs font-bold transition-all"
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
                                    <h3 className="text-base font-black text-on-surface mb-1">All Clear</h3>
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
                                                            <h3 className="text-base font-black text-on-surface">{course.title}</h3>
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
                                    <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Course Management</h2>
                                    <p className="text-slate-500 text-sm mt-1">Assign published courses to teachers for editing.</p>
                                </div>
                                <button
                                    onClick={fetchPublishedCourses}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-on-surface hover:border-outline-variant/40 text-xs font-bold transition-all"
                                >
                                    <span className="material-symbols-outlined text-base">refresh</span>
                                    Refresh
                                </button>
                            </div>

                            {publishedCourses.length === 0 ? (
                                <div className="bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/15 p-20 flex flex-col items-center justify-center text-center">
                                    <span className="material-symbols-outlined text-4xl text-outline-variant/40 mb-3">collections_bookmark</span>
                                    <h3 className="text-base font-black text-on-surface mb-1">No Published Courses</h3>
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
                                                        <p className="text-sm font-black text-on-surface truncate">{course.title}</p>
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
                            <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface mb-1">Overview Dashboard</h2>
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
                                <div key={i} className="h-36 bg-surface-container-high rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <KpiCard
                                label="Total Users" value={(kpi.total_users ?? 0).toLocaleString()} icon="group"
                                accent="primary" sparkline={cumulativeGrowth}
                                footer={
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-outline"><span>Students</span><span>{kpi.students?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-[10px] text-outline"><span>Teachers</span><span>{kpi.teachers?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-[10px] text-outline"><span>+ this week</span><span className="text-secondary font-bold">+{newThisWeek}</span></div>
                                    </div>
                                }
                            />
                            <KpiCard
                                label="Active (30d)" value={Math.max(0, ...dayBars).toLocaleString()} icon="bolt"
                                accent="secondary" sparkline={dayBars}
                                footer={<p className="text-[10px] text-outline">Peak daily active students</p>}
                            />
                            <KpiCard
                                label="Question Bank" value={(kpi.total_questions ?? 0).toLocaleString()} icon="quiz"
                                accent="tertiary"
                                footer={<p className="text-[10px] text-outline">{kpi.total_questions ? Math.round((aiUsage.ai_generated / kpi.total_questions) * 100) : 0}% AI-generated</p>}
                            />
                            <KpiCard
                                label="Papers" value={(kpi.total_papers ?? 0).toLocaleString()} icon="description"
                                accent="primary"
                                footer={<p className="text-[10px] text-outline">{paperModes.length} generation modes</p>}
                            />
                            <KpiCard
                                label="Verified" value={`${verifiedPct}%`} icon="verified"
                                accent="secondary"
                                footer={<p className="text-[10px] text-outline">{aiUsage.verified}/{kpi.total_questions ?? 0} questions</p>}
                            />
                        </div>
                    )}

                    {/* ── User Growth + AI Usage ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-on-surface">User Growth</h3>
                                    <p className="text-[10px] text-outline mt-0.5">New sign-ups · last 30 days</p>
                                </div>
                                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">+{newThisWeek} this week</span>
                            </div>
                            <AreaChart data={growthCounts} xLabels={growthLabels} colorVar="primary" valueFormatter={n => `${n}`} />
                        </div>
                        <div className="lg:col-span-2 bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
                            <h3 className="text-sm font-bold text-on-surface mb-1">AI Usage</h3>
                            <p className="text-[10px] text-outline mb-5">Question bank provenance</p>
                            <DonutChart
                                centerLabel="Questions" centerValue={(kpi.total_questions ?? 0).toLocaleString()}
                                slices={[
                                    { label: 'AI-generated', value: aiUsage.ai_generated, colorVar: 'primary' },
                                    { label: 'Manual', value: aiUsage.manual, colorVar: 'tertiary' },
                                ]}
                            />
                            {paperModes.length > 0 && (
                                <div className="mt-5 pt-4 border-t border-outline-variant/10 space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Papers by mode</p>
                                    {paperModes.map(m => (
                                        <div key={m.mode} className="flex justify-between text-[11px]">
                                            <span className="text-on-surface-variant capitalize">{m.mode.replace('_', ' ')}</span>
                                            <span className="font-bold text-on-surface">{m.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Engagement + System Health ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-on-surface">Engagement</h3>
                                    <p className="text-[10px] text-outline mt-0.5">Daily active students · last 30 days</p>
                                </div>
                                <span className="flex items-center gap-2 text-[10px] text-outline">
                                    <span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Active / day
                                </span>
                            </div>
                            <BarChart
                                data={dayBars} colorVar="secondary"
                                xLabels={['30d ago', '20d', '10d', 'Today']}
                                tooltips={dayBars.map((v, i) => `${dayBars.length - 1 - i === 0 ? 'Today' : `${dayBars.length - 1 - i}d ago`}: ${v} active`)}
                            />
                        </div>
                        <div className="lg:col-span-2 bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
                            <h3 className="text-sm font-bold text-on-surface mb-5">System Health</h3>
                            <div className="space-y-3">
                                {(health?.services ?? []).map((s: any) => {
                                    const ok = s.status === 'operational';
                                    const degraded = s.status === 'degraded';
                                    return (
                                        <div key={s.name} className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-on-surface-variant">{s.name}</span>
                                            <span className={`flex items-center gap-1.5 text-[11px] font-bold ${ok ? 'text-secondary' : degraded ? 'text-tertiary' : 'text-error'}`}>
                                                <span className={`w-2 h-2 rounded-full ${ok ? 'bg-secondary' : degraded ? 'bg-tertiary' : 'bg-error'}`} />
                                                {ok ? 'Operational' : degraded ? 'Degraded' : 'Down'}
                                            </span>
                                        </div>
                                    );
                                })}
                                {!health && <p className="text-xs text-outline">Checking services…</p>}
                            </div>
                            {health?.metrics && (
                                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-outline-variant/10">
                                    {Object.entries(health.metrics).map(([k, v]) => (
                                        <div key={k} className="text-center">
                                            <p className="text-lg font-black text-on-surface font-headline">{(v as number).toLocaleString()}</p>
                                            <p className="text-[9px] text-outline uppercase tracking-widest">{k}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Revenue (API-ready) + Recent Activity / Audit ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <h3 className="text-sm font-bold text-on-surface">Revenue</h3>
                                    <p className="text-[10px] text-outline mt-0.5">Monthly recurring revenue</p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">API-ready</span>
                            </div>
                            <div className="opacity-30 pointer-events-none select-none">
                                <AreaChart data={[3, 5, 4, 7, 6, 9, 8, 11, 10, 13]} colorVar="secondary" height={140} valueFormatter={n => `$${n}k`} />
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                <span className="material-symbols-outlined text-3xl text-outline mb-2">payments</span>
                                <p className="text-sm font-bold text-on-surface">No billing provider connected</p>
                                <p className="text-[11px] text-outline max-w-xs mt-1">Wire a billing source to <code className="text-primary">RevenueData</code> and this chart goes live. Sample shown.</p>
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                            <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-on-surface">Recent Activity</h3>
                                <span className="material-symbols-outlined text-outline text-base">history</span>
                            </div>
                            <div className="p-3 space-y-1 max-h-[260px] overflow-y-auto no-scrollbar">
                                {recentActivity.length === 0 && <p className="text-xs text-outline py-6 text-center">No recent activity.</p>}
                                {recentActivity.map((a, i) => (
                                    <div key={i} className="flex items-start gap-3 px-2 py-2 hover:bg-surface-container-high rounded-lg transition-colors">
                                        <span className={`material-symbols-outlined text-base mt-0.5 ${a.type === 'user_joined' ? 'text-primary' : 'text-tertiary'}`}>
                                            {a.type === 'user_joined' ? 'person_add' : 'description'}
                                        </span>
                                        <p className="text-xs text-on-surface-variant leading-snug flex-1">{a.label}</p>
                                        <span className="text-[10px] text-outline shrink-0">{relTimeShort(a.at)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Subject scores + AI Review queue ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
                            <h3 className="text-sm font-bold text-on-surface mb-6">Subject-wise Average Quiz Score</h3>
                            {subjectScores.length ? (
                                <div className="space-y-5">
                                    {subjectScores.map(s => (
                                        <div key={s.label} className="space-y-2">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-on-surface-variant">{s.label}</span>
                                                <span className="text-on-surface">{s.pct}%</span>
                                            </div>
                                            <div className="h-2 bg-surface-container-highest rounded-full relative">
                                                <div className={`h-full ${subjectBarColor(s.pct)} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                                                <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: '75%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-outline py-8 text-center">No completed mock tests yet.</p>
                            )}
                        </div>
                        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 flex flex-col overflow-hidden">
                            <div className="px-5 py-4 border-b border-outline-variant/10 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-on-surface">Question Review Queue</h3>
                                {aiUsage.unverified > 0 && (
                                    <span className="px-2 py-0.5 bg-error/15 text-error text-[10px] font-black rounded-full">{aiUsage.unverified} UNVERIFIED</span>
                                )}
                            </div>
                            <div className="p-4 space-y-3 overflow-y-auto">
                                {reviewQueue.length === 0 && (
                                    <p className="text-xs text-outline py-8 text-center">All questions verified. 🎉</p>
                                )}
                                {reviewQueue.map((q: any) => (
                                    <div key={q.id} className="p-4 bg-surface-container-lowest rounded-xl border-l-4 border-primary space-y-2">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="px-2 py-0.5 bg-surface-container rounded text-on-surface-variant">{q.subject} · {q.chapter}</span>
                                            <span className="flex items-center gap-1.5">
                                                {q.is_ai_generated && <span className="text-primary font-black uppercase">AI</span>}
                                                <span className="font-black text-tertiary uppercase">{q.difficulty}</span>
                                            </span>
                                        </div>
                                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 italic">{q.question_text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Q-Bank Health + Weak Concepts ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Q-Bank Health */}
                        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                            <div className="px-5 py-4 border-b border-outline-variant/10">
                                <h3 className="text-sm font-bold text-on-surface">Question Bank by Subject</h3>
                            </div>
                            {qbank.length ? (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-outline font-bold border-b border-outline-variant/10">
                                            <th className="px-5 py-3 text-left">Subject</th>
                                            <th className="px-5 py-3 text-right">Questions</th>
                                            <th className="px-5 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/10">
                                        {qbank.map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-surface-container-high/50 transition-colors">
                                                <td className="px-5 py-3 text-on-surface font-medium">{row.subject}</td>
                                                <td className="px-5 py-3 text-right font-bold text-on-surface">{row.total?.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={row.total >= 20 ? 'text-secondary' : 'text-tertiary'}>
                                                        {row.total >= 20 ? 'Healthy' : 'Low stock'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-xs text-outline py-10 text-center">No questions in the bank yet.</p>
                            )}
                        </div>

                        {/* Weak Concept Trends */}
                        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
                            <div className="px-5 py-4 border-b border-outline-variant/10">
                                <h3 className="text-sm font-bold text-on-surface">Weak Concept Trends</h3>
                            </div>
                            <div className="p-3 space-y-1">
                                {weakConcepts.length ? weakConcepts.map((c, i) => (
                                    <div key={`${c.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-high rounded-xl transition-colors group">
                                        <span className="text-xs font-black text-outline w-5">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-on-surface truncate">{c.name}</p>
                                            <p className="text-[10px] text-outline">{c.subject} • {c.error_rate}% Error Rate</p>
                                        </div>
                                        <div className="w-20 h-1.5 bg-surface-container-highest rounded-full overflow-hidden shrink-0">
                                            <div className={`h-full rounded-full ${c.error_rate >= 40 ? 'bg-error' : c.error_rate >= 30 ? 'bg-tertiary' : 'bg-outline'}`} style={{ width: `${Math.min(100, c.error_rate)}%` }} />
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-outline py-6 text-center">No weak concepts identified yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Paper Database ── */}
                    <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-outline-variant/10 flex justify-between items-center">
                            <h3 className="text-lg font-bold font-headline text-on-surface">Paper Database</h3>
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
                                                <div className="text-on-surface font-bold text-xs">{p.board}</div>
                                                <div className="text-[10px] text-slate-500">Grade {p.grade}</div>
                                            </td>
                                            <td className="px-6 py-4 text-on-surface-variant text-xs">{p.subject}</td>
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
                            <h3 className="text-lg font-bold font-headline text-on-surface">User Management</h3>
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
                                                        <div className="text-on-surface font-bold text-xs">{u.username}</div>
                                                        <div className="text-[10px] text-slate-500">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold capitalize ${
                                                        u.role === 'admin' ? 'text-primary' :
                                                        u.role === 'teacher' ? 'text-tertiary' : 'text-on-surface-variant'
                                                    }`}>{u.role}</span>
                                                    {u.can_build_courses && (
                                                        <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary text-[9px] font-black rounded uppercase tracking-wider">
                                                            Course Builder
                                                        </span>
                                                    )}
                                                    {u.can_edit_questions && (
                                                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded uppercase tracking-wider">
                                                            Q Editor
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{u.date_joined}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => u.role !== 'admin' && toggleUserStatus(u.id)}
                                                    disabled={togglingStatusId === u.id || u.role === 'admin'}
                                                    title={u.role === 'admin' ? 'Admin status cannot be changed' : u.is_active ? 'Click to deactivate' : 'Click to activate'}
                                                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none
                                                        ${u.role === 'admin' ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                                                        ${u.is_active ? 'bg-secondary/40' : 'bg-surface-container-high border border-outline-variant/20'}
                                                        ${togglingStatusId === u.id ? 'opacity-50' : ''}
                                                    `}
                                                >
                                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-200
                                                        ${u.is_active ? 'left-5 bg-secondary' : 'left-0.5 bg-slate-500'}
                                                    `} />
                                                </button>
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
                                                    {u.role === 'teacher' && (
                                                        <button
                                                            disabled={togglingQEditorId === u.id}
                                                            onClick={() => toggleQuestionEditor(u.id)}
                                                            title="Grant or revoke permission to edit questions in the question bank"
                                                            className={`text-[10px] font-black px-3 py-1.5 border rounded-lg transition-all disabled:opacity-50 ${
                                                                u.can_edit_questions
                                                                    ? 'text-primary border-primary/30 hover:bg-primary/5'
                                                                    : 'text-outline border-outline-variant/20 hover:text-primary hover:border-primary/30'
                                                            }`}
                                                        >
                                                            {togglingQEditorId === u.id ? '…' : u.can_edit_questions ? 'REVOKE Q-EDITOR' : 'GRANT Q-EDITOR'}
                                                        </button>
                                                    )}
                                                    {u.role === 'teacher' && (
                                                        <button
                                                            onClick={() => openSubjectEditor(u)}
                                                            className="text-[10px] font-black px-3 py-1.5 border border-outline-variant/20 rounded-lg text-outline hover:text-tertiary hover:border-tertiary/30 transition-all"
                                                        >
                                                            SUBJECTS {u.assigned_subjects?.length ? `(${u.assigned_subjects.length})` : ''}
                                                        </button>
                                                    )}
                                                    {u.role !== 'admin' && (
                                                        <button
                                                            disabled={deletingId === u.id}
                                                            onClick={() => setConfirmDelete({ id: u.id, username: u.username })}
                                                            className="text-[10px] font-black text-error px-3 py-1.5 border border-error/20 rounded-lg hover:bg-error/5 transition-all disabled:opacity-50"
                                                        >
                                                            {deletingId === u.id ? '…' : 'DELETE'}
                                                        </button>
                                                    )}
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
                        {hasMoreUsers && (
                            <div className="px-6 pt-4 flex justify-center">
                                <button
                                    onClick={handleShowMoreUsers}
                                    disabled={loadingMoreUsers}
                                    className="text-xs text-slate-500 hover:text-primary font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingMoreUsers ? 'Loading…' : 'Show More Users'}
                                </button>
                            </div>
                        )}
                    </div>

                    </>}

                </div>
            </main>

            {/* Ambient glow */}
            <div className="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] left-64 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

            {/* ── Subject Assignment Modal ──────────────────────────── */}
            {subjectEditorUserId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/10 p-6 shadow-nebula">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-tertiary text-xl">menu_book</span>
                            </div>
                            <div>
                                <p className="text-on-surface font-bold text-sm">Assign Subjects</p>
                                <p className="text-outline text-xs">{localUsers.find(u => u.id === subjectEditorUserId)?.username}</p>
                            </div>
                        </div>
                        <p className="text-xs text-outline mb-3">Select which subjects this teacher can view and edit questions for.</p>
                        <div className="flex flex-wrap gap-2 mb-5 max-h-48 overflow-y-auto pr-1">
                            {allSubjects.map(s => {
                                const active = subjectEditorValue.includes(s);
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setSubjectEditorValue(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            active
                                                ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                                                : 'bg-surface-container-high text-outline border-outline-variant/20 hover:border-tertiary/30 hover:text-tertiary'
                                        }`}
                                    >
                                        {active && <span className="mr-1">✓</span>}{s}
                                    </button>
                                );
                            })}
                            {allSubjects.length === 0 && <p className="text-xs text-outline">No subjects found in question bank.</p>}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setSubjectEditorUserId(null)} className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-outline text-sm font-bold hover:text-on-surface transition-all">Cancel</button>
                            <button onClick={saveAssignedSubjects} disabled={savingSubjects} className="flex-1 py-2.5 rounded-xl bg-tertiary/10 text-tertiary border border-tertiary/30 text-sm font-bold hover:bg-tertiary/20 transition-all disabled:opacity-50">
                                {savingSubjects ? 'Saving…' : `Save (${subjectEditorValue.length} selected)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ─────────────────────────── */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-sm bg-surface-container rounded-2xl border border-outline-variant/10 p-6 shadow-nebula">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-error text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_remove</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-on-surface">Delete User</h3>
                                <p className="text-xs text-slate-500">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-sm text-on-surface-variant mb-6">
                            Permanently delete{' '}
                            <span className="text-on-surface font-bold">@{confirmDelete.username}</span>?
                            {' '}All their progress, answers, and data will be erased.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-on-surface text-sm font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={deletingId !== null}
                                className="flex-1 py-2.5 rounded-xl bg-error/10 border border-error/30 text-error hover:bg-error/20 text-sm font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deletingId !== null
                                    ? <><span className="w-4 h-4 rounded-full border-2 border-error/30 border-t-error animate-spin" /><span>Deleting...</span></>
                                    : <><span className="material-symbols-outlined text-base">delete_forever</span><span>Delete Permanently</span></>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
