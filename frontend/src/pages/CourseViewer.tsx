import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

interface LearningPath {
    id: number;
    title: string;
    description?: string;
    node_count?: number;
    status?: string;
    progress_pct?: number;
}

interface CourseData {
    id: number;
    title: string;
    subject?: string;
    description?: string;
    paths: LearningPath[];
}

export default function CourseViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`student/courses/${id}/`);
                setCourse(res.data);
            } catch {
                setError('Could not load course.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <p className="text-slate-500 text-sm">Loading course map...</p>
                </div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-600">error_outline</span>
                    <p className="text-slate-400">{error || 'Course not found.'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm font-bold text-white hover:bg-surface-container-high transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const paths = course.paths ?? [];

    return (
        <div className="min-h-screen bg-background pt-16 pb-16">
            <div className="max-w-4xl mx-auto px-6">

                {/* Header */}
                <div className="pt-10 mb-10">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-1.5 text-slate-500 text-sm hover:text-white transition-colors mb-6"
                    >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Dashboard
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-2xl">school</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                                {course.subject ?? 'Course'}
                            </p>
                            <h1 className="text-3xl md:text-4xl font-black font-headline text-white leading-tight">
                                {course.title}
                            </h1>
                            {course.description && (
                                <p className="text-slate-400 text-sm mt-2 max-w-xl">{course.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Course stats */}
                    <div className="flex gap-4 mt-6">
                        <div className="px-4 py-2 bg-surface-container rounded-xl border border-outline-variant/10 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">account_tree</span>
                            <span className="text-sm font-bold text-white">{paths.length} Units</span>
                        </div>
                    </div>
                </div>

                {/* Units list */}
                {paths.length === 0 ? (
                    <div className="bg-surface-container rounded-3xl border border-outline-variant/10 p-12 flex flex-col items-center text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-600 mb-4">inventory_2</span>
                        <h3 className="text-lg font-black font-headline text-white mb-2">No units yet</h3>
                        <p className="text-slate-500 text-sm">The teacher hasn't added any learning units to this course.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Learning Units</p>
                        {paths.map((path, idx) => {
                            const pct = path.progress_pct ?? 0;
                            const isCompleted = path.status === 'COMPLETED' || pct === 100;
                            const isActive = path.status === 'IN_PROGRESS' || (pct > 0 && pct < 100);
                            const isLocked = path.status === 'LOCKED';

                            return (
                                <div
                                    key={path.id}
                                    onClick={() => !isLocked && navigate(`/map/${path.id}`)}
                                    className={`group relative flex items-center gap-5 p-5 rounded-2xl border transition-all ${
                                        isLocked
                                            ? 'bg-surface-container border-outline-variant/10 opacity-50 cursor-not-allowed'
                                            : 'bg-surface-container border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-high cursor-pointer'
                                    }`}
                                >
                                    {/* Index / status circle */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all ${
                                        isCompleted
                                            ? 'bg-secondary/10 border-secondary/40'
                                            : isActive
                                            ? 'bg-primary/10 border-primary/40'
                                            : isLocked
                                            ? 'bg-surface-container-highest border-outline-variant/20'
                                            : 'bg-surface-container-high border-outline-variant/20 group-hover:border-primary/30'
                                    }`}>
                                        {isCompleted ? (
                                            <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                        ) : isLocked ? (
                                            <span className="material-symbols-outlined text-slate-600 text-xl">lock</span>
                                        ) : (
                                            <span className={`text-base font-black ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary'}`}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title + progress */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            {isActive && (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                                                    In Progress
                                                </span>
                                            )}
                                            {isCompleted && (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-secondary/10 text-secondary px-2 py-0.5 rounded-full border border-secondary/20">
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-bold text-white leading-snug truncate">{path.title}</h3>
                                        {path.node_count !== undefined && (
                                            <p className="text-xs text-slate-500 mt-0.5">{path.node_count} lessons</p>
                                        )}

                                        {pct > 0 && (
                                            <div className="mt-2.5 flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${isCompleted ? 'bg-secondary' : 'bg-primary'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 shrink-0">{pct}%</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Chevron */}
                                    {!isLocked && (
                                        <span className="material-symbols-outlined text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">
                                            chevron_right
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-primary/4 blur-[120px]" />
            </div>
        </div>
    );
}
