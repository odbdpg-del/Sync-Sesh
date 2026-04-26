import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initializeEmbeddedApp, retryDiscordIdentity, type EmbeddedAppState } from "../lib/discord/embeddedApp";
import { createSyncClient } from "../lib/sync/createSyncClient";
import type { DabSyncState, FreeRoamPresenceUpdate, RangeScoreSubmission } from "../types/session";
import { deriveLobbyState } from "../lib/lobby/sessionState";

export function useDabSyncSession() {
  const [sdkState, setSdkState] = useState<EmbeddedAppState>({ enabled: false });
  const [syncClient] = useState(() => createSyncClient());
  const [state, setState] = useState<DabSyncState>(() => syncClient.getSnapshot());
  const autoJoinAttemptKeyRef = useRef<string | null>(null);
  const embeddedCleanupRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    const unsubscribe = syncClient.subscribe(setState);
    let disposed = false;
    void initializeEmbeddedApp({
      onProfileUpdate: (localProfile) => {
        if (disposed) {
          return;
        }

        const previousLocalProfile = syncClient.getSnapshot().localProfile;
        const profileChanged =
          previousLocalProfile.id !== localProfile.id ||
          previousLocalProfile.displayName !== localProfile.displayName ||
          previousLocalProfile.avatarUrl !== localProfile.avatarUrl ||
          previousLocalProfile.avatarSeed !== localProfile.avatarSeed;

        if (!profileChanged) {
          return;
        }

        syncClient.setLocalProfile(localProfile);
        setSdkState((current) => ({ ...current, localProfile, identitySource: "discord", authError: undefined }));

        if (syncClient.getSnapshot().users.some((user) => user.id === localProfile.id)) {
          syncClient.send({ type: "join_session" });
        }
      },
    })
      .then((nextSdkState) => {
        if (disposed) {
          nextSdkState.cleanup?.();
          return;
        }

        embeddedCleanupRef.current = nextSdkState.cleanup;
        setSdkState(nextSdkState);

        if (nextSdkState.localProfile) {
          syncClient.setLocalProfile(nextSdkState.localProfile);
        }

        return syncClient.connect();
      })
      .catch(() => {
        if (disposed) {
          return;
        }

        setSdkState({
          enabled: false,
          identitySource: "local",
          startupStage: "sdk_init",
          startupError: "Discord startup failed before initialization completed.",
        });
        void syncClient.connect();
      });

    return () => {
      disposed = true;
      embeddedCleanupRef.current?.();
      embeddedCleanupRef.current = undefined;
      unsubscribe();
      syncClient.disconnect();
    };
  }, [syncClient]);

  const retryDiscordProfile = useCallback(async () => {
    const currentSdk = sdkState.sdk;

    if (!currentSdk) {
      return;
    }

    setSdkState((current) => ({
      ...current,
      startupStage: "auth",
      startupError: undefined,
      authError: undefined,
    }));

    const nextSdkState = await retryDiscordIdentity(currentSdk, {
      authPrompt: "interactive",
      onProfileUpdate: (localProfile) => {
        const previousLocalProfile = syncClient.getSnapshot().localProfile;
        const profileChanged =
          previousLocalProfile.id !== localProfile.id ||
          previousLocalProfile.displayName !== localProfile.displayName ||
          previousLocalProfile.avatarUrl !== localProfile.avatarUrl ||
          previousLocalProfile.avatarSeed !== localProfile.avatarSeed;

        if (!profileChanged) {
          return;
        }

        syncClient.setLocalProfile(localProfile);
        setSdkState((current) => ({ ...current, localProfile, identitySource: "discord", authError: undefined }));

        if (syncClient.getSnapshot().users.some((user) => user.id === localProfile.id)) {
          syncClient.send({ type: "join_session" });
        }
      },
    });

    embeddedCleanupRef.current?.();
    embeddedCleanupRef.current = nextSdkState.cleanup;
    setSdkState((current) => ({
      ...current,
      ...nextSdkState,
      sdk: currentSdk,
      channelId: currentSdk.channelId ?? current.channelId,
      guildId: currentSdk.guildId ?? current.guildId,
      instanceId: currentSdk.instanceId ?? current.instanceId,
    }));

    if (nextSdkState.localProfile) {
      syncClient.setLocalProfile(nextSdkState.localProfile);
    }
  }, [sdkState.sdk, syncClient]);

  const lobbyState = useMemo(() => deriveLobbyState(state), [state]);

  useEffect(() => {
    if (!state.timerConfig.autoJoinOnLoad || state.syncStatus.connection !== "connected" || !lobbyState.canJoinSession) {
      return;
    }

    const attemptKey = `${state.session.id}:${state.localProfile.id}`;

    if (autoJoinAttemptKeyRef.current === attemptKey) {
      return;
    }

    autoJoinAttemptKeyRef.current = attemptKey;
    syncClient.send({ type: "join_session" });
  }, [
    lobbyState.canJoinSession,
    state.localProfile.id,
    state.session.id,
    state.syncStatus.connection,
    state.timerConfig.autoJoinOnLoad,
    syncClient,
  ]);

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

  const setLateJoinersJoinReady = useCallback(
    (enabled: boolean) => {
      syncClient.send({ type: "admin_set_late_joiners_join_ready", enabled });
    },
    [syncClient],
  );

  const setAutoJoinOnLoad = useCallback(
    (enabled: boolean) => {
      syncClient.send({ type: "admin_set_auto_join_on_load", enabled });
    },
    [syncClient],
  );

  const submitRangeScore = useCallback(
    (result: RangeScoreSubmission) => {
      syncClient.send({ type: "range_score_submit", result });
    },
    [syncClient],
  );

  const updateFreeRoamPresence = useCallback(
    (presence: FreeRoamPresenceUpdate) => {
      syncClient.send({ type: "free_roam_presence_update", presence });
    },
    [syncClient],
  );

  const clearFreeRoamPresence = useCallback(() => {
    syncClient.send({ type: "free_roam_presence_clear" });
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
    setLateJoinersJoinReady,
    setAutoJoinOnLoad,
    submitRangeScore,
    updateFreeRoamPresence,
    clearFreeRoamPresence,
    retryDiscordProfile,
  };
}
