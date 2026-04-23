# Secret 3D World Vision 21 - SoundCloud BPM Tools And Trusted Sync

## Purpose

Vision 21 separates BPM discovery from deck sync.

The SoundCloud DJ booth should stop treating `SYNC` as a magic button that silently chooses a BPM. Instead, each deck should have an accepted BPM shown on its monitor. The user can populate that BPM with different finder methods, manually trim it by ear, and then press `SYNC` knowing exactly which value the math will use.

This makes the booth feel more like DJ hardware: find or set tempo first, then sync against the displayed tempo.

## Product Goal

Users can prepare each deck BPM before syncing.

Desired behavior:

- Each deck has a visible accepted BPM value.
- Each deck monitor clearly labels the BPM source:
  - `META` for SoundCloud-provided BPM.
  - `WAVE` for waveform loudness analysis.
  - `LENGTH` for song-duration/bar-count estimate.
  - `MANUAL` for user-trimmed BPM.
  - `BPM --` when no trusted BPM is set.
- BPM finder buttons are separate from the `SYNC` button.
- The `SYNC` button uses only the deck monitor BPM values.
- If either deck has no accepted BPM, sync returns `NO BPM`.
- The user can trim each deck BPM up/down with small precision controls.
- The sync math should be clear enough that later we can add beat sync, bar sync, and phrase sync modes.

## Current Problem

The previous flow mixed three concerns:

1. Discover BPM.
2. Display BPM.
3. Sync decks.

That caused confusing behavior:

- The booth could display a generic `120 BPM EST`.
- Sync could use that placeholder.
- The user could press `SYNC` without knowing whether the BPM was true, guessed, or missing.
- If the waveform detector failed, everything appeared to become `120`, which made the sync button feel fake.

Vision 21 fixes this by making BPM explicit, user-controlled, and source-labeled.

## Current Code Facts

Current facts from code review on 2026-04-22:

- `src/hooks/useSoundCloudPlayer.ts` owns SoundCloud widget state per deck.
- `JukeboxDisplayState.currentTrackBpmState` now reports true SoundCloud BPM, waveform BPM, or `BPM --`.
- The generic fake `120 BPM EST` fallback has been removed from the active hook path.
- `src/lib/soundcloud/bpmAnalysis.ts` already contains a pure waveform BPM estimator.
- The waveform estimator already includes a weak song-length grid score via duration and beat length.
- `src/screens/MainScreen.tsx` currently owns per-deck sync labels and the sync action.
- `syncSoundCloudDeckToSource()` currently phase-aligns by seeking, not by changing playback speed.
- `SoundCloudSeekActions.seekTo(positionMs, options?)` is available per deck.
- The SoundCloud widget does not expose reliable playback-rate or pitch controls.
- The 3D booth controls are rendered mostly in `src/3d/Level1RecordingStudioRoom.tsx`.
- Mute/sync utility buttons already exist per deck.
- The deck monitor/readout canvases already have room to show source labels and time.

## Design Principle

`SYNC` should never find BPM.

`SYNC` should only consume the BPM values the deck monitors already show.

The user flow should be:

```text
Load Deck A
Find or set Deck A BPM
Load Deck B
Find or set Deck B BPM
Press SYNC on the deck you want to move
```

If BPM is wrong, the user adjusts the deck BPM and tries again.

## Deck BPM Model

Add an accepted BPM model per deck.

Suggested type:

```ts
type SoundCloudAcceptedBpmSource =
  | "meta"
  | "wave"
  | "length"
  | "manual"
  | "none";

interface SoundCloudAcceptedBpmState {
  bpm: number | null;
  source: SoundCloudAcceptedBpmSource;
  confidence: number;
  label: string;
  updatedAt: number;
}
```

Display examples:

```text
A 128.0 BPM META
A 127.5 BPM WAVE
A 126.0 BPM LENGTH
A 127.8 BPM MANUAL
A BPM --
```

Manual trim should preserve the last value and switch source to `MANUAL`.

For example:

```text
127.5 BPM WAVE
BPM +0.1
127.6 BPM MANUAL
```

