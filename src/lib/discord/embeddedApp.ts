import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import type { DebugConsoleEventInput } from "../debug/debugConsole";
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
  identitySource?: EmbeddedIdentitySource;
  authError?: string;
  authStage?: DiscordAuthStage;
  startupError?: string;
  startupStage?: "disabled" | "sdk_init" | "sdk_ready" | "auth" | "ready";
  cleanup?: () => void;
}

export type EmbeddedIdentitySource = "authenticated_discord" | "participant_discord" | "local_fallback";

export type DiscordAuthStage = "idle" | "authorizing" | "exchanging_token" | "authenticating" | "subscribing" | "ready";

interface DiscordAuthProgress {
  attemptId: string;
  authStage: DiscordAuthStage;
  authError?: string;
}

type CleanDiscordAuthorizePrompt = "none" | "consent";
type DiscordAuthorizeMode = "silent" | "consent";

interface CleanDiscordAuthorizeRequest {
  client_id: string;
  response_type: "code";
  state: string;
  scope: Array<(typeof DISCORD_IDENTITY_SCOPES)[number]>;
  prompt: "none";
}

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

function resolveConfiguredSyncProxyTarget() {
  const configuredUrl = import.meta.env.VITE_SYNC_SERVER_URL;

  if (configuredUrl && configuredUrl !== "auto") {
    try {
      const parsed = new URL(configuredUrl);
      const isLocalTarget = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      if (!isLocalTarget) {
        return parsed.hostname;
      }
    } catch {
      return configuredUrl;
    }
  }

  return undefined;
}

