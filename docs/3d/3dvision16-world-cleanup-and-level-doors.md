# Secret 3D World Vision 16 - World Cleanup And Level Doors

## Purpose

Vision 16 turns the hidden 3D world from one growing mega-room into a cleaner hub-and-level structure.

Level 1 should become the main hub: the control room, user stations, monitor wall, jukebox, and doors to other spaces. The shooting range should move back into its own loadable level and be entered by aiming at an in-world door or panel and pressing `E`.

The goal is not to shrink the ambition of the hidden world. The goal is to give it a stronger spine so new rooms can keep being added without making Level 1 and `Level1RoomShell` carry every feature forever.

## Product Recommendation

Make Level 1 the hub and make the shooting range a separate destination.

- Keep the hidden unlock flow unchanged: type `syncsesh` to enter the 3D world.
- Keep the normal 2D timer/lobby/dashboard free of visible 3D affordances.
- Put a readable `RANGE` door, panel, or portal in the Level 1 Control Room.
- Aim at the range door and press `E` to load `level-2-range`.
- Keep the existing Level 2 return door behavior so users can come back to Level 1.
- Use the current reveal/transition reset behavior rather than adding cinematic loading complexity in the first pass.
- Treat this as a topology cleanup first, not a full art redesign.

Recommended world shape after V16:

```text
Level 1: Control Room Hub
  - stations
  - hero monitor wall
  - jukebox
  - doors to other spaces
  - recording studio remains attached for now
  - shooting range no longer renders as a connected side room

Level 2: Shooting Range
  - lanes
  - targets
  - challenge state
  - scoreboard display
  - return door to Level 1

Future Level 3+: Recording Studio or another compact room
```

## Why Now

The 3D world has crossed the threshold from prototype to actual place.

Current strengths:

- Level configs already support multiple registered levels.
- `LevelExitDoor` already supports in-world `E` transitions.
- The interaction system already supports clickable in-world objects.
- Level 2 already exists as a separate range config.
- Free-roam presence already clears on level changes.

Current pressure:

- Level 1 currently includes the Control Room, Recording Studio, and shooting range content.
- `Level1RoomShell` renders both hub content and range challenge content.
- `Level1RecordingStudioRoom.tsx` is already very large, so Level 1 should stop absorbing unrelated gameplay.
- The main app bundle is large, and the hidden 3D world should eventually lazy-load.

This cleanup gives the world a better shape before adding more rooms.

## Code Facts

Starting facts from code review before V16 implementation on 2026-04-22:

- `src/3d/levels/registry.ts` already registers `level-1` and `level-2-range`.
- `src/3d/levels/level1.ts` imported `level2RangeConfig` and exposed `shootingRange: level2RangeConfig.shootingRange`.
- `src/3d/levels/level1.ts` defined active `shooting-range` area bounds, range wall collision, range traversal/opening data, and the Control Room range opening.
- `src/3d/Level1RoomShell.tsx` renders `Level1RangeRoom` when `levelConfig.id === "level-1" && levelConfig.shootingRange`.
- `src/3d/Level1RoomShell.tsx` renders `ShootingRangePrototype` for non-Level-1 configs with `shootingRange`.
- `src/3d/LevelExitDoor.tsx` already provides an in-world clickable door primitive that calls `onActivateExit(targetLevelId)`.
- `src/3d/ThreeDModeShell.tsx` already owns `currentLevelId`, `handleLevelExit`, local pose reset, free-roam presence clearing, reveal reset, and top-down reset on level change.
- `src/3d/interactions.tsx` already supports `clickable`, `shootable`, and `movable` interaction modes through center aim.
- `src/screens/MainScreen.tsx` imported `ThreeDModeShell` and `RenderingStackSpike` directly, so the hidden 3D world was included in the normal app bundle.

## Target Architecture

Level configs should describe the static world for each room:

- dimensions
- player start
- top-down camera
- collision bounds
- lighting
- exits
- optional room modules, such as shooting range data

