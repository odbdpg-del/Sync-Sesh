# Secret 3D World Vision 4

## Purpose

Vision 4 is the long-range audio studio plan for the hidden 3D world.

Vision 3 introduced a small non-audible audio workbench in the Control Room. Vision 4 expands that idea into a full DAW north star: the goal is Ableton-like music creation with friends, expressed as physical stations inside the hidden world.

This doc should guide future phases for:

- a connected Recording Studio room behind the current audio workbench.
- a simple looper station.
- a DJ station.
- a deeper DAW station.
- a piano/MIDI controller that can play live or record into the DAW.
- generated instruments such as FM synth, drum machine, and bass machine.
- effects such as filter, autopan, echo, and reverb.
- multiplayer music-making that starts local and becomes shared only through explicit sync design.

The goal is ambitious. The phases must stay small.

## North Star

The hidden world should eventually contain a playful 3D music studio where friends can make a track together.

The target feeling is:

- walk through the Control Room.
- find the Audio Workbench.
- pass through a wall opening into a Recording Studio.
- use different physical stations depending on how deep you want to go.
- tap a piano to play live notes.
- record those notes into clips.
- trigger loops.
- shape sounds with synths and effects.
- use a DAW station for arrangement, clips, mixer, devices, and session state.

The north star is Ableton, but translated into the Sync Sesh hidden world:

- clips become glowing pads and wall panels.
- tracks become physical lanes.
- devices become 3D modules.
- MIDI becomes piano/controller input.
- effects become rack modules.
- transport becomes a big shared studio clock.
- collaboration becomes people standing at stations and contributing parts.

## Current Baseline

Already available from earlier visions:

- Secret code unlock opens the hidden 3D shell.
- Level 1 contains a Control Room and Shooting Range in one connected walkable footprint.
- The Control Room has dashboards, stations, props, and a SoundCloud jukebox.
- The SoundCloud jukebox controls widget playback but does not own raw audio.
- A non-audible Audio Workbench shell exists in the Control Room.
- First-person controls, pointer lock fallback, Tab top-down, Exit, WebGL fallback, and recovery are in place.
- Local clickable interaction primitives exist.
- Existing session/sync state is available but should not be widened without explicit reducer-owned events.

## Product Boundary

SoundCloud remains a playback/jukebox source. It is not the foundation for the DAW engine.

Do not route SoundCloud raw streams through Web Audio effects. Do not proxy SoundCloud streams into the app-owned audio graph. The DAW engine should start with sources we control:

- generated synths.
- generated drums.
- generated bass.
- user-recorded MIDI/control data.
- later imported audio files if a phase explicitly designs file ownership and browser safety.
- later self-hosted or explicitly controllable audio sources.

The DAW should be app-owned and generated first.

## Studio Spaces

### Control Room

The Control Room remains the entry room and social hub.

Current role:

- existing dashboards.
- station computers.
- SoundCloud jukebox.
- first Audio Workbench shell.

Future role:

- front door to the Recording Studio.
- quick preview controls for the current studio session.
- optional room monitor showing what the studio is playing.

### Recording Studio

Add a new connected room behind the current Audio Workbench.

The first layout can be compact:

- wall opening behind or near the Audio Workbench.
- short hallway or threshold.
- main DAW station on the far wall.
- piano/MIDI station on one side.
- looper station on another side.
- DJ station or deck wall near the entrance.
- instrument rack and effects rack as modular wall props.
- enough walking space for first-person and top-down readability.

The Recording Studio should be part of Level 1, not a separate top-level level.

It should use walk-through architecture, not a visible normal-app selector.

## Stations

### Simple Looper Station

Purpose:

- easiest first creative surface.
- record or trigger short loops.
- useful before the DAW is fully deep.

Future behavior:

- pads for clip slots.
- simple overdub or replace mode.
- mute/solo per loop.
- basic length choices such as 1, 2, 4, or 8 bars.

First implementation should be local-only.

### DJ Station

Purpose:

- performance-oriented surface.
- bridge between the current SoundCloud jukebox vibe and the future app-owned DAW.

Important boundary:

- it can control or visualize SoundCloud widget playback where already supported.
- it should not process SoundCloud audio through app-owned effects.
- deeper DJ effects should run on app-owned generated/imported sources only.

Future behavior:

- deck A / deck B visual panels.
- crossfader.
- cue buttons.
- beat/level visualizers.
- later app-owned sample decks.

### DAW Station

Purpose:

- the main Ableton-like surface.
- owns tracks, clips, devices, mixer, and arrangement/session concepts.

Future behavior:

- session grid.
- tracks for drums, bass, synth, piano, and audio/looper.
- clip launch.
- transport.
- mixer.
- device chain per track.
- arrangement view later.

First versions should be visual/local before shared.

### Piano / MIDI Controller

Purpose:

- live playable instrument.
- MIDI-style controller for the DAW.
- records notes into selected clips.

Future behavior:

- playable keys in 3D.
- keyboard computer input fallback.
- octave controls.
- selected target track.
- record-arm.
- quantized clip recording.
- visual note trail.

The piano should become the first human-feeling input device.

### Instrument Rack

Purpose:

- app-owned generated sound sources.

Core instruments:

- FM synth.
- drum machine.
- bass machine.

Later instruments:

- sample player for owned/imported samples.
- noise/percussion generator.
- simple subtractive synth.

### Effects Rack

Purpose:

- small Ableton-style device chain.

Core effects:

- filter.
- autopan.
- echo.
- reverb.

Later effects:

- compressor.
- distortion/saturation.
- EQ.
- chorus/phaser.

Effects should be planned first against app-owned/generated audio.

## Collaboration Model

The system should grow through collaboration levels:

1. Local-only visuals.
2. Local-only sound.
3. Local-only recording.
4. Shared session metadata, such as tempo or current scene.
5. Shared clip summaries.
6. Shared clip contents for compact MIDI/control data.
7. Shared performance events if latency and sync behavior are acceptable.

Do not sync raw audio streams in early phases.

Do not send high-frequency audio or MIDI events until a dedicated sync design exists.

The first shared music state should probably be:

- tempo.
- transport running/stopped.
- selected scene.
- clip summaries.
- completed MIDI clip data.

## DAW Concepts

### Transport

Minimum:

- play/stop.
- tempo.
- bar/beat counter.
- loop length.

Later:

- count-in.
- metronome.
- arrangement position.
- host/shared transport authority.

### Tracks

Minimum:

- drums.
- bass.
- FM synth.
- piano.
- looper/audio.

Later:

- add/remove tracks.
- track names.
- routing.
- sends.

### Clips

Minimum:

- fixed grid of clip slots.
- launch/stop.
- loop length.
- simple note/pattern data.

Later:

- recording.
- overdub.
- quantize.
- duplicate.
- clear.
- clip colors.

### Devices

Minimum:

- one instrument per track.
- one or two effect slots.

Later:

- device chains.
- macros.
- drag/reorder.
- presets.

### Mixer

Minimum:

- volume.
- mute.
- solo later.

Later:

- pan.
- sends.
- meters.
- master limiter.

## Phase Roadmap

### Phase Groups

- V4-A: Room and station foundations.
- V4-B: Local transport and visual DAW state.
- V4-C: Local generated audio engine.
- V4-D: Instruments.
- V4-E: MIDI/piano recording.
- V4-F: Looper and DJ surfaces.
- V4-G: Effects racks.
- V4-H: Shared collaboration.
- V4-I: Polish, recovery, and manual testing.

## Suggested Phase Order

### [x] Phase V4-1: Recording Studio Room Plan

#### Summary

Design the Recording Studio room behind the current Audio Workbench.

#### Implementation Spec

- Documentation-only.
- Decide how the room attaches to the Control Room.
- Define minimum room bounds, wall opening, station zones, walking lanes, and top-down readability.
- Decide whether the current Audio Workbench remains in the Control Room as the entry console.
- Do not edit code.

#### Completed Implementation

- Selected the Recording Studio as a connected internal Level 1 room, not a new top-level level.
- Chose the current Control Room Audio Workbench as the in-world hint/entry console.
- Planned the Recording Studio behind or near the current workbench with a walk-through wall opening.
- Defined the first room contents:
  - DAW station.
  - piano/MIDI controller.
  - simple looper station.
  - DJ station.
  - instrument rack.
  - effects rack.
- Defined the room's first implementation order: room/area config, shell render, station blockout, local DAW state, then audio runtime.
- Kept the first shared/collaborative behavior behind later explicit sync-design phases.

#### Acceptance Criteria

- Vision 4 defines the Recording Studio as part of Level 1.
- Vision 4 defines the major station types needed for the DAW goal.
- Vision 4 defines a phase sequence that can be implemented in small Codex-sized passes.
- Vision 4 keeps SoundCloud raw stream processing out of the DAW engine.
- No source code is changed for this phase.

#### Build And Manual Checks

- No build required for documentation-only changes.

#### Non-Goals

- No room config.
- No rendering.
- No audio.

### [x] Phase V4-2: Recording Studio Area Config

#### Summary

Extend Level 1 config with a planned Recording Studio area and a Control Room opening behind the Audio Workbench.

#### Implementation Spec

Approved manager spec:

- Add a semantic `recording-studio` area kind to `LevelAreaConfig`.
- Add a planned `recording-studio` Level 1 area behind or near the current Audio Workbench.
- Add a planned `control-room-recording-studio-opening` from the Control Room to the Recording Studio.
- Keep the studio metadata-only in this phase: `status: "planned"` for both the area and opening.
- Recommended studio bounds: `min: [-22.5, 0, -8.8]`, `max: [-10.5, 4.5, 0.8]`.
- Recommended planned studio spawn: `[-12.8, 1.7, -4.6]`.
- Recommended planned studio camera target: `[-18, 1.45, -4.6]`.
- Recommended planned opening position: `[-10.02, 1.2, -4.6]`.
- Recommended planned opening rotation: `[0, Math.PI / 2, 0]`.
- Recommended planned opening size: `{ width: 2.4, height: 2.2 }`.
- Recommended planned opening clearance: `min: [-10.55, 0, -5.8]`, `max: [-9.95, 2.4, -3.4]`.
- Update only the Level 1 area/opening metadata needed to name the future connection.
- Do not change room dimensions, top-down camera, collision bounds, blockers, traversal surfaces, lighting, stations, jukebox, shooting range config, or the active range opening.
- Do not render the Recording Studio yet.
- Do not make the Recording Studio walkable yet.
- Do not add audio, Web Audio, DAW state, station UI, interactions, sync events, or SoundCloud processing.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- `LevelAreaConfig.kind` supports `"recording-studio"`.
- Level 1 config includes a planned `recording-studio` area.
- Level 1 config includes a planned `control-room-recording-studio-opening`.
- Existing Control Room and Shooting Range areas remain active.
- Existing `control-room-range-opening` remains active and unchanged.
- Collision bounds are not expanded.
- The Recording Studio is not visible or walkable yet.
- Control Room, Shooting Range, range gameplay, jukebox, Audio Workbench, movement, Tab top-down, Exit, reveal, and recovery behavior remain unchanged.
- `npm.cmd run build` passes.

#### Non-Goals

- No room shell rendering.
- No new floor, walls, lighting, or station placeholders.
- No DAW runtime state.
- No Web Audio or generated instruments.
- No SoundCloud raw stream processing.
- No sync/reducer/session changes.

#### Completed Implementation

- Added `"recording-studio"` to the Level 1 area kind union.
- Added planned Level 1 Recording Studio metadata west of the Control Room and behind the Audio Workbench.
- Added a planned Control Room to Recording Studio opening at the west wall near the Audio Workbench.
- Left the active room dimensions, collision bounds, traversal surfaces, lighting, jukebox, shooting range, and active range opening unchanged.
- Kept the studio invisible and non-walkable for this phase.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual in-world checks are still pending.

### [x] Phase V4-3: Recording Studio Shell Render

#### Summary

Render the connected Recording Studio room as a walkable procedural shell.

#### Implementation Spec

Approved manager spec:

- Render the Recording Studio as a connected walkable Level 1 room behind the Control Room Audio Workbench.
- Flip the `recording-studio` area and `control-room-recording-studio-opening` to `status: "active"` in the same change set as rendering/collision.
- Expand `collisionBounds.room.min[0]` westward to include the studio bounds.
- Add collision blockers that match the new shell:
  - Control Room west-wall segments around the doorway.
  - Recording Studio north wall.
  - Recording Studio south wall.
  - Recording Studio west wall.
  - Recording Studio east-wall segments around the doorway.
- Preserve the new doorway centered near `[-10.02, 1.2, -4.6]` with a `2.4` unit opening width.
- Add a `Level1RecordingStudioRoom` shell component, or an equivalently scoped helper, for the studio geometry.
- Render floor, enclosing walls with the east-side doorway gap, threshold/connector floor, simple lighting, and tiny identity markers only.
- Keep the room mostly empty; station blockouts wait for V4-4.
- Mount the studio shell from `Level1RoomShell` as a Level 1 sibling room, similar to the Shooting Range room pattern.
- Replace or mirror the Control Room west wall around the Recording Studio opening so the visible doorway and collision doorway align.
- Do not add DAW state, audio, Web Audio, interactions, station behavior, sync, or SoundCloud processing.
- Preserve Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, reveal, and Tab top-down behavior.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- The Recording Studio is visibly rendered in Level 1.
- The player can walk from the Control Room into the Recording Studio and back through the west-side opening.
- The player cannot walk through the Control Room west wall outside the opening.
- The player cannot leave the Recording Studio through its outer walls.
- Top-down mode still toggles cleanly and recognizes the Recording Studio when the player is inside it.
- The Shooting Range entrance, range gameplay, Control Room, jukebox, Audio Workbench, Exit, reveal flow, and recovery behavior remain intact.
- No audio engine, generated instruments, DAW runtime, sync, or interactive station behavior is added.
- `npm.cmd run build` passes.

#### Non-Goals

- No station blockout beyond tiny room identity markers.
- No piano, looper, DJ, instrument rack, effects rack, transport, clips, mixer, or devices.
- No Web Audio or generated instruments.
- No SoundCloud raw stream processing.
- No sync/reducer/session changes.

#### Completed Implementation

- Activated the Level 1 Recording Studio area and its Control Room opening.
- Expanded Level 1 collision bounds westward to include the studio footprint.
- Added matching collision blockers for the Control Room west-wall doorway and Recording Studio outer walls.
- Added a procedural `Level1RecordingStudioRoom` shell with floor, walls, doorway gap, lintel, threshold floor, grid, lighting, and small identity markers.
- Mounted the studio shell from `Level1RoomShell` as a Level 1 sibling room.
- Adjusted the Level 1 top-down camera config to better frame the expanded west/east footprint.
- Preserved the Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, and existing range entry behavior.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual in-world doorway, collision, Tab top-down, jukebox, range, and Exit checks are still pending.

### [x] Phase V4-4: Studio Station Blockout

#### Summary

Add non-interactive physical placeholders for the Looper, DJ, DAW, Piano/MIDI, Instrument Rack, and Effects Rack.

#### Implementation Spec

- Add visual-only, non-interactive station shells inside `Level1RecordingStudioRoom`.
- Include dim/static canvas labels for:
  - DAW.
  - Piano / MIDI.
  - Looper.
  - DJ.
  - Instrument Rack.
  - Effects Rack.
- Keep all station visuals subdued enough that they read as placeholders, not usable controls yet.
- Recommended layout:
  - DAW: far west wall, centered near `[-21.75, 0, -4.6]`, shallow wall console facing east.
  - Piano / MIDI: south side near `[-17.2, 0, 0.05]`, long low keyboard surface facing north.
  - Looper: north wall near `[-17.0, 0, -8.05]`, compact pad table or panel facing south.
  - DJ: just inside the entrance near `[-12.0, 0, -1.2]`, outside the doorway clearance.
  - Instrument Rack: north-west wall near `[-20.1, 0, -8.05]`, vertical rack with static modules.
  - Effects Rack: north-east wall near `[-13.8, 0, -8.05]`, vertical rack with static modules.
- Keep the central walking lane from the Control Room doorway through z `-4.6` clear.
- Do not change collisions, blockers, traversal surfaces, area config, openings, top-down controller, or movement systems.
- Do not add audio, Web Audio, interactions, sync, recording, transport state, clickable behavior, or SoundCloud processing.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- The Recording Studio visibly includes the six named placeholder stations.
- Station shells are decorative only and do not activate the reticle or clickable interactions.
- The player can still walk through the Control Room doorway into the Recording Studio and back.
- Walking lanes remain clear around the doorway and room center.
- V4-3 room traversal/collision, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, reveal, and Tab top-down behavior remain preserved.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify Recording Studio entry/exit through the west doorway.
- Manually verify station shells are visible, labeled, dim/static, and non-interactive.
- Manually verify the central lane and doorway clearance remain walkable.
- Manually spot-check Tab top-down, Shooting Range entry/gameplay, jukebox, Audio Workbench, Exit, reveal, and recovery.

#### Non-Goals

- No usable station controls.
- No DAW state, transport, clips, mixer, devices, recording, MIDI, generated instruments, or Web Audio.
- No interactions, sync/reducer/session changes, collision changes, or SoundCloud processing.

#### Completed Implementation

- Added visual-only placeholder shells for DAW, Piano / MIDI, Looper, DJ, Instrument Rack, and Effects Rack inside the Recording Studio.
- Added dim/static canvas labels that identify each station as a placeholder.
- Kept all station meshes decorative with no interaction registration, audio, DAW state, sync, or collision changes.
- Preserved the center lane and doorway path from the Control Room into the studio.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual in-world checks for station visibility, doorway clearance, reticle non-activation, Tab top-down, jukebox, range, and Exit remain pending.

### [x] Phase V4-5: Studio Overview Screens

#### Summary

Add static overview screens that explain the future studio flow without adding behavior.

#### Implementation Spec

- Add static/read-only overview screens inside `Level1RecordingStudioRoom` for:
  - Transport.
  - Track List.
  - Clip Grid.
  - Device Rack.
  - Room Status.
- Keep all screens dim/static enough that they read as explanatory future-plan displays, not usable controls.
- Recommended placement and content:
  - Transport: west wall above/near DAW, near `[-22.28, 2.72, -4.6]`, facing east. Content: `120 BPM`, `4 / 4`, `STOPPED`, `LOCAL PREVIEW LATER`.
  - Clip Grid: west wall north of DAW, near `[-22.28, 1.78, -6.75]`, facing east. Content: `SCENES 01-04`, `EMPTY CLIPS`, `LAUNCH LATER`, plus a tiny static dim grid.
  - Track List: south wall above Piano / MIDI, near `[-17.2, 2.05, 0.69]`, facing north. Content: `DRUMS`, `BASS`, `FM SYNTH`, `PIANO`, `LOOPER`.
  - Device Rack: north wall between Instrument Rack and Effects Rack, near `[-16.95, 2.2, -8.68]`, facing south. Content: `INSTRUMENT`, `FILTER`, `ECHO`, `REVERB`, `CHAIN LATER`.
  - Room Status: east-side upper wall segment near `[-10.62, 2.45, -7.0]`, facing west and outside the doorway gap. Content: `STUDIO PLAN`, `VISUAL ONLY`, `NO AUDIO ENGINE`, `NO SYNC`.
- Include a small `STATIC PLAN` or `READ ONLY` footer on each screen.
- Use canvas textures and simple shallow backing meshes only.
- Do not add local DAW state, audio, Web Audio, interactions, sync, recording, transport runtime, clickable behavior, or SoundCloud processing.
- Do not change collisions, level config, movement, top-down controller, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- The Recording Studio visibly includes the five named overview screens.
- Screens are static/read-only, visually subdued, and do not activate reticle/clickable interactions.
- The screens explain the future studio flow without adding runtime behavior.
- V4-4 station shells remain visible and unchanged.
- The center lane and Control Room doorway clearance remain open.
- V4-3 room traversal/collision, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, reveal, and Tab top-down behavior remain preserved.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify all five screens are visible and readable enough from inside the Recording Studio.
- Manually verify the screens are dim/static and non-interactive.
- Manually verify the z `-4.6` doorway path and central lane remain clear.
- Manually spot-check V4-4 station shells, Tab top-down, Shooting Range entry/gameplay, jukebox, Audio Workbench, Exit, reveal, and recovery.

#### Risks

- Wall-facing rotations may be easy to invert; verify each screen faces into the room.
- Overbright accents could imply interactivity; keep screen glow and canvas details subdued.
- Too much text could be unreadable in first-person; prefer short lines and large monospace text.
- Wall screen placement could visually overlap station shells if mounted too low.

#### Non-Goals

- No usable screens, controls, hover states, click targets, or keyboard handling.
- No DAW model, transport state, clip state, track state, device state, or room status state.
- No audio, Web Audio, generated instruments, MIDI, recording, sync/reducer/session changes, collision changes, or SoundCloud processing.

#### Completed Implementation

- Added five static/read-only overview panels inside the Recording Studio: Transport, Track List, Clip Grid, Device Rack, and Room Status.
- Used dim canvas textures and shallow wall-mounted panels with a `STATIC PLAN` footer.
- Kept the screens decorative only, with no state, timers, interactions, audio, sync, collision, movement, or SoundCloud changes.
- Preserved V4-4 station shells and the central walking lane.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for screen visibility, facing direction, reticle non-activation, doorway clearance, Tab top-down, range, jukebox, Audio Workbench, Exit, reveal, and recovery remain pending.

### [x] Phase V4-6: Local DAW State Model

#### Summary

Create a local-only DAW state model for transport, tracks, clips, devices, and selected station.

#### Implementation Spec

- Add a local-only DAW state model in a small hook/module, such as `src/3d/useLocalDawState.ts`.
- Define exported local types for:
  - Transport state: `"stopped" | "playing" | "paused"`.
  - Station id: `"daw" | "piano-midi" | "looper" | "dj" | "instrument-rack" | "effects-rack"`.
  - Track id: `"drums" | "bass" | "fm-synth" | "piano" | "looper"`.
  - Device kind: `"instrument" | "filter" | "echo" | "reverb"`.
  - Clip state: `"empty" | "stopped" | "queued" | "playing" | "recording"`.
- Model local state with:
  - `transport`: state, bpm, time signature, bar, and beat.
  - `tracks`: id, label, color, muted, armed, volume, clip ids, and device ids.
  - `clips`: id, track id, scene index, label, state, and length in bars.
  - `devices`: id, track id, kind, label, enabled, and placeholder marker.
  - selected station id, selected track id, and selected scene index.
- Initial values:
  - Transport stopped at `120 BPM`, `4 / 4`, bar `1`, beat `1`.
  - Tracks: Drums, Bass, FM Synth, Piano, Looper.
  - Clips: 5 tracks x 4 scenes, all `empty`, 4 bars long.
  - Devices: placeholder Instrument/Filter/Echo/Reverb assignments across the five tracks.
  - Selected station `daw`, selected track `drums`, selected scene `0`.
- Prefer a factory such as `createInitialLocalDawState()` so arrays and nested objects are fresh.
- Data flow:
  - `ThreeDModeShell` calls `useLocalDawState()`.
  - `ThreeDModeShell` passes read-only state to `Level1RoomShell`.
  - `Level1RoomShell` passes read-only state to `Level1RecordingStudioRoom`.
  - `Level1RecordingStudioRoom` may derive existing overview screen lines from the state, with static fallback content if no state is provided.
