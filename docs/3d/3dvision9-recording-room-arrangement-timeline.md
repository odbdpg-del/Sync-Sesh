# Secret 3D World Vision 9 - Recording Room Arrangement Timeline

## Purpose

Vision 9 adds an Ableton-style Arrangement Timeline monitor to the Recording Studio.

Vision 8 made the room more truthful: status, sequence/session view, mixer view, and patch/signal view. But friend testing still needs one bigger mental model: where the music exists over time.

The current room can answer:

- what is live.
- what is recorded.
- what is muted.
- what is patched.
- what is shared.

The timeline should answer:

- what is the song.
- where are the guitar, piano, drum, FM synth, and looper parts.
- what bar is playing now.
- whether the shared transport is actually moving the arrangement.
- why a friend still might not hear the arrangement.

## North Star

A friend should look at one big monitor and understand the song shape.

Target feeling:

- they see bars left-to-right.
- they see instrument lanes top-to-bottom.
- they see blocks where clips or recorded notes exist.
- they see a playhead showing the current bar/beat.
- they can tell whether the timeline is local, shared, playing, stopped, or silent.
- they understand live playing is different from recorded/shared arrangement playback.

The monitor should make the Recording Studio feel less like scattered buttons and more like a small DAW room.

## Product Boundary

In scope:

- one large in-world Arrangement Timeline monitor.
- horizontal time axis with bars/beats.
- instrument lanes for current room sources.
- visual blocks for recorded/shared clips and note material.
- playhead derived from existing local/shared transport.
- clear labels for guitar material recorded into FM Synth until a dedicated guitar lane exists.
- simple friend-audio status line: friends need their own ENGINE for app-generated/shared audio.
- readability from first-person, desk, guitar area, and top-down/free-cam views.

Out of scope:

- full DAW editing on the timeline.
- drag/drop timeline editing.
- new audio engine behavior.
- new recording format.
- raw microphone or Discord audio streaming.
- new sync events unless a later phase explicitly designs shared arrangement state.
- replacing the existing Sequence View monitor.
- replacing the shared transport station.
- normal 2D dashboard UI.

## Manager Read

The room now has a lot of correct state, but not enough musical narrative. Ableton users understand arrangements because they can see time. Vision 9 should add that missing "song map" without making the room more complicated to operate.

Do not build a second DAW editor. Build a readable wall monitor that turns existing clips, notes, transport, and guitar recording state into a left-to-right timeline. The timeline can be approximate at first. Trust and clarity matter more than precision.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## Timeline Phases

- [x] V9-1: Arrangement Timeline Monitor.
- [x] V9-2: Timeline Playhead And Transport Truth.
- [x] V9-3: Instrument Lane Labels And Source Blocks.
- [x] V9-4: Friend Playback Guidance.
- [x] V9-5: Timeline Layout And Readability Pass.
- [hold] V9-6: Shared Arrangement Editing.

## Wishlist Mapping

- "In Ableton we have the timeline view" -> V9-1 wide arrangement monitor with bars across and lanes down.
- "See how we lay out the clips" -> V9-1 and V9-3 clip/note blocks on lanes.
- "See all the instruments" -> V9-3 lanes for guitar, piano, drums, FM synth, and looper.
- "Friends still cannot figure out how to use it" -> V9-2 and V9-4 make playhead, shared play, ENGINE, and local/live/shared differences visible.

## V9-1: Arrangement Timeline Monitor

Status: `[x]` completed and manager-verified.

### Goal

Add one large in-world Arrangement Timeline monitor that shows bars left-to-right and instrument lanes top-to-bottom.

Suggested first monitor:

```text
BAR    1     2     3     4     5     6     7     8
GTR   [GTR REC FM S1............]
PIANO [empty]
DRUM  [KICK/SNARE LOOP..........]
FM    [FM CLIP S1...............]
LOOP  [S1 4 BAR LOOP............]
```

### Implementation Spec

Approved manager scope:

