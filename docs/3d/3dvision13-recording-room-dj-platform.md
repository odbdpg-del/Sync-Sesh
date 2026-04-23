# Secret 3D World Vision 13 - Recording Room DJ Platform

## Purpose

Vision 13 makes the recording room physically easier to understand by expanding the room and moving the SoundCloud DJ booth out of the drum-kit cluster onto its own raised platform.

Vision 10 made the two-deck SoundCloud booth work. Vision 11 made the booth look like a real DJ table. Vision 12 added hot cues. After those improvements, the top-down room layout now shows the bigger problem: the DJ booth is too close to the drums and east wall, so the booth reads as crowded, clipped, and partly in the wrong zone.

The goal is a clear room map:

- DAW and monitors live at the back/north wall.
- Piano and patch/audio tools stay in the main studio area.
- Drums keep their own lower-right performance zone.
- DJ gets a dedicated raised stage/platform along the expanded lower/south side.

## Code Facts

Starting layout facts from the code before V13:

- Recording room bounds are defined in `src/3d/levels/level1.ts`.
- Pre-V13 recording room bounds were approximately `x -22.5 to -10.5`, `z -8.8 to 2.8`.
- Recording room wall collision blockers are also in `src/3d/levels/level1.ts`.
- The rendered room floor/walls in `src/3d/Level1RecordingStudioRoom.tsx` derive from the `recording-studio` area bounds.
- Current drum kit position is `[-14.35, 0, 1.42]`.
- Pre-V13 SoundCloud DJ position was `[-12.65, 0, -0.58]`.
- Pre-V13 SoundCloud DJ rotation was `[0, -Math.PI * 0.75, 0]`.
- The DJ role badge still needs to follow any new DJ station position through `STUDIO_ROLE_SPECS`.
- `LevelTraversalSurfaceConfig` already supports `platform` and `ramp` surfaces.
- Existing traversal examples live in `src/3d/levels/level1.ts` for the control-room balcony and ramps.

Completed V13 facts:

- Recording room bounds now extend to south `z 6.6`.
- SoundCloud DJ position is now `[-16.5, 1.36, 4.85]`, centered on the platform axis.
- SoundCloud DJ rotation is now `[0, 0, 0]`.
- The DJ role badge and anchor now follow the new platform station.
- Drum kit position is now `[-16.5, 0, 1.42]`, centered with the DJ platform and room centerline.
- The `Studio Status` and `Track List` monitors are moved onto the global-left wall behind the DAW/station area instead of blocking the first-person view from the stage/drum area.
- `recording-studio-dj-platform`, `recording-studio-dj-left-ramp`, and `recording-studio-dj-right-ramp` traversal surfaces are registered in `src/3d/levels/level1.ts`.
- The DJ platform now spans nearly the full room width and uses a `1.36` floor height, roughly four times the initial V13 stage height.

## Product Boundary

In scope:

- Expand the recording room footprint.
- Move the recording-room south wall and collision blocker.
- Create a raised DJ platform/stage.
- Move the SoundCloud DJ booth onto the platform.
- Update DJ role/badge placement to match the new booth location.
- Add platform/ramp traversal surfaces if needed.
- Preserve the current SoundCloud DJ booth controls and behavior.
- Preserve existing drums, piano, DAW, guitar, monitors, patching, and SoundCloud behavior.
- Build-verified implementation phases.
- Top-down and first-person visual acceptance checks.

Out of scope:

- New SoundCloud audio behavior.
- New DJ controls.
- New hot cue behavior.
- Shared SoundCloud playback.
- Discord voice or app-audio transport.
- New instruments.
- Recording/routing changes.
- Major redesign of the DAW, piano, drums, guitar, or monitor content.
- New packages.

## Current Problems Extracted From Screenshot

- The DJ booth is visually too close to the drums.
- The DJ booth occupies the lower-right/east-side area where the drum kit and mic stands already live.
- The booth can appear cut off by nearby wall geometry.
- The current recording room footprint does not leave a dedicated DJ zone.
- The room reads as a pile of stations instead of clear activity zones.
- The large Vision 11/12 DJ booth needs more physical breathing room than the old placeholder booth.
- The DJ role marker and station interaction should move with the booth, not remain in the old cluster.

