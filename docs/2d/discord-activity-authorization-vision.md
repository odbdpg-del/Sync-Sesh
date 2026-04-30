# Discord Activity Authorization Vision

## Purpose

This vision defines the correct Discord Activity authorization flow for Sync Sesh, records what we have already verified, and lays out a step-by-step plan to move from a fragile debug state to a reliable production-ready authorization experience.

The goal is simple:

- when a user launches the Activity, Discord authorization should either complete cleanly or fail with an exact, actionable reason
- when authorization succeeds, the user should see their real Discord name and avatar
- when authorization fails, the app should expose enough signal to fix the problem without guesswork

## Problem Statement

Right now, Sync Sesh can start the Discord SDK and connect sync successfully, but Discord authorization is still failing at the `authorize()` step for at least one real Activity launch path.

Observed sequence from the debug console:

- `sdk:ready:success`
- `profile:best-effort:start`
- `profile:best-effort:miss`
- `auth:silent:start`
- `auth:silent:failed`
- `auth:silent:escalated`
- `auth:interactive:start`
- `auth:interactive:failed`
- `identity:local_fallback`
- `sync:connect:success`

This means the current blocker is not:

- frontend SDK enablement
- backend `/api/discord/token` routing
- sync connectivity
- post-authorize token exchange
- post-authorize authenticate flow

The current blocker is the Discord-side authorization handshake itself.

## Desired Outcome

Sync Sesh should follow a reliable golden-path authorization contract:

1. Activity launches inside Discord.
2. Embedded App SDK initializes and becomes ready.
3. App attempts silent auth first.
4. If silent auth cannot complete, app escalates to interactive auth.
5. Interactive auth either:
   - succeeds and returns a code, or
   - fails with enough detail to identify the exact Discord-side cause.
6. Backend exchanges the code for an access token.
7. Frontend authenticates with the SDK using the access token.
8. App upgrades to authenticated Discord identity.
9. User sees real Discord display name and avatar.

## Golden Authorization Flow

This is the target implementation model for Sync Sesh and matches the general Discord Activity OAuth pattern.

### Client Side

1. Construct `DiscordSDK(clientId)`.
2. Await `sdk.ready()`.
3. Call `sdk.commands.authorize(...)`.
   - first with silent prompt semantics
   - then retry interactively if silent auth fails
4. Send the returned auth `code` to the backend token exchange route.
5. Receive an `access_token`.
6. Call `sdk.commands.authenticate({ access_token })`.
7. Resolve user profile and subscribe to update events.

### Server Side

1. Accept the auth `code`.
2. Exchange it against Discord OAuth with:
   - `client_id`
   - `client_secret`
   - `redirect_uri`
3. Return an `access_token` to the Activity client.

### Activity UX

1. First-time users should be able to see an interactive consent path.
2. Returning users should usually pass through silent auth or a lightweight interactive fallback.
3. Failure should never collapse into an unexplained local fallback.

## What We Have Already Verified

These facts are already known from code review and live testing.

### Frontend

- `VITE_ENABLE_DISCORD_SDK` now exists and enables SDK startup.
- `VITE_DISCORD_CLIENT_ID` is set.
- `VITE_DISCORD_REDIRECT_URI` is set to `https://127.0.0.1`.
- `VITE_SYNC_SERVER_URL` is pointing to the hosted sync/backend service.

### Backend

- `/health` reports:
  - `has_client_id: true`
  - `has_client_secret: true`
  - `redirect_uri: https://127.0.0.1`
- backend `/api/discord/token` route is live

### Discord URL Mappings

- `/` points at the frontend static site
- `/sync` points at the backend service
- `/api` points at the backend service

### Discord App Configuration

- `User Install` is enabled
- `Guild Install` is enabled
- redirect URI `https://127.0.0.1` exists

### Runtime Behavior

- SDK startup is no longer disabled by environment
- sync connects successfully
- authorization fails before token exchange

