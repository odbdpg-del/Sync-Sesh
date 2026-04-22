import { useMemo } from "react";
import type { FreeRoamPresenceState, SessionUser } from "../types/session";
import { getCanvasFont } from "../lib/ui/typography";

const DOUBLE_SIDE = 2;

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function createPresenceLabelCanvas(user: SessionUser, isHost: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const accentColor = isHost ? "#f8d36a" : user.presence === "ready" ? "#6eff9a" : "#57f3ff";

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(3, 6, 12, 0.86)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accentColor;
  context.lineWidth = 10;
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  context.fillStyle = accentColor;
  context.beginPath();
  context.arc(74, 68, 42, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#03060c";
  context.font = getCanvasFont("display", 700, 32);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(user.avatarSeed.slice(0, 2).toUpperCase(), 74, 70);

  context.textAlign = "left";
  context.fillStyle = "#f4f7ff";
  context.font = getCanvasFont("display", 700, 40);
  context.fillText(truncateLabel(user.displayName, 16), 140, 66);

  context.fillStyle = accentColor;
  context.font = getCanvasFont("ui", 700, 24);
  context.fillText(truncateLabel(`${isHost ? "HOST | " : ""}${user.presence.toUpperCase()} | FREE ROAM`, 28), 140, 122);

  return canvas;
}

export function FreeRoamPresenceMarker({
  user,
  presence,
  isHost,
}: {
  user: SessionUser;
  presence: FreeRoamPresenceState;
  isHost: boolean;
}) {
  const labelCanvas = useMemo(
    () => createPresenceLabelCanvas(user, isHost),
    [isHost, user.avatarSeed, user.displayName, user.presence],
  );
  const textureKey = `${user.id}-${user.displayName}-${user.avatarSeed}-${user.presence}-${isHost}`;
  const accentColor = isHost ? "#f8d36a" : user.presence === "ready" ? "#6eff9a" : "#57f3ff";

  return (
    <group position={presence.position} rotation={[0, presence.yaw, 0]}>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.46, 0.96, 0.36]} />
        <meshStandardMaterial args={[{ color: "#315c83", roughness: 0.64, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.26, 20, 16]} />
        <meshStandardMaterial args={[{ color: accentColor, emissive: "#071520", roughness: 0.52 }]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.46, 32]} />
        <meshBasicMaterial args={[{ color: accentColor }]} />
      </mesh>
      <mesh position={[0, 0.08, -0.5]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <coneGeometry args={[0.14, 0.34, 3]} />
        <meshBasicMaterial args={[{ color: "#f4f7ff" }]} />
      </mesh>
      <mesh position={[0, 2.02, 0]}>
        <planeGeometry args={[1.56, 0.6]} />
        <meshBasicMaterial args={[{ transparent: true, side: DOUBLE_SIDE, toneMapped: false }]}>
          <canvasTexture key={textureKey} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}
