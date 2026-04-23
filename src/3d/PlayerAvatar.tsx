import { useMemo } from "react";

export type PlayerAvatarSuitPreset = "sync" | "studio" | "range" | "neon";

export type PlayerAvatarMode = "local" | "remote" | "sim";

export type PlayerAvatarPresence = "idle" | "ready" | "spectating";

export type PlayerAvatarVector3 = readonly [number, number, number];

export interface PlayerAvatarIdentity {
  id: string;
  displayName: string;
  avatarSeed: string;
  isTestUser?: boolean;
}

export interface PlayerAvatarPose {
  position: PlayerAvatarVector3;
  yaw: number;
  levelId?: string;
  areaId?: string;
  updatedAt?: number;
}

export interface PlayerAvatarAppearance {
  bodyColor: string;
  accentColor: string;
  headColor: string;
  suitPreset: PlayerAvatarSuitPreset;
  showNameplate: boolean;
  scale: number;
}

export interface PlayerAvatarDefaultOptions {
  avatarSeed: string;
  mode?: PlayerAvatarMode;
  presence?: PlayerAvatarPresence;
  isHost?: boolean;
  isReady?: boolean;
  isTestUser?: boolean;
}

const BODY_PALETTES = {
  sync: ["#315c83", "#3f6f9f", "#336a7a", "#445d91", "#2f6f65", "#546280"],
  studio: ["#5d3f8f", "#704e9f", "#7b4f83", "#465f96", "#4d6b7d", "#675987"],
  range: ["#3f6a48", "#5f6f38", "#4f735f", "#726f3c", "#47645d", "#66734a"],
  neon: ["#234e76", "#5a3f86", "#27646c", "#694b70", "#396267", "#475897"],
} satisfies Record<PlayerAvatarSuitPreset, readonly string[]>;

const ACCENT_PALETTES = ["#57f3ff", "#75ffa8", "#ff8bd4", "#f8d36a", "#a5b4ff", "#ff9b70"];

const DOUBLE_SIDE = 2;
const DEFAULT_POSITION = [0, 0, 0] as const satisfies PlayerAvatarVector3;

export interface PlayerAvatarProps {
  identity: PlayerAvatarIdentity;
  appearance?: Partial<PlayerAvatarAppearance>;
  pose?: PlayerAvatarPose;
  position?: PlayerAvatarVector3;
  yaw?: number;
  mode?: PlayerAvatarMode;
  presence?: PlayerAvatarPresence;
  isHost?: boolean;
  isReady?: boolean;
  showNameplate?: boolean;
  nameplateText?: string;
}

function hashAvatarSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickFromSeed<T>(items: readonly T[], hash: number, offset = 0) {
  return items[(hash + offset) % items.length];
}

export function getPlayerAvatarInitials(identity: Pick<PlayerAvatarIdentity, "avatarSeed" | "displayName">) {
  const seedInitials = identity.avatarSeed.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();

  if (seedInitials.length >= 2) {
    return seedInitials;
  }

  const displayInitials = identity.displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return displayInitials || "??";
}

export function getDefaultPlayerAvatarAppearance({
  avatarSeed,
  mode = "remote",
  presence = "idle",
  isHost = false,
  isReady = false,
  isTestUser = false,
}: PlayerAvatarDefaultOptions): PlayerAvatarAppearance {
  const hash = hashAvatarSeed(avatarSeed || "player");
  const ready = isReady || presence === "ready";
  const preset: PlayerAvatarSuitPreset =
    isTestUser || mode === "sim" ? "neon" : pickFromSeed(["sync", "studio", "range"], hash, 3);
  const bodyColor = pickFromSeed(BODY_PALETTES[preset], hash);
  const seededAccent = pickFromSeed(ACCENT_PALETTES, hash, 7);
  const accentColor = isHost ? "#f8d36a" : isTestUser || mode === "sim" ? "#ff6bd6" : ready ? "#6eff9a" : seededAccent;
  const headColor = isHost ? "#ffe69a" : isTestUser || mode === "sim" ? "#ff9fe3" : ready ? "#aaffc3" : accentColor;

  return {
    bodyColor: mode === "local" ? "#1f8aa3" : bodyColor,
    accentColor,
    headColor,
    suitPreset: preset,
    showNameplate: mode !== "local",
    scale: 1,
  };
}

