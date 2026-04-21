# Secret 3D World Vision 3

## Purpose

Vision 3 tracks the completed and remaining work for turning Level 1 from a single station room plus separate Level 2 range into one connected multi-room environment.

The Control Room is not Level 3. The Control Room is the first room of Level 1: the computer/dashboard room users start in. The shooting range should sit alongside it as another room in the same Level 1 footprint. Users should move through openings in the walls, not through separate registry-level teleports.

This document removes stale "Level 3 Control Room" framing and prepares the next implementation phases around a larger connected Level 1.

## Current Baseline

Already implemented:

- Secret code unlock opens the hidden 3D shell.
- Level 1 is the default hidden world and now contains the Control Room plus the Shooting Range in one walkable footprint.
- The Control Room is the first room users enter.
- The Shooting Range is connected through a walk-through opening/hallway rather than a required `E`-button door.
- `?level=level-2-range` exists as a temporary hidden dev/test shortcut, but it is no longer the desired user-facing path.
- WASD movement, camera look, pointer-lock fallback, Tab top-down view, and Exit are in place.
- `clickable` and `shootable` interaction modes exist.
- The shooting range has a local 30-second challenge.
- Completed range score summaries sync through the existing reducer.
- Low-rate free-roam presence syncs level id, position, yaw, and timestamp.
- Station-based presence remains the fallback when free-roam presence is missing or stale.
- Control Room wall monitors render timer, dashboard, participant, and range-summary data from existing state.
- Desk computer monitors render live dashboard-style canvas textures from the same timer/user state.
- Joined users are assigned computer stations.
- When a joined user unlocks the 3D world, the camera can pull back from that user's assigned computer.
- Clicking the local user's computer monitor can animate back into the normal 2D dashboard.
- A simple first-person body rig renders during FPV.
- Idle sim/test users now roam locally on deterministic routes. Ready/spectating sim/test users still use station fallback.
- The expanded Control Room includes a balcony, stair/ramp traversal surfaces, hero monitor wall, RGB workstation props, lounge/kitchen props, and a 3D SoundCloud jukebox shell.
- The Shooting Range includes a local-only interactive gun rack with five procedural weapons and an in-world selected-weapon plaque.

Vision 3 is still tracking the remaining work for a larger connected Level 1, but the main Control Room plus Shooting Range merge is already implemented.

## Vision

### Wishlist

- [x] Treat the Control Room as the first room of Level 1, not Level 3.
- [x] Treat the Shooting Range as another room inside Level 1, not the long-term separate Level 2 experience.
- [ ] Keep all three initial rooms inside one walkable Level 1 footprint.
- [x] Connect rooms through openings in the walls rather than teleport-style doors.
- [x] Keep the normal 2D app free of visible level selectors.
- [x] Preserve `?level=level-2-range` as a temporary dev/test shortcut after the Level 1 range merge.
- [x] Expand the current first room into a true Control Room.
- [x] Put more computers and monitors on the Control Room walls.
- [x] Make the main Control Room larger and more architectural.
- [x] Add a raised balcony/platform where the main wall computers and monitor array live.
- [x] Add three stairs on each side of the computer area leading up to the balcony.
- [x] Arrange the monitor wall with one large blue main screen in the middle.
- [x] Add two long green side screens flanking the main blue screen.
- [x] Surround the main screens with many smaller wall monitors.
- [x] Make the room read as a busy control room where workers are vibe coding.
- [x] Add lounge and lifestyle props: couch, kitchen area, island bar, and countertop details.
- [x] Add a blow torch lighter prop on the kitchen/bar counter as a small environmental detail.
- [x] Add cool desktop rigs with RGB lighting and distinctive keyboards.
- [x] Add two wall computers for dashboard-style data.
- [x] Add one large wall computer dedicated to the main timer.
- [x] Add additional smaller monitors for other session data.
- [x] Add a futuristic multi-screen SoundCloud jukebox/music command station to the Control Room.
- [ ] Show current song, playlist, waveform/equalizer, playback controls, playlist selector, and pageable song list on the jukebox.
- [x] Show useful existing data on monitors without inventing unnecessary sync state.
- [x] Give every joined user an assigned computer station.
- [x] Show the live 2D dashboard data on desk computer monitors as WebGL canvas textures.
- [x] Start the hidden-world reveal from the local user's assigned computer when the user is joined.
- [x] Let the local user click their computer monitor to zoom back into the normal 2D dashboard.
- [x] Render a simple body for the local user in first-person view.
- [x] Make the unjoined-user fallback clear so the reveal does not silently fall back to the big wall monitor.
- [x] Keep the room readable in first-person and top-down view.
- [x] Keep computer stations as places where users outside free-roam can appear seated.
- [x] Keep free-roam users visible as simple remote markers.
- [x] Let idle sim/test users roam around the 3D world automatically so solo testing feels alive.
- [x] Keep ready or spectating sim/test users visually distinct from roaming idle sims.
- [x] Keep the shooting range challenge and synced scoreboard working during the layout migration.
- [x] Add a gun rack to the Shooting Range.
- [x] Put five distinct range guns on the gun rack.
- [x] Let the gun rack read as decorative first, then optionally interactive later.
- [x] Keep gun rack weapons stylized/procedural and clearly part of the range minigame fantasy.
- [x] Avoid high-frequency movement sync.
- [x] Enrich first-person movement so walking around the Control Room feels less stiff.
- [x] Add sprint as a simple held-key movement modifier.
- [x] Add smoother acceleration/deceleration so movement starts and stops less abruptly.
- [x] Add collision sliding so players glide along walls/props instead of feeling stuck.
- [x] Add slide movement as a quick momentum move after sprinting.
- [x] Support stairs/ramps for the future balcony without making players snag on steps.
- [x] Add lightweight room/area feedback while moving through connected spaces.
- [ ] Reflect basic movement states in presence/avatars without high-frequency sync.
- [x] Keep camera polish comfortable and compatible with reduced-motion preferences.
- [x] Preserve WebGL fallback, Exit, and normal app recovery.
- [x] Keep new geometry procedural until an asset-loading phase is explicitly approved.

### Level 1 Multi-Room Shape

Level 1 should become one connected environment with three initial rooms:

- Control Room
  - The first room users spawn into.
  - Contains wall computers, dashboards, timer display, participant/session panels, and user stations.

- Shooting Range
  - A side room connected through a wall opening.
  - Reuses the existing range targets, lanes, challenge, and scoreboard.

- Expansion Room / Utility Room
  - A small adjacent room or stub for later secrets.
  - Can start as blocked-off, empty, or visually hinted.
  - Should not become a new gameplay system yet.

The short-term target is Control Room plus Shooting Range in one Level 1 config. The third room can be planned and roughed in later.

### Control Room Monitor Wishlist

The Control Room should feel like a Sync Sesh operations room. Wall screens should show existing app/session data:

- Big timer monitor
  - Main countdown state.
  - Phase label.
  - Urgency/complete visual state.

- Dashboard monitor A
  - Session code.
  - Sync transport status.
  - Round number.
  - Ready count / active count.

- Dashboard monitor B
  - Participant list.
  - Host marker.
  - Ready/idle/spectating states.

- Small monitor bank
  - Range scoreboard summary.
  - Current room/area name.
  - Local control hints after unlock.
  - Future message/status slots.

These monitors should render from existing state first. New reducer events should only be added when a monitor needs shared state that does not already exist.

### Station Computer And FPV Flow

Each joined user should have a computer station in the Control Room. The hidden world should feel like it is behind the normal app, not like a disconnected game mode.

Current intended behavior:

- The user joins the session from the normal 2D dashboard.
- The user types the hidden code.
- The 3D view starts close to that user's assigned computer monitor.
- The camera pulls back from the monitor as though the user is standing up from the desk.
- After the reveal, the user can click once to focus/pointer-lock the 3D view and then use WASD.
- The local user's own monitor is a return portal back into the 2D dashboard.
- Clicking the local monitor after controls are focused animates the camera back into the screen and closes the 3D shell.
- The local first-person body should appear only during normal FPV, not during reveal, top-down, or return animation.

Resolved fallback:

- If the local user is not joined, the reveal uses a clear temporary local station fallback instead of silently falling back to the old big-wall-monitor path.

Wishlist:

- [x] Assign each joined user to a computer station.
- [x] Render dashboard data on station monitors.
- [x] Reveal from the local user's computer when joined.
- [x] Return to the 2D dashboard by clicking the local computer monitor.
- [x] Render a simple first-person body during FPV.
- [x] Avoid accidental monitor return on the first click used to focus movement.
- [x] Add a robust unjoined-user station fallback or explicit join-required handling.
- [x] Keep monitor return from interfering with shooting-range pointer interactions.
- [x] Manual-test the full station reveal, movement focus, monitor return, and re-entry loop.

### Expanded Control Room Environment Wishlist

The Control Room should feel bigger and more lived-in than the current station room. The target vibe is an operations studio where workers are vibe coding, watching dashboards, using cool desktop rigs, and hanging out between sessions.

Architecture wishlist:

- [x] Expand the Control Room footprint so it feels like a larger main room.
- [x] Add a raised balcony/platform along the monitor wall.
- [x] Add three stairs on the left side of the computer area leading to the balcony.
- [x] Add three stairs on the right side of the computer area leading to the balcony.
- [x] Keep stair collision simple and walkable.
- [x] Keep first-person and top-down views readable after the room expands.
- [x] Keep the shooting range connection intact after the room expands.

Monitor wall wishlist:

- [x] Add one large blue main screen centered on the balcony wall.
- [x] Add two long green flanking screens on either side of the main screen.
- [x] Add many smaller surrounding wall monitors.
- [x] Use monitor colors intentionally: blue for main/timer/dashboard focus, green for side/status panels.
- [x] Keep text readable and avoid tiny unreadable screens.
- [x] Keep all screens procedural/canvas-based unless an asset phase is approved.

Worker/computer station wishlist:

- [x] Add more desktop rigs to make the room feel active.
- [x] Add RGB-lit PC towers.
- [x] Add glowing keyboards.
- [x] Add desk clusters that imply workers are vibe coding.
- [x] Keep sim/idle users able to occupy or roam around the workstation area.

Lounge/kitchen wishlist:

- [x] Add a couch or lounge seating area.
- [x] Add a small kitchen area.
- [x] Add an island bar/counter.
- [x] Add countertop props.
- [x] Add a blow torch lighter prop on the countertop.
- [x] Keep kitchen/lounge props decorative and non-interactive at first.

### Futuristic Jukebox Wishlist

The Control Room should include a futuristic SoundCloud jukebox or music command station. It should not look like a classic wooden jukebox. It should feel like a neon audio console with multiple screens, physical controls, speakers, and reactive light.

Suggested screen layout:

- Center screen
  - Current song title.
  - Artist/source if available.
  - Playback status.
  - Large waveform or equalizer.

- Left screen
  - Current playlist name.
  - Pageable list of songs from the playlist.
  - Highlighted current song.

- Right screen
  - Play/pause status if supported.
  - Shuffle button.
  - Next button.
  - Retry/reconnect state if needed.

- Lower or side screen
  - Change playlist/source area.
  - Page up/down controls for playlist browsing.

Wishlist:

- [x] Add a futuristic jukebox/music command station to the Control Room.
- [x] Give the jukebox multiple screens or monitors.
- [x] Show current song, source/artist, and playback status.
- [x] Show an animated waveform or equalizer.
- [x] Show play, pause, shuffle, next, and retry controls where supported.
- [x] Show the current playlist name.
- [ ] Show a pageable list of songs from the active playlist.
- [ ] Allow users to page through the playlist from inside the 3D world.
- [ ] Add a change-playlist/source area.
- [x] Keep the actual SoundCloud iframe/player in the normal React app.
- [x] Use canvas textures for 3D jukebox screens.
- [x] Make the jukebox glow or pulse when music is playing.
- [x] Avoid continuous 3D scrolling in the first version; use page controls instead.
- [x] Do not embed the SoundCloud iframe directly into Three.js.

### Sim Bot Roaming Wishlist

Sim/test users should help the 3D world feel alive during solo development and demos. Idle sim bots can roam locally through the 3D space, while real users remain governed by actual synced presence.

Current status:

- Sim/test users are implemented as session users and can be assigned to stations.
- Sim/test users can be toggled ready/idle/spectating through host/admin tools.
- Idle sim/test users generate local deterministic roaming poses.
- Idle sim/test users render as moving local-only roaming markers.
- Ready/spectating sim/test users remain station-based instead of roaming.

Wishlist:

- [x] Idle sim/test users can roam around the 3D world automatically.
- [x] Ready sim/test users return to or remain near their assigned stations.
- [x] Spectating sim/test users remain seated, dimmed, or move to a future spectator area.
- [x] Sim roaming is local/deterministic and does not add movement sync traffic.
- [x] Sim bots avoid walls, major blockers, and room boundaries.
- [x] Sim bots can wander through connected Level 1 rooms once the multi-room layout exists.
- [x] Sim bots have simple facing direction and idle pauses.
- [ ] Let the local user click an idle roaming sim to send them back to their assigned chair/station.
- [ ] Keep recalled sims seated for a short cooldown, then let them wander again.
- [ ] Make sim recall local-only and deterministic; do not change real session presence.
- [x] Sim bot roaming can be disabled if it hurts manual testing.
- [x] Sim bot roaming does not affect real users or real free-roam presence.

### Player Movement Enrichment Wishlist

Movement should make the hidden world feel like a place, not just a camera floating through a demo room. The first pass should stay simple and browser-safe, but it can still add more game-feel in small phases.

Core movement wishlist:

- [x] Audit the current movement controller and collision flow before changing behavior.
- [x] Add sprint with Shift.
- [x] Add configurable movement constants so walk/sprint/slide tuning is not scattered through the controller.
- [x] Add smooth acceleration and deceleration.
- [x] Add collision sliding along walls, desks, station blockers, and room bounds.
- [x] Add slide movement as a short forward burst that can be triggered after sprinting.
- [x] Keep slide movement grounded and horizontal; no parkour or physics dependency yet.
- [x] Prevent slide from clipping through blockers, desks, walls, or station rows.
- [x] Add simple stair/ramp support for the future balcony.
- [x] Keep stair handling simple through ramps or step-up helpers rather than real physics.
- [x] Add lightweight area/room labels when moving between Control Room, Shooting Range, and future rooms.
- [x] Preserve Tab top-down behavior while movement features grow.
- [x] Preserve pointer-lock fallback behavior.
- [x] Respect reduced-motion preferences for head bob, FOV pulse, and slide camera effects.

Presence and avatar wishlist:

- [ ] Track local movement state as `idle`, `walking`, `sprinting`, `sliding`, or `crouching` when needed.
- [ ] Let remote markers eventually show basic movement state without syncing every frame.
- [ ] Let sim bots reuse the same broad movement-state vocabulary.
- [ ] Keep movement-state sync low-rate and optional.

Later movement ideas:

- [ ] Add crouch only after sprint/slide/collision feel stable.
- [x] Add subtle head bob only if reduced-motion settings allow it.
- [x] Add a small FOV/speed-line feeling for sprint/slide only if it remains comfortable.
- [ ] Consider gamepad movement after keyboard/mouse behavior is stable.
- [ ] Consider click-to-move in top-down mode only as a later accessibility/navigation feature.

### Shooting Range Gun Rack Wishlist

The Shooting Range should feel like a real room with range gear, not just lanes and targets. Add a wall-mounted gun rack with five stylized procedural weapons. The first version can be decorative, but the layout should leave room for later weapon selection.

Gun rack wishlist:

- [x] Add a gun rack on a Shooting Range wall.
- [x] Add five visually distinct guns to the rack.
- [x] Keep guns procedural/simple at first; no asset pipeline required.
- [x] Make each gun readable by silhouette, size, and color accent.
- [x] Add labels or small plaques only if they remain readable in FPV.
- [x] Keep the rack out of the shooting lane collision path.
- [x] Keep the rack visible from both first-person and top-down views.
- [x] Add subtle range lighting or emissive accents so the rack is findable.
- [x] Keep the current shooting challenge working even if the rack is decorative.

Suggested five-gun set:

- [x] Compact pistol.
- [x] Heavy revolver.
- [x] Short SMG.
- [x] Tactical rifle.
- [x] Long marksman rifle.

Future interaction wishlist:

- [x] Let the player aim at a rack weapon and inspect/equip it.
- [x] Show the selected weapon name in the local range UI or reticle hint.
- [ ] Let different guns change local fire cadence, reticle feel, or visual feedback.
- [ ] Keep scoring fair until weapon balance is intentionally designed.
- [x] Keep weapon selection local-only unless a future phase explicitly syncs it.

### Movement And Area Model

Vision 3 should move away from registry-level switching for the first connected spaces. Level 1 should support internal areas:

- `control-room`
- `shooting-range`
- future `utility-room` or `expansion-room`

Internal areas can be represented by config, bounds, or room descriptors. They do not need to become separate top-level levels.

Free-roam presence can keep using the existing level id at first. Later, it may add an optional area id if remote users need better room-specific display or filtering.

### Sync And Local Split

Use existing synced data wherever possible:

- session phase
- timer/countdown display
- users
- ready/idle/spectating state
- host state
- sync status
- range scoreboard summaries
- free-roam presence

Keep local:

- display-mode cycling
- cosmetic monitor variants
- local light/accent toggles
- wall-opening discovery
- small visual effects
- camera/reveal behavior

Add new sync only after a phase explicitly designs the reducer event.

### Non-Goals

- No separate Level 3 Control Room.
- No new top-level level for the Control Room.
- No visible normal-app level selector.
- No high-frequency movement sync.
- No new challenge loop.
- No new score system beyond the existing range scoreboard.
- No asset pipeline.
- No production security boundary for unlocks.
- No shared monitor-control state until explicitly designed.
- No direct SoundCloud iframe embedding inside Three.js.
- No sync traffic for sim bot roaming.
- No AI/pathfinding dependency for sim bot roaming.

## Guide Rails

### Recommended Loop Restart

The next worker loop should start from the first incomplete phase that matches the immediate goal.

Recommended order if the goal is "make the room feel alive":

- Phase V3-18: Sim Bot Roaming State
- Phase V3-19: Sim Bot Roaming Render
- Phase V3-20: Sim Bot Movement Constraints
- Phase V3-21: Sim Bot Roaming Toggle And Tests
- Phase V3-46: Click To Recall Sim Bots

Recommended order if the goal is "harden the computer-entry fantasy first":

- Phase V3-31: Station Reveal Fallback Hardening
- Phase V3-32: Station Return Interaction Hardening
- Phase V3-33: First-Person Body Polish Pass

Recommended order if the goal is "make first-person movement feel better":

- Phase V3-34: Movement Controller Audit
- Phase V3-35: Sprint Movement
- Phase V3-36: Smooth Movement Acceleration
- Phase V3-37: Collision Sliding
- Phase V3-38: Slide Movement
- Phase V3-39: Stair And Ramp Traversal
- Phase V3-40: Area Movement Feedback
- Phase V3-41: Movement State Presence Design
- Phase V3-42: Reduced-Motion Camera Polish

Recommended order if the goal is "make the shooting range feel more like a room":

- Phase V3-43: Shooting Range Gun Rack Design
- Phase V3-44: Static Gun Rack Render
- Phase V3-45: Gun Rack Interaction Prep

Every implementation phase should still follow the worker loop: prepare the phase for implementation, write/revise the spec in this document if needed, then implement only after approval and run `npm.cmd run build`.

### [x] Phase V3-1: Level 1 Multi-Room Plan

#### Summary

Convert the planning model from separate Level 2/Level 3 rooms into one connected Level 1 with internal rooms and wall openings.

#### Implementation Spec

- Update planning docs to define Level 1 as a multi-room environment, not a Level 1 plus separate Level 2/Level 3 split.
- Define Control Room as the first room of Level 1.
- Define Shooting Range as another room inside Level 1.
- Keep `utility-room` / `expansion-room` as future stub room names only, not as new gameplay systems.
- Document the target architecture as walk-through wall openings between rooms, not registry-level teleports for the long-term layout.
- Document what should remain temporary about `?level=level-2-range` until the merged layout is implemented.
- Do not change source code in this phase.

#### Checklist Items Achieved

- [x] Treat the Control Room as the first room of Level 1, not Level 3.
- [x] Treat the Shooting Range as another room inside Level 1, not the long-term separate Level 2 experience.
- [x] Keep the long-term target as one connected Level 1 footprint with walk-through openings between rooms.
- [x] Preserve `?level=level-2-range` as a temporary dev/test shortcut until the merged layout is implemented.

#### Completed implementation

- Updated the Vision 3 planning doc to make the corrected architecture explicit.
- Locked the phase scope to docs-only work.
- Kept V3-2 config/source changes out of this phase.

#### Deferred / not included

- No source files were changed.
- No Level 1 config model changes were made.
- No room geometry, openings, or registry behavior was implemented.
- No package changes were made.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.

### [x] Phase V3-2: Level 1 Room/Area Config Model

#### Summary

Extend Level 1 config so it can describe multiple internal rooms and openings.

#### Implementation Spec

- Add `LevelAreaConfig` and `LevelOpeningConfig` as plain-data interfaces in `src/3d/levels/types.ts`.
- Extend `LevelConfig` with optional `areas?: LevelAreaConfig[]` and `openings?: LevelOpeningConfig[]`.
- Add active `control-room` area data for Level 1.
- Add planned `shooting-range` area data for Level 1.
- Add planned `control-room-range-opening` data for the future walk-through path.
- Keep `exits` separate from `openings`; `exits` remain the current temporary teleport-style transitions.
- Keep this data plain and inspectable.
- Preserve existing `LevelConfig` behavior for Level 1 and the temporary range level.
- Do not add new packages.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Add schema support for internal room/area descriptors.
- [x] Add schema support for walk-through wall openings/portals.
- [x] Preserve existing Level 1 and temporary Level 2 behavior.
- [x] Keep `exits` separate from future internal openings.

#### Completed implementation

- Added `LevelAreaConfig` and `LevelOpeningConfig` as plain, serializable TypeScript interfaces.
- Extended `LevelConfig` with optional `areas` and `openings`.
- Added active `control-room` area data, planned `shooting-range` area data, and a planned `control-room-range-opening` entry to Level 1.
- Kept the existing temporary `RANGE` exit to `level-2-range` unchanged.
- Kept V3-2 limited to schema and config data only.

#### Deferred / not included

- No runtime merge of the Shooting Range into Level 1 was implemented.
- No shell, renderer, collision, or portal behavior was changed.
- No visible normal-app level selector was added.
- No package changes were made.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.

### [x] Phase V3-3: Control Room Wall Computers

#### Summary

Upgrade the current first room into a real Control Room by adding wall computers and monitor surfaces.

#### Implementation Spec

- Add a new `src/3d/ControlRoomWallDisplays.tsx` visual-only component.
- Mount it from `Level1RoomShell.tsx` only for `level-1` / active `control-room` context.
- Add two dashboard wall monitors, one large timer wall monitor, and a small monitor bank.
- Render from existing `countdownDisplay`, `users`, `ownerId`, `rangeScoreboard`, `roundNumber`, and available level/area labels only.
- Use neutral/static labels where session code or sync transport data is not already available to `Level1RoomShell`.
- Keep monitors visual-only in this phase.
- Do not add new sync events.
- Do not add packages.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Expand the current first room into a true Control Room.
- [x] Put more computers and monitors on the Control Room walls.
- [x] Add two wall computers for dashboard-style data.
- [x] Add one large wall computer dedicated to the main timer.
- [x] Add additional smaller monitors for other session data.
- [x] Show useful existing data on monitors without inventing unnecessary sync state.

#### Completed implementation

- Added `ControlRoomWallDisplays` as a new visual-only renderer.
- Mounted the wall displays from `Level1RoomShell` only for the active Level 1 Control Room context.
- Kept the displays read-only and driven from existing props only.
- Preserved the existing Level 1 / Level 2 split, range challenge, synced scoreboard, free-roam presence, exits, and normal app UI.

#### Deferred / not included

- No session code or sync transport prop plumbing was added.
- No sync events or reducer changes were added.
- No room routing, portal, or opening behavior was changed.
- No package changes were made.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.

### [x] Phase V3-4: Walk-Through Opening To Range

#### Summary

Replace the long-term concept of a teleport door with a physical wall opening from the Control Room into the Shooting Range.

#### Implementation Spec

- Add a visible, passable east-wall opening in Level 1.
- Add a short empty connector stub beyond the opening.
- Expand Level 1 bounds only enough for the stub.
- Split the east wall into visible wall segments around the opening.
- Add collision blockers for the closed east wall portions and stub end so only the opening clearance is passable.
- Keep the existing range challenge and scoreboard functional.
- Keep the old Level 2 shortcut only as temporary/dev fallback until the merged range is complete.
- Do not merge the shooting range gameplay into Level 1 yet.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Connect rooms through openings in the walls rather than teleport-style doors.
- [x] Keep the shooting range challenge and synced scoreboard working during the layout migration.
- [x] Keep the normal 2D app free of visible level selectors.

#### Completed implementation

- Added a visible/passable Control Room east-wall opening.
- Added a short empty connector stub on the east side.
- Expanded Level 1 bounds only enough to contain the stub.
- Added collision blockers for the closed east wall portions, the stub side edges, and the stub end so only the opening is walkable.
- Rendered the east wall as split wall segments around the opening instead of a hidden pass-through.

#### Deferred / not included

- No Shooting Range gameplay was merged into Level 1.
- No shooting range lanes, targets, or challenge logic were added to Level 1.
- No sync events or session schema changes were added.
- No package changes were made.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.

### [x] Phase V3-5: Merge Shooting Range Into Level 1

#### Summary

Move the shooting range experience from separate Level 2 behavior into a Level 1 internal room.

#### Implementation Spec

- Coordinate placement:
  - Control Room remains `x = -7..7`, `z = -6..6`.
  - Connector stub remains `x = 7..10.5`, `z = -1.2..1.2`.
  - Merged range room occupies `x = 10.5..22.5`, `z = -9..9`.
  - The merged range room is centered at `x = 16.5`.
  - Top-down framing should move to `position = [8.5, 12.5, 0]`, `target = [8.5, 0, 0]`, `height = 12.5`, `orthographicSize = 20`.
- Collision plan:
  - Expand `collisionBounds.room` to `min = [-7, 0, -9]` and `max = [22.5, 4.5, 9]`.
  - Block the north void outside the Control Room and stub with a blocker covering `x = -7..10.5`, `z = -9..-6`.
  - Block the south void outside the Control Room and stub with a blocker covering `x = -7..10.5`, `z = 6..9`.
  - Keep the Control Room east wall split into blocked lower and upper segments around the opening at `x` around `7`.
  - Keep connector side walls blocked on both sides of the stub.
  - Add blocked range entrance wall segments at `x` around `10.5` so only the connector opening is passable.
  - Add the range room backstop, left/right room boundaries, and lane dividers as needed.
  - Remove or replace the V3-4 east-stub end cap so the player can enter the range room.
- Rendering plan:
  - Reuse the current `shootingRange` data and `ShootingRangePrototype` logic instead of rebuilding challenge behavior.
  - Add a small Level 1 range-room wrapper component if needed.
  - Render the actual range room shell procedurally in Level 1.
  - Wrap the range geometry in a translated group at `position = [16.5, 0, 0]`.
  - Pass `levelId = "level-2-range"` to preserve scoreboard identity.
  - Keep `?level=level-2-range` working as the temporary standalone dev/test path.
- Scoreboard / levelId decision:
  - Keep score submissions using `levelId = "level-2-range"` for now.
  - Do not migrate the scoreboard identity in this phase.
  - Preserve the existing synced scoreboard summary behavior without splitting current-session results.
- Keep the implementation procedural and consistent with the existing 3D shell.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Treat the Shooting Range as another room inside Level 1, not the long-term separate Level 2 experience.
- [x] Keep all initial rooms inside one walkable Level 1 footprint.
- [x] Connect rooms through openings in the walls rather than teleport-style doors.
- [x] Preserve `?level=level-2-range` as a temporary dev/test shortcut.
- [x] Keep the shooting range challenge and synced scoreboard working during the layout migration.
- [x] Preserve `levelId = "level-2-range"` for scoreboard identity during the merge.

#### Completed implementation

- Added the merged Shooting Range as an internal Level 1 room beyond the Control Room connector stub.
- Kept the merged range physically aligned at `x = 10.5..22.5` with the Control Room and connector on the same axis.
- Expanded Level 1 collision bounds and added explicit blockers for the non-open walls and merged-room perimeter.
- Added a Level 1 range-room wrapper that renders the range shell procedurally and reuses the existing `ShootingRangePrototype`.
- Kept the score submissions and scoreboard filtering on `levelId = "level-2-range"` so existing summaries continue to match.
- Preserved the temporary standalone `?level=level-2-range` route and left `level2Range.ts` unchanged.

#### Deferred / not included

- No score identity migration was attempted.
- No sync reducer or session schema changes were added.
- No new top-level level selector was introduced.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.
- No package changes were made.
- No direct `three` imports or type shims were added.

#### Acceptance Criteria

- The Shooting Range is rendered as an internal Level 1 room beyond the connector stub.
- The Control Room to range path is physically walkable.
- The existing shooting range challenge still works.
- The synced scoreboard still works and keeps `level-2-range` identity.
- The temporary `?level=level-2-range` shortcut still works.
- Non-open walls remain blocked, including the enlarged-room voids.
- The room remains readable in first-person and top-down view.
- The normal 2D app still has no visible level selector.

#### Risks

- Enlarging the room rectangle could create unintended walkable voids if blockers are incomplete.
- Changing `levelId` too early could split or orphan scoreboard summaries.
- The range room could feel visually disconnected from the Control Room if the x-axis alignment drifts.
- Top-down framing could lose either the Control Room or the range if the camera is moved too far.
- The connector stub end cap could accidentally block the merged range entrance if not removed or replaced carefully.

#### Wishlist Mapping

- Treat the Shooting Range as another room inside Level 1, not the long-term separate Level 2 experience.
- Keep the shooting range challenge and synced scoreboard working during the layout migration.
- Keep all initial rooms inside one walkable Level 1 footprint.
- Connect rooms through openings in the walls rather than teleport-style doors.
- Preserve `?level=level-2-range` as a temporary dev/test shortcut.
- Keep the room readable in first-person and top-down view.
- Keep new geometry procedural until an asset-loading phase is explicitly approved.

#### Non-Goals

- No change to the shooting challenge rules.
- No new score system.
- No change to reducer payload shape or sync frequency.
- No removal of the `level-2-range` shortcut.
- No visible level selector.
- No direct `three` imports or type shims.
- No package additions.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work.

### [x] Phase V3-6: Control Room Local Interactions

#### Summary

Add local-only interaction to selected Control Room monitors or consoles.

#### Implementation Spec

- Add exactly one local-only interaction in `ControlRoomWallDisplays`.
- Make the left dashboard monitor currently labeled `SESSION PANEL` clickable.
- Cycle that monitor through three local display modes: `summary -> roster -> status -> summary`.
- Use the existing `clickable` interaction primitive through the current interaction registry.
- Keep the mode state local to the Control Room wall display component.
- Do not add sync events, reducer events, or session schema changes.
- Leave the other monitors read-only.
- Preserve the merged V3-5 range room and its `levelId = "level-2-range"` scoreboard identity unchanged.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Show useful existing data on monitors without inventing unnecessary sync state.

#### Completed implementation

- Made the `SESSION PANEL` monitor in `ControlRoomWallDisplays` clickable.
- Added local-only mode state that cycles `summary -> roster -> status -> summary`.
- Kept the interaction inside the existing clickable interactable primitive.
- Left the other Control Room monitors read-only.
- Preserved the merged Level 1 Shooting Range and its `levelId = "level-2-range"` scoreboard identity.

#### Deferred / not included

- No sync events were added.
- No reducer or session schema changes were added.
- No changes were made to `Level1RoomShell.tsx`, `level1.ts`, `Level1RangeRoom.tsx`, `level2Range.ts`, or `ThreeDModeShell.tsx`.
- No package changes were made.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.

#### Acceptance Criteria

- The `SESSION PANEL` monitor can be clicked in the Control Room.
- Clicking it cycles the panel through `summary`, `roster`, and `status` views.
- The interaction is local only and does not change sync or reducer behavior.
- The other Control Room displays remain read-only.
- The merged Level 1 Shooting Range remains intact and keeps `levelId = "level-2-range"` for scores.
- The normal app and unrelated world behavior remain unchanged.

#### Risks

- The click target could be mistaken for synced state if the labels are not explicit.
- The new mode state could grow beyond one phase if the toggle logic is not kept small.
- A misplaced interactable registration could interfere with nearby doors or range targets.
- Changing the display component carelessly could disturb the merged Control Room / range layout.

#### Wishlist Mapping

- Keep the Control Room feeling like an operations room.
- Allow a local display-mode toggle for at least one dashboard monitor.
- Use existing clickable interaction primitives only.
- Keep monitor modes visual-only and local.
- Preserve the merged range and scoreboard identity.
- Avoid unrelated routing, sync, or package changes.

#### Non-Goals

- No sync events.
- No reducer or session schema changes.
- No changes to `Level1RoomShell.tsx`, `level1.ts`, `level2Range.ts`, or `ThreeDModeShell.tsx`.
- No changes to the merged range room or score identity.
- No package additions.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work.

### [x] Phase V3-7: Presence Readability In Multi-Room Level 1

#### Summary

Make station fallback and free-roam markers readable inside the larger connected Level 1.

#### Implementation Spec

- Improve free-roam marker readability in first-person and top-down view without changing sync behavior.
- Improve station fallback marker readability in first-person and top-down view without changing fallback selection.
- Keep any area/room label strategy local-only and generic if used at all.
- Do not increase presence sync frequency.
- Do not add high-frequency movement sync.
- Keep the changes strictly visual.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Keep computer stations as places where users outside free-roam can appear seated.
- [x] Keep free-roam users visible as simple remote markers.
- [x] Keep station-based presence as a reliable fallback.
- [x] Avoid high-frequency movement sync.

#### Completed implementation

- Improved free-roam marker silhouettes, label plates, and contrast for first-person and top-down readability.
- Improved station fallback marker silhouettes, label plates, and contrast for first-person and top-down readability.
- Kept the marker behavior and fallback selection logic unchanged.
- Kept the changes procedural and local-only.

#### Deferred / not included

- No presence sync schema changes were added.
- No presence sync frequency changes were added.
- No new room/area state plumbing was added.
- No changes were made to `Level1RoomShell.tsx`, `level1.ts`, `ControlRoomWallDisplays.tsx`, `Level1RangeRoom.tsx`, `level2Range.ts`, or `ThreeDModeShell.tsx`.
- No package changes were made.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.

#### Acceptance Criteria

- Free-roam markers are easier to read in the larger connected Level 1.
- Station fallback markers are easier to read without changing fallback logic.
- Any label hints remain local-only and do not require new synced area state.
- No presence sync frequency changes were introduced.
- No movement sync changes were introduced.
- The merged V3-5 range and V3-6 clickable display behavior remain intact.

#### Risks

- Overlarge labels could create overlap in dense areas.
- Readability tweaks could accidentally suggest new gameplay behavior.
- Adding local label hints could tempt new shared state plumbing.
- Marker changes could distract from the merged Control Room and range layout if pushed too far.

#### Wishlist Mapping

- Keep computer stations as places where users outside free-roam can appear seated.
- Keep free-roam users visible as simple remote markers.
- Keep station-based presence as a reliable fallback.
- Keep the merged range and score identity stable.
- Avoid high-frequency movement sync.
- Keep new geometry procedural until an asset-loading phase is explicitly approved.

#### Non-Goals

- No presence sync schema changes.
- No increased presence sync frequency.
- No high-frequency movement sync.
- No new room/area state plumbing.
- No changes to `Level1RoomShell.tsx`, `level1.ts`, `ControlRoomWallDisplays.tsx`, `Level1RangeRoom.tsx`, `level2Range.ts`, or `ThreeDModeShell.tsx`.
- No changes to the merged range room or score identity.
- No package additions.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work.

### [x] Phase V3-8: Expanded Control Room Layout Design

#### Summary

Design the larger Level 1 Control Room layout with balcony, stairs, monitor wall, workstations, lounge, kitchen/island zones, and the shooting range connection intact. This is documentation-only.

The Control Room remains the first room users enter after the hidden unlock. It should grow from the current compact station room into a larger, more architectural "vibe coding" control room while keeping the Shooting Range as part of Level 1 through a walk-through east-side hallway/opening.

#### Implementation Spec

- Use this phase as the spatial contract for V3-9 through V3-16.
- Do not change runtime behavior in this phase.
- Keep current coordinate conventions as the planning language:
  - The current Control Room is roughly `x -7..7`, `z -6..6`.
  - The current Shooting Range begins east of the Control Room.
  - The current range opening/hallway sits around the east wall near `x 7`, `z -1.2..1.2`.
