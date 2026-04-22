import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSessionTime,
  createSessionSnapshot,
  reduceSessionEvent,
} from "../src/lib/lobby/sessionState";
import type { LocalProfile, SessionSnapshot, SessionUser } from "../src/types/session";

const HOST: LocalProfile = {
  id: "host-1",
  displayName: "NeonPilot",
  avatarSeed: "NP",
};

const JOINER: LocalProfile = {
  id: "user-9",
  displayName: "LateJoin",
  avatarSeed: "LJ",
};

function createRealUser(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: "user",
    displayName: "User",
    avatarSeed: "US",
    presence: "idle",
    isHost: false,
    joinedAt: "2026-04-19T19:00:00.000Z",
    ...overrides,
  };
}

function createHostSnapshot(overrides?: Partial<SessionSnapshot>) {
  const base = createSessionSnapshot({
    users: [
      createRealUser({
        id: HOST.id,
        displayName: HOST.displayName,
        avatarSeed: HOST.avatarSeed,
        isHost: true,
      }),
      createRealUser({
        id: "user-2",
        displayName: "CRT_Kat",
        avatarSeed: "CK",
        joinedAt: "2026-04-19T19:00:06.000Z",
      }),
    ],
    session: {
      ownerId: HOST.id,
    },
  });

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
    rangeScoreboard: overrides?.rangeScoreboard ?? base.rangeScoreboard,
    freeRoamPresence: overrides?.freeRoamPresence ?? base.freeRoamPresence,
  };
}

function createActiveSnapshot(phase: "precount" | "countdown") {
  return createHostSnapshot({
    session: {
      phase,
    },
    countdown: {
      preCountStartAt: "2026-04-21T00:00:00.000Z",
      countdownStartAt: "2026-04-21T00:00:03.000Z",
      countdownEndAt: "2026-04-21T00:00:53.000Z",
      triggeredByUserId: HOST.id,
    },
  });
}

test("join during precount preserves phase and countdown timeline", () => {
  const snapshot = createActiveSnapshot("precount");

  const nextSnapshot = reduceSessionEvent(snapshot, { type: "join_session" }, JOINER, Date.parse("2026-04-21T00:00:01.000Z"));

  assert.equal(nextSnapshot.session.phase, "precount");
  assert.deepEqual(nextSnapshot.countdown, snapshot.countdown);
  assert.equal(nextSnapshot.users.at(-1)?.id, JOINER.id);
  assert.equal(nextSnapshot.users.at(-1)?.presence, "spectating");
});

test("join during countdown preserves phase and countdown timeline", () => {
  const snapshot = createActiveSnapshot("countdown");

  const nextSnapshot = reduceSessionEvent(snapshot, { type: "join_session" }, JOINER, Date.parse("2026-04-21T00:00:10.000Z"));

  assert.equal(nextSnapshot.session.phase, "countdown");
  assert.deepEqual(nextSnapshot.countdown, snapshot.countdown);
  assert.equal(nextSnapshot.users.at(-1)?.presence, "spectating");
});

test("test participant admin events do not interrupt precount", () => {
  const snapshot = createActiveSnapshot("precount");

  const afterAdd = reduceSessionEvent(snapshot, { type: "admin_add_test_participant" }, HOST, Date.parse("2026-04-21T00:00:01.000Z"));
  assert.equal(afterAdd.session.phase, "precount");
  assert.deepEqual(afterAdd.countdown, snapshot.countdown);
  assert.equal(afterAdd.users.at(-1)?.presence, "spectating");

  const afterToggle = reduceSessionEvent(afterAdd, { type: "admin_toggle_test_participants_ready" }, HOST);
  assert.equal(afterToggle.session.phase, "precount");
  assert.deepEqual(afterToggle.countdown, snapshot.countdown);

  const afterClear = reduceSessionEvent(afterToggle, { type: "admin_clear_test_participants" }, HOST);
  assert.equal(afterClear.session.phase, "precount");
  assert.deepEqual(afterClear.countdown, snapshot.countdown);
});

