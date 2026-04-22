import type {
  CountdownTimeline,
  DabSyncState,
  DerivedLobbyState,
  FreeRoamPresenceState,
  FreeRoamPresenceUpdate,
  LocalProfile,
  RangeScoreResult,
  RangeScoreSubmission,
  SessionEvent,
  SessionInfo,
  SessionMetrics,
  SessionPhase,
  SessionSnapshot,
  SessionUser,
} from "../../types/session";

export const DEFAULT_TIMER_SECONDS = 50;
export const DEFAULT_PRECOUNT_SECONDS = 3;
export const TIMER_PRESETS = [30, 45, 60];
export const PRECOUNT_PRESETS = [3, 5];
const AUTO_REPLAY_DELAY_MS = 900;
const MAX_RANGE_SCORE_RESULTS = 32;
const FREE_ROAM_PRESENCE_TTL_MS = 10_000;

function createEmptyCountdown(): CountdownTimeline {
  return {};
}

function clampTimerDuration(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TIMER_SECONDS;
  }

  return Math.min(600, Math.max(5, Math.round(value)));
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function normalizeYaw(yaw: number) {
  if (!Number.isFinite(yaw)) {
    return 0;
  }

  let normalizedYaw = yaw;

  while (normalizedYaw > Math.PI) {
    normalizedYaw -= Math.PI * 2;
  }

  while (normalizedYaw < -Math.PI) {
    normalizedYaw += Math.PI * 2;
  }

  return roundTo(normalizedYaw, 3);
}

function sanitizeFreeRoamPresenceUpdate(presence: FreeRoamPresenceUpdate) {
  if (
    typeof presence.levelId !== "string" ||
    !Array.isArray(presence.position) ||
    presence.position.length !== 3
  ) {
    return null;
  }

  const levelId = presence.levelId.trim();

  if (!/^[a-z0-9-]{1,48}$/i.test(levelId)) {
    return null;
  }

  return {
    levelId,
    position: [
      roundTo(clampNumber(presence.position[0], -100, 100), 2),
      roundTo(clampNumber(presence.position[1], 0, 20), 2),
      roundTo(clampNumber(presence.position[2], -100, 100), 2),
    ] as const,
    yaw: normalizeYaw(presence.yaw),
  };
}

function upsertFreeRoamPresence(
  presenceEntries: FreeRoamPresenceState[],
  nextPresence: FreeRoamPresenceState,
  maxEntries: number,
) {
  const entriesWithoutActor = presenceEntries.filter((presence) => presence.userId !== nextPresence.userId);

  return [...entriesWithoutActor, nextPresence].slice(-maxEntries);
}

function pruneFreeRoamPresence(presenceEntries: FreeRoamPresenceState[], nowMs: number) {
  return presenceEntries.filter((presence) => {
    const updatedAtMs = Date.parse(presence.updatedAt);
    return Number.isFinite(updatedAtMs) && nowMs - updatedAtMs <= FREE_ROAM_PRESENCE_TTL_MS;
  });
}

function sanitizeRangeScoreSubmission(submission: RangeScoreSubmission) {
  const levelId = submission.levelId.trim();

  if (!levelId) {
    return null;
  }

  const score = clampInteger(submission.score, 0, 999999);
  const shots = clampInteger(submission.shots, 0, 999);
  const hits = Math.min(clampInteger(submission.hits, 0, 999), shots);
  const misses = Math.min(clampInteger(submission.misses, 0, 999), Math.max(0, shots - hits));
  const accuracy = shots === 0 ? 0 : clampInteger((hits / shots) * 100, 0, 100);
  const durationMs = clampInteger(submission.durationMs, 5000, 120000);

  if (shots <= 0) {
    return null;
  }

  return {
    levelId,
    score,
    shots,
    hits,
    misses,
    accuracy,
    durationMs,
  };
}

