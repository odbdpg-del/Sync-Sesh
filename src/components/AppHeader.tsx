import type { SessionInfo, SyncStatus } from "../types/session";

interface AppHeaderProps {
  session: SessionInfo;
  syncStatus: SyncStatus;
}

export function AppHeader({ session, syncStatus }: AppHeaderProps) {
  return (
    <header className="panel app-header">
      <div>
        <p className="eyebrow">Discord Activity</p>
        <h1>Sync Sesh</h1>
      </div>
      <div className="header-meta">
        <div>
          <span className="meta-label">Session</span>
          <strong>{session.code}</strong>
        </div>
        <div>
          <span className="meta-label">Round</span>
          <strong>{session.roundNumber}</strong>
        </div>
        <div>
          <span className="meta-label">Phase</span>
          <strong>{session.phase}</strong>
        </div>
        <div>
          <span className="meta-label">Sync</span>
          <strong className={`sync-pill sync-${syncStatus.connection}`}>{syncStatus.connection}</strong>
        </div>
      </div>
    </header>
  );
}
