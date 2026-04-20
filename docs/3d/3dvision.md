# Secret 3D World Vision

## Vision

The 3D world is a hidden layer inside the Sync Sesh activity. The default experience still looks like the current timer app, but there is a secret capability tucked behind a code entry. Users who know the code can unlock a transition into a shared 3D environment.

The unlock should feel like discovering that the timer interface was only the front face of a larger space. After a valid code is entered, the camera pulls back from the timer portion of the app and reveals that the app exists on a computer inside a 3D world. The user then enters that world through a first-person camera.

Everyone who is in the Discord Activity should exist in the 3D world. The first level should place users behind computers, implying that each person was sitting at their own station while looking into the timer app. The timer remains part of the world, either as the screen content on a computer, a central wall display, or both.

The first 3D environment should be treated as Level 1. It should be intentionally scoped so the team can build the foundation first and enrich the space later. The level can start as a compact room with user stations, a visible timer surface, and enough navigable floor space to prove multiplayer presence and movement.

The first-person view is the main hidden-world mode. Users should be able to walk around with WASD controls. Pressing Tab should toggle or hold a top-down view so users can understand the room layout and see where other participants are. This top-down view can become a tactical/map-style camera later, but the first version only needs to provide clear spatial orientation.

Wishlist items:

- [x] W1: Secret code entry unlocks the 3D capability.
- [x] W2: The 3D world is not obvious from the normal timer UI.
- [x] W3: Valid code triggers a camera pull-back from the timer app into the 3D world.
- [x] W4: The user lands in a first-person view after the reveal.
- [x] W5: Every participant in the activity is represented in the 3D world.
- [x] W6: Participants start seated behind computers.
- [x] W7: The current timer app is represented as something inside the world.
- [x] W8: WASD moves the player through the space.
- [x] W9: Tab switches to a top-down view.
- [x] W10: The world is organized as a level system.
- [x] W11: Level 1 is the first environment and should be expandable.
- [x] W12: Future levels can add richer spaces, secrets, interactive objects, and stronger identity/presence.

## Guide Rails

The 3D world should be built as an additive layer over the existing activity rather than a replacement for the current timer flow. The current React session state, countdown engine, Discord identity wiring, and sync clients should remain the source of truth for who is present and what phase the session is in.

### [x] Phase 0: Rendering stack spike

#### Summary

Prove that a basic 3D canvas can run inside the existing React/Vite app. This phase supports W3 and W4 by validating that the app can render a 3D scene before any secret unlock or level work begins.

#### Implementation spec

- Choose the rendering stack. The likely default is Three.js with React Three Fiber because the app is already React and Vite.
- Install only the minimum packages needed for a spike, such as `three`, `@react-three/fiber`, and possibly `@react-three/drei`.
- Create a temporary full-screen 3D canvas with a camera, floor, and one simple cube.
- Confirm that the canvas can mount and unmount without breaking the current timer app.
- Measure rough performance on a normal desktop browser before adding richer visuals.
- Keep this phase intentionally disposable if the rendering approach needs to change.

### [x] Phase 1: Secret code detection

#### Summary

Add the hidden input mechanic that detects a valid secret code without changing the visible app experience. This phase achieves W1 and protects W2.

#### Implementation spec

- Add a local secret-code detector that listens for typed input while the app is focused.
- Avoid obvious labels like "3D mode" or "secret world" in the default UI.
- Keep the first secret code implementation simple, such as a local constant or environment-driven value.
- Treat the code as a discovery mechanic, not a security boundary.
- Emit a local unlock state when the code is entered correctly.
- Do not yet render the 3D world in this phase.

### [x] Phase 2: 3D mode shell

#### Summary

Use the local unlock state to switch the current user into a hidden 3D mode. This phase achieves W1 and W2 by making the secret unlock actually open a private 3D shell.

#### Implementation spec

- Add a 3D mode component that can replace or overlay the normal timer app after unlock.
- Keep the normal app as the default experience for users who have not entered the code.
- Add an exit path from 3D mode back to the normal timer app.
- Keep this phase visually simple: render only the canvas, a placeholder scene, and a minimal exit affordance.
- Do not add the reveal animation yet.

### [x] Phase 3: Level 1 data model

#### Summary

Create the data structure that defines Level 1 so the world does not become hard-coded inside rendering components. This phase achieves W10 and supports W11.

#### Implementation spec

- Define a Level 1 config with id, name, room dimensions, player start, top-down camera settings, and station positions.
- Include placeholders for timer display position, collision bounds, and lighting.
- Keep the config plain and easy to inspect.
- Add type definitions for level data if needed.
- Do not render the full level yet; this phase creates the source of truth.

### [x] Phase 4: Level 1 room shell

#### Summary

Render the basic Level 1 room from the level config. This phase achieves W11 and starts making the hidden world feel like a place.

#### Implementation spec

- Render floor, walls, and simple lighting using the Level 1 config.
- Add a clear sense of room scale.
- Keep all geometry procedural and lightweight.
- Avoid decorative complexity in this phase.
- Confirm the 3D mode still mounts, unmounts, and exits cleanly.

### [x] Phase 5: Computer stations

#### Summary

Add the desks/computers that explain the fiction: every participant begins behind a computer looking into the timer app. This phase achieves W6 and supports W7.

