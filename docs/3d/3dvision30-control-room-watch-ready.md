# Secret 3D World Vision 30 - Control Room Watch Ready

## Purpose

Vision 30 plans a small but important control-room immersion pass:

- move the top-down camera toggle from `Tab` to `T`
- free `Tab` for a new wrist-watch toggle action
- show the session timer on the watch
- let the player hold `Space` from the watch to ready up while staying in the 3D world

The goal is to make the hidden 3D world feel less like a separate mode from Sync Sesh. The player should be able to walk around the Control Room, check the live timer at any moment, and ready up without returning to the 2D dashboard.

## Product Recommendation

Treat the watch as a quick diegetic control, not a heavy menu.

Recommended first behavior:

```text
Press Tab
  player toggles their watch open
  watch shows timer/session status
  Space becomes hold-to-ready while watch is visible

Press Tab again
  watch closes
  any active watch ready-hold is released
  normal movement controls return
```

This keeps the feature readable without requiring an awkward held chord. The watch is still treated as a temporary personal surface, so blur, Escape, Exit, and control-state changes must close it or release ready-hold cleanly.

## Why This Change

The Control Room already shows timer and session data on monitors, but that information depends on where the player is looking. A watch gives the player a personal, always-available session surface.

Moving top-down to `T` also makes the controls more semantically clear:

- `T` means top-down
- `Tab` means personal watch toggle
- `Space` keeps its normal movement role unless the watch is active

The watch also solves a usability gap: the normal 2D ready hotkey is disabled while the 3D shell is open, so there is currently no intentional 3D-native ready-hold path.

## Code Facts

Read-only findings from 2026-04-30:

- `Tab` currently toggles top-down view inside `TopDownViewController` in `src/3d/ThreeDModeShell.tsx`.
- Top-down state is owned by `ThreeDModeShell` through `isTopDownViewActive` and `setIsTopDownViewActive`.
- `Space` is already used in 3D as first-person jump and top-down freecam vertical-up.
- `MainScreen` passes `readyHotkeyEnabled={!isThreeDModeOpen}` to `TimerPanel`, so the normal 2D ready hotkey is intentionally disabled while 3D is open.
- `TimerPanel` uses `useReadyHold`, which already has useful keyboard hold semantics, but it is tied to the 2D timer panel.
- `ThreeDModeShell` already receives `countdownDisplay`, `users`, `localUserId`, `ownerId`, and `roundNumber`, which are enough for a first watch timer/readiness display.
- `ThreeDModeShell` does not currently receive explicit ready-hold callbacks, so a 3D watch ready flow needs new props from `MainScreen`.

## Control Model

Target controls:

- `T`: toggle top-down camera.
- Backquote: keep current top-down freecam toggle behavior while top-down is active.
- `Tab`: toggle watch open/closed.
- `Space` while watch is open: hold to ready.
- `Space` while watch is closed: keep current 3D movement behavior.
- `Escape`: close menus as it does now; it should also cancel watch ready-hold if the watch is active.

Recommended priority order for keyboard handling:

1. Ignore shortcuts while the event target is an input, textarea, select, or content-editable element.
2. Escape menu/reveal/exit safety paths keep their current priority.
3. Watch state owns `Tab` and owns `Space` only while the watch is active.
4. Top-down owns `T`, movement keys, pan keys, and freecam keys.
5. First-person movement owns `Space` only when the watch is inactive.

## Watch UX Direction

Start with a HUD-style watch overlay plus a small camera/body cue.

First implementation should favor clarity and low risk:

- show a compact watch face in the lower foreground while the `Tab` watch toggle is open
- show timer headline, phase/status, round number, ready count, and owner/host marker if useful
- show a ready affordance: "Hold Space" when ready is available, or a disabled reason when not available
- dim or pause unrelated control hints while the watch is open
- do not add new shared sync state in the first pass

Later visual upgrades can make the watch a true wrist-mounted mesh or animate the local avatar arm into view.

## Scope Recommendation

In scope:

- top-down keybind move from `Tab` to `T`
- watch active state in the 3D shell
- watch timer/session display
- local 3D-ready hold bridge from watch `Space` to existing ready-hold actions
- cleanup on blur, menu open, watch close, and 3D shell exit
- build verification

