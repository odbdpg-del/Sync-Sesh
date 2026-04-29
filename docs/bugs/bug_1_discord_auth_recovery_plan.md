# Bug 1 Discord Auth Recovery Plan

## Purpose

This document turns the Bug 1 investigation into a clean implementation plan for Sync Sesh.

The old Bug 1 thread grew large because the investigation moved through several possible causes:

- bad environment variables
- wrong redirect URI
- backend token exchange
- silent auth ordering
- Discord launch context
- static-page white-box diagnostics

The clean repo at:

- `C:\Users\Rubbe\Desktop\farding\Discord-Test-Farding`

now appears to prove the smallest useful Discord Activity auth flow. The goal is to bring that known-good shape back into Sync Sesh in small, reviewable chunks.

## Current Best Understanding

The clean repo succeeds because it keeps Discord auth boring and explicit:

1. Create `DiscordSDK`.
2. Wait for `sdk.ready()`.
3. Try `sdk.commands.authorize(...)` with `prompt: "none"`.
4. If silent authorization fails, try again with `prompt: "consent"`.
5. Send the returned authorization code to a same-origin backend route.
6. Exchange the code server-side using `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`.
7. Call `sdk.commands.authenticate({ access_token })`.
8. Use the authenticated user payload to render Discord identity.

The most important Sync Sesh difference is that Attempt 1 in `bug_1.md` treated `prompt: "consent"` as blocked because the installed SDK TypeScript contract only accepts:

- `prompt: "none"`
- or no `prompt`

The clean repo uses a narrow cast to send `prompt: "consent"` at runtime anyway:

```ts
prompt: prompt as "none"
```

That means the old Sync Sesh investigation never truly tested the consent prompt request shape.

## Evidence From The Clean Repo

Relevant clean repo files:

- `Discord-Test-Farding/client/src/discord/sdk.ts`
- `Discord-Test-Farding/client/src/discord/auth.ts`
- `Discord-Test-Farding/client/src/lib/env.ts`
- `Discord-Test-Farding/server/src/routes/auth.ts`
- `Discord-Test-Farding/server/src/lib/discord.ts`
- `Discord-Test-Farding/server/src/app.ts`

The clean repo auth helper:

- tries silent auth first
- falls back to consent auth
- uses only the `identify` scope
- does not include `redirect_uri` in the frontend `authorize()` call
- exchanges the code through a same-origin API path when embedded in Discord
- keeps access tokens in memory only
- calls `authenticate()` after backend token exchange

## Key Differences To Resolve In Sync Sesh

### 1. Consent Prompt

Sync Sesh currently supports:

- silent auth with `prompt: "none"`
- interactive auth with no `prompt`

It should instead match the clean repo:

- silent auth with `prompt: "none"`
- consent fallback with runtime `prompt: "consent"`

Because the SDK type does not expose `"consent"`, this should be isolated behind a tiny helper and documented locally.

### 2. Frontend Redirect URI

Sync Sesh currently includes `redirect_uri` in the frontend `authorize()` request.

The clean repo does not include `redirect_uri` in the frontend `authorize()` request. It only uses `DISCORD_REDIRECT_URI` during the backend token exchange.

The recovery plan should test the clean repo shape first:

- remove `redirect_uri` from frontend `authorize()`
- keep backend `redirect_uri` unchanged

### 3. Startup Ordering

Sync Sesh currently tries best-effort Discord profile discovery before full auth.

That made sense as a fallback experiment, but it adds noise before the critical path. The recovery path should be:

1. `sdk.ready()`
2. auth
3. authenticated profile build
4. subscriptions and participant profile fallback only after auth succeeds or fails

### 4. Same-Origin API Route

The clean repo keeps embedded Activity API calls same-origin.

Sync Sesh should continue using a same-origin route inside Discord:

- preferred existing route: `/api/discord/token`
- optional compatibility alias: `/api/token`

Do not call the Render backend as an absolute external URL from inside the embedded Activity unless a later test proves that is required.

### 5. Old Harness And Static Probe Work

The old harness, static probe, and embed diagnostics are useful historical evidence, but they should not drive the first recovery chunk.

