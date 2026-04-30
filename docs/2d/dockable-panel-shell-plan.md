# Dockable Panel Shell Plan

## Summary

Create a reusable dashboard panel system that every current and future Sync Sesh panel can plug into. The system should support free-floating panels, invisible edge and corner resize grips, drag-anywhere movement, docking into the main dashboard work area, rearranging docked panels, and split resizing between neighboring docked panels.

The current `FloatingWindow` component is a useful seed for pointer capture, free movement, z-order, and eight-direction resize behavior. The next system should move that behavior out of local component state and into a shared panel layout manager so panels can switch between floating and docked modes without each panel reinventing its own shell.

## Goals

- Provide one reusable shell for dashboard panels.
- Let any registered panel float above the dashboard.
- Let any registered panel dock into the main work area.
- Let users drag panels to rearrange docked positions.
- Let users resize floating panels from all sides and corners.
- Let users resize docked panels by dragging split boundaries between neighbors.
- Keep resize grips invisible while still easy to hit.
- Preserve a normal centered dashboard width suitable for a 16:9 screen.
- Allow the docked area to scroll when content exceeds the available viewport.
- Persist user layout preferences locally.
- Keep panel contents mostly unaware of whether they are floating or docked.

## Current Code Notes

- `src/components/FloatingWindow.tsx` already supports:
  - Free movement.
  - Eight resize handles: `n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`.
  - Viewport clamping.
  - Local z-index bumping.
  - Local rect state.
- Current `FloatingWindow` users are `DebugConsoleWindow`, `SoundCloudPanel`, and `SoundCloudDeckPanel`.
- `MainScreen` currently decides where major panels render:
  - `LobbyPanel` and `TimerPanel` render inside `.content-grid`.
  - `GlobePanel`, `SoundCloudPanel`, `SoundCloudWidgetPanel`, `SoundCloudDeckPanel`, `AdminPanel`, and debug windows render through separate conditional branches.
- `.content-grid` is the current primary dock-like area, but it is static CSS rather than a user-editable layout.
- Some panels already have special sizing needs, especially `GlobePanel` fullscreen mode and SoundCloud deck/workspace panels.

## Recommendation

Build a `PanelWorkspace` system instead of expanding `FloatingWindow` directly.

The recommended structure:

- `PanelProvider`
  - Owns registered panel definitions.
  - Owns active panel layout state.
  - Persists layout to local storage.
  - Exposes panel actions.

- `PanelWorkspace`
  - Renders the main docked area.
  - Renders floating panels in a fixed overlay layer.
  - Handles drag previews and dock targets.

- `PanelShell`
  - Shared chrome for every panel.
  - Provides title bar, optional actions, move handle, close/minimize/pop-out controls, invisible resize grips, focus/z-order behavior, and panel mode styling.
  - Does not own panel-specific business logic.

- `DockTree`
  - Renders docked split layouts.
  - Supports rows, columns, tabs later if wanted, and leaf panel nodes.
  - Handles split resize between adjacent panels.

- `panelRegistry`
  - Maps stable panel ids to labels, default size, minimum size, preferred dock location, and render function.

This keeps the dashboard from becoming a long list of panel-specific conditionals inside `MainScreen`.

## Layout Model

Use a serializable layout model so it can be saved, restored, reset, and migrated.

Suggested TypeScript shape:

```ts
type PanelId =
  | "lobby"
  | "timer"
  | "globe"
  | "soundcloud-radio"
  | "soundcloud-widget"
  | "soundcloud-decks"
  | "admin"
  | "debug-console";

interface PanelLayoutState {
  version: 1;
  dockRoot: DockNode;
  floating: FloatingPanelState[];
  collapsed: PanelId[];
  activePanelId?: PanelId;
}

type DockNode = DockSplitNode | DockPanelNode;

interface DockSplitNode {
  type: "split";
  id: string;
  direction: "row" | "column";
  ratio: number;
  first: DockNode;
  second: DockNode;
}

interface DockPanelNode {
  type: "panel";
  id: string;
  panelId: PanelId;
  minWidth: number;
  minHeight: number;
}

interface FloatingPanelState {
  panelId: PanelId;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
}
```

Keep panel ids stable. Changing ids later will break restored layouts unless there is a migration path.

## Panel Registration

Each panel should register metadata separately from layout state.

Suggested definition:

```ts
interface PanelDefinition {
  id: PanelId;
  title: string;
  defaultDock: "left" | "right" | "bottom" | "center" | "float";
  defaultFloatingRect: Rect;
  minWidth: number;
  minHeight: number;
  preferredAspectRatio?: number;
  canClose: boolean;
  canFloat: boolean;
  canDock: boolean;
  render: (context: PanelRenderContext) => ReactNode;
}
```

`PanelRenderContext` should include the panel mode, available size if measurable, and shell actions. Existing business props can still come from `MainScreen` at first, but the long-term target should be thin adapters that register each panel with the workspace.

## Docking Behavior

Dragging a panel should show dock targets when the pointer enters the dock workspace.

Recommended dock targets:

- Left half of a panel.
- Right half of a panel.
- Top half of a panel.
- Bottom half of a panel.
- Center of a panel for future tab stacking.
- Empty workspace area.

Initial implementation can skip tab stacking and only support split placement. Center can mean "replace empty workspace" or "dock as last focused panel" until tabs are needed.

When a floating panel docks:

- Remove it from `floating`.
- Insert a `DockPanelNode` into `dockRoot`.
- If dropping beside an existing panel, wrap the target node in a `DockSplitNode`.
- Use a default split ratio like `0.5`, then clamp based on min sizes.

When a docked panel floats:

- Remove its leaf from `dockRoot`.
- Collapse now-empty split branches.
- Add a `FloatingPanelState` with its last known screen rect or a default rect.

## Docked Resizing

Floating resize should keep the existing eight invisible grips.

Docked resize should use split handles between neighboring dock nodes:

- Horizontal split handle for `direction: "row"`.
- Vertical split handle for `direction: "column"`.
- Handle should be visually invisible by default.
- Cursor should reveal resize affordance.
- Optional hover/focus styling can be extremely subtle.

When a docked split is resized:

- Update only the split node's `ratio`.
- Clamp the ratio so both sides stay above the sum of descendant min sizes.
- Let CSS grid/flex distribute the final pixels.
- Store ratios, not absolute docked widths, so the dock survives viewport changes.

The docked workspace should live inside the normal dashboard width, currently similar to `.app-shell` with its `max-width: 1820px`. If docked content exceeds the available vertical space, the workspace should scroll instead of expanding past the viewport.

## Rearranging Docked Panels

Docked panels should use the same drag gesture as floating panels, but the result differs:

- Drag from a panel header starts a layout drag.
- The original dock slot can remain in place during drag as a placeholder.
- Hovering another docked panel reveals target zones.
- Dropping moves the panel node to the new location.
- Escape cancels the drag and restores the original layout.

For phase 1, dragging docked panels can be pointer-only. Keyboard rearrangement should be planned after the layout model stabilizes.

## Resize Grips

Invisible grips are fine, but they need predictable hit areas.

Recommended hit sizes:

- Floating edges: `10px` to `12px`.
- Floating corners: `16px` to `20px`.
- Dock splitters: `8px` to `12px`.

The grips should not add visible lines or decorative corners. They can set cursor styles and use `touch-action: none`.

## Persistence

Store layout in local storage under a versioned key, for example:

```ts
const PANEL_LAYOUT_STORAGE_KEY = "syncsesh.panel-layout.v1";
```

Persistence rules:

- Save after drag end, resize end, dock, undock, close, and reset.
- Do not save every pointer move.
- Validate saved layout before use.
- If validation fails, fall back to the default layout.
- Include a "Reset layout" command in admin/debug controls later.

## Default Layout

The first default docked layout should preserve the current dashboard feel:

- Header remains outside the panel workspace.
- Footer remains outside the panel workspace.
- Main dock workspace starts with:
  - Left: Lobby panel.
  - Right: Timer panel.
- Optional panels start closed or floating depending on existing behavior:
  - Globe starts docked below or closed behind the current toggle.
  - SoundCloud radio/widget/decks continue to follow current mode toggles.
  - Admin remains hidden until host tools open.
  - Debug console can remain floating by default.

This keeps the initial user experience familiar while letting new panels enter the same system.

## Codex Phase Plan

Each phase should be small enough for one Codex turn. Do not start the next phase until the previous one has passed review. Implementation phases should add a top `changelog.md` entry and run `npm.cmd run build` unless the user explicitly says not to.

Status markers:

- `[ ]` means not started.
- `[~]` means currently in progress.
- `[x]` means completed and manager-verified.

Manager loop rules:

- Only one phase may be `[~]` at a time.
- Before implementation, the manager must write the approved implementation spec into the active phase.
- The active phase spec should use the standard sections from `docs/Agents/agent.md`: Summary, Implementation Spec, Checklist Items Achieved, Completed Implementation, Acceptance Criteria, Build And Manual Checks, Risks, Wishlist Mapping, and Non-Goals.
- If a phase is code-changing, the manager or worker must update `changelog.md`.
- If a phase is code-changing, run `npm.cmd run build` unless the user explicitly says not to.
- Keep each worker prompt scoped to the active phase only.

### [x] Phase 1 - Inventory And Contracts

#### Summary

Document the exact dashboard panel surfaces before changing behavior. This phase is docs-only and prepares later implementation phases to avoid rediscovering `MainScreen` state ownership.

#### Implementation Spec

- Audit current panel render paths in `src/screens/MainScreen.tsx`.
- Audit current `FloatingWindow` consumers.
- Record stable future panel ids, open/close state, placement, props source, minimum sensible size, and special behavior.
- Explicitly mark Header, banners, Footer, loading screen, 3D shell, and fullscreen debug overlays as outside the first dock workspace.
- Do not create runtime code in this phase.

#### Panel Inventory

| Surface | Future panel id | Current render path | Open or mode source | Close or mode exit | Current placement | Min size starting point | Special behavior | Props/state source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| App header | none | `AppHeader` in `MainScreen` | Always visible after loading | Not closable | Above workspace in `.app-shell` | N/A | Shows zoom/window opacity/session status; should stay outside dock tree | `state.session`, `state.syncStatus`, `useAppViewportControls`, secret code state |
| Sync/identity banners | none | Conditional `sync-banner` blocks in `MainScreen` | Sync/auth state | State-driven | Above workspace | N/A | Temporary alerts; should not become docked panels | Sync and Discord SDK state |
| Lobby | `lobby` | `LobbyPanel` in `.content-grid` | Always rendered in normal dashboard | Not closable in first pass | Left column of `.content-grid` | About `480x320` | Join controls can start hidden; uses generated names and Discord identity | `state.session`, `state.users`, `lobbyState`, generated display name state, join handlers |
| Timer | `timer` | `TimerPanel` in `.content-grid` | Always rendered in normal dashboard | Not closable in first pass | Right column of `.content-grid` | About `760x360` | Ready hold hotkey disabled during 3D mode; owns duration/precount controls | `state`, `lobbyState`, countdown display, timer handlers |
| Globe | `globe` | Conditional `GlobePanel` after `.content-grid` | `isGlobePanelVisible`, debug command `showglobe` | `onClose`, debug command `hideglobe` | Full-width panel below core grid when visible | About `520x420`; larger preferred | Has internal fullscreen override via `isGlobePanelFullscreen`; VPN visual toggle | `state.session`, `state.users`, `lobbyState.localUser`, local Globe state |
| SoundCloud radio | `soundcloud-radio` | Conditional `SoundCloudPanel` | `isSoundCloudPanelEnabled && soundCloudPanelMode === "radio"`, debug command `radio` | Mode switch or disabled state | Full-width panel below Globe/core area | About `520x340` | Contains nested waveform pop-out `FloatingWindow` | `frontEndSoundCloudPlayer`, `soundCloudPanelMode`, `setSoundCloudPanelMode` |
| SoundCloud widget | `soundcloud-widget` | Conditional `SoundCloudWidgetPanel` | `isSoundCloudPanelEnabled && soundCloudPanelMode === "widget"` | Mode switch or disabled state | Full-width panel below Globe/core area | About `520x340` | Widget-specific embedded player behavior | `frontEndSoundCloudPlayer`, `soundCloudPanelMode`, `setSoundCloudPanelMode` |
| SoundCloud decks | `soundcloud-decks` | Conditional `SoundCloudDeckPanel` when `shouldMountDeckWorkspace` | SoundCloud enabled/deck mode state | Mode switch or disabled state | Full-width dense workspace | About `960x560`; larger preferred | Two decks, mixer, grid controllers, nested deck waveform pop-out `FloatingWindow`; highest migration risk | Deck controllers, grid controllers, mixer state, SoundCloud mode state |
| Admin | `admin` | `AdminPanel` always called, internally returns `null` unless allowed/open | Debug command `admin`; `isAdminOpen`; `lobbyState.canUseAdminTools` | `onClose`, permission loss effect | Full-width panel near bottom when open | About `520x420` | Host-only; includes SoundCloud waveform tools and session controls | `state`, `lobbyState`, admin/session handlers, SoundCloud player |
| Status footer | none | `StatusFooter` in `MainScreen` | Always visible after loading | Not closable | Below panel area | N/A | Persistent app status; should stay outside dock tree | Sync and SDK state |
| Debug console float | `debug-console` | `DebugConsoleWindow` when `debugConsoleDisplayMode === "float"` | Debug command `float`; debug open state | Window close | Fixed floating window | Existing `320x300` min; initial `560x420` | Existing `FloatingWindow`; should be first floating persistence candidate | Debug console snapshot/log state and command handlers |
| Debug console fullscreen | none initially | `DebugConsoleFullscreen` | `console1`, `fullscreen` command, legacy trigger | Close command/hotkey path | Fullscreen overlay | N/A | Keep outside dock system until explicitly designed | Debug console state |
| Debug console background/fullscreen2 | none initially | `DebugConsoleFullscreen2` | Backquote hotkey, `console2`, `compact`, `background` commands | Close animation path | Fullscreen/background overlay | N/A | Keep outside dock system; command behavior must be preserved | Debug console state and console2 visual settings |
| Loading screen | none | `LoadingScreen` | Startup progress | State-driven | Over dashboard during startup | N/A | Should never dock | Loading diagnostics/progress |
| 3D hidden world shell | none | Lazy `ThreeDModeShell` path in `MainScreen` | 3D open state | Exit/recovery path | Overlay/alternate mode | N/A | Preserve outside normal 2D dock work | 3D-specific state and props |

