# Secret 3D World Vision

## Vision

The 3D world is a hidden layer inside the Sync Sesh activity. The default experience still looks like the current timer app, but there is a secret capability tucked behind a code entry. Users who know the code can unlock a transition into a shared 3D environment.

The unlock should feel like discovering that the timer interface was only the front face of a larger space. After a valid code is entered, the camera pulls back from the timer portion of the app and reveals that the app exists on a computer inside a 3D world. The user then enters that world through a first-person camera.

Everyone who is in the Discord Activity should exist in the 3D world. The first level should place users behind computers, implying that each person was sitting at their own station while looking into the timer app. The timer remains part of the world, either as the screen content on a computer, a central wall display, or both.

The first 3D environment should be treated as Level 1. It should be intentionally scoped so the team can build the foundation first and enrich the space later. The level can start as a compact room with user stations, a visible timer surface, and enough navigable floor space to prove multiplayer presence and movement.

The first-person view is the main hidden-world mode. Users should be able to walk around with WASD controls. Pressing Tab should toggle or hold a top-down view so users can understand the room layout and see where other participants are. This top-down view can become a tactical/map-style camera later, but the first version only needs to provide clear spatial orientation.

Wishlist items:

- [x] W1: Secret code entry unlocks the 3D capability.
- [x] W2: The 3D world is not obvious from the normal timer UI.
- [x] W3: Valid code triggers a camera pull-back from the timer app into the 3D world.
- [x] W4: The user lands in a first-person view after the reveal.
- [x] W5: Every participant in the activity is represented in the 3D world.
- [x] W6: Participants start seated behind computers.
- [x] W7: The current timer app is represented as something inside the world.
- [x] W8: WASD moves the player through the space.
- [x] W9: Tab switches to a top-down view.
- [x] W10: The world is organized as a level system.
- [x] W11: Level 1 is the first environment and should be expandable.
- [x] W12: Future levels can add richer spaces, secrets, interactive objects, and stronger identity/presence.

## Guide Rails

The 3D world should be built as an additive layer over the existing activity rather than a replacement for the current timer flow. The current React session state, countdown engine, Discord identity wiring, and sync clients should remain the source of truth for who is present and what phase the session is in.

### [x] Phase 0: Rendering stack spike

#### Summary

Prove that a basic 3D canvas can run inside the existing React/Vite app. This phase supports W3 and W4 by validating that the app can render a 3D scene before any secret unlock or level work begins.

#### Implementation spec

- Install only `three` and `@react-three/fiber`; do not add `@react-three/drei` unless unavoidable.
- Add a disposable `RenderingStackSpike` component with a full-screen React Three Fiber canvas, floor, lighting, and rotating cube.
- Mount the spike only when the URL contains `?spike3d=1`.
- Do not show any visible 3D button, link, label, menu item, or hint in the default UI.
- Include a close button inside the active overlay.
- Keep the normal app mounted underneath so countdown/session behavior continues.
- Do not implement secret code detection, level data, avatars, movement, top-down view, reveal animation, or timer-in-world rendering.
- Build requirement: `npm.cmd run build` must pass.

#### Completed implementation

- Added the minimum 3D dependencies.
- Added `RenderingStackSpike` as a dev-only full-screen R3F overlay with floor, lights, grid, and rotating cube.
- Mounted via `?spike3d=1`.
- Added close control inside the overlay.
- Kept the normal app mounted and default UI free of 3D affordances.

#### Deferred / not included

- No secret unlock.
- No persistent 3D mode.
- No level model.
- No movement, avatars, timer-in-world, or reveal.

### [x] Phase 1: Secret code detection

#### Summary

Add the hidden input mechanic that detects a valid secret code without changing the visible app experience. This phase achieves W1 and protects W2.

#### Implementation spec

