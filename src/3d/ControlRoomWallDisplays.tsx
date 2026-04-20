import { useCallback, useMemo, useRef, useState } from "react";
import { useRegisterInteractable } from "./interactions";
import type { ControlRoomDisplayColorRole, ControlRoomDisplayConfig } from "./levels";
import type { CountdownDisplayState, RangeScoreResult, SessionUser } from "../types/session";

type SessionPanelMode = "summary" | "roster" | "status";

const FRONT_WALL_DISPLAY_Z = -5.72;
const FRONT_WALL_OVERLAY_DISPLAY_Z = -5.54;

interface ControlRoomWallDisplaysProps {
  countdownDisplay: CountdownDisplayState;
  users: SessionUser[];
  ownerId: string;
  rangeScoreboard: RangeScoreResult[];
  roundNumber: number;
  levelLabel?: string;
  areaLabel?: string;
  displays?: ControlRoomDisplayConfig[];
}

interface PanelProps {
  title: string;
  subtitle?: string;
  lines: string[];
  canvasWidth: number;
  canvasHeight: number;
  accent: string;
}

interface WallScreenProps {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  canvas: HTMLCanvasElement;
  canvasKey: string;
  frameColor: string;
  accentColor: string;
  glowColor?: string;
  groupRef?: React.RefObject<React.ElementRef<"group">>;
}

