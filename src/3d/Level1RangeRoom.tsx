import { useMemo, useRef, useState } from "react";
import type { PhaseVisuals } from "./phaseVisuals";
import type { RangeScoreResult, RangeScoreSubmission } from "../types/session";
import type { ShootingRangeConfig, LightConfig } from "./levels";
import { useRegisterInteractable } from "./interactions";
import { ShootingRangePrototype } from "./ShootingRangePrototype";
import { getCanvasFont } from "../lib/ui/typography";

type GunRackWeaponKind =
  | "compact-pistol"
  | "heavy-revolver"
  | "short-smg"
  | "tactical-rifle"
  | "marksman-rifle";

interface GunRackWeaponSpec {
  id: string;
  label: string;
  kind: GunRackWeaponKind;
  accentColor: string;
  silhouetteLength: number;
  slotIndex: number;
  slotOffset: readonly [number, number, number];
  plaque?: string;
}

const RANGE_GUN_RACK_SPEC = {
  id: "range-east-wall-gun-rack",
  label: "Range Gun Rack",
  position: [5.88, 1.55, 6.15],
  rotation: [0, -Math.PI / 2, 0],
  size: {
    width: 2.75,
    height: 1.35,
    depth: 0.1,
  },
  weapons: [
    {
      id: "rack-compact-pistol",
      label: "Compact Pistol",
      kind: "compact-pistol",
      accentColor: "#57f3ff",
      silhouetteLength: 0.72,
      slotIndex: 0,
      slotOffset: [0, 0.48, 0.08],
      plaque: "Pistol",
    },
    {
      id: "rack-heavy-revolver",
      label: "Heavy Revolver",
      kind: "heavy-revolver",
      accentColor: "#f8d36a",
      silhouetteLength: 0.86,
      slotIndex: 1,
      slotOffset: [0, 0.24, 0.08],
      plaque: "Revolver",
    },
    {
      id: "rack-short-smg",
      label: "Short SMG",
      kind: "short-smg",
      accentColor: "#ff6bd6",
      silhouetteLength: 1.08,
      slotIndex: 2,
      slotOffset: [0, 0, 0.08],
      plaque: "SMG",
    },
    {
      id: "rack-tactical-rifle",
      label: "Tactical Rifle",
      kind: "tactical-rifle",
      accentColor: "#73ff4c",
      silhouetteLength: 1.42,
      slotIndex: 3,
      slotOffset: [0, -0.24, 0.08],
      plaque: "Rifle",
    },
    {
      id: "rack-marksman-rifle",
      label: "Marksman Rifle",
      kind: "marksman-rifle",
      accentColor: "#8fb3d9",
      silhouetteLength: 1.72,
      slotIndex: 4,
      slotOffset: [0, -0.48, 0.08],
      plaque: "Marksman",
    },
  ],
} as const;

function RangeLight({ light, phaseVisuals }: { light: LightConfig; phaseVisuals: PhaseVisuals }) {
  if (light.type === "ambient") {
    return <ambientLight color={phaseVisuals.ambientColor} intensity={phaseVisuals.ambientIntensity} />;
  }

  if (light.type === "directional") {
    return <directionalLight color={phaseVisuals.directionalColor} intensity={phaseVisuals.directionalIntensity} position={light.position} />;
  }

  return <pointLight color={phaseVisuals.timerGlow} intensity={phaseVisuals.timerGlowIntensity} position={light.position} />;
}

function Wall({
  position,
  args,
  color,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial args={[{ color, roughness: 0.84, metalness: 0.03 }]} />
    </mesh>
  );
}