- Add `src/hooks/useSecretCodeUnlock.ts`.
- Default code: `syncsesh`.
- Allow env override via `VITE_3D_SECRET_CODE`, trimming/lowercasing and falling back to `syncsesh` if missing or blank.
- Listen to `window` keydown while app is focused.
- Ignore repeat, ctrl/meta/alt chords, interactive targets, and non-single printable keys.
- Do not call `preventDefault`.
- Maintain a rolling buffer limited to the normalized code length.
- Match case-insensitively.
- When matched, set local `isSecretUnlocked` to true and stop accumulating.
- In `MainScreen`, call the hook and expose state invisibly with `data-secret-unlocked={isSecretUnlocked ? "true" : undefined}`.
- No visible copy, button, toast, modal, hint, or 3D-related UI.
- Keep `?spike3d=1` independent.

#### Completed implementation

- Added `useSecretCodeUnlock`.
- Added default/env-driven code behavior.
- Added hidden local unlock state.
- Added `data-secret-unlocked` to the root `<main>`.
- Kept the default UI unchanged.

#### Deferred / not included

- No 3D shell opened from the code yet.
- No security boundary.
- No server/session persistence.
- No visible unlock feedback.

### [x] Phase 2: 3D mode shell

#### Summary

Use the local unlock state to switch the current user into a hidden 3D mode. This phase achieves W1 and W2 by making the secret unlock actually open a private 3D shell.

#### Implementation spec

- Use local `isSecretUnlocked` state to open a hidden private 3D shell after the code is entered.
- Default app remains normal timer UI until unlock.
- Add `src/3d/ThreeDModeShell.tsx`.
- Use existing R3F dependencies; add no new packages.
- Render a full-screen fixed overlay with Canvas, simple dark background, ambient/directional light, floor/grid, and one placeholder object.
- Add a minimal visible `Exit` button only inside the shell after unlock.
- In `MainScreen`, open shell on the false-to-true unlock transition.
- Avoid reopening automatically after Exit.
- Keep `data-secret-unlocked` and add `data-3d-shell-open`.
- Keep normal app mounted underneath.
- Keep Phase 0 spike independent and above shell if both overlays are active.
- Do not add level data, reveal, movement, top-down view, user presence, or timer-in-world rendering.

#### Completed implementation

- Added `ThreeDModeShell`.
- Added shell open state in `MainScreen`.
- Opened shell only when secret unlock transitions from false to true.
- Added Exit control.
- Added `data-3d-shell-open`.
- Kept normal app mounted and Phase 0 spike independent.

#### Deferred / not included

- No cinematic reveal.
- No Level 1 rendering.
- No movement/top-down.
- No presence.
- No timer display inside the world.

### [x] Phase 3: Level 1 data model

#### Summary

Create the data structure that defines Level 1 so the world does not become hard-coded inside rendering components. This phase achieves W10 and supports W11.

#### Implementation spec

- Add shared level types under `src/3d/levels/types.ts`.
- Add `src/3d/levels/level1.ts` exporting `level1Config satisfies LevelConfig`.
- Optional `src/3d/levels/index.ts` barrel export is allowed.
- Use plain TypeScript data, arrays for vectors/rotations, no React imports, no Three.js imports.
- Define Level 1 with id, name, dimensions, player start, top-down camera, 8 station configs, timer display, collision bounds, and lighting.
- Do not import config into rendering yet.
- Do not implement room rendering, stations, timer screen, movement, registry, or presence.

#### Completed implementation

- Added `LevelConfig` and related types.
- Added `level1Config` for Station Room.
- Added dimensions, player start, top-down camera, 8 stations, timer display, collision blockers, and lighting.
- Added barrel exports.

#### Deferred / not included

- No rendering from the config yet.
- No registry.
- No station/user mapping.
- No level selection.

### [x] Phase 4: Level 1 room shell

#### Summary

Render the basic Level 1 room from the level config. This phase achieves W11 and starts making the hidden world feel like a place.

#### Implementation spec

