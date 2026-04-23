# Secret 3D World Vision 8 - Recording Room Monitors

## Purpose

Vision 8 adds readable studio monitors to the Recording Studio so friends can understand what is happening without knowing the DAW internals.

The room already has instruments, patch cables, looper controls, shared live sound, and the handheld guitar. The missing layer is fast feedback:

- what is playing.
- what is recording.
- why audio is silent.
- which clip or scene matters.
- whether signal is live, recorded, patched, muted, or local-only.

The monitors should make the studio feel less broken by giving the room a visible brain.

## North Star

A friend should walk into the Recording Studio and know the next useful action in five seconds.

Target feeling:

- they see a big room status monitor first.
- they can tell if ENGINE is off, muted, or ready.
- they can tell which instrument is live or recording.
- they can see clips/scenes like an Ableton-style sequence view.
- they can see mixer volume/mute state without hunting for tiny buttons.
- they can see patch/signal truth in simple words, not a full cable diagram.
- they understand Discord/friend audio expectations are per-browser ENGINE, not microphone streaming.

## Product Boundary

In scope:

- in-world monitors/screens inside the hidden 3D Recording Studio.
- Ableton-inspired session/sequence view.
- mixer/meter view.
- patch/signal truth view.
- big room status and next-action monitor.
- readable first-person and top-down layouts.
- state derived from existing local DAW, audio engine, shared clips, shared guitar, and patch graph.

Out of scope:

- normal 2D dashboard UI changes.
- new audio engine features.
- new recording formats.
- raw microphone or Discord audio streaming.
- new sync events unless a later phase explicitly approves shared monitor state.
- new instruments.
- replacing the existing DAW controls.

## Manager Read

The Recording Studio is powerful now, but friend testing still feels like debugging. More controls will not solve that. The room needs state surfaces: monitors that answer "what is happening?" and "what should I try next?"

This vision should prioritize readable truth over decoration. Monitors should be visible from first-person, useful from top-down, and compact enough to not turn the studio into a wall of noise.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## Monitor Phases

- [x] V8-1: Big Studio Status Monitor.
- [x] V8-2: Sequence View Monitor.
- [x] V8-3: Mixer View Monitor.
- [x] V8-4: Patch And Signal Truth Monitor.
- [x] V8-5: Monitor Layout And Readability Pass.
- [hold] V8-6: Shared Monitor Presence/Annotations.

## Wishlist Mapping

- "Ableton has the sequence view" -> V8-2 session/sequence monitor with tracks across and scenes down.
- "Mixer volume view" -> V8-3 mixer monitor with volume, mute, meters, and master/ENGINE status.
- "A few monitors to display some info" -> V8-1 through V8-4 as focused screens instead of one overloaded panel.
- "Friends still cannot figure out how to use it" -> V8-1 next-action line and V8-4 plain-language signal truth.

## V8-1: Big Studio Status Monitor

Status: `[x]` completed and manager-verified.

### Goal

Add one large, central in-world monitor that summarizes the current room state and suggests the next useful action.

Target examples:

- `ENGINE OFF`
- `MASTER 72%`
- `GUITAR HELD BY RUBBE / LIVE`
- `GTR REC FM S1`
- `NOW PLAYING FM SYNTH S1`
- `NEXT: PRESS ENGINE`
- `NEXT: PICK GUITAR`
- `NEXT: ARM REC OR PLAY CLIP`

### Implementation Spec

Approved manager scope:

- Add one large central in-world status monitor in the Recording Studio.
- Keep it as a first-glance room brain, not a dense DAW view.
- Derive status from existing room props and helpers only.
- Show ENGINE and master volume state.
- Show guitar state when available: available, held by local/friend, live, or recording.
- Show a now-playing or now-recording line when derivable from existing clip/audio state.
- Show exactly one conservative next-action line.
- Reuse the existing canvas-texture screen pattern.
- Avoid sequence grid, mixer monitor, patch/signal truth rewrite, new session events, new audio features, and normal 2D UI.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision8-recording-room-monitors.md`
- `changelog.md`

Files to avoid:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx` unless prop plumbing is unexpectedly required.
- `src/3d/useLocalDawState.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/types/session.ts`
- unrelated control-room display files or 2D dashboard files.