If the clean auth flow works in Sync Sesh, mark those probes as obsolete or remove them in a later cleanup chunk.

## Implementation Chunks

Each chunk should be small enough for one Codex turn.

### [x] Chunk 1: Add A Clean Auth Helper

Goal:

Create a small helper in `src/lib/discord/embeddedApp.ts` that matches the clean repo auth shape.

Scope:

- add `authorizeWithPrompt(...)`
- support `"none"` and `"consent"` as internal modes
- use a narrow cast only inside that helper
- keep scope as `["identify"]`
- do not include frontend `redirect_uri`
- keep existing timeout behavior

Success criteria:

- TypeScript build passes
- helper is isolated and easy to inspect
- no app behavior changes beyond using the new helper if this chunk wires it in

### [x] Chunk 2: Wire Silent Then Consent Authorization

Goal:

Replace Sync Sesh's current silent/interactive auth behavior with:

1. silent `prompt: "none"`
2. consent `prompt: "consent"` fallback

Scope:

- update `resolveDiscordIdentityWithFallbackPrompt(...)` or equivalent flow
- emit clear debug events:
  - `auth:silent:start`
  - `auth:silent:success`
  - `auth:silent:failed`
  - `auth:consent:start`
  - `auth:consent:success`
  - `auth:consent:failed`
- keep local fallback behavior if both attempts fail
- do not add new scopes
- do not store tokens

Success criteria:

- returning users can silent-auth when Discord allows it
- first-time or revoked users get a real consent attempt
- failures are visible in the debug console

#### Chunk 2 Prep

Current behavior:

- `resolveDiscordIdentityWithFallbackPrompt(...)` defaults to `"interactive"`.
- `"interactive"` currently means the app omits `prompt`.
- silent fallback only happens when `authPrompt` is explicitly `"none"`.
- `resolveDiscordIdentity(...)` still builds the older authorize request shape.

Target behavior for this chunk:

- default auth should start with silent `prompt: "none"`.
- if silent authorization fails with a Discord authorize failure, retry once with consent `prompt: "consent"`.
- both attempts should use `requestCleanDiscordAuthorization(...)`.
- token exchange, `authenticate()`, profile creation, subscriptions, and local fallback should remain otherwise unchanged.
- pre-auth best-effort profile ordering should not be changed in this chunk; that belongs to Chunk 4.
- route normalization should not be changed in this chunk; that belongs to Chunk 5.

Target pseudocode:

```ts
try {
  code = await requestCleanDiscordAuthorization(sdk, {
    attemptId,
    clientId,
    prompt: "none",
  });
  emit auth:silent:success;
} catch (silentError) {
  emit auth:silent:failed;

  if (!isDiscordAuthorizeFailure(silentError)) {
    throw silentError;
  }

  code = await requestCleanDiscordAuthorization(sdk, {
    attemptId,
    clientId,
    prompt: "consent",
  });
  emit auth:consent:success;
}
```

Debug event expectations:

- Before silent authorize:
  - label: `auth:silent:start`
  - category: `auth`
  - level: `info`
- If silent returns a code:
  - label: `auth:silent:success`
  - category: `auth`
  - level: `info`
- If silent fails:
  - label: `auth:silent:failed`
  - category: `auth`
  - level: `warn` if falling back, `error` if not retrying
- Before consent authorize:
  - label: `auth:consent:start`
  - category: `auth`
  - level: `info`
- If consent returns a code:
  - label: `auth:consent:success`
  - category: `auth`
  - level: `info`
- If consent fails:
  - label: `auth:consent:failed`
  - category: `auth`
  - level: `error`

Auth progress expectations:

- During either authorize attempt, report `authStage: "authorizing"`.
- If both attempts fail, preserve the existing returned app state:
  - `identitySource` falls back as it does now
  - `authStage` returns to `"idle"`
  - `startupStage` is `"auth"`
  - `authError` contains the final safe auth failure

Error handling expectations:

- Do not retry token exchange failures with consent. Consent fallback is only for authorize failures.
- If silent fails for an unexpected non-authorize reason, do not mask it unless runtime testing proves Discord wraps all silent failures differently.
- If consent fails, surface the consent failure as the final auth error.
- Keep the existing safe authorize diagnostic summarizer.
- Do not log auth codes, access tokens, refresh tokens, or secrets.