- Add one read-only in-world Arrangement Timeline monitor to the Recording Studio.
- Derive the monitor from existing local DAW state only.
- Show bars left-to-right and lanes top-to-bottom.
- Show basic clip/note blocks derived from `LocalDawState.clips` and `LocalDawState.midiNotes`.
- Label FM Synth blocks that contain `source === "guitar-live"` notes with `GTR` or equivalent honest guitar wording.
- Keep block placement approximate because the current state model is scene-centric, not arrangement-centric.
- Reuse the existing overview-screen canvas system instead of creating a separate rendering path.
- Avoid playhead/transport truth, friend guidance copy, session/shared events, shared arrangement state, audio behavior changes, drag/drop timeline editing, and 2D UI.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision9-recording-room-arrangement-timeline.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/types/session.ts`
- `src/lib/daw/sharedDaw.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- transport, shared-clip, mixer, patch/signal, and sound-activity behavior changes.
- any 2D app route or dashboard file.

Existing helpers and state to reuse:

- `LocalDawState`, `LocalDawTrack`, `LocalDawClip`, `LocalDawMidiNoteEvent`, `DawClipState`, `DawTrackId`, and `LocalDawTransport`.
- existing fixed local DAW track/scene model: five tracks and four scene slots.
- `StudioOverviewScreenKind`, `StudioOverviewScreenSpec`, `StudioOverviewScreen`, `getStudioOverviewScreenCanvasSize`, and `createStudioOverviewScreenCanvas`.
- `createStudioSequenceMonitor` as the closest existing note-density and guitar-label derivation pattern.
- `getSequenceClipStateLabel` for compact block-state labels.
- the existing `overviewScreens` placement block.

Implementation shape:

- Keep code changes inside `Level1RecordingStudioRoom.tsx`.
- Add a new overview-screen kind such as `arrangement-grid`.
- Add a derived helper such as `createStudioArrangementTimelineMonitor(localDawState?)`.
- Extend canvas sizing and rendering with one new arrangement branch.
- Render a first-pass fixed bar ruler, likely bars 1-8.
- Render lane labels from `localDawState.tracks`.
- Render clip blocks using clip state, clip length, scene order, and note density.
- Use state colors consistent with the existing Sequence View.
- Mount one large timeline screen into the existing `overviewScreens` array.

### Checklist Items Achieved

- [x] Added one large Arrangement Timeline monitor.
- [x] Added bar labels across the top.
- [x] Added lanes for current studio sources.
- [x] Added basic clip/note blocks from existing local DAW state.
- [x] Build passed.

### Completed Implementation

Added a read-only `ARRANGEMENT TIMELINE` overview monitor. It renders an approximate 8-bar song map from existing local DAW tracks, clips, and MIDI notes, with lanes top-to-bottom, bars left-to-right, clip blocks, note-density markers, and honest `GTR IN FM` labeling for FM Synth clips that contain guitar-sourced notes.

### Acceptance Criteria

- A large timeline monitor is visible in the Recording Studio.
- The monitor has time/bars left-to-right.
- The monitor has clear instrument/source lanes.
- Existing Sequence View, Mixer View, Patch / Signal, guitar, piano, drums, looper, and shared transport remain usable.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person readability check from entry and DAW desk.
- [ ] Manual guitar-area readability check.
- [ ] Manual top-down/free-cam readability check.
- [ ] Manual overlap check against existing monitors and controls.

### Risks

- A timeline can become too dense if every note is shown literally.
- If the monitor looks editable but is read-only, users may expect drag/drop editing.
- Guitar material currently records into the FM Synth flow, so labeling must be honest.

### Non-Goals

- No timeline editing.
- No new recording format.
- No new shared state.
- No audio behavior changes.
- No 2D UI.

## V9-2: Timeline Playhead And Transport Truth

Status: `[x]` completed and manager-verified.

### Goal

Add a visible playhead and transport truth to the timeline monitor.

The user should be able to tell:

- shared transport is playing or stopped.
- local DAW transport is playing or stopped.
- current bar/beat.
- whether the arrangement is moving.
- whether playback is shared or local-only.

### Implementation Spec

Approved manager scope:

- Add a visible playhead to the existing `arrangement-grid` monitor.
- Add compact local/shared transport truth to the Arrangement Timeline monitor.
- Show current bar/beat, transport scope, and transport state.
- Keep the monitor read-only, 3D-only, and non-destructive.
- Use existing local DAW transport and shared transport props already available in the room.
- Derive displayed bar/beat from the already-applied local transport snapshot instead of adding new sync-time math.
- Keep stopped state visibly non-moving and lower-energy.
- Avoid new transport controls, new play/stop actions, session/shared event additions, transport schema changes, audio engine changes, drag/scrub/timeline editing, friend guidance copy, source-label expansion beyond transport truth, and 2D UI.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision9-recording-room-arrangement-timeline.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- any 2D route or dashboard file.

