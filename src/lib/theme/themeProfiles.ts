export type ThemeSelection = "default" | "green" | "blue";
export type SurfaceTheme = "green" | "blue";

export interface ResolvedThemeProfile {
  selection: ThemeSelection;
  console: SurfaceTheme;
  dashboard: SurfaceTheme;
}

const THEME_PROFILES: Record<ThemeSelection, Omit<ResolvedThemeProfile, "selection">> = {
  default: {
    console: "green",
    dashboard: "blue",
  },
  green: {
    console: "green",
    dashboard: "green",
  },
  blue: {
    console: "blue",
    dashboard: "blue",
  },
};

export function resolveThemeProfile(selection: ThemeSelection): ResolvedThemeProfile {
  return {
    selection,
    ...THEME_PROFILES[selection],
  };
}

