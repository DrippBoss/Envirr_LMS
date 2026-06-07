import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close drawer when route changes
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    // Close drawer on outside click
    useEffect(() => {
        if (!mobileOpen) return;
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                setMobileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [mobileOpen]);

    if (!isAuthenticated || user?.role === 'admin') return null;

    const navItems = [
        { label: 'Dashboard',     route: '/',             roles: ['student','teacher','admin'] },
        { label: 'Rankings',      route: '/leaderboard',  roles: ['student'] },
        { label: 'AI Tutor',      route: '/tutor',        roles: ['student'] },
        { label: 'Teacher Panel', route: '/teacher',      roles: ['teacher'] },
        { label: 'Admin Console', route: '/admin',        roles: ['admin'] },
    ].filter(item => item.roles.includes(user?.role ?? ''));

    return (
        <>
            <header ref={drawerRef} className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10">
                <div className="h-16 flex justify-between items-center px-4 md:px-6">
                    <div className="flex items-center gap-4 md:gap-8">
                        <span
                            className="text-xl font-black tracking-tight text-on-background font-headline cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            Envirr
                        </span>
                        <nav className="hidden md:flex gap-1">
                            {navItems.map(item => {
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
                                                : 'text-slate-400 hover:text-on-surface hover:bg-surface-container-high'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-9 h-9 rounded-full border border-outline-variant/10 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all"
                            aria-label="Toggle theme"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            <span className="material-symbols-outlined text-base">
                                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>

                        {/* Username pill — desktop only */}
                        <button
                            onClick={() => navigate('/profile')}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/10 hover:border-primary/30 hover:text-primary transition-all"
                        >
                            <span className="material-symbols-outlined text-slate-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{user?.name || user?.username}</span>
                        </button>

                        {/* Logout — desktop */}
                        <button
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/10 text-slate-400 hover:text-on-surface hover:border-outline-variant/25 font-bold text-sm transition-all"
                            onClick={logout}
                        >
                            <span className="material-symbols-outlined text-base">logout</span>
                            <span>Exit</span>
                        </button>

                        {/* Hamburger — mobile only */}
                        <button
                            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-on-surface hover:bg-surface-container-high transition-colors"
                            onClick={() => setMobileOpen(v => !v)}
                            aria-label="Toggle menu"
                        >
                            <span className="material-symbols-outlined text-xl">
                                {mobileOpen ? 'close' : 'menu'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Mobile drawer */}
                {mobileOpen && (
                    <div className="md:hidden border-t border-outline-variant/10 bg-background/95 backdrop-blur-xl px-4 py-3 flex flex-col gap-1">
                        {/* Nav links */}
                        {navItems.map(item => {
                            const isActive = item.route === '/'
                                ? location.pathname === '/'
                                : location.pathname.startsWith(item.route);
                            return (
                                <button
                                    key={item.route}
                                    onClick={() => navigate(item.route)}
                                    className={`w-full text-left px-3 py-2.5 text-sm font-bold font-headline rounded-lg transition-colors ${
                                        isActive
                                            ? 'text-primary bg-primary/8'
                                            : 'text-slate-400 hover:text-on-surface hover:bg-surface-container-high'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}

                        <div className="border-t border-outline-variant/10 my-1" />

                        {/* Profile link */}
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                            <span className="font-bold uppercase tracking-wider text-xs">{user?.name || user?.username}</span>
                        </button>

                        {/* Logout */}
                        <button
                            className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors font-bold"
                            onClick={logout}
                        >
                            <span className="material-symbols-outlined text-base">logout</span>
                            Exit
                        </button>
                    </div>
                )}
            </header>
        </>
    );
}
