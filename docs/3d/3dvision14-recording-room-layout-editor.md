# Secret 3D World Vision 14 - Recording Room Layout Editor

## Purpose

Vision 14 turns the recording room into a movable studio layout instead of a fixed coordinate sculpture.

The problem is now clear: every time the room gets more useful, placement becomes the next blocker. The DJ booth, drums, DAW table, piano, audio interface, patch station, looper, monitors, guitar stand, and mic stands all need to be adjustable in-world without a code edit. The user should be able to point at a station, press `F`, carry the real object with the mouse/body, and click to place it.

The goal is not physics. The goal is a fast, readable, safe layout editor that lets the room be tuned while standing inside it.

## Interaction Vision

Core flow:

1. Aim at a movable station.
2. Press `F`.
3. Enter Move Mode immediately.
4. The real object starts moving right away with the user's camera/body target.
5. Use `WASD` to walk while carrying the station.
6. Move the mouse left/right to turn and move the station around the room.
7. Move the mouse up/down to raise/lower the station.
8. Use `Q/E` to rotate the station around the vertical axis.
9. Click to place the station.
10. Press `Esc` to cancel and restore the station to its pre-grab transform.

Important choice:

- Do not use a translucent preview as the main behavior.
- The actual object should move as soon as the user presses `F`.
- Store the starting transform on grab so cancel/rollback is always possible.
- Show a highlight and status label so everyone can tell the room is in Move Mode.

Suggested status label:

```text
MOVING DJ BOOTH
WASD MOVE
MOUSE HEIGHT
Q/E ROTATE
CLICK PLACE
ESC CANCEL
```

## Movement Model

Default movement should feel like carrying an object:

- The selected station follows a point in front of the camera.
- Mouse left/right changes facing and horizontal placement through camera yaw.
- Mouse up/down raises or lowers the station through camera pitch / target height.
- `WASD` still moves the player/camera while holding the object.
- `Q/E` rotates the station on the Y axis.
- Click commits the transform.
- `Esc` restores the starting transform.

Useful follow-up controls:

- `G`: toggle floor lock.
- Floor lock ON: station follows the floor/platform height and does not float.
- Floor lock OFF: mouse up/down controls free height.
- `H`: reset selected station height to the default floor/platform height.
- `F` while moving may also place the object, if that feels better than click-only.

Recommended initial default:

- Start with free-height movement because the user explicitly wants mouse up/down to raise/lower the object.
- Add floor lock quickly because large stations can accidentally float.
- Keep the placement system honest with a visible height/lock label.

## Movable Stations

Start with large room units, not every tiny mesh.

Movable groups should include their visible geometry, labels, hitboxes, controls, and role badges where practical.

Initial movable station candidates:

- DAW table / desk station.
- SoundCloud DJ booth.
- Drum kit station.
- Piano station.
- Audio interface / patch station.
- Looper station.
- Guitar stand.
- Mic stands.
- Room monitor groups.
- Instrument rack / bass / synth stations after the core pattern works.

Do not move tiny controls independently in the first pass. If the DJ booth moves, its deck buttons, mixer screen, platters, cue pads, hit targets, local SoundCloud sign, and monitor attachments must move together.

## Product Boundary

In scope:

- Local in-world layout editing for recording-room stations.
- `F` grab/place behavior for movable station groups.
- Real object moves immediately while grabbed.
- Mouse/body movement drives object position.
- Mouse up/down can raise/lower object.
- `WASD` camera/player movement remains available while moving an object.
- `Q/E` station rotation while moving.
- Click to place.
- `Esc` cancel/rollback.
- In-world Move Mode feedback.
- Reset selected station and reset all local layout.
- Local persistence after the first working pass.

Out of scope for the first implementation:

- Physics simulation.
- Collision solving between furniture.
- Multiplayer/shared layout sync.
- Permission system for who can edit the room.
- Moving individual small buttons, knobs, sliders, or cables independently.
- Rebuilding the room art style.
- Moving normal 2D app panels.

Later shared scope:

- Shared layout state can be added only after local editing feels good.
- Shared mode needs reducer-owned transforms, edit locks, holder/editor identity, disconnect rollback or release, and reset permissions.