Existing helpers to reuse:

- `createStudioOverviewScreenCanvas` and `StudioOverviewScreen`.
- `getStudioTruthState` and `getStudioTruthPanelAccentColor`.
- `getStudioSoundActivity` when helpful for current audio activity.
- Existing `localDawState`, `localDawAudioState`, `studioGuitar`, `heldStudioInstrument`, and `studioGuitarRecordingStatus` props.

Implementation shape:

- Add small formatting helpers near the existing overview/truth helpers.
- Add one wide monitor entry to `overviewScreens`.
- Keep the monitor to four or five short lines plus `NEXT: ...`.
- Prefer conservative next-action rules: press ENGINE, pick guitar, turn up master, press PLAY, arm REC/play clip.

### Expected Files

- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/Level1RoomShell.tsx` only if extra props are needed.
- `src/3d/ThreeDModeShell.tsx` only if extra derived state is needed.
- `docs/3d/3dvision8-recording-room-monitors.md`
- `changelog.md` if code changes.

### Acceptance Criteria

- A large central monitor is visible from the Recording Studio's normal first-person angle.
- The monitor reports ENGINE/master status.
- The monitor reports whether guitar is available, held, live, or recording when the data is available.
- The monitor reports at least one useful next action.
- Existing Studio Truth, guitar, looper, piano, drums, patch reset, and controls remain usable.
- Build passes.

### Risks

- Too much text could become unreadable in 3D.
- If the next-action logic is too clever, it may become wrong and reduce trust.
- The monitor must not hide or physically overlap existing controls.
- Guitar state has local and shared hints; avoid contradictory wording.

### Checklist Items Achieved

- [x] Added large central status monitor.
- [x] Added ENGINE/master status.
- [x] Added guitar status.
- [x] Added now-playing/recording status.
- [x] Added next-action line.
- [x] Build passed.

### Completed Implementation

Added a wide `STUDIO STATUS` monitor to the room overview screens. It uses existing local DAW, audio-engine, Studio Truth, and shared guitar state to show ENGINE/master, guitar availability or ownership, current live/recording/playback activity, and one conservative `NEXT:` action.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person readability check in the live room.
- [ ] Manual control-overlap check in the live room.

### Non-Goals

- No sequence grid yet.
- No mixer monitor yet.
- No patch truth rewrite yet.
- No new session events.
- No normal 2D UI.

## V8-2: Sequence View Monitor

Status: `[x]` completed and manager-verified.

### Goal

Add an Ableton-inspired session view monitor showing tracks across and scenes down.

Suggested tracks:

- Drums.
- Bass.
- FM Synth.
- Piano.
- Looper.

Display ideas:

- clip state: empty, armed, recording, playing, stopped.
- selected clip highlight.
- note tick density or small note markers.
- shared/local indicator.
- guitar-recorded notes should be visibly labeled in the FM Synth lane until a dedicated guitar lane exists.

### Implementation Spec

Approved manager scope:

- Add one in-world Ableton-style sequence monitor to the Recording Studio.
- Show a 5-by-4 grid from existing local DAW state: Drums, Bass, FM Synth, Piano, and Looper across four scenes.
- Make empty, armed, recording, playing, stopped, and selected clip states visually distinct.
- Show compact note-density markers for clips with MIDI notes.
- Label guitar-recorded material inside the FM Synth lane with `GTR` or `GUITAR` until a dedicated guitar lane exists.
- Keep the monitor read-only and informational.
- Reuse the existing canvas-texture overview screen pattern.
- Avoid mixer monitor work, patch/signal truth rewrites, new session events, new audio features, new instruments, and normal 2D UI changes.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision8-recording-room-monitors.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/types/session.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx` unless prop plumbing unexpectedly becomes unavoidable.
- unrelated 2D dashboard files and shared-event plumbing.

