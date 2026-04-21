# Secret 3D World Vision 2

## Purpose

This document is a future-planning companion to `3dvision.md`. The first vision document should stay focused on proving the hidden 3D room, Level 1, movement, camera modes, timer presence, and basic Discord participant representation.

Vision 2 collects ideas for what comes after the first hidden world is stable. These phases should not block Level 1. They should become candidates for later implementation once the 3D foundation is working, recoverable, and performant inside Discord Activities.

## North Star

The hidden world should grow from a secret room into a small collection of playful spaces. Each space should feel like it belongs inside Sync Sesh: social, session-aware, quick to understand, and light enough to run in an embedded browser.

Future features should favor short multiplayer moments over heavyweight game systems. The best additions are things users can discover, try together, and leave without breaking the normal timer flow.

## Expansion Principles

- Keep the normal timer app as the reliable base experience.
- Treat each new area as a level or sub-level loaded through the level registry.
- Prefer simple interaction systems built on Three.js raycasting before adding physics.
- Keep session state, participant identity, and timer data outside rendering components.
- Make features fun locally first, then sync only the parts that need multiplayer presence.
- Design every future feature with an exit path back to Level 1 or the normal timer app.
- Avoid asset-heavy scenes until the performance budget is known.

## Candidate Future Areas

### Shooting Range

A compact target range where users can test a lightweight first-person interaction system.

The first version should use raycast shots from the camera instead of physical projectiles. This keeps the feature fast, deterministic, and easier to sync later.

Possible layout:

- A separate Level 2 range room.
- A hidden side room connected to Level 1.
- A temporary prototype lane inside Level 1.

Preferred end-state layout:

- The shooting range should feel like another room attached to the main Level 1 station room.
- Level 1 should have a door on one wall that leads into the range room.
- The door should be discoverable inside the 3D world, not exposed through normal app UI.
- The URL `?level=level-2-range` can remain a dev/test shortcut, but should not be the primary user-facing path.

Core interactions:

- Click or press a key to fire.
- Cast a ray from the camera through the center of the view.
- Detect hits against target meshes.
- Flash, animate, or briefly change material on hit.
- Track a local score.
- Reset targets after a short delay.

Later multiplayer ideas:

- Shared scoreboard.
- Timed challenge mode.
- Host-started range rounds.
- Participant-specific target lanes.
- Synchronized target states.
- Spectator top-down view.

### Secret Doors And Unlock Paths

Level 1 can become a hub for hidden spaces. Unlocks should feel discoverable, but not become security-sensitive.

Possible unlocks:

- Entering a second code while already inside the 3D world.
- Clicking or shooting a hidden object.
- Completing a timer session.
- All participants becoming ready.
- Host-only room controls.

Wishlist:

- [ ] Add a shooting range door to one wall of Level 1.
- [ ] Make the shooting range feel like an attached room rather than a disconnected URL-only level.
- [ ] Let users enter the shooting range from inside Level 1.
- [ ] Let users return from the shooting range back to Level 1.
- [ ] Keep the existing URL level shortcut available for dev/testing only.
- [ ] Keep the door hidden from the normal 2D timer UI.
- [ ] Make the range transition local-only until shared level presence is designed.

### Interactive Objects

Small objects can make the world feel alive without requiring a full game system.

Candidates:

- Toggleable lights.
- Monitors that switch display modes.
- Buttons that trigger room effects.
- Collectible props.
- Doors or panels.
- Session-reactive objects that change during idle, armed, precount, countdown, and completed phases.

### First-Person Controls

The hidden world needs to feel like a normal first-person space before richer gameplay will feel good. If WASD movement exists but does not work reliably in the Discord Activity or local browser, controls should get a dedicated hardening pass before shooting range work begins.

Expected controls:

- WASD moves relative to the camera direction.
- Mouse movement controls where the camera looks.
- Click-to-focus or click-to-enter should activate pointer lock when supported.
- Escape should release pointer lock.
- Movement should continue to respect room bounds and collision blockers.
- Controls should not trigger while typing in inputs, textareas, selects, or editable elements.
- Controls should not break normal timer interactions, ready hold, admin tools, or Discord focus behavior.

Implementation notes:

- Prefer a small custom control layer at first so Discord focus constraints are clear.
- Consider `PointerLockControls` later if `@react-three/drei` is added.
- Keep camera yaw and pitch state separate from player position.
- Clamp vertical look pitch so users cannot flip the camera.
- Add an on-screen focus hint only when needed.
- Add a manual test checklist for local browser and Discord Activity iframe behavior.