#### Panel Contract Notes

- Panel content components should stay mostly mode-agnostic. Later phases should use thin adapters that pass existing props into existing components.
- Header, banners, Footer, loading screen, 3D shell, and fullscreen debug overlays are not dock panels for the initial system.
- Nested SoundCloud waveform windows stay local `FloatingWindow` users until a later explicit decision registers them as first-class panels.
- Debug commands that open panels or modes must keep working through migration: `showglobe`, `hideglobe`, `admin`, `radio`, `float`, `console1`, `console2`, `fullscreen`, `compact`, and background opacity commands.
- Globe fullscreen should be treated as a temporary override over its saved dock/floating state.
- Admin remains permission-gated by `lobbyState.canUseAdminTools`.

#### Checklist Items Achieved

- Audited `MainScreen` dashboard render paths.
- Audited current `FloatingWindow` consumers.
- Added panel inventory and exclusion list.
- Captured command and special-behavior preservation requirements.

#### Completed Implementation

- Docs-only update to this plan. No runtime implementation was started.

#### Acceptance Criteria

- The plan identifies every current dashboard panel surface and major non-panel surface.
- Later phases have enough placement and state ownership context to avoid broad `MainScreen` refactors.
- Current command-driven panels and debug modes are listed as preservation requirements.

#### Build And Manual Checks

- Build not required because this phase is docs-only.
- Manual check: read the inventory table and confirm it covers current panel render paths.

#### Risks

- Some minimum sizes are starting estimates and should be validated during visual implementation.
- SoundCloud mode commands beyond `radio` may exist or be added later; Phase 12 should re-audit command handling before migration.

#### Wishlist Mapping

- Supports the reusable future panel shell by defining the starting panel set and exclusions.
- Supports future docking/rearranging by giving every dockable surface a stable future id.

#### Non-Goals

- No runtime code changes.
- No new layout state.
- No panel shell extraction.
- No docking behavior.

### [x] Phase 2 - Panel Shell Extraction

#### Summary

Create the shared floating-mode `PanelShell` foundation without changing user-facing layout or adding docking. `FloatingWindow` should become a compatibility wrapper that delegates to `PanelShell`, so existing debug and SoundCloud pop-out windows keep working.

#### Implementation Spec

Expected files:

- `src/components/PanelShell.tsx`
- `src/components/FloatingWindow.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Extract the reusable rect, pointer capture, move, resize, viewport clamp, and z-index behavior from `FloatingWindow` into `PanelShell`.
- Keep the existing `FloatingWindow` public props intact: `title`, `isOpen`, `initialRect`, `minWidth`, `minHeight`, `onClose`, and `children`.
- `FloatingWindow` should import and render `PanelShell` instead of owning its own drag/resize implementation.
- Preserve the current DOM class names or provide aliases so existing `.floating-window-*` styling still works.
- Add neutral `panel-shell-*` classes where practical, but do not break existing styles.
- Keep edge and corner grips invisible.
- Add baseline accessible labels for resize grips and close behavior where the existing structure allows it.
- Preserve current initial rect reset behavior when a window reopens.
- Preserve viewport clamping on window resize.
- Do not introduce docking, layout registry, local storage persistence, reducer state, or `MainScreen` changes in this phase.
- Do not edit `DebugConsoleWindow`, `SoundCloudPanel`, or `SoundCloudDeckPanel` unless a tiny type/import adjustment is strictly required.

Existing behavior to preserve:

- `DebugConsoleWindow` still opens as a floating window, can drag, resize from all sides/corners, and close.
- `SoundCloudPanel` waveform pop-out still opens as a floating window, can drag, resize, and close.
- `SoundCloudDeckPanel` waveform pop-out still opens as a floating window, can drag, resize, and close.

#### Checklist Items Achieved

- Added shared `PanelShell`.
- Converted `FloatingWindow` into a compatibility wrapper.
- Preserved existing `FloatingWindow` call sites.
- Added neutral `panel-shell-*` CSS aliases while keeping existing `floating-window-*` classes.
- Added baseline close labels, resize grip labels, and `touch-action: none` on drag/resize targets.
- Added changelog entry for the code change.

#### Completed Implementation

- `src/components/PanelShell.tsx` now owns floating rect state, z-index, viewport clamping, title-bar drag, and eight-handle resize behavior.
- `src/components/FloatingWindow.tsx` now delegates to `PanelShell` while keeping the same public props.
- `src/styles/global.css` preserves existing floating window styling and aliases it to `panel-shell-*` classes.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual browser smoke checks for debug and SoundCloud pop-out windows are still pending.

#### Acceptance Criteria

- A new `PanelShell` component exists and owns floating drag/resize behavior.
- `FloatingWindow` remains source-compatible for all current callers.
- No visible dashboard layout changes are introduced.
- Existing floating windows still use invisible resize grips.
- No docking or persistence behavior is added.

#### Build And Manual Checks

- `npm.cmd run build`.
- Manual smoke test: open debug console, drag it, resize from all sides/corners, close it.
- Manual smoke test: open SoundCloud waveform floating windows from `SoundCloudPanel` and `SoundCloudDeckPanel` and verify drag/resize/close behavior still works.

#### Risks

- Existing CSS is keyed to `.floating-window-*`; preserve or alias those class names.
- Pointer capture can regress if pointer handlers move to nested elements incorrectly.
- Reopen behavior can regress if `PanelShell` treats `initialRect` as fully controlled state.

#### Wishlist Mapping

- Creates the reusable shell required for future panels.
- Keeps grips invisible while preserving all-side/corner resize.
- Prepares for later docking by separating shell behavior from the legacy `FloatingWindow` wrapper.

#### Non-Goals

- No dock tree.
- No panel registry.
- No reducer or persistence.
- No changes to core dashboard panel placement.

### [x] Phase 3 - Layout Types And Pure Reducer

#### Summary

Create the future docking/floating layout data model as pure TypeScript with focused reducer tests. This phase must not wire the layout into the UI.

#### Implementation Spec

Expected files:

- `src/lib/panels/panelLayout.ts`
- `tests/panelLayout.test.ts`
- `changelog.md`

Implementation boundaries:

- Add serializable panel layout types and helpers only. Do not import React.
- Use stable panel ids from the inventory: `lobby`, `timer`, `globe`, `soundcloud-radio`, `soundcloud-widget`, `soundcloud-decks`, `admin`, and `debug-console`.
- Add a default layout with a row split matching the current core dashboard proportions: Lobby first at about `0.42`, Timer second at about `0.58`.
- Represent floating panels separately from the dock tree.
- Add reducer actions for:
  - `focus-floating-panel`
  - `update-floating-rect`
  - `update-split-ratio`
  - `dock-panel`
  - `undock-panel`
  - `remove-docked-panel`
  - `reset-layout`
- Add split collapse helpers so removing a docked leaf collapses empty parent splits.
- Add validation helpers that reject malformed saved layout data and unknown panel ids.
- Add simple serialization helpers for future local storage use, but do not call `localStorage` in this phase.
- Ratio clamping can use default node minimum sizes; keep the algorithm deterministic and testable.
- Avoid `MainScreen`, component, CSS, package, and live render changes.

Suggested exports:

- `PANEL_LAYOUT_VERSION`
- `PANEL_LAYOUT_STORAGE_KEY`
- `DEFAULT_PANEL_MIN_SIZE`
- `PANEL_IDS`
- `createDefaultPanelLayout()`
- `panelLayoutReducer(state, action)`
- `validatePanelLayout(value)`
- `serializePanelLayout(state)`
- `parsePanelLayout(serialized)`

#### Checklist Items Achieved

- Added pure panel layout types and stable panel ids.
- Added default Lobby/Timer dock layout.
- Added reducer actions for floating focus/rect updates, split ratio updates, docking, undocking, dock removal, and reset.
- Added split collapse and no-op behavior for missing docked panels.
- Added validation, serialization, and parse helpers.
- Added focused reducer and validation tests.

#### Completed Implementation

- `src/lib/panels/panelLayout.ts` now contains the serializable panel layout model, reducer, validation, and serialization helpers.
- `tests/panelLayout.test.ts` covers default layout, floating updates, split ratio clamping, dock/undock, split collapse, missing-panel no-ops, malformed saved layouts, and serialization.
- `npx.cmd tsx --test tests\panelLayout.test.ts` passed with 10 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.

#### Acceptance Criteria

- Pure layout types and reducer compile without UI wiring.
- Default layout contains docked Lobby and Timer in a row split.
- Reducer can focus floating panels, update floating rects, update split ratios, dock a floating panel, undock a docked panel, remove a docked panel, collapse empty splits, and reset to default.
- Saved layout validation rejects unknown panel ids and malformed tree shapes.
- Tests cover core reducer and validation behavior.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts`
- `npm.cmd run build`

#### Risks

- Over-designing the reducer before UI usage can create churn; keep the model small and serializable.
- Dock insert/move details may evolve in later drag phases; this phase only needs stable primitives.

#### Wishlist Mapping

- Establishes the shared layout model needed for docking, rearranging, split resizing, persistence, and future panels.

#### Non-Goals

- No React components.
- No `PanelProvider`.
- No live dashboard rendering.
- No CSS.
- No pointer hit testing.

### [x] Phase 4 - Panel Registry Skeleton

#### Summary

Add a metadata-only panel registry so every future dockable panel has stable definitions before any UI migration happens.

#### Implementation Spec

Expected files:

- `src/lib/panels/panelRegistry.ts`
- `tests/panelRegistry.test.ts`
- `changelog.md`

Implementation boundaries:

- Import `PanelId`, `PANEL_IDS`, and related min-size types from `src/lib/panels/panelLayout.ts`.
- Add a serializable metadata registry only. Do not import React and do not render components in this phase.
- Define metadata for every `PanelId`: title, default dock preference, default floating rect, min size, `canClose`, `canFloat`, `canDock`, and a lightweight `renderKey` or `adapterKey` string for future wiring.
- Include definitions for `lobby`, `timer`, `globe`, `soundcloud-radio`, `soundcloud-widget`, `soundcloud-decks`, `admin`, and `debug-console`.
- Keep Lobby and Timer non-closeable by default.
- Mark all future workspace panels as dockable/floatable unless the inventory says otherwise.
- Add helper exports for `PANEL_DEFINITIONS`, `getPanelDefinition(panelId)`, and `getPanelDefinitions()`.
- Add tests that every `PANEL_IDS` entry has exactly one definition, no unknown definitions exist, min sizes are positive, default floating rects are positive, and Lobby/Timer defaults match the current core layout expectations.
- Do not change `MainScreen`, components, CSS, package files, or live render behavior.

#### Checklist Items Achieved

- Added metadata-only panel registry.
- Added one definition for every stable `PanelId`.
- Added helper exports for registry lookup/listing.
- Added registry drift and sizing tests.

#### Completed Implementation

- `src/lib/panels/panelRegistry.ts` defines titles, default dock preferences, default floating rects, min sizes, close/float/dock flags, and adapter keys for all future dockable panel ids.
- `tests/panelRegistry.test.ts` verifies registry coverage, serializable metadata, positive sizing, core Lobby/Timer defaults, and optional panel capabilities.
- `npx.cmd tsx --test tests\panelRegistry.test.ts` passed with 5 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.

#### Acceptance Criteria

