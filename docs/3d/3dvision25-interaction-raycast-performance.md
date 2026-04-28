# Secret 3D World Vision 25 - Interaction Raycast Performance

## Purpose

Vision 25 makes 3D interaction detection cheaper, faster, and easier to reason about.

The immediate pain is that the 3D world can bog down, especially inside the recording studio. A likely cause is the interaction system doing recursive raycasts against every active interactable object every rendered frame. That started as a simple, flexible way to make buttons clickable. It worked when the world had a small number of controls. It becomes expensive now that the recording studio has many dense stations, screens, buttons, patch ports, piano keys, DJ controls, and movable objects.

The goal is not to remove raycasting. The goal is to stop using one brute-force raycast loop as the answer for every interaction need.

## Product Goal

Clicking studio controls should feel immediate without the 3D world losing frames.

Desired behavior:

- Piano keys, DJ buttons, transport controls, and studio controls should activate from the current pointer event, not from stale frame-loop hover state.
- Hover/reticle feedback should remain useful, but should not require rebuilding and scanning the entire interactable set every frame.
- Interaction diagnostics should show how many objects are being tested and how long raycasts take.
- Dense studio scenes should be able to add controls without making all interactions globally slower.
- The system should have room for area filtering, distance filtering, and Three.js layers as the world grows.

## Simple Explanation

The current interaction model is roughly:

```text
every frame:
  get every clickable thing
  raycast through every clickable thing and its children
  search the registration list again for every hit
  update the current aim target
```

That is like asking the whole building, 60 times per second, "which button am I looking at?"

A better model is:

```text
when interactables register:
  keep a cached list of raycast targets
  keep a fast object-to-registration lookup

every frame, for hover only:
  raycast the cached targets, preferably filtered to the current area

on pointer down:
  raycast once immediately
  activate the clicked thing from that fresh hit
```

This keeps the nice 3D interaction behavior, but avoids rebuilding the same list and doing expensive searches over and over.

## Current Code Facts

Current facts from code review on 2026-04-23:

- `src/3d/interactions.tsx` owns the interaction registry and `AimInteractionController`.
- `AimInteractionController` has one `useFrame` loop that runs while interactions are enabled.
- The frame loop calls `getRegistrations().filter(...)` each frame.
- `getRegistrations()` currently returns a new array from `registrationsRef.current.values()`.
- The frame loop maps active registrations into an `objects` array each frame.
- The frame loop calls `raycasterApi.intersectObjects(objects, true)`.
- The `true` recursive flag means Three.js checks children under every registered object.
- For every intersection, the frame loop calls `registrations.find(...)` and checks parent relationships to recover the matching registration.
- Pointer activation currently uses the latest cached aim hit through `activateCurrent(...)`.
- The pointer handler captures `pointerDownAtMs`, but activation still depends on the current interaction state from the frame loop.
- `src/3d/Level1RecordingStudioRoom.tsx` is the heaviest 3D file by a large margin.
- The recording studio contains about 538 mesh tags, 324 material mentions, 269 geometry mentions, 55 canvas textures, and 34 `useRegisterInteractable` call sites.
- The full studio room is mounted from `src/3d/Level1RoomShell.tsx` when the level has an active recording studio area.
- Vision 24 added interaction timing fields such as `frameDeltaMs`, `raycastDurationMs`, and `raycastObjectCount` to latency traces, but there is not yet a general interaction performance overlay.

## Diagnosis

The current implementation is flexible but scales poorly.

The main costs are:

- Rebuilding registration and object arrays every frame.
- Recursive raycasting through child meshes for every interactable.
- Doing a linear `registrations.find(...)` search for each raycast hit.
- Using one global interactable pool instead of filtering by area, distance, mode, or layer.
- Using frame-loop aim state for click activation, which can add latency when the frame rate drops.

This can hurt both FPS and input feel. If the frame loop is late, the app can be late to know what the user is aiming at. If a click depends on the last frame's raycast result, a slow frame can make a button or piano key feel delayed.

## Core Product Decision

Split interaction into two paths:

```text
hover / reticle path:
  optimized frame-loop raycast
  allowed to be throttled or filtered
  updates current aim label and hints

activation path:
  immediate pointerdown raycast
  activates from the fresh pointer event
  captures accurate timing for latency traces
```

Hover can be approximate. Activation needs to be immediate.

## [x] Phase 0 - Baseline And Guardrails

Goal: measure current cost before changing behavior.

### Implementation Spec

Approved scope:

