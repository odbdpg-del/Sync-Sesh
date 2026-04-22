# Secret 3D World Vision 5 - Patchable Audio Studio

## Purpose

Vision 5 turns the Recording Studio from a set of instrument controls into a physical signal-flow room.

The core idea is simple:

- instruments have output jacks.
- mics have cables.
- mixer boxes combine related sources.
- an audio interface receives instrument or mixer outputs.
- speakers and DAW feedback show what is connected.
- users can unplug, carry, and reconnect wiggly patch cables.

This should make the studio understandable by looking at it. If the piano is connected to the audio interface, the user should see the cable. If the drum kit is connected through mics into a drum mixer, the user should see that chain.

## North Star

The hidden world should feel like a playful physical studio where friends patch instruments together.

Target feeling:

- walk into the Recording Studio.
- see an Audio Interface near the DAW.
- see the Piano, Drum Kit, synths, and future instruments with obvious output jacks.
- see drum mics feeding a small Drum Mixer box.
- see one main cable from the Drum Mixer to the Audio Interface.
- click a cable plug to unplug it.
- carry or drag the loose wiggly cable end around.
- click a compatible port to plug it in.
- watch instrument lights, mixer lights, speakers, and DAW status react.

The patch system should become reusable infrastructure for future instruments.

## Product Boundary

This vision is not a full modular synth or professional patch bay on the first pass.

Start with visual and UX clarity first:

- visual patching comes before audio gating.
- click/unplug/drag/reconnect comes before complex routing.
- the first audio interface can be local-only.
- shared/multiplayer patch state should wait for an explicit sync design phase.
- no SoundCloud raw audio processing.
- no SoundCloud Web Audio routing.

SoundCloud remains widget/jukebox playback only.

## Signal Flow Model

### First Drum Flow

The drum kit should not route every drum directly into the main Audio Interface.

Instead:

- Kick Mic -> Drum Mixer.
- Snare Mic -> Drum Mixer.
- Hat Mic -> Drum Mixer.
- Overhead Mic L -> Drum Mixer.
- Overhead Mic R -> Drum Mixer.
- Drum Mixer Out -> Audio Interface Input.
- Audio Interface Out -> Speaker System / DAW.

The Drum Mixer is the first proof that the system supports submixes.

### First Instrument Flow

The Piano can be simpler:

- Piano Out -> Audio Interface Input.

Future instruments can follow the same pattern:

- Bass Out -> Audio Interface Input.
- FM Synth Out -> Audio Interface Input.
- Looper Out -> Audio Interface Input.
- DJ Deck Out -> Audio Interface Input.
- Vocal Mic Out -> Audio Interface Input.
- Guitar Amp Mic Out -> Audio Interface Input.

## Interaction Model

Preferred first-person interaction:

- Click a plugged cable end to unplug it.
- The loose plug becomes the active carried cable end.
- The loose cable end follows the reticle or a short point in front of the camera.
- Valid target ports glow when aimed at.
- Click a compatible port to plug in.
- Click empty space or press Escape to drop/cancel.

Avoid full cable physics at first. A guided reticle-follow cable will be easier to control in first person and easier to verify.

## Reusable Patch System

The implementation should avoid hardcoding one-off piano or drum cables.

Suggested local model:

```ts
type PatchNodeKind =
  | "instrument"
  | "microphone"
  | "submixer"
  | "audio-interface"
  | "speaker";

type PatchPortKind = "input" | "output";

type PatchCableState = "plugged" | "dragging" | "loose";

interface PatchNode {
  id: string;
  kind: PatchNodeKind;
  label: string;
}

interface PatchPort {
  id: string;
  nodeId: string;
  kind: PatchPortKind;
  label: string;
  worldPosition: [number, number, number];
  accepts?: string[];
}

interface PatchCable {
  id: string;
  label: string;
  fromPortId: string | null;
  toPortId: string | null;
  state: PatchCableState;
  color: string;
}
```

Future phases can refine naming and ownership after reading the code.

## Wishlist Items

### Audio Interface

- [x] Add a physical Audio Interface object near the DAW table.
- [x] Add labeled interface ports for at least four inputs and one output.
- [ ] Add port status lights: empty, connected, active signal, invalid target.
- [x] Add a clear "Interface -> DAW" or "Interface -> Speakers" label.
- [x] Show whether the audio engine is off, muted, volume zero, or ready.
- [x] Make the Audio Interface the central truth panel for studio connectivity.

### Drum Mic Mixer

- [x] Add a small Drum Mixer box near the drum kit.
- [x] Add labeled inputs for Kick, Snare, Hat, Overhead L, and Overhead R.
- [x] Add one Drum Mixer output port.
- [x] Add tiny level lights for each mic input.
- [ ] Add an output meter showing whether the drum submix is feeding the interface.
- [x] Make the drum mixer visually distinct from the DAW mixer.

### Drum Mics

- [x] Add a Kick Mic pointed at the kick drum.
- [x] Add a Snare Mic pointed at the snare.
- [x] Add a Hat Mic pointed at the hi-hat.
- [x] Add one or two overhead mics above the kit.
- [x] Give each mic a small output jack.
- [ ] Make each mic light up when its drum is hit and patched.
- [ ] Show "mic unplugged" feedback if the user hits a drum whose mic is disconnected.

### Patch Cables

- [x] Add curved/wiggly cable geometry between connected ports.
- [x] Use stable cable colors by source type.
- [x] Add visible plug ends at both cable endpoints.
- [ ] Make unplugged cable ends visibly hang, float, or rest near the source.
- [x] Add reticle-follow behavior for the actively carried plug.
- [ ] Add hover highlighting for compatible ports.
- [ ] Add rejected-target feedback for incompatible ports.
- [x] Keep cables readable in both first-person and top-down views.

### Default Connections

- [x] Start with default visual cables from drum mics into the Drum Mixer.
- [x] Start with a default cable from Drum Mixer Out to Audio Interface Input 1.
- [x] Start with a default cable from Piano Out to Audio Interface Input 2.
- [x] Start with a default cable from Audio Interface Out to the speaker system.
- [ ] Make default connections easy to reset if the user makes a mess.
- [x] Keep defaults local-only until a shared patch-state design exists.

### Cable Interaction

- [x] Click a plugged cable end to unplug it.
- [x] Carry a cable plug with the reticle.
- [x] Click a valid port to plug it in.
- [ ] Click empty space or press Escape to cancel/drop.
- [x] Prevent both ends of one cable from plugging into inputs or outputs incorrectly.
- [x] Support moving one cable from one interface input to another.
- [ ] Support future user-created or spawned cables.

### Instrument Connection Feedback

- [ ] Add "Connected" lights to Piano, Drum Kit, FM Synth, Bass, Looper, and future instruments.
- [x] Add "Not Patched" feedback when an instrument is unconnected.
- [x] Add speaker/meter feedback that distinguishes click registered, patched, and audible.
- [x] Show the currently patched destination on the instrument panel.
- [x] Avoid making early disconnected states too punishing while the UX is still being tuned.

### Audio Routing And Gating

- [x] Keep first implementation visual-only.
- [x] Later, gate audible instrument output based on patch graph only after UX feels reliable.
- [x] Ensure disconnected instruments still show clear click feedback.
- [x] Keep volume safe and master mute/volume controls authoritative.
- [x] Do not route SoundCloud through the patch graph.
- [x] Do not add shared routing until an explicit reducer/sync design phase.

### Future Instruments

- [x] Make new instruments register patch nodes and ports through shared helpers.
- [ ] Support Vocal Mic -> Audio Interface.
- [ ] Support Guitar Amp Mic -> Audio Interface.
- [ ] Support Bass Machine Out -> Audio Interface.
- [ ] Support FM Synth Out -> Audio Interface.
- [ ] Support Looper Out -> Audio Interface.
- [ ] Support DJ Station Out -> Audio Interface.
- [ ] Support new submixers if future instruments need grouped inputs.

## Phase Seeds

These are not approved implementation specs yet. They are small phase candidates for later manager/worker loop planning.

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.

Only one phase should be `[~]` at a time.

- [x] V5-1: Static Audio Interface with labeled ports.
- [x] V5-2: Static Drum Mixer and visible drum mics.
- [x] V5-3: Static default patch cables for Piano, Drum Mixer, Interface, and Speakers.
- [x] V5-4: Local patch node/port/cable state model.
- [x] V5-5: Port registration helpers for future instruments.
- [x] V5-6: Click-to-unplug and click-to-connect local cable interactions.
- [x] V5-7: Reticle-follow loose cable preview.
- [x] V5-8: Instrument and mixer connection status lights.
- [x] V5-9: Speaker/meter status reads from patch graph plus audio engine state.
- [x] V5-10: Design phase for audio gating by patch graph.
- [x] V5-11: Implement optional local audio gating for app-owned generated instruments.
- [~] V5-12: Manual in-world patching recovery and usability pass.

## V5-1: Static Audio Interface With Labeled Ports

Status: `[x]` completed and manager-verified.

### Summary

Add a static, visual-only Audio Interface object near the DAW table in the Recording Studio.

The object should make the future patching system legible before any patch state exists: users should be able to see where instruments and mixers will eventually plug in, where the interface outputs go, and whether the current local audio engine appears off, muted, volume-zero, or ready.

### Implementation Spec

Expected files to touch:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - Add a compact local `StudioAudioInterface` component.
  - Render it in the DAW cluster near the existing `StudioDeskShell`, `StudioMixerControls`, and `StudioAudioEngineControl`.
  - Use existing room-local patterns: `Vec3`, mesh groups, box/cylinder geometry, emissive dark hardware materials, `meshBasicMaterial` for glowing readable UI.
- `src/3d/levels/level1.ts`
  - Avoid touching this unless implementation discovers the object needs real collision. The preferred placement is on the existing DAW tabletop, so no new blocker should be needed.

Files to avoid:

- `docs/3d/3dvision5.md` outside this V5-1 section and existing status marker.
- `changelog.md`.
- `src/3d/useLocalDawState.ts`.
- `src/3d/useLocalDawAudioEngine.ts`.
- Sync/session/server files.
- SoundCloud or jukebox code.

Component guidance:

- Add a static `StudioAudioInterface` component local to `Level1RecordingStudioRoom.tsx`.
- Do not use `StudioStationLabel` for the Audio Interface if it would show the generic `PLACEHOLDER` caption.
- Use a small custom canvas label/status helper or reuse `createStudioTransportControlCanvas` so all interface labels read as intentional Audio Interface labels.
- Keep labels concise and explicit:
  - main label: `Audio Interface`
  - input labels: `IN 1`, `IN 2`, `IN 3`, `IN 4`
  - output label: `OUT`
  - routing label: `INTERFACE -> DAW` or `INTERFACE -> SPEAKERS`
- Use noninteractive socket visuals:
  - at least four input jacks.
  - at least one output jack.
  - small status lights near the ports.
  - optional subtle port rings so future cable endpoints have obvious visual targets.
- The interface may read `localDawAudioState` only for display lights/status text.
- Do not register interactables for V5-1.
- Do not add patch graph state, patch node types, cable state, hover targeting, or routing behavior.

Suggested placement:

- Parent the object to the DAW cluster transform:
  - position `[-21.25, 0, -4.6]`
  - rotation `[0, Math.PI / 2, 0]`
- Place the hardware on the DAW tabletop, clear of the existing audio engine control and mixer strips.
- Suggested local placement:
  - main box around local `[0.72, 0.79, -0.26]`
  - approximate size `[0.78, 0.16, 0.34]`
  - front/top labels and sockets just above the box surface.
- Keep it readable from first-person and visible in top-down view without hiding existing DAW controls.

Status display:

- Show `PWR` or `ENGINE` as ready/off/error using the same local audio state semantics already used by the DAW controls.
- Show `MUTE` as lit when master audio is muted.
- Show `VOL` as dim when master volume is zero and active when above zero.
- Keep port lights visually static or display-only. They may suggest empty/available ports, but must not imply real connected or invalid patch state yet.

### Checklist Items Achieved

- [x] Added a physical Audio Interface object near the DAW table/cluster.
- [x] Added four labeled input ports: `IN 1`, `IN 2`, `IN 3`, `IN 4`.
- [x] Added one labeled output port: `OUT`.
- [x] Added `PWR`, `MUTE`, and `VOL` display lights driven only by local audio engine state.
- [x] Added intentional `Audio Interface` and `Interface -> DAW` labels.
- [x] Kept the interface static and noninteractive.
- [x] Avoided patch state, cable geometry, routing, sync, collision, and SoundCloud changes.

### Completed Implementation

- Added local static Audio Interface helper components in `src/3d/Level1RecordingStudioRoom.tsx`.
- Rendered the interface after the existing DAW audio engine controls, using the DAW cluster transform and tabletop placement.
- Used compact canvas labels for port/status text so the interface does not inherit generic station placeholder labeling.
- The manager adjusted the main label from `Audio I/O` to `Audio Interface` to match the approved spec and improve user recognition.
- Status lights are display-only:
  - `PWR` reflects whether the local audio engine is ready.
  - `MUTE` reflects local master mute state.
  - `VOL` reflects whether master volume is above zero.
- No new `useRegisterInteractable` call was added for the Audio Interface.
- No source audio behavior, SoundCloud behavior, shared sync behavior, patch state, cable interaction, or level collision changed.

### Acceptance Criteria

- A physical Audio Interface object appears near the DAW table in the Recording Studio.
- The object has at least four clearly labeled input ports.
- The object has at least one clearly labeled output port.
- The object includes status lights for engine/power, mute, and volume/readiness.
- The object includes a clear `Interface -> DAW` or `Interface -> Speakers` label.
- Audio Interface labels are intentional interface labels, not generic station placeholder labels.
- The object matches the existing dark studio hardware and neon-accent visual language.
- Existing DAW, mixer, audio engine, piano, drum kit, looper, DJ, rack, role badge, and overview screen behavior remains unchanged.
- The object is static and noninteractive.
- No source audio behavior, SoundCloud behavior, shared sync behavior, or patch state behavior changes.

### Build And Manual Checks

- Worker `npm.cmd run build` passed.
- Manager `npm.cmd run build` passed at `2026-04-21 11:13`.
- Existing Vite large chunk warning remains.
- Source review confirmed no new Audio Interface interactable registration.
- Source review confirmed no patch graph, cable state, audio routing/gating, sync/session, SoundCloud, or collision changes.
- Not run: browser/in-world visual check.
- Pending manual checks:
  - verify the Audio Interface is visible from the studio entrance and near the DAW table.
  - verify all interface labels are readable enough in first-person.
  - verify top-down view still clearly shows the DAW area.
  - verify existing clickable DAW/audio/studio controls still work.
  - verify the Audio Interface itself does not respond to clicks.
  - verify status lights reflect only local audio engine display state and do not create routing behavior.

### Risks

- `Level1RecordingStudioRoom.tsx` is already large, so keep the component compact and data-driven.
- Labels can become too small in first-person. Prefer canvas labels sized like existing studio labels and controls.
- Placement can visually collide with existing DAW controls, especially the audio engine control, mixer strips, and clip grid controls.
- Status lights could accidentally imply real patch connectivity. Keep V5-1 wording and visuals clearly display-only.
- If the object is moved off the tabletop, collision work may become necessary. Avoid that unless explicitly approved.

### Wishlist Mapping

Directly targets:

- Add a physical Audio Interface object near the DAW table.
- Add labeled interface ports for at least four inputs and one output.
- Add a clear `Interface -> DAW` or `Interface -> Speakers` label.
- Show whether the audio engine is off, muted, volume zero, or ready.

Partially seeds:

- Add port status lights: empty, connected, active signal, invalid target.
  - V5-1 should only show static/display lights. Connected, active signal, and invalid target behavior require later patch phases.
- Make the Audio Interface the central truth panel for studio connectivity.
  - V5-1 establishes the visual center only. It must not become state truth yet.

### Non-Goals

- No patch graph types or state.
- No cable geometry.
- No default connection cables.
- No click-to-unplug, click-to-connect, cable dragging, reticle-follow preview, hover target, or invalid-target interaction.
- No drum mixer.
- No drum mics.
- No instrument connected/not-patched feedback.
- No audio gating or Web Audio routing changes.
- No SoundCloud routing or jukebox changes.
- No shared/multiplayer sync changes.
- No changelog edits.

## V5-2: Static Drum Mixer And Visible Drum Mics

Status: `[x]` completed and manager-verified.

### Summary

Add static visual studio hardware around the existing drum kit: a small Drum Mixer box near the kit, visible close mics for Kick, Snare, and Hat, two overhead mics, labeled mixer inputs with tiny display lights, and one labeled mixer output port.

This phase should make the first drum signal-flow chain visually understandable without adding cables, patch state, interactions, routing, or sync behavior.

### Implementation Spec

Expected files to touch:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - Add compact local static helper components for drum mics and the drum mixer.
  - Render them near or inside the existing `StudioDrumKit` cluster.
  - Reuse the room's existing mesh/canvas-label style.

Files to avoid:

- `docs/3d/3dvision5.md` outside this V5-2 section and existing status markers.
- `changelog.md`.
- `src/3d/useLocalDawState.ts`.
- `src/3d/useLocalDawAudioEngine.ts`.
- Sync/session/server files.
- SoundCloud or jukebox code.
- `src/3d/levels/level1.ts` unless placement absolutely requires collision changes. Preferred placement should avoid collision changes.

Existing helpers and code seams:

- Use the local `Vec3` type.
- Use `STUDIO_DRUM_KIT_POSITION` as the parent anchor for mixer and mic placement.
- Use the existing `StudioDrumKit` local coordinate system.
- Use existing drum piece positions as target references:
  - Kick: local `[0, 0.42, -0.08]`
  - Snare: local `[-0.48, 0.58, -0.42]`
  - Hat: local `[-0.9, 0.92, -0.36]`
  - Existing cymbal/stand decoration near `[0.74, 1.02, -0.38]`
