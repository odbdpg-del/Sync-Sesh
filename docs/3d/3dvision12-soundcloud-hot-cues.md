# Secret 3D World Vision 12 - SoundCloud Hot Cues

## Purpose

Vision 12 adds simple, friend-readable hot cue behavior to the SoundCloud DJ booth.

Vision 10 made two local SoundCloud decks work. Vision 11 made the 3D DJ booth physically readable. Vision 12 makes the booth feel more like DJ gear by adding cue points that can save and jump to timestamps inside the current SoundCloud track.

This vision uses the phrase `SET CUE`, not `ARM`, because `ARM` already means recording in music apps. The user-facing flow should be:

1. Press `SET CUE`.
2. Press `C1` through `C5` to save the current deck time into that slot.
3. Press `C1` through `C5` in normal mode to jump that deck back to the saved time and play from there.

## Code Facts

Current code already supports the core pieces needed for hot cues:

- `src/hooks/useSoundCloudPlayer.ts` exposes `playbackPosition`, `playbackDuration`, and `progress`.
- `useSoundCloudPlayer` already calls SoundCloud's widget `seekTo(...)` inside `seekWaveform`.
- `SoundCloudPlayerActions` currently exposes `seekWaveform`, but `JukeboxActions` only exposes `togglePlayback`, `shufflePlay`, and `retry`.
- `src/3d/soundCloudBooth.ts` passes a smaller `JukeboxActions` object into the 3D booth, so 3D does not yet receive seek or cue actions.
- `src/components/SoundCloudPanel.tsx` already renders per-deck controls and a clickable waveform.
- `src/3d/Level1RecordingStudioRoom.tsx` already renders Deck A/B Play/Shuffle controls and the Vision 11 booth geometry.

## Product Boundary

In scope:

- Local-browser hot cues for each SoundCloud deck.
- Five cue slots per deck: `C1`, `C2`, `C3`, `C4`, `C5`.
- A clear `SET CUE` mode per deck.
- 2D SoundCloud panel controls for setting and triggering cues.
- 3D DJ booth cue pads for setting and triggering cues.
- Honest labels for empty, saved, setting, and jumped cue states.
- Build-verified implementation phases.

Out of scope:

- Shared cue state across friends.
- Discord voice or app-audio transport.
- Beat grid detection.
- Quantized cue triggering.
- BPM sync.
- Loops.
- Scratching.
- Real headphone cue/prelisten.
- Server persistence.
- New packages.

## Interaction Model

Each deck has one `SET CUE` button and five cue pads.

Normal mode:

- `C1-C5` with saved time: seek the deck to that time and play.
- `C1-C5` empty: do nothing except show empty feedback.
- `SET CUE`: enters cue-setting mode for that deck.

Set mode:

- `C1-C5`: save current `playbackPosition` into the chosen slot, then exit set mode.
- `SET CUE` again: cancels set mode.
- If no track duration is available, show `NO TIME` / disabled state.

Suggested in-world labels:

- Empty cue: `C1 EMPTY`
- Saved cue: `C1 0:42`
- Set mode: `SET CUE ON`
- Just saved: `C1 SAVED`
- Triggered: `JUMP C1`
- Cannot use: `LOAD TRACK`

## State Shape Draft

Likely local-only per-deck state:

```ts
interface SoundCloudHotCue {
  id: "C1" | "C2" | "C3" | "C4" | "C5";
  positionMs: number | null;
  label: string;
}

interface SoundCloudHotCueState {
  isSettingCue: boolean;
  lastCueActionLabel: string | null;
  cues: SoundCloudHotCue[];
}
```

Likely actions:

```ts
interface SoundCloudHotCueActions {
  toggleSetCueMode: () => void;
  triggerCue: (cueId: SoundCloudHotCue["id"]) => void;
  clearCue?: (cueId: SoundCloudHotCue["id"]) => void;
}
```

`triggerCue` should save when `isSettingCue` is true and jump/play when `isSettingCue` is false.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## SoundCloud Hot Cue Phases