- Return read-only `{ state }` from the hook for this phase; defer actions until V4-7/V4-8.
- Do not add Web Audio, audible output, timers, schedulers, `useFrame`, interactions, clickable behavior, sync/session reducer changes, or SoundCloud processing.
- Do not change collisions, level config, movement, top-down controller, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- A local-only DAW state model exists for transport, tracks, clips, devices, and selected station.
- The state is owned by the 3D shell or a small hook used by the 3D shell.
- No session/sync reducer changes are made.
- No audio, Web Audio, timers, interaction registration, clickable behavior, or SoundCloud processing is added.
- Recording Studio overview screens can read from the local state or keep equivalent static fallback values.
- V4-5 screens, V4-4 station shells, room traversal, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, reveal, and Tab top-down behavior remain preserved.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify the Recording Studio still renders with all station shells and overview screens.
- Manually verify preview values still show stopped transport, `120 BPM`, five tracks, four empty scenes, and placeholder devices.
- Manually verify screens remain non-interactive and do not activate reticle/click behavior.
- Manually spot-check doorway traversal, center lane, Tab top-down, Control Room, Shooting Range entry/gameplay, jukebox, Audio Workbench, Exit, reveal, and recovery.

#### Risks

- Passing state through `ThreeDModeShell` and `Level1RoomShell` may add re-render paths; keep this phase read-only and stable.
- Shared mutable initial objects could cause future mutation bugs; use a fresh-state factory.
- Adding action placeholders too early could imply behavior; keep V4-6 state-first.
- Derived overview screen text can become too verbose; keep formatting short and readable.

#### Non-Goals

- No transport controls, clip launching, selection interaction, recording, mixer behavior, device behavior, or station behavior.
- No audible output, Web Audio, generated instruments, MIDI, scheduling, metronome, or clock ticks.
- No sync/reducer/session events or multiplayer DAW sharing.
- No SoundCloud raw stream processing or SoundCloud integration.
- No collision, movement, top-down, area/opening/blocker/traversal, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery changes.

#### Completed Implementation

- Added a local-only DAW state hook with fresh initial state for transport, tracks, clips, devices, selected station, selected track, and selected scene.
- Scoped the state to the 3D shell and passed it read-only through `ThreeDModeShell` to `Level1RoomShell` and `Level1RecordingStudioRoom`.
- Updated Recording Studio overview screens to derive preview text from the local DAW state with static fallback values.
- Avoided actions, controls, interaction registration, audio/Web Audio, timers, sync/session reducers, SoundCloud processing, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for overview values, non-interaction, room traversal, Tab top-down, range, jukebox, Audio Workbench, Exit, reveal, and recovery remain pending.

### [x] Phase V4-7: Local Transport Controls

#### Summary

Make the DAW transport locally controllable from the DAW station.

#### Implementation Spec

- Add local-only DAW transport actions in `useLocalDawState`:
  - `toggleTransport`: switch between stopped and playing.
  - `stopTransport`: force stopped and reset transport preview position to bar `1`, beat `1`.
  - `adjustTempo(deltaBpm)`: update tempo with a hard clamp from `60` to `180` BPM.
- Return `{ state, actions }` from the local DAW hook and pass both through:
  - `ThreeDModeShell` -> `Level1RoomShell` -> `Level1RecordingStudioRoom`.
- Add exactly three small DAW station controls near the DAW station:
  - Play/Stop.
  - Tempo Down.
  - Tempo Up.
- Register interactions only for those three DAW station controls.
- Keep the controls visually local to the DAW desk and out of the z `-4.6` doorway/center walking lane.
- Update the existing Transport overview screen from local state so play/stop and BPM changes are visible in-world.
- Do not add audio, Web Audio, scheduling, timers, `useFrame`, clip controls, clip launching, recording, sync/session reducer changes, SoundCloud processing, or shared state.
- Do not change collision, level config, movement, top-down behavior, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- The DAW station exposes only three clickable local controls: Play/Stop, Tempo Down, and Tempo Up.
- The interaction reticle/click behavior appears only for those three new controls in the Recording Studio.
- Play/Stop changes only the local DAW transport state.
- Tempo Down and Tempo Up change only the local BPM, clamped to `60..180`.
- The Transport overview screen reflects the current local play/stop and BPM values.
- No audio is heard and no Web Audio/audio engine code is added.
- No sync/session reducer, SoundCloud, timer, clip, collision, movement, or top-down changes are made.
- V4-6 state flow, V4-5 screens, V4-4 station shells, room traversal, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, reveal, and Tab top-down behavior remain preserved.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify Play/Stop toggles the Transport screen between stopped and playing.
- Manually verify Tempo Down and Tempo Up update the Transport screen and clamp at `60` and `180` BPM.
- Manually verify only the three transport controls activate the reticle/click prompt.
- Manually verify there is no audible output.
- Manually verify clip grid, station shells, overview screens, and racks remain non-interactive.
- Manually spot-check doorway traversal, center lane, Tab top-down, Shooting Range entry/gameplay, jukebox, Audio Workbench, Exit, reveal, and recovery.

#### Risks

- Interaction target sizing could make the three controls hard to click; keep target meshes simple and slightly larger than the visible buttons.
- Too-bright controls could imply a fuller usable DAW surface; keep the surrounding station visuals dim/static and make only these three controls modestly active.
- State updates could cause unnecessary re-renders if actions are recreated often; memoize callbacks where practical.
- A future audio phase may need transport semantics adjusted; keep this phase local and preview-only.

#### Non-Goals

- No audible transport, metronome, Web Audio, generated instruments, MIDI, recording, scheduling, or clock ticks.
- No clip launching, clip selection, track selection, mixer behavior, device behavior, or station behavior beyond the three transport controls.
- No sync/reducer/session events, multiplayer transport, or shared DAW state.
- No SoundCloud raw stream processing or SoundCloud integration.
- No collision, movement, top-down, area/opening/blocker/traversal, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery changes.

#### Completed Implementation

- Added local DAW actions for play/stop, forced stop/reset, and tempo adjustment clamped to `60..180` BPM.
- Passed DAW actions alongside DAW state from `ThreeDModeShell` through `Level1RoomShell` to `Level1RecordingStudioRoom`.
- Added exactly three DAW station interactables: Play/Stop, Tempo Down, and Tempo Up.
- Kept updates local-only so the existing Transport overview screen reflects local transport state and BPM without audio, sync, timers, or clip changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for reticle targeting, play/stop screen updates, BPM clamping, no-audio behavior, room traversal, Tab top-down, range, jukebox, Audio Workbench, Exit, reveal, and recovery remain pending.

### [x] Phase V4-8: Clip Grid Visual State

#### Summary

Make the DAW station show a local clip grid with selectable/launchable empty clips.

#### Implementation Spec

- Add local-only clip grid actions in `useLocalDawState`:
  - `selectClip(clipId)`: select the clip's track and scene and keep selected station as `daw`.
  - `activateClipVisualState(clipId)`: select the clip and cycle its visual state.
- Extend the local clip state model with an `armed` visual state.
- Use this visual state cycle:
  - `empty -> armed`.
  - `armed -> playing`.
  - `playing -> stopped`.
  - `stopped -> armed`.
- When a clip becomes `playing`, set any other `playing` clip on the same track to `stopped`.
- Add a 5x4 clickable DAW clip grid at the DAW station:
  - columns: Drums, Bass, FM Synth, Piano, Looper.
  - rows: Scene 1-4.
  - place it on or just above the DAW tabletop, outside the z `-4.6` doorway/center walking lane.
- Use subdued static mesh states:
  - empty: dark cell with faint outline.
  - armed: muted amber/yellow.
  - playing: modest green/cyan.
  - stopped: muted blue/gray.
  - selected: thin bright outline or small raised overlay.
- Register one clickable interaction per clip cell, and keep V4-7 transport control interactions intact.
- Update the Clip Grid overview screen summary from local clip state, such as selected scene and playing/armed/empty counts.
- Do not add audio, Web Audio, scheduling, timers, `useFrame`, real clip playback, recording, MIDI, sync/session reducer changes, SoundCloud processing, or shared state.
- Do not change collision, level config, movement, top-down behavior, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- The DAW station shows a visible 5-track by 4-scene local clip grid.
- Each clip cell is clickable and updates only local DAW state.
- Clip visuals support empty, armed, playing, stopped, and selected states.
- Clicking a clip selects it and cycles its visual state.
- Only one clip per track can be visually playing; starting another clip on the same track stops the previous one visually.
- The Clip Grid overview screen reflects local selected scene and clip-state counts.
- V4-7 Play/Stop and Tempo controls still work and remain the only transport controls.
- No audio, Web Audio, scheduling, timers, real clip playback, sync/session reducer changes, SoundCloud processing, collision/config/movement/top-down changes, or shared state is added.
- V4-7 transport controls, V4-6 state flow, V4-5 screens, V4-4 station shells, room traversal, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, reveal, and Tab top-down behavior remain preserved.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify all 20 clip cells activate the reticle/click prompt.
- Manually verify clicking cells cycles empty, armed, playing, stopped, and selected visuals.
- Manually verify starting a playing clip stops any other playing clip on the same track visually.
- Manually verify the Clip Grid overview screen updates selected scene and clip-state counts.
- Manually verify V4-7 Play/Stop and Tempo controls still update the Transport screen.
- Manually verify no sound is produced.
- Manually spot-check doorway traversal, center lane, Tab top-down, Shooting Range entry/gameplay, jukebox, Audio Workbench, Exit, reveal, and recovery.

#### Risks

- Twenty interactables on the DAW desk may feel crowded; keep cells compact but aimable.
- Selected and stopped states can look too similar if the outline is too subtle.
- Strong playing/armed colors could imply real playback; keep all clip visuals dim/static.
- Placeholder state cycling may need revision when real clip launch, scheduling, and playback are designed.

#### Non-Goals

- No audible clip launch, Web Audio, generated instruments, MIDI, recording, metronome, scheduler, transport clock, or real playback.
- No clip contents, note data, quantization, scene launch, track launch, mixer behavior, device behavior, or piano/looper/DJ behavior.
- No sync/reducer/session events, multiplayer clip state, shared DAW state, or high-frequency performance events.
- No SoundCloud raw stream processing or SoundCloud integration.
- No collision, movement, top-down, area/opening/blocker/traversal, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery changes.

#### Completed Implementation

- Added local clip actions for selecting clips and cycling visual clip states.
- Added the `armed` visual clip state and the placeholder cycle `empty -> armed -> playing -> stopped -> armed`.
- Enforced one visually playing clip per track by stopping other playing clips on the same track.
- Added a 5x4 clickable DAW clip grid with selected-cell markers and subdued state colors.
- Updated the Clip Grid overview screen to summarize selected scene and playing/armed/empty counts.
- Preserved V4-7 transport controls and avoided audio, Web Audio, scheduling, sync, SoundCloud, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for all 20 clip cells, state cycling, same-track playing behavior, overview updates, V4-7 regression, no-audio behavior, traversal, Tab top-down, range, jukebox, Audio Workbench, Exit, reveal, and recovery remain pending.

### [x] Phase V4-9: Web Audio Engine Bootstrap

#### Summary

Add the app-owned Web Audio runtime foundation.

#### Implementation Spec

- Add a small local-only DAW audio engine hook/module, such as `src/3d/useLocalDawAudioEngine.ts`.
- Recommended hook interface:
  - `LocalDawAudioEngineStatus`: `"idle" | "unsupported" | "ready" | "suspended" | "closed" | "error"`.
  - `LocalDawAudioEngineState`: status, `isInitialized`, `isMuted`, `masterVolume`, and `errorMessage`.
  - `LocalDawAudioEngineActions`: `initialize`, `setMuted`, `toggleMuted`, `setMasterVolume`, and `cleanup`.
- Keep the audio engine scoped to `ThreeDModeShell` and pass read-only state/actions through:
  - `ThreeDModeShell` -> `Level1RoomShell` -> `Level1RecordingStudioRoom`.
- Create no `AudioContext` during render, mount, reveal, transport changes, or clip-grid clicks.
- Initialize `AudioContext` only from an explicit Recording Studio/DAW user gesture, such as one small `AUDIO INIT` or `ENGINE` control.
- On initialize:
  - use `window.AudioContext` or `window.webkitAudioContext`.
  - create a master gain node.
  - set default master gain to `0`.
  - connect master gain only to the local audio context destination.
  - resume the context if it starts suspended and the browser allows it from the same gesture.
- Default to muted/silent-safe behavior:
  - `isMuted: true`.
  - `masterVolume: 0`.
  - clamp master volume to a conservative range such as `0..0.5`.
  - effective gain remains `0` while muted.
- Add cleanup on 3D shell exit/unmount:
  - disconnect master gain.
  - close the audio context if it is not already closed.
  - guard/catch close or disconnect failures.
- Update Recording Studio Room Status visuals from local audio engine state, for example:
  - `AUDIO: OFF`.
  - `AUDIO: READY`.
  - `MUTED`.
  - `MASTER 0%`.
- Keep any audio init visual dim/static and separate from V4-7 transport controls and V4-8 clip grid cells.
- Prefer no audible output in this phase. Do not add a test tone unless a future approved phase explicitly asks for one.
- Do not add SoundCloud routing/processing, audible output, metronome scheduling, instruments, MIDI, recording, real clip playback, sync/session reducer changes, or shared audio state.
- Do not change collision, level config, movement, top-down behavior, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery behavior except for local audio cleanup on 3D shell exit/unmount.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- No `AudioContext` is created until the user explicitly activates the local audio init control.
- Local audio engine state is scoped to the 3D shell.
- A master gain node is created and connected only to the app-owned local `AudioContext`.
- Default engine behavior is silent and muted-safe.
- Cleanup disconnects/closes the local audio engine on 3D shell exit/unmount.
- Recording Studio Room Status visuals reflect local audio engine status.
- V4-7 transport controls and V4-8 clip grid controls remain intact.
- No audible output is added.
- No SoundCloud routing/processing, sync/session reducer changes, metronome scheduling, instruments, MIDI, recording, collision/config/movement/top-down changes, or real clip playback is added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify no `AudioContext` exists before activating the local audio init control.
- Manually activate the local audio init control and verify Room Status changes to ready, suspended, unsupported, or error as appropriate.
- Manually verify no sound is produced.
- Manually verify Exit/return/unmount cleans up the local audio context.
- Manually verify V4-7 Play/Stop and Tempo controls still update the Transport screen.
- Manually verify V4-8 clip grid still cycles visual states and updates the Clip Grid overview.
- Manually spot-check doorway traversal, center lane, Tab top-down, Shooting Range entry/gameplay, jukebox, Audio Workbench, reveal, and recovery.

#### Risks

- Browser `AudioContext` behavior differs after creation; tolerate running, suspended, closed, unsupported, and error states.
- Cleanup can throw if nodes or context are already closed; guard and catch cleanup calls.
- Any audible test tone could violate this phase boundary; keep V4-9 silent.
- A new DAW control could crowd the transport/clip grid surface; keep it small and visually subordinate.

#### Non-Goals

- No audible output, test tone, metronome, scheduler, transport clock, generated instruments, synths, drums, bass, MIDI, recording, or real clip playback.
- No effect devices, mixer behavior, meters, device chains, routing graph beyond master gain, or station behavior beyond local engine initialization/status.
- No SoundCloud raw stream processing, SoundCloud Web Audio routing, SoundCloud integration changes, or jukebox behavior changes.
- No sync/reducer/session events, multiplayer audio state, shared transport/audio authority, or high-frequency performance events.
- No collision, movement, top-down, area/opening/blocker/traversal, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery behavior changes beyond local audio cleanup.

#### Completed Implementation

- Added a local DAW audio engine hook with explicit `initialize`, mute/volume, and cleanup actions.
- Ensured `AudioContext` is created only from the in-world `studio-audio-init` control.
- Added muted/silent-safe master gain behavior with volume clamped to `0..0.5`.
- Passed audio engine state/actions through the 3D shell into the Recording Studio.
- Added a small DAW station `ENGINE` control and Room Status audio status lines.
- Added cleanup on 3D shell exit/unmount and avoided audible output, oscillators, metronome, instruments, SoundCloud routing, sync, and collision/movement changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for pre-init AudioContext absence, engine status updates, no-sound behavior, cleanup on Exit/unmount, V4-7/V4-8 regression, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-10: Metronome And Clock

#### Summary

Make local transport audible and measurable with a simple metronome/clock.

#### Implementation Spec

- Add local transport clock support in `useLocalDawState`:
  - add `advanceTransportBeat()`.
  - no-op unless transport state is `playing`.
  - advance beat within `4 / 4`; beat `4 -> 1` increments bar.
  - keep `stopTransport()` resetting bar and beat to `1.1`.
- Add local metronome support in `useLocalDawAudioEngine`:
  - add `playMetronomeTick(isAccent?: boolean)`.
  - no-op unless the local audio engine is initialized/ready, unmuted, and `masterVolume > 0`.
  - create only a very short oscillator/gain tick for the metronome.
  - keep tick gain quiet and safe, with beat-1 accent only slightly stronger.
  - stop and disconnect tick nodes after each tick.
- Add a local `setInterval` clock controller scoped to `ThreeDModeShell`.
  - run only while local transport state is `playing`.
  - interval uses current BPM: `60_000 / bpm`.
  - on each interval, call `playMetronomeTick(currentBeat === 1)` and `advanceTransportBeat()`.
  - clear interval on stop, BPM change, shell unmount, and shell exit.
- Keep all clock/metronome state local only; do not add synced clock or reducer/session events.
- Add mandatory small local audio safety controls near the existing `ENGINE` control:
  - `MUTE` toggle.
  - `VOL -`.
  - `VOL +`.
- Safety controls must:
  - use only existing local audio actions: `toggleMuted()` and `setMasterVolume()`.
  - clamp volume through the local audio engine's `0..0.5` master volume limit.
  - remain local/non-sync.
  - be visually subordinate to the DAW transport and clip grid controls.
- Do not auto-initialize audio from transport or clock code.
- Do not auto-unmute or auto-raise volume.
- Pressing Play before audio init should advance the visual clock but produce no sound.
- The quiet metronome should be audible only after explicit audio init, unmute, and safe volume increase.
- Keep Transport overview screen deriving BPM, play/stop, and `BAR beat` from local state.
- Do not add SoundCloud routing/processing, instruments, MIDI, recording, real clip playback, clip scheduling, sync/session reducer changes, or shared state.
- Do not change collision, level config, movement, top-down behavior, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery behavior beyond preserving V4-9 audio cleanup.
- Run `npm.cmd run build`.

#### Acceptance Criteria

- Pressing Play starts local bar/beat advancement.
- Pressing Stop resets the local visual clock to bar `1`, beat `1`.
- Tempo changes affect the local clock interval.
- No `AudioContext` is created by transport controls, clock mount, or clip-grid clicks.
- Metronome ticks remain silent until the local audio engine has been explicitly initialized, unmuted, and given safe volume above `0`.
- MUTE, VOL -, and VOL + controls exist near ENGINE and update only local audio engine state.
- Volume remains clamped to `0..0.5`.
- Each metronome tick stops and disconnects its temporary nodes.
- V4-7 transport controls, V4-8 clip grid, and V4-9 engine init/status/cleanup remain intact.
- No SoundCloud processing, sync/session reducer changes, instruments, MIDI, recording, real clip playback, collision/config/movement/top-down changes, or shared state is added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify no `AudioContext` exists before pressing ENGINE.
- Press Play before audio init and verify the Transport screen clock advances without sound.
- Press Stop and verify the clock resets to `1.1`.
- Initialize audio with ENGINE while muted at `0` volume and verify no sound.
- Use VOL + and MUTE to enable a safe volume and verify a quiet metronome tick.
- Use VOL - and MUTE to verify the tick becomes silent again.
- Change BPM and verify the visual beat cadence changes.
- Exit/unmount and verify the interval stops and V4-9 audio cleanup still runs.
- Manually spot-check V4-8 clip grid, V4-7 transport, doorway traversal, center lane, Tab top-down, Shooting Range entry/gameplay, jukebox, Audio Workbench, reveal, and recovery.

#### Risks

- `setInterval` can drift; acceptable for V4-10, but future phases need a proper lookahead scheduler.
- Browser autoplay rules can leave the audio context suspended; metronome should no-op safely or status should show suspended.
- Volume controls can make the placeholder DAW feel more complete than it is; keep them small and subdued.
- React state updates every beat are acceptable at this scale, but keep update paths narrow.

#### Non-Goals

- No synced clock, shared transport authority, reducer/session events, multiplayer audio state, or high-frequency performance sync.
- No SoundCloud raw stream processing, SoundCloud Web Audio routing, SoundCloud integration changes, or jukebox behavior changes.
- No generated instruments, synths, drums, bass, MIDI, recording, real clip playback, clip scheduling, scene launch, mixer meters, effects, or device chains.
- No professional audio scheduler, lookahead clock, latency compensation, count-in, or metronome settings beyond the quiet local tick.
- No collision, movement, top-down, area/opening/blocker/traversal, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery behavior changes.

#### Completed Implementation

- Added local transport beat advancement while transport is playing, with Stop resetting to bar `1`, beat `1`.
- Added a shell-scoped local clock controller using a BPM-derived interval that clears on stop, BPM changes, and unmount.
- Added a quiet metronome tick helper gated behind initialized/ready audio, unmuted state, and nonzero master volume.
- Added local `MUTE`, `VOL -`, and `VOL +` controls near the `ENGINE` control for safe manual metronome testing.
- Preserved V4-7 transport controls, V4-8 clip grid, V4-9 engine init/status/cleanup, and avoided sync, SoundCloud, instruments, real clip playback, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for visual clock advancement, safe audible metronome, mute/volume controls, no pre-init AudioContext, cleanup on Exit/unmount, V4-7/V4-8 regression, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-11: FM Synth Voice

#### Summary

Add the first generated instrument: a compact FM synth voice.

#### Implementation Spec

- Add a small local-only FM synth voice to the existing app-owned Web Audio engine.
- Expected code ownership when implemented:
  - `src/3d/useLocalDawAudioEngine.ts`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
- Keep the public surface phase-scoped and local:
  - add `LocalDawFmSynthPatch` with `carrierFrequency`, `modulationRatio`, `modulationIndex`, `envelopePreset`, and `gain`.
  - keep `LocalDawFmSynthNote` small with `label`, `frequency`, and optional `durationSeconds`.
  - expose `fmSynthPatch`, `lastFmSynthNoteLabel`, and `activeFmSynthVoiceCount` on `LocalDawAudioEngineState`.
  - expose `playFmSynthNote(note)`, `adjustFmSynthPatch(...)`, and `stopFmSynthVoices()` on `LocalDawAudioEngineActions`.
- Suggested local patch action shape:
  - accept a partial patch or a small delta action, as long as values stay clamped inside the audio engine.
  - clamp carrier/note frequencies to a safe musical range.
  - clamp modulation ratio, modulation index, envelope preset, and synth gain to conservative values.
- Route the FM synth through the existing local audio engine:
  - carrier oscillator plus modulator oscillator.
  - modulator gain drives carrier frequency.
  - voice gain/envelope feeds the existing master gain.
  - master gain remains the only path to `audioContext.destination`.
- Reuse the existing safety gates:
  - do not create or resume `AudioContext` from FM note or patch controls.
  - no-op unless audio is initialized/ready, unmuted, `masterVolume > 0`, and the context is running.
  - keep synth gain quiet even at maximum master volume.
  - stop and disconnect all temporary voice nodes after each note.
  - stop/disconnect active FM voices during audio cleanup and shell exit/unmount.
- Add tiny in-world controls inside the Recording Studio:
  - a few FM note audition pads near the Piano / MIDI or Instrument Rack station.
  - a tiny local FM patch surface for carrier, ratio, index, envelope preset, and gain.
  - keep controls dim/static and clearly placeholder-like, not a full piano, sequencer, patch editor, or device chain.