## Code Facts

Current facts from code research:

- Recording room rendering lives mainly in `src/3d/Level1RecordingStudioRoom.tsx`.
- Many station positions are hardcoded constants, including:
  - `STUDIO_PIANO_POSITION`
  - `STUDIO_DRUM_KIT_POSITION`
  - `STUDIO_SOUNDCLOUD_DJ_POSITION`
  - DJ platform and ramp positions
  - many child SoundCloud booth positions
- The DJ booth already renders as a grouped unit at `STUDIO_SOUNDCLOUD_DJ_POSITION` with child controls inside that group.
- The drum kit renders as a group at `STUDIO_DRUM_KIT_POSITION`.
- The piano renders as a group at `STUDIO_PIANO_POSITION`.
- Interactions are centralized through `src/3d/interactions.tsx`.
- `useRegisterInteractable` registers objects for aim/click activation.
- `AimInteractionController` currently uses `KeyE` for keyboard activation and pointer down for active clickable/shootable interactions.
- `ThreeDModeShell.tsx` owns first-person/free-cam movement, pointer lock, mouse look, keyboard movement, and top-down/free-camera behavior.
- Free cam already supports `WASD` movement and vertical movement keys.
- The current interaction system can return aim hits and activation context with hit point, aim origin, and aim direction.

Implication:

- Vision 14 should introduce a layout transform registry instead of continuing to edit hardcoded station coordinates one at a time.
- Movable station transforms should wrap existing station groups without forcing every child control to know it moved.
- The layout editor should reuse the existing interaction registry rather than inventing a parallel raycast system.

## Proposed Data Model

Local layout transform:

```ts
type StudioLayoutStationId =
  | "daw"
  | "dj"
  | "drums"
  | "piano"
  | "audio-interface"
  | "looper"
  | "guitar"
  | "monitors";

type StudioLayoutTransform = {
  position: Vec3;
  rotation: Vec3;
};

type StudioLayoutState = Record<StudioLayoutStationId, StudioLayoutTransform>;
```

Move mode state:

```ts
type StudioLayoutMoveState = {
  stationId: StudioLayoutStationId;
  startTransform: StudioLayoutTransform;
  currentTransform: StudioLayoutTransform;
  distanceFromCamera: number;
  floorLock: boolean;
};
```

The first implementation can keep this local in React state. Persistence and shared sync should be separate phases.

## Phase Plan

- [x] V14-1: Movable Station Registry.
- [x] V14-2: Local Layout Transform Application.
- [x] V14-3: `F` Grab And Immediate Live Move Mode.
- [x] V14-4: Rotation, Height, Cancel, And Place Controls.
- [x] V14-5: Move Mode Feedback And Safety UI.
- [x] V14-6: Reset And Local Persistence.
- [x] V14-6.5: Individual Monitor Move Targets.
- [hold] V14-7: Shared Multiplayer Layout Sync.
- [hold] V14-8: Advanced Editor Tools.

## Completed V14 Local Implementation

Manager-reviewed implementation completed V14-1 through V14-6 as a local-only layout editor.

Implemented behavior:

- Added a typed movable station registry for `daw`, `dj`, `drums`, `piano`, `audio-interface`, `looper`, `guitar`, and `monitors`.
- Added local layout state with versioned localStorage persistence.
- Wrapped major station clusters in movable station groups while preserving existing default positions.
- Added a new `movable` interaction mode so large station hitboxes can be aimed at without replacing normal clickable controls.
- Pressing `F` on a station starts Move Mode and the real station begins moving immediately.
- `WASD` movement remains available while carrying because the layout editor follows the normal camera aim context.
- Mouse look changes carried station position and height through the camera aim ray.
- Click or `F` places the object.
- `Esc` cancels and restores the starting transform.
- `Q/E` rotate only while Move Mode is active.
- `G` toggles floor lock.
- `H` resets the moving station height.
- `Backspace` resets the aimed or moving station.
- `Shift+Backspace` resets the full local layout.
- Added selected/moving station hitbox feedback and an in-world Move Mode status label.
- Role badges for DAW, piano, drums, looper, and DJ follow their moved stations.

Known caveat:

- Patch cables and patch-port registration targets are still world-space. Moving the audio interface, piano, drums, or related stations may visually move the station before all patch cable/port affordances follow. This should become a dedicated follow-up vision or V14 refinement if layout editing becomes central to patching.

Verification:

- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Live first-person, top-down, reset, refresh persistence, and patching checks remain manual.

## V14-6.5: Individual Monitor Move Targets

Status: `[x]` completed and manager-verified.

### Summary

Split the current movable monitor wall behavior into per-monitor move targets so each screen can be grabbed, moved, raised, rotated, placed, reset, and persisted independently.

### Implementation Spec

Approved implementation scope:

- Add individual monitor station IDs for:
  - `monitor-studio-status`
  - `monitor-transport`
  - `monitor-sequence-grid`
  - `monitor-arrangement-timeline`
  - `monitor-track-list`
  - `monitor-device-rack`
  - `monitor-mixer-view`
  - `monitor-patch-signal`
- Preserve current screen positions/rotations/sizes as the new per-monitor defaults.
- Replace the active grouped `monitors` wrapper with one `StudioLayoutStationGroup` per `StudioOverviewScreen`.
- Keep hitboxes sized to each monitor's visible screen size.
- Bump layout localStorage version so stale grouped monitor state does not affect the new individual monitor defaults.
- Keep behavior local-only.
- Keep existing screen contents unchanged.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision14-recording-room-layout-editor.md`
- `changelog.md`

Files to avoid:

- Session reducer/types.
- Sync server.
- Normal 2D app UI.
- Audio/SoundCloud hooks.

### Acceptance Criteria

- Aiming at a monitor targets that specific monitor, not the entire monitor wall.
- Pressing `F` moves only the targeted monitor.
- Click or `F` places only that monitor.
- `Esc` cancels only that monitor.
- Backspace resets only the aimed/moving monitor.
- `Shift+Backspace` resets all layout stations, including all monitors.
- Existing non-monitor stations remain movable.

### Build And Manual Checks

- `npm.cmd run build`.
- Manual: move `Transport` monitor only.
- Manual: move `Track List` monitor only.
- Manual: move `Arrangement Timeline` monitor only.
- Manual: reset selected monitor.
- Manual: refresh and confirm moved monitor persists.

### Risks

- Monitor screen IDs and station IDs must stay in sync.
- Old localStorage data should be ignored by version bump.
- Monitor hitbox depth must be enough to aim at but not visually hide the screen.

### Non-Goals

- Do not add shared monitor layout sync.
- Do not redesign monitor contents.
- Do not add a bulk monitor-wall move control in this phase.

### Completed Implementation

- Added per-monitor layout station IDs for every `StudioOverviewScreen`.
- Removed the active grouped `monitors` station behavior.
- Wrapped each overview screen in its own `StudioLayoutStationGroup`.
- Preserved each monitor's current position, rotation, and size as its default transform/hitbox.
- Bumped layout storage version to `2` so old grouped monitor layout data is ignored.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

## V14-1: Movable Station Registry

Status: `[x]` completed and manager-verified.

### Summary

Define the recording-room stations that can be moved and their default transforms.

### Implementation Spec

Approved implementation scope:

- Create a small typed registry for station IDs, labels, defaults, and movement rules.
- Keep the first registry in `src/3d/Level1RecordingStudioRoom.tsx` unless implementation pressure proves a separate module is cleaner.
- Start with the major stations that already have a top-level group or clear position constant: `dj`, `drums`, `piano`, `guitar`, `daw`, `looper`, `audio-interface`, `monitors`.
- Include label, default position, default rotation, follow distance, floor height, and default floor-lock preference where useful.
- Keep defaults identical to the current room layout.
- Do not change visible runtime behavior in this phase except for harmless type/helper additions.
- Document grouping caveats for stations whose child pieces are still spread across independent coordinates.

Expected files:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision14-recording-room-layout-editor.md`
- `changelog.md`

Files to avoid:

- Session reducer/types.
- Sync server.
- Normal 2D UI.
- Physics/collision configs.

### Acceptance Criteria

- A readable registry exists for movable station defaults.
- Registry does not change runtime behavior yet unless necessary.
- Station IDs and labels are stable enough for UI feedback and later persistence.

