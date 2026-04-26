import type { EmbeddedAppState } from "../lib/discord/embeddedApp";
import type { SyncStatus } from "../types/session";

interface StatusFooterProps {
  syncStatus: SyncStatus;
  sdkState: EmbeddedAppState;
}

function getSyncSummary(syncStatus: SyncStatus) {
  if (syncStatus.connection === "connected") {
    return syncStatus.warning ?? "Synchronized timing available";
  }

  if (syncStatus.connection === "connecting") {
    return "Connecting to shared timing";
  }

  if (syncStatus.connection === "error") {
    return syncStatus.warning ?? "Sync error";
  }

  return syncStatus.warning ?? "Sync offline";
}

export function StatusFooter({ syncStatus, sdkState }: StatusFooterProps) {
  const shortAttemptId = sdkState.attemptId ? sdkState.attemptId.slice(-8) : "n/a";

  return (
    <footer className="panel footer-bar">
      <span>
        Sync mode: <strong>{syncStatus.mode}</strong>
      </span>
      <span>
        Transport: <strong>{syncStatus.connection}</strong>
      </span>
      <span>
        SDK: <strong>{sdkState.enabled ? "embedded" : "fallback mode"}</strong>
      </span>
      <span>
        Startup: <strong>{sdkState.startupStage ?? "unknown"}</strong>
      </span>
      <span>
        Identity: <strong>{sdkState.identitySource === "discord" ? "discord" : "local fallback"}</strong>
      </span>
      <span>
        Auth stage: <strong>{sdkState.authStage ?? "idle"}</strong>
      </span>
      <span>
        Attempt: <strong>{shortAttemptId}</strong>
      </span>
      <span>
        Build: <strong>{sdkState.buildId}</strong>
      </span>
      <span>
        Latency: <strong>{syncStatus.latencyMs !== undefined ? `${syncStatus.latencyMs}ms` : "n/a"}</strong>
      </span>
      <span>
        Clock offset: <strong>{syncStatus.serverTimeOffsetMs !== undefined ? `${Math.round(syncStatus.serverTimeOffsetMs)}ms` : "n/a"}</strong>
      </span>
      <span>
        Status: <strong>{getSyncSummary(syncStatus)}</strong>
      </span>
      {sdkState.authError ? (
        <span>
          Discord auth: <strong>{sdkState.authError}</strong>
        </span>
      ) : null}
      {sdkState.startupError && sdkState.startupError !== sdkState.authError ? (
        <span>
          Discord startup: <strong>{sdkState.startupError}</strong>
        </span>
      ) : null}
    </footer>
  );
}