- Registry exists and compiles.
- Every known `PanelId` has metadata.
- Tests prevent registry drift from the `PANEL_IDS` source of truth.
- No user-facing layout changes.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelRegistry.test.ts`
- `npm.cmd run build`.

#### Risks

- Adding render functions now would force premature UI coupling; keep this phase metadata-only.
- Registry defaults may need visual tuning in later phases.

#### Wishlist Mapping

- Gives future panels stable identities and default behavior before docking/render migration.

#### Non-Goals

- No React render adapters.
- No `PanelProvider`.
- No workspace rendering.
- No CSS.
- No `MainScreen` edits.

### [x] Phase 5 - Dock Workspace Static Render

#### Summary

Introduce the first live `PanelWorkspace`/`DockTree` render path for the core Lobby and Timer panels while preserving the current default dashboard layout. This phase adds static dock rendering only; no resizing, dragging, persistence, provider, or registry-driven rendering yet.

#### Implementation Spec

Expected files:

- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Add a `PanelWorkspace` component that accepts a `DockNode | null` and a `renderPanel(panelId: PanelId)` callback.
- Add an internal recursive `DockTree` render in that component, or a colocated helper in the same file.
- Use the existing default layout from `createDefaultPanelLayout()` for now.
- Replace only the current `.content-grid` wrapper around `LobbyPanel` and `TimerPanel` in `MainScreen`.
- Render Lobby and Timer through a thin callback that passes the exact existing props and handlers into the existing components.
- Do not move or rename existing state, hooks, handlers, or panel props.
- Keep Header, sync/identity banners, Globe, SoundCloud, Admin, StatusFooter, debug consoles, loading screen, and 3D shell outside this workspace.
- Preserve the current default row proportions: Lobby about `0.42`, Timer about `0.58`.
- Add CSS for `.panel-workspace`, split rows/columns, and leaves. The default Lobby/Timer layout should visually match `.content-grid` as closely as possible.
- Keep `.content-grid` CSS if other code still references it; do not remove broadly.
- Do not add resize handles, drag/drop, persistence, local storage, provider, shell controls, or panel registry rendering in this phase.

#### Checklist Items Achieved

- Added static `PanelWorkspace` and recursive dock tree rendering.
- Replaced the core Lobby/Timer `.content-grid` render with `PanelWorkspace`.
- Kept existing Lobby/Timer props and handlers in `MainScreen`.
- Added minimal workspace CSS for row/column splits and leaves.
- Left optional panels and overlays outside the workspace.

#### Completed Implementation

- `src/components/PanelWorkspace.tsx` renders a static dock tree from `DockNode` data.
- `src/screens/MainScreen.tsx` uses `createDefaultPanelLayout()` for the core Lobby/Timer dock root and renders existing panels through a thin callback.
- `src/styles/global.css` adds `.panel-workspace` split/leaf styles and narrow viewport stacking.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual desktop/narrow visual smoke checks are still pending.

#### Acceptance Criteria

- Lobby and Timer render through `PanelWorkspace`.
- Default layout visually remains a two-column Lobby/Timer dashboard split.
- Existing Lobby and Timer behavior still comes from the current `MainScreen` props and handlers.
- No optional panels are migrated.
- No user-facing drag/resize/dock behavior appears yet.

#### Build And Manual Checks

- `npm.cmd run build`.
- Manual smoke test at desktop and narrow viewport widths.

#### Risks

- Wrapping existing panels can change grid sizing or spacing; keep wrappers minimal and layout-only.
- `MainScreen` is already large, so keep the edit tightly scoped to the current `.content-grid` block.

#### Wishlist Mapping

- Establishes the main dock area that later phases will resize, persist, and rearrange.

#### Non-Goals

- No split resizing.
- No drag-to-dock.
- No rearranging.
- No persistence.
- No optional panel migration.

### [x] Phase 6 - Dock Split Resizing

#### Summary

Make existing dock splits resizable. The only live split at this point is the Lobby/Timer split, so the implementation should focus on ratio updates, clamping through the existing reducer, and local restore of saved layout state.

#### Implementation Spec

Expected files:

- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `tests/panelLayout.test.ts` only if reducer coverage needs a small addition
- `changelog.md`

Implementation boundaries:

- Add invisible split handles to `PanelWorkspace` for `DockSplitNode` boundaries.
- Handles should use pointer capture and `touch-action: none`.
- Dragging a row split should update the split ratio based on horizontal pointer movement and the split element width.
- Dragging a column split should update the split ratio based on vertical pointer movement and the split element height.
- Use the existing `panelLayoutReducer` `update-split-ratio` action so minimum-size clamping stays centralized.
- In `MainScreen`, change the core layout from memoized default data to state initialized from saved layout if valid, otherwise `createDefaultPanelLayout()`.
- Use `PANEL_LAYOUT_STORAGE_KEY`, `parsePanelLayout`, and `serializePanelLayout` from `panelLayout.ts`.
- Persist the layout after split resize changes. Avoid saving on unrelated render churn where practical.
- Keep the current default layout if saved state is invalid.
- Do not add drag-to-dock, panel rearrangement, floating persistence, provider, registry rendering, optional panel migration, or shell controls.

#### Checklist Items Achieved

- Added invisible split handles to `PanelWorkspace`.
- Added row and column pointer ratio calculations from DOM bounds.
- Wired core Lobby/Timer layout state through `panelLayoutReducer`.
- Restored saved layout from panel layout storage when valid.
- Persisted split ratio changes after resize end.

#### Completed Implementation

- `src/components/PanelWorkspace.tsx` now renders pointer-captured split handles for dock splits.
- `src/screens/MainScreen.tsx` owns the core panel layout state, initializes it from saved panel layout data, and persists after split resize completion.
- `src/styles/global.css` adds invisible split handle hit areas and hides the row handle on narrow stacked layouts.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual split resize/reload/narrow viewport checks are still pending.

#### Acceptance Criteria

- The Lobby/Timer divider has an invisible draggable split handle.
- Dragging the divider resizes Lobby and Timer by updating the split ratio.
- Ratio updates are clamped by existing minimum-size rules.
- Saved split ratio restores after reload.
- No other panels gain docking or rearranging behavior.

#### Build And Manual Checks

- Existing or added reducer ratio-clamping tests.
- `npm.cmd run build`.
- Manual smoke test: resize split, reload, verify restored layout.

#### Risks

- CSS `zoom` can affect pointer math; use DOM bounding rect dimensions rather than assumptions.
- Saving every pointer move can be noisy; keep persistence simple but avoid unnecessary writes if practical.
- Narrow viewport stacking should not make the splitter unusable or visually noisy.

#### Wishlist Mapping

- Implements dock-neighbor resizing from the original vision.

#### Non-Goals

- No drag-to-dock.
- No panel rearrangement.
- No floating window persistence.
- No optional panel migration.

### [x] Phase 7 - Floating Layout Persistence

#### Summary

Persist the floating Debug Console's rect and z-order through the shared panel layout state. Existing SoundCloud waveform pop-outs should remain local `FloatingWindow` users.

#### Implementation Spec

Expected files:

- `src/components/PanelShell.tsx`
- `src/components/FloatingWindow.tsx`
- `src/components/DebugConsoleWindow.tsx`
- `src/screens/MainScreen.tsx`
- `changelog.md`

Implementation boundaries:

- Extend `PanelShell` and `FloatingWindow` with optional controlled floating props while preserving existing uncontrolled behavior for all current callers.
- Suggested optional props: controlled `rect`, controlled `zIndex`, `onRectChange`, `onInteractionEnd`, and `onFocusPanel`.
- If controlled props are absent, `PanelShell` should behave like Phase 2 for SoundCloud pop-outs.
- Thread optional controlled props through `DebugConsoleWindow`.
- In `MainScreen`, source the debug console floating rect/z-index from `corePanelLayout.floating` for `debug-console`.
- If the debug console is opened in float mode and no saved floating state exists, seed it with the existing debug console initial rect through the layout reducer.
- Use `panelLayoutReducer` actions for `update-floating-rect` and `focus-floating-panel`.
- Persist panel layout storage after debug floating drag/resize end and focus/z-index changes.
- Keep debug fullscreen and fullscreen2 modes outside the panel layout.
- Do not persist SoundCloud waveform pop-outs in this phase.
- Do not add dock/float toggle controls, drag-to-dock, provider, registry rendering, or optional panel migration.

#### Checklist Items Achieved

- Added optional controlled rect/z-index support to `PanelShell`.
- Threaded controlled floating props through `FloatingWindow`.
- Threaded debug-console-specific floating props through `DebugConsoleWindow`.
- Seeded and persisted `debug-console` floating state through the shared layout reducer.
- Preserved uncontrolled SoundCloud pop-out behavior.

#### Completed Implementation

- `PanelShell` and `FloatingWindow` now support optional controlled `rect`, `zIndex`, `onRectChange`, `onInteractionEnd`, and focus callbacks.
- `DebugConsoleWindow` exports its initial rect and can receive shared floating state.
- `MainScreen` seeds, updates, focuses, and persists the floating debug console through `corePanelLayout`.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual debug-console persistence and SoundCloud pop-out smoke checks are still pending.

#### Acceptance Criteria

- Debug Console floating mode restores position and size after reload.
- Debug Console z-order/focus is represented in shared layout state.
- Existing close/open behavior remains intact.
- SoundCloud waveform pop-outs continue to use local uncontrolled floating state.
- Fullscreen debug modes remain unchanged.

#### Build And Manual Checks:

- `npm.cmd run build`.
- Manual smoke test: drag/resize debug console, reload, reopen.

#### Risks

- Controlled and uncontrolled shell behavior can diverge; preserve existing defaults carefully.
- Reopening the debug console should not reset a saved rect once one exists.

#### Wishlist Mapping

- Starts shared floating panel state needed before dock/float mode switching.

#### Non-Goals

- No SoundCloud pop-out persistence.
- No dock/float toggle controls.
- No drag-to-dock.
- No registry rendering.

### [x] Phase 8 - Float And Dock Toggle Controls

#### Summary

Add explicit Dock, Float, and Reset controls for the Debug Console only. This phase proves panel mode switching before pointer-based drag-to-dock exists.

#### Implementation Spec

Expected files:

- `src/components/PanelShell.tsx`
- `src/components/FloatingWindow.tsx`
- `src/components/DebugConsoleWindow.tsx`
- `src/components/PanelWorkspace.tsx` only if a minimal docked frame is needed
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Add optional shell action controls for Dock, Float, and Reset without changing existing callers.
- Floating Debug Console should show a Dock control and Reset control.
- Docked Debug Console should show a Float control, Close control, and Reset control.
- Extract reusable Debug Console content if needed so the same log/command UI can render in floating and docked contexts.
- In `MainScreen`, use `panelLayoutReducer` `dock-panel` and `undock-panel` actions for the debug console.
- Docking the debug console should insert it into the existing dock tree, preferably beside or below the Timer panel.
- Floating the debug console should remove it from the dock tree and restore a floating rect.
- Reset should return the debug console to the default floating rect and z-index behavior without resetting the whole dock layout.
- Preserve `float`, `console1`, `console2`, `fullscreen`, and fullscreen2 behavior. Fullscreen debug modes remain outside the dock system.
- Do not enable Dock/Float controls for Globe, Admin, or SoundCloud yet.
- Do not add drag-to-dock, rearrangement, provider, registry rendering, or optional panel migration.

#### Checklist Items Achieved

- Added optional shell action slots.
- Added floating Debug Console `Dock` and `Reset` controls.
- Added docked Debug Console `Float`, `Close`, and `Reset` controls.
- Extracted reusable Debug Console content for floating and docked rendering.
- Wired debug-console-only dock/float/reset actions through the panel layout reducer.

#### Completed Implementation

- `PanelShell`/`FloatingWindow` now accept optional action slots without changing existing callers.
- `DebugConsoleWindow` owns shared `DebugConsoleContent` and exports `DebugConsoleDockedPanel`.
- `MainScreen` can dock, float, close, and reset the Debug Console while preserving fullscreen debug modes.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual dock/float/reset/reload/fullscreen smoke checks are still pending.

#### Acceptance Criteria

- Floating Debug Console can dock through an explicit control.
- Docked Debug Console can float back out through an explicit control.
- Reset returns the Debug Console to a known default floating placement.
- Existing debug fullscreen modes still work.
- No other panel gains mode controls.

#### Build And Manual Checks

- `npm.cmd run build`.
- Manual smoke test: float, dock, reload, reset.

#### Risks

- Debug console currently combines floating shell and content; extracting content should avoid behavior changes to command history and auto-scroll.
- Docking a dense log panel can expose sizing issues in the static workspace.

#### Wishlist Mapping

- Establishes explicit dock/float mode switching before drag-to-dock.

#### Non-Goals

- No drag-to-dock.
- No docked rearrangement.
- No Globe/Admin/SoundCloud controls.
- No provider or registry-driven rendering.

### [x] Phase 9 - Drag-To-Dock Targets

#### Summary

Allow the floating Debug Console to dock by dragging it into the panel workspace. This phase adds drop target hit testing and a subtle target preview, but does not add docked panel rearrangement.

#### Implementation Spec

Expected files:

- `src/components/PanelShell.tsx`
- `src/components/FloatingWindow.tsx`
- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Extend the floating shell controlled path with enough drag-end information for `MainScreen` to decide whether a floating panel was dropped in the workspace.
- Add workspace/leaf hit testing for left, right, top, and bottom zones using `getBoundingClientRect()`.
- Use existing `panelLayoutReducer` `dock-panel` behavior. No new reducer action should be necessary unless a small helper is clearly useful.
- Show a subtle drop target preview while dragging over a valid workspace zone.
- Only the floating Debug Console should use drag-to-dock in this phase.
- Dropping outside the workspace keeps the Debug Console floating.
- Dropping into a target zone docks the Debug Console next to the target panel and persists layout.
- Center/tab behavior should remain disabled or no-op.
- Existing Dock button should still work.
- Do not let docked panels rearrange yet.
- Do not enable drag-to-dock for Globe, Admin, or SoundCloud.
- Do not add provider or registry rendering.

#### Checklist Items Achieved

- Added floating shell drag move/end callbacks.
- Added workspace leaf drop preview support.
- Added Debug Console drag-to-dock hit testing for left/right/top/bottom zones.
- Wired valid drops through existing `dock-panel` reducer behavior.
- Preserved the explicit Debug Console Dock button.

#### Completed Implementation

- Floating Debug Console drag movement now updates a subtle workspace drop preview.
- Releasing over a valid Lobby/Timer target zone docks the Debug Console beside that target.
- Releasing outside the workspace keeps the Debug Console floating.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual all-zone drag-to-dock checks are still pending.

#### Acceptance Criteria

- Dragging the floating Debug Console over Lobby or Timer shows a subtle left/right/top/bottom drop preview.
- Releasing over a valid zone docks the Debug Console beside the target panel.
- Releasing outside the workspace leaves the Debug Console floating.
- Existing Dock button still works.
- Docked panels cannot be rearranged by dragging yet.

#### Build And Manual Checks

- Existing reducer dock insertion tests.
- `npm.cmd run build`.
- Manual smoke test for all four target directions.

#### Risks

- Pointer event plumbing can conflict with existing drag/resize handling.
- CSS zoom can affect hit testing; use DOM bounding rects.
- The preview should be subtle and should not add permanent visible panel corners or lines.

#### Wishlist Mapping

- Adds drag-based docking into the reusable workspace.

#### Non-Goals

- No docked panel rearrangement.
- No center/tab stacking.
- No non-debug panel drag-to-dock.
- No provider or registry rendering.

### [x] Phase 10 - Docked Panel Rearrangement

#### Summary

Allow the docked Debug Console to be rearranged around existing docked panels by dragging its docked header. This phase does not add draggable headers to Lobby or Timer yet.

#### Implementation Spec

Expected files:

- `src/components/DebugConsoleWindow.tsx`
- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `tests/panelLayout.test.ts` only if reducer coverage needs a small addition
- `changelog.md`

Implementation boundaries:

- Add pointer drag handling to the docked Debug Console header only.
- Reuse the Phase 9 workspace target hit testing and preview where practical.
- Dragging the docked Debug Console over Lobby, Timer, or another valid leaf should show left/right/top/bottom preview.
- Dropping over a valid target should move the existing debug-console dock node to the new location using existing `dock-panel` behavior.
- Dropping outside the workspace should leave the docked Debug Console where it is.
- Collapse the source split through existing reducer behavior.
- Escape should cancel the active docked Debug Console drag if it is in progress.
- Do not add drag rearrangement to Lobby, Timer, Globe, Admin, or SoundCloud yet.
- Do not add center/tab stacking, provider, registry rendering, or optional panel migration.

#### Checklist Items Achieved

- Added docked Debug Console header drag handling.
- Reused workspace target preview and hit testing.
- Added docked Debug Console rearrange drop behavior through `dock-panel`.
- Added Escape cancellation for active docked drags.
- Ensured header action buttons do not start drags.

#### Completed Implementation

- Docked Debug Console can be dragged by its header and moved around valid workspace target zones.
- Dropping outside the workspace keeps the existing docked placement.
- Escape clears the active preview and releases pointer capture when needed.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual repeated rearrangement and Escape checks are still pending.

#### Acceptance Criteria

- Docked Debug Console can be dragged by its header.
- Dropping on left/right/top/bottom target zones around another panel moves it there.
- Dropping outside the workspace leaves it docked in the original place.
- Escape cancels an active docked Debug Console drag.
- Split tree remains valid after repeated moves.

#### Build And Manual Checks

- Reducer tests for move/remove/collapse behavior if new reducer behavior is added.
- `npm.cmd run build`.
- Manual smoke test with at least three docked panels.

#### Risks

- Moving only one docked panel is intentionally incremental; future shell migration should generalize this.
- Header drag can conflict with button clicks in the docked Debug Console header; controls should stop propagation.

#### Wishlist Mapping

- Adds the first docked panel rearrangement path.

#### Non-Goals

- No Lobby/Timer draggable headers.
- No center/tab stacking.
- No optional panel migration.
- No provider or registry rendering.

### [x] Phase 11 - Globe And Admin Migration

#### Summary

Migrate Globe and Admin into the workspace-managed panel system. They should be able to dock, float, close, and restore without moving their internal state ownership out of `MainScreen`.

#### Implementation Spec

Expected files:

- `src/components/PanelWorkspace.tsx` if a reusable docked panel frame is needed
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Use existing `panelRegistry` definitions for Globe and Admin metadata where practical.
- Render docked Globe/Admin through `PanelWorkspace` cases instead of old one-off branches.
- Add floating Globe/Admin rendering through the existing `FloatingWindow`/`PanelShell` path if the panel is floating.
- Keep Globe and Admin content components mostly unchanged. Pass the same props and handlers they receive today.
- Preserve Globe fullscreen behavior; when fullscreen is active, it may still render as its existing fixed overlay behavior.
- Preserve Admin permission gating. If `lobbyState.canUseAdminTools` becomes false, Admin should close/remove from workspace/floating state.
- Preserve debug commands:
  - `showglobe` opens/restores Globe.
  - `hideglobe` closes Globe and clears fullscreen.
  - `admin` opens/restores Admin only when permitted.
- Add explicit dock/float/reset/close controls for Globe/Admin only if needed to meet the phase acceptance criteria; keep styling consistent with the Debug Console controls.
- Remove old one-off Globe/Admin render branches after migration.
- Do not migrate SoundCloud.
- Do not add provider or global registry rendering for all panels.

#### Checklist Items Achieved

- Added registry-backed Globe/Admin docked render cases inside `PanelWorkspace`.
- Added floating Globe/Admin paths through the existing `FloatingWindow`/`PanelShell` compatibility shell.
- Preserved Globe fullscreen callbacks and Admin permission gating.
- Preserved `showglobe`, `hideglobe`, and `admin` command behavior while routing layout changes through shared panel layout state.
- Removed the old one-off Globe/Admin render branches.
- Added managed-container CSS overrides so migrated Admin content fills the shell instead of using its old fixed viewport placement.

#### Completed Implementation

- `MainScreen` now restores, docks, floats, closes, and resets Globe/Admin panels through the shared layout reducer and persisted core panel layout.
- Globe close and `hideglobe` remove both docked and floating layout state, and clear fullscreen.
- Admin close and Admin permission loss remove both docked and floating layout state.
- Docked Globe/Admin panels expose Float, Close, and Reset controls; floating Globe/Admin panels expose Dock and Reset shell actions.
- `changelog.md` entry `[2519]` records the Phase 11 implementation.

#### Acceptance Criteria

- Globe can be opened, docked, floated, closed, reset/restored, and fullscreened.
- Admin can be opened, docked, floated, closed, and reset/restored when permitted.
- `showglobe`, `hideglobe`, and `admin` commands still behave correctly.
- Globe/Admin no longer render through their old one-off branches.
- SoundCloud remains outside this migration.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke pending: Globe open/close/fullscreen/dock/float/reset/reload, Admin open/close/dock/float/reset/reload/permission cleanup.

#### Risks

- Globe and Admin already render internal headers; avoid creating confusing duplicate controls where possible.
- Admin permission loss must not leave stale dock nodes or floating windows visible.
- Globe fullscreen must remain outside normal dock sizing constraints.

#### Wishlist Mapping

- Migrates optional panels into the reusable workspace path.

#### Non-Goals

- No SoundCloud migration.
- No provider.
- No all-panel registry renderer.

### [x] Phase 12 - SoundCloud Migration

#### Summary

Migrate the SoundCloud radio, widget, and decks surfaces into the workspace-managed panel system after Globe/Admin have proven the optional-panel path. This phase should preserve all existing player state ownership in `MainScreen` and treat mode switching as panel restoration/swap behavior, not as a new audio architecture.

#### Implementation Spec

Expected files:

- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Use existing registry ids and metadata for `soundcloud-radio`, `soundcloud-widget`, and `soundcloud-decks`.
- Keep the existing `SoundCloudPanel`, `SoundCloudWidgetPanel`, and `SoundCloudDeckPanel` components mostly unchanged.
- Preserve `frontEndSoundCloudPlayer`, `soundCloudDeckA`, `soundCloudDeckB`, grid controllers, mixer state, admin SoundCloud player selection, and the `shouldMountDeckWorkspace` standby behavior where possible.
- Replace the old one-off SoundCloud render branches in `MainScreen` with workspace-managed docked and floating render paths.
- Opening `radio` should enable/restore the SoundCloud radio panel and set `soundCloudPanelMode` to `radio`.
- Switching modes from any SoundCloud component should route through a shared handler that:
  - updates `soundCloudPanelMode`;
  - keeps `isSoundCloudPanelEnabled` true;
  - removes the previous SoundCloud mode panel from docked/floating layout state;
  - restores the next mode panel in docked/floating layout state, using that mode's registry metadata.
- Closing any SoundCloud workspace panel should disable the visible SoundCloud panel and remove all three SoundCloud mode panel ids from docked/floating layout state.
- Dock, float, and reset controls should work for each SoundCloud mode panel. Reset should use the active mode panel's registry default floating rect.
- Deck mode should use the existing larger registry default/minimum size and must remain usable in the default 16:9 dashboard workspace.
- Keep nested SoundCloud waveform pop-out windows as local `FloatingWindow` children inside `SoundCloudPanel`/`SoundCloudDeckPanel`; do not register them as workspace panels.
- Preserve debug command behavior for `radio`. Do not add new SoundCloud commands in this phase unless required by existing command paths.
- Do not migrate Debug Console fullscreen modes, Globe, Admin, Lobby, or Timer in this phase.

#### Checklist Items Achieved

- Migrated SoundCloud radio, widget, and decks into registry-backed workspace-managed render paths.
- Preserved `MainScreen` ownership of player, deck, grid controller, mixer, admin player selection, and standby deck state.
- Preserved the `radio` debug command and routed SoundCloud mode switching through shared layout state.
- Added dock, float, reset, close, floating rect, and floating focus handling for active SoundCloud modes.
- Kept waveform pop-outs as local child `FloatingWindow`s.
- Removed old one-off SoundCloud render branches.

#### Completed Implementation

- Added SoundCloud panel id helpers for mode-to-panel mapping and grouped SoundCloud panel removal.
- `radio` now enables radio mode and restores `soundcloud-radio` through the panel layout reducer.
- Mode toggles remove stale SoundCloud mode panel ids before restoring the selected mode panel.
- Closing SoundCloud removes all SoundCloud mode panel ids from docked/floating layout state and disables the visible media panel.
- Deck standby remains mounted when 3D mode needs it and decks are not the visible SoundCloud panel.
- Scoped CSS lets SoundCloud panels fill managed docked/floating containers and keeps standby deck mounting hidden.
- `changelog.md` entry `[2520]` records the Phase 12 implementation.

#### Acceptance Criteria

- `radio` opens/restores the SoundCloud radio panel through shared panel layout state.
- Radio, widget, and decks mode switching works from the SoundCloud mode toggle while replacing the active SoundCloud workspace panel.
- Active SoundCloud mode can be docked, floated, reset, resized, and closed.
- Current audio/player behavior is preserved across docking, floating, and mode switches.
- Deck workspace remains usable at the default 16:9 dashboard size.
- Old one-off SoundCloud render branches are removed after migration.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke pending: `radio` command, radio/widget/decks toggle, playback controls, widget load/retry path, deck controls, dock/float/reset/resize/close, and nested waveform pop-out.

#### Risks

- SoundCloud has the densest panel content and may need scoped CSS overrides inside managed panel bodies.
- Mode switching can leave stale panel ids in persisted layout unless all three SoundCloud ids are treated as a mode group.
- Deck standby mounting is used by 3D mode, so the migration must not unmount deck controllers needed by the hidden-world path.

#### Wishlist Mapping

- Moves the highest-risk media panels into the reusable workspace path.
- Proves the shell can support mode-backed panels without duplicating audio state.

#### Non-Goals

- No first-class registration for nested waveform pop-outs.
- No new provider/global panel renderer.
- No new SoundCloud command surface beyond preserving existing behavior.

### [x] Phase 13 - Layout Reset And Debug Commands

#### Summary

Add an explicit layout recovery path so users and testers can return the dashboard to default panel placement without clearing browser storage manually.

#### Implementation Spec

Expected files:

- `src/screens/MainScreen.tsx`
- `changelog.md`
- `src/styles/global.css` only if an admin/debug control needs styling

Implementation boundaries:

- Add a debug console command for layout reset. Use a clear command name such as `resetlayout`, and include it in the debug help string.
- The command should:
  - restore `corePanelLayout` to `createDefaultPanelLayout()`;
  - persist the default serialized layout to `PANEL_LAYOUT_STORAGE_KEY`;
  - clear dock/floating visibility for optional panels whose presence is only layout-driven (`globe`, SoundCloud modes, `admin`, and docked Debug Console);
  - keep non-layout UI preferences such as zoom, opacity, console display mode, and SoundCloud audio/player state untouched.
- Add a debug output line confirming the layout reset.
- Add optional debug output when saved panel layout validation/parsing fails during startup. This can be routed through startup diagnostics or console logs only if it fits existing patterns without large refactors.
- Add an Admin control only if there is already a suitable admin controls area with low-risk wiring; the debug command is the required deliverable.
- Do not alter layout reducer semantics unless a reset bug is discovered.
- Do not add a provider or new layout settings UI in this phase.

#### Checklist Items Achieved

- Added the `resetlayout` debug console command.
- Added `resetlayout` to debug help output.
- Reset persisted core panel layout to the default Lobby/Timer workspace.
- Cleared layout-tied optional panel visibility for Globe, Admin, SoundCloud, and docked/floating Debug Console placement.
- Preserved non-layout preferences and SoundCloud audio/player state.

#### Completed Implementation

- `resetlayout` creates a fresh `createDefaultPanelLayout()`, updates `corePanelLayoutRef`, sets React layout state, and writes the serialized default layout to `PANEL_LAYOUT_STORAGE_KEY`.
- The command clears Globe visibility/fullscreen, Admin visibility, SoundCloud panel visibility, and active dock drop preview.
- Float-mode Debug Console is closed when reset runs, while console display mode preference is left untouched.
- The command appends a debug output confirming the default Lobby/Timer layout reset.
- Startup parse/validation debug output was intentionally deferred because layout initialization runs before `debugConsoleState` exists and a clean solution would need broader startup diagnostics wiring.
- `changelog.md` entry `[2521]` records the Phase 13 implementation.

#### Acceptance Criteria

- Debug command help lists the layout reset command.
- Running the layout reset command restores the default Lobby/Timer dock layout and removes optional panel dock/floating state.
- Reloading after reset keeps the default layout.
- Existing commands such as `radio`, `showglobe`, `admin`, `float`, and `hide` still behave as before after reset.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke pending: distort layout, run `resetlayout`, reload, then reopen optional panels.

#### Risks

- Resetting layout must not accidentally clear unrelated local UI settings or audio/player state.
- Debug Console reset behavior should close docked placement without forcing fullscreen/float mode preferences to change.

#### Wishlist Mapping

- Gives users an escape hatch for the new freeform docking/floating system.

#### Non-Goals

- No visual layout manager UI.
- No cloud/profile layout sync.
- No reducer redesign.

### [x] Phase 14 - Accessibility And Touch Polish

#### Summary

Polish the reusable panel shell and workspace controls so the dock/floating system is understandable to assistive tech and remains usable with keyboard, mouse, and touch pointers.

#### Implementation Spec

Expected files:

- `src/components/PanelShell.tsx`
- `src/components/FloatingWindow.tsx` only if props need threading
- `src/components/PanelWorkspace.tsx`
- `src/components/DebugConsoleWindow.tsx` only for docked header/control labels
- `src/screens/MainScreen.tsx` for workspace-managed panel action labels
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Add accessible names/labels to generic shell controls:
  - close buttons;
  - dock/float/reset buttons where labels are not descriptive enough in context;
  - invisible resize handles;
  - invisible workspace split handles.
- Keep invisible grips visually invisible; do not add visible lines or corner marks.
- Ensure resize and drag handles have useful focus styles when keyboard-focused, without making them visually noisy at rest.
- Add keyboard-accessible split resizing if it fits cleanly:
  - arrow keys should adjust focused split handles by small increments;
  - Shift+arrow can adjust by larger increments;
  - clamp through existing reducer paths.
- Add keyboard support for floating shell movement/resize only if it can be done cleanly in `PanelShell` without destabilizing pointer drag/resize. If not, document it as a remaining follow-up in the phase notes.
- Preserve pointer/touch behavior and existing invisible hit areas.
- Keep changes scoped to shell/workspace accessibility; do not redesign panel content layouts.

#### Checklist Items Achieved

- Added descriptive accessible labels for floating shell move, resize, and close controls.
- Added descriptive labels for workspace-managed dock/float/reset/close actions and docked Debug Console controls.
- Added accessible labels, values, and orientation metadata to workspace split handles.
- Added keyboard split resizing with arrow keys and larger Shift+arrow steps.
- Added keyboard movement and resize support for floating panel shells.
- Kept invisible grips visually quiet at rest with focus-visible treatment only.

#### Completed Implementation

- `PanelShell` floating headers are keyboard focusable and support arrow-key movement, with Shift+arrow larger steps.
- `PanelShell` invisible resize grips are focusable separators with edge/corner labels and arrow-key resizing.
- `PanelWorkspace` split handles are focusable separators with `aria-valuenow` and arrow-key ratio adjustment through the existing split resize callbacks.
- Workspace-managed panel action buttons and docked Debug Console buttons now expose context-specific accessible labels.
- CSS adds focus-visible outlines for shell headers, resize grips, and split handles while preserving invisible grips at rest.
- `changelog.md` entry `[2522]` records the Phase 14 implementation.

#### Acceptance Criteria

- Shell close/dock/float/reset controls have descriptive accessible names.
- Invisible resize/split handles are keyboard focusable or intentionally hidden with a documented rationale.
- Dock split resizing supports keyboard adjustment where practical.
- Touch/pointer resize and drag behavior continues to build cleanly.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke pending: keyboard tab through shell controls, keyboard split resize, pointer/touch drag/resize, and panel action buttons.

#### Risks

- Making every invisible grip tabbable can create a noisy keyboard experience; prioritize split handles and meaningful shell controls.
- Keyboard moving/resizing floating windows may require a larger interaction design than this phase should take on.

#### Wishlist Mapping

- Makes the reusable panel shell safer for future panels and broader input methods.

#### Non-Goals

- No visible grip decoration.
- No full keyboard layout manager.
- No visual redesign of panel content.

### [x] Phase 15 - Workspace Root Dock Target Model

#### Summary

Add a first-class concept of docking to the main workspace/root instead of always docking relative to an existing panel leaf. This phase should make the layout model capable of saying "dock this panel to the dashboard bottom/left/right/top" without implying the target is Lobby or Countdown Engine.

#### Implementation Spec

Expected files:

- `src/lib/panels/panelLayout.ts`
- `tests/panelLayout.test.ts`
- `docs/dockable-panel-shell-plan.md` if implementation notes need cleanup
- `changelog.md`

Implementation boundaries:

- Formalize the existing `dock-panel` action without `targetPanelId` as the supported workspace/root docking path.
- Keep the `PanelLayoutAction` shape compatible if possible:
  - `targetPanelId` present means dock beside a specific panel leaf.
  - `targetPanelId` omitted means dock beside the whole current workspace/root.
- Ensure root docking wraps the whole current `dockRoot`, not a specific panel leaf.
- Ensure root docking still creates the panel as `dockRoot` when the workspace is empty.
- Preserve panel-leaf docking for rearranging beside specific panels.
- Keep `wrapDockTarget` as the shared primitive for both root and leaf target docking unless a clearer local helper is needed.
- Add reducer tests for:
  - docking a panel to the workspace bottom wraps the current Lobby/Countdown row in a column split;
  - docking a panel to the workspace right wraps the whole current root in a row split;
  - existing panel-leaf docking still works;
  - root docking into an empty workspace creates that panel as the root;
  - root docking removes the panel from floating state.
- Do not change UI commands, buttons, or drag hit testing in this phase unless required for type compatibility.
- Do not touch `src/screens/MainScreen.tsx` in this phase; Phase 16 owns the call-site migration away from `targetPanelId: "timer"`.
- Do not change saved layout schema/version unless reducer behavior requires it; this should remain compatible with existing saved layouts.

Existing code seams to reuse:

- `panelLayoutReducer` already handles `dock-panel` without `targetPanelId` by wrapping the current `dockRoot`.
- `wrapDockTarget` already handles left/right/top/bottom placement around any `DockNode`.
- `createDefaultPanelLayout` provides the Lobby/Countdown row that root docking should wrap.
- Existing tests in `tests/panelLayout.test.ts` already cover leaf-target docking and split collapse; extend them rather than creating a new test file.

#### Checklist Items Achieved

- Formalized omitted `targetPanelId` on `dock-panel` as the workspace/root docking path.
- Preserved the existing panel-leaf `targetPanelId` path for rearranging beside specific panels.
- Added reducer tests for root bottom docking, root right docking, empty-workspace root docking, and floating-state removal.
- Kept `MainScreen` call sites unchanged for Phase 16.

#### Completed Implementation

- Added a `PanelLayoutAction` comment documenting that omitted `targetPanelId` means root/workspace docking.
- Extended `tests/panelLayout.test.ts` to prove root bottom docking wraps the original Lobby/Countdown row in a column split.
- Extended `tests/panelLayout.test.ts` to prove root right docking wraps the original Lobby/Countdown row in a row split.
- Added an empty-workspace root docking test to ensure the new panel becomes `dockRoot`.
- Confirmed root docking removes the panel from `floating` and marks it active.
- `changelog.md` entry `[2523]` records the Phase 15 implementation.

#### Acceptance Criteria

- Layout tests explicitly cover workspace/root docking with omitted `targetPanelId`.
- Root docking wraps the full current `dockRoot` for bottom/right placements.
- Root docking into an empty workspace creates the docked panel as the root.
- Root docking removes the panel from floating state and marks it active.
- Existing leaf-target docking remains available for rearranging panels.
- No `MainScreen` call sites are changed in this phase.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts` passed, 13/13.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.