export function resolvePlayerAvatarAppearance(
  defaults: PlayerAvatarDefaultOptions,
  appearance?: Partial<PlayerAvatarAppearance>,
): PlayerAvatarAppearance {
  const defaultAppearance = getDefaultPlayerAvatarAppearance(defaults);
  const scale = appearance?.scale ?? defaultAppearance.scale;

  return {
    ...defaultAppearance,
    ...appearance,
    scale: Number.isFinite(scale) ? Math.min(1.2, Math.max(0.82, scale)) : defaultAppearance.scale,
  };
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function getModeLabel(mode: PlayerAvatarMode) {
  if (mode === "local") {
    return "YOU";
  }

  if (mode === "sim") {
    return "SIM";
  }

  return "FREE ROAM";
}

function getNameplateStatus({
  mode,
  presence,
  isHost,
  isReady,
  isTestUser,
}: {
  mode: PlayerAvatarMode;
  presence: PlayerAvatarPresence;
  isHost: boolean;
  isReady: boolean;
  isTestUser: boolean;
}) {
  const labels = [];

  if (isHost) {
    labels.push("HOST");
  }

  if (isTestUser && mode !== "sim") {
    labels.push("TEST");
  }

  labels.push(getModeLabel(mode));
  labels.push(isReady || presence === "ready" ? "READY" : presence.toUpperCase());

  return labels.join(" | ");
}

function createPlayerAvatarNameplateCanvas({
  identity,
  accentColor,
  mode,
  presence,
  isHost,
  isReady,
}: {
  identity: PlayerAvatarIdentity;
  accentColor: string;
  mode: PlayerAvatarMode;
  presence: PlayerAvatarPresence;
  isHost: boolean;
  isReady: boolean;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

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
  context.font = "700 32px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(getPlayerAvatarInitials(identity), 74, 70);

  context.textAlign = "left";
  context.fillStyle = "#f4f7ff";
  context.font = "700 40px Arial, sans-serif";
  context.fillText(truncateLabel(identity.displayName, 16), 140, 66);

  context.fillStyle = accentColor;
  context.font = "700 24px Arial, sans-serif";
  context.fillText(
    truncateLabel(
      getNameplateStatus({
        mode,
        presence,
        isHost,
        isReady,
        isTestUser: identity.isTestUser === true,
      }),
      30,
    ),
    140,
    122,
  );

  return canvas;
}

function AvatarMaterial({
  color,
  emissive = "#000000",
  opacity = 1,
}: {
  color: string;
  emissive?: string;
  opacity?: number;
}) {
  return (
    <meshStandardMaterial
      args={[{ color, emissive, roughness: 0.62, metalness: 0.04, transparent: opacity < 1, opacity }]}
    />
  );
}

export function PlayerAvatar({
  identity,
  appearance,
  pose,
  position,
  yaw,
  mode = "remote",
  presence = "idle",
  isHost = false,
  isReady = false,
  showNameplate,
  nameplateText,
}: PlayerAvatarProps) {
  const resolvedAppearance = useMemo(
    () =>
      resolvePlayerAvatarAppearance(
        {
          avatarSeed: identity.avatarSeed,
          mode,
          presence,
          isHost,
          isReady,
          isTestUser: identity.isTestUser,
        },
        appearance,
      ),
    [appearance, identity.avatarSeed, identity.isTestUser, isHost, isReady, mode, presence],
  );
  const shouldShowNameplate = showNameplate ?? resolvedAppearance.showNameplate;
  const labelCanvas = useMemo(
    () =>
      createPlayerAvatarNameplateCanvas({
        identity: nameplateText ? { ...identity, displayName: nameplateText } : identity,
        accentColor: resolvedAppearance.accentColor,
        mode,
        presence,
        isHost,
        isReady,
      }),
    [identity, isHost, isReady, mode, nameplateText, presence, resolvedAppearance.accentColor],
  );
  const textureKey = `${identity.id}-${identity.displayName}-${identity.avatarSeed}-${identity.isTestUser ? "test" : "real"}-${mode}-${presence}-${isHost}-${isReady}-${resolvedAppearance.accentColor}-${nameplateText ?? ""}`;
  const groupPosition = pose?.position ?? position ?? DEFAULT_POSITION;
  const groupYaw = pose?.yaw ?? yaw ?? 0;
  const ready = isReady || presence === "ready";
  const opacity = presence === "spectating" ? 0.58 : 1;
  const scale = resolvedAppearance.scale;
  const trimColor = resolvedAppearance.suitPreset === "range" ? "#202b3d" : "#111a2b";

  return (
    <group position={groupPosition} rotation={[0, groupYaw, 0]} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.46, 0.92, 0.34]} />
        <AvatarMaterial color={resolvedAppearance.bodyColor} opacity={opacity} />
      </mesh>

      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.25, 18, 14]} />
        <AvatarMaterial color={resolvedAppearance.headColor} emissive={ready ? "#12351d" : "#071520"} opacity={opacity} />
      </mesh>

      <mesh position={[-0.34, 0.88, -0.02]}>
        <boxGeometry args={[0.13, 0.62, 0.16]} />
        <AvatarMaterial color={trimColor} opacity={opacity} />
      </mesh>
      <mesh position={[0.34, 0.88, -0.02]}>
        <boxGeometry args={[0.13, 0.62, 0.16]} />
        <AvatarMaterial color={trimColor} opacity={opacity} />
      </mesh>

      <mesh position={[-0.15, 0.34, 0.02]}>
        <boxGeometry args={[0.15, 0.58, 0.16]} />
        <AvatarMaterial color="#202b3d" opacity={opacity} />
      </mesh>
      <mesh position={[0.15, 0.34, 0.02]}>
        <boxGeometry args={[0.15, 0.58, 0.16]} />
        <AvatarMaterial color="#202b3d" opacity={opacity} />
      </mesh>

      <mesh position={[-0.15, 0.08, -0.08]}>
        <boxGeometry args={[0.2, 0.12, 0.34]} />
        <AvatarMaterial color={resolvedAppearance.accentColor} emissive="#061721" opacity={opacity} />
      </mesh>
      <mesh position={[0.15, 0.08, -0.08]}>
        <boxGeometry args={[0.2, 0.12, 0.34]} />
        <AvatarMaterial color={resolvedAppearance.accentColor} emissive="#061721" opacity={opacity} />
      </mesh>

      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, ready ? 0.5 : 0.44, 32]} />
        <meshBasicMaterial args={[{ color: resolvedAppearance.accentColor, transparent: opacity < 1, opacity }]} />
      </mesh>

      {ready ? (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.58, 32]} />
          <meshBasicMaterial args={[{ color: "#f4f7ff", transparent: true, opacity: 0.7 }]} />
        </mesh>
      ) : null}

      <mesh position={[0, 0.1, -0.52]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <coneGeometry args={[0.14, 0.34, 3]} />
        <meshBasicMaterial args={[{ color: "#f4f7ff", transparent: opacity < 1, opacity }]} />
      </mesh>

      {isHost ? (
        <mesh position={[0, 1.74, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
          <AvatarMaterial color="#f8d36a" emissive="#3a2b08" opacity={opacity} />
        </mesh>
      ) : null}

      {identity.isTestUser || mode === "sim" ? (
        <mesh position={[0.32, 1.12, -0.02]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <AvatarMaterial color="#ff6bd6" emissive="#401432" opacity={opacity} />
        </mesh>
      ) : null}

      {shouldShowNameplate ? (
        <mesh position={[0, 2.04, 0]}>
          <planeGeometry args={[1.56, 0.6]} />
          <meshBasicMaterial args={[{ transparent: true, side: DOUBLE_SIDE, toneMapped: false }]}>
            <canvasTexture key={textureKey} attach="map" args={[labelCanvas]} />
          </meshBasicMaterial>
        </mesh>
      ) : null}
    </group>
  );
}
