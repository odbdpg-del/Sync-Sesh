import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EmbeddedAppState, EmbeddedIdentitySource } from "../lib/discord/embeddedApp";
import type { DebugConsoleEventInput, DebugLogCategory, DebugLogEntry } from "../lib/debug/debugConsole";
import { getDiscordDebugConfigSnapshot } from "../lib/discord/embeddedApp";
import type { SyncStatus, LocalProfile } from "../types/session";

const DEBUG_LOG_LIMIT = 250;
export type DebugConsoleFilter = "all" | DebugLogCategory;
const COMMAND_CATEGORIES_VISIBLE_DURING_FILTER = new Set(["command"]);

export interface DebugConsoleSnapshot {
  buildId: string;
  pageUrl: string;
  host: string;
  isDiscordProxyHost: boolean;
  authEndpoint: string;
  redirectUri: string;
  discordSdkEnabledByEnv: boolean;
  hasDiscordClientId: boolean;
  attemptId?: string;
  identitySource?: EmbeddedIdentitySource;
  startupStage?: EmbeddedAppState["startupStage"];
  authStage?: EmbeddedAppState["authStage"];
  authError?: string;
  startupError?: string;
  sdkEnabled: boolean;
  channelId?: string;
  guildId?: string;
  instanceId?: string;
  syncMode: SyncStatus["mode"];
  syncConnection: SyncStatus["connection"];
  syncLatencyMs?: number;
  syncWarning?: string;
  localProfileId: string;
  localProfileDisplayName: string;
  hasAvatarUrl: boolean;
}

interface UseDebugConsoleStateOptions {
  isOpen: boolean;
  sdkState: EmbeddedAppState;
  syncStatus: SyncStatus;
  localProfile: LocalProfile;
}

export const DEBUG_CONSOLE_SNAPSHOT_ROWS: Array<{ key: keyof DebugConsoleSnapshot; label: string }> = [
  { key: "buildId", label: "Build" },
  { key: "pageUrl", label: "Page URL" },
  { key: "host", label: "Host" },
  { key: "isDiscordProxyHost", label: "Discord Proxy Host" },
  { key: "authEndpoint", label: "Auth Endpoint" },
  { key: "redirectUri", label: "Redirect URI" },
  { key: "discordSdkEnabledByEnv", label: "SDK Enabled By Env" },
  { key: "hasDiscordClientId", label: "Has Discord Client ID" },
  { key: "attemptId", label: "Attempt ID" },
  { key: "identitySource", label: "Identity Source" },
  { key: "startupStage", label: "Startup Stage" },
  { key: "authStage", label: "Auth Stage" },
  { key: "authError", label: "Auth Error" },
  { key: "startupError", label: "Startup Error" },
  { key: "sdkEnabled", label: "SDK Enabled" },
  { key: "channelId", label: "Channel ID" },
  { key: "guildId", label: "Guild ID" },
  { key: "instanceId", label: "Instance ID" },
  { key: "syncMode", label: "Sync Mode" },
  { key: "syncConnection", label: "Sync Transport" },
  { key: "syncLatencyMs", label: "Sync Latency (ms)" },
  { key: "syncWarning", label: "Sync Warning" },
  { key: "localProfileId", label: "Local Profile ID" },
  { key: "localProfileDisplayName", label: "Local Profile Name" },
  { key: "hasAvatarUrl", label: "Has Avatar URL" },
];

