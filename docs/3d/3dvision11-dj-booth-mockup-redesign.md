# Secret 3D World Vision 11 - DJ Booth Mockup Redesign

## Purpose

Vision 11 turns the working Vision 10 SoundCloud DJ booth into the visual target from the user's mockup.

Vision 10 proved the local two-deck SoundCloud flow:

- Deck A and Deck B are independent local SoundCloud widgets.
- Each deck can Play/Pause and Shuffle.
- The local crossfader and master mix this browser's Deck A/B.
- The 3D booth controls map to the real SoundCloud decks.
- The booth tells the truth that SoundCloud audio is local browser audio.

Vision 11 is not an audio feature. It is a physical readability and art-direction pass so the booth looks like a real large DJ table instead of overlapping flat labels.

## North Star

From top-down or first-person, the DJ booth should look like the mockup:

- a large purple DJ table with visible thickness and legs.
- a back-left angled status monitor that reads `DJ / OPEN / READY`.
- a back-center mixer screen.
- a visible fader rail with ticks and a chunky knob.
- small A / MID / B crossfader preset buttons in a tidy row.
- a centered `DJ / PLACEHOLDER` status panel.
- left and right turntable deck stations with large square bases.
- big flat platters with center spindle circles.
- deck-local mini slider strips.
- Deck A/B SoundCloud readout screens attached to each deck.
- Play/Shuffle button pods grouped under each deck.
- `LOCAL SOUNDCLOUD` as a separate front placard, not mixed with controls.

The user should be able to point at each station and understand what it is before clicking anything.

## Product Boundary

In scope:

- 3D DJ booth physical layout.
- 3D visual geometry for deck stations, platters, sliders, buttons, monitors, and placards.
- Readability of in-world canvas labels.
- Hit-target clarity for existing Play/Pause, Shuffle, and A/MID/B crossfader buttons.
- Vision docs and changelog.

Out of scope:

- SoundCloud playback behavior.
- 2D SoundCloud panel behavior or layout.
- mixer math.
- widget URLs.
- shared SoundCloud sync.
- Discord app-audio transport.
- DAW recording.
- new packages.
- session/schema/reducer/server changes.
- beat matching, BPM, cue audio, loops, pitch, or real DJ effects.

## Current Problems Extracted From Screenshot

- Controls still visually overlap because the table reads as one crowded strip.
- Deck A/B readout screens collide with the purple middle band.
- Play/Shuffle buttons sit too close to the truth placard and can feel detached from their decks.
- A/MID/B crossfader controls still sit too close to the center `DJ / PLACEHOLDER` panel.
- The mixer screen floats visually instead of being part of a back mixer station.
- Deck stations do not yet feel like large real turntables with their own bases.
- The table needs stronger edge thickness and support legs so the larger shape feels intentional.
- The booth needs clear physical stations: left deck, center mixer, right deck, front placard.

## Mockup Layout Target

Recommended row layout:

```text
BACK:        [DJ OPEN READY monitor]       [MIXER screen]

UPPER:                    [fader rail + ticks + knob]
                           [A] [MID] [B]

MIDDLE:      [Deck A platter/base] [DJ PLACEHOLDER panel] [Deck B platter/base]

FRONT:       [Deck A readout]      [long lower fader/cue area] [Deck B readout]

EDGE:        [Play] [Shuffle]                              [Play] [Shuffle]

OFF FRONT:                 [LOCAL SOUNDCLOUD placard]
```

Coordinate starting point:

- table shell size: about `[3.2, 0.52, 1.85]`.
- table surface size: about `[3.05, 0.022, 1.75]`.
- Deck A station: about `[-0.95, 0, 0.1]`.
- Deck B station: about `[0.95, 0, 0.1]`.
- deck station base size: about `[0.7, 0.04, 0.62]`.
- back-left monitor: about `[-1.15, 0.98, -0.82]`, angled and standing.
- mixer screen: about `[0, 0.76, -0.72]`, size around `[0.9, 0.22]`.
- upper fader rail: around z `-0.55`.
- A/MID/B preset buttons: z around `-0.38`, x around `[-0.45, 0, 0.45]`.
- center DJ panel: about `[0, 0.735, -0.08]`, size around `[0.95, 0.28]`.
- lower fader rail/cue area: around z `0.36`.
- Deck A/B readouts: local to each deck around z `0.48`.
- Play/Shuffle buttons: local to each deck around z `0.78`.
- `LOCAL SOUNDCLOUD`: about `[0, 0.75, 1.12]`, size around `[1.15, 0.22]`.

These are starting coordinates, not exact lock-in values. The implementation should tune for screenshot readability.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## DJ Mockup Redesign Phases

- [x] V11-1: Table Shell And Station Grid.
- [x] V11-2: Deck Stations And Turntables.
- [x] V11-3: Mixer Rails And Center Controls.
- [x] V11-4: Monitors, Placards, And Final Readability.
- [hold] V11-5: Real Cue/FX Features.

## V11-1: Table Shell And Station Grid

Status: `[x]` completed and manager-verified.

### Summary

Make the DJ booth table big enough and structured enough to support the mockup layout.

### Implementation Spec

Implemented V11-1 as a shell-only massing pass in `src/3d/Level1RecordingStudioRoom.tsx`.

1. Kept the work inside the existing SoundCloud DJ seam.
   - Reused `STUDIO_SOUNDCLOUD_DJ_POSITION`, `STUDIO_SOUNDCLOUD_DJ_ROTATION`, `STUDIO_SOUNDCLOUD_DJ_DESK_SIZE`, `StudioDeskShell`, and `StudioSoundCloudDjControls`.
   - No new prop plumbing or alternate DJ layout was added.

2. Expanded the booth shell and surface.
   - Increased the desk shell and tabletop footprint to a larger mockup-sized proportion.
   - Left all current SoundCloud controls, readouts, and action wiring in place.

3. Added visible shell structure.
   - Added a thicker shell mass under the surface.
   - Added four support legs so the table reads as a real supported object from first person.
   - Used low-contrast purple and dark structural tones so the shell stays supportive, not noisy.

4. Added a named station grid foundation.
   - Added `STUDIO_SOUNDCLOUD_STATION_GRID` for later left/center/right placement work.
   - Added faint guide bands to hint at station zones without implying new interactions.

5. Preserved behavior.
   - No changes to Deck A/B Play/Pause, Shuffle, crossfader callbacks, SoundCloud player state, mixer math, or local-audio truth.
   - No deck station, mixer rail, monitor, or placard redesign was introduced.

### Checklist Items Achieved

- [x] Oversized table shell exists.
- [x] Surface has enough width and depth for three columns and clear rows.
- [x] Table has visible edge thickness/legs.
- [x] Layout constants are grouped and easy to tune.
- [x] Existing SoundCloud behavior is unchanged.
- [x] Build passes.

### Completed Implementation

Expanded the 3D SoundCloud DJ booth into a larger supported table shell with a wider/deeper surface, a thicker under-shell mass, four visible support legs, and faint station-zone guide bands. The new `STUDIO_SOUNDCLOUD_STATION_GRID` constants now name the left, center, and right station zones for later V11 phases without changing any playback, mixer, or interaction behavior.

### Acceptance Criteria

- Top-down view reads as one intentional large DJ table.
- Existing deck, mixer, button, and truth elements have enough space for later station work.
- Neighboring recording-room props remain accessible.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual top-down table size check.
- [ ] Manual first-person table edge/leg check.
- [ ] Manual check that nearby studio props are not blocked.

### Risks

- A bigger table can collide with nearby room props.
- Making the shell too large can make the booth dominate the room.
- Faint guide bands could be mistaken for real controls if future phases add too much contrast.