function createRackStatusCanvas(selectedWeaponLabel: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#07111f");
  gradient.addColorStop(1, "#13243a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#57f3ff";
  context.lineWidth = 10;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  context.fillStyle = "#57f3ff";
  context.font = getCanvasFont("display", 700, 42);
  context.textAlign = "center";
  context.fillText("RACK SELECT", canvas.width / 2, 88);

  context.fillStyle = "#f4f7ff";
  context.font = getCanvasFont("display", 800, 48);
  context.fillText(selectedWeaponLabel.toUpperCase(), canvas.width / 2, 166);

  context.fillStyle = "rgba(115, 255, 76, 0.72)";
  context.font = getCanvasFont("ui", 600, 24);
  context.fillText("PRESS E TO INSPECT", canvas.width / 2, 214);

  return canvas;
}

function WeaponGrip({ x, y, color, scale = 1 }: { x: number; y: number; color: string; scale?: number }) {
  return (
    <mesh position={[x, y - 0.09 * scale, 0.04]} rotation={[0, 0, -0.34]}>
      <boxGeometry args={[0.08 * scale, 0.24 * scale, 0.08]} />
      <meshStandardMaterial args={[{ color: "#101827", emissive: color, emissiveIntensity: 0.08, roughness: 0.62, metalness: 0.08 }]} />
    </mesh>
  );
}

function WeaponBarrel({ x, y, length, color }: { x: number; y: number; length: number; color: string }) {
  return (
    <mesh position={[x, y, 0.055]}>
      <boxGeometry args={[length, 0.045, 0.055]} />
      <meshStandardMaterial args={[{ color: "#161f2f", emissive: color, emissiveIntensity: 0.12, roughness: 0.54, metalness: 0.16 }]} />
    </mesh>
  );
}

function CompactPistol({ weapon }: { weapon: GunRackWeaponSpec }) {
  return (
    <group>
      <WeaponBarrel x={0.08} y={0.02} length={weapon.silhouetteLength * 0.58} color={weapon.accentColor} />
      <mesh position={[-0.13, 0.02, 0.045]}>
        <boxGeometry args={[0.32, 0.12, 0.08]} />
        <meshStandardMaterial args={[{ color: "#233049", roughness: 0.56, metalness: 0.12 }]} />
      </mesh>
      <mesh position={[0.34, 0.02, 0.055]}>
        <boxGeometry args={[0.1, 0.035, 0.05]} />
        <meshBasicMaterial args={[{ color: weapon.accentColor }]} />
      </mesh>
      <WeaponGrip x={-0.22} y={-0.03} color={weapon.accentColor} />
    </group>
  );
}

function HeavyRevolver({ weapon }: { weapon: GunRackWeaponSpec }) {
  return (
    <group>
      <WeaponBarrel x={0.16} y={0.02} length={weapon.silhouetteLength * 0.54} color={weapon.accentColor} />
      <mesh position={[-0.16, 0.02, 0.04]}>
        <boxGeometry args={[0.3, 0.14, 0.09]} />
        <meshStandardMaterial args={[{ color: "#222c3f", roughness: 0.54, metalness: 0.14 }]} />
      </mesh>
      <mesh position={[-0.03, 0.02, 0.095]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.08, 24]} />
        <meshStandardMaterial args={[{ color: weapon.accentColor, emissive: weapon.accentColor, emissiveIntensity: 0.18, roughness: 0.5, metalness: 0.18 }]} />
      </mesh>
      <WeaponGrip x={-0.3} y={-0.04} color={weapon.accentColor} scale={1.08} />
    </group>
  );
}

function ShortSmg({ weapon }: { weapon: GunRackWeaponSpec }) {
  return (
    <group>
      <WeaponBarrel x={0.36} y={0.025} length={weapon.silhouetteLength * 0.38} color={weapon.accentColor} />
      <mesh position={[-0.04, 0.025, 0.045]}>
        <boxGeometry args={[0.56, 0.14, 0.09]} />
        <meshStandardMaterial args={[{ color: "#202a3e", roughness: 0.58, metalness: 0.12 }]} />
      </mesh>
      <mesh position={[0.13, -0.135, 0.045]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.1, 0.3, 0.075]} />
        <meshStandardMaterial args={[{ color: "#101827", emissive: weapon.accentColor, emissiveIntensity: 0.12, roughness: 0.62 }]} />
      </mesh>
      <mesh position={[-0.46, 0.055, 0.045]}>
        <boxGeometry args={[0.28, 0.075, 0.075]} />
        <meshStandardMaterial args={[{ color: "#121a2a", roughness: 0.62, metalness: 0.1 }]} />
      </mesh>
      <WeaponGrip x={-0.18} y={-0.045} color={weapon.accentColor} scale={0.92} />
    </group>
  );
}

