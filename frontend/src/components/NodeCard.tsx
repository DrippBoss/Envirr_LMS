import { useNavigate } from "react-router-dom";

interface NodeCardProps {
  node: any;
}

const MISSION_LABEL: Record<string, string> = {
  LESSON: "Mission",
  CHAPTER_TEST: "Final Boss",
  LAB: "Lab",
};

export default function NodeCard({ node }: NodeCardProps) {
  const navigate = useNavigate();

  const isLocked = node.status === "LOCKED";
  const isCompleted = node.status === "COMPLETED";
  const isActive = node.status === "IN_PROGRESS";
  const isTest = node.node_type === "CHAPTER_TEST";
  const isLab = node.node_type === "LAB";

  const size = isActive ? "w-24 h-24" : "w-20 h-20";
  const iconSize = isActive ? "text-4xl" : "text-3xl";

  let nodeBg = "bg-surface-container-lowest";
  let nodeBorder = "border-outline";
  let iconColor = "text-outline";
  let shadow = "";
  let cursor = "cursor-not-allowed";

  if (isCompleted) {
    nodeBg = "bg-surface-container-lowest";
    nodeBorder = isLab ? "border-[#6366f1]" : "border-secondary";
    iconColor = isLab ? "text-[#6366f1]" : "text-secondary";
    shadow = isLab
      ? "shadow-[0_0_20px_rgba(99,102,241,0.25)]"
      : "shadow-[0_0_20px_rgba(103,223,112,0.2)]";
  } else if (isActive) {
    nodeBg = isLab ? "bg-[#312e81]/20" : "bg-primary-container/20";
    nodeBorder = isLab ? "border-[#6366f1]" : "border-primary";
    iconColor = isLab ? "text-[#6366f1]" : "text-primary";
    shadow = isLab
      ? "shadow-[0_0_30px_rgba(99,102,241,0.45)]"
      : "shadow-[0_0_30px_rgba(88,166,255,0.4)]";
    cursor = "cursor-pointer hover:scale-110";
  } else if (!isLocked) {
    nodeBorder = isLab ? "border-[#6366f1]/50" : "border-surface-variant";
    iconColor = isLab ? "text-[#6366f1]/70" : "text-on-surface-variant";
    cursor = "cursor-pointer hover:scale-105";
  }

  const handleClick = () => {
    if (!isLocked) navigate(`/learn/${node.id}`);
  };

  // Icon selection
  const icon = isCompleted
    ? (isLab ? "science" : "done_all")
    : isLocked
    ? "lock"
    : isActive
    ? (isLab ? "biotech" : "play_arrow")
    : isTest
    ? "emoji_events"
    : isLab
    ? "science"
    : "radio_button_unchecked";

  // Mission label text
  const typeLabel = isTest ? "Final Boss" : isLab ? "Lab Mission" : `Mission ${node.order}`;

  return (
    <div
      className={`group relative flex flex-col items-center ${cursor} transition-transform duration-200`}
      onClick={handleClick}
    >
      {/* Node Circle */}
      <div
        className={`${size} rounded-full ${nodeBg} border-4 ${nodeBorder} flex items-center justify-center ${shadow} transition-all relative`}
      >
        <span
          className={`material-symbols-outlined ${iconColor} ${iconSize}`}
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
        >
          {icon}
        </span>

        {/* Star-requirement badge */}
        {isLocked && node.unlock_min_stars > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-surface-container border border-outline-variant/30 px-2 py-0.5 rounded-full">
            {Array.from({ length: node.unlock_min_stars }).map((_, i) => (
              <span key={i} className="material-symbols-outlined text-tertiary" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>star</span>
            ))}
            <span className="text-[9px] font-bold text-outline ml-0.5">needed</span>
          </div>
        )}
      </div>

      {/* Floating hover card */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mt-0 w-48 sm:w-52 p-4 rounded-xl glass-panel hidden group-hover:flex flex-col z-10 pointer-events-none"
      >
        <span className="text-[10px] uppercase tracking-widest font-black text-outline mb-1 block">
          {typeLabel}
        </span>
        <h3 className="text-on-surface font-bold text-sm mb-2 leading-tight">{node.title}</h3>
        {/* Stars row */}
        <div className="flex items-center gap-1">
          {isCompleted
            ? Array.from({ length: node.progress?.stars ?? 3 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-tertiary text-xs">star</span>
              ))
            : isLocked && node.unlock_min_stars > 0
            ? <span className="text-[10px] text-outline">Requires {node.unlock_min_stars}★ on prev mission</span>
            : !isLocked
            ? Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-outline-variant text-xs">star</span>
              ))
            : null}
        </div>
        {/* Lab unlock hint */}
        {isLab && isLocked && (
          <p className="text-[10px] text-[#a5b4fc] mt-1">
            Complete {node.lab_required_completions} missions to unlock
          </p>
        )}
      </div>

      {/* XP Badge below circle */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-outline">
          {typeLabel}
        </span>
        <span className={`text-[10px] font-bold ${isLab ? "text-[#6366f1]" : "text-tertiary"}`}>
          +{node.xp_reward} XP
        </span>
      </div>

      {/* Active pulse */}
      {isActive && (
        <div className={`absolute inset-0 rounded-full border-2 ${isLab ? "border-[#6366f1]" : "border-primary"} animate-ping opacity-20 pointer-events-none`} />
      )}
    </div>
  );
}
