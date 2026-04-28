# Secret 3D World Vision 27 - Instant Studio Room Switching

## Purpose

Vision 27 plans a small UX cleanup for the new Control Room <-> Recording Studio level flow.

Right now, switching between those two rooms still uses the general 3D level reveal animation. That reveal works better for "entering the world" than for moving through a nearby interior door. For the Recording Studio, it can feel awkward and over-produced instead of clean and direct.

The goal of this vision is to make the Level 1 `STUDIO` door and the Level 3 `BACK` door behave like a local room transfer:

- no cinematic reveal
- no fly-in animation
- immediate spawn into the destination room
- explicit return placement in front of the matching door

This is a transition-polish vision, not a world-layout vision.

## Product Recommendation

Treat the Control Room <-> Recording Studio path as an interior room switch, not a full level intro.

- Going from Control Room to Recording Studio should instantly place the player inside the studio with no reveal animation.
- Going from Recording Studio back to Control Room should instantly place the player in Level 1 with no reveal animation.
- The return from studio should land the player in front of the Control Room `STUDIO` door, not at the generic Level 1 default spawn.
- Camera facing should be authored for each of those two door transitions so the user is oriented naturally on arrival.
- The existing reveal flow should remain unchanged for normal world entry and for other levels unless we explicitly choose to expand this behavior later.

Recommended player feel:

```text
Control Room -> STUDIO door
  press E
  brief load / state reset
  appear inside studio near studio entry

Recording Studio -> BACK door
  press E
  brief load / state reset
  appear in Level 1 in front of the studio door
```

## Why This Change

The recording studio is now a separate level, but it still behaves like a "new world arrival" instead of a room next door.

That mismatch creates two UX problems:

- entering the studio feels weird because the reveal animation is longer and more theatrical than the spatial move deserves
- returning to Level 1 will feel incorrect if the player appears at the generic Level 1 spawn instead of back at the studio doorway

The hidden world will feel more intentional if nearby room travel is instant while full world entry still uses the reveal sequence.

## Code Facts

Read-only findings from 2026-04-27:

- `src/3d/ThreeDModeShell.tsx` currently forces every level transfer into `setRevealState("revealing")` inside `handleLevelExit(...)`.
- `src/3d/ThreeDModeShell.tsx` computes a `revealRig` for the active level and boots the camera from `revealRig.startPosition`.
- `src/3d/ThreeDModeShell.tsx` only seeds the local player pose after `revealState === "complete"`, using `revealRig.endPosition`.
- `src/3d/levels/types.ts` defines `LevelExitConfig` with `targetLevelId`, `position`, `rotation`, and size data, but no per-exit target spawn or camera target override.
- `src/3d/Level1RoomShell.tsx` activates exits through `onLevelExit(targetLevelId)`, so the transition handler currently receives only the destination level id, not the full exit config.
- `src/3d/levels/level1.ts` defines the Control Room `STUDIO` door, but Level 1 still uses the generic Control Room area spawn as its default arrival point.
- `src/3d/levels/level3RecordingStudio.ts` defines the studio `BACK` door and a studio area spawn/camera target, which is good enough for instant entry into the studio.

## Root Cause

The current transition system assumes:

1. every level change should play the reveal sequence
2. every destination level can rely on its default spawn/camera target

That works for initial world entry and broad level travel, but it is the wrong model for a paired interior doorway where the player expects continuity.

The real missing capability is per-exit arrival control:

- whether to reveal or pop in
- where exactly to place the player in the target level
- where the camera should face after arrival

## Proposed Technical Direction

Make the Level 1 `STUDIO` exit and Level 3 `BACK` exit first-class "instant room switch" exits.

Recommended implementation shape:

1. Expand `LevelExitConfig` to support optional transition metadata.
2. Change the exit activation path so `ThreeDModeShell` receives the full exit config, not just `targetLevelId`.
3. Add optional per-exit destination placement fields:
   - `targetSpawnPosition?: Vec3`
   - `targetCameraTarget?: Vec3`
   - `transitionStyle?: "reveal" | "instant"`
4. In `handleLevelExit(...)`, if the exit uses `transitionStyle: "instant"`, skip the reveal path and seed the player pose directly.
5. Use authored target placement for the Level 3 `BACK` door so the user lands in front of the Control Room studio door.
6. Leave all non-studio exits on the existing reveal model by default.

## Scope Recommendation

Keep this vision intentionally narrow.

In scope:

- instant transition from Control Room to Recording Studio
- instant transition from Recording Studio back to Control Room
- authored return placement in front of the Level 1 studio door
- preserving current reveal behavior for world entry and other levels

Out of scope:

- redesigning the world-entry reveal
- changing shooting-range transition behavior
- adding fade-to-black, teleport VFX, or new loading overlays
- changing studio layout, props, or interactions

## Phase Plan

### V27-1 - Transition Metadata Plumbing

Add optional transition fields to `LevelExitConfig` and pass the full exit config from `Level1RoomShell` into `ThreeDModeShell`.

Acceptance:

- exit activation can carry `transitionStyle`
- exit activation can carry destination spawn/look overrides
- existing exits still compile without changes

Status: Complete on 2026-04-27.

Implementation notes:

- `LevelExitConfig` now supports optional `transitionStyle`, `targetSpawnPosition`, and `targetCameraTarget`.
- `LevelExitDoor` now activates exits by passing the full exit config object.
- `Level1RoomShell` and `ThreeDModeShell` now use the widened exit callback signature.
- Behavior is intentionally unchanged in this phase; all exits still flow through the existing reveal transition until later phases opt specific doors into instant travel.

### V27-2 - Instant Studio Entry

Make the Level 1 `STUDIO` door use `transitionStyle: "instant"` and land directly at the studio entry spawn.

Acceptance:

- Control Room -> Studio no longer plays the reveal animation
- player appears immediately in the studio
- studio orientation feels natural on arrival

Status: Complete on 2026-04-27.

Implementation notes:

- The Level 1 `STUDIO` exit now opts into `transitionStyle: "instant"`.
- `ThreeDModeShell` now respects instant exits by skipping the reveal path and moving directly to `revealState = "complete"`.
- This phase intentionally uses the studio level's existing default area spawn and camera target rather than authored per-exit overrides.

### V27-3 - Authored Control Room Return

Make the Level 3 `BACK` door use `transitionStyle: "instant"` plus explicit target placement in Level 1 near the studio door.

Acceptance:

- Studio -> Control Room no longer plays the reveal animation
- player appears in front of the Level 1 studio door
- camera faces into the room in a sensible way

Status: Complete on 2026-04-27.

Implementation notes:

- The Level 3 `BACK` exit now opts into `transitionStyle: "instant"`.
- The `BACK` exit now authors a specific Level 1 arrival position and camera target so the player lands just inside the Control Room, east of the studio door.
- `ThreeDModeShell` now threads per-exit arrival overrides into the fallback reveal rig, which means both reveal-based and instant stationless arrivals can share one placement model.

### V27-4 - Validation And Cleanup

Verify local pose bootstrapping, area detection, and feedback behavior still work correctly when reveal is skipped.

Acceptance:

- no stuck loading/reveal state
- local controls work immediately after instant transfer
- area detection resolves correctly in both rooms
- other level transitions still use the normal reveal path

Status: Complete on 2026-04-27.

Implementation notes:

- Initial local pose bootstrapping now assigns the active area immediately on arrival instead of waiting for the first movement update.
- One-shot transition arrival overrides are now cleared after they are consumed by the destination level.
- The manual test checklist now includes explicit instant-transfer checks for the Level 1 `STUDIO` door and the Level 3 `BACK` door.

## Implementation Notes

Recommended default behavior:

- `transitionStyle` should default to `"reveal"` so old exits keep working automatically.
- If `targetSpawnPosition` is omitted, fall back to the destination level's normal area spawn or player start.
- If `targetCameraTarget` is omitted, fall back to the destination level's normal area camera target or reveal target.

Recommended Control Room return placement:

- place the player a few steps inside Level 1, just east of the `STUDIO` door
- face the camera into the control room, not directly into the wall

This should be authored from the actual door coordinates in `level1.ts`, not inferred from generic world spawn rules.

## Risks

- Skipping reveal means we must ensure local player pose is initialized immediately instead of waiting for the reveal-complete effect path.
- Area feedback or area-id tracking may briefly misbehave if pose seeding order is wrong.
- If the exit API is widened carelessly, it could affect the shooting-range door path even though behavior should remain unchanged there.

These are manageable risks and small compared with the UX benefit.

## Success Criteria

Vision 27 is successful when:

- entering the Recording Studio feels like stepping into the next room
- returning to the Control Room lands the player back at the studio doorway
- no cinematic reveal plays for those two transitions
- other level entry behavior remains unchanged