Out of scope:

- persistent keybinding settings
- networked watch pose or remote avatar animation
- new reducer/session events
- redesigning the 2D `TimerPanel`
- changing ready rules
- replacing existing Control Room monitors
- making the watch a detailed 3D mesh in the first implementation

## Phase Plan

- [x] V30-1: Rebind Top-Down Camera To `T`.
- [x] V30-2: Add Watch Glance State On `Tab`.
- [x] V30-3: Render The Watch Timer Display.
- [x] V30-4: Wire Watch `Space` Hold To Ready.
- [x] V30-5: Add Watch Cleanup, Conflict Guards, And Manual Checks.
- [ ] V30-6: Optional Diegetic Watch Visual Polish. Deferred; not needed for Vision 30 closeout.

## Vision Closeout

Status: Functionally complete as of 2026-04-30.

Vision 30 is closed for the current watch-ready goal:

- Top-down camera is on `T`.
- `Tab` toggles the watch open and closed.
- The watch shows timer/session readiness information.
- Holding `Space` while the watch is open uses the existing ready-hold flow.
- Watch cleanup and input conflict behavior have dedicated manual checklist coverage.
- `npm.cmd run build` passed for implementation phases with the existing Vite large-chunk warning.

V30-6 remains a deliberately deferred polish option. It should only be reopened if the product direction calls for a stronger diegetic wrist/forearm treatment or similar visual polish.

## V30-1 - Rebind Top-Down Camera To `T`

### Summary

Move the top-down camera toggle away from `Tab` so `Tab` is available for the watch.

### Implementation Spec

Status: Prepared for implementation on 2026-04-30.

Code seams verified:

- `src/3d/ThreeDModeShell.tsx` owns top-down input inside `TopDownViewController`.
- The keydown toggle currently checks `event.code !== "Tab"` before calling `onActiveChange(!isActiveRef.current)`.
- The keyup cleanup currently checks `event.code !== "Tab"` before calling `event.preventDefault()`.
- Backquote freecam toggling is separate through `isBackquoteToggle(event)` and must stay unchanged.
- Top-down active state is still owned by `ThreeDModeShell` as `isTopDownViewActive`; this phase should not change that state shape.
- `docs/3d/manual-test-checklist.md` has existing top-down manual checks that still say `Tab`; update only the checks that directly describe the top-down toggle.

Implementation steps:

- In `src/3d/ThreeDModeShell.tsx`, add a small local constant near the other input constants if useful, such as `TOP_DOWN_TOGGLE_CODE = "KeyT"`.
- Replace the top-down keydown toggle check in `TopDownViewController` so `T` toggles top-down instead of `Tab`.
- Replace the matching top-down keyup prevent-default check so it follows the new `T` binding.
- Preserve the existing guards around the toggle: `enabled`, `event.repeat`, `ctrlKey`, `metaKey`, `altKey`, and `isInteractiveTarget(event.target)`.
- Do not add any watch state, watch UI, ready-hold props, or Space behavior in this phase.
- Update targeted manual checklist lines in `docs/3d/manual-test-checklist.md` from `Tab` to `T` where they specifically test top-down toggling or top-down disabling interactions.
- Leave broader Vision 30 future-phase text that refers to `Tab` for watch behavior unchanged.

Files expected to change:

- `src/3d/ThreeDModeShell.tsx`
- `docs/3d/manual-test-checklist.md`
- `docs/3d/3dvision30-control-room-watch-ready.md`
- `changelog.md`

Files to avoid:

- `src/screens/MainScreen.tsx`
- `src/components/TimerPanel.tsx`
- `src/hooks/useReadyHold.ts`
- session/reducer/sync files
- level geometry/config files

### Checklist Items Achieved

- Top-down camera toggle moved from `Tab` to `T`.
- Top-down keyup cleanup now follows the new `T` binding.
- Direct manual checklist top-down key references now use `T`.
- Build verification completed.

### Completed Implementation

- Added `TOP_DOWN_TOGGLE_CODE = "KeyT"` in `src/3d/ThreeDModeShell.tsx`.
- Updated `TopDownViewController` keydown and keyup checks to use the new top-down toggle code.
- Updated direct top-down manual-test checklist lines in `docs/3d/manual-test-checklist.md`.
- Added changelog entry `[2594]`.

