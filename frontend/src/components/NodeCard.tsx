import { useNavigate } from "react-router-dom";

interface NodeCardProps {
  node: any;
}

export default function NodeCard({ node }: NodeCardProps) {
  const navigate = useNavigate();

  const isLocked = node.status === "LOCKED";
  const isCompleted = node.status === "COMPLETED";
  const isActive = node.status === "IN_PROGRESS";
  const isTest = node.node_type === "CHAPTER_TEST";

  // Node sizes for different states
  const size = isActive ? "w-24 h-24" : "w-20 h-20";
  const iconSize = isActive ? "text-4xl" : "text-3xl";

  let nodeBg = "bg-surface-container-lowest";
  let nodeBorder = "border-outline";
  let iconColor = "text-outline";
  let shadow = "";
  let cursor = "cursor-not-allowed";

  if (isCompleted) {
    nodeBg = "bg-surface-container-lowest";
    nodeBorder = "border-secondary";
    iconColor = "text-secondary";
    shadow = "shadow-[0_0_20px_rgba(103,223,112,0.2)]";
  } else if (isActive) {
    nodeBg = "bg-primary-container/20";
    nodeBorder = "border-primary";
    iconColor = "text-primary";
    shadow = "shadow-[0_0_30px_rgba(88,166,255,0.4)]";
    cursor = "cursor-pointer hover:scale-110";
  } else if (!isLocked) {
    nodeBg = "bg-surface-container-lowest";
    nodeBorder = "border-surface-variant";
    iconColor = "text-on-surface-variant";
    cursor = "cursor-pointer hover:scale-105";
  }

  const handleClick = () => {
    if (!isLocked) navigate(`/learn/${node.id}`);
  };

  return (
    <div
      className={`relative flex flex-col items-center ${cursor} transition-transform duration-200`}
      onClick={handleClick}
    >
      {/* Node Circle */}
      <div
        className={`${size} rounded-full ${nodeBg} border-4 ${nodeBorder} flex items-center justify-center ${shadow} transition-all`}
      >
        <span
          className={`material-symbols-outlined ${iconColor} ${iconSize}`}
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
        >
          {isCompleted
            ? "done_all"
            : isLocked
            ? "lock"
            : isActive
            ? "play_arrow"
            : isTest
            ? "emoji_events"
            : "radio_button_unchecked"}
        </span>
      </div>

      {/* Floating info card — alternating left/right */}
      <div
        className={`mt-4 absolute top-0 ${
          node.order % 2 === 0 ? "left-28 text-right" : "right-28 text-left"
        } w-52 p-4 rounded-xl glass-panel hidden group-hover:block hover:block`}
      >
        <span className="text-[10px] uppercase tracking-widest font-black text-outline mb-1 block">
          {isTest ? "Chapter Test" : `Lesson ${node.order}`}
        </span>
        <h3 className="text-white font-bold text-sm mb-2 leading-tight">{node.title}</h3>
        <div className="flex items-center gap-1">
          {isCompleted
            ? Array.from({ length: node.progress?.stars ?? 3 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-tertiary text-xs">
                  star
                </span>
              ))
            : isLocked
            ? null
            : Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-outline-variant text-xs"
                >
                  star
                </span>
              ))}
        </div>
      </div>

      {/* XP Badge below circle */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-outline">
          {isTest ? "Test" : `Lesson ${node.order}`}
        </span>
        <span className="text-[10px] text-tertiary font-bold">+{node.xp_reward} XP</span>
      </div>

      {/* Active glow pulse for active node */}
      {isActive && (
        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20 pointer-events-none" />
      )}
    </div>
  );
}