test("ready hold events cannot collapse an active round", () => {
  const snapshot = createActiveSnapshot("countdown");

  const afterHoldStart = reduceSessionEvent(snapshot, { type: "ready_hold_start" }, HOST);
  const afterHoldEnd = reduceSessionEvent(snapshot, { type: "ready_hold_end" }, HOST);

  assert.strictEqual(afterHoldStart, snapshot);
  assert.strictEqual(afterHoldEnd, snapshot);
});

test("advanceSessionTime moves precount to countdown to completed", () => {
  const precountSnapshot = createActiveSnapshot("precount");

  const countdownSnapshot = advanceSessionTime(precountSnapshot, Date.parse("2026-04-21T00:00:03.000Z"));
  assert.equal(countdownSnapshot.session.phase, "countdown");
  assert.deepEqual(countdownSnapshot.countdown, precountSnapshot.countdown);

  const completedSnapshot = advanceSessionTime(countdownSnapshot, Date.parse("2026-04-21T00:00:53.000Z"));
  assert.equal(completedSnapshot.session.phase, "completed");
  assert.equal(completedSnapshot.countdown.completedAt, "2026-04-21T00:00:53.000Z");
});

test("completed rounds auto-replay back to the lobby after a short delay", () => {
  const countdownSnapshot = createActiveSnapshot("countdown");
  const completedSnapshot = advanceSessionTime(countdownSnapshot, Date.parse("2026-04-21T00:00:53.000Z"));

  const stillCompletedSnapshot = advanceSessionTime(completedSnapshot, Date.parse("2026-04-21T00:00:53.800Z"));
  assert.equal(stillCompletedSnapshot.session.phase, "completed");

  const replayedSnapshot = advanceSessionTime(completedSnapshot, Date.parse("2026-04-21T00:00:53.901Z"));
  assert.equal(replayedSnapshot.session.phase, "lobby");
  assert.equal(replayedSnapshot.session.roundNumber, countdownSnapshot.session.roundNumber + 1);
  assert.deepEqual(replayedSnapshot.countdown, {});
  assert.ok(replayedSnapshot.users.every((user) => user.presence === "idle"));
});

test("invalid active countdown timeline safely recovers to the lobby flow", () => {
  const snapshot = createHostSnapshot({
    session: {
      phase: "precount",
    },
    countdown: {
      preCountStartAt: "2026-04-21T00:00:00.000Z",
      countdownEndAt: "2026-04-21T00:00:53.000Z",
    },
  });

  const nextSnapshot = advanceSessionTime(snapshot, Date.parse("2026-04-21T00:00:01.000Z"));

  assert.equal(nextSnapshot.session.phase, "lobby");
  assert.deepEqual(nextSnapshot.countdown, {});
  assert.ok(nextSnapshot.users.every((user) => user.presence === "idle"));
});

test("host can force complete or reset while the timer is active", () => {
  const snapshot = createActiveSnapshot("countdown");
  const nowMs = Date.parse("2026-04-21T00:00:20.000Z");

  const afterForceComplete = reduceSessionEvent(snapshot, { type: "admin_force_complete_round" }, HOST, nowMs);
  const afterResetSession = reduceSessionEvent(snapshot, { type: "admin_reset_session" }, HOST, nowMs);

  assert.equal(afterForceComplete.session.phase, "completed");
  assert.equal(afterForceComplete.countdown.completedAt, "2026-04-21T00:00:20.000Z");
  assert.equal(afterForceComplete.countdown.triggeredByUserId, HOST.id);

  assert.equal(afterResetSession.session.phase, "lobby");
  assert.deepEqual(afterResetSession.countdown, {});
  assert.ok(afterResetSession.users.every((user) => user.presence === "idle"));
});

