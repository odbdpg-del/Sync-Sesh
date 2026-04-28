# Secret 3D World Vision 26 - Recording Studio Level Extraction

## Purpose

Vision 26 plans the next topology cleanup for the hidden 3D world: move the Recording Studio out of the current Level 1 merged world and make it its own loadable destination.

After Vision 16, the shooting range already became a separate level and Level 1 became a cleaner hub. The remaining large attachment is the Recording Studio. It still works, but it keeps Level 1 bigger, more coupled, and harder to evolve than it needs to be.

The goal is to make the Control Room the true Level 1 hub and turn the Recording Studio into a dedicated level with its own entry/return door flow, while preserving the current studio behavior and keeping level transitions local-only.

## Product Recommendation

Make the Recording Studio its own level and keep the Control Room as the default hidden-world entry.

- Keep the hidden unlock flow unchanged: type `syncsesh` to enter the 3D world.
- Keep Level 1 as the Control Room hub with stations, wall displays, balcony, jukebox, and world doors.
- Add a readable in-world studio door in Level 1 that loads a new `level-3-recording-studio`.
- Add a return door inside the studio that brings the user back to Level 1.
- Keep studio transitions local-only, matching the current range-door model.
- Preserve current studio systems: DAW, monitors, patching, SoundCloud booth, drums, piano, guitar, looper, and layout editing.
- Treat this first as world-topology cleanup, not as a behavior redesign.

Recommended world shape after Vision 26:

```text
Level 1: Control Room Hub
  - stations
  - hero monitor wall
  - jukebox
  - balcony / props
  - door to range
  - door to recording studio

Level 2: Shooting Range
  - lanes
  - targets
  - local range challenge
  - return door to Level 1

Level 3: Recording Studio
  - DAW / transport
  - monitors / patching
  - piano / drums / guitar / looper
  - SoundCloud DJ booth
  - layout editing
  - return door to Level 1
```

## Why Now

The architecture is already close to supporting this cleanly.

Current strengths:

- `ThreeDModeShell` already owns local level selection and door-based transitions.
- `levels/registry.ts` already supports multiple registered levels.
- `LevelExitDoor` already supports in-world `E` transitions.
- The shooting range already proved the local level-transition model.
- Most studio behavior is self-contained inside one large studio renderer.
- Shared studio live-sound routing is keyed to `"recording-studio"` area semantics, which can survive a level move.

Current pressure:

- Level 1 still includes both Control Room and Recording Studio world geometry.
- `Level1RoomShell` still contains hub rendering and studio mounting logic.
- `Level1RecordingStudioRoom.tsx` is extremely large and currently mounted through Level 1 assumptions.
- Sim routes and some reveal behavior still treat Level 1 as the oversized default space.
- Future levels become harder to reason about if Level 1 remains the place where every major room lives.

This cleanup gives the hidden world a stronger long-term shape before more rooms or more studio features are added.

## Code Facts

Starting facts from read-only code review on 2026-04-27:

- `src/3d/levels/registry.ts` currently registers `level-1` and `level-2-range`.
- `src/3d/levels/level1.ts` still defines both `control-room` and `recording-studio` as active areas in the same level config.
- `src/3d/levels/level1.ts` still contains the recording studio opening, studio collision blockers, and studio traversal surfaces.
- `src/3d/Level1RoomShell.tsx` mounts `Level1RecordingStudioRoom` only when `levelConfig.id === "level-1"` and the recording-studio area/opening are active.
- `src/3d/Level1RoomShell.tsx` already renders `LevelExitDoor` entries generically from `levelConfig.exits`.
- `src/3d/ThreeDModeShell.tsx` already owns `currentLevelId`, `getLevelConfig(...)`, `handleLevelExit(...)`, reveal reset, control reset, top-down reset, and free-roam presence clearing.
- `src/3d/ThreeDModeShell.tsx` resolves the current area from `levelConfig.areas` via `getAreaForPosition(...)`.
- `src/3d/ThreeDModeShell.tsx` emits and listens for shared studio live sound using `areaId: "recording-studio"`.
- `src/types/session.ts` constrains shared DAW live-sound payloads to `areaId: "recording-studio"`.
- `src/lib/lobby/sessionState.ts` currently validates studio guitar / shared studio behavior against `"recording-studio"` area freshness.
- `src/3d/interactions.tsx` maps several studio/SoundCloud interaction ids to the `"recording-studio"` area label.
- `src/3d/simBotRoaming.ts` still uses a special route set only for `level-1`.
- `docs/3d/3dvision16-world-cleanup-and-level-doors.md` already left Recording Studio extraction as a future step.

