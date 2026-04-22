import { useMemo } from "react";
import type { TimerDisplayConfig } from "./levels";
import type { PhaseVisuals } from "./phaseVisuals";
import type { CountdownDisplayState } from "../types/session";
import { getCanvasFont } from "../lib/ui/typography";

interface WorldTimerDisplayProps {
  countdownDisplay: CountdownDisplayState;
  phaseVisuals: PhaseVisuals;
  timerDisplay: TimerDisplayConfig;
}

function drawTimerCanvas(countdownDisplay: CountdownDisplayState, phaseVisuals: PhaseVisuals) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const accentColor = phaseVisuals.timerAccent;
  context.fillStyle = phaseVisuals.timerBackground;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accentColor;
  context.lineWidth = 14;
  context.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  context.fillStyle = "rgba(87, 243, 255, 0.08)";
  for (let y = 58; y < canvas.height - 40; y += 28) {
    context.fillRect(48, y, canvas.width - 96, 2);
  }

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = accentColor;
  context.font = getCanvasFont("mono", 700, 132);
  context.fillText(countdownDisplay.timerText, canvas.width / 2, 224);

  context.fillStyle = "#dce8ff";
  context.font = getCanvasFont("display", 700, 46);
  context.fillText(countdownDisplay.phase.toUpperCase(), canvas.width / 2, 92);

  context.fillStyle = "#8ba0c7";
  context.font = getCanvasFont("ui", 600, 32);
  context.fillText(countdownDisplay.subheadline, canvas.width / 2, 370);

  return canvas;
}

export function WorldTimerDisplay({ countdownDisplay, phaseVisuals, timerDisplay }: WorldTimerDisplayProps) {
  const textureCanvas = useMemo(
    () => drawTimerCanvas(countdownDisplay, phaseVisuals),
    [
      countdownDisplay.phase,
      countdownDisplay.subheadline,
      countdownDisplay.timerText,
      phaseVisuals.timerAccent,
      phaseVisuals.timerBackground,
    ],
  );
  const textureKey = `${countdownDisplay.phase}-${countdownDisplay.timerText}-${phaseVisuals.timerAccent}-${phaseVisuals.timerBackground}`;

  return (
    <group position={timerDisplay.position} rotation={timerDisplay.rotation}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[timerDisplay.size.width + 0.18, timerDisplay.size.height + 0.18, 0.08]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: phaseVisuals.timerGlow, roughness: 0.55, metalness: 0.12 }]} />
      </mesh>

      <mesh>
        <planeGeometry args={[timerDisplay.size.width, timerDisplay.size.height]} />
        <meshBasicMaterial args={[{ toneMapped: false }]}>
          <canvasTexture key={textureKey} attach="map" args={[textureCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}
