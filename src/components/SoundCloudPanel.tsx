import { useEffect, useMemo, useRef, useState } from "react";

interface PlaylistOption {
  id: string;
  label: string;
  apiUrl: string;
  sourceUrl: string;
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
const SOUNDCLOUD_API_PREFIX = "/soundcloud-api";

interface CurrentTrackInfo {
  title: string;
  artist: string;
  artworkUrl?: string;
  permalinkUrl?: string;
  artistPermalinkUrl?: string;
}

function formatDuration(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

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

function getWidgetSrc(apiUrl: string) {
  const resolvedPlaylistUrl = remapThroughActivityPrefix(apiUrl, SOUNDCLOUD_API_PREFIX);
  const params = new URLSearchParams({
    url: resolvedPlaylistUrl,
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

function getResolvedWidgetSrc(apiUrl: string) {
  const rawWidgetSrc = getWidgetSrc(apiUrl);
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

function upscaleArtworkUrl(artworkUrl?: string | null) {
  if (!artworkUrl) {
    return undefined;
  }

  return artworkUrl.replace("-large", "-t500x500");
}

function normalizeSound(sound: SoundCloudWidgetSound | null | undefined): CurrentTrackInfo | null {
  if (!sound) {
    return null;
  }

  return {
    title: sound.title ?? "Untitled track",
    artist: sound.metadata_artist ?? sound.user?.username ?? "Unknown artist",
    artworkUrl: upscaleArtworkUrl(sound.artwork_url),
    permalinkUrl: sound.permalink_url,
    artistPermalinkUrl: sound.user?.permalink_url,
  };
}

export function SoundCloudPanel() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SoundCloudWidgetInstance | null>(null);
  const soundsRef = useRef<SoundCloudWidgetSound[]>([]);
  const trackCountRef = useRef(0);
  const currentTrackIndexRef = useRef<number | undefined>(undefined);
  const pendingAutoplayRef = useRef(false);

  const [selectedPlaylistId, setSelectedPlaylistId] = useState(PLAYLISTS[0].id);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackCount, setTrackCount] = useState(0);
  const [currentTrackTitle, setCurrentTrackTitle] = useState("Choose a playlist and hit Shuffle & Play.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrackInfo | null>(null);
  const [volume, setVolume] = useState(70);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);

  const selectedPlaylist = useMemo(
    () => PLAYLISTS.find((playlist) => playlist.id === selectedPlaylistId) ?? PLAYLISTS[0],
    [selectedPlaylistId],
  );

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
    setIsWidgetReady(false);
    setIsPlaying(false);
    setTrackCount(0);
    setCurrentTrackTitle(`Loading ${selectedPlaylist.label}...`);
    setCurrentTrack(null);
    setVolume(70);
    setDurationMs(0);
    setPositionMs(0);
    setErrorMessage(null);

    const updateCurrentTrack = (sound: SoundCloudWidgetSound | null | undefined, fallbackTitle?: string) => {
      const normalizedSound = normalizeSound(sound);

      if (normalizedSound) {
        setCurrentTrack(normalizedSound);
        setCurrentTrackTitle(normalizedSound.title);
        return;
      }

      setCurrentTrack((previousTrack) =>
        previousTrack ?? {
          title: fallbackTitle ?? "Now playing from SoundCloud.",
          artist: selectedPlaylist.label,
          permalinkUrl: selectedPlaylist.sourceUrl,
        },
      );
      setCurrentTrackTitle(fallbackTitle ?? "Now playing from SoundCloud.");
    };

    const refreshTrackList = () => {
      widget.getSounds((sounds) => {
        soundsRef.current = sounds;
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
          updateCurrentTrack(sounds[nextIndex], sounds[nextIndex]?.title ?? `${selectedPlaylist.label} loaded.`);
          widget.skip(nextIndex);
          widget.play();
          pendingAutoplayRef.current = false;
          return;
        }

        widget.getCurrentSound((sound) => {
          updateCurrentTrack(sound, `${count} tracks loaded.`);
        });
      });
    };

    widget.bind(window.SC.Widget.Events.READY, () => {
      setIsWidgetReady(true);
      widget.getVolume((nextVolume) => {
        setVolume(Number.isFinite(nextVolume) ? nextVolume : 70);
      });
      widget.getDuration((nextDuration) => {
        setDurationMs(Number.isFinite(nextDuration) ? nextDuration : 0);
      });
      refreshTrackList();
    });

    widget.bind(window.SC.Widget.Events.PLAY, () => {
      setIsPlaying(true);
      widget.getCurrentSound((sound) => {
        updateCurrentTrack(sound, "Now playing from SoundCloud.");
      });
      widget.getDuration((nextDuration) => {
        setDurationMs(Number.isFinite(nextDuration) ? nextDuration : 0);
      });
    });

    widget.bind(window.SC.Widget.Events.PAUSE, () => {
      setIsPlaying(false);
    });

    widget.bind(window.SC.Widget.Events.FINISH, () => {
      const count = trackCountRef.current;

      if (count === 0) {
        return;
      }

      const nextIndex = pickRandomIndex(count, currentTrackIndexRef.current);
      currentTrackIndexRef.current = nextIndex;
      updateCurrentTrack(soundsRef.current[nextIndex], soundsRef.current[nextIndex]?.title ?? "Now playing from SoundCloud.");
      setPositionMs(0);
      widget.skip(nextIndex);
      widget.play();
    });

    widget.bind(window.SC.Widget.Events.ERROR, () => {
      setErrorMessage("SoundCloud reported a playback error for this playlist.");
    });

    return () => {
      if (widgetRef.current === widget) {
        widgetRef.current = null;
      }

      safeWidgetCall(() => widget.pause());
    };
  }, [isScriptReady, selectedPlaylist.id, selectedPlaylist.label]);

  useEffect(() => {
    if (!isWidgetReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const widget = widgetRef.current;

      if (!widget) {
        return;
      }

      widget.getPosition((nextPosition) => {
        setPositionMs(Number.isFinite(nextPosition) ? nextPosition : 0);
      });

      widget.getDuration((nextDuration) => {
        setDurationMs(Number.isFinite(nextDuration) ? nextDuration : 0);
      });
    }, isPlaying ? 300 : 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, isWidgetReady]);

  const handleRetry = () => {
    widgetRef.current = null;
    trackCountRef.current = 0;
    currentTrackIndexRef.current = undefined;
    soundsRef.current = [];
    pendingAutoplayRef.current = false;
    setTrackCount(0);
    setCurrentTrackTitle(`Retrying ${selectedPlaylist.label}...`);
    setCurrentTrack(null);
    setVolume(70);
    setDurationMs(0);
    setPositionMs(0);
    setReloadNonce((current) => current + 1);
  };

  const controlsDisabled = !isScriptReady || Boolean(errorMessage);

  const handleShufflePlay = () => {
    const widget = widgetRef.current;
    const count = trackCountRef.current;

    if (!widget || count === 0) {
      pendingAutoplayRef.current = true;
      return;
    }

    const nextIndex = pickRandomIndex(count, currentTrackIndexRef.current);
    currentTrackIndexRef.current = nextIndex;
    const nextSound = soundsRef.current[nextIndex];
    setCurrentTrack(normalizeSound(nextSound));
    setCurrentTrackTitle(nextSound?.title ?? "Now playing from SoundCloud.");
    widget.skip(nextIndex);
    widget.play();
  };

  const handleTogglePlayback = () => {
    const widget = widgetRef.current;

    if (!widget) {
      return;
    }

    widget.toggle();
  };

  const handlePlaylistChange = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    pendingAutoplayRef.current = true;
  };

