import { useEffect, useMemo, useState } from "react";
import { deriveCountdownDisplay, getApproxServerNow } from "../lib/countdown/engine";
import type { DabSyncState } from "../types/session";

export function useCountdownDisplay(state: DabSyncState) {
  const [serverNowMs, setServerNowMs] = useState(() => getApproxServerNow(state));

  useEffect(() => {
    const tick = () => {
      setServerNowMs(getApproxServerNow(state));
    };

    tick();
    const intervalId = window.setInterval(tick, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state]);

  return useMemo(() => deriveCountdownDisplay(state, serverNowMs), [serverNowMs, state]);
}

