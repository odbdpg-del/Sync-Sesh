import type { DabSyncState, LocalProfile, SessionSnapshot, SyncStatus, SessionEvent, TextVoiceEvent, TextVoiceReplayEvent } from "../../types/session";
import { advanceSessionTime, attachLocalProfile, reduceSessionEvent } from "../lobby/sessionState";
import { createMockSessionState } from "../../mocks/session";
import type { SyncClient } from "./types";

function mergeState(snapshot: SessionSnapshot, localProfile: LocalProfile, syncStatus: SyncStatus): DabSyncState {
  return attachLocalProfile(snapshot, localProfile, {
    syncStatus,
  });
}

export class MockSyncClient implements SyncClient {
  private readonly listeners = new Set<(state: DabSyncState) => void>();
  private readonly textVoiceListeners = new Set<(event: TextVoiceEvent) => void>();
  private readonly textVoiceReplayListeners = new Set<(event: TextVoiceReplayEvent) => void>();
  private localProfile: LocalProfile;
  private snapshot: SessionSnapshot;
  private syncStatus: SyncStatus;
  private intervalId?: number;

  constructor(localProfile: LocalProfile) {
    const initialState = createMockSessionState(localProfile);
    this.localProfile = localProfile;
    this.snapshot = {
      session: initialState.session,
      users: initialState.users,
      timerConfig: initialState.timerConfig,
      countdown: initialState.countdown,
      rangeScoreboard: initialState.rangeScoreboard,
      freeRoamPresence: initialState.freeRoamPresence,
      dawTransport: initialState.dawTransport,
      dawClips: initialState.dawClips,
      dawLiveSound: initialState.dawLiveSound,
      studioGuitar: initialState.studioGuitar,
    };
    this.syncStatus = initialState.syncStatus;
  }

  async connect() {
    this.syncStatus = {
      ...this.syncStatus,
      connection: "connected",
      startupMilestone: "snapshot_received",
      latencyMs: 0,
      serverTimeOffsetMs: 0,
      lastEventAt: new Date().toISOString(),
    };

    this.intervalId = window.setInterval(() => {
      const nextSnapshot = advanceSessionTime(this.snapshot);

      if (nextSnapshot !== this.snapshot) {
        this.snapshot = nextSnapshot;
        this.emit();
      }
    }, 100);

    this.emit();
  }

  disconnect() {
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
    }

    this.syncStatus = {
      ...this.syncStatus,
      connection: "offline",
      startupMilestone: "idle",
    };

    this.emit();
  }

  getSnapshot() {
    return mergeState(this.snapshot, this.localProfile, this.syncStatus);
  }

  setLocalProfile(localProfile: LocalProfile) {
    this.localProfile = localProfile;
    this.emit();
  }

  send(event: SessionEvent) {
    this.snapshot = reduceSessionEvent(this.snapshot, event, this.localProfile);
    this.syncStatus = {
      ...this.syncStatus,
      lastEventAt: new Date().toISOString(),
    };
    this.emit();
  }

  sendTextVoice(text: string) {
    const event: TextVoiceEvent = {
      id: `mock-text-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: this.localProfile.id,
      senderName: this.localProfile.displayName,
      text,
      createdAt: new Date().toISOString(),
    };

    for (const listener of this.textVoiceListeners) {
      listener(event);
    }
  }

  sendTextVoiceReplay(textVoiceEventId: string) {
    const event: TextVoiceReplayEvent = {
      id: `mock-text-voice-replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      textVoiceEventId,
      replayerId: this.localProfile.id,
      replayerName: this.localProfile.displayName,
      createdAt: new Date().toISOString(),
    };

    for (const listener of this.textVoiceReplayListeners) {
      listener(event);
    }
  }

  subscribe(listener: (state: DabSyncState) => void) {
    this.listeners.add(listener);
    listener(this.getSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeTextVoice(listener: (event: TextVoiceEvent) => void) {
    this.textVoiceListeners.add(listener);

    return () => {
      this.textVoiceListeners.delete(listener);
    };
  }

  subscribeTextVoiceReplay(listener: (event: TextVoiceReplayEvent) => void) {
    this.textVoiceReplayListeners.add(listener);

    return () => {
      this.textVoiceReplayListeners.delete(listener);
    };
  }

  private emit() {
    const state = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