- In-world controls may update local Room Status or nearby labels with the last FM note, current patch summary, and active voice count.
- Do not add SoundCloud routing/processing, sync/reducer/session changes, MIDI input, MIDI recording/playback, clip scheduling, real clip playback, effects chain, device chain behavior, presets, automation, or persistence.
- Do not change collision, level config, movement, top-down behavior, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery behavior.
- Run `npm.cmd run build` after implementation.

#### Acceptance Criteria

- FM note pads are local-only and route through the existing app-owned audio engine/master gain.
- FM note pads do not initialize or resume audio.
- FM note pads are silent/no-op before `ENGINE`, while muted, or while master volume is `0`.
- After `ENGINE`, safe volume, and unmute, FM note pads produce short quiet FM notes.
- Carrier, ratio, index, envelope preset, and gain controls update only local FM patch state.
- Existing MUTE, VOL -, and VOL + controls still govern FM synth output.
- Active FM voices are stopped/disconnected after note end and during cleanup.
- V4-7 transport, V4-8 clip grid, V4-10 metronome/clock, room traversal, and top-down behavior remain intact.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify no `AudioContext` exists before pressing `ENGINE`.
- Press FM note/patch controls before `ENGINE` and verify no audio context is created.
- Press `ENGINE`, raise volume, unmute, and verify quiet FM audition notes.
- Verify MUTE and VOL controls affect FM output.
- Verify carrier, ratio, index, envelope, and gain controls visibly update local patch status.
- Verify Exit/unmount stops active FM voices and preserves audio cleanup.
- Spot-check metronome/clock, transport, clip grid, doorway traversal, center lane, Tab top-down, Shooting Range, jukebox, Audio Workbench, reveal, and recovery.

#### Non-Goals

- No SoundCloud raw stream processing, SoundCloud Web Audio routing, or jukebox behavior changes.
- No sync/session reducer changes, shared performance events, synced clock, or multiplayer DAW state.
- No MIDI input, MIDI recording, MIDI playback, piano live input, or clip scheduling.
- No real clip playback, DAW timeline playback, sequencer, arpeggiator, or full piano keyboard behavior.
- No effects chain, device chain DSP, presets, patch browser, automation, recording, or persistence.
- No collision, movement, top-down, area/opening/blocker/traversal, Control Room, Shooting Range, Audio Workbench, Exit, or recovery changes.

#### Completed Implementation

- Added local FM synth patch state for carrier frequency, modulation ratio, modulation index, envelope preset, and synth gain.
- Added local FM synth actions for note audition, patch adjustment, and stopping active voices.
- Routed FM voices through the existing app-owned Web Audio engine and master gain, with pads no-oping unless the engine is ready, unmuted, running, and above `0` master volume.
- Added tiny in-world FM note pads plus carrier, ratio, index, envelope, and gain controls on the Piano / MIDI station.
- Updated Room Status with FM note/voice and compact patch summaries.
- Fixed carrier control behavior so the current carrier frequency transposes the audition pad notes instead of only changing displayed state.
- Preserved V4-7 transport, V4-8 clip grid, V4-9 engine init/cleanup, V4-10 metronome/clock, and avoided SoundCloud, sync, MIDI, clip scheduling, effects, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for no pre-init AudioContext, FM pad silence before engine/unmute/volume, audible quiet FM notes after safe init, MUTE/VOL behavior, patch status updates, cleanup on Exit/unmount, metronome/clock regression, transport, clip grid, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-12: Drum Machine Voice

#### Summary

Add generated kick, snare, and hat voices.

#### Implementation Spec

- Add local-only procedural kick, snare, and hat audition voices to the existing app-owned Web Audio engine.
- Expected code ownership when implemented:
  - `src/3d/useLocalDawAudioEngine.ts`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
- Keep the public surface phase-scoped and local:
  - add `LocalDawDrumVoiceKind = "kick" | "snare" | "hat"`.
  - add `LocalDawDrumHit` with `kind` and `label`.
  - expose `lastDrumHitLabel` and `activeDrumVoiceCount` on `LocalDawAudioEngineState`.
  - expose `playDrumVoice(hit)` and `stopDrumVoices()` on `LocalDawAudioEngineActions`.
- Route all drum voices through the existing local audio engine:
  - procedural drum voice nodes feed a per-hit gain envelope.
  - per-hit gain feeds the existing master gain.
  - master gain remains the only path to `audioContext.destination`.
- Voice recommendations:
  - kick: sine or triangle oscillator with a short pitch sweep, such as `130Hz -> 48Hz`, and a short gain envelope.
  - snare: generated noise burst from an `AudioBufferSourceNode`, optionally with a quiet tonal oscillator and simple filter shaping.
  - hat: generated noise burst from an `AudioBufferSourceNode` through a highpass filter and very short gain envelope.
- Use generated Web Audio nodes only. Do not use samples, sample loading, fetched assets, imported audio files, or external drum assets.
- Reuse the existing safety gates:
  - do not create or resume `AudioContext` from drum pads.
  - no-op unless audio is initialized/ready, unmuted, `masterVolume > 0`, and the context is running.
  - keep drum hits short and quiet even at maximum master volume.
  - stop and disconnect all temporary drum nodes after each hit.
  - stop/disconnect active drum voices during audio cleanup and shell exit/unmount.
  - cap overlapping drum voices defensively, such as at `6`.
- Add tiny in-world controls inside the Recording Studio:
  - three small clickable pads: `KICK`, `SNARE`, and `HAT`.
  - recommended placement is on or near the Looper station, outside the center walking lane and doorway path.
  - register only `studio-drum-kick`, `studio-drum-snare`, and `studio-drum-hat`.
  - keep pads dim/static and clearly audition placeholders, not a full drum machine, step sequencer, or pattern grid.
- Optional Room Status or nearby label may show last drum hit and active drum voice count if it does not remove critical audio/FM/no-sync status.
- Do not add SoundCloud routing/processing, sync/reducer/session changes, MIDI input, MIDI recording/playback, clip scheduling, real pattern playback, step sequencer, effects chain, device chain behavior, mixer meters, presets, automation, recording, or persistence.
- Do not change collision, level config, movement, top-down behavior, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery behavior.
- Run `npm.cmd run build` after implementation.

#### Acceptance Criteria

- Three in-world drum audition pads exist and are clickable: kick, snare, and hat.
- Drum pads are local-only and route through the existing app-owned audio engine/master gain.
- Drum pads do not initialize or resume audio.
- Drum pads are silent/no-op before `ENGINE`, while muted, or while master volume is `0`.
- After `ENGINE`, safe volume, and unmute, drum pads produce short quiet procedural hits.
- No samples or external audio assets are used.
- Existing MUTE, VOL -, and VOL + controls govern drum output.
- Active drum voices stop/disconnect after hit end and during cleanup.
- V4-10 metronome/clock and V4-11 FM synth remain intact.
- No SoundCloud routing/processing, sync/session reducer changes, MIDI, clip scheduling, pattern playback, effects chain, collision/config/movement/top-down changes, or unrelated refactors are added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify no `AudioContext` exists before pressing `ENGINE`.
- Press drum pads before `ENGINE` and verify no audio context is created.
- Press `ENGINE`, raise volume, unmute, and verify quiet kick, snare, and hat hits.
- Verify MUTE and VOL controls affect drum output.
- Verify metronome/clock still works.
- Verify FM synth note pads and patch controls still work.
- Verify Exit/unmount stops active drum voices and preserves audio cleanup.
- Spot-check doorway traversal, center lane, Tab top-down, Shooting Range, jukebox, Audio Workbench, reveal, and recovery.

#### Non-Goals

- No samples, sample loading, imported audio, fetches, or drum asset files.
- No SoundCloud raw stream processing, SoundCloud Web Audio routing, or jukebox behavior changes.
- No sync/session reducer changes, shared drum state, synced clock, or multiplayer DAW state.
- No MIDI input, MIDI recording, MIDI playback, piano live input, or clip scheduling.
- No real pattern playback, step sequencer, quantization, clip playback, DAW timeline playback, or transport-linked drum patterns.
- No effects chain, device chain DSP, mixer meters, presets, automation, recording, or persistence.
- No collision, movement, top-down, level config, area/opening/blocker/traversal, Control Room, Shooting Range, Audio Workbench, Exit, or recovery changes.

#### Completed Implementation

- Added local procedural drum state/actions for `kick`, `snare`, and `hat` audition hits.
- Added generated Web Audio kick, snare, and hat voices using oscillator/noise-buffer nodes only, routed through the existing master gain.
- Reused the existing audio safety gate so drum pads no-op before `ENGINE`, while muted, while suspended/not ready, or at `0` master volume.
- Added active drum voice cleanup and included drum voices in audio cleanup/exit teardown.
- Added three tiny Looper-area in-world drum pads: `KICK`, `SNARE`, and `HAT`.
- Updated Room Status with last drum hit and active drum voice count while preserving audio/FM/no-sync status.
- Preserved V4-10 metronome/clock and V4-11 FM synth behavior, and avoided samples, SoundCloud, sync, MIDI, clip scheduling, pattern playback, effects, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for no pre-init AudioContext, drum pad silence before engine/unmute/volume, audible quiet kick/snare/hat after safe init, MUTE/VOL behavior, FM/metronome regression, cleanup on Exit/unmount, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-13: Bass Machine Voice

#### Summary

Add a generated bass machine for simple bassline patterns.

#### Implementation Spec

- Add a local app-owned bass machine voice that uses generated oscillator/filter/envelope nodes.
- Expected code ownership when implemented:
  - `src/3d/useLocalDawAudioEngine.ts`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
- Keep the public surface phase-scoped and local:
  - add `LocalDawBassMachinePatch` with `waveform`, `cutoffFrequency`, `resonance`, `envelopeAmount`, `decaySeconds`, and `gain`.
  - add `LocalDawBassNote` with `label`, `frequency`, and optional `durationSeconds`.
  - expose `bassMachinePatch`, `lastBassNoteLabel`, `activeBassVoiceCount`, and `isBassPatternAuditioning` on `LocalDawAudioEngineState`.
  - expose `playBassNote(note)`, `adjustBassMachinePatch(...)`, `playBassPatternAudition()`, and `stopBassVoices()` on `LocalDawAudioEngineActions`.
- Route all bass output through the existing local audio engine:
  - oscillator feeds a lowpass filter.
  - filter feeds a per-voice gain envelope.
  - gain envelope feeds the existing master gain.
  - master gain remains the only path to `audioContext.destination`.
- Voice recommendations:
  - default waveform: `sawtooth`; allow a tiny `square` toggle.
  - lowpass filter with envelope sweep from a higher cutoff down toward `cutoffFrequency`.
  - conservative resonance, envelope amount, decay, and gain clamps.
  - bass note frequency clamp around `41.2Hz..220Hz`.
- Add tiny in-world controls near the Instrument Rack:
  - note audition pads: `E1`, `G1`, `A1`, and `B1`.
  - patch controls: `WAVE`, `CUTOFF`, `RES`, `ENV`, and `GAIN`.
  - a tiny `RIFF` audition control.
- `RIFF` is required for this phase and must satisfy "local pattern playback only" in the smallest possible way:
  - it is a short hardcoded local bass demo owned entirely by the audio engine.
  - it must not use DAW transport, clip grid, clip state, MIDI, reducers, sync, shared state, or any persistent pattern state.
  - it must be safety-gated exactly like bass notes.
  - it must be fully stopped/reset by `stopBassVoices()` and audio cleanup.
  - it may use local `setTimeout` handles or Web Audio start times inside the audio engine only.
- Keep all controls dim/static and placeholder-like; do not make a full sequencer or pattern editor.
- Reuse the existing safety gates:
  - do not create or resume `AudioContext` from bass note, patch, or `RIFF` controls.
  - no-op unless audio is initialized/ready, unmuted, `masterVolume > 0`, and the context is running.
  - keep bass output quiet even at maximum master volume.
  - stop and disconnect all temporary bass nodes after each note.
  - stop/disconnect active bass voices and clear RIFF audition handles during audio cleanup and shell exit/unmount.
  - cap overlapping bass voices defensively, such as at `3`.
- Existing MUTE, VOL -, and VOL + controls govern bass output.
- Optional Room Status or nearby label may show last bass note, active bass voice count, and riff audition status if it does not remove critical audio/FM/drum/no-sync status.
- Do not add samples, SoundCloud routing/processing, sync/reducer/session changes, MIDI input, MIDI recording/playback, clip scheduling, real clip playback, persistent pattern state, step sequencer, effects chain, device chain behavior, mixer meters, presets, automation, recording, or persistence.
- Do not change collision, level config, movement, top-down behavior, areas, openings, blockers, traversal surfaces, Control Room, Shooting Range, jukebox, Audio Workbench, or Exit/recovery behavior.
- Run `npm.cmd run build` after implementation.

#### Acceptance Criteria

- Bass note controls exist and are clickable.
- A tiny `RIFF` control exists and plays only a short hardcoded local bass demo.
- Bass voice is generated locally from oscillator/filter/envelope nodes.
- Bass routes through the existing master gain only.
- Bass controls do not initialize or resume audio.
- Bass notes and `RIFF` are silent/no-op before `ENGINE`, while muted, or at master volume `0`.
- After `ENGINE`, safe volume, and unmute, bass note pads produce short quiet bass notes.
- `RIFF` does not use transport, clips, MIDI, sync, reducers, shared state, or persistent pattern state.
- Existing FM synth, drum pads, metronome/clock, transport, and clip visuals remain intact.
- Cleanup stops active bass voices and any local RIFF audition handles.
- No SoundCloud routing/processing, sync/session reducer changes, MIDI, clip scheduling, persistent pattern playback, effects chain, collision/config/movement/top-down changes, or unrelated refactors are added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually verify no `AudioContext` exists before pressing `ENGINE`.
- Press bass notes, patch controls, and `RIFF` before `ENGINE`; verify no audio context is created.
- Press `ENGINE`, raise volume, unmute, and verify quiet bass notes.
- Verify `WAVE`, `CUTOFF`, `RES`, `ENV`, and `GAIN` controls update local patch state and affect bass auditions where audible.
- Press `RIFF` and verify a short local bass demo only.
- Verify MUTE and VOL controls affect bass output.
- Verify FM synth, drum pads, and metronome/clock still work.
- Verify Exit/unmount stops active bass voices and RIFF audition handles.
- Spot-check doorway traversal, center lane, Tab top-down, Shooting Range, jukebox, Audio Workbench, reveal, and recovery.

#### Non-Goals

- No samples, sample loading, imported audio, fetches, or bass asset files.
- No SoundCloud raw stream processing, SoundCloud Web Audio routing, or jukebox behavior changes.
- No sync/session reducer changes, shared bass state, synced clock, or multiplayer DAW state.
- No MIDI input, MIDI recording, MIDI playback, piano live input, or clip scheduling.
- No real clip playback, DAW pattern grid, step sequencer, quantization, arrangement, or transport-linked bassline.
- No persistent pattern state beyond the transient hardcoded RIFF audition.
- No effects chain, device chain DSP, mixer meters, track routing, presets, automation, recording, or persistence.
- No collision, movement, top-down, level config, area/opening/blocker/traversal, Control Room, Shooting Range, Audio Workbench, Exit, or recovery changes.

#### Completed Implementation

- Added a local generated bass machine patch/status surface for waveform, cutoff, resonance, envelope amount, decay, gain, last bass note, active voices, and RIFF audition state.
- Added bass actions for note audition, patch adjustment, hardcoded local RIFF audition, and stopping active bass voices.
- Implemented bass voices as oscillator to lowpass filter to gain envelope to the existing master gain.
- Added cleanup for active bass voices and local RIFF timeout handles during audio cleanup/exit teardown.
- Added tiny Instrument Rack bass controls for `E1`, `G1`, `A1`, `B1`, `WAVE`, `CUTOFF`, `RES`, `ENV`, `GAIN`, and `RIFF`.
- Kept `RIFF` as a short audio-engine-local demo only, without DAW transport, clips, MIDI, reducers, sync, shared state, or persistent pattern state.
- Updated Room Status with compact bass/RIFF state while preserving audio/FM/drum/no-sync status.
- Preserved existing FM synth, drum pads, metronome/clock, transport, clip visuals, and avoided samples, SoundCloud, sync, MIDI, real clip playback, effects, mixer/device chain behavior, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for no pre-init AudioContext, bass controls/RIFF silence before engine/unmute/volume, audible quiet bass notes/RIFF after safe init, patch behavior, MUTE/VOL behavior, FM/drum/metronome regression, cleanup on Exit/unmount, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-14: Piano Station Render

#### Summary

Render a playable-looking piano/MIDI controller station.

#### Implementation Spec

- Upgrade the Piano / MIDI station from a simple placeholder into a playable-looking controller surface.
- Expected code ownership when implemented:
  - `src/3d/Level1RecordingStudioRoom.tsx`.
- This phase is render-only:
  - do not add new `useLocalDawState` fields or actions.
  - do not add new interactables or clickable piano controls.
  - do not change the local audio engine.
- Render visual-only piano/controller elements:
  - a larger controller body on the existing Piano / MIDI station.
  - a clear keyboard with distinct white and black key meshes.
  - visual octave buttons: `OCT -` and `OCT +`.
  - a visual `ARM` indicator.
  - a visual target-track display.
- Target-track display may:
  - derive from existing `localDawState?.selectedTrackId`, or
  - stay fixed to `TARGET: PIANO`.
  - It must not require new state.
- Piano keys, octave buttons, ARM indicator, and target-track display are meshes/canvas only.
- Preserve the V4-11 FM synth controls:
  - keep FM note pads and patch controls available.
  - adjust the Piano / MIDI local layout if needed so FM controls do not overlap incoherently with the new keyboard.
  - keep FM controls visually separate from piano keys, such as an upper/back strip above the keybed.
- Suggested local layout:
  - piano keyboard on the lower/front part of the station.
  - visual octave/ARM/target controls on a small upper/back strip.
  - FM synth controls remain a compact audition strip above or behind the keyboard.
- Keep the station footprint and walking lanes unchanged.
- Do not add note triggering, audio from piano keys, MIDI input, MIDI recording/playback, clip scheduling, real clip playback, sync/reducer/session changes, SoundCloud routing/processing, effects chain, mixer/device chain behavior, collision/config/movement/top-down changes, or unrelated refactors.
- Run `npm.cmd run build` after implementation.

#### Acceptance Criteria

- Piano / MIDI station visibly reads as a real controller rather than a placeholder.
- Keyboard has distinct white and black keys.
- `OCT -`, `OCT +`, `ARM`, and target-track display are visible and legible.
- No piano key, octave, ARM, or target-track element is clickable in this phase.
- FM synth note pads and patch controls remain visible and usable.
- FM synth controls do not overlap incoherently with the new piano render.
- No piano element triggers sound.
- No state/actions are added to `useLocalDawState`.
- No audio engine changes are added.
- V4-11 FM synth, V4-12 drums, V4-13 bass, V4-10 metronome/clock, transport, and clip visuals remain intact.
- No MIDI, recording, clip scheduling, sync/reducer/session changes, SoundCloud routing/processing, collision/config/movement/top-down changes, or unrelated refactors are added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually inspect the Piano / MIDI station in the Recording Studio.
- Verify the keyboard, octave buttons, ARM indicator, and target-track display are visible and legible.
- Verify piano keys and visual controls are not clickable.
- Verify FM synth controls are still visible and usable.
- Verify FM synth, drums, bass, and metronome still work.
- Spot-check center lane, doorway traversal, Tab top-down, Shooting Range, jukebox, Audio Workbench, reveal, and recovery.

#### Non-Goals

- No piano note triggering or audio from piano keys.
- No Web Audio or local audio engine changes.
- No MIDI input, MIDI recording, MIDI playback, piano live input, keyboard fallback, note trails, quantization, or clip writing.
- No new `useLocalDawState` fields/actions.
- No new piano interactables or clickable controls.
- No clip scheduling, real clip playback, DAW pattern grid, reducer/session sync, shared state, or persistent piano state.
- No SoundCloud routing/processing or jukebox changes.
- No effects chain, mixer, device chain, track routing changes, automation, presets, or recording.
- No collision/config/movement/top-down/area/opening/blocker/traversal changes.

#### Completed Implementation

- Upgraded the Piano / MIDI station render with a fuller controller body and a distinct white/black keyboard surface.
- Added visual-only `OCT -`, `OCT +`, `ARM`, and target-track display controls.
- Derived the target-track display from existing local DAW selected-track data without adding new state or actions.
- Preserved the V4-11 FM synth controls and nudged them upward/back so they remain available without overlapping the new piano surface.
- Kept all piano elements non-interactive and avoided audio engine, note triggering, MIDI, recording, clip scheduling, sync/reducer, SoundCloud, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for piano station readability, non-clickable piano controls, FM control visibility/usability, FM/drum/bass/metronome regression, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-15: Piano Live Input

#### Summary

Make the piano/MIDI station play local notes live.

#### Implementation Spec

- Add clickable in-world piano keys only; do not add keyboard fallback in this phase.
- Keep target selection local and simple:
  - Route to Bass only when existing `localDawState?.selectedTrackId === "bass"`.
  - Route to FM Synth for all other selected tracks or missing state.
- Add small, phase-scoped local audio engine types/actions:
  - `LocalDawPianoLiveTarget = "fm-synth" | "bass"`.
  - `LocalDawPianoLiveNote` with `label`, `frequency`, and optional `durationSeconds`.
  - `LocalDawAudioEngineState.lastPianoLiveNoteLabel`.
  - `LocalDawAudioEngineState.lastPianoLiveTarget`.
  - `LocalDawAudioEngineActions.playPianoLiveNote(note, target?)`.
- Reuse existing generated FM and Bass voice paths so piano notes route through the existing local audio engine and master gain.
- Use short trigger-style notes only; no held note-on/note-off model yet.
- Register only the piano key meshes as new interactables. Keep octave buttons, ARM indicator, and target display visual-only.
- Use a compact two-octave-ish key map matching the V4-14 rendered keys:
  - White keys: `C3`, `D3`, `E3`, `F3`, `G3`, `A3`, `B3`, `C4`, `D4`, `E4`, `F4`, `G4`, `A4`, `B4`.
  - Black keys: `C#3`, `D#3`, `F#3`, `G#3`, `A#3`, `C#4`, `D#4`, `F#4`, `G#4`, `A#4`.
- Update piano visuals/status to show the effective live target and last live note.
- Preserve existing FM pads/patch controls, drum pads, bass pads/RIFF, transport, clip grid, metronome, engine init, mute, and volume controls.
- Safety requirements:
  - Piano key clicks must not initialize, resume, or create `AudioContext`.
  - `playPianoLiveNote` must no-op unless the existing engine readiness gates pass: initialized, ready/running, unmuted, volume greater than 0, and master gain present.
  - Existing `cleanup()`, `stopFmSynthVoices()`, and `stopBassVoices()` remain authoritative cleanup paths.
- Do not add new `useLocalDawState` fields/actions.
- Do not write MIDI clips, clip state, selected scene content, transport state, reducers, sync/session state, or SoundCloud state.
- Do not change collision, config, movement, top-down, traversal, openings, blockers, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, or reveal behavior.

#### Acceptance Criteria

- In-world piano white and black keys are clickable and trigger short generated notes only after ENGINE has been explicitly initialized and audio is unmuted with volume above 0.
- FM Synth is the default live target; Bass is used only when the existing selected track is `bass`.
- Piano key clicks do not create or resume `AudioContext`.
- Last piano live note and target are reflected in local visuals/status.
- Piano input does not alter clip state, transport state, recording state, reducers, sync/session state, MIDI data, or SoundCloud behavior.
- Existing V4-7 through V4-14 controls and visuals continue to work.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually enter the Recording Studio and verify existing traversal and station placement still look correct.
- Click ENGINE, unmute, raise volume, then click several piano white and black keys.
- Verify notes are silent while muted, at 0 volume, uninitialized, or not ready.
- Select/click a Bass track/clip cell, then click piano keys and verify Bass-targeted notes.
- Verify clip grid state, transport, recording, sync, SoundCloud, top-down, movement, jukebox, range, Audio Workbench, Exit/recovery, and reveal behavior remain unchanged.