export function formatDebugConsoleTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function formatSnapshotValue(value: boolean | number | string | undefined) {
  if (value === undefined || value === "") {
    return "n/a";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return String(value);
}

function formatLogLine(entry: DebugLogEntry) {
  if (entry.kind === "command_input") {
    return `[${formatDebugConsoleTimestamp(entry.timestamp)}] > ${entry.label}`;
  }

  const detailSuffix = entry.detail ? ` - ${entry.detail}` : "";
  return `[${formatDebugConsoleTimestamp(entry.timestamp)}] [${entry.level}] [${entry.category}] ${entry.label}${detailSuffix}`;
}

function createDebugLogEntry(
  nextIdRef: React.MutableRefObject<number>,
  entry: Omit<DebugLogEntry, "id" | "timestamp"> & { timestamp?: number },
): DebugLogEntry {
  const timestamp = entry.timestamp ?? Date.now();
  const id = `debug-log-${timestamp}-${nextIdRef.current}`;
  nextIdRef.current += 1;

  return {
    id,
    timestamp,
    kind: entry.kind,
    level: entry.level,
    category: entry.category,
    label: entry.label,
    detail: entry.detail,
  };
}

export function useDebugConsoleState({ isOpen, sdkState, syncStatus, localProfile }: UseDebugConsoleStateOptions) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<DebugConsoleFilter>("all");
  const nextIdRef = useRef(1);
  const hasSeededRef = useRef(false);
  const previousOpenRef = useRef(isOpen);

  const appendLog = useCallback((entry: DebugConsoleEventInput & { timestamp?: number }) => {
    setLogs((current) => [...current, createDebugLogEntry(nextIdRef, { kind: entry.kind ?? "event", ...entry })].slice(-DEBUG_LOG_LIMIT));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const appendCommandInput = useCallback((command: string) => {
    appendLog({
      kind: "command_input",
      level: "info",
      category: "command",
      label: command,
    });
  }, [appendLog]);

  const appendCommandOutput = useCallback((entry: Omit<DebugConsoleEventInput, "category"> & { category?: DebugLogCategory }) => {
    appendLog({
      kind: "command_output",
      category: entry.category ?? "command",
      level: entry.level,
      label: entry.label,
      detail: entry.detail,
    });
  }, [appendLog]);

  const visibleLogs = useMemo(
    () =>
      activeFilter === "all"
        ? logs
        : logs.filter((entry) => entry.category === activeFilter || COMMAND_CATEGORIES_VISIBLE_DURING_FILTER.has(entry.category)),
    [activeFilter, logs],
  );

  useEffect(() => {
    if (hasSeededRef.current) {
      return;
    }

    hasSeededRef.current = true;
    appendLog({
      level: "info",
      category: "ui",
      label: "ui:console:store-ready",
      detail: "Debug console buffer initialized.",
    });
  }, [appendLog]);

  useEffect(() => {
    const previousOpen = previousOpenRef.current;
    previousOpenRef.current = isOpen;

    if (previousOpen === isOpen) {
      return;
    }

    appendLog({
      level: "info",
      category: "ui",
      label: isOpen ? "ui:console:opened" : "ui:console:closed",
      detail: isOpen ? "Debug console window opened." : "Debug console window closed.",
    });
  }, [appendLog, isOpen]);

  const snapshot = useMemo<DebugConsoleSnapshot>(() => {
    const config = getDiscordDebugConfigSnapshot();

    return {
      buildId: sdkState.buildId,
      pageUrl: window.location.href,
      host: window.location.host,
      isDiscordProxyHost: config.isDiscordProxyHost,
      authEndpoint: config.authEndpoint,
      redirectUri: config.redirectUri,
      discordSdkEnabledByEnv: config.discordSdkEnabledByEnv,
      hasDiscordClientId: config.hasDiscordClientId,
      attemptId: sdkState.attemptId,
      identitySource: sdkState.identitySource,
      startupStage: sdkState.startupStage,
      authStage: sdkState.authStage,
      authError: sdkState.authError,
      startupError: sdkState.startupError,
      sdkEnabled: sdkState.enabled,
      channelId: sdkState.channelId,
      guildId: sdkState.guildId,
      instanceId: sdkState.instanceId,
      syncMode: syncStatus.mode,
      syncConnection: syncStatus.connection,
      syncLatencyMs: syncStatus.latencyMs,
      syncWarning: syncStatus.warning,
      localProfileId: localProfile.id,
      localProfileDisplayName: localProfile.displayName,
      hasAvatarUrl: Boolean(localProfile.avatarUrl),
    };
  }, [localProfile.avatarUrl, localProfile.displayName, localProfile.id, sdkState, syncStatus]);

  const getSnapshotText = useCallback(() => {
    return ["Snapshot", ...DEBUG_CONSOLE_SNAPSHOT_ROWS.map((row) => `${row.label}: ${formatSnapshotValue(snapshot[row.key])}`)].join("\n");
  }, [snapshot]);

  const getVisibleLogText = useCallback(() => {
    return visibleLogs.map(formatLogLine).join("\n");
  }, [visibleLogs]);

  return {
    snapshot,
    logs,
    visibleLogs,
    activeFilter,
    setActiveFilter,
    appendLog,
    appendCommandInput,
    appendCommandOutput,
    clearLogs,
    getSnapshotText,
    getVisibleLogText,
  };
}
