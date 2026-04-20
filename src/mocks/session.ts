import type { DabSyncState, LocalProfile } from "../types/session";
import { attachLocalProfile, createSessionSnapshot } from "../lib/lobby/sessionState";

export function createMockSessionState(localProfile: LocalProfile): DabSyncState {
  return attachLocalProfile(createSessionSnapshot(), localProfile, {
    syncStatus: {
      mode: "mock",
      connection: "connecting",
    },
  });
}
