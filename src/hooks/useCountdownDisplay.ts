import { useEffect, useMemo, useRef, useState } from "react";
import { deriveCountdownDisplay, getApproxServerNow } from "../lib/countdown/engine";
import type { DabSyncState } from "../types/session";

export function useCountdownDisplay(state: DabSyncState) {
  const [serverNowMs, setServerNowMs] = useState(() => getApproxServerNow(state));
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const shouldUsePrecisionTicker = state.session.phase === "countdown" && state.timerConfig.countdownPrecisionDigits > 0;

    if (shouldUsePrecisionTicker) {
      let animationFrameId = 0;
      const baseServerNowMs = getApproxServerNow(state);
      const basePerformanceNowMs = performance.now();
      const tick = () => {
        setServerNowMs(baseServerNowMs + performance.now() - basePerformanceNowMs);
        animationFrameId = window.requestAnimationFrame(tick);
      };

      tick();

      return () => {
        window.cancelAnimationFrame(animationFrameId);
      };
    }

    const tick = () => {
      setServerNowMs(getApproxServerNow(stateRef.current));
    };

    tick();
    const intervalId = window.setInterval(tick, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.session.phase, state.syncStatus.serverTimeOffsetMs, state.timerConfig.countdownPrecisionDigits]);

  return useMemo(() => deriveCountdownDisplay(state, serverNowMs), [serverNowMs, state]);
}

