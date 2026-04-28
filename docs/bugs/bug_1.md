# Bug 1: Discord Activity Authorization Fails Before Consent

## Status

Open

## Summary

The Discord Activity launches and the frontend/backend both boot, but Discord authorization fails before the consent popup appears.

The failure happens at:

- `sdk.commands.authorize(...)`

The app falls back to a local profile because Discord never returns a usable authorization code.

## User-Facing Symptom

- the app opens inside Discord
- the user does not get a Discord authorization popup
- the user does not get their real Discord name or avatar
- the app falls back to a generated local profile

## Core Evidence

Observed startup sequence:

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

Observed authorize failure detail:

- `Discord authorize failed: Discord authorize request failed. [code=5000]`

This happens:

- on the original Discord app
- on the fresh `SyncSeshTest` app
- in DM launch
- in a small server launch
- with `identify` only
- with `identify + guilds.members.read`

## What We Have Already Ruled Out

These do not appear to be the main blocker anymore:

- frontend env vars missing
- backend env vars missing
- bad backend token exchange route
- sync server availability as the main cause
- wrong redirect URI format
- `guilds.members.read` as the only bad scope
- large-server restriction as the only blocker
- retry timeout bugs in local code

## Important Notes

### Large Server Restriction

Discord surfaced this message during testing:

- `User-installed Apps require verification to use activities in servers with more than 25 members`

This was real, but it was not the root cause of the missing consent popup, because the same `code=5000` authorize failure still happened in:

- a small test server
- DM launch

### New Test App

A fresh Discord test app was created:

- `SyncSeshTest`
- Application ID: `1498715120480682155`

It was configured with:

- `Enable Activities`
- `User Install`
- `Guild Install`
- redirect URI `https://127.0.0.1`
- correct URL mappings to the current frontend/backend

The same failure still occurred on the new app.

## Current Best Understanding

The app itself is loading correctly. The backend is configured correctly. The retry path is no longer masking the result.

The narrow remaining problem is:

- Discord is rejecting the embedded OAuth authorize request itself

That means the bug is now likely one of:

1. Discord embedded OAuth behavior requires a different interactive authorize request shape than we currently send.
2. Discord is still rejecting the launch/install context even though the app can open.
3. There is a Discord platform-side app/activity state issue not exposed clearly through the SDK.

## Changes Already Made While Investigating

### Logging And Diagnostics

- Added a hidden in-app debug console
- Added snapshot and event log support
- Added lifecycle logging for:
  - SDK startup
  - auth stages
  - identity source
  - sync status
- Added richer authorize failure diagnostics, including:
  - auth mode
  - attempt suffix
  - build id
  - redirect URI
  - auth endpoint
  - Discord context identifiers
  - safe SDK error fields

### Retry Timing Fixes

- Removed a competing short retry timeout
- Added better stage-aware retry watchdog behavior
- Fixed retry so `sdk.ready()` stalls are not mislabeled as auth failures

### Scope Experiment

- Temporarily reduced requested Discord scopes to:
  - `identify` only

Result:

- no change
- immediate authorize failure still returned `code=5000`

## Current Hypothesis

The most likely next code-level experiment is:

- explicitly set interactive authorize to `prompt: "consent"`

Why:

- current silent mode explicitly uses `prompt: "none"`
- current interactive mode only omits `prompt`
- Discord may require an explicit consent prompt request in the embedded Activity flow

## Attempt 1

### Name

Explicit Consent Prompt

### Result

Blocked by SDK contract.

### Goal

Find out whether Discord’s embedded authorize flow requires an explicit consent prompt request instead of an implicit interactive request.

### Change

Change the interactive authorize request from:

- no `prompt` field

to:

- `prompt: "consent"`

while keeping silent auth as:

- `prompt: "none"`

### Why This Attempt Makes Sense

- the app currently proves that silent auth fails
- the app currently proves that the fallback interactive auth also fails
- the current interactive path is only “not none,” not “explicitly consent”
- if Discord requires a stronger consent signal for Activities, this is the smallest reasonable change to test

### Success Criteria

Any of the following count as a meaningful success signal:

- a Discord consent popup finally appears
- interactive auth stops failing immediately
- authorize proceeds far enough to reach token exchange

### Failure Criteria

This attempt should be considered failed if:

- interactive auth still fails immediately with the same `code=5000`
- no consent prompt appears
- behavior is unchanged from the current baseline

### If Attempt 1 Fails

Move to Attempt 2 and treat the remaining problem as likely Discord platform/app state or launch/install context rather than the request prompt shape.

### Actual Outcome

