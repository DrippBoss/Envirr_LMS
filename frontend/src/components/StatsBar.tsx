export default function StatsBar({ stats }: { stats: any }) {
    if (!stats) return null;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Streak */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/10">
                <span
                    className="material-symbols-outlined text-tertiary text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    local_fire_department
                </span>
                <span className="text-tertiary font-bold text-sm">
                    {stats.current_streak || 0} Day{stats.current_streak !== 1 ? 's' : ''}
                </span>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/10">
                <span
                    className="material-symbols-outlined text-primary text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    grade
                </span>
                <span className="text-primary font-bold text-sm">
                    {(stats.total_xp || 0).toLocaleString()} XP
                </span>
            </div>

            {/* Level */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant/10">
                <span
                    className="material-symbols-outlined text-secondary text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    military_tech
                </span>
                <span className="text-secondary font-bold text-sm">
                    Lv {stats.current_level || 1}
                </span>
            </div>
        </div>
    );
}
