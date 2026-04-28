import type { LevelConfig } from "./levels";
import type { SessionUser } from "../types/session";

export type SimRoamingState = "moving" | "paused";

export interface SimRoamingPose {
  userId: string;
  position: readonly [number, number, number];
  yaw: number;
  state: SimRoamingState;
  routeId: string;
  segmentIndex: number;
}

interface SimRoute {
  id: string;
  waypoints: ReadonlyArray<readonly [number, number, number]>;
}

const SIM_MOVE_SPEED_UNITS_PER_SECOND = 0.9;
const SIM_PAUSE_SECONDS = 1.6;
const MIN_SEGMENT_DISTANCE = 0.001;
const SIM_BOT_RADIUS = 0.32;
const FLOOR_ORIGIN_Y = 0;

const LEVEL_1_SIM_ROUTES: SimRoute[] = [
  {
    id: "control-room-loop",
    waypoints: [
      [-3.8, FLOOR_ORIGIN_Y, 0],
      [-1.3, FLOOR_ORIGIN_Y, 1],
      [1.3, FLOOR_ORIGIN_Y, 1],
      [3.8, FLOOR_ORIGIN_Y, 0],
      [1.3, FLOOR_ORIGIN_Y, -1],
      [-1.3, FLOOR_ORIGIN_Y, -1],
    ],
  },
  {
    id: "connector-peek",
    waypoints: [
      [4.8, FLOOR_ORIGIN_Y, 0],
      [6.45, FLOOR_ORIGIN_Y, 0],
      [8.8, FLOOR_ORIGIN_Y, 0],
      [10, FLOOR_ORIGIN_Y, 0],
      [8.8, FLOOR_ORIGIN_Y, 0],
      [6.45, FLOOR_ORIGIN_Y, 0],
    ],
  },
  {
    id: "range-entry-loop",
    waypoints: [
      [11.2, FLOOR_ORIGIN_Y, 0],
      [13.2, FLOOR_ORIGIN_Y, 1.2],
      [14, FLOOR_ORIGIN_Y, 5.8],
      [12.2, FLOOR_ORIGIN_Y, 6.6],
      [11.2, FLOOR_ORIGIN_Y, 2.2],
    ],
  },
];

const DEFAULT_SIM_ROUTES: SimRoute[] = [
  {
    id: "default-room-loop",
    waypoints: [
      [-2, FLOOR_ORIGIN_Y, 0],
      [0, FLOOR_ORIGIN_Y, 1],
      [2, FLOOR_ORIGIN_Y, 0],
      [0, FLOOR_ORIGIN_Y, -1],
    ],
  },
];

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getRoutesForLevel(levelConfig: LevelConfig) {
  const routes = levelConfig.id === "level-1" ? LEVEL_1_SIM_ROUTES : DEFAULT_SIM_ROUTES;
  const walkableRoutes = getWalkableRoutes(routes, levelConfig);

  if (walkableRoutes.length > 0) {
    return walkableRoutes;
  }

  return getWalkableRoutes(DEFAULT_SIM_ROUTES, levelConfig);
}

function clampWaypointToRoom(waypoint: readonly [number, number, number], levelConfig: LevelConfig) {
  const { room } = levelConfig.collisionBounds;

  return [
    Math.min(room.max[0] - SIM_BOT_RADIUS, Math.max(room.min[0] + SIM_BOT_RADIUS, waypoint[0])),
    waypoint[1],
    Math.min(room.max[2] - SIM_BOT_RADIUS, Math.max(room.min[2] + SIM_BOT_RADIUS, waypoint[2])),
  ] as const;
}

function isWaypointInsideRoom(waypoint: readonly [number, number, number], levelConfig: LevelConfig) {
  const { room } = levelConfig.collisionBounds;

  return (
    waypoint[0] >= room.min[0] + SIM_BOT_RADIUS &&
    waypoint[0] <= room.max[0] - SIM_BOT_RADIUS &&
    waypoint[2] >= room.min[2] + SIM_BOT_RADIUS &&
    waypoint[2] <= room.max[2] - SIM_BOT_RADIUS
  );
}

function collidesWithBlocker(waypoint: readonly [number, number, number], levelConfig: LevelConfig) {
  return levelConfig.collisionBounds.blockers.some((blocker) => (
    waypoint[0] >= blocker.min[0] - SIM_BOT_RADIUS &&
    waypoint[0] <= blocker.max[0] + SIM_BOT_RADIUS &&
    waypoint[2] >= blocker.min[2] - SIM_BOT_RADIUS &&
    waypoint[2] <= blocker.max[2] + SIM_BOT_RADIUS
  ));
}