export function ensureDiscordActivityUrlMappingsPatched() {
  if (hasPatchedActivityUrlMappings) {
    return;
  }

  const syncProxyTarget = resolveConfiguredSyncProxyTarget();

  patchUrlMappings([
    ...(syncProxyTarget
      ? [
          { prefix: "/ws", target: syncProxyTarget },
          { prefix: "/sync", target: syncProxyTarget },
          { prefix: "/api", target: syncProxyTarget },
        ]
      : []),
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

function getDiscordAuthConfigSummary() {
  return {
    enabled: import.meta.env.VITE_ENABLE_DISCORD_SDK === "true",
    hasClientId: Boolean(import.meta.env.VITE_DISCORD_CLIENT_ID),
    authEndpoint: resolveDiscordAuthEndpoint(),
    redirectUri: resolveDiscordRedirectUri(),
  };
}

export function getDiscordDebugConfigSnapshot() {
  const config = getDiscordAuthConfigSummary();

  return {
    isDiscordProxyHost: isDiscordProxyHost(),
    authEndpoint: config.authEndpoint,
    redirectUri: config.redirectUri,
    discordSdkEnabledByEnv: config.enabled,
    hasDiscordClientId: config.hasClientId,
  };
}

const DISCORD_IDENTITY_SCOPES = ["identify"] as const;

interface DiscordTokenExchangeResponse {
  access_token: string;
}

interface DiscordTokenExchangeErrorResponse {
  error?: string;
  attemptId?: string;
  buildId?: string;
  missing?: string[];
  discordError?: string;
  discordErrorDescription?: string;
}

interface InitializeEmbeddedAppOptions {
  onProfileUpdate?: (localProfile: LocalProfile, identitySource: EmbeddedIdentitySource) => void;
  authPrompt?: "none" | "interactive";
  attemptId?: string;
  onAuthProgress?: (progress: DiscordAuthProgress) => void;
  fallbackLocalProfile?: LocalProfile;
  onDebugEvent?: (event: DebugConsoleEventInput) => void;
}

const FRONTEND_BUILD_ID = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "test-build";
const DISCORD_SDK_READY_TIMEOUT_MS = 30_000;
const DISCORD_AUTHORIZE_TIMEOUT_MS = 45_000;
const DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS = 25_000;

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

function isDiscordAuthorizeFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.startsWith("Discord authorize failed:");
}

function summarizeAttemptId(attemptId: string) {
  return attemptId.slice(-8);
}

interface DiscordAuthorizeErrorContext {
  authMode: DiscordAuthorizeMode;
  attemptId: string;
  buildId: string;
  redirectUri: string;
  authEndpoint: string;
  hasClientId: boolean;
  isDiscordProxyHost: boolean;
  channelId?: string;
  guildId?: string;
  instanceId?: string;
}

const SAFE_AUTHORIZE_ERROR_KEYS = [
  "name",
  "code",
  "type",
  "status",
  "statusCode",
  "error",
  "errorCode",
  "error_code",
  "reason",
  "detail",
  "details",
] as const;

function trimAuthorizeDiagnosticValue(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= 180) {
    return compact;
  }

  return `${compact.slice(0, 177)}...`;
}

function formatAuthorizeDiagnosticValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = trimAuthorizeDiagnosticValue(value);
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function readNestedAuthorizeDiagnosticFields(source: Record<string, unknown>, prefix: string) {
  const diagnostics: string[] = [];

  for (const key of SAFE_AUTHORIZE_ERROR_KEYS) {
    const value = formatAuthorizeDiagnosticValue(source[key]);

    if (!value) {
      continue;
    }

    diagnostics.push(`${prefix}${key}=${value}`);
  }

  return diagnostics;
}

function collectSafeAuthorizeErrorFields(error: unknown) {
  if (!error || typeof error !== "object") {
    return [];
  }

  const record = error as Record<string, unknown>;
  const diagnostics = readNestedAuthorizeDiagnosticFields(record, "");

  for (const nestedKey of ["cause", "data"] as const) {
    const nestedValue = record[nestedKey];

    if (!nestedValue || typeof nestedValue !== "object") {
      continue;
    }

    diagnostics.push(...readNestedAuthorizeDiagnosticFields(nestedValue as Record<string, unknown>, `${nestedKey}.`));
  }

  return [...new Set(diagnostics)];
}

function buildAuthorizeContextParts(context: DiscordAuthorizeErrorContext) {
  return [
    `${context.authMode} auth`,
    `attempt ${summarizeAttemptId(context.attemptId)}`,
    `build ${context.buildId}`,
    `backend redirect ${context.redirectUri}`,
    context.isDiscordProxyHost ? "discord proxy host" : "direct host",
    context.hasClientId ? "client id present" : "client id missing",
    `auth endpoint ${context.authEndpoint}`,
    context.channelId ? `channel ${context.channelId}` : undefined,
    context.guildId ? `guild ${context.guildId}` : undefined,
    context.instanceId ? `instance ${context.instanceId}` : undefined,
  ].filter((part): part is string => Boolean(part));
}

function summarizeDiscordAuthorizeError(error: unknown, context: DiscordAuthorizeErrorContext) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Discord authorize request failed.";
  const safeMessage = trimAuthorizeDiagnosticValue(rawMessage) || "Discord authorize request failed.";
  const errorFields = collectSafeAuthorizeErrorFields(error);
  const contextParts = buildAuthorizeContextParts(context);
  const conciseHint =
    errorFields.find((field) => field.startsWith("code=") || field.startsWith("errorCode=") || field.startsWith("error_code=")) ??
    errorFields.find((field) => field.startsWith("status=") || field.startsWith("statusCode=")) ??
    errorFields.find((field) => field.startsWith("name="));
  const normalizedMessage = conciseHint
    ? `Discord authorize failed: ${safeMessage} [${conciseHint}]`
    : `Discord authorize failed: ${safeMessage}`;
  const detailParts = [normalizedMessage, ...contextParts];

  if (errorFields.length > 0) {
    detailParts.push(`sdk fields ${errorFields.join(", ")}`);
  } else {
    detailParts.push("SDK returned no additional safe error fields.");
  }

  return {
    normalizedMessage,
    debugDetail: detailParts.join(" | "),
  };
}

function emitDebugEvent(onDebugEvent: InitializeEmbeddedAppOptions["onDebugEvent"], event: DebugConsoleEventInput) {
  onDebugEvent?.(event);
}

