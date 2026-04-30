import type { SessionUser } from "../../types/session";

export type GlobeVector3 = readonly [number, number, number];

export type GlobePointKind = "server" | "vpn_surface";
export type GlobeConnectionKind = "server_satellite" | "vpn_route";

export interface GlobePoint {
  id: string;
  label: string;
  kind: GlobePointKind;
  latitude: number;
  longitude: number;
  radius: number;
  position: GlobeVector3;
}

export interface GlobeSatellite {
  id: string;
  userId: string;
  label: string;
  avatarSeed: string;
  isLocal?: boolean;
  isTestUser?: boolean;
  orbitRadius: number;
  orbitTilt: number;
  orbitPhase: number;
  orbitSpeed: number;
  position: GlobeVector3;
}

export interface GlobeConnection {
  id: string;
  fromId: string;
  toId: string;
  kind: GlobeConnectionKind;
  from: GlobeVector3;
  to: GlobeVector3;
}

export interface GlobeRouteModel {
  server: GlobePoint;
  satellites: GlobeSatellite[];
  connections: GlobeConnection[];
  vpnSurfacePoint?: GlobePoint;
  vpnConnections?: GlobeConnection[];
}

export interface CreateGlobeRouteModelOptions {
  sessionId: string;
  users: readonly SessionUser[];
  localUserId?: string;
  vpnVisualEnabled?: boolean;
}

const GLOBE_SURFACE_RADIUS = 1;
const TWO_PI = Math.PI * 2;

export function latLonToVector3(latitude: number, longitude: number, radius = GLOBE_SURFACE_RADIUS): GlobeVector3 {
  const lat = degreesToRadians(latitude);
  const lon = degreesToRadians(longitude);
  const cosLat = Math.cos(lat);

  return [
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  ];
}

export function orbitToVector3(orbitRadius: number, orbitTilt: number, orbitPhase: number): GlobeVector3 {
  const x = orbitRadius * Math.cos(orbitPhase);
  const flatZ = orbitRadius * Math.sin(orbitPhase);

  return [
    x,
    flatZ * Math.sin(orbitTilt),
    flatZ * Math.cos(orbitTilt),
  ];
}

export const SERVER_GLOBE_POINT: GlobePoint = {
  id: "server:blue-relay",
  label: "Blue Relay Node",
  kind: "server",
  latitude: 38,
  longitude: -34,
  radius: GLOBE_SURFACE_RADIUS,
  position: latLonToVector3(38, -34, GLOBE_SURFACE_RADIUS),
};

export function createGlobeRouteModel(options: CreateGlobeRouteModelOptions): GlobeRouteModel {
  const satellites = options.users.map((user) => createSatelliteForUser(options.sessionId, user, options.localUserId));
  const connections = satellites.map((satellite) => createConnection({
    id: `connection:${SERVER_GLOBE_POINT.id}:${satellite.id}`,
    fromId: SERVER_GLOBE_POINT.id,
    toId: satellite.id,
    kind: "server_satellite",
    from: SERVER_GLOBE_POINT.position,
    to: satellite.position,
  }));
  const localSatellite = options.localUserId
    ? satellites.find((satellite) => satellite.userId === options.localUserId)
    : undefined;

  if (!options.vpnVisualEnabled || !localSatellite) {
    return {
      server: SERVER_GLOBE_POINT,
      satellites,
      connections,
    };
  }

  const vpnSurfacePoint = createVpnSurfacePoint(options.sessionId, localSatellite);
  const vpnConnections = [
    createConnection({
      id: `vpn:${localSatellite.id}:${vpnSurfacePoint.id}`,
      fromId: localSatellite.id,
      toId: vpnSurfacePoint.id,
      kind: "vpn_route",
      from: localSatellite.position,
      to: vpnSurfacePoint.position,
    }),
    createConnection({
      id: `vpn:${vpnSurfacePoint.id}:${SERVER_GLOBE_POINT.id}`,
      fromId: vpnSurfacePoint.id,
      toId: SERVER_GLOBE_POINT.id,
      kind: "vpn_route",
      from: vpnSurfacePoint.position,
      to: SERVER_GLOBE_POINT.position,
    }),
  ];

  return {
    server: SERVER_GLOBE_POINT,
    satellites,
    connections,
    vpnSurfacePoint,
    vpnConnections,
  };
}

export function createSatelliteForUser(sessionId: string, user: SessionUser, localUserId?: string): GlobeSatellite {
  const seed = `${sessionId}:satellite:${user.id}`;
  const orbitRadius = roundToPrecision(1.28 + hashRatio(`${seed}:radius`) * 0.32);
  const orbitTilt = roundToPrecision(degreesToRadians(-42 + hashRatio(`${seed}:tilt`) * 84));
  const orbitPhase = roundToPrecision(hashRatio(`${seed}:phase`) * TWO_PI);
  const orbitSpeed = roundToPrecision(0.08 + hashRatio(`${seed}:speed`) * 0.1);

  return {
    id: `satellite:${user.id}`,
    userId: user.id,
    label: user.displayName,
    avatarSeed: user.avatarSeed,
    isLocal: user.id === localUserId || undefined,
    isTestUser: user.isTestUser || undefined,
    orbitRadius,
    orbitTilt,
    orbitPhase,
    orbitSpeed,
    position: orbitToVector3(orbitRadius, orbitTilt, orbitPhase),
  };
}

export function createVpnSurfacePoint(sessionId: string, satellite: Pick<GlobeSatellite, "userId" | "label">): GlobePoint {
  const seed = `${sessionId}:vpn:${satellite.userId}`;
  const latitude = roundToPrecision(-58 + hashRatio(`${seed}:latitude`) * 116);
  const longitude = roundToPrecision(-180 + hashRatio(`${seed}:longitude`) * 360);

  return {
    id: `vpn-surface:${satellite.userId}`,
    label: `${satellite.label} visual route`,
    kind: "vpn_surface",
    latitude,
    longitude,
    radius: GLOBE_SURFACE_RADIUS,
    position: latLonToVector3(latitude, longitude, GLOBE_SURFACE_RADIUS),
  };
}

function createConnection(connection: GlobeConnection): GlobeConnection {
  return connection;
}

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function hashRatio(value: string) {
  return hashString(value) / 0xffffffff;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function roundToPrecision(value: number) {
  return Number(value.toFixed(6));
}
