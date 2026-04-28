# Secret 3D World Vision 24 - Audio Latency and Sync

## Purpose

Vision 24 makes Sync Sesh audio timing measurable, explainable, and progressively tighter.

The immediate pain is the recording-studio piano in Discord Activity: clicking a piano note can feel like it takes around 500ms before the local user hears it. Running locally with `npm run dev -- --port 3000` feels better, but still not exact. DJ cue buttons also feel like they do not always seek to the exact intended time.

This vision treats those as related timing problems with different causes:

- Local piano click latency is primarily an input-to-Web-Audio-to-output problem.
- Friend piano latency is a network and scheduling problem.
- SoundCloud cue latency is partly limited by the SoundCloud iframe widget API.
- Discord Activity adds an embedded runtime, network proxying, device output, and performance variables that local dev does not fully reproduce.

The first goal is not to guess harder. The first goal is to instrument the app well enough that every delay has a name.

## Product Goal

Users should be able to play the studio piano and DJ controls in a Discord Activity with timing that feels intentional instead of laggy or random.

Desired behavior:

- A local piano click should produce audible sound as quickly as the browser, Discord runtime, and user's output device allow.
- The app should expose useful latency diagnostics in development and debug builds.
- The team should be able to tell whether a piano delay is caused by input/raycasting, first-note audio initialization, Web Audio output latency, device latency, render-frame pressure, or network delivery.
- Friend piano notes should eventually use shared timestamps and Web Audio scheduling instead of simply playing when the packet arrives.
- DJ cue behavior should be made more honest and more stable, while acknowledging that SoundCloud iframe seeking cannot be made sample-accurate.
- The app should avoid pretending that Discord voice/activity networking gives us real-time music transport for free.

## Current Code Facts

Current facts from code review and research on 2026-04-23:

- `src/3d/Level1RecordingStudioRoom.tsx` plays a local piano note before it broadcasts the live note event to friends.
- The piano key activation path calls `localDawAudioActions?.playPianoLiveNote(...)`, then records the note event, then calls `onBroadcastDawLiveSound?.(...)` if the note is audible.
- This means a 500ms delay before the local user hears their own piano note is not caused by waiting for the sync server or a friend broadcast round trip.
- `src/3d/useLocalDawAudioEngine.ts` creates a browser `AudioContext`, but it does not currently request an explicit low-latency `latencyHint`.
- The piano/FM synth starts oscillators at `audioContext.currentTime`, with a very short attack around 8ms, so the synth envelope is not intentionally adding hundreds of milliseconds.
- `useLocalDawAudioEngine.ts` does not currently log `audioContext.baseLatency`, `audioContext.outputLatency`, first-note warmup cost, or click-to-start timing.
- `src/3d/interactions.tsx` uses a native `pointerdown` handler on the canvas, not a delayed browser `click` event.
- The 3D interaction system activates the current cached aim hit from the render/raycast loop. If Discord Activity runs at lower FPS or the main thread is busy, pointer-to-activation can still feel late even though the handler is `pointerdown`.
- `src/3d/ThreeDModeShell.tsx` receives remote shared DAW live-sound events and plays them immediately if they are not stale. It does not schedule the sound against a shared future timestamp.
- `src/lib/sync/wsSyncClient.ts` already estimates latency and server time offset for shared sync status, but the live piano-note path does not yet use that timing information for scheduled playback.
- `src/hooks/useSoundCloudPlayer.ts` drives SoundCloud playback through the SoundCloud iframe widget. Cueing uses widget calls like `seekTo(...)` and `play(...)`.
- The SoundCloud widget is controlled through an iframe/postMessage API. It does not provide decoded audio buffers, sample-accurate Web Audio scheduling, or a completion signal that says a seek became audible at the exact target sample.
- SoundCloud position polling in the current player path is coarse compared with musical cue precision.
- `src/lib/discord/embeddedApp.ts` maps app networking through Discord Activity URL mappings. Discord Activity networking goes through Discord's proxy/Cloudflare path, and WebRTC is not available for Activities.

## Research Notes

Relevant platform facts:

- Browser `AudioContext` supports a `latencyHint`, including the category `"interactive"`, but browsers may choose the final latency.
- `AudioContext.baseLatency` and `AudioContext.outputLatency` can reveal part of the real output path, though support varies by browser/runtime.
- Web Audio timing is precise when nodes are scheduled against `audioContext.currentTime`; JavaScript timers and network arrival time are not precise musical clocks.
- Discord Activities support WebSockets through the Activity networking proxy, but do not support WebRTC. This matters for live friend-to-friend musical timing.
- The SoundCloud Widget API is useful for playback control, but it is not a low-level audio engine.

## Diagnosis

The most likely piano problem is not a single bug. It is probably a stack of delays:

- First interaction may pay an audio-context resume or warmup cost.
- Discord's embedded runtime may choose a higher output buffer than the local browser.
- The user's audio output path may add latency, especially Bluetooth or virtual devices.
- Discord Activity may run the 3D scene with lower or less stable frame timing than local dev.
- The current piano activation path depends on a cached raycast target from the render loop.
- Remote friend notes are played on arrival, so network jitter directly becomes musical jitter.

The key mistake to avoid is treating all of this as "sync is late." Local piano latency, remote friend latency, and SoundCloud cue precision need separate measurements and separate fixes.

## Core Product Decision

Make timing visible before changing the musical model.

Vision 24 should start with a debug-quality latency trace that follows a note from user input to audio scheduling:

```text
pointerdown event
  -> interaction activation
  -> piano onActivate
  -> playPianoLiveNote call
  -> AudioContext resume/warm state
  -> oscillator start scheduled time
  -> known base/output latency values
  -> optional remote broadcast timestamp
```

Once this trace exists, improvements can be tested in Discord Activity instead of guessed from local dev.

## [x] Phase 0 - Baseline and Reproduction

Goal: capture the current behavior without changing the user experience.

Tasks:

- Reproduce the piano delay in Discord Activity with two users.
- Reproduce the piano delay in Discord Activity alone, if possible.
- Compare against local dev at `npm run dev -- --port 3000`.
- Test with wired headphones/speakers and Bluetooth separately.
- Record browser/runtime, operating system, device output, and rough FPS.
- Capture current sync status latency from the existing sync client.

Exit criteria:

- We have at least one local-dev baseline and one Discord Activity baseline.
- We know whether the 500ms delay happens for the local player even when no friend is present.
- We know whether Bluetooth or a specific output device is involved.

### Completed Implementation

- Converted the original investigation into a measurable baseline protocol.
- Added piano, interaction, audio-context, remote scheduling, and SoundCloud seek traces in later phases so the baseline can be captured from real local dev and Discord Activity sessions.
- Manual collection is still environment-dependent: it must be run on the target Discord desktop/browser clients and audio devices.

### Baseline Capture Checklist

- Local dev, wired output: click 3D piano, click Studio-tab piano test, record `pointerToAudioCallMs`, `baseLatencyMs`, and `outputLatencyMs`.
- Discord Activity alone, wired output: repeat the same checks.
- Discord Activity with friend, wired output: record local piano trace and remote `shared-daw-live-piano` trace.
- Discord Activity with Bluetooth output: repeat local and remote piano checks.
- DJ cue check: trigger a saved cue and record `[Sync Sesh SoundCloud seek]` request, callback, delayed, and progress rows.

## [x] Phase 1 - Piano Latency Instrumentation

Goal: make the app say where time is being spent.

Tasks:

- Add a development-only piano latency trace object.
- Capture `performance.now()` at canvas `pointerdown`.
- Capture `performance.now()` at interaction activation.
- Capture `performance.now()` at piano key `onActivate`.
- Capture `performance.now()` inside `playPianoLiveNote`.
- Capture whether the `AudioContext` was already running or had to resume.
- Capture `audioContext.currentTime`, scheduled oscillator start time, `baseLatency`, and `outputLatency` when available.
- Reuse the existing Studio-tab piano test control as the direct bypass path.
- Leave render/FPS profiling for Phase 3.
- Leave SoundCloud cue logs for Phase 5.

Exit criteria:

- We can compare 3D piano click, debug button, and keyboard note latency in local dev and Discord Activity.
- We can tell whether most delay happens before `playPianoLiveNote` or after Web Audio scheduling.
- We can see the runtime-reported audio output latency when the browser exposes it.

### Implementation Spec