async function waitForDiscordSdkReady(sdk: DiscordSDK) {
  return Promise.race([
    sdk.ready(),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`Discord SDK ready timed out after ${DISCORD_SDK_READY_TIMEOUT_MS}ms.`));
      }, DISCORD_SDK_READY_TIMEOUT_MS);
    }),
  ]);
}

export async function requestCleanDiscordAuthorization(
  sdk: DiscordSDK,
  options: {
    attemptId: string;
    clientId: string;
    prompt: CleanDiscordAuthorizePrompt;
    state?: string;
  },
): Promise<string> {
  const authorizeOptions: CleanDiscordAuthorizeRequest = {
    client_id: options.clientId,
    response_type: "code",
    state: options.state ?? `${Date.now()}`,
    scope: [...DISCORD_IDENTITY_SCOPES],
    prompt: options.prompt as "none",
  };
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
      attemptId: options.attemptId,
      debugSummary,
      authorizeResult,
    });
    throw new Error("Discord authorize failed: no fresh authorization code returned.");
  }

  return code;
}

function buildAuthorizeErrorContext(sdk: DiscordSDK, attemptId: string, authMode: DiscordAuthorizeMode, clientId: string): DiscordAuthorizeErrorContext {
  return {
    authMode,
    attemptId,
    buildId: FRONTEND_BUILD_ID,
    redirectUri: resolveDiscordRedirectUri(),
    authEndpoint: resolveDiscordAuthEndpoint(),
    hasClientId: Boolean(clientId),
    isDiscordProxyHost: isDiscordProxyHost(),
    channelId: sdk.channelId ?? undefined,
    guildId: sdk.guildId ?? undefined,
    instanceId: sdk.instanceId ?? undefined,
  };
}

async function requestDiscordAuthorizationAttempt(
  sdk: DiscordSDK,
  options: {
    authMode: DiscordAuthorizeMode;
    clientId: string;
    attemptId: string;
    emitAuthProgress: (authStage: DiscordAuthStage, authError?: string) => void;
    onDebugEvent?: InitializeEmbeddedAppOptions["onDebugEvent"];
    failureLevel: "warn" | "error";
  },
): Promise<string> {
  const authorizeErrorContext = buildAuthorizeErrorContext(sdk, options.attemptId, options.authMode, options.clientId);
  const prompt: CleanDiscordAuthorizePrompt = options.authMode === "silent" ? "none" : "consent";

  options.emitAuthProgress("authorizing");
  emitDebugEvent(options.onDebugEvent, {
    level: "info",
    category: "auth",
    label: `auth:${options.authMode}:start`,
    detail: buildAuthorizeContextParts(authorizeErrorContext).join(" | "),
  });

  try {
    const code = await requestCleanDiscordAuthorization(sdk, {
      attemptId: options.attemptId,
      clientId: options.clientId,
      prompt,
    });
    emitDebugEvent(options.onDebugEvent, {
      level: "info",
      category: "auth",
      label: `auth:${options.authMode}:success`,
      detail: `attempt ${summarizeAttemptId(options.attemptId)}`,
    });
    return code;
  } catch (error) {
    const { normalizedMessage, debugDetail } = summarizeDiscordAuthorizeError(error, authorizeErrorContext);
    options.emitAuthProgress("authorizing", normalizedMessage);
    emitDebugEvent(options.onDebugEvent, {
      level: options.failureLevel,
      category: "auth",
      label: `auth:${options.authMode}:failed`,
      detail: debugDetail,
    });
    throw new Error(normalizedMessage);
  }
}

