import { useEffect, useRef, type CSSProperties, type MouseEvent, type UIEvent } from "react";
import { FloatingWindow } from "./FloatingWindow";
import type { SoundCloudPlayerController } from "../hooks/useSoundCloudPlayer";

interface SoundCloudPanelProps {
  waveformBarCount: number;
  player: SoundCloudPlayerController;
}

interface SoundCloudWaveformViewProps {
  waveformBars: number[];
  progress: number;
  position: number;
  duration: number;
  disabled: boolean;
  mode: "inline" | "floating";
  onSeek: (ratio: number) => void;
  onOpenPopout?: () => void;
}

function isDiscordProxyHost() {
  return window.location.host.includes("discordsays.com") || window.location.host.includes("discordsez.com");
}

function formatTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function SoundCloudWaveformView({ waveformBars, progress, position, duration, disabled, mode, onSeek, onOpenPopout }: SoundCloudWaveformViewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const autoFollowRef = useRef(true);
  const ignoreNextScrollRef = useRef(false);
  const resumeFollowTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resumeFollowTimeoutRef.current !== null) {
        window.clearTimeout(resumeFollowTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;

    if (!viewport || !content || !autoFollowRef.current) {
      return;
    }

    const maxScrollLeft = Math.max(0, content.scrollWidth - viewport.clientWidth);
    const playheadX = content.scrollWidth * progress;
    const nextScrollLeft = Math.min(Math.max(playheadX - viewport.clientWidth * 0.5, 0), maxScrollLeft);

    ignoreNextScrollRef.current = true;
    viewport.scrollTo({ left: nextScrollLeft, behavior: "auto" });

    window.setTimeout(() => {
      ignoreNextScrollRef.current = false;
    }, 120);
  }, [progress, waveformBars.length]);

  const scheduleAutoFollowResume = () => {
    if (resumeFollowTimeoutRef.current !== null) {
      window.clearTimeout(resumeFollowTimeoutRef.current);
    }

    resumeFollowTimeoutRef.current = window.setTimeout(() => {
      autoFollowRef.current = true;
    }, 1500);
  };

  const handleScroll = (_event: UIEvent<HTMLDivElement>) => {
    if (ignoreNextScrollRef.current) {
      return;
    }

    autoFollowRef.current = false;
    scheduleAutoFollowResume();
  };

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    const content = contentRef.current;

    if (disabled || !content) {
      return;
    }

    const bounds = content.getBoundingClientRect();
    const seekRatio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    autoFollowRef.current = true;
    onSeek(seekRatio);
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!onOpenPopout) {
      return;
    }

    event.preventDefault();
    onOpenPopout();
  };
  const waveformStride = mode === "floating" ? 8 : 6;
  const waveformHorizontalPadding = mode === "floating" ? 28 : 20;

  return (
    <div className={`soundcloud-waveform-row soundcloud-waveform-row-${mode}`}>
      <span>{formatTime(position)}</span>
      <div
        ref={viewportRef}
        className={`soundcloud-waveform-viewport soundcloud-waveform-viewport-${mode}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Seek through current SoundCloud track"
        onClick={handleSeek}
        onContextMenu={handleContextMenu}
        onScroll={handleScroll}
      >
        <div
          ref={contentRef}
          className="soundcloud-waveform-content"
          style={
            {
              "--waveform-progress": `${progress * 100}%`,
              "--waveform-content-width": `${waveformBars.length * waveformStride + waveformHorizontalPadding}px`,
              gridTemplateColumns: `repeat(${waveformBars.length}, minmax(var(--waveform-bar-width), 1fr))`,
            } as CSSProperties
          }
        >
          {waveformBars.map((height, index) => (
            <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
      <span>{formatTime(duration)}</span>
    </div>
  );
}

export function SoundCloudPanel({ player }: SoundCloudPanelProps) {
  const { iframeRef, state, actions } = player;

  return (
    <section className="panel soundcloud-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SoundCloud</p>
          <h2>Shuffle Radio</h2>
        </div>
        <div className="status-stack">
          <span className="capacity-pill">{state.trackCount} tracks</span>
          <span className={`sync-pill ${state.isPlaying ? "sync-connected" : "sync-connecting"}`}>{state.isPlaying ? "Playing" : "Standby"}</span>
        </div>
      </div>

      <div className={`soundcloud-player ${state.errorMessage ? "soundcloud-error-state" : ""}`}>
        <div className="soundcloud-artwork" aria-hidden="true">
          {state.artworkUrl ? <img src={state.artworkUrl} alt="" /> : <span>SC</span>}
        </div>

        <div className="soundcloud-player-main">
          <div className="soundcloud-track-row">
            <div className="soundcloud-track-copy">
              <p className="meta-label">Now playing</p>
              <strong>{state.currentTrackTitle}</strong>
              <span>{state.currentTrackArtist}</span>
            </div>
            <div className="soundcloud-track-links">
              {state.currentTrackUrl ? (
                <a className="soundcloud-open-link" href={state.currentTrackUrl} target="_blank" rel="noreferrer">
                  Open on SoundCloud
                </a>
              ) : null}
              {state.currentTrackArtistUrl ? (
                <a className="soundcloud-open-link" href={state.currentTrackArtistUrl} target="_blank" rel="noreferrer">
                  Artist
                </a>
              ) : null}
            </div>
          </div>

          <SoundCloudWaveformView
            waveformBars={state.waveformBars}
            progress={state.waveformProgress}
            position={state.playbackPosition}
            duration={state.playbackDuration}
            disabled={!state.isWidgetReady || state.playbackDuration <= 0}
            mode="inline"
            onSeek={actions.seekWaveform}
            onOpenPopout={actions.openWaveformWindow}
          />

          <div className="soundcloud-controls">
            <label className="soundcloud-select-wrap">
              <span className="meta-label">Playlist</span>
              <select value={state.selectedPlaylistId} onChange={(event) => actions.changePlaylist(event.target.value)} className="soundcloud-select">
                {state.playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="soundcloud-actions">
              <button type="button" className="soundcloud-control-button soundcloud-play-button" onClick={actions.togglePlayback} disabled={!state.isWidgetReady}>
                <span aria-hidden="true">{state.isPlaying ? "❚❚" : "▶"}</span>
                {state.isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" className="soundcloud-control-button" onClick={actions.shufflePlay} disabled={state.controlsDisabled}>
                <span aria-hidden="true">⤮</span>
                Shuffle
              </button>
              {state.errorMessage ? (
                <button type="button" className="soundcloud-control-button soundcloud-retry-button" onClick={actions.retry}>
                  Retry
                </button>
              ) : null}
            </div>
          </div>

          <div className="soundcloud-volume-row">
            <span className="meta-label">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={state.volume}
              onChange={(event) => actions.setVolume(Number(event.target.value))}
              className="soundcloud-volume-slider"
              aria-label="SoundCloud volume"
              disabled={!state.isWidgetReady}
            />
            <span className="soundcloud-volume-value">{state.volume}%</span>
          </div>

          <p className="soundcloud-player-note">
            {state.errorMessage ??
              (isDiscordProxyHost()
                ? "Tracks continue in random order when one finishes. In Discord, SoundCloud needs Activity URL mappings for /soundcloud-widget and /soundcloud-api."
                : "Tracks continue in random order when one finishes.")}
          </p>
          {state.errorMessage ? <p className="soundcloud-help">Custom controls stay disabled until the SoundCloud embed finishes loading. Try the embedded player below if it appears.</p> : null}
        </div>
      </div>

      <div className={`soundcloud-widget-shell ${state.isWidgetReady ? "soundcloud-widget-shell-visible" : ""}`}>
        <iframe
          key={state.selectedPlaylist.id}
          ref={(element) => {
            iframeRef.current = element;
          }}
          title={`SoundCloud player for ${state.selectedPlaylist.label}`}
          className="soundcloud-widget-frame"
          allow="autoplay"
          scrolling="no"
          frameBorder="no"
          src={state.resolvedWidgetSrc}
        />
      </div>

      <FloatingWindow
        title="SoundCloud Waveform"
        isOpen={state.isWaveformWindowOpen}
        initialRect={{ x: 120, y: 120, width: 760, height: 300 }}
        minWidth={360}
        minHeight={220}
        onClose={actions.closeWaveformWindow}
      >
        <div className="soundcloud-waveform-window">
          <div className="soundcloud-waveform-window-copy">
            <p className="meta-label">Expanded waveform</p>
            <strong>{state.currentTrackTitle}</strong>
            <span>{state.currentTrackArtist}</span>
          </div>
          <SoundCloudWaveformView
            waveformBars={state.waveformBars}
            progress={state.waveformProgress}
            position={state.playbackPosition}
            duration={state.playbackDuration}
            disabled={!state.isWidgetReady || state.playbackDuration <= 0}
            mode="floating"
            onSeek={actions.seekWaveform}
          />
        </div>
      </FloatingWindow>
    </section>
  );
}