- Expand the Control Room mainly west, north, and south so the east-side shooting range connection can stay intact.
- Target the expanded Control Room as a larger rectangular main room that V3-9 can translate into config bounds.
- Reserve the east wall center opening as a clear walk-through route to the Shooting Range.
- Keep the range connection doorless/walk-through, not an `E`-button transition.
- Keep a central circulation lane from the local/user stations through the room and toward the range opening.
- Plan the raised balcony/platform along the main monitor wall.
- Plan the balcony as the architectural focus of the Control Room, with the main wall computers and hero monitor array above or behind it.
- Plan three stair steps or a three-step stair run on the left side of the balcony approach.
- Plan three stair steps or a three-step stair run on the right side of the balcony approach.
- Leave the center area in front of the balcony open enough for walking, aiming, and viewing the monitor wall.
- Plan the hero monitor wall as:
  - one large centered blue main screen for timer/dashboard focus,
  - two long green flanking screens for status/dashboard data,
  - multiple smaller surrounding wall monitors for session, range, music, and future data.
- Keep the big wall monitor visually distinct from user station monitors.
- Preserve the rule that user reveal and dashboard return target the user's assigned/local computer station, not the big wall monitor.
- Plan workstation clusters on the main floor and side walls.
- Include enough desk/computer locations for every active user to have a computer.
- Add additional wall computers/monitors beyond the user stations:
  - two dashboard/status wall screens,
  - one big timer/dashboard screen,
  - several smaller data screens.
- Plan a couch/lounge zone away from the range opening so it reads as lifestyle space without blocking movement.
- Plan a kitchen/island/bar zone on a side or rear area of the room with countertop detail room for later prop phases.
- Keep collision expectations simple for later phases:
  - balcony/platform should be walkable,
  - stairs should be simple ramps or step geometry later,
  - workstation rows and props should leave clear walking lanes,
  - sim roaming should eventually have valid paths through the larger room.
- Preserve hidden unlock behavior, range merge, station reveal, local monitor return, FPV body, sim roaming, and normal 2D app behavior.
- Do not implement code.
- Do not render any geometry in this phase.
- Do not update config data in this phase.

#### Checklist Items Achieved

- [x] Make the main Control Room larger and more architectural.
- [x] Add a raised balcony/platform where the main wall computers and monitor array live.
- [x] Add three stairs on each side of the computer area leading up to the balcony.
- [x] Make the room read as a busy control room where workers are vibe coding.
- [x] Add lounge and lifestyle props: couch, kitchen area, island bar, and countertop details.
- [x] Keep the shooting range as part of Level 1 through a walk-through opening.
- [x] Add more computers on the walls, including dashboard screens, one big timer screen, and other data monitors.

#### Acceptance Criteria

- The V3-8 section defines the expanded Control Room layout clearly enough for V3-9 to implement bounds/config without inventing the room shape.
- The plan includes balcony/platform, left and right stair runs with three steps each, hero monitor wall, workstation clusters, lounge, kitchen/island, and shooting range connection.
- The plan explicitly keeps the range hallway/opening intact and walk-through.
- The plan explicitly preserves hidden unlock, station reveal, local monitor return, FPV body, sim roaming, range merge, and normal 2D behavior.
- The plan does not require source file changes.
- The plan does not implement V3-9 config, V3-10 rendering, or later Control Room phases.

#### Build/Test Commands

- No build is required because this phase is documentation-only.
- Optional sanity check after logging: `npm.cmd run build`.
- Manual review:
  - Re-read this V3-8 section and confirm V3-9 can translate it into bounds/config.
  - Confirm no source files were changed.
  - Confirm this phase does not implement rendering or collision changes.

#### Risks

- If the expanded footprint is still too vague, V3-9 may invent dimensions that drift from the intended room.
- If the east side expands incorrectly, the existing Shooting Range connection could be blocked or moved.
- If the balcony/stairs are planned without movement clearance, later phases may create geometry the player cannot navigate.
- If workstation placement ignores station reveal, the camera pull-back and local monitor return fantasy could regress.
- If rendering details sneak into V3-8, this phase will overlap with V3-10 through V3-16.

#### Wishlist Mapping

- Make the main Control Room larger and more architectural.
- Add a raised balcony/platform where the main wall computers and monitor array live.
- Add three stairs on each side of the computer area leading up to the balcony.
- Make the room read as a busy control room where workers are vibe coding.
- Add lounge and lifestyle props: couch, kitchen area, island bar, and countertop details.
- Keep the Shooting Range as part of Level 1, connected by a walk-through opening/hallway.
- Add more computers on the walls, including dashboard screens, one big timer screen, and other data monitors.

#### Non-Goals

- Do not edit `src/3d/levels/level1.ts`.
- Do not edit `src/3d/Level1RoomShell.tsx`.
- Do not render balcony, stairs, props, wall monitors, lounge, kitchen, or new workstations.
- Do not change collision bounds.
- Do not change player spawn, camera reveal, station assignments, monitor return, pointer controls, Tab view, FPV body, range behavior, sim roaming, or normal 2D UI.
- Do not add dependencies.
- Do not combine with V3-9, V3-10, or later Control Room implementation phases.

### [x] Phase V3-9: Expanded Control Room Bounds Config

#### Summary

Update Level 1 config data so the expanded Control Room footprint is represented in bounds/collision planning, without rendering balcony, stairs, props, new monitor wall geometry, or workstation/lifestyle props yet.

This phase should make V3-10+ possible while preserving the existing walk-through Shooting Range connection.

#### Implementation Spec

- Keep V3-9 config-only.
- Update `level1Config` to describe a larger Control Room footprint while preserving the merged Shooting Range and its east-side walk-through opening.
- Use the current renderer constraint deliberately:
  - `Level1RoomShell` renders the Control Room floor/walls from `dimensions`, centered around origin.
  - `Level1RoomShell` computes the Control Room east wall as `roomEastWallX = levelConfig.collisionBounds.room.min[0] + dimensions.width`.
  - Therefore, when `dimensions.width` becomes `20`, `collisionBounds.room.min[0]` must move to `-10` so `roomEastWallX` becomes `10`.
- Set the expanded Control Room footprint:
  - `dimensions.width: 20`
  - `dimensions.depth: 18`
  - `dimensions.height: 4.5`
  - Rendered Control Room shell becomes roughly `x -10..10`, `z -9..9`.
- Set the exact intended collision envelope:
  - `collisionBounds.room.min: [-10, 0, -9]`
  - `collisionBounds.room.max: [22.5, 4.5, 9]`
- Keep `collisionBounds.room.max[0]` at `22.5` so the merged Shooting Range remains inside the same collision envelope.
- Keep z bounds as `-9..9`.
- Use height `4.5` to stay compatible with the expanded room.
- This keeps the rendered Control Room east wall at `x = 10`, aligned with the updated range opening and the Shooting Range west-side split blockers.
- Preserve Shooting Range area bounds:
  - Keep Shooting Range area at `x 10.5..22.5`, `z -9..9`.
  - Keep the existing Shooting Range room, targets, score display, walls, backstop, and lane divider blockers intact.
- Update `areas.control-room.bounds`:
  - from `min [-7, 0, -6] / max [7, 4, 6]`
  - to `min [-10, 0, -9] / max [10, 4.5, 9]`.
- Update `openings.control-room-range-opening`:
  - Move east-wall opening from `x ~7` to `x ~10`.
  - Keep centered at `z 0`.
  - Keep walk-through width/height approximately `width 2.4`, `height 2.2`.
  - Update `position` to roughly `[10.02, 1.2, 0]`.
  - Keep rotation as `[0, -Math.PI / 2, 0]`.
  - Update `clearanceBounds` to connect the new Control Room east wall to the Shooting Range west side:
    - `min [9.95, 0, -1.2]`
    - `max [10.55, 2.4, 1.2]`.
- Update collision blockers:
  - Remove `north-void-control-room`, because `z -9..-6` becomes valid expanded Control Room floor.
  - Remove `south-void-control-room`, because `z 6..9` becomes valid expanded Control Room floor.
  - Do not remove range wall, range backstop, or range lane divider blockers.
  - Move `control-room-east-wall-lower` from `x 6.85..7.15` to around `x 9.9..10.1`.
  - Move `control-room-east-wall-upper` from `x 6.85..7.15` to around `x 9.9..10.1`.
  - Keep those wall blockers split around `z -1.2..1.2` so the range opening stays passable.
  - Keep `range-west-wall-lower` and `range-west-wall-upper` around `x 10.35..10.55`, still split around the same opening.
  - Keep `connector-south-wall` and `connector-north-wall` if needed as short hallway side rails aligned from `x 10.02` toward `x 10.5`, with `z -1.2..-1.0` and `z 1.0..1.2`.
- Keep station positions unchanged in V3-9.
  - This avoids touching station reveal and local monitor return.
  - Later workstation phases can add or move computers intentionally.
- Keep `playerStart.position: [0, 1.7, 1.2]` and `playerStart.rotation` unchanged unless the build/manual review shows it spawns inside a changed blocker. Expected: it remains valid.
- Adjust `topDownCamera` to include the larger merged footprint:
  - target should remain centered over the full Level 1 collision envelope, roughly `[6.25, 0, 0]`.
  - height/orthographic size should be increased enough to see the expanded Control Room and Shooting Range.
- Keep `timerDisplay` unchanged for now.
  - V3-11/V3-12 should handle hero monitor wall config/render.
- Add config comments sparingly only if needed to explain why the east opening and blocker split are aligned.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Expand the Control Room footprint so it feels like a larger main room.
- [x] Keep the shooting range connection intact after the room expands.

#### Completed Implementation

- Updated Level 1 dimensions to `20 x 18 x 4.5`.
- Aligned `collisionBounds.room.min[0]` and `dimensions.width` so `Level1RoomShell` computes the Control Room east wall at `x = 10`.
- Expanded the Control Room area bounds to `x -10..10`, `z -9..9`.
- Preserved the Shooting Range area bounds at `x 10.5..22.5`, `z -9..9`.
- Moved the walk-through range opening and east-wall/connector blockers to the expanded room edge.
- Removed the old north/south Control Room void blockers so the expanded floor is navigable.
- Preserved station config, range blockers, range room data, reveal/return behavior, sim roaming, FPV body, and normal 2D UI behavior.
- Verified `npm.cmd run build` passes with the existing non-blocking Vite chunk warning.

#### Acceptance Criteria

- `level1Config.dimensions` is `width 20`, `depth 18`, and `height 4.5`.
- `collisionBounds.room` is exactly `min [-10, 0, -9]`, `max [22.5, 4.5, 9]`.
- `Level1RoomShell` will compute `roomEastWallX` as `10` from `collisionBounds.room.min[0] + dimensions.width`.
- `areas.control-room.bounds` matches the expanded Control Room footprint: `min [-10, 0, -9]`, `max [10, 4.5, 9]`.
- `areas.shooting-range.bounds` remains intact.
- `openings.control-room-range-opening` remains active, centered, and walk-through between Control Room and Shooting Range.
- `north-void-control-room` and `south-void-control-room` are removed.
- Range wall/backstop/divider blockers are not removed.
- East wall blockers are moved/split so the range opening is not blocked.
- Existing station config remains valid and station reveal/return data is not rewritten.
- No balcony/stairs/props/new monitor wall rendering is implemented.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual dev checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Verify Level 1 still loads.
  - Verify reveal still starts from the assigned/local station computer.
  - Verify first click focuses movement.
  - Verify WASD movement works in the enlarged Control Room.
  - Verify the east range opening remains walk-through.
  - Verify range shooting still works.
  - Verify local monitor return with `E` still works.
  - Verify Tab top-down still frames the expanded Level 1 reasonably.
  - Verify `?simRoam=0` still disables sim roaming locally.

#### Risks

- `Level1RoomShell` derives `roomEastWallX` from `collisionBounds.room.min[0] + dimensions.width`; if either value drifts, the wall/opening can misalign.
- Moving the east wall opening from `x 7` to `x 10` could accidentally block the range if blockers are not updated together.
- Expanding the floor/walls through config may visually change the room more than a pure data-only phase, because existing rendering is config-driven.
- Existing station layout may feel sparse in the larger room until V3-13+ adds more workstations and props.
- Sim roaming route constraints may remain conservative until a later route pass expands wander paths into the new space.

#### Wishlist Mapping

- Expand the Control Room footprint so it feels like a larger main room.
- Keep the Shooting Range connection intact after the room expands.
- Prepare room bounds for the future balcony/platform, stairs, monitor wall, workstation clusters, lounge, and kitchen/island.
- Preserve the hidden-world fantasy where users pull back from their own computer station.
- Preserve walk-through Level 1 room connectivity.

#### Non-Goals

- Do not render balcony, stairs, props, lounge, kitchen, island, new workstation clusters, or new monitor wall.
- Do not add new config types unless strictly needed.
- Do not move or redesign existing user stations in this phase.
- Do not change station assignment, reveal, or monitor return logic.
- Do not change FPV body, WASD controls, pointer lock, Tab top-down behavior, range shooting, sim roaming helper/render, jukebox, sync/reducer state, or normal 2D UI.
- Do not remove range wall, range backstop, or range lane divider blockers.
- Do not add dependencies.
- Do not combine with V3-10 or later Control Room rendering phases.

### [x] Phase V3-10: Balcony And Stairs Render

#### Summary

Render a raised Control Room balcony/platform and six total stair runs/steps as lightweight procedural geometry.

This is a render-only architecture phase. Because the current movement/collision controller is floor-level X/Z only, the balcony and stairs should read visually as architecture while keeping floor-level walking lanes open. True vertical stair/ramp traversal is deferred to V3-39.

#### Implementation Spec

- Keep V3-10 render-only.
- Add small procedural geometry helpers inside `Level1RoomShell.tsx`, preferably:
  - `ControlRoomBalcony`
  - `ControlRoomStairRun` or equivalent local helper.
- Render the balcony/stairs only when:
  - `levelConfig.id === "level-1"`
  - active Control Room area exists.
- Place the balcony visually along the current main display side of the Control Room, near the north/back wall display cluster.
- Use V3-9 expanded room bounds as the spatial basis:
  - Control Room is `x -10..10`, `z -9..9`.
  - Range opening remains east at roughly `x 10`, `z -1.2..1.2`.
- Do not block the east range opening or central walking lane.
- Proposed balcony geometry:
  - A raised platform/dais near the north side of the Control Room.
  - Approximate position: centered around `x 0`, `z -7.25`.
  - Approximate footprint: `width 17.2`, `depth 2.1`, `height 0.32`.
  - Approximate mesh position: `[0, 0.16, -7.25]`.
  - Approximate box args: `[17.2, 0.32, 2.1]`.
- Add low visual trim/edge strips to make the platform read as a raised architectural feature:
  - front lip along the player-facing side,
  - subtle cyan/blue accent strips,
  - optional low side edge pieces.
- Keep the platform low enough to avoid interfering with existing wall display readability.
- Do not attach collision blockers for the platform in this phase.
- Proposed stair placement:
  - Two stair runs, one left and one right, each with three visible treads.
  - Left stair run near `x -7.2`, connecting the main floor visually up to the balcony front.
  - Right stair run near `x 7.2`, mirroring the left run.
  - Treads should advance along Z from the main floor toward the balcony.
  - Each side should render three individual step meshes.
  - Total visible steps: six.
- Keep stairs outside the existing central workstation/station rows as much as possible.
- Keep center `x -5.6..5.6`, `z -3..3` and east route to `x 10`, `z 0` readable and walkable.
- Avoid adding collision blockers or changing movement logic.
- If the stairs/platform are walkable visually but not truly elevating the camera, document that limitation in the phase log and manual checks.
- Preserve current `ControlRoomWallDisplays` behavior:
  - Do not move current wall displays.
  - Do not redesign the hero monitor wall.
  - Do not change the interactive session panel.
- Preserve `ComputerStation` station monitor return behavior.
- Preserve the current Shooting Range room/render and walk-through opening.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Add a raised balcony/platform along the monitor wall.
- [x] Add three stairs on the left side of the computer area leading to the balcony.
- [x] Add three stairs on the right side of the computer area leading to the balcony.
- [x] Keep stair collision simple and walkable.

#### Completed Implementation

- Added local procedural render helpers in `Level1RoomShell.tsx` for `ControlRoomBalcony` and `ControlRoomStairRun`.
- Rendered the balcony/stairs only for active Level 1 Control Room display mode.
- Added a low raised platform near the north display wall.
- Added three visible stair treads on the left side and three visible stair treads on the right side.
- Kept the range opening and central floor-level walking lanes clear.
- Added no collision blockers, no movement logic, and no vertical traversal.
- Preserved existing wall displays, station reveal/return, sim roaming, range shooting, hidden unlock, FPV body, Tab view, and normal 2D UI behavior.
- Verified `npm.cmd run build` passes with the existing non-blocking Vite chunk warning.

#### Acceptance Criteria

- A raised balcony/platform is visible in the expanded Control Room.
- Three visible stair treads appear on the left side of the balcony approach.
- Three visible stair treads appear on the right side of the balcony approach.
- The balcony/stair geometry does not cover the range opening at `x 10`, `z around 0`.
- The balcony/stair geometry does not block the current assigned/local station reveal or monitor return.
- Existing wall displays still render and the clickable session panel still works.
- WASD floor-level movement still works in the Control Room.
- Shooting Range access and range shooting still work.
- No new collision blockers are added for the balcony/stairs.
- No vertical movement/stair traversal behavior is promised or implemented.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual dev checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Verify Level 1 loads and the balcony/stair geometry is visible.
  - Verify three left treads and three right treads are visible.
  - Verify reveal still starts from the assigned/local computer.
  - Verify first click focuses movement and WASD still works.
  - Verify the range opening remains walk-through.
  - Verify range shooting still works.
  - Verify local monitor return with `E` still works.
  - Verify the clickable session panel still cycles.
  - Verify Tab top-down still works.
  - Verify `?simRoam=0` still disables sim roaming locally.
  - Note that true stair climbing/elevation is not expected until a later movement phase.

#### Risks

- The current player movement controller only checks X/Z and keeps camera height fixed, so visually raised surfaces cannot behave like real elevated walkable floors yet.
- Decorative stairs may look walkable before the controller supports vertical traversal.
- The existing wall display cluster is still positioned for the earlier room; balcony geometry must avoid covering or z-fighting with those displays.
- If the platform is too central, it could visually clutter existing stations or the path to the range.
- If geometry is placed too close to station monitors, it may confuse station reveal/return readability.

#### Wishlist Mapping

- Add a raised balcony/platform along the monitor wall.
- Add three stairs on the left side of the computer area leading to the balcony.
- Add three stairs on the right side of the computer area leading to the balcony.
- Make the expanded Control Room feel more architectural.
- Prepare the room visually for the future hero monitor wall and workstation/lifestyle prop phases.

#### Non-Goals

- Do not implement true stair traversal, vertical collision, ramps, step-up movement, or movement physics.
- Do not change collision logic or add balcony/stair collision blockers.
- Do not implement V3-39 stair/ramp traversal.
- Do not move/redesign existing user stations.
- Do not implement hero monitor wall config/render.
- Do not add workstation props, lounge props, kitchen/island props, jukebox props, or new monitor data screens.
- Do not change station reveal, monitor return, FPV body, WASD, pointer lock, Tab top-down, sim roaming, range shooting, sync/reducer state, or normal 2D UI.
- Do not add dependencies.
- Do not combine with V3-11 or later phases.

### [x] Phase V3-11: Hero Monitor Wall Config

#### Summary

Define a typed Level 1 Control Room hero monitor wall config before rendering it.

The config should describe one large blue main screen, two long green side/status screens, a timer ribbon, and smaller surrounding wall monitors with stable roles and visual color roles. This phase is config/data only; V3-12 renders it.

#### Implementation Spec

- Keep V3-11 config/data only.
- Extend `src/3d/levels/types.ts` with a narrow, optional config shape for Control Room displays.
- Prefer reusing `Vec3`, `Euler3`, and the existing display surface idea, but add explicit semantic fields needed by V3-12.
- Add types similar to:
  - `ControlRoomDisplayRole`
  - `ControlRoomDisplayColorRole`
  - `ControlRoomDisplayConfig`
  - optional `controlRoomDisplays?: ControlRoomDisplayConfig[]` on `LevelConfig`.
- Proposed roles:
  - `"main-dashboard"`
  - `"timer-ribbon"`
  - `"session-status"`
  - `"participants"`
  - `"range-scoreboard"`
  - `"music-status"`
  - `"system-status"`
  - `"data-panel"`
- Proposed color roles:
  - `"blue-main"`
  - `"green-status"`
  - `"cyan-data"`
  - `"amber-alert"`
- Each display config should include:
  - `id`
  - `label`
  - `role`
  - `colorRole`
  - `position`
  - `rotation`
  - `size`
  - optional `priority` or `groupId` only if useful for V3-12 ordering.
- Add `controlRoomDisplays` to `level1Config`.
- Anchor the wall around the expanded Control Room north/back wall and V3-10 balcony:
  - North wall is visually around `z = -9`.
  - Existing wall displays are around `z = -5.72`; V3-12 can decide whether to move/render new surfaces using the config.
  - New hero wall config should target the north monitor wall above/behind the balcony, with display planes near `z = -8.82` to avoid z-fighting with the wall.
  - Rotation should face inward toward the room: `[0, 0, 0]` if keeping current north-wall convention.
- Define the major displays:
  - `hero-main-dashboard`: large centered blue main screen, role `"main-dashboard"`, colorRole `"blue-main"`, position roughly `[0, 2.55, -8.82]`, size roughly `{ width: 6.4, height: 2.25 }`.
  - `hero-left-status`: long green side screen, role `"session-status"`, colorRole `"green-status"`, position roughly `[-5.45, 3.25, -8.82]`, size roughly `{ width: 3.6, height: 0.75 }`.
  - `hero-right-status`: long green side screen, role `"participants"`, colorRole `"green-status"`, position roughly `[5.45, 3.25, -8.82]`, size roughly `{ width: 3.6, height: 0.75 }`.
- Define one timer ribbon or upper centered display:
  - role `"timer-ribbon"`, colorRole `"cyan-data"` or `"blue-main"`, position roughly `[0, 3.85, -8.8]`, size roughly `{ width: 8.2, height: 0.65 }`.
- Define smaller surrounding monitors:
  - `range-scoreboard` on left/side wall cluster or lower left north wall.
  - `music-status` for future jukebox data.
  - `system-status` for local/session state.
  - several `"data-panel"` entries for ambient small wall monitors.
- Keep the config serializable and static.
- Do not remove or change `timerDisplay`.
- Do not move existing `ControlRoomWallDisplays` rendering in this phase.
- Do not add rendering behavior that consumes the new config yet.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Arrange the monitor wall with one large blue main screen in the middle.
- [x] Add two long green side screens flanking the main blue screen.
- [x] Surround the main screens with many smaller wall monitors.

#### Completed Implementation

- Added typed optional Control Room display config to the level config model.
- Added stable monitor roles and color roles for the future hero monitor wall.
- Added static Level 1 `controlRoomDisplays` data for one large blue main dashboard, two long green side/status screens, one timer ribbon, and smaller surrounding monitors.
- Kept the config static and serializable with no functions or React components.
- Did not render the new hero monitor wall or change existing `ControlRoomWallDisplays` behavior.
- Verified `npm.cmd run build` passes with the existing non-blocking Vite chunk warning.

#### Acceptance Criteria

- `LevelConfig` supports optional `controlRoomDisplays`.
- Level 1 includes one large centered blue main screen config.
- Level 1 includes two long green side/status screen configs.
- Level 1 includes one timer ribbon config.
- Level 1 includes multiple smaller surrounding monitor configs.
- Each monitor config has a stable `id`, `label`, semantic `role`, visual `colorRole`, `position`, `rotation`, and `size`.
- The config is static/serializable and does not include functions or React components.
- No new monitor wall rendering appears in the app yet.
- Existing `ControlRoomWallDisplays` behavior is unchanged.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual/code-review checks after implementation:
  - Confirm only type/config data changed.
  - Confirm `ControlRoomWallDisplays` still uses its existing hard-coded render layout.
  - Confirm no new normal 2D UI appears.
  - Confirm V3-12 has enough data to render the hero wall without inventing screen roles/colors.
  - Optional browser check: hidden world still loads with existing displays unchanged.

#### Risks

- If the type is too generic, V3-12 will still have to invent display purpose and color mapping.
- If the type is too specific, future monitor roles may require churn.
- Positions may need tuning in V3-12 once actual rendering reveals overlap with balcony, wall, or existing display geometry.
- Keeping old wall display rendering unchanged means there may be duplicate conceptual monitor data until V3-12 migrates rendering to the new config.
- Screen role names should stay stable because future jukebox/range/session render phases may depend on them.

#### Wishlist Mapping

- Arrange the monitor wall with one large blue main screen in the middle.
- Add two long green side screens flanking the main blue screen.
- Surround the main screens with many smaller wall monitors.
- Add more wall computers/monitors for dashboard, timer, session, range, music, and other data.
- Prepare the expanded Control Room for the future hero monitor wall render.

#### Non-Goals

- Do not render the new hero monitor wall.
- Do not move, delete, or redesign existing `ControlRoomWallDisplays`.
- Do not add monitor interactions.
- Do not add jukebox behavior or SoundCloud iframe integration.
- Do not add workstation props, lounge props, kitchen/island props, or movement features.
- Do not change station reveal, monitor return, FPV body, WASD, pointer lock, Tab top-down, sim roaming, range shooting, sync/reducer state, hidden unlock, or normal 2D UI.
- Do not add dependencies.
- Do not combine with V3-12.

### [x] Phase V3-12: Hero Monitor Wall Render

#### Summary

Render the V3-11 configured hero monitor wall in the Level 1 Control Room.

The render must consume `levelConfig.controlRoomDisplays` instead of inventing positions, roles, or colors in component code. It should show one large blue main dashboard, two long green side/status screens, one timer ribbon, and smaller surrounding monitors while avoiding overlapping or z-fighting screens.

#### Implementation Spec

- Keep V3-12 render-only.
- Update `ControlRoomWallDisplaysProps` to accept:
  - `displays?: ControlRoomDisplayConfig[]`
- Import `ControlRoomDisplayConfig` from the level types.
- In `Level1RoomShell`, pass:
  - `displays={levelConfig.controlRoomDisplays}`
- Inside `ControlRoomWallDisplays`, derive a sorted config list:
  - use `displays ?? []`
  - sort by `priority ?? 0`, then `id`.
- If no config is provided, preserve the existing current hard-coded rendering as a fallback.
- If config is provided, render the wall using only the config-driven screen list, not the old hard-coded wall screens.
- Do not render old hard-coded main/timer wall screens on top of configured hero screens.
- Preserve current side mini-display behavior only if it does not overlap the hero wall. Recommended: when config is provided, fold the side mini-display content into configured small monitor roles and do not also render the old `MiniDisplay` side stack.
- Reuse existing canvas drawing helpers where possible:
  - `drawMainDashboardCanvas` for role `"main-dashboard"`.
  - `drawTimerCanvas` for role `"timer-ribbon"`.
  - existing `drawPanelCanvas` for the other roles.
- Add a helper such as `getCanvasForDisplay(display)` or `createDisplayCanvas(display)` that maps roles to canvases:
  - `"session-status"` uses the existing session panel canvas and must preserve mode cycling.
  - `"participants"` uses participant canvas.
  - `"range-scoreboard"` uses current range/scoreboard summary canvas.
  - `"music-status"` uses a simple placeholder/status canvas for now, since jukebox data comes later.
  - `"system-status"` uses local/system status canvas.
  - `"data-panel"` uses lightweight ambient data canvas based on display label/id.
- Add a helper such as `getDisplayColors(colorRole, countdownDisplay.isUrgent)`:
  - `"blue-main"`: blue/cyan dashboard frame and glow.
  - `"green-status"`: green frame and glow.
  - `"cyan-data"`: cyan frame and glow.
  - `"amber-alert"`: amber frame and glow, respecting urgent state where appropriate.
- Add a config-driven screen component or reuse `WallScreen`:
  - `position={[...display.position]}`
  - `rotation={[...display.rotation]}`
  - `size={[display.size.width, display.size.height]}`
  - `canvas` from role mapping
  - `canvasKey` includes display id, role, relevant state, and session panel mode when needed.
- Avoid z-fighting:
  - Use each config's `position` as the screen plane.
  - Keep frame/backplate behind the plane as local `z -0.04`.
  - Keep accent strips slightly in front as local `z 0.04`.
  - Do not render multiple large planes at the same position.
  - Do not layer old hard-coded main/timer screens over the configured hero screens.
- Preserve clickable session panel behavior:
  - The configured display with `role === "session-status"` should receive `groupRef={sessionPanelRef}`.
  - Keep the existing `useRegisterInteractable` registration id `"control-room-session-panel"`.
  - Keep modes `["clickable"]`.
  - Keep `cycleSessionPanelMode`.
  - Do not add new clickable monitors in V3-12.
- Use the configured `"session-status"` display as the only clickable session panel target.
- Do not add interactions for main dashboard, timer ribbon, participants, range, music, system, or data panels.
- Preserve `ControlRoomWallDisplays` props and canvas behavior for countdown/users/range data.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

  - [x] Add one large blue main screen centered on the balcony wall.
  - [x] Add two long green flanking screens on either side of the main screen.
  - [x] Add many smaller surrounding wall monitors.
  - [x] Use monitor colors intentionally: blue for main/timer/dashboard focus, green for side/status panels.

#### Acceptance Criteria

- Level 1 renders the configured `controlRoomDisplays` hero wall.
- One large blue main dashboard screen is visible.
- Two long green side/status screens are visible.
- One timer ribbon is visible.
- Multiple smaller surrounding monitors are visible.
- Screens do not visibly z-fight or overlap as duplicate large dashboard/timer layers.
- The old hard-coded main/timer wall screens do not render over the configured hero wall when config exists.
- The configured `session-status` screen remains clickable and cycles modes.
- No other new monitor interactions are added.
- `ControlRoomWallDisplays` still works if `displays` is omitted by falling back to the previous hard-coded layout.
- Range access, station reveal/return, local monitor interaction, sim roaming, range shooting, FPV body, Tab view, movement, hidden unlock, and normal 2D UI are unchanged.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual dev checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Verify the hero wall renders on/near the north balcony wall.
  - Verify the big blue dashboard is not overlapped by another big timer/dashboard plane.
  - Verify left and right green status screens are visible.
  - Verify the timer ribbon is visible and readable.
  - Verify smaller surrounding monitors render around the main screens.
  - Aim at the configured session/status screen and press `E`; verify it cycles modes.
  - Verify no other hero wall monitor becomes clickable.
  - Verify local station monitor return with `E` still works.
  - Verify range opening remains walk-through and range shooting still works.
  - Verify Tab top-down and FPV body still work.
  - Verify `?simRoam=0` still disables sim roaming locally.

#### Risks

- Migrating `ControlRoomWallDisplays` to config-driven rendering could accidentally remove the clickable session panel if the `session-status` ref is not attached correctly.
- Canvas key dependencies can become stale if they do not include the relevant countdown/session/sessionPanelMode values.
- Existing display canvases may need size-aware font tuning for some smaller configured screens.
- V3-11 positions may still need small z/height tuning after visual inspection, but render code should not invent alternate positions unless overlap makes the config unusable.
- Fallback hard-coded rendering must remain intact for levels/configs that omit `controlRoomDisplays`.

#### Wishlist Mapping

