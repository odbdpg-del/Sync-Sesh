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

## Next Recommended Steps

1. Implement Attempt 2 by skipping silent auth on the tested launch path.
2. Retest on the fresh `SyncSeshTest` app.
3. Compare whether:
   - a consent popup finally appears
   - the same `code=5000` failure remains

If that still fails unchanged, the next conclusion becomes:

- the remaining blocker is likely Discord platform/app state rather than the app code path

## Related Docs

- [discord-activity-authorization-vision.md](C:/Users/Rubbe/Desktop/farding/Sync-Sesh/docs/discord-activity-authorization-vision.md)
- [discord-activity-identity-vision.md](C:/Users/Rubbe/Desktop/farding/Sync-Sesh/docs/discord-activity-identity-vision.md)
- [discord-activity-debug-console-vision.md](C:/Users/Rubbe/Desktop/farding/Sync-Sesh/docs/discord-activity-debug-console-vision.md)