function TacticalRifle({ weapon }: { weapon: GunRackWeaponSpec }) {
  return (
    <group>
      <WeaponBarrel x={0.43} y={0.025} length={weapon.silhouetteLength * 0.42} color={weapon.accentColor} />
      <mesh position={[-0.08, 0.025, 0.045]}>
        <boxGeometry args={[0.7, 0.13, 0.085]} />
        <meshStandardMaterial args={[{ color: "#1e293d", roughness: 0.56, metalness: 0.13 }]} />
      </mesh>
      <mesh position={[-0.58, 0.055, 0.045]}>
        <boxGeometry args={[0.42, 0.12, 0.08]} />
        <meshStandardMaterial args={[{ color: "#111827", roughness: 0.62, metalness: 0.1 }]} />
      </mesh>
      <mesh position={[-0.02, -0.145, 0.045]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.12, 0.34, 0.075]} />
        <meshStandardMaterial args={[{ color: "#0d1523", emissive: weapon.accentColor, emissiveIntensity: 0.1, roughness: 0.64 }]} />
      </mesh>
      <mesh position={[-0.25, -0.095, 0.045]} rotation={[0, 0, -0.28]}>
        <boxGeometry args={[0.08, 0.22, 0.075]} />
        <meshStandardMaterial args={[{ color: "#101827", roughness: 0.64 }]} />
      </mesh>
      <mesh position={[0.14, 0.125, 0.055]}>
        <boxGeometry args={[0.52, 0.03, 0.035]} />
        <meshBasicMaterial args={[{ color: weapon.accentColor }]} />
      </mesh>
    </group>
  );
}

function MarksmanRifle({ weapon }: { weapon: GunRackWeaponSpec }) {
  return (
    <group>
      <WeaponBarrel x={0.58} y={0.02} length={weapon.silhouetteLength * 0.5} color={weapon.accentColor} />
      <mesh position={[-0.12, 0.02, 0.045]}>
        <boxGeometry args={[0.76, 0.105, 0.075]} />
        <meshStandardMaterial args={[{ color: "#1b2638", roughness: 0.56, metalness: 0.13 }]} />
      </mesh>
      <mesh position={[-0.72, 0.045, 0.045]}>
        <boxGeometry args={[0.5, 0.13, 0.08]} />
        <meshStandardMaterial args={[{ color: "#101827", roughness: 0.62, metalness: 0.1 }]} />
      </mesh>
      <mesh position={[0.04, 0.155, 0.05]}>
        <boxGeometry args={[0.34, 0.08, 0.07]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: weapon.accentColor, emissiveIntensity: 0.18, roughness: 0.52 }]} />
      </mesh>
      <mesh position={[0.04, 0.215, 0.05]}>
        <boxGeometry args={[0.46, 0.035, 0.045]} />
        <meshBasicMaterial args={[{ color: weapon.accentColor }]} />
      </mesh>
      <WeaponGrip x={-0.32} y={-0.055} color={weapon.accentColor} scale={0.9} />
    </group>
  );
}

function GunRackWeapon({ weapon }: { weapon: GunRackWeaponSpec }) {
  if (weapon.kind === "compact-pistol") {
    return <CompactPistol weapon={weapon} />;
  }

  if (weapon.kind === "heavy-revolver") {
    return <HeavyRevolver weapon={weapon} />;
  }

  if (weapon.kind === "short-smg") {
    return <ShortSmg weapon={weapon} />;
  }

  if (weapon.kind === "tactical-rifle") {
    return <TacticalRifle weapon={weapon} />;
  }

  return <MarksmanRifle weapon={weapon} />;
}