Existing helpers and patterns to reuse:

- `createStudioOverviewScreenCanvas` and `StudioOverviewScreen`.
- `overviewScreens` inside `Level1RecordingStudioRoom`.
- `formatDawClipGridLines` as a concise state-summary pattern.
- Existing clip grid visual/state model from `StudioClipGridControls` and `StudioClipGridCell`.
- Existing `LocalDawState.tracks`, `clips`, `midiNotes`, `selectedTrackId`, `selectedSceneIndex`, and `lastPlaybackTrigger`.

Implementation shape:

- Keep code changes inside `Level1RecordingStudioRoom.tsx`.
- Extend the overview-screen canvas path just enough to render a true sequence matrix for a new sequence monitor kind.
- Derive cells from the local DAW tracks, clips, MIDI notes, and selected clip coordinates.
- Use short lane headers and scene labels so the grid stays readable in 3D.
- Use a conservative `GTR` tag only when the FM Synth clip contains guitar-sourced note labels or guitar-recorded note patterns.
- Do not add click handlers, transport changes, or session writes.

### Acceptance Criteria

- Monitor shows a 5-by-4 style track/scene grid.
- Recording and playing states are visually obvious.
- Selected clip is clearly highlighted.
- Cells with notes show note-density markers.
- Guitar-recorded clips are understandable as guitar material inside the FM Synth lane.
- Existing clip grid controls continue to work.
- Build passes.

### Checklist Items Achieved

- [x] Added a 5-by-4 sequence monitor.
- [x] Rendered all five local DAW lanes and four scenes.
- [x] Made armed, recording, playing, stopped, empty, and selected states visually distinct.
- [x] Added note-density markers.
- [x] Labeled guitar-recorded FM Synth material with `GTR`/`FM GUITAR`.
- [x] Build passed.

### Completed Implementation

Added a read-only `SEQUENCE VIEW` monitor using the existing overview-screen canvas system. The monitor derives its matrix from local DAW tracks, clips, MIDI notes, selected clip coordinates, and last playback state. It draws lane headers, scene rows, colored clip cells, selected highlights, note-density ticks, and guitar tags for FM Synth clips that contain guitar-sourced notes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person sequence readability check in the live room.
- [ ] Manual top-down/free-cam sequence readability check.
- [ ] Manual overlap check against nearby monitors and controls.

## V8-3: Mixer View Monitor

Status: `[x]` completed and manager-verified.

### Goal

Add a mixer monitor showing track volumes, mute states, meters, and master/ENGINE state.

Display ideas:

- per-track vertical bars.
- mute/active badges.
- master volume.
- ENGINE off/muted/volume-zero reason.
- last generated/live sound.

### Implementation Spec

Approved manager scope:

- Add one read-only in-world Mixer View monitor to the Recording Studio.
- Show five local DAW track strips with volume, mute/active state, and meter levels.
- Show master volume, master mute, master meter, and ENGINE state.
- Show one short silence reason when the engine is off, muted, volume zero, or no active signal is apparent.
- Show last generated/live sound using existing audio-engine state when available.
- Reuse existing mixer semantics and meter helpers.
- Keep the monitor informational only.
- Avoid sequence changes, patch/signal truth rewrites, new session events, new audio features, new instruments, control rewiring, and normal 2D UI changes.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision8-recording-room-monitors.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/types/session.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx` unless prop plumbing is truly unavoidable.
- any 2D dashboard or session plumbing files.

Existing helpers and patterns to reuse:

- `createStudioOverviewScreenCanvas` and `StudioOverviewScreen`.
- `overviewScreens` inside `Level1RecordingStudioRoom`.
- `StudioMixerStrip`, `StudioMixerControls`, and existing master volume semantics.
- `getTrackMeterLevel` and `getMasterMeterLevel`.
- `getStudioTruthEngineLine`, `getStudioTruthState`, and `getStudioSoundActivity`.
- Existing `LocalDawState.tracks`, `LocalDawTrack.volume`, `LocalDawTrack.muted`, `LocalDawAudioEngineState.status`, `isMuted`, `masterVolume`, active voice counts, and last-note labels.

Implementation shape:

- Keep code changes inside `Level1RecordingStudioRoom.tsx`.
- Add a mixer-specific overview-screen kind or a narrow mixer branch in the existing canvas renderer.
- Add a helper near the sequence monitor helper that derives a compact mixer spec from local DAW and audio-engine state.
- Render five compact track bars plus one master strip.
- Use plain silence wording: `ENGINE OFF`, `MASTER MUTED`, `MASTER VOL 0`, `NO ACTIVE SIGNAL`, or `AUDIBLE`.
- Keep all click handlers and write paths unchanged.

### Acceptance Criteria

- Monitor makes silence causes obvious.
- Per-track volume/mute state is readable.
- Master volume and ENGINE state are readable.
- Last generated/live sound is readable when available.
- Existing mixer controls remain usable.
- Build passes.

### Checklist Items Achieved

- [x] Added one read-only Mixer View monitor.
- [x] Added five track strips with volume, mute/active state, and meter levels.
- [x] Added master volume, mute, and meter state.
- [x] Added ENGINE state and conservative silence reason.
- [x] Added last generated/live sound readout.
- [x] Build passed.

### Completed Implementation

Added a `MIXER VIEW` monitor to the overview screens. It derives its display from existing local DAW tracks and audio-engine state, rendering track volume/mute/meter strips, master status, ENGINE status, conservative silence reason, and the latest live/generated sound line without changing mixer controls or audio behavior.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person mixer readability check in the live room.
- [ ] Manual top-down/free-cam mixer readability check.
- [ ] Manual overlap check against nearby mixer and rack controls.

## V8-4: Patch And Signal Truth Monitor

Status: `[x]` completed and manager-verified.

### Goal

Add a plain-language signal monitor that explains routing without requiring users to understand the patch bay.

Display ideas:

- `PIANO -> SPEAKERS YES/NO`.
- `DRUMS -> MIXER YES/NO`.
- `INTERFACE -> SPEAKERS YES/NO`.
- `GUITAR LIVE LOCAL`.
- `GUITAR REC FM S1`.
- `FRIENDS HEAR WITH ENGINE ON`.

### Implementation Spec

Approved manager scope:

- Rework the existing Studio Truth surface into a dedicated plain-language Patch And Signal Truth monitor.
- Explain local patch truth, shared guitar behavior, and friend/Discord browser ENGINE expectations.
- Keep the monitor read-only and derive everything from existing local patch graph, audio-engine state, shared guitar state, and current room props.
- Use short explicit lines such as `PIANO -> SPEAKERS YES/NO`, `DRUM MIX -> INTERFACE YES/NO`, `INTERFACE -> SPEAKERS YES/NO`, `GTR AVAILABLE/HELD/REC`, and `FRIENDS NEED OWN ENGINE`.
- Make wording clear that friends hear app-generated shared/live events only after their own browser ENGINE is enabled; do not imply raw microphone or Discord audio streaming.
- Avoid mixer changes, sequence/session grid changes, new session/shared events, new audio/routing features, new instruments, controls, transport behavior, and normal 2D UI changes.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision8-recording-room-monitors.md`
- `changelog.md`

