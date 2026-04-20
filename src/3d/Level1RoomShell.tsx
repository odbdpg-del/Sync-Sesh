import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { LevelConfig, LightConfig } from "./levels";
import { ComputerStation } from "./ComputerStation";
import { StationOccupantMarker } from "./StationOccupantMarker";
import { WorldTimerDisplay } from "./WorldTimerDisplay";
import { getPhaseVisuals } from "./phaseVisuals";
import type { PhaseVisuals } from "./phaseVisuals";
import type { CountdownDisplayState, SessionUser } from "../types/session";

const WALL_THICKNESS = 0.18;

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
}

export function Level1RoomShell({ levelConfig, countdownDisplay, users, localUserId, ownerId }: Level1RoomShellProps) {
  const { dimensions, lighting, stations, timerDisplay } = levelConfig;
  const halfWidth = dimensions.width / 2;
  const halfDepth = dimensions.depth / 2;
  const wallCenterY = dimensions.height / 2;
  const gridSize = Math.max(dimensions.width, dimensions.depth);
  const phaseVisuals = getPhaseVisuals(countdownDisplay.phase, countdownDisplay.isUrgent);
  const stationOccupants = [...users]
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
    }));

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
      <Wall position={[halfWidth, wallCenterY, 0]} args={[WALL_THICKNESS, dimensions.height, dimensions.depth]} color={phaseVisuals.wall} />

      {stations.map((station) => (
        <ComputerStation key={station.id} station={station} phaseVisuals={phaseVisuals} />
      ))}

      {stationOccupants.map(({ user, station, isLocal, isHost }) => (
        <StationOccupantMarker key={user.id} user={user} station={station} isLocal={isLocal} isHost={isHost} />
      ))}

      <WorldTimerDisplay countdownDisplay={countdownDisplay} phaseVisuals={phaseVisuals} timerDisplay={timerDisplay} />
      {phaseVisuals.showCompletionBurst ? <CompletedPhaseBurst phaseVisuals={phaseVisuals} /> : null}
    </>
  );
}
