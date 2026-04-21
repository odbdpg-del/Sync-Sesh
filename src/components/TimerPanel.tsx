import { useEffect, useState } from "react";
import { getDisplayRoundNumber } from "../lib/lobby/sessionState";
import { useReadyHold } from "../hooks/useReadyHold";
import { useRoundEffects } from "../hooks/useRoundEffects";
import type { CountdownDisplayState, DabSyncState, DerivedLobbyState, SyncStatus } from "../types/session";

interface TimerPanelProps {
  state: DabSyncState;
  lobbyState: DerivedLobbyState;
  countdownDisplay: CountdownDisplayState;
  onStartReadyHold: () => void;
  onEndReadyHold: () => void;
  onSetTimerDuration: (durationSeconds: number) => void;
  onSetPrecountDuration: (preCountSeconds: number) => void;
  onResetRound: () => void;
}

function getPrecountSequenceLabel(preCountSeconds: number) {
  return Array.from({ length: preCountSeconds }, (_, index) => String(preCountSeconds - index)).join("...");
}

function getStatusCopy(lobbyState: DerivedLobbyState, syncStatus: SyncStatus) {
  if (syncStatus.connection === "connecting") {
    return "Connecting to sync layer";
  }

  if (syncStatus.connection === "offline" || syncStatus.connection === "error") {
    return syncStatus.warning ?? "Sync unavailable";
  }

  if (syncStatus.warning) {
    return syncStatus.warning;
  }

  if (lobbyState.isArmed) {
    return "Release to start";
  }

  if (lobbyState.canResetRound) {
    return "Replay to return to lobby";
  }

  return "Release starts the round";
}

function getActionLabel(lobbyState: DerivedLobbyState, isHolding: boolean) {
  if (lobbyState.isLocalUserSpectating) {
    return {
      title: "Spectating This Round",
      subtitle: "Wait for replay to rejoin",
    };
  }

  if (lobbyState.releaseStartsCountdown) {
    return {
      title: "Release To Start",
      subtitle: "Everyone is locked in",
    };
  }

  if (isHolding) {
    return {
      title: "Holding Ready",
      subtitle: "Hold everyone together",
    };
  }

  return {
    title: "Hold To Ready",
    subtitle: "Hold everyone together",
  };
}