Rendering shells should stay closer to one responsibility:

- `Level1RoomShell` should render the Level 1 hub.
- Range rendering should live behind `level-2-range`.
- Door transitions should use shared `LevelExitDoor` style primitives.
- Cross-level behavior should remain in `ThreeDModeShell`.

The first cleanup should avoid changing sync semantics. Level transitions remain local to the user unless a future vision explicitly designs shared room membership.

## Design Direction

The range entrance should feel like a clear in-world destination, not a debug selector.

Possible Level 1 range-door treatments:

- A wall-mounted `RANGE` panel near the east side of the Control Room.
- A sealed range bulkhead with glowing trim and a small status screen.
- A compact portal frame where the old range opening lived.
- A door with `E RANGE` target feedback through the existing reticle.

First-pass visual requirements:

- Readable from first-person.
- Visible enough in top-down.
- Does not block movement lanes.
- Does not introduce a visible 2D UI selector.
- Does not imply synced group travel.

Level 2 should keep the current shooting range identity:

- lane strips
- targets
- local challenge loop
- synced completed scoreboard summaries
- return door to Level 1

## Phase Plan

- [x] V16-1: Document Target World Topology.
- [x] V16-2: Remove Shooting Range From Level 1 Hub.
- [x] V16-3: Add Level 1 Range Door Transition.
- [x] V16-4: Tighten Level Transition Reset And Spawn Behavior.
- [x] V16-5: Lazy-Load Hidden 3D Shell.
- [hold] V16-6: Prepare Recording Studio For Future Level Extraction.

## V16-1: Document Target World Topology

Status: `[x]` complete.

### Summary

Create this vision doc and align the next cleanup direction before code changes.

### Implementation Spec

Expected files:

- `docs/3d/3dvision16-world-cleanup-and-level-doors.md`

Optional files:

- `docs/3d/future-levels.md` if cross-document wording needs a small update later.

### Acceptance Criteria

- Vision 16 explains why Level 1 should become the hub.
- Vision 16 explicitly recommends the range as a separate door-loaded level.
- Vision 16 lists current code facts and a phased cleanup plan.
- No application behavior changes in this phase.

### Verification

- Docs read-through.

### Checklist Items Achieved

- Created the V16 vision doc.
- Captured the hub-and-level recommendation.
- Listed current code facts, risks, phase plan, and manual checks.

### Completed Implementation

Vision 16 now exists as `docs/3d/3dvision16-world-cleanup-and-level-doors.md`.

## V16-2: Remove Shooting Range From Level 1 Hub

Status: `[x]` complete.

### Summary

Stop rendering the shooting range as part of Level 1.

### Implementation Spec

Expected files:

- `src/3d/levels/level1.ts`
- `src/3d/Level1RoomShell.tsx`
- `docs/3d/manual-test-checklist.md`
- `docs/3d/3dvision16-world-cleanup-and-level-doors.md`

Expected work:

- Remove the Level 1 dependency on `level2RangeConfig.shootingRange`.
- Remove or disable Level 1 `shootingRange` data.
- Remove the Level 1 `Level1RangeRoom` render path.
- Keep `level-2-range` registered and functional.
- Resolve the old Control Room east opening as a solid hub wall during V16-2; V16-3 will add the actual range door.
- Preserve normal Level 1 Control Room, stations, jukebox, hero wall, recording studio, presence markers, and local station return.

Important caution:

- Removing the connected range room means collision bounds and visual wall segments must be reviewed together. Do not leave a walk-through opening into empty space.

Manager-approved implementation detail:

- In `src/3d/levels/level1.ts`:
  - Remove the runtime import of `level2RangeConfig`.
  - Remove the `shootingRange` property from `level1Config`.
  - Remove the active `shooting-range` area from `areas`.
  - Remove `"shooting-range"` from the Control Room `connectedAreaIds`.
  - Remove the `control-room-range-opening` entry from `openings`.
  - Replace the split Control Room east wall collision blockers and connector/range blockers with one full `control-room-east-wall` blocker spanning `z -9` to `z 9`.
  - Tighten the Level 1 collision room east bound to the Control Room east wall (`x = 10`) so users cannot roam into the former range void.
  - Keep all Recording Studio blockers, areas, opening, and traversal surfaces intact.
