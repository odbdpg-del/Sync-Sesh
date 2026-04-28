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
  redirect_uri: string;
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

  const runHarness = useCallback(async () => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    setLogs([]);
    setIsRunning(true);

    const attemptId = createDiscordAuthAttemptId();
    appendLog("info", "harness:init:start", `attempt ${attemptId.slice(-8)}`);

    if (!clientId) {
      appendLog("error", "harness:init:failed", "Missing VITE_DISCORD_CLIENT_ID.");
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    ensureDiscordActivityUrlMappingsPatched();

    let sdk: DiscordSDK;

    try {
      sdk = new DiscordSDK(clientId);
      appendLog("info", "sdk:init:success", `attempt ${attemptId.slice(-8)}`);
    } catch (error) {
      appendLog("error", "sdk:init:failed", error instanceof Error ? error.message : "DiscordSDK construction failed.");
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    appendLog("info", "sdk:ready:start", sdk.channelId ?? "no channel context");

    try {
      await sdk.ready();
      appendLog("info", "sdk:ready:success", sdk.instanceId ?? "no instance id");
    } catch (error) {
      appendLog("error", "sdk:ready:failed", error instanceof Error ? error.message : "sdk.ready() failed.");
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    appendLog(
      "info",
      "auth:interactive:start",
      `build ${typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "test-build"} | redirect ${config.redirectUri} | endpoint ${config.authEndpoint} | channel ${sdk.channelId ?? "n/a"} | guild ${sdk.guildId ?? "n/a"} | instance ${sdk.instanceId ?? "n/a"}`,
    );

    try {
      const authorizeOptions: HarnessAuthorizeRequest = {
        client_id: clientId,
        response_type: "code" as const,
        state: `${Date.now()}`,
        scope: ["identify"],
        redirect_uri: config.redirectUri,
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
      } else {
        appendLog("info", "auth:interactive:success", `Authorization code received. ${debugSummary}`);
      }
    } catch (error) {
      const code = getSafeHarnessErrorCode(error);
      const message = error instanceof Error ? error.message : "Discord authorize request failed.";
      appendLog(
        "error",
        "auth:interactive:failed",
        code ? `${message} [code=${code}]` : message,
      );
    } finally {
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
            <span className="auth-harness-kicker">Bug 1 Attempt 3</span>
            <h1>Minimal Discord Authorize Harness</h1>
            <p>Runs only `sdk.ready()` and one interactive `authorize()` call.</p>
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
            <strong>Redirect URI</strong>
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