### Stronger Player Presence

After station-based presence works, the world can evolve toward richer multiplayer identity.

Possible upgrades:

- Synced free-roam positions.
- Simple avatar capsules or silhouettes.
- Avatar colors from Discord/user state.
- Nameplates.
- Ready/idle/host indicators.
- Look direction.
- Lightweight emotes.

The first synced movement pass should avoid precise physics. Position, rotation, and a small interpolation buffer are likely enough.

### Level Themes

Future levels should be small, readable, and strongly themed.

Candidate levels:

- Level 2: Shooting Range.
- Level 3: Control Room.
- Level 4: Rooftop Timer Beacon.
- Level 5: Arcade Annex.
- Level 6: Observatory.

Each level should define:

- id
- name
- dimensions
- spawn points
- camera presets
- collision bounds
- lighting
- display surfaces
- interactable objects
- optional participant slots

## Future Phase Candidates

### [x] Phase V2-1: Interaction Primitive

#### Summary

Create a generic interaction path for clicking or activating objects in 3D.

#### Implementation spec

- Add a small interaction registry for world objects.
- Support pointer/crosshair raycasting from the active camera.
- Allow objects to define an id, bounds or mesh ref, label, and activation handler.
- Keep interactions local-only at first.
- Add a minimal crosshair or focus indicator if needed.
- Avoid tying the system to the shooting range specifically.

#### Completed implementation

- Added a local-only interaction registry in `src/3d/interactions.tsx`.
- Added an `InteractionProvider`, `useInteractionRegistry`, `useRegisterInteractable`, `AimInteractionController`, and `InteractionReticle`.
- Uses React Three Fiber `useThree()` camera/raycaster instead of importing from `three`.
- Uses a center aim ray from `{ x: 0, y: 0 }`.
- Added KeyE-only local activation for the currently aimed registered object.
- Keeps primary click reserved for focus and pointer lock.
- Added a small neutral reticle that appears only inside the unlocked shell after reveal and after controls are active.
- Added manual checklist coverage for reticle visibility, KeyE no-op behavior with no registered objects, Tab disabling, Escape behavior, and Phase 0 independence.

#### Deferred / not included

- No production interactables are registered yet.
- No click-to-activate behavior.
- No shooting, scoring, target objects, or Level 2 content.
- No synced state, session events, persistence, or package changes.

### [x] Phase V2-2: First-Person Controls Hardening

#### Summary

Make first-person movement reliable and game-like before adding range gameplay.

#### Implementation spec

- Verify whether current WASD events fire in local browser and Discord Activity contexts.
- Ensure movement only starts after the reveal is complete.
- Add clear focus handling for the 3D canvas.
- Add mouse-look with yaw and pitch.
- Move WASD relative to the current camera yaw.
- Use pointer lock where supported.
- Release pointer lock on Escape.
- Preserve collision bounds and blocker handling.
- Avoid handling movement keys while the user is typing in interactive UI.
- Add a small manual checklist for movement, focus, pointer lock, exiting, and timer UI safety.

#### Completed implementation

- Added explicit control states: `idle`, `focused`, `pointer-locked`, and `pointer-lock-unavailable`.
- Added `data-control-state` to the hidden shell overlay.
- Requires a post-reveal canvas click before first-person movement or look controls activate.
- Added a small in-shell `Click view to move` focus hint.
- Requests pointer lock on primary canvas click when supported.
- Uses pointer-lock mouse movement without holding a button when lock succeeds.
- Preserves drag-look fallback when pointer lock is unavailable or rejected.
- Escape releases pointer lock, clears active movement keys, and keeps the shell open.
- Preserved the current Tab toggle behavior.
- Expanded the manual test checklist for focus, pointer lock, drag fallback, Escape, Tab toggle, and timer UI safety.

#### Deferred / not included

- No gameplay interactions, shooting, or raycast activation.
- No synced movement or avatar networking.
- No level selection or Level 2 work.
- No new dependencies.

### [x] Phase V2-3: Interaction Primitive With Aim Context

#### Summary

Extend the generic interaction path so it understands the active first-person camera aim.

#### Implementation spec

- Use the first-person camera forward direction for raycast interactions.
- Keep crosshair/focus state compatible with pointer lock.
- Allow objects to define whether they are clickable, shootable, or both.
- Keep activation local-only at first.

#### Completed implementation