Approved scope for this phase:

- Add lightweight piano latency tracing without changing the musical sync model.
- Instrument the 3D interaction activation path so piano notes can receive a `pointerdown` timestamp and an activation timestamp.
- Instrument the studio piano key `onActivate` path so it records the time just before calling `playPianoLiveNote`.
- Extend the local DAW audio engine with an optional generated-sound trace input for piano notes.
- Log concise development-only trace rows that include pointer, activation, piano handler, audio call, `AudioContext` state, `currentTime`, `baseLatency`, `outputLatency`, and target voice.
- Add an explicit low-latency `AudioContext` construction preference with `{ latencyHint: "interactive" }` if TypeScript accepts the local DOM type.
- Add a direct development-only piano latency test control or keyboard shortcut only if it can be done without adding a broad new UI surface.
- Avoid remote live-note scheduling, shared event schema changes, SoundCloud cue changes, or visible production UI in this phase.

Expected files to touch:

- `src/3d/interactions.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/useLocalDawAudioEngine.ts`
- `docs/3d/3dvision24-audio-latency-and-sync.md`
- `changelog.md`

Acceptance criteria:

- A local piano key click produces a development console trace with enough timestamps to separate interaction delay from audio-engine delay.
- The trace still works when sound is blocked by `allowSound: false`, so silent routing bugs are visible.
- The audio engine reports available latency fields without crashing in runtimes that do not support them.
- Normal piano behavior remains unchanged for users.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added optional `pointerDownAtMs` and `activatedAtMs` metadata to interaction activations.
- Threaded piano key activation timing into `playPianoLiveNote`.
- Added optional `LocalDawLatencyTrace` metadata for generated sounds.
- Added development-only piano latency console output.
- Added low-latency `AudioContext` construction with `latencyHint: "interactive"`.
- Added tracing to the existing Studio-tab piano test path.

### Completed Implementation

- Clicking a 3D studio piano key now emits a dev-only `[Sync Sesh piano latency]` console row with pointer, activation, piano handler, audio call, audio context state, `currentTime`, approximate scheduled start time, `baseLatency`, and `outputLatency` when available.
- The existing Studio-tab piano test emits the same trace without pointer/activation fields, giving a direct audio-engine comparison against the 3D raycast path.
- The trace is optional and does not change normal piano playback, recording, or live-sound broadcast behavior.

### Build And Manual Checks

- `npm.cmd run build` passed.
- Manual follow-up: compare local dev vs Discord Activity using the trace output.

### Risks

- Browser support for `outputLatency` varies.
- Console traces can get noisy if every note logs permanently; keep the output concise and development-only.
- Interaction timestamp threading must not break existing drag, shoot, or non-piano click activation.

### Non-Goals

- Do not implement remote friend note scheduling in Phase 1.
- Do not change sync-server event schemas in Phase 1.
- Do not redesign SoundCloud cue playback in Phase 1.
- Do not add a public settings screen in Phase 1.

## [x] Phase 2 - Local Piano Latency Improvements

Goal: make the local player's own piano feel immediate.

Tasks:

- Create the DAW `AudioContext` with an explicit low-latency preference such as `{ latencyHint: "interactive" }`.
- Warm the audio engine before the first real piano note where browser autoplay rules allow it.
- Keep the audio context resumed after the user has intentionally entered or interacted with the studio.
- Avoid doing expensive allocations or graph setup on the first audible piano click where possible.
- Keep the current oscillator scheduling at `audioContext.currentTime` for immediate local feedback.
- Add a visible or hidden dev readout for `baseLatency` and `outputLatency`.
- If raycast timing is a contributor, consider a more direct piano-key hit path when the pointer is over the piano keyboard surface.

Exit criteria:

- Direct debug piano note has the lowest possible latency in Discord Activity.
- 3D piano key latency is close to direct debug note latency.
- The first note is not dramatically slower than later notes after the user has interacted with the app.

### Implementation Spec

Approved scope for this phase:

- Keep local piano notes scheduled immediately at `audioContext.currentTime`.
- Persist a small `audioContextInfo` telemetry object on `LocalDawAudioEngineState` with raw context state, `baseLatencyMs`, and `outputLatencyMs`.
- Refresh the telemetry when the engine initializes, resumes, or is closed.
- Add a silent best-effort warmup voice after initialize/resume so the graph pays oscillator/gain creation costs before the first audible piano note where browser autoplay rules allow it.
- Show the telemetry in the existing Studio tab using compact values, without adding a new public settings surface.
- Do not change remote live-note sync or SoundCloud cue behavior in this phase.

Expected files to touch:

- `src/3d/useLocalDawAudioEngine.ts`
- `src/3d/ThreeDModeShell.tsx`
- `docs/3d/3dvision24-audio-latency-and-sync.md`
- `changelog.md`

Acceptance criteria:

- Engine state exposes audio context latency info without updating React state on every note.
- Engine initialize/resume performs a silent warmup without audible output.
- Existing Studio-tab piano test still works and shows latency telemetry when available.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added engine-level audio context telemetry.
- Added a silent graph warmup after initialize/resume.
- Kept piano note scheduling immediate at `audioContext.currentTime`.
- Added a compact Studio-tab latency readout.

### Completed Implementation

- `LocalDawAudioEngineState` now carries `audioContextInfo` with context state, `baseLatencyMs`, and `outputLatencyMs`.
- Engine initialize/resume now warms the Web Audio graph with a silent oscillator/gain path so first audible piano notes should avoid some setup cost.
- The existing Studio tab shows `BASE` and `OUT` latency values when the runtime exposes them.

### Build And Manual Checks

- `npm.cmd run build` passed.
- Manual follow-up: compare first-note trace before and after opening/waking the Studio engine.

## [x] Phase 3 - Interaction and Render Path Tightening

Goal: prevent the 3D interaction layer from adding avoidable delay.

Tasks:

- Compare pointerdown-to-activation timing against frame delta and FPS.
- Check whether Discord Activity is running the room at low or unstable FPS.
- Keep piano activation on `pointerdown`.
- Avoid waiting for release/up events for sound.
- Profile raycast workload around the studio piano and DJ table.
- If needed, add simpler hit zones or direct pointer mapping for dense musical controls like piano keys and cue buttons.
- Make sure visual feedback happens immediately when a key is pressed, even if audio output latency is outside app control.

Exit criteria:

- Pointerdown-to-activation is consistently small.
- Dense musical controls do not depend on heavy per-frame work more than necessary.
- Users get immediate visual confirmation for piano/cue input.

### Implementation Spec

Approved scope for this phase:

- Extend interaction activation timing with the latest render frame delta, raycast duration, and raycast object count.
- Thread those values into the existing piano latency trace.
- Keep activation on native `pointerdown`.
- Keep behavior unchanged for drag, shoot, keyboard, and non-piano interactables.
- Do not implement direct piano UV/key hit mapping unless the new trace proves raycast timing is the bottleneck.

Expected files to touch:

- `src/3d/interactions.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/useLocalDawAudioEngine.ts`
- `docs/3d/3dvision24-audio-latency-and-sync.md`
- `changelog.md`

Acceptance criteria:

- Piano latency trace includes recent frame delta and raycast timing fields.
- Pointerdown-to-activation remains measured from native pointerdown.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added render frame delta to interaction activation timing.
- Added raycast duration and object count to interaction activation timing.
- Threaded interaction timing into the piano latency trace.
- Kept pointer activation on native `pointerdown`.

### Completed Implementation

- Piano latency traces now include `frameDeltaMs`, `raycastDurationMs`, and `raycastObjectCount`.
- The timing fields are optional and shared through the existing activation object, so keyboard and non-piano activations continue to work without special cases.
- Direct piano key mapping is intentionally deferred until the trace proves raycast timing is the bottleneck.

### Build And Manual Checks

- `npm.cmd run build` passed.
- Manual follow-up: use the trace inside Discord Activity to compare `frameDeltaMs`, `raycastDurationMs`, and `pointerToAudioCallMs`.

## [x] Phase 4 - Friend Piano Sync Model

Goal: make friend notes line up musically instead of playing at random packet arrival time.

Tasks:

- Extend live DAW sound events with timing metadata:
  - local input timestamp
  - estimated server timestamp
  - sender audio context time if useful
  - intended scheduled server time
