# Discord Activity Identity Vision

## Purpose

This vision defines how Sync Sesh should resolve a real Discord user's name and profile picture inside the Discord Activity runtime.

The goal is simple:

- When a user launches the Activity in Discord, the app should resolve that user's Discord identity.
- On the first launch, Discord should be allowed to show consent if it is needed.
- After consent, the app should use the user's real display name and avatar instead of a generated fallback profile.
- On later launches, the app should prefer a silent refresh path when Discord already has prior consent.

This work is about identity correctness first, not visual redesign.

## Product Recommendation

Keep the current embedded-activity identity architecture, but change the authorization behavior and tighten the runtime diagnostics.

Recommended behavior:

- Try silent Discord authorization first when possible.
- If silent authorization fails because the user has not previously granted consent, retry with an interactive authorization request.
- Keep the current local profile fallback, but only as a failure-safe path.
- Make the activity clearly report whether it is using:
  - real Discord identity
  - best-effort participant identity
  - local fallback identity
- Add explicit setup checks so deployment mistakes are easier to spot.

Recommended user experience:

1. User launches Sync Sesh in Discord.
2. Activity boots the Discord SDK.
3. Activity attempts silent identity resolution.
4. If silent auth is unavailable, the Activity requests interactive consent.
5. After successful consent, the Activity shows the user's Discord name and avatar.
6. On future launches, the Activity should usually resolve identity silently.

## Why Now

The app already has most of the identity plumbing, but it is not reliably reaching the successful authenticated path.

Current strengths:

- The app already uses Discord's Embedded App SDK.
- The app already has a backend token exchange endpoint.
- The app already knows how to turn Discord user data into `displayName` and `avatarUrl`.
- The lobby UI already renders `avatarUrl` and `displayName`.
- The app already surfaces a Discord identity warning banner when fallback is active.

Current pressure:

- The current first-run experience can fall back to generated/local identities instead of prompting for real consent.
- Local fallback is useful for safety, but it hides the real auth failure path.
- Runtime configuration is easy to misconfigure without immediate clear diagnosis.
- The current retry path appears to repeat the same silent-only auth behavior instead of escalating to interactive consent.

## Code Facts

Facts from code review on 2026-04-28:

- `src/lib/discord/embeddedApp.ts` is the main Discord identity bootstrap path.
- `src/lib/discord/embeddedApp.ts` defaults `resolveDiscordIdentity(..., authPrompt = "none")`.
- `src/lib/discord/embeddedApp.ts` adds `prompt: "none"` to `sdk.commands.authorize(...)` when `authPrompt === "none"`.
- `prompt: "none"` means the request is silent-only and should not display first-time consent UI.
- `src/hooks/useDabSyncSession.ts` calls `initializeEmbeddedApp(...)` on startup without passing `authPrompt`.
- `src/hooks/useDabSyncSession.ts` also calls `initializeEmbeddedApp(...)` in `retryDiscordProfile()` without passing `authPrompt`.
- `src/lib/discord/embeddedApp.ts` catches authorization/token/authentication failures and falls back to a local profile.
- `src/lib/discord/embeddedApp.ts` can sometimes build a best-effort Discord profile from participant/current-user events before the full OAuth path completes.
- `src/lib/discord/user.ts` already maps Discord identity into:
  - guild nickname first
  - then global name
  - then username
- `src/lib/discord/user.ts` already builds Discord CDN avatar URLs, including guild avatar fallback behavior.
- `src/components/LobbyPanel.tsx` already renders `user.avatarUrl` when it exists.
- `src/screens/MainScreen.tsx` already shows a warning banner when `sdkState.identitySource === "local"` or `sdkState.authError` exists.
- `server/sync-server.ts` already exposes `POST /api/discord/token` for OAuth code exchange.
- `server/sync-server.ts` expects `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`.
- `README.md` states the Discord SDK only boots when `VITE_ENABLE_DISCORD_SDK=true` and a valid `VITE_DISCORD_CLIENT_ID` exists.
- This workspace currently has no `.env` or `.env.local` file checked in at the repo root.

