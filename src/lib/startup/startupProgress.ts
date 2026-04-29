import type { EmbeddedAppState } from "../discord/embeddedApp";
import type { DabSyncState, DerivedLobbyState } from "../../types/session";

export type StartupPhaseId =
  | "app_shell"
  | "discord_sdk"
  | "discord_identity"
  | "sync_server"
  | "lobby_join"
  | "media";

export type StartupPhaseState = "pending" | "active" | "complete" | "degraded" | "error";

export interface StartupProgressStep {
  id: StartupPhaseId;
  label: string;
  status: StartupPhaseState;
  progress: number;
  required: boolean;
  detail: string;
}

export interface StartupProgress {
  steps: StartupProgressStep[];
  requiredProgress: number;
  isBlocking: boolean;
  blockingReason?: string;
}

interface BuildStartupProgressOptions {
  sdkState: EmbeddedAppState;
  state: DabSyncState;
  lobbyState: DerivedLobbyState;
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(progress)));
}

function getAuthStageProgress(authStage: EmbeddedAppState["authStage"]) {
  switch (authStage) {
    case "authorizing":
      return 40;
    case "exchanging_token":
      return 60;
    case "authenticating":
      return 75;
    case "subscribing":
      return 85;
    case "ready":
      return 100;
    case "idle":
    case undefined:
      return 20;
  }
}

function buildAppShellStep(): StartupProgressStep {
  return {
    id: "app_shell",
    label: "App Shell",
    status: "complete",
    progress: 100,
    required: true,
    detail: "Interface bootstrapped.",
  };
}

function buildDiscordSdkStep(sdkState: EmbeddedAppState): StartupProgressStep {
  if (!sdkState.enabled) {
    return {
      id: "discord_sdk",
      label: "Discord SDK",
      status: sdkState.startupError ? "degraded" : "complete",
      progress: 100,
      required: false,
      detail: sdkState.startupError ?? "Discord SDK skipped outside Activity mode.",
    };
  }

  if (sdkState.startupError && sdkState.startupStage !== "auth") {
    return {
      id: "discord_sdk",
      label: "Discord SDK",
      status: "degraded",
      progress: 100,
      required: false,
      detail: sdkState.startupError,
    };
  }

  switch (sdkState.startupStage) {
    case "sdk_init":
      return {
        id: "discord_sdk",
        label: "Discord SDK",
        status: "active",
        progress: 40,
        required: false,
        detail: "Initializing Discord Activity runtime.",
      };
    case "sdk_ready":
      return {
        id: "discord_sdk",
        label: "Discord SDK",
        status: "active",
        progress: 70,
        required: false,
        detail: "Discord SDK ready; resolving identity.",
      };
    case "auth":
    case "ready":
      return {
        id: "discord_sdk",
        label: "Discord SDK",
        status: "complete",
        progress: 100,
        required: false,
        detail: "Discord Activity runtime is available.",
      };
    case "disabled":
    case undefined:
      return {
        id: "discord_sdk",
        label: "Discord SDK",
        status: "pending",
        progress: 0,
        required: false,
        detail: "Waiting for Discord SDK startup.",
      };
  }
}

function buildDiscordIdentityStep(sdkState: EmbeddedAppState): StartupProgressStep {
  if (!sdkState.enabled) {
    return {
      id: "discord_identity",
      label: "Discord Identity",
      status: "complete",
      progress: 100,
      required: false,
      detail: "Using local browser identity.",
    };
  }

  if (sdkState.identitySource === "authenticated_discord") {
    return {
      id: "discord_identity",
      label: "Discord Identity",
      status: "complete",
      progress: 100,
      required: false,
      detail: "Authenticated Discord profile loaded.",
    };
  }

  if (sdkState.identitySource === "participant_discord") {
    return {
      id: "discord_identity",
      label: "Discord Identity",
      status: "degraded",
      progress: 100,
      required: false,
      detail: sdkState.authError ?? "Using participant profile while full identity is unavailable.",
    };
  }

  if (sdkState.identitySource === "local_fallback" || sdkState.authError) {
    return {
      id: "discord_identity",
      label: "Discord Identity",
      status: "degraded",
      progress: 100,
      required: false,
      detail: sdkState.authError ?? sdkState.startupError ?? "Using local fallback identity.",
    };
  }

  return {
    id: "discord_identity",
    label: "Discord Identity",
    status: "active",
    progress: getAuthStageProgress(sdkState.authStage),
    required: false,
    detail: sdkState.authStage && sdkState.authStage !== "idle"
      ? `Resolving Discord identity: ${sdkState.authStage.replace(/_/g, " ")}.`
      : "Waiting for Discord identity.",
  };
}

