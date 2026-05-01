import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ElementRef, MutableRefObject } from "react";
import { Level1RoomShell } from "./Level1RoomShell";
import { ThreeDModeErrorBoundary } from "./ThreeDModeErrorBoundary";
import { AimInteractionController, InteractionProvider, InteractionReticle, useInteractionRegistry } from "./interactions";
import type { InteractionPerformanceSample } from "./interactions";
import { DEFAULT_LEVEL_ID, getLevelConfig } from "./levels";
import type { LevelConfig, LevelExitConfig } from "./levels";
import { useLocalDawAudioEngine } from "./useLocalDawAudioEngine";
import type { LocalDawAudioEngineActions, LocalDawAudioEngineState, LocalDawFmSynthNote, LocalDawFmSynthPatch } from "./useLocalDawAudioEngine";
import { useLocalDawState } from "./useLocalDawState";
import type { DawTrackId, LocalDawActions, LocalDawMidiNoteEvent, LocalDawState } from "./useLocalDawState";
import type { SoundCloudBoothState } from "./soundCloudBooth";
import type {
  CountdownDisplayState,
  FreeRoamPresenceState,
  FreeRoamPresenceUpdate,
  RangeScoreResult,
  RangeScoreSubmission,
  SessionUser,
  SharedDawClipPublishPayload,
  SharedDawClipsState,
  SharedDawLiveSoundEvent,
  SharedDawLiveSoundPayload,
  SharedDawTransport,
  SharedDawTrackId,
  SharedStudioGuitarState,
  SyncStatus,
} from "../types/session";
import type { JukeboxActions, JukeboxDisplayState } from "../hooks/useSoundCloudPlayer";
import { PlayerAvatar } from "./PlayerAvatar";
import type { PlayerAvatarAppearance, PlayerAvatarIdentity, PlayerAvatarSuitPreset } from "./PlayerAvatar";

type RevealState = "revealing" | "complete" | "returning";
type ThreeDStatus = "checking" | "loading" | "ready" | "unsupported" | "error";
type ControlState = "idle" | "focused" | "pointer-locked" | "pointer-lock-unavailable";
type MovementKey = "KeyW" | "KeyA" | "KeyS" | "KeyD";
type TopDownPanKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
type Vec3 = [number, number, number];
type LookState = { yaw: number; pitch: number };
type LocalPlayerPose = { position: Vec3; yaw: number };
type LocalStationSource = "joined" | "temporary" | "emergency";
type HorizontalVector = { x: number; z: number };
type CollisionResolutionKind = "none" | "slide-x" | "slide-z" | "blocked";
type SlideState = { isSliding: boolean; startedAtMs: number; direction: HorizontalVector };
type AreaFeedbackState = { id: string; label: string; key: number };
type HeldStudioInstrument = "guitar" | null;
type StudioGuitarInputSource = "click" | "keyboard";
type StudioGuitarAudioReadiness = { label: "AUDIBLE" | "SILENT"; reason: string };
type TransitionArrivalOverride = {
  levelId: string;
  spawnPosition?: Vec3;
  cameraTarget?: Vec3;
};
type StudioGuitarFeedbackState = {
  noteIndex: number;
  source: StudioGuitarInputSource;
  key: number;
};
type StudioGuitarRecordingStatus = {
  caption: string;
  isEnabled: boolean;
  label: string;
};
type PerspectiveCameraLike = {
  fov: number;
  updateProjectionMatrix: () => void;
};

interface ThreeDModeShellProps {
  countdownDisplay: CountdownDisplayState;
  users: SessionUser[];
  localUserId: string;
  ownerId: string;
  roundNumber: number;
  rangeScoreboard: RangeScoreResult[];
  onSubmitRangeScore: (result: RangeScoreSubmission) => void;
  freeRoamPresence: FreeRoamPresenceState[];
  onUpdateFreeRoamPresence: (presence: FreeRoamPresenceUpdate) => void;
  onClearFreeRoamPresence: () => void;
  jukeboxDisplay?: JukeboxDisplayState;
  jukeboxActions?: JukeboxActions;
  soundCloudBooth?: SoundCloudBoothState;
  sharedDawTransport: SharedDawTransport;
  sharedDawClips: SharedDawClipsState;
  sharedDawLiveSound: SharedDawLiveSoundEvent | null;
  syncStatus: SyncStatus;
  canControlSharedDawTransport: boolean;
  canAdminSharedDawClips: boolean;
  canWatchReadyHold: boolean;
  watchReadyHoldStatus: string;
  onSetSharedDawTempo: (bpm: number) => void;
  onPlaySharedDawTransport: () => void;
  onStopSharedDawTransport: () => void;
  onPublishSharedDawClip: (clip: SharedDawClipPublishPayload) => void;
  onClearSharedDawClip: (trackId: SharedDawTrackId, sceneIndex: number) => void;
  onBroadcastDawLiveSound: (sound: SharedDawLiveSoundPayload) => void;
  onStartWatchReadyHold: () => void;
  onEndWatchReadyHold: () => void;
  studioGuitar: SharedStudioGuitarState;
  onPickupStudioGuitar: () => void;
  onDropStudioGuitar: () => void;
  onExit: () => void;
}

const REVEAL_DURATION_MS = 3200;
const RETURN_DURATION_MS = 1200;
const START_CAMERA_POSITION = [0, 2.1, -4.35] as const;
const START_CAMERA_TARGET = [0, 2.1, -5.85] as const;
const MID_CAMERA_POSITION = [0, 2.45, -1.2] as const;
const MID_CAMERA_TARGET = [0, 1.45, -4.2] as const;
const END_CAMERA_TARGET = [0, 1.2, 0] as const;
const WALK_SPEED_UNITS_PER_SECOND = 2.2;
const SPRINT_SPEED_UNITS_PER_SECOND = 4;
const MOVEMENT_ACCELERATION_UNITS_PER_SECOND = 12;
const MOVEMENT_DECELERATION_UNITS_PER_SECOND = 16;
const MOVEMENT_STOP_EPSILON = 0.01;
const JUMP_TRIGGER_CODE = "Space";
const TOP_DOWN_TOGGLE_CODE = "KeyT";
const WATCH_GLANCE_CODE = "Tab";
const JUMP_VELOCITY_UNITS_PER_SECOND = 4.15;
const JUMP_GRAVITY_UNITS_PER_SECOND = 11.5;
const JUMP_GROUNDED_EPSILON = 0.025;
const SLIDE_TRIGGER_CODE = "KeyC";
const SLIDE_DURATION_MS = 420;
const SLIDE_COOLDOWN_MS = 900;
const SLIDE_SPEED_UNITS_PER_SECOND = 5.2;
const SLIDE_END_SPEED_UNITS_PER_SECOND = WALK_SPEED_UNITS_PER_SECOND;
const SLIDE_MOMENTUM_WINDOW_MS = 650;
const PLAYER_RADIUS = 0.35;
const NORMAL_CAMERA_FOV = 56;
const TOP_DOWN_CAMERA_FOV = 62;
const WALK_HEAD_BOB_AMPLITUDE = 0.018;
const WALK_HEAD_BOB_FREQUENCY = 7;
const SPRINT_HEAD_BOB_AMPLITUDE = 0.026;
const SPRINT_HEAD_BOB_FREQUENCY = 9;
const SLIDE_CAMERA_DIP = 0.08;
const SPRINT_CAMERA_FOV = 58;
const SLIDE_CAMERA_FOV = 59;
const CAMERA_FOV_LERP_SPEED = 8;
const TOP_DOWN_PAN_SPEED_UNITS_PER_SECOND = 7;
const TOP_DOWN_FREE_CAM_SPEED_UNITS_PER_SECOND = 9;
const FREE_FLY_CAMERA_MIN_Y = 0.25;
const FREE_FLY_CAMERA_MAX_Y = 28;
const TOP_DOWN_PAN_LIMIT_UNITS = 18;
const INSPECT_ZOOM_MIN_FOV = 28;
const INSPECT_ZOOM_MAX_FOV = 76;
const INSPECT_ZOOM_STEP_FOV = 4;
const INITIAL_LOOK_STATE: LookState = { yaw: 0, pitch: -0.35 };
const MIN_LOOK_PITCH = -(Math.PI * 89) / 180;
const MAX_LOOK_PITCH = (Math.PI * 89) / 180;
const MOUSE_LOOK_SENSITIVITY = 0.0035;
const POINTER_LOCK_LOOK_SENSITIVITY = 0.0025;
const FREE_ROAM_PRESENCE_INTERVAL_MS = 500;
const FREE_ROAM_PRESENCE_EYE_HEIGHT = 1.7;
const FREE_ROAM_POSITION_EPSILON = 0.08;
const FREE_ROAM_YAW_EPSILON = 0.08;
const AREA_FEEDBACK_DURATION_MS = 1800;
const STUDIO_GUITAR_FM_PATCH: LocalDawFmSynthPatch = {
  carrierFrequency: 130.81,
  modulationRatio: 1.48,
  modulationIndex: 0.95,
  envelopePreset: "pluck",
  gain: 0.13,
};
const STUDIO_GUITAR_RECORD_TRACK_ID: DawTrackId = "fm-synth";
const STUDIO_GUITAR_RECORD_SCENE_INDEX = 0;
const STUDIO_GUITAR_BANK_SIZE = 9;
const STUDIO_GUITAR_NOTE_SPECS: LocalDawFmSynthNote[] = [
  { label: "E2", frequency: 82.41, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "G2", frequency: 98, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "A2", frequency: 110, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "B2", frequency: 123.47, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "D3", frequency: 146.83, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "E3", frequency: 164.81, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "G3", frequency: 196, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "A3", frequency: 220, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "B3", frequency: 246.94, durationSeconds: 0.44, gainScale: 1.25, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "C4", frequency: 261.63, durationSeconds: 0.42, gainScale: 1.18, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "D4", frequency: 293.66, durationSeconds: 0.42, gainScale: 1.18, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "E4", frequency: 329.63, durationSeconds: 0.42, gainScale: 1.18, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "G4", frequency: 392, durationSeconds: 0.4, gainScale: 1.12, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "A4", frequency: 440, durationSeconds: 0.4, gainScale: 1.12, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "B4", frequency: 493.88, durationSeconds: 0.4, gainScale: 1.08, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "D5", frequency: 587.33, durationSeconds: 0.38, gainScale: 1.04, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "E5", frequency: 659.25, durationSeconds: 0.38, gainScale: 1, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "G5", frequency: 783.99, durationSeconds: 0.36, gainScale: 0.95, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "A5", frequency: 880, durationSeconds: 0.34, gainScale: 0.9, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "B5", frequency: 987.77, durationSeconds: 0.34, gainScale: 0.86, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "D6", frequency: 1174.66, durationSeconds: 0.32, gainScale: 0.82, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "E6", frequency: 1318.51, durationSeconds: 0.32, gainScale: 0.78, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "G6", frequency: 1567.98, durationSeconds: 0.3, gainScale: 0.74, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "A6", frequency: 1760, durationSeconds: 0.3, gainScale: 0.7, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "B6", frequency: 1975.53, durationSeconds: 0.28, gainScale: 0.66, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "D7", frequency: 2349.32, durationSeconds: 0.28, gainScale: 0.62, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
  { label: "E7", frequency: 2637.02, durationSeconds: 0.26, gainScale: 0.58, fmSynthPatch: STUDIO_GUITAR_FM_PATCH },
];

interface StationRevealRig {
  startPosition: Vec3;
  startTarget: Vec3;
  midPosition: Vec3;
  midTarget: Vec3;
  endPosition: Vec3;
  endTarget: Vec3;
  endLookState: LookState;
}

interface ResolvedLocalStation {
  station: LevelConfig["stations"][number] | null;
  source: LocalStationSource;
}

type EscapeMenuTab = "visual" | "movement" | "graphics" | "avatar" | "studio";
type ThreeDSettingNumberKey = "brightness" | "contrast" | "saturation" | "gamma" | "walkSpeedMultiplier";
type LocalAvatarSettingKey = keyof PlayerAvatarAppearance;

interface ThreeDSettingsState {
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  walkSpeedMultiplier: number;
  showGrabBoxes: boolean;
  showFps: boolean;
}

interface RendererPerformanceSample {
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
}

const ESCAPE_MENU_TABS: Array<{ id: EscapeMenuTab; label: string }> = [
  { id: "visual", label: "Visual" },
  { id: "movement", label: "Movement" },
  { id: "graphics", label: "Graphics" },
  { id: "avatar", label: "Avatar" },
  { id: "studio", label: "Studio" },
];

const DEFAULT_THREE_D_SETTINGS: ThreeDSettingsState = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  gamma: 1,
  walkSpeedMultiplier: 1,
  showGrabBoxes: false,
  showFps: false,
};
const REMOTE_PIANO_LOOKAHEAD_MS = 140;
const MAX_REMOTE_PIANO_SCHEDULE_DELAY_MS = 500;

const AVATAR_BODY_COLOR_OPTIONS = ["#1f8aa3", "#315c83", "#5d3f8f", "#3f6a48", "#7b4f83", "#234e76"] as const;
const AVATAR_ACCENT_COLOR_OPTIONS = ["#57f3ff", "#75ffa8", "#ff8bd4", "#f8d36a", "#a5b4ff", "#ff9b70"] as const;
const AVATAR_SUIT_PRESETS: Array<{ id: PlayerAvatarSuitPreset; label: string }> = [
  { id: "sync", label: "Sync" },
  { id: "studio", label: "Studio" },
  { id: "range", label: "Range" },
  { id: "neon", label: "Neon" },
];
const DEFAULT_LOCAL_AVATAR_APPEARANCE: PlayerAvatarAppearance = {
  bodyColor: "#1f8aa3",
  accentColor: "#57f3ff",
  headColor: "#57f3ff",
  suitPreset: "sync",
  showNameplate: false,
  scale: 1,
};
const LOCAL_AVATAR_APPEARANCE_STORAGE_VERSION = 1;
const LOCAL_AVATAR_APPEARANCE_STORAGE_KEY = `syncsesh.3d.local-avatar-appearance.v${LOCAL_AVATAR_APPEARANCE_STORAGE_VERSION}`;

function isAllowedAvatarBodyColor(value: unknown): value is (typeof AVATAR_BODY_COLOR_OPTIONS)[number] {
  return typeof value === "string" && AVATAR_BODY_COLOR_OPTIONS.includes(value as (typeof AVATAR_BODY_COLOR_OPTIONS)[number]);
}

function isAllowedAvatarAccentColor(value: unknown): value is (typeof AVATAR_ACCENT_COLOR_OPTIONS)[number] {
  return typeof value === "string" && AVATAR_ACCENT_COLOR_OPTIONS.includes(value as (typeof AVATAR_ACCENT_COLOR_OPTIONS)[number]);
}

function isAllowedAvatarSuitPreset(value: unknown): value is PlayerAvatarSuitPreset {
  return typeof value === "string" && AVATAR_SUIT_PRESETS.some((preset) => preset.id === value);
}

function normalizeLocalAvatarAppearance(appearance: unknown): PlayerAvatarAppearance {
  if (!appearance || typeof appearance !== "object") {
    return { ...DEFAULT_LOCAL_AVATAR_APPEARANCE };
  }

  const candidate = appearance as Partial<PlayerAvatarAppearance>;
  const bodyColor = isAllowedAvatarBodyColor(candidate.bodyColor) ? candidate.bodyColor : DEFAULT_LOCAL_AVATAR_APPEARANCE.bodyColor;
  const accentColor = isAllowedAvatarAccentColor(candidate.accentColor) ? candidate.accentColor : DEFAULT_LOCAL_AVATAR_APPEARANCE.accentColor;
  const suitPreset = isAllowedAvatarSuitPreset(candidate.suitPreset) ? candidate.suitPreset : DEFAULT_LOCAL_AVATAR_APPEARANCE.suitPreset;
  const showNameplate = typeof candidate.showNameplate === "boolean" ? candidate.showNameplate : DEFAULT_LOCAL_AVATAR_APPEARANCE.showNameplate;
  const parsedScale = Number(candidate.scale);
  const scale = Number.isFinite(parsedScale) ? clamp(parsedScale, 0.82, 1.2) : DEFAULT_LOCAL_AVATAR_APPEARANCE.scale;

  return {
    bodyColor,
    accentColor,
    headColor: accentColor,
    suitPreset,
    showNameplate,
    scale,
  };
}

function loadLocalAvatarAppearance() {
  if (typeof window === "undefined") {
    return { ...DEFAULT_LOCAL_AVATAR_APPEARANCE };
  }

  try {
    const rawState = window.localStorage.getItem(LOCAL_AVATAR_APPEARANCE_STORAGE_KEY);

    if (!rawState) {
      return { ...DEFAULT_LOCAL_AVATAR_APPEARANCE };
    }

    const parsed = JSON.parse(rawState) as { appearance?: unknown; version?: unknown } | null;

    if (!parsed || typeof parsed !== "object" || parsed.version !== LOCAL_AVATAR_APPEARANCE_STORAGE_VERSION) {
      return { ...DEFAULT_LOCAL_AVATAR_APPEARANCE };
    }

    return normalizeLocalAvatarAppearance(parsed.appearance);
  } catch {
    return { ...DEFAULT_LOCAL_AVATAR_APPEARANCE };
  }
}

function saveLocalAvatarAppearance(appearance: PlayerAvatarAppearance) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_AVATAR_APPEARANCE_STORAGE_KEY, JSON.stringify({
      version: LOCAL_AVATAR_APPEARANCE_STORAGE_VERSION,
      appearance: normalizeLocalAvatarAppearance(appearance),
    }));
  } catch {
    // Ignore storage failures so the hidden world remains usable.
  }
}

function canCreateWebGLContext() {
  const canvas = document.createElement("canvas");

  return Boolean(
    canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl"),
  );
}

function getPrefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function exitPointerLockIfActive() {
  if (document.pointerLockElement !== null && typeof document.exitPointerLock === "function") {
    document.exitPointerLock();
  }
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function moveTowards(current: number, target: number, maxDelta: number) {
  const delta = target - current;

  if (Math.abs(delta) <= maxDelta) {
    return target;
  }

  return current + Math.sign(delta) * maxDelta;
}

function interpolateVec3(start: readonly [number, number, number], end: readonly [number, number, number], progress: number) {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress),
  ] as const;
}

function getSharedDawTransportPosition(sharedDawTransport: SharedDawTransport, syncStatus: SyncStatus) {
  const anchorBar = Math.max(1, Math.round(sharedDawTransport.anchorBar));
  const anchorBeat = Math.min(4, Math.max(1, Math.round(sharedDawTransport.anchorBeat)));

  if (sharedDawTransport.state !== "playing" || !sharedDawTransport.startedAt) {
    return { bar: anchorBar, beat: anchorBeat };
  }

  const startedAtMs = Date.parse(sharedDawTransport.startedAt);

  if (!Number.isFinite(startedAtMs)) {
    return { bar: anchorBar, beat: anchorBeat };
  }

  const serverAlignedNowMs = Date.now() + (syncStatus.serverTimeOffsetMs ?? 0);
  const beatMs = 60000 / Math.max(60, Math.min(180, sharedDawTransport.bpm));
  const elapsedBeats = Math.max(0, Math.floor((serverAlignedNowMs - startedAtMs) / beatMs));
  const anchorTotalBeats = (anchorBar - 1) * 4 + (anchorBeat - 1);
  const totalBeats = anchorTotalBeats + elapsedBeats;

  return {
    bar: Math.floor(totalBeats / 4) + 1,
    beat: (totalBeats % 4) + 1,
  };
}

