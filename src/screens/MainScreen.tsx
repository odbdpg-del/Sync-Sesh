import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { AdminPanel } from "../components/AdminPanel";
import { AppHeader } from "../components/AppHeader";
import { DebugConsoleFullscreen } from "../components/DebugConsoleFullscreen";
import { DebugConsoleFullscreen2, type Fullscreen2ConsoleMode } from "../components/DebugConsoleFullscreen2";
import { DEBUG_CONSOLE_INITIAL_RECT, DebugConsoleDockedPanel, DebugConsoleWindow, type DebugConsoleDockedDragInfo } from "../components/DebugConsoleWindow";
import { FloatingWindow } from "../components/FloatingWindow";
import { getStartupConsoleEvents, LoadingScreen, type LoadingScreenDiagnosticEvent, type StartupConsoleEvent } from "../components/LoadingScreen";
import { GlobePanel } from "../components/GlobePanel";
import { LobbyPanel } from "../components/LobbyPanel";
import { PanelWorkspace, type PanelWorkspaceDropPreview } from "../components/PanelWorkspace";
import { SoundCloudDeckPanel } from "../components/SoundCloudDeckPanel";
import { type SoundCloudPanelMode } from "../components/SoundCloudModeToggle";
import { SoundCloudPanel } from "../components/SoundCloudPanel";
import { SoundCloudWidgetPanel } from "../components/SoundCloudWidgetPanel";
import { StatusFooter } from "../components/StatusFooter";
import { TextVoicePanel, type TextVoiceLogEntry } from "../components/TextVoicePanel";
import { TimerPanel } from "../components/TimerPanel";
import type { PanelShellDragInfo } from "../components/PanelShell";
import type {
  SoundCloudBoothConsoleEvent,
  SoundCloudBoothConsoleEventInput,
  SoundCloudBoothGridController,
  SoundCloudBoothGridPadId,
  SoundCloudBoothState,
} from "../3d/soundCloudBooth";
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
import {
  PANEL_LAYOUT_STORAGE_KEY,
  createDefaultPanelLayout,
  panelLayoutReducer,
  parsePanelLayout,
  serializePanelLayout,
  type DockEdge,
  type PanelLayoutState,
  type PanelRect,
  type DockNode,
  type DockPlacement,
  type PanelId,
} from "../lib/panels/panelLayout";
import { getPanelDefinition } from "../lib/panels/panelRegistry";
import { enableOfflineMode } from "../lib/startup/offlineMode";
import type { StartupProgress, StartupProgressStep } from "../lib/startup/startupProgress";
import type { SyncConnectionState, TextVoiceEvent, TextVoiceReplayEvent } from "../types/session";
import backgroundVideo from "../../media/202587-918431513.mp4";

const RenderingStackSpike = lazy(() =>
  import("../3d/RenderingStackSpike").then((module) => ({ default: module.RenderingStackSpike })),
);
const ThreeDModeShell = lazy(() =>
  import("../3d/ThreeDModeShell").then((module) => ({ default: module.ThreeDModeShell })),
);

type DebugConsoleDisplayMode = "fullscreen" | "fullscreen2" | "float";
const DEBUG_CONSOLE_COMMAND_HISTORY_LIMIT = 50;
const TEXT_VOICE_LOG_LIMIT = 30;
const TEXT_VOICE_MAX_LENGTH = 180;

const DEBUG_CONSOLE_COMMAND_HELP =
  "Available commands: hide, clear, help, say-your message, showt2v, resetlayout, small, normal, admin, hidejoin, showjoin, show globe, hide globe, force start, force stop, setround = 5, copy, snapshot, retry, radio, float, console1, console2, fullscreen, background, background 0-100, trans-text 0-100, compact, filter all, filter auth, filter sdk, filter profile, filter sync, filter network, filter ui, filter command. Example: say-note to chat speaks note to chat.";
const DEBUG_CONSOLE_SET_ROUND_COMMAND_PATTERN = /^set\s*round\s*=\s*(-?\d+)$/;
const DEBUG_CONSOLE_SAY_COMMAND_PREFIX = "say-";
const CONSOLE2_INPUT_COMMAND_BACKGROUND_OPACITY_PERCENT = 100;
const CONSOLE2_COMPACT_BACKGROUND_OPACITY_PERCENT = 20;
const CONSOLE2_COMPACT_TEXT_OPACITY_PERCENT = 75;
const CONSOLE2_FULL_BACKGROUND_OPACITY_PERCENT = 100;
const CONSOLE2_FULL_TEXT_OPACITY_PERCENT = 100;
const GLOBE_PANEL_DEFINITION = getPanelDefinition("globe");
const ADMIN_PANEL_DEFINITION = getPanelDefinition("admin");
const TEXT_VOICE_PANEL_DEFINITION = getPanelDefinition("text-voice");
const SOUNDCLOUD_PANEL_IDS = ["soundcloud-radio", "soundcloud-widget", "soundcloud-decks"] as const;
const EMPTY_CELLS_HIDDEN_STORAGE_KEY = "sync_sesh_admin_hide_empty_cells";
const MAX_VISIBLE_EMPTY_PLAYER_SLOTS_STORAGE_KEY = "sync_sesh_admin_max_visible_empty_player_slots";

type SoundCloudPanelId = (typeof SOUNDCLOUD_PANEL_IDS)[number];

function isSoundCloudPanelId(panelId: PanelId): panelId is SoundCloudPanelId {
  return SOUNDCLOUD_PANEL_IDS.includes(panelId as SoundCloudPanelId);
}

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

function speakDebugConsoleLine(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return {
      ok: false,
      detail: "Text-to-speech is unavailable in this browser.",
    };
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);

  return {
    ok: true,
    detail: `Speaking: ${text}`,
  };
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

function dockTreeHasPanel(node: DockNode | null, panelId: string): boolean {
  if (!node) {
    return false;
  }

  if (node.type === "panel") {
    return node.panelId === panelId;
  }

  if (node.type === "empty") {
    return false;
  }

  return dockTreeHasPanel(node.first, panelId) || dockTreeHasPanel(node.second, panelId);
}

function layoutHasPanel(layout: PanelLayoutState, panelId: PanelId): boolean {
  return dockTreeHasPanel(layout.dockRoot, panelId) || layout.floating.some((panel) => panel.panelId === panelId);
}

function getDefaultDockPlacement(panelId: PanelId): DockPlacement {
  const defaultDock = getPanelDefinition(panelId).defaultDock;
  return defaultDock === "left" || defaultDock === "right" || defaultDock === "bottom" ? defaultDock : "bottom";
}

function restorePanelInLayout(layout: PanelLayoutState, panelId: PanelId): PanelLayoutState {
  if (layoutHasPanel(layout, panelId)) {
    return layout;
  }

  const definition = getPanelDefinition(panelId);

  if (definition.defaultDock === "float") {
    return panelLayoutReducer(
      panelLayoutReducer(layout, {
        type: "update-floating-rect",
        panelId,
        rect: definition.defaultFloatingRect,
      }),
      {
        type: "focus-floating-panel",
        panelId,
      },
    );
  }

  return panelLayoutReducer(layout, {
    type: "dock-panel",
    panelId,
    placement: getDefaultDockPlacement(panelId),
  });
}

function removeDockedPanelFromLayout(layout: PanelLayoutState, panelId: PanelId): PanelLayoutState {
  return dockTreeHasPanel(layout.dockRoot, panelId) ? panelLayoutReducer(layout, { type: "remove-docked-panel", panelId }) : layout;
}

function removePanelFromLayout(layout: PanelLayoutState, panelId: PanelId): PanelLayoutState {
  const withoutDockedPanel = removeDockedPanelFromLayout(layout, panelId);
  return {
    ...withoutDockedPanel,
    floating: withoutDockedPanel.floating.filter((panel) => panel.panelId !== panelId),
    activePanelId: withoutDockedPanel.activePanelId === panelId ? undefined : withoutDockedPanel.activePanelId,
  };
}

function removeSoundCloudPanelsFromLayout(layout: PanelLayoutState): PanelLayoutState {
  return SOUNDCLOUD_PANEL_IDS.reduce<PanelLayoutState>((nextLayout, panelId) => removePanelFromLayout(nextLayout, panelId), layout);
}

function getSoundCloudPanelId(mode: SoundCloudPanelMode): SoundCloudPanelId {
  switch (mode) {
    case "radio":
      return "soundcloud-radio";
    case "widget":
      return "soundcloud-widget";
    case "decks":
      return "soundcloud-decks";
  }
}

function getSoundCloudModeForPanelId(panelId: SoundCloudPanelId): SoundCloudPanelMode {
  switch (panelId) {
    case "soundcloud-radio":
      return "radio";
    case "soundcloud-widget":
      return "widget";
    case "soundcloud-decks":
      return "decks";
  }
}

function getInitialSoundCloudPanelMode(layout: PanelLayoutState): SoundCloudPanelMode {
  const restoredPanelId = SOUNDCLOUD_PANEL_IDS.find((panelId) => layoutHasPanel(layout, panelId));
  return restoredPanelId ? getSoundCloudModeForPanelId(restoredPanelId) : "radio";
}

function floatPanelInLayout(layout: PanelLayoutState, panelId: PanelId, rect: PanelRect): PanelLayoutState {
  const undockedLayout = panelLayoutReducer(layout, {
    type: "undock-panel",
    panelId,
    rect,
  });
  const layoutWithFloatingRect =
    undockedLayout === layout
      ? panelLayoutReducer(layout, {
          type: "update-floating-rect",
          panelId,
          rect,
        })
      : undockedLayout;

  return panelLayoutReducer(layoutWithFloatingRect, {
    type: "focus-floating-panel",
    panelId,
  });
}

function getDockPlacementFromPoint(bounds: DOMRect, pointerX: number, pointerY: number): DockPlacement | null {
  const xRatio = (pointerX - bounds.left) / bounds.width;
  const yRatio = (pointerY - bounds.top) / bounds.height;

  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) {
    return null;
  }

  if (xRatio <= 0.25) {
    return "left";
  }

  if (xRatio >= 0.75) {
    return "right";
  }

  if (yRatio <= 0.25) {
    return "top";
  }

  if (yRatio >= 0.75) {
    return "bottom";
  }

  return null;
}

function getWorkspaceDockPlacementFromPoint(bounds: DOMRect, pointerX: number, pointerY: number): DockPlacement | null {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  if (pointerX < bounds.left || pointerX > bounds.right || pointerY < bounds.top || pointerY > bounds.bottom) {
    return null;
  }

  const horizontalEdgeBand = Math.min(96, Math.max(32, bounds.width * 0.12), bounds.width / 2);
  const verticalEdgeBand = Math.min(96, Math.max(32, bounds.height * 0.12), bounds.height / 2);
  const edgeDistances: Array<{ placement: DockPlacement; distance: number }> = [
    { placement: "left", distance: pointerX - bounds.left },
    { placement: "right", distance: bounds.right - pointerX },
    { placement: "top", distance: pointerY - bounds.top },
    { placement: "bottom", distance: bounds.bottom - pointerY },
  ];
  const matchingEdgeDistances = edgeDistances.filter(
    ({ placement, distance }) => distance <= (placement === "left" || placement === "right" ? horizontalEdgeBand : verticalEdgeBand),
  );

  matchingEdgeDistances.sort((first, second) => first.distance - second.distance);

  return matchingEdgeDistances[0]?.placement ?? null;
}