- Reuse or adapt `createStudioInterfacePortLabelCanvas`, `StudioAudioInterfacePort`, and `StudioAudioInterfaceStatusLight` for static mixer ports/lights if doing so stays clear and compact.
- Reuse `createStudioTransportControlCanvas` for intentional mixer face labels such as `Drum Mixer` and `Mics -> Mix`.
- Match the existing visual language: dark hardware boxes, low emissive accents, glowing readable UI planes, and small cylinder/torus ports.

Drum Mixer placement:

- Add a static component such as `StudioDrumPatchVisuals` or `StudioDrumMixerAndMics`.
- Prefer parenting the component to `STUDIO_DRUM_KIT_POSITION`.
- Place the mixer near the drum kit but not on top of existing clickable drum heads.
- Suggested local mixer placement inside the drum kit group:
  - position around `[1.25, 0.52, 0.42]`
  - approximate size `[0.72, 0.22, 0.42]`
  - angle slightly toward the room/player if needed, while keeping labels readable in first-person and top-down.
- Mixer labels:
  - main label: `Drum Mixer`
  - secondary label: `Mics -> Mix` or `Drum Submix`
- Mixer inputs:
  - five labeled input ports: `Kick`, `Snare`, `Hat`, `OH L`, `OH R`
  - arrange in one row or a compact two-row layout on the top/front face.
  - add tiny display-only level/status lights beside each input.
- Mixer output:
  - one labeled `OUT` or `MIX OUT` port.
  - place it on the side visually facing the Audio Interface/DAW direction.
  - include a small output meter or display-only output light.
  - use a label such as `OUT -> INTERFACE`.

Mic placement:

- Add a static `StudioDrumMic` helper for stand, boom, mic body, tiny label, and output jack.
- Each mic should visibly point at its intended target using simple cylinder/box geometry.
- Each mic should include a small visible output jack/ring.
- Kick mic:
  - local position around `[0.0, 0.32, -0.58]`
  - angled toward the kick.
  - label `Kick Mic`.
- Snare mic:
  - local position around `[-0.55, 0.82, -0.7]`
  - angled toward the snare.
  - label `Snare Mic`.
- Hat mic:
  - local position around `[-1.05, 1.14, -0.62]`
  - angled toward the hi-hat.
  - label `Hat Mic`.
- Overhead L and Overhead R:
  - local positions around `[-0.62, 1.78, -0.12]` and `[0.62, 1.78, -0.12]`
  - point down toward the kit.
  - labels `OH L` and `OH R`.
  - keep overhead geometry slim enough that it does not obscure existing drum click targets.

Display-only light guidance:

- Lights may be static.
- If lights use `localDawAudioState.lastDrumHitLabel`, they must be described and implemented as display-only recent-hit feedback.
- Recent-hit lights must not imply connection state, routing state, patch validity, or whether a mic is connected.
- Do not show "connected", "invalid", "patched", or "unplugged" semantics in V5-2.

Cable guidance:

- Do not add cable geometry in V5-2.
- Do not add default visual cable paths in V5-2.
- Do not add short connector lines between mics and mixer.
- If visual direction is needed, use only labels, port placement, tiny output jacks, and the mixer output label. Cable geometry waits for V5-3.

### Checklist Items Achieved

- [x] Small static Drum Mixer box appears near the drum kit.
- [x] Drum Mixer has labeled `Kick`, `Snare`, `Hat`, `OH L`, and `OH R` inputs.
- [x] Drum Mixer has one labeled `OUT` port and an `Out -> Interface` display label.
- [x] Drum Mixer has tiny display-only recent-hit lights and a display-only output meter.
- [x] Drum Mixer reads as distinct from the existing DAW mixer.
- [x] Kick, Snare, Hat, Overhead L, and Overhead R mics are visible around the kit.
- [x] Each visible mic has a small output jack/ring.
- [x] Existing drum kit click behavior remains unchanged by this phase.
- [x] No cable geometry, patch state, interactions, routing/gating, SoundCloud changes, sync changes, or collision changes were added.

### Completed Implementation

Added static `StudioDrumMixerAndMics` visuals inside the existing drum kit group in `src/3d/Level1RecordingStudioRoom.tsx`.

The phase adds a compact Drum Mixer with five labeled mic inputs, one output port, display-only recent-hit lights, and a display-only output meter. It also adds visible Kick, Snare, Hat, Overhead L, and Overhead R mics with slim stands, mic bodies, compact labels, and output jack rings.

The output meter is intentionally not counted as the final "feeding the interface" wishlist item yet because there is no patch graph, real submix feed, or connection truth in V5-2.

### Acceptance Criteria

- A small static Drum Mixer box appears near the drum kit.
- Drum Mixer has labeled inputs for `Kick`, `Snare`, `Hat`, `OH L`, and `OH R`.
- Drum Mixer has one clearly labeled output port.
- Drum Mixer includes tiny display-only lights for each mic input.
- Drum Mixer is visually distinct from the existing DAW mixer.
- Visible Kick, Snare, Hat, Overhead L, and Overhead R mics are present.
- Each visible mic has a small output jack.
- Mics are placed and oriented so their target drum/cymbal is understandable.
- Existing drum kit click behavior remains unchanged.
- No cable geometry is added.
- No interactions, patch state, audio routing/gating, SoundCloud changes, sync changes, or collision changes are added.

### Build And Manual Checks

- Worker ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Manager ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Browser/manual visual checks are pending and will be consolidated in the recovery/usability pass.
- Manual check still needed: verify the Drum Mixer is visible near the drum kit from normal room entry and first-person positions.
- Manual check still needed: verify mixer and mic labels are readable enough without crowding the kit.
- Manual check still needed: verify mics do not hide or block existing clickable drum heads.
- Manual check still needed: verify existing Kick, Snare, and Hat clicking still works.
- Manual check still needed: verify top-down view shows the mixer and overhead mics without turning the kit into visual clutter.
- Manual check still needed: verify no new object behaves interactively.
- Manual check still needed: verify DAW table, Audio Interface, speakers, role badges, and existing studio stations still render.
- Original planned check: Run `npm.cmd run build`.
- If doing a manual visual check, run `npm.cmd run dev` and enter the 3D Recording Studio.
- Verify the Drum Mixer is visible near the drum kit from normal room entry and first-person positions.
- Verify mixer and mic labels are readable enough without crowding the kit.
- Verify mics do not hide or block existing clickable drum heads.
- Verify existing Kick, Snare, and Hat clicking still works.
- Verify top-down view shows the mixer and overhead mics without turning the kit into visual clutter.
- Verify no new object behaves interactively.
- Verify DAW table, Audio Interface, speakers, role badges, and existing studio stations still render.

### Risks

- The drum kit area is already dense. Five mics plus a mixer can clutter the scene quickly.
- Overhead mics may obscure existing clickable drum surfaces if placed too low or too large.
- Labels can become unreadable if every mic gets a full-size canvas label. Use compact labels for mics and slightly larger labels for the mixer.
- Reusing `StudioAudioInterfacePort` directly may semantically tie Drum Mixer visuals to the Audio Interface. A neutral helper name is cleaner if edits stay compact.
- If display lights use `lastDrumHitLabel`, reviewers may read them as routing feedback. Keep them display-only and avoid connected/patched language.
- Placement should avoid any need for new collision blockers.

### Wishlist Mapping

Directly targets Drum Mic Mixer:

- Add a small Drum Mixer box near the drum kit.
- Add labeled inputs for Kick, Snare, Hat, Overhead L, and Overhead R.
- Add one Drum Mixer output port.
- Add tiny level lights for each mic input.
- Make the drum mixer visually distinct from the DAW mixer.

Partially targets Drum Mic Mixer:

- Add an output meter showing whether the drum submix is feeding the interface.
  - V5-2 can add a static or recent-hit display meter, but it must not represent real patch feed state.

Directly targets Drum Mics:

- Add a Kick Mic pointed at the kick drum.
- Add a Snare Mic pointed at the snare.
- Add a Hat Mic pointed at the hi-hat.
- Add one or two overhead mics above the kit.
- Give each mic a small output jack.

Defers Drum Mics:

- Make each mic light up when its drum is hit and patched.
- Show `mic unplugged` feedback if the user hits a drum whose mic is disconnected.

### Non-Goals

- No patch graph, patch node, port registration, or cable state.
- No cable geometry.
- No default visual cables.
- No short connector lines between mics and mixer.
- No click-to-unplug, click-to-connect, drag, reticle-follow, hover target, or invalid target feedback.
- No actual mixer routing, drum submix routing, audio gating, or Web Audio changes.
- No SoundCloud or jukebox changes.
- No shared/multiplayer sync changes.
- No collision changes unless unavoidable.
- No changelog edits.

## V5-3: Static Default Patch Cables

Status: `[x]` completed and manager-verified.

### Summary

Add static, visual-only cable geometry that connects the completed V5-1 and V5-2 hardware into an understandable starter patch plan.

These cables are decorative defaults only. They show the planned initial studio signal-flow layout, but they must not imply real routing, patch truth, current connection state, audio gating, or synchronized patch state.

### Implementation Spec

Expected files to touch:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - Add static cable helper types/components.
  - Add cable runs near the existing piano, drum mixer/mics, Audio Interface, and speaker panel.
  - Add a required static `Piano Out` jack/ring so the piano cable visibly connects to a real output point.

Files to avoid:

- `docs/3d/3dvision5.md` outside this V5-3 section and existing status markers.
- `changelog.md`.
- `src/3d/useLocalDawState.ts`.
- `src/3d/useLocalDawAudioEngine.ts`.
- Sync/session/server files.
- SoundCloud or jukebox code.
- `src/3d/levels/level1.ts`.
- Any V5-4+ patch model files.

Component guidance:

- Add a local static cable helper such as:
  - `interface StudioStaticCableSpec`
  - `function StudioStaticPatchCable`
  - `function StudioStaticPatchCables`
- Keep all cable specs local constants or memoized local arrays. Do not store cables in app state.
- Do not add `useRegisterInteractable`.
- Do not add invisible hitboxes.
- Do not add hover affordances.
- Do not add click handling.
- Do not add patch graph, patch node, patch port, or patch cable state.
- Do not add audio routing/gating behavior.
- If segment cylinders are used, keep the math helper local and minimal.
- Import Three.js vector/quaternion helpers only if needed for clean segment orientation.
- Decorative endpoint plugs/rings are allowed and encouraged, but they must be static meshes only.
- Add the required `Piano Out` jack/ring to `StudioPianoShell` or a nearby static piano patch helper. It must be visual-only.

Suggested cable implementation:

- Prefer simple segmented cable geometry for this phase:
  - cylinder segments between fixed points.
  - small endpoint plugs/rings at the ends.
  - a slightly larger bend bead or small sphere at major bends if it improves readability.
- Segment cylinders are acceptable even if they look slightly angular. Smoother curves can wait.
- Keep long room-spanning cables mostly low and floor-hugging, around y `0.1` to `0.18`.
- Raise only near visible jacks, ports, or speaker/input surfaces.
- Keep mic cables compact around the drum kit.
- Use semi-transparent or restrained emissive materials so cables are readable without covering controls.
- Exact endpoint positions may be adjusted during implementation to avoid covering piano keys, drum heads, Audio Interface labels, DAW controls, or existing clickable controls.

Default cable runs:

1. Kick Mic -> Drum Mixer Kick
   - Color: `#f8d36a`
   - Suggested points:
     - Kick mic output near `[-14.35, 0.50, 0.58]`
     - low bend near `[-14.05, 0.18, 0.82]`
     - mixer input near `[-13.16, 0.70, 1.75]`

2. Snare Mic -> Drum Mixer Snare
   - Color: `phaseVisuals.gridSecondary`
   - Suggested points:
     - Snare mic output near `[-14.90, 0.84, 0.72]`
     - bend near `[-14.45, 0.42, 1.04]`
     - mixer input near `[-13.16, 0.70, 1.75]`, slightly offset from the Kick endpoint.

3. Hat Mic -> Drum Mixer Hat
   - Color: `phaseVisuals.gridPrimary`
   - Suggested points:
     - Hat mic output near `[-15.40, 1.10, 0.80]`
     - bend near `[-14.88, 0.58, 1.10]`
     - mixer input near `[-13.16, 0.70, 1.75]`, slightly offset from the Snare endpoint.

4. Overhead L -> Drum Mixer OH L
   - Color: `#e9fbff`
   - Suggested points:
     - OH L mic output near `[-14.97, 1.62, 1.30]`
     - high bend near `[-14.40, 1.52, 1.88]`
     - mixer input near `[-13.16, 0.70, 1.75]`.

5. Overhead R -> Drum Mixer OH R
   - Color: `#e9fbff`
   - Suggested points:
     - OH R mic output near `[-13.73, 1.62, 1.30]`
     - high bend near `[-13.45, 1.42, 1.85]`
     - mixer input near `[-13.16, 0.70, 1.75]`.

6. Drum Mixer Out -> Audio Interface IN 1
   - Color: `#57f3ff` or `phaseVisuals.gridPrimary`
   - Suggested points:
     - Drum Mixer output near `[-13.16, 0.72, 1.78]`
     - floor run bend near `[-14.1, 0.12, 0.2]`
     - floor run bend near `[-18.5, 0.12, -3.2]`
     - Audio Interface input 1 near `[-21.45, 0.92, -5.30]`
   - This should be the longest visibly important cable. Keep the middle mostly floor-hugging.

7. Piano Out -> Audio Interface IN 2
   - Color: `#73ff4c`
   - Add a required static `Piano Out` jack/ring near the piano right/rear edge.
   - Suggested points:
     - Piano output jack near `[-15.65, 0.86, -1.35]`
     - floor bend near `[-16.8, 0.12, -2.6]`
     - floor bend near `[-19.2, 0.12, -4.4]`
     - Audio Interface input 2 near `[-21.45, 0.92, -5.15]`

8. Audio Interface Out -> Speaker System
   - Color: `#e9fbff` or `phaseVisuals.gridSecondary`
   - Suggested points:
     - Audio Interface output near `[-21.10, 0.92, -4.85]`
     - floor bend near `[-19.0, 0.12, -3.6]`
     - floor bend near `[-15.6, 0.12, 1.2]`
     - speaker panel input area near `[-14.35, 1.02, 2.36]`

Placement and readability:

- Keep mic cables compact around the drum kit.
- Keep long room-spanning cables mostly low/floor-hugging.
- Use different stable cable colors by source type:
  - Kick/drum hardware: amber.
  - Snare/hat: existing cyan/green accents.
  - Drum Mixer out: cyan/blue.
  - Piano: green.
  - Interface out/speakers: pale white/cyan.
- Do not cover existing clickable drum heads, piano keys, DAW controls, Audio Interface labels, Drum Mixer labels, or speaker display labels.
- Do not route cables through the center of control surfaces.
- Top-down view should show the high-level flow:
  - drum mics gather into the Drum Mixer.
  - Drum Mixer and Piano route toward the Audio Interface.
  - Audio Interface routes toward the speaker system.
- First-person view should show decorative plugs at meaningful endpoints without making them look clickable.

### Checklist Items Achieved

- [x] Static visual cable geometry appears in the Recording Studio.
- [x] Visible default mic-to-mixer cables exist for Kick, Snare, Hat, Overhead L, and Overhead R.
- [x] Drum Mixer Out routes visually to Audio Interface input 1.
- [x] Piano Out routes visually to Audio Interface input 2.
- [x] Audio Interface Out routes visually to the speaker system.
- [x] Static `Piano Out` jack/ring and label exist on the piano.
- [x] Cable endpoints have decorative plug/bead visuals.
- [x] Cable colors are stable and readable by source type.
- [x] Cables are visual-only and do not add interaction affordances.
- [x] No patch graph/state, cable state, drag behavior, audio routing/gating, sync, SoundCloud changes, or collision changes were added.

### Completed Implementation

Added local static cable helpers in `src/3d/Level1RecordingStudioRoom.tsx` and rendered decorative starter patch cables for the drum mics, Drum Mixer, piano, Audio Interface, and speaker system.

The manager review adjusted the helper from box strips to rounded cylinder segments so the static runs read more like wires while remaining local, decorative, and noninteractive.

Also added a static `Piano Out` jack/ring and label on the piano so the piano default cable visibly starts from a real output point.

### Acceptance Criteria

- Static visual cable geometry appears in the Recording Studio.
- Visible default mic-to-mixer cables exist for Kick, Snare, Hat, Overhead L, and Overhead R.
- A visible Drum Mixer Out cable routes to Audio Interface input 1.
- A visible Piano Out cable routes to Audio Interface input 2.
- A visible Audio Interface Out cable routes to the speaker system.
- A required static `Piano Out` jack/ring exists and the piano cable connects to it visually.
- Cable endpoints have decorative plug/ring visuals.
- Cable colors are stable and readable by source type.
- Cables are visual-only and do not respond to clicks.
- Cables clearly read as a starter patch plan only, not real routing or current connection truth.
- No `useRegisterInteractable`, invisible hitboxes, hover affordances, or click handling are added.
- No patch graph/state, cable state, interactions, drag behavior, audio routing/gating, sync, SoundCloud changes, or collision changes are added.
- Existing drum kit, piano, DAW, Audio Interface, Drum Mixer, and speaker behaviors remain unchanged.

### Build And Manual Checks

- Worker ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Manager ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Browser/manual visual checks are pending and will be consolidated in the recovery/usability pass.
- Manual check still needed: enter Recording Studio and confirm the default starter patch plan is understandable.
- Manual check still needed: confirm cables do not hide or block drum heads, piano keys, mixer controls, Audio Interface labels, DAW controls, or speaker labels.
- Manual check still needed: confirm static cables are not clickable and do not create hover/reticle affordances.
- Manual check still needed: confirm existing drum, piano, DAW, and audio controls still work.
- Manual check still needed: confirm cable paths are visible and readable from top-down view.
- Manual check still needed: confirm no SoundCloud, sync, or audio behavior changed.
- Original planned check: Run `npm.cmd run build`.
- Manual first-person checks:
  - Enter Recording Studio and confirm the default starter patch plan is understandable.
  - Confirm cables do not hide or block drum heads, piano keys, mixer controls, Audio Interface labels, DAW controls, or speaker labels.
  - Confirm static cables are not clickable and do not create hover/reticle affordances.
  - Confirm existing drum, piano, DAW, and audio controls still work.
