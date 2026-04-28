import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

type InteractableObject = {
  parent?: unknown;
};

type IntersectionLike = {
  distance?: number;
  object?: unknown;
  point?: {
    x?: number;
    y?: number;
    z?: number;
  };
};

type RaycasterLike = {
  ray?: {
    origin?: {
      x?: number;
      y?: number;
      z?: number;
    };
    direction?: {
      x?: number;
      y?: number;
      z?: number;
    };
  };
  setFromCamera: (point: { x: number; y: number }, camera: unknown) => void;
  intersectObjects: (objects: unknown[], recursive: boolean) => IntersectionLike[];
};

export type InteractableRef = RefObject<InteractableObject | null>;
export type InteractionMode = "clickable" | "shootable" | "movable" | "draggable";
export type InteractionInput = "keyboard" | "pointer";

export interface AimContext {
  origin: [number, number, number];
  direction: [number, number, number];
  center: { x: 0; y: 0 };
}

export interface InteractionHit {
  id: string;
  label?: string;
  modes: InteractionMode[];
  distance: number;
  point: [number, number, number];
  aim: AimContext;
}

export interface InteractionActivation extends InteractionHit {
  input: InteractionInput;
  mode: InteractionMode;
  pointerDownAtMs?: number;
  activatedAtMs?: number;
  frameDeltaMs?: number;
  raycastDurationMs?: number;
  raycastObjectCount?: number;
}

interface InteractionActivationTiming {
  pointerDownAtMs?: number;
  frameDeltaMs?: number;
  raycastDurationMs?: number;
  raycastObjectCount?: number;
}

export interface InteractionPerformanceSample {
  frameDeltaMs: number;
  raycastDurationMs: number;
  raycastObjectCount: number;
  intersectionCount: number;
  hitCount: number;
}

export interface InteractionDragDelta {
  movementX: number;
  movementY: number;
  point?: [number, number, number];
}

export interface ShotEvent {
  mode: "shootable";
  input: "pointer";
  activation: InteractionActivation | null;
}

export interface InteractableRegistration {
  id: string;
  label?: string;
  objectRef: InteractableRef;
  areaId?: string;
  modes?: InteractionMode[];
  allowedInputs?: InteractionInput[];
  enabled?: boolean;
  onActivate?: (activation: InteractionActivation) => void;
  onDragStart?: (activation: InteractionActivation) => void;
  onDragMove?: (delta: InteractionDragDelta) => void;
  onDragEnd?: () => void;
}

interface AimState {
  aimContext: AimContext;
  hits: InteractionHit[];
}

interface InteractionContextValue {
  activeHit: InteractionHit | null;
  activeDragId: string | null;
  aimContext: AimContext | null;
  registerInteractable: (registration: InteractableRegistration) => () => void;
  setAimState: (state: AimState | null) => void;
  activateCurrent: (mode: InteractionMode, input: InteractionInput, timing?: InteractionActivationTiming) => InteractionActivation | null;
  activateActive: (mode: InteractionMode, input: InteractionInput, timing?: InteractionActivationTiming) => InteractionActivation | null;
  startCurrentDrag: (input: InteractionInput, timing?: InteractionActivationTiming) => InteractionActivation | null;
  updateActiveDrag: (delta: InteractionDragDelta) => void;
  endActiveDrag: () => void;
  getActiveDragObject: () => InteractableObject | null;
  getRegistrations: () => InteractableRegistration[];
  raycastAimHits: (raycaster: RaycasterLike, camera: unknown, activeAreaId?: string | null) => {
    aimContext: AimContext;
    hits: InteractionHit[];
    performanceSample: InteractionPerformanceSample;
  };
  notifyShot: (event: ShotEvent) => void;
  subscribeToShot: (listener: (event: ShotEvent) => void) => () => void;
}

const CENTER_POINT = { x: 0, y: 0 } as const;
const InteractionContext = createContext<InteractionContextValue | null>(null);
let activeInteractionDragCount = 0;

