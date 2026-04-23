# Secret 3D World Vision 22 - SoundCloud Booth Console

## Purpose

Vision 22 adds a live diagnostic console to the SoundCloud DJ booth.

The booth already has working decks, cue controls, seek tools, BPM tools, sync labels, faders, crate browsing, and platter scrubbing. The next readability problem is that the user can press a control and hear or see the result, but the booth does not show a clear event trail of what just happened.

The console should act like a digital debug window built into the booth: every meaningful deck, mixer, cue, BPM, sync, song, and seek event leaves a short timestamped line.

This makes the booth feel more alive and makes testing easier. It also gives future multiplayer/shared playback work a place to explain who did what.

## Product Goal

Users can look at the DJ booth monitor and understand what is happening behind the scenes.

Desired behavior:

- The deck monitor gains a visible `BOOTH CONSOLE` section.
- Recent DJ booth events print as short log lines.
- Button clicks print immediately.
- Track load and track change events print automatically.
- Seek and scrub actions print when the user intentionally changes song position.
- BPM actions print their accepted source or failure state.
- Sync actions print success or blocked reasons.
- Mixer changes print final values without flooding the log.
- SoundCloud widget readiness and errors can print as system lines.
- Console text stays readable from normal first-person DJ position.

The console should feel like part of the in-world DJ hardware, not an external developer overlay.

## Current Code Facts

Current facts from code review on 2026-04-22:

- `src/3d/soundCloudBooth.ts` defines `SoundCloudBoothDeck`, `SoundCloudBoothMixer`, and `SoundCloudBoothState`.
- `src/3d/Level1RecordingStudioRoom.tsx` renders the 3D SoundCloud booth.
- `StudioSoundCloudDjControls` is the main 3D SoundCloud booth component.
- `StudioSoundCloudDeckMonitor` renders the top shared monitor for both decks.
- `createStudioSoundCloudDeckMonitorCanvas()` currently draws:
  - deck A BPM/status/output/time/title.
  - deck B BPM/status/output/time/title.
  - crossfader label.
  - master volume.
  - A/B output percentages.
  - a BPM source footer.
- `StudioSoundCloudDeckPanel` renders per-deck readouts.
- `StudioDjControl` is the generic clickable 3D button surface.
- `StudioSoundCloudDragFader` registers draggable faders.
- `StudioSoundCloudProgressSeekBar` logs no state today, but already knows explicit seek target.
- `StudioSoundCloudSpinningPlatter` handles platter drag/scrub locally.
- `useSoundCloudPlayer.ts` owns per-deck SoundCloud display state and actions.
- `src/screens/MainScreen.tsx` assembles the two-deck SoundCloud booth state passed into 3D mode.
- Vision 21 added accepted BPM actions and trusted sync labels.

## Current Problem

The DJ booth has many actions but no action history.

Examples:

- Pressing `SYNC` changes a label, but there is no persistent line saying what sync tried to do.
- Seeking with the progress bar moves the track, but the booth does not show the old/new position.
- Platter scrub is playful, but after release there is no debug record of the scrub.
- BPM tools show transient labels, but the user cannot see a timeline of `META`, `WAVE`, `LENGTH`, `MANUAL`, or `CLEAR` choices.
- Crate row clicks load tracks, but the monitor does not show a durable load event.
- Fader drags can change values many times, so logging needs to be designed carefully to avoid spam.

Vision 22 creates a controlled, readable event stream for these behind-the-scenes actions.

## Design Principle

Log intent, not every frame.

The console should capture meaningful user and system events. It should not print raw playback position ticks, render updates, or every tiny fader movement.

Good console lines:

```text
14:32:08 A PLAY Midnight Drive
14:32:05 A SEEK 01:12 -> 01:28
14:31:58 B LOAD Neon Runner
14:31:54 MIX XFADE A -> MID
14:31:50 A CUE C2 TRIGGER
14:31:44 MIX MASTER 80%
14:31:37 A BPM WAVE 126.4
```

