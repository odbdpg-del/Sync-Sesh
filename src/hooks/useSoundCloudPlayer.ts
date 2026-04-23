import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { estimateBpmFromWaveform, type SoundCloudBpmState } from "../lib/soundcloud/bpmAnalysis";
import { estimateBpmFromLength } from "../lib/soundcloud/bpmLengthEstimate";

export interface PlaylistOption {
  id: string;
  label: string;
  apiUrl: string;
  sourceUrl: string;
}

export interface JukeboxDisplayState {
  playlistId: string;
  playlistLabel: string;
  trackCount: number;
  trackList: SoundCloudTrackListItem[];
  currentTrackIndex: number | null;
  currentTrackTitle: string;
  currentTrackArtist: string;
  currentTrackUrl: string | null;
  currentTrackBpm: number | null;
  currentTrackBpmState: SoundCloudBpmState;
  currentTrackAcceptedBpmState: SoundCloudAcceptedBpmState;
  lastBpmActionLabel: string | null;
  artworkUrl: string | null;
  isScriptReady: boolean;
  isWidgetReady: boolean;
  isPlaying: boolean;
  playbackPosition: number;
  playbackDuration: number;
  progress: number;
  waveformBars: number[];
  errorMessage: string | null;
}

export interface JukeboxActions {
  togglePlayback: () => void;
  shufflePlay: () => void;
  loadTrackByIndex: (trackIndex: number) => void;
  retry: () => void;
}

export interface SoundCloudSeekActions {
  seekBy: (deltaSeconds: number) => boolean;
  seekTo: (positionMs: number, options?: { playAfterSeek?: boolean }) => boolean;
}

export type SoundCloudAcceptedBpmSource = "meta" | "wave" | "length" | "manual" | "none";

export interface SoundCloudAcceptedBpmState {
  bpm: number | null;
  source: SoundCloudAcceptedBpmSource;
  confidence: number;
  label: string;
  updatedAt: number;
}

export interface SoundCloudBpmActions {
  acceptMetadataBpm: () => void;
  acceptWaveformBpm: () => void;
  acceptLengthBpm: () => void;
  adjustAcceptedBpm: (deltaBpm: number) => void;
  clearAcceptedBpm: () => void;
}

export interface SoundCloudPlayerState extends JukeboxDisplayState {
  selectedPlaylistId: string;
  playlists: PlaylistOption[];
  controlsDisabled: boolean;
  waveformProgress: number;
  isWaveformWindowOpen: boolean;
  selectedPlaylist: PlaylistOption;
  resolvedWidgetSrc: string;
  currentTrackArtistUrl: string | null;
  volume: number;
  outputLevel: number;
  effectiveVolume: number;
}

export interface SoundCloudPlayerActions extends JukeboxActions, SoundCloudSeekActions, SoundCloudBpmActions {
  changePlaylist: (playlistId: string) => void;
  seekWaveform: (ratio: number) => void;
  setVolume: (volume: number) => void;
  setOutputLevel: (level: number) => void;
  openWaveformWindow: () => void;
  closeWaveformWindow: () => void;
}

export interface SoundCloudPlayerController {
  iframeRef: {
    current: HTMLIFrameElement | null;
  };
  state: SoundCloudPlayerState;
  actions: SoundCloudPlayerActions;
  hotCueState: SoundCloudHotCueState;
  hotCueActions: SoundCloudHotCueActions;
  jukeboxDisplay: JukeboxDisplayState;
  jukeboxActions: JukeboxActions;
  bpmActions: SoundCloudBpmActions;
}

interface UseSoundCloudPlayerOptions {
  waveformBarCount: number;
  initialPlaylistId?: string;
  initialVolume?: number;
}

interface SoundCloudWaveformData {
  height?: number;
  samples?: number[];
}

export interface SoundCloudTrackListItem {
  index: number;
  title: string;
  artist: string;
  durationMs: number | null;
  url: string | null;
  bpm: number | null;
}

const HOT_CUE_IDS = ["C1", "C2", "C3", "C4", "C5"] as const;

export type SoundCloudHotCueId = (typeof HOT_CUE_IDS)[number];

export interface SoundCloudHotCueSlot {
  id: SoundCloudHotCueId;
  positionMs: number | null;
  trackKey: string | null;
}

export interface SoundCloudHotCueView extends SoundCloudHotCueSlot {
  isValid: boolean;
  label: string;
}

export interface SoundCloudHotCueState {
  activeTrackKey: string | null;
  isSettingCue: boolean;
  isEditingCue: boolean;
  selectedCueId: SoundCloudHotCueId | null;
  lastCueActionLabel: string | null;
  lastCueEditActionLabel: string | null;
  cues: SoundCloudHotCueView[];
}

export interface SoundCloudHotCueActions {
  toggleSetCueMode: () => void;
  toggleEditCueMode: () => void;
  triggerCue: (cueId: SoundCloudHotCueId) => void;
  nudgeSelectedCue: (deltaSeconds: number) => void;
}

const PLAYLISTS: PlaylistOption[] = [
  {
    id: "spaceships-2",
    label: "Music To Fly Spaceships To 2",
    apiUrl: "https://api.soundcloud.com/playlists/2064638424",
    sourceUrl: "https://soundcloud.com/aphex-equation/sets/music-to-fly-spaceships-to-2",
  },
  {
    id: "spaceships-1",
    label: "Music To Fly Spaceships To",
    apiUrl: "https://api.soundcloud.com/playlists/1448334760",
    sourceUrl: "https://soundcloud.com/aphex-equation/sets/music-to-fly-spaceships-to",
  },
];

