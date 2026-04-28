# Secret 3D World Vision 17 - Customizable Shared Player Avatars

## Purpose

Vision 17 makes the hidden 3D world feel social by turning player presence into readable bodies.

Users should be able to see their own body and their friends' bodies in the 3D world. Those bodies should use one shared avatar system, sit correctly on the floor, and become customizable from the Escape menu.

This is a social presence pass first. It should avoid heavy imported character models until the primitive avatar behavior, customization shape, and sync expectations are solid.

## Product Recommendation

Build a reusable `PlayerAvatar` system.

- Render friends as full stylized player avatars instead of one-off presence markers.
- Render the local user as a visible body in top-down and free-cam views.
- Keep the existing first-person camera-attached body for first-person view, but move it toward the same visual language as `PlayerAvatar`.
- Add an `Avatar` tab to the Escape menu for local customization.
- Start with local-only customization, then add synced avatar choices in a follow-up phase.
- Fix the current floating body issue before adding richer customization.

Recommended first avatar style:

- Primitive geometry, not external character assets.
- Feet-on-floor origin.
- Capsule/box torso, head, arms, legs, shoes, and a direction indicator.
- Nameplate above the head.
- Host/ready/accent color treatment.
- Optional held-item state for studio guitar later.

## Why Now

V16 cleaned the world topology and lazy-loaded the hidden 3D shell. The next thing that will make the world feel alive is seeing people occupy it.

Current strengths:

- The app already tracks `freeRoamPresence` with `levelId`, `areaId`, `position`, `yaw`, and `updatedAt`.
- `ThreeDModeShell` already reports local free-roam pose.
- `Level1RoomShell` already renders fresh remote presence for real users in the same level.
- Sim users already have a local-only roaming visualization path.
- A local first-person body already exists.
- The Escape menu already has tabs, settings state, and local 3D controls.

Current pressure:

- Friend bodies and sim bodies are separate visual components.
- Current markers are more like labels/stand-ins than true player bodies.
- The local body is only visible in first-person.
- Avatar appearance cannot be customized.
- Some roaming characters appear to float because avatar pose height and avatar mesh origin are mixed together.

## Code Facts

Facts from code review on 2026-04-22:

- `src/3d/FreeRoamPresenceMarker.tsx` renders remote free-roam users as a simple torso/head marker with a label.
- `src/3d/SimBotRoamingMarker.tsx` renders idle test users with a separate sim-only marker.
- `src/3d/simBotRoaming.ts` defines sim waypoints with `y = 1.7`, then `SimBotRoamingMarker` adds body/head mesh offsets above that group origin.
- `src/3d/ThreeDModeShell.tsx` has `FirstPersonBody`, which attaches a local body group to the camera for first-person view.
- `src/3d/ThreeDModeShell.tsx` stores local `threeDSettings` and renders `EscapeMenuOverlay`.
- `EscapeMenuTab` currently includes `visual`, `movement`, `graphics`, and `studio`.
- `src/3d/Level1RoomShell.tsx` filters out the local user from `freeRoamOccupants`, so remote marker rendering does not duplicate the local player.
- `src/3d/Level1RoomShell.tsx` renders `FreeRoamPresenceMarker` for real remote users with fresh presence in the current level.
- `src/3d/Level1RoomShell.tsx` renders `SimBotRoamingMarker` for idle test users when sim roaming is enabled.

## Target Architecture

Avatar pose should have a clear coordinate contract:

```text
presence.position = player feet / floor origin
avatar local meshes = body/head offsets above origin
camera position = eye height above origin
```

The avatar renderer should be shared:

```text
PlayerAvatar
  - local top-down avatar
  - remote friend avatar
  - sim bot avatar
  - future mirrors/cameras
```

The first-person body can remain camera-attached, but it should share avatar customization values where practical.

Customization should be separated from pose:

```text
PlayerAvatarAppearance
  - body color
  - accent/head color
  - suit preset
  - nameplate visibility
  - optional height/scale
```

Pose and identity should stay separate:

```text
PlayerAvatarPose
  - position
  - yaw
  - levelId
  - areaId
  - updatedAt
```

Suggested first type shape:

```ts
type PlayerAvatarSuitPreset = "sync" | "studio" | "range" | "neon";

interface PlayerAvatarAppearance {
  bodyColor: string;
  accentColor: string;
  suitPreset: PlayerAvatarSuitPreset;
  showNameplate: boolean;
  scale: number;
}
```

Default appearance should be deterministic before customization exists:

- Derive default body/accent colors from `avatarSeed`.
- Give host users a gold accent treatment.
- Give ready users a readable ready glow/ring.
- Give test users a distinct sim accent.
- Let the local user follow the same defaults unless local customization overrides them.

## Design Direction

The avatar should feel like it belongs in the current hidden world: clean, readable, slightly toy-like, and built from simple 3D forms.

Avoid realism at first. The current world is made from strongly readable primitives, glowing monitors, in-world labels, and functional props. Primitive avatars will look intentional, load cheaply, and be easier to customize.

The body should be readable from:

- first-person, when looking down at yourself
- top-down player cam
- top-down free-cam
- another player's first-person view
- Level 1 and Level 2

Nameplates should remain useful but not dominate the room. They should be optional in the Escape menu once customization lands.

## Polish Requirements

V17 should feel grounded, readable, and personal, not just technically present.

- Add a live avatar preview in the Escape menu Avatar tab so users can customize without repeatedly closing the menu.
- Add basic remote movement smoothing as part of the first shared-avatar rendering pass, not only as later polish.
- Treat raised platforms and traversal surfaces as part of the floor-height problem; do not assume every avatar can always sit at `y = 0`.
- Make nameplates distance-aware enough to avoid crowding first-person view.
- Default local nameplate off when viewing your own body; default friend nameplates on.
- Keep avatar status readable without relying only on color.
- Keep avatar rendering cheap enough for several friends plus sim users.

## Nameplate Rules

Initial nameplate behavior should be explicit:

- Friend nameplates are visible by default.
- Sim nameplates are visible by default but clearly marked as sim/test users.
- Local nameplate is hidden by default for the local world-space body.
- Top-down view can show nameplates more aggressively because spatial readability matters.
- First-person view should avoid overwhelming labels at close range.
- Nameplate visibility should be controllable from the Avatar tab or, if the implementation fits better, the Graphics tab.

## Performance Budget

Keep the avatar pass lightweight:

- Use primitive geometry for the first implementation.
- Avoid imported rigged models in V17.
- Memoize canvas label textures.
- Do not recreate nameplate canvases every frame.
- Cap material and mesh count per avatar.
- Test with multiple idle sim users plus at least two real clients.
- Avoid undoing the V16 hidden-world lazy-load improvement with eager imports from the normal app shell.

## Phase Plan

- [x] V17-1: Document Avatar Coordinate Contract And Floating Fix.
- [x] V17-2: Add Shared `PlayerAvatar` Primitive Component.
- [x] V17-3: Replace Friend And Sim Markers With `PlayerAvatar` And Basic Smoothing.
- [x] V17-4: Render Local Avatar In Top-Down And Free-Cam.
- [x] V17-5: Add Escape Menu Avatar Customization And Preview.
- [x] V17-6: Persist Local Avatar Settings.
- [hold] V17-7: Sync Avatar Appearance To Friends.
- [hold] V17-8: Add Richer Animation And Held-Item States.

## Manager Execution Plan

Run V17 one phase at a time. Only one phase should be marked `[~]` while work is active.

Recommended delegation model:

- Manager owns phase activation, scope control, final review, build verification, and marking phases complete.
- Worker can own implementation for one narrow phase when files do not overlap with another active worker.
- Explorer can do read-only checks before a risky phase, especially floor-height logic, Escape menu state, or shared sync state.
- Do not run parallel workers against the same files unless their write scopes are clearly separated.
- Every code phase needs a `changelog.md` entry and `npm.cmd run build`.
- Manual browser checks can be batched after V17-4 and again after V17-6.

Recommended order:

1. V17-1 as a small manager or worker patch: fix/lock the coordinate contract first.
2. V17-2 as a worker-friendly isolated component build.
3. V17-3 as the first integration phase, manager-reviewed closely.
4. V17-4 as a manager or worker integration phase in `ThreeDModeShell`.
5. V17-5 as a UI-heavy phase, ideally manager-led or a focused worker with clear style scope.
6. V17-6 as a small persistence phase after the Avatar tab feels right.
7. V17-7 stays on hold until local customization is proven.
8. V17-8 stays on hold until the shared body system is stable.

Suggested worker split:

- Worker A, V17-1: `src/3d/simBotRoaming.ts`, marker floor-origin helpers only.
- Worker B, V17-2: `src/3d/PlayerAvatar.tsx` and optional `src/3d/playerAvatar.ts` only.
- Worker C, V17-3: marker replacement and smoothing only after V17-2 lands.
- Worker D, V17-5: Escape menu Avatar tab and CSS only after V17-4 lands.

