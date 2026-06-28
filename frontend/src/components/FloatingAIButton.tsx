import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Routes where a floating button would collide with a fixed bottom bar / focused
// flow, or where it makes no sense (the tutor page itself, unauthenticated pages).
const HIDDEN_PREFIXES = ['/tutor', '/learn', '/mock-test', '/login', '/verify-email', '/reset-password'];

/**
 * Global floating "Ask AI" action button. Student-facing, thumb-reachable on
 * phones/tablets; routes to the AI tutor. Hidden on focused flows that already
 * own the bottom of the screen.
 */
export default function FloatingAIButton() {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || user?.role !== 'student') return null;
  if (HIDDEN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;

  return (
    <button
      onClick={() => navigate('/tutor')}
      aria-label="Ask the AI tutor"
      className="fixed z-40 bottom-5 right-5 md:bottom-6 md:right-6 flex items-center gap-2 h-14 px-5
                 rounded-full bg-primary text-on-primary font-black shadow-xl shadow-primary/30
                 hover:brightness-110 active:scale-95 transition-all"
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
      <span className="hidden sm:inline text-sm">Ask AI</span>
    </button>
  );
}