- Manual top-down checks:
  - Confirm cable paths are visible and readable from above.
  - Confirm long room-spanning runs do not become a confusing pile through the center of the room.
- Confirm no SoundCloud, sync, or audio behavior changed.

### Risks

- Cable clutter is the main risk. The drum area already has five mics, a mixer, and drum pieces.
- World-space endpoint estimates may need adjustment during implementation to avoid covering existing controls and labels.
- Segment-based cylinders can look angular. This is acceptable for V5-3 if bends are intentional and tidy.
- Importing Three.js vector/quaternion helpers may add complexity; keep any math local and minimal.
- Static cables may accidentally suggest live routing. Use default/decorative visual language only and avoid active/connected/patched semantics.
- Long floor cables may look like collision boundaries. Keep them thin, low, and visually decorative.

### Wishlist Mapping

Directly targets Patch Cables:

- Add curved/wiggly cable geometry between connected ports.
- Use stable cable colors by source type.
- Add visible plug ends at both cable endpoints.
- Keep cables readable in both first-person and top-down views.

Directly targets Default Connections:

- Start with default visual cables from drum mics into the Drum Mixer.
- Start with a default cable from Drum Mixer Out to Audio Interface Input 1.
- Start with a default cable from Piano Out to Audio Interface Input 2.
- Start with a default cable from Audio Interface Out to the speaker system.
- Keep defaults local-only until a shared patch-state design exists.

Defers:

- Make unplugged cable ends visibly hang, float, or rest near the source.
- Add reticle-follow behavior for the actively carried plug.
- Add hover highlighting for compatible ports.
- Add rejected-target feedback for incompatible ports.
- Make default connections easy to reset if the user makes a mess.

### Non-Goals

- No patch graph or patch node/port/cable state.
- No port registration helpers.
- No hover highlighting.
- No invalid target feedback.
- No click-to-unplug or click-to-connect.
- No cable dragging or reticle-follow preview.
- No cable reset behavior.
- No real routing, patch truth, current connection state, audio routing, or audio gating.
- No SoundCloud or raw audio processing.
- No sync/session changes.
- No collision changes.
- No V5-4 or V5-5 infrastructure.
- No changelog edits.

## V5-4: Local Patch Node/Port/Cable State Model

Status: `[x]` completed and manager-verified.

### Summary

Introduce a local-only patch node, port, and cable state model that represents the starter patch plan already shown by V5-1 through V5-3 visuals.

V5-4 is state-only by default. It should add TypeScript types, initial local state, pure helpers, and one reset action for later phases. It must not change visible cable rendering, audio behavior, sync behavior, SoundCloud behavior, or interactions.

### Implementation Spec

Expected files to touch:

- `src/3d/useLocalDawState.ts`
  - Add local patch model types.
  - Add a `patch` slice to `LocalDawState`.
  - Initialize default local patch state in `createInitialLocalDawState`.
  - Add pure lookup/validation helpers.
  - Add `resetPatchToDefaults` as the only new `LocalDawActions` action.

Files to avoid:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - Do not wire room visuals to patch state in V5-4.
  - V5-3 static cables should remain visually unchanged.
- `docs/3d/3dvision5.md` outside this V5-4 section and existing status markers.
- `changelog.md`.
- `src/3d/useLocalDawAudioEngine.ts`.
- Sync/session/server files.
- `src/types/session.ts`.
- SoundCloud or jukebox code.
- `src/3d/levels/level1.ts`.
- Interaction/raycast/controller files.

Tiny build-forced exceptions:

- If TypeScript/build forces a small import/type adjustment outside `src/3d/useLocalDawState.ts`, keep it minimal and behavior-free.
- Do not use this exception to wire visuals, sync, audio, or interactions.

### TypeScript Shape

Add exported patch types in `src/3d/useLocalDawState.ts` near the existing DAW type exports:

```ts
export type PatchNodeKind =
  | "instrument"
  | "microphone"
  | "submixer"
  | "audio-interface"
  | "speaker";

export type PatchPortKind = "input" | "output";

export type PatchCableState = "plugged" | "dragging" | "loose";

export interface LocalPatchNode {
  id: string;
  kind: PatchNodeKind;
  label: string;
}

export interface LocalPatchPort {
  id: string;
  nodeId: string;
  kind: PatchPortKind;
  label: string;
  accepts?: PatchNodeKind[];
}

export interface LocalPatchCable {
  id: string;
  label: string;
  fromPortId: string | null;
  toPortId: string | null;
  state: PatchCableState;
  color: string;
}

export interface LocalPatchState {
  nodes: LocalPatchNode[];
  ports: LocalPatchPort[];
  cables: LocalPatchCable[];
  activeCableId: string | null;
}
```

Add to `LocalDawState`:

```ts
patch: LocalPatchState;
```

Add to `LocalDawActions`:

```ts
resetPatchToDefaults: () => void;
```

Do not store world positions in V5-4 patch state. V5-5 owns port registration and positions.

### Default Nodes

Create `createInitialLocalPatchState(): LocalPatchState` with these default nodes:

- `piano`: kind `instrument`, label `Piano`
- `kick-mic`: kind `microphone`, label `Kick Mic`
- `snare-mic`: kind `microphone`, label `Snare Mic`
- `hat-mic`: kind `microphone`, label `Hat Mic`
- `overhead-left-mic`: kind `microphone`, label `Overhead L Mic`
- `overhead-right-mic`: kind `microphone`, label `Overhead R Mic`
- `drum-mixer`: kind `submixer`, label `Drum Mixer`
- `audio-interface`: kind `audio-interface`, label `Audio Interface`
- `speaker-system`: kind `speaker`, label `Speaker System`

### Default Ports

Create ports that match V5-1, V5-2, and V5-3 labels:

- `piano-out`: node `piano`, kind `output`, label `Piano Out`
- `kick-mic-out`: node `kick-mic`, kind `output`, label `Kick Out`
- `snare-mic-out`: node `snare-mic`, kind `output`, label `Snare Out`
- `hat-mic-out`: node `hat-mic`, kind `output`, label `Hat Out`
- `overhead-left-mic-out`: node `overhead-left-mic`, kind `output`, label `OH L Out`
- `overhead-right-mic-out`: node `overhead-right-mic`, kind `output`, label `OH R Out`
- `drum-mixer-kick-in`: node `drum-mixer`, kind `input`, label `Kick`, accepts `["microphone"]`
- `drum-mixer-snare-in`: node `drum-mixer`, kind `input`, label `Snare`, accepts `["microphone"]`
- `drum-mixer-hat-in`: node `drum-mixer`, kind `input`, label `Hat`, accepts `["microphone"]`
- `drum-mixer-overhead-left-in`: node `drum-mixer`, kind `input`, label `OH L`, accepts `["microphone"]`
- `drum-mixer-overhead-right-in`: node `drum-mixer`, kind `input`, label `OH R`, accepts `["microphone"]`
- `drum-mixer-out`: node `drum-mixer`, kind `output`, label `Mix Out`
- `audio-interface-input-1`: node `audio-interface`, kind `input`, label `IN 1`, accepts `["instrument", "submixer", "microphone"]`
- `audio-interface-input-2`: node `audio-interface`, kind `input`, label `IN 2`, accepts `["instrument", "submixer", "microphone"]`
- `audio-interface-input-3`: node `audio-interface`, kind `input`, label `IN 3`, accepts `["instrument", "submixer", "microphone"]`
- `audio-interface-input-4`: node `audio-interface`, kind `input`, label `IN 4`, accepts `["instrument", "submixer", "microphone"]`
- `audio-interface-out`: node `audio-interface`, kind `output`, label `OUT`
- `speaker-system-input`: node `speaker-system`, kind `input`, label `Speaker In`, accepts `["audio-interface"]`

### Default Cables

Default patch cables must preserve exact V5-3 cable IDs:

- `kick-mic-to-drum-mixer`: `kick-mic-out` -> `drum-mixer-kick-in`, state `plugged`, color `#f8d36a`
- `snare-mic-to-drum-mixer`: `snare-mic-out` -> `drum-mixer-snare-in`, state `plugged`, color `#57f3ff`
- `hat-mic-to-drum-mixer`: `hat-mic-out` -> `drum-mixer-hat-in`, state `plugged`, color `#73ff4c`
- `overhead-left-to-drum-mixer`: `overhead-left-mic-out` -> `drum-mixer-overhead-left-in`, state `plugged`, color `#e9fbff`
- `overhead-right-to-drum-mixer`: `overhead-right-mic-out` -> `drum-mixer-overhead-right-in`, state `plugged`, color `#e9fbff`
- `drum-mixer-out-to-interface-one`: `drum-mixer-out` -> `audio-interface-input-1`, state `plugged`, color `#57f3ff`
- `piano-out-to-interface-two`: `piano-out` -> `audio-interface-input-2`, state `plugged`, color `#73ff4c`
- `interface-out-to-speakers`: `audio-interface-out` -> `speaker-system-input`, state `plugged`, color `#e9fbff`

Set `activeCableId` to `null`.

### Local Helpers

Add pure helper exports for later phases:

- `createInitialLocalPatchState(): LocalPatchState`
- `getPatchPortById(patch: LocalPatchState, portId: string): LocalPatchPort | undefined`
- `getPatchCableById(patch: LocalPatchState, cableId: string): LocalPatchCable | undefined`
- `getPatchCableForPort(patch: LocalPatchState, portId: string): LocalPatchCable | undefined`
- `isPatchOutputPort(port: LocalPatchPort): boolean`
- `isPatchInputPort(port: LocalPatchPort): boolean`
- `canConnectPatchPorts(patch: LocalPatchState, fromPortId: string, toPortId: string): boolean`

`canConnectPatchPorts` should be pure and side-effect free. It should validate:

- both ports exist.
- one side is an output and one side is an input.
- input `accepts` allows the output node kind when `accepts` is provided.
- same-node connections are rejected.

Do not add state-mutating connect, disconnect, unplug, drag, hover, or reticle actions in V5-4.

### Local Action

Add only one new action to `LocalDawActions`:

- `resetPatchToDefaults`
  - Sets `patch` to `createInitialLocalPatchState()`.
  - Does not change transport, clips, audio, selected station, visual cables, or sync state.

No other patch mutation actions should be added in V5-4.

### Local-Only Boundary

Patch state must remain local-only:

- Store `patch` only inside `LocalDawState` returned by `useLocalDawState`.
- Do not include patch state in any `SharedDaw...` type.
- Do not touch `applySharedTransportSnapshot`.
- Do not touch `applySharedClipsSnapshot` except if TypeScript requires preserving existing state shape.
- Do not include patch state in shared clip publish payloads.
- Do not send patch state through `wsSyncClient`, `mockSyncClient`, session state, or server payloads.
- Do not touch sync/session/server files.
- Do not touch SoundCloud/jukebox files.
- Do not touch audio engine files.

### Visual Wiring

Do not wire `Level1RecordingStudioRoom.tsx` visuals to the patch state in V5-4.

V5-3 static cables should remain visually unchanged and decorative. V5-4 creates state that represents those defaults, but visual cable truth, port registration, hover state, and connection status are later phases.

### Checklist Items Achieved

- [x] `LocalDawState` includes a local `patch` slice.
- [x] Initial local state contains nodes, ports, and cables for Piano, drum mics, Drum Mixer, Audio Interface, and Speaker System.
- [x] Default cables represent the V5-3 starter patch plan.
- [x] Default cable IDs exactly match V5-3 visual cable IDs.
- [x] Patch IDs are stable and suitable for later visual mapping.
- [x] `resetPatchToDefaults` is the only new `LocalDawActions` action.
- [x] `canConnectPatchPorts` exists as a pure helper.
- [x] Pure lookup helpers exist for later phases.
- [x] No world positions are stored in patch state.
- [x] No `Level1RecordingStudioRoom.tsx` visual wiring was added.
- [x] No sync/session/server, SoundCloud/jukebox, audio engine, collision, interaction/controller, or room visual files were changed.

### Completed Implementation

Added exported local patch model types and a deterministic `createInitialLocalPatchState()` in `src/3d/useLocalDawState.ts`.

The default graph represents Piano, five drum mics, Drum Mixer, Audio Interface, and Speaker System, with default cable IDs matching the V5-3 static cable IDs.

Added pure lookup/validation helpers including `canConnectPatchPorts`, plus the single local action `resetPatchToDefaults`. The phase intentionally did not wire visuals to the patch state, did not store world positions, and did not add any cable interaction behavior.

### Acceptance Criteria

- `LocalDawState` includes a local `patch` slice.
- Initial local state contains nodes, ports, and cables for Piano, drum mics, Drum Mixer, Audio Interface, and Speaker System.
- Default cables represent the exact V5-3 starter patch plan.
- Default cable IDs exactly match V5-3 visual cable IDs.
- Patch IDs are stable and suitable for later visual mapping.
- `resetPatchToDefaults` is the only new `LocalDawActions` action.
- `canConnectPatchPorts` exists as a pure helper.
- Pure lookup helpers exist for later phases.
- No world positions are stored in patch state.
- No `Level1RecordingStudioRoom.tsx` visual wiring is added.
- V5-3 static cables remain visually unchanged.
- No sync/session/server files are touched.
- No SoundCloud/jukebox files are touched.
- No audio engine routing/gating changes are made.
- No click, drag, hover, reticle, or cable interaction behavior is implemented.
- Existing V5-1, V5-2, and V5-3 visuals remain behaviorally unchanged.

### Build And Manual Checks

- Worker ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Manager ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Browser/manual visual checks are pending and will be consolidated in the recovery/usability pass.
- Manual browser check is optional for this phase because there should be no visible behavior change.
- Source review confirmed the implementation stayed local-only in `src/3d/useLocalDawState.ts`.
- Original planned check: Run `npm.cmd run build`.
- TypeScript should confirm all `LocalDawState` construction and action object updates are complete.
- Manual browser check is optional because V5-4 should not visibly change behavior.
- If a manual check is performed:
  - Recording Studio still renders.
  - Existing static cables still appear.
  - Existing drum, piano, DAW, Audio Interface, Drum Mixer, and speaker visuals still appear.
  - Existing drum, piano, DAW, and audio controls still work.
  - No new hover/click affordances appear on cables or ports.

### Risks

- Expanding `LocalDawState` can require updates anywhere full state literals are constructed.
- Poor ID naming now will make V5-5 and V5-6 harder. Keep IDs semantic and aligned with V5-3.
- Adding interaction actions early could invite scope creep. V5-4 must stay state-only.
- Storing world positions now would conflict with V5-5 ownership. Leave positions out.
- Wiring visuals now could accidentally create "truth" semantics before port registration and status phases.

### Wishlist Mapping

Directly supports:

- Make default connections easy to reset if the user makes a mess.
- Make new instruments register patch nodes and ports through shared helpers.
- Support future user-created or spawned cables.

Prepares:

- Click a plugged cable end to unplug it.
- Carry a cable plug with the reticle.
- Click a valid port to plug it in.
- Prevent both ends of one cable from plugging into inputs or outputs incorrectly.
- Support moving one cable from one interface input to another.
- Instrument and mixer connection status lights.

### Non-Goals

- No shared patch state.
- No sync/session/server changes.
- No SoundCloud or raw audio processing.
- No audio routing/gating.
- No Web Audio graph changes.
- No cable dragging.
- No click-to-unplug or click-to-connect.
- No hover highlighting.
- No invalid target feedback.
- No reticle-follow preview.
- No port registration or world-position tracking.
- No status lights or instrument connected/not-patched feedback.
- No visual cable removal/reconnection behavior.
- No changes to V5-3 static cable visuals.
- No V5-5 or V5-6 implementation.
- No changelog edits.

## V5-5: Port Registration Helpers For Future Instruments

Status: `[x]` completed and manager-verified.

### Summary

Add a small registry-only module that maps V5-4 patch port IDs to stable world-space positions for the completed V5-1 through V5-3 visual objects.

V5-5 is foundation work for later dynamic cable rendering, click targets, hover feedback, and future instruments. It must not change current visuals or behavior.

### Implementation Spec

Expected files to touch:

- `src/3d/patchPortRegistration.ts`
  - Add exported registration types.
  - Add a default Level 1 Recording Studio port registration list.
  - Add pure lookup and cable endpoint helpers.

Files to avoid:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - Do not wire the room visuals to the registry in V5-5.
  - V5-3 static cable visuals should remain unchanged.
- `src/3d/useLocalDawState.ts`
  - Do not add world positions to patch state.
  - Do not add patch mutation actions.
- `docs/3d/3dvision5.md` outside this V5-5 section and existing status markers.
- `changelog.md`.
- `src/3d/useLocalDawAudioEngine.ts`.
- Sync/session/server files.
- SoundCloud or jukebox code.
- `src/3d/levels/level1.ts`.
- Interaction/raycast/controller files.
- Collision files.

Module ownership:

- Keep world-space port registration out of `useLocalDawState.ts`.
- Keep the registry as a new pure helper module.
- The registry may import V5-4 patch types as type-only imports if helpful.
- Do not add React hooks, React context, runtime registration effects, state mutation, or side effects in V5-5.

Suggested type shape:

```ts
export type PatchPortWorldPosition = readonly [number, number, number];

export type PatchPortRegistrationKind =
  | "instrument-output"
  | "mic-output"
  | "mixer-input"
  | "mixer-output"
  | "interface-input"
  | "interface-output"
  | "speaker-input";

export interface PatchPortRegistration {
  portId: string;
  label: string;
  kind: PatchPortRegistrationKind;
  worldPosition: PatchPortWorldPosition;
  visualRadius: number;
}

export type PatchPortRegistrationMap = Record<string, PatchPortRegistration>;
```

Suggested exports:

```ts
export const LEVEL1_PATCH_PORT_REGISTRATIONS: readonly PatchPortRegistration[];
export const LEVEL1_PATCH_PORT_REGISTRATION_MAP: PatchPortRegistrationMap;
```

Suggested pure helpers:

```ts
export function createPatchPortRegistrationMap(
  registrations: readonly PatchPortRegistration[],
): PatchPortRegistrationMap;

export function getPatchPortRegistration(
  portId: string,
  registrations?: PatchPortRegistrationMap,
): PatchPortRegistration | undefined;

export function getPatchPortWorldPosition(
  portId: string,
  registrations?: PatchPortRegistrationMap,
): PatchPortWorldPosition | undefined;

export function getPatchCableWorldEndpoints(
  cable: { fromPortId: string | null; toPortId: string | null },
  registrations?: PatchPortRegistrationMap,
):
  | {
      from: PatchPortWorldPosition;
      to: PatchPortWorldPosition;
    }
  | undefined;
```

`getPatchCableWorldEndpoints` must safely return `undefined` when either cable port ID is `null` or unregistered.

Register these first ports:

- `piano-out`
  - Label: `Piano Out`
  - Kind: `instrument-output`
  - Position: `[-15.65, 0.86, -1.35]`
- `kick-mic-out`
  - Label: `Kick Mic Out`
  - Kind: `mic-output`
  - Position: `[-14.35, 0.50, 0.58]`
- `snare-mic-out`
  - Label: `Snare Mic Out`
  - Kind: `mic-output`
  - Position: `[-14.90, 0.84, 0.72]`
- `hat-mic-out`
  - Label: `Hat Mic Out`
  - Kind: `mic-output`
  - Position: `[-15.40, 1.10, 0.80]`
- `overhead-left-mic-out`
  - Label: `OH L Mic Out`
  - Kind: `mic-output`
  - Position: `[-14.97, 1.62, 1.30]`
- `overhead-right-mic-out`
  - Label: `OH R Mic Out`
  - Kind: `mic-output`
  - Position: `[-13.73, 1.62, 1.30]`
- `drum-mixer-kick-in`
  - Label: `Kick In`
  - Kind: `mixer-input`
  - Position: `[-13.18, 0.70, 1.72]`
- `drum-mixer-snare-in`
  - Label: `Snare In`
  - Kind: `mixer-input`
  - Position: `[-13.08, 0.70, 1.72]`
- `drum-mixer-hat-in`
  - Label: `Hat In`
  - Kind: `mixer-input`
  - Position: `[-12.98, 0.70, 1.74]`
- `drum-mixer-overhead-left-in`
  - Label: `OH L In`
  - Kind: `mixer-input`
  - Position: `[-13.18, 0.78, 1.84]`
- `drum-mixer-overhead-right-in`
  - Label: `OH R In`
  - Kind: `mixer-input`
  - Position: `[-13.02, 0.78, 1.86]`
- `drum-mixer-out`
  - Label: `Drum Mix Out`
  - Kind: `mixer-output`
  - Position: `[-13.16, 0.72, 1.78]`
- `audio-interface-input-1`
  - Label: `IN 1`
  - Kind: `interface-input`
  - Position: `[-21.45, 0.92, -5.30]`
- `audio-interface-input-2`
  - Label: `IN 2`
  - Kind: `interface-input`
  - Position: `[-21.45, 0.92, -5.15]`
- `audio-interface-input-3`
  - Label: `IN 3`
  - Kind: `interface-input`
  - Position: `[-21.45, 0.92, -5.00]`
- `audio-interface-input-4`
  - Label: `IN 4`
  - Kind: `interface-input`
  - Position: `[-21.45, 0.92, -4.85]`
- `audio-interface-out`
  - Label: `OUT`
  - Kind: `interface-output`
  - Position: `[-21.10, 0.92, -4.85]`
- `speaker-system-input`
  - Label: `Speaker In`
  - Kind: `speaker-input`
  - Position: `[-14.35, 1.02, 2.36]`

Keep V5-3 static visuals unchanged:

- Do not change `StudioStaticPatchCables`.
- Do not change cable geometry, labels, lights, object placement, or render order.
- Treat the registry as later-phase infrastructure only.
- Do not add dynamic rendering from the registry in V5-5.

### Checklist Items Achieved

- [x] `src/3d/patchPortRegistration.ts` exists as a small pure helper module.
- [x] The module exports registration types and pure lookup helpers.
- [x] The module registers Piano Out, all drum mic outs, all Drum Mixer inputs/out, Audio Interface inputs 1-4, `audio-interface-out`, and Speaker In.
- [x] Registered positions align with the completed V5-1, V5-2, and V5-3 visual endpoints.
- [x] `getPatchCableWorldEndpoints` returns endpoints for fully registered cables.
- [x] `getPatchCableWorldEndpoints` returns `undefined` for null or unregistered endpoints.
- [x] No world positions were added to V5-4 patch state.
- [x] No `Level1RecordingStudioRoom.tsx` visual wiring was added.
- [x] No dynamic rendering, sync/session/server, SoundCloud/jukebox, audio engine, collision, or interaction behavior was added.

### Completed Implementation

Created `src/3d/patchPortRegistration.ts` with Level 1 Recording Studio port registrations and pure helpers for later dynamic cable rendering and hit target phases.

The registry maps the V5-4 semantic port IDs to stable world positions that match the V5-3 static cable endpoints, including the exact `audio-interface-out` ID.

The implementation is pure data/helper infrastructure only: no React hooks, no state mutation, no room visual wiring, and no interaction behavior.

### Acceptance Criteria

- `src/3d/patchPortRegistration.ts` exists as a small pure helper module.
- The module exports registration types and pure lookup helpers.
- The module includes all required first port registrations:
  - Piano Out.
  - Kick, Snare, Hat, Overhead Left, and Overhead Right mic outs.
  - Drum Mixer Kick, Snare, Hat, Overhead Left, and Overhead Right inputs.
  - Drum Mixer output.
  - Audio Interface inputs 1 through 4.
  - `audio-interface-out`.
  - Speaker input.
- Registered world-space positions align with the completed V5-1, V5-2, and V5-3 visuals.
- `getPatchCableWorldEndpoints` returns endpoints for fully registered cables.
- `getPatchCableWorldEndpoints` returns `undefined` when either endpoint port ID is `null`.
- `getPatchCableWorldEndpoints` returns `undefined` when either endpoint port ID is unregistered.
- No world positions are added to V5-4 patch state.
- No `Level1RecordingStudioRoom.tsx` visual wiring is added.
- V5-3 static cable visuals remain unchanged.
- No dynamic cable rendering is added.
- No sync/session/server files are touched.
- No SoundCloud/jukebox files are touched.
- No audio engine routing/gating changes are made.
- No click, drag, hover, reticle, hitbox, or cable interaction behavior is implemented.

### Build And Manual Checks

- Worker ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Manager ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Browser/manual visual checks are pending and will be consolidated in the recovery/usability pass.
- Manual browser check is optional for this phase because there should be no visible behavior change.
- Source review confirmed the implementation is registry-only and pure.
- Original planned check: Run `npm.cmd run build`.
- TypeScript should confirm the new module exports and helper signatures compile.
- Manual browser check is optional because V5-5 should not visibly change behavior.
- If a manual check is performed:
  - Recording Studio still renders.
  - Existing static cables still appear unchanged.
  - Existing drum, piano, DAW, Audio Interface, Drum Mixer, and speaker visuals still appear.
  - Existing drum, piano, DAW, and audio controls still work.
  - No new hover/click/drag/reticle affordances appear on cables or ports.

### Risks

- Hand-maintained world positions can drift if the room visuals move later.
- Audio Interface input 3 and input 4 positions are inferred from the existing interface layout because V5-3 visible default cables currently use inputs 1 and 2.
- A registry-only module will not visibly prove itself until later phases wire dynamic cable rendering or hit targets to it.
- Adding runtime registration too early could blur ownership between static layout, local patch state, and future interactions. Keep V5-5 static and pure.

### Wishlist Mapping

Directly supports:

- Make new instruments register patch nodes and ports through shared helpers.
- Support future user-created or spawned cables.
- Keep cables readable in both first-person and top-down views.

Prepares:

- Click a plugged cable end to unplug it.
- Carry a cable plug with the reticle.
- Click a valid port to plug it in.
- Add hover highlighting for compatible ports.
- Add rejected-target feedback for incompatible ports.
- Add reticle-follow behavior for the actively carried plug.
- Support moving one cable from one interface input to another.
- Add instrument and mixer connection status lights.

### Non-Goals

- No source changes outside the new registry module unless TypeScript build requirements force a behavior-free adjustment.
- No `Level1RecordingStudioRoom.tsx` changes.
- No `useLocalDawState.ts` behavior changes.
- No world positions in patch state.
- No React hooks.
- No runtime registration effects.
- No dynamic cable rendering.
- No invisible hitboxes.
- No hover highlighting.
- No click handling.
- No drag handling.
- No reticle-follow preview.
- No patch connect/disconnect mutation actions.
- No audio routing/gating.
- No sync/session/server changes.
- No SoundCloud, jukebox, raw audio, or audio engine changes.
- No collision changes.
- No changelog edits.

## V5-6: Click-To-Unplug And Click-To-Connect Local Cable Interactions

Status: `[x]` completed and manager-verified.

### Summary

Make the local V5-4 patch graph editable from the room for the first time.

V5-6 should keep interaction modest: click a visible cable-end target to unplug that cable locally, then click a compatible visible port target to reconnect the active loose cable. This phase must not add reticle-follow preview, drag visuals, hover glow, invalid-target feedback beyond target enabled/disabled, audio routing/gating, sync, SoundCloud, raw audio processing, collision changes, or changes to the base interaction system.

### Implementation Spec

Expected files to touch:

- `src/3d/useLocalDawState.ts`
  - Add pure patch helpers for active cable and port occupancy checks.
  - Add local patch mutation actions for unplug and connect.
  - Keep all patch state local.
- `src/3d/Level1RecordingStudioRoom.tsx`
  - Add small cable-end and port target components using the existing interactable system.
  - Make visible cable geometry state-aware so loose cables are not still displayed as fully connected.
- `src/3d/patchPortRegistration.ts`
  - Touch only if a tiny pure helper is needed.

Files to avoid:

- `src/3d/interactions.tsx`
  - Use the existing `useRegisterInteractable` system. Do not change the base interaction system.
- `docs/3d/3dvision5.md` outside this V5-6 section and existing status markers.
- `changelog.md`.
- `src/3d/useLocalDawAudioEngine.ts`.
- Sync/session/server files.
- SoundCloud, jukebox, or raw audio files.
- `src/3d/levels/level1.ts`.
- Collision/controller files.

Reuse existing state shape:

- `LocalPatchCable.fromPortId: string | null`
- `LocalPatchCable.toPortId: string | null`
- `LocalPatchCable.state: "plugged" | "dragging" | "loose"`
- `LocalPatchState.activeCableId: string | null`

No new persistent state field should be required for V5-6 if actions keep the active loose cable as the cable with exactly one `null` endpoint.

Add pure helpers such as:

```ts
export function isPatchPortOccupied(
  patch: LocalPatchState,
  portId: string,
  ignoredCableId?: string,
): boolean;

export function getActivePatchCable(patch: LocalPatchState): LocalPatchCable | undefined;

export function canConnectActivePatchCableToPort(
  patch: LocalPatchState,
  portId: string,
): boolean;
```

`canConnectActivePatchCableToPort` should:

- Require `activeCableId`.
- Require the active cable to have exactly one connected endpoint and one `null` endpoint.
- Use the remaining connected port plus the target port.
- Call existing `canConnectPatchPorts`.
- Reject occupied target ports unless the occupation belongs to the active cable.
- Reject input-to-input, output-to-output, incompatible `accepts`, same-node, missing port, and missing node cases.

Add actions to `LocalDawActions`:

```ts
unplugPatchCableEnd: (cableId: string, portId: string) => void;
connectActivePatchCableToPort: (portId: string) => void;
```

`unplugPatchCableEnd(cableId, portId)` behavior:

- Find the cable.
- If `portId` matches `fromPortId`, set `fromPortId: null`.
- If `portId` matches `toPortId`, set `toPortId: null`.
- Set that cable `state: "loose"`.
- Set `patch.activeCableId` to the newly unplugged cable ID.
- If another cable was already active, leave that previously loose cable loose but inactive.
- Do not force reconnect the previous active cable.
- Do not clear or reconnect the previous active cable.
- Leave all other patch, transport, audio, sync, and visual state unchanged.
- If the cable/port does not match, no-op.

`connectActivePatchCableToPort(portId)` behavior:

- Find `patch.activeCableId`.
- Affect only the active cable.
- Require exactly one remaining connected endpoint.
- Validate with `canConnectActivePatchCableToPort`.
- Normalize the result so output ports land in `fromPortId` and input ports land in `toPortId`.
- Set the active cable `state: "plugged"`.
- Clear `activeCableId`.
- Invalid clicks should no-op and keep the active cable active/loose.

Do not add `dragging` behavior in V5-6. V5-7 owns reticle-follow preview and carried loose-end visuals.

Clickable cable-end targets:

- Use `useRegisterInteractable` with existing patterns.
- Render a small visible target at registered endpoint world positions for each non-null endpoint of each cable.
- Use V5-5 `LEVEL1_PATCH_PORT_REGISTRATION_MAP`.
- Register each target as `modes: ["clickable"]`.
- `onActivate` calls `localDawActions.unplugPatchCableEnd(cable.id, portId)`.
- Use visible collars, dots, or rings rather than invisible-only hitboxes.
- Keep target sizing modest enough not to interfere with nearby drum, piano, DAW, and audio controls.

Clickable port targets:

- Render registered port targets only while `localDawState.patch.activeCableId` is set.
- Enable a port target only if `canConnectActivePatchCableToPort(localDawState.patch, portId)` returns true.
- `onActivate` calls `localDawActions.connectActivePatchCableToPort(portId)`.
- Use visible dots/rings and enabled/disabled presence as the only validity feedback.
- Do not add hover glow.
- Do not add invalid-target feedback.
- Do not add reticle-follow line or carried cable preview.

State-aware cable visuals:

- V5-6 must prevent loose cables from still displaying as fully connected.
- Keep the existing `StudioStaticPatchCable` geometry renderer if possible.
- Make `StudioStaticPatchCables` read from `localDawState.patch`.
- Render only cables with `state === "plugged"` and endpoints that resolve through `getPatchCableWorldEndpoints`.
- Hide loose cables until V5-7 adds carried loose-end preview.
- Preserve default cable middle bends for default cable IDs where possible.
- For reconnected cables that no longer match a default path, use a simple, readable, low/floor-hugging fallback path between registered endpoints.
- Keep cable language and visuals local-only. They represent local patch state, not shared truth or audio routing.

### Checklist Items Achieved

- [x] Clicking a visible plugged cable-end target locally unplugs that cable.
- [x] The unplugged cable becomes `patch.activeCableId`.
- [x] If another cable was already active, a newly unplugged cable becomes active and the previous loose cable stays loose/inactive.
- [x] Loose cables are no longer displayed as fully connected.
- [x] Clicking a compatible visible port target reconnects only the active cable.
- [x] A successful reconnect sets the active cable `state` to `plugged` and clears `activeCableId`.
- [x] Invalid reconnect clicks no-op and keep the active cable active/loose.
- [x] Input-to-input, output-to-output, incompatible `accepts`, occupied target, and same-node connections are prevented.
- [x] Plugged cable visuals update from local patch state.
- [x] Existing V5-1 through V5-5 visuals still render.
- [x] No reticle-follow preview, drag visuals, hover glow, audio routing/gating, sync/session/server, SoundCloud/raw audio, collision, or base interaction system changes were added.

### Completed Implementation

Added local patch mutation actions and validation helpers in `src/3d/useLocalDawState.ts`.

Added visible cable-end and connectable-port targets in `src/3d/Level1RecordingStudioRoom.tsx` using the existing `useRegisterInteractable` system. Plugged cable ends can be clicked to make a cable loose, and compatible available port targets appear while a cable is active.

Made cable rendering state-aware: plugged cables render from local patch state, and loose cables are hidden until V5-7 adds the carried loose-cable preview.

### Acceptance Criteria

- Clicking a visible plugged cable-end target locally unplugs that cable.
- The unplugged cable becomes `patch.activeCableId`.
- If another cable was already active, the newly unplugged cable becomes active and the previous loose cable stays loose/inactive.
- Loose cables are no longer displayed as fully connected.
- Clicking a compatible visible port target reconnects only the active cable.
- A successful reconnect sets the active cable `state` to `plugged` and clears `activeCableId`.
- Invalid reconnect clicks no-op and keep the active cable active/loose.
- Input-to-input and output-to-output connections are prevented.
- Incompatible `accepts` connections are prevented.
- Occupied target ports are not stolen by another cable.
- Same-node connections are prevented.
- Plugged cable visuals update from local patch state.
- Default cable middle bends are preserved for default cable IDs where possible.
- Reconnected non-default cable paths remain simple, readable, and local-only.
- Existing V5-1 through V5-5 visuals still render.
- Existing DAW, drum, piano, audio, and station controls still work.
- No reticle-follow preview is added.
- No drag visuals are added.
- No hover glow or invalid-target feedback is added beyond target enabled/disabled.
- No audio routing/gating, sync/session/server, SoundCloud/raw audio, collision, or base interaction system changes are made.

### Build And Manual Checks

- Worker ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Manager ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Browser/manual first-person interaction checks are pending and will be consolidated in the recovery/usability pass.
- Manual check still needed: click the `Piano Out -> Interface IN 2` cable end; the cable should become locally loose and no longer render as fully connected.
- Manual check still needed: click a compatible available Audio Interface input such as `IN 3` or `IN 4`; the cable should reconnect and render to the new port.
- Manual check still needed: try invalid connections and confirm no-op behavior.
- Manual check still needed: verify no loose reticle-follow cable appears yet.
- Manual check still needed: verify existing instrument and DAW controls still respond.
- Original planned check: Run `npm.cmd run build`.
- TypeScript should confirm all `LocalDawActions` construction sites and helper signatures are complete.
- Manual checks:
  - Enter Recording Studio in first-person.
  - Click the `Piano Out -> Interface IN 2` cable end; the cable should become locally loose and no longer render as fully connected.
  - Click a compatible available Audio Interface input such as `IN 3` or `IN 4`; the cable should reconnect and render to the new port.
  - Try connecting Piano Out to another output; it should reject/no-op.
  - Try connecting Drum Mixer Out to an occupied interface input; it should reject/no-op unless that port belongs to the active cable.
  - Unplug and reconnect one drum mic to its compatible mixer input.
  - Unplug one cable, then unplug a second cable before reconnecting; the second cable should become active while the first remains loose/inactive.
  - Verify no loose reticle-follow cable appears yet.
  - Verify existing instrument and DAW controls still respond.
  - Verify no SoundCloud/audio behavior changes.