### Acceptance Criteria

- Pressing `T` toggles top-down view.
- Pressing `Tab` no longer toggles top-down view.
- Top-down freecam still works.
- Existing pointer-lock, reveal, Escape menu, and Exit behavior remain intact.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manually check first-person to top-down and back with `T`.
- Manually check backquote freecam while top-down is active.
- Manually check `Tab` no longer toggles top-down. A later phase will give `Tab` the watch behavior.

### Risks

- The manual checklist contains many historical `Tab` references; only update direct top-down toggle checks in this phase to avoid rewriting unrelated old validation notes.
- Browser focus traversal behavior may appear when `Tab` is pressed until V30-2 captures `Tab` for watch glance.
- If the keyup prevent-default path is missed, `T` key release could behave differently from the old `Tab` cleanup.

### Wishlist Mapping

- Frees `Tab` for the personal watch interaction.

### Non-Goals

- Do not add watch UI yet.
- Do not change ready-hold behavior yet.

## V30-2 - Add Watch Glance State On `Tab`

### Summary

Add local watch state in `ThreeDModeShell` and make `Tab` toggle it open/closed.

### Implementation Spec

Status: Prepared for implementation on 2026-04-30.

Code seams verified:

- `src/3d/ThreeDModeShell.tsx` now uses `TOP_DOWN_TOGGLE_CODE = "KeyT"` for top-down, so `Tab` is free for the watch.
- Main shell state currently lives near `isTopDownViewActive`, `isTopDownFreeCamActive`, and `isEscapeMenuOpen`.
- The main shell already owns global reveal/escape keyboard effects near the bottom of `ThreeDModeShell`.
- `isInteractiveTarget(event.target)` already exists and should be reused to avoid stealing `Tab` from text fields or menu controls.
- The root `.three-d-shell-overlay` already exposes state through data attributes such as `data-camera-view`, `data-3d-status`, and `data-escape-menu-open`.
- Escape menu tab UI also uses the word "tab" internally as `EscapeMenuTab`; do not rename or touch that system.

Implementation steps:

- Add a local constant near the other input constants, such as `WATCH_GLANCE_CODE = "Tab"`.
- Add `isWatchViewActive` state in `ThreeDModeShell`, colocated with the other shell UI/camera state.
- Add a main-shell keyboard effect, not a controller-level effect, that handles watch `Tab` input while `status === "ready"` and `revealState === "complete"`.
- On `Tab` keydown:
  - ignore repeats
  - ignore ctrl/meta/alt modified events
  - ignore interactive targets
  - ignore while the Escape menu is open
  - call `event.preventDefault()` and `event.stopPropagation()`
  - toggle `isWatchViewActive`
- On `Tab` keyup:
  - if the event target is not interactive, call `event.preventDefault()` and `event.stopPropagation()`
  - leave `isWatchViewActive` unchanged
- Add blur cleanup that clears `isWatchViewActive`.
- Add state cleanup so the watch closes when the shell is no longer ready/complete or when the Escape menu opens.
- Add `data-watch-view-active={isWatchViewActive ? "true" : "false"}` to the root `.three-d-shell-overlay` for verification and future styling.
- Keep the behavior local-only and do not add any visible watch UI in this phase.
- Do not handle `Space` in this phase.

Files expected to change:

- `src/3d/ThreeDModeShell.tsx`
- `docs/3d/3dvision30-control-room-watch-ready.md`
- `changelog.md`

Files to avoid:

- `src/screens/MainScreen.tsx`
- `src/components/TimerPanel.tsx`
- `src/hooks/useReadyHold.ts`
- `src/styles/global.css`
- `docs/3d/manual-test-checklist.md`, unless the implementer chooses to add a very small DOM-attribute manual check
- session/reducer/sync files
- level geometry/config files

### Checklist Items Achieved

- Added local watch glance state in `ThreeDModeShell`.
- Added `Tab` keydown toggle handling for watch glance while the shell is ready and reveal-complete.
- Added cleanup for blur, Escape menu open, and shell status/reveal changes.
- Added a root shell data attribute for verification and future styling.
- Build verification completed.