function GunRackStatusPlaque({ selectedWeaponLabel }: { selectedWeaponLabel: string }) {
  const statusCanvas = useMemo(() => createRackStatusCanvas(selectedWeaponLabel), [selectedWeaponLabel]);

  return (
    <group position={[0, -0.9, 0.105]}>
      <mesh position={[0, 0, -0.018]}>
        <boxGeometry args={[1.42, 0.52, 0.04]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: "#030b14", emissiveIntensity: 0.24, roughness: 0.64, metalness: 0.1 }]} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.32, 0.46]} />
        <meshBasicMaterial args={[{ toneMapped: false }]}>
          <canvasTexture key={`rack-status-${selectedWeaponLabel}`} attach="map" args={[statusCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function GunRackWeaponSlot({
  isSelected,
  onSelectWeapon,
  phaseVisuals,
  weapon,
}: {
  isSelected: boolean;
  onSelectWeapon: (weaponId: string) => void;
  phaseVisuals: PhaseVisuals;
  weapon: GunRackWeaponSpec;
}) {
  const groupRef = useRef<React.ElementRef<"group">>(null);

  useRegisterInteractable(useMemo(() => ({
    id: `gun-rack-${weapon.id}`,
    label: `Inspect ${weapon.label}`,
    objectRef: groupRef,
    modes: ["clickable" as const],
    onActivate: () => onSelectWeapon(weapon.id),
  }), [onSelectWeapon, weapon.id, weapon.label]));

  const railEmissiveIntensity = isSelected ? 0.42 : 0.12;
  const selectedAccent = isSelected ? phaseVisuals.timerGlow : weapon.accentColor;

  return (
    <group ref={groupRef} position={weapon.slotOffset}>
      <mesh position={[0, 0, 0.012]}>
        <boxGeometry args={[RANGE_GUN_RACK_SPEC.size.width * 0.78, 0.025, 0.035]} />
        <meshStandardMaterial args={[{ color: "#17243a", emissive: selectedAccent, emissiveIntensity: railEmissiveIntensity, roughness: 0.68 }]} />
      </mesh>
      <mesh position={[-weapon.silhouetteLength / 2 - 0.08, -0.04, 0.005]}>
        <boxGeometry args={[0.05, 0.12, 0.055]} />
        <meshBasicMaterial args={[{ color: selectedAccent }]} />
      </mesh>
      <mesh position={[weapon.silhouetteLength / 2 + 0.08, -0.04, 0.005]}>
        <boxGeometry args={[0.05, 0.12, 0.055]} />
        <meshBasicMaterial args={[{ color: selectedAccent }]} />
      </mesh>
      {isSelected ? (
        <>
          <mesh position={[-weapon.silhouetteLength / 2 - 0.24, 0, 0.085]}>
            <boxGeometry args={[0.035, 0.19, 0.035]} />
            <meshBasicMaterial args={[{ color: phaseVisuals.timerGlow }]} />
          </mesh>
          <mesh position={[weapon.silhouetteLength / 2 + 0.24, 0, 0.085]}>
            <boxGeometry args={[0.035, 0.19, 0.035]} />
            <meshBasicMaterial args={[{ color: phaseVisuals.timerGlow }]} />
          </mesh>
        </>
      ) : null}
      <GunRackWeapon weapon={weapon} />
      <mesh position={[1.12, -0.02, 0.055]}>
        <boxGeometry args={[0.28, 0.095, 0.03]} />
        <meshStandardMaterial args={[{ color: "#101827", emissive: selectedAccent, emissiveIntensity: isSelected ? 0.36 : 0.16, roughness: 0.62 }]} />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[weapon.silhouetteLength + 0.68, 0.24, 0.05]} />
        <meshBasicMaterial args={[{ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }]} />
      </mesh>
    </group>
  );
}

function GunRack({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  const rack = RANGE_GUN_RACK_SPEC;
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const selectedWeapon = rack.weapons.find((weapon) => weapon.id === selectedWeaponId);
  const selectedWeaponLabel = selectedWeapon?.label ?? "NONE";

  return (
    <group position={rack.position} rotation={rack.rotation}>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[rack.size.width, rack.size.height, rack.size.depth]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: "#030b14", emissiveIntensity: 0.22, roughness: 0.72, metalness: 0.12 }]} />
      </mesh>
      <mesh position={[0, rack.size.height / 2 - 0.04, 0.07]}>
        <boxGeometry args={[rack.size.width * 0.92, 0.035, 0.035]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>
      <mesh position={[0, -rack.size.height / 2 + 0.04, 0.07]}>
        <boxGeometry args={[rack.size.width * 0.92, 0.035, 0.035]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary }]} />
      </mesh>
      <mesh position={[-rack.size.width / 2 + 0.04, 0, 0.07]}>
        <boxGeometry args={[0.035, rack.size.height * 0.9, 0.035]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent }]} />
      </mesh>
      <mesh position={[rack.size.width / 2 - 0.04, 0, 0.07]}>
        <boxGeometry args={[0.035, rack.size.height * 0.9, 0.035]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>

      {rack.weapons.map((weapon) => (
        <GunRackWeaponSlot
          key={weapon.id}
          isSelected={weapon.id === selectedWeaponId}
          onSelectWeapon={setSelectedWeaponId}
          phaseVisuals={phaseVisuals}
          weapon={weapon}
        />
      ))}
      <GunRackStatusPlaque selectedWeaponLabel={selectedWeaponLabel} />
    </group>
  );
}

