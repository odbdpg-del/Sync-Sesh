import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { AppHeader } from "../components/AppHeader";
import { LobbyPanel } from "../components/LobbyPanel";
import { SoundCloudPanel } from "../components/SoundCloudPanel";
import { StatusFooter } from "../components/StatusFooter";
import { TimerPanel } from "../components/TimerPanel";
import type { SoundCloudBoothConsoleEvent, SoundCloudBoothConsoleEventInput, SoundCloudBoothState } from "../3d/soundCloudBooth";
import { useAdminPanelHotkey } from "../hooks/useAdminPanelHotkey";
import { useAppViewportControls } from "../hooks/useAppViewportControls";
import { useCountdownDisplay } from "../hooks/useCountdownDisplay";
import { useDabSyncSession } from "../hooks/useDabSyncSession";
import { useSecretCodeUnlock } from "../hooks/useSecretCodeUnlock";
import { useSoundCloudPlayer, type SoundCloudAcceptedBpmState } from "../hooks/useSoundCloudPlayer";
import { useSoundEffects } from "../hooks/useSoundEffects";

const RenderingStackSpike = lazy(() =>
  import("../3d/RenderingStackSpike").then((module) => ({ default: module.RenderingStackSpike })),
);
const ThreeDModeShell = lazy(() =>
  import("../3d/ThreeDModeShell").then((module) => ({ default: module.ThreeDModeShell })),
);

function hasRenderingSpikeParam() {
  return new URLSearchParams(window.location.search).get("spike3d") === "1";
}

function HiddenWorldLoadingPanel({ label }: { label: string }) {
  return (
    <div className="three-d-shell-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div className="three-d-shell-panel">
        <strong>{label}</strong>
        <span>Loading hidden world...</span>
      </div>
    </div>
  );
}

