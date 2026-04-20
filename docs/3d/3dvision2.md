# Secret 3D World Vision 2

## Purpose

This document is a future-planning companion to `3dvision.md`. The first vision document should stay focused on proving the hidden 3D room, Level 1, movement, camera modes, timer presence, and basic Discord participant representation.

Vision 2 collects ideas for what comes after the first hidden world is stable. These phases should not block Level 1. They should become candidates for later implementation once the 3D foundation is working, recoverable, and performant inside Discord Activities.

## North Star

The hidden world should grow from a secret room into a small collection of playful spaces. Each space should feel like it belongs inside Sync Sesh: social, session-aware, quick to understand, and light enough to run in an embedded browser.

Future features should favor short multiplayer moments over heavyweight game systems. The best additions are things users can discover, try together, and leave without breaking the normal timer flow.

## Expansion Principles

- Keep the normal timer app as the reliable base experience.
- Treat each new area as a level or sub-level loaded through the level registry.
- Prefer simple interaction systems built on Three.js raycasting before adding physics.
- Keep session state, participant identity, and timer data outside rendering components.
- Make features fun locally first, then sync only the parts that need multiplayer presence.
- Design every future feature with an exit path back to Level 1 or the normal timer app.
- Avoid asset-heavy scenes until the performance budget is known.

## Candidate Future Areas

### Shooting Range

A compact target range where users can test a lightweight first-person interaction system.

The first version should use raycast shots from the camera instead of physical projectiles. This keeps the feature fast, deterministic, and easier to sync later.

Possible layout:

- A separate Level 2 range room.
- A hidden side room connected to Level 1.
- A temporary prototype lane inside Level 1.

Core interactions:

- Click or press a key to fire.
- Cast a ray from the camera through the center of the view.
- Detect hits against target meshes.
- Flash, animate, or briefly change material on hit.
- Track a local score.
- Reset targets after a short delay.

Later multiplayer ideas:

- Shared scoreboard.
- Timed challenge mode.
- Host-started range rounds.
- Participant-specific target lanes.
- Synchronized target states.
- Spectator top-down view.

### Secret Doors And Unlock Paths

Level 1 can become a hub for hidden spaces. Unlocks should feel discoverable, but not become security-sensitive.

Possible unlocks:

- Entering a second code while already inside the 3D world.
- Clicking or shooting a hidden object.
- Completing a timer session.
- All participants becoming ready.
- Host-only room controls.

### Interactive Objects

Small objects can make the world feel alive without requiring a full game system.

Candidates:

- Toggleable lights.
- Monitors that switch display modes.
- Buttons that trigger room effects.
- Collectible props.
- Doors or panels.
- Session-reactive objects that change during idle, armed, precount, countdown, and completed phases.

### First-Person Controls

The hidden world needs to feel like a normal first-person space before richer gameplay will feel good. If WASD movement exists but does not work reliably in the Discord Activity or local browser, controls should get a dedicated hardening pass before shooting range work begins.

Expected controls:

- WASD moves relative to the camera direction.
- Mouse movement controls where the camera looks.
- Click-to-focus or click-to-enter should activate pointer lock when supported.
- Escape should release pointer lock.
- Movement should continue to respect room bounds and collision blockers.
- Controls should not trigger while typing in inputs, textareas, selects, or editable elements.
- Controls should not break normal timer interactions, ready hold, admin tools, or Discord focus behavior.

Implementation notes:

- Prefer a small custom control layer at first so Discord focus constraints are clear.
- Consider `PointerLockControls` later if `@react-three/drei` is added.
- Keep camera yaw and pitch state separate from player position.
- Clamp vertical look pitch so users cannot flip the camera.
- Add an on-screen focus hint only when needed.
- Add a manual test checklist for local browser and Discord Activity iframe behavior.

### Stronger Player Presence

After station-based presence works, the world can evolve toward richer multiplayer identity.

Possible upgrades:

- Synced free-roam positions.
- Simple avatar capsules or silhouettes.
- Avatar colors from Discord/user state.
- Nameplates.
- Ready/idle/host indicators.
- Look direction.
- Lightweight emotes.

The first synced movement pass should avoid precise physics. Position, rotation, and a small interpolation buffer are likely enough.

### Level Themes

Future levels should be small, readable, and strongly themed.

Candidate levels:

- Level 2: Shooting Range.
- Level 3: Control Room.
- Level 4: Rooftop Timer Beacon.
- Level 5: Arcade Annex.
- Level 6: Observatory.

Each level should define:

- id
- name
- dimensions
- spawn points
- camera presets
- collision bounds
- lighting
- display surfaces
- interactable objects
- optional participant slots

## Future Phase Candidates

### [ ] Phase V2-1: Interaction Primitive

#### Summary

Create a generic interaction path for clicking or activating objects in 3D.

#### Implementation spec

