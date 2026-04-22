# Secret 3D World Vision 6 - Recording Room Cleanup Phases

## Purpose

Vision 6 turns the Recording Studio from a working prototype into a room that friends can actually use, troubleshoot, and recover from.

The room already has the important bones:

- hidden 3D entry.
- multiplayer free-roam presence.
- local Web Audio engine.
- app-owned piano, drums, bass, FM synth, and looper sounds.
- visual patch cables.
- default piano and drum routing through the Audio Interface.
- local patch graph gating for generated instruments.
- a tiered looper layout with less overlap.

The next pass should make the room reliable under real friend testing. A user should not need to know the code to answer basic questions like:

- Why can't I hear this?
- Is the engine on?
- Is the piano patched?
- Are the speakers connected?
- Did my friend enable their own audio?
- How do I reset this if the cables are messy?

## North Star

The Recording Studio should feel like a physical collaborative music room.

Target feeling:

- walk into the room with friends.
- see the piano, drums, looper, synths, DJ station, interface, and speakers.
- turn the audio engine on only when needed.
- patch or reset the studio without getting stuck.
- get immediate visual feedback when something is connected, missing, muted, or active.
- hear local and shared generated sounds when each user has enabled their own browser audio.
- understand the room by looking at status lights, meters, and clear labels.

This cleanup vision is about making the existing room legible before adding large new systems.

## Product Boundary

This phase should stay focused.

In scope:

- in-world recovery controls.
- connection status lights.
- clearer audio and patch diagnostics.
- finishing routing for existing generated instruments.
- manual test coverage for Discord and browser use.
- small layout changes that improve readability.

Out of scope for this cleanup pass:

- SoundCloud Web Audio routing.
- raw audio streaming between users.
- full DAW recording/export.
- full cable physics.
- shared patch state until a dedicated sync design phase.
- large new room expansions unless needed for current instruments.

## Current Manager Read

The room's biggest risk is not that it lacks features. The risk is that the room can become hard to understand while testing live with friends.

Current practical issues:

- Audio is intentionally off by default, which is good for app weight and browser policy.
- Each user still needs a clear reason to press ENGINE before expecting audio.
- Patch state is local-only by design, so friends may not see or hear the same cable state.
- Default routing exists, but recovery is not visible enough in the room.
- Some instruments exist as sound sources but do not yet have complete patch-routing clarity.
- The looper layout is improving, but the studio still needs a hierarchy of controls, panels, and status surfaces.

The cleanup work should prefer clarity over spectacle.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## Clean Up Phases

- [x] V6-1: Recording Room Recovery Controls.
- [x] V6-2: Studio Truth Panel.
- [ ] V6-3: Instrument Connected Lights.
- [ ] V6-4: Audio Interface Port States.
- [ ] V6-5: Generated Instrument Routing Completion.
- [ ] V6-6: Friend Audio Onboarding.
- [ ] V6-7: Looper And Control Layout Polish.
- [ ] V6-8: Manual Test And Discord Smoke Pass.
- [hold] V6-9: Shared Patch State Design.
- [hold] V6-10: Future Source Expansion.

## V6-1: Recording Room Recovery Controls

Status: `[x]` completed and manager-verified.

### Goal

Make it impossible for a user to get stuck after moving cables around.

### Work Items

- Add a visible in-world RESET PATCH or DEFAULT ROUTING control.
- Wire the control to the existing local default patch reset action.
- Put the control somewhere obvious, preferably near the Audio Interface or studio status board.
- Add a short visual confirmation after reset.
- Ensure reset restores:
  - Drum Mixer Out -> Audio Interface Input 1.
  - Piano Out -> Audio Interface Input 2.
  - Audio Interface Out -> Speaker System.
  - Drum mics -> Drum Mixer.

### Acceptance Checks

- User can break the patch layout and restore it without leaving 3D.
- Reset does not affect normal 2D dashboard state.
- Reset does not pretend to sync patch state to other users.
- Build passes.

### Implementation Spec

Approved manager scope:

- Add one visible in-world reset/default-routing control near the Audio Interface.
- Register the control as a clickable studio interactable.
- Wire activation to the existing local `resetPatchToDefaults` action.
- Show a brief visual confirmation after activation.
- Reuse the existing transport/control canvas style so the button fits the room.
- Keep the reset local-only and do not add sync/reducer/session behavior.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision6-recording-room-cleanup.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- audio engine files
- sync/session reducer files
- normal 2D dashboard screens

Build and manual checks:

- Run `npm.cmd run build`.
- Manually verify the hidden room opens with `syncsesh`.
- Unplug or move patch cables, click the new reset control, and verify default cables return.
- Confirm the control is readable/reachable in first person and does not add V6-2 diagnostics.

Non-goals:

- No Studio Truth Panel.
- No audio-engine onboarding copy.
- No route diagnostics.
- No connected lights.
- No shared patch sync.

