import type { SessionInfo, SyncStatus } from "../types/session";
import { getDisplayRoundNumber } from "../lib/lobby/sessionState";
import syncSeshLogo from "../../images/icon/ChatGPT Image Apr 19, 2026, 04_54_54 PM.png";

interface AppHeaderProps {
  session: SessionInfo;
  syncStatus: SyncStatus;
  zoomPercent: number;
  panelOpacityPercent: number;
  onPanelOpacityChange: (value: number) => void;
  secretEntryProgress?: number;
  secretUnlockCount?: number;
  secretErrorProgress?: number;
  secretErrorCount?: number;
}

const TITLE_LETTERS = ["S", "Y", "N", "C", " ", "S", "E", "S", "H"] as const;

export function AppHeader({
  session,
  syncStatus,
  zoomPercent,
  panelOpacityPercent,
  onPanelOpacityChange,
  secretEntryProgress = 0,
  secretUnlockCount = 0,
  secretErrorProgress = 0,
  secretErrorCount = 0,
}: AppHeaderProps) {
  const sessionLabel = session.id.startsWith("discord-") ? "DISCORD" : session.code;
  const displayRoundNumber = getDisplayRoundNumber(session);
  const isSecretErrorActive = secretErrorProgress > 0;
  const highlightedLetterCount = isSecretErrorActive ? secretErrorProgress : secretEntryProgress;
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
            key={`brand-title-shell-${secretUnlockCount}-${secretErrorCount}`}
            className={`brand-title-shell ${secretEntryProgress > 0 ? "brand-title-shell-secret" : ""} ${
              isSecretErrorActive ? "brand-title-shell-secret-error" : ""
            } ${
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
                const isActive = matchedLetterCount <= highlightedLetterCount;

                return (
                  <span
                    key={`${letter}-${index}`}
                    className={`brand-title-letter ${isActive ? "brand-title-letter-secret" : ""} ${
                      isActive && isSecretErrorActive ? "brand-title-letter-secret-error" : ""
                    }`}
                  >
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
        <label className="header-pill header-pill-opacity">
          <span className="meta-label">Windows</span>
          <strong>{panelOpacityPercent}%</strong>
          <input
            className="header-opacity-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={panelOpacityPercent}
            onChange={(event) => onPanelOpacityChange(Number(event.target.value))}
            aria-label="Window opacity"
          />
        </label>
      </div>
    </header>
  );
}