async function requestDiscordAuthorizationCode(
  sdk: DiscordSDK,
  options: {
    clientId: string;
    attemptId: string;
    authPrompt?: "none" | "interactive";
    emitAuthProgress: (authStage: DiscordAuthStage, authError?: string) => void;
    onDebugEvent?: InitializeEmbeddedAppOptions["onDebugEvent"];
  },
): Promise<string> {
  if (options.authPrompt === "interactive") {
    return requestDiscordAuthorizationAttempt(sdk, {
      authMode: "consent",
      clientId: options.clientId,
      attemptId: options.attemptId,
      emitAuthProgress: options.emitAuthProgress,
      onDebugEvent: options.onDebugEvent,
      failureLevel: "error",
    });
  }

  try {
    return await requestDiscordAuthorizationAttempt(sdk, {
      authMode: "silent",
      clientId: options.clientId,
      attemptId: options.attemptId,
      emitAuthProgress: options.emitAuthProgress,
      onDebugEvent: options.onDebugEvent,
      failureLevel: "warn",
    });
  } catch (error) {
    if (!isDiscordAuthorizeFailure(error)) {
      throw error;
    }

    return requestDiscordAuthorizationAttempt(sdk, {
      authMode: "consent",
      clientId: options.clientId,
      attemptId: options.attemptId,
      emitAuthProgress: options.emitAuthProgress,
      onDebugEvent: options.onDebugEvent,
      failureLevel: "error",
    });
  }
}

function buildProfileFromDiscordIdentity(user: DiscordUserLike, guildMember?: DiscordGuildMemberLike): LocalProfile {
  return buildDiscordLocalProfile(user, {
    guildMember,
    avatarSeedBuilder: buildAvatarSeed,
  });
}

async function resolveBestEffortDiscordProfile(sdk: DiscordSDK): Promise<LocalProfile | undefined> {
  const participantProfilePromise = fetchParticipantIdentity(sdk, "").then((participant) => {
    if (!participant) {
      return undefined;
    }

    return buildProfileFromDiscordIdentity(participant);
  });

  const currentUserProfilePromise = new Promise<LocalProfile | undefined>((resolve) => {
    let settled = false;

    const resolveOnce = (profile?: LocalProfile) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(profile);
    };

    const timeoutId = window.setTimeout(() => {
      resolveOnce();
    }, 1_500);

    const handleCurrentUserUpdate = (user: DiscordUserLike) => {
      window.clearTimeout(timeoutId);
      resolveOnce(buildProfileFromDiscordIdentity(user));
      void sdk.unsubscribe("CURRENT_USER_UPDATE", handleCurrentUserUpdate);
    };

    void sdk
      .subscribe("CURRENT_USER_UPDATE", handleCurrentUserUpdate)
      .catch(() => {
        window.clearTimeout(timeoutId);
        resolveOnce();
      });
  });

  const directParticipantProfilePromise = sdk.commands
    .getInstanceConnectedParticipants()
    .then(({ participants }) => {
      if (participants.length !== 1) {
        return undefined;
      }

      return buildProfileFromDiscordIdentity(participants[0]);
    })
    .catch(() => undefined);

  const [currentUserProfile, singleParticipantProfile, participantProfile] = await Promise.all([
    currentUserProfilePromise,
    directParticipantProfilePromise,
    participantProfilePromise,
  ]);

  return currentUserProfile ?? singleParticipantProfile ?? participantProfile;
}

async function exchangeDiscordAuthCode(code: string, attemptId: string): Promise<string> {
  const authEndpoint = resolveDiscordAuthEndpoint();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(authEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, attemptId }),
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed.";
    throw new Error(`Discord token exchange request failed after ${DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS}ms via ${authEndpoint}: ${message}`);
  } finally {
    window.clearTimeout(timeoutId);
  }

  const payload = (await response.json().catch(() => null)) as (DiscordTokenExchangeErrorResponse & Partial<DiscordTokenExchangeResponse>) | null;

  if (!response.ok || !payload?.access_token) {
    const details: string[] = [];

    if (payload?.buildId) {
      details.push(`build ${payload.buildId}`);
    }

    if (payload?.attemptId) {
      details.push(`attempt ${payload.attemptId}`);
    }

    if (payload?.missing && payload.missing.length > 0) {
      details.push(`missing ${payload.missing.join(", ")}`);
    }

    if (payload?.discordError === "invalid_grant") {
      details.push("check that DISCORD_REDIRECT_URI matches the Discord Developer Portal redirect URI exactly");
    }

    const detailSuffix = details.length > 0 ? ` (${details.join("; ")})` : "";
    throw new Error(`${payload?.error ?? "Discord token exchange failed."}${detailSuffix} via ${authEndpoint}`);
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
    if (!userId) {
      return participants.length === 1 ? participants[0] : undefined;
    }

    return participants.find((participant) => participant.id === userId);
  } catch {
    return undefined;
  }
}