### Checklist Items Achieved

- [x] Added a visible in-world Reset Patch control near the Audio Interface.
- [x] Wired the control to the existing local `resetPatchToDefaults` action.
- [x] Added a short "Defaults Restored" visual confirmation.
- [x] Kept reset behavior local-only.
- [x] Avoided audio engine, sync, reducer, and normal 2D dashboard changes.

### Completed Implementation

The Recording Studio now has a clickable `RESET PATCH` control beside the Audio Interface. It restores the local patch graph to the initial default routing and clears any loose/active cable state through the existing patch reset action.

The button shows whether the default route is currently ready and briefly flashes a restored confirmation after activation.

### Build And Manual Checks

- [x] `npm.cmd run build` passed.
- [x] Build still reports the existing Vite large chunk warning.
- [ ] Manual hidden-room reset verification still needs a browser/Discord pass.

## V6-2: Studio Truth Panel

Status: `[x]` completed and manager-verified.

### Goal

Give the room a single truth surface that explains the current audio state.

### Work Items

- Add a readable status panel near the Audio Interface or back wall.
- Show audio engine state:
  - ENGINE OFF.
  - MUTED.
  - VOLUME ZERO.
  - READY.
- Show required studio route state:
  - Piano patched or missing.
  - Drum mixer patched or missing.
  - Speakers patched or missing.
- Show local-only patch note in a compact way if needed.
- Keep text short enough to read in first person.

### Acceptance Checks

- A user can diagnose the silent piano from inside the room.
- A user can diagnose disconnected speakers from inside the room.
- A user can tell whether the audio engine is the blocker.
- Panel text does not overlap or flicker in top-down or first-person view.

### Implementation Spec

Approved manager scope:

- Retitle or replace the existing noisy room-status overview screen as `Studio Truth`.
- Keep the panel passive and display-only.
- Show the local audio engine state as one of `ENGINE OFF`, `MUTED`, `VOLUME ZERO`, or `READY`.
- Show core route state:
  - `PIANO PATCHED` or `PIANO MISSING`.
  - `DRUM MIX PATCHED` or `DRUM MIX MISSING`.
  - `SPEAKERS PATCHED` or `SPEAKERS MISSING`.
  - `PATCHES LOCAL ONLY`.
- Use existing overview screen rendering and short, stable text.
- Use warning color when any required route or engine state is blocking and ready color only when core route plus engine are ready.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision6-recording-room-cleanup.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- audio engine implementation files
- sync/session reducer files
- patch schema/state creation
- normal 2D dashboard screens

Build and manual checks:

- Run `npm.cmd run build`.
- Manually verify the panel says `ENGINE OFF` before audio activation.
- Verify mute, volume zero, piano route, drum mixer route, and speaker route changes are reflected by the panel.
- Verify reset patch returns route lines to patched.

Non-goals:

- No V6-3 connected lights.
- No V6-4 port-state meters.
- No shared patch state.
- No routing expansion.
- No audio engine behavior changes.

### Checklist Items Achieved

- [x] Replaced the noisy room-status wall screen with a `Studio Truth` panel.
- [x] Added clear engine state text: `ENGINE OFF`, `MUTED`, `VOLUME ZERO`, or `READY`.
- [x] Added piano, drum mixer, and speaker route state lines.
- [x] Added a compact `PATCHES LOCAL ONLY` note.
- [x] Kept the panel passive and display-only.
- [x] Avoided connected lights, port meters, shared patch sync, and routing expansion.

### Completed Implementation

The Recording Studio now has a wall-mounted Studio Truth panel near the Audio Interface sightline. It summarizes the local audio engine state and the core patch routes needed for piano/drums to reach the speakers.

The panel uses warning color when a route or engine state is blocking and ready color when the engine and core routes are ready.

### Build And Manual Checks

- [x] `npm.cmd run build` passed.
- [x] Build still reports the existing Vite large chunk warning.
- [ ] Manual hidden-room panel verification still needs a browser/Discord pass.

## V6-3: Instrument Connected Lights

Status: `[ ]` not started.

### Goal

Make every current instrument say whether it is live at a glance.

### Work Items

- Add connected/not-patched lights to:
  - Piano.
  - Drum Kit or Drum Mixer.
  - Bass Machine.
  - FM Synth.
  - Looper.
  - DJ Station.
- Use a consistent status language:
  - dark or dim = inactive.
  - amber = local click received but not patched/audible.
  - green = patched.
  - bright pulse = signal active.
- Keep lights visible without cluttering the instrument panels.

### Acceptance Checks

- Pressing an instrument gives immediate local feedback even if not audible.
- A patched instrument visibly confirms its live route.
- Unpatched instruments do not feel broken.

## V6-4: Audio Interface Port States

Status: `[ ]` not started.

### Goal

Make the Audio Interface the trusted center of the room.

### Work Items