- In `src/3d/Level1RoomShell.tsx`:
  - Remove the `Level1RangeRoom` import.
  - Remove the Level 1-only `Level1RangeRoom` render branch.
  - Keep the existing generic `ShootingRangePrototype` branch for non-Level-1 configs that include `shootingRange`, so `level-2-range` continues to function.
  - Let the absence of `control-room-range-opening` fall through to the existing full east wall visual render.
- In docs:
  - Mark V16-2 completion details after implementation.
  - Update the manual checklist so Level 1 is expected to have no connected range lanes/targets after V16-2.
- Files to avoid:
  - Do not change session reducer/types, sync clients, DAW/audio behavior, SoundCloud behavior, recording-studio layout, or normal 2D dashboard components.
  - Do not add the range door yet; that is V16-3.

### Acceptance Criteria

- Level 1 no longer renders range lanes, targets, or Level 1 range challenge UI.
- `level-2-range` still renders the shooting range when loaded directly by config or transition.
- The normal hidden unlock still opens Level 1.
- No normal-app range selector appears.
- Build passes.

### Checklist Items Achieved

- Removed Level 1's `level2RangeConfig` runtime dependency and `shootingRange` property.
- Removed Level 1's active `shooting-range` area and `control-room-range-opening`.
- Removed range and connector collision blockers from Level 1.
- Replaced the old east-side range gap with a full Control Room east wall blocker and tightened the Level 1 east movement bound.
- Removed the Level 1-specific `Level1RangeRoom` render path while preserving generic standalone range rendering for `level-2-range`.
- Updated the manual checklist so Level 1 is expected to be hub-only after this phase.

### Completed Implementation

Level 1 now renders as the Control Room/Recording Studio hub without embedded range lanes, targets, or challenge UI. The old east range opening falls back to the existing solid wall visual and has matching collision. The standalone Level 2 range remains available through the registry/direct level path and still uses the generic `ShootingRangePrototype` path.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Type `syncsesh` and verify Level 1 opens as hub only.
- Verify the old range opening is visually resolved.
- Verify Control Room movement lanes remain usable.
- Verify recording studio entry remains usable.

### Risks

- Old collision blockers may leave invisible walls or gaps.
- Old range display assumptions may affect monitor wall scoreboard summaries.
- Existing manual tests mention Level 1 range behavior and need updating.

### Non-Goals

- Do not redesign the shooting range challenge.
- Do not extract the recording studio in this phase.
- Do not add shared level membership.

## V16-3: Add Level 1 Range Door Transition

Status: `[x]` complete.

### Summary

Add an in-world Level 1 door/panel that loads `level-2-range` when the user aims at it and presses `E`.

### Implementation Spec

Expected files:

- `src/3d/levels/level1.ts`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/LevelExitDoor.tsx` only if a reusable visual or label tweak is needed.
- `docs/3d/manual-test-checklist.md`
- `docs/3d/3dvision16-world-cleanup-and-level-doors.md`

Expected work:

- Add or update a Level 1 exit config targeting `level-2-range`.
- Render the door/panel in the hub with the existing `LevelExitDoor` interaction flow where possible.
- Keep the activation input as `E`, through the existing center reticle.
- Ensure clicking the first-person view for focus does not accidentally transition.
- Ensure top-down view disables the door interaction.
- Keep door transitions local-only.

Manager-approved implementation detail:

- In `src/3d/levels/level1.ts`:
  - Add an `exits` array to `level1Config`.
  - Add a `level-1-range-door` exit targeting `level-2-range`.
  - Place it on the sealed east Control Room wall, facing inward toward the player.
  - Use the existing `RANGE` label and a door-sized hit surface.
  - Keep the V16-2 full east wall collision in place; this phase adds a transition target, not a walk-through opening.
- In `src/3d/Level1RoomShell.tsx`:
  - Reuse the existing `exits?.map((exit) => <LevelExitDoor ... />)` path.
  - Do not add custom Level 1 door logic unless the existing exit render cannot handle the placement.
- In docs:
  - Update manual tests for the Level 1 range door now being active.
  - Mark V16-3 completion details after implementation.
- Files to avoid:
  - Do not change `LevelExitDoor.tsx` unless the existing visual/hitbox is insufficient.
  - Do not change `ThreeDModeShell.tsx` transition reset behavior in this phase.
  - Do not add a normal 2D level selector or synced party travel.

Recommended door copy:

```text
RANGE
PRESS E
```

### Acceptance Criteria

- User can enter Level 2 by aiming at the Level 1 range door and pressing `E`.
- User cannot enter by accidental first focus click.
- Door is readable from first-person and top-down.
- No visible normal-app selector or 2D range control appears.
- Build passes.

### Checklist Items Achieved

- Added a Level 1 `level-1-range-door` exit config targeting `level-2-range`.
- Placed the `RANGE` door on the sealed east Control Room wall, facing inward toward the player.
- Reused the existing `LevelExitDoor` render and center-reticle `E` activation path through `Level1RoomShell`.
- Kept the V16-2 full east wall collision intact so the door is a local transition target, not a walk-through opening.
- Updated the manual checklist with Level 1 range-door focus, transition, and return-door checks.

### Completed Implementation

Level 1 now includes a readable east-wall `RANGE` door that loads `level-2-range` through the shared exit interaction flow. The first focus click remains separate from activation because the door still uses the existing reticle/`E` interaction path, and top-down interaction gating remains owned by the shared interaction shell.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Open Level 1 with `syncsesh`.
- Click once to focus movement.
- Aim at the range door and press `E`.
- Verify `data-level-id` becomes `level-2-range`.
- Verify Level 2 range challenge and targets work.
- Press Tab and verify top-down disables door/target interactions.

### Risks

- Door placement can conflict with Control Room props or old opening collision.
- Clickable door hitbox could be too small or too broad.
- If the door uses a shared component, visual copy may need to stay generic for future doors.

### Non-Goals

- Do not create a 2D level picker.
- Do not add a full loading screen.
- Do not sync all users into the range together.

## V16-4: Tighten Level Transition Reset And Spawn Behavior

Status: `[x]` complete.

### Summary

Make level transitions feel reliable after the range is separated.

### Implementation Spec

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/levels/types.ts` only if additional spawn metadata is needed.
- `src/3d/levels/level1.ts`
- `src/3d/levels/level2Range.ts`
- `docs/3d/manual-test-checklist.md`

Expected work:

- Review `handleLevelExit` for transition reset behavior.
- Ensure level change clears local pose and free-roam presence for the previous level.
- Ensure first-person focus returns to idle after transition.
- Ensure top-down/free-cam mode resets.
- Ensure the reveal/spawn uses the new level's intended start position and facing.
- Confirm Level 2 return door brings the player back to the Level 1 hub cleanly.

Manager-approved implementation detail:

- In `src/3d/ThreeDModeShell.tsx`:
  - Add a small helper that exits browser pointer lock when any element is currently locked.
  - Call that helper at the start of `handleLevelExit`.
  - Keep the existing reset sequence for local pose, current area, reveal state, control state, top-down/free-cam state, escape menu, and free-roam presence clearing.
  - Do not redesign reveal rigs or station fallback behavior in this phase.
- In docs:
  - Close V16-4 with the build result and manual checks still recommended.
- Files to avoid:
  - Do not change `LevelExitDoor.tsx`, level configs, session state, sync clients, or normal 2D UI in this phase.

### Acceptance Criteria

