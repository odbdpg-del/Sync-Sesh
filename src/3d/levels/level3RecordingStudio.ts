import type { LevelConfig } from "./types";

export const level3RecordingStudioConfig = {
  id: "level-3-recording-studio",
  name: "Recording Studio",
  dimensions: {
    width: 12,
    depth: 17.8,
    height: 4.5,
  },
  playerStart: {
    position: [-12.8, 1.7, -4.6],
    rotation: [0, -Math.PI / 2, 0],
  },
  topDownCamera: {
    position: [-16.5, 16, 0.1],
    target: [-16.5, 0, 0.1],
    height: 16,
    orthographicSize: 18,
  },
  stations: [],
  timerDisplay: {
    id: "studio-session-display",
    position: [-22.18, 3.56, -5.25],
    rotation: [0, Math.PI / 2, 0],
    size: {
      width: 4.3,
      height: 1.34,
    },
  },
  collisionBounds: {
    room: {
      min: [-22.5, 0, -8.8],
      max: [-10.5, 4.5, 9],
    },
    blockers: [
      {
        id: "recording-studio-north-wall",
        label: "Recording Studio north wall",
        min: [-22.5, 0, -8.8],
        max: [-10.5, 4.5, -8.62],
      },
      {
        id: "recording-studio-south-wall",
        label: "Recording Studio south wall",
        min: [-22.5, 0, 8.82],
        max: [-10.5, 4.5, 9],
      },
      {
        id: "recording-studio-west-wall",
        label: "Recording Studio west wall",
        min: [-22.5, 0, -8.8],
        max: [-22.32, 4.5, 9],
      },
      {
        id: "recording-studio-east-wall-lower",
        label: "Recording Studio east wall lower segment",
        min: [-10.68, 0, -8.8],
        max: [-10.5, 4.5, -5.8],
      },
      {
        id: "recording-studio-east-wall-upper",
        label: "Recording Studio east wall upper segment",
        min: [-10.68, 0, -3.4],
        max: [-10.5, 4.5, 9],
      },
    ],
  },
  lighting: [
    {
      id: "studio-ambient",
      type: "ambient",
      color: "#7fa7ff",
      intensity: 0.38,
    },
    {
      id: "studio-overhead",
      type: "directional",
      position: [-16, 5, 2.5],
      target: [-16.5, 0, 0],
      color: "#f4f7ff",
      intensity: 1.05,
    },
    {
      id: "studio-status-glow",
      type: "point",
      position: [-16.5, 3.2, -2.4],
      color: "#57f3ff",
      intensity: 0.75,
    },
  ],
  exits: [
    {
      id: "level-3-return-door",
      label: "BACK",
      targetLevelId: "level-1",
      transitionStyle: "instant",
      targetSpawnPosition: [-8.55, 1.7, -4.6],
      targetCameraTarget: [-4.5, 1.45, -4.6],
      position: [-10.64, 1.2, -4.6],
      rotation: [0, -Math.PI / 2, 0],
      size: {
        width: 1.55,
        height: 2.15,
      },
    },
  ],
  areas: [
    {
      id: "recording-studio",
      label: "Recording Studio",
      kind: "recording-studio",
      bounds: {
        min: [-22.5, 0, -8.8],
        max: [-10.5, 4.5, 9],
      },
      spawnPosition: [-12.8, 1.7, -4.6],
      cameraTarget: [-18, 1.45, -4.6],
      connectedAreaIds: [],
      status: "active",
    },
  ],
  openings: [
    {
      id: "level-3-recording-studio-return-opening",
      label: "Studio Return Opening",
      fromAreaId: "recording-studio",
      toAreaId: "control-room",
      position: [-10.02, 1.2, -4.6],
      rotation: [0, -Math.PI / 2, 0],
      size: {
        width: 2.4,
        height: 2.2,
      },
      clearanceBounds: {
        min: [-10.55, 0, -5.8],
        max: [-9.95, 2.4, -3.4],
      },
      status: "active",
    },
  ],
  traversalSurfaces: [
    {
      id: "recording-studio-dj-platform",
      label: "Recording studio DJ platform",
      kind: "platform",
      areaId: "recording-studio",
      bounds: {
        min: [-22.15, 0, 3.35],
        max: [-10.85, 1.36, 8.75],
      },
      floorHeight: 1.36,
    },
    {
      id: "recording-studio-dj-left-ramp",
      label: "Recording studio DJ left ramp",
      kind: "ramp",
      areaId: "recording-studio",
      bounds: {
        min: [-21.85, 0, 2.25],
        max: [-18.55, 1.36, 3.35],
      },
      floorHeight: 1.36,
      ramp: {
        axis: "z",
        lowEdge: "minZ",
        lowFloorHeight: 0,
        highFloorHeight: 1.36,
      },
    },
    {
      id: "recording-studio-dj-right-ramp",
      label: "Recording studio DJ right ramp",
      kind: "ramp",
      areaId: "recording-studio",
      bounds: {
        min: [-14.45, 0, 2.25],
        max: [-11.15, 1.36, 3.35],
      },
      floorHeight: 1.36,
      ramp: {
        axis: "z",
        lowEdge: "minZ",
        lowFloorHeight: 0,
        highFloorHeight: 1.36,
      },
    },
  ],
} satisfies LevelConfig;
