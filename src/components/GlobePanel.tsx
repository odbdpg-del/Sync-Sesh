import { Canvas, useFrame } from "@react-three/fiber";
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ElementRef, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import {
  SERVER_GLOBE_POINT,
  createGlobeRouteModel,
  latLonToVector3,
  orbitToVector3,
  type GlobePoint,
  type GlobeSatellite,
  type GlobeVector3,
} from "../lib/globe/globePoints";
import { CONTINENT_OUTLINES, type ContinentCoordinate } from "../lib/globe/continentOutlines";
import { EARTH_TOPO_LINE_SETS, type EarthTopoCoordinate, type EarthTopoLineKind, type EarthTopoLineSet } from "../lib/globe/earthTopoLines";
import type { SessionInfo, SessionUser } from "../types/session";

interface GlobeRotation {
  x: number;
  y: number;
}

type GlobeOrbitMode = "momentum" | "free";
type GlobeLayerKey = "grid" | "landFill" | "coastline" | "rivers" | "lakes";

type GlobeLayerVisibility = Record<GlobeLayerKey, boolean>;

interface GlobeDragState {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastAt: number;
  startRotation: GlobeRotation;
}

interface GlobePanelProps {
  session: SessionInfo;
  users: readonly SessionUser[];
  localUserId?: string;
  vpnVisualEnabled: boolean;
  onToggleVpnVisual: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onClose: () => void;
}

interface GlobePanelErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface GlobePanelErrorBoundaryState {
  hasError: boolean;
}

const INITIAL_GLOBE_ROTATION: GlobeRotation = { x: 0.2, y: -0.35 };
const GLOBE_DRAG_ROTATION_SPEED = 0.008;
const GLOBE_MOMENTUM_DECAY_PER_SECOND = 3.4;
const GLOBE_MOMENTUM_STOP_EPSILON = 0.0008;
const GLOBE_MAX_MOMENTUM = 2.8;
const GLOBE_MIN_TILT = -1.05;
const GLOBE_MAX_TILT = 1.05;
const GLOBE_DEFAULT_CAMERA_POSITION: GlobeVector3 = [0, 0.22, 4.2];
const GLOBE_DEFAULT_CAMERA_TARGET: GlobeVector3 = [0, 0, 0];
const GLOBE_FOCUSED_CAMERA_ORBIT: GlobeRotation = { x: 0.18, y: 0.7 };
const GLOBE_DEFAULT_CAMERA_DISTANCE = getVectorLength(GLOBE_DEFAULT_CAMERA_POSITION);
const GLOBE_MIN_CAMERA_DISTANCE = 1.18;
const GLOBE_MAX_CAMERA_DISTANCE = 6.2;
const GLOBE_DEFAULT_FOCUSED_CAMERA_DISTANCE = 1.48;
const GLOBE_MIN_FOCUSED_CAMERA_DISTANCE = 0.46;
const GLOBE_MAX_FOCUSED_CAMERA_DISTANCE = 2.35;
const GLOBE_WHEEL_ZOOM_SPEED = 0.0018;
const GLOBE_BUTTON_ZOOM_STEP = 0.42;
const GLOBE_CONTINENT_RADIUS = 1.018;
const GLOBE_CONTINENT_SEGMENT_RADIANS = 0.09;
const GLOBE_ROUTE_ARC_SEGMENTS = 18;
const GLOBE_ROUTE_MIN_RADIUS = 1.035;
const GLOBE_MIN_COASTLINE_DETAIL = 1;
const GLOBE_MAX_COASTLINE_DETAIL = 10;
const DEFAULT_GLOBE_COASTLINE_DETAIL = 6;
const GLOBE_LAND_FILL_RADIUS = 1.006;
const THREE_DOUBLE_SIDE = 2;
const DEFAULT_GLOBE_LAYERS: GlobeLayerVisibility = {
  grid: true,
  landFill: true,
  coastline: true,
  rivers: true,
  lakes: true,
};

