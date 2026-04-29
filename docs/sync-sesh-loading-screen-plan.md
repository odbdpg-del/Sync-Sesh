# Sync Sesh Loading Screen Plan

## Purpose

Create a polished startup loading screen that shows Sync Sesh boot progress across the systems users actually wait on: app shell, Discord SDK, identity, sync server, lobby join, and optional media systems.

The user should be loaded into the sync server automatically. The loading screen should make startup feel intentional instead of showing the main UI while backend, Discord, and lobby state are still settling.

## Goals

- Show a first-run loading screen with separate progress rows for each startup system.
- Connect to the sync server automatically on app load.
- Automatically join the lobby/session after sync is connected and the first server snapshot is available.
- Treat Discord identity as useful but non-blocking.
- Continue into the app if Discord identity fails but sync succeeds.
- Keep failures actionable with readable status text.

## Non-Goals

- Do not redesign the lobby or timer UI.
- Do not change the Discord OAuth flow beyond exposing its current progress.
- Do not make SoundCloud widgets block app entry.
- Do not add persistent backend session storage.
- Do not change 3D hidden-world loading beyond possibly reusing the same loading style later.

## Startup Phases

### Required Blocking Phases

1. App Shell
   - React has mounted.
   - Main screen state hooks are initialized.
   - Background media can still load after this phase.

2. Sync Server
   - WebSocket client starts connecting.
   - Connection reaches `connected`.
   - First server snapshot is received.

3. Lobby Auto-Join
   - App sends `join_session` automatically.
   - Local user appears in `lobbyState.localUser`.
   - If the round is already active, existing late-join/spectator rules still apply.

### Non-Blocking Phases

4. Discord SDK
   - SDK disabled/skipped in normal browser mode.
   - SDK initializes and becomes ready in Discord Activity mode.
   - SDK errors should show as degraded, not block app entry.

5. Discord Identity
   - Authenticated profile is preferred.
   - Participant-only profile is acceptable.
   - Local fallback is acceptable if auth fails.
   - Loading screen should continue after identity reaches any final state.

6. SoundCloud / Media
   - Background video and SoundCloud widgets can load in the background.
   - These should not block the user from entering the lobby.

## Phase Plan

- [x] LS-1: Define Startup Progress Model
- [x] LS-2: Build Loading Screen UI
- [x] LS-3: Wire Sync And Discord Progress Into Loading Screen
- [x] LS-4: Auto-Join Lobby On Startup
- [ ] LS-5: Polish Failure, Retry, And Timeout States
- [ ] LS-5.1: Restyle Loading Screen Visual Direction

## LS-1: Define Startup Progress Model

Status: `[x]` completed.

### Summary

Add a small derived startup-progress model that converts existing app, sync, Discord, and lobby state into loading-screen rows.

### Expected Files

- new file: `src/lib/startup/startupProgress.ts`
- `src/hooks/useDabSyncSession.ts`
- `src/types/session.ts` only if shared exported types are preferred by the implementation

### Expected Work

- Define startup phase ids:
  - `app_shell`
  - `discord_sdk`
  - `discord_identity`
  - `sync_server`
  - `lobby_join`
  - `media`
- Define phase states:
  - `pending`
  - `active`
  - `complete`
  - `degraded`
  - `error`
- Add percent values per phase.
- Keep the model derived from existing state where possible.
- Avoid storing duplicated state unless a phase needs a one-time milestone, such as first sync snapshot received.

### Prep Notes

LS-1 should create the startup progress contract, not the loading screen UI. The implementation can return the model from `useDabSyncSession()` so later UI phases can consume it without re-deriving boot state in `MainScreen`.

Recommended type shape:

```ts
export type StartupPhaseId =
  | "app_shell"
  | "discord_sdk"
  | "discord_identity"
  | "sync_server"
  | "lobby_join"
  | "media";

export type StartupPhaseState = "pending" | "active" | "complete" | "degraded" | "error";

export interface StartupProgressStep {
  id: StartupPhaseId;
  label: string;
  status: StartupPhaseState;
  progress: number;
  required: boolean;
  detail: string;
}

export interface StartupProgress {
  steps: StartupProgressStep[];
  requiredProgress: number;
  isBlocking: boolean;
  blockingReason?: string;
}
```