## Current Diagnosis

The most likely primary cause of fallback inside the real Discord Activity flow is the silent-only authorization behavior.

Current startup behavior:

```text
initializeEmbeddedApp()
  -> resolveDiscordIdentity(... authPrompt defaults to "none")
    -> sdk.commands.authorize({ ..., prompt: "none" })
      -> no first-time consent UI allowed
      -> no usable authorization code for first-run users
      -> auth failure
      -> fallback local profile
```

This means the app is trying to behave like a returning authorized Activity user even on first launch.

That does not match the desired Whiteboard-like flow:

```text
first launch:
  silent attempt if possible
  if not authorized yet -> show Discord consent
  then store/benefit from prior consent

later launches:
  silent auth usually succeeds
```

## Secondary Risk Areas

The silent-only auth behavior looks like the main product bug, but there are also deployment/setup risks that can independently force fallback:

- `VITE_ENABLE_DISCORD_SDK` not set to `true`
- missing `VITE_DISCORD_CLIENT_ID`
- missing `DISCORD_CLIENT_SECRET` on the sync server
- `DISCORD_REDIRECT_URI` mismatch between code and Discord Developer Portal
- sync server not reachable from the Activity runtime for `/api/discord/token`
- remote proxy mapping issues when the Activity is hosted behind Discord's URL mappings

These should be treated as first-class diagnostics, not hidden assumptions.

## Desired Identity Contract

Identity resolution should have a clear precedence order:

```text
1. Authenticated Discord identity
2. Best-effort Discord participant identity
3. Local fallback profile
```

Expected data contract after success:

```text
LocalProfile
  id = Discord user id
  displayName = guild nickname || global name || username
  avatarUrl = guild avatar || user avatar || default Discord avatar
  avatarSeed = deterministic fallback seed derived from display name
```

Expected authorization contract:

```text
startup
  -> try silent auth
  -> if silent auth says no prior consent, retry interactively
  -> if interactive auth succeeds, persist and use Discord identity
  -> if auth still fails, keep local fallback and surface the reason
```

## Design Direction

This should feel invisible when healthy and obvious when broken.

When healthy:

- The user sees their real Discord profile with no extra app-specific profile setup.
- Returning users usually do not see a consent prompt.
- The fallback profile path is rare.

When broken:

- The UI should indicate exactly whether the failure is:
  - SDK disabled
  - missing client ID
  - authorize failure
  - token exchange failure
  - authenticate failure
  - best-effort profile only
- The retry control should escalate behavior meaningfully, not just repeat the same request.

## Target Architecture

Recommended auth control flow:

```text
initializeEmbeddedApp
  -> sdk.ready()
  -> resolveBestEffortDiscordProfile()
  -> try resolveDiscordIdentity(authPrompt = "none")
  -> if auth failure is consent-related or no code returned:
       retry resolveDiscordIdentity(authPrompt = "interactive")
  -> if success:
       set identitySource = "discord"
  -> else if best-effort Discord profile exists:
       set identitySource = "discord"
       preserve auth error diagnostics
  -> else:
       set identitySource = "local"
```

Recommended retry behavior:

```text
Retry Discord Identity button
  -> always use interactive auth retry
  -> do not repeat silent-only auth
```

Recommended diagnostics shape:

```ts
type DiscordIdentityResolutionMode =
  | "authenticated_discord"
  | "participant_discord"
  | "local_fallback";
```

This can stay internal if UI copy is simpler, but the code should model the distinction clearly.

## Phase Plan

- [x] DAI-1: Make First-Run Discord Consent Work.
- [x] DAI-2: Tighten Deployment And Runtime Diagnostics.
- [x] DAI-3: Clarify Identity Source State And UI Messaging.
- [ ] DAI-4: Validate Activity Runtime End To End.

## Manager Execution Plan

Run one identity phase at a time.

Recommended order:

1. DAI-1 first because it addresses the main product failure.
2. DAI-2 second so future auth problems are easier to diagnose.
3. DAI-3 third to clean up the state model and banner messaging.
4. DAI-4 last as a verification and hardening pass.

