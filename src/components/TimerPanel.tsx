import { useEffect, useState } from "react";
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
  onResetRound: () => void;
}

function getStatusCopy(lobbyState: DerivedLobbyState, syncStatus: SyncStatus) {
  if (syncStatus.connection === "connecting") {
    return "Connecting to sync layer. Timing controls will stabilize once the link is ready.";
  }

  if (syncStatus.connection === "offline" || syncStatus.connection === "error") {
    return syncStatus.warning ?? "Sync unavailable. Reconnect before relying on shared timing.";
  }

  if (syncStatus.warning) {
    return syncStatus.warning;
  }

  if (lobbyState.isArmed) {
    return "ARMED: any ready participant can release to trigger the countdown.";
  }

  return "Hold to ready. Once everyone active is holding, release starts the round.";
}

export function TimerPanel({
  state,
  lobbyState,
  countdownDisplay,
  onStartReadyHold,
  onEndReadyHold,
  onSetTimerDuration,
  onResetRound,
}: TimerPanelProps) {
  const { isCelebrating } = useRoundEffects(state.session.phase);
  const [draftDuration, setDraftDuration] = useState(state.timerConfig.durationSeconds.toString());
  const syncReady = state.syncStatus.mode === "mock" || state.syncStatus.connection === "connected";
  const { isHolding, bindHoldButton } = useReadyHold({
    enabled: lobbyState.canHoldToReady && syncReady,
    onHoldStart: onStartReadyHold,
    onHoldEnd: onEndReadyHold,
  });

  useEffect(() => {
    setDraftDuration(state.timerConfig.durationSeconds.toString());
  }, [state.timerConfig.durationSeconds]);

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
          <span className={`phase-pill phase-${state.session.phase}`}>{state.session.phase}</span>
          <span className="capacity-pill">Round {state.session.roundNumber}</span>
        </div>
      </div>

      <div
        className={`timer-face timer-phase-${countdownDisplay.phase} ${countdownDisplay.isUrgent ? "timer-face-urgent" : ""} ${
          state.session.phase === "precount" ? "timer-face-precount" : ""
        } ${state.session.phase === "completed" ? "timer-face-complete" : ""}`}
      >
        <span className="timer-value">{countdownDisplay.headline}</span>
        <span className="timer-subcopy">{countdownDisplay.subheadline}</span>
        {countdownDisplay.accentText ? <span className="timer-accent">{countdownDisplay.accentText}</span> : null}
      </div>

      <div className={`armed-banner ${lobbyState.isArmed ? "armed-live" : ""} ${state.session.phase === "precount" ? "armed-banner-hot" : ""}`}>
        {getStatusCopy(lobbyState, state.syncStatus)}
      </div>

      {state.syncStatus.connection !== "connected" ? (
        <div className="panel inset-panel sync-state-card">
          <p className="meta-label">Sync state</p>
          <p>
            {state.syncStatus.connection === "connecting"
              ? "Attempting to establish synchronized timing."
              : "Shared timing is not currently available. You can still inspect the session, but multiplayer actions are paused."}
          </p>
        </div>
      ) : null}

      <div className="timer-config panel inset-panel">
        <div className="config-heading">
          <p className="meta-label">Duration</p>
          <span className="meta-label">Shared across the current session</span>
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

      <div className="cta-row">
        <button
          type="button"
          className={`hold-button ${isHolding ? "hold-button-active" : ""}`}
          disabled={!lobbyState.canHoldToReady || !syncReady}
          {...bindHoldButton}
        >
          {lobbyState.isLocalUserSpectating
            ? "Spectating This Round"
            : lobbyState.releaseStartsCountdown
              ? "Release To Start"
              : isHolding
                ? "Holding Ready"
                : "Hold To Ready"}
        </button>
        <button type="button" className="ghost-button replay-button" disabled={!lobbyState.canResetRound || !syncReady} onClick={onResetRound}>
          Replay / Reset
        </button>
      </div>

      <div className="panel inset-panel">
        <p className="meta-label">Flow</p>
        <ul className="instruction-list">
          <li>Reach ARMED by having every active participant hold ready.</li>
          <li>Release from ARMED to start a synchronized 3...2...1 pre-count.</li>
          <li>When the main timer reaches zero, replay returns everyone to lobby.</li>
        </ul>
      </div>
    </section>
  );
}
