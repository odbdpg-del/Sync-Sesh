import type {
  CountdownTimeline,
  DabSyncState,
  DerivedLobbyState,
  LocalProfile,
  SessionEvent,
  SessionMetrics,
  SessionPhase,
  SessionSnapshot,
  SessionUser,
} from "../../types/session";

export const DEFAULT_TIMER_SECONDS = 50;
export const DEFAULT_PRECOUNT_SECONDS = 3;
export const TIMER_PRESETS = [30, 45, 60];
export const PRECOUNT_PRESETS = [3, 5];

function createEmptyCountdown(): CountdownTimeline {
  return {};
}

function clampTimerDuration(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TIMER_SECONDS;
  }

  return Math.min(600, Math.max(5, Math.round(value)));
}

function clampPrecountDuration(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_PRECOUNT_SECONDS;
  }

  return PRECOUNT_PRESETS.includes(Math.round(value)) ? Math.round(value) : DEFAULT_PRECOUNT_SECONDS;
}

function parseTimestamp(value?: string) {
  return value ? Date.parse(value) : undefined;
}

function setUserPresence(users: SessionUser[], userId: string, presence: SessionUser["presence"]) {
  return users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    return {
      ...user,
      presence,
    };
  });
}

function moveUsersToLobby(users: SessionUser[]) {
  return users.map((user) => ({
    ...user,
    presence: "idle" as const,
  }));
}

function removeTestUsers(users: SessionUser[]) {
  return users.filter((user) => !user.isTestUser);
}

function setAllTestUsersPresence(users: SessionUser[], presence: SessionUser["presence"]) {
  return users.map((user) => {
    if (!user.isTestUser || user.presence === "spectating") {
      return user;
    }

    return {
      ...user,
      presence,
    };
  });
}

function hasRealHost(snapshot: SessionSnapshot) {
  return snapshot.users.some((user) => user.id === snapshot.session.ownerId && !user.isTestUser);
}

function isActorHost(snapshot: SessionSnapshot, actor: LocalProfile) {
  const actorUser = snapshot.users.find((user) => user.id === actor.id);
  if (snapshot.session.ownerId === actor.id || actorUser?.isHost === true) {
    return true;
  }

  return !hasRealHost(snapshot) && actorUser !== undefined;
}

function transferOwnershipToActor(users: SessionUser[], actor: LocalProfile, joinedAt: string) {
  let actorFound = false;
  const nextUsers: SessionUser[] = users.map((user) => {
    if (user.id === actor.id) {
      actorFound = true;
        return {
          ...user,
          displayName: actor.displayName,
          avatarSeed: actor.avatarSeed,
          avatarUrl: actor.avatarUrl,
          isHost: true,
          isTestUser: false,
        };
    }

    return {
      ...user,
      isHost: false,
    };
  });

  if (actorFound) {
    return nextUsers;
  }

  return [
    ...nextUsers,
    {
      id: actor.id,
      displayName: actor.displayName,
      avatarSeed: actor.avatarSeed,
      avatarUrl: actor.avatarUrl,
      presence: "idle" as const,
      isHost: true,
      joinedAt,
    },
  ];
}

function hasValidCountdownTimeline(snapshot: SessionSnapshot) {
  const hasPrecount = Boolean(snapshot.countdown.preCountStartAt && snapshot.countdown.countdownStartAt && snapshot.countdown.countdownEndAt);
  const hasCompletion = Boolean(snapshot.countdown.countdownEndAt);

  if (snapshot.session.phase === "precount") {
    return hasPrecount;
  }

  if (snapshot.session.phase === "countdown" || snapshot.session.phase === "completed") {
    return hasCompletion;
  }

  return true;
}

function getBaseLobbyPhase(users: SessionUser[]): SessionPhase {
  const activeUsers = users.filter((user) => user.presence !== "spectating");

  if (activeUsers.length === 0) {
    return "idle";
  }

  return activeUsers.every((user) => user.presence === "ready") ? "armed" : "lobby";
}

