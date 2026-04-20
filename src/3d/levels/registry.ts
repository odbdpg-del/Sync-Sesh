import { level1Config } from "./level1";
import type { LevelConfig } from "./types";

export const DEFAULT_LEVEL_ID = level1Config.id;

const LEVEL_REGISTRY = {
  [level1Config.id]: level1Config,
} satisfies Record<string, LevelConfig>;

export function getLevelConfig(levelId: string = DEFAULT_LEVEL_ID): LevelConfig {
  return LEVEL_REGISTRY[levelId] ?? LEVEL_REGISTRY[DEFAULT_LEVEL_ID];
}

export function getAvailableLevels(): LevelConfig[] {
  return Object.values(LEVEL_REGISTRY);
}
