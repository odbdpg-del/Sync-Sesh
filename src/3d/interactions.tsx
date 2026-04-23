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
  modes?: InteractionMode[];
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
  activateCurrent: (mode: InteractionMode, input: InteractionInput) => InteractionActivation | null;
  activateActive: (mode: InteractionMode, input: InteractionInput) => InteractionActivation | null;
  startCurrentDrag: (input: InteractionInput) => InteractionActivation | null;
  updateActiveDrag: (delta: InteractionDragDelta) => void;
  endActiveDrag: () => void;
  getActiveDragObject: () => InteractableObject | null;
  getRegistrations: () => InteractableRegistration[];
  notifyShot: (event: ShotEvent) => void;
  subscribeToShot: (listener: (event: ShotEvent) => void) => () => void;
}

const CENTER_POINT = { x: 0, y: 0 } as const;
const InteractionContext = createContext<InteractionContextValue | null>(null);
let activeInteractionDragCount = 0;

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

function objectBelongsToRegistration(object: unknown, registrationObject: InteractableObject) {
  let current = object;

  while (isObjectLike(current)) {
    if (current === registrationObject) {
      return true;
    }

    current = current.parent;
  }

  return false;
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
  const activeHitRef = useRef<InteractionHit | null>(null);
  const activeDragRef = useRef<{ activation: InteractionActivation; registration: InteractableRegistration } | null>(null);
  const aimHitsRef = useRef<InteractionHit[]>([]);
  const aimContextRef = useRef<AimContext | null>(null);
  const [activeHit, setActiveHitState] = useState<InteractionHit | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [aimContext, setAimContextState] = useState<AimContext | null>(null);

  const registerInteractable = useCallback((registration: InteractableRegistration) => {
    registrationsRef.current.set(registration.id, registration);

    return () => {
      const currentRegistration = registrationsRef.current.get(registration.id);

      if (currentRegistration === registration) {
        registrationsRef.current.delete(registration.id);
      }
    };
  }, []);

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

  const activateCurrent = useCallback((mode: InteractionMode, input: InteractionInput) => {
    const hit = aimHitsRef.current.find((candidate) => candidate.modes.includes(mode));

    if (!hit) {
      return null;
    }

    const registration = registrationsRef.current.get(hit.id);

    if (!registration || registration.enabled === false) {
      return null;
    }

    const activation = { ...hit, input, mode };
    registration.onActivate?.(activation);
    return activation;
  }, []);

  const activateActive = useCallback((mode: InteractionMode, input: InteractionInput) => {
    const hit = activeHitRef.current;

    if (!hit || !hit.modes.includes(mode)) {
      return null;
    }

    const registration = registrationsRef.current.get(hit.id);

    if (!registration || registration.enabled === false) {
      return null;
    }

    const activation = { ...hit, input, mode };
    registration.onActivate?.(activation);
    return activation;
  }, []);

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

  const startCurrentDrag = useCallback((input: InteractionInput) => {
    const hit = aimHitsRef.current.find((candidate) => candidate.modes.includes("draggable"));

    if (!hit) {
      return null;
    }

    const registration = registrationsRef.current.get(hit.id);

    if (!registration || registration.enabled === false) {
      return null;
    }

    endActiveDrag();

    const activation = { ...hit, input, mode: "draggable" as const };
    activeDragRef.current = { activation, registration };
    activeInteractionDragCount += 1;
    setActiveDragId(hit.id);
    registration.onDragStart?.(activation);
    return activation;
  }, [endActiveDrag]);

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
    notifyShot,
    startCurrentDrag,
    subscribeToShot,
    updateActiveDrag,
  }), [activeDragId, activeHit, activateActive, aimContext, activateCurrent, endActiveDrag, getActiveDragObject, getRegistrations, notifyShot, registerInteractable, setAimState, startCurrentDrag, subscribeToShot, updateActiveDrag]);

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

export function AimInteractionController({ enabled, enablePointerShoot = false }: { enabled: boolean; enablePointerShoot?: boolean }) {
  const { camera, gl, raycaster } = useThree();
  const { activateActive, activateCurrent, endActiveDrag, getActiveDragObject, getRegistrations, notifyShot, setAimState, startCurrentDrag, updateActiveDrag } = useInteractionRegistry();
  const enabledRef = useRef(enabled);
  const enablePointerShootRef = useRef(enablePointerShoot);

  useEffect(() => {
    enabledRef.current = enabled;

    if (!enabled) {
      setAimState(null);
      endActiveDrag();
    }
  }, [enabled, endActiveDrag, setAimState]);

  useEffect(() => {
    enablePointerShootRef.current = enablePointerShoot;
  }, [enablePointerShoot]);

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

      const dragActivation = startCurrentDrag("pointer");

      if (dragActivation) {
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      const clickableActivation = activateCurrent("clickable", "pointer");

      if (clickableActivation) {
        return;
      }

      notifyShot({
        mode: "shootable",
        input: "pointer",
        activation: activateActive("shootable", "pointer"),
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
  }, [activateActive, activateCurrent, camera, endActiveDrag, getActiveDragObject, gl, notifyShot, raycaster, startCurrentDrag, updateActiveDrag]);

  useFrame(() => {
    if (!enabled) {
      return;
    }

    const registrations = getRegistrations().filter((registration) => registration.enabled !== false && registration.objectRef.current);
    const objects = registrations.map((registration) => registration.objectRef.current);

    if (objects.length === 0) {
      setAimState(null);
      return;
    }

    const raycasterApi = raycaster as unknown as RaycasterLike;
    raycasterApi.setFromCamera(CENTER_POINT, camera);

    const aimContext = getAimContext(raycasterApi);
    const intersections = raycasterApi.intersectObjects(objects, true);
    const hits: InteractionHit[] = [];

    for (const intersection of intersections) {
      const registration = registrations.find((candidate) => {
        const registrationObject = candidate.objectRef.current;
        return registrationObject ? objectBelongsToRegistration(intersection.object, registrationObject) : false;
      });

      if (registration) {
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

    setAimState({ aimContext, hits });
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