Files likely to change:

- `src/lib/discord/embeddedApp.ts`
- `changelog.md`

Recommended implementation approach:

1. Add a small internal helper that gets an authorization code with silent-then-consent behavior.
2. Have `resolveDiscordIdentity(...)` call that helper instead of building and passing the older authorize request directly.
3. Keep the rest of `resolveDiscordIdentity(...)` from token exchange onward unchanged.
4. Keep the older `requestDiscordAuthorization(...)` in place until Chunk 3 or cleanup decides whether to remove it.

Chunk 2 implementation prompt:

```md
Implement Chunk 2 from `docs/bugs/bug_1_discord_auth_recovery_plan.md`.

Wire Sync Sesh Discord auth to use the new `requestCleanDiscordAuthorization()` helper with a silent-first, consent-fallback flow. The default path should try `prompt: "none"` first, then retry once with `prompt: "consent"` only when silent authorization fails at the authorize step. Preserve token exchange, `authenticate()`, profile creation, subscriptions, pre-auth best-effort profile ordering, endpoint resolution, local fallback behavior, and scopes. Add safe debug events for `auth:silent:start/success/failed` and `auth:consent:start/success/failed`. Update `changelog.md` and run `npm.cmd run build`.
```

### [x] Chunk 3: Remove Frontend Redirect URI From Authorize

Goal:

Match the clean repo request shape by removing frontend `redirect_uri` from `sdk.commands.authorize(...)`.

Scope:

- remove `redirect_uri` from the frontend authorize payload
- keep `DISCORD_REDIRECT_URI` on the backend token exchange
- update debug config text so it does not imply the frontend sends redirect URI
- keep backend invalid-grant diagnostics

Success criteria:

- frontend authorize payload matches the clean repo
- backend token exchange still sends the configured redirect URI
- build passes

#### Chunk 3 Prep

Chunk 2 already moved the live auth path to `requestCleanDiscordAuthorization(...)`, which means the active frontend authorize request no longer includes `redirect_uri`.

This chunk should therefore be a verification and cleanup pass, not a broad auth rewrite.

Current expected code state after Chunk 2:

- live authorize calls go through `requestCleanDiscordAuthorization(...)`
- `CleanDiscordAuthorizeRequest` has no `redirect_uri`
- backend token exchange still uses `discordRedirectUri`
- debug context still reports `redirectUri`, but this now means backend token exchange configuration, not a frontend authorize field
- old comments, diagnostics, or harness copy may still imply the frontend authorize payload sends redirect URI

Target behavior:

- no active `sdk.commands.authorize(...)` payload should include `redirect_uri`
- any debug text that mentions redirect URI should clarify it is the backend exchange redirect URI
- backend invalid-grant diagnostics should stay because token exchange can still fail when `DISCORD_REDIRECT_URI` is wrong
- the auth harness can stay unchanged unless it still sends `redirect_uri` and is intended to compare against the clean repo

Specific checks before editing:

```powershell
rg -n "redirect_uri|redirectUri|sdk.commands.authorize|authorizeOptions" src docs public server
```

Expected implementation options:

1. If only debug labels are misleading, rename the context text from:
   - `redirect ${context.redirectUri}`
   to something like:
   - `backend redirect ${context.redirectUri}`
2. If the auth harness still sends `redirect_uri`, decide whether to:
   - remove it so the harness matches the clean repo, or
   - leave it and clearly document that the harness is historical/diagnostic only
3. If obsolete request types from the old authorize path remain, remove them only if they are unused and TypeScript confirms the cleanup.

Files likely to change:

- `src/lib/discord/embeddedApp.ts`
- optionally `src/screens/AuthHarnessScreen.tsx`
- optionally `docs/bugs/bug_1_discord_auth_recovery_plan.md`
- `changelog.md`

Do not change in this chunk:

- silent/consent fallback behavior
- backend token exchange form fields
- endpoint route resolution
- profile fallback ordering
- scopes
- token storage behavior

