# Secret 3D World Vision 23 - SoundCloud Grid Controllers

## Purpose

Vision 23 adds movable SoundCloud grid controllers to the DJ booth.

Each SoundCloud deck gets one movable grid controller. The controller is tied to the song loaded on its deck, but it does not interrupt that deck's main SoundCloud widget. Instead, it triggers short bursts from a separate auxiliary SoundCloud widget so the grid becomes a second performance layer.

The preferred V1 hardware shape is a screen-style controller: a chunky movable slab with a flat interactive screen face. The screen draws the top settings strip and 8x8 pad matrix as one readable surface, while hit zones map user clicks to settings or pads. This keeps the first version cheaper, easier to move, and more readable than modeling 64 separate physical pad buttons per deck.

V1 should be monophonic: one grid burst can play per deck at a time. The long-term goal is polyphonic pad performance, but V1 should prove the musical feel, widget reliability, movable-object layout, and burst controls before multiplying audio voices.

## Product Goal

Users can move a grid controller near a deck and fire short random song slices as performance bursts.

Desired behavior:

- Deck A has a Grid Controller A.
- Deck B has a Grid Controller B.
- Each controller has a top settings row plus an 8x8 pad matrix.
- The V1 visual surface should read as a touchscreen/grid display, not a full set of individually modeled pad caps.
- The top settings row is not part of the 8x8 pad matrix.
- Each 8x8 matrix contains 64 randomly generated burst cue positions for the currently loaded track.
- Pressing `ROLL` randomizes all 64 pad positions again.
- Pressing a pad plays a short burst from the matching deck's current song.
- The burst plays through an auxiliary SoundCloud widget, not the main deck widget.
- The main deck keeps playing normally while grid bursts fire over it.
- Each grid controller is a movable studio object.
- Grid controller state stays local to this browser unless a later shared-DJ phase intentionally changes that.

## Current Code Facts

Current facts from code review on 2026-04-22:

- The app already has two SoundCloud deck widgets through `useSoundCloudPlayer(...)`, one for Deck A and one for Deck B.
- `src/hooks/useSoundCloudPlayer.ts` owns SoundCloud widget loading, track list, current track URL, playback duration, position, waveform, volume, and seek actions.
- `SoundCloudSeekActions.seekTo(positionMs, options?)` already wraps the SoundCloud widget `seekTo(...)` path.
- Existing hot cues are deck-local and tied to the current track key.
- Existing SoundCloud cue, seek, BPM, sync, fader, platter scrub, and console behavior is local-browser audio.
- `src/screens/MainScreen.tsx` owns the two deck controllers, mixer state, mute state, sync labels, and SoundCloud booth console events.
- `src/3d/soundCloudBooth.ts` is the typed boundary for passing SoundCloud DJ booth state into the 3D room.
- `src/3d/Level1RecordingStudioRoom.tsx` renders the 3D SoundCloud booth controls and already supports clickable and draggable SoundCloud hardware controls.
- The 3D interaction system supports `movable` station objects and a layout editor flow for picking up, placing, rotating, and resetting studio stations.
- `docs/3d/3dvision22-soundcloud-booth-console.md` added a booth event stream that can log concise deck, cue, seek, mixer, BPM, sync, system, and error events.
- The SoundCloud widget does not provide low-level decoded audio buffers, sample-accurate scheduling, or direct Web Audio routing.

## Core Product Decision

Start monophonic.

Each deck gets exactly one auxiliary SoundCloud widget for grid bursts:

```text
Deck A main widget      = normal Deck A playback
Deck A grid widget      = hidden auxiliary burst player
Deck B main widget      = normal Deck B playback
Deck B grid widget      = hidden auxiliary burst player
```

When a grid pad fires, the matching auxiliary widget seeks to the pad timestamp, plays, and then pauses after the selected burst length. If another pad fires before the burst ends, the auxiliary widget seeks to the new timestamp and restarts the burst timer.

This means V1 has one active burst voice per deck.

## Grid Controller Surface Decision

Use a screen-first controller for V1.

The grid controller should feel like a physical item in the DJ booth, but the main interaction face should be a single screen surface that draws:

- Deck identity: `GRID A` or `GRID B`.
- Settings strip: `ROLL`, `LEN-`, `LEN+`, `VOL-`, `VOL+`, `MUTE`, `LOCK`, `TEST`.
- 8x8 pad matrix: `A1` through `H8`.
- Active burst feedback.
- Pad availability / blocked state.
- Compact length, volume, mute, lock, and status readouts.

Interaction can still use invisible or low-profile hit targets under the screen cells if the current 3D interaction system does not expose pointer UV coordinates. The key product direction is that the user sees and moves one coherent controller screen, not 72 little hardware buttons per deck.

This is the best first shape because it:

- Reduces visible mesh and canvas texture noise.
- Makes the controller easier to move as one object.
- Keeps labels readable in first-person and top-down views.
- Leaves space for future polyphony visuals such as held pads, voice lanes, cooldowns, or waveform snippets.
- Lets physical pad caps remain an optional later aesthetic pass instead of a blocker.

## Why Not Polyphonic First

True polyphony means overlapping multiple bursts from the same deck.

With SoundCloud widgets, the straightforward version requires more auxiliary widgets:

```text
Deck A polyphony x4 = 4 hidden grid widgets
Deck B polyphony x4 = 4 hidden grid widgets
Total extra widgets = 8
```

That is expensive in browser resources, SoundCloud embed readiness, iframe memory, event binding, and failure surface. It also makes Discord proxy behavior harder to test.

Monophonic V1 uses only two extra widgets. It is the best first test because it answers the important questions:

- Can an auxiliary widget reliably mirror a deck track?
- Can it seek and burst quickly enough to feel musical?
- Does it layer acceptably over the main deck?
- Does widget volume behave well enough for performance?
- Does the movable controller fit the booth?

## Cheaper Paths Toward Polyphony

Polyphony should stay a later goal, but there are several cheaper paths to brainstorm and test.

### Voice Stealing

Keep one auxiliary widget per deck and make new pad hits steal the current burst.

This is V1. It is technically monophonic, but fast retriggering can still feel like a playable slicer.

### Limited Voice Pool

Use two auxiliary widgets per deck instead of four or eight.

```text
Deck A grid voices = 2
Deck B grid voices = 2
Total extra widgets = 4
```

Each new pad hit uses the next available voice. If both voices are busy, steal the oldest voice. This gives partial overlap without exploding widget count.

### Cooldown Polyphony

Still use one auxiliary widget per deck, but add pad cooldown and retrigger rules.

This does not create true overlap, but it can make the grid feel cleaner:

- ignore accidental double hits under 80ms.
- restart if the same pad is hit.
- steal immediately if a different pad is hit.
- optionally add a tiny visual decay to imply performance energy even when audio is monophonic.