Existing helpers and state to reuse:

- `LocalDawState.transport`: `state`, `bpm`, `timeSignature`, `bar`, and `beat`.
- `SharedDawTransport`: `state`, `bpm`, `anchorBar`, `anchorBeat`, `startedAt`, `stoppedAt`, and `revision`.
- existing local-versus-shared transport wording patterns in `StudioTransportControls`.
- `createStudioArrangementTimelineMonitor`.
- `StudioArrangementTimelineSpec`.
- existing `arrangement-grid` branch in `createStudioOverviewScreenCanvas`.
- `getSequenceClipStateLabel` and `getClipStateColors`.

Implementation shape:

- Keep code changes inside `Level1RecordingStudioRoom.tsx`.
- Extend the arrangement timeline spec with a small transport truth payload.
- Let `createStudioArrangementTimelineMonitor` accept `sharedDawTransport?: SharedDawTransport`.
- Derive scope as `SHARED` when shared transport is present, otherwise `LOCAL`.
- Use the local DAW transport's bar/beat for playhead position because shared snapshots already flow into local state.
- Render a slim vertical playhead line in the existing timeline grid.
- Render a compact chip/readout such as `SHARED PLAY BAR 03.2` or `LOCAL STOP BAR 01.1`.
- Keep blocks, source labels, and note-density rendering unchanged except where playhead clearance is needed.

### Checklist Items Achieved

- [x] Added a visible playhead.
- [x] Added bar/beat readout.
- [x] Added shared/local transport state.
- [x] Added stopped/playing visual distinction.
- [x] Build passed.

### Completed Implementation

Extended the Arrangement Timeline monitor with a compact transport truth payload derived from existing local DAW transport and optional shared transport state. The monitor now draws a slim playhead across the 8-bar map, shows local and shared play/stop state, displays bar/beat readouts, and uses a lower-energy stopped-state playhead so it does not imply motion when transport is stopped.

### Acceptance Criteria

- Playhead position updates from existing transport state.
- Transport state is readable without looking at the transport station.
- Local-only versus shared transport state is not ambiguous.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual check with transport stopped.
- [ ] Manual check with local transport playing.
- [ ] Manual check with shared transport playing.
- [ ] Manual top-down/free-cam playhead readability check.

### Risks

- Shared and local transport states can be confusing if shown as one truth.
- A moving playhead may appear broken if the underlying transport is stopped.
- Too much animation may distract from the timeline blocks.

### Non-Goals

- No new transport controls.
- No changes to shared transport behavior.
- No timeline scrubbing.

## V9-3: Instrument Lane Labels And Source Blocks

Status: `[x]` completed and manager-verified.

### Goal

Make the timeline lanes and blocks explain the room sources in friend language.

Suggested lanes:

- Guitar.
- Piano.
- Drums.
- FM Synth.
- Looper.

Suggested block labels:

- `GTR LIVE`.
- `GTR REC FM S1`.
- `PIANO NOTES`.
- `DRUM LOOP`.
- `FM CLIP`.
- `LOOPER 4 BAR`.

### Implementation Spec

Approved manager scope:

- Keep V9-3 entirely display-derived inside the existing Arrangement Timeline monitor.
- Make lane labels and block labels friend-readable using only existing local DAW data.
- Use the five current real DAW lanes from code: drums, bass, FM Synth, piano, and looper.
- Do not invent a dedicated guitar lane. Guitar is currently only truthful when notes carry `source === "guitar-live"` inside the FM Synth flow.
- Label FM Synth clips with guitar-sourced notes as guitar material inside FM Synth, such as `GTR IN FM`, `GTR REC FM`, or similarly honest wording.
- Use source labels from existing note metadata where available: `piano-live`, `guitar-live`, and `shared-import`.
- Keep V9-2 transport truth and playhead behavior intact.
- Avoid friend playback guidance, layout repositioning, shared arrangement state, audio engine behavior, new sync/session events, transport logic, new recording metadata, and 2D UI.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision9-recording-room-arrangement-timeline.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/types/session.ts`
- `src/lib/daw/sharedDaw.ts`
- `src/lib/lobby/sessionState.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- audio-engine files, sync-event files, and any 2D dashboard or route files.

