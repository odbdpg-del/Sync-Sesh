import type { LocalProfile } from "../../types/session";
import { getAvatarSeedFromName, getRandomGeneratedProfileName } from "./generatedNames";

const STORAGE_KEY = "dabsync.local-profile";
const LEGACY_NAME_POOL = new Set(["LaserFox", "PixelComet", "TurboMint", "ArcShift", "NovaLatch", "EchoBloom"]);

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function randomName() {
  return getRandomGeneratedProfileName();
}

export function buildAvatarSeed(name: string) {
  return getAvatarSeedFromName(name);
}

export function persistLocalProfile(localProfile: LocalProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localProfile));
}

export function getLocalProfile(): LocalProfile {
  if (typeof window === "undefined") {
    const displayName = randomName();

    return {
      id: `user-${randomId()}`,
      displayName,
      avatarSeed: getAvatarSeedFromName(displayName),
    };
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);

  if (existing) {
    const parsed = JSON.parse(existing) as LocalProfile;

    if (!LEGACY_NAME_POOL.has(parsed.displayName)) {
      return parsed;
    }

    const displayName = randomName();
    const refreshedProfile = {
      ...parsed,
      displayName,
      avatarSeed: getAvatarSeedFromName(displayName),
    };

    persistLocalProfile(refreshedProfile);
    return refreshedProfile;
  }

  const displayName = randomName();
  const localProfile: LocalProfile = {
    id: `user-${randomId()}`,
    displayName,
    avatarSeed: getAvatarSeedFromName(displayName),
  };

  persistLocalProfile(localProfile);
  return localProfile;
}
