import { DiscordSDK } from "@discord/embedded-app-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDiscordAuthAttemptId,
  ensureDiscordActivityUrlMappingsPatched,
  extractDiscordAuthorizationCode,
  getDiscordDebugConfigSnapshot,
} from "../lib/discord/embeddedApp";

type HarnessLogLevel = "info" | "warn" | "error";

interface HarnessLogEntry {
  id: string;
  timestamp: number;
  level: HarnessLogLevel;
  label: string;
  detail?: string;
}

const HARNESS_AUTHORIZE_TIMEOUT_MS = 45_000;

interface HarnessAuthorizeRequest {
  client_id: string;
  response_type: "code";
  state: string;
  scope: Array<"identify">;
}

function formatHarnessTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function formatValue(value: string | boolean | undefined) {
  if (value === undefined || value === "") {
    return "n/a";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return value;
}

function getSafeHarnessErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  const code = record.code;
  return typeof code === "string" || typeof code === "number" ? String(code) : undefined;
}

export function AuthHarnessScreen() {
  const [logs, setLogs] = useState<HarnessLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const config = useMemo(() => getDiscordDebugConfigSnapshot(), []);
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const isRunningRef = useRef(false);

  const appendLog = useCallback((level: HarnessLogLevel, label: string, detail?: string) => {
    setLogs((current) => [
      ...current,
      {
        id: `auth-harness-log-${Date.now()}-${current.length}`,
        timestamp: Date.now(),
        level,
        label,
        detail,
      },
    ]);
  }, []);

  useEffect(() => {
    window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("react:mounted");
    window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail("Harness mounted. Installing runtime crash listeners.");
  }, []);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const detail = event.error instanceof Error
        ? event.error.message
        : event.message || "Unknown window error.";
      appendLog("error", "window:error", detail);
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("window:error");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(detail);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const detail = reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection.";
      appendLog("error", "window:unhandledrejection", detail);
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("window:unhandledrejection");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(detail);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [appendLog]);

  const runHarness = useCallback(async () => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    setLogs([]);
    setIsRunning(true);

    const attemptId = createDiscordAuthAttemptId();
    appendLog("info", "harness:init:start", `attempt ${attemptId.slice(-8)}`);
    window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("harness:init:start");
    window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(`Starting minimal Discord auth attempt ${attemptId.slice(-8)}.`);

    if (!clientId) {
      appendLog("error", "harness:init:failed", "Missing VITE_DISCORD_CLIENT_ID.");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("harness:init:failed");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail("Missing VITE_DISCORD_CLIENT_ID.");
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    ensureDiscordActivityUrlMappingsPatched();

    let sdk: DiscordSDK;

    try {
      sdk = new DiscordSDK(clientId);
      appendLog("info", "sdk:init:success", `attempt ${attemptId.slice(-8)}`);
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("sdk:init:success");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail("DiscordSDK constructed successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "DiscordSDK construction failed.";
      appendLog("error", "sdk:init:failed", message);
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("sdk:init:failed");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(message);
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    appendLog("info", "sdk:ready:start", sdk.channelId ?? "no channel context");

    try {
      await sdk.ready();
      appendLog("info", "sdk:ready:success", sdk.instanceId ?? "no instance id");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("sdk:ready:success");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail("Discord SDK handshake completed. Starting authorize request.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "sdk.ready() failed.";
      appendLog("error", "sdk:ready:failed", message);
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("sdk:ready:failed");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(message);
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    appendLog(
      "info",
      "auth:interactive:start",
      `build ${typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "test-build"} | backend redirect ${config.redirectUri} | endpoint ${config.authEndpoint} | channel ${sdk.channelId ?? "n/a"} | guild ${sdk.guildId ?? "n/a"} | instance ${sdk.instanceId ?? "n/a"}`,
    );
    window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("auth:interactive:start");
    window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail("Discord authorize request started. Waiting for popup or failure.");

    try {
      const authorizeOptions: HarnessAuthorizeRequest = {
        client_id: clientId,
        response_type: "code" as const,
        state: `${Date.now()}`,
        scope: ["identify"],
      };
      const authorizeResult = await Promise.race([
        sdk.commands.authorize(authorizeOptions),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("Harness authorize timed out before returning an authorization code."));
          }, HARNESS_AUTHORIZE_TIMEOUT_MS);
        }),
      ]);

      const { code, debugSummary } = extractDiscordAuthorizationCode(authorizeResult);

      if (!code) {
        appendLog("error", "auth:interactive:failed", `Authorize returned no usable code. ${debugSummary}`);
        window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("auth:interactive:failed");
        window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(`Authorize returned no usable code. ${debugSummary}`);
      } else {
        appendLog("info", "auth:interactive:success", `Authorization code received. ${debugSummary}`);
        window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("auth:interactive:success");
        window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail("Authorization code received. The minimal authorize path is working.");
      }
    } catch (error) {
      const code = getSafeHarnessErrorCode(error);
      const message = error instanceof Error ? error.message : "Discord authorize request failed.";
      const detail = code ? `${message} [code=${code}]` : message;
      appendLog(
        "error",
        "auth:interactive:failed",
        detail,
      );
      window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("auth:interactive:failed");
      window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(detail);
    } finally {
      window.__AUTH_HARNESS_BOOT_STATUS__?.hide();
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, [appendLog, clientId, config.authEndpoint, config.redirectUri]);

  useEffect(() => {
    void runHarness();
  }, [runHarness]);

  return (
    <div className="auth-harness-stage">
      <main className="auth-harness-shell panel">
        <header className="auth-harness-header">
          <div>
            <span className="auth-harness-kicker">Bug 1 Attempt 5</span>
            <h1>Discord Auth Diagnostic Harness</h1>
            <p>Runs only `sdk.ready()` and one interactive `authorize()` call, with visible crash and boot status reporting.</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => void runHarness()} disabled={isRunning}>
            {isRunning ? "Running..." : "Run Again"}
          </button>
        </header>

        <section className="auth-harness-grid">
          <div className="auth-harness-card">
            <strong>Client ID Present</strong>
            <span>{formatValue(Boolean(clientId))}</span>
          </div>
          <div className="auth-harness-card">
            <strong>Backend Redirect URI</strong>
            <span>{formatValue(config.redirectUri)}</span>
          </div>
          <div className="auth-harness-card">
            <strong>Auth Endpoint</strong>
            <span>{formatValue(config.authEndpoint)}</span>
          </div>
          <div className="auth-harness-card">
            <strong>Discord Proxy Host</strong>
            <span>{formatValue(config.isDiscordProxyHost)}</span>
          </div>
        </section>

        <section className="auth-harness-log-panel">
          <div className="auth-harness-log-header">
            <strong>Harness Log</strong>
            <span>{logs.length} entries</span>
          </div>
          <div className="auth-harness-log-list" aria-live="polite">
            {logs.length > 0 ? (
              logs.map((entry) => (
                <div key={entry.id} className={`auth-harness-log-line auth-harness-log-${entry.level}`}>
                  <span className="auth-harness-log-time">[{formatHarnessTimestamp(entry.timestamp)}]</span>
                  <span className="auth-harness-log-label">{entry.label}</span>
                  {entry.detail ? <span className="auth-harness-log-detail"> - {entry.detail}</span> : null}
                </div>
              ))
            ) : (
              <div className="auth-harness-log-empty">Waiting for harness run...</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