## BPM Finder Buttons

Each deck should gain a compact BPM tools area.

Recommended first buttons:

- `META`: load SoundCloud metadata BPM into accepted BPM.
- `WAVE`: run or accept waveform BPM into accepted BPM.
- `LENGTH`: estimate BPM from duration and common bar/phrase counts.
- `BPM -`: decrement accepted BPM.
- `BPM +`: increment accepted BPM.
- `CLEAR`: clear accepted BPM.

Optional later controls:

- `-1` and `+1` coarse trim.
- `-0.1` and `+0.1` fine trim.
- Hold-to-repeat trim.
- `TAP`: user taps tempo manually.
- `HALF` / `DOUBLE`: quickly correct half-time or double-time guesses.

## BPM Finder Methods

### META

Use SoundCloud `sound.bpm` if present.

Rules:

- If metadata BPM exists, set accepted BPM source to `META`.
- If missing, button feedback should say `NO META`.
- Do not fabricate a metadata BPM.

### WAVE

Use waveform loudness BPM analysis.

Rules:

- Use `estimateBpmFromWaveform()`.
- If confidence clears threshold, set source to `WAVE`.
- If confidence is low, either refuse with `LOW CONF` or allow with a warning label.
- Keep analysis bounded and avoid running repeatedly during render.

Recommended first behavior:

- Precompute or memoize candidate once per track waveform.
- Pressing `WAVE` accepts the already-computed result.
- If no result exists, show `NO WAVE`.

### LENGTH

Estimate BPM from total track length fitting common musical beat counts.

Basic equation:

```text
beatMs = durationMs / totalBeats
bpm = 60000 / beatMs
```

Candidate beat counts in 4/4:

```text
64 beats    = 16 bars
128 beats   = 32 bars
256 beats   = 64 bars
512 beats   = 128 bars
768 beats   = 192 bars
1024 beats  = 256 bars
1536 beats  = 384 bars
2048 beats  = 512 bars
```

For each beat count:

```text
bpm = 60000 * beatCount / durationMs
```

Keep candidates in a useful DJ range:

```text
70 BPM <= bpm <= 180 BPM
```

Then rank candidates by:

- Closeness to common electronic ranges like `90..150`.
- Closeness to waveform BPM if available.
- Closeness to metadata BPM if available.
- Preference for phrase counts that are common in real tracks.
- Avoiding suspicious exact defaults like `120` unless supported by another signal.

Important: `LENGTH` is a guess.

It should be labeled honestly and should not pretend to be beat detection. It can be very useful when the song is arranged in clean phrases, but it can be fooled by intros, outros, silence, live edits, and inaccurate SoundCloud duration.

### MANUAL

User trim should be the highest-trust interactive fallback.

Rules:

- If no BPM exists and user presses `BPM +`, start from a reasonable seed:
  - native metadata if available.
  - waveform result if available.
  - length result if available.
  - otherwise `120.0`, but label immediately as `MANUAL`.
- Fine trim step: `0.1 BPM`.
- Coarse trim later: `1.0 BPM`.
- Clamp range: `60..220` or `70..180` for first pass.

Manual trim matters because the user can correct what the algorithm cannot know.

## Sync Model

Sync should consume accepted BPM values only.

Button meaning:

```text
SYNC on Deck A => move Deck A to align with Deck B
SYNC on Deck B => move Deck B to align with Deck A
```

Sync preconditions:

- Target deck loaded.
- Source deck loaded.
- Target deck accepted BPM exists.
- Source deck accepted BPM exists.
- Both decks have valid playback duration.

If missing:

```text
NO BPM
NO MASTER
LOAD TRACK
```

## Beat Sync Math

First implementation should remain seek-based beat phase sync.

Use each deck's own accepted BPM:

```text
sourceBeatMs = 60000 / sourceBpm
targetBeatMs = 60000 / targetBpm

sourceBeatIndex = sourcePositionMs / sourceBeatMs
targetBeatIndex = targetPositionMs / targetBeatMs
sourcePhase = fractionalPart(sourceBeatIndex)
targetPhase = fractionalPart(targetBeatIndex)
phaseDeltaBeats = shortestCircularDelta(sourcePhase, targetPhase)
targetSeekDeltaMs = phaseDeltaBeats * targetBeatMs
targetNextPosition = targetPositionMs + targetSeekDeltaMs
```

This aligns beat phase without pretending to time-stretch the audio.

## Bar And Phrase Sync Direction

Later sync modes can use bars and phrases.

Bar sync:

```text
barBeats = 4
sourceBarPhase = (sourcePositionMs / sourceBeatMs) % barBeats
targetBarPhase = (targetPositionMs / targetBeatMs) % barBeats
```

Phrase sync:

```text
phraseBeats = 16 or 32
sourcePhrasePhase = (sourcePositionMs / sourceBeatMs) % phraseBeats
targetPhrasePhase = (targetPositionMs / targetBeatMs) % phraseBeats
```

Recommended order:

1. Beat sync.
2. Bar sync.
3. Phrase sync.

Beat sync is easiest to trust first.

## UI Layout Direction

The booth already has a lot of buttons, so BPM tools should be compact.

Recommended V1 layout per deck:

```text
[ META ] [ WAVE ] [ LENGTH ]
[ BPM- ] [ BPM+ ] [ CLEAR  ]
```

Placement options:

- Near each deck monitor, because these buttons affect the displayed BPM.
- Or below the existing MUTE/SYNC row if there is enough player-facing space.

Avoid mixing BPM tools into cue controls. Cue tools tune time positions; BPM tools tune tempo.

## Monitor Feedback

Deck monitor should show:

```text
DECK A SOUNDCLOUD
TIME 1:23 / 3:45
BPM 127.8 MANUAL
SYNC READY
```

Possible transient labels:

```text
NO META
NO WAVE
LOW CONF
LENGTH SET
BPM SET
CLEARED
SYNCED
NO BPM
```

The top deck monitor may continue to summarize both decks:

```text
A 127.8 BPM MANUAL
B 128.0 BPM WAVE
```

## Implementation Prep

Recommended new/edited files:

```text
src/lib/soundcloud/bpmLengthEstimate.ts
src/lib/soundcloud/bpmLengthEstimate.test.ts
src/hooks/useSoundCloudPlayer.ts
src/screens/MainScreen.tsx
src/3d/soundCloudBooth.ts
src/3d/Level1RecordingStudioRoom.tsx
docs/3d/manual-test-checklist.md
changelog.md
```

Implementation boundary suggestions:

- BPM length estimator worker:
  - `src/lib/soundcloud/bpmLengthEstimate.ts`
  - `src/lib/soundcloud/bpmLengthEstimate.test.ts`
- Hook/model worker:
  - `src/hooks/useSoundCloudPlayer.ts`
- Sync/controller worker:
  - `src/screens/MainScreen.tsx`
  - `src/3d/soundCloudBooth.ts`
- 3D UI worker:
  - `src/3d/Level1RecordingStudioRoom.tsx`
- Manager:
  - docs, changelog, integration review, build/test verification.

Do not have multiple workers edit `Level1RecordingStudioRoom.tsx` at the same time.

## Phase Status

Status marker meanings:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed and manager-verified
- `[hold]` intentionally deferred

Only one phase should be `[~]` at a time.

## Phase Plan

- [x] V21-0: Prep Types And State Ownership.
- [x] V21-1: Length BPM Estimator.
- [x] V21-2: Accepted BPM State And Actions.
- [x] V21-3: Trusted Sync Uses Accepted BPM.
- [x] V21-4: 3D BPM Tool Buttons.
- [x] V21-5: Monitor Labels And User Feedback.
- [x] V21-6: Tests, Build, And Manual QA Checklist.
- [hold] V21-7: Bar Sync Mode.
- [hold] V21-8: Phrase Sync Mode.
- [hold] V21-9: Tap Tempo Input.

## V21-0: Prep Types And State Ownership