### Risks

- Overlapping port and cable-end targets can make raycast selection fussy. Keep port targets disabled unless a cable is active, and keep cable-end targets responsible for unplugging.
- If cable geometry is not made state-aware, users will see stale cable truth after unplugging.
- If fallback cable paths are too simple, reconnected non-default cables may look less polished. This is acceptable for V5-6 if they are readable and not misleading.
- Without V5-7 reticle-follow preview, a loose cable has no carried visual. The active state must still be recoverable by clicking a valid port or using the existing reset action.
- New interaction targets could compete with nearby drum, piano, DAW, and audio controls if oversized.
- Multiple loose cables can exist after the user unplugs a second cable before reconnecting the first. Only one should be active at a time.

### Wishlist Mapping

Directly targets:

- Click a plugged cable end to unplug it.
- Click a valid port to plug it in.
- Prevent both ends of one cable from plugging into inputs or outputs incorrectly.
- Support moving one cable from one interface input to another.

Partially supports:

- Support future user-created or spawned cables.
- Make default connections easy to reset if the user makes a mess.
- Add hover highlighting for compatible ports.
  - V5-6 should not add hover glow, but enabled visible port targets prepare this.
- Add rejected-target feedback for incompatible ports.
  - V5-6 should no-op invalid clicks only. Dedicated feedback waits for a later phase.

Prepares:

- Carry a cable plug with the reticle.
- Add reticle-follow behavior for the actively carried plug.
- Add instrument and mixer connection status lights.
- Add speaker/meter feedback that distinguishes click registered, patched, and audible.

### Non-Goals

- No reticle-follow loose cable preview.
- No cable dragging visuals.
- No hover glow.
- No invalid-target feedback beyond target enabled/disabled and no-op behavior.
- No audio routing/gating.
- No SoundCloud, jukebox, or raw audio processing.
- No sync/session/server patch state.
- No collision changes.
- No base interaction system changes.
- No new shared reducer/schema.
- No V5-7 work.
- No docs/changelog closure.

## V5-7: Reticle-Follow Loose Cable Preview

Status: `[x]` completed and manager-verified.

### Summary

Add visual feedback for the active loose cable created by V5-6.

When `patch.activeCableId` points to a loose cable, render a temporary cable preview from that cable's still-connected endpoint to either a compatible patch port target under the reticle or a short point along the current aim ray. This phase is visual-only and must not add patch state/actions, cancel/drop behavior, Escape handling, click-empty-space behavior, audio routing/gating, sync, SoundCloud/raw audio processing, collision/controller changes, or base interaction system changes.

### Implementation Spec

Expected files to touch:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - Import `useInteractionRegistry` from `./interactions`.
  - Add a room-local loose cable preview component.
  - Reuse existing V5-6 cable rendering helpers and V5-5 port registrations.

Files to avoid:

- `src/3d/interactions.tsx`
  - Do not change the base interaction system.
- `src/3d/useLocalDawState.ts`
  - Do not add patch state or actions in V5-7.
- `src/3d/patchPortRegistration.ts`
  - Avoid unless TypeScript forces a tiny pure helper.
- `docs/3d/3dvision5.md` outside this V5-7 section and existing status markers.
- `changelog.md`.
- `src/3d/useLocalDawAudioEngine.ts`.
- Sync/session/server files.
- SoundCloud, jukebox, or raw audio files.
- `src/3d/levels/level1.ts`.
- Collision/controller files.

Aim context access:

- Use `useInteractionRegistry()` from `./interactions`.
- Read `aimContext` and `activeHit`.
- Do not modify `interactions.tsx`.
- Do not add a room-local raycaster calculation unless build constraints make the existing context unusable.

Preview endpoint rules:

- If there is no `aimContext`, render nothing.
- Use `activeHit.point` only when `activeHit.id` identifies a patch port target.
- A patch port target ID currently starts with `studio-patch-port-target-`.
- If `activeHit` is missing, or if `activeHit.id` points to any other clickable object, fall back to a short point along the aim ray.
- The fallback endpoint should use:
  - `aimContext.origin`
  - normalized `aimContext.direction`
  - a short preview distance around `1.5` to `2.0` world units.
- Clamp/normalize defensively so invalid direction values do not produce huge, `NaN`, or infinite preview positions.

Preview component plan:

```tsx
function StudioLoosePatchCablePreview({
  localDawState,
}: {
  localDawState?: LocalDawState;
}) {
  // read useInteractionRegistry()
  // resolve active loose cable
  // resolve remaining connected endpoint
  // compute preview endpoint
  // render StudioStaticPatchCable
}
```

Use existing helpers where possible:

- `getActivePatchCable(localDawState.patch)`
- `LEVEL1_PATCH_PORT_REGISTRATION_MAP`
- `getMutableStudioVec3`
- `getFallbackPatchCablePoints`
- `StudioStaticPatchCable`

Resolve the remaining connected endpoint:

- Active cable must exist.
- Active cable must be `state === "loose"`.
- Active cable should have exactly one connected endpoint and one `null` endpoint.
- Use `activeCable.fromPortId ?? activeCable.toPortId` as the anchor port ID.
- Look up that anchor in `LEVEL1_PATCH_PORT_REGISTRATION_MAP`.
- If the anchor is missing, malformed, or unregistered, render nothing.

Render the preview cable:

- Render from the anchor endpoint to the preview endpoint.
- Use the active cable's `color`.
- Use the existing fallback cable path where possible.
- Long preview paths should stay readable and low/floor-hugging like V5-6 fallback paths.
- Short preview paths may use a lifted midpoint so the loose end is readable.
- Keep preview opacity/material behavior close to the existing cable renderer.
- Do not add hover glow or invalid-target feedback.

Render order:

Render after `StudioStaticPatchCables` and before or near `StudioPatchInteractionTargets`:

```tsx
<StudioStaticPatchCables localDawState={localDawState} />
<StudioLoosePatchCablePreview localDawState={localDawState} />
<StudioPatchInteractionTargets localDawState={localDawState} localDawActions={localDawActions} phaseVisuals={phaseVisuals} />
```

Cancel/drop behavior:

- Explicitly defer cancel/drop behavior.
- Do not add Escape handling.
- Do not add click-empty-space behavior.
- Do not add a new patch action.
- Do not add any automatic cleanup, reconnection, or cancellation state transition.
- Recovery remains:
  - click a compatible port to reconnect.
  - click another cable end to make that cable active instead.
  - use the existing reset-to-defaults action if exposed elsewhere.

### Checklist Items Achieved

- [x] No loose cable preview renders when no cable is active.
- [x] Active loose cables with one connected endpoint render a preview from the connected endpoint toward the reticle.
- [x] Patch port target hits use `activeHit.point` as the preview endpoint.
- [x] `activeHit.point` is used only when `activeHit.id` starts with `studio-patch-port-target-`.
- [x] Other clickable objects and empty-space aiming use the short aim-ray fallback.
- [x] Missing aim context, malformed active cables, and non-loose active cables fail safely with no preview.
- [x] Plugged cable rendering from V5-6 remains unchanged.
- [x] V5-6 click-to-reconnect behavior remains unchanged.
- [x] No patch state/actions, cancel/drop behavior, Escape handling, click-empty-space behavior, base interaction changes, audio routing/gating, sync/session/server, SoundCloud/raw audio, collision, or controller changes were added.

### Completed Implementation

Added `StudioLoosePatchCablePreview` in `src/3d/Level1RecordingStudioRoom.tsx`.

The preview uses `useInteractionRegistry()` to read `aimContext` and `activeHit`, renders only for an active loose cable, and draws a temporary cable from the remaining connected endpoint to either a patch port target hit point or a short point along the aim ray.

The preview reuses the existing cable renderer and fallback path helper, and it intentionally does not add any new patch actions or cancel/drop behavior.

### Acceptance Criteria

- When no cable is active, no loose cable preview renders.
- When a cable is active/loose with one connected endpoint, a preview cable renders from the connected endpoint toward the reticle.
- When aiming at a visible patch port target, the preview endpoint uses `activeHit.point`.
- `activeHit.point` is used only when `activeHit.id` starts with `studio-patch-port-target-`.
- When aiming at any other clickable object, the preview endpoint falls back to the short point along the aim ray.
- When aiming at empty space while `aimContext` exists, the preview endpoint follows a short point along the center aim ray.
- If `aimContext` is unavailable, the preview safely renders nothing.
- If the active cable has zero or two connected endpoints, the preview safely renders nothing.
- If the active cable is not `state === "loose"`, the preview safely renders nothing.
- Plugged cable rendering from V5-6 remains unchanged.
- V5-6 click-to-reconnect behavior still works.
- No patch state or actions are added.
- No cancel/drop behavior is added.
- No Escape handling is added.
- No click-empty-space behavior is added.
- No base interaction system changes are made.
- No audio routing/gating, sync/session/server, SoundCloud/raw audio, collision/controller changes are made.

### Build And Manual Checks

- Worker ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Manager ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Browser/manual first-person interaction checks are pending and will be consolidated in the recovery/usability pass.
- Manual check still needed: unplug `Piano Out -> Interface IN 2` and confirm the preview follows the reticle.
- Manual check still needed: aim at `IN 3` or `IN 4` and confirm the loose end visually meets the target area.
- Manual check still needed: aim at non-patch clickable objects and confirm the preview uses the aim-ray fallback.
- Manual check still needed: reconnect the cable and confirm the preview disappears.
- Original planned check: Run `npm.cmd run build`.
- Manual checks:
  - Enter Recording Studio in first-person.
  - Unplug `Piano Out -> Interface IN 2`; a loose preview should appear from the still-connected endpoint to the reticle area.
  - Aim at a compatible patch port target such as `IN 3` or `IN 4`; the loose end should visually meet the target area.
  - Aim at any other clickable object; the loose end should use the short aim-ray fallback instead of snapping to that object's hit point.
  - Aim at empty space; the preview should follow a short point in front of the camera.
  - Click a compatible port; the cable should reconnect and the preview should disappear.
  - Unplug a drum mic cable; the preview should originate from the still-connected endpoint.
  - Toggle top-down or otherwise disable interactions if available; preview should fail safely or disappear when aim context is unavailable.
  - Verify existing DAW, drum, piano, cable-end, and port click behavior still works.

### Risks

- `aimContext` is only populated while interactions are enabled and the interaction controller is running. In top-down or disabled interaction states, the preview may disappear. This is acceptable.
- If `activeHit.point` is on a spherical patch target surface, the preview endpoint may sit slightly outside the visual port. This is acceptable for V5-7.
- A long loose preview cable may visually cut through furniture. Use the existing low/floor-hugging fallback for longer runs.
- Without cancel/drop behavior, loose cable recovery still depends on reconnecting or reset. This is consistent with V5-7 scope.
- If the preview renders too opaquely, it may obscure tiny ports. Keep preview plug/cable transparent and small.

### Wishlist Mapping

Directly targets:

- Carry a cable plug with the reticle.
- Add reticle-follow behavior for the actively carried plug.

Partially supports:

- Click a valid port to plug it in.
  - V5-6 owns the click action. V5-7 only improves visual feedback while aiming.
- Add hover highlighting for compatible ports.
  - V5-7 does not add hover glow, but the preview can visually meet patch port targets.

Prepares:

- Click empty space or press Escape to cancel/drop.
- Add rejected-target feedback for incompatible ports.
- Instrument and mixer connection status lights.

### Non-Goals

- No patch state changes.
- No new patch actions.
- No cancel/drop behavior.
- No Escape handling.
- No click-empty-space behavior.
- No reticle interaction changes.
- No base interaction system changes.
- No hover glow.
- No invalid-target feedback.
- No audio routing/gating.
- No sync/session/server changes.
- No SoundCloud, jukebox, or raw audio processing.
- No collision/controller changes.
- No V5-8 status lights.
- No docs/changelog closure.

## V5-8: Instrument And Mixer Connection Status Lights

Status: `[x]` completed and manager-verified.

### Summary

Add read-only local patch status feedback to the physical studio hardware that already participates in the V5-4 through V5-7 patch graph.

V5-8 should make it obvious when the Piano, drum mics, Drum Mixer, Audio Interface, and speaker system are connected or loose/unpatched after V5-6/V5-7 interactions. Status must count only plugged cables. Loose active and loose inactive cables do not count as connected.

This phase must remain display-only: no new patch nodes, ports, actions, mutations, audio routing/gating, sync/session/server changes, SoundCloud/raw audio changes, or interaction changes.

### Implementation Spec

Expected files to touch:

- `src/3d/useLocalDawState.ts`
  - Add pure read-only patch status helpers.
  - No state shape changes unless TypeScript absolutely requires a helper type export.
  - No new actions.
- `src/3d/Level1RecordingStudioRoom.tsx`
  - Add small status lights and compact labels to existing physical visual components.
  - Pass `localDawState` into components that need read-only patch display.

Possibly avoid unless a tiny pure lookup helper is useful:

- `src/3d/patchPortRegistration.ts`

Files to avoid:

- `src/3d/interactions.tsx`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/3d/levels/level1.ts`
- Sync/session/server files.
- SoundCloud, jukebox, or raw audio files.
- Collision/controller files.
- `docs/3d/3dvision5.md` outside this V5-8 section and existing status markers.
- `changelog.md`.

Add small pure helpers in `useLocalDawState.ts`, building on existing patch graph helpers:

```ts
export interface PatchPortConnectionStatus {
  port: LocalPatchPort;
  cable: LocalPatchCable;
  peerPort: LocalPatchPort | null;
  peerNode: LocalPatchNode | null;
}

export function getPatchPortConnectionStatus(
  patch: LocalPatchState,
  portId: string,
): PatchPortConnectionStatus | null;

export function isPatchPortConnected(
  patch: LocalPatchState,
  portId: string,
): boolean;

export function getPatchPortPeerLabel(
  patch: LocalPatchState,
  portId: string,
): string | null;

export function getPatchNodeConnectedPortCount(
  patch: LocalPatchState,
  nodeId: string,
): number;
```

Helper rules:

- Count only cables with `state === "plugged"`.
- Ignore loose cables with a `null` endpoint.
- A connected port is one present on a plugged cable with both endpoints populated.
- `getPatchPortPeerLabel` should return compact labels such as `IN 2`, `Drum Mixer`, `Speaker In`, or `Piano Out`, depending on what reads best in each display context.
- No helper should mutate state or infer audio behavior.

Status targets:

- Piano
  - Port: `piano-out`
  - Add a small `Connected` / `Not Patched` light near the existing `Piano Out` jack.
  - Add a compact destination label such as `To IN 2`, `To IN 3`, or `Not Patched`.
- Drum mics and Drum Mixer inputs
  - Ports:
    - `kick-mic-out` / `drum-mixer-kick-in`
    - `snare-mic-out` / `drum-mixer-snare-in`
    - `hat-mic-out` / `drum-mixer-hat-in`
    - `overhead-left-mic-out` / `drum-mixer-overhead-left-in`
    - `overhead-right-mic-out` / `drum-mixer-overhead-right-in`
  - Reuse or augment the existing tiny Drum Mixer input lights.
  - Connected input = green/cyan-ish active display light.
  - Loose/unpatched input = dim amber/red display light.
  - Avoid full labels for every mic; existing `Kick`, `Snare`, `Hat`, `OH L`, `OH R` labels already carry the detail.
- Drum Kit aggregate
  - Add one compact aggregate status near the Drum Kit/Drum Mixer area.
  - Suggested label: `Mics 5/5`, `Mics 4/5`, etc.
  - Derive from the five Drum Mixer mic input connections.
  - Keep it small; individual mixer input lights still carry the detail.
- Drum Mixer output
  - Port: `drum-mixer-out`
  - Add a small output status light near `OUT`.
  - Add a compact destination label such as `To IN 1`, `To IN 2`, or `No Out`.
- Audio Interface
  - Ports:
    - `audio-interface-input-1`
    - `audio-interface-input-2`
    - `audio-interface-input-3`
    - `audio-interface-input-4`
    - `audio-interface-out`
  - Add small per-port status dots next to the existing input/output ports.
  - Keep existing engine `PWR`, `MUTE`, and `VOL` lights as audio-engine display state.
  - New patch lights should be visually distinct and clearly tied to port connection, not audio readiness.
  - Add an Audio Interface aggregate patch label to move toward the interface as central connectivity truth panel.
  - Suggested labels: `PATCH 3 IN / OUT`, `PATCH 2 IN / NO OUT`, or similarly compact wording.
- Speaker system
  - Port: `speaker-system-input`
  - Add a small `In Patched` / `No Interface` label or light near the speaker panel.
  - Keep it separate from the existing sound activity meter. This is patch graph display only, not audible truth.

Defer:

- FM Synth, Bass, Looper, and DJ.
- They do not currently have V5 patch nodes/ports.
- Do not add new patch nodes/ports in V5-8.
- Do not add connection status lights to them yet.
- Note as wishlist coverage that still needs future phases once those instruments have physical outputs and patch nodes/ports.

Display and label guidance:

- Piano: one small label near `Piano Out`, such as `To IN 2` or `Not Patched`.
- Drum Mixer inputs: use lights more than text.
- Drum Kit/Drum Mixer aggregate: one small `Mics x/5` label.
- Drum Mixer output: one compact output destination label.
- Audio Interface: dots per port plus one compact aggregate patch label.
- Speakers: one compact label on or near the speaker panel, such as `Interface In` or `No Patch`.

Use existing canvas helpers:

- `createStudioTransportControlCanvas` for compact status labels.
- `createStudioInterfacePortLabelCanvas` only if a port-local label is necessary.
- Existing `StudioAudioInterfaceStatusLight` can be reused or generalized, but avoid semantic confusion with engine lights.

Suggested colors:

- Connected/plugged: `#73ff4c` or `phaseVisuals.gridPrimary`.
- Loose/not patched: amber/red like `phaseVisuals.timerAccent`, with lower opacity.
- Unknown/no state: dim blue-gray.

