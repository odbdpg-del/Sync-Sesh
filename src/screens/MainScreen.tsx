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
import { useSoundCloudPlayer } from "../hooks/useSoundCloudPlayer";
import { useSoundEffects } from "../hooks/useSoundEffects";

function hasRenderingSpikeParam() {
  return new URLSearchParams(window.location.search).get("spike3d") === "1";
}

export function MainScreen() {
  const [isRenderingSpikeOpen, setIsRenderingSpikeOpen] = useState(hasRenderingSpikeParam);
  const [isThreeDModeOpen, setIsThreeDModeOpen] = useState(false);
  const [soundCloudWaveformBarCount, setSoundCloudWaveformBarCount] = useState(60);
  const { zoomPercent } = useAppViewportControls();
  const { isSecretUnlocked, resetSecretEntry, unlockCount } = useSecretCodeUnlock();
  const threeDJoinAttemptKeyRef = useRef<string | null>(null);
  const {
    state,
    lobbyState,
    sdkState,
    joinSession,
    startReadyHold,
    endReadyHold,
    setTimerDuration,
    setPrecountDuration,
    resetRound,
    forceStartRound,
    forceCompleteRound,
    adminResetSession,
    addTestParticipant,
    toggleTestParticipantsReady,
    clearTestParticipants,
    setLateJoinersJoinReady,
    setAutoJoinOnLoad,
    submitRangeScore,
    updateFreeRoamPresence,
    clearFreeRoamPresence,
    setDawTempo,
    playDawTransport,
    stopDawTransport,
    publishDawClip,
    clearDawClip,
    broadcastDawLiveSound,
  } = useDabSyncSession();
  const countdownDisplay = useCountdownDisplay(state);
  const { playCue } = useSoundEffects(state, lobbyState, countdownDisplay);
  const { isOpen: isAdminOpen, setIsOpen: setIsAdminOpen } = useAdminPanelHotkey(lobbyState.canUseAdminTools);
  const soundCloudPlayer = useSoundCloudPlayer({ waveformBarCount: soundCloudWaveformBarCount });

  useEffect(() => {
    if (unlockCount > 0) {
      setIsThreeDModeOpen(true);
    }
  }, [unlockCount]);

  useEffect(() => {
    if (!isThreeDModeOpen || state.syncStatus.connection !== "connected" || !lobbyState.canJoinSession) {
      return;
    }

    const attemptKey = `${state.session.id}:${state.localProfile.id}`;

    if (threeDJoinAttemptKeyRef.current === attemptKey) {
      return;
    }

    threeDJoinAttemptKeyRef.current = attemptKey;
    joinSession();
  }, [
    isThreeDModeOpen,
    joinSession,
    lobbyState.canJoinSession,
    state.localProfile.id,
    state.session.id,
    state.syncStatus.connection,
  ]);

  const handleJoinSession = () => {
    playCue("ui_join_ping");
    joinSession();
  };

  const handleStartReadyHold = () => {
    playCue("ui_ready_hold_start");
    startReadyHold();
  };

  const handleEndReadyHold = () => {
    if (!lobbyState.releaseStartsCountdown) {
      playCue("ui_ready_release_cancel");
    }

    endReadyHold();
  };

  const handleResetRound = () => {
    resetRound();
  };

  return (
    <main
      className="app-shell"
      data-secret-unlocked={isSecretUnlocked ? "true" : undefined}
      data-3d-shell-open={isThreeDModeOpen ? "true" : undefined}
      onClickCapture={!isThreeDModeOpen ? resetSecretEntry : undefined}
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
        <LobbyPanel session={state.session} users={state.users} lobbyState={lobbyState} onJoinSession={handleJoinSession} />
        <TimerPanel
          state={state}
          lobbyState={lobbyState}
          countdownDisplay={countdownDisplay}
          onStartReadyHold={handleStartReadyHold}
          onEndReadyHold={handleEndReadyHold}
          onSetTimerDuration={setTimerDuration}
          onSetPrecountDuration={setPrecountDuration}
          onResetRound={handleResetRound}
        />
      </div>

      <SoundCloudPanel waveformBarCount={soundCloudWaveformBarCount} player={soundCloudPlayer} />

      <AdminPanel
        state={state}
        lobbyState={lobbyState}
        isOpen={isAdminOpen}
        waveformBarCount={soundCloudWaveformBarCount}
        soundCloudPlayer={soundCloudPlayer}
        onClose={() => setIsAdminOpen(false)}
        onSetWaveformBarCount={setSoundCloudWaveformBarCount}
        onForceStartRound={forceStartRound}
        onForceCompleteRound={forceCompleteRound}
        onResetSession={adminResetSession}
        onAddTestParticipant={addTestParticipant}
        onToggleTestParticipantsReady={toggleTestParticipantsReady}
        onClearTestParticipants={clearTestParticipants}
        onSetLateJoinersJoinReady={setLateJoinersJoinReady}
        onSetAutoJoinOnLoad={setAutoJoinOnLoad}
      />

      <StatusFooter syncStatus={state.syncStatus} sdkState={sdkState} />

      {isThreeDModeOpen ? (
        <ThreeDModeShell
          countdownDisplay={countdownDisplay}
          users={state.users}
          localUserId={state.localProfile.id}
          ownerId={state.session.ownerId}
          roundNumber={state.session.roundNumber}
          rangeScoreboard={state.rangeScoreboard}
          onSubmitRangeScore={submitRangeScore}
          freeRoamPresence={state.freeRoamPresence}
          onUpdateFreeRoamPresence={updateFreeRoamPresence}
          onClearFreeRoamPresence={clearFreeRoamPresence}
          jukeboxDisplay={soundCloudPlayer.jukeboxDisplay}
          jukeboxActions={soundCloudPlayer.jukeboxActions}
          sharedDawTransport={state.dawTransport}
          sharedDawClips={state.dawClips}
          sharedDawLiveSound={state.dawLiveSound}
          syncStatus={state.syncStatus}
          canControlSharedDawTransport={lobbyState.isLocalHost}
          canAdminSharedDawClips={lobbyState.isLocalHost}
          onSetSharedDawTempo={setDawTempo}
          onPlaySharedDawTransport={playDawTransport}
          onStopSharedDawTransport={stopDawTransport}
          onPublishSharedDawClip={publishDawClip}
          onClearSharedDawClip={clearDawClip}
          onBroadcastDawLiveSound={broadcastDawLiveSound}
          onExit={() => setIsThreeDModeOpen(false)}
        />
      ) : null}
      {isRenderingSpikeOpen ? <RenderingStackSpike onClose={() => setIsRenderingSpikeOpen(false)} /> : null}
    </main>
  );
}
