import { SoundCloudModeToggle, type SoundCloudPanelMode } from "./SoundCloudModeToggle";
import type { SoundCloudPlayerController } from "../hooks/useSoundCloudPlayer";

interface SoundCloudWidgetPanelProps {
  player: SoundCloudPlayerController;
  mode: SoundCloudPanelMode;
  onChangeMode: (mode: SoundCloudPanelMode) => void;
}

function isDiscordProxyHost() {
  return window.location.host.includes("discordsays.com") || window.location.host.includes("discordsez.com");
}

export function SoundCloudWidgetPanel({ player, mode, onChangeMode }: SoundCloudWidgetPanelProps) {
  const { iframeRef, state, actions } = player;

  return (
    <section className="panel soundcloud-panel soundcloud-widget-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SoundCloud</p>
          <h2>Embedded Widget</h2>
        </div>
        <div className="status-stack">
          <span className="capacity-pill">{state.trackCount} tracks</span>
          <span className={`sync-pill ${state.isWidgetReady ? "sync-connected" : "sync-connecting"}`}>
            {state.isWidgetReady ? "Widget ready" : "Loading widget"}
          </span>
        </div>
      </div>

      <div className="soundcloud-panel-toolbar">
        <p className="soundcloud-panel-note">
          {isDiscordProxyHost()
            ? "This mode shows the standard SoundCloud embed with only the light playlist selector around it."
            : "This mode keeps the standard SoundCloud widget front and center, with just the playlist selector around it."}
        </p>
        <SoundCloudModeToggle activeMode={mode} onChangeMode={onChangeMode} />
      </div>

      <div className="soundcloud-widget-panel-main">
        <div className="soundcloud-widget-panel-meta">
          <div className="soundcloud-track-copy">
            <p className="meta-label">Current playlist</p>
            <strong>{state.selectedPlaylist.label}</strong>
            <span>{state.currentTrackTitle}</span>
          </div>

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

          <div className="soundcloud-widget-panel-actions">
            {state.currentTrackUrl ? (
              <a className="soundcloud-open-link" href={state.currentTrackUrl} target="_blank" rel="noreferrer">
                Open track
              </a>
            ) : null}
            {state.currentTrackArtistUrl ? (
              <a className="soundcloud-open-link" href={state.currentTrackArtistUrl} target="_blank" rel="noreferrer">
                Artist
              </a>
            ) : null}
            {state.errorMessage ? (
              <button type="button" className="soundcloud-control-button soundcloud-retry-button" onClick={actions.retry}>
                Retry
              </button>
            ) : null}
          </div>

          <p className="soundcloud-player-note">
            {state.errorMessage ?? "Use the native SoundCloud controls in the widget for playback, seeking, likes, and playlist browsing."}
          </p>
        </div>

        <div className="soundcloud-widget-shell soundcloud-widget-shell-visible soundcloud-widget-shell-inline">
          <iframe
            key={`widget-panel-${state.selectedPlaylist.id}`}
            ref={(element) => {
              iframeRef.current = element;
            }}
            title={`SoundCloud widget player for ${state.selectedPlaylist.label}`}
            className="soundcloud-widget-frame"
            allow="autoplay"
            scrolling="no"
            frameBorder="no"
            src={state.resolvedWidgetSrc}
          />
        </div>
      </div>
    </section>
  );
}
