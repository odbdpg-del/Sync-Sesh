# Future 3D Level Planning

## Purpose

This document describes how future 3D levels, secrets, interactables, and stronger multiplayer presence should build on the current Level 1 foundation. It is planning only. It does not define new session events, sync payloads, level selection UI, gameplay systems, persistence, or a production security model.

The normal timer app should remain the stable fallback. The hidden 3D layer can grow richer, but it should keep using existing session state and countdown display data as the source of truth unless a future phase explicitly adds new shared state.

## Current Foundation

The current 3D architecture already has the main seams future work should extend:

- `ThreeDModeShell` owns the hidden shell, WebGL recovery, reveal camera, WASD movement, Tab top-down view, and the currently selected level config.
- `levels/registry.ts` returns the current default level. It contains only Level 1 today.
- `levels/level1.ts` is the plain data source for the first room: dimensions, camera presets, stations, timer display, collision bounds, and lighting.
- `Level1RoomShell` renders the current level from config and existing session/countdown props.
- `WorldTimerDisplay` renders synchronized timer text from `CountdownDisplayState`.
- `StationOccupantMarker` renders station-based user presence from `SessionUser` data.
- `phaseVisuals.ts` maps existing session phases to lightweight room presentation changes.
- `ThreeDModeErrorBoundary` and the shell recovery panel keep the normal app recoverable if the hidden layer fails.

Future features should preserve these boundaries. Rendering components should render the world. Session and sync behavior should stay outside mesh components.

## Future Level Themes

Future levels should be small enough to run inside Discord Activity constraints and distinct enough to feel worth discovering.

- Level 2: Rooftop Relay Room
  - A compact rooftop or antenna control room with a skyline backdrop.
  - Timer display could be a billboard, control panel, or illuminated antenna screen.
  - Useful for proving alternate room silhouettes without changing the core controls.

- Level 3: Arcade Lab
  - A playful lab/arcade room with terminals, cabinets, and hidden props.
  - Good candidate for local-only interactable experiments before shared interactions.
  - Timer display could appear on a large cabinet screen.

- Level 4: Transit Control Center
  - A larger control-room layout with multiple console banks.
  - Good candidate for testing denser station arrangements and stronger top-down readability.
  - Could support future role or group positioning if session design expands.

- Temporary or seasonal rooms
  - Alternate configs that reuse the same systems with different colors, station layouts, and display placement.
  - Should be registry-driven and feature-flagged or unlocked, not hard-coded in the shell.

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

Station occupants currently represent users at fixed stations. Free-roaming synced avatars need a separate design before implementation.

Needed local avatar state:

- Level id.
- Position.
- Facing or rotation.
- Movement timestamp.
- Optional movement/idle animation state.
- Optional spectator or seated state.

Needed network behavior:

- Throttled outgoing movement updates.
- Interpolation for remote players.
- Disconnect and stale-player handling.
- Level-aware spawn and room membership.
- A rule for spectators, late joiners, and users outside the hidden world.
- A decision on whether movement is client-authoritative.

Needed rendering behavior:

- Local player remains first-person.
- Remote users render as simple lightweight avatars.
- Station markers can remain as spawn/seat context, or become empty stations after users stand up.
- Top-down view should show remote positions clearly.

Needed sync work:

- New event or presence payload schema.
- Transport support in mock and WebSocket clients.
- Remote avatar store or derived state.
- Manual tests for latency, disconnects, and multiple users.

Do not send movement every frame. Any movement sync phase should define update rate, interpolation, and fallback behavior first.

## Level Registry Evolution

The current registry is static and returns Level 1. Future registry growth can add:

- Level metadata lists.
- Dev-only level ids.
- Hidden unlock requirements.
- Feature flags.
- Asset preload hints.
- Compatibility requirements, such as minimum station count.
- Fallback level ids.

Level selection policy should stay separate from rendering. A future selector can choose a level id, but renderers should receive a resolved `LevelConfig`.

No visible selector should be added until an approved phase defines when users can change levels and whether that choice is local or shared.

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

1. Shared interaction architecture notes and optional local-only targeting prototype.
2. Local-only interactable prototype in Level 1.
3. Level metadata expansion and dev-only level selection.
4. Level 2 config-only draft.
5. Level 2 render shell.
6. Movement sync design and event schema.
7. Remote avatar prototype.
8. Remote avatar interpolation, stale-state handling, and spectator behavior.
9. Shared interactables that use approved session events.
10. Asset loading and richer level art pass.

## Non-Goals For Now

- No Level 2 implementation.
- No visible level selector.
- No new controls.
- No new session events.
- No new sync payloads.
- No synced movement.
- No avatar networking.
- No gameplay interactables.
- No persistence.
- No asset pipeline.
- No production security model for unlocks.
