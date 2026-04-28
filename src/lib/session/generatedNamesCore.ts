export const FALLBACK_GENERATED_PROFILE_NAMES = [
  "Far Ding",
  "Rabbi Topp",
  "Jenny Tayla",
  "Pat Myaz",
  "B.B. Al",
  "Wyatt Boy",
  "Ezra Fancy",
  "Juan Guylani",
  "A-RAB$",
  "Neph Ketterman",
  "Neph Slitherman",
  "Neph Fetty-White-man",
  "legendary",
  "Paula Jeiss",
  "Ruby Balls",
  "Chaun Marron",
  "Bohzahn Liit",
  "The James Earl Jonas Brothers",
  "D. Coy Pickle",
  "BIGMONTING",
  "V.P. Anne",
  "titan paul",
  "Sadie Enward",
  "Sayde Enwerd",
  "Juan Moore",
] as const;

const BLOCKED_AUTO_ASSIGNMENT_PATTERNS = [
  /homo\s*sexual/i,
  /knighga/i,
] as const;

export function normalizeGeneratedProfileNames(names: Iterable<string>) {
  return Array.from(names)
    .map((name) => name.trim())
    .filter((name) => (
      name.length > 0 &&
      !BLOCKED_AUTO_ASSIGNMENT_PATTERNS.some((pattern) => pattern.test(name))
    ));
}

export function parseGeneratedProfileNames(rawNames: string) {
  return normalizeGeneratedProfileNames(
    rawNames
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("#")),
  );
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getAvatarSeedFromName(name: string) {
  return name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
}

export function getRandomGeneratedProfileName(namePool: readonly string[]) {
  return namePool[Math.floor(Math.random() * namePool.length)] ?? "Far Ding";
}

export function getGeneratedProfileNameForUser(
  userId: string,
  takenNames: readonly string[] = [],
  namePool: readonly string[] = FALLBACK_GENERATED_PROFILE_NAMES,
) {
  const takenNameSet = new Set(takenNames.map((name) => name.trim().toLowerCase()));
  const availableNames = namePool.length > 0 ? namePool : FALLBACK_GENERATED_PROFILE_NAMES;
  const startIndex = hashString(userId) % availableNames.length;

  for (let offset = 0; offset < availableNames.length; offset += 1) {
    const candidate = availableNames[(startIndex + offset) % availableNames.length];

    if (!takenNameSet.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `DJ ${hashString(userId).toString(36).slice(0, 4).toUpperCase()}`;
}

export function getRolledGeneratedProfileNameForUser(
  userId: string,
  takenNames: readonly string[] = [],
  previousName = "",
  rollKey = String(Date.now()),
  namePool: readonly string[] = FALLBACK_GENERATED_PROFILE_NAMES,
) {
  return getGeneratedProfileNameForUser(
    `${userId}:${previousName}:${rollKey}`,
    previousName ? [...takenNames, previousName] : takenNames,
    namePool,
  );
}
