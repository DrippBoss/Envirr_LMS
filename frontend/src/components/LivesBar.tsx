import { useMemo } from 'react';


export default function LivesBar({ lives, maxLives = 3 }: { lives: number, maxLives?: number }) {
    const hearts = useMemo(() => Array.from({ length: maxLives }), [maxLives]);
    return (
        <div className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full">
            {hearts.map((_, i) => (
                <span
                    key={i}
                    className={`material-symbols-outlined text-sm ${i < lives ? 'text-error' : 'text-outline-variant'}`}
                    style={{
                        fontVariationSettings: i < lives ? "'FILL' 1" : "'FILL' 0",
                        transition: 'all 0.3s ease',
                    }}
                >
                    favorite
                </span>
            ))}
        </div>
    );
}
