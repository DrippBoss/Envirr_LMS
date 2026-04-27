interface RevisionNodeCardProps {
  node: any;
  onClick: () => void;
}

export default function RevisionNodeCard({ node, onClick }: RevisionNodeCardProps) {
  const isLocked = node.status === "LOCKED";

  if (isLocked) return null;

  return (
    <div
      onClick={onClick}
      className="px-8 py-4 rounded-2xl border-2 border-dashed border-primary-container/40 bg-surface-container-lowest flex items-center gap-4 hover:border-primary-container transition-all cursor-pointer group"
    >
      <div className="p-3 rounded-full bg-primary-container/10">
        <span className="material-symbols-outlined text-primary">history_edu</span>
      </div>
      <div>
        <h4 className="text-primary font-bold uppercase tracking-tighter text-xs">
          Mid-Unit Review
        </h4>
        <p className="text-on-surface text-sm font-medium leading-tight">
          {node.cards_for_you > 0 ? (
            <span className="text-tertiary font-bold">{node.cards_for_you} cards for you</span>
          ) : (
            "General Review"
          )}
        </p>
      </div>
      <span className="material-symbols-outlined text-slate-500 group-hover:translate-x-1 transition-transform ml-auto">
        arrow_forward
      </span>
    </div>
  );
}