Chunk 3 implementation prompt:

```md
Implement Chunk 3 from `docs/bugs/bug_1_discord_auth_recovery_plan.md`.

Verify and clean up the authorize request shape after Chunk 2. Ensure no active Sync Sesh frontend `sdk.commands.authorize(...)` payload includes `redirect_uri`, while preserving backend token exchange use of `DISCORD_REDIRECT_URI` and invalid-grant diagnostics. Update any misleading debug text so redirect URI is described as backend exchange configuration, not a frontend authorize field. If the auth harness still sends `redirect_uri`, either align it with the clean repo authorize shape or clearly leave it as historical diagnostic code with no effect on the live path. Keep changes tightly scoped, update `changelog.md`, and run `npm.cmd run build`.
```

### [x] Chunk 4: Simplify Discord Identity Startup Ordering

Goal:

Move best-effort profile resolution out of the pre-auth critical path.

Scope:

- `sdk.ready()` remains first
- auth runs before best-effort participant/current-user fallback
- authenticated Discord identity becomes the preferred profile source
- best-effort participant identity remains a fallback if auth fails
- preserve local fallback as the last resort

Success criteria:

- auth debug logs are easier to read
- no participant/current-user SDK probes happen before the first auth attempt
- local fallback still protects non-Discord or failed-auth sessions

#### Chunk 4 Prep

Current behavior:

- `initializeEmbeddedApp(...)` waits for `sdk.ready()`.
- Immediately after `sdk:ready:success`, it emits `profile:best-effort:start`.
- It calls `resolveBestEffortDiscordProfile(sdk)` before the main OAuth path.
- If a best-effort profile is found, it persists that profile and emits `onProfileUpdate(..., "participant_discord")` before auth.
- Only after that does it call `resolveDiscordIdentityWithFallbackPrompt(...)`.
- If auth fails, the catch block returns:
  - `identitySource: "participant_discord"` when a best-effort profile was found
  - otherwise `identitySource: "local_fallback"`

Target behavior:

- `sdk.ready()` remains the first runtime gate.
- The first identity action after `sdk:ready:success` should be the auth path:
  - `resolveDiscordIdentityWithFallbackPrompt(...)`
  - silent `prompt: "none"`
  - consent `prompt: "consent"` fallback
  - token exchange
  - `authenticate()`
- Best-effort participant/current-user profile resolution should run only if authenticated Discord identity fails.
- If auth succeeds, do not run best-effort profile resolution in the startup path.
- If auth fails and best-effort succeeds, return participant identity with the auth error preserved.
- If auth fails and best-effort also fails or misses, return local fallback with the auth error preserved.
- Preserve existing cleanup behavior from authenticated identity subscriptions.

Suggested implementation shape:

1. Move the `bestEffortDiscordProfile` and `bestEffortProfileError` logic below the `resolveDiscordIdentityWithFallbackPrompt(...)` catch path.
2. In the auth `try` block, return authenticated Discord identity exactly as it does now.
3. In the auth `catch` block:
   - capture the safe auth failure message
   - emit or preserve the existing auth failure state
   - then run best-effort profile resolution
   - emit `profile:best-effort:start/success/miss/failed` only after auth failure
4. If best-effort succeeds:
   - persist it
   - emit `onProfileUpdate(bestEffortDiscordProfile, "participant_discord")`
   - return `identitySource: "participant_discord"`
   - keep `startupStage: "auth"` and `authError` set to the auth failure
5. If best-effort misses or fails:
   - persist local fallback as today
   - return `identitySource: "local_fallback"`
   - keep `startupStage: "auth"` and `authError` set to the auth failure

Debug event expectations:

- Healthy auth startup should no longer show `profile:best-effort:*` before `auth:silent:start`.
- Successful authenticated startup should not need any `profile:best-effort:*` events.
- Failed auth followed by participant fallback should show:
  - auth failure events first
  - then `profile:best-effort:start`
  - then `profile:best-effort:success`
- Failed auth with no participant fallback should show:
  - auth failure events first
  - then `profile:best-effort:start`
  - then `profile:best-effort:miss` or `profile:best-effort:failed`