Stop conditions:

- Stop and review if camera movement feel changes unexpectedly.
- Stop and review if avatar rendering requires changing session reducer/shared sync state before V17-7.
- Stop and review if the normal 2D app begins importing 3D avatar code outside the lazy hidden-world chunk.
- Stop and review if the local user appears twice in first-person.

## Phase Dependencies

```text
V17-1 floor-origin contract
  -> V17-2 PlayerAvatar component
    -> V17-3 remote/sim replacement + smoothing
      -> V17-4 local top-down avatar
        -> V17-5 Escape menu customization + preview
          -> V17-6 local persistence
            -> V17-7 synced appearance (hold)
              -> V17-8 richer animation (hold)
```

## Review Checkpoints

- After V17-1: verify the floating-character bug is gone before adding new visuals.
- After V17-2: verify `PlayerAvatar` is generic and not coupled to sim/free-roam state.
- After V17-3: verify friends and sims share visuals and remote movement smoothing is render-only.
- After V17-4: verify the local body appears in top-down/free-cam and never duplicates in first-person.
- After V17-5: verify Avatar tab controls are usable, preview works, and existing Escape menu tabs are unchanged.
- After V17-6: verify localStorage persistence is versioned and failure-safe.

## V17-1: Document Avatar Coordinate Contract And Floating Fix

Status: `[x]` complete.

### Summary

Fix the vertical anchor bug before building richer avatars.

### Implementation Spec

Expected files:

- `src/3d/simBotRoaming.ts`
- `src/3d/FreeRoamPresenceMarker.tsx`
- `src/3d/SimBotRoamingMarker.tsx`
- `src/3d/ThreeDModeShell.tsx`
- Possibly a new shared avatar constants/helper file.

Worker handoff:

- This can be a worker task.
- Own only coordinate/floor-origin behavior.
- Do not build the new `PlayerAvatar` component in this phase.
- Do not touch Escape menu or customization code.
- Report whether `freeRoamPresence.position` is currently camera-height or floor-origin after inspection.

Expected work:

- Treat avatar group position as feet/floor origin.
- Stop using `y = 1.7` sim waypoints as full avatar group origins.
- Convert sim routes to floor-origin positions, likely `y = 0`.
- Decide whether `freeRoamPresence.position` currently means camera/eye position or feet/floor position.
- If presence currently stores camera/eye height, convert it before rendering avatars.
- Reuse existing movement floor/platform height helpers where possible so avatars can stand on raised studio platforms and ramps.
- Avoid changing camera movement feel in this phase.

### Acceptance Criteria

- Sim roaming bodies no longer float above the floor.
- Real remote friend markers no longer float when viewed in the same level.
- Body feet/ring/direction indicator sit at the visible floor height.
- Bodies on raised traversal surfaces do not obviously hover or sink.
- Existing presence TTL and level filtering remain unchanged.

### Manual Checks

- Add idle sim users and verify they walk on the Level 1 floor.
- Enter `level-2-range` and verify default sim/friend avatar positioning still sits on the range floor.
- Walk up/down any current platform/ramp surfaces and verify friend avatars do not obviously hover or sink.

### Checklist Items Achieved

- Confirmed `freeRoamPresence.position` currently stores camera/eye-height pose, not feet-origin avatar pose.
- Kept shared presence and movement semantics unchanged.
- Converted remote free-roam marker render position locally from eye height to feet/floor origin.
- Converted sim roaming route waypoints from the old `y = 1.7` group origin to explicit floor-origin waypoints.
- Preserved sim roaming's local-only behavior and existing `?simRoam=0` control.

### Completed Implementation

- `src/3d/simBotRoaming.ts` now uses `FLOOR_ORIGIN_Y = 0` for sim route waypoints.
- `src/3d/FreeRoamPresenceMarker.tsx` now subtracts the known 1.7 eye height when placing the marker group, preserving traversal/platform height encoded in the camera-height pose.
- `changelog.md` includes V17-1.
- Build result: worker `npm.cmd run build` passed with the existing Vite large async chunk warning.

## V17-2: Add Shared `PlayerAvatar` Primitive Component

Status: `[x]` complete.

### Summary

Create one reusable avatar renderer for local, remote, and sim bodies.

### Implementation Spec

Expected files:

- `src/3d/PlayerAvatar.tsx`
- Possibly `src/3d/playerAvatar.ts`

