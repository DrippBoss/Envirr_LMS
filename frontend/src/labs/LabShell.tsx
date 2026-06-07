import React, { useState } from 'react';
import './LabShell.css';

export interface Takeaway {
  title: string;
  points: string[];
}

interface LabShellProps {
  title: string;
  xpReward: number;
  onComplete: (artifact?: unknown) => void;
  children: React.ReactNode;
  disableFinish?: boolean;
  takeaway?: Takeaway;
  artifact?: unknown;
}

export default function LabShell({ title, xpReward, onComplete, children, disableFinish, takeaway, artifact }: LabShellProps) {
  const [showTakeaway, setShowTakeaway] = useState(false);

  const handleFinishClick = () => {
    if (takeaway) {
      setShowTakeaway(true);
    } else {
      onComplete(artifact);
    }
  };

  return (
    <div className="lab-shell">
      <header className="lab-shell__header">
        <div className="lab-shell__title-row">
          <span className="lab-shell__badge">LAB</span>
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

      {/* Takeaway overlay */}
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
              onClick={() => { setShowTakeaway(false); onComplete(artifact); }}
            >
              Got it — Finish Lab!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