#### Risks

- Many key interactables may add registration noise; keep IDs stable and meshes simple.
- Reusing FM/Bass helpers requires care so existing audition pads keep their current behavior.
- Keyboard fallback would conflict with movement/top-down controls, so it is explicitly deferred.

#### Non-Goals

- No keyboard fallback or global typing controls.
- No MIDI clip recording, MIDI device input, note quantization, or recorded note display.
- No clip playback, clip scheduling, DAW transport coupling, or persistent pattern state.
- No sync/reducer/session changes.
- No SoundCloud routing or processing.
- No effects chain or mixer/device chain behavior.
- No collision/config/movement/top-down changes.

#### Completed Implementation

- Added local piano live-note audio status/action types for live target, live note, last played piano note, and last live target.
- Added `playPianoLiveNote()` through the local audio engine with the existing readiness gate, so key clicks do not create/resume `AudioContext`.
- Routed piano live input to FM Synth by default and to Bass only when existing `localDawState.selectedTrackId` is `bass`.
- Made the rendered white and black piano keys clickable in-world while keeping octave buttons, ARM indicator, and displays visual-only.
- Updated piano and Room Status visuals with live target and last piano note.
- Preserved FM pads, drum pads, bass pads/RIFF, metronome/clock, transport, clip visuals, and audio safety controls, while avoiding recording, MIDI clip writing, clip scheduling/playback, sync/reducers, SoundCloud, effects/mixer behavior, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for piano key audio after safe init, mute/volume gating, Bass target via selected track, no clip/transport/recording mutation, FM/drum/bass/metronome regression, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-16: MIDI Clip Recording

#### Summary

Record piano input into local MIDI-style clips.

#### Implementation Spec

- Add local-only MIDI-style note event data to `useLocalDawState`; do not add playback yet.
- Add local TypeScript state/action shape:
  - `LocalDawNoteSource = "piano-live"`.
  - `LocalDawNoteInput` with `label`, `frequency`, optional `durationSeconds`, and optional `source`.
  - `LocalDawMidiNoteEvent` with `id`, `clipId`, `trackId`, `sceneIndex`, `label`, `frequency`, `startBar`, `startBeat`, `stepIndex`, `durationBeats`, `velocity`, `source`, and `recordedAtBpm`.
  - `LocalDawState.midiNotes`.
  - `LocalDawState.lastRecordedNoteId`.
  - `LocalDawActions.toggleSelectedClipRecording()`.
  - `LocalDawActions.recordPianoNoteEvent(note)`.
- Use the current selected local clip: clip whose `trackId === selectedTrackId` and `sceneIndex === selectedSceneIndex`.
- Piano key behavior:
  - Keep V4-15 live note playback first via `playPianoLiveNote()`.
  - Also call `recordPianoNoteEvent(note)` for local recording.
  - If the selected clip is `recording`, append a quantized note event.
  - If the selected clip is `armed`, promote it to `recording` and append the note.
  - If the selected clip is not `armed` or `recording`, do not record.
- Recording control:
  - Make exactly one piano-station recording control clickable: the ARM/REC indicator.
  - Use stable interactable ID `studio-piano-record-toggle`.
  - The control calls only `toggleSelectedClipRecording()`.
  - The toggle affects only local DAW selected clip/track arming and recording state.
  - The toggle has no audio engine dependency.
  - Piano keys remain clickable for live input and recording.
  - Octave, target, and last-note displays remain visual-only.
- Recording state rules:
  - `toggleSelectedClipRecording()` toggles selected clip between non-recording and `recording`.
  - When entering recording, set selected track `armed: true`.
  - When leaving recording, set selected clip to `stopped` if it has notes, otherwise `armed`.
  - Keep one recording clip per track by stopping any other `recording` clip on the same track.
- Quantize with existing local transport only; do not add a scheduler:
  - Use `transport.bar`, `transport.beat`, and `transport.bpm`.
  - `relativeBar = ((transport.bar - 1) % selectedClip.lengthBars) + 1`.
  - `startBeat = clamp(transport.beat, 1, 4)`.
  - `stepIndex = (relativeBar - 1) * 16 + (startBeat - 1) * 4`.
  - Store a small fixed or clamped `durationBeats`; store `recordedAtBpm` for display/debug only.
- Display recorded notes at small scope:
  - Clip grid cells show tiny note ticks/mini bars for notes in that clip.
  - Recording clips get a clear static REC outline.
  - Piano UI shows `REC`, `ARM`, or idle status, plus selected clip note count.
  - Clip Grid overview shows selected clip note count.
- Recording must work without audio readiness: no `AudioContext`, ENGINE init, unmute, or volume requirement.
- Keep all note data local to `useLocalDawState`; do not route note data to sync, reducers/session state, persistence, SoundCloud, or audio scheduling.
- Do not change audio engine behavior except continuing to call existing live input from V4-15.
- Do not change collision, config, movement, top-down, traversal, openings, blockers, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, or reveal behavior.

#### Acceptance Criteria

- Piano key clicks still trigger V4-15 live notes.
- The ARM/REC piano indicator is the only new non-key recording interactable and uses ID `studio-piano-record-toggle`.
- The recording toggle updates only local selected clip/track arming and recording state.
- Selected armed clip starts recording on first piano key click and records that note.
- Selected recording clip appends quantized local note events on piano key clicks.
- Non-armed/non-recording clips do not receive notes.
- Recording works even when the audio engine is off, muted, or volume is 0.
- Recorded notes appear as small visual markers in the selected clip/piano UI.
- No recorded note data leaves local 3D DAW state.
- No clip playback occurs.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually select a clip cell, toggle ARM/REC, and click piano keys.
- Verify notes record at transport `1.1` while stopped.
- Start local transport, click piano keys, and verify note markers advance by current beat.
- Verify muted/off audio still permits recording.
- Verify unarmed clips do not record.
- Verify the ARM/REC control affects only local DAW state and does not initialize audio.
- Verify no clip playback, sync, SoundCloud, MIDI device, effects/mixer, collision/config/movement/top-down changes occurred.
- Spot-check FM/drum/bass controls, metronome, traversal, top-down, range, jukebox, Audio Workbench, Exit/recovery, and reveal.

#### Risks

- Existing clip cell visual state cycling must keep working when recording state is added.
- Beat-level quantization is intentionally coarse because the local transport only exposes bar/beat.
- Piano key clicks now do live audio plus local recording; recording failures must not block live audio.
- Note marker density can become noisy; keep the display minimal and capped/compact.

#### Non-Goals

- No clip playback; V4-17 owns playback.
- No MIDI device support.
- No keyboard fallback changes.
- No professional scheduler or sub-beat timing engine.
- No sync/reducer/session changes.
- No SoundCloud routing or processing.
- No effects, mixer, or device chain changes.
- No collision/config/movement/top-down changes.

#### Completed Implementation

- Added local-only MIDI-style note event state, note input/source types, `midiNotes`, and `lastRecordedNoteId` to local DAW state.
- Added local recording actions for toggling selected clip recording and recording piano live note events.
- Made piano key clicks continue live playback first, then record into the selected local clip when that clip is armed or recording.
- Added exactly one new piano-station recording toggle interactable, `studio-piano-record-toggle`, which only updates local DAW clip/track state.
- Added coarse beat-based quantization from local transport bar/beat/BPM without adding timers or schedulers.
- Added compact recorded-note markers in clip cells and piano UI, plus selected clip note count/recording status.
- Kept recording independent of audio engine readiness and avoided playback, sync/reducers, SoundCloud, MIDI device support, effects/mixer/device chain changes, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for recording while audio is muted/off, selected armed/recording clip behavior, no unarmed recording, no clip playback, no sync/SoundCloud/MIDI side effects, FM/drum/bass/metronome regression, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-17: Clip Playback

#### Summary

Play recorded local MIDI clips through generated instruments.

#### Implementation Spec

