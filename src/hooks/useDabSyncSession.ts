import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DebugConsoleEventInput } from "../lib/debug/debugConsole";
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
import { buildStartupProgress } from "../lib/startup/startupProgress";
import type {
  DabSyncState,
  FreeRoamPresenceUpdate,
  RangeScoreSubmission,
  SharedDawClipPublishPayload,
  SharedDawLiveSoundPayload,
  SharedDawTrackId,
  TextVoiceEvent,
  TextVoiceReplayEvent,
} from "../types/session";
import { deriveLobbyState } from "../lib/lobby/sessionState";

const DISCORD_SDK_READY_TIMEOUT_MS = 30_000;
const DISCORD_AUTHORIZING_TIMEOUT_MS = 60_000;
const DISCORD_FOLLOW_UP_STAGE_TIMEOUT_MS = 30_000;

function isStartupJoinReady(syncStatus: DabSyncState["syncStatus"]) {
  return syncStatus.mode === "mock" || syncStatus.startupMilestone === "snapshot_received";
}

function getDiscordStageWatchdog(authStage: DiscordAuthStage) {
  switch (authStage) {
    case "authorizing":
      return {
        timeoutMs: DISCORD_AUTHORIZING_TIMEOUT_MS,
        stalledDescription: "waiting for Discord authorization to complete",
      };
    case "exchanging_token":
      return {
        timeoutMs: DISCORD_FOLLOW_UP_STAGE_TIMEOUT_MS,
        stalledDescription: "exchanging the Discord authorization code",
      };
    case "authenticating":
      return {
        timeoutMs: DISCORD_FOLLOW_UP_STAGE_TIMEOUT_MS,
        stalledDescription: "authenticating with the Discord SDK",
      };
    case "subscribing":
      return {
        timeoutMs: DISCORD_FOLLOW_UP_STAGE_TIMEOUT_MS,
        stalledDescription: "subscribing to Discord identity updates",
      };
    default:
      return null;
  }
}

interface UseDabSyncSessionOptions {
  onDebugEvent?: (event: DebugConsoleEventInput) => void;
  onTextVoiceEvent?: (event: TextVoiceEvent) => void;
  onTextVoiceReplayEvent?: (event: TextVoiceReplayEvent) => void;
}

