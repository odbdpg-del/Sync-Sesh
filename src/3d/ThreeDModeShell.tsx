import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Level1RoomShell } from "./Level1RoomShell";
import { ThreeDModeErrorBoundary } from "./ThreeDModeErrorBoundary";
import { AimInteractionController, InteractionProvider, InteractionReticle } from "./interactions";
import { DEFAULT_LEVEL_ID, getLevelConfig } from "./levels";
import type { LevelConfig } from "./levels";
import { useLocalDawAudioEngine } from "./useLocalDawAudioEngine";
import type { LocalDawAudioEngineActions } from "./useLocalDawAudioEngine";
import { useLocalDawState } from "./useLocalDawState";
import type { DawTrackId, LocalDawActions, LocalDawMidiNoteEvent, LocalDawState } from "./useLocalDawState";
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
  SyncStatus,
} from "../types/session";
import type { JukeboxActions, JukeboxDisplayState } from "../hooks/useSoundCloudPlayer";

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
  sharedDawTransport: SharedDawTransport;
  sharedDawClips: SharedDawClipsState;
  sharedDawLiveSound: SharedDawLiveSoundEvent | null;
  syncStatus: SyncStatus;
  canControlSharedDawTransport: boolean;
  canAdminSharedDawClips: boolean;
  onSetSharedDawTempo: (bpm: number) => void;
  onPlaySharedDawTransport: () => void;
  onStopSharedDawTransport: () => void;
  onPublishSharedDawClip: (clip: SharedDawClipPublishPayload) => void;
  onClearSharedDawClip: (trackId: SharedDawTrackId, sceneIndex: number) => void;
  onBroadcastDawLiveSound: (sound: SharedDawLiveSoundPayload) => void;
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
const MIN_LOOK_PITCH = -1.35;
const MAX_LOOK_PITCH = 0.55;
const MOUSE_LOOK_SENSITIVITY = 0.0035;
const POINTER_LOCK_LOOK_SENSITIVITY = 0.0025;
const FREE_ROAM_PRESENCE_INTERVAL_MS = 500;
const FREE_ROAM_POSITION_EPSILON = 0.08;
const FREE_ROAM_YAW_EPSILON = 0.08;
const AREA_FEEDBACK_DURATION_MS = 1800;

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

