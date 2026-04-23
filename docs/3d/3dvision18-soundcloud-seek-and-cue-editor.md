# Secret 3D World Vision 18 - SoundCloud DJ Enrichment

## Purpose

Vision 18 turns the SoundCloud DJ table into a richer, more playable DJ instrument.

Users should be able to nudge Deck A or Deck B forward and backward by tiny or large time amounts, then reuse those same seek controls to fine-tune hot cue positions.

The first completed slice is about DJ precision:

- Seek reverse and forward by fixed increments.
- Put the controls in the open table space between the Deck A and Deck B play/shuffle areas.
- Add cue edit mode so selected cue timestamps can be nudged without hunting through the whole track again.
- Keep the behavior local to this browser unless a later shared-DJ transport vision intentionally changes that.

The expanded Vision 18 goal is a full DJ enrichment pass:

- Replace shallow three-option mixer controls with continuous click-and-hold controls.
- Let users grab a fader/slider by holding click, move it with left/right mouse look, and release click to stop.
- Use the same held-control primitive for crossfader first, then trim/master/tempo/EQ/jog-style controls later.
- Keep all controls readable and playable in first-person, not just visible from top-down.

## Product Recommendation

Build DJ enrichment in layers.

The completed precision layer:

The ideal deck controls are:

```text
-30s  -10s  -1s  -0.1s  -0.01s
+0.01s +0.1s +1s  +10s  +30s
```

These should exist per deck, but the 3D layout should use the center table gap:

```text
Deck A play/shuffle      Deck A seek panel    Deck B seek panel      Deck B play/shuffle
```

The top-down screenshot shows two clear open rectangles between the existing Play/Shuffle controls. Use those as the physical seek/editor panels instead of adding clutter around the platters or cue pads.

The next enrichment layer should start with the crossfader because it is already visually represented as a continuous rail but currently behaves like three discrete buttons.

Recommended fader interaction:

```text
Aim at crossfader knob or rail
Hold left click
Move mouse/look left  -> crossfader moves toward Deck A
Move mouse/look right -> crossfader moves toward Deck B
Release left click    -> stop controlling the fader
```

While a slider is grabbed, mouse movement should control the slider and the camera should keep following the user's look. The slider remains latched until release, even if the reticle drifts away from the original rail. Releasing click, pressing Escape, losing pointer lock, or leaving the active 3D world should end the drag safely.

## Why Now

Vision 12 added hot cue slots. The next natural DJ workflow is precision.

Current hot cues are useful for rough jumping:

1. Hit `SET CUE`.
2. Hit `C1-C5`.
3. Later hit the cue to jump back.

But a real cue workflow often needs nudging:

- The cue lands slightly early.
- The cue lands slightly late.
- The user wants to trim a cue by one beat, one second, a tenth, or a frame-like amount.
- The user wants to stay at the table, not drag a waveform.

Vision 18 gives the booth a precision edit bridge first, then grows the DJ table into a set of playable physical controls.

## Code Facts

Initial facts from code review on 2026-04-22:

- `src/hooks/useSoundCloudPlayer.ts` exposes `playbackPosition`, `playbackDuration`, `progress`, and `waveformProgress`.
- `src/hooks/useSoundCloudPlayer.ts` already has a private `seekToPlaybackPosition(nextPosition, options)` helper that clamps against duration, updates `playbackPosition`, calls SoundCloud widget `seekTo(...)`, and can optionally call `play()`.
- `SoundCloudPlayerActions` exposed `seekWaveform(ratio)`, but did not expose `seekBy(...)` or `seekTo(...)`.
- `JukeboxActions` still exposes only `togglePlayback`, `shufflePlay`, `loadTrackByIndex`, and `retry`.
- `src/3d/soundCloudBooth.ts` passes each booth deck a reduced `JukeboxActions` object plus `hotCueState` and `hotCueActions`.
- `SoundCloudHotCueActions` exposed `toggleSetCueMode()` and `triggerCue(cueId)`.
- Hot cue slots store `positionMs`, but the variable represents SoundCloud widget milliseconds, not seconds.
- In normal hot cue mode, `triggerCue(...)` seeks to the stored cue position and plays.
- In set cue mode, `triggerCue(...)` saves the current `playbackPosition` into the chosen cue slot and exits set mode.
- `src/components/SoundCloudPanel.tsx` already uses `actions.seekWaveform` for the 2D waveform click/drag-like seek path.
- `src/3d/Level1RecordingStudioRoom.tsx` already renders Deck A/B Play/Shuffle controls and Deck A/B cue pads through `StudioSoundCloudDjControls`.
- The 3D DJ table has visible open space between the Deck A and Deck B Play/Shuffle button clusters, confirmed by the user's top-down screenshot.
- `src/3d/interactions.tsx` currently supports `clickable`, `shootable`, and `movable` interactable modes.
- `InteractableRegistration` currently exposes `onActivate(...)`, but does not yet expose drag lifecycle callbacks.
- `AimInteractionController` already centralizes pointer down, keyboard `E`, aim hit detection, and pointer shooting.
- `src/3d/ThreeDModeShell.tsx` already has pointer-lock and fallback drag-look handling, so held slider controls must coordinate with camera look.
- The SoundCloud crossfader state already has a continuous value from `-1` to `1` and an `onSetCrossfader(value)` setter.

