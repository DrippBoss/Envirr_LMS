import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, useAuth } from "../context/AuthContext";
import FlashcardModal from "../components/FlashcardModal";

// ── Sidebar nav items ───────────────────────────────────────────
const NAV_ITEMS = [
  { icon: "grid_view", label: "Dashboard", route: "/" },
  { icon: "account_tree", label: "Curriculum", route: null, active: true },
  { icon: "auto_stories", label: "Codex", route: null },
  { icon: "leaderboard", label: "Rankings", route: null },
  { icon: "settings", label: "Settings", route: null },
];

// ── Single node row — circle + always-visible floating card ─────
function NodeRow({ node, index }: { node: any; index: number }) {
  const navigate = useNavigate();
  const isLeft = index % 2 === 0;
  const isLocked = node.status === "LOCKED";
  const isCompleted = node.status === "COMPLETED";
  const isActive = node.status === "IN_PROGRESS" || node.status === "UNLOCKED";
  const isTest = node.node_type === "CHAPTER_TEST";

  const handleClick = () => {
    if (!isLocked) navigate(`/learn/${node.id}`);
  };

  // ── Circle styles ──────────────────────────────────────────
  let circleCls = "w-16 h-16 rounded-full border-4 flex items-center justify-center relative transition-all ";
  let iconCls = "material-symbols-outlined text-2xl";
  let iconName = "lock";

  if (isCompleted) {
    circleCls += "bg-secondary/10 border-secondary shadow-[0_0_20px_rgba(103,223,112,0.2)]";
    iconCls += " text-secondary";
    iconName = "check_circle";
  } else if (isActive) {
    circleCls += "bg-primary/15 border-primary shadow-[0_0_30px_rgba(88,166,255,0.4)] cursor-pointer hover:scale-105";
    iconCls += " text-primary";
    iconName = isTest ? "emoji_events" : "play_arrow";
  } else {
    circleCls += "bg-surface-container-lowest border-outline-variant/40";
    iconCls += " text-outline/50";
    iconName = "lock";
  }

  // ── Info card ──────────────────────────────────────────────
  const cardBase =
    "absolute top-1/2 -translate-y-1/2 w-52 p-4 rounded-2xl bg-surface-container border border-outline-variant/15 shadow-lg pointer-events-none";
  const cardCls = isLeft
    ? `${cardBase} left-[calc(100%+1.5rem)]`
    : `${cardBase} right-[calc(100%+1.5rem)]`;

  const labelTag = isTest
    ? "Chapter Test"
    : `Lesson ${node.order}`;

  return (
    <div className="relative flex justify-center">
      {/* Node circle */}
      <div className={circleCls} onClick={handleClick}>
        <span
          className={iconCls}
          style={{ fontVariationSettings: isCompleted ? "'FILL' 1" : "'FILL' 0, 'wght' 300" }}
        >
          {iconName}
        </span>

        {/* Active pulse ring */}
        {isActive && !isTest && (
          <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping opacity-30 pointer-events-none" />
        )}
      </div>

      {/* Always-visible floating info card */}
      <div className={cardCls} style={{ pointerEvents: isLocked ? "none" : "auto" }}>
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-outline/60 block mb-1">
          {labelTag}
        </span>
        <h3 className="text-white font-bold text-sm leading-snug mb-2">{node.title}</h3>

        {/* Stars row for completed */}
        {isCompleted && (
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`material-symbols-outlined text-xs ${
                  i < (node.progress?.stars ?? 3) ? "text-tertiary" : "text-outline-variant/40"
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            ))}
          </div>
        )}

        {/* XP reward */}
        <span className="text-[10px] text-tertiary font-bold">+{node.xp_reward} XP</span>

        {/* Resume button for active */}
        {isActive && (
          <button
            className="mt-3 w-full py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1 hover:brightness-110 transition-all pointer-events-auto"
            onClick={handleClick}
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            {isTest ? "Start Test" : "Resume"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Revision node card in the path ─────────────────────────────
function RevisionRow({ rnode, onClick }: { rnode: any; onClick: () => void }) {
  const isLocked = rnode.status === "LOCKED";
  return (
    <div className="flex justify-center">
      <div
        className={`w-72 p-5 rounded-2xl border text-center transition-all ${
          isLocked
            ? "bg-surface-container border-outline-variant/10 opacity-50 cursor-not-allowed"
            : "bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10"
        }`}
        onClick={isLocked ? undefined : onClick}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-sm">psychology</span>
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/70">
            Mid-Unit Review
          </span>
        </div>
        <h4 className="text-white font-bold text-sm">{rnode.title || "Strengthen Your Knowledge"}</h4>
        {!isLocked && (
          <span className="text-[10px] text-primary font-bold mt-1 block">+{rnode.xp_reward} XP</span>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function LearningMap() {
  const { pathId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pathData, setPathData] = useState<any>(null);
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [prereqCards, setPrereqCards] = useState<any[]>([]);
  const [showRevModal, setShowRevModal] = useState(false);
  const [currentRevNode, setCurrentRevNode] = useState<any>(null);
  const [currentRevCards, setCurrentRevCards] = useState<any[]>([]);

  useEffect(() => { loadMap(); }, [pathId]);

  const loadMap = async () => {
    try {
      const res = await api.get(`student/paths/${pathId}/map/`);
      setPathData(res.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert("Please complete the unit enrollment first!");
        navigate("/");
      }
    }
  };

  const handleReviewFoundations = async () => {
    try {
      const unitId = pathData.unit_id || 1;
      const res = await api.get(`student/units/${unitId}/prerequisites/`);
      if (res.data.deck?.cards) {
        setPrereqCards(res.data.deck.cards);
        setShowPrereqModal(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleRevisionClick = async (rnode: any) => {
    const res = await api.get(`student/revision-nodes/${rnode.id}/`);
    setCurrentRevCards(res.data);
    setCurrentRevNode(rnode);
    setShowRevModal(true);
  };

  const handleRevisionComplete = async () => {
    if (currentRevNode) {
      await api.post(`student/revision-nodes/${currentRevNode.id}/`);
      setShowRevModal(false);
      loadMap();
    }
  };

  if (!pathData) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-on-surface-variant text-sm font-medium">Loading path...</p>
        </div>
      </div>
    );
  }

  const nodes: any[] = pathData.nodes || [];
  const rnodes: any[] = pathData.revision_nodes || [];
  const completedCount = nodes.filter((n) => n.status === "COMPLETED").length;
  const progressPct = nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0;

  // Insert revision nodes into the ordered node list by position
  // Revision nodes go after half of all regular nodes (mid-unit)
  const midPoint = Math.floor(nodes.length / 2);
  type PathItem = { type: "node"; data: any } | { type: "revision"; data: any };
  const pathItems: PathItem[] = [];
  nodes.forEach((n, i) => {
    pathItems.push({ type: "node", data: n });
    if (i === midPoint - 1 && rnodes.length > 0) {
      rnodes.forEach((r) => pathItems.push({ type: "revision", data: r }));
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Left Sidebar — below Navbar (top-16) */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 bg-surface-container flex flex-col p-4 z-40 border-r border-outline-variant/10 hidden md:flex">
        {/* Identity */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-base">rocket_launch</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-none truncate">{user?.username || "Student"}</p>
            <p className="text-outline text-[10px] mt-0.5 capitalize">{user?.role || "student"}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-outline hover:text-on-surface hover:bg-surface-container-high"
              }`}
              onClick={() => item.route && navigate(item.route)}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Daily Mission CTA */}
        <button
          className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg"
          onClick={() => navigate("/")}
        >
          <span className="material-symbols-outlined text-base">bolt</span>
          Start Daily Mission
        </button>
      </aside>

      {/* Main content */}
      <main className="md:ml-60 pt-16 pb-20 min-h-screen">
        <div className="max-w-3xl mx-auto px-8 pt-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[11px] text-outline font-medium uppercase tracking-widest mb-3">
            <span>{pathData.subject || "Mathematics"}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>{pathData.grade || `Grade ${user?.profile?.class_grade || ""}`}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface-variant">{pathData.title}</span>
          </nav>

          {/* Title + actions row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight text-white leading-tight mb-4">
                {pathData.title}
              </h1>
              {/* Progress bar */}
              <div className="w-full max-w-xs bg-surface-container-highest rounded-full h-2 mb-1.5">
                <div
                  className="bg-secondary h-2 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-secondary text-xs font-bold flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {completedCount} of {nodes.length} lessons complete
              </p>
            </div>

            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/15 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all text-sm font-bold shrink-0"
              onClick={handleReviewFoundations}
            >
              <span className="material-symbols-outlined text-base">psychology</span>
              Review Foundations
            </button>
          </div>

          {/* ── Vertical Path ── */}
          <div className="relative py-8">
            {/* Central connector line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-outline-variant/20" />

            {/* Node rows */}
            <div className="relative z-10 flex flex-col gap-14">
              {pathItems.map((item) => {
                if (item.type === "revision") {
                  return (
                    <RevisionRow
                      key={`rev-${item.data.id}`}
                      rnode={item.data}
                      onClick={() => handleRevisionClick(item.data)}
                    />
                  );
                }
                const nodeIndex = nodes.findIndex((n) => n.id === item.data.id);
                return (
                  <NodeRow
                    key={`node-${item.data.id}`}
                    node={item.data}
                    index={nodeIndex}
                  />
                );
              })}

              {/* Chapter Final Test */}
              {pathData.final_test && (
                <div className="flex justify-center pt-4">
                  <div className="w-72 p-6 rounded-3xl bg-gradient-to-br from-tertiary-container/15 to-surface-container-highest border border-tertiary-container/25 text-center relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-tertiary-container/10 blur-2xl rounded-full" />
                    <div className="w-12 h-12 bg-tertiary-container/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-tertiary-container/30">
                      <span
                        className="material-symbols-outlined text-tertiary-container text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        emoji_events
                      </span>
                    </div>
                    <h3 className="text-base font-black font-headline text-white mb-1 uppercase tracking-wide">
                      Chapter Final Test
                    </h3>
                    <p className="text-outline text-xs mb-4 px-2 leading-relaxed">
                      Demonstrate your mastery to unlock the "Mathematician" badge.
                    </p>
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="text-[9px] text-outline uppercase font-bold tracking-widest">Reward</p>
                        <p className="text-tertiary font-black text-base">+1,000 XP</p>
                      </div>
                      <div className="h-6 w-px bg-outline-variant/25" />
                      <div className="text-center">
                        <p className="text-[9px] text-outline uppercase font-bold tracking-widest">Questions</p>
                        <p className="text-white font-black text-base">25</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/4 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-secondary/4 blur-[100px]" />
      </div>

      {/* Revision modal */}
      {showRevModal && (
        <FlashcardModal
          title={currentRevNode?.title ?? "Revision"}
          subtitle="Tailored practice based on your weak spots"
          cards={currentRevCards}
          onComplete={handleRevisionComplete}
          finalButtonText="Claim XP"
        />
      )}

      {/* Foundations modal */}
      {showPrereqModal && (
        <FlashcardModal
          title={`Foundations: ${pathData.title}`}
          subtitle="Refreshing your core knowledge"
          cards={prereqCards}
          onComplete={() => setShowPrereqModal(false)}
          finalButtonText="Got it, back to Map"
        />
      )}
    </div>
  );
}