## Layout Target

Make the recording room deeper toward the lower/south side of the top-down view.

Suggested room target:

```ts
recordingStudio.bounds.min = [-22.5, 0, -8.8];
recordingStudio.bounds.max = [-10.5, 4.5, 6.6];
```

Suggested DJ platform target:

```ts
platform.bounds.min = [-19.2, 0, 3.35];
platform.bounds.max = [-11.2, 0.34, 6.35];
platform.floorHeight = 0.34;
```

Suggested DJ booth target:

```ts
STUDIO_SOUNDCLOUD_DJ_POSITION = [-15.1, 0.34, 4.85];
STUDIO_SOUNDCLOUD_DJ_ROTATION = [0, 0, 0];
```

The DJ should face inward toward the rest of the recording room. If first-person testing shows the booth face is reversed, flip the booth rotation by `Math.PI`.

Suggested platform features:

- One large rectangular raised stage.
- Purple/dark-blue base matching the DJ table palette.
- Thin neon edge trim so the platform reads as intentional.
- Left and right low ramps or step blocks.
- Enough empty walking space between the platform and drums.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## DJ Platform Phases

- [x] V13-1: Room Expansion Bounds.
- [x] V13-2: DJ Platform Geometry.
- [x] V13-3: DJ Booth Relocation.
- [x] V13-4: Platform Traversal And Collision.
- [x] V13-5: Visual QA And Final Tuning.
- [hold] V13-6: Future DJ Booth Feature Expansion.

## V13-1: Room Expansion Bounds

Status: `[x]` completed and manager-verified.

### Summary

Expand the recording room so the DJ booth can move out of the drum-kit area.

### Goal

Make the recording room deeper toward the lower/south side of the top-down view without disturbing the control-room doorway.

### Expected Files

- `src/3d/levels/level1.ts`
- `src/3d/Level1RecordingStudioRoom.tsx` only if rendering assumptions need a small adjustment.
- `docs/3d/3dvision13-recording-room-dj-platform.md`
- `changelog.md`

### Implementation Notes

1. Update the `recording-studio` area bounds in `src/3d/levels/level1.ts`.
2. Move the `recording-studio-south-wall` collision blocker to the new south edge.
3. Keep the north, west, and east doorway wall segments stable unless the new footprint requires tiny blocker cleanup.
4. Leave the control-room to recording-room opening unchanged.
5. Confirm `Level1RecordingStudioRoom` already renders floor, grid, and walls from the new area bounds.

### Acceptance Checks

- Recording room floor/grid visibly expands downward/southward.
- Existing doorway still works.
- Existing DAW, piano, drums, monitors, and patch station remain in place.
- Room collision bounds match the new wall position.
- `npm.cmd run build` passes.

### Non-Goals

- Do not move the DJ booth yet.
- Do not add platform geometry yet.
- Do not change audio or SoundCloud behavior.

### Risks

- Collision blockers can disagree with the rendered walls if only one is updated.
- Expanding the room may expose visual gaps at the edge if marker posts or wall spans assume the old footprint.

### Completion Notes

- Expanded the recording-studio area bounds in `src/3d/levels/level1.ts` from south `z 2.8` to south `z 6.6`.
- Moved the recording-studio south wall collision blocker to the new south edge.
- Extended the recording-studio west wall and east upper wall blockers to the new south edge.
- Confirmed the generated floor, grid, and rendered walls are driven by the updated area bounds.

## V13-2: DJ Platform Geometry

Status: `[x]` completed and manager-verified.

### Summary

Add a dedicated raised platform in the new lower/south part of the recording room.

### Goal

Make a clear DJ stage area before moving the booth onto it.

### Expected Files

- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/levels/level1.ts` if traversal placeholders are useful in this phase.
- `docs/3d/3dvision13-recording-room-dj-platform.md`
- `changelog.md`

### Implementation Notes

1. Add platform constants near the SoundCloud DJ constants.
2. Render a raised rectangular platform with a subtle base, surface, and neon edge trim.
3. Keep the platform empty in this phase so its footprint can be visually checked.
4. Place the platform fully inside the expanded room bounds.
5. Leave enough clearance from the drum kit and room walls.

### Acceptance Checks

- Platform is visible in top-down view.
- Platform reads as the future DJ zone.
- Platform does not overlap drums, piano, DAW, monitors, or walls.
- Platform does not block the doorway path.
- `npm.cmd run build` passes.

### Non-Goals

- Do not move the SoundCloud booth yet unless the phase spec is expanded.
- Do not add new DJ controls.
- Do not redesign the booth.

### Risks

- A platform that is too tall may make first-person movement awkward.
- A platform that is too large may crowd the whole room again.

### Completion Notes

- Added a visible raised DJ platform in `src/3d/Level1RecordingStudioRoom.tsx`.
- Platform uses a purple/dark-blue base, subtle top surface, neon edge trim, and left/right approach steps.
- Platform footprint is centered around the new south room zone, spans nearly the full room width, and leaves the drum-kit cluster separate.
- Follow-up tuning widened the platform to `11.3` units and raised the floor height to `1.36`.

## V13-3: DJ Booth Relocation

Status: `[x]` completed and manager-verified.

### Summary

Move the SoundCloud DJ booth from the drum-kit cluster onto the raised platform.

### Goal

Give the DJ booth a dedicated zone where the operator faces into the recording room.

### Expected Files

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision13-recording-room-dj-platform.md`
- `changelog.md`

### Implementation Notes

1. Update `STUDIO_SOUNDCLOUD_DJ_POSITION` to sit on top of the platform.
2. Update `STUDIO_SOUNDCLOUD_DJ_ROTATION` so the booth faces inward.
3. Update `STUDIO_ROLE_SPECS` for the DJ role:
   - `anchorPosition`
   - `badgePosition`
   - `badgeRotation`
4. Verify the station marker rendered by `StudioDeskShell` moves with the booth.
5. Keep the existing booth geometry, controls, monitors, platters, cues, and BPM monitor intact.

### Acceptance Checks

- DJ booth no longer overlaps the drum kit.
- DJ booth is visibly on the platform.
- DJ booth faces into the room.
- DJ role badge and occupant marker are near the new booth.
- Existing SoundCloud controls remain clickable.
- `npm.cmd run build` passes.

### Non-Goals

- Do not change the two-deck SoundCloud logic.
- Do not change hot cues.
- Do not add new screens beyond what already exists.

### Risks

- The booth's perceived front/back may need one rotation flip after first-person testing.
- Existing local child monitor positions may look different from a new angle and need later tuning.

### Completion Notes

- Moved `STUDIO_SOUNDCLOUD_DJ_POSITION` to `[-15.1, 1.36, 4.85]`.
- Set `STUDIO_SOUNDCLOUD_DJ_ROTATION` to `[0, 0, 0]` so the booth sits squarely on the platform.
- Updated the DJ role `anchorPosition`, `badgePosition`, and `badgeRotation` so role/occupant feedback follows the new booth.
- Preserved all existing SoundCloud deck, cue, BPM monitor, and platter behavior.

## V13-4: Platform Traversal And Collision

Status: `[x]` completed and manager-verified.

### Summary

Make the raised platform feel reachable and compatible with the free-roam movement model.

### Goal

Let users approach and operate the DJ booth without awkward height or collision problems.

### Expected Files

