

interface RevisionNodeCardProps {
    node: any;
    onClick: () => void;
}

export default function RevisionNodeCard({ node, onClick }: RevisionNodeCardProps) {
    const isCompleted = node.status === 'COMPLETED';
    const isLocked = node.status === 'LOCKED';

    return (
        <div 
            onClick={() => !isLocked && onClick()}
            style={{
                width: '250px',
                padding: '15px',
                background: isCompleted ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.2)',
                border: isCompleted ? '2px solid rgba(245, 158, 11, 0.5)' : '2px solid #f59e0b',
                borderRadius: '16px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked ? 0.0 : 1, // Completely hide if locked to simplify the map UI
                display: isLocked ? 'none' : 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'transform 0.2s',
                boxShadow: !isCompleted && !isLocked ? '0 0 15px rgba(245, 158, 11, 0.4)' : 'none',
                position: 'relative',
                zIndex: 2
            }}
            onMouseOver={(e) => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseOut={(e) => { if (!isLocked) e.currentTarget.style.transform = 'scale(1)' }}
        >
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>✨</div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#fcd34d' }}>
                {node.title}
            </h4>
            
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '10px' }}>
                {node.cards_for_you > 0 ? (
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                        {node.cards_for_you} cards for you
                    </span>
                ) : (
                    "General Review"
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.8rem' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '12px' }}>
                    💎 {node.xp_reward} XP
                </span>
                {isCompleted && (
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Done</span>
                )}
            </div>
        </div>
    );
}
