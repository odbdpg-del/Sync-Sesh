import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import type { LocalProfile } from "../../types/session";
import { buildDiscordLocalProfile, type DiscordGuildMemberLike, type DiscordUserLike } from "./user";
import { buildAvatarSeed, getLocalProfile, persistLocalProfile } from "../session/localProfile";

export interface EmbeddedAppState {
  enabled: boolean;
  sdk?: DiscordSDK;
  channelId?: string;
  guildId?: string;
  instanceId?: string;
  buildId: string;
  attemptId?: string;
  localProfile?: LocalProfile;
  identitySource?: "discord" | "local";
  authError?: string;
  authStage?: DiscordAuthStage;
  startupError?: string;
  startupStage?: "disabled" | "sdk_init" | "sdk_ready" | "auth" | "ready";
  cleanup?: () => void;
}

export type DiscordAuthStage = "idle" | "authorizing" | "exchanging_token" | "authenticating" | "subscribing" | "ready";

interface DiscordAuthProgress {
  attemptId: string;
  authStage: DiscordAuthStage;
  authError?: string;
}

interface DiscordAuthorizeRequest {
  client_id: string;
  response_type: "code";
  state: string;
  scope: Array<(typeof DISCORD_IDENTITY_SCOPES)[number]>;
  redirect_uri: string;
  prompt?: "none";
}

const DEFAULT_SYNC_PROXY_TARGET = "sync-sesh-sync.onrender.com";
const STATIC_ACTIVITY_URL_MAPPINGS = [
  { prefix: "/soundcloud-widget", target: "w.soundcloud.com" },
  { prefix: "/soundcloud-api", target: "api.soundcloud.com" },
  { prefix: "/soundcloud-api-widget", target: "api-widget.soundcloud.com" },
  { prefix: "/soundcloud-widget-assets", target: "widget.sndcdn.com" },
  { prefix: "/soundcloud-style", target: "style.sndcdn.com" },
  { prefix: "/soundcloud-va", target: "va.sndcdn.com" },
  { prefix: "/soundcloud-wis", target: "wis.sndcdn.com" },
  { prefix: "/soundcloud-w1", target: "w1.sndcdn.com" },
  { prefix: "/soundcloud-i1", target: "i1.sndcdn.com" },
  { prefix: "/soundcloud-i2", target: "i2.sndcdn.com" },
  { prefix: "/soundcloud-i3", target: "i3.sndcdn.com" },
  { prefix: "/soundcloud-i4", target: "i4.sndcdn.com" },
  { prefix: "/soundcloud-dwt", target: "dwt.soundcloud.com" },
] as const;

let hasPatchedActivityUrlMappings = false;

function isDiscordProxyHost() {
  return window.location.host.includes("discordsays.com") || window.location.host.includes("discordsez.com");
}

function resolveSyncProxyTarget() {
  const configuredUrl = import.meta.env.VITE_SYNC_SERVER_URL;

  if (configuredUrl && configuredUrl !== "auto") {
    try {
      const parsed = new URL(configuredUrl);
      const isLocalTarget = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      if (!isLocalTarget) {
        return parsed.hostname;
      }
    } catch {
      // Fall back to the known hosted sync service target.
    }
  }

  return DEFAULT_SYNC_PROXY_TARGET;
}

function patchActivityUrlMappings() {
  if (hasPatchedActivityUrlMappings) {
    return;
  }

  patchUrlMappings([
    { prefix: "/sync", target: resolveSyncProxyTarget() },
    { prefix: "/api", target: resolveSyncProxyTarget() },
    ...STATIC_ACTIVITY_URL_MAPPINGS,
  ]);
  hasPatchedActivityUrlMappings = true;
}

function resolveDiscordAuthEndpoint() {
  const configuredUrl = import.meta.env.VITE_SYNC_SERVER_URL;

  if (!configuredUrl || configuredUrl === "auto" || isDiscordProxyHost()) {
    return "/api/discord/token";
  }

  try {
    const parsed = new URL(configuredUrl);
    const isLocalTarget = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isRemotePage = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

    if (isLocalTarget && isRemotePage) {
      return "/api/discord/token";
    }

    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    parsed.pathname = "/api/discord/token";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "/api/discord/token";
  }
}