Implementation result on 2026-04-22:

- `SoundCloudPlayerActions` now includes `seekBy(deltaSeconds)` and `seekTo(positionMs, options?)`.
- The 3D booth deck model receives a separate `seekActions` surface so the broader `JukeboxActions` type stays small.
- Hot cue state now includes `isEditingCue`, `selectedCueId`, and `lastCueEditActionLabel`.
- Hot cue actions now include `toggleEditCueMode()` and `nudgeSelectedCue(deltaSeconds)`.
- 2D Deck A/B cards have a compact seek strip that becomes a cue nudge strip while edit mode is active.
- The 3D SoundCloud table has Deck A and Deck B center seek panels in the open gap marked by the user's screenshot.
- `EDIT CUE` mode exits `SET CUE`; `SET CUE` exits `EDIT CUE`.
- Empty cue pads now quick-save the current playhead time in normal mode.
- 3D cue buttons were moved directly below their matching seek panels so each deck has a vertical seek/cue workflow.
- `src/3d/interactions.tsx` now supports draggable interactables with start/move/end lifecycle callbacks.
- First-person and top-down camera look continue while a 3D draggable control is held; the held control stays latched until release.
- Held faders now prefer rail hit-point mapping: the current aim/cursor ray is projected onto the grabbed fader rail and converted to an absolute value on the track, with movement-delta updates only as a fallback when the rail is temporarily missed.
- The SoundCloud crossfader rail is now a continuous held drag fader.
- Deck A trim, Deck B trim, and master volume now have continuous held drag faders with existing button controls left as fallback.
- The crossfader is now the most player-facing center slider, with master volume moved back into the former crossfader lane.
- Held sliders now sit on thin black backing plates sized to the slider area so each rail reads as physical DJ hardware.
- Top-down DJ cleanup moved the crossfader away from edit/seek overlap, moved A/Mid/B snap buttons one row above it, moved deck readouts behind the platters, enlarged the BPM/deck monitor, and added a second booth status monitor near the DJ OPEN sign.
- SoundCloud BPM display uses `sound.bpm` when the widget provides it; if a loaded track has no BPM metadata, the deck monitor now shows `120 BPM EST` instead of staying blank.
- Build passed with the existing Vite large chunk warning.

## Product Boundary

In scope:

- Local seek forward/reverse actions for each SoundCloud deck.
- Seek increments of `0.01`, `0.1`, `1`, `10`, and `30` seconds.
- 3D Deck A and Deck B seek panels placed in the center table gap.
- Cue edit mode per deck.
- Selecting a cue slot to edit.
- Reusing seek buttons to nudge the selected cue timestamp while edit mode is active.
- Readable 3D status labels for playhead seek vs cue edit mode.
- Empty cue quick-save in normal mode.
- 3D cue panels stacked directly below matching seek panels.
- Reusable held/drag interaction primitive for physical DJ controls.
- Continuous SoundCloud crossfader drag.
- Visual feedback for grabbed slider/fader state.
- Later continuous trim/master controls if the crossfader primitive feels good.
- Build-verified phases.

Out of scope:

- Shared cue state across friends.
- Shared SoundCloud transport.
- Beat grid detection.
- Quantized cue movement.
- BPM-based cue nudging.
- Loop editing.
- Scratching or jog wheel physics.
- Server persistence.
- New packages.