function beginPrecount(snapshot: SessionSnapshot, triggerUserId: string, nowMs: number): SessionSnapshot {
  const preCountStartAt = new Date(nowMs).toISOString();
  const countdownStartAt = new Date(nowMs + snapshot.timerConfig.preCountSeconds * 1000).toISOString();
  const countdownEndAt = new Date(
    nowMs + snapshot.timerConfig.preCountSeconds * 1000 + snapshot.timerConfig.durationSeconds * 1000,
  ).toISOString();

  return {
    ...snapshot,
    session: {
      ...snapshot.session,
      phase: "precount",
    },
    countdown: {
      preCountStartAt,
      countdownStartAt,
      countdownEndAt,
      triggeredByUserId: triggerUserId,
    },
  };
}

export function createSessionSnapshot(overrides?: Partial<SessionSnapshot>): SessionSnapshot {
  const base: SessionSnapshot = {
    session: {
      id: "session-arcade-01",
      code: "DAB-2049",
      phase: "lobby",
      roundNumber: 3,
      ownerId: "host-1",
      capacity: {
        min: 2,
        max: 8,
      },
    },
    users: [
      {
        id: "host-1",
        displayName: "NeonPilot",
        avatarSeed: "NP",
        presence: "idle",
        isHost: true,
        isTestUser: true,
        joinedAt: "2026-04-19T19:00:00.000Z",
      },
      {
        id: "user-2",
        displayName: "CRT_Kat",
        avatarSeed: "CK",
        presence: "idle",
        isHost: false,
        isTestUser: true,
        joinedAt: "2026-04-19T19:00:06.000Z",
      },
    ],
    timerConfig: {
      durationSeconds: DEFAULT_TIMER_SECONDS,
      preCountSeconds: DEFAULT_PRECOUNT_SECONDS,
      allowLateJoinSpectators: true,
      presets: TIMER_PRESETS,
      preCountPresets: PRECOUNT_PRESETS,
    },
    countdown: createEmptyCountdown(),
  };

  return {
    ...base,
    ...overrides,
    session: {
      ...base.session,
      ...overrides?.session,
    },
    timerConfig: {
      ...base.timerConfig,
      ...overrides?.timerConfig,
    },
    countdown: {
      ...base.countdown,
      ...overrides?.countdown,
    },
    users: overrides?.users ?? base.users,
  };
}

export function attachLocalProfile(
  snapshot: SessionSnapshot,
  localProfile: LocalProfile,
  state?: Partial<DabSyncState>,
): DabSyncState {
  const normalizedTimerConfig = {
    ...snapshot.timerConfig,
    preCountSeconds: clampPrecountDuration(snapshot.timerConfig.preCountSeconds),
    preCountPresets: snapshot.timerConfig.preCountPresets ?? PRECOUNT_PRESETS,
  };

  return {
    ...snapshot,
    timerConfig: normalizedTimerConfig,
    syncStatus: state?.syncStatus ?? {
      mode: "mock",
      connection: "offline",
    },
    localProfile,
  };
}

export function getSessionMetrics(users: SessionUser[]): SessionMetrics {
  const readyCount = users.filter((user) => user.presence === "ready").length;
  const spectatorCount = users.filter((user) => user.presence === "spectating").length;
  const activeCount = users.filter((user) => user.presence !== "spectating").length;

  return {
    readyCount,
    spectatorCount,
    activeCount,
    idleCount: activeCount - readyCount,
  };
}

export function getLocalUser(state: DabSyncState) {
  return state.users.find((user) => user.id === state.localProfile.id);
}

export function deriveLobbyState(state: DabSyncState): DerivedLobbyState {
  const localUser = getLocalUser(state);
  const metrics = getSessionMetrics(state.users);
  const isJoined = Boolean(localUser);
  const isLocalHost = isJoined && (
    state.session.ownerId === state.localProfile.id ||
    localUser?.isHost === true ||
    !hasRealHost(state)
  );
  const isLocalUserReady = localUser?.presence === "ready";
  const isLocalUserSpectating = localUser?.presence === "spectating";
  const canJoinSession = !isJoined && state.users.length < state.session.capacity.max;
  const canHoldToReady = isJoined && !isLocalUserSpectating && (state.session.phase === "lobby" || state.session.phase === "armed");
  const isArmed = state.session.phase === "armed";
  const releaseStartsCountdown = isArmed && isLocalUserReady;
  const canResetRound = state.session.phase === "completed";
  const canEditTimer =
    state.session.phase === "idle" ||
    state.session.phase === "lobby" ||
    state.session.phase === "armed" ||
    state.session.phase === "completed";

  const instructions = !isJoined
    ? ["Join session", "Hold SPACE or the on-screen button to ready", "Release to start once armed"]
    : isLocalUserSpectating
      ? ["You are spectating this round", "Late joiners stay out until replay", "Reset the session to re-enter the lobby"]
      : state.session.phase === "completed"
        ? ["Round complete", "Adjust the timer if needed", "Replay to return everyone to the lobby"]
        : ["Hold SPACE to ready", "Use the hold button on mouse or touch", "Release to start once all active users are armed"];

  return {
    localUser,
    metrics,
    isJoined,
    isLocalHost,
    canUseAdminTools: isLocalHost,
    isLocalUserReady,
    isLocalUserSpectating,
    canJoinSession,
    canHoldToReady,
    canEditTimer,
    canResetRound,
    isArmed,
    releaseStartsCountdown,
    lateJoinersSpectating: state.timerConfig.allowLateJoinSpectators,
    instructions,
  };
}