- Extended the local interaction primitive with `clickable` and `shootable` modes.
- Added mode-aware registrations where missing modes default to `clickable`.
- Added structural aim context with origin, direction, and center point.
- Interaction hits and activation payloads now include modes, hit point, distance, and aim context.
- KeyE activates the nearest aimed `clickable` registration.
- `shootable` exists as API/data support for future phases only.
- Preserved primary click for focus and pointer lock.
- Added manual checklist coverage for aim context, KeyE no-op behavior, Tab disabling, Escape, and no visible shooting/scoring yet.

#### Deferred / not included

- No production interactables are registered yet.
- No primary-click activation.
- No shooting range, targets, scoring, hit feedback, or Level 2.
- No sync/session events, persistence, package changes, or direct `three` imports.

### [x] Phase V2-4: Shooting Range Prototype

#### Summary

Build the smallest possible target shooting prototype using raycasts.

#### Implementation spec

- Add target definitions to a level or prototype config.
- Render simple target meshes.
- Fire a camera ray on click or key press.
- Detect target hits.
- Add local score state.
- Add basic hit feedback.
- Keep all targets procedural.
- Do not sync shots or scores yet.

#### Completed implementation

- Added a temporary local-only shooting prototype inside Level 1.
- Added three procedural south-wall targets registered as `shootable` interactables.
- Added primary-click shooting through the existing active-controls interaction gate.
- Kept the first focus/pointer-lock click from firing because interaction is disabled while controls are idle.
- Added short local hit flash feedback.
- Added a local HITS-only in-world score display.
- Score resets when the shell/prototype unmounts.
- Expanded manual checks for aiming, firing, hit feedback, hit count, Tab disabling, Escape, and no sync changes.

#### Deferred / not included

- No Level 2 config, level selector, door, transition, or dedicated range room.
- No synced shots, synced score, host challenge mode, misses, timers, accuracy, or scoreboard.
- No sound, particles, imported assets, package changes, or direct `three` imports.

### [x] Phase V2-5: Shooting Range Level Config

#### Summary

Promote the prototype into a dedicated Level 2 config.

#### Implementation spec

- Add a Level 2 shooting range config.
- Define lanes, target positions, spawn points, display surfaces, and bounds.
- Load the range through the level registry.
- Keep Level 1 unchanged except for an optional entry point.
- Confirm Level 1 and Level 2 can mount, unmount, and switch cleanly.

#### Completed implementation

- Added a dedicated Level 2 range config with lanes, six target definitions, range display surfaces, spawn, bounds, blockers, and lighting.
- Registered Level 2 through the level registry while keeping Level 1 as the default and fallback level.
- Added hidden URL selection with `?level=level-2-range`; missing or unknown levels fall back to Level 1.
- Kept the default hidden unlock path on Level 1 with no visible selector, door, menu, or hint.
- Converted the shooting range prototype to read from `levelConfig.shootingRange`.
- Rendered the range only when the selected level includes a shooting range config, so Level 1 no longer shows targets or the HITS display.
- Added `data-level-id` on the hidden shell for manual verification.
- Expanded manual checks for Level 1 fallback, Level 2 hidden query selection, range target hits, HITS reset, and no visible selector.
- Verified `npm.cmd run build` passes with only the existing Vite chunk-size warning.

#### Deferred / not included

- No in-world door, transition, or visible level selector.
- No synced range state, persistent scores, challenge timer, misses, accuracy, or host controls.
- No custom reveal framing for Level 2 yet.
- The generic procedural level renderer is still named `Level1RoomShell`.

### [x] Phase V2-6: Range Challenge Mode

#### Summary

Turn the range into a short timed challenge.

#### Implementation spec

- Add a local challenge timer.
- Spawn or reset targets during the challenge.
- Track hits, misses, accuracy, and score.
- Show score on a range display surface.
- Keep challenge state local until the sync model is clear.

#### Completed implementation

- Added local-only range challenge state inside the Level 2 shooting range component.
- Added challenge phases: ready, running, and complete.
- First valid shot after controls are active starts a 30-second challenge.
- Kept the first focus/pointer-lock click from starting the challenge because shooting remains gated behind active controls.
- Added local shot event reporting from the interaction provider with activation or null so misses can be counted without sync.
- Centralized stats in the range component: shots, hits, misses, score, accuracy, and remaining time.
- Uses target point values from the Level 2 config for local score.
- Updated the in-world range display to show READY/LIVE/DONE, timer, score, hits, misses, and accuracy.
- Hit targets flash, temporarily disable, dim, and reset automatically.
- Shots at no active shootable target count as misses during a challenge.
- Next valid shot after DONE starts a fresh local challenge.
- Challenge state resets when the shell/range unmounts.
- Added manual checklist coverage for challenge start, target reset, stats, completion, restart, Tab disabling, Escape, and Level 1 absence.

