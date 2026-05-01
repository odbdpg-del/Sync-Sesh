import type { DabSyncState, LocalProfile, SessionEvent, TextVoiceEvent, TextVoiceReplayEvent } from "../../types/session";

export interface SyncClient {
  connect: () => Promise<void>;
  disconnect: () => void;
  getSnapshot: () => DabSyncState;
  setLocalProfile: (localProfile: LocalProfile) => void;
  send: (event: SessionEvent) => void;
  sendTextVoice: (text: string) => void;
  sendTextVoiceReplay: (textVoiceEventId: string) => void;
  subscribe: (listener: (state: DabSyncState) => void) => () => void;
  subscribeTextVoice: (listener: (event: TextVoiceEvent) => void) => () => void;
  subscribeTextVoiceReplay: (listener: (event: TextVoiceReplayEvent) => void) => () => void;
}
