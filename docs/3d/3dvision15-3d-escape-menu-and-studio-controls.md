# Secret 3D World Vision 15 - Escape Menu And Studio Controls

## Purpose

Vision 15 adds a real in-world/overlay control surface for the hidden 3D world.

The room is getting powerful enough that users need a place to tune the experience without editing code: visual filters, movement speed, grab-box visibility, FPS display, and quick recording-studio test controls. This should live inside the 3D world experience and stay separate from the normal front-end timer/lobby/dashboard area.

## Product Recommendation

Use `Esc` as a 3D pause/settings menu, but preserve the current pointer-lock escape behavior:

- If pointer lock is active, first `Esc` exits pointer lock.
- If already unlocked/in 3D, `Esc` toggles the 3D menu.
- The menu should pause/capture 3D keyboard shortcuts while open so `F`, `Q/E`, `WASD`, click-to-place, guitar keys, and layout editing do not accidentally fire.
- The normal top-right `Exit` button remains separate and visible.
- The normal 2D timer/lobby/front-end panels are not redesigned by this vision.

Menu structure:

- `Visual`
  - Brightness
  - Contrast
  - Saturation
  - Gamma
- `Movement`
  - Walk speed slider
  - Sprint speed can scale from walk speed or get its own later slider
- `Graphics`
  - Show grab boxes toggle
  - Show FPS checkbox
- `Studio`
  - Quick recording-room controls for testing instruments, audio engine, DAW transport, and key station actions

## Wishlist

User-requested wishlist:

1. Add normal Photoshop/game-filter controls:
   - brightness
   - contrast
   - saturation
   - gamma
2. Add a walk speed slider so the user can speed themselves up.
3. Add a graphics toggle to turn off visibility of grab boxes while keeping grab boxes functional.
4. Add a checkbox to display FPS while in the 3D world.
5. Add an area for easy recording-studio controls.
   - This can be a 2D menu inside the 3D world.
   - It should control/test most instrument stations and DAW behavior.
   - It should be separate from the front-end timer area.

## Code Facts

Current facts from code research:

- `src/3d/ThreeDModeShell.tsx` owns the 3D overlay, Canvas, status panels, Exit button, focus hint, camera mode pill, and first-person/top-down input controllers.
- `Escape` currently exits pointer lock in `FirstPersonMovementController`.
- `WALK_SPEED_UNITS_PER_SECOND` and `SPRINT_SPEED_UNITS_PER_SECOND` are constants in `ThreeDModeShell.tsx`.
- `FirstPersonMovementController` currently computes speed from those constants.
- `src/styles/global.css` owns the existing `.three-d-shell-*`, `.three-d-camera-mode`, and `.three-d-interaction-reticle` styles.
- `src/3d/Level1RecordingStudioRoom.tsx` owns V14 station grab boxes through `StudioLayoutStationGroup`.
- V14 grab boxes currently render as wireframe hitboxes inside the station wrapper. They can be hidden visually while still retaining the mesh/ref for raycast targeting.
- `ThreeDModeShell.tsx` already has access to:
  - `localDawState`
  - `localDawActions`
  - `localDawAudioState`
  - `localDawAudioActions`
  - `soundCloudBooth`
  - `studioGuitar`
  - shared DAW transport actions
- `Level1RecordingStudioRoom.tsx` already exposes many station-specific controls in 3D, but a 2D menu can call the same action surfaces for fast testing.

## Design Direction

The Escape menu should feel like a compact game settings overlay, not a marketing page and not a normal app settings page.

Visual shape:

- Center or right-side modal/panel over the 3D canvas.
- Dark translucent shell, crisp borders, small tabs.
- Sliders for visual filters and walk speed.
- Toggles/checkboxes for grab-box visibility and FPS.
- Buttons for studio tests.
- It should not hide the Exit button permanently.
- It should not cover the normal 2D timer/dashboard outside the hidden world.

Recommended tabs:

```text
ESC MENU

[Visual] [Movement] [Graphics] [Studio]
```

Visual tab:

```text
Brightness  [----|------]
Contrast    [------|----]
Saturation  [-----|-----]
Gamma       [----|------]
Reset Visuals
```

Movement tab:

```text
Walk Speed  [----|------]  2.2x
Reset Speed
```

Graphics tab:

```text
[x] Show grab boxes
[ ] Show FPS
```

Studio tab:

```text
ENGINE       [ON/OFF]
MASTER       [-] [100%] [+]
TRANSPORT    [PLAY/STOP] [- BPM] [+ BPM]
TEST SOUND   [PIANO] [KICK] [SNARE] [FM] [BASS]
GUITAR       [REC ON/OFF]
PATCH        [RESET PATCH]
```