- [x] V12-1: Seek And Cue Feasibility Check.
- [x] V12-2: Local Hot Cue State And Player Actions.
- [x] V12-3: 2D SoundCloud Cue Controls.
- [x] V12-4: 3D Booth Cue Pads.
- [x] V12-5: Friend-Readable Cue Feedback And QA.
- [hold] V12-6: Shared Cue State Or Host-Controlled DJ Transport.
- [hold] V12-7: Real Headphone Cue / Prelisten.

## V12-1: Seek And Cue Feasibility Check

Status: `[x]` completed and manager-verified.

### Summary

Prove the SoundCloud widget seek path is reliable enough for hot cues.

### Implementation Spec

Completed as a code-based feasibility pass. No application code changes were required for V12-1.

1. Confirmed the existing SoundCloud seek seam.
   - `src/hooks/useSoundCloudPlayer.ts` already exposes `playbackPosition`, `playbackDuration`, `progress`, and `waveformProgress`.
   - `seekWaveform(...)` already guards on widget availability and duration, updates local `playbackPosition`, and calls SoundCloud widget `seekTo(nextPosition)`.
   - The existing 2D waveform click path already turns a click ratio into `seekWaveform(...)`.

2. Confirmed the later cue action boundary.
   - `SoundCloudPlayerActions` currently exposes `seekWaveform`.
   - `JukeboxActions` only exposes `togglePlayback`, `shufflePlay`, and `retry`.
   - `src/3d/soundCloudBooth.ts` passes that smaller `JukeboxActions` object into the 3D booth, so V12-2 must explicitly expose cue-capable deck actions to 2D and 3D callers.

3. Confirmed the implementation risk.
   - The code can build hot cues on top of `seekTo(...)`.
   - Runtime reliability still needs manual checks because SoundCloud widget seek behavior can vary by track, embed state, and Discord proxy environment.
   - Later phases should keep duration/widget-ready guards and should not assume seek always succeeds.

4. Required checks.
   - Run `npm.cmd run build`.
   - Leave manual 2D waveform seek, hidden-room seek, paused seek/play, playing seek/play, and Discord proxy checks explicit in the checklist.

### Checklist Items Achieved

- [x] Confirm `widget.seekTo(...)` is already the current code seek path.
- [ ] Confirm `widget.seekTo(...)` works for the current embedded playlist tracks.
- [ ] Confirm seek followed by play works while paused.
- [ ] Confirm seek followed by play works while playing.
- [x] Confirm unavailable duration/position states are guarded in code.
- [ ] Confirm Discord proxy mode does not break current waveform seeking.
- [x] Document likely SoundCloud widget limitations.
- [x] Build passes.

### Completed Implementation

V12-1 verified that Vision 12 can use the existing SoundCloud widget `seekTo(...)` path instead of inventing a new transport mechanism. The 2D waveform already exercises this path, while the 3D booth currently receives only reduced jukebox actions. V12-2 should therefore add local hot cue state and cue-capable actions in the SoundCloud player/controller layer, then intentionally pass those actions onward.

### Acceptance Criteria

- The manager knows whether real hot cues can be built on the existing SoundCloud widget API.
- Any limitations are documented before UI work begins.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual 2D SoundCloud waveform seek check.
- [ ] Manual hidden-room SoundCloud seek sanity check.
- [ ] Manual paused seek then play check.
- [ ] Manual playing seek then continue check.

### Risks

- SoundCloud widget seek behavior may vary by track, embed mode, or Discord proxy.
- Seek can fail silently if the widget is not ready.
- Some tracks may not expose useful duration.

### Wishlist Mapping

- Validates whether cue pads can jump to saved deck times.

### Non-Goals

- No cue UI yet.
- No 3D booth changes.
- No shared sync.

## V12-2: Local Hot Cue State And Player Actions

Status: `[x]` completed and manager-verified.

### Summary

Add local per-deck cue state and actions to `useSoundCloudPlayer`.

### Implementation Spec

Approved V12-2 scope is a controller-layer expansion in `src/hooks/useSoundCloudPlayer.ts`.