class GlobePanelErrorBoundary extends Component<GlobePanelErrorBoundaryProps, GlobePanelErrorBoundaryState> {
  override state: GlobePanelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlobePanelErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch() {
    this.setState({ hasError: true });
  }

  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function GlobePanel({ session, users, localUserId, vpnVisualEnabled, onToggleVpnVisual, onFullscreenChange, onClose }: GlobePanelProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [globeRotation, setGlobeRotation] = useState<GlobeRotation>(INITIAL_GLOBE_ROTATION);
  const [globeOrbitMode, setGlobeOrbitMode] = useState<GlobeOrbitMode>("momentum");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingGlobe, setIsDraggingGlobe] = useState(false);
  const [hoveredSatelliteId, setHoveredSatelliteId] = useState<string | null>(null);
  const [focusedSatelliteId, setFocusedSatelliteId] = useState<string | null>(null);
  const [focusedCameraOrbit, setFocusedCameraOrbit] = useState<GlobeRotation>(GLOBE_FOCUSED_CAMERA_ORBIT);
  const [globeCameraDistance, setGlobeCameraDistance] = useState(GLOBE_DEFAULT_CAMERA_DISTANCE);
  const [focusedCameraDistance, setFocusedCameraDistance] = useState(GLOBE_DEFAULT_FOCUSED_CAMERA_DISTANCE);
  const [layerVisibility, setLayerVisibility] = useState<GlobeLayerVisibility>(DEFAULT_GLOBE_LAYERS);
  const [coastlineDetail, setCoastlineDetail] = useState(DEFAULT_GLOBE_COASTLINE_DETAIL);
  const [isViewportToolbarOpen, setIsViewportToolbarOpen] = useState(false);
  const [isViewportFpsVisible, setIsViewportFpsVisible] = useState(false);
  const [viewportFps, setViewportFps] = useState(0);
  const globeDragStateRef = useRef<GlobeDragState | null>(null);
  const globeMomentumRef = useRef<GlobeRotation>({ x: 0, y: 0 });
  const routeModel = useMemo(
    () =>
      createGlobeRouteModel({
        sessionId: session.id,
        users,
        localUserId,
        vpnVisualEnabled,
      }),
    [localUserId, session.id, users, vpnVisualEnabled],
  );
  const canShowVpnRoute = Boolean(routeModel.vpnSurfacePoint && routeModel.vpnConnections?.length);
  const hoveredSatellite = hoveredSatelliteId
    ? routeModel.satellites.find((satellite) => satellite.id === hoveredSatelliteId)
    : undefined;
  const focusedSatellite = focusedSatelliteId
    ? routeModel.satellites.find((satellite) => satellite.id === focusedSatelliteId)
    : undefined;
  const activeSatellite = hoveredSatellite ?? focusedSatellite;

  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  useEffect(() => {
    return () => onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  useEffect(() => {
    if (!focusedSatelliteId) {
      return;
    }

    if (!routeModel.satellites.some((satellite) => satellite.id === focusedSatelliteId)) {
      setFocusedSatelliteId(null);
    }
  }, [focusedSatelliteId, routeModel.satellites]);

  const selectFocusedSatellite = (satelliteId: string | null) => {
    setFocusedSatelliteId(satelliteId);

    if (satelliteId) {
      globeMomentumRef.current = { x: 0, y: 0 };
      setFocusedCameraOrbit(GLOBE_FOCUSED_CAMERA_ORBIT);
    }
  };

  const startGlobeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    globeDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastAt: performance.now(),
      startRotation: focusedSatelliteId ? focusedCameraOrbit : globeRotation,
    };
    globeMomentumRef.current = { x: 0, y: 0 };
    setIsDraggingGlobe(true);
  };
  const moveGlobeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = globeDragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const now = performance.now();
    const elapsedSeconds = Math.max((now - dragState.lastAt) / 1000, 0.016);
    const movementX = event.clientX - dragState.lastX;
    const movementY = event.clientY - dragState.lastY;

    const nextMomentum = {
      x: clamp((movementY * GLOBE_DRAG_ROTATION_SPEED) / elapsedSeconds, -GLOBE_MAX_MOMENTUM, GLOBE_MAX_MOMENTUM),
      y: clamp((movementX * GLOBE_DRAG_ROTATION_SPEED) / elapsedSeconds, -GLOBE_MAX_MOMENTUM, GLOBE_MAX_MOMENTUM),
    };

    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    dragState.lastAt = now;

    if (focusedSatelliteId) {
      setFocusedCameraOrbit({
        x: clamp(dragState.startRotation.x + deltaY * GLOBE_DRAG_ROTATION_SPEED, GLOBE_MIN_TILT, GLOBE_MAX_TILT),
        y: dragState.startRotation.y + deltaX * GLOBE_DRAG_ROTATION_SPEED,
      });
      return;
    }