### Prelisten-Free Choke Groups

Group pads into rows or colors where only one burst can play per group.

Later, if there are two voices per deck, rows can map to voice groups:

```text
Rows A-D use voice 1
Rows E-H use voice 2
```

This gives the player a predictable performance rule without needing 64 independent voices.

### Web Audio Cache, Long-Term Only

The cheapest true polyphony would be decoded audio buffers in Web Audio.

That would let the app schedule many short buffer snippets without iframes. But SoundCloud embeds do not expose track audio buffers directly, and downloading/caching SoundCloud audio raises API, permissions, CORS, and rights questions. Treat this as a research phase, not a near-term implementation path.

### Hybrid Sample Export, Future Tooling

If the user later imports their own audio files or approved samples, the grid controller could become truly polyphonic through the local DAW audio engine while SoundCloud remains the browsing/performance source.

That would make polyphony cheap, but it changes the product from "SoundCloud grid bursts" to "sample-based grid performance."

## Interaction Model

Each controller has:

```text
ROLL | LEN- | LEN+ | VOL- | VOL+ | SYNC | MUTE | LOCK
A1   A2    A3    A4    A5    A6    A7    A8
B1   B2    B3    B4    B5    B6    B7    B8
C1   C2    C3    C4    C5    C6    C7    C8
D1   D2    D3    D4    D5    D6    D7    D8
E1   E2    E3    E4    E5    E6    E7    E8
F1   F2    F3    F4    F5    F6    F7    F8
G1   G2    G3    G4    G5    G6    G7    G8
H1   H2    H3    H4    H5    H6    H7    H8
```

Pad labels should use row and column labels instead of `C1-C5` hot cue language. Existing `C1-C5` already means hot cues in the SoundCloud booth.

### Settings Row

Recommended V1 settings:

- `ROLL`: randomize all 64 burst positions.
- `LEN-`: choose the next shorter burst length.
- `LEN+`: choose the next longer burst length.
- `VOL-`: lower grid burst volume.
- `VOL+`: raise grid burst volume.
- `SYNC`: re-link the auxiliary widget to the current deck track.
- `MUTE`: silence grid bursts without muting the main deck.
- `LOCK`: prevent accidental `ROLL`, length, volume, and sync changes while performing.

Recommended V1 burst lengths:

```text
125ms
250ms
500ms
1s
2s
4s
```

Recommended default:

```text
500ms
```

500ms feels like a chop. 1s can become an optional default if the first test feels too percussive.

### Pad Hit

When a pad is pressed:

1. If the controller is muted, do nothing except show `GRID MUTE`.
2. If no track is loaded, show `LOAD TRACK`.
3. If the auxiliary widget is not ready, show `GRID LOADING`.
4. Seek the auxiliary widget to the pad timestamp.
5. Set the auxiliary widget volume from the grid volume.
6. Play the auxiliary widget.
7. Clear any previous burst timer for that deck.
8. Pause the auxiliary widget after the selected burst length.
9. Log a concise booth console event.

Example console lines:

```text
A GRID ROLL 64
A GRID D4 01:24 500MS
B GRID MUTE
B GRID LEN 1S
```

## Random Cue Generation

Random positions should be tied to the loaded track duration.

Rules:

- If `playbackDuration <= burstLengthMs`, no pads should generate.
- Generate positions from `0` through `duration - burstLengthMs`.
- Use integer milliseconds.
- Roll should produce exactly 64 positions.
- On track change, auto-roll once for the new track.
- If the user presses `ROLL`, generate a new 64-position set for the same track.
- Store the active track key with the grid state so stale pads cannot fire against the wrong song.

V1 should use true random positions.

Later options:

- avoid the first 2 seconds of the track.
- avoid the final burst length.
- bias toward waveform peaks.
- quantize to accepted BPM beat divisions.
- preserve a roll seed for repeatable sets.

## State Shape Draft

Suggested V1 state:

```ts
type SoundCloudGridDeckId = "A" | "B";
type SoundCloudGridPadId =
  | "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7" | "A8"
  | "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8"
  | "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8"
  | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8"
  | "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8"
  | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8"
  | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7" | "G8"
  | "H1" | "H2" | "H3" | "H4" | "H5" | "H6" | "H7" | "H8";

interface SoundCloudGridPad {
  id: SoundCloudGridPadId;
  positionMs: number;
  trackKey: string;
}

interface SoundCloudGridControllerState {
  deckId: SoundCloudGridDeckId;
  activeTrackKey: string | null;
  burstLengthMs: number;
  volume: number;
  isMuted: boolean;
  isLocked: boolean;
  isAuxWidgetReady: boolean;
  isBurstPlaying: boolean;
  lastActionLabel: string | null;
  pads: SoundCloudGridPad[];
}
```

Suggested actions:

```ts
interface SoundCloudGridControllerActions {
  rollPads: () => void;
  triggerPad: (padId: SoundCloudGridPadId) => void;
  setBurstLength: (burstLengthMs: number) => void;
  stepBurstLength: (direction: -1 | 1) => void;
  setVolume: (volume: number) => void;
  stepVolume: (direction: -1 | 1) => void;
  toggleMute: () => void;
  toggleLock: () => void;
  syncAuxWidgetToDeck: () => void;
}
```

## Auxiliary Widget Strategy

The grid widget should be a new hook or a distinct mode of the existing SoundCloud hook.

Recommended first pass:

```text
src/hooks/useSoundCloudGridController.ts
```

Reason:

- The grid controller has a different job than the main deck.
- It should not expose playlist browsing, shuffle, hot cues, BPM tools, or waveform editing.
- It needs hidden widget lifecycle, burst timers, random pad generation, volume, mute, lock, and track mirroring.

The hook can reuse helper ideas from `useSoundCloudPlayer.ts`:

- SoundCloud widget script loading.
- Discord proxy remapping.
- safe widget calls.
- volume clamping.
- track key handling.

The hook should accept a deck snapshot:

```ts
interface SoundCloudGridDeckSource {
  deckId: "A" | "B";
  playlistSourceUrl: string;
  currentTrackUrl: string | null;
  currentTrackIndex: number | null;
  currentTrackTitle: string;
  playbackDuration: number;
  isWidgetReady: boolean;
}
```

Open question:

- If the SoundCloud widget can load and skip to the same playlist track index reliably, use playlist source URL plus `skip(index)`.
- If a single-track embed URL is more reliable for the auxiliary widget, load the current track permalink directly.

This should be resolved in a feasibility phase before building the full controller UI.

## 3D Layout Direction

Each Grid Controller should be a physical object, not a flat overlay.

Recommended V1:

- Add `gridA` and `gridB` to the existing studio layout station model.
- Default Grid A near Deck A front-left.
- Default Grid B near Deck B front-right.
- Let the user pick up, place, rotate, floor-lock, and reset the controllers through the same layout editor controls as other movable stations.
- Keep the controllers deck-linked even after they move.

Physical design:

- Low rectangular hardware slab.
- Top settings row of 8 small buttons.
- 8x8 pad grid below.
- Pads flash briefly when triggered.
- Controller body color matches deck accent but does not overpower the booth.
- Use short labels only: `A1`, `D4`, `ROLL`, `LEN+`.

Do not crowd the existing center mixer, deck monitors, platter scrub targets, cue pads, or waveform controls.

## 2D Verification Surface

Build a simple 2D grid panel before the 3D object.

Reason:

- SoundCloud widget burst reliability is the largest unknown.
- The 2D panel is easier to test than first-person 3D targeting.
- It lets the user hear whether monophonic bursts are fun before layout work.

The 2D panel can be compact and developer-facing at first:

- One collapsible Grid A panel.
- One collapsible Grid B panel.
- Settings row.
- 8x8 pad matrix.
- Hidden auxiliary iframes.
- Status: `GRID READY`, `GRID LOADING`, `LOAD TRACK`, `D4 500MS`.

## Product Boundary

In scope:

- One Grid Controller per SoundCloud deck.
- One hidden auxiliary SoundCloud widget per Grid Controller.
- Monophonic burst playback per deck.
- 64 random pad positions per loaded track.
- `ROLL` randomization.
- Burst length settings.
- Grid volume and mute.
- Local-only controller state.
- 2D verification surface.
- 3D movable controller objects.
- Booth console logging for meaningful grid actions.
- Build-verified implementation phases.

Out of scope for V1:

- True polyphony.
- More than two auxiliary SoundCloud widgets.
- Beat quantization.
- Waveform peak-aware randomization.
- Shared grid state across friends.
- Persistent pad maps.
- Saving roll seeds.
- Recording grid performances.
- Routing SoundCloud audio through Web Audio.
- Discord voice/app-audio transport.
- New packages.

Explicit hold phases:

- Limited two-voice polyphony.
- Four-voice or eight-voice polyphony.
- BPM-quantized random pad positions.
- Waveform-energy random pad positions.
- Shared host-controlled grid performance.
- Web Audio sample-buffer grid engine.

## Phase Status

Status marker meanings:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed and manager-verified
- `[hold]` intentionally deferred

Only one phase should be `[~]` at a time.

## Phase Plan

- [x] V23-0: Auxiliary Widget Feasibility.
- [x] V23-1: Grid Controller State And Random Pad Generation.
- [x] V23-2: Monophonic Burst Playback Hook.
- [x] V23-3: 2D Grid Controller Verification Panel.
- [x] V23-4: Booth State Boundary And Console Logging.
- [x] V23-5: 3D Grid Controller Screen Hardware Surface.
- [x] V23-6: Movable Layout Integration For Grid A And Grid B.
- [x] V23-7: Readability, Hitbox, And Manual QA Pass.
- [hold] V23-8: Two-Voice Grid Pool Prototype.
- [hold] V23-9: Beat-Quantized Or Waveform-Biased Roll.
- [hold] V23-10: Shared Or Host-Controlled Grid Performance.
- [hold] V23-11: Web Audio Sample-Buffer Polyphony Research.

## V23-0: Auxiliary Widget Feasibility

Status: `[x]` completed and manager-verified.

### Summary

Prove that a hidden auxiliary SoundCloud widget can mirror a deck track and play short bursts without disrupting the main deck.

### Implementation Spec

Expected files:

```text
src/hooks/useSoundCloudGridController.ts
src/components/SoundCloudPanel.tsx
src/screens/MainScreen.tsx
src/styles/global.css
```

Files to avoid:

```text
src/3d/Level1RecordingStudioRoom.tsx
src/3d/soundCloudBooth.ts
server/*
src/lib/sync/*
```

Expected work:

- Create a new hook, `useSoundCloudGridController(...)`, as the V23 feasibility surface.
- Reuse the SoundCloud Widget API loading/remapping patterns from `useSoundCloudPlayer.ts`, but do not refactor the main deck hook in this phase unless a tiny export is clearly safer than duplication.
- The hook should own one hidden auxiliary iframe/widget for one grid controller.
- The hook should accept a deck source snapshot from `MainScreen.tsx`, including deck id, selected playlist/source URL, current track URL, current track index, current track title, playback duration, and main widget readiness.
- For V23-0, prefer mirroring the current playlist and using `skip(currentTrackIndex)` when the auxiliary widget becomes ready. If that proves awkward, fall back to loading the current track permalink directly, but keep the implementation local to the grid hook.
- Add only minimal controller state needed for feasibility: aux widget readiness, status label, burst length, volume, mute, iframe src, and a test burst action.
- Add a single test action per deck, such as `triggerTestBurst()`, that seeks the auxiliary widget to a safe timestamp and plays a burst.
- Use a safe timestamp for the test burst: clamp around 25% of the loaded duration, never below zero, and do nothing if duration is unavailable.
- Pause the auxiliary widget after the selected burst length.
- Clear any existing burst timer when a new burst starts or when the component unmounts.
- Keep the auxiliary iframe visually hidden or tucked into the SoundCloud panel without disrupting the normal deck cards.
- Add a compact 2D feasibility control for Grid A and Grid B in `SoundCloudPanel.tsx`: status, burst button, burst length display, volume display, mute toggle if easy.
- Instantiate one grid controller for Deck A and one for Deck B in `MainScreen.tsx`.
- Pass those grid controllers into `SoundCloudPanel` through a narrow prop.
- Do not add the 8x8 pad matrix yet.
- Do not add 3D hardware yet.
- Do not add booth console logging yet.
- Do not change main deck playback, hot cues, BPM, sync, mixer, faders, platter scrub, server sync, packages, or shared state.

### Acceptance Criteria

- Main deck playback is not interrupted by an auxiliary burst.
- Auxiliary widget can seek, play, and pause.
- Auxiliary volume is independent.
- Failure states are visible and safe.
- Deck A and Deck B each have their own auxiliary feasibility controller.
- Normal SoundCloud panel deck controls still work.
- Build passes.

### Checklist Items Achieved

- [x] Added one hidden auxiliary SoundCloud widget/controller for Deck A.
- [x] Added one hidden auxiliary SoundCloud widget/controller for Deck B.
- [x] Added compact 2D feasibility controls for Grid A and Grid B.
- [x] Added test burst actions that seek, play, then pause the auxiliary widget.
- [x] Added burst length stepping with the planned fixed lengths.
- [x] Added independent grid volume stepping.
- [x] Added grid mute behavior.
- [x] Kept the main SoundCloud deck widgets, cue controls, BPM tools, sync, mixer, and 3D booth untouched.
- [x] Build passes.