function clampSoundCloudCrossfader(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function clampSoundCloudMasterVolume(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getSoundCloudCrossfadeLevels(crossfader: number) {
  const position = (clampSoundCloudCrossfader(crossfader) + 1) / 2;

  return {
    deckA: Math.cos(position * Math.PI * 0.5),
    deckB: Math.sin(position * Math.PI * 0.5),
  };
}

type SoundCloudDeckId = "A" | "B";
const SOUNDCLOUD_BOOTH_CONSOLE_EVENT_LIMIT = 24;

interface SoundCloudSyncDeckSnapshot {
  id: SoundCloudDeckId;
  acceptedBpmState: SoundCloudAcceptedBpmState;
  isLoaded: boolean;
  playbackPosition: number;
  playbackDuration: number;
  seekTo: (positionMs: number, options?: { playAfterSeek?: boolean }) => boolean;
}

function getShortestSoundCloudPhaseDelta(sourcePhase: number, targetPhase: number, beatMs: number) {
  const rawDelta = sourcePhase - targetPhase;

  if (rawDelta > beatMs / 2) {
    return rawDelta - beatMs;
  }

  if (rawDelta < -beatMs / 2) {
    return rawDelta + beatMs;
  }

  return rawDelta;
}

function getSoundCloudSyncButtonLabel(sourceBpmState: SoundCloudAcceptedBpmState, targetBpmState: SoundCloudAcceptedBpmState) {
  if (
    (sourceBpmState.source === "wave" && sourceBpmState.confidence < 0.7) ||
    (targetBpmState.source === "wave" && targetBpmState.confidence < 0.7) ||
    sourceBpmState.source === "length" ||
    targetBpmState.source === "length"
  ) {
    return "SYNC LOW";
  }

  return "SYNCED";
}

function syncSoundCloudDeckToSource(target: SoundCloudSyncDeckSnapshot, source: SoundCloudSyncDeckSnapshot) {
  if (!target.isLoaded) {
    return "LOAD TRACK";
  }

  if (!source.isLoaded) {
    return "NO MASTER";
  }

  if (!source.acceptedBpmState.bpm || !target.acceptedBpmState.bpm) {
    return "NO BPM";
  }

  const sourceBeatMs = 60_000 / source.acceptedBpmState.bpm;
  const targetBeatMs = 60_000 / target.acceptedBpmState.bpm;
  const sourcePhase = (source.playbackPosition / sourceBeatMs) % 1;
  const targetPhase = (target.playbackPosition / targetBeatMs) % 1;
  const delta = getShortestSoundCloudPhaseDelta(sourcePhase, targetPhase, 1) * targetBeatMs;
  const nextPosition = Math.max(0, Math.min(target.playbackDuration, target.playbackPosition + delta));

  if (!target.seekTo(nextPosition, { playAfterSeek: true })) {
    return "LOAD TRACK";
  }

  return getSoundCloudSyncButtonLabel(source.acceptedBpmState, target.acceptedBpmState);
}

function getSoundCloudBoothConsoleTrackLabel(title: string, fallback: string) {
  return title.trim() || fallback;
}

export function MainScreen() {
  const [isRenderingSpikeOpen, setIsRenderingSpikeOpen] = useState(hasRenderingSpikeParam);
  const [isThreeDModeOpen, setIsThreeDModeOpen] = useState(false);
  const [soundCloudWaveformBarCount, setSoundCloudWaveformBarCount] = useState(60);
  const [soundCloudCrossfader, setSoundCloudCrossfader] = useState(0);
  const [soundCloudMasterVolume, setSoundCloudMasterVolume] = useState(100);
  const [soundCloudDeckMuted, setSoundCloudDeckMuted] = useState<Record<SoundCloudDeckId, boolean>>({ A: false, B: false });
  const [soundCloudDeckSyncLabels, setSoundCloudDeckSyncLabels] = useState<Record<SoundCloudDeckId, string>>({ A: "SYNC", B: "SYNC" });
  const [soundCloudBoothConsoleEvents, setSoundCloudBoothConsoleEvents] = useState<SoundCloudBoothConsoleEvent[]>([]);
  const { zoomPercent } = useAppViewportControls();
  const { isSecretUnlocked, resetSecretEntry, unlockCount } = useSecretCodeUnlock();
  const threeDJoinAttemptKeyRef = useRef<string | null>(null);
  const previousSoundCloudTrackUrlRef = useRef<Record<SoundCloudDeckId, string | null>>({ A: null, B: null });
  const previousSoundCloudWidgetReadyRef = useRef<Record<SoundCloudDeckId, boolean>>({ A: false, B: false });
  const previousSoundCloudErrorRef = useRef<Record<SoundCloudDeckId, string | null>>({ A: null, B: null });
  const {
    state,
    lobbyState,
    sdkState,
    generatedDisplayNames,
    joinSession,
    rollDisplayName,
    selectDisplayName,
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
    setCountdownPrecisionDigits,
    submitRangeScore,
    updateFreeRoamPresence,
    clearFreeRoamPresence,
    setDawTempo,
    playDawTransport,
    stopDawTransport,
    publishDawClip,
    clearDawClip,
    broadcastDawLiveSound,
    pickupStudioGuitar,
    dropStudioGuitar,
  } = useDabSyncSession();
  const countdownDisplay = useCountdownDisplay(state);
  const { playCue } = useSoundEffects(state, lobbyState, countdownDisplay);
  const { isOpen: isAdminOpen, setIsOpen: setIsAdminOpen } = useAdminPanelHotkey(lobbyState.canUseAdminTools);
  const soundCloudDeckA = useSoundCloudPlayer({
    waveformBarCount: soundCloudWaveformBarCount,
    initialPlaylistId: "spaceships-2",
    initialVolume: 70,
  });
  const soundCloudDeckB = useSoundCloudPlayer({
    waveformBarCount: soundCloudWaveformBarCount,
    initialPlaylistId: "spaceships-1",
    initialVolume: 70,
  });
  const soundCloudCrossfadeLevels = useMemo(() => getSoundCloudCrossfadeLevels(soundCloudCrossfader), [soundCloudCrossfader]);
  const setDeckAOutputLevel = soundCloudDeckA.actions.setOutputLevel;
  const setDeckBOutputLevel = soundCloudDeckB.actions.setOutputLevel;
  const pushSoundCloudBoothConsoleEvent = useCallback((event: SoundCloudBoothConsoleEventInput) => {
    setSoundCloudBoothConsoleEvents((current) => {
      const nextEvent: SoundCloudBoothConsoleEvent = {
        ...event,
        id: `soundcloud-booth-console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };

      return [nextEvent, ...current].slice(0, SOUNDCLOUD_BOOTH_CONSOLE_EVENT_LIMIT);
    });
  }, []);
  const toggleSoundCloudDeckMute = useCallback((deckId: SoundCloudDeckId) => {
    setSoundCloudDeckMuted((current) => ({
      ...current,
      [deckId]: !current[deckId],
    }));
  }, []);
  const syncSoundCloudDeck = useCallback((targetDeckId: SoundCloudDeckId) => {
    const deckA: SoundCloudSyncDeckSnapshot = {
      id: "A",
      acceptedBpmState: soundCloudDeckA.jukeboxDisplay.currentTrackAcceptedBpmState,
      isLoaded: soundCloudDeckA.jukeboxDisplay.isWidgetReady && Boolean(soundCloudDeckA.jukeboxDisplay.currentTrackUrl) && soundCloudDeckA.jukeboxDisplay.playbackDuration > 0,
      playbackPosition: soundCloudDeckA.jukeboxDisplay.playbackPosition,
      playbackDuration: soundCloudDeckA.jukeboxDisplay.playbackDuration,
      seekTo: soundCloudDeckA.actions.seekTo,
    };
    const deckB: SoundCloudSyncDeckSnapshot = {
      id: "B",
      acceptedBpmState: soundCloudDeckB.jukeboxDisplay.currentTrackAcceptedBpmState,
      isLoaded: soundCloudDeckB.jukeboxDisplay.isWidgetReady && Boolean(soundCloudDeckB.jukeboxDisplay.currentTrackUrl) && soundCloudDeckB.jukeboxDisplay.playbackDuration > 0,
      playbackPosition: soundCloudDeckB.jukeboxDisplay.playbackPosition,
      playbackDuration: soundCloudDeckB.jukeboxDisplay.playbackDuration,
      seekTo: soundCloudDeckB.actions.seekTo,
    };
    const resultLabel = targetDeckId === "A"
      ? syncSoundCloudDeckToSource(deckA, deckB)
      : syncSoundCloudDeckToSource(deckB, deckA);

    setSoundCloudDeckSyncLabels((current) => ({
      ...current,
      [targetDeckId]: resultLabel,
    }));

    return resultLabel;
  }, [
    soundCloudDeckA.actions.seekTo,
    soundCloudDeckA.jukeboxDisplay.currentTrackAcceptedBpmState,
    soundCloudDeckA.jukeboxDisplay.currentTrackUrl,
    soundCloudDeckA.jukeboxDisplay.isWidgetReady,
    soundCloudDeckA.jukeboxDisplay.playbackDuration,
    soundCloudDeckA.jukeboxDisplay.playbackPosition,
    soundCloudDeckB.actions.seekTo,
    soundCloudDeckB.jukeboxDisplay.currentTrackAcceptedBpmState,
    soundCloudDeckB.jukeboxDisplay.currentTrackUrl,
    soundCloudDeckB.jukeboxDisplay.isWidgetReady,
    soundCloudDeckB.jukeboxDisplay.playbackDuration,
    soundCloudDeckB.jukeboxDisplay.playbackPosition,
  ]);
  useEffect(() => {
    const previousTrackUrl = previousSoundCloudTrackUrlRef.current.A;

    if (previousTrackUrl === soundCloudDeckA.jukeboxDisplay.currentTrackUrl) {
      return;
    }

    previousSoundCloudTrackUrlRef.current.A = soundCloudDeckA.jukeboxDisplay.currentTrackUrl;
    const trackLabel = getSoundCloudBoothConsoleTrackLabel(soundCloudDeckA.jukeboxDisplay.currentTrackTitle, "Deck A track");

    if (soundCloudDeckA.jukeboxDisplay.currentTrackUrl) {
      pushSoundCloudBoothConsoleEvent({
        kind: "deck",
        deckId: "A",
        label: "TRACK CHANGED",
        detail: trackLabel,
      });
    }
  }, [
    pushSoundCloudBoothConsoleEvent,
    soundCloudDeckA.jukeboxDisplay.currentTrackTitle,
    soundCloudDeckA.jukeboxDisplay.currentTrackUrl,
  ]);

  useEffect(() => {
    const previousTrackUrl = previousSoundCloudTrackUrlRef.current.B;

    if (previousTrackUrl === soundCloudDeckB.jukeboxDisplay.currentTrackUrl) {
      return;
    }

    previousSoundCloudTrackUrlRef.current.B = soundCloudDeckB.jukeboxDisplay.currentTrackUrl;
    const trackLabel = getSoundCloudBoothConsoleTrackLabel(soundCloudDeckB.jukeboxDisplay.currentTrackTitle, "Deck B track");

    if (soundCloudDeckB.jukeboxDisplay.currentTrackUrl) {
      pushSoundCloudBoothConsoleEvent({
        kind: "deck",
        deckId: "B",
        label: "TRACK CHANGED",
        detail: trackLabel,
      });
    }
  }, [
    pushSoundCloudBoothConsoleEvent,
    soundCloudDeckB.jukeboxDisplay.currentTrackTitle,
    soundCloudDeckB.jukeboxDisplay.currentTrackUrl,
  ]);

  useEffect(() => {
    const previousReady = previousSoundCloudWidgetReadyRef.current.A;
    previousSoundCloudWidgetReadyRef.current.A = soundCloudDeckA.jukeboxDisplay.isWidgetReady;

    if (!previousReady && soundCloudDeckA.jukeboxDisplay.isWidgetReady) {
      pushSoundCloudBoothConsoleEvent({ kind: "system", deckId: "A", label: "WIDGET READY", detail: soundCloudDeckA.jukeboxDisplay.playlistLabel });
    }
  }, [pushSoundCloudBoothConsoleEvent, soundCloudDeckA.jukeboxDisplay.isWidgetReady, soundCloudDeckA.jukeboxDisplay.playlistLabel]);

  useEffect(() => {
    const previousReady = previousSoundCloudWidgetReadyRef.current.B;
    previousSoundCloudWidgetReadyRef.current.B = soundCloudDeckB.jukeboxDisplay.isWidgetReady;

    if (!previousReady && soundCloudDeckB.jukeboxDisplay.isWidgetReady) {
      pushSoundCloudBoothConsoleEvent({ kind: "system", deckId: "B", label: "WIDGET READY", detail: soundCloudDeckB.jukeboxDisplay.playlistLabel });
    }
  }, [pushSoundCloudBoothConsoleEvent, soundCloudDeckB.jukeboxDisplay.isWidgetReady, soundCloudDeckB.jukeboxDisplay.playlistLabel]);

  useEffect(() => {
    const previousError = previousSoundCloudErrorRef.current.A;
    previousSoundCloudErrorRef.current.A = soundCloudDeckA.jukeboxDisplay.errorMessage;

    if (soundCloudDeckA.jukeboxDisplay.errorMessage && previousError !== soundCloudDeckA.jukeboxDisplay.errorMessage) {
      pushSoundCloudBoothConsoleEvent({ kind: "error", deckId: "A", label: "ERROR", detail: soundCloudDeckA.jukeboxDisplay.errorMessage });
    }
  }, [pushSoundCloudBoothConsoleEvent, soundCloudDeckA.jukeboxDisplay.errorMessage]);

  useEffect(() => {
    const previousError = previousSoundCloudErrorRef.current.B;
    previousSoundCloudErrorRef.current.B = soundCloudDeckB.jukeboxDisplay.errorMessage;

    if (soundCloudDeckB.jukeboxDisplay.errorMessage && previousError !== soundCloudDeckB.jukeboxDisplay.errorMessage) {
      pushSoundCloudBoothConsoleEvent({ kind: "error", deckId: "B", label: "ERROR", detail: soundCloudDeckB.jukeboxDisplay.errorMessage });
    }
  }, [pushSoundCloudBoothConsoleEvent, soundCloudDeckB.jukeboxDisplay.errorMessage]);

  const soundCloudBooth = useMemo<SoundCloudBoothState>(() => ({
    decks: [
      {
        id: "A",
        label: "Deck A",
        display: soundCloudDeckA.jukeboxDisplay,
        actions: soundCloudDeckA.jukeboxActions,
        seekActions: soundCloudDeckA.actions,
        bpmActions: soundCloudDeckA.bpmActions,
        hotCueState: soundCloudDeckA.hotCueState,
        hotCueActions: soundCloudDeckA.hotCueActions,
        trimPercent: soundCloudDeckA.state.volume,
        outputPercent: soundCloudDeckA.state.effectiveVolume,
        isMuted: soundCloudDeckMuted.A,
        syncLabel: soundCloudDeckSyncLabels.A,
        onSetTrimPercent: soundCloudDeckA.actions.setVolume,
        onToggleMute: () => toggleSoundCloudDeckMute("A"),
        onSyncToOtherDeck: () => syncSoundCloudDeck("A"),
      },
      {
        id: "B",
        label: "Deck B",
        display: soundCloudDeckB.jukeboxDisplay,
        actions: soundCloudDeckB.jukeboxActions,
        seekActions: soundCloudDeckB.actions,
        bpmActions: soundCloudDeckB.bpmActions,
        hotCueState: soundCloudDeckB.hotCueState,
        hotCueActions: soundCloudDeckB.hotCueActions,
        trimPercent: soundCloudDeckB.state.volume,
        outputPercent: soundCloudDeckB.state.effectiveVolume,
        isMuted: soundCloudDeckMuted.B,
        syncLabel: soundCloudDeckSyncLabels.B,
        onSetTrimPercent: soundCloudDeckB.actions.setVolume,
        onToggleMute: () => toggleSoundCloudDeckMute("B"),
        onSyncToOtherDeck: () => syncSoundCloudDeck("B"),
      },
    ],
    mixer: {
      crossfader: soundCloudCrossfader,
      masterVolume: soundCloudMasterVolume,
      deckAOutputPercent: soundCloudDeckA.state.effectiveVolume,
      deckBOutputPercent: soundCloudDeckB.state.effectiveVolume,
      onSetCrossfader: (value) => setSoundCloudCrossfader(clampSoundCloudCrossfader(value)),
      onSetMasterVolume: (value) => setSoundCloudMasterVolume(clampSoundCloudMasterVolume(value)),
    },
    consoleEvents: soundCloudBoothConsoleEvents,
    onPushConsoleEvent: pushSoundCloudBoothConsoleEvent,
  }), [
    pushSoundCloudBoothConsoleEvent,
    soundCloudCrossfader,
    soundCloudBoothConsoleEvents,
    soundCloudDeckMuted.A,
    soundCloudDeckMuted.B,
    soundCloudDeckSyncLabels.A,
    soundCloudDeckSyncLabels.B,
    soundCloudDeckA.hotCueActions,
    soundCloudDeckA.jukeboxActions,
    soundCloudDeckA.jukeboxDisplay,
    soundCloudDeckA.hotCueState,
    soundCloudDeckA.actions,
    soundCloudDeckA.actions.setVolume,
    soundCloudDeckA.bpmActions,
    soundCloudDeckA.state.effectiveVolume,
    soundCloudDeckA.state.volume,
    soundCloudDeckB.hotCueActions,
    soundCloudDeckB.jukeboxActions,
    soundCloudDeckB.jukeboxDisplay,
    soundCloudDeckB.hotCueState,
    soundCloudDeckB.actions,
    soundCloudDeckB.actions.setVolume,
    soundCloudDeckB.bpmActions,
    soundCloudDeckB.state.effectiveVolume,
    soundCloudDeckB.state.volume,
    soundCloudMasterVolume,
    syncSoundCloudDeck,
    toggleSoundCloudDeckMute,
  ]);

  useEffect(() => {
    const masterLevel = soundCloudMasterVolume / 100;
    setDeckAOutputLevel(soundCloudDeckMuted.A ? 0 : soundCloudCrossfadeLevels.deckA * masterLevel);
    setDeckBOutputLevel(soundCloudDeckMuted.B ? 0 : soundCloudCrossfadeLevels.deckB * masterLevel);
  }, [
    setDeckAOutputLevel,
    setDeckBOutputLevel,
    soundCloudDeckMuted.A,
    soundCloudDeckMuted.B,
    soundCloudCrossfadeLevels.deckA,
    soundCloudCrossfadeLevels.deckB,
    soundCloudMasterVolume,
  ]);

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
    if (isThreeDModeOpen) {
      return;
    }

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
        <LobbyPanel
          session={state.session}
          users={state.users}
          lobbyState={lobbyState}
          generatedDisplayNames={generatedDisplayNames}
          onJoinSession={handleJoinSession}
          onRollDisplayName={rollDisplayName}
          onSelectDisplayName={selectDisplayName}
        />
        <TimerPanel
          state={state}
          lobbyState={lobbyState}
          countdownDisplay={countdownDisplay}
          readyHotkeyEnabled={!isThreeDModeOpen}
          onStartReadyHold={handleStartReadyHold}
          onEndReadyHold={handleEndReadyHold}
          onSetTimerDuration={setTimerDuration}
          onSetPrecountDuration={setPrecountDuration}
          onResetRound={handleResetRound}
        />
      </div>

      <SoundCloudPanel
        decks={[
          { id: "A", label: "Deck A", player: soundCloudDeckA },
          { id: "B", label: "Deck B", player: soundCloudDeckB },
        ]}
        mixer={{
          crossfader: soundCloudCrossfader,
          masterVolume: soundCloudMasterVolume,
        }}
        mixerReadout={{
          deckAOutputPercent: soundCloudDeckA.state.effectiveVolume,
          deckBOutputPercent: soundCloudDeckB.state.effectiveVolume,
        }}
        onSetCrossfader={(value) => setSoundCloudCrossfader(clampSoundCloudCrossfader(value))}
        onSetMasterVolume={(value) => setSoundCloudMasterVolume(clampSoundCloudMasterVolume(value))}
      />

      <AdminPanel
        state={state}
        lobbyState={lobbyState}
        isOpen={isAdminOpen}
        waveformBarCount={soundCloudWaveformBarCount}
        soundCloudPlayer={soundCloudDeckA}
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
        onSetCountdownPrecisionDigits={setCountdownPrecisionDigits}
      />

      <StatusFooter syncStatus={state.syncStatus} sdkState={sdkState} />

      {isThreeDModeOpen ? (
        <Suspense fallback={<HiddenWorldLoadingPanel label="Loading 3D world" />}>
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
            jukeboxDisplay={soundCloudDeckA.jukeboxDisplay}
            jukeboxActions={soundCloudDeckA.jukeboxActions}
            soundCloudBooth={soundCloudBooth}
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
            studioGuitar={state.studioGuitar}
            onPickupStudioGuitar={pickupStudioGuitar}
            onDropStudioGuitar={dropStudioGuitar}
            onExit={() => setIsThreeDModeOpen(false)}
          />
        </Suspense>
      ) : null}
      {isRenderingSpikeOpen ? (
        <Suspense fallback={<HiddenWorldLoadingPanel label="Loading render spike" />}>
          <RenderingStackSpike onClose={() => setIsRenderingSpikeOpen(false)} />
        </Suspense>
      ) : null}
    </main>
  );
}