Worker handoff:

- This is the cleanest worker task.
- Own only the new avatar component/types/helpers.
- Do not replace existing markers yet.
- Do not touch `ThreeDModeShell.tsx` except for type imports if truly unavoidable.
- Include a default appearance helper so later phases do not duplicate color logic.

Expected work:

- Add `PlayerAvatar` props for user identity, appearance, pose/yaw, host state, ready state, local/remote/sim mode, and optional nameplate.
- Add default appearance helpers derived from user identity and status.
- Use primitive geometry only.
- Include torso, head, arms, legs, feet, floor ring, direction indicator, and label/nameplate.
- Reuse the existing canvas-label approach where it still makes sense.
- Keep material count and geometry complexity conservative.

### Acceptance Criteria

- Component renders in isolation without relying on free-roam or sim-specific state.
- Avatar reads clearly from first-person and top-down distances.
- Host and ready states are visually distinguishable.
- Test users have a distinct sim/test treatment.
- Avatar colors can be provided by props.

### Checklist Items Achieved

- Added shared avatar appearance, identity, pose, mode, and presence types.
- Added deterministic default appearance helpers based on `avatarSeed`, mode, host state, ready state, and test-user state.
- Added a reusable primitive `PlayerAvatar` component with feet-origin rendering.
- Included torso, head, arms, legs, feet, floor ring, direction marker, host marker, sim marker, and optional nameplate.
- Kept the component isolated from existing marker integration paths.

### Completed Implementation

- `src/3d/PlayerAvatar.tsx` defines shared avatar types, default/resolve helpers, primitive avatar rendering, and memoized canvas nameplate behavior.
- `changelog.md` includes V17-2.
- Build result: worker `npm.cmd run build` passed with the existing Vite large async chunk warning.

## V17-3: Replace Friend And Sim Markers With `PlayerAvatar` And Basic Smoothing

Status: `[x]` complete.

### Summary

Remove duplicated marker visuals and route both real free-roam users and idle sim users through the shared avatar. Add basic movement smoothing so remote avatars do not snap between 500ms presence updates.

### Implementation Spec

Expected files:

- `src/3d/FreeRoamPresenceMarker.tsx`
- `src/3d/SimBotRoamingMarker.tsx`
- `src/3d/PlayerAvatar.tsx`
- `src/3d/Level1RoomShell.tsx`

Worker handoff:

- This can be delegated after V17-2 lands.
- Own remote friend marker replacement, sim marker replacement, and smoothing.
- Do not change local first-person body.
- Do not add Escape menu customization.
- Do not write smoothed/interpolated positions into shared session state.

Expected work:

- Either replace internals of `FreeRoamPresenceMarker` and `SimBotRoamingMarker`, or remove them in favor of direct `PlayerAvatar` rendering.
- Preserve the current fresh-presence filtering and same-level filtering.
- Preserve `?simRoam=0`.
- Preserve station occupant markers when users are not in fresh free-roam presence.
- Keep sim roaming local-only and do not send network events for sims.
- Interpolate remote real-user avatar movement between the previous rendered pose and the latest fresh presence pose.
- Keep smoothing local/render-only; do not write interpolated positions back to shared session state.
- Sim roaming can keep its existing per-frame route movement, but should render through the shared avatar.

### Acceptance Criteria

- Friends and sims use the same body shape.
- Sims still roam only when enabled.
- Remote real users still render only when their presence is fresh and in the same level.
- Remote real users glide toward new presence positions instead of snapping hard.
- No local duplicate appears in first-person.

### Checklist Items Achieved

- Routed real free-roam markers through `PlayerAvatar`.
- Routed sim roaming markers through `PlayerAvatar`.
- Preserved existing Level 1 caller filtering, stale-presence filtering, same-level filtering, station occupant behavior, and `?simRoam=0` behavior.
- Added render-only damped position/yaw smoothing for remote real-user free-roam markers.
- Kept sim roaming local-only and did not add shared/session writes.

### Completed Implementation

- `src/3d/FreeRoamPresenceMarker.tsx` now wraps `PlayerAvatar` in a smoothed group driven by the latest remote presence target.
- `src/3d/SimBotRoamingMarker.tsx` now wraps `PlayerAvatar` while preserving its existing per-frame route movement.
- `src/3d/PlayerAvatar.tsx` now owns the shared avatar types/helpers after folding the helper exports into one correctly-cased Windows-safe file.
- `changelog.md` includes V17-3.
- Build result: worker `npm.cmd run build` passed with the existing Vite large async chunk warning.