async function resolveDiscordIdentity(
  sdk: DiscordSDK,
  clientId: string,
  onProfileUpdate?: (localProfile: LocalProfile, identitySource: EmbeddedIdentitySource) => void,
  authPrompt: "none" | "interactive" | undefined = "none",
  attemptId = createDiscordAuthAttemptId(),
  onAuthProgress?: (progress: DiscordAuthProgress) => void,
  onDebugEvent?: InitializeEmbeddedAppOptions["onDebugEvent"],
): Promise<{ localProfile: LocalProfile; cleanup: () => void }> {
  const emitAuthProgress = (authStage: DiscordAuthStage, authError?: string) => {
    onAuthProgress?.({
      attemptId,
      authStage,
      authError,
    });
  };

  const code = await requestDiscordAuthorizationCode(sdk, {
    clientId,
    attemptId,
    authPrompt,
    emitAuthProgress,
    onDebugEvent,
  });

  let accessToken: string;

  emitAuthProgress("exchanging_token");
  emitDebugEvent(onDebugEvent, {
    level: "info",
    category: "auth",
    label: "auth:token-exchange:start",
    detail: resolveDiscordAuthEndpoint(),
  });

  try {
    accessToken = await exchangeDiscordAuthCode(code, attemptId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord token exchange failed.";
    emitAuthProgress("exchanging_token", `Discord token exchange failed: ${message}`);
    emitDebugEvent(onDebugEvent, {
      level: "error",
      category: "auth",
      label: "auth:token-exchange:failed",
      detail: message,
    });
    throw new Error(`Discord token exchange failed: ${message}`);
  }

  emitDebugEvent(onDebugEvent, {
    level: "info",
    category: "auth",
    label: "auth:token-exchange:success",
    detail: `attempt ${summarizeAttemptId(attemptId)}`,
  });

  let auth: Awaited<ReturnType<typeof sdk.commands.authenticate>>;

  emitAuthProgress("authenticating");
  emitDebugEvent(onDebugEvent, {
    level: "info",
    category: "auth",
    label: "auth:authenticate:start",
    detail: sdk.guildId ? `guild ${sdk.guildId}` : "no guild context",
  });

  try {
    auth = await sdk.commands.authenticate({
      access_token: accessToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord authenticate failed.";
    emitAuthProgress("authenticating", `Discord authenticate failed: ${message}`);
    emitDebugEvent(onDebugEvent, {
      level: "error",
      category: "auth",
      label: "auth:authenticate:failed",
      detail: message,
    });
    throw new Error(`Discord authenticate failed: ${message}`);
  }

  emitDebugEvent(onDebugEvent, {
    level: "info",
    category: "auth",
    label: "auth:authenticate:success",
    detail: `user ${auth.user.id}`,
  });

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
  emitDebugEvent(onDebugEvent, {
    level: "info",
    category: "auth",
    label: "auth:subscribe:start",
    detail: sdk.guildId ? "user and guild subscriptions" : "user subscription only",
  });

  const pushProfileUpdate = () => {
    const localProfile = buildProfileFromDiscordIdentity(currentUser, currentGuildMember);
    persistLocalProfile(localProfile);
    onProfileUpdate?.(localProfile, "authenticated_discord");
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

  emitDebugEvent(onDebugEvent, {
    level: "info",
    category: "auth",
    label: "auth:subscribe:success",
    detail: `attempt ${summarizeAttemptId(attemptId)}`,
  });

  return {
    localProfile: initialProfile,
    cleanup: () => {
      for (const unsubscribe of unsubscribeHandlers) {
        unsubscribe();
      }
    },
  };
}

async function resolveDiscordIdentityWithFallbackPrompt(
  sdk: DiscordSDK,
  clientId: string,
  options: Pick<InitializeEmbeddedAppOptions, "onProfileUpdate" | "authPrompt" | "attemptId" | "onAuthProgress" | "onDebugEvent"> = {},
): Promise<{ localProfile: LocalProfile; cleanup: () => void }> {
  const attemptId = options.attemptId ?? createDiscordAuthAttemptId();
  const initialPrompt = options.authPrompt ?? "none";

  return resolveDiscordIdentity(
    sdk,
    clientId,
    options.onProfileUpdate,
    initialPrompt,
    attemptId,
    options.onAuthProgress,
    options.onDebugEvent,
  );
}

export async function retryDiscordIdentity(
  sdk: DiscordSDK,
  options: InitializeEmbeddedAppOptions = {},
): Promise<Pick<EmbeddedAppState, "buildId" | "attemptId" | "localProfile" | "identitySource" | "authStage" | "startupStage" | "startupError" | "authError" | "cleanup">> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const attemptId = options.attemptId ?? createDiscordAuthAttemptId();
  const fallbackLocalProfile = options.fallbackLocalProfile ?? getLocalProfile();

  if (!clientId) {
    const config = getDiscordAuthConfigSummary();
    return {
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile: fallbackLocalProfile,
      identitySource: "local_fallback",
      authStage: "idle",
      startupStage: "auth",
      startupError: `Discord client ID is missing. Expected VITE_DISCORD_CLIENT_ID for ${config.authEndpoint}.`,
      authError: `Discord client ID is missing. Expected VITE_DISCORD_CLIENT_ID for ${config.authEndpoint}.`,
    };
  }

  try {
    const { localProfile, cleanup } = await resolveDiscordIdentityWithFallbackPrompt(
      sdk,
      clientId,
      {
        onProfileUpdate: options.onProfileUpdate,
        authPrompt: options.authPrompt,
        attemptId,
        onAuthProgress: options.onAuthProgress,
        onDebugEvent: options.onDebugEvent,
      },
    );
    return {
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile,
      identitySource: "authenticated_discord",
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
      identitySource: "local_fallback",
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
  let resolvedLocalProfile = fallbackLocalProfile;
  const attemptId = options.attemptId ?? createDiscordAuthAttemptId();
  const config = getDiscordAuthConfigSummary();

  if (!enabled || !clientId) {
    emitDebugEvent(options.onDebugEvent, {
      level: "warn",
      category: "sdk",
      label: "sdk:init:failed",
      detail: !enabled ? "Discord SDK disabled by environment." : "Discord client ID is missing.",
    });
    return {
      enabled: false,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile: fallbackLocalProfile,
      identitySource: "local_fallback",
      authStage: "idle",
      startupStage: "disabled",
      startupError: !enabled
        ? "Discord SDK is disabled by environment. Set VITE_ENABLE_DISCORD_SDK=true to enable Discord Activity identity."
        : `Discord client ID is missing. Expected VITE_DISCORD_CLIENT_ID for ${config.authEndpoint}.`,
    };
  }

  ensureDiscordActivityUrlMappingsPatched();

  let sdk: DiscordSDK;
  emitDebugEvent(options.onDebugEvent, {
    level: "info",
    category: "sdk",
    label: "sdk:init:start",
    detail: `build ${FRONTEND_BUILD_ID}`,
  });

  try {
    sdk = new DiscordSDK(clientId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord SDK failed to initialize.";
    console.error("Discord SDK construction failed.", error);
    persistLocalProfile(fallbackLocalProfile);
    emitDebugEvent(options.onDebugEvent, {
      level: "error",
      category: "sdk",
      label: "sdk:init:failed",
      detail: message,
    });

    return {
      enabled: false,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      localProfile: fallbackLocalProfile,
      identitySource: "local_fallback",
      authStage: "idle",
      startupStage: "sdk_init",
      startupError: message,
    };
  }

  emitDebugEvent(options.onDebugEvent, {
    level: "info",
    category: "sdk",
    label: "sdk:init:success",
    detail: `attempt ${summarizeAttemptId(attemptId)}`,
  });

  emitDebugEvent(options.onDebugEvent, {
    level: "info",
    category: "sdk",
    label: "sdk:ready:start",
    detail: `channel ${sdk.channelId ?? "n/a"}`,
  });

  try {
    await waitForDiscordSdkReady(sdk);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord SDK failed to become ready.";
    console.error("Discord SDK ready() failed.", error);
    persistLocalProfile(fallbackLocalProfile);
    emitDebugEvent(options.onDebugEvent, {
      level: "error",
      category: "sdk",
      label: "sdk:ready:failed",
      detail: message,
    });

    return {
      enabled: false,
      sdk,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      channelId: sdk.channelId ?? undefined,
      guildId: sdk.guildId ?? undefined,
      instanceId: sdk.instanceId ?? undefined,
      localProfile: fallbackLocalProfile,
      identitySource: "local_fallback",
      authStage: "idle",
      startupStage: "sdk_ready",
      startupError: message,
    };
  }

  emitDebugEvent(options.onDebugEvent, {
    level: "info",
    category: "sdk",
    label: "sdk:ready:success",
    detail: `instance ${sdk.instanceId ?? "n/a"}`,
  });

  try {
    const { localProfile, cleanup } = await resolveDiscordIdentityWithFallbackPrompt(
      sdk,
      clientId,
      {
        onProfileUpdate: options.onProfileUpdate,
        authPrompt: options.authPrompt,
        attemptId,
        onAuthProgress: options.onAuthProgress,
        onDebugEvent: options.onDebugEvent,
      },
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
      identitySource: "authenticated_discord",
      authStage: "ready",
      startupStage: "ready",
      cleanup,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord identity setup failed.";
    console.error("Discord identity setup failed.", error);

    emitDebugEvent(options.onDebugEvent, {
      level: "info",
      category: "profile",
      label: "profile:best-effort:start",
      detail: "Auth failed; attempting participant/current-user Discord profile fallback.",
    });

    let bestEffortDiscordProfile: LocalProfile | undefined;
    let bestEffortProfileError: unknown;

    try {
      bestEffortDiscordProfile = await resolveBestEffortDiscordProfile(sdk);
    } catch (profileError) {
      bestEffortProfileError = profileError;
    }

    if (bestEffortProfileError) {
      emitDebugEvent(options.onDebugEvent, {
        level: "error",
        category: "profile",
        label: "profile:best-effort:failed",
        detail: bestEffortProfileError instanceof Error ? bestEffortProfileError.message : "Best-effort profile resolution failed.",
      });
    } else if (bestEffortDiscordProfile) {
      resolvedLocalProfile = bestEffortDiscordProfile;
      persistLocalProfile(bestEffortDiscordProfile);
      options.onProfileUpdate?.(bestEffortDiscordProfile, "participant_discord");
      emitDebugEvent(options.onDebugEvent, {
        level: "info",
        category: "profile",
        label: "profile:best-effort:success",
        detail: bestEffortDiscordProfile.displayName,
      });
    } else {
      emitDebugEvent(options.onDebugEvent, {
        level: "warn",
        category: "profile",
        label: "profile:best-effort:miss",
        detail: "No participant/current-user Discord profile was available.",
      });
    }

    if (!bestEffortDiscordProfile) {
      persistLocalProfile(fallbackLocalProfile);
    }

    return {
      enabled: true,
      sdk,
      buildId: FRONTEND_BUILD_ID,
      attemptId,
      channelId: sdk.channelId ?? undefined,
      guildId: sdk.guildId ?? undefined,
      instanceId: sdk.instanceId ?? undefined,
      localProfile: resolvedLocalProfile,
      identitySource: bestEffortDiscordProfile ? "participant_discord" : "local_fallback",
      authStage: "idle",
      startupStage: "auth",
      startupError: message,
      authError: message,
    };
  }
}
