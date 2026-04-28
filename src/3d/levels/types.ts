export type Vec3 = readonly [number, number, number];
export type Euler3 = readonly [number, number, number];

export interface LevelDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export interface PlayerStart {
  position: Vec3;
  rotation: Euler3;
}

export interface TopDownCameraSettings extends CameraPose {
  height: number;
  orthographicSize: number;
}

export interface StationConfig {
  id: string;
  label: string;
  position: Vec3;
  rotation: Euler3;
  seatPosition: Vec3;
  monitorPosition: Vec3;
}

export interface TimerDisplayConfig {
  id: string;
  position: Vec3;
  rotation: Euler3;
  size: {
    width: number;
    height: number;
  };
}

export interface DisplaySurfaceConfig {
  id: string;
  label: string;
  position: Vec3;
  rotation: Euler3;
  size: {
    width: number;
    height: number;
  };
}

export type ControlRoomDisplayRole =
  | "main-dashboard"
  | "timer-ribbon"
  | "session-status"
  | "participants"
  | "range-scoreboard"
  | "music-status"
  | "system-status"
  | "data-panel";

export type ControlRoomDisplayColorRole =
  | "blue-main"
  | "green-status"
  | "cyan-data"
  | "amber-alert";

export interface ControlRoomDisplayConfig extends DisplaySurfaceConfig {
  role: ControlRoomDisplayRole;
  colorRole: ControlRoomDisplayColorRole;
  groupId?: string;
  priority?: number;
}

export interface LevelAreaConfig {
  id: string;
  label: string;
  kind:
    | "control-room"
    | "shooting-range"
    | "recording-studio"
    | "expansion-room"
    | "utility-room";
  bounds: {
    min: Vec3;
    max: Vec3;
  };
  spawnPosition?: Vec3;
  cameraTarget?: Vec3;
  connectedAreaIds: string[];
  status: "active" | "planned";
}

export interface LevelOpeningConfig {
  id: string;
  label: string;
  fromAreaId: string;
  toAreaId: string;
  position: Vec3;
  rotation: Euler3;
  size: {
    width: number;
    height: number;
  };
  clearanceBounds?: {
    min: Vec3;
    max: Vec3;
  };
  status: "active" | "planned";
}

export type TraversalSurfaceKind = "platform" | "ramp";
export type TraversalRampAxis = "x" | "z";
export type TraversalRampLowEdge = "minX" | "maxX" | "minZ" | "maxZ";

export interface LevelTraversalSurfaceConfig {
  id: string;
  label: string;
  kind: TraversalSurfaceKind;
  areaId?: string;
  bounds: {
    min: Vec3;
    max: Vec3;
  };
  floorHeight: number;
  ramp?: {
    axis: TraversalRampAxis;
    lowEdge: TraversalRampLowEdge;
    lowFloorHeight: number;
    highFloorHeight: number;
  };
}

export interface LevelExitConfig {
  id: string;
  label: string;
  targetLevelId: string;
  transitionStyle?: "reveal" | "instant";
  targetSpawnPosition?: Vec3;
  targetCameraTarget?: Vec3;
  position: Vec3;
  rotation: Euler3;
  size: {
    width: number;
    height: number;
  };
}

export interface ShootingRangeTargetConfig {
  id: string;
  label: string;
  laneId: string;
  position: Vec3;
  rotation: Euler3;
  radius: number;
  points: number;
}

export interface ShootingRangeLaneConfig {
  id: string;
  label: string;
  position: Vec3;
  width: number;
  length: number;
  targetIds: string[];
}

export interface ShootingRangeConfig {
  lanes: ShootingRangeLaneConfig[];
  targets: ShootingRangeTargetConfig[];
  scoreDisplay: DisplaySurfaceConfig;
}

export type JukeboxScreenRole =
  | "now-playing"
  | "playlist"
  | "status-source"
  | "controls-help";

export type JukeboxScreenColorRole =
  | "blue-main"
  | "green-status"
  | "cyan-data"
  | "magenta-accent";

export type JukeboxControlRole =
  | "toggle-playback"
  | "shuffle"
  | "retry"
  | "next"
  | "playlist-change"
  | "page-up"
  | "page-down";

export type JukeboxControlPhaseStatus = "action-backed" | "planned";

export interface JukeboxScreenSurfaceConfig {
  id: string;
  label: string;
  role: JukeboxScreenRole;
  colorRole: JukeboxScreenColorRole;
  localPosition: Vec3;
  localRotation: Euler3;
  size: {
    width: number;
    height: number;
  };
}

export interface JukeboxSpeakerZoneConfig {
  id: string;
  label: string;
  localPosition: Vec3;
  localRotation: Euler3;
  size: {
    width: number;
    height: number;
  };
}

export interface JukeboxControlZoneConfig {
  id: string;
  label: string;
  role: JukeboxControlRole;
  localPosition: Vec3;
  localRotation: Euler3;
  size: {
    width: number;
    height: number;
  };
  phaseStatus: JukeboxControlPhaseStatus;
}

export interface JukeboxConfig {
  id: string;
  label: string;
  position: Vec3;
  rotation: Euler3;
  cabinetSize: {
    width: number;
    height: number;
    depth: number;
  };
  screenSurfaces: JukeboxScreenSurfaceConfig[];
  speakerZones: JukeboxSpeakerZoneConfig[];
  controlZones: JukeboxControlZoneConfig[];
}

export interface CollisionBoundsConfig {
  room: {
    min: Vec3;
    max: Vec3;
  };
  blockers: Array<{
    id: string;
    label: string;
    min: Vec3;
    max: Vec3;
  }>;
}

export interface LightConfig {
  id: string;
  type: "ambient" | "directional" | "point";
  position?: Vec3;
  target?: Vec3;
  color: string;
  intensity: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  dimensions: LevelDimensions;
  playerStart: PlayerStart;
  topDownCamera: TopDownCameraSettings;
  stations: StationConfig[];
  timerDisplay: TimerDisplayConfig;
  collisionBounds: CollisionBoundsConfig;
  lighting: LightConfig[];
  areas?: LevelAreaConfig[];
  openings?: LevelOpeningConfig[];
  traversalSurfaces?: LevelTraversalSurfaceConfig[];
  exits?: LevelExitConfig[];
  controlRoomDisplays?: ControlRoomDisplayConfig[];
  jukebox?: JukeboxConfig;
  shootingRange?: ShootingRangeConfig;
}