Expected implementation files across the whole vision:

- `src/lib/discord/embeddedApp.ts`
- `src/hooks/useDabSyncSession.ts`
- `src/screens/MainScreen.tsx`
- `server/sync-server.ts`
- `README.md`
- optional debug/helper files if needed, but avoid broad refactors

Files to avoid unless a phase explicitly requires them:

- normal lobby/session reducer logic
- 3D world files
- SoundCloud and DAW systems
- package/dependency changes unless absolutely necessary

## DAI-1: Make First-Run Discord Consent Work

Status: `[x]` complete.

### Summary

Fix the authorization flow so first-time Discord Activity users can grant consent and receive a real Discord-backed profile.

### Implementation Spec

Expected files:

- `src/lib/discord/embeddedApp.ts`
- `src/hooks/useDabSyncSession.ts`

Expected work:

- Preserve the current silent-first strategy where useful.
- Detect silent authorization failure and retry with interactive consent.
- Ensure startup can escalate from `prompt: "none"` to an interactive request.
- Ensure the Retry button path uses interactive consent instead of repeating the silent-only request.
- Keep local fallback intact as a last resort.
- Preserve the existing best-effort participant-profile behavior unless it conflicts with the authenticated path.

Suggested flow:

```text
startup:
  try silent auth
  if silent auth does not return a code or indicates no prior consent:
    retry interactive auth

manual retry:
  go straight to interactive auth
```

Acceptance criteria:

- First-time users in the Activity can receive a Discord consent prompt.
- Successful consent produces a `LocalProfile` with Discord `id`, `displayName`, and `avatarUrl`.
- Returning users can still resolve identity without unnecessary repeated prompts when Discord allows silent auth.
- Retry performs a real escalation path.
- Local fallback still works when Discord identity truly cannot be established.

Build and manual checks:

- Run `npm.cmd run build`.
- Launch the Activity with a user who has not previously granted consent.
- Confirm the user can grant consent and then see their real profile.
- Relaunch the Activity and confirm silent auth is attempted first.
- Verify retry works after intentionally failing the first auth attempt.

Risks:

- Overly broad retry logic could create repeated consent prompts.
- Best-effort participant identity may mask whether full authenticated identity succeeded.

Non-goals:

- Do not redesign lobby UI.
- Do not change sync/session reducer behavior.
- Do not add new scopes unless required.

Checklist Items Achieved:

- Kept the existing embedded Discord identity architecture in place.
- Added a silent-first, interactive-second identity bootstrap path for startup.
- Limited the automatic escalation path to silent authorize failures instead of all Discord auth failures.
- Changed the manual Retry path to request interactive consent immediately.
- Preserved local fallback behavior when Discord identity still cannot be established.

Completed Implementation:

- `src/lib/discord/embeddedApp.ts` now routes identity setup through a shared helper that tries silent authorization first and retries interactively when the silent authorize step fails.
- `src/hooks/useDabSyncSession.ts` now sends `authPrompt: "interactive"` for the manual Retry flow so the retry button performs a real escalation.
- `changelog.md` includes the DAI-1 completion entry.
- Build result: `npm.cmd run build` passed with the existing Vite chunk-size warning.

## DAI-2: Tighten Deployment And Runtime Diagnostics

Status: `[x]` complete.

### Summary

Make configuration and token-exchange failures obvious.

### Implementation Spec

Expected files:

- `server/sync-server.ts`
- `src/lib/discord/embeddedApp.ts`
- `README.md`

Expected work:

- Audit and tighten the exact env variable contract for frontend and sync server.
- Ensure the docs include both `VITE_DISCORD_REDIRECT_URI` and `DISCORD_REDIRECT_URI`.
- Ensure the docs include both frontend and backend client-id expectations explicitly:
  - `VITE_DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `VITE_ENABLE_DISCORD_SDK`
  - `VITE_SYNC_SERVER_URL`
- Clarify in docs that the frontend currently reads `VITE_DISCORD_REDIRECT_URI`, while the sync server reads `DISCORD_REDIRECT_URI` with fallback support from `VITE_DISCORD_REDIRECT_URI`.
- Make startup and token exchange logs easier to correlate by `attemptId`, build id, and auth stage.
- Distinguish these failure buckets in surfaced frontend errors:
  - SDK disabled or missing client ID
  - authorize failure
  - token exchange failure
  - authenticate failure
  - server-side OAuth not configured
  - redirect mismatch or Discord OAuth response error
- Verify hosted/proxied `/api/discord/token` expectations are documented clearly for Discord Activity deployments.

Code seams to use:

- `src/lib/discord/embeddedApp.ts`
  - `resolveDiscordAuthEndpoint()`
  - `resolveDiscordRedirectUri()`
  - `exchangeDiscordAuthCode()`
  - `resolveDiscordIdentity()`
  - startup error return paths in `initializeEmbeddedApp()` and `retryDiscordIdentity()`
- `server/sync-server.ts`
  - env loading near `loadEnvFile(".env")` and `loadEnvFile(".env.local")`
  - server env resolution for `discordClientId`, `discordClientSecret`, and `discordRedirectUri`
  - `handleDiscordTokenExchange()`
  - `/health` response payload
  - startup console logging in `httpServer.listen(...)`
- `README.md`
  - `Environment variables`
  - `Discord Activity wiring`

Expected implementation boundaries:

- Keep this phase focused on diagnostics and docs.
- Avoid changing the authorization product flow introduced in DAI-1 unless a diagnostic fix strictly requires it.
- Avoid changing lobby rendering or session state.
- Avoid adding a large new UI surface; prefer improving existing banner/error text and server logs.

Recommended implementation details:

- Add a small frontend helper to classify Discord auth errors by stage/source instead of only passing raw strings through.
- Preserve the current `attemptId` threading and add it anywhere error paths currently drop context.
- Expand the `/health` payload only if it helps deployment debugging without exposing secrets.
- Update the README example block so it reflects the actual dual frontend/backend env setup instead of the partial current example.
- Document the expected Discord Developer Portal redirect URI match requirement in one explicit setup sequence.

Acceptance criteria:

- Missing frontend env vars are clearly reported.
- Missing backend secret or redirect mismatch is clearly reported.
- README setup steps match the implemented env-variable names.
- The sync server logs make it obvious whether the token exchange route received the request and which attempt failed.
- Frontend auth errors retain enough context to tell whether the failure happened before or after token exchange.
- Discord Activity deployment docs explain how `/api/discord/token` is reached from the embedded runtime.

Build and manual checks:

- Run `npm.cmd run build`.
- Run the sync server with deliberately missing Discord secrets and verify the surfaced error is actionable.
- Run the app with `VITE_ENABLE_DISCORD_SDK=false` and verify the startup error remains explicit and accurate.
- Run the app with a bad or missing `VITE_DISCORD_CLIENT_ID` and verify the frontend failure is distinguishable from server OAuth failure.
- Run the sync server with an intentionally wrong `DISCORD_REDIRECT_URI` and verify the returned token-exchange error is specific enough to diagnose.
- Hit `/health` and verify the reported OAuth config summary matches the configured environment without leaking secrets.

Risks:

- Logging too much detail could create noisy output.
- Surfacing raw Discord OAuth response text without normalization could create confusing user-facing copy.
- It is easy to accidentally document browser-only local development and Discord Activity deployment as if they are the same thing.

Non-goals:

- Do not add a full admin diagnostics panel.
- Do not redesign the Discord identity banner beyond what is necessary for clearer diagnostics.
- Do not change identity-source modeling yet; that belongs to DAI-3.

Checklist Items Achieved:

- Tightened the frontend Discord auth config errors so missing Activity env values point to the expected variable names and auth endpoint.
- Expanded token-exchange failure messages to carry build id, attempt id, missing server config, and redirect-mismatch hints back to the frontend.
- Tightened sync-server OAuth diagnostics with explicit missing-variable reporting, richer token-exchange logs, and a more useful `/health` summary.
- Rewrote the README Discord setup section so the frontend and sync-server env responsibilities are documented separately and consistently.

Completed Implementation:

- `src/lib/discord/embeddedApp.ts` now includes clearer frontend config diagnostics plus richer token-exchange error propagation with endpoint, attempt, build, missing-config, and redirect-mismatch context.
- `server/sync-server.ts` now reports missing OAuth config keys explicitly, includes build and attempt IDs in token-exchange diagnostics, adds redirect-mismatch hints for `invalid_grant`, and exposes a fuller non-secret OAuth summary from `/health`.
- `README.md` now documents the real frontend/backend Discord env split and the expected Discord Activity setup flow.
- `changelog.md` includes the DAI-2 completion entry.
- Build result: `npm.cmd run build` passed with the existing Vite chunk-size warning.

## DAI-3: Clarify Identity Source State And UI Messaging

Status: `[x]` complete.

### Summary

Make the app's identity state easier to reason about in code and in the warning banner.

### Implementation Spec

Expected files:

- `src/lib/discord/embeddedApp.ts`
- `src/hooks/useDabSyncSession.ts`
- `src/screens/MainScreen.tsx`

Expected work:

- Separate fully authenticated Discord identity from best-effort participant identity.
- Avoid treating all non-local states as equivalent.
- Update the banner copy so it reflects whether the app has:
  - full Discord auth
  - partial Discord identity only
  - local fallback only
- Update footer/status wording so it no longer collapses all Discord-backed states into one `discord` bucket.

Code seams to use:

- `src/lib/discord/embeddedApp.ts`
  - `EmbeddedAppState`
  - return paths in `initializeEmbeddedApp()`
  - return paths in `retryDiscordIdentity()`
  - best-effort participant profile handling near `resolveBestEffortDiscordProfile()`
- `src/hooks/useDabSyncSession.ts`
  - places that currently set `identitySource: "discord"`
  - startup `onProfileUpdate`
  - manual retry `onProfileUpdate`
  - catch/fallback state updates that preserve `identitySource`
- `src/screens/MainScreen.tsx`
  - Discord identity warning banner logic around `sdkState.enabled && (sdkState.authError || sdkState.identitySource === "local")`
- `src/components/StatusFooter.tsx`
  - current `Identity:` label output

Current state issues to fix:

- `EmbeddedAppState.identitySource` is currently only `"discord" | "local"`, which merges:
  - fully authenticated Discord identity
  - best-effort participant/current-user identity gathered before full auth
- `useDabSyncSession` sets `identitySource: "discord"` in `onProfileUpdate`, even though that callback may fire from either:
  - full authenticated profile updates
  - best-effort Discord profile updates
- `MainScreen` currently shows one warning bucket for `authError || identitySource === "local"`, which cannot distinguish:
  - full auth failure with partial Discord identity still available
  - full local fallback
- `StatusFooter` currently renders `discord` vs `local fallback`, which hides the degraded middle state.

Recommended state shape:

```ts
type EmbeddedIdentitySource =
  | "authenticated_discord"
  | "participant_discord"
  | "local_fallback";