- Add local-only playback for recorded V4-16 MIDI-style clip notes.
- Expected files:
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/ThreeDModeShell.tsx`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
- Avoid `src/3d/useLocalDawAudioEngine.ts` unless a tiny type/action alignment is unavoidable; existing generated audio actions should be sufficient.
- Add small local playback status shape:
  - `LocalDawPlaybackTrigger` with `clipId`, `noteId`, `trackId`, `label`, `bar`, and `beat`.
  - `LocalDawState.lastPlaybackTrigger`.
  - `LocalDawActions.markClipNotePlayback(trigger)`.
  - `LocalDawActions.stopAllClipPlayback()`.
- `markClipNotePlayback()` updates local visual/status state only.
- `stopAllClipPlayback()` sets all `playing` clips to `stopped` and clears `lastPlaybackTrigger`.
- Existing `activateClipVisualState()` may continue cycling clips into `playing`; do not add a full clip-launch model yet.
- Update `stopTransport()` to stop transport and clear playback status without deleting recorded notes.
- Playback controller:
  - Extend or split `LocalDawClockController` in `ThreeDModeShell.tsx`.
  - Run only when `localDawState.transport.state === "playing"`.
  - Tie playback to the existing BPM interval and local bar/beat clock.
  - On each interval tick, trigger matching recorded notes for clips whose `state === "playing"`, then call `advanceTransportBeat()`.
  - Preserve existing metronome tick behavior.
  - Do not add a professional scheduler, sub-beat timing, audio timeline scheduling, Web Worker, or sync clock.
- Loop matching:
  - `relativeBar = ((transport.bar - 1) % clip.lengthBars) + 1`.
  - `currentBeat = transport.beat`.
  - Trigger notes where `note.clipId === clip.id`, `note.startBar === relativeBar`, and `note.startBeat === currentBeat`.
- Avoid duplicate triggering:
  - Keep a local controller ref of triggered beat keys.
  - Key by clip/note/current loop position, e.g. `clipId:noteId:transportBar:transportBeat`.
  - Clear the ref when transport stops, BPM changes, or clip/note data changes substantially.
- Track routing through existing generated audio actions:
  - `fm-synth`: `playFmSynthNote({ label, frequency, durationSeconds })`.
  - `piano`: `playPianoLiveNote({ label, frequency, durationSeconds }, "fm-synth")`.
  - `bass`: `playBassNote({ label, frequency: downshift/clamp as needed, durationSeconds })`.
  - `drums`: map recorded note labels/frequency coarsely to Kick/Snare/Hat and call `playDrumVoice()`.
  - `looper`: no audio in V4-17, but allow visual playback status.
- Playback audio must obey existing audio engine readiness, mute, and volume gates because the audio actions already no-op unless the engine is ready/running and audible.
- Visuals:
  - Clip grid cells in `playing` state keep playing color and show a tiny current-beat/playback marker.
  - Notes matching `lastPlaybackTrigger.noteId` get a brief static highlight.
  - Clip Grid overview shows playing count and last playback note.
  - Piano/DAW status may show `PLAY <note>` when playback triggers.
- Safety and cleanup:
  - Playback must not initialize or resume `AudioContext`.
  - On transport stop, clear playback status and duplicate-trigger refs.
  - Existing audio cleanup remains responsible for voice cleanup on shell exit/unmount.
  - Do not delete recorded notes when playback stops.
  - Preserve V4-16 recording behavior.
- Keep all playback state local to the 3D DAW model; do not write to sync, reducers/session state, persistence, SoundCloud, or shared state.
- Do not change collision, config, movement, top-down, traversal, openings, blockers, Control Room, Shooting Range, jukebox, Audio Workbench, Exit/recovery, or reveal behavior.

#### Acceptance Criteria

- Recorded notes in a `playing` clip trigger locally when transport is playing.
- Playback loops using each clip's `lengthBars`.
- FM, Piano, Bass, and Drums route through existing generated voice actions; Looper is visual/no-op.
- No duplicate note triggers occur for the same clip/note/bar/beat tick.
- Audio playback respects existing engine readiness, mute, and volume gates.
- Stopping transport stops further clip playback and clears playback status.
- V4-16 recording behavior still works.
- No sync/session/reducer/SoundCloud/effects/mixer/device-chain/collision/config/movement/top-down changes.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually record notes into a clip.
- Set the clip to `playing`, start transport, and verify notes trigger on matching beats.
- Stop transport and verify playback stops.
- Mute or set volume to 0 and verify visuals continue while audio is silent.
- Try FM, Bass, Piano, and Drum tracks.
- Verify no playback occurs while transport is stopped.
- Spot-check V4-16 recording, piano live input, metronome, FM/drum/bass pads, traversal, top-down, range, jukebox, Audio Workbench, Exit/recovery, and reveal.

#### Risks

- Beat-level playback is intentionally coarse because the existing local transport only exposes bar/beat.
- Duplicate-trigger guards must be reset carefully when transport, clips, or notes change.
- Drum routing from pitched notes is intentionally approximate for this phase.
- Combining metronome and clip triggering in the existing interval controller may make ordering important; keep note triggering before `advanceTransportBeat()`.

#### Non-Goals

- No sync/reducer/session changes.
- No SoundCloud routing or processing.
- No professional scheduler, sub-beat timing, swing, quantize UI, or arrangement.
- No recording changes beyond preserving V4-16.
- No MIDI device support.
- No effects, mixer, or device chain behavior.
- No collision/config/movement/top-down changes.

#### Completed Implementation

- Added local-only playback trigger status and actions for marking clip note playback and stopping all local clip playback.
- Enhanced the local DAW clock controller so recorded notes in `playing` clips trigger on matching local transport bar/beat before transport advances.
- Routed clip playback through existing generated audio actions for FM, piano-to-FM, bass, and drum hits; Looper remains visual/no-op.
- Added duplicate-trigger protection bounded to each local transport tick so long playback does not accumulate trigger keys.
- Added small clip-grid playback visuals, current beat markers, last playback note highlights, and Clip Grid overview playback status.
- Preserved V4-16 recording behavior and avoided sync/reducers/session changes, SoundCloud, professional scheduling, MIDI device support, effects/mixer/device chain changes, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for recording a clip, setting it playing, transport-triggered note playback, Stop behavior, mute/volume gating, FM/bass/drum/piano routing, V4-16 recording regression, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-18: Simple Looper Station

#### Summary

Make a basic local looper station for clip launch and overdub-style flow.

#### Implementation Spec

- Make the Looper station a small local control surface over existing local MIDI/control clips.
- Expected files:
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
- Avoid `src/3d/ThreeDModeShell.tsx` unless build exposes a tiny alignment need; V4-17 already loops by `clip.lengthBars`.
- Avoid `src/3d/useLocalDawAudioEngine.ts`, sync/session reducers, SoundCloud, level config, movement, collision, top-down, docs/changelog closeout.
- Add one local DAW action:
  - `setSelectedClipLoopLengthBars(lengthBars: number)`.
- Loop length action behavior:
  - Find the selected clip by `selectedTrackId` and `selectedSceneIndex`.
  - Clamp to the small allowed set `1 | 2 | 4 | 8`.
  - Update only that clip's `lengthBars`.
  - If the loop is shortened, do not delete recorded notes; playback simply ignores notes outside the active loop length until the length expands again.
  - No audio engine dependency.
- Looper station controls:
  - Add four clip launch pads for the Looper track, one per scene.
  - Stable interactable IDs: `studio-looper-clip-1`, `studio-looper-clip-2`, `studio-looper-clip-3`, `studio-looper-clip-4`.
  - Each pad maps to the Looper track clip for that scene.
  - On click, select the clip with `selectClip(clip.id)` and toggle state with `activateClipVisualState(clip.id)`.
  - Reuse existing clip state cycle and V4-17 beat playback behavior.
  - Preserve existing one-playing-per-track behavior from `activateClipVisualState`.
- Loop length controls:
  - Add controls for `1 BAR`, `2 BAR`, `4 BAR`, and `8 BAR`.
  - Stable interactable IDs: `studio-looper-length-1`, `studio-looper-length-2`, `studio-looper-length-4`, `studio-looper-length-8`.
  - On click, set the selected Looper clip length via `setSelectedClipLoopLengthBars(length)`.
  - If no Looper clip is selected, default-select Looper scene 1 before setting the length.
- Use existing `LocalDawClip` and `midiNotes`; do not create raw audio loop state.
- The Looper station must not create raw audio recordings, sample buffers, microphone input, imported samples, or a separate playback engine.
- Transport remains controlled by existing DAW transport controls; Looper pads do not auto-start transport.
- Visuals:
  - Clip pads show state color using existing clip color semantics.
  - Each pad shows scene number and note count.
  - Selected Looper clip gets a clear outline.
  - Playing Looper clip gets the existing playing highlight style.
  - Length controls show the active selected length.
  - Add a compact status strip: `LOOPER`, `SCENE N`, `LEN X BAR`, `NOTES N`, `LOCAL MIDI`.
- Keep visuals compact and clear of walking lanes.
- Do not change V4-16 recording or V4-17 playback beyond reusing current clip state and `lengthBars`.
- Do not add sync/reducer/session writes, SoundCloud routing/processing, professional scheduling beyond the existing beat clock, effects/mixer/device chain behavior, collision/config/movement/top-down changes, or raw audio loop behavior.

#### Acceptance Criteria

- Looper station shows four Looper clip pads and loop length controls.
- Clicking a Looper pad selects that Looper clip and toggles its local state.
- Playing Looper clips participate visually in existing V4-17 playback status without adding a raw audio loop engine.
- Loop length controls update the selected Looper clip's `lengthBars` to 1, 2, 4, or 8.
- If no Looper clip is selected, length controls default-select Looper scene 1 before applying length.
- Recorded notes are not deleted when loop length changes.
- V4-16 recording and V4-17 playback remain intact.
- No sync/session/SoundCloud/effects/mixer/device-chain/collision/config/movement/top-down changes.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually click each Looper scene pad and confirm selection/state changes.
- Set Looper lengths to 1, 2, 4, and 8 and confirm UI updates.
- Start/stop transport and verify no new scheduler behavior.
- Confirm existing clip grid, DAW transport, piano recording, and playback still work.
- Confirm audio engine mute/volume behavior is unchanged.
- Spot-check traversal, top-down, range, jukebox, Audio Workbench, Exit/recovery, and reveal.

#### Risks

- Looper controls overlap conceptually with the DAW clip grid; keep the station scoped to the Looper track only.
- Default-selecting Looper scene 1 for length controls could surprise users if not shown clearly in status.
- Shortening loop length without deleting notes may hide notes until length expands; this is intentional but should be visually understandable.

#### Non-Goals

- No raw audio looper.
- No microphone/input recording.
- No samples, sample buffers, or imported audio files.
- No new clip playback engine beyond existing V4-17 beat playback.
- No sync/reducer/session changes.
- No SoundCloud routing or processing.
- No MIDI device support.
- No effects, mixer, or device chain changes.
- No collision/config/movement/top-down changes.

#### Completed Implementation

- Added local loop-length support through `setSelectedClipLoopLengthBars()`, clamped to `1`, `2`, `4`, or `8` bars.
- Ensured loop length changes only affect Looper clips, falling back atomically to Looper scene 1 when the current selection is not a Looper clip.
- Added four Looper station clip pads for Looper scenes 1-4, reusing existing clip selection and state cycling.
- Added four Looper length controls for `1`, `2`, `4`, and `8` bars.
- Added compact Looper station status for scene, length, note count, and `LOCAL MIDI`.
- Reused existing local clips, MIDI note data, and V4-17 beat playback while avoiding raw audio loops, microphone/sample buffers, SoundCloud, sync/reducers/session writes, new playback engines, effects/mixer/device chain changes, collision, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for Looper scene pad selection/state changes, loop length updates, fallback-to-Looper-scene behavior, V4-16/V4-17 regression, transport behavior, mute/volume behavior, traversal, Tab top-down, range, jukebox, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-19: DJ Station Visual And Local Controls

#### Summary

Add a DJ station that can control supported playback actions and prepare app-owned deck concepts.

#### Implementation Spec

- Upgrade the DJ station from a placeholder into a local, app-owned visual DJ control surface.
- Expected files:
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
- Avoid:
  - `src/3d/useLocalDawAudioEngine.ts`.
  - `src/3d/ThreeDModeShell.tsx`.
  - `src/3d/Level1RoomShell.tsx`.
  - `src/hooks/useSoundCloudPlayer.ts`.
  - sync/session reducers, SoundCloud widget/jukebox code, effects/mixer/device chain, level config, collision, movement, top-down, docs/changelog closeout.
- Add compact local DJ state:
  - `LocalDawDjDeckId = "A" | "B"`.
  - `LocalDawDjDeckVisualState = "empty" | "cued" | "playing"`.
  - `LocalDawDjDeckState` with `id`, `visualState`, and `label`.
  - `LocalDawDjState` with `selectedDeckId`, `crossfader`, and `decks`.
  - `LocalDawState.dj`.
- Initial DJ state:
  - `selectedDeckId: "A"`.
  - `crossfader: 0`.
  - Deck A label `Deck A`, Deck B label `Deck B`.
  - Both deck visual states start as `empty`.
- Add local-only DJ actions:
  - `selectDjDeck(deckId)`.
  - `toggleDjDeckCue(deckId)`.
  - `toggleDjDeckPlay(deckId)`.
  - `nudgeDjCrossfader(delta)`.
  - `setDjCrossfader(value)`.
- Action behavior:
  - Selecting a deck sets `selectedStationId: "dj"`.
  - Cue toggles `empty <-> cued`; if the deck is `playing`, cue returns it to `cued`.
  - Play toggles `playing <-> cued`; if the deck is `empty`, play sets it to `cued`.
  - Crossfader clamps to `-1..1`; use small steps like `0.25`.
  - No audio, clip launch, SoundCloud, or transport changes.
- DJ station visuals in `Level1RecordingStudioRoom.tsx`:
  - Deck A and Deck B panels with circular/platter meshes.
  - Deck labels `A` and `B`.
  - Tiny source text such as `NO SOURCE` or `SOURCE V4-20`.
  - Cue and Play buttons per deck.
  - Crossfader track and thumb.
  - Three crossfader controls: A, MID, B.
  - Status canvas with `DJ LOCAL`, deck states, crossfader position, and `SOURCES V4-20`.
- Stable interactable IDs:
  - `studio-dj-deck-a-cue`.
  - `studio-dj-deck-a-play`.
  - `studio-dj-deck-b-cue`.
  - `studio-dj-deck-b-play`.
  - `studio-dj-crossfader-a`.
  - `studio-dj-crossfader-mid`.
  - `studio-dj-crossfader-b`.
- Behavior without deck sources:
  - Controls change local visual state only.
  - Cue/play does not start audio or transport.
  - Crossfader changes visual state only.
  - Deck source labels remain `NO SOURCE` / `V4-20`.
  - Do not connect DJ controls to local clips yet; V4-20 owns app-owned deck sources.
- SoundCloud preservation:
  - SoundCloud remains only the existing widget/jukebox path.
  - Do not add Web Audio nodes for SoundCloud.
  - Do not edit `useSoundCloudPlayer`.
  - Do not route SoundCloud URLs/streams into local DAW or DJ state.
  - Do not add a SoundCloud effects graph.
  - Do not call `jukeboxActions` from DJ controls.
- Interaction with existing local transport/clips:
  - DJ controls do not affect transport.
  - DJ controls do not select or launch clips.
  - DJ state may set `selectedStationId: "dj"` for status consistency only.
  - V4-16 recording and V4-17 playback remain unchanged.
- Safety:
  - No audio engine dependency.
  - No `AudioContext` creation/resume.
  - No timers, schedulers, playback loops, or cleanup beyond local state reset.
- Do not add app-owned deck sources, SoundCloud Web Audio routing/processing/effects, DJ audio playback, clip launch/transport coupling, sync/reducer/session changes, audio engine changes, effects/mixer/device chain behavior, collision/config/movement/top-down changes.

#### Acceptance Criteria

- DJ station visibly includes deck A/B panels, cue/play local controls, crossfader controls, and status display.
- Clicking cue/play changes only local DJ visual state.
- Crossfader controls update only local crossfader visual state.
- DJ controls do not start audio, create/resume `AudioContext`, control SoundCloud, start transport, or launch clips.
- Existing SoundCloud jukebox/widget behavior remains untouched.
- V4-16 recording, V4-17 playback, V4-18 Looper controls, generated instruments, and transport still work.
- No sync/reducer/session/SoundCloud/effects/collision/config/movement/top-down changes.
- `npm.cmd run build` passes.

#### Build And Manual Checks

- Run `npm.cmd run build`.
- Manually click each DJ cue/play control and verify deck visual/status changes.
- Click crossfader A/MID/B and verify thumb/status changes.
- Confirm no audio starts from DJ controls.
- Confirm SoundCloud jukebox controls still work as before.
- Confirm DAW transport, clips, recording, playback, and Looper controls are unchanged.
- Spot-check piano, FM/drum/bass controls, traversal, top-down, range, Audio Workbench, Exit/recovery, and reveal.

#### Risks

- DJ controls could be mistaken for SoundCloud controls; keep source labels explicit as `NO SOURCE` / `V4-20`.
- Crossfader visual state has no audio meaning yet; status text should make this clear.
- The DJ station sits near the entrance, so controls must stay compact and not obstruct the doorway path.

#### Non-Goals

- No app-owned deck source implementation yet; V4-20 owns sources.
- No SoundCloud Web Audio routing.
- No raw SoundCloud processing or effects graph.
- No DJ audio playback.
- No clip launch or transport coupling.
- No sync/reducer/session changes.
- No audio engine changes.
- No effects, mixer, or device chain behavior.
- No collision/config/movement/top-down changes.

#### Completed Implementation

- Added compact local DJ state for selected deck, Deck A/B visual states, and crossfader position.
- Added local-only DJ actions for Deck A/B cue/play visual state and crossfader position.
- Added in-world DJ station deck panels, cue/play buttons, A/MID/B crossfader controls, platter visuals, and `DJ LOCAL` status display.
- Kept controls visual/local only, without app-owned sources, DJ audio playback, SoundCloud routing/processing, clip launch, transport coupling, sync/session/reducer changes, audio engine changes, effects/mixer/device chain behavior, collision, movement, or top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for DJ cue/play visuals, crossfader visuals, SoundCloud jukebox unchanged, no DJ audio, transport/clip regression, Looper/piano/FM/drum/bass regression, traversal, Tab top-down, range, Audio Workbench, reveal, and recovery remain pending.

### [x] Phase V4-20: App-Owned Deck Sources

#### Summary

Add local app-owned deck sources for generated clips or owned/imported sources.

#### Implementation Spec

- Expected files:
  - `src/3d/useLocalDawState.ts`
  - `src/3d/Level1RecordingStudioRoom.tsx`
- State/type additions:
  - Add local DJ source types in `useLocalDawState.ts`:
    - `LocalDawDjDeckSourceKind = "local-clip"`
    - `LocalDawDjDeckSource` with `id`, `kind`, `label`, `trackId`, `clipId`, and `sceneIndex`.
  - Extend `LocalDawDjDeckState` with `sourceId: string | null`.
  - Extend `LocalDawDjState` with `sources: LocalDawDjDeckSource[]`.
  - Build initial sources from existing local clips/tracks with stable IDs such as `dj-source-${clip.id}`.
  - Keep Deck A/B initially set to `sourceId: null`.
- Local actions:
  - `selectDjDeckSource(deckId, sourceId)`
  - `cycleDjDeckSource(deckId, direction)`
  - `clearDjDeckSource(deckId)`
  - Actions must validate source IDs, set `selectedStationId: "dj"` and `selectedDeckId`, and update only local DJ source selection state.
- UI/control additions:
  - Extend existing DJ station visuals in `Level1RecordingStudioRoom.tsx`.
  - Add tiny source-selection controls for each deck with stable interactable IDs:
    - `studio-dj-deck-a-source-prev`
    - `studio-dj-deck-a-source-next`
    - `studio-dj-deck-a-source-clear`
    - `studio-dj-deck-b-source-prev`
    - `studio-dj-deck-b-source-next`
    - `studio-dj-deck-b-source-clear`
  - Source labels/status must make it obvious this is source selection only, not playback. Use wording like `SOURCE ONLY`, `LOCAL CLIP`, `NO SOURCE`, and/or `PLAYBACK OFF`.
  - Deck panels should show selected source label or `NO SOURCE`, plus compact local metadata such as track/scene and note count if cheap to derive from existing state.
  - DJ status display should include source-only labels for Deck A/B while preserving existing visual deck state and crossfader status.
- Behavior rules:
  - Source selection references app-owned local clips only.
  - Selecting a source must not select a DAW clip, launch a clip, start transport, start audio, create/resume `AudioContext`, or affect recording/playback.
  - Cue/play and crossfader controls remain V4-19 visual/local controls only.
  - Source cycling/clear controls only update `localDawState.dj`.
  - Existing local clip note counts may be reflected in source status, but no DJ playback is added.
- Acceptance criteria:
  - Deck A/B panels can show `NO SOURCE` or a selected local clip source.
  - Source prev/next/clear controls update only local DJ deck source state.
  - All new source controls use the stable interactable IDs listed above.
  - Cue/play and crossfader behavior from V4-19 remains unchanged.
  - Source/status text clearly communicates selection-only behavior, not playback.
  - Selecting DJ sources does not start audio, transport, SoundCloud, or clip playback.
  - Existing DAW transport, clip grid, recording, playback, Looper, piano, FM/drum/bass controls remain unchanged.
  - No SoundCloud, sync/session/reducer, audio engine, effects, collision, movement, config, or top-down changes.
  - `npm.cmd run build` passes.
- Build/manual checks:
  - Run `npm.cmd run build`.
  - Manually click Deck A/B source prev/next/clear controls and verify source labels/status update.
  - Click Cue/Play and crossfader controls to confirm V4-19 behavior is preserved.
  - Confirm DJ controls do not start audio or create/resume the audio engine.
  - Confirm SoundCloud jukebox/widget behavior is unchanged.
  - Spot-check DAW transport, clip recording/playback, Looper controls, piano live input, generated instruments, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.
- Risks:
  - Users may assume deck sources are playable; keep labels explicit as source selection only.
  - Source controls could clutter the compact DJ station; keep them small and close to each deck panel.
  - Source references must remain stable and validated so deck state does not point at nonexistent source IDs.
- Non-goals:
  - No SoundCloud raw streams.
  - No SoundCloud Web Audio routing or processing.
  - Do not touch SoundCloud player, jukebox, widget, or `useSoundCloudPlayer`.
  - No DJ audio playback.
  - No app-owned deck audio source nodes.
  - No effects graph.
  - No audio engine changes.
  - No `AudioContext` creation/resume.
  - No transport coupling.
  - No clip launch or clip playback changes.
  - No recording changes.
  - No sync/reducer/session changes.
  - No MIDI device support.
  - No imported samples, fetches, buffers, or raw audio files.
- No collision/config/movement/top-down changes.
- Do not edit changelog or mark the phase complete during implementation.

#### Completed Implementation

- Added app-owned local DJ deck source references derived from existing local DAW clips/tracks.
- Extended Deck A/B state with `sourceId`, added the local source list, and added source-only select/cycle/clear actions.
- Added source prev/next/clear controls for each DJ deck with the approved stable interactable IDs.
- Updated deck panels and DJ status text to show `SOURCE ONLY`, `NO SRC`, local clip labels, and note counts without implying playback.
- Preserved V4-19 cue/play/crossfader behavior and kept source selection local-only with no audio engine, SoundCloud, transport, clip launch, effects, sync/session/reducer, collision, config, movement, or top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for Deck A/B source prev/next/clear controls, source-only label clarity, V4-19 cue/play/crossfader regression, no DJ audio/audio-engine activation, SoundCloud jukebox unchanged, transport/clip/Looper/piano/FM/drum/bass regression, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending.

### [x] Phase V4-21: Filter Effect

#### Summary

Add the first effect device: a filter.

#### Implementation Spec

- Expected files:
  - `src/3d/useLocalDawAudioEngine.ts`
  - `src/3d/Level1RecordingStudioRoom.tsx`
- Audio engine additions:
  - Add `LocalDawFilterEffectPatch` with `cutoffFrequency` and `resonance`.
  - Extend `LocalDawAudioEngineState` with `filterEffectPatch`.
  - Extend `LocalDawAudioEngineActions` with `adjustFilterEffectPatch(patchDelta)`.
  - Safe defaults: `cutoffFrequency: 12000`, `resonance: 0.7`.
  - Clamp ranges: cutoff `120..12000`, resonance/Q `0.3..10`.
  - Add `filterNodeRef = useRef<BiquadFilterNode | null>(null)`.
  - During explicit `initialize()` only, create a low-pass `BiquadFilterNode`, apply the current patch, and connect `filterNode -> masterGain`.
  - Add an `applyFilterEffectPatch()` helper that updates `filter.frequency` and `filter.Q` if the node exists.
  - Add a generated/app-owned output helper that returns `filterNodeRef.current ?? masterGain`.
  - Route generated local DAW voices through that helper:
    - FM synth final gain
    - Drum final gains
    - Bass final gain
    - Piano live indirectly through FM/bass actions
    - Local clip playback indirectly through generated audio actions
    - Bass `RIFF` indirectly through `playBassNote`
  - Keep the metronome direct to `masterGain`; it is not a DAW track/effect source.
  - Cleanup disconnects `filterNodeRef.current`, nulls it, then continues existing master/audio context cleanup.
- Local state/type additions:
  - No `useLocalDawState.ts` changes are required for V4-21.
  - The filter patch lives in `useLocalDawAudioEngine.ts` because it owns the local Web Audio node and remains local-only.
- UI/control additions:
  - Add compact `StudioFilterEffectControls` in `Level1RecordingStudioRoom.tsx`, mounted on/near the existing Effects Rack at `[-13.8, 0, -8.32]`.
  - Use existing canvas-control patterns and keep visuals dim/static and subordinate to the rack.
  - Stable interactable IDs:
    - `studio-filter-cutoff-down`
    - `studio-filter-cutoff-up`
    - `studio-filter-resonance-down`
    - `studio-filter-resonance-up`
  - Recommended control behavior:
    - Cutoff down/up: coarse local steps, clamped by the audio engine.
    - Resonance down/up: `-0.5` / `+0.5`, clamped by the audio engine.
  - Add a small status panel labeled `FILTER LOCAL` with a caption like `CUT 12000 Q 0.7` and/or `APP TRACKS` / `OWNED ONLY`.
- Behavior rules:
  - Filter affects app-owned/generated local DAW audio only.
  - Affected sources are generated voices already owned by the local audio engine: FM, drums, bass, piano live through FM/bass, recorded clip playback through generated actions, and bass `RIFF` through `playBassNote`.
  - Metronome bypasses the filter.
  - DJ deck source selection remains source-only and does not become audio playback.
  - SoundCloud remains widget/jukebox/player only.
  - Filter controls do not start audio, initialize the engine, resume `AudioContext`, launch clips, change transport, or write sync/session/reducer state.
  - If the engine is not initialized, filter controls update local patch state for future initialization.
  - If the engine is initialized, patch changes apply immediately to the filter node.
- Acceptance criteria:
  - Effects Rack shows compact local filter controls and status.
  - Clicking cutoff/resonance controls updates local filter patch visuals.
  - If audio engine is initialized/unmuted/volume-safe, generated local voices audibly reflect cutoff/resonance changes.
  - Filter does not affect SoundCloud widget/jukebox/player.
  - Filter controls do not initialize/resume audio.
  - Metronome remains clear and not filtered.
  - Existing FM/drum/bass/piano live, clip playback, Looper, DJ source selection, transport, recording, and room traversal remain intact.
  - `npm.cmd run build` passes.
- Build/manual checks:
  - Run `npm.cmd run build`.
  - Manual check: initialize `ENGINE`, unmute, raise volume safely, trigger FM/bass/drum/piano notes, then adjust cutoff/resonance.
  - Confirm filter controls do nothing audible before `ENGINE` initialization and do not create/resume `AudioContext`.
  - Confirm metronome still ticks cleanly.
  - Confirm SoundCloud jukebox/widget behavior is unchanged.
  - Regression spot-check DJ source selection, Looper controls, clip recording/playback, piano live input, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.
- Risks:
  - Re-routing final voice gains could accidentally include metronome or miss one generated voice path; use a single helper for generated track outputs and leave metronome direct.
  - Resonance values can get harsh; clamp Q conservatively.
  - If the filter node is missing or disconnected during cleanup, voice playback should fall back to `masterGain` rather than throwing.
- Non-goals:
  - No SoundCloud raw streams.
  - No SoundCloud Web Audio routing or processing.
  - Do not touch SoundCloud player, jukebox, widget, or `useSoundCloudPlayer`.
  - No DJ audio playback.
  - No effects graph beyond this single local filter node.
  - No per-track mixer/device chain behavior yet.
  - No synced effect state.
  - No reducers/session changes.
  - No clip launch or transport coupling changes.
  - No recording changes.
  - No MIDI device support.
- No imported samples, fetches, buffers, or raw audio files.
- No collision/config/movement/top-down changes.
- Do not edit changelog or mark the phase complete during implementation.

#### Completed Implementation

- Added local filter effect patch state with safe cutoff/resonance defaults and clamp-safe adjustment actions.
- Added a low-pass `BiquadFilterNode` created only during explicit audio engine initialization and cleaned up with the engine.
- Routed generated/app-owned FM, drum, bass, piano-through-generated-actions, local clip playback-through-generated-actions, and bass RIFF audio through the filter output helper while keeping the metronome connected directly to `masterGain`.
- Added compact Effects Rack filter controls/status with the approved stable interactable IDs and `APP TRACKS` / `OWNED ONLY` labeling.
- Kept controls from initializing/resuming audio and avoided SoundCloud, DJ playback, sync/session/reducer, clip launch, transport, recording, collision, config, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for initialized generated-voice filter audibility, no pre-initialization audio resume, metronome bypass, SoundCloud jukebox unchanged, DJ source selection regression, Looper/clip/piano/FM/drum/bass regression, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending.

### [x] Phase V4-22: Autopan Effect

#### Summary

Add an autopan device.

#### Implementation Spec

- Expected files:
  - `src/3d/useLocalDawAudioEngine.ts`
  - `src/3d/Level1RecordingStudioRoom.tsx`
- Audio engine additions:
  - Add `LocalDawAutopanEffectPatch` with `rateHz` and `depth`.
  - Extend `LocalDawAudioEngineState` with `autopanEffectPatch`.
  - Extend `LocalDawAudioEngineActions` with `adjustAutopanEffectPatch(patchDelta)`.
  - Safe defaults: `rateHz: 0.5`, `depth: 0`.
  - Clamp ranges: rate `0.05..8`, depth `0..1`.
  - Add refs:
    - `autopanNodeRef = useRef<StereoPannerNode | null>(null)`
    - `autopanLfoRef = useRef<OscillatorNode | null>(null)`
    - `autopanDepthGainRef = useRef<GainNode | null>(null)`
  - During explicit `initialize()` only, create a `StereoPannerNode`, LFO oscillator, and depth gain.
  - Connect `autopanLfo -> autopanDepthGain -> autopanNode.pan`.
  - Start the LFO after engine initialization; this is safe because it happens only from the existing explicit `ENGINE` user gesture.
  - Add `applyAutopanEffectPatch()` to update LFO frequency and depth gain if nodes exist.
  - Controls update patch state before initialization but do not create nodes or resume audio.
- Fixed chain composition with V4-21:
  - Use a simple fixed app-owned chain: `generated/app-owned voices -> filterNode -> autopanNode -> masterGain -> destination`.
  - Change initialization from `filterNode.connect(masterGain)` to `filterNode.connect(autopanNode); autopanNode.connect(masterGain)`.
  - Keep `getAppOwnedTrackOutputNode(masterGain)` returning `filterNodeRef.current ?? autopanNodeRef.current ?? masterGain`.
  - Voice connection remains through `voiceGain.connect(getAppOwnedTrackOutputNode(masterGain))`.
  - If the filter node is missing but autopan exists, generated voices may still route through autopan to master.
  - Metronome continues direct to `masterGain`, bypassing both filter and autopan.
  - This is a fixed two-effect path, not a reorderable graph.
- UI/control additions:
  - Extend Effects Rack controls in `Level1RecordingStudioRoom.tsx`.
  - Add compact autopan controls near the V4-21 filter controls, using existing canvas-control patterns.
  - Stable interactable IDs:
    - `studio-autopan-rate-down`
    - `studio-autopan-rate-up`
    - `studio-autopan-depth-down`
    - `studio-autopan-depth-up`
  - Recommended control behavior:
    - Rate down/up: `-0.25` / `+0.25` Hz, clamped by audio engine.
    - Depth down/up: `-0.1` / `+0.1`, clamped by audio engine.
  - Add compact status label `PAN LOCAL` with caption like `RATE 0.5 DEPTH 0.0`.
  - Include `APP TRACKS` / `OWNED ONLY` wording near the rack.
  - Keep controls small and visually subordinate; do not block walking lanes.
- Behavior rules:
  - Autopan affects app-owned/generated local DAW audio only.
  - Affected sources are the same generated local sources as V4-21: FM, drums, bass, piano live through FM/bass, recorded clip playback through generated actions, and bass `RIFF` through `playBassNote`.
  - Metronome bypasses autopan.
  - DJ deck source selection remains source-only and does not become audio playback.
  - SoundCloud remains widget/jukebox/player only.
  - Autopan controls do not start audio, initialize the engine, resume `AudioContext`, launch clips, change transport, or write sync/session/reducer state.
  - If the engine is not initialized, autopan controls update local patch state for future initialization.
  - If the engine is initialized, patch changes apply immediately to the existing autopan nodes.
  - Depth default `0` means the effect is audibly neutral until the user increases depth.
- Acceptance criteria:
  - Effects Rack shows compact local autopan controls and status.
  - Clicking rate/depth controls updates local autopan patch visuals.
  - If audio engine is initialized/unmuted/volume-safe, generated local voices pan when depth is above `0`.
  - Existing V4-21 filter still affects generated voices.
  - Metronome remains centered/unpanned and bypasses the effect chain.
  - Autopan controls do not initialize/resume audio.
  - SoundCloud widget/jukebox/player behavior is unchanged.
  - Existing FM/drum/bass/piano live, clip playback, Looper, DJ source selection, transport, recording, and room traversal remain intact.
  - `npm.cmd run build` passes.
- Build/manual checks:
  - Run `npm.cmd run build`.
  - Manual check: initialize `ENGINE`, unmute, raise volume safely, trigger FM/bass/drum/piano notes, increase autopan depth, and confirm panning.
  - Adjust rate and confirm panning speed changes.
  - Adjust filter cutoff/resonance and confirm V4-21 still works in the same app-owned chain.
  - Confirm metronome remains centered/unpanned.
  - Confirm autopan controls do nothing audible before `ENGINE` initialization and do not create/resume `AudioContext`.
  - Confirm SoundCloud jukebox/widget behavior is unchanged.
  - Regression spot-check DJ source selection, Looper controls, clip recording/playback, piano live input, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.
- Risks:
  - Starting an LFO during initialize adds a long-lived node; cleanup must stop and disconnect it reliably.
  - Panning can be hard to hear on mono speakers/headphones with OS mono enabled; manual testing should use stereo output.
  - If the fixed chain is miswired, generated voices may bypass filter/autopan or be silent; keep the chain simple and preserve the `getAppOwnedTrackOutputNode()` helper.
- Non-goals:
  - No SoundCloud raw streams.
  - No SoundCloud Web Audio routing or processing.
  - Do not touch SoundCloud player, jukebox, widget, or `useSoundCloudPlayer`.
  - No DJ audio playback.
  - No full effects graph, arbitrary routing, or reorderable device chain.
  - No per-track mixer/device chain behavior yet.
  - No synced effect state.
  - No reducers/session changes.
  - No clip launch or transport coupling changes.
  - No recording changes.
  - No MIDI device support.
- No imported samples, fetches, buffers, or raw audio files.
- No collision/config/movement/top-down changes.
- Do not edit changelog or mark the phase complete during implementation.

#### Completed Implementation

- Added local autopan patch state with safe rate/depth defaults and clamp-safe adjustment actions.
- Added explicit-initialization-only autopan nodes using `StereoPannerNode`, LFO oscillator, and depth gain, with cleanup that stops/disconnects the LFO and clears refs.
- Composed the fixed app-owned effect path as generated voices -> filter -> autopan -> master while keeping metronome direct to `masterGain`.
- Added compact Effects Rack autopan controls/status with the approved stable interactable IDs and local/app-owned labeling.
- Kept controls from initializing/resuming audio and avoided SoundCloud, DJ playback, full/reorderable effects graph, sync/session/reducer, clip launch, transport, recording, collision, config, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for generated-voice panning, rate/depth behavior, V4-21 filter chain regression, metronome bypass, no pre-initialization audio resume, SoundCloud jukebox unchanged, DJ source selection regression, Looper/clip/piano/FM/drum/bass regression, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending.

### [x] Phase V4-23: Echo Effect

#### Summary

Add a tempo-aware echo/delay device.

#### Implementation Spec

- Expected files:
  - `src/3d/useLocalDawAudioEngine.ts`
  - `src/3d/Level1RecordingStudioRoom.tsx`
- Audio engine additions:
  - Add `LocalDawEchoEffectPatch` with `delayTimeSeconds`, `feedback`, and `wetMix`.
  - Extend `LocalDawAudioEngineState` with `echoEffectPatch`.
  - Extend `LocalDawAudioEngineActions` with `adjustEchoEffectPatch(patchDelta)`.
  - Safe defaults: `delayTimeSeconds: 0.25`, `feedback: 0.18`, `wetMix: 0`.
  - Clamp ranges: delay time `0.06..0.75` seconds, feedback `0..0.45`, wet mix `0..0.35`.
  - These limits keep feedback and output energy conservative. Default `wetMix: 0` makes echo neutral until the user opts in.
- Echo refs/wiring:
  - Add refs:
    - `echoInputRef = useRef<GainNode | null>(null)`
    - `echoDryGainRef = useRef<GainNode | null>(null)`
    - `echoWetGainRef = useRef<GainNode | null>(null)`
    - `echoDelayRef = useRef<DelayNode | null>(null)`
    - `echoFeedbackGainRef = useRef<GainNode | null>(null)`
    - Optional `echoOutputRef = useRef<GainNode | null>(null)` if it makes wiring clearer.
  - During explicit `initialize()` only, create echo input, dry gain, wet gain, delay node, feedback gain, and optional output gain.
  - Apply current patch values.
  - Wire a simple bounded parallel delay:
    - `echoInput -> echoDryGain -> echoOutput`
    - `echoInput -> echoDelay -> echoWetGain -> echoOutput`
    - `echoDelay -> echoFeedbackGain -> echoDelay`
  - Keep feedback clamped at or below `0.45`.
  - Echo nodes are created only during existing explicit `ENGINE` initialization, never from echo controls.
  - Add `applyEchoEffectPatch()`:
    - If nodes exist, update `delayTime`, `feedbackGain.gain`, `dryGain.gain`, and `wetGain.gain`.
    - Suggested mix law: `wetGain = wetMix`; `dryGain = 1 - wetMix * 0.45`.
    - If engine is not initialized, controls still update patch state for later initialization.
  - Cleanup disconnects echo input/dry/wet/delay/feedback/output refs and nulls all echo refs.
- Fixed chain composition with filter/autopan:
  - Use the fixed app-owned chain: `generated/app-owned voices -> filterNode -> autopanNode -> echoInput -> echoOutput -> masterGain -> destination`.
  - Change current initialize wiring from `autopanNode.connect(masterGain)` to `autopanNode.connect(echoInput); echoOutput.connect(masterGain)`.
  - Keep `getAppOwnedTrackOutputNode(masterGain)` returning the first available node in the fixed chain: `filterNodeRef.current ?? autopanNodeRef.current ?? echoInputRef.current ?? masterGain`.
  - If filter/autopan are unavailable but echo exists, generated voices may route through echo to master.
  - Metronome remains direct to `masterGain`, bypassing filter, autopan, and echo.
  - This remains a fixed chain, not a reorderable graph.
- UI/control additions:
  - Extend Effects Rack controls in `Level1RecordingStudioRoom.tsx`.
  - Add compact echo controls near the filter/autopan controls.
  - Stable interactable IDs:
    - `studio-echo-time-down`
    - `studio-echo-time-up`
    - `studio-echo-feedback-down`
    - `studio-echo-feedback-up`
    - `studio-echo-mix-down`
    - `studio-echo-mix-up`
  - Recommended control behavior:
    - Time down/up: `-0.05` / `+0.05` seconds.
    - Feedback down/up: `-0.05` / `+0.05`.
    - Mix down/up: `-0.05` / `+0.05`.
    - All final values clamp in the audio engine.
  - Add status label `ECHO LOCAL` with caption like `TIME 250MS FB 18 MIX 0`.
  - Include `APP TRACKS` / `OWNED ONLY` safety language already present on Effects Rack.
  - Keep controls dim/static, compact, and subordinate. Place below or adjacent to existing filter/autopan controls without blocking walking lanes.
- Behavior rules:
  - Echo affects app-owned/generated local DAW audio only.
  - Affected sources are the generated local sources already routed through the fixed chain: FM, drums, bass, piano live through FM/bass, recorded clip playback through generated actions, and bass `RIFF` through `playBassNote`.
  - Metronome bypasses echo.
  - DJ deck source selection remains source-only and does not become audio playback.
  - SoundCloud remains widget/jukebox/player only.
  - Echo controls do not start audio, initialize the engine, resume `AudioContext`, launch clips, change transport, or write sync/session/reducer state.
  - If the engine is not initialized, echo controls update local patch state for future initialization.
  - If the engine is initialized, patch changes apply immediately to existing echo nodes.
  - Wet mix default `0` means the effect is audibly neutral until the user increases mix.
- Acceptance criteria:
  - Effects Rack shows compact local echo controls and status.
  - Clicking time/feedback/mix controls updates local echo patch visuals.
  - If audio engine is initialized/unmuted/volume-safe, generated local voices produce a conservative echo when mix is above `0`.
  - Existing V4-21 filter and V4-22 autopan still affect generated voices in the same fixed chain.
  - Metronome remains dry, centered, and unaffected by echo.
  - Echo controls do not initialize/resume audio.
  - SoundCloud widget/jukebox/player behavior is unchanged.
  - Existing FM/drum/bass/piano live, clip playback, Looper, DJ source selection, transport, recording, and room traversal remain intact.
  - `npm.cmd run build` passes.
- Build/manual checks:
  - Run `npm.cmd run build`.
  - Manual check: initialize `ENGINE`, unmute, raise volume safely, trigger FM/bass/drum/piano notes, increase echo mix, and confirm delay repeats.
  - Adjust feedback and confirm repeats remain bounded and safe.
  - Adjust delay time and confirm timing changes.
  - Confirm V4-21 filter and V4-22 autopan still work in the same fixed chain.
  - Confirm metronome remains unaffected by echo.
  - Confirm echo controls do nothing audible before `ENGINE` initialization and do not create/resume `AudioContext`.
  - Confirm SoundCloud jukebox/widget behavior is unchanged.
  - Regression spot-check DJ source selection, Looper controls, clip recording/playback, piano live input, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.
- Risks:
  - Feedback loops can run away if clamps are too high; keep feedback max conservative and wet mix capped.
  - Echo can make drums loud or cluttered; default mix should be `0` and max wet mix should stay low.
  - Miswiring the fixed chain could silence generated voices or bypass prior effects; preserve a single helper for the first app-owned output node and keep metronome direct to master.
- Non-goals:
  - No SoundCloud raw streams.
  - No SoundCloud Web Audio routing or processing.
  - Do not touch SoundCloud player, jukebox, widget, or `useSoundCloudPlayer`.
  - No DJ audio playback.
  - No full effects graph, arbitrary routing, or reorderable device chain.
  - No tempo-synced scheduling beyond a local delay-time value; no synced clock changes.
  - No per-track mixer/device chain behavior yet.
  - No reducers/session changes.
  - No clip launch or transport coupling changes.
  - No recording changes.
  - No MIDI device support.
- No imported samples, fetches, buffers, or raw audio files.
- No collision/config/movement/top-down changes.
- Do not edit changelog or mark the phase complete during implementation.

#### Completed Implementation

- Added local echo patch state with conservative delay time, feedback, and wet mix defaults/clamps.
- Added a bounded local delay feedback path with dry/wet/output gains and cleanup for all echo refs.
- Composed the fixed app-owned effect path as generated voices -> filter -> autopan -> echo -> master while keeping metronome direct to `masterGain`.
- Added compact Effects Rack echo controls/status with the approved stable interactable IDs.
- Kept controls from initializing/resuming audio and avoided SoundCloud, DJ playback, full/reorderable effects graph, sync/session/reducer, clip launch, transport, recording, collision, config, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for generated-voice echo repeats, feedback/mix safety, delay-time behavior, V4-21/V4-22 chain regression, metronome bypass, no pre-initialization audio resume, SoundCloud jukebox unchanged, DJ source selection regression, Looper/clip/piano/FM/drum/bass regression, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending.

### [x] Phase V4-24: Reverb Effect

#### Summary

Add a lightweight reverb device.

#### Implementation Spec

- Expected implementation files:
  - `src/3d/useLocalDawAudioEngine.ts`
  - `src/3d/Level1RecordingStudioRoom.tsx`
- Add a local-only `LocalDawReverbEffectPatch`:
  - `decaySeconds`: default `0.8`, clamp `0.2..2.2`.
  - `wetMix`: default `0`, clamp `0..0.3`.
- Extend `LocalDawAudioEngineState` with `reverbEffectPatch`.
- Extend `LocalDawAudioEngineActions` with `adjustReverbEffectPatch(patchDelta)`.
- Implement reverb with a generated stereo `ConvolverNode` impulse:
  - Generate bounded decaying-noise impulse buffers only on audio `initialize()` and when `decaySeconds` changes.
  - Do not fetch/import impulse files, use worklets, timers, `useFrame`, microphones, samples, or raw audio buffers from outside the engine.
  - Keep impulse length bounded by the `decaySeconds` clamp.
- Add refs for the fixed reverb module:
  - `reverbInputRef`
  - `reverbDryGainRef`
  - `reverbWetGainRef`
  - `reverbConvolverRef`
  - `reverbOutputRef`
- Cleanup must disconnect all reverb nodes, null refs, and remain safe during shell exit/unmount.
- Compose the fixed app-owned/generated audio chain as:
  - `generated voices -> filter -> autopan -> echo -> reverb -> master`
- Update existing wiring from `echoOutput -> masterGain` to `echoOutput -> reverbInput -> reverbOutput -> masterGain`.
- Keep fallback output behavior first-available and local:
  - `filterNodeRef.current ?? autopanNodeRef.current ?? echoInputRef.current ?? reverbInputRef.current ?? masterGain`
- Metronome must keep bypassing all effects:
  - `metronome -> masterGain`
- Reverb controls must only update local patch state and existing node params/buffer if the engine is initialized.
- Reverb controls must not initialize, resume, or create an `AudioContext`.
- Add a small, dim Effects Rack reverb module in `Level1RecordingStudioRoom.tsx`.
- Stable interactable IDs:
  - `studio-reverb-decay-down`
  - `studio-reverb-decay-up`
  - `studio-reverb-mix-down`
  - `studio-reverb-mix-up`
- UI control behavior:
  - Decay down/up adjusts `decaySeconds` by `0.2`.
  - Mix down/up adjusts `wetMix` by `0.05`.
  - Show a subdued status label such as `Reverb Local` with `DECAY 0.8S MIX 0%`.
  - Active visuals should only appear when `wetMix > 0`.
- Behavior rules:
  - Reverb affects only app-owned/generated local DAW audio: FM, drums, bass, piano live notes, and local clip playback through generated voices.
  - Reverb does not affect SoundCloud widget/jukebox/player audio.
  - Do not add DJ audio playback, full effects graph, reorderable routing, per-track sends, mixer integration, meters, clip launch changes, transport coupling, recording changes, sync/reducer/session changes, SoundCloud routing/processing, collision/config/movement/top-down changes, or unrelated refactors.
- Acceptance criteria:
  - `reverbEffectPatch` and `adjustReverbEffectPatch` exist on the local audio engine interface.
  - Generated voices route through `filter -> autopan -> echo -> reverb -> master`.
  - Metronome remains dry by routing directly to master.
  - Reverb defaults to effectively off with `wetMix: 0`.
  - Decay and wet mix are conservatively clamped.
  - Effects Rack shows the four stable reverb controls and a dim status label.
  - Reverb controls update state without initializing/resuming audio.
  - No SoundCloud code is touched.
  - `npm.cmd run build` passes.
- Risks:
  - The Effects Rack is already dense after filter/autopan/echo; placement may need small local spacing adjustments inside the existing rack.
  - Convolver wet level can feel louder than expected; keep `wetMix` default `0` and max `0.3`.
  - Impulse regeneration should stay event-driven and bounded to avoid CPU spikes.
- Build and manual checks:
  - Run `npm.cmd run build`.
  - Manually verify ENGINE remains the only `AudioContext` initializer.
  - Manually verify reverb labels update before and after initialization.
  - Manually verify generated FM/drum/bass/piano/clip playback can become reverberated only after unmute/volume and wet mix increase.
  - Manually verify the metronome remains dry.
  - Manually spot-check SoundCloud jukebox/widget unchanged.
  - Manually spot-check Effects Rack readability, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.
- Non-goals:
  - No SoundCloud Web Audio routing or processing.
  - No imported impulse files, sample fetching, microphone input, raw audio loops, or external audio buffers.
  - No full effects graph, reorderable routing, per-track sends, device enable/disable system, mixer integration, or meters.
  - No DJ audio playback.
- No sync/session/reducer changes.
- No clip launch, transport coupling, recording changes, MIDI device support, or scheduler changes.
- No collision/config/movement/top-down changes.

#### Completed Implementation

- Added local reverb patch state with conservative decay and wet mix defaults/clamps.
- Added generated stereo convolver impulse reverb with bounded, event-driven impulse regeneration and cleanup for all reverb refs.
- Composed the fixed app-owned effect path as generated voices -> filter -> autopan -> echo -> reverb -> master while keeping metronome direct to `masterGain`.
- Added compact Effects Rack reverb controls/status with the approved stable interactable IDs.
- Kept controls from initializing/resuming audio and avoided SoundCloud, DJ playback, full/reorderable effects graph, per-track sends, mixer/meters, sync/session/reducer, clip launch, transport, recording, collision, config, movement, and top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for reverb labels before/after initialization, generated-voice reverb audibility after wet mix increase, metronome dry bypass, SoundCloud jukebox unchanged, Effects Rack readability, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending.

### [x] Phase V4-25: Device Chain Visuals

#### Summary

Show instrument and effect devices as a DAW-style device chain at the DAW station.

#### Implementation Spec

- Expected implementation files:
  - `src/3d/useLocalDawState.ts`
  - `src/3d/Level1RecordingStudioRoom.tsx`
- Do not edit `src/3d/useLocalDawAudioEngine.ts`, SoundCloud files, changelog, collision/config/movement/top-down files, or sync/session reducers.
- Current local patterns to reuse:
  - `LocalDawDevice` already has `id`, `trackId`, `kind`, `label`, `enabled`, and `placeholder`.
  - `LocalDawTrack.deviceIds` already links each track to its devices.
  - `selectedTrackId` is already updated by clip/grid/looper flows.
  - `Level1RecordingStudioRoom.tsx` already has DAW-station clickable mesh/canvas patterns via `useRegisterInteractable`.
- Add local state:
  - `selectedDeviceId: string | null` on `LocalDawState`.
  - Initial value should be the first device for the initial selected track, or `null` if unavailable.
- Add local actions:
  - `selectDevice(deviceId: string): void`
  - `toggleDeviceEnabled(deviceId: string): void`
- Action behavior:
  - Validate that the device exists before mutating state.
  - `selectDevice` sets `selectedDeviceId`, `selectedTrackId` to the device's track, and `selectedStationId` to `"daw"`.
  - `toggleDeviceEnabled` flips only `device.enabled`, then selects that device and track locally.
  - These actions must not change audio engine state, routing, clip state, transport, reducers, or sync.
- Add compact DAW-station device-chain UI:
  - Render a small `StudioDeviceChainControls` component near the DAW station without blocking the central lane or doorway.
  - Display selected track label/color.
  - Display selected/effective device label.
  - Display each device for the selected track in `track.deviceIds` order.
  - Show each device as a dim card with label, kind, `ON`/`OFF`, selected outline/marker, and a subtle chain line between cards.
  - Include small visual text such as `LOCAL CHAIN` or `NO ROUTE EDIT` so toggles read as local placeholders, not actual DSP bypass.
- Stable interactable IDs:
  - Select card: `studio-device-chain-select-${device.id}`
  - Toggle enabled: `studio-device-chain-toggle-${device.id}`
- Selected track/device display rules:
  - Selected track is `localDawState.selectedTrackId`.
  - Device list is `localDawState.devices` filtered by selected track and ordered by the selected track's `deviceIds`.
  - Effective selected device is `localDawState.selectedDeviceId` when it belongs to the selected track; otherwise use the first device on the selected track; otherwise `null`.
  - If the effective selected device differs from `selectedDeviceId`, the UI may display it without mutating state until the user clicks a device.
- Update the Device Rack overview lines to prefer the selected track's chain instead of global unique device names:
  - Example: `TRACK DRUMS`, `> INSTRUMENT ON`, `FILTER ON`, `LOCAL VISUAL`, `NO ROUTE EDIT`.
  - Keep lines short for canvas readability.
- Behavior rules:
  - `device.enabled` remains a local visual placeholder in this phase.
  - Selecting/toggling devices must not connect, disconnect, bypass, reorder, or parameterize the actual audio engine graph.
  - Preserve the fixed generated-audio path from prior phases: `filter -> autopan -> echo -> reverb -> master`.
  - Do not add arbitrary graph behavior, drag/drop, reorder, per-track sends, mixer behavior, meters, macros, presets, device parameter editor, transport coupling, clip launch, recording changes, MIDI device support, SoundCloud routing/processing, sync/session reducer changes, collision/config/movement/top-down changes, or unrelated refactors.
- Acceptance criteria:
  - DAW station shows a visible device chain for the selected local track.
  - Clicking a device card selects it using the stable select ID.
  - Clicking a toggle flips only that device's local `enabled` visual state using the stable toggle ID.
  - Selected device and enabled/disabled status are visibly reflected.
  - Device Rack overview reflects the selected track's device chain.
  - Toggling devices does not alter audio routing/audibility.
  - SoundCloud code is untouched.
  - `npm.cmd run build` passes.
- Risks:
  - The DAW station is already dense; keep the device chain compact and visually subordinate to transport/clip grid.
  - `enabled` can imply real DSP bypass; labels should make this local/visual-only.
  - Existing device IDs depend on definition order; avoid changing `DEVICE_DEFINITIONS` ordering unless necessary.
- Build and manual checks:
  - Run `npm.cmd run build`.
  - Manually verify selecting tracks via clip grid updates the device chain.
  - Manually verify device select/toggle visuals update locally.
  - Manually verify toggling devices does not change generated audio routing/audibility.
  - Manually verify existing filter/autopan/echo/reverb controls still work.
  - Manually verify SoundCloud jukebox/widget unchanged.
  - Manually spot-check DAW station readability, doorway/center lane clearance, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.
- Non-goals:
  - No SoundCloud routing/processing or SoundCloud code edits.
  - No audio engine graph changes.
  - No actual DSP bypass, per-track routing, sends, mixer, meters, macros, presets, or device parameter editor.
  - No drag/drop, reorder, arbitrary graph, or persisted/shared device-chain behavior.
  - No sync/session/reducer changes.
  - No collision/config/movement/top-down changes.
  - No docs/changelog closeout during implementation.

#### Completed Implementation

- Added `selectedDeviceId` plus local-only `selectDevice` and `toggleDeviceEnabled` actions.
- Added compact DAW-station device chain cards/toggles with stable select/toggle IDs.
- Updated the Device Rack overview to show the selected track chain and effective selected device.
- Kept device enabled state visual/local-only with no audio routing, graph, bypass, SoundCloud, sync/session/reducer, collision/config/movement/top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for track-select device chain updates, device select/toggle visuals, generated-audio routing/audibility unchanged, existing effects controls, SoundCloud jukebox/widget unchanged, DAW station readability, doorway/center lane clearance, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending.

### [x] Phase V4-26: Mixer And Meters

#### Summary

Add local mixer controls and visual meters.

#### Implementation Spec

- Expected files:
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/useLocalDawAudioEngine.ts`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
  - `src/3d/ThreeDModeShell.tsx` only if needed to pass track mute/volume gain into existing generated local clip playback.