- Add a lightweight interaction performance payload in `src/3d/interactions.tsx`.
- Record per-raycast duration, raycast object count, intersection count, hit count, and frame delta.
- Let `AimInteractionController` optionally report this payload through a callback prop.
- In `src/3d/ThreeDModeShell.tsx`, keep the latest interaction performance sample in state.
- Extend the existing FPS counter/readout only when FPS debug is enabled so users do not see a new normal UI surface.
- Add renderer stats from `gl.info.render` and `gl.info.memory` through a small in-canvas sampler if this can be done without broad UI changes.
- Keep all diagnostics development/debug oriented.

Acceptance criteria:

- With FPS/debug enabled, a developer can see FPS plus interaction raycast duration/object counts and renderer draw calls/triangles/textures.
- Normal users do not see new production controls.
- The diagnostic path does not trigger React state updates every frame; it should sample at a modest interval.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added interaction raycast performance samples.
- Added renderer performance samples.
- Displayed both sample types behind the existing FPS debug toggle.
- Avoided a new normal-user UI surface.

### Completed Implementation

- `AimInteractionController` can now emit throttled interaction samples with frame delta, raycast duration, raycast object count, intersection count, and hit count.
- `ThreeDModeShell` now samples `gl.info` for draw calls, triangles, textures, and geometries when the FPS overlay is enabled.
- The FPS overlay now shows FPS, interaction raycast stats, and renderer stats together.
- Samples are throttled to about twice per second and are cleared when the FPS overlay is disabled.

Tasks:

- Add a development interaction performance sample that records raycast duration, object count, hit count, and active area.
- Surface the current Vision 24 `raycastDurationMs` and `raycastObjectCount` in a debug overlay or concise console sample.
- Add renderer stats to the FPS overlay if available: draw calls, triangles, textures.
- Record baseline values in local dev and Discord Activity.
- Capture baseline while standing in the control room, recording studio, DJ booth, and while aiming at piano keys.

Exit criteria:

- We know typical and worst-case raycast duration in the dense studio.
- We know how many objects are being tested during normal play.
- We can compare FPS before and after each phase.

Expected files:

- `src/3d/interactions.tsx`
- `src/3d/ThreeDModeShell.tsx`
- `docs/3d/3dvision25-interaction-raycast-performance.md`

## [x] Phase 1 - Cache The Interactable Raycast Set

Goal: remove repeated frame allocations and repeated registration scans.

### Implementation Spec

Approved scope:

- Update the interaction registry in `src/3d/interactions.tsx` to maintain a cached active raycast target list.
- Rebuild the cache when registrations are added, removed, or when the frame loop detects that a registration's enabled state/object ref has changed.
- Keep the public `useRegisterInteractable(...)` API stable.
- Replace per-frame `getRegistrations().filter(...)` and `map(...)` with the cached raycast target list.
- Replace per-intersection `registrations.find(...)` with parent-chain resolution against registered root objects.
- Preserve activation timing fields from Vision 24.
- Preserve current behavior for keyboard activation, pointer activation, drag, shoot, and reticle state.

Acceptance criteria:

- The frame loop no longer rebuilds active registration arrays every frame.
- Hit resolution no longer linearly searches all registrations for each intersection.
- Existing interaction behavior remains functionally the same.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added cached active raycast target storage.
- Added parent-chain registration resolution.
- Removed per-intersection linear registration search.
- Deduped multiple child intersections under the same registered target.

### Completed Implementation

- The interaction provider now builds a cached raycast target list from active registrations and reuses it until registration state, target object refs, enabled state, or active area changes.
- Raycast hit resolution now walks from the intersected child object up to a registered root object using a `WeakMap`, instead of scanning every registration for every intersection.
- The hit list now keeps the first hit per registration, which avoids repeated child-mesh hits from producing duplicate aim hits for the same control.

Tasks:

- Change the interaction registry to maintain cached enabled raycast targets.
- Rebuild the cache only when an interactable registers, unregisters, changes enabled state, or changes target object.
- Keep a fast lookup from object/parent object to `InteractableRegistration`.
- Avoid `getRegistrations().filter(...)` inside the frame loop.
- Avoid `registrations.find(...)` for every intersection.
- Keep the public `useRegisterInteractable(...)` API stable for existing studio controls.

Implementation direction:

```text
registry state:
  registrationsById: Map<string, InteractableRegistration>
  activeRaycastObjects: Object3D[]
  rootObjectToRegistration: WeakMap<Object3D, InteractableRegistration>

frame loop:
  raycast activeRaycastObjects
  walk intersection.object parent chain until a registered root is found
```

