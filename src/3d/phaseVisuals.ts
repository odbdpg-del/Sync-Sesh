import type { SessionPhase } from "../types/session";

export interface PhaseVisuals {
  background: string;
  floor: string;
  wall: string;
  gridPrimary: string;
  gridSecondary: string;
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  timerAccent: string;
  timerBackground: string;
  timerGlow: string;
  timerGlowIntensity: number;
  monitorGlow: string;
  pulseSpeed: number;
  pulseAmount: number;
  showCompletionBurst: boolean;
}

export function getPhaseVisuals(phase: SessionPhase, isUrgent: boolean): PhaseVisuals {
  switch (phase) {
    case "idle":
      return {
        background: "#03060c",
        floor: "#0d1728",
        wall: "#101b30",
        gridPrimary: "#3d6f94",
        gridSecondary: "#20334f",
        ambientColor: "#7fa7ff",
        ambientIntensity: 0.28,
        directionalColor: "#dce8ff",
        directionalIntensity: 0.82,
        timerAccent: "#8fb3d9",
        timerBackground: "#04101a",
        timerGlow: "#21425c",
        timerGlowIntensity: 0.7,
        monitorGlow: "#071b24",
        pulseSpeed: 0,
        pulseAmount: 0,
        showCompletionBurst: false,
      };
    case "armed":
      return {
        background: "#08080f",
        floor: "#171827",
        wall: "#201a32",
        gridPrimary: "#ffcf5a",
        gridSecondary: "#44391d",
        ambientColor: "#b989ff",
        ambientIntensity: 0.26,
        directionalColor: "#ffe6a1",
        directionalIntensity: 1,
        timerAccent: "#ffcf5a",
        timerBackground: "#120d08",
        timerGlow: "#ffcf5a",
        timerGlowIntensity: 1.45,
        monitorGlow: "#5a3708",
        pulseSpeed: 2.4,
        pulseAmount: 0.24,
        showCompletionBurst: false,
      };
    case "precount":
      return {
        background: "#090711",
        floor: "#111527",
        wall: "#18162e",
        gridPrimary: "#ff8a5b",
        gridSecondary: "#4a2a28",
        ambientColor: "#6d78b4",
        ambientIntensity: 0.2,
        directionalColor: "#ffd0b6",
        directionalIntensity: 0.82,
        timerAccent: "#ff8a5b",
        timerBackground: "#160908",
        timerGlow: "#ff8a5b",
        timerGlowIntensity: 1.95,
        monitorGlow: "#5a1f0c",
        pulseSpeed: 4.2,
        pulseAmount: 0.32,
        showCompletionBurst: false,
      };
    case "countdown": {
      const accent = isUrgent ? "#ff3f55" : "#ff5f7a";

      return {
        background: "#0b0507",
        floor: "#181018",
        wall: "#241422",
        gridPrimary: accent,
        gridSecondary: "#4a1826",
        ambientColor: "#ff6f91",
        ambientIntensity: isUrgent ? 0.3 : 0.24,
        directionalColor: "#ffc2cc",
        directionalIntensity: isUrgent ? 1.05 : 0.92,
        timerAccent: accent,
        timerBackground: "#170609",
        timerGlow: accent,
        timerGlowIntensity: isUrgent ? 2.2 : 1.75,
        monitorGlow: "#641525",
        pulseSpeed: isUrgent ? 6.2 : 5,
        pulseAmount: isUrgent ? 0.42 : 0.3,
        showCompletionBurst: false,
      };
    }
    case "completed":
      return {
        background: "#04100b",
        floor: "#0f1c18",
        wall: "#123025",
        gridPrimary: "#6eff9a",
        gridSecondary: "#244834",
        ambientColor: "#99ffc3",
        ambientIntensity: 0.36,
        directionalColor: "#d8ffe8",
        directionalIntensity: 1.05,
        timerAccent: "#6eff9a",
        timerBackground: "#04150d",
        timerGlow: "#6eff9a",
        timerGlowIntensity: 1.7,
        monitorGlow: "#1e6a3f",
        pulseSpeed: 1.6,
        pulseAmount: 0.18,
        showCompletionBurst: false,
      };
    case "lobby":
    default:
      return {
        background: "#030914",
        floor: "#0d1728",
        wall: "#10203a",
        gridPrimary: "#57f3ff",
        gridSecondary: "#243b5f",
        ambientColor: "#7fa7ff",
        ambientIntensity: 0.34,
        directionalColor: "#f4f7ff",
        directionalIntensity: 1,
        timerAccent: "#57f3ff",
        timerBackground: "#04101a",
        timerGlow: "#57f3ff",
        timerGlowIntensity: 0.95,
        monitorGlow: "#0a2b38",
        pulseSpeed: 0,
        pulseAmount: 0,
        showCompletionBurst: false,
      };
  }
}