## Current Likely Failure Zones

Based on what remains, the most likely failure zones are:

1. Discord app and Activity launch context mismatch
- The Activity being launched in Discord may not be the same app as the configured client ID.

2. Discord development access restrictions
- Non-distributed Activities may only work for the app owner or members of the developer team.

3. Discord guild/account permission context
- Some authorization paths may still depend on server context or server permissions during development.

4. Missing or insufficient raw authorize diagnostics
- The SDK currently collapses the failure into `Discord authorize request failed.`
- We need better logging around the exact thrown error shape and surrounding conditions.

## Code Facts

Facts from code review on 2026-04-28:

- `src/lib/discord/embeddedApp.ts`
  - owns SDK startup
  - owns authorize/token exchange/authenticate flow
  - already tries silent auth and escalates to interactive auth
  - uses `DISCORD_AUTHORIZE_TIMEOUT_MS = 45_000`

- `src/hooks/useDabSyncSession.ts`
  - owns retry flow and top-level auth lifecycle coordination
  - now uses stage-aware auth watchdogs
  - no longer wraps retry in a shorter competing timeout race than the SDK-level authorize timeout

- `src/components/DebugConsoleWindow.tsx`
  - provides the read-only operator console used during live Activity debugging

- `src/hooks/useDebugConsoleState.ts`
  - stores snapshot and event log data used by the console

- `src/screens/MainScreen.tsx`
  - mounts the console
  - mounts the Discord identity retry banner

## Product Recommendation

Treat authorization as a dedicated system with its own rollout plan rather than as a side effect of SDK startup.

Recommended approach:

- define one golden authorization contract
- tighten our own retry and timeout behavior
- improve authorize-stage diagnostics
- validate Discord launch context assumptions with a repeatable test matrix
- only after that, refine the user-facing fallback behavior

## Authorization Test Matrix

We should stop relying on a single fuzzy test account and instead validate against a clear matrix.

Recommended matrix:

1. app owner or developer-team account in a server they control
2. app owner or developer-team account in the current shared server
3. non-owner account with admin permissions in a controlled server
4. non-owner account without admin permissions in a controlled server
5. fresh account only if earlier rows remain inconclusive

For each row, record:

- did silent auth fail?
- did interactive auth show a prompt?
- did interactive auth return a code?
- did token exchange happen?
- did authenticate happen?
- final `identitySource`

## Phase Plan

- [x] DAV-1: Document The Golden Authorization Contract And Deployment Requirements.
- [x] DAV-2: Fix Local Retry And Timeout Behavior So Client Logic Cannot Prematurely Fail.
- [x] DAV-3: Expand Authorize-Stage Diagnostics And Console Logging.
- [~] DAV-4: Validate Discord Launch Context Using A Repeatable Test Matrix.
- [ ] DAV-5: Tighten User-Facing Authorization UX And Recovery Paths.

## DAV-1: Document The Golden Authorization Contract And Deployment Requirements

Status: `[x]` completed.

### Summary

Write down exactly what must be true across frontend, backend, Discord portal config, and Activity launch context for authorization to work.

### Scope

- freeze the intended auth flow
- freeze required env variables
- freeze required Discord portal settings
- freeze required URL mappings
- freeze the validation checklist

### Deliverables

- this vision doc
- exact deployment checklist for frontend/backend/Discord portal
- one source of truth for authorization requirements

### Acceptance Criteria

- team can answer “what must be configured for auth to work?” from one doc
- team can answer “where does auth fail?” by mapping the stage to the flow

### Checklist Items Achieved

- Golden authorization contract is documented in one place.
- Required frontend, backend, Discord portal, and URL mapping expectations are listed.
- Current live debug evidence and likely failure zones are captured.
- Recommended validation matrix is defined for later runtime testing.

### Completed Implementation

