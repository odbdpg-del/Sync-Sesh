import { useEffect, useRef, useState } from "react";
import type { SessionPhase } from "../types/session";

const EFFECT_DURATION_MS = 720;

export function useRoundEffects(phase: SessionPhase) {
  const previousPhaseRef = useRef<SessionPhase>(phase);
  const [isCelebrating, setIsCelebrating] = useState(false);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (previousPhase !== "completed" && phase === "completed") {
      setIsCelebrating(true);

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
