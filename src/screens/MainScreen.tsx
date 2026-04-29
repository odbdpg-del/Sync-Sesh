import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { AppHeader } from "../components/AppHeader";
import { DebugConsoleFullscreen } from "../components/DebugConsoleFullscreen";
import { DebugConsoleWindow } from "../components/DebugConsoleWindow";
import { getStartupConsoleEvents, LoadingScreen, type LoadingScreenDiagnosticEvent, type StartupConsoleEvent } from "../components/LoadingScreen";
import { LobbyPanel } from "../components/LobbyPanel";
import { SoundCloudDeckPanel } from "../components/SoundCloudDeckPanel";
import { type SoundCloudPanelMode } from "../components/SoundCloudModeToggle";
import { SoundCloudPanel } from "../components/SoundCloudPanel";
import { SoundCloudWidgetPanel } from "../components/SoundCloudWidgetPanel";
import { StatusFooter } from "../components/StatusFooter";
import { TimerPanel } from "../components/TimerPanel";
import type {
  SoundCloudBoothConsoleEvent,
  SoundCloudBoothConsoleEventInput,
  SoundCloudBoothGridController,
  SoundCloudBoothGridPadId,
  SoundCloudBoothState,
} from "../3d/soundCloudBooth";
import { useAdminPanelHotkey } from "../hooks/useAdminPanelHotkey";
import { useAppViewportControls } from "../hooks/useAppViewportControls";
import { useCountdownDisplay } from "../hooks/useCountdownDisplay";
import { useDebugConsoleState } from "../hooks/useDebugConsoleState";
import { useDebugConsoleTrigger } from "../hooks/useDebugConsoleTrigger";
import { useDabSyncSession } from "../hooks/useDabSyncSession";
import { useSecretCodeUnlock } from "../hooks/useSecretCodeUnlock";
import { useSoundCloudGridController } from "../hooks/useSoundCloudGridController";
import { useSoundCloudPlayer, type SoundCloudAcceptedBpmState } from "../hooks/useSoundCloudPlayer";
import { useSoundEffects } from "../hooks/useSoundEffects";
import type { DebugConsoleEventInput, DebugLogCategory } from "../lib/debug/debugConsole";
import type { StartupProgress, StartupProgressStep } from "../lib/startup/startupProgress";
import type { SyncConnectionState } from "../types/session";
import backgroundVideo from "../../media/202587-918431513.mp4";

const RenderingStackSpike = lazy(() =>
  import("../3d/RenderingStackSpike").then((module) => ({ default: module.RenderingStackSpike })),
);
const ThreeDModeShell = lazy(() =>
  import("../3d/ThreeDModeShell").then((module) => ({ default: module.ThreeDModeShell })),
);

type DebugConsoleDisplayMode = "fullscreen" | "float";

const DEBUG_CONSOLE_COMMAND_HELP =
  "Available commands: hide, clear, help, copy, snapshot, retry, radio, float, fullscreen, filter all, filter auth, filter sdk, filter profile, filter sync, filter network, filter ui, filter command.";

function getStartupDebugCategory(event: StartupConsoleEvent): DebugLogCategory {
  const key = event.key.toLowerCase();

  if (key.includes("discord_auth") || key.includes("discord_identity")) {
    return "auth";
  }

  if (key.includes("discord") || key.includes("sdk")) {
    return "sdk";
  }

  if (key.includes("profile")) {
    return "profile";
  }

  if (key.includes("sync_transport") || key.includes("sync_server")) {
    return "network";
  }

  if (key.includes("sync")) {
    return "sync";
  }

  return "ui";
}

function getStartupDebugLevel(status: StartupProgressStep["status"]) {
  if (status === "error") {
    return "error";
  }

  if (status === "degraded") {
    return "warn";
  }

  return "info";
}

function hasRenderingSpikeParam() {
  return new URLSearchParams(window.location.search).get("spike3d") === "1";
}

function isEditableHotkeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

function getSyncConnectionDiagnosticStatus(connection: SyncConnectionState): StartupProgressStep["status"] {
  switch (connection) {
    case "connected":
      return "complete";
    case "connecting":
      return "active";
    case "error":
      return "error";
    case "offline":
      return "pending";
  }
}