    globeMomentumRef.current = nextMomentum;
    setGlobeRotation({
      x: clamp(dragState.startRotation.x + deltaY * GLOBE_DRAG_ROTATION_SPEED, GLOBE_MIN_TILT, GLOBE_MAX_TILT),
      y: dragState.startRotation.y + deltaX * GLOBE_DRAG_ROTATION_SPEED,
    });
  };
  const endGlobeDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = globeDragStateRef.current;

    if (dragState?.pointerId === event.pointerId) {
      globeDragStateRef.current = null;
      setIsDraggingGlobe(false);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const zoomGlobeCamera = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const zoomDelta = event.deltaY * GLOBE_WHEEL_ZOOM_SPEED;

    if (focusedSatelliteId) {
      setFocusedCameraDistance((current) => clamp(current + zoomDelta, GLOBE_MIN_FOCUSED_CAMERA_DISTANCE, GLOBE_MAX_FOCUSED_CAMERA_DISTANCE));
      return;
    }

    setGlobeCameraDistance((current) => clamp(current + zoomDelta, GLOBE_MIN_CAMERA_DISTANCE, GLOBE_MAX_CAMERA_DISTANCE));
  };
  const updateLayerVisibility = (layer: GlobeLayerKey) => {
    setLayerVisibility((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
  };
  const zoomViewportByButton = (direction: "in" | "out") => {
    const zoomDelta = direction === "in" ? -GLOBE_BUTTON_ZOOM_STEP : GLOBE_BUTTON_ZOOM_STEP;

    if (focusedSatelliteId) {
      setFocusedCameraDistance((current) => clamp(current + zoomDelta, GLOBE_MIN_FOCUSED_CAMERA_DISTANCE, GLOBE_MAX_FOCUSED_CAMERA_DISTANCE));
      return;
    }

    setGlobeCameraDistance((current) => clamp(current + zoomDelta, GLOBE_MIN_CAMERA_DISTANCE, GLOBE_MAX_CAMERA_DISTANCE));
  };
  const resetViewportZoom = () => {
    setGlobeCameraDistance(GLOBE_DEFAULT_CAMERA_DISTANCE);
    setFocusedCameraDistance(GLOBE_DEFAULT_FOCUSED_CAMERA_DISTANCE);
  };

  const panel = (
    <section className="panel globe-panel" data-fullscreen={isFullscreen ? "true" : "false"} aria-labelledby="globe-panel-title">
      <div className="section-heading globe-panel-heading">
        <div>
          <p className="eyebrow">Network Map</p>
          <h2 id="globe-panel-title">Globe</h2>
        </div>
        <div className="globe-panel-actions">
          <button
            type="button"
            className="ghost-button globe-panel-toggle"
            data-active={globeOrbitMode === "free" ? "true" : "false"}
            onClick={() => setGlobeOrbitMode((current) => (current === "momentum" ? "free" : "momentum"))}
            aria-pressed={globeOrbitMode === "free"}
          >
            {globeOrbitMode === "free" ? "FREE" : "MOMENTUM"}
          </button>
          <button
            type="button"
            className="ghost-button globe-panel-toggle"
            data-active={vpnVisualEnabled ? "true" : "false"}
            onClick={onToggleVpnVisual}
            aria-pressed={vpnVisualEnabled}
          >
            VPN VISUAL
          </button>
          <button
            type="button"
            className="globe-panel-window-button"
            aria-label={isFullscreen ? "Minimize globe panel" : "Maximize globe panel"}
            title={isFullscreen ? "Minimize" : "Maximize"}
            onClick={() => setIsFullscreen((current) => !current)}
          >
            {isFullscreen ? "_" : "[]"}
          </button>
          <button type="button" className="globe-panel-window-button" aria-label="Close globe panel" title="Close" onClick={onClose}>
            X
          </button>
        </div>
      </div>

      <div className="globe-panel-layout">
        <div
          className="globe-panel-viewport"
          data-dragging={isDraggingGlobe ? "true" : "false"}
          aria-label="Animated session globe"
          onPointerDown={startGlobeDrag}
          onPointerMove={moveGlobeDrag}
          onPointerUp={endGlobeDrag}
          onPointerCancel={endGlobeDrag}
          onWheel={zoomGlobeCamera}
        >
          <GlobePanelErrorBoundary fallback={<GlobeStaticFallback />}>
            <Canvas camera={{ position: GLOBE_DEFAULT_CAMERA_POSITION, fov: 42 }} dpr={[1, 1.75]} onPointerMissed={() => selectFocusedSatellite(null)}>
              <color attach="background" args={["#030915"]} />
              <ambientLight intensity={0.64} />
              <pointLight position={[2.4, 3, 3.5]} intensity={1.45} color="#6df3ff" />
              <GlobeScene
                server={routeModel.server}
                satellites={routeModel.satellites}
                vpnSurfacePoint={routeModel.vpnSurfacePoint}
                reducedMotion={prefersReducedMotion}
                rotation={globeRotation}
                focusedCameraOrbit={focusedCameraOrbit}
                globeCameraDistance={globeCameraDistance}
                focusedCameraDistance={focusedCameraDistance}
                layerVisibility={layerVisibility}
                coastlineDetail={coastlineDetail}
                hoveredSatelliteId={hoveredSatelliteId}
                focusedSatelliteId={focusedSatelliteId}
                onHoverSatellite={setHoveredSatelliteId}
                onSelectSatellite={selectFocusedSatellite}
                onFpsUpdate={setViewportFps}
                onMomentumFrame={(delta) => {
                  if (isDraggingGlobe) {
                    return;
                  }

                  const momentum = globeMomentumRef.current;

                  if (Math.abs(momentum.x) < GLOBE_MOMENTUM_STOP_EPSILON && Math.abs(momentum.y) < GLOBE_MOMENTUM_STOP_EPSILON) {
                    globeMomentumRef.current = { x: 0, y: 0 };
                    return;
                  }

                  setGlobeRotation((current) => ({
                    x: clamp(current.x + momentum.x * delta, GLOBE_MIN_TILT, GLOBE_MAX_TILT),
                    y: current.y + momentum.y * delta,
                  }));

                  if (globeOrbitMode === "momentum") {
                    const decay = Math.exp(-GLOBE_MOMENTUM_DECAY_PER_SECOND * delta);
                    globeMomentumRef.current = {
                      x: momentum.x * decay,
                      y: momentum.y * decay,
                    };
                  }
                }}
              />
            </Canvas>
          </GlobePanelErrorBoundary>
          {focusedSatellite ? (
            <button
              type="button"
              className="globe-panel-back-button"
              aria-label="Back to globe focus"
              title="Back to globe"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                selectFocusedSatellite(null);
              }}
            >
              <span aria-hidden="true">&lt;</span>
            </button>
          ) : null}
          <div className="globe-panel-hover-label" data-visible={activeSatellite ? "true" : "false"} aria-live="polite">
            <span>{focusedSatellite ? "Camera Target" : "Satellite"}</span>
            <strong>{activeSatellite?.label ?? "Hover a user node"}</strong>
          </div>
          {isViewportFpsVisible ? (
            <div className="globe-panel-fps-readout" aria-live="polite">
              {viewportFps || "--"} FPS
            </div>
          ) : null}
          <div
            className="globe-panel-viewport-toolbar"
            data-open={isViewportToolbarOpen ? "true" : "false"}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {isViewportToolbarOpen ? (
              <div className="globe-panel-viewport-toolbar-menu" aria-label="Globe viewport options">
                <p>Viewport</p>
                <label>
                  <input type="checkbox" checked={layerVisibility.grid} onChange={() => updateLayerVisibility("grid")} />
                  Grid
                </label>
                <label>
                  <input type="checkbox" checked={layerVisibility.landFill} onChange={() => updateLayerVisibility("landFill")} />
                  Land Fill
                </label>
                <label>
                  <input type="checkbox" checked={layerVisibility.coastline} onChange={() => updateLayerVisibility("coastline")} />
                  Coastlines
                </label>
                <div className="globe-panel-viewport-detail-control">
                  <div>
                    <span>Coastline Detail</span>
                    <strong>{coastlineDetail}/10</strong>
                  </div>
                  <input
                    type="range"
                    min={GLOBE_MIN_COASTLINE_DETAIL}
                    max={GLOBE_MAX_COASTLINE_DETAIL}
                    step={1}
                    value={coastlineDetail}
                    onChange={(event) => setCoastlineDetail(Number(event.currentTarget.value))}
                    aria-label="Coastline detail"
                  />
                </div>
                <label>
                  <input type="checkbox" checked={layerVisibility.rivers} onChange={() => updateLayerVisibility("rivers")} />
                  Rivers
                </label>
                <label>
                  <input type="checkbox" checked={layerVisibility.lakes} onChange={() => updateLayerVisibility("lakes")} />
                  Lakes
                </label>
                <label>
                  <input type="checkbox" checked={isViewportFpsVisible} onChange={() => setIsViewportFpsVisible((current) => !current)} />
                  FPS
                </label>
                <div className="globe-panel-viewport-zoom-controls" aria-label="Globe zoom controls">
                  <button type="button" onClick={() => zoomViewportByButton("in")}>+</button>
                  <button type="button" onClick={() => zoomViewportByButton("out")}>-</button>
                  <button type="button" onClick={resetViewportZoom}>Reset</button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="globe-panel-viewport-toolbar-toggle"
              aria-label={isViewportToolbarOpen ? "Close globe viewport toolbar" : "Open globe viewport toolbar"}
              aria-expanded={isViewportToolbarOpen}
              onClick={() => setIsViewportToolbarOpen((current) => !current)}
            >
              i
            </button>
          </div>
        </div>

        <div className="globe-panel-summary" aria-label="Globe summary">
          <div className="globe-panel-readout">
            <span>Server</span>
            <strong>{SERVER_GLOBE_POINT.label}</strong>
          </div>
          <div className="globe-panel-readout">
            <span>Satellites</span>
            <strong>{routeModel.satellites.length}</strong>
          </div>
          <div className="globe-panel-readout">
            <span>Route Mode</span>
            <strong>{canShowVpnRoute ? "VPN VISUAL: ON" : "Direct Visual"}</strong>
          </div>
          <div className="globe-panel-readout">
            <span>Orbit Mode</span>
            <strong>{globeOrbitMode}</strong>
          </div>
          <div className="globe-panel-readout">
            <span>Camera Target</span>
            <strong>{focusedSatellite?.label ?? "None"}</strong>
          </div>
          <p className="globe-panel-note">
            User nodes are privacy-safe satellites derived from session ids. The VPN route is a local visual only and does not
            change networking.
          </p>
        </div>
      </div>
    </section>
  );

  return isFullscreen && typeof document !== "undefined" ? createPortal(panel, document.body) : panel;
}

function GlobeScene({
  server,
  satellites,
  vpnSurfacePoint,
  reducedMotion,
  rotation,
  focusedCameraOrbit,
  globeCameraDistance,
  focusedCameraDistance,
  layerVisibility,
  coastlineDetail,
  hoveredSatelliteId,
  focusedSatelliteId,
  onHoverSatellite,
  onSelectSatellite,
  onFpsUpdate,
  onMomentumFrame,
}: {
  server: GlobePoint;
  satellites: readonly GlobeSatellite[];
  vpnSurfacePoint?: GlobePoint;
  reducedMotion: boolean;
  rotation: GlobeRotation;
  focusedCameraOrbit: GlobeRotation;
  globeCameraDistance: number;
  focusedCameraDistance: number;
  layerVisibility: GlobeLayerVisibility;
  coastlineDetail: number;
  hoveredSatelliteId: string | null;
  focusedSatelliteId: string | null;
  onHoverSatellite: (satelliteId: string | null) => void;
  onSelectSatellite: (satelliteId: string | null) => void;
  onFpsUpdate: (fps: number) => void;
  onMomentumFrame: (delta: number) => void;
}) {
  const sceneRef = useRef<ElementRef<"group">>(null);
  const rotationSpeed = reducedMotion ? 0.006 : 0.055;

  useFrame(({ camera, clock }, delta) => {
    onMomentumFrame(delta);

    if (sceneRef.current) {
      sceneRef.current.rotation.y += delta * rotationSpeed;
    }

    const focusedSatellite = focusedSatelliteId
      ? satellites.find((satellite) => satellite.id === focusedSatelliteId)
      : undefined;

    if (!focusedSatellite || !sceneRef.current) {
      const cameraPosition = getDefaultCameraPosition(globeCameraDistance);

      easeGroupPosition(sceneRef.current, GLOBE_DEFAULT_CAMERA_TARGET, delta, 4.8);
      easeCamera(camera, cameraPosition, GLOBE_DEFAULT_CAMERA_TARGET, delta, 4.6);
      return;
    }

    const satellitePosition = getSatellitePosition(focusedSatellite, clock.elapsedTime, reducedMotion);
    const satelliteCenter = rotateVector(satellitePosition, sceneRef.current.rotation.x, sceneRef.current.rotation.y);
    const recenteredScenePosition: GlobeVector3 = [-satelliteCenter[0], -satelliteCenter[1], -satelliteCenter[2]];
    const cameraPosition = getFocusedSatelliteCameraPosition(focusedCameraOrbit, focusedCameraDistance, clock.elapsedTime);

    sceneRef.current.position.set(...recenteredScenePosition);
    easeCamera(camera, cameraPosition, GLOBE_DEFAULT_CAMERA_TARGET, delta, 5.8);
  });

  return (
    <group ref={sceneRef} rotation={[rotation.x, rotation.y, 0]}>
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial args={[{ color: "#07182b", transparent: true, opacity: 0.58 }]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.002, 32, 20]} />
        <meshBasicMaterial args={[{ color: "#38dfff", wireframe: true, transparent: true, opacity: layerVisibility.grid ? 0.1 : 0.035 }]} />
      </mesh>
      {layerVisibility.landFill ? <LandFillLayer /> : null}
      <EarthTopoWireframe layerVisibility={layerVisibility} coastlineDetail={coastlineDetail} />
      {layerVisibility.grid ? <GlobeRings /> : null}
      <ViewportFpsProbe onFpsUpdate={onFpsUpdate} />
      <SurfacePoint point={server} color="#78f7ff" scale={0.054} />
      {vpnSurfacePoint ? <SurfacePoint point={vpnSurfacePoint} color="#b899ff" scale={0.044} /> : null}
      {satellites.map((satellite) => (
        <SatellitePoint
          key={satellite.id}
          satellite={satellite}
          reducedMotion={reducedMotion}
          isHovered={satellite.id === hoveredSatelliteId}
          isFocused={satellite.id === focusedSatelliteId}
          onHover={onHoverSatellite}
          onSelect={onSelectSatellite}
        />
      ))}
      {satellites.map((satellite) => (
        <OrbitConnection key={`server-${satellite.id}`} from={server.position} satellite={satellite} reducedMotion={reducedMotion} />
      ))}
      {vpnSurfacePoint
        ? satellites
            .filter((satellite) => satellite.isLocal)
            .map((satellite) => (
              <OrbitConnection
                key={`vpn-satellite-${satellite.id}`}
                from={vpnSurfacePoint.position}
                satellite={satellite}
                reducedMotion={reducedMotion}
                color="#a979ff"
              />
            ))
        : null}
      {vpnSurfacePoint ? <StaticConnection from={vpnSurfacePoint.position} to={server.position} color="#a979ff" /> : null}
    </group>
  );
}