- Add `src/3d/Level1RoomShell.tsx`.
- Consume `level1Config`.
- Replace placeholder scene in `ThreeDModeShell` with Level 1 room shell.
- Render floor, four walls, simple lighting, and grid/scale cue using Level 1 dimensions.
- Use Level 1 lighting config for ambient/directional/point lights; ignore target if needed.
- Use player start for static camera position if feasible, with simple look-at helper.
- Keep Exit and overlay behavior intact.
- Keep Phase 0 spike independent and above shell.
- Do not render stations, timer display, collision blockers, avatars, users, reveal, movement, top-down, registry, or level selection.

#### Completed implementation

- Added `Level1RoomShell`.
- Rendered procedural floor, walls, lights, and grid.
- Swapped shell placeholder scene for Level 1 room.
- Kept shell/Exit/spike behavior intact.

#### Deferred / not included

- No stations.
- No timer surface.
- No collision behavior.
- No user presence.
- No reveal or movement.

### [x] Phase 5: Computer stations

#### Summary

Add the desks/computers that explain the fiction: every participant begins behind a computer looking into the timer app. This phase achieves W6 and supports W7.

#### Implementation spec

- Add `src/3d/ComputerStation.tsx`.
- Render one static procedural desk/computer/chair marker per `level1Config.stations`.
- Use root group `position={station.position}` and `rotation={station.rotation}`.
- Use local negative Z as monitor side and local positive Z as chair/seated side.
- Build stations from lightweight boxes: desk surface, legs, monitor stand/body, blank reserved monitor screen, chair/seated marker, and optional keyboard slab.
- Keep monitor screen blank.
- Integrate by mapping stations in `Level1RoomShell`.
- Do not map real users, render avatars, names, presence, timer content, collision blockers, reveal, movement, top-down, registry, or level selection.

#### Completed implementation

- Added `ComputerStation`.
- Added procedural desks/computers/chair markers.
- Mapped all Level 1 stations in the room shell.
- Reserved blank monitor screen surfaces.

#### Deferred / not included

- No station timer content.
- No real user mapping.
- No avatars/presence markers.
- No synced movement.

### [x] Phase 6: Timer screen in world

#### Summary

Render the current timer/session state on a surface inside Level 1. This phase achieves W7.

#### Implementation spec

- Render current synchronized timer/session display on a readable central wall surface.
- Source all timer text from existing countdown display logic; do not duplicate countdown math.
- Move `useCountdownDisplay(state)` up into `MainScreen`.
- Pass `countdownDisplay` to `TimerPanel` and `ThreeDModeShell`.
- Update `TimerPanel` to accept `countdownDisplay`.
- Pass `countdownDisplay` through `ThreeDModeShell` to `Level1RoomShell`.
- Add `src/3d/WorldTimerDisplay.tsx` using an HTML canvas texture applied to a plane/thin display frame.
- Use `level1Config.timerDisplay` for position, rotation, and size.
- Show at least `countdownDisplay.timerText` and `countdownDisplay.phase`.
- Keep station monitors blank.
- Do not add room-wide effects, presence, avatars, movement, top-down, reveal, registry, or phase feedback.

#### Completed implementation

- Lifted `useCountdownDisplay` into `MainScreen`.
- Passed `countdownDisplay` into normal `TimerPanel` and the 3D shell.
- Added `WorldTimerDisplay` with canvas texture.
- Rendered central wall timer with timer text, phase, and subheadline.
- Kept station screens blank.

#### Deferred / not included

- No station monitor content.
- No phase-driven room effects yet.
- No countdown math duplication.
- No presence or controls changes.

### [x] Phase 7: Camera pull-back reveal

#### Summary

Replace the hard switch into 3D mode with the desired cinematic reveal. This phase achieves W3 and W4.

#### Implementation spec

- Replace hard entry into the shell with a cinematic camera pull-back reveal.
- Every time `ThreeDModeShell` mounts, start in reveal state.
- Start camera near the central wall timer display, looking at the timer surface.
- Animate backward over about 3200ms to reveal the room and stations.
- End at `level1Config.playerStart.position`, looking at `[0, 1.2, 0]`.
- Use `useFrame`; add no dependencies.
- Add local reveal state: `revealing | complete`.
- Add a minimal `Skip` button visible only while revealing.
- Skip snaps to final camera pose and completes reveal.
- Keep Exit visible and working.
- Add `data-reveal-state`.
- Keep timer display mounted/updating during reveal.
- Do not add movement, top-down, presence, avatars, registry, level selection, or phase effects.

