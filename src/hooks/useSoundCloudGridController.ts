import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SoundCloudGridDeckId = "A" | "B";
export type SoundCloudGridPadMode = "random" | "timeline" | "continuous";
const SOUND_CLOUD_GRID_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const SOUND_CLOUD_GRID_COLUMNS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export type SoundCloudGridPadId = `${(typeof SOUND_CLOUD_GRID_ROWS)[number]}${(typeof SOUND_CLOUD_GRID_COLUMNS)[number]}`;

export interface SoundCloudGridPad {
  id: SoundCloudGridPadId;
  positionMs: number;
  trackKey: string;
}

export interface SoundCloudGridDeckSource {
  deckId: SoundCloudGridDeckId;
  playlistSourceUrl: string;
  currentTrackUrl: string | null;
  currentTrackIndex: number | null;
  currentTrackTitle: string;
  playbackDuration: number;
  waveformBars: number[];
  isWidgetReady: boolean;
}

export interface SoundCloudGridControllerState {
  deckId: SoundCloudGridDeckId;
  activeTrackKey: string | null;
  isAuxWidgetReady: boolean;
  isBurstPlaying: boolean;
  lastTriggeredPadId: SoundCloudGridPadId | null;
  statusLabel: string;
  lastActionLabel: string | null;
  burstLengthMs: number;
  playbackDuration: number;
  sampleStartMs: number;
  sampleEndMs: number;
  waveformBars: number[];
  volume: number;
  isMuted: boolean;
  isLocked: boolean;
  padMode: SoundCloudGridPadMode;
  auxWidgetSrc: string;
  pads: SoundCloudGridPad[];
}

export interface SoundCloudGridControllerActions {
  rollPads: () => void;
  triggerPad: (padId: SoundCloudGridPadId) => void;
  triggerTestBurst: () => void;
  stepBurstLength: (direction: -1 | 1) => void;
  stepSampleClamp: (clamp: "start" | "end", direction: -1 | 1) => void;
  stepSampleWindow: (direction: -1 | 1) => void;
  stepVolume: (direction: -1 | 1) => void;
  setSampleClamp: (clamp: "start" | "end", positionMs: number) => void;
  togglePadMode: () => void;
  toggleMute: () => void;
  toggleLock: () => void;
  syncAuxWidgetToDeck: () => void;
}

export interface SoundCloudGridController {
  iframeRef: {
    current: HTMLIFrameElement | null;
  };
  state: SoundCloudGridControllerState;
  actions: SoundCloudGridControllerActions;
}

const WIDGET_SCRIPT_ID = "soundcloud-widget-api";
const WIDGET_SCRIPT_SRC = "https://w.soundcloud.com/player/api.js";
const SOUNDCLOUD_WIDGET_PREFIX = "/soundcloud-widget";
const SOUNDCLOUD_WIDGET_READY_TIMEOUT_MS = 15000;
const GRID_BURST_LENGTHS = [125, 250, 500, 1000, 2000, 4000] as const;
const DEFAULT_GRID_BURST_LENGTH_MS = 500;
const DEFAULT_GRID_VOLUME = 55;
const GRID_VOLUME_STEP = 5;
const GRID_SAMPLE_WINDOW_FINE_STEPS = 4;
const SOUND_CLOUD_GRID_PAD_IDS = SOUND_CLOUD_GRID_ROWS.flatMap((row) =>
  SOUND_CLOUD_GRID_COLUMNS.map((column) => `${row}${column}` as SoundCloudGridPadId),
);

function isDiscordProxyHost() {
  return window.location.host.includes("discordsays.com") || window.location.host.includes("discordsez.com");
}

function remapThroughActivityPrefix(rawUrl: string, prefix: string) {
  if (!isDiscordProxyHost()) {
    return rawUrl;
  }

  const url = new URL(rawUrl);
  return `${window.location.origin}${prefix}${url.pathname}${url.search}${url.hash}`;
}