### Build And Manual Checks

- `npm.cmd run build`.
- No visible room layout changes expected.

### Risks

- Some stations may be composed of many independent coordinates and need a wrapper group before they can move cleanly.

### Non-Goals

- Do not implement live moving in this phase.
- Do not persist or sync layout state.

## V14-2: Local Layout Transform Application

Status: `[x]` completed and manager-verified.

### Summary

Apply local layout transforms to station groups so code can move stations through state instead of hardcoded coordinates.

### Implementation Spec

To be prepared before implementation.

Expected work:

- Add local layout state in the 3D room/shell path.
- Wrap or parameterize major station groups with their current layout transform.
- Keep defaults identical to the current layout.
- Ensure role badges and station-level interactable hitboxes follow the moved station where possible.
- Start with a small station set if needed: DJ, drums, piano, guitar.

### Acceptance Criteria

- Defaults render exactly as before.
- Changing one station transform in code moves the whole station group.
- Child controls remain clickable when their parent station moves.
- Role labels do not visibly detach from the moved station for the initial station set.

### Build And Manual Checks

- `npm.cmd run build`.
- Hidden room opens with `syncsesh`.
- DJ booth, drums, piano, and guitar still render and interact at default positions.

### Risks

- Some hitboxes may depend on world-space assumptions.
- Existing patch cables or decorative lines may not follow until later cleanup.

### Non-Goals

- Do not add player-facing Move Mode yet.
- Do not solve every tiny cable/line in the first transform pass.

## V14-3: `F` Grab And Immediate Live Move Mode

Status: `[x]` completed and manager-verified.

### Summary

Let the user aim at a movable station, press `F`, and immediately move the real object.

### Implementation Spec

To be prepared before implementation.

Expected work:

- Extend the interaction layer or add a layout editor controller that can detect the active aimed station.
- Register movable station groups as layout-editable interactables.
- Use `F` as the grab key for movable stations.
- On grab, store the starting transform and enter Move Mode.
- The real station transform updates every frame while held.
- The station follows a point in front of the camera/body.
- `WASD` should continue to move the user/camera while the object follows.
- Do not use a translucent ghost as the primary interaction.

### Acceptance Criteria

- Pressing `F` on a movable station starts Move Mode.
- The real object starts moving immediately.
- Existing click interactions do not fire accidentally when starting Move Mode.
- Non-movable controls keep their current behavior.

### Build And Manual Checks

- `npm.cmd run build`.
- First-person test: aim at DJ booth, press `F`, object begins following.
- First-person test: `WASD` moves the player while object remains attached.
- Normal object clicks still work when not moving a station.

### Risks

- `F` may conflict with future gameplay keys, so the controller should be isolated and easy to remap.
- Pointer lock and free cam input paths may need careful coordination.

### Non-Goals

- Do not persist positions yet.
- Do not implement shared multiplayer layout.

## V14-4: Rotation, Height, Cancel, And Place Controls

Status: `[x]` completed and manager-verified.

### Summary

Make Move Mode controllable enough to use for real layout work.

### Implementation Spec

To be prepared before implementation.

Expected work:

- Click places the object.
- `Esc` cancels and restores the starting transform.
- `Q/E` rotate around vertical axis while moving.
- Mouse up/down raises/lowers the carried station.
- Add optional `G` floor lock toggle if this fits cleanly.
- Add optional `H` reset-height shortcut if floor/height behavior needs a quick repair.

### Acceptance Criteria

- Click commits the moved transform.
- `Esc` cleanly restores the pre-grab transform.
- `Q/E` rotation is smooth and predictable.
- Mouse vertical movement can raise/lower the object.
- User can walk and look while carrying.

### Build And Manual Checks

- `npm.cmd run build`.
- Move a station, rotate it, place it.
- Move a station, raise/lower it, place it.
- Move a station, cancel it, confirm original transform returns.

### Risks

- Free height can make large stations float.
- Floor/platform height detection may need a later pass.

### Non-Goals

- Do not add collision or physics.
- Do not force snap/grid behavior yet.

## V14-5: Move Mode Feedback And Safety UI