- Added this authorization vision doc as the source of truth for Sync Sesh Discord Activity authorization work.
- Recorded the currently verified backend health state, frontend env shape, Discord portal settings, and debug-console auth timeline so future phases can work from evidence instead of memory.

## DAV-2: Fix Local Retry And Timeout Behavior So Client Logic Cannot Prematurely Fail

Status: `[x]` completed.

### Summary

Remove or correct the app-side retry timeout bug so Sync Sesh does not report an authorization timeout before Discord’s own authorize timeout has expired.

### Expected Files

- `src/hooks/useDabSyncSession.ts`
- possibly `src/lib/discord/embeddedApp.ts`
- `docs/discord-activity-identity-vision.md` if phase status needs to be aligned

### Expected Work

- remove the shorter outer retry race, or
- increase retry timeout above the SDK authorize timeout, or
- make retry timeout stage-aware so it never undercuts active Discord authorization

### Implementation Spec

DAV-2 should be a narrow client-side timing fix only.

Expected files:

- `src/hooks/useDabSyncSession.ts`
- `docs/discord-activity-authorization-vision.md`
- `changelog.md`

Files to avoid:

- `server/sync-server.ts`
- `src/screens/MainScreen.tsx`
- debug console rendering files
- any Discord portal docs or README work unless a later phase requires it

Current code facts driving this phase:

- `src/lib/discord/embeddedApp.ts` already gives `sdk.commands.authorize(...)` up to `45_000ms` via `DISCORD_AUTHORIZE_TIMEOUT_MS`.
- `src/hooks/useDabSyncSession.ts` currently:
  - marks stalled non-idle auth stages as failed after `DISCORD_RETRY_TIMEOUT_MS = 20_000`
  - wraps `initializeEmbeddedApp(...)` inside a second `Promise.race(...)` with the same `20_000ms` timeout during `retryDiscordProfile`
- this means the app can report a retry failure before the SDK-level authorize flow has finished, which creates false negatives and muddies Discord-side debugging

Approved implementation direction:

- remove the outer `Promise.race(...)` timeout wrapper from `retryDiscordProfile`
- keep stage progress driven by `onAuthProgress` and final resolution from `initializeEmbeddedApp(...)`
- replace the generic stalled-stage watchdog with a stage-aware timeout that cannot fire earlier than the SDK authorize window while the app is still in `authorizing`
- if a watchdog is still useful for non-authorize stages, keep it, but make it long enough and stage-specific so it does not undercut active Discord authorization
- ensure timeout-generated messages clearly say which stage actually stalled

Preferred timing model:

- `authorizing` stage:
  - must allow longer than `45_000ms`
  - recommended timeout: at least `60_000ms`
- later stages such as:
  - `exchanging_token`
  - `authenticating`
  - `subscribing`
  can use a separate, shorter but still reasonable timeout if needed

Expected behavior after DAV-2:

- a user who clicks `Retry Discord Identity` will not see a client-generated timeout before Discord’s own authorize attempt has had enough time to complete
- immediate Discord-side authorize failures should still surface immediately
- if a stage genuinely stalls, the timeout message should name that stage accurately

Acceptance criteria:

- retry path no longer uses a shorter outer race than the SDK authorize timeout
- `authorizing` cannot be marked failed before the SDK authorize timeout window is realistically exhausted
- console logs and banner messages still update correctly during retry
- build passes

Build and manual checks:

- `npm.cmd run build`
- open Activity console, run `clear`, click `Retry Discord Identity`
- verify immediate Discord authorize failures still surface immediately
- verify no app-generated timeout appears before the authorize window should realistically expire

Risks:

- removing the outer race could leave a truly hung retry waiting too long if the stage watchdog is not updated correctly
- changing only the retry path but not the general stalled-stage watchdog would leave a second premature-failure path in place

Wishlist mapping:

- supports the goal that authorization should either complete cleanly or fail with an exact, actionable reason
- removes a known false-failure source before deeper Discord-context debugging

