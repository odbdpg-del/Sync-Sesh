import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Level1RoomShell } from "./Level1RoomShell";
import { ThreeDModeErrorBoundary } from "./ThreeDModeErrorBoundary";
import { DEFAULT_LEVEL_ID, getLevelConfig } from "./levels";
import type { LevelConfig } from "./levels";
import type { CountdownDisplayState, SessionUser } from "../types/session";

type RevealState = "revealing" | "complete";
type ThreeDStatus = "checking" | "loading" | "ready" | "unsupported" | "error";
type MovementKey = "KeyW" | "KeyA" | "KeyS" | "KeyD";
type Vec3 = [number, number, number];
type LookState = { yaw: number; pitch: number };

interface ThreeDModeShellProps {
  countdownDisplay: CountdownDisplayState;
  users: SessionUser[];
  localUserId: string;
  ownerId: string;
  onExit: () => void;
}

const REVEAL_DURATION_MS = 3200;
const START_CAMERA_POSITION = [0, 2.1, -4.35] as const;
const START_CAMERA_TARGET = [0, 2.1, -5.85] as const;
const MID_CAMERA_POSITION = [0, 2.45, -1.2] as const;
const MID_CAMERA_TARGET = [0, 1.45, -4.2] as const;
const END_CAMERA_TARGET = [0, 1.2, 0] as const;
const WALK_SPEED_UNITS_PER_SECOND = 2.2;
const PLAYER_RADIUS = 0.35;
const NORMAL_CAMERA_FOV = 56;
const TOP_DOWN_CAMERA_FOV = 62;
const INITIAL_LOOK_STATE: LookState = { yaw: 0, pitch: -0.35 };
const MIN_LOOK_PITCH = -0.9;
const MAX_LOOK_PITCH = 0.55;
const MOUSE_LOOK_SENSITIVITY = 0.0035;

function canCreateWebGLContext() {
  const canvas = document.createElement("canvas");

  return Boolean(
    canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl"),
  );
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolateVec3(start: readonly [number, number, number], end: readonly [number, number, number], progress: number) {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress),
  ] as const;
}

function getRevealPose(progress: number, levelConfig: LevelConfig) {
  const easedProgress = easeOutCubic(progress);

  if (easedProgress <= 0.55) {
    const segmentProgress = easedProgress / 0.55;

    return {
      position: interpolateVec3(START_CAMERA_POSITION, MID_CAMERA_POSITION, segmentProgress),
      target: interpolateVec3(START_CAMERA_TARGET, MID_CAMERA_TARGET, segmentProgress),
    };
  }

  const segmentProgress = (easedProgress - 0.55) / 0.45;

  return {
    position: interpolateVec3(MID_CAMERA_POSITION, levelConfig.playerStart.position, segmentProgress),
    target: interpolateVec3(MID_CAMERA_TARGET, END_CAMERA_TARGET, segmentProgress),
  };
}

