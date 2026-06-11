import React, { useState } from 'react';
import './LabShell.css';

export interface Takeaway {
  title: string;
  points: string[];
}

export interface LabShellProps {
  title: string;
  xpReward: number;
  /** Called when the lab is finished (either directly or after takeaway dismiss) */
  onComplete?: (artifact?: unknown) => void;
  /** Alternative callback name used by some labs — treated identically to onComplete */
  onSaveFinish?: () => void;
  children: React.ReactNode;
  disableFinish?: boolean;
  takeaway?: Takeaway;
  artifact?: unknown;
  /** Override the default "LAB" badge text */
  badgeLabel?: string;
  /** External control for the takeaway overlay (labs that trigger it programmatically) */
  showTakeaway?: boolean;
  /** Called when the externally-controlled takeaway is dismissed */
  onDismissTakeaway?: () => void;
}

export default function LabShell({
  title,
  xpReward,
  onComplete,
  onSaveFinish,
  children,
  disableFinish,
  takeaway,
  artifact,
  badgeLabel,
  showTakeaway: externalShowTakeaway,
  onDismissTakeaway,
}: LabShellProps) {
  const [internalShowTakeaway, setInternalShowTakeaway] = useState(false);

  // External control takes precedence; fall back to internal state
  const showTakeaway = externalShowTakeaway !== undefined ? externalShowTakeaway : internalShowTakeaway;

  const handleFinishClick = () => {
    if (onSaveFinish) {
      onSaveFinish();
      return;
    }
    if (takeaway && !onDismissTakeaway) {
      setInternalShowTakeaway(true);
    } else {
      onComplete?.(artifact);
    }
  };

  const handleDismiss = () => {
    if (onDismissTakeaway) {
      onDismissTakeaway();
    } else {
      setInternalShowTakeaway(false);
      onComplete?.(artifact);
    }
  };

  return (
    <div className="lab-shell">
      <header className="lab-shell__header">
        <div className="lab-shell__title-row">
          <span className="lab-shell__badge">{badgeLabel ?? 'LAB'}</span>
          <h2 className="lab-shell__title">{title}</h2>
        </div>
        <div className="lab-shell__xp">+{xpReward} XP on completion</div>
      </header>

      <main className="lab-shell__body">{children}</main>

      <footer className="lab-shell__footer">
        <button className="lab-shell__finish-btn" onClick={handleFinishClick} disabled={disableFinish}>
          {disableFinish ? 'Complete All Challenges First' : 'Save & Finish Lab'}
        </button>
      </footer>

      {showTakeaway && takeaway && (
        <div className="lab-shell__takeaway-overlay">
          <div className="lab-shell__takeaway-card">
            <div className="lab-shell__takeaway-icon">💡</div>
            <h3 className="lab-shell__takeaway-title">{takeaway.title}</h3>
            <ul className="lab-shell__takeaway-list">
              {takeaway.points.map((pt, i) => (
                <li key={i} className="lab-shell__takeaway-point">{pt}</li>
              ))}
            </ul>
            <button
              className="lab-shell__takeaway-btn"
              onClick={handleDismiss}
            >
              Got it — Finish Lab!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
