import { AdminPanel } from "../components/AdminPanel";
import { AppHeader } from "../components/AppHeader";
import { LobbyPanel } from "../components/LobbyPanel";
import { StatusFooter } from "../components/StatusFooter";
import { TimerPanel } from "../components/TimerPanel";
import { useAdminPanelHotkey } from "../hooks/useAdminPanelHotkey";
import { useDabSyncSession } from "../hooks/useDabSyncSession";

export function MainScreen() {
  const {
    state,
    lobbyState,
    sdkState,
    joinSession,
    startReadyHold,
    endReadyHold,
    setTimerDuration,
    resetRound,
    forceStartRound,
    forceCompleteRound,
    adminResetSession,
    addTestParticipant,
    toggleTestParticipantsReady,
    clearTestParticipants,
  } = useDabSyncSession();
  const { isOpen: isAdminOpen, setIsOpen: setIsAdminOpen } = useAdminPanelHotkey(lobbyState.canUseAdminTools);

  return (
    <main className="app-shell">
      <AppHeader session={state.session} syncStatus={state.syncStatus} />

      {state.syncStatus.connection === "connecting" ? (
        <div className="panel sync-banner">
          <strong>Sync warming up.</strong> Waiting for the timing link before enabling shared controls.
        </div>
      ) : null}

      {state.syncStatus.connection === "offline" || state.syncStatus.connection === "error" ? (
        <div className="panel sync-banner sync-banner-alert">
          <strong>Sync unavailable.</strong> {state.syncStatus.warning ?? "Reconnect the sync layer to resume shared timing."}
        </div>
      ) : null}

      <div className="content-grid">
        <LobbyPanel session={state.session} users={state.users} lobbyState={lobbyState} onJoinSession={joinSession} />
        <TimerPanel
          state={state}
          lobbyState={lobbyState}
          onStartReadyHold={startReadyHold}
          onEndReadyHold={endReadyHold}
          onSetTimerDuration={setTimerDuration}
          onResetRound={resetRound}
        />
      </div>

      <AdminPanel
        state={state}
        lobbyState={lobbyState}
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onForceStartRound={forceStartRound}
        onForceCompleteRound={forceCompleteRound}
        onResetSession={adminResetSession}
        onAddTestParticipant={addTestParticipant}
        onToggleTestParticipantsReady={toggleTestParticipantsReady}
        onClearTestParticipants={clearTestParticipants}
      />

      <StatusFooter syncStatus={state.syncStatus} sdkState={sdkState} />
    </main>
  );
}