function EarthTopoWireframe({
  layerVisibility,
  coastlineDetail,
}: {
  layerVisibility: GlobeLayerVisibility;
  coastlineDetail: number;
}) {
  return (
    <>
      {EARTH_TOPO_LINE_SETS.filter((lineSet) => isTopoLayerVisible(lineSet.kind, layerVisibility)).map((lineSet) => (
        <SurfaceLineSet key={lineSet.id} lineSet={lineSet} detail={getTopoLineDetail(lineSet.kind, coastlineDetail)} />
      ))}
    </>
  );
}

function LandFillLayer() {
  return (
    <>
      {CONTINENT_OUTLINES.map((outline) => (
        <LandFillMesh key={outline.id} coordinates={outline.coordinates} />
      ))}
    </>
  );
}

function LandFillMesh({ coordinates }: { coordinates: readonly ContinentCoordinate[] }) {
  const positions = useMemo(() => createLandFillPositions(coordinates), [coordinates]);

  return positions.length ? (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <meshBasicMaterial
        args={[
          {
            color: "#0f5573",
            transparent: true,
            opacity: 0.3,
            side: THREE_DOUBLE_SIDE,
            depthWrite: false,
          },
        ]}
      />
    </mesh>
  ) : null;
}

function isTopoLayerVisible(kind: EarthTopoLineKind, layerVisibility: GlobeLayerVisibility) {
  if (kind === "river") {
    return layerVisibility.rivers;
  }

  if (kind === "lake") {
    return layerVisibility.lakes;
  }

  return layerVisibility.coastline;
}