### Completed Implementation

- Added `WATCH_GLANCE_CODE = "Tab"` in `src/3d/ThreeDModeShell.tsx`.
- Added `isWatchViewActive` state in the 3D shell.
- Added a capture-phase watch keyboard effect that prevents browser focus traversal only when the watch can open.
- Added `data-watch-view-active` to `.three-d-shell-overlay`.
- Added changelog entry `[2595]`.

### Acceptance Criteria

- Pressing `Tab` once sets watch state active and exposes `data-watch-view-active="true"` on the 3D shell root.
- Pressing `Tab` again clears watch state and exposes `data-watch-view-active="false"` on the 3D shell root.
- Watch state does not activate while typing in an input/control field.
- Watch state does not break top-down `T`.
- Watch state clears on blur, Escape menu open, shell status changes, and reveal-state changes.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manually check `Tab` toggles on/off in first-person by watching `data-watch-view-active` on the shell root.
- Manually check `Tab` toggles on/off in top-down view by watching `data-watch-view-active` on the shell root.
- Manually check `Tab` while Escape menu is open; watch state should stay false.
- Manually check `Tab` before reveal completes if possible; watch state should stay false.
- Manually check `T` still toggles top-down after this phase.

### Risks

- `Tab` is a browser focus key, so keydown should prevent default while the watch can open.
- Event ordering with existing capture/bubble listeners should be checked carefully.
- Because V30-2 adds no visible watch UI, DOM data-attribute inspection is the main manual verification path.
- If watch key handling is too broad, it could interfere with Escape menu keyboard accessibility.

### Wishlist Mapping

- Establishes the personal watch action.

### Non-Goals

- Do not wire Space ready-hold yet.
- Do not add a finished visual treatment yet.
- Do not add `MainScreen` ready-hold props yet.

## V30-3 - Render The Watch Timer Display

### Summary

Show a readable watch surface when the watch state is active.

### Implementation Spec

Status: Prepared for implementation on 2026-04-30.

Code seams verified:

- `src/3d/ThreeDModeShell.tsx` already imports `CountdownDisplayState` and `SessionUser`.
- `ThreeDModeShell` already receives `countdownDisplay`, `users`, `localUserId`, `ownerId`, and `roundNumber`.
- `isWatchViewActive` and `data-watch-view-active` were added in V30-2 and should drive visibility in this phase.
- Existing overlay components live near the bottom of `ThreeDModeShell`, alongside `three-d-shell-focus-hint`, `three-d-camera-mode`, and `three-d-area-feedback`.
- Existing 3D overlay CSS lives in `src/styles/global.css` near `.three-d-shell-focus-hint`, `.three-d-camera-mode`, and `.three-d-area-feedback`.
- `SessionUser.presence` is `"idle" | "ready" | "spectating"`, so ready and active counts can be derived locally without new sync state.
- `CountdownDisplayState` exposes `phase`, `headline`, `subheadline`, `timerText`, `accentText`, and `isUrgent`.

Implementation steps:

- Add a small local `WatchTimerDisplay` component in `src/3d/ThreeDModeShell.tsx`, near the other small overlay components.
- Suggested props:
  - `countdownDisplay: CountdownDisplayState`
  - `users: SessionUser[]`
  - `localUserId: string`
  - `ownerId: string`
  - `roundNumber: number`
- Derive:
  - `readyCount` from users with `presence === "ready"`
  - `activeCount` from users with `presence !== "spectating"`
  - `localUser`
  - `isLocalHost`
  - a local presence label such as `READY`, `IDLE`, `SPECTATING`, or `UNJOINED`
- Render the display only when `isWatchViewActive` is true and the shell is `status === "ready"` with `revealState === "complete"`.
- Place the watch render near the existing focus/camera/area overlays, not inside the `<Canvas>`.
- Use existing countdown copy:
  - main time: `countdownDisplay.timerText`
  - headline: `countdownDisplay.headline`
  - phase/status: `countdownDisplay.phase`
  - optional line: `countdownDisplay.accentText ?? countdownDisplay.subheadline`
  - round number and ready/active counts