- Add one large blue main screen centered on the balcony wall.
- Add two long green flanking screens on either side of the main screen.
- Add many smaller surrounding wall monitors.
- Use monitor colors intentionally: blue for main/timer/dashboard focus, green for side/status panels.
- Keep text readable and avoid tiny unreadable screens.
- Fix the dashboard wall so screens do not overlap or z-fight.

  #### Non-Goals

  - Do not add new monitor interactions beyond preserving the existing session panel click behavior.
  - Do not implement jukebox behavior, SoundCloud controls, or live music data.
  - Do not add workstation props, lounge props, kitchen/island props, or movement features.
  - Do not change station reveal, station monitor return, FPV body, WASD, pointer lock, Tab top-down, sim roaming, range shooting, sync/reducer state, hidden unlock, or normal 2D UI.
  - Do not add dependencies.
  - Do not implement V3-13 or later phases.

  #### Completed Implementation

  - `Level1RoomShell` now passes `levelConfig.controlRoomDisplays` into `ControlRoomWallDisplays`.
  - `ControlRoomWallDisplays` renders the configured display list when present, sorted by `priority`, then `id`.
  - The previous hard-coded wall screen layout remains as the fallback path when `displays` is omitted or empty.
  - Configured displays reuse the existing dashboard, timer, session, participant, range, and status canvas helpers where possible.
  - Music and generic data panels render lightweight local status canvases without adding interactions or syncing data.
  - The configured `session-status` screen receives the existing `control-room-session-panel` interactable ref and keeps the same click-cycle behavior.
  - Configured hero wall rendering avoids duplicate old main/timer planes and keeps one screen plane per configured display with existing local frame/accent offsets.
  - `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-13: RGB Workstation Props

#### Summary

Add procedural desktop rigs, RGB PC towers, and glowing keyboards to make the Control Room feel active.

#### Implementation Spec

- Keep V3-13 decorative and render-only.
- Add a small procedural workstation component inside `Level1RoomShell.tsx`, likely `DecorativeRgbWorkstation` or `ControlRoomWorkstationProps`.
- Render the decorative workstations only when the active Level 1 Control Room is being rendered.
- Use simple static procedural meshes only:
  - desk slab
  - thin desk legs
  - monitor frame and glowing screen
  - keyboard strip with small RGB key bars
  - vertical PC tower with RGB accent strips
  - optional mouse pad or small terminal block
- Place several decorative rigs around the expanded Control Room edges and open corners, away from:
  - existing assigned stations
  - central player walking aisle
  - local station reveal/return monitors
  - range opening at `x=10`, `z=-1.2..1.2`
  - hero wall sightline near `z=-8.8`
  - balcony/stair readability
  - obvious sim roaming paths
- Recommended initial placements:
  - left expansion cluster around `x=-8.2`, `z=-2.2`
  - left rear cluster around `x=-7.6`, `z=4.8`
  - right rear cluster around `x=7.6`, `z=4.8`
  - side wall rig around `x=8.1`, `z=-2.6`
- Rotate rigs toward the room center so they read as workstations rather than wall monitors.
- Use `phaseVisuals` for emissive accents where useful, plus small RGB colors such as cyan, magenta, green, and amber.
- Keep geometry lightweight and static.
- Do not use `useFrame`, animation loops, textures, new dependencies, or synced state.
- Do not modify existing `ComputerStation` assigned stations or local monitor return behavior.
- Do not add interactions, clickable props, monitor return targets, collision blockers, movement changes, sync/reducer changes, or normal 2D UI changes.
- Run `npm.cmd run build` during implementation.

#### Checklist Items Achieved

- [x] Add more desktop rigs to make the room feel active.
- [x] Add RGB-lit PC towers.
- [x] Add glowing keyboards.
- [x] Add desk clusters that imply workers are vibe coding.

#### Acceptance Criteria

- Several decorative desktop rigs are visible in the expanded Control Room.
- Each rig includes a desk, monitor/screen, keyboard glow, and RGB PC tower detail.
- Existing user stations remain visually and behaviorally intact.
- Local monitor return still works only from the assigned/local station monitor.
- Hero monitor wall remains visible and is not blocked by workstation props.
- Balcony/stairs remain readable.
- Range opening remains visibly and physically unobstructed.
- Movement lanes remain usable; no new collision blockers are added.
- Sim roaming markers remain visible and are not obviously hidden inside new props.
- No new clickable/interactable monitor behavior appears.
- Hidden unlock, station reveal/return, movement, FPV body, Tab view, range shooting, sim roaming, jukebox state, sync/reducer state, and normal 2D UI are unchanged.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual dev checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Verify RGB workstation props appear in the Level 1 Control Room.
  - Verify existing assigned stations still show their dashboard monitors.
  - Verify local station monitor return with `E` still works.
  - Verify hero monitor wall remains readable.
  - Verify balcony/stairs remain readable.
  - Verify range opening remains walk-through.
  - Verify WASD movement, Tab top-down, FPV body, range shooting, sim roaming, and normal 2D return still work.
  - Verify no new monitor props are clickable.

#### Risks

- Decorative props could visually crowd the expanded room if placed too close to assigned stations.
- Props without collision may be walk-through; this is acceptable for this phase, but placement should make that less noticeable.
- Too much emissive/RGB detail could distract from the hero monitor wall or station dashboards.
- If props are placed near sim roaming routes, sim markers may appear to walk through them until a later constraint pass.

#### Wishlist Mapping

- Add more desktop rigs to make the room feel active.
- Add RGB-lit PC towers.
- Add glowing keyboards.
- Add desk clusters that imply workers are vibe coding.
- Enrich Level 1 Control Room without turning it into a separate level.

#### Non-Goals

- Do not change assigned station computers or `ComputerStation`.
- Do not add interactions, clickable props, or monitor return targets.
- Do not add collision blockers.
- Do not add new config types unless implementation proves the inline render-only component is too awkward.
- Do not implement lounge props, kitchen/island props, jukebox behavior, or V3-14+.
- Do not change hidden unlock, station reveal/return, movement, FPV body, Tab view, range shooting, sim roaming, hero wall behavior, sync/reducer state, or normal 2D UI.

#### Completed Implementation

- Added render-only procedural RGB workstation props in `Level1RoomShell`.
- Added four decorative workstation rigs around the expanded Level 1 Control Room edges.
- Each rig includes a desk slab, legs, glowing monitor, glowing keyboard keys, mouse pad detail, and RGB PC tower accents.
- Props render only with the active Level 1 Control Room.
- No interactions, collision blockers, movement changes, sync/reducer changes, or `ComputerStation` changes were added.
- Placement keeps the hero wall, balcony/stairs, assigned stations, range opening, and main movement lanes clear.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-14: Lounge Props

#### Summary

Add a couch or lounge seating area to the Control Room.

#### Implementation Spec

- Keep V3-14 decorative and render-only.
- Add a small lounge component in `Level1RoomShell.tsx`, likely `ControlRoomLoungeProps`.
- Mount the lounge only when the active Level 1 Control Room is being rendered.
- Build the lounge procedurally with simple static meshes:
  - low couch base
  - back cushions
  - side arms
  - two or three seat cushions
  - small low coffee table
  - optional subtle glowing accent strip or floor trim
- Place the lounge in a safe expanded Control Room side/corner zone that avoids active traffic and existing props.
- Recommended placement:
  - couch cluster near the west/southwest expansion area around `x=-8.1`, `z=6.8`, facing inward/east-northeast
  - away from assigned stations around `x=-4.5..4.5`, `z=-4.6..4.6`
  - away from the range opening at `x=10`, `z=-1.2..1.2`
  - away from the hero wall near `z=-8.8`
  - visually separate from the V3-13 RGB workstations, especially the left-rear workstation near `[-7.6, 4.8]`
- Keep all lounge geometry decorative and walk-through for this phase.
- Do not add collision blockers.
- Do not add interactions, seating mechanics, clickable props, monitor return targets, synced state, reducer changes, movement changes, `useFrame`, animation, textures, dependencies, or normal 2D UI changes.
- Do not modify `ComputerStation`, assigned stations, station reveal, or local monitor return.
- Do not implement kitchen, island, bar, countertop, or lighter props; V3-15 owns those.
- Run `npm.cmd run build` during implementation.

#### Checklist Items Achieved

- [x] Add a couch or lounge seating area.
- [ ] Add lounge and lifestyle props: couch, kitchen area, island bar, and countertop details.

#### Acceptance Criteria

- A couch/lounge area is visible in the Level 1 Control Room.
- The lounge includes a couch-like shape with base, back, arms, and cushions.
- A small coffee table or lounge detail is visible.
- The lounge does not visually block the hero wall.
- The lounge does not block or crowd the range opening.
- The lounge does not replace, move, or alter assigned stations or RGB workstations.
- Movement lanes remain usable; no new collision blockers are added.
- Sim roaming remains visible and not obviously hidden inside the lounge.
- No new interactables/clickable props appear.
- Hidden unlock, normal 2D UI, movement, FPV body, Tab view, range shooting, sim roaming, hero wall, RGB workstation props, jukebox state, and sync/reducer state are unchanged.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual dev checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Verify the lounge/couch appears in the Level 1 Control Room.
  - Verify the lounge reads as decorative seating plus a small table/detail.
  - Verify hero wall remains readable.
  - Verify RGB workstation props remain visible.
  - Verify assigned stations and local monitor return still work.
  - Verify range opening remains walk-through and range shooting still works.
  - Verify WASD movement, Tab top-down, FPV body, sim roaming, hidden unlock, jukebox state, and normal 2D return still work.
  - Verify the lounge is not clickable.

#### Risks

- The southwest/west placement may visually crowd the V3-13 left-rear RGB workstation and may need small visual tuning after a browser pass.
- Because no collision blockers are added, users can walk through the couch; this is acceptable for this phase.
- If the lounge is too tall or bright, it could distract from station dashboards or hero wall readability.
- Sim markers may visually pass through lounge props until a later pathing/readability pass.

#### Wishlist Mapping

- Add a couch or lounge seating area.
- Add lounge and lifestyle props.
- Make the expanded Level 1 Control Room feel more lived-in and less empty.
- Preserve the room as one connected Level 1 space alongside the computer area and shooting range.

#### Non-Goals

- Do not implement kitchen/island/bar props; that is V3-15.
- Do not add countertop props or lighter props.
- Do not add interactions, seating mechanics, collision blockers, or synced state.
- Do not modify `ComputerStation` or local monitor return.
- Do not move/redesign existing stations, RGB workstations, balcony/stairs, hero wall, range opening, or sim roaming logic.
- Do not change hidden unlock, normal 2D UI, movement, FPV body, Tab view, range shooting, sim roaming, hero wall behavior, workstation props, jukebox state, or sync/reducer state.

#### Completed Implementation

- Added render-only `ControlRoomLoungeProps` in `Level1RoomShell`.
- The lounge renders only with the active Level 1 Control Room.
- Added a procedural couch with base, back, arms, three cushions, subtle glow trim, a low coffee table, and small table details.
- No kitchen, island, bar, countertop, lighter, interactions, collision blockers, movement changes, sync/reducer changes, or station changes were added.
- Placement keeps the hero wall, RGB workstations, range opening, sim roaming, and main movement lanes clear.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-15: Kitchen Island Props

#### Summary

Add a small kitchen area with island/bar counter and countertop details.

#### Implementation Spec

- Keep V3-15 decorative and render-only.
- Add a small kitchen/bar island component in `Level1RoomShell.tsx`, likely `ControlRoomKitchenIslandProps`.
- Mount it only when the active Level 1 Control Room is being rendered, alongside the balcony, RGB workstations, and lounge props.
- Build the kitchen/bar area procedurally with simple static meshes:
  - island/bar counter base
  - countertop slab
  - subtle under-counter glow/accent strip
  - two or three small countertop props such as cups, a tray, or a small block/container
  - one clearly recognizable blow torch lighter prop made from a small cylinder body, nozzle, cap/head, and tiny colored flame/accent
- Place the kitchen/island in a safe expanded Control Room zone that is distinct from the lounge and workstation clusters.
- Recommended placement:
  - right/southeast side of the Control Room around `x=8.0`, `z=6.7`, rotated inward toward the center
  - away from assigned stations around `x=-4.5..4.5`, `z=-4.6..4.6`
  - away from the range opening at `x=10`, `z=-1.2..1.2`
  - away from the hero wall near `z=-8.8`
  - visually separate from the right-rear RGB workstation near `[7.6, 4.8]` by placing the island closer to the south wall and/or offsetting its rotation
  - away from the lounge near `[-8.35, 6.85]`
- Keep all geometry static and lightweight.
- Do not add collision blockers; kitchen props are walk-through in this phase.
- Do not add interactions, seating mechanics, pickup behavior, cooking/smoking mechanics, new UI, `useFrame`, animation loops, textures, dependencies, synced state, reducer changes, or network traffic.
- Do not modify `ComputerStation`, assigned stations, station reveal, local monitor return, hero wall, RGB workstations, lounge, range shooting, sim roaming, movement, hidden unlock, FPV body, Tab view, jukebox state, or normal 2D UI.
- Do not add extra lounge props or V3-16 readability changes.
- Run `npm.cmd run build` during implementation.

#### Checklist Items Achieved

- [x] Add a small kitchen area.
- [x] Add an island bar/counter.
- [x] Add countertop props.
- [x] Add a blow torch lighter prop on the countertop.

#### Acceptance Criteria

- A small kitchen/bar island area is visible in the Level 1 Control Room.
- The island has a base/countertop form that reads as a counter or bar.
- At least two small countertop props are visible.
- A blow torch lighter prop is visible on the countertop and reads as distinct from generic blocks/cups.
- The kitchen/island does not visually block the hero wall.
- The kitchen/island does not block or crowd the range opening.
- The kitchen/island does not replace, move, or alter assigned stations, RGB workstations, or lounge props.
- Movement lanes remain usable; no new collision blockers are added.
- Sim roaming remains visible and not obviously hidden inside kitchen props.
- No new interactables/clickable props appear.
- Hidden unlock, normal 2D UI, movement, FPV body, Tab view, range shooting, sim roaming, hero wall, workstation props, lounge props, jukebox state, and sync/reducer state are unchanged.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual dev checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Verify the kitchen/bar island appears in the Level 1 Control Room.
  - Verify countertop props are visible.
  - Verify the blow torch lighter prop is visible on the countertop.
  - Verify the kitchen/island is not clickable and does not return to dashboard.
  - Verify hero wall remains readable.
  - Verify RGB workstation props and lounge props remain visible.
  - Verify assigned stations and local monitor return still work.
  - Verify range opening remains walk-through and range shooting still works.
  - Verify WASD movement, Tab top-down, FPV body, sim roaming, hidden unlock, jukebox state, and normal 2D return still work.

#### Risks

- Right/southeast placement may visually crowd the right-rear RGB workstation and may need small tuning after a browser pass.
- Because no collision blockers are added, users can walk through the island; this is acceptable for this phase.
- Small countertop props may be hard to read at distance unless scaled slightly larger than real-world proportions.
- The blow torch lighter needs to be stylized enough to read clearly without adding complex geometry.

#### Wishlist Mapping

- Add a small kitchen area.
- Add an island bar/counter.
- Add countertop props.
- Add a blow torch lighter prop on the countertop.
- Continue making Level 1 feel like one richer connected environment, not separate levels.

#### Non-Goals

- Do not implement additional lounge/couch props; V3-14 already owns that.
- Do not add smoking/cooking mechanics, pickup behavior, item interactions, inventory, or new UI.
- Do not add collision blockers.
- Do not add synced state, reducer changes, or network traffic.
- Do not modify `ComputerStation` or local monitor return.
- Do not move/redesign existing stations, RGB workstations, lounge, balcony/stairs, hero wall, range opening, or sim roaming logic.
- Do not change hidden unlock, normal 2D UI, movement, FPV body, Tab view, range shooting, sim roaming, hero wall behavior, workstation props, lounge props, jukebox state, or sync/reducer state.

#### Completed Implementation

- Added render-only `ControlRoomKitchenIslandProps` in `Level1RoomShell`.
- The kitchen/bar island renders only with the active Level 1 Control Room.
- Added a procedural island base, countertop slab, under-counter glow strip, small countertop props, and a stylized blow torch lighter prop with nozzle/flame accents.
- No interactions, mechanics, collision blockers, movement changes, sync/reducer changes, station changes, extra lounge props, or V3-16 readability changes were added.
- Placement keeps the hero wall, RGB workstations, lounge, range opening, sim roaming, and main movement lanes clear.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-16: Expanded Control Room Readability Pass

#### Summary

Verify the larger Control Room still reads well in first-person and top-down view.

#### Implementation Spec

- Keep V3-16 as a narrow tuning/readability pass, not a feature pass.
- Review the current expanded Level 1 Control Room layout from source:
  - hero wall configured near `z=-8.8`
  - balcony near `z=-7.25`
  - stairs near `x=+-7.2`, `z=-5.6..-6.2`
  - RGB workstations near `[-8.2,-2.2]`, `[-7.6,4.8]`, `[7.6,4.8]`, `[8.1,-2.6]`
  - lounge near `[-8.35,6.85]`
  - kitchen island near `[8.18,6.78]`
  - range opening at `x=10`, `z=-1.2..1.2`
  - assigned stations around `x=-4.5..4.5`, `z=-4.6..4.6`
- During implementation, make only small adjustments that are clearly justified by readability or spacing.
- Allowed adjustments:
  - small prop position/rotation offsets for RGB workstations, lounge, or kitchen island
  - small prop scale/dimension tweaks if a prop visually crowds another prop
  - small hero monitor display sizes/positions in `levelConfig.controlRoomDisplays`
  - minor `ControlRoomWallDisplays` canvas text sizing or label tuning if a configured screen is unreadable
  - top-down camera target/orthographic size only if the expanded Level 1 Control Room/range framing is clearly poor
  - manual checklist updates for the readability pass
- Default expected likely adjustments:
  - If needed, separate the right-rear workstation and kitchen island so they do not visually merge.
  - If needed, separate the left-rear workstation and lounge so they do not visually merge.
  - If needed, ensure top-down camera still frames Control Room plus range without making the room too tiny.
  - If needed, adjust small hero data panel labels/text to reduce visual clutter.
- Preserve station reveal/return, local monitor return, range access, hero wall, RGB workstations, lounge, kitchen island, sim roaming, hidden unlock, FPV body, Tab view, normal 2D recovery, and jukebox state.
- Do not add new props, features, rooms, labels, interactions, collision blockers, movement mechanics, sync/reducer state, network traffic, jukebox behavior, or normal 2D UI changes.
- Do not implement true vertical stair/ramp traversal.
- Run `npm.cmd run build` during implementation.
- Optional if feasible during implementation: run a local dev smoke check/screenshot, but `npm.cmd run build` remains required.

#### Checklist Items Achieved

- [x] Keep first-person and top-down views readable after the room expands.
- [x] Keep the shooting range connection intact after the room expands.

#### Acceptance Criteria

- First-person navigation remains readable through the Control Room.
- Top-down view still gives a useful overview of the expanded Level 1 layout.
- Hero wall remains readable and is not visually blocked by balcony/stairs/props.
- RGB workstations, lounge, and kitchen island are visually distinct and not obviously merged into one cluttered mass.
- Range opening remains visible and walk-through.
- Assigned station monitors and local monitor return still work.
- Sim roaming markers remain visible enough and are not obviously hidden inside props.
- No new interactions, collision blockers, movement mechanics, sync/reducer changes, jukebox behavior, or normal 2D UI changes are introduced.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Optional implementation smoke check if feasible: `npm.cmd run dev -- --host 127.0.0.1 --port 5174`.
- Manual dev checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Walk around the Control Room in first-person and verify prop clusters are readable.
  - Press Tab and verify top-down framing still makes sense for the expanded room.
  - Verify the hero wall remains readable.
  - Verify RGB workstations, lounge, and kitchen island remain visible and distinct.
  - Verify the range opening remains walk-through and range shooting still works.
  - Verify assigned stations and local monitor return still work.
  - Verify sim roaming remains visible.
  - Verify hidden unlock and normal 2D recovery still work.

#### Risks

- Without a live browser visual pass, code-only tuning may be conservative and may not catch all visual clutter.
- Top-down camera changes could make either the Control Room or shooting range feel smaller if overcorrected.
- Prop placement tweaks could accidentally move decorative props closer to assigned stations or sim routes.
- Hero wall text tuning could improve one monitor while making another smaller monitor less readable.

#### Wishlist Mapping

- Keep first-person and top-down views readable after the room expands.
- Keep the shooting range connection intact after the room expands.
- Preserve the merged Level 1 layout with Control Room, lounge/kitchen/workstations, and shooting range as connected rooms.
- Keep the richer room additions usable rather than cluttered.

#### Non-Goals

- Do not add new props, rooms, levels, doors, labels, gameplay systems, or interactions.
- Do not add collision blockers or movement mechanics.
- Do not implement true vertical stair/ramp traversal.
- Do not change station reveal/return or local monitor return behavior.
- Do not change sim roaming logic, sync/reducer state, network traffic, jukebox behavior, hidden unlock, FPV body, range shooting, Tab behavior, or normal 2D UI.
- Do not implement any V3-22+ SoundCloud jukebox work.

#### Completed Implementation

- Updated the Control Room east-wall opening render stub to use the active Control Room area's current z bounds instead of the old hard-coded `-6..6` span.
- This keeps the visual east wall and range opening aligned with the expanded `z=-9..9` Control Room footprint from V3-9.
- The change is render-only and does not alter collision blockers, movement, range shooting, station reveal/return, local monitor return, props, sim roaming, sync/reducer state, jukebox behavior, or normal 2D UI.
- No new props, features, interactions, collision blockers, or movement mechanics were added.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-17: Sim Bot Roaming Design

#### Summary

Design how idle sim/test users should move through the 3D world without adding sync traffic. This is documentation-only.

#### Implementation Spec

- Define roaming candidates as `isTestUser && presence === "idle"`.
- Define ready sim users as staying at or returning to their assigned stations.
- Define spectating sim users as staying seated, dimmed, or moving to a future spectator area.
- Define roaming as local-only and deterministic from stable inputs such as user id and joinedAt.
- Define roaming movement as simple idle pauses and facing changes, not complex AI.
- Define pathing constraints that respect room bounds, blockers, stations, and future openings.
- Define roaming as separate from real free-roam presence and separate from station fallback selection.
- Do not implement code.

#### Checklist Items Achieved

- [x] Define how idle sim/test users should roam around the 3D world automatically.
- [x] Define how ready sim/test users should return to or remain near their assigned stations.
- [x] Define how spectating sim/test users should remain seated, dimmed, or move to a future spectator area.
- [x] Define sim roaming as local/deterministic with no movement sync traffic.
- [x] Define sim bot roaming as separate from real users and real free-roam presence.

#### Completed implementation

- Documented the roaming candidate rule as `isTestUser && presence === "idle"`.
- Documented ready and spectating sim behavior separately from idle roaming.
- Documented deterministic local-only roaming requirements and simple idle/facing behavior.
- Documented pathing and collision constraints for the later roaming implementation phases.
- Kept roaming explicitly separate from real free-roam presence and station fallback visuals.

#### Deferred / not included

- No code was implemented.
- No presence sync schema changes were added.
- No movement sync changes were added.
- No new roaming state was added.
- No roaming render was added.
- No source files were changed.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work was touched.

#### Acceptance Criteria

- The doc explicitly identifies roaming candidates as `isTestUser && presence === "idle"`.
- The doc defines distinct behavior for ready and spectating sim users.
- The doc states roaming is local-only and deterministic.
- The doc states roaming must respect room bounds, blockers, stations, and openings.
- The doc states roaming does not add sync traffic or presence frequency changes.
- The doc keeps station fallback and real free-roam presence separate.
- No source files are changed.

#### Risks

- Over-specifying movement too early could lock in the wrong roaming model.
- Under-specifying constraints could make later implementation drift into invalid walk paths.
- Mixing roaming rules with station fallback could blur the boundary between local visuals and actual presence.
- Adding too much detail could accidentally pull implementation work into this documentation phase.

#### Wishlist Mapping

- Idle sim/test users can roam around the 3D world automatically.
- Ready sim/test users return to or remain near their assigned stations.
- Spectating sim/test users remain seated, dimmed, or move to a future spectator area.
- Sim roaming is local/deterministic and does not add movement sync traffic.
- Sim bot roaming does not affect real users or real free-roam presence.
- Roaming should respect the merged Level 1 multi-room layout.
- Station fallback remains a reliable visual baseline while roaming is designed.

#### Non-Goals

- No code implementation.
- No sync events.
- No movement sync changes.
- No presence schema changes.
- No roaming state generation yet.
- No roaming render changes yet.
- No changes to `Level1RoomShell.tsx`, `level1.ts`, `ControlRoomWallDisplays.tsx`, `Level1RangeRoom.tsx`, `level2Range.ts`, or `ThreeDModeShell.tsx`.
- No unrelated SoundCloud, AdminPanel, env, or FloatingWindow work.
- No package additions.

### [x] Phase V3-18: Sim Bot Roaming State

#### Summary

Add local-only derived roaming pose logic for idle sim/test users, without rendering them yet and without touching sync/session state.

This phase creates the deterministic state/helper layer that V3-19 can consume for visual roaming. It must not emit events, write `freeRoamPresence`, mutate reducer state, or create network traffic.

#### Implementation Spec

- Create a pure exported helper module at `src/3d/simBotRoaming.ts`.
- Add exported types equivalent to:
  - `SimRoamingState = "moving" | "paused"`
  - `SimRoamingPose` with `userId`, `position`, `yaw`, `state`, `routeId`, and `segmentIndex`.
- Add a pure exported `getSimBotRoamingPoses` function that accepts `users`, `levelConfig`, and `elapsedSeconds`.
- Select only users where `user.isTestUser === true && user.presence === "idle"`.
- Ignore real users.
- Ignore ready sim users.
- Ignore spectating sim users.
- Generate deterministic route selection from `user.id` and `user.joinedAt`.
- Return stable poses for the same users, level config, and elapsed time.
- Use local time input only; do not call `Date.now()` internally.
- Define a small internal list of conservative starter waypoint loops using current Level 1 geometry.
- Include route ids such as `control-room-loop`, `connector-peek`, and `range-entry-loop`.
- Interpolate linearly between waypoints.
- Add deterministic pause windows at waypoints.
- Compute yaw from current position toward the next target.
- Use a modest deterministic movement speed and deterministic phase offset per sim so they do not stack.
- Keep derived sim poses outside `SessionSnapshot`, reducer state, and `freeRoamPresence`.
- Do not call `onUpdateFreeRoamPresence`.
- Do not render roaming markers.
- Do not change `ThreeDModeShell`, `Level1RoomShell`, reducers, sync clients, or render components in this phase.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Sim roaming is local/deterministic and does not add movement sync traffic.
- [x] Sim bots have simple facing direction and idle pauses.

#### Completed Implementation

- Added `src/3d/simBotRoaming.ts` with local-only `SimRoamingState`, `SimRoamingPose`, and `getSimBotRoamingPoses`.
- Derived poses only for users where `isTestUser === true && presence === "idle"`.
- Kept ready sims, spectating sims, and real users out of the derived pose output.
- Added deterministic route selection, route offsets, linear interpolation, yaw, and pause state from stable user inputs plus `elapsedSeconds`.
- Kept the helper isolated from rendering, reducers, sync clients, `freeRoamPresence`, and `onUpdateFreeRoamPresence`.
- Verified `npm.cmd run build` passes with the existing Vite chunk warning.

#### Acceptance Criteria

- `getSimBotRoamingPoses` returns one pose per `isTestUser === true && presence === "idle"` user.
- Ready sim users return no pose.
- Spectating sim users return no pose.
- Real users return no pose.
- Same user list, level config, and `elapsedSeconds` produce the same output.
- Different sim ids or `joinedAt` values can choose different deterministic route offsets/routes.
- Every pose includes `userId`, `position`, `yaw`, `state`, `routeId`, and `segmentIndex`.
- The helper does not import or call reducer/sync/free-roam update code.
- No calls to `onUpdateFreeRoamPresence` are added.
- No writes to `freeRoamPresence` are added.
- No rendering changes are added.
- `npm.cmd run build` passes.

#### Risks

- Because there is no render in V3-18, visual correctness cannot be confirmed until V3-19.
- Hardcoded starter waypoints may need adjustment after V3-20 adds movement constraints.
- If future implementation accidentally consumes this helper inside sync/reporting code, sim roaming could leak into real presence; keep the helper isolated.
- If waypoints are too close, multiple sims may appear stacked once rendering lands; deterministic route offsets reduce but do not fully solve that until V3-19/V3-20.

#### Wishlist Mapping

- Sim roaming is local/deterministic and does not add movement sync traffic.
- Sim bots have simple facing direction and idle pauses.
- Sim bot roaming does not affect real users or real free-roam presence.
- Prepares idle sim/test users to roam automatically in V3-19.

#### Non-Goals

- Do not render roaming sim bots.
- Do not suppress seated station markers.
- Do not change `Level1RoomShell`.
- Do not change `ThreeDModeShell`.
- Do not alter `StationOccupantMarker` or `FreeRoamPresenceMarker`.
- Do not add sync events.
- Do not add reducer events.
- Do not write to `freeRoamPresence`.
- Do not call `onUpdateFreeRoamPresence`.
- Do not add network traffic.
- Do not add a pathfinding dependency.
- Do not implement V3-19 render.
- Do not implement V3-20 movement constraints.
- Do not implement V3-21 toggle/tests.
- Do not disturb V3-31 station reveal, V3-32 monitor return, or V3-33 FPV body behavior.

### [x] Phase V3-19: Sim Bot Roaming Render

#### Summary

Render idle sim/test users as roaming in-world markers driven by the local-only V3-18 roaming helper.

Idle sims should visibly roam instead of sitting at computers. Ready and spectating sims should remain station-based. Real users and real free-roam presence must remain unchanged. This phase must not create sync events, reducer changes, `freeRoamPresence` writes, network traffic, or whole-room per-frame React state loops.

#### Implementation Spec

- Keep `Level1RoomShell` responsible only for deciding which idle sim users should roam and for suppressing their seated markers.
- Do not store elapsed seconds in `Level1RoomShell` React state.
- Do not re-render the whole room every frame for sim animation.
- In `Level1RoomShell`, derive an `idleRoamingSimUsers` list from users where:
  - `user.isTestUser === true`
  - `user.presence === "idle"`
  - no fresh real `freeRoamPresence` entry exists for that user.
- Build a `Set` of roaming sim user ids from that list.
- Suppress seated station markers for users in that set only.
- Keep seated station markers for real users, ready sim users, spectating sim users, and idle sims excluded because they somehow have fresh real free-roam presence.
- Add a small `SimBotRoamingMarker` component that owns a group ref and updates only its own transform with `useFrame`.
- Render one `SimBotRoamingMarker` per idle roaming sim user.
- In `SimBotRoamingMarker`, compute the current pose from V3-18 helper data without triggering React re-renders.
- Prefer adding a tiny pure `getSimBotRoamingPose({ user, levelConfig, elapsedSeconds })` helper if needed; keep `getSimBotRoamingPoses` as the multi-user API.
- The per-user helper must return `null` for real, ready, and spectating users.
- Use procedural geometry similar to existing markers but keep the label distinct with `SIM ROAM` or equivalent.
- Keep marker label canvas memoized from user/isHost only.
- Keep `FreeRoamPresenceMarker` unchanged unless a tiny shared presentational helper is truly needed; preferred default is no changes to real free-roam marker.
- Do not call `onUpdateFreeRoamPresence`.
- Do not write to `freeRoamPresence`.
- Do not change reducers, sync clients, session events, or real free-roam reporting.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Idle sim/test users can roam around the 3D world automatically.
- [x] Ready sim/test users return to or remain near their assigned stations.
- [x] Spectating sim/test users remain seated, dimmed, or move to a future spectator area.
- [x] Sim bot roaming does not affect real users or real free-roam presence.

#### Completed Implementation

- Added `SimBotRoamingMarker`, which animates each roaming sim with its own `useFrame` group transform.
- Added pure per-user `getSimBotRoamingPose` while preserving `getSimBotRoamingPoses`.
- Updated `Level1RoomShell` to render idle test users as `SIM ROAM` markers and suppress only those users' seated station markers.
- Kept ready sims, spectating sims, real users, and real free-roam presence behavior unchanged.
- Avoided whole-room per-frame React state updates for sim roaming.
- Added V3-19 manual checks to `docs/3d/manual-test-checklist.md`.
- Verified `npm.cmd run build` passes with the existing Vite chunk warning.

#### Acceptance Criteria

- Idle sim users visibly roam in the 3D world.
- Idle sim seated station markers are suppressed while their roaming marker is rendered.
- Ready sim users remain at stations and do not render roaming markers.
- Spectating sim users remain station-based/non-roaming.
- Real users are unchanged.
- Real remote free-roam markers are unchanged.
- Local player free-roam presence reporting is unchanged.
- `Level1RoomShell` does not store elapsed seconds in React state for sim roaming.
- `Level1RoomShell` does not run a whole-room per-frame React state update loop for sim roaming.
- Sim roaming animation is owned by per-marker `useFrame` updates.
- No calls to `onUpdateFreeRoamPresence` are added for sims.
- No reducer, sync client, or session event changes are made.
- No writes to `freeRoamPresence` are added.
- `npm.cmd run build` passes.

#### Risks

- Without V3-20 constraints, sim markers may pass through props or blockers on some routes.
- Per-marker `useFrame` is better than whole-room state updates, but many sims could still add frame work; session capacity is small, so this is acceptable for now.
- If the sim marker looks too similar to real free-roam users, users may confuse local demo bots with real remote players.
- Suppression filtering must stay limited to idle test users so real users are never hidden accidentally.
- Adding a per-user helper must preserve the pure/local-only guarantees from V3-18.

#### Wishlist Mapping

- Idle sim/test users can roam around the 3D world automatically.
- Ready sim/test users return to or remain near their assigned stations.
- Spectating sim/test users remain seated, dimmed, or move to a future spectator area.
- Sim bot roaming does not affect real users or real free-roam presence.
- Sim roaming remains local/deterministic and does not add movement sync traffic.

#### Non-Goals

- Do not implement V3-20 movement constraints.
- Do not implement V3-21 toggle/tests.
- Do not add whole-room per-frame React state updates for roaming.
- Do not add sync events.
- Do not add reducer events.
- Do not write to `freeRoamPresence`.
- Do not call `onUpdateFreeRoamPresence` for sims.
- Do not add network traffic.
- Do not change real free-roam presence behavior.
- Do not change local player movement/reporting.
- Do not add avatar customization or imported assets.
- Do not change station reveal, monitor return, FPV body, WASD, top-down, or range shooting behavior.

### [x] Phase V3-20: Sim Bot Movement Constraints

#### Summary

Keep roaming sim bots inside obvious valid walkable areas using simple deterministic waypoint constraints.

This phase should tighten the V3-18 route data/helper so V3-19 roaming markers avoid walls, station blockers, connector walls, range dividers, backstops, and obvious invalid space. It must remain local-only and deterministic, with no pathfinding dependency, no sync events, no reducer changes, no `freeRoamPresence` writes, and no network traffic.

#### Implementation Spec

- Keep the implementation inside `src/3d/simBotRoaming.ts`.
- Add a local sim radius constant such as `SIM_BOT_RADIUS = 0.32`.
- Add pure walkability helpers equivalent to:
  - `clampWaypointToRoom(waypoint, levelConfig)`
  - `isWaypointInsideRoom(waypoint, levelConfig)`
  - `collidesWithBlocker(waypoint, levelConfig)`
  - `isWaypointWalkable(waypoint, levelConfig)`
- Use `levelConfig.collisionBounds.room` and `levelConfig.collisionBounds.blockers`.
- Treat a waypoint as walkable only if its x/z are within room bounds after radius padding and do not intersect any blocker after radius padding.
- Keep waypoint validation pure and deterministic.
- Do not use DOM, clock, React, or sync state in validation helpers.
- Keep V3-18 public API stable: `getSimBotRoamingPose`, `getSimBotRoamingPoses`, `SimRoamingPose`, and `SimRoamingState`.
- Replace starter waypoints with points that are valid against current Level 1 collision bounds.
- Keep routes conservative:
  - Control-room aisle route stays in the center aisle, outside north/south station-row blockers.
  - Connector route moves through the `control-room-range-opening` clearance and connector center, avoiding connector north/south walls.
  - Range-entry route avoids range walls, backstop, and lane dividers.
- Use recommended safe Level 1 route points unless validation shows a point must be adjusted:
  - `control-room-loop`: `[-3.8, 1.7, 0]`, `[-1.3, 1.7, 1.0]`, `[1.3, 1.7, 1.0]`, `[3.8, 1.7, 0]`, `[1.3, 1.7, -1.0]`, `[-1.3, 1.7, -1.0]`
  - `connector-peek`: `[4.8, 1.7, 0]`, `[6.45, 1.7, 0]`, `[8.9, 1.7, 0]`, `[10.0, 1.7, 0]`, `[8.9, 1.7, 0]`, `[6.45, 1.7, 0]`
  - `range-entry-loop`: `[11.2, 1.7, 0]`, `[13.2, 1.7, 1.2]`, `[14.0, 1.7, 5.8]`, `[12.2, 1.7, 6.6]`, `[11.2, 1.7, 2.2]`
- If any recommended point fails validation, adjust only that point to the nearest obvious valid point in the same area.
- Add route sanitization when selecting routes:
  - Filter each route to walkable waypoints.
  - Exclude routes with fewer than two walkable waypoints.
  - Fall back to `DEFAULT_SIM_ROUTES` or a validated minimal room route if no Level 1 route survives.
- Do not implement dynamic obstacle avoidance or navmesh pathfinding.
- Do not make sims path around live users or stations dynamically.
- Do not add rendering changes; V3-19 marker rendering consumes whatever poses the helper returns.
- Do not change `Level1RoomShell` or `SimBotRoamingMarker` unless a type-only build issue requires it.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Sim bots avoid walls, major blockers, and room boundaries.
- [x] Sim bots can wander through connected Level 1 rooms once the multi-room layout exists.
- [x] Sim bots have simple facing direction and idle pauses.

#### Completed Implementation

- Added local deterministic walkability checks in `simBotRoaming.ts` using room bounds, blockers, and sim-radius padding.
- Updated Level 1 routes to safer control-room, connector, and range-entry waypoint loops.
- Added route sanitization that clamps to room bounds, filters blocker collisions, drops routes with fewer than two valid points, and falls back to validated default routes if needed.
- Kept the public sim roaming helper API stable.
- Kept changes local to `simBotRoaming.ts`, with no render, reducer, sync, `freeRoamPresence`, or network changes.
- Verified `npm.cmd run build` passes with the existing Vite chunk warning.

#### Acceptance Criteria

- All Level 1 sim route waypoints pass the helper's walkability check.
- Generated sim poses stay inside `levelConfig.collisionBounds.room` with sim radius padding.
- Generated sim poses do not intersect current collision blockers with sim radius padding.
- Sim bots avoid station-row blockers.
- Sim bots avoid connector north/south wall blockers.
- Sim bots avoid range wall blockers.
- Sim bots avoid range backstop and lane divider blockers.
- Sim bots can traverse at least the control-room center aisle, the control-room/range connector, and a safe range-entry loop.
- Ready sim users still produce no roaming pose.
- Spectating sim users still produce no roaming pose.
- Real users still produce no roaming pose.
- No sync/reducer/session/free-roam changes are made.
- No pathfinding dependency is added.
- V3-19 per-marker animation remains unchanged.
- `npm.cmd run build` passes.

#### Risks

- The current collision data is blocker-oriented, not a full navmesh.
- Route constraints are only as good as the route points.
- Filtering invalid route points can make a route too short if future geometry changes; the helper should drop routes with fewer than two valid points.
- Radius padding may make tight connector points invalid if too large.
- V3-20 does not solve dynamic avoidance; sims can still overlap each other or real users.
- Conservative routes may feel less lively until future control-room expansion and path design.

#### Wishlist Mapping

- Sim bots avoid walls, major blockers, and room boundaries.
- Sim bots can wander through connected Level 1 rooms once the multi-room layout exists.
- Sim bots have simple facing direction and idle pauses.
- Sim roaming remains local/deterministic and does not add movement sync traffic.
- Sim bot roaming does not affect real users or real free-roam presence.

#### Non-Goals

- Do not implement V3-21 toggle/tests.
- Do not add a navmesh or pathfinding dependency.
- Do not add dynamic avoidance.
- Do not add sync events.
- Do not add reducer events.
- Do not write to `freeRoamPresence`.
- Do not call `onUpdateFreeRoamPresence` for sims.
- Do not add network traffic.
- Do not change `Level1RoomShell` marker suppression unless a type-only build issue requires it.
- Do not change `SimBotRoamingMarker` rendering unless a type-only build issue requires it.
- Do not change real free-roam presence behavior.
- Do not change local player movement/reporting.
- Do not change station reveal, monitor return, FPV body, WASD, top-down, or range shooting behavior.

### [x] Phase V3-21: Sim Bot Roaming Toggle And Tests

#### Summary

Add a hidden local-only way to disable sim bot roaming for manual testing, and document the manual/code-review checks that prove sim roaming stays local and does not create sync/network traffic.

This phase should make it easy to compare "sims roaming" versus "sims seated" without adding visible normal 2D UI and without touching session sync, reducers, or free-roam presence.

#### Implementation Spec

- Use a hidden query-param toggle, not visible UI.
- `?simRoam=0` disables sim roaming locally.
- Any other value, missing param, or unknown value keeps sim roaming enabled.
- This is local browser/runtime behavior only.
- It does not persist to session state.
- It does not change normal 2D UI.
- It does not create a visible control, menu, setting, or button.
- In `Level1RoomShell`, add a small pure local helper equivalent to `isSimRoamingDisabledByQuery`.
- The helper should return true only when `new URLSearchParams(window.location.search).get("simRoam") === "0"`.
- Gate `idleRoamingSimUsers` so disabled mode uses `[]`; enabled mode preserves the V3-19 filter.
- Keep `roamingSimUserIds` derived from `idleRoamingSimUsers`.
- When disabled, do not render `SimBotRoamingMarker` instances and do not suppress idle sim seated station markers.
- When enabled, preserve V3-19 behavior.
- Update `manual-test-checklist.md` with default enabled behavior, disabled `?simRoam=0` behavior, ready/spectating behavior, no sync/network traffic checks, and code-review checks.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Sim bot roaming can be disabled if it hurts manual testing.
- [x] Sim roaming is local/deterministic and does not add movement sync traffic.

#### Acceptance Criteria

- Without `?simRoam=0`, idle sim users roam as in V3-19.
- With `?simRoam=0`, idle sim users remain station-based and no sim roaming markers render.
- With `?simRoam=0`, ready sim users remain station-based.
- With `?simRoam=0`, spectating sim users remain station-based/non-roaming.
- With `?simRoam=0`, real users remain unchanged.
- With `?simRoam=0`, real remote free-roam markers remain unchanged.
- `?simRoam=0` does not mutate session state.
- `?simRoam=0` does not change the normal 2D UI.
- No visible toggle/button/menu/setting is added.
- No sync events, reducer events, `freeRoamPresence` writes, or `onUpdateFreeRoamPresence` calls are added.
- No network traffic is added for sim roaming.
- `npm.cmd run build` passes.

#### Risks

- A visible toggle could accidentally expose dev controls to normal users.
- Query-param-only toggles are hidden and easy to forget, so documentation must be clear.
- Reading `window.location.search` makes the toggle browser-only, but this component already runs in the browser inside the 3D shell.
- If future routing starts using query params more heavily, `simRoam=0` should remain local-only and not become session state.
- Disabled mode can make solo demos feel less alive, but it is intended for manual testing.

#### Wishlist Mapping

- Sim bot roaming can be disabled if it hurts manual testing.
- Sim roaming is local/deterministic and does not add movement sync traffic.
- Manual checks document idle, ready, and spectating sim behavior.
- Manual checks document that no new sync traffic is introduced.

#### Non-Goals

- Do not add visible normal 2D UI.
- Do not add a settings panel control.
- Do not persist the toggle to reducer/session state.
- Do not add localStorage unless explicitly requested later.
- Do not add sync events.
- Do not add reducer events.
- Do not write to `freeRoamPresence`.
- Do not call `onUpdateFreeRoamPresence` for sims.
- Do not add network traffic.
- Do not change V3-18 route generation.
- Do not change V3-19 marker visuals.
- Do not change V3-20 constraints.
- Do not change real free-roam presence behavior.
- Do not change station reveal, monitor return, FPV body, WASD, top-down, or range shooting behavior.

### [x] Phase V3-22: Jukebox Capability Audit

#### Summary

Inspect the existing SoundCloud player and define what can safely power a 3D jukebox. This is documentation-only.

#### Implementation Spec

- Keep V3-22 documentation-only.
- Inspect and document current SoundCloud ownership:
  - `SoundCloudPanel` owns the real iframe/widget lifecycle.
  - `MainScreen` renders `SoundCloudPanel` independently from `ThreeDModeShell`.
  - `ThreeDModeShell` receives no SoundCloud props today.
  - 3D currently only has a placeholder `music-status` hero wall canvas in `ControlRoomWallDisplays`.
- Document available 2D/player state currently held inside `SoundCloudPanel`:
  - selected playlist id
  - selected playlist label/source url/api url from local `PLAYLISTS`
  - script readiness
  - widget readiness
  - playing state
  - track count
  - current track title
  - current track artist/user
  - current artwork url
  - current track url
  - waveform samples and derived bars
  - playback position
  - playback duration
  - error message
  - waveform popout window state
- Document available widget/player actions currently implemented:
  - play/pause toggle via `widget.toggle()`
  - shuffle play via random `widget.skip(index)` + `widget.play()`
  - retry via resetting widget state/reload nonce
  - playlist change via `selectedPlaylistId` and pending autoplay
  - waveform seek via `widget.seekTo(milliseconds)`
  - auto-next on `FINISH`
- Document actions not currently exposed as a clean public surface:
  - explicit next track button is not present, though shuffle/auto-next logic can skip to a random track
  - direct select track from playlist is not present
  - pageable playlist list is not exposed to React state; only `trackCount` is stored
  - track list names are available through `widget.getSounds`, but are not stored beyond count
  - pause/play status exists but is private to `SoundCloudPanel`
- Document likely safe first 3D exposure candidates:
  - read-only current song title/artist
  - playlist label
  - track count
  - play/standby/loading/error status
  - progress/duration
  - generated/derived waveform bars
  - safe actions after extraction: play/pause toggle, shuffle, retry
- Document actions to defer until later design/extraction:
  - next track if "next" means deterministic sequential next rather than random shuffle
  - playlist change from 3D
  - direct track select/pageable song list
  - waveform seek from 3D
  - any synced/shared jukebox state
- Document constraints for later phases:
  - the real SoundCloud iframe/player must remain in normal React/DOM, not embedded into Three.js
  - 3D should consume a small display/action interface later, not reach into widget refs
  - no reducer/session/sync changes should be introduced until a later explicit sync design phase
  - V3-23 should design shared state ownership, probably by extracting/lifting state from `SoundCloudPanel` into a hook/context while keeping the iframe owner in React DOM
- Do not run `npm.cmd run build` for V3-22 if only docs are edited.
- If source code is unexpectedly touched, `npm.cmd run build` becomes required.
- Do not implement code.

#### Checklist Items Achieved

- [x] Show current song, source/artist, and playback status.
- [x] Show play, pause, shuffle, next, and retry controls where supported.
- [x] Show the current playlist name.
- [ ] Show a pageable list of songs from the active playlist.

#### Acceptance Criteria

- V3-22 documents the current SoundCloud state and widget ownership.
- V3-22 documents currently available display data.
- V3-22 documents currently available actions.
- V3-22 identifies what is available now versus what requires refactor.
- V3-22 identifies safe first 3D display/action candidates.
- V3-22 clearly defers playlist paging, track selection, direct playlist change, waveform seek, and sync/shared state unless later phases approve them.
- V3-22 states that the actual SoundCloud iframe/player stays in normal React DOM.
- V3-22 does not change source code or runtime behavior.

#### Build/Test Commands

- Docs-only phase: no build required.
- If source code is accidentally touched or later added to scope: `npm.cmd run build`.
- Manual check is not required for docs-only, but reviewers can verify the audit against:
  - `src/components/SoundCloudPanel.tsx`
  - `src/screens/MainScreen.tsx`
  - `src/3d/ControlRoomWallDisplays.tsx`
  - `src/types/session.ts`

#### Risks

- `SoundCloudPanel` currently has private local state, so future extraction could disturb the working 2D player if done too aggressively.
- `widget.getSounds` exposes playlist sounds, but the app currently stores only `trackCount`; later pageable song lists require deliberate state extraction.
- "Next" is ambiguous today because current behavior auto-shuffles to a random next track on finish.
- 3D actions against the SoundCloud widget could conflict with pointer lock/movement if interaction routing is not designed carefully in later phases.
- Discord Activity URL remapping must stay preserved when refactoring SoundCloud ownership.

#### Wishlist Mapping

- Show current song, source/artist, and playback status.
- Show play, pause, shuffle, next, and retry controls where supported.
- Show the current playlist name.
- Show a pageable list of songs from the active playlist.
- Prepare the future 3D jukebox/music command station without breaking the existing 2D player.

#### Non-Goals

- Do not implement state extraction.
- Do not add a shared hook/context yet.
- Do not pass SoundCloud data into `ThreeDModeShell`.
- Do not render a jukebox.
- Do not add jukebox config.
- Do not add jukebox interactions/buttons.
- Do not add sync/reducer/session state.
- Do not change SoundCloud playback behavior, iframe ownership, URL remapping, waveform popout, normal 2D UI, 3D controls, range, sim roaming, Control Room props, or hero wall behavior.

#### Completed Implementation

- Completed the docs-only audit of current SoundCloud ownership and capabilities.
- Documented that `SoundCloudPanel` currently owns the real iframe/widget lifecycle and keeps SoundCloud state private.
- Documented currently available display data, including current track title/artist, playlist label, track count, playback status, progress/duration, artwork/url data, waveform data, readiness, and error state.
- Documented currently available actions, including play/pause toggle, shuffle play, retry, playlist change, waveform seek, and random auto-next on finish.
- Documented the gaps that require later refactor: clean public state/action surface, pageable playlist list, direct track selection, deterministic next, and 3D-facing data/action props.
- Documented safe first 3D exposure candidates and deferred playlist paging, track selection, waveform seek, sync/reducer state, jukebox config, jukebox render, and jukebox interactions to later phases.
- No source files were edited and no runtime behavior changed.
- No build was run because this phase is documentation-only.

### [x] Phase V3-23: Jukebox State Sharing Design

#### Summary

Design how SoundCloud state and actions can be shared between the normal React panel and the 3D jukebox. This is documentation-only.

#### Implementation Spec

- Keep V3-23 documentation-only.
- Use V3-22 as source context.
- Select the architecture for V3-24:
  - Extract SoundCloud state/widget logic into a shared React hook, likely `useSoundCloudPlayer`.
  - Keep that hook owned by `MainScreen`, not by Three.js.
  - Pass a small player object into `SoundCloudPanel` so the 2D panel remains the DOM/iframe/player UI owner.
  - Pass a small 3D-facing data/action subset into `ThreeDModeShell` later.
- Do not use reducer/session state for jukebox state in V3-24.
- Do not sync jukebox state across clients in V3-24.
- Do not embed the SoundCloud iframe/widget in Three.js.
- Define the future 3D display shape:
  ```ts
  interface JukeboxDisplayState {
    playlistId: string;
    playlistLabel: string;
    trackCount: number;
    currentTrackTitle: string;
    currentTrackArtist: string;
    currentTrackUrl: string | null;
    artworkUrl: string | null;
    isScriptReady: boolean;
    isWidgetReady: boolean;
    isPlaying: boolean;
    playbackPosition: number;
    playbackDuration: number;
    progress: number;
    waveformBars: number[];
    errorMessage: string | null;
  }
  ```
- Define the future 3D actions shape:
  ```ts
  interface JukeboxActions {
    togglePlayback: () => void;
    shufflePlay: () => void;
    retry: () => void;
  }
  ```
- Define actions intentionally excluded from first extraction:
  - playlist change from 3D
  - direct track selection
  - pageable playlist actions
  - waveform seeking from 3D
  - deterministic next
  - synced jukebox controls
- Define the V3-24 extraction target:
  - create a hook/module that owns refs, widget lifecycle, playlist selection, current track state, playback timing, waveform loading, and approved actions
  - preserve `SoundCloudPanel` visual markup and behavior by converting it to consume the hook output via props or a local wrapper
  - `MainScreen` owns the hook and passes it to `SoundCloudPanel`
  - `MainScreen` later passes the 3D-facing subset to `ThreeDModeShell`
  - `ThreeDModeShell` later passes read-only display state downward toward 3D render surfaces
- Define a safer prop split for V3-24:
  ```ts
  interface SoundCloudPlayerState extends JukeboxDisplayState {
    selectedPlaylistId: string;
    playlists: PlaylistOption[];
    controlsDisabled: boolean;
    waveformProgress: number;
    isWaveformWindowOpen: boolean;
  }

  interface SoundCloudPlayerActions extends JukeboxActions {
    changePlaylist: (playlistId: string) => void;
    seekWaveform: (ratio: number) => void;
    openWaveformWindow: () => void;
    closeWaveformWindow: () => void;
  }
  ```
- Keep the full state/actions local to the 2D panel, while only `JukeboxDisplayState`/`JukeboxActions` are passed toward 3D.
- Define ownership rules:
  - `SoundCloudPanel` remains the only component that renders the iframe and normal controls.
  - The hook can own widget refs, but no Three.js component may receive or call widget refs directly.
  - 3D controls may only call approved action callbacks.
  - SoundCloud iframe URL remapping and Discord proxy behavior must remain unchanged.
- No build required because this is docs-only.
- Do not implement code.

#### Checklist Items Achieved

- [x] Keep the actual SoundCloud iframe/player in the normal React app.
- [x] Do not embed the SoundCloud iframe directly into Three.js.

#### Acceptance Criteria

- V3-23 chooses a concrete state-sharing architecture for V3-24.
- V3-23 keeps the real SoundCloud iframe/player in normal React DOM.
- V3-23 defines a small 3D-facing display state.
- V3-23 defines a small 3D-facing action surface.
- V3-23 defines which actions/data are excluded from the first extraction.
- V3-23 states that V3-24 should preserve current 2D SoundCloud behavior.
- V3-23 states that no sync/reducer/session state is introduced.
- V3-23 does not change source code or runtime behavior.

#### Build/Test Commands

- Docs-only phase: no build required.
- If source code is accidentally touched or later added to scope: `npm.cmd run build`.
- Review-only checks:
  - Verify V3-23 references V3-22's audit decisions.
  - Verify V3-23 gives V3-24 enough shape to implement without re-deciding architecture.
  - Verify V3-23 does not approve playlist paging, direct track selection, waveform seek from 3D, jukebox render, or sync.

#### Risks

- Extracting a hook in V3-24 could temporarily destabilize `SoundCloudPanel` if iframe lifecycle and refs are moved too broadly.
- Passing action callbacks to 3D too early could blur boundaries between pointer-lock interactions and DOM player controls.
- Keeping the hook in `MainScreen` may increase prop threading, but it keeps ownership explicit and avoids adding global state too soon.
- Playlist paging and track selection remain deferred, so later 3D jukebox screens may initially show only summary/track count rather than a full song list.
- The chosen local-only architecture means multiple users will not share jukebox state until a later explicit sync phase.

#### Wishlist Mapping

- Keep the actual SoundCloud iframe/player in the normal React app.
- Do not embed the SoundCloud iframe directly into Three.js.
- Prepare to show current song, source/artist, playback status, playlist name, and waveform/equalizer in 3D.
- Prepare to support play/pause, shuffle, and retry from 3D later.
- Preserve the existing 2D player as the reliable base.

#### Non-Goals

- Do not implement state extraction.
- Do not create `useSoundCloudPlayer` yet.
- Do not pass SoundCloud props into `ThreeDModeShell`.
- Do not render a jukebox.
- Do not add jukebox config.
- Do not add jukebox interactions/buttons.
- Do not add playlist paging, direct track selection, playlist change from 3D, waveform seek from 3D, deterministic next, or synced controls.
- Do not add sync/reducer/session state.
- Do not change SoundCloud playback behavior, iframe ownership, URL remapping, waveform popout, normal 2D UI, 3D controls, range, sim roaming, Control Room props, or hero wall behavior.

#### Completed Implementation

- Completed the docs-only state sharing design for the future jukebox extraction.
- Selected the V3-24 architecture: extract SoundCloud state/widget logic into a shared `useSoundCloudPlayer`-style hook owned from `MainScreen`/React DOM, not from Three.js.
- Documented that `SoundCloudPanel` remains the real iframe/player UI owner and the only component that renders the SoundCloud iframe.
- Defined a small 3D-facing `JukeboxDisplayState` and `JukeboxActions` surface.
- Defined a fuller 2D player state/action split so `SoundCloudPanel` can preserve existing playlist controls, waveform seek, and waveform popout behavior.
- Deferred playlist paging, direct track selection, playlist change from 3D, waveform seek from 3D, deterministic next, synced controls, jukebox config, jukebox render, and jukebox interactions to later phases.
- No source files were edited and no runtime behavior changed.
- No build was run because this phase is documentation-only.

### [x] Phase V3-24: Jukebox State Extraction

#### Summary

Expose SoundCloud display state and approved actions to both the 2D panel and 3D shell.

#### Implementation Spec

- Preserve existing 2D SoundCloud panel behavior.
- Extract only the state/actions approved by Phase V3-22 and V3-23.
- Create a shared hook/controller owned by `MainScreen`, not by Three.js.
- Recommended new module: `src/hooks/useSoundCloudPlayer.ts`.
- Move SoundCloud constants/helpers/stateful logic out of `SoundCloudPanel` into the hook:
  - `PLAYLISTS`
  - widget script loading/remapping helpers
  - widget refs and lifecycle
  - playlist state
  - script/widget readiness
  - play/pause state
  - track count
  - current track title/artist/artwork/url
  - waveform samples/bars
  - playback position/duration/progress
  - error message
  - reload/retry state
  - waveform popout open state
  - actions for existing 2D controls
- Export typed shapes from the hook module:
  ```ts
  export interface PlaylistOption {
    id: string;
    label: string;
    apiUrl: string;
    sourceUrl: string;
  }

  export interface JukeboxDisplayState {
    playlistId: string;
    playlistLabel: string;
    trackCount: number;
    currentTrackTitle: string;
    currentTrackArtist: string;
    currentTrackUrl: string | null;
    artworkUrl: string | null;
    isScriptReady: boolean;
    isWidgetReady: boolean;
    isPlaying: boolean;
    playbackPosition: number;
    playbackDuration: number;
    progress: number;
    waveformBars: number[];
    errorMessage: string | null;
  }

  export interface JukeboxActions {
    togglePlayback: () => void;
    shufflePlay: () => void;
    retry: () => void;
  }
  ```
- Also expose a 2D panel-facing surface:
  ```ts
  export interface SoundCloudPlayerState extends JukeboxDisplayState {
    selectedPlaylistId: string;
    playlists: PlaylistOption[];
    controlsDisabled: boolean;
    waveformProgress: number;
    isWaveformWindowOpen: boolean;
    selectedPlaylist: PlaylistOption;
    resolvedWidgetSrc: string;
  }

  export interface SoundCloudPlayerActions extends JukeboxActions {
    changePlaylist: (playlistId: string) => void;
    seekWaveform: (ratio: number) => void;
    openWaveformWindow: () => void;
    closeWaveformWindow: () => void;
  }

  export interface SoundCloudPlayerController {
    iframeRef: React.RefObject<HTMLIFrameElement | null>;
    state: SoundCloudPlayerState;
    actions: SoundCloudPlayerActions;
    jukeboxDisplay: JukeboxDisplayState;
    jukeboxActions: JukeboxActions;
  }
  ```
- Keep the iframe rendered only inside `SoundCloudPanel`.
- Convert `SoundCloudPanel` to receive the controller from props:
  ```ts
  interface SoundCloudPanelProps {
    waveformBarCount: number;
    player: SoundCloudPlayerController;
  }
  ```
- `MainScreen` must call:
  ```ts
  const soundCloudPlayer = useSoundCloudPlayer({ waveformBarCount: soundCloudWaveformBarCount });
  ```
- `MainScreen` must pass the full controller to `SoundCloudPanel`:
  ```tsx
  <SoundCloudPanel waveformBarCount={soundCloudWaveformBarCount} player={soundCloudPlayer} />
  ```
- `MainScreen` must pass only the approved 3D-facing subset into `ThreeDModeShell`:
  ```tsx
  <ThreeDModeShell
    ...
    jukeboxDisplay={soundCloudPlayer.jukeboxDisplay}
    jukeboxActions={soundCloudPlayer.jukeboxActions}
  />
  ```
- `ThreeDModeShell` must accept typed optional props:
  ```ts
  jukeboxDisplay?: JukeboxDisplayState;
  jukeboxActions?: JukeboxActions;
  ```
- `ThreeDModeShell` must not render, read, call, or pass those props to 3D scene components in V3-24. They exist only to establish the typed surface for later phases.
- No SoundCloud widget refs, iframe refs, full `SoundCloudPlayerController`, full `SoundCloudPlayerState`, or full `SoundCloudPlayerActions` may be passed into `ThreeDModeShell` or any Three.js component.
- 3D-facing actions are limited to:
  - `togglePlayback`
  - `shufflePlay`
  - `retry`
- Keep waveform seek and popout behavior available only in the 2D panel.
- Keep playlist change available only in the 2D panel.
- Preserve Discord Activity URL remapping exactly:
  - `/soundcloud-widget`
  - `/soundcloud-api`
  - `discordsays.com` / `discordsez.com` host checks
- Preserve the existing `SoundCloudWaveformView` component and visual markup as much as possible.
- Do not render a 3D jukebox yet.
- Do not add jukebox config.
- Do not add jukebox interactions/buttons.
- Do not add sync/reducer/session state.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Show current song, source/artist, and playback status.
- [x] Show the current playlist name.

#### Acceptance Criteria

- Existing `SoundCloudPanel` UI and behavior are preserved.
- The real SoundCloud iframe remains rendered by `SoundCloudPanel` in normal React DOM.
- `MainScreen` owns the shared SoundCloud hook/controller.
- The extracted hook exposes typed `JukeboxDisplayState` and `JukeboxActions`.
- `MainScreen` passes the full controller to `SoundCloudPanel`.
- `MainScreen` passes only `jukeboxDisplay` and `jukeboxActions` into `ThreeDModeShell`.
- `ThreeDModeShell` accepts `jukeboxDisplay?: JukeboxDisplayState` and `jukeboxActions?: JukeboxActions`.
- `ThreeDModeShell` does not render, read, call, or pass through the jukebox props in V3-24.
- The 3D-facing actions are limited to `togglePlayback`, `shufflePlay`, and `retry`.
- Playlist change, waveform seek, waveform popout, and full playlist data remain 2D-only.
- No SoundCloud widget refs, iframe refs, full controller, full 2D state, or full 2D actions are passed to Three.js components.
- No sync/reducer/session state is added.
- No 3D jukebox config/render/interactions are added.
- `npm.cmd run build` passes.

#### Build/Test Commands

- Required implementation command: `npm.cmd run build`.
- Manual dev checks after implementation:
  - Load the app and verify the SoundCloud panel still appears normally.
  - Verify the widget iframe loads.
  - Verify playlist selector still changes playlist.
  - Verify Play/Pause still works after widget ready.
  - Verify Shuffle still starts/changes playback.
  - If an error state can be triggered, verify Retry still resets/reloads.
  - Verify waveform progress still updates.
  - Verify clicking waveform still seeks in the 2D panel.
  - Verify waveform popout still opens/closes.
  - Type `syncsesh` and verify entering/exiting 3D still works.
  - Verify no 3D jukebox appears yet.
  - Verify no 3D jukebox controls appear yet.
  - Verify normal timer, range, sim roaming, Control Room props, and hero wall behavior remain unchanged.

#### Risks

- Moving widget lifecycle out of `SoundCloudPanel` can accidentally break iframe ref timing if the hook/controller shape is too clever.
- `iframeRef` must remain attached to the iframe rendered by `SoundCloudPanel`.
- The selected playlist iframe `key` behavior must be preserved or playlist changes may not reload correctly.
- Timing interval cleanup and widget pause-on-unmount must stay intact.
- Discord URL remapping is easy to break if helpers move without their constants.
- Passing `jukeboxDisplay`/`jukeboxActions` into `ThreeDModeShell` creates a future-facing API surface; keep it small and do not let full player state leak into 3D.
- Unused optional props in `ThreeDModeShell` may trigger lint/TypeScript concerns if destructured unnecessarily; accept them in the props type and avoid reading them.

#### Wishlist Mapping

- Show current song, source/artist, and playback status.
- Show the current playlist name.
- Prepare future 3D display of track count, progress, and waveform/equalizer.
- Prepare future 3D play/pause, shuffle, and retry controls.
- Keep the actual SoundCloud iframe/player in the normal React app.
- Preserve the normal 2D player as the stable base.

#### Non-Goals

- Do not render a 3D jukebox.
- Do not add jukebox config.
- Do not add 3D jukebox buttons/interactions.
- Do not expose playlist change to 3D.
- Do not expose waveform seek to 3D.
- Do not pass widget refs, iframe refs, full controller state, or full 2D-only actions into `ThreeDModeShell`.
- Do not implement pageable playlist lists.
- Do not implement direct track selection.
- Do not implement deterministic next.
- Do not add sync/reducer/session state.
- Do not alter Discord URL remapping.
- Do not change normal 2D layout, 3D controls, range, sim roaming, Control Room props, hero wall behavior, hidden unlock, or normal recovery.

#### Completed Implementation

- Added `src/hooks/useSoundCloudPlayer.ts` as the shared SoundCloud hook/controller owned from React DOM.
- Moved SoundCloud widget lifecycle, iframe ref, playlist state, playback state, waveform state, URL remapping helpers, and existing player actions into the hook.
- Converted `SoundCloudPanel` to consume the full `SoundCloudPlayerController` while remaining the only component that renders the real SoundCloud iframe/player UI.
- Updated `MainScreen` to own `useSoundCloudPlayer`, pass the full controller to `SoundCloudPanel`, and pass only `jukeboxDisplay` plus `jukeboxActions` into `ThreeDModeShell`.
- Updated `ThreeDModeShell` to accept typed optional `jukeboxDisplay` and `jukeboxActions` props without reading, rendering, calling, or passing them through.
- Kept 3D-facing actions limited to `togglePlayback`, `shufflePlay`, and `retry`.
- Did not pass widget refs, iframe refs, full controller state, full 2D state, or full 2D-only actions into Three.js components.
- Did not add 3D jukebox render/config/interactions or sync/reducer/session state.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-25: Jukebox Config

#### Summary

Define static, typed Level 1 3D jukebox configuration data only.

This gives later phases a concrete placement, cabinet shape, screen layout, speaker layout, and control-zone map for a futuristic Control Room jukebox without rendering it or changing SoundCloud behavior.

#### Implementation Spec

- Keep V3-25 config/data only.
- Extend `src/3d/levels/types.ts` with a narrow optional jukebox config shape.
- Add `jukebox?: JukeboxConfig` to `LevelConfig`.
- Proposed config shape:
  - `JukeboxConfig`
    - `id`
    - `label`
    - `position`
    - `rotation`
    - `cabinetSize`
    - `screenSurfaces`
    - `speakerZones`
    - `controlZones`
  - `JukeboxScreenSurfaceConfig`
    - `id`
    - `label`
    - `role`
    - `localPosition`
    - `localRotation`
    - `size`
    - `colorRole`
  - `JukeboxSpeakerZoneConfig`
    - `id`
    - `label`
    - `localPosition`
    - `localRotation`
    - `size`
  - `JukeboxControlZoneConfig`
    - `id`
    - `label`
    - `role`
    - `localPosition`
    - `localRotation`
    - `size`
    - `phaseStatus`
- Add static `level1Config.jukebox` data only.
- Place the jukebox in the expanded Control Room along the west side, clear of the hero monitor wall, assigned computers, range opening, lounge, kitchen island, RGB workstations, and main movement lanes.
- Proposed placement:
  - `position: [-9.15, 0, 1.15]`
  - `rotation: [0, Math.PI / 2, 0]`
- Define one cabinet size suitable for V3-26 procedural rendering.
- Define screen surfaces for:
  - center / main now-playing display
  - left playlist display
  - right status/source display
  - lower controls/help display
- Define speaker zones for:
  - left speaker grille
  - right speaker grille
  - optional lower bass grille
- Define control zones for:
  - `toggle-playback`
  - `shuffle`
  - `retry`
  - `next`
  - `playlist-change`
  - `page-up`
  - `page-down`
- Keep the control-zone map future-facing only in this phase.
- Since V3-24 only approved 3D-facing actions `togglePlayback`, `shufflePlay`, and `retry`, mark `toggle-playback`, `shuffle`, and `retry` as the action-backed planned controls.
- Mark `next`, `playlist-change`, `page-up`, and `page-down` as future/planned placeholders only.
- Do not call or wire any jukebox actions.
- Do not render the jukebox.
- Do not add 3D jukebox interactions.
- Do not add visible normal-app controls.
- Do not alter SoundCloud behavior.
- Do not add sync, reducer, session, or network behavior.
- Preserve hidden unlock and normal 2D app recovery.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [ ] Add a futuristic jukebox/music command station to the Control Room.
- [ ] Give the jukebox multiple screens or monitors.

#### Acceptance Criteria

- `LevelConfig` supports an optional `jukebox` config.
- Level 1 defines exactly one static jukebox config.
- The jukebox config includes cabinet placement, cabinet size, screen surfaces, speaker zones, and control zones.
- The config is static, deterministic, and serializable.
- The configured placement is inside the expanded Control Room and clear of critical paths.
- The config does not render anything by itself.
- No new JSX, meshes, controls, interactions, sync events, reducer events, session state, network calls, or visible normal-app UI are added.
- No `jukeboxDisplay` or `jukeboxActions` values are read, rendered, called, or passed deeper into Three.js components.
- No SoundCloud widget refs, iframe refs, full player controller, or 2D-only player state enters 3D config.
- Existing Control Room displays, assigned stations, local monitor return, range shooting, sim roaming, FPV body, hidden unlock, SoundCloud behavior, and normal 2D UI are unchanged.
- `npm.cmd run build` passes.

#### Build/Manual Checks

- Required implementation command: `npm.cmd run build`.
- Manual/code-review checks after implementation:
  - Confirm only level config/types changed unless a doc checklist note is needed.
  - Confirm no jukebox is visible yet because V3-26 owns rendering.
  - Confirm normal 2D SoundCloud panel behavior is unchanged.
  - Confirm hidden 3D unlock still works.
  - Confirm normal 2D app recovery still works.
  - Confirm V3-26 has enough config to render a cabinet, screens, speakers, and control deck without inventing placement.

#### Risks

- The proposed west-wall placement may need minor adjustment once V3-26 renders real geometry.
- If the config shape is too generic, V3-26 could still need to invent rendering intent.
- If the config shape is too specific, future SoundCloud control phases may require type churn.
- Future control roles beyond `toggle-playback`, `shuffle`, and `retry` are placeholders until their data/actions are explicitly approved.
- Decorative placement must not visually compete with nearby RGB workstations, lounge props, or sim roaming paths once rendered.

#### Wishlist Mapping

- Add a futuristic jukebox/music command station to the Control Room.
- Give the jukebox multiple screens or monitors.
- Prepare future 3D display of current track, playlist/status, and simple jukebox controls.
- Keep the real SoundCloud iframe/player safely owned by the normal React DOM.

#### Non-Goals

- Do not render the jukebox.
- Do not render track data in 3D.
- Do not add jukebox interactions.
- Do not call `jukeboxActions`.
- Do not pass more SoundCloud data into Three.js.
- Do not add sync/reducer/session state.
- Do not add visible normal-app UI.
- Do not change existing SoundCloud playback behavior.
- Do not change Discord Activity URL remapping.
- Do not change waveform popout, playlist change, shuffle, retry, play/pause, or waveform seek behavior in the 2D panel.
- Do not change station reveal, monitor return, FPV body, WASD, pointer lock, Tab top-down, sim roaming, range shooting, hero wall behavior, hidden unlock, or normal recovery.
- Do not implement V3-26, V3-27, or V3-28.

#### Completed Implementation

- Added typed optional jukebox config shapes in `src/3d/levels/types.ts`.
- Added `jukebox?: JukeboxConfig` to `LevelConfig`.
- Added one static `level1Config.jukebox` entry for the Control Room jukebox.
- Included cabinet dimensions, four screen surfaces, three speaker zones, and seven future control zones.
- Marked `toggle-playback`, `shuffle`, and `retry` control zones as action-backed placeholders for later interaction phases.
- Marked `next`, `playlist-change`, `page-up`, and `page-down` as planned placeholders only.
- Did not render the jukebox, call `jukeboxActions`, read `jukeboxDisplay`, add interactions, or change SoundCloud behavior.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-26: Static Jukebox Render

#### Summary

Render the Level 1 Control Room jukebox procedurally from `levelConfig.jukebox`.

The jukebox should appear as a futuristic music command station with a cabinet, blank screens, speaker grilles, and a control deck, but it must not show live SoundCloud data or add interactions.

#### Implementation Spec

- Keep V3-26 render-only.
- Add a render-only component in `Level1RoomShell.tsx`, likely `ControlRoomJukebox`.
- Import/use `JukeboxConfig` from `src/3d/levels/types.ts` if needed.
- Mount the jukebox only when:
  - `shouldRenderControlRoomDisplays` is true.
  - `activeControlRoomArea` exists.
  - `levelConfig.jukebox` exists.
- Render from `levelConfig.jukebox`:
  - root `<group>` uses `jukebox.position` and `jukebox.rotation`.
  - cabinet dimensions come from `jukebox.cabinetSize`.
  - screen planes come from `jukebox.screenSurfaces`.
  - speaker grille geometry comes from `jukebox.speakerZones`.
  - button/control deck visual markers come from `jukebox.controlZones`.
- Use procedural Three.js geometry only.
- Render the cabinet body as dark metal/plastic box geometry.
- Add slight raised trim, front/back frame strips, a base plinth, a top cap, or side accent lines if lightweight.
- Render blank screens as static emissive dark/cyan/green/magenta surfaces.
- Render speaker zones as grille panels using small repeated bars/dots or simple inset boxes.
- Render control zones as small glowing buttons/plates on the control deck.
- Keep all jukebox controls visual-only.
- Do not register interactables.
- Do not add pointer/click handlers.
- Do not add keyboard or `E` handlers.
- Do not read `jukeboxDisplay`.
- Do not call `jukeboxActions`.
- Avoid z-fighting by using slight local offsets for cabinet face, screen planes, frames, buttons, and speaker grilles.
- Do not layer multiple planes at the same local depth.
- Keep the V3-25 placement unchanged unless a tiny visual-only adjustment is required to prevent obvious clipping. Default should be no config edits.
- Do not wire live SoundCloud data.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [ ] Add a futuristic jukebox/music command station to the Control Room.
- [ ] Give the jukebox multiple screens or monitors.
- [ ] Keep new geometry procedural until an asset-loading phase is explicitly approved.

#### Acceptance Criteria

- Jukebox renders only when `levelConfig.jukebox` exists in the active Level 1 Control Room.
- Jukebox rendering uses V3-25 config for cabinet size, position, rotation, screens, speaker zones, and control zones.
- Jukebox screens are blank/static visual surfaces only.
- Jukebox control zones are visual-only and do not respond to click, `E`, pointer lock, or keyboard input.
- No `jukeboxDisplay` or `jukeboxActions` values are read, rendered, called, or passed into the jukebox renderer.
- No SoundCloud iframe/widget refs, full player controller, or 2D-only SoundCloud actions enter Three.js.
- No sync/reducer/session state changes are made.
- No interactions are added.
- Existing station reveal/return, local monitor return, range shooting, sim roaming, FPV body, Tab view, hero wall, Control Room props, hidden unlock, and normal 2D recovery still behave as before.
- `npm.cmd run build` passes.

#### Build/Manual Checks

- Required implementation command: `npm.cmd run build`.
- Manual checks after implementation:
  - Enter the hidden world with `syncsesh`.
  - Verify the jukebox appears in the Level 1 Control Room near the west wall.
  - Verify the jukebox has a cabinet, blank screens, speaker grilles, and visual controls.
  - Verify clicking the jukebox does nothing special.
  - Verify `E` near the jukebox does nothing special.
  - Verify normal SoundCloud panel behavior in 2D is unchanged.
  - Verify local monitor return still works only on the assigned/local computer monitor.
  - Verify range shooting still works.
  - Verify WASD, pointer lock, FPV body, Tab top-down, and sim roaming still work.
  - Verify normal 2D recovery still works.

#### Risks

- The V3-25 west-wall placement may visually collide with nearby decorative props once geometry is visible.
- Blank emissive screens could look like live data screens before V3-27; keep them visibly inactive/static.
- Control-zone buttons may look interactive even though V3-28 owns interactions; keep them subtle or clearly decorative.
- If the cabinet is too large, it may crowd west-side props or sim paths, but no collision blockers are added in this phase.
- Overly detailed procedural geometry could add visual clutter; keep it lightweight.

#### Wishlist Mapping

- Add a futuristic jukebox/music command station to the Control Room.
- Give the jukebox multiple screens or monitors.
- Keep new geometry procedural until an asset-loading phase is explicitly approved.
- Prepare for later 3D SoundCloud display and controls without touching playback behavior yet.

#### Non-Goals

- Do not render current track, playlist, waveform, playback status, or SoundCloud data.
- Do not implement canvas textures for jukebox screens.
- Do not call `jukeboxActions`.
- Do not read `jukeboxDisplay`.
- Do not add click, `E`, keyboard, pointer, or proximity interactions.
- Do not add sync/reducer/session state.
- Do not change `useSoundCloudPlayer`.
- Do not change `SoundCloudPanel`.
- Do not change normal 2D UI.
- Do not add visible app settings or controls.
- Do not add collision blockers.
- Do not alter station reveal/return, monitor return, range shooting, sim roaming, FPV body, Tab view, hero wall, hidden unlock, or normal recovery.
- Do not implement V3-27 or V3-28.

#### Completed Implementation

- Added a render-only `ControlRoomJukebox` component in `src/3d/Level1RoomShell.tsx`.
- Mounted the jukebox only when the active Level 1 Control Room renders and `levelConfig.jukebox` exists.
- Rendered the cabinet body, trim, base, top cap, side accent strips, blank screen surfaces, speaker grilles, and visual-only control plates from `levelConfig.jukebox`.
- Kept screens static and blank for V3-27.
- Added no interactions, handlers, interactable registration, collision blockers, SoundCloud data reads, or `jukeboxActions` calls.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-27: Jukebox Screen Data Render

#### Summary

Render read-only SoundCloud/jukebox display data onto the V3-26 jukebox screen surfaces using canvas textures.

This phase makes the 3D jukebox screens feel connected to the existing 2D SoundCloud player while keeping `SoundCloudPanel` as the only real iframe/player owner. It must not add 3D jukebox interactions or change playback behavior.

#### Implementation Spec

- Pass the existing optional `jukeboxDisplay?: JukeboxDisplayState` from `ThreeDModeShell` into `Level1RoomShell`.
- Add optional `jukeboxDisplay?: JukeboxDisplayState` to `Level1RoomShellProps`.
- Pass `jukeboxDisplay` into `ControlRoomJukebox`.
- Keep `jukeboxActions` unused and unpassed.
- In `Level1RoomShell.tsx`, add canvas texture helpers local to the file:
  - `createJukeboxScreenCanvas(screen, jukeboxDisplay)`.
  - role-specific drawing helpers if useful:
    - now-playing.
    - playlist.
    - status/source.
    - controls/help.
- Use `CanvasTexture` from `three` for the screen material.
- Use `useMemo` inside a small screen subcomponent, likely `JukeboxScreenSurface`, so screen canvases update only when relevant display fields change.
- Keep the current V3-26 frame/backplate/trim geometry.
- Replace only the blank screen plane material with a texture-backed material when display data exists.
- If `jukeboxDisplay` is missing, render safe static placeholder canvases instead of crashing:
  - `SOUNDCLOUD`.
  - `STANDBY`.
  - `NO PLAYER DATA`.
- Do not animate via per-frame state in this phase.
- Draw waveform/equalizer bars from `jukeboxDisplay.waveformBars` if present.
- Fall back to a deterministic static bar pattern if `waveformBars` is empty.
- Use `jukeboxDisplay.progress` to highlight elapsed bars or a progress line.
- Center/now-playing screen shows:
  - current track title.
  - artist/source.
  - play/pause/standby/error status.
  - progress time/duration if available.
  - waveform/equalizer-style bars from `waveformBars`.
- Playlist screen shows:
  - active playlist label.
  - track count.
  - current track title/artist summary.
  - page/list affordance as visual-only.
- Status/source screen shows:
  - script/widget readiness.
  - playback connection state.
  - error message if present.
  - source/status labels.
- Controls/help screen shows:
  - visual-only supported controls: play/pause, shuffle, retry.
  - visual-only placeholders for next/page/playlist if present in config.
- Treat unsupported controls such as `next`, playlist change, and page controls as visual/status placeholders only.
- Do not register interactables.
- Do not add event handlers.
- Do not call `jukeboxActions`.
- Do not change SoundCloud playback behavior.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [ ] Show current song, source/artist, and playback status.
- [ ] Show an animated waveform or equalizer.
- [ ] Show play, pause, shuffle, next, and retry controls where supported.
- [ ] Show the current playlist name.
- [ ] Show a pageable list of songs from the active playlist.
- [ ] Add a change-playlist/source area.
- [ ] Use canvas textures for 3D jukebox screens.

#### Acceptance Criteria

- `ThreeDModeShell` passes only `jukeboxDisplay` into `Level1RoomShell`.
- `jukeboxActions` remain unused and are not called.
- `Level1RoomShell` renders jukebox screen canvas textures when `levelConfig.jukebox` exists.
- Screen content is driven by `JukeboxDisplayState`.
- Missing `jukeboxDisplay` renders safe placeholder screen data.
- Current track title, artist/source, playlist label, track count, playback status, progress, and waveform bars are represented on appropriate screens.
- Unsupported controls such as `next`, playlist change, and page controls are visual/status placeholders only.
- No interactables, click handlers, `E` handlers, keyboard handlers, proximity logic, or action calls are added.
- `SoundCloudPanel` remains the only real iframe/player UI owner.
- No SoundCloud playback behavior changes.
- No sync/reducer/session state changes.
- Existing station reveal/return, local monitor return, range shooting, sim roaming, FPV body, Tab view, hero wall, hidden unlock, and normal 2D recovery remain unchanged.
- `npm.cmd run build` passes.

#### Build/Manual Checks

- Required implementation command: `npm.cmd run build`.
- Manual checks after implementation:
  - Open normal 2D app and confirm SoundCloud panel still works.
  - Enter hidden world with `syncsesh`.
  - Confirm jukebox screens now show track/player information instead of blank screens.
  - Confirm play/pause status changes visually when controlled from the 2D panel.
  - Confirm waveform/progress changes visually from existing display state.
  - Confirm clicking the jukebox does not affect playback.
  - Confirm pressing `E` near the jukebox does not affect playback.
  - Confirm local monitor return still works.
  - Confirm range shooting still works.
  - Confirm WASD, pointer lock, FPV body, Tab view, and sim roaming still work.
  - Confirm normal 2D recovery still works.

#### Risks

- Canvas texture generation can become expensive if recreated too often; use memoized dependencies rather than frame loops.
- Screen text may be hard to read on small surfaces; keep large labels and concise fields.
- Long track titles may overflow; truncate or fit text safely.
- Progress and waveform can look animated even though this phase should remain read-only; updates should come only from existing `jukeboxDisplay` state changes.
- Unsupported controls could be mistaken as interactive; dim or label future-only controls clearly.

#### Wishlist Mapping

- Show current song, source/artist, and playback status.
- Show an animated-looking waveform or equalizer using existing display state.
- Show play, pause, shuffle, next, and retry controls where supported or planned.
- Show the current playlist name.
- Show a pageable list/status area for songs without implementing paging yet.
- Add a change-playlist/source area as a visual placeholder.
- Use canvas textures for 3D jukebox screens.

#### Non-Goals

- Do not add jukebox button interactions.
- Do not call `jukeboxActions`.
- Do not use `jukeboxActions` inside Three.js components.
- Do not add `next`, playlist change, page up/down, or waveform seek behavior.
- Do not change `useSoundCloudPlayer`.
- Do not change `SoundCloudPanel`.
- Do not move or duplicate the SoundCloud iframe.
- Do not add sync/reducer/session state.
- Do not add network calls.
- Do not add normal 2D UI.
- Do not add settings, controls, buttons, or hints outside the 3D jukebox screen visuals.
- Do not add collisions or interactables.
- Do not implement V3-28 or V3-29.
- Do not change hidden unlock, station reveal/return, monitor return, range shooting, sim roaming, FPV body, Tab view, hero wall, or normal recovery.

#### Completed Implementation

- Passed only `jukeboxDisplay` from `ThreeDModeShell` into `Level1RoomShell`.
- Kept `jukeboxActions` unused and unpassed.
- Added local jukebox canvas drawing helpers in `src/3d/Level1RoomShell.tsx`.
- Rendered read-only canvas textures on the configured jukebox screen surfaces.
- Displayed now-playing title, artist/source, playlist label, track count, script/widget/source status, error text, progress timing, waveform-style bars, and visual-only control/status labels.
- Added safe placeholder screen content when `jukeboxDisplay` is missing.
- Added keyed `<canvasTexture>` usage so screen textures can refresh when display state changes.
- Added no interactables, click handlers, `E` handlers, action calls, sync/reducer/session state, network calls, or normal 2D UI changes.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-28: Jukebox Button Interactions

#### Summary

Wire only the approved action-backed jukebox control zones to existing 3D interaction behavior.

Allowed actions are exactly:

- `toggle-playback` -> `jukeboxActions.togglePlayback`.
- `shuffle` -> `jukeboxActions.shufflePlay`.
- `retry` -> `jukeboxActions.retry`.

This phase must not invent or add `next`, playlist change, page up/down, waveform seek, sync state, or new SoundCloud state/actions.

#### Implementation Spec

- In `ThreeDModeShell`:
  - Destructure the existing optional `jukeboxActions?: JukeboxActions` prop.
  - Pass only `jukeboxActions` into `Level1RoomShell`.
  - Continue passing `jukeboxDisplay` as V3-27 already does.
  - Do not pass the full SoundCloud controller, widget refs, iframe refs, or 2D-only actions.
- In `Level1RoomShell`:
  - Add optional `jukeboxActions?: JukeboxActions` to `Level1RoomShellProps`.
  - Pass `jukeboxActions` into `ControlRoomJukebox`.
  - Import `useRegisterInteractable` from `./interactions`.
  - Add a small subcomponent, likely `JukeboxControlZone`, that owns one ref per control mesh and registers interactables safely.
  - Register only control zones where:
    - `control.phaseStatus === "action-backed"`.
    - `control.role` is one of `toggle-playback`, `shuffle`, `retry`.
    - matching `jukeboxActions` function exists.
  - Use `modes: ["clickable"]` only.
  - `onActivate` calls exactly the mapped action.
  - Keep planned controls rendered as visual-only and unregistered.
- Preserve current interaction semantics:
  - `E` activates clickable interactables through the existing `AimInteractionController`.
  - Primary pointer click remains for shootable interactions/range shooting.
  - Do not add pointer/click handlers to the jukebox meshes.
  - Do not make primary click activate the jukebox.
- Planned jukebox controls remain visual/status placeholders only:
  - `next`.
  - `playlist-change`.
  - `page-up`.
  - `page-down`.
- Do not create or expose any new SoundCloud action surface.
- Do not add sync/reducer/session/network behavior.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [ ] Make approved jukebox controls usable from inside the 3D world.
- [ ] Show play, pause, shuffle, next, and retry controls where supported or planned.
- [ ] Keep unsupported future controls visible as planned placeholders.

#### Acceptance Criteria

- `ThreeDModeShell` passes only optional `jukeboxActions` into `Level1RoomShell`.
- `Level1RoomShell` registers only `toggle-playback`, `shuffle`, and `retry` control zones as clickable interactables.
- `next`, `playlist-change`, `page-up`, and `page-down` remain unregistered and visual-only.
- Pressing `E` while aiming at an action-backed jukebox control calls the correct approved action.
- Clicking primary pointer does not activate jukebox controls.
- Range shooting still works with primary pointer click.
- Local monitor return with `E` still works when aiming at the local monitor.
- Movement focus and pointer lock behavior remain unchanged.
- No changes are made to `useSoundCloudPlayer` or `SoundCloudPanel`.
- No sync/reducer/session state is added.
- No new SoundCloud action surface is created.
- `npm.cmd run build` passes.

#### Build/Manual Checks

- Required implementation command: `npm.cmd run build`.
- Manual checks after implementation:
  - Open the normal 2D app and confirm SoundCloud panel still works.
  - Enter hidden world with `syncsesh`.
  - Aim at the jukebox play/pause control and press `E`; verify playback toggles.
  - Aim at shuffle and press `E`; verify existing shuffle behavior runs.
  - Aim at retry and press `E`; verify existing retry behavior runs.
  - Aim at next/page/playlist placeholder controls and press `E`; verify nothing happens.
  - Primary-click while aiming at jukebox controls should not trigger jukebox actions.
  - Verify range shooting still works with primary click.
  - Verify local monitor return still works with `E`.
  - Verify WASD, pointer lock, FPV body, Tab top-down, station reveal/return, sim roaming, hidden unlock, and normal 2D recovery still work.

#### Risks

- Jukebox controls are physically close together, so raycast hit targeting may need careful refs on individual button meshes.
- If button geometry is too small, aiming may feel fussy; increase only the invisible/visible registered mesh size slightly if needed.
- Because `E` is shared by local monitor return and jukebox controls, registration ordering and spatial ray hits must keep actions target-specific.
- Planned visual controls could confuse users if they look pressable; keep them dim and unregistered.
- Calling existing SoundCloud actions from 3D may expose existing widget readiness edge cases; do not add new retry or readiness behavior in this phase.

#### Wishlist Mapping

- Show play, pause, shuffle, next, and retry controls where supported.
- Make approved jukebox controls usable from inside the 3D world.
- Keep unsupported future controls visible as planned placeholders.
- Preserve the normal 2D SoundCloud panel as the real player owner.

#### Non-Goals

- Do not implement `next`.
- Do not implement playlist change.
- Do not implement page up/down.
- Do not implement waveform seek.
- Do not add new SoundCloud actions.
- Do not modify `useSoundCloudPlayer`.
- Do not modify `SoundCloudPanel`.
- Do not add sync/reducer/session state.
- Do not add network calls.
- Do not add normal 2D UI.
- Do not add new visible settings, menus, or hints.
- Do not make primary pointer click activate clickable jukebox controls.
- Do not change range shooting.
- Do not change local monitor return.
- Do not change movement focus, pointer lock, hidden unlock, station reveal/return, sim roaming, FPV body, Tab view, hero wall, or normal recovery.
- Do not implement V3-29 polish.

#### Completed Implementation

- Passed only optional `jukeboxActions` from `ThreeDModeShell` into `Level1RoomShell`.
- Mapped only `toggle-playback`, `shuffle`, and `retry` action-backed control zones to approved actions.
- Registered only those three action-backed controls as existing `clickable` interactables.
- Kept `next`, `playlist-change`, `page-up`, and `page-down` visual-only and unregistered.
- Used the existing `E` / `AimInteractionController` path for activation.
- Added no primary-pointer jukebox handlers, new SoundCloud actions, sync/reducer/session state, network calls, normal 2D UI, or V3-29 polish.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-29: Jukebox Visual Polish

#### Summary

Make the Level 1 jukebox feel alive with lightweight visual polish only.

This phase adds stronger screen glow, cabinet accent lighting, a subtle playing-state pulse, and cheap speaker/equalizer motion driven by existing read-only `jukeboxDisplay` state. It must not add behavior, controls, actions, sync state, imported assets, audio analysis, or normal 2D UI.

#### Implementation Spec

- Keep all polish local to `Level1RoomShell.tsx`.
- Read only existing visual input:
  - `jukeboxDisplay?.isPlaying`.
  - `jukeboxDisplay?.progress`.
  - optionally `jukeboxDisplay?.waveformBars`.
- Add lightweight visual helpers/subcomponents around the existing `ControlRoomJukebox` structure:
  - `JukeboxAccentLights`.
  - `JukeboxSpeakerGlow` or speaker grille pulse.
  - optional `JukeboxPlayingPulse`.
- Use `useFrame` only inside small, isolated ref-based components.
- Do not update React state per frame.
- Do not recreate canvas textures per frame.
- Make screen glow stronger when music is playing:
  - small emissive halos/frames around screen surfaces.
  - slightly stronger accent strips.
- Add subtle cabinet accent pulse when `jukeboxDisplay?.isPlaying` is true:
  - scale or emissive intensity changes on tiny accent meshes.
  - keep pulse low amplitude so it does not distract from controls.
- Add cheap equalizer/speaker motion if simple:
  - animate existing speaker grille accent bars via scale or emissive intensity.
  - optionally use `waveformBars` to seed static bar heights, but no audio analysis.
- If not playing, keep a calm standby glow.
- Keep current V3-28 interactable meshes and refs intact.
- Do not change which controls are registered.
- Do not make planned controls look newly actionable.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Make the jukebox glow or pulse when music is playing.
- [x] Make the monitor wall feel like a command center, not just decorative panels.

#### Acceptance Criteria

- Visual polish is limited to the jukebox render in `Level1RoomShell.tsx`.
- Jukebox has clearer screen/cabinet glow.
- Playing state causes a subtle visual pulse.
- Standby state remains visually calm.
- Any animation is ref-based and does not set React state per frame.
- No audio analysis is added.
- No imported assets are added.
- No particles or heavy effects are added.
- V3-28 controls remain unchanged:
  - only `toggle-playback`, `shuffle`, and `retry` are registered.
  - planned controls remain visual-only and unregistered.
- No `jukeboxActions` calls are added beyond existing V3-28 control activation.
- No sync/reducer/session/network behavior is added.
- No normal 2D UI changes are made.
- `npm.cmd run build` passes.

#### Build/Manual Checks

- Required implementation command: `npm.cmd run build`.
- Manual checks after implementation:
  - Enter hidden world with `syncsesh`.
  - Confirm jukebox has clearer glow and visual presence.
  - Start playback from 2D panel or V3-28 control and confirm subtle pulse appears.
  - Pause playback and confirm the pulse calms down.
  - Verify `E` controls still work only for play/pause, shuffle, and retry.
  - Verify next/page/playlist controls remain inert.
  - Verify primary click still does not activate jukebox controls.
  - Verify range shooting still works.
  - Verify local monitor return still works.
  - Verify WASD, pointer lock, FPV body, Tab view, station reveal/return, sim roaming, hidden unlock, and normal 2D recovery still work.

#### Risks

- Too much glow could make screen text harder to read.
- Pulse or speaker animation could distract from aiming at controls.
- If animated meshes overlap interactable meshes, raycast targeting could become less reliable.
- Per-frame effects could become noisy if implemented on too many objects; keep it tiny and ref-based.
- Playing-state visual updates depend on the existing `jukeboxDisplay` state cadence.

#### Wishlist Mapping

- Make the jukebox glow or pulse when music is playing.
- Make the monitor wall / Control Room feel more like a command center.
- Keep the jukebox alive visually while staying lightweight.
- Preserve procedural geometry instead of importing assets.

#### Non-Goals

- Do not add new interactions.
- Do not change V3-28 action mapping.
- Do not add new SoundCloud actions.
- Do not call `jukeboxActions` outside existing approved controls.
- Do not modify `useSoundCloudPlayer`.
- Do not modify `SoundCloudPanel`.
- Do not add audio analysis.
- Do not add imported assets.
- Do not add heavy particles.
- Do not add sync/reducer/session state.
- Do not add network calls.
- Do not add normal 2D UI.
- Do not change station reveal/return, monitor return, movement focus, pointer lock, range shooting, sim roaming, FPV body, Tab view, hero wall, hidden unlock, or normal recovery.
- Do not implement V3-30.

#### Completed Implementation

- Added lightweight screen glow panels behind each jukebox screen in `Level1RoomShell.tsx`.
- Added subtle cabinet accent pulse driven by existing read-only `jukeboxDisplay?.isPlaying` and `jukeboxDisplay?.progress`.
- Added animated speaker grille bars while music is playing.
- Kept all animation ref-based through `useFrame`; no React state is updated per frame.
- Preserved V3-28 control behavior exactly: only `toggle-playback`, `shuffle`, and `retry` remain registered, while planned controls remain visual-only and unregistered.
- Added no SoundCloud behavior changes, new actions, sync/reducer/session state, network calls, imported assets, heavy particles, audio analysis, or normal 2D UI changes.
- `npm.cmd run build` passed with the existing large chunk warning.

### [x] Phase V3-30: Manual Test And Recovery Pass

#### Summary

Create a final Vision 3 manual verification and recovery checklist for the completed V3-1 through V3-29 feature set.

This phase should make it easy to verify that the hidden Level 1 world works end to end while the normal 2D Sync Sesh app remains the stable recovery base. This is documentation/manual-test focused. No source changes are planned.

#### Implementation Spec

- Add a consolidated `Vision 3 Final Manual Test And Recovery Pass` section to `docs/3d/manual-test-checklist.md`.
- Keep the existing phase-specific checklist sections intact.
- The new section should act as the final end-to-end smoke pass across the full hidden 3D experience.
- Organize checks in a practical order:
  - normal 2D baseline
  - secret unlock
  - station reveal and return
  - movement and views
  - expanded Control Room
  - range access and shooting
  - presence and sim roaming
  - jukebox
  - exit/recovery/fallback
- Do not add new app behavior, test harnesses, source instrumentation, or visible UI.
- If implementation discovers a recovery issue that appears tiny and in scope, report it separately before touching source.

Runtime behavior changes:

- Runtime behavior: none.
- Normal 2D UI: unchanged.
- Hidden unlock behavior: unchanged.
- 3D controls/interactions: unchanged.
- Sync/reducer/session state: unchanged.
- SoundCloud/jukebox behavior: unchanged.

Documentation changes:

- Add final manual checks for:
  - no visible 3D affordance or normal 2D level selector
  - typing `syncsesh` opens the hidden shell
  - joined users reveal from assigned computer stations
  - unjoined fallback reveal starts from a temporary local-only station
  - first click focuses movement and does not return to dashboard
  - `E` on local station monitor returns to 2D dashboard
  - other monitors do not return to dashboard
  - Control Room wall monitors render correctly without obvious overlap/z-fighting
  - hero wall session/status panel still cycles only through existing behavior
  - range opening is walk-through
  - range challenge/shooting still works
  - Tab toggles top-down and back to FPV
  - FPV body visibility remains scoped correctly
  - real free-roam presence still displays when available
  - idle sim bots roam when enabled
  - `?simRoam=0` disables sim roaming locally
  - jukebox renders standby/player data
  - jukebox glow/pulse polish appears when playing
  - jukebox `E` controls work only for toggle, shuffle, and retry
  - planned jukebox controls remain visual-only
  - Exit closes the shell and normal app remains usable
  - WebGL fallback panel exits cleanly
  - re-entering with `syncsesh` still works after Exit
  - default 2D dashboard remains stable and recoverable

#### Checklist Items Achieved

- [x] Preserve the normal timer app as the stable base.
- [x] Preserve WebGL fallback, Exit, and recovery behavior.

#### Acceptance Criteria

- `docs/3d/manual-test-checklist.md` has one clear final Vision 3 pass section.
- The checklist covers:
  - unlock
  - Control Room spawn
  - wall monitors
  - user computer station reveal/return
  - range opening
  - range challenge
  - top-down view
  - free-roam presence
  - sim roaming
  - jukebox standby/playing/actions
  - Exit
  - WebGL fallback
  - normal app recovery
  - no normal 2D level selector
- The checklist distinguishes action-backed jukebox controls from planned visual-only controls.
- The checklist verifies that normal 2D UI remains free of visible 3D/world/level affordances.
- No source code is changed.
- No build is required if the implementation remains docs-only.
- If source code is touched due to an approved tiny recovery fix, `npm.cmd run build` must pass.

#### Build And Manual Checks

Docs-only expected path:

- No build required.

If an approved source fix is added:

- `npm.cmd run build`

Manual verification target:

- `npm run dev`
- Open `http://localhost:5173/`.
- Run the final Vision 3 checklist in `docs/3d/manual-test-checklist.md`.