export function MainScreen() {
  const [corePanelLayout, setCorePanelLayout] = useState<PanelLayoutState>(() => {
    const defaultLayout = createDefaultPanelLayout();

    try {
      const savedLayout = window.localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY);
      return savedLayout ? parsePanelLayout(savedLayout) ?? defaultLayout : defaultLayout;
    } catch {
      return defaultLayout;
    }
  });
  const corePanelLayoutRef = useRef(corePanelLayout);
  const panelWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const debugConsoleLastFloatingRectRef = useRef<PanelRect>(DEBUG_CONSOLE_INITIAL_RECT);
  const globeLastFloatingRectRef = useRef<PanelRect>(GLOBE_PANEL_DEFINITION.defaultFloatingRect);
  const adminLastFloatingRectRef = useRef<PanelRect>(ADMIN_PANEL_DEFINITION.defaultFloatingRect);
  const textVoiceLastFloatingRectRef = useRef<PanelRect>(TEXT_VOICE_PANEL_DEFINITION.defaultFloatingRect);
  const soundCloudLastFloatingRectRef = useRef<Record<SoundCloudPanelId, PanelRect>>({
    "soundcloud-radio": getPanelDefinition("soundcloud-radio").defaultFloatingRect,
    "soundcloud-widget": getPanelDefinition("soundcloud-widget").defaultFloatingRect,
    "soundcloud-decks": getPanelDefinition("soundcloud-decks").defaultFloatingRect,
  });
  const [debugConsoleDropPreview, setDebugConsoleDropPreview] = useState<PanelWorkspaceDropPreview | null>(null);
  const dockedPanelDragPointerIdRef = useRef<number | null>(null);
  const dockedPanelDragHeaderRef = useRef<HTMLElement | null>(null);
  const dockedPanelDragPanelIdRef = useRef<PanelId | null>(null);
  const dockedPanelDragStartPointRef = useRef<{ panelId: PanelId; pointerX: number; pointerY: number } | null>(null);
  const [draggingDockedPanelId, setDraggingDockedPanelId] = useState<PanelId | null>(null);
  const [isSmallMode, setIsSmallMode] = useState(false);
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);
  const [debugConsoleDisplayMode, setDebugConsoleDisplayMode] = useState<DebugConsoleDisplayMode>("float");
  const [fullscreen2StartMode, setFullscreen2StartMode] = useState<Fullscreen2ConsoleMode>("full");
  const [fullscreen2OpenRequestId, setFullscreen2OpenRequestId] = useState(0);
  const [fullscreen2CloseRequestId, setFullscreen2CloseRequestId] = useState(0);
  const [backgroundConsoleOpacityPercent, setBackgroundConsoleOpacityPercent] = useState(82);
  const [backgroundConsoleCommandOpacityPercent, setBackgroundConsoleCommandOpacityPercent] = useState(
    CONSOLE2_INPUT_COMMAND_BACKGROUND_OPACITY_PERCENT,
  );
  const [backgroundConsoleTextOpacityPercent, setBackgroundConsoleTextOpacityPercent] = useState(18);
  const [shouldStartDebugConsoleCompact, setShouldStartDebugConsoleCompact] = useState(true);
  const [debugCommandHistory, setDebugCommandHistory] = useState<string[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(() => layoutHasPanel(corePanelLayout, "admin"));
  const [isJoinControlsHidden, setIsJoinControlsHidden] = useState(true);
  const [areEmptyCellsHidden, setAreEmptyCellsHidden] = useState(() => {
    try {
      const savedValue = window.localStorage.getItem(EMPTY_CELLS_HIDDEN_STORAGE_KEY);

      return savedValue === null ? true : savedValue !== "false";
    } catch {
      return true;
    }
  });
  const [isGlobePanelVisible, setIsGlobePanelVisible] = useState(() => layoutHasPanel(corePanelLayout, "globe"));
  const [isGlobePanelFullscreen, setIsGlobePanelFullscreen] = useState(false);
  const [maxVisibleEmptyPlayerSlots, setMaxVisibleEmptyPlayerSlots] = useState(() => {
    try {
      const savedValue = window.localStorage.getItem(MAX_VISIBLE_EMPTY_PLAYER_SLOTS_STORAGE_KEY);
      const parsedValue = savedValue ? Number(savedValue) : NaN;

      return Number.isFinite(parsedValue) ? Math.max(0, Math.floor(parsedValue)) : 4;
    } catch {
      return 4;
    }
  });
  const debugEventHandlerRef = useRef<((event: DebugConsoleEventInput) => void) | undefined>();
  const [isRenderingSpikeOpen, setIsRenderingSpikeOpen] = useState(hasRenderingSpikeParam);
  const [isThreeDModeOpen, setIsThreeDModeOpen] = useState(false);
  const [isGlobeVpnVisualEnabled, setIsGlobeVpnVisualEnabled] = useState(false);
  const [isSoundCloudPanelEnabled, setIsSoundCloudPanelEnabled] = useState(() => SOUNDCLOUD_PANEL_IDS.some((panelId) => layoutHasPanel(corePanelLayout, panelId)));
  const [soundCloudPanelMode, setSoundCloudPanelMode] = useState<SoundCloudPanelMode>(() => getInitialSoundCloudPanelMode(corePanelLayout));
  const [soundCloudWaveformBarCount, setSoundCloudWaveformBarCount] = useState(60);
  const { zoomPercent, panelOpacityPercent, setPanelOpacityPercent } = useAppViewportControls();
  const { isSecretUnlocked, resetSecretEntry, unlockCount, entryProgress, entryStepCount, lastMatchedLength, errorCount, errorProgress } =
    useSecretCodeUnlock();
  const [soundCloudCrossfader, setSoundCloudCrossfader] = useState(0);
  const [soundCloudMasterVolume, setSoundCloudMasterVolume] = useState(100);
  const [soundCloudDeckMuted, setSoundCloudDeckMuted] = useState<Record<SoundCloudDeckId, boolean>>({ A: false, B: false });
  const [soundCloudDeckSyncLabels, setSoundCloudDeckSyncLabels] = useState<Record<SoundCloudDeckId, string>>({ A: "SYNC", B: "SYNC" });
  const [soundCloudBoothConsoleEvents, setSoundCloudBoothConsoleEvents] = useState<SoundCloudBoothConsoleEvent[]>([]);
  const [textVoiceLog, setTextVoiceLog] = useState<TextVoiceLogEntry[]>([]);
  const [isStartupDebugPaused, setIsStartupDebugPaused] = useState(false);
  const [isStartupOverlayHidden, setIsStartupOverlayHidden] = useState(false);
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
  const handleTextVoiceEvent = useCallback((event: TextVoiceEvent) => {
    const result = speakDebugConsoleLine(event.text);

    setTextVoiceLog((current) => {
      if (current.some((entry) => entry.id === event.id)) {
        return current;
      }

      return [
        {
          ...event,
          receivedAt: new Date().toISOString(),
          replayCount: 0,
          replayAttributions: [],
        },
        ...current,
      ].slice(0, TEXT_VOICE_LOG_LIMIT);
    });

    handleDebugEvent({
      level: result.ok ? "info" : "warn",
      category: "command",
      label: result.ok ? "command:say:received" : "command:say:unavailable",
      detail: `${event.senderName}: ${result.detail}`,
    });
  }, [handleDebugEvent]);
  const handleTextVoiceReplayEvent = useCallback((event: TextVoiceReplayEvent) => {
    let didApplyReplay = false;

    setTextVoiceLog((current) => current.map((entry) => {
      if (entry.id !== event.textVoiceEventId || entry.replayAttributions.some((attribution) => attribution.id === event.id)) {
        return entry;
      }

      didApplyReplay = true;
      return {
        ...entry,
        replayAttributions: [
          event,
          ...entry.replayAttributions,
        ],
      };
    }));

    if (didApplyReplay) {
      handleDebugEvent({
        level: "info",
        category: "command",
        label: "command:say:replay:received",
        detail: `${event.replayerName} replayed text voice ${event.textVoiceEventId}.`,
      });
    }
  }, [handleDebugEvent]);
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
    sendTextVoice,
    sendTextVoiceReplay,
    setTimerDuration,
    setPrecountDuration,
    forceStartRound,
    forceStopRound,
    forceCompleteRound,
    setRoundNumber,
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
    onTextVoiceEvent: handleTextVoiceEvent,
    onTextVoiceReplayEvent: handleTextVoiceReplayEvent,
  });

  const applyConsole2ModePreset = useCallback((mode: Fullscreen2ConsoleMode) => {
    if (mode === "input") {
      setBackgroundConsoleOpacityPercent(CONSOLE2_FULL_BACKGROUND_OPACITY_PERCENT);
      setBackgroundConsoleCommandOpacityPercent(CONSOLE2_INPUT_COMMAND_BACKGROUND_OPACITY_PERCENT);
      setBackgroundConsoleTextOpacityPercent(CONSOLE2_FULL_TEXT_OPACITY_PERCENT);
      return;
    }

    if (mode === "compact") {
      setBackgroundConsoleOpacityPercent(CONSOLE2_COMPACT_BACKGROUND_OPACITY_PERCENT);
      setBackgroundConsoleCommandOpacityPercent(CONSOLE2_COMPACT_BACKGROUND_OPACITY_PERCENT);
      setBackgroundConsoleTextOpacityPercent(CONSOLE2_COMPACT_TEXT_OPACITY_PERCENT);
      return;
    }

    setBackgroundConsoleOpacityPercent(CONSOLE2_FULL_BACKGROUND_OPACITY_PERCENT);
    setBackgroundConsoleCommandOpacityPercent(CONSOLE2_FULL_BACKGROUND_OPACITY_PERCENT);
    setBackgroundConsoleTextOpacityPercent(CONSOLE2_FULL_TEXT_OPACITY_PERCENT);
  }, []);
  const openDebugConsole = useCallback((startMode: Fullscreen2ConsoleMode = "full") => {
    applyConsole2ModePreset(startMode);
    setFullscreen2CloseRequestId(0);
    setFullscreen2StartMode(startMode);
    setFullscreen2OpenRequestId((current) => current + 1);
    setDebugConsoleDisplayMode("fullscreen2");
    setIsDebugConsoleOpen(true);
  }, [applyConsole2ModePreset]);
  const closeDebugConsole2 = useCallback(() => {
    setFullscreen2CloseRequestId((current) => current + 1);
  }, []);
  const handleConsole2CloseAnimationEnd = useCallback(() => {
    setIsDebugConsoleOpen(false);
    setFullscreen2CloseRequestId(0);
  }, []);
  useDebugConsoleTrigger(openDebugConsole);
  useEffect(() => {
    const handleBackquoteConsoleHotkey = (event: KeyboardEvent) => {
      if (event.code !== "Backquote" || event.repeat || isEditableHotkeyTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (isDebugConsoleOpen && debugConsoleDisplayMode === "fullscreen2") {
        closeDebugConsole2();
        return;
      }

      openDebugConsole("input");
    };

    window.addEventListener("keydown", handleBackquoteConsoleHotkey);
    return () => window.removeEventListener("keydown", handleBackquoteConsoleHotkey);
  }, [closeDebugConsole2, debugConsoleDisplayMode, isDebugConsoleOpen, openDebugConsole]);
  const openLegacyDebugConsole = useCallback(() => {
    setShouldStartDebugConsoleCompact(false);
    setDebugConsoleDisplayMode("fullscreen");
    setIsDebugConsoleOpen(true);
  }, []);
  useDebugConsoleTrigger(openLegacyDebugConsole, "console1");
  const debugConsoleState = useDebugConsoleState({
    isOpen: isDebugConsoleOpen,
    sdkState,
    syncStatus: state.syncStatus,
    localProfile: state.localProfile,
  });
  const handleSubmitTextVoice = useCallback((text: string) => {
    const cleanText = text.trim();

    if (!cleanText || cleanText.length > TEXT_VOICE_MAX_LENGTH) {
      debugConsoleState.appendCommandOutput({
        level: "warn",
        label: "command:showt2v",
        detail: `Text voice must be 1-${TEXT_VOICE_MAX_LENGTH} characters.`,
      });
      return false;
    }

    sendTextVoice(cleanText);
    return true;
  }, [debugConsoleState, sendTextVoice]);

  const handleReplayTextVoice = useCallback((id: string) => {
    const entry = textVoiceLog.find((candidate) => candidate.id === id);

    if (!entry) {
      return;
    }

    const result = speakDebugConsoleLine(entry.text);

    sendTextVoiceReplay(id);
    debugConsoleState.appendCommandOutput({
      level: result.ok ? "info" : "warn",
      label: result.ok ? "command:say:replay" : "command:say:unavailable",
      detail: `${entry.senderName}: ${result.detail}`,
    });
  }, [debugConsoleState, sendTextVoiceReplay, textVoiceLog]);
  const hideStartupOverlay = useCallback(() => {
    if (isStartupOverlayHidden) {
      return;
    }

    setIsStartupOverlayHidden(true);
    debugConsoleState.appendLog({
      level: "warn",
      category: "ui",
      label: "startup:overlay:hidden",
      detail: "Startup overlay hidden by goaway command; startup work continues in the background.",
    });
  }, [debugConsoleState.appendLog, isStartupOverlayHidden]);
  useDebugConsoleTrigger(hideStartupOverlay, "goaway");
  const activateOfflineMode = useCallback(() => {
    enableOfflineMode();
    debugConsoleState.appendLog({
      level: "warn",
      category: "ui",
      label: "startup:offline:enabled",
      detail: "Offline mode enabled; reloading with Discord SDK and websocket sync disabled.",
    });
    window.setTimeout(() => window.location.reload(), 75);
  }, [debugConsoleState.appendLog]);
  useDebugConsoleTrigger(activateOfflineMode, "offline");
  useEffect(() => {
    if (!lobbyState.canUseAdminTools) {
      setIsAdminOpen(false);
      setCorePanelLayout((currentLayout) => {
        const nextLayout = removePanelFromLayout(currentLayout, "admin");

        if (nextLayout === currentLayout) {
          return currentLayout;
        }

        corePanelLayoutRef.current = nextLayout;
        try {
          window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
        } catch {
          // Layout persistence is best-effort; keep permission gating usable if storage is unavailable.
        }
        return nextLayout;
      });
    }
  }, [lobbyState.canUseAdminTools]);
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
    const submittedCommand = rawCommand.trim();
    setDebugCommandHistory((current) => {
      const withoutAdjacentDuplicate = current[current.length - 1] === submittedCommand ? current : [...current, submittedCommand];
      return withoutAdjacentDuplicate.slice(-DEBUG_CONSOLE_COMMAND_HISTORY_LIMIT);
    });
    debugConsoleState.appendCommandInput(rawCommand);

      if (normalizedCommand === "hide") {
        debugConsoleState.appendCommandOutput({
          level: "info",
          label: "command:hide",
          detail: "Closing debug console.",
        });
        setIsDebugConsoleOpen(false);
        setCorePanelLayout((currentLayout) => {
          if (!dockTreeHasPanel(currentLayout.dockRoot, "debug-console")) {
            return currentLayout;
          }

          const nextLayout = panelLayoutReducer(currentLayout, {
            type: "remove-docked-panel",
            panelId: "debug-console",
          });

          corePanelLayoutRef.current = nextLayout;
          try {
            window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
          } catch {
            // Layout persistence is best-effort; keep the command path usable if storage is unavailable.
          }
          return nextLayout;
        });
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

    if (submittedCommand.toLowerCase().startsWith(DEBUG_CONSOLE_SAY_COMMAND_PREFIX)) {
      const sayText = submittedCommand.slice(DEBUG_CONSOLE_SAY_COMMAND_PREFIX.length).trim();

      if (!sayText) {
        debugConsoleState.appendCommandOutput({
          level: "warn",
          label: "command:say",
          detail: "Use say-your message to speak a line.",
        });
        return;
      }

      sendTextVoice(sayText);

      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:say",
        detail: `Text voice queued: ${sayText}`,
      });
      return;
    }

    if (normalizedCommand === "small") {
      setIsSmallMode(true);
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:small",
        detail: "Small Mode enabled.",
      });
      return;
    }

    if (normalizedCommand === "normal") {
      setIsSmallMode(false);
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:normal",
        detail: "Small Mode disabled.",
      });
      return;
    }

    if (normalizedCommand === "resetlayout") {
      const defaultLayout = createDefaultPanelLayout();

      setDebugConsoleDropPreview(null);
      dockedPanelDragPointerIdRef.current = null;
      dockedPanelDragHeaderRef.current = null;
      dockedPanelDragPanelIdRef.current = null;
      dockedPanelDragStartPointRef.current = null;
      setDraggingDockedPanelId(null);
      setIsAdminOpen(false);
      setIsGlobePanelVisible(false);
      setIsGlobePanelFullscreen(false);
      setIsSoundCloudPanelEnabled(false);
      setSoundCloudPanelMode("radio");
      setIsSmallMode(false);
      setIsDebugConsoleOpen(false);
      setDebugConsoleDisplayMode("float");
      setFullscreen2CloseRequestId(0);
      setFullscreen2OpenRequestId(0);
      setFullscreen2StartMode("full");
      debugConsoleLastFloatingRectRef.current = DEBUG_CONSOLE_INITIAL_RECT;
      globeLastFloatingRectRef.current = GLOBE_PANEL_DEFINITION.defaultFloatingRect;
      adminLastFloatingRectRef.current = ADMIN_PANEL_DEFINITION.defaultFloatingRect;
      textVoiceLastFloatingRectRef.current = TEXT_VOICE_PANEL_DEFINITION.defaultFloatingRect;
      soundCloudLastFloatingRectRef.current = {
        "soundcloud-radio": getPanelDefinition("soundcloud-radio").defaultFloatingRect,
        "soundcloud-widget": getPanelDefinition("soundcloud-widget").defaultFloatingRect,
        "soundcloud-decks": getPanelDefinition("soundcloud-decks").defaultFloatingRect,
      };

      corePanelLayoutRef.current = defaultLayout;
      setCorePanelLayout(defaultLayout);

      try {
        window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(defaultLayout));
      } catch {
        // Layout reset still updates the live session if storage is unavailable.
      }

      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:resetlayout",
        detail: "All layout panels reset to the default Lobby/Timer workspace.",
      });
      return;
    }

    if (normalizedCommand === "admin") {
      if (!lobbyState.canUseAdminTools) {
        debugConsoleState.appendCommandOutput({
          level: "warn",
          label: "command:admin",
          detail: "Admin tools are unavailable for this user/session.",
        });
        return;
      }

      setIsAdminOpen(true);
      setCorePanelLayout((currentLayout) => {
        const nextLayout = restorePanelInLayout(currentLayout, "admin");

        if (nextLayout === currentLayout) {
          return currentLayout;
        }

        corePanelLayoutRef.current = nextLayout;
        try {
          window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
        } catch {
          // Layout persistence is best-effort; keep the command path usable if storage is unavailable.
        }
        return nextLayout;
      });
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:admin",
        detail: "Admin tools opened.",
      });
      return;
    }

    if (normalizedCommand === "hidejoin") {
      setIsJoinControlsHidden(true);
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:hidejoin",
        detail: "Lobby join controls hidden for this dashboard view.",
      });
      return;
    }

    if (normalizedCommand === "showjoin") {
      setIsJoinControlsHidden(false);
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:showjoin",
        detail: "Lobby join controls restored for this dashboard view.",
      });
      return;
    }

    if (normalizedCommand === "showglobe" || normalizedCommand === "show globe") {
      setIsGlobePanelVisible(true);
      setCorePanelLayout((currentLayout) => {
        const nextLayout = restorePanelInLayout(currentLayout, "globe");

        if (nextLayout === currentLayout) {
          return currentLayout;
        }

        corePanelLayoutRef.current = nextLayout;
        try {
          window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
        } catch {
          // Layout persistence is best-effort; keep the command path usable if storage is unavailable.
        }
        return nextLayout;
      });
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:showglobe",
        detail: "Dashboard globe panel enabled.",
      });
      return;
    }

    if (normalizedCommand === "hideglobe" || normalizedCommand === "hide globe") {
      setIsGlobePanelVisible(false);
      setIsGlobePanelFullscreen(false);
      setCorePanelLayout((currentLayout) => {
        const nextLayout = removePanelFromLayout(currentLayout, "globe");

        if (nextLayout === currentLayout) {
          return currentLayout;
        }

        corePanelLayoutRef.current = nextLayout;
        try {
          window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
        } catch {
          // Layout persistence is best-effort; keep the command path usable if storage is unavailable.
        }
        return nextLayout;
      });
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:hideglobe",
        detail: "Dashboard globe panel hidden.",
      });
      return;
    }

    if (normalizedCommand === "force start" || normalizedCommand === "forcestart") {
      if (!lobbyState.canUseAdminTools) {
        debugConsoleState.appendCommandOutput({
          level: "warn",
          label: "command:force-start",
          detail: "Force start is admin-only for the current session host.",
        });
        return;
      }

      forceStartRound();
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:force-start",
        detail: "Admin force start requested.",
      });
      return;
    }

    if (normalizedCommand === "force stop" || normalizedCommand === "forcestop") {
      if (!lobbyState.canUseAdminTools) {
        debugConsoleState.appendCommandOutput({
          level: "warn",
          label: "command:force-stop",
          detail: "Force stop is admin-only for the current session host.",
        });
        return;
      }

      forceStopRound();
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:force-stop",
        detail: "Admin force stop requested without incrementing the round number.",
      });
      return;
    }

    const setRoundMatch = normalizedCommand.match(DEBUG_CONSOLE_SET_ROUND_COMMAND_PATTERN);
    if (setRoundMatch) {
      if (!lobbyState.canUseAdminTools) {
        debugConsoleState.appendCommandOutput({
          level: "warn",
          label: "command:set-round",
          detail: "Set round is admin-only for the current session host.",
        });
        return;
      }

      const nextRoundNumber = Number(setRoundMatch[1]);
      if (!Number.isInteger(nextRoundNumber) || nextRoundNumber < 0 || nextRoundNumber > 999) {
        debugConsoleState.appendCommandOutput({
          level: "warn",
          label: "command:set-round",
          detail: "Use setround = 0-999 to set the round number.",
        });
        return;
      }

      setRoundNumber(nextRoundNumber);
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:set-round",
        detail: `Admin round number set to ${nextRoundNumber}.`,
      });
      return;
    }

      if (normalizedCommand === "float") {
        setIsDebugConsoleOpen(true);
        setDebugConsoleDisplayMode("float");
        setCorePanelLayout((currentLayout) => {
          if (!dockTreeHasPanel(currentLayout.dockRoot, "debug-console")) {
            return currentLayout;
          }

          const layoutWithFloating = panelLayoutReducer(currentLayout, {
            type: "undock-panel",
            panelId: "debug-console",
            rect: debugConsoleLastFloatingRectRef.current,
          });
          const nextLayout = panelLayoutReducer(layoutWithFloating, {
            type: "focus-floating-panel",
            panelId: "debug-console",
          });

          corePanelLayoutRef.current = nextLayout;
          try {
            window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
          } catch {
            // Layout persistence is best-effort; keep the command path usable if storage is unavailable.
          }
          return nextLayout;
        });
        debugConsoleState.appendCommandOutput({
          level: "info",
          label: "command:float",
        detail: "Debug console display mode set to floating window.",
      });
      return;
    }

    if (normalizedCommand === "console1") {
      setShouldStartDebugConsoleCompact(false);
      setDebugConsoleDisplayMode("fullscreen");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:console1",
        detail: "Debug console display mode set to legacy fullscreen console.",
      });
      return;
    }

    if (normalizedCommand === "console2") {
      openDebugConsole("full");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:console2",
        detail: "Debug console display mode set to background console.",
      });
      return;
    }

    if (normalizedCommand === "fullscreen") {
      setShouldStartDebugConsoleCompact(false);
      setDebugConsoleDisplayMode("fullscreen");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:fullscreen",
        detail: "Debug console display mode set to fullscreen.",
      });
      return;
    }

    if (normalizedCommand === "fullscreen2" || normalizedCommand === "background" || normalizedCommand.startsWith("background ")) {
      const requestedOpacity = normalizedCommand.startsWith("background ") ? Number(normalizedCommand.split(" ")[1]) : undefined;

      if (requestedOpacity !== undefined) {
        if (!Number.isFinite(requestedOpacity)) {
          debugConsoleState.appendCommandOutput({
            level: "warn",
            label: "command:background",
            detail: "Use background 0-100 to set the background console opacity.",
          });
          return;
        }

        const nextOpacityPercent = Math.max(0, Math.min(100, Math.round(requestedOpacity)));
        setBackgroundConsoleOpacityPercent(nextOpacityPercent);
        debugConsoleState.appendCommandOutput({
          level: "info",
          label: "command:background",
          detail: `Background console opacity set to ${nextOpacityPercent}%.`,
        });
        return;
      }

      openDebugConsole("full");
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: normalizedCommand === "fullscreen2" ? "command:fullscreen2" : "command:background",
        detail: "Debug console display mode set to background console.",
      });
      return;
    }

    if (normalizedCommand.startsWith("trans-text")) {
      const requestedOpacity = normalizedCommand === "trans-text" ? undefined : Number(normalizedCommand.split(" ")[1]);

      if (requestedOpacity === undefined || !Number.isFinite(requestedOpacity)) {
        debugConsoleState.appendCommandOutput({
          level: "warn",
          label: "command:trans-text",
          detail: "Use trans-text 0-100 to set the background console text opacity.",
        });
        return;
      }

      const nextOpacityPercent = Math.max(0, Math.min(100, Math.round(requestedOpacity)));
      setBackgroundConsoleTextOpacityPercent(nextOpacityPercent);
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:trans-text",
        detail: `Background console text opacity set to ${nextOpacityPercent}%.`,
      });
      return;
    }

    if (normalizedCommand === "compact") {
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:compact",
        detail: "Full-screen debug console compact mode toggled.",
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
      setCorePanelLayout((currentLayout) => {
        const nextLayout = restorePanelInLayout(removeSoundCloudPanelsFromLayout(currentLayout), "soundcloud-radio");

        corePanelLayoutRef.current = nextLayout;
        try {
          window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
        } catch {
          // Layout persistence is best-effort; keep the command path usable if storage is unavailable.
        }
        return nextLayout;
      });
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:radio",
        detail: "Radio panel enabled.",
      });
      return;
    }

    if (normalizedCommand === "showt2v") {
      setCorePanelLayout((currentLayout) => {
        const nextLayout = restorePanelInLayout(currentLayout, "text-voice");

        if (nextLayout === currentLayout) {
          return currentLayout;
        }

        corePanelLayoutRef.current = nextLayout;
        try {
          window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
        } catch {
          // Layout persistence is best-effort; keep the command path usable if storage is unavailable.
        }
        return nextLayout;
      });
      debugConsoleState.appendCommandOutput({
        level: "info",
        label: "command:showt2v",
        detail: "Text Voice panel opened.",
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
  }, [debugConsoleDisplayMode, debugConsoleState, forceStartRound, forceStopRound, lobbyState.canUseAdminTools, openDebugConsole, retryDiscordProfile, sendTextVoice, setRoundNumber]);
  const countdownDisplay = useCountdownDisplay(state);
  const { playCue, playSecretCodeStep } = useSoundEffects(state, lobbyState, countdownDisplay);
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

  const handleGlobePanelClose = useCallback(() => {
    setIsGlobePanelVisible(false);
    setIsGlobePanelFullscreen(false);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = removePanelFromLayout(currentLayout, "globe");

      if (nextLayout === currentLayout) {
        return currentLayout;
      }

      corePanelLayoutRef.current = nextLayout;
      try {
        window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
      } catch {
        // Layout persistence is best-effort; keep closing usable if storage is unavailable.
      }
      return nextLayout;
    });
  }, []);

  const handleAdminPanelClose = useCallback(() => {
    setIsAdminOpen(false);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = removePanelFromLayout(currentLayout, "admin");

      if (nextLayout === currentLayout) {
        return currentLayout;
      }

      corePanelLayoutRef.current = nextLayout;
      try {
        window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
      } catch {
        // Layout persistence is best-effort; keep closing usable if storage is unavailable.
      }
      return nextLayout;
    });
  }, []);

  const handleTextVoicePanelClose = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = removePanelFromLayout(currentLayout, "text-voice");

      if (nextLayout === currentLayout) {
        return currentLayout;
      }

      corePanelLayoutRef.current = nextLayout;
      try {
        window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(nextLayout));
      } catch {
        // Layout persistence is best-effort; keep closing usable if storage is unavailable.
      }
      return nextLayout;
    });
  }, []);

  const handleSetEmptyCellsHidden = useCallback((hidden: boolean) => {
    setAreEmptyCellsHidden(hidden);

    try {
      window.localStorage.setItem(EMPTY_CELLS_HIDDEN_STORAGE_KEY, String(hidden));
    } catch {
      // Persisting admin preference is optional; keep this feature working when storage is unavailable.
    }
  }, []);

  const handleSetMaxVisibleEmptyPlayerSlots = useCallback((slotCount: number) => {
    const nextCount = Number.isFinite(slotCount) ? Math.max(0, Math.floor(slotCount)) : 4;
    setMaxVisibleEmptyPlayerSlots(nextCount);

    try {
      window.localStorage.setItem(MAX_VISIBLE_EMPTY_PLAYER_SLOTS_STORAGE_KEY, String(nextCount));
    } catch {
      // Persisting admin preference is optional; keep this feature working when storage is unavailable.
    }
  }, []);

  const persistCorePanelLayout = useCallback((layout: PanelLayoutState = corePanelLayoutRef.current) => {
    try {
      window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, serializePanelLayout(layout));
    } catch {
      // Layout persistence is best-effort; keep floating panels usable if storage is unavailable.
    }
  }, []);

  const handleCorePanelSplitResize = useCallback((splitId: string, ratio: number, availableSize: number) => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "update-split-ratio",
        splitId,
        ratio,
        availableSize,
      });

      corePanelLayoutRef.current = nextLayout;
      return nextLayout;
    });
  }, []);

  const handleCorePanelSplitResizeEnd = useCallback(() => {
    persistCorePanelLayout();
  }, [persistCorePanelLayout]);

  const handlePanelEdgeCreateEmpty = useCallback(
    (panelId: PanelId, edge: DockEdge, ratio: number, availableSize: number, shouldPersist = true, parentLock?: { splitId: string; blockSize: number }) => {
      setCorePanelLayout((currentLayout) => {
        const nextLayout = panelLayoutReducer(currentLayout, {
          type: "create-empty-cell-from-panel-edge",
          panelId,
          edge,
          ratio,
          availableSize,
          parentSplitId: parentLock?.splitId,
          parentAvailableBlockSize: parentLock?.blockSize,
        });

        if (nextLayout === currentLayout) {
          return currentLayout;
        }

        corePanelLayoutRef.current = nextLayout;
        if (shouldPersist) {
          persistCorePanelLayout(nextLayout);
        }
        return nextLayout;
      });
    },
    [persistCorePanelLayout],
  );

  const debugConsoleFloatingPanel = corePanelLayout.floating.find((panel) => panel.panelId === "debug-console");
  const isDebugConsoleDocked = dockTreeHasPanel(corePanelLayout.dockRoot, "debug-console");
  const globeFloatingPanel = corePanelLayout.floating.find((panel) => panel.panelId === "globe");
  const adminFloatingPanel = corePanelLayout.floating.find((panel) => panel.panelId === "admin");
  const textVoiceFloatingPanel = corePanelLayout.floating.find((panel) => panel.panelId === "text-voice");
  const isGlobeDocked = dockTreeHasPanel(corePanelLayout.dockRoot, "globe");
  const isAdminDocked = dockTreeHasPanel(corePanelLayout.dockRoot, "admin");
  const isTextVoiceDocked = dockTreeHasPanel(corePanelLayout.dockRoot, "text-voice");
  const shouldShowFloatingDashboardPanels = !isSmallMode;

  const getPanelDropPreview = useCallback((draggedPanelId: PanelId, dragInfo: Pick<PanelShellDragInfo, "pointerX" | "pointerY">): PanelWorkspaceDropPreview | null => {
    const workspaceElement = panelWorkspaceRef.current;

    if (!workspaceElement) {
      return null;
    }

    const workspaceBounds = workspaceElement.getBoundingClientRect();

    if (dragInfo.pointerX < workspaceBounds.left || dragInfo.pointerX > workspaceBounds.right || dragInfo.pointerY < workspaceBounds.top || dragInfo.pointerY > workspaceBounds.bottom) {
      return null;
    }

    const emptyCells = Array.from(workspaceElement.querySelectorAll<HTMLElement>(".panel-workspace-empty[data-empty-cell-id]"));

    for (const emptyCell of emptyCells) {
      const emptyId = emptyCell.dataset.emptyCellId;

      if (!emptyId) {
        continue;
      }

      const bounds = emptyCell.getBoundingClientRect();

      if (dragInfo.pointerX >= bounds.left && dragInfo.pointerX <= bounds.right && dragInfo.pointerY >= bounds.top && dragInfo.pointerY <= bounds.bottom) {
        return { kind: "empty", emptyId };
      }
    }

    const leaves = Array.from(workspaceElement.querySelectorAll<HTMLElement>(".panel-workspace-leaf[data-panel-id]"));

    for (const leaf of leaves) {
      const panelId = leaf.dataset.panelId as PanelId | undefined;

      if (!panelId || panelId === draggedPanelId) {
        continue;
      }

      const placement = getDockPlacementFromPoint(leaf.getBoundingClientRect(), dragInfo.pointerX, dragInfo.pointerY);

      if (placement) {
        return { kind: "panel", panelId, placement };
      }
    }

    const workspacePlacement = getWorkspaceDockPlacementFromPoint(workspaceBounds, dragInfo.pointerX, dragInfo.pointerY);

    return workspacePlacement ? { kind: "workspace", placement: workspacePlacement } : null;
  }, []);

  const handleDebugConsoleFloatingRectChange = useCallback((rect: PanelRect) => {
    debugConsoleLastFloatingRectRef.current = rect;

    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "update-floating-rect",
        panelId: "debug-console",
        rect,
      });

      corePanelLayoutRef.current = nextLayout;
      return nextLayout;
    });
  }, []);

  const handleGlobeFloatingRectChange = useCallback((rect: PanelRect) => {
    globeLastFloatingRectRef.current = rect;

    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "update-floating-rect",
        panelId: "globe",
        rect,
      });

      corePanelLayoutRef.current = nextLayout;
      return nextLayout;
    });
  }, []);

  const handleAdminFloatingRectChange = useCallback((rect: PanelRect) => {
    adminLastFloatingRectRef.current = rect;

    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "update-floating-rect",
        panelId: "admin",
        rect,
      });

      corePanelLayoutRef.current = nextLayout;
      return nextLayout;
    });
  }, []);

  const handleTextVoiceFloatingRectChange = useCallback((rect: PanelRect) => {
    textVoiceLastFloatingRectRef.current = rect;

    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "update-floating-rect",
        panelId: "text-voice",
        rect,
      });

      corePanelLayoutRef.current = nextLayout;
      return nextLayout;
    });
  }, []);

  const handleGlobeDock = useCallback(() => {
    setIsGlobePanelVisible(true);
    setCorePanelLayout((currentLayout) => {
      globeLastFloatingRectRef.current = currentLayout.floating.find((panel) => panel.panelId === "globe")?.rect ?? globeLastFloatingRectRef.current;
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "dock-panel",
        panelId: "globe",
        placement: "bottom",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleAdminDock = useCallback(() => {
    if (!lobbyState.canUseAdminTools) {
      return;
    }

    setIsAdminOpen(true);
    setCorePanelLayout((currentLayout) => {
      adminLastFloatingRectRef.current = currentLayout.floating.find((panel) => panel.panelId === "admin")?.rect ?? adminLastFloatingRectRef.current;
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "dock-panel",
        panelId: "admin",
        placement: "bottom",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [lobbyState.canUseAdminTools, persistCorePanelLayout]);

  const handleTextVoiceDock = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      textVoiceLastFloatingRectRef.current = currentLayout.floating.find((panel) => panel.panelId === "text-voice")?.rect ?? textVoiceLastFloatingRectRef.current;
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "dock-panel",
        panelId: "text-voice",
        placement: "bottom",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleGlobeFloat = useCallback(() => {
    setIsGlobePanelVisible(true);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, "globe", globeLastFloatingRectRef.current);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleAdminFloat = useCallback(() => {
    if (!lobbyState.canUseAdminTools) {
      return;
    }

    setIsAdminOpen(true);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, "admin", adminLastFloatingRectRef.current);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [lobbyState.canUseAdminTools, persistCorePanelLayout]);

  const handleTextVoiceFloat = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, "text-voice", textVoiceLastFloatingRectRef.current);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleGlobeReset = useCallback(() => {
    globeLastFloatingRectRef.current = GLOBE_PANEL_DEFINITION.defaultFloatingRect;
    setIsGlobePanelVisible(true);
    setIsGlobePanelFullscreen(false);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, "globe", GLOBE_PANEL_DEFINITION.defaultFloatingRect);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleAdminReset = useCallback(() => {
    if (!lobbyState.canUseAdminTools) {
      return;
    }

    adminLastFloatingRectRef.current = ADMIN_PANEL_DEFINITION.defaultFloatingRect;
    setIsAdminOpen(true);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, "admin", ADMIN_PANEL_DEFINITION.defaultFloatingRect);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [lobbyState.canUseAdminTools, persistCorePanelLayout]);

  const handleTextVoiceReset = useCallback(() => {
    textVoiceLastFloatingRectRef.current = TEXT_VOICE_PANEL_DEFINITION.defaultFloatingRect;
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, "text-voice", TEXT_VOICE_PANEL_DEFINITION.defaultFloatingRect);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleGlobeFloatingFocus = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "focus-floating-panel",
        panelId: "globe",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleAdminFloatingFocus = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "focus-floating-panel",
        panelId: "admin",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleTextVoiceFloatingFocus = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "focus-floating-panel",
        panelId: "text-voice",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const activeSoundCloudPanelId = getSoundCloudPanelId(soundCloudPanelMode);
  const activeSoundCloudPanelDefinition = getPanelDefinition(activeSoundCloudPanelId);
  const activeSoundCloudFloatingPanel = corePanelLayout.floating.find((panel) => panel.panelId === activeSoundCloudPanelId);
  const isActiveSoundCloudDocked = dockTreeHasPanel(corePanelLayout.dockRoot, activeSoundCloudPanelId);

  const handleSoundCloudPanelModeChange = useCallback(
    (nextMode: SoundCloudPanelMode) => {
      const nextPanelId = getSoundCloudPanelId(nextMode);

      setSoundCloudPanelMode(nextMode);
      setIsSoundCloudPanelEnabled(true);
      setCorePanelLayout((currentLayout) => {
        const nextLayout = restorePanelInLayout(removeSoundCloudPanelsFromLayout(currentLayout), nextPanelId);

        corePanelLayoutRef.current = nextLayout;
        persistCorePanelLayout(nextLayout);
        return nextLayout;
      });
    },
    [persistCorePanelLayout],
  );

  const handleSoundCloudPanelClose = useCallback(() => {
    setIsSoundCloudPanelEnabled(false);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = removeSoundCloudPanelsFromLayout(currentLayout);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleSoundCloudFloatingRectChange = useCallback(
    (rect: PanelRect) => {
      soundCloudLastFloatingRectRef.current[activeSoundCloudPanelId] = rect;

      setCorePanelLayout((currentLayout) => {
        const nextLayout = panelLayoutReducer(currentLayout, {
          type: "update-floating-rect",
          panelId: activeSoundCloudPanelId,
          rect,
        });

        corePanelLayoutRef.current = nextLayout;
        return nextLayout;
      });
    },
    [activeSoundCloudPanelId],
  );

  const handleSoundCloudDock = useCallback(() => {
    setIsSoundCloudPanelEnabled(true);
    setCorePanelLayout((currentLayout) => {
      soundCloudLastFloatingRectRef.current[activeSoundCloudPanelId] =
        currentLayout.floating.find((panel) => panel.panelId === activeSoundCloudPanelId)?.rect ?? soundCloudLastFloatingRectRef.current[activeSoundCloudPanelId];
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "dock-panel",
        panelId: activeSoundCloudPanelId,
        placement: "bottom",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [activeSoundCloudPanelId, persistCorePanelLayout]);

  const handleSoundCloudFloat = useCallback(() => {
    setIsSoundCloudPanelEnabled(true);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, activeSoundCloudPanelId, soundCloudLastFloatingRectRef.current[activeSoundCloudPanelId]);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [activeSoundCloudPanelId, persistCorePanelLayout]);

  const handleSoundCloudReset = useCallback(() => {
    const defaultRect = activeSoundCloudPanelDefinition.defaultFloatingRect;
    soundCloudLastFloatingRectRef.current[activeSoundCloudPanelId] = defaultRect;
    setIsSoundCloudPanelEnabled(true);
    setCorePanelLayout((currentLayout) => {
      const nextLayout = floatPanelInLayout(currentLayout, activeSoundCloudPanelId, defaultRect);

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [activeSoundCloudPanelDefinition.defaultFloatingRect, activeSoundCloudPanelId, persistCorePanelLayout]);

  const handleSoundCloudFloatingFocus = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "focus-floating-panel",
        panelId: activeSoundCloudPanelId,
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [activeSoundCloudPanelId, persistCorePanelLayout]);

  const getLastFloatingRectForPanel = useCallback(
    (panelId: PanelId): PanelRect => {
      if (panelId === "debug-console") {
        return debugConsoleLastFloatingRectRef.current;
      }

      if (panelId === "globe") {
        return globeLastFloatingRectRef.current;
      }

      if (panelId === "admin") {
        return adminLastFloatingRectRef.current;
      }

      if (panelId === "text-voice") {
        return textVoiceLastFloatingRectRef.current;
      }

      if (isSoundCloudPanelId(panelId)) {
        return soundCloudLastFloatingRectRef.current[panelId];
      }

      return getPanelDefinition(panelId).defaultFloatingRect;
    },
    [],
  );

  const setLastFloatingRectForPanel = useCallback((panelId: PanelId, rect: PanelRect) => {
    if (panelId === "debug-console") {
      debugConsoleLastFloatingRectRef.current = rect;
      return;
    }

    if (panelId === "globe") {
      globeLastFloatingRectRef.current = rect;
      return;
    }

    if (panelId === "admin") {
      adminLastFloatingRectRef.current = rect;
      return;
    }

    if (panelId === "text-voice") {
      textVoiceLastFloatingRectRef.current = rect;
      return;
    }

    if (isSoundCloudPanelId(panelId)) {
      soundCloudLastFloatingRectRef.current[panelId] = rect;
    }
  }, []);

  const ensurePanelVisibleForDockedDrag = useCallback((panelId: PanelId) => {
    if (panelId === "debug-console") {
      setIsDebugConsoleOpen(true);
      setDebugConsoleDisplayMode("float");
      return;
    }

    if (panelId === "globe") {
      setIsGlobePanelVisible(true);
      return;
    }

    if (panelId === "admin") {
      setIsAdminOpen(true);
      return;
    }

    if (panelId === "text-voice") {
      return;
    }

    if (isSoundCloudPanelId(panelId)) {
      setSoundCloudPanelMode(getSoundCloudModeForPanelId(panelId));
      setIsSoundCloudPanelEnabled(true);
    }
  }, []);

  const handleDockedPanelDragMove = useCallback(
    (panelId: PanelId, dragInfo: Pick<PanelShellDragInfo, "pointerX" | "pointerY">) => {
      if (dockedPanelDragStartPointRef.current?.panelId !== panelId) {
        dockedPanelDragStartPointRef.current = { panelId, pointerX: dragInfo.pointerX, pointerY: dragInfo.pointerY };
      }

      setDebugConsoleDropPreview(getPanelDropPreview(panelId, dragInfo));
    },
    [getPanelDropPreview],
  );

  const handleDockedPanelDragEnd = useCallback(
    (panelId: PanelId, dragInfo: Pick<PanelShellDragInfo, "pointerX" | "pointerY">) => {
      const dropPreview = getPanelDropPreview(panelId, dragInfo);
      const startPoint = dockedPanelDragStartPointRef.current;
      const hasMovedPastClickThreshold =
        !startPoint || startPoint.panelId !== panelId || Math.hypot(dragInfo.pointerX - startPoint.pointerX, dragInfo.pointerY - startPoint.pointerY) >= 6;

      dockedPanelDragStartPointRef.current = null;
      const currentFloatingRect = getLastFloatingRectForPanel(panelId);
      const dragFloatingRect = {
        ...currentFloatingRect,
        x: Math.max(0, dragInfo.pointerX - currentFloatingRect.width / 2),
        y: Math.max(0, dragInfo.pointerY - 32),
      };

      setDebugConsoleDropPreview(null);

      if (!hasMovedPastClickThreshold) {
        return;
      }

      ensurePanelVisibleForDockedDrag(panelId);

      if (!dropPreview) {
        setLastFloatingRectForPanel(panelId, dragFloatingRect);
        setCorePanelLayout((currentLayout) => {
          const nextLayout = panelLayoutReducer(currentLayout, {
            type: "float-docked-panel-preserve-cell",
            panelId,
            rect: dragFloatingRect,
            emptyCellId: `${panelId}-drag-origin`,
          });

          corePanelLayoutRef.current = nextLayout;
          persistCorePanelLayout(nextLayout);
          return nextLayout;
        });
        return;
      }

      setCorePanelLayout((currentLayout) => {
        const layoutWithEmptyOrigin = panelLayoutReducer(currentLayout, {
          type: "float-docked-panel-preserve-cell",
          panelId,
          rect: dragFloatingRect,
          emptyCellId: `${panelId}-drag-origin`,
        });
        const nextLayout =
          dropPreview.kind === "empty"
            ? panelLayoutReducer(layoutWithEmptyOrigin, {
                type: "dock-panel-in-empty-cell",
                panelId,
                emptyCellId: dropPreview.emptyId,
              })
            : panelLayoutReducer(layoutWithEmptyOrigin, {
                type: "dock-panel",
                panelId,
                placement: dropPreview.placement,
                ...(dropPreview.kind === "panel" ? { targetPanelId: dropPreview.panelId } : {}),
              });

        corePanelLayoutRef.current = nextLayout;
        persistCorePanelLayout(nextLayout);
        return nextLayout;
      });
    },
    [ensurePanelVisibleForDockedDrag, getLastFloatingRectForPanel, getPanelDropPreview, persistCorePanelLayout, setLastFloatingRectForPanel],
  );

  const handleWorkspaceManagedHeaderPointerDown = useCallback(
    (panelId: PanelId, event: ReactPointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dockedPanelDragPointerIdRef.current = event.pointerId;
      dockedPanelDragHeaderRef.current = event.currentTarget;
      dockedPanelDragPanelIdRef.current = panelId;
      dockedPanelDragStartPointRef.current = { panelId, pointerX: event.clientX, pointerY: event.clientY };
      setDraggingDockedPanelId(panelId);
      handleDockedPanelDragMove(panelId, { pointerX: event.clientX, pointerY: event.clientY });
    },
    [handleDockedPanelDragMove],
  );

  const handleWorkspaceManagedHeaderPointerMove = useCallback(
    (panelId: PanelId, event: ReactPointerEvent<HTMLElement>) => {
      if (dockedPanelDragPointerIdRef.current !== event.pointerId || dockedPanelDragPanelIdRef.current !== panelId) {
        return;
      }

      handleDockedPanelDragMove(panelId, { pointerX: event.clientX, pointerY: event.clientY });
    },
    [handleDockedPanelDragMove],
  );

  const handleWorkspaceManagedHeaderPointerUp = useCallback(
    (panelId: PanelId, event: ReactPointerEvent<HTMLElement>) => {
      if (dockedPanelDragPointerIdRef.current !== event.pointerId || dockedPanelDragPanelIdRef.current !== panelId) {
        return;
      }

      dockedPanelDragPointerIdRef.current = null;
      dockedPanelDragHeaderRef.current = null;
      dockedPanelDragPanelIdRef.current = null;
      setDraggingDockedPanelId(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      handleDockedPanelDragEnd(panelId, { pointerX: event.clientX, pointerY: event.clientY });
    },
    [handleDockedPanelDragEnd],
  );

  useEffect(() => {
    if (!draggingDockedPanelId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      const pointerId = dockedPanelDragPointerIdRef.current;
      const capturedHeader = dockedPanelDragHeaderRef.current;

      if (pointerId !== null && capturedHeader?.hasPointerCapture(pointerId)) {
        capturedHeader.releasePointerCapture(pointerId);
      }

      dockedPanelDragPointerIdRef.current = null;
      dockedPanelDragHeaderRef.current = null;
      dockedPanelDragPanelIdRef.current = null;
      dockedPanelDragStartPointRef.current = null;
      setDraggingDockedPanelId(null);
      setDebugConsoleDropPreview(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draggingDockedPanelId]);

  const handleDebugConsoleDock = useCallback(() => {
    setDebugConsoleDropPreview(null);
    setIsDebugConsoleOpen(true);
    setDebugConsoleDisplayMode("float");

    setCorePanelLayout((currentLayout) => {
      const currentFloatingPanel = currentLayout.floating.find((panel) => panel.panelId === "debug-console");
      debugConsoleLastFloatingRectRef.current = currentFloatingPanel?.rect ?? debugConsoleLastFloatingRectRef.current;
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "dock-panel",
        panelId: "debug-console",
        placement: "bottom",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleDebugConsoleFloat = useCallback(() => {
    setDebugConsoleDropPreview(null);
    setIsDebugConsoleOpen(true);
    setDebugConsoleDisplayMode("float");

    setCorePanelLayout((currentLayout) => {
      const nextRect = debugConsoleLastFloatingRectRef.current;
      const undockedLayout = panelLayoutReducer(currentLayout, {
        type: "undock-panel",
        panelId: "debug-console",
        rect: nextRect,
      });
      const layoutWithFloatingRect =
        undockedLayout === currentLayout
          ? panelLayoutReducer(currentLayout, {
              type: "update-floating-rect",
              panelId: "debug-console",
              rect: nextRect,
            })
          : undockedLayout;
      const nextLayout = panelLayoutReducer(layoutWithFloatingRect, {
        type: "focus-floating-panel",
        panelId: "debug-console",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleDebugConsoleReset = useCallback(() => {
    setDebugConsoleDropPreview(null);
    debugConsoleLastFloatingRectRef.current = DEBUG_CONSOLE_INITIAL_RECT;
    setIsDebugConsoleOpen(true);
    setDebugConsoleDisplayMode("float");

    setCorePanelLayout((currentLayout) => {
      const undockedLayout = panelLayoutReducer(currentLayout, {
        type: "undock-panel",
        panelId: "debug-console",
        rect: DEBUG_CONSOLE_INITIAL_RECT,
      });
      const layoutWithDefaultRect =
        undockedLayout === currentLayout
          ? panelLayoutReducer(currentLayout, {
              type: "update-floating-rect",
              panelId: "debug-console",
              rect: DEBUG_CONSOLE_INITIAL_RECT,
            })
          : panelLayoutReducer(undockedLayout, {
              type: "update-floating-rect",
              panelId: "debug-console",
              rect: DEBUG_CONSOLE_INITIAL_RECT,
            });
      const nextLayout = panelLayoutReducer(layoutWithDefaultRect, {
        type: "focus-floating-panel",
        panelId: "debug-console",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleDebugConsoleDockedClose = useCallback(() => {
    setDebugConsoleDropPreview(null);
    setIsDebugConsoleOpen(false);

    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "remove-docked-panel",
        panelId: "debug-console",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  const handleDebugConsoleFloatingInteractionEnd = useCallback(() => {
    persistCorePanelLayout();
  }, [persistCorePanelLayout]);

  const handleDebugConsoleFloatingDragMove = useCallback(
    (dragInfo: PanelShellDragInfo) => {
      setDebugConsoleDropPreview(getPanelDropPreview("debug-console", dragInfo));
    },
    [getPanelDropPreview],
  );

  const handleDebugConsoleFloatingDragEnd = useCallback(
    (dragInfo: PanelShellDragInfo) => {
      const dropPreview = getPanelDropPreview("debug-console", dragInfo);
      setDebugConsoleDropPreview(null);

      if (!dropPreview) {
        return;
      }

      setIsDebugConsoleOpen(true);
      setDebugConsoleDisplayMode("float");
      setCorePanelLayout((currentLayout) => {
        debugConsoleLastFloatingRectRef.current = currentLayout.floating.find((panel) => panel.panelId === "debug-console")?.rect ?? dragInfo.rect;
        const nextLayout =
          dropPreview.kind === "empty"
            ? panelLayoutReducer(currentLayout, {
                type: "dock-panel-in-empty-cell",
                panelId: "debug-console",
                emptyCellId: dropPreview.emptyId,
              })
            : panelLayoutReducer(currentLayout, {
                type: "dock-panel",
                panelId: "debug-console",
                placement: dropPreview.placement,
                ...(dropPreview.kind === "panel" ? { targetPanelId: dropPreview.panelId } : {}),
              });

        corePanelLayoutRef.current = nextLayout;
        persistCorePanelLayout(nextLayout);
        return nextLayout;
      });
    },
    [getPanelDropPreview, persistCorePanelLayout],
  );

  const handleDebugConsoleDockedDragMove = useCallback(
    (dragInfo: DebugConsoleDockedDragInfo) => {
      handleDockedPanelDragMove("debug-console", dragInfo);
    },
    [handleDockedPanelDragMove],
  );

  const handleDebugConsoleDockedDragEnd = useCallback(
    (dragInfo: DebugConsoleDockedDragInfo) => {
      handleDockedPanelDragEnd("debug-console", dragInfo);
    },
    [handleDockedPanelDragEnd],
  );

  const handleDebugConsoleDockedDragCancel = useCallback(() => {
    setDebugConsoleDropPreview(null);
  }, []);

  const handleDebugConsoleFloatingFocus = useCallback(() => {
    setCorePanelLayout((currentLayout) => {
      const nextLayout = panelLayoutReducer(currentLayout, {
        type: "focus-floating-panel",
        panelId: "debug-console",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [persistCorePanelLayout]);

  useEffect(() => {
    if (!isDebugConsoleOpen || debugConsoleDisplayMode !== "float" || debugConsoleFloatingPanel || isDebugConsoleDocked) {
      return;
    }

    setCorePanelLayout((currentLayout) => {
      if (currentLayout.floating.some((panel) => panel.panelId === "debug-console")) {
        return currentLayout;
      }

      const layoutWithRect = panelLayoutReducer(currentLayout, {
        type: "update-floating-rect",
        panelId: "debug-console",
        rect: DEBUG_CONSOLE_INITIAL_RECT,
      });
      const nextLayout = panelLayoutReducer(layoutWithRect, {
        type: "focus-floating-panel",
        panelId: "debug-console",
      });

      corePanelLayoutRef.current = nextLayout;
      persistCorePanelLayout(nextLayout);
      return nextLayout;
    });
  }, [debugConsoleDisplayMode, debugConsoleFloatingPanel, isDebugConsoleDocked, isDebugConsoleOpen, persistCorePanelLayout]);

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
  const isReadyHoldSyncReady = state.syncStatus.mode === "mock" || state.syncStatus.connection === "connected";
  const canWatchReadyHold = lobbyState.canHoldToReady && isReadyHoldSyncReady;
  const watchReadyHoldStatus = !isReadyHoldSyncReady
    ? "SYNC OFFLINE"
    : !lobbyState.isJoined
      ? "JOIN SESSION"
      : lobbyState.isLocalUserSpectating
        ? "SPECTATING"
        : !lobbyState.canHoldToReady
          ? "WAITING"
          : "HOLD SPACE TO READY";
  const handleThreeDWatchStartReadyHold = () => {
    if (!isThreeDModeOpen || !lobbyState.canHoldToReady || !isReadyHoldSyncReady) {
      return;
    }

    playCue("ui_ready_hold_start");
    startReadyHold();
  };
  const handleThreeDWatchEndReadyHold = () => {
    if (!lobbyState.releaseStartsCountdown) {
      playCue("ui_ready_release_cancel");
    }

    endReadyHold();
  };
  const shouldMountDeckWorkspace = (isSoundCloudPanelEnabled && soundCloudPanelMode === "decks") || isThreeDModeOpen;
  const soundCloudDiagnosticPanelMode = isSoundCloudPanelEnabled ? soundCloudPanelMode : "hidden";
  const adminSoundCloudPlayer = soundCloudPanelMode === "decks" ? soundCloudDeckA : frontEndSoundCloudPlayer;
  const renderSoundCloudDeckPanel = (isVisible = true) => (
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
      onChangeMode={handleSoundCloudPanelModeChange}
      isVisible={isVisible}
    />
  );
  const renderActiveSoundCloudPanel = (isVisible = true) => {
    if (soundCloudPanelMode === "radio") {
      return <SoundCloudPanel player={frontEndSoundCloudPlayer} mode={soundCloudPanelMode} onChangeMode={handleSoundCloudPanelModeChange} />;
    }

    if (soundCloudPanelMode === "widget") {
      return <SoundCloudWidgetPanel player={frontEndSoundCloudPlayer} mode={soundCloudPanelMode} onChangeMode={handleSoundCloudPanelModeChange} />;
    }

    return renderSoundCloudDeckPanel(isVisible);
  };
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
  const shouldRenderLoadingScreen = shouldShowLoadingScreen && !isStartupOverlayHidden;
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
        {!isGlobePanelFullscreen ? (
          <video className="app-background-video" autoPlay muted loop playsInline preload="auto">
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        ) : null}
        <div className="app-background-stage-tint" />
        <div className="app-background-stage-focus" />
        <div className="app-background-stage-grid" />
        <div className="app-background-stage-atmosphere" />
      </div>

      {shouldRenderLoadingScreen ? (
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
        data-small-mode={isSmallMode ? "true" : undefined}
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
          isSmallMode={isSmallMode}
          countdownDisplay={countdownDisplay}
          onToggleSmallMode={() => setIsSmallMode((current) => !current)}
        />

        {!isSmallMode && state.syncStatus.connection === "connecting" ? (
          <div className="panel sync-banner">
            <strong>Sync warming up.</strong> Waiting for the timing link before enabling shared controls.
          </div>
        ) : null}

        {!isSmallMode && (state.syncStatus.connection === "offline" || state.syncStatus.connection === "error") ? (
          <div className="panel sync-banner sync-banner-alert">
            <strong>Sync unavailable.</strong> {state.syncStatus.warning ?? "Reconnect the sync layer to resume shared timing."}
          </div>
        ) : null}

        {!isSmallMode && sdkState.enabled && (sdkState.authError || sdkState.identitySource === "local_fallback" || sdkState.identitySource === "participant_discord") ? (
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

        {!isSmallMode && !sdkState.enabled && sdkState.startupError ? (
          <div className="panel sync-banner sync-banner-alert discord-identity-banner">
            <strong>Discord SDK startup failed.</strong> {sdkState.startupError}
          </div>
        ) : null}

        {!isSmallMode ? (
        <PanelWorkspace
            dockRoot={corePanelLayout.dockRoot}
            workspaceRef={panelWorkspaceRef}
            dropPreview={debugConsoleDropPreview}
            onSplitResize={handleCorePanelSplitResize}
            onSplitResizeEnd={handleCorePanelSplitResizeEnd}
            onPanelEdgeCreateEmpty={handlePanelEdgeCreateEmpty}
            hideEmptyCells={areEmptyCellsHidden}
            zoomScale={zoomPercent / 100}
            renderPanel={(panelId) => {
              switch (panelId) {
                case "lobby":
                  return (
                    <LobbyPanel
                      session={state.session}
                      users={state.users}
                      lobbyState={lobbyState}
                      generatedDisplayNames={generatedDisplayNames}
                      discordDisplayName={discordDisplayName}
                      maxVisibleEmptyPlayerSlots={maxVisibleEmptyPlayerSlots}
                      isJoinControlsHidden={isJoinControlsHidden}
                      onJoinSession={handleJoinSession}
                      onRollDisplayName={rollDisplayName}
                      onSelectDisplayName={selectDisplayName}
                      onUseDiscordDisplayName={useDiscordDisplayName}
                    />
                  );
                case "timer":
                  return (
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
                  );
                case "globe":
                  return isGlobePanelVisible ? (
                    <section className="workspace-managed-panel" aria-label={GLOBE_PANEL_DEFINITION.title} data-dragging={draggingDockedPanelId === "globe" ? "true" : undefined}>
                      <header
                        className="workspace-managed-panel-header"
                        tabIndex={0}
                        aria-label="Drag Globe docked panel"
                        onPointerDown={(event) => handleWorkspaceManagedHeaderPointerDown("globe", event)}
                        onPointerMove={(event) => handleWorkspaceManagedHeaderPointerMove("globe", event)}
                        onPointerUp={(event) => handleWorkspaceManagedHeaderPointerUp("globe", event)}
                        onPointerCancel={(event) => handleWorkspaceManagedHeaderPointerUp("globe", event)}
                      >
                        <strong>{GLOBE_PANEL_DEFINITION.title}</strong>
                        <div className="workspace-managed-panel-actions" onPointerDown={(event) => event.stopPropagation()}>
                          <button type="button" aria-label="Float Globe panel" onClick={handleGlobeFloat}>
                            Float
                          </button>
                          <button type="button" aria-label="Close Globe panel" onClick={handleGlobePanelClose}>
                            Close
                          </button>
                          <button type="button" aria-label="Reset Globe panel position" onClick={handleGlobeReset}>
                            Reset
                          </button>
                        </div>
                      </header>
                      <div className="workspace-managed-panel-body">
                        <GlobePanel
                          session={state.session}
                          users={state.users}
                          localUserId={lobbyState.localUser?.id}
                          vpnVisualEnabled={isGlobeVpnVisualEnabled}
                          onToggleVpnVisual={() => setIsGlobeVpnVisualEnabled((current) => !current)}
                          onFullscreenChange={setIsGlobePanelFullscreen}
                          onClose={handleGlobePanelClose}
                        />
                      </div>
                    </section>
                  ) : null;
                case "admin":
                  return isAdminOpen && lobbyState.canUseAdminTools ? (
                    <section className="workspace-managed-panel" aria-label={ADMIN_PANEL_DEFINITION.title} data-dragging={draggingDockedPanelId === "admin" ? "true" : undefined}>
                      <header
                        className="workspace-managed-panel-header"
                        tabIndex={0}
                        aria-label="Drag Admin panel docked panel"
                        onPointerDown={(event) => handleWorkspaceManagedHeaderPointerDown("admin", event)}
                        onPointerMove={(event) => handleWorkspaceManagedHeaderPointerMove("admin", event)}
                        onPointerUp={(event) => handleWorkspaceManagedHeaderPointerUp("admin", event)}
                        onPointerCancel={(event) => handleWorkspaceManagedHeaderPointerUp("admin", event)}
                      >
                        <strong>{ADMIN_PANEL_DEFINITION.title}</strong>
                        <div className="workspace-managed-panel-actions" onPointerDown={(event) => event.stopPropagation()}>
                          <button type="button" aria-label="Float Admin panel" onClick={handleAdminFloat}>
                            Float
                          </button>
                          <button type="button" aria-label="Close Admin panel" onClick={handleAdminPanelClose}>
                            Close
                          </button>
                          <button type="button" aria-label="Reset Admin panel position" onClick={handleAdminReset}>
                            Reset
                          </button>
                        </div>
                      </header>
                      <div className="workspace-managed-panel-body">
                        <AdminPanel
                          state={state}
                          lobbyState={lobbyState}
                          isOpen={isAdminOpen}
                          areEmptyCellsHidden={areEmptyCellsHidden}
                          maxVisibleEmptyPlayerSlots={maxVisibleEmptyPlayerSlots}
                          waveformBarCount={soundCloudWaveformBarCount}
                          soundCloudPlayer={adminSoundCloudPlayer}
                          onClose={handleAdminPanelClose}
                          onSetWaveformBarCount={setSoundCloudWaveformBarCount}
                          onSetEmptyCellsHidden={handleSetEmptyCellsHidden}
                          onSetMaxVisibleEmptyPlayerSlots={handleSetMaxVisibleEmptyPlayerSlots}
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
                      </div>
                    </section>
                  ) : null;
                case "text-voice":
                  return (
                    <section className="workspace-managed-panel" aria-label={TEXT_VOICE_PANEL_DEFINITION.title} data-dragging={draggingDockedPanelId === "text-voice" ? "true" : undefined}>
                      <header
                        className="workspace-managed-panel-header"
                        tabIndex={0}
                        aria-label="Drag Text Voice docked panel"
                        onPointerDown={(event) => handleWorkspaceManagedHeaderPointerDown("text-voice", event)}
                        onPointerMove={(event) => handleWorkspaceManagedHeaderPointerMove("text-voice", event)}
                        onPointerUp={(event) => handleWorkspaceManagedHeaderPointerUp("text-voice", event)}
                        onPointerCancel={(event) => handleWorkspaceManagedHeaderPointerUp("text-voice", event)}
                      >
                        <strong>{TEXT_VOICE_PANEL_DEFINITION.title}</strong>
                        <div className="workspace-managed-panel-actions" onPointerDown={(event) => event.stopPropagation()}>
                          <button type="button" aria-label="Float Text Voice panel" onClick={handleTextVoiceFloat}>
                            Float
                          </button>
                          <button type="button" aria-label="Close Text Voice panel" onClick={handleTextVoicePanelClose}>
                            Close
                          </button>
                          <button type="button" aria-label="Reset Text Voice panel position" onClick={handleTextVoiceReset}>
                            Reset
                          </button>
                        </div>
                      </header>
                      <div className="workspace-managed-panel-body">
                        <TextVoicePanel
                          entries={textVoiceLog}
                          syncConnection={state.syncStatus.connection}
                          localProfileId={state.localProfile.id}
                          maxLength={TEXT_VOICE_MAX_LENGTH}
                          onSubmitText={handleSubmitTextVoice}
                          onReplay={handleReplayTextVoice}
                        />
                      </div>
                    </section>
                  );
                case "soundcloud-radio":
                case "soundcloud-widget":
                case "soundcloud-decks":
                  return isSoundCloudPanelEnabled && panelId === activeSoundCloudPanelId ? (
                    <section className="workspace-managed-panel" aria-label={activeSoundCloudPanelDefinition.title} data-dragging={draggingDockedPanelId === panelId ? "true" : undefined}>
                      <header
                        className="workspace-managed-panel-header"
                        tabIndex={0}
                        aria-label={`Drag ${activeSoundCloudPanelDefinition.title} docked panel`}
                        onPointerDown={(event) => handleWorkspaceManagedHeaderPointerDown(panelId, event)}
                        onPointerMove={(event) => handleWorkspaceManagedHeaderPointerMove(panelId, event)}
                        onPointerUp={(event) => handleWorkspaceManagedHeaderPointerUp(panelId, event)}
                        onPointerCancel={(event) => handleWorkspaceManagedHeaderPointerUp(panelId, event)}
                      >
                        <strong>{activeSoundCloudPanelDefinition.title}</strong>
                        <div className="workspace-managed-panel-actions" onPointerDown={(event) => event.stopPropagation()}>
                          <button type="button" aria-label={`Float ${activeSoundCloudPanelDefinition.title}`} onClick={handleSoundCloudFloat}>
                            Float
                          </button>
                          <button type="button" aria-label={`Close ${activeSoundCloudPanelDefinition.title}`} onClick={handleSoundCloudPanelClose}>
                            Close
                          </button>
                          <button type="button" aria-label={`Reset ${activeSoundCloudPanelDefinition.title} position`} onClick={handleSoundCloudReset}>
                            Reset
                          </button>
                        </div>
                      </header>
                      <div className="workspace-managed-panel-body">{renderActiveSoundCloudPanel()}</div>
                    </section>
                  ) : null;
                case "debug-console":
                  return isDebugConsoleOpen ? (
                    <DebugConsoleDockedPanel
                      isOpen={isDebugConsoleOpen}
                      onClose={handleDebugConsoleDockedClose}
                      onFloat={handleDebugConsoleFloat}
                      onReset={handleDebugConsoleReset}
                      snapshot={debugConsoleState.snapshot}
                      logs={debugConsoleState.visibleLogs}
                      commandHistory={debugCommandHistory}
                      activeFilter={debugConsoleState.activeFilter}
                      onSubmitCommand={handleDebugConsoleCommand}
                      onDockedDragMove={handleDebugConsoleDockedDragMove}
                      onDockedDragEnd={handleDebugConsoleDockedDragEnd}
                      onDockedDragCancel={handleDebugConsoleDockedDragCancel}
                    />
                  ) : null;
                default:
                  return null;
              }
            }}
          />
        ) : null}

        {isThreeDModeOpen && (!isSoundCloudPanelEnabled || soundCloudPanelMode !== "decks") ? (
          <div className="soundcloud-deck-standby" aria-hidden="true">
            {renderSoundCloudDeckPanel(false)}
          </div>
        ) : null}

        {shouldShowFloatingDashboardPanels && isGlobePanelVisible && !isGlobeDocked && globeFloatingPanel ? (
          <FloatingWindow
            title={GLOBE_PANEL_DEFINITION.title}
            isOpen={isGlobePanelVisible}
            initialRect={GLOBE_PANEL_DEFINITION.defaultFloatingRect}
            rect={globeFloatingPanel.rect}
            zIndex={globeFloatingPanel.zIndex}
            minWidth={GLOBE_PANEL_DEFINITION.minWidth}
            minHeight={GLOBE_PANEL_DEFINITION.minHeight}
            onClose={handleGlobePanelClose}
            onRectChange={handleGlobeFloatingRectChange}
            onInteractionEnd={handleCorePanelSplitResizeEnd}
            onFocusPanel={handleGlobeFloatingFocus}
            actions={
              <>
                <button type="button" className="panel-shell-action floating-window-action" aria-label="Dock Globe panel" onClick={handleGlobeDock}>
                  Dock
                </button>
                <button type="button" className="panel-shell-action floating-window-action" aria-label="Reset Globe panel position" onClick={handleGlobeReset}>
                  Reset
                </button>
              </>
            }
          >
            <div className="workspace-managed-floating-body">
              <GlobePanel
                session={state.session}
                users={state.users}
                localUserId={lobbyState.localUser?.id}
                vpnVisualEnabled={isGlobeVpnVisualEnabled}
                onToggleVpnVisual={() => setIsGlobeVpnVisualEnabled((current) => !current)}
                onFullscreenChange={setIsGlobePanelFullscreen}
                onClose={handleGlobePanelClose}
              />
            </div>
          </FloatingWindow>
        ) : null}

        {shouldShowFloatingDashboardPanels && isAdminOpen && lobbyState.canUseAdminTools && !isAdminDocked && adminFloatingPanel ? (
          <FloatingWindow
            title={ADMIN_PANEL_DEFINITION.title}
            isOpen={isAdminOpen}
            initialRect={ADMIN_PANEL_DEFINITION.defaultFloatingRect}
            rect={adminFloatingPanel.rect}
            zIndex={adminFloatingPanel.zIndex}
            minWidth={ADMIN_PANEL_DEFINITION.minWidth}
            minHeight={ADMIN_PANEL_DEFINITION.minHeight}
            onClose={handleAdminPanelClose}
            onRectChange={handleAdminFloatingRectChange}
            onInteractionEnd={handleCorePanelSplitResizeEnd}
            onFocusPanel={handleAdminFloatingFocus}
            actions={
              <>
                <button type="button" className="panel-shell-action floating-window-action" aria-label="Dock Admin panel" onClick={handleAdminDock}>
                  Dock
                </button>
                <button type="button" className="panel-shell-action floating-window-action" aria-label="Reset Admin panel position" onClick={handleAdminReset}>
                  Reset
                </button>
              </>
            }
          >
            <div className="workspace-managed-floating-body">
                <AdminPanel
                  state={state}
                  lobbyState={lobbyState}
                  isOpen={isAdminOpen}
                  areEmptyCellsHidden={areEmptyCellsHidden}
                  maxVisibleEmptyPlayerSlots={maxVisibleEmptyPlayerSlots}
                  waveformBarCount={soundCloudWaveformBarCount}
                  soundCloudPlayer={adminSoundCloudPlayer}
                  onClose={handleAdminPanelClose}
                  onSetWaveformBarCount={setSoundCloudWaveformBarCount}
                  onSetEmptyCellsHidden={handleSetEmptyCellsHidden}
                  onSetMaxVisibleEmptyPlayerSlots={handleSetMaxVisibleEmptyPlayerSlots}
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
            </div>
          </FloatingWindow>
        ) : null}

        {shouldShowFloatingDashboardPanels && !isTextVoiceDocked && textVoiceFloatingPanel ? (
          <FloatingWindow
            title={TEXT_VOICE_PANEL_DEFINITION.title}
            isOpen={Boolean(textVoiceFloatingPanel)}
            initialRect={TEXT_VOICE_PANEL_DEFINITION.defaultFloatingRect}
            rect={textVoiceFloatingPanel.rect}
            zIndex={textVoiceFloatingPanel.zIndex}
            minWidth={TEXT_VOICE_PANEL_DEFINITION.minWidth}
            minHeight={TEXT_VOICE_PANEL_DEFINITION.minHeight}
            onClose={handleTextVoicePanelClose}
            onRectChange={handleTextVoiceFloatingRectChange}
            onInteractionEnd={handleCorePanelSplitResizeEnd}
            onFocusPanel={handleTextVoiceFloatingFocus}
            actions={
              <>
                <button type="button" className="panel-shell-action floating-window-action" aria-label="Dock Text Voice panel" onClick={handleTextVoiceDock}>
                  Dock
                </button>
                <button type="button" className="panel-shell-action floating-window-action" aria-label="Reset Text Voice panel position" onClick={handleTextVoiceReset}>
                  Reset
                </button>
              </>
            }
          >
            <div className="workspace-managed-floating-body">
              <TextVoicePanel
                entries={textVoiceLog}
                syncConnection={state.syncStatus.connection}
                localProfileId={state.localProfile.id}
                maxLength={TEXT_VOICE_MAX_LENGTH}
                onSubmitText={handleSubmitTextVoice}
                onReplay={handleReplayTextVoice}
              />
            </div>
          </FloatingWindow>
        ) : null}

        {shouldShowFloatingDashboardPanels && isSoundCloudPanelEnabled && !isActiveSoundCloudDocked && activeSoundCloudFloatingPanel ? (
          <FloatingWindow
            title={activeSoundCloudPanelDefinition.title}
            isOpen={isSoundCloudPanelEnabled}
            initialRect={activeSoundCloudPanelDefinition.defaultFloatingRect}
            rect={activeSoundCloudFloatingPanel.rect}
            zIndex={activeSoundCloudFloatingPanel.zIndex}
            minWidth={activeSoundCloudPanelDefinition.minWidth}
            minHeight={activeSoundCloudPanelDefinition.minHeight}
            onClose={handleSoundCloudPanelClose}
            onRectChange={handleSoundCloudFloatingRectChange}
            onInteractionEnd={handleCorePanelSplitResizeEnd}
            onFocusPanel={handleSoundCloudFloatingFocus}
            actions={
              <>
                <button type="button" className="panel-shell-action floating-window-action" aria-label={`Dock ${activeSoundCloudPanelDefinition.title}`} onClick={handleSoundCloudDock}>
                  Dock
                </button>
                <button type="button" className="panel-shell-action floating-window-action" aria-label={`Reset ${activeSoundCloudPanelDefinition.title} position`} onClick={handleSoundCloudReset}>
                  Reset
                </button>
              </>
            }
          >
            <div className="workspace-managed-floating-body">{renderActiveSoundCloudPanel()}</div>
          </FloatingWindow>
        ) : null}

        {!isSmallMode ? <StatusFooter syncStatus={state.syncStatus} sdkState={sdkState} /> : null}

        {shouldShowFloatingDashboardPanels ? (
          debugConsoleDisplayMode === "float" ? (
            !isDebugConsoleDocked ? (
              <DebugConsoleWindow
                isOpen={isDebugConsoleOpen}
                onClose={() => {
                  setDebugConsoleDropPreview(null);
                  setIsDebugConsoleOpen(false);
                }}
                snapshot={debugConsoleState.snapshot}
                logs={debugConsoleState.visibleLogs}
                commandHistory={debugCommandHistory}
                activeFilter={debugConsoleState.activeFilter}
                onSubmitCommand={handleDebugConsoleCommand}
                floatingRect={debugConsoleFloatingPanel?.rect}
                floatingZIndex={debugConsoleFloatingPanel?.zIndex}
                onFloatingRectChange={handleDebugConsoleFloatingRectChange}
                onFloatingInteractionEnd={handleDebugConsoleFloatingInteractionEnd}
                onFloatingFocus={handleDebugConsoleFloatingFocus}
                onFloatingDragMove={handleDebugConsoleFloatingDragMove}
                onFloatingDragEnd={handleDebugConsoleFloatingDragEnd}
                onDock={handleDebugConsoleDock}
                onReset={handleDebugConsoleReset}
              />
            ) : null
          ) : debugConsoleDisplayMode === "fullscreen2" ? (
            <DebugConsoleFullscreen2
              isOpen={isDebugConsoleOpen}
              openRequestId={fullscreen2OpenRequestId}
              closeRequestId={fullscreen2CloseRequestId}
              startMode={fullscreen2StartMode}
              backgroundOpacityPercent={backgroundConsoleOpacityPercent}
              commandBackgroundOpacityPercent={backgroundConsoleCommandOpacityPercent}
              textOpacityPercent={backgroundConsoleTextOpacityPercent}
              logs={debugConsoleState.visibleLogs}
              commandHistory={debugCommandHistory}
              onCloseAnimationEnd={handleConsole2CloseAnimationEnd}
              onRequestClose={closeDebugConsole2}
              onApplyModePreset={applyConsole2ModePreset}
              onSubmitCommand={handleDebugConsoleCommand}
            />
          ) : (
            <DebugConsoleFullscreen
              isOpen={isDebugConsoleOpen}
              startCompact={shouldStartDebugConsoleCompact}
              onClose={() => setIsDebugConsoleOpen(false)}
              snapshot={debugConsoleState.snapshot}
              logs={debugConsoleState.visibleLogs}
              commandHistory={debugCommandHistory}
              activeFilter={debugConsoleState.activeFilter}
              onSubmitCommand={handleDebugConsoleCommand}
            />
          )
        ) : null}

        {isRenderingSpikeOpen ? (
          <Suspense fallback={<HiddenWorldLoadingPanel label="Loading render spike" />}>
            <RenderingStackSpike onClose={() => setIsRenderingSpikeOpen(false)} />
          </Suspense>
        ) : null}
      </main>
      {isThreeDModeOpen ? createPortal(
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
            canWatchReadyHold={canWatchReadyHold}
            watchReadyHoldStatus={watchReadyHoldStatus}
            onSetSharedDawTempo={setDawTempo}
            onPlaySharedDawTransport={playDawTransport}
            onStopSharedDawTransport={stopDawTransport}
            onPublishSharedDawClip={publishDawClip}
            onClearSharedDawClip={clearDawClip}
            onBroadcastDawLiveSound={broadcastDawLiveSound}
            onStartWatchReadyHold={handleThreeDWatchStartReadyHold}
            onEndWatchReadyHold={handleThreeDWatchEndReadyHold}
            studioGuitar={state.studioGuitar}
            onPickupStudioGuitar={pickupStudioGuitar}
            onDropStudioGuitar={dropStudioGuitar}
            onExit={() => setIsThreeDModeOpen(false)}
          />
        </Suspense>,
        document.body,
      ) : null}
    </div>
  );
}