Bad console lines:

```text
14:32:08 A POS 01:12.001
14:32:08 A POS 01:12.016
14:32:08 A POS 01:12.033
14:32:08 RENDER MONITOR REFRESH
```

## Console Event Model

Add a small event model that can be passed with `SoundCloudBoothState`.

Suggested type:

```ts
export type SoundCloudBoothConsoleEventKind =
  | "deck"
  | "mixer"
  | "cue"
  | "bpm"
  | "seek"
  | "sync"
  | "system"
  | "error";

export interface SoundCloudBoothConsoleEvent {
  id: string;
  timestamp: number;
  kind: SoundCloudBoothConsoleEventKind;
  deckId?: SoundCloudBoothDeckId;
  label: string;
  detail?: string;
}
```

Suggested state extension:

```ts
export interface SoundCloudBoothState {
  decks: [SoundCloudBoothDeck, SoundCloudBoothDeck];
  mixer: SoundCloudBoothMixer;
  consoleEvents?: SoundCloudBoothConsoleEvent[];
  onPushConsoleEvent?: (event: Omit<SoundCloudBoothConsoleEvent, "id" | "timestamp">) => void;
}
```

Keep the list bounded.

Recommended limit:

```text
latest 24 events in state
latest 7 or 8 events rendered on the monitor
```

## Event Categories

### Deck Events

Log deck-level actions:

- `A PLAY`
- `A PAUSE`
- `A SHUFFLE`
- `A LOAD <title>`
- `A TRACK CHANGED <title>`
- `A WIDGET READY`
- `A ERROR <message>`

### Seek Events

Log intentional position changes:

- progress seek bar click/drag commit.
- seek forward/back buttons.
- cue edit nudges.
- platter scrub release.

Suggested labels:

```text
A SEEK 01:12 -> 01:28
A NUDGE C2 +0.1S
A SCRUB 00:48 -> 01:03
```

Do not log normal playback progress.

### Cue Events

Log hot cue behavior:

- set cue mode toggled.
- cue point set.
- cue triggered.
- cue edit mode toggled.
- selected cue nudged.

Suggested labels:

```text
A CUE SET ON
A CUE C1 SET 00:32
A CUE C1 TRIGGER
A CUE EDIT C3 +1S
```

### BPM Events

Log accepted BPM tools:

- metadata accepted.
- waveform accepted.
- length estimate accepted.
- manual BPM adjusted.
- BPM cleared.
- failed BPM action.

Suggested labels:

```text
A BPM META 128.0
A BPM WAVE 127.6
A BPM LENGTH 126.0
A BPM MANUAL 127.7
A BPM CLEAR
A BPM NO WAVE
```

### Sync Events

Log both success and blocked reasons:

```text
A SYNC TO B +128MS
A SYNC NO BPM
B SYNC NO MASTER
B SYNC LOAD TRACK
```

If sync math exposes the seek delta, include it in the detail. If not, log the current `syncLabel`.

### Mixer Events

Log final or throttled mixer changes:

```text
MIX XFADE MID
MIX XFADE A
MIX MASTER 80%
A TRIM 65%
B MUTE ON
B MUTE OFF
```

Drag faders should avoid per-pixel spam.

Recommended V1 behavior:

- Button changes log immediately.
- Drag faders log on drag end.
- If drag-end access is awkward, throttle to one line every 500ms and only when value changes by a useful amount.

## Console Placement

Preferred first pass: expand the existing shared deck monitor.

Current monitor:

```text
SOUNDCLOUD DECK MONITOR
A deck summary
B deck summary
XFADE / MASTER / A OUT / B OUT
BPM footer
```

Recommended Vision 22 layout:

```text
SOUNDCLOUD DECK MONITOR
A deck summary
B deck summary
XFADE / MASTER / A OUT / B OUT
--------------------------------
BOOTH CONSOLE   LIVE   08 EVENTS
14:32:08 A PLAY Midnight Drive
14:32:05 A SEEK 01:12 -> 01:28
14:31:58 B LOAD Neon Runner
14:31:54 MIX XFADE A -> MID
14:31:50 A CUE C2 TRIGGER
```

Recommended canvas change:

```text
1280 x 360 -> 1280 x 560
```

Recommended mesh backing change:

```text
height 0.82 -> about 1.18
plane height 0.72 -> about 1.04
```

Exact values should be tuned visually in first-person.

## Visual Style

Keep console styling close to the booth:

- dark panel background.
- thin cyan/magenta frame.
- compact monospace text.
- newest event at the top.
- low-alpha older lines.
- kind color marker at left.

Suggested event colors:

```text
deck/system: #57f3ff
seek: #73ff4c
cue/bpm: #f8d36a
sync/mixer: #f64fff
error: #ff5a6b
```

Use short labels over long descriptions. The console should be readable while moving around the 3D room.

## Event Ownership

Recommended first-pass ownership:

- `MainScreen.tsx` owns the event array because it already assembles both SoundCloud decks and mixer state.
- `soundCloudBooth.ts` defines the event types.
- `Level1RecordingStudioRoom.tsx` renders console lines and logs local 3D-only interactions such as platter scrub release.
- `useSoundCloudPlayer.ts` can remain mostly unchanged in V1 unless passive track/widget events are easier to emit from the hook.

Reason:

- The console is a booth-level feature.
- It needs both deck state and mixer state.
- It should be passed to the 3D booth without creating global app debug state.

## Passive Event Detection

Some events are not direct button clicks.

Track change detection:

- Store previous `currentTrackUrl` or `currentTrackIndex` per deck.
- When it changes, push `A TRACK CHANGED`.
- Include title if available.

Widget readiness detection:

- Store previous `isWidgetReady`.
- When it changes from false to true, push `A WIDGET READY`.

Error detection:

- Store previous `errorMessage`.
- When a new error appears, push `A ERROR`.

Seek jump detection:

- Avoid logging normal playback movement.
- Log explicit seek controls directly from their handlers.
- For passive detection, only log jumps above a threshold when not caused by normal playback.
- Recommended passive threshold: `2000ms`.

V1 should prefer direct action logging over clever passive seek detection.

## Implementation Prep

Recommended new/edited files:

```text
src/3d/soundCloudBooth.ts
src/3d/Level1RecordingStudioRoom.tsx
src/screens/MainScreen.tsx
docs/3d/manual-test-checklist.md
changelog.md
```

Optional later files:

```text
src/hooks/useSoundCloudPlayer.ts
src/lib/soundcloud/boothConsole.ts
src/lib/soundcloud/boothConsole.test.ts
```

Implementation boundary suggestions:

- Types/state worker:
  - `src/3d/soundCloudBooth.ts`
  - `src/screens/MainScreen.tsx`
- 3D monitor worker:
  - `src/3d/Level1RecordingStudioRoom.tsx`
- Passive event worker:
  - `src/screens/MainScreen.tsx`
  - optional `src/hooks/useSoundCloudPlayer.ts`
- Manager:
  - docs, changelog, manual checklist, integration review, build verification.

Do not have multiple workers edit `Level1RecordingStudioRoom.tsx` at the same time.

## Phase Status

Status marker meanings:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed and manager-verified
- `[hold]` intentionally deferred

Only one phase should be `[~]` at a time.

## Phase Plan