Progress values should be deterministic and derived from state. Do not animate fake progress in LS-1.

Recommended phase mapping:

- `app_shell`
  - `complete`, `100`: `useDabSyncSession()` has returned and `MainScreen` has enough state to render.
  - This can be a constant completed row for LS-1.
- `discord_sdk`
  - `complete`, `100`: SDK disabled in browser mode, or `sdkState.startupStage === "ready"`, or `sdkState.startupStage === "auth"` with identity fallback already settled.
  - `active`, `40`: `sdk_init`.
  - `active`, `70`: `sdk_ready`.
  - `degraded`, `100`: SDK startup failed but sync can continue.
- `discord_identity`
  - `complete`, `100`: `sdkState.identitySource === "authenticated_discord"`.
  - `degraded`, `100`: `participant_discord`, `local_fallback`, or an auth error.
  - `active`, `40-80`: auth stages from `sdkState.authStage`.
  - `complete`, `100`: SDK disabled in browser mode.
- `sync_server`
  - `pending`, `0`: sync is offline before the first connect attempt.
  - `active`, `45`: `state.syncStatus.connection === "connecting"`.
  - `complete`, `100`: `state.syncStatus.connection === "connected"`.
  - `error`, `100`: `state.syncStatus.connection === "error"`.
  - Mock mode should be `complete`, `100` once the mock client is available.
- `lobby_join`
  - `pending`, `0`: sync is not connected.
  - `active`, `50`: sync connected but `lobbyState.localUser` is not present.
  - `complete`, `100`: `lobbyState.localUser` exists.
  - `degraded`, `100`: local user is present as a spectator because late-join rules apply.
- `media`
  - `complete`, `100`: LS-1 should treat media as non-blocking and complete until LS-5 decides whether to expose richer media state.

Required phases for dismissal:

- `app_shell`
- `sync_server`
- `lobby_join`

Optional phases:

- `discord_sdk`
- `discord_identity`
- `media`

`StartupProgress.isBlocking` should be `true` while any required step is `pending`, `active`, or `error`. In LS-1, keep `error` blocking for sync/lobby because LS-5 will design retry and recovery copy. Optional degraded/error phases must not block.

Recommended `requiredProgress` calculation:

- Average only required step `progress` values.
- Clamp to `0..100`.
- Treat required `error` as progress `100` for the bar, but keep `isBlocking: true` so the UI can show a stuck/error state later.

Recommended implementation boundary:

- Put pure mapping helpers in `src/lib/startup/startupProgress.ts`.
- Keep React lifecycle state in `useDabSyncSession.ts`.
- Add no component or CSS in LS-1.
- Do not change auto-join behavior in LS-1. LS-4 owns that behavior change.
- Do not add first-snapshot-specific state in LS-1 unless it is trivial to derive from `state.syncStatus.lastEventAt`. LS-3 can refine first-snapshot tracking if needed.

Open implementation choice:

- LS-1 may expose `startupProgress` from `useDabSyncSession()` immediately, even though no UI consumes it yet. That keeps LS-2 smaller.
- If TypeScript no-unused checks complain about unused exports or local values, export the pure helper and add a focused test instead of wiring unused code into UI prematurely.

### Acceptance Criteria

- A single object/array describes all loading rows.
- Required phases can be distinguished from optional phases.
- Discord failures can resolve as `degraded`.
- Sync failures can resolve as `error`.
- The model can be unit-tested without rendering React.
- No user-visible loading screen appears yet.

### Build/Test

- Run `npm.cmd run build`.
- Prefer adding a focused pure test if `startupProgress.ts` contains non-trivial branching.

### Completed Implementation