Non-goals:

- no richer authorize diagnostics yet
- no user-facing copy overhaul yet
- no backend changes

### Acceptance Criteria

- retry path cannot fail before SDK authorize timeout
- retry error message reflects the actual failing stage

### Checklist Items Achieved

- Removed the shorter outer retry race from `retryDiscordProfile`, so retry resolution now comes from `initializeEmbeddedApp(...)` itself.
- Replaced the generic `20s` stalled-stage watchdog with stage-aware timeouts that treat `authorizing` differently from later auth stages.
- Updated timeout-generated messages so they describe the stage that actually stalled instead of implying a generic pre-authorization failure.
- Kept the fix scoped to the client session hook and preserved the existing debug-event/banner update flow.

### Completed Implementation

- Updated `src/hooks/useDabSyncSession.ts` so `Retry Discord Identity` no longer wraps the Discord auth bootstrap in a shorter `Promise.race(...)` timeout than the SDK authorize window.
- Added a stage-aware watchdog in the same hook with a `60_000ms` allowance for `authorizing` and separate follow-up stage timeouts for `exchanging_token`, `authenticating`, and `subscribing`.
- Kept timeout failures actionable by naming the stalled stage in the banner/debug message, while still allowing immediate Discord-side authorize failures to surface right away.

## DAV-3: Expand Authorize-Stage Diagnostics And Console Logging

Status: `[x]` completed.

### Summary

Make authorize-stage failures explain themselves.

### Expected Files

- `src/lib/discord/embeddedApp.ts`
- `src/hooks/useDabSyncSession.ts`
- debug console-related files if snapshot/log fields need expansion

### Expected Work

- inspect the raw authorize error object more carefully
- log all safe non-secret error fields
- log surrounding auth context hints such as:
  - client id presence
  - redirect URI
  - auth mode
  - app build id
  - attempt id
  - Discord proxy host detection
- improve console messaging for immediate authorize failures

### Implementation Spec

DAV-3 should stay focused on the immediate authorize failure path and the debug information around it.

Expected files:

- `src/lib/discord/embeddedApp.ts`
- `src/hooks/useDabSyncSession.ts` only if a tiny pass-through or state message tweak is needed
- `docs/discord-activity-authorization-vision.md`
- `changelog.md`

Files to avoid:

- `server/sync-server.ts`
- `src/screens/MainScreen.tsx`
- `src/components/DebugConsoleWindow.tsx`
- unrelated debug-console rendering or styling work

Current code facts driving this phase:

- `requestDiscordAuthorization(...)` in `src/lib/discord/embeddedApp.ts` currently wraps `sdk.commands.authorize(...)` but only surfaces:
  - missing-code failures
  - thrown error `message`
- `resolveDiscordIdentity(...)` normalizes thrown authorize errors into:
  - `Discord authorize failed: ...`
- the console currently shows immediate failures like:
  - `auth:silent:failed - Discord authorize failed: Discord authorize request failed.`
  - `auth:interactive:failed - Discord authorize failed: Discord authorize request failed.`
- that is still not enough to distinguish:
  - Discord app mismatch
  - developer-team restriction
  - permission/context failure
  - proxy/runtime context failure

Approved implementation direction:

- add a small sanitizer/formatter for authorize-stage errors in `embeddedApp.ts`
- inspect safe fields from the raw thrown object, not just `error.message`
- include short context hints in debug output and normalized auth errors where helpful, such as:
  - auth mode (`silent` vs `interactive`)
  - attempt id suffix
  - build id
  - redirect URI
  - auth endpoint or proxy-host mode
  - whether client ID exists
  - SDK `channelId`, `guildId`, and `instanceId` when already known
- if the raw error object contains additional safe fields like `name`, `code`, or nested error text, include them in the debug detail string
- keep all diagnostics secret-safe:
  - no auth codes
  - no access tokens
  - no client secret