- [x] V22-0: Console Event Spec And State Ownership.
- [x] V22-1: Console Event State And Push Helper.
- [x] V22-2: Button Action Logging.
- [x] V22-3: Track, Widget, And Error Event Detection.
- [x] V22-4: Seek, Scrub, Cue, BPM, And Sync Event Detail.
- [x] V22-5: Deck Monitor Console Rendering.
- [x] V22-6: Throttle Rules, Bounds, And Readability Pass.
- [x] V22-7: Tests, Build, And Manual QA Checklist.
- [hold] V22-8: Per-User Multiplayer Action Attribution.
- [hold] V22-9: Export Or Copy Console History.
- [hold] V22-10: Filterable Console Modes.

## V22-0: Console Event Spec And State Ownership

Status: `[x]` completed and manager-verified.

### Summary

Finalize the console event shape and decide where the event array lives.

### Implementation Spec

- Add `SoundCloudBoothConsoleEventKind` and `SoundCloudBoothConsoleEvent` in `src/3d/soundCloudBooth.ts`.
- Extend `SoundCloudBoothState` with optional `consoleEvents` and `onPushConsoleEvent`.
- Keep event state in `src/screens/MainScreen.tsx` because that file already assembles both SoundCloud decks, mixer state, mute state, and sync actions.
- Use `pushSoundCloudBoothConsoleEvent()` in `MainScreen.tsx` to add `id` and `timestamp`.
- Keep the latest 24 events in state.
- Render at most the latest 9 events in the in-world monitor after the right-rail console pass.
- Keep timestamp formatting in `Level1RecordingStudioRoom.tsx` for V1 because it is display-only canvas formatting.
- Do not introduce a new global logger, reducer, session event, package, or normal 2D UI surface in this phase.
- Leave hook-level SoundCloud behavior unchanged unless later phases need passive event detection.

### Acceptance Criteria

- `SoundCloudBoothState` can carry console events.
- The 3D booth can receive events without knowing the parent state implementation.
- Event state has a clear owner and bounded retention rule.
- The phase can be implemented without touching shared session/sync reducers or normal 2D UI.

### Checklist Items Achieved

- Event types were added to `src/3d/soundCloudBooth.ts`.
- `SoundCloudBoothState` now carries optional console events and a push callback.
- Console event ownership is local to `MainScreen.tsx`.

### Completed Implementation

- Added the console event type boundary and kept V22 out of shared session/sync reducers and normal 2D UI.

### Build And Manual Checks

- Run `npm.cmd run build` after implementation phases that touch code.
- Manual visual checks are deferred until monitor rendering exists.

### Risks

- If event state is owned too low in the 3D component tree, passive track/widget events become awkward.
- If event state is owned in shared session state too early, Vision 22 becomes a multiplayer/sync feature instead of a local booth console.

### Wishlist Mapping

- Creates the data path for the requested digital debug window.
- Keeps the console local to the DJ booth while leaving multiplayer attribution for a hold phase.

### Non-Goals

- No visible console rendering yet.
- No direct button logging yet.
- No passive track/widget/error detection yet.
- No sync reducer or shared multiplayer event design.

## V22-1: Console Event State And Push Helper

Status: `[x]` completed and manager-verified.

### Summary

Create the bounded console event list and helper for adding events.

### Implementation Spec

- Add `soundCloudBoothConsoleEvents` state in `MainScreen.tsx`.
- Add `pushSoundCloudBoothConsoleEvent()`.
- Generate event `id` and `timestamp`.
- Keep only the latest 24 events.
- Pass `consoleEvents` and `onPushConsoleEvent` into `soundCloudBooth`.

### Acceptance Criteria

- Events can be pushed from 3D booth controls.
- The event array stays bounded.
- Existing SoundCloud booth behavior is unchanged.

### Completed Implementation

- Added a bounded latest-24 event queue in `MainScreen.tsx`.
- Added `pushSoundCloudBoothConsoleEvent()` to attach ids and timestamps.
- Passed `consoleEvents` and `onPushConsoleEvent` through the existing `soundCloudBooth` object.

## V22-2: Button Action Logging

Status: `[x]` completed and manager-verified.

### Summary

Log direct button clicks in the SoundCloud booth.

