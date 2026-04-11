export default function StatsBar({ stats }: { stats: any }) {
    if (!stats) return null;

    return (
        <div style={{
            display: 'flex', width: '100%', padding: '15px 20px', 
            background: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            justifyContent: 'space-around', alignItems: 'center',
            borderRadius: '16px', marginBottom: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>🔥</span>
                <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f59e0b' }}>{stats.current_streak || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Day Streak</div>
                </div>
            </div>

            <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚡</span>
                <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#8b5cf6' }}>Level {stats.current_level || 1}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rank</div>
                </div>
            </div>

            <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>💎</span>
                <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981' }}>{stats.total_xp || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total XP</div>
                </div>
            </div>
        </div>
    );
}