## Target Architecture

After this extraction, level responsibilities should be cleaner:

- `level-1`
  - Control Room only.
  - Remains the default hidden-world entry.
  - Owns hub props, stations, wall displays, jukebox, and door destinations.

- `level-3-recording-studio`
  - Owns the Recording Studio footprint, collision, traversal surfaces, lighting, spawn, and exit back to Level 1.
  - Keeps the `"recording-studio"` area id inside the level so current studio-specific behavior can continue to key off it.

- `ThreeDModeShell`
  - Continues to own local-only transitions, reveal resets, pointer-lock cleanup, and area tracking.
  - Should not gain level-specific studio branching unless absolutely needed for transition polish.

- Studio renderer
  - Should stop being conceptually "Level 1 studio room" and move toward being the standalone studio world renderer.
  - Renaming can happen immediately or in a later cleanup pass.

## Design Direction

The studio entrance should feel like a destination door inside the hub, not a debug level picker.

Possible Level 1 studio-door treatments:

- A west-wall `STUDIO` bulkhead where the current physical opening exists.
- A sealed-glass control-room doorway with neon trim and a status panel.
- A dedicated studio portal panel near the jukebox side of the room.
- A door with readable `STUDIO` copy and the standard reticle / `E` activation flow.

First-pass visual requirements:

- Readable in first-person.
- Legible in top-down.
- Does not block the station lanes.
- Uses the same interaction style as other level doors.
- Does not imply synced party travel.

Level 3 studio should preserve the current identity:

- Same instrument / DAW behavior.
- Same layout editor behavior.
- Same SoundCloud booth behavior.
- Same patching / monitor story.
- Same area identity for studio-scoped audio behavior.

## Extraction Strategy

Recommended strategy:

1. Create `level-3-recording-studio` as a new config first.
2. Reuse the current recording-studio area bounds and traversal data as the seed for the new level.
3. Mount the studio renderer under the new level before removing the old Level 1 attachment.
4. Add a Level 1 studio exit door and a Level 3 return door.
5. Remove studio area/opening/collision from Level 1 only after Level 3 render and transitions are proven.

This keeps the change reversible and reduces the chance of breaking both worlds at once.

## Main Risks

This change is feasible, but it is not just a config shuffle.

Key risks:

- `Level1RecordingStudioRoom.tsx` is large and currently assumes it is being mounted from `Level1RoomShell`.
- Reveal/spawn behavior is still friendliest to station-based levels and may feel odd in a stationless studio destination.
- Some studio interaction and live-audio behavior depends on area identity; that should be preserved, not renamed casually.
- Sim roaming currently has Level 1-specific routes and may need a new Level 3 route set or a safer default.
- Level 1 collision and visuals must be cleaned together so the removed studio opening does not leave a void or mismatched wall.
- Local studio state currently lives in `ThreeDModeShell`; transitions should not accidentally clear behavior the user expects to keep while traveling between levels.

## Phase Plan