function SurfaceLineSet({ lineSet, detail }: { lineSet: EarthTopoLineSet; detail: number }) {
  const positions = useMemo(() => createSurfaceLineSegmentPositions(lineSet.lines, detail), [lineSet.lines, detail]);

  return positions.length ? (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial args={[{ color: getTopoLineColor(lineSet.kind), transparent: true, opacity: getTopoLineOpacity(lineSet.kind) }]} />
    </lineSegments>
  ) : null;
}

function getTopoLineColor(kind: EarthTopoLineKind) {
  if (kind === "river" || kind === "lake") {
    return "#6aa7ff";
  }

  return "#7df6ff";
}

function getTopoLineOpacity(kind: EarthTopoLineKind) {
  if (kind === "coastlineDetail") {
    return 0.72;
  }

  if (kind === "river" || kind === "lake") {
    return 0.34;
  }

  return 0.48;
}

function getTopoLineDetail(kind: EarthTopoLineKind, coastlineDetail: number) {
  return kind === "coastline" || kind === "coastlineDetail" ? coastlineDetail : GLOBE_MAX_COASTLINE_DETAIL;
}

function ViewportFpsProbe({ onFpsUpdate }: { onFpsUpdate: (fps: number) => void }) {
  const frameCountRef = useRef(0);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    frameCountRef.current += 1;
    elapsedRef.current += delta;

    if (elapsedRef.current < 0.5) {
      return;
    }

    onFpsUpdate(Math.round(frameCountRef.current / elapsedRef.current));
    frameCountRef.current = 0;
    elapsedRef.current = 0;
  });

  return null;
}

