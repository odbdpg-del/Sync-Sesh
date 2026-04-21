import { useEffect, useMemo, useRef, useState } from "react";

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
  currentTrackTitle: string;
  currentTrackArtist: string;
  currentTrackUrl: string | null;
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
  retry: () => void;
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
}

export interface SoundCloudPlayerActions extends JukeboxActions {
  changePlaylist: (playlistId: string) => void;
  seekWaveform: (ratio: number) => void;
  setVolume: (volume: number) => void;
  openWaveformWindow: () => void;
  closeWaveformWindow: () => void;
}

export interface SoundCloudPlayerController {
  iframeRef: {
    current: HTMLIFrameElement | null;
  };
  state: SoundCloudPlayerState;
  actions: SoundCloudPlayerActions;
  jukeboxDisplay: JukeboxDisplayState;
  jukeboxActions: JukeboxActions;
}

interface UseSoundCloudPlayerOptions {
  waveformBarCount: number;
}

interface SoundCloudWaveformData {
  height?: number;
  samples?: number[];
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
  return rawWidgetSrc;
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

export function useSoundCloudPlayer({ waveformBarCount }: UseSoundCloudPlayerOptions): SoundCloudPlayerController {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SoundCloudWidgetInstance | null>(null);
  const trackCountRef = useRef(0);
  const currentTrackIndexRef = useRef<number | undefined>(undefined);
  const pendingAutoplayRef = useRef(false);
  const durationRef = useRef(0);
  const waveformRequestRef = useRef(0);

  const [selectedPlaylistId, setSelectedPlaylistId] = useState(PLAYLISTS[0].id);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackCount, setTrackCount] = useState(0);
  const [currentTrackTitle, setCurrentTrackTitle] = useState("Choose a playlist and hit Shuffle & Play.");
  const [currentTrackArtist, setCurrentTrackArtist] = useState("SoundCloud");
  const [currentTrackArtistUrl, setCurrentTrackArtistUrl] = useState<string | null>(null);
  const [currentTrackArtwork, setCurrentTrackArtwork] = useState<string | null>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [volume, setVolumeState] = useState(70);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isWaveformWindowOpen, setIsWaveformWindowOpen] = useState(false);

  const selectedPlaylist = useMemo(
    () => PLAYLISTS.find((playlist) => playlist.id === selectedPlaylistId) ?? PLAYLISTS[0],
    [selectedPlaylistId],
  );
  const resolvedWidgetSrc = useMemo(() => getResolvedWidgetSrc(selectedPlaylist), [selectedPlaylist]);

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
    currentTrackIndexRef.current = undefined;
    durationRef.current = 0;
    setIsWidgetReady(false);
    setIsPlaying(false);
    setTrackCount(0);
    setCurrentTrackTitle(`Loading ${selectedPlaylist.label}...`);
    setCurrentTrackArtist("SoundCloud");
    setCurrentTrackArtistUrl(null);
    setCurrentTrackArtwork(null);
    setCurrentTrackUrl(null);
    setWaveformSamples([]);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    setVolumeState(70);
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
        setCurrentTrackArtist(sound?.metadata_artist ?? sound?.user?.username ?? selectedPlaylist.label);
        setCurrentTrackArtistUrl(sound?.user?.permalink_url ?? null);
        setCurrentTrackArtwork(getHighResolutionArtworkUrl(sound?.artwork_url));
        setCurrentTrackUrl(sound?.permalink_url ?? selectedPlaylist.sourceUrl);

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
        trackCountRef.current = count;
        setTrackCount(count);

        if (count === 0) {
          setCurrentTrackTitle("No playable tracks found in this playlist.");
          return;
        }

        if (pendingAutoplayRef.current) {
          const nextIndex = pickRandomIndex(count);
          currentTrackIndexRef.current = nextIndex;
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
      widget.getVolume((nextVolume) => {
        setVolumeState(Number.isFinite(nextVolume) ? nextVolume : 70);
      });
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
  }, [isScriptReady, selectedPlaylist.id, selectedPlaylist.label, selectedPlaylist.sourceUrl]);

  const retry = () => {
    widgetRef.current = null;
    trackCountRef.current = 0;
    currentTrackIndexRef.current = undefined;
    pendingAutoplayRef.current = false;
    setTrackCount(0);
    setCurrentTrackTitle(`Retrying ${selectedPlaylist.label}...`);
    setCurrentTrackArtist("SoundCloud");
    setCurrentTrackArtistUrl(null);
    setCurrentTrackArtwork(null);
    setCurrentTrackUrl(null);
    setWaveformSamples([]);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    setVolumeState(70);
    durationRef.current = 0;
    setReloadNonce((current) => current + 1);
  };

  const controlsDisabled = !isScriptReady || Boolean(errorMessage);
  const waveformProgress = playbackDuration > 0 ? Math.min(1, Math.max(0, playbackPosition / playbackDuration)) : 0;
  const waveformBars = useMemo(() => buildWaveformBars(waveformSamples, waveformBarCount), [waveformBarCount, waveformSamples]);

  const shufflePlay = () => {
    const widget = widgetRef.current;
    const count = trackCountRef.current;

    if (!widget || count === 0) {
      pendingAutoplayRef.current = true;
      return;
    }

    const nextIndex = pickRandomIndex(count, currentTrackIndexRef.current);
    currentTrackIndexRef.current = nextIndex;
    widget.skip(nextIndex);
    widget.play();
  };

  const togglePlayback = () => {
    const widget = widgetRef.current;

    if (!widget) {
      return;
    }

    widget.toggle();
  };

  const seekWaveform = (seekRatio: number) => {
    const widget = widgetRef.current;
    const duration = durationRef.current || playbackDuration;

    if (!widget || duration <= 0) {
      return;
    }

    const nextPosition = duration * seekRatio;
    setPlaybackPosition(nextPosition);
    widget.seekTo(nextPosition);
  };

  const changePlaylist = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    pendingAutoplayRef.current = true;
  };

  const setVolume = (nextVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, Math.round(nextVolume)));
    setVolumeState(clampedVolume);
    safeWidgetCall(() => widgetRef.current?.setVolume(clampedVolume));
  };

  const state: SoundCloudPlayerState = {
    playlistId: selectedPlaylist.id,
    playlistLabel: selectedPlaylist.label,
    trackCount,
    currentTrackTitle,
    currentTrackArtist,
    currentTrackUrl,
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
  };
  const actions: SoundCloudPlayerActions = {
    togglePlayback,
    shufflePlay,
    retry,
    changePlaylist,
    seekWaveform,
    setVolume,
    openWaveformWindow: () => setIsWaveformWindowOpen(true),
    closeWaveformWindow: () => setIsWaveformWindowOpen(false),
  };
  const jukeboxDisplay: JukeboxDisplayState = {
    playlistId: state.playlistId,
    playlistLabel: state.playlistLabel,
    trackCount: state.trackCount,
    currentTrackTitle: state.currentTrackTitle,
    currentTrackArtist: state.currentTrackArtist,
    currentTrackUrl: state.currentTrackUrl,
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
    retry,
  };

  return {
    iframeRef,
    state,
    actions,
    jukeboxDisplay,
    jukeboxActions,
  };
}
