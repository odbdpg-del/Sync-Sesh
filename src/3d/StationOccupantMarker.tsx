import { useMemo } from "react";
import type { StationConfig } from "./levels";
import type { SessionUser } from "../types/session";

interface StationOccupantMarkerProps {
  user: SessionUser;
  station: StationConfig;
  isLocal: boolean;
  isHost: boolean;
}

const STATUS_COLORS = {
  idle: "#8fb3d9",
  ready: "#6eff9a",
  spectating: "#8b8fa8",
} satisfies Record<SessionUser["presence"], string>;
const DOUBLE_SIDE = 2;

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function getStatusText(user: SessionUser, isLocal: boolean, isHost: boolean) {
  const labels = [];

  if (isLocal) {
    labels.push("YOU");
  }

  if (isHost) {
    labels.push("HOST");
  }

  if (user.isTestUser) {
    labels.push("SIM");
  }

  labels.push(user.presence.toUpperCase());

  return labels.join(" | ");
}

function createLabelCanvas(user: SessionUser, isLocal: boolean, isHost: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const accentColor = isLocal ? "#57f3ff" : isHost ? "#f8d36a" : STATUS_COLORS[user.presence];

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(3, 6, 12, 0.86)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accentColor;
  context.lineWidth = 10;
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  context.fillStyle = accentColor;
  context.beginPath();
  context.arc(76, 72, 42, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#03060c";
  context.font = "700 34px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(user.avatarSeed.slice(0, 2).toUpperCase(), 76, 74);

  context.textAlign = "left";
  context.fillStyle = "#f4f7ff";
  context.font = "700 42px Arial, sans-serif";
  context.fillText(truncateLabel(user.displayName, 16), 142, 68);

  context.fillStyle = accentColor;
  context.font = "700 25px Arial, sans-serif";
  context.fillText(truncateLabel(getStatusText(user, isLocal, isHost), 25), 142, 124);

  return canvas;
}

function OccupantMaterial({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return <meshStandardMaterial args={[{ color, roughness: 0.66, metalness: 0.04, transparent: opacity < 1, opacity }]} />;
}

export function StationOccupantMarker({ user, station, isLocal, isHost }: StationOccupantMarkerProps) {
  const labelCanvas = useMemo(
    () => createLabelCanvas(user, isLocal, isHost),
    [isHost, isLocal, user.avatarSeed, user.displayName, user.isTestUser, user.presence],
  );
  const textureKey = `${user.id}-${user.displayName}-${user.avatarSeed}-${user.presence}-${isLocal}-${isHost}-${user.isTestUser ? "sim" : "real"}`;
  const statusColor = STATUS_COLORS[user.presence];
  const bodyColor = user.presence === "spectating" ? "#596174" : isLocal ? "#1bb7ce" : "#3f5f8f";
  const markerOpacity = user.presence === "spectating" ? 0.58 : 1;

  return (
    <group position={station.position} rotation={station.rotation}>
      <mesh position={[0, 0.9, 0.82]}>
        <boxGeometry args={[0.42, 0.62, 0.34]} />
        <OccupantMaterial color={bodyColor} opacity={markerOpacity} />
      </mesh>

      <mesh position={[0, 1.32, 0.74]}>
        <sphereGeometry args={[0.22, 18, 14]} />
        <OccupantMaterial color={isHost ? "#f8d36a" : statusColor} opacity={markerOpacity} />
      </mesh>

      <mesh position={[0, 0.52, 1.02]}>
        <boxGeometry args={[0.58, 0.16, 0.42]} />
        <OccupantMaterial color="#202b3d" opacity={markerOpacity} />
      </mesh>

      <mesh position={[0, 0.08, 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.43, 32]} />
        <meshBasicMaterial args={[{ color: isLocal ? "#57f3ff" : statusColor, transparent: markerOpacity < 1, opacity: markerOpacity }]} />
      </mesh>

      {isHost ? (
        <mesh position={[0, 1.66, 0.74]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
          <meshStandardMaterial args={[{ color: "#f8d36a", emissive: "#3a2b08", roughness: 0.4 }]} />
        </mesh>
      ) : null}

      {user.isTestUser ? (
        <mesh position={[0.33, 1.18, 0.76]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial args={[{ color: "#ff6bd6", emissive: "#401432", roughness: 0.52 }]} />
        </mesh>
      ) : null}

      <mesh position={[0, 1.92, 0.92]}>
        <planeGeometry args={[1.42, 0.54]} />
        <meshBasicMaterial args={[{ transparent: true, side: DOUBLE_SIDE, toneMapped: false }]}>
          <canvasTexture key={textureKey} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}