Now explicitly delayed until later:

- Shared DJ authority.
- Beat-matched sync.
- Full waveform scrubbing.
- Real jog wheel inertia/scratch simulation.
- Persistent cue libraries across sessions.

## Interaction Model

### Normal Seek Mode

Each deck seek panel controls that deck's playhead.

- `-30s`, `-10s`, `-1s`, `-0.1s`, `-0.01s`: seek backward by that amount.
- `+0.01s`, `+0.1s`, `+1s`, `+10s`, `+30s`: seek forward by that amount.
- Seek targets clamp between `0` and `playbackDuration`.
- If no track/duration/widget is available, buttons should be disabled or report `LOAD TRACK`.
- If the deck is playing, seek should keep the deck playing.
- If the deck is paused, seek should move the playhead without forcing playback unless the existing SoundCloud widget behavior requires otherwise.

### Cue Edit Mode

Each deck gets an `EDIT CUE` mode separate from the existing `SET CUE` mode.

Recommended flow:

1. User clicks `EDIT CUE` for Deck A or Deck B.
2. The deck shows `SELECT CUE`.
3. User clicks `C1-C5`.
4. If that cue has a valid saved timestamp, it becomes the selected cue.
5. If that cue is empty, create it at the current playhead and select it.
6. Seek buttons now nudge the selected cue timestamp instead of the live playhead.
7. The panel readout shows the selected cue and timestamp, for example `C2 01:14.230`.
8. User clicks `EDIT CUE` again or `DONE` to return to normal seek mode.

Important behavior:

- In cue edit mode, the seek buttons do not need to move the live playhead by default.
- A later optional `PREVIEW` button can jump to the edited cue, but Vision 18 should keep the first pass simple.
- Nudge cue timestamps in milliseconds internally.
- Display cue timestamps with enough precision to make `0.01s` meaningful, ideally `m:ss.xxx` in edit mode.

### Empty Cue Quick Save

Normal mode cue pads should behave like fast DJ memory buttons.

- If a cue is empty and a track is loaded, clicking it saves the current playhead time.
- If a cue is saved for the current track, clicking it jumps and plays.
- If a cue is saved for a different track, it remains protected as stale instead of being overwritten accidentally.
- `SET CUE` still exists for explicit overwrite mode.
- `EDIT CUE` still exists for selecting and nudging a cue timestamp.

### Held Slider / Fader Controls

Held slider controls should make the 3D booth feel tactile.

Interaction:

1. User aims at a slider knob or rail.
2. User holds left click.
3. The active control enters a grabbed state.
4. Horizontal mouse movement updates the slider value.
5. Camera look continues while the control is grabbed.
6. User releases left click.
7. The active control exits grabbed state while normal camera/look behavior continues.

Safety rules:

- Pointer up, pointer cancel, Escape, pointer lock exit, menu open, or world close must end any active slider drag.
- Sliders must clamp to their valid ranges.
- Slider movement should use `movementX` rather than absolute screen position so it works under pointer lock.
- For physical rails, slider movement should prefer ray hit position on the active rail so the knob feels like it is moving on a track. Raw `movementX` should be fallback behavior, not the primary feel.
- Keyboard `E` should remain a discrete activation path; held drag is pointer-only unless a later accessibility pass adds keyboard scrubbing.
- Dragging should not accidentally fire the old A/Mid/B snap buttons.

First target:

- SoundCloud crossfader, range `-1` to `1`.
- Left drag moves toward Deck A.
- Right drag moves toward Deck B.
- The center display should update continuously.

Future targets:

- Deck A/B trim volume.
- Master volume.
- Local DAW crossfader.
- Tempo/BPM nudge slider.
- EQ/filter controls.
- Jog-wheel style seek/scrub.

## State Shape Draft

Suggested additions:

```ts
type SoundCloudSeekStepSeconds = 0.01 | 0.1 | 1 | 10 | 30;

interface SoundCloudSeekActions {
  seekBy: (deltaSeconds: number) => boolean;
  seekTo: (positionMs: number, options?: { playAfterSeek?: boolean }) => boolean;
}
```

Suggested cue edit state:

```ts
interface SoundCloudCueEditState {
  isEditingCue: boolean;
  selectedCueId: SoundCloudHotCueId | null;
  lastCueEditActionLabel: string | null;
}

interface SoundCloudHotCueActions {
  toggleSetCueMode: () => void;
  toggleEditCueMode: () => void;
  triggerCue: (cueId: SoundCloudHotCueId) => void;
  nudgeSelectedCue: (deltaSeconds: number) => void;
}
```

`triggerCue(...)` can remain the main cue pad entry point:

- normal mode: jump/play saved cue
- set mode: save cue at current playhead
- edit mode: select cue for editing, or create/select if empty

Suggested draggable interaction additions:

```ts
type InteractionMode = "clickable" | "shootable" | "movable" | "draggable";

interface DragInteractionDelta {
  movementX: number;
  movementY: number;
}

interface InteractableRegistration {
  onDragStart?: (activation: InteractionActivation) => void;
  onDragMove?: (delta: DragInteractionDelta) => void;
  onDragEnd?: () => void;
}
```

Crossfader action draft:

```ts
interface SoundCloudBoothMixer {
  crossfader: number;
  onSetCrossfader?: (value: number) => void;
}
```

During drag:

```ts
nextCrossfader = clamp(currentCrossfader + movementX * sensitivity, -1, 1);
```

## 3D Layout Direction

Use two compact panels in the center gaps the user marked in the top-down screenshot.

Panel layout:

```text
DECK A SEEK             DECK B SEEK
-30 -10 -1 -.1 -.01    -30 -10 -1 -.1 -.01
+.01 +.1 +1 +10 +30    +.01 +.1 +1 +10 +30
```

When editing:

```text
DECK A EDIT CUE
C2 01:14.230
-30 -10 -1 -.1 -.01
+.01 +.1 +1 +10 +30
```

Recommended visual rules:

- Keep Deck A panel left of the centerline and Deck B panel right of the centerline.
- Use the same neon-green control language as the current Play/Shuffle/Cue controls.
- Make `-` row and `+` row visually distinct through labels and maybe subtle color intensity, not a whole new palette.
- Keep hitboxes clear and slightly larger than the visible buttons.
- Do not overlap current deck monitors, platters, volume controls, or cue pads.
- Add a small status/readout strip above each seek panel.

### Enriched Mixer Layout

The center SoundCloud mixer should move from button-like controls toward physical surfaces.

Current:

```text
[ A ] [ Mid ] [ B ]
```

Target:

```text
A <===========[ knob ]===========> B
Hold click + look/move mouse left/right to slide
```

Recommended visual rules:

- Keep the rail visible and longer than the old three buttons.
- Make the knob large enough to target from first-person.
- When idle, the knob shows current crossfader position.
- When grabbed, the rail and knob glow brighter.
- The center display should say `XFADE GRAB`, `A 42%`, `MID`, or `B 37%` depending on position.
- Keep old A/Mid/B snap buttons only if needed as temporary fallback; final table should prefer the continuous fader.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## Phase Plan

- [x] V18-1: Seek Action Surface And Timing Semantics.
- [x] V18-2: 2D Seek Buttons For Fast Verification.
- [x] V18-3: 3D Center Seek Panels For Deck A And Deck B.
- [x] V18-4: Cue Edit State And Selected Cue Nudge Actions.
- [x] V18-5: Integrate Cue Edit Mode With 2D And 3D Controls.
- [x] V18-6: 3D Readability, Hitbox, And Top-Down Layout Polish.
- [x] V18-7: Empty Cue Quick Save.
- [x] V18-8: Stack 3D Cue Pads Below Seek Panels.
- [x] V18-9: Draggable Interaction Primitive.
- [x] V18-10: Continuous SoundCloud Crossfader.
- [x] V18-11: Crossfader Grab Feedback And Readout.
- [x] V18-12: Convert Deck Trim/Master To Held Sliders.
- [x] V18-13: DJ Control Manual QA And Feel Tuning.
- [handoff] V18-17: Continue BPM detection, mute, and sync planning in `docs/3d/3dvision19-soundcloud-waveform-bpm-and-sync.md`.
- [hold] V18-14: Preview/Audition Button For Edited Cues.
- [hold] V18-15: Shared/Host-Controlled Cue Editing.
- [hold] V18-16: Jog Wheel Scrub/Scratch Prototype.

## V18-1: Seek Action Surface And Timing Semantics

