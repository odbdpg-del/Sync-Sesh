import { useEffect, useRef, useState } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { AppHeader } from "../components/AppHeader";
import { LobbyPanel } from "../components/LobbyPanel";
import { SoundCloudPanel } from "../components/SoundCloudPanel";
import { StatusFooter } from "../components/StatusFooter";
import { TimerPanel } from "../components/TimerPanel";
import { RenderingStackSpike } from "../3d/RenderingStackSpike";
import { ThreeDModeShell } from "../3d/ThreeDModeShell";
import { useAdminPanelHotkey } from "../hooks/useAdminPanelHotkey";
import { useAppViewportControls } from "../hooks/useAppViewportControls";
import { useCountdownDisplay } from "../hooks/useCountdownDisplay";
import { useDabSyncSession } from "../hooks/useDabSyncSession";
import { useSecretCodeUnlock } from "../hooks/useSecretCodeUnlock";

function hasRenderingSpikeParam() {
  return new URLSearchParams(window.location.search).get("spike3d") === "1";
}

export function MainScreen() {
  const [isRenderingSpikeOpen, setIsRenderingSpikeOpen] = useState(hasRenderingSpikeParam);
  const [isThreeDModeOpen, setIsThreeDModeOpen] = useState(false);
  const { zoomPercent } = useAppViewportControls();
  const { isSecretUnlocked } = useSecretCodeUnlock();
  const wasSecretUnlockedRef = useRef(isSecretUnlocked);
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
  const countdownDisplay = useCountdownDisplay(state);
  const { isOpen: isAdminOpen, setIsOpen: setIsAdminOpen } = useAdminPanelHotkey(lobbyState.canUseAdminTools);

  useEffect(() => {
    if (isSecretUnlocked && !wasSecretUnlockedRef.current) {
      setIsThreeDModeOpen(true);
    }

    wasSecretUnlockedRef.current = isSecretUnlocked;
  }, [isSecretUnlocked]);

  return (
    <main
      className="app-shell"
      data-secret-unlocked={isSecretUnlocked ? "true" : undefined}
      data-3d-shell-open={isThreeDModeOpen ? "true" : undefined}
    >
      <AppHeader session={state.session} syncStatus={state.syncStatus} zoomPercent={zoomPercent} />

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
          countdownDisplay={countdownDisplay}
          onStartReadyHold={startReadyHold}
          onEndReadyHold={endReadyHold}
          onSetTimerDuration={setTimerDuration}
          onResetRound={resetRound}
        />
      </div>

      <SoundCloudPanel />

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

      {isThreeDModeOpen ? (
        <ThreeDModeShell
          countdownDisplay={countdownDisplay}
          users={state.users}
          localUserId={state.localProfile.id}
          ownerId={state.session.ownerId}
          onExit={() => setIsThreeDModeOpen(false)}
        />
      ) : null}
      {isRenderingSpikeOpen ? <RenderingStackSpike onClose={() => setIsRenderingSpikeOpen(false)} /> : null}
    </main>
  );
}