interface RaycastTargetSnapshot {
  areaId: string | null;
  enabled: boolean;
  included: boolean;
  object: InteractableObject | null;
}

interface RaycastTargetCache {
  activeAreaId: string | null;
  registrationsByObject: WeakMap<InteractableObject, InteractableRegistration>;
  snapshots: Map<string, RaycastTargetSnapshot>;
  targets: InteractableObject[];
}

export function isInteractionDragActive() {
  return activeInteractionDragCount > 0;
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function isObjectLike(value: unknown): value is InteractableObject {
  return Boolean(value && typeof value === "object");
}

function resolveRegistrationForObject(
  object: unknown,
  registrationsByObject: WeakMap<InteractableObject, InteractableRegistration>,
) {
  let current = object;

  while (isObjectLike(current)) {
    const registration = registrationsByObject.get(current);

    if (registration) {
      return registration;
    }

    current = current.parent;
  }

  return null;
}

function inferRegistrationAreaId(registration: InteractableRegistration) {
  if (registration.areaId) {
    return registration.areaId;
  }

  if (
    registration.id.startsWith("studio-") ||
    registration.id.startsWith("soundcloud-") ||
    registration.id.startsWith("deck-") ||
    registration.id.startsWith("crossfader-")
  ) {
    return "recording-studio";
  }

  if (registration.id.startsWith("control-room-") || registration.id.startsWith("jukebox-")) {
    return "control-room";
  }

  if (registration.id.startsWith("prototype-target-") || registration.id.startsWith("gun-rack-")) {
    return "shooting-range";
  }

  return null;
}

function shouldIncludeRegistrationForArea(registrationAreaId: string | null, activeAreaId?: string | null) {
  return !registrationAreaId || !activeAreaId || registrationAreaId === activeAreaId;
}

function getPointTuple(point: IntersectionLike["point"]): [number, number, number] {
  return [
    Number(point?.x ?? 0),
    Number(point?.y ?? 0),
    Number(point?.z ?? 0),
  ];
}

function getAimContext(raycaster: RaycasterLike): AimContext {
  const { ray } = raycaster;

  return {
    origin: [
      Number(ray?.origin?.x ?? 0),
      Number(ray?.origin?.y ?? 0),
      Number(ray?.origin?.z ?? 0),
    ],
    direction: [
      Number(ray?.direction?.x ?? 0),
      Number(ray?.direction?.y ?? 0),
      Number(ray?.direction?.z ?? -1),
    ],
    center: CENTER_POINT,
  };
}

function getRegistrationModes(registration: InteractableRegistration): InteractionMode[] {
  return registration.modes?.length ? registration.modes : ["clickable"];
}

function areVec3Equal(first: [number, number, number], second: [number, number, number]) {
  return first[0] === second[0] && first[1] === second[1] && first[2] === second[2];
}

function areModesEqual(first: InteractionMode[], second: InteractionMode[]) {
  return first.length === second.length && first.every((mode, index) => mode === second[index]);
}

function areAimContextsEqual(first: AimContext | null, second: AimContext | null) {
  if (!first || !second) {
    return first === second;
  }

  return areVec3Equal(first.origin, second.origin) && areVec3Equal(first.direction, second.direction);
}

function areHitsEqual(first: InteractionHit | null, second: InteractionHit | null) {
  if (!first || !second) {
    return first === second;
  }

  return (
    first.id === second.id &&
    first.label === second.label &&
    first.distance === second.distance &&
    areVec3Equal(first.point, second.point) &&
    areModesEqual(first.modes, second.modes) &&
    areAimContextsEqual(first.aim, second.aim)
  );
}

export function InteractionProvider({ children }: { children: ReactNode }) {
  const registrationsRef = useRef(new Map<string, InteractableRegistration>());
  const shotListenersRef = useRef(new Set<(event: ShotEvent) => void>());
  const raycastTargetCacheRef = useRef<RaycastTargetCache>({
    activeAreaId: null,
    registrationsByObject: new WeakMap(),
    snapshots: new Map(),
    targets: [],
  });
  const activeHitRef = useRef<InteractionHit | null>(null);
  const activeDragRef = useRef<{ activation: InteractionActivation; registration: InteractableRegistration } | null>(null);
  const aimHitsRef = useRef<InteractionHit[]>([]);
  const aimContextRef = useRef<AimContext | null>(null);
  const latestPerformanceSampleRef = useRef<InteractionPerformanceSample>({
    frameDeltaMs: 0,
    raycastDurationMs: 0,
    raycastObjectCount: 0,
    intersectionCount: 0,
    hitCount: 0,
  });
  const [activeHit, setActiveHitState] = useState<InteractionHit | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [aimContext, setAimContextState] = useState<AimContext | null>(null);

  const registerInteractable = useCallback((registration: InteractableRegistration) => {
    registrationsRef.current.set(registration.id, registration);
    raycastTargetCacheRef.current.snapshots.clear();

    return () => {
      const currentRegistration = registrationsRef.current.get(registration.id);

      if (currentRegistration === registration) {
        registrationsRef.current.delete(registration.id);
        raycastTargetCacheRef.current.snapshots.clear();
      }
    };
  }, []);

  const syncActiveRaycastTargets = useCallback((activeAreaId?: string | null) => {
    const normalizedAreaId = activeAreaId ?? null;
    const previousCache = raycastTargetCacheRef.current;
    const nextSnapshots = new Map<string, RaycastTargetSnapshot>();
    let changed = previousCache.activeAreaId !== normalizedAreaId || previousCache.snapshots.size !== registrationsRef.current.size;

    for (const registration of registrationsRef.current.values()) {
      const object = registration.objectRef.current ?? null;
      const enabled = registration.enabled !== false;
      const areaId = inferRegistrationAreaId(registration);
      const included = enabled && Boolean(object) && shouldIncludeRegistrationForArea(areaId, normalizedAreaId);
      const snapshot: RaycastTargetSnapshot = {
        areaId,
        enabled,
        included,
        object,
      };
      const previousSnapshot = previousCache.snapshots.get(registration.id);

      nextSnapshots.set(registration.id, snapshot);

      if (
        !previousSnapshot ||
        previousSnapshot.areaId !== snapshot.areaId ||
        previousSnapshot.enabled !== snapshot.enabled ||
        previousSnapshot.included !== snapshot.included ||
        previousSnapshot.object !== snapshot.object
      ) {
        changed = true;
      }
    }

    if (!changed) {
      return previousCache.targets;
    }

    const targets: InteractableObject[] = [];
    const registrationsByObject = new WeakMap<InteractableObject, InteractableRegistration>();

    for (const registration of registrationsRef.current.values()) {
      const snapshot = nextSnapshots.get(registration.id);

      if (snapshot?.included && snapshot.object) {
        targets.push(snapshot.object);
        registrationsByObject.set(snapshot.object, registration);
      }
    }

    raycastTargetCacheRef.current = {
      activeAreaId: normalizedAreaId,
      registrationsByObject,
      snapshots: nextSnapshots,
      targets,
    };

    return targets;
  }, []);

  const buildActivation = useCallback((
    hit: InteractionHit,
    mode: InteractionMode,
    input: InteractionInput,
    timing?: InteractionActivationTiming,
  ) => ({
    ...hit,
    input,
    mode,
    ...timing,
    activatedAtMs: performance.now(),
  }), []);

  const getHitForMode = useCallback((hits: InteractionHit[], mode: InteractionMode) => (
    hits.find((candidate) => candidate.modes.includes(mode)) ?? null
  ), []);

  const activateHit = useCallback((
    hit: InteractionHit | null,
    mode: InteractionMode,
    input: InteractionInput,
    timing?: InteractionActivationTiming,
  ) => {
    if (!hit || !hit.modes.includes(mode)) {
      return null;
    }

    const registration = registrationsRef.current.get(hit.id);

    if (!registration || registration.enabled === false) {
      return null;
    }

    if (registration.allowedInputs?.length && !registration.allowedInputs.includes(input)) {
      return null;
    }

    const activation = buildActivation(hit, mode, input, timing);
    registration.onActivate?.(activation);
    return activation;
  }, [buildActivation]);

  const raycastAimHits = useCallback((raycasterApi: RaycasterLike, camera: unknown, activeAreaId?: string | null) => {
    const raycastStartedAtMs = performance.now();
    const targets = syncActiveRaycastTargets(activeAreaId);

    raycasterApi.setFromCamera(CENTER_POINT, camera);

    const aimContext = getAimContext(raycasterApi);
    const intersections = targets.length > 0 ? raycasterApi.intersectObjects(targets, true) : [];
    const hits: InteractionHit[] = [];
    const seenRegistrationIds = new Set<string>();

    for (const intersection of intersections) {
      const registration = resolveRegistrationForObject(intersection.object, raycastTargetCacheRef.current.registrationsByObject);

      if (registration && !seenRegistrationIds.has(registration.id)) {
        seenRegistrationIds.add(registration.id);
        hits.push({
          id: registration.id,
          label: registration.label,
          modes: getRegistrationModes(registration),
          distance: Number(intersection.distance ?? 0),
          point: getPointTuple(intersection.point),
          aim: aimContext,
        });
      }
    }

    const performanceSample: InteractionPerformanceSample = {
      frameDeltaMs: latestPerformanceSampleRef.current.frameDeltaMs ?? 0,
      raycastDurationMs: Math.round((performance.now() - raycastStartedAtMs) * 10) / 10,
      raycastObjectCount: targets.length,
      intersectionCount: intersections.length,
      hitCount: hits.length,
    };

    latestPerformanceSampleRef.current = performanceSample;

    return {
      aimContext,
      hits,
      performanceSample,
    };
  }, [syncActiveRaycastTargets]);

  const endActiveDrag = useCallback(() => {
    const drag = activeDragRef.current;

    if (!drag) {
      return;
    }

    activeDragRef.current = null;
    activeInteractionDragCount = Math.max(0, activeInteractionDragCount - 1);
    setActiveDragId(null);
    drag.registration.onDragEnd?.();
  }, []);

  const startDragFromHit = useCallback((
    hit: InteractionHit | null,
    input: InteractionInput,
    timing?: InteractionActivationTiming,
  ) => {
    if (!hit || !hit.modes.includes("draggable")) {
      return null;
    }

    const registration = registrationsRef.current.get(hit.id);

    if (!registration || registration.enabled === false) {
      return null;
    }

    endActiveDrag();

    const activation = buildActivation(hit, "draggable", input, timing);
    activeDragRef.current = { activation, registration };
    activeInteractionDragCount += 1;
    setActiveDragId(hit.id);
    registration.onDragStart?.(activation);
    return activation;
  }, [buildActivation, endActiveDrag]);

  const setAimState = useCallback((state: AimState | null) => {
    const nextAimContext = state?.aimContext ?? null;
    const nextHits = state?.hits ?? [];
    const nextActiveHit = nextHits[0] ?? null;
    const previousHit = activeHitRef.current;
    const previousAimContext = aimContextRef.current;

    activeHitRef.current = nextActiveHit;
    aimHitsRef.current = nextHits;
    aimContextRef.current = nextAimContext;

    if (!areHitsEqual(previousHit, nextActiveHit)) {
      setActiveHitState(nextActiveHit);
    }

    if (!areAimContextsEqual(previousAimContext, nextAimContext)) {
      setAimContextState(nextAimContext);
    }
  }, []);

  const activateCurrent = useCallback((mode: InteractionMode, input: InteractionInput, timing?: InteractionActivationTiming) => {
    return activateHit(getHitForMode(aimHitsRef.current, mode), mode, input, timing);
  }, [activateHit, getHitForMode]);

  const activateActive = useCallback((mode: InteractionMode, input: InteractionInput, timing?: InteractionActivationTiming) => {
    return activateHit(activeHitRef.current, mode, input, timing);
  }, [activateHit]);

  const startCurrentDrag = useCallback((input: InteractionInput, timing?: InteractionActivationTiming) => {
    return startDragFromHit(getHitForMode(aimHitsRef.current, "draggable"), input, timing);
  }, [getHitForMode, startDragFromHit]);

  const updateActiveDrag = useCallback((delta: InteractionDragDelta) => {
    activeDragRef.current?.registration.onDragMove?.(delta);
  }, []);

  const getActiveDragObject = useCallback(() => activeDragRef.current?.registration.objectRef.current ?? null, []);

  const getRegistrations = useCallback(() => [...registrationsRef.current.values()], []);
  const notifyShot = useCallback((event: ShotEvent) => {
    shotListenersRef.current.forEach((listener) => listener(event));
  }, []);
  const subscribeToShot = useCallback((listener: (event: ShotEvent) => void) => {
    shotListenersRef.current.add(listener);

    return () => {
      shotListenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => () => {
    endActiveDrag();
  }, [endActiveDrag]);

  const value = useMemo<InteractionContextValue>(() => ({
    activeHit,
    activeDragId,
    activateActive,
    aimContext,
    registerInteractable,
    setAimState,
    activateCurrent,
    endActiveDrag,
    getActiveDragObject,
    getRegistrations,
    raycastAimHits,
    notifyShot,
    startCurrentDrag,
    subscribeToShot,
    updateActiveDrag,
  }), [activeDragId, activeHit, activateActive, aimContext, activateCurrent, endActiveDrag, getActiveDragObject, getRegistrations, notifyShot, raycastAimHits, registerInteractable, setAimState, startCurrentDrag, subscribeToShot, updateActiveDrag]);

  return <InteractionContext.Provider value={value}>{children}</InteractionContext.Provider>;
}

export function useInteractionRegistry() {
  const context = useContext(InteractionContext);

  if (!context) {
    throw new Error("useInteractionRegistry must be used inside InteractionProvider");
  }

  return context;
}

export function useRegisterInteractable(registration: InteractableRegistration) {
  const { registerInteractable } = useInteractionRegistry();

  useEffect(() => registerInteractable(registration), [registerInteractable, registration]);
}

export function AimInteractionController({
  enabled,
  enablePointerShoot = false,
  activeAreaId,
  onPerformanceSample,
}: {
  enabled: boolean;
  enablePointerShoot?: boolean;
  activeAreaId?: string | null;
  onPerformanceSample?: (sample: InteractionPerformanceSample | null) => void;
}) {
  const { camera, gl, raycaster } = useThree();
  const {
    activateCurrent,
    endActiveDrag,
    getActiveDragObject,
    notifyShot,
    setAimState,
    raycastAimHits,
    startCurrentDrag,
    updateActiveDrag,
  } = useInteractionRegistry();
  const enabledRef = useRef(enabled);
  const enablePointerShootRef = useRef(enablePointerShoot);
  const activeAreaIdRef = useRef(activeAreaId ?? null);
  const latestFrameTimingRef = useRef<Omit<InteractionActivationTiming, "pointerDownAtMs">>({});
  const onPerformanceSampleRef = useRef(onPerformanceSample);
  const latestPerformanceSampleRef = useRef<InteractionPerformanceSample | null>(null);
  const lastPerformanceSampleAtRef = useRef(0);

  useEffect(() => {
    onPerformanceSampleRef.current = onPerformanceSample;
  }, [onPerformanceSample]);

  useEffect(() => {
    enabledRef.current = enabled;

    if (!enabled) {
      setAimState(null);
      endActiveDrag();
      onPerformanceSampleRef.current?.(null);
    }
  }, [enabled, endActiveDrag, setAimState]);

  useEffect(() => {
    enablePointerShootRef.current = enablePointerShoot;
  }, [enablePointerShoot]);

  useEffect(() => {
    activeAreaIdRef.current = activeAreaId ?? null;
  }, [activeAreaId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !enabledRef.current ||
        event.code !== "KeyE" ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      activateCurrent("clickable", "keyboard");
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activateCurrent]);

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !enabledRef.current ||
        !enablePointerShootRef.current ||
        event.button !== 0 ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      const pointerDownAtMs = performance.now();
      const raycasterApi = raycaster as unknown as RaycasterLike;
      const raycastResult = raycastAimHits(raycasterApi, camera, activeAreaIdRef.current);
      const timing: InteractionActivationTiming = {
        ...latestFrameTimingRef.current,
        pointerDownAtMs,
        raycastDurationMs: raycastResult.performanceSample.raycastDurationMs,
        raycastObjectCount: raycastResult.performanceSample.raycastObjectCount,
      };

      setAimState({
        aimContext: raycastResult.aimContext,
        hits: raycastResult.hits,
      });

      const dragActivation = startCurrentDrag("pointer", timing);

      if (dragActivation) {
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      const clickableActivation = activateCurrent("clickable", "pointer", timing);

      if (clickableActivation) {
        return;
      }

      notifyShot({
        mode: "shootable",
        input: "pointer",
        activation: activateCurrent("shootable", "pointer", timing),
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabledRef.current || !isInteractionDragActive()) {
        return;
      }

      if (event.buttons === 0) {
        endActiveDrag();
        return;
      }

      event.preventDefault();

      const dragObject = getActiveDragObject();
      let point: [number, number, number] | undefined;

      if (dragObject) {
        const raycasterApi = raycaster as unknown as RaycasterLike;
        raycasterApi.setFromCamera(CENTER_POINT, camera);
        const intersection = raycasterApi.intersectObjects([dragObject], true)[0];
        point = intersection ? getPointTuple(intersection.point) : undefined;
      }

      updateActiveDrag({ movementX: event.movementX, movementY: event.movementY, point });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      endActiveDrag();
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas) {
        endActiveDrag();
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      endActiveDrag();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [activateCurrent, camera, endActiveDrag, getActiveDragObject, gl, notifyShot, raycastAimHits, raycaster, setAimState, startCurrentDrag, updateActiveDrag]);

  useFrame((_, delta) => {
    if (!enabled) {
      return;
    }

    const raycasterApi = raycaster as unknown as RaycasterLike;
    const raycastResult = raycastAimHits(raycasterApi, camera, activeAreaIdRef.current);

    setAimState({
      aimContext: raycastResult.aimContext,
      hits: raycastResult.hits,
    });

    const frameDeltaMs = Math.round(delta * 10000) / 10;
    latestFrameTimingRef.current = {
      frameDeltaMs,
      raycastDurationMs: raycastResult.performanceSample.raycastDurationMs,
      raycastObjectCount: raycastResult.performanceSample.raycastObjectCount,
    };
    latestPerformanceSampleRef.current = {
      ...raycastResult.performanceSample,
      frameDeltaMs,
    };

    const now = performance.now();

    if (now - lastPerformanceSampleAtRef.current >= 500) {
      lastPerformanceSampleAtRef.current = now;
      onPerformanceSampleRef.current?.(latestPerformanceSampleRef.current);
    }
  });

  return null;
}

export function InteractionReticle({ enabled }: { enabled: boolean }) {
  const { activeHit } = useInteractionRegistry();

  if (!enabled) {
    return null;
  }

  return (
    <div
      className={`three-d-interaction-reticle${activeHit ? " three-d-interaction-reticle-active" : ""}`}
      aria-hidden="true"
    />
  );
}