- [x] V26-1: Document The Extraction Plan.
- [x] V26-2: Add `level-3-recording-studio` Config.
- [x] V26-3a: Mount A Minimal Studio Shell Under Level 3.
- [x] V26-3b: Restore Full Studio Systems Under Level 3.
- [x] V26-3c: Remove Temporary Dual-Mount Glue.
- [x] V26-4: Add Level 1 Studio Door And Level 3 Return Door.
- [x] V26-5: Remove Studio Geometry From Level 1 Hub.
- [ ] V26-6: Tighten Studio Transition, Spawn, And Area Behavior.
- [hold] V26-7: Rename / Split Studio Renderer After Extraction.

## V26-1: Document The Extraction Plan

Status: `[x]` complete.

### Summary

Create this vision doc and lock the intended topology before code changes.

### Expected Files

- `docs/3d/3dvision26-recording-studio-level-extraction.md`

### Acceptance Criteria

- The doc explains why the Recording Studio should become its own level.
- The doc defines the target Level 1 / Level 3 split.
- The doc lists relevant code facts, risks, and a phased implementation plan.
- No application behavior changes happen in this phase.

### Verification

- Docs read-through.

### Checklist Items Achieved

- Created the Vision 26 planning doc.
- Defined the target topology with Level 1 as the Control Room hub and Level 3 as the standalone Recording Studio.
- Captured the relevant code facts, risks, extraction strategy, and phase plan.
- Kept the phase planning-only with no app behavior changes.

### Completed Implementation

Vision 26 now exists as `docs/3d/3dvision26-recording-studio-level-extraction.md`.

## V26-2: Add `level-3-recording-studio` Config

Status: `[x]` complete.

### Summary

Create a new standalone level config for the Recording Studio before removing it from Level 1.

### Expected Files

- `src/3d/levels/level3RecordingStudio.ts`
- `src/3d/levels/registry.ts`
- `src/3d/levels/index.ts`
- `src/3d/levels/types.ts` only if metadata additions are truly needed

### Expected Work

- Add a new level id, recommended: `level-3-recording-studio`.
- Define dimensions, player start, top-down camera, collision bounds, lighting, exits, and traversal surfaces.
- Keep a `"recording-studio"` active area inside the new level config.
- Add a return exit targeting `level-1`.
- Reuse current studio area bounds and traversal measurements as the first pass where appropriate.

### Acceptance Criteria

- The new level is registered and resolvable by `getLevelConfig(...)`.
- The new level can be requested directly by level id, even if it is not wired to a door yet.
- No existing Level 1 or Level 2 behavior regresses.

### Risks

- Copying config data without trimming old assumptions can duplicate stale geometry logic.

### Non-Goals

- Do not remove the studio from Level 1 yet.

### Build And Manual Checks

- `npm.cmd run build`
- Optional direct-level smoke test later once the studio renderer is mounted under Level 3.

### Checklist Items Achieved

- Added `src/3d/levels/level3RecordingStudio.ts`.
- Registered `level-3-recording-studio` in `src/3d/levels/registry.ts`.
- Re-exported the new config from `src/3d/levels/index.ts`.
- Preserved the `"recording-studio"` area id in the standalone level config.
- Added a Level 3 return door targeting `level-1`.
- Reused the current studio footprint and traversal surfaces as the seed config.

### Completed Implementation

`level-3-recording-studio` now exists as a standalone registered level config with dimensions, spawn, top-down camera, collision bounds, lighting, a return exit to Level 1, an active `"recording-studio"` area, and the current DJ platform traversal surfaces. This phase does not yet mount the full studio renderer under Level 3; it only makes the level resolvable through the registry.

## V26-3a: Mount A Minimal Studio Shell Under Level 3

Status: `[x]` complete.

### Summary

Make `level-3-recording-studio` render a minimal studio world successfully before wiring every studio subsystem.

### Expected Files

- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- Possibly a new wrapper such as `src/3d/RecordingStudioLevelShell.tsx`

### Expected Work

