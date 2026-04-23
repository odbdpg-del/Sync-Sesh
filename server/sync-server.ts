import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

const port = Number(process.env.PORT ?? 8787);
const serverDirname = dirname(fileURLToPath(import.meta.url));
const generatedNamesPath = resolve(serverDirname, "../src/data/generatedNames.txt");
const rooms = new Map<string, SessionRoom>();
const socketToRoomId = new Map<import("ws").WebSocket, string>();

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

function assignGeneratedProfile(room: SessionRoom, localProfile: LocalProfile, event?: SessionEvent): LocalProfile {
  const existingUser = room.snapshot.users.find((user) => user.id === localProfile.id);

  if (event?.type === "select_display_name") {
    return selectGeneratedProfile(room, localProfile, event.displayName) ?? getExistingProfile(localProfile, existingUser);
  }

  if (existingUser && event?.type !== "roll_display_name") {
    return getExistingProfile(localProfile, existingUser);
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

const httpServer = createServer((request, response) => {
  const pathname = request.url ? new URL(request.url, "http://localhost").pathname : "/";

  if (pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "sync-sesh-sync" }));
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
      socketToRoomId.set(socket, payload.sessionId);
      send(socket, {
        type: "snapshot",
        snapshot: room.snapshot,
        serverNow: Date.now(),
      });
      return;
    }

    if (payload.type === "event") {
      const room = getRoom(payload.sessionId);
      const assignedProfile = assignGeneratedProfile(
        room,
        payload.localProfile,
        payload.event,
      );
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
    const roomId = socketToRoomId.get(socket);

    if (!roomId) {
      return;
    }

    const room = rooms.get(roomId);
    room?.clients.delete(socket);

    if (room && room.clients.size === 0) {
      rooms.delete(roomId);
    }

    socketToRoomId.delete(socket);
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