export function TimerPanel({
  state,
  lobbyState,
  countdownDisplay,
  onStartReadyHold,
  onEndReadyHold,
  onSetTimerDuration,
  onSetPrecountDuration,
  onResetRound,
}: TimerPanelProps) {
  const { isCelebrating } = useRoundEffects(state.session.phase);
  const [draftDuration, setDraftDuration] = useState(state.timerConfig.durationSeconds.toString());
  const preCountPresets = state.timerConfig.preCountPresets ?? [3, 5];
  const syncReady = state.syncStatus.mode === "mock" || state.syncStatus.connection === "connected";
  const { isHolding, bindHoldButton } = useReadyHold({
    enabled: lobbyState.canHoldToReady && syncReady,
    onHoldStart: onStartReadyHold,
    onHoldEnd: onEndReadyHold,
  });

  useEffect(() => {
    setDraftDuration(state.timerConfig.durationSeconds.toString());
  }, [state.timerConfig.durationSeconds]);

  const actionLabel = getActionLabel(lobbyState, isHolding);
  const phaseLabel = state.session.phase === "completed" ? "Completed" : state.session.phase;
  const armedLabel =
    state.session.phase === "completed" ? "Complete" : lobbyState.isArmed ? "Armed" : state.session.phase === "precount" ? "Launch" : "Standby";
  const displayRoundNumber = getDisplayRoundNumber(state.session);

  return (
    <section className={`panel timer-panel timer-shell phase-shell-${state.session.phase} ${isCelebrating ? "round-complete-burst" : ""}`}>
      <div className="crt-overlay" aria-hidden="true" />
      <div className="vignette-overlay" aria-hidden="true" />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Countdown Engine</p>
          <h2>Round Control</h2>
        </div>
        <div className="status-stack">
          <span className={`phase-pill phase-${state.session.phase}`}>{phaseLabel}</span>
          <span className="capacity-pill">Round {displayRoundNumber}</span>
        </div>
      </div>

      <div
        className={`timer-face timer-phase-${countdownDisplay.phase} ${countdownDisplay.isUrgent ? "timer-face-urgent" : ""} ${
          state.session.phase === "precount" ? "timer-face-precount" : ""
        } ${state.session.phase === "completed" ? "timer-face-complete" : ""}`}
      >
        <div className="timer-rails timer-rails-left" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="timer-center">
          <span className="timer-value">{countdownDisplay.headline}</span>
          <span className="timer-subcopy">{countdownDisplay.subheadline}</span>
          {countdownDisplay.accentText ? <span className="timer-accent">{countdownDisplay.accentText}</span> : null}
        </div>
        <div className="timer-rails timer-rails-right" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={`armed-banner ${lobbyState.isArmed ? "armed-live" : ""} ${state.session.phase === "precount" ? "armed-banner-hot" : ""}`}>
        <span className="armed-prefix">
          <span className="armed-prefix-icon" aria-hidden="true">
            ◉
          </span>
          {armedLabel}
        </span>
        <span className="armed-copy">{getStatusCopy(lobbyState, state.syncStatus)}</span>
        <span className="armed-chevron" aria-hidden="true">
          •••
        </span>
      </div>

      {state.syncStatus.connection !== "connected" ? (
        <div className="panel inset-panel sync-state-card">
          <p className="meta-label">Sync state</p>
          <p>
            {state.syncStatus.connection === "connecting"
              ? "Attempting to establish synchronized timing."
              : "Shared timing is not currently available. Multiplayer actions are paused."}
          </p>
        </div>
      ) : null}

      <div className="hold-stage">
        <button
          type="button"
          className={`hold-button ${isHolding ? "hold-button-active" : ""}`}
          disabled={!lobbyState.canHoldToReady || !syncReady}
          {...bindHoldButton}
        >
          <span className="hold-orb" aria-hidden="true" />
          <span className="hold-copy">
            <span className="hold-title">{actionLabel.title}</span>
            <span className="hold-subtitle">{actionLabel.subtitle}</span>
          </span>
          <span className="hold-grid" aria-hidden="true">
            ......
          </span>
        </button>
      </div>

      <div className="timer-config panel inset-panel">
        <div className="timer-config-grid">
          <div className="duration-block">
            <div className="config-heading">
              <p className="meta-label">Duration</p>
            </div>
            <div className="timer-config-row">
              <input
                type="number"
                min={5}
                max={600}
                step={1}
                value={draftDuration}
                onChange={(event) => setDraftDuration(event.target.value)}
                onBlur={() => onSetTimerDuration(Number(draftDuration))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSetTimerDuration(Number(draftDuration));
                  }
                }}
                disabled={!lobbyState.canEditTimer || !syncReady}
                className="timer-input"
              />
              <span className="timer-input-suffix">seconds</span>
            </div>
            <div className="preset-row">
              {state.timerConfig.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`ghost-button ${preset === state.timerConfig.durationSeconds ? "preset-active" : ""}`}
                  disabled={!lobbyState.canEditTimer || !syncReady}
                  onClick={() => onSetTimerDuration(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flow-preview">
            <div className="config-heading">
              <p className="meta-label">Flow Preview</p>
            </div>
            <div className="precount-preset-row">
              {preCountPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`ghost-button precount-button ${preset === state.timerConfig.preCountSeconds ? "preset-active" : ""}`}
                  disabled={!lobbyState.canEditTimer || !syncReady}
                  onClick={() => onSetPrecountDuration(preset)}
                >
                  {getPrecountSequenceLabel(preset)}
                </button>
              ))}
            </div>
            <div className="flow-steps">
              <span className="flow-step">Hold</span>
              <span className="flow-arrow">{">"}</span>
              <span className="flow-step flow-step-live">Armed</span>
              <span className="flow-arrow">{">"}</span>
              <span className="flow-step">{getPrecountSequenceLabel(state.timerConfig.preCountSeconds)}</span>
              <span className="flow-arrow">{">"}</span>
              <span className="flow-step">Start</span>
            </div>
          </div>
        </div>
      </div>

      <div className="cta-row cta-row-bottom">
        <button type="button" className="primary-button run-it-back" disabled={!lobbyState.canResetRound || !syncReady} onClick={onResetRound}>
          <span className="button-icon" aria-hidden="true">
            ↻
          </span>
          Reset / Replay
        </button>
        <button type="button" className="ghost-button settings-button" disabled>
          <span className="button-icon" aria-hidden="true">
            ⚙
          </span>
          Settings
        </button>
      </div>
    </section>
  );
}