### Completed Implementation

V23-0 created `src/hooks/useSoundCloudGridController.ts` as the auxiliary SoundCloud widget feasibility surface. `MainScreen.tsx` now instantiates Grid A and Grid B controllers from the live deck snapshots, while `SoundCloudPanel.tsx` renders a compact verification strip inside each deck card plus hidden auxiliary iframe mounts. Each controller mirrors the deck playlist, syncs to the current track index, and exposes a monophonic `Test burst` action that seeks to a safe timestamp around 25% of the loaded track, plays at independent grid volume, and pauses after the selected burst length. Rapid retriggers clear the previous timer, so V23 starts with voice-stealing monophony.

The implementation intentionally did not add the 8x8 pad matrix, random pad generation, 3D grid hardware, booth console logging, polyphony, or shared state.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [ ] Manual check: load/play Deck A, press Grid A test burst, confirm Deck A keeps playing.
- [ ] Manual check: load/play Deck B, press Grid B test burst, confirm Deck B keeps playing.
- [ ] Manual check: trigger a second burst before the first ends, confirm the burst restarts/steals.
- [ ] Manual check: toggle grid mute, confirm burst does not play.
- [ ] Manual check: confirm hidden auxiliary iframes do not visually crowd the panel.

### Risks

- SoundCloud may prevent or delay rapid seek/play on hidden widgets.
- The auxiliary widget may not mirror the current playlist track reliably.
- Browser autoplay policy may block auxiliary playback until user interaction.
- Multiple SoundCloud widgets may consume noticeable resources.
- The hidden auxiliary widget may report ready before the mirrored track index is actually usable.
- Single-track permalink embeds may behave differently from playlist embeds.
- `skip(index)` and `seekTo(...)` are called in the same burst action; manual testing should confirm SoundCloud applies the seek to the newly skipped track reliably.

### Wishlist Mapping

- Proves the two-extra-widget approach behind monophonic grid bursts.
- Establishes the future surface for one Grid Controller per deck.
- Keeps the main deck widget untouched while the burst layer plays above it.

### Non-Goals

- No 64-pad grid.
- No random pad generation.
- No 3D movable controller.
- No polyphony.
- No beat quantization or waveform-biased roll.
- No shared/multiplayer grid behavior.

## V23-1: Grid Controller State And Random Pad Generation

Status: `[x]` completed and manager-verified.

### Summary

Add local grid state and generate 64 random pad positions per deck.

### Implementation Spec

Expected files:

```text
src/hooks/useSoundCloudGridController.ts
```

Files to avoid:

```text
src/components/SoundCloudPanel.tsx
src/screens/MainScreen.tsx
src/styles/global.css
src/3d/*
server/*
src/lib/sync/*
package*.json
```

Expected work:

- Extend `useSoundCloudGridController.ts` with the real 8x8 pad data model, but do not render the 8x8 UI yet.
- Define a stable 64-item pad id list using row/column labels `A1` through `H8`.
- Add exported types for `SoundCloudGridPadId` and `SoundCloudGridPad`.
- Add `activeTrackKey`, `pads`, `lastActionLabel`, and `isLocked` to `SoundCloudGridControllerState`.
- Add `rollPads()` and `toggleLock()` to `SoundCloudGridControllerActions`.
- Generate exactly 64 random pads when a real track is loaded and `playbackDuration > burstLengthMs`.
- Each generated pad should store `id`, `positionMs`, and `trackKey`.
- Use the current track URL as the track key.
- Clamp random positions to `[0, playbackDuration - burstLengthMs]`.
- Use integer millisecond positions.
- Auto-roll when the active track key changes to a loaded real track.
- If a track is missing or too short, clear the pad list and show a safe label such as `LOAD TRACK` or `NO DURATION`.
- Manual `rollPads()` should regenerate all 64 positions for the current track.
- When `isLocked` is true, `rollPads()`, `stepBurstLength(...)`, and `stepVolume(...)` should not change state and should set feedback such as `GRID LOCK`.
- `toggleMute()` should remain allowed while locked so the user can silence the controller quickly.
- `triggerTestBurst()` can remain the only audio trigger in this phase, but it should set `lastActionLabel` consistently with its status label.
- Preserve V23-0 auxiliary widget behavior.
- Do not add random pad trigger audio yet.
- Do not change the 2D panel to render all 64 pads yet.
- Do not add 3D hardware, booth console logging, packages, shared state, or sync behavior.

### Acceptance Criteria

- Deck A and Deck B can each hold independent 64-pad maps.
- `ROLL` changes all 64 positions.
- Pads cannot fire stale positions against the wrong track.
- Locked controller blocks settings changes.
- Build passes.

### Checklist Items Achieved

- [x] Added stable `A1` through `H8` pad ids.
- [x] Added exported grid pad id and pad types.
- [x] Added `activeTrackKey`, `pads`, `lastActionLabel`, and `isLocked` to grid controller state.
- [x] Added `rollPads()` and `toggleLock()` actions.
- [x] Auto-rolls exactly 64 pads for real loaded tracks.
- [x] Clears pads safely for missing or too-short tracks.
- [x] Ties each pad to the current track URL.
- [x] Regenerates pads when burst length changes so random positions stay within the valid range.
- [x] Lock blocks roll, length, and volume edits while mute remains available.
- [x] Build passes.

### Completed Implementation

V23-1 extended `useSoundCloudGridController.ts` with the real 64-pad data model behind each future grid controller. The hook now exports typed `A1` through `H8` pad ids, stores random pad positions keyed to the current track URL, auto-rolls when a real track becomes available, and exposes manual `rollPads()` plus `toggleLock()`. Missing tracks and tracks shorter than the selected burst length clear the pad list with safe feedback. Burst length changes regenerate the pad map against the new length so pad positions stay inside `playbackDuration - burstLengthMs`.

The implementation preserved the V23-0 auxiliary widget/test-burst behavior and did not add the 8x8 visual UI, pad-specific burst triggers, 3D hardware, booth console logging, polyphony, packages, or shared state.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [x] Code review confirmed pad arrays are generated from exactly 64 ids.
- [x] Code review confirmed pads use the current track URL as their track key.
- [x] Code review confirmed track changes clear or regenerate pads safely.
- [ ] Manual/browser checks can wait for V23-3 when pads are visible.

### Risks

- Random pad generation can happen too often if effect dependencies include unstable objects.
- Track load states may briefly have a duration without a real permalink or vice versa.
- Lock behavior could accidentally block mute or test safety controls if too broad.

### Wishlist Mapping

- Creates the real 64-pad data model behind each future grid controller.
- Establishes `ROLL` before the 8x8 visual pad surface exists.
- Keeps pad maps local to each browser and each deck.