Existing helpers and state to reuse:

- `createStudioArrangementTimelineMonitor`.
- the existing `arrangement-grid` branch in `createStudioOverviewScreenCanvas`.
- `getSequenceClipStateLabel`.
- `LocalDawState.tracks`, `LocalDawState.clips`, `LocalDawState.midiNotes`, and `LocalDawState.transport`.
- `LocalDawTrack.id`, `label`, and `color`.
- `LocalDawClip.trackId`, `sceneIndex`, `label`, `state`, and `lengthBars`.
- `LocalDawMidiNoteEvent.source`.
- the current five-track model from `TRACK_DEFINITIONS` in `useLocalDawState.ts`.

Implementation shape:

- Add small derived-label helpers near `createStudioArrangementTimelineMonitor` to translate current track, clip, and note data into friend-facing source language.
- Keep the arrangement timeline's real lane order based on existing tracks.
- Improve block labels so they communicate source and state instead of relying on raw generated clip labels.
- Add compact source subtitles or badges inside the existing block rendering where space allows.
- Update arrangement summary lines to mention source truth without removing the V9-2 local/shared transport lines.
- Keep the timeline read-only and non-interactive.

### Checklist Items Achieved

- [x] Added friend-readable lane labels.
- [x] Added source-specific block labels.
- [x] Labeled guitar-recorded FM Synth material honestly.
- [x] Differentiated live, recorded, shared, and empty sources.
- [x] Build passed.

### Completed Implementation

Added display-only source label helpers for the Arrangement Timeline. Lanes now describe what they are for, even when empty, and blocks use friend-readable source labels such as `DRUM LOOP S01`, `BASS LINE S01`, `FM CLIP S01`, `PIANO NOTES S01`, and `LOOPER 4 BAR S01`. FM Synth clips containing guitar-sourced notes remain honestly labeled as `GTR IN FM` or `GTR REC FM` instead of implying a dedicated guitar track exists.

### Acceptance Criteria

- Friends can tell which instrument created a visible block.
- Guitar material recorded into FM Synth is labeled as guitar material in FM Synth, not as a separate synced guitar track unless one exists.
- Empty lanes are still understandable.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual check after recording guitar.
- [ ] Manual check after playing piano/drums.
- [ ] Manual check with empty lanes.
- [ ] Manual readability check from normal room angles.

### Risks

- Source labels may overpromise if the data only gives track/clip state.
- Guitar and FM Synth wording can confuse users unless carefully separated.
- Too many labels can make the timeline harder to read.

### Non-Goals

- No dedicated guitar track unless a later phase intentionally adds one.
- No new instrument routing.
- No new recording source metadata unless explicitly approved.

## V9-4: Friend Playback Guidance

Status: `[x]` completed and manager-verified.

### Goal

Add one compact guidance line to the timeline so friends understand how to hear the arrangement.

Target lines:

- `FRIENDS HEAR SHARED PLAY WITH ENGINE ON`
- `LOCAL LIVE: YOU HEAR THIS BROWSER`
- `SHARED PLAY STOPPED`
- `ENGINE OFF: SILENT HERE`
- `DISCORD DOES NOT STREAM APP AUDIO`

### Implementation Spec

Approved manager scope:

- Add one compact, state-aware friend guidance line to the existing Arrangement Timeline monitor.
- Explain that app-generated/shared playback is heard per browser only when that browser's `ENGINE` is on and audible.
- Explain that local live playing is local to the current browser.
- Keep Discord wording honest: Discord voice is not app-audio transport and does not stream raw app audio.
- Reuse the existing monitor lines returned by `createStudioArrangementTimelineMonitor` instead of adding a new monitor or resizing the screen.
- Thread existing local audio state into the arrangement monitor helper if needed.
- Keep source blocks, playhead, transport truth, and layout behavior intact.
- Avoid audio behavior changes, sync/session/schema changes, shared arrangement editing, layout repositioning, and 2D UI.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision9-recording-room-arrangement-timeline.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawAudioEngine.ts`
- `src/3d/useLocalDawState.ts`
- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- `src/lib/daw/sharedDaw.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- any 2D dashboard or route files.

