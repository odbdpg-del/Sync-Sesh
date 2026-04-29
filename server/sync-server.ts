import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { advanceSessionTime, createSessionSnapshot, reduceSessionEvent } from "../src/lib/lobby/sessionState";
import {
  FALLBACK_GENERATED_PROFILE_NAMES,
  getAvatarSeedFromName,
  getGeneratedProfileNameForUser,
  getRolledGeneratedProfileNameForUser,
  normalizeGeneratedProfileNames,
  parseGeneratedProfileNames,
} from "../src/lib/session/generatedNamesCore";
import type { LocalProfile, SessionEvent, SessionSnapshot } from "../src/types/session";

type ClientMessage =
  | { type: "hello"; sessionId: string; localProfile: LocalProfile }
  | { type: "event"; sessionId: string; event: SessionEvent; localProfile: LocalProfile }
  | { type: "ping"; sentAt: number };

type ServerMessage =
  | { type: "snapshot"; snapshot: SessionSnapshot; serverNow: number }
  | { type: "pong"; sentAt: number; serverNow: number }
  | { type: "error"; message: string; serverNow: number };

interface SessionRoom {
  snapshot: SessionSnapshot;
  clients: Set<import("ws").WebSocket>;
}

interface SocketSessionInfo {
  sessionId: string;
  localProfile: LocalProfile;
}

const port = Number(process.env.PORT ?? 8787);
const DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS = 20_000;
const serverDirname = dirname(fileURLToPath(import.meta.url));
const generatedNamesPath = resolve(serverDirname, "../src/data/generatedNames.txt");
const rooms = new Map<string, SessionRoom>();
const socketToSessionInfo = new Map<import("ws").WebSocket, SocketSessionInfo>();

loadEnvFile(".env");
loadEnvFile(".env.local");

const discordClientId = process.env.DISCORD_CLIENT_ID ?? process.env.VITE_DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
const discordRedirectUri = process.env.DISCORD_REDIRECT_URI ?? process.env.VITE_DISCORD_REDIRECT_URI ?? "https://127.0.0.1";
const buildId = `${process.env.npm_package_version ?? "0.1.0"}-${(process.env.RENDER_GIT_COMMIT ?? "dev").slice(0, 7)}`;

function trimDiagnosticText(value: string, maxLength = 400) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function getMissingDiscordOAuthConfig() {
  const missing: string[] = [];

  if (!discordClientId) {
    missing.push("DISCORD_CLIENT_ID");
  }

  if (!discordClientSecret) {
    missing.push("DISCORD_CLIENT_SECRET");
  }

  return missing;
}

function getDiscordOAuthConfigSummary() {
  return {
    has_client_id: Boolean(discordClientId),
    has_client_secret: Boolean(discordClientSecret),
    redirect_uri: discordRedirectUri,
    missing: getMissingDiscordOAuthConfig(),
  };
}