#### Implementation spec

- Render a desk and computer at each station position from the Level 1 config.
- Keep each station simple: desk surface, monitor, chair or seated marker.
- Make stations visually readable from first-person and top-down camera angles.
- Reserve a screen surface on each monitor for later timer/session rendering.
- Do not map real users to stations yet.

### [x] Phase 6: Timer screen in world

#### Summary

Render the current timer/session state on a surface inside Level 1. This phase achieves W7.

#### Implementation spec

- Add a readable 3D timer display on a computer monitor or central wall display.
- Source all timer text from the existing session/countdown display state.
- Show at least phase and timer text.
- Keep the display readable at the default camera position.
- Do not add room-wide effects yet.
- Keep all countdown math sourced from the existing session state and sync timing.

### [x] Phase 7: Camera pull-back reveal

#### Summary

Replace the hard switch into 3D mode with the desired cinematic reveal. This phase achieves W3 and W4.

#### Implementation spec

- Start the 3D camera tightly framed on the timer surface.
- Animate the camera backward to reveal the computer station and room.
- End the reveal at the default first-person spawn position.
- Ensure the transition can complete even if assets load slowly.
- Add a skip path for repeat viewers or poor-performance devices.
- Keep the session timer updating during the animation.

### [x] Phase 8: First-person WASD movement

#### Summary

Allow the unlocked user to walk through Level 1 in first person. This phase achieves W8.

#### Implementation spec

- Implement WASD movement for the first-person camera.
- Keep movement constrained to the Level 1 room bounds.
- Add simple collision or soft boundaries for walls and major objects.
- Keep movement speed comfortable for a small room.
- Do not sync movement to other users yet.
- Verify that movement controls do not break the existing hold-to-ready flow.

### [x] Phase 9: Tab top-down view

#### Summary

Add the alternate map-like camera view. This phase achieves W9.

#### Implementation spec

- Pressing Tab should switch to a top-down camera view.
- Prefer hold-to-view for the first implementation.
- Use the top-down camera settings from the Level 1 config.
- Keep station positions and the local user position readable.
- Return cleanly to first-person view when Tab is released.
- Verify that Tab behavior does not conflict with browser or Discord focus expectations.

### [x] Phase 10: Station-based user presence

#### Summary

Represent all current session users in the 3D world without syncing free-roam movement yet. This phase achieves W5 and W6.

#### Implementation spec

- Map current session users into available Level 1 station positions.
- Assign each participant a stable station for the current session.
- Show a simple seated avatar, silhouette, or marker at each occupied station.
- Show display name, avatar color, avatar image, or initials near the station.
- Indicate whether the user is local, host, idle, ready, or spectating.
- Keep this presence derived from existing session state.
- Do not add networked avatar movement yet.

### [x] Phase 11: 3D session phase feedback

#### Summary

Make Level 1 react to the same session phases as the normal timer app. This phase deepens W7.

#### Implementation spec

- Reflect idle, lobby, armed, precount, countdown, and completed phases in the 3D room.
- Use simple lighting, monitor glow, screen color, or small effects.
- Keep effects lightweight and readable.
- During armed state, make the room visibly tense or charged.
- During precount, focus attention on the timer surface.
- During completed state, trigger a restrained celebration effect.
- Avoid adding sound or heavy particles in this phase unless they are trivial.

### [x] Phase 12: Level registry

#### Summary

Prepare the codebase for future levels without building Level 2 yet. This phase achieves W10 and supports W12.

#### Implementation spec

- Add a level registry that can return Level 1 by id.
- Keep level selection separate from level rendering.
- Support metadata, spawn points, station positions, camera presets, collision bounds, lights, and display surfaces.
- Ensure Level 1 is loaded through the registry instead of direct imports everywhere.
- Do not add a visible level selector yet.

### [x] Phase 13: Hidden-world fallback and recovery

#### Summary

Make the secret 3D mode recoverable if something fails. This phase supports W1 through W12 by protecting the normal app experience.

#### Implementation spec

- Add graceful fallback for WebGL failure.
- Add loading and error states for the 3D mode.
- Preserve an exit path back to the normal timer app.
- Keep the normal timer app as the stable fallback experience.
- Add a simple manual test checklist for entering, exiting, unlocking, movement, Tab view, and timer updates.
- Confirm that failed 3D loading does not break the regular activity.

### [x] Phase 14: Future-level planning pass

#### Summary

Document how richer future levels, secrets, interactables, and stronger multiplayer presence should build on Level 1. This phase covers W12 without expanding the code prematurely.

#### Implementation spec

- Add notes for future level themes and unlock paths.
- Define what belongs in a future level config versus global 3D systems.
- Identify where interactable objects would plug into the session state or sync layer.
- Identify what would be needed for free-roaming synced avatars.
- Keep this phase mostly documentation unless tiny code comments or type placeholders are useful.

Implementation principles:

- Keep the 3D mode modular.
- Keep session rules outside the 3D renderer.
- Keep the first level small but atmospheric.
- Prefer one excellent reveal and one stable room over a large unfinished world.
- Build the level system early enough that Level 1 does not become hard-coded everywhere.
- Treat Discord performance as a first-class constraint.
- Make the hidden world feel secret, but keep the app recoverable and understandable once users are inside it.
