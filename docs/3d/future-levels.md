# Future 3D Level Planning

## Purpose

This document describes how future 3D levels, secrets, interactables, and stronger multiplayer presence should build on the current Level 1 and Level 2 foundation. It is planning only. It does not define new session events, sync payloads, level selection UI, gameplay systems, persistence, or a production security model.

The normal timer app should remain the stable fallback. The hidden 3D layer can grow richer, but it should keep using existing session state and countdown display data as the source of truth unless a future phase explicitly adds new shared state.

## Current Foundation

The current 3D architecture already has the main seams future work should extend:

- `ThreeDModeShell` owns the hidden shell, WebGL recovery, reveal camera, WASD movement, Tab top-down view, local level transitions, and the currently selected level config.
- `levels/registry.ts` returns Level 1 by default and includes the Level 2 shooting range.
- `levels/level1.ts` is the plain data source for the first room: dimensions, camera presets, stations, timer display, collision bounds, lighting, and the range door.
- `levels/level2Range.ts` defines the compact shooting range, return door, target lanes, target positions, display surfaces, spawn, bounds, and lighting.
- `Level1RoomShell` renders the current level from config and existing session/countdown/presence props.
- `WorldTimerDisplay` renders synchronized timer text from `CountdownDisplayState`.
- `StationOccupantMarker` renders station-based user presence from `SessionUser` data.
- `FreeRoamPresenceMarker` renders low-rate synced remote free-roam presence.
- `LevelExitDoor` renders local-only in-world doors through the existing interaction primitive.
- `ShootingRangePrototype` owns local range challenge state and submits compact completed score summaries.
- `phaseVisuals.ts` maps existing session phases to lightweight room presentation changes.
- `ThreeDModeErrorBoundary` and the shell recovery panel keep the normal app recoverable if the hidden layer fails.

Future features should preserve these boundaries. Rendering components should render the world. Session and sync behavior should stay outside mesh components.

## Future Level Themes

Future levels should be small enough to run inside Discord Activity constraints and distinct enough to feel worth discovering.

- Level 2: Shooting Range
  - Implemented as the current compact target range.
  - Uses local challenge state, compact synced score summaries, and low-rate free-roam presence.
  - Should remain the benchmark for keeping gameplay features small and isolated.

- Level 3: Control Room
  - Recommended next level.
  - A compact operations room with a central session display and a few console panels.
  - Good candidate for proving local non-range interactables before shared room actions.
  - Smaller than Level 1 plus the shooting range because it does not need station rows or a challenge loop.

- Level 4: Rooftop Timer Beacon
  - A rooftop or antenna room with a skyline-like silhouette.
  - Useful after Control Room proves compact interactables and display surfaces.
  - Timer display could be a billboard, signal tower screen, or beacon face.

- Level 5: Arcade Annex
  - A playful room with cabinets and hidden props.
  - Good candidate for local-only object experiments after the Control Room.
  - Timer display could appear on a large cabinet screen.

- Level 6: Transit Control Center
  - A larger control-room layout with multiple console banks.
  - Good candidate for testing denser station arrangements and stronger top-down readability.
  - Could support future role or group positioning if session design expands.

- Temporary or seasonal rooms
  - Alternate configs that reuse the same systems with different colors, station layouts, and display placement.
  - Should be registry-driven and feature-flagged or unlocked, not hard-coded in the shell.

## Level 3 Control Room Draft

Level 3 should be the next planned level. It should feel like a small operations room attached to the hidden world: a place where Sync Sesh's timer/session fiction becomes tactile without requiring another minigame.

### Purpose

- Extend the hidden world beyond the station room and range.
- Prove that clickable interactables can be useful outside shooting.
- Create a session-aware space that can react to existing timer/user/range data.
- Keep the scope intentionally smaller than Level 1 plus the shooting range.

### Minimum Layout

- One compact rectangular room.
- One player spawn near the entry door.
- One return door to Level 1.
- One central session/timer display.
- Two or three console panels along the side walls.
- Collision bounds for the room and console banks.
- Simple lighting with a clear control-room identity.
- Top-down camera preset that keeps all consoles visible.