function loadEnvFile(filename: string) {
  const filePath = join(process.cwd(), filename);

  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function readGeneratedNamePool() {
  try {
    const names = parseGeneratedProfileNames(readFileSync(generatedNamesPath, "utf8"));
    return names.length > 0 ? names : FALLBACK_GENERATED_PROFILE_NAMES;
  } catch {
    return FALLBACK_GENERATED_PROFILE_NAMES;
  }
}

const generatedNamePool = readGeneratedNamePool();

function createRoom(sessionId: string): SessionRoom {
  return {
    snapshot: createSessionSnapshot({
      session: {
        id: sessionId,
        code: sessionId.toUpperCase().slice(0, 8),
        phase: "idle",
        roundNumber: 1,
        ownerId: "",
      },
      users: [],
    }),
    clients: new Set(),
  };
}

function getRoom(sessionId: string) {
  const existingRoom = rooms.get(sessionId);

  if (!existingRoom || existingRoom.clients.size === 0) {
    const freshRoom = createRoom(sessionId);
    rooms.set(sessionId, freshRoom);
    return freshRoom;
  }

  return existingRoom;
}

function createProfileWithDisplayName(localProfile: LocalProfile, displayName: string): LocalProfile {
  return {
    ...localProfile,
    displayName,
    avatarSeed: getAvatarSeedFromName(displayName),
  };
}

function getExistingProfile(localProfile: LocalProfile, existingUser?: SessionSnapshot["users"][number]): LocalProfile {
  if (!existingUser) {
    return localProfile;
  }

  return {
    ...localProfile,
    displayName: existingUser.displayName,
    avatarSeed: existingUser.avatarSeed,
    avatarUrl: existingUser.avatarUrl,
  };
}

function selectGeneratedProfile(room: SessionRoom, localProfile: LocalProfile, requestedName: string): LocalProfile | null {
  const normalizedName = normalizeGeneratedProfileNames([requestedName])[0];

  if (!normalizedName) {
    return null;
  }

  const canonicalName = generatedNamePool.find((name) => name.toLowerCase() === normalizedName.toLowerCase());

  if (!canonicalName) {
    return null;
  }

  const isTaken = room.snapshot.users.some((user) => (
    user.id !== localProfile.id &&
    user.displayName.trim().toLowerCase() === canonicalName.toLowerCase()
  ));

  return isTaken ? null : createProfileWithDisplayName(localProfile, canonicalName);
}

function selectActorProfile(room: SessionRoom, localProfile: LocalProfile, requestedName: string): LocalProfile | null {
  const displayName = requestedName.trim();

  if (!displayName || displayName !== localProfile.displayName) {
    return null;
  }

  const isTaken = room.snapshot.users.some((user) => (
    user.id !== localProfile.id &&
    user.displayName.trim().toLowerCase() === displayName.toLowerCase()
  ));

  return isTaken ? null : localProfile;
}

function assignActorProfileIfAvailable(room: SessionRoom, localProfile: LocalProfile): LocalProfile | null {
  const displayName = localProfile.displayName.trim();

  if (!displayName) {
    return null;
  }

  const isTaken = room.snapshot.users.some((user) => (
    user.id !== localProfile.id &&
    user.displayName.trim().toLowerCase() === displayName.toLowerCase()
  ));

  return isTaken ? null : localProfile;
}

function assignGeneratedProfile(room: SessionRoom, localProfile: LocalProfile, event?: SessionEvent): LocalProfile {
  const existingUser = room.snapshot.users.find((user) => user.id === localProfile.id);

  if (event?.type === "select_display_name") {
    if (event.source === "discord") {
      return selectActorProfile(room, localProfile, event.displayName) ?? getExistingProfile(localProfile, existingUser);
    }

    return selectGeneratedProfile(room, localProfile, event.displayName) ?? getExistingProfile(localProfile, existingUser);
  }

  if (existingUser && event?.type !== "roll_display_name") {
    return getExistingProfile(localProfile, existingUser);
  }

  if (event?.type !== "roll_display_name") {
    const actorProfile = assignActorProfileIfAvailable(room, localProfile);

    if (actorProfile) {
      return actorProfile;
    }
  }

  const takenNames = room.snapshot.users
    .filter((user) => user.id !== localProfile.id)
    .map((user) => user.displayName);
  const displayName = event?.type === "roll_display_name"
    ? getRolledGeneratedProfileNameForUser(localProfile.id, takenNames, existingUser?.displayName ?? localProfile.displayName, event.rollKey, generatedNamePool)
    : getGeneratedProfileNameForUser(localProfile.id, takenNames, generatedNamePool);

  return createProfileWithDisplayName(localProfile, displayName);
}

function send(socket: import("ws").WebSocket, payload: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(sessionId: string) {
  const room = rooms.get(sessionId);

  if (!room) {
    return;
  }

  const payload: ServerMessage = {
    type: "snapshot",
    snapshot: room.snapshot,
    serverNow: Date.now(),
  };

  for (const client of room.clients) {
    send(client, payload);
  }
}

function sendJson(response: import("node:http").ServerResponse, statusCode: number, payload: Record<string, unknown>) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

async function handleDiscordTokenExchange(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) {
  let requestBody: Record<string, unknown> = {};
  try {
    requestBody = await readJsonBody(request);
  } catch {
    sendJson(response, 400, {
      error: "Invalid JSON payload.",
      buildId,
    });
    return;
  }

  const attemptId = typeof requestBody.attemptId === "string" ? requestBody.attemptId : "unknown";

  console.log("Discord token exchange requested.", {
    attemptId,
    build_id: buildId,
    method: request.method,
    origin: request.headers.origin ?? null,
    referer: request.headers.referer ?? null,
    user_agent: request.headers["user-agent"] ?? null,
  });

  const missingDiscordOAuthConfig = getMissingDiscordOAuthConfig();

  if (missingDiscordOAuthConfig.length > 0) {
    console.error("Discord OAuth is not configured on the sync server.", {
      attemptId,
      build_id: buildId,
      missing: missingDiscordOAuthConfig,
      redirect_uri: discordRedirectUri,
    });
    sendJson(response, 500, {
      error: `Discord OAuth is not configured on the sync server. Missing ${missingDiscordOAuthConfig.join(", ")}.`,
      attemptId,
      buildId,
      missing: missingDiscordOAuthConfig,
    });
    return;
  }

  const code = typeof requestBody.code === "string" ? requestBody.code : undefined;

  if (!code) {
    console.error("Discord token exchange request missing code.", { attemptId });
    sendJson(response, 400, {
      error: "Missing Discord authorization code.",
      attemptId,
      buildId,
    });
    return;
  }

  const tokenExchangeController = new AbortController();
  const tokenExchangeTimeout = setTimeout(() => {
    tokenExchangeController.abort();
  }, DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS);

  let tokenResponse: Response;

  try {
    console.log("Discord token exchange forwarding to Discord.", {
      attemptId,
      build_id: buildId,
      redirect_uri: discordRedirectUri,
      timeout_ms: DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS,
    });

    tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: discordClientId,
        client_secret: discordClientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: discordRedirectUri,
      }),
      signal: tokenExchangeController.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Discord token exchange network error.";
    console.error("Discord token exchange network failed.", {
      attemptId,
      build_id: buildId,
      error: message,
      timeout_ms: DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS,
    });
    sendJson(response, 504, {
      error: `Discord token exchange network failed: ${message}`,
      attemptId,
      buildId,
    });
    return;
  } finally {
    clearTimeout(tokenExchangeTimeout);
  }

  const responseText = await tokenResponse.text().catch(() => "");
  const payload = responseText ? parseJsonObject(responseText) : null;

  if (!tokenResponse.ok || typeof payload?.access_token !== "string") {
    const discordError =
      typeof payload?.error === "string" ? payload.error : "unknown_error";
    const discordErrorDescription =
      typeof payload?.error_description === "string" ? payload.error_description : undefined;
    const responseError =
      discordErrorDescription ??
      (typeof payload?.message === "string" ? payload.message : undefined) ??
      (responseText ? trimDiagnosticText(responseText, 180) : undefined) ??
      discordError;
    const configHint = discordError === "invalid_grant"
      ? " Check that DISCORD_REDIRECT_URI exactly matches the Discord Developer Portal redirect URI."
      : "";
    const retryAfter = tokenResponse.headers.get("retry-after");
    const rateLimitResetAfter = tokenResponse.headers.get("x-ratelimit-reset-after");
    const rateLimitRemaining = tokenResponse.headers.get("x-ratelimit-remaining");
    const rateLimitBucket = tokenResponse.headers.get("x-ratelimit-bucket");
    const responsePreview = responseText ? trimDiagnosticText(responseText) : undefined;

    console.error("Discord token exchange failed.", {
      attemptId,
      build_id: buildId,
      status: tokenResponse.status,
      error: discordError,
      error_description: discordErrorDescription,
      response_preview: responsePreview,
      retry_after: retryAfter,
      rate_limit_reset_after: rateLimitResetAfter,
      rate_limit_remaining: rateLimitRemaining,
      rate_limit_bucket: rateLimitBucket,
      redirect_uri: discordRedirectUri,
      has_client_id: Boolean(discordClientId),
      has_client_secret: Boolean(discordClientSecret),
    });

    sendJson(response, 502, {
      error: `Discord token exchange failed: ${responseError}.${configHint}`.trim(),
      attemptId,
      buildId,
      discordStatus: tokenResponse.status,
      discordError,
      discordErrorDescription,
      discordResponsePreview: responsePreview,
      retryAfter,
      rateLimitResetAfter,
      rateLimitRemaining,
    });
    return;
  }

  sendJson(response, 200, {
    access_token: payload.access_token,
    expires_in: payload.expires_in,
    scope: payload.scope,
    token_type: payload.token_type,
    attemptId,
    buildId,
  });
}