function isBetterRangeScore(nextResult: RangeScoreResult, currentResult: RangeScoreResult) {
  if (nextResult.score !== currentResult.score) {
    return nextResult.score > currentResult.score;
  }

  if (nextResult.accuracy !== currentResult.accuracy) {
    return nextResult.accuracy > currentResult.accuracy;
  }

  if (nextResult.durationMs !== currentResult.durationMs) {
    return nextResult.durationMs < currentResult.durationMs;
  }

  return false;
}

function upsertRangeScoreResult(results: RangeScoreResult[], nextResult: RangeScoreResult) {
  const existingIndex = results.findIndex((result) => (
    result.userId === nextResult.userId &&
    result.levelId === nextResult.levelId &&
    result.roundNumber === nextResult.roundNumber
  ));

  if (existingIndex >= 0) {
    const currentResult = results[existingIndex];

    if (!isBetterRangeScore(nextResult, currentResult)) {
      return results;
    }

    return [
      ...results.slice(0, existingIndex),
      nextResult,
      ...results.slice(existingIndex + 1),
    ];
  }

  return [...results, nextResult]
    .sort((firstResult, secondResult) => (
      secondResult.roundNumber - firstResult.roundNumber ||
      secondResult.score - firstResult.score ||
      secondResult.accuracy - firstResult.accuracy ||
      firstResult.durationMs - secondResult.durationMs ||
      firstResult.completedAt.localeCompare(secondResult.completedAt)
    ))
    .slice(0, MAX_RANGE_SCORE_RESULTS);
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

function removeUser(users: SessionUser[], userId: string) {
  return users.filter((user) => user.id !== userId);
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

function isTimelineOwnedPhase(phase: SessionPhase) {
  return phase === "precount" || phase === "countdown" || phase === "completed";
}

function getBaseLobbyPhase(users: SessionUser[]): SessionPhase {
  const activeUsers = users.filter((user) => user.presence !== "spectating");

  if (activeUsers.length === 0) {
    return "idle";
  }

  return activeUsers.every((user) => user.presence === "ready") ? "armed" : "lobby";
}

function resolveSessionPhase(snapshot: SessionSnapshot, users: SessionUser[]) {
  if (isTimelineOwnedPhase(snapshot.session.phase) && hasValidCountdownTimeline(snapshot)) {
    return snapshot.session.phase;
  }

  return getBaseLobbyPhase(users);
}

function resolveOwnerId(users: SessionUser[], preferredOwnerId: string) {
  if (users.some((user) => user.id === preferredOwnerId)) {
    return preferredOwnerId;
  }

  return users.find((user) => !user.isTestUser)?.id ?? users[0]?.id ?? "";
}

function applyOwnerToUsers(users: SessionUser[], ownerId: string) {
  return users.map((user) => ({
    ...user,
    isHost: ownerId !== "" && user.id === ownerId,
  }));
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

function replayRound(snapshot: SessionSnapshot): SessionSnapshot {
  const nextUsers = moveUsersToLobby(snapshot.users);

  return {
    ...snapshot,
    users: nextUsers,
    countdown: createEmptyCountdown(),
    rangeScoreboard: [],
    session: {
      ...snapshot.session,
      phase: getBaseLobbyPhase(nextUsers),
      roundNumber: snapshot.session.roundNumber + 1,
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
      lateJoinersJoinReady: false,
      autoJoinOnLoad: false,
      presets: TIMER_PRESETS,
      preCountPresets: PRECOUNT_PRESETS,
    },
    countdown: createEmptyCountdown(),
    rangeScoreboard: [],
    freeRoamPresence: [],
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

export function getDisplayRoundNumber(session: Pick<SessionInfo, "phase" | "roundNumber">) {
  return session.phase === "completed" ? session.roundNumber + 1 : session.roundNumber;
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
  const canResetRound = false;
  const canEditTimer =
    state.session.phase === "idle" ||
    state.session.phase === "lobby" ||
    state.session.phase === "armed";

  const instructions = !isJoined
    ? ["Join session", "Hold SPACE or the on-screen button to ready", "Release to start once armed"]
    : isLocalUserSpectating
      ? ["You are spectating this round", "Late joiners stay out until the next round", "Reset the session to re-enter the lobby"]
      : state.session.phase === "completed"
        ? ["Round complete", "Preparing the next round", "Stand by for reset"]
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

      const isActiveCountdownJoin = snapshot.session.phase === "precount" || snapshot.session.phase === "countdown";
      const isCompletedJoin = snapshot.session.phase === "completed";
      const joinedPresence: SessionUser["presence"] = isActiveCountdownJoin
        ? snapshot.timerConfig.lateJoinersJoinReady
          ? "ready"
          : "spectating"
        : isCompletedJoin
          ? "spectating"
          : "idle";

      if (existingUser) {
        const nextUsers = snapshot.users.map((user) => (
          user.id === actor.id
            ? {
                ...user,
                displayName: actor.displayName,
                avatarSeed: actor.avatarSeed,
                avatarUrl: actor.avatarUrl,
              }
            : user
        ));

        return {
          ...snapshot,
          users: nextUsers,
          session: {
            ...snapshot.session,
            phase: resolveSessionPhase(snapshot, nextUsers),
          },
        };
      }

      const nextJoinedAt = new Date(nowMs).toISOString();
      const shouldClaimOwnership = !hasRealHost(snapshot);
      const availableUsers = shouldClaimOwnership ? removeTestUsers(snapshot.users) : snapshot.users;

      if (availableUsers.length >= snapshot.session.capacity.max) {
        return snapshot;
      }
      const nextUser: SessionUser = {
        id: actor.id,
        displayName: actor.displayName,
        avatarSeed: actor.avatarSeed,
        avatarUrl: actor.avatarUrl,
        presence: joinedPresence,
        isHost: false,
        joinedAt: nextJoinedAt,
      };
      const nextUsers = shouldClaimOwnership
        ? transferOwnershipToActor(availableUsers, actor, nextJoinedAt).map((user): SessionUser =>
            user.id === actor.id
              ? {
                  ...user,
                  presence: joinedPresence,
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
          phase: resolveSessionPhase(snapshot, nextUsers),
        },
      };
    }
    case "leave_session": {
      const existingUser = snapshot.users.find((user) => user.id === actor.id);

      if (!existingUser) {
        return snapshot;
      }

      const nextUsers = removeUser(snapshot.users, actor.id);
      const nextOwnerId = resolveOwnerId(nextUsers, snapshot.session.ownerId);
      const normalizedUsers = applyOwnerToUsers(nextUsers, nextOwnerId);
      const nextFreeRoamPresence = snapshot.freeRoamPresence.filter((presence) => presence.userId !== actor.id);

      return {
        ...snapshot,
        users: normalizedUsers,
        freeRoamPresence: nextFreeRoamPresence,
        session: {
          ...snapshot.session,
          ownerId: nextOwnerId,
          phase: resolveSessionPhase(snapshot, normalizedUsers),
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

      return replayRound(snapshot);
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
        rangeScoreboard: [],
        freeRoamPresence: [],
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
        freeRoamPresence: snapshot.freeRoamPresence.filter((presence) => nextUsers.some((user) => user.id === presence.userId)),
        session: {
          ...snapshot.session,
          phase: resolveSessionPhase(snapshot, nextUsers),
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
          phase: resolveSessionPhase(snapshot, nextUsers),
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
          phase: resolveSessionPhase(snapshot, nextUsers),
        },
      };
    }
    case "admin_set_late_joiners_join_ready": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          lateJoinersJoinReady: event.enabled,
        },
      };
    }
    case "admin_set_auto_join_on_load": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          autoJoinOnLoad: event.enabled,
        },
      };
    }
    case "range_score_submit": {
      const sanitizedResult = sanitizeRangeScoreSubmission(event.result);

      if (!sanitizedResult) {
        return snapshot;
      }

      const actorUser = snapshot.users.find((user) => user.id === actor.id);
      const nextResult: RangeScoreResult = {
        ...sanitizedResult,
        roundNumber: snapshot.session.roundNumber,
        completedAt: new Date(nowMs).toISOString(),
        userId: actor.id,
        displayName: actor.displayName,
        avatarSeed: actor.avatarSeed,
        avatarUrl: actor.avatarUrl,
        isTestUser: actorUser?.isTestUser,
      };
      const nextRangeScoreboard = upsertRangeScoreResult(snapshot.rangeScoreboard, nextResult);

      if (nextRangeScoreboard === snapshot.rangeScoreboard) {
        return snapshot;
      }

      return {
        ...snapshot,
        rangeScoreboard: nextRangeScoreboard,
      };
    }
    case "free_roam_presence_update": {
      const sanitizedPresence = sanitizeFreeRoamPresenceUpdate(event.presence);

      if (!sanitizedPresence) {
        return snapshot;
      }

      const nextPresence: FreeRoamPresenceState = {
        ...sanitizedPresence,
        userId: actor.id,
        updatedAt: new Date(nowMs).toISOString(),
      };
      const maxEntries = Math.max(snapshot.session.capacity.max, snapshot.users.length, 1);

      return {
        ...snapshot,
        freeRoamPresence: upsertFreeRoamPresence(snapshot.freeRoamPresence, nextPresence, maxEntries),
      };
    }
    case "free_roam_presence_clear": {
      const nextFreeRoamPresence = snapshot.freeRoamPresence.filter((presence) => presence.userId !== actor.id);

      if (nextFreeRoamPresence.length === snapshot.freeRoamPresence.length) {
        return snapshot;
      }

      return {
        ...snapshot,
        freeRoamPresence: nextFreeRoamPresence,
      };
    }
    default:
      return snapshot;
  }
}