function getLookStateFromPose(position: readonly [number, number, number], target: readonly [number, number, number]): LookState {
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] - position[2];
  const distance = Math.max(0.001, Math.hypot(dx, dy, dz));

  return {
    yaw: Math.atan2(dx, -dz),
    pitch: clamp(Math.asin(dy / distance), MIN_LOOK_PITCH, MAX_LOOK_PITCH),
  };
}

function worldFromStationLocal(station: LevelConfig["stations"][number], local: Vec3): Vec3 {
  const yaw = station.rotation[1];
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  return [
    station.position[0] + local[0] * cos + local[2] * sin,
    station.position[1] + local[1],
    station.position[2] - local[0] * sin + local[2] * cos,
  ];
}

function getInitialLevelArea(levelConfig: LevelConfig) {
  const activeAreas = (levelConfig.areas ?? []).filter((area) => area.status === "active");

  return (
    activeAreas.find((area) => (
      levelConfig.playerStart.position[0] >= area.bounds.min[0] &&
      levelConfig.playerStart.position[0] <= area.bounds.max[0] &&
      levelConfig.playerStart.position[1] >= area.bounds.min[1] &&
      levelConfig.playerStart.position[1] <= area.bounds.max[1] &&
      levelConfig.playerStart.position[2] >= area.bounds.min[2] &&
      levelConfig.playerStart.position[2] <= area.bounds.max[2]
    )) ??
    activeAreas[0] ??
    null
  );
}

function getFallbackRevealRig(levelConfig: LevelConfig, arrivalOverride?: TransitionArrivalOverride): StationRevealRig {
  const initialArea = getInitialLevelArea(levelConfig);
  const endPosition = [...(arrivalOverride?.spawnPosition ?? initialArea?.spawnPosition ?? levelConfig.playerStart.position)] as Vec3;
  const endTarget = [...(arrivalOverride?.cameraTarget ?? initialArea?.cameraTarget ?? END_CAMERA_TARGET)] as Vec3;

  return {
    startPosition: [...START_CAMERA_POSITION],
    startTarget: [...START_CAMERA_TARGET],
    midPosition: [...MID_CAMERA_POSITION],
    midTarget: [...MID_CAMERA_TARGET],
    endPosition,
    endTarget,
    endLookState: getLookStateFromPose(endPosition, endTarget),
  };
}

function getAreaForPosition(position: Vec3, levelConfig: LevelConfig) {
  const activeAreas = (levelConfig.areas ?? []).filter((area) => area.status === "active");
  const matchesHorizontalBounds = (area: NonNullable<LevelConfig["areas"]>[number]) =>
    position[0] >= area.bounds.min[0] &&
    position[0] <= area.bounds.max[0] &&
    position[2] >= area.bounds.min[2] &&
    position[2] <= area.bounds.max[2];

  return (
    activeAreas.find(
      (area) =>
        matchesHorizontalBounds(area) &&
        position[1] >= area.bounds.min[1] &&
        position[1] <= area.bounds.max[1],
    ) ??
    activeAreas.find(matchesHorizontalBounds) ??
    null
  );
}

function getStationRevealRig(
  levelConfig: LevelConfig,
  station?: LevelConfig["stations"][number],
  arrivalOverride?: TransitionArrivalOverride,
): StationRevealRig {
  if (!station) {
    return getFallbackRevealRig(levelConfig, arrivalOverride);
  }

  const screenTarget = worldFromStationLocal(station, [0, 1.32, -0.245]);
  const startPosition = worldFromStationLocal(station, [0, 1.38, 0.16]);
  const midPosition = worldFromStationLocal(station, [0, 1.55, 0.95]);
  const endPosition = worldFromStationLocal(station, [0, 1.7, 1.9]);
  const midTarget = worldFromStationLocal(station, [0, 1.2, -0.12]);

  return {
    startPosition,
    startTarget: screenTarget,
    midPosition,
    midTarget,
    endPosition,
    endTarget: screenTarget,
    endLookState: getLookStateFromPose(endPosition, screenTarget),
  };
}

function getRevealPose(progress: number, revealRig: StationRevealRig) {
  const easedProgress = easeOutCubic(progress);

  if (easedProgress <= 0.55) {
    const segmentProgress = easedProgress / 0.55;

    return {
      position: interpolateVec3(revealRig.startPosition, revealRig.midPosition, segmentProgress),
      target: interpolateVec3(revealRig.startTarget, revealRig.midTarget, segmentProgress),
    };
  }

  const segmentProgress = (easedProgress - 0.55) / 0.45;

  return {
    position: interpolateVec3(revealRig.midPosition, revealRig.endPosition, segmentProgress),
    target: interpolateVec3(revealRig.midTarget, revealRig.endTarget, segmentProgress),
  };
}

function RevealCameraController({
  revealRig,
  revealState,
  lookStateRef,
  onComplete,
}: {
  revealRig: StationRevealRig;
  revealState: RevealState;
  lookStateRef: MutableRefObject<LookState>;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const startedAtMsRef = useRef<number>();
  const didCompleteRef = useRef(false);
  const didSnapToFinalRef = useRef(false);

  useFrame(({ clock }) => {
    if (revealState === "complete") {
      if (!didSnapToFinalRef.current) {
        camera.position.set(...revealRig.endPosition);
        lookStateRef.current = { ...revealRig.endLookState };
        camera.lookAt(...getLookTarget(revealRig.endPosition, lookStateRef.current));
        didSnapToFinalRef.current = true;
      }

      return;
    }

    if (revealState === "returning") {
      return;
    }

    const nowMs = clock.getElapsedTime() * 1000;
    startedAtMsRef.current ??= nowMs;

    const progress = Math.min(1, (nowMs - startedAtMsRef.current) / REVEAL_DURATION_MS);
    const pose = getRevealPose(progress, revealRig);

    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);

    if (progress >= 1 && !didCompleteRef.current) {
      didCompleteRef.current = true;
      didSnapToFinalRef.current = true;
      camera.position.set(...revealRig.endPosition);
      lookStateRef.current = { ...revealRig.endLookState };
      camera.lookAt(...getLookTarget(revealRig.endPosition, lookStateRef.current));
      onComplete();
    }
  });

  return null;
}

