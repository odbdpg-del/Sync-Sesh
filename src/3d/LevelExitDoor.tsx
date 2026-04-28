import { useMemo, useRef } from "react";
import { useRegisterInteractable } from "./interactions";
import type { LevelExitConfig } from "./levels";

function createDoorLabelCanvas(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#06101f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#57f3ff";
  context.lineWidth = 12;
  context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  context.fillStyle = "rgba(87, 243, 255, 0.1)";
  context.fillRect(42, 42, canvas.width - 84, canvas.height - 84);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#effcff";
  context.font = "800 72px 'Courier New', monospace";
  context.fillText(label, canvas.width / 2, 106);

  context.fillStyle = "#8ba0c7";
  context.font = "700 30px 'Courier New', monospace";
  context.fillText("E", canvas.width / 2, 178);

  return canvas;
}

export function LevelExitDoor({
  exit,
  onActivateExit,
}: {
  exit: LevelExitConfig;
  onActivateExit: (exit: LevelExitConfig) => void;
}) {
  const groupRef = useRef<React.ElementRef<"group">>(null);
  const labelCanvas = useMemo(() => createDoorLabelCanvas(exit.label), [exit.label]);
  const registration = useMemo(() => ({
    id: exit.id,
    label: exit.label,
    objectRef: groupRef,
    modes: ["clickable" as const],
    onActivate: () => onActivateExit(exit),
  }), [exit, onActivateExit]);

  useRegisterInteractable(registration);

  return (
    <group ref={groupRef} position={exit.position} rotation={exit.rotation}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[exit.size.width + 0.18, exit.size.height + 0.18, 0.08]} />
        <meshStandardMaterial args={[{ color: "#050b14", emissive: "#103252", roughness: 0.62, metalness: 0.08 }]} />
      </mesh>
      <mesh>
        <boxGeometry args={[exit.size.width, exit.size.height, 0.06]} />
        <meshStandardMaterial args={[{ color: "#081827", emissive: "#061829", roughness: 0.72, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[exit.size.width * 0.7, exit.size.height * 0.36]} />
        <meshBasicMaterial args={[{ toneMapped: false }]}>
          <canvasTexture key={`level-exit-${exit.id}-${exit.label}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[-exit.size.width / 2 - 0.05, 0, 0.045]}>
        <boxGeometry args={[0.035, exit.size.height + 0.05, 0.035]} />
        <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
      </mesh>
      <mesh position={[exit.size.width / 2 + 0.05, 0, 0.045]}>
        <boxGeometry args={[0.035, exit.size.height + 0.05, 0.035]} />
        <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
      </mesh>
      <mesh position={[0, exit.size.height / 2 + 0.05, 0.045]}>
        <boxGeometry args={[exit.size.width + 0.13, 0.035, 0.035]} />
        <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
      </mesh>
      <mesh position={[0, -exit.size.height / 2 - 0.05, 0.045]}>
        <boxGeometry args={[exit.size.width + 0.13, 0.035, 0.035]} />
        <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
      </mesh>
    </group>
  );
}