- Include first-pass helper copy like `HOLD TAB TO VIEW` and `SPACE READY SOON` or `READY CONTROL NEXT`, but do not wire Space yet.
- Add CSS in `src/styles/global.css` for `.three-d-watch-display` and child elements.
- Keep the watch compact and fixed near the lower foreground, avoiding overlap with Exit/Menu controls on the right and camera mode/area feedback on the left.
- Use `pointer-events: none`; this is display-only.
- Use `countdownDisplay.isUrgent` or a data attribute such as `data-urgent` for urgency styling.
- Do not add animation-heavy camera/body movement in this phase.

Files expected to change:

- `src/3d/ThreeDModeShell.tsx`
- `src/styles/global.css`
- `docs/3d/3dvision30-control-room-watch-ready.md`
- `changelog.md`

Files to avoid:

- `src/screens/MainScreen.tsx`
- `src/components/TimerPanel.tsx`
- `src/hooks/useReadyHold.ts`
- session/reducer/sync files
- level geometry/config files

### Checklist Items Achieved

- Added a visible watch timer HUD driven by `isWatchViewActive`.
- Displayed timer text, headline, phase, round, ready/active counts, and local presence from existing shell props.
- Added display-only helper copy that keeps Space ready-hold clearly reserved for the next phase.
- Added compact responsive watch styling with urgency treatment.
- Build verification completed.

### Completed Implementation

- Added `WatchTimerDisplay` and local presence formatting in `src/3d/ThreeDModeShell.tsx`.
- Rendered the watch overlay only while the shell is ready, reveal-complete, and `isWatchViewActive`.
- Added `.three-d-watch-display` styles in `src/styles/global.css`.
- Added changelog entry `[2596]`.

### Acceptance Criteria

- Watch appears only while the `Tab` watch toggle is open.
- Timer headline is readable at common viewport sizes.
- Watch display updates from existing countdown/session state.
- UI does not overlap Exit/Escape controls in a broken way.
- Watch display does not capture pointer events.
- Watch display does not imply Space ready-hold is already functional.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manually check pressing `Tab` shows the watch and pressing `Tab` again hides it.
- Manually check desktop and narrow viewport sizing.
- Manually check idle, lobby/armed, precount, active, and completed timer phases if easy.
- Manually check `T` top-down still works and the watch can appear in top-down if V30-2 allows it.
- Manually check Exit/Menu controls remain reachable and visible.

### Risks

- Overly large overlay could fight the 3D scene.
- Tiny text could become unreadable on small screens.
- Copy like `SPACE READY SOON` must be clear enough that users do not expect Space to ready up until V30-4.
- Styling can easily collide with existing fixed overlays; keep dimensions constrained.

### Wishlist Mapping

- Lets the player check the session timer from anywhere in the Control Room.

### Non-Goals

- Do not implement Space ready-hold yet.
- Do not add new synchronized timer state.
- Do not add new props to `ThreeDModeShell`.
- Do not add a 3D wrist mesh or camera animation yet.

## V30-4 - Wire Watch `Space` Hold To Ready

### Summary

Allow the player to hold `Space` to ready while the watch is open.

### Implementation Spec

Status: Prepared for implementation on 2026-04-30.

Code seams verified:

- `MainScreen` owns `startReadyHold()` and `endReadyHold()` from the session hook.
- The existing `handleStartReadyHold` in `MainScreen` intentionally returns when `isThreeDModeOpen` is true; keep that guard for the normal 2D `TimerPanel` path.
- `TimerPanel` disables its normal ready hotkey while 3D is open through `readyHotkeyEnabled={!isThreeDModeOpen}`.
- `TimerPanel` enables hold only when `lobbyState.canHoldToReady && syncReady`.
- `syncReady` in `TimerPanel` is `state.syncStatus.mode === "mock" || state.syncStatus.connection === "connected"`.
- `lobbyState.canHoldToReady`, `lobbyState.releaseStartsCountdown`, `lobbyState.isJoined`, and `lobbyState.isLocalUserSpectating` are already derived in `MainScreen`; do not rederive ready rules in 3D.
- `ThreeDModeShell` already owns `isWatchViewActive`, the watch `Tab` key handling, and the watch display.
- `Space` is currently used by first-person jump and top-down freecam vertical movement, so the watch-open `Space` handler must have explicit priority only while the watch is visible.

