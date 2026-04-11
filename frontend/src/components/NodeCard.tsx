
import { useNavigate } from 'react-router-dom';

interface NodeCardProps {
    node: any;
}

export default function NodeCard({ node }: NodeCardProps) {
    const navigate = useNavigate();

    const isLocked = node.status === 'LOCKED';
    const isCompleted = node.status === 'COMPLETED';
    const isTest = node.node_type === 'CHAPTER_TEST';

    let bgColor = 'rgba(255, 255, 255, 0.05)';
    let borderColor = 'rgba(255, 255, 255, 0.1)';
    let icon = isTest ? '🏆' : '📚';

    if (isCompleted) {
        bgColor = 'rgba(16, 185, 129, 0.1)';
        borderColor = '#10b981';
        icon = '✅';
    } else if (!isLocked) {
        bgColor = 'rgba(58, 130, 246, 0.2)';
        borderColor = '#3A82F6';
        icon = isTest ? '🏆' : '▶️';
    } else {
        icon = '🔒';
    }

    return (
        <div 
            onClick={() => !isLocked && navigate(`/learn/${node.id}`)}
            style={{
                width: '280px',
                padding: '20px',
                background: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: '16px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'transform 0.2s',
                boxShadow: !isLocked && !isCompleted ? '0 0 15px rgba(58, 130, 246, 0.3)' : 'none',
                position: 'relative',
                zIndex: 2
            }}
            onMouseOver={(e) => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseOut={(e) => { if (!isLocked) e.currentTarget.style.transform = 'scale(1)' }}
        >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>
                {isTest ? 'Chapter Test' : `Lesson ${node.order}`}
            </h4>
            <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{node.title}</div>
            
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.8rem' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '12px' }}>
                    💎 {node.xp_reward} XP
                </span>
                {isCompleted && node.progress && (
                    <span style={{ color: '#f59e0b' }}>
                        {'⭐'.repeat(node.progress.stars)}
                    </span>
                )}
            </div>
        </div>
    );
}