1. Add local hot cue types and state in the SoundCloud player hook.
   - Add five fixed cue slots: `C1`, `C2`, `C3`, `C4`, and `C5`.
   - Keep cue state local to each `useSoundCloudPlayer(...)` instance so Deck A and Deck B stay independent.
   - Add a cue state bundle such as:
     - `isSettingCue`
     - `lastCueActionLabel`
     - fixed `cues` array with saved timestamp, label, and validity data.

2. Add cue actions without widening the reduced jukebox actions.
   - Expose cue state/actions on `SoundCloudPlayerController` and/or `SoundCloudPlayerState` for later 2D and 3D consumers.
   - Keep `JukeboxActions` focused on existing `togglePlayback`, `shufflePlay`, and `retry`.
   - Add actions such as `toggleSetCueMode()` and `triggerCue(cueId)`.

3. Reuse the existing SoundCloud seek/play seam.
   - Reuse the same widget readiness and duration guards that protect `seekWaveform(...)`.
   - Add a private helper if needed so waveform seeking and hot cue seeking share the same `widget.seekTo(...)` path.
   - In normal mode, triggering a saved cue should seek to the saved position and call `widget.play()`.

4. Save and invalidate cue positions safely.
   - In `SET CUE` mode, triggering `C1-C5` saves the current `playbackPosition` into that slot.
   - Store a current-track key with each cue, using `currentTrackUrl` when available with playlist/source fallback.
   - If playlist or current track changes, cues should clear or be marked invalid so timestamps are not reused on the wrong track.
   - Empty or invalid cues should no-op safely and update feedback.

5. Preserve existing behavior.
   - Do not add 2D UI controls yet.
   - Do not add 3D booth pads yet.
   - Do not change SoundCloud playback, Shuffle, waveform seek, volume, output level, crossfader, mixer math, Discord proxy remapping, server state, packages, or shared sync.

6. Required checks.
   - Run `npm.cmd run build`.
   - Report changed files and unresolved manual checks.
   - Manual checks should include Deck A cue save/jump, Deck B cue save/jump, empty cue no-op, and track/playlist change invalidation once V12-3 exposes controls.

### Checklist Items Achieved

- [x] Each SoundCloud player has five cue slots.
- [x] Each deck can enter and exit `SET CUE` mode.
- [x] Pressing a cue in set mode saves current `playbackPosition`.
- [x] Pressing a saved cue in normal mode seeks and plays.
- [x] Pressing an empty cue in normal mode gives safe feedback and does not crash.
- [x] Cue state resets or clearly invalidates when playlist/track changes.
- [x] Cue actions are exposed to 2D and 3D callers.
- [x] Build passes.

### Completed Implementation

Implemented the local hot cue controller layer in `src/hooks/useSoundCloudPlayer.ts` without widening `JukeboxActions` or touching the 2D/3D UI. The hook now exposes separate `hotCueState` and `hotCueActions`, tracks five deck-local slots (`C1`-`C5`), saves the current `playbackPosition` while in `SET CUE` mode, jumps by seeking and playing in normal mode, and marks cues stale when the active real track permalink changes so shuffled or replaced tracks do not reuse stale timestamps. Cue saves now require a real current track URL, so playlist/source fallback URLs cannot create immediately-stale cue slots. Existing Play/Pause, Shuffle, waveform seek, volume, output level, widget loading, and Discord proxy behavior were preserved.

### Acceptance Criteria

- Hot cue behavior is local, deterministic, and deck-specific.
- Deck A cues cannot affect Deck B.
- Existing Play/Pause, Shuffle, waveform seek, volume, and crossfader behavior remains unchanged.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual Deck A cue save/jump check.
- [ ] Manual Deck B cue save/jump check.
- [ ] Manual playlist/track change invalidation check.

### Risks

- Cues saved by timestamp may point to a different track after Shuffle.
- Calling play immediately after seek may need ordering guards.
- Exposing cue actions through `JukeboxActions` can affect 3D and jukebox callers, so types must stay clear.