### Implementation Spec

- Add event pushes for:
  - play/pause.
  - shuffle.
  - mute/unmute.
  - sync button.
  - crossfader preset buttons.
  - BPM buttons.
  - cue mode/edit buttons.
  - cue pads.
  - seek buttons.
  - crate row load.
- Use concise labels.
- Include deck id when applicable.

### Acceptance Criteria

- Clicking a booth button produces one console event.
- Labels are short and readable.
- Disabled buttons do not log misleading successful actions.

### Completed Implementation

- Added direct console logging for play/pause, shuffle, mute/open, sync, BPM controls, cue controls, seek controls, crate row load requests, crossfader buttons, deck trim, master, and fader commits.

## V22-3: Track, Widget, And Error Event Detection

Status: `[x]` completed and manager-verified.

### Summary

Log passive SoundCloud changes that happen outside direct button handlers.

### Implementation Spec

- Watch each deck's `currentTrackUrl` or loaded track index.
- Log track changes with title.
- Watch `isWidgetReady`.
- Log ready state once when the widget becomes ready.
- Watch `errorMessage`.
- Log newly appearing errors.
- Avoid repeated duplicate lines for the same state.

### Acceptance Criteria

- Loading a new song prints a track line.
- Widget readiness prints once per ready transition.
- Errors print once per new message.
- Normal render refreshes do not create events.

### Completed Implementation

- Added passive track change, widget ready, and error detection in `MainScreen.tsx` with refs to avoid duplicate lines for the same state.

## V22-4: Seek, Scrub, Cue, BPM, And Sync Event Detail

Status: `[x]` completed and manager-verified.

### Summary

Improve console lines with useful before/after values.

### Implementation Spec

- Format deck time as `MM:SS`.
- Progress seek logs previous and target time.
- Seek buttons log direction and step.
- Platter scrub logs start and release time.
- Cue edit nudges log cue id and delta.
- BPM actions log accepted source and BPM when available.
- Sync logs result label and seek delta if available.

### Acceptance Criteria

- Seek-related logs tell the user where the song moved.
- BPM-related logs tell the user which source/value was accepted.
- Sync logs explain success or failure.

### Completed Implementation

- Progress seek and platter scrub now log committed before/after positions.
- Seek buttons, cue nudges, BPM actions, and sync actions now produce concise event details.

## V22-5: Deck Monitor Console Rendering

Status: `[x]` completed and manager-verified.

### Summary

Render recent console lines into the shared deck monitor.

### Implementation Spec

- Extend `createStudioSoundCloudDeckMonitorCanvas()`.
- Add `consoleEvents` input.
- Increase canvas height.
- Increase monitor backing and plane size.
- Draw a framed console section below current deck/mixer status.
- Render newest events first.
- Render empty state:

```text
BOOTH CONSOLE LIVE
> waiting for deck events
```

### Acceptance Criteria

- Console appears on the in-world deck monitor.
- Text is readable from normal DJ position.
- Existing deck A/B status remains visible.
- The monitor does not clip into the booth or platform.

### Completed Implementation

- Expanded the shared SoundCloud deck monitor canvas and backing.
- Added a `BOOTH CONSOLE` section with newest-first timestamped lines, kind colors, and an empty waiting state.
- Updated the monitor to a 32:9 visible face with a `1792 x 504` canvas texture.
- Moved the console from a full-width bottom band into a dedicated right-side rail.
- Added separate Deck A and Deck B waveform strips with playhead progress on the left monitor area.
- Added invisible monitor hit targets so clicking Deck A or Deck B waveform seeks that deck.
- Extended monitor waveform hit targets to support hold-drag scrubbing with a committed release log.
- Added on-monitor `-` / `+` buttons to reduce or increase waveform visual resolution from `x1` to `x4`.
- Kept the monitor `-` / `+` controls visually screen-drawn, with invisible 3D hit targets instead of floating button boxes.