#### Deferred / not included

- No synced shots, synced score, shared scoreboard, persistence, or host controls.
- No challenge sharing through session state, WebSocket messages, or sync payloads.
- No visible level selector, in-world door, or level transition.
- No sound, particles, heavy assets, package changes, or direct `three` imports.

### [x] Phase V2-7: Synced Scoreboard

#### Summary

Sync only scoreboard results, not every shot.

#### Implementation spec

- Add range scoreboard data to the existing session snapshot.
- Add a compact `range_score_submit` event containing only level id, score, shots, hits, misses, accuracy, and duration.
- Do not include round number, completion time, user identity, display name, avatar fields, target state, or shot history in the event payload.
- Stamp round number, completion time, and user identity in the reducer from the current snapshot, reducer timestamp, and actor profile.
- Sanitize and normalize submitted numeric fields in the reducer.
- Store one best result per user, level, and session round.
- Display current-round participant results on the Level 2 range display.
- Keep Level 1 unchanged.
- Reset scoreboard results when the normal session round resets or the session is reset.
- Do not sync individual shots, target hits, mouse movement, WASD movement, target cooldown state, or free-roam presence.

#### Completed implementation

- Added `RangeScoreSubmission` and `RangeScoreResult` types.
- Added `rangeScoreboard` to the shared session snapshot.
- Added the compact `range_score_submit` session event.
- Updated the session reducer to stamp `roundNumber`, `completedAt`, and actor identity server/reducer-side.
- Added reducer-side score sanitization, stat normalization, best-result replacement, and bounded scoreboard storage.
- Preserved `rangeScoreboard` through the mock sync client's manual snapshot reconstruction.
- Added `submitRangeScore` to the sync session hook.
- Passed range scoreboard state and submission callback from `MainScreen` through the 3D shell to the range.
- Updated the Level 2 range display to show local challenge stats plus a compact current-round synced scoreboard.
- Kept Level 1 free of range targets and scoreboard UI.
- Added manual checklist coverage for local reducer checks and WebSocket two-client sync checks.

#### Deferred / not included

- No individual shot, target hit, target cooldown, mouse, WASD, or movement sync.
- No synced target state, synced challenge start, host challenge controls, score persistence, or cross-session leaderboard.
- No visible level selector, in-world door, transition, or Level 3/Vision 3 work.
- No package changes, direct `three` imports, or Three.js type shims.

### [x] Phase V2-8: Secret Door From Level 1

#### Summary

Add an in-world path from Level 1 to the shooting range using the existing interaction primitive.

#### Implementation spec

- Add a config-driven level exit type with id, label, target level id, position, rotation, and size.
- Add a Level 1 east-wall RANGE door targeting `level-2-range`.
- Add a Level 2 BACK door targeting `level-1`.
- Render each exit as lightweight procedural in-world geometry.
- Register each exit as a local `clickable` interactable.
- Activate doors with KeyE through the existing reticle/aim interaction path.
- Keep primary click reserved for focus and shooting behavior.
- Move the hidden shell to local current-level state initialized from the existing `?level=` query param.
- Keep `?level=level-2-range` as an initial dev/test shortcut and keep unknown levels falling back to Level 1.
- Reset reveal, focus/control state, and top-down state on local level transitions.
- Do not add a normal-app visible selector, menu, button, or hint.
- Do not sync level transitions or implement free-roam presence.

#### Completed implementation

- Added `LevelExitConfig` and optional `exits` to level configs.
- Added a Level 1 RANGE door/panel on the east wall.
- Added a Level 2 BACK door/panel near the range spawn side.
- Added `LevelExitDoor` with procedural panel geometry, canvas label, and `clickable` registration.
- Rendered configured exits from the room shell.
- Added local current-level state to `ThreeDModeShell`, initialized from the URL shortcut.
- Added local level transition handling with reveal/control/top-down reset.
- Preserved the V2-5 URL shortcut/fallback behavior.
- Preserved V2-6 local challenge and V2-7 synced scoreboard behavior.
- Added manual checklist coverage for entering Level 2 from Level 1 and returning to Level 1.

#### Deferred / not included

