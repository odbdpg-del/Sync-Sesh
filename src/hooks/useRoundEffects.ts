import { useEffect, useRef, useState } from "react";
import type { SessionPhase } from "../types/session";

const EFFECT_DURATION_MS = 720;

function playCompletionCue() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const now = audioContext.currentTime;
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  masterGain.connect(audioContext.destination);

  const tones: Array<[number, number]> = [
    [880, 0],
    [1320, 0.12],
    [1760, 0.24],
  ];

  for (const [frequency, offset] of tones) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, now + offset);
    oscillator.connect(masterGain);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.12);
  }

  window.setTimeout(() => {
    void audioContext.close();
  }, 900);
}

export function useRoundEffects(phase: SessionPhase) {
  const previousPhaseRef = useRef<SessionPhase>(phase);
  const [isCelebrating, setIsCelebrating] = useState(false);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (previousPhase !== "completed" && phase === "completed") {
      setIsCelebrating(true);
      playCompletionCue();

      const timeoutId = window.setTimeout(() => {
        setIsCelebrating(false);
      }, EFFECT_DURATION_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (phase !== "completed") {
      setIsCelebrating(false);
    }

    return undefined;
  }, [phase]);

  return {
    isCelebrating,
  };
}