function GlobeRings() {
  const latitudeRings = [-60, -30, 0, 30, 60];

  return (
    <>
      {latitudeRings.map((latitude) => (
        <mesh key={latitude} position={[0, Math.sin(degreesToRadians(latitude)), 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.cos(degreesToRadians(latitude)), 0.0024, 8, 96]} />
          <meshBasicMaterial args={[{ color: "#49eaff", transparent: true, opacity: latitude === 0 ? 0.14 : 0.075 }]} />
        </mesh>
      ))}
      {[0, Math.PI / 3, (Math.PI * 2) / 3].map((rotation) => (
        <mesh key={rotation} rotation={[0, rotation, 0]}>
          <torusGeometry args={[1.004, 0.0018, 8, 96]} />
          <meshBasicMaterial args={[{ color: "#49eaff", transparent: true, opacity: 0.065 }]} />
        </mesh>
      ))}
    </>
  );
}

function SurfacePoint({ point, color, scale }: { point: GlobePoint; color: string; scale: number }) {
  return (
    <group position={point.position}>
      <mesh>
        <sphereGeometry args={[scale, 16, 12]} />
        <meshBasicMaterial args={[{ color }]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[scale * 2.1, 16, 12]} />
        <meshBasicMaterial args={[{ color, transparent: true, opacity: 0.16 }]} />
      </mesh>
    </group>
  );
}

function SatellitePoint({
  satellite,
  reducedMotion,
  isHovered,
  isFocused,
  onHover,
  onSelect,
}: {
  satellite: GlobeSatellite;
  reducedMotion: boolean;
  isHovered: boolean;
  isFocused: boolean;
  onHover: (satelliteId: string | null) => void;
  onSelect: (satelliteId: string | null) => void;
}) {
  const ref = useRef<ElementRef<"group">>(null);
  const color = satellite.isLocal ? "#f4fbff" : satellite.isTestUser ? "#9f8cff" : "#3fe9ff";
  const satelliteScale = isFocused ? 1.36 : isHovered ? 1.22 : 1;

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }

    ref.current.position.set(...getSatellitePosition(satellite, clock.elapsedTime, reducedMotion));
  });

  return (
    <group
      ref={ref}
      position={satellite.position}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(satellite.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(satellite.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(null);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(satellite.id);
      }}
    >
      <mesh>
        <sphereGeometry args={[(satellite.isLocal ? 0.054 : 0.044) * satelliteScale, 16, 12]} />
        <meshBasicMaterial args={[{ color }]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[(satellite.isLocal ? 0.12 : 0.092) * satelliteScale, 16, 12]} />
        <meshBasicMaterial
          args={[{ color, transparent: true, opacity: isFocused ? 0.34 : isHovered ? 0.28 : satellite.isLocal ? 0.18 : 0.11 }]}
        />
      </mesh>
    </group>
  );
}

function OrbitConnection({
  from,
  satellite,
  reducedMotion,
  color = "#3fe9ff",
}: {
  from: GlobeVector3;
  satellite: GlobeSatellite;
  reducedMotion: boolean;
  color?: string;
}) {
  return (
    <ConnectionArc
      from={from}
      to={(elapsedSeconds) => getSatellitePosition(satellite, elapsedSeconds, reducedMotion)}
      color={color}
      opacity={color === "#3fe9ff" ? 0.3 : 0.56}
    />
  );
}

function StaticConnection({ from, to, color }: { from: GlobeVector3; to: GlobeVector3; color: string }) {
  return <ConnectionArc from={from} to={() => to} color={color} opacity={0.56} />;
}