## V17-4: Render Local Avatar In Top-Down And Free-Cam

Status: `[x]` complete.

### Summary

Let the user see their own full body when the camera is not first-person.

### Implementation Spec

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/PlayerAvatar.tsx`

Worker handoff:

- This can be manager-led or worker-led after V17-3.
- Own only local world-space avatar rendering.
- Keep the existing `FirstPersonBody` path alive.
- Do not change remote avatar smoothing.
- Do not add customization UI.

Expected work:

- Render a local `PlayerAvatar` from `localPlayerPoseRef.current` in top-down player-cam and top-down free-cam.
- Keep the existing camera-attached `FirstPersonBody` for first-person mode.
- Do not render a duplicate local world avatar in first-person unless a later mirror/camera feature requires it.
- Ensure the local avatar updates while the player moves.
- Hide the local world-space nameplate by default.

### Acceptance Criteria

- Pressing Tab to top-down shows the local user's body at the actual floor position.
- Free-cam still shows the local body in the world.
- Returning to first-person hides the world-space local body and keeps the camera-attached body.
- Local body does not block interactions, reticle targeting, or pointer lock.

### Checklist Items Achieved

- Rendered a local world-space `PlayerAvatar` only while top-down mode is active.
- Kept the existing camera-attached `FirstPersonBody` path unchanged for first-person.
- Used the same eye-height to feet-origin conversion established in V17-1.
- Resolved local avatar identity from joined session user data with an unjoined fallback.
- Kept the local world-space nameplate hidden by default.

### Completed Implementation

- `src/3d/ThreeDModeShell.tsx` now imports `PlayerAvatar`.
- Added `LocalWorldPlayerAvatar`, driven by `localPlayerPoseRef`.
- Added local identity resolution from `users`/`localUserId`.
- `changelog.md` includes V17-4.
- Build result: worker `npm.cmd run build` passed with the existing Vite large async chunk warning.

## V17-5: Add Escape Menu Avatar Customization And Preview

Status: `[x]` complete.

### Summary

Add an Escape menu `Avatar` tab where the user can customize their body and see a live preview.

### Implementation Spec

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/PlayerAvatar.tsx`
- `src/styles/global.css`

Worker handoff:

- This can be delegated to a UI-focused worker after V17-4.
- Own Escape menu `Avatar` tab, preview, controls, and styles.
- Avoid broad Escape menu refactors.
- Do not add shared sync/state reducer changes.
- Keep controls compact and consistent with existing Escape menu UI.

Expected work:

- Add `avatar` to `EscapeMenuTab`.
- Add a new `Avatar` tab button in the Escape menu.
- Extend 3D settings or add a dedicated local avatar settings state.
- Render a compact live avatar preview inside the Avatar tab.
- Add controls for:
  - body color
  - accent/head color
  - suit preset
  - nameplate visibility
  - optional height/scale
- Prefer compact swatches, segmented controls, toggles, and sliders.
- Apply changes immediately to the local first-person/top-down avatar.
- Apply changes immediately to the Avatar tab preview.
- Remote friends can keep default appearance until V17-7.

### Acceptance Criteria

- Escape menu includes an Avatar tab.
- Avatar tab includes a live preview.
- Changing avatar controls updates the local visible body immediately.
- Changing avatar controls updates the preview immediately.
- Nameplate visibility can be toggled.
- Existing Visual, Movement, Graphics, and Studio tabs still work.
- Pointer lock and Escape menu open/close behavior remains unchanged.

### Checklist Items Achieved

- Added `avatar` to the Escape menu tab set.
- Added local-only avatar appearance state.
- Added a live `PlayerAvatar` preview inside the Escape menu Avatar tab.
- Added body color swatches, accent/head color swatches, suit preset segmented controls, nameplate toggle, scale slider, and reset action.
- Applied avatar changes immediately to the local top-down/free-cam avatar and preview.
- Added a minimal first-person body color pass without changing first-person body behavior.
- Kept remote friends and sims on default appearances.

### Completed Implementation

- `src/3d/ThreeDModeShell.tsx` now owns local avatar appearance state and Avatar tab controls.
- `src/styles/global.css` now includes Avatar tab layout, preview, swatches, and segmented controls.
- `changelog.md` includes V17-5.
- Build result: worker `npm.cmd run build` passed with the existing Vite large async chunk warning.

## V17-6: Persist Local Avatar Settings

Status: `[x]` complete.

