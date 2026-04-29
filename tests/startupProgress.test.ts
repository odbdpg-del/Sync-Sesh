import assert from "node:assert/strict";
import test from "node:test";
import { buildStartupProgress, type StartupProgressStep } from "../src/lib/startup/startupProgress";
import { attachLocalProfile, createSessionSnapshot, deriveLobbyState } from "../src/lib/lobby/sessionState";
import type { EmbeddedAppState } from "../src/lib/discord/embeddedApp";
import type { LocalProfile, SessionUser, SyncStatus } from "../src/types/session";

const LOCAL_PROFILE: LocalProfile = {
  id: "user-1",
  displayName: "Sync Pilot",
  avatarSeed: "SP",
};

function createUser(overrides?: Partial<SessionUser>): SessionUser {
  return {
    id: LOCAL_PROFILE.id,
    displayName: LOCAL_PROFILE.displayName,
    avatarSeed: LOCAL_PROFILE.avatarSeed,
    presence: "idle",
    isHost: true,
    joinedAt: "2026-04-28T22:00:00.000Z",
    ...overrides,
  };
}

function createState(syncStatus: SyncStatus, users: SessionUser[] = [createUser()]) {
  const snapshot = createSessionSnapshot({
    users,
    session: {
      ownerId: users[0]?.id ?? "",
      phase: users.length > 0 ? "lobby" : "idle",
    },
  });

  return attachLocalProfile(snapshot, LOCAL_PROFILE, { syncStatus });
}

function getStep(steps: StartupProgressStep[], id: StartupProgressStep["id"]) {
  const step = steps.find((candidate) => candidate.id === id);
  assert.ok(step, `Expected startup step ${id}`);
  return step;
}

test("buildStartupProgress completes required startup when sync and lobby are ready", () => {
  const state = createState({
    mode: "ws",
    connection: "connected",
    startupMilestone: "snapshot_received",
    debugDetail: "Received snapshot from wss://sync.example/ws.",
  });
  const progress = buildStartupProgress({
    sdkState: {
      enabled: true,
      buildId: "0.1.0-test",
      startupStage: "ready",
      authStage: "ready",
      identitySource: "authenticated_discord",
      localProfile: LOCAL_PROFILE,
    },
    state,
    lobbyState: deriveLobbyState(state),
  });

  assert.equal(progress.isBlocking, false);
  assert.equal(progress.requiredProgress, 100);
  assert.equal(getStep(progress.steps, "sync_server").status, "complete");
  assert.equal(getStep(progress.steps, "lobby_join").status, "complete");
  assert.equal(getStep(progress.steps, "discord_identity").status, "complete");
});

test("buildStartupProgress treats Discord local fallback as non-blocking degraded startup", () => {
  const state = createState({
    mode: "ws",
    connection: "connected",
    startupMilestone: "snapshot_received",
  });
  const sdkState: EmbeddedAppState = {
    enabled: true,
    buildId: "0.1.0-test",
    startupStage: "auth",
    authStage: "idle",
    identitySource: "local_fallback",
    authError: "Discord authorize failed.",
  };
  const progress = buildStartupProgress({
    sdkState,
    state,
    lobbyState: deriveLobbyState(state),
  });

  const discordIdentity = getStep(progress.steps, "discord_identity");

  assert.equal(progress.isBlocking, false);
  assert.equal(discordIdentity.status, "degraded");
  assert.equal(discordIdentity.required, false);
  assert.equal(discordIdentity.progress, 100);
});

test("buildStartupProgress keeps sync errors blocking while showing completed bar progress", () => {
  const state = createState({
    mode: "ws",
    connection: "error",
    warning: "Unable to reach the sync server. Retrying...",
  }, []);
  const progress = buildStartupProgress({
    sdkState: {
      enabled: false,
      buildId: "0.1.0-test",
      startupStage: "disabled",
    },
    state,
    lobbyState: deriveLobbyState(state),
  });

  const syncServer = getStep(progress.steps, "sync_server");
  const lobbyJoin = getStep(progress.steps, "lobby_join");

  assert.equal(progress.isBlocking, true);
  assert.equal(progress.blockingReason, "Unable to reach the sync server. Retrying...");
  assert.equal(syncServer.status, "error");
  assert.equal(syncServer.progress, 100);
  assert.equal(lobbyJoin.status, "pending");
});

test("buildStartupProgress tracks sync socket opening before snapshot readiness", () => {
  const openingState = createState({
    mode: "ws",
    connection: "connecting",
    startupMilestone: "opening_socket",
    debugDetail: "Opening wss://sync.example/ws for session test.",
  }, []);
  const socketOpenState = createState({
    mode: "ws",
    connection: "connected",
    startupMilestone: "socket_open",
    debugDetail: "Opened wss://sync.example/ws.",
  }, []);

  const openingProgress = buildStartupProgress({
    sdkState: {
      enabled: false,
      buildId: "0.1.0-test",
    },
    state: openingState,
    lobbyState: deriveLobbyState(openingState),
  });
  const socketOpenProgress = buildStartupProgress({
    sdkState: {
      enabled: false,
      buildId: "0.1.0-test",
    },
    state: socketOpenState,
    lobbyState: deriveLobbyState(socketOpenState),
  });

  const openingSync = getStep(openingProgress.steps, "sync_server");
  const socketOpenSync = getStep(socketOpenProgress.steps, "sync_server");

  assert.equal(openingProgress.isBlocking, true);
  assert.equal(openingSync.status, "active");
  assert.equal(openingSync.progress, 35);
  assert.equal(socketOpenProgress.isBlocking, true);
  assert.equal(socketOpenSync.status, "active");
  assert.equal(socketOpenSync.progress, 70);
  assert.equal(getStep(socketOpenProgress.steps, "lobby_join").detail, "Waiting for sync snapshot before joining lobby.");
});

test("buildStartupProgress treats snapshot received as sync-ready but waits for lobby join", () => {
  const state = createState({
    mode: "ws",
    connection: "connected",
    startupMilestone: "snapshot_received",
    debugDetail: "Received snapshot from wss://sync.example/ws.",
  }, []);
  const progress = buildStartupProgress({
    sdkState: {
      enabled: false,
      buildId: "0.1.0-test",
    },
    state,
    lobbyState: deriveLobbyState(state),
  });

  const syncServer = getStep(progress.steps, "sync_server");
  const lobbyJoin = getStep(progress.steps, "lobby_join");

  assert.equal(progress.isBlocking, true);
  assert.equal(syncServer.status, "complete");
  assert.equal(syncServer.progress, 100);
  assert.equal(lobbyJoin.status, "active");
  assert.equal(lobbyJoin.detail, "Ready to join shared session.");
});