- The embedded Discord SDK `authorize()` type contract only accepts:
  - `prompt: "none"`
  - or no `prompt`
- It does not allow `prompt: "consent"`.
- Attempt 1 therefore failed at implementation time and could not be tested as a supported runtime experiment.

## Attempt 2

### Name

Skip Silent Auth Entirely

### Result

Failed.

### Goal

Find out whether the silent-first startup path is poisoning or confusing the embedded OAuth flow, even though the fallback interactive request is technically supported.

### Change

Change the Discord identity bootstrap so it starts directly with the supported interactive path instead of:

1. trying silent auth first
2. then escalating to interactive auth

For Attempt 2, the app should:

- start with interactive auth only
- not make a silent authorize call during the tested launch path

### Why This Attempt Makes Sense

- current logs show silent and interactive both fail immediately with the same `code=5000`
- even though fallback reaches interactive, Discord may behave differently if the first authorize request is interactive from the start
- this remains fully inside the supported SDK contract

### Success Criteria

Any of the following count as a meaningful success signal:

- a Discord consent popup appears
- interactive auth no longer fails immediately
- authorize proceeds far enough to reach token exchange

### Failure Criteria

This attempt should be considered failed if:

- the first interactive authorize call still fails immediately with the same `code=5000`
- no consent prompt appears
- behavior is unchanged except for the missing silent attempt lines

### If Attempt 2 Fails

Treat the remaining problem as likely Discord platform/app/install context or an app-state issue outside the supported frontend request shapes.

### Actual Outcome

- The app was changed to start directly with the supported interactive authorize path.
- Startup no longer emitted any `auth:silent:*` lines.
- The first auth line became:
  - `auth:interactive:start`
- Discord still immediately rejected the authorize request with:
  - `Discord authorize failed: Discord authorize request failed. [code=5000]`
- No consent popup appeared.
- This happened on the fresh `SyncSeshTest` app as well.

### What We Learned From Attempt 2

- the silent-first path is not the cause of the missing popup
- the supported interactive-only path also fails immediately
- the remaining problem is very unlikely to be caused by our startup auth ordering
- the remaining problem is now more likely:
  - Discord platform/app state
  - Discord install/launch context
  - or a behavior that only shows up in a minimal embedded authorize harness

## Attempt 3

### Name

Minimal Isolated Discord Authorize Harness

### Goal

Separate “Sync Sesh app complexity” from “Discord embedded authorize behavior” by testing the smallest possible Activity that does only:

1. `sdk.ready()`
2. `sdk.commands.authorize(...)`
3. display/log the result

### Change

Create or point the Activity at a minimal test page that:

- initializes the Embedded App SDK
- logs SDK-ready state
- issues one interactive authorize call
- renders the raw result or failure detail
- does not include:
  - sync client startup
  - local profile fallback logic
  - SoundCloud
- session state
- extra app complexity

### Implementation

Attempt 3 is implemented as a non-destructive harness mode inside the existing frontend.

Activation:

- add `?authHarness=1` to the Activity URL
- or use the `/auth-harness` path

Harness behavior:

- initialize `DiscordSDK`
- wait for `sdk.ready()`
- issue one interactive `authorize()` call with `identify`
- log the result or failure directly on screen
- do not start sync
- do not enter the normal Sync Sesh session flow

Implementation notes:

- the normal app remains the default experience
- the harness is opt-in only through:
  - `?authHarness=1`
  - `/auth-harness`
- this keeps bug isolation work from disturbing the regular Sync Sesh launch path

### Why This Attempt Makes Sense

- Attempt 2 proved the normal supported interactive auth path still fails immediately
- we now need to isolate whether Sync Sesh’s app shell is a factor at all
- a minimal harness gives the clearest answer with the fewest moving parts

### Success Criteria

Any of the following count as a meaningful success signal:

- the minimal harness shows a Discord consent popup
- the minimal harness reaches token exchange or returns a code
- the minimal harness produces a more specific Discord-side failure than the full app

### Failure Criteria

This attempt should be considered failed if:

- the minimal harness still fails immediately with the same `code=5000`
- no consent popup appears
- behavior is effectively identical to the full Sync Sesh app

### If Attempt 3 Fails

Treat the remaining problem as strongly pointing to Discord platform/app/install state rather than the Sync Sesh code path.

## Next Recommended Steps

1. Build a minimal isolated Discord authorize harness.
2. Point the fresh test Activity at that harness.
3. Retest in DM and small-server launch contexts.
4. Compare whether:
   - a consent popup appears
   - the same `code=5000` remains
   - any more specific Discord-side behavior appears