#### Risks

- The checklist may become long because Vision 3 now spans many systems; keep it grouped and scannable.
- Manual checks may reveal visual tuning issues, especially around monitor readability, prop clutter, jukebox glow, or sim pathing.
- WebGL fallback is environment-dependent and may need browser/device support to test properly.
- Multi-client free-roam presence requires WebSocket mode; mock mode is insufficient for true shared-client verification.
- SoundCloud widget behavior can depend on network/provider state, so jukebox checks should include safe standby/error observations.

#### Wishlist Mapping

- Preserve the normal timer app as the stable base.
- Preserve WebGL fallback, Exit, and recovery behavior.
- Keep the hidden world secret with no normal 2D affordance.
- Verify the user starts from their own computer station fantasy.
- Verify the expanded Level 1 Control Room, range, sim roaming, FPV body, and jukebox all coexist.
- Confirm the 3D world remains recoverable and optional.

#### Non-Goals

- Do not implement new source behavior.
- Do not add automated tests.
- Do not add a visible level selector.
- Do not add visible normal-app 3D controls, buttons, hints, menus, or settings.
- Do not change hidden unlock code.
- Do not change station reveal/return behavior.
- Do not change movement, pointer lock, Tab view, range shooting, FPV body, sim roaming, or free-roam presence.
- Do not change SoundCloud playback, jukebox actions, jukebox config, or 3D jukebox rendering.
- Do not add sync/reducer/session/network state.
- Do not mark unrelated Vision 3 phases complete or edit unrelated phase sections.

