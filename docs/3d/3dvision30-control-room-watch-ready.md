# Secret 3D World Vision 30 - Control Room Watch Ready

## Purpose

Vision 30 plans a small but important control-room immersion pass:

- move the top-down camera toggle from `Tab` to `T`
- free `Tab` for a new wrist-watch glance action
- show the session timer on the watch
- let the player hold `Space` from the watch to ready up while staying in the 3D world

The goal is to make the hidden 3D world feel less like a separate mode from Sync Sesh. The player should be able to walk around the Control Room, check the live timer at any moment, and ready up without returning to the 2D dashboard.

## Product Recommendation

Treat the watch as a quick diegetic control, not a heavy menu.

Recommended first behavior:

```text
Hold Tab
  player glances at their watch
  watch shows timer/session status
  Space becomes hold-to-ready while watch is visible

Release Tab
  watch closes
  any active watch ready-hold is released
  normal movement controls return
```

This keeps the feature physically readable and avoids a sticky state where the user forgets the watch is open. A tap-to-toggle accessibility option can come later after the core path feels good.

## Why This Change

The Control Room already shows timer and session data on monitors, but that information depends on where the player is looking. A watch gives the player a personal, always-available session surface.

Moving top-down to `T` also makes the controls more semantically clear:

- `T` means top-down
- `Tab` means quick personal glance
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
- `Tab` down: open watch glance.
- `Tab` up: close watch glance.
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

- show a compact watch face in the lower foreground while `Tab` is held
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
- cleanup on keyup, blur, menu open, watch close, and 3D shell exit
- build verification

Out of scope:

- persistent keybinding settings
- tap-to-toggle watch mode
- networked watch pose or remote avatar animation
- new reducer/session events
- redesigning the 2D `TimerPanel`
- changing ready rules
- replacing existing Control Room monitors
- making the watch a detailed 3D mesh in the first implementation

## Phase Plan

- [ ] V30-1: Rebind Top-Down Camera To `T`.
- [ ] V30-2: Add Watch Glance State On `Tab`.
- [ ] V30-3: Render The Watch Timer Display.
- [ ] V30-4: Wire Watch `Space` Hold To Ready.
- [ ] V30-5: Add Watch Cleanup, Conflict Guards, And Manual Checks.
- [ ] V30-6: Optional Diegetic Watch Visual Polish.

## V30-1 - Rebind Top-Down Camera To `T`

### Summary

Move the top-down camera toggle away from `Tab` so `Tab` is available for the watch.

### Implementation Spec

Prepare from code before implementation.

Expected direction:

- Replace the top-down toggle key check in `TopDownViewController` from `event.code === "Tab"` to `event.code === "KeyT"`.
- Update matching keyup prevention so `T` does not leak unwanted browser/app behavior if needed.
- Keep repeat/modifier/interactive-target guards.
- Leave backquote freecam behavior unchanged.
- Update visible control copy or help text if a current hint says `Tab` for top-down.

### Acceptance Criteria

- Pressing `T` toggles top-down view.
- Pressing `Tab` no longer toggles top-down view.
- Top-down freecam still works.
- Existing pointer-lock, reveal, Escape menu, and Exit behavior remain intact.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually check first-person to top-down and back with `T`.
- Manually check backquote freecam while top-down is active.

### Risks

- Hidden copy may still mention `Tab`.
- Browser focus traversal behavior may appear if `Tab` is not captured by the later watch phase.

### Wishlist Mapping

- Frees `Tab` for the personal watch interaction.

### Non-Goals

- Do not add watch UI yet.
- Do not change ready-hold behavior yet.

## V30-2 - Add Watch Glance State On `Tab`

### Summary

Add local watch state in `ThreeDModeShell` and make `Tab` open/close it.

### Implementation Spec

Prepare from code before implementation.

Expected direction:

- Add `isWatchViewActive` state in `ThreeDModeShell`.
- Add keyboard handling for `Tab` down/up while the 3D shell is ready and reveal is complete.
- Use hold behavior first: keydown opens, keyup closes.
- Ignore repeat events and interactive targets.
- Close the watch on window blur.
- Add a shell data attribute such as `data-watch-view-active` for styling/debugging.
- Keep behavior local-only.

### Acceptance Criteria

- Holding `Tab` sets watch state active.
- Releasing `Tab` clears watch state.
- Watch state does not activate while typing in an input/control field.
- Watch state does not break top-down `T`.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually check `Tab` down/up in first-person.
- Manually check `Tab` while Escape menu is open.
- Manually check `Tab` during/after reveal if applicable.

### Risks

- `Tab` is a browser focus key, so keydown should prevent default while the watch can open.
- Event ordering with existing capture/bubble listeners should be checked carefully.

### Wishlist Mapping

