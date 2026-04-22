import type { SessionInfo, SyncStatus } from "../types/session";
import { getDisplayRoundNumber } from "../lib/lobby/sessionState";
import syncSeshLogo from "../../images/icon/ChatGPT Image Apr 19, 2026, 04_54_54 PM.png";

interface AppHeaderProps {
  session: SessionInfo;
  syncStatus: SyncStatus;
  zoomPercent: number;
  secretEntryProgress?: number;
  secretUnlockCount?: number;
}

const TITLE_LETTERS = ["S", "Y", "N", "C", " ", "S", "E", "S", "H"] as const;

export function AppHeader({ session, syncStatus, zoomPercent, secretEntryProgress = 0, secretUnlockCount = 0 }: AppHeaderProps) {
  const sessionLabel = session.id.startsWith("discord-") ? "DISCORD" : session.code;
  const displayRoundNumber = getDisplayRoundNumber(session);
  let matchedLetterCount = 0;

  return (
    <header className="panel app-header">
      <span className="app-header-frame" aria-hidden="true" />
      <span className="app-header-accent" aria-hidden="true" />
      <div className="brand-lockup">
        <div className="brand-logo-frame">
          <span className="brand-logo-frame-inner" aria-hidden="true" />
          <img src={syncSeshLogo} alt="Sync Sesh logo" className="brand-logo" />
        </div>
        <div className="brand-copy">
          <p className="eyebrow">Discord Activity</p>
          <div
            key={`brand-title-shell-${secretUnlockCount}`}
            className={`brand-title-shell ${secretEntryProgress > 0 ? "brand-title-shell-secret" : ""} ${
              secretUnlockCount > 0 ? "brand-title-shell-secret-complete" : ""
            }`}
          >
            <span className="brand-title-corner" aria-hidden="true" />
            <span className="brand-title-rail" aria-hidden="true" />
            <h1 className="brand-title">
              {TITLE_LETTERS.map((letter, index) => {
                if (letter === " ") {
                  return (
                    <span key={`space-${index}`} className="brand-title-space" aria-hidden="true">
                      {" "}
                    </span>
                  );
                }

                matchedLetterCount += 1;
                const isActive = matchedLetterCount <= secretEntryProgress;

                return (
                  <span key={`${letter}-${index}`} className={`brand-title-letter ${isActive ? "brand-title-letter-secret" : ""}`}>
                    {letter}
                  </span>
                );
              })}
            </h1>
          </div>
        </div>
      </div>
      <div className="header-meta">
        <div className="header-pill">
          <span className="meta-label">Session</span>
          <strong>{sessionLabel}</strong>
        </div>
        <div className="header-pill">
          <span className="meta-label">Round</span>
          <strong>{displayRoundNumber}</strong>
        </div>
        <div className="header-pill">
          <span className="meta-label">Phase</span>
          <strong>{session.phase}</strong>
        </div>
        <div className="header-pill">
          <span className="meta-label">Sync</span>
          <strong className={`sync-pill sync-${syncStatus.connection}`}>{syncStatus.connection}</strong>
        </div>
        <div className="header-pill header-pill-zoom">
          <span className="meta-label">Zoom</span>
          <strong>{zoomPercent}%</strong>
          <span className="zoom-meter" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(zoomPercent, 100))}%` }} />
          </span>
        </div>
      </div>
    </header>
  );
}