```

Recommended behavior:

- Use `authenticated_discord` only after the full authorize -> token exchange -> authenticate path succeeds.
- Use `participant_discord` when the app has a Discord-derived profile from SDK participant/current-user data but full auth is not yet complete or has failed.
- Use `local_fallback` only when the app is using the generated/local profile path.

Recommended UI behavior:

- No warning banner for `authenticated_discord`.
- A softer degraded-state banner for `participant_discord` when `authError` exists, explaining that the visible name/avatar came from Discord but full identity refresh did not finish.
- The existing stronger warning banner for `local_fallback`.
- Footer wording should surface the real identity source label directly:
  - `discord authenticated`
  - `discord participant`
  - `local fallback`

Implementation boundaries:

- Keep this phase focused on identity-source modeling and messaging.
- Do not change the OAuth setup logic from DAI-1 or DAI-2 unless strictly required by the new state names.
- Do not redesign the app shell or add a new diagnostics panel.
- Prefer updating existing components and types over introducing a large new abstraction layer.

Acceptance criteria:

- The UI no longer collapses partial Discord identity and full Discord auth into the same mental bucket.
- Developers can tell which layer succeeded when debugging.
- `StatusFooter` shows the correct identity mode for all three cases.
- `MainScreen` banner copy differs between participant-only Discord identity and full local fallback.
- Existing retry controls still work without behavior regressions.

Build and manual checks:

- Run `npm.cmd run build`.
- Verify banner copy across:
  - full auth success
  - participant-only identity
  - local fallback
- Verify the footer identity label changes across those same three cases.
- Verify startup and retry flows still update `authStage`, `authError`, and `startupError` coherently after the identity-source split.

Risks:

- Too much state detail could confuse the UX if surfaced poorly.
- Changing the `identitySource` enum can ripple through several existing optimistic state updates in `useDabSyncSession`.
- Best-effort participant profile updates may race with later authenticated updates if the transition rules are not explicit.

Non-goals:

- Do not redesign the rest of the app shell.
- Do not change server-side OAuth behavior.
- Do not add new Discord scopes.

Checklist Items Achieved:

- Replaced the old two-state `discord | local` model with explicit authenticated, participant-only, and local-fallback identity states.
- Threaded the identity source through the Discord bootstrap profile callbacks so best-effort participant profiles and authenticated profiles no longer reuse the same optimistic state label.
- Updated the main warning banner to distinguish participant-only degraded Discord identity from full local fallback.
- Updated the footer identity readout so developers can see the real identity source mode directly.

Completed Implementation:

- `src/lib/discord/embeddedApp.ts` now exports `EmbeddedIdentitySource`, uses the three-way identity source across startup/retry return paths, and tags `onProfileUpdate` callbacks with the real source of the resolved profile.
- `src/hooks/useDabSyncSession.ts` now preserves the explicit identity source coming from the Discord bootstrap during startup and retry updates instead of collapsing everything into `discord`.
- `src/screens/MainScreen.tsx` now renders distinct banner copy for participant-only degraded Discord identity versus full local fallback, while keeping the existing retry control.
- `src/components/StatusFooter.tsx` now shows `discord authenticated`, `discord participant`, or `local fallback`.
- `changelog.md` includes the DAI-3 completion entry.
- Build result: `npm.cmd run build` passed with the existing Vite chunk-size warning.

## DAI-4: Validate Activity Runtime End To End

Status: `[ ]` not started.

### Summary

Prove the Discord Activity identity flow works in the real deployment context.

### Implementation Spec

Expected files:

- primarily docs and any small follow-up patches discovered during validation

Expected work:

- Run through first-time and returning-user checks in the actual Discord Activity environment.
- Verify token exchange works through the deployed sync server.
- Verify avatar/name display in the lobby and any other visible user lists.
- Capture any remaining edge cases discovered only in the real Discord runtime.

Acceptance criteria:

- First-time consent works in the real Activity.
- Returning users resolve identity without unnecessary friction.
- Real display names and avatars appear consistently in the lobby.

Build and manual checks:

- `npm.cmd run build`
- Discord Activity runtime verification with at least:
  - one first-time user
  - one returning user
  - one failure-mode check for broken server config

Risks:

- Some issues may only reproduce in Discord's hosted Activity iframe and not in local browser development.

Non-goals:

- Do not expand into non-identity Activity features.

## Open Questions

- Should startup always escalate automatically to interactive consent, or should it do so only after a specific silent-auth failure signature?
- Do we want the Retry button to always be interactive, even if startup remains silent-first?
- Should best-effort participant identity be shown as healthy enough for normal use, or should it remain a degraded state?
- Should the app keep using generated-name fallback in Activity mode, or should Activity mode prefer a clearer error when Discord identity is unavailable?

## Build And Manual Checks

- No build was run for this docs-only vision write-up.
- Implementation phases should use `npm.cmd run build`.
- Real validation must happen inside the Discord Activity runtime, not only in a normal browser tab.
