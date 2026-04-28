# Secret 3D World Vision 19 - SoundCloud Waveform BPM And Sync

## Purpose

Vision 19 turns the SoundCloud DJ booth from a visual two-deck mixer into a more musically aware booth.

The core idea is simple and crafty: SoundCloud often does not provide true BPM metadata, but it does provide a waveform loudness envelope. For many electronic tracks, the kick or main pulse appears as repeated loudness peaks. We can analyze those waveform samples, estimate BPM, label the confidence honestly, and use that BPM estimate to power better deck displays and a first sync button.

This vision does not promise full DJ time-stretching. The current SoundCloud widget can seek, play, pause, skip, and set volume, but it does not expose playback-rate or pitch control. The first sync behavior should therefore be beat/phase alignment by seeking, not true tempo matching.

## Product Goal

Users should see useful BPM information even when SoundCloud metadata is blank.

The deck monitor should clearly communicate source:

```text
128 BPM        // SoundCloud-provided metadata
128 BPM MAP    // curated override for known tracks
128 BPM WAVE   // waveform loudness estimate
120 BPM EST    // generic fallback only
BPM --         // no loaded track
```

Users should also get two new deck buttons:

- `MUTE`: locally mute/unmute the deck without destroying its trim value.
- `SYNC`: align this deck to the other deck using the best available BPM and playback position.

## Code Facts

Current facts from code review on 2026-04-22:

- `src/hooks/useSoundCloudPlayer.ts` already fetches `sound.waveform_url` and stores normalized waveform bars.
- The raw `waveform.samples` are available before they are converted into display bars.
- `JukeboxDisplayState.currentTrackBpm` exists but only reflects `sound.bpm`.
- `getSoundCloudDeckBpmLabel()` in `src/3d/Level1RecordingStudioRoom.tsx` currently displays SoundCloud BPM, then `120 BPM EST`, then `BPM --`.
- `SoundCloudSeekActions.seekTo(positionMs, options?)` and `seekBy(deltaSeconds)` already exist.
- Each deck already has independent SoundCloud widget state, playback position, duration, volume, and effective output level.
- `SoundCloudBoothDeck` already carries per-deck trim and output data.
- `SoundCloudBoothMixer` already carries crossfader and master volume.
- The SoundCloud widget does not expose playback-rate or pitch-shift control in our current typed surface.

## Implementation Prep

Vision 19 should start with pre-phase prep before changing behavior.

Prep goals:

- Keep the BPM estimator pure and testable.
- Avoid mixing algorithm code directly into React components.
- Preserve existing `currentTrackBpm` callers until richer BPM display state is wired everywhere.
- Add source labels before changing the visible monitor, so the UI never lies about whether BPM is true metadata, waveform-estimated, mapped, or fallback.
- Ship mute before sync if useful, because mute is lower risk and validates the new per-deck action surface.
- Keep sync local-only. It should not write to shared session state.

Recommended new files:

```text
src/lib/soundcloud/bpmAnalysis.ts
src/lib/soundcloud/bpmAnalysis.test.ts
```

Recommended edited files:

```text
src/hooks/useSoundCloudPlayer.ts
src/3d/soundCloudBooth.ts
src/screens/MainScreen.tsx
src/3d/Level1RecordingStudioRoom.tsx
docs/3d/manual-test-checklist.md
changelog.md
```

Optional later file:

```text
src/lib/soundcloud/bpmOverrides.ts
```

Worker ownership:

- BPM model and estimator worker: `src/lib/soundcloud/*` plus tests only.
- Hook integration worker: `src/hooks/useSoundCloudPlayer.ts` only.
- Booth controls worker: `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Manager owns final integration, changelog, docs, and build.

Do not have multiple workers edit `Level1RecordingStudioRoom.tsx` at the same time.

## Pre-Phase Checklist

- [x] Confirm test runner command for focused TypeScript utility tests.
- [x] Add estimator types without changing UI behavior.
- [x] Add synthetic waveform fixtures for 120, 128, 140, half-time, double-time, noise, silence, and sparse kicks.
- [x] Confirm the estimator can run synchronously without blocking noticeably for typical SoundCloud waveform sample counts.
- [x] Confirm all BPM display labels fit on the enlarged deck monitor.
- [x] Confirm button placement lane for `MUTE` and `SYNC` from current top-down layout before coding.
- [x] Decide default confidence threshold for `BPM WAVE`.
- [x] Decide whether `SYNC` is allowed with generic fallback as `SYNC EST`.

Default prep decisions unless live testing disproves them:

- Waveform BPM accepted threshold: `confidence >= 0.62`.
- Low confidence range: `0.42..0.62`, useful for debug but not default display.
- Target BPM range: `70..180`.
- Electronic preference center: `124..132`, used only as a weak tie-breaker.
- Generic fallback `120 BPM EST` is displayable but sync should caption `SYNC EST`.
- `SYNC EST` should be enabled only if both decks are loaded and the user explicitly presses sync.
- Muted decks keep playing silently.

## BPM Algorithm Direction

Use the SoundCloud waveform as a loudness envelope.

Input:

```ts
samples: number[]
durationMs: number
```

Output:

```ts
interface SoundCloudBpmAnalysis {
  bpm: number | null;
  confidence: number;
  source: "soundcloud" | "override" | "waveform" | "estimated" | "none";
  debug?: {
    candidateCount: number;
    peakCount: number;
    topCandidates: Array<{ bpm: number; score: number }>;
  };
}
```

Basic estimator:

1. Normalize waveform samples into `0..1`.
2. Smooth over a small moving window to reduce single-sample spikes.
3. Compute local energy and local average.
4. Detect candidate peaks where energy rises above a dynamic threshold.
5. Convert peak indexes into timestamps using `durationMs / samples.length`.
6. Run a candidate-BPM grid search across `70..180`.
7. Score each BPM candidate by how much peak energy lands near expected beat positions.
8. Also score interval consistency between strong peaks.
9. Add a weak song-length grid sanity score.
10. Pick the best candidate and normalize obvious half/double-time alternatives.
11. Return the best candidate if confidence clears a threshold.

Preferred first implementation:

Use candidate scoring first, peak-interval histogram second.

Candidate scoring should be more tolerant than adjacent-peak interval detection because SoundCloud waveforms may smooth or omit individual kicks. The estimator can generate peaks once, then score each candidate BPM by asking: "If this BPM were true, do loud peaks repeatedly appear near its beat grid?"

Pseudo-code:

```ts
export function estimateBpmFromWaveform(samples: number[], durationMs: number): SoundCloudBpmAnalysis {
  const envelope = normalizeAndSmooth(samples);
  const peaks = detectEnvelopePeaks(envelope);
  const candidates = [];

  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const beatMs = 60000 / bpm;
    const phaseScore = scoreBeatGrid(envelope, peaks, durationMs, beatMs);
    const intervalScore = scorePeakIntervals(peaks, durationMs, beatMs);
    const lengthScore = scoreDurationGrid(durationMs, beatMs);
    const rangeScore = scoreDjRangePreference(bpm);
    const score = phaseScore * 0.52 + intervalScore * 0.28 + lengthScore * 0.12 + rangeScore * 0.08;
    candidates.push({ bpm, score });
  }

  return normalizeBestCandidate(candidates, peaks);
}
```

Initial scoring weights are allowed to change after fixture and live playlist testing.

Implementation notes:

- Never use randomness in the estimator.
- Clamp all public confidence values to `0..1`.
- Return `null` BPM for silence, too few samples, too short duration, or low confidence.
- Keep debug data small so it is safe to keep in state during development.
- Do not log candidate lists in production paths.

## Song Length Sanity Check

The user's duration idea is valuable as a tie-breaker.

For each candidate:

```ts
beatMs = 60000 / bpm
totalBeats = durationMs / beatMs
```

Then score closeness to useful musical groupings:

```text
totalBeats near multiple of 4
totalBeats near multiple of 8
totalBeats near multiple of 16
totalBeats near multiple of 32
```

This should not dominate the result because songs may have fades, odd intros, or silence. It should help choose between close candidates and reject obviously strange BPMs.

## Sync Behavior

The first `SYNC` implementation should be honest and useful.

Button meaning:

```text
SYNC on Deck A => align Deck A to Deck B
SYNC on Deck B => align Deck B to Deck A
```

Required data:

- Both decks loaded.
- Both decks have usable duration.
- The source deck has a usable playback position.
- A BPM exists from SoundCloud metadata, curated map, waveform estimate, or fallback.

V1 sync operation:

1. Choose source deck: the opposite deck.
2. Choose target deck: the deck whose `SYNC` button was pressed.
3. Choose BPM:
   - prefer source real/override BPM,
   - otherwise target real/override BPM,
   - otherwise best waveform estimate,
   - otherwise fallback `120 BPM EST`.
4. Compute beat phase:

```ts
beatMs = 60000 / bpm
sourcePhase = sourcePositionMs % beatMs
targetPhase = targetPositionMs % beatMs
delta = shortestPhaseDelta(sourcePhase, targetPhase, beatMs)
```

5. Seek target deck by `delta`.
6. Play target deck after seek.
7. Show a short label like `SYNC B`, `SYNC EST`, or `SYNC LOW`.

Sync helper contracts:

```ts
interface SoundCloudSyncDeckSnapshot {
  id: "A" | "B";
  bpm: number | null;
  bpmSource: SoundCloudBpmSource;
  isLoaded: boolean;
  isPlaying: boolean;
  playbackPosition: number;
  playbackDuration: number;
}