function isDiscordTokenExchangePath(pathname: string) {
  return pathname === "/api/discord/token" || pathname === "/api/token";
}

const httpServer = createServer((request, response) => {
  const pathname = request.url ? new URL(request.url, "http://localhost").pathname : "/";

  if (request.method === "OPTIONS" && isDiscordTokenExchangePath(pathname)) {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    response.end();
    return;
  }

  if (pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "sync-sesh-sync",
        build_id: buildId,
        discord_oauth: getDiscordOAuthConfigSummary(),
      }),
    );
    return;
  }

  if (request.method === "POST" && isDiscordTokenExchangePath(pathname)) {
    void handleDiscordTokenExchange(request, response);
    return;
  }

  if (pathname === "/sync/generated-names" || pathname === "/generated-names") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ names: generatedNamePool }));
    return;
  }

  response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Sync Sesh sync server is running.");
});

const wsServer = new WebSocketServer({ server: httpServer });

wsServer.on("connection", (socket) => {
  socket.on("message", (rawMessage) => {
    let payload: ClientMessage;

    try {
      payload = JSON.parse(rawMessage.toString()) as ClientMessage;
    } catch {
      send(socket, {
        type: "error",
        message: "Invalid message payload.",
        serverNow: Date.now(),
      });
      return;
    }

    if (payload.type === "hello") {
      const room = getRoom(payload.sessionId);
      room.clients.add(socket);
      socketToSessionInfo.set(socket, {
        sessionId: payload.sessionId,
        localProfile: payload.localProfile,
      });
      send(socket, {
        type: "snapshot",
        snapshot: room.snapshot,
        serverNow: Date.now(),
      });
      return;
    }

    if (payload.type === "event") {
      const room = getRoom(payload.sessionId);
      const assignedProfile = assignGeneratedProfile(room, payload.localProfile, payload.event);
      socketToSessionInfo.set(socket, {
        sessionId: payload.sessionId,
        localProfile: assignedProfile,
      });
      room.snapshot = reduceSessionEvent(room.snapshot, payload.event, assignedProfile, Date.now());
      broadcast(payload.sessionId);
      return;
    }

    if (payload.type === "ping") {
      send(socket, {
        type: "pong",
        sentAt: payload.sentAt,
        serverNow: Date.now(),
      });
      return;
    }

    send(socket, {
      type: "error",
      message: "Unknown sync message type.",
      serverNow: Date.now(),
    });
  });

  socket.on("close", () => {
    const sessionInfo = socketToSessionInfo.get(socket);

    if (!sessionInfo) {
      return;
    }

    const room = rooms.get(sessionInfo.sessionId);
    room?.clients.delete(socket);

    if (room && room.clients.size === 0) {
      rooms.delete(sessionInfo.sessionId);
    } else if (room) {
      const nextSnapshot = reduceSessionEvent(room.snapshot, { type: "leave_session" }, sessionInfo.localProfile, Date.now());

      if (nextSnapshot !== room.snapshot) {
        room.snapshot = nextSnapshot;
        broadcast(sessionInfo.sessionId);
      }
    }

    socketToSessionInfo.delete(socket);
  });
});

setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    const nextSnapshot = advanceSessionTime(room.snapshot, Date.now());

    if (nextSnapshot !== room.snapshot) {
      room.snapshot = nextSnapshot;
      broadcast(roomId);
    }
  }
}, 100);

httpServer.listen(port, "0.0.0.0", () => {
  console.log("Discord OAuth config at startup.", {
    build_id: buildId,
    ...getDiscordOAuthConfigSummary(),
  });
  console.log(`DabSync sync server listening on port ${port}`);
});
