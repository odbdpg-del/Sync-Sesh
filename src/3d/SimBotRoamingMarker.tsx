import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { LevelConfig } from "./levels";
import { getSimBotRoamingPose } from "./simBotRoaming";
import type { SessionUser } from "../types/session";

const DOUBLE_SIDE = 2;

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function createSimRoamLabelCanvas(user: SessionUser, isHost: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const accentColor = isHost ? "#f8d36a" : "#ff6bd6";

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(3, 6, 12, 0.88)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accentColor;
  context.lineWidth = 10;
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  context.fillStyle = accentColor;
  context.beginPath();
  context.arc(74, 68, 42, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#03060c";
  context.font = "700 32px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(user.avatarSeed.slice(0, 2).toUpperCase(), 74, 70);

  context.textAlign = "left";
  context.fillStyle = "#f4f7ff";
  context.font = "700 40px Arial, sans-serif";
  context.fillText(truncateLabel(user.displayName, 16), 140, 66);

  context.fillStyle = accentColor;
  context.font = "700 24px Arial, sans-serif";
  context.fillText(truncateLabel(`${isHost ? "HOST | " : ""}SIM ROAM`, 28), 140, 122);

  return canvas;
}

export function SimBotRoamingMarker({
  user,
  levelConfig,
  isHost,
}: {
  user: SessionUser;
  levelConfig: LevelConfig;
  isHost: boolean;
}) {
  const groupRef = useRef<React.ElementRef<"group">>(null);
  const labelCanvas = useMemo(
    () => createSimRoamLabelCanvas(user, isHost),
    [isHost, user.avatarSeed, user.displayName],
  );
  const textureKey = `${user.id}-${user.displayName}-${user.avatarSeed}-${isHost}-sim-roam`;
  const accentColor = isHost ? "#f8d36a" : "#ff6bd6";

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pose = getSimBotRoamingPose({
      user,
      levelConfig,
      elapsedSeconds: clock.getElapsedTime(),
    });

    if (!pose) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    groupRef.current.position.set(...pose.position);
    groupRef.current.rotation.set(0, pose.yaw, 0);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.76, 0]}>
        <boxGeometry args={[0.42, 0.9, 0.32]} />
        <meshStandardMaterial args={[{ color: "#5d3f8f", roughness: 0.64, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.24, 20, 16]} />
        <meshStandardMaterial args={[{ color: accentColor, emissive: "#32142c", roughness: 0.52 }]} />
      </mesh>
      <mesh position={[0.3, 1.08, -0.02]}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshStandardMaterial args={[{ color: "#57f3ff", emissive: "#082c35", roughness: 0.52 }]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.44, 32]} />
        <meshBasicMaterial args={[{ color: accentColor }]} />
      </mesh>
      <mesh position={[0, 0.08, -0.48]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <coneGeometry args={[0.13, 0.32, 3]} />
        <meshBasicMaterial args={[{ color: "#f4f7ff" }]} />
      </mesh>
      <mesh position={[0, 1.98, 0]}>
        <planeGeometry args={[1.56, 0.6]} />
        <meshBasicMaterial args={[{ transparent: true, side: DOUBLE_SIDE, toneMapped: false }]}>
          <canvasTexture key={textureKey} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}