function isWaypointWalkable(waypoint: readonly [number, number, number], levelConfig: LevelConfig) {
  return isWaypointInsideRoom(waypoint, levelConfig) && !collidesWithBlocker(waypoint, levelConfig);
}

function getWalkableRoutes(routes: SimRoute[], levelConfig: LevelConfig) {
  return routes
    .map((route) => ({
      ...route,
      waypoints: route.waypoints
        .map((waypoint) => clampWaypointToRoom(waypoint, levelConfig))
        .filter((waypoint) => isWaypointWalkable(waypoint, levelConfig)),
    }))
    .filter((route) => route.waypoints.length >= 2);
}

function getDistance(start: readonly [number, number, number], end: readonly [number, number, number]) {
  return Math.hypot(end[0] - start[0], end[2] - start[2]);
}

function getYaw(start: readonly [number, number, number], end: readonly [number, number, number]) {
  return Math.atan2(end[0] - start[0], -(end[2] - start[2]));
}

function interpolateWaypoint(start: readonly [number, number, number], end: readonly [number, number, number], progress: number) {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
    start[2] + (end[2] - start[2]) * progress,
  ] as const;
}

function getRouteCycleSeconds(route: SimRoute) {
  return route.waypoints.reduce((totalSeconds, waypoint, index) => {
    const nextWaypoint = route.waypoints[(index + 1) % route.waypoints.length];
    const moveSeconds = getDistance(waypoint, nextWaypoint) / SIM_MOVE_SPEED_UNITS_PER_SECOND;

    return totalSeconds + moveSeconds + SIM_PAUSE_SECONDS;
  }, 0);
}

function getPoseOnRoute(route: SimRoute, routeSeconds: number): Omit<SimRoamingPose, "userId" | "routeId"> {
  let remainingSeconds = routeSeconds;

  for (let index = 0; index < route.waypoints.length; index += 1) {
    const waypoint = route.waypoints[index];
    const nextWaypoint = route.waypoints[(index + 1) % route.waypoints.length];
    const segmentDistance = Math.max(MIN_SEGMENT_DISTANCE, getDistance(waypoint, nextWaypoint));
    const moveSeconds = segmentDistance / SIM_MOVE_SPEED_UNITS_PER_SECOND;

    if (remainingSeconds <= moveSeconds) {
      const progress = Math.min(1, Math.max(0, remainingSeconds / moveSeconds));

      return {
        position: interpolateWaypoint(waypoint, nextWaypoint, progress),
        yaw: getYaw(waypoint, nextWaypoint),
        state: "moving",
        segmentIndex: index,
      };
    }

    remainingSeconds -= moveSeconds;

    if (remainingSeconds <= SIM_PAUSE_SECONDS) {
      return {
        position: nextWaypoint,
        yaw: getYaw(waypoint, nextWaypoint),
        state: "paused",
        segmentIndex: index,
      };
    }

    remainingSeconds -= SIM_PAUSE_SECONDS;
  }

  const firstWaypoint = route.waypoints[0];
  const secondWaypoint = route.waypoints[1] ?? firstWaypoint;

  return {
    position: firstWaypoint,
    yaw: getYaw(firstWaypoint, secondWaypoint),
    state: "paused",
    segmentIndex: 0,
  };
}

export function getSimBotRoamingPoses({
  users,
  levelConfig,
  elapsedSeconds,
}: {
  users: SessionUser[];
  levelConfig: LevelConfig;
  elapsedSeconds: number;
}): SimRoamingPose[] {
  return users
    .filter((user) => user.isTestUser === true && user.presence === "idle")
    .map((user) => getSimBotRoamingPose({ user, levelConfig, elapsedSeconds }))
    .filter((pose): pose is SimRoamingPose => pose !== null);
}

export function getSimBotRoamingPose({
  user,
  levelConfig,
  elapsedSeconds,
}: {
  user: SessionUser;
  levelConfig: LevelConfig;
  elapsedSeconds: number;
}): SimRoamingPose | null {
  if (user.isTestUser !== true || user.presence !== "idle") {
    return null;
  }

  const routes = getRoutesForLevel(levelConfig);

  if (routes.length === 0) {
    return null;
  }

  const seed = hashString(`${user.id}:${user.joinedAt}`);
  const route = routes[seed % routes.length];
  const cycleSeconds = getRouteCycleSeconds(route);
  const phaseOffsetSeconds = (seed % 1000) / 1000 * cycleSeconds;
  const routeSeconds = ((elapsedSeconds + phaseOffsetSeconds) % cycleSeconds + cycleSeconds) % cycleSeconds;
  const pose = getPoseOnRoute(route, routeSeconds);

  return {
    userId: user.id,
    routeId: route.id,
    ...pose,
  };
}