Files likely to change:

- `src/lib/discord/embeddedApp.ts`
- `changelog.md`

Do not change in this chunk:

- clean authorize helper behavior
- silent/consent prompt behavior
- token exchange endpoint resolution
- Render or Discord URL mappings
- scopes
- token storage behavior
- debug console rendering
- auth harness, static probe, or embed diagnostics cleanup

Chunk 4 implementation prompt:

```md
Implement Chunk 4 from `docs/bugs/bug_1_discord_auth_recovery_plan.md`.

Simplify Discord identity startup ordering so the main auth path runs immediately after `sdk.ready()` and before any best-effort participant/current-user profile lookup. Preserve the existing silent-then-consent auth flow, token exchange, `authenticate()`, authenticated profile creation, subscription cleanup, local fallback behavior, scopes, and endpoint resolution. If auth succeeds, do not run best-effort profile resolution during startup. If auth fails, then run best-effort profile resolution as a fallback; return `participant_discord` when that succeeds and `local_fallback` when it misses/fails, while preserving the auth failure in `authError`/`startupError`. Update `changelog.md` and run `npm.cmd run build`.
```

### [x] Chunk 5: Normalize Token Route Behavior

Goal:

Make embedded token exchange boring and same-origin.

Scope:

- keep `/api/discord/token` as the main Sync Sesh route
- optionally add `/api/token` as an alias if it helps compare to the clean repo
- ensure `resolveDiscordAuthEndpoint()` returns a same-origin path inside Discord
- keep request/response diagnostics

Success criteria:

- Activity auth uses same-origin `/api/...`
- local development still works
- backend logs show token exchange requests clearly

#### Chunk 5 Prep

Current behavior:

- Frontend token exchange uses `resolveDiscordAuthEndpoint()`.
- Inside Discord proxy hosts, `resolveDiscordAuthEndpoint()` returns same-origin `/api/discord/token`.
- When `VITE_SYNC_SERVER_URL` is unset, `"auto"`, local-while-remote, or invalid, token exchange falls back to `/api/discord/token`.
- Outside Discord, a valid non-local `VITE_SYNC_SERVER_URL` becomes an absolute `/api/discord/token` URL on that origin.
- Websocket sync inside Discord uses same-origin `/ws`.
- `ensureDiscordActivityUrlMappingsPatched()` includes explicit mapping hints for `/ws`, `/sync`, and `/api` when `VITE_SYNC_SERVER_URL` is a non-local host.
- The sync server currently handles:
  - `OPTIONS /api/discord/token`
  - `POST /api/discord/token`
- The sync server does not yet handle:
  - `OPTIONS /api/token`
  - `POST /api/token`

Target behavior:

- Keep `/api/discord/token` as the canonical Sync Sesh token route.
- Add `/api/token` as a compatibility alias to match the clean repo shape and simplify Render/portal experiments.
- Keep both routes using the same `handleDiscordTokenExchange(...)` implementation.
- Keep CORS preflight behavior identical for both token routes.
- Do not change frontend endpoint resolution unless a concrete bug is found.
- Do not switch the Discord embedded Activity to an absolute Render URL from inside Discord.
- Keep `/ws` as the preferred Activity websocket route and `/sync` as compatibility.

Render cutover gate:

- Do not change Discord Developer Portal URL mappings until:
  1. Render service is deployed.
  2. `https://<render-service>.onrender.com/health` returns `ok: true`.
  3. `discord_oauth.missing` is empty.
  4. The frontend build/env points `VITE_SYNC_SERVER_URL` at the Render service origin.

When the gate is met, tell the user to update Discord Developer Portal mappings:

```text
Root mapping:
/      -> current frontend host, unless frontend also moved

Proxy path mappings:
/api   -> <render-service>.onrender.com
/ws    -> <render-service>.onrender.com
/sync  -> <render-service>.onrender.com
```

Important mapping note:

- Use the Render host as the target, not the full `/api/discord/token` URL.
- Discord applies the prefix path. For example, `/api/discord/token` should proxy through the `/api` mapping.

Suggested implementation:

1. Add a small `isDiscordTokenExchangePath(pathname)` helper in `server/sync-server.ts`.
2. Return `true` for `/api/discord/token` and `/api/token`.
3. Use that helper for both the `OPTIONS` and `POST` token route checks.
4. Keep `handleDiscordTokenExchange(...)` unchanged except for any route label logging if useful.
5. Update README only if the alias needs to be mentioned for operators.
6. Update `changelog.md`.
7. Run `npm.cmd run build`.

Do not change in this chunk:

- clean authorize helper behavior
- silent/consent prompt behavior
- Discord identity startup ordering
- best-effort profile fallback
- Render blueprint shape unless the route alias requires docs
- Discord Developer Portal mappings directly; the user will do that after the Render gate is met

Chunk 5 implementation prompt:

```md
Implement Chunk 5 from `docs/bugs/bug_1_discord_auth_recovery_plan.md`.

Normalize token route behavior for the Render migration while keeping `/api/discord/token` as the canonical route. Add `/api/token` as a backend compatibility alias using the same token exchange handler and identical OPTIONS preflight behavior. Preserve frontend endpoint resolution, same-origin `/api/discord/token` inside Discord, `/ws` websocket behavior, clean auth prompt behavior, identity startup ordering, scopes, and token storage behavior. Update docs only where useful for Render operators, update `changelog.md`, and run `npm.cmd run build`. Do not tell the user to change Discord Developer Portal mappings until the Render health/config gate is met.
```

### [~] Chunk 6: Manual Discord Verification

Goal:

Retest the real Activity before doing cleanup.

Manual checklist:

1. Deploy or run the updated Sync Sesh path.
2. Launch in Discord DM.
3. Launch in a small test server.
4. Test a user who has not granted consent.
5. Test a user who has already granted consent.
6. Confirm whether a consent popup appears when expected.
7. Confirm whether token exchange is reached.
8. Confirm whether authenticated Discord name/avatar appears.
9. Capture debug console output for success and failure cases.

Success criteria:

- `sdk.ready()` succeeds
- auth reaches either silent success or consent popup
- token exchange succeeds
- `authenticate()` succeeds
- Sync Sesh uses real Discord identity instead of local fallback

#### Chunk 6 Prep

This is a manual verification phase. It should not make app code changes unless the live test finds a concrete bug.

Preflight checklist before changing Discord Developer Portal mappings:

1. Render service is deployed from the current branch.
2. Render service uses:
   - build command: `npm ci`
   - start command: `npm run start:sync-server`
3. Render env contains:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI=https://127.0.0.1`
4. Open:
   - `https://<render-service>.onrender.com/health`
5. Confirm health JSON:
   - `ok: true`
   - `discord_oauth.has_client_id: true`
   - `discord_oauth.has_client_secret: true`
   - `discord_oauth.redirect_uri: "https://127.0.0.1"`
   - `discord_oauth.missing: []`
6. Frontend deploy/env points:
   - `VITE_SYNC_SERVER_URL=https://<render-service>.onrender.com`
   - `VITE_ENABLE_DISCORD_SDK=true`
   - `VITE_DISCORD_CLIENT_ID=<same Discord application id>`

Only after the preflight passes, tell the user to change Discord Developer Portal mappings:

```text
Root mapping:
/      -> current frontend host, unless frontend also moved

Proxy path mappings:
/api   -> <render-service>.onrender.com
/ws    -> <render-service>.onrender.com
/sync  -> <render-service>.onrender.com
```

Portal mapping notes:

- Do not enter `https://`.
- Do not include `/api/discord/token` in the target.
- Keep `/api` as a prefix and the Render host as the target.
- Add `/ws` if it is missing.
- Keep `/sync` for compatibility even though `/ws` is preferred.

Discord Activity test matrix:

1. DM launch with an account that has already granted consent.
2. DM launch after revoking/removing app consent if practical.
3. Small test server launch with the app owner/developer account.
4. Small test server launch with a second account if available.

For each row:

1. Launch the Activity.
2. Open the hidden console by typing `console`.
3. Run `clear`.
4. Run `snapshot`.
5. Run `filter auth`.
6. Click `Retry Discord Identity` or run `retry`.
7. Wait until auth settles.
8. Run `filter all`.
9. Run `copy` and preserve the copied log if the result is unexpected.