- Added a pure startup progress model that derives app shell, Discord SDK, Discord identity, sync server, lobby join, and media rows from existing app state.
- Exposed `startupProgress` from `useDabSyncSession()` for the upcoming loading screen UI phase.
- Added focused tests for ready startup, degraded Discord identity, and blocking sync errors.

## LS-2: Build Loading Screen UI

Status: `[x]` completed.

### Summary

Create the actual startup loading screen component and styling.

### Expected Files

- new file: `src/components/LoadingScreen.tsx`
- `src/styles/global.css`
- `src/screens/MainScreen.tsx`

### Expected Work

- Render a full-screen loading view above the app.
- Show Sync Sesh branding clearly.
- Show one progress bar per startup phase.
- Show concise status text for each row.
- Include overall progress derived from required phases.
- Make the screen responsive for Discord iframe sizes and desktop browser testing.
- Keep visual style consistent with current Sync Sesh neon/control-room aesthetic.

### Acceptance Criteria

- Loading screen appears during startup.
- Each phase row has a label, status, and progress bar.
- The screen clears once required phases complete.
- Optional degraded Discord identity does not keep the user stuck.

### Build/Test

- Run `npm.cmd run build`.
- Manually verify in normal browser mode.

### Completed Implementation

- Added a full-screen `LoadingScreen` component that renders the LS-1 startup progress rows, required-progress total, per-phase bars, and status labels.
- Styled the screen with the existing Sync Sesh neon/control-room visual language and mobile-responsive layout.
- Mounted the loading screen from `MainScreen` during blocking startup transport states.
- Temporarily avoids blocking on `lobby_join` after sync connects until LS-4 adds automatic lobby joining.

## LS-3: Wire Sync And Discord Progress Into Loading Screen

Status: `[x]` completed.

### Summary

Feed real sync and Discord state into the loading screen instead of using placeholder progress.

### Expected Files

- `src/hooks/useDabSyncSession.ts`
- `src/screens/MainScreen.tsx`
- `src/lib/sync/wsSyncClient.ts` if first-snapshot tracking needs to become explicit
- `src/lib/startup/startupProgress.ts`
- `tests/startupProgress.test.ts`

### Expected Work

- Map `sdkState.startupStage` and `sdkState.authStage` into Discord loading rows.
- Map `state.syncStatus.connection` into sync loading row.
- Detect first server snapshot received.
- Make sync row distinguish:
  - opening socket
  - socket connected
  - snapshot received
- Make lobby row distinguish:
  - waiting for sync
  - joining
  - joined
  - spectating if late-join rules apply

### Prep Notes

LS-3 should improve signal quality for the loading screen. It should not add auto-join behavior; LS-4 owns that.

Current LS-2 behavior deliberately hides the loading screen once `state.syncStatus.connection === "connected"` so users are not trapped behind the `lobby_join` blocker before auto-join exists. LS-3 may keep that guard, but it should make the data model ready for LS-4 to remove the guard.

Recommended sync milestone model:

```ts
export type SyncStartupMilestone = "idle" | "opening_socket" | "socket_open" | "snapshot_received" | "error";
```

Recommended way to derive it:

- Add optional `startupMilestone?: SyncStartupMilestone` to `SyncStatus`.
- In `WebSocketSyncClient`:
  - initial/offline state: `idle`
  - before constructing `new WebSocket(...)`: `opening_socket`
  - on `open`: `socket_open`
  - on first valid `snapshot` message: `snapshot_received`
  - on timeout/error/server error: `error`
- In mock sync, either omit the milestone or treat mock mode as immediately ready in `startupProgress`.
- Keep the milestone non-authoritative for session behavior; it is UI progress only.

Recommended sync row mapping after milestone support:

- `pending`, `0`: `idle` or offline before first attempt.
- `active`, `35`: `opening_socket`.
- `active`, `70`: `socket_open`.
- `complete`, `100`: `snapshot_received`.
- `error`, `100`: `error` or `state.syncStatus.connection === "error"`.
- Mock mode: `complete`, `100`.