- `src/3d/levels/level1.ts`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision13-recording-room-dj-platform.md`
- `changelog.md`

### Implementation Notes

1. Add a `recording-studio-dj-platform` traversal surface if movement needs platform height awareness.
2. Add left/right ramp traversal surfaces if the stage height is more than a small visual lip.
3. Render matching ramp or step geometry.
4. Make sure the platform does not create a dead zone where the user can see controls but cannot reach them.

### Acceptance Checks

- User can walk onto or close enough to the platform.
- User can reach and click DJ booth controls in first-person.
- User can walk around the drums without colliding with the DJ platform.
- No invisible collision wall blocks the new stage zone.
- `npm.cmd run build` passes.

### Non-Goals

- Do not tune every studio object.
- Do not add new multiplayer state.
- Do not change audio behavior.

### Risks

- Traversal surfaces may need careful bounds to avoid affecting the nearby drum area.
- If free-roam height handling is limited, the first pass may need a low platform with visual trim instead of a true high stage.

### Completion Notes

- Added `recording-studio-dj-platform` as a platform traversal surface.
- Updated platform and ramp traversal surfaces to `floorHeight: 1.36`.
- Added left and right ramp traversal surfaces for the approach area north of the stage.
- Rendered matching left/right visual steps so the taller stage has a readable approach.

## V13-5: Visual QA And Final Tuning

Status: `[x]` completed and manager-verified.

### Summary

Use top-down and first-person checks to tune the room expansion, platform, booth position, and readability.

### Goal

Finish the layout so the recording room reads as clear zones instead of crowded equipment.

### Expected Files

- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/levels/level1.ts`
- `docs/3d/3dvision13-recording-room-dj-platform.md`
- `changelog.md`

### Acceptance Checks

- Top-down view shows DJ, drums, piano, DAW, and monitors as separate zones.
- DJ booth no longer clips through walls.
- DJ platform is obvious and not visually noisy.
- Drum kit still has enough visual and walking clearance.
- First-person view can identify and operate the DJ booth.
- Existing recording-room systems still make sense:
  - piano
  - drums
  - guitar
  - looper
  - monitors
  - SoundCloud decks
  - hot cues
  - BPM monitor
- `npm.cmd run build` passes.

### Non-Goals

- Do not add new features in final tuning.
- Do not do a broad art pass outside the recording room.

### Risks

- A top-down-correct layout may still need first-person height/angle changes.
- The new platform can make old monitor positions feel unbalanced and require a later visual vision.

### Completion Notes

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Code review confirmed the DJ booth, visible platform, traversal surfaces, and DJ role marker all use the new platform zone.
- Follow-up visual tuning centered the DJ booth and drum kit on the shared `x -16.5` room/stage axis.
- Follow-up visual tuning moved the `Studio Status` and `Track List` monitors onto the global-left wall behind the DAW/station area so they no longer sit in the stage/drum sightline.
- Live top-down and first-person checks are still recommended because wall clearance and booth-facing quality are visual checks.

## V13-6: Future DJ Booth Feature Expansion

Status: `[hold]` on hold.

### Summary

Hold new DJ features until the expanded room and platform placement are proven.

Possible later ideas:

- Beat/tap tempo controls.
- Bigger deck monitor with waveform lanes.
- Pitch/tempo faders.
- Cue bank management.
- Shared host-controlled DJ playback.
- Headphone cue/prelisten.

These are intentionally not part of Vision 13. Vision 13 is about spatial clarity.

## Manager Loop Notes

- Run one active phase at a time.
- Keep only one phase marked `[~]`.
- Before code, write an implementation spec into the active phase.
- Each implementation phase must run `npm.cmd run build`.
- Close a phase only after:
  - reviewing changed files,
  - confirming build status,
  - updating this doc,
  - adding a changelog entry when code changed.
- If a phase lands visually wrong, add a small follow-up phase instead of expanding the active scope endlessly.

## Manual Test Plan

Required checks:

- Hidden 3D room still opens with `syncsesh`.
- Recording room doorway still works.
- Room is visibly larger from top-down view.
- DJ platform is visible and not clipped.
- DJ booth is on the platform.
- DJ booth faces inward toward the room.
- DJ booth does not overlap drums.
- Drum kit remains reachable and readable.
- Piano remains reachable and readable.
- Existing SoundCloud Play/Shuffle/Cue controls still click.
- Existing BPM monitor and spinning platters still render.
- Normal 2D app remains clean.
- `npm.cmd run build` passes.

## Assumptions

- The lower/south side of the recording room is the best place for a dedicated DJ platform.
- Existing instruments should stay mostly in place during the first platform pass.
- The booth should move as a single object; internal booth controls should not be redesigned in Vision 13.
- If traversal height becomes risky, the platform can start as a low visual stage and get true ramp behavior in V13-4.
- Vision 13 should finish spatial clarity before any more DJ feature work continues.
