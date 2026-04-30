# Globe Panel Plan

## Summary

Add a new dashboard panel called `Globe`: a dark, blue, wireframe 3D globe that slowly spins and visualizes the current sync session as a connected network map. The panel should show one server point on the globe plus one orbiting satellite per connected user. Each satellite should keep a glowing connection line back to the server point.

The first implementation should be visual-first and privacy-safe. It should not try to infer exact user locations automatically. By default, users are represented as satellites orbiting the globe, not as surface locations.

## Design Direction

- Match the current blue dashboard theme rather than the green startup console theme.
- Use a dark glass panel shell consistent with the existing dashboard.
- Render the globe with Three.js / React Three Fiber, already present in the project.
- Keep the 3D scene inside the dashboard panel, not as a full-screen hidden-world scene.
- Use a wireframe globe, subtle latitude/longitude rings, blue glow, small points, orbiting satellites, and animated connection lines/arcs.
- Keep the panel readable at dashboard sizes and avoid adding heavy labels directly on top of the globe.

## Location Recommendation

Relative location is possible later, but exact location should not be the default. The default visual should avoid implying we know where a user is.

Recommended tiers:

1. **Phase 1: User satellites**
   - Generate stable satellite orbit lanes from user ids and the session id.
   - This gives every connected user a repeatable orbiting node for the current session.
   - Satellites connect to the server point with glowing lines.
   - No new permissions, no IP lookup, and no privacy concerns.

2. **Phase 2: VPN visual fake surface point**
   - When the user turns on the visual VPN mode, create a random fake surface point on the globe.
   - Connect the local user's satellite to that fake point.
   - Connect the fake point to the server as a routed visual path.
   - Make it clear this is visual only and does not change the real connection.

3. **Phase 3: Optional coarse browser geolocation**
   - Add an explicit opt-in button such as `Share coarse location`.
   - Use the browser Geolocation API only after the user clicks.
   - Round coordinates heavily, for example to a city/region-sized grid.
   - Make it clear this is visual only.

4. **Phase 4: Optional server/IP region**
   - Only if the app later has a backend endpoint that can safely map IP to coarse region.
   - Avoid storing raw IPs or exact coordinates in session state.

For the current goal, start with orbiting satellites and a fun `VPN` visual toggle that creates a fake surface route.

## VPN Visual Mode

Add a playful local visual toggle called something like `VPN Route`.

- This does not affect networking, latency, sync routing, Discord state, or the real server.
- When enabled, the local user's satellite stays in orbit and a random fake location point appears on the globe surface.
- The fake point connects to the local user's satellite and to the server point.
- The local user remains connected to the same real server point.
- The globe can show a small status like `VPN VISUAL: ON`.
- In a later synced phase, this preference could be broadcast so other users see the same spoofed visual route.

## Data Model Strategy

Keep the first phases local and derived from existing session data:

- Server point:
  - Use a fixed `serverLocation` constant for now, such as a named region and lat/lon.
  - Later, read from sync server config if we add real deployment regions.

- User satellites:
  - Use `state.users`.
  - Derive a stable orbit lane, orbit phase, orbit speed, and satellite color/accent from each `SessionUser.id`.
  - Render satellites outside the globe radius so they clearly read as connection nodes, not actual locations.
  - Use display name/avatar initials only in small hover/details UI, not cluttered globe labels.

- Local VPN visual:
  - Store local toggle state in `MainScreen`.
  - Derive a fake surface coordinate for only the local user when enabled.
  - Render a route chain: `satellite -> fake surface point -> server`.
  - Do not write it into synced session state in the first implementation.

## Accessibility And Fallback

- The globe panel should have a non-canvas text summary beside or below the scene.
- The summary can list:
  - server region
  - connected users count
  - satellite count
  - local visual route state
- If WebGL is unavailable, show the summary and a static styled fallback grid.
- Respect `prefers-reduced-motion` by pausing or greatly slowing spin/arc animation.

## Implementation Phases

## GP-1: Plan And Placement

Status: [ ] Not started.

Goal: Decide where the panel lives and define the visual/data contract before adding rendering code.

Scope:

- Confirm the dashboard layout slot.
- Choose whether the panel appears between `LobbyPanel` and `TimerPanel`, below them, or inside a new secondary dashboard row.
- Document the first data contract for server/user visual nodes.

Suggested implementation:

- Keep `LobbyPanel` and `TimerPanel` in the existing top grid.
- Add `GlobePanel` as a full-width panel below the top grid for phase one.
- Later, it can move into a configurable dashboard layout.