## V22-6: Throttle Rules, Bounds, And Readability Pass

Status: `[x]` completed and manager-verified.

### Summary

Prevent spam and tune the monitor for real use.

### Implementation Spec

- Confirm fader drags do not flood the console.
- Log fader drag end or useful value changes only.
- Keep event labels within canvas width.
- Fade older lines slightly.
- Check first-person readability.
- Check top-down scene composition.

### Acceptance Criteria

- Dragging faders produces useful event history without spam.
- Console lines do not overlap.
- Monitor remains visually balanced with the DJ booth.
- No unrelated room objects are disturbed.

### Completed Implementation

- Fader logging happens on drag release through a commit callback.
- Progress seek and platter scrub log on drag release, not every drag movement.
- Console rendering trims line text to fit the monitor canvas.

## V22-7: Tests, Build, And Manual QA Checklist

Status: `[x]` completed and manager-verified.

### Summary

Verify the console behavior and close the vision.

### Implementation Spec

- Add pure helper tests if a formatter/helper module is introduced.
- Run existing SoundCloud BPM tests.
- Run production build.
- Update `docs/3d/manual-test-checklist.md`.
- Add `changelog.md` entry.

### Acceptance Criteria

- `npm.cmd run build` passes.
- Existing BPM tests pass if touched.
- Manual checklist covers:
  - play/pause logging.
  - crate load logging.
  - seek logging.
  - platter scrub logging.
  - cue logging.
  - BPM logging.
  - sync logging.
  - fader logging.
  - widget/error logging if testable.

### Completed Implementation

- Updated `docs/3d/manual-test-checklist.md` with booth console checks.
- Verification passed: `npm.cmd run build`.
- Existing BPM test files were not touched.

## Deferred Ideas

### V22-8: Per-User Multiplayer Action Attribution

Status: `[hold]` intentionally deferred.

When shared DJ controls exist, include the acting user:

```text
RUBBE A PLAY Midnight Drive
HOST B SYNC TO A
```

### V22-9: Export Or Copy Console History

Status: `[hold]` intentionally deferred.

Allow copying the recent console history for debugging sessions.

### V22-10: Filterable Console Modes

Status: `[hold]` intentionally deferred.

Add filter modes such as `ALL`, `DECK`, `MIX`, `BPM`, `ERROR`.

## Risks

- Logging every drag movement could make the console unreadable.
- Expanding the deck monitor may block sightlines or overlap booth controls.
- Passive event detection can duplicate direct action logs if not carefully scoped.
- Too much text can make the booth feel like a developer tool instead of DJ hardware.
- Logging track titles may overflow if text is not trimmed.

## Non-Goals

- No shared multiplayer DJ control changes.
- No new SoundCloud audio behavior.
- No sync math changes.
- No new BPM detection behavior.
- No normal 2D SoundCloud panel redesign.
- No external logging/export system in V1.

## Open Questions

- Should the console live only on the shared deck monitor, or should each deck readout get a tiny last-event line too?
- Should fader drag events log on release only, or throttle during drag?
- Should crate row loading log both `LOAD REQUEST` and `TRACK CHANGED`, or only the final changed track?
- Should console lines show local wall-clock time or session-relative time?
- Should sync expose the actual target seek delta to the console in V1?

## Recommended First-Pass Decisions

- Console state lives in `MainScreen.tsx`.
- Event types live in `src/3d/soundCloudBooth.ts`.
- The existing shared deck monitor owns the visible console section.
- Keep the visible monitor face at 32:9 to match an ultrawide DJ monitor.
- Place the console as a dedicated right-side rail.
- Render latest 9 lines.
- Keep latest 24 lines in state.
- Log direct button actions immediately.
- Log platter scrub and fader drags on release.
- Track/widget/error passive events are added after direct action logging works.
- Use wall-clock `HH:MM:SS` timestamps for readability.