function getAuxWidgetSrc(playlistSourceUrl: string) {
  const params = new URLSearchParams({
    url: playlistSourceUrl,
    auto_play: "false",
    color: "#3fe9ff",
    visual: "false",
    show_artwork: "false",
    show_playcount: "false",
    show_user: "false",
    show_comments: "false",
    show_teaser: "false",
    hide_related: "true",
    buying: "false",
    sharing: "false",
    download: "false",
    single_active: "false",
  });

  return remapThroughActivityPrefix(`https://w.soundcloud.com/player/?${params.toString()}`, SOUNDCLOUD_WIDGET_PREFIX);
}

function loadWidgetScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.SC?.Widget) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(WIDGET_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load SoundCloud widget API.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = WIDGET_SCRIPT_ID;
    script.src = remapThroughActivityPrefix(WIDGET_SCRIPT_SRC, SOUNDCLOUD_WIDGET_PREFIX);
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load SoundCloud widget API."));
    document.head.appendChild(script);
  });
}

function safeWidgetCall(callback: () => void) {
  try {
    callback();
  } catch {
    // SoundCloud can throw if the iframe is already being torn down.
  }
}

function clampSoundCloudVolume(volume: number) {
  return Math.max(0, Math.min(100, Math.round(volume)));
}

function formatBurstLength(lengthMs: number) {
  return lengthMs >= 1000 ? `${lengthMs / 1000}S` : `${lengthMs}MS`;
}