### Wishlist Mapping

- Supports the mockup's large purple table with visible structure.

### Non-Goals

- No SoundCloud behavior changes.
- No 2D UI changes.
- No new shared/sync behavior.

## V11-2: Deck Stations And Turntables

Status: `[x]` completed and manager-verified.

### Summary

Replace loose deck pieces with left/right deck stations that look like real turntables.

### Implementation Spec

Implemented V11-2 as a deck-station visuals pass in `src/3d/Level1RecordingStudioRoom.tsx`.

1. Kept the work inside the existing SoundCloud DJ booth seam.
   - Reused `StudioSoundCloudDjControls`, `StudioSoundCloudDeckPanel`, `StudioDjControl`, `createStudioSoundCloudReadoutCanvas`, `getSoundCloudDeckAccent`, and the existing SoundCloud layout constants.
   - Added named deck-station constants near the existing `STUDIO_SOUNDCLOUD_*` constants for later tuning.

2. Turned each SoundCloud deck into a clear station.
   - Added a larger square base for Deck A and Deck B.
   - Built each platter as flat layered disks with a visible center spindle circle.
   - Added a compact deck-local mini slider strip with small tick marks.
   - Kept geometry heights separated enough to avoid z-fighting.

3. Attached readouts and controls to the correct deck.
   - Kept the current readout canvas content and truncation behavior.
   - Moved/readjusted readout placement so each readout belongs to its own deck station and no longer visually collides with the center band.
   - Grouped Play/Pause and Shuffle button pods below the matching deck with a subtle pod backer.
   - Preserved the exact existing `deck.actions.togglePlayback` and `deck.actions.shufflePlay` wiring.

4. Left future phases open.
   - Did not redesign the center mixer rail or A/MID/B controls beyond avoiding obvious deck overlap.
   - Did not add the back-left monitor or front truth placard redesign.
   - Kept the center lane clear for V11-3.

5. Required checks.
   - Run `npm.cmd run build`.
   - Report changed files and any manual visual checks that remain unresolved.
   - Manual checks should include top-down deck clarity, first-person readability, Deck A/B Play/Shuffle hit targets, and center-lane clearance.

### Checklist Items Achieved

- [x] Deck A has a large square base.
- [x] Deck B has a large square base.
- [x] Platters are large, flat, layered disks with center spindle circles.
- [x] Each deck has a mini deck-local slider strip with tick marks.
- [x] Deck readouts are attached to each deck and no longer overlap center content.
- [x] Play/Shuffle button pods are grouped under the correct deck.
- [x] Existing Deck A/B actions are unchanged.
- [x] Build passes.

### Completed Implementation

Expanded the SoundCloud booth into two proper deck stations: each side now has a larger square base, a layered platter stack with a centered spindle cap, a mini local slider strip, a deck-attached readout, and a grouped Play/Pause and Shuffle pod below the correct deck. The center lane and existing action wiring were preserved so later mixer-rail work can slot in without fighting the deck massing.

### Acceptance Criteria

- Deck A and Deck B are obvious from top-down and first-person views.
- Play/Shuffle buttons visually belong to their deck.
- Deck readouts do not collide with the center table band or truth placard.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual top-down check: left/right deck station clarity.
- [ ] Manual first-person check: deck labels and buttons are readable.
- [ ] Manual hit-target check: Deck A Play/Shuffle still controls Deck A; Deck B Play/Shuffle still controls Deck B.

### Risks

- Larger deck bases can crowd the center mixer station.
- More geometry can make visual layering harder if z positions are too close.

### Wishlist Mapping

- Matches the mockup's large turntables, deck bases, sliders, deck readouts, and deck-local button pods.

### Non-Goals

- No new cue audio.
- No waveform/track behavior changes.
- No 2D UI changes.
- No SoundCloud playback behavior changes.
- No mixer math changes.
- No sync/session/server/DAW/package changes.

