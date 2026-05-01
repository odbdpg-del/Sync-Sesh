import { useState } from "react";
import type { SyncConnectionState, TextVoiceEvent, TextVoiceReplayEvent } from "../types/session";

export interface TextVoiceLogEntry extends TextVoiceEvent {
  receivedAt: string;
  replayCount: number;
  replayAttributions: TextVoiceReplayEvent[];
}

export interface TextVoiceBrowserVoice {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
}

export interface TextVoiceStyleSettings {
  rate: number;
  pitch: number;
  volume: number;
}

interface TextVoicePanelProps {
  entries: TextVoiceLogEntry[];
  syncConnection: SyncConnectionState;
  localProfileId: string;
  browserVoices: TextVoiceBrowserVoice[];
  selectedVoiceURI: string;
  voiceStyleOptions: Array<{ id: string; label: string }>;
  selectedVoiceStyle: string;
  customVoiceStyle: TextVoiceStyleSettings;
  isVoiceStyleControlsExpanded: boolean;
  maxLength: number;
  onSubmitText: (text: string) => boolean;
  onReplay: (id: string) => void;
  onVoiceChange: (voiceURI: string) => void;
  onVoiceStyleChange: (style: string) => void;
  onToggleVoiceStyleControls: () => void;
  onCustomVoiceStyleChange: (key: keyof TextVoiceStyleSettings, value: number) => void;
}

function formatTextVoiceTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTextVoiceSyncLabel(syncConnection: SyncConnectionState) {
  if (syncConnection === "connected") {
    return "Connected";
  }

  if (syncConnection === "connecting") {
    return "Connecting";
  }

  return "Offline";
}

function getReplayAttributionLabel(entry: TextVoiceLogEntry, localProfileId: string) {
  const replayerNames = Array.from(new Map(entry.replayAttributions.filter((attribution) => (
    attribution.replayerId !== localProfileId
  )).map((attribution) => [
    attribution.replayerId,
    attribution.replayerName,
  ])).values());

  if (replayerNames.length === 0) {
    return null;
  }

  if (replayerNames.length === 1) {
    return `Also replayed by ${replayerNames[0]}`;
  }

  if (replayerNames.length === 2) {
    return `Also replayed by ${replayerNames[0]} + 1`;
  }

  return `Also replayed by ${replayerNames[0]} + ${replayerNames.length - 1}`;
}

export function TextVoicePanel({
  entries,
  syncConnection,
  localProfileId,
  browserVoices,
  selectedVoiceURI,
  voiceStyleOptions,
  selectedVoiceStyle,
  customVoiceStyle,
  isVoiceStyleControlsExpanded,
  maxLength,
  onSubmitText,
  onReplay,
  onVoiceChange,
  onVoiceStyleChange,
  onToggleVoiceStyleControls,
  onCustomVoiceStyleChange,
}: TextVoicePanelProps) {
  const [draftText, setDraftText] = useState("");
  const cleanDraftText = draftText.trim();
  const isConnected = syncConnection === "connected";
  const canSubmit = cleanDraftText.length > 0 && cleanDraftText.length <= maxLength;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    if (onSubmitText(cleanDraftText)) {
      setDraftText("");
    }
  };

  return (
    <section className="panel text-voice-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Comms</p>
          <h2>Text Voice</h2>
        </div>
        <div className="status-stack">
          <span className={`sync-pill ${isConnected ? "sync-connected" : "sync-connecting"}`}>{getTextVoiceSyncLabel(syncConnection)}</span>
        </div>
      </div>

      <form
        className="text-voice-composer"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <input
          className="text-voice-input"
          value={draftText}
          maxLength={maxLength + 20}
          placeholder="Type a voice line..."
          aria-label="Text voice line"
          onChange={(event) => setDraftText(event.target.value)}
        />
        <button type="submit" className="text-voice-send-button" disabled={!canSubmit}>
          Send
        </button>
      </form>

      <div className="text-voice-panel-note">
        <span>{cleanDraftText.length}/{maxLength}</span>
        <span>{isConnected ? "Lines speak after the room echo returns." : "Sync must reconnect before shared lines send."}</span>
      </div>

      <div className="text-voice-controls">
        <label className="text-voice-control">
          <span>Voice</span>
          <select
            className="text-voice-select"
            value={selectedVoiceURI}
            aria-label="Local text voice browser voice"
            onChange={(event) => onVoiceChange(event.target.value)}
          >
            <option value="">Browser default</option>
            {browserVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang || "unknown"}){voice.default ? " default" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-voice-control">
          <span className="text-voice-control-heading">
            <span>Style</span>
            <button
              type="button"
              className="text-voice-style-toggle"
              aria-label={isVoiceStyleControlsExpanded ? "Hide custom voice style controls" : "Show custom voice style controls"}
              aria-expanded={isVoiceStyleControlsExpanded}
              onClick={onToggleVoiceStyleControls}
            >
              <span className="text-voice-style-toggle-icon" aria-hidden="true" />
            </button>
          </span>
          <select
            className="text-voice-select"
            value={selectedVoiceStyle}
            aria-label="Local text voice style"
            onChange={(event) => onVoiceStyleChange(event.target.value)}
          >
            {voiceStyleOptions.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
          {isVoiceStyleControlsExpanded ? (
            <div className="text-voice-style-sliders" aria-label="Custom voice style controls">
              {([
                ["rate", "Rate", 0.5, 2, 0.05],
                ["pitch", "Pitch", 0, 2, 0.05],
                ["volume", "Volume", 0, 1, 0.05],
              ] as const).map(([key, label, min, max, step]) => (
                <label key={key} className="text-voice-style-slider">
                  <span>
                    <span>{label}</span>
                    <strong>{customVoiceStyle[key].toFixed(2)}</strong>
                  </span>
                  <input
                    className="text-voice-range"
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={customVoiceStyle[key]}
                    aria-label={`Custom voice ${label.toLowerCase()}`}
                    onChange={(event) => onCustomVoiceStyleChange(key, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </label>
      </div>

      <div className="text-voice-log" aria-label="Text voice log">
        {entries.length > 0 ? (
          entries.map((entry) => {
            const replayAttributionLabel = getReplayAttributionLabel(entry, localProfileId);
            const localReplayCount = entry.replayAttributions.filter((attribution) => (
              attribution.replayerId === localProfileId
            )).length;

            return (
              <article key={entry.id} className="text-voice-entry">
                <div className="text-voice-entry-copy">
                  <div className="text-voice-entry-meta">
                    <strong>{entry.senderName} said</strong>
                    <span>{formatTextVoiceTime(entry.receivedAt)}</span>
                    {localReplayCount > 0 ? <span className="text-voice-local-replay">You replayed {localReplayCount}x</span> : null}
                  </div>
                  <p>{entry.text}</p>
                  {replayAttributionLabel ? <span className="text-voice-replay-attribution">{replayAttributionLabel}</span> : null}
                </div>
                <button type="button" className="text-voice-replay-button" aria-label={`Replay ${entry.senderName}'s line locally`} title="Replay locally" onClick={() => onReplay(entry.id)}>
                  Replay
                </button>
              </article>
            );
          })
        ) : (
          <p className="text-voice-empty">No voice lines yet.</p>
        )}
      </div>
    </section>
  );
}