- Add the smallest possible render path so `level-3-recording-studio` no longer loads as an empty or wrong shell.
- Prefer a wrapper or light conditional mount over a large refactor.
- Keep Level 1 studio rendering untouched during this subphase.
- Do not try to perfect naming or file boundaries yet.

### Manager-Prepared Implementation Spec

Approved scope for `V26-3a`:

- In `src/3d/Level1RoomShell.tsx`:
  - Introduce a new condition for `levelConfig.id === "level-3-recording-studio"`.
  - Reuse the existing `"recording-studio"` area lookup when available.
  - Allow the studio renderer to mount without requiring the old Level 1 opening object if the new level does not have one.
- In `src/3d/Level1RecordingStudioRoom.tsx`:
  - Make the `opening` dependency optional only if needed for rendering the room shell.
  - If the east-door threshold visuals depend on `opening`, provide a safe fallback path for Level 3 rather than inventing fake geometry in `ThreeDModeShell`.
- In `src/3d/levels/level3RecordingStudio.ts`:
  - Only add a lightweight opening object if the renderer truly requires it and the requirement is easier to satisfy in config than in render code.

Files to avoid in `V26-3a`:

- Do not split the full studio file.
- Do not rename the studio file yet.
- Do not remove Level 1 studio rendering yet.
- Do not change session reducer/types, sync transport, or audio behavior.

### Acceptance Criteria

- Loading `level-3-recording-studio` renders recognizable studio geometry instead of a generic empty room.
- Level 1 still renders its current attached studio exactly as before.
- Build passes.

### Risks

- The current studio renderer may assume the old Level 1 doorway/opening shape more than expected.

### Non-Goals

- Do not restore every studio interaction in this subphase.

### Build And Manual Checks

- `npm.cmd run build`
- Direct Level 3 smoke test still recommended in the next interactive validation pass.

### Checklist Items Achieved

- Added a lightweight Level 3 studio opening config so the existing studio renderer could mount safely.
- Added a standalone-studio render path in `Level1RoomShell.tsx`.
- Suppressed the generic fallback room floor / wall / station shell for `level-3-recording-studio` so the studio does not render on top of an extra base room.
- Kept the existing Level 1 attached studio path intact.
- Avoided deep refactors or studio-system rewrites in this subphase.

### Completed Implementation

`level-3-recording-studio` now mounts the existing studio world renderer through a minimal shell path. The standalone studio level uses its own opening config and skips the generic `Level1RoomShell` base floor/wall/station shell so the recognizable studio geometry can render without broad refactoring. Full studio-system verification and assumption cleanup remain in `V26-3b`.

## V26-3b: Restore Full Studio Systems Under Level 3

Status: `[x]` complete.

### Summary

Once the minimal Level 3 mount works, restore the full studio systems and verify they behave correctly in the standalone level.

### Expected Files

- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/ThreeDModeShell.tsx` only if prop plumbing or area behavior needs a narrow adjustment
- `docs/3d/manual-test-checklist.md`

### Expected Work

- Verify DAW, monitors, patching, layout editing, SoundCloud booth, guitar, drums, piano, and looper behavior under Level 3.
- Fix prop-flow or level-specific assumptions exposed by the standalone mount.
- Keep the `"recording-studio"` area identity intact.
- Keep Level 1 studio rendering in place until the later removal phase.

### Manager-Prepared Implementation Spec

Approved scope for `V26-3b`:

- Preserve the existing studio prop surface from `ThreeDModeShell` to the room shell.
- Prefer localized conditional fixes over broad refactors.
- If a studio behavior incorrectly depends on `levelConfig.id === "level-1"`, move that check to an area-based or capability-based condition instead.
- Keep shared studio live-sound behavior scoped to `"recording-studio"` area logic.

Files to avoid in `V26-3b`:

- Do not remove the old Level 1 studio branch yet.
- Do not redesign the studio interactions.
- Do not rename or split the large studio file unless a tiny extraction clearly reduces risk.

### Acceptance Criteria

- `level-3-recording-studio` supports the same major studio systems as the attached Level 1 version.
- Shared studio live-sound still behaves correctly in the studio area.
- Level 1 attached studio still works during the transition period.
- Build passes.

### Risks

- This is the most behavior-sensitive subphase because it surfaces the hidden assumptions inside the large studio renderer.

### Non-Goals

- Do not do the final topology cleanup yet.

### Build And Manual Checks

- `npm.cmd run build`
- Direct Level 3 interactive validation is still recommended for a full smoke pass across every studio station.

### Checklist Items Achieved

- Kept the existing studio prop surface flowing into the Level 3 mount path.
- Preserved `"recording-studio"` area identity for studio-scoped behaviors and shared live-sound routing.
- Confirmed the studio renderer continues using area-based studio behavior rather than hardcoded Level 1 ids.
- Improved stationless level reveal behavior so Level 3 now uses the active area's spawn/camera target instead of the generic world-origin fallback.
- Avoided broad refactors or session/sync schema changes in this subphase.

### Completed Implementation

The standalone studio mount now inherits the full existing studio prop surface, and the most important level-specific assumption has been tightened in `ThreeDModeShell.tsx`: when a level has no user stations, the reveal rig now uses the active area's `spawnPosition` and `cameraTarget` if available. This gives `level-3-recording-studio` a more intentional standalone entry behavior while keeping studio-scoped systems keyed to the stable `"recording-studio"` area id.

## V26-3c: Remove Temporary Dual-Mount Glue

Status: `[x]` complete.

### Summary

After Level 3 studio rendering is proven, clean up any temporary branching added only to get the standalone mount working.

### Expected Files

- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- Possibly a new wrapper such as `src/3d/RecordingStudioLevelShell.tsx`

### Expected Work

- Remove any obviously temporary fallback paths that are no longer needed.
- Keep the render path understandable before the Level 1 studio removal phase.
- Leave deeper renaming/splitting for the later hold phase unless cleanup is tiny.

### Acceptance Criteria

- The standalone studio mount path is understandable and stable.
- No unnecessary temporary conditional logic remains.
- Build passes.

### Non-Goals

- Do not remove the studio from Level 1 in this subphase.

### Build And Manual Checks

- `npm.cmd run build`

### Checklist Items Achieved

- Replaced the most ad hoc standalone-studio branching in `Level1RoomShell.tsx` with small helper functions.
- Centralized control-room-level, standalone-studio-level, area, and opening detection logic.
- Simplified the studio render condition so it now depends on active studio area/opening availability rather than duplicated explicit level-id branching.
- Kept the current Level 1 attached studio path intact.

### Completed Implementation

The temporary standalone-studio support in `Level1RoomShell.tsx` is now cleaner and more explicit. Helper functions handle level-type checks, active-area lookup, and valid recording-studio opening detection, which makes the render path easier to reason about before the next phase removes the studio from Level 1 entirely.

## V26-4: Add Level 1 Studio Door And Level 3 Return Door

Status: `[x]` complete.

### Summary

Add explicit in-world door transitions between the Control Room hub and the new standalone studio.

### Expected Files

- `src/3d/levels/level1.ts`
- `src/3d/levels/level3RecordingStudio.ts`
- `src/3d/Level1RoomShell.tsx` only if placement needs a visual adjustment
- `docs/3d/manual-test-checklist.md`

### Expected Work

- Add a `STUDIO` exit in Level 1 targeting `level-3-recording-studio`.
- Add a `BACK` or `CONTROL` exit in Level 3 targeting `level-1`.
- Reuse `LevelExitDoor` and the current reticle / `E` interaction flow.
- Keep transitions local-only.

### Acceptance Criteria

- User can go from Level 1 to Level 3 through an in-world door.
- User can return to Level 1 from Level 3.
- Top-down view still disables door interaction.
- First focus click does not accidentally trigger travel.

### Build And Manual Checks

- `npm.cmd run build`
- Aim at the Level 1 STUDIO door and press `E`.
- Verify `data-level-id="level-3-recording-studio"`.
- Aim at the Level 3 BACK door and press `E`.
- Verify returning to `level-1`.

### Checklist Items Achieved

- Added a Level 1 `STUDIO` exit targeting `level-3-recording-studio`.
- Kept the existing Level 3 `BACK` exit targeting `level-1`.
- Reused the shared `LevelExitDoor` interaction path for both directions.
- Updated the manual checklist with Level 1 STUDIO door and Level 3 BACK door checks.

### Completed Implementation

The Control Room hub now includes a `STUDIO` level exit targeting `level-3-recording-studio`, while the standalone studio level keeps its `BACK` return door to Level 1. This phase only wires the in-world door transitions through existing exit config; it does not yet remove the attached studio geometry from Level 1.

## V26-5: Remove Studio Geometry From Level 1 Hub

Status: `[x]` complete.

### Summary

Finish the topology cleanup by removing the embedded studio from Level 1.

### Expected Files

- `src/3d/levels/level1.ts`
- `src/3d/Level1RoomShell.tsx`
- `docs/3d/manual-test-checklist.md`

### Expected Work

- Remove the active `recording-studio` area from `level-1`.
- Remove the recording-studio opening from Level 1.
- Remove studio collision blockers and traversal surfaces from Level 1.
- Resolve the west-side studio opening into a clean hub wall or door treatment.
- Remove the old Level 1 studio render branch.

### Manager-Prepared Implementation Spec

Approved scope for `V26-5`:

- In `src/3d/levels/level1.ts`:
  - Remove the active `recording-studio` area from `areas`.
  - Remove `"recording-studio"` from the Control Room `connectedAreaIds`.
  - Remove the `control-room-recording-studio-opening` entry from `openings`.
  - Remove the recording-studio collision blockers from `collisionBounds.blockers`.
  - Tighten the Level 1 room bounds so the west side no longer includes the old attached studio footprint.
  - Remove the recording-studio traversal surfaces from `traversalSurfaces`.
  - Keep the new Level 1 `STUDIO` exit door intact.
- In `src/3d/Level1RoomShell.tsx`:
  - Let the old Level 1 west-wall opening fall back to a normal solid wall once the opening config is removed.
  - Ensure the standalone Level 3 mount path still works.
  - Remove any remaining Level 1-specific attached-studio render path so Level 1 no longer mounts `Level1RecordingStudioRoom`.
- In `docs/3d/manual-test-checklist.md`:
  - Update expectations so Level 1 is now Control Room only.
  - Keep explicit checks for Level 1 `STUDIO` door -> Level 3 and Level 3 `BACK` door -> Level 1.

Files to avoid in `V26-5`:

- Do not redesign the Control Room art beyond what is required to close the old opening cleanly.
- Do not remove or rename the standalone Level 3 studio config.
- Do not refactor studio systems, session reducers, sync payloads, or audio behavior in this pass.
- Do not change the Level 2 range topology in this phase.

### Acceptance Criteria

- Level 1 becomes a true control-room-only hub.
- No studio floor, walls, or interactions remain embedded in Level 1.
- The standalone Level 3 studio remains functional.

### Risks

- Collision and visual wall cleanup must be done together.

### Non-Goals

- Do not redesign the Control Room art beyond what is needed to resolve the removed opening.

### Recommended Verification

- `npm.cmd run build`
- Enter Level 1 with `syncsesh` and verify no attached studio geometry remains west of the Control Room.
- Aim at the Level 1 `STUDIO` door and press `E`; verify `data-level-id="level-3-recording-studio"`.
- In Level 3, verify the studio still renders and the `BACK` door returns to Level 1.

### Checklist Items Achieved

- Removed the active `recording-studio` area from `level-1`.
- Removed `"recording-studio"` from the Level 1 Control Room `connectedAreaIds`.
- Removed the Level 1 recording-studio opening config.
- Removed the attached studio collision blockers and traversal surfaces from Level 1.
- Tightened the Level 1 collision room west bound so Level 1 no longer includes the old attached studio footprint.
- Let the old west opening fall back to a solid Control Room wall.
- Restricted `Level1RecordingStudioRoom` mounting to the standalone Level 3 path.
- Updated the manual checklist to reflect Level 1 as a door-based hub for the studio.

### Completed Implementation

Level 1 is now a true control-room-only hub at the config and room-shell level. The attached Recording Studio area, opening, collision, and traversal data have been removed from `level-1`, and the studio renderer now mounts only for the standalone `level-3-recording-studio` path. The Level 1 `STUDIO` door remains the intended route into the studio, and Level 3 keeps the `BACK` return path.

## V26-6: Tighten Studio Transition, Spawn, And Area Behavior

Status: `[ ]` not started.

### Summary

Polish any level-specific behavior that feels awkward once the studio is standalone.

### Expected Files

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/simBotRoaming.ts`
- `src/3d/interactions.tsx` only if area routing needs explicit Level 3 support
- `docs/3d/manual-test-checklist.md`