Files to avoid:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/types/session.ts`
- unrelated 2D/dashboard files and shared-event plumbing.
- `src/3d/useLocalDawState.ts` unless a tiny helper gap is discovered.

Existing helpers and patterns to reuse:

- `createStudioOverviewScreenCanvas`, `StudioOverviewScreen`, and the existing `studio-truth` screen slot.
- `getStudioStatusEngineLine`, `getStudioStatusGuitarLine`, and `formatBigStudioStatusLines` wording style.
- `isAudioInterfaceOutputPatchedToSpeakers`, `isPortPatchedToAudioInterfaceInput`, `canPianoLivePatchReachSpeakers`, `canDrumMixerPatchReachInterface`, `canDrumHitPatchReachSpeakers`, and `isPatchCablePluggedBetween`.
- Existing room props: `studioGuitar`, `studioGuitarRecordingStatus`, `heldStudioInstrument`, `users`, `localUserId`, `localDawState`, and `localDawAudioState`.

Implementation shape:

- Keep code changes inside `Level1RecordingStudioRoom.tsx`.
- Add or adjust small formatting helpers around the existing Studio Truth helpers.
- Use the existing `studio-truth` overview screen entry instead of adding another competing monitor.
- Keep the screen text compact and explicit.
- Do not add write paths, new ports, cable semantics, or session propagation.

### Acceptance Criteria

- Patch/signal status uses simple words.
- Monitor distinguishes local-only patch truth from shared live sound.
- Discord/friend expectation is documented in-room without implying raw audio streaming.
- Existing Studio Truth panel can remain or be simplified only in an approved implementation spec.
- Build passes.

### Checklist Items Achieved

- [x] Reworked the Studio Truth monitor into `Patch / Signal`.
- [x] Added plain local patch truth for piano, drum mix, interface, and speakers.
- [x] Added shared guitar/live state wording.
- [x] Added friend/Discord expectation as per-browser ENGINE behavior.
- [x] Avoided raw microphone or audio-streaming wording.
- [x] Build passed.

### Completed Implementation

Updated the existing `studio-truth` overview screen into a `PATCH / SIGNAL` monitor. It now derives local patch truth from existing patch helpers, reports audio-engine state, summarizes guitar live/recording ownership, and shows a conservative friend-audio expectation line: friends need their own browser ENGINE for app-generated/shared live events.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person patch/signal readability check in the live room.
- [ ] Manual overlap check against Audio Interface and Patch Reset surfaces.
- [ ] Manual wording check with a friend/Discord test.

## V8-5: Monitor Layout And Readability Pass

Status: `[x]` completed and manager-verified.

### Goal

Place monitors so they are readable in first-person and top-down views without overlapping existing instruments or controls.

Focus:

- monitor scale.
- wall placement.
- viewing angle.
- text density.
- color contrast.
- top-down readability.
- no hidden controls behind monitors.

### Implementation Spec

Approved manager scope:

- Make the existing Recording Studio monitors easier to read and navigate in 3D.
- Tune placement, scale, viewing angle, and text density only.
- Keep all monitor content and helper logic intact.
- Preserve the current monitor set: Studio Status, Transport, Sequence View, Track List, Device Rack, Mixer View, and Patch / Signal.
- Improve sightlines from room entry, DAW desk, guitar area, and top-down/free-cam views.
- Avoid hiding clickable controls, doorway sightlines, instruments, patch controls, or other monitors.
- Avoid new monitor data, new shared/session events, audio behavior changes, new controls, 2D UI work, and content redesign.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision8-recording-room-monitors.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/types/session.ts`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- unrelated 2D dashboard, session plumbing, or shared-event files.

Existing helpers and patterns to reuse:

- `createStudioOverviewScreenCanvas`.
- `StudioOverviewScreen`.
- the existing `overviewScreens` array.
- existing monitor helpers: `formatBigStudioStatusLines`, `createStudioSequenceMonitor`, `createStudioMixerMonitor`, `formatStudioPatchSignalTruthLines`, and `getStudioTruthPanelAccentColor`.
- existing kind-based canvas branches for `sequence-grid`, `mixer-grid`, and `studio-truth`.
- existing `phaseVisuals` contrast colors.