Recommended Discord SDK row mapping:

- Keep existing LS-1 mapping unless a bug is found.
- Make details clearer:
  - `sdk_init`: "Initializing Discord Activity runtime."
  - `sdk_ready`: "Discord SDK ready; preparing identity."
  - `auth`/`ready`: "Discord Activity runtime is available."
  - startup failure: degraded with the startup error.

Recommended Discord identity row mapping:

- `pending`, `0`: SDK enabled but identity/auth has not started.
- `active`, `40`: `authorizing`
- `active`, `60`: `exchanging_token`
- `active`, `75`: `authenticating`
- `active`, `85`: `subscribing`
- `complete`, `100`: `authenticated_discord`
- `degraded`, `100`: `participant_discord`, `local_fallback`, or auth error
- SDK disabled/browser mode: `complete`, `100`

Recommended lobby row mapping before LS-4:

- Keep lobby row derived from `lobbyState.localUser`.
- Keep the UI dismissal guard from LS-2 so an unjoined user can still reach the manual Join button.
- After sync milestone is `snapshot_received` but no local user exists, row should show `active`, `50`, "Ready to join shared session."
- Do not send `join_session`.
- Do not change `timerConfig.autoJoinOnLoad`.

Required progress/dismissal expectation for LS-3:

- The model should now consider sync complete only when the snapshot has been received.
- The mounted screen can still dismiss once the sync connection is connected/snapshot-ready to avoid the pre-LS-4 lobby trap.
- LS-4 will align dismissal with full required completion after automatic join exists.

Debug behavior:

- Do not change debug console event labels or timing unless a bug is discovered.
- Adding `startupMilestone` to `SyncStatus` should not affect existing debug log text.
- Keep `debugDetail`, `lastEventAt`, and latency updates intact.

Testing recommendations:

- Extend `startupProgress.test.ts` for `opening_socket`, `socket_open`, `snapshot_received`, and sync error.
- If `SyncStatus` gains `startupMilestone`, add coverage that connection `connected` plus `socket_open` is not yet model-complete until `snapshot_received`.
- Keep tests pure; do not need browser/WebSocket integration for LS-3.

### Acceptance Criteria

- Loading screen reflects real sync status.
- Loading screen reflects Discord SDK/auth state.
- First snapshot is visible as a distinct milestone.
- Existing debug console behavior remains unchanged.
- The loading screen does not trap users behind manual join before LS-4.
- Startup progress tests cover the sync milestone sequence.

### Build/Test

- Run `npm.cmd run build`.
- Test with `VITE_SYNC_MODE=mock`.
- Test with `VITE_SYNC_MODE=ws`.

### Completed Implementation

- Added a `SyncStartupMilestone` field so startup progress can distinguish opening socket, socket open, snapshot received, and error states.
- Updated WebSocket sync startup to advance milestones without changing debug event labels or session behavior.
- Updated startup progress mapping so sync is complete only after a snapshot is received, while LS-2 still avoids trapping users behind lobby join before LS-4.
- Added focused tests for opening socket, socket open, snapshot received, and sync error progress.

## LS-4: Auto-Join Lobby On Startup

Status: `[x]` completed.

### Summary

Change startup behavior so users automatically join the sync session once sync is ready.

### Expected Files

- `src/hooks/useDabSyncSession.ts`
- `src/screens/MainScreen.tsx`
- `src/lib/startup/startupProgress.ts`
- `tests/startupProgress.test.ts`
- tests if existing session tests need coverage

### Expected Work

- Send `join_session` automatically after sync connects and a server snapshot is available.
- Do not require `timerConfig.autoJoinOnLoad` for the default startup join.
- Prevent duplicate join sends with an attempt key.
- Preserve existing admin-controlled `autoJoinOnLoad` behavior if it is still used for a narrower purpose, or remove/rename it in a later phase only after review.
- Respect late-join/spectator rules already enforced by `reduceSessionEvent`.

### Prep Notes