### Minimum Interactables

- `control-room-light-toggle`
  - Clickable.
  - Local-only.
  - Toggles accent/glow intensity or swaps a small lighting preset.

- `control-room-display-mode`
  - Clickable.
  - Local-only.
  - Cycles one console display between existing data views such as timer, users, and range scoreboard summary.

- `control-room-return-door`
  - Clickable.
  - Local-only level transition back to Level 1.

- `control-room-ready-pulse`
  - Future shared candidate only.
  - Could eventually trigger or reflect a session-aware pulse, but it needs an approved reducer-owned event before implementation.

### Sync And Local Split

Must sync, if implemented later:

- Any action that changes shared session state.
- Any shared Control Room panel state that all users should see identically.
- Any host/shared room action.
- Any future score, ready, or challenge result data.

Can remain local:

- Light/accent toggles.
- Display-mode cycling for inspection panels.
- Small visual effects.
- Door transitions.
- Discovery/secrets that do not affect other users.
- Temporary labels and prompts.

### Non-Goals

- No new challenge loop.
- No new score system.
- No host controls.
- No synchronized console state in the first Control Room implementation.
- No visible normal-app level selector.
- No asset pipeline or imported level art.
- No high-frequency sync beyond existing free-roam presence.

### Suggested Next Implementation Phases

1. Add a Level 3 Control Room config with dimensions, spawn, camera presets, display surfaces, exits, bounds, and lighting.
2. Render the Control Room shell and simple console geometry.
3. Add local-only console interactions for lights and display modes.
4. Design one shared Control Room interaction with an explicit reducer-owned event if it still feels worthwhile.
5. Polish remote presence readability in multi-level spaces.

## Future Unlock Paths

Unlocks should remain discovery mechanics, not security boundaries. A user who knows the trick can enter; the goal is surprise and delight, not access control.

Possible future unlock paths:

- Additional typed codes.
- Dev-only URL flags for testing unreleased levels.
- Session milestone unlocks, such as completing a round.
- Local hidden sequences inside Level 1.
- Shared interactables that reveal another space after an approved sync design exists.

Unlock evaluation should live outside level rendering. A future unlock controller or hook can decide which level id is available, then pass that id into level selection. Room components should not decide whether the user is allowed to enter a level.

## Level Config Responsibilities

Future level configs should describe the static world and level-specific presets. Good candidates for level config data:

- `id`, `name`, and metadata.
- Room dimensions and static geometry descriptors.
- Player start and additional spawn points.
- Reveal camera and top-down camera presets.
- Station positions, rotations, seat positions, and monitor positions.
- Timer display surfaces and any additional display surfaces.
- Collision room bounds and blocker bounds.
- Lighting presets and optional phase-visual overrides.
- Static interactable definitions after an approved interactable phase.
- Level exits and return paths.
- Level-specific optional modules, such as shooting range data or future console display data.
- Asset references if future levels move beyond procedural geometry.

Level configs should stay plain and inspectable. They should not import React, Three.js runtime objects, sync clients, or session reducers.

## Global 3D System Responsibilities

Global systems should own behavior that applies across levels or crosses the boundary between rendering and app state. These should not live inside individual level configs:

- Secret code detection and unlock state.
- WebGL detection, loading, error boundaries, and recovery UI.
- Level selection policy.
- Input systems for movement, top-down view, and future interactions.
- Countdown math and timer derivation.
- Session event dispatch.
- Sync client integration.
- Remote avatar interpolation and smoothing.
- Low-rate free-roam presence publishing.
- Persistence or account/device storage.
- Shared shell UI such as Exit, Skip, fallback, and diagnostics.

The rule of thumb: level config says what exists in a level; global systems decide what changes and why.

## Interactable Object Model

Interactables should start local-only unless a future phase explicitly designs shared state. A future interactable definition might include:

- `id`
- `kind`
- `position`
- `rotation`
- `size` or collider bounds
- `promptKey` or short action label
- `requiresPhase`
- `requiresRole`
- `localAction`
- `sessionEventType` for approved shared actions

Suggested flow for local interactions:

1. Player approaches or targets an interactable.
2. A 3D interaction controller detects eligibility.
3. The controller updates local 3D UI state.
4. No sync event is sent.

Suggested flow for shared interactions:

1. Player triggers an interactable.
2. A 3D interaction controller calls an app-level callback.
3. The callback validates and dispatches an approved session event.
4. Sync clients propagate the resulting session state.
5. 3D rendering reacts to the updated state.

Mesh components should not call the sync client directly. Shared actions need explicit event schemas in `types/session.ts`, sync client/server handling, and manual tests.

## Session And Sync Integration Points

Current safe inputs for the 3D layer:

- `DabSyncState`
- `SessionUser[]`
- `CountdownDisplayState`
- `SessionPhase`
- `LocalProfile`
- `DerivedLobbyState` only when shell-level controls truly need it.

Future shared features should route through existing app/session boundaries:

1. 3D component or controller observes user intent.
2. Shell-level handler translates intent into an app-level action.
3. App-level action dispatches to the sync client.
4. Session state changes through existing reducer/server logic.
5. 3D components re-render from the new snapshot.

New sync payloads should be introduced only in phases that explicitly need them. Countdown timing should remain centralized in existing countdown display logic.

## Free-Roaming Synced Avatars

Station occupants represent users at fixed stations, and low-rate free-roam presence now represents users who are actively walking in a level. Future avatar work should polish the current presence rather than replacing it with high-frequency movement networking.

Current synced free-roam state:

- Level id.
- Position.
- Facing/yaw.
- Movement timestamp.

Future optional additions:

- Interpolation for remote players.
- Lightweight movement/idle animation state.
- Better stale-player presentation.
- A rule for spectators, late joiners, and users outside the hidden world.
- A decision on whether movement is client-authoritative.

Needed rendering behavior:

- Local player remains first-person.
- Remote users render as simple lightweight avatars.
- Station markers can remain as spawn/seat context, or become empty stations after users stand up.
- Top-down view should show remote positions clearly.

Future sync work, only if approved:

- Additional avatar state fields.
- Shared level transition semantics.
- Host or group room membership rules.
- Manual tests for latency, disconnects, and multiple levels.

Do not send movement every frame. Any movement sync phase should define update rate, interpolation, and fallback behavior first.

## Level Registry Evolution

The current registry is static and returns Level 1 by default while also supporting the Level 2 range. Future registry growth can add:

- Level metadata lists.
- Dev-only level ids.
- Hidden unlock requirements.
- Feature flags.
- Asset preload hints.
- Compatibility requirements, such as minimum station count.
- Fallback level ids.

Level selection policy should stay separate from rendering. A future selector can choose a level id, but renderers should receive a resolved `LevelConfig`.

No visible normal-app selector should be added until an approved phase defines when users can change levels and whether that choice is local or shared. In-world doors can remain the preferred discovery path.

## Performance And Safety Guardrails

Future levels should stay lightweight:

- Prefer procedural geometry and small reusable components.
- Keep light counts low.
- Avoid heavy particles, post-processing, and sound until tested in Discord.
- Use canvas textures sparingly and memoize them.
- Keep labels readable from first-person and top-down views.
- Keep Exit and recovery paths available.
- Preserve the normal timer app underneath the shell.
- Keep hidden-world affordances invisible before unlock.

Any level that introduces assets should define loading and fallback behavior before relying on those assets for core interaction.

## Suggested Future Phase Order

1. Level 3 Control Room config-only draft.
2. Level 3 Control Room render shell.
3. Local-only Control Room interactables.
4. Shared Control Room interaction design.
5. Remote presence interpolation and readability polish.
6. Host/shared level transition design, if users need shared room membership.
7. Asset loading and richer level art pass.
8. Next compact level theme selection after Control Room.

## Non-Goals For Now

- No Level 3 implementation in the planning pass.
- No visible level selector.
- No new controls.
- No new session events.
- No new sync payloads.
- No new synced movement behavior beyond the current free-roam presence.
- No richer avatar networking.
- No new gameplay interactables.
- No persistence.
- No asset pipeline.
- No production security model for unlocks.
