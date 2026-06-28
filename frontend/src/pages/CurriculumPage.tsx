import { useEffect, useState } from "react";
import { api } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PrerequisiteModal from "../components/PrerequisiteModal";
import ProgressBar from "../components/ProgressBar";

type Path = { id: number; title: string };
type CourseUnit = {
  id: number;
  title: string;
  description: string;
  progress_percentage: number;
  subject: string;
  class_grade: string;
  board: string;
  icon?: string;
  paths?: Path[];
};

// Static subject meta — kept inline so the Tailwind classes survive purging.
const SUBJECT_META: Record<string, { icon: string; iconBg: string; bar: string }> = {
  Mathematics: { icon: "functions", iconBg: "bg-primary/10 text-primary", bar: "bg-primary" },
  Science: { icon: "science", iconBg: "bg-secondary/10 text-secondary", bar: "bg-secondary" },
  English: { icon: "menu_book", iconBg: "bg-tertiary/10 text-tertiary", bar: "bg-tertiary" },
};
const DEFAULT_META = { icon: "school", iconBg: "bg-primary/10 text-primary", bar: "bg-primary" };

export default function CurriculumPage() {
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [prereqCards, setPrereqCards] = useState<any[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("student/dashboard/")
      .then(r => setUnits(r.data?.results ?? r.data ?? []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const subjects = [...new Set(units.map(u => u.subject))];
  const filteredUnits = selectedSubject ? units.filter(u => u.subject === selectedSubject) : units;

  // Mirror StudentDashboard: surface the prerequisite deck before entering the map.
  const openUnit = async (unitId: number, firstPathId: number) => {
    try {
      const { data } = await api.get(`student/units/${unitId}/prerequisites/`);
      if (data.status === "already_seen" || data.status === "no_prerequisites") {
        navigate(`/map/${firstPathId}`);
      } else {
        setSelectedUnitId(unitId);
        setPrereqCards(data.deck.cards);
        setShowPrereqModal(true);
      }
    } catch {
      navigate(`/map/${firstPathId}`);
    }
  };

  const handlePrereqComplete = async () => {
    if (!selectedUnitId) return;
    await api.post(`student/units/${selectedUnitId}/prerequisites/`);
    setShowPrereqModal(false);
    const unit = units.find(u => u.id === selectedUnitId);
    if (unit?.paths?.[0]) navigate(`/map/${unit.paths[0].id}`);
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 lg:pb-16">
      <div className="max-w-5xl mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black font-headline text-on-surface tracking-tight">Curriculum</h1>
          <p className="text-slate-500 text-sm mt-1">All your courses and learning paths in one place.</p>
        </div>

        {/* Subject filter tabs */}
        {!isLoading && subjects.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-5">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                selectedSubject === null
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-surface-container border-outline-variant/15 text-slate-400 hover:border-outline-variant/30 hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
              All
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${selectedSubject === null ? "bg-primary/20 text-primary" : "bg-surface-container-high text-slate-500"}`}>{units.length}</span>
            </button>
            {subjects.map(subj => {
              const meta = SUBJECT_META[subj] ?? DEFAULT_META;
              const count = units.filter(u => u.subject === subj).length;
              const isActive = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-surface-container border-outline-variant/15 text-slate-400 hover:border-outline-variant/30 hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{meta.icon}</span>
                  {subj}
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary/20 text-primary" : "bg-surface-container-high text-slate-500"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Course grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface-container rounded-2xl p-5 animate-pulse border border-outline-variant/10 h-32" />
            ))}
          </div>
        ) : units.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">rocket_launch</span>
            <h3 className="text-base font-black font-headline text-on-surface mb-1">No courses yet</h3>
            <p className="text-slate-500 text-sm">Your courses will appear here once your teacher publishes them.</p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 bg-surface-container rounded-2xl border border-dashed border-outline-variant/20 text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
            <p className="text-slate-500 text-sm">No courses found for <strong className="text-on-surface">{selectedSubject}</strong>.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filteredUnits.map(unit => {
              const meta = SUBJECT_META[unit.subject] ?? DEFAULT_META;
              const pct = unit.progress_percentage;
              const isDone = pct >= 100;
              const firstPath = unit.paths?.[0];
              return (
                <div
                  key={unit.id}
                  onClick={() => firstPath && openUnit(unit.id, firstPath.id)}
                  className={`group bg-surface-container rounded-2xl border border-outline-variant/10 transition-all p-5 ${
                    firstPath ? "hover:border-outline-variant/30 cursor-pointer" : "opacity-60"
                  }`}
                >
                  <div className="flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                      <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {unit.icon || meta.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3 className="text-sm font-black font-headline text-on-surface leading-snug">{unit.title}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                          isDone
                            ? "bg-secondary/10 text-secondary border-secondary/20"
                            : pct > 0
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-surface-container-highest text-slate-500 border-outline-variant/15"
                        }`}>
                          {isDone ? "Done" : pct > 0 ? `${pct}%` : "New"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Grade {unit.class_grade} · {unit.board}</p>
                      <ProgressBar value={pct} barClassName={meta.bar} className="h-1.5" />
                      {/* Extra paths beyond the first, if any, as direct links */}
                      {unit.paths && unit.paths.length > 1 && (
                        <div className="mt-3 space-y-1">
                          {unit.paths.map(p => (
                            <button
                              key={p.id}
                              onClick={e => { e.stopPropagation(); navigate(`/map/${p.id}`); }}
                              className="w-full flex items-center justify-between text-left text-xs font-bold text-on-surface-variant hover:text-on-surface px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                            >
                              <span className="truncate">{p.title}</span>
                              <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPrereqModal && (
        <PrerequisiteModal
          cards={prereqCards}
          unitName={units.find(u => u.id === selectedUnitId)?.title ?? ""}
          onComplete={handlePrereqComplete}
        />
      )}
    </div>
  );
}