Status: `[x]` completed and manager-verified.

### Summary

Define where accepted BPM lives and how it moves from finder methods into sync.

### Implementation Spec

- Add accepted BPM type.
- Decide whether accepted BPM state lives in `useSoundCloudPlayer()` or `MainScreen`.
- Recommended first pass: keep accepted BPM in `useSoundCloudPlayer()` so each deck owns its own tempo controls.
- Expose accepted BPM through `JukeboxDisplayState`.
- Expose BPM actions through SoundCloud player actions.

### Acceptance Criteria

- Each deck can represent accepted BPM separately from detected/native BPM.
- Existing monitor labels can still access raw BPM state.
- No sync behavior changes yet.

### Completed Implementation

- Added accepted BPM state/source typing in `useSoundCloudPlayer()`.
- Exposed accepted BPM through `JukeboxDisplayState`.
- Exposed BPM accept/trim/clear actions through a dedicated `SoundCloudBpmActions` surface.

## V21-1: Length BPM Estimator

Status: `[x]` completed and manager-verified.

### Summary

Create a pure duration-based BPM estimator.

### Implementation Spec

- Add `src/lib/soundcloud/bpmLengthEstimate.ts`.
- Input:
  - `durationMs`
  - optional metadata BPM.
  - optional waveform BPM.
- Output:
  - best BPM candidate.
  - confidence.
  - candidate list for debug.
  - selected beat/bar count.
- Use common phrase beat counts.
- Clamp to useful BPM range.
- Do not return a BPM for invalid or tiny durations.

### Acceptance Criteria

- Unit tests cover common durations and invalid inputs.
- Estimator never claims high confidence unless duration maps to a plausible musical phrase.
- Output label can become `BPM LENGTH`.

### Completed Implementation

- Added `src/lib/soundcloud/bpmLengthEstimate.ts`.
- Added `src/lib/soundcloud/bpmLengthEstimate.test.ts`.
- Worker verification passed with `npx.cmd tsx src/lib/soundcloud/bpmLengthEstimate.test.ts`.

## V21-2: Accepted BPM State And Actions

Status: `[x]` completed and manager-verified.

### Summary

Let each deck set, trim, and clear accepted BPM.

### Implementation Spec

- Add actions:
  - `acceptMetadataBpm()`
  - `acceptWaveformBpm()`
  - `acceptLengthBpm()`
  - `adjustAcceptedBpm(delta)`
  - `clearAcceptedBpm()`
- Manual trim converts source to `MANUAL`.
- If user trims from empty BPM, seed from best available value or `120.0 MANUAL`.
- Reset accepted BPM when track changes unless the new track has the same URL.

### Acceptance Criteria

- User can set BPM from each finder method.
- User can fine trim BPM.
- User can clear BPM.
- Track changes do not keep stale BPM from the previous song.

### Completed Implementation

- Added `META`, `WAVE`, and `LENGTH` accept actions.
- Added `BPM-`, `BPM+`, and `CLEAR` action behavior.
- Manual trim converts the accepted BPM source to `MANUAL`.
- Track changes clear old accepted BPM, with metadata auto-accepted once per track when available.

## V21-3: Trusted Sync Uses Accepted BPM

Status: `[x]` completed and manager-verified.

### Summary

Make sync consume monitor BPM only.

### Implementation Spec

- Update sync deck snapshot to carry accepted BPM.
- Remove fallback BPM choices from sync.
- Require source and target accepted BPM.
- Use per-deck beat length in phase math.
- Preserve current seek-based sync behavior.

### Acceptance Criteria

- Sync returns `NO BPM` if either deck BPM is unset.
- Sync uses manual BPM when user trims it.
- Sync no longer depends directly on `currentTrackBpmState`.

### Completed Implementation

- Updated sync snapshots to carry accepted BPM state.
- Removed detector/fallback BPM selection from sync.
- Updated seek-based beat phase math to use each deck's own accepted BPM.

## V21-4: 3D BPM Tool Buttons

Status: `[x]` completed and manager-verified.

### Summary