#### Risks

- Changing reducer action shape may require careful migration of existing call sites.
- Saved layouts should continue to parse because layout state shape should remain compatible.
- If root docking is only documented by tests, future developers may still misuse `targetPanelId`; the test names should be explicit.

#### Wishlist Mapping

- Makes future panels dock into the main page area rather than into Lobby or Countdown Engine.

#### Non-Goals

- No drag hit-test changes.
- No visual workspace edge previews.
- No panel provider work.

### [x] Phase 16 - Default Dock Buttons And Commands Use Workspace Root

#### Summary

Move default open/dock behavior away from the hard-coded Countdown Engine target. Commands and Dock buttons should place optional panels into the main workspace/root dock area.

#### Implementation Spec

Expected files:

- `src/screens/MainScreen.tsx`
- `tests/panelLayout.test.ts` only if new behavior needs reducer coverage
- `changelog.md`

Implementation boundaries:

- Update `restorePanelInLayout` so non-floating default docks use the workspace/root docking path.
- Update explicit Dock handlers for Globe, Admin, SoundCloud, and Debug Console so they dock to the workspace/root instead of `targetPanelId: "timer"`.
- Keep drag-to-dock rearrangement behavior unchanged; dropping on a panel leaf should still target that leaf.
- Preserve current default placement preferences from `panelRegistry` where practical.
- Keep `resetlayout` restoring the Lobby/Countdown default row.
- Confirm `showglobe`, `radio`, `admin`, Debug Console Dock, and SoundCloud Dock no longer wrap Countdown Engine directly.
- Remove only the default/button `targetPanelId: "timer"` usages. The drag/drop handlers that use `targetPanelId: dropPreview.panelId` must remain untouched.
- Do not change `panelLayoutReducer` in this phase; Phase 15 already tested root docking by omitting `targetPanelId`.
- Do not change `PanelWorkspace` drop preview or hit testing; Phase 17 owns workspace-edge drag targets.

