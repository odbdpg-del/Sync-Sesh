import type { CountdownDisplayState, CountdownTimeline, DabSyncState } from "../../types/session";

function parseTimestamp(value?: string) {
  return value ? Date.parse(value) : undefined;
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getPrecountValue(countdown: CountdownTimeline, serverNowMs: number, preCountSeconds: number) {
  const countdownStartMs = parseTimestamp(countdown.countdownStartAt);

  if (countdownStartMs === undefined) {
    return String(preCountSeconds);
  }

  const millisecondsLeft = countdownStartMs - serverNowMs;

  if (millisecondsLeft <= 150) {
    return "GO";
  }

  return Math.max(1, Math.ceil(millisecondsLeft / 1000)).toString();
}

function getCountdownSecondsLeft(countdown: CountdownTimeline, serverNowMs: number) {
  const endAtMs = parseTimestamp(countdown.countdownEndAt);

  if (endAtMs === undefined) {
    return 0;
  }

  return Math.max(0, Math.ceil((endAtMs - serverNowMs) / 1000));
}

export function getApproxServerNow(state: DabSyncState) {
  return Date.now() + (state.syncStatus.serverTimeOffsetMs ?? 0);
}

export function deriveCountdownDisplay(state: DabSyncState, serverNowMs: number): CountdownDisplayState {
  switch (state.session.phase) {
    case "armed":
      return {
        phase: state.session.phase,
        headline: "ARMED",
        subheadline: "Release to trigger the synchronized pre-count",
        timerText: formatSeconds(state.timerConfig.durationSeconds),
        accentText: "All active participants are ready",
        isUrgent: false,
      };
    case "precount":
      return {
        phase: state.session.phase,
        headline: getPrecountValue(state.countdown, serverNowMs, state.timerConfig.preCountSeconds),
        subheadline: "Synchronized pre-count",
        timerText: formatSeconds(state.timerConfig.durationSeconds),
        accentText: "Main timer is about to begin",
        isUrgent: true,
      };
    case "countdown": {
      const secondsLeft = getCountdownSecondsLeft(state.countdown, serverNowMs);
      return {
        phase: state.session.phase,
        headline: formatSeconds(secondsLeft),
        subheadline: "Live round in progress",
        timerText: formatSeconds(secondsLeft),
        accentText: secondsLeft <= 10 ? "Final stretch" : `${state.timerConfig.durationSeconds}s configured`,
        isUrgent: secondsLeft <= 10,
      };
    }
    case "completed":
      return {
        phase: state.session.phase,
        headline: "00:00",
        subheadline: "Loading next round",
        timerText: "00:00",
        accentText: "Stand by",
        isUrgent: false,
      };
    case "idle":
    case "lobby":
    default:
      return {
        phase: state.session.phase,
        headline: formatSeconds(state.timerConfig.durationSeconds),
        subheadline: "Awaiting ready hold",
        timerText: formatSeconds(state.timerConfig.durationSeconds),
        accentText: `${state.timerConfig.preCountSeconds}-second pre-count armed on release`,
        isUrgent: false,
      };
  }
}