Implementation steps:

- In `MainScreen`, add a 3D-specific ready start handler separate from `handleStartReadyHold`.
- Suggested shape:
  - `handleThreeDWatchStartReadyHold`
  - return unless `isThreeDModeOpen`
  - return unless `lobbyState.canHoldToReady`
  - return unless sync is ready, using the same `mock || connected` rule as `TimerPanel`
  - play `ui_ready_hold_start`
  - call `startReadyHold()`
- Add a matching `handleThreeDWatchEndReadyHold`.
  - It should be safe to call even if no hold is active.
  - Match existing release cue behavior: play `ui_ready_release_cancel` when `!lobbyState.releaseStartsCountdown`, then call `endReadyHold()`.
- Pass explicit props into `ThreeDModeShell`:
  - `canWatchReadyHold={lobbyState.canHoldToReady && (state.syncStatus.mode === "mock" || state.syncStatus.connection === "connected")}`
  - `watchReadyHoldStatus={...}` or similarly named short display copy
  - `onStartWatchReadyHold={handleThreeDWatchStartReadyHold}`
  - `onEndWatchReadyHold={handleThreeDWatchEndReadyHold}`
- In `ThreeDModeShellProps`, add those props with clear names indicating they are watch-specific.
- Add local `isWatchReadyHolding` state/ref in `ThreeDModeShell` so repeated Space keydown does not repeatedly call start.
- Add a watch `Space` key effect in `ThreeDModeShell`:
  - active only when `isWatchViewActive`, `status === "ready"`, `revealState === "complete"`, and Escape menu is closed
  - ignore repeats for starting
  - ignore ctrl/meta/alt modified events
  - ignore interactive targets
  - on keydown, prevent/default stop propagation; if `canWatchReadyHold`, call `onStartWatchReadyHold` and mark local holding true
  - on keyup, prevent/default stop propagation; if locally holding, call `onEndWatchReadyHold` and mark local holding false
- Add cleanup that ends a local watch hold when:
  - `isWatchViewActive` becomes false
  - Escape menu opens
  - status/reveal makes controls unavailable
  - window blur happens
  - component unmounts
- Update `WatchTimerDisplay` props/copy so the footer changes from `READY CONTROL NEXT` to actual ready state:
  - available and not holding: `HOLD SPACE TO READY`
  - holding: `HOLDING READY`
  - unavailable: short disabled status such as `JOIN SESSION`, `SPECTATING`, `WAITING`, or `SYNC OFFLINE`
- Do not alter `useReadyHold`, `TimerPanel`, or normal 2D ready-hotkey behavior.

Files expected to change:

- `src/screens/MainScreen.tsx`
- `src/3d/ThreeDModeShell.tsx`
- `docs/3d/3dvision30-control-room-watch-ready.md`
- `changelog.md`

Files to avoid:

- `src/components/TimerPanel.tsx`
- `src/hooks/useReadyHold.ts`
- session/reducer/sync files
- level geometry/config files
- `src/styles/global.css` unless a tiny existing-watch-copy style adjustment is truly needed

### Checklist Items Achieved

- Added a 3D watch-specific ready-hold path from `MainScreen`.
- Passed watch ready availability, status copy, and ready-hold callbacks into `ThreeDModeShell`.
- Added local watch ready-hold state/ref tracking to avoid repeat starts and duplicate releases.
- Added capture-phase `Space` handling that only takes priority while the watch is visible.
- Updated the watch footer copy for available, holding, and unavailable ready states.
- Build verification completed.

### Completed Implementation

- Added `canWatchReadyHold`, `watchReadyHoldStatus`, `onStartWatchReadyHold`, and `onEndWatchReadyHold` props to `ThreeDModeShell`.
- Added `handleThreeDWatchStartReadyHold` and `handleThreeDWatchEndReadyHold` in `MainScreen`, reusing existing lobby and sync eligibility rules.
- Added watch-only `Space` keydown/keyup handling in `ThreeDModeShell` with repeat, modifier, interactive-target, Escape menu, and availability guards.
- Added cleanup that ends local watch ready-hold when the watch closes, controls become unavailable, the window blurs, or the shell unmounts.
- Added changelog entry `[2597]`.