Implementation shape:

- Keep changes inside `Level1RecordingStudioRoom.tsx`.
- Adjust `overviewScreens` positions, sizes, and rotations so each screen has clearer physical separation.
- Keep the big status monitor as the primary focal point.
- Keep sequence and mixer monitors wide enough for their grid/strip content.
- Separate Patch / Signal and Transport so they do not visually compete.
- Make only lightweight canvas rendering tweaks if needed: font size, line spacing, header placement, bottom label placement, or margins.
- Do not alter data derivation, interaction handlers, routing, sync, or audio behavior.

### Acceptance Criteria

- Screens are readable from the common room entry/desk/guitar positions.
- Controls remain clickable.
- Text does not overlap or shrink into noise.
- Layout works in first-person and top-down views.
- Build passes.

### Checklist Items Achieved

- [x] Spread the existing monitor set into clearer room sightlines.
- [x] Kept Studio Status as the primary focal point.
- [x] Increased sequence, mixer, track, device, and patch/signal screen proportions where useful.
- [x] Added canvas sizing that scales with physical monitor size for crisper text.
- [x] Preserved monitor content, routing, sync, audio behavior, and interactions.
- [x] Build passed.

### Completed Implementation

Adjusted monitor placement, screen dimensions, and canvas sizing in the Recording Studio. The monitor set is now more physically separated, the largest data-heavy screens have more surface area, and canvas textures scale from the screen's world size so text has more room without changing the underlying monitor data.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person readability check from entry, desk, and guitar positions.
- [ ] Manual top-down/free-cam readability check.
- [ ] Manual overlap check against transport, patch, mixer, and nearby room props.

## V8-6: Shared Monitor Presence/Annotations

Status: `[hold]` on hold.

### Goal

Consider shared annotations or friend presence on monitors after the local monitor set is useful.

Possible ideas:

- show who is holding guitar.
- show who last recorded a clip.
- show who started transport.
- show "friend has ENGINE off" only if a future shared audio-readiness design exists.

### Hold Reason

Do not add new shared monitor state until V8-1 through V8-5 prove which information actually helps friends.

## Manager Loop Plan

Use this doc as the active roadmap for Recording Studio monitor work and `docs/Agents/agent.md` as the operating loop.

Loop rules:

- Keep only one phase marked `[~]`.
- Start with V8-1 because the room needs one obvious state surface before detailed monitors.
- Before implementation, require a worker preparation spec covering likely files, files to avoid, reused helpers, acceptance checks, risks, and non-goals.
- Do not implement a phase until the approved spec is written into that phase section.
- Every implementation phase runs `npm.cmd run build`.
- Close a phase only after manager review, build confirmation, doc updates, and changelog entry when code changed.

Recommended phase order:

1. V8-1 Big Studio Status Monitor.
2. V8-2 Sequence View Monitor.
3. V8-3 Mixer View Monitor.
4. V8-4 Patch And Signal Truth Monitor.
5. V8-5 Monitor Layout And Readability Pass.
6. V8-6 remains on hold until local monitor usefulness is proven.

## Test Plan

Every implementation phase:

- Run `npm.cmd run build`.
- Hidden 3D room still opens with `syncsesh`.
- Normal 2D dashboard remains clean.
- ENGINE remains off by default.
- Existing piano, drums, looper, patch reset, Studio Truth panel, guitar pickup, guitar recording, and Q/E guitar note banks still work.

Manual monitor checks:

- Readable in first-person from room entry.
- Readable near the DAW desk.
- Readable near the guitar.
- Does not overlap clickable controls.
- Useful from top-down/free-cam view.

## Assumptions

- Vision 8 is a feedback/readability layer, not a new audio feature.
- Existing local DAW/audio/session state is enough for V8-1 through V8-5.
- Shared monitor annotations stay on hold unless friend testing proves they are needed.
- V8 should make the studio more understandable before adding more instruments.
