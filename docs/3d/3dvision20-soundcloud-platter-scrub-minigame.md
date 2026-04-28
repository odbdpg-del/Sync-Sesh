# Secret 3D World Vision 20 - SoundCloud Platter Scrub Minigame

## Purpose

Vision 20 turns the SoundCloud deck platters into playable DJ jog wheels.

The user should be able to click and hold a spinning track, stop the automatic visual spin, and manually drag left/right to scrub the song. This should work as a practical seek tool and as a small timing minigame: a floating meter above the disk shows whether the user is moving the platter too slowly, close to target speed, or too fast.

This should feel like touching vinyl, not like another flat UI slider.

## Product Goal

Users can manipulate the track directly from the spinning disk.

Desired behavior:

- Aim at the deck platter.
- Click and hold.
- The platter visually enters `GRAB` mode and stops its automatic spin.
- Drag/look left to scrub backward.
- Drag/look right to scrub forward.
- A small floating meter appears over the platter.
- The center of the meter is the target manual spin rate.
- Moving too slowly pulls the needle left/back.
- Moving too fast pushes the needle right/forward.
- The goal is to keep the needle near center.
- Releasing click exits platter control and returns to normal deck behavior.

## Current Code Facts

Current facts from code review on 2026-04-22:

- The SoundCloud DJ booth is implemented mainly in `src/3d/Level1RecordingStudioRoom.tsx`.
- `StudioSoundCloudSpinningPlatter` currently renders the platter and rotates it automatically with `useFrame` when `deck.display.isPlaying`.
- `StudioSoundCloudDragFader` already registers draggable interactables and maps ray hit points or pointer movement into control values.
- `StudioSoundCloudProgressSeekBar` already registers a draggable timeline rail and calls `deck.seekActions.seekTo(duration * ratio, { playAfterSeek: true })`.
- `useInteractionRegistry()` exposes `activeDragId`, which is already used to highlight grabbed SoundCloud faders.
- The interaction system supports `draggable` targets with `onDragStart`, `onDragMove`, and `onDragEnd`.
- Drag move events include `movementX`, `movementY`, and an optional ray-hit `point`.
- `SoundCloudSeekActions.seekTo(positionMs, options?)` is available per deck.
- `deck.display.playbackPosition`, `deck.display.playbackDuration`, `deck.display.progress`, and `deck.display.isPlaying` are already available in the 3D deck state.
- The SoundCloud widget does not provide true scratch audio or playback-rate control.

## Implementation Prep

Implement this as local-only 3D behavior.

Recommended edited file for V1:

```text
src/3d/Level1RecordingStudioRoom.tsx
```

Optional later files:

```text
src/3d/soundCloudBooth.ts
src/screens/MainScreen.tsx
```

Worker ownership:

- Platter interaction worker: `src/3d/Level1RecordingStudioRoom.tsx` only.
- Manager owns docs, changelog, build verification, and final feel review.

Do not change the SoundCloud hook, sync reducer, session state, or normal 2D SoundCloud panel for V1.

## Interaction Model

Use `movementX` for V1.

Reason:

- Faders and progress bars are linear, so ray-hit rail mapping works well.
- A disk is circular and can be viewed from awkward first-person angles.
- True angular hit-point math is possible later, but V1 will feel better if drag direction directly controls scrub speed.

Suggested model:

```ts
const dragVelocity = movementX * sensitivity;
const needleTarget = clamp(dragVelocity / targetVelocity, -1, 1);
const nextNeedle = lerp(previousNeedle, needleTarget, 0.35);
const seekDeltaMs = dragVelocity * seekScaleMs;
```

While held:

- Auto platter rotation pauses.
- Manual platter rotation uses accumulated drag velocity.
- The track seeks by `seekDeltaMs`.
- The meter needle moves based on drag speed.

## Audio Behavior

V1 should be honest about limitations.

In scope:

- Seek forward/backward while dragging.
- Optionally call `seekTo(..., { playAfterSeek: true })` when the drag is steady enough.
- Keep the target deck playing if it was already playing.
- Resume or keep playback after release according to current deck behavior.

Out of scope:

- True scratch audio.
- Pitch bending.
- Playback-rate changes.
- Reversing audio playback.
- Shared/multiplayer platter state.

Recommended V1 default:

- Use `seekTo(nextPosition, { playAfterSeek: deck.display.isPlaying })` during drag.
- If the user was not already playing, do not force continuous play just from a small scrub.
- If the user holds the needle near center for a short window, a later phase may allow `playAfterSeek: true`.

## Mini-Game Meter

Render a small floating meter above the held platter only.

Suggested visuals:

```text
[ too slow ] [ center target ] [ too fast ]
```

Objects:

- Dark backing rectangle.
- Thin horizontal rail.
- Center target rectangle.
- Needle rectangle.
- Optional small label: `GRAB`, `SCRUB BACK`, `ON BEAT`, `PUSHING`, `OVERSPEED`.

Needle interpretation:

- Far left: user is pulling back or too slow.
- Center: steady target rate.
- Far right: user is pushing too fast.

Suggested color states:

- Back/slow: `#f8d36a`
- Center/on target: SoundCloud deck accent
- Fast/overspeed: `#f64fff`

## Phase Status

Status marker meanings:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed and manager-verified
- `[hold]` intentionally deferred

Only one phase should be `[~]` at a time.

## Phase Plan

- [x] V20-0: Prep Spec And Component Shape.
- [x] V20-1: Platter Draggable Hit Target.
- [x] V20-2: Manual Scrub Seek.
- [x] V20-3: Floating Needle Meter.
- [x] V20-4: Release Behavior And Feel Tuning.
- [ ] V20-5: Manual QA And Closeout.
- [hold] V20-6: True Circular Angular Scrub.
- [hold] V20-7: Playback Rate Or Pitch Bend Engine.

## V20-0: Prep Spec And Component Shape

Status: `[x]` completed and manager-verified.

### Summary

Prepare the platter interaction implementation before code changes.

### Implementation Spec

- Confirm `StudioSoundCloudSpinningPlatter` can own the draggable registration.
- Add a dedicated prop or local state for active platter grab state.
- Keep implementation local to `Level1RecordingStudioRoom.tsx`.
- Reuse `clampNumber`, `useRegisterInteractable`, and current SoundCloud deck data.
- Use per-deck interactable ids:
  - `studio-dj-soundcloud-deck-a-platter-scrub`
  - `studio-dj-soundcloud-deck-b-platter-scrub`

### Acceptance Criteria

- Implementation owner knows the exact file boundary.
- No hook, reducer, session, or 2D panel changes are required for V1.

### Completed Implementation

- Confirmed V1 can stay local to `src/3d/Level1RecordingStudioRoom.tsx`.
- Kept the SoundCloud hook, reducer/session state, and normal 2D SoundCloud panel unchanged.
- Implemented platter behavior inside `StudioSoundCloudSpinningPlatter`.

## V20-1: Platter Draggable Hit Target

Status: `[x]` completed and manager-verified.

### Summary

Make each platter a draggable interactable.

### Implementation Spec

- Register the platter group or a transparent cylinder/box hit area as `draggable`.
- Enable only when the deck widget is ready and the deck has a positive duration.
- On drag start:
  - set local `isGrabbed` state.
  - stop auto visual spin.
  - initialize needle state and drag velocity.
- On drag end:
  - clear local `isGrabbed`.
  - allow normal auto spin to resume.

### Acceptance Criteria

- Holding the platter visually changes it to grabbed mode.
- Auto spin pauses while held.
- Releasing restores normal visual spin behavior.
- Build passes.

### Completed Implementation

- Registered each SoundCloud platter as a draggable interactable using per-deck platter scrub ids.
- Split the platter into a non-rotating outer drag target and an inner spinning platter group.
- Paused auto-spin while the platter is held and restored normal auto-spin on release.

## V20-2: Manual Scrub Seek

Status: `[x]` completed and manager-verified.

### Summary

Convert platter drag movement into SoundCloud seek changes.

### Implementation Spec

