import type { LocalProfile } from "../../types/session";

const STORAGE_KEY = "dabsync.local-profile";
const NAME_POOL = ["LaserFox", "PixelComet", "TurboMint", "ArcShift", "NovaLatch", "EchoBloom"];

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function randomName() {
  return NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
}

function avatarSeedFromName(name: string) {
  return name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
}

export function buildAvatarSeed(name: string) {
  return avatarSeedFromName(name);
}

export function persistLocalProfile(localProfile: LocalProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localProfile));
}

export function getLocalProfile(): LocalProfile {
  if (typeof window === "undefined") {
    return {
      id: `user-${randomId()}`,
      displayName: randomName(),
      avatarSeed: "LX",
    };
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);

  if (existing) {
    return JSON.parse(existing) as LocalProfile;
  }

  const displayName = randomName();
  const localProfile: LocalProfile = {
    id: `user-${randomId()}`,
    displayName,
    avatarSeed: avatarSeedFromName(displayName),
  };

  persistLocalProfile(localProfile);
  return localProfile;
}