Status: `[x]` completed and manager-verified.

### Summary

Expose reusable per-deck seek actions from `useSoundCloudPlayer`.

### Implementation Spec

Expected files:

- `src/hooks/useSoundCloudPlayer.ts`
- `src/3d/soundCloudBooth.ts`
- Maybe `src/screens/MainScreen.tsx` if the booth state construction needs more action data.

Expected work:

- Add `seekBy(deltaSeconds)` to deck actions.
- Add a public `seekTo(positionMs, options?)` or equivalent if useful.
- Reuse the existing private `seekToPlaybackPosition(...)` implementation.
- Preserve `seekWaveform(ratio)` by routing it through the same helper.
- Clamp all seek targets to `[0, playbackDuration]`.
- Return a boolean or update a feedback label when seeking is unavailable.
- Decide and document whether playhead seek while paused should stay paused.
- Pass seek-capable actions to the 3D booth state without bloating unrelated jukebox use cases.

### Acceptance Criteria

- Deck A and Deck B can seek independently in code.
- Seeking by `-30`, `-10`, `-1`, `-0.1`, `-0.01`, `+0.01`, `+0.1`, `+1`, `+10`, and `+30` seconds is representable.
- Invalid duration/widget states are safe.
- Existing waveform seeking and hot cue jumping still work.
- Build passes.

## V18-2: 2D Seek Buttons For Fast Verification

Status: `[x]` completed and manager-verified.

### Summary

Add simple 2D seek buttons to prove the action behavior before 3D placement work.

### Implementation Spec

Expected files:

- `src/components/SoundCloudPanel.tsx`
- `src/styles/global.css`

Expected work:

- Add a compact per-deck seek strip near the existing waveform or cue strip.
- Use the full set of increments.
- Disable buttons when widget/duration is unavailable.
- Show the current playhead and duration already available in the deck card.
- Keep the UI useful but not overdesigned; this is partly a verification surface.

### Acceptance Criteria

- 2D Deck A and Deck B seek buttons move only their deck.
- Coarse and fine increments are easy to click.
- Seek while playing and paused behaves as documented.
- Build passes.

## V18-3: 3D Center Seek Panels For Deck A And Deck B

Status: `[x]` completed and manager-verified.

### Summary

Place physical seek buttons in the open center spaces on the 3D SoundCloud DJ table.

### Implementation Spec

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- Maybe `src/3d/soundCloudBooth.ts` if types need to change.

Expected work:

- Add two seek panel components or a reusable `StudioSoundCloudSeekPanel`.
- Place Deck A panel in the left red-marked center gap.
- Place Deck B panel in the right red-marked center gap.
- Add 10 clickable seek buttons per deck.
- Add readout strips: `DECK A SEEK`, `DECK B SEEK`, playhead time if readable.
- Use interaction registration so buttons work in first-person and top-down.
- Preserve existing Play/Shuffle/Cue pad controls.

### Acceptance Criteria

- Buttons are visible from top-down.
- Buttons are targetable in first-person.
- Hitboxes do not cover nearby controls.
- Deck A buttons control Deck A only.
- Deck B buttons control Deck B only.
- Build passes.

## V18-4: Cue Edit State And Selected Cue Nudge Actions

Status: `[x]` completed and manager-verified.

### Summary

Add local per-deck cue edit mode and cue timestamp nudge actions.

### Implementation Spec

Expected files:

- `src/hooks/useSoundCloudPlayer.ts`

Expected work:

- Add `isEditingCue`.
- Add `selectedCueId`.
- Add `toggleEditCueMode()`.
- Add `nudgeSelectedCue(deltaSeconds)`.
- Make `triggerCue(cueId)` select or create a cue when edit mode is active.
- Clamp edited cue timestamps to `[0, playbackDuration]`.
- Keep cue editing local to each deck.
- Do not break existing `SET CUE` behavior.
- Define conflict behavior: entering `EDIT CUE` should exit `SET CUE`; entering `SET CUE` should exit `EDIT CUE`.

### Acceptance Criteria

- Cue edit mode is per deck.
- Empty cue selection in edit mode creates a cue at current playhead.
- Saved cue selection in edit mode selects the existing cue.
- Nudge actions update selected cue timestamp without crashing on empty/missing cue.
- Existing normal cue trigger still jumps and plays.
- Existing set cue mode still saves current playhead.
- Build passes.

