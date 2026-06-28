import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Primary student destinations, thumb-reachable. AI lives in the floating button.
const ITEMS = [
  { icon: 'grid_view',  label: 'Home',    path: '/' },
  { icon: 'menu_book',  label: 'Courses', path: '/curriculum' },
  { icon: 'groups',     label: 'Groups',  path: '/study-groups' },
  { icon: 'leaderboard', label: 'Ranks',  path: '/leaderboard' },
  { icon: 'person',     label: 'Profile', path: '/profile' },
];

// Focused flows own the bottom of the screen (their own footers/bars); skip them.
const HIDDEN_PREFIXES = ['/learn', '/tutor', '/mock-test', '/login', '/verify-email', '/reset-password'];

/**
 * Mobile/tablet bottom navigation for students (lg:hidden). Complements the
 * global Navbar drawer with thumb-reachable primary destinations.
 */
export default function MobileBottomNav() {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || user?.role !== 'student') return null;
  if (HIDDEN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-stretch h-16
                 bg-background/95 backdrop-blur-xl border-t border-outline-variant/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(it => {
        const active = it.path === '/' ? pathname === '/' : pathname.startsWith(it.path);
        return (
          <button
            key={it.path}
            onClick={() => navigate(it.path)}
            aria-label={it.label}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              active ? 'text-primary' : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{it.icon}</span>
            <span className="text-[10px] font-bold">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