#### Completed Implementation

- Added a consolidated `Vision 3 Final Manual Test And Recovery Pass` section to `docs/3d/manual-test-checklist.md`.
- Covered normal 2D baseline, hidden unlock/re-entry, station reveal/return, movement/views/body, expanded Control Room, range opening/challenge, presence/sim roaming, jukebox standby/playing/actions, Exit, WebGL fallback, and normal app recovery.
- Included checks that the normal 2D UI has no visible 3D affordance, world selector, level selector, range selector, or debug control.
- Distinguished action-backed jukebox controls from planned visual-only controls.
- Kept existing phase-specific manual checklist sections intact.
- No source code changed; no build was required for this docs-only phase.

### [x] Phase V3-31: Station Reveal Fallback Hardening

#### Summary

Make the hidden-world reveal always start from a computer station when station config exists, instead of silently falling back to the big wall monitor.

Joined users must reliably reveal from their assigned computer. Unjoined users must get a deterministic temporary local-only station assignment for camera/reveal and local monitor targeting only, without joining the session or changing lobby membership.

#### Implementation Spec

- Use one consistent station-resolution source for reveal and room rendering, or pass the resolved local station id/source from `ThreeDModeShell` into `Level1RoomShell`, so the reveal station and local monitor-return station cannot drift.
- Add a local station resolution model with source values equivalent to `joined`, `temporary`, and `emergency`.
- Resolve the local station deterministically:
  1. Build joined-user `stationAssignments` sorted by `joinedAt`, then `id`.
  2. If the local user is in that list, use that assigned station and mark source as `joined`.
  3. Otherwise choose the first station whose id is not used by a joined assignment and mark source as `temporary`.
  4. If every station is occupied, use `levelConfig.stations[0]` as a visual-only temporary fallback and mark source as `temporary`.
  5. If no stations exist, use the existing emergency/default reveal rig and mark source as `emergency`.
- Use the resolved station in `ThreeDModeShell` for the reveal rig.
- Keep the existing emergency/default reveal rig only for the no-stations case, not as the normal unjoined path.
- Pass enough data into `Level1RoomShell` so the temporary fallback station can be treated as local for monitor return/visual targeting only.
- Keep joined-user station assignments unchanged for assigned users and seated occupants.
- Do not create an assigned user, session membership, ready/idle/spectator count change, or seated occupant marker for the unjoined temporary fallback.
- Preserve the hidden nature of the unlock.
- Preserve normal 2D app recovery.
- Update `docs/3d/manual-test-checklist.md` with V3-31 manual checks during implementation.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Make the unjoined-user fallback clear so the reveal does not silently fall back to the big wall monitor.
- [x] Start the hidden-world reveal from the local user's assigned computer when the user is joined.
- [x] Keep the local monitor return tied to the same station used for reveal.

#### Completed Implementation

- Added deterministic local station resolution in `ThreeDModeShell`.
- Passed the resolved local station id/source into `Level1RoomShell` so reveal and monitor-return targeting share the same station decision.
- Kept unjoined fallback visual/local only, without creating a fake user, session membership, ready/idle/spectator count change, or seated occupant marker.
- Added V3-31 manual checks to `docs/3d/manual-test-checklist.md`.
- Verified `npm.cmd run build` passes with the existing Vite chunk warning.

#### Acceptance Criteria

- Joined user types `syncsesh` and reveal starts from their assigned computer monitor.
- Joined user's monitor-return target matches the same station used for reveal.
- Joined user does not reveal from the big wall monitor when station config exists.
- Unjoined user types `syncsesh` and reveal starts from the first unused desk computer.
- If all stations are occupied, unjoined reveal starts from `levelConfig.stations[0]`.
- Unjoined temporary fallback station is clickable as the local monitor-return target after controls are active.
- Unjoined reveal does not create an assigned user, session membership, ready/idle/spectator count change, or seated occupant marker.
- If no station config exists, the existing emergency/default reveal still works.
- The normal 2D dashboard remains unchanged.
- Exit/re-enter recovery still works.
- `npm.cmd run build` passes.

#### Risks

- If all stations are occupied, the temporary fallback can visually overlap a joined user's station.
- If station resolution is recomputed differently in future components, reveal/return drift could return; this phase prevents current drift by passing the resolved station data from `ThreeDModeShell`.
- If later phases add more station ownership concepts, this temporary visual-only station source must remain separate from session membership.

#### Wishlist Mapping

- Makes the unjoined-user fallback clear so the reveal does not silently fall back to the big wall monitor.
- Preserves joined users revealing from their assigned computer.
- Keeps the local monitor return tied to the same station used for reveal.
- Preserves hidden unlock behavior.
- Preserves normal 2D app recovery.
- Keeps station computers as the entry fantasy for the hidden world.

#### Non-Goals

- Do not implement V3-32 monitor return hardening beyond preserving local monitor targeting for the resolved station.
- Do not change first-click focus behavior.
- Do not change pointer lock or WASD controls.
- Do not polish the first-person body.
- Do not add sim roaming.
- Do not alter real session membership.
- Do not auto-join unjoined users.
- Do not create a fake `SessionUser`.
- Do not create a seated occupant marker for the unjoined temporary fallback.
- Do not add visible 2D controls or settings.
- Do not redesign station monitor UI.
- Do not change range shooting behavior.

### [x] Phase V3-32: Station Return Interaction Hardening

#### Summary

Make the station monitor return interaction intentional and predictable.

The first post-reveal click must only focus movement/pointer controls. The local monitor should return to the 2D dashboard only after controls are active and the user intentionally aims at the local monitor and activates it. WASD, pointer lock, range shooting, and local monitor return must coexist.

#### Implementation Spec

- Preserve the V3-31 resolved local station id/source as the authority for which monitor can return to the dashboard.
- Keep interactions disabled while `controlState === "idle"`.
- Keep first click behavior in `FirstPersonMovementController` as the focus/pointer-lock path.
- Make local monitor return intentional `E` / `clickable` activation only.
- In `ComputerStation`, register the local dashboard monitor with `modes: ["clickable"]`, not `shootable`.
- Keep `enabled: isLocalStation`, so only the resolved local monitor can return.
- Keep `AimInteractionController` enabled only through `areInteractionsEnabled`, which requires renderer ready, reveal complete, not top-down, and `controlState !== "idle"`.
- Preserve primary-click as the shootable/range shooting input.
- Do not add visible UI prompts beyond existing focus hint/reticle behavior.
- Update `manual-test-checklist.md`.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Avoid accidental monitor return on the first click used to focus movement.
- [x] Keep monitor return from interfering with shooting-range pointer interactions.
- [x] Manual-test the full station reveal, movement focus, monitor return, and re-entry loop.

#### Completed Implementation

- Changed station dashboard monitor interaction registration to `clickable` only.
- Preserved `enabled: isLocalStation`, so only the V3-31 resolved local monitor can return to the 2D dashboard.
- Kept primary-click reserved for `shootable` targets, preventing the local monitor from stealing range shooting clicks.
- Added V3-32 manual checks to `docs/3d/manual-test-checklist.md`.
- Verified `npm.cmd run build` passes with the existing Vite chunk warning.

#### Acceptance Criteria

- First click after reveal focuses the 3D view and does not return to the dashboard.
- WASD works after focus.
- Pointer lock works where supported.
- Drag-look fallback still works where pointer lock is unavailable or rejected.
- Pressing `E` while aiming at the local resolved monitor returns to the 2D dashboard.
- Primary-clicking the local monitor does not return to the dashboard.
- Other monitors do not return to the dashboard.
- Range target primary-click shooting still works.
- Pressing Tab disables reticle/interactions while top-down is active.
- Exiting and re-entering the hidden world still works.
- `npm.cmd run build` passes.

#### Risks

- Removing `shootable` from the monitor means users must use `E` for monitor return; this is more intentional but less immediately discoverable.
- If the interaction registry keeps stale active hits for one frame during state transitions, manual checks should verify no return occurs on the first focus click.
- If future phases add click-to-use monitors, they must preserve the distinction between focus click, clickable activation, and shootable activation.

#### Wishlist Mapping

- Avoid accidental monitor return on the first click used to focus movement.
- Keep monitor return from interfering with shooting-range pointer interactions.
- Manual-test the full station reveal, movement focus, monitor return, and re-entry loop.
- Preserve the V3-31 resolved local station behavior.
- Preserve hidden unlock behavior and normal 2D dashboard recovery.

#### Non-Goals

- Do not implement V3-33 body polish.
- Do not add sim roaming.
- Do not change station assignment or fallback resolution from V3-31.
- Do not redesign monitor visuals or dashboard textures.
- Do not add visible 2D UI controls, buttons, or hints.
- Do not change range scoring, targets, or challenge logic.
- Do not change pointer-lock architecture beyond what is necessary for monitor-return hardening.
- Do not add synced state or reducer events.

### [x] Phase V3-33: First-Person Body Polish Pass

#### Summary

Polish the local first-person body so it adds presence in FPV without blocking the center view, hiding important controls, or clipping badly through nearby desks/monitors.

The body remains local-only and cosmetic. It must be visible only during normal first-person play after reveal completion and control focus, and hidden during reveal, top-down view, return-to-dashboard animation, WebGL fallback/error/loading states, and any non-FPV state.

#### Implementation Spec

- Keep the existing camera-attached `FirstPersonBody` component in `ThreeDModeShell`.
- Do not create new avatar files, avatar configs, synced avatar state, or customization.
- Keep the body attached to the camera with `camera.add(bodyRef.current)`.
- Tighten the enable expression at the call site so the body renders only when:
  - `status === "ready"`
  - `revealState === "complete"`
  - `!isTopDownViewActive`
  - `controlState !== "idle"`
- Keep the body hidden until controls are focused so it does not clutter the entry/focus moment.
- Tune the body rig so it sits lower and farther back in camera space.
- Keep torso, legs, and feet visible when looking down.
- Keep arms and hands peripheral and below the center reticle.
- Reduce idle bob so it does not feel like view shake or a floating prop.
- Use existing procedural geometry only.
- Update `manual-test-checklist.md` with FPV body checks.
- Run `npm.cmd run build`.

#### Checklist Items Achieved

- [x] Render a simple body for the local user in first-person view.
- [x] Keep the room readable in first-person and top-down view.

#### Completed Implementation

- Hid the FPV body until controls are focused with `controlState !== "idle"`.
- Kept the body hidden during reveal, top-down view, return animation, and non-ready renderer states.
- Tuned the camera-attached body lower/farther back and reduced bobbing so it is visible when looking down without blocking the reticle or aim area.
- Added V3-33 manual checks to `docs/3d/manual-test-checklist.md`.
- Verified `npm.cmd run build` passes with the existing Vite chunk warning.

#### Acceptance Criteria

- Body is visible when looking down in focused FPV.
- Body is not visible before first focus click after reveal.
- Body does not obstruct the reticle, center aim point, monitor return targeting, or range shooting aim.
- Body does not dominate the screen during normal forward movement.
- Body hides during reveal.
- Body hides during top-down view.
- Body hides during return-to-dashboard animation.
- Body hides during WebGL loading, unsupported, or error/fallback states.
- WASD movement still works after focus.
- Pointer lock and drag-look fallback still work.
- Local monitor `E` return from V3-32 still works.
- Range primary-click shooting still works.
- `npm.cmd run build` passes.

#### Risks

- Camera-attached geometry can feel unnatural if too large or too close.
- Hiding the body until `controlState !== "idle"` delays the first glimpse until after focus, but it avoids visual clutter during the entry/focus moment.
- Future avatar work may replace this rig, so keep it simple and avoid new abstractions.
- Body placement may look different across FOVs or browser sizes, so manual checks matter.

#### Wishlist Mapping

- Render a simple body for the local user in first-person view.
- Keep the room readable in first-person and top-down view.
- Preserve the station reveal, movement focus, monitor return, and range shooting flows.
- Keep FPV presence cosmetic and local-only.

#### Non-Goals

- Do not implement sim roaming.
- Do not add remote avatars.
- Do not sync body pose, animation, or movement state.
- Do not add avatar customization.
- Do not add new packages or assets.
- Do not change WASD, pointer lock, Tab top-down, or range shooting behavior.
- Do not change station assignment, reveal fallback, or monitor return logic from V3-31/V3-32.
- Do not expand Control Room architecture.
- Do not refactor `FirstPersonBody` into a separate file unless required by TypeScript/build constraints.

### [x] Phase V3-34: Movement Controller Audit

#### Summary

Audit the current 3D movement/controller structure before changing movement feel.

This phase documents how first-person movement, look controls, focus gating, top-down mode, collision checks, free-roam presence reporting, and movement-adjacent rendering currently work so V3-35 through V3-42 can stay narrow and safe.

This phase is audit/documentation only. It should not change runtime movement behavior.

#### Implementation Spec

- Expected implementation file:
  - `docs/3d/3dvision3.md`
- Optional only if useful for manual verification notes:
  - `docs/3d/manual-test-checklist.md`
- Source files to read but not edit:
  - `src/3d/ThreeDModeShell.tsx`
  - `src/3d/levels/types.ts`
  - `src/3d/levels/level1.ts`
  - `src/3d/levels/level2Range.ts`
  - `src/3d/simBotRoaming.ts`
- Expand this V3-34 phase section with a concrete audit of the current movement system during implementation.
- Document the current controller boundaries:
  - `FirstPersonMovementController` owns WASD input, pointer lock request/fallback look, camera pose, movement collision checks, and local pose reporting.
  - `TopDownViewController` owns Tab toggling and temporarily overrides camera pose/FOV.
  - `FirstPersonBody` is cosmetic and enabled only in focused first-person states.
  - `FreeRoamPresenceReporter` sends low-rate pose updates based on `localPlayerPoseRef`.
  - `AimInteractionController` is gated by reveal/top-down/control state and should remain compatible with movement focus.