Existing helpers and state to reuse:

- `createStudioArrangementTimelineMonitor`.
- `formatArrangementTransportState`.
- `formatArrangementTransportBarBeat`.
- existing engine status wording such as `getStudioStatusEngineLine`.
- `LocalDawAudioEngineState.status`, `isMuted`, and `masterVolume`.
- `LocalDawState.transport`.
- `SharedDawTransport.state`.
- the existing `overviewScreens` and `arrangement-grid` render path.

Implementation shape:

- Keep code changes inside `Level1RecordingStudioRoom.tsx`.
- Add a small helper such as `getArrangementPlaybackGuidanceLine(...)` near the arrangement monitor helpers.
- Let `createStudioArrangementTimelineMonitor` receive `localDawAudioState?: LocalDawAudioEngineState`.
- Replace one existing generic timeline summary line with the guidance line so the monitor does not become overcrowded before V9-5.
- Prefer short copy such as `ENGINE OFF: SILENT HERE`, `SHARED PLAY: EACH ENGINE ON`, `LOCAL LIVE: THIS BROWSER`, or `DISCORD NOT APP AUDIO`.
- Do not make any guidance line imply browser-to-browser raw audio streaming.

### Checklist Items Achieved

- [x] Added friend playback guidance line.
- [x] Distinguished live local playing from shared arrangement playback.
- [x] Mentioned per-browser ENGINE without implying raw audio streaming.
- [x] Build passed.

### Completed Implementation

Added one compact, state-aware guidance line to the Arrangement Timeline monitor using existing local audio state and shared transport state. The line reports silent local cases such as `ENGINE OFF`, `ENGINE MUTED`, or `ENGINE VOL 0`, explains shared playback as per-browser with each listener needing their own ENGINE, distinguishes local live playback as this browser, and explicitly avoids implying Discord is app-audio transport.

### Acceptance Criteria

- Friends can tell whether they need to press ENGINE.
- The monitor does not imply Discord voice is streaming app audio.
- Shared transport/playback expectation is plain.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual check with ENGINE off.
- [ ] Manual check with ENGINE on and muted.
- [ ] Manual Discord/friend wording check.

### Risks

- Friend-audio copy must stay short enough to read in 3D.
- Wording can accidentally imply raw microphone or desktop audio streaming.

### Non-Goals

- No Discord SDK audio changes.
- No raw microphone streaming.
- No shared audio-readiness state.

## V9-5: Timeline Layout And Readability Pass

Status: `[x]` completed and manager-verified.

### Goal

Place and tune the Arrangement Timeline monitor so it becomes the main "song map" without hiding the useful Vision 8 monitors.

Focus:

- timeline wall placement.
- screen scale.
- monitor hierarchy.
- text and block contrast.
- first-person readability.
- top-down/free-cam readability.
- no hidden controls.

### Implementation Spec

Approved manager scope:

- Tune the Arrangement Timeline monitor's in-room placement, scale, and readability so it reads as the primary song map.
- Preserve Vision 8 monitor usefulness and avoid hiding controls.
- Keep the current arrangement content intact: bars, lanes, source blocks, playhead, transport truth, and friend playback guidance.
- Prefer adjustments in the existing `overviewScreens` placement block.
- If needed, make only small canvas spacing or text-fit tuning inside the existing `arrangement-grid` render branch.
- Avoid new timeline data, source-label changes, friend-copy changes, editing behavior, audio/sync/session behavior, and 2D UI.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision9-recording-room-arrangement-timeline.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/types/session.ts`
- `src/lib/daw/sharedDaw.ts`
- `src/lib/lobby/sessionState.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- any 2D route or dashboard file.

Existing helpers and state to reuse:

- `overviewScreens` placement block.
- `StudioOverviewScreen`.
- `getStudioOverviewScreenCanvasSize`.
- `createStudioOverviewScreenCanvas`.
- existing `arrangement-grid` render branch.
- `fitCanvasText`.
- existing `phaseVisuals` colors.

Implementation shape:

- Keep code changes inside `Level1RecordingStudioRoom.tsx`.
- Make the timeline feel dominant primarily through placement and scale.
- Keep it high enough and/or spaced enough that the mixer and device monitors below remain visible.
- Keep controls and interactive desks untouched.
- Do not rebuild the arrangement canvas or alter its data semantics.