## V11-3: Mixer Rails And Center Controls

Status: `[x]` completed and manager-verified.

### Summary

Make the center mixer area look like a real control section instead of three small floating buttons.

### Implementation Spec

Implemented V11-3 as a center-mixer visuals pass in `src/3d/Level1RecordingStudioRoom.tsx`.

1. Kept the work inside the existing SoundCloud booth seam.
   - Reused `StudioSoundCloudDjControls`, `StudioSoundCloudMixerDisplay`, `StudioDjControl`, `createStudioSoundCloudReadoutCanvas`, and the existing `STUDIO_SOUNDCLOUD_*` layout constants.
   - Added named mixer/rail constants where positions, rail sizes, and tick counts needed tuning.

2. Made the back-center mixer display read as a station.
   - Kept the current `StudioSoundCloudMixerDisplay` text and state logic.
   - Added backing geometry so the screen sits in a clear back-center mixer row instead of feeling like a floating label.

3. Replaced the bare crossfader strip with a clear upper fader rail.
   - Added a visible rail bar.
   - Added small tick marks along the rail.
   - Added a chunky knob that follows the existing `soundCloudBooth.mixer.crossfader` value visually.
   - Did not make the rail draggable and did not change mixer math.

4. Put A/MID/B in a tidy preset row below the rail.
   - Preserved the exact callbacks:
     - A uses `soundCloudBooth.mixer.onSetCrossfader?.(-1)`.
     - MID uses `soundCloudBooth.mixer.onSetCrossfader?.(0)`.
     - B uses `soundCloudBooth.mixer.onSetCrossfader?.(1)`.
   - Spaced the controls as one small center row with clearance from the V11-2 deck stations.

5. Made the center `DJ / PLACEHOLDER` panel readable.
   - Kept the text content stable.
   - Gave it a visible backing/panel zone with breathing room between the upper rail and lower visual structure.
   - Kept it clear of the fader, A/MID/B row, and deck readouts.

6. Added an optional lower fader/cue-area structure.
   - Added only visual support such as a lower rail/shelf backing.
   - Did not imply real cue, FX, or draggable behavior.

7. Required checks.
   - Run `npm.cmd run build`.
   - Report changed files and unresolved manual checks.
   - Manual checks should include top-down mixer clarity, first-person A/MID/B click readability, crossfader readout matching, and clearance against the V11-2 deck stations.

### Checklist Items Achieved

- [x] Mixer screen sits in a clear back-center row.
- [x] Upper fader rail has tick marks and chunky knob.
- [x] A/MID/B preset buttons are in a tidy row below the upper fader.
- [x] Center `DJ / PLACEHOLDER` panel is readable and not covered.
- [x] Optional lower fader rail/cue area exists as visual structure.
- [x] Existing crossfader callbacks are unchanged.
- [x] Build passes.

### Completed Implementation

Expanded the SoundCloud booth center into a proper mixer section with a backed mixer screen, a prominent upper fader rail and knob, a tidy A/MID/B row below it, a readable `DJ / PLACEHOLDER` center panel, and a subtle lower rail/cue shelf. The existing crossfader callback wiring and mixer state display stayed intact.

### Acceptance Criteria

- Center mixer area reads as mixer/fader/controls.
- A/MID/B buttons are easy to identify and click.
- The center `DJ / PLACEHOLDER` panel has breathing room.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual top-down mixer clarity check.
- [ ] Manual first-person A/MID/B click check.
- [ ] Manual check: fader label/mixer readout still match current crossfader/master state.

### Risks

- Decorative rails could be mistaken for interactive controls if not visually separated from actual A/MID/B controls.
- Adding cue buttons as decoration can imply features that do not exist.

### Wishlist Mapping

- Matches the mockup's back-center mixer screen, fader rail, small A/MID/B row, center panel, and lower rail/cue structure.

### Non-Goals