- Reuse `LocalDawState.tracks` as the track mixer state source:
  - keep existing `track.volume` and `track.muted`.
  - add local-only actions: `setTrackVolume(trackId, volume)`, `adjustTrackVolume(trackId, delta)`, and `toggleTrackMute(trackId)`.
  - clamp track volume to `0..1`.
  - do not write mixer state to sync/session/reducers.
- Keep master mixer state in `LocalDawAudioEngineState`:
  - reuse existing `masterVolume` / `isMuted`.
  - preserve existing master clamps and safe muted default.
  - any master controls must use existing audio actions only and must not initialize/resume audio.
- Add phase-scoped generated-voice gain scaling:
  - add optional `gainScale?: number` to existing generated note/hit inputs if needed.
  - clamp gain scale to `0..1`.
  - apply gain scale per generated voice, not as a new bus/routing graph.
  - preserve the V4-24 fixed chain: generated voices -> filter -> autopan -> echo -> reverb -> master.
  - metronome remains master-governed only and is not affected by track mixer.
- Behavior rules:
  - generated clip playback respects the clip track's mute/volume gain scale.
  - direct generated auditions respect track gain when track identity is obvious:
    - drums -> `drums`.
    - bass and `RIFF` -> `bass`.
    - FM pads -> `fm-synth`.
    - piano live/controller output -> `piano` track gain while preserving the existing generated target behavior.
  - muted or zero-volume tracks should produce no generated voice output for that track.
  - master mute/volume continues to gate all app-owned generated audio.
- Mixer UI:
  - add compact DAW-station mixer strips for Drums, Bass, FM Synth, Piano, and Looper.
  - each strip shows label, volume readout, mute state, and a small visual meter.
  - stable interactable IDs:
    - `studio-mixer-${trackId}-mute`.
    - `studio-mixer-${trackId}-volume-down`.
    - `studio-mixer-${trackId}-volume-up`.
  - optional master controls, if included, use:
    - `studio-mixer-master-mute`.
    - `studio-mixer-master-volume-down`.
    - `studio-mixer-master-volume-up`.
  - keep controls visually subordinate to transport, clip grid, device chain, and ENGINE safety controls.
- Visual meters:
  - do not use analyser nodes, `useFrame`, polling timers, high-frequency sync, or Web Audio stream metering.
  - derive meter levels from local DAW state and app-owned audio-engine state/events such as `lastPlaybackTrigger`, active voice counts, last note/hit labels, playing/recording clip state, track volume, track mute, master volume, and master mute.
  - meters update only through normal React state changes.
- Overview/status updates:
  - update Track List or nearby DAW overview lines with compact mixer status such as `DRUMS V80 ON` or `BASS V00 MUTE`.
  - keep Device Rack focused on V4-25 device chain state.
- Acceptance criteria:
  - DAW station shows compact local mixer controls and visual meters for all local tracks.
  - Track volume/mute controls update only local DAW state.
  - Generated clip playback respects the source clip track mute/volume.
  - Direct generated auditions respect the obvious local track gain rules above.
  - Master mute/volume remains governed by existing audio-engine state/actions and clamps.
  - Visual meters update from local state/events without analyser nodes or high-frequency loops.
  - Metronome is unaffected by track mixer and remains master-governed only.
  - SoundCloud player/jukebox/widget code is untouched and not routed or processed.
  - `npm.cmd run build` passes.
- Risks:
  - The DAW station is dense; mixer strips must stay compact and readable.
  - Track gain scaling can look like a full mixer bus system; keep implementation per generated voice only.
  - Looper currently controls local MIDI/control clips rather than raw audio loops, so its meter should remain state-derived.
- Non-goals:
  - No SoundCloud raw processing, routing, effects, analysis, metering, imports, or code edits.
  - No sync/session/reducer changes.
  - No analyser nodes, professional meter ballistics, clipping indicators, high-frequency polling, or `useFrame` metering.
  - No solo, pan, sends, per-track effect routing, mixer buses, automation, macros, presets, or device parameter editor.
  - No arbitrary audio graph, effect reorder, or collision/config/movement/top-down changes.
- Build/manual checks:
  - Run `npm.cmd run build`.
  - Manual checks pending after implementation: mixer click targets, mute/volume audibility for generated playback, direct audition gain behavior, master safety controls, metronome track-mixer bypass, SoundCloud unchanged, DAW readability, traversal, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.

#### Completed Implementation

- Added local track mixer actions for volume set/adjust and mute toggles using existing `LocalDawState.tracks` fields.
- Added per-generated-voice gain scaling for FM, drums, bass, bass riff, piano live/controller output, and generated MIDI clip playback.
- Added compact DAW-station mixer strips with stable track/master mute and volume IDs.
- Added event/state-derived visual meters and compact Track List mixer status lines.
- Preserved the fixed generated-audio chain, master safety controls, metronome master-only behavior, and avoided SoundCloud, sync/session/reducer, analyser, high-frequency metering, collision/config/movement/top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks for mixer click targets/visuals, track mute/volume audibility, direct audition gain behavior, piano controller gain behavior, master controls, metronome track-mixer bypass, SoundCloud unchanged, DAW station readability, traversal/doorway clearance, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending.

### [x] Phase V4-27: Shared Tempo And Transport Design

#### Summary

Design shared DAW transport state.

#### Implementation Spec

- V4-27 is design-only:
  - edit this Vision 4 doc only.
  - do not edit code.
  - do not implement sync.
  - V4-28 owns implementation.
- Expected V4-27 file:
  - `docs/3d/3dvision4.md`.
