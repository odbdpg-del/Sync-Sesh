import { useCallback, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { LevelConfig, LightConfig } from "./levels";
import { ControlRoomWallDisplays } from "./ControlRoomWallDisplays";
import { ComputerStation } from "./ComputerStation";
import { FreeRoamPresenceMarker } from "./FreeRoamPresenceMarker";
import { LevelExitDoor } from "./LevelExitDoor";
import { Level1RangeRoom } from "./Level1RangeRoom";
import { ShootingRangePrototype } from "./ShootingRangePrototype";
import { SimBotRoamingMarker } from "./SimBotRoamingMarker";
import { StationOccupantMarker } from "./StationOccupantMarker";
import { WorldTimerDisplay } from "./WorldTimerDisplay";
import { useRegisterInteractable } from "./interactions";
import { getPhaseVisuals } from "./phaseVisuals";
import type { PhaseVisuals } from "./phaseVisuals";
import type { JukeboxConfig, JukeboxControlZoneConfig, JukeboxScreenColorRole, JukeboxScreenSurfaceConfig } from "./levels";
import type { JukeboxActions, JukeboxDisplayState } from "../hooks/useSoundCloudPlayer";
import type {
  CountdownDisplayState,
  FreeRoamPresenceState,
  RangeScoreResult,
  RangeScoreSubmission,
  SessionUser,
} from "../types/session";

const WALL_THICKNESS = 0.18;
const FREE_ROAM_PRESENCE_TTL_MS = 10_000;

type JukeboxFeedback = {
  message: string;
  key: number;
};

function isSimRoamingDisabledByQuery() {
  return new URLSearchParams(window.location.search).get("simRoam") === "0";
}

function LevelLight({ light, phaseVisuals }: { light: LightConfig; phaseVisuals: PhaseVisuals }) {
  if (light.type === "ambient") {
    return <ambientLight color={phaseVisuals.ambientColor} intensity={phaseVisuals.ambientIntensity} />;
  }

  if (light.type === "directional") {
    return <directionalLight color={phaseVisuals.directionalColor} intensity={phaseVisuals.directionalIntensity} position={light.position} />;
  }

  return <pointLight color={phaseVisuals.timerGlow} intensity={phaseVisuals.timerGlowIntensity} position={light.position} />;
}

function Wall({ position, args, color }: { position: [number, number, number]; args: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial args={[{ color, roughness: 0.82, metalness: 0.04 }]} />
    </mesh>
  );
}

function ControlRoomOpeningStub({
  opening,
  roomEastWallX,
  connectorEndX,
  wallCenterY,
  wallColor,
  roomMinZ,
  roomMaxZ,
}: {
  opening: NonNullable<LevelConfig["openings"]>[number];
  roomEastWallX: number;
  connectorEndX: number;
  wallCenterY: number;
  wallColor: string;
  roomMinZ: number;
  roomMaxZ: number;
}) {
  const openingHalfWidth = opening.size.width / 2;
  const corridorDepth = connectorEndX - roomEastWallX;
  const openingLeftEdge = opening.position[2] - openingHalfWidth;
  const openingRightEdge = opening.position[2] + openingHalfWidth;
  const stubWallThickness = 0.16;
  const leftWallWidth = openingLeftEdge - roomMinZ;
  const rightWallWidth = roomMaxZ - openingRightEdge;

  return (
    <>
      <mesh position={[roomEastWallX, wallCenterY, roomMinZ + leftWallWidth / 2]}>
        <boxGeometry args={[stubWallThickness, 4, leftWallWidth]} />
        <meshStandardMaterial args={[{ color: wallColor, roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[roomEastWallX, wallCenterY, openingRightEdge + rightWallWidth / 2]}>
        <boxGeometry args={[stubWallThickness, 4, rightWallWidth]} />
        <meshStandardMaterial args={[{ color: wallColor, roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[roomEastWallX + corridorDepth / 2, 0.02, 0]}>
        <boxGeometry args={[corridorDepth, 0.04, opening.size.width]} />
        <meshStandardMaterial args={[{ color: "#0c1726", roughness: 0.88, metalness: 0.02 }]} />
      </mesh>
      <mesh position={[roomEastWallX + corridorDepth / 2, wallCenterY, -openingHalfWidth - 0.1]}>
        <boxGeometry args={[corridorDepth, 4, 0.2]} />
        <meshStandardMaterial args={[{ color: wallColor, roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[roomEastWallX + corridorDepth / 2, wallCenterY, openingHalfWidth + 0.1]}>
        <boxGeometry args={[corridorDepth, 4, 0.2]} />
        <meshStandardMaterial args={[{ color: wallColor, roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[roomEastWallX, opening.size.height + (4 - opening.size.height) / 2, 0]}>
        <boxGeometry args={[stubWallThickness, 4 - opening.size.height, opening.size.width]} />
        <meshStandardMaterial args={[{ color: wallColor, roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
    </>
  );
}

function ControlRoomStairRun({
  x,
  direction,
  phaseVisuals,
}: {
  x: number;
  direction: -1 | 1;
  phaseVisuals: PhaseVisuals;
}) {
  const steps = [
    { y: 0.045, z: -5.62, height: 0.09 },
    { y: 0.095, z: -5.92, height: 0.19 },
    { y: 0.145, z: -6.22, height: 0.29 },
  ];

  return (
    <group position={[x, 0, 0]}>
      {steps.map((step, index) => (
        <mesh key={index} position={[0, step.y, step.z]}>
          <boxGeometry args={[1.85, step.height, 0.44]} />
          <meshStandardMaterial args={[{
            color: index === 2 ? "#142033" : "#10192a",
            emissive: phaseVisuals.gridSecondary,
            emissiveIntensity: 0.08,
            roughness: 0.78,
            metalness: 0.04,
          }]} />
        </mesh>
      ))}
      <mesh position={[direction * 1.08, 0.36, -5.96]}>
        <boxGeometry args={[0.07, 0.62, 1.28]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary }]} />
      </mesh>
    </group>
  );
}

function ControlRoomBalcony({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  return (
    <group>
      <mesh position={[0, 0.16, -7.25]}>
        <boxGeometry args={[17.2, 0.32, 2.1]} />
        <meshStandardMaterial args={[{
          color: "#111b2d",
          emissive: "#07111f",
          emissiveIntensity: 0.18,
          roughness: 0.82,
          metalness: 0.05,
        }]} />
      </mesh>
      <mesh position={[0, 0.36, -6.14]}>
        <boxGeometry args={[17.4, 0.08, 0.08]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary }]} />
      </mesh>
      <mesh position={[-8.64, 0.34, -7.25]}>
        <boxGeometry args={[0.08, 0.28, 2.06]} />
        <meshStandardMaterial args={[{ color: "#17243a", emissive: phaseVisuals.gridSecondary, emissiveIntensity: 0.12, roughness: 0.74 }]} />
      </mesh>
      <mesh position={[8.64, 0.34, -7.25]}>
        <boxGeometry args={[0.08, 0.28, 2.06]} />
        <meshStandardMaterial args={[{ color: "#17243a", emissive: phaseVisuals.gridSecondary, emissiveIntensity: 0.12, roughness: 0.74 }]} />
      </mesh>
      <mesh position={[0, 0.345, -8.28]}>
        <boxGeometry args={[17.2, 0.05, 0.06]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent }]} />
      </mesh>
      <ControlRoomStairRun x={-7.2} direction={-1} phaseVisuals={phaseVisuals} />
      <ControlRoomStairRun x={7.2} direction={1} phaseVisuals={phaseVisuals} />
    </group>
  );
}

function DecorativeRgbWorkstation({
  position,
  rotation,
  accentColor,
  phaseVisuals,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  accentColor: string;
  phaseVisuals: PhaseVisuals;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.56, 0]}>
        <boxGeometry args={[1.55, 0.12, 0.68]} />
        <meshStandardMaterial args={[{ color: "#131d30", roughness: 0.78, metalness: 0.05 }]} />
      </mesh>
      <mesh position={[-0.66, 0.28, -0.24]}>
        <boxGeometry args={[0.08, 0.56, 0.08]} />
        <meshStandardMaterial args={[{ color: "#08111e", roughness: 0.82, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[0.66, 0.28, -0.24]}>
        <boxGeometry args={[0.08, 0.56, 0.08]} />
        <meshStandardMaterial args={[{ color: "#08111e", roughness: 0.82, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[-0.66, 0.28, 0.24]}>
        <boxGeometry args={[0.08, 0.56, 0.08]} />
        <meshStandardMaterial args={[{ color: "#08111e", roughness: 0.82, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[0.66, 0.28, 0.24]}>
        <boxGeometry args={[0.08, 0.56, 0.08]} />
        <meshStandardMaterial args={[{ color: "#08111e", roughness: 0.82, metalness: 0.06 }]} />
      </mesh>

      <mesh position={[-0.48, 0.92, -0.19]}>
        <boxGeometry args={[0.38, 0.66, 0.28]} />
        <meshStandardMaterial args={[{ color: "#05070c", emissive: "#11192b", emissiveIntensity: 0.22, roughness: 0.68 }]} />
      </mesh>
      <mesh position={[-0.48, 0.98, -0.035]}>
        <boxGeometry args={[0.27, 0.48, 0.025]} />
        <meshBasicMaterial args={[{ color: accentColor }]} />
      </mesh>
      <mesh position={[-0.48, 0.72, -0.035]}>
        <boxGeometry args={[0.24, 0.035, 0.035]} />
        <meshBasicMaterial args={[{ color: "#f64fff" }]} />
      </mesh>
      <mesh position={[-0.48, 1.24, -0.035]}>
        <boxGeometry args={[0.24, 0.035, 0.035]} />
        <meshBasicMaterial args={[{ color: "#73ff4c" }]} />
      </mesh>

      <mesh position={[0.18, 0.86, -0.22]}>
        <boxGeometry args={[0.1, 0.28, 0.08]} />
        <meshStandardMaterial args={[{ color: "#07111f", roughness: 0.74, metalness: 0.05 }]} />
      </mesh>
      <mesh position={[0.18, 1.1, -0.15]}>
        <boxGeometry args={[0.82, 0.46, 0.08]} />
        <meshStandardMaterial args={[{ color: "#05070c", emissive: phaseVisuals.gridSecondary, emissiveIntensity: 0.14, roughness: 0.7 }]} />
      </mesh>
      <mesh position={[0.18, 1.1, -0.101]}>
        <planeGeometry args={[0.68, 0.34]} />
        <meshBasicMaterial args={[{ color: "#062638", toneMapped: false }]} />
      </mesh>
      <mesh position={[0.18, 1.1, -0.095]}>
        <boxGeometry args={[0.44, 0.035, 0.018]} />
        <meshBasicMaterial args={[{ color: accentColor }]} />
      </mesh>

      <mesh position={[0.2, 0.62, 0.18]}>
        <boxGeometry args={[0.76, 0.035, 0.18]} />
        <meshStandardMaterial args={[{ color: "#05070c", roughness: 0.68, metalness: 0.08 }]} />
      </mesh>
      {[
        { x: -0.08, color: "#57f3ff" },
        { x: 0.05, color: "#f64fff" },
        { x: 0.18, color: "#73ff4c" },
        { x: 0.31, color: "#f8d36a" },
        { x: 0.44, color: "#57f3ff" },
      ].map((key) => (
        <mesh key={`${key.x}-${key.color}`} position={[key.x, 0.648, 0.18]}>
          <boxGeometry args={[0.08, 0.018, 0.13]} />
          <meshBasicMaterial args={[{ color: key.color }]} />
        </mesh>
      ))}

      <mesh position={[0.62, 0.61, 0.14]}>
        <boxGeometry args={[0.18, 0.018, 0.22]} />
        <meshBasicMaterial args={[{ color: "#0a3042" }]} />
      </mesh>
    </group>
  );
}

function ControlRoomDecorativeWorkstations({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  const workstations = [
    {
      id: "left-expansion",
      position: [-8.2, 0, -2.2] as [number, number, number],
      rotation: [0, Math.PI / 2.35, 0] as [number, number, number],
      accentColor: "#57f3ff",
    },
    {
      id: "left-rear",
      position: [-7.6, 0, 4.8] as [number, number, number],
      rotation: [0, Math.PI / 2.75, 0] as [number, number, number],
      accentColor: "#f64fff",
    },
    {
      id: "right-rear",
      position: [7.6, 0, 4.8] as [number, number, number],
      rotation: [0, -Math.PI / 2.75, 0] as [number, number, number],
      accentColor: "#73ff4c",
    },
    {
      id: "right-side",
      position: [8.1, 0, -2.6] as [number, number, number],
      rotation: [0, -Math.PI / 2.35, 0] as [number, number, number],
      accentColor: "#f8d36a",
    },
  ];

  return (
    <group>
      {workstations.map((workstation) => (
        <DecorativeRgbWorkstation
          key={workstation.id}
          position={workstation.position}
          rotation={workstation.rotation}
          accentColor={workstation.accentColor}
          phaseVisuals={phaseVisuals}
        />
      ))}
    </group>
  );
}

function ControlRoomLoungeProps({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  return (
    <group position={[-8.35, 0, 6.85]} rotation={[0, Math.PI / 2.8, 0]}>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[2.25, 0.34, 0.72]} />
        <meshStandardMaterial args={[{ color: "#172239", roughness: 0.82, metalness: 0.03 }]} />
      </mesh>
      <mesh position={[0, 0.83, -0.36]}>
        <boxGeometry args={[2.35, 0.88, 0.22]} />
        <meshStandardMaterial args={[{ color: "#1c2a46", roughness: 0.86, metalness: 0.02 }]} />
      </mesh>
      <mesh position={[-1.22, 0.62, 0]}>
        <boxGeometry args={[0.24, 0.74, 0.8]} />
        <meshStandardMaterial args={[{ color: "#10192b", roughness: 0.86, metalness: 0.02 }]} />
      </mesh>
      <mesh position={[1.22, 0.62, 0]}>
        <boxGeometry args={[0.24, 0.74, 0.8]} />
        <meshStandardMaterial args={[{ color: "#10192b", roughness: 0.86, metalness: 0.02 }]} />
      </mesh>
      {[-0.72, 0, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.58, 0.1]}>
          <boxGeometry args={[0.62, 0.16, 0.58]} />
          <meshStandardMaterial args={[{ color: "#243552", emissive: "#08111e", emissiveIntensity: 0.16, roughness: 0.88 }]} />
        </mesh>
      ))}
      <mesh position={[0, 1.14, -0.245]}>
        <boxGeometry args={[1.72, 0.055, 0.04]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>
      <mesh position={[0, 0.38, 1.08]}>
        <boxGeometry args={[1.18, 0.14, 0.58]} />
        <meshStandardMaterial args={[{ color: "#0f192b", roughness: 0.8, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, 0.49, 1.08]}>
        <boxGeometry args={[0.86, 0.025, 0.38]} />
        <meshBasicMaterial args={[{ color: "#0d3140" }]} />
      </mesh>
      <mesh position={[-0.36, 0.54, 1.08]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 18]} />
        <meshStandardMaterial args={[{ color: "#57f3ff", emissive: "#57f3ff", emissiveIntensity: 0.35, roughness: 0.7 }]} />
      </mesh>
      <mesh position={[0.38, 0.535, 1.02]}>
        <boxGeometry args={[0.26, 0.05, 0.18]} />
        <meshStandardMaterial args={[{ color: "#f64fff", emissive: "#32113d", emissiveIntensity: 0.28, roughness: 0.72 }]} />
      </mesh>
    </group>
  );
}

function ControlRoomKitchenIslandProps({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  return (
    <group position={[8.18, 0, 6.78]} rotation={[0, -Math.PI / 2.9, 0]}>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[2.05, 0.86, 0.74]} />
        <meshStandardMaterial args={[{ color: "#111a2b", roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, 0.94, 0]}>
        <boxGeometry args={[2.26, 0.12, 0.9]} />
        <meshStandardMaterial args={[{ color: "#253552", roughness: 0.78, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[0, 0.83, 0.46]}>
        <boxGeometry args={[1.72, 0.05, 0.04]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>
      <mesh position={[-0.72, 1.035, -0.08]}>
        <cylinderGeometry args={[0.08, 0.065, 0.18, 18]} />
        <meshStandardMaterial args={[{ color: "#10263a", emissive: "#0d3140", emissiveIntensity: 0.22, roughness: 0.7 }]} />
      </mesh>
      <mesh position={[-0.44, 1.035, 0.16]}>
        <cylinderGeometry args={[0.065, 0.055, 0.16, 18]} />
        <meshStandardMaterial args={[{ color: "#243552", emissive: "#57f3ff", emissiveIntensity: 0.18, roughness: 0.72 }]} />
      </mesh>
      <mesh position={[0.16, 1.02, 0.05]}>
        <boxGeometry args={[0.42, 0.045, 0.24]} />
        <meshStandardMaterial args={[{ color: "#0a101c", emissive: "#10192b", emissiveIntensity: 0.2, roughness: 0.76 }]} />
      </mesh>
      <mesh position={[0.18, 1.052, 0.05]}>
        <boxGeometry args={[0.28, 0.018, 0.16]} />
        <meshBasicMaterial args={[{ color: "#f8d36a" }]} />
      </mesh>

      <group position={[0.72, 1.07, -0.04]} rotation={[0, 0, -0.18]}>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 0.34, 20]} />
          <meshStandardMaterial args={[{ color: "#5f6f88", roughness: 0.54, metalness: 0.22 }]} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.072, 0.058, 0.1, 20]} />
          <meshStandardMaterial args={[{ color: "#101827", roughness: 0.6, metalness: 0.12 }]} />
        </mesh>
        <mesh position={[0.08, 0.33, 0]}>
          <boxGeometry args={[0.18, 0.04, 0.045]} />
          <meshStandardMaterial args={[{ color: "#111827", roughness: 0.58, metalness: 0.16 }]} />
        </mesh>
        <mesh position={[0.2, 0.34, 0]}>
          <coneGeometry args={[0.035, 0.13, 16]} />
          <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
        </mesh>
        <mesh position={[0.255, 0.34, 0]}>
          <coneGeometry args={[0.022, 0.08, 16]} />
          <meshBasicMaterial args={[{ color: "#f8d36a" }]} />
        </mesh>
      </group>
    </group>
  );
}

function getJukeboxScreenColor(colorRole: JukeboxScreenColorRole) {
  if (colorRole === "green-status") {
    return "#73ff4c";
  }

  if (colorRole === "magenta-accent") {
    return "#f64fff";
  }

  if (colorRole === "cyan-data") {
    return "#57f3ff";
  }

  return "#48a7ff";
}

function formatJukeboxTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function trimJukeboxText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function drawJukeboxText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    color?: string;
    font?: string;
    maxLength?: number;
    align?: CanvasTextAlign;
  } = {},
) {
  context.fillStyle = options.color ?? "#e9fbff";
  context.font = options.font ?? "28px monospace";
  context.textAlign = options.align ?? "left";
  context.textBaseline = "top";
  context.fillText(trimJukeboxText(text, options.maxLength ?? 32), x, y);
}

function drawJukeboxFrame(context: CanvasRenderingContext2D, accentColor: string) {
  context.fillStyle = "#04131f";
  context.fillRect(0, 0, 512, 256);
  context.strokeStyle = accentColor;
  context.lineWidth = 8;
  context.strokeRect(12, 12, 488, 232);

  context.strokeStyle = "rgba(233, 251, 255, 0.16)";
  context.lineWidth = 2;
  for (let y = 48; y < 226; y += 22) {
    context.beginPath();
    context.moveTo(28, y);
    context.lineTo(484, y);
    context.stroke();
  }
}

function drawJukeboxWaveform(
  context: CanvasRenderingContext2D,
  bars: number[],
  progress: number,
  accentColor: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const fallbackBars = [24, 42, 64, 38, 72, 46, 58, 34, 80, 52, 66, 44, 76, 36, 60, 48];
  const sourceBars = bars.length > 0 ? bars : fallbackBars;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const barWidth = width / sourceBars.length;

  sourceBars.forEach((bar, index) => {
    const normalized = Math.max(0.14, Math.min(1, bar / 100));
    const barHeight = normalized * height;
    const barX = x + index * barWidth;
    const barY = y + (height - barHeight) / 2;
    context.fillStyle = index / sourceBars.length <= safeProgress ? accentColor : "rgba(233, 251, 255, 0.22)";
    context.fillRect(barX + 1, barY, Math.max(2, barWidth - 2), barHeight);
  });

  context.fillStyle = "rgba(233, 251, 255, 0.22)";
  context.fillRect(x, y + height + 12, width, 6);
  context.fillStyle = accentColor;
  context.fillRect(x, y + height + 12, width * safeProgress, 6);
}

function drawJukeboxNowPlaying(
  context: CanvasRenderingContext2D,
  display: JukeboxDisplayState | undefined,
  accentColor: string,
) {
  const title = display?.currentTrackTitle || "NO TRACK LOADED";
  const artist = display?.currentTrackArtist || display?.playlistLabel || "SOUNDCLOUD";
  const status = display?.errorMessage
    ? "ERROR"
    : display?.isPlaying
      ? "PLAYING"
      : display?.isWidgetReady
        ? "STANDBY"
        : "CONNECTING";

  drawJukeboxText(context, "NOW PLAYING", 28, 28, { color: accentColor, font: "22px monospace" });
  drawJukeboxText(context, title, 28, 68, { font: "42px monospace", maxLength: 21 });
  drawJukeboxText(context, artist, 30, 118, { color: "#a9bdc9", font: "24px monospace", maxLength: 30 });
  drawJukeboxText(context, status, 356, 28, { color: accentColor, font: "22px monospace", maxLength: 12 });
  drawJukeboxWaveform(context, display?.waveformBars ?? [], display?.progress ?? 0, accentColor, 30, 154, 452, 54);
  drawJukeboxText(
    context,
    `${formatJukeboxTime(display?.playbackPosition ?? 0)} / ${formatJukeboxTime(display?.playbackDuration ?? 0)}`,
    356,
    218,
    { color: "#e9fbff", font: "18px monospace", maxLength: 16 },
  );
}

function drawJukeboxPlaylist(
  context: CanvasRenderingContext2D,
  display: JukeboxDisplayState | undefined,
  accentColor: string,
) {
  drawJukeboxText(context, "PLAYLIST", 30, 28, { color: accentColor, font: "26px monospace" });
  drawJukeboxText(context, display?.playlistLabel || "SOUNDCLOUD", 30, 70, { font: "34px monospace", maxLength: 18 });
  drawJukeboxText(context, `${display?.trackCount ?? 0} TRACKS`, 30, 118, { color: "#a9bdc9", font: "24px monospace" });
  drawJukeboxText(context, "CURRENT", 30, 166, { color: accentColor, font: "20px monospace" });
  drawJukeboxText(context, display?.currentTrackTitle || "STANDBY", 30, 196, { font: "24px monospace", maxLength: 24 });
}

function drawJukeboxStatus(
  context: CanvasRenderingContext2D,
  display: JukeboxDisplayState | undefined,
  accentColor: string,
) {
  const scriptStatus = display?.isScriptReady ? "SCRIPT ONLINE" : "SCRIPT LOADING";
  const widgetStatus = display?.isWidgetReady ? "WIDGET ONLINE" : "WIDGET LOADING";
  const sourceStatus = display?.currentTrackUrl ? "SOURCE LINKED" : "SOURCE PENDING";

  drawJukeboxText(context, "SOURCE / STATUS", 28, 28, { color: accentColor, font: "24px monospace" });
  drawJukeboxText(context, scriptStatus, 28, 76, { font: "26px monospace", maxLength: 20 });
  drawJukeboxText(context, widgetStatus, 28, 112, { font: "26px monospace", maxLength: 20 });
  drawJukeboxText(context, sourceStatus, 28, 148, { font: "26px monospace", maxLength: 20 });
  drawJukeboxText(context, display?.errorMessage || "NO PLAYER ERROR", 28, 198, { color: display?.errorMessage ? "#f8d36a" : "#a9bdc9", font: "20px monospace", maxLength: 30 });
}

function drawJukeboxControls(
  context: CanvasRenderingContext2D,
  display: JukeboxDisplayState | undefined,
  accentColor: string,
  feedback?: JukeboxFeedback | null,
) {
  const playbackLabel = display?.isPlaying ? "PAUSE" : "PLAY";
  const controls = [
    `${playbackLabel}: READY`,
    "SHUFFLE: READY",
    "RETRY: READY",
    "NEXT: PLANNED",
    "PAGE: PLANNED",
    "PLAYLIST: PLANNED",
  ];

  drawJukeboxText(context, "CONTROL MAP", 28, 24, { color: accentColor, font: "24px monospace" });
  if (feedback?.message) {
    context.fillStyle = "rgba(246, 79, 255, 0.18)";
    context.fillRect(24, 52, 464, 38);
    drawJukeboxText(context, feedback.message, 34, 62, { color: "#f8d6ff", font: "22px monospace", maxLength: 30 });
  }

  controls.forEach((control, index) => {
    const isPlanned = control.includes("PLANNED");
    drawJukeboxText(context, control, 30, (feedback?.message ? 102 : 64) + index * 24, {
      color: isPlanned ? "rgba(233, 251, 255, 0.52)" : "#e9fbff",
      font: feedback?.message ? "20px monospace" : "22px monospace",
      maxLength: 24,
    });
  });
}

function createJukeboxScreenCanvas(
  screen: JukeboxScreenSurfaceConfig,
  display: JukeboxDisplayState | undefined,
  feedback?: JukeboxFeedback | null,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const accentColor = getJukeboxScreenColor(screen.colorRole);
  drawJukeboxFrame(context, accentColor);

  if (!display) {
    drawJukeboxText(context, "SOUNDCLOUD", 28, 42, { color: accentColor, font: "38px monospace" });
    drawJukeboxText(context, "STANDBY", 28, 96, { font: "46px monospace" });
    drawJukeboxText(context, "NO PLAYER DATA", 28, 158, { color: "#a9bdc9", font: "26px monospace" });
    return canvas;
  }

  if (screen.role === "playlist") {
    drawJukeboxPlaylist(context, display, accentColor);
  } else if (screen.role === "status-source") {
    drawJukeboxStatus(context, display, accentColor);
  } else if (screen.role === "controls-help") {
    drawJukeboxControls(context, display, accentColor, feedback);
  } else {
    drawJukeboxNowPlaying(context, display, accentColor);
  }

  return canvas;
}

function JukeboxScreenSurface({
  screen,
  jukeboxDisplay,
  jukeboxFeedback,
}: {
  screen: JukeboxScreenSurfaceConfig;
  jukeboxDisplay?: JukeboxDisplayState;
  jukeboxFeedback?: JukeboxFeedback | null;
}) {
  const screenColor = getJukeboxScreenColor(screen.colorRole);
  const waveformKey = jukeboxDisplay?.waveformBars.join(",") ?? "";
  const textureKey = [
    "jukebox-screen",
    screen.id,
    screen.role,
    jukeboxDisplay?.playlistId ?? "none",
    jukeboxDisplay?.playlistLabel ?? "none",
    jukeboxDisplay?.trackCount ?? 0,
    jukeboxDisplay?.currentTrackTitle ?? "none",
    jukeboxDisplay?.currentTrackArtist ?? "none",
    jukeboxDisplay?.isScriptReady ? "script-ready" : "script-pending",
    jukeboxDisplay?.isWidgetReady ? "widget-ready" : "widget-pending",
    jukeboxDisplay?.isPlaying ? "playing" : "paused",
    Math.round(jukeboxDisplay?.playbackPosition ?? 0),
    Math.round(jukeboxDisplay?.playbackDuration ?? 0),
    Math.round((jukeboxDisplay?.progress ?? 0) * 1000),
    waveformKey,
    jukeboxDisplay?.errorMessage ?? "ok",
    screen.role === "controls-help" ? jukeboxFeedback?.key ?? 0 : 0,
    screen.role === "controls-help" ? jukeboxFeedback?.message ?? "none" : "none",
  ].join("|");
  const screenCanvas = useMemo(() => createJukeboxScreenCanvas(screen, jukeboxDisplay, jukeboxFeedback), [
    screen,
    jukeboxDisplay?.playlistId,
    jukeboxDisplay?.playlistLabel,
    jukeboxDisplay?.trackCount,
    jukeboxDisplay?.currentTrackTitle,
    jukeboxDisplay?.currentTrackArtist,
    jukeboxDisplay?.currentTrackUrl,
    jukeboxDisplay?.isScriptReady,
    jukeboxDisplay?.isWidgetReady,
    jukeboxDisplay?.isPlaying,
    jukeboxDisplay?.playbackPosition,
    jukeboxDisplay?.playbackDuration,
    jukeboxDisplay?.progress,
    waveformKey,
    jukeboxDisplay?.errorMessage,
    jukeboxFeedback?.key,
    jukeboxFeedback?.message,
  ]);

  return (
    <group position={screen.localPosition} rotation={screen.localRotation}>
      <mesh position={[0, 0, 0.014]}>
        <boxGeometry args={[screen.size.width + 0.08, screen.size.height + 0.08, 0.035]} />
        <meshStandardMaterial args={[{ color: "#05070c", roughness: 0.68, metalness: 0.12 }]} />
      </mesh>
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[screen.size.width, screen.size.height]} />
        <meshBasicMaterial args={[{ toneMapped: false }]}>
          <canvasTexture key={textureKey} attach="map" args={[screenCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, -screen.size.height / 2 + 0.035, 0.064]}>
        <boxGeometry args={[screen.size.width * 0.82, 0.018, 0.012]} />
        <meshBasicMaterial args={[{ color: screenColor }]} />
      </mesh>
    </group>
  );
}

function JukeboxScreenGlow({
  screen,
  isPlaying,
  progress,
}: {
  screen: JukeboxScreenSurfaceConfig;
  isPlaying: boolean;
  progress: number;
}) {
  const glowRef = useRef<React.ElementRef<"mesh">>(null);
  const screenColor = getJukeboxScreenColor(screen.colorRole);

  useFrame(({ clock }) => {
    if (!glowRef.current) {
      return;
    }

    const pulse = isPlaying ? 1 + Math.sin(clock.getElapsedTime() * 2.4 + progress * Math.PI * 2) * 0.06 : 1;
    glowRef.current.scale.set(pulse, pulse, 1);
  });

  return (
    <mesh ref={glowRef} position={[screen.localPosition[0], screen.localPosition[1], screen.localPosition[2] + 0.034]} rotation={screen.localRotation}>
      <planeGeometry args={[screen.size.width + 0.18, screen.size.height + 0.16]} />
      <meshBasicMaterial args={[{ color: screenColor, transparent: true, opacity: isPlaying ? 0.18 : 0.08, toneMapped: false }]} />
    </mesh>
  );
}

function getJukeboxActionForControl(control: JukeboxControlZoneConfig, jukeboxActions?: JukeboxActions) {
  if (control.phaseStatus !== "action-backed" || !jukeboxActions) {
    return undefined;
  }

  if (control.role === "toggle-playback") {
    return jukeboxActions.togglePlayback;
  }

  if (control.role === "shuffle") {
    return jukeboxActions.shufflePlay;
  }

  if (control.role === "retry") {
    return jukeboxActions.retry;
  }

  return undefined;
}

function getJukeboxControlColor(control: JukeboxControlZoneConfig) {
  if (control.role === "toggle-playback") {
    return "#73ff4c";
  }

  if (control.role === "shuffle") {
    return "#57f3ff";
  }

  if (control.role === "retry") {
    return "#f8d36a";
  }

  if (control.role === "next") {
    return "#f64fff";
  }

  if (control.role === "playlist-change") {
    return "#9b7cff";
  }

  if (control.role === "page-up" || control.role === "page-down") {
    return "#48a7ff";
  }

  return "#e9fbff";
}

function getJukeboxControlShortLabel(control: JukeboxControlZoneConfig) {
  if (control.role === "toggle-playback") {
    return "PLAY";
  }

  if (control.role === "shuffle") {
    return "SHUF";
  }

  if (control.role === "retry") {
    return "RTRY";
  }

  if (control.role === "next") {
    return "NEXT";
  }

  if (control.role === "playlist-change") {
    return "LIST";
  }

  if (control.role === "page-up") {
    return "UP";
  }

  if (control.role === "page-down") {
    return "DOWN";
  }

  return control.label.toUpperCase().slice(0, 4);
}

function createJukeboxButtonLabelCanvas(control: JukeboxControlZoneConfig, color: string, isActionBacked: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = isActionBacked ? color : "rgba(233, 251, 255, 0.52)";
  context.font = "bold 44px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(getJukeboxControlShortLabel(control), 128, 54);
  context.fillStyle = isActionBacked ? "rgba(233, 251, 255, 0.72)" : "rgba(233, 251, 255, 0.34)";
  context.font = "18px monospace";
  context.fillText(isActionBacked ? "READY" : "PLANNED", 128, 96);

  return canvas;
}

function getJukeboxFeedbackForControl(control: JukeboxControlZoneConfig, display?: JukeboxDisplayState) {
  if (control.role === "toggle-playback") {
    return display?.isWidgetReady ? "PLAY / PAUSE SENT" : "WIDGET LOADING";
  }

  if (control.role === "shuffle") {
    return display?.isWidgetReady && (display.trackCount ?? 0) > 0 ? "SHUFFLE SENT" : "SHUFFLE QUEUED";
  }

  if (control.role === "retry") {
    return "RETRY SENT";
  }

  return `${control.label.toUpperCase()}: PLANNED`;
}

function JukeboxButtonLabel({
  control,
  color,
  isActionBacked,
}: {
  control: JukeboxControlZoneConfig;
  color: string;
  isActionBacked: boolean;
}) {
  const labelCanvas = useMemo(() => createJukeboxButtonLabelCanvas(control, color, isActionBacked), [color, control, isActionBacked]);

  return (
    <mesh position={[0, control.size.height / 2 + 0.085, 0.064]}>
      <planeGeometry args={[control.size.width * 1.55, 0.14]} />
      <meshBasicMaterial args={[{ transparent: true, toneMapped: false }]} >
        <canvasTexture key={`${control.id}-${color}-${isActionBacked ? "ready" : "planned"}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function JukeboxActionControlZone({
  control,
  action,
  onFeedback,
}: {
  control: JukeboxControlZoneConfig;
  action: () => void;
  onFeedback: () => void;
}) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const controlColor = getJukeboxControlColor(control);

  useRegisterInteractable(useMemo(() => ({
    id: `jukebox-${control.id}`,
    label: control.label,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: () => {
      onFeedback();
      action();
    },
  }), [action, control.id, control.label, onFeedback]));

  return (
    <group position={control.localPosition} rotation={control.localRotation}>
      <pointLight color={controlColor} intensity={0.38} distance={1.1} position={[0, 0.04, 0.22]} />
      <mesh position={[0, 0, 0.026]}>
        <boxGeometry args={[control.size.width + 0.08, control.size.height + 0.08, 0.018]} />
        <meshBasicMaterial args={[{ color: controlColor, transparent: true, opacity: 0.28, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef} position={[0, 0, 0.045]}>
        <boxGeometry args={[control.size.width, control.size.height, 0.035]} />
        <meshStandardMaterial
          args={[{
            color: "#07111b",
            emissive: controlColor,
            emissiveIntensity: 0.72,
            roughness: 0.58,
            metalness: 0.12,
          }]}
        />
      </mesh>
      <mesh position={[0, 0, 0.073]}>
        <boxGeometry args={[control.size.width * 0.46, control.size.height * 0.46, 0.012]} />
        <meshBasicMaterial args={[{ color: controlColor, toneMapped: false }]} />
      </mesh>
      <JukeboxButtonLabel control={control} color={controlColor} isActionBacked />
    </group>
  );
}

function JukeboxPlannedControlZone({
  control,
}: {
  control: JukeboxControlZoneConfig;
}) {
  const controlColor = getJukeboxControlColor(control);

  return (
    <group position={control.localPosition} rotation={control.localRotation}>
      <mesh position={[0, 0, 0.026]}>
        <boxGeometry args={[control.size.width + 0.06, control.size.height + 0.06, 0.016]} />
        <meshBasicMaterial args={[{ color: controlColor, transparent: true, opacity: 0.1, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[control.size.width, control.size.height, 0.035]} />
        <meshStandardMaterial
          args={[{
            color: "#151b28",
            emissive: controlColor,
            emissiveIntensity: 0.1,
            roughness: 0.58,
            metalness: 0.12,
          }]}
        />
      </mesh>
      <JukeboxButtonLabel control={control} color={controlColor} isActionBacked={false} />
    </group>
  );
}

function JukeboxControlZone({
  control,
  jukeboxActions,
  jukeboxDisplay,
  onFeedback,
}: {
  control: JukeboxControlZoneConfig;
  jukeboxActions?: JukeboxActions;
  jukeboxDisplay?: JukeboxDisplayState;
  onFeedback: (message: string) => void;
}) {
  const action = getJukeboxActionForControl(control, jukeboxActions);

  if (!action) {
    return <JukeboxPlannedControlZone control={control} />;
  }

  return (
      <JukeboxActionControlZone
        control={control}
        action={action}
        onFeedback={() => onFeedback(getJukeboxFeedbackForControl(control, jukeboxDisplay))}
      />
  );
}

function JukeboxCabinetPulse({
  cabinet,
  isPlaying,
  progress,
  phaseVisuals,
}: {
  cabinet: JukeboxConfig["cabinetSize"];
  isPlaying: boolean;
  progress: number;
  phaseVisuals: PhaseVisuals;
}) {
  const leftAccentRef = useRef<React.ElementRef<"mesh">>(null);
  const rightAccentRef = useRef<React.ElementRef<"mesh">>(null);
  const topAccentRef = useRef<React.ElementRef<"mesh">>(null);

  useFrame(({ clock }) => {
    const pulse = isPlaying ? 1 + Math.sin(clock.getElapsedTime() * 3 + progress * Math.PI * 2) * 0.1 : 0.86;

    leftAccentRef.current?.scale.set(1, pulse, 1);
    rightAccentRef.current?.scale.set(1, pulse, 1);
    topAccentRef.current?.scale.set(pulse, 1, 1);
  });

  return (
    <>
      <mesh ref={leftAccentRef} position={[-cabinet.width / 2 - 0.055, cabinet.height / 2, cabinet.depth / 2 + 0.066]}>
        <boxGeometry args={[0.035, cabinet.height * 0.9, 0.026]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>
      <mesh ref={rightAccentRef} position={[cabinet.width / 2 + 0.055, cabinet.height / 2, cabinet.depth / 2 + 0.066]}>
        <boxGeometry args={[0.035, cabinet.height * 0.9, 0.026]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent }]} />
      </mesh>
      <mesh ref={topAccentRef} position={[0, cabinet.height + 0.105, cabinet.depth / 2 + 0.04]}>
        <boxGeometry args={[cabinet.width * 0.82, 0.035, 0.028]} />
        <meshBasicMaterial args={[{ color: isPlaying ? phaseVisuals.gridPrimary : "#243552" }]} />
      </mesh>
    </>
  );
}

function JukeboxSpeakerZone({
  speaker,
  phaseVisuals,
  isPlaying,
  progress,
}: {
  speaker: JukeboxConfig["speakerZones"][number];
  phaseVisuals: PhaseVisuals;
  isPlaying: boolean;
  progress: number;
}) {
  const firstGrilleRef = useRef<React.ElementRef<"mesh">>(null);
  const secondGrilleRef = useRef<React.ElementRef<"mesh">>(null);
  const thirdGrilleRef = useRef<React.ElementRef<"mesh">>(null);
  const grilleRefs = [firstGrilleRef, secondGrilleRef, thirdGrilleRef];
  const grilleBars = [-0.1, 0, 0.1];

  useFrame(({ clock }) => {
    if (!isPlaying) {
      grilleRefs.forEach((ref) => ref.current?.scale.set(1, 1, 1));
      return;
    }

    grilleRefs.forEach((ref, index) => {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 5 + index + progress * Math.PI * 2) * 0.18;
      ref.current?.scale.set(1, Math.max(0.82, pulse), 1);
    });
  });

  return (
    <group position={speaker.localPosition} rotation={speaker.localRotation}>
      <mesh position={[0, 0, 0.018]}>
        <boxGeometry args={[speaker.size.width, speaker.size.height, 0.035]} />
        <meshStandardMaterial args={[{ color: "#02050b", emissive: isPlaying ? "#0d3140" : "#03060d", emissiveIntensity: isPlaying ? 0.26 : 0.08, roughness: 0.76, metalness: 0.16 }]} />
      </mesh>
      {grilleBars.map((x, index) => (
        <mesh key={`${speaker.id}-${x}`} ref={grilleRefs[index]} position={[x * speaker.size.width, 0, 0.052]}>
          <boxGeometry args={[0.012, speaker.size.height * 0.78, 0.012]} />
          <meshBasicMaterial args={[{ color: isPlaying ? phaseVisuals.timerAccent : "#243552" }]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.066]}>
        <boxGeometry args={[speaker.size.width * 0.72, 0.018, 0.012]} />
        <meshBasicMaterial args={[{ color: isPlaying ? phaseVisuals.gridPrimary : phaseVisuals.gridSecondary }]} />
      </mesh>
    </group>
  );
}

function ControlRoomJukebox({
  jukebox,
  phaseVisuals,
  jukeboxDisplay,
  jukeboxActions,
}: {
  jukebox: JukeboxConfig;
  phaseVisuals: PhaseVisuals;
  jukeboxDisplay?: JukeboxDisplayState;
  jukeboxActions?: JukeboxActions;
}) {
  const cabinet = jukebox.cabinetSize;
  const isJukeboxPlaying = jukeboxDisplay?.isPlaying === true;
  const jukeboxProgress = Math.max(0, Math.min(1, jukeboxDisplay?.progress ?? 0));
  const [jukeboxFeedback, setJukeboxFeedback] = useState<JukeboxFeedback | null>(null);
  const handleJukeboxFeedback = useCallback((message: string) => {
    setJukeboxFeedback((current) => ({
      message,
      key: (current?.key ?? 0) + 1,
    }));
  }, []);

  return (
    <group position={jukebox.position} rotation={jukebox.rotation}>
      <mesh position={[0, cabinet.height / 2, 0]}>
        <boxGeometry args={[cabinet.width, cabinet.height, cabinet.depth]} />
        <meshStandardMaterial args={[{ color: "#070c16", roughness: 0.72, metalness: 0.18 }]} />
      </mesh>

      <mesh position={[0, cabinet.height / 2, cabinet.depth / 2 + 0.018]}>
        <boxGeometry args={[cabinet.width + 0.12, cabinet.height + 0.08, 0.04]} />
        <meshStandardMaterial args={[{ color: "#10192b", emissive: "#07111f", emissiveIntensity: 0.28, roughness: 0.62, metalness: 0.12 }]} />
      </mesh>

      <mesh position={[0, 0.08, cabinet.depth / 2 + 0.04]}>
        <boxGeometry args={[cabinet.width + 0.26, 0.16, cabinet.depth + 0.16]} />
        <meshStandardMaterial args={[{ color: "#03060d", roughness: 0.82, metalness: 0.08 }]} />
      </mesh>

      <mesh position={[0, cabinet.height + 0.04, -0.02]}>
        <boxGeometry args={[cabinet.width + 0.18, 0.08, cabinet.depth + 0.1]} />
        <meshStandardMaterial args={[{ color: "#111b2d", roughness: 0.66, metalness: 0.16 }]} />
      </mesh>

      <mesh position={[-cabinet.width / 2 - 0.035, cabinet.height / 2, cabinet.depth / 2 + 0.05]}>
        <boxGeometry args={[0.045, cabinet.height * 0.86, 0.035]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>
      <mesh position={[cabinet.width / 2 + 0.035, cabinet.height / 2, cabinet.depth / 2 + 0.05]}>
        <boxGeometry args={[0.045, cabinet.height * 0.86, 0.035]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent }]} />
      </mesh>
      <JukeboxCabinetPulse cabinet={cabinet} isPlaying={isJukeboxPlaying} progress={jukeboxProgress} phaseVisuals={phaseVisuals} />

      {jukebox.screenSurfaces.map((screen) => (
        <JukeboxScreenGlow key={`${screen.id}-glow`} screen={screen} isPlaying={isJukeboxPlaying} progress={jukeboxProgress} />
      ))}

      {jukebox.screenSurfaces.map((screen) => (
        <JukeboxScreenSurface key={screen.id} screen={screen} jukeboxDisplay={jukeboxDisplay} jukeboxFeedback={jukeboxFeedback} />
      ))}

      {jukebox.speakerZones.map((speaker) => (
        <JukeboxSpeakerZone
          key={speaker.id}
          speaker={speaker}
          phaseVisuals={phaseVisuals}
          isPlaying={isJukeboxPlaying}
          progress={jukeboxProgress}
        />
      ))}

      <mesh position={[0, 0.79, cabinet.depth / 2 + 0.085]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[1.08, 0.1, 0.28]} />
        <meshStandardMaterial args={[{ color: "#121d31", roughness: 0.64, metalness: 0.12 }]} />
      </mesh>

      {jukebox.controlZones.map((control) => (
        <JukeboxControlZone
          key={control.id}
          control={control}
          jukeboxActions={jukeboxActions}
          jukeboxDisplay={jukeboxDisplay}
          onFeedback={handleJukeboxFeedback}
        />
      ))}
    </group>
  );
}

function TimerAreaPulse({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  const lightRef = useRef<React.ElementRef<"pointLight">>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current || phaseVisuals.pulseSpeed === 0) {
      return;
    }

    const pulse = 1 + Math.sin(clock.getElapsedTime() * phaseVisuals.pulseSpeed) * phaseVisuals.pulseAmount;
    lightRef.current.intensity = phaseVisuals.timerGlowIntensity * pulse;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 2.2, -5.15]}
      color={phaseVisuals.timerGlow}
      intensity={phaseVisuals.timerGlowIntensity}
      distance={7}
    />
  );
}

function CompletedPhaseBurst({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  const groupRef = useRef<React.ElementRef<"group">>(null);
  const rays = Array.from({ length: 8 }, (_, index) => index);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.getElapsedTime() * 1.8) * 0.08;
    groupRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef} position={[0, 2.1, -5.45]}>
      {rays.map((index) => (
        <mesh key={index} rotation={[0, 0, (index / rays.length) * Math.PI * 2]} position={[0, 0, 0.02]}>
          <boxGeometry args={[0.08, 0.72, 0.035]} />
          <meshBasicMaterial args={[{ color: index % 2 === 0 ? phaseVisuals.timerAccent : "#f8d36a" }]} />
        </mesh>
      ))}
      <mesh>
        <ringGeometry args={[0.5, 0.56, 36]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent }]} />
      </mesh>
    </group>
  );
}

interface Level1RoomShellProps {
  levelConfig: LevelConfig;
  countdownDisplay: CountdownDisplayState;
  users: SessionUser[];
  localUserId: string;
  ownerId: string;
  roundNumber: number;
  rangeScoreboard: RangeScoreResult[];
  onSubmitRangeScore: (result: RangeScoreSubmission) => void;
  onLevelExit: (targetLevelId: string) => void;
  freeRoamPresence: FreeRoamPresenceState[];
  onActivateLocalDashboard: () => void;
  localStationId?: string;
  localStationSource: "joined" | "temporary" | "emergency";
  jukeboxDisplay?: JukeboxDisplayState;
  jukeboxActions?: JukeboxActions;
}

export function Level1RoomShell({
  levelConfig,
  countdownDisplay,
  users,
  localUserId,
  ownerId,
  roundNumber,
  rangeScoreboard,
  onSubmitRangeScore,
  onLevelExit,
  freeRoamPresence,
  onActivateLocalDashboard,
  localStationId,
  localStationSource,
  jukeboxDisplay,
  jukeboxActions,
}: Level1RoomShellProps) {
  const { dimensions, exits, lighting, openings, stations, timerDisplay } = levelConfig;
  const activeControlRoomArea = levelConfig.areas?.find((area) => (
    area.id === "control-room" &&
    area.kind === "control-room" &&
    area.status === "active"
  ));
  const activeControlRoomOpening = openings?.find((opening) => (
    opening.id === "control-room-range-opening" &&
    opening.fromAreaId === "control-room" &&
    opening.toAreaId === "shooting-range" &&
    opening.status === "active"
  ));
  const activeShootingRangeArea = levelConfig.areas?.find((area) => (
    area.id === "shooting-range" &&
    area.kind === "shooting-range" &&
    area.status === "active"
  ));
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const wallCenterY = dimensions.height / 2;
  const gridSize = Math.max(dimensions.width, dimensions.depth);
  const roomEastWallX = levelConfig.collisionBounds.room.min[0] + dimensions.width;
  const connectorEndX = activeShootingRangeArea?.bounds.min[0] ?? levelConfig.collisionBounds.room.max[0];
  const phaseVisuals = getPhaseVisuals(countdownDisplay.phase, countdownDisplay.isUrgent);
  const shouldRenderControlRoomDisplays = levelConfig.id === "level-1" && Boolean(activeControlRoomArea);
  const freshPresenceByUserId = new Map(
    freeRoamPresence
      .filter((presence) => presence.levelId === levelConfig.id && Date.now() - Date.parse(presence.updatedAt) <= FREE_ROAM_PRESENCE_TTL_MS)
      .map((presence) => [presence.userId, presence]),
  );
  const stationAssignments = [...users]
    .sort((firstUser, secondUser) => {
      const joinedAtComparison = firstUser.joinedAt.localeCompare(secondUser.joinedAt);

      if (joinedAtComparison !== 0) {
        return joinedAtComparison;
      }

      return firstUser.id.localeCompare(secondUser.id);
    })
    .slice(0, stations.length)
    .map((user, index) => ({
      user,
      station: stations[index],
      isLocal: user.id === localUserId,
      isHost: user.isHost || user.id === ownerId,
    }))
    .filter(({ station }) => Boolean(station));
  const stationOccupants = stationAssignments.filter(({ user }) => !freshPresenceByUserId.has(user.id));
  const freeRoamOccupants = users
    .map((user) => ({
      user,
      presence: freshPresenceByUserId.get(user.id),
      isHost: user.isHost || user.id === ownerId,
    }))
    .filter((occupant): occupant is { user: SessionUser; presence: FreeRoamPresenceState; isHost: boolean } => (
      occupant.presence !== undefined && occupant.user.id !== localUserId
    ));
  const isSimRoamingDisabled = isSimRoamingDisabledByQuery();
  const idleRoamingSimUsers = isSimRoamingDisabled ? [] : users.filter((user) => (
    user.isTestUser === true &&
    user.presence === "idle" &&
    !freshPresenceByUserId.has(user.id)
  ));
  const roamingSimUserIds = new Set(idleRoamingSimUsers.map((user) => user.id));

  return (
    <>
      <color attach="background" args={[phaseVisuals.background]} />

      {lighting.map((light) => (
        <LevelLight key={light.id} light={light} phaseVisuals={phaseVisuals} />
      ))}

      <TimerAreaPulse phaseVisuals={phaseVisuals} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial args={[{ color: phaseVisuals.floor, roughness: 0.86, metalness: 0.02 }]} />
      </mesh>

      <gridHelper args={[gridSize, 14, phaseVisuals.gridPrimary, phaseVisuals.gridSecondary]} position={[0, 0.015, 0]} />

      <Wall position={[0, wallCenterY, -halfDepth]} args={[dimensions.width, dimensions.height, WALL_THICKNESS]} color={phaseVisuals.wall} />
      <Wall position={[0, wallCenterY, halfDepth]} args={[dimensions.width, dimensions.height, WALL_THICKNESS]} color={phaseVisuals.wall} />
      <Wall position={[-halfWidth, wallCenterY, 0]} args={[WALL_THICKNESS, dimensions.height, dimensions.depth]} color={phaseVisuals.wall} />
      {activeControlRoomOpening ? (
        <ControlRoomOpeningStub
          opening={activeControlRoomOpening}
          roomEastWallX={roomEastWallX}
          connectorEndX={connectorEndX}
          wallCenterY={wallCenterY}
          wallColor={phaseVisuals.wall}
          roomMinZ={activeControlRoomArea?.bounds.min[2] ?? -halfDepth}
          roomMaxZ={activeControlRoomArea?.bounds.max[2] ?? halfDepth}
        />
      ) : (
        <Wall position={[halfWidth, wallCenterY, 0]} args={[WALL_THICKNESS, dimensions.height, dimensions.depth]} color={phaseVisuals.wall} />
      )}

      {stations.map((station) => (
        <ComputerStation
          key={station.id}
          station={station}
          phaseVisuals={phaseVisuals}
          countdownDisplay={countdownDisplay}
          roundNumber={roundNumber}
          users={users}
          ownerId={ownerId}
          assignedUser={stationAssignments.find((assignment) => assignment.station.id === station.id)?.user}
          isLocalStation={localStationSource !== "emergency" && station.id === localStationId}
          onActivateLocalDashboard={onActivateLocalDashboard}
        />
      ))}

      {stationOccupants.filter(({ user }) => !roamingSimUserIds.has(user.id)).map(({ user, station, isLocal, isHost }) => (
        <StationOccupantMarker key={user.id} user={user} station={station} isLocal={isLocal} isHost={isHost} />
      ))}

      {freeRoamOccupants.map(({ user, presence, isHost }) => (
        <FreeRoamPresenceMarker key={user.id} user={user} presence={presence} isHost={isHost} />
      ))}

      {idleRoamingSimUsers.map((user) => (
        <SimBotRoamingMarker
          key={user.id}
          user={user}
          levelConfig={levelConfig}
          isHost={user.isHost || user.id === ownerId}
        />
      ))}

      {shouldRenderControlRoomDisplays && activeControlRoomArea ? (
        <ControlRoomWallDisplays
          countdownDisplay={countdownDisplay}
          users={users}
          ownerId={ownerId}
          rangeScoreboard={rangeScoreboard}
          roundNumber={roundNumber}
          levelLabel="Level 1"
          areaLabel={activeControlRoomArea.label}
          displays={levelConfig.controlRoomDisplays}
        />
      ) : null}

      {shouldRenderControlRoomDisplays && activeControlRoomArea ? (
        <ControlRoomBalcony phaseVisuals={phaseVisuals} />
      ) : null}

      {shouldRenderControlRoomDisplays && activeControlRoomArea ? (
        <ControlRoomDecorativeWorkstations phaseVisuals={phaseVisuals} />
      ) : null}

      {shouldRenderControlRoomDisplays && activeControlRoomArea ? (
        <ControlRoomLoungeProps phaseVisuals={phaseVisuals} />
      ) : null}

      {shouldRenderControlRoomDisplays && activeControlRoomArea ? (
        <ControlRoomKitchenIslandProps phaseVisuals={phaseVisuals} />
      ) : null}

      {shouldRenderControlRoomDisplays && activeControlRoomArea && levelConfig.jukebox ? (
        <ControlRoomJukebox
          jukebox={levelConfig.jukebox}
          phaseVisuals={phaseVisuals}
          jukeboxDisplay={jukeboxDisplay}
          jukeboxActions={jukeboxActions}
        />
      ) : null}

      {!shouldRenderControlRoomDisplays ? (
        <WorldTimerDisplay countdownDisplay={countdownDisplay} phaseVisuals={phaseVisuals} timerDisplay={timerDisplay} />
      ) : null}
      {exits?.map((exit) => (
        <LevelExitDoor key={exit.id} exit={exit} onActivateExit={onLevelExit} />
      ))}
      {levelConfig.id === "level-1" && levelConfig.shootingRange ? (
        <Level1RangeRoom
          shootingRange={levelConfig.shootingRange}
          rangeScoreboard={rangeScoreboard}
          roundNumber={roundNumber}
          localUserId={localUserId}
          onSubmitRangeScore={onSubmitRangeScore}
          phaseVisuals={phaseVisuals}
        />
      ) : levelConfig.shootingRange ? (
        <ShootingRangePrototype
          shootingRange={levelConfig.shootingRange}
          levelId={levelConfig.id}
          roundNumber={roundNumber}
          rangeScoreboard={rangeScoreboard}
          localUserId={localUserId}
          onSubmitRangeScore={onSubmitRangeScore}
        />
      ) : null}
      {phaseVisuals.showCompletionBurst ? <CompletedPhaseBurst phaseVisuals={phaseVisuals} /> : null}
    </>
  );
}
