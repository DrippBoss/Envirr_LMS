import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!isAuthenticated || user?.role === 'admin') return null;

    return (
        <header className="fixed top-0 w-full z-50 h-16 flex justify-between items-center px-6 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10">
            <div className="flex items-center gap-8">
                <span
                    className="text-xl font-black tracking-tight text-white font-headline cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    Envirr
                </span>
                <nav className="hidden md:flex gap-1">
                    {[
                        { label: 'Dashboard',     route: '/',        roles: ['student','teacher','admin'] },
                        { label: 'AI Tutor',      route: '/tutor',   roles: ['student'] },
                        { label: 'Teacher Panel', route: '/teacher', roles: ['teacher'] },
                        { label: 'Admin Console', route: '/admin',   roles: ['admin'] },
                    ].filter(item => item.roles.includes(user?.role ?? '')).map(item => {
                        const isActive = item.route === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.route);
                        return (
                            <button
                                key={item.route}
                                onClick={() => navigate(item.route)}
                                className={`px-3 py-1.5 text-sm font-bold font-headline rounded-lg transition-colors ${
                                    isActive
                                        ? 'text-primary bg-primary/8'
                                        : 'text-slate-400 hover:text-white hover:bg-surface-container-high'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                {/* Username pill */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/10">
                    <span className="material-symbols-outlined text-slate-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{user?.username}</span>
                </div>

                {/* Logout */}
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/10 text-slate-400 hover:text-white hover:border-outline-variant/25 font-bold text-sm transition-all"
                    onClick={logout}
                >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span className="hidden sm:inline">Exit</span>
                </button>
            </div>
        </header>
    );
}
