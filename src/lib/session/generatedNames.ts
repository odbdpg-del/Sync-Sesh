import rawGeneratedProfileNames from "../../data/generatedNames.txt?raw";
import {
  FALLBACK_GENERATED_PROFILE_NAMES,
  getAvatarSeedFromName,
  getGeneratedProfileNameForUser,
  getRandomGeneratedProfileName as getRandomGeneratedProfileNameFromPool,
  getRolledGeneratedProfileNameForUser,
  normalizeGeneratedProfileNames,
  parseGeneratedProfileNames,
} from "./generatedNamesCore";

export {
  getAvatarSeedFromName,
  getGeneratedProfileNameForUser,
  getRolledGeneratedProfileNameForUser,
  normalizeGeneratedProfileNames,
  parseGeneratedProfileNames,
};

export const GENERATED_PROFILE_NAMES = parseGeneratedProfileNames(rawGeneratedProfileNames);

export function getRandomGeneratedProfileName() {
  return getRandomGeneratedProfileNameFromPool(
    GENERATED_PROFILE_NAMES.length > 0 ? GENERATED_PROFILE_NAMES : FALLBACK_GENERATED_PROFILE_NAMES,
  );
}
