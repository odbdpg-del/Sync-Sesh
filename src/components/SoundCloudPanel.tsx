import { useEffect, useRef, type CSSProperties, type MouseEvent, type UIEvent } from "react";
import { FloatingWindow } from "./FloatingWindow";
import type { SoundCloudPlayerController } from "../hooks/useSoundCloudPlayer";

type SoundCloudDeckId = "A" | "B";

interface SoundCloudDeckPanelConfig {
  id: SoundCloudDeckId;
  label: string;
  player: SoundCloudPlayerController;
}

interface SoundCloudPanelProps {
  decks: SoundCloudDeckPanelConfig[];
  mixer: SoundCloudMixerState;
  mixerReadout: SoundCloudMixerReadout;
  onSetCrossfader: (value: number) => void;
  onSetMasterVolume: (value: number) => void;
}

interface SoundCloudMixerState {
  crossfader: number;
  masterVolume: number;
}

interface SoundCloudMixerReadout {
  deckAOutputPercent: number;
  deckBOutputPercent: number;
}

interface SoundCloudMixerPanelProps {
  mixer: SoundCloudMixerState;
  readout: SoundCloudMixerReadout;
  onSetCrossfader: (value: number) => void;
  onSetMasterVolume: (value: number) => void;
}

type SoundCloudDeckSide = "left" | "right";

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

interface SoundCloudCueStripProps {
  deckLabel: string;
  isSettingCue: boolean;
  isEditingCue: boolean;
  selectedCueId: SoundCloudPlayerController["hotCueState"]["selectedCueId"];
  isCueBlocked: boolean;
  lastCueActionLabel: string | null;
  lastCueEditActionLabel: string | null;
  cues: SoundCloudPlayerController["hotCueState"]["cues"];
  onToggleSetCueMode: () => void;
  onToggleEditCueMode: () => void;
  onTriggerCue: (cueId: SoundCloudPlayerController["hotCueState"]["cues"][number]["id"]) => void;
}

interface SoundCloudSeekStripProps {
  deckLabel: string;
  disabled: boolean;
  isEditingCue: boolean;
  selectedCueId: SoundCloudPlayerController["hotCueState"]["selectedCueId"];
  onSeekBy: (deltaSeconds: number) => void;
  onNudgeCue: (deltaSeconds: number) => void;
}

const SOUNDCLOUD_SEEK_STEPS = [0.01, 0.1, 1, 10, 30] as const;

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

function formatCrossfaderLabel(crossfader: number) {
  if (Math.abs(crossfader) < 0.05) {
    return "CENTER";
  }

  return crossfader < 0 ? `A ${Math.round(Math.abs(crossfader) * 100)}%` : `B ${Math.round(crossfader * 100)}%`;
}

function formatCueActionLabel(label: string | null) {
  return label ?? "CUE READY";
}

function formatSeekButtonLabel(seconds: number) {
  if (seconds < 1) {
    return seconds.toFixed(2).replace(/^0/, "");
  }

  return seconds.toString();
}

function formatSeekAriaLabel(deltaSeconds: number, isEditingCue: boolean, selectedCueId: string | null) {
  const direction = deltaSeconds < 0 ? "backward" : "forward";
  const magnitude = Math.abs(deltaSeconds);
  const unit = magnitude === 1 ? "second" : "seconds";

  if (isEditingCue) {
    return selectedCueId
      ? `Nudge ${selectedCueId} ${direction} ${magnitude} ${unit}`
      : `Select a cue before nudging ${direction} ${magnitude} ${unit}`;
  }

  return `Seek ${direction} ${magnitude} ${unit}`;
}