test("leave_session removes the departing user and reassigns host ownership", () => {
  const snapshot = createHostSnapshot({
    freeRoamPresence: [
      {
        userId: HOST.id,
        levelId: "level-1",
        position: [1, 1, 1],
        yaw: 0,
        updatedAt: "2026-04-21T00:00:00.000Z",
      },
      {
        userId: "user-2",
        levelId: "level-1",
        position: [2, 1, 2],
        yaw: 0,
        updatedAt: "2026-04-21T00:00:00.000Z",
      },
    ],
  });

  const nextSnapshot = reduceSessionEvent(snapshot, { type: "leave_session" }, HOST);

  assert.equal(nextSnapshot.users.length, 1);
  assert.equal(nextSnapshot.users[0]?.id, "user-2");
  assert.equal(nextSnapshot.users[0]?.isHost, true);
  assert.equal(nextSnapshot.session.ownerId, "user-2");
  assert.equal(nextSnapshot.session.phase, "lobby");
  assert.deepEqual(nextSnapshot.freeRoamPresence.map((presence) => presence.userId), ["user-2"]);
});

test("leave_session preserves an active countdown while removing the departed user", () => {
  const snapshot = createActiveSnapshot("countdown");

  const nextSnapshot = reduceSessionEvent(snapshot, { type: "leave_session" }, HOST);

  assert.equal(nextSnapshot.session.phase, "countdown");
  assert.deepEqual(nextSnapshot.countdown, snapshot.countdown);
  assert.equal(nextSnapshot.users.length, 1);
  assert.equal(nextSnapshot.users[0]?.id, "user-2");
  assert.equal(nextSnapshot.session.ownerId, "user-2");
});

test("leave followed by rejoin with a different id does not leave a stale duplicate behind", () => {
  const snapshot = createHostSnapshot({
    users: [
      createRealUser({
        id: "returning-user-old",
        displayName: "NeonPilot",
        avatarSeed: "NP",
        isHost: true,
      }),
      createRealUser({
        id: "user-2",
        displayName: "CRT_Kat",
        avatarSeed: "CK",
        joinedAt: "2026-04-19T19:00:06.000Z",
      }),
    ],
    session: {
      ownerId: "returning-user-old",
    },
  });
  const staleActor: LocalProfile = {
    id: "returning-user-old",
    displayName: "NeonPilot",
    avatarSeed: "NP",
  };
  const rejoinedActor: LocalProfile = {
    id: "returning-user-new",
    displayName: "NeonPilot",
    avatarSeed: "NP",
  };

  const afterLeave = reduceSessionEvent(snapshot, { type: "leave_session" }, staleActor);
  const afterRejoin = reduceSessionEvent(afterLeave, { type: "join_session" }, rejoinedActor, Date.parse("2026-04-21T00:00:12.000Z"));

  assert.deepEqual(
    afterRejoin.users.map((user) => user.id).sort(),
    ["returning-user-new", "user-2"],
  );
  assert.equal(afterRejoin.users.filter((user) => user.displayName === "NeonPilot").length, 1);
});

test("join_session refreshes display fields for an already joined user without duplicating them", () => {
  const snapshot = createHostSnapshot({
    users: [
      createRealUser({
        id: JOINER.id,
        displayName: "Old Name",
        avatarSeed: "ON",
        avatarUrl: "https://example.com/old.png",
      }),
      createRealUser({
        id: HOST.id,
        displayName: HOST.displayName,
        avatarSeed: HOST.avatarSeed,
        isHost: true,
        joinedAt: "2026-04-19T19:00:06.000Z",
      }),
    ],
    session: {
      ownerId: HOST.id,
    },
  });
  const refreshedJoiner: LocalProfile = {
    ...JOINER,
    displayName: "Server Nickname",
    avatarSeed: "SN",
    avatarUrl: "https://example.com/new.png",
  };

  const nextSnapshot = reduceSessionEvent(snapshot, { type: "join_session" }, refreshedJoiner, Date.parse("2026-04-21T00:00:15.000Z"));

  assert.equal(nextSnapshot.users.length, snapshot.users.length);
  assert.equal(nextSnapshot.users.filter((user) => user.id === JOINER.id).length, 1);
  assert.equal(nextSnapshot.users[0]?.displayName, "Server Nickname");
  assert.equal(nextSnapshot.users[0]?.avatarSeed, "SN");
  assert.equal(nextSnapshot.users[0]?.avatarUrl, "https://example.com/new.png");
});