function resolveDiscordRedirectUri() {
  return import.meta.env.VITE_DISCORD_REDIRECT_URI ?? "https://127.0.0.1";
}

const DISCORD_IDENTITY_SCOPES = ["identify", "guilds.members.read"] as const;

interface DiscordTokenExchangeResponse {
  access_token: string;
}

interface InitializeEmbeddedAppOptions {
  onProfileUpdate?: (localProfile: LocalProfile) => void;
  authPrompt?: "none" | "interactive";
  attemptId?: string;
  onAuthProgress?: (progress: DiscordAuthProgress) => void;
  fallbackLocalProfile?: LocalProfile;
}

const FRONTEND_BUILD_ID = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "test-build";
const DISCORD_AUTHORIZE_TIMEOUT_MS = 45_000;

export function createDiscordAuthAttemptId(now = Date.now(), randomValue = Math.random()) {
  return `auth-${now.toString(36)}-${Math.floor(randomValue * 0xffffff)
    .toString(36)
    .padStart(4, "0")}`;
}

export function shouldApplyDiscordAuthAttemptResult(activeAttemptId: string | undefined, incomingAttemptId: string) {
  return !activeAttemptId || activeAttemptId === incomingAttemptId;
}

export function extractDiscordAuthorizationCode(
  authorizeResult: unknown,
): { code?: string; debugSummary: string } {
  if (!authorizeResult || typeof authorizeResult !== "object") {
    return {
      debugSummary: `unexpected authorize result type: ${typeof authorizeResult}`,
    };
  }

  const candidate = "code" in authorizeResult ? authorizeResult.code : undefined;
  const code = typeof candidate === "string" ? candidate.trim() : "";
  const keys = Object.keys(authorizeResult);

  return {
    code: code || undefined,
    debugSummary: `authorize result keys: ${keys.length > 0 ? keys.join(", ") : "none"}`,
  };
}

async function requestDiscordAuthorization(
  sdk: DiscordSDK,
  authorizeOptions: DiscordAuthorizeRequest,
  attemptId: string,
): Promise<string> {
  const authorizeResult = await Promise.race([
    sdk.commands.authorize(authorizeOptions),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Discord authorize timed out before returning a fresh authorization code."));
      }, DISCORD_AUTHORIZE_TIMEOUT_MS);
    }),
  ]);
  const { code, debugSummary } = extractDiscordAuthorizationCode(authorizeResult);

  if (!code) {
    console.warn("Discord authorize returned without a usable code.", {
      attemptId,
      debugSummary,
      authorizeResult,
    });
    throw new Error("Discord authorize failed: no fresh authorization code returned.");
  }

  return code;
}

function buildProfileFromDiscordIdentity(user: DiscordUserLike, guildMember?: DiscordGuildMemberLike): LocalProfile {
  return buildDiscordLocalProfile(user, {
    guildMember,
    avatarSeedBuilder: buildAvatarSeed,
  });
}

async function exchangeDiscordAuthCode(code: string, attemptId: string): Promise<string> {
  const response = await fetch(resolveDiscordAuthEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, attemptId }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } & Partial<DiscordTokenExchangeResponse> | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error ?? "Discord token exchange failed.");
  }

  return payload.access_token;
}

async function fetchCurrentGuildMember(accessToken: string, guildId?: string): Promise<DiscordGuildMemberLike | undefined> {
  if (!guildId) {
    return undefined;
  }

  const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return undefined;
  }

  return (await response.json()) as DiscordGuildMemberLike;
}

async function fetchParticipantIdentity(sdk: DiscordSDK, userId: string): Promise<DiscordUserLike | undefined> {
  try {
    const { participants } = await sdk.commands.getInstanceConnectedParticipants();
    return participants.find((participant) => participant.id === userId);
  } catch {
    return undefined;
  }
}

