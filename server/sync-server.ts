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

const port = Number(process.env.PORT ?? 8787);
const rooms = new Map<string, SessionRoom>();
const socketToRoomId = new Map<import("ws").WebSocket, string>();

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

const server = new WebSocketServer({ port });

server.on("connection", (socket) => {
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

console.log(`DabSync sync server listening on ws://localhost:${port}`);
