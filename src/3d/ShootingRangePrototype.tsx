import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInteractionRegistry, useRegisterInteractable } from "./interactions";
import type { ShotEvent } from "./interactions";
import type { DisplaySurfaceConfig, ShootingRangeConfig, ShootingRangeLaneConfig, ShootingRangeTargetConfig } from "./levels";
import type { RangeScoreResult, RangeScoreSubmission } from "../types/session";
import { getCanvasFont } from "../lib/ui/typography";

type ChallengePhase = "ready" | "running" | "complete";

interface ChallengeStats {
  phase: ChallengePhase;
  startedAtMs: number | null;
  endsAtMs: number | null;
  remainingMs: number;
  shots: number;
  hits: number;
  misses: number;
  score: number;
}

interface ScoreboardRow {
  userId: string;
  displayName: string;
  isLocal: boolean;
  score: number;
  hits: number;
  misses: number;
  accuracy: number;
}

const CHALLENGE_DURATION_MS = 30_000;
const TARGET_FLASH_MS = 350;
const TARGET_RESET_MS = 700;
const DISPLAY_TICK_MS = 100;
const TARGET_ID_PREFIX = "prototype-target-";

function getInitialStats(): ChallengeStats {
  return {
    phase: "ready",
    startedAtMs: null,
    endsAtMs: null,
    remainingMs: CHALLENGE_DURATION_MS,
    shots: 0,
    hits: 0,
    misses: 0,
    score: 0,
  };
}

function getDisplayTime(remainingMs: number) {
  return (Math.max(0, remainingMs) / 1000).toFixed(1);
}

function getAccuracy(stats: ChallengeStats) {
  return stats.shots === 0 ? 0 : Math.round((stats.hits / stats.shots) * 100);
}

function getPhaseLabel(phase: ChallengePhase) {
  if (phase === "running") {
    return "LIVE";
  }

  if (phase === "complete") {
    return "DONE";
  }

  return "READY";
}

function getTargetIdFromActivationId(activationId: string) {
  return activationId.startsWith(TARGET_ID_PREFIX) ? activationId.slice(TARGET_ID_PREFIX.length) : activationId;
}

function formatDisplayName(displayName: string) {
  return displayName.length > 12 ? `${displayName.slice(0, 9)}...` : displayName;
}

function getScoreboardRows({
  levelId,
  localUserId,
  rangeScoreboard,
  roundNumber,
}: {
  levelId: string;
  localUserId: string;
  rangeScoreboard: RangeScoreResult[];
  roundNumber: number;
}) {
  return rangeScoreboard
    .filter((result) => result.levelId === levelId && result.roundNumber === roundNumber)
    .sort((firstResult, secondResult) => (
      secondResult.score - firstResult.score ||
      secondResult.accuracy - firstResult.accuracy ||
      firstResult.durationMs - secondResult.durationMs ||
      firstResult.completedAt.localeCompare(secondResult.completedAt)
    ))
    .slice(0, 5)
    .map((result): ScoreboardRow => ({
      userId: result.userId,
      displayName: result.userId === localUserId ? `${result.displayName} *` : result.displayName,
      isLocal: result.userId === localUserId,
      score: result.score,
      hits: result.hits,
      misses: result.misses,
      accuracy: result.accuracy,
    }));
}