Add per-deck BPM control buttons to the booth.

### Implementation Spec

- Add compact buttons per deck:
  - `META`
  - `WAVE`
  - `LENGTH`
  - `BPM -`
  - `BPM +`
  - `CLEAR`
- Place near deck monitor or in a clean player-facing lane.
- Reuse existing `StudioSoundCloudUtilityButton` patterns.
- Keep hit boxes clear of cue, seek, mute, sync, and platter controls.

### Acceptance Criteria

- Buttons are readable from normal DJ standing position.
- Buttons trigger correct deck actions.
- Buttons do not overlap existing controls.

### Completed Implementation

- Added six BPM buttons per deck: `Meta`, `Wave`, `Len`, `BPM-`, `BPM+`, and `Clear`.
- Positioned them in compact two-row clusters near each deck's player-facing utility area.
- Wired buttons to the new BPM action surface.

## V21-5: Monitor Labels And User Feedback

Status: `[x]` completed and manager-verified.

### Summary

Make the accepted BPM and its source obvious.

### Implementation Spec

- Deck monitors display accepted BPM and source.
- Top deck monitor can summarize both decks.
- Add transient result labels for failed finder actions and sync actions.
- Keep text short enough for 3D readability.

### Acceptance Criteria

- User can tell whether BPM came from `META`, `WAVE`, `LENGTH`, or `MANUAL`.
- Failed finder actions produce useful feedback.
- Sync status does not hide BPM source.

### Completed Implementation

- Deck readouts and the top deck monitor now display accepted BPM labels.
- BPM actions report short feedback such as `META SET`, `NO WAVE`, `LENGTH SET`, `BPM UP`, and `CLEARED`.
- Sync now reports `SYNCED`, `SYNC LOW`, `NO BPM`, `NO MASTER`, or `LOAD TRACK`.

## V21-6: Tests, Build, And Manual QA Checklist

Status: `[x]` completed and manager-verified.

### Summary

Verify estimator, sync behavior, and 3D controls.

### Implementation Spec

- Add length estimator tests.
- Keep waveform estimator tests passing.
- Run production build.
- Update manual test checklist.

### Acceptance Criteria

- `npx.cmd tsx src/lib/soundcloud/bpmLengthEstimate.test.ts` passes.
- `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` passes.
- `npm.cmd run build` passes.
- Manual QA checklist includes BPM finder and sync flows.

### Completed Implementation

- Updated `docs/3d/manual-test-checklist.md` for accepted BPM, BPM tools, and trusted sync behavior.
- Verification passed:
  - `npx.cmd tsx src/lib/soundcloud/bpmLengthEstimate.test.ts`
  - `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts`
  - `npm.cmd run build`

## Deferred Ideas

### V21-7: Bar Sync Mode

Add a toggle where sync aligns to bar phase instead of beat phase.

### V21-8: Phrase Sync Mode

Add 16-beat or 32-beat phrase sync once beat/bar sync feels reliable.

### V21-9: Tap Tempo Input

Let users tap a deck tempo manually from the booth.

## Open Questions

- Should accepted BPM live in `useSoundCloudPlayer()` or in `MainScreen` deck wrapper state?
- Should length BPM be allowed as sync-ready by default, or should it show a warning first?
- Do we want one BPM trim step (`0.1`) or both fine/coarse steps in V1?
- Should `WAVE` run automatically on track load or only when pressed?
- Should clearing BPM reset to `BPM --` even if metadata exists, or should metadata remain suggested but unaccepted?

## Recommended First-Pass Decisions

- Accepted BPM lives inside `useSoundCloudPlayer()`.
- `META`, `WAVE`, and `LENGTH` are explicit accept buttons.
- No automatic accepted BPM unless SoundCloud metadata exists.
- Manual trim step is `0.1 BPM`.
- Sync requires accepted BPM on both decks.
- `LENGTH` is allowed for sync, but monitor labels it as `LENGTH`.
- Waveform analysis can compute in the background, but pressing `WAVE` is what accepts it.
- Build beat sync first; defer bar/phrase sync.
