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
    show_artwork: "true",
    show_playcount: "false",
    show_user: "true",
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

export function SoundCloudPanel() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SoundCloudWidgetInstance | null>(null);
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
    setErrorMessage(null);

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

        widget.getCurrentSound((sound) => {
          setCurrentTrackTitle(sound?.title ?? `${count} tracks loaded.`);
        });
      });
    };

    widget.bind(window.SC.Widget.Events.READY, () => {
      setIsWidgetReady(true);
      refreshTrackList();
    });

    widget.bind(window.SC.Widget.Events.PLAY, () => {
      setIsPlaying(true);
      widget.getCurrentSound((sound) => {
        setCurrentTrackTitle(sound?.title ?? "Now playing from SoundCloud.");
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

  const handleRetry = () => {
    widgetRef.current = null;
    trackCountRef.current = 0;
    currentTrackIndexRef.current = undefined;
    pendingAutoplayRef.current = false;
    setTrackCount(0);
    setCurrentTrackTitle(`Retrying ${selectedPlaylist.label}...`);
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

      <div className={`soundcloud-now-playing inset-panel ${errorMessage ? "soundcloud-error-state" : ""}`}>
        <p className="meta-label">Now playing</p>
        <strong>{currentTrackTitle}</strong>
        <span>
          {errorMessage ??
            (isDiscordProxyHost()
              ? "Tracks continue in random order when one finishes. In Discord, SoundCloud needs Activity URL mappings for /soundcloud-widget and /soundcloud-api."
              : "Tracks continue in random order when one finishes.")}
        </span>
        {errorMessage ? <p className="soundcloud-help">SoundCloud controls stay disabled until the widget script loads successfully.</p> : null}
      </div>

      <div className="soundcloud-widget-shell">
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