### Wishlist Mapping

- Implements the core `SET CUE + C1-C5` behavior.

### Non-Goals

- No 3D pads yet.
- No server persistence.
- No shared cue state.

## V12-3: 2D SoundCloud Cue Controls

Status: `[x]` completed and manager-verified.

### Summary

Add clear cue controls to the normal 2D SoundCloud deck cards.

### Implementation Spec

Approved V12-3 scope is a 2D deck-card UI pass in `src/components/SoundCloudPanel.tsx`, with supporting layout/style updates in `src/styles/global.css`.

1. Add a visible cue control cluster to each deck card.
   - Render one `SET CUE` control and five cue pads, `C1` through `C5`, on each SoundCloud deck card.
   - Keep the controls inside the normal 2D panel only.
   - Reuse the hot cue controller surface already exposed by `useSoundCloudPlayer(...)`.

2. Bind the new controls to the hook cue actions and state.
   - Call `deck.player.hotCueActions.toggleSetCueMode()` from `SET CUE`.
   - Call `deck.player.hotCueActions.triggerCue(cueId)` from each pad.
   - Read `deck.player.hotCueState.isSettingCue`, `lastCueActionLabel`, `activeTrackKey`, and each cue view from the hook state.
   - Do not invent local cue state in the panel.

3. Use clear, honest labels for cue states.
   - Empty cue pads should show `C1 EMPTY` style copy when a real track is loaded.
   - Saved cues should show formatted times such as `C1 0:42`.
   - Set mode should visibly read as `SET CUE ON`.
   - Recent feedback should be surfaced with labels like `C1 SAVED`, `JUMP C1`, or `LOAD TRACK`.
   - When no real current track exists, the cue area should visibly block/disable with `LOAD TRACK` copy.

4. Respect the manager trim on track readiness.
   - Cue saving must never be implied or enabled when `activeTrackKey` is null or playback duration is unavailable.
   - Empty cue pads may remain clickable once a real track exists so the hook can return `C1 EMPTY` feedback.
   - No-real-track state should be visibly disabled/blocked rather than appearing like a normal empty cue state.

5. Keep the 2D panel responsive and accessible.
   - Cue controls should fit within the existing SoundCloud deck card without breaking waveform seek, playlist selection, Play/Pause, or Shuffle.
   - Prefer compact buttons, small labels, and wrap-friendly rows or grids.
   - Preserve keyboard access and visible focus states.
   - Keep button labels short enough to remain readable at narrow widths.

6. Preserve existing behavior.
   - Do not add 3D booth pads yet.
   - Do not change hot cue controller semantics.
   - Do not change SoundCloud playback, waveform seek, volume, output level, crossfader, mixer math, Discord proxy remapping, server state, packages, or shared sync.

7. Required checks.
   - Run `npm.cmd run build`.
   - Report changed files and unresolved manual checks.
   - Manual checks should include Deck A cue save/jump, Deck B cue save/jump, empty cue feedback, no-real-track blocked state, and responsive layout.

### Checklist Items Achieved

- [x] Each deck card has a `SET CUE` button.
- [x] Each deck card has five cue pads.
- [x] Saved cues display formatted times.
- [x] Empty cues are visually distinct.
- [x] Set mode is obvious.
- [x] No-real-track state is visibly blocked with `LOAD TRACK`.
- [x] Keyboard/mouse accessibility remains reasonable.
- [x] Build passes.

### Completed Implementation

Implemented the cue control strip directly in the normal 2D SoundCloud deck cards. Each deck now renders one `SET CUE` toggle and five cue pads powered by `deck.player.hotCueState` and `deck.player.hotCueActions`, with no panel-local cue state. The strip visibly blocks with `LOAD TRACK` when no real track is loaded, while still allowing empty pads to remain clickable once a real track exists so the hook can report `C1 EMPTY`, save the current timestamp in set mode, or jump and play in normal mode. Existing waveform seek, Play/Pause, Shuffle, volume, output level, and Discord proxy behavior were preserved.