Status: `[x]` completed and manager-verified.

### Summary

Make it obvious that a station is being moved, especially when testing with friends.

### Implementation Spec

To be prepared before implementation.

Expected work:

- Add a highlight/outline or emissive state to the selected station.
- Add an in-world or overlay label with station name and controls.
- Show current floor lock / free height mode.
- Show cancel/place controls.
- Optional: show a floor placement marker under the station.

### Acceptance Criteria

- Friends can tell the room is in Move Mode.
- User can tell which station is currently selected.
- User can see how to place or cancel without remembering the controls.

### Build And Manual Checks

- `npm.cmd run build`.
- First-person readability check.
- Top-down readability check.

### Risks

- Too much UI can clutter the room.

### Non-Goals

- Do not add a full editor menu yet.

## V14-6: Reset And Local Persistence

Status: `[x]` completed and manager-verified.

### Summary

Make local layout edits survive refresh and remain recoverable.

### Implementation Spec

To be prepared before implementation.

Expected work:

- Save local layout transforms to localStorage.
- Load saved layout on hidden-room entry.
- Add reset selected station.
- Add reset all local layout.
- Keep defaults versioned or guarded so old saved layouts can be ignored if the registry changes.

### Acceptance Criteria

- Moved stations persist after refresh in the same browser.
- Reset selected restores one station.
- Reset all restores every station to the code defaults.
- Bad or stale saved layout data does not crash the room.

### Build And Manual Checks

- `npm.cmd run build`.
- Move, refresh, confirm position persists.
- Reset selected.
- Reset all.

### Risks

- Saved layouts can conflict with later code layout changes unless versioned.

### Non-Goals

- Do not sync layouts between users in this phase.

## V14-7: Shared Multiplayer Layout Sync

Status: `[hold]` on hold.

### Summary

After local editing feels good, allow the room layout to be shared between users.

### Future Requirements

- Reducer-owned shared layout transforms.
- One editor lock per station.
- Holder/editor user ID and display name.
- Disconnect/reload releases edit locks.
- Reset permissions.
- Clear friend-visible feedback when someone else is moving a station.

### Non-Goals While On Hold

- Do not add sync events during V14-1 through V14-6.

## V14-8: Advanced Editor Tools

Status: `[hold]` on hold.

### Future Ideas

- Snap to grid.
- Snap to wall.
- Duplicate decorative monitors.
- Save named room layouts.
- Layout import/export.
- Fine rotate mode.
- Top-down drag editing.
- Station collision warnings.

## Manager Loop Notes

- Use `docs/Agents/agent.md` as the operating loop.
- Run one active phase at a time.
- Keep only one phase marked `[~]`.
- Before implementation, require a worker preparation spec covering expected files, files to avoid, reused helpers, acceptance checks, risks, and non-goals.
- Do not implement a phase until the approved spec is written into this doc.
- Every implementation phase must run `npm.cmd run build`.
- Close a phase only after code review, build confirmation, doc cleanup, and changelog update when code changed.
- Start local-only. Shared layout sync stays on hold until the local layout editor is useful and safe.

## Manual Test Plan

Required checks as phases land:

- Hidden 3D room still opens with `syncsesh`.
- Normal 2D app remains clean.
- Exit button and WebGL fallback remain clean.
- Pointer lock / first-person movement still works.
- Tab/free cam behavior still works.
- Existing click interactions still work when not in Move Mode.
- `F` only grabs movable stations, not tiny controls.
- Object starts moving immediately on `F`.
- `WASD` moves the user while holding an object.
- Mouse up/down raises/lowers the object.
- `Q/E` rotates the object.
- Click places the object.
- `Esc` cancels and restores the original transform.
- Reset restores defaults.
- DJ booth, drums, piano, DAW, audio interface, looper, guitar, and monitor groups remain readable after moves.

## Assumptions

- The first usable version should be local-only.
- Major stations should move as grouped units.
- The real object moves immediately; no ghost preview is required.
- Free-height movement is valuable, but floor lock will probably be needed soon after.
- Shared multiplayer layout is a later design, not part of the first implementation pass.
- The interaction system should reuse `src/3d/interactions.tsx` rather than adding a second aim/raycast system.