async function resolveDiscordIdentity(
  sdk: DiscordSDK,
  clientId: string,
  onProfileUpdate?: (localProfile: LocalProfile) => void,
  authPrompt: "none" | "interactive" = "none",
  attemptId = createDiscordAuthAttemptId(),
  onAuthProgress?: (progress: DiscordAuthProgress) => void,
): Promise<{ localProfile: LocalProfile; cleanup: () => void }> {
  const emitAuthProgress = (authStage: DiscordAuthStage, authError?: string) => {
    onAuthProgress?.({
      attemptId,
      authStage,
      authError,
    });
  };

  const authorizeOptions = {
    client_id: clientId,
    response_type: "code" as const,
    state: `${Date.now()}`,
    scope: [...DISCORD_IDENTITY_SCOPES],
    redirect_uri: resolveDiscordRedirectUri(),
    ...(authPrompt === "none" ? { prompt: "none" as const } : {}),
  };
  let code: string;

  emitAuthProgress("authorizing");

  try {
    code = await requestDiscordAuthorization(sdk, authorizeOptions, attemptId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord authorize request failed.";
    const normalizedMessage = message.startsWith("Discord authorize failed:") ? message : `Discord authorize failed: ${message}`;
    emitAuthProgress("authorizing", normalizedMessage);
    throw new Error(normalizedMessage);
  }

  let accessToken: string;

  emitAuthProgress("exchanging_token");

  try {
    accessToken = await exchangeDiscordAuthCode(code, attemptId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord token exchange failed.";
    emitAuthProgress("exchanging_token", `Discord token exchange failed: ${message}`);
    throw new Error(`Discord token exchange failed: ${message}`);
  }

  let auth: Awaited<ReturnType<typeof sdk.commands.authenticate>>;

  emitAuthProgress("authenticating");

  try {
    auth = await sdk.commands.authenticate({
      access_token: accessToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord authenticate failed.";
    emitAuthProgress("authenticating", `Discord authenticate failed: ${message}`);
    throw new Error(`Discord authenticate failed: ${message}`);
  }

  let currentUser: DiscordUserLike = auth.user;
  let currentGuildMember = await fetchCurrentGuildMember(accessToken, sdk.guildId ?? undefined);
  const participantIdentity = await fetchParticipantIdentity(sdk, auth.user.id);

  if (participantIdentity) {
    currentUser = {
      ...auth.user,
      ...participantIdentity,
    };
  }

  emitAuthProgress("subscribing");

  const pushProfileUpdate = () => {
    const localProfile = buildProfileFromDiscordIdentity(currentUser, currentGuildMember);
    persistLocalProfile(localProfile);
    onProfileUpdate?.(localProfile);
    return localProfile;
  };

  const initialProfile = pushProfileUpdate();
  const unsubscribeHandlers: Array<() => void> = [];
  const handleCurrentUserUpdate = (user: DiscordUserLike) => {
    currentUser = user;
    pushProfileUpdate();
  };

  try {
    await sdk.subscribe("CURRENT_USER_UPDATE", handleCurrentUserUpdate);
    unsubscribeHandlers.push(() => {
      void sdk.unsubscribe("CURRENT_USER_UPDATE", handleCurrentUserUpdate);
    });
  } catch {
    // Keep the initial authenticated user profile.
  }

  if (sdk.guildId) {
    const handleCurrentGuildMemberUpdate = (member: DiscordGuildMemberLike) => {
      if (member.user_id !== currentUser.id) {
        return;
      }

      currentGuildMember = member;
      pushProfileUpdate();
    };

    try {
      await sdk.subscribe("CURRENT_GUILD_MEMBER_UPDATE", handleCurrentGuildMemberUpdate, { guild_id: sdk.guildId });
      unsubscribeHandlers.push(() => {
        void sdk.unsubscribe("CURRENT_GUILD_MEMBER_UPDATE", handleCurrentGuildMemberUpdate, { guild_id: sdk.guildId! });
      });
    } catch {
      // The user profile still works even if guild-member updates are unavailable.
    }
  }

  return {
    localProfile: initialProfile,
    cleanup: () => {
      for (const unsubscribe of unsubscribeHandlers) {
        unsubscribe();
      }
    },
  };
}

export async function retryDiscordIdentity(
  sdk: DiscordSDK,
  options: InitializeEmbeddedAppOptions = {},
): Promise<Pick<EmbeddedAppState, "buildId" | "attemptId" | "localProfile" | "identitySource" | "authStage" | "startupStage" | "startupError" | "authError" | "cleanup">> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const attemptId = options.attemptId ?? createDiscordAuthAttemptId();
  const fallbackLocalProfile = options.fallbackLocalProfile ?? getLocalProfile();

  if (!clientId) {
    return {
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile: fallbackLocalProfile,
      identitySource: "local",
      authStage: "idle",
      startupStage: "auth",
      startupError: "Discord client ID is missing.",
      authError: "Discord client ID is missing.",
    };
  }

  try {
    const { localProfile, cleanup } = await resolveDiscordIdentity(
      sdk,
      clientId,
      options.onProfileUpdate,
      options.authPrompt,
      attemptId,
      options.onAuthProgress,
    );
    return {
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile,
      identitySource: "discord",
      authStage: "ready",
      startupStage: "ready",
      startupError: undefined,
      authError: undefined,
      cleanup,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord identity setup failed.";
    console.error("Discord identity retry failed.", error);
    persistLocalProfile(fallbackLocalProfile);

    return {
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile: fallbackLocalProfile,
      identitySource: "local",
      authStage: "idle",
      startupStage: "auth",
      startupError: message,
      authError: message,
    };
  }
}

export async function initializeEmbeddedApp(options: InitializeEmbeddedAppOptions = {}): Promise<EmbeddedAppState> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const enabled = import.meta.env.VITE_ENABLE_DISCORD_SDK === "true";
  const fallbackLocalProfile = getLocalProfile();
  const attemptId = options.attemptId ?? createDiscordAuthAttemptId();

  if (!enabled || !clientId) {
    return {
      enabled: false,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile: fallbackLocalProfile,
      identitySource: "local",
      authStage: "idle",
      startupStage: "disabled",
      startupError: !enabled ? "Discord SDK is disabled by environment." : "Discord client ID is missing.",
    };
  }

  patchActivityUrlMappings();

  let sdk: DiscordSDK;

  try {
    sdk = new DiscordSDK(clientId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord SDK failed to initialize.";
    console.error("Discord SDK construction failed.", error);
    persistLocalProfile(fallbackLocalProfile);

    return {
      enabled: false,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile: fallbackLocalProfile,
      identitySource: "local",
      authStage: "idle",
      startupStage: "sdk_init",
      startupError: message,
    };
  }

  try {
    await sdk.ready();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord SDK failed to become ready.";
    console.error("Discord SDK ready() failed.", error);
    persistLocalProfile(fallbackLocalProfile);

    return {
      enabled: false,
      sdk,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      channelId: sdk.channelId ?? undefined,
      guildId: sdk.guildId ?? undefined,
      instanceId: sdk.instanceId ?? undefined,
      localProfile: fallbackLocalProfile,
      identitySource: "local",
      authStage: "idle",
      startupStage: "sdk_ready",
      startupError: message,
    };
  }

  try {
    const { localProfile, cleanup } = await resolveDiscordIdentity(
      sdk,
      clientId,
      options.onProfileUpdate,
      options.authPrompt,
      attemptId,
      options.onAuthProgress,
    );

    return {
      enabled: true,
      sdk,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      channelId: sdk.channelId ?? undefined,
      guildId: sdk.guildId ?? undefined,
      instanceId: sdk.instanceId ?? undefined,
      localProfile,
      identitySource: "discord",
      authStage: "ready",
      startupStage: "ready",
      cleanup,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord identity setup failed.";
    console.error("Discord identity setup failed.", error);
    persistLocalProfile(fallbackLocalProfile);

    return {
      enabled: true,
      sdk,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      channelId: sdk.channelId ?? undefined,
      guildId: sdk.guildId ?? undefined,
      instanceId: sdk.instanceId ?? undefined,
      localProfile: fallbackLocalProfile,
      identitySource: "local",
      authStage: "idle",
      startupStage: "auth",
      startupError: message,
      authError: message,
    };
  }
}