## Phase Plan

- [x] V15-1: 3D Settings State And Escape Menu Shell.
- [x] V15-2: Visual Filter Controls.
- [x] V15-3: Walk Speed Control.
- [x] V15-4: Grab Box Visibility Toggle.
- [x] V15-5: FPS Display.
- [x] V15-6: Recording Studio Quick Controls.
- [hold] V15-7: Persist/Sync User 3D Preferences.

## V15-1: 3D Settings State And Escape Menu Shell

Status: `[x]` complete.

### Summary

Add the Escape menu overlay and local settings state without changing actual visual/movement/studio behavior yet.

### Implementation Spec

Manager-prepared from code on 2026-04-22.

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/styles/global.css`

Files to avoid:

- Do not change session reducer/types for this phase.
- Do not change station geometry or audio engine behavior for this phase.
- Do not edit normal 2D lobby/timer/dashboard components.

Reused helpers and code facts:

- `ThreeDModeShell.tsx` already owns the hidden-world overlay, `Canvas`, `Exit` button, focus hint, camera-mode pill, and input controllers.
- `FirstPersonMovementController` already exits pointer lock on `Escape`; the shell menu should only toggle when `document.pointerLockElement` is not active.
- The shell already gates input through `isFirstPersonControlActive` and `areInteractionsEnabled`; menu-open state should feed those gates so movement, aim interactions, guitar clicks, and layout shortcuts do not leak while the menu is open.
- `global.css` already contains the `.three-d-shell-*` overlay styles to extend.

Approved implementation:

- Add local 3D settings/menu state in `ThreeDModeShell.tsx`.
- Add menu open/closed state and an active tab state.
- Toggle menu with `Esc` only when pointer lock is not active.
- Close/toggle reliably with `Esc` and a visible close button.
- Render an overlay menu inside `.three-d-shell-overlay`.
- Add tabs for `Visual`, `Movement`, `Graphics`, and `Studio`.
- Show shell-only placeholder content for later tabs if the later behavior is not in this phase.
- While menu is open, prevent gameplay/layout shortcuts from firing by disabling the relevant input and interaction controller `enabled` props.

Acceptance checks:

- `Esc` opens/closes menu when already unlocked in 3D.
- `Esc` still exits pointer lock first.
- Menu does not appear outside the hidden 3D world.
- Exit button remains available.
- No behavior settings are applied yet.

Risks:

- `Escape` overlaps with V14 move cancel; menu-open gating must not make object movement unstable.
- Overlay controls must stop propagation so clicks do not hit the 3D scene.

Non-goals:

- Do not implement visual filters, speed changes, FPS, grab-box toggle, persistence, or studio action buttons in V15-1.

### Acceptance Criteria

- `Esc` opens/closes menu when already unlocked in 3D.
- `Esc` still exits pointer lock first.
- Menu does not appear outside the hidden 3D world.
- Exit button remains available.
- No behavior settings are applied yet.

### Build And Manual Checks

- `npm.cmd run build`.
- Hidden room opens with `syncsesh`.
- Pointer lock escape still works.
- Menu opens and closes reliably.

### Risks

- Escape key conflicts with pointer lock and V14 move cancel.
- Menu focus must not leak keys into the world.

### Non-Goals

- Do not implement visual filters, speed changes, FPS, grab-box toggle, or studio buttons yet.

## V15-2: Visual Filter Controls

Status: `[x]` complete.

### Summary

Add brightness, contrast, saturation, and gamma controls to the Visual tab.

### Implementation Spec

Manager-prepared from code on 2026-04-22.

Expected work:

- Add visual settings fields:
  - brightness
  - contrast
  - saturation
  - gamma
- Apply them to the 3D canvas through a CSS filter or post-processing-free approach first.
- Use sliders with clear ranges and reset button.
- Keep defaults visually identical.
- Use `ThreeDModeShell.tsx` local settings state and `global.css` menu styles.
- Apply the filter to the hidden-world canvas element, not to the normal app shell.
- Approximate gamma in the first pass without adding a post-processing package.

Recommended ranges:

- Brightness: `0.5` to `1.5`, default `1`.
- Contrast: `0.5` to `1.6`, default `1`.
- Saturation: `0` to `2`, default `1`.
- Gamma: `0.6` to `1.8`, default `1`.

### Acceptance Criteria

- Sliders visibly affect only the 3D world canvas/overlay area as intended.
- Reset Visuals returns defaults.
- Normal 2D app remains unaffected after exiting the 3D world.

### Build And Manual Checks

- `npm.cmd run build`.
- Brightness/contrast/saturation/gamma visual smoke test.

### Risks

- CSS filter gamma is not true color-managed gamma. If this is not good enough, later phases can add shader/post-processing.

### Non-Goals

- Do not introduce a new post-processing package in the first pass.

## V15-3: Walk Speed Control

Status: `[x]` complete.

### Summary

Add a walk speed slider that changes first-person movement speed.

### Implementation Spec

Manager-prepared from code on 2026-04-22.

Expected work:

- Add walk speed multiplier or direct speed setting to 3D settings state.
- Pass it into `FirstPersonMovementController`.
- Apply it to walk speed.
- Scale sprint and slide speed carefully or leave sprint as a separate future control.
- Add reset speed button.
- Add a `walkSpeedMultiplier` prop to `FirstPersonMovementController`.
- Clamp the multiplier before it affects movement math.
- Keep top-down/free-fly camera speed unchanged in this phase.

Recommended first pass:

- Slider label: `Walk Speed`.
- Range: `0.5x` to `3x`.
- Default: `1x`.
- Actual walk speed: `WALK_SPEED_UNITS_PER_SECOND * multiplier`.
- Sprint speed: `SPRINT_SPEED_UNITS_PER_SECOND * multiplier`.

### Acceptance Criteria

- Slider makes the user visibly faster/slower in first person.
- Default speed remains unchanged.
- Top-down/free-cam speed is unchanged unless explicitly included.

### Build And Manual Checks

- `npm.cmd run build`.
- First-person walk speed test at default, slow, fast.

### Risks

- High speed can make collision feel rough.

### Non-Goals

- Do not redesign collision or physics.

## V15-4: Grab Box Visibility Toggle

Status: `[x]` complete.

### Summary

Let the user hide V14 grab boxes visually while keeping their raycast hitboxes active.

### Implementation Spec

Manager-prepared from code on 2026-04-22.

Expected work:

- Add `showGrabBoxes` graphics setting, default true or false depending on final preference.
- Pass the setting from `ThreeDModeShell` / `Level1RoomShell` / `Level1RecordingStudioRoom` to `StudioLayoutStationGroup`.
- Keep the hitbox mesh present for interactions.
- When hidden, material opacity should be effectively invisible, but raycast should still work.
- Moving/targeted status label can still show when actively moving, even if idle boxes are hidden.
- Thread a `showLayoutGrabBoxes` boolean from `ThreeDModeShell` to `Level1RoomShell` to `Level1RecordingStudioRoom` to `StudioLayoutStationGroup`.
- Keep `useRegisterInteractable` enabled regardless of visual setting.
- Hide idle and targeted hitbox material opacity when disabled; keep moving status readable.

Suggested default:

- Default `showGrabBoxes` to false for cleaner experience now that the system exists.
- Keep the menu toggle easy to find.

### Acceptance Criteria

- Toggle off hides idle/targeted grab boxes.
- `F` still grabs stations.
- Moving status still communicates Move Mode.

### Build And Manual Checks

- `npm.cmd run build`.
- Toggle off, aim/grab/move station.
- Toggle on, verify boxes show again.

### Risks

- If boxes are fully invisible, users may not discover movable objects. The reticle/label should still help.

### Non-Goals

- Do not remove V14 hitboxes.

## V15-5: FPS Display

Status: `[x]` complete.

### Summary

Add a checkbox to display FPS while in the 3D world.

### Implementation Spec

Manager-prepared from code on 2026-04-22.

Expected work:

- Add `showFps` graphics setting.
- Add a small FPS component that samples frame timings with `requestAnimationFrame` or a small `useFrame` component.
- Display FPS in a corner of the 3D overlay only when enabled.
- Keep it compact and non-intrusive.
- Implement as a lightweight React overlay component in `ThreeDModeShell.tsx`; no package needed.

### Acceptance Criteria

- FPS display appears only in 3D world when enabled.
- FPS display hides when disabled.
- No new package required.

### Build And Manual Checks

- `npm.cmd run build`.
- Toggle FPS on/off.

### Risks

- FPS measurement should be lightweight.

### Non-Goals

- Do not add a full performance profiler.

## V15-6: Recording Studio Quick Controls

Status: `[x]` complete.

### Summary

Add a Studio tab with 2D controls for testing the recording room quickly.

### Implementation Spec

Manager-prepared from code on 2026-04-22.

Expected work:

- Add a `Studio` tab inside the Escape menu.
- Reuse existing action surfaces already available in `ThreeDModeShell`.
- Add compact controls for:
  - audio engine on/off or wake/mute where available,
  - master volume up/down,
  - DAW transport play/stop,
  - BPM down/up,
  - test piano note,
  - test drum kick/snare/hat,
  - test FM synth note,
  - test bass note/pattern,
  - guitar recording toggle if local user holds guitar or if the existing action can be safely exposed,
  - reset patch if existing local DAW action exists.
- Keep this separate from front-end timer/lobby controls.
- Use current code action names:
  - `localDawAudioActions.initialize`, `toggleMuted`, `setMasterVolume`, `playPianoLiveNote`, `playDrumVoice`, `playFmSynthNote`, `playBassNote`
  - `localDawActions.toggleTransport`, `adjustTempo`, `resetPatchToDefaults`
  - existing shared transport callbacks only where the current permission gate already allows it.
- If the audio engine is not ready, the Engine control should wake it first and test buttons should honestly show that sound requires ENGINE.

### Acceptance Criteria

- Studio tab can test major station sounds without walking to every station.
- Controls are disabled or honest when audio engine/action surfaces are unavailable.
- Existing in-world controls still work.
- Normal 2D app timer area remains untouched.

### Build And Manual Checks

- `npm.cmd run build`.
- Engine toggle/manual test.
- Master volume up/down.
- Transport play/stop.
- Test piano/drums/FM/bass.
- Patch reset.

### Risks

- Some actions may require audio engine ready state or current patch routing.
- Studio quick controls can become too large if every station control is added at once.

### Non-Goals

- Do not replace in-world instrument controls.
- Do not add shared studio remote-control behavior in this phase.

## V15 Completion Notes

Completed on 2026-04-22 through the manager loop.

- Worker V15-A implemented the shell slice and reported `npm.cmd run build` passing.
- Manager reviewed the shell, added the remaining V15 settings/control phases, and ran `npm.cmd run build` again.
- Build passed with the existing Vite large chunk warning.
- Completed behavior:
  - `Esc` menu shell with `Visual`, `Movement`, `Graphics`, and `Studio` tabs.
  - pointer-lock `Esc` behavior preserved.
  - menu-open state gates first-person movement, top-down/free-cam input, aim interactions, and guitar input.
  - brightness, contrast, saturation, and first-pass gamma controls on the 3D Canvas.
  - walk speed multiplier for first-person walk/sprint/slide.
  - grab-box visibility toggle with hitboxes still interactive.
  - lightweight FPS overlay toggle.
  - Studio quick controls for local audio engine, master volume, transport/BPM, test piano/FM/bass/drums, guitar recording, and grab-box reveal.

Manual live checks still recommended:

- Browser pointer-lock `Esc` walkthrough.
- Visual filter smoke test.
- Walk-speed feel at low/default/high settings.
- Grab-box hidden-mode movement test.
- Studio quick-control audio test after pressing ENGINE.

## V15-7: Persist/Sync User 3D Preferences

Status: `[hold]` on hold.

### Summary

Persist user 3D preferences after the local settings menu is proven.

Future options:

- Save visual filter values locally.
- Save walk speed locally.
- Save grab-box visibility locally.
- Save FPS preference locally.
- Sync or profile-store settings later if desired.

### Non-Goals While On Hold

- Do not sync settings between users during V15-1 through V15-6.

## Manager Loop Notes

- Use `docs/Agents/agent.md` as the operating loop.
- One active phase at a time.
- Keep only one phase marked `[~]`.
- Before implementation, require an approved spec in the phase section.
- Run `npm.cmd run build` for every implementation phase.
- Close each phase only after code review, build confirmation, docs cleanup, and changelog entry when code changed.

## Manual Test Plan

Required checks as phases land:

- Hidden 3D world still opens with `syncsesh`.
- `Esc` exits pointer lock first.
- `Esc` opens/closes the 3D menu when unlocked.
- Exit button remains available.
- Visual sliders affect the 3D view and reset cleanly.
- Walk speed slider changes first-person speed.
- Grab boxes can be hidden while station movement still works.
- FPS display toggles on/off.
- Studio quick controls do not touch the normal front-end timer area.
- Existing guitar, DJ, DAW, piano, drums, patch reset, layout editor, and monitor move behavior still work.

## Assumptions

- This menu is local to the user/browser.
- Settings should be local-only first.
- Visual filters can start with CSS filters before shader/post-processing.
- Studio quick controls are for testing and convenience, not a replacement for the in-world instruments.
- The normal front-end timer/lobby/dashboard should stay separate from the hidden 3D world menu.
