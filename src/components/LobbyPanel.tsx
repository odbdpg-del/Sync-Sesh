import type { DerivedLobbyState, SessionInfo, SessionUser } from "../types/session";

interface LobbyPanelProps {
  session: SessionInfo;
  users: SessionUser[];
  lobbyState: DerivedLobbyState;
  onJoinSession: () => void;
}

function getStateLabel(state: SessionUser["presence"]) {
  switch (state) {
    case "ready":
      return "READY";
    case "spectating":
      return "SPECTATING";
    default:
      return "IDLE";
  }
}

export function LobbyPanel({ session, users, lobbyState, onJoinSession }: LobbyPanelProps) {
  return (
    <section className={`panel stack lobby-panel lobby-phase-${session.phase}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lobby</p>
          <h2>Session Deck</h2>
        </div>
        <span className="capacity-pill">
          {users.length}/{session.capacity.max} connected
        </span>
      </div>

      <div className="metrics-grid">
        <article className="metric-card metric-ready">
          <span className="meta-label">Ready</span>
          <strong>{lobbyState.metrics.readyCount}</strong>
        </article>
        <article className="metric-card metric-idle">
          <span className="meta-label">Idle</span>
          <strong>{lobbyState.metrics.idleCount}</strong>
        </article>
        <article className="metric-card metric-spectators">
          <span className="meta-label">Spectators</span>
          <strong>{lobbyState.metrics.spectatorCount}</strong>
        </article>
      </div>

      <div className="join-row">
        <button
          type="button"
          className="primary-button"
          disabled={!lobbyState.canJoinSession}
          onClick={onJoinSession}
        >
          {lobbyState.isJoined ? "Joined" : "Join Session"}
        </button>
        <div className="join-copy">
          <p className="meta-label">Join behavior</p>
          <p>
            {session.phase === "precount" || session.phase === "countdown"
              ? "Late joins become spectators until the next round."
              : "Join now to enter the active lobby."}
          </p>
        </div>
      </div>

      <div className="user-list">
        {users.length === 0 ? (
          <div className="panel inset-panel empty-state-card">
            <p className="meta-label">Waiting for participants</p>
            <p>The session is live, but no participants have joined yet.</p>
          </div>
        ) : (
          users.map((user) => (
            <article key={user.id} className={`user-card user-${user.presence} ${user.id === lobbyState.localUser?.id ? "user-local" : ""}`}>
              <div className="avatar-badge">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="avatar-image" referrerPolicy="no-referrer" /> : user.avatarSeed}
              </div>
              <div className="user-copy">
                <strong>
                  {user.displayName}
                  {user.id === lobbyState.localUser?.id ? " (You)" : ""}
                </strong>
                <span className="meta-label">
                  {user.id === session.ownerId ? "Owner" : user.isTestUser ? "Sim" : "Crew"} | {getStateLabel(user.presence)}
                </span>
              </div>
              <span className={`presence-chip presence-${user.presence}`}>{getStateLabel(user.presence)}</span>
            </article>
          ))
        )}
      </div>

      <div className={`panel inset-panel lobby-rules ${lobbyState.isArmed ? "lobby-rules-armed" : ""}`}>
        <p className="meta-label">Lobby rules</p>
        <ul className="instruction-list">
          {lobbyState.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