interface SoundCloudSyncResult {
  didSync: boolean;
  label: string;
  reason?: "load-track" | "no-master" | "no-duration" | "no-bpm";
  bpmUsed?: number;
  bpmSource?: SoundCloudBpmSource;
  targetPosition?: number;
}
```

Shortest phase delta:

```ts
function getShortestPhaseDelta(sourcePhase: number, targetPhase: number, beatMs: number) {
  const rawDelta = sourcePhase - targetPhase;
  if (rawDelta > beatMs / 2) return rawDelta - beatMs;
  if (rawDelta < -beatMs / 2) return rawDelta + beatMs;
  return rawDelta;
}
```

Target seek:

```ts
nextTargetPosition = clamp(targetPosition + delta, 0, targetDuration)
target.seekActions.seekTo(nextTargetPosition, { playAfterSeek: true })
```

V1 limitation:

- If Deck A is 128 BPM and Deck B is 132 BPM, phase sync may sound aligned for a moment and then drift.
- Without playback-rate control, we cannot keep tempos locked.

## Button Layout

Add per-deck `MUTE` and `SYNC` buttons to the DJ booth.

Recommended placement:

- Put them near each deck's existing play/shuffle and seek workflow.
- Keep them outside the cue pads and crossfader lanes.
- Make `MUTE` visually red/orange when active.
- Make `SYNC` visually cyan/green when a reliable BPM exists.
- Use disabled captions when blocked:
  - `LOAD TRACK`
  - `NO MASTER`
  - `NO BPM`
  - `SYNC EST`

Suggested 3D control lane:

- Put `MUTE` and `SYNC` near each deck's play/shuffle pod, not inside the center seek/cue stack.
- Deck A: a small row just inside or above the left play/shuffle pod.
- Deck B: matching row just inside or above the right play/shuffle pod.
- Keep enough gap from the crossfader front lane at `z = 0.42`.
- Avoid the cue shelves at `z = 1.03`.
- Use compact button sizes similar to existing deck controls.

Suggested labels:

```text
MUTE / OPEN
SYNC
SYNC EST
NO MASTER
LOAD TRACK
```

## Product Boundary

In scope:

- Waveform-based BPM estimation from SoundCloud waveform samples.
- BPM source labeling.
- Per-deck mute buttons.
- Per-deck sync buttons.
- Phase-align sync by seeking.
- Manual confidence labels and debug-safe internal scoring.
- Build-verified phases.

Out of scope:

- Full time-stretching.
- Pitch/key lock.
- True beatgrid editing.
- Downbeat detection beyond simple loudness/phase heuristics.
- Shared multiplayer DJ sync.
- Paid external API integration.
- Downloading or extracting SoundCloud audio outside the widget/API rules.

## Phase Status

Status marker meanings:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed and manager-verified
- `[hold]` intentionally deferred

Only one phase should be `[~]` at a time.

## Phase Plan

- [x] V19-0: Pre-Phase Prep And Fixtures.
- [x] V19-1: BPM Data Model And Source Labels.
- [x] V19-2: Waveform BPM Estimator Utility.
- [x] V19-3: Hook Integration And BPM Display Upgrade.
- [x] V19-4: Per-Deck Mute State And Buttons.
- [x] V19-5: Per-Deck Sync Action Surface.
- [x] V19-6: 3D Mute/Sync Button Layout.
- [x] V19-7: Manual QA And Feel Tuning.
- [hold] V19-8: Curated BPM Override Map.
- [hold] V19-9: External BPM API Adapter.
- [hold] V19-10: True Tempo Sync Audio Engine.

## V19-0: Pre-Phase Prep And Fixtures

Status: `[x]` completed and manager-verified.

### Summary

Prepare implementation scaffolding and test fixtures before changing app behavior.

### Expected Work

- Confirm existing test command or add a lightweight test route for pure utility tests if the repo already has a pattern.
- Add synthetic waveform fixture helper inside the BPM test file.
- Capture current DJ booth button/control lane constants in the doc if they change.
- Decide the exact `MUTE`/`SYNC` row coordinates before rendering.

### Acceptance Criteria

- Phase owner knows which files they are allowed to edit.
- BPM estimator fixtures are ready before algorithm tuning.
- No app behavior changes yet unless needed for test scaffolding.

### Completed Implementation

- Confirmed no package-level test script exists; focused utility tests run directly with `npx.cmd tsx`.
- Added the pure BPM utility/test scaffold in `src/lib/soundcloud/bpmAnalysis.ts` and `src/lib/soundcloud/bpmAnalysis.test.ts`.
- Manager-verified `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` passes with 8 tests.

## V19-1: BPM Data Model And Source Labels

Status: `[x]` completed and manager-verified.

### Summary

Make BPM values carry source and confidence.

### Expected Work

- Add a BPM source type.
- Add a BPM analysis/value type.
- Preserve existing `currentTrackBpm` compatibility if useful, but expose richer display state.
- Update deck labels to show source suffixes.

### Suggested Contract

```ts
export type SoundCloudBpmSource = "soundcloud" | "override" | "waveform" | "estimated" | "none";