function getFallbackRevealRig(levelConfig: LevelConfig): StationRevealRig {
  const endPosition = [...levelConfig.playerStart.position] as Vec3;
  const endTarget = [...END_CAMERA_TARGET] as Vec3;

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

function getStationRevealRig(levelConfig: LevelConfig, station?: LevelConfig["stations"][number]): StationRevealRig {
  if (!station) {
    return getFallbackRevealRig(levelConfig);
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
}: {
  levelConfig: LevelConfig;
  enabled: boolean;
  controlState: ControlState;
  onControlStateChange: (controlState: ControlState) => void;
  lookStateRef: MutableRefObject<LookState>;
  onLocalPoseChange: (pose: LocalPlayerPose) => void;
  prefersReducedMotion: boolean;
}) {
  const { camera, gl } = useThree();
  const activeKeysRef = useRef(new Set<MovementKey>());
  const isSprintActiveRef = useRef(false);
  const movementVelocityRef = useRef({ x: 0, z: 0 });
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

  useEffect(() => {
    isEnabledRef.current = enabled;

    if (!enabled) {
      activeKeysRef.current.clear();
      activeShiftKeysRef.current.clear();
      isSprintActiveRef.current = false;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
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
    const movementSpeed = isSprintActiveRef.current ? SPRINT_SPEED_UNITS_PER_SECOND : WALK_SPEED_UNITS_PER_SECOND;

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
      const slideSpeed = lerp(SLIDE_SPEED_UNITS_PER_SECOND, SLIDE_END_SPEED_UNITS_PER_SECOND, slideProgress);
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

    if (!activeSlide && hasMovementInput && Math.hypot(nextVelocity.x, nextVelocity.z) >= SPRINT_SPEED_UNITS_PER_SECOND * 0.75) {
      lastSprintMomentumAtMsRef.current = nowMs;
    }

    if (Math.hypot(nextVelocity.x, nextVelocity.z) === 0) {
      updateCameraFov(camera, inspectZoomFovRef.current ?? NORMAL_CAMERA_FOV, delta);
      return;
    }

    const currentX = camera.position.x;
    const currentZ = camera.position.z;
    const nextX = currentX + nextVelocity.x * delta;
    const nextZ = currentZ + nextVelocity.z * delta;
    const resolved = resolveHorizontalMovementCollision({
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
    const resolvedSpeed = Math.hypot(resolved.velocity.x, resolved.velocity.z);
    const hasMeaningfulMovement = resolvedSpeed >= MOVEMENT_STOP_EPSILON;
    const isSprintPolishActive = !activeSlide && isSprintActiveRef.current && hasMeaningfulMovement;
    const canApplyCameraPolish = !prefersReducedMotion && hasMeaningfulMovement;
    const bobAmplitude = isSprintPolishActive ? SPRINT_HEAD_BOB_AMPLITUDE : WALK_HEAD_BOB_AMPLITUDE;
    const bobFrequency = isSprintPolishActive ? SPRINT_HEAD_BOB_FREQUENCY : WALK_HEAD_BOB_FREQUENCY;
    const headBob = canApplyCameraPolish && !activeSlide
      ? Math.sin(clock.getElapsedTime() * bobFrequency) * bobAmplitude
      : 0;
    const slideDip = canApplyCameraPolish && activeSlide
      ? SLIDE_CAMERA_DIP * Math.sin(Math.min(1, (nowMs - activeSlide.startedAtMs) / SLIDE_DURATION_MS) * Math.PI)
      : 0;
    const cameraY = resolvedY + headBob - slideDip;
    const movementTargetFov = prefersReducedMotion
      ? NORMAL_CAMERA_FOV
      : activeSlide
        ? SLIDE_CAMERA_FOV
        : isSprintPolishActive
          ? SPRINT_CAMERA_FOV
          : NORMAL_CAMERA_FOV;
    const targetFov = inspectZoomFovRef.current ?? movementTargetFov;

    unpolishedCameraPositionRef.current = [resolved.position.x, resolvedY, resolved.position.z];
    updateCameraFov(camera, targetFov, delta);
    camera.position.set(resolved.position.x, cameraY, resolved.position.z);
    camera.lookAt(...getLookTarget([resolved.position.x, cameraY, resolved.position.z], lookStateRef.current));
    onLocalPoseChange({
      position: [resolved.position.x, resolvedY, resolved.position.z],
      yaw: lookStateRef.current.yaw,
    });
  });

  return null;
}

interface TopDownViewControllerProps {
  levelConfig: LevelConfig;
  enabled: boolean;
  isActive: boolean;
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        enabled &&
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

      if (enabled && isActiveRef.current && isMovementKey(event.code) && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        activeMovementKeysRef.current.add(event.code);
        return;
      }

      if (enabled && isActiveRef.current && isFreeCamActiveRef.current && isFreeCamVerticalKey(event.code) && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        activeFreeCamVerticalKeysRef.current.add(event.code);
        return;
      }

      if (enabled && isActiveRef.current && isTopDownPanKey(event.code) && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        activePanKeysRef.current.add(event.code);
        return;
      }

      if (
        !enabled ||
        event.code !== "Tab" ||
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
        if (enabled && isActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (isMovementKey(event.code)) {
        activeMovementKeysRef.current.delete(event.code);

        if (enabled && isActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (isFreeCamVerticalKey(event.code)) {
        activeFreeCamVerticalKeysRef.current.delete(event.code);

        if (enabled && isActiveRef.current && isFreeCamActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (isTopDownPanKey(event.code)) {
        activePanKeysRef.current.delete(event.code);

        if (enabled && isActiveRef.current) {
          event.preventDefault();
        }

        return;
      }

      if (!enabled || event.code !== "Tab") {
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
      if (!enabled || !isActiveRef.current || !isFreeCamActiveRef.current || event.button !== 0) {
        return;
      }

      event.preventDefault();
      canvas.focus();
      ensureFreeCamPose();
      isFreeCamDragLookingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabled || !isActiveRef.current || !isFreeCamActiveRef.current || !isFreeCamDragLookingRef.current) {
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
    if (!enabled) {
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

function FirstPersonBody({ enabled }: { enabled: boolean }) {
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
    if (!bodyRef.current) {
      return;
    }

    camera.add(bodyRef.current);

    return () => {
      if (bodyRef.current) {
        camera.remove(bodyRef.current);
      }
    };
  }, [camera]);

  if (!enabled) {
    return null;
  }

  return (
    <group ref={bodyRef}>
      <mesh position={[0, -0.08, 0.04]} rotation={[0.14, 0, 0]}>
        <boxGeometry args={[0.48, 0.48, 0.28]} />
        <meshStandardMaterial args={[{ color: "#1f5f88", roughness: 0.72, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[-0.34, -0.1, -0.16]} rotation={[0.02, 0.04, -0.22]}>
        <capsuleGeometry args={[0.055, 0.42, 8, 16]} />
        <meshStandardMaterial args={[{ color: "#2f78a8", roughness: 0.66, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0.34, -0.1, -0.16]} rotation={[0.02, -0.04, 0.22]}>
        <capsuleGeometry args={[0.055, 0.42, 8, 16]} />
        <meshStandardMaterial args={[{ color: "#2f78a8", roughness: 0.66, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[-0.42, -0.38, -0.28]} rotation={[0.1, 0.12, -0.16]}>
        <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
        <meshStandardMaterial args={[{ color: "#8fb3d9", roughness: 0.62, metalness: 0.02 }]} />
      </mesh>
      <mesh position={[0.42, -0.38, -0.28]} rotation={[0.1, -0.12, 0.16]}>
        <capsuleGeometry args={[0.055, 0.28, 8, 16]} />
        <meshStandardMaterial args={[{ color: "#8fb3d9", roughness: 0.62, metalness: 0.02 }]} />
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
        <meshStandardMaterial args={[{ color: "#07111f", roughness: 0.8, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0.17, -0.99, -0.23]} rotation={[0.07, -0.04, 0]}>
        <boxGeometry args={[0.16, 0.09, 0.34]} />
        <meshStandardMaterial args={[{ color: "#07111f", roughness: 0.8, metalness: 0.04 }]} />
      </mesh>
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
      frequency: note.frequency,
      gainScale,
      label: note.label,
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

function playSharedDawLiveSound(sound: SharedDawLiveSoundEvent, localDawAudioActions: LocalDawAudioEngineActions) {
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
    localDawAudioActions.playPianoLiveNote({
      label: sound.label,
      frequency: sound.frequency,
      durationSeconds: sound.durationSeconds,
      gainScale,
      bassMachinePatch: sound.bassMachinePatch,
      fmSynthPatch: sound.fmSynthPatch,
    }, sound.pianoTarget ?? "fm-synth", { allowSound: true });
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
  sharedDawTransport,
  sharedDawClips,
  sharedDawLiveSound,
  syncStatus,
  canControlSharedDawTransport,
  canAdminSharedDawClips,
  onSetSharedDawTempo,
  onPlaySharedDawTransport,
  onStopSharedDawTransport,
  onPublishSharedDawClip,
  onClearSharedDawClip,
  onBroadcastDawLiveSound,
  onExit,
}: ThreeDModeShellProps) {
  const [currentLevelId, setCurrentLevelId] = useState(getRequestedLevelId);
  const levelConfig = getLevelConfig(currentLevelId);
  const [status, setStatus] = useState<ThreeDStatus>("checking");
  const [controlState, setControlState] = useState<ControlState>("idle");
  const [revealState, setRevealState] = useState<RevealState>("revealing");
  const [isTopDownViewActive, setIsTopDownViewActive] = useState(false);
  const [isTopDownFreeCamActive, setIsTopDownFreeCamActive] = useState(false);
  const [topDownMarkerPosition, setTopDownMarkerPosition] = useState<Vec3 | null>(null);
  const [currentAreaId, setCurrentAreaId] = useState<string | null>(null);
  const [areaFeedback, setAreaFeedback] = useState<AreaFeedbackState | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);
  const lookStateRef = useRef<LookState>({ ...INITIAL_LOOK_STATE });
  const localPlayerPoseRef = useRef<LocalPlayerPose | null>(null);
  const currentAreaIdRef = useRef<string | null>(null);
  const areaFeedbackKeyRef = useRef(0);
  const lastPlayedSharedDawLiveSoundIdRef = useRef<string | null>(null);
  const { state: localDawState, actions: localDawActions } = useLocalDawState();
  const { state: localDawAudioState, actions: localDawAudioActions } = useLocalDawAudioEngine();
  const stationAssignments = useMemo(() => getUserStationAssignments(users, levelConfig), [levelConfig, users]);
  const resolvedLocalStation = useMemo(
    () => resolveLocalStation(stationAssignments, levelConfig, localUserId),
    [levelConfig, localUserId, stationAssignments],
  );
  const localStation = resolvedLocalStation.station;
  const revealRig = useMemo(() => getStationRevealRig(levelConfig, localStation ?? undefined), [levelConfig, localStation]);
  const canRenderCanvas = status === "loading" || status === "ready";
  const areInteractionsEnabled = status === "ready" && revealState === "complete" && (
    (!isTopDownViewActive && controlState !== "idle") ||
    isTopDownFreeCamActive
  );
  const canShowAreaFeedback = status === "ready" && revealState === "complete";
  const updateLocalPlayerPose = useCallback((pose: LocalPlayerPose) => {
    localPlayerPoseRef.current = pose;
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
  const handleExit = useCallback(() => {
    localDawAudioActions.cleanup();
    onExit();
  }, [localDawAudioActions, onExit]);

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

    playSharedDawLiveSound(sharedDawLiveSound, localDawAudioActions);
  }, [
    localDawAudioActions,
    localUserId,
    sharedDawLiveSound,
    syncStatus.serverTimeOffsetMs,
  ]);

  const handleReturnToDashboard = useCallback(() => {
    setRevealState("returning");
    setControlState("idle");
    setIsTopDownViewActive(false);
    setIsTopDownFreeCamActive(false);
    setTopDownMarkerPosition(null);
    setAreaFeedback(null);
  }, []);

  const handleLevelExit = useCallback((targetLevelId: string) => {
    const nextLevelConfig = getLevelConfig(targetLevelId);

    onClearFreeRoamPresence();
    setCurrentLevelId(nextLevelConfig.id);
    lookStateRef.current = { ...INITIAL_LOOK_STATE };
    localPlayerPoseRef.current = null;
    currentAreaIdRef.current = null;
    setCurrentAreaId(null);
    setAreaFeedback(null);
    setRevealState("revealing");
    setControlState("idle");
    setIsTopDownViewActive(false);
    setIsTopDownFreeCamActive(false);
    setTopDownMarkerPosition(null);
  }, [onClearFreeRoamPresence]);

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
    if (status !== "ready" || revealState !== "complete") {
      setControlState("idle");
      setAreaFeedback(null);
    }
  }, [revealState, status]);

  useEffect(() => {
    if (status === "ready" && revealState === "complete" && !localPlayerPoseRef.current) {
      localPlayerPoseRef.current = {
        position: [...revealRig.endPosition],
        yaw: revealRig.endLookState.yaw,
      };
    }
  }, [revealRig.endLookState.yaw, revealRig.endPosition, revealState, status]);

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

  const shouldShowFocusHint = status === "ready" && revealState === "complete" && !isTopDownViewActive && controlState === "idle";

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
              onCreated={() => setStatus("ready")}
            >
              <RevealCameraController
                key={`${levelConfig.id}-${resolvedLocalStation.source}-${localStation?.id ?? "default-station"}`}
                revealRig={revealRig}
                revealState={revealState}
                lookStateRef={lookStateRef}
                onComplete={() => setRevealState("complete")}
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
                lookStateRef={lookStateRef}
                onActiveChange={setIsTopDownViewActive}
                onFreeCamActiveChange={setIsTopDownFreeCamActive}
                onLocalPoseChange={updateLocalPlayerPose}
                onMarkerPositionChange={setTopDownMarkerPosition}
              />
              <FirstPersonMovementController
                levelConfig={levelConfig}
                enabled={revealState === "complete" && !isTopDownViewActive}
                controlState={controlState}
                onControlStateChange={setControlState}
                lookStateRef={lookStateRef}
                onLocalPoseChange={updateLocalPlayerPose}
                prefersReducedMotion={prefersReducedMotion}
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
              <FirstPersonBody enabled={status === "ready" && revealState === "complete" && !isTopDownViewActive && controlState !== "idle"} />
              <AimInteractionController enabled={areInteractionsEnabled} enablePointerShoot />
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
                onBroadcastDawLiveSound={onBroadcastDawLiveSound}
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
        <button type="button" className="three-d-shell-skip" onClick={() => setRevealState("complete")}>
          Skip
        </button>
      ) : null}

      {status === "ready" ? (
        <button type="button" className="three-d-shell-exit" onClick={handleExit}>
          Exit
        </button>
      ) : null}
    </div>
  );
}