#### Completed implementation

- Added reveal camera controller.
- Added reveal state and Skip button.
- Animated from timer close-up to player start.
- Kept timer display live during reveal.
- Added invisible reveal state attribute.

#### Deferred / not included

- No WASD movement.
- No Tab top-down.
- No user presence.
- No synced avatars.
- No level selection.

### [x] Phase 8: First-person WASD movement

#### Summary

Allow the unlocked user to walk through Level 1 in first person. This phase achieves W8.

#### Implementation spec

- Add local-only WASD movement after reveal completes.
- Adjust reveal controller so it snaps final pose once and then stops writing camera position.
- Movement controller should be the only camera-position writer after reveal completion.
- Skip should snap once to final pose, then allow movement.
- Track only `KeyW`, `KeyA`, `KeyS`, `KeyD`.
- Ignore repeat, ctrl/meta/alt chords, interactive targets, and non-WASD keys.
- Do not handle or block Space or Tab.
- Prevent default only for WASD keys while shell is open.
- Clear active keys on blur and unmount.
- Use `useFrame` movement with speed `2.2` units/sec.
- Keep camera Y fixed at player start height.
- Use fixed forward world negative Z and strafe right positive X for the original implementation.
- Normalize diagonal movement.
- Clamp to room collision bounds with player radius `0.35`.
- Respect blockers as inflated X/Z rectangles with simple slide fallback.
- Enable movement only when reveal state is complete.
- Do not sync movement, send events, modify session state, add top-down view, user presence, avatars, registry, or phase effects.

#### Completed implementation

- Added local WASD movement controller.
- Made reveal final pose a one-time snap.
- Added room bounds/blocker collision and slide fallback.
- Cleared active keys on blur/unmount.
- Kept movement local and session-independent.
- Later hardening moved the player spawn out of the south station blocker and made WASD move relative to camera yaw.

#### Deferred / not included

- No movement sync.
- No remote avatars.
- No new session events.
- Original phase did not include mouse look or pointer lock; drag-look was added later as a control enrichment.

### [x] Phase 9: Tab top-down view

#### Summary

Add the alternate map-like camera view. This phase achieves W9.

#### Implementation spec

- Add hold-to-view Tab top-down camera mode inside unlocked shell.
- Active only while shell is open and reveal is complete.
- On valid Tab keydown: preventDefault and set top-down active true.
- On valid Tab keyup/window blur/unmount: set top-down active false.
- Ignore repeat, ctrl/meta/alt chords, interactive targets, and Space.
- Use `level1Config.topDownCamera` position/target.
- Preserve first-person camera position before entering top-down and restore it on release.
- Restore fixed first-person look direction on release.
- Pause WASD movement while top-down is active.
- Add `data-camera-view`.
- Show local-only floor marker at saved first-person position.
- Do not implement user presence, avatars, movement sync, registry, phase effects, level selection, or new dependencies.

#### Completed implementation

- Added top-down camera controller.
- Added top-down active state and `data-camera-view`.
- Preserved/restored first-person camera pose.
- Paused WASD while top-down was active.
- Added local-only floor marker.
- Later control enrichment changed Tab from hold-to-view to toggle-to-view and preserves the current first-person look direction.

#### Deferred / not included

- No user/remote position display.
- No avatars.
- No synced top-down data.
- No level selection.

### [x] Phase 10: Station-based user presence

#### Summary

Represent all current session users in the 3D world without syncing free-roam movement yet. This phase achieves W5 and W6.

#### Implementation spec

