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
}