- Establishes the personal watch action.

### Non-Goals

- Do not wire Space ready-hold yet.
- Do not add a finished visual treatment yet.

## V30-3 - Render The Watch Timer Display

### Summary

Show a readable watch surface when the watch state is active.

### Implementation Spec

Prepare from code before implementation.

Expected direction:

- Add a small watch overlay component in or near `ThreeDModeShell`.
- Feed it existing props already available to `ThreeDModeShell`: `countdownDisplay`, `users`, `localUserId`, `ownerId`, and `roundNumber`.
- Show timer headline, timer phase/status, round number, and readiness summary.
- Use CSS in `src/styles/global.css` consistent with existing 3D shell overlays.
- Keep the first implementation as a HUD/watch overlay rather than a complex mesh.
- Optionally add a subtle camera/body cue only if it stays low-risk.

### Acceptance Criteria

- Watch appears only while `Tab` is held.
- Timer headline is readable at common viewport sizes.
- Watch display updates from existing countdown/session state.
- UI does not overlap Exit/Escape controls in a broken way.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually check desktop and narrow viewport sizing.
- Manually check idle, lobby/armed, precount, active, and completed timer phases if easy.

### Risks

- Overly large overlay could fight the 3D scene.
- Tiny text could become unreadable on small screens.

### Wishlist Mapping

- Lets the player check the session timer from anywhere in the Control Room.

### Non-Goals

- Do not implement Space ready-hold yet.
- Do not add new synchronized timer state.

## V30-4 - Wire Watch `Space` Hold To Ready

### Summary

Allow the player to hold `Space` to ready while the watch is open.

### Implementation Spec

Prepare from code before implementation.

Expected direction:

- Add explicit ready-hold props to `ThreeDModeShell`, passed from `MainScreen`.
- Suggested props:
  - `canHoldToReady`
  - `isReadyHoldAvailable` or equivalent derived state if needed
  - `onStartReadyHold`
  - `onEndReadyHold`
  - optional disabled/status copy for watch display
- Reuse existing ready rules from `lobbyState` in `MainScreen`; do not duplicate session rules in 3D.
- While `isWatchViewActive`, `Space` keydown starts watch ready-hold.
- `Space` keyup ends watch ready-hold.
- Ignore repeats and interactive targets.
- If the watch closes while Space is held, end the ready hold.
- If ready is unavailable, do not call start; show disabled watch copy instead.

### Acceptance Criteria

- With watch open and ready available, holding `Space` activates the same ready-hold behavior as the 2D button.
- Releasing `Space` ends the hold.
- Releasing `Tab` while holding `Space` ends the hold.
- Outside the watch, `Space` still acts as jump/freecam vertical movement as currently designed.
- Ready rules remain owned by existing lobby/session state.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually check host and non-host ready states if possible.
- Manually check Space jump still works when watch is closed.
- Manually check Space ready-hold while watch is open.

### Risks

- Space is already a movement key, so watch-open priority must be explicit.
- Ending hold reliably on blur/menu/exit matters to avoid stuck ready state.
- `MainScreen` handler currently guards against `isThreeDModeOpen`; that guard may need a watch-specific path or a separate callback that intentionally permits 3D watch ready.

### Wishlist Mapping

- Lets the player ready up directly from the 3D world.

### Non-Goals

- Do not change the 2D TimerPanel hotkey behavior.
- Do not add new ready semantics.

## V30-5 - Add Watch Cleanup, Conflict Guards, And Manual Checks

### Summary

Harden the watch against input conflicts and stuck states.

### Implementation Spec

Prepare from code before implementation.

Expected direction:

- Ensure watch closes and ready-hold ends on blur.
- Ensure watch closes and ready-hold ends when Escape menu opens.
- Ensure watch closes and ready-hold ends when reveal/return/status changes make controls unavailable.
- Ensure top-down view and watch do not fight over camera state.
- Confirm `Tab` does not focus hidden page controls while 3D is active.
- Update manual test docs if the repo's 3D manual checklist has a suitable section.

### Acceptance Criteria

- No stuck watch state after blur, Escape, Exit, or shell close.
- No stuck ready-hold after releasing Tab, releasing Space, blur, Escape, or Exit.
- Top-down `T` and watch `Tab` can be used in the same session without corrupting camera state.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manual check: watch open/close, Space hold/release, blur tab/window, Escape menu, Exit.

### Risks

- This phase may uncover whether watch should be disabled in top-down view or allowed there.
- Manual testing is important because keyboard cleanup bugs are easy to miss in build-only verification.

### Wishlist Mapping

- Makes the feature dependable enough for normal play.

### Non-Goals

- Do not add polish that changes the core control model.

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
- Add a tap-to-toggle accessibility option only if requested.

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