Code facts that matter:

- Current arrangement screen is at `[-16.88, 4.58, -8.58]` with size `[4.96, 1.98]` and kind `arrangement-grid`.
- It sits above the `device-rack` and `mixer-view` screens on the same wall.
- Other key monitors include `sequence-grid` at `[-22.18, 1.66, -6.86]`, `transport` at `[-22.18, 2.76, -4.62]`, and `studio-truth` at `[-22.18, 1.44, -2.88]`.
- The arrangement canvas already has the largest canvas budget in `getStudioOverviewScreenCanvasSize`.

### Checklist Items Achieved

- [x] Timeline placed as a clear primary song map.
- [x] Existing V8 monitors remain useful and visible.
- [x] Text and blocks stay readable.
- [x] Controls remain clickable.
- [x] Build passed.

### Completed Implementation

Raised and enlarged the Arrangement Timeline monitor so it reads as the room's primary song map above the existing mixer and device monitors. Increased the arrangement canvas budget and tightened the grid margins so bars, lanes, source blocks, playhead, and guidance text remain legible at the larger wall size while preserving the existing Vision 8 monitor set and controls.

### Acceptance Criteria

- Timeline reads from entry, DAW desk, and guitar area.
- Timeline does not block existing monitors or controls.
- Timeline feels primary without making the room visually noisy.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person readability check.
- [ ] Manual top-down/free-cam readability check.
- [ ] Manual overlap check against all instruments, controls, and monitors.

### Risks

- A large timeline may crowd the room.
- Existing monitors may need small placement adjustments to preserve hierarchy.
- Timeline blocks may need multiple visual tuning passes.

### Non-Goals

- No new timeline data.
- No new editing behavior.
- No shared-state changes.

## V9-6: Shared Arrangement Editing

Status: `[hold]` on hold.

### Goal

Consider shared arrangement editing only after the read-only timeline proves useful.

Possible future ideas:

- shared timeline blocks.
- user ownership on blocks.
- drag blocks between lanes or bars.
- friend annotations.
- who last recorded or moved a block.

### Hold Reason

Do not add shared arrangement editing until the read-only Arrangement Timeline answers the basic friend-testing problem.

## Manager Loop Plan

Use this doc as the active roadmap for Arrangement Timeline work and `docs/Agents/agent.md` as the operating loop.

Loop rules:

- Keep only one phase marked `[~]`.
- Start with V9-1 because the room needs the timeline surface before playhead or friend guidance.
- Before implementation, require a worker preparation spec covering likely files, files to avoid, reused helpers, acceptance checks, risks, and non-goals.
- Do not implement a phase until the approved spec is written into that phase section.
- Every implementation phase runs `npm.cmd run build`.
- Close a phase only after manager review, build confirmation, doc updates, and changelog entry when code changed.
- Push only when the user explicitly says `push update`.

Suggested order:

1. V9-1 builds the basic read-only Arrangement Timeline monitor.
2. V9-2 adds playhead and local/shared transport truth.
3. V9-3 improves source lane labels and block meaning.
4. V9-4 adds friend playback guidance.
5. V9-5 tunes layout/readability around the full monitor set.
6. V9-6 remains on hold until the read-only timeline proves useful.

## Test Plan

Every implementation phase:

- run `npm.cmd run build`.
- confirm the hidden 3D room still opens with `syncsesh`.
- confirm normal 2D app remains clean and usable.
- confirm ENGINE remains off by default.
- confirm existing guitar, piano, drums, looper, shared transport, Sequence View, Mixer View, and Patch / Signal monitors still work.

Timeline-specific manual checks:

- timeline visible from room entry.
- timeline visible from DAW desk.
- timeline visible from guitar area.
- timeline visible in top-down/free-cam.
- playhead does not imply motion when transport is stopped.
- guitar-recorded FM Synth material is labeled honestly.
- friend guidance does not imply raw Discord or microphone streaming.

## Assumptions

- Vision 8 monitor work remains the current truth/status layer.
- Vision 9 adds a song map, not another control cluster.
- The first implementation target is V9-1 only.
- Existing DAW clips and MIDI notes are enough for a first approximate timeline.
- Shared arrangement editing stays on hold until the read-only timeline is useful.
- `docs/Agents/agent.md` remains the authority for manager/worker loop behavior.