### Expected Work

- Review reveal/spawn behavior for the standalone studio.
- Review fallback station logic for a level with no user stations.
- Add or tune sim roaming routes for Level 3 if useful.
- Confirm area tracking remains correct for `"recording-studio"` scoped features.
- Confirm studio live-sound still only plays for users who are actually in the studio area.

### Acceptance Criteria

- Level 3 spawn and reveal feel intentional.
- No stale area labels or stale presence remain after transitions.
- Studio-scoped shared audio still behaves correctly.

### Risks

- Some of this behavior may expose assumptions that were harmless while the studio was embedded in Level 1.

## V26-7: Rename / Split Studio Renderer After Extraction

Status: `[hold]` on hold.

### Summary

After the extraction is working, rename and split the giant studio renderer into clearer modules.

### Future Direction

Potential future work:

- Rename `Level1RecordingStudioRoom.tsx` to a level-agnostic studio name.
- Split layout editor, SoundCloud booth, monitors, patching, and instruments into focused modules.
- Move more static studio geometry into config-driven or smaller renderer units.

### Non-Goals While On Hold

- Do not combine extraction and deep studio refactor in one risky pass unless forced by blockers.

## Manual Test Plan

Required checks once implementation begins:

- Normal app still loads with no visible 3D affordances.
- `syncsesh` still opens Level 1 by default.
- Level 1 remains the Control Room hub.
- Studio door in Level 1 is readable and reachable.
- Entering the studio loads `level-3-recording-studio`.
- Returning from the studio brings the user back to Level 1 cleanly.
- DAW, monitors, patching, piano, drums, guitar, looper, and SoundCloud controls still work in Level 3.
- Studio layout editing still works in Level 3.
- Shared studio live-sound only plays while the local user is in the studio area.
- Pointer lock, top-down, Escape menu, reticle interaction, and Exit still work across repeated Level 1 / Level 3 transitions.
- Free-roam presence does not duplicate or remain stale after transitions.
- `npm.cmd run build` passes.

## Non-Goals

- No visible 2D level selector.
- No synced party travel.
- No new session reducer events unless a later phase explicitly needs them.
- No new shared movement system.
- No redesign of studio instruments or SoundCloud behavior as part of the extraction itself.
- No forced deep refactor of the full studio file in the same pass.

## Assumptions

- Level transitions remain local-only.
- Level 1 should remain the default hidden-world entry point.
- The `"recording-studio"` area id should remain stable even after the level move.
- Existing studio local state can remain owned by `ThreeDModeShell` unless testing proves a need to relocate it.
- The best first extraction is topology-first, behavior-preserving, and reversible in stages.