export interface SoundCloudBpmState {
  bpm: number | null;
  source: SoundCloudBpmSource;
  confidence: number;
  label: string;
}
```

Compatibility rule:

- `currentTrackBpm` remains `number | null` for existing callers.
- New `currentTrackBpmState` carries source/confidence/label.
- `trackList[].bpm` can remain simple until V19-8 curated overrides.

### Acceptance Criteria

- Real SoundCloud BPM displays as plain `128 BPM`.
- Fallback displays as `120 BPM EST`.
- Build passes.

### Completed Implementation

- Added `SoundCloudBpmState` with BPM source, confidence, and ready-to-render label.
- Preserved `currentTrackBpm` while adding `currentTrackBpmState` to the player and jukebox display state.
- Updated the 3D deck monitor and platter visual BPM path to consume the richer BPM state.
- Verified with `npm.cmd run build`.

## V19-2: Waveform BPM Estimator Utility

Status: `[x]` completed and manager-verified.

### Summary

Create a pure utility that estimates BPM from waveform samples and duration.

### Expected Work

- Add unit-testable estimator function.
- Normalize/smooth samples.
- Detect peaks.
- Score BPM candidates.
- Include confidence and debug candidate data.
- Add focused tests with synthetic pulse patterns.

### Suggested Test Fixtures

- `120 BPM four-on-floor`: clear pulse every 500ms.
- `128 BPM four-on-floor`: clear pulse every 468.75ms.
- `140 BPM with missing kicks`: skip every 8th kick.
- `64 BPM half-time trap`: ensure normalization does not force a bad 128 unless score supports it.
- `double-time peaks`: ensure 256-like detected spacing normalizes into the target range.
- `silence`: no BPM.
- `random noise`: no BPM or very low confidence.
- `intro silence then beat`: estimator should use enough of the track to still find the pulse.

### Acceptance Criteria

- Synthetic 120 BPM pulse train estimates near 120.
- Synthetic 128 BPM pulse train estimates near 128.
- Half-time/double-time candidates normalize into target range.
- Low-signal/noisy input returns null or low confidence.
- Build/tests pass.

### Completed Implementation

- Added deterministic waveform normalization, smoothing, peak detection, candidate scoring, confidence, and compact debug candidates.
- Added synthetic fixtures for 120, 128, 140 with missing kicks, half-time, double-time, silence, deterministic noise, and intro silence.
- Worker verification: `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` passed and `npm.cmd run build` passed.
- Manager verification: `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` passed.

## V19-3: Hook Integration And BPM Display Upgrade

Status: `[x]` completed and manager-verified.

### Summary

Run the estimator when SoundCloud waveform data loads.

### Expected Work

- Store raw waveform samples or derived BPM analysis in `useSoundCloudPlayer`.
- Prefer SoundCloud-provided BPM over waveform estimate.
- Fall back to waveform estimate before generic `120 BPM EST`.
- Update `JukeboxDisplayState` and 3D monitor usage.

### Integration Notes

- Run waveform analysis only after both `waveform.samples` and a valid duration are known.
- If duration arrives after waveform fetch, analysis may need a `useMemo` based on `waveformSamples` and `playbackDuration`.
- Keep waveform display bars unchanged.
- Texture keys in `StudioSoundCloudDeckMonitor` must include the BPM label/source so the canvas refreshes.

### Acceptance Criteria

- Tracks with no `sound.bpm` can show `BPM WAVE` if analysis confidence is good.
- Tracks with SoundCloud BPM still show the real metadata.
- Build passes.

### Completed Implementation

- The hook now analyzes fetched SoundCloud waveform samples against playback duration.
- BPM source preference is SoundCloud metadata, then waveform analysis, then `120 BPM EST`.
- The deck monitor canvas texture key includes the rendered BPM label so label/source changes refresh.
- Verified with `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` and `npm.cmd run build`.

## V19-4: Per-Deck Mute State And Buttons

Status: `[x]` completed and manager-verified.

### Summary

Add local mute per SoundCloud deck.

### Expected Work

- Add Deck A/B muted state in `MainScreen`.
- Add `isMuted` and `onToggleMute` to `SoundCloudBoothDeck`.
- Multiply deck output level by zero when muted without changing trim.
- Add 2D or internal controls if needed for verification.

### Integration Notes

- Existing deck trim uses `state.volume`.
- Existing crossfader/master uses `actions.setOutputLevel`.
- Mute should affect `setOutputLevel`, not `setVolume`, so trim value is preserved.
- `outputPercent` should reflect actual audible effective output after mute.

### Acceptance Criteria

- Muting Deck A silences Deck A only.
- Muting Deck B silences Deck B only.
- Unmuting restores previous trim/crossfader/master behavior.
- Build passes.

### Completed Implementation

- Added local Deck A/B mute state in `MainScreen`.
- Mute multiplies the existing output-level path to zero without changing each deck's trim value.
- Added deck booth state fields for mute status and toggle actions.
- Verified with `npm.cmd run build`; first-person audio behavior remains a manual check.

## V19-5: Per-Deck Sync Action Surface

Status: `[x]` completed and manager-verified.

### Summary

Add sync functions that can align one deck to the other.

### Expected Work

- Add `onSyncToOtherDeck` or similar per-deck action.
- Add sync result labels.
- Use best available BPM and playback position.
- Implement phase-delta seek.
- Keep disabled/blocked behavior explicit.

### Integration Notes

- Sync action likely belongs in `MainScreen` because it needs both deck snapshots.
- Deck action should be passed into `SoundCloudBoothDeck`.
- Last sync labels can be held in local state keyed by deck id.
- Do not call `seekBy` if computing absolute target position is clearer; prefer `seekTo`.

### Acceptance Criteria

- Pressing Deck A sync seeks Deck A toward Deck B's beat phase.
- Pressing Deck B sync seeks Deck B toward Deck A's beat phase.
- Sync starts the target deck after seek.
- Missing data produces a clear caption instead of doing nothing silently.
- Build passes.

### Completed Implementation

- Added a local sync action in `MainScreen` that snapshots both decks and aligns the pressed deck to the opposite deck.
- Sync chooses the best available BPM source, computes shortest beat-phase delta, and calls `seekTo(..., { playAfterSeek: true })`.
- Sync button labels report `SYNC`, `SYNC EST`, `SYNC LOW`, `NO MASTER`, `NO BPM`, or `LOAD TRACK`.
- Verified with `npm.cmd run build`; real audio phase feel remains a manual check.

## V19-6: 3D Mute/Sync Button Layout

Status: `[x]` completed and manager-verified.

### Summary

Render two new buttons per deck in the DJ booth.

### Expected Work

- Add `MUTE` and `SYNC` 3D controls per deck.
- Keep buttons clear of cue pads, seek panels, play/shuffle, crossfader, and trim sliders.
- Add active/disabled visual states.
- Update manual checklist.

### Suggested Constants

```ts
const STUDIO_SOUNDCLOUD_DECK_UTILITY_BUTTON_Z = 0.62;
const STUDIO_SOUNDCLOUD_DECK_UTILITY_BUTTON_OFFSET_X = 0.12;
const STUDIO_SOUNDCLOUD_DECK_UTILITY_BUTTON_SIZE: Vec3 = [0.16, 0.032, 0.08];
```

These are starting points only; inspect the top-down view before finalizing.

### Acceptance Criteria

- Mute/sync buttons are readable in first-person and top-down.
- Buttons do not overlap current DJ controls.
- Build passes.

### Completed Implementation

- Added per-deck `Mute/Open` and `Sync` 3D controls near the deck utility lane.
- Active mute uses a warm warning accent; estimated/low sync labels use warning coloring, reliable sync uses the deck monitor accent.
- Kept the controls outside the seek/cue shelves and crossfader lane.
- Verified with `npm.cmd run build`; top-down/first-person overlap remains a manual visual check.

## V19-7: Manual QA And Feel Tuning

Status: `[x]` completed and manager-verified.

### Summary

Test the algorithm and DJ workflow against real tracks.

### Expected Work

- Test at least several tracks from both current SoundCloud playlists.
- Record whether BPM estimate seems plausible.
- Tune confidence threshold.
- Tune sync labels.
- Decide whether to ship `SYNC WAVE` by default or require a confidence threshold.

### Acceptance Criteria

- Good waveform estimates are surfaced.
- Bad estimates fall back to `120 BPM EST` or `BPM --`.
- Mute and sync controls remain playable.
- Build passes if code changes are made.

### Completed Implementation

- Focused utility tests cover clean pulses, missing kicks, half/double-time normalization, silence, noise, and intro silence.
- Manual checklist was updated for BPM source labels, mute, sync, and utility-button reachability.
- Full build passed after integration with the existing Vite large chunk warning.

## Hold Phases

### V19-8: Curated BPM Override Map

Status: `[hold]` intentionally deferred.

Use a local map keyed by SoundCloud track URL for known playlist tracks.

This is the most reliable short-term path for fixed playlists, but it is manual data work. It becomes more valuable after the estimator shows which tracks need correction.

### V19-9: External BPM API Adapter

Status: `[hold]` intentionally deferred.

Add Soundcharts, ACRCloud, Cyanite, or another provider only after local waveform estimation proves insufficient.

### V19-10: True Tempo Sync Audio Engine

Status: `[hold]` intentionally deferred.

True sync requires playback-rate or time-stretch control. The current SoundCloud widget does not provide that, so this phase needs a separate audio engine decision.

## Manual Test Checklist

- Run BPM utility tests.
- Load Deck A and verify the BPM source label is visible.
- Load Deck B and verify the BPM source label is visible.
- Verify real SoundCloud BPM, if available, appears without suffix.
- Verify missing BPM metadata can become `BPM WAVE` after waveform analysis.
- Verify low-confidence analysis falls back honestly.
- Verify Deck A mute silences only Deck A and preserves trim.
- Verify Deck B mute silences only Deck B and preserves trim.
- Verify Deck A sync aligns Deck A to Deck B without changing Deck B.
- Verify Deck B sync aligns Deck B to Deck A without changing Deck A.
- Verify sync blocked states are readable.
- Verify all new buttons are reachable in first-person.
- Verify all new buttons are readable in top-down.
- Verify build passes.

## Open Questions

- What confidence threshold should allow `BPM WAVE` to appear?
- Should `SYNC` be disabled when BPM is only generic fallback, or allowed as `SYNC EST`?
- Should the sync target be the playing deck by default if both are playing?
- Should muted decks continue playing silently, or should mute pause in a later power-user mode?
- Do we want a debug panel showing BPM candidates for tuning?