function RevealCameraController({
  levelConfig,
  revealState,
  lookStateRef,
  onComplete,
}: {
  levelConfig: LevelConfig;
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
        camera.position.set(...levelConfig.playerStart.position);
        lookStateRef.current = { ...INITIAL_LOOK_STATE };
        camera.lookAt(...getLookTarget(levelConfig.playerStart.position, lookStateRef.current));
        didSnapToFinalRef.current = true;
      }

      return;
    }

    const nowMs = clock.getElapsedTime() * 1000;
    startedAtMsRef.current ??= nowMs;

    const progress = Math.min(1, (nowMs - startedAtMsRef.current) / REVEAL_DURATION_MS);
    const pose = getRevealPose(progress, levelConfig);

    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);

    if (progress >= 1 && !didCompleteRef.current) {
      didCompleteRef.current = true;
      didSnapToFinalRef.current = true;
      camera.position.set(...levelConfig.playerStart.position);
      lookStateRef.current = { ...INITIAL_LOOK_STATE };
      camera.lookAt(...getLookTarget(levelConfig.playerStart.position, lookStateRef.current));
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

function FirstPersonMovementController({
  levelConfig,
  enabled,
  lookStateRef,
}: {
  levelConfig: LevelConfig;
  enabled: boolean;
  lookStateRef: MutableRefObject<LookState>;
}) {
  const { camera, gl } = useThree();
  const activeKeysRef = useRef(new Set<MovementKey>());
  const isEnabledRef = useRef(enabled);
  const isPointerLookingRef = useRef(false);

  useEffect(() => {
    isEnabledRef.current = enabled;

    if (!enabled) {
      activeKeysRef.current.clear();
      isPointerLookingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isEnabledRef.current ||
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
      if (!isMovementKey(event.code)) {
        return;
      }

      event.preventDefault();
      activeKeysRef.current.delete(event.code);
    };

    const handleBlur = () => {
      activeKeysRef.current.clear();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      activeKeysRef.current.clear();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    const applyLook = () => {
      const position: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
      camera.lookAt(...getLookTarget(position, lookStateRef.current));
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isEnabledRef.current || event.button !== 0) {
        return;
      }

      event.preventDefault();
      isPointerLookingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isEnabledRef.current || !isPointerLookingRef.current) {
        return;
      }

      event.preventDefault();
      lookStateRef.current = {
        yaw: lookStateRef.current.yaw - event.movementX * MOUSE_LOOK_SENSITIVITY,
        pitch: clamp(lookStateRef.current.pitch - event.movementY * MOUSE_LOOK_SENSITIVITY, MIN_LOOK_PITCH, MAX_LOOK_PITCH),
      };
      applyLook();
    };

    const handlePointerUp = (event: PointerEvent) => {
      isPointerLookingRef.current = false;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const handlePointerLeave = () => {
      isPointerLookingRef.current = false;
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      isPointerLookingRef.current = false;
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [camera, gl, lookStateRef]);

  useFrame((_, delta) => {
    if (!enabled || activeKeysRef.current.size === 0) {
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

    if (length === 0) {
      return;
    }

    dx /= length;
    dz /= length;

    const currentX = camera.position.x;
    const currentZ = camera.position.z;
    const nextX = currentX + dx * WALK_SPEED_UNITS_PER_SECOND * delta;
    const nextZ = currentZ + dz * WALK_SPEED_UNITS_PER_SECOND * delta;
    const candidate = clampToRoom(nextX, nextZ, levelConfig);
    let resolved = { x: currentX, z: currentZ };

    if (!collidesWithBlocker(candidate.x, candidate.z, levelConfig)) {
      resolved = candidate;
    } else {
      const xOnly = clampToRoom(nextX, currentZ, levelConfig);
      const zOnly = clampToRoom(currentX, nextZ, levelConfig);

      if (!collidesWithBlocker(xOnly.x, xOnly.z, levelConfig)) {
        resolved = xOnly;
      } else if (!collidesWithBlocker(zOnly.x, zOnly.z, levelConfig)) {
        resolved = zOnly;
      }
    }

    camera.position.set(resolved.x, levelConfig.playerStart.position[1], resolved.z);
    camera.lookAt(...getLookTarget([resolved.x, levelConfig.playerStart.position[1], resolved.z], lookStateRef.current));
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
      if (!firstPersonPositionRef.current) {
        firstPersonPositionRef.current = [camera.position.x, camera.position.y, camera.position.z];
        onMarkerPositionChange(firstPersonPositionRef.current);
      }

      camera.position.set(...levelConfig.topDownCamera.position);
      camera.lookAt(...levelConfig.topDownCamera.target);

      if (camera.fov !== TOP_DOWN_CAMERA_FOV) {
        camera.fov = TOP_DOWN_CAMERA_FOV;
        camera.updateProjectionMatrix();
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

    if (camera.fov !== NORMAL_CAMERA_FOV) {
      camera.fov = NORMAL_CAMERA_FOV;
      camera.updateProjectionMatrix();
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

export function ThreeDModeShell({ countdownDisplay, users, localUserId, ownerId, onExit }: ThreeDModeShellProps) {
  const levelConfig = getLevelConfig(DEFAULT_LEVEL_ID);
  const [status, setStatus] = useState<ThreeDStatus>("checking");
  const [revealState, setRevealState] = useState<RevealState>("revealing");
  const [isTopDownViewActive, setIsTopDownViewActive] = useState(false);
  const [topDownMarkerPosition, setTopDownMarkerPosition] = useState<Vec3 | null>(null);
  const lookStateRef = useRef<LookState>({ ...INITIAL_LOOK_STATE });
  const canRenderCanvas = status === "loading" || status === "ready";

  useEffect(() => {
    setStatus(canCreateWebGLContext() ? "loading" : "unsupported");
  }, []);

  return (
    <div
      className="three-d-shell-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Unlocked view"
      data-reveal-state={revealState}
      data-camera-view={isTopDownViewActive ? "top-down" : "first-person"}
      data-3d-status={status}
    >
      {canRenderCanvas ? (
        <ThreeDModeErrorBoundary onError={() => setStatus("error")}>
          <Canvas
            camera={{ position: START_CAMERA_POSITION, fov: NORMAL_CAMERA_FOV }}
            dpr={[1, 1.75]}
            className="three-d-shell-canvas"
            onCreated={() => setStatus("ready")}
          >
            <RevealCameraController
              levelConfig={levelConfig}
              revealState={revealState}
              lookStateRef={lookStateRef}
              onComplete={() => setRevealState("complete")}
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
              lookStateRef={lookStateRef}
            />
            <Level1RoomShell
              levelConfig={levelConfig}
              countdownDisplay={countdownDisplay}
              users={users}
              localUserId={localUserId}
              ownerId={ownerId}
            />
            {isTopDownViewActive && topDownMarkerPosition ? <LocalPositionMarker position={topDownMarkerPosition} /> : null}
          </Canvas>
        </ThreeDModeErrorBoundary>
      ) : null}

      {status === "checking" || status === "loading" || status === "unsupported" || status === "error" ? (
        <ThreeDStatusPanel status={status} onExit={onExit} />
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