Exit criteria:

- Frame-loop raycast behavior is the same from the user's point of view.
- The frame loop no longer rebuilds active registration arrays each frame.
- Hit resolution no longer does a full registration-list search per intersection.
- Piano, DJ buttons, drag controls, shootables, and movable layout objects still work.

Expected files:

- `src/3d/interactions.tsx`

## [x] Phase 2 - Fresh Pointerdown Activation

Goal: make clicks activate from the actual pointer event instead of relying on cached aim state.

### Implementation Spec

Approved scope:

- Add a one-shot pointer activation raycast path in `src/3d/interactions.tsx`.
- On pointerdown, raycast immediately against the cached active raycast targets.
- Try draggable activation from the fresh hit list first, then clickable activation, then shootable activation.
- Update aim state from the fresh pointerdown raycast so the reticle and active hit do not lag behind the click.
- Keep keyboard activation using the current aim state.
- Preserve pointer capture and active drag behavior.
- Preserve Vision 24 latency metadata, including `pointerDownAtMs`, `activatedAtMs`, `frameDeltaMs`, `raycastDurationMs`, and `raycastObjectCount`.

Acceptance criteria:

- Pointer clicks no longer rely only on the previous frame's cached aim hit.
- Piano/DJ/studio controls can activate from the current pointerdown raycast.
- Drag start still works and captures the pointer.
- Shooting fallback still works if no clickable/draggable target is activated.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added fresh pointerdown raycasting.
- Preserved pointer, activation, frame, and raycast timing metadata.
- Preserved drag-first, clickable-second, shootable-fallback pointer activation order.

### Completed Implementation

- Pointerdown now captures `pointerDownAtMs` before the immediate raycast.
- Pointerdown then raycasts against the current cached target set and updates aim state from that fresh result.
- Drag activation, clickable activation, and shootable activation now use the fresh pointerdown result rather than relying only on the previous frame's hover state.
- Keyboard activation still uses the current hover/aim state.

Tasks:

- Add a helper that performs a one-shot raycast from the current camera/pointer center.
- On `pointerdown`, raycast immediately against the cached interaction targets.
- Activate the best compatible hit directly for `clickable` and `draggable` modes.
- Keep existing keyboard activation behavior intact.
- Preserve `pointerDownAtMs`, `activatedAtMs`, `raycastDurationMs`, and `raycastObjectCount` timing metadata.
- Keep hover reticle state as a visual affordance, not the only source of truth for clicks.

Exit criteria:

- Clicking a piano key can activate from the current pointerdown raycast.
- Low FPS should not make the click wait for the next frame's aim update.
- Existing pointer drag behavior still starts reliably.
- Activation traces show pointer-to-activation timing separately from frame-loop hover timing.

Expected files:

- `src/3d/interactions.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx` only if piano trace wiring needs a small adjustment.

## [x] Phase 3 - Interaction Modes, Layers, And Area Filters

Goal: stop raycasting against things the user cannot reasonably interact with.

Tasks:

- Add optional metadata to interactable registrations for area id, station id, or interaction layer.
- Filter raycast targets to the current area when the level can provide it.
- Prefer nearby/current-room targets over far-away controls.
- Separate decorative meshes from interaction target meshes using explicit target objects and, later, Three.js layers.
- Consider separate cached lists by mode: clickable, draggable, movable, shootable.
- Make sure movable layout editor interactions can temporarily widen their filter when needed.

Exit criteria:

- Standing in the control room should not raycast every studio control if the studio is not in active reach.
- Standing at the DJ booth should not test unrelated piano/instrument controls first.
- Raycast object count drops significantly in dense scenes.
- All current interactions remain discoverable and usable.

Expected files:

