import type { StationConfig } from "./levels";
import type { PhaseVisuals } from "./phaseVisuals";

interface ComputerStationProps {
  station: StationConfig;
  phaseVisuals: PhaseVisuals;
}

function Box({
  position,
  args,
  color,
  emissive,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
  emissive?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial args={[{ color, emissive: emissive ?? "#000000", roughness: 0.74, metalness: 0.06 }]} />
    </mesh>
  );
}

export function ComputerStation({ station, phaseVisuals }: ComputerStationProps) {
  return (
    <group position={station.position} rotation={station.rotation}>
      <Box position={[0, 0.72, 0]} args={[1.7, 0.14, 0.78]} color="#18243a" />

      <Box position={[-0.72, 0.36, -0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />
      <Box position={[0.72, 0.36, -0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />
      <Box position={[-0.72, 0.36, 0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />
      <Box position={[0.72, 0.36, 0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />

      <Box position={[0, 0.82, 0.05]} args={[0.72, 0.035, 0.22]} color="#05070c" />

      <Box position={[0, 1.02, -0.18]} args={[0.16, 0.34, 0.12]} color="#07111f" />
      <Box position={[0, 1.32, -0.34]} args={[1.05, 0.62, 0.12]} color="#07111f" />
      <Box position={[0, 1.32, -0.405]} args={[0.88, 0.46, 0.025]} color="#102b3a" emissive={phaseVisuals.monitorGlow} />

      <Box position={[0, 0.45, 0.7]} args={[0.72, 0.18, 0.62]} color="#2b3448" />
      <Box position={[0, 0.95, 0.98]} args={[0.72, 0.85, 0.14]} color="#2b3448" />
    </group>
  );
}
