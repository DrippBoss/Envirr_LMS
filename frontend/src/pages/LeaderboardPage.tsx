import { useEffect, useState } from "react";
import { api, useAuth } from "../context/AuthContext";

type Entry = {
  rank: number;
  student_id: number;
  name: string;
  username: string;
  avatar_url: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  is_me: boolean;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("gamification/leaderboard/")
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myEntry = entries.find(e => e.is_me);

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 lg:pb-16">
      <div className="max-w-2xl mx-auto px-4 md:px-6">

        {/* Header */}
        <section className="mt-8 mb-6">
          <h1 className="text-2xl font-black font-headline text-on-surface mb-1">Leaderboard</h1>
          <p className="text-slate-500 text-sm">
            Top students in{" "}
            <span className="text-on-surface font-bold">Class {user?.profile?.class_grade}</span>
            {" "}ranked by XP
          </p>
        </section>

        {/* Your rank card */}
        {myEntry && (
          <section className="mb-6">
            <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-black text-primary">
                  {myEntry.rank <= 3 ? MEDALS[myEntry.rank - 1] : `#${myEntry.rank}`}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-on-surface">Your rank</p>
                <p className="text-xs text-slate-400">{myEntry.total_xp.toLocaleString()} XP · Lv {myEntry.current_level}</p>
              </div>
              <div className="flex items-center gap-1 text-tertiary text-xs font-bold">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                {myEntry.current_streak}d
              </div>
            </div>
          </section>
        )}

        {/* Ranked list */}
        <section>
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden divide-y divide-outline-variant/10">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-8 h-8 bg-surface-container-highest rounded-full shrink-0" />
                  <div className="w-10 h-10 bg-surface-container-highest rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-surface-container-highest rounded w-1/3" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-1/4" />
                  </div>
                  <div className="h-3 bg-surface-container-highest rounded w-16" />
                </div>
              ))
            ) : entries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-outline mb-3 block">leaderboard</span>
                <p className="text-slate-500 text-sm">No students ranked yet — start learning to get on the board!</p>
              </div>
            ) : (
              entries.map(entry => (
                <div
                  key={entry.student_id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                    entry.is_me ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surface-container-high'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {entry.rank <= 3 ? (
                      <span className="text-xl">{MEDALS[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-black text-slate-500">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${
                      entry.is_me ? 'bg-primary/20 text-primary' : 'bg-surface-container-highest text-slate-400'
                    }`}>
                      {(entry.name || entry.username).slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${entry.is_me ? 'text-primary' : 'text-on-surface'}`}>
                      {entry.name || entry.username}
                      {entry.is_me && <span className="ml-1.5 text-[10px] font-black text-primary/60">YOU</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        entry.is_me ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-slate-500'
                      }`}>Lv {entry.current_level}</span>
                      {entry.current_streak > 0 && (
                        <span className="text-[10px] text-tertiary font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                          {entry.current_streak}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* XP */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${entry.rank === 1 ? 'text-yellow-400' : entry.is_me ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {entry.total_xp.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-600">XP</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
