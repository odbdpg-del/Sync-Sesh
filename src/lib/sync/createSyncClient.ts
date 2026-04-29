import { MockSyncClient } from "./mockSyncClient";
import type { SyncClient } from "./types";
import { getLocalProfile } from "../session/localProfile";
import { WebSocketSyncClient } from "./wsSyncClient";

function isDiscordProxyHost() {
  return window.location.host.includes("discordsays.com") || window.location.host.includes("discordsez.com");
}

function buildActivityProxyWebSocketUrl() {
  const url = new URL("/ws", window.location.href);
  url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function normalizeWebSocketUrl(configuredUrl: string) {
  const parsed = new URL(configuredUrl);

  parsed.protocol = parsed.protocol === "https:" || parsed.protocol === "wss:" ? "wss:" : "ws:";

  if (parsed.pathname === "/" || parsed.pathname === "") {
    parsed.pathname = "/ws";
  }

  return parsed.toString();
}

function resolveSyncServerUrl() {
  const directSyncUrl = import.meta.env.VITE_SYNC_DIRECT_URL;

  if (directSyncUrl && directSyncUrl !== "auto" && !isDiscordProxyHost()) {
    try {
      return normalizeWebSocketUrl(directSyncUrl);
    } catch {
      return directSyncUrl;
    }
  }

  const configuredUrl = import.meta.env.VITE_SYNC_SERVER_URL;

  if (!configuredUrl || configuredUrl === "auto") {
    return buildActivityProxyWebSocketUrl();
  }

  try {
    const parsed = new URL(configuredUrl);
    const isLocalTarget = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isRemotePage = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

    if (isLocalTarget && isRemotePage) {
      return buildActivityProxyWebSocketUrl();
    }

    return normalizeWebSocketUrl(parsed.toString());
  } catch {
    return isDiscordProxyHost() ? buildActivityProxyWebSocketUrl() : configuredUrl;
  }
}

function resolveSessionId() {
  const url = new URL(window.location.href);
  const discordInstanceId = url.searchParams.get("instance_id");
  const discordChannelId = url.searchParams.get("channel_id");

  if (discordInstanceId) {
    return `discord-instance-${discordInstanceId}`;
  }

  if (discordChannelId) {
    return `discord-channel-${discordChannelId}`;
  }

  return import.meta.env.VITE_SYNC_SESSION_ID ?? "dabsync-room";
}

export function createSyncClient(): SyncClient {
  const mode = import.meta.env.VITE_SYNC_MODE ?? (import.meta.env.VITE_ENABLE_DISCORD_SDK === "true" ? "ws" : "mock");
  const localProfile = getLocalProfile();

  if (mode === "ws") {
    return new WebSocketSyncClient({
      localProfile,
      serverUrl: resolveSyncServerUrl(),
      sessionId: resolveSessionId(),
    });
  }

  return new MockSyncClient(localProfile);
}
