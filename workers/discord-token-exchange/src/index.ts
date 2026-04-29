interface Env {
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_REDIRECT_URI?: string;
  BUILD_ID?: string;
}

interface DiscordTokenRequestBody {
  code?: unknown;
  attemptId?: unknown;
}

const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS = 20_000;
const DEFAULT_REDIRECT_URI = "https://127.0.0.1";
const TOKEN_EXCHANGE_PATHS = new Set(["/api/discord/token", "/api/token"]);

function trimDiagnosticText(value: string, maxLength = 400) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function getBuildId(env: Env) {
  return env.BUILD_ID?.trim() || "worker-dev";
}

function getDiscordRedirectUri(env: Env) {
  return env.DISCORD_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
}

function getMissingDiscordOAuthConfig(env: Env) {
  const missing: string[] = [];

  if (!env.DISCORD_CLIENT_ID?.trim()) {
    missing.push("DISCORD_CLIENT_ID");
  }

  if (!env.DISCORD_CLIENT_SECRET?.trim()) {
    missing.push("DISCORD_CLIENT_SECRET");
  }

  return missing;
}

function getDiscordOAuthConfigSummary(env: Env) {
  return {
    has_client_id: Boolean(env.DISCORD_CLIENT_ID?.trim()),
    has_client_secret: Boolean(env.DISCORD_CLIENT_SECRET?.trim()),
    redirect_uri: getDiscordRedirectUri(env),
    missing: getMissingDiscordOAuthConfig(env),
  };
}

function createCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin");

  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...createCorsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readTokenRequestBody(request: Request): Promise<DiscordTokenRequestBody> {
  if (!request.body) {
    return {};
  }

  return await request.json();
}

async function exchangeDiscordToken(request: Request, env: Env) {
  const buildId = getBuildId(env);
  const redirectUri = getDiscordRedirectUri(env);
  let requestBody: DiscordTokenRequestBody = {};

  try {
    requestBody = await readTokenRequestBody(request);
  } catch {
    return jsonResponse(request, 400, {
      error: "Invalid JSON payload.",
      buildId,
    });
  }

  const attemptId = typeof requestBody.attemptId === "string" ? requestBody.attemptId : "unknown";

  console.log("Discord token exchange requested.", {
    attemptId,
    build_id: buildId,
    method: request.method,
    origin: request.headers.get("Origin"),
    referer: request.headers.get("Referer"),
    user_agent: request.headers.get("User-Agent"),
  });

  const missingDiscordOAuthConfig = getMissingDiscordOAuthConfig(env);

  if (missingDiscordOAuthConfig.length > 0) {
    console.error("Discord OAuth is not configured on the token Worker.", {
      attemptId,
      build_id: buildId,
      missing: missingDiscordOAuthConfig,
      redirect_uri: redirectUri,
    });

    return jsonResponse(request, 500, {
      error: `Discord OAuth is not configured on the token Worker. Missing ${missingDiscordOAuthConfig.join(", ")}.`,
      attemptId,
      buildId,
      missing: missingDiscordOAuthConfig,
    });
  }

  const code = typeof requestBody.code === "string" ? requestBody.code : undefined;

  if (!code) {
    console.error("Discord token exchange request missing code.", { attemptId });
    return jsonResponse(request, 400, {
      error: "Missing Discord authorization code.",
      attemptId,
      buildId,
    });
  }

  const tokenExchangeController = new AbortController();
  const tokenExchangeTimeout = setTimeout(() => {
    tokenExchangeController.abort();
  }, DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS);

  let tokenResponse: Response;

  try {
    console.log("Discord token exchange forwarding to Discord.", {
      attemptId,
      build_id: buildId,
      redirect_uri: redirectUri,
      timeout_ms: DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS,
    });

    tokenResponse = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID || "",
        client_secret: env.DISCORD_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      signal: tokenExchangeController.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Discord token exchange network error.";

    console.error("Discord token exchange network failed.", {
      attemptId,
      build_id: buildId,
      error: message,
      timeout_ms: DISCORD_TOKEN_EXCHANGE_TIMEOUT_MS,
    });

    return jsonResponse(request, 504, {
      error: `Discord token exchange network failed: ${message}`,
      attemptId,
      buildId,
    });
  } finally {
    clearTimeout(tokenExchangeTimeout);
  }

  const responseText = await tokenResponse.text().catch(() => "");
  const payload = responseText ? parseJsonObject(responseText) : null;

  if (!tokenResponse.ok || typeof payload?.access_token !== "string") {
    const discordError = typeof payload?.error === "string" ? payload.error : "unknown_error";
    const discordErrorDescription = typeof payload?.error_description === "string" ? payload.error_description : undefined;
    const responseError =
      discordErrorDescription ??
      (typeof payload?.message === "string" ? payload.message : undefined) ??
      (responseText ? trimDiagnosticText(responseText, 180) : undefined) ??
      discordError;
    const configHint = discordError === "invalid_grant"
      ? " Check that DISCORD_REDIRECT_URI exactly matches the Discord Developer Portal redirect URI."
      : "";
    const retryAfter = tokenResponse.headers.get("retry-after");
    const rateLimitResetAfter = tokenResponse.headers.get("x-ratelimit-reset-after");
    const rateLimitRemaining = tokenResponse.headers.get("x-ratelimit-remaining");
    const rateLimitBucket = tokenResponse.headers.get("x-ratelimit-bucket");
    const responsePreview = responseText ? trimDiagnosticText(responseText) : undefined;

    console.error("Discord token exchange failed.", {
      attemptId,
      build_id: buildId,
      status: tokenResponse.status,
      error: discordError,
      error_description: discordErrorDescription,
      response_preview: responsePreview,
      retry_after: retryAfter,
      rate_limit_reset_after: rateLimitResetAfter,
      rate_limit_remaining: rateLimitRemaining,
      rate_limit_bucket: rateLimitBucket,
      redirect_uri: redirectUri,
      has_client_id: Boolean(env.DISCORD_CLIENT_ID?.trim()),
      has_client_secret: Boolean(env.DISCORD_CLIENT_SECRET?.trim()),
    });

    return jsonResponse(request, 502, {
      error: `Discord token exchange failed: ${responseError}.${configHint}`.trim(),
      attemptId,
      buildId,
      discordStatus: tokenResponse.status,
      discordError,
      discordErrorDescription,
      discordResponsePreview: responsePreview,
      retryAfter,
      rateLimitResetAfter,
      rateLimitRemaining,
    });
  }

  return jsonResponse(request, 200, {
    access_token: payload.access_token,
    expires_in: payload.expires_in,
    scope: payload.scope,
    token_type: payload.token_type,
    attemptId,
    buildId,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && (TOKEN_EXCHANGE_PATHS.has(url.pathname) || url.pathname === "/health")) {
      return new Response(null, {
        status: 204,
        headers: createCorsHeaders(request),
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(request, 200, {
        ok: true,
        service: "sync-sesh-discord-token",
        build_id: getBuildId(env),
        discord_oauth: getDiscordOAuthConfigSummary(env),
      });
    }

    if (request.method === "POST" && TOKEN_EXCHANGE_PATHS.has(url.pathname)) {
      return await exchangeDiscordToken(request, env);
    }

    return jsonResponse(request, 404, {
      error: "Not found.",
      buildId: getBuildId(env),
    });
  },
};