export function Level1RangeRoom({
  shootingRange,
  rangeScoreboard,
  roundNumber,
  localUserId,
  onSubmitRangeScore,
  phaseVisuals,
}: {
  shootingRange: ShootingRangeConfig;
  rangeScoreboard: RangeScoreResult[];
  roundNumber: number;
  localUserId: string;
  onSubmitRangeScore: (result: RangeScoreSubmission) => void;
  phaseVisuals: PhaseVisuals;
}) {
  const roomWidth = 12;
  const roomDepth = 18;
  const roomHeight = 4.5;
  const wallThickness = 0.18;
  const roomHalfWidth = roomWidth / 2;
  const roomHalfDepth = roomDepth / 2;
  const openingHalfWidth = 1.2;
  const westWallSegmentDepth = roomHalfDepth - openingHalfWidth;
  const westWallSegmentCenterOffset = (roomHalfDepth - openingHalfWidth) / 2;
  const rangeLights: LightConfig[] = [
    {
      id: "range-ambient",
      type: "ambient",
      color: "#7fa7ff",
      intensity: 0.34,
    },
    {
      id: "range-overhead",
      type: "directional",
      position: [2, 6, 4],
      target: [0, 0, -4],
      color: "#f4f7ff",
      intensity: 1.2,
    },
    {
      id: "range-target-glow",
      type: "point",
      position: [0, 2.4, -7.8],
      color: "#73ff4c",
      intensity: 0.7,
    },
  ];

  return (
    <group position={[16.5, 0, 0]}>
      {rangeLights.map((light) => (
        <RangeLight key={light.id} light={light} phaseVisuals={phaseVisuals} />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial args={[{ color: "#0d1b2d", roughness: 0.86, metalness: 0.02 }]} />
      </mesh>

      <Wall position={[0, roomHeight / 2, -roomHalfDepth]} args={[roomWidth, roomHeight, wallThickness]} color="#08111f" />
      <Wall position={[0, roomHeight / 2, roomHalfDepth]} args={[roomWidth, roomHeight, wallThickness]} color="#08111f" />
      <Wall position={[-roomHalfWidth, roomHeight / 2, -westWallSegmentCenterOffset - openingHalfWidth]} args={[wallThickness, roomHeight, westWallSegmentDepth]} color="#08111f" />
      <Wall position={[-roomHalfWidth, roomHeight / 2, westWallSegmentCenterOffset + openingHalfWidth]} args={[wallThickness, roomHeight, westWallSegmentDepth]} color="#08111f" />
      <Wall position={[roomHalfWidth, roomHeight / 2, 0]} args={[wallThickness, roomHeight, roomDepth]} color="#08111f" />

      <GunRack phaseVisuals={phaseVisuals} />

      <ShootingRangePrototype
        shootingRange={shootingRange}
        levelId="level-2-range"
        roundNumber={roundNumber}
        rangeScoreboard={rangeScoreboard}
        localUserId={localUserId}
        onSubmitRangeScore={onSubmitRangeScore}
      />
    </group>
  );
}