- Represent current `DabSyncState.users` in Level 1 by placing each user at a station.
- Pass `state.users`, `state.localProfile.id`, and `state.session.ownerId` from `MainScreen` into `ThreeDModeShell` and `Level1RoomShell`.
- Assign users deterministically by sorting `joinedAt` ascending, then `id` ascending, mapping to `level1Config.stations[index]`.
- Render up to station count; ignore overflow.
- Add `StationOccupantMarker`.
- Render static seated procedural marker at station chair side.
- Show display name/status/initials near station using canvas texture labels or equivalent lightweight procedural approach.
- Do not fetch/render `avatarUrl` textures.
- Indicate local user, host/owner, ready, idle, spectating, and sim/test user with simple colors/shapes/status text.
- Keep markers seated; they do not follow free-roam camera.
- Derive all presence from existing `SessionUser`; no new sync messages, events, fields, or movement sync.
- Do not implement free-roaming synced avatars, registry changes, phase effects, or level selection.

#### Completed implementation

- Passed user/local/owner data into the 3D shell.
- Added deterministic station assignment in the room shell.
- Added `StationOccupantMarker` with procedural seated markers.
- Added canvas-text labels via declarative `<canvasTexture>`.
- Added local/host/status/sim visual indicators.
- Avoided direct `three` imports and avatar image textures.

#### Deferred / not included

- No free-roam synced avatars.
- No movement sync.
- No avatar image textures.
- No new session/sync schema.
- Overflow users ignored.

### [x] Phase 11: 3D session phase feedback

#### Summary

Make Level 1 react to the same session phases as the normal timer app. This phase deepens W7.

#### Implementation spec

- Add lightweight phase-driven visual feedback in Level 1 based on `countdownDisplay.phase` and `countdownDisplay.isUrgent`.
- Add `src/3d/phaseVisuals.ts` central mapping/helper.
- Use existing `countdownDisplay`; do not duplicate countdown math or change session semantics.
- Update room colors/lights/grid/timer glow from phase visuals.
- Pass phase visuals to `WorldTimerDisplay` and `ComputerStation`.
- `WorldTimerDisplay` should use phase timer background/accent colors while keeping same timer text data.
- `ComputerStation` should tint blank monitor screens from phase monitor glow; no station timer content.
- Add restrained completed burst near central timer with small procedural geometry only.
- Add subtle timer-area light pulse for armed/precount/countdown if lightweight.
- Do not add sound, heavy particles, dependencies, sync messages, events, registry changes, selectors, or controls.
- Preserve station readability, WASD, Tab, reveal, Exit, timer display, and Phase 0 spike behavior.

#### Completed implementation

- Added `phaseVisuals.ts`.
- Applied phase-driven room background, floor, wall, grid, lighting, timer glow, and monitor glow.
- Updated central timer display canvas colors from phase visuals.
- Added subtle timer-area pulse.
- Added restrained completed burst.
- Kept session state and countdown math untouched.

#### Deferred / not included

- No sound.
- No heavy particles/post-processing.
- No new phase semantics.
- No station timer content.
- No networking or selection changes.

### [x] Phase 12: Level registry

#### Summary

Prepare the codebase for future levels without building Level 2 yet. This phase achieves W10 and supports W12.

#### Implementation spec

- Add static registry in `src/3d/levels/registry.ts`.
- Export `DEFAULT_LEVEL_ID`, `getLevelConfig(levelId?: string)`, and `getAvailableLevels()`.
- Registry contains only Level 1.
- `getLevelConfig` accepts string and falls back to Level 1 for unknown ids.
- Update `levels/index.ts` to export registry API and types.
- Migrate app rendering away from direct `level1Config` imports.
- `ThreeDModeShell` gets `levelConfig = getLevelConfig(DEFAULT_LEVEL_ID)` and passes it to internal controllers and `Level1RoomShell`.
- `Level1RoomShell` accepts `levelConfig: LevelConfig`.
- `WorldTimerDisplay` accepts `timerDisplay: TimerDisplayConfig`.
- `ComputerStation` and `StationOccupantMarker` continue receiving station configs.
- Do not add Level 2, selector UI, host switching, sync fields, events, URL selection, local storage, or persistence.
- Current behavior remains always Level 1.

