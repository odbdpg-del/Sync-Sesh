import type { DabSyncState, LocalProfile, SessionEvent, SessionSnapshot, SyncStatus } from "../../types/session";
import { attachLocalProfile, createSessionSnapshot } from "../lobby/sessionState";
import type { SyncClient } from "./types";

interface WebSocketSyncClientOptions {
  localProfile: LocalProfile;
  serverUrl: string;
  sessionId: string;
}

type ServerMessage =
  | { type: "snapshot"; snapshot: SessionSnapshot; serverNow: number }
  | { type: "pong"; sentAt: number; serverNow: number }
  | { type: "error"; message: string; serverNow: number };

function isSocketOpen(socket?: WebSocket) {
  return socket?.readyState === WebSocket.OPEN;
}

function mergeState(snapshot: SessionSnapshot, localProfile: LocalProfile, syncStatus: SyncStatus): DabSyncState {
  return attachLocalProfile(snapshot, localProfile, {
    syncStatus,
  });
}

export class WebSocketSyncClient implements SyncClient {
  private readonly listeners = new Set<(state: DabSyncState) => void>();
  private localProfile: LocalProfile;
  private readonly serverUrl: string;
  private readonly sessionId: string;
  private snapshot: SessionSnapshot = createSessionSnapshot();
  private syncStatus: SyncStatus = {
    mode: "ws",
    connection: "offline",
    warning: "Waiting for sync connection",
  };
  private socket?: WebSocket;
  private pingIntervalId?: number;

  constructor({ localProfile, serverUrl, sessionId }: WebSocketSyncClientOptions) {
    this.localProfile = localProfile;
    this.serverUrl = serverUrl;
    this.sessionId = sessionId;
  }

  async connect() {
    this.syncStatus = {
      ...this.syncStatus,
      connection: "connecting",
      warning: "Connecting to sync server",
    };
    this.emit();

    await new Promise<void>((resolve) => {
      this.socket = new WebSocket(this.serverUrl);
      const socket = this.socket;
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const timeoutId = window.setTimeout(() => {
        this.syncStatus = {
          ...this.syncStatus,
          connection: "error",
          warning: "Sync server timed out while connecting.",
        };
        this.emit();
        this.socket?.close();
        finish();
      }, 5000);

      socket.addEventListener("open", () => {
        window.clearTimeout(timeoutId);
        this.syncStatus = {
          ...this.syncStatus,
          connection: "connected",
          warning: undefined,
        };

        if (isSocketOpen(socket)) {
          socket.send(
            JSON.stringify({
              type: "hello",
              sessionId: this.sessionId,
              localProfile: this.localProfile,
            }),
          );
        }

        this.pingIntervalId = window.setInterval(() => {
          const sentAt = Date.now();
          if (isSocketOpen(socket)) {
            socket.send(JSON.stringify({ type: "ping", sentAt }));
          }
        }, 5000);

        this.emit();
        finish();
      });

      socket.addEventListener("message", (message) => {
        let payload: ServerMessage;

        try {
          payload = JSON.parse(message.data as string) as ServerMessage;
        } catch {
          this.syncStatus = {
            ...this.syncStatus,
            connection: "error",
            warning: "Received invalid sync data from server.",
          };
          this.emit();
          return;
        }

        if (payload.type === "snapshot") {
          this.snapshot = payload.snapshot;
          this.syncStatus = {
            ...this.syncStatus,
            connection: "connected",
            serverTimeOffsetMs: payload.serverNow - Date.now(),
            lastEventAt: new Date().toISOString(),
            warning: undefined,
          };
          this.emit();
        }

        if (payload.type === "pong") {
          const now = Date.now();
          const latencyMs = now - payload.sentAt;
          const estimatedServerNow = payload.serverNow + latencyMs / 2;
          this.syncStatus = {
            ...this.syncStatus,
            latencyMs,
            serverTimeOffsetMs: estimatedServerNow - now,
            warning: latencyMs > 500 ? "High sync latency detected" : undefined,
          };
          this.emit();
        }

        if (payload.type === "error") {
          this.syncStatus = {
            ...this.syncStatus,
            connection: "error",
            warning: payload.message,
            serverTimeOffsetMs: payload.serverNow - Date.now(),
          };
          this.emit();
        }
      });

      socket.addEventListener("error", () => {
        window.clearTimeout(timeoutId);
        this.syncStatus = {
          ...this.syncStatus,
          connection: "error",
          warning: "Unable to reach the sync server.",
        };
        this.emit();
        finish();
      });

      socket.addEventListener("close", () => {
        window.clearTimeout(timeoutId);
        if (this.pingIntervalId !== undefined) {
          window.clearInterval(this.pingIntervalId);
        }

        this.syncStatus = {
          ...this.syncStatus,
          connection: this.syncStatus.connection === "error" ? "error" : "offline",
          warning:
            this.syncStatus.connection === "error"
              ? this.syncStatus.warning
              : "Sync disconnected. Reconnect the server to restore alignment.",
        };
        this.emit();
        finish();
      });
    });
  }

  disconnect() {
    if (this.pingIntervalId !== undefined) {
      window.clearInterval(this.pingIntervalId);
    }

    this.socket?.close();
  }

  getSnapshot() {
    return mergeState(this.snapshot, this.localProfile, this.syncStatus);
  }

  setLocalProfile(localProfile: LocalProfile) {
    this.localProfile = localProfile;
    this.emit();
  }

  send(event: SessionEvent) {
    const socket = this.socket;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      this.syncStatus = {
        ...this.syncStatus,
        warning: "Action blocked while sync is disconnected.",
      };
      this.emit();
      return;
    }

    socket.send(
      JSON.stringify({
        type: "event",
        sessionId: this.sessionId,
        event,
        localProfile: this.localProfile,
      }),
    );
  }

  subscribe(listener: (state: DabSyncState) => void) {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const state = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