  const handleVolumeChange = (nextVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, Math.round(nextVolume)));
    setVolume(clampedVolume);
    safeWidgetCall(() => widgetRef.current?.setVolume(clampedVolume));
  };

  const progressRatio = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;

  const handleTimelineChange = (nextRatio: number) => {
    const widget = widgetRef.current;

    if (!widget || durationMs <= 0) {
      return;
    }

    const clampedRatio = Math.max(0, Math.min(1, nextRatio));
    const nextPosition = Math.round(durationMs * clampedRatio);
    setPositionMs(nextPosition);
    safeWidgetCall(() => widget.seekTo(nextPosition));
  };

  return (
    <section className="panel soundcloud-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SoundCloud</p>
          <h2>Shuffle Radio</h2>
        </div>
        <div className="status-stack">
        <span className="capacity-pill">{trackCount} tracks</span>
          <span className={`sync-pill ${isPlaying ? "sync-connected" : "sync-connecting"}`}>{isPlaying ? "Playing" : "Standby"}</span>
        </div>
      </div>

      <div className="soundcloud-controls">
        <label className="soundcloud-select-wrap">
          <span className="meta-label">Playlist</span>
          <select value={selectedPlaylistId} onChange={(event) => handlePlaylistChange(event.target.value)} className="soundcloud-select">
            {PLAYLISTS.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.label}
              </option>
            ))}
          </select>
        </label>

        <div className="soundcloud-actions">
          <button type="button" className="primary-button" onClick={handleShufflePlay} disabled={controlsDisabled}>
            Shuffle & Play
          </button>
          <button type="button" className="ghost-button" onClick={handleTogglePlayback} disabled={!isWidgetReady}>
            {isPlaying ? "Pause" : "Play / Pause"}
          </button>
          {errorMessage ? (
            <button type="button" className="ghost-button soundcloud-retry-button" onClick={handleRetry}>
              Retry SoundCloud
            </button>
          ) : null}
        </div>
      </div>

      <div className={`soundcloud-player-card inset-panel ${errorMessage ? "soundcloud-error-state" : ""}`}>
        <div className="soundcloud-player-art">
          {currentTrack?.artworkUrl ? <img src={currentTrack.artworkUrl} alt={currentTrack.title} className="soundcloud-artwork-image" /> : <div className="soundcloud-artwork-fallback" />}
        </div>
        <div className="soundcloud-player-copy">
          <p className="meta-label">Now playing</p>
          <strong>{currentTrackTitle}</strong>
          <span className="soundcloud-player-artist">{currentTrack?.artist ?? selectedPlaylist.label}</span>
          <span>
            {errorMessage ??
              (isDiscordProxyHost()
                ? "Tracks continue in random order when one finishes. In Discord, SoundCloud needs Activity URL mappings for /soundcloud-widget and /soundcloud-api."
                : "Tracks continue in random order when one finishes.")}
          </span>
          {errorMessage ? <p className="soundcloud-help">SoundCloud controls stay disabled until the widget script loads successfully.</p> : null}
          <div className="soundcloud-attribution">
            <a href={currentTrack?.permalinkUrl ?? selectedPlaylist.sourceUrl} target="_blank" rel="noreferrer">
              Open on SoundCloud
            </a>
            {currentTrack?.artistPermalinkUrl ? (
              <a href={currentTrack.artistPermalinkUrl} target="_blank" rel="noreferrer">
                Artist
              </a>
            ) : null}
          </div>
          <div className="soundcloud-timeline-row">
            <div className="soundcloud-timeline-labels">
              <span className="meta-label">Timeline</span>
              <span className="soundcloud-time-readout">
                {formatDuration(positionMs)} / {formatDuration(durationMs)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(progressRatio * 1000)}
              onChange={(event) => handleTimelineChange(Number(event.target.value) / 1000)}
              className="soundcloud-timeline-slider"
              aria-label="SoundCloud playback timeline"
              disabled={!isWidgetReady || durationMs <= 0}
            />
          </div>
          <div className="soundcloud-volume-row">
            <span className="meta-label">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={(event) => handleVolumeChange(Number(event.target.value))}
              className="soundcloud-volume-slider"
              aria-label="SoundCloud volume"
            />
            <span className="soundcloud-volume-value">{volume}%</span>
          </div>
        </div>
      </div>

      <div className="soundcloud-widget-engine" aria-hidden="true">
        <iframe
          key={selectedPlaylist.id}
          ref={iframeRef}
          title={`SoundCloud player for ${selectedPlaylist.label}`}
          className="soundcloud-widget-frame"
          allow="autoplay"
          scrolling="no"
          frameBorder="no"
          src={getResolvedWidgetSrc(selectedPlaylist.apiUrl)}
        />
      </div>
    </section>
  );
}
