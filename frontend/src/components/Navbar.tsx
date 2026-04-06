import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated) return null;

    return (
        <nav className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 2rem' }}>
            <h2 style={{ cursor: 'pointer', background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} onClick={() => navigate('/')}>
                Envirr v2
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{user?.username} ({user?.role})</span>
                {(user?.role === 'teacher' || user?.role === 'admin') && <button className="btn-primary" onClick={() => navigate('/teacher')}>Teacher Panel</button>}
                <button className="btn-primary" style={{ background: '#ef4444' }} onClick={logout}>Logout</button>
            </div>
        </nav>
    );
}