If Attempt 3 also fails unchanged, the next conclusion becomes:

- the remaining blocker is very likely Discord platform/app/install state rather than the Sync Sesh code path

## Attempt 5

### Name

Visible Harness Bootstrap And Crash Boundary

### Goal

Make the minimal auth harness useful inside Discord even when it fails before the normal on-screen log can render.

### Why This Attempt Exists

Attempt 3 isolated the app down to a minimal `sdk.ready()` plus `authorize()` flow, but Discord launches started showing a white box instead of visible harness output.

That means the harness is no longer a trustworthy debugging surface inside the real Activity runtime until it can report:

- whether React mounted at all
- whether the Discord SDK constructor threw
- whether `sdk.ready()` failed
- whether a render-time crash happened before the harness log appeared

### Change

Add a new visible bootstrap and crash-reporting layer around the harness:

- a top-level bootstrap status panel that appears before React mount
- a React error boundary around the harness route
- global `window error` and `unhandledrejection` logging in the harness
- explicit bootstrap status updates during:
  - app boot
  - React mount
  - SDK construction
  - `sdk.ready()`
  - interactive `authorize()`

### Success Criteria

Any of the following count as success:

- the previous white box is replaced by visible status text
- a React render crash is shown on screen instead of blank output
- the harness reaches a visible `sdk:init:*`, `sdk:ready:*`, or `auth:interactive:*` line inside Discord

### Failure Criteria

This attempt should be considered failed if:

- Discord still shows only a blank white iframe with no visible bootstrap text
- the harness remains unreadable in the real Activity runtime

### Interpretation

If Attempt 5 still reaches the same authorize failure after becoming visible, that strengthens the conclusion that the blocker is not normal Sync Sesh app complexity.

If Attempt 5 shows a pre-authorize render/runtime crash, then the next fix should stay focused on harness observability rather than OAuth theory.

## Attempt 6

### Name

HTML-Level Boot Probe Before React

### Goal

Find out whether the Discord Activity iframe is failing before the React bundle runs, or only after the app JavaScript begins executing.

### Why This Attempt Exists

Attempt 5 proved that:

- the new harness is deployed
- the harness renders in a normal browser
- the harness still becomes a blank white box inside Discord, even after cache-busting the URL

That means the next useful question is no longer:

- "is OAuth failing?"

The next useful question is:

- "does the Activity page execute any app code at all inside Discord?"

### Change

Add a tiny inline probe directly in `index.html`, before the React bundle loads.

The probe should:

- write visible text into the page immediately
- include a simple phase label such as:
  - `index.html loaded`
  - `inline script running`
- register raw `window.onerror` handling
- register raw `unhandledrejection` handling
- update visible text if a top-level script error occurs before React mount

This probe must not depend on:

- React
- Vite app startup
- Discord SDK construction
- harness route rendering

### Success Criteria

Any of the following count as success:

- visible inline boot text appears inside Discord
- a raw script error message appears inside Discord
- the page proves that `index.html` executes even if React later fails

### Failure Criteria

This attempt should be considered failed if:

- Discord still shows only a blank white iframe
- no inline HTML-level text appears
- no raw top-level error text appears

### Interpretation

If Attempt 6 shows inline boot text but React still does not render, the next bug is in bundle startup or runtime execution after HTML load.

If Attempt 6 still shows only a white box, the remaining problem is likely even lower-level, such as Discord iframe/runtime behavior, response handling, or a platform-side embed issue outside the React app.

### Recommended Follow-Up

If Attempt 6 proves the page never reaches visible inline script execution inside Discord, stop changing OAuth logic and focus on Discord runtime/embed diagnostics instead.

## Attempt 7

### Name

Standalone Static HTML Probe

### Goal

Find out whether Discord can render any page from this deployment at all when the Activity override points at a file that does not depend on React, Vite bundle startup, or the Discord SDK.

### Why This Attempt Exists

Attempt 6 still produced only a white box inside Discord, even after adding:

- inline `index.html` text
- raw top-level error handling
- pre-React boot-phase reporting

At that point, the next useful simplification is to stop testing the app entrypoint entirely.

The next question becomes:

- "can Discord render a completely static HTML file from this deployment?"

### Change

Add a standalone static probe page served directly from the deployment, for example:

- `/static-probe.html`

This page must use:

- plain HTML
- inline CSS
- optional tiny inline JavaScript only for timestamp or query-string display

This page must not use:

- React
- the app bundle
- `index.html` app startup
- Discord SDK
- any imported scripts

### Success Criteria

Any of the following count as success:

- Discord shows the static probe text clearly
- Discord renders the page background and text without a white box
- the page can display a simple query-string marker for cache-busting confirmation

### Failure Criteria

This attempt should be considered failed if:

- Discord still shows only a blank white iframe
- the static probe page also fails to appear

### Interpretation

If Attempt 7 succeeds, then Discord can render static HTML from the deployment, and the bug remains somewhere in the app/bootstrap/runtime path.

If Attempt 7 fails with the same white box, the remaining problem is very likely outside the app code and closer to Discord embed/runtime behavior, Activity override handling, or deployment-level response handling.

### Recommended Follow-Up

If Attempt 7 also fails, stop iterating on OAuth and React debugging first. Move to:

- Discord Activity override behavior checks
- deployment/header/response inspection
- Discord developer support or Activities troubleshooting with the static repro

### Actual Outcome

- A standalone static HTML probe page was added at:
  - `/static-probe.html`
- The page contains:
  - plain HTML
  - inline CSS
  - tiny inline JavaScript only for query/timestamp display
- It does not use:
  - React
  - the app bundle
  - the Discord SDK
- In a normal browser, the static probe renders correctly.
- In Discord Activity launch using the override URL, the result was still:
  - a blank white box

### What We Learned From Attempt 7

- the white-box failure is not specific to:
  - React
  - Vite app startup
  - the embedded auth harness
  - the Discord SDK auth path
- the failure still happens even for a plain static page served from the same deployment
- this strongly shifts the likely root cause away from app auth code and toward:
  - Discord Activity override handling
  - Discord iframe/runtime behavior
  - deployment-level response or embedding behavior
  - or another platform-side issue outside the Sync Sesh app bundle

## Attempt 8

### Name

Embed And Response Diagnostics

### Goal

Determine whether the deployment response or Discord embed environment is preventing even static HTML from being shown inside the Activity iframe.

### Why This Attempt Exists

Attempt 7 is the strongest simplification so far:

- a public HTTPS static HTML file
- no React
- no bundle
- no Discord SDK
- still a white box in Discord

That means the next useful investigation is no longer about app logic at all.

The next question becomes:

- "what is different about the deployment response or Discord embedding path compared to a normal browser?"

### Change

Do not change OAuth logic for this attempt.

Instead:

1. Inspect the deployed response headers for:
   - `Content-Security-Policy`
   - `X-Frame-Options`
   - `Cross-Origin-Embedder-Policy`
   - `Cross-Origin-Opener-Policy`
   - `Cross-Origin-Resource-Policy`
2. Verify whether Discord Activity override is honoring:
   - the exact public URL
   - query-string cache-busting
3. Compare normal browser behavior versus Discord Activity behavior for:
   - root app page
   - harness page
   - static probe page
4. If no deployment issue is found, prepare a minimal external repro for Discord support:
   - Activity app
   - override URL
   - public static page
   - white-box result in Discord

### Success Criteria

Any of the following count as success:

- a suspicious header or embed policy issue is identified
- a Discord override/path-handling issue is identified
- a minimal support-ready repro is prepared with enough evidence to escalate

### Failure Criteria

This attempt should be considered failed if:

- no embed/deployment clues are found
- Discord still white-boxes all tested public pages
- no new differentiating signal appears

### Recommended Follow-Up

If Attempt 8 finds no deployment/header issue, stop app-code debugging and escalate using the Attempt 7 static repro as the primary evidence.

### Implementation

Attempt 8 is implemented as a standalone static diagnostics page served directly from the deployment:

- `/embed-diagnostics.html`

The page is intentionally outside the React app and does not use:

- the app bundle
- Discord SDK
- OAuth logic

Instead, it reports:

- current URL
- query string
- referrer
- user agent
- whether the page believes it is inside an iframe
- whether `window.top` access is blocked
- same-origin response headers fetched from:
  - `/`
  - `/static-probe.html`
  - `/embed-diagnostics.html`

### Next Test

Use the Activity override URL:

- `/embed-diagnostics.html?v=attempt8`

If Discord still shows only a white box for that page, Attempt 8 strongly supports escalation with the static repro instead of more app-code debugging.

## Related Docs

- [discord-activity-authorization-vision.md](C:/Users/Rubbe/Desktop/farding/Sync-Sesh/docs/discord-activity-authorization-vision.md)
- [discord-activity-identity-vision.md](C:/Users/Rubbe/Desktop/farding/Sync-Sesh/docs/discord-activity-identity-vision.md)
- [discord-activity-debug-console-vision.md](C:/Users/Rubbe/Desktop/farding/Sync-Sesh/docs/discord-activity-debug-console-vision.md)