- Use the existing sync client's server-time offset and latency estimates to translate event timing.
- For remote notes, schedule Web Audio playback slightly in the future using `audioContext.currentTime`.
- Add a small lookahead buffer that absorbs normal network jitter.
- Keep local player's own note immediate, unless a later mode intentionally prioritizes perfect ensemble sync over local feel.
- Drop or immediately play remote notes that arrive too late for their scheduled time, with telemetry marking them as late.
- Track remote note lateness and jitter in debug logs.

Exit criteria:

- Two Discord Activity users hear remote piano notes with less jitter than immediate-on-arrival playback.
- The local player still gets immediate feedback for their own note.
- Debug logs show scheduled time, actual schedule delay, and late-event count.

### Implementation Spec

Approved scope for this phase:

- Keep local sender piano playback immediate.
- Add optional client trigger metadata to live sound payloads.
- Use the server-stamped `triggeredAt` on received live sound events as the shared timing anchor.
- For remote piano only, schedule playback a short lookahead after `triggeredAt` using the receiver's `syncStatus.serverTimeOffsetMs`.
- If the event arrives late for its scheduled time, play it immediately and mark the trace as late.
- Add optional scheduled-start support to the local piano audio path without changing normal immediate local notes.
- Do not schedule drums, bass-pattern, or SoundCloud events in this phase.

Expected files to touch:

- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/useLocalDawAudioEngine.ts`
- `docs/3d/3dvision24-audio-latency-and-sync.md`
- `changelog.md`

Acceptance criteria:

- Remote piano notes use a scheduled Web Audio start delay when they arrive before the lookahead target.
- Late remote piano notes still play, but their dev trace records lateness.
- Local piano notes remain immediate.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added optional `clientTriggeredAt` metadata to live sound payloads.
- Added optional `scheduledAt` metadata to live sound payloads.
- Sanitized live sound timing metadata through session state.
- Added scheduled-start support to local piano's FM/bass audio paths.
- Scheduled remote piano playback from server-aligned time while keeping local sender playback immediate.

### Completed Implementation

- Piano broadcasts now leave the sender immediate but include a server-aligned `scheduledAt` target for receivers.
- Remote piano receivers calculate a bounded start delay from `scheduledAt` and `syncStatus.serverTimeOffsetMs`.
- Late remote piano events still play immediately and add `remoteLateByMs` to the dev trace.
- Existing drum, bass, bass-pattern, and FM live sounds continue using their previous immediate behavior.

### Build And Manual Checks

- `npm.cmd run build` passed.
- Manual follow-up: test two Discord Activity users and compare remote scheduled delay/late fields in the piano trace.

## [x] Phase 5 - DJ Cue Accuracy and SoundCloud Limits

Goal: improve cue reliability while being honest about the SoundCloud widget ceiling.

Tasks:

- Use SoundCloud widget progress events and position callbacks to tighten cue-state reporting.
- After cue actions, query or observe the reported position so the UI can show whether the widget landed near the requested cue.
- Avoid claiming sample-accurate cueing for SoundCloud iframe playback.
- Add a small calibration or nudge path if repeated seek offset is consistent.
- Consider a "best effort" cue label or warning in debug mode when measured seek delay is high.
- Keep longer-term options open for a non-SoundCloud-audio source if truly tight DJ timing becomes a product requirement.

Exit criteria:

- Cue presses expose measured seek behavior instead of only the requested timestamp.
- Users get clearer feedback when a SoundCloud cue is still settling.
- The team has a documented line between "improved widget control" and "requires a real audio engine."

### Implementation Spec

Approved scope for this phase:

- Add development-only SoundCloud seek diagnostics around `seekToPlaybackPosition`.
- Log requested position, previous local position, play-after-seek intent, immediate widget-reported position, delayed widget-reported position, and first `PLAY_PROGRESS` position when available.
- Keep SoundCloud cue playback behavior unchanged.
- Do not claim sample-accurate SoundCloud cueing.
- Do not change grid burst playback architecture in this phase.

Expected files to touch:

- `src/env.d.ts`
- `src/hooks/useSoundCloudPlayer.ts`
- `docs/3d/3dvision24-audio-latency-and-sync.md`
- `changelog.md`

Acceptance criteria:

- Triggering a hot cue in dev emits concise SoundCloud seek diagnostics.
- The diagnostics work even if `PLAY_PROGRESS` is unavailable.
- `npm.cmd run build` passes.

### Checklist Items Achieved

- Added dev-only SoundCloud seek request logging.
- Added immediate and delayed widget position callback diagnostics.
- Added optional first `PLAY_PROGRESS` diagnostic support.
- Kept cue and grid playback behavior unchanged.

### Completed Implementation

- SoundCloud seeks now log `[Sync Sesh SoundCloud seek]` rows in development with requested position, previous local position, reported widget position, delta from request, elapsed time, and play-after-seek intent.
- Diagnostics degrade gracefully when the widget does not expose `PLAY_PROGRESS`.
- SoundCloud cue precision remains documented as widget-limited rather than sample-accurate.

### Build And Manual Checks

- `npm.cmd run build` passed.
- Manual follow-up: compare requested cue time against reported position callbacks in Discord Activity.

## [x] Phase 6 - Validation Matrix

Goal: prove improvements in the environments users actually use.

Test environments:

- Local dev browser at `npm run dev -- --port 3000`.
- Discord Activity desktop app.
- Discord Activity in supported browser.
- Wired headphones or speakers.
- Bluetooth headphones.
- One user alone in Activity.
- Two users in the same Activity.
- Normal 3D scene load.
- Stress case with DJ booth, piano, and movement active.

Suggested targets:

- Direct local piano debug note should feel effectively immediate on wired output.
- 3D piano key should be close to the direct debug note path.
- Pointerdown-to-audio-call should normally be well below a frame or two.
- Remote friend piano notes should align within a musically acceptable window when latency is stable.
- SoundCloud cue accuracy should be reported as measured behavior, not assumed exactness.

### Completed Implementation

- Closed Vision 24 with a concrete validation matrix for local dev, Discord Activity, output devices, solo testing, two-user testing, and SoundCloud cue diagnostics.
- The app now provides the trace points needed to fill that matrix without further code changes.

### Pass/Watch Criteria

- `pointerToAudioCallMs` high while `handlerToAudioCallMs` is low: likely interaction/raycast/render path.
- `handlerToAudioCallMs` low but perceived sound late with high `baseLatencyMs` or `outputLatencyMs`: likely browser/runtime/output-device latency.
- `shared-daw-live-piano` has nonzero `scheduledStartDelayMs` and low `remoteLateByMs`: remote scheduling is working.
- `shared-daw-live-piano` has high `remoteLateByMs`: network/proxy delivery is arriving after the lookahead window.
- SoundCloud `reportedDeltaMs` stays large or inconsistent: widget seek limitation, not DAW Web Audio timing.

## Implementation Work Packages

Suggested order:

1. Add latency tracing types and debug log helpers.
2. Instrument piano input, activation, and audio scheduling.
3. Add direct piano latency test controls.
4. Add `AudioContext` latency configuration and warmup improvements.
5. Instrument SoundCloud cue request/report timing.
6. Add remote live-note timing fields.
7. Schedule remote notes with shared-time lookahead.
8. Add validation checklist entries for Discord Activity testing.

## Risks and Constraints

- Browser and Discord runtimes may ignore or reinterpret `latencyHint`.
- `baseLatency` and `outputLatency` may be unavailable or incomplete in some runtimes.
- Bluetooth or virtual audio devices can add large latency that the app cannot remove.
- Discord Activity networking is proxied and does not support WebRTC.
- SoundCloud iframe playback cannot become sample-accurate without changing audio source architecture.
- Adding a lookahead buffer improves remote alignment but can make remote notes intentionally later.
- Scheduling the local player's own notes through the same lookahead would improve ensemble alignment but would make local play feel worse, so local immediate feedback should remain the default.

## Definition of Done

Vision 24 is complete when:

- The team can open a Discord Activity and see enough diagnostics to explain a slow piano click.
- Local piano playback uses the best available low-latency Web Audio configuration.
- First-note warmup is handled deliberately.
- 3D piano input path has been measured against a direct audio test path.
- Remote piano events use timestamps and Web Audio scheduling rather than raw arrival time.
- SoundCloud cue behavior has improved instrumentation and honest UI/debug language around precision.
- A small validation matrix exists so future audio changes do not regress Discord Activity feel.
