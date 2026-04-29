import type { DabSyncState, LocalProfile, SessionEvent, SessionSnapshot, SyncStatus } from "../../types/session";
import { attachLocalProfile, createSessionSnapshot, normalizeSessionSnapshot } from "../lobby/sessionState";
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
    startupMilestone: "idle",
    warning: "Waiting for sync connection",
  };
  private socket?: WebSocket;
  private pingIntervalId?: number;
  private reconnectTimeoutId?: number;
  private reconnectAttempt = 0;
  private destroyed = false;
  private shouldRestoreJoinedSession = false;

  constructor({ localProfile, serverUrl, sessionId }: WebSocketSyncClientOptions) {
    this.localProfile = localProfile;
    this.serverUrl = serverUrl;
    this.sessionId = sessionId;
  }

  async connect() {
    this.destroyed = false;
    this.clearReconnectTimeout();
    this.syncStatus = {
      ...this.syncStatus,
      connection: "connecting",
      startupMilestone: "opening_socket",
      debugDetail: `Opening ${this.serverUrl} for session ${this.sessionId}.`,
      warning: this.reconnectAttempt > 0 ? "Reconnecting to sync server" : "Connecting to sync server",
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
          startupMilestone: "error",
          debugDetail: `Timed out after 15000ms while opening ${this.serverUrl}.`,
          warning: "Sync server is still waking up. Retrying shortly.",
        };
        this.emit();
        this.socket?.close();
        finish();
      }, 15000);

      socket.addEventListener("open", () => {
        window.clearTimeout(timeoutId);
        this.reconnectAttempt = 0;
        this.syncStatus = {
          ...this.syncStatus,
          connection: "connected",
          startupMilestone: "socket_open",
          debugDetail: `Opened ${this.serverUrl}.`,
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

          if (this.shouldRestoreJoinedSession) {
            socket.send(
              JSON.stringify({
                type: "event",
                sessionId: this.sessionId,
                event: { type: "join_session" },
                localProfile: this.localProfile,
              }),
            );
          }
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
            startupMilestone: "error",
            debugDetail: `Received invalid sync data from ${this.serverUrl}.`,
            warning: "Received invalid sync data from server.",
          };
          this.emit();
          return;
        }

        if (payload.type === "snapshot") {
          this.snapshot = normalizeSessionSnapshot(payload.snapshot);
          this.shouldRestoreJoinedSession = this.snapshot.users.some((user) => user.id === this.localProfile.id);
          this.syncStatus = {
            ...this.syncStatus,
            connection: "connected",
            startupMilestone: "snapshot_received",
            debugDetail: `Received snapshot from ${this.serverUrl}.`,
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
            debugDetail: `Received pong from ${this.serverUrl}.`,
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
            startupMilestone: "error",
            debugDetail: `Server error from ${this.serverUrl}: ${payload.message}`,
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
          startupMilestone: "error",
          debugDetail: `WebSocket error while opening ${this.serverUrl}.`,
          warning: "Unable to reach the sync server. Retrying...",
        };
        this.emit();
        finish();
      });

      socket.addEventListener("close", (event) => {
        window.clearTimeout(timeoutId);
        if (this.pingIntervalId !== undefined) {
          window.clearInterval(this.pingIntervalId);
        }
        this.shouldRestoreJoinedSession = this.snapshot.users.some((user) => user.id === this.localProfile.id);

        this.syncStatus = {
          ...this.syncStatus,
          connection: this.syncStatus.connection === "error" ? "error" : "offline",
          startupMilestone: this.syncStatus.connection === "error" ? "error" : "idle",
          debugDetail: `WebSocket closed code=${event.code} reason=${event.reason || "n/a"} clean=${event.wasClean} url=${this.serverUrl}.`,
          warning:
            this.syncStatus.connection === "error"
              ? this.syncStatus.warning
              : "Sync disconnected. Retrying...",
        };
        this.emit();
        this.scheduleReconnect();
        finish();
      });
    });
  }

  disconnect() {
    this.destroyed = true;
    this.shouldRestoreJoinedSession = false;
    if (this.pingIntervalId !== undefined) {
      window.clearInterval(this.pingIntervalId);
    }

    this.clearReconnectTimeout();
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

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimeoutId !== undefined) {
      return;
    }

    this.reconnectAttempt += 1;
    const delayMs = Math.min(2000 * this.reconnectAttempt, 10000);
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectTimeoutId = undefined;
      void this.connect();
    }, delayMs);
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeoutId !== undefined) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
  }
}