## V18-5: Integrate Cue Edit Mode With 2D And 3D Controls

Status: `[x]` completed and manager-verified.

### Summary

Wire cue edit mode into the user-facing controls.

### Implementation Spec

Expected files:

- `src/components/SoundCloudPanel.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/styles/global.css`

Expected work:

- Add `EDIT CUE` button per deck in 2D.
- Add `EDIT CUE` button per deck in 3D, likely near the cue pads or seek panel readout.
- In edit mode, seek buttons call `nudgeSelectedCue(...)` instead of playhead seek.
- Cue pads select/create the cue being edited.
- Readouts should show `SELECT CUE`, `C2 01:14.230`, `C2 +0.10`, or similar feedback.
- Make edit mode visually distinct but still consistent with the booth.

### Acceptance Criteria

- User can enter edit cue mode from 2D and 3D.
- User can select a cue slot.
- Seek buttons nudge the selected cue in edit mode.
- Seek buttons return to playhead seek after leaving edit mode.
- Deck A and Deck B edit states stay independent.
- Build passes.

## V18-6: 3D Readability, Hitbox, And Top-Down Layout Polish

Status: `[x]` completed and manager-verified.

### Summary

Make the new controls feel intentional on the physical table.

### Implementation Spec

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- Maybe `docs/3d/manual-test-checklist.md`

Expected work:

- Tune button positions using top-down and first-person views.
- Make sure the seek panels fit inside the open table gaps.
- Keep labels readable without overwhelming the table.
- Keep hitboxes aligned with visible buttons.
- Verify no overlap with Play/Shuffle, cue pads, deck monitors, waveform/readout bars, volume controls, or booth trim.
- Add manual QA notes.

### Acceptance Criteria

- Top-down screenshot shows both seek panels clearly.
- First-person can click each button reliably.
- The user can distinguish normal seek mode from cue edit mode.
- No nearby DJ controls become harder to use.
- Build passes.

## V18-7: Empty Cue Quick Save

Status: `[x]` completed and manager-verified.

### Summary

Make empty cue pads useful in normal mode.

### Implementation Spec

Expected files:

- `src/hooks/useSoundCloudPlayer.ts`

Expected work:

- Change normal `triggerCue(cueId)` behavior for empty cue slots.
- If the cue is empty and the deck has a loaded track/duration, save the current `playbackPosition`.
- Leave stale cue behavior protected.
- Keep explicit `SET CUE` overwrite behavior intact.

### Acceptance Criteria

- Clicking an empty cue saves the current playhead time.
- Clicking a saved valid cue still jumps and plays.
- Clicking a stale cue still reports stale and does not overwrite.
- Build passes.

## V18-8: Stack 3D Cue Pads Below Seek Panels

Status: `[x]` completed and manager-verified.

### Summary

Move the cue buttons directly below their matching seek panels.