Verification:

- No code required unless the plan changes.

## GP-2: Pure Globe Data Helpers

Status: [x] Completed and manager-verified.

Goal: Add deterministic, testable helpers that convert session users into visual globe satellites and routes.

Files likely touched:

- `src/lib/globe/globePoints.ts`
- `tests/globePoints.test.ts`

Scope:

- Define `GlobePoint`, `GlobeSatellite`, `GlobeConnection`, and `GlobeRouteModel` types.
- Add fixed server location constant.
- Add stable user satellite orbit generation from user id/session id.
- Add local VPN fake surface coordinate helper.
- Add lat/lon to 3D vector helper.
- Add orbit lane/phase to 3D vector helper.

Acceptance checks:

- Same user/session produces the same satellite orbit data.
- Different users usually produce different orbit lanes/phases.
- VPN fake surface coordinate differs from the satellite position and is on the globe surface.
- Coordinates stay inside valid latitude/longitude ranges.

Verification:

- Run `npx.cmd tsx --test tests/globePoints.test.ts`.

### Summary

Prepare the non-React globe route model so later phases can render the panel without embedding session/user math inside the component. This phase must stay pure and local: no React, no Three.js imports, no browser APIs, no sync events, no reducer changes, and no dashboard UI.

### Implementation Spec

Create `src/lib/globe/globePoints.ts` with exported types and helpers for the first globe visual model:

- `GlobeVector3`: readonly tuple `[number, number, number]`.
- `GlobePoint`: id, label, kind, latitude, longitude, radius, position.
- `GlobeSatellite`: id, userId, label, avatarSeed, optional `isLocal`, optional `isTestUser`, orbitRadius, orbitTilt, orbitPhase, orbitSpeed, position.
- `GlobeConnection`: id, fromId, toId, kind, from, to.
- `GlobeRouteModel`: server point, satellites, connections, optional vpnSurfacePoint, optional vpnConnections.
- `SERVER_GLOBE_POINT`: fixed blue-theme server point on the globe surface. Use a named region label, but keep it fictional enough that it does not imply exact deployment location.

Add helpers:

- `latLonToVector3(latitude, longitude, radius = 1)`: converts degrees to a 3D vector.
- `createGlobeRouteModel(options)`: accepts `{ sessionId, users, localUserId?, vpnVisualEnabled? }`.
- `createSatelliteForUser(...)` or equivalent internal helper that derives stable orbit radius/tilt/phase/speed from `sessionId` and `user.id`.
- `createVpnSurfacePoint(...)` or equivalent helper that derives a stable fake surface point for the local user when VPN visual mode is enabled.

Model rules:

- Server point is always on the globe surface.
- Every connected user gets one satellite outside the globe radius.
- Satellite placement must be deterministic for the same `sessionId + user.id`.
- Satellite positions must not use or imply real user location.
- Default connections are `server -> satellite` for each satellite.
- VPN mode only affects the local user:
  - create one fake surface point on the globe;
  - add `satellite -> fake surface point` and `fake surface point -> server` VPN connections;
  - keep the normal `server -> satellite` connection in the model.
- If there is no local user or the local user is not in `users`, VPN mode should not create a fake point.
- Keep exported values friendly to tests and renderer code. Do not export test-only internals unless they are genuinely reusable.

Test coverage in `tests/globePoints.test.ts`:

- server point stays on the globe surface and has a valid latitude/longitude.
- same session/user produces stable satellite orbit data and position.
- different users produce distinct satellite ids and usually distinct phases/positions.
- all satellite radii are greater than the globe surface radius.
- route model creates one satellite and one default server connection per user.
- VPN disabled has no fake point or VPN connections.
- VPN enabled for the local user creates a fake surface point and exactly two VPN route connections.
- VPN enabled without a matching local user does not create fake VPN route data.

### Checklist Items Achieved

- Added pure globe route model types.
- Added deterministic server, satellite, connection, and VPN fake surface point helpers.
- Added focused tests for route invariants and VPN route behavior.

### Completed Implementation

- Created `src/lib/globe/globePoints.ts`.
- Created `tests/globePoints.test.ts`.
- Manager reviewed the implementation and confirmed it stayed inside the approved pure-helper boundary.

### Acceptance Criteria

- The helper file compiles under the app TypeScript config.
- The focused test command passes.
- No UI, CSS, package, sync, reducer, or session event files are changed in this phase.