function drawChallengeCanvas(stats: ChallengeStats, scoreboardRows: ScoreboardRow[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#08111e";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const accentColor = stats.phase === "complete" ? "#f8d36a" : stats.phase === "running" ? "#73ff4c" : "#57f3ff";

  context.strokeStyle = accentColor;
  context.lineWidth = 14;
  context.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  context.fillStyle = "rgba(115, 255, 76, 0.07)";
  for (let y = 62; y < canvas.height - 48; y += 28) {
    context.fillRect(52, y, canvas.width - 104, 2);
  }

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = accentColor;
  context.font = getCanvasFont("display", 800, 58);
  context.fillText(getPhaseLabel(stats.phase), 280, 92);

  context.fillStyle = "#effcff";
  context.font = getCanvasFont("mono", 800, 72);
  context.fillText(stats.phase === "ready" ? "FIRE TO START" : getDisplayTime(stats.remainingMs), 280, 216);

  const metricY = 376;
  const metrics = [
    ["SCORE", String(stats.score)],
    ["HITS", String(stats.hits)],
    ["MISS", String(stats.misses)],
    ["ACC", `${getAccuracy(stats)}%`],
  ];

  metrics.forEach(([label, value], index) => {
    const x = 90 + index * 125;

    context.fillStyle = "#8ba0c7";
    context.font = getCanvasFont("ui", 700, 22);
    context.fillText(label, x, metricY - 42);

    context.fillStyle = "#dce8ff";
    context.font = getCanvasFont("display", 800, 38);
    context.fillText(value, x, metricY + 16);
  });

  context.textAlign = "left";
  context.fillStyle = "#57f3ff";
  context.font = getCanvasFont("display", 800, 30);
  context.fillText("SCOREBOARD", 590, 92);

  context.fillStyle = "#8ba0c7";
  context.font = getCanvasFont("ui", 700, 20);
  context.fillText("PILOT", 590, 134);
  context.fillText("PTS", 795, 134);
  context.fillText("H/M", 865, 134);
  context.fillText("ACC", 940, 134);

  if (scoreboardRows.length === 0) {
    context.fillStyle = "#dce8ff";
    context.font = getCanvasFont("ui", 700, 28);
    context.fillText("NO FINISHES YET", 590, 214);
  }

  scoreboardRows.forEach((row, index) => {
    const y = 176 + index * 52;

    context.fillStyle = row.isLocal ? "rgba(87, 243, 255, 0.14)" : "rgba(220, 232, 255, 0.04)";
    context.fillRect(578, y - 25, 390, 38);

    context.fillStyle = "#effcff";
    context.font = getCanvasFont("display", 800, 22);
    context.fillText(`${index + 1}. ${formatDisplayName(row.displayName)}`, 590, y);

    context.textAlign = "right";
    context.fillText(String(row.score), 840, y);
    context.fillText(`${row.hits}/${row.misses}`, 918, y);
    context.fillText(`${row.accuracy}%`, 986, y);
    context.textAlign = "left";
  });

  return canvas;
}

function PrototypeScoreDisplay({
  stats,
  scoreDisplay,
  scoreboardRows,
}: {
  stats: ChallengeStats;
  scoreDisplay: DisplaySurfaceConfig;
  scoreboardRows: ScoreboardRow[];
}) {
  const scoreboardKey = scoreboardRows
    .map((row) => `${row.userId}:${row.score}:${row.hits}:${row.misses}:${row.accuracy}`)
    .join("|");
  const textureCanvas = useMemo(() => drawChallengeCanvas(stats, scoreboardRows), [
    stats.hits,
    stats.misses,
    stats.phase,
    stats.remainingMs,
    stats.score,
    stats.shots,
    scoreboardKey,
  ]);

  return (
    <group position={scoreDisplay.position} rotation={scoreDisplay.rotation}>
      <mesh position={[0, 0, -0.035]}>
        <boxGeometry args={[scoreDisplay.size.width + 0.13, scoreDisplay.size.height + 0.12, 0.07]} />
        <meshStandardMaterial args={[{ color: "#050b14", emissive: "#173f1b", roughness: 0.56, metalness: 0.1 }]} />
      </mesh>
      <mesh>
        <planeGeometry args={[scoreDisplay.size.width, scoreDisplay.size.height]} />
        <meshBasicMaterial args={[{ toneMapped: false }]}>
          <canvasTexture
            key={`prototype-score-${stats.phase}-${stats.remainingMs}-${stats.shots}-${stats.score}-${scoreboardKey}`}
            attach="map"
            args={[textureCanvas]}
          />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function PrototypeLane({ lane }: { lane: ShootingRangeLaneConfig }) {
  return (
    <group position={lane.position}>
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[lane.width, 0.03, lane.length]} />
        <meshStandardMaterial args={[{ color: "#0d1b2d", roughness: 0.84, metalness: 0.02 }]} />
      </mesh>
      <mesh position={[-lane.width / 2, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.04, lane.length]} />
        <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
      </mesh>
      <mesh position={[lane.width / 2, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.04, lane.length]} />
        <meshBasicMaterial args={[{ color: "#57f3ff" }]} />
      </mesh>
    </group>
  );
}

function PrototypeTarget({ target }: { target: ShootingRangeTargetConfig }) {
  const groupRef = useRef<React.ElementRef<"group">>(null);
  const [flashUntil, setFlashUntil] = useState(0);
  const [disabledUntil, setDisabledUntil] = useState(0);
  const isFlashing = flashUntil > Date.now();
  const isDisabled = disabledUntil > Date.now();
  const handleHit = useCallback(() => {
    const now = Date.now();
    setFlashUntil(now + TARGET_FLASH_MS);
    setDisabledUntil(now + TARGET_RESET_MS);
  }, []);

  useEffect(() => {
    const now = Date.now();
    const nextUpdateAt = [flashUntil, disabledUntil]
      .filter((deadline) => deadline > now)
      .sort((first, second) => first - second)[0] ?? 0;

    if (nextUpdateAt === 0) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      const nextNow = Date.now();

      if (flashUntil <= nextNow) {
        setFlashUntil(0);
      }

      if (disabledUntil <= nextNow) {
        setDisabledUntil(0);
      }
    }, Math.max(0, nextUpdateAt - now));

    return () => window.clearTimeout(timeout);
  }, [disabledUntil, flashUntil]);

  const registration = useMemo(() => ({
    id: `prototype-target-${target.id}`,
    label: target.label,
    objectRef: groupRef,
    modes: ["shootable" as const],
    enabled: !isDisabled,
    onActivate: handleHit,
  }), [handleHit, isDisabled, target.id, target.label]);

  useRegisterInteractable(registration);

  return (
    <group ref={groupRef} position={target.position} rotation={target.rotation} scale={isFlashing ? 1.08 : isDisabled ? 0.88 : 1}>
      <mesh position={[0, 0, -0.035]}>
        <boxGeometry args={[target.radius * 2.2, target.radius * 2.2, 0.07]} />
        <meshStandardMaterial args={[{ color: isDisabled ? "#101927" : "#09131f", roughness: 0.58, metalness: 0.08 }]} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[target.radius, 48]} />
        <meshBasicMaterial args={[{ color: isFlashing ? "#73ff4c" : isDisabled ? "#49606f" : "#f4f7ff" }]} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[target.radius * 0.52, target.radius * 0.76, 48]} />
        <meshBasicMaterial args={[{ color: isFlashing ? "#f8d36a" : isDisabled ? "#27425a" : "#57f3ff" }]} />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <circleGeometry args={[target.radius * 0.28, 32]} />
        <meshBasicMaterial args={[{ color: isFlashing ? "#ff8a5b" : isDisabled ? "#312848" : "#ff6e96" }]} />
      </mesh>
      <mesh position={[0, -target.radius - 0.2, -0.08]}>
        <boxGeometry args={[0.12, 0.34, 0.12]} />
        <meshStandardMaterial args={[{ color: "#13233b", roughness: 0.74, metalness: 0.04 }]} />
      </mesh>
    </group>
  );
}