- Document current movement constants:
  - `WALK_SPEED_UNITS_PER_SECOND = 2.2`
  - `PLAYER_RADIUS = 0.35`
  - `MOUSE_LOOK_SENSITIVITY = 0.0035`
  - `POINTER_LOCK_LOOK_SENSITIVITY = 0.0025`
  - free-roam presence throttles/epsilons
- Document current collision behavior:
  - horizontal X/Z only
  - room bounds clamped by `collisionBounds.room`
  - blockers expanded by `PLAYER_RADIUS`
  - candidate move is accepted only when it does not collide
  - no collision sliding yet
  - no vertical traversal yet
- Document current enable/disable gates:
  - movement only after reveal completion
  - movement disabled in top-down
  - movement ignored while `controlState === "idle"`
  - keys clear on disable/pointer lock release paths
  - Exit/level transitions clear pose/focus/top-down state
- Document movement backlog boundaries:
  - V3-35 should add sprint and named movement constants only.
  - V3-36 should add local velocity/acceleration only.
  - V3-37 should add axis-separated collision sliding only.
  - V3-38 should add slide movement only after sprint and collision sliding exist.
  - V3-39 should add stair/ramp traversal using simple ramp/step-up helpers, not physics.
  - V3-40 should add lightweight area feedback only.
  - V3-41 should design movement-state presence only, keeping sync low-rate.
  - V3-42 should add reduced-motion camera polish only.
- Do not edit source code.
- Do not run build unless source code is unexpectedly changed.

Runtime behavior changes:

- None.

Documentation changes:

- V3-34 gains an audit of:
  - movement input path
  - look/pointer-lock fallback path
  - current collision and room-bound model
  - movement gating state
  - top-down interaction with FPV movement
  - local body visibility dependency
  - free-roam presence update path
  - risks and recommended implementation boundaries for V3-35 through V3-42

#### Checklist Items Achieved

- [x] Audit the current movement controller and collision flow before changing behavior.
- [ ] Enrich first-person movement so walking around the Control Room feels less stiff.
- [ ] Add sprint with Shift.
- [ ] Add configurable movement constants so walk/sprint/slide tuning is not scattered through the controller.
- [ ] Add smooth acceleration and deceleration.
- [ ] Add collision sliding along walls, desks, station blockers, and room bounds.
- [ ] Add slide movement as a quick momentum move after sprinting.
- [ ] Keep slide movement grounded and horizontal; no parkour or physics dependency yet.
- [ ] Support stairs/ramps for the future balcony without making players snag on steps.
- [ ] Preserve Tab top-down behavior while movement features grow.
- [ ] Preserve pointer-lock fallback behavior.
- [ ] Respect reduced-motion preferences for head bob, FOV pulse, and slide camera effects.

#### Completed Audit

Current movement ownership:

- `ThreeDModeShell.tsx` is the movement hub for the hidden world. It currently owns reveal state, first-person focus state, top-down state, current level id, local player pose, free-roam presence reporting, and shell recovery.
- `FirstPersonMovementController` owns keyboard movement input, pointer-lock request/fallback look, camera movement, collision checks, and local pose updates.
- `TopDownViewController` owns Tab toggling, stores the previous first-person camera position, moves the camera to `levelConfig.topDownCamera`, changes FOV to `TOP_DOWN_CAMERA_FOV`, then restores first-person camera position and `NORMAL_CAMERA_FOV`.
- `FirstPersonBody` is cosmetic and camera-attached. It is enabled only when status is ready, reveal is complete, top-down is inactive, and `controlState !== "idle"`.
- `FreeRoamPresenceReporter` reads `localPlayerPoseRef` and sends throttled pose updates with level id, position, and yaw.
- `AimInteractionController` runs separately from movement but is gated by `areInteractionsEnabled`, which requires ready status, completed reveal, first-person view, and non-idle control state.

Current input and focus flow:

- Movement keys are limited to `KeyW`, `KeyA`, `KeyS`, and `KeyD`.
- Movement keydown is ignored while movement is disabled, while `controlState === "idle"`, on repeated keydown, with Ctrl/Meta/Alt held, from interactive DOM targets, or for non-movement keys.
- Keyup removes active movement keys only while enabled and non-idle.
- Window blur clears active movement keys.
- First pointer down on the canvas focuses the canvas, sets control state to `focused`, and attempts pointer lock.
- If pointer lock succeeds, `pointerlockchange` sets control state to `pointer-locked`.
- If pointer lock is unavailable or rejected, control state becomes `pointer-lock-unavailable` and drag-look uses pointer capture.
- Escape exits pointer lock and clears active keys without closing the shell.

Current walk movement:

- Walk speed is `WALK_SPEED_UNITS_PER_SECOND = 2.2`.
- Movement is frame-based in `useFrame`.
- WASD input is converted into `forward` and `strafe`, then rotated by current yaw.
- Diagonal movement is normalized with `Math.hypot(dx, dz)` so diagonals are not faster.
- Camera Y is reset every movement frame to `levelConfig.playerStart.position[1]`.
- Local pose is reported after movement using the resolved camera X/Z, fixed player-start Y, and current yaw.
- There is no sprint state, no acceleration, no velocity memory, no slide state, no crouch, and no jump/fall/grounding model.

Current collision flow:

- `PLAYER_RADIUS = 0.35`.
- `clampToRoom` clamps candidate X/Z against `levelConfig.collisionBounds.room`, expanded inward by `PLAYER_RADIUS`.
- `collidesWithBlocker` checks candidate X/Z against every configured blocker, expanded outward by `PLAYER_RADIUS`.
- The controller first tests the full candidate move.
- If the full candidate collides, the current code already tries an X-only candidate, then a Z-only candidate, before giving up and staying at the current position.
- Collision remains flat-floor X/Z only. Blocker Y values exist in config but are not used by player collision.
- There is no vertical stair/ramp traversal, no height interpolation, no ramp zones, no step-up helper, and no separate ground height function.

Current top-down interaction:

- `TopDownViewController` handles Tab with keydown/keyup listeners while reveal is complete.
- Tab is a toggle, not a hold.
- Top-down opens only while enabled and ignores repeat/Ctrl/Meta/Alt/interactive-target cases.
- Opening top-down stores the current first-person position and moves the camera to `levelConfig.topDownCamera.position`.
- Closing top-down restores the stored first-person position and look target.
- Top-down deactivates reticle/interactions because `areInteractionsEnabled` requires `!isTopDownViewActive`.
- First-person movement is disabled during top-down because `FirstPersonMovementController.enabled` requires `!isTopDownViewActive`.

Current free-roam presence flow:

- `FreeRoamPresenceReporter` is enabled when status is ready and reveal is complete.
- It uses `FREE_ROAM_PRESENCE_INTERVAL_MS = 500`, `FREE_ROAM_POSITION_EPSILON = 0.08`, and `FREE_ROAM_YAW_EPSILON = 0.08`.
- It sends immediately on level change or meaningful pose change, then throttles repeated updates.
- It only sends position and yaw; there is no movement-state vocabulary yet.
- Existing behavior is low-rate pose presence, not high-frequency movement sync.
- Future movement-state presence should extend the low-rate model deliberately instead of publishing every frame.

Current level/collision data notes:

- Level 1 uses an expanded room envelope with `collisionBounds.room.min = [-10, 0, -9]` and `max = [22.5, 4.5, 9]`.
- Level 1 `playerStart.position` is `[0, 1.7, 1.2]`, which is also used as the fixed first-person camera height during movement.
- Level 1 top-down camera is configured separately at `[6.25, 14.5, 0]`.
- Level 2 Range uses its own room envelope, blockers, player start, and top-down camera.
- Sim bot roaming has separate local-only route validation in `simBotRoaming.ts`; it also treats collision as X/Z blocker checks with its own radius. Player movement phases should not accidentally change sim roaming behavior unless explicitly approved.

Movement backlog boundaries:

- V3-35 should only introduce held-Shift sprint and named movement constants. It should keep the current focus gates, top-down gates, room/blocker collision, and local pose reporting intact.
- V3-36 should only introduce local velocity/acceleration/deceleration. It should clear velocity on disable, top-down, reveal/return, pointer-lock release, shell exit, and level transition.
- V3-37 should refine collision resolution into intentional collision sliding. Because the current code already tries X-only then Z-only fallback, V3-37 should audit whether that is sufficient or should be extracted into a reusable resolver with clearer corner behavior.
- V3-38 should add slide only after sprint and collision sliding exist. Slide should be grounded/horizontal, bounded by duration/cooldown constants, and use the same collision resolver as walking/sprinting.
- V3-39 should add stair/ramp traversal as a distinct vertical traversal phase. It should introduce explicit ramp/step-up zones or a simple ground-height helper rather than sneaking height changes into sprint/acceleration.
- V3-40 should add lightweight area feedback without changing movement physics.
- V3-41 should design movement-state presence with low-rate updates only. Candidate states are `idle`, `walking`, `sprinting`, `sliding`, and later `crouching`.
- V3-42 should add optional camera polish only after movement states are stable, and should respect reduced-motion preferences before adding head bob, FOV pulse, or slide dip.

#### Completed Implementation

- Added the current movement/controller audit to this V3-34 section.
- Documented controller ownership, input/focus flow, walk movement, collision flow, top-down behavior, free-roam presence, level config notes, and phase boundaries for V3-35 through V3-42.
- Made no source code changes.
- No build was required because the phase was documentation-only.

#### Acceptance Criteria

- V3-34 documents where walk movement, look movement, collision checks, top-down gating, focus gating, and local pose updates happen.
- V3-34 identifies the current flat-floor limitation and explicitly notes that stair/ramp traversal is not currently supported.
- V3-34 identifies that current collision tests the full candidate first, then tries simple X-only/Z-only fallback, but does not yet have a dedicated reusable collision-sliding resolver with clear corner behavior.
- V3-34 identifies that free-roam presence is already throttled and should not become high-frequency movement sync.
- V3-34 gives clear boundaries for V3-35, V3-36, V3-37, V3-38, V3-39, V3-40, V3-41, and V3-42.
- No source files are edited.
- No movement behavior changes are introduced.
- No build is required for docs-only implementation.

#### Build And Manual Review Notes

Docs-only expected path:

- No build required.

If source code is accidentally or explicitly approved for change:

- `npm.cmd run build`

Manual review:

- Read the updated V3-34 section in `docs/3d/3dvision3.md`.
- Confirm it gives enough implementation boundaries for the movement backlog.

#### Risks

- Movement code may be tightly coupled to reveal/focus behavior, so later phases should stay narrow.
- If the audit skips collision details, sprint/slide phases could accidentally reintroduce stuck or clipping behavior.
- Movement code is centralized in `ThreeDModeShell.tsx`, so later phases may be tempted to combine sprint, acceleration, sliding, and presence changes. V3-34 should explicitly prevent that.
- Sprint and slide can amplify collision bugs if added before collision sliding is understood.
- Smooth acceleration can make current all-or-nothing collision rejection feel sticky until V3-37 lands.
- Stair/ramp traversal conflicts with the current flat X/Z collision model and should not be squeezed into sprint or acceleration phases.
- Free-roam presence already publishes pose on a throttle; movement-state work should avoid turning it into high-frequency sync.
- Pointer-lock fallback, first-click focus, local monitor return, and range shooting all depend on movement/control state gates, so later phases must preserve those gates.

#### Wishlist Mapping

- Audit the current movement controller and collision flow before changing behavior.
- Enrich first-person movement so walking around the Control Room feels less stiff.
- Prepare for sprint with Shift.
- Prepare for configurable walk/sprint/slide constants.
- Prepare for smooth acceleration/deceleration.
- Prepare for collision sliding along walls, desks, station blockers, and room bounds.
- Prepare for slide movement as a short grounded movement flourish.
- Prepare for stairs/ramps without complex physics.
- Preserve pointer-lock fallback and Tab top-down behavior.
- Preserve low-rate movement presence and avoid high-frequency sync.
- Keep future camera polish compatible with reduced-motion preferences.

#### Non-Goals

- Do not implement sprint.
- Do not implement acceleration or deceleration.
- Do not implement collision sliding.
- Do not implement slide movement.
- Do not implement stair/ramp traversal.
- Do not add movement-state presence sync.
- Do not add reduced-motion camera polish.
- Do not change WASD behavior, pointer lock, drag-look fallback, Tab top-down, FPV body, local monitor return, range shooting, sim roaming, free-roam presence, hidden unlock, WebGL fallback, or normal 2D UI.
- Do not add dependencies.
- Do not refactor `ThreeDModeShell.tsx`.
- Do not edit collision config or level geometry.

### [x] Phase V3-35: Sprint Movement

#### Summary

Add a narrow held-Shift sprint modifier to first-person movement so the larger Control Room and connected Level 1 spaces feel easier to traverse, while preserving the current movement gates, collision behavior, camera behavior, interactions, and recovery paths.

#### Implementation Spec

- Expected source file:
  - `src/3d/ThreeDModeShell.tsx`
- Expected docs file during implementation:
  - `docs/3d/3dvision3.md`
- Optional manual checklist file only if implementation wants a sprint check:
  - `docs/3d/manual-test-checklist.md`
- Keep implementation inside `FirstPersonMovementController` in `ThreeDModeShell.tsx`.
- Expand movement input tracking to include held Shift as a sprint modifier.
- Prefer adding a separate sprint key ref instead of folding Shift into `MovementKey`, so WASD remains the only directional movement set.
- Add named constants near the current movement constants:
  - keep `WALK_SPEED_UNITS_PER_SECOND = 2.2`
  - add `SPRINT_SPEED_UNITS_PER_SECOND`, recommended default `4.0`
- In keyboard handling:
  - `ShiftLeft` and `ShiftRight` should set sprint active only when movement is enabled and `controlState !== "idle"`.
  - keyup for `ShiftLeft` or `ShiftRight` should always clear sprint state.
  - disable/blur/cleanup paths should clear sprint state alongside active movement keys.
  - keep current Ctrl/Meta/Alt and interactive-target guards for keydown.
- In `useFrame` movement:
  - choose `movementSpeed = sprintActive ? SPRINT_SPEED_UNITS_PER_SECOND : WALK_SPEED_UNITS_PER_SECOND`.
  - apply the selected speed to the existing horizontal X/Z movement.
  - keep diagonal normalization unchanged.
  - keep camera Y fixed to `levelConfig.playerStart.position[1]`.
  - keep the current full-candidate then X-only/Z-only collision fallback unchanged.
- Update this V3-35 phase section with completed implementation notes after implementation.
- Do not add UI, stamina, acceleration, velocity, FOV effects, camera bob, slide, stair traversal, or sync state.

Runtime behavior changes:

- Holding `ShiftLeft` or `ShiftRight` while W/A/S/D movement is active increases first-person movement speed.
- Releasing Shift returns to normal walking speed immediately.
- Sprint works only when first-person movement already works:
  - after reveal completion
  - outside top-down view
  - after the first click/focus flow has made `controlState !== "idle"`
- Sprint remains grounded and horizontal.
- Sprint uses existing room bounds and blocker collision behavior.
- Sprint does not change free-roam presence shape; remote presence may simply see position changes through the existing throttled pose reporter.
- Sprint does not affect pointer lock, drag-look fallback, monitor return, range shooting, FPV body, hidden unlock, WebGL fallback, or normal 2D UI.

#### Checklist Items Achieved

- [x] Add sprint with Shift.
- [x] Add configurable movement constants so walk/sprint/slide tuning is not scattered through the controller.
- [x] Enrich first-person movement so walking around the Control Room feels less stiff.
- [x] Preserve pointer-lock fallback behavior.
- [x] Preserve Tab top-down behavior while movement features grow.
- [x] Avoid high-frequency movement sync.

#### Completed Implementation

- Added `SPRINT_SPEED_UNITS_PER_SECOND = 4` beside the existing walk speed constant in `ThreeDModeShell.tsx`.
- Added a separate `isSprintActiveRef` in `FirstPersonMovementController`; directional `MovementKey` remains W/A/S/D only.
- Set sprint active from `ShiftLeft`/`ShiftRight` only while movement is enabled and control state is non-idle.
- Cleared sprint on Shift keyup, movement disable, Escape pointer-lock release, blur, listener cleanup, pointer-lock release cleanup, and controller cleanup.
- Applied sprint by selecting walk or sprint speed in the existing `useFrame` movement path.
- Preserved existing horizontal movement, diagonal normalization, room clamp, blocker collision, X-only/Z-only fallback, fixed camera height, local pose reporting, pointer-lock fallback, top-down gating, range shooting, monitor return, free-roam presence, and normal 2D behavior.
- Added no stamina, UI, FOV/head bob/camera effects, acceleration, velocity, slide, stair/ramp traversal, sync/reducer/session state, packages, or level geometry changes.
- `npm.cmd run build` passed with the existing large chunk warning.

#### Acceptance Criteria

- Holding Shift while pressing W/A/S/D moves faster than walking.
- Releasing Shift returns to normal walk speed.
- Shift alone does not move the player.
- Shift does nothing before reveal completion, while `controlState === "idle"`, and while top-down is active.
- Sprint respects existing collision blockers and room bounds.
- Sprint does not alter the current collision resolver or level collision config.
- Pointer lock, drag-look fallback, first-click focus, local monitor return with E, range shooting, FPV body visibility, Tab top-down, hidden unlock, and normal 2D recovery still work.
- No stamina, UI, FOV effect, head bob, acceleration, slide, stair/ramp traversal, sync/reducer/session state, or new dependency is added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required:

- `npm.cmd run build`

Manual checks:

- Enter the hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Verify W/A/S/D walking still works before holding Shift.
- Hold Shift while moving and verify movement speed increases.
- Release Shift and verify movement returns to walk speed.
- Press Shift alone and verify no movement occurs.
- Press Tab and verify sprint/movement pauses in top-down.
- Press Tab again and verify first-person movement returns.
- Verify sprint cannot move before the first focus click.
- Sprint into room bounds/station blockers and verify collision still holds.
- Verify local monitor return with E still works.
- Verify range shooting still works.
- Verify Exit returns to normal 2D dashboard.

#### Risks

- Higher speed can tunnel through thin blockers if collision checks only test the final candidate position.
- Browser/system shortcuts can make Shift behavior vary, so keep the input handling conservative.
- If Shift state is not cleared on blur/disable, the next movement could unexpectedly sprint.
- Sprint may make existing collision edges feel stickier or expose blocker tuning issues; do not redesign collision in this phase.
- Faster motion may make the expanded room easier to traverse but could feel too fast in tight station areas; start with a moderate sprint speed.
- Because free-roam presence is throttled, sprinting may make remote marker movement appear less smooth, but this phase should not change presence sync.

#### Wishlist Mapping

- Add sprint with Shift.
- Add configurable movement constants so walk/sprint/slide tuning is not scattered through the controller.
- Enrich first-person movement so walking around the Control Room feels less stiff.
- Preserve pointer-lock fallback behavior.
- Preserve Tab top-down behavior while movement features grow.
- Avoid high-frequency movement sync.
- Keep movement grounded and horizontal before later slide/stair phases.

#### Non-Goals

- Do not implement acceleration or deceleration.
- Do not implement collision sliding or refactor the collision resolver.
- Do not implement slide movement.
- Do not implement stair/ramp traversal.
- Do not add stamina, sprint UI, cooldowns, sound, FOV effects, head bob, speed lines, camera dip, crouch, jump, physics, or gamepad support.
- Do not add movement-state presence sync.
- Do not change free-roam presence schema or reducer/session state.
- Do not change hidden unlock, reveal, return animation, local monitor return, range shooting, jukebox, sim roaming, FPV body, WebGL fallback, or normal 2D app behavior.
- Do not add packages.
- Do not edit level geometry or collision config.

### [x] Phase V3-36: Smooth Movement Acceleration

#### Summary

Replace instant first-person start/stop movement with small local acceleration and deceleration so walking and sprinting feel smoother, while preserving the current walk/sprint max speeds, existing collision behavior, focus/reveal/top-down gates, and all non-movement systems.

#### Implementation Spec

- Expected source file:
  - `src/3d/ThreeDModeShell.tsx`
- Expected docs file during implementation:
  - `docs/3d/3dvision3.md`
- Optional manual checklist file only if implementation wants a movement-smoothing check:
  - `docs/3d/manual-test-checklist.md`
- Keep the implementation inside `FirstPersonMovementController`.
- Add a local velocity ref, for example `movementVelocityRef`, storing horizontal X/Z velocity or direction-scaled velocity:
  - recommended shape: `{ x: number; z: number }`
  - initialized to `{ x: 0, z: 0 }`
- Add named constants near movement constants:
  - `MOVEMENT_ACCELERATION_UNITS_PER_SECOND = 12`
  - `MOVEMENT_DECELERATION_UNITS_PER_SECOND = 16`
  - keep `WALK_SPEED_UNITS_PER_SECOND = 2.2`
  - keep `SPRINT_SPEED_UNITS_PER_SECOND = 4`
- Add a tiny helper if useful:
  - `moveTowards(current, target, maxDelta)`
  - or inline equivalent in `useFrame`
- In `useFrame`:
  - derive intended normalized movement direction from W/A/S/D exactly as today.
  - choose current max speed from sprint state exactly as V3-35 does.
  - set target velocity to normalized direction multiplied by walk/sprint max speed when input exists.
  - accelerate current velocity toward target velocity while movement keys are held.
  - decelerate current velocity toward zero when no directional input is held.
  - move camera using the smoothed velocity and existing `delta`.
  - keep existing clamp/collision path unchanged: full candidate first, then X-only, then Z-only fallback.
  - if collision blocks all movement, clear or damp blocked velocity enough to prevent drifting into the blocker.
- Adjust the current early return:
  - do not return merely because `activeKeysRef.current.size === 0`; deceleration needs frames after key release.
  - still return and clear velocity when movement is disabled or `controlState === "idle"`.
  - if no keys are pressed and velocity reaches zero, return after ensuring no unnecessary pose update.
- Clear velocity whenever movement is disabled or control context resets:
  - `enabled` becomes false
  - `controlState` becomes `idle`
  - Escape pointer-lock release path
  - blur
  - keyboard listener cleanup
  - pointer-lock release cleanup
  - controller cleanup
  - top-down opens indirectly through `enabled=false`
  - reveal/return/exit/level transitions indirectly through `enabled=false` or `controlState=idle`
- Preserve local pose reporting only when camera position/look are actually applied.
- Do not change collision config, free-roam presence schema, range interactions, monitor return, or top-down behavior.

Runtime behavior changes:

- W/A/S/D movement ramps up quickly instead of instantly jumping to max speed.
- Releasing W/A/S/D decelerates to a stop instead of stopping instantly.
- Holding Shift still uses V3-35 sprint max speed, but sprint speed is reached through the same acceleration curve.
- Releasing Shift while moving reduces target max speed back to walk speed through the same smoothing path.
- Movement should not drift meaningfully after keys are released.
- Switching to top-down, losing focus, reveal/return state changes, pointer lock release cleanup, or shell cleanup clears velocity to prevent carryover.
- Collision still uses the current room clamp, blocker checks, and full-candidate/X-only/Z-only fallback.

#### Checklist Items Achieved

- [x] Add smooth acceleration and deceleration.
- [x] Keep camera polish comfortable and compatible with reduced-motion preferences.
- [x] Enrich first-person movement so walking around the Control Room feels less stiff.
- [x] Preserve Tab top-down behavior while movement features grow.
- [x] Preserve pointer-lock fallback behavior.
- [x] Avoid high-frequency movement sync.

#### Completed Implementation

- Added named movement smoothing constants next to the existing walk/sprint speeds:
  - `MOVEMENT_ACCELERATION_UNITS_PER_SECOND = 12`
  - `MOVEMENT_DECELERATION_UNITS_PER_SECOND = 16`
  - `MOVEMENT_STOP_EPSILON = 0.01`
- Added a local `movementVelocityRef` inside `FirstPersonMovementController` for horizontal X/Z velocity.
- Added `moveTowards` for small deterministic velocity smoothing without new packages or physics.
- Updated the movement frame loop so W/A/S/D input accelerates toward the current walk/sprint target speed and released input decelerates toward rest.
- Preserved the V3-35 sprint max speed and Shift behavior; sprint now reaches max speed through the same smoothing path.
- Preserved the existing room clamp, blocker checks, and full-candidate/X-only/Z-only collision fallback.
- Dampened blocked velocity components when X-only or Z-only fallback is used, and cleared velocity when all fallback movement is blocked.
- Cleared velocity on movement disable, idle control state, Escape pointer-lock release, blur, keyboard listener cleanup, pointer-lock release cleanup, and controller cleanup.
- Kept local pose reporting tied to the existing camera update path.
- Did not add head bob, FOV effects, slide, stair/ramp traversal, movement-state sync, UI, packages, avatar animation, or collision config changes.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

#### Acceptance Criteria

- Movement starts smoothly and reaches current walk speed without feeling delayed.
- Sprint starts smoothly and reaches `SPRINT_SPEED_UNITS_PER_SECOND` while Shift is held.
- Releasing movement keys decelerates to a stop without long drifting.
- Releasing Shift while still holding W/A/S/D settles back to walk speed.
- Switching to top-down clears movement and prevents camera drift.
- Returning from top-down does not preserve stale velocity.
- Reveal/return/Exit/level changes do not preserve stale velocity.
- Pointer-lock release and window blur clear active velocity.
- Existing collision behavior remains authoritative; the player cannot slide through walls, station blockers, range blockers, or room bounds.
- No head bob, FOV pulse, slide, stair/ramp traversal, movement-state sync, UI, package, or avatar animation is added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required:

- `npm.cmd run build`

Manual checks:

- Enter hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Click to focus movement.
- Press W/A/S/D and verify movement accelerates smoothly.
- Release W/A/S/D and verify movement decelerates to a stop without long drift.
- Hold Shift while moving and verify sprint still reaches faster speed.
- Release Shift while still moving and verify speed settles back to walking.
- Press Tab while moving and verify top-down opens with no continued FPV drift.
- Press Tab again and verify first-person resumes from rest.
- Press Escape during movement and verify pointer lock releases and movement stops.
- Move into room bounds/station blockers and verify existing collision still holds.
- Verify local monitor return with E still works.
- Verify range shooting still works.
- Verify Exit returns to normal 2D dashboard.

#### Risks

- Velocity can accidentally persist across camera modes if disable cleanup is incomplete.
- Deceleration can feel like unwanted drift if tuned too low.
- Acceleration can feel sluggish if tuned too low, especially in the larger Control Room.
- Smooth movement can make collision rejection feel sticky until collision sliding is added.
- If blocked velocity is not damped, the camera may keep trying to push into blockers.
- Free-roam presence may report extra small pose changes during deceleration, but the existing throttling and epsilon should remain unchanged.

#### Wishlist Mapping

- Add smooth acceleration and deceleration.
- Enrich first-person movement so walking around the Control Room feels less stiff.
- Preserve current walk/sprint tuning from V3-35.
- Preserve Tab top-down behavior while movement features grow.
- Preserve pointer-lock fallback behavior.
- Avoid high-frequency movement sync.
- Keep camera polish comfortable and compatible with future reduced-motion work.

#### Non-Goals

- Do not implement collision sliding or refactor the collision resolver.
- Do not implement slide movement.
- Do not implement stair/ramp traversal.
- Do not add head bob, FOV pulse, speed lines, camera dip, reduced-motion camera polish, or any camera effect.
- Do not add stamina, UI, cooldowns, crouch, jump, gamepad support, physics, or packages.
- Do not add movement-state presence sync.
- Do not change free-roam presence schema, reducer, session state, or sync cadence.
- Do not change hidden unlock, reveal, return animation, local monitor return, range shooting, jukebox, sim roaming, FPV body, WebGL fallback, or normal 2D app behavior.
- Do not edit level geometry or collision config.

### [x] Phase V3-37: Collision Sliding

#### Summary

Formalize the current movement collision behavior into a small intentional resolver so first-person walking/sprinting with V3-36 smoothed velocity slides cleanly along walls, station blockers, desks, range blockers, and room bounds when one axis is blocked.

This phase should make the existing full-candidate plus X-only/Z-only fallback easier to reason about, more consistent at shallow blocker edges, and safer at corners, without redesigning level geometry or changing the player collision radius.

#### Implementation Spec

- Expected source file:
  - `src/3d/ThreeDModeShell.tsx`
- Expected docs file during implementation:
  - `docs/3d/3dvision3.md`
- Optional manual checklist file only if implementation wants a tiny movement-sliding check:
  - `docs/3d/manual-test-checklist.md`
- Do not edit level config files in this phase:
  - `src/3d/levels/level1.ts`
  - `src/3d/levels/level2Range.ts`
  - `src/3d/levels/types.ts`
- Add a small local movement collision resolver near the existing `clampToRoom` and `collidesWithBlocker` helpers in `ThreeDModeShell.tsx`.
- Recommended helper shape:
  - input: current horizontal position, next horizontal position, current horizontal velocity, and `levelConfig`
  - output: resolved horizontal position, resolved horizontal velocity, and collision result string such as `none`, `slide-x`, `slide-z`, or `blocked`
- Resolver behavior:
  - clamp the full next candidate with `clampToRoom`.
  - if the full candidate does not collide, return it with unchanged velocity and `collision: "none"`.
  - if full movement collides, test an X-only candidate using `x = next.x` and `z = current.z`, clamped through `clampToRoom`.
  - test a Z-only candidate using `x = current.x` and `z = next.z`, clamped through `clampToRoom`.
  - choose a valid slide candidate when exactly one axis is clear.
  - if both axis candidates are valid, choose the axis with the larger intended absolute movement delta for a more natural corner slide.
  - when sliding on X, zero or damp Z velocity.
  - when sliding on Z, zero or damp X velocity.
  - when neither axis is valid, stay at the current position and clear horizontal velocity.
- Preserve `PLAYER_RADIUS`, `clampToRoom`, and `collidesWithBlocker` behavior exactly.
- Update `FirstPersonMovementController` to call the resolver instead of inlining collision resolution in `useFrame`.
- Keep V3-36 smoothed velocity and V3-35 sprint speed behavior intact.
- Do not redesign collision geometry in this phase.
- Run `npm.cmd run build`.

Runtime behavior changes:

- Diagonal movement into a wall/blocker should intentionally slide along the clear axis instead of feeling like an accidental fallback.
- Shallow approaches to station rows, desks, room bounds, and range blockers should feel less sticky.
- V3-36 smoothed velocity remains active, but blocked velocity is cleaned up through the resolver result.
- Corner behavior becomes deterministic:
  - full movement first.
  - then clear axis candidates.
  - if both axes are possible, prefer the stronger intended movement axis.
  - if neither is possible, stop.
- Room bounds remain authoritative through `clampToRoom`.
- Blockers remain authoritative through `collidesWithBlocker`.
- No collision geometry changes.

#### Checklist Items Achieved

- [x] Add collision sliding along walls, desks, station blockers, and room bounds.
- [x] Prevent slide from clipping through blockers, desks, walls, or station rows.
- [x] Keep V3-36 smooth acceleration and deceleration compatible with collision sliding.
- [x] Preserve walk/sprint movement while making blocker contact less frustrating.

#### Completed Implementation

- Added local `HorizontalVector` and `CollisionResolutionKind` types in `ThreeDModeShell.tsx`.
- Added `resolveHorizontalMovementCollision` beside the existing `clampToRoom` and `collidesWithBlocker` helpers.
- Kept `PLAYER_RADIUS`, `clampToRoom`, and `collidesWithBlocker` behavior unchanged and authoritative.
- Moved the existing full-candidate, X-only, and Z-only movement fallback out of the frame loop into the resolver.
- Preserved full-candidate priority when the full move is valid.
- Added deterministic corner handling when both X-only and Z-only slide candidates are valid by choosing the axis with the larger intended movement delta.
- Preserved V3-36 velocity smoothing while returning cleaned-up velocity from the resolver:
  - slide on X clears Z velocity.
  - slide on Z clears X velocity.
  - fully blocked movement clears horizontal velocity.
- Updated `FirstPersonMovementController` to apply the resolver result to camera position and local pose reporting.
- Did not edit level config, collision geometry, `PLAYER_RADIUS`, movement gates, sync state, UI, camera effects, or packages.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

#### Acceptance Criteria

- Walking diagonally into a wall slides along the wall if the side path is clear.
- Sprinting diagonally into a blocker slides only along valid open space and does not clip through.
- V3-36 acceleration/deceleration still works after the resolver extraction.
- Releasing movement keys still decelerates cleanly.
- Shift sprint still reaches `SPRINT_SPEED_UNITS_PER_SECOND`.
- Player cannot pass through room bounds, station blockers, east wall blockers, connector blockers, range wall/backstop/divider blockers, or other existing blockers.
- Corner contact is deterministic and does not jitter between axes frame-to-frame under normal movement.
- Full movement still wins when the full candidate is valid.
- `PLAYER_RADIUS = 0.35` remains unchanged.
- No level config, collision config, blocker geometry, or room dimensions are changed.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required:

- `npm.cmd run build`

Manual checks:

- Enter hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Click to focus movement.
- Walk diagonally into Control Room walls and verify sliding along the wall.
- Sprint diagonally into station-row blockers and verify no clipping.
- Walk around desk/station edges and verify reduced sticking.
- Move through the Control Room to Shooting Range opening and verify the opening remains walk-through.
- Walk into range blockers/backstop/dividers and verify they still block.
- Test corner contact near wall/blocker intersections and verify no obvious jitter or tunneling.
- Press Tab while moving and verify top-down still clears movement drift.
- Verify local monitor return with `E` still works.
- Verify range shooting still works.
- Verify Exit returns to the normal 2D dashboard.

#### Risks

- Axis choice at corners can feel odd if both axes are valid but the chosen axis differs from player expectation.
- With V3-36 velocity smoothing, repeated collision frames can still feel a little sticky until V3-38 slide movement or later movement tuning.
- Extracting the resolver could accidentally change current behavior if full-candidate priority is not preserved.
- Room-bound clamping plus blocker sliding may reveal existing blocker geometry rough spots, but this phase should not redesign geometry.
- If blocked velocity is not zeroed on the correct axis, the player may keep pushing into blockers.

#### Wishlist Mapping

- Add collision sliding along walls, desks, station blockers, and room bounds.
- Prevent movement from clipping through blockers, desks, walls, station rows, or range geometry.
- Make Control Room navigation feel less stiff after V3-36 smoothing.
- Preserve walk/sprint movement while making blocker contact less frustrating.
- Keep the movement backlog incremental before V3-38 slide movement and V3-39 stair/ramp traversal.

#### Non-Goals

- Do not add new collision geometry.
- Do not edit Level 1 or Level 2 config.
- Do not change `PLAYER_RADIUS`.
- Do not redesign blockers, desks, station rows, range dividers, room bounds, or openings.
- Do not add a physics engine.
- Do not add stairs, ramps, vertical movement, jumping, crouching, or gravity.
- Do not implement V3-38 slide movement.
- Do not change V3-36 acceleration/deceleration constants unless required for a type/build issue.
- Do not add UI, stamina, camera effects, head bob, FOV effects, or avatar animation.
- Do not change sync/reducer/session state, free-roam presence shape, or network behavior.
- Do not change hidden unlock, reveal/return, monitor return, range shooting, FPV body, top-down behavior, jukebox, sim roaming, WebGL fallback, or normal 2D app behavior.

### [x] Phase V3-38: Slide Movement

#### Summary

Add a short grounded, horizontal slide flourish to first-person movement after sprinting, using the V3-37 `resolveHorizontalMovementCollision` resolver so the slide respects existing room bounds and blockers without adding physics, clipping, UI, or sync state.

#### Implementation Spec

- Expected source file:
  - `src/3d/ThreeDModeShell.tsx`
- Expected docs file during implementation:
  - `docs/3d/3dvision3.md`
- No expected changes to:
  - level config files
  - collision geometry
  - reducer/session/sync files
  - normal 2D UI files
  - packages
- Use `KeyC` as the default slide trigger instead of Control.
- Reason for `KeyC`: Control while holding movement keys can become browser/system shortcuts like `Ctrl+W`, `Ctrl+A`, or `Ctrl+D`. `KeyC` is safer in browser, still familiar as a crouch/slide-style action, and does not collide with current 3D controls.
- Add local slide state inside `FirstPersonMovementController`:
  - `slideRequestRef`
  - `slideStateRef`
  - `lastSprintMomentumAtMsRef`
  - `lastMovementDirectionRef`
  - optional `slideCooldownUntilMsRef`
- Add named constants near movement constants:
  - `SLIDE_TRIGGER_CODE = "KeyC"`
  - `SLIDE_DURATION_MS = 420`
  - `SLIDE_COOLDOWN_MS = 900`
  - `SLIDE_SPEED_UNITS_PER_SECOND = 5.2`
  - `SLIDE_END_SPEED_UNITS_PER_SECOND = WALK_SPEED_UNITS_PER_SECOND`
  - `SLIDE_MOMENTUM_WINDOW_MS = 650`