Current call sites to migrate in `src/screens/MainScreen.tsx`:

- `restorePanelInLayout`: remove `targetPanelId: "timer"` from the non-floating `dock-panel` action.
- `handleGlobeDock`: remove `targetPanelId: "timer"`.
- `handleAdminDock`: remove `targetPanelId: "timer"`.
- `handleSoundCloudDock`: remove `targetPanelId: "timer"`.
- `handleDebugConsoleDock`: remove `targetPanelId: "timer"`.

Expected behavior after migration:

- `showglobe` restores Globe as a workspace/root dock, usually below the Lobby/Countdown row because Globe registry default is `bottom`.
- `radio` restores SoundCloud Radio as a workspace/root dock, usually below the Lobby/Countdown row.
- `admin` restores Admin through its existing floating default because its registry default is `float`; if the user presses Dock, Admin docks to the workspace/root.
- Dock buttons for Globe, SoundCloud, Admin, and Debug Console wrap the whole current workspace instead of only the Countdown Engine leaf.
- Existing saved layouts that already have panels nested next to Countdown Engine are not migrated in this phase; users can run `resetlayout` to clear them.

#### Checklist Items Achieved

- Removed hard-coded `targetPanelId: "timer"` from default restore/open docking.
- Removed hard-coded `targetPanelId: "timer"` from Globe, Admin, SoundCloud, and Debug Console Dock buttons.
- Preserved drag-to-dock and docked rearrangement `targetPanelId: dropPreview.panelId` behavior.
- Confirmed no `targetPanelId: "timer"` usages remain in `MainScreen`.