- No visible normal-app level selector or menu.
- No synced level transitions, shared level presence, or free-roam avatar movement.
- No in-world transition animation beyond restarting the existing reveal.
- No new packages, direct `three` imports, or Three.js type shims.

#### Checklist items achieved

- [x] Add a shooting range door to one wall of Level 1.
- [x] Let users enter the shooting range from inside Level 1.
- [x] Let users return from the shooting range back to Level 1.
- [x] Keep the existing URL level shortcut available for dev/testing only.
- [x] Keep the door hidden from the normal 2D timer UI.
- [x] Make the range transition local-only until shared level presence is designed.

### [x] Phase V2-9: Synced Free-Roam Presence

#### Summary

Represent other unlocked users moving through the 3D world with low-rate synced presence.

#### Implementation spec

- Add compact free-roam presence state to the shared session snapshot.
- Add low-rate `free_roam_presence_update` and `free_roam_presence_clear` events.
- Send only level id, first-person/player position, and yaw.
- Stamp user id and update time in the reducer from actor and reducer timestamp.
- Sanitize level ids, clamp/round position, and normalize yaw in the reducer.
- Publish local presence at a low rate only after reveal completes.
- Avoid publishing every frame, key event, mouse event, shot, target hit, velocity, pitch, or movement history.
- Avoid publishing top-down camera position by tracking first-person/player pose separately.
- Render simple procedural free-roam markers/nameplates for remote users with fresh presence on the current level.
- Hide station marker fallback only for users with fresh free-roam presence on the current level.
- Preserve station-based presence for users without fresh free-roam presence.
- Clear local free-roam presence on shell exit/unmount.
- Preserve V2-8 local door transitions and V2-7 synced scoreboard.

#### Completed implementation

- Added `FreeRoamPresenceUpdate` and `FreeRoamPresenceState` types.
- Added `freeRoamPresence` to the shared session snapshot.
- Added compact free-roam presence update/clear events.
- Updated the reducer to sanitize presence payloads, stamp actor/timestamp fields, upsert one entry per user, clear actor presence, prune stale entries, and remove test-user presence when test users are cleared.
- Preserved free-roam presence through the mock sync client's manual snapshot reconstruction.
- Added `updateFreeRoamPresence` and `clearFreeRoamPresence` sync callbacks.
- Added a low-rate R3F presence reporter that reads a first-person pose ref instead of the top-down camera.
- Added simple procedural remote free-roam markers with nameplates.
- Rendered remote free-roam markers by current level and kept station markers as fallback.
- Added manual checklist coverage for WebSocket two-client presence, stale fallback, door transitions, top-down behavior, and scoreboard preservation.

#### Deferred / not included

- No high-frequency movement stream, interpolation buffer, velocity, pitch, mouse events, key events, shot events, or target hit sync.
- No richer avatars, emotes, animation states, or avatar image textures.
- No synced level transitions or host/shared level presence model.
- No future-level planning, package changes, direct `three` imports, or Three.js type shims.

#### Checklist items achieved

- [x] Sync local player position and facing direction at a modest interval.
- [x] Use simple avatar shapes at first.
- [x] Handle users returning to the normal timer UI with explicit clear and stale fallback.
- [x] Keep station-based presence as a fallback.

### [x] Phase V2-10: Future Level Planning Pass

#### Summary

Choose the next level after the shooting range and define its gameplay purpose.

#### Implementation spec

- Pick one next level theme.
- Define why it belongs in Sync Sesh.
- Document the minimum layout and minimum interactables.
- Document what must sync and what can remain local.
- Keep the scope smaller than Level 1 plus the shooting range.
- Keep the phase documentation-only.
- Prefer updating Vision 2 and future-level docs instead of creating Vision 3.

#### Completed implementation

- Chose `Level 3: Control Room` as the recommended next level.
- Defined it as a compact operations/control space attached to the existing hidden world.
- Documented why it belongs in Sync Sesh: it extends the session-aware fiction without adding another challenge loop.
- Documented a minimum layout: one compact room, central session display, two or three console panels, return exit, and room-scale collision/lighting.
- Documented minimum interactables: local light toggle, local display-mode console, return door, and a future shared ready/session pulse candidate.
- Documented the sync/local split: local visual controls and display modes remain local, while future shared actions must go through explicit reducer-owned events.
- Refreshed `docs/3d/future-levels.md` to reflect the current state after Level 2, doors, synced scoreboard, and free-roam presence.

#### Deferred / not included