#### Completed implementation

- Added static level registry.
- Exported registry API.
- Migrated shell/room/timer display to resolved `levelConfig`.
- Kept Level 1 as the only registered/default level.
- Preserved current behavior.

#### Deferred / not included

- No Level 2.
- No visible selector.
- No URL/dev level selection.
- No sync or persistence for level choice.
- No async loading.

### [x] Phase 13: Hidden-world fallback and recovery

#### Summary

Make the secret 3D mode recoverable if something fails. This phase supports W1 through W12 by protecting the normal app experience.

#### Implementation spec

- Add WebGL preflight in `ThreeDModeShell`.
- If WebGL cannot be created, show recovery panel instead of Canvas.
- Add loading/checking states while shell checks/mounts Canvas.
- Add `ThreeDModeErrorBoundary` around Canvas/3D subtree.
- Render recovery panel if 3D render throws.
- Recovery/loading UI exists only inside unlocked shell overlay.
- Recovery/loading UI includes Exit path.
- Normal timer app remains mounted underneath and usable after Exit.
- Keep default app showing no 3D affordance before unlock.
- Preserve reveal, Skip, WASD, Tab, timer display, station presence, phase feedback, and Phase 0 spike behavior on success.
- Add `docs/3d/manual-test-checklist.md`.
- Add minimal CSS only if needed.
- Do not add dependencies, sync events, level selection, persistence, or gameplay changes.

#### Completed implementation

- Added `ThreeDStatus` checking/loading/ready/unsupported/error states.
- Added WebGL preflight.
- Added in-shell loading/recovery panel with Exit.
- Added `ThreeDModeErrorBoundary`.
- Added `data-3d-status`.
- Added manual test checklist doc.
- Added minimal panel CSS.
- Kept normal app mounted underneath.

#### Deferred / not included

- No context-loss recovery beyond startup/render failure handling.
- No automated browser/WebGL-disabled test.
- No gameplay changes.
- No new sync/session behavior.
- No dependencies.

### [x] Phase 14: Future-level planning pass

#### Summary

Document how richer future levels, secrets, interactables, and stronger multiplayer presence should build on Level 1. This phase covers W12 without expanding the code prematurely.

#### Implementation spec

- Documentation-only.
- Add `docs/3d/future-levels.md`.
- Use sections for purpose, current foundation, future level themes, future unlock paths, level config responsibilities, global 3D system responsibilities, interactable object model, session and sync integration points, free-roaming synced avatars, level registry evolution, performance and safety guardrails, suggested future phase order, and non-goals for now.
- Document how richer levels, secrets, interactables, and stronger multiplayer presence should build on Level 1.
- Define what belongs in future level configs versus global 3D systems.
- Identify where interactables would plug into session/sync flow.
- Identify what is needed for free-roaming synced avatars.
- Do not implement Level 2, selectors, controls, session events, sync payloads, avatar networking, gameplay systems, persistence, asset pipeline, or code/type placeholders.
- Do not edit code files.
- Run `npm.cmd run build` as sanity check.

#### Completed implementation

- Added `docs/3d/future-levels.md`.
- Documented future level themes and unlock paths.
- Documented level-config versus global-system responsibilities.
- Documented interactable flow and sync integration points.
- Documented free-roaming avatar requirements.
- Documented registry evolution, guardrails, future phase order, and non-goals.
- Kept implementation documentation-only.

#### Deferred / not included

- No Level 2.
- No visible selector.
- No new controls.
- No session/sync schema changes.
- No avatar networking.
- No gameplay interactables.
- No persistence or asset pipeline.
- No code/type placeholders.

Implementation principles:

- Keep the 3D mode modular.
- Keep session rules outside the 3D renderer.
- Keep the first level small but atmospheric.
- Prefer one excellent reveal and one stable room over a large unfinished world.
- Build the level system early enough that Level 1 does not become hard-coded everywhere.
- Treat Discord performance as a first-class constraint.
- Make the hidden world feel secret, but keep the app recoverable and understandable once users are inside it.