export function reduceSessionEvent(snapshot: SessionSnapshot, event: SessionEvent, actor: LocalProfile, nowMs = Date.now()): SessionSnapshot {
  switch (event.type) {
    case "join_session": {
      const existingUser = snapshot.users.find((user) => user.id === actor.id);

      if (existingUser) {
        return snapshot;
      }

      const nextJoinedAt = new Date(nowMs).toISOString();
      const shouldClaimOwnership = !hasRealHost(snapshot);
      const availableUsers = shouldClaimOwnership ? removeTestUsers(snapshot.users) : snapshot.users;

      if (availableUsers.length >= snapshot.session.capacity.max) {
        return snapshot;
      }

      const isLateJoin =
        snapshot.session.phase === "precount" ||
        snapshot.session.phase === "countdown" ||
        snapshot.session.phase === "completed";
      const nextUser: SessionUser = {
        id: actor.id,
        displayName: actor.displayName,
        avatarSeed: actor.avatarSeed,
        avatarUrl: actor.avatarUrl,
        presence: isLateJoin ? "spectating" : "idle",
        isHost: false,
        joinedAt: nextJoinedAt,
      };
      const nextUsers = shouldClaimOwnership
        ? transferOwnershipToActor(availableUsers, actor, nextJoinedAt).map((user): SessionUser =>
            user.id === actor.id
              ? {
                  ...user,
                  presence: isLateJoin ? "spectating" : "idle",
                }
              : user,
          )
        : [
            ...snapshot.users,
            nextUser,
          ];

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          ownerId: shouldClaimOwnership ? actor.id : snapshot.session.ownerId,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "ready_hold_start": {
      const localUser = snapshot.users.find((user) => user.id === actor.id);

      if (!localUser || localUser.presence === "spectating" || (snapshot.session.phase !== "lobby" && snapshot.session.phase !== "armed")) {
        return snapshot;
      }

      const nextUsers = setUserPresence(snapshot.users, localUser.id, "ready");

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "ready_hold_end": {
      const localUser = snapshot.users.find((user) => user.id === actor.id);

      if (!localUser || localUser.presence === "spectating" || (snapshot.session.phase !== "lobby" && snapshot.session.phase !== "armed")) {
        return snapshot;
      }

      if (snapshot.session.phase === "armed" && localUser.presence === "ready") {
        return beginPrecount(snapshot, localUser.id, nowMs);
      }

      const nextUsers = setUserPresence(snapshot.users, localUser.id, "idle");

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "set_timer_duration": {
      if (snapshot.session.phase === "precount" || snapshot.session.phase === "countdown") {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          durationSeconds: clampTimerDuration(event.durationSeconds),
        },
      };
    }
    case "set_precount_duration": {
      if (snapshot.session.phase === "precount" || snapshot.session.phase === "countdown") {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          preCountSeconds: clampPrecountDuration(event.preCountSeconds),
        },
      };
    }
    case "reset_round": {
      if (snapshot.session.phase !== "completed") {
        return snapshot;
      }

      const nextUsers = moveUsersToLobby(snapshot.users);

      return {
        ...snapshot,
        users: nextUsers,
        countdown: createEmptyCountdown(),
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
          roundNumber: snapshot.session.roundNumber + 1,
        },
      };
    }
    case "admin_force_start_round": {
      if (!isActorHost(snapshot, actor) || snapshot.session.phase === "precount" || snapshot.session.phase === "countdown") {
        return snapshot;
      }

      const actorExists = snapshot.users.some((user) => user.id === actor.id);

      if (!actorExists) {
        return snapshot;
      }

      const nextUsers = snapshot.users.map((user) => {
        if (user.presence === "spectating") {
          return user;
        }

        return {
          ...user,
          presence: user.id === actor.id ? "ready" as const : "idle" as const,
        };
      });

      return beginPrecount(
        {
          ...snapshot,
          users: nextUsers,
          countdown: createEmptyCountdown(),
        },
        actor.id,
        nowMs,
      );
    }
    case "admin_force_complete_round": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      return {
        ...snapshot,
        session: {
          ...snapshot.session,
          phase: "completed",
        },
        countdown: {
          ...snapshot.countdown,
          countdownEndAt: snapshot.countdown.countdownEndAt ?? new Date(nowMs).toISOString(),
          completedAt: new Date(nowMs).toISOString(),
          triggeredByUserId: snapshot.countdown.triggeredByUserId ?? actor.id,
        },
      };
    }
    case "admin_reset_session": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const nextUsers = moveUsersToLobby(snapshot.users);

      return {
        ...snapshot,
        users: nextUsers,
        countdown: createEmptyCountdown(),
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
          roundNumber: snapshot.session.phase === "completed" ? snapshot.session.roundNumber + 1 : snapshot.session.roundNumber,
        },
      };
    }
    case "admin_add_test_participant": {
      if (!isActorHost(snapshot, actor) || snapshot.users.length >= snapshot.session.capacity.max) {
        return snapshot;
      }

      const nextIndex =
        snapshot.users
          .filter((user) => user.isTestUser)
          .reduce((highest, user) => {
            const match = user.id.match(/test-user-(\d+)/);
            return match ? Math.max(highest, Number(match[1])) : highest;
          }, 0) + 1;

      const nextUsers = [
        ...snapshot.users,
        {
          id: `test-user-${nextIndex}`,
          displayName: `SimUser ${nextIndex}`,
          avatarSeed: `S${nextIndex.toString().slice(-1)}`.padEnd(2, "X"),
          presence:
            snapshot.session.phase === "precount" || snapshot.session.phase === "countdown" || snapshot.session.phase === "completed"
              ? "spectating"
              : "idle",
          isHost: false,
          isTestUser: true,
          joinedAt: new Date(nowMs).toISOString(),
        } satisfies SessionUser,
      ];

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "admin_toggle_test_participants_ready": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const hasReadyTestUser = snapshot.users.some((user) => user.isTestUser && user.presence === "ready");
      const nextUsers = setAllTestUsersPresence(snapshot.users, hasReadyTestUser ? "idle" : "ready");

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "admin_clear_test_participants": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const nextUsers = removeTestUsers(snapshot.users);

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    default:
      return snapshot;
  }
}