Recommended implementation shape:

- add a helper like `summarizeDiscordAuthorizeError(error: unknown, context: ...)`
- return:
  - a user/debug-safe normalized message
  - a richer detail string for console/debug events
- use that helper in both:
  - the thrown authorize path
  - the `auth:*:failed` debug-event emission path

Recommended output goals:

- banner/debug message should still start with `Discord authorize failed:`
- debug console detail should become more actionable, for example:
  - include raw error `name`
  - include raw error `code` if present
  - include prompt mode and attempt suffix
  - include host/proxy context when useful
- if Discord still gives nothing useful, explicitly say that the SDK returned no additional error fields

Acceptance criteria:

- authorize failures log more than the current generic message when additional safe fields exist
- debug console output makes it easier to separate app-context failures from generic SDK failures
- no secrets are exposed
- build passes

Build and manual checks:

- `npm.cmd run build`
- open console, run `clear`, click `Retry Discord Identity`
- confirm `auth:silent:failed` and `auth:interactive:failed` now include richer detail when available
- verify the user-facing error remains readable and not overly noisy

Risks:

- over-logging could create noisy console output if the formatter dumps too much raw object detail
- some Discord SDK errors may not expose additional enumerable fields, so the helper should degrade cleanly
- mixing user-facing and debug-facing copy could make the banner too technical if not kept separate

Wishlist mapping:

- supports the goal that authorization failures should be exact and actionable
- gives DAV-4 a trustworthy evidence trail for real Discord runtime testing

Non-goals:

- no backend diagnostics work
- no account/server test execution yet
- no player-facing UX rewrite yet

### Acceptance Criteria

- console output for authorize failure is more specific than `Discord authorize request failed.`
- next live test gives enough signal to separate config failure from permission/context failure

### Checklist Items Achieved

- Added a dedicated authorize-error summarizer in the Discord embedded-app bootstrap so immediate `authorize()` failures now inspect safe raw error fields instead of only echoing `error.message`.
- Expanded authorize-stage console events to include surrounding context such as auth mode, attempt suffix, build id, redirect URI, auth endpoint, host mode, and available SDK channel/guild/instance identifiers.
- Kept the user-facing normalized error readable while making the debug-console detail string substantially richer and explicit when the SDK exposes no additional safe fields.
- Kept the work secret-safe by avoiding auth-code, token, or client-secret logging and limiting diagnostics to sanitized primitive fields.

### Completed Implementation

- Updated `src/lib/discord/embeddedApp.ts` so `auth:silent:start` and `auth:interactive:start` include a compact authorize-context summary instead of only the attempt suffix.
- Added a safe authorize-error field collector and formatter in the same file, then used it to enrich `auth:*:failed` console events with SDK field summaries and runtime context like proxy-host mode, redirect URI, build id, and Discord instance metadata.
- Kept the normalized thrown error concise enough for the banner while still surfacing short hints like SDK error `code`, `status`, or `name` when Discord exposes them.

## DAV-4: Validate Discord Launch Context Using A Repeatable Test Matrix

Status: `[~]` in progress.

### Summary

Run the matrix of account/server contexts and record exactly where auth works and fails.

### Scope

- test owner/team account
- test admin account
- test current server vs controlled server
- record console output for each row

### Deliverables

- authorization results table
- narrowed root cause

### Implementation Spec

DAV-4 is a manual Discord runtime validation phase. It is not a code-change phase by default.

Expected files:

- `docs/discord-activity-authorization-vision.md`

Files to avoid unless DAV-4 uncovers a concrete bug:

- all application code
- backend code
- debug console rendering files

Required preconditions before testing:

- latest frontend deploy includes DAV-2 and DAV-3
- latest backend deploy includes the current OAuth env config
- Discord URL mappings still point to:
  - `/` -> frontend static site
  - `/sync` -> backend service
  - `/api` -> backend service

Current live experiment:

- Temporarily reduce requested Discord scopes from `identify + guilds.members.read` to `identify` only.
- Goal:
  - determine whether `guilds.members.read` is the trigger for the immediate Discord OAuth `5000` authorize failure.
- Expected interpretation:
  - if `identify`-only auth succeeds or at least opens consent, `guilds.members.read` is the likely blocker
  - if `identify`-only auth still fails immediately with the same `5000`, the problem is more likely Discord app/context specific than scope specific

Required test procedure for every matrix row:

1. Launch the Activity from Discord.
2. Open the debug console.
3. Run `clear`.
4. Click `Retry Discord Identity`.
5. Wait for the authorize flow to settle.
6. Record:
   - whether any Discord permission prompt appeared
   - final identity banner text
   - final `identitySource`
   - `auth:silent:failed` line
   - `auth:interactive:failed` line
   - whether any `auth:token-exchange:*` or `auth:authenticate:*` lines appeared

Recommended matrix rows:

1. app owner or developer-team account in a server they control
2. app owner or developer-team account in the current shared server
3. non-owner account with admin permissions in a controlled server
4. non-owner account without admin permissions in a controlled server

Recommended recording format:

```text
Row:
Account role:
Server role/context:
Permission prompt shown: yes/no
Silent auth result:
Interactive auth result:
Token exchange reached: yes/no
Authenticate reached: yes/no
Final identity source:
Key auth failure lines:
Notes:
```

Decision rules for narrowing root cause:

- if owner/team account works but non-owner account fails:
  - likely Discord development-access restriction
- if admin account works but non-admin account fails:
  - likely guild permission or install-context issue
- if every account fails before token exchange with the same diagnostics:
  - likely app/activity mismatch or a persistent Discord-side authorize-context issue
- if some rows reach token exchange:
  - move the investigation forward to post-authorize stages instead of launch context

### Acceptance Criteria

- at least one owner/team-account row is tested
- at least one non-owner row is tested if possible
- results are recorded in a structured way
- root-cause space is narrowed based on evidence, not guesses

### Build and Manual Checks

- no build required for DAV-4 itself unless a new bug is found
- all validation must happen inside the real Discord Activity runtime

### Risks

- Discord development access rules may still block some accounts in ways that are not obvious from UI alone
- testing across too many inconsistent server states can muddy the result unless the matrix is recorded carefully

### Wishlist Mapping

- finishes the core authorization investigation using real runtime evidence
- gives DAV-5 a stable set of failure modes to design around

### Non-goals

- no code changes unless DAV-4 uncovers a new concrete bug
- no cosmetic UI work

## DAV-5: Tighten User-Facing Authorization UX And Recovery Paths

Status: `[ ]` not started.

### Summary

Once auth behavior is understood, make the player-facing experience cleaner and more resilient.

### Expected Work

- improve retry banner wording
- distinguish “authorization blocked by Discord context” from generic fallback
- only show local fallback when truly necessary
- decide whether participant-only identity should remain visible while auth retries

### Acceptance Criteria

- user-facing copy matches actual auth state
- retry actions feel intentional instead of blind

## Recommended Execution Order

1. DAV-1 first so the contract is explicit.
2. DAV-2 next because false timeouts muddy all debugging.
3. DAV-3 after that so authorize failures become actionable.
4. DAV-4 once diagnostics are strong enough to trust.
5. DAV-5 last, after the real failure modes are known.

## Non-Goals

- Do not redesign sync architecture as part of authorization work.
- Do not add backend persistence of OAuth tokens in this pass unless product requirements change.
- Do not widen this effort into generic Discord social features outside identity.
- Do not remove the debug console; it is now part of the authorization debugging toolkit.

## Build And Manual Checks

- No build was run for this docs-only vision write-up.
- Implementation phases should use `npm.cmd run build`.
- Real validation must happen inside the Discord Activity runtime, not only in a normal browser.
