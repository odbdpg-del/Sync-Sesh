import { useMemo, useRef } from "react";
import { useRegisterInteractable } from "./interactions";
import type { StationConfig } from "./levels";
import type { PhaseVisuals } from "./phaseVisuals";
import type { CountdownDisplayState, SessionUser } from "../types/session";
import { getCanvasFont } from "../lib/ui/typography";

interface ComputerStationProps {
  station: StationConfig;
  phaseVisuals: PhaseVisuals;
  countdownDisplay: CountdownDisplayState;
  roundNumber: number;
  users: SessionUser[];
  ownerId: string;
  assignedUser?: SessionUser;
  isLocalStation?: boolean;
  onActivateLocalDashboard?: () => void;
}

const DOUBLE_SIDE = 2 as const;

function getReadyCount(users: SessionUser[]) {
  return users.filter((user) => user.presence === "ready").length;
}

function getIdleCount(users: SessionUser[]) {
  return users.filter((user) => user.presence === "idle").length;
}

function getSpectatorCount(users: SessionUser[]) {
  return users.filter((user) => user.presence === "spectating").length;
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatUserStatus(user: SessionUser, isHost: boolean) {
  const labels = [];

  if (isHost) {
    labels.push("HOST");
  }

  if (user.isTestUser) {
    labels.push("SIM");
  }

  labels.push(user.presence.toUpperCase());

  return labels.join(" / ");
}

function drawMetric(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  accent: string,
) {
  context.fillStyle = "rgba(220, 232, 255, 0.07)";
  context.fillRect(x, y, width, 82);

  context.textAlign = "center";
  context.fillStyle = "#8ba0c7";
  context.font = getCanvasFont("mono", 700, 18);
  context.fillText(label, x + width / 2, y + 24);

  context.fillStyle = accent;
  context.font = getCanvasFont("display", 800, 34);
  context.fillText(value, x + width / 2, y + 58);
}

function drawDashboardCanvas({
  countdownDisplay,
  roundNumber,
  users,
  ownerId,
  stationLabel,
  assignedUser,
}: {
  countdownDisplay: CountdownDisplayState;
  roundNumber: number;
  users: SessionUser[];
  ownerId: string;
  stationLabel: string;
  assignedUser?: SessionUser;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const accent = countdownDisplay.isUrgent ? "#f8d36a" : "#31f6ff";
  const readyCount = getReadyCount(users);
  const idleCount = getIdleCount(users);
  const spectatorCount = getSpectatorCount(users);
  const activeUsers = users.filter((user) => user.presence !== "spectating").length;

  context.fillStyle = "#050912";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glowGradient = context.createRadialGradient(512, 250, 20, 512, 250, 560);
  glowGradient.addColorStop(0, countdownDisplay.isUrgent ? "rgba(248, 211, 106, 0.2)" : "rgba(49, 246, 255, 0.18)");
  glowGradient.addColorStop(1, "rgba(5, 9, 18, 0)");
  context.fillStyle = glowGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#1c2a43";
  context.lineWidth = 8;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  context.strokeStyle = accent;
  context.lineWidth = 5;
  context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  context.fillStyle = "rgba(49, 246, 255, 0.08)";
  for (let y = 88; y < canvas.height - 58; y += 32) {
    context.fillRect(58, y, canvas.width - 116, 2);
  }

  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = "#8b7cff";
  context.font = getCanvasFont("ui", 700, 22);
  context.fillText("DISCORD ACTIVITY", 64, 76);

  context.fillStyle = "#effcff";
  context.font = getCanvasFont("mono", 800, 52);
  context.fillText("SYNC SESH", 62, 128);

  context.fillStyle = "#8ba0c7";
  context.font = getCanvasFont("ui", 700, 20);
  context.fillText(`${stationLabel.toUpperCase()} / LIVE DASHBOARD`, 66, 176);

  if (assignedUser) {
    const isAssignedHost = assignedUser.id === ownerId || assignedUser.isHost;

    context.fillStyle = isAssignedHost ? "#f8d36a" : "#31f6ff";
    context.font = getCanvasFont("display", 800, 26);
    context.fillText(truncateLabel(`${assignedUser.displayName}'S COMPUTER`, 22).toUpperCase(), 66, 216);

    context.fillStyle = "#8ba0c7";
    context.font = getCanvasFont("ui", 700, 18);
    context.fillText(formatUserStatus(assignedUser, isAssignedHost), 66, 246);
  }

  context.textAlign = "right";
  context.fillStyle = accent;
  context.font = getCanvasFont("display", 800, 24);
  context.fillText(countdownDisplay.phase.toUpperCase(), canvas.width - 64, 78);
  context.fillStyle = "#dce8ff";
  context.font = getCanvasFont("ui", 700, 20);
  context.fillText(`${activeUsers}/${users.length || 0} CONNECTED`, canvas.width - 64, 120);

  context.textAlign = "center";
  context.fillStyle = accent;
  context.shadowColor = accent;
  context.shadowBlur = 24;
  context.font = getCanvasFont("mono", 800, 124);
  context.fillText(countdownDisplay.timerText, canvas.width / 2, 292);

  context.shadowBlur = 0;
  context.fillStyle = "#73ff4c";
  context.font = getCanvasFont("display", 700, 26);
  context.fillText(countdownDisplay.headline.toUpperCase(), canvas.width / 2, 382);

  context.fillStyle = "#dce8ff";
  context.font = getCanvasFont("ui", 700, 20);
  context.fillText(countdownDisplay.subheadline.toUpperCase(), canvas.width / 2, 426);

  const metricY = 478;
  const metricWidth = 136;
  const metricGap = 28;
  const metricStartX = 106;
  drawMetric(context, "ROUND", String(roundNumber), metricStartX, metricY, metricWidth, "#effcff");
  drawMetric(context, "READY", String(readyCount), metricStartX + (metricWidth + metricGap), metricY, metricWidth, "#73ff4c");
  drawMetric(context, "IDLE", String(idleCount), metricStartX + (metricWidth + metricGap) * 2, metricY, metricWidth, "#42c7ff");
  drawMetric(context, "SPEC", String(spectatorCount), metricStartX + (metricWidth + metricGap) * 3, metricY, metricWidth, "#f8d36a");

  context.textAlign = "left";
  context.fillStyle = "#8b7cff";
  context.font = getCanvasFont("mono", 700, 18);
  context.fillText("SESSION DECK", 720, 470);

  users.slice(0, 3).forEach((user, index) => {
    const y = 506 + index * 34;
    const isHost = user.id === ownerId || user.isHost;

    context.fillStyle = isHost ? "#f8d36a" : "#dce8ff";
    context.font = getCanvasFont("display", 800, 20);
    context.fillText(truncateLabel(user.displayName, 12), 720, y);

    context.fillStyle = "#8ba0c7";
    context.font = getCanvasFont("ui", 700, 14);
    context.fillText(formatUserStatus(user, isHost), 720, y + 18);
  });

  return canvas;
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

export function ComputerStation({
  station,
  phaseVisuals,
  countdownDisplay,
  roundNumber,
  users,
  ownerId,
  assignedUser,
  isLocalStation = false,
  onActivateLocalDashboard,
}: ComputerStationProps) {
  const monitorRef = useRef<React.ElementRef<"mesh">>(null);
  const usersKey = users.map((user) => `${user.id}:${user.displayName}:${user.presence}:${user.isHost ? "host" : "member"}:${user.isTestUser ? "sim" : "real"}`).join("|");
  const dashboardCanvas = useMemo(() => drawDashboardCanvas({
    countdownDisplay,
    roundNumber,
    users,
    ownerId,
    stationLabel: station.label,
    assignedUser,
  }), [assignedUser, countdownDisplay, ownerId, roundNumber, station.label, users, usersKey]);

  useRegisterInteractable(useMemo(() => ({
    id: `${station.id}-dashboard-monitor`,
    label: isLocalStation ? "Return to dashboard" : `${station.label} dashboard`,
    objectRef: monitorRef,
    modes: ["clickable" as const],
    enabled: isLocalStation,
    onActivate: () => {
      onActivateLocalDashboard?.();
    },
  }), [isLocalStation, onActivateLocalDashboard, station.id, station.label]));

  return (
    <group position={station.position} rotation={station.rotation}>
      <Box position={[0, 0.72, 0]} args={[1.7, 0.14, 0.78]} color="#18243a" />

      <Box position={[-0.72, 0.36, -0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />
      <Box position={[0.72, 0.36, -0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />
      <Box position={[-0.72, 0.36, 0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />
      <Box position={[0.72, 0.36, 0.28]} args={[0.1, 0.72, 0.1]} color="#10182a" />

      <Box position={[0, 0.82, 0.05]} args={[0.72, 0.035, 0.22]} color="#05070c" />

      <Box position={[0, 1.02, -0.44]} args={[0.16, 0.34, 0.12]} color="#07111f" />
      <Box position={[0, 1.32, -0.34]} args={[1.05, 0.62, 0.12]} color="#07111f" />
      <Box position={[0, 1.32, -0.275]} args={[0.88, 0.46, 0.025]} color={phaseVisuals.monitorGlow} emissive={phaseVisuals.monitorGlow} />
      <mesh ref={monitorRef} position={[0, 1.32, -0.245]}>
        <planeGeometry args={[0.88, 0.46]} />
        <meshBasicMaterial args={[{ side: DOUBLE_SIDE, toneMapped: false }]}>
          <canvasTexture
            key={`station-dashboard-${station.id}-${countdownDisplay.phase}-${countdownDisplay.timerText}-${roundNumber}-${usersKey}`}
            attach="map"
            args={[dashboardCanvas]}
          />
        </meshBasicMaterial>
      </mesh>

      <Box position={[0, 0.45, 0.7]} args={[0.72, 0.18, 0.62]} color="#2b3448" />
      <Box position={[0, 0.95, 0.98]} args={[0.72, 0.85, 0.14]} color="#2b3448" />
    </group>
  );
}
