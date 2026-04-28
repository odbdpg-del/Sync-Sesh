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

- [ ] DAI-1: Make First-Run Discord Consent Work.
- [ ] DAI-2: Tighten Deployment And Runtime Diagnostics.
- [ ] DAI-3: Clarify Identity Source State And UI Messaging.
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

Status: `[ ]` not started.

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

## DAI-2: Tighten Deployment And Runtime Diagnostics

Status: `[ ]` not started.

### Summary

Make configuration and token-exchange failures obvious.

### Implementation Spec

Expected files:

- `server/sync-server.ts`
- `src/lib/discord/embeddedApp.ts`
- `README.md`

Expected work:

- Audit the exact env variable contract for frontend and sync server.
- Ensure the docs include both `VITE_DISCORD_REDIRECT_URI` and `DISCORD_REDIRECT_URI`.
- Make startup and token exchange logs easier to correlate by attempt ID.
- Distinguish config failures from consent failures in surfaced messages.
- Verify hosted/proxied `/api/discord/token` expectations are documented clearly.

Acceptance criteria:

- Missing frontend env vars are clearly reported.
- Missing backend secret or redirect mismatch is clearly reported.
- README setup steps match the implemented env-variable names.

Build and manual checks:

- Run `npm.cmd run build`.
- Run the sync server with deliberately missing Discord secrets and verify the surfaced error is actionable.

Risks:

- Logging too much detail could create noisy output.

Non-goals:

- Do not add a full admin diagnostics panel.

## DAI-3: Clarify Identity Source State And UI Messaging

Status: `[ ]` not started.

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

Acceptance criteria:

- The UI no longer collapses partial Discord identity and full Discord auth into the same mental bucket.
- Developers can tell which layer succeeded when debugging.

Build and manual checks:

- Run `npm.cmd run build`.
- Verify banner copy across:
  - full auth success
  - participant-only identity
  - local fallback

Risks:

- Too much state detail could confuse the UX if surfaced poorly.

Non-goals:

- Do not redesign the rest of the app shell.

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

