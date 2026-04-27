import { useEffect, useState } from "react";
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
import backgroundVideo from "../../media/202587-918431513.mp4";

function hasRenderingSpikeParam() {
  return new URLSearchParams(window.location.search).get("spike3d") === "1";
}

export function MainScreen() {
  const [isRenderingSpikeOpen, setIsRenderingSpikeOpen] = useState(hasRenderingSpikeParam);
  const [isThreeDModeOpen, setIsThreeDModeOpen] = useState(false);
  const [soundCloudWaveformBarCount, setSoundCloudWaveformBarCount] = useState(60);
  const { zoomPercent, panelOpacityPercent, setPanelOpacityPercent } = useAppViewportControls();
  const { isSecretUnlocked, resetSecretEntry, unlockCount, entryProgress, entryStepCount, lastMatchedLength, errorCount, errorProgress } =
    useSecretCodeUnlock();
  const {
    state,
    lobbyState,
    sdkState,
    joinSession,
    startReadyHold,
    endReadyHold,
    setTimerDuration,
    setPrecountDuration,
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
    retryDiscordProfile,
  } = useDabSyncSession();
  const countdownDisplay = useCountdownDisplay(state);
  const { playCue, playSecretCodeStep } = useSoundEffects(state, lobbyState, countdownDisplay);
  const { isOpen: isAdminOpen, setIsOpen: setIsAdminOpen } = useAdminPanelHotkey(lobbyState.canUseAdminTools);
  const soundCloudPlayer = useSoundCloudPlayer({ waveformBarCount: soundCloudWaveformBarCount });

  useEffect(() => {
    if (unlockCount > 0) {
      playCue("ui_secret_unlock");
      setIsThreeDModeOpen(true);
    }
  }, [playCue, unlockCount]);

  useEffect(() => {
    if (entryStepCount > 0 && lastMatchedLength > 0) {
      playSecretCodeStep(lastMatchedLength - 1);
    }
  }, [entryStepCount, lastMatchedLength, playSecretCodeStep]);

  useEffect(() => {
    if (errorCount > 0) {
      playCue("ui_secret_error");
    }
  }, [errorCount, playCue]);

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

  return (
    <div className="app-stage">
      <div className="app-background-media" aria-hidden="true">
        <video className="app-background-video" autoPlay muted loop playsInline preload="auto">
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        <div className="app-background-stage-tint" />
        <div className="app-background-stage-focus" />
        <div className="app-background-stage-grid" />
        <div className="app-background-stage-atmosphere" />
      </div>

      <main
        className="app-shell"
        data-secret-unlocked={isSecretUnlocked ? "true" : undefined}
        data-3d-shell-open={isThreeDModeOpen ? "true" : undefined}
        onClickCapture={!isThreeDModeOpen ? resetSecretEntry : undefined}
      >
        <AppHeader
          session={state.session}
          syncStatus={state.syncStatus}
          zoomPercent={zoomPercent}
          panelOpacityPercent={panelOpacityPercent}
          onPanelOpacityChange={setPanelOpacityPercent}
          secretEntryProgress={entryProgress}
          secretUnlockCount={unlockCount}
          secretErrorProgress={errorProgress}
          secretErrorCount={errorCount}
        />

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

        {sdkState.enabled && (sdkState.authError || sdkState.identitySource === "local") ? (
          <div className="panel sync-banner sync-banner-alert discord-identity-banner">
            <div className="discord-identity-banner-copy">
              <strong>Discord identity unavailable.</strong>{" "}
              {sdkState.authError ??
                (sdkState.authStage && sdkState.authStage !== "ready"
                  ? `Discord identity refresh is in progress (${sdkState.authStage.replace(/_/g, " ")}).`
                  : "The activity is running, but Discord name/avatar resolution fell back to a local profile.")}
            </div>
            <button type="button" className="ghost-button discord-identity-retry" onClick={() => void retryDiscordProfile()}>
              Retry Discord Identity
            </button>
          </div>
        ) : null}

        {!sdkState.enabled && sdkState.startupError ? (
          <div className="panel sync-banner sync-banner-alert discord-identity-banner">
            <strong>Discord SDK startup failed.</strong> {sdkState.startupError}
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
            onExit={() => setIsThreeDModeOpen(false)}
          />
        ) : null}
        {isRenderingSpikeOpen ? <RenderingStackSpike onClose={() => setIsRenderingSpikeOpen(false)} /> : null}
      </main>
    </div>
  );
}