#### Completed Implementation

- `restorePanelInLayout` now omits `targetPanelId` for non-floating default docks, using the Phase 15 workspace/root dock path.
- `handleGlobeDock`, `handleAdminDock`, `handleSoundCloudDock`, and `handleDebugConsoleDock` now dock against the workspace root.
- Drag/drop handlers still target the dropped panel leaf through `dropPreview.panelId`.
- `changelog.md` entry `[2524]` records the Phase 16 implementation.

#### Acceptance Criteria

- Command-opened panels dock into the workspace/root area, not inside the Countdown Engine branch.
- Dock buttons for optional panels use workspace/root docking.
- Drag-based rearrangement still supports docking beside specific panels.
- `resetlayout` still returns to Lobby + Countdown Engine only.
- A search for `targetPanelId: "timer"` in `src/screens/MainScreen.tsx` should return no default/button docking call sites after implementation.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke pending: `showglobe`, `radio`, `admin`, Debug Console Dock, dock/float/reset, then `resetlayout`.

#### Risks

- Existing saved layouts with optional panels nested beside Countdown Engine may still restore until the user resets layout.
- Root docking can create larger nested trees; split ratio defaults should stay readable.

#### Wishlist Mapping

- Fixes the immediate issue where panels appear to dock inside Countdown Engine.

#### Non-Goals

- No new drag edge zones.
- No saved-layout migration.
- No visible dock target redesign.

### [x] Phase 17 - Workspace Edge Drag-To-Dock Targets

#### Summary

Teach drag-to-dock hit testing about the main workspace edges. Floating and docked panels should be able to dock to the page-level left/right/top/bottom zones, while panel-leaf targets remain available for rearranging beside specific panels.

#### Implementation Spec

Expected files:

- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Replace the current drop preview shape with a target model that can represent both root and leaf targets:

```ts
type PanelWorkspaceDropTarget =
  | { kind: "workspace"; placement: DockPlacement }
  | { kind: "panel"; panelId: PanelId; placement: DockPlacement };
```

- `PanelWorkspace.tsx` may keep exporting `PanelWorkspaceDropPreview`, but it should either become this union or alias this union.
- Panel-leaf previews should render only when `dropPreview.kind === "panel"` and the preview `panelId` matches the leaf.
- Add a workspace-level root preview rendered by `PanelWorkspace` when `dropPreview.kind === "workspace"`.
- Give `.panel-workspace` a positioning context and add a quiet, pointer-events-none root preview style such as `.panel-workspace-root-drop-preview[data-drop-placement="left" | "right" | "top" | "bottom"]`.
- Add hit testing for the outer workspace bounds:
  - pointer near workspace left edge => root left;
  - pointer near workspace right edge => root right;
  - pointer near workspace top edge => root top;
  - pointer near workspace bottom edge => root bottom.
- Use a narrow root edge band so root targets do not swallow normal leaf rearrangement. Suggested starting point:
  - horizontal edge band: clamp roughly `12%` of workspace width between `32px` and `96px`;
  - vertical edge band: clamp roughly `12%` of workspace height between `32px` and `96px`.
- Hit-test order:
  - first reject pointers outside the workspace bounds;
  - then return a workspace/root target only when the pointer is inside the narrow outer edge band;
  - otherwise run the existing panel-local leaf hit testing.
- Keep the existing leaf-local `25%` edge zones for rearranging beside a specific panel.
- Continue skipping the `debug-console` leaf as a drop target for the Debug Console drag paths.
- Update both Debug Console drag end paths:
  - if `dropPreview.kind === "workspace"`, dispatch dock placement without `targetPanelId`;
  - if `dropPreview.kind === "panel"`, dispatch dock placement with `targetPanelId: dropPreview.panelId`.
- Preserve the Phase 16 root-docking button/default behavior.
- Preserve keyboard split resizing, pointer split resizing, reset layout behavior, saved layout parsing, and layout provider semantics.
- Do not add tab stacking, panel registration changes, or saved-layout migration in this phase.

#### Checklist Items Achieved

- Replaced leaf-only drop previews with a workspace-or-panel drop target union.
- Added workspace root-edge hit testing before leaf-local hit testing.
- Preserved existing panel-leaf drop zones for rearranging beside specific panels.
- Added a workspace-level root-edge preview style with no permanent visible chrome.
- Updated floating and docked Debug Console drag-end paths to root dock without `targetPanelId`.

#### Completed Implementation

- `src/components/PanelWorkspace.tsx` now renders panel previews for panel targets and a workspace-level preview for root targets.
- `src/screens/MainScreen.tsx` now detects narrow workspace edge bands and returns `{ kind: "workspace", placement }` for root drops, while keeping leaf targets as `{ kind: "panel", panelId, placement }`.
- Debug Console floating and docked drag-end handlers now omit `targetPanelId` for workspace/root drops and include it only for panel-leaf rearrangement.
- `src/styles/global.css` adds the root preview overlay and makes the workspace a positioning context.
- `changelog.md` entry `[2525]` records the Phase 17 implementation.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.

#### Acceptance Criteria

- Dragging a dockable panel near the workspace outer edges docks it to the main page/root.
- Dragging over a panel leaf still allows rearranging beside that panel.
- Drop preview communicates root-edge placement without adding permanent visible chrome.
- Existing pointer and keyboard split resizing continue to work.
- Debug Console can be dragged from floating mode to each workspace edge.
- Debug Console can be rearranged from docked mode to each workspace edge.
- Existing Dock buttons continue to root dock when no target is specified.

#### Build And Manual Checks

- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke test pending: drag floating Debug Console to each workspace edge, rearrange docked Debug Console beside Lobby/Countdown/optional panels, drag beside an optional docked panel such as Globe if available, then reset layout.

#### Risks

- Root-edge and leaf-zone detection can conflict near panel edges; ordering and threshold choices need care.
- Visual previews must not make the invisible-grip design feel cluttered.
- Narrow/mobile workspace scrolling can make root-edge previews awkward if the preview is not scoped to the visible workspace bounds.

#### Wishlist Mapping

- Completes the "dock into the main area" behavior needed before adding many more panels.

#### Non-Goals

- No tab stacking.
- No full panel provider.
- No saved-layout migration.

### [x] Phase 18 - Empty Dock Cell Layout Model

#### Summary

Add first-class empty dock cells to the layout model so docked workspace structure can preserve open slots instead of collapsing every time a panel moves.

#### Implementation Spec

Expected files:

- `src/lib/panels/panelLayout.ts`
- `tests/panelLayout.test.ts`
- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `changelog.md`

Implementation boundaries:

- Extend `DockNode` with an empty-cell node type, for example:

```ts
interface DockEmptyNode extends PanelMinSize {
  type: "empty";
  id: string;
  minWidth: number;
  minHeight: number;
}
```

- Empty cells must be serializable and valid saved-layout data.
- Add a default empty-cell minimum size constant, suggested starting point:
  - `minWidth: 360`;
  - `minHeight: 220`.
- Add helpers for creating stable empty cell ids. The id should never look like a panel id; use an `empty-` prefix.
- Export only the helpers/types needed by later phases. Keep reducer-only helpers private when they are not needed yet.
- Update min-size helpers so empty cells contribute their own minimum size exactly like panel leaves.
- Update validation so empty cells are accepted and duplicate panel id checks still only apply to real panels.
- Validation should reject empty cells with:
  - missing or blank `id`;
  - non-finite or non-positive `minWidth` / `minHeight`;
  - accidental `panelId` fields if the implementation wants a stricter shape.
- Do not bump `PANEL_LAYOUT_VERSION` for this phase unless implementation proves old saved layouts would become ambiguous. Existing panel-only saved layouts should remain valid.
- Keep existing `remove-docked-panel` collapse behavior unchanged unless an explicit empty-cell action requires otherwise.
- Do not add a reducer action for replacing panels with empty cells yet; Phase 19 owns movement preserving structure.
- Do not add a reducer action for replacing empty cells with panels yet; Phase 20 owns drop-into-empty-cell behavior.
- Add reducer tests for:
  - validating a layout with an empty cell;
  - rejecting malformed empty cells;
  - min-size calculations through empty cells;
  - serialization round-trip with empty cells.
- Add at least one test proving existing panel-only layout validation still passes unchanged.
- Do not render empty cells in `PanelWorkspace` yet.
- Do not add drag/drop behavior yet.
- Do not change commands or panel content.

#### Checklist Items Achieved

- Added a first-class `DockEmptyNode` type and exported `createDockEmptyNode`.
- Added default empty-cell minimum sizing.
- Updated layout min-size, split-ratio, remove, insert, and validation helpers to understand empty nodes.
- Added focused tests for empty-cell validation, malformed empty rejection, min-size clamping, and serialization.
- Added type-compatibility guards in the current workspace renderer and `MainScreen` tree walker without adding empty-cell UI/drop behavior.

#### Completed Implementation

- `src/lib/panels/panelLayout.ts` now supports `DockNode` values of type `panel`, `split`, or `empty`.
- `createDockEmptyNode` normalizes ids with the `empty-` prefix and applies default empty-cell min sizes.
- Saved layout validation accepts valid empty cells and rejects blank ids, invalid sizes, and accidental `panelId` fields.
- Empty cells contribute to split min-size clamping and are ignored by panel-id traversal/removal paths.
- `tests/panelLayout.test.ts` now covers empty-cell validation, malformed empty cells, min-size clamping through empty cells, and serialization round-trip.
- `PanelWorkspace` and `MainScreen` safely no-op when encountering empty nodes, but do not yet render interactive empty cells.
- `changelog.md` entry `[2528]` records the Phase 18 implementation.
- `npx.cmd tsx --test tests\panelLayout.test.ts` passed with 17 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.

#### Acceptance Criteria

- `DockNode` can represent panel, split, and empty cell nodes.
- Saved layout validation accepts well-formed empty cells.
- Existing panel-only layouts remain valid.
- Tests cover the new node type and serialization.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts` passed with 17 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.

#### Risks

- Empty cells can make old collapse assumptions wrong; keep this phase model-only to limit blast radius.
- Empty cell ids should not be confused with panel ids.

#### Wishlist Mapping

- Establishes the layout primitive needed for preserving old panel positions and creating future drop slots.

#### Non-Goals

- No UI rendering for empty cells.
- No docked panel dragging.
- No edge grips.
- No dropping into empty cells.

### [x] Phase 19 - Docked Panel Drag Leaves Empty Cell

#### Summary

When a user drags a docked panel by its title/header area, its old docked position should become an empty cell instead of collapsing neighboring panels into the freed space.

#### Implementation Spec

Expected files:

- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/lib/panels/panelLayout.ts`
- `tests/panelLayout.test.ts`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Add a reducer action for moving a docked panel out while preserving an empty cell at its old node position.
  - Suggested action name: `float-docked-panel-preserve-cell`.
  - Inputs: `panelId`, optional `rect`, optional `emptyCellId`.
  - If the panel is not docked, return the original state.
  - If the panel is docked, replace its `DockPanelNode` with `createDockEmptyNode(...)` and add/update the panel in `floating`.
  - Mark the moved panel active and remove it from `collapsed`.
- Add a helper that replaces a matching docked panel leaf with an empty cell without collapsing parent splits.
- Reuse existing floating rect defaults when the panel becomes floating.
- Preserve split `ratio` and `availableSize` values around the old location so neighbor panels do not resize to fill the old slot.
- Add reducer tests for:
  - floating a docked Globe while preserving an empty cell in the bottom slot;
  - floating a nested docked panel while preserving surrounding split structure;
  - no-op when the requested panel is not docked;
  - existing `undock-panel` still collapses splits for current close/float/reset paths.
- Add a docked drag start/move/end path for workspace-managed panel headers only where current components already have a reusable header area.
- Scope the first UI wiring to Debug Console if that remains the only docked panel with an existing drag callback, and document optional panel header drag as follow-up if too large.
- If wiring Globe/Admin/SoundCloud header drag is small, use the same reducer action and existing floating rect refs.
- The previous docked leaf should be replaced with an empty node, not removed/collapsed.
- Neighbor panels must not resize to fill the old slot.
- Keep close/reset actions free to use their current remove/collapse behavior unless later phases change cleanup rules.
- Wire this first for workspace-managed optional panels such as Globe, Admin, SoundCloud, and Debug Console where practical.
- Do not add edge-created empty cells yet.
- Do not support dropping into empty cells yet beyond preserving the empty node.
- Do not render rich empty-cell UI in this phase; Phase 20 owns real empty-cell rendering/drop targets. A minimal placeholder from Phase 18 is acceptable only so the layout does not crash.