function ConnectionArc({
  from,
  to,
  color,
  opacity,
}: {
  from: GlobeVector3;
  to: (elapsedSeconds: number) => GlobeVector3;
  color: string;
  opacity: number;
}) {
  const segmentRefs = useRef<Array<ElementRef<"group"> | null>>([]);
  const segmentIndexes = useMemo(() => Array.from({ length: GLOBE_ROUTE_ARC_SEGMENTS }, (_, index) => index), []);

  useFrame(({ clock }) => {
    const target = to(clock.elapsedTime);

    segmentRefs.current.forEach((segment, index) => {
      if (!segment) {
        return;
      }

      const start = getArcPoint(from, target, index / GLOBE_ROUTE_ARC_SEGMENTS);
      const end = getArcPoint(from, target, (index + 1) / GLOBE_ROUTE_ARC_SEGMENTS);
      applyConnectionTransform(segment, start, end);
    });
  });

  return (
    <>
      {segmentIndexes.map((index) => {
        const initialTarget = to(0);
        const start = getArcPoint(from, initialTarget, index / GLOBE_ROUTE_ARC_SEGMENTS);
        const end = getArcPoint(from, initialTarget, (index + 1) / GLOBE_ROUTE_ARC_SEGMENTS);

        return (
          <group
            key={index}
            ref={(node: ElementRef<"group"> | null) => {
              segmentRefs.current[index] = node;
            }}
            position={getMidpoint(start, end)}
          >
            <mesh>
              <cylinderGeometry args={[0.0055, 0.0055, 1, 8]} />
              <meshBasicMaterial args={[{ color, transparent: true, opacity }]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function GlobeStaticFallback() {
  return (
    <div className="globe-panel-fallback" role="img" aria-label="Static globe fallback">
      <div className="globe-panel-fallback-orb" />
    </div>
  );
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function getSatellitePosition(satellite: GlobeSatellite, elapsedSeconds: number, reducedMotion: boolean) {
  const speed = reducedMotion ? 0 : satellite.orbitSpeed;
  return orbitToVector3(satellite.orbitRadius, satellite.orbitTilt, satellite.orbitPhase + elapsedSeconds * speed);
}

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createSurfaceLineSegmentPositions(lines: readonly (readonly EarthTopoCoordinate[])[], detail: number) {
  const positions: number[] = [];

  for (const coordinates of lines) {
    const simplifiedCoordinates = simplifySurfaceLineCoordinates(coordinates, detail);

    if (simplifiedCoordinates.length < 2) {
      continue;
    }

    for (let index = 0; index < simplifiedCoordinates.length - 1; index += 1) {
      const coordinate = simplifiedCoordinates[index];
      const nextCoordinate = simplifiedCoordinates[index + 1];
      const segmentPoints = createSurfaceLinePoints(coordinate, nextCoordinate);

      for (let pointIndex = 0; pointIndex < segmentPoints.length - 1; pointIndex += 1) {
        positions.push(...segmentPoints[pointIndex], ...segmentPoints[pointIndex + 1]);
      }
    }
  }

  return new Float32Array(positions);
}

function simplifySurfaceLineCoordinates(coordinates: readonly EarthTopoCoordinate[], detail: number) {
  if (coordinates.length <= 2 || detail >= GLOBE_MAX_COASTLINE_DETAIL) {
    return coordinates;
  }

  const normalizedDetail = clamp(Math.round(detail), GLOBE_MIN_COASTLINE_DETAIL, GLOBE_MAX_COASTLINE_DETAIL);
  const stride = GLOBE_MAX_COASTLINE_DETAIL + 1 - normalizedDetail;

  if (stride <= 1) {
    return coordinates;
  }

  const simplified = coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1 || index % stride === 0);

  return simplified.length >= 2 ? simplified : coordinates;
}

function createLandFillPositions(coordinates: readonly ContinentCoordinate[]) {
  const ringCoordinates = getOpenLandFillRing(coordinates);

  if (ringCoordinates.length < 3) {
    return new Float32Array();
  }

  const center = normalizeVector(
    ringCoordinates.reduce<GlobeVector3>(
      (sum, coordinate) => {
        const point = latLonToVector3(coordinate[0], coordinate[1], 1);
        return [sum[0] + point[0], sum[1] + point[1], sum[2] + point[2]];
      },
      [0, 0, 0],
    ),
  );
  const centerPoint: GlobeVector3 = [
    center[0] * GLOBE_LAND_FILL_RADIUS,
    center[1] * GLOBE_LAND_FILL_RADIUS,
    center[2] * GLOBE_LAND_FILL_RADIUS,
  ];
  const positions: number[] = [];

  for (let index = 0; index < ringCoordinates.length; index += 1) {
    const current = ringCoordinates[index];
    const next = ringCoordinates[(index + 1) % ringCoordinates.length];
    const currentPoint = latLonToVector3(current[0], current[1], GLOBE_LAND_FILL_RADIUS);
    const nextPoint = latLonToVector3(next[0], next[1], GLOBE_LAND_FILL_RADIUS);
    positions.push(...centerPoint, ...currentPoint, ...nextPoint);
  }

  return new Float32Array(positions);
}

function getOpenLandFillRing(coordinates: readonly ContinentCoordinate[]) {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const isClosed = Math.abs(first[0] - last[0]) < 0.001 && Math.abs(first[1] - last[1]) < 0.001;

  return isClosed ? coordinates.slice(0, -1) : coordinates;
}

function createSurfaceLinePoints(from: EarthTopoCoordinate, to: EarthTopoCoordinate): GlobeVector3[] {
  const start = normalizeVector(latLonToVector3(from[0], from[1], GLOBE_CONTINENT_RADIUS));
  const end = normalizeVector(latLonToVector3(to[0], to[1], GLOBE_CONTINENT_RADIUS));
  const angle = Math.acos(clamp(getVectorDot(start, end), -1, 1));
  const segmentCount = Math.max(1, Math.ceil(angle / GLOBE_CONTINENT_SEGMENT_RADIANS));

  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const ratio = index / segmentCount;
    const point = sphericalInterpolate(start, end, ratio, angle);

    return [
      point[0] * GLOBE_CONTINENT_RADIUS,
      point[1] * GLOBE_CONTINENT_RADIUS,
      point[2] * GLOBE_CONTINENT_RADIUS,
    ];
  });
}

function sphericalInterpolate(from: GlobeVector3, to: GlobeVector3, ratio: number, angle: number): GlobeVector3 {
  if (angle <= 0.000001) {
    return from;
  }

  const sinAngle = Math.sin(angle);
  const fromScale = Math.sin((1 - ratio) * angle) / sinAngle;
  const toScale = Math.sin(ratio * angle) / sinAngle;

  return normalizeVector([
    from[0] * fromScale + to[0] * toScale,
    from[1] * fromScale + to[1] * toScale,
    from[2] * fromScale + to[2] * toScale,
  ]);
}

function getVectorDot(from: GlobeVector3, to: GlobeVector3) {
  return from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
}

function easeCamera(
  camera: { position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void }; lookAt: (x: number, y: number, z: number) => void },
  position: GlobeVector3,
  target: GlobeVector3,
  delta: number,
  speed: number,
) {
  const ease = 1 - Math.exp(-speed * delta);

  camera.position.set(
    camera.position.x + (position[0] - camera.position.x) * ease,
    camera.position.y + (position[1] - camera.position.y) * ease,
    camera.position.z + (position[2] - camera.position.z) * ease,
  );
  camera.lookAt(target[0], target[1], target[2]);
}

function easeGroupPosition(
  group: { position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void } },
  position: GlobeVector3,
  delta: number,
  speed: number,
) {
  const ease = 1 - Math.exp(-speed * delta);

  group.position.set(
    group.position.x + (position[0] - group.position.x) * ease,
    group.position.y + (position[1] - group.position.y) * ease,
    group.position.z + (position[2] - group.position.z) * ease,
  );
}

function getDefaultCameraPosition(distance: number): GlobeVector3 {
  const direction = normalizeVector(GLOBE_DEFAULT_CAMERA_POSITION);

  return [direction[0] * distance, direction[1] * distance, direction[2] * distance];
}

function getFocusedSatelliteCameraPosition(orbit: GlobeRotation, distance: number, elapsedSeconds: number): GlobeVector3 {
  const autoOrbit = elapsedSeconds * 0.18;
  const horizontalDistance = Math.cos(orbit.x) * distance;

  return [
    Math.sin(orbit.y + autoOrbit) * horizontalDistance,
    Math.sin(orbit.x) * distance + 0.1,
    Math.cos(orbit.y + autoOrbit) * horizontalDistance,
  ];
}

function rotateVector(vector: GlobeVector3, rotationX: number, rotationY: number): GlobeVector3 {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const xRotated = vector[0];
  const yRotated = vector[1] * cosX - vector[2] * sinX;
  const zRotated = vector[1] * sinX + vector[2] * cosX;

  return [xRotated * cosY + zRotated * sinY, yRotated, -xRotated * sinY + zRotated * cosY];
}

function applyConnectionTransform(group: ElementRef<"group">, from: GlobeVector3, to: GlobeVector3) {
  const midpoint = getMidpoint(from, to);
  const distance = getVectorDistance(from, to);
  const direction = normalizeVector([to[0] - from[0], to[1] - from[1], to[2] - from[2]]);
  const quaternion = getQuaternionFromYAxis(direction);

  group.position.set(...midpoint);
  group.scale.set(1, distance, 1);
  group.quaternion.set(...quaternion);
}

function getArcPoint(from: GlobeVector3, to: GlobeVector3, ratio: number): GlobeVector3 {
  if (ratio <= 0) {
    return from;
  }

  if (ratio >= 1) {
    return to;
  }

  const base = [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
    from[2] + (to[2] - from[2]) * ratio,
  ] as const;
  const distance = getVectorDistance(from, to);
  const lift = Math.sin(Math.PI * ratio) * (0.26 + distance * 0.2);
  const fromNormal = normalizeVector(from);
  const toNormal = normalizeVector(to);
  let arcNormal = normalizeVector([
    fromNormal[0] + toNormal[0],
    fromNormal[1] + toNormal[1],
    fromNormal[2] + toNormal[2],
  ]);

  if (Math.abs(arcNormal[0]) < 0.0001 && Math.abs(arcNormal[1] - 1) < 0.0001 && Math.abs(arcNormal[2]) < 0.0001) {
    arcNormal = normalizeVector([base[0], base[1] + 0.35, base[2]]);
  }

  const lifted = [
    base[0] + arcNormal[0] * lift,
    base[1] + arcNormal[1] * lift,
    base[2] + arcNormal[2] * lift,
  ] as const;
  const liftedRadius = getVectorLength(lifted);
  const minimumRadius = GLOBE_ROUTE_MIN_RADIUS + Math.sin(Math.PI * ratio) * 0.12;

  if (liftedRadius >= minimumRadius) {
    return lifted;
  }

  const liftedNormal = normalizeVector(lifted);

  return [
    liftedNormal[0] * minimumRadius,
    liftedNormal[1] * minimumRadius,
    liftedNormal[2] * minimumRadius,
  ];
}

function getMidpoint(from: GlobeVector3, to: GlobeVector3): GlobeVector3 {
  return [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];
}

function getVectorDistance(from: GlobeVector3, to: GlobeVector3) {
  const x = to[0] - from[0];
  const y = to[1] - from[1];
  const z = to[2] - from[2];

  return Math.sqrt(x * x + y * y + z * z);
}

function getVectorLength(vector: GlobeVector3) {
  return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);
}

function normalizeVector(vector: GlobeVector3): GlobeVector3 {
  const length = getVectorLength(vector);

  if (length <= 0.000001) {
    return [0, 1, 0];
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function getQuaternionFromYAxis(direction: GlobeVector3): readonly [number, number, number, number] {
  const dot = clamp(direction[1], -1, 1);

  if (dot < -0.999999) {
    return [1, 0, 0, 0];
  }

  const x = direction[2];
  const y = 0;
  const z = -direction[0];
  const w = 1 + dot;
  const length = Math.sqrt(x * x + y * y + z * z + w * w);

  return [x / length, y / length, z / length, w / length];
}