- No continuous draggable in-world fader.
- No real cue/FX features.
- No mixer math changes.
- No deck station redesign beyond avoiding overlap.
- No front truth placard or back-left monitor work.
- No SoundCloud playback behavior changes.
- No 2D UI changes.
- No sync/session/server/DAW/package changes.

## V11-4: Monitors, Placards, And Final Readability

Status: `[x]` completed and manager-verified.

### Summary

Add the final large DJ status monitor, separate truth placard, and polish the whole booth for screenshot readability.

### Implementation Spec

Approved V11-4 scope is a final monitor, placard, and readability pass in `src/3d/Level1RecordingStudioRoom.tsx`.

1. Keep the work inside the existing SoundCloud DJ booth seam.
   - Reuse `StudioSoundCloudDjControls`, `StudioSoundCloudMixerDisplay`, `StudioSoundCloudTruthLabel`, `StudioSoundCloudDeckPanel`, `StudioDjControl`, and `createStudioSoundCloudReadoutCanvas`.
   - Add named constants for the final monitor and detached placard placement when useful.

2. Add the back-left angled DJ status monitor.
   - Add a backed monitor element inside the SoundCloud booth group.
   - It should clearly read:
     - `DJ`
     - `OPEN`
     - `READY`
   - Angle it toward the booth like the mockup so it reads as a physical monitor, not a floating label.
   - Keep it visually separate from the back-center mixer screen.

3. Detach the `LOCAL SOUNDCLOUD` truth placard from the controls.
   - Move the truth placard farther forward so it reads as a separate front-center placard.
   - Keep the copy concise and honest:
     - `LOCAL SOUNDCLOUD`
     - `THIS BROWSER MIX ONLY`
     - `FRIENDS NEED OWN APP AUDIO`
   - Do not imply Discord voice transport or shared SoundCloud sync.

4. Improve final label readability.
   - Reuse existing canvas readout helpers unless a small purpose-specific helper is needed for the DJ status monitor.
   - Tune sizes, opacity, line spacing, and backing geometry so monitor and placard labels fit without crowding deck/mixer readouts.
   - Keep deck readout content and action control labels stable unless a tiny readability tweak is needed.

5. Polish final mockup direction.
   - Tune monitor/placard backing tones and accent colors to match the purple table and green/blue readout style from the mockup.
   - Avoid redesigning the V11-2 deck stations or V11-3 mixer section except for small spacing/readability nudges.

6. Preserve behavior.
   - No SoundCloud playback changes.
   - No mixer math or crossfader logic changes.
   - No real cue/FX behavior.
   - No sync/session/server/DAW/package changes.
   - No 2D UI changes.
   - Keep V11-5 on hold.

7. Required checks.
   - Run `npm.cmd run build`.
   - Report changed files and unresolved manual checks.
   - Manual checks should include top-down screenshot comparison, first-person monitor/placard readability, deck/mixer/readout overlap, and Deck A/B plus A/MID/B interaction sanity.

### Checklist Items Achieved

- [x] Back-left angled monitor reads `DJ / OPEN / READY`.
- [x] `LOCAL SOUNDCLOUD` placard is front-center and detached from controls.
- [x] Canvas labels fit and remain readable.
- [x] Table colors/readouts match the mockup direction.
- [x] Final manual checklist is updated.
- [x] Build passes.

### Completed Implementation

Added a back-left angled status monitor with a backed display that reads `DJ / OPEN / READY`, and turned the truth readout into a detached front-center `LOCAL SOUNDCLOUD` placard with its own backing. The monitor and placard now carry the final readability polish for the booth while preserving the existing deck and mixer behavior.

### Acceptance Criteria

- Top-down screenshot resembles the mockup's composition.
- User can identify booth purpose, deck stations, mixer station, and local-audio truth.
- No in-world text implies Discord voice transport or shared SoundCloud sync.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual top-down screenshot comparison.
- [ ] Manual first-person readability check.
- [ ] Manual interaction check for Deck A/B Play/Shuffle and A/MID/B.
- [ ] Manual check that normal 2D app remains clean.

