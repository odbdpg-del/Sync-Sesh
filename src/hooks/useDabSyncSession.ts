import { useCallback, useEffect, useMemo, useState } from "react";
import { initializeEmbeddedApp, type EmbeddedAppState } from "../lib/discord/embeddedApp";
import { createSyncClient } from "../lib/sync/createSyncClient";
import type { DabSyncState } from "../types/session";
import { deriveLobbyState } from "../lib/lobby/sessionState";

export function useDabSyncSession() {
  const [sdkState, setSdkState] = useState<EmbeddedAppState>({ enabled: false });
  const [syncClient] = useState(() => createSyncClient());
  const [state, setState] = useState<DabSyncState>(() => syncClient.getSnapshot());

  useEffect(() => {
    const unsubscribe = syncClient.subscribe(setState);

    void initializeEmbeddedApp()
      .then((nextSdkState) => {
        setSdkState(nextSdkState);

        if (nextSdkState.localProfile) {
          syncClient.setLocalProfile(nextSdkState.localProfile);
        }

        return syncClient.connect();
      })
      .catch(() => {
        setSdkState({ enabled: false });
        void syncClient.connect();
      });

    return () => {
      unsubscribe();
      syncClient.disconnect();
    };
  }, [syncClient]);

  const lobbyState = useMemo(() => deriveLobbyState(state), [state]);

  const joinSession = useCallback(() => {
    syncClient.send({ type: "join_session" });
  }, [syncClient]);

  const startReadyHold = useCallback(() => {
    syncClient.send({ type: "ready_hold_start" });
  }, [syncClient]);

  const endReadyHold = useCallback(() => {
    syncClient.send({ type: "ready_hold_end" });
  }, [syncClient]);

  const setTimerDuration = useCallback(
    (durationSeconds: number) => {
      syncClient.send({ type: "set_timer_duration", durationSeconds });
    },
    [syncClient],
  );

  const setPrecountDuration = useCallback(
    (preCountSeconds: number) => {
      syncClient.send({ type: "set_precount_duration", preCountSeconds });
    },
    [syncClient],
  );

  const resetRound = useCallback(() => {
    syncClient.send({ type: "reset_round" });
  }, [syncClient]);

  const forceStartRound = useCallback(() => {
    syncClient.send({ type: "admin_force_start_round" });
  }, [syncClient]);

  const forceCompleteRound = useCallback(() => {
    syncClient.send({ type: "admin_force_complete_round" });
  }, [syncClient]);

  const adminResetSession = useCallback(() => {
    syncClient.send({ type: "admin_reset_session" });
  }, [syncClient]);

  const addTestParticipant = useCallback(() => {
    syncClient.send({ type: "admin_add_test_participant" });
  }, [syncClient]);

  const toggleTestParticipantsReady = useCallback(() => {
    syncClient.send({ type: "admin_toggle_test_participants_ready" });
  }, [syncClient]);

  const clearTestParticipants = useCallback(() => {
    syncClient.send({ type: "admin_clear_test_participants" });
  }, [syncClient]);

  return {
    state,
    lobbyState,
    sdkState,
    joinSession,
    startReadyHold,
    endReadyHold,
    setTimerDuration,
    setPrecountDuration,
    resetRound,
    forceStartRound,
    forceCompleteRound,
    adminResetSession,
    addTestParticipant,
    toggleTestParticipantsReady,
    clearTestParticipants,
  };
}
