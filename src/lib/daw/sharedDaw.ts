import { SHARED_DAW_LOOP_LENGTH_BARS, SHARED_DAW_TRACK_IDS } from "../../types/session";
import type { SharedDawClipPublishPayload, SharedDawTrackId } from "../../types/session";

export function isSharedDawTrackId(trackId: string): trackId is SharedDawTrackId {
  return SHARED_DAW_TRACK_IDS.includes(trackId as SharedDawTrackId);
}

export function getAllowedSharedDawLoopLengthBars(lengthBars: number): SharedDawClipPublishPayload["lengthBars"] | null {
  return SHARED_DAW_LOOP_LENGTH_BARS.includes(lengthBars as SharedDawClipPublishPayload["lengthBars"])
    ? lengthBars as SharedDawClipPublishPayload["lengthBars"]
    : null;
}

export function getSharedDawClipSlotId(trackId: SharedDawTrackId, sceneIndex: number) {
  return `${trackId}-scene-${sceneIndex + 1}`;
}
