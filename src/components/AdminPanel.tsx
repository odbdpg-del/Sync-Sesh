import type { DabSyncState, DerivedLobbyState } from "../types/session";

interface AdminPanelProps {
  state: DabSyncState;
  lobbyState: DerivedLobbyState;
  isOpen: boolean;
  onClose: () => void;
  onForceStartRound: () => void;
  onForceCompleteRound: () => void;
  onResetSession: () => void;
  onAddTestParticipant: () => void;
  onToggleTestParticipantsReady: () => void;
  onClearTestParticipants: () => void;
}

export function AdminPanel({
  state,
  lobbyState,
  isOpen,
  onClose,
  onForceStartRound,
  onForceCompleteRound,
  onResetSession,
  onAddTestParticipant,
  onToggleTestParticipantsReady,
  onClearTestParticipants,
}: AdminPanelProps) {
  if (!isOpen || !lobbyState.canUseAdminTools) {
    return null;
  }

  const testUsers = state.users.filter((user) => user.isTestUser);

  return (
    <aside className="panel admin-panel">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Admin Tools</p>
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