function getBooleanDiagnosticStatus(value: boolean): StartupProgressStep["status"] {
  return value ? "complete" : "pending";
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

function formatSoundCloudGridTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSoundCloudGridBurstLength(milliseconds: number) {
  return milliseconds >= 1000 ? `${milliseconds / 1000}S` : `${milliseconds}MS`;
}

function getDiscordIdentityBannerMessage(sdkState: ReturnType<typeof useDabSyncSession>["sdkState"]) {
  if (sdkState.authStage && sdkState.authStage !== "idle" && sdkState.authStage !== "ready" && !sdkState.authError) {
    return `Discord identity refresh is in progress (${sdkState.authStage.replace(/_/g, " ")}).`;
  }

  if (sdkState.identitySource === "participant_discord") {
    return sdkState.authError
      ? `Using a Discord participant profile for now, but the full identity refresh failed: ${sdkState.authError}`
      : "Using a Discord participant profile, but full authenticated identity has not completed yet.";
  }

  return sdkState.authError
    ? sdkState.authError
    : "The activity is running, but Discord name/avatar resolution fell back to a local profile.";
}

export function MainScreen() {
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);
  const [debugConsoleDisplayMode, setDebugConsoleDisplayMode] = useState<DebugConsoleDisplayMode>("float");
  const debugEventHandlerRef = useRef<((event: DebugConsoleEventInput) => void) | undefined>();
  const [isRenderingSpikeOpen, setIsRenderingSpikeOpen] = useState(hasRenderingSpikeParam);
  const [isThreeDModeOpen, setIsThreeDModeOpen] = useState(false);
  const [isSoundCloudPanelEnabled, setIsSoundCloudPanelEnabled] = useState(false);
  const [soundCloudPanelMode, setSoundCloudPanelMode] = useState<SoundCloudPanelMode>("radio");
  const [soundCloudWaveformBarCount, setSoundCloudWaveformBarCount] = useState(60);
  const { zoomPercent, panelOpacityPercent, setPanelOpacityPercent } = useAppViewportControls();
  const { isSecretUnlocked, resetSecretEntry, unlockCount, entryProgress, entryStepCount, lastMatchedLength, errorCount, errorProgress } =
    useSecretCodeUnlock();
  const [soundCloudCrossfader, setSoundCloudCrossfader] = useState(0);
  const [soundCloudMasterVolume, setSoundCloudMasterVolume] = useState(100);
  const [soundCloudDeckMuted, setSoundCloudDeckMuted] = useState<Record<SoundCloudDeckId, boolean>>({ A: false, B: false });
  const [soundCloudDeckSyncLabels, setSoundCloudDeckSyncLabels] = useState<Record<SoundCloudDeckId, string>>({ A: "SYNC", B: "SYNC" });
  const [soundCloudBoothConsoleEvents, setSoundCloudBoothConsoleEvents] = useState<SoundCloudBoothConsoleEvent[]>([]);
  const [isStartupDebugPaused, setIsStartupDebugPaused] = useState(false);
  const [isStartupConsoleDraining, setIsStartupConsoleDraining] = useState(false);
  const [isStartupCompletionHeld, setIsStartupCompletionHeld] = useState(false);
  const [pausedStartupProgress, setPausedStartupProgress] = useState<StartupProgress | null>(null);
  const threeDJoinAttemptKeyRef = useRef<string | null>(null);
  const wasStartupBlockingRef = useRef(false);
  const startupConsoleCaptureClosedRef = useRef(false);
  const startupConsoleSignaturesRef = useRef<Map<string, string>>(new Map());
  const previousSoundCloudTrackUrlRef = useRef<Record<SoundCloudDeckId, string | null>>({ A: null, B: null });
  const previousSoundCloudWidgetReadyRef = useRef<Record<SoundCloudDeckId, boolean>>({ A: false, B: false });
  const previousSoundCloudErrorRef = useRef<Record<SoundCloudDeckId, string | null>>({ A: null, B: null });
  const handleDebugEvent = useCallback((event: DebugConsoleEventInput) => {
    debugEventHandlerRef.current?.(event);
  }, []);
  const {
    state,
    lobbyState,
    sdkState,
    startupProgress,
    generatedDisplayNames,
    discordDisplayName,
    joinSession,
    rollDisplayName,
    selectDisplayName,
    useDiscordDisplayName,
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
    setCountdownPrecisionDigits,
    submitRangeScore,
    updateFreeRoamPresence,
    clearFreeRoamPresence,
    retryDiscordProfile,
    setDawTempo,
    playDawTransport,
    stopDawTransport,
    publishDawClip,
    clearDawClip,
    broadcastDawLiveSound,
    pickupStudioGuitar,
    dropStudioGuitar,
  } = useDabSyncSession({
    onDebugEvent: handleDebugEvent,
  });
  const openDebugConsole = useCallback(() => {
    setDebugConsoleDisplayMode("fullscreen");
    setIsDebugConsoleOpen(true);
  }, []);
  useDebugConsoleTrigger(openDebugConsole);
  const debugConsoleState = useDebugConsoleState({
    isOpen: isDebugConsoleOpen,
    sdkState,
    syncStatus: state.syncStatus,
    localProfile: state.localProfile,
  });
  useEffect(() => {
    debugEventHandlerRef.current = debugConsoleState.appendLog;

    return () => {
      debugEventHandlerRef.current = undefined;
    };
  }, [debugConsoleState.appendLog]);
  useEffect(() => {
    const handleStartupPauseHotkey = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.key.toLowerCase() !== "p") {
        return;
      }

      if (isEditableHotkeyTarget(event.target)) {
        return;
      }

      if (!startupProgress.isBlocking && !isStartupDebugPaused) {
        return;
      }

      event.preventDefault();
      setIsStartupDebugPaused((current) => {
        const shouldPause = !current;
        setPausedStartupProgress(shouldPause ? startupProgress : null);
        return shouldPause;
      });
    };

    window.addEventListener("keydown", handleStartupPauseHotkey);

    return () => window.removeEventListener("keydown", handleStartupPauseHotkey);
  }, [isStartupDebugPaused, startupProgress]);
  useEffect(() => {
    if (wasStartupBlockingRef.current && !startupProgress.isBlocking && isStartupConsoleDraining) {
      setIsStartupCompletionHeld(true);
    }

    if (!startupProgress.isBlocking && !isStartupConsoleDraining) {
      setIsStartupCompletionHeld(false);
    }

    wasStartupBlockingRef.current = startupProgress.isBlocking;
  }, [isStartupConsoleDraining, startupProgress.isBlocking]);
  const handleStartupConsoleDrainChange = useCallback((isDraining: boolean) => {
    setIsStartupConsoleDraining(isDraining);

    if (!isDraining && !startupProgress.isBlocking) {
      setIsStartupCompletionHeld(false);
    }
  }, [startupProgress.isBlocking]);
  const handleDebugConsoleCommand = useCallback((rawCommand: string) => {
    const normalizedCommand = rawCommand.trim().toLowerCase().replace(/\s+/g, " ");
    debugConsoleState.appendCommandInput(rawCommand);

    if (normalizedCommand === "hide") {
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:hide",
        detail: "Closing debug console.",
      });
      setIsDebugConsoleOpen(false);
      return;
    }

    if (normalizedCommand === "clear") {
      debugConsoleState.clearLogs();
      debugConsoleState.appendCommandInput(rawCommand);
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:clear",
        detail: "Log buffer cleared.",
      });
      return;
    }

    if (normalizedCommand === "help") {
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:help",
        detail: DEBUG_CONSOLE_COMMAND_HELP,
      });
      return;
    }

    if (normalizedCommand === "float") {
      setDebugConsoleDisplayMode("float");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:float",
        detail: "Debug console display mode set to floating window.",
      });
      return;
    }

    if (normalizedCommand === "fullscreen") {
      setDebugConsoleDisplayMode("fullscreen");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:fullscreen",
        detail: "Debug console display mode set to fullscreen.",
      });
      return;
    }

    if (normalizedCommand === "retry") {
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:retry",
        detail: "Retrying Discord identity.",
      });
      void retryDiscordProfile();
      return;
    }

    if (normalizedCommand === "radio") {
      setIsSoundCloudPanelEnabled(true);
      setSoundCloudPanelMode("radio");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:radio",
        detail: "Radio panel enabled.",
      });
      return;
    }

    if (normalizedCommand === "copy") {
      const visibleLogText = debugConsoleState.getVisibleLogText();

      void navigator.clipboard
        .writeText(visibleLogText)
        .then(() => {
          debugConsoleState.appendCommandOutput({
            level: "info",
            label: "command:copy",
            detail: "Visible console output copied to clipboard.",
          });
        })
        .catch((error) => {
          debugConsoleState.appendCommandOutput({
            level: "error",
            label: "command:copy:failed",
            detail: error instanceof Error ? error.message : "Clipboard write failed.",
          });
        });
      return;
    }

    if (normalizedCommand === "snapshot") {
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:snapshot",
        detail: debugConsoleState.getSnapshotText(),
      });
      return;
    }

    if (normalizedCommand === "filter all") {
      debugConsoleState.setActiveFilter("all");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:filter",
        detail: "Showing all log categories.",
      });
      return;
    }

    if (normalizedCommand.startsWith("filter ")) {
      const filterName = normalizedCommand.slice("filter ".length) as DebugLogCategory;
      const allowedFilters: DebugLogCategory[] = ["auth", "sdk", "profile", "sync", "network", "ui", "command"];

      if (allowedFilters.includes(filterName)) {
        debugConsoleState.setActiveFilter(filterName);
        debugConsoleState.appendCommandOutput({
          level: "info",
          label: "command:filter",
          detail: `Showing ${filterName} log events.`,
        });
        return;
      }
    }

    debugConsoleState.appendCommandOutput({
      level: "warn",
      label: "command:unknown",
      detail: `Unknown command: ${rawCommand}. ${DEBUG_CONSOLE_COMMAND_HELP}`,
    });
  }, [debugConsoleState, retryDiscordProfile]);
  const countdownDisplay = useCountdownDisplay(state);
  const { playCue, playSecretCodeStep } = useSoundEffects(state, lobbyState, countdownDisplay);
  const { isOpen: isAdminOpen, setIsOpen: setIsAdminOpen } = useAdminPanelHotkey(lobbyState.canUseAdminTools);
  const frontEndSoundCloudPlayer = useSoundCloudPlayer({
    waveformBarCount: soundCloudWaveformBarCount,
  });
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
  const soundCloudGridA = useSoundCloudGridController({
    deckId: "A",
    playlistSourceUrl: soundCloudDeckA.state.selectedPlaylist.sourceUrl,
    currentTrackUrl: soundCloudDeckA.jukeboxDisplay.currentTrackUrl,
    currentTrackIndex: soundCloudDeckA.jukeboxDisplay.currentTrackIndex,
    currentTrackTitle: soundCloudDeckA.jukeboxDisplay.currentTrackTitle,
    playbackDuration: soundCloudDeckA.jukeboxDisplay.playbackDuration,
    waveformBars: soundCloudDeckA.jukeboxDisplay.waveformBars,
    isWidgetReady: soundCloudDeckA.jukeboxDisplay.isWidgetReady,
  });
  const soundCloudGridB = useSoundCloudGridController({
    deckId: "B",
    playlistSourceUrl: soundCloudDeckB.state.selectedPlaylist.sourceUrl,
    currentTrackUrl: soundCloudDeckB.jukeboxDisplay.currentTrackUrl,
    currentTrackIndex: soundCloudDeckB.jukeboxDisplay.currentTrackIndex,
    currentTrackTitle: soundCloudDeckB.jukeboxDisplay.currentTrackTitle,
    playbackDuration: soundCloudDeckB.jukeboxDisplay.playbackDuration,
    waveformBars: soundCloudDeckB.jukeboxDisplay.waveformBars,
    isWidgetReady: soundCloudDeckB.jukeboxDisplay.isWidgetReady,
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
  const createLoggedSoundCloudGridController = useCallback((grid: SoundCloudBoothGridController): SoundCloudBoothGridController => {
    const getGridModeLabel = () => (grid.state.padMode === "continuous" ? "CONT" : grid.state.padMode === "timeline" ? "TIME" : "RAND");
    const getNextGridModeLabel = () => (grid.state.padMode === "random" ? "TIME" : grid.state.padMode === "timeline" ? "CONT" : "RAND");
    const getPadDetail = (padId: SoundCloudBoothGridPadId) => {
      const pad = grid.state.pads.find((candidate) => candidate.id === padId);
      const burstLengthLabel = formatSoundCloudGridBurstLength(grid.state.burstLengthMs);

      if (!pad) {
        return `${padId} ROLL GRID`;
      }

      if (grid.state.activeTrackKey && pad.trackKey !== grid.state.activeTrackKey) {
        return `${padId} STALE PAD`;
      }

      return `${padId} ${formatSoundCloudGridTime(pad.positionMs)} ${burstLengthLabel}`;
    };

    return {
      ...grid,
      actions: {
        ...grid.actions,
        rollPads: () => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isLocked || !grid.state.activeTrackKey ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isLocked ? "GRID LOCK" : "GRID ROLL",
            detail: grid.state.isLocked ? "ROLL" : grid.state.activeTrackKey ? `${getGridModeLabel()} 64` : "LOAD TRACK",
          });
          grid.actions.rollPads();
        },
        triggerPad: (padId) => {
          const pad = grid.state.pads.find((candidate) => candidate.id === padId);
          const isStalePad = Boolean(pad && grid.state.activeTrackKey && pad.trackKey !== grid.state.activeTrackKey);

          pushSoundCloudBoothConsoleEvent({
            kind: !pad || isStalePad ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isMuted ? "GRID MUTE" : "GRID PAD",
            detail: getPadDetail(padId),
          });
          grid.actions.triggerPad(padId);
        },
        triggerTestBurst: () => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isMuted || !grid.state.isAuxWidgetReady ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isMuted ? "GRID MUTE" : "GRID TEST",
            detail: formatSoundCloudGridBurstLength(grid.state.burstLengthMs),
          });
          grid.actions.triggerTestBurst();
        },
        stepBurstLength: (direction) => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isLocked ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isLocked ? "GRID LOCK" : "GRID LEN",
            detail: grid.state.isLocked
              ? (direction < 0 ? "LEN-" : "LEN+")
              : `${direction < 0 ? "-" : "+"} ${formatSoundCloudGridBurstLength(grid.state.burstLengthMs)}`,
          });
          grid.actions.stepBurstLength(direction);
        },
        stepSampleClamp: (clamp, direction) => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isLocked || grid.state.padMode !== "timeline" ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isLocked ? "GRID LOCK" : "GRID CLAMP",
            detail: grid.state.isLocked
              ? `${clamp === "start" ? "S" : "E"}${direction < 0 ? "-" : "+"}`
              : grid.state.padMode !== "timeline"
                ? "TIME MODE"
                : `${clamp === "start" ? "START" : "END"} ${direction < 0 ? "-" : "+"}`,
          });
          grid.actions.stepSampleClamp(clamp, direction);
        },
        stepSampleWindow: (direction) => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isLocked || grid.state.padMode === "random" ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isLocked ? "GRID LOCK" : "GRID CLAMP",
            detail: grid.state.isLocked ? (direction < 0 ? "CL-" : "CL+") : grid.state.padMode === "random" ? "TIME/CONT" : (direction < 0 ? "CL-" : "CL+"),
          });
          grid.actions.stepSampleWindow(direction);
        },
        stepVolume: (direction) => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isLocked ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isLocked ? "GRID LOCK" : "GRID VOL",
            detail: grid.state.isLocked ? (direction < 0 ? "VOL-" : "VOL+") : `${direction < 0 ? "-" : "+"} ${grid.state.volume}%`,
          });
          grid.actions.stepVolume(direction);
        },
        togglePadMode: () => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isLocked || !grid.state.activeTrackKey ? "error" : "grid",
            deckId: grid.state.deckId,
            label: grid.state.isLocked ? "GRID LOCK" : "GRID MODE",
            detail: grid.state.isLocked
              ? "MODE"
              : grid.state.activeTrackKey
                ? getNextGridModeLabel()
                : "LOAD TRACK",
          });
          grid.actions.togglePadMode();
        },
        toggleMute: () => {
          pushSoundCloudBoothConsoleEvent({
            kind: "grid",
            deckId: grid.state.deckId,
            label: "GRID MUTE",
            detail: grid.state.isMuted ? "OFF" : "ON",
          });
          grid.actions.toggleMute();
        },
        toggleLock: () => {
          pushSoundCloudBoothConsoleEvent({
            kind: "grid",
            deckId: grid.state.deckId,
            label: "GRID LOCK",
            detail: grid.state.isLocked ? "OFF" : "ON",
          });
          grid.actions.toggleLock();
        },
        syncAuxWidgetToDeck: () => {
          pushSoundCloudBoothConsoleEvent({
            kind: grid.state.isAuxWidgetReady && grid.state.activeTrackKey ? "grid" : "error",
            deckId: grid.state.deckId,
            label: "GRID SYNC",
            detail: grid.state.isAuxWidgetReady ? (grid.state.activeTrackKey ? "REQUESTED" : "LOAD TRACK") : "GRID LOADING",
          });
          grid.actions.syncAuxWidgetToDeck();
        },
      },
    };
  }, [pushSoundCloudBoothConsoleEvent]);
  const loggedSoundCloudGridA = useMemo(
    () => createLoggedSoundCloudGridController(soundCloudGridA),
    [createLoggedSoundCloudGridController, soundCloudGridA],
  );
  const loggedSoundCloudGridB = useMemo(
    () => createLoggedSoundCloudGridController(soundCloudGridB),
    [createLoggedSoundCloudGridController, soundCloudGridB],
  );
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
    gridControllers: {
      A: loggedSoundCloudGridA,
      B: loggedSoundCloudGridB,
    },
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
    loggedSoundCloudGridA,
    loggedSoundCloudGridB,
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
  const shouldMountDeckWorkspace = (isSoundCloudPanelEnabled && soundCloudPanelMode === "decks") || isThreeDModeOpen;
  const soundCloudDiagnosticPanelMode = isSoundCloudPanelEnabled ? soundCloudPanelMode : "hidden";
  const adminSoundCloudPlayer = soundCloudPanelMode === "decks" ? soundCloudDeckA : frontEndSoundCloudPlayer;
  const loadingScreenDiagnostics = useMemo<LoadingScreenDiagnosticEvent[]>(() => {
    const syncDetailParts = [
      `mode=${state.syncStatus.mode}`,
      `connection=${state.syncStatus.connection}`,
      `milestone=${state.syncStatus.startupMilestone ?? "none"}`,
    ];
    const isSyncClockReady = state.syncStatus.latencyMs !== undefined;
    const syncTimingParts = isSyncClockReady
      ? [
          `latency=${state.syncStatus.latencyMs}ms`,
          state.syncStatus.serverTimeOffsetMs === undefined ? "offset=pending" : `offset=${state.syncStatus.serverTimeOffsetMs}ms`,
        ]
      : ["latency=pending", "offset=pending"];

    return [
      {
        key: "session_route",
        label: "SESSION_ROUTE",
        detail: `code=${state.session.code} phase=${state.session.phase} round=${state.session.roundNumber}`,
      },
      {
        key: "session_capacity",
        label: "SESSION_CAPACITY",
        detail: `users=${state.users.length}/${state.session.capacity.max} min=${state.session.capacity.min} active=${lobbyState.metrics.activeCount} idle=${lobbyState.metrics.idleCount}`,
      },
      {
        key: "local_profile",
        label: "LOCAL_PROFILE",
        detail: `name=${state.localProfile.displayName} id=${state.localProfile.id.slice(0, 8)}`,
      },
      {
        key: "host_claim",
        label: "HOST_CLAIM",
        detail: `owner=${state.session.ownerId.slice(0, 8)} local_host=${lobbyState.isLocalHost ? "true" : "false"}`,
        status: getBooleanDiagnosticStatus(lobbyState.isLocalHost || Boolean(state.session.ownerId)),
        progress: lobbyState.isLocalHost || Boolean(state.session.ownerId) ? 100 : 0,
      },
      {
        key: "discord_runtime",
        label: "DISCORD_RUNTIME",
        detail: `enabled=${sdkState.enabled ? "true" : "false"} startup=${sdkState.startupStage ?? "unknown"} build=${sdkState.buildId}`,
        status: sdkState.startupError ? "degraded" : sdkState.enabled && sdkState.startupStage !== "ready" ? "active" : "complete",
        progress: sdkState.enabled && sdkState.startupStage !== "ready" ? 70 : 100,
      },
      {
        key: "discord_auth",
        label: "DISCORD_AUTH",
        detail: `stage=${sdkState.authStage ?? "idle"} source=${sdkState.identitySource ?? "pending"} error=${sdkState.authError ? "true" : "false"}`,
        status: sdkState.authError ? "degraded" : sdkState.authStage === "ready" || !sdkState.enabled ? "complete" : "active",
        progress: sdkState.authStage === "ready" || !sdkState.enabled ? 100 : 60,
      },
      {
        key: "sync_transport",
        label: "SYNC_TRANSPORT",
        detail: syncDetailParts.join(" "),
        status: getSyncConnectionDiagnosticStatus(state.syncStatus.connection),
        progress: state.syncStatus.connection === "connected" ? 100 : state.syncStatus.connection === "connecting" ? 50 : 0,
      },
      {
        key: "sync_clock",
        label: "SYNC_CLOCK",
        detail: syncTimingParts.join(" "),
        status: isSyncClockReady ? "complete" : "pending",
        progress: isSyncClockReady ? 100 : 0,
      },
      {
        key: "sync_debug",
        label: "SYNC_DEBUG",
        detail: state.syncStatus.warning ?? state.syncStatus.debugDetail ?? "transport diagnostics nominal",
        status: state.syncStatus.warning ? "degraded" : state.syncStatus.debugDetail ? "active" : "complete",
        progress: state.syncStatus.warning ? 100 : state.syncStatus.debugDetail ? 75 : 100,
      },
      {
        key: "lobby_permissions",
        label: "LOBBY_PERMISSIONS",
        detail: `joined=${lobbyState.isJoined ? "true" : "false"} can_join=${lobbyState.canJoinSession ? "true" : "false"} admin=${lobbyState.canUseAdminTools ? "true" : "false"}`,
        status: lobbyState.isJoined ? "complete" : lobbyState.canJoinSession ? "active" : "pending",
        progress: lobbyState.isJoined ? 100 : lobbyState.canJoinSession ? 50 : 0,
      },
      {
        key: "ready_manifest",
        label: "READY_MANIFEST",
        detail: `ready=${lobbyState.metrics.readyCount} spectators=${lobbyState.metrics.spectatorCount} local_ready=${lobbyState.isLocalUserReady ? "true" : "false"}`,
        status: lobbyState.isLocalUserReady ? "complete" : "pending",
        progress: lobbyState.isLocalUserReady ? 100 : 20,
      },
      {
        key: "auto_join",
        label: "AUTO_JOIN",
        detail: `config=${state.timerConfig.autoJoinOnLoad ? "enabled" : "disabled"} local_user=${lobbyState.localUser ? "resolved" : "pending"}`,
        status: lobbyState.localUser ? "complete" : "active",
        progress: lobbyState.localUser ? 100 : 50,
      },
      {
        key: "media_mount",
        label: "MEDIA_MOUNT",
        detail: `panel=${soundCloudDiagnosticPanelMode} decks=${shouldMountDeckWorkspace ? "mounted" : "standby"} background_video=preload`,
      },
    ];
  }, [
    lobbyState.canJoinSession,
    lobbyState.canUseAdminTools,
    lobbyState.isJoined,
    lobbyState.isLocalHost,
    lobbyState.isLocalUserReady,
    lobbyState.localUser,
    lobbyState.metrics.activeCount,
    lobbyState.metrics.idleCount,
    lobbyState.metrics.readyCount,
    lobbyState.metrics.spectatorCount,
    sdkState.authError,
    sdkState.authStage,
    sdkState.buildId,
    sdkState.enabled,
    sdkState.identitySource,
    sdkState.startupError,
    sdkState.startupStage,
    shouldMountDeckWorkspace,
    soundCloudDiagnosticPanelMode,
    state.localProfile.displayName,
    state.localProfile.id,
    state.session.capacity.max,
    state.session.capacity.min,
    state.session.code,
    state.session.ownerId,
    state.session.phase,
    state.session.roundNumber,
    state.syncStatus.connection,
    state.syncStatus.debugDetail,
    state.syncStatus.latencyMs,
    state.syncStatus.mode,
    state.syncStatus.serverTimeOffsetMs,
    state.syncStatus.startupMilestone,
    state.syncStatus.warning,
    state.timerConfig.autoJoinOnLoad,
    state.users.length,
  ]);
  const loadingScreenProgress = isStartupDebugPaused && pausedStartupProgress ? pausedStartupProgress : startupProgress;
  const shouldShowLoadingScreen = startupProgress.isBlocking || isStartupDebugPaused || isStartupConsoleDraining || isStartupCompletionHeld;
  useEffect(() => {
    if (startupConsoleCaptureClosedRef.current) {
      return;
    }

    const nextSignatures = new Map(startupConsoleSignaturesRef.current);
    const startupConsoleEvents = getStartupConsoleEvents(loadingScreenProgress, loadingScreenDiagnostics);

    for (const event of startupConsoleEvents) {
      if (startupConsoleSignaturesRef.current.get(event.key) === event.signature) {
        continue;
      }

      nextSignatures.set(event.key, event.signature);
      debugConsoleState.appendLog({
        level: getStartupDebugLevel(event.status),
        category: getStartupDebugCategory(event),
        label: `startup:${event.label.toLowerCase()}`,
        detail: `${event.detail} :: ${event.progress}%`,
      });
    }

    startupConsoleSignaturesRef.current = nextSignatures;

    if (!loadingScreenProgress.isBlocking) {
      startupConsoleCaptureClosedRef.current = true;
    }
  }, [debugConsoleState.appendLog, loadingScreenDiagnostics, loadingScreenProgress]);

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

      {shouldShowLoadingScreen ? (
        <LoadingScreen
          progress={loadingScreenProgress}
          diagnostics={loadingScreenDiagnostics}
          isPaused={isStartupDebugPaused}
          onConsoleDrainChange={handleStartupConsoleDrainChange}
        />
      ) : null}

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

        {sdkState.enabled && (sdkState.authError || sdkState.identitySource === "local_fallback" || sdkState.identitySource === "participant_discord") ? (
          <div className="panel sync-banner sync-banner-alert discord-identity-banner">
            <div className="discord-identity-banner-copy">
              <strong>{sdkState.identitySource === "participant_discord" ? "Discord identity degraded." : "Discord identity unavailable."}</strong>{" "}
              {getDiscordIdentityBannerMessage(sdkState)}
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
          <LobbyPanel
            session={state.session}
            users={state.users}
            lobbyState={lobbyState}
            generatedDisplayNames={generatedDisplayNames}
            discordDisplayName={discordDisplayName}
            onJoinSession={handleJoinSession}
            onRollDisplayName={rollDisplayName}
            onSelectDisplayName={selectDisplayName}
            onUseDiscordDisplayName={useDiscordDisplayName}
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
          />
        </div>

        {isSoundCloudPanelEnabled && soundCloudPanelMode === "radio" ? (
          <SoundCloudPanel player={frontEndSoundCloudPlayer} mode={soundCloudPanelMode} onChangeMode={setSoundCloudPanelMode} />
        ) : null}

        {isSoundCloudPanelEnabled && soundCloudPanelMode === "widget" ? (
          <SoundCloudWidgetPanel player={frontEndSoundCloudPlayer} mode={soundCloudPanelMode} onChangeMode={setSoundCloudPanelMode} />
        ) : null}

        {shouldMountDeckWorkspace ? (
          <SoundCloudDeckPanel
            decks={[
              { id: "A", label: "Deck A", player: soundCloudDeckA },
              { id: "B", label: "Deck B", player: soundCloudDeckB },
            ]}
            gridControllers={{
              A: loggedSoundCloudGridA,
              B: loggedSoundCloudGridB,
            }}
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
            mode={soundCloudPanelMode}
            onChangeMode={setSoundCloudPanelMode}
            isVisible={soundCloudPanelMode === "decks"}
          />
        ) : null}

        <AdminPanel
          state={state}
          lobbyState={lobbyState}
          isOpen={isAdminOpen}
          waveformBarCount={soundCloudWaveformBarCount}
          soundCloudPlayer={adminSoundCloudPlayer}
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

        {debugConsoleDisplayMode === "float" ? (
          <DebugConsoleWindow
            isOpen={isDebugConsoleOpen}
            onClose={() => setIsDebugConsoleOpen(false)}
            snapshot={debugConsoleState.snapshot}
            logs={debugConsoleState.visibleLogs}
            activeFilter={debugConsoleState.activeFilter}
            onSubmitCommand={handleDebugConsoleCommand}
          />
        ) : (
          <DebugConsoleFullscreen
            isOpen={isDebugConsoleOpen}
            onClose={() => setIsDebugConsoleOpen(false)}
            snapshot={debugConsoleState.snapshot}
            logs={debugConsoleState.visibleLogs}
            activeFilter={debugConsoleState.activeFilter}
            onSubmitCommand={handleDebugConsoleCommand}
          />
        )}

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
    </div>
  );
}