- Recommended slide state:
  - `{ isSliding: boolean; startedAtMs: number; direction: HorizontalVector }`
- Trigger behavior:
  - on `keydown` for `KeyC`, if movement is enabled, control state is non-idle, event is not repeat, and target is not interactive, call `preventDefault()` and set `slideRequestRef.current = true`.
  - do not start the slide directly inside the keyboard handler.
  - start or reject the slide inside `useFrame`, where clock time and current movement direction are available.
- Momentum behavior:
  - track `lastMovementDirectionRef` whenever current W/A/S/D input produces a normalized direction.
  - track `lastSprintMomentumAtMsRef` while sprint is active and there is movement input, or while the current smoothed velocity is meaningfully sprint-like.
  - allow slide only when movement is enabled, `controlState !== "idle"`, not already sliding, cooldown has expired, a valid movement direction exists, and recent sprint momentum exists within `SLIDE_MOMENTUM_WINDOW_MS`.
- Slide movement:
  - keep the slide grounded and horizontal only.
  - during active slide, use slide direction and slide speed instead of normal W/A/S/D target velocity.
  - ease slide speed down from `SLIDE_SPEED_UNITS_PER_SECOND` toward `SLIDE_END_SPEED_UNITS_PER_SECOND` over `SLIDE_DURATION_MS`.
  - use V3-37 `resolveHorizontalMovementCollision` for the slide candidate.
  - if resolver returns `blocked`, cancel slide and clear horizontal velocity.
  - if resolver returns `slide-x` or `slide-z`, keep the resolver-cleaned velocity and let the slide continue only if meaningful velocity remains.
  - when slide duration ends, leave `movementVelocityRef` at the resolver-cleaned velocity so V3-36 deceleration/normal movement can take over smoothly.
- Clear slide state alongside existing movement cleanup paths:
  - `enabled` becomes false.
  - `controlState` becomes `idle`.
  - Escape pointer-lock release.
  - blur.
  - keyboard listener cleanup.
  - pointer-lock release cleanup.
  - controller cleanup.
  - top-down/reveal/return/exit/level transitions via existing gates.
- Do not add crouch, jumping, parkour, stamina, animation syncing, UI, camera effects, sync/reducer/session state, packages, or level config changes.
- Run `npm.cmd run build`.

Runtime behavior changes:

- While sprinting or shortly after sprinting, pressing `C` starts a short slide.
- Slide moves in the latest movement direction, not arbitrary camera direction when no movement momentum exists.
- Slide cannot start before reveal completion, before focus, in top-down view, while returning to dashboard, while disabled, or from idle control state.
- Slide respects all existing collision bounds and blockers through V3-37.
- Slide has a cooldown to prevent rapid spam.
- No visible UI, stamina, meter, prompt, camera bob, FOV pulse, or sync state is added.
- Normal W/A/S/D and Shift sprint continue to work before and after slide.

#### Checklist Items Achieved

- [x] Add slide movement as a quick momentum move after sprinting.
- [x] Keep slide movement grounded and horizontal; no parkour or physics dependency yet.
- [x] Prevent slide from clipping through blockers, desks, walls, or station rows.
- [x] Use the V3-37 collision resolver as the foundation for movement flourishes.
- [x] Preserve normal first-person controls before and after slide.

#### Completed Implementation

- Added `SlideState` as local first-person movement state in `ThreeDModeShell.tsx`.
- Added the approved slide constants near the movement constants:
  - `SLIDE_TRIGGER_CODE = "KeyC"`
  - `SLIDE_DURATION_MS = 420`
  - `SLIDE_COOLDOWN_MS = 900`
  - `SLIDE_SPEED_UNITS_PER_SECOND = 5.2`
  - `SLIDE_END_SPEED_UNITS_PER_SECOND = WALK_SPEED_UNITS_PER_SECOND`
  - `SLIDE_MOMENTUM_WINDOW_MS = 650`
- Added local refs for slide request, active slide state, recent sprint momentum, latest movement direction, and slide cooldown.
- Wired `KeyC` as the slide request key while movement is enabled, controls are non-idle, the event is not repeated, and the target is not interactive.
- Kept slide startup inside `useFrame`, where current movement direction, clock time, sprint momentum, and cooldown can be checked together.
- Tracked recent sprint momentum from Shift sprint input and from meaningful sprint-like smoothed velocity.
- Added grounded horizontal slide movement that eases from `5.2` units/second toward walk speed over the slide duration.
- Routed slide movement through V3-37 `resolveHorizontalMovementCollision`.
- Cancelled slide on full block, very low resolved velocity, or duration completion.
- Updated slide direction from resolver-cleaned velocity during axis-slide collisions.
- Cleared slide state on movement disable, idle control state, Escape pointer-lock release, blur, keyboard cleanup, pointer-lock cleanup, and controller cleanup.
- Did not add crouch, jump, parkour, stamina, UI, camera effects, sync/reducer/session state, packages, level config changes, or `PLAYER_RADIUS` changes.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

#### Acceptance Criteria

- Pressing `C` while sprinting starts a short slide.
- Pressing `C` shortly after sprinting can still slide within the momentum window.
- Pressing `C` without recent sprint/move momentum does nothing.
- Slide is horizontal and grounded.
- Slide uses V3-37 collision resolution and cannot clip through room bounds, station blockers, east wall blockers, connector blockers, range blockers, desks, or station rows.
- Slide cancels cleanly if fully blocked.
- Slide does not trigger while top-down is active, before reveal/focus enables movement, during return animation, or after Exit.
- Slide cooldown prevents repeated spam.
- After slide ends, regular V3-36 acceleration/deceleration resumes smoothly.
- Shift sprint, WASD, pointer lock fallback, monitor return, range shooting, FPV body, free-roam presence shape, hidden unlock, and normal 2D app behavior remain unchanged.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required:

- `npm.cmd run build`

Manual checks:

- Enter hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Click to focus movement.
- Hold Shift + W, press `C`, and verify a short forward slide.
- Sprint diagonally and press `C`, then verify slide follows the movement direction.
- Release sprint and press `C` quickly, then verify the momentum window still allows slide.
- Wait past the momentum window and press `C`, then verify no slide.
- Press `C` repeatedly and verify cooldown prevents spam.
- Slide into walls/station blockers/range blockers and verify no clipping.
- Press Tab during or near slide and verify top-down clears slide movement.
- Press Escape during or near slide and verify movement stops.
- Verify local monitor return with `E` still works.
- Verify range shooting still works.
- Verify Exit returns to normal 2D dashboard.

#### Risks

- Slide can make a small room feel too fast if duration/speed are too high.
- Slide may feel too subtle if duration/speed are too low.
- Reusing V3-36 velocity means slide exit feel depends on velocity cleanup being precise.
- Collision contact during slide may still feel sticky around rough blocker corners.
- `KeyC` may conflict with future crouch, but this phase explicitly does not add crouch.

#### Wishlist Mapping

- Add slide movement as a quick momentum move after sprinting.
- Keep slide grounded and horizontal.
- Prevent slide movement from clipping through blockers, desks, walls, or station rows.
- Use the V3-37 collision resolver as the foundation for future movement flourishes.
- Keep the movement backlog incremental before stair/ramp traversal and movement feedback phases.

#### Non-Goals

- Do not use Control as the default slide trigger.
- Do not add crouch, jump, parkour, stamina, physics, gravity, or vertical movement.
- Do not add head bob, FOV pulse, camera dip, speed lines, or other camera effects.
- Do not add reduced-motion systems in this phase.
- Do not add UI, prompts, meters, cooldown indicators, or normal-app controls.
- Do not add animation syncing or avatar animation.
- Do not add sync/reducer/session state or network traffic.
- Do not change free-roam presence shape or cadence.
- Do not change level geometry, blockers, room bounds, station layout, range layout, or `PLAYER_RADIUS`.
- Do not change hidden unlock, reveal/return, monitor return, range shooting, FPV body, top-down behavior, jukebox, sim roaming, WebGL fallback, or normal 2D app behavior.

### [x] Phase V3-39: Stair And Ramp Traversal

#### Summary

Make the decorative Level 1 balcony/stairs walkable with a simple deterministic traversal-surface system, without adding physics, gravity, jumping, falling, or redesigning the Control Room.

The player should be able to move from the Control Room floor up the left/right stair runs onto the balcony platform, then back down, while preserving V3-35 sprint, V3-36 velocity smoothing, V3-37 collision resolution, and V3-38 slide movement.

#### Implementation Spec

- Expected source files:
  - `src/3d/levels/types.ts`
  - `src/3d/levels/level1.ts`
  - `src/3d/ThreeDModeShell.tsx`
- Expected docs file during implementation:
  - `docs/3d/3dvision3.md`
- No expected changes to:
  - `src/3d/Level1RoomShell.tsx`
  - `src/3d/levels/level2Range.ts`
  - sync/reducer/session files
  - normal 2D UI files
  - package files
- Add a small typed traversal-surface config to the level model. This should be data-only and explicit, not inferred from render meshes.
- Add type support in `src/3d/levels/types.ts`:
  - `TraversalSurfaceKind = "platform" | "ramp"`
  - `TraversalRampAxis = "x" | "z"`
  - `TraversalRampLowEdge = "minX" | "maxX" | "minZ" | "maxZ"`
  - `LevelTraversalSurfaceConfig`
- Extend `LevelConfig` with optional `traversalSurfaces?: LevelTraversalSurfaceConfig[]`.
- Add Level 1 traversal entries in `src/3d/levels/level1.ts`, matching the existing render-only balcony/stair geometry:
  - `control-room-balcony-platform`
    - `kind: "platform"`
    - `areaId: "control-room"`
    - `bounds.min: [-8.6, 0, -8.3]`
    - `bounds.max: [8.6, 0.32, -6.2]`
    - `floorHeight: 0.32`
  - `control-room-left-stair-ramp`
    - `kind: "ramp"`
    - `areaId: "control-room"`
    - `bounds.min: [-8.125, 0, -6.45]`
    - `bounds.max: [-6.275, 0.32, -5.4]`
    - `floorHeight: 0.32`
    - `ramp.axis: "z"`
    - `ramp.lowEdge: "maxZ"`
    - `ramp.lowFloorHeight: 0`
    - `ramp.highFloorHeight: 0.32`
  - `control-room-right-stair-ramp`
    - `kind: "ramp"`
    - `areaId: "control-room"`
    - `bounds.min: [6.275, 0, -6.45]`
    - `bounds.max: [8.125, 0.32, -5.4]`
    - `floorHeight: 0.32`
    - `ramp.axis: "z"`
    - `ramp.lowEdge: "maxZ"`
    - `ramp.lowFloorHeight: 0`
    - `ramp.highFloorHeight: 0.32`
- Add traversal helpers in `src/3d/ThreeDModeShell.tsx` near movement helpers:
  - `getTraversalFloorHeight(x, z, levelConfig)`
- Helper rules:
  - check only `levelConfig.traversalSurfaces ?? []`.
  - match by X/Z bounds only.
  - for `platform`, return `floorHeight`.
  - for `ramp`, interpolate floor height along the configured axis from low edge to high edge.
  - if multiple surfaces match, return the highest computed floor height.
  - clamp interpolation progress to `0..1`.
  - keep all movement grounded: camera Y = base eye height plus computed floor height.
- Update `FirstPersonMovementController`:
  - replace fixed camera Y usage from `levelConfig.playerStart.position[1]` with `levelConfig.playerStart.position[1] + getTraversalFloorHeight(resolved.position.x, resolved.position.z, levelConfig)`.
  - use that same computed Y for `camera.position.set`, `camera.lookAt` source position, and `onLocalPoseChange.position`.
  - keep X/Z movement and collision using V3-37 exactly as-is.
  - keep V3-38 slide using the same resolver and then apply traversal height after X/Z resolution.
- Top-down restore should preserve the camera Y it saved before entering top-down; no special top-down traversal logic needed.
- Reveal/return can keep their existing station-driven camera paths; this phase only affects free movement after reveal.
- Do not add jumping, falling, gravity, crouch, parkour, new props, UI, sync/reducer/session changes, packages, or large geometry redesign.
- Run `npm.cmd run build`.

Runtime behavior changes:

- Walking onto the left or right stair footprint smoothly raises the first-person camera from floor height to balcony height.
- Walking off the stairs or balcony lowers the first-person camera back to normal floor height.
- Sprint and slide can cross traversal zones, but remain horizontal in X/Z and grounded by the computed surface height.
- Movement collision remains flat X/Z through existing room bounds and blockers.
- No new collisions are added for balcony rails or platform edges in this phase.
- No new visual geometry is added.
- No jumping, falling, gravity, crouch, or physics behavior is added.
- Normal 2D UI and hidden unlock behavior remain unchanged.

#### Checklist Items Achieved

- [x] Support stairs/ramps for the future balcony without making players snag on steps.
- [x] Add simple stair/ramp support for the Control Room balcony.
- [x] Keep stair handling simple through ramps or step-up helpers rather than real physics.
- [x] Preserve sprint, smooth movement, collision sliding, and slide movement while expanding traversal.

#### Completed Implementation

- Added typed traversal-surface support in `src/3d/levels/types.ts`:
  - `TraversalSurfaceKind`
  - `TraversalRampAxis`
  - `TraversalRampLowEdge`
  - `LevelTraversalSurfaceConfig`
  - optional `LevelConfig.traversalSurfaces`
- Added explicit Level 1 traversal surface data in `src/3d/levels/level1.ts`:
  - `control-room-balcony-platform`
  - `control-room-left-stair-ramp`
  - `control-room-right-stair-ramp`
- Added `getTraversalFloorHeight(x, z, levelConfig)` in `src/3d/ThreeDModeShell.tsx`.
- The helper checks `levelConfig.traversalSurfaces ?? []`, matches X/Z bounds, returns platform height directly, interpolates ramp height along the configured axis, and uses the highest matching surface height.
- Updated `FirstPersonMovementController` to compute camera Y after V3-37 X/Z movement resolution.
- Applied the same computed Y to `camera.position.set`, the look source position, and local pose reporting.
- Preserved V3-35 sprint, V3-36 smoothing, V3-37 collision resolution, V3-38 slide movement, top-down restore, monitor return, range shooting, hidden unlock, normal 2D app behavior, and existing collision geometry.
- Did not edit render geometry, add physics, add blockers, add UI/camera effects, change `PLAYER_RADIUS`, or touch sync/reducer/session/package files.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

#### Acceptance Criteria

- Player can walk up the left stair run onto the balcony.
- Player can walk up the right stair run onto the balcony.
- Player can walk down either stair run back to the floor.
- Camera height changes smoothly enough to avoid obvious snapping or jitter.
- Walking/sprinting on normal floor outside traversal zones keeps the existing camera height.
- V3-35 sprint still works on floor and traversal zones.
- V3-36 acceleration/deceleration still works on floor and traversal zones.
- V3-37 collision resolver still prevents clipping through existing blockers and room bounds.
- V3-38 slide still works and remains grounded through traversal zones.
- Tab top-down can be entered/exited while on the balcony without losing the first-person height when returning.
- Monitor return, range shooting, FPV body, free-roam presence shape, hidden unlock, and normal 2D recovery remain unchanged.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required:

- `npm.cmd run build`

Manual checks:

- Enter hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Click to focus movement.
- Walk to the left stair at roughly `x=-7.2`, `z=-5.4..-6.45`.
- Walk up onto the balcony and verify camera height rises.
- Walk back down and verify camera height returns to normal.
- Repeat on the right stair at roughly `x=7.2`, `z=-5.4..-6.45`.
- Sprint across the stairs/platform and verify no jitter.
- Slide near/on a stair zone and verify no clipping or vertical weirdness.
- Press Tab while on the balcony, then return to FPV and verify height/position feel stable.
- Verify range access still works.
- Verify local monitor return with `E` still works.
- Verify range shooting still works.
- Verify Exit returns to the normal 2D dashboard.

#### Risks

- Since traversal is based on explicit zones, the walkable height may not perfectly match the rendered stair mesh.
- The existing balcony rails are visual-only, so this phase does not prevent walking through every balcony rail/edge unless existing X/Z blockers already do.
- Sudden transitions at platform/ramp boundaries can feel like a small snap if the zone bounds are too tight.
- Slide movement across ramp boundaries may need later tuning if it feels too fast or abrupt.
- Free-roam presence will include elevated Y positions, which should be okay because the shape already stores a full `Vec3`, but remote rendering may need future polish.

#### Wishlist Mapping

- Support stairs/ramps for the future balcony without making players snag on steps.
- Add simple stair/ramp support for the Control Room balcony.
- Keep stair handling simple through traversal zones rather than real physics.
- Preserve sprint, smooth movement, collision sliding, and slide movement while expanding traversal.
- Keep movement improvements incremental before area feedback and movement presence design.

#### Non-Goals

- Do not redesign the Control Room.
- Do not edit decorative balcony/stair render geometry.
- Do not add new props, rails, walls, or visual markers.
- Do not add a physics engine.
- Do not add gravity, jumping, falling, crouch, parkour, mantling, or step physics.
- Do not add new collision blockers unless a tiny type/build issue makes it unavoidable; default is no new blockers.
- Do not change `PLAYER_RADIUS`.
- Do not change V3-35 sprint constants.
- Do not change V3-36 acceleration/deceleration constants.
- Do not change V3-37 collision resolver behavior except to consume the resolved X/Z position.
- Do not change V3-38 slide trigger, duration, cooldown, or speed constants.
- Do not add UI, prompts, labels, camera effects, head bob, FOV effects, or reduced-motion systems.
- Do not add sync/reducer/session state or packages.
- Do not change hidden unlock, reveal/return, monitor return, range shooting, FPV body, top-down behavior, jukebox, sim roaming, WebGL fallback, or normal 2D app behavior.

### [x] Phase V3-40: Area Movement Feedback

#### Summary

Add subtle local-only feedback when the player moves between major Level 1 areas, currently `Control Room` and `Shooting Range`, using existing `levelConfig.areas` and local player position.

The feedback should help the connected world feel organized without changing movement physics, collisions, sync state, normal 2D UI, or adding a visible level selector.

#### Implementation Spec

- Expected source files:
  - `src/3d/ThreeDModeShell.tsx`
  - `src/styles/global.css`
- Expected docs file during implementation:
  - `docs/3d/3dvision3.md`
- No expected changes to:
  - `src/3d/levels/types.ts`
  - `src/3d/levels/level1.ts`
  - `src/3d/Level1RoomShell.tsx`
  - sync/reducer/session files
  - package files
- Add a small local area detection helper in `src/3d/ThreeDModeShell.tsx`:
  - `getAreaForPosition(position, levelConfig)`
- Helper rules:
  - use `levelConfig.areas ?? []`.
  - only consider `status === "active"` areas.
  - match by full X/Y/Z bounds if possible, but tolerate traversal height by using position Y as stored.
  - if no area matches by Y because future traversal height gets slightly weird, matching by X/Z bounds is acceptable as fallback.
  - if multiple areas match, prefer the first in config order.
  - return a minimal `{ id, label, kind }` shape or the `LevelAreaConfig` itself if simpler.
- Add local React state in `ThreeDModeShell`:
  - `currentAreaId`
  - `areaFeedback`
  - optional `areaFeedbackKey` or timestamp to retrigger CSS animation
- Update `updateLocalPlayerPose`:
  - continue updating `localPlayerPoseRef.current`.
  - derive area from the new pose and current `levelConfig`.
  - when the resolved area id changes, update `currentAreaId`, set feedback text from `area.label`, and show feedback only after the 3D shell is ready/reveal-complete enough to avoid firing during bootstrap/reveal paths.
- Feedback UI:
  - add a small non-interactive overlay element inside `.three-d-shell-overlay`, near upper-left or lower-left.
  - recommended class: `.three-d-area-feedback`.
  - primary text: area label, e.g. `Control Room`, `Shooting Range`.
  - optional tiny secondary text: `Level 1`.
  - use `aria-live="polite"` only if it does not become noisy; otherwise keep it visual-only with `aria-hidden`.
  - use `pointer-events: none`.
  - auto-hide with CSS animation or state timeout after roughly `1800ms`.
  - keep it subtle and below critical controls/reticle: no modal, no big banner, no normal 2D UI affordance.
- Prefer React state plus a timeout over data attributes alone, because the user should see brief “entered area” feedback when crossing the boundary.
- Do not add in-world 3D labels in this phase; the existing room is already visually dense.
- Run `npm.cmd run build`.

Runtime behavior changes:

- When the local player first enters/occupies `Control Room`, a subtle local overlay can briefly show `Control Room`.
- When the local player crosses into `Shooting Range`, the overlay briefly shows `Shooting Range`.
- Returning to `Control Room` can show `Control Room` again.
- Feedback is local-only and never sent to sync/session state.
- Feedback does not block clicking, shooting, movement focus, monitor return, Tab, Escape, or Exit.
- No normal 2D level selector, area selector, range selector, or debug control is added.
- Movement stack remains unchanged: sprint, smoothing, collision sliding, slide, and traversal surfaces are untouched.

#### Checklist Items Achieved

- [x] Add lightweight room/area feedback while moving through connected spaces.
- [x] Keep first-person and top-down views readable after the room expands.
- [x] Keep the connected Level 1 layout understandable without adding visible normal-app controls.
- [x] Preserve the hidden-world feel while helping users understand where they are.

#### Completed Implementation

- Added local area detection in `src/3d/ThreeDModeShell.tsx` using existing active `levelConfig.areas`.
- Added ref-backed area transition tracking so React state only updates when the resolved area id changes.
- Added a hidden-shell-only `.three-d-area-feedback` overlay in `src/styles/global.css` with `pointer-events: none` and an auto-hide animation.
- Gated feedback to ready/reveal-complete hidden-world state and clears it during return/level-change/reveal recovery paths.
- Preserved movement physics, collision, sync/session state, range shooting, monitor return, top-down view, hidden unlock, and normal 2D UI behavior.

#### Deferred / Not Included

- No in-world 3D labels were added.
- No movement physics, collision bounds, area config, level geometry, sync/reducer/session state, packages, sounds, or particle effects were changed.
- No normal-app level selector, area selector, debug UI, or visible navigation control was added.

#### Acceptance Criteria

- Moving from Control Room into Shooting Range produces a brief area label or equivalent feedback.
- Moving from Shooting Range back into Control Room produces a brief area label.
- Feedback does not appear in the normal 2D app.
- Feedback is visible only while the hidden 3D shell is active.
- Feedback is local-only and does not write reducer/session/sync state.
- Feedback does not block shooting, monitor return, or movement focus.
- Feedback does not block pointer lock, WASD, Shift sprint, `C` slide, Tab top-down, monitor return with `E`, range shooting, or Exit.
- Area detection uses existing `levelConfig.areas`.
- No level selector or visible normal-app 3D navigation is added.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required:

- `npm.cmd run build`

Manual checks:

- Enter hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Click to focus movement.
- Move around the Control Room and confirm feedback is subtle/non-blocking.
- Walk through the range opening into Shooting Range and verify `Shooting Range` feedback appears briefly.
- Walk back to Control Room and verify `Control Room` feedback appears briefly.
- Press Tab while feedback is visible and verify top-down still works.
- Use monitor return with `E` and verify it still works.
- Use range shooting and verify click/reticle behavior is unchanged.
- Exit to normal 2D dashboard and verify no area feedback remains.

#### Risks

- If area bounds overlap or leave a small gap near the doorway, feedback may flicker or miss a crossing.
- Overlay text could become clutter if it appears too often; use only on area id change.
- If reveal initialization sets local pose inside an area, feedback might appear too early unless gated by ready/reveal complete.
- The Shooting Range doorway area may briefly count as neither area if bounds do not cover the connector perfectly.

#### Wishlist Mapping

- Add lightweight room/area feedback while moving through connected spaces.
- Keep first-person and top-down views readable after the room expands.
- Make the connected Level 1 layout feel organized without adding visible normal-app controls.
- Preserve hidden-world feel while helping users understand where they are.

#### Non-Goals

- Do not change movement physics.
- Do not change V3-35 sprint, V3-36 smoothing, V3-37 collision resolver, V3-38 slide, or V3-39 traversal surfaces.
- Do not add collision blockers, area blockers, or level geometry.
- Do not edit `levelConfig.areas` unless a tiny type/build issue requires it.
- Do not add sync/reducer/session state.
- Do not change free-roam presence shape or cadence.
- Do not add sounds, heavy effects, particles, or in-world labels.
- Do not add a normal 2D level selector, area selector, range selector, menu, button, or debug UI.
- Do not change monitor return, range shooting, FPV body, top-down behavior, hidden unlock, jukebox, sim roaming, WebGL fallback, or normal 2D app behavior.

### [x] Phase V3-41: Movement State Presence Design

#### Summary

Design how movement states should be represented for local users, remote users, and sim bots without introducing high-frequency sync or avatar animation work.

This is a design-only phase. It defines the future contract that local movement, free-roam presence, remote markers, and sim bot roaming can follow later.

#### Implementation Spec

Expected docs file during this design phase:

- `docs/3d/3dvision3.md`

No source files should be edited during V3-41.

Likely future implementation files after this design is approved:

- `src/types/session.ts`
  - Add an optional movement-state presence type/field.
- `src/lib/lobby/sessionState.ts`
  - Sanitize optional movement-state presence if it becomes synced.
- `src/3d/ThreeDModeShell.tsx`
  - Derive local movement state from the existing movement controller and pass it to the low-rate reporter.
- `src/3d/FreeRoamPresenceMarker.tsx`
  - Render minimal remote marker differences for movement state.
- `src/3d/simBotRoaming.ts`
  - Map existing sim route states into the shared movement vocabulary.
- `src/3d/SimBotRoamingMarker.tsx`
  - Optionally render local sim marker differences for movement state.

Shared movement vocabulary:

```ts
type MovementState = "idle" | "walking" | "sprinting" | "sliding" | "crouching";
```

State meanings:

- `idle`
  - Actor is present but not intentionally moving.
  - Includes no movement input, stopped/decelerated local player, and paused sim bot route points.
- `walking`
  - Actor is moving at normal locomotion speed.
  - Includes WASD movement without sprint/slide and sim bot route movement.
- `sprinting`
  - Local player is intentionally sprinting with Shift while moving and not sliding.
- `sliding`
  - Local player is in the active slide burst.
- `crouching`
  - Reserved vocabulary only.
  - Do not emit, sync, render, or simulate until a crouch movement phase exists.

Local derivation contract:

- Local player movement state should be derived inside `FirstPersonMovementController`, near the existing movement loop where sprint, slide, input, velocity, and resolved collisions are already known.
- Derivation precedence:
  - `sliding` if `slideStateRef.current` is active.
  - `sprinting` if sprint is active and there is meaningful movement input or horizontal velocity.
  - `walking` if there is meaningful movement input or horizontal velocity.
  - `idle` otherwise.
- Use the existing horizontal velocity and `MOVEMENT_STOP_EPSILON`-style threshold, not camera yaw-only changes.
- Top-down view, reveal, return animation, unsupported/error state, and unfocused idle control state should not imply `walking`, `sprinting`, or `sliding`.

Presence contract:

- Future synced presence may add `movementState?: MovementState` to `FreeRoamPresenceUpdate` and `FreeRoamPresenceState`.
- The field must be optional for backward compatibility with existing mock/ws snapshots.
- First implementation sync candidates:
  - `idle`
  - `walking`
  - `sprinting`
  - `sliding`
- `crouching` remains local/reserved until crouch exists.
- The free-roam reporter must keep the current low-rate cadence.
- A movement-state change can count as a meaningful presence change, but it must still respect the existing presence throttle except for level changes.
- Presence remains best-effort and stale entries continue to fall back to station markers.

Remote marker visual contract:

- First pass should stay simple and readable:
  - `idle`: current marker posture/label, steady base ring.
  - `walking`: subtle forward-facing indicator or slightly brighter base ring.
  - `sprinting`: stronger accent ring or small forward chevron.
  - `sliding`: lower/longer marker pose or distinct ground streak if cheap and readable.
  - missing/unknown state: treat as `idle` or current default.
- Labels may include the movement state only if it stays readable.
- Do not add skeletal animation or continuous animation requirements in this phase.

Sim bot mapping:

- Existing `SimRoamingState = "moving" | "paused"` maps to shared movement states:
  - `moving` -> `walking`
  - `paused` -> `idle`
- Sim bots should not use `sprinting`, `sliding`, or `crouching` until a later sim-specific phase explicitly adds those behaviors.
- Sim bot movement state stays local-only and should not affect real free-roam presence.

Runtime behavior changes:

- None in this phase.
- No source behavior changes.
- No build output changes.
- No sync schema changes.
- No marker visual changes.

Future runtime contract:

- Local player movement can be classified as `idle`, `walking`, `sprinting`, or `sliding`.
- Remote free-roam presence can optionally carry movement state later without changing sync cadence.
- Sim bots can reuse `idle`/`walking` naming by mapping current `paused`/`moving` route states.
- Missing movement state remains valid and falls back gracefully.

#### Checklist Items Achieved

- [x] Track local movement state as `idle`, `walking`, `sprinting`, `sliding`, or `crouching` when needed.
- [x] Let remote markers eventually show basic movement state without syncing every frame.
- [x] Let sim bots reuse the same broad movement-state vocabulary.
- [x] Keep movement-state sync low-rate and optional.

#### Completed Implementation

- Finalized the design-only movement-state contract in this V3-41 section.
- Defined the shared `MovementState` vocabulary and state meanings.
- Defined local derivation precedence for future implementation in `FirstPersonMovementController`.
- Defined the future optional `movementState?: MovementState` free-roam presence shape while preserving low-rate sync.
- Defined first-pass remote marker visual expectations and graceful fallback for missing/unknown movement state.
- Mapped existing sim bot route states to shared movement states without adding sim sync traffic.
- Listed likely future source files for implementation phases.
- Did not edit source code, package files, sync/reducer behavior, marker rendering, movement behavior, or build-affecting files.

#### Acceptance Criteria

- The spec names the movement states and their meanings.
- The spec states derivation precedence for local movement.
- The spec states which states are local-only/reserved versus candidates for low-rate presence.
- The spec specifies `movementState?: MovementState` as the future optional free-roam presence shape.
- The spec preserves current low-rate free-roam presence behavior and explicitly rejects per-frame sync.
- The spec maps existing sim bot `moving`/`paused` states to the shared movement vocabulary.
- The spec defines minimal first-pass remote marker visuals.
- The spec lists source files likely touched by later implementation phases.
- No code files are edited.
- Existing dirty work is preserved.

#### Build And Manual Review Notes

For this docs-only implementation phase:

- No build required because only `docs/3d/3dvision3.md` is edited.

If this V3-41 doc section is edited:

- `npm.cmd run build`

Manual review after doc edit:

- Confirm `docs/3d/3dvision3.md` V3-41 is still marked design-only.
- Confirm the doc does not mark checklist items as implemented unless the doc update is considered the completed design artifact.
- Confirm no source files changed with `git status --short`.

Future implementation command if code changes land later:

- `npm.cmd run build`

#### Risks

- Adding movement state to presence can look harmless but accidentally increase network traffic if state changes are sent outside the existing throttle.
- `idle` can be ambiguous during smooth deceleration; the contract should use a velocity threshold so a coasting player remains `walking` briefly.
- `sprinting` could flicker if derived only from Shift instead of actual movement plus velocity.
- `sliding` needs precedence over sprint/walk so markers do not misrepresent the active slide burst.
- Remote visuals can get noisy if labels update too often or if visual differences are too subtle.
- Optional sync fields must be sanitized carefully so older clients and snapshots continue to work.
- Sim bots already have local route state; forcing them into real sync would violate the local-only sim roaming goal.

#### Wishlist Mapping

- Reflect basic movement states in presence/avatars without high-frequency sync.
- Track local movement state as `idle`, `walking`, `sprinting`, `sliding`, or later `crouching`.
- Let remote markers eventually show basic movement state without syncing every frame.
- Let sim bots reuse the same broad movement-state vocabulary.
- Keep movement-state sync low-rate and optional.
- Preserve existing free-roam presence and station fallback behavior.

#### Non-Goals

- Do not implement source changes in V3-41.
- Do not add movement-state sync yet.
- Do not change free-roam presence cadence.
- Do not publish movement every frame.
- Do not add avatar animation, skeletal rigs, cosmetics, customization, or new marker models.
- Do not add crouch behavior.
- Do not change sprint, slide, acceleration, collision sliding, stair/ramp traversal, area feedback, top-down view, pointer lock, reveal/return, monitor return, range shooting, sim roaming routes, or normal 2D app behavior.
- Do not add packages or a physics/animation dependency.

### [x] Phase V3-42: Reduced-Motion Camera Polish

#### Summary

Add optional camera-feel polish for first-person movement while respecting users who prefer reduced motion.

This phase should keep effects subtle, avoid unrelated movement rewrites, keep top-down view stable, and leave reveal/return animations comfortable and unchanged.

#### Implementation Spec

Expected source file:

- `src/3d/ThreeDModeShell.tsx`

Expected docs file during implementation:

- `docs/3d/3dvision3.md`

No expected changes to:

- `src/styles/global.css`
- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- `src/3d/levels/*`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/FreeRoamPresenceMarker.tsx`
- `src/3d/simBotRoaming.ts`
- package files

Reduced-motion detection:

- Add a tiny helper in `ThreeDModeShell.tsx`:

```ts
function getPrefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
```

- Use React state so changes are respected while the app is open:
  - `const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);`
- Add an effect in `ThreeDModeShell` that subscribes to `matchMedia("(prefers-reduced-motion: reduce)")`.
- Support modern `addEventListener("change", ...)`; fallback to `addListener` only if needed for compatibility.
- Pass `prefersReducedMotion` into `FirstPersonMovementController`.

Recommended constants near existing camera/movement constants:

```ts
const WALK_HEAD_BOB_AMPLITUDE = 0.018;
const WALK_HEAD_BOB_FREQUENCY = 7;
const SPRINT_HEAD_BOB_AMPLITUDE = 0.026;
const SPRINT_HEAD_BOB_FREQUENCY = 9;
const SLIDE_CAMERA_DIP = 0.08;
const SPRINT_CAMERA_FOV = 58;
const SLIDE_CAMERA_FOV = 59;
const CAMERA_FOV_LERP_SPEED = 8;
```

Tuning intent:

- Normal FOV is currently `56`.
- Sprint FOV should only rise to about `58`.
- Slide FOV should only rise to about `59`.
- Camera bob should stay below roughly `0.03` world units.
- Slide dip should stay below roughly `0.1` world units.

Inside `FirstPersonMovementController`:

- Add a `prefersReducedMotion` prop.
- Use existing movement loop data:
  - `hasMovementInput`
  - `isSprintActiveRef.current`
  - `activeSlide`
  - `nextVelocity`
  - `resolvedY`
  - `clock.getElapsedTime()`
- Compute local camera polish only when:
  - movement is enabled.
  - control state is not `idle`.
  - top-down is not active, because the controller is already disabled in top-down.
  - `prefersReducedMotion` is false.
- Apply polish only to the camera Y used for rendering:
  - `cameraY = resolvedY + headBob - slideDip`
- Keep `onLocalPoseChange.position[1]` as the unpolished `resolvedY`.
  - Presence should not sync bob/dip.
  - Area detection should not see bob/dip.
  - Traversal height remains stable.
- Keep collision, movement velocity, slide mechanics, sprint mechanics, and `getTraversalFloorHeight` untouched.

FOV handling:

- In normal FPV movement, target FOV should be:
  - `NORMAL_CAMERA_FOV` when idle/walking.
  - `SPRINT_CAMERA_FOV` while sprinting with meaningful velocity.
  - `SLIDE_CAMERA_FOV` while sliding.
- Smoothly interpolate current camera FOV toward target with delta-based lerp.
- If `prefersReducedMotion` is true, target FOV is always `NORMAL_CAMERA_FOV`.
- If movement is disabled or control state is idle, ease or reset toward `NORMAL_CAMERA_FOV`.
- Do not alter `TOP_DOWN_CAMERA_FOV`; `TopDownViewController` remains authoritative while top-down is active.
- Do not alter reveal/return controller camera paths, durations, or easing.

First-person body:

- Existing `FirstPersonBody` already has a tiny local body bob: `0.006`.
- Leave it unchanged unless it visually conflicts with camera bob during implementation.
- If changed, only pass `prefersReducedMotion` and set body bob to `0` when reduced motion is preferred.
- Do not add new body animation.

Docs:

- Update only this V3-42 section after implementation.
- Mark V3-42 complete only if source implementation lands and `npm.cmd run build` passes.

Runtime behavior changes:

- When `prefers-reduced-motion` is not set:
  - Walking gets a very subtle vertical camera bob.
  - Sprinting gets a slightly faster/somewhat stronger but still subtle bob.
  - Sprinting gets a tiny FOV lift from `56` to about `58`.
  - Sliding gets a small grounded dip and tiny FOV lift to about `59`.
  - All polish is local-only and visual-only.
- When `prefers-reduced-motion: reduce` is set:
  - No new movement camera bob.
  - No new slide dip.
  - No sprint/slide FOV pulse.
  - Movement remains current stable camera behavior.
- Always:
  - Reveal animation is unchanged.
  - Return-to-dashboard animation is unchanged.
  - Top-down view remains fixed at `TOP_DOWN_CAMERA_FOV = 62`.
  - Presence continues to report stable unpolished position/yaw.
  - Movement physics, collision, slide mechanics, sprint speed, acceleration, deceleration, traversal height, range shooting, monitor return, and pointer-lock behavior remain unchanged.

#### Checklist Items Achieved

- [x] Respect reduced-motion preferences for head bob, FOV pulse, and slide camera effects.
- [x] Add subtle head bob only if reduced-motion settings allow it.
- [x] Add a small FOV/speed-line feeling for sprint/slide only if it remains comfortable.
- [x] Keep camera polish comfortable and compatible with reduced-motion preferences.

#### Completed Implementation

- Added local `prefers-reduced-motion` detection in `src/3d/ThreeDModeShell.tsx` with a live media-query listener.
- Added subtle render-only first-person camera bob for walking/sprinting when reduced motion is not preferred.
- Added tiny sprint/slide FOV targets with delta-based smoothing, while preserving `TOP_DOWN_CAMERA_FOV` ownership in `TopDownViewController`.
- Added a small render-only slide dip when reduced motion is not preferred.
- Kept free-roam presence and area detection on the unpolished camera pose so bob/dip is never synced.
- Kept reveal and return camera controllers unchanged.
- Kept movement physics, collision, traversal surfaces, sprint/slide tuning, range shooting, monitor return, sync/reducer/session state, package files, and normal 2D UI unchanged.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

#### Acceptance Criteria

- Walking in FPV has a subtle camera feel improvement when reduced motion is not preferred.
- Sprinting in FPV has a tiny FOV lift and subtle faster bob when reduced motion is not preferred.
- Sliding has only a small, comfortable dip/FOV lift when reduced motion is not preferred.
- With `prefers-reduced-motion: reduce`, all new camera polish is disabled or effectively neutral.
- Reveal animation remains unchanged and comfortable.
- Return animation remains unchanged and comfortable.
- Tab top-down enters a stable fixed top-down camera with `TOP_DOWN_CAMERA_FOV`.
- Returning from top-down restores FPV without leaving sprint/slide FOV stuck.
- Local free-roam presence does not include bob/dip Y offsets.
- Collision and traversal behavior are unchanged.
- No source files outside `ThreeDModeShell.tsx` are required.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required after implementation:

- `npm.cmd run build`

Manual checks:

- Enter hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Click to focus movement.
- Walk normally and verify bob is subtle, not swimmy.
- Hold Shift while moving and verify FOV change is tiny and comfortable.
- Sprint then press `C` to slide and verify the dip is small and does not feel like falling.
- Press Tab while walking/sprinting/sliding and verify top-down camera is stable.
- Exit top-down and verify FPV FOV returns to normal/sprint/slide target correctly.
- Test monitor return and verify return animation is unchanged.
- Test range shooting and verify aiming/click behavior is not made harder.
- Enable reduced motion in browser/devtools or OS/browser setting and verify bob/dip/FOV polish is disabled.
- Exit to normal 2D dashboard and verify recovery is unchanged.

#### Risks

- Even subtle bob can bother some users; reduced-motion gating must be reliable.
- FOV interpolation can get stuck if top-down or return animation takes over while the movement controller is disabled.
- Slide dip could visually conflict with traversal surfaces if applied to synced pose or collision height instead of render-only camera Y.
- Bob based only on input may continue while blocked; use velocity/meaningful movement where possible.
- Range aiming can become less comfortable if bob amplitude is too high.
- Existing `FirstPersonBody` already has tiny bob; stacking camera bob and body bob could feel busier than intended.

#### Wishlist Mapping

- Respect reduced-motion preferences for head bob, FOV pulse, and slide camera effects.
- Add subtle head bob only if reduced-motion settings allow it.
- Add a small FOV/speed feeling for sprint/slide only if it remains comfortable.
- Keep camera polish comfortable and compatible with reduced-motion preferences.
- Preserve Tab top-down behavior while movement features grow.
- Preserve WebGL fallback, Exit, and normal app recovery.

#### Non-Goals

- Do not rewrite movement physics.
- Do not change sprint speed, slide speed, slide duration, slide cooldown, acceleration, deceleration, collision sliding, traversal surfaces, or `PLAYER_RADIUS`.
- Do not change reveal or return animation paths, durations, easing, or camera targets.
- Do not animate top-down camera.
- Do not add speed lines, particles, vignette, blur, shake, sway, roll, camera lean, or heavy FOV pulses.
- Do not add crouch, jump, stamina, gamepad support, physics, or packages.
- Do not change free-roam presence shape, sync cadence, reducer/session state, or movement-state presence.
- Do not change range shooting, monitor return, jukebox, sim roaming, area feedback, FPV body geometry, WebGL fallback, or normal 2D UI.
- Do not edit unrelated dirty files or revert work made by others.

### [x] Phase V3-43: Shooting Range Gun Rack Design

#### Summary

Design a decorative Shooting Range gun rack for V3-44: a wall-mounted rack with five distinct procedural weapon silhouettes, placed inside the merged Level 1 Shooting Range without blocking lanes, targets, player movement, range interactions, scoring, hit detection, sync, or packages.

This phase remains design-only. No source implementation is needed unless the team later decides to formalize the rack metadata as config before V3-44.

#### Implementation Spec

Expected docs file for V3-43:

- `docs/3d/3dvision3.md`

Likely future V3-44 implementation files:

- `src/3d/Level1RangeRoom.tsx`
  - Best place to render the rack in the merged Level 1 range room, because it owns the Level 1 range walls and wraps `ShootingRangePrototype`.
- Optional only if V3-44 wants a typed config instead of a local render spec:
  - `src/3d/levels/types.ts`
  - `src/3d/levels/level1.ts`

No expected changes to:

- `src/3d/ShootingRangePrototype.tsx`
- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- sync clients/server
- package files

Use a local render spec for V3-44 unless there is a strong need to make this level config. Since the first rack is decorative and local to the merged Level 1 Shooting Range, a local constant in `Level1RangeRoom.tsx` is enough and avoids expanding shared level types too early.

Concrete rack location:

- Coordinate basis: local to `Level1RangeRoom`, whose group is positioned at world `[16.5, 0, 0]`.
- Rack wall: east wall of merged Shooting Range.
- Local rack center: `[5.88, 1.55, 6.15]`
- World rack center: `[22.38, 1.55, 6.15]`
- Rotation: `[0, -Math.PI / 2, 0]`, so the rack faces west into the room.
- Rack backing size: width `2.75`, height `1.35`, depth `0.1`.
- Slot layout: five horizontal weapon slots stacked vertically on the backing panel.
- Slot local Y offsets: `[0.48, 0.24, 0, -0.24, -0.48]`
- Slot local X offsets on the rack face: `0` for all in the first render.
- Recommended local render group:

```tsx
<group position={[5.88, 1.55, 6.15]} rotation={[0, -Math.PI / 2, 0]}>
```

Why this location:

- The shooting lanes are centered at local X `-3.2`, `0`, and `3.2`, with lane widths `2.4`, running roughly local Z `-7.1` to `4.7`.
- The rack is beyond the lane end area at local Z `6.15`, behind/side of the firing area rather than downrange.
- The rack is on the east wall at local X `5.88`, outside the right lane edge around local X `4.4`.
- Targets remain on the north/downrange wall at local Z around `-5.6` and `-7.6`.
- The score display remains on the north/backstop wall at local `[0, 2.35, -8.72]`.
- The west doorway/opening remains clear.
- Because V3-44 should render the rack decorative and non-colliding by default, it will not affect movement collision or lane blockers.

V3-44 metadata shape:

```ts
type GunRackWeaponKind =
  | "compact-pistol"
  | "heavy-revolver"
  | "short-smg"
  | "tactical-rifle"
  | "marksman-rifle";

interface GunRackWeaponSpec {
  id: string;
  label: string;
  kind: GunRackWeaponKind;
  accentColor: string;
  silhouetteLength: number;
  slotIndex: number;
  slotOffset: readonly [number, number, number];
  plaque?: string;
}
```

Rack render spec:

```ts
const RANGE_GUN_RACK_SPEC = {
  id: "range-east-wall-gun-rack",
  label: "Range Gun Rack",
  position: [5.88, 1.55, 6.15],
  rotation: [0, -Math.PI / 2, 0],
  size: {
    width: 2.75,
    height: 1.35,
    depth: 0.1,
  },
  weapons: [
    {
      id: "rack-compact-pistol",
      label: "Compact Pistol",
      kind: "compact-pistol",
      accentColor: "#57f3ff",
      silhouetteLength: 0.72,
      slotIndex: 0,
      slotOffset: [0, 0.48, -0.08],
      plaque: "Pistol",
    },
    {
      id: "rack-heavy-revolver",
      label: "Heavy Revolver",
      kind: "heavy-revolver",
      accentColor: "#f8d36a",
      silhouetteLength: 0.86,
      slotIndex: 1,
      slotOffset: [0, 0.24, -0.08],
      plaque: "Revolver",
    },
    {
      id: "rack-short-smg",
      label: "Short SMG",
      kind: "short-smg",
      accentColor: "#ff6bd6",
      silhouetteLength: 1.08,
      slotIndex: 2,
      slotOffset: [0, 0, -0.08],
      plaque: "SMG",
    },
    {
      id: "rack-tactical-rifle",
      label: "Tactical Rifle",
      kind: "tactical-rifle",
      accentColor: "#73ff4c",
      silhouetteLength: 1.42,
      slotIndex: 3,
      slotOffset: [0, -0.24, -0.08],
      plaque: "Rifle",
    },
    {
      id: "rack-marksman-rifle",
      label: "Marksman Rifle",
      kind: "marksman-rifle",
      accentColor: "#8fb3d9",
      silhouetteLength: 1.72,
      slotIndex: 4,
      slotOffset: [0, -0.48, -0.08],
      plaque: "Marksman",
    },
  ],
} as const;
```

Procedural silhouette definitions for V3-44:

- Compact pistol:
  - Short rectangular slide, small grip angled downward, tiny barrel nub.
  - No stock.
  - Readable as the smallest compact sidearm.
- Heavy revolver:
  - Chunkier barrel, large cylinder disk/cylinder shape, curved or blocky grip.
  - Slightly taller than pistol.
  - Accent on cylinder.
- Short SMG:
  - Compact long receiver, short barrel, vertical magazine, small rear stock stub.
  - Mid-length silhouette.
  - Accent on magazine or receiver stripe.
- Tactical rifle:
  - Long receiver, longer barrel, shoulder stock, grip, magazine.
  - Wider and longer than SMG.
  - Accent on barrel/rail.
- Long marksman rifle:
  - Longest barrel, slim receiver, long stock, small scope block on top.
  - Distinct by length and scope.
  - Accent on scope or muzzle.

Labels/plaques:

- Include small plaques only if readable in FPV.
- Recommended first render: simple plaques under each slot with short labels:
  - `Pistol`
  - `Revolver`
  - `SMG`
  - `Rifle`
  - `Marksman`
- If plaques feel too small/noisy during V3-44, omit text and rely on silhouettes plus accent colors.

Lighting/accent:

- Add tiny emissive strips or accent bolts on the rack backing so it is findable.
- Do not add new light objects unless the rack is too dark; prefer emissive/basic materials first.
- Keep all materials procedural.

Collision:

- Default V3-44 should add no collision blocker.
- If a blocker is later required, use one very thin blocker against the east wall and keep it outside lane paths, but this should be avoided unless manual testing proves it necessary.

Runtime behavior changes:

- None in V3-43.
- No source behavior changes.
- No challenge/scoring/sync behavior changes.
- No package changes.
- No build output changes.

Future V3-44 behavior from this design:

- A decorative gun rack appears on the merged Level 1 Shooting Range east wall.
- Five procedural weapons are visible and distinct by silhouette, size, and accent color.
- Rack is decorative and non-interactive.
- Shooting challenge starts, scores, submits summaries, and renders targets exactly as before.
- Existing target hit detection remains focused on registered shootable targets only.

#### Checklist Items Achieved

- [x] Add a gun rack to the Shooting Range.
- [x] Put five distinct range guns on the gun rack.
- [x] Keep gun rack weapons stylized/procedural and clearly part of the range minigame fantasy.

#### Completed Implementation

- Finalized the design-only gun rack contract in this V3-43 section.
- Selected a concrete merged Level 1 Shooting Range east-wall location for the rack.
- Defined a local V3-44 render spec with position, rotation, backing size, weapon slots, and five weapon metadata entries.
- Defined procedural silhouettes for compact pistol, heavy revolver, short SMG, tactical rifle, and long marksman rifle.
- Documented optional plaque handling, emissive/accent guidance, and default no-collision behavior.
- Confirmed the design preserves lanes, targets, movement, west doorway, score display, shooting challenge behavior, hit detection, sync, and packages.
- Did not edit source code, package files, challenge logic, target logic, hit detection, sync/reducer/session behavior, or build-affecting files.

#### Acceptance Criteria

- The spec names the exact rack wall and location:
  - merged Level 1 Shooting Range east wall.
  - local position `[5.88, 1.55, 6.15]`.
  - world position `[22.38, 1.55, 6.15]`.
  - rotation `[0, -Math.PI / 2, 0]`.
- The spec confirms the rack does not block lanes, targets, player movement, west doorway, score display, or range interactions.
- The spec defines a rack render/config shape usable by V3-44.
- The spec lists all five weapon types:
  - compact pistol
  - heavy revolver
  - short SMG
  - tactical rifle
  - long marksman rifle
- The spec defines simple per-weapon metadata:
  - id
  - label
  - kind
  - accent color
  - silhouette length
  - slot index
  - slot offset
  - optional plaque text
- The spec describes each weapon silhouette clearly enough for a procedural render phase.
- The spec says plaques are optional and should be omitted if not readable.
- The spec preserves the existing shooting challenge behavior.
- No source code is edited for this design phase.

#### Build And Manual Checks

For this design-only phase:

- No build required if only this V3-43 section is edited.

Future V3-44 implementation command:

- `npm.cmd run build`

Manual checks for future V3-44:

- Enter hidden world with `syncsesh`.
- Walk from Control Room into Shooting Range.
- Verify rack appears on the east wall near local `[5.88, 1.55, 6.15]`, behind/side of the firing lanes.
- Verify rack is visible in FPV from the range entry and firing area.
- Press Tab and verify rack is visible in top-down without obscuring lanes/targets.
- Walk near the east wall and verify movement remains usable.
- Shoot targets and verify target interactions still work.
- Miss intentionally and verify misses still count.
- Complete the range challenge and verify score summary still syncs.
- Verify the west opening back to Control Room remains clear.

#### Risks

- East-wall placement is safe for lanes but may be slightly peripheral; emissive accents may be needed so users notice it.
- If V3-44 adds depth or collision too aggressively, it could narrow the side walkway near the east wall.
- Small procedural weapons can become visually noisy; silhouette should matter more than detail.
- Text plaques may be unreadable in FPV; they should be optional.
- Decorative weapons may imply interaction before V3-45 supports it.
- If the merged range dimensions change, the rack position may need retuning.

#### Wishlist Mapping

- Add a gun rack on a Shooting Range wall.
- Add five visually distinct guns to the rack.
- Keep guns procedural/simple at first; no asset pipeline required.
- Make each gun readable by silhouette, size, and color accent.
- Add labels or small plaques only if they remain readable in FPV.
- Keep the rack out of the shooting lane collision path.
- Keep the rack visible from both first-person and top-down views.
- Add subtle range lighting or emissive accents so the rack is findable.
- Keep the current shooting challenge working even if the rack is decorative.
- Let the gun rack read as decorative first, then optionally interactive later.

#### Non-Goals

- Do not implement the rack in V3-43.
- Do not edit source code unless a tiny config addition is explicitly approved later.
- Do not change shooting challenge scoring.
- Do not change target logic.
- Do not change hit detection or interaction priority.
- Do not register rack weapons as shootable or clickable in this phase.
- Do not add weapon selection, inspect/equip behavior, reticle hints, or selected-weapon state.
- Do not change range scoreboard summaries or sync/reducer/session state.
- Do not add imported models, textures, sounds, physics, packages, or an asset pipeline.
- Do not add collision blockers in the design phase.
- Do not move lanes, targets, score display, walls, openings, player starts, or level bounds.
- Do not alter Control Room behavior, movement, camera polish, presence, sim roaming, monitor return, jukebox, or normal 2D UI.

### [x] Phase V3-44: Static Gun Rack Render

#### Summary

Render the approved V3-43 decorative gun rack inside the merged Level 1 Shooting Range as a static, non-interactive environmental prop with five readable procedural weapon silhouettes.

The phase should make the Shooting Range feel more like a finished room while preserving the existing shooting challenge, target interactions, scoring, sync, movement, collision, and package footprint.

#### Implementation Spec

Expected implementation files:

- `src/3d/Level1RangeRoom.tsx`
  - Add the local rack spec.
  - Add procedural rack/weapon render helpers.
  - Render the rack inside the existing merged Level 1 range `<group position={[16.5, 0, 0]}>`.
- `docs/3d/3dvision3.md`
  - Update only this V3-44 section after implementation and successful build.

Avoid changes to:

- `src/3d/ShootingRangePrototype.tsx`
- `src/3d/levels/types.ts`
- `src/3d/levels/level1.ts`
- `src/3d/levels/level2Range.ts`
- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- sync clients/server
- package files

Reason: V3-43 approved a local render spec; no shared config/type expansion is necessary for a decorative, first-pass rack.

Add a local rack spec in `Level1RangeRoom.tsx`, near the existing small render helpers:

```ts
type GunRackWeaponKind =
  | "compact-pistol"
  | "heavy-revolver"
  | "short-smg"
  | "tactical-rifle"
  | "marksman-rifle";

interface GunRackWeaponSpec {
  id: string;
  label: string;
  kind: GunRackWeaponKind;
  accentColor: string;
  silhouetteLength: number;
  slotIndex: number;
  slotOffset: readonly [number, number, number];
  plaque?: string;
}
```

Use the approved V3-43 local render spec exactly:

```ts
const RANGE_GUN_RACK_SPEC = {
  id: "range-east-wall-gun-rack",
  label: "Range Gun Rack",
  position: [5.88, 1.55, 6.15],
  rotation: [0, -Math.PI / 2, 0],
  size: {
    width: 2.75,
    height: 1.35,
    depth: 0.1,
  },
  weapons: [
    {
      id: "rack-compact-pistol",
      label: "Compact Pistol",
      kind: "compact-pistol",
      accentColor: "#57f3ff",
      silhouetteLength: 0.72,
      slotIndex: 0,
      slotOffset: [0, 0.48, -0.08],
      plaque: "Pistol",
    },
    {
      id: "rack-heavy-revolver",
      label: "Heavy Revolver",
      kind: "heavy-revolver",
      accentColor: "#f8d36a",
      silhouetteLength: 0.86,
      slotIndex: 1,
      slotOffset: [0, 0.24, -0.08],
      plaque: "Revolver",
    },
    {
      id: "rack-short-smg",
      label: "Short SMG",
      kind: "short-smg",
      accentColor: "#ff6bd6",
      silhouetteLength: 1.08,
      slotIndex: 2,
      slotOffset: [0, 0, -0.08],
      plaque: "SMG",
    },
    {
      id: "rack-tactical-rifle",
      label: "Tactical Rifle",
      kind: "tactical-rifle",
      accentColor: "#73ff4c",
      silhouetteLength: 1.42,
      slotIndex: 3,
      slotOffset: [0, -0.24, -0.08],
      plaque: "Rifle",
    },
    {
      id: "rack-marksman-rifle",
      label: "Marksman Rifle",
      kind: "marksman-rifle",
      accentColor: "#8fb3d9",
      silhouetteLength: 1.72,
      slotIndex: 4,
      slotOffset: [0, -0.48, -0.08],
      plaque: "Marksman",
    },
  ],
} as const;
```

Add render helpers in `Level1RangeRoom.tsx`:

- `GunRack({ phaseVisuals })`
  - Renders backing panel, rails, accent strips, five slots, optional plaques, and weapons.
  - Uses approved position `[5.88, 1.55, 6.15]` and rotation `[0, -Math.PI / 2, 0]`.
  - Faces west into the room from the east wall.
  - Adds no `useRegisterInteractable`.
  - Adds no collision blocker.
- `GunRackWeapon({ weapon })`
  - Dispatches by `weapon.kind` to simple procedural silhouettes.
- Optional tiny helpers:
  - `GunRackPlaque`
  - `WeaponGrip`
  - `WeaponBarrel`
  - Keep helper count modest; this should remain a small static render pass.

Recommended geometry strategy:

- Rack backing:
  - `boxGeometry` using `size.width`, `size.height`, `size.depth`.
  - Dark metal material: `#07111f` or `#0b1524`.
  - Mild emissive/accent frame strips using `phaseVisuals.gridSecondary` or weapon accent colors.
- Slot rails:
  - Five thin horizontal bars behind each weapon.
  - Small end pegs or clamps so weapons read as mounted.
  - No texturing or canvas needed.
- Plaques:
  - Prefer simple non-text geometry plaques in V3-44 if text readability is uncertain.
  - If text is added, use very short labels from V3-43 and keep it optional.
  - First implementation decision: render small colored plaque plates without text to avoid unreadable FPV microtext. Rely on silhouette and accent color.

Weapon silhouettes:

- Compact pistol:
  - Short slide box.
  - Tiny barrel nub.
  - Angled grip.
  - Overall length about `0.72`.
- Heavy revolver:
  - Chunky barrel.
  - Circular/cylindrical cylinder.
  - Larger grip.
  - Overall length about `0.86`.
- Short SMG:
  - Receiver box.
  - Short barrel.
  - Vertical magazine.
  - Small stock stub.
  - Overall length about `1.08`.
- Tactical rifle:
  - Long receiver.
  - Barrel/rail.
  - Shoulder stock.
  - Grip and magazine.
  - Overall length about `1.42`.
- Long marksman rifle:
  - Longest barrel.
  - Slim receiver.
  - Long stock.
  - Small scope on top.
  - Overall length about `1.72`.

Render placement:

- Add `<GunRack phaseVisuals={phaseVisuals} />` inside the existing `Level1RangeRoom` group after wall rendering and before `ShootingRangePrototype`.
- This keeps the rack visually part of the room shell and avoids touching challenge/interactable code.
- Because `Level1RangeRoom` is already translated by `[16.5, 0, 0]`, the rack local center `[5.88, 1.55, 6.15]` becomes world `[22.38, 1.55, 6.15]`.

Docs update after build passes:

- Mark V3-44 complete.
- Check off relevant checklist items.
- Add completed implementation notes.
- Record `npm.cmd run build` result.

Runtime behavior changes:

- The merged Level 1 Shooting Range gains a decorative gun rack on the east wall.
- The rack appears at local `[5.88, 1.55, 6.15]`, world `[22.38, 1.55, 6.15]`.
- Five static procedural guns appear on the rack:
  - compact pistol
  - heavy revolver
  - short SMG
  - tactical rifle
  - long marksman rifle
- Weapons are distinct by size, silhouette, and accent color.
- Rack uses procedural geometry and materials only.
- Rack is non-interactive:
  - no clickable registration.
  - no shootable registration.
  - no selected weapon state.
  - no reticle hints.
- Rack is non-colliding:
  - no collision bounds or blockers added.
- Shooting challenge behavior remains unchanged:
  - scoring unchanged.
  - target logic unchanged.
  - hit detection unchanged.
  - scoreboard summary sync unchanged.

#### Checklist Items Achieved

- [x] Add a gun rack on a Shooting Range wall.
- [x] Add five visually distinct guns to the rack.
- [x] Keep guns procedural/simple at first; no asset pipeline required.
- [x] Make each gun readable by silhouette, size, and color accent.
- [x] Keep the current shooting challenge working even if the rack is decorative.

#### Completed Implementation

- Added the approved local V3-43 rack spec to `src/3d/Level1RangeRoom.tsx`.
- Rendered a decorative gun rack at local `[5.88, 1.55, 6.15]`, world `[22.38, 1.55, 6.15]`, rotated to face west from the range east wall.
- Added five static procedural weapon silhouettes:
  - compact pistol
  - heavy revolver
  - short SMG
  - tactical rifle
  - long marksman rifle
- Used procedural geometry, dark rack materials, accent colors, slot rails, end clamps, and non-text plaque plates.
- Revised the east-wall depth orientation so the backing panel, rails, pegs, weapon silhouettes, and plaque plates sit on the room-facing positive local Z side for rotation `[0, -Math.PI / 2, 0]`, avoiding hidden wall-side placement.
- Kept the rack decorative, non-interactive, and non-colliding.
- Did not edit `ShootingRangePrototype.tsx`, level config/types, sync/reducer/session files, package files, collision config, target logic, scoring, hit detection, movement, or normal 2D UI.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

#### Acceptance Criteria

- Gun rack appears in the merged Level 1 Shooting Range on the east wall.
- Rack uses the approved V3-43 location:
  - local `[5.88, 1.55, 6.15]`.
  - world `[22.38, 1.55, 6.15]`.
  - rotation `[0, -Math.PI / 2, 0]`.
- Five weapons are visible on the rack.
- The five weapons read as distinct silhouettes:
  - compact pistol is the smallest sidearm.
  - heavy revolver has a visible cylinder/chunkier profile.
  - short SMG has a vertical magazine and compact stock.
  - tactical rifle is longer with stock, grip, magazine.
  - marksman rifle is longest and includes a scope.
- Rack remains decorative and non-interactive.
- Rack adds no new collision blocker.
- Player movement and shooting lanes remain usable.
- West opening between Control Room and Shooting Range remains clear.
- Existing range challenge starts, tracks shots, scores hits/misses, completes, and submits summaries as before.
- Target hit detection still only targets registered range targets.
- Top-down view shows the rack without obscuring lanes or targets.
- No source files outside `Level1RangeRoom.tsx` are required.
- `npm.cmd run build` passes.

#### Build And Manual Checks

Required during implementation:

- `npm.cmd run build`

Manual checks:

- Enter hidden world with `syncsesh`.
- Complete reveal or click Skip.
- Walk from Control Room into Shooting Range.
- Verify rack appears on the east wall near local `[5.88, 1.55, 6.15]`.
- Verify rack is visible in FPV from the range entry and firing area.
- Verify five distinct weapons are visible.
- Press Tab and verify the rack is visible in top-down without obscuring lanes/targets.
- Walk near the east wall and verify movement remains usable.
- Verify west opening back to Control Room remains clear.
- Shoot targets and verify target interactions still work.
- Miss intentionally and verify misses still count.
- Complete range challenge and verify score summary still syncs.
- Exit to normal 2D dashboard and verify recovery is unchanged.

#### Risks

- Small procedural silhouettes may be hard to read in the range lighting.
- The east-wall rack may be peripheral unless emissive accents are noticeable.
- Weapon detail can become visually noisy if built from too many small boxes.
- Rack depth could visually appear to protrude into the side walkway, even without collision.
- Decorative weapons may create user expectation of interaction before V3-45.
- If the future range layout changes, the approved location may need retuning.

#### Wishlist Mapping

- Add a gun rack on a Shooting Range wall.
- Add five visually distinct guns to the rack.
- Keep guns procedural/simple at first; no asset pipeline required.
- Make each gun readable by silhouette, size, and color accent.
- Keep the rack out of the shooting lane collision path.
- Keep the rack visible from both first-person and top-down views.
- Add subtle range lighting or emissive accents so the rack is findable.
- Keep the current shooting challenge working even if the rack is decorative.
- Let the gun rack read as decorative first, then optionally interactive later.

#### Non-Goals

- Do not make the rack interactive.
- Do not register rack weapons as clickable.
- Do not register rack weapons as shootable.
- Do not add weapon selection, inspect/equip, reticle hints, selected-weapon state, or weapon UI.
- Do not change shooting challenge scoring.
- Do not change target logic.
- Do not change hit detection or interaction priority.
- Do not change projectile/fire cadence behavior.
- Do not change range scoreboard summaries or sync/reducer/session state.
- Do not add collision blockers unless implementation proves it absolutely necessary; default is no collision.
- Do not move lanes, targets, score display, walls, openings, player starts, level bounds, or collision bounds.
- Do not add imported models, external textures, sounds, physics, packages, or an asset pipeline.
- Do not alter Control Room behavior, movement, camera polish, presence, sim roaming, monitor return, jukebox, WebGL fallback, or normal 2D UI.

### [x] Phase V3-45: Gun Rack Interaction Prep

#### Summary

Prepare the V3-44 static rack for future weapon selection by adding local-only rack weapon interaction metadata, keyboard inspection/equip behavior, and a concrete in-world selected-weapon status plaque.

V3-45 should make the five rack weapons aimable with `E` through the existing `src/3d/interactions.tsx` clickable path while preserving pointer shooting and range scoring exactly.

#### Implementation Spec

Expected implementation files:

- `src/3d/Level1RangeRoom.tsx`
  - Add local selected rack weapon state.
  - Add per-weapon clickable refs/registrations.
  - Add local visual feedback for the selected rack weapon.
  - Add a small in-world rack status plaque/canvas showing the selected weapon name.
- `docs/3d/3dvision3.md`
  - Update only this V3-45 section after implementation and successful build.

Avoid changes to:

- `src/3d/interactions.tsx`
- `src/3d/ShootingRangePrototype.tsx`
- level config/types
- session/reducer/sync files
- package files
- normal 2D UI

Use the existing interaction API exactly as it exists today:

- `src/3d/interactions.tsx`
- `useRegisterInteractable`
- `modes: ["clickable"]`

For each rack weapon:

- Add a `ref` target to the weapon group or a small transparent/low-opacity hit plate aligned with the visible silhouette.
- Register it as clickable only:
  - `id`: `gun-rack-${weapon.id}`
  - `label`: `Inspect ${weapon.label}`
  - `modes`: `["clickable"]`
  - `onActivate`: set local selected weapon id in `Level1RangeRoom.tsx`
- Do not register rack weapons as `shootable`.
- Do not subscribe to shot events.
- Do not modify `activateCurrent`, raycast priority, pointer shoot handling, reticle behavior, or target registrations.

Selection/inspection is local-only:

- Store selected weapon id in component state inside `Level1RangeRoom.tsx`.
- Derive selected weapon label from `RANGE_GUN_RACK_SPEC.weapons`.
- Highlight the selected weapon locally with a subtle emissive/bracket/rail accent.
- Add a small in-world rack status plaque on or near the gun rack using a local canvas texture pattern, similar to existing canvas-label usage elsewhere in the 3D codebase.
- Plaque content:
  - title: `RACK SELECT`
  - selected label: selected weapon label, or `NONE` before selection
- The plaque is a 3D mesh/canvas texture in `Level1RangeRoom.tsx`, not normal 2D UI.
- The plaque is decorative/local display only and has no interaction registration.

This avoids changing the shared interaction system. Pointer shooting currently activates only `shootable` registrations through `activateCurrent("shootable", "pointer")`; clickable-only rack weapons will not be activated by pointer shooting and cannot call range target hit handlers.

Runtime behavior changes:

- Aiming at a rack weapon can produce an active clickable hit through the existing center-ray interaction system.
- Pressing `E` while aiming at a rack weapon selects/inspects that weapon locally.
- The selected weapon receives local visual feedback on the rack.
- The in-world rack status plaque updates locally from `NONE` to the selected weapon label.
- The rack remains decorative in gameplay terms:
  - no projectile changes
  - no weapon stats
  - no fire cadence changes
  - no target size changes
  - no scoring changes
  - no scoreboard changes
- Left-click pointer shooting remains governed by existing `shootable` registrations only.
- Rack weapons do not become shootable targets.
- If the player shoots while aiming at the rack, current non-target shooting behavior is preserved.
- Selection state is not synced and resets with the local component lifecycle.

Required implementation command:

- `npm.cmd run build`

#### Checklist Items Achieved

- [x] Let the gun rack read as decorative first, then optionally interactive later.
- [x] Let the player aim at a rack weapon and inspect/equip it.
- [x] Show the selected weapon name in the local range UI or reticle hint.
- [x] Keep weapon selection local-only unless a future phase explicitly syncs it.

#### Completed Implementation

- Added local selected rack weapon state in `src/3d/Level1RangeRoom.tsx`.
- Registered each rack weapon with `useRegisterInteractable` through the existing `src/3d/interactions.tsx` API.
- Kept rack weapon registrations clickable-only with `modes: ["clickable"]`; no rack weapon is registered as `shootable`.
- Added transparent local hit plates aligned with the five rack weapon silhouettes.
- Added local selected feedback with brighter slot rails, end clamps, plaque accents, and selected brackets.
- Added a small in-world canvas status plaque on the rack that shows `RACK SELECT` and either `NONE` or the selected weapon label.
- Kept selected weapon state local to the rack component; no sync, reducer, session state, scoreboard, projectile, hit detection, target, cadence, package, movement, or normal 2D UI changes were made.
- Preserved the V3-44 rack location and orientation.
- `npm.cmd run build` passed with the existing Vite large chunk warning.

#### Acceptance Criteria

- `npm.cmd run build` passes.
- All five rack weapons have stable local ids available for future equip work:
  - `rack-compact-pistol`
  - `rack-heavy-revolver`
  - `rack-short-smg`
  - `rack-tactical-rifle`
  - `rack-marksman-rifle`
- Rack weapons register with `modes: ["clickable"]` only.
- Rack weapons are never registered as `shootable`.
- Aiming at each rack weapon and pressing `E` updates local selected weapon state.
- Selected weapon feedback is visible locally in the 3D rack.
- A small in-world rack status plaque is rendered in `Level1RangeRoom.tsx`.
- The status plaque title reads `RACK SELECT`.
- The status plaque shows `NONE` before selection.
- After selecting a rack weapon, the status plaque shows that weapon's label.
- The status plaque is implemented as 3D world content, not normal 2D UI.
- Range targets still register and score as before.
- Pointer shooting still hits registered targets as before.
- Pointer shooting cadence, miss handling, challenge start/complete behavior, scoring, target logic, and synced scoreboard remain unchanged.
- No sync, reducer, session state, package, projectile, hit detection, shared interaction, or normal 2D UI files are changed.
- Existing V3-44 rack location/orientation stays intact.

#### Build And Manual Checks

Required during implementation:

- `npm.cmd run build`

Manual checks:

- Enter 3D mode and complete/skip reveal.
- Walk into the Shooting Range.
- Confirm the rack status plaque initially shows `RACK SELECT` and `NONE`.
- Aim at each rack weapon and press `E`; confirm selected visual feedback changes.
- Confirm the rack status plaque updates to the selected weapon label.
- Left-click at normal range targets; confirm hits still score.
- Left-click while aiming at rack; confirm no rack hit scoring or target hit is created.
- Start and complete a shooting challenge; confirm scoring and summary still work.
- Toggle top-down; confirm the rack and plaque remain visible without obstructing lanes/targets.

#### Risks

- Shared aim reticle currently marks any active hit, including clickable hits; aiming at a rack weapon may show the active reticle even though left-click shooting will not equip it.
- If hit plates are too large, they could compete with nearby target aiming feel.
- Canvas texture labels need careful sizing/placement to stay readable without dominating the rack.
- Because pointer shooting always emits a shot event when enabled, clicking the rack during an active challenge may still count as a miss, matching current non-target behavior.
- The current interaction API has only `clickable` and `shootable`; richer inspect/equip semantics would require a future shared interaction phase.

#### Wishlist Mapping

- Let the gun rack read as decorative first, then optionally interactive later.
  - Keep the rack non-gameplay-affecting; add only clickable metadata, local feedback, and local status display.
- Let the player aim at a rack weapon and inspect/equip it.
  - Pressing `E` while aiming at a clickable rack weapon locally selects/inspects it.
- Show the selected weapon name in the local range UI or reticle hint.
  - Implement as an in-world rack status plaque showing `RACK SELECT` and the selected weapon label or `NONE`, avoiding normal 2D UI and shared reticle changes.
- Keep weapon selection local-only unless a future phase explicitly syncs it.
  - Store selected id only in `Level1RangeRoom.tsx` state; no sync/session changes.

#### Non-Goals

- No synced weapon selection.
- No real weapon equip mechanics.
- No projectile logic changes.
- No hit detection changes.
- No fire cadence changes.
- No scoring changes.
- No target size or target behavior changes.
- No synced scoreboard changes.
- No range challenge balance changes.
- No package changes.
- No normal 2D UI changes.
- No shared reticle changes.
- No rewrite of `src/3d/interactions.tsx`.
- No interaction folder creation.