### Non-Goals

- No 8x8 UI.
- No pad-specific burst trigger.
- No 3D controller.
- No booth console logging.
- No polyphony.

## V23-2: Monophonic Burst Playback Hook

Status: `[x]` completed and manager-verified.

### Summary

Turn grid pad triggers into monophonic auxiliary SoundCloud bursts.

### Implementation Spec

Expected files:

```text
src/hooks/useSoundCloudGridController.ts
```

Files to avoid:

```text
src/hooks/useSoundCloudPlayer.ts
src/components/SoundCloudPanel.tsx
src/screens/MainScreen.tsx
src/styles/global.css
src/3d/*
server/*
src/lib/sync/*
package*.json
```

Expected work:

- Add `triggerPad(padId: SoundCloudGridPadId)` to `SoundCloudGridControllerActions`.
- Reuse the same auxiliary widget, timer, mute, duration, and ready guards already used by `triggerTestBurst()`.
- Find the requested pad in `state.pads` / current pad state.
- If muted, report `GRID MUTE` and do not play.
- If the pad is missing, report `ROLL GRID`.
- If the pad track key does not match the current active track key/current track URL, report `STALE PAD` and do not play.
- If the main deck has no loaded real track, no duration, no track index, or the auxiliary widget is not ready, use the same safe labels as V23-0/V23-1.
- Seek the auxiliary widget to the selected pad's `positionMs`, set grid volume, play, and pause after `burstLengthMs`.
- Clear any previous burst timer before starting the new pad burst so V1 remains monophonic with voice stealing.
- Set `isBurstPlaying` and feedback labels for pad bursts, for example `D4 500MS`.
- Keep `triggerTestBurst()` as a debug action, but it may delegate to a shared private burst helper to avoid duplicate logic.
- Add a `lastTriggeredPadId` state field if useful for future UI flash behavior.
- Do not render the 8x8 UI yet.
- Do not add booth console logging yet.
- Do not change main deck playback, main SoundCloud hook, 2D panel, 3D booth, packages, shared state, or sync behavior.

### Acceptance Criteria

- Pad hits produce audible bursts from the current deck song.
- A second pad hit steals/restarts the current burst.
- Burst length settings affect actual playback duration.
- Grid mute prevents burst audio.
- Build passes.

### Checklist Items Achieved

- [x] Added `triggerPad(padId)` to grid controller actions.
- [x] Pad bursts use stored random pad timestamps.
- [x] Pad bursts reuse the monophonic auxiliary widget/timer path.
- [x] New pad hits clear previous burst timers before playing.
- [x] Missing pad, stale pad, muted, unloaded, unready, and no-duration states are guarded.
- [x] Added `lastTriggeredPadId` for later UI flash behavior.
- [x] Preserved the V23-0 test burst path.
- [x] Build passes.

### Completed Implementation

V23-2 turned the hidden 64-pad model into a monophonic burst playback engine. `useSoundCloudGridController.ts` now exposes `triggerPad(padId)`, finds the stored pad, verifies it belongs to the current track, and plays the auxiliary SoundCloud widget from that pad's random timestamp. The hook still uses one auxiliary widget per deck, so a new pad hit steals the previous burst by clearing the old timer before seeking, playing, and scheduling the next pause. The implementation also added `lastTriggeredPadId` so future 2D and 3D pad surfaces can flash the last fired pad.

The implementation intentionally did not render the 8x8 UI, add 3D hardware, add booth console logging, add polyphony, or touch the main SoundCloud deck hook.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [x] Code review confirmed `triggerPad(...)` is safe for missing, stale, muted, unready, and no-duration states.
- [x] Code review confirmed pad bursts use stored pad timestamps rather than the fixed V23-0 test timestamp.
- [ ] Manual/browser checks can wait for V23-3 when pads are visible.

### Risks

- `skip(index)` followed immediately by `seekTo(positionMs)` may still race in the SoundCloud widget.
- Pad trigger actions cannot be fully manually verified until V23-3 exposes the 8x8 surface.
- Sharing burst logic between test and pad triggers must not accidentally bypass stale-pad protection.

### Wishlist Mapping

- Turns the random 64-pad model into the real monophonic burst playback engine.
- Keeps the one-aux-widget-per-deck voice-stealing architecture.

### Non-Goals

- No visible 8x8 pad matrix.
- No 3D hardware.
- No booth console logging.
- No polyphony or voice pools.

## V23-3: 2D Grid Controller Verification Panel

Status: `[x]` completed and manager-verified.

### Summary

Add a compact 2D surface for testing Grid A and Grid B before 3D work.

### Implementation Spec

Expected files:

```text
src/components/SoundCloudPanel.tsx
src/styles/global.css
```

Files to avoid:

```text
src/hooks/useSoundCloudGridController.ts
src/screens/MainScreen.tsx
src/3d/*
server/*
src/lib/sync/*
package*.json
```

Expected work:

- Expand the existing V23-0 `SoundCloudGridFeasibilityControl` into a real compact 2D grid controller verification surface.
- Keep it inside each deck card near the current cue/seek area; do not create a new global panel.
- Render a top settings row that is visually distinct from the 8x8 pad matrix.
- Include these settings controls: `ROLL`, `LEN-`, `LEN+`, `VOL-`, `VOL+`, `MUTE`, and `LOCK`.
- Keep the V23-0 `Test burst` button as a small debug/feasibility action if it still fits, but it should not be confused with the 8x8 pad matrix.
- Render the full 8x8 pad matrix from `grid.state.pads`.
- If pads are not available yet, render the 64 pad ids in disabled/blocked state or an empty grid shell with `ROLL GRID` / `LOAD TRACK` feedback.
- Pressing a visible pad should call `grid.actions.triggerPad(pad.id)`.
- Pressing `ROLL` should call `grid.actions.rollPads()`.
- Pressing `LOCK` should call `grid.actions.toggleLock()` and show locked state.
- Highlight `grid.state.lastTriggeredPadId` briefly or persistently enough to confirm which pad fired.
- Show compact readouts for `statusLabel`, `lastActionLabel`, burst length, volume, pad count, mute, and lock.
- Keep labels short enough for mobile and desktop.
- Keep the hidden auxiliary iframe shell from V23-0 unchanged unless styling needs a small polish.
- Do not change hook semantics.
- Do not add 3D hardware.
- Do not add booth console logging.
- Do not add shared state, packages, or sync behavior.

### Acceptance Criteria

- User can test all grid actions from 2D.
- 8x8 buttons do not break responsive layout.
- Main deck controls still work.
- Build passes.

### Checklist Items Achieved

