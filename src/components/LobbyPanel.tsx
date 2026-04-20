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

function getMetricIcon(state: "ready" | "idle" | "spectators") {
  switch (state) {
    case "ready":
      return "R";
    case "spectators":
      return "S";
    default:
      return "I";
  }
}

function getUserRoleLabel(user: SessionUser, session: SessionInfo) {
  if (user.id === session.ownerId) {
    return "OWNER";
  }

  if (user.isTestUser) {
    return "SIM";
  }

  return "CREW";
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
        <article className="metric-card metric-ready metric-tile">
          <span className="meta-label">Ready</span>
          <div className="metric-mainline">
            <strong>{lobbyState.metrics.readyCount}</strong>
            <span className="metric-icon" aria-hidden="true">
              {getMetricIcon("ready")}
            </span>
          </div>
        </article>
        <article className="metric-card metric-idle metric-tile">
          <span className="meta-label">Idle</span>
          <div className="metric-mainline">
            <strong>{lobbyState.metrics.idleCount}</strong>
            <span className="metric-icon" aria-hidden="true">
              {getMetricIcon("idle")}
            </span>
          </div>
        </article>
        <article className="metric-card metric-spectators metric-tile">
          <span className="meta-label">Spectators</span>
          <div className="metric-mainline">
            <strong>{lobbyState.metrics.spectatorCount}</strong>
            <span className="metric-icon" aria-hidden="true">
              {getMetricIcon("spectators")}
            </span>
          </div>
        </article>
      </div>

      <div className="join-row">
        <button
          type="button"
          className="primary-button join-button"
          disabled={!lobbyState.canJoinSession}
          onClick={onJoinSession}
        >
          <span className="join-button-icon" aria-hidden="true">
            +
          </span>
          <span>{lobbyState.isJoined ? "Joined" : "Join Session"}</span>
        </button>
        <div className="join-copy">
          <p className="meta-label">Join behavior</p>
          <p>
            {session.phase === "precount" || session.phase === "countdown"
              ? "Late joins become spectators until the next round."
              : "Join now to enter the active lobby."}
          </p>
          <p className="join-copy-subtle">Once the round is armed, you're in.</p>
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
                <span className="meta-label">{getUserRoleLabel(user, session)}</span>
              </div>
              <div className="user-status">
                <span className={`presence-chip presence-${user.presence}`}>{getStateLabel(user.presence)}</span>
                {user.presence === "ready" ? (
                  <span className="ready-bars" aria-hidden="true">
                    III
                  </span>
                ) : null}
              </div>
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
