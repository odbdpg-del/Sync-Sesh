import type { DabSyncState, LocalProfile, SessionEvent } from "../../types/session";

export interface SyncClient {
  connect: () => Promise<void>;
  disconnect: () => void;
  getSnapshot: () => DabSyncState;
  setLocalProfile: (localProfile: LocalProfile) => void;
  send: (event: SessionEvent) => void;
  subscribe: (listener: (state: DabSyncState) => void) => () => void;
}