- Relevant future V4-28 code files:
  - `src/types/session.ts`.
  - `src/lib/lobby/sessionState.ts`.
  - `src/mocks/session.ts`.
  - `src/hooks/useDabSyncSession.ts`.
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/ThreeDModeShell.tsx`.
- Proposed reducer-owned shared state:
  - add `SharedDawTransportState = "stopped" | "playing"`.
  - add `SharedDawTransport` to `SessionSnapshot` with:
    - `state`.
    - `bpm`.
    - `timeSignature: "4 / 4"`.
    - `anchorBar`.
    - `anchorBeat`.
    - optional `startedAt`.
    - optional `stoppedAt`.
    - `updatedAt`.
    - `updatedByUserId`.
    - `revision`.
  - clamp `bpm` to `60..180`.
  - keep `timeSignature` fixed at `"4 / 4"` for now.
  - use `anchorBar` / `anchorBeat` as sparse transport anchors, not high-frequency beat sync.
  - clients derive current bar/beat from `startedAt`, `bpm`, and `syncStatus.serverTimeOffsetMs`.
- Proposed reducer-owned events:
  - `daw_transport_set_tempo` with `bpm`.
  - `daw_transport_play`.
  - `daw_transport_stop`.
- Reducer behavior:
  - `daw_transport_set_tempo`: host-only, clamp BPM, update `updatedAt` / `updatedByUserId`, increment `revision`.
  - `daw_transport_play`: host-only, set state to `playing`, set `startedAt`, anchor to `1.1` for the first shared implementation, increment `revision`.
  - `daw_transport_stop`: host-only, set state to `stopped`, set `stoppedAt`, reset anchor to `1.1`, increment `revision`.
  - future phases can continue from current bar/beat, but V4-28 should stay simple.
- Authority and conflict behavior:
  - host/owner authority only, using existing `isActorHost(snapshot, actor)` semantics.
  - non-host transport/tempo events are ignored by the reducer.
  - reducer event order is authoritative.
  - if multiple valid host events arrive, the last reducer-applied event wins through incremented `revision`.
  - preserve existing fallback host behavior when no real host exists.
- Payload and update frequency rules:
  - sync only sparse control events: play, stop, and tempo changes.
  - do not sync beats, frames, notes, meters, clip playback ticks, or audio events.
  - event payloads must stay primitive and tiny.
  - no clip arrays, note data, mixer data, device data, generated audio state, or Web Audio state.
  - clients render beat/bar locally from shared anchor data.
- Local generated audio rules:
  - generated audio remains app-owned and local on each client.
  - shared transport may later start/stop local transport clocks, but Web Audio initialization, metronome output, instruments, effects, mixer, meters, and clip playback sound remain local/user-gated.
  - do not share audio buffers, nodes, SoundCloud streams, or effect/mixer state.
  - SoundCloud remains widget/jukebox playback only and is not routed or processed.
- V4-28 implementation path:
  - add `SharedDawTransport` to `SessionSnapshot` / `DabSyncState`.
  - initialize mock/session snapshots with stopped `120 BPM`, `4 / 4`, anchor `1.1`, and revision `0`.
  - add `SessionEvent` variants and reducer cases with host-only validation.
  - add hook senders in `useDabSyncSession`: `setDawTempo`, `playDawTransport`, and `stopDawTransport`.
  - bridge shared transport into the existing local DAW transport/controller in `ThreeDModeShell`.
  - local DAW controls should send shared events when connected and host-authorized; peers can be visually disabled or no-op in V4-28.
  - do not implement shared clip launch, shared MIDI, shared mixer, shared devices, shared effects, or shared audio.
- Acceptance criteria:
  - V4-27 documents the shared transport state, event contract, authority rules, payload rules, local-audio boundary, and V4-28 path.
  - design aligns with existing `SessionSnapshot`, `SessionEvent`, `reduceSessionEvent`, mock sync, and WebSocket sync flow.
  - design explicitly avoids high-frequency sync.
  - design keeps generated audio local on each client.
  - design preserves SoundCloud widget/jukebox isolation.
  - no code changes are made in V4-27.
- Risks:
  - client clock drift may be visible without a professional scheduler.
  - host-only transport may feel restrictive; broader role permissions should be later.
  - bridging shared transport into local DAW state must avoid feedback loops.
  - clients without initialized/unmuted local audio may show shared transport running while remaining silent, which is expected.
- Non-goals:
  - no code implementation in V4-27.
  - no sync implementation yet.
  - no high-frequency transport, meter, MIDI, clip, or audio sync.
  - no shared clip state, recorded notes, mixer/device/effect state, or DJ deck state.
  - no SoundCloud routing, processing, or code changes.
  - no Web Audio routing or generated audio changes.
  - no collision/config/movement/top-down changes.
- Build/manual checks:
  - docs-only phase; no build required unless manager requests one.
  - manual doc check: V4-27 section only, phase remains unchecked, changelog untouched.
  - V4-28 should run `npm.cmd run build` and manually check host play/stop/tempo, peer read-only behavior, sparse event frequency, local audio user-gating, and SoundCloud unchanged.

#### Completed Implementation

- Documented the V4-28 shared transport state shape, sparse event contract, host authority rules, conflict behavior, payload/frequency limits, local-audio boundary, and implementation path.
- Kept V4-27 docs-only with no code, changelog, SoundCloud, audio, sync implementation, collision/config/movement/top-down changes.

#### Build And Manual Checks

- Docs-only phase; build not required.
- Manual doc review confirmed the design is contained to the V4-27 section and defers implementation to V4-28.

### [x] Phase V4-28: Shared Transport Implementation

#### Summary

Sync only tempo and transport state.

#### Implementation Spec

- Expected files:
  - `src/types/session.ts`.
  - `src/lib/lobby/sessionState.ts`.
  - `src/hooks/useDabSyncSession.ts`.
  - `src/screens/MainScreen.tsx`.
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/ThreeDModeShell.tsx`.
  - `src/3d/Level1RoomShell.tsx`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
  - `src/mocks/session.ts` only if type fallout requires a tiny alignment.
  - `src/lib/sync/wsSyncClient.ts` only if needed to normalize/hydrate incoming server snapshots.
- Add session types:
  - `SharedDawTransportState = "stopped" | "playing"`.
  - `SharedDawTransport` with `state`, `bpm`, `timeSignature: "4 / 4"`, `anchorBar`, `anchorBeat`, optional `startedAt`, optional `stoppedAt`, `updatedAt`, `updatedByUserId`, and `revision`.
  - `SessionSnapshot.dawTransport`.
  - `SessionEvent` variants:
    - `daw_transport_set_tempo` with `bpm`.
    - `daw_transport_play`.
    - `daw_transport_stop`.
- Add `sessionState.ts` helpers:
  - `clampDawBpm(value)` clamped to `60..180`.
  - `createInitialSharedDawTransport(nowIso?)`.
  - `normalizeSessionSnapshot(snapshot)` that preserves existing snapshot fields and only backfills missing `dawTransport` with `createInitialSharedDawTransport()`.
  - use the normalizer anywhere local code attaches or consumes snapshots so older server snapshot shapes do not break the client.
  - if `wsSyncClient.ts` receives snapshots directly, call the normalizer before assigning `this.snapshot = payload.snapshot`.
- Initialize shared transport:
  - stopped.
  - `120 BPM`.
  - `4 / 4`.
  - anchor `1.1`.
  - revision `0`.
  - stable system/user metadata.
  - preserve `overrides?.dawTransport`.
- Reducer behavior:
  - host/owner authority only, using existing `isActorHost(snapshot, actor)` semantics.
  - non-host transport/tempo events return the unchanged snapshot.
  - `daw_transport_set_tempo`: clamp BPM, update `updatedAt` / `updatedByUserId`, increment `revision`, preserve play state.
  - `daw_transport_play`: set `state: "playing"`, set `startedAt`, clear `stoppedAt`, anchor to `1.1`, increment `revision`.
  - `daw_transport_stop`: set `state: "stopped"`, set `stoppedAt`, reset anchor to `1.1`, increment `revision`.
  - reducer event order is authoritative; last valid host event wins.
  - do not add reducer time advancement for DAW transport.
- Add hook senders in `useDabSyncSession`:
  - `setDawTempo(bpm)`.
  - `playDawTransport()`.
  - `stopDawTransport()`.
- Main/3D prop flow:
  - pass `state.dawTransport`, `state.syncStatus`, `lobbyState.isLocalHost`, and the three DAW transport senders from `MainScreen` to `ThreeDModeShell`.
  - pass shared transport/control props through `Level1RoomShell` to `Level1RecordingStudioRoom` only as needed for DAW transport controls.
- Local DAW mirror behavior:
  - add `applySharedTransportSnapshot({ state, bpm, bar, beat })` to `useLocalDawState`.
  - `ThreeDModeShell` derives current bar/beat locally from shared `startedAt`, BPM, and `syncStatus.serverTimeOffsetMs`.
  - mirror shared transport into local DAW state in an effect keyed by shared `revision`, not by local beat.
  - local clock ticks and `advanceTransportBeat` never send sync events.
  - avoid feedback loops: controls send shared events, reducer snapshot returns, mirror updates local state.
- Recording Studio transport controls:
  - existing `studio-transport-play-stop`, `studio-transport-tempo-down`, and `studio-transport-tempo-up` remain the only transport interactables.
  - host-authorized controls send shared play/stop/BPM events.
  - peers see visible read-only/host-only controls that are disabled or no-op.
  - if shared props/callbacks are absent, preserve local-only fallback behavior for dev resilience.
- Local generated audio boundary:
  - shared transport starts/stops local transport state only.
  - no `AudioContext` creation/resume from shared play.
  - metronome and generated clip playback remain local and user-gated behind ENGINE, unmuted state, and volume.
  - no Web Audio routing changes.
  - SoundCloud remains widget/jukebox playback only and is not routed or processed.
- High-frequency sync avoidance:
  - send only sparse play, stop, and tempo events.
  - do not sync beats, frames, notes, meters, clip playback ticks, MIDI, mixer/device/effect state, DJ state, or audio events.
  - clients render beat/bar locally from shared anchor data.
- Acceptance criteria:
  - shared DAW transport exists in session snapshots and is hydrated for older/missing snapshot shapes.
  - host can change BPM, play, and stop from the Recording Studio DAW transport controls.
  - reducer ignores non-host DAW transport events.
  - peer controls are visibly read-only/host-only and cannot mutate shared transport.
  - local DAW transport mirrors shared play/stop/BPM without feedback loops.
  - shared play does not create/resume audio.
  - local generated audio remains local/user-gated.
  - no high-frequency sync events are introduced.
  - SoundCloud widget/jukebox/player code is untouched.
  - `npm.cmd run build` passes.
- Risks:
  - clock drift may be visible without a professional scheduler.
  - reducer round-trip can make host controls feel slightly delayed; keep reducer state authoritative.
  - local clip playback can differ by client because clips/audio remain local.
  - normalizing old snapshots must avoid overwriting valid current shared transport data.
- Non-goals:
  - no shared clip launch.
  - no shared MIDI/note data.
  - no shared mixer, device, effect, DJ, meter, or audio state.
  - no SoundCloud routing/processing/code changes.
  - no Web Audio routing changes.
  - no professional scheduler, lookahead, latency compensation, or sub-beat sync.
  - no collision/config/movement/top-down changes.
- Build/manual checks:
  - run `npm.cmd run build`.
  - manually check host play/stop/BPM, peer read-only behavior, sparse event frequency, local transport mirror/reset, local audio user-gating, metronome/local clip behavior, SoundCloud unchanged, Recording Studio traversal/readability, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal.

#### Completed Implementation

- Added reducer-owned shared DAW transport state to session snapshots, including `120 BPM`, `4 / 4`, sparse anchor data, host/user metadata, and revision tracking.
- Added host-authoritative sparse transport events for tempo, play, and stop, with snapshot normalization/backfill for older missing `dawTransport` shapes.
- Added hook senders and passed shared transport/control props from `MainScreen` through the 3D shell into the Recording Studio.
- Mirrored shared transport into local DAW state without feedback events, while preserving local clock/audio behavior and user-gated generated sound.
- Updated the existing three DAW transport controls to send shared events for hosts and render read-only/host-only behavior for peers, with local-only fallback when shared props are absent.
- Kept SoundCloud isolated to widget/jukebox playback and made no Web Audio routing changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manager review confirmed the reducer/event path is sparse and host-authoritative, local mirror updates do not send sync events, shared play does not initialize/resume Web Audio, and SoundCloud code remains isolated.
- Manual checks for host play/stop/BPM, peer read-only behavior, sparse event frequency, local transport mirror/reset, local audio user-gating, metronome/local clip behavior, SoundCloud unchanged, Recording Studio traversal/readability, Tab top-down, Control Room, Shooting Range, Audio Workbench, Exit/recovery, and reveal remain pending for V4-32.

### [x] Phase V4-29: Shared Clip Summary Design

#### Summary

Design how compact clip summaries and MIDI clips can sync between friends.

#### Implementation Spec