### Implementation Spec

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`

Expected work:

- Reposition Deck A cue shelf under Deck A seek panel.
- Reposition Deck B cue shelf under Deck B seek panel.
- Keep the cue button rows readable and clickable.
- Preserve Play/Shuffle, deck volume, platter, and monitor clearances.

### Acceptance Criteria

- The 3D layout reads as a vertical workflow: seek/edit above, cue pads below.
- Deck A cue controls remain separate from Deck B cue controls.
- First-person and top-down targeting remain usable.
- Build passes.

## V18-9: Draggable Interaction Primitive

Status: `[x]` completed and manager-verified.

### Summary

Add reusable held pointer drag support to the 3D interaction registry.

### Implementation Spec

Expected files:

- `src/3d/interactions.tsx`
- `src/3d/ThreeDModeShell.tsx`
- Possibly `src/3d/Level1RecordingStudioRoom.tsx` for the first consumer.

Expected work:

- Add a `draggable` interaction mode.
- Add optional drag lifecycle callbacks to interactable registrations.
- On pointer down, if the aimed active control is draggable, start drag instead of firing a one-shot click.
- On pointer move, send `movementX` and `movementY` to the active dragged registration.
- On pointer up/cancel, call drag end and clear active drag state.
- Coordinate with pointer lock/fallback drag-look so camera movement continues while the active dragged control remains latched.
- Ensure Escape, menu open, pointer lock loss, and component unmount clear any active drag.

### Acceptance Criteria

- A registered draggable object can receive start/move/end callbacks.
- Dragging does not also trigger normal clickable actions.
- Camera look continues while the dragged control keeps receiving movement.
- Releasing click reliably exits drag mode.
- Build passes.

## V18-10: Continuous SoundCloud Crossfader

Status: `[x]` completed and manager-verified.

### Summary

Replace the shallow A/Mid/B crossfader interaction with a continuous held fader.

### Implementation Spec

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- Maybe `src/3d/soundCloudBooth.ts` if mixer action typing needs a drag-oriented helper.

Expected work:

- Add a draggable crossfader knob or rail target.
- Convert horizontal drag delta into crossfader values from `-1` to `1`.
- Use the existing `soundCloudBooth.mixer.onSetCrossfader`.
- Keep the knob position synced with `soundCloudBooth.mixer.crossfader`.
- Keep old A/Mid/B snap controls as temporary fallback only if needed during rollout.

### Acceptance Criteria

- Holding the fader and moving left sends output toward Deck A.
- Holding the fader and moving right sends output toward Deck B.
- Letting go stops changing the crossfader.
- Crossfader value clamps at `-1` and `1`.
- Center/mixer display updates as the value changes.
- Build passes.

## V18-11: Crossfader Grab Feedback And Readout

Status: `[x]` completed and manager-verified.

### Summary

Make held crossfader state obvious to the user.

### Implementation Spec

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- Possibly `src/styles/global.css` if any HTML overlay status is added.

Expected work:

- Add visual grabbed state to the rail and knob.
- Make the center display show a clear active message such as `XFADE GRAB`.
- Show current blend as `A 42%`, `MID`, or `B 37%`.
- Ensure the reticle/active label does not imply a normal click when the fader is draggable.
- Tune visual intensity so the fader reads clearly without drowning out deck readouts.

### Acceptance Criteria

- User can tell when the fader is grabbed.
- User can tell the approximate crossfader value while dragging.
- Releasing the fader returns visuals to idle.
- Build passes.

## V18-12: Convert Deck Trim/Master To Held Sliders

Status: `[x]` completed and manager-verified.

### Summary

Use the proven draggable primitive for other DJ level controls.

### Implementation Spec

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- Maybe `src/3d/soundCloudBooth.ts`
- Maybe `src/screens/MainScreen.tsx`

Expected work:

- Convert Deck A trim from `Vol -` / `Vol +` buttons to a held slider or keep buttons as fallback.
- Convert Deck B trim from `Vol -` / `Vol +` buttons to a held slider or keep buttons as fallback.
- Consider master volume as a center mixer slider.
- Clamp all percent values to `0..100`.
- Preserve existing button-based control until the slider feels good enough to replace it.

### Acceptance Criteria

- Deck trim can be adjusted continuously.
- Master volume can be adjusted continuously if included in the phase.
- Crossfader sits in the player-facing lane so the main performance fader is closest to the standing position.
- Existing output level math remains correct.
- Build passes.

## V18-13: DJ Control Manual QA And Feel Tuning

Status: `[x]` completed and manager-verified.

### Summary

Tune the enriched DJ booth so it feels playable from first-person.

### Implementation Spec

Expected files:

- `docs/3d/manual-test-checklist.md`
- Maybe `src/3d/Level1RecordingStudioRoom.tsx`

Expected work:

- Add manual QA checklist items for held fader behavior.
- Tune fader sensitivity.
- Tune hitbox size and knob/rail dimensions.
- Verify pointer lock and non-pointer-lock fallback.
- Verify first-person, top-down player camera, and top-down freecam behavior.
- Verify drag cleanup on Escape/menu/world close.

### Acceptance Criteria

- Crossfader is comfortable to adjust from first-person.
- User can release a held control reliably.
- Held control does not interfere with movement, cue buttons, or seek buttons.
- Held slider rails have a thin black backing plate that frames the target area without hiding the knob.
- Manual QA notes are updated.
- Build passes if code changes are made.

## V18-14: Preview/Audition Button For Edited Cues

Status: `[hold]` on hold.

### Summary

Add an optional preview action for cue edit mode.

### Reason For Hold

The first pass should prove the edit model before adding another action. Preview behavior may need a product decision: jump the real deck, play briefly, or only update the playhead.

Future options:

- `PREVIEW` jumps to selected cue and plays.
- `AUDITION` jumps to selected cue while preserving prior play/pause state.
- `A/B` compare original cue time vs edited cue time.

## V18-15: Shared/Host-Controlled Cue Editing

Status: `[hold]` on hold.

### Summary

Share cue editing or DJ transport authority across friends.

### Reason For Hold

Current SoundCloud DJ behavior is local-browser audio. Shared cue editing would need a clear host/control model and probably a broader sync review.

Future work:

- Decide whether only host can edit shared cues.
- Decide whether cue timestamps are session state or local profile state.
- Handle late joiners.
- Resolve SoundCloud embed timing differences between clients.

## V18-16: Jog Wheel Scrub/Scratch Prototype

Status: `[hold]` on hold.

### Summary

Explore platter/jog-wheel drag as a future DJ performance control.

### Reason For Hold

The crossfader is the right first draggable control because it has simple continuous state and no audio-engine timing ambiguity. Jog/scratch behavior needs a stronger decision about whether it scrubs the SoundCloud playhead, nudges cue timing, previews audio, or only provides visual performance feedback.

Future work:

- Reuse draggable interaction primitive.
- Drag platter clockwise/counterclockwise to seek by small deltas.
- Decide whether movement is absolute, velocity-based, or beat/BPM aware.
- Avoid promising real scratch audio unless the audio source supports it.

## Manual Test Checklist

- Verify Deck A `+1s` changes Deck A only.
- Verify Deck B `+1s` changes Deck B only.
- Verify `-30s` clamps at `0`.
- Verify `+30s` clamps at track duration.
- Verify `0.01s` and `0.1s` update playhead/cue labels visibly.
- Verify seek while paused does not unexpectedly start playback if the phase chooses paused-preserving behavior.
- Verify seek while playing continues naturally.
- Verify 2D waveform seek still works.
- Verify existing `SET CUE` behavior still works.
- Verify existing cue jump/play behavior still works.
- Verify `EDIT CUE` exits `SET CUE`.
- Verify `SET CUE` exits `EDIT CUE`.
- Verify edit mode + empty cue creates a cue at current playhead.
- Verify edit mode + saved cue selects the saved cue.
- Verify edit mode seek buttons nudge cue time, not playhead.
- Verify leaving edit mode restores normal playhead seek.
- Verify top-down 3D panels fit in the center table gaps.
- Verify first-person clicking works for every new seek button.
- Verify no Play/Shuffle/Cue pad hitboxes are blocked.
- Verify holding the SoundCloud crossfader and moving left sends output toward Deck A.
- Verify holding the SoundCloud crossfader and moving right sends output toward Deck B.
- Verify releasing click stops crossfader movement.
- Verify the center display shows crossfader grab feedback while held.
- Verify camera look continues while a slider/fader is held.
- Verify Escape/pointer lock exit releases any held slider/fader.
- Verify Deck A trim can be adjusted with a held drag.
- Verify Deck B trim can be adjusted with a held drag.
- Verify master volume can be adjusted with a held drag.
- Verify each held slider has a thin black backing plate sized to the slider area.
- Verify the crossfader is closer to the player than master volume and remains reachable without blocking seek, cue, play, or shuffle controls.
- Verify the crossfader, edit buttons, seek buttons, cue pads, and A/Mid/B snap buttons no longer overlap in top-down view.
- Verify Deck A/B readout screens sit on the far side of their platters instead of in front of the disks.
- Verify the BPM/deck monitor is larger and readable.
- Verify loaded SoundCloud tracks without BPM metadata show `120 BPM EST` instead of `BPM --`.
- Verify two small status monitors appear near the DJ OPEN sign area.
- Verify old trim +/- and crossfader snap buttons still work as fallback.

## Open Questions

- Should seek while paused preserve pause, or should all seek buttons behave like cue jumps and play after seek?
- Should cue edit nudges move only the saved cue timestamp, or also jump the playhead for live feedback?
- Should empty cue selection in edit mode create at the current playhead, or require `SET CUE` first?
- Should the 3D panel show milliseconds always, or only while editing a cue?
- Should there be a keyboard shortcut layer for fine cue nudging later?
- Should a future jog wheel reuse the same `seekBy(...)` action?