function SoundCloudCueStrip({
  deckLabel,
  isSettingCue,
  isEditingCue,
  selectedCueId,
  isCueBlocked,
  lastCueActionLabel,
  lastCueEditActionLabel,
  cues,
  onToggleSetCueMode,
  onToggleEditCueMode,
  onTriggerCue,
}: SoundCloudCueStripProps) {
  return (
    <div className={`soundcloud-cue-strip ${isCueBlocked ? "soundcloud-cue-strip-blocked" : ""}`}>
      <div className="soundcloud-cue-strip-header">
        <button
          type="button"
          className={`soundcloud-control-button soundcloud-cue-set-button ${isSettingCue && !isCueBlocked ? "soundcloud-cue-set-button-active" : ""}`}
          onClick={onToggleSetCueMode}
          disabled={isCueBlocked}
          aria-pressed={isSettingCue}
          aria-label={`${deckLabel} ${isSettingCue ? "exit" : "enter"} set cue mode`}
        >
          {isCueBlocked ? "LOAD TRACK" : isSettingCue ? "SET CUE ON" : "SET CUE"}
        </button>
        <button
          type="button"
          className={`soundcloud-control-button soundcloud-cue-set-button ${isEditingCue && !isCueBlocked ? "soundcloud-cue-set-button-active" : ""}`}
          onClick={onToggleEditCueMode}
          disabled={isCueBlocked}
          aria-pressed={isEditingCue}
          aria-label={`${deckLabel} ${isEditingCue ? "exit" : "enter"} edit cue mode`}
        >
          {isCueBlocked ? "LOAD TRACK" : isEditingCue ? "EDIT ON" : "EDIT CUE"}
        </button>
        <span className="soundcloud-cue-strip-feedback" aria-live="polite">
          {isCueBlocked ? "LOAD TRACK" : isEditingCue ? formatCueActionLabel(lastCueEditActionLabel) : formatCueActionLabel(lastCueActionLabel)}
        </span>
      </div>

      <div className="soundcloud-cue-grid" aria-label={`${deckLabel} hot cues`}>
        {cues.map((cue) => {
          const cueLabel = cue.label;
          const ariaLabel = `${deckLabel} ${cue.id} ${cue.isValid ? cueLabel : cueLabel}`;

          return (
            <button
              key={cue.id}
              type="button"
              className={`soundcloud-cue-pad ${cue.isValid ? "soundcloud-cue-pad-saved" : "soundcloud-cue-pad-empty"} ${isSettingCue ? "soundcloud-cue-pad-setting" : ""} ${isEditingCue ? "soundcloud-cue-pad-editing" : ""} ${selectedCueId === cue.id ? "soundcloud-cue-pad-selected" : ""} ${isCueBlocked ? "soundcloud-cue-pad-blocked" : ""}`}
              onClick={() => onTriggerCue(cue.id)}
              disabled={isCueBlocked}
              aria-label={ariaLabel}
            >
              <span className="soundcloud-cue-pad-id">{cue.id}</span>
              <span className="soundcloud-cue-pad-label">{isCueBlocked ? "LOAD TRACK" : cueLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SoundCloudSeekStrip({ deckLabel, disabled, isEditingCue, selectedCueId, onSeekBy, onNudgeCue }: SoundCloudSeekStripProps) {
  const handleStep = (deltaSeconds: number) => {
    if (isEditingCue) {
      onNudgeCue(deltaSeconds);
      return;
    }

    onSeekBy(deltaSeconds);
  };

  return (
    <div className={`soundcloud-seek-strip ${disabled ? "soundcloud-seek-strip-disabled" : ""} ${isEditingCue ? "soundcloud-seek-strip-editing" : ""}`}>
      <div className="soundcloud-seek-strip-heading">
        <span>{isEditingCue ? "Cue nudge" : "Seek"}</span>
        <span>{isEditingCue ? selectedCueId ?? "Select cue" : deckLabel}</span>
      </div>
      <div className="soundcloud-seek-grid" aria-label={`${deckLabel} ${isEditingCue ? "cue nudge" : "seek"} controls`}>
        {SOUNDCLOUD_SEEK_STEPS.map((step) => {
          const delta = -step;
          return (
            <button
              key={`reverse-${step}`}
              type="button"
              className="soundcloud-control-button soundcloud-seek-button"
              onClick={() => handleStep(delta)}
              disabled={disabled || (isEditingCue && !selectedCueId)}
              aria-label={formatSeekAriaLabel(delta, isEditingCue, selectedCueId)}
            >
              -{formatSeekButtonLabel(step)}
            </button>
          );
        })}
        {SOUNDCLOUD_SEEK_STEPS.map((step) => (
          <button
            key={`forward-${step}`}
            type="button"
            className="soundcloud-control-button soundcloud-seek-button"
            onClick={() => handleStep(step)}
            disabled={disabled || (isEditingCue && !selectedCueId)}
            aria-label={formatSeekAriaLabel(step, isEditingCue, selectedCueId)}
          >
            +{formatSeekButtonLabel(step)}
          </button>
        ))}
      </div>
    </div>
  );
}

function SoundCloudMixerPanel({ mixer, readout, onSetCrossfader, onSetMasterVolume }: SoundCloudMixerPanelProps) {
  return (
    <div className="soundcloud-mixer-panel">
      <div className="soundcloud-mixer-heading">
        <div>
          <p className="meta-label">Mixer</p>
          <strong>Crossfader + Master</strong>
        </div>
        <span>{formatCrossfaderLabel(mixer.crossfader)}</span>
      </div>

      <div className="soundcloud-mixer-readout" aria-label="SoundCloud mixer output">
        <span>A OUT {Math.round(readout.deckAOutputPercent)}%</span>
        <span>XFADE {formatCrossfaderLabel(mixer.crossfader)}</span>
        <span>MASTER {mixer.masterVolume}%</span>
        <span>B OUT {Math.round(readout.deckBOutputPercent)}%</span>
      </div>

      <label className="soundcloud-mixer-slider-row">
        <span className="meta-label">A</span>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={Math.round(mixer.crossfader * 100)}
          onChange={(event) => onSetCrossfader(Number(event.target.value) / 100)}
          className="soundcloud-mixer-slider"
          aria-label="SoundCloud crossfader"
        />
        <span className="meta-label">B</span>
      </label>

      <label className="soundcloud-mixer-slider-row">
        <span className="meta-label">Master</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={mixer.masterVolume}
          onChange={(event) => onSetMasterVolume(Number(event.target.value))}
          className="soundcloud-mixer-slider"
          aria-label="SoundCloud master volume"
        />
        <span className="soundcloud-volume-value">{mixer.masterVolume}%</span>
      </label>
    </div>
  );
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

function SoundCloudDeckCard({ deck, side }: { deck: SoundCloudDeckPanelConfig; side: SoundCloudDeckSide }) {
  const { iframeRef, state, actions, hotCueState, hotCueActions } = deck.player;
  const sideLabel = side === "left" ? "Left deck" : "Right deck";
  const isCueBlocked = !hotCueState.activeTrackKey || state.playbackDuration <= 0 || !state.isWidgetReady;

  return (
    <article className={`soundcloud-deck soundcloud-deck-${deck.id.toLowerCase()}`}>
      <div className={`soundcloud-player ${state.errorMessage ? "soundcloud-error-state" : ""}`}>
        <div className="soundcloud-artwork" aria-hidden="true">
          {state.artworkUrl ? <img src={state.artworkUrl} alt="" /> : <span>{deck.id}</span>}
        </div>

        <div className="soundcloud-player-main">
          <div className="soundcloud-deck-heading">
            <div>
              <p className="meta-label">{sideLabel}</p>
              <strong>{deck.label}</strong>
            </div>
            <span className={`soundcloud-deck-status ${state.isPlaying ? "soundcloud-deck-status-playing" : ""}`}>
              {state.isPlaying ? "Playing" : "Paused"}
            </span>
          </div>

          <div className="soundcloud-track-row">
            <div className="soundcloud-track-copy">
              <p className="meta-label">Now playing</p>
              <strong>{state.currentTrackTitle}</strong>
              <span>{state.currentTrackArtist}</span>
            </div>
          </div>

          {state.currentTrackUrl || state.currentTrackArtistUrl ? (
            <div className="soundcloud-track-actions" aria-label={`${deck.label} track links`}>
              {state.currentTrackUrl ? (
                <a className="soundcloud-open-link" href={state.currentTrackUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
              {state.currentTrackArtistUrl ? (
                <a className="soundcloud-open-link" href={state.currentTrackArtistUrl} target="_blank" rel="noreferrer">
                  Artist
                </a>
              ) : null}
            </div>
          ) : null}

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

          <SoundCloudCueStrip
            deckLabel={deck.label}
            isSettingCue={hotCueState.isSettingCue}
            isEditingCue={hotCueState.isEditingCue}
            selectedCueId={hotCueState.selectedCueId}
            isCueBlocked={isCueBlocked}
            lastCueActionLabel={hotCueState.lastCueActionLabel}
            lastCueEditActionLabel={hotCueState.lastCueEditActionLabel}
            cues={hotCueState.cues}
            onToggleSetCueMode={hotCueActions.toggleSetCueMode}
            onToggleEditCueMode={hotCueActions.toggleEditCueMode}
            onTriggerCue={hotCueActions.triggerCue}
          />

          <SoundCloudSeekStrip
            deckLabel={deck.label}
            disabled={!state.isWidgetReady || state.playbackDuration <= 0}
            isEditingCue={hotCueState.isEditingCue}
            selectedCueId={hotCueState.selectedCueId}
            onSeekBy={actions.seekBy}
            onNudgeCue={hotCueActions.nudgeSelectedCue}
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
                {state.isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" className="soundcloud-control-button" onClick={actions.shufflePlay} disabled={state.controlsDisabled}>
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
            <span className="meta-label">Trim</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={state.volume}
              onChange={(event) => actions.setVolume(Number(event.target.value))}
              className="soundcloud-volume-slider"
              aria-label={`${deck.label} SoundCloud base trim`}
              disabled={!state.isWidgetReady}
            />
            <span className="soundcloud-volume-value">{state.volume}%</span>
          </div>

          <p className="soundcloud-player-note">
            {state.errorMessage ?? "Cue state stays local to this browser. Random-next stays local to this deck. Trim feeds the mixer."}
          </p>
          {state.errorMessage ? <p className="soundcloud-help">Custom controls stay disabled until the SoundCloud embed finishes loading. Try the embedded player below if it appears.</p> : null}
        </div>
      </div>

      <div className={`soundcloud-widget-shell ${state.errorMessage && !state.isWidgetReady ? "soundcloud-widget-shell-visible" : ""}`}>
        <iframe
          key={`${deck.id}-${state.selectedPlaylist.id}`}
          ref={(element) => {
            iframeRef.current = element;
          }}
          title={`${deck.label} SoundCloud player for ${state.selectedPlaylist.label}`}
          className="soundcloud-widget-frame"
          allow="autoplay"
          scrolling="no"
          frameBorder="no"
          src={state.resolvedWidgetSrc}
        />
      </div>

      <FloatingWindow
        title={`${deck.label} Waveform`}
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
    </article>
  );
}

export function SoundCloudPanel({ decks, mixer, mixerReadout, onSetCrossfader, onSetMasterVolume }: SoundCloudPanelProps) {
  const totalTracks = decks.reduce((sum, deck) => sum + deck.player.state.trackCount, 0);
  const activeCount = decks.filter((deck) => deck.player.state.isPlaying).length;
  const deckA = decks.find((deck) => deck.id === "A") ?? decks[0];
  const deckB = decks.find((deck) => deck.id === "B") ?? decks.find((deck) => deck !== deckA);
  const localAudioNote = isDiscordProxyHost()
    ? "Local browser audio only. Discord voice will not carry these decks; friends need their own app audio."
    : "Local browser audio only. This mixer blends this browser's Deck A/B; friends need their own app audio.";

  return (
    <section className="panel soundcloud-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SoundCloud</p>
          <h2>Two-Deck SoundCloud</h2>
        </div>
        <div className="status-stack">
          <span className="capacity-pill">{totalTracks} tracks</span>
          <span className={`sync-pill ${activeCount > 0 ? "sync-connected" : "sync-connecting"}`}>
            {activeCount > 0 ? `${activeCount} playing` : "Standby"}
          </span>
        </div>
      </div>

      <p className="soundcloud-panel-note">{localAudioNote}</p>

      <div className="soundcloud-dj-table">
        {deckA ? <SoundCloudDeckCard deck={deckA} side="left" /> : null}
        <SoundCloudMixerPanel mixer={mixer} readout={mixerReadout} onSetCrossfader={onSetCrossfader} onSetMasterVolume={onSetMasterVolume} />
        {deckB ? <SoundCloudDeckCard deck={deckB} side="right" /> : null}
      </div>
    </section>
  );
}