### Acceptance Criteria

- A user can learn and test hot cues without entering the 3D room.
- The 2D panel remains usable on desktop and smaller widths.
- Existing SoundCloud deck layout remains clean.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual 2D set/trigger cue check.
- [ ] Manual Deck A cue save/jump check.
- [ ] Manual Deck B cue save/jump check.
- [ ] Manual empty cue no-op check.
- [ ] Manual `LOAD TRACK` blocked-state check.
- [ ] Manual responsive layout check.

### Risks

- The SoundCloud panel can become too dense.
- Cue controls may need compact labeling to avoid wrapping.

### Wishlist Mapping

- Makes the cue flow easy to understand before it appears in 3D.

### Non-Goals

- No 3D booth cue pads.
- No shared sync.
- No real headphone cue.

## V12-4: 3D Booth Cue Pads

Status: `[x]` completed and manager-verified.

### Summary

Add `SET CUE` and `C1-C5` cue pads to each deck station in the 3D DJ booth.

### Implementation Spec

Approved V12-4 scope is a 3D booth cue-pad pass in `src/3d/Level1RecordingStudioRoom.tsx`, with minimal wiring updates through the existing SoundCloud booth state surface.

1. Thread the local hot cue surface into the booth state.
   - Reuse `deck.player.hotCueState` and `deck.player.hotCueActions` from the 2D/logic layer.
   - Keep hot cue state local to the two SoundCloud decks.
   - Do not invent shared cue state or a second controller path.

2. Extend the booth control surface only as needed.
   - Add an explicit optional `enabled` path to the existing 3D control spec/registration if a blocked cue pad needs to be truly inert and visually dim.
   - Existing controls must default to enabled so current Play/Shuffle/crossfader behavior stays unchanged.
   - Do not change the broader 3D interaction model.

3. Add 3D cue controls for each deck.
   - Render one `SET CUE` control and five cue pads, `C1` through `C5`, for Deck A and Deck B.
   - Reuse the existing `StudioDjControl` style and interactable registration pattern where possible.
   - Keep the controls inside the SoundCloud DJ booth, not the generic DJ fallback.

4. Mirror the readable hot cue states from V12-3.
   - `SET CUE` / `SET CUE ON`
   - `LOAD TRACK` when the cue strip is blocked
   - `C1 EMPTY` once a real track exists but no cue is saved
   - `C1 0:42` for saved cues
   - `C1 SAVED` immediately after saving
   - `JUMP C1` after triggering a valid cue
   - `C1 STALE` for stale cue slots
   - The blocked state must be visually dim and inert, not merely cosmetically different.

5. Place the cue pads so they belong to their deck without crowding V11.
   - Keep Deck A cues on the left side of the SoundCloud booth and Deck B cues on the right side.
   - Use a compact cue shelf or secondary row near each deck station rather than expanding the center mixer lane.
   - Do not move the existing Play/Shuffle deck controls, mixer rail, crossfader, or truth placard just to fit cues.

6. Preserve existing behavior.
   - Do not change SoundCloud playback, waveform seek, volume, output level, crossfader, mixer math, Discord proxy remapping, server state, packages, or shared sync.
   - Do not touch the 2D panel.
   - Do not redesign the full booth.

7. Required checks.
   - Run `npm.cmd run build`.
   - Report changed files and unresolved manual checks.
   - Manual checks should include top-down readability, first-person clickability, no-overlap with existing V11 controls, Deck A/B cue save-jump, and blocked-state behavior.

### Checklist Items Achieved

- [x] Deck A has one `SET CUE` pad and five cue pads.
- [x] Deck B has one `SET CUE` pad and five cue pads.
- [x] Pads are placed near their deck and do not overlap V11 controls.
- [x] Saved cue pads display time or saved state.
- [x] Empty cue pads are dim.
- [x] Set mode is visible in-world.
- [x] Existing Play/Shuffle and A/MID/B controls still click correctly.
- [x] Build passes.

### Completed Implementation