LS-4 is the first loading-screen phase that changes session behavior. Keep the behavior small and explicit: after the client receives a real sync snapshot, it should request `join_session` once for the current session/user pair if the local user is not already joined and the server says joining is allowed.

Recommended join trigger:

```ts
const canAutoJoinStartup =
  state.syncStatus.mode === "mock" ||
  state.syncStatus.startupMilestone === "snapshot_received";

if (canAutoJoinStartup && lobbyState.canJoinSession && !lobbyState.localUser) {
  joinSession();
}
```

Recommended attempt key:

```ts
const attemptKey = `${state.session.id}:${state.localProfile.id}:${state.syncStatus.startupMilestone ?? "mock"}`;
```

Rules:

- Send `join_session` only after mock sync is ready or WebSocket `startupMilestone === "snapshot_received"`.
- Do not send if `lobbyState.localUser` already exists.
- Do not send if `lobbyState.canJoinSession` is false.
- Do not send more than once for the same session/local user during the same startup snapshot.
- Reset naturally for a different session id or local profile id.
- Do not wait for Discord authenticated identity. If Discord later updates the local profile, existing profile-sync code can refresh the joined user.
- Preserve late-join behavior by relying on existing `reduceSessionEvent({ type: "join_session" })` rules.
- Keep the manual Join button as a fallback.

Important compatibility note:

- There is already an effect in `useDabSyncSession()` gated by `state.timerConfig.autoJoinOnLoad`.
- LS-4 should not require `timerConfig.autoJoinOnLoad` for startup auto-join.
- Prefer replacing that effect with the new default startup auto-join effect only if its behavior fully covers the old one.
- If preserving both, ensure they share the same ref/attempt key so they cannot double-send `join_session`.
- Do not remove the admin UI toggle in this phase unless the implementation first confirms it is unused or obsolete.

Loading screen dismissal change:

- After LS-4, `MainScreen` should no longer need the LS-2/LS-3 guard that hides the loading screen as soon as sync snapshot is ready.
- Change dismissal to use the model directly:
  - show while `startupProgress.isBlocking`
  - hide when required phases are complete or degraded in an accepted way
- Because LS-4 auto-joins, `lobby_join` should now complete automatically and no longer trap users.

Startup progress model adjustment:

- `lobby_join` can stay `active`, `50`, while snapshot is ready but `lobbyState.localUser` is missing.
- Once local user exists:
  - `complete`, `100` for normal joined users
  - `degraded`, `100` for spectators caused by late-join rules
- Required degraded spectator state should not block dismissal. If current `getBlockingReason()` already ignores `degraded`, keep that behavior.

Testing recommendations:

- Add or update a focused hook-level test only if an existing test harness can cover `useDabSyncSession()` cheaply.
- If no hook harness exists, keep behavior verified by build plus manual WebSocket test in this phase.
- Extend pure startup progress tests only for dismissal/model expectations if the model changes.
- Run `npm.cmd run build`.
- Run `npx.cmd tsx --test tests/startupProgress.test.ts`.
- Running full `npm.cmd test` is optional until existing unrelated suite failures are fixed; if run, document any unrelated failures.

Manual verification checklist:

1. Start `npm run dev:sync-server`.
2. Start frontend in `VITE_SYNC_MODE=ws`.
3. Open the app in a fresh browser tab.
4. Confirm loading screen shows sync progress through snapshot and lobby join.
5. Confirm the user appears in the lobby without clicking Join.
6. Refresh and confirm the user rejoins automatically without duplicate user cards.
7. Open a second browser tab and confirm it joins the same session automatically.
8. Stop sync server and confirm loading remains blocked or reconnecting rather than pretending join succeeded.

### Acceptance Criteria

- Fresh user is joined automatically after startup.
- Refreshing the app rejoins automatically.
- Duplicate `join_session` events are avoided.
- If sync disconnects/reconnects, the client restores joined session state using existing reconnect behavior.
- Existing manual Join button can remain as a fallback but should usually be unnecessary after startup.
- Loading screen dismissal can rely on `startupProgress.isBlocking` after auto-join exists.