- Design-only phase; V4-30 implements after this contract.
- Expected V4-30 files:
  - `src/types/session.ts`.
  - `src/lib/lobby/sessionState.ts`.
  - `src/hooks/useDabSyncSession.ts`.
  - `src/screens/MainScreen.tsx`.
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/ThreeDModeShell.tsx`.
  - `src/3d/Level1RoomShell.tsx` only for prop flow if needed.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
  - `src/mocks/session.ts`, `src/lib/sync/mockSyncClient.ts`, and `src/lib/sync/wsSyncClient.ts` only for type/snapshot normalization fallout.
- Shared type shapes for V4-30:
  - `SharedDawTrackId = "drums" | "bass" | "fm-synth" | "piano" | "looper"`.
  - `SharedDawClipKind = "midi" | "control" | "mixed"`.
  - `SharedDawClipState = "recorded"`.
  - `SharedDawClipSummary`:
    - `id`: derived stable slot id from `(trackId, sceneIndex)`, e.g. `fm-synth-scene-1`.
    - `trackId`, `sceneIndex`, `label`, `kind`, `state`, `lengthBars`, `noteCount`, `controlEventCount`.
    - reducer-derived metadata: `ownerUserId`, `updatedByUserId`, `updatedAt`, `revision`, `checksum`.
  - `SharedDawMidiNote`:
    - `pitch`, `label`, `startStep`, `durationSteps`, `velocity`.
  - `SharedDawControlEvent`:
    - `target: "clip-length" | "track-volume" | "track-mute" | "device-enabled"`.
    - `step`, `value`.
  - `SharedDawClip`:
    - `summary`, `midiNotes`, `controlEvents`.
  - `SharedDawClipsState`:
    - `clips: SharedDawClip[]`.
    - `revision`, `updatedAt`.
- Prefer compact populated slots in the snapshot:
  - Store only populated shared clips, not all 20 empty slots.
  - Empty UI slots are derived locally from the fixed 5 tracks x 4 scenes.
  - `daw_clip_clear` removes the matching slot from `SharedDawClipsState.clips`.
  - Slot identity is stable `(trackId, sceneIndex)`; any `id` is derived from that pair and local ids are compatibility/display convenience only.
- Reducer events for V4-30:
  - `daw_clip_publish` with a compact clip payload.
  - `daw_clip_clear` with `trackId` and `sceneIndex`.
  - Do not add live note, note-on/off, beat, frame, meter, playback tick, audio, Web Audio, mixer, device, effect, or DJ events.
- Authority and ownership rules:
  - Actor must be a joined non-spectating session user.
  - Empty shared slots may be first published by any eligible actor.
  - Reducer must not trust payload metadata.
  - On `daw_clip_publish`, derive `ownerUserId` from the existing slot owner or `actor.id` when first claiming an empty slot.
  - Derive `updatedByUserId`, `updatedAt`, `revision`, and `checksum` after sanitization in the reducer.
  - Ignore/spoof-proof incoming payload metadata for owner, updater, timestamps, revision, checksum, and derived id.
  - Non-host users may update or clear only slots they own.
  - Host/owner may update or clear any shared slot.
  - Non-owner, non-host attempts return the unchanged snapshot.
  - Reducer event order is authoritative; first valid publish claims an empty slot and last valid owner/host update wins.
  - No station-role gating yet; V4-31 owns studio presence/roles.
- Payload limits and validation:
  - Maximum populated shared clips: `20`.
  - Maximum MIDI notes per clip: `128`.
  - Maximum control events per clip: `64`.
  - Maximum serialized clip payload: about `16000` characters.
  - Valid scenes: `0..3`.
  - Valid `lengthBars`: `1 | 2 | 4 | 8`.
  - Steps per clip: `lengthBars * 16`.
  - Clamp/reject `pitch` outside `0..127`.
  - Clamp/reject `startStep` outside the clip step range.
  - Clamp `durationSteps` to `1..stepsPerClip`, trimming to clip end.
  - Clamp `velocity` to `0..1`.
  - Trim labels, strip control characters, and cap clip labels around 24 characters and note labels around 8 characters.
  - Sanitize to a canonical payload before storing; invalid or oversized payloads return the unchanged snapshot.
- Reset and lifecycle behavior:
  - `admin_reset_session` clears shared DAW clips back to an empty populated-slot list.
  - `reset_round` preserves shared DAW clips because a game round reset should not wipe a music sketch.
  - `admin_force_complete_round` preserves shared DAW clips.
  - `join_session` receives current shared clips through the snapshot.
  - Snapshot normalization backfills missing `dawClips` for older server shapes without overwriting valid shared clip data.
- Local mapping:
  - Convert local `LocalDawMidiNoteEvent.frequency` to compact MIDI pitch when publishing.
  - Convert shared MIDI pitch back to local generated frequency when importing.
  - Imported shared data should be visibly shared/owned in local UI.
  - Imported shared data should not silently overwrite unrelated local unsynced work.
  - Imported data should only replace matching shared slot data through a dedicated mirror action, such as `applySharedClipsSnapshot(sharedDawClips)`.
  - Local generated playback remains local/user-gated; shared clips do not create/resume audio.
- V4-30 implementation path:
  - Add shared clip types and `SessionSnapshot.dawClips`.
  - Add `createInitialSharedDawClipsState()` and extend `normalizeSessionSnapshot()`.
  - Add reducer sanitizers and `daw_clip_publish` / `daw_clip_clear` cases.
  - Add `publishDawClip()` and `clearDawClip()` senders in `useDabSyncSession`.
  - Pass shared clip state/senders from `MainScreen` into the 3D shell as needed.
  - Add local import/export helpers in `useLocalDawState`.
  - Mirror shared clips in `ThreeDModeShell` without feedback loops.
  - Add minimal in-world shared status and explicit publish/clear controls only if needed.
  - Keep explicit publish first: no auto-publish-on-note, no publish-on-beat, no publish-on-record-step, and no live note stream.
- Acceptance criteria:
  - V4-29 documents shared clip summary and compact MIDI/control clip shapes.
  - Design uses reducer-owned sparse events only.
  - Design includes spoof-proof reducer-derived metadata, ownership, host override, validation, payload limits, reset behavior, local mapping, and V4-30 path.
  - Design stores only populated shared slots and derives empty slots locally.
  - Design keeps generated audio local/user-gated.
  - Design avoids SoundCloud routing/processing and high-frequency sync.
  - No code or changelog edits are made in V4-29.
- Risks:
  - Clip ownership may feel restrictive; host override is the first safety valve.
  - Frequency-to-MIDI conversion can lose tiny tuning differences; acceptable for generated app-owned notes.
  - Shared imports can overwrite local ideas if V4-30 is careless; keep replacement slot-scoped, visible, and dedicated.
  - Payload validation must stay strict to prevent snapshot growth.
  - Clients may hear different audio because local engines, mute, volume, and initialized state remain local.
- Non-goals:
  - No V4-30 implementation in V4-29.
  - No live MIDI/note stream sync.
  - No raw audio, samples, buffers, Web Audio nodes, SoundCloud streams, meters, frames, or audio events in sync.
  - No shared mixer/device/effect/DJ/audio engine state.
  - No clip playback scheduling sync beyond existing shared transport.
  - No professional scheduler, lookahead, latency compensation, or sub-beat sync.
  - No SoundCloud widget/jukebox/player changes.
  - No collision/config/movement/top-down changes.
- Build/manual checks:
  - Docs/design-only, so no build required for V4-29.
  - Manual doc check: V4-29 section only, phase marked complete, V4-30 remains implementation, changelog untouched.
  - V4-30 should run `npm.cmd run build`.

#### Completed Implementation

- Documented the V4-30 shared clip summary and compact MIDI/control clip sync design.
- Marked V4-29 complete because it is a docs/design-only phase.
- Kept implementation deferred to V4-30, with no code, changelog, SoundCloud, sync runtime, audio, collision/config/movement/top-down changes.

#### Build And Manual Checks

- Docs-only phase; build not required.
- Manual doc check confirmed the design is contained to V4-29, V4-30 remains unchecked, and changelog is untouched.

### [x] Phase V4-30: Shared MIDI Clip Implementation

#### Summary

Sync compact MIDI/control clip data.

#### Implementation Spec

- Implement compact shared clip summaries and MIDI/control clip data using reducer-owned sparse events from the approved V4-29 design.
- Keep this to one implementation phase if it stays within:
  - reducer-owned shared clip state/events.
  - selected-clip explicit publish/export.
  - shared snapshot mirror/import with visible shared/conflict marker.
  - exactly two DAW-station shared clip controls plus small status lines.
- If implementation becomes larger than that, stop and report the smallest safe split instead of forcing it.
- Expected files:
  - `src/types/session.ts`.
  - `src/lib/lobby/sessionState.ts`.
  - `src/hooks/useDabSyncSession.ts`.
  - `src/screens/MainScreen.tsx`.
  - `src/3d/useLocalDawState.ts`.
  - `src/3d/ThreeDModeShell.tsx`.
  - `src/3d/Level1RoomShell.tsx`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
  - `src/lib/sync/mockSyncClient.ts` because it manually constructs `SessionSnapshot`.
  - `src/lib/sync/wsSyncClient.ts` only if snapshot normalization requires adjustment.
  - `src/mocks/session.ts` only if type fallout requires tiny alignment.
- Add session/shared clip types:
  - `SharedDawTrackId = "drums" | "bass" | "fm-synth" | "piano" | "looper"`.
  - `SharedDawClipKind = "midi" | "control" | "mixed"`.
  - `SharedDawClipState = "recorded"`.
  - `SharedDawControlTarget = "clip-length" | "track-volume" | "track-mute" | "device-enabled"`.
  - `SharedDawMidiNote`: `pitch`, `label`, `startStep`, `durationSteps`, `velocity`.
  - `SharedDawControlEvent`: `target`, `step`, `value`.
  - `SharedDawClipPublishPayload`: `trackId`, `sceneIndex`, `label`, `kind`, `lengthBars`, `midiNotes`, `controlEvents`.
  - `SharedDawClipSummary`: reducer-derived `id`, slot fields, counts, `ownerUserId`, `updatedByUserId`, `updatedAt`, `revision`, `checksum`.
  - `SharedDawClip`: `summary`, `midiNotes`, `controlEvents`.
  - `SharedDawClipsState`: populated `clips`, `revision`, `updatedAt`.
  - `SessionSnapshot.dawClips`.
- The publish payload type must intentionally omit `ownerUserId`, `updatedByUserId`, `updatedAt`, `revision`, `checksum`, and `id`; the reducer derives/spoof-proofs all metadata.
- Add sparse `SessionEvent` variants:
  - `daw_clip_publish` with `clip: SharedDawClipPublishPayload`.
  - `daw_clip_clear` with `trackId` and `sceneIndex`.
- Do not add live note, note-on/off, beat, frame, meter, playback tick, audio, Web Audio, mixer, device, effect, DJ, or SoundCloud events.
- In `sessionState.ts`, add helpers/constants:
  - `MAX_SHARED_DAW_CLIPS = 20`.
  - `MAX_SHARED_CLIP_NOTES = 128`.
  - `MAX_SHARED_CLIP_CONTROL_EVENTS = 64`.
  - `MAX_SHARED_CLIP_JSON_CHARS = 16000`.
  - `SHARED_DAW_TRACK_IDS`, `SHARED_DAW_SCENE_COUNT = 4`, and allowed loop lengths `[1, 2, 4, 8]`.
  - `createInitialSharedDawClipsState(updatedAt?)`.
  - `getSharedDawClipSlotId(trackId, sceneIndex)`.
  - `sanitizeSharedDawClipPublishPayload(payload)`.
  - `sanitizeSharedDawMidiNote(note, stepsPerClip)`.
  - `sanitizeSharedDawControlEvent(event, stepsPerClip)`.
  - `createSharedDawClipChecksum(sanitizedPayload)` from deterministic canonical JSON, not for security.
  - extend `normalizeSessionSnapshot()` to backfill missing `dawClips` without overwriting valid shared clip data.
- Store only populated shared slots:
  - `SharedDawClipsState.clips` contains populated slots only.
  - Empty UI slots are derived locally from fixed 5 tracks x 4 scenes.
  - Slot identity is stable `(trackId, sceneIndex)`.
  - `id` is derived from `(trackId, sceneIndex)`, e.g. `fm-synth-scene-1`.
  - Local ids are compatibility/display convenience only.
- Reducer validation for `daw_clip_publish`:
  - Actor eligibility is `actor` exists in `snapshot.users` and `actorUser.presence !== "spectating"`.
  - Normalize snapshot first.
  - Find existing populated slot by `(trackId, sceneIndex)`.
  - Sanitize payload before storing.
  - Reject invalid track ids, invalid scenes, invalid loop lengths, invalid arrays, invalid labels, invalid notes/control events, empty invalid payloads, or oversized serialized payloads.
  - Clamp/reject pitch outside `0..127`.
  - Clamp/reject `startStep` outside the clip step range.
  - Clamp `durationSteps` to `1..stepsPerClip`, trimming to clip end.
  - Clamp `velocity` to `0..1`.
  - Strip label control characters; cap clip labels around 24 chars and note labels around 8 chars.
  - Enforce ownership: empty slot can be claimed by eligible actor; existing slot can be updated only by owner or host; non-owner/non-host returns unchanged snapshot.
  - Derive metadata after sanitization: `id`, `ownerUserId`, `updatedByUserId`, `updatedAt`, `revision`, `checksum`, `noteCount`, `controlEventCount`, and `state: "recorded"`.
  - Replace only the matching populated slot, increment `dawClips.revision`, and update `dawClips.updatedAt`.
- Reducer validation for `daw_clip_clear`:
  - Actor eligibility is actor exists in `snapshot.users` and is not spectating.
  - Find existing populated slot by `(trackId, sceneIndex)`.
  - If no slot exists, return unchanged snapshot.
  - Allow clear only by slot owner or host.
  - Remove the slot from `dawClips.clips`, increment `dawClips.revision`, and update `dawClips.updatedAt`.
- Reset/lifecycle behavior:
  - `admin_reset_session` clears shared clips to an empty populated-slot list.
  - `reset_round` preserves shared clips.
  - `admin_force_complete_round` preserves shared clips.
  - `join_session` receives current shared clips through the snapshot.
  - Older snapshots missing `dawClips` hydrate safely.
- Local DAW mapping in `useLocalDawState`:
  - Add optional shared metadata to `LocalDawClip`, such as `shared?: { ownerUserId; updatedByUserId; revision; checksum; importStatus: "synced" | "conflict" }`.
  - Extend note source with `"shared-import"`.
  - Add `createSharedClipPublishPayloadForSelectedClip(): SharedDawClipPublishPayload | null`.
  - Add `applySharedClipsSnapshot(sharedDawClips: SharedDawClipsState): void`.
  - Export selected clip only.
  - Do not publish while selected clip is `recording`.
  - Convert local frequency to MIDI pitch with `Math.round(69 + 12 * Math.log2(frequency / 440))`, clamped `0..127`.
  - Convert local note timing to 16th-grid `startStep` / `durationSteps`.
  - Include a tiny `clip-length` control event at step `0` with `value: lengthBars` to exercise compact control-data sync without adding control automation UI.
  - Imported shared pitch converts back to local generated frequency.
  - Imported shared notes use stable ids like `shared-${slotId}-note-${index + 1}` and source `"shared-import"`.
  - If target clip has no local notes or was previously synced from the same shared slot, replace only that slot's imported shared notes and mark `synced`.
  - If target clip has local unsynced notes and no matching prior shared metadata, preserve local notes and mark `conflict`.
  - If shared slot is cleared, remove imported shared notes only for previously synced imported data; preserve local/conflicted notes.
  - Mirror/import must not select clips, start playback, create/resume audio, or publish back.
- Hook and prop flow:
  - Add `publishDawClip(clip)` and `clearDawClip(trackId, sceneIndex)` in `useDabSyncSession`.
  - Pass `state.dawClips`, `publishDawClip`, and `clearDawClip` from `MainScreen` to `ThreeDModeShell`.
  - In `ThreeDModeShell`, mirror shared clips with an effect keyed by `sharedDawClips.revision` calling `localDawActions.applySharedClipsSnapshot(sharedDawClips)`.
  - Pass shared clip state/senders, `localUserId`, and host/admin authority to `Level1RecordingStudioRoom` through `Level1RoomShell`.
  - Avoid feedback loops: mirror never publishes; publish/clear only come from explicit user controls.
- UI/control scope:
  - Add exactly two new shared clip interactables for V4-30:
    - `studio-shared-clip-publish`.
    - `studio-shared-clip-clear`.
  - Controls stay small and near the DAW clip grid.
  - Publish is explicit and selected-clip only.
  - Publish is enabled only when the selected clip exists, is not recording, and can produce a compact payload.
  - Clear is enabled only when the selected slot has shared data and local user is owner or host; reducer still enforces authority.
  - Add small static shared status/owner/revision/conflict lines to the Clip Grid overview and/or selected clip area.
  - Do not add any other shared clip interactables in V4-30.
- Acceptance criteria:
  - `SessionSnapshot` includes compact populated shared clips and normalizes older snapshots.
  - Reducer accepts only sparse explicit publish/clear events.
  - Reducer derives/spoof-proofs all metadata and rejects/ignores invalid or unauthorized events.
  - Shared clips store only populated slots.
  - Empty clip grid slots are still local UI derivations.
  - Explicit selected-clip publish syncs compact MIDI/control data to the session snapshot.
  - Clear removes only the shared populated slot.
  - Shared import visibly marks synced/conflicted slots and does not silently overwrite unrelated local unsynced work.
  - No sync events fire during piano key clicks, recording steps, playback ticks, beats, meters, frames, or audio actions.
  - Shared clip import/playback does not create/resume Web Audio.
  - SoundCloud widget/jukebox/player code remains untouched.
  - `npm.cmd run build` passes.
- Risks:
  - This phase touches session types, reducer validation, local mapping, prop flow, and UI; keep UI to the two controls and status only.
  - Conflict handling can grow; V4-30 only preserves local work and marks conflict.
  - Frequency-to-MIDI conversion loses tiny tuning differences, acceptable for generated app-owned notes.
  - Checksum must be deterministic but is not security.
  - Strict payload validation is needed to prevent snapshot growth.
- Non-goals:
  - No SoundCloud code/import/routing/processing changes.
  - No raw audio, samples, buffers, Web Audio node sync, audio events, meters, frames, or playback tick sync.
  - No live note streams or note-on/off sync.
  - No auto-publish on note, beat, record step, or transport.
  - No shared mixer/device/effect/DJ/audio engine state.
  - No full conflict resolution or merge UI.
  - No station role permissions; V4-31 owns that.
  - No professional scheduler, lookahead, latency compensation, sub-beat sync, or clip playback scheduling sync.
  - No collision/config/movement/top-down changes.
- Build/manual checks:
  - Run `npm.cmd run build`.
  - Manually verify explicit selected-clip publish.
  - Manually verify empty shared slot claiming, owner update/clear, host update/clear, and non-owner/non-host rejection.
  - Manually verify shared clip appears on another client after snapshot update.
  - Manually verify imported shared clips are visibly shared/owned.
  - Manually verify local unsynced notes are preserved and conflict status appears.
  - Manually verify `admin_reset_session` clears shared clips and `reset_round` preserves them.
  - Manually verify older snapshots missing `dawClips` hydrate safely.
  - Manually verify no high-frequency or audio/SoundCloud sync events are introduced.

#### Completed Implementation

- Added compact populated-slot shared DAW clip state, publish payload types, and reducer-owned sparse `daw_clip_publish` / `daw_clip_clear` events.
- Added reducer validation, payload limits, actor eligibility, owner/host authority, metadata derivation, checksums, snapshot backfill, and `admin_reset_session` shared-clip clearing while preserving clips on `reset_round`.
- Added local selected-clip export and shared snapshot import/mirror with `synced` / `conflict` metadata.
- Preserved unrelated local unsynced notes on conflicts, including preserving the local clip length/state while still surfacing shared conflict metadata.
- Wired shared clip state/actions through the sync hook, main screen, 3D shell, room shell, and Recording Studio.
- Added exactly two DAW-station shared clip interactables, `studio-shared-clip-publish` and `studio-shared-clip-clear`, plus compact shared owner/revision/conflict status text.
- Kept SoundCloud isolated to widget/jukebox playback and avoided audio/Web Audio, high-frequency sync, live-note sync, mixer/device/effect/DJ sync, collision/config/movement/top-down changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manager review confirmed the reducer uses sparse events, derives/spoof-proofs metadata, stores only populated slots, and that conflict imports preserve local unsynced clip length/state.
- Manual checks for multi-client publish/clear propagation, owner/host/non-owner authority, conflict marker behavior, `admin_reset_session` clearing, `reset_round` preservation, older snapshot hydration, SoundCloud unchanged, no high-frequency sync events, and no Web Audio initialization from shared import/publish remain pending for V4-32.

### [x] Phase V4-31: Studio Presence And Roles

#### Summary

Show who is operating which station.

#### Implementation Spec

- Add visual-only Recording Studio role/occupancy badges.
- Key decision: do not add reducer, session, sync, or new presence events in V4-31.
- Use existing fresh free-roam presence for remote studio occupancy and existing `localDawState.selectedStationId` for the local user's selected studio role.
- Expected files:
  - `src/3d/Level1RoomShell.tsx`.
  - `src/3d/Level1RecordingStudioRoom.tsx`.
  - Optional small visual helper only if needed, such as `src/3d/StudioRoleMarker.tsx`.
- Pass the minimum existing context from `Level1RoomShell` into `Level1RecordingStudioRoom`:
  - `users`.
  - `localUserId`.
  - `ownerId`.
  - fresh `freeRoamPresence` for the current level, or enough data to derive it consistently with existing free-roam markers.
- Add studio role anchors in `Level1RecordingStudioRoom` for:
  - DAW near `[-21.25, 0, -4.6]`.
  - Piano / MIDI near `[-17.2, 0, 0.16]`.
  - Looper near `[-17.0, 0, -8.1]`.
  - DJ near `[-12.0, 0, -1.2]`.
  - Instrument Rack near `[-20.1, 0, -8.32]`.
  - Effects Rack near `[-13.8, 0, -8.32]`.
- Derive remote occupancy locally by assigning fresh non-local free-roam users to the nearest studio role anchor within a small radius, roughly `1.8..2.2` world units.
- Derive local occupancy by mapping `localDawState.selectedStationId`:
  - `daw` -> DAW.
  - `piano-midi` -> Piano / MIDI.
  - `looper` -> Looper.
  - `dj` -> DJ.
  - `instrument-rack` -> Instrument Rack.
  - `effects-rack` -> Effects Rack.
- Render small dim/static canvas badges or marker posts above/behind each station:
  - role label.
  - `YOU`, remote display name, `HOST`, `SIM`, `+N`, or `OPEN` status as applicable.
  - keep badges visually subordinate to existing station controls and clear of the z `-4.6` doorway/center lane.
- Do not call `useRegisterInteractable` or add any new clickable behavior.
- Do not add audio, Web Audio, SoundCloud, sync, reducer, session, collision, movement, top-down, area, opening, blocker, or traversal changes.
- Acceptance criteria:
  - all six studio stations show role labels.
  - local selected station shows `YOU`.
  - fresh remote free-roam users standing near studio stations appear as occupants of the nearest station.
  - empty stations read as `OPEN`.
  - existing Control Room station markers and free-roam markers still render normally.
  - no new network event cadence or high-frequency presence stream is introduced.
- Risks:
  - remote occupancy is proximity-derived and approximate, not an explicit station claim.
  - local role follows existing `selectedStationId` updates and may stay on the last selected station until an existing studio control changes it.
  - crowded stations should use simple nearest-user plus `+N` display rather than complex stacking.
- Non-goals:
  - no shared role claim model.
  - no station locking, permissions, host authority, or role ownership.
  - no audio or SoundCloud behavior.
  - no collision, movement, top-down, or layout changes.
- Build/manual checks for implementation:
  - run `npm.cmd run build`.
  - manually verify role badges in the Recording Studio.
  - manually verify `YOU` follows existing local station selection.
  - manually verify remote/free-roam proximity occupancy in a multi-user or simulated session if available.
  - manually verify the doorway and central walking lane remain visually clear.

#### Completed Implementation

- Added visual-only Recording Studio role badges for DAW, Piano / MIDI, Looper, DJ, Instrument Rack, and Effects Rack.
- Passed existing users, local user id, owner id, and already-fresh free-roam presence from `Level1RoomShell` into the Recording Studio room.
- Derived remote occupants by proximity to studio role anchors using existing free-roam presence, with nearest-user and `+N` display.
- Derived the local `YOU` badge only from actual `localDawState.selectedStationId`, with no fallback/invented local role when local DAW state is absent.
- Kept the badges non-interactive and avoided new reducer/session/sync events, new presence cadence, audio/Web Audio, SoundCloud, collision, movement, top-down, area, opening, blocker, or traversal changes.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manager review confirmed V4-31 only passes existing fresh presence/user context and adds visual role badges with no new interactables or sync events.
- Manual checks for in-world badge placement/readability, `YOU` following station selection, remote/free-roam proximity occupancy, doorway/center-lane clearance, SoundCloud/jukebox, Control Room, Shooting Range, transport, clip controls, and Tab top-down remain pending for V4-32.

### [x] Phase V4-32: Studio Manual Test And Recovery Pass

#### Summary

Harden the studio experience.

#### Implementation Spec

- Run the V4-32 hardening pass as verification plus documentation. Do not add features.
- Code changes are out of scope unless a concrete bug is found during verification.
- Expected doc update after verification:
  - refresh this V4-32 section with completed checks.
  - split results into `Passed`, `Not Run`, and `Pending / Requires Browser or Multi-Client`.
  - keep browser, in-world, multi-client, and audio-output checks pending unless they are actually run.
- Build/static checks:
  - run `npm.cmd run build`.
  - inspect that SoundCloud remains widget/jukebox playback only and is not routed into `useLocalDawAudioEngine`.
  - inspect audio cleanup paths:
    - `ThreeDModeShell.handleExit` calls `localDawAudioActions.cleanup()` before `onExit`.
    - `useLocalDawAudioEngine` disconnects/stops voices, closes the `AudioContext`, and runs unmount cleanup.
  - inspect that WebGL fallback/error panel and normal shell recovery paths remain present.
  - inspect that free-roam presence still uses the existing cadence and V4-31 adds no new presence stream.
- Browser/in-world checklist, pending unless actually run:
  - hidden world entry and normal app recovery.
  - Exit button cleanup and return to the normal app.
  - Recording Studio doorway traversal and collision.
  - z `-4.6` center lane and doorway clearance.
  - Tab top-down framing and local marker.
  - role badge placement/readability and non-interaction.
  - station reticle/click behavior only for expected existing controls.
  - Control Room, Shooting Range entry/gameplay, jukebox/SoundCloud, Audio Workbench, reveal, and recovery.
- Audio-output checklist, pending unless actually run:
  - no `AudioContext` before `ENGINE`.
  - `ENGINE`, MUTE, VOL -, VOL +, metronome, generated FM/drum/bass/piano voices, effects, mixer, recording, and clip playback work at safe volume.
  - Exit/unmount stops active local voices and closes/cleans the local audio engine.
  - SoundCloud jukebox/widget audio is unchanged and not processed by the app-owned audio graph.
- Shared/multi-client checklist, pending unless actually run:
  - host transport controls and peer read-only behavior.
  - explicit shared clip publish/clear.
  - owner/host/non-owner authority.
  - imported shared clips are visibly shared/owned.
  - conflict marker behavior preserves local unsynced clip data.
  - no high-frequency sync events for notes, audio, meters, frames, playback ticks, devices, effects, mixer, or DJ state.
  - remote/free-roam studio role proximity badges appear in a second client or simulated session.
- Practical commands:
  - `npm.cmd run build`.
  - use source searches for `SoundCloud`, `AudioContext`, `cleanup`, `handleExit`, `TopDownViewController`, and `free_roam_presence` to support static verification.
  - if browser checks are feasible, start the dev server with `npm.cmd run dev -- --host 127.0.0.1` and run the in-world checklist.
- Acceptance criteria:
  - build passes or any phase-caused build errors are fixed.
  - V4-32 documents exactly what was verified and what remains pending.
  - no SoundCloud raw routing/processing is found.
  - audio cleanup path is confirmed by source inspection and, if possible, browser exit testing.
  - no new reducer/session/sync/audio/collision/movement/top-down changes are introduced unless fixing a concrete found bug.
- Risks:
  - traversal, collision, top-down framing, reticle targeting, and audio cleanup are best validated in a browser.
  - multi-client transport/clip/presence checks may be impractical in this environment.
  - audible checks depend on browser permissions and local output hardware.
- Non-goals:
  - no new DAW features.
  - no SoundCloud code changes.
  - no new Web Audio routing or generated-audio behavior.
  - no reducer/session/sync design changes.
  - no collision, movement, top-down, geometry, or station layout changes unless a blocking bug is discovered.

#### Completed Implementation

- Ran the V4-32 verification pass as build plus source/static checks.
- Made no code changes.
- Confirmed by source inspection that SoundCloud remains isolated to widget/jukebox/player paths and is not routed into the app-owned DAW audio engine.
- Confirmed by source inspection that `ThreeDModeShell.handleExit` calls `localDawAudioActions.cleanup()` before `onExit`.
- Confirmed by source inspection that `useLocalDawAudioEngine` tracks active generated voices, disconnects/stops voice nodes, closes the local `AudioContext`, and runs unmount cleanup.
- Confirmed by source inspection that WebGL fallback/error recovery paths remain present through `canCreateWebGLContext`, `ThreeDModeErrorBoundary`, and `ThreeDStatusPanel`.
- Confirmed by source inspection that free-roam presence still uses the existing throttled cadence and V4-31 adds only derived studio role badges from existing fresh presence, not a new presence stream.

#### Build And Manual Checks

Passed:

- `npm.cmd run build` passed in the worker pass.
- Manager final `npm.cmd run build` passed at `2026-04-21 04:16`.
- Existing Vite large chunk warning remains.
- Static SoundCloud isolation check passed:
  - SoundCloud code remains in `useSoundCloudPlayer`, SoundCloud UI/components, and jukebox display surfaces.
  - `useLocalDawAudioEngine` has no SoundCloud references.
- Static audio cleanup check passed:
  - shell Exit calls local audio cleanup.
  - audio cleanup closes the local `AudioContext` and clears generated voice cleanup sets.
- Static WebGL fallback/recovery check passed:
  - WebGL capability check, error boundary, unsupported/error status panel, and Exit recovery UI remain present.
- Static free-roam presence cadence check passed:
  - existing free-roam presence reporting remains throttled by `FREE_ROAM_PRESENCE_INTERVAL_MS`.
  - V4-31 role badges use existing fresh presence passed from `Level1RoomShell`.

Not Run:

- Did not start the dev server.
- Did not run browser/in-world traversal checks.
- Did not run audio-output checks.
- Did not run multi-client/shared sync checks.
- No browser E2E runner is configured in `package.json`; live in-world/audio/multi-client checks remain explicit manual checks.

Pending / Requires Browser Or Multi-Client:

- Hidden world entry and normal app recovery.
- Exit button cleanup and return to the normal app in a live browser.
- Recording Studio doorway traversal and collision.
- z `-4.6` center lane and doorway clearance.
- Tab top-down framing and local marker behavior.
- Role badge placement/readability and non-interaction in-world.
- Station reticle/click behavior only for expected existing controls.
- Control Room, Shooting Range entry/gameplay, jukebox/SoundCloud, Audio Workbench, reveal, and recovery.
- No `AudioContext` before `ENGINE`, verified in a browser runtime.
- `ENGINE`, MUTE, VOL -, VOL +, metronome, generated FM/drum/bass/piano voices, effects, mixer, recording, and clip playback at safe volume.
- Exit/unmount stopping active local voices and closing/cleaning the local audio engine in a browser runtime.
- SoundCloud widget/jukebox audio unchanged and not processed by the app-owned audio graph in a browser runtime.
- Host transport controls and peer read-only behavior.
- Explicit shared clip publish/clear.
- Owner/host/non-owner shared clip authority.
- Imported shared clips visibly shared/owned.
- Conflict marker behavior preserving local unsynced clip data.
- No high-frequency sync events for notes, audio, meters, frames, playback ticks, devices, effects, mixer, or DJ state in multi-client observation.
- Remote/free-roam studio role proximity badges in a second client or simulated session.

## Finish Definition

The first "finished" DAW milestone is not a professional DAW. It is a playable 3D studio MVP.

Minimum finished state:

- Recording Studio room exists behind the Audio Workbench.
- Looper, DJ, DAW, Piano/MIDI, Instrument Rack, and Effects Rack are physically present.
- Local transport works.
- Local generated audio works.
- FM synth, drum machine, and bass machine can make sound.
- Piano can play live notes.
- Piano can record local MIDI clips.
- Clips can play back through generated instruments.
- Filter, autopan, echo, and reverb exist for app-owned audio.
- Mixer and meters exist.
- SoundCloud remains widget/jukebox playback only.
- Exit and recovery remain reliable.
- `npm.cmd run build` passes.

Shared collaboration is the second finished milestone:

- shared tempo/transport.
- shared compact clip summaries.
- shared compact MIDI clips.
- station role/presence visibility.

## Follow-On Vision

After the DAW studio MVP, continue into `docs/3d/3dvision5.md` for the patchable audio studio plan:

- Audio Interface as the central connection point.
- Drum mics feeding a Drum Mixer box.
- Drum Mixer output feeding the Audio Interface.
- Piano and future instruments connecting through reusable patch ports.
- Click-to-unplug, reticle-follow, and click-to-connect wiggly cable interactions.
- Visual-first patch feedback before audio routing/gating.

## Guardrails

- Keep phases small enough for one Codex pass.
- Use the manager/worker loop from `docs/Agents/agent.md`.
- Do not build a giant DAW in one phase.
- Do not process SoundCloud raw streams.
- Initialize Web Audio only from user gesture.
- Keep volume safe and cleanup reliable.
- Prefer generated/app-owned audio first.
- Add sync only after explicit reducer-owned event design.
- Do not send high-frequency audio or MIDI streams in early sync phases.
- Keep the normal 2D app free of visible studio affordances unless a phase explicitly changes that.
- Preserve the hidden-world Exit, WebGL fallback, normal app recovery, movement, top-down view, and existing Control Room/Shooting Range behavior.