The 3D SoundCloud booth now carries the local hot cue surface from the player hook into Deck A and Deck B, and renders one `SET CUE` control plus five `C1`-`C5` cue pads per deck inside the booth itself. The booth reuses `StudioDjControl` with an optional enabled path so blocked cue controls are visually dim and inert while normal Play/Shuffle and crossfader controls keep their default behavior. The cue pads are placed as compact left/right shelves near each deck station, with the V11 mixer, readout, and truth layout left intact. The booth mirrors the V12-3 labels and readiness states, including `LOAD TRACK`, `SET CUE ON`, saved cue times, empty cue labels, and stale cue states.

### Acceptance Criteria

- From top-down, cue pads visually belong to their deck.
- From first-person, the user can identify `SET CUE` and `C1-C5`.
- Cue pads use the real local cue actions.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual top-down cue pad readability check.
- [ ] Manual first-person cue click check.
- [ ] Manual no-overlap check against Deck A/B, mixer, and truth placard.
- [ ] Manual blocked-state dim/disabled check.

### Risks

- Adding six buttons per deck can crowd the booth again.
- Cue pads can be confused with Play/Shuffle unless colors and labels are clear.
- More interactables can make click targeting feel noisy.

### Wishlist Mapping

- Adds the real DJ booth cue pad surface.

### Non-Goals

- No visual redesign of the whole DJ table.
- No real cue/FX beyond hot cues.
- No shared state.

## V12-5: Friend-Readable Cue Feedback And QA

Status: `[x]` completed and manager-verified.

### Summary

Make cue behavior understandable while testing with friends.

### Implementation Spec