- Add port status lights for interface inputs and outputs.
- Represent:
  - empty.
  - connected.
  - active signal.
  - invalid or rejected target.
- Add a simple output meter for the interface/speaker feed.
- Add a Drum Mixer output meter showing whether drum submix reaches the interface.
- Add hover highlight for compatible patch targets if the interaction data is available.
- Add rejected-target feedback when a user tries an incompatible port.

### Acceptance Checks

- Interface inputs visibly change when cables are moved.
- Active piano or drum hits pulse the relevant route.
- Invalid patch attempts give feedback without breaking cable state.

## V6-5: Generated Instrument Routing Completion

Status: `[ ]` not started.

### Goal

Bring every current app-owned generated instrument into the same routing model.

### Work Items

- Support Bass Machine Out -> Audio Interface.
- Support FM Synth Out -> Audio Interface.
- Support Looper Out -> Audio Interface.
- Support DJ Station Out -> Audio Interface if it is app-generated sound.
- Ensure each source has a registered patch node and output port.
- Ensure audio gating rules are consistent with piano and drums.
- Ensure disconnected instruments still show click/status feedback.

### Acceptance Checks

- Each generated instrument has a visible output path.
- Each generated instrument can become audible when patched and engine-ready.
- Unpatched generated instruments do not create confusing silent failure.
- SoundCloud remains outside the patch graph.

## V6-6: Friend Audio Onboarding

Status: `[ ]` not started.

### Goal

Make Discord/friend testing understandable when browsers block audio until user activation.

### Work Items

- Keep the audio engine off by default.
- Add in-room copy or status that explains each user must enable their own ENGINE.
- Show local engine readiness separately from remote presence.
- If possible, show a compact friend-audio hint when shared live events are received while local engine is off.
- Keep volume safe when the engine is first enabled.

### Acceptance Checks

- User understands why friends can move but not be heard.
- User understands that their own ENGINE button controls local playback.
- Remote generated sound events do not imply raw voice/audio streaming.

## V6-7: Looper And Control Layout Polish

Status: `[ ]` not started.

### Goal

Make the looper readable and playable without overlapping controls.

### Work Items

- Keep phrase pads separated enough for first-person aiming.
- Use tiers, rear shelves, or wall controls for secondary controls.
- Move less-used controls onto the wall or rear panel if needed.
- Keep primary pads close to the player.
- Ensure top-down and first-person views both show the hierarchy.
- Avoid adding controls that sit on top of existing labels.

### Acceptance Checks

- No looper buttons visually overlap from the normal first-person approach.
- Primary phrase pads are easy to aim at.
- Bar-length and utility controls are visibly secondary.
- Wall-mounted controls, if used, remain reachable and readable.

## V6-8: Manual Test And Discord Smoke Pass

Status: `[ ]` not started.

### Goal

Turn the friend-testing discoveries into repeatable checks.

### Work Items

- Add a Recording Studio section to the manual test checklist.
- Include browser solo checks:
  - engine off by default.
  - engine button enables low safe volume.
  - piano audible when patched.
  - drums audible when patched.
  - reset patch restores defaults.
- Include Discord/friend checks:
  - remote avatar visible in same room.
  - remote leaves/level changes clear presence.
  - both users must enable ENGINE for local playback.
  - generated shared sounds only play for receivers in the studio.
- Include layout checks for looper control spacing.

### Acceptance Checks

- Manual checklist explains the exact current multiplayer expectations.
- Tests separate app-owned generated sound from voice/raw audio.
- Build passes after docs and code changes.

## V6-9: Shared Patch State Design

Status: `[hold]` intentionally delayed.

### Goal

Decide whether friends should share one patch graph or each keep a local patch graph.

### Questions

- Should one user moving a cable update everyone else's room?
- Should shared patching require host authority?
- Should patch state be stored in the reducer/session state?
- What happens when two users grab the same cable?
- Does patch state reset when everyone leaves the room?
- How do we avoid breaking normal Sync Sesh state?

### Hold Reason

Local recovery and clarity should land first. Shared patching will be easier to design once the local room is understandable.

## V6-10: Future Source Expansion

Status: `[hold]` intentionally delayed.

### Goal

Add new studio sources after the current instruments are clear and recoverable.

### Candidate Sources

- Vocal Mic -> Audio Interface.
- Guitar Amp Mic -> Audio Interface.
- Additional room mics.
- More drum submix controls.
- Future sample decks.
- Future collaborative recording surface.

### Hold Reason

Adding more instruments before recovery/status is finished would make the room harder to debug.

## Recommended Next Manager Move

Start V6-3 as the next implementation pass:

- add connected/not-patched lights to the current instruments.
- reuse the Studio Truth route logic where possible.
- keep the phase visual-only and avoid V6-4 port meters.
- run a production build.

V6-1 and V6-2 now give the room a recovery and diagnosis foundation before deeper routing and visual polish.