- [x] Expanded the compact feasibility strip into a 2D grid controller surface.
- [x] Added a distinct settings row with `ROLL`, `LEN-`, `LEN+`, `VOL-`, `VOL+`, `MUTE`, `LOCK`, and `TEST`.
- [x] Rendered the full 8x8 `A1` through `H8` pad matrix per deck.
- [x] Pad buttons call `triggerPad(...)` when pad data is available.
- [x] Empty/unavailable pad maps render a blocked 64-pad shell.
- [x] Added last-triggered pad highlighting.
- [x] Added compact readouts for action/status, length, volume, pad count, mute, and lock.
- [x] Build passes.

### Completed Implementation

V23-3 made the grid controller playable from the normal SoundCloud panel. Each deck card now contains a compact Grid A/Grid B controller with a visually separate settings row and full 8x8 pad matrix. Loaded tracks show 64 timestamped pads that call the monophonic `triggerPad(...)` hook action, while unavailable states still show the full pad shell in blocked form. The panel also exposes `ROLL`, burst length, grid volume, mute, lock, and a small `TEST` action for the V23-0 feasibility path.

The implementation did not change hook semantics, 3D hardware, booth console logging, polyphony, shared state, packages, or sync behavior.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [ ] Manual/browser check: Grid A and Grid B each show 64 pad buttons when a track is loaded.
- [ ] Manual/browser check: `ROLL` updates the grid pad map and feedback.
- [ ] Manual/browser check: pad press calls the monophonic burst path.
- [ ] Manual/browser check: `LOCK` blocks roll, length, and volume changes but leaves mute available.
- [ ] Manual/browser check: layout remains usable at narrow widths.

### Risks

- The SoundCloud deck card is already dense; the 8x8 grid can make it too tall or cramped.
- Pad labels can become unreadable if buttons are too small.
- A fully visible 64-button grid per deck may need a collapse affordance in a later polish pass.

### Wishlist Mapping

- Makes the random grid playable and testable before 3D hardware work.
- Gives the user a direct way to evaluate monophonic burst feel.
- Confirms settings-row behavior before it becomes physical controls.

### Non-Goals

- No 3D grid controller hardware.
- No movable object behavior.
- No booth console logging.
- No polyphony.

## V23-4: Booth State Boundary And Console Logging

Status: `[x]` completed and manager-verified.

### Summary

Pass grid controller state into the 3D booth and log meaningful grid events.

### Implementation Spec

Expected files:

```text
src/3d/soundCloudBooth.ts
src/screens/MainScreen.tsx
```

Optional only if needed:

```text
src/3d/Level1RecordingStudioRoom.tsx
```

Files to avoid:

```text
src/hooks/useSoundCloudGridController.ts
src/components/SoundCloudPanel.tsx
src/styles/global.css
server/*
src/lib/sync/*
package*.json
```

Expected work:

- Add grid controller state/action types to the SoundCloud booth boundary.
- Instantiate Grid A and Grid B from `MainScreen.tsx`.
- Pass grid state into the 3D room.
- Log `GRID ROLL`, `GRID PAD`, `GRID LEN`, `GRID VOL`, `GRID MUTE`, and grid errors to the booth console.
- Avoid logging every internal widget event.
- Prefer wrapping grid controller actions in `MainScreen.tsx` so the same logged controller surface can be passed to the 2D panel and to `soundCloudBooth`.
- Keep the wrapped controller type-compatible with `SoundCloudGridController`.
- Preserve the original hook behavior and state.
- Log one concise event per user action, not per render or per SoundCloud widget callback.
- For pad actions, include the pad id and, if available, its formatted timestamp or current burst length in the detail.
- For roll actions, include `64` or the resulting pad count in the detail.
- For length and volume buttons, log the intended direction or current value in a concise detail.
- For mute/lock, log the action request or current state in a concise detail.
- If an action is blocked by hook state, rely on the existing grid status label/readout; do not attempt to infer every failure in this phase.
- Do not render the 3D grid controller yet.
- Do not add new hook actions or hook state.
- Do not change the 2D visual layout.

### Acceptance Criteria

- 3D booth can render grid state without reaching into hooks directly.
- Console lines are concise and bounded.
- Existing deck, mixer, cue, BPM, sync, and console behavior stays unchanged.
- Build passes.

### Checklist Items Achieved

- [x] Added grid controller types to the SoundCloud booth boundary.
- [x] Added `gridControllers` to `SoundCloudBoothState`.
- [x] Passed logged Grid A and Grid B controllers into both the 2D SoundCloud panel and 3D booth state.
- [x] Logged meaningful grid user actions to the booth console stream.
- [x] Avoided per-render and widget-callback log spam.
- [x] Left 3D grid hardware rendering for V23-5.
- [x] Build passes.

### Completed Implementation

V23-4 connected the SoundCloud grid controllers to the booth-level state model. `soundCloudBooth.ts` now carries typed Grid A/Grid B controller surfaces, and `MainScreen.tsx` wraps the live grid actions with concise booth console logging before passing those controllers to both the 2D SoundCloud panel and the `soundCloudBooth` object. Grid actions now emit bounded console entries such as `GRID ROLL`, `GRID PAD`, `GRID LEN`, `GRID VOL`, `GRID MUTE`, `GRID LOCK`, `GRID SYNC`, and `GRID TEST`.

The implementation did not render any 3D grid hardware, change the grid hook semantics, alter the 2D layout, add polyphony, or touch shared sync behavior.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [x] Code review confirmed `SoundCloudBoothState` carries Grid A and Grid B controller surfaces.
- [x] Code review confirmed action wrappers do not mutate state themselves or bypass hook actions.
- [ ] Manual/browser check later: grid actions should show concise lines on the booth console when the 3D room is open.

### Risks

- Wrapping actions can create unstable references if not memoized carefully.
- Logging action requests before hook state updates can show old values unless labels are intentionally request-based.
- Passing full grid controllers into 3D increases the booth state surface; keep it typed and narrow.

### Wishlist Mapping

- Creates the 3D booth boundary that future physical Grid A/B hardware will consume.
- Gives the existing booth console a grid event trail before the 3D object exists.

### Non-Goals

- No 3D grid hardware rendering.
- No movable controller behavior.
- No hook semantic changes.
- No new 2D layout changes.

## V23-5: 3D Grid Controller Screen Hardware Surface

Status: `[x]` completed and manager-verified.

### Summary

Render physical Grid Controller A and Grid Controller B hardware in the SoundCloud booth, using a screen-style control face for the settings strip and 8x8 pad matrix.

### Implementation Spec

Expected files:

```text
src/3d/Level1RecordingStudioRoom.tsx
```

Files to avoid:

```text
src/hooks/*
src/components/*
src/screens/MainScreen.tsx
src/styles/global.css
src/3d/soundCloudBooth.ts
server/*
src/lib/sync/*
package*.json
```

Expected work:

- Build reusable `StudioSoundCloudGridController` component.
- Render each controller as a movable-ready hardware slab with a single screen-style face.
- Draw the top settings row and 8x8 pad matrix as a coherent screen surface where practical.
- Register interactable hit targets for settings and pads. Invisible or low-profile hit targets are acceptable if the current interactable system cannot route clicks by screen coordinates.
- Add pad flash / active visual feedback.
- Add compact status readout.
- Keep first-person labels readable.
- Avoid overlap with existing deck hardware.
- Use the existing `SoundCloudBoothState.gridControllers` surface from V23-4; do not import hooks or reach into React hook internals.
- Add any needed type imports from `soundCloudBooth.ts` only.
- Reuse existing 3D patterns such as canvas labels, simple slab meshes, invisible hit targets, and the existing interactable registration path.
- V23-5 should render fixed-position Grid A and Grid B controller slabs as part of `StudioSoundCloudDjControls`; V23-6 will make them movable layout stations.
- Place Grid A and Grid B outside or just forward/outboard of the existing deck workflows so they do not cover platters, seek panels, cue pads, faders, crate browsers, or the shared monitor.
- Render settings controls for `ROLL`, `LEN-`, `LEN+`, `VOL-`, `VOL+`, `MUTE`, `LOCK`, and `TEST`.
- Render all 64 pad cells using `A1` through `H8`.
- Pad buttons should call `grid.actions.triggerPad(padId)` when a matching pad exists.
- Settings controls should call the logged grid actions from V23-4.
- Use `grid.state.lastTriggeredPadId` and `grid.state.isBurstPlaying` for active/flash styling.
- Use compact captions such as pad time, `ROLL GRID`, `LOAD TRACK`, `LOCK`, `MUTE`, `LEN 500MS`, and `VOL 55`.
- If pad data is unavailable, controls should still render but appear dim/blocked and should not fire missing pad audio.
- Add a compact screen readout on each controller with deck id, status label, pad count, length, volume, mute, and lock state.
- Prefer one readable screen texture plus aligned hit zones over 64 visible physical pad button meshes.
- Keep hitboxes aligned with visible pads and large enough for first-person clicking.
- Do not make the controllers movable in this phase.
- Do not change the 2D panel.
- Do not change hook semantics, booth state types, logging wrappers, packages, or shared sync.

### Acceptance Criteria

- Grid A controls Deck A grid only.
- Grid B controls Deck B grid only.
- Pads are visible top-down as screen cells and clickable first-person.
- Settings row is clearly separate from the 8x8 matrix.
- Build passes.

### Checklist Items Achieved

- [x] Added a reusable `StudioSoundCloudGridController` component.
- [x] Rendered fixed-position Grid A and Grid B hardware slabs in the SoundCloud DJ booth.
- [x] Folded the screen-controller pivot into the V23 product direction.
- [x] Drew settings, all 64 pad cells, active burst feedback, blocked cells, and status readouts on one screen-style canvas face.
- [x] Added aligned invisible hit zones for settings and pad cells.
- [x] Guarded pad hit zones so unavailable pads do not fire missing audio.
- [x] Kept grid actions routed through the V23-4 logged action wrappers.
- [x] Avoided movable integration, hook semantic changes, 2D panel changes, and booth state type changes.
- [x] Build passes.

### Completed Implementation

V23-5 adds the first in-world Grid Controller A and Grid Controller B surfaces. `Level1RecordingStudioRoom.tsx` now renders each controller as a chunky hardware slab with a single readable screen face instead of 64 visible button caps. The screen draws the settings strip, all `A1` through `H8` pad cells, blocked/available state, last-triggered burst feedback, and compact deck status details. Interaction still uses aligned invisible hit target meshes because the current 3D interaction system is mesh-target based, but the visible product shape is now screen-first.

The implementation did not make the controllers movable yet, did not change the SoundCloud grid hook, did not change the 2D SoundCloud panel, and did not alter the booth state/logging boundary.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [x] Code review confirmed Grid A uses `soundCloudBooth.gridControllers.A` and Grid B uses `soundCloudBooth.gridControllers.B`.
- [x] Code review confirmed pad hit zones only call `triggerPad(...)` when a pad exists.
- [ ] Manual/top-down check: Grid A and Grid B are visible and do not overlap existing SoundCloud controls.
- [ ] Manual/first-person check: settings row and pad matrix can be targeted.
- [ ] Manual/browser check: 3D pad click triggers the same monophonic burst path as the 2D pad.
- [ ] Manual/browser check: 3D settings controls log to the booth console through the V23-4 wrappers.

### Risks

- 144 pad hit zones plus settings controls can make aim targeting noisy.
- Text on 3D screen cells can become unreadable if the screen is too small.
- Fixed placement may still need V23-6 movement/polish before it feels good.
- `Level1RecordingStudioRoom.tsx` already has unrelated dirty changes; avoid broad edits or reformatting.

### Wishlist Mapping

- Creates the physical 3D Grid Controller screen hardware surface for each deck.
- Makes the grid playable from the DJ booth before movement/persistence work.

### Non-Goals

- No movable layout integration.
- No new grid state semantics.
- No polyphony.
- No 2D changes.

## V23-6: Movable Layout Integration For Grid A And Grid B

Status: `[x]` completed and manager-verified.

### Summary

Make each grid controller a movable studio object.

### Implementation Spec

Expected files:

```text
src/3d/Level1RecordingStudioRoom.tsx
```

Expected work:

- Add `gridA` and `gridB` station ids or an equivalent layout model extension.
- Provide default transforms near Deck A and Deck B.
- Reuse existing movement controls for pickup, place, rotate, reset, and floor lock.
- Persist positions with existing layout state if the current layout model supports it.
- Ensure moving a controller does not change which deck it controls.

### Acceptance Criteria

- User can move Grid A independently.
- User can move Grid B independently.
- Controller interaction still works after moving.
- Reset layout restores sensible positions.
- Build passes.

### Checklist Items Achieved

- [x] Added independent `grid-a` and `grid-b` layout station ids.
- [x] Added default transforms near Deck A and Deck B.
- [x] Added station specs with movement hitboxes, follow distance, floor height, and reset defaults.
- [x] Moved Grid A and Grid B out of fixed DJ booth children and into their own `StudioLayoutStationGroup`s.
- [x] Preserved fixed deck binding: Grid A still controls Deck A and Grid B still controls Deck B.
- [x] Reused the existing pickup/place/rotate/reset/floor-lock layout machinery.
- [x] Build passes.

### Completed Implementation

V23-6 makes the two SoundCloud grid controller screens independent movable studio objects. `Level1RecordingStudioRoom.tsx` now registers `grid-a` and `grid-b` with the existing layout station system and renders each controller beside the DJ station in its own `StudioLayoutStationGroup`. The existing layout loader already merges missing station ids into persisted state, so old saved layouts hydrate the new grid stations with default positions.