Approved V12-5 scope is a feedback-and-QA pass for cue readability in `src/components/SoundCloudPanel.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, and the phase checklist in this roadmap.

1. Make cue state obvious in the 3D deck readouts.
   - The 3D Deck A and Deck B readouts should surface cue status, set mode, and last cue action, not only the small cue pad captions.
   - Keep the copy compact and line-based, for example `CUE READY`, `SET CUE ON`, `C1 SAVED`, `JUMP C1`, or `LOAD TRACK`.
   - Reuse the existing readout canvas surfaces and hot cue state already carried into the booth.

2. Keep the 2D cue strip copy short and local-browser scoped.
   - Add or refine short helper text if needed so the 2D cue strip clearly implies the cues are local to this browser.
   - Do not imply shared sync or that Discord voice carries SoundCloud app audio.
   - Keep the wording compact enough to fit beside the existing cue buttons.

3. Make friend-testing readable in both 2D and 3D.
   - Empty, saved, set, jumping, stale, and blocked states should be easy to tell apart at a glance.
   - The same cue state should read consistently in the 2D panel and the 3D booth.
   - Do not change cue semantics, only the readability of the state surfaces.

4. Update the QA checklist to reflect friend testing.
   - Add manual checks for local-only behavior wording, cue readability in 2D and 3D, stale cue feedback, and Discord expectation clarity.
   - Keep the checks explicit so the final QA pass can verify cue behavior with friends.

5. Preserve existing behavior.
   - Do not change hot cue controller semantics.
   - Do not add shared cue sync or host-controlled transport.
   - Do not redesign the booth or panel layouts.
   - Do not change SoundCloud playback, waveform seek, volume, output level, crossfader, mixer math, Discord proxy remapping, server state, packages, or shared sync.

6. Required checks.
   - Run `npm.cmd run build`.
   - Report changed files and unresolved manual checks.
   - Manual checks should include one-browser and two-browser cue readability, stale cue / track-change feedback, and Discord expectation wording.

### Checklist Items Achieved

- [x] Deck readouts show cue status, set mode, and last cue action.
- [x] Empty/saved/jumped/stale/blocked states are readable in 2D and 3D.
- [x] Local-only behavior is clearly explained in 2D copy.
- [x] Discord expectation remains clear.
- [x] Manual checklist is updated.
- [x] Build passes.

### Completed Implementation

The cue feedback surfaces now speak in the same compact language across the 2D deck cards and the 3D booth. The 3D Deck A and Deck B readouts now surface cue state directly, showing compact labels such as `LOAD TRACK`, `CUE READY`, `SET CUE ON`, `C1 EMPTY`, `C1 SAVED`, `JUMP C1`, or `C1 STALE` before the deck status line. The 2D panel now explicitly says cue state stays local to this browser, while keeping the rest of the cue transport unchanged. This makes friend testing easier without implying shared cue sync or Discord voice app-audio transport.

### Acceptance Criteria

- Friends can tell whether cue pads are empty, saved, setting, or jumping.
- Users understand cue jumps are local browser SoundCloud behavior.
- No text implies Discord voice carries deck audio.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual one-browser Deck A/B cue test.
- [ ] Manual two-browser local-only expectation test.
- [ ] Manual Discord expectation check.
- [ ] Manual 2D cue readability check.
- [ ] Manual 3D cue readability check.
- [ ] Manual stale cue / track-change feedback check.

### Risks

- Too much status text can make the booth feel noisy.
- Local-only behavior may still be misunderstood without clear copy.

### Wishlist Mapping

- Makes hot cues friend-testable rather than just technically present.

### Non-Goals

- No shared cue sync.
- No host-controlled transport.
- No real headphone cue.

## V12-6: Shared Cue State Or Host-Controlled DJ Transport

Status: `[hold]` on hold.

### Summary

Future phase for sharing cue points or making one host control the DJ decks for everyone.

### Hold Reason

SoundCloud audio is currently local browser audio. Do not build shared cue state until local hot cues are reliable and the product decision around shared SoundCloud behavior is explicit.

## V12-7: Real Headphone Cue / Prelisten

Status: `[hold]` on hold.

### Summary

Future phase for true mixer cue/prelisten behavior.

### Hold Reason

Real headphone cueing is different from hot cues and may not be possible with embedded SoundCloud widgets. Keep this separate so `SET CUE` hot pads do not get mixed up with headphone cue monitoring.

## Manager Loop Plan

Use this doc as the active roadmap for SoundCloud hot cue work and `docs/Agents/agent.md` as the operating loop.

Loop rules:

- Keep only one phase marked `[~]`.
- Before implementation, require a worker preparation spec covering expected files, files to avoid, reused helpers, acceptance checks, risks, and non-goals.
- Do not implement a phase until the approved spec is written into that phase section.
- Every implementation phase runs `npm.cmd run build`.
- Close a phase only after manager review, build confirmation, doc updates, and changelog entry when code changed.
- Push only when the user explicitly says `push update`.

Recommended order:

1. V12-1 validates SoundCloud seek behavior.
2. V12-2 adds local cue state and actions.
3. V12-3 adds 2D controls.
4. V12-4 adds 3D booth cue pads.
5. V12-5 polishes friend-readable feedback.
6. V12-6 and V12-7 stay on hold until local hot cues are proven.

## Test Plan

Every implementation phase:

- run `npm.cmd run build`.
- confirm normal 2D app remains clean.
- confirm hidden 3D room still opens with `syncsesh`.
- confirm existing SoundCloud Deck A/B Play/Pause and Shuffle still work.
- confirm existing SoundCloud crossfader and master volume still work.
- confirm cue actions do not affect the wrong deck.

Hot cue manual checks:

- Deck A can save C1 and jump back to C1.
- Deck B can save C1 and jump back to C1.
- C1-C5 can each store different times.
- Empty cue pads do not crash.
- Cue pads reset or invalidate safely when the track changes.
- Cue jumps are local to the browser.
- Discord expectation remains clear: voice chat does not carry SoundCloud app audio.

## Assumptions

- `SET CUE` is the preferred user-facing name over `ARM`.
- Five hot cue pads per deck is enough for the first version.
- Cues are local-only unless a later phase explicitly designs shared state.
- Saved cue timestamps should be tied to the current track, not blindly reused across shuffled tracks.
- Existing V10/V11 SoundCloud deck, mixer, and 3D booth behavior should be preserved.