### Build/Test

- Run `npm.cmd run build`.
- Run existing tests with `npm.cmd test` if session behavior changes broadly.
- Manual two-window WebSocket test.

### Completed Implementation

- Replaced the old `timerConfig.autoJoinOnLoad`-gated startup effect with default startup auto-join after mock sync is ready or a WebSocket snapshot has been received.
- Kept duplicate join prevention with a session/user/sync-readiness attempt key.
- Kept the manual Join button as fallback and left the existing admin auto-join toggle in place for later review.
- Switched loading screen visibility to rely directly on `startupProgress.isBlocking` now that startup auto-join exists.

## LS-5: Polish Failure, Retry, And Timeout States

### Summary

Make startup failures readable and recoverable.

### Expected Files

- `src/components/LoadingScreen.tsx`
- `src/hooks/useDabSyncSession.ts`
- `src/styles/global.css`
- possibly `src/lib/sync/wsSyncClient.ts`

### Expected Work

- Add friendly copy for:
  - sync server waking up
  - sync timeout/retry
  - Discord identity degraded
  - Discord SDK skipped
  - local fallback identity
- Add a retry action for sync if useful, or rely on existing reconnect loop with clear text.
- Make loading screen continue into app when sync succeeds even if Discord identity failed.
- Keep sync failure blocking until the user has enough info to retry or wait.

### Acceptance Criteria

- Sync errors do not leave the user staring at a vague loader.
- Discord auth failures are clearly degraded and non-blocking.
- Retry/refresh guidance is visible when sync cannot connect.
- The app still works in normal browser mock mode.

### Build/Test

- Run `npm.cmd run build`.
- Manual test:
  - sync server running
  - sync server unavailable
  - Discord SDK disabled
  - Discord Activity runtime if available

## LS-5.1: Restyle Loading Screen Visual Direction

Status: `[ ]` not started.

### Summary

Revise the loading screen's visual treatment now that the startup behavior works. This phase is intentionally visual-only and should not change sync, Discord, auto-join, or loading dismissal behavior.

### Expected Files

- `src/components/LoadingScreen.tsx`
- `src/styles/global.css`
- `docs/sync-sesh-loading-screen-plan.md`
- `changelog.md`

### Expected Work

- Adjust the loading screen layout, hierarchy, colors, spacing, and progress presentation based on the desired direction.
- Keep text fitting inside the viewport on mobile, desktop, and Discord iframe sizes.
- Preserve the existing startup rows and status data from `startupProgress`.
- Preserve accessibility basics:
  - `aria-live="polite"`
  - readable status labels
  - no horizontal overflow
- Avoid changing sync behavior, auto-join logic, Discord auth behavior, or retry/error policy.

### Visual Direction Notes

Collect the desired visual changes before implementation. Possible knobs:

- smaller or less dominant title
- more compact card
- fewer visible rows above the fold
- different progress bar style
- more game/loading-screen feel
- more minimal/control-room console feel
- add or remove background blur/tint
- change status chips or row borders

### Acceptance Criteria

- Loading screen keeps the same functional data and dismissal behavior.
- Loading screen no longer has horizontal overflow.
- The style direction is visibly different from LS-2.
- Build passes.

### Build/Test

- Run `npm.cmd run build`.
- Run `npx.cmd tsx --test tests/startupProgress.test.ts` if the component data contract changes.
- Manual visual check in at least one desktop-sized viewport and one narrow viewport.

## Changelog Requirement

Any implementation phase that changes application, server, style, config, or test code must add an entry at the top of `changelog.md`.

Docs-only creation of this plan does not require a changelog entry unless requested.

## Recommended Execution Order

1. LS-1 first, so progress state has a stable shape.
2. LS-2 next, so the loading screen exists visually.
3. LS-3 then connects real startup signals.
4. LS-4 changes lobby behavior after the visual/state foundation is clear.
5. LS-5 finishes failure and retry polish.