### Risks

- Too much decorative status text can make the booth look more functional than it is.
- The back-left monitor may collide with walls or other room elements if angled too aggressively.

### Wishlist Mapping

- Matches the mockup's `DJ OPEN READY` monitor and detached front `LOCAL SOUNDCLOUD` placard.

### Non-Goals

- No shared SoundCloud sync.
- No real Discord audio transport.
- No DAW recording changes.
- No SoundCloud playback behavior changes.
- No mixer math changes.
- No deck station or mixer redesign beyond minor spacing/readability tuning.
- No real cue/FX features.
- No draggable fader.
- No sync/session/server/package changes.
- No 2D UI changes.

## V11-5: Real Cue/FX Features

Status: `[hold]` on hold.

### Summary

Future-only phase for real DJ features suggested by the mockup.

Possible future ideas:

- real cue buttons.
- draggable in-world crossfader.
- per-deck low/mid/high filter controls.
- tempo/pitch controls.
- loop/cue points.
- shared host-controlled deck transport.

### Hold Reason

Do not build real DJ feature behavior until the visual booth is readable and friend-tested.

## Vision 11 Completion Notes

All non-hold Vision 11 phases are complete and manager-verified:

- [x] V11-1 expanded the table shell and station grid.
- [x] V11-2 built the left/right deck stations and turntables.
- [x] V11-3 built the center mixer rails and controls.
- [x] V11-4 added the final DJ status monitor, detached local SoundCloud placard, and readability polish.
- [hold] V11-5 remains intentionally delayed for future real cue/FX behavior.

Final live visual checks remain manual because they require opening the 3D room and comparing the booth from top-down and first-person camera angles.

## Manager Loop Plan

Use this doc as the active roadmap for mockup-driven DJ booth layout work and `docs/Agents/agent.md` as the operating loop.

Loop rules:

- Keep only one phase marked `[~]`.
- Before implementation, require a worker preparation spec covering expected files, files to avoid, reused helpers, acceptance checks, risks, and non-goals.
- Do not implement a phase until the approved spec is written into that phase section.
- Every implementation phase runs `npm.cmd run build`.
- Close a phase only after manager review, build confirmation, doc updates, and changelog entry when code changed.
- Push only when the user explicitly says `push update`.

Recommended order:

1. V11-1 makes the table shell big enough.
2. V11-2 makes the deck stations look real.
3. V11-3 makes the mixer controls read clearly.
4. V11-4 adds final monitor/placard polish.
5. V11-5 remains on hold until visual readability is proven.

## Test Plan

Every implementation phase:

- run `npm.cmd run build`.
- confirm hidden 3D room still opens with `syncsesh`.
- confirm normal 2D app remains clean.
- confirm existing SoundCloud Deck A/B behavior is unchanged.
- confirm existing guitar, piano, drums, looper, timeline, monitors, and shared transport are not regressed.

DJ-specific manual checks:

- Deck A Play/Pause still controls Deck A.
- Deck A Shuffle still controls Deck A.
- Deck B Play/Pause still controls Deck B.
- Deck B Shuffle still controls Deck B.
- A/MID/B buttons still update the same local crossfader state.
- Top-down screenshot has no major overlap.
- First-person view can identify and click the main controls.
- `LOCAL SOUNDCLOUD` truth remains readable and does not imply Discord voice/app-audio transport.

## Assumptions

- Vision 10 remains the completed working two-deck SoundCloud mixer.
- Vision 11 owns only mockup-driven 3D physical redesign unless the manager explicitly revises scope.
- Current audio/control behavior is good enough and should be preserved.
- Any real cue/FX/DJ behavior belongs to V11-5 or a later vision, not the visual redesign phases.