function ReturnToDashboardCameraController({
  revealState,
  revealRig,
  lookStateRef,
  onComplete,
}: {
  revealState: RevealState;
  revealRig: StationRevealRig;
  lookStateRef: MutableRefObject<LookState>;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const startedAtMsRef = useRef<number>();
  const startPositionRef = useRef<Vec3>();
  const startTargetRef = useRef<Vec3>();
  const didCompleteRef = useRef(false);

  useFrame(({ clock }) => {
    if (revealState !== "returning") {
      return;
    }

    const nowMs = clock.getElapsedTime() * 1000;

    if (!startedAtMsRef.current) {
      startedAtMsRef.current = nowMs;
      startPositionRef.current = [camera.position.x, camera.position.y, camera.position.z];
      startTargetRef.current = getLookTarget(startPositionRef.current, lookStateRef.current);
    }

    const startPosition = startPositionRef.current;
    const startTarget = startTargetRef.current;

    if (!startPosition || !startTarget) {
      return;
    }

    const progress = Math.min(1, (nowMs - startedAtMsRef.current) / RETURN_DURATION_MS);
    const easedProgress = easeOutCubic(progress);
    const position = interpolateVec3(startPosition, revealRig.startPosition, easedProgress);
    const target = interpolateVec3(startTarget, revealRig.startTarget, easedProgress);

    camera.position.set(...position);
    camera.lookAt(...target);

    if (progress >= 1 && !didCompleteRef.current) {
      didCompleteRef.current = true;
      onComplete();
    }
  });

  return null;
}

function EscapeMenuOverlay({
  activeTab,
  audioState,
  avatarAppearance,
  avatarIdentity,
  canControlSharedDawTransport,
  guitarRecordingStatus,
  isOpen,
  isLocalHost,
  localDawState,
  onAdjustTempo,
  onAvatarSettingChange,
  onClose,
  onResetAvatar,
  onResetPatch,
  onResetSpeed,
  onResetVisuals,
  onSetMasterVolume,
  onSettingChange,
  onTestBass,
  onTestDrumHat,
  onTestDrumKick,
  onTestDrumSnare,
  onTestFmSynth,
  onTestPiano,
  onTabChange,
  onToggleAudioEngine,
  onToggleAudioMute,
  onToggleGuitarRecording,
  onToggleTransport,
  settings,
  sharedDawTransport,
  userPresence,
}: {
  activeTab: EscapeMenuTab;
  audioState: LocalDawAudioEngineState;
  avatarAppearance: PlayerAvatarAppearance;
  avatarIdentity: PlayerAvatarIdentity;
  canControlSharedDawTransport: boolean;
  guitarRecordingStatus: StudioGuitarRecordingStatus;
  isOpen: boolean;
  isLocalHost: boolean;
  localDawState: LocalDawState;
  onAdjustTempo: (deltaBpm: number) => void;
  onAvatarSettingChange: <Key extends LocalAvatarSettingKey>(key: Key, value: PlayerAvatarAppearance[Key]) => void;
  onClose: () => void;
  onResetAvatar: () => void;
  onResetPatch: () => void;
  onResetSpeed: () => void;
  onResetVisuals: () => void;
  onSetMasterVolume: (volume: number) => void;
  onSettingChange: <Key extends keyof ThreeDSettingsState>(key: Key, value: ThreeDSettingsState[Key]) => void;
  onTestBass: () => void;
  onTestDrumHat: () => void;
  onTestDrumKick: () => void;
  onTestDrumSnare: () => void;
  onTestFmSynth: () => void;
  onTestPiano: () => void;
  onTabChange: (tab: EscapeMenuTab) => void;
  onToggleAudioEngine: () => void;
  onToggleAudioMute: () => void;
  onToggleGuitarRecording: () => void;
  onToggleTransport: () => void;
  settings: ThreeDSettingsState;
  sharedDawTransport: SharedDawTransport;
  userPresence: SessionUser["presence"];
}) {
  if (!isOpen) {
    return null;
  }

  const engineReady = audioState.status === "ready" && audioState.isInitialized && !audioState.isMuted;
  const engineLabel = audioState.status === "ready" ? (audioState.isMuted ? "MUTED" : "ON") : audioState.status.toUpperCase();
  const transportState = canControlSharedDawTransport ? sharedDawTransport.state : localDawState.transport.state;
  const transportBpm = canControlSharedDawTransport ? sharedDawTransport.bpm : localDawState.transport.bpm;
  const masterPercent = Math.round(audioState.masterVolume * 100);
  const audioLatencyLabel = audioState.audioContextInfo
    ? `BASE ${audioState.audioContextInfo.baseLatencyMs ?? "--"} MS / OUT ${audioState.audioContextInfo.outputLatencyMs ?? "--"} MS`
    : "--";
  const handleAccentColorChange = (color: string) => {
    onAvatarSettingChange("accentColor", color);
    onAvatarSettingChange("headColor", color);
  };
  const renderSlider = (
    key: ThreeDSettingNumberKey,
    label: string,
    min: number,
    max: number,
    step: number,
    displayValue: string,
  ) => (
    <label className="three-d-escape-menu-control-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={settings[key]}
        onChange={(event) => onSettingChange(key, Number(event.currentTarget.value) as ThreeDSettingsState[typeof key])}
      />
      <strong>{displayValue}</strong>
    </label>
  );
  const renderAvatarSwatches = (
    label: string,
    colors: readonly string[],
    selectedColor: string,
    onSelect: (color: string) => void,
  ) => (
    <div className="three-d-escape-menu-avatar-control">
      <span>{label}</span>
      <div className="three-d-escape-menu-swatch-grid" role="radiogroup" aria-label={`${label} color`}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={`three-d-escape-menu-swatch${color === selectedColor ? " three-d-escape-menu-swatch-active" : ""}`}
            style={{ "--avatar-swatch-color": color } as CSSProperties}
            aria-label={color === selectedColor ? `${label} ${color} selected` : `${label} ${color}`}
            aria-pressed={color === selectedColor}
            onClick={() => onSelect(color)}
          />
        ))}
      </div>
    </div>
  );
  const renderBody = () => {
    if (activeTab === "visual") {
      return (
        <>
          <div className="three-d-escape-menu-copy">
            <p className="three-d-escape-menu-eyebrow">Scene presentation</p>
            <h3>Visual</h3>
            <p>Local filters for the hidden 3D view only.</p>
          </div>
          <div className="three-d-escape-menu-stack">
            {renderSlider("brightness", "Brightness", 0.5, 1.5, 0.01, `${Math.round(settings.brightness * 100)}%`)}
            {renderSlider("contrast", "Contrast", 0.5, 1.6, 0.01, `${Math.round(settings.contrast * 100)}%`)}
            {renderSlider("saturation", "Saturation", 0, 2, 0.01, `${Math.round(settings.saturation * 100)}%`)}
            {renderSlider("gamma", "Gamma", 0.6, 1.8, 0.01, settings.gamma.toFixed(2))}
            <button type="button" className="three-d-escape-menu-action" onClick={onResetVisuals}>
              Reset Visuals
            </button>
          </div>
        </>
      );
    }

    if (activeTab === "movement") {
      return (
        <>
          <div className="three-d-escape-menu-copy">
            <p className="three-d-escape-menu-eyebrow">Traversal controls</p>
            <h3>Movement</h3>
            <p>Walk speed scales first-person walk, sprint, and slide speed.</p>
          </div>
          <div className="three-d-escape-menu-stack">
            {renderSlider("walkSpeedMultiplier", "Walk Speed", 0.5, 3, 0.05, `${settings.walkSpeedMultiplier.toFixed(2)}x`)}
            <button type="button" className="three-d-escape-menu-action" onClick={onResetSpeed}>
              Reset Speed
            </button>
          </div>
        </>
      );
    }

    if (activeTab === "graphics") {
      return (
        <>
          <div className="three-d-escape-menu-copy">
            <p className="three-d-escape-menu-eyebrow">Rendering controls</p>
            <h3>Graphics</h3>
            <p>Keep editor hitboxes functional while cleaning up the view.</p>
          </div>
          <div className="three-d-escape-menu-stack">
            <label className="three-d-escape-menu-toggle-row">
              <input
                type="checkbox"
                checked={settings.showGrabBoxes}
                onChange={(event) => onSettingChange("showGrabBoxes", event.currentTarget.checked)}
              />
              <span>Show grab boxes</span>
            </label>
            <label className="three-d-escape-menu-toggle-row">
              <input
                type="checkbox"
                checked={settings.showFps}
                onChange={(event) => onSettingChange("showFps", event.currentTarget.checked)}
              />
              <span>Show FPS</span>
            </label>
          </div>
        </>
      );
    }

    if (activeTab === "avatar") {
      return (
        <>
          <div className="three-d-escape-menu-copy">
            <p className="three-d-escape-menu-eyebrow">Local body</p>
            <h3>Avatar</h3>
            <p>Local-only avatar styling for this 3D visit.</p>
          </div>
          <div className="three-d-escape-menu-avatar-grid">
            <div className="three-d-escape-menu-avatar-preview" aria-label="Live avatar preview">
              <Canvas camera={{ position: [0, 1.35, 3.4], fov: 36 }} dpr={[1, 1.5]}>
                <ambientLight intensity={1.45} />
                <directionalLight position={[2, 4, 3]} intensity={1.2} />
                <group position={[0, -0.86, 0]} rotation={[0, -0.35, 0]}>
                  <PlayerAvatar
                    identity={avatarIdentity}
                    appearance={avatarAppearance}
                    mode="local"
                    presence={userPresence}
                    isHost={isLocalHost}
                    isReady={userPresence === "ready"}
                    showNameplate={avatarAppearance.showNameplate}
                  />
                </group>
              </Canvas>
            </div>
            <div className="three-d-escape-menu-stack">
              {renderAvatarSwatches("Body", AVATAR_BODY_COLOR_OPTIONS, avatarAppearance.bodyColor, (color) =>
                onAvatarSettingChange("bodyColor", color),
              )}
              {renderAvatarSwatches("Accent", AVATAR_ACCENT_COLOR_OPTIONS, avatarAppearance.accentColor, handleAccentColorChange)}
              <div className="three-d-escape-menu-avatar-control">
                <span>Suit</span>
                <div className="three-d-escape-menu-segmented" role="radiogroup" aria-label="Suit preset">
                  {AVATAR_SUIT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`three-d-escape-menu-segment${preset.id === avatarAppearance.suitPreset ? " three-d-escape-menu-segment-active" : ""}`}
                      aria-pressed={preset.id === avatarAppearance.suitPreset}
                      onClick={() => onAvatarSettingChange("suitPreset", preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="three-d-escape-menu-toggle-row">
                <input
                  type="checkbox"
                  checked={avatarAppearance.showNameplate}
                  onChange={(event) => onAvatarSettingChange("showNameplate", event.currentTarget.checked)}
                />
                <span>Nameplate</span>
              </label>
              <label className="three-d-escape-menu-control-row">
                <span>Scale</span>
                <input
                  type="range"
                  min={0.82}
                  max={1.2}
                  step={0.01}
                  value={avatarAppearance.scale}
                  onChange={(event) => onAvatarSettingChange("scale", Number(event.currentTarget.value))}
                />
                <strong>{avatarAppearance.scale.toFixed(2)}x</strong>
              </label>
              <button type="button" className="three-d-escape-menu-action" onClick={onResetAvatar}>
                Reset Avatar
              </button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="three-d-escape-menu-copy">
          <p className="three-d-escape-menu-eyebrow">Studio tools</p>
          <h3>Studio</h3>
          <p>Quick local tests for the recording room without walking to every station.</p>
        </div>
        <div className="three-d-escape-menu-stack">
          <div className="three-d-escape-menu-row">
            <span>Engine</span>
            <strong>{engineLabel}</strong>
          </div>
          <div className="three-d-escape-menu-button-grid">
            <button type="button" className="three-d-escape-menu-action" onClick={onToggleAudioEngine}>
              {audioState.isInitialized ? "Wake Engine" : "Start Engine"}
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={onToggleAudioMute} disabled={!audioState.isInitialized}>
              {audioState.isMuted ? "Unmute" : "Mute"}
            </button>
          </div>
          <div className="three-d-escape-menu-row">
            <span>Master</span>
            <strong>{masterPercent}%</strong>
          </div>
          <div className="three-d-escape-menu-row">
            <span>Latency</span>
            <strong>{audioLatencyLabel}</strong>
          </div>
          <div className="three-d-escape-menu-button-grid three-d-escape-menu-button-grid-3">
            <button type="button" className="three-d-escape-menu-action" onClick={() => onSetMasterVolume(audioState.masterVolume - 0.1)}>
              -
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={() => onSetMasterVolume(1)}>
              100%
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={() => onSetMasterVolume(audioState.masterVolume + 0.1)}>
              +
            </button>
          </div>
          <div className="three-d-escape-menu-row">
            <span>Transport</span>
            <strong>{transportState.toUpperCase()} {transportBpm} BPM</strong>
          </div>
          <div className="three-d-escape-menu-button-grid three-d-escape-menu-button-grid-3">
            <button type="button" className="three-d-escape-menu-action" onClick={onToggleTransport}>
              {transportState === "playing" ? "Stop" : "Play"}
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={() => onAdjustTempo(-4)}>
              BPM -
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={() => onAdjustTempo(4)}>
              BPM +
            </button>
          </div>
          <div className="three-d-escape-menu-button-grid">
            <button type="button" className="three-d-escape-menu-action" onClick={onTestPiano} disabled={!engineReady}>
              Piano
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={onTestFmSynth} disabled={!engineReady}>
              FM
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={onTestBass} disabled={!engineReady}>
              Bass
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={onTestDrumKick} disabled={!engineReady}>
              Kick
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={onTestDrumSnare} disabled={!engineReady}>
              Snare
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={onTestDrumHat} disabled={!engineReady}>
              Hat
            </button>
          </div>
          {!engineReady ? <p className="three-d-escape-menu-note">Start ENGINE to hear test sounds.</p> : null}
          <div className="three-d-escape-menu-button-grid">
            <button type="button" className="three-d-escape-menu-action" onClick={onToggleGuitarRecording}>
              {guitarRecordingStatus.isEnabled ? "Stop Guitar Rec" : "Guitar Rec"}
            </button>
            <button type="button" className="three-d-escape-menu-action" onClick={onResetPatch}>
              Reset Patch
            </button>
          </div>
          <button type="button" className="three-d-escape-menu-action" onClick={() => onSettingChange("showGrabBoxes", true)}>
            Show Grab Boxes
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="three-d-escape-menu-layer" aria-hidden="false">
      <button
        type="button"
        className="three-d-escape-menu-backdrop"
        aria-label="Close escape menu"
        onClick={onClose}
      />
      <section
        className="three-d-escape-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Escape menu"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <header className="three-d-escape-menu-header">
          <div className="three-d-escape-menu-title-block">
            <p className="three-d-escape-menu-eyebrow">Paused</p>
            <h2>Escape menu</h2>
            <span>Esc closes the menu when pointer lock is not active.</span>
          </div>
          <button
            type="button"
            className="three-d-escape-menu-close"
            aria-label="Close escape menu"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="three-d-escape-menu-tabs" role="tablist" aria-label="Escape menu sections">
          {ESCAPE_MENU_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeTab}
              className={`three-d-escape-menu-tab${tab.id === activeTab ? " three-d-escape-menu-tab-active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="three-d-escape-menu-body">{renderBody()}</div>
      </section>
    </div>
  );
}

function ThreeDPerformanceSampler({
  enabled,
  onSample,
}: {
  enabled: boolean;
  onSample: (sample: RendererPerformanceSample | null) => void;
}) {
  const { gl } = useThree();
  const onSampleRef = useRef(onSample);
  const lastSampleAtRef = useRef(0);

  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  useEffect(() => {
    if (!enabled) {
      lastSampleAtRef.current = 0;
      onSampleRef.current(null);
    }
  }, [enabled]);

  useFrame(() => {
    if (!enabled) {
      return;
    }

    const now = performance.now();

    if (now - lastSampleAtRef.current < 500) {
      return;
    }

    lastSampleAtRef.current = now;
    const info = gl.info;

    onSampleRef.current({
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
    });
  });

  return null;
}

function ThreeDFpsCounter({
  enabled,
  interactionPerformanceSample,
  rendererPerformanceSample,
}: {
  enabled: boolean;
  interactionPerformanceSample: InteractionPerformanceSample | null;
  rendererPerformanceSample: RendererPerformanceSample | null;
}) {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setFps(0);
      return undefined;
    }

    let animationFrameId = 0;
    let frameCount = 0;
    let lastSampleAt = performance.now();

    const sample = (now: number) => {
      frameCount += 1;

      if (now - lastSampleAt >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastSampleAt)));
        frameCount = 0;
        lastSampleAt = now;
      }

      animationFrameId = window.requestAnimationFrame(sample);
    };

    animationFrameId = window.requestAnimationFrame(sample);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="three-d-fps-counter" aria-live="polite">
      <div>FPS {fps}</div>
      {interactionPerformanceSample ? (
        <div>
          IR {interactionPerformanceSample.raycastDurationMs.toFixed(1)}ms {interactionPerformanceSample.raycastObjectCount} O {interactionPerformanceSample.intersectionCount} I {interactionPerformanceSample.hitCount} H
        </div>
      ) : null}
      {rendererPerformanceSample ? (
        <div>
          GL {rendererPerformanceSample.drawCalls} DC {rendererPerformanceSample.triangles} TRI {rendererPerformanceSample.textures} TX {rendererPerformanceSample.geometries} GEO
        </div>
      ) : null}
    </div>
  );
}

function formatWatchPresence(user: SessionUser | null, isLocalHost: boolean) {
  if (!user) {
    return "UNJOINED";
  }

  const presence = user.presence.toUpperCase();
  return isLocalHost ? `HOST / ${presence}` : presence;
}

function WatchTimerDisplay({
  countdownDisplay,
  users,
  localUserId,
  ownerId,
  roundNumber,
  canWatchReadyHold,
  watchReadyHoldStatus,
  isWatchReadyHolding,
}: {
  countdownDisplay: CountdownDisplayState;
  users: SessionUser[];
  localUserId: string;
  ownerId: string;
  roundNumber: number;
  canWatchReadyHold: boolean;
  watchReadyHoldStatus: string;
  isWatchReadyHolding: boolean;
}) {
  const readyCount = users.filter((user) => user.presence === "ready").length;
  const activeCount = users.filter((user) => user.presence !== "spectating").length;
  const localUser = users.find((user) => user.id === localUserId) ?? null;
  const isLocalHost = localUser?.isHost === true || localUserId === ownerId;
  const localPresence = formatWatchPresence(localUser, isLocalHost);
  const statusLine = countdownDisplay.accentText ?? countdownDisplay.subheadline;
  const readyControlCopy = isWatchReadyHolding ? "HOLDING READY" : canWatchReadyHold ? "HOLD SPACE TO READY" : watchReadyHoldStatus;

  return (
    <aside className="three-d-watch-display" data-urgent={countdownDisplay.isUrgent ? "true" : "false"} aria-live="polite">
      <div className="three-d-watch-display-bezel">
        <div className="three-d-watch-display-header">
          <span>WRIST SYNC</span>
          <strong>{localPresence}</strong>
        </div>
        <div className="three-d-watch-display-time">{countdownDisplay.timerText}</div>
        <div className="three-d-watch-display-headline">{countdownDisplay.headline}</div>
        <div className="three-d-watch-display-grid">
          <span>PHASE</span>
          <strong>{countdownDisplay.phase.toUpperCase()}</strong>
          <span>ROUND</span>
          <strong>{String(roundNumber).padStart(2, "0")}</strong>
          <span>READY</span>
          <strong>{readyCount}/{activeCount}</strong>
        </div>
        <div className="three-d-watch-display-footer">
          <span>{statusLine}</span>
          <strong>{readyControlCopy}</strong>
        </div>
      </div>
    </aside>
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function isMovementKey(code: string): code is MovementKey {
  return code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD";
}

function isBackquoteToggle(event: KeyboardEvent) {
  return event.code === "Backquote" || event.key === "`" || event.key === "~";
}

function isFreeCamVerticalKey(code: string) {
  return (
    code === "Space" ||
    code === "KeyE" ||
    code === "KeyQ" ||
    code === "ControlLeft" ||
    code === "ControlRight"
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLookTarget(position: readonly [number, number, number], lookState: LookState): Vec3 {
  const horizontal = Math.cos(lookState.pitch);

  return [
    position[0] + Math.sin(lookState.yaw) * horizontal,
    position[1] + Math.sin(lookState.pitch),
    position[2] - Math.cos(lookState.yaw) * horizontal,
  ];
}

function clampToRoom(x: number, z: number, levelConfig: LevelConfig) {
  const { room } = levelConfig.collisionBounds;

  return {
    x: clamp(x, room.min[0] + PLAYER_RADIUS, room.max[0] - PLAYER_RADIUS),
    z: clamp(z, room.min[2] + PLAYER_RADIUS, room.max[2] - PLAYER_RADIUS),
  };
}

function collidesWithBlocker(x: number, z: number, levelConfig: LevelConfig) {
  return levelConfig.collisionBounds.blockers.some((blocker) => (
    x >= blocker.min[0] - PLAYER_RADIUS &&
    x <= blocker.max[0] + PLAYER_RADIUS &&
    z >= blocker.min[2] - PLAYER_RADIUS &&
    z <= blocker.max[2] + PLAYER_RADIUS
  ));
}

function resolveHorizontalMovementCollision({
  current,
  next,
  velocity,
  levelConfig,
}: {
  current: HorizontalVector;
  next: HorizontalVector;
  velocity: HorizontalVector;
  levelConfig: LevelConfig;
}): { position: HorizontalVector; velocity: HorizontalVector; collision: CollisionResolutionKind } {
  const fullCandidate = clampToRoom(next.x, next.z, levelConfig);

  if (!collidesWithBlocker(fullCandidate.x, fullCandidate.z, levelConfig)) {
    return {
      position: fullCandidate,
      velocity,
      collision: "none",
    };
  }

  const xOnlyCandidate = clampToRoom(next.x, current.z, levelConfig);
  const zOnlyCandidate = clampToRoom(current.x, next.z, levelConfig);
  const canSlideX = !collidesWithBlocker(xOnlyCandidate.x, xOnlyCandidate.z, levelConfig);
  const canSlideZ = !collidesWithBlocker(zOnlyCandidate.x, zOnlyCandidate.z, levelConfig);

  if (canSlideX && canSlideZ) {
    const intendedXDelta = Math.abs(next.x - current.x);
    const intendedZDelta = Math.abs(next.z - current.z);

    if (intendedXDelta >= intendedZDelta) {
      return {
        position: xOnlyCandidate,
        velocity: { ...velocity, z: 0 },
        collision: "slide-x",
      };
    }

    return {
      position: zOnlyCandidate,
      velocity: { ...velocity, x: 0 },
      collision: "slide-z",
    };
  }

  if (canSlideX) {
    return {
      position: xOnlyCandidate,
      velocity: { ...velocity, z: 0 },
      collision: "slide-x",
    };
  }

  if (canSlideZ) {
    return {
      position: zOnlyCandidate,
      velocity: { ...velocity, x: 0 },
      collision: "slide-z",
    };
  }

  return {
    position: current,
    velocity: { x: 0, z: 0 },
    collision: "blocked",
  };
}

function getTraversalFloorHeight(x: number, z: number, levelConfig: LevelConfig) {
  return (levelConfig.traversalSurfaces ?? []).reduce((highestFloorHeight, surface) => {
    const isInsideSurface =
      x >= surface.bounds.min[0] &&
      x <= surface.bounds.max[0] &&
      z >= surface.bounds.min[2] &&
      z <= surface.bounds.max[2];

    if (!isInsideSurface) {
      return highestFloorHeight;
    }

    if (surface.kind === "platform" || !surface.ramp) {
      return Math.max(highestFloorHeight, surface.floorHeight);
    }

    const axisIndex = surface.ramp.axis === "x" ? 0 : 2;
    const positionOnAxis = surface.ramp.axis === "x" ? x : z;
    const minOnAxis = surface.bounds.min[axisIndex];
    const maxOnAxis = surface.bounds.max[axisIndex];
    const axisSpan = Math.max(0.001, maxOnAxis - minOnAxis);
    const rawProgress =
      surface.ramp.lowEdge === "minX" || surface.ramp.lowEdge === "minZ"
        ? (positionOnAxis - minOnAxis) / axisSpan
        : (maxOnAxis - positionOnAxis) / axisSpan;
    const progress = clamp(rawProgress, 0, 1);
    const floorHeight = lerp(surface.ramp.lowFloorHeight, surface.ramp.highFloorHeight, progress);

    return Math.max(highestFloorHeight, floorHeight);
  }, 0);
}

function getPerspectiveCamera(camera: object): PerspectiveCameraLike | null {
  if (
    "fov" in camera &&
    "updateProjectionMatrix" in camera &&
    typeof camera.fov === "number" &&
    typeof camera.updateProjectionMatrix === "function"
  ) {
    return camera as PerspectiveCameraLike;
  }

  return null;
}

function isTopDownPanKey(code: string): code is TopDownPanKey {
  return code === "ArrowUp" || code === "ArrowDown" || code === "ArrowLeft" || code === "ArrowRight";
}

function updateCameraFov(camera: object, targetFov: number, delta: number) {
  const perspectiveCamera = getPerspectiveCamera(camera);

  if (!perspectiveCamera) {
    return;
  }

  const nextFov = lerp(perspectiveCamera.fov, targetFov, Math.min(1, delta * CAMERA_FOV_LERP_SPEED));

  if (Math.abs(nextFov - perspectiveCamera.fov) < 0.01) {
    if (perspectiveCamera.fov !== targetFov) {
      perspectiveCamera.fov = targetFov;
      perspectiveCamera.updateProjectionMatrix();
    }

    return;
  }

  perspectiveCamera.fov = nextFov;
  perspectiveCamera.updateProjectionMatrix();
}

function FirstPersonMovementController({
  levelConfig,
  enabled,
  controlState,
  onControlStateChange,
  lookStateRef,
  onLocalPoseChange,
  prefersReducedMotion,
  walkSpeedMultiplier,
}: {
  levelConfig: LevelConfig;
  enabled: boolean;
  controlState: ControlState;
  onControlStateChange: (controlState: ControlState) => void;
  lookStateRef: MutableRefObject<LookState>;
  onLocalPoseChange: (pose: LocalPlayerPose) => void;
  prefersReducedMotion: boolean;
  walkSpeedMultiplier: number;
}) {
  const { camera, gl } = useThree();
  const activeKeysRef = useRef(new Set<MovementKey>());
  const isSprintActiveRef = useRef(false);
  const movementVelocityRef = useRef({ x: 0, z: 0 });
  const jumpRequestRef = useRef(false);
  const jumpVelocityRef = useRef(0);
  const jumpOffsetRef = useRef(0);
  const slideRequestRef = useRef(false);
  const slideStateRef = useRef<SlideState | null>(null);
  const activeShiftKeysRef = useRef(new Set<string>());
  const lastSprintMomentumAtMsRef = useRef<number | null>(null);
  const lastMovementDirectionRef = useRef<HorizontalVector | null>(null);
  const slideCooldownUntilMsRef = useRef(0);
  const isEnabledRef = useRef(enabled);
  const controlStateRef = useRef<ControlState>(controlState);
  const unpolishedCameraPositionRef = useRef<Vec3 | null>(null);
  const isDragLookingRef = useRef(false);
  const inspectZoomFovRef = useRef<number | null>(null);
  const clearSlideState = () => {
    slideRequestRef.current = false;
    slideStateRef.current = null;
    lastSprintMomentumAtMsRef.current = null;
    lastMovementDirectionRef.current = null;
    slideCooldownUntilMsRef.current = 0;
  };
  const clearJumpState = () => {
    jumpRequestRef.current = false;
    jumpVelocityRef.current = 0;
    jumpOffsetRef.current = 0;
  };

  useEffect(() => {
    isEnabledRef.current = enabled;

    if (!enabled) {
      activeKeysRef.current.clear();
      activeShiftKeysRef.current.clear();
      isSprintActiveRef.current = false;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      clearJumpState();
      isDragLookingRef.current = false;
      inspectZoomFovRef.current = null;

      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
    }
  }, [enabled, gl]);

  useEffect(() => {
    controlStateRef.current = controlState;

    if (controlState === "idle") {
      activeKeysRef.current.clear();
      activeShiftKeysRef.current.clear();
      isSprintActiveRef.current = false;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      clearJumpState();
      isDragLookingRef.current = false;
      inspectZoomFovRef.current = null;
    }
  }, [controlState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && document.pointerLockElement === gl.domElement) {
        activeKeysRef.current.clear();
        activeShiftKeysRef.current.clear();
        isSprintActiveRef.current = false;
        movementVelocityRef.current = { x: 0, z: 0 };
        clearSlideState();
        clearJumpState();
        isDragLookingRef.current = false;
        inspectZoomFovRef.current = null;
        document.exitPointerLock();
        return;
      }

      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        if (!isEnabledRef.current || controlStateRef.current === "idle" || isInteractiveTarget(event.target)) {
          return;
        }

        event.preventDefault();
        activeShiftKeysRef.current.add(event.code);
        isSprintActiveRef.current = true;
        return;
      }

      if (event.code === JUMP_TRIGGER_CODE) {
        if (
          !isEnabledRef.current ||
          controlStateRef.current === "idle" ||
          event.repeat ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          isInteractiveTarget(event.target)
        ) {
          return;
        }

        event.preventDefault();
        jumpRequestRef.current = true;
        return;
      }

      if (event.code === SLIDE_TRIGGER_CODE) {
        if (
          !isEnabledRef.current ||
          controlStateRef.current === "idle" ||
          event.repeat ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          isInteractiveTarget(event.target)
        ) {
          return;
        }

        event.preventDefault();
        slideRequestRef.current = true;
        return;
      }

      if (
        !isEnabledRef.current ||
        controlStateRef.current === "idle" ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isInteractiveTarget(event.target) ||
        !isMovementKey(event.code)
      ) {
        return;
      }

      event.preventDefault();
      activeKeysRef.current.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        activeShiftKeysRef.current.delete(event.code);
        isSprintActiveRef.current = activeShiftKeysRef.current.size > 0;

        if (activeShiftKeysRef.current.size === 0) {
          inspectZoomFovRef.current = null;
        }

        if (isEnabledRef.current && controlStateRef.current !== "idle" && !isInteractiveTarget(event.target)) {
          event.preventDefault();
        }

        return;
      }

      if (event.code === JUMP_TRIGGER_CODE) {
        if (isEnabledRef.current && controlStateRef.current !== "idle" && !isInteractiveTarget(event.target)) {
          event.preventDefault();
        }

        return;
      }

      if (event.code === SLIDE_TRIGGER_CODE) {
        if (isEnabledRef.current && controlStateRef.current !== "idle" && !isInteractiveTarget(event.target)) {
          event.preventDefault();
        }

        return;
      }

      if (!isEnabledRef.current || controlStateRef.current === "idle" || !isMovementKey(event.code)) {
        return;
      }

      event.preventDefault();
      activeKeysRef.current.delete(event.code);
    };

    const handleBlur = () => {
      activeKeysRef.current.clear();
      activeShiftKeysRef.current.clear();
      isSprintActiveRef.current = false;
      inspectZoomFovRef.current = null;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      clearJumpState();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      activeKeysRef.current.clear();
      activeShiftKeysRef.current.clear();
      isSprintActiveRef.current = false;
      inspectZoomFovRef.current = null;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      clearJumpState();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [gl]);

  useEffect(() => {
    const canvas = gl.domElement;

    const applyLook = () => {
      const renderPosition: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
      const posePosition = unpolishedCameraPositionRef.current ?? renderPosition;

      camera.lookAt(...getLookTarget(renderPosition, lookStateRef.current));
      onLocalPoseChange({ position: posePosition, yaw: lookStateRef.current.yaw });
    };

    const updateLookFromMovement = (movementX: number, movementY: number, sensitivity: number) => {
      lookStateRef.current = {
        yaw: lookStateRef.current.yaw + movementX * sensitivity,
        pitch: clamp(lookStateRef.current.pitch - movementY * sensitivity, MIN_LOOK_PITCH, MAX_LOOK_PITCH),
      };
      applyLook();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isEnabledRef.current || event.button !== 0) {
        return;
      }

      event.preventDefault();
      canvas.focus();
      onControlStateChange("focused");

      if (canvas.requestPointerLock) {
        const lockRequest = canvas.requestPointerLock();

        if (lockRequest) {
          lockRequest.catch(() => {
            onControlStateChange("pointer-lock-unavailable");
            isDragLookingRef.current = true;
            canvas.setPointerCapture(event.pointerId);
          });
        }

        return;
      }

      onControlStateChange("pointer-lock-unavailable");
      isDragLookingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        !isEnabledRef.current ||
        controlStateRef.current === "idle" ||
        !isDragLookingRef.current ||
        document.pointerLockElement === canvas
      ) {
        return;
      }

      event.preventDefault();
      updateLookFromMovement(event.movementX, event.movementY, MOUSE_LOOK_SENSITIVITY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDragLookingRef.current = false;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const handlePointerLeave = () => {
      isDragLookingRef.current = false;
    };

    const handleDocumentPointerMove = (event: PointerEvent) => {
      if (!isEnabledRef.current || document.pointerLockElement !== canvas) {
        return;
      }

      updateLookFromMovement(event.movementX, event.movementY, POINTER_LOCK_LOOK_SENSITIVITY);
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement === canvas) {
        onControlStateChange("pointer-locked");
        isDragLookingRef.current = false;
        return;
      }

      if (controlStateRef.current === "pointer-locked") {
        activeKeysRef.current.clear();
        activeShiftKeysRef.current.clear();
        isSprintActiveRef.current = false;
        inspectZoomFovRef.current = null;
        movementVelocityRef.current = { x: 0, z: 0 };
        clearSlideState();
        isDragLookingRef.current = false;
        onControlStateChange("focused");
      }
    };

    const handlePointerLockError = () => {
      if (!isEnabledRef.current) {
        return;
      }

      onControlStateChange("pointer-lock-unavailable");
      isDragLookingRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (
        !isEnabledRef.current ||
        controlStateRef.current === "idle" ||
        !event.shiftKey ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      const perspectiveCamera = getPerspectiveCamera(camera);
      const currentFov = inspectZoomFovRef.current ?? perspectiveCamera?.fov ?? NORMAL_CAMERA_FOV;
      const direction = event.deltaY > 0 ? 1 : -1;

      inspectZoomFovRef.current = clamp(
        currentFov + direction * INSPECT_ZOOM_STEP_FOV,
        INSPECT_ZOOM_MIN_FOV,
        INSPECT_ZOOM_MAX_FOV,
      );
    };

    canvas.tabIndex = -1;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("pointermove", handleDocumentPointerMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("pointerlockerror", handlePointerLockError);

    return () => {
      isDragLookingRef.current = false;
      activeKeysRef.current.clear();
      activeShiftKeysRef.current.clear();
      isSprintActiveRef.current = false;
      inspectZoomFovRef.current = null;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      clearJumpState();

      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }

      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("wheel", handleWheel);
      document.removeEventListener("pointermove", handleDocumentPointerMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("pointerlockerror", handlePointerLockError);
    };
  }, [camera, gl, lookStateRef, onControlStateChange]);

  useFrame(({ clock }, delta) => {
    const nowMs = clock.getElapsedTime() * 1000;

    if (!enabled) {
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      inspectZoomFovRef.current = null;
      return;
    }

    if (controlState === "idle") {
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      inspectZoomFovRef.current = null;
      updateCameraFov(camera, NORMAL_CAMERA_FOV, delta);
      return;
    }

    let forward = 0;
    let strafe = 0;

    if (activeKeysRef.current.has("KeyW")) {
      forward += 1;
    }

    if (activeKeysRef.current.has("KeyS")) {
      forward -= 1;
    }

    if (activeKeysRef.current.has("KeyA")) {
      strafe -= 1;
    }

    if (activeKeysRef.current.has("KeyD")) {
      strafe += 1;
    }

    const { yaw } = lookStateRef.current;
    let dx = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
    let dz = -Math.cos(yaw) * forward + Math.sin(yaw) * strafe;

    const length = Math.hypot(dx, dz);
    const hasMovementInput = length > 0;
    const clampedWalkSpeedMultiplier = clamp(walkSpeedMultiplier, 0.5, 3);
    const movementSpeed = (isSprintActiveRef.current ? SPRINT_SPEED_UNITS_PER_SECOND : WALK_SPEED_UNITS_PER_SECOND) * clampedWalkSpeedMultiplier;

    if (hasMovementInput) {
      dx /= length;
      dz /= length;
      lastMovementDirectionRef.current = { x: dx, z: dz };

      if (isSprintActiveRef.current) {
        lastSprintMomentumAtMsRef.current = nowMs;
      }
    } else {
      dx = 0;
      dz = 0;
    }

    if (slideRequestRef.current) {
      slideRequestRef.current = false;
      const hasRecentSprintMomentum =
        lastSprintMomentumAtMsRef.current !== null && nowMs - lastSprintMomentumAtMsRef.current <= SLIDE_MOMENTUM_WINDOW_MS;
      const slideDirection = lastMovementDirectionRef.current;

      if (!slideStateRef.current && nowMs >= slideCooldownUntilMsRef.current && hasRecentSprintMomentum && slideDirection) {
        slideStateRef.current = {
          isSliding: true,
          startedAtMs: nowMs,
          direction: slideDirection,
        };
        slideCooldownUntilMsRef.current = nowMs + SLIDE_COOLDOWN_MS;
      }
    }

    const activeSlide = slideStateRef.current;
    let nextVelocity: HorizontalVector;

    if (activeSlide) {
      const slideProgress = Math.min(1, (nowMs - activeSlide.startedAtMs) / SLIDE_DURATION_MS);
      const slideSpeed = lerp(SLIDE_SPEED_UNITS_PER_SECOND, SLIDE_END_SPEED_UNITS_PER_SECOND, slideProgress) * clampedWalkSpeedMultiplier;
      nextVelocity = {
        x: activeSlide.direction.x * slideSpeed,
        z: activeSlide.direction.z * slideSpeed,
      };
    } else {
      const targetVelocityX = dx * movementSpeed;
      const targetVelocityZ = dz * movementSpeed;
      const maxVelocityDelta =
        (hasMovementInput ? MOVEMENT_ACCELERATION_UNITS_PER_SECOND : MOVEMENT_DECELERATION_UNITS_PER_SECOND) * delta;
      nextVelocity = {
        x: moveTowards(movementVelocityRef.current.x, targetVelocityX, maxVelocityDelta),
        z: moveTowards(movementVelocityRef.current.z, targetVelocityZ, maxVelocityDelta),
      };
    }

    if (!activeSlide && !hasMovementInput && Math.hypot(nextVelocity.x, nextVelocity.z) < MOVEMENT_STOP_EPSILON) {
      nextVelocity.x = 0;
      nextVelocity.z = 0;
    }

    movementVelocityRef.current = nextVelocity;

    if (!activeSlide && hasMovementInput && Math.hypot(nextVelocity.x, nextVelocity.z) >= SPRINT_SPEED_UNITS_PER_SECOND * clampedWalkSpeedMultiplier * 0.75) {
      lastSprintMomentumAtMsRef.current = nowMs;
    }

    const horizontalSpeed = Math.hypot(nextVelocity.x, nextVelocity.z);
    const currentX = camera.position.x;
    const currentZ = camera.position.z;
    const nextX = currentX + nextVelocity.x * delta;
    const nextZ = currentZ + nextVelocity.z * delta;
    const resolved =
      horizontalSpeed === 0
        ? {
            position: { x: currentX, z: currentZ },
            velocity: nextVelocity,
            collision: "none" as CollisionResolutionKind,
          }
        : resolveHorizontalMovementCollision({
            current: { x: currentX, z: currentZ },
            next: { x: nextX, z: nextZ },
            velocity: nextVelocity,
            levelConfig,
          });
    movementVelocityRef.current = resolved.velocity;

    if (activeSlide) {
      const slideProgress = Math.min(1, (nowMs - activeSlide.startedAtMs) / SLIDE_DURATION_MS);
      const resolvedSpeed = Math.hypot(resolved.velocity.x, resolved.velocity.z);

      if (resolved.collision === "blocked" || resolvedSpeed < MOVEMENT_STOP_EPSILON || slideProgress >= 1) {
        slideStateRef.current = null;
      } else if (resolved.collision === "slide-x" || resolved.collision === "slide-z") {
        slideStateRef.current = {
          ...activeSlide,
          direction: {
            x: resolved.velocity.x / resolvedSpeed,
            z: resolved.velocity.z / resolvedSpeed,
          },
        };
      }
    }

    const resolvedY = levelConfig.playerStart.position[1] + getTraversalFloorHeight(resolved.position.x, resolved.position.z, levelConfig);
    const wasGrounded = jumpOffsetRef.current <= JUMP_GROUNDED_EPSILON && jumpVelocityRef.current <= 0;

    if (jumpRequestRef.current) {
      jumpRequestRef.current = false;

      if (wasGrounded) {
        jumpVelocityRef.current = JUMP_VELOCITY_UNITS_PER_SECOND;
      }
    }

    if (jumpOffsetRef.current > 0 || jumpVelocityRef.current !== 0) {
      jumpVelocityRef.current -= JUMP_GRAVITY_UNITS_PER_SECOND * delta;
      jumpOffsetRef.current += jumpVelocityRef.current * delta;

      if (jumpOffsetRef.current <= 0) {
        jumpOffsetRef.current = 0;
        jumpVelocityRef.current = 0;
      }
    }

    const jumpOffset = jumpOffsetRef.current;
    const isAirborne = jumpOffset > JUMP_GROUNDED_EPSILON || jumpVelocityRef.current > 0;
    const resolvedSpeed = Math.hypot(resolved.velocity.x, resolved.velocity.z);
    const hasMeaningfulMovement = resolvedSpeed >= MOVEMENT_STOP_EPSILON;
    const isSprintPolishActive = !activeSlide && isSprintActiveRef.current && hasMeaningfulMovement;
    const canApplyCameraPolish = !prefersReducedMotion && hasMeaningfulMovement && !isAirborne;
    const bobAmplitude = isSprintPolishActive ? SPRINT_HEAD_BOB_AMPLITUDE : WALK_HEAD_BOB_AMPLITUDE;
    const bobFrequency = isSprintPolishActive ? SPRINT_HEAD_BOB_FREQUENCY : WALK_HEAD_BOB_FREQUENCY;
    const headBob = canApplyCameraPolish && !activeSlide
      ? Math.sin(clock.getElapsedTime() * bobFrequency) * bobAmplitude
      : 0;
    const slideDip = canApplyCameraPolish && activeSlide
      ? SLIDE_CAMERA_DIP * Math.sin(Math.min(1, (nowMs - activeSlide.startedAtMs) / SLIDE_DURATION_MS) * Math.PI)
      : 0;
    const poseY = resolvedY + jumpOffset;
    const cameraY = poseY + headBob - slideDip;
    const movementTargetFov = prefersReducedMotion
      ? NORMAL_CAMERA_FOV
      : activeSlide
        ? SLIDE_CAMERA_FOV
        : isSprintPolishActive
          ? SPRINT_CAMERA_FOV
          : NORMAL_CAMERA_FOV;
    const targetFov = inspectZoomFovRef.current ?? movementTargetFov;

    unpolishedCameraPositionRef.current = [resolved.position.x, poseY, resolved.position.z];
    updateCameraFov(camera, targetFov, delta);
    camera.position.set(resolved.position.x, cameraY, resolved.position.z);
    camera.lookAt(...getLookTarget([resolved.position.x, cameraY, resolved.position.z], lookStateRef.current));
    onLocalPoseChange({
      position: [resolved.position.x, poseY, resolved.position.z],
      yaw: lookStateRef.current.yaw,
    });
  });

  return null;
}

interface TopDownViewControllerProps {
  levelConfig: LevelConfig;
  enabled: boolean;
  isActive: boolean;
  isMenuOpen: boolean;
  lookStateRef: MutableRefObject<LookState>;
  onActiveChange: (isActive: boolean) => void;
  onFreeCamActiveChange: (isActive: boolean) => void;
  onLocalPoseChange: (pose: LocalPlayerPose) => void;
  onMarkerPositionChange: (position: Vec3 | null) => void;
}

function TopDownViewController({
  levelConfig,
  enabled,
  isActive,
  isMenuOpen,
  lookStateRef,
  onActiveChange,
  onFreeCamActiveChange,
  onLocalPoseChange,
  onMarkerPositionChange,
}: TopDownViewControllerProps) {
  const { camera, gl } = useThree();
  const firstPersonPositionRef = useRef<Vec3 | null>(null);
  const topDownEntryPositionRef = useRef<Vec3 | null>(null);
  const freeCamPositionRef = useRef<Vec3 | null>(null);
  const freeCamLookStateRef = useRef<LookState | null>(null);
  const isActiveRef = useRef(isActive);
  const isFreeCamActiveRef = useRef(false);
  const isFreeCamDragLookingRef = useRef(false);
  const activeMovementKeysRef = useRef(new Set<MovementKey>());
  const activeFreeCamVerticalKeysRef = useRef(new Set<string>());
  const activePanKeysRef = useRef(new Set<TopDownPanKey>());
  const panOffsetRef = useRef({ x: 0, z: 0 });

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const setFreeCamActive = useCallback((nextIsActive: boolean) => {
    isFreeCamActiveRef.current = nextIsActive;
    isFreeCamDragLookingRef.current = false;

    if (nextIsActive) {
      freeCamPositionRef.current = [camera.position.x, camera.position.y, camera.position.z];
      freeCamLookStateRef.current = { yaw: lookStateRef.current.yaw, pitch: -0.72 };
      panOffsetRef.current = { x: 0, z: 0 };
    } else {
      freeCamPositionRef.current = null;
      freeCamLookStateRef.current = null;
      activeFreeCamVerticalKeysRef.current.clear();
    }

    onFreeCamActiveChange(nextIsActive);
  }, [camera, lookStateRef, onFreeCamActiveChange]);

  useEffect(() => {
    if (!enabled) {
      firstPersonPositionRef.current = null;
      topDownEntryPositionRef.current = null;
      freeCamPositionRef.current = null;
      freeCamLookStateRef.current = null;
      isFreeCamDragLookingRef.current = false;
      setFreeCamActive(false);
      activeMovementKeysRef.current.clear();
      activeFreeCamVerticalKeysRef.current.clear();
      activePanKeysRef.current.clear();
      panOffsetRef.current = { x: 0, z: 0 };
      onMarkerPositionChange(null);
      onActiveChange(false);
    }
  }, [enabled, onActiveChange, onMarkerPositionChange, setFreeCamActive]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    activeMovementKeysRef.current.clear();
    activeFreeCamVerticalKeysRef.current.clear();
    activePanKeysRef.current.clear();
    isFreeCamDragLookingRef.current = false;
  }, [isMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        enabled &&
        !isMenuOpen &&
        isActiveRef.current &&
        isBackquoteToggle(event) &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isInteractiveTarget(event.target)
      ) {
        event.preventDefault();
        const nextIsFreeCamActive = !isFreeCamActiveRef.current;

        setFreeCamActive(nextIsFreeCamActive);
        activeMovementKeysRef.current.clear();

        if (!nextIsFreeCamActive) {
          panOffsetRef.current = { x: 0, z: 0 };
        }

        return;
      }

      if (enabled && !isMenuOpen && isActiveRef.current && isMovementKey(event.code) && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        activeMovementKeysRef.current.add(event.code);
        return;
      }

      if (enabled && !isMenuOpen && isActiveRef.current && isFreeCamActiveRef.current && isFreeCamVerticalKey(event.code) && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        activeFreeCamVerticalKeysRef.current.add(event.code);
        return;
      }

      if (enabled && !isMenuOpen && isActiveRef.current && isTopDownPanKey(event.code) && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        activePanKeysRef.current.add(event.code);
        return;
      }

      if (
        !enabled ||
        event.code !== TOP_DOWN_TOGGLE_CODE ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      onActiveChange(!isActiveRef.current);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isBackquoteToggle(event)) {
        if (enabled && !isMenuOpen && isActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (isMovementKey(event.code)) {
        activeMovementKeysRef.current.delete(event.code);

        if (enabled && !isMenuOpen && isActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (isFreeCamVerticalKey(event.code)) {
        activeFreeCamVerticalKeysRef.current.delete(event.code);

        if (enabled && !isMenuOpen && isActiveRef.current && isFreeCamActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (isTopDownPanKey(event.code)) {
        activePanKeysRef.current.delete(event.code);

        if (enabled && !isMenuOpen && isActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (!enabled || event.code !== TOP_DOWN_TOGGLE_CODE) {
        return;
      }

      event.preventDefault();
    };

    const handleBlur = () => {
      setFreeCamActive(false);
      activeMovementKeysRef.current.clear();
      activeFreeCamVerticalKeysRef.current.clear();
      activePanKeysRef.current.clear();
      onActiveChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      onMarkerPositionChange(null);
      setFreeCamActive(false);
      activeMovementKeysRef.current.clear();
      activeFreeCamVerticalKeysRef.current.clear();
      activePanKeysRef.current.clear();
      onActiveChange(false);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, onActiveChange, onMarkerPositionChange, setFreeCamActive]);

  useEffect(() => {
    const canvas = gl.domElement;

    const ensureFreeCamPose = () => {
      if (!freeCamPositionRef.current) {
        freeCamPositionRef.current = [camera.position.x, camera.position.y, camera.position.z];
      }

      if (!freeCamLookStateRef.current) {
        freeCamLookStateRef.current = { yaw: lookStateRef.current.yaw, pitch: -0.72 };
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!enabled || isMenuOpen || !isActiveRef.current || !isFreeCamActiveRef.current || event.button !== 0) {
        return;
      }

      event.preventDefault();
      canvas.focus();
      ensureFreeCamPose();
      isFreeCamDragLookingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabled || isMenuOpen || !isActiveRef.current || !isFreeCamActiveRef.current || !isFreeCamDragLookingRef.current) {
        return;
      }

      event.preventDefault();
      ensureFreeCamPose();
      const currentLook = freeCamLookStateRef.current;

      if (!currentLook) {
        return;
      }

      freeCamLookStateRef.current = {
        yaw: currentLook.yaw + event.movementX * MOUSE_LOOK_SENSITIVITY,
        pitch: clamp(currentLook.pitch - event.movementY * MOUSE_LOOK_SENSITIVITY, MIN_LOOK_PITCH, MAX_LOOK_PITCH),
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      isFreeCamDragLookingRef.current = false;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const handlePointerLeave = () => {
      isFreeCamDragLookingRef.current = false;
    };

    canvas.tabIndex = -1;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      isFreeCamDragLookingRef.current = false;
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [camera, enabled, gl, lookStateRef]);

  useFrame((_, delta) => {
    if (!enabled || isMenuOpen) {
      return;
    }

    if (isActive) {
      const perspectiveCamera = getPerspectiveCamera(camera);

      if (!firstPersonPositionRef.current) {
        firstPersonPositionRef.current = [camera.position.x, camera.position.y, camera.position.z];
        topDownEntryPositionRef.current = firstPersonPositionRef.current;
        onMarkerPositionChange(firstPersonPositionRef.current);
      }

      const movementKeys = activeMovementKeysRef.current;
      let forward = 0;
      let strafe = 0;

      if (movementKeys.has("KeyW")) {
        forward += 1;
      }

      if (movementKeys.has("KeyS")) {
        forward -= 1;
      }

      if (movementKeys.has("KeyA")) {
        strafe -= 1;
      }

      if (movementKeys.has("KeyD")) {
        strafe += 1;
      }

      if (isFreeCamActiveRef.current) {
        const freeCamPosition = freeCamPositionRef.current ?? [camera.position.x, camera.position.y, camera.position.z] as Vec3;
        const freeCamLookState = freeCamLookStateRef.current ?? { yaw: lookStateRef.current.yaw, pitch: -0.72 };
        const vertical =
          (activeFreeCamVerticalKeysRef.current.has("Space") || activeFreeCamVerticalKeysRef.current.has("KeyE") ? 1 : 0) -
          (activeFreeCamVerticalKeysRef.current.has("KeyQ") ||
          activeFreeCamVerticalKeysRef.current.has("ControlLeft") ||
          activeFreeCamVerticalKeysRef.current.has("ControlRight")
            ? 1
            : 0);
        const horizontal = Math.cos(freeCamLookState.pitch);
        const forwardVector = {
          x: Math.sin(freeCamLookState.yaw) * horizontal,
          y: Math.sin(freeCamLookState.pitch),
          z: -Math.cos(freeCamLookState.yaw) * horizontal,
        };
        const strafeVector = {
          x: Math.cos(freeCamLookState.yaw),
          y: 0,
          z: Math.sin(freeCamLookState.yaw),
        };
        let moveX = forwardVector.x * forward + strafeVector.x * strafe;
        let moveY = forwardVector.y * forward + vertical;
        let moveZ = forwardVector.z * forward + strafeVector.z * strafe;
        const movementLength = Math.hypot(moveX, moveY, moveZ);

        if (movementLength > 0) {
          const moveDistance = TOP_DOWN_FREE_CAM_SPEED_UNITS_PER_SECOND * delta;

          moveX = (moveX / movementLength) * moveDistance;
          moveY = (moveY / movementLength) * moveDistance;
          moveZ = (moveZ / movementLength) * moveDistance;

          freeCamPositionRef.current = [
            freeCamPosition[0] + moveX,
            clamp(freeCamPosition[1] + moveY, FREE_FLY_CAMERA_MIN_Y, FREE_FLY_CAMERA_MAX_Y),
            freeCamPosition[2] + moveZ,
          ];
        } else {
          freeCamPositionRef.current = freeCamPosition;
        }

        freeCamLookStateRef.current = freeCamLookState;
        const renderPosition = freeCamPositionRef.current;

        updateCameraFov(camera, NORMAL_CAMERA_FOV, delta);
        camera.position.set(...renderPosition);
        camera.lookAt(...getLookTarget(renderPosition, freeCamLookState));
        return;
      }

      if (forward !== 0 || strafe !== 0) {
        const { yaw } = lookStateRef.current;
        let dx = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        let dz = -Math.cos(yaw) * forward + Math.sin(yaw) * strafe;
        const length = Math.hypot(dx, dz);

        dx /= length;
        dz /= length;

        const currentPosition = firstPersonPositionRef.current;
        const velocity = {
          x: dx * WALK_SPEED_UNITS_PER_SECOND,
          z: dz * WALK_SPEED_UNITS_PER_SECOND,
        };
        const resolved = resolveHorizontalMovementCollision({
          current: { x: currentPosition[0], z: currentPosition[2] },
          next: {
            x: currentPosition[0] + velocity.x * delta,
            z: currentPosition[2] + velocity.z * delta,
          },
          velocity,
          levelConfig,
        });
        const resolvedY = levelConfig.playerStart.position[1] + getTraversalFloorHeight(resolved.position.x, resolved.position.z, levelConfig);
        const nextPosition: Vec3 = [resolved.position.x, resolvedY, resolved.position.z];

        firstPersonPositionRef.current = nextPosition;
        onMarkerPositionChange(nextPosition);
        onLocalPoseChange({ position: nextPosition, yaw: lookStateRef.current.yaw });
      }

      const panKeys = activePanKeysRef.current;
      const panX = (panKeys.has("ArrowRight") ? 1 : 0) - (panKeys.has("ArrowLeft") ? 1 : 0);
      const panZ = (panKeys.has("ArrowDown") ? 1 : 0) - (panKeys.has("ArrowUp") ? 1 : 0);

      if (panX !== 0 || panZ !== 0) {
        const length = Math.hypot(panX, panZ);
        const panDistance = TOP_DOWN_PAN_SPEED_UNITS_PER_SECOND * delta;

        panOffsetRef.current = {
          x: clamp(panOffsetRef.current.x + (panX / length) * panDistance, -TOP_DOWN_PAN_LIMIT_UNITS, TOP_DOWN_PAN_LIMIT_UNITS),
          z: clamp(panOffsetRef.current.z + (panZ / length) * panDistance, -TOP_DOWN_PAN_LIMIT_UNITS, TOP_DOWN_PAN_LIMIT_UNITS),
        };
      }

      const playerPosition = firstPersonPositionRef.current;
      const entryPosition = topDownEntryPositionRef.current ?? playerPosition;
      const playerOffsetX = playerPosition[0] - entryPosition[0];
      const playerOffsetZ = playerPosition[2] - entryPosition[2];
      const panOffset = panOffsetRef.current;
      camera.position.set(
        levelConfig.topDownCamera.position[0] + playerOffsetX + panOffset.x,
        levelConfig.topDownCamera.position[1],
        levelConfig.topDownCamera.position[2] + playerOffsetZ + panOffset.z,
      );
      camera.lookAt(
        levelConfig.topDownCamera.target[0] + playerOffsetX + panOffset.x,
        levelConfig.topDownCamera.target[1],
        levelConfig.topDownCamera.target[2] + playerOffsetZ + panOffset.z,
      );

      if (perspectiveCamera && perspectiveCamera.fov !== TOP_DOWN_CAMERA_FOV) {
        perspectiveCamera.fov = TOP_DOWN_CAMERA_FOV;
        perspectiveCamera.updateProjectionMatrix();
      }

      return;
    }

    if (firstPersonPositionRef.current) {
      const [x, y, z] = firstPersonPositionRef.current;

      camera.position.set(x, y, z);
      camera.lookAt(...getLookTarget([x, y, z], lookStateRef.current));
      firstPersonPositionRef.current = null;
      topDownEntryPositionRef.current = null;
      setFreeCamActive(false);
      activeMovementKeysRef.current.clear();
      activePanKeysRef.current.clear();
      panOffsetRef.current = { x: 0, z: 0 };
      onMarkerPositionChange(null);
    }
  });

  return null;
}

function LocalPositionMarker({ position }: { position: Vec3 }) {
  return (
    <group position={[position[0], 0.07, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.32, 28]} />
        <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
      </mesh>
      <mesh position={[0, 0.02, -0.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.14, 0.3, 3]} />
        <meshBasicMaterial args={[{ color: "#f4f7ff" }]} />
      </mesh>
    </group>
  );
}

function getFeetOriginPositionFromLocalPose(pose: LocalPlayerPose): Vec3 {
  return [
    pose.position[0],
    Math.max(0, pose.position[1] - FREE_ROAM_PRESENCE_EYE_HEIGHT),
    pose.position[2],
  ];
}

function LocalWorldPlayerAvatar({
  appearance,
  enabled,
  identity,
  isHost,
  poseRef,
  presence,
}: {
  appearance: PlayerAvatarAppearance;
  enabled: boolean;
  identity: PlayerAvatarIdentity;
  isHost: boolean;
  poseRef: MutableRefObject<LocalPlayerPose | null>;
  presence: SessionUser["presence"];
}) {
  const groupRef = useRef<ElementRef<"group">>(null);

  useFrame(() => {
    const group = groupRef.current;
    const pose = poseRef.current;

    if (!group || !pose) {
      return;
    }

    group.position.set(...getFeetOriginPositionFromLocalPose(pose));
    group.rotation.set(0, pose.yaw, 0);
  });

  if (!enabled || !poseRef.current) {
    return null;
  }

  return (
    <group ref={groupRef} position={getFeetOriginPositionFromLocalPose(poseRef.current)} rotation={[0, poseRef.current.yaw, 0]}>
      <PlayerAvatar
        identity={identity}
        appearance={appearance}
        mode="local"
        presence={presence}
        isHost={isHost}
        isReady={presence === "ready"}
        showNameplate={appearance.showNameplate}
      />
    </group>
  );
}

function clampStudioGuitarNoteIndex(noteIndex: number) {
  return Math.max(0, Math.min(STUDIO_GUITAR_NOTE_SPECS.length - 1, noteIndex));
}

function getStudioGuitarBankStartIndex(noteIndex: number) {
  return Math.floor(clampStudioGuitarNoteIndex(noteIndex) / STUDIO_GUITAR_BANK_SIZE) * STUDIO_GUITAR_BANK_SIZE;
}

function getStudioGuitarSlotIndex(noteIndex: number) {
  return clampStudioGuitarNoteIndex(noteIndex) - getStudioGuitarBankStartIndex(noteIndex);
}

function getStudioGuitarBankLabel(noteIndex: number) {
  const bankStartIndex = getStudioGuitarBankStartIndex(noteIndex);
  const bankEndIndex = Math.min(bankStartIndex + STUDIO_GUITAR_BANK_SIZE - 1, STUDIO_GUITAR_NOTE_SPECS.length - 1);
  const bankNumber = Math.floor(bankStartIndex / STUDIO_GUITAR_BANK_SIZE) + 1;
  const startLabel = STUDIO_GUITAR_NOTE_SPECS[bankStartIndex]?.label ?? STUDIO_GUITAR_NOTE_SPECS[0].label;
  const endLabel = STUDIO_GUITAR_NOTE_SPECS[bankEndIndex]?.label ?? startLabel;

  return `B${bankNumber} ${startLabel}-${endLabel}`;
}

function getStudioGuitarNoteIndexForCode(code: string, currentNoteIndex: number) {
  const bankStartIndex = getStudioGuitarBankStartIndex(currentNoteIndex);

  if (/^Digit[1-9]$/.test(code)) {
    return clampStudioGuitarNoteIndex(bankStartIndex + Number(code.slice("Digit".length)) - 1);
  }

  if (/^Numpad[1-9]$/.test(code)) {
    return clampStudioGuitarNoteIndex(bankStartIndex + Number(code.slice("Numpad".length)) - 1);
  }

  return null;
}

function getStudioGuitarBankShiftForCode(code: string) {
  if (code === "KeyQ") {
    return -STUDIO_GUITAR_BANK_SIZE;
  }

  if (code === "KeyE") {
    return STUDIO_GUITAR_BANK_SIZE;
  }

  return 0;
}

function isKeyboardInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function playStudioGuitarNote({
  localDawAudioActions,
  noteIndex,
  onBroadcastDawLiveSound,
}: {
  localDawAudioActions: LocalDawAudioEngineActions;
  noteIndex: number;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
}) {
  const note = STUDIO_GUITAR_NOTE_SPECS[noteIndex] ?? STUDIO_GUITAR_NOTE_SPECS[0];

  localDawAudioActions.playFmSynthNote(note);
  onBroadcastDawLiveSound?.({
    areaId: "recording-studio",
    kind: "fm-synth",
    label: `Guitar ${note.label}`,
    frequency: note.frequency,
    durationSeconds: note.durationSeconds,
    gainScale: note.gainScale,
    fmSynthPatch: note.fmSynthPatch,
  });
}

function getStudioGuitarAudioReadiness(localDawAudioState?: LocalDawAudioEngineState): StudioGuitarAudioReadiness {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return { label: "SILENT", reason: "ENGINE OFF" };
  }

  if (localDawAudioState.isMuted) {
    return { label: "SILENT", reason: "MUTED" };
  }

  if (localDawAudioState.masterVolume <= 0) {
    return { label: "SILENT", reason: "VOLUME 0" };
  }

  return { label: "AUDIBLE", reason: "ENGINE READY" };
}

function createHeldGuitarStatusCanvas({
  accentColor,
  caption,
  isActive,
  label,
}: {
  accentColor: string;
  caption: string;
  isActive?: boolean;
  label: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#050914";
  context.globalAlpha = 0.84;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = isActive ? 0.72 : 0.38;
  context.strokeStyle = accentColor;
  context.lineWidth = 6;
  context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  context.globalAlpha = 1;
  context.fillStyle = accentColor;
  context.font = "700 28px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), canvas.width / 2, 39);
  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.72;
  context.font = "700 16px monospace";
  context.fillText(caption.toUpperCase(), canvas.width / 2, 64);
  context.globalAlpha = 1;

  return canvas;
}

function StudioHeldGuitarController({
  isRecordingEnabled,
  isHeld,
  isMenuOpen,
  localDawAudioActions,
  noteIndex,
  onFeedback,
  onBroadcastDawLiveSound,
  onNoteIndexChange,
  onRecordNote,
}: {
  isRecordingEnabled: boolean;
  isHeld: boolean;
  isMenuOpen: boolean;
  localDawAudioActions: LocalDawAudioEngineActions;
  noteIndex: number;
  onFeedback: (noteIndex: number, source: StudioGuitarInputSource) => void;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  onNoteIndexChange: (noteIndex: number) => void;
  onRecordNote: (noteIndex: number) => void;
}) {
  const { subscribeToShot } = useInteractionRegistry();
  const isHeldRef = useRef(isHeld);
  const noteIndexRef = useRef(noteIndex);

  useEffect(() => {
    isHeldRef.current = isHeld;
  }, [isHeld]);

  useEffect(() => {
    noteIndexRef.current = noteIndex;
  }, [noteIndex]);

  const playNote = useCallback((nextNoteIndex: number) => {
    playStudioGuitarNote({
      localDawAudioActions,
      noteIndex: nextNoteIndex,
      onBroadcastDawLiveSound,
    });
    if (isRecordingEnabled) {
      onRecordNote(nextNoteIndex);
    }
  }, [isRecordingEnabled, localDawAudioActions, onBroadcastDawLiveSound, onRecordNote]);

  useEffect(() => subscribeToShot(() => {
    if (!isHeldRef.current || isMenuOpen) {
      return;
    }

    onFeedback(noteIndexRef.current, "click");
    playNote(noteIndexRef.current);
  }), [isMenuOpen, onFeedback, playNote, subscribeToShot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isHeldRef.current ||
        isMenuOpen ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isKeyboardInputTarget(event.target)
      ) {
        return;
      }

      const bankShift = getStudioGuitarBankShiftForCode(event.code);

      if (bankShift !== 0) {
        const nextNoteIndex = clampStudioGuitarNoteIndex(noteIndexRef.current + bankShift);

        if (nextNoteIndex === noteIndexRef.current) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        noteIndexRef.current = nextNoteIndex;
        onNoteIndexChange(nextNoteIndex);
        onFeedback(nextNoteIndex, "keyboard");
        return;
      }

      const nextNoteIndex = getStudioGuitarNoteIndexForCode(event.code, noteIndexRef.current);

      if (nextNoteIndex === null) {
        return;
      }

      event.preventDefault();
      noteIndexRef.current = nextNoteIndex;
      onNoteIndexChange(nextNoteIndex);
      onFeedback(nextNoteIndex, "keyboard");
      playNote(nextNoteIndex);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, onFeedback, onNoteIndexChange, playNote]);

  return null;
}

function HeldStudioGuitar({
  audioReadiness,
  bankLabel,
  feedbackKey,
  noteIndex,
  noteLabel,
  recordingStatus,
}: {
  audioReadiness: StudioGuitarAudioReadiness;
  bankLabel: string;
  feedbackKey: number;
  noteIndex: number;
  noteLabel: string;
  recordingStatus: StudioGuitarRecordingStatus;
}) {
  const noteCanvas = useMemo(() => createHeldGuitarStatusCanvas({
    accentColor: "#57f3ff",
    caption: `${getStudioGuitarSlotIndex(noteIndex) + 1} / ${bankLabel}`,
    isActive: true,
    label: `Note ${noteLabel}`,
  }), [bankLabel, noteIndex, noteLabel]);
  const statusCanvas = useMemo(() => createHeldGuitarStatusCanvas({
    accentColor: audioReadiness.label === "AUDIBLE" ? "#73ff4c" : "#f8d36a",
    caption: audioReadiness.reason,
    isActive: audioReadiness.label === "AUDIBLE",
    label: audioReadiness.label,
  }), [audioReadiness.label, audioReadiness.reason]);
  const recordingCanvas = useMemo(() => createHeldGuitarStatusCanvas({
    accentColor: recordingStatus.isEnabled ? "#ff667c" : "#57f3ff",
    caption: recordingStatus.caption,
    isActive: recordingStatus.isEnabled,
    label: recordingStatus.label,
  }), [recordingStatus.caption, recordingStatus.isEnabled, recordingStatus.label]);
  const strumFlashOpacity = feedbackKey > 0 ? 0.82 : 0.48;

  return (
    <group position={[0.28, -0.34, -0.42]} rotation={[0.12, -0.32, -0.18]}>
      <mesh position={[0, 0, 0]} scale={[1.05, 0.72, 0.16]}>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshStandardMaterial args={[{ color: "#8b4b25", emissive: "#2a1208", emissiveIntensity: 0.16, roughness: 0.58, metalness: 0.03 }]} />
      </mesh>
      <mesh position={[0.1, 0.005, -0.012]} scale={[0.56, 0.4, 0.03]}>
        <sphereGeometry args={[0.1, 20, 10]} />
        <meshBasicMaterial args={[{ color: "#12090a", transparent: true, opacity: 0.74, toneMapped: false }]} />
      </mesh>
      <mesh position={[0.03, 0.012, -0.055]} rotation={[0, 0, -0.02]}>
        <boxGeometry args={[0.42, 0.018, 0.018]} />
        <meshStandardMaterial args={[{ color: "#e8d3a0", emissive: "#453013", emissiveIntensity: 0.08, roughness: 0.42 }]} />
      </mesh>
      <mesh position={[0.45, 0.016, -0.058]} rotation={[0, 0, -0.02]}>
        <boxGeometry args={[0.48, 0.07, 0.045]} />
        <meshStandardMaterial args={[{ color: "#5b321d", emissive: "#1b0c06", emissiveIntensity: 0.12, roughness: 0.52 }]} />
      </mesh>
      <mesh position={[0.72, 0.018, -0.058]} rotation={[0, 0, -0.02]}>
        <boxGeometry args={[0.13, 0.12, 0.05]} />
        <meshStandardMaterial args={[{ color: "#32170e", roughness: 0.5, metalness: 0.02 }]} />
      </mesh>
      {[-0.032, -0.018, -0.004, 0.01, 0.024, 0.038].map((y, index) => (
        <mesh key={index} position={[0.36, y + 0.016, -0.087]} rotation={[0, 0, -0.02]}>
          <boxGeometry args={[0.75, 0.003, 0.004]} />
          <meshBasicMaterial args={[{ color: "#d8efff", transparent: true, opacity: 0.64, toneMapped: false }]} />
        </mesh>
      ))}
      <mesh position={[-0.1, -0.17, -0.09]}>
        <boxGeometry args={[0.2, 0.052, 0.018]} />
        <meshBasicMaterial args={[{ color: "#f8d36a", transparent: true, opacity: 0.72, toneMapped: false }]} />
      </mesh>
      <mesh position={[-0.1, -0.222, -0.09]}>
        <boxGeometry args={[0.15, 0.02, 0.016]} />
        <meshBasicMaterial args={[{ color: "#e9fbff", transparent: true, opacity: 0.5, toneMapped: false }]} />
      </mesh>
      <mesh position={[-0.1, -0.172, -0.12]}>
        <boxGeometry args={[0.16, 0.018, 0.012]} />
        <meshBasicMaterial args={[{ color: noteLabel.includes("#") ? "#f64fff" : "#57f3ff", transparent: true, opacity: strumFlashOpacity, toneMapped: false }]} />
      </mesh>
      <mesh position={[-0.04, 0.2, -0.13]} rotation={[0, 0, -0.12]}>
        <planeGeometry args={[0.34, 0.13]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.82, toneMapped: false }]} >
          <canvasTexture key={`held-guitar-note-${noteLabel}-${noteIndex}-${feedbackKey}`} attach="map" args={[noteCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0.4, -0.17, -0.13]} rotation={[0, 0, -0.06]}>
        <planeGeometry args={[0.32, 0.12]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: audioReadiness.label === "AUDIBLE" ? 0.56 : 0.88, toneMapped: false }]} >
          <canvasTexture key={`held-guitar-status-${audioReadiness.label}-${audioReadiness.reason}`} attach="map" args={[statusCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0.36, 0.05, -0.13]} rotation={[0, 0, -0.08]}>
        <planeGeometry args={[0.34, 0.12]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: recordingStatus.isEnabled ? 0.84 : 0.58, toneMapped: false }]} >
          <canvasTexture key={`held-guitar-recording-${recordingStatus.label}-${recordingStatus.caption}`} attach="map" args={[recordingCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function FirstPersonBody({
  avatarAppearance,
  enabled,
  guitarAudioReadiness,
  guitarBankLabel,
  guitarFeedbackKey,
  guitarRecordingStatus,
  studioGuitarNoteIndex,
  heldStudioInstrument,
  studioGuitarNoteLabel,
}: {
  avatarAppearance: PlayerAvatarAppearance;
  enabled: boolean;
  guitarAudioReadiness: StudioGuitarAudioReadiness;
  guitarBankLabel: string;
  guitarFeedbackKey: number;
  guitarRecordingStatus: StudioGuitarRecordingStatus;
  studioGuitarNoteIndex: number;
  heldStudioInstrument: HeldStudioInstrument;
  studioGuitarNoteLabel: string;
}) {
  const { camera } = useThree();
  const bodyRef = useRef<React.ElementRef<"group">>(null);

  useFrame(({ clock }) => {
    if (!bodyRef.current || !enabled) {
      return;
    }

    const bob = Math.sin(clock.getElapsedTime() * 4) * 0.006;

    bodyRef.current.position.set(0, -0.78 + bob, -0.92);
    bodyRef.current.rotation.set(-0.08, 0, 0);
  });

  useEffect(() => {
    if (!enabled || !bodyRef.current) {
      return;
    }

    const body = bodyRef.current;
    camera.add(body);

    return () => {
      camera.remove(body);
    };
  }, [camera, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <group ref={bodyRef}>
      <mesh position={[0, -0.08, 0.04]} rotation={[0.14, 0, 0]}>
        <boxGeometry args={[0.48, 0.48, 0.28]} />
        <meshStandardMaterial args={[{ color: avatarAppearance.bodyColor, roughness: 0.72, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[-0.34, -0.1, -0.16]} rotation={[0.02, 0.04, -0.22]}>
        <capsuleGeometry args={[0.055, 0.42, 8, 16]} />
        <meshStandardMaterial args={[{ color: avatarAppearance.bodyColor, roughness: 0.66, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0.34, -0.1, -0.16]} rotation={[0.02, -0.04, 0.22]}>
        <capsuleGeometry args={[0.055, 0.42, 8, 16]} />
        <meshStandardMaterial args={[{ color: avatarAppearance.bodyColor, roughness: 0.66, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[-0.42, -0.38, -0.28]} rotation={[0.1, 0.12, -0.16]}>
        <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
        <meshStandardMaterial args={[{ color: avatarAppearance.accentColor, roughness: 0.62, metalness: 0.02 }]} />
      </mesh>
      <mesh position={[0.42, -0.38, -0.28]} rotation={[0.1, -0.12, 0.16]}>
        <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
        <meshStandardMaterial args={[{ color: avatarAppearance.accentColor, roughness: 0.62, metalness: 0.02 }]} />
      </mesh>
      <mesh position={[-0.15, -0.68, -0.04]} rotation={[0.16, 0, -0.05]}>
        <capsuleGeometry args={[0.075, 0.54, 8, 16]} />
        <meshStandardMaterial args={[{ color: "#16233a", roughness: 0.76, metalness: 0.03 }]} />
      </mesh>
      <mesh position={[0.15, -0.68, -0.04]} rotation={[0.16, 0, 0.05]}>
        <capsuleGeometry args={[0.075, 0.54, 8, 16]} />
        <meshStandardMaterial args={[{ color: "#16233a", roughness: 0.76, metalness: 0.03 }]} />
      </mesh>
      <mesh position={[-0.17, -0.99, -0.23]} rotation={[0.07, 0.04, 0]}>
        <boxGeometry args={[0.16, 0.09, 0.34]} />
        <meshStandardMaterial args={[{ color: avatarAppearance.accentColor, roughness: 0.8, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0.17, -0.99, -0.23]} rotation={[0.07, -0.04, 0]}>
        <boxGeometry args={[0.16, 0.09, 0.34]} />
        <meshStandardMaterial args={[{ color: avatarAppearance.accentColor, roughness: 0.8, metalness: 0.04 }]} />
      </mesh>
      {heldStudioInstrument === "guitar" ? (
        <HeldStudioGuitar
          audioReadiness={guitarAudioReadiness}
          bankLabel={guitarBankLabel}
          feedbackKey={guitarFeedbackKey}
          noteIndex={studioGuitarNoteIndex}
          noteLabel={studioGuitarNoteLabel}
          recordingStatus={guitarRecordingStatus}
        />
      ) : null}
    </group>
  );
}

function hasMeaningfulPoseChange(previousPose: LocalPlayerPose | null, nextPose: LocalPlayerPose) {
  if (!previousPose) {
    return true;
  }

  const dx = previousPose.position[0] - nextPose.position[0];
  const dy = previousPose.position[1] - nextPose.position[1];
  const dz = previousPose.position[2] - nextPose.position[2];
  const positionDelta = Math.hypot(dx, dy, dz);
  const yawDelta = Math.abs(previousPose.yaw - nextPose.yaw);

  return positionDelta > FREE_ROAM_POSITION_EPSILON || yawDelta > FREE_ROAM_YAW_EPSILON;
}

function hasMeaningfulPositionChange(previousPose: LocalPlayerPose | null, nextPose: LocalPlayerPose) {
  if (!previousPose) {
    return true;
  }

  const dx = previousPose.position[0] - nextPose.position[0];
  const dy = previousPose.position[1] - nextPose.position[1];
  const dz = previousPose.position[2] - nextPose.position[2];

  return Math.hypot(dx, dy, dz) > FREE_ROAM_POSITION_EPSILON;
}

function FreeRoamPresenceReporter({
  currentAreaIdRef,
  enabled,
  levelId,
  localPlayerPoseRef,
  onUpdateFreeRoamPresence,
}: {
  currentAreaIdRef: MutableRefObject<string | null>;
  enabled: boolean;
  levelId: string;
  localPlayerPoseRef: MutableRefObject<LocalPlayerPose | null>;
  onUpdateFreeRoamPresence: (presence: FreeRoamPresenceUpdate) => void;
}) {
  const lastSentAtMsRef = useRef(0);
  const lastSentAreaIdRef = useRef<string | null>(null);
  const lastSentLevelIdRef = useRef<string | null>(null);
  const lastSentPoseRef = useRef<LocalPlayerPose | null>(null);

  useFrame(({ clock }) => {
    if (!enabled || !localPlayerPoseRef.current) {
      return;
    }

    const nowMs = clock.getElapsedTime() * 1000;
    const currentAreaId = currentAreaIdRef.current;
    const shouldSendForArea = lastSentAreaIdRef.current !== currentAreaId;
    const shouldSendForLevel = lastSentLevelIdRef.current !== levelId;
    const shouldSendForPose = hasMeaningfulPoseChange(lastSentPoseRef.current, localPlayerPoseRef.current);

    if (!shouldSendForArea && !shouldSendForLevel && !shouldSendForPose) {
      return;
    }

    if (!shouldSendForArea && !shouldSendForLevel && nowMs - lastSentAtMsRef.current < FREE_ROAM_PRESENCE_INTERVAL_MS) {
      return;
    }

    lastSentAtMsRef.current = nowMs;
    lastSentAreaIdRef.current = currentAreaId;
    lastSentLevelIdRef.current = levelId;
    lastSentPoseRef.current = {
      position: [...localPlayerPoseRef.current.position],
      yaw: localPlayerPoseRef.current.yaw,
    };
    onUpdateFreeRoamPresence({
      levelId,
      areaId: currentAreaId,
      position: localPlayerPoseRef.current.position,
      yaw: localPlayerPoseRef.current.yaw,
    });
  });

  return null;
}

function LocalDawClockController({
  localDawActions,
  localDawAudioActions,
  localDawState,
}: {
  localDawActions: LocalDawActions;
  localDawAudioActions: LocalDawAudioEngineActions;
  localDawState: LocalDawState;
}) {
  const localDawStateRef = useRef(localDawState);
  const triggeredPlaybackKeysRef = useRef(new Set<string>());

  useEffect(() => {
    localDawStateRef.current = localDawState;
  }, [localDawState]);

  useEffect(() => {
    triggeredPlaybackKeysRef.current.clear();
  }, [
    localDawState.clips,
    localDawState.midiNotes,
    localDawState.transport.bpm,
    localDawState.transport.state,
  ]);

  useEffect(() => {
    if (localDawState.transport.state !== "playing") {
      triggeredPlaybackKeysRef.current.clear();
      return undefined;
    }

    const intervalMs = 60000 / localDawState.transport.bpm;
    const intervalId = window.setInterval(() => {
      const currentState = localDawStateRef.current;
      const currentBeat = currentState.transport.beat;
      const playingClips = currentState.clips.filter((clip) => clip.state === "playing");

      triggeredPlaybackKeysRef.current.clear();
      localDawAudioActions.playMetronomeTick(currentBeat === 1);

      playingClips.forEach((clip) => {
        const relativeBar = ((currentState.transport.bar - 1) % clip.lengthBars) + 1;
        const notesToPlay = currentState.midiNotes.filter((note) => (
          note.clipId === clip.id &&
          note.startBar === relativeBar &&
          note.startBeat === currentBeat
        ));

        notesToPlay.forEach((note) => {
          const playbackKey = `${clip.id}:${note.id}:${currentState.transport.bar}:${currentBeat}`;

          if (triggeredPlaybackKeysRef.current.has(playbackKey)) {
            return;
          }

          triggeredPlaybackKeysRef.current.add(playbackKey);
          playLocalDawClipNote(note, localDawAudioActions, currentState);
          localDawActions.markClipNotePlayback({
            bar: currentState.transport.bar,
            beat: currentBeat,
            clipId: clip.id,
            label: note.label,
            noteId: note.id,
            trackId: note.trackId,
          });
        });
      });

      localDawActions.advanceTransportBeat();
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [
    localDawActions,
    localDawAudioActions,
    localDawState.transport.bpm,
    localDawState.transport.state,
  ]);

  return null;
}

function getClipPlaybackDurationSeconds(note: LocalDawMidiNoteEvent) {
  return Math.max(0.08, Math.min(1.2, note.durationBeats * (60 / note.recordedAtBpm)));
}

function getBassPlaybackFrequency(frequency: number) {
  let nextFrequency = frequency;

  while (nextFrequency > 110) {
    nextFrequency /= 2;
  }

  return Math.max(41.2, Math.min(220, nextFrequency));
}

function getDrumPlaybackHit(note: LocalDawMidiNoteEvent): Parameters<LocalDawAudioEngineActions["playDrumVoice"]>[0] {
  const label = note.label.toUpperCase();

  if (label.includes("C") || note.frequency < 150) {
    return { kind: "kick", label: "Kick" };
  }

  if (label.includes("D") || label.includes("E")) {
    return { kind: "snare", label: "Snare" };
  }

  return { kind: "hat", label: "Hat" };
}

function getLocalDawTrackGainScale(localDawState: LocalDawState, trackId: DawTrackId) {
  const track = localDawState.tracks.find((candidate) => candidate.id === trackId);

  if (!track || track.muted) {
    return 0;
  }

  return Math.max(0, Math.min(1, track.volume));
}

function playLocalDawClipNote(note: LocalDawMidiNoteEvent, localDawAudioActions: LocalDawAudioEngineActions, localDawState: LocalDawState) {
  const durationSeconds = getClipPlaybackDurationSeconds(note);
  const trackId: DawTrackId = note.trackId;
  const gainScale = getLocalDawTrackGainScale(localDawState, trackId);

  if (trackId === "fm-synth") {
    localDawAudioActions.playFmSynthNote({
      durationSeconds,
      fmSynthPatch: note.source === "guitar-live" ? STUDIO_GUITAR_FM_PATCH : undefined,
      frequency: note.frequency,
      gainScale,
      label: note.source === "guitar-live" ? `Loop ${note.label}` : note.label,
    });
    return;
  }

  if (trackId === "piano") {
    localDawAudioActions.playPianoLiveNote({
      durationSeconds,
      frequency: note.frequency,
      gainScale,
      label: note.label,
    }, "fm-synth");
    return;
  }

  if (trackId === "bass") {
    localDawAudioActions.playBassNote({
      durationSeconds,
      frequency: getBassPlaybackFrequency(note.frequency),
      gainScale,
      label: note.label,
    });
    return;
  }

  if (trackId === "drums") {
    localDawAudioActions.playDrumVoice({
      ...getDrumPlaybackHit(note),
      gainScale,
    });
  }
}

function ThreeDStatusPanel({ status, onExit }: { status: ThreeDStatus; onExit: () => void }) {
  const isRecoverableFailure = status === "unsupported" || status === "error";
  const title = isRecoverableFailure ? "This view could not start on this device." : "Starting view...";
  const detail = status === "unsupported"
    ? "WebGL is unavailable in this browser or device."
    : status === "error"
      ? "The 3D renderer reported an error."
      : "Preparing the renderer.";

  return (
    <div className="three-d-shell-panel" role={isRecoverableFailure ? "alert" : "status"} aria-live="polite">
      <strong>{title}</strong>
      <span>{detail}</span>
      <button type="button" className="three-d-shell-panel-exit" onClick={onExit}>
        Exit
      </button>
    </div>
  );
}

function getRequestedLevelId() {
  return new URLSearchParams(window.location.search).get("level") ?? DEFAULT_LEVEL_ID;
}

function getUserStationAssignments(users: SessionUser[], levelConfig: LevelConfig) {
  return [...users]
    .sort((firstUser, secondUser) => {
      const joinedAtComparison = firstUser.joinedAt.localeCompare(secondUser.joinedAt);

      if (joinedAtComparison !== 0) {
        return joinedAtComparison;
      }

      return firstUser.id.localeCompare(secondUser.id);
    })
    .slice(0, levelConfig.stations.length)
    .map((user, index) => ({
      user,
      station: levelConfig.stations[index],
    }))
    .filter((assignment): assignment is { user: SessionUser; station: LevelConfig["stations"][number] } => Boolean(assignment.station));
}

function resolveLocalStation(
  stationAssignments: Array<{ user: SessionUser; station: LevelConfig["stations"][number] }>,
  levelConfig: LevelConfig,
  localUserId: string,
): ResolvedLocalStation {
  const joinedAssignment = stationAssignments.find((assignment) => assignment.user.id === localUserId);

  if (joinedAssignment) {
    return {
      station: joinedAssignment.station,
      source: "joined",
    };
  }

  const assignedStationIds = new Set(stationAssignments.map((assignment) => assignment.station.id));
  const temporaryStation = levelConfig.stations.find((station) => !assignedStationIds.has(station.id)) ?? levelConfig.stations[0] ?? null;

  if (temporaryStation) {
    return {
      station: temporaryStation,
      source: "temporary",
    };
  }

  return {
    station: null,
    source: "emergency",
  };
}

function playSharedDawLiveSound(
  sound: SharedDawLiveSoundEvent,
  localDawAudioActions: LocalDawAudioEngineActions,
  schedule?: { startDelayMs: number; lateByMs: number },
) {
  const gainScale = sound.gainScale ?? 1;

  if (sound.kind === "drum" && sound.drumKind) {
    localDawAudioActions.playDrumVoice({
      kind: sound.drumKind,
      label: sound.label,
      gainScale,
    }, { allowSound: true });
    return;
  }

  if (sound.kind === "bass-pattern") {
    localDawAudioActions.playBassPatternAudition(gainScale, sound.bassMachinePatch);
    return;
  }

  if (sound.kind === "bass" && typeof sound.frequency === "number") {
    localDawAudioActions.playBassNote({
      label: sound.label,
      frequency: sound.frequency,
      durationSeconds: sound.durationSeconds,
      gainScale,
      bassMachinePatch: sound.bassMachinePatch,
    });
    return;
  }

  if (sound.kind === "piano" && typeof sound.frequency === "number") {
    const scheduledStartDelaySeconds = schedule ? Math.max(0, schedule.startDelayMs) / 1000 : undefined;

    localDawAudioActions.playPianoLiveNote({
      label: sound.label,
      frequency: sound.frequency,
      durationSeconds: sound.durationSeconds,
      gainScale,
      bassMachinePatch: sound.bassMachinePatch,
      fmSynthPatch: sound.fmSynthPatch,
    }, sound.pianoTarget ?? "fm-synth", {
      allowSound: true,
      scheduledStartDelaySeconds,
      latencyTrace: {
        source: "shared-daw-live-piano",
        handlerAtMs: performance.now(),
        scheduledStartDelayMs: schedule?.startDelayMs,
        remoteLateByMs: schedule?.lateByMs,
      },
    });
    return;
  }

  if (sound.kind === "fm-synth" && typeof sound.frequency === "number") {
    localDawAudioActions.playFmSynthNote({
      label: sound.label,
      frequency: sound.frequency,
      durationSeconds: sound.durationSeconds,
      gainScale,
      fmSynthPatch: sound.fmSynthPatch,
    });
  }
}

export function ThreeDModeShell({
  countdownDisplay,
  users,
  localUserId,
  ownerId,
  roundNumber,
  rangeScoreboard,
  onSubmitRangeScore,
  freeRoamPresence,
  onUpdateFreeRoamPresence,
  onClearFreeRoamPresence,
  jukeboxDisplay,
  jukeboxActions,
  soundCloudBooth,
  sharedDawTransport,
  sharedDawClips,
  sharedDawLiveSound,
  syncStatus,
  canControlSharedDawTransport,
  canAdminSharedDawClips,
  canWatchReadyHold,
  watchReadyHoldStatus,
  onSetSharedDawTempo,
  onPlaySharedDawTransport,
  onStopSharedDawTransport,
  onPublishSharedDawClip,
  onClearSharedDawClip,
  onBroadcastDawLiveSound,
  onStartWatchReadyHold,
  onEndWatchReadyHold,
  studioGuitar,
  onPickupStudioGuitar,
  onDropStudioGuitar,
  onExit,
}: ThreeDModeShellProps) {
  const [currentLevelId, setCurrentLevelId] = useState(getRequestedLevelId);
  const levelConfig = getLevelConfig(currentLevelId);
  const [status, setStatus] = useState<ThreeDStatus>("checking");
  const [controlState, setControlState] = useState<ControlState>("idle");
  const [revealState, setRevealState] = useState<RevealState>("revealing");
  const [isTopDownViewActive, setIsTopDownViewActive] = useState(false);
  const [isTopDownFreeCamActive, setIsTopDownFreeCamActive] = useState(false);
  const [isWatchViewActive, setIsWatchViewActive] = useState(false);
  const [isWatchReadyHolding, setIsWatchReadyHolding] = useState(false);
  const [isStudioGuitarRecordingEnabled, setIsStudioGuitarRecordingEnabled] = useState(false);
  const [studioGuitarNoteIndex, setStudioGuitarNoteIndex] = useState(0);
  const [studioGuitarFeedback, setStudioGuitarFeedback] = useState<StudioGuitarFeedbackState | null>(null);
  const [topDownMarkerPosition, setTopDownMarkerPosition] = useState<Vec3 | null>(null);
  const [currentAreaId, setCurrentAreaId] = useState<string | null>(null);
  const [areaFeedback, setAreaFeedback] = useState<AreaFeedbackState | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);
  const [isEscapeMenuOpen, setIsEscapeMenuOpen] = useState(false);
  const [escapeMenuTab, setEscapeMenuTab] = useState<EscapeMenuTab>("visual");
  const [threeDSettings, setThreeDSettings] = useState<ThreeDSettingsState>(DEFAULT_THREE_D_SETTINGS);
  const [interactionPerformanceSample, setInteractionPerformanceSample] = useState<InteractionPerformanceSample | null>(null);
  const [rendererPerformanceSample, setRendererPerformanceSample] = useState<RendererPerformanceSample | null>(null);
  const [localAvatarAppearance, setLocalAvatarAppearance] = useState<PlayerAvatarAppearance>(() => loadLocalAvatarAppearance());
  const lookStateRef = useRef<LookState>({ ...INITIAL_LOOK_STATE });
  const localPlayerPoseRef = useRef<LocalPlayerPose | null>(null);
  const currentAreaIdRef = useRef<string | null>(null);
  const areaFeedbackKeyRef = useRef(0);
  const lastPlayedSharedDawLiveSoundIdRef = useRef<string | null>(null);
  const isLocalHoldingStudioGuitarRef = useRef(false);
  const isWatchReadyHoldingRef = useRef(false);
  const startWatchReadyHold = useCallback(() => {
    if (isWatchReadyHoldingRef.current || !canWatchReadyHold) {
      return;
    }

    isWatchReadyHoldingRef.current = true;
    setIsWatchReadyHolding(true);
    onStartWatchReadyHold();
  }, [canWatchReadyHold, onStartWatchReadyHold]);
  const endWatchReadyHold = useCallback(() => {
    if (!isWatchReadyHoldingRef.current) {
      return;
    }

    isWatchReadyHoldingRef.current = false;
    setIsWatchReadyHolding(false);
    onEndWatchReadyHold();
  }, [onEndWatchReadyHold]);
  const { state: localDawState, actions: localDawActions } = useLocalDawState();
  const { state: localDawAudioState, actions: localDawAudioActions } = useLocalDawAudioEngine();
  const stationAssignments = useMemo(() => getUserStationAssignments(users, levelConfig), [levelConfig, users]);
  const resolvedLocalStation = useMemo(
    () => resolveLocalStation(stationAssignments, levelConfig, localUserId),
    [levelConfig, localUserId, stationAssignments],
  );
  const localUser = useMemo(() => users.find((user) => user.id === localUserId) ?? null, [localUserId, users]);
  const localAvatarIdentity = useMemo<PlayerAvatarIdentity>(
    () => ({
      id: localUser?.id ?? localUserId,
      displayName: localUser?.displayName ?? "You",
      avatarSeed: localUser?.avatarSeed ?? localUserId,
      isTestUser: localUser?.isTestUser,
    }),
    [localUser?.avatarSeed, localUser?.displayName, localUser?.id, localUser?.isTestUser, localUserId],
  );

  useEffect(() => {
    if (!threeDSettings.showFps) {
      setInteractionPerformanceSample(null);
      setRendererPerformanceSample(null);
    }
  }, [threeDSettings.showFps]);

  const localStation = resolvedLocalStation.station;
  const [transitionArrivalOverride, setTransitionArrivalOverride] = useState<TransitionArrivalOverride | null>(null);
  const revealRig = useMemo(() => (
    getStationRevealRig(
      levelConfig,
      localStation ?? undefined,
      transitionArrivalOverride?.levelId === levelConfig.id ? transitionArrivalOverride : undefined,
    )
  ), [levelConfig, localStation, transitionArrivalOverride]);
  const canRenderCanvas = status === "loading" || status === "ready";
  const areInteractionsEnabled = status === "ready" && revealState === "complete" && (
    ((!isTopDownViewActive && controlState !== "idle") ||
    isTopDownFreeCamActive) &&
    !isEscapeMenuOpen
  );
  const canShowAreaFeedback = status === "ready" && revealState === "complete";
  const updateLocalPlayerPose = useCallback((pose: LocalPlayerPose) => {
    const previousPose = localPlayerPoseRef.current;
    localPlayerPoseRef.current = pose;

    if (currentAreaIdRef.current && !hasMeaningfulPositionChange(previousPose, pose)) {
      return;
    }

    const area = getAreaForPosition(pose.position, levelConfig);
    const nextAreaId = area?.id ?? null;

    if (nextAreaId === currentAreaIdRef.current) {
      return;
    }

    currentAreaIdRef.current = nextAreaId;
    setCurrentAreaId(nextAreaId);

    if (area && canShowAreaFeedback) {
      areaFeedbackKeyRef.current += 1;
      setAreaFeedback({
        id: area.id,
        label: area.label,
        key: areaFeedbackKeyRef.current,
      });
    }
  }, [canShowAreaFeedback, levelConfig]);
  const completeReveal = useCallback(() => {
    setRevealState("complete");
  }, []);
  const handleExit = useCallback(() => {
    if (isLocalHoldingStudioGuitarRef.current) {
      onDropStudioGuitar();
    }

    setIsEscapeMenuOpen(false);
    localDawAudioActions.cleanup();
    onExit();
  }, [localDawAudioActions, onDropStudioGuitar, onExit]);

  const handleEscapeMenuClose = useCallback(() => {
    setIsEscapeMenuOpen(false);
  }, []);

  const handleEscapeMenuToggle = useCallback(() => {
    if (document.pointerLockElement !== null || status !== "ready" || revealState !== "complete") {
      return;
    }

    setIsEscapeMenuOpen((currentValue) => !currentValue);
  }, [revealState, status]);

  const handleThreeDSettingChange = useCallback(<Key extends keyof ThreeDSettingsState>(
    key: Key,
    value: ThreeDSettingsState[Key],
  ) => {
    setThreeDSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));
  }, []);

  const handleAvatarSettingChange = useCallback(<Key extends LocalAvatarSettingKey>(
    key: Key,
    value: PlayerAvatarAppearance[Key],
  ) => {
    setLocalAvatarAppearance((currentAppearance) => {
      const nextAppearance = normalizeLocalAvatarAppearance({
        ...currentAppearance,
        [key]: value,
        ...(key === "accentColor" ? { headColor: value } : {}),
      });

      return nextAppearance;
    });
  }, []);

  const handleResetAvatarSettings = useCallback(() => {
    setLocalAvatarAppearance({ ...DEFAULT_LOCAL_AVATAR_APPEARANCE });
  }, []);

  useEffect(() => {
    saveLocalAvatarAppearance(localAvatarAppearance);
  }, [localAvatarAppearance]);

  const handleResetVisualSettings = useCallback(() => {
    setThreeDSettings((currentSettings) => ({
      ...currentSettings,
      brightness: DEFAULT_THREE_D_SETTINGS.brightness,
      contrast: DEFAULT_THREE_D_SETTINGS.contrast,
      saturation: DEFAULT_THREE_D_SETTINGS.saturation,
      gamma: DEFAULT_THREE_D_SETTINGS.gamma,
    }));
  }, []);

  const handleResetMovementSettings = useCallback(() => {
    setThreeDSettings((currentSettings) => ({
      ...currentSettings,
      walkSpeedMultiplier: DEFAULT_THREE_D_SETTINGS.walkSpeedMultiplier,
    }));
  }, []);

  const handleStudioAudioEngineToggle = useCallback(() => {
    if (!localDawAudioState.isInitialized || localDawAudioState.status !== "ready") {
      void localDawAudioActions.initialize();
      return;
    }

    if (localDawAudioState.isMuted) {
      localDawAudioActions.setMuted(false);
      return;
    }

    void localDawAudioActions.initialize();
  }, [localDawAudioActions, localDawAudioState.isInitialized, localDawAudioState.isMuted, localDawAudioState.status]);

  const handleStudioMasterVolumeChange = useCallback((volume: number) => {
    localDawAudioActions.setMasterVolume(clamp(volume, 0, 1.5));
  }, [localDawAudioActions]);

  const handleStudioTransportToggle = useCallback(() => {
    if (canControlSharedDawTransport) {
      if (sharedDawTransport.state === "playing") {
        onStopSharedDawTransport();
      } else {
        onPlaySharedDawTransport();
      }

      return;
    }

    localDawActions.toggleTransport();
  }, [
    canControlSharedDawTransport,
    localDawActions,
    onPlaySharedDawTransport,
    onStopSharedDawTransport,
    sharedDawTransport.state,
  ]);

  const handleStudioTempoAdjust = useCallback((deltaBpm: number) => {
    if (canControlSharedDawTransport) {
      onSetSharedDawTempo(sharedDawTransport.bpm + deltaBpm);
      return;
    }

    localDawActions.adjustTempo(deltaBpm);
  }, [canControlSharedDawTransport, localDawActions, onSetSharedDawTempo, sharedDawTransport.bpm]);

  const handleStudioTestPiano = useCallback(() => {
    const handlerAtMs = performance.now();

    localDawAudioActions.playPianoLiveNote({
      durationSeconds: 0.55,
      frequency: 261.63,
      gainScale: 1.2,
      label: "C4",
    }, "fm-synth", {
      allowSound: true,
      latencyTrace: {
        source: "studio-test-piano",
        handlerAtMs,
      },
    });
  }, [localDawAudioActions]);

  const handleStudioTestFmSynth = useCallback(() => {
    localDawAudioActions.playFmSynthNote({
      durationSeconds: 0.55,
      frequency: 329.63,
      gainScale: 1.15,
      label: "FM E4",
    });
  }, [localDawAudioActions]);

  const handleStudioTestBass = useCallback(() => {
    localDawAudioActions.playBassNote({
      durationSeconds: 0.6,
      frequency: 65.41,
      gainScale: 1.15,
      label: "Bass C2",
    });
  }, [localDawAudioActions]);

  const handleStudioTestDrumKick = useCallback(() => {
    localDawAudioActions.playDrumVoice({ gainScale: 1.1, kind: "kick", label: "Kick" }, { allowSound: true });
  }, [localDawAudioActions]);

  const handleStudioTestDrumSnare = useCallback(() => {
    localDawAudioActions.playDrumVoice({ gainScale: 1.1, kind: "snare", label: "Snare" }, { allowSound: true });
  }, [localDawAudioActions]);

  const handleStudioTestDrumHat = useCallback(() => {
    localDawAudioActions.playDrumVoice({ gainScale: 1, kind: "hat", label: "Hat" }, { allowSound: true });
  }, [localDawAudioActions]);

  const handleBroadcastDawLiveSound = useCallback((sound: SharedDawLiveSoundPayload) => {
    if (sound.kind !== "piano") {
      onBroadcastDawLiveSound(sound);
      return;
    }

    const serverAlignedNowMs = Date.now() + (syncStatus.serverTimeOffsetMs ?? 0);

    onBroadcastDawLiveSound({
      ...sound,
      clientTriggeredAt: sound.clientTriggeredAt ?? new Date().toISOString(),
      scheduledAt: new Date(serverAlignedNowMs + REMOTE_PIANO_LOOKAHEAD_MS).toISOString(),
    });
  }, [onBroadcastDawLiveSound, syncStatus.serverTimeOffsetMs]);

  useEffect(() => {
    const sharedTransportPosition = getSharedDawTransportPosition(sharedDawTransport, syncStatus);

    localDawActions.applySharedTransportSnapshot({
      state: sharedDawTransport.state,
      bpm: sharedDawTransport.bpm,
      bar: sharedTransportPosition.bar,
      beat: sharedTransportPosition.beat,
    });
  }, [
    localDawActions,
    sharedDawTransport.anchorBar,
    sharedDawTransport.anchorBeat,
    sharedDawTransport.bpm,
    sharedDawTransport.revision,
    sharedDawTransport.startedAt,
    sharedDawTransport.state,
    syncStatus.serverTimeOffsetMs,
  ]);

  useEffect(() => {
    localDawActions.applySharedClipsSnapshot(sharedDawClips);
  }, [localDawActions, sharedDawClips, sharedDawClips.revision]);

  useEffect(() => {
    if (!sharedDawLiveSound || sharedDawLiveSound.id === lastPlayedSharedDawLiveSoundIdRef.current) {
      return;
    }

    lastPlayedSharedDawLiveSoundIdRef.current = sharedDawLiveSound.id;

    if (
      sharedDawLiveSound.triggeredByUserId === localUserId ||
      sharedDawLiveSound.areaId !== "recording-studio" ||
      currentAreaIdRef.current !== "recording-studio"
    ) {
      return;
    }

    const triggeredAtMs = Date.parse(sharedDawLiveSound.triggeredAt);
    const serverAlignedNowMs = Date.now() + (syncStatus.serverTimeOffsetMs ?? 0);

    if (!Number.isFinite(triggeredAtMs) || serverAlignedNowMs - triggeredAtMs > 5000) {
      return;
    }

    const pianoSchedule = sharedDawLiveSound.kind === "piano"
      ? (() => {
          const scheduledAtMs = sharedDawLiveSound.scheduledAt ? Date.parse(sharedDawLiveSound.scheduledAt) : NaN;
          const scheduledServerTimeMs = Number.isFinite(scheduledAtMs)
            ? scheduledAtMs
            : triggeredAtMs + REMOTE_PIANO_LOOKAHEAD_MS;
          const rawStartDelayMs = scheduledServerTimeMs - serverAlignedNowMs;
          const startDelayMs = Math.min(MAX_REMOTE_PIANO_SCHEDULE_DELAY_MS, Math.max(0, rawStartDelayMs));
          const lateByMs = rawStartDelayMs < 0 ? Math.round(Math.abs(rawStartDelayMs)) : 0;

          return {
            startDelayMs: Math.round(startDelayMs),
            lateByMs,
          };
        })()
      : undefined;

    playSharedDawLiveSound(sharedDawLiveSound, localDawAudioActions, pianoSchedule);
  }, [
    localDawAudioActions,
    localUserId,
    sharedDawLiveSound,
    syncStatus.serverTimeOffsetMs,
  ]);

  const handleReturnToDashboard = useCallback(() => {
    if (isLocalHoldingStudioGuitarRef.current) {
      onDropStudioGuitar();
    }

    setIsEscapeMenuOpen(false);
    setRevealState("returning");
    setControlState("idle");
    setIsTopDownViewActive(false);
    setIsTopDownFreeCamActive(false);
    setTopDownMarkerPosition(null);
    setAreaFeedback(null);
  }, [onDropStudioGuitar]);
  const handleStudioGuitarFeedback = useCallback((noteIndex: number, source: StudioGuitarInputSource) => {
    setStudioGuitarFeedback((currentFeedback) => ({
      noteIndex,
      source,
      key: (currentFeedback?.key ?? 0) + 1,
    }));
  }, []);
  const handleToggleStudioGuitarRecording = useCallback(() => {
    if (!isLocalHoldingStudioGuitarRef.current) {
      return;
    }

    setIsStudioGuitarRecordingEnabled((currentValue) => {
      const nextValue = !currentValue;
      localDawActions.setClipRecording(STUDIO_GUITAR_RECORD_TRACK_ID, STUDIO_GUITAR_RECORD_SCENE_INDEX, nextValue);
      return nextValue;
    });
  }, [localDawActions]);
  const handleStudioGuitarRecordNote = useCallback((noteIndex: number) => {
    const note = STUDIO_GUITAR_NOTE_SPECS[noteIndex] ?? STUDIO_GUITAR_NOTE_SPECS[0];

    localDawActions.recordDawNoteEvent({
      durationSeconds: note.durationSeconds,
      frequency: note.frequency,
      label: `GTR ${note.label}`,
      source: "guitar-live",
    }, {
      trackId: STUDIO_GUITAR_RECORD_TRACK_ID,
      sceneIndex: STUDIO_GUITAR_RECORD_SCENE_INDEX,
    });
  }, [localDawActions]);

  const handleLevelExit = useCallback((exit: LevelExitConfig) => {
    const nextLevelConfig = getLevelConfig(exit.targetLevelId);

    exitPointerLockIfActive();

    if (isLocalHoldingStudioGuitarRef.current) {
      onDropStudioGuitar();
    }

    onClearFreeRoamPresence();
    setIsEscapeMenuOpen(false);
    setTransitionArrivalOverride(
      exit.targetSpawnPosition || exit.targetCameraTarget
        ? {
          levelId: nextLevelConfig.id,
          spawnPosition: exit.targetSpawnPosition ? [...exit.targetSpawnPosition] as Vec3 : undefined,
          cameraTarget: exit.targetCameraTarget ? [...exit.targetCameraTarget] as Vec3 : undefined,
        }
        : null,
    );
    setCurrentLevelId(nextLevelConfig.id);
    lookStateRef.current = { ...INITIAL_LOOK_STATE };
    localPlayerPoseRef.current = null;
    currentAreaIdRef.current = null;
    setCurrentAreaId(null);
    setAreaFeedback(null);
    setRevealState(exit.transitionStyle === "instant" ? "complete" : "revealing");
    setControlState("idle");
    setIsTopDownViewActive(false);
    setIsTopDownFreeCamActive(false);
    setTopDownMarkerPosition(null);
  }, [onClearFreeRoamPresence, onDropStudioGuitar]);

  useEffect(() => {
    setStatus(canCreateWebGLContext() ? "loading" : "unsupported");
  }, []);

  useEffect(() => {
    const mediaQueryList = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    if (!mediaQueryList) {
      return undefined;
    }

    const handleChange = () => {
      setPrefersReducedMotion(mediaQueryList.matches);
    };

    handleChange();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);

      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    mediaQueryList.addListener(handleChange);

    return () => mediaQueryList.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousDocumentOverscrollBehavior = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overflow = previousDocumentOverflow;
      documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || revealState !== "complete") {
      setControlState("idle");
      setAreaFeedback(null);
      setIsWatchViewActive(false);
    }
  }, [revealState, status]);

  useEffect(() => {
    if (status !== "ready" || revealState !== "complete" || controlState === "pointer-locked") {
      setIsEscapeMenuOpen(false);
    }
  }, [controlState, revealState, status]);

  useEffect(() => {
    if (isEscapeMenuOpen) {
      setIsWatchViewActive(false);
    }
  }, [isEscapeMenuOpen]);

  useEffect(() => {
    if (!isWatchViewActive || isEscapeMenuOpen || status !== "ready" || revealState !== "complete" || !canWatchReadyHold) {
      endWatchReadyHold();
    }
  }, [canWatchReadyHold, endWatchReadyHold, isEscapeMenuOpen, isWatchViewActive, revealState, status]);

  useEffect(() => {
    const canHandleWatchGlance = (event: KeyboardEvent) => (
      status === "ready" &&
      revealState === "complete" &&
      event.code === WATCH_GLANCE_CODE &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !isInteractiveTarget(event.target)
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canHandleWatchGlance(event) || event.repeat || isEscapeMenuOpen) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsWatchViewActive((currentValue) => !currentValue);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!canHandleWatchGlance(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const handleBlur = () => {
      setIsWatchViewActive(false);
      endWatchReadyHold();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("blur", handleBlur);
    };
  }, [endWatchReadyHold, isEscapeMenuOpen, revealState, status]);

  useEffect(() => {
    const isWatchReadyControlAvailable = (
      status === "ready" &&
      revealState === "complete" &&
      isWatchViewActive &&
      !isEscapeMenuOpen
    );

    const canHandleWatchReadyEvent = (event: KeyboardEvent) => (
      event.code === JUMP_TRIGGER_CODE &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !isInteractiveTarget(event.target)
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isWatchReadyControlAvailable || !canHandleWatchReadyEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.repeat || !canWatchReadyHold) {
        return;
      }

      startWatchReadyHold();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!canHandleWatchReadyEvent(event)) {
        return;
      }

      if (!isWatchReadyControlAvailable && !isWatchReadyHoldingRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      endWatchReadyHold();
    };

    const handleBlur = () => {
      endWatchReadyHold();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("blur", handleBlur);
      endWatchReadyHold();
    };
  }, [
    canWatchReadyHold,
    endWatchReadyHold,
    isEscapeMenuOpen,
    isWatchViewActive,
    revealState,
    startWatchReadyHold,
    status,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || status !== "ready" || revealState !== "revealing") {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      completeReveal();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [completeReveal, revealState, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Escape" || document.pointerLockElement !== null) {
        return;
      }

      if (status !== "ready" || revealState !== "complete") {
        return;
      }

      event.preventDefault();
      setIsEscapeMenuOpen((currentValue) => !currentValue);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [revealState, status]);

  useEffect(() => {
    if (status === "ready" && revealState === "complete" && !localPlayerPoseRef.current) {
      const initialPose: LocalPlayerPose = {
        position: [...revealRig.endPosition],
        yaw: revealRig.endLookState.yaw,
      };
      const initialArea = getAreaForPosition(initialPose.position, levelConfig);

      localPlayerPoseRef.current = initialPose;
      currentAreaIdRef.current = initialArea?.id ?? null;
      setCurrentAreaId(initialArea?.id ?? null);

      if (transitionArrivalOverride?.levelId === levelConfig.id) {
        setTransitionArrivalOverride(null);
      }
    }
  }, [levelConfig, revealRig.endLookState.yaw, revealRig.endPosition, revealState, status, transitionArrivalOverride]);

  useEffect(() => () => {
    onClearFreeRoamPresence();
  }, [onClearFreeRoamPresence]);

  useEffect(() => {
    if (!areaFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAreaFeedback(null);
    }, AREA_FEEDBACK_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [areaFeedback]);

  const isFirstPersonControlActive = status === "ready" && revealState === "complete" && !isTopDownViewActive && controlState !== "idle" && !isEscapeMenuOpen;
  const isLocalHoldingStudioGuitar = studioGuitar.holderUserId === localUserId;
  const heldStudioInstrument: HeldStudioInstrument = isLocalHoldingStudioGuitar ? "guitar" : null;
  const guitarAudioReadiness = getStudioGuitarAudioReadiness(localDawAudioState);
  const studioGuitarNoteLabel = STUDIO_GUITAR_NOTE_SPECS[studioGuitarNoteIndex]?.label ?? STUDIO_GUITAR_NOTE_SPECS[0].label;
  const studioGuitarBankLabel = getStudioGuitarBankLabel(studioGuitarNoteIndex);
  const studioGuitarSlotIndex = getStudioGuitarSlotIndex(studioGuitarNoteIndex);
  const studioGuitarFeedbackKey = studioGuitarFeedback?.key ?? 0;
  const studioGuitarRecordClip = localDawState.clips.find((clip) => (
    clip.trackId === STUDIO_GUITAR_RECORD_TRACK_ID &&
    clip.sceneIndex === STUDIO_GUITAR_RECORD_SCENE_INDEX
  ));
  const studioGuitarRecordedNoteCount = studioGuitarRecordClip
    ? localDawState.midiNotes.filter((note) => note.clipId === studioGuitarRecordClip.id && note.source === "guitar-live").length
    : 0;
  const studioGuitarRecordingStatus: StudioGuitarRecordingStatus = {
    caption: isStudioGuitarRecordingEnabled
      ? `FM S${STUDIO_GUITAR_RECORD_SCENE_INDEX + 1} ${studioGuitarRecordedNoteCount} NOTES`
      : "REC OFF",
    isEnabled: isStudioGuitarRecordingEnabled,
    label: isStudioGuitarRecordingEnabled ? "REC GTR" : "LIVE",
  };
  const shouldShowFocusHint = status === "ready" && revealState === "complete" && !isTopDownViewActive && controlState === "idle" && !isEscapeMenuOpen;
  const canvasFilterStyle = useMemo<CSSProperties>(() => {
    const gammaBrightness = Math.pow(clamp(threeDSettings.gamma, 0.6, 1.8), 0.35);

    return {
      filter: [
        `brightness(${clamp(threeDSettings.brightness * gammaBrightness, 0.35, 1.9)})`,
        `contrast(${clamp(threeDSettings.contrast, 0.5, 1.6)})`,
        `saturate(${clamp(threeDSettings.saturation, 0, 2)})`,
      ].join(" "),
    };
  }, [threeDSettings.brightness, threeDSettings.contrast, threeDSettings.gamma, threeDSettings.saturation]);

  useEffect(() => {
    isLocalHoldingStudioGuitarRef.current = isLocalHoldingStudioGuitar;
  }, [isLocalHoldingStudioGuitar]);

  useEffect(() => {
    if (isLocalHoldingStudioGuitar || !isStudioGuitarRecordingEnabled) {
      return;
    }

    setIsStudioGuitarRecordingEnabled(false);
    localDawActions.setClipRecording(STUDIO_GUITAR_RECORD_TRACK_ID, STUDIO_GUITAR_RECORD_SCENE_INDEX, false);
  }, [isLocalHoldingStudioGuitar, isStudioGuitarRecordingEnabled, localDawActions]);

  useEffect(() => () => {
    if (isLocalHoldingStudioGuitarRef.current) {
      onDropStudioGuitar();
    }
  }, [onDropStudioGuitar]);

  return (
    <div
      className="three-d-shell-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Unlocked view"
      data-reveal-state={revealState}
      data-camera-view={isTopDownViewActive ? "top-down" : "first-person"}
      data-camera-mode={isTopDownViewActive ? (isTopDownFreeCamActive ? "free-fly" : "player-cam") : "first-person"}
      data-3d-status={status}
      data-control-state={controlState}
      data-escape-menu-open={isEscapeMenuOpen ? "true" : "false"}
      data-watch-view-active={isWatchViewActive ? "true" : "false"}
      data-level-id={levelConfig.id}
      data-area-id={currentAreaId ?? undefined}
    >
      {canRenderCanvas ? (
        <InteractionProvider>
          <ThreeDModeErrorBoundary onError={() => setStatus("error")}>
            <Canvas
              camera={{ position: revealRig.startPosition, fov: NORMAL_CAMERA_FOV }}
              dpr={[1, 1.75]}
              className="three-d-shell-canvas"
              style={canvasFilterStyle}
              onCreated={() => setStatus("ready")}
            >
              <RevealCameraController
                key={`${levelConfig.id}-${resolvedLocalStation.source}-${localStation?.id ?? "default-station"}`}
                revealRig={revealRig}
                revealState={revealState}
                lookStateRef={lookStateRef}
                onComplete={completeReveal}
              />
              <ReturnToDashboardCameraController
                revealState={revealState}
                revealRig={revealRig}
                lookStateRef={lookStateRef}
                onComplete={handleExit}
              />
              <TopDownViewController
                levelConfig={levelConfig}
                enabled={revealState === "complete"}
                isActive={isTopDownViewActive}
                isMenuOpen={isEscapeMenuOpen}
                lookStateRef={lookStateRef}
                onActiveChange={setIsTopDownViewActive}
                onFreeCamActiveChange={setIsTopDownFreeCamActive}
                onLocalPoseChange={updateLocalPlayerPose}
                onMarkerPositionChange={setTopDownMarkerPosition}
              />
              <FirstPersonMovementController
                levelConfig={levelConfig}
                enabled={revealState === "complete" && !isTopDownViewActive && !isEscapeMenuOpen}
                controlState={controlState}
                onControlStateChange={setControlState}
                lookStateRef={lookStateRef}
                onLocalPoseChange={updateLocalPlayerPose}
                prefersReducedMotion={prefersReducedMotion}
                walkSpeedMultiplier={threeDSettings.walkSpeedMultiplier}
              />
              <FreeRoamPresenceReporter
                currentAreaIdRef={currentAreaIdRef}
                enabled={status === "ready" && revealState === "complete"}
                levelId={levelConfig.id}
                localPlayerPoseRef={localPlayerPoseRef}
                onUpdateFreeRoamPresence={onUpdateFreeRoamPresence}
              />
              <LocalDawClockController
                localDawState={localDawState}
                localDawActions={localDawActions}
                localDawAudioActions={localDawAudioActions}
              />
              <FirstPersonBody
                avatarAppearance={localAvatarAppearance}
                enabled={isFirstPersonControlActive}
                guitarAudioReadiness={guitarAudioReadiness}
                guitarBankLabel={studioGuitarBankLabel}
                guitarFeedbackKey={studioGuitarFeedbackKey}
                guitarRecordingStatus={studioGuitarRecordingStatus}
                studioGuitarNoteIndex={studioGuitarNoteIndex}
                heldStudioInstrument={heldStudioInstrument}
                studioGuitarNoteLabel={studioGuitarNoteLabel}
              />
              <LocalWorldPlayerAvatar
                appearance={localAvatarAppearance}
                enabled={status === "ready" && revealState === "complete" && isTopDownViewActive}
                identity={localAvatarIdentity}
                isHost={localUser?.isHost === true || localUserId === ownerId}
                poseRef={localPlayerPoseRef}
                presence={localUser?.presence ?? "idle"}
              />
              {heldStudioInstrument === "guitar" ? (
                <StudioHeldGuitarController
                  isRecordingEnabled={isStudioGuitarRecordingEnabled}
                  isHeld={isFirstPersonControlActive}
                  isMenuOpen={isEscapeMenuOpen}
                  localDawAudioActions={localDawAudioActions}
                  noteIndex={studioGuitarNoteIndex}
                  onFeedback={handleStudioGuitarFeedback}
                  onBroadcastDawLiveSound={handleBroadcastDawLiveSound}
                  onNoteIndexChange={setStudioGuitarNoteIndex}
                  onRecordNote={handleStudioGuitarRecordNote}
                />
              ) : null}
              <ThreeDPerformanceSampler
                enabled={status === "ready" && revealState === "complete" && threeDSettings.showFps}
                onSample={setRendererPerformanceSample}
              />
              <AimInteractionController
                enabled={areInteractionsEnabled}
                enablePointerShoot
                activeAreaId={currentAreaId}
                onPerformanceSample={threeDSettings.showFps ? setInteractionPerformanceSample : undefined}
              />
              <Level1RoomShell
                levelConfig={levelConfig}
                countdownDisplay={countdownDisplay}
                users={users}
                localUserId={localUserId}
                ownerId={ownerId}
                roundNumber={roundNumber}
                rangeScoreboard={rangeScoreboard}
                onSubmitRangeScore={onSubmitRangeScore}
                onLevelExit={handleLevelExit}
                freeRoamPresence={freeRoamPresence}
                onActivateLocalDashboard={handleReturnToDashboard}
                localStationId={localStation?.id}
                localStationSource={resolvedLocalStation.source}
                jukeboxDisplay={jukeboxDisplay}
                jukeboxActions={jukeboxActions}
                soundCloudBooth={soundCloudBooth}
                localDawState={localDawState}
                localDawActions={localDawActions}
                localDawAudioState={localDawAudioState}
                localDawAudioActions={localDawAudioActions}
                sharedDawTransport={sharedDawTransport}
                sharedDawClips={sharedDawClips}
                canControlSharedDawTransport={canControlSharedDawTransport}
                canAdminSharedDawClips={canAdminSharedDawClips}
                onSetSharedDawTempo={onSetSharedDawTempo}
                onPlaySharedDawTransport={onPlaySharedDawTransport}
                onStopSharedDawTransport={onStopSharedDawTransport}
                localUserIdForSharedDawClips={localUserId}
                onPublishSharedDawClip={onPublishSharedDawClip}
                onClearSharedDawClip={onClearSharedDawClip}
                onBroadcastDawLiveSound={handleBroadcastDawLiveSound}
                studioGuitar={studioGuitar}
                onPickupStudioGuitar={onPickupStudioGuitar}
                onDropStudioGuitar={onDropStudioGuitar}
                heldStudioInstrument={heldStudioInstrument}
                studioGuitarBankLabel={studioGuitarBankLabel}
                studioGuitarRecordingStatus={studioGuitarRecordingStatus}
                onToggleStudioGuitarRecording={handleToggleStudioGuitarRecording}
                studioGuitarFeedbackKey={studioGuitarFeedbackKey}
                studioGuitarNoteIndex={studioGuitarNoteIndex}
                studioGuitarNoteLabel={studioGuitarNoteLabel}
                studioGuitarSlotIndex={studioGuitarSlotIndex}
                showLayoutGrabBoxes={threeDSettings.showGrabBoxes}
              />
              {isTopDownViewActive && topDownMarkerPosition ? <LocalPositionMarker position={topDownMarkerPosition} /> : null}
            </Canvas>
          </ThreeDModeErrorBoundary>
          <InteractionReticle enabled={areInteractionsEnabled} />
        </InteractionProvider>
      ) : null}

      {status === "checking" || status === "loading" || status === "unsupported" || status === "error" ? (
        <ThreeDStatusPanel status={status} onExit={handleExit} />
      ) : null}

      {shouldShowFocusHint ? <div className="three-d-shell-focus-hint">Click view to move</div> : null}

      {status === "ready" && revealState === "complete" && isWatchViewActive ? (
        <WatchTimerDisplay
          countdownDisplay={countdownDisplay}
          users={users}
          localUserId={localUserId}
          ownerId={ownerId}
          roundNumber={roundNumber}
          canWatchReadyHold={canWatchReadyHold}
          watchReadyHoldStatus={watchReadyHoldStatus}
          isWatchReadyHolding={isWatchReadyHolding}
        />
      ) : null}

      {status === "ready" && revealState === "complete" && isTopDownViewActive ? (
        <div className="three-d-camera-mode" aria-live="polite">
          <span>Camera</span>
          <strong>{isTopDownFreeCamActive ? "FREE FLY" : "PLAYER CAM"}</strong>
        </div>
      ) : null}

      {areaFeedback && canShowAreaFeedback ? (
        <div key={areaFeedback.key} className="three-d-area-feedback" aria-hidden="true">
          <span>Level 1</span>
          <strong>{areaFeedback.label}</strong>
        </div>
      ) : null}

      {status === "ready" && revealState === "revealing" ? (
        <button type="button" className="three-d-shell-skip" onClick={completeReveal}>
          Skip
        </button>
      ) : null}

      {status === "ready" ? (
        <button type="button" className="three-d-shell-exit" onClick={handleExit}>
          Exit
        </button>
      ) : null}

      {status === "ready" && revealState === "complete" && !isEscapeMenuOpen ? (
        <button type="button" className="three-d-shell-menu-toggle" onClick={handleEscapeMenuToggle} aria-label="Open escape menu">
          Menu
        </button>
      ) : null}

      <ThreeDFpsCounter
        enabled={status === "ready" && revealState === "complete" && threeDSettings.showFps}
        interactionPerformanceSample={interactionPerformanceSample}
        rendererPerformanceSample={rendererPerformanceSample}
      />

      <EscapeMenuOverlay
        activeTab={escapeMenuTab}
        audioState={localDawAudioState}
        avatarAppearance={localAvatarAppearance}
        avatarIdentity={localAvatarIdentity}
        canControlSharedDawTransport={canControlSharedDawTransport}
        guitarRecordingStatus={studioGuitarRecordingStatus}
        isOpen={isEscapeMenuOpen}
        isLocalHost={localUser?.isHost === true || localUserId === ownerId}
        localDawState={localDawState}
        onAdjustTempo={handleStudioTempoAdjust}
        onAvatarSettingChange={handleAvatarSettingChange}
        onClose={handleEscapeMenuClose}
        onResetAvatar={handleResetAvatarSettings}
        onResetPatch={localDawActions.resetPatchToDefaults}
        onResetSpeed={handleResetMovementSettings}
        onResetVisuals={handleResetVisualSettings}
        onSetMasterVolume={handleStudioMasterVolumeChange}
        onSettingChange={handleThreeDSettingChange}
        onTestBass={handleStudioTestBass}
        onTestDrumHat={handleStudioTestDrumHat}
        onTestDrumKick={handleStudioTestDrumKick}
        onTestDrumSnare={handleStudioTestDrumSnare}
        onTestFmSynth={handleStudioTestFmSynth}
        onTestPiano={handleStudioTestPiano}
        onTabChange={setEscapeMenuTab}
        onToggleAudioEngine={handleStudioAudioEngineToggle}
        onToggleAudioMute={localDawAudioActions.toggleMuted}
        onToggleGuitarRecording={handleToggleStudioGuitarRecording}
        onToggleTransport={handleStudioTransportToggle}
        settings={threeDSettings}
        sharedDawTransport={sharedDawTransport}
        userPresence={localUser?.presence ?? "idle"}
      />
    </div>
  );
}
