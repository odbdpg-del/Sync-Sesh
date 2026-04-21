import type { SessionInfo, SyncStatus } from "../types/session";
import { getDisplayRoundNumber } from "../lib/lobby/sessionState";
import syncSeshLogo from "../../images/icon/ChatGPT Image Apr 19, 2026, 04_54_54 PM.png";

interface AppHeaderProps {
  session: SessionInfo;
  syncStatus: SyncStatus;
  zoomPercent: number;
}

export function AppHeader({ session, syncStatus, zoomPercent }: AppHeaderProps) {
  const sessionLabel = session.id.startsWith("discord-") ? "DISCORD" : session.code;
  const displayRoundNumber = getDisplayRoundNumber(session);

  return (
    <header className="panel app-header">
      <div className="brand-lockup">
        <div className="brand-logo-frame">
          <img src={syncSeshLogo} alt="Sync Sesh logo" className="brand-logo" />
        </div>
        <div className="brand-copy">
          <p className="eyebrow">Discord Activity</p>
          <div className="brand-title-shell">
            <span className="brand-title-corner" aria-hidden="true" />
            <span className="brand-title-rail" aria-hidden="true" />
            <h1 className="brand-title">Sync Sesh</h1>
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
