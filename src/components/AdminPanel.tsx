import { useState } from "react";
import type { SoundCloudPlayerController } from "../hooks/useSoundCloudPlayer";
import type { DabSyncState, DerivedLobbyState } from "../types/session";

interface AdminPanelProps {
  state: DabSyncState;
  lobbyState: DerivedLobbyState;
  isOpen: boolean;
  waveformBarCount: number;
  soundCloudPlayer: SoundCloudPlayerController;
  onClose: () => void;
  onSetWaveformBarCount: (count: number) => void;
  onForceStartRound: () => void;
  onForceCompleteRound: () => void;
  onResetSession: () => void;
  onAddTestParticipant: () => void;
  onToggleTestParticipantsReady: () => void;
  onClearTestParticipants: () => void;
  onSetLateJoinersJoinReady: (enabled: boolean) => void;
  onSetAutoJoinOnLoad: (enabled: boolean) => void;
}

function formatDebugValue(value: boolean | number | string | null) {
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return value ?? "none";
}

function truncateDebugUrl(url: string) {
  return url.length > 96 ? `${url.slice(0, 93)}...` : url;
}

export function AdminPanel({
  state,
  lobbyState,
  isOpen,
  waveformBarCount,
  soundCloudPlayer,
  onClose,
  onSetWaveformBarCount,
  onForceStartRound,
  onForceCompleteRound,
  onResetSession,
  onAddTestParticipant,
  onToggleTestParticipantsReady,
  onClearTestParticipants,
  onSetLateJoinersJoinReady,
  onSetAutoJoinOnLoad,
}: AdminPanelProps) {
  const [isSoundCloudToolsOpen, setIsSoundCloudToolsOpen] = useState(false);

  if (!isOpen || !lobbyState.canUseAdminTools) {
    return null;
  }

  const testUsers = state.users.filter((user) => user.isTestUser);
  const soundCloudState = soundCloudPlayer.state;

  return (
    <aside className="panel admin-panel">
      <div className="admin-header">
        <div>
          <p className="eyebrow">
            Admin Tool
            <button
              type="button"
              className="admin-title-secret"
              onClick={() => setIsSoundCloudToolsOpen((current) => !current)}
              aria-label="Toggle SoundCloud waveform tools"
              aria-pressed={isSoundCloudToolsOpen}
            >
              s
            </button>
          </p>
          <h2>Host Test Controls</h2>
        </div>
        <button type="button" className="ghost-button admin-close" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="panel inset-panel admin-status">
        <p className="meta-label">Session debug</p>
        <p>Phase: {state.session.phase}</p>
        <p>Connected users: {state.users.length}</p>
        <p>Sim users: {testUsers.length}</p>
        <p>Toggle this panel with `</p>
      </div>

      <label className="panel inset-panel admin-toggle-row">
        <div>
          <p className="meta-label">Late joins ready</p>
          <p>
            {state.timerConfig.lateJoinersJoinReady
              ? "Late joiners enter ready during countdown."
              : "Late joiners spectate during countdown."}
          </p>
        </div>
        <input
          type="checkbox"
          checked={state.timerConfig.lateJoinersJoinReady}
          onChange={(event) => onSetLateJoinersJoinReady(event.target.checked)}
        />
      </label>

      <label className="panel inset-panel admin-toggle-row">
        <div>
          <p className="meta-label">Auto join on load</p>
          <p>
            {state.timerConfig.autoJoinOnLoad
              ? "Visitors join the session after sync connects."
              : "Visitors must click Join Session."}
          </p>
        </div>
        <input
          type="checkbox"
          checked={state.timerConfig.autoJoinOnLoad}
          onChange={(event) => onSetAutoJoinOnLoad(event.target.checked)}
        />
      </label>

      {isSoundCloudToolsOpen ? (
        <div className="panel inset-panel admin-control-panel">
          <div className="admin-control-heading">
            <div>
              <p className="meta-label">SoundCloud waveform</p>
              <strong>{waveformBarCount} lines</strong>
            </div>
          </div>
          <label className="admin-slider-row">
            <span>Dense</span>
            <input
              type="range"
              min="1"
              max="2000"
              step="1"
              value={waveformBarCount}
              onChange={(event) => onSetWaveformBarCount(Number(event.target.value))}
              aria-label="SoundCloud waveform line count"
            />
            <span>Fine</span>
          </label>
          <div className="admin-debug-panel">
            <p className="meta-label">SoundCloud debug</p>
            <dl>
              <div>
                <dt>Script</dt>
                <dd>{formatDebugValue(soundCloudState.isScriptReady)}</dd>
              </div>
              <div>
                <dt>Widget</dt>
                <dd>{formatDebugValue(soundCloudState.isWidgetReady)}</dd>
              </div>
              <div>
                <dt>Tracks</dt>
                <dd>{soundCloudState.trackCount}</dd>
              </div>
              <div>
                <dt>Playing</dt>
                <dd>{formatDebugValue(soundCloudState.isPlaying)}</dd>
              </div>
              <div>
                <dt>Error</dt>
                <dd>{formatDebugValue(soundCloudState.errorMessage)}</dd>
              </div>
              <div>
                <dt>Iframe</dt>
                <dd title={soundCloudState.resolvedWidgetSrc}>{truncateDebugUrl(soundCloudState.resolvedWidgetSrc)}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}

      <div className="admin-grid">
        <button type="button" className="primary-button" onClick={onForceStartRound}>
          Start Test Countdown
        </button>
        <button type="button" className="ghost-button" onClick={onForceCompleteRound}>
          Force Complete
        </button>
        <button type="button" className="ghost-button" onClick={onResetSession}>
          Reset To Lobby
        </button>
        <button type="button" className="ghost-button" onClick={onAddTestParticipant} disabled={state.users.length >= state.session.capacity.max}>
          Add Sim User
        </button>
        <button type="button" className="ghost-button" onClick={onToggleTestParticipantsReady} disabled={testUsers.length === 0}>
          Toggle Sim Ready
        </button>
        <button type="button" className="ghost-button" onClick={onClearTestParticipants} disabled={testUsers.length === 0}>
          Clear Sim Users
        </button>
      </div>
    </aside>
  );
}
