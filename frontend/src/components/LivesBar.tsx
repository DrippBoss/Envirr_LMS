

export default function LivesBar({ lives, maxLives = 3 }: { lives: number, maxLives?: number }) {
    return (
        <div style={{ display: 'flex', gap: '8px', fontSize: '1.5rem' }}>
            {Array.from({ length: maxLives }).map((_, i) => (
                <span key={i} style={{ 
                    color: i < lives ? '#ef4444' : 'rgba(255,255,255,0.2)',
                    transition: 'color 0.3s'
                }}>
                    {i < lives ? '❤️' : '🖤'}
                </span>
            ))}
        </div>
    );
}
