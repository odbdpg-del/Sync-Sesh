import assert from "node:assert/strict";
import test from "node:test";
import { resolveThemeProfile, type ResolvedThemeProfile, type ThemeSelection } from "../src/lib/theme/themeProfiles";

const EXPECTED_THEME_PROFILES: Record<ThemeSelection, ResolvedThemeProfile> = {
  default: {
    selection: "default",
    console: "green",
    dashboard: "blue",
  },
  green: {
    selection: "green",
    console: "green",
    dashboard: "green",
  },
  blue: {
    selection: "blue",
    console: "blue",
    dashboard: "blue",
  },
};

test("resolveThemeProfile maps default to green console and blue dashboard", () => {
  assert.deepEqual(resolveThemeProfile("default"), EXPECTED_THEME_PROFILES.default);
});

test("resolveThemeProfile maps named themes to matching console and dashboard surfaces", () => {
  assert.deepEqual(resolveThemeProfile("green"), EXPECTED_THEME_PROFILES.green);
  assert.deepEqual(resolveThemeProfile("blue"), EXPECTED_THEME_PROFILES.blue);
});