### Summary

Remember local avatar customization across hidden-world exits and page refreshes.

### Implementation Spec

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- Possibly `src/3d/playerAvatarSettings.ts`

Worker handoff:

- This is a small manager or worker task after V17-5.
- Own localStorage schema, validation, defaults, and reset behavior.
- Do not sync settings to other clients.
- Do not store invalid arbitrary CSS values without sanitizing.

Expected work:

- Store local avatar settings in localStorage.
- Version the stored schema.
- Fall back safely to defaults if saved settings are invalid.
- Keep persistence local-only in this phase.
- Persist only local appearance preferences; do not mutate shared `SessionUser` data in this phase.

### Acceptance Criteria

- Avatar settings survive exiting and re-entering the hidden world.
- Avatar settings survive page refresh.
- Invalid stored values do not crash the hidden world.
- Custom settings apply to the first-person body, local top-down body, and Avatar tab preview.
- Build passes.

### Checklist Items Achieved

- Added a versioned localStorage key and payload for local avatar appearance only.
- Lazy-loaded the initial local avatar appearance state from storage.
- Normalized stored and in-memory appearance data against the existing swatches, presets, boolean visibility flag, and scale range.
- Kept accent and head color tied together through the existing accent control path.
- Preserved the Avatar tab preview, top-down/free-cam body, and first-person body from the same local appearance state.

### Completed Implementation

- `src/3d/ThreeDModeShell.tsx` now loads and saves the local avatar appearance through a versioned localStorage envelope with defensive sanitization and safe default fallback.
- `changelog.md` includes the V17-6 completion entry.
- Build result: `npm.cmd run build` passed with the existing Vite large chunk warning.

## V17-7: Sync Avatar Appearance To Friends

Status: `[hold]` on hold.

### Summary

Share avatar choices so friends see each user's custom appearance.

### Reason For Hold

This phase changes shared/session state and should happen after the local avatar controls feel right.

Manager note:

- Do not dispatch this until V17-1 through V17-6 are complete and manually checked.
- This phase likely needs a fresh reducer/sync review before coding.

### Future Work

- Add avatar appearance to session user profile or a dedicated shared avatar state.
- Sanitize appearance updates in the session reducer.
- Send appearance updates through the sync client.
- Ensure late joiners receive current avatar appearance.
- Decide whether avatar appearance belongs to global profile, per-session user state, or local-only profile broadcast.

## V17-8: Add Richer Animation And Held-Item States

Status: `[hold]` on hold.

### Summary

Add motion polish after the shared body and customization system exists.

Manager note:

- Do not dispatch this until the shared avatar body is stable and the render budget is understood.
- Animation should be incremental and easy to disable if it harms readability or performance.

### Future Work

- Walking bob or simple leg swing.
- Idle breathing.
- Guitar held state.
- Door/use interaction pose.
- Range aiming pose.
- Optional dance/gesture controls.

## Non-Goals

- Do not import heavy character model assets in the first implementation pass.
- Do not add account-wide profile editing outside the hidden world.
- Do not change the normal 2D dashboard.
- Do not redesign sync membership or party travel.
- Do not make sim roaming networked.

## Build And Manual Checks

- Run `npm.cmd run build` after implementation phases.
- In a single-client mock session, add test users and verify sim bodies walk on the floor.
- Open with `?simRoam=0` and verify sim roaming bodies are hidden.
- Add four test users and verify avatar rendering remains readable and smooth.
- In two browser clients, verify remote friend avatar appears in the same level.
- In two browser clients, verify remote friend movement is smoothed rather than snapping between presence updates.
- In two browser clients, place users in different levels and verify avatars do not leak across levels.
- Move one client through the Level 1 RANGE door while the other stays in Level 1 and verify presence/avatar cleanup is correct.
- Verify remote friend avatar disappears on Exit, level change, or stale timeout.
- Verify local top-down body appears and first-person local duplicate does not.
- Verify Escape menu Avatar tab controls update local body live.
- Verify Escape menu Avatar tab preview updates live.
- Verify local avatar settings persist after refresh once V17-6 lands.

## Open Questions

- Should the first synced avatar appearance be stored on `SessionUser` or in a separate `avatarAppearanceByUserId` map?
- Should avatar customization be available before joining a session, or only after entering the hidden world?
- Should nameplates default on for friends and off for the local user?
- Should local top-down body use the display name/avatar seed even before joining the session?
- Should the first version include height/scale, or save it for after collision and camera expectations are stable?