export function useDabSyncSession(options: UseDabSyncSessionOptions = {}) {
  const { onDebugEvent, onTextVoiceEvent, onTextVoiceReplayEvent } = options;
  const [sdkState, setSdkState] = useState<EmbeddedAppState>({ enabled: false, buildId: __APP_BUILD_ID__, authStage: "idle" });
  const [generatedDisplayNames, setGeneratedDisplayNames] = useState<string[]>(GENERATED_PROFILE_NAMES);
  const [syncClient] = useState(() => createSyncClient());
  const [state, setState] = useState<DabSyncState>(() => syncClient.getSnapshot());
  const autoJoinAttemptKeyRef = useRef<string | null>(null);
  const embeddedCleanupRef = useRef<(() => void) | undefined>();
  const activeAuthAttemptIdRef = useRef<string | undefined>();
  const previousIdentitySourceRef = useRef<EmbeddedAppState["identitySource"]>();
  const previousSyncConnectionRef = useRef<DabSyncState["syncStatus"]["connection"]>();
  const pendingDisplayNameRef = useRef<{ requestedName: string; source: "discord" | "picker" | "roll"; requestedLastEventAt?: string } | null>(null);
  const pendingDisplayNameTimeoutRef = useRef<number | undefined>();

  const queueDisplayNameDebug = useCallback((requestedName: string, source: "discord" | "picker" | "roll") => {
    pendingDisplayNameRef.current = { requestedName, source, requestedLastEventAt: state.syncStatus.lastEventAt };

    if (pendingDisplayNameTimeoutRef.current !== undefined) {
      window.clearTimeout(pendingDisplayNameTimeoutRef.current);
    }

    pendingDisplayNameTimeoutRef.current = window.setTimeout(() => {
      const pendingDisplayName = pendingDisplayNameRef.current;

      if (!pendingDisplayName) {
        return;
      }

      onDebugEvent?.({
        level: "warn",
        category: "profile",
        label: "profile:name-settle:timeout",
        detail: `${pendingDisplayName.source} requested "${pendingDisplayName.requestedName}", but no synced lobby name change was observed. If the sync server was just patched, restart dev:sync-server.`,
      });
    }, 2000);
  }, [onDebugEvent, state.syncStatus.lastEventAt]);

  useEffect(() => () => {
    if (pendingDisplayNameTimeoutRef.current !== undefined) {
      window.clearTimeout(pendingDisplayNameTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (sdkState.startupStage !== "sdk_ready" || sdkState.authStage !== "idle" || sdkState.startupError) {
      return;
    }

    const attemptId = sdkState.attemptId;
    const timeoutId = window.setTimeout(() => {
      setSdkState((current) => {
        if (
          current.attemptId !== attemptId ||
          current.startupStage !== "sdk_ready" ||
          current.authStage !== "idle" ||
          current.startupError
        ) {
          return current;
        }

        const message = "Discord SDK startup timed out while waiting for sdk.ready() during identity refresh.";
        onDebugEvent?.({
          level: "error",
          category: "sdk",
          label: "sdk:ready:failed",
          detail: message,
        });

        return {
          ...current,
          startupStage: "sdk_ready",
          startupError: message,
          authError: message,
        };
      });
    }, DISCORD_SDK_READY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onDebugEvent, sdkState.attemptId, sdkState.authStage, sdkState.startupError, sdkState.startupStage]);

  useEffect(() => {
    if (!sdkState.attemptId || !sdkState.authStage || sdkState.authStage === "idle" || sdkState.authStage === "ready" || sdkState.authError) {
      return;
    }

    const attemptId = sdkState.attemptId;
    const stalledStage = sdkState.authStage;
    const watchdog = getDiscordStageWatchdog(stalledStage);

    if (!watchdog) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSdkState((current) => {
        if (
          current.attemptId !== attemptId ||
          current.authStage !== stalledStage ||
          current.authError
        ) {
          return current;
        }

        const message = `Discord identity refresh timed out while ${watchdog.stalledDescription}.`;
        onDebugEvent?.({
          level: "error",
          category: "auth",
          label: `auth:${stalledStage}:failed`,
          detail: message,
        });

        return {
          ...current,
          authStage: "idle",
          startupStage: "auth",
          startupError: message,
          authError: message,
        };
      });
    }, watchdog.timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onDebugEvent, sdkState.attemptId, sdkState.authError, sdkState.authStage]);

  useEffect(() => {
    const currentIdentitySource = sdkState.identitySource;

    if (!currentIdentitySource || previousIdentitySourceRef.current === currentIdentitySource) {
      return;
    }

    previousIdentitySourceRef.current = currentIdentitySource;

    const level = currentIdentitySource === "authenticated_discord" ? "info" : currentIdentitySource === "participant_discord" ? "warn" : "error";
    const detail =
      currentIdentitySource === "authenticated_discord"
        ? "Using authenticated Discord identity."
        : currentIdentitySource === "participant_discord"
          ? "Using participant-only Discord identity."
          : sdkState.authError ?? sdkState.startupError ?? "Using local fallback identity.";

    onDebugEvent?.({
      level,
      category: "profile",
      label: `identity:${currentIdentitySource}`,
      detail,
    });
  }, [onDebugEvent, sdkState.authError, sdkState.identitySource, sdkState.startupError]);

  useEffect(() => {
    const currentConnection = state.syncStatus.connection;
    const previousConnection = previousSyncConnectionRef.current;

    if (previousConnection === currentConnection) {
      return;
    }

    previousSyncConnectionRef.current = currentConnection;

    if (currentConnection === "connecting") {
      onDebugEvent?.({
        level: "info",
        category: "sync",
        label: "sync:connect:start",
        detail: state.syncStatus.debugDetail ?? (state.syncStatus.mode === "ws" ? "Connecting to sync server." : "Starting mock sync transport."),
      });
      return;
    }

    if (currentConnection === "connected") {
      onDebugEvent?.({
        level: "info",
        category: "sync",
        label: "sync:connect:success",
        detail:
          state.syncStatus.debugDetail ??
          (state.syncStatus.latencyMs !== undefined ? `${state.syncStatus.mode} ${state.syncStatus.latencyMs}ms` : `${state.syncStatus.mode} connected`),
      });
      return;
    }

    if (currentConnection === "error") {
      onDebugEvent?.({
        level: "error",
        category: "sync",
        label: "sync:connect:failed",
        detail: state.syncStatus.debugDetail ?? state.syncStatus.warning ?? "Sync connection entered error state.",
      });
      return;
    }

    if (currentConnection === "offline" && previousConnection !== undefined) {
      onDebugEvent?.({
        level: "warn",
        category: "sync",
        label: "sync:disconnect",
        detail: state.syncStatus.debugDetail ?? state.syncStatus.warning ?? "Sync transport disconnected.",
      });
    }
  }, [
    onDebugEvent,
    state.syncStatus.connection,
    state.syncStatus.debugDetail,
    state.syncStatus.latencyMs,
    state.syncStatus.mode,
    state.syncStatus.warning,
  ]);

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

    setSdkState((current) => ({
      ...current,
      enabled: true,
      buildId: current.buildId ?? __APP_BUILD_ID__,
      attemptId: initialAttemptId,
      authStage: "idle",
      startupStage: "sdk_init",
      startupError: undefined,
      authError: undefined,
    }));

    void initializeEmbeddedApp({
      attemptId: initialAttemptId,
      onDebugEvent,
      onProfileUpdate: (localProfile, identitySource) => {
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
        setSdkState((current) => ({
          ...current,
          localProfile,
          identitySource,
          authError: undefined,
          startupError: undefined,
          authStage: "ready",
        }));

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
          identitySource: "local_fallback",
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
  }, [onDebugEvent, syncClient]);

  useEffect(() => {
    if (!onTextVoiceEvent) {
      return undefined;
    }

    return syncClient.subscribeTextVoice(onTextVoiceEvent);
  }, [onTextVoiceEvent, syncClient]);

  useEffect(() => {
    if (!onTextVoiceReplayEvent) {
      return undefined;
    }

    return syncClient.subscribeTextVoiceReplay(onTextVoiceReplayEvent);
  }, [onTextVoiceReplayEvent, syncClient]);

  const retryDiscordProfile = useCallback(async () => {
    const attemptId = createDiscordAuthAttemptId();
    activeAuthAttemptIdRef.current = attemptId;
    onDebugEvent?.({
      level: "info",
      category: "ui",
      label: "ui:retry-discord-profile",
      detail: `attempt ${attemptId.slice(-8)}`,
    });

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
      enabled: true,
      attemptId,
      authStage: "idle",
      startupStage: "sdk_init",
      startupError: undefined,
      authError: undefined,
    }));

    try {
      const nextSdkState = await initializeEmbeddedApp({
        attemptId,
        authPrompt: "interactive",
        onDebugEvent,
        onProfileUpdate: (localProfile, identitySource) => {
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
            identitySource,
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
      });

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
          startupStage: current.authStage && current.authStage !== "idle" ? "auth" : current.startupStage ?? "sdk_ready",
          startupError: message,
          authError: message,
          identitySource: current.identitySource ?? "local_fallback",
        }));
    }
  }, [onDebugEvent, syncClient]);
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
  const startupProgress = useMemo(() => buildStartupProgress({
    sdkState,
    state,
    lobbyState,
  }), [lobbyState, sdkState, state]);

  useEffect(() => {
    const pendingDisplayName = pendingDisplayNameRef.current;

    if (!pendingDisplayName || !lobbyState.localUser) {
      return;
    }

    if (state.syncStatus.lastEventAt === pendingDisplayName.requestedLastEventAt) {
      return;
    }

    onDebugEvent?.({
      level: lobbyState.localUser.displayName === pendingDisplayName.requestedName ? "info" : "warn",
      category: "profile",
      label: "profile:name-settled",
      detail: `${pendingDisplayName.source} requested "${pendingDisplayName.requestedName}"; synced lobby name is "${lobbyState.localUser.displayName}".`,
    });
    pendingDisplayNameRef.current = null;
    if (pendingDisplayNameTimeoutRef.current !== undefined) {
      window.clearTimeout(pendingDisplayNameTimeoutRef.current);
      pendingDisplayNameTimeoutRef.current = undefined;
    }
  }, [lobbyState.localUser?.displayName, lobbyState.localUser, onDebugEvent, state.syncStatus.lastEventAt]);

  useEffect(() => {
    if (!isStartupJoinReady(state.syncStatus) || !lobbyState.canJoinSession || lobbyState.localUser) {
      return;
    }

    const attemptKey = `${state.session.id}:${state.localProfile.id}:${state.syncStatus.startupMilestone ?? state.syncStatus.mode}`;

    if (autoJoinAttemptKeyRef.current === attemptKey) {
      return;
    }

    autoJoinAttemptKeyRef.current = attemptKey;
    syncClient.send({ type: "join_session" });
  }, [
    lobbyState.canJoinSession,
    lobbyState.localUser,
    state.localProfile.id,
    state.session.id,
    state.syncStatus,
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

    queueDisplayNameDebug(displayName, "roll");
    onDebugEvent?.({
      level: "info",
      category: "profile",
      label: "profile:name-roll:requested",
      detail: `Rolling from "${currentDisplayName}" to "${displayName}".`,
    });
    persistLocalProfile(nextProfile);
    syncClient.setLocalProfile(nextProfile);
    syncClient.send({ type: "roll_display_name", rollKey });
  }, [lobbyState.localUser?.displayName, onDebugEvent, queueDisplayNameDebug, state.localProfile, state.users, syncClient]);

  const selectDisplayName = useCallback((displayName: string) => {
    const nextProfile = {
      ...state.localProfile,
      displayName,
      avatarSeed: getAvatarSeedFromName(displayName),
    };

    queueDisplayNameDebug(displayName, "picker");
    onDebugEvent?.({
      level: "info",
      category: "profile",
      label: "profile:name-picker:requested",
      detail: `Selecting generated name "${displayName}".`,
    });
    persistLocalProfile(nextProfile);
    syncClient.setLocalProfile(nextProfile);
    syncClient.send({ type: "select_display_name", displayName, source: "generated" });
  }, [onDebugEvent, queueDisplayNameDebug, state.localProfile, syncClient]);

  const useDiscordDisplayName = useCallback(() => {
    const discordProfile = sdkState.localProfile;

    if (!discordProfile?.displayName) {
      onDebugEvent?.({
        level: "warn",
        category: "profile",
        label: "profile:name-discord:missing",
        detail: "Discord display name is not available yet.",
      });
      return;
    }

    const nextProfile = {
      ...state.localProfile,
      displayName: discordProfile.displayName,
      avatarSeed: discordProfile.avatarSeed,
      avatarUrl: discordProfile.avatarUrl,
    };

    queueDisplayNameDebug(discordProfile.displayName, "discord");
    onDebugEvent?.({
      level: "info",
      category: "profile",
      label: "profile:name-discord:requested",
      detail: `Requesting Discord name "${discordProfile.displayName}" from current lobby name "${lobbyState.localUser?.displayName ?? state.localProfile.displayName}". avatar=${discordProfile.avatarUrl ? "yes" : "no"}.`,
    });
    persistLocalProfile(nextProfile);
    syncClient.setLocalProfile(nextProfile);
    syncClient.send({ type: "select_display_name", displayName: discordProfile.displayName, source: "discord" });
  }, [lobbyState.localUser?.displayName, onDebugEvent, queueDisplayNameDebug, sdkState.localProfile, state.localProfile, syncClient]);

  const startReadyHold = useCallback(() => {
    syncClient.send({ type: "ready_hold_start" });
  }, [syncClient]);

  const endReadyHold = useCallback(() => {
    syncClient.send({ type: "ready_hold_end" });
  }, [syncClient]);

  const sendTextVoice = useCallback((text: string) => {
    syncClient.sendTextVoice(text);
  }, [syncClient]);

  const sendTextVoiceReplay = useCallback((textVoiceEventId: string) => {
    syncClient.sendTextVoiceReplay(textVoiceEventId);
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

  const forceStopRound = useCallback(() => {
    syncClient.send({ type: "admin_force_stop_round" });
  }, [syncClient]);

  const forceCompleteRound = useCallback(() => {
    syncClient.send({ type: "admin_force_complete_round" });
  }, [syncClient]);

  const setRoundNumber = useCallback((roundNumber: number) => {
    syncClient.send({ type: "admin_set_round_number", roundNumber });
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
    startupProgress,
    generatedDisplayNames,
    discordDisplayName: sdkState.localProfile?.displayName,
    joinSession,
    rollDisplayName,
    selectDisplayName,
    useDiscordDisplayName,
    startReadyHold,
    endReadyHold,
    sendTextVoice,
    sendTextVoiceReplay,
    setTimerDuration,
    setPrecountDuration,
    resetRound,
    forceStartRound,
    forceStopRound,
    forceCompleteRound,
    setRoundNumber,
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