- No Level 3 source files, config, registry entry, rendering, controls, session events, sync payloads, selectors, persistence, or gameplay were implemented.
- No Vision 3 document was created.
- No source code or package files were changed.

#### Checklist items achieved

- [x] Pick one level theme.
- [x] Define why it belongs in Sync Sesh.
- [x] Document the minimum interactables.
- [x] Document what must sync and what can remain local.
- [x] Keep the scope smaller than Level 1 plus the shooting range.

### [ ] Phase V2-11: Level 3 Control Room Config

#### Summary

Add a config-only draft for the compact Control Room.

#### Implementation spec

- Add a Level 3 config with dimensions, spawn, top-down camera, timer display, collision bounds, lighting, exits, and placeholder console/display surfaces if approved.
- Register Level 3 through the existing level registry.
- Do not render custom Control Room consoles yet unless the approved phase includes minimal renderer support.
- Keep existing Level 1, Level 2, doors, scoreboard, and free-roam presence behavior intact.
- Run `npm.cmd run build`.

#### Checklist items achieved

- [ ] Prepare Level 3 without gameplay.
- [ ] Keep the next level smaller than Level 1 plus the shooting range.

### [ ] Phase V2-12: Level 3 Control Room Render

#### Summary

Render the compact Control Room shell from config.

#### Implementation spec

- Render the Control Room floor, walls, timer/session display, consoles, and return exit using lightweight procedural geometry.
- Keep console surfaces visually readable but non-interactive unless an approved interaction phase follows.
- Preserve existing controls, reveal, doors, scoreboard, and free-roam presence.
- Run `npm.cmd run build`.

#### Checklist items achieved

- [ ] Render the Control Room as a small readable space.
- [ ] Keep the normal timer app unchanged.

### [ ] Phase V2-13: Local Control Room Interactables

#### Summary

Add small local-only console interactions to the Control Room.

#### Implementation spec

- Add a local light/accent toggle console.
- Add a local display-mode console that cycles between available existing display data.
- Use the existing `clickable` interaction primitive.
- Do not add new session events or shared state.
- Run `npm.cmd run build`.

#### Checklist items achieved

- [ ] Prove small local interactables outside the range.
- [ ] Keep shared state unchanged.

### [ ] Phase V2-14: Shared Control Room Interaction Design

#### Summary

Design, but do not necessarily implement, the first shared Control Room interaction.

#### Implementation spec

- Choose one shared candidate such as a ready/session pulse panel.
- Define its reducer-owned event schema if implementation is approved.
- Define what renders from existing session state versus new shared state.
- Keep this phase small and avoid host challenge controls unless separately approved.

#### Checklist items achieved

- [ ] Keep shared interactions behind explicit sync design.
- [ ] Avoid ad hoc mesh-to-sync coupling.

### [ ] Phase V2-15: Remote Presence Polish

#### Summary

Make synced free-roam presence easier to read without changing the sync payload.

#### Implementation spec

- Add modest interpolation/smoothing for remote markers.
- Improve top-down readability for remote users.
- Keep the existing low-rate presence payload.
- Do not add animation state, emotes, or high-frequency movement sync unless separately approved.

### [ ] Phase V2-16: Future Level Planning Follow-Up

#### Summary

Revisit the level roadmap after the Control Room exists.

#### Implementation spec

- Evaluate Control Room ergonomics and performance.
- Choose whether the next level should be Rooftop Timer Beacon, Arcade Annex, Observatory, or another compact room.
- Keep the next scope smaller than Level 1 plus the shooting range.

## Open Questions

- Should shooting be mouse-click only, keyboard-triggered, or both?
- Should the range be playful and abstract, or more realistic?
- Should scores persist only for the current Activity session?
- Should the host control challenge starts?
- Should Level 1 contain a visible door, a hidden door, or no door until Level 2 is ready?
- Should future synced movement use the existing sync server or a separate lower-latency channel?
- Does Discord Activity iframe focus require a click-to-focus overlay before WASD can work reliably?
- Should pointer lock be required for 3D mode, or should there be a fallback drag-to-look mode?

## Recommended First Step After Vision 1

Start with `Phase V2-2: First-Person Controls Hardening`, then build `Phase V2-3: Interaction Primitive With Aim Context`, then build `Phase V2-4: Shooting Range Prototype`.

That order makes the hidden world feel good before turning it into a game space. It also keeps the shooting range from becoming a one-off system by giving future doors, buttons, panels, and secret objects a shared interaction path.