export function ShootingRangePrototype({
  shootingRange,
  levelId,
  roundNumber,
  rangeScoreboard,
  localUserId,
  onSubmitRangeScore,
}: {
  shootingRange: ShootingRangeConfig;
  levelId: string;
  roundNumber: number;
  rangeScoreboard: RangeScoreResult[];
  localUserId: string;
  onSubmitRangeScore: (result: RangeScoreSubmission) => void;
}) {
  const { subscribeToShot } = useInteractionRegistry();
  const [stats, setStats] = useState<ChallengeStats>(() => getInitialStats());
  const submittedChallengeKeyRef = useRef<string | null>(null);
  const targetScoresById = useMemo(() => new Map(shootingRange.targets.map((target) => [target.id, target.points])), [shootingRange.targets]);
  const scoreboardRows = useMemo(() => getScoreboardRows({
    levelId,
    localUserId,
    rangeScoreboard,
    roundNumber,
  }), [levelId, localUserId, rangeScoreboard, roundNumber]);

  useEffect(() => {
    if (stats.phase !== "running" || !stats.endsAtMs) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setStats((currentStats) => {
        if (currentStats.phase !== "running" || !currentStats.endsAtMs) {
          return currentStats;
        }

        const remainingMs = Math.max(0, currentStats.endsAtMs - Date.now());

        if (remainingMs === 0) {
          return {
            ...currentStats,
            phase: "complete",
            remainingMs: 0,
          };
        }

        return {
          ...currentStats,
          remainingMs,
        };
      });
    }, DISPLAY_TICK_MS);

    return () => window.clearInterval(interval);
  }, [stats.endsAtMs, stats.phase]);

  useEffect(() => {
    if (stats.phase !== "complete" || stats.shots <= 0) {
      return;
    }

    const challengeKey = `${stats.startedAtMs}-${stats.shots}-${stats.hits}-${stats.misses}-${stats.score}`;

    if (submittedChallengeKeyRef.current === challengeKey) {
      return;
    }

    submittedChallengeKeyRef.current = challengeKey;
    onSubmitRangeScore({
      levelId,
      score: stats.score,
      shots: stats.shots,
      hits: stats.hits,
      misses: stats.misses,
      accuracy: getAccuracy(stats),
      durationMs: CHALLENGE_DURATION_MS,
    });
  }, [levelId, onSubmitRangeScore, stats]);

  useEffect(() => subscribeToShot((event: ShotEvent) => {
    setStats((currentStats) => {
      const now = Date.now();
      const hasExpired = currentStats.phase === "running" && Boolean(currentStats.endsAtMs && currentStats.endsAtMs <= now);

      if (hasExpired) {
        return {
          ...currentStats,
          phase: "complete",
          remainingMs: 0,
        };
      }

      const shouldStartChallenge = currentStats.phase === "ready" || currentStats.phase === "complete";
      const baseStats = shouldStartChallenge
        ? {
          ...getInitialStats(),
          phase: "running" as const,
          startedAtMs: now,
          endsAtMs: now + CHALLENGE_DURATION_MS,
          remainingMs: CHALLENGE_DURATION_MS,
        }
        : currentStats;
      const isHit = Boolean(event.activation);
      const targetId = event.activation ? getTargetIdFromActivationId(event.activation.id) : null;
      const targetScore = targetId ? targetScoresById.get(targetId) ?? 1 : 0;

      return {
        ...baseStats,
        shots: baseStats.shots + 1,
        hits: baseStats.hits + (isHit ? 1 : 0),
        misses: baseStats.misses + (isHit ? 0 : 1),
        score: baseStats.score + targetScore,
      };
    });
  }), [subscribeToShot, targetScoresById]);

  return (
    <group>
      {shootingRange.lanes.map((lane) => (
        <PrototypeLane key={lane.id} lane={lane} />
      ))}
      <PrototypeScoreDisplay stats={stats} scoreDisplay={shootingRange.scoreDisplay} scoreboardRows={scoreboardRows} />
      {shootingRange.targets.map((target) => (
        <PrototypeTarget key={target.id} target={target} />
      ))}
    </group>
  );
}