function buildSyncServerStep(state: DabSyncState): StartupProgressStep {
  if (state.syncStatus.mode === "mock") {
    return {
      id: "sync_server",
      label: "Sync Server",
      status: "complete",
      progress: 100,
      required: true,
      detail: "Mock sync is ready.",
    };
  }

  if (state.syncStatus.connection === "error" || state.syncStatus.startupMilestone === "error") {
    return {
      id: "sync_server",
      label: "Sync Server",
      status: "error",
      progress: 100,
      required: true,
      detail: state.syncStatus.warning ?? state.syncStatus.debugDetail ?? "Sync server connection failed.",
    };
  }

  switch (state.syncStatus.connection) {
    case "offline":
      return {
        id: "sync_server",
        label: "Sync Server",
        status: "pending",
        progress: 0,
        required: true,
        detail: state.syncStatus.warning ?? "Waiting for sync connection.",
      };
    case "connecting":
      return {
        id: "sync_server",
        label: "Sync Server",
        status: "active",
        progress: 35,
        required: true,
        detail: state.syncStatus.debugDetail ?? "Opening sync server connection.",
      };
    case "connected":
      if (state.syncStatus.startupMilestone === "socket_open") {
        return {
          id: "sync_server",
          label: "Sync Server",
          status: "active",
          progress: 70,
          required: true,
          detail: state.syncStatus.debugDetail ?? "Sync socket open; waiting for room snapshot.",
        };
      }

      return {
        id: "sync_server",
        label: "Sync Server",
        status: "complete",
        progress: 100,
        required: true,
        detail: state.syncStatus.startupMilestone === "snapshot_received"
          ? state.syncStatus.debugDetail ?? "Received shared room snapshot."
          : state.syncStatus.debugDetail ?? "Sync server connected.",
      };
  }
}

function hasSyncSnapshot(state: DabSyncState) {
  return state.syncStatus.mode === "mock" || state.syncStatus.startupMilestone === "snapshot_received";
}

function buildLobbyJoinStep(state: DabSyncState, lobbyState: DerivedLobbyState): StartupProgressStep {
  if (!hasSyncSnapshot(state)) {
    return {
      id: "lobby_join",
      label: "Lobby Join",
      status: "pending",
      progress: 0,
      required: true,
      detail: "Waiting for sync snapshot before joining lobby.",
    };
  }

  if (!lobbyState.localUser) {
    return {
      id: "lobby_join",
      label: "Lobby Join",
      status: "active",
      progress: 50,
      required: true,
      detail: "Ready to join shared session.",
    };
  }

  if (lobbyState.isLocalUserSpectating) {
    return {
      id: "lobby_join",
      label: "Lobby Join",
      status: "degraded",
      progress: 100,
      required: true,
      detail: "Joined as a spectator for the active round.",
    };
  }

  return {
    id: "lobby_join",
    label: "Lobby Join",
    status: "complete",
    progress: 100,
    required: true,
    detail: "Joined shared session.",
  };
}

function buildMediaStep(): StartupProgressStep {
  return {
    id: "media",
    label: "Media",
    status: "complete",
    progress: 100,
    required: false,
    detail: "Media will continue loading in the background.",
  };
}

function getBlockingReason(step: StartupProgressStep) {
  if (!step.required) {
    return undefined;
  }

  if (step.status === "pending" || step.status === "active" || step.status === "error") {
    return step.detail;
  }

  return undefined;
}

export function buildStartupProgress({ sdkState, state, lobbyState }: BuildStartupProgressOptions): StartupProgress {
  const steps: StartupProgressStep[] = [
    buildAppShellStep(),
    buildDiscordSdkStep(sdkState),
    buildDiscordIdentityStep(sdkState),
    buildSyncServerStep(state),
    buildLobbyJoinStep(state, lobbyState),
    buildMediaStep(),
  ].map((step) => ({
    ...step,
    progress: clampProgress(step.progress),
  }));

  const requiredSteps = steps.filter((step) => step.required);
  const requiredProgress = requiredSteps.length === 0
    ? 100
    : clampProgress(requiredSteps.reduce((total, step) => total + step.progress, 0) / requiredSteps.length);
  const blockingReason = requiredSteps.map(getBlockingReason).find((reason): reason is string => Boolean(reason));

  return {
    steps,
    requiredProgress,
    isBlocking: Boolean(blockingReason),
    blockingReason,
  };
}