- `src/3d/interactions.tsx`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`

### Checklist Items Achieved

- Added optional `areaId` metadata to interactable registrations.
- Added conservative area inference for existing registration ids.
- Passed the active area from `ThreeDModeShell` into `AimInteractionController`.
- Filtered the cached raycast target set by current area when an interactable can be confidently assigned to an area.

### Completed Implementation

- Existing studio registrations can be filtered as `recording-studio` based on `studio-*`, `soundcloud-*`, `deck-*`, and `crossfader-*` ids without touching every studio call site.
- Existing control-room registrations can be filtered as `control-room` based on `control-room-*` and `jukebox-*` ids.
- Existing range registrations can be filtered as `shooting-range` based on `prototype-target-*` and `gun-rack-*` ids.
- Global registrations, such as level exits and station monitors, remain available when they do not have a known area id.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual current-area checks still need to be run in local dev and Discord Activity.

## [x] Phase 4 - Studio Target Simplification

Goal: make studio controls cheaper to raycast without losing usability.

Tasks:

- Audit studio controls that register complex groups as interactable roots.
- Replace dense visual groups with simple invisible hit meshes where possible.
- For screen-style controls, use one screen hit surface plus local cell mapping where practical.
- For repeated controls, use fewer target roots and decode the intended cell/zone from pointer hit data if available.
- Reduce child mesh depth under registered target roots.
- Keep hit boxes generous enough for first-person use.

Exit criteria:

- The studio has fewer recursive child meshes under interactable roots.
- Raycasts hit simple targets before decorative detail.
- Button and key usability improves or stays the same.
- The code has a clear pattern for new controls: visual meshes separate from interaction meshes.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- Potential helper module if shared hit-target patterns emerge.

### Checklist Items Achieved

- Simplified the effective studio target stream without rewriting studio visuals.
- Deduped multiple child intersections under one studio control root.
- Kept visual meshes and existing hit boxes intact for usability.

### Completed Implementation

- The first simplification pass happened in the interaction layer: repeated child hits under the same registered studio group now collapse to one hit.
- Area filtering keeps many studio targets out of the raycast set when the player is outside the recording studio.
- A deeper visual-vs-hit-target refactor was not needed for this pass and should be a follow-up only if the new raycast object counts remain high.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual studio hitbox checks are listed in the Vision 25 manual QA section.

## [x] Phase 5 - Regression Tests And Manual QA

Goal: keep the faster interaction system from breaking gameplay.

Tasks:

- Add focused tests for interaction hit resolution if the project test setup supports it.
- Add a manual QA checklist for click, drag, move, and shoot paths.
- Test local dev and Discord Activity.
- Test first-person and top-down modes.
- Test piano keys, DJ cue/grid controls, SoundCloud platter drag, patch ports, layout move/place, level exits, and shooting range.
- Record before/after performance numbers in this document.

Exit criteria:

- No known interaction regressions.
- Performance samples show lower raycast duration and object count in the studio.
- Piano click traces show lower pointer-to-activation time under load.
- `npm.cmd run build` passes.

Expected files:

- `docs/3d/manual-test-checklist.md`
- `docs/3d/3dvision25-interaction-raycast-performance.md`
- Test files if a suitable local test pattern exists.

### Checklist Items Achieved

- Added Vision 25 manual QA coverage.
- Ran production build.
- Recorded remaining Discord Activity/manual verification needs.

### Completed Implementation

- `docs/3d/manual-test-checklist.md` now includes a Vision 25 interaction performance section covering FPS overlay stats, piano/DJ clicks, drags, layout movement, level exits, and shooting fallback.
- No automated interaction tests were added because there is no small existing test harness for Three.js raycaster behavior in this project.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual browser and Discord Activity QA are pending.

## Acceptance Criteria

Vision 25 is complete when:

- The frame loop no longer rebuilds and searches all registrations every frame.
- Pointerdown activation uses a fresh raycast for pointer interactions.
- Debug output shows raycast duration and object count clearly enough to compare builds.
- Dense studio areas use filtered or simplified raycast targets.
- Piano and DJ controls feel at least as responsive as before, ideally better in Discord Activity.
- Build passes.
- Manual QA covers the main interaction paths.

## Risks

- Parent-chain hit resolution must handle nested Three.js objects correctly.
- Some controls may rely on registering a parent group with many children; simplifying this could accidentally shrink hit areas.
- Area filtering can hide valid interactions if current-area detection is wrong.
- Direct pointerdown raycast must preserve drag behavior and pointer capture.
- The reticle can disagree with immediate pointerdown hit results if hover is throttled too aggressively.

## Non-Goals

- Do not redesign the recording studio visuals in this vision.
- Do not solve canvas texture churn here except where it affects interaction targets.
- Do not change the musical sync model from Vision 24.
- Do not replace Three.js raycasting entirely.
- Do not make a broad physics/collision system as part of this pass.

## Research Notes

Useful facts from this research pass:

- `Level1RecordingStudioRoom.tsx` is the dominant 3D cost center by mesh/material/texture count.
- `interactions.tsx` currently has the most important CPU optimization opportunity because its work happens every frame while interactions are enabled.
- Reducing render DPR and canvas texture churn are separate FPS opportunities, but recursive interaction raycasting is the cleanest accidental-hack fix.
- A direct pointerdown activation path should help both FPS-adjacent responsiveness and the audio latency work from Vision 24.