const WIDGET_SCRIPT_ID = "soundcloud-widget-api";
const WIDGET_SCRIPT_SRC = "https://w.soundcloud.com/player/api.js";
const SOUNDCLOUD_WIDGET_PREFIX = "/soundcloud-widget";
const SOUNDCLOUD_WIDGET_READY_TIMEOUT_MS = 15000;
const DEFAULT_SOUNDCLOUD_VOLUME = 70;
const BPM_ANALYSIS_MAX_SAMPLE_COUNT = 1024;
const DEFAULT_MANUAL_BPM = 120;
const MIN_ACCEPTED_BPM = 60;
const MAX_ACCEPTED_BPM = 220;
const WAVEFORM_BARS = [
  24, 38, 64, 42, 72, 34, 52, 82, 46, 68, 36, 58, 76, 44, 88, 56, 32, 62, 74, 48, 92, 54, 40, 70, 84, 50, 66, 30, 60, 78,
  44, 86, 52, 36, 64, 80, 46, 72, 58, 34, 90, 48, 68, 42, 76, 54, 32, 62, 82, 46, 70, 38, 88, 56, 74, 44, 66, 30, 60, 78,
];
const DEFAULT_WAVEFORM_BAR_COUNT = WAVEFORM_BARS.length;

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

function getWidgetSrc(playlist: PlaylistOption) {
  const params = new URLSearchParams({
    url: playlist.sourceUrl,
    auto_play: "false",
    color: "#3fe9ff",
    visual: "false",
    show_artwork: "false",
    show_playcount: "false",
    show_user: "true",
    show_comments: "false",
    show_teaser: "false",
    hide_related: "true",
    buying: "false",
    sharing: "false",
    download: "false",
    single_active: "false",
  });

  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

function getResolvedWidgetSrc(playlist: PlaylistOption) {
  const rawWidgetSrc = getWidgetSrc(playlist);
  return remapThroughActivityPrefix(rawWidgetSrc, SOUNDCLOUD_WIDGET_PREFIX);
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
    // SoundCloud's widget can throw during teardown if the iframe is already gone.
  }
}

function clampSoundCloudVolume(volume: number) {
  return Math.max(0, Math.min(100, Math.round(volume)));
}

function clampUnitLevel(level: number) {
  return Math.max(0, Math.min(1, level));
}

function clampAcceptedBpm(bpm: number) {
  return Math.max(MIN_ACCEPTED_BPM, Math.min(MAX_ACCEPTED_BPM, Math.round(bpm * 10) / 10));
}

function getEffectiveSoundCloudVolume(baseVolume: number, outputLevel: number) {
  return clampSoundCloudVolume(baseVolume * clampUnitLevel(outputLevel));
}

function pickRandomIndex(length: number, currentIndex?: number) {
  if (length <= 1) {
    return 0;
  }

  let nextIndex = Math.floor(Math.random() * length);

  if (typeof currentIndex === "number" && length > 1) {
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * length);
    }
  }

  return nextIndex;
}

function getHighResolutionArtworkUrl(artworkUrl?: string | null) {
  return artworkUrl?.replace("-large", "-t500x500") ?? null;
}

function getHotCueTrackKey(currentTrackUrl: string | null) {
  return currentTrackUrl;
}

function getNormalizedSoundCloudBpm(bpm?: number | null) {
  if (!Number.isFinite(bpm) || !bpm || bpm <= 0) {
    return null;
  }

  return Math.round(bpm);
}

function createEmptyAcceptedBpmState(): SoundCloudAcceptedBpmState {
  return {
    bpm: null,
    source: "none",
    confidence: 0,
    label: "BPM --",
    updatedAt: 0,
  };
}

function createAcceptedBpmState(
  bpm: number,
  source: Exclude<SoundCloudAcceptedBpmSource, "none">,
  confidence: number,
): SoundCloudAcceptedBpmState {
  const clampedBpm = clampAcceptedBpm(bpm);
  return {
    bpm: clampedBpm,
    source,
    confidence: clampUnitLevel(confidence),
    label: `${clampedBpm.toFixed(1)} BPM ${source.toUpperCase()}`,
    updatedAt: Date.now(),
  };
}

function getSoundCloudSoundArtist(sound: SoundCloudWidgetSound | null | undefined, fallbackArtist: string) {
  return sound?.metadata_artist ?? sound?.user?.username ?? fallbackArtist;
}

function buildSoundCloudTrackListItem(sound: SoundCloudWidgetSound, index: number, fallbackArtist: string): SoundCloudTrackListItem {
  return {
    index,
    title: sound.title ?? `Track ${index + 1}`,
    artist: getSoundCloudSoundArtist(sound, fallbackArtist),
    durationMs: typeof sound.duration === "number" && Number.isFinite(sound.duration) ? sound.duration : null,
    url: sound.permalink_url ?? null,
    bpm: getNormalizedSoundCloudBpm(sound.bpm),
  };
}

function formatHotCueTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0:00.00";
  }

  const totalHundredths = Math.floor(milliseconds / 10);
  const totalSeconds = Math.floor(totalHundredths / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = totalHundredths % 100;

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
}

function formatPreciseHotCueTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0:00.000";
  }

  const totalMilliseconds = Math.floor(milliseconds);
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millisecondsPart = totalMilliseconds % 1000;

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millisecondsPart.toString().padStart(3, "0")}`;
}

function formatSeekDeltaLabel(deltaSeconds: number) {
  const sign = deltaSeconds > 0 ? "+" : "-";
  const absoluteDelta = Math.abs(deltaSeconds);

  return `${sign}${absoluteDelta.toFixed(absoluteDelta < 1 ? 2 : 0)}S`;
}

function createEmptyHotCueSlots(): SoundCloudHotCueSlot[] {
  return HOT_CUE_IDS.map((id) => ({
    id,
    positionMs: null,
    trackKey: null,
  }));
}

function buildGeneratedWaveformBars(count: number) {
  return Array.from({ length: count }, (_, index) => WAVEFORM_BARS[index % WAVEFORM_BARS.length]);
}

function buildWaveformBars(samples: number[], count = DEFAULT_WAVEFORM_BAR_COUNT) {
  if (samples.length === 0) {
    return buildGeneratedWaveformBars(count);
  }

  const bucketSize = samples.length / count;
  const buckets = Array.from({ length: count }, (_, index) => {
    const start = Math.floor(index * bucketSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
    const bucket = samples.slice(start, end);
    return bucket.reduce((largest, sample) => Math.max(largest, Math.abs(sample)), 0);
  });
  const maxSample = Math.max(...buckets);

  if (maxSample <= 0) {
    return buildGeneratedWaveformBars(count);
  }

  return buckets.map((sample) => Math.round(16 + (sample / maxSample) * 76));
}

function getBpmAnalysisSamples(samples: readonly number[]) {
  if (samples.length <= BPM_ANALYSIS_MAX_SAMPLE_COUNT) {
    return samples;
  }

  const bucketSize = samples.length / BPM_ANALYSIS_MAX_SAMPLE_COUNT;

  return Array.from({ length: BPM_ANALYSIS_MAX_SAMPLE_COUNT }, (_, index) => {
    const start = Math.floor(index * bucketSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
    let peak = 0;

    for (let sampleIndex = start; sampleIndex < end && sampleIndex < samples.length; sampleIndex += 1) {
      const sample = samples[sampleIndex];
      if (Number.isFinite(sample)) {
        peak = Math.max(peak, Math.abs(sample));
      }
    }

    return peak;
  });
}

function createSoundCloudBpmState(
  soundCloudBpm: number | null,
  waveformSamples: readonly number[],
  durationMs: number,
): SoundCloudBpmState {
  if (soundCloudBpm) {
    return {
      bpm: soundCloudBpm,
      source: "soundcloud",
      confidence: 1,
      label: `${soundCloudBpm} BPM`,
    };
  }

  const waveformAnalysis = estimateBpmFromWaveform(getBpmAnalysisSamples(waveformSamples), durationMs);

  if (waveformAnalysis.bpm && waveformAnalysis.source === "waveform") {
    return {
      bpm: waveformAnalysis.bpm,
      source: "waveform",
      confidence: waveformAnalysis.confidence,
      label: `${waveformAnalysis.bpm} BPM WAVE`,
    };
  }

  return {
    bpm: null,
    source: "none",
    confidence: 0,
    label: "BPM --",
  };
}

export function useSoundCloudPlayer({ waveformBarCount, initialPlaylistId, initialVolume }: UseSoundCloudPlayerOptions): SoundCloudPlayerController {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SoundCloudWidgetInstance | null>(null);
  const trackCountRef = useRef(0);
  const trackListRef = useRef<SoundCloudTrackListItem[]>([]);
  const currentTrackIndexRef = useRef<number | undefined>(undefined);
  const pendingAutoplayRef = useRef(false);
  const durationRef = useRef(0);
  const waveformRequestRef = useRef(0);
  const autoAcceptedMetaTrackKeyRef = useRef<string | null>(null);
  const initialVolumeRef = useRef(clampSoundCloudVolume(initialVolume ?? DEFAULT_SOUNDCLOUD_VOLUME));
  const volumeRef = useRef(initialVolumeRef.current);
  const outputLevelRef = useRef(1);

  const [selectedPlaylistId, setSelectedPlaylistId] = useState(() => (
    PLAYLISTS.some((playlist) => playlist.id === initialPlaylistId)
      ? initialPlaylistId ?? PLAYLISTS[0].id
      : PLAYLISTS[0].id
  ));
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackCount, setTrackCount] = useState(0);
  const [trackList, setTrackList] = useState<SoundCloudTrackListItem[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState("Choose a playlist and hit Shuffle & Play.");
  const [currentTrackArtist, setCurrentTrackArtist] = useState("SoundCloud");
  const [currentTrackArtistUrl, setCurrentTrackArtistUrl] = useState<string | null>(null);
  const [currentTrackArtwork, setCurrentTrackArtwork] = useState<string | null>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [currentTrackBpm, setCurrentTrackBpm] = useState<number | null>(null);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [volume, setVolumeState] = useState(volumeRef.current);
  const [outputLevel, setOutputLevelState] = useState(outputLevelRef.current);
  const [effectiveVolume, setEffectiveVolume] = useState(() => getEffectiveSoundCloudVolume(volumeRef.current, outputLevelRef.current));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isWaveformWindowOpen, setIsWaveformWindowOpen] = useState(false);
  const [isSettingCue, setIsSettingCue] = useState(false);
  const [isEditingCue, setIsEditingCue] = useState(false);
  const [selectedCueId, setSelectedCueId] = useState<SoundCloudHotCueId | null>(null);
  const [lastCueActionLabel, setLastCueActionLabel] = useState<string | null>(null);
  const [lastCueEditActionLabel, setLastCueEditActionLabel] = useState<string | null>(null);
  const [lastBpmActionLabel, setLastBpmActionLabel] = useState<string | null>(null);
  const [currentTrackAcceptedBpmState, setCurrentTrackAcceptedBpmState] = useState<SoundCloudAcceptedBpmState>(() => createEmptyAcceptedBpmState());
  const [hotCueSlots, setHotCueSlots] = useState<SoundCloudHotCueSlot[]>(() => createEmptyHotCueSlots());

  const selectedPlaylist = useMemo(
    () => PLAYLISTS.find((playlist) => playlist.id === selectedPlaylistId) ?? PLAYLISTS[0],
    [selectedPlaylistId],
  );
  const resolvedWidgetSrc = useMemo(() => getResolvedWidgetSrc(selectedPlaylist), [selectedPlaylist]);
  const hotCueTrackKey = useMemo(() => getHotCueTrackKey(currentTrackUrl), [currentTrackUrl]);
  const refreshEffectiveVolume = useCallback(() => {
    const nextEffectiveVolume = getEffectiveSoundCloudVolume(volumeRef.current, outputLevelRef.current);
    setEffectiveVolume(nextEffectiveVolume);
    safeWidgetCall(() => widgetRef.current?.setVolume(nextEffectiveVolume));
  }, []);
  const seekToPlaybackPosition = useCallback((nextPosition: number, options?: { playAfterSeek?: boolean }) => {
    const widget = widgetRef.current;
    const duration = durationRef.current || playbackDuration;

    if (!widget || duration <= 0) {
      return false;
    }

    const clampedPosition = Math.max(0, Math.min(duration, nextPosition));
    setPlaybackPosition(clampedPosition);
    widget.seekTo(clampedPosition);

    if (options?.playAfterSeek) {
      widget.play();
    }

    return true;
  }, [playbackDuration]);
  const previousHotCueTrackKeyRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (previousHotCueTrackKeyRef.current === undefined) {
      previousHotCueTrackKeyRef.current = hotCueTrackKey;
      return;
    }

    if (previousHotCueTrackKeyRef.current === hotCueTrackKey) {
      return;
    }

    previousHotCueTrackKeyRef.current = hotCueTrackKey;
    setIsSettingCue(false);
    setIsEditingCue(false);
    setSelectedCueId(null);
    setLastCueActionLabel(null);
    setLastCueEditActionLabel(null);
    setLastBpmActionLabel(null);
    setCurrentTrackAcceptedBpmState(createEmptyAcceptedBpmState());
    autoAcceptedMetaTrackKeyRef.current = null;
  }, [hotCueTrackKey]);

  useEffect(() => {
    if (!hotCueTrackKey || !currentTrackBpm || autoAcceptedMetaTrackKeyRef.current === hotCueTrackKey) {
      return;
    }

    autoAcceptedMetaTrackKeyRef.current = hotCueTrackKey;
    setCurrentTrackAcceptedBpmState(createAcceptedBpmState(currentTrackBpm, "meta", 1));
    setLastBpmActionLabel("META SET");
  }, [currentTrackBpm, hotCueTrackKey]);

  useEffect(() => {
    let isMounted = true;

    setIsScriptReady(false);
    setIsWidgetReady(false);
    setIsPlaying(false);
    setErrorMessage(null);

    loadWidgetScript()
      .then(() => {
        if (!isMounted) {
          return;
        }

        setIsScriptReady(true);
        setErrorMessage(null);
      })
      .catch((error: Error) => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error.message);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadNonce]);

  useEffect(() => {
    if (!isScriptReady || !iframeRef.current || !window.SC?.Widget) {
      return;
    }

    const widget = window.SC.Widget(iframeRef.current);
    widgetRef.current = widget;
    trackCountRef.current = 0;
    trackListRef.current = [];
    currentTrackIndexRef.current = undefined;
    durationRef.current = 0;
    setIsWidgetReady(false);
    setIsPlaying(false);
    setTrackCount(0);
    setTrackList([]);
    setCurrentTrackIndex(null);
    setCurrentTrackTitle(`Loading ${selectedPlaylist.label}...`);
    setCurrentTrackArtist("SoundCloud");
    setCurrentTrackArtistUrl(null);
    setCurrentTrackArtwork(null);
    setCurrentTrackUrl(null);
    setCurrentTrackBpm(null);
    setWaveformSamples([]);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    setIsSettingCue(false);
    setIsEditingCue(false);
    setSelectedCueId(null);
    setLastCueActionLabel(null);
    setLastCueEditActionLabel(null);
    setVolumeState(volumeRef.current);
    setOutputLevelState(outputLevelRef.current);
    setEffectiveVolume(getEffectiveSoundCloudVolume(volumeRef.current, outputLevelRef.current));
    setErrorMessage(null);
    const readyTimeoutId = window.setTimeout(() => {
      setErrorMessage("SoundCloud widget did not finish loading in Discord.");
    }, SOUNDCLOUD_WIDGET_READY_TIMEOUT_MS);

    const updatePlaybackTiming = () => {
      widget.getPosition((position) => {
        setPlaybackPosition(position);
      });

      widget.getDuration((duration) => {
        durationRef.current = duration;
        setPlaybackDuration(duration);
      });
    };

    const setCurrentSoundDetails = (fallbackTitle: string) => {
      widget.getCurrentSound((sound) => {
        setCurrentTrackTitle(sound?.title ?? fallbackTitle);
        setCurrentTrackArtist(getSoundCloudSoundArtist(sound, selectedPlaylist.label));
        setCurrentTrackArtistUrl(sound?.user?.permalink_url ?? null);
        setCurrentTrackArtwork(getHighResolutionArtworkUrl(sound?.artwork_url));
        setCurrentTrackUrl(sound?.permalink_url ?? null);
        setCurrentTrackBpm(getNormalizedSoundCloudBpm(sound?.bpm));

        if (sound?.permalink_url) {
          const matchedTrack = trackListRef.current.find((track) => track.url === sound.permalink_url);

          if (matchedTrack) {
            currentTrackIndexRef.current = matchedTrack.index;
            setCurrentTrackIndex(matchedTrack.index);
          }
        }

        const waveformUrl = sound?.waveform_url;
        const requestId = waveformRequestRef.current + 1;
        waveformRequestRef.current = requestId;

        if (!waveformUrl) {
          setWaveformSamples([]);
          return;
        }

        fetch(waveformUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to load SoundCloud waveform.");
            }

            return response.json() as Promise<SoundCloudWaveformData>;
          })
          .then((waveform) => {
            if (waveformRequestRef.current !== requestId) {
              return;
            }

            setWaveformSamples(waveform.samples ?? []);
          })
          .catch(() => {
            if (waveformRequestRef.current === requestId) {
              setWaveformSamples([]);
            }
          });
      });
      updatePlaybackTiming();
    };

    const refreshTrackList = () => {
      widget.getSounds((sounds) => {
        const count = sounds.length;
        const nextTrackList = sounds.map((sound, index) => buildSoundCloudTrackListItem(sound, index, selectedPlaylist.label));
        trackListRef.current = nextTrackList;
        trackCountRef.current = count;
        setTrackList(nextTrackList);
        setTrackCount(count);

        if (count === 0) {
          setCurrentTrackTitle("No playable tracks found in this playlist.");
          setCurrentTrackIndex(null);
          return;
        }

        if (pendingAutoplayRef.current) {
          const nextIndex = pickRandomIndex(count);
          currentTrackIndexRef.current = nextIndex;
          setCurrentTrackIndex(nextIndex);
          widget.skip(nextIndex);
          widget.play();
          pendingAutoplayRef.current = false;
          return;
        }

        setCurrentSoundDetails(`${count} tracks loaded.`);
      });
    };

    widget.bind(window.SC.Widget.Events.READY, () => {
      window.clearTimeout(readyTimeoutId);
      setIsWidgetReady(true);
      setErrorMessage(null);
      refreshEffectiveVolume();
      setVolumeState(volumeRef.current);
      updatePlaybackTiming();
      refreshTrackList();
    });

    widget.bind(window.SC.Widget.Events.PLAY, () => {
      setIsPlaying(true);
      setCurrentSoundDetails("Now playing from SoundCloud.");
    });

    widget.bind(window.SC.Widget.Events.PAUSE, () => {
      setIsPlaying(false);
      updatePlaybackTiming();
    });

    widget.bind(window.SC.Widget.Events.FINISH, () => {
      const count = trackCountRef.current;

      if (count === 0) {
        return;
      }

      const nextIndex = pickRandomIndex(count, currentTrackIndexRef.current);
      currentTrackIndexRef.current = nextIndex;
      setCurrentTrackIndex(nextIndex);
      widget.skip(nextIndex);
      widget.play();
    });

    widget.bind(window.SC.Widget.Events.ERROR, () => {
      setErrorMessage("SoundCloud reported a playback error for this playlist.");
    });

    const timingInterval = window.setInterval(() => {
      if (widgetRef.current === widget) {
        updatePlaybackTiming();
      }
    }, 1000);

    return () => {
      window.clearInterval(timingInterval);
      window.clearTimeout(readyTimeoutId);

      if (widgetRef.current === widget) {
        widgetRef.current = null;
      }

      safeWidgetCall(() => widget.pause());
    };
  }, [isScriptReady, refreshEffectiveVolume, selectedPlaylist.id, selectedPlaylist.label, selectedPlaylist.sourceUrl]);

  const retry = useCallback(() => {
    widgetRef.current = null;
    trackCountRef.current = 0;
    trackListRef.current = [];
    currentTrackIndexRef.current = undefined;
    pendingAutoplayRef.current = false;
    setTrackCount(0);
    setTrackList([]);
    setCurrentTrackIndex(null);
    setCurrentTrackTitle(`Retrying ${selectedPlaylist.label}...`);
    setCurrentTrackArtist("SoundCloud");
    setCurrentTrackArtistUrl(null);
    setCurrentTrackArtwork(null);
    setCurrentTrackUrl(null);
    setCurrentTrackBpm(null);
    setWaveformSamples([]);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    setIsSettingCue(false);
    setIsEditingCue(false);
    setSelectedCueId(null);
    setLastCueActionLabel(null);
    setLastCueEditActionLabel(null);
    setVolumeState(volumeRef.current);
    setOutputLevelState(outputLevelRef.current);
    setEffectiveVolume(getEffectiveSoundCloudVolume(volumeRef.current, outputLevelRef.current));
    durationRef.current = 0;
    setReloadNonce((current) => current + 1);
  }, [selectedPlaylist.label]);

  const controlsDisabled = !isScriptReady || Boolean(errorMessage);
  const waveformProgress = playbackDuration > 0 ? Math.min(1, Math.max(0, playbackPosition / playbackDuration)) : 0;
  const waveformBars = useMemo(() => buildWaveformBars(waveformSamples, waveformBarCount), [waveformBarCount, waveformSamples]);
  const currentTrackBpmState = useMemo(() => createSoundCloudBpmState(
    currentTrackBpm,
    waveformSamples,
    playbackDuration,
  ), [currentTrackBpm, playbackDuration, waveformSamples]);
  const currentTrackLengthBpmEstimate = useMemo(() => estimateBpmFromLength(playbackDuration, {
    metadataBpm: currentTrackBpm,
    waveformBpm: currentTrackBpmState.source === "waveform" ? currentTrackBpmState.bpm : null,
  }), [currentTrackBpm, currentTrackBpmState.bpm, currentTrackBpmState.source, playbackDuration]);

  const shufflePlay = useCallback(() => {
    const widget = widgetRef.current;
    const count = trackCountRef.current;

    if (!widget || count === 0) {
      pendingAutoplayRef.current = true;
      return;
    }

    const nextIndex = pickRandomIndex(count, currentTrackIndexRef.current);
    currentTrackIndexRef.current = nextIndex;
    setCurrentTrackIndex(nextIndex);
    setIsSettingCue(false);
    setIsEditingCue(false);
    setSelectedCueId(null);
    setLastCueActionLabel(null);
    setLastCueEditActionLabel(null);
    widget.skip(nextIndex);
    widget.play();
  }, []);

  const loadTrackByIndex = useCallback((trackIndex: number) => {
    const widget = widgetRef.current;
    const count = trackCountRef.current;

    if (!widget || count === 0) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(count - 1, Math.floor(trackIndex)));
    currentTrackIndexRef.current = nextIndex;
    setCurrentTrackIndex(nextIndex);
    setIsSettingCue(false);
    setIsEditingCue(false);
    setSelectedCueId(null);
    setLastCueActionLabel(null);
    setLastCueEditActionLabel(null);
    widget.skip(nextIndex);
    widget.play();
  }, []);

  const togglePlayback = useCallback(() => {
    const widget = widgetRef.current;

    if (!widget) {
      return;
    }

    widget.toggle();
  }, []);

  const seekWaveform = useCallback((seekRatio: number) => {
    const duration = durationRef.current || playbackDuration;

    if (duration <= 0) {
      return;
    }

    seekToPlaybackPosition(duration * seekRatio);
  }, [playbackDuration, seekToPlaybackPosition]);

  const seekTo = useCallback((positionMs: number, options?: { playAfterSeek?: boolean }) => (
    seekToPlaybackPosition(positionMs, options)
  ), [seekToPlaybackPosition]);

  const seekBy = useCallback((deltaSeconds: number) => {
    const didSeek = seekToPlaybackPosition(playbackPosition + deltaSeconds * 1000);

    if (didSeek) {
      setLastCueActionLabel(`SEEK ${formatSeekDeltaLabel(deltaSeconds)}`);
    }

    return didSeek;
  }, [playbackPosition, seekToPlaybackPosition]);

  const changePlaylist = useCallback((playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    pendingAutoplayRef.current = true;
    setIsSettingCue(false);
    setIsEditingCue(false);
    setSelectedCueId(null);
    setLastCueActionLabel(null);
    setLastCueEditActionLabel(null);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const clampedVolume = clampSoundCloudVolume(nextVolume);
    volumeRef.current = clampedVolume;
    setVolumeState(clampedVolume);
    refreshEffectiveVolume();
  }, [refreshEffectiveVolume]);

  const setOutputLevel = useCallback((nextLevel: number) => {
    const clampedLevel = clampUnitLevel(nextLevel);
    outputLevelRef.current = clampedLevel;
    setOutputLevelState(clampedLevel);
    refreshEffectiveVolume();
  }, [refreshEffectiveVolume]);

  const acceptMetadataBpm = useCallback(() => {
    if (!currentTrackBpm) {
      setLastBpmActionLabel("NO META");
      return;
    }

    setCurrentTrackAcceptedBpmState(createAcceptedBpmState(currentTrackBpm, "meta", 1));
    setLastBpmActionLabel("META SET");
  }, [currentTrackBpm]);

  const acceptWaveformBpm = useCallback(() => {
    if (!currentTrackBpmState.bpm || currentTrackBpmState.source !== "waveform") {
      setLastBpmActionLabel(currentTrackBpmState.source === "none" ? "NO WAVE" : "LOW CONF");
      return;
    }

    setCurrentTrackAcceptedBpmState(createAcceptedBpmState(
      currentTrackBpmState.bpm,
      "wave",
      currentTrackBpmState.confidence,
    ));
    setLastBpmActionLabel("WAVE SET");
  }, [currentTrackBpmState.bpm, currentTrackBpmState.confidence, currentTrackBpmState.source]);

  const acceptLengthBpm = useCallback(() => {
    if (!currentTrackLengthBpmEstimate.bpm) {
      setLastBpmActionLabel("NO LENGTH");
      return;
    }

    setCurrentTrackAcceptedBpmState(createAcceptedBpmState(
      currentTrackLengthBpmEstimate.bpm,
      "length",
      currentTrackLengthBpmEstimate.confidence,
    ));
    setLastBpmActionLabel("LENGTH SET");
  }, [currentTrackLengthBpmEstimate.bpm, currentTrackLengthBpmEstimate.confidence]);

  const adjustAcceptedBpm = useCallback((deltaBpm: number) => {
    const seedBpm =
      currentTrackAcceptedBpmState.bpm ??
      currentTrackBpm ??
      (currentTrackBpmState.source === "waveform" ? currentTrackBpmState.bpm : null) ??
      currentTrackLengthBpmEstimate.bpm ??
      DEFAULT_MANUAL_BPM;
    const nextBpm = seedBpm + deltaBpm;

    setCurrentTrackAcceptedBpmState(createAcceptedBpmState(nextBpm, "manual", 1));
    setLastBpmActionLabel(deltaBpm >= 0 ? "BPM UP" : "BPM DOWN");
  }, [
    currentTrackAcceptedBpmState.bpm,
    currentTrackBpm,
    currentTrackBpmState.bpm,
    currentTrackBpmState.source,
    currentTrackLengthBpmEstimate.bpm,
  ]);

  const clearAcceptedBpm = useCallback(() => {
    autoAcceptedMetaTrackKeyRef.current = hotCueTrackKey;
    setCurrentTrackAcceptedBpmState(createEmptyAcceptedBpmState());
    setLastBpmActionLabel("CLEARED");
  }, [hotCueTrackKey]);

  const toggleSetCueMode = useCallback(() => {
    setIsSettingCue((current) => {
      const nextValue = !current;
      if (nextValue) {
        setIsEditingCue(false);
        setSelectedCueId(null);
        setLastCueEditActionLabel(null);
      }
      setLastCueActionLabel(nextValue ? "SET CUE ON" : "SET CUE OFF");
      return nextValue;
    });
  }, []);

  const toggleEditCueMode = useCallback(() => {
    setIsEditingCue((current) => {
      const nextValue = !current;
      setIsSettingCue(false);
      setSelectedCueId(null);
      setLastCueActionLabel(nextValue ? "EDIT CUE ON" : "EDIT CUE OFF");
      setLastCueEditActionLabel(nextValue ? "SELECT CUE" : null);
      return nextValue;
    });
  }, []);

  const triggerCue = useCallback((cueId: SoundCloudHotCueId) => {
    const cue = hotCueSlots.find((slot) => slot.id === cueId);

    if (!cue) {
      setLastCueActionLabel("LOAD TRACK");
      return;
    }

    if (isEditingCue) {
      if (!hotCueTrackKey || (durationRef.current || playbackDuration) <= 0) {
        setLastCueActionLabel("LOAD TRACK");
        setLastCueEditActionLabel("LOAD TRACK");
        return;
      }

      const nextPosition = cue.positionMs !== null && cue.trackKey === hotCueTrackKey
        ? cue.positionMs
        : playbackPosition;

      if (cue.positionMs === null || cue.trackKey !== hotCueTrackKey) {
        setHotCueSlots((currentSlots) => currentSlots.map((slot) => (
          slot.id === cueId
            ? {
                id: cueId,
                positionMs: nextPosition,
                trackKey: hotCueTrackKey,
              }
            : slot
        )));
      }

      setSelectedCueId(cueId);
      setLastCueActionLabel(`EDIT ${cueId}`);
      setLastCueEditActionLabel(`${cueId} ${formatPreciseHotCueTime(nextPosition)}`);
      return;
    }

    if (isSettingCue) {
      if (!hotCueTrackKey || (durationRef.current || playbackDuration) <= 0) {
        setLastCueActionLabel("LOAD TRACK");
        return;
      }

      setHotCueSlots((currentSlots) => currentSlots.map((slot) => (
        slot.id === cueId
          ? {
              id: cueId,
              positionMs: playbackPosition,
              trackKey: hotCueTrackKey,
            }
          : slot
      )));
      setIsSettingCue(false);
      setLastCueActionLabel(`${cueId} SAVED`);
      return;
    }

    if (cue.positionMs === null) {
      if (!hotCueTrackKey || (durationRef.current || playbackDuration) <= 0) {
        setLastCueActionLabel("LOAD TRACK");
        return;
      }

      setHotCueSlots((currentSlots) => currentSlots.map((slot) => (
        slot.id === cueId
          ? {
              id: cueId,
              positionMs: playbackPosition,
              trackKey: hotCueTrackKey,
            }
          : slot
      )));
      setLastCueActionLabel(`${cueId} SAVED`);
      return;
    }

    if (!hotCueTrackKey || cue.trackKey !== hotCueTrackKey) {
      setLastCueActionLabel(`${cueId} STALE`);
      return;
    }

    if (!seekToPlaybackPosition(cue.positionMs, { playAfterSeek: true })) {
      setLastCueActionLabel("LOAD TRACK");
      return;
    }

    setLastCueActionLabel(`JUMP ${cueId}`);
  }, [hotCueSlots, hotCueTrackKey, isEditingCue, isSettingCue, playbackDuration, playbackPosition, seekToPlaybackPosition]);

  const nudgeSelectedCue = useCallback((deltaSeconds: number) => {
    if (!isEditingCue || !selectedCueId) {
      setLastCueActionLabel("SELECT CUE");
      setLastCueEditActionLabel("SELECT CUE");
      return;
    }

    const duration = durationRef.current || playbackDuration;

    if (!hotCueTrackKey || duration <= 0) {
      setLastCueActionLabel("LOAD TRACK");
      setLastCueEditActionLabel("LOAD TRACK");
      return;
    }

    const selectedSlot = hotCueSlots.find((slot) => slot.id === selectedCueId);
    const basePosition = selectedSlot?.positionMs !== null && selectedSlot?.trackKey === hotCueTrackKey
      ? selectedSlot.positionMs
      : playbackPosition;
    const nextPosition = Math.max(0, Math.min(duration, basePosition + deltaSeconds * 1000));

    setHotCueSlots((currentSlots) => currentSlots.map((slot) => {
      if (slot.id !== selectedCueId) {
        return slot;
      }

      return {
        id: selectedCueId,
        positionMs: nextPosition,
        trackKey: hotCueTrackKey,
      };
    }));

    setLastCueActionLabel(`${selectedCueId} ${formatSeekDeltaLabel(deltaSeconds)}`);
    setLastCueEditActionLabel(`${selectedCueId} ${formatPreciseHotCueTime(nextPosition)}`);
  }, [hotCueSlots, hotCueTrackKey, isEditingCue, playbackDuration, playbackPosition, selectedCueId]);

  const hotCueCues = useMemo<SoundCloudHotCueView[]>(() => hotCueSlots.map((slot) => {
    const isValid = slot.positionMs !== null && slot.trackKey === hotCueTrackKey;
    const label = slot.positionMs === null
      ? `${slot.id} EMPTY`
      : isValid
        ? `${slot.id} ${formatHotCueTime(slot.positionMs)}`
        : `${slot.id} STALE ${formatHotCueTime(slot.positionMs)}`;

    return {
      ...slot,
      isValid,
      label,
    };
  }), [hotCueSlots, hotCueTrackKey]);

  const state: SoundCloudPlayerState = {
    playlistId: selectedPlaylist.id,
    playlistLabel: selectedPlaylist.label,
    trackCount,
    trackList,
    currentTrackIndex,
    currentTrackTitle,
    currentTrackArtist,
    currentTrackUrl,
    currentTrackBpm,
    currentTrackBpmState,
    currentTrackAcceptedBpmState,
    lastBpmActionLabel,
    artworkUrl: currentTrackArtwork,
    isScriptReady,
    isWidgetReady,
    isPlaying,
    playbackPosition,
    playbackDuration,
    progress: waveformProgress,
    waveformBars,
    errorMessage,
    selectedPlaylistId,
    playlists: PLAYLISTS,
    controlsDisabled,
    waveformProgress,
    isWaveformWindowOpen,
    selectedPlaylist,
    resolvedWidgetSrc,
    currentTrackArtistUrl,
    volume,
    outputLevel,
    effectiveVolume,
  };
  const actions: SoundCloudPlayerActions = {
    togglePlayback,
    shufflePlay,
    loadTrackByIndex,
    retry,
    changePlaylist,
    seekBy,
    seekTo,
    seekWaveform,
    setVolume,
    setOutputLevel,
    acceptMetadataBpm,
    acceptWaveformBpm,
    acceptLengthBpm,
    adjustAcceptedBpm,
    clearAcceptedBpm,
    openWaveformWindow: () => setIsWaveformWindowOpen(true),
    closeWaveformWindow: () => setIsWaveformWindowOpen(false),
  };
  const bpmActions: SoundCloudBpmActions = {
    acceptMetadataBpm,
    acceptWaveformBpm,
    acceptLengthBpm,
    adjustAcceptedBpm,
    clearAcceptedBpm,
  };
  const hotCueState: SoundCloudHotCueState = {
    activeTrackKey: hotCueTrackKey,
    isSettingCue,
    isEditingCue,
    selectedCueId,
    lastCueActionLabel,
    lastCueEditActionLabel,
    cues: hotCueCues,
  };
  const hotCueActions: SoundCloudHotCueActions = {
    toggleSetCueMode,
    toggleEditCueMode,
    triggerCue,
    nudgeSelectedCue,
  };
  const jukeboxDisplay: JukeboxDisplayState = {
    playlistId: state.playlistId,
    playlistLabel: state.playlistLabel,
    trackCount: state.trackCount,
    trackList: state.trackList,
    currentTrackIndex: state.currentTrackIndex,
    currentTrackTitle: state.currentTrackTitle,
    currentTrackArtist: state.currentTrackArtist,
    currentTrackUrl: state.currentTrackUrl,
    currentTrackBpm: state.currentTrackBpm,
    currentTrackBpmState: state.currentTrackBpmState,
    currentTrackAcceptedBpmState: state.currentTrackAcceptedBpmState,
    lastBpmActionLabel: state.lastBpmActionLabel,
    artworkUrl: state.artworkUrl,
    isScriptReady: state.isScriptReady,
    isWidgetReady: state.isWidgetReady,
    isPlaying: state.isPlaying,
    playbackPosition: state.playbackPosition,
    playbackDuration: state.playbackDuration,
    progress: state.progress,
    waveformBars: state.waveformBars,
    errorMessage: state.errorMessage,
  };
  const jukeboxActions: JukeboxActions = {
    togglePlayback,
    shufflePlay,
    loadTrackByIndex,
    retry,
  };

  return {
    iframeRef,
    state,
    actions,
    hotCueState,
    hotCueActions,
    jukeboxDisplay,
    jukeboxActions,
    bpmActions,
  };
}