#### Checklist Items Achieved

- Added a reducer-owned `float-docked-panel-preserve-cell` action.
- Added a split-preserving helper that replaces the moved docked panel leaf with an empty cell.
- Preserved split `ratio` and `availableSize` values around the old panel location.
- Added focused reducer coverage for bottom-docked Globe, nested docked panels, no-op behavior, and existing collapsing undock behavior.
- Wired the existing Debug Console docked header drag path to preserve an empty origin cell when moving or floating the panel.

#### Completed Implementation

- `src/lib/panels/panelLayout.ts` now supports floating a docked panel while leaving an empty dock cell in the old leaf position.
- `tests/panelLayout.test.ts` covers preserving the Globe bottom slot, preserving nested split structure, no-op behavior for non-docked panels, and the existing `undock-panel` collapse path.
- `src/screens/MainScreen.tsx` uses the preserve-cell action from the Debug Console docked header drag. Dropping on an existing workspace target docks the console in the new location while leaving its old cell empty; releasing outside a target floats it near the pointer.
- Rich empty-cell rendering and drop-into-empty-cell behavior remain in Phase 20.

#### Acceptance Criteria

- Dragging a docked panel out of the dock tree leaves an empty cell behind.
- The moved panel can become floating or enter the existing drag-to-dock flow.
- Neighbor panels keep their layout space instead of expanding into the old slot.
- Existing close and reset behavior still works.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts` passed with 20 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke still recommended: dock Debug Console, drag it by its header, confirm the old slot remains empty.

#### Risks

- Docked drag and floating drag share concepts but different coordinate spaces; keep the first version narrow.
- Header drag should not conflict with action buttons inside panel headers.

#### Wishlist Mapping

- Implements the "movement preserves structure" rule from the empty-cell vision.

#### Non-Goals

- No panel edge grips.
- No new empty-cell creation from resizing.
- No dropping panels into empty cells.
- No tab stacking.

### [x] Phase 20 - Empty Cell Rendering And Drop Targets

#### Summary

Render empty cells as quiet workspace slots and make them valid drop targets. Dropping a panel into an empty cell should replace the empty cell and size the panel to that slot.

#### Implementation Spec

Expected files:

- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/lib/panels/panelLayout.ts`
- `tests/panelLayout.test.ts`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Add a reducer action to replace an empty cell with a docked panel.
  - Suggested action name: `dock-panel-in-empty-cell`.
  - Inputs: `panelId`, `emptyCellId`.
  - If the empty cell does not exist, return the original state.
  - If the panel is already docked elsewhere, remove the old docked panel first using the existing collapse behavior before placing it into the empty cell.
  - If the panel is floating, remove it from `floating`.
  - Remove the panel from `collapsed`, set it as `activePanelId`, and preserve surrounding split `ratio` and `availableSize` values.
  - The inserted panel should use `createDockPanelNode(panelId)` so min sizes stay consistent with normal docking.
- Add a pure helper that recursively replaces a matching `DockEmptyNode` by id without collapsing parent splits.
  - Empty ids must match the normalized `empty-...` id stored in the layout.
  - Do not replace the first arbitrary empty cell; replacement must be by explicit id.
- Extend `PanelWorkspaceDropPreview` with empty-cell targets:

```ts
type PanelWorkspaceDropTarget =
  | { kind: "workspace"; placement: DockPlacement }
  | { kind: "panel"; panelId: PanelId; placement: DockPlacement }
  | { kind: "empty"; emptyId: string };
```

- Render empty cells with a stable `data-empty-cell-id={node.id}` in `PanelWorkspace`.
- Render a quiet empty-cell drop preview when `dropPreview.kind === "empty"` and the ids match.
  - Keep the empty cell visually subdued at rest.
  - Add a pointer-sized hit surface and cursor affordance only through the empty cell element; do not add visible corner or edge grips.
  - Use existing neon/cyan preview language, but softer than active panel previews.
- Update `MainScreen` hit testing so empty cells are checked before workspace-root edge targets and before panel-leaf targets.
  - If the pointer is inside a `.panel-workspace-empty[data-empty-cell-id]`, return `{ kind: "empty", emptyId }`.
  - Keep outside-workspace behavior returning `null`.
  - Keep panel-leaf target behavior after empty-cell checks.
  - Then fall back to workspace-root edge targets.
- Update Debug Console drag/drop paths to support empty-cell drops.
  - Floating Debug Console dropped on an empty cell should dispatch `dock-panel-in-empty-cell`.
  - Docked Debug Console dragged into an empty cell should first use the Phase 19 preserve-cell action to leave its old location empty, then dispatch `dock-panel-in-empty-cell` for the target empty id.
  - If the docked Debug Console is released outside any target, keep Phase 19 floating behavior.
  - If it is dropped on a normal panel/root target, keep the current Phase 19 behavior of preserving the origin cell and docking at the target.
- Keep this phase scoped to the existing Debug Console drag-to-dock path. Globe/Admin/SoundCloud full header-drag support should be a later phase unless the implementation is trivial and uses the same helper without broad rewiring.
- Add reducer tests for:
  - replacing the preserved bottom Globe empty cell with a floating Debug Console panel;
  - replacing a nested empty cell while preserving surrounding split structure;
  - no-op when the requested empty cell id does not exist;
  - moving an already docked panel into an empty cell removes/collapses its previous dock location and fills the target empty cell;
  - replacing an empty cell removes the panel from `floating` and `collapsed`.
- Add a lightweight rendering/hit-test-oriented test only if the repo already has a practical component test pattern. Otherwise rely on reducer tests plus build and manual smoke.
- Do not add edge-created empty cells yet.
- Do not over-polish panel content responsiveness in this phase.
- Do not bump `PANEL_LAYOUT_VERSION`; Phase 18 already made empty nodes valid and this phase only adds behavior.
- Do not add rich "drop here" copy inside cells. The cell can show a quiet preview during drag, but the normal resting state should stay unobtrusive.
- Do not make empty cells automatically disappear in this phase; cleanup/hygiene remains Phase 23.

#### Checklist Items Achieved

- Added reducer support for replacing a specific empty cell with a docked panel.
- Added empty-cell ids and quiet empty-cell drop previews in `PanelWorkspace`.
- Updated Debug Console drag hit testing so empty cells are prioritized before panel-leaf and workspace-root drop targets.
- Wired floating and docked Debug Console drops into empty cells through the reducer.
- Added reducer tests for bottom empty slots, nested empty slots, missing empty-cell no-ops, moving already docked panels, and floating/collapsed cleanup.

#### Completed Implementation

- `src/lib/panels/panelLayout.ts` now has a `dock-panel-in-empty-cell` action that replaces an explicit empty node by id, removes the panel from floating/collapsed state, and preserves surrounding split structure.
- `src/components/PanelWorkspace.tsx` now renders layout empty nodes with stable `data-empty-cell-id` values and a subdued active preview.
- `src/screens/MainScreen.tsx` now detects empty-cell targets during Debug Console drags and routes floating or docked drops to fill those cells.
- `src/styles/global.css` now gives empty cells a quiet resting footprint and a softer dashed preview during drag.
- `tests/panelLayout.test.ts` now covers empty-cell replacement and docked-panel moves into empty cells.

#### Acceptance Criteria

- Empty cells render in the workspace without looking like active content panels.
- Drag/drop can identify empty cells as targets.
- Dropping a panel into an empty cell replaces that empty node with the panel.
- Neighbor panels keep their sizes and positions.
- Existing panel-leaf and workspace-root drag-to-dock targets still work.
- Existing close, float, reset, and `undock-panel` collapse behavior still works.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts` passed with 24 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke: dock Debug Console, drag it out to leave an empty cell, then drag the floating Debug Console back into that empty cell.
- Manual smoke: dock Debug Console, drag it to a different target to leave an origin empty cell, then drag it back into that origin cell.

#### Risks

- Empty cells can be hard to discover if fully invisible; cursor/preview affordances should be quiet but usable.
- Drop target priority can conflict with root-edge docking if not ordered carefully.
- Moving a docked panel into an empty cell creates two related operations: preserve old origin, then fill target. Keep this reducer-owned and avoid ad hoc layout mutation in `MainScreen`.
- Saved layouts can now contain useful empty cells indefinitely; cleanup is intentionally deferred to Phase 23.

#### Wishlist Mapping

- Makes empty slots useful instead of only preserving space.

#### Non-Goals

- No edge-created empty cells.
- No automatic text scaling or panel-content adaptation.
- No saved-layout schema migration unless validation requires it.

### [x] Phase 21 - Workspace-Managed Docked Header Drag

#### Summary

Make docked workspace-managed panel title/header areas draggable so panels such as Globe, Admin, and SoundCloud can be rearranged, floated, or dropped into empty cells the same way the Debug Console can.

#### Implementation Spec

Expected files:

- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `src/components/DebugConsoleWindow.tsx` only if extracting/reusing drag behavior requires a shared type or helper
- `src/components/PanelWorkspace.tsx` only if target preview types need a small export or prop adjustment
- `changelog.md`

Implementation boundaries:

- Generalize the current Debug Console docked drag flow so it can be used by workspace-managed docked panels.
  - Current Debug Console flow already has pointer capture, drag preview updates, Escape cancellation, Phase 19 preserve-origin behavior, and Phase 20 empty-cell drops.
  - Reuse those reducer actions instead of adding layout reducer actions:
    - `float-docked-panel-preserve-cell`
    - `dock-panel`
    - `dock-panel-in-empty-cell`
- Update the drop-preview helper in `MainScreen`.
  - Rename or expand `getDebugConsoleDropPreview(...)` to accept the dragged `panelId`.
  - Exclude the dragged panel from panel-leaf targets, not only `"debug-console"`.
  - Preserve Phase 20 priority: empty cells first, then panel leaves, then workspace-root edges.
- Add a generic docked drag end helper in `MainScreen`.
  - Inputs: `panelId`, pointer coordinates, last/default floating rect.
  - If released outside any target, dispatch `float-docked-panel-preserve-cell` and make that panel floating near the pointer.
  - If released over an empty cell, first dispatch `float-docked-panel-preserve-cell` to leave the origin empty, then dispatch `dock-panel-in-empty-cell`.
  - If released over a panel or workspace-root target, first preserve the origin empty, then dispatch `dock-panel`.
  - Persist layout after the final reducer result.
  - Keep the current Debug Console behavior equivalent after routing through the generalized helper.
- Add docked header pointer handling to workspace-managed panel headers rendered in `MainScreen`.
  - Globe header must be draggable.
  - Admin header should be draggable when admin is open and allowed.
  - SoundCloud active-mode headers should be draggable for radio/widget/decks.
  - Header action buttons must continue to stop propagation so clicking Float/Close/Reset does not start a drag.
  - Header drag should use pointer capture and set the shared `debugConsoleDropPreview`/drop preview state, or rename that state to a generic workspace drop preview if the implementation remains small.
- Floating fallback behavior:
  - Globe uses `globeLastFloatingRectRef`.
  - Admin uses `adminLastFloatingRectRef`.
  - SoundCloud uses `soundCloudLastFloatingRectRef.current[panelId]`.
  - Debug Console continues using `debugConsoleLastFloatingRectRef`.
  - When a panel is floated by dragging out, update the matching open/visible state so the floating panel actually renders.
- Styling:
  - `workspace-managed-panel-header` should show a move cursor and grabbing state while dragging.
  - Focus-visible should be consistent with Debug Console docked headers.
  - Do not add visible drag handles; the title/header area itself is the drag target.
- Tests:
  - No new reducer tests are required if the phase only reuses Phase 19 and Phase 20 reducer actions.
  - If new pure helper logic is extracted for drag-target decisions, add focused tests for that helper. Otherwise rely on TypeScript build plus manual smoke.
- Keep Phase 21 scoped to docked header movement/rearrangement. Do not add edge-created empty-cell resizing here.

#### Checklist Items Achieved

- Generalized docked drag target lookup so it accepts the dragged panel id and excludes that panel from leaf targets.
- Added shared docked drag move/end orchestration for workspace-managed panels.
- Wired Globe, Admin, and active SoundCloud docked headers into the shared drag behavior.
- Kept Debug Console docked dragging on the same shared path.
- Added a small movement threshold so plain header clicks do not trigger drag/floating behavior.
- Added move/grabbing cursor styling and focus-visible coverage for workspace-managed panel headers.

#### Completed Implementation

- `src/screens/MainScreen.tsx` now supports docked header drag for Globe, Admin, SoundCloud, and Debug Console using the same Phase 19/20 reducer actions.
- Docked panels can be rearranged to panel/root targets, dropped into empty cells, or floated by dragging outside the workspace while leaving an empty origin cell.
- Header action groups stop pointer propagation so Float/Close/Reset buttons remain normal buttons.
- `src/styles/global.css` now gives workspace-managed docked headers move/grabbing cursors and focus-visible styling consistent with Debug Console.

#### Acceptance Criteria

- A docked Globe panel can be dragged by its header/top area and rearranged to valid panel, empty-cell, or workspace-root targets.
- Dragging docked Globe outside the workspace floats it and leaves an empty origin cell behind.
- Admin and the active SoundCloud panel use the same docked header drag behavior where rendered.
- Debug Console drag behavior still works after any helper/generalization.
- Header action buttons still click normally without starting a drag.
- Existing split resizing and empty-cell drop behavior still work.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts` passed with 24 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke: show Globe, drag the docked Globe header to the workspace top/right/left/bottom root target.
- Manual smoke: dock Globe, drag its header outside the workspace, confirm Globe floats and an empty origin cell remains.
- Manual smoke: create an empty cell, then drag docked Globe into that empty cell.
- Manual smoke: verify Debug Console still drags, floats, and drops into empty cells.
- Manual smoke: click Float/Close/Reset on Globe/Admin/SoundCloud headers and confirm no drag starts.