- Level 1 to Level 2 transition resets movement focus and camera state.
- Level 2 to Level 1 return resets movement focus and camera state.
- Remote users do not see stale local presence in the prior level after transition.
- Repeated transitions do not trap the user in pointer lock, top-down, or a stale area label.
- Build passes.

### Checklist Items Achieved

- Added explicit pointer-lock release at the start of level transitions.
- Kept the existing local pose, area, reveal, control, top-down/free-cam, menu, and free-roam presence reset path.
- Avoided level config, sync, session, and 2D UI changes.

### Completed Implementation

`handleLevelExit` now exits browser pointer lock before swapping levels. This keeps door-based transitions from leaving the browser in captured-mouse mode while the reveal resets into the next level.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Transition Level 1 to Level 2, then back to Level 1.
- Repeat transitions at least three times.
- Test while pointer lock is active.
- Test while top-down view is active.
- Test after opening and closing the Escape menu.

### Risks

- Reveal camera rigs are currently station-oriented for Level 1 and may feel odd for standalone levels.
- Free-roam presence clearing must not clear unrelated session state.

### Non-Goals

- Do not add synced party travel.
- Do not add new cinematic transition art.

## V16-5: Lazy-Load Hidden 3D Shell

Status: `[x]` complete.

### Summary

Code-split the hidden 3D world so the normal app does not eagerly load the full Three.js world bundle before unlock.

### Implementation Spec

Expected files:

- `src/screens/MainScreen.tsx`
- Possibly `src/App.tsx` if Suspense placement is cleaner there.

Expected work:

- Replace direct `ThreeDModeShell` import with `React.lazy`.
- Consider lazy-loading `RenderingStackSpike` too.
- Add a small hidden-world loading fallback that only appears after the hidden world is requested.
- Preserve all current props and behavior.
- Do not lazy-load normal dashboard panels.

Manager-approved implementation detail:

- In `src/screens/MainScreen.tsx`:
  - Import `lazy` and `Suspense` from React.
  - Replace the direct runtime imports for `ThreeDModeShell` and `RenderingStackSpike` with lazy imports.
  - Use `.then((module) => ({ default: module.NamedExport }))` because both components are named exports.
  - Keep the existing type-only `SoundCloudBoothState` import as type-only.
  - Add a compact loading fallback component rendered only inside the existing conditional branches for `isThreeDModeOpen` and `isRenderingSpikeOpen`.
  - Preserve all existing props and callbacks.
- In docs/changelog:
  - Record the build output and whether Vite emits separate async chunks.
- Files to avoid:
  - Do not move normal dashboard components into lazy chunks.
  - Do not change 3D shell behavior, level configs, sync state, or secret-code logic.

Suggested shape:

```tsx
const ThreeDModeShell = lazy(() => import("../3d/ThreeDModeShell"));
```

If the current component only has a named export, either add a default export wrapper or map the module in the lazy callback.

### Acceptance Criteria

- Normal app loads without eagerly importing the hidden 3D shell.
- Typing `syncsesh` still opens the hidden world.
- Fallback appears only while the hidden world chunk loads.
- `spike3d=1` still works if retained.
- Build passes.
- Vite chunk warning is improved or at least the hidden world moves into a separate async chunk.

### Build And Manual Checks

- `npm.cmd run build`.
- Inspect Vite output for a separate 3D chunk.
- Open normal app and verify dashboard works.
- Type `syncsesh` and verify the hidden world opens.
- Test fallback/error recovery if WebGL is unavailable.

### Checklist Items Achieved

- Replaced eager runtime imports for `ThreeDModeShell` and `RenderingStackSpike` with named-export `React.lazy` loaders in `src/screens/MainScreen.tsx`.
- Kept the SoundCloud booth surface as a type-only import so it does not pull 3D runtime into the normal app shell.
- Added compact Suspense fallbacks that render only after the hidden world or render spike has been requested.
- Preserved the existing hidden-world props, `syncsesh` open path, and `spike3d=1` render-spike path.

### Completed Implementation

