import { useCallback, useEffect, useRef } from "react";
import type { CountdownDisplayState, DabSyncState, DerivedLobbyState } from "../types/session";
import type { SoundCueId } from "../audio/soundEffects";

type CueShape = {
  type?: OscillatorType;
  startHz: number;
  endHz?: number;
  duration: number;
  volume?: number;
  offset?: number;
};

const CUE_SHAPES: Record<SoundCueId, CueShape[]> = {
  ui_join_ping: [{ type: "triangle", startHz: 660, endHz: 880, duration: 0.16, volume: 0.045 }],
  ui_ready_hold_start: [{ type: "sine", startHz: 240, endHz: 360, duration: 0.2, volume: 0.05 }],
  ui_ready_release_cancel: [{ type: "triangle", startHz: 420, endHz: 220, duration: 0.14, volume: 0.04 }],
  state_armed_lock: [
    { type: "square", startHz: 330, duration: 0.12, volume: 0.055 },
    { type: "triangle", startHz: 495, duration: 0.2, volume: 0.045, offset: 0.03 },
  ],
  ui_secret_unlock: [
    { type: "triangle", startHz: 620, duration: 0.08, volume: 0.03 },
    { type: "triangle", startHz: 880, duration: 0.08, volume: 0.028, offset: 0.08 },
    { type: "triangle", startHz: 1240, duration: 0.12, volume: 0.03, offset: 0.16 },
  ],
  count_second_tick: [{ type: "triangle", startHz: 740, endHz: 700, duration: 0.06, volume: 0.018 }],
  count_pre_3: [{ type: "square", startHz: 280, duration: 0.12, volume: 0.05 }],
  count_pre_2: [{ type: "square", startHz: 420, duration: 0.12, volume: 0.05 }],
  count_pre_1: [{ type: "square", startHz: 620, duration: 0.12, volume: 0.06 }],
  count_launch_hit: [
    { type: "sawtooth", startHz: 220, endHz: 660, duration: 0.16, volume: 0.055 },
    { type: "triangle", startHz: 880, duration: 0.12, volume: 0.04, offset: 0.05 },
  ],
  count_urgent_tick: [{ type: "triangle", startHz: 960, duration: 0.07, volume: 0.025 }],
  round_complete_sting: [
    { type: "square", startHz: 880, duration: 0.12, volume: 0.05 },
    { type: "square", startHz: 1320, duration: 0.12, volume: 0.045, offset: 0.12 },
    { type: "square", startHz: 1760, duration: 0.12, volume: 0.04, offset: 0.24 },
  ],
  round_reset_sweep: [{ type: "triangle", startHz: 260, endHz: 520, duration: 0.22, volume: 0.045 }],
};

function getAudioContextClass() {
  return window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function createAudioEngine() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = getAudioContextClass();

  if (!AudioContextClass) {
    return null;
  }

  const audioContext = new AudioContextClass();
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(audioContext.destination);

  return { audioContext, masterGain };
}

export function useSoundEffects(state: DabSyncState, lobbyState: DerivedLobbyState, countdownDisplay: CountdownDisplayState) {
  const engineRef = useRef<ReturnType<typeof createAudioEngine> | null>(null);
  const previousPhaseRef = useRef(state.session.phase);
  const previousHeadlineRef = useRef(countdownDisplay.headline);
  const previousCountdownSecondRef = useRef<string | null>(null);
  const previousArmedRef = useRef(lobbyState.isArmed);

  const playCue = useCallback((cueId: SoundCueId) => {
    if (typeof window === "undefined") {
      return;
    }

    engineRef.current ??= createAudioEngine();
    const engine = engineRef.current;

    if (!engine) {
      return;
    }

    const { audioContext, masterGain } = engine;
    const now = audioContext.currentTime;

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    for (const shape of CUE_SHAPES[cueId]) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const offset = shape.offset ?? 0;
      const startAt = now + offset;
      const stopAt = startAt + shape.duration;
      const volume = shape.volume ?? 0.04;

      oscillator.type = shape.type ?? "triangle";
      oscillator.frequency.setValueAtTime(shape.startHz, startAt);

      if (shape.endHz !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, shape.endHz), stopAt);
      }

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.02);
    }
  }, []);

  const playSecretCodeStep = useCallback((stepIndex: number) => {
    if (typeof window === "undefined") {
      return;
    }

    engineRef.current ??= createAudioEngine();
    const engine = engineRef.current;

    if (!engine) {
      return;
    }

    const { audioContext, masterGain } = engine;
    const now = audioContext.currentTime;

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const baseFrequency = 460;
    const stepFrequency = baseFrequency + stepIndex * 48;
    const stopAt = now + 0.075;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(stepFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(stepFrequency * 1.035, stopAt);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.024, now + 0.016);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(stopAt + 0.02);
  }, []);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    const previousHeadline = previousHeadlineRef.current;
    const previousArmed = previousArmedRef.current;

    if (!previousArmed && lobbyState.isArmed) {
      playCue("state_armed_lock");
    }

    if (state.session.phase === "precount" && countdownDisplay.headline !== previousHeadline) {
      if (countdownDisplay.headline === "5") {
        playCue("count_pre_3");
      } else if (countdownDisplay.headline === "4") {
        playCue("count_pre_2");
      } else if (countdownDisplay.headline === "3") {
        playCue("count_pre_3");
      } else if (countdownDisplay.headline === "2") {
        playCue("count_pre_2");
      } else if (countdownDisplay.headline === "1") {
        playCue("count_pre_1");
      }
    }

    if (previousPhase === "precount" && state.session.phase === "countdown") {
      playCue("count_launch_hit");
    }

    if (previousPhase !== "completed" && state.session.phase === "completed") {
      playCue("round_complete_sting");
    }

    if (previousPhase === "completed" && state.session.phase !== "completed") {
      playCue("round_reset_sweep");
    }

    if (state.session.phase === "countdown") {
      const countdownSecond = countdownDisplay.timerText;

      if (
        countdownSecond !== previousCountdownSecondRef.current &&
        countdownSecond !== "00:00"
      ) {
        playCue(countdownDisplay.isUrgent ? "count_urgent_tick" : "count_second_tick");
      }

      previousCountdownSecondRef.current = countdownSecond;
    } else {
      previousCountdownSecondRef.current = null;
    }

    previousPhaseRef.current = state.session.phase;
    previousHeadlineRef.current = countdownDisplay.headline;
    previousArmedRef.current = lobbyState.isArmed;
  }, [countdownDisplay.headline, countdownDisplay.isUrgent, countdownDisplay.timerText, lobbyState.isArmed, playCue, state.session.phase]);

  return {
    playCue,
    playSecretCodeStep,
  };
}