export function advanceSessionTime(snapshot: SessionSnapshot, nowMs = Date.now()): SessionSnapshot {
  if (!hasValidCountdownTimeline(snapshot)) {
    const nextUsers = moveUsersToLobby(snapshot.users);

    return {
      ...snapshot,
      users: nextUsers,
      countdown: createEmptyCountdown(),
      session: {
        ...snapshot.session,
        phase: getBaseLobbyPhase(nextUsers),
      },
    };
  }

  if (snapshot.session.phase === "precount") {
    const countdownStartMs = parseTimestamp(snapshot.countdown.countdownStartAt);

    if (countdownStartMs !== undefined && nowMs >= countdownStartMs) {
      return {
        ...snapshot,
        session: {
          ...snapshot.session,
          phase: "countdown",
        },
      };
    }
  }

  if (snapshot.session.phase === "countdown") {
    const countdownEndMs = parseTimestamp(snapshot.countdown.countdownEndAt);

    if (countdownEndMs !== undefined && nowMs >= countdownEndMs) {
      return {
        ...snapshot,
        session: {
          ...snapshot.session,
          phase: "completed",
        },
        countdown: {
          ...snapshot.countdown,
          completedAt: new Date(nowMs).toISOString(),
        },
      };
    }
  }

  return snapshot;
}