#### Risks

- Reusing the Debug Console drop preview state may be quicker, but names can become misleading. Rename to a generic workspace panel drop preview if the edit is small.
- Pointer capture on headers can interfere with panel action buttons if event propagation is not guarded.
- Dragging currently changes local layout only. Do not introduce sync/session behavior in this phase.
- Docked managed panels have different visibility gates; keep each panel's open/visible state intact when moving or floating.

#### Wishlist Mapping

- Implements the user's "click a title bar top area to move the panel" rule for workspace-managed panels.

#### Non-Goals

- No content-level responsive polish.
- No edge-created empty cells.
- No tab stacking.
- No multi-cell spanning.

### [x] Phase 22 - Panel Edge Grips Create Empty Cells

#### Summary

Add invisible edge grips to docked panel leaves. Dragging a panel edge inward creates a neighboring empty cell that can later receive another panel.

#### Implementation Spec

Expected files:

- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/lib/panels/panelLayout.ts`
- `tests/panelLayout.test.ts`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Add a reducer action to split a docked panel leaf with a neighboring empty cell.
  - Suggested action name: `create-empty-cell-from-panel-edge`.
  - Inputs: `panelId`, `edge`, optional `ratio`, optional `availableSize`, optional `emptyCellId`.
  - `edge` should be `"left" | "right" | "top" | "bottom"`.
  - If the target panel is not docked, return the original state.
  - If the target panel is already directly paired with an empty cell on that requested edge, update the existing split ratio when possible instead of nesting another empty cell.
  - Otherwise replace the target `DockPanelNode` with a new `DockSplitNode` containing the original panel and a `createDockEmptyNode(...)` sibling.
  - Preserve the original panel node object/min sizes; do not recreate it unless needed.
  - New split direction:
    - left/right edges use `direction: "row"`;
    - top/bottom edges use `direction: "column"`.
  - Child ordering:
    - `left` => empty first, panel second;
    - `right` => panel first, empty second;
    - `top` => empty first, panel second;
    - `bottom` => panel first, empty second.
  - Ratio should represent the first child share and should be clamped with the existing split clamp logic.
  - Store `availableSize` on the new/updated split when supplied, matching Phase 18 split-resize behavior.
  - Use a stable generated id format such as `split-empty-${panelId}-${edge}` and `empty-${panelId}-${edge}-slot` when no id is provided.
- Add reducer helpers:
  - recursively find and replace a target panel leaf with an edge-created split;
  - detect when a panel is already directly adjacent to an empty node on the requested edge;
  - update that direct split instead of creating nested duplicate empty cells.
- Add reducer tests for:
  - right edge creates `Panel | EmptyCell`;
  - left edge creates `EmptyCell | Panel`;
  - bottom edge creates `Panel / EmptyCell`;
  - top edge creates `EmptyCell / Panel`;
  - requested ratio and available size are preserved/clamped;
  - repeated same-edge creation updates/reuses the direct empty split rather than nesting another split;
  - action is a no-op when the panel is not docked.
- Add invisible edge grips to `PanelWorkspace` docked panel leaves.
  - Add a small prop such as `onPanelEdgeCreateEmpty?: (panelId, edge, ratio, availableSize) => void`.
  - Render four grip buttons/elements inside `.panel-workspace-leaf`.
  - Grips must be independent from existing split handles between neighboring nodes.
  - Grips should have generous hit areas but remain visually invisible at rest.
  - Use accessible labels, for example `Create empty cell to the right of Globe panel`.
- Edge drag behavior in `PanelWorkspace`:
  - Start pointer capture on grip pointer down.
  - During drag, optionally show a quiet preview band over the would-be empty area.
  - On pointer up, compute ratio from pointer position relative to the leaf bounds.
  - For `right`, dragging left creates/resizes empty space to the right. The panel remains first; ratio should generally be pointerX offset / leaf width, clamped by min sizes.
  - For `left`, dragging right creates/resizes empty space to the left. The empty cell is first; ratio should generally be pointerX offset / leaf width.
  - For `bottom`, dragging up creates/resizes empty space below. The panel remains first; ratio should generally be pointerY offset / leaf height.
  - For `top`, dragging down creates/resizes empty space above. The empty cell is first; ratio should generally be pointerY offset / leaf height.
  - Commit state on pointer up/cancel only; do not persist every pointer move.
  - Call the existing layout persistence path after commit.
- Add `MainScreen` wiring.
  - Pass the new edge-create callback into `PanelWorkspace`.
  - Dispatch `create-empty-cell-from-panel-edge` through `panelLayoutReducer`.
  - Persist the resulting layout only when it changes.
- Styling:
  - Add `.panel-workspace-edge-grip-*` classes with invisible hit areas.
  - Use resize cursors that match the edge (`ew-resize` or `ns-resize`).
  - If a preview is implemented, make it subtle and avoid visible lines/corners at rest.
- Do not bump `PANEL_LAYOUT_VERSION`; this phase only creates the empty nodes already accepted by Phase 18 validation.
- Keep this local-only; do not introduce sync/session behavior.
- Do not add rich empty-cell content or cleanup rules here.

#### Checklist Items Achieved

- Added a dock layout action that can split a docked panel leaf with a neighboring empty cell on any edge.
- Added same-edge reuse so repeated edge drags update the direct split instead of nesting duplicate empty cells.
- Added reducer coverage for left, right, top, bottom, repeated, clamped, and undocked no-op cases.
- Added invisible panel leaf edge grips with pointer capture, accessible labels, and resize cursors.
- Wired edge-create commits through `MainScreen` and the existing layout persistence path.

#### Completed Implementation

- `src/lib/panels/panelLayout.ts` now exposes `DockEdge` and handles `create-empty-cell-from-panel-edge`.
- `src/components/PanelWorkspace.tsx` renders four invisible edge grips per docked panel leaf and commits edge drag results on pointer up.
- `src/screens/MainScreen.tsx` dispatches and persists edge-created empty cells through the core panel layout reducer.
- `src/styles/global.css` adds invisible edge grip hit areas that stay visually quiet at rest.
- `tests/panelLayout.test.ts` includes focused coverage for the new reducer behavior.

#### Acceptance Criteria

- A full-width bottom Globe panel can create an empty cell on the right by dragging its right edge inward.
- A full-width bottom Globe panel can create an empty cell on the left by dragging its left edge inward.
- Top and bottom edge grips can create vertical empty slots.
- Dragging the same edge again resizes/reuses the existing direct empty slot instead of creating duplicate nested empty cells.
- Created empty cells can receive panels through the Phase 20 empty-cell drop path.
- Existing split resizing still works for panels that already have neighbors.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts` passed with 29 tests.
- `npm.cmd run build` passed with the existing Vite large-chunk warning.
- Manual smoke: show Globe, create left and right empty cells from Globe edges, then drop a panel into each.
- Manual smoke: create a right empty cell from Globe, drag the right grip again, and confirm the layout does not create another nested empty slot.
- Manual smoke: verify existing split handles between Lobby/Countdown and other docked panels still resize normally.

#### Risks

- Edge-created empty cells can feel like resize but actually create structure; preview/cursor behavior should make the action understandable.
- This introduces more nested splits, so cleanup rules need a dedicated follow-up.
- Grip hit areas can conflict with header dragging, content controls, and existing split handles if z-index or pointer areas are too broad.
- Ratio math can feel inverted for left/top edges; tests should lock down tree ordering and manual smoke should check the pointer feel.

#### Wishlist Mapping

- Implements the user's "drag panel edge to create an empty cell" workflow.

#### Non-Goals

- No content-level responsive polish.
- No tab stacking.
- No multi-cell spanning.

### [ ] Phase 23 - Empty Cell Cleanup And Layout Hygiene

#### Summary

Define and implement cleanup rules for empty cells so the workspace preserves intentional slots while avoiding stale unusable layout fragments.

#### Implementation Spec

Expected files:

- `src/lib/panels/panelLayout.ts`
- `tests/panelLayout.test.ts`
- `src/components/PanelWorkspace.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `changelog.md`

Implementation boundaries:

- Define explicit cleanup rules:
  - dragging a panel out preserves an empty cell;
  - dropping into an empty cell replaces it;
  - reset layout removes all empty cells;
  - close panel may collapse or preserve based on the final chosen rule;
  - tiny empty cells can be removed only through an explicit cleanup action or threshold.
- Add reducer helpers to prune redundant nested empty splits.
- Avoid automatically collapsing intentional single empty cells created for future drops.
- Add UI affordance only if needed, such as a subtle empty-cell remove action on hover/focus.
- Add tests for reset cleanup, redundant empty pruning, and preserving intentional empty slots.
- Update docs notes if close behavior is finalized here.

#### Checklist Items Achieved

- Placeholder until implementation completes.

#### Completed Implementation

- Placeholder until implementation completes.

#### Acceptance Criteria

- Empty cells do not accumulate into broken nested trees.
- Reset layout clears empty cells.
- User-created empty slots remain available until intentionally filled or cleaned.
- Layout validation and serialization remain stable.

#### Build And Manual Checks

- `npx.cmd tsx --test tests\panelLayout.test.ts`
- `npm.cmd run build`
- Manual smoke: create several empty cells, fill one, reset layout, reload saved layout.

#### Risks

- Over-aggressive cleanup would violate the "movement preserves structure" rule.
- Under-aggressive cleanup can leave confusing dead space.

#### Wishlist Mapping

- Makes the empty-cell workflow sustainable for many future panels.

#### Non-Goals

- No tab stacking.
- No multi-user synced layout.
- No deep panel content resizing polish.

## Implementation Suggestions

- When a phase introduces layout state, start with the data model and reducer tests before connecting pointer or visual behavior.
- Keep the dock tree reducer pure. Pointer events should compute intent and dispatch actions.
- Avoid making panel contents responsible for docking. Panels should render content; the shell owns placement.
- Measure dock node bounds with refs only where needed for hit testing.
- Use `requestAnimationFrame` during pointer drag for smooth visual updates, but commit persisted state only on pointer up.
- Keep fullscreen panels as an escape hatch. A fullscreen panel can temporarily render outside the dock tree and then return to its previous dock/floating state.
- Treat local storage layouts as user data. Add migrations instead of silently changing saved shapes.

## Risks

- Docking can get complex quickly if tabs, nesting, fullscreen, and floating all ship at once.
- Existing panels have different assumptions about available width and overflow.
- SoundCloud deck mode is likely the highest-risk migration because it has dense controls and mode-specific rendering.
- SoundCloud also has nested floating waveform windows that should stay local until first-class registration is intentionally designed.
- Globe fullscreen should be preserved as a special state, not forced into normal docking rules.
- Very small zoom values, including the new 1% minimum, may make hit testing feel odd if pointer coordinates and CSS zoom interact unexpectedly.
- Adding a shell header around existing panels may create duplicate headers unless the shell supports a content-only or compact-header mode.

## Open Questions

- Should every panel have a visible header, or can some panels expose a dedicated invisible drag region?
- Should `PanelShell` replace existing panel headings, wrap above them, or support a headerless/content-only mode?
- Should docked panels support close/minimize, or only float/undock?
- Should the default layout include a bottom dock lane for future console/media panels?
- Should panel layouts be local-only forever, or eventually synced per user profile/account?
- Should the debug console control layout reset commands?
- Are SoundCloud waveform pop-out windows local child windows permanently, or should they eventually become registered workspace panels?
- Should debug console fullscreen modes remain outside panel layout permanently?
- Should `PanelProvider` be introduced before live docking, or only once persistence/actions are active?
- Should Globe fullscreen temporarily remove the panel from layout, or render an overlay while preserving its dock node?

## Verification Plan

- Add reducer tests for dock insertion, removal, split collapse, ratio clamping, floating rect updates, z-order, and saved-layout validation.
- Manually test pointer drag and resize on desktop.
- Manually test narrow viewports and 16:9 desktop sizing.
- Verify docked workspace scrolls instead of breaking the dashboard height.
- Verify existing panel content still works after each migration phase.
- Run `npm.cmd run build` for implementation phases.
