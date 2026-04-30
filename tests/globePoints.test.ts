import assert from "node:assert/strict";
import test from "node:test";
import {
  createGlobeRouteModel,
  createSatelliteForUser,
  SERVER_GLOBE_POINT,
  type GlobeVector3,
} from "../src/lib/globe/globePoints";
import type { SessionUser } from "../src/types/session";

function createUser(overrides?: Partial<SessionUser>): SessionUser {
  return {
    id: "user-1",
    displayName: "Sync Pilot",
    avatarSeed: "SP",
    presence: "idle",
    isHost: false,
    joinedAt: "2026-04-29T18:00:00.000Z",
    ...overrides,
  };
}

function vectorLength(vector: GlobeVector3) {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

function assertValidLatitudeLongitude(latitude: number, longitude: number) {
  assert.ok(latitude >= -90 && latitude <= 90, `Expected latitude ${latitude} to be valid`);
  assert.ok(longitude >= -180 && longitude <= 180, `Expected longitude ${longitude} to be valid`);
}

test("server point stays on the globe surface and has valid latitude and longitude", () => {
  assert.equal(SERVER_GLOBE_POINT.radius, 1);
  assert.equal(Math.round(vectorLength(SERVER_GLOBE_POINT.position) * 1_000_000) / 1_000_000, 1);
  assertValidLatitudeLongitude(SERVER_GLOBE_POINT.latitude, SERVER_GLOBE_POINT.longitude);
});

test("same session and user produces stable satellite orbit data and position", () => {
  const user = createUser();
  const first = createSatelliteForUser("session-alpha", user, user.id);
  const second = createSatelliteForUser("session-alpha", user, user.id);

  assert.deepEqual(first, second);
});

test("different users produce distinct satellite ids and usually distinct phases and positions", () => {
  const first = createSatelliteForUser("session-alpha", createUser({ id: "user-1" }));
  const second = createSatelliteForUser("session-alpha", createUser({ id: "user-2", displayName: "Beat Runner" }));

  assert.notEqual(first.id, second.id);
  assert.notEqual(first.orbitPhase, second.orbitPhase);
  assert.notDeepEqual(first.position, second.position);
});

test("all satellite radii are greater than the globe surface radius", () => {
  const model = createGlobeRouteModel({
    sessionId: "session-alpha",
    users: [
      createUser({ id: "user-1" }),
      createUser({ id: "user-2" }),
      createUser({ id: "user-3", isTestUser: true }),
    ],
  });

  assert.ok(model.satellites.every((satellite) => satellite.orbitRadius > SERVER_GLOBE_POINT.radius));
  assert.ok(model.satellites.every((satellite) => vectorLength(satellite.position) > SERVER_GLOBE_POINT.radius));
});

test("route model creates one satellite and one default server connection per user", () => {
  const users = [
    createUser({ id: "user-1" }),
    createUser({ id: "user-2" }),
  ];
  const model = createGlobeRouteModel({
    sessionId: "session-alpha",
    users,
  });

  assert.equal(model.satellites.length, users.length);
  assert.equal(model.connections.length, users.length);
  assert.deepEqual(model.connections.map((connection) => connection.kind), ["server_satellite", "server_satellite"]);
  assert.ok(model.connections.every((connection) => connection.fromId === SERVER_GLOBE_POINT.id));
});

test("VPN disabled has no fake point or VPN connections", () => {
  const model = createGlobeRouteModel({
    sessionId: "session-alpha",
    users: [createUser()],
    localUserId: "user-1",
    vpnVisualEnabled: false,
  });

  assert.equal(model.vpnSurfacePoint, undefined);
  assert.equal(model.vpnConnections, undefined);
});

test("VPN enabled for the local user creates a fake surface point and exactly two route connections", () => {
  const model = createGlobeRouteModel({
    sessionId: "session-alpha",
    users: [createUser()],
    localUserId: "user-1",
    vpnVisualEnabled: true,
  });
  const localSatellite = model.satellites[0];

  assert.ok(model.vpnSurfacePoint);
  assert.equal(model.vpnSurfacePoint.radius, SERVER_GLOBE_POINT.radius);
  assert.equal(Math.round(vectorLength(model.vpnSurfacePoint.position) * 1_000_000) / 1_000_000, 1);
  assertValidLatitudeLongitude(model.vpnSurfacePoint.latitude, model.vpnSurfacePoint.longitude);
  assert.notDeepEqual(model.vpnSurfacePoint.position, localSatellite.position);
  assert.equal(model.vpnConnections?.length, 2);
  assert.deepEqual(model.vpnConnections?.map((connection) => connection.kind), ["vpn_route", "vpn_route"]);
  assert.equal(model.vpnConnections?.[0]?.fromId, localSatellite.id);
  assert.equal(model.vpnConnections?.[0]?.toId, model.vpnSurfacePoint.id);
  assert.equal(model.vpnConnections?.[1]?.fromId, model.vpnSurfacePoint.id);
  assert.equal(model.vpnConnections?.[1]?.toId, SERVER_GLOBE_POINT.id);
});

test("VPN enabled without a matching local user does not create fake route data", () => {
  const model = createGlobeRouteModel({
    sessionId: "session-alpha",
    users: [createUser({ id: "user-1" })],
    localUserId: "missing-user",
    vpnVisualEnabled: true,
  });

  assert.equal(model.vpnSurfacePoint, undefined);
  assert.equal(model.vpnConnections, undefined);
});
