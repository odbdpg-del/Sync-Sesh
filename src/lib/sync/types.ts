import type { DabSyncState, LocalProfile, SessionEvent, TextVoiceEvent } from "../../types/session";

export interface SyncClient {
  connect: () => Promise<void>;
  disconnect: () => void;
  getSnapshot: () => DabSyncState;
  setLocalProfile: (localProfile: LocalProfile) => void;
  send: (event: SessionEvent) => void;
  sendTextVoice: (text: string) => void;
  subscribe: (listener: (state: DabSyncState) => void) => () => void;
  subscribeTextVoice: (listener: (event: TextVoiceEvent) => void) => () => void;
}