Response to V5-6/V5-7 changes:

- Status display should derive directly from `localDawState.patch`.
- When a cable end is unplugged:
  - affected source/destination ports become `Not Patched`, dim, or count as missing.
  - active loose cable preview from V5-7 may still render, but status must not count it as connected.
- When a loose cable is reconnected:
  - new target port becomes connected.
  - old target port remains unpatched.
  - destination labels and aggregate counts update.
- When multiple loose cables exist:
  - only plugged cables count as connected.
  - loose inactive cables do not show as connected.

### Checklist Items Achieved

- [x] Piano Out shows connected/not-patched state from `localDawState.patch`.
- [x] Piano destination label updates from the connected Audio Interface input.
- [x] Drum Mixer input lights reflect plugged/unplugged mic input state.
- [x] Drum Kit aggregate label shows `Mics x/5` based on plugged drum mic input connections.
- [x] Drum Mixer output status reflects whether `drum-mixer-out` is plugged.
- [x] Audio Interface input/output ports show patch connection status separate from engine `PWR/MUTE/VOL`.
- [x] Audio Interface aggregate patch label summarizes connected inputs and output status.
- [x] Speaker system shows whether `speaker-system-input` is patched to the interface.
- [x] Loose active/inactive cables do not count as connected.
- [x] No new patch nodes, ports, actions, mutations, audio routing/gating, sync/session/server, SoundCloud/raw audio, interaction, collision, or controller changes were added.

### Completed Implementation

Added read-only patch connection helpers in `src/3d/useLocalDawState.ts`.

Added patch status lights and compact labels in `src/3d/Level1RecordingStudioRoom.tsx` for Piano Out, Drum Mixer mic inputs, Drum Kit `Mics x/5`, Drum Mixer Out, Audio Interface per-port/aggregate status, and Speaker In.

FM Synth, Bass, Looper, and DJ remain deferred because they do not yet have V5 patch nodes/ports.

### Acceptance Criteria

- Piano Out shows connected/not-patched state from `localDawState.patch`.
- Piano destination label updates when moved from one Audio Interface input to another.
- Drum Mixer input lights reflect whether each mic input is actually plugged.
- Drum Kit aggregate label shows `Mics x/5` based on plugged drum mic input connections.
- Drum Mixer output status reflects whether `drum-mixer-out` is plugged to the Audio Interface.
- Audio Interface input/output ports show patch connection status separate from engine `PWR/MUTE/VOL`.
- Audio Interface aggregate patch label summarizes connected inputs and output status, such as `PATCH 3 IN / OUT`.
- Speaker system shows whether `speaker-system-input` is patched to the interface.
- Loose active cables do not count as connected.
- Loose inactive cables do not count as connected.
- Status updates after V5-6 unplug/reconnect interactions.
- V5-7 loose preview remains visual-only and does not affect status.
- No new patch nodes, ports, actions, or mutations are added.
- FM Synth, Bass, Looper, and DJ patch status remains deferred because they do not yet have V5 patch nodes/ports.
- No audio routing/gating, sync/session/server, SoundCloud/raw audio, interaction, collision, or base controller changes are made.

### Build And Manual Checks

- Worker ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Manager ran `npm.cmd run build`; passed with the existing Vite large chunk warning.
- Browser/manual first-person interaction checks are pending and will be consolidated in the recovery/usability pass.
- Manual check still needed: confirm default `Mics 5/5`, Audio Interface aggregate, Piano/Speaker patch labels.
- Manual check still needed: verify status updates after unplug/reconnect in first-person.
- Original planned check: Run `npm.cmd run build`.
- Manual checks:
  - Enter Recording Studio.
  - Confirm default state shows:
    - Piano connected to Audio Interface input 2.
    - Drum Mixer output connected to Audio Interface input 1.
    - Drum mic inputs connected.
    - Drum Kit aggregate reads `Mics 5/5`.
    - Audio Interface aggregate label reflects the default connected inputs and output.
    - Audio Interface output connected to speakers.
  - Unplug Piano cable:
    - Piano shows not patched.
    - Audio Interface input 2 shows empty/not patched.
    - Loose preview still works, but status does not count it.
  - Reconnect Piano to input 3 or 4:
    - Piano destination label updates.
    - new interface input shows connected.
    - old interface input shows empty.
    - Audio Interface aggregate label updates.
  - Unplug a drum mic:
    - its Drum Mixer input light dims/shows not patched.
    - Drum Kit aggregate count drops to `Mics 4/5`.
  - Unplug Audio Interface out:
    - Speakers show no interface/no patch.
    - Audio Interface aggregate output status updates.
  - Verify existing piano, drum, DAW, cable-end, port-target, and preview interactions still work.

### Risks

- The Drum Mixer area is visually dense. Prefer tiny lights and one aggregate label over additional per-channel text.
- Audio Interface already has engine status lights, so patch status must not look like audio readiness or audio routing truth.
- Because V5-8 is still local-only, users may assume multiplayer/shared patch state exists. Labels should avoid shared/session wording.
- If labels are too verbose, first-person readability will suffer.
- Future instruments are tempting, but adding status before adding patch nodes would create misleading UI.

### Wishlist Mapping

Directly targets:

- Add `Connected` lights to Piano and Drum Kit.
- Add `Not Patched` feedback when an instrument is unconnected.
- Show the currently patched destination on the instrument panel.
- Make the Audio Interface the central truth panel for studio connectivity.
- Add port status lights: empty, connected, active signal, invalid target.
  - V5-8 covers empty/connected display only. Active signal and invalid target remain later work.
- Make each mic light up when its drum is hit and patched.
  - V5-8 covers patched/unpatched connection state. Hit animation remains existing display-only behavior and later can combine both.

Partially supports:

- Add speaker/meter feedback that distinguishes click registered, patched, and audible.
  - V5-8 adds patched/not patched display only. Audible truth remains later work.
- Add an output meter showing whether the drum submix is feeding the interface.
  - V5-8 can show output patched status, not real audio feed.

Deferred wishlist coverage:

- FM Synth, Bass, Looper, and DJ connection status lights still need future phases because those instruments do not yet have V5 patch nodes/ports.

### Non-Goals

- No new patch nodes or ports.
- No new patch mutation actions.
- No cable interaction changes.
- No reticle behavior changes.
- No audio routing/gating.
- No audible mute/unmute based on patch graph.
- No sync/session/server changes.
- No SoundCloud, jukebox, or raw audio processing.
- No collision/controller changes.
- No FM Synth, Bass, Looper, or DJ patch status until they have V5 patch nodes/ports.
- No docs/changelog closure.

## V5-9: Speaker/Meter Status Reads From Patch Graph Plus Audio Engine State

Status: `[x]` completed and manager-verified.

### Summary

Upgrade the speaker panel and meter display so it distinguishes three display-only concepts:

- `EVT`: a local generated event or active voice exists.
- `PATCH`: the speaker is patched from the Audio Interface.
- `AUD`: event plus speaker patch plus audio-engine readiness.

V5-9 must not add audio routing/gating or change actual audible behavior.

### Implementation Spec

Expected files to touch:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - Update `getStudioSoundActivity`.
  - Update `StudioSoundActivitySpeakers`.
  - Add small room-local display helpers if needed.

Optional:

- `src/3d/useLocalDawState.ts`
  - Add only a tiny pure helper if useful, such as `isPatchCablePluggedBetween`.
  - No state, actions, or mutations.

Files to avoid:

- `src/3d/useLocalDawAudioEngine.ts`
- `src/3d/interactions.tsx`
- Sync/session/server files.
- SoundCloud, jukebox, or raw audio files.
- Collision/controller files.
- `docs/3d/3dvision5.md` outside this V5-9 section and existing status markers.
- `changelog.md`.

Exact status model:

- `hasGeneratedEvent`
  - True when local audio engine state indicates recent or active generated sound.
  - Use existing signals such as last piano/drum/FM/bass labels, active voice counts, and `isBassPatternAuditioning`.
- `hasSpeakerPatch`
  - True only when there is an exact plugged cable connection between `audio-interface-out` and `speaker-system-input`.
  - The cable may list the ports in either endpoint order.
  - The cable must have `state === "plugged"`.
  - Both endpoints must be non-null.
  - Loose active cables, loose inactive cables, null endpoints, and either port merely being occupied by some other cable do not count.
- `isAudibleReady`
  - True when `localDawAudioState.status === "ready"`, `isMuted === false`, and `masterVolume > 0`.
- `isDisplayAudible`
  - True only when `hasGeneratedEvent && hasSpeakerPatch && isAudibleReady`.
  - This is display-only and must not control actual audio.

Speaker UI:

- Keep the existing event/activity label, e.g. `DR Kick`, `PN C4`, `FM A3`, `BA E2`, or idle/no-engine text.
- Add or revise compact patch wording:
  - `PATCH OK` when `audio-interface-out -> speaker-system-input` is exactly plugged.
  - `NO PATCH` otherwise.
- Add compact audible/engine wording:
  - `AUDIBLE` when `isDisplayAudible`.
  - `NO EVENT`, `ENGINE OFF`, `MUTED`, or `VOL 0` as short alternatives.
- Add three small status dots/lights on the speaker panel:
  - `EVT`: generated event/active voice.
  - `PATCH`: exact speaker patch.
  - `AUD`: event plus patch plus audible-ready.
- Meter/wave intensity:
  - strongest only when `isDisplayAudible`.
  - restrained/dim when event exists but patch is missing or engine is not audible-ready.
  - idle low when no event exists.

### Checklist Items Achieved

- [x] Added exact speaker patch truth for the `audio-interface-out` to `speaker-system-input` plugged cable.
- [x] Added compact `EVT`, `PATCH`, and `AUD` speaker status lights with visible labels.
- [x] Split generated-event, exact speaker-patch, and display-audible state without changing audio routing.
- [x] Kept loose cables, null endpoints, and unrelated occupied ports from counting as speaker patched.
- [x] Dimmed speaker waves/meters for event-only or patch-only states, with full intensity only for display-audible state.

### Completed Implementation

V5-9 added a pure `isPatchCablePluggedBetween(...)` helper in `src/3d/useLocalDawState.ts` and updated the speaker display in `src/3d/Level1RecordingStudioRoom.tsx`.

The speaker panel now reports three separate local display states:

- `EVT`: a generated piano, drum, FM synth, or bass event has been registered.
- `PATCH`: the exact `audio-interface-out` to `speaker-system-input` cable is plugged.
- `AUD`: an event exists, the exact speaker patch exists, and the local audio engine is ready, unmuted, and above zero volume.

This is display-only. No audio gating, Web Audio routing, SoundCloud handling, sync, interaction, collision, or controller behavior changed.

### Acceptance Criteria

- Speaker panel shows separate `EVT`, `PATCH`, and `AUD` status.
- Speaker patch status is true only for an exact plugged `audio-interface-out` to `speaker-system-input` connection.
- Loose active/inactive cables and null endpoints do not count as patched.
- Event status can show a click/generated event even when speaker patch is missing.
- Audible status is true only when event, exact speaker patch, and engine readiness are all true.
- Muted, volume-zero, off/unsupported, and no-event states are distinguishable in compact wording.
- Meter/wave intensity is strongest only for display-audible state.
- V5-8 hardware patch lights remain unchanged.
- V5-6/V5-7 cable interactions still work.
- No actual audio routing/gating or audible behavior changes are made.

### Build And Manual Checks

- Worker `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manager `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual checks:
  - Default connected state shows `PATCH OK`.
  - With engine ready/unmuted/volume above zero, clicking piano/drums shows `EVT` and `AUD`.
  - Unplug `interface-out-to-speakers`; clicking still shows `EVT`, but `PATCH` and `AUD` are off/dim.
  - Mute engine; patch can remain OK, event can register, but `AUD` is off/dim.
  - Set volume to zero; patch can remain OK, event can register, but `AUD` is off/dim.
  - Reconnect speaker patch; `PATCH` updates immediately.
- Manual browser checks are pending and remain queued for the V5 recovery/usability pass.

### Risks

- Users may read `AUD` as real patch-gated audio truth. Keep wording/status-panel style clear that this is display feedback.
- FM Synth and Bass can generate events without V5 patch nodes. V5-9 should show events but must not invent their patch paths.
- Speaker panel is already visually active; use short labels and tiny dots to avoid clutter.
- Last-event labels may linger longer than active voices. Use active voice counts for meter strength where possible.

### Wishlist Mapping

Directly targets:

- Add speaker/meter feedback that distinguishes click registered, patched, and audible.

Partially supports:

- Add port status lights: empty, connected, active signal, invalid target.
  - V5-9 adds speaker-side event/patch/audible display only.
- Make the Audio Interface the central truth panel for studio connectivity.
  - V5-9 reinforces the interface-to-speaker path, while full central truth remains later work.

Prepares:

- Later audio-gating design by making the display model explicit before audio behavior changes.

### Non-Goals

- No audio gating.
- No Web Audio routing changes.
- No muting/unmuting based on patch graph.
- No new patch nodes or ports.
- No new patch actions or mutations.
- No full graph traversal for future instruments.
- No FM Synth, Bass, Looper, or DJ patch path invention.
- No interaction changes.
- No sync/session/server changes.
- No SoundCloud, jukebox, or raw audio processing.
- No collision/controller changes.
- No docs/changelog closure.

## V5-10: Design Phase For Audio Gating By Patch Graph

Status: `[x]` completed and manager-verified. No source implementation in this phase.

### Summary

Define the V5-11 design for optional local audio gating by the V5 patch graph.

V5-11 should gate only scoped app-owned generated sounds that already have V5 patch paths:

- Piano-live generated sound.
- Drum generated sound for Kick, Snare, and Hat.

Standalone FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome remain unchanged until future node/port phases.

The core rule for V5-11 should be: click/event feedback still registers, but Web Audio voice scheduling is skipped when the relevant local patch path is incomplete. Master mute, master volume, and audio-engine readiness remain authoritative and still prevent audible scheduling.

### Expected V5-11 Files

Likely source files to touch in V5-11:

- `src/3d/useLocalDawState.ts`
  - Add pure patch-path helpers for Piano and Drum generated-source paths.
  - Reuse `LocalPatchState`, `isPatchCablePluggedBetween`, `getPatchPortConnectionStatus`, and existing default patch IDs.
  - Do not add new patch nodes, ports, cables, sync state, or shared state.
- `src/3d/useLocalDawAudioEngine.ts`
  - Split scoped event registration from Web Audio scheduling enough for disconnected, muted, and volume-zero attempts to update last-event labels/visual feedback.
  - Add optional action shape for scoped generated-source gating.
  - Keep standalone FM Synth, Bass, Bass Pattern, metronome, and effect behavior unchanged.
- `src/3d/Level1RecordingStudioRoom.tsx`
  - Compute scoped gate booleans from `localDawState.patch`.
  - Pass gate booleans into Piano-live and Drum generated actions only.
  - Preserve V5-9 `EVT` / `PATCH` / `AUD` speaker display semantics.

Files to avoid in V5-11:

- Sync/session/server files.
- SoundCloud, jukebox, or raw audio processing files.
- Collision/controller/base interaction files.
- `src/3d/patchPortRegistration.ts` unless a tiny pure helper is genuinely needed.
- `changelog.md`.

### Exact Path Rules

All path rules count only plugged cables:

- `state === "plugged"`.
- both endpoints are non-null.
- either endpoint order is acceptable.
- loose active cables, loose inactive cables, dragging cables, null endpoints, and "either port is occupied" shortcuts do not count.

Shared speaker output path:

- `audio-interface-out` must be exactly plugged to `speaker-system-input`.
- Existing helper `isPatchCablePluggedBetween(patch, "audio-interface-out", "speaker-system-input")` is the intended truth check.

Piano-live path:

- `piano-out` must be plugged to one of:
  - `audio-interface-input-1`
  - `audio-interface-input-2`
  - `audio-interface-input-3`
  - `audio-interface-input-4`
- `audio-interface-out` must be plugged to `speaker-system-input`.
- The specific Audio Interface input number does not matter.
- If `piano-out` is loose, unpatched, or patched somewhere other than an Audio Interface input, Piano-live generated sound is gated off.

Drum generated path:

- Kick:
  - `kick-mic-out` must be plugged to `drum-mixer-kick-in`.
  - `drum-mixer-out` must be plugged to any Audio Interface input 1-4.
  - `audio-interface-out` must be plugged to `speaker-system-input`.
- Snare:
  - `snare-mic-out` must be plugged to `drum-mixer-snare-in`.
  - `drum-mixer-out` must be plugged to any Audio Interface input 1-4.
  - `audio-interface-out` must be plugged to `speaker-system-input`.
- Hat:
  - `hat-mic-out` must be plugged to `drum-mixer-hat-in`.
  - `drum-mixer-out` must be plugged to any Audio Interface input 1-4.
  - `audio-interface-out` must be plugged to `speaker-system-input`.

Overhead L/R mics:

- Do not gate current Kick/Snare/Hat generated voices on overhead mic paths in V5-11.
- Overheads remain visual/status coverage until a later phase adds overhead-specific generated behavior.

FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome:

- Do not gate them by the V5 patch graph in V5-11.
- Do not invent V5 patch nodes/ports for them in V5-11.
- Keep standalone `playFmSynthNote`, `playBassNote`, `playBassPatternAudition`, Looper, DJ, SoundCloud/jukebox, and `playMetronomeTick` behavior unchanged.

### Action Shape

Recommended pure helper shape in `src/3d/useLocalDawState.ts`:

```ts
export function isPatchCablePluggedToAny(
  patch: LocalPatchState,
  sourcePortId: string,
  targetPortIds: string[],
): boolean;

export function isAudioInterfaceOutputPatchedToSpeakers(patch: LocalPatchState): boolean;

export function isPortPatchedToAudioInterfaceInput(patch: LocalPatchState, sourcePortId: string): boolean;

export function canPianoLivePatchReachSpeakers(patch: LocalPatchState): boolean;

export function canDrumMixerPatchReachInterface(patch: LocalPatchState): boolean;

export function canDrumHitPatchReachSpeakers(
  patch: LocalPatchState,
  kind: "kick" | "snare" | "hat",
): boolean;
```

Recommended `src/3d/useLocalDawAudioEngine.ts` action shape:

```ts
interface LocalDawGeneratedSoundOptions {
  allowSound?: boolean;
}

playDrumVoice(hit, { allowSound: canDrumHitPatchReachSpeakers(...) });
playPianoLiveNote(note, target, { allowSound: canPianoLivePatchReachSpeakers(...) });
```

`allowSound === false` should mean:

- update scoped last-event labels/visual feedback.
- skip Web Audio voice scheduling.

`allowSound` omitted should preserve current audible behavior for unmodified call sites where appropriate.

Important manager revision:

- `playPianoLiveNote` currently schedules through FM Synth or Bass internally.
- V5-11 should gate the `playPianoLiveNote` action itself.
- V5-11 must not accidentally gate standalone `playFmSynthNote` or `playBassNote` calls from FM Synth or Bass Machine controls.

### Feedback And Master Audio Rules

For scoped Piano-live and Drum actions, V5-11 should split event registration from Web Audio scheduling enough that disconnected, muted, and volume-zero attempts can still update last-event labels and visual feedback.

Master mute, master volume, audio-engine status, `AudioContext`, and `masterGain` remain authoritative:

- Patch graph can only allow a generated source to be considered for scheduling.
- `isMuted === true` still prevents audible scheduling.
- `masterVolume <= 0` still prevents audible scheduling.
- engine status other than ready/running still prevents audible scheduling.
- missing audio context or gain nodes still prevents audible scheduling.

Disconnected behavior:

- Piano key click still records/updates local visual feedback even when Piano-live generated sound is gated off.
- Drum trigger click still updates last-hit/visual feedback even when that drum path is gated off.
- V5-9 speaker `EVT` can still light for an attempted generated event.
- `PATCH` and `AUD` remain driven by exact patch/audio readiness rules.

### Recovery And Reset

Use the existing `resetPatchToDefaults` action for recovery.

Default reset should restore:

- Piano Out -> Audio Interface input 2 -> Audio Interface Out -> Speakers.
- Drum mic outs -> Drum Mixer inputs.
- Drum Mixer Out -> Audio Interface input 1 -> Audio Interface Out -> Speakers.

No new reset action is needed for V5-11.

### Acceptance Criteria

Design-phase acceptance for V5-10:

- Documents exact V5-11 scope: Piano-live and Drum generated sound only.
- Documents that standalone FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome remain unchanged.
- Documents exact Piano-live and Drum path rules.
- Documents that `playPianoLiveNote` should be gated at the action boundary without gating standalone `playFmSynthNote` / `playBassNote`.
- Documents event-feedback preservation for disconnected, muted, and volume-zero attempts.
- Documents master mute/volume/status authority.
- Documents reset/recovery through existing `resetPatchToDefaults`.
- Documents V5-11 expected files, action shape, non-goals, tests, risks, and wishlist mapping.

V5-11 implementation acceptance:

- Default patch state allows Piano-live and Drum generated sound when the audio engine is ready, unmuted, and volume is above zero.
- Unplugging `piano-out-to-interface-two` blocks audible Piano-live generated sound, but key click/record/status feedback still updates.
- Reconnecting Piano Out to any Audio Interface input 1-4 restores audible Piano-live generated sound.
- Unplugging a specific drum mic blocks only that drum voice's audible generated sound, while hit feedback still updates.
- Unplugging `drum-mixer-out-to-interface-one` blocks audible generated Drum sound, while hit feedback still updates.
- Unplugging `interface-out-to-speakers` blocks audible generated Piano-live and Drum sound.
- Loose active/inactive cables and null endpoints do not count.
- Master mute and volume zero block audible scheduling even when patch paths are complete, while scoped visual feedback can still update.
- Standalone FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome behavior remains unchanged.
- No SoundCloud, sync/session/server, interaction, collision, controller, or shared-state changes are added.

### V5-11 Test Plan

Build:

- Run `npm.cmd run build`.
- Fix only V5-11-caused TypeScript/build errors.

Manual checks:

- Default state:
  - initialize audio engine, unmute, set volume above zero.
  - Piano-live key click is audible.
  - Kick/Snare/Hat generated drum hits are audible.
- Piano unplug:
  - unplug Piano Out.
  - click a Piano key.
  - visual/key/last-event feedback updates.
  - Piano-live generated sound is not audible.
  - reconnect Piano Out to input 3 or 4; Piano-live sound returns.
- Drum mic unplug:
  - unplug Kick Mic.
  - trigger Kick; feedback updates but Kick sound is not audible.
  - trigger Snare/Hat; they remain audible if their paths are still complete.
- Drum mixer out unplug:
  - unplug Drum Mixer Out.
  - trigger Kick/Snare/Hat; feedback updates but generated drum sound is not audible.
- Interface out unplug:
  - unplug Audio Interface Out.
  - click Piano and Drum triggers.
  - event feedback updates but generated Piano-live/Drum sound is not audible.
- Master authority:
  - with all patches complete, mute engine; events can update but sound is not audible.
  - with all patches complete, set volume to zero; events can update but sound is not audible.
- Deferred sources:
  - standalone FM Synth note controls behave as before.
  - Bass Machine note controls and Bass Pattern behave as before.
  - metronome behavior remains as before.
  - Looper, DJ, SoundCloud/jukebox behavior remains unchanged.

### Risks

- `playPianoLiveNote` delegates to FM Synth or Bass internally, so gating must happen only at the Piano-live action boundary and not in shared standalone synth/bass scheduling helpers.
- Existing audio actions often return before updating last-event labels when audio is not audible-ready; V5-11 needs careful event-registration separation to avoid dead-feeling disconnected states.
- Drum overhead mics are visible but should not be required for current Kick/Snare/Hat generated voices.
- Users may expect FM Synth/Bass patch gating because they generate sound, but they do not yet have V5 patch nodes/ports.
- Patch graph remains local-only; V5-11 must not imply shared/session patch truth.

### Wishlist Mapping

Directly prepares:

- Audio Routing And Gating: optional local gating for app-owned generated Piano-live and Drum sounds.
- Instrument Connection Feedback: disconnected sources still provide visible feedback.
- Drum Mics: supports later "mic unplugged" feedback when a drum is hit while disconnected.
- Speaker/meter feedback: V5-9 `EVT` / `PATCH` / `AUD` can become behaviorally meaningful for scoped generated sources.

Deferred wishlist coverage:

- FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome patch gating waits for future node/port phases.
- Shared/multiplayer patch state waits for an explicit sync design phase.
- SoundCloud/raw audio routing remains out of scope.
- Full modular DAW signal routing remains out of scope.

### Non-Goals

- No source code implementation in V5-10.
- No audio gating implementation in V5-10.
- No SoundCloud/raw stream routing.
- No SoundCloud Web Audio proxying.
- No sync/session/server/shared patch state.
- No new shared state.
- No commercial DAW completeness.
- No arbitrary graph traversal UI.
- No new patch nodes/ports for FM Synth, Bass, Looper, DJ, metronome, or SoundCloud.
- No cable interaction changes.
- No collision/controller/base interaction changes.
- No Web Audio node graph rewiring in V5-10.
- No changelog edits.

## V5-11: Optional Local Audio Gating For App-Owned Generated Instruments

Status: `[x]` completed and manager-verified.

### Summary

Implement the V5-10 design in the smallest useful slice: gate only Piano-live and Drum generated sound by the local V5 patch graph, while preserving local event/visual feedback when the path is disconnected, muted, or volume-zero.

This phase should not make the patch graph a general audio router. It should add pure path helpers, add optional `allowSound` arguments to scoped audio actions, and update only the Piano-live and Drum call sites in the room.

Standalone FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome must remain unchanged.

### Files To Touch

Expected:

- `src/3d/useLocalDawState.ts`
  - Add pure patch-path helpers only.
  - No state shape changes.
  - No new patch nodes, ports, cables, or actions.
- `src/3d/useLocalDawAudioEngine.ts`
  - Add scoped generated-sound option type.
  - Change only `playDrumVoice` and `playPianoLiveNote` action signatures/implementations.
  - Preserve standalone `playFmSynthNote`, `playBassNote`, `playBassPatternAudition`, and `playMetronomeTick` behavior.
- `src/3d/Level1RecordingStudioRoom.tsx`
  - Import new patch-path helpers.
  - Compute `allowSound` for Piano-live and Drum generated actions.
  - Update piano key, drum machine button, and physical drum kit piece call sites.

Files to avoid:

- `docs/3d/3dvision5.md` outside this V5-11 section and existing status markers.
- `changelog.md`.
- `src/3d/patchPortRegistration.ts`.
- `src/3d/interactions.tsx`.
- Sync/session/server files.
- SoundCloud, jukebox, or raw audio processing files.
- Collision/controller/base interaction files.
- Any Looper/DJ/shared DAW transport files unless TypeScript forces a behavior-free import adjustment, which should be avoided if possible.

### Pure Helpers

Add near existing patch helpers in `src/3d/useLocalDawState.ts`, reusing `isPatchCablePluggedBetween`.

Constants can stay local to the helper area:

```ts
const AUDIO_INTERFACE_INPUT_PORT_IDS = [
  "audio-interface-input-1",
  "audio-interface-input-2",
  "audio-interface-input-3",
  "audio-interface-input-4",
] as const;
```

Suggested helpers:

```ts
export type PatchGatedDrumKind = "kick" | "snare" | "hat";

export function isPatchCablePluggedToAny(
  patch: LocalPatchState,
  sourcePortId: string,
  targetPortIds: readonly string[],
) {
  return targetPortIds.some((targetPortId) => (
    isPatchCablePluggedBetween(patch, sourcePortId, targetPortId)
  ));
}

export function isAudioInterfaceOutputPatchedToSpeakers(patch: LocalPatchState) {
  return isPatchCablePluggedBetween(patch, "audio-interface-out", "speaker-system-input");
}

export function isPortPatchedToAudioInterfaceInput(patch: LocalPatchState, sourcePortId: string) {
  return isPatchCablePluggedToAny(patch, sourcePortId, AUDIO_INTERFACE_INPUT_PORT_IDS);
}

export function canPianoLivePatchReachSpeakers(patch: LocalPatchState) {
  return (
    isPortPatchedToAudioInterfaceInput(patch, "piano-out") &&
    isAudioInterfaceOutputPatchedToSpeakers(patch)
  );
}

export function canDrumMixerPatchReachInterface(patch: LocalPatchState) {
  return isPortPatchedToAudioInterfaceInput(patch, "drum-mixer-out");
}

export function canDrumHitPatchReachSpeakers(patch: LocalPatchState, kind: PatchGatedDrumKind) {
  const micPath = kind === "kick"
    ? isPatchCablePluggedBetween(patch, "kick-mic-out", "drum-mixer-kick-in")
    : kind === "snare"
      ? isPatchCablePluggedBetween(patch, "snare-mic-out", "drum-mixer-snare-in")
      : isPatchCablePluggedBetween(patch, "hat-mic-out", "drum-mixer-hat-in");

  return (
    micPath &&
    canDrumMixerPatchReachInterface(patch) &&
    isAudioInterfaceOutputPatchedToSpeakers(patch)
  );
}
```

Notes:

- These helpers must count only plugged cables because `isPatchCablePluggedBetween` already requires `state === "plugged"` and non-null endpoints.
- Do not include overhead mics in the current Drum generated sound gate.
- Do not add helpers for FM Synth, Bass, Looper, DJ, metronome, or SoundCloud yet.

### Audio Action Signature And Behavior

In `src/3d/useLocalDawAudioEngine.ts`, add:

```ts
export interface LocalDawGeneratedSoundOptions {
  allowSound?: boolean;
}
```

Change action interface:

```ts
playDrumVoice: (hit: LocalDawDrumHit, options?: LocalDawGeneratedSoundOptions) => void;
playPianoLiveNote: (
  note: LocalDawPianoLiveNote,
  target?: LocalDawPianoLiveTarget,
  options?: LocalDawGeneratedSoundOptions,
) => void;
```

Do not change these signatures:

```ts
playFmSynthNote: (note: LocalDawFmSynthNote) => void;
playBassNote: (note: LocalDawBassNote) => void;
playBassPatternAudition: (gainScale?: number) => void;
playMetronomeTick: (isAccent?: boolean) => void;
```

`allowSound === false` behavior:

- `playDrumVoice(hit, { allowSound: false })`
  - update `lastDrumHitLabel: hit.label`.
  - do not create oscillators/noise nodes.
  - do not add active voice cleanup.
  - leave `activeDrumVoiceCount` unchanged.
- `playPianoLiveNote(note, target, { allowSound: false })`
  - resolve target exactly as today: `target === "bass" ? "bass" : "fm-synth"`.
  - update `lastPianoLiveNoteLabel` and `lastPianoLiveTarget`.
  - do not call `playFmSynthNote` or `playBassNote`.
  - do not schedule any Web Audio.

Muted, volume-zero, and engine-not-ready behavior for scoped actions:

- For `playDrumVoice`, update `lastDrumHitLabel` before returning for engine-not-ready, muted, or volume-zero cases.
- For `playPianoLiveNote`, update `lastPianoLiveNoteLabel` and `lastPianoLiveTarget` before returning for engine-not-ready, muted, or volume-zero cases.
- This preserves V5-9 `EVT` and visual feedback even when audible scheduling is blocked by master audio state.
- Keep actual audible scheduling guarded by existing `isAudioEngineAudibleReady(...)`.

Important Piano detail:

- `playPianoLiveNote` currently delegates to `playFmSynthNote` or `playBassNote` internally.
- V5-11 should gate only `playPianoLiveNote`.
- Standalone FM Synth controls calling `playFmSynthNote` and standalone Bass controls calling `playBassNote` must remain unchanged and ungated by patch graph.

### Room Call-Site Changes

Import helpers into `src/3d/Level1RecordingStudioRoom.tsx`:

```ts
canDrumHitPatchReachSpeakers,
canPianoLivePatchReachSpeakers,
```

Piano keys:

- Compute a boolean in `StudioPianoShell`:

```ts
const canPianoLiveSound = localDawState
  ? canPianoLivePatchReachSpeakers(localDawState.patch)
  : false;
```

- Pass `canPianoLiveSound` down to every `StudioPianoKey`.
- Update `StudioPianoKey` props with `allowSound: boolean`.
- Call:

```ts
localDawAudioActions?.playPianoLiveNote({
  ...note,
  gainScale,
}, target, { allowSound });
localDawActions?.recordPianoNoteEvent(note);
```

Recording remains unchanged.

Drum machine buttons:

- In `StudioDrumMachineControls`, each hit already has `hit.kind`.
- Compute per-hit:

```ts
const allowSound = localDawState
  ? canDrumHitPatchReachSpeakers(localDawState.patch, hit.kind)
  : false;
```

- Call:

```ts
localDawAudioActions?.playDrumVoice({
  ...hit,
  gainScale,
}, { allowSound });
```

Physical drum kit pieces:

- Pass `localDawState` or a precomputed `allowSound` value into `StudioDrumKitPiece`.
- Prefer computing close to each piece:

```ts
const allowSound = localDawState
  ? canDrumHitPatchReachSpeakers(localDawState.patch, piece.hit.kind)
  : false;
```

- Call:

```ts
localDawAudioActions?.playDrumVoice({
  ...piece.hit,
  gainScale,
}, { allowSound });
```

Cymbal/hat handling:

- Current generated drum kinds are `kick`, `snare`, and `hat`.
- Any physical cymbal piece using `hit.kind === "hat"` should use the Hat mic path.
- Do not require overhead mics for current generated cymbal/hat hits.

### Checklist Items Achieved

- [x] Added pure local patch-path helpers for Piano-live and Drum generated-source paths.
- [x] Added optional generated-sound action options for scoped Piano-live and Drum actions.
- [x] Gated Piano-live generated sound by `piano-out -> Audio Interface input` plus `Audio Interface out -> Speakers`.
- [x] Gated Kick, Snare, and Hat generated drum sound by their mic-to-mixer path, Drum Mixer out-to-interface path, and speaker output path.
- [x] Preserved last-event visual feedback for scoped Piano/Drum attempts when disconnected, muted, volume-zero, or engine-not-ready.
- [x] Kept standalone FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome behavior unchanged.
- [x] Avoided new patch nodes, ports, cable state, sync state, shared state, SoundCloud routing, collision, and interaction changes.

### Completed Implementation

V5-11 added pure patch path helpers in `src/3d/useLocalDawState.ts`, optional `LocalDawGeneratedSoundOptions` in `src/3d/useLocalDawAudioEngine.ts`, and scoped `allowSound` wiring in `src/3d/Level1RecordingStudioRoom.tsx`.

`playDrumVoice(...)` and `playPianoLiveNote(...)` now treat `allowSound === false` as an attempted local event: they update the relevant last-event label for visual feedback and skip Web Audio scheduling. Muted, volume-zero, and engine-not-ready scoped Piano/Drum attempts now also preserve event labels before returning.

The Piano-live gate is applied at the `playPianoLiveNote(...)` boundary so its internal FM/Bass scheduling is skipped only for Piano-live attempts. Standalone FM Synth and Bass controls still call their original actions without patch graph gating.

### Acceptance Criteria