export function advanceSessionTime(snapshot: SessionSnapshot, nowMs = Date.now()): SessionSnapshot {
  const prunedFreeRoamPresence = pruneFreeRoamPresence(snapshot.freeRoamPresence, nowMs);
  const snapshotWithFreshPresence = prunedFreeRoamPresence.length === snapshot.freeRoamPresence.length
    ? snapshot
    : {
      ...snapshot,
      freeRoamPresence: prunedFreeRoamPresence,
    };

  if (!hasValidCountdownTimeline(snapshotWithFreshPresence)) {
    const nextUsers = moveUsersToLobby(snapshotWithFreshPresence.users);

    return {
      ...snapshotWithFreshPresence,
      users: nextUsers,
      countdown: createEmptyCountdown(),
      session: {
        ...snapshotWithFreshPresence.session,
        phase: getBaseLobbyPhase(nextUsers),
      },
    };
  }

  if (snapshotWithFreshPresence.session.phase === "precount") {
    const countdownStartMs = parseTimestamp(snapshotWithFreshPresence.countdown.countdownStartAt);

    if (countdownStartMs !== undefined && nowMs >= countdownStartMs) {
      return {
        ...snapshotWithFreshPresence,
        session: {
          ...snapshotWithFreshPresence.session,
          phase: "countdown",
        },
      };
    }
  }

  if (snapshotWithFreshPresence.session.phase === "countdown") {
    const countdownEndMs = parseTimestamp(snapshotWithFreshPresence.countdown.countdownEndAt);

    if (countdownEndMs !== undefined && nowMs >= countdownEndMs) {
      return {
        ...snapshotWithFreshPresence,
        session: {
          ...snapshotWithFreshPresence.session,
          phase: "completed",
        },
        countdown: {
          ...snapshotWithFreshPresence.countdown,
          completedAt: new Date(nowMs).toISOString(),
        },
      };
    }
  }

  if (snapshotWithFreshPresence.session.phase === "completed") {
    const completedAtMs = parseTimestamp(snapshotWithFreshPresence.countdown.completedAt);

    if (completedAtMs !== undefined && nowMs >= completedAtMs + AUTO_REPLAY_DELAY_MS) {
      return replayRound(snapshotWithFreshPresence);
    }
  }

  return snapshotWithFreshPresence;
}