- Use `movementX` as the primary scrub input.
- Add a small sensitivity constant near the SoundCloud deck constants.
- Compute `nextPosition = clamp(playbackPosition + movementX * seekScaleMs, 0, playbackDuration)`.
- Call `deck.seekActions.seekTo(nextPosition, { playAfterSeek: deck.display.isPlaying })`.
- Throttle if needed only after live testing shows widget calls are too noisy.

### Acceptance Criteria

- Dragging right seeks forward.
- Dragging left seeks backward.
- Seek clamps at song start/end.
- Releasing stops scrub control.
- Build passes.

### Completed Implementation

- Added movement-based scrub seeking using `movementX`.
- Clamped seek position to the loaded track duration.
- Preserved the deck's prior play state while scrubbing by passing `playAfterSeek` only if the deck was already playing on grab.
- Added conservative movement clamping so quick camera movement can seek fast without sending the track unbounded.

## V20-3: Floating Needle Meter

Status: `[x]` completed and manager-verified.

### Summary

Add the minigame feedback meter above the grabbed platter.

### Implementation Spec

- Render only while the platter is held.
- Place the meter above the disk but low enough not to block the deck readout.
- Needle position is based on recent drag velocity.
- Include center target marker.
- Use color to communicate slow/center/fast.
- Keep all geometry simple boxes to match current DJ booth style.

### Acceptance Criteria

- Meter appears only while holding the platter.
- Needle moves left/right as drag speed changes.
- Center target is visually obvious.
- Build passes.

### Completed Implementation

- Added a small floating rectangular meter above the held platter.
- Added a center target zone, moving needle, and slow/center/fast color states.
- Kept the meter geometry in the non-rotating outer group so it stays readable while the platter spins/scrubs.

## V20-4: Release Behavior And Feel Tuning

Status: `[x]` completed and manager-verified.

### Summary

Tune the scrub feel and release behavior.

### Implementation Spec

- Decide whether release should always resume prior playback state or keep playing after steady center control.
- Tune seek scale, needle smoothing, and center dead zone.
- Ensure the platter does not jitter from tiny mouse movement.
- Keep conservative defaults first.

### Acceptance Criteria

- Scrub feels controllable, not jumpy.
- Small accidental movement does not send the song flying.
- Large movement can still quickly seek through a track.
- Build passes.

### Completed Implementation

- Added a small movement dead zone for tiny pointer jitter.
- Added clamped movement velocity, needle smoothing, and needle decay while held.
- Used conservative V1 behavior: platter scrub seeks the song, but does not force playback if the deck was paused when grabbed.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## V20-5: Manual QA And Closeout

Status: `[ ]` pending user manual QA.

### Summary

Verify the platter scrub feature in first-person and top-down.

### Manual Test Checklist

- Load Deck A and verify its platter spins normally while playing.
- Aim at Deck A platter, hold click, and verify auto spin stops.
- Drag right and verify the song seeks forward.
- Drag left and verify the song seeks backward.
- Release click and verify platter control stops.
- Repeat on Deck B.
- Verify the floating meter appears only while held.
- Verify the meter needle reacts to slow/fast movement.
- Verify progress seek bar, deck trim faders, crossfader, master fader, mute, sync, seek buttons, and cue pads still work.
- Verify top-down view does not break the feature or leave a stuck drag state.
- Verify `npm.cmd run build` passes.

## Hold Phases

### V20-6: True Circular Angular Scrub

Status: `[hold]` intentionally deferred.

Use the ray hit point on the disk, compute angle around the platter center, and convert angular velocity into scrub speed. This may feel more authentic but should wait until V1 is proven.

### V20-7: Playback Rate Or Pitch Bend Engine

Status: `[hold]` intentionally deferred.

True vinyl behavior would need playback-rate, pitch bend, or a separate audio engine. The current SoundCloud widget does not expose that.

## Risks

- Calling SoundCloud `seekTo` too frequently may feel choppy or stress the widget.
- Movement-only scrub may feel less authentic than true circular motion, but it is safer for first-person interaction.
- Pausing visual spin while held must not accidentally pause real audio unless explicitly designed.
- The floating meter may overlap existing deck controls if placed too high or too far forward.

## Non-Goals

- No shared multiplayer platter state.
- No reducer/session changes.
- No normal 2D UI changes.
- No true scratch audio.
- No external audio engine.
