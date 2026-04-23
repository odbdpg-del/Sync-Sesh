import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initializeEmbeddedApp, type EmbeddedAppState } from "../lib/discord/embeddedApp";
import { createSyncClient } from "../lib/sync/createSyncClient";
import { GENERATED_PROFILE_NAMES, getAvatarSeedFromName, getRolledGeneratedProfileNameForUser } from "../lib/session/generatedNames";
import { persistLocalProfile } from "../lib/session/localProfile";
import type {
  DabSyncState,
  FreeRoamPresenceUpdate,
  RangeScoreSubmission,
  SharedDawClipPublishPayload,
  SharedDawLiveSoundPayload,
  SharedDawTrackId,
} from "../types/session";
import { deriveLobbyState } from "../lib/lobby/sessionState";

export function useDabSyncSession() {
  const [sdkState, setSdkState] = useState<EmbeddedAppState>({ enabled: false });
  const [generatedDisplayNames, setGeneratedDisplayNames] = useState<string[]>(GENERATED_PROFILE_NAMES);
  const [syncClient] = useState(() => createSyncClient());
  const [state, setState] = useState<DabSyncState>(() => syncClient.getSnapshot());
  const autoJoinAttemptKeyRef = useRef<string | null>(null);

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

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/sync/generated-names", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ names?: unknown }> : null)
      .then((payload) => {
        if (!payload || !Array.isArray(payload.names)) {
          return;
        }

        const names = payload.names.filter((name): name is string => typeof name === "string" && name.trim().length > 0);

        if (names.length > 0) {
          setGeneratedDisplayNames(names);
        }
      })
      .catch(() => {
        // Keep the bundled fallback names when the sync server is unavailable.
      });

    return () => {
      controller.abort();
    };
  }, []);

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

  const rollDisplayName = useCallback(() => {
    const rollKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const currentDisplayName = lobbyState.localUser?.displayName ?? state.localProfile.displayName;
    const takenNames = state.users
      .filter((user) => user.id !== state.localProfile.id)
      .map((user) => user.displayName);
    const displayName = getRolledGeneratedProfileNameForUser(
      state.localProfile.id,
      takenNames,
      currentDisplayName,
      rollKey,
    );
    const nextProfile = {
      ...state.localProfile,
      displayName,
      avatarSeed: getAvatarSeedFromName(displayName),
    };

    persistLocalProfile(nextProfile);
    syncClient.setLocalProfile(nextProfile);
    syncClient.send({ type: "roll_display_name", rollKey });
  }, [lobbyState.localUser?.displayName, state.localProfile, state.users, syncClient]);

  const selectDisplayName = useCallback((displayName: string) => {
    const nextProfile = {
      ...state.localProfile,
      displayName,
      avatarSeed: getAvatarSeedFromName(displayName),
    };

    persistLocalProfile(nextProfile);
    syncClient.setLocalProfile(nextProfile);
    syncClient.send({ type: "select_display_name", displayName });
  }, [state.localProfile, syncClient]);

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

  const setCountdownPrecisionDigits = useCallback(
    (digits: number) => {
      syncClient.send({ type: "admin_set_countdown_precision_digits", digits });
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

  const setDawTempo = useCallback(
    (bpm: number) => {
      syncClient.send({ type: "daw_transport_set_tempo", bpm });
    },
    [syncClient],
  );

  const playDawTransport = useCallback(() => {
    syncClient.send({ type: "daw_transport_play" });
  }, [syncClient]);

  const stopDawTransport = useCallback(() => {
    syncClient.send({ type: "daw_transport_stop" });
  }, [syncClient]);

  const publishDawClip = useCallback(
    (clip: SharedDawClipPublishPayload) => {
      syncClient.send({ type: "daw_clip_publish", clip });
    },
    [syncClient],
  );

  const clearDawClip = useCallback(
    (trackId: SharedDawTrackId, sceneIndex: number) => {
      syncClient.send({ type: "daw_clip_clear", trackId, sceneIndex });
    },
    [syncClient],
  );

  const broadcastDawLiveSound = useCallback(
    (sound: SharedDawLiveSoundPayload) => {
      syncClient.send({ type: "daw_live_sound", sound });
    },
    [syncClient],
  );
  const pickupStudioGuitar = useCallback(() => {
    syncClient.send({ type: "studio_guitar_pickup" });
  }, [syncClient]);
  const dropStudioGuitar = useCallback(() => {
    syncClient.send({ type: "studio_guitar_drop" });
  }, [syncClient]);

  return {
    state,
    lobbyState,
    sdkState,
    generatedDisplayNames,
    joinSession,
    rollDisplayName,
    selectDisplayName,
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
    setCountdownPrecisionDigits,
    submitRangeScore,
    updateFreeRoamPresence,
    clearFreeRoamPresence,
    setDawTempo,
    playDawTransport,
    stopDawTransport,
    publishDawClip,
    clearDawClip,
    broadcastDawLiveSound,
    pickupStudioGuitar,
    dropStudioGuitar,
  };
}