interface DisplayColors {
  frameColor: string;
  accentColor: string;
  glowColor: string;
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

function getReadyCount(users: SessionUser[]) {
  return users.filter((user) => user.presence === "ready").length;
}

function getActiveCount(users: SessionUser[]) {
  return users.filter((user) => user.presence !== "spectating").length;
}

function getSortedScoreboardRows(rangeScoreboard: RangeScoreResult[], roundNumber: number) {
  return [...rangeScoreboard]
    .filter((result) => result.roundNumber === roundNumber)
    .sort((firstResult, secondResult) => (
      secondResult.score - firstResult.score ||
      secondResult.accuracy - firstResult.accuracy ||
      firstResult.durationMs - secondResult.durationMs ||
      firstResult.completedAt.localeCompare(secondResult.completedAt)
    ))
    .slice(0, 3);
}

function drawPanelCanvas({ title, subtitle, lines, canvasWidth, canvasHeight, accent }: PanelProps) {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#08111e";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accent;
  context.lineWidth = 12;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  context.fillStyle = "rgba(87, 243, 255, 0.08)";
  for (let y = 56; y < canvas.height - 34; y += 28) {
    context.fillRect(46, y, canvas.width - 92, 2);
  }

  context.textAlign = "left";
  context.textBaseline = "middle";

  context.fillStyle = accent;
  context.font = "800 46px 'Courier New', monospace";
  context.fillText(title, 48, 68);

  if (subtitle) {
    context.fillStyle = "#8ba0c7";
    context.font = "700 24px 'Courier New', monospace";
    context.fillText(subtitle, 50, 112);
  }

  context.fillStyle = "#effcff";
  context.font = "700 25px 'Courier New', monospace";

  const startY = subtitle ? 154 : 118;
  lines.forEach((line, index) => {
    context.fillText(line, 50, startY + index * 42);
  });

  return canvas;
}

function drawTimerCanvas(countdownDisplay: CountdownDisplayState, levelLabel: string, areaLabel: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const accent = countdownDisplay.isUrgent ? "#f8d36a" : "#57f3ff";

  context.fillStyle = "#06101b";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accent;
  context.lineWidth = 12;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  context.fillStyle = "rgba(115, 255, 76, 0.06)";
  for (let y = 48; y < canvas.height - 28; y += 26) {
    context.fillRect(42, y, canvas.width - 84, 2);
  }

  context.textBaseline = "middle";

  context.textAlign = "left";
  context.fillStyle = accent;
  context.font = "800 44px 'Courier New', monospace";
  context.fillText(`${levelLabel} / ${areaLabel}`, 54, 68);
  context.fillStyle = "#8ba0c7";
  context.font = "700 22px 'Courier New', monospace";
  context.fillText(countdownDisplay.phase.toUpperCase(), 54, 110);

  context.textAlign = "center";
  context.fillStyle = "#effcff";
  context.font = "800 112px 'Courier New', monospace";
  context.fillText(countdownDisplay.timerText, canvas.width / 2, 146);

  context.fillStyle = "#dce8ff";
  context.font = "700 30px 'Courier New', monospace";
  context.fillText(countdownDisplay.headline, canvas.width / 2, 208);

  context.textAlign = "right";
  context.fillStyle = "#8ba0c7";
  context.font = "700 22px 'Courier New', monospace";
  context.fillText(countdownDisplay.subheadline, canvas.width - 54, 68);

  if (countdownDisplay.accentText) {
    context.fillStyle = accent;
    context.fillText(countdownDisplay.accentText, canvas.width - 54, 110);
  }

  return canvas;
}

function drawMainDashboardCanvas({
  countdownDisplay,
  users,
  ownerId,
  roundNumber,
  levelLabel,
  areaLabel,
}: {
  countdownDisplay: CountdownDisplayState;
  users: SessionUser[];
  ownerId: string;
  roundNumber: number;
  levelLabel: string;
  areaLabel: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const readyCount = getReadyCount(users);
  const activeCount = getActiveCount(users);
  const hostLabel = users.some((user) => user.id === ownerId) ? "HOST ONLINE" : "HOST UNKNOWN";
  const accent = countdownDisplay.isUrgent ? "#f8d36a" : "#57f3ff";

  context.fillStyle = "#06101b";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accent;
  context.lineWidth = 18;
  context.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  context.fillStyle = "rgba(87, 243, 255, 0.08)";
  for (let y = 92; y < canvas.height - 54; y += 36) {
    context.fillRect(72, y, canvas.width - 144, 3);
  }

  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = accent;
  context.font = "800 72px 'Courier New', monospace";
  context.fillText("SYNC SESH DASHBOARD", 88, 112);

  context.fillStyle = "#8ba0c7";
  context.font = "700 34px 'Courier New', monospace";
  context.fillText(`${levelLabel.toUpperCase()} / ${areaLabel.toUpperCase()} / ${hostLabel}`, 92, 178);

  context.textAlign = "center";
  context.fillStyle = "#effcff";
  context.font = "800 142px 'Courier New', monospace";
  context.fillText(countdownDisplay.timerText, canvas.width / 2, 330);

  context.fillStyle = "#dce8ff";
  context.font = "700 44px 'Courier New', monospace";
  context.fillText(countdownDisplay.headline, canvas.width / 2, 444);

  const metrics = [
    ["ROUND", String(roundNumber)],
    ["PHASE", countdownDisplay.phase.toUpperCase()],
    ["READY", String(readyCount)],
    ["ACTIVE", String(activeCount)],
  ];

  metrics.forEach(([label, value], index) => {
    const x = 210 + index * 370;

    context.fillStyle = "rgba(220, 232, 255, 0.06)";
    context.fillRect(x - 128, 540, 256, 108);

    context.fillStyle = "#8ba0c7";
    context.font = "700 30px 'Courier New', monospace";
    context.fillText(label, x, 574);

    context.fillStyle = index === 1 ? accent : "#effcff";
    context.font = "800 46px 'Courier New', monospace";
    context.fillText(value, x, 622);
  });

  return canvas;
}

function WallScreen({
  position,
  rotation,
  size,
  canvas,
  canvasKey,
  frameColor,
  accentColor,
  glowColor = accentColor,
  groupRef,
}: WallScreenProps) {
  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[size[0] + 0.18, size[1] + 0.16, 0.08]} />
        <meshStandardMaterial args={[{ color: frameColor, emissive: glowColor, roughness: 0.54, metalness: 0.08 }]} />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial args={[{ toneMapped: false }]}>
          <canvasTexture key={canvasKey} attach="map" args={[canvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[size[0] * 0.82, size[1] * 0.08, 0.03]} />
        <meshBasicMaterial args={[{ color: accentColor }]} />
      </mesh>
    </group>
  );
}

function MiniDisplay({
  position,
  rotation,
  canvas,
  canvasKey,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  canvas: HTMLCanvasElement;
  canvasKey: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.18, 0.38, 0.06]} />
        <meshStandardMaterial args={[{ color: "#08111e", emissive: "#13263a", roughness: 0.56, metalness: 0.05 }]} />
      </mesh>
      <mesh>
        <planeGeometry args={[1.06, 0.28]} />
        <meshBasicMaterial args={[{ toneMapped: false }]}>
          <canvasTexture key={canvasKey} attach="map" args={[canvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function getDisplayColors(colorRole: ControlRoomDisplayColorRole, isUrgent: boolean): DisplayColors {
  if (colorRole === "amber-alert") {
    const accent = isUrgent ? "#f8d36a" : "#dca83a";

    return {
      frameColor: "#11101a",
      accentColor: accent,
      glowColor: accent,
    };
  }

  if (colorRole === "green-status") {
    return {
      frameColor: "#071512",
      accentColor: "#73ff4c",
      glowColor: "#2fd65f",
    };
  }

  if (colorRole === "cyan-data") {
    return {
      frameColor: "#06111e",
      accentColor: "#57f3ff",
      glowColor: "#57f3ff",
    };
  }

  return {
    frameColor: "#06101b",
    accentColor: isUrgent ? "#f8d36a" : "#57f3ff",
    glowColor: isUrgent ? "#f8d36a" : "#57f3ff",
  };
}

function toMutableVec3(value: readonly [number, number, number]): [number, number, number] {
  return [value[0], value[1], value[2]];
}

export function ControlRoomWallDisplays({
  countdownDisplay,
  users,
  ownerId,
  rangeScoreboard,
  roundNumber,
  levelLabel = "Level 1",
  areaLabel = "Control Room",
  displays,
}: ControlRoomWallDisplaysProps) {
  const sessionPanelRef = useRef<React.ElementRef<"group">>(null);
  const [sessionPanelMode, setSessionPanelMode] = useState<SessionPanelMode>("summary");
  const readyCount = getReadyCount(users);
  const activeCount = getActiveCount(users);
  const hostLabel = users.some((user) => user.id === ownerId) ? "HOST ONLINE" : "HOST UNKNOWN";
  const scoreboardRows = useMemo(() => getSortedScoreboardRows(rangeScoreboard, roundNumber), [rangeScoreboard, roundNumber]);
  const configuredDisplays = useMemo(() => [...(displays ?? [])].sort((firstDisplay, secondDisplay) => (
    (firstDisplay.priority ?? 0) - (secondDisplay.priority ?? 0) ||
    firstDisplay.id.localeCompare(secondDisplay.id)
  )), [displays]);
  const cycleSessionPanelMode = useCallback(() => {
    setSessionPanelMode((currentMode) => {
      if (currentMode === "summary") {
        return "roster";
      }

      if (currentMode === "roster") {
        return "status";
      }

      return "summary";
    });
  }, []);

  useRegisterInteractable(useMemo(() => ({
    id: "control-room-session-panel",
    label: "SESSION PANEL",
    objectRef: sessionPanelRef,
    modes: ["clickable" as const],
    onActivate: cycleSessionPanelMode,
  }), [cycleSessionPanelMode]));

  const mainDashboardCanvas = useMemo(() => drawMainDashboardCanvas({
    countdownDisplay,
    users,
    ownerId,
    roundNumber,
    levelLabel,
    areaLabel,
  }), [areaLabel, countdownDisplay, levelLabel, ownerId, roundNumber, users]);

  const sessionCanvas = useMemo(() => {
    if (sessionPanelMode === "roster") {
      const rosterLines = users.length === 0
        ? [
            "NO PARTICIPANTS",
            "WAITING FOR USERS",
            hostLabel,
          ]
        : users.slice(0, 4).map((user, index) => {
            const isHost = user.id === ownerId;
            const name = truncateLabel(user.displayName, 14);
            const role = formatUserStatus(user, isHost);

            return `${String(index + 1).padStart(2, "0")} ${name}  ${role}`;
          }).concat(users.length > 4 ? [`+${users.length - 4} MORE`] : []);

      return drawPanelCanvas({
        title: "SESSION PANEL",
        subtitle: `${levelLabel} / ${areaLabel} / ROSTER`,
        lines: rosterLines,
        canvasWidth: 1024,
        canvasHeight: 512,
        accent: "#f8d36a",
      });
    }

    if (sessionPanelMode === "status") {
      return drawPanelCanvas({
        title: "SESSION PANEL",
        subtitle: `${levelLabel} / ${areaLabel} / STATUS`,
        lines: [
          "CLICK TO CYCLE",
          "LOCAL ONLY",
          "NO SYNC EVENTS",
          countdownDisplay.isUrgent ? "URGENCY HIGH" : "STABLE READOUT",
        ],
        canvasWidth: 1024,
        canvasHeight: 512,
        accent: countdownDisplay.isUrgent ? "#f8d36a" : "#8ba0c7",
      });
    }

    return drawPanelCanvas({
      title: "SESSION PANEL",
      subtitle: `${levelLabel} / ${areaLabel} / SUMMARY`,
      lines: [
        `ROUND  ${String(roundNumber).padStart(2, "0")}`,
        `READY  ${String(readyCount).padStart(2, "0")}`,
        `ACTIVE ${String(activeCount).padStart(2, "0")}`,
        hostLabel,
      ],
      canvasWidth: 1024,
      canvasHeight: 512,
      accent: "#57f3ff",
    });
  }, [activeCount, areaLabel, countdownDisplay.isUrgent, hostLabel, levelLabel, ownerId, readyCount, roundNumber, sessionPanelMode, users]);

  const participantCanvas = useMemo(() => {
    const participantLines = users.length === 0
      ? [
          "NO PARTICIPANTS",
          "WAITING FOR USERS",
          hostLabel,
        ]
      : users.slice(0, 4).map((user, index) => {
          const isHost = user.id === ownerId;
          const name = truncateLabel(user.displayName, 14);
          const role = formatUserStatus(user, isHost);

          return `${String(index + 1).padStart(2, "0")} ${name}  ${role}`;
        }).concat(users.length > 4 ? [`+${users.length - 4} MORE`] : []);

    return drawPanelCanvas({
      title: "PARTICIPANTS",
      subtitle: hostLabel,
      lines: participantLines,
      canvasWidth: 1024,
      canvasHeight: 512,
      accent: "#f8d36a",
    });
  }, [hostLabel, ownerId, users]);

  const timerCanvas = useMemo(() => drawTimerCanvas(countdownDisplay, levelLabel, areaLabel), [
    areaLabel,
    countdownDisplay,
    levelLabel,
  ]);

  const bankSummaryCanvas = useMemo(() => {
    const topRows = scoreboardRows.length === 0
      ? [
          "NO FINISHES YET",
          "RANGE SUMMARY READY",
          "CONTROL ROOM ONLINE",
        ]
      : scoreboardRows.map((row, index) => {
          const isHost = row.userId === ownerId;
          const pilotLabel = truncateLabel(`${index + 1}. ${row.displayName}`, 14);

          return `${pilotLabel}${isHost ? " / HOST" : ""}`;
        });

    return drawPanelCanvas({
      title: "RANGE BANK",
      subtitle: "CURRENT ROUND",
      lines: topRows,
      canvasWidth: 1024,
      canvasHeight: 384,
      accent: "#73ff4c",
    });
  }, [ownerId, scoreboardRows]);

  const areaHintCanvas = useMemo(() => drawPanelCanvas({
    title: "AREA NOTE",
    subtitle: `${levelLabel} / ${areaLabel}`,
    lines: [
      "WALL DISPLAYS ONLY",
      "OPENINGS COME LATER",
      "TAB / EXIT REMAIN",
    ],
    canvasWidth: 1024,
    canvasHeight: 384,
    accent: "#57f3ff",
  }), [areaLabel, levelLabel]);

  const localStatusCanvas = useMemo(() => drawPanelCanvas({
    title: "LOCAL STATUS",
    subtitle: countdownDisplay.phase.toUpperCase(),
    lines: [
      countdownDisplay.isUrgent ? "URGENCY HIGH" : "STABLE READOUT",
      countdownDisplay.accentText ?? "VISUAL ONLY",
      "NO NEW SYNC EVENTS",
    ],
    canvasWidth: 1024,
    canvasHeight: 384,
    accent: countdownDisplay.isUrgent ? "#f8d36a" : "#8ba0c7",
  }), [countdownDisplay.accentText, countdownDisplay.isUrgent, countdownDisplay.phase]);

  const configuredDisplayCanvasById = useMemo(() => {
    const canvasById = new Map<string, HTMLCanvasElement>();

    configuredDisplays.forEach((display) => {
      if (display.role === "main-dashboard") {
        canvasById.set(display.id, mainDashboardCanvas);
        return;
      }

      if (display.role === "timer-ribbon") {
        canvasById.set(display.id, timerCanvas);
        return;
      }

      if (display.role === "session-status") {
        canvasById.set(display.id, sessionCanvas);
        return;
      }

      if (display.role === "participants") {
        canvasById.set(display.id, participantCanvas);
        return;
      }

      if (display.role === "range-scoreboard") {
        canvasById.set(display.id, bankSummaryCanvas);
        return;
      }

      if (display.role === "system-status") {
        canvasById.set(display.id, localStatusCanvas);
        return;
      }

      if (display.role === "music-status") {
        canvasById.set(display.id, drawPanelCanvas({
          title: "MUSIC STATUS",
          subtitle: "SOUNDCLOUD / SHUFFLE RADIO",
          lines: [
            "JUKEBOX ONLINE",
            "ROOM AUDIO LINKED",
            countdownDisplay.phase.toUpperCase(),
          ],
          canvasWidth: 1024,
          canvasHeight: 512,
          accent: "#57f3ff",
        }));
        return;
      }

      canvasById.set(display.id, drawPanelCanvas({
        title: truncateLabel(display.label.toUpperCase(), 20),
        subtitle: `${levelLabel} / ${areaLabel}`,
        lines: [
          `DISPLAY ${truncateLabel(display.id.toUpperCase(), 18)}`,
          `ROUND ${String(roundNumber).padStart(2, "0")}`,
          `${countdownDisplay.phase.toUpperCase()} / LOCAL`,
        ],
        canvasWidth: 1024,
        canvasHeight: 384,
        accent: display.colorRole === "green-status" ? "#73ff4c" : "#57f3ff",
      }));
    });

    return canvasById;
  }, [
    areaLabel,
    bankSummaryCanvas,
    configuredDisplays,
    countdownDisplay.phase,
    levelLabel,
    localStatusCanvas,
    mainDashboardCanvas,
    participantCanvas,
    roundNumber,
    sessionCanvas,
    timerCanvas,
  ]);

  if (configuredDisplays.length > 0) {
    return (
      <group>
        {configuredDisplays.map((display) => {
          const colors = getDisplayColors(display.colorRole, countdownDisplay.isUrgent);
          const canvas = configuredDisplayCanvasById.get(display.id) ?? areaHintCanvas;

          return (
            <WallScreen
              key={display.id}
              position={toMutableVec3(display.position)}
              rotation={toMutableVec3(display.rotation)}
              size={[display.size.width, display.size.height]}
              canvas={canvas}
              canvasKey={`control-room-config-${display.id}-${display.role}-${sessionPanelMode}-${countdownDisplay.phase}-${countdownDisplay.timerText}-${roundNumber}-${users.length}`}
              frameColor={colors.frameColor}
              accentColor={colors.accentColor}
              glowColor={colors.glowColor}
              groupRef={display.role === "session-status" ? sessionPanelRef : undefined}
            />
          );
        })}
      </group>
    );
  }

  return (
    <group>
      <WallScreen
        position={[0, 2.08, FRONT_WALL_DISPLAY_Z]}
        rotation={[0, 0, 0]}
        size={[4.15, 1.58]}
        canvas={mainDashboardCanvas}
        canvasKey={`control-room-main-dashboard-${countdownDisplay.phase}-${countdownDisplay.timerText}-${roundNumber}-${users.length}`}
        frameColor="#06101b"
        accentColor={countdownDisplay.isUrgent ? "#f8d36a" : "#57f3ff"}
        glowColor={countdownDisplay.isUrgent ? "#f8d36a" : "#57f3ff"}
      />
      <WallScreen
        position={[-4.55, 2.84, FRONT_WALL_DISPLAY_Z]}
        rotation={[0, 0, 0]}
        size={[1.9, 0.84]}
        canvas={sessionCanvas}
        canvasKey={`control-room-session-${sessionPanelMode}-${roundNumber}-${readyCount}-${activeCount}-${users.length}`}
        frameColor="#07111f"
        accentColor="#57f3ff"
        groupRef={sessionPanelRef}
      />
      <WallScreen
        position={[4.55, 2.84, FRONT_WALL_DISPLAY_Z]}
        rotation={[0, 0, 0]}
        size={[1.9, 0.84]}
        canvas={participantCanvas}
        canvasKey={`control-room-participants-${users.length}-${ownerId}`}
        frameColor="#07111f"
        accentColor="#f8d36a"
      />
      <WallScreen
        position={[0, 3.42, FRONT_WALL_OVERLAY_DISPLAY_Z]}
        rotation={[0, 0, 0]}
        size={[4.72, 0.68]}
        canvas={timerCanvas}
        canvasKey={`control-room-timer-${countdownDisplay.phase}-${countdownDisplay.timerText}-${countdownDisplay.headline}`}
        frameColor="#06101b"
        accentColor={countdownDisplay.isUrgent ? "#f8d36a" : "#57f3ff"}
        glowColor={countdownDisplay.isUrgent ? "#f8d36a" : "#57f3ff"}
      />

      <group position={[-6.92, 2.3, 2.1]} rotation={[0, Math.PI / 2, 0]}>
        <MiniDisplay
          position={[0, 0.62, 0]}
          rotation={[0, 0, 0]}
          canvas={bankSummaryCanvas}
          canvasKey={`control-room-bank-summary-${scoreboardRows.map((row) => `${row.userId}-${row.score}-${row.hits}-${row.misses}`).join("|")}`}
        />
        <MiniDisplay
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          canvas={areaHintCanvas}
          canvasKey={`control-room-bank-area-${levelLabel}-${areaLabel}`}
        />
        <MiniDisplay
          position={[0, -0.62, 0]}
          rotation={[0, 0, 0]}
          canvas={localStatusCanvas}
          canvasKey={`control-room-bank-status-${countdownDisplay.phase}-${countdownDisplay.isUrgent}-${countdownDisplay.accentText ?? "none"}`}
        />
      </group>
    </group>
  );
}
