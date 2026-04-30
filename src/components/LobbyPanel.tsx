import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { DerivedLobbyState, SessionInfo, SessionUser } from "../types/session";

interface LobbyPanelProps {
  session: SessionInfo;
  users: SessionUser[];
  lobbyState: DerivedLobbyState;
  generatedDisplayNames: string[];
  discordDisplayName?: string;
  isJoinControlsHidden?: boolean;
  onJoinSession: () => void;
  onRollDisplayName: () => void;
  onSelectDisplayName: (displayName: string) => void;
  onUseDiscordDisplayName: () => void;
}

interface NamePickerPosition {
  left: number;
  top: number;
}

const NAME_PICKER_ESTIMATED_WIDTH = 300;
const NAME_PICKER_ESTIMATED_HEIGHT = 340;
const NAME_PICKER_VIEWPORT_GAP = 12;

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

function getUserSubcopy(user: SessionUser) {
  switch (user.presence) {
    case "ready":
      return "Locked in for launch";
    case "spectating":
      return "Observing until next round";
    default:
      return "Standing by in lobby";
  }
}

export function LobbyPanel({
  session,
  users,
  lobbyState,
  generatedDisplayNames,
  discordDisplayName,
  isJoinControlsHidden = false,
  onJoinSession,
  onRollDisplayName,
  onSelectDisplayName,
  onUseDiscordDisplayName,
}: LobbyPanelProps) {
  const [isNamePickerOpen, setIsNamePickerOpen] = useState(false);
  const [isLobbyRulesOpen, setIsLobbyRulesOpen] = useState(true);
  const [isLobbyRulesCollapsed, setIsLobbyRulesCollapsed] = useState(false);
  const [namePickerPosition, setNamePickerPosition] = useState<NamePickerPosition>({ left: 0, top: 0 });
  const localDisplayName = lobbyState.localUser?.displayName ?? "";
  const availableDisplayNames = useMemo(() => {
    const takenNames = new Set(users
      .filter((user) => user.id !== lobbyState.localUser?.id)
      .map((user) => user.displayName.trim().toLowerCase()));

    return generatedDisplayNames.filter((name) => (
      name !== localDisplayName &&
      !takenNames.has(name.trim().toLowerCase())
    ));
  }, [generatedDisplayNames, lobbyState.localUser?.id, localDisplayName, users]);
  const emptyPlayerSlotCount = Math.max(session.capacity.max - users.length, 0);

  useEffect(() => {
    if (!isNamePickerOpen) {
      return undefined;
    }

    const closeNamePicker = () => setIsNamePickerOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNamePicker();
      }
    };

    window.addEventListener("pointerdown", closeNamePicker);
    window.addEventListener("resize", closeNamePicker);
    window.addEventListener("scroll", closeNamePicker, true);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeNamePicker);
      window.removeEventListener("resize", closeNamePicker);
      window.removeEventListener("scroll", closeNamePicker, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isNamePickerOpen]);

  const openNamePicker = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.max(
      NAME_PICKER_VIEWPORT_GAP,
      Math.min(event.clientX - NAME_PICKER_ESTIMATED_WIDTH + 28, viewportWidth - NAME_PICKER_ESTIMATED_WIDTH - NAME_PICKER_VIEWPORT_GAP),
    );
    const top = Math.max(
      NAME_PICKER_VIEWPORT_GAP,
      Math.min(event.clientY + 8, viewportHeight - NAME_PICKER_ESTIMATED_HEIGHT - NAME_PICKER_VIEWPORT_GAP),
    );

    setNamePickerPosition({ left, top });
    setIsNamePickerOpen(true);
  };

  const namePickerMenu = isNamePickerOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          className="roll-name-menu"
          role="listbox"
          aria-label="Available display names"
          style={{
            left: `${namePickerPosition.left}px`,
            top: `${namePickerPosition.top}px`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="roll-name-menu-header">
            <span className="meta-label">Pick name</span>
            <button type="button" className="roll-name-menu-close" onClick={() => setIsNamePickerOpen(false)}>
              x
            </button>
          </div>
          {availableDisplayNames.length > 0 ? (
            availableDisplayNames.map((name) => (
              <button
                key={name}
                type="button"
                className="roll-name-option"
                onClick={() => {
                  onSelectDisplayName(name);
                  setIsNamePickerOpen(false);
                }}
              >
                {name}
              </button>
            ))
          ) : (
            <p className="roll-name-empty">No open names.</p>
          )}
        </div>,
        document.body,
      )
    : null;
  return (
    <section className={`panel stack lobby-panel lobby-phase-${session.phase}`} data-join-hidden={isJoinControlsHidden ? "true" : undefined}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lobby</p>
          <h2>Session Deck</h2>
        </div>
        <div className="lobby-heading-actions">
          {!isLobbyRulesOpen ? (
            <button
              type="button"
              className="lobby-rules-restore"
              onClick={() => {
                setIsLobbyRulesOpen(true);
                setIsLobbyRulesCollapsed(false);
              }}
              aria-label="Expand lobby rules"
              title="Expand lobby rules"
            >
              R
            </button>
          ) : null}
          <span className="capacity-pill">
            <span className="capacity-dot" aria-hidden="true" />
            {users.length}/{session.capacity.max} connected
          </span>
        </div>
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

      {!isJoinControlsHidden ? (
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
            <span className="join-copy-icon" aria-hidden="true">
              <span className="join-copy-icon-ring" />
              <span className="join-copy-icon-core" />
            </span>
            <div className="join-copy-body">
              <p className="meta-label">Join behavior</p>
              <p>
                {session.phase === "precount" || session.phase === "countdown"
                  ? "Late joins become spectators until the next round."
                  : "Join now to enter the active lobby."}
              </p>
              <p className="join-copy-subtle">Once the round is armed, you're in.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="user-list" role="list" aria-label="Session players">
        {users.map((user) => (
          <article key={user.id} className={`user-card user-${user.presence} ${user.id === lobbyState.localUser?.id ? "user-local" : ""}`} role="listitem">
            <div className="avatar-badge">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="avatar-image" referrerPolicy="no-referrer" /> : user.avatarSeed}
            </div>
            <div className="user-copy">
              <div className="user-title-row">
                <strong>
                  {user.displayName}
                  {user.id === lobbyState.localUser?.id ? " (You)" : ""}
                </strong>
                <span className="meta-label">{getUserRoleLabel(user, session)}</span>
              </div>
              <span className="user-subcopy">{getUserSubcopy(user)}</span>
            </div>
            <div className="user-status">
              <span className={`presence-chip presence-${user.presence}`}>{getStateLabel(user.presence)}</span>
              {user.id === lobbyState.localUser?.id ? (
                <div className="roll-name-wrapper">
                  {discordDisplayName && user.displayName !== discordDisplayName ? (
                    <button
                      type="button"
                      className="roll-name-button discord-name-button"
                      onClick={onUseDiscordDisplayName}
                      title={`Use ${discordDisplayName}`}
                    >
                      Discord
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="roll-name-button"
                    onClick={() => {
                      setIsNamePickerOpen(false);
                      onRollDisplayName();
                    }}
                    onContextMenu={(event) => {
                      openNamePicker(event);
                    }}
                  >
                    Roll
                  </button>
                </div>
              ) : null}
              {user.presence === "ready" ? (
                <span className="ready-bars" aria-hidden="true">
                  III
                </span>
              ) : null}
            </div>
          </article>
        ))}
        {Array.from({ length: emptyPlayerSlotCount }, (_, index) => (
          <div key={`empty-player-slot-${index}`} className="user-card user-card-empty-slot" role="listitem" aria-label="Open player slot" />
        ))}
      </div>

      {isLobbyRulesOpen ? (
        <div className={`panel inset-panel lobby-rules ${lobbyState.isArmed ? "lobby-rules-armed" : ""}`} data-collapsed={isLobbyRulesCollapsed ? "true" : undefined}>
          <div className="lobby-rules-header">
            <button
              type="button"
              className="lobby-rules-toggle meta-label"
              onClick={() => setIsLobbyRulesCollapsed((current) => !current)}
              aria-expanded={!isLobbyRulesCollapsed}
            >
              <span className="lobby-rules-marker" aria-hidden="true">
                ▸
              </span>
              <span>Lobby rules</span>
            </button>
            <button
              type="button"
              className="lobby-rules-close"
              onClick={() => setIsLobbyRulesOpen(false)}
              aria-label="Collapse lobby rules"
              title="Collapse lobby rules"
            >
              x
            </button>
          </div>
          {!isLobbyRulesCollapsed ? (
            <ul className="instruction-list">
              {lobbyState.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {namePickerMenu}
    </section>
  );
}