### Build And Manual Checks

- `npx.cmd tsx --test tests/globePoints.test.ts` passed.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.

### Risks

- Coordinate math can silently look wrong until rendered. Keep the model simple and test the invariants that matter.
- Avoid over-designing route types for future real geolocation. This phase only needs server, satellites, and local fake VPN route data.

### Wishlist Mapping

- Supports privacy-safe user satellites.
- Supports server-to-user connection lines.
- Supports later visual VPN fake-location routing.

### Non-Goals

- No rendered globe.
- No dashboard layout changes.
- No local storage.
- No browser geolocation or IP lookup.
- No synced VPN state.
- No real network or latency behavior changes.

## GP-3: Static Globe Renderer

Status: [x] Completed and manager-verified.

Goal: Create a reusable 3D globe component that renders without session behavior changes.

Files likely touched:

- `src/components/GlobePanel.tsx`
- `src/styles/global.css`

Scope:

- Use `@react-three/fiber`.
- Render a dark globe sphere with wireframe/ring geometry.
- Render server point on the globe surface.
- Render one orbiting satellite per connected user.
- Render simple connection lines/arcs from server to satellites.
- No controls yet.
- No real location APIs.

Acceptance checks:

- Globe renders in the dashboard.
- Server point and user satellites render.
- Satellites orbit outside the globe and remain connected to the server point.
- Panel fits desktop and narrow viewport without overflowing.
- If there are no users, the server point still renders with an empty-session summary.

Verification:

- Run `npm.cmd run build`.
- Manually inspect in browser.

### Implementation Spec

Create a dashboard `GlobePanel` component that consumes the GP-2 route model and renders the first visible globe panel. For this pass, GP-3 also absorbs the small GP-4/GP-5/GP-6 slices so the shipped panel is actually useful: it should be visible on the dashboard, slowly animate, and include the local-only VPN visual route toggle.

Likely files:

- `src/components/GlobePanel.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `docs/globe-panel-plan.md`
- `changelog.md`

Component contract:

- Props should accept `session`, `users`, `localUserId`, `vpnVisualEnabled`, and `onToggleVpnVisual`.
- The component should call `createGlobeRouteModel` internally with `session.id`, `users`, and `localUserId`.
- The panel should include a non-canvas summary area so the feature is still understandable if WebGL fails.

Rendering direction:

- Use `Canvas` from `@react-three/fiber` inside a fixed-height `.globe-panel-viewport`.
- Use a local scene component for the globe mesh, rings, points, and lines.
- Render a dark transparent sphere with blue wireframe rings.
- Render `SERVER_GLOBE_POINT` as the only point on the surface by default.
- Render satellites outside the globe radius.
- Render line segments from server to each satellite.
- Render `vpnSurfacePoint` and `vpnConnections` when `vpnVisualEnabled` produces route data.
- Keep materials simple: standard/basic materials and line segments are enough for this phase.
- Avoid adding orbit controls or user camera controls in the first renderer.
- Add slow globe/satellite motion with `useFrame`, but avoid React state updates per frame.
- If `prefers-reduced-motion` is active, keep the scene mostly static.

Integration direction:

- Add `GlobePanel` below the existing `.content-grid` in `MainScreen`.
- Store `isGlobeVpnVisualEnabled` locally in `MainScreen`.
- Add a single globe-panel toggle button for `VPN VISUAL`.
- The toggle must not change sync, reducer, session events, networking, latency, Discord state, or real location.
- Do not alter `LobbyPanel`, `TimerPanel`, sync state, reducer state, or existing session behavior.
- Keep the existing dashboard layout intact.

Responsive direction:

- Desktop: full-width panel with globe viewport and compact readout side-by-side if space allows.
- Narrow viewport: stack summary below/above viewport and clamp canvas height.

Manual checks:

- Dashboard loads with the new panel visible.
- Adding test participants increases satellite count.
- VPN visual toggle creates/removes the fake surface route for the local user.
- No real location permission prompt appears.
- Existing lobby/timer controls still work.

### Checklist Items Achieved

- Added the visible dashboard globe panel below the primary dashboard grid.
- Rendered the blue dark wireframe globe, fixed server point, orbiting user satellites, and server-to-satellite visual routes.
- Added slow scene rotation and satellite orbiting without per-frame React state updates.
- Added reduced-motion behavior that keeps satellites static and slows scene drift.
- Added local-only `VPN VISUAL` toggle and fake route rendering from the existing GP-2 model.
- Added responsive panel styling and non-canvas summary/fallback UI.

### Completed Implementation

- Created `src/components/GlobePanel.tsx`.
- Updated `src/screens/MainScreen.tsx` to mount the panel below `.content-grid` and hold the local-only VPN visual toggle state.
- Updated `src/styles/global.css` with the globe panel layout, viewport, readout, fallback, and responsive rules.
- Kept the implementation local to rendering/UI state; no sync, reducer, session event, networking, real location, or package changes were introduced.

### Acceptance Criteria

- The panel renders a blue dark wireframe globe.
- The panel renders one fixed server surface point.
- The panel renders one orbiting satellite per connected user.
- Server-to-satellite lines remain visible.
- The local-only VPN visual toggle creates a fake surface point and route chain when a local user is present.
- No real location APIs are used.
- No sync/reducer/session event changes are introduced.
- Dashboard remains responsive on narrow viewports.

### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- `npx.cmd tsx --test tests/globePoints.test.ts` passed.
- Browser DOM check confirmed the `Globe` region, `VPN VISUAL` button, summary, and React Three Fiber canvas mount.
- Visual screenshot inspection was partially blocked by the local startup/background console retry overlay in the current dev environment, so final visual tuning should still happen in a clean running app session.

### Risks

- React Three Fiber JSX typing can be picky in app components; keep Three usage simple.
- Canvas rendering can fail in unsupported WebGL contexts, so keep the text summary useful.
- The first visual pass may need tuning after screenshot/manual inspection.

### Wishlist Mapping

- Adds the requested dashboard `Globe` panel.
- Uses the current blue dashboard theme.
- Shows the server as a point and users as connected satellites.
- Adds visual-only VPN route behavior without real location exposure.

### Non-Goals

- No exact or approximate real location.
- No browser geolocation prompt.
- No IP lookup.
- No synced VPN state.
- No dashboard layout customization.

## GP-4: Spin And Motion Safety

Status: [x] Completed via GP-3.

Goal: Add subtle globe rotation and animated glow without making the panel distracting.

Files likely touched:

- `src/components/GlobePanel.tsx`
- `src/styles/global.css`

Scope:

- Add slow auto-spin with `useFrame`.
- Add gentle pulsing on points/arcs.
- Pause or reduce motion when `prefers-reduced-motion` is active.
- Keep frame work minimal and avoid unnecessary React state updates every frame.

Acceptance checks:

- Globe spins smoothly.
- Motion reduction works.
- Build passes.

Verification:

- Run `npm.cmd run build`.
- Manual desktop and narrow viewport check.

### Draft Implementation Spec

This phase should be merged into GP-3 if the static renderer is already small enough. If kept separate, it should only touch the globe scene component and CSS.

Scope:

- Add `useFrame` rotation to the visual globe group.
- Animate satellites using their deterministic orbit phase/speed without causing React state updates every frame.
- Use a small `usePrefersReducedMotion` helper or local `matchMedia` effect in `GlobePanel`.
- When reduced motion is active, keep the globe mostly still and render satellites at their base phase.

Non-goals:

- No camera controls.
- No synced animation state.
- No large particle systems.

Completed via GP-3:

- Added slow `useFrame` scene drift.
- Added deterministic satellite orbit motion without React state updates per frame.
- Added reduced-motion handling that slows scene drift and stops satellite orbit animation.

## GP-5: Dashboard Integration

Status: [x] Completed via GP-3.

Goal: Connect the globe panel to the real dashboard state.

Files likely touched:

- `src/screens/MainScreen.tsx`
- `src/components/GlobePanel.tsx`
- `src/styles/global.css`

Scope:

- Pass `state.session`, `state.users`, and `lobbyState.localUser` into the globe model.
- Add the panel to the dashboard below the current main grid.
- Keep existing lobby/timer behavior unchanged.
- Add a compact status strip: server, users, route mode.

Acceptance checks:

- Users joining/leaving update globe points.
- Test participants show as visual points.
- The rest of the dashboard still lays out correctly.

Verification:

- Run `npm.cmd run build`.
- Manual check with test participants.

### Draft Implementation Spec

This phase can be merged into GP-3 if the worker implements the visible panel in one pass. If separated, GP-3 should create the component and GP-5 should only mount it in `MainScreen`.

Scope:

- Import `GlobePanel` into `MainScreen`.
- Pass `state.session`, `state.users`, and `lobbyState.localUser?.id`.
- Add a short status strip in the component showing server label, user satellite count, and route mode.
- Style the panel using existing dashboard variables: `--bg-panel`, `--line`, `--cyan`, `--text-soft`, `--font-display`, and `--font-mono`.

Non-goals:

- No command toggles yet.
- No local storage.
- No session/reducer writes.

Completed via GP-3:

- Mounted `GlobePanel` below the existing `.content-grid` in `MainScreen`.
- Passed `state.session`, `state.users`, and `lobbyState.localUser?.id`.
- Added summary readouts for server, satellite count, and route mode.
- Kept session/reducer state unchanged.

## GP-6: Local VPN Visual Toggle

Status: [x] Completed via GP-3.

Goal: Add the fun local-only visual route mode.

Files likely touched:

- `src/screens/MainScreen.tsx`
- `src/components/GlobePanel.tsx`
- `src/styles/global.css`

Scope:

- Add one toggle control in the globe panel.
- Toggle keeps the local user satellite in orbit and adds one random fake surface location point.
- Draw a visible route from the local satellite to the fake surface point and from the fake surface point to the server.
- Keep the normal satellite-to-server connection visible or subtly dimmed so the user still reads as connected.
- Show clear copy that this is visual only.
- Do not modify sync transport, session reducer, latency, or server connection.

Acceptance checks:

- Toggle creates/removes the fake local surface point and route.
- The local satellite remains visible while VPN visual mode is on.
- Other users remain unchanged.
- Reloading resets unless we deliberately choose local storage in a later phase.

Verification:

- Run `npm.cmd run build`.
- Manual toggle check.

### Draft Implementation Spec

Add the playful local-only visual route mode after the base panel is visible.

Likely files:

- `src/screens/MainScreen.tsx`
- `src/components/GlobePanel.tsx`
- `src/styles/global.css`

Scope:

- Store `isGlobeVpnVisualEnabled` in `MainScreen`.
- Pass it and a toggle callback to `GlobePanel`.
- Add one toggle button in the globe panel header or status strip.
- When enabled, render `vpnSurfacePoint` and `vpnConnections` from the route model.
- Use copy such as `VPN VISUAL` to make the effect clearly fictional.
- Do not persist by default.

Acceptance:

- Toggle on/off works for the local user.
- Fake surface route appears only when the local user exists in the session.
- No real geolocation prompt appears.
- No sync/reducer/network changes.

Completed via GP-3:

- Added `isGlobeVpnVisualEnabled` local state in `MainScreen`.
- Added the `VPN VISUAL` button in `GlobePanel`.
- Rendered the fake surface route from the GP-2 route model.
- Kept the feature local-only with no real location, sync, reducer, or network changes.

## GP-7: Optional Synced VPN Visual State

Status: [ ] Not started.

Goal: If desired later, let all users see another user's visual VPN state.

Scope:

- Add explicit session event/state only for visual route metadata.
- Keep the state non-authoritative and unrelated to networking.
- Add reducer tests.

Risk:

- This touches shared session state, so it should be a separate phase after the local-only version feels good.

Verification:

- Run session reducer tests and `npm.cmd run build`.

## GP-8: Optional Real Coarse Location

Status: [ ] Not started.

Goal: Add opt-in approximate real location later, only if the privacy/UX tradeoff still feels worth it.

Scope:

- Add explicit opt-in UI.
- Use browser geolocation only after the user clicks.
- Round the result heavily before rendering or syncing.
- Provide a clear off/reset path.
- Avoid storing exact coordinates.

Risk:

- Browser permission prompts can feel heavy for a playful dashboard panel.
- Discord embedded environments may have permission limitations.

Recommendation:

- Do not include this in the first implementation.

## Open Questions

- Should the panel be always visible, or behind a dashboard command like `showglobe` / `hideglobe`?
- Should satellite orbit lanes reset every session, or should each user keep a stable orbit style across sessions?
- Should the server point be branded as `SYNC SERVER`, `ROOM HOST`, or a fictional network node?
- Should the globe be part of the default dashboard immediately, or introduced as an optional panel first?
- Should VPN fake surface points regenerate every time the user toggles VPN on, or stay stable for the page session?

## First Implementation Result

Completed GP-2 through GP-6 in two managed passes:

- deterministic privacy-safe orbiting satellites
- server point plus satellite-to-server lines
- spinning blue wireframe globe
- full-width dashboard panel
- local-only VPN fake surface route
- no real location collection
- no synced VPN state

Future work should start at GP-7 only if synced visual route state becomes desirable.