- Add a small interaction registry for world objects.
- Support pointer/crosshair raycasting from the active camera.
- Allow objects to define an id, bounds or mesh ref, label, and activation handler.
- Keep interactions local-only at first.
- Add a minimal crosshair or focus indicator if needed.
- Avoid tying the system to the shooting range specifically.

### [ ] Phase V2-2: First-Person Controls Hardening

#### Summary

Make first-person movement reliable and game-like before adding range gameplay.

#### Implementation spec

- Verify whether current WASD events fire in local browser and Discord Activity contexts.
- Ensure movement only starts after the reveal is complete.
- Add clear focus handling for the 3D canvas.
- Add mouse-look with yaw and pitch.
- Move WASD relative to the current camera yaw.
- Use pointer lock where supported.
- Release pointer lock on Escape.
- Preserve collision bounds and blocker handling.
- Avoid handling movement keys while the user is typing in interactive UI.
- Add a small manual checklist for movement, focus, pointer lock, exiting, and timer UI safety.

### [ ] Phase V2-3: Interaction Primitive With Aim Context

#### Summary

Extend the generic interaction path so it understands the active first-person camera aim.

#### Implementation spec

- Use the first-person camera forward direction for raycast interactions.
- Keep crosshair/focus state compatible with pointer lock.
- Allow objects to define whether they are clickable, shootable, or both.
- Keep activation local-only at first.

### [ ] Phase V2-4: Shooting Range Prototype

#### Summary

Build the smallest possible target shooting prototype using raycasts.

#### Implementation spec

- Add target definitions to a level or prototype config.
- Render simple target meshes.
- Fire a camera ray on click or key press.
- Detect target hits.
- Add local score state.
- Add basic hit feedback.
- Keep all targets procedural.
- Do not sync shots or scores yet.

### [ ] Phase V2-5: Shooting Range Level Config

#### Summary

Promote the prototype into a dedicated Level 2 config.

#### Implementation spec

- Add a Level 2 shooting range config.
- Define lanes, target positions, spawn points, display surfaces, and bounds.
- Load the range through the level registry.
- Keep Level 1 unchanged except for an optional entry point.
- Confirm Level 1 and Level 2 can mount, unmount, and switch cleanly.

### [ ] Phase V2-6: Range Challenge Mode

#### Summary

Turn the range into a short timed challenge.

#### Implementation spec

- Add a local challenge timer.
- Spawn or reset targets during the challenge.
- Track hits, misses, accuracy, and score.
- Show score on a range display surface.
- Keep challenge state local until the sync model is clear.

### [ ] Phase V2-7: Synced Scoreboard

#### Summary

Sync only scoreboard results, not every shot.

#### Implementation spec

- Send score summaries through the existing sync layer.
- Display participant scores in the range.
- Include display name, score, hits, misses, and accuracy.
- Reset scores when a new range round starts.
- Avoid syncing high-frequency shot events unless needed.

### [ ] Phase V2-8: Secret Door From Level 1

#### Summary

Add an in-world path from the station room to a future level.

#### Implementation spec

- Add a door or panel object to Level 1.
- Make it interactable through the generic interaction primitive.
- Trigger a local level change or transition.
- Keep an obvious return path.
- Gate the door behind a code, host action, session state, or discovery event.

### [ ] Phase V2-9: Synced Free-Roam Presence

#### Summary

Represent other users moving through the 3D world.

#### Implementation spec

- Sync local player position and facing direction at a modest interval.
- Interpolate remote player movement.
- Use simple avatar shapes at first.
- Handle disconnects and users returning to the normal timer UI.
- Keep station-based presence as a fallback.

### [ ] Phase V2-10: Future Level Planning Pass

#### Summary

Choose the next level after the shooting range and define its gameplay purpose.

#### Implementation spec

- Pick one level theme.
- Define why it belongs in Sync Sesh.
- Document the minimum interactables.
- Document what must sync and what can remain local.
- Keep the scope smaller than Level 1 plus the shooting range.

## Open Questions

- Should shooting be mouse-click only, keyboard-triggered, or both?
- Should the range be playful and abstract, or more realistic?
- Should scores persist only for the current Activity session?
- Should the host control challenge starts?
- Should Level 1 contain a visible door, a hidden door, or no door until Level 2 is ready?
- Should future synced movement use the existing sync server or a separate lower-latency channel?
- Does Discord Activity iframe focus require a click-to-focus overlay before WASD can work reliably?
- Should pointer lock be required for 3D mode, or should there be a fallback drag-to-look mode?

## Recommended First Step After Vision 1

Start with `Phase V2-2: First-Person Controls Hardening`, then build `Phase V2-3: Interaction Primitive With Aim Context`, then build `Phase V2-4: Shooting Range Prototype`.

That order makes the hidden world feel good before turning it into a game space. It also keeps the shooting range from becoming a one-off system by giving future doors, buttons, panels, and secret objects a shared interaction path.
