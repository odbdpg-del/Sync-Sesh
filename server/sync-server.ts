import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { advanceSessionTime, createSessionSnapshot, reduceSessionEvent } from "../src/lib/lobby/sessionState";
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
const rooms = new Map<string, SessionRoom>();
const socketToSessionInfo = new Map<import("ws").WebSocket, SocketSessionInfo>();

loadEnvFile(".env");
loadEnvFile(".env.local");

const discordClientId = process.env.DISCORD_CLIENT_ID ?? process.env.VITE_DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
const discordRedirectUri = process.env.DISCORD_REDIRECT_URI ?? process.env.VITE_DISCORD_REDIRECT_URI ?? "https://127.0.0.1";

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
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
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
  if (!discordClientId || !discordClientSecret) {
    sendJson(response, 500, {
      error: "Discord OAuth is not configured on the sync server.",
    });
    return;
  }

  let body: Record<string, unknown>;

  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, {
      error: "Invalid JSON payload.",
    });
    return;
  }

  const code = typeof body.code === "string" ? body.code : undefined;

  if (!code) {
    sendJson(response, 400, {
      error: "Missing Discord authorization code.",
    });
    return;
  }

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
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
  });

  const payload = (await tokenResponse.json().catch(() => null)) as Record<string, unknown> | null;

  if (!tokenResponse.ok || typeof payload?.access_token !== "string") {
    sendJson(response, 502, {
      error:
        typeof payload?.error_description === "string"
          ? payload.error_description
          : typeof payload?.error === "string"
            ? payload.error
            : "Discord token exchange failed.",
    });
    return;
  }

  sendJson(response, 200, {
    access_token: payload.access_token,
    expires_in: payload.expires_in,
    scope: payload.scope,
    token_type: payload.token_type,
  });
}

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "sync-sesh-sync" }));
    return;
  }

  if (request.method === "POST" && request.url === "/api/discord/token") {
    void handleDiscordTokenExchange(request, response);
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
      socketToSessionInfo.set(socket, {
        sessionId: payload.sessionId,
        localProfile: payload.localProfile,
      });
      room.snapshot = reduceSessionEvent(room.snapshot, payload.event, payload.localProfile, Date.now());
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
  console.log(`DabSync sync server listening on port ${port}`);
});