The implementation did not add a new movement system, did not change SoundCloud grid audio behavior, and did not alter the 2D panel or booth state types.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [x] Code review confirmed `grid-a` and `grid-b` use independent station ids and transforms.
- [x] Code review confirmed deck binding remains hardwired to `gridControllers.A` and `gridControllers.B`.
- [ ] Manual/first-person check: pick up, rotate, place, and reset Grid A.
- [ ] Manual/first-person check: pick up, rotate, place, and reset Grid B.
- [ ] Manual/browser check: pad and settings interactions still work after moving.

## V23-7: Readability, Hitbox, And Manual QA Pass

Status: `[x]` completed and manager-verified.

### Summary

Tune the grid controllers for real booth use.

### Implementation Spec

Expected files:

```text
src/3d/Level1RecordingStudioRoom.tsx
docs/3d/manual-test-checklist.md
docs/3d/3dvision23-soundcloud-grid-controllers.md
changelog.md
```

Expected work:

- Tune object size, pad spacing, labels, and hitbox depth.
- Verify top-down readability.
- Verify first-person click targeting.
- Verify controller movement workflow.
- Verify hidden auxiliary widgets do not visually crowd the normal app.
- Update manual QA checklist.
- Add changelog entry if code changed.

### Acceptance Criteria

- Grid controllers feel like real booth hardware.
- Pad hits feel responsive enough for monophonic V1.
- Controller movement is reliable.
- Existing SoundCloud booth controls remain usable.
- Build passes.

### Checklist Items Achieved

- [x] Tuned screen-cell hit target sizes, spacing, and depth.
- [x] Kept the visible design screen-first with no visible 64-button mesh grid.
- [x] Confirmed unavailable pad hit zones remain disabled and guarded.
- [x] Confirmed Grid A and Grid B station defaults remain sensible for reset.
- [x] Added Grid Controller QA coverage to the manual 3D checklist.
- [x] Build passes.

### Completed Implementation

V23-7 tightened the first-pass controller feel without changing the product shape. `Level1RecordingStudioRoom.tsx` now has better-aligned invisible hit zones for the screen-drawn settings strip and 8x8 pad matrix, keeping the grid readable while preserving the single-screen surface. `docs/3d/manual-test-checklist.md` now includes explicit checks for Grid A/B visibility, settings, pad bursts, monophonic voice stealing, movement, reset, and deck binding.

Interactive browser QA is still listed as manual follow-up because this manager pass verified by code review and build rather than live first-person audio testing.

### Build And Manual Checks

- [x] `npm.cmd run build` passed with the existing Vite large chunk warning.
- [x] Code review confirmed screen hit targets broadly align with settings and pad cells.
- [x] Code review confirmed blocked pads stay disabled and guarded.
- [x] Manual checklist updated with V23 Grid Controller coverage.
- [ ] Manual/browser check: first-person targeting and top-down readability.
- [ ] Manual/browser check: auxiliary pad bursts and monophonic voice stealing.
- [ ] Manual/browser check: move/place/rotate/reset feel for both grid controllers.

## Hold Phases

### V23-8: Two-Voice Grid Pool Prototype

Status: `[hold]` intentionally deferred.

Use two auxiliary widgets per deck and alternate pad hits across them. If both are busy, steal the oldest voice.

This is the cheapest first polyphony test.

### V23-9: Beat-Quantized Or Waveform-Biased Roll

Status: `[hold]` intentionally deferred.

Improve random pad generation by snapping to accepted BPM beat divisions or biasing toward waveform peaks.

This should wait until monophonic burst playback is proven.

### V23-10: Shared Or Host-Controlled Grid Performance

Status: `[hold]` intentionally deferred.

Decide whether grid pad maps, rolls, and triggers should be shared across friends or controlled only by a host.

This depends on broader SoundCloud shared transport decisions.

### V23-11: Web Audio Sample-Buffer Polyphony Research

Status: `[hold]` intentionally deferred.

Research a future true polyphonic grid engine using decoded buffers or user-provided audio.

This should not be mixed into the SoundCloud widget V1 because SoundCloud embeds do not expose the low-level audio needed for cheap sample-accurate polyphony.

## Manual Test Checklist

- Verify Deck A main playback continues while Grid A fires bursts.
- Verify Deck B main playback continues while Grid B fires bursts.
- Verify Grid A does not affect Deck B.
- Verify Grid B does not affect Deck A.
- Verify pad hit seeks the auxiliary widget to the pad timestamp.
- Verify burst stops after the selected length.
- Verify hitting another pad during a burst steals/restarts the burst.
- Verify `ROLL` changes all 64 pad positions.
- Verify track change auto-rolls or invalidates the prior grid safely.
- Verify `LEN-` and `LEN+` change audible burst length.
- Verify `VOL-` and `VOL+` change grid burst volume only.
- Verify `MUTE` silences grid bursts without muting the main deck.
- Verify `LOCK` prevents accidental settings changes.
- Verify hidden auxiliary widget failures show safe feedback.
- Verify 2D grid remains usable on smaller widths.
- Verify 3D Grid A and Grid B are readable from top-down.
- Verify first-person click targeting works for settings and pads.
- Verify Grid A and Grid B can be moved and still perform.
- Verify booth console logs grid actions without spam.
- Verify Discord expectation remains clear: SoundCloud app audio is local browser audio.

## Open Questions

- Should the auxiliary widget mirror the current playlist and use `skip(index)`, or load the current track permalink directly?
- Should `ROLL` be available while the main deck is playing, or should `LOCK` default on during performance?
- Should random positions avoid intros/outros by default?
- Should burst playback always pause the auxiliary widget, or should very short bursts fade out visually/audio-wise if possible?
- Should grid burst volume feed the existing deck/mixer output model, or remain an independent per-grid trim?
- Should grid bursts obey the main deck mute state?
- Should a muted main deck still allow grid bursts?
- Should the first 2D panel be always visible or hidden behind an advanced toggle?
- Should 3D pad labels show only pad ids, or pad ids plus tiny time labels?
- Should future two-voice mode use voice stealing by oldest burst or by quietest/nearest-to-ending burst?

## Recommended First-Pass Decisions

- Use one auxiliary SoundCloud widget per deck.
- Treat V1 as monophonic with voice stealing.
- Default burst length to `500ms`.
- Keep grid volume independent from main deck trim for V1.
- Do not let main deck cue state and grid pad state share ids or labels.
- Auto-roll when the active track changes.
- Add 2D verification before 3D hardware.
- Make Grid A and Grid B movable objects through the existing studio layout system.
- Log only meaningful grid actions to the booth console.
- Keep all grid behavior local-browser until a later shared-DJ vision.