- Default patch state allows Piano-live generated sound when engine is ready, unmuted, and volume is above zero.
- Default patch state allows Kick/Snare/Hat generated drum sound when engine is ready, unmuted, and volume is above zero.
- Unplugging Piano Out blocks audible Piano-live generated sound.
- Clicking Piano while unplugged still updates key, last-event, and record feedback.
- Reconnecting Piano Out to any Audio Interface input 1-4 restores audible Piano-live sound.
- Unplugging Kick Mic blocks audible Kick generated sound only.
- Unplugging Snare Mic blocks audible Snare generated sound only.
- Unplugging Hat Mic blocks audible Hat generated sound only.
- Drum hit feedback still updates when a mic path is disconnected.
- Unplugging Drum Mixer Out blocks audible Kick/Snare/Hat generated sound, while hit feedback still updates.
- Unplugging Audio Interface Out blocks audible Piano-live and Drum generated sound, while event feedback still updates.
- Loose active/inactive cables and null endpoints do not count.
- Master mute and volume zero still block audible scheduling even when patch paths are complete, while scoped feedback still updates.
- Standalone FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome behavior remains unchanged.
- No new patch nodes, ports, cable state, sync state, or shared state are added.

### Build And Manual Checks

Build:

- Worker `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manager `npm.cmd run build` passed with the existing Vite large chunk warning.
- Browser/manual interaction checks remain pending and queued for the V5 recovery/usability pass.

Manual checks:

- Default:
  - Initialize audio, unmute, set volume above zero.
  - Piano-live key is audible.
  - Kick/Snare/Hat drum machine buttons are audible.
  - Physical drum kit Kick/Snare/Hat hits are audible.
- Piano:
  - Unplug Piano Out.
  - Click Piano key.
  - Key, last-event, and record feedback updates.
  - No Piano-live sound.
  - Reconnect Piano to input 3 or 4.
  - Piano-live sound returns.
- Drum mic:
  - Unplug Kick Mic.
  - Kick feedback updates but no Kick sound.
  - Snare/Hat remain audible if patched.
  - Repeat similarly for Snare and Hat.
- Drum mixer:
  - Unplug Drum Mixer Out.
  - Kick/Snare/Hat feedback updates but no generated drum sound.
- Speaker output:
  - Unplug Audio Interface Out.
  - Piano/Drum events update.
  - `PATCH`/`AUD` speaker state should reflect the disconnect.
  - No scoped Piano-live/Drum generated sound.
- Master:
  - With full patch path, mute engine.
  - Events update, no sound.
  - With full patch path, volume zero.
  - Events update, no sound.
- Deferred sources:
  - Standalone FM Synth note controls still behave as before.
  - Bass Machine note controls still behave as before.
  - Bass Pattern still behaves as before.
  - Metronome still behaves as before.
  - Looper, DJ, SoundCloud/jukebox unchanged.

### Risks

- The largest risk is accidentally gating standalone FM Synth/Bass because `playPianoLiveNote` delegates into those functions. Keep the patch gate at `playPianoLiveNote`, and leave standalone functions unchanged.
- Updating event labels before audio readiness returns changes visual feedback for muted/volume-zero cases. That is intended for scoped Piano/Drum only, but verify V5-9 speaker `EVT` behavior still feels right.
- `activeDrumVoiceCount` should not increase for gated-off events. Otherwise the meter may imply actual active audio.
- Physical drum kit pieces must receive the same gate as drum machine buttons, or behavior will be inconsistent.
- Missing `localDawState` should fail closed for patch-gated sound but still allow UI activation where possible.

### Wishlist Mapping

Directly targets:

- Implement optional local gating for app-owned generated sounds.
- Make Piano and Drum patch paths behaviorally meaningful.
- Show `mic unplugged` style feedback groundwork when a user hits a drum whose mic path is disconnected.
- Make V5-9 `EVT` / `PATCH` / `AUD` speaker feedback represent scoped generated-source behavior.

Partially supports:

- Add port status lights for active signal.
  - V5-11 affects audible scheduling and last-event feedback, but does not add new per-port active-signal UI.
- Make the Audio Interface the central truth panel for studio connectivity.
  - V5-11 makes Audio Interface input/output patch paths affect scoped generated sound.

Deferred wishlist coverage:

- FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome patch gating waits for future node/port phases.
- Shared/multiplayer patch state waits for an explicit sync design phase.
- SoundCloud/raw audio routing remains out of scope.
- Full modular DAW signal routing remains out of scope.

### Non-Goals

- No doc/changelog closure.
- No SoundCloud/raw stream routing.
- No SoundCloud Web Audio proxying.
- No sync/session/server/shared patch state.
- No new patch nodes, ports, or cables.
- No new patch interactions.
- No collision/controller/base interaction changes.
- No general-purpose DAW routing.
- No FM Synth, Bass Machine, Bass Pattern, Looper, DJ, metronome, or SoundCloud patch gating.
- No overhead mic gating for current Kick/Snare/Hat generated voices.

## V5-12: Manual In-World Patching Recovery And Usability Pass

Status: `[~]` recovery/usability pass in progress. Small top-down screenshot camera pan, WASD movement, true free-fly camera, and interface layout fixes landed.

### Summary

Run a manual in-browser recovery and usability pass for the full Vision 5 loop.

V5-12 should validate the Recording Studio patch workflow end to end: visibility, default signal-path readability, click-to-unplug/reconnect, loose cable preview, patch status feedback, and V5-11 scoped Piano-live/Drum audio gating.

This is not a feature-grab phase. Small fixes are acceptable only when they unblock or clarify the existing V5-1 through V5-11 experience. Remaining wishlist gaps should become follow-up phases instead of being crammed into V5-12.

### Manager Recovery Notes

- Added top-down arrow-key panning so the Recording Studio and patch path can be reframed for screenshots during the V5-12 manual pass.
- Pan applies only while top-down mode is active and clears when returning to first-person.
- Added WASD movement while top-down mode is active. WASD moves the stored player position through the existing collision helpers, keeps the marker updated, and makes the overhead camera follow the moved player.
- Arrow keys remain camera-only screenshot panning. WASD remains player movement.
- Added Backquote free-cam toggle while top-down mode is active. In free-cam, WASD moves the overhead camera without moving the player marker. Pressing Backquote again returns to normal follow-player top-down movement.
- Added visible `PLAYER CAM` / `FREE CAM` HUD feedback so the toggle state is confirmable in-world.
- Broadened free-cam toggle recognition to support the physical `Backquote` key and typed backquote/tilde key values.
- Converted free-cam into true free-fly mode: it owns an independent 3D camera position, ignores player collision, uses drag-to-look, moves forward through the current camera pitch/yaw, and supports vertical rise/drop with `Space`/`E` and `Q`/`Ctrl`.
- Moved the Audio Interface to the opposite side of the DAW desk after screenshot review showed the old position made the DAW area visually messy.
- Shifted all `audio-interface-*` patch port registrations with the interface so rendered cables and click targets stay aligned.
- Put the Audio Interface on its own small side table to the left of the DAW after screenshot review showed it still read as part of the crowded DAW surface.
- Shifted all `audio-interface-*` patch port registrations again so rendered cables and click targets follow the side-table placement.
- Removed the blue wall slab near the DAW, replaced the temporary wall placeholder with the live `DAW / YOU / LOCAL` role badge in that wall position, and hid the duplicate DAW sign on the desk surface.
- Shifted the Audio Interface side table farther left toward the room wall after screenshot review showed it still overlapped the DAW controls.
- Nudged the Audio Interface side table "down" relative to the user's screenshot-facing view and shifted the interface patch ports with it after the previous left/right move used the room axis instead of the camera-relative direction.
- Manager `npm.cmd run build` passed after each camera-control change with the existing Vite large chunk warning.

### Manual / Browser Checklist

Baseline studio visibility:

- Enter Recording Studio from normal player flow.
- Confirm Audio Interface is visible near the DAW cluster and labels are readable enough.
- Confirm Piano, Drum Kit, Drum Mixer, drum mics, speakers, and default cables are visible from first-person.
- Confirm top-down/overview readability of the default signal path:
  - Drum mics -> Drum Mixer.
  - Drum Mixer Out -> Audio Interface IN 1.
  - Piano Out -> Audio Interface IN 2.
  - Audio Interface Out -> Speaker In.
- Confirm cables do not cover piano keys, drum heads, DAW controls, Audio Interface labels, Drum Mixer labels, or speaker labels.

Default patch/status state:

- Confirm default `Mics 5/5`.
- Confirm Piano shows connected to `IN 2`.
- Confirm Drum Mixer Out shows connected to interface.
- Confirm Audio Interface aggregate shows expected input/output patch status.
- Confirm speaker panel shows `EVT`, `PATCH`, and `AUD` labels visibly.
- Confirm `PATCH` is on when `audio-interface-out` is exactly plugged to `speaker-system-input`.

Cable interaction:

- Click `Piano Out -> Interface IN 2` cable end.
- Confirm cable no longer renders fully connected.
- Confirm loose preview appears from the still-connected endpoint.
- Aim at `IN 3` or `IN 4`; preview should meet the patch target.
- Click compatible input; cable reconnects and preview disappears.
- Try invalid target:
  - input -> input should no-op.
  - output -> output should no-op.
  - occupied interface input should no-op unless it is the active cable's existing port.
- Unplug a second cable while one is already loose.
- Confirm the newly unplugged cable becomes active and the prior loose cable remains loose/inactive.
- Reconnect the active cable.
- Confirm statuses update after each reconnect.

Audio gating:

- Initialize local audio engine, unmute, set volume above zero.
- Default patch:
  - Piano-live key is audible.
  - Drum machine Kick/Snare/Hat are audible.
  - Physical Drum Kit Kick/Snare/Hat are audible.
- Piano unplug:
  - Unplug Piano Out.
  - Click a piano key.
  - Key/last-event/record feedback updates.
  - Piano-live sound is not audible.
  - Reconnect to `IN 3` or `IN 4`; Piano-live sound returns.
- Drum mic unplug:
  - Unplug Kick Mic.
  - Trigger Kick; feedback updates but Kick sound is not audible.
  - Snare/Hat remain audible if patched.
  - Repeat for Snare and Hat.
- Drum Mixer Out unplug:
  - Trigger Kick/Snare/Hat.
  - Feedback updates but generated drum sound is not audible.
- Interface Out unplug:
  - Click Piano and Drum triggers.
  - `EVT` can light.
  - `PATCH` and `AUD` are off/dim.
  - No scoped Piano-live/Drum sound.
- Master authority:
  - With full patch path, mute engine; events update, no sound.
  - With full patch path, set volume zero; events update, no sound.
- Deferred sources:
  - Standalone FM Synth note controls behave as before.
  - Bass Machine notes and Bass Pattern behave as before.
  - Metronome behaves as before.
  - Looper/DJ/SoundCloud/jukebox behavior remains unchanged.

Recovery/reset:

- If there is already an in-world reset/default affordance, test it.
- If no in-world reset affordance exists, record that as a follow-up gap, not a V5-12 blocker unless manager approves adding a tiny reset control.
- Confirm `resetPatchToDefaults` source action still exists and restores default state if invoked by future UI.

### Code Areas To Inspect If Checks Fail

Visibility/placement:

- `src/3d/Level1RecordingStudioRoom.tsx`
  - `StudioAudioInterface`
  - `StudioDrumMixerAndMics`
  - `StudioPianoShell`
  - `StudioDrumKit`
  - `StudioSoundActivitySpeakers`
  - `StudioStaticPatchCables`

Cable endpoint or target mismatch:

- `src/3d/patchPortRegistration.ts`
  - `LEVEL1_PATCH_PORT_REGISTRATIONS`
  - `worldPosition`
  - `visualRadius`
- `src/3d/Level1RecordingStudioRoom.tsx`
  - `getStudioPatchCablePoints`
  - `StudioStaticPatchCables`
  - `StudioLoosePatchCablePreview`
  - `StudioPatchInteractionTargets`

Unplug/reconnect state bug:

- `src/3d/useLocalDawState.ts`
  - `unplugPatchCableEnd`
  - `connectActivePatchCableToPort`
  - `canConnectActivePatchCableToPort`
  - `canConnectPatchPorts`
  - `isPatchPortOccupied`

Status display bug:

- `src/3d/useLocalDawState.ts`
  - `getPatchPortConnectionStatus`
  - `isPatchPortConnected`
  - `isPatchCablePluggedBetween`
- `src/3d/Level1RecordingStudioRoom.tsx`
  - `StudioAudioInterface`
  - `StudioDrumMixerAndMics`
  - `StudioSoundActivitySpeakers`
  - `createStudioStatusLightLabelCanvas`

Audio gating bug:

- `src/3d/useLocalDawState.ts`
  - `canPianoLivePatchReachSpeakers`
  - `canDrumHitPatchReachSpeakers`
  - `canDrumMixerPatchReachInterface`
- `src/3d/useLocalDawAudioEngine.ts`
  - `playDrumVoice`
  - `playPianoLiveNote`
  - `LocalDawGeneratedSoundOptions`
- `src/3d/Level1RecordingStudioRoom.tsx`
  - `StudioPianoKey`
  - `StudioDrumMachineControls`
  - `StudioDrumKitPiece`

### Small Safe V5-12 Fix Candidates

Safe if found during manual checks:

- Minor port `worldPosition` or `visualRadius` tweaks in `src/3d/patchPortRegistration.ts` to make targets easier to click.
- Minor label/canvas sizing or opacity adjustments in `src/3d/Level1RecordingStudioRoom.tsx`.
- Minor cable bend adjustments if a cable covers a key, drum head, label, or control.
- Fix obvious stale status wording if it contradicts current patch state.
- Fix a missed dependency array or prop threading issue if manual interaction shows stale `allowSound` or stale status.
- Add a tiny, existing-pattern reset-to-default patch control only if manager explicitly allows it as recovery-critical. Otherwise defer it.

Avoid in V5-12 unless separately approved:

- New interaction modes.
- Escape/click-empty-space cancel.
- Hover highlighting.
- Invalid-target effects.
- New patch nodes/ports.
- New instruments.
- New audio routing beyond V5-11 scoped gating.

### Remaining Wishlist Gap Phases

Good candidates after V5-12:

- V5 gap: Patch Reset UI
  - In-world `Reset Patch` control wired to existing `resetPatchToDefaults`.
  - Covers "Make default connections easy to reset if the user makes a mess."
- V5 gap: Cancel/Drop Loose Cable
  - Click empty space or press Escape to cancel/drop.
  - Make loose inactive cables visibly hang/rest near their remaining endpoint.
- V5 gap: Compatible Hover And Invalid Feedback
  - Hover highlight for compatible ports.
  - Rejected-target feedback for incompatible ports.
- V5 gap: Active Signal Lights
  - Audio Interface port lights for empty/connected/active signal/invalid target.
  - Mic lights only when hit and patched.
  - Drum Mixer output meter showing whether drum submix is feeding the interface.
- V5 gap: Future Instrument Patch Nodes
  - FM Synth Out -> Audio Interface.
  - Bass Machine Out -> Audio Interface.
  - Looper Out -> Audio Interface.
  - DJ Station Out -> Audio Interface.
  - Vocal Mic / Guitar Amp Mic later.
- V5 gap: Future Instrument Gating
  - Only after those instruments have patch nodes/ports.
- V5 gap: Shared Patch Design
  - Explicit design before any sync/session/server patch state.

### Acceptance Criteria

- Manual browser pass is performed against the Recording Studio.
- Default visual signal path is understandable in first-person and top-down.
- Cable unplug/reconnect workflow works for Piano, Drum Mixer, Drum Mics, Interface, and Speakers.
- Loose preview works and disappears on reconnect.
- Patch status labels/lights update after unplug/reconnect.
- V5-11 gating works for Piano-live and Drum generated sound.
- Standalone FM Synth, Bass Machine, Bass Pattern, Looper, DJ, SoundCloud/jukebox, and metronome remain unchanged.
- Any V5-12 code fixes stay small and tied directly to failed manual checks.
- Remaining wishlist gaps are listed as follow-up phases instead of being crammed into V5-12.
- `npm.cmd run build` passes after any V5-12 code changes.

### Build And Manual Checks

For prep/doc-only V5-12:

- No build required unless manager asks.

For implementation/recovery V5-12:

- Run `npm.cmd run build`.
- If a dev server/browser pass is requested, start the app normally and report the local URL.
- Manually check:
  - default layout/readability.
  - cable workflow.
  - status feedback.
  - audio gating.
  - deferred source non-regression.
  - reset/recovery status or gap.

### Risks

- V5-12 can balloon into a feature phase because many wishlist items are now visible and tempting.
- Manual audio checks may be hard to report precisely without a shared test script.
- Small target-position changes can improve clicking but accidentally desync cable visuals if not checked from both first-person and top-down.
- Adding reset/cancel/hover in the recovery pass could hide real usability findings that deserve separate phases.
- Existing untracked/dirty files mean changes must stay narrowly scoped and avoid cleanup.

### Wishlist Mapping

Directly validates:

- Audio Interface visibility, labels, status lights, and central connectivity panel.
- Drum Mixer and Drum Mic visibility, labels, and connection feedback.
- Patch cable readability, unplug/reconnect workflow, and loose preview.
- Default connection readability.
- Instrument connection feedback.
- Speaker/meter `EVT` / `PATCH` / `AUD` feedback.
- Optional local gating for app-owned Piano-live and Drum generated sounds.

Identifies follow-up phases for:

- default patch reset UI.
- cancel/drop loose cable behavior.
- compatible hover and invalid-target feedback.
- active signal port lights and mic hit-while-patched lights.
- future instrument patch nodes and gating.
- shared patch design.

### Non-Goals

- No implementation before approval.
- No docs write outside this V5-12 section and existing status markers.
- No changelog edits.
- No new patch nodes/ports.
- No new instruments.
- No SoundCloud/raw audio routing.
- No sync/session/server/shared patch state.
- No broad Web Audio routing.
- No commercial DAW completeness.
- No new hover/invalid/cancel/reset behavior unless specifically approved for V5-12.

## Guardrails

- Keep the patch system local until sync is explicitly designed.
- Keep the first pass visual-first.
- Keep SoundCloud outside the patch graph.
- Do not make tiny ports impossible to click; use generous invisible hitboxes if needed.
- Prioritize first-person usability over simulated cable physics.
- Keep all cables and ports readable from top-down view.
- Preserve Exit, recovery, camera controls, and existing station behavior.
- Run `npm.cmd run build` for implementation phases.
