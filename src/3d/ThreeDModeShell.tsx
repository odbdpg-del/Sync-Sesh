import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Level1RoomShell } from "./Level1RoomShell";
import { ThreeDModeErrorBoundary } from "./ThreeDModeErrorBoundary";
import { AimInteractionController, InteractionProvider, InteractionReticle } from "./interactions";
import { DEFAULT_LEVEL_ID, getLevelConfig } from "./levels";
import type { LevelConfig } from "./levels";
import type {
  CountdownDisplayState,
  FreeRoamPresenceState,
  FreeRoamPresenceUpdate,
  RangeScoreResult,
  RangeScoreSubmission,
  SessionUser,
} from "../types/session";
import type { JukeboxActions, JukeboxDisplayState } from "../hooks/useSoundCloudPlayer";

type RevealState = "revealing" | "complete" | "returning";
type ThreeDStatus = "checking" | "loading" | "ready" | "unsupported" | "error";
type ControlState = "idle" | "focused" | "pointer-locked" | "pointer-lock-unavailable";
type MovementKey = "KeyW" | "KeyA" | "KeyS" | "KeyD";
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
const INITIAL_LOOK_STATE: LookState = { yaw: 0, pitch: -0.35 };
const MIN_LOOK_PITCH = -0.9;
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
  const lastSprintMomentumAtMsRef = useRef<number | null>(null);
  const lastMovementDirectionRef = useRef<HorizontalVector | null>(null);
  const slideCooldownUntilMsRef = useRef(0);
  const isEnabledRef = useRef(enabled);
  const controlStateRef = useRef<ControlState>(controlState);
  const unpolishedCameraPositionRef = useRef<Vec3 | null>(null);
  const isDragLookingRef = useRef(false);
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
      isSprintActiveRef.current = false;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      isDragLookingRef.current = false;

      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
    }
  }, [enabled, gl]);

  useEffect(() => {
    controlStateRef.current = controlState;

    if (controlState === "idle") {
      activeKeysRef.current.clear();
      isSprintActiveRef.current = false;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
      isDragLookingRef.current = false;
    }
  }, [controlState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && document.pointerLockElement === gl.domElement) {
        activeKeysRef.current.clear();
        isSprintActiveRef.current = false;
        movementVelocityRef.current = { x: 0, z: 0 };
        clearSlideState();
        isDragLookingRef.current = false;
        document.exitPointerLock();
        return;
      }

      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        if (!isEnabledRef.current || controlStateRef.current === "idle" || isInteractiveTarget(event.target)) {
          return;
        }

        event.preventDefault();
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
        isSprintActiveRef.current = false;

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
      isSprintActiveRef.current = false;
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      activeKeysRef.current.clear();
      isSprintActiveRef.current = false;
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
        isSprintActiveRef.current = false;
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

    canvas.tabIndex = -1;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("pointermove", handleDocumentPointerMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("pointerlockerror", handlePointerLockError);

    return () => {
      isDragLookingRef.current = false;
      activeKeysRef.current.clear();
      isSprintActiveRef.current = false;
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
      return;
    }

    if (controlState === "idle") {
      movementVelocityRef.current = { x: 0, z: 0 };
      clearSlideState();
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
      updateCameraFov(camera, NORMAL_CAMERA_FOV, delta);
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
    const targetFov = prefersReducedMotion
      ? NORMAL_CAMERA_FOV
      : activeSlide
        ? SLIDE_CAMERA_FOV
        : isSprintPolishActive
          ? SPRINT_CAMERA_FOV
          : NORMAL_CAMERA_FOV;

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
  onMarkerPositionChange: (position: Vec3 | null) => void;
}

function TopDownViewController({ levelConfig, enabled, isActive, lookStateRef, onActiveChange, onMarkerPositionChange }: TopDownViewControllerProps) {
  const { camera } = useThree();
  const firstPersonPositionRef = useRef<Vec3 | null>(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!enabled) {
      firstPersonPositionRef.current = null;
      onMarkerPositionChange(null);
      onActiveChange(false);
    }
  }, [enabled, onActiveChange, onMarkerPositionChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
      if (!enabled || event.code !== "Tab") {
        return;
      }

      event.preventDefault();
    };

    const handleBlur = () => {
      onActiveChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      onMarkerPositionChange(null);
      onActiveChange(false);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, onActiveChange, onMarkerPositionChange]);

  useFrame(() => {
    if (!enabled) {
      return;
    }

    if (isActive) {
      const perspectiveCamera = getPerspectiveCamera(camera);

      if (!firstPersonPositionRef.current) {
        firstPersonPositionRef.current = [camera.position.x, camera.position.y, camera.position.z];
        onMarkerPositionChange(firstPersonPositionRef.current);
      }

      camera.position.set(...levelConfig.topDownCamera.position);
      camera.lookAt(...levelConfig.topDownCamera.target);

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
      onMarkerPositionChange(null);
    }

    const perspectiveCamera = getPerspectiveCamera(camera);

    if (perspectiveCamera && perspectiveCamera.fov !== NORMAL_CAMERA_FOV) {
      perspectiveCamera.fov = NORMAL_CAMERA_FOV;
      perspectiveCamera.updateProjectionMatrix();
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
  enabled,
  levelId,
  localPlayerPoseRef,
  onUpdateFreeRoamPresence,
}: {
  enabled: boolean;
  levelId: string;
  localPlayerPoseRef: MutableRefObject<LocalPlayerPose | null>;
  onUpdateFreeRoamPresence: (presence: FreeRoamPresenceUpdate) => void;
}) {
  const lastSentAtMsRef = useRef(0);
  const lastSentLevelIdRef = useRef<string | null>(null);
  const lastSentPoseRef = useRef<LocalPlayerPose | null>(null);

  useFrame(({ clock }) => {
    if (!enabled || !localPlayerPoseRef.current) {
      return;
    }

    const nowMs = clock.getElapsedTime() * 1000;
    const shouldSendForLevel = lastSentLevelIdRef.current !== levelId;
    const shouldSendForPose = hasMeaningfulPoseChange(lastSentPoseRef.current, localPlayerPoseRef.current);

    if (!shouldSendForLevel && !shouldSendForPose) {
      return;
    }

    if (!shouldSendForLevel && nowMs - lastSentAtMsRef.current < FREE_ROAM_PRESENCE_INTERVAL_MS) {
      return;
    }

    lastSentAtMsRef.current = nowMs;
    lastSentLevelIdRef.current = levelId;
    lastSentPoseRef.current = {
      position: [...localPlayerPoseRef.current.position],
      yaw: localPlayerPoseRef.current.yaw,
    };
    onUpdateFreeRoamPresence({
      levelId,
      position: localPlayerPoseRef.current.position,
      yaw: localPlayerPoseRef.current.yaw,
    });
  });

  return null;
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
  onExit,
}: ThreeDModeShellProps) {
  const [currentLevelId, setCurrentLevelId] = useState(getRequestedLevelId);
  const levelConfig = getLevelConfig(currentLevelId);
  const [status, setStatus] = useState<ThreeDStatus>("checking");
  const [controlState, setControlState] = useState<ControlState>("idle");
  const [revealState, setRevealState] = useState<RevealState>("revealing");
  const [isTopDownViewActive, setIsTopDownViewActive] = useState(false);
  const [topDownMarkerPosition, setTopDownMarkerPosition] = useState<Vec3 | null>(null);
  const [currentAreaId, setCurrentAreaId] = useState<string | null>(null);
  const [areaFeedback, setAreaFeedback] = useState<AreaFeedbackState | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);
  const lookStateRef = useRef<LookState>({ ...INITIAL_LOOK_STATE });
  const localPlayerPoseRef = useRef<LocalPlayerPose | null>(null);
  const currentAreaIdRef = useRef<string | null>(null);
  const areaFeedbackKeyRef = useRef(0);
  const stationAssignments = useMemo(() => getUserStationAssignments(users, levelConfig), [levelConfig, users]);
  const resolvedLocalStation = useMemo(
    () => resolveLocalStation(stationAssignments, levelConfig, localUserId),
    [levelConfig, localUserId, stationAssignments],
  );
  const localStation = resolvedLocalStation.station;
  const revealRig = useMemo(() => getStationRevealRig(levelConfig, localStation ?? undefined), [levelConfig, localStation]);
  const canRenderCanvas = status === "loading" || status === "ready";
  const areInteractionsEnabled = status === "ready" && revealState === "complete" && !isTopDownViewActive && controlState !== "idle";
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

  const handleReturnToDashboard = useCallback(() => {
    setRevealState("returning");
    setControlState("idle");
    setIsTopDownViewActive(false);
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
                onComplete={onExit}
              />
              <TopDownViewController
                levelConfig={levelConfig}
                enabled={revealState === "complete"}
                isActive={isTopDownViewActive}
                lookStateRef={lookStateRef}
                onActiveChange={setIsTopDownViewActive}
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
                enabled={status === "ready" && revealState === "complete"}
                levelId={levelConfig.id}
                localPlayerPoseRef={localPlayerPoseRef}
                onUpdateFreeRoamPresence={onUpdateFreeRoamPresence}
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
              />
              {isTopDownViewActive && topDownMarkerPosition ? <LocalPositionMarker position={topDownMarkerPosition} /> : null}
            </Canvas>
          </ThreeDModeErrorBoundary>
          <InteractionReticle enabled={areInteractionsEnabled} />
        </InteractionProvider>
      ) : null}

      {status === "checking" || status === "loading" || status === "unsupported" || status === "error" ? (
        <ThreeDStatusPanel status={status} onExit={onExit} />
      ) : null}

      {shouldShowFocusHint ? <div className="three-d-shell-focus-hint">Click view to move</div> : null}

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
        <button type="button" className="three-d-shell-exit" onClick={onExit}>
          Exit
        </button>
      ) : null}
    </div>
  );
}