Expected success log sequence:

```text
sdk:ready:success
auth:silent:start
auth:silent:success
auth:token-exchange:start
auth:token-exchange:success
auth:authenticate:start
auth:authenticate:success
identity:authenticated_discord
sync:connect:success
```

Expected first-consent sequence:

```text
sdk:ready:success
auth:silent:start
auth:silent:failed
auth:consent:start
auth:consent:success
auth:token-exchange:start
auth:token-exchange:success
auth:authenticate:start
auth:authenticate:success
identity:authenticated_discord
sync:connect:success
```

Expected loading-screen signals:

- `DISCORD_RUNTIME` reaches ready or degraded.
- `DISCORD_AUTH` reaches ready or degraded.
- `SYNC_TRANSPORT` reaches connected.
- The app leaves the loading screen once required sync/lobby steps complete.

Failure interpretation:

- `auth:consent:success` appears but `auth:token-exchange:failed` follows:
  - inspect Render logs for `/api/discord/token`
  - check `DISCORD_CLIENT_SECRET`
  - check `DISCORD_REDIRECT_URI`
  - check `/api` portal mapping
- no token exchange request reaches Render:
  - check Discord `/api` mapping target
  - check Activity is using the expected app/client id
  - check frontend `VITE_SYNC_SERVER_URL`
- sync never connects but auth succeeds:
  - check `/ws` mapping
  - check Render websocket service is alive
  - keep `/sync` as fallback mapping
- auth succeeds but identity remains fallback:
  - capture `snapshot` and `filter auth` output before changing code

Evidence to record in this doc after testing:

```text
Row:
Date/time:
Frontend host:
Render host:
Account/context:
Portal mappings changed: yes/no
Permission prompt shown: yes/no
Final identity source:
Token exchange reached Render: yes/no
Sync connected: yes/no
Left loading screen: yes/no
Key auth lines:
Notes:
```

Chunk 6 completion rule:

- Mark Chunk 6 `[x]` only after at least one Discord Activity launch reaches:
  - authenticated Discord identity
  - successful token exchange through Render
  - successful sync connection through Render
  - app leaves the loading screen

Do not start Chunk 7 cleanup until Chunk 6 is marked `[x]`.

### [ ] Chunk 7: Cleanup Obsolete Bug 1 Diagnostics

Goal:

Remove or clearly retire old diagnostic paths after the new auth path is proven.

Scope:

- review `/auth-harness`
- review `public/static-probe.html`
- review `public/embed-diagnostics.html`
- update `docs/bugs/bug_1.md` with the final outcome
- keep anything that remains useful for future Discord debugging

Success criteria:

- Bug 1 docs clearly separate historical failed attempts from the final fix
- app code no longer carries unnecessary white-box probe baggage
- cleanup happens only after real auth is verified

## Recommended First Codex Prompt

Use this for the first implementation turn:

```md
Implement Chunk 1 from `docs/bugs/bug_1_discord_auth_recovery_plan.md`.

In Sync Sesh, add a small clean Discord authorize helper in `src/lib/discord/embeddedApp.ts` based on the working `Discord-Test-Farding/client/src/discord/auth.ts` pattern. The helper should support silent `prompt: "none"` and consent `prompt: "consent"` modes, isolate the SDK type cast needed for consent, keep scope as `["identify"]`, omit frontend `redirect_uri`, preserve the existing authorize timeout/code extraction behavior, and keep changes tightly scoped. Update `changelog.md` because this is a code change, then run `npm.cmd run build`.
```

## Notes For Future Codex Turns

- Read this plan and `docs/bugs/bug_1.md` before changing auth code.
- Read the clean repo auth files before each implementation chunk.
- Do not merge multiple chunks unless the user explicitly asks.
- Do not add new Discord scopes during this recovery.
- Do not store access tokens outside memory.
- Do not remove local fallback until authenticated Discord identity is proven in the real Activity.
- Code changes require a top entry in `changelog.md`.
- Normal verification is `npm.cmd run build`.