### Acceptance Criteria

- With watch open and ready available, holding `Space` activates the same ready-hold behavior as the 2D button.
- Releasing `Space` ends the hold.
- Toggling the watch closed with `Tab` while holding `Space` ends the hold.
- Outside the watch, `Space` still acts as jump/freecam vertical movement as currently designed.
- Ready rules remain owned by existing lobby/session state.
- Normal 2D `TimerPanel` ready button and hotkey behavior remain unchanged.
- Watch copy reflects available, holding, and unavailable ready states.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manually check host and non-host ready states if possible.
- Manually check Space jump still works when watch is closed.
- Manually check Space ready-hold while watch is open.
- Manually check toggling the watch closed with `Tab` while Space is held ends ready hold.
- Manually check sync unavailable or unjoined state does not call ready start.

### Risks

- Space is already a movement key, so watch-open priority must be explicit.
- Ending hold reliably on blur/menu/exit matters to avoid stuck ready state.
- `MainScreen` handler currently guards against `isThreeDModeOpen`; that guard may need a watch-specific path or a separate callback that intentionally permits 3D watch ready.
- Calling `endReadyHold` when no 3D watch hold is active may be harmless, but the shell should track local hold state to avoid unnecessary release calls/cues.
- The watch should not duplicate or bypass lobby/session hold eligibility rules.

### Wishlist Mapping

- Lets the player ready up directly from the 3D world.

### Non-Goals

- Do not change the 2D TimerPanel hotkey behavior.
- Do not add new ready semantics.
- Do not add new reducer events or sync state.
- Do not change Space jump/freecam behavior outside the watch.

## V30-5 - Add Watch Cleanup, Conflict Guards, And Manual Checks

### Summary

Harden the watch against input conflicts and stuck states.

### Implementation Spec

Status: Prepared for implementation on 2026-04-30.

Code seams verified:

- The current watch model is a `Tab` toggle, not hold-to-view.
- `ThreeDModeShell` currently closes `isWatchViewActive` when:
  - `status !== "ready"` or `revealState !== "complete"`
  - `isEscapeMenuOpen` becomes true
  - window blur fires in the watch `Tab` effect
- `ThreeDModeShell` currently ends local watch ready-hold when:
  - `isWatchViewActive` becomes false
  - Escape menu opens
  - status/reveal changes make controls unavailable
  - `canWatchReadyHold` becomes false
  - window blur fires in the watch ready `Space` effect
  - the watch ready `Space` effect unmounts
- The watch `Tab` effect currently prevents default/propagation on keydown and keyup only when the shell is ready, reveal-complete, not modified, not interactive, and not in Escape menu.
- The watch `Space` effect currently prevents default/propagation only while the watch is open or while a local watch ready-hold is active.
- `TopDownViewController` now uses `TOP_DOWN_TOGGLE_CODE = "KeyT"`; top-down no longer owns `Tab`.
- `docs/3d/manual-test-checklist.md` has a Controls section and several 3D stability sections, but no dedicated watch-ready checklist yet.

Implementation steps:

- Keep the `Tab` watch behavior as toggle-on/toggle-off.
- Audit the two watch keyboard effects in `src/3d/ThreeDModeShell.tsx` for duplicate or missing cleanup now that `Tab` is a toggle.
- If needed, add one small shared helper inside `ThreeDModeShell` to close the watch and end local watch ready-hold together, but avoid a broad input refactor.
- Ensure toggling the watch closed with `Tab` while holding `Space` ends the local watch ready-hold exactly once.
- Ensure Escape menu opening closes the watch and ends the local watch ready-hold exactly once.
- Ensure `onExit`/shell unmount still ends a local watch ready-hold through existing effect cleanup; do not change exit behavior unless a gap is found.
- Preserve the current choice that the watch can be opened in top-down view unless implementation discovers an actual conflict.
- Confirm keyup handling still prevents browser focus traversal after a `Tab` toggle.
- Update `docs/3d/manual-test-checklist.md` with a dedicated watch-ready subsection near the existing Controls or Exit/Stability checks.
- Manual checklist should cover:
  - `Tab` toggles the watch open/closed in first-person
  - `Tab` toggles the watch open/closed in top-down
  - `Space` jumps/moves normally while watch is closed
  - `Space` starts/ends ready-hold while watch is open and ready is available
  - toggling the watch closed while holding `Space` releases ready-hold
  - Escape menu closes the watch and releases ready-hold
  - window blur closes the watch and releases ready-hold
  - Exit while the watch is open returns cleanly to the 2D dashboard
  - `Tab` does not focus hidden page controls while the 3D shell is ready
