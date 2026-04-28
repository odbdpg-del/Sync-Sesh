import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDiscordAuthAttemptId,
  initializeEmbeddedApp,
  shouldApplyDiscordAuthAttemptResult,
  type EmbeddedAppState,
  type DiscordAuthStage,
} from "../lib/discord/embeddedApp";
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

const DISCORD_RETRY_TIMEOUT_MS = 20_000;

export function useDabSyncSession() {
  const [sdkState, setSdkState] = useState<EmbeddedAppState>({ enabled: false, buildId: __APP_BUILD_ID__, authStage: "idle" });
  const [generatedDisplayNames, setGeneratedDisplayNames] = useState<string[]>(GENERATED_PROFILE_NAMES);
  const [syncClient] = useState(() => createSyncClient());
  const [state, setState] = useState<DabSyncState>(() => syncClient.getSnapshot());
  const autoJoinAttemptKeyRef = useRef<string | null>(null);
  const embeddedCleanupRef = useRef<(() => void) | undefined>();
  const activeAuthAttemptIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (!sdkState.attemptId || !sdkState.authStage || sdkState.authStage === "idle" || sdkState.authStage === "ready" || sdkState.authError) {
      return;
    }

    const attemptId = sdkState.attemptId;
    const stalledStage = sdkState.authStage;
    const timeoutId = window.setTimeout(() => {
      setSdkState((current) => {
        if (
          current.attemptId !== attemptId ||
          current.authStage !== stalledStage ||
          current.authError
        ) {
          return current;
        }

        const message = `Discord identity refresh timed out while ${stalledStage.replace(/_/g, " ")}.`;

        return {
          ...current,
          authStage: "idle",
          startupStage: "auth",
          startupError: message,
          authError: message,
        };
      });
    }, DISCORD_RETRY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [sdkState.attemptId, sdkState.authError, sdkState.authStage]);

  useEffect(() => {
    const unsubscribe = syncClient.subscribe(setState);
    let disposed = false;
    const initialAttemptId = createDiscordAuthAttemptId();
    activeAuthAttemptIdRef.current = initialAttemptId;

    const handleAuthProgress = (attemptId: string, authStage: DiscordAuthStage, authError?: string) => {
      setSdkState((current) => {
        if (!shouldApplyDiscordAuthAttemptResult(activeAuthAttemptIdRef.current, attemptId)) {
          return current;
        }

        return {
          ...current,
          enabled: true,
          buildId: current.buildId ?? __APP_BUILD_ID__,
          attemptId,
          authStage,
          startupStage: "auth",
          startupError: authError,
          authError,
        };
      });
    };

    void initializeEmbeddedApp({
      attemptId: initialAttemptId,
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
        setSdkState((current) => ({ ...current, localProfile, identitySource: "discord", authError: undefined, startupError: undefined, authStage: "ready" }));

        if (syncClient.getSnapshot().users.some((user) => user.id === localProfile.id)) {
          syncClient.send({ type: "join_session" });
        }
      },
      onAuthProgress: ({ attemptId, authStage, authError }) => {
        handleAuthProgress(attemptId, authStage, authError);
      },
    })
      .then((nextSdkState) => {
        if (disposed) {
          nextSdkState.cleanup?.();
          return;
        }

        if (!shouldApplyDiscordAuthAttemptResult(activeAuthAttemptIdRef.current, nextSdkState.attemptId ?? initialAttemptId)) {
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
          buildId: __APP_BUILD_ID__,
          attemptId: initialAttemptId,
          identitySource: "local",
          authStage: "idle",
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
    const attemptId = createDiscordAuthAttemptId();
    activeAuthAttemptIdRef.current = attemptId;

    const handleAuthProgress = (incomingAttemptId: string, authStage: DiscordAuthStage, authError?: string) => {
      setSdkState((current) => {
        if (!shouldApplyDiscordAuthAttemptResult(activeAuthAttemptIdRef.current, incomingAttemptId)) {
          return current;
        }

        return {
          ...current,
          attemptId: incomingAttemptId,
          authStage,
          startupStage: "auth",
          startupError: authError,
          authError,
        };
      });
    };

    setSdkState((current) => ({
      ...current,
      attemptId,
      authStage: "authorizing",
      startupStage: "auth",
      startupError: undefined,
      authError: undefined,
    }));

    try {
      const nextSdkState = await Promise.race([
        initializeEmbeddedApp({
          attemptId,
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
            setSdkState((current) => ({
              ...current,
              localProfile,
              identitySource: "discord",
              authError: undefined,
              startupError: undefined,
              authStage: "ready",
            }));

            if (syncClient.getSnapshot().users.some((user) => user.id === localProfile.id)) {
              syncClient.send({ type: "join_session" });
            }
          },
          onAuthProgress: ({ attemptId: incomingAttemptId, authStage, authError }) => {
            handleAuthProgress(incomingAttemptId, authStage, authError);
          },
        }),
        new Promise<EmbeddedAppState>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("Discord identity refresh timed out before the SDK completed authorization."));
          }, DISCORD_RETRY_TIMEOUT_MS);
        }),
      ]);

      if (!shouldApplyDiscordAuthAttemptResult(activeAuthAttemptIdRef.current, nextSdkState.attemptId ?? attemptId)) {
        nextSdkState.cleanup?.();
        return;
      }

      embeddedCleanupRef.current?.();
      embeddedCleanupRef.current = nextSdkState.cleanup;
      setSdkState(nextSdkState);

      if (nextSdkState.localProfile) {
        syncClient.setLocalProfile(nextSdkState.localProfile);
      }
    } catch (error) {
      if (!shouldApplyDiscordAuthAttemptResult(activeAuthAttemptIdRef.current, attemptId)) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Discord identity refresh failed before authorization completed.";

      setSdkState((current) => ({
        ...current,
        attemptId,
        authStage: "idle",
        startupStage: "auth",
        startupError: message,
        authError: message,
        identitySource: current.identitySource ?? "local",
      }));
    }
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
    retryDiscordProfile,
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