function formatSampleClampTime(positionMs: number) {
  if (!Number.isFinite(positionMs) || positionMs <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(positionMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getTrackKey(source: SoundCloudGridDeckSource) {
  return source.currentTrackUrl;
}

function canGeneratePads(source: SoundCloudGridDeckSource, burstLengthMs: number) {
  return Boolean(source.currentTrackUrl) && Number.isFinite(source.playbackDuration) && source.playbackDuration > burstLengthMs;
}

function getUnavailablePadLabel(source: SoundCloudGridDeckSource, burstLengthMs: number) {
  if (!source.currentTrackUrl) {
    return "LOAD TRACK";
  }

  if (!Number.isFinite(source.playbackDuration) || source.playbackDuration <= burstLengthMs) {
    return "NO DURATION";
  }

  return "LOAD TRACK";
}

function generateRandomPads(trackKey: string, playbackDuration: number, burstLengthMs: number): SoundCloudGridPad[] {
  const latestStart = Math.max(0, Math.floor(playbackDuration - burstLengthMs));

  return SOUND_CLOUD_GRID_PAD_IDS.map((id) => ({
    id,
    positionMs: Math.floor(Math.random() * (latestStart + 1)),
    trackKey,
  }));
}

function getLatestSafeStart(playbackDuration: number, burstLengthMs: number) {
  return Math.max(0, Math.floor(playbackDuration - burstLengthMs));
}

function getContinuousSampleSpan(burstLengthMs: number) {
  return burstLengthMs * Math.max(1, SOUND_CLOUD_GRID_PAD_IDS.length - 1);
}

function normalizeSampleClamps(playbackDuration: number, burstLengthMs: number, sampleStartMs: number, sampleEndMs: number, padMode: SoundCloudGridPadMode = "timeline") {
  const latestStart = getLatestSafeStart(playbackDuration, burstLengthMs);

  if (padMode === "continuous") {
    const span = Math.min(latestStart, getContinuousSampleSpan(burstLengthMs));
    const startMs = Math.max(0, Math.min(latestStart - span, sampleStartMs));
    const endMs = startMs + span;

    return { startMs, endMs, latestStart };
  }

  const minimumSpan = Math.min(latestStart, burstLengthMs);
  const safeEnd = sampleEndMs > 0 ? sampleEndMs : latestStart;
  const endMs = Math.max(minimumSpan, Math.min(latestStart, safeEnd));
  const startMs = Math.max(0, Math.min(endMs - minimumSpan, sampleStartMs));

  return { startMs, endMs, latestStart };
}

function generateTimelinePads(trackKey: string, playbackDuration: number, burstLengthMs: number, sampleStartMs: number, sampleEndMs: number): SoundCloudGridPad[] {
  const { startMs, endMs } = normalizeSampleClamps(playbackDuration, burstLengthMs, sampleStartMs, sampleEndMs, "timeline");
  const latestStart = Math.max(0, Math.floor(playbackDuration - burstLengthMs));
  const lastPadIndex = Math.max(1, SOUND_CLOUD_GRID_PAD_IDS.length - 1);
  const sampleRange = Math.max(0, endMs - startMs);

  return SOUND_CLOUD_GRID_PAD_IDS.map((id, index) => ({
    id,
    positionMs: Math.min(latestStart, Math.round(startMs + (sampleRange * index) / lastPadIndex)),
    trackKey,
  }));
}

function generateContinuousPads(trackKey: string, playbackDuration: number, burstLengthMs: number, sampleStartMs: number, sampleEndMs: number): SoundCloudGridPad[] {
  const { startMs, latestStart } = normalizeSampleClamps(playbackDuration, burstLengthMs, sampleStartMs, sampleEndMs, "continuous");

  return SOUND_CLOUD_GRID_PAD_IDS.map((id, index) => ({
    id,
    positionMs: Math.min(latestStart, Math.round(startMs + index * burstLengthMs)),
    trackKey,
  }));
}

function generatePadsForSource(source: SoundCloudGridDeckSource, burstLengthMs: number, padMode: SoundCloudGridPadMode, sampleStartMs: number, sampleEndMs: number) {
  const trackKey = getTrackKey(source);

  if (!trackKey || !canGeneratePads(source, burstLengthMs)) {
    return {
      label: getUnavailablePadLabel(source, burstLengthMs),
      pads: [],
      trackKey,
    };
  }

  return {
    label: padMode === "timeline" ? "TIME 64" : padMode === "continuous" ? "CONT 64" : "ROLL 64",
    pads: padMode === "timeline"
      ? generateTimelinePads(trackKey, source.playbackDuration, burstLengthMs, sampleStartMs, sampleEndMs)
      : padMode === "continuous"
        ? generateContinuousPads(trackKey, source.playbackDuration, burstLengthMs, sampleStartMs, sampleEndMs)
        : generateRandomPads(trackKey, source.playbackDuration, burstLengthMs),
    trackKey,
  };
}

function getSafeTestBurstPosition(durationMs: number, burstLengthMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  const latestStart = Math.max(0, durationMs - burstLengthMs);
  return Math.min(latestStart, Math.max(0, Math.floor(durationMs * 0.25)));
}

export function useSoundCloudGridController(source: SoundCloudGridDeckSource): SoundCloudGridController {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SoundCloudWidgetInstance | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const isBurstArmedRef = useRef(false);
  const latestSourceRef = useRef(source);
  const activeTrackKeyRef = useRef<string | null>(null);
  const padsRef = useRef<SoundCloudGridPad[]>([]);
  const volumeRef = useRef(DEFAULT_GRID_VOLUME);
  const burstLengthRef = useRef(DEFAULT_GRID_BURST_LENGTH_MS);
  const isMutedRef = useRef(false);
  const isLockedRef = useRef(false);
  const padModeRef = useRef<SoundCloudGridPadMode>("random");
  const sampleStartMsRef = useRef(0);
  const sampleEndMsRef = useRef(0);

  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isAuxWidgetReady, setIsAuxWidgetReady] = useState(false);
  const [isBurstPlaying, setIsBurstPlaying] = useState(false);
  const [lastTriggeredPadId, setLastTriggeredPadId] = useState<SoundCloudGridPadId | null>(null);
  const [statusLabel, setStatusLabel] = useState("GRID LOADING");
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const [activeTrackKey, setActiveTrackKey] = useState<string | null>(null);
  const [pads, setPads] = useState<SoundCloudGridPad[]>([]);
  const [burstLengthMs, setBurstLengthMs] = useState(DEFAULT_GRID_BURST_LENGTH_MS);
  const [volume, setVolumeState] = useState(DEFAULT_GRID_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [padMode, setPadMode] = useState<SoundCloudGridPadMode>("random");
  const [sampleStartMs, setSampleStartMs] = useState(0);
  const [sampleEndMs, setSampleEndMs] = useState(0);

  const auxWidgetSrc = useMemo(() => getAuxWidgetSrc(source.playlistSourceUrl), [source.playlistSourceUrl]);

  const setFeedbackLabel = useCallback((label: string) => {
    setStatusLabel(label);
    setLastActionLabel(label);
  }, []);

  const setActiveTrackKeyState = useCallback((trackKey: string | null) => {
    activeTrackKeyRef.current = trackKey;
    setActiveTrackKey(trackKey);
  }, []);

  const setPadsState = useCallback((nextPads: SoundCloudGridPad[]) => {
    padsRef.current = nextPads;
    setPads(nextPads);
  }, []);

  const clearBurstTimer = useCallback(() => {
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
  }, []);

  const stopAuxWidgetPlayback = useCallback((widget: SoundCloudWidgetInstance | null = widgetRef.current) => {
    isBurstArmedRef.current = false;
    clearBurstTimer();
    safeWidgetCall(() => widget?.pause());
    setIsBurstPlaying(false);
  }, [clearBurstTimer]);

  const syncAuxWidgetToDeck = useCallback(() => {
    const widget = widgetRef.current;
    const latestSource = latestSourceRef.current;

    if (!widget || !isAuxWidgetReady) {
      setFeedbackLabel("GRID LOADING");
      return;
    }

    if (!latestSource.currentTrackUrl || latestSource.currentTrackIndex === null) {
      setFeedbackLabel("LOAD TRACK");
      return;
    }

    safeWidgetCall(() => {
      widget.pause();
      widget.skip(latestSource.currentTrackIndex ?? 0);
      widget.setVolume(volumeRef.current);
    });

    window.setTimeout(() => {
      if (!isBurstArmedRef.current && widgetRef.current === widget) {
        safeWidgetCall(() => widget.pause());
        setIsBurstPlaying(false);
      }
    }, 120);

    setIsBurstPlaying(false);
    setFeedbackLabel("GRID SYNCED");
  }, [isAuxWidgetReady, setFeedbackLabel]);

  const rollPads = useCallback(() => {
    if (isLockedRef.current) {
      setFeedbackLabel("GRID LOCK");
      return;
    }

    const latestSource = latestSourceRef.current;
    const nextPadState = generatePadsForSource(latestSource, burstLengthRef.current, padModeRef.current, sampleStartMsRef.current, sampleEndMsRef.current);

    setActiveTrackKeyState(nextPadState.trackKey);
    setPadsState(nextPadState.pads);
    setFeedbackLabel(nextPadState.label);
  }, [setActiveTrackKeyState, setFeedbackLabel, setPadsState]);

  useEffect(() => {
    latestSourceRef.current = source;
  }, [source]);

  useEffect(() => {
    let isMounted = true;

    setIsScriptReady(false);
    setIsAuxWidgetReady(false);
    setStatusLabel("GRID LOADING");

    loadWidgetScript()
      .then(() => {
        if (isMounted) {
          setIsScriptReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatusLabel("GRID API ERROR");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isScriptReady || !iframeRef.current || !window.SC?.Widget) {
      return;
    }

    const widget = window.SC.Widget(iframeRef.current);
    widgetRef.current = widget;
    setIsAuxWidgetReady(false);
    setIsBurstPlaying(false);
    setStatusLabel("GRID LOADING");

    const readyTimeoutId = window.setTimeout(() => {
      setStatusLabel("GRID TIMEOUT");
    }, SOUNDCLOUD_WIDGET_READY_TIMEOUT_MS);

    widget.bind(window.SC.Widget.Events.READY, () => {
      window.clearTimeout(readyTimeoutId);
      setIsAuxWidgetReady(true);
      setStatusLabel("GRID READY");
      safeWidgetCall(() => {
        widget.pause();
        widget.setVolume(volumeRef.current);
      });
    });

    widget.bind(window.SC.Widget.Events.PAUSE, () => {
      setIsBurstPlaying(false);
    });

    widget.bind(window.SC.Widget.Events.PLAY, () => {
      if (!isBurstArmedRef.current) {
        safeWidgetCall(() => widget.pause());
        setIsBurstPlaying(false);
        return;
      }

      setIsBurstPlaying(true);
    });

    widget.bind(window.SC.Widget.Events.ERROR, () => {
      setStatusLabel("GRID ERROR");
      isBurstArmedRef.current = false;
      setIsBurstPlaying(false);
    });

    return () => {
      window.clearTimeout(readyTimeoutId);
      clearBurstTimer();

      if (widgetRef.current === widget) {
        widgetRef.current = null;
      }

      isBurstArmedRef.current = false;
      safeWidgetCall(() => widget.pause());
    };
  }, [auxWidgetSrc, clearBurstTimer, isScriptReady]);

  useEffect(() => {
    syncAuxWidgetToDeck();
  }, [source.currentTrackIndex, source.currentTrackUrl, syncAuxWidgetToDeck]);

  useEffect(() => {
    const trackKey = getTrackKey(source);

    if (!trackKey || !canGeneratePads(source, burstLengthRef.current)) {
      setActiveTrackKeyState(trackKey);
      setPadsState([]);
      setFeedbackLabel(getUnavailablePadLabel(source, burstLengthRef.current));
      return;
    }

    if (activeTrackKeyRef.current === trackKey && padsRef.current.length === SOUND_CLOUD_GRID_PAD_IDS.length) {
      if (padModeRef.current === "random") {
        return;
      }
    }

    setActiveTrackKeyState(trackKey);
    const nextPadState = generatePadsForSource(source, burstLengthRef.current, padModeRef.current, sampleStartMsRef.current, sampleEndMsRef.current);
    setPadsState(nextPadState.pads);
    setFeedbackLabel(nextPadState.label);
  }, [setActiveTrackKeyState, setFeedbackLabel, setPadsState, source.currentTrackUrl, source.playbackDuration]);

  const playBurstAtPosition = useCallback((positionMs: number, feedbackLabel: string, padId: SoundCloudGridPadId | null) => {
    const widget = widgetRef.current;
    const latestSource = latestSourceRef.current;

    if (isMutedRef.current) {
      setFeedbackLabel("GRID MUTE");
      return;
    }

    if (!latestSource.isWidgetReady || !latestSource.currentTrackUrl || latestSource.currentTrackIndex === null) {
      setFeedbackLabel("LOAD TRACK");
      return;
    }

    if (!widget || !isAuxWidgetReady) {
      setFeedbackLabel("GRID LOADING");
      return;
    }

    if (!Number.isFinite(latestSource.playbackDuration) || latestSource.playbackDuration <= burstLengthRef.current) {
      setFeedbackLabel("NO DURATION");
      return;
    }

    const safePosition = Math.max(0, Math.min(Math.floor(positionMs), Math.floor(latestSource.playbackDuration - burstLengthRef.current)));

    clearBurstTimer();
    safeWidgetCall(() => {
      isBurstArmedRef.current = true;
      widget.skip(latestSource.currentTrackIndex ?? 0);
      widget.setVolume(volumeRef.current);
      widget.seekTo(safePosition);
      widget.play();
    });
    setIsBurstPlaying(true);
    setLastTriggeredPadId(padId);
    setFeedbackLabel(feedbackLabel);

    burstTimerRef.current = window.setTimeout(() => {
      isBurstArmedRef.current = false;
      safeWidgetCall(() => widget.pause());
      setIsBurstPlaying(false);
      burstTimerRef.current = null;
    }, burstLengthRef.current);
  }, [clearBurstTimer, isAuxWidgetReady, setFeedbackLabel]);

  const triggerPad = useCallback((padId: SoundCloudGridPadId) => {
    const latestSource = latestSourceRef.current;
    const currentTrackKey = getTrackKey(latestSource);
    const pad = padsRef.current.find((candidate) => candidate.id === padId);

    if (isMutedRef.current) {
      setFeedbackLabel("GRID MUTE");
      return;
    }

    if (!pad) {
      setFeedbackLabel("ROLL GRID");
      return;
    }

    if (
      (currentTrackKey && pad.trackKey !== currentTrackKey) ||
      (activeTrackKeyRef.current && pad.trackKey !== activeTrackKeyRef.current)
    ) {
      setFeedbackLabel("STALE PAD");
      return;
    }

    playBurstAtPosition(pad.positionMs, `${pad.id} ${formatBurstLength(burstLengthRef.current)}`, pad.id);
  }, [playBurstAtPosition, setFeedbackLabel]);

  const triggerTestBurst = useCallback(() => {
    const latestSource = latestSourceRef.current;
    const safePosition = getSafeTestBurstPosition(latestSource.playbackDuration, burstLengthRef.current) ?? 0;

    playBurstAtPosition(safePosition, `TEST ${formatBurstLength(burstLengthRef.current)}`, null);
  }, [playBurstAtPosition]);

  const stepBurstLength = useCallback((direction: -1 | 1) => {
    if (isLockedRef.current) {
      setFeedbackLabel("GRID LOCK");
      return;
    }

    const currentIndex = GRID_BURST_LENGTHS.findIndex((length) => length === burstLengthRef.current);
    const safeIndex = currentIndex === -1 ? GRID_BURST_LENGTHS.indexOf(DEFAULT_GRID_BURST_LENGTH_MS) : currentIndex;
    const nextIndex = Math.max(0, Math.min(GRID_BURST_LENGTHS.length - 1, safeIndex + direction));
    const nextLength = GRID_BURST_LENGTHS[nextIndex];

    burstLengthRef.current = nextLength;
    setBurstLengthMs(nextLength);

    const nextPadState = generatePadsForSource(latestSourceRef.current, nextLength, padModeRef.current, sampleStartMsRef.current, sampleEndMsRef.current);

    setActiveTrackKeyState(nextPadState.trackKey);
    setPadsState(nextPadState.pads);
    setFeedbackLabel(nextPadState.pads.length === SOUND_CLOUD_GRID_PAD_IDS.length ? `LEN ${formatBurstLength(nextLength)}` : nextPadState.label);
  }, [setActiveTrackKeyState, setFeedbackLabel, setPadsState]);

  const stepSampleWindow = useCallback((direction: -1 | 1) => {
    if (isLockedRef.current) {
      setFeedbackLabel("GRID LOCK");
      return;
    }

    const latestSource = latestSourceRef.current;

    if (!canGeneratePads(latestSource, burstLengthRef.current)) {
      setFeedbackLabel(getUnavailablePadLabel(latestSource, burstLengthRef.current));
      return;
    }

    if (padModeRef.current !== "timeline" && padModeRef.current !== "continuous") {
      setFeedbackLabel("TIME OR CONT");
      return;
    }

    const currentClamp = normalizeSampleClamps(
      latestSource.playbackDuration,
      burstLengthRef.current,
      sampleStartMsRef.current,
      sampleEndMsRef.current,
      padModeRef.current,
    );
    const currentSpan = Math.max(0, currentClamp.endMs - currentClamp.startMs);
    const maxStart = Math.max(0, currentClamp.latestStart - currentSpan);
    const stepMs = Math.max(50, Math.round(burstLengthRef.current / GRID_SAMPLE_WINDOW_FINE_STEPS));
    const nextStartMs = Math.max(0, Math.min(maxStart, currentClamp.startMs + direction * stepMs));
    const nextEndMs = nextStartMs + currentSpan;
    const normalizedClamp = normalizeSampleClamps(latestSource.playbackDuration, burstLengthRef.current, nextStartMs, nextEndMs, padModeRef.current);
    const nextPadState = generatePadsForSource(latestSource, burstLengthRef.current, padModeRef.current, normalizedClamp.startMs, normalizedClamp.endMs);

    sampleStartMsRef.current = normalizedClamp.startMs;
    sampleEndMsRef.current = normalizedClamp.endMs;
    setSampleStartMs(normalizedClamp.startMs);
    setSampleEndMs(normalizedClamp.endMs);
    setActiveTrackKeyState(nextPadState.trackKey);
    setPadsState(nextPadState.pads);
    setFeedbackLabel(`CLAMP ${direction < 0 ? "-" : "+"}${formatBurstLength(stepMs)}`);
  }, [setActiveTrackKeyState, setFeedbackLabel, setPadsState]);

  const setSampleClamp = useCallback((clamp: "start" | "end", positionMs: number) => {
    if (isLockedRef.current) {
      setFeedbackLabel("GRID LOCK");
      return;
    }

    const latestSource = latestSourceRef.current;

    if (!canGeneratePads(latestSource, burstLengthRef.current)) {
      setFeedbackLabel(getUnavailablePadLabel(latestSource, burstLengthRef.current));
      return;
    }

    const currentClamp = normalizeSampleClamps(
      latestSource.playbackDuration,
      burstLengthRef.current,
      sampleStartMsRef.current,
      sampleEndMsRef.current,
      padModeRef.current,
    );
    const nextPosition = Math.max(0, Math.min(currentClamp.latestStart, Math.floor(positionMs)));

    let nextStartMs: number;
    let nextEndMs: number;

    if (padModeRef.current === "continuous") {
      const fixedSpan = Math.min(currentClamp.latestStart, getContinuousSampleSpan(burstLengthRef.current));
      nextStartMs = clamp === "start" ? nextPosition : nextPosition - fixedSpan;
      nextEndMs = nextStartMs + fixedSpan;
    } else {
      const minimumSpan = Math.min(currentClamp.latestStart, burstLengthRef.current);
      nextStartMs = clamp === "start"
        ? Math.max(0, Math.min(nextPosition, currentClamp.endMs - minimumSpan))
        : currentClamp.startMs;
      nextEndMs = clamp === "end"
        ? Math.max(currentClamp.startMs + minimumSpan, Math.min(currentClamp.latestStart, nextPosition))
        : currentClamp.endMs;
    }

    const normalizedClamp = normalizeSampleClamps(latestSource.playbackDuration, burstLengthRef.current, nextStartMs, nextEndMs, padModeRef.current);
    const nextPadState = generatePadsForSource(latestSource, burstLengthRef.current, padModeRef.current, normalizedClamp.startMs, normalizedClamp.endMs);

    sampleStartMsRef.current = normalizedClamp.startMs;
    sampleEndMsRef.current = normalizedClamp.endMs;
    setSampleStartMs(normalizedClamp.startMs);
    setSampleEndMs(normalizedClamp.endMs);
    setActiveTrackKeyState(nextPadState.trackKey);
    setPadsState(nextPadState.pads);
    setFeedbackLabel(`${clamp === "start" ? "START" : "END"} ${formatSampleClampTime(normalizedClamp[clamp === "start" ? "startMs" : "endMs"])}`);
  }, [setActiveTrackKeyState, setFeedbackLabel, setPadsState]);

  const stepSampleClamp = useCallback((clamp: "start" | "end", direction: -1 | 1) => {
    if (padModeRef.current !== "timeline") {
      setFeedbackLabel("TIME MODE");
      return;
    }

    const stepMs = Math.max(50, Math.round(burstLengthRef.current / GRID_SAMPLE_WINDOW_FINE_STEPS));
    const currentClamp = normalizeSampleClamps(
      latestSourceRef.current.playbackDuration,
      burstLengthRef.current,
      sampleStartMsRef.current,
      sampleEndMsRef.current,
      padModeRef.current,
    );
    const currentPosition = clamp === "start" ? currentClamp.startMs : currentClamp.endMs;

    setSampleClamp(clamp, currentPosition + direction * stepMs);
  }, [setFeedbackLabel, setSampleClamp]);

  const togglePadMode = useCallback(() => {
    if (isLockedRef.current) {
      setFeedbackLabel("GRID LOCK");
      return;
    }

    setPadMode((currentMode) => {
      const nextMode: SoundCloudGridPadMode = currentMode === "random"
        ? "timeline"
        : currentMode === "timeline"
          ? "continuous"
          : "random";
      const nextPadState = generatePadsForSource(latestSourceRef.current, burstLengthRef.current, nextMode, sampleStartMsRef.current, sampleEndMsRef.current);

      padModeRef.current = nextMode;
      setActiveTrackKeyState(nextPadState.trackKey);
      setPadsState(nextPadState.pads);
      setFeedbackLabel(nextPadState.pads.length === SOUND_CLOUD_GRID_PAD_IDS.length ? (nextMode === "timeline" ? "TIME 64" : nextMode === "continuous" ? "CONT 64" : "RAND 64") : nextPadState.label);

      return nextMode;
    });
  }, [setActiveTrackKeyState, setFeedbackLabel, setPadsState]);

  const stepVolume = useCallback((direction: -1 | 1) => {
    if (isLockedRef.current) {
      setFeedbackLabel("GRID LOCK");
      return;
    }

    const nextVolume = clampSoundCloudVolume(volumeRef.current + direction * GRID_VOLUME_STEP);

    volumeRef.current = nextVolume;
    setVolumeState(nextVolume);
    safeWidgetCall(() => widgetRef.current?.setVolume(nextVolume));
    setFeedbackLabel(`VOL ${nextVolume}%`);
  }, [setFeedbackLabel]);

  const toggleMute = useCallback(() => {
    setIsMuted((current) => {
      const nextValue = !current;
      isMutedRef.current = nextValue;

      if (nextValue) {
        stopAuxWidgetPlayback();
        setLastTriggeredPadId(null);
        setFeedbackLabel("GRID MUTE");
      } else {
        setFeedbackLabel("GRID READY");
      }

      return nextValue;
    });
  }, [setFeedbackLabel, stopAuxWidgetPlayback]);

  const toggleLock = useCallback(() => {
    setIsLocked((current) => {
      const nextValue = !current;
      isLockedRef.current = nextValue;
      setFeedbackLabel(nextValue ? "GRID LOCK" : "GRID UNLOCK");
      return nextValue;
    });
  }, [setFeedbackLabel]);

  return {
    iframeRef,
    state: {
      deckId: source.deckId,
      activeTrackKey,
      isAuxWidgetReady,
      isBurstPlaying,
      lastTriggeredPadId,
      statusLabel,
      lastActionLabel,
      burstLengthMs,
      playbackDuration: source.playbackDuration,
      sampleStartMs: normalizeSampleClamps(source.playbackDuration, burstLengthMs, sampleStartMs, sampleEndMs, padMode).startMs,
      sampleEndMs: normalizeSampleClamps(source.playbackDuration, burstLengthMs, sampleStartMs, sampleEndMs, padMode).endMs,
      waveformBars: source.waveformBars,
      volume,
      isMuted,
      isLocked,
      padMode,
      auxWidgetSrc,
      pads,
    },
    actions: {
      rollPads,
      triggerPad,
      triggerTestBurst,
      stepBurstLength,
      stepSampleClamp,
      stepSampleWindow,
      stepVolume,
      setSampleClamp,
      togglePadMode,
      toggleMute,
      toggleLock,
      syncAuxWidgetToDeck,
    },
  };
}