- `src/screens/MainScreen.tsx` now imports `Suspense` and `lazy` from React.
- `ThreeDModeShell` lazy-loads from `../3d/ThreeDModeShell` with named export mapping.
- `RenderingStackSpike` lazy-loads from `../3d/RenderingStackSpike` with named export mapping.
- `HiddenWorldLoadingPanel` provides a small overlay while either async 3D chunk is loading.
- Build result: `npm.cmd run build` passed.
- Vite output now emits separate async chunks:
  - `assets/index-BE8mlNd6.js`: 373.69 kB, gzip 113.69 kB.
  - `assets/ThreeDModeShell-8Ze9Qk-0.js`: 373.44 kB, gzip 90.89 kB.
  - `assets/react-three-fiber.esm-BL9oOwol.js`: 867.97 kB, gzip 233.83 kB.
  - `assets/RenderingStackSpike-ByUZjWUv.js`: 1.33 kB, gzip 0.68 kB.
- Remaining warning: Vite still reports a chunk over 500 kB because `react-three-fiber.esm` is now its own large async vendor chunk.

### Risks

- Lazy import can break named export wiring.
- Suspense fallback can briefly cover the normal app if placed too broadly.
- Direct type imports should stay type-only so they do not pull runtime code into the main chunk.

### Non-Goals

- Do not restructure the whole app router.
- Do not add route-based navigation.
- Do not solve all 3D performance issues in this phase.

## V16-6: Prepare Recording Studio For Future Level Extraction

Status: `[hold]` on hold.

### Summary

Start preparing the Recording Studio to become its own level later, without moving it during the V16 range cleanup.

### Future Direction

Potential future work:

- Introduce `level-3-recording-studio`.
- Move recording-studio area geometry out of Level 1.
- Replace the Level 1 west opening with a studio door.
- Keep local DAW/audio state available across levels if the studio becomes standalone.
- Split `Level1RecordingStudioRoom.tsx` into smaller files before or during extraction.

### Non-Goals While On Hold

- Do not move the Recording Studio during the first V16 cleanup.
- Do not split the 9,000-line studio file as part of the range-door phase unless a small extraction directly reduces risk.
- Do not add synced studio room membership.

## Manual Test Plan

Required checks as phases land:

- Normal app loads with no visible 3D controls.
- `syncsesh` opens Level 1 hub.
- Level 1 does not render range lanes or targets after V16-2.
- Level 1 has a readable range door after V16-3.
- Aim at range door and press `E`; verify Level 2 loads.
- Level 2 challenge starts, scores, misses, completes, and submits scoreboard results.
- Level 2 return door returns to Level 1.
- Repeated Level 1/Level 2 transitions remain stable.
- Pointer lock, `Esc`, Escape menu, Tab top-down, movement, jump, slide, reticle, and Exit still work.
- Free-roam presence clears on level change and does not leave duplicate station/free-roam markers.
- Recording Studio still renders and functions in Level 1 until its own extraction vision.
- Jukebox still works in Level 1.
- No normal 2D range selector, level selector, or debug menu appears.
- Build passes with `npm.cmd run build`.

## Risks

- Level 1 collision and wall geometry can become inconsistent when the connected range is removed.
- Manual test docs currently assume some Level 1 range behavior and need pruning.
- The reveal camera may need different behavior for non-station levels.
- Lazy-loading can accidentally pull runtime types or break named exports.
- Door hitboxes must not interfere with shooting, movement focus, or other interactables.

## Non-Goals

- No visible normal-app level selector.
- No synced party travel.
- No new session reducer events.
- No new sync payloads.
- No new shooting mechanics.
- No recording-studio extraction in the first pass.
- No asset pipeline or imported level art.
- No production security model for hidden world unlocks.

## Assumptions

- Level transitions remain local-only for now.
- The shooting range can keep its current challenge logic once loaded as `level-2-range`.
- Level 1 should stay the default hidden-world entry.
- Recording Studio remains connected to Level 1 until a later vision.
- V16 can improve bundle shape through lazy-loading without redesigning the normal app.
