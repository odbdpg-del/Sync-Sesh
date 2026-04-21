import type { SessionInfo, SyncStatus } from "../types/session";
import syncSeshLogo from "../../images/icon/ChatGPT Image Apr 19, 2026, 04_54_54 PM.png";

interface AppHeaderProps {
  session: SessionInfo;
  syncStatus: SyncStatus;
  zoomPercent: number;
}

export function AppHeader({ session, syncStatus, zoomPercent }: AppHeaderProps) {
  const sessionLabel = session.id.startsWith("discord-") ? "DISCORD" : session.code;

  return (
    <header className="panel app-header">
      <div className="brand-lockup">
        <div className="brand-logo-frame">
          <img src={syncSeshLogo} alt="Sync Sesh logo" className="brand-logo" />
        </div>
        <div className="brand-copy">
          <p className="eyebrow">Discord Activity</p>
          <h1>Sync Sesh</h1>
        </div>
      </div>
      <div className="header-meta">
        <div className="header-pill">
          <span className="meta-label">Session</span>
          <strong>{sessionLabel}</strong>
        </div>
        <div className="header-pill">
          <span className="meta-label">Round</span>
          <strong>{session.roundNumber}</strong>
        </div>
        <div className="header-pill">
          <span className="meta-label">Phase</span>
          <strong>{session.phase}</strong>
        </div>
        <div className="header-pill">
          <span className="meta-label">Sync</span>
          <strong className={`sync-pill sync-${syncStatus.connection}`}>{syncStatus.connection}</strong>
        </div>
        <div className="header-pill">
          <span className="meta-label">Zoom</span>
          <strong>{zoomPercent}%</strong>
        </div>
      </div>
    </header>
  );
}