- Do not add new visible UI, animations, sync state, reducer events, or 2D TimerPanel behavior changes.

Files expected to change:

- `src/3d/ThreeDModeShell.tsx`, only if the audit finds a real cleanup/guard gap.
- `docs/3d/manual-test-checklist.md`
- `docs/3d/3dvision30-control-room-watch-ready.md`
- `changelog.md` only if code changes are made.

Files to avoid:

- `src/screens/MainScreen.tsx`, unless a discovered cleanup gap requires parent-level exit handling.
- `src/components/TimerPanel.tsx`
- `src/hooks/useReadyHold.ts`
- session/reducer/sync files
- level geometry/config files
- `src/styles/global.css`

### Checklist Items Achieved

- Audited the current watch `Tab` and watch `Space` keyboard effects against the V30-5 cleanup requirements.
- Confirmed existing local hold ref cleanup prevents duplicate ready-release calls across watch close, Space keyup, blur, Escape menu, and shell unmount paths.
- Preserved the current decision that watch toggle is allowed in top-down view.
- Added dedicated watch-ready manual test coverage.
- Build verification completed.

### Completed Implementation

- Added a `Control Room Watch Ready` section to `docs/3d/manual-test-checklist.md`.
- Covered first-person watch toggle, top-down watch toggle, normal Space behavior while closed, watch Space ready-hold, Tab-close while holding Space, Escape, blur, Exit, and unavailable-ready states.
- No code changes were needed for this phase after auditing the existing cleanup paths.

### Acceptance Criteria

- No stuck watch state after blur, Escape, Exit, or shell close.
- No stuck ready-hold after toggling Tab, releasing Space, blur, Escape, or Exit.
- Top-down `T` and watch `Tab` can be used in the same session without corrupting camera state.
- `Tab` keyup does not move browser focus to hidden or underlying page controls while 3D is ready.
- Manual checklist has watch-specific coverage for the new `Tab` toggle and watch `Space` ready-hold.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual check: watch toggle open/close, Space hold/release, blur tab/window, Escape menu, Exit.
- Manual check: first-person and top-down watch behavior.
- Manual check: `Space` still jumps or freecam-rises when the watch is closed.

### Risks

- Top-down plus watch is currently allowed; disabling it would be a control-model change and should only happen if there is a concrete conflict.
- Manual testing is important because keyboard cleanup bugs are easy to miss in build-only verification.
- Calling ready-hold release from both watch close cleanup and Space keyup could create duplicate release cues if local hold state is not respected.

### Wishlist Mapping

- Makes the feature dependable enough for normal play.

### Non-Goals

- Do not add polish that changes the core control model.
- Do not change the `Tab` toggle back to hold-to-view.

## V30-6 - Optional Diegetic Watch Visual Polish

### Summary

Improve the watch from a readable HUD into a stronger in-world object after the core flow works.

### Implementation Spec

Prepare from code before implementation.

Possible directions:

- Add a small wrist/forearm visual during watch glance.
- Animate camera pitch/FOV very subtly while respecting reduced-motion preferences.
- Render a simple watch mesh or panel in the 3D scene.
- Add light emissive accents that match Control Room styling.
- Add an optional close affordance or alternate accessibility control only if requested.

### Acceptance Criteria

- Watch still reads clearly.
- Performance impact is negligible.
- Reduced-motion users are not forced into a strong camera animation.
- Core ready-hold behavior remains unchanged.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually check desktop and narrow viewport readability.
- Manually check FPS impact in the Control Room.

### Risks

- A true 3D wrist mesh could add animation/camera complexity.
- Visual polish should not delay the functional watch-ready path.

### Wishlist Mapping

- Makes the watch feel like part of the 3D world instead of a temporary overlay.

### Non-Goals

- Do not redesign avatars broadly.
- Do not add networked watch animation.
