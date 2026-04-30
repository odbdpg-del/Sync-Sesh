# Small Mode Plan

## Summary

Add a compact dashboard presentation mode called `Small Mode`. This mode keeps the Sync Sesh title bar visible, adds a live timer status panel to that title bar, and hides the main dashboard panels so the app can run as a small always-visible session/timer surface.

Small Mode should be temporary UI state, not a layout mutation. Entering or leaving it must not change the user's saved dock layout, empty cells, floating rects, panel visibility preferences, or reset layout behavior.

## Goals

- Let the user enter Small Mode by typing `small` in the debug console.
- Let the user enter Small Mode by clicking the Sync Sesh logo image in the top-left header.
- Add one new title-bar status panel showing the current timer time.
- Use the existing custom timer/seven-segment display styling where possible.
- Hide the main dock workspace while Small Mode is active.
- Hide the bottom `StatusFooter` while Small Mode is active.
- Keep sync/session state running normally while the UI is compacted.
- Make exiting Small Mode obvious and reversible.
- Avoid changing persisted panel layout state.

## Current Code Notes

- `src/components/AppHeader.tsx` owns the logo/title lockup and header status pills.
- `src/screens/MainScreen.tsx` owns debug command handling, `AppHeader` rendering, `PanelWorkspace` rendering, floating/docked panel rendering, and `StatusFooter`.
- `src/components/TimerPanel.tsx` already derives the timer display from `countdownDisplay`.
- `src/components/SevenSegmentDisplay.tsx` renders the custom segmented timer font for numeric values.
- Recent dock layout work makes it important that Small Mode only hides the workspace, not rewrites it.

## Recommended Behavior

### Entering Small Mode

Small Mode should activate from either trigger:

- Debug command: `small`
- Logo click: click the Sync Sesh image inside the top-left brand lockup

When Small Mode activates:

- Keep the header visible.
- Add a timer status panel to the header meta row.
- Hide the main dock workspace that contains Lobby, Countdown Engine, empty cells, and workspace-managed panels.
- Hide the bottom status footer.
- Hide floating layout panels that belong to the dashboard surface, or at minimum prevent them from visually overlapping the compact header experience.

### Exiting Small Mode

Recommended exit paths:

- Debug command: `normal`
- Clicking the Sync Sesh logo again toggles Small Mode off.
- `resetlayout` should also leave Small Mode, because it is a clear dashboard reset command.

Optional later:

- `small off`
- `full`
- Escape key if focus is not inside an editable field

## Header Timer Status Panel

Add a new header pill that appears only while Small Mode is active.

Suggested label:

- `Timer`

Suggested display:

- Use `countdownDisplay.headline`.
- If `isSegmentDisplayValue(countdownDisplay.headline)` is true, render `SevenSegmentDisplay`.
- Otherwise render the headline as text using the existing timer font stack.

This should be visually denser than the main Countdown Engine panel. It should fit in the title bar without forcing a large header height increase.

Possible shape:

```tsx
<div className="header-pill header-pill-small-timer">
  <span className="meta-label">Timer</span>
  <SevenSegmentDisplay value={countdownDisplay.headline} className="header-small-timer-display" />
</div>
```

If the header gets too crowded on narrow screens, Small Mode can hide lower-priority status pills such as `Zoom` and `Windows` while keeping `Session`, `Round`, `Phase`, `Sync`, and `Timer`.

## State Ownership

Add local state in `MainScreen`:

```ts
const [isSmallMode, setIsSmallMode] = useState(false);
```

Do not store this in `PanelLayoutState`.

Reasons:

- Small Mode is a view mode, not panel layout.
- The dock tree should restore exactly as it was.
- Users may want to enter Small Mode briefly and return to their previous dashboard arrangement.

## MainScreen Integration

`MainScreen` should pass Small Mode props into `AppHeader`:

```tsx
<AppHeader
  ...
  isSmallMode={isSmallMode}
  countdownDisplay={countdownDisplay}
  onToggleSmallMode={() => setIsSmallMode((current) => !current)}
/>
```

Wrap dashboard-only content:

```tsx
{!isSmallMode ? (
  <PanelWorkspace ... />
) : null}
```

Also hide:

- Discord SDK failure/offline banner if the goal is an ultra-compact timer-only header.
- `StatusFooter`.
- Floating dashboard panels.

Decision to make during implementation:

- Whether Debug Console should remain available in Small Mode. Recommended first version: hide visual debug windows, but debug command handling remains available if already focused/open through existing command input before mode switch.

## Command Handling

Add commands in `handleDebugConsoleCommand`:

- `small`
  - `setIsSmallMode(true)`
  - append info output like `Small Mode enabled.`
- `normal`
  - `setIsSmallMode(false)`
  - append info output like `Small Mode disabled.`

Update debug help text to include `small` and `normal`.

For `resetlayout`:

- Add `setIsSmallMode(false)` alongside the existing layout reset cleanup.

## AppHeader Changes

Add props:

```ts
interface AppHeaderProps {
  ...
  isSmallMode?: boolean;
  countdownDisplay?: CountdownDisplayState;
  onToggleSmallMode?: () => void;
}
```

Change the logo frame from a passive `div` to a button when an `onToggleSmallMode` handler exists.

Requirements:

- Preserve the same visual styling.
- Add `aria-label="Toggle small mode"`.
- Keep the image alt text.
- Avoid changing the brand title secret-code behavior.
- Do not let the logo button submit anything.

## Styling Notes

Add focused CSS instead of altering global header structure too much:

- `.brand-logo-button`
- `.header-pill-small-timer`
- `.header-small-timer-display`
- `.app-shell-small-mode` or `[data-small-mode="true"]`

Timer display sizing should use header/container-friendly values, not the large Countdown Engine values.

Example direction:

```css
.header-pill-small-timer {
  min-width: 180px;
}

.header-small-timer-display {
  --segment-width: 0.28rem;
  --segment-length: 1.2rem;
}
```

If the display is text rather than segmented, use `font-family: var(--font-mono)` and keep `font-variant-numeric: tabular-nums`.

## Accessibility

- The logo button must be keyboard focusable.
- The new timer status should have a readable label.
- The timer display should preserve the accessible label from `SevenSegmentDisplay`.
- Small Mode should not trap focus.
- If content disappears while focus is inside a hidden panel, implementation should move focus to the header or the logo button.

## Phase Plan

These phases are intentionally small enough for Codex to complete one at a time. Each phase should include a changelog entry when it changes code.

## Implementation Prep - Phases 1-3

Phases 1-3 can be implemented together as the first foundation slice.

### Scope

This slice only introduces the Small Mode state and command controls. It should not add the header timer pill, logo click behavior, workspace hiding, footer hiding, or floating panel hiding yet.

Expected user-visible behavior after this slice:

- `small` command is accepted and reports that Small Mode is enabled.
- `normal` command is accepted and reports that Small Mode is disabled.
- `help` lists `small` and `normal`.
- `resetlayout` clears Small Mode.
- The dashboard still looks the same because hide/render rules are not implemented yet.

### Code Touch Points

Primary file:

- `src/screens/MainScreen.tsx`

Likely edit locations:

- Near other top-level `useState` declarations: add `isSmallMode`.
- `DEBUG_CONSOLE_COMMAND_HELP`: add `small` and `normal`.
- `handleDebugConsoleCommand`: add command branches before unrelated commands that might return early.
- Existing `resetlayout` command branch: add `setIsSmallMode(false)`.
- Main shell/root markup: add a data attribute only if there is an obvious wrapper already present.

Do not touch in this slice:

- `src/components/AppHeader.tsx`
- `src/styles/global.css`, unless a root data attribute needs a harmless selector later
- `PanelWorkspace` visibility
- `StatusFooter` visibility
- Floating panel render branches
- Panel layout reducer/state
- Local storage

### Command Semantics

Use one-way commands:

- `small` always enables Small Mode.
- `normal` always disables Small Mode.

Do not make `small` toggle. The logo can become the toggle in a later phase.

Suggested command outputs:

- `small`: `Small Mode enabled.`
- `normal`: `Small Mode disabled.`
- `resetlayout`: existing output may stay as-is, or become `All layout panels reset to the default Lobby/Timer workspace. Small Mode disabled.`

### State Placement

Use local `MainScreen` state:

```ts
const [isSmallMode, setIsSmallMode] = useState(false);
```

Keep this state separate from `corePanelLayout` and `PanelLayoutState`.

Rationale:

- Small Mode is temporary presentation state.
- Entering Small Mode should not dirty persisted layout data.
- Later phases need the previous dock/floating layout to come back exactly as-is.

### Root Data Attribute

If there is an obvious top-level dashboard wrapper in `MainScreen`, add:

```tsx
data-small-mode={isSmallMode ? "true" : undefined}
```

If adding this requires awkward markup churn, skip it until the styling phase. The state and commands are the important part for this slice.

### Verification

Required:

- `npm.cmd run build`

Manual, if running the app:

- Open Debug Console.
- Run `help`; confirm `small` and `normal` are listed.
- Run `small`; confirm command output says Small Mode enabled.
- Run `normal`; confirm command output says Small Mode disabled.
- Run `small`, then `resetlayout`; confirm no command errors and reset still returns default layout.

### Changelog

Because this slice changes app code, add a top entry to `changelog.md`.

Suggested title:

```md
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode State And Commands`
```

Suggested summary bullets:

- Added MainScreen-owned Small Mode state.
- Added `small` and `normal` debug commands plus help text.
- Made `resetlayout` clear Small Mode without mutating persisted panel layout.
- Build/test command run.

## Implementation Prep - Phases 4-7

Phases 4-7 are the header activation slice. This group makes Small Mode visible and clickable in the title bar, but it still should not hide the dashboard workspace, footer, banners, or floating panels.

### Scope

This slice wires `MainScreen` state into `AppHeader`, lets the Sync Sesh logo toggle Small Mode, and renders the new timer status pill while Small Mode is active.

Expected user-visible behavior after this slice:

- Typing `small` shows a new `Timer` status pill in the title bar.
- Typing `normal` hides the `Timer` status pill.
- Clicking the top-left Sync Sesh logo toggles Small Mode on and off.
- The main Lobby/Countdown workspace still remains visible.
- The bottom status footer still remains visible.
- Existing `Session`, `Round`, `Phase`, `Sync`, `Zoom`, and `Windows` header pills remain visible unless a narrow-width follow-up requires cleanup.

### Code Touch Points

Primary files:

- `src/screens/MainScreen.tsx`
- `src/components/AppHeader.tsx`
- `src/styles/global.css`

Likely edit locations:

- `MainScreen` `AppHeader` render call: pass `isSmallMode`, `countdownDisplay`, and `onToggleSmallMode`.
- `AppHeaderProps`: add optional Small Mode props.
- `AppHeader` logo markup: preserve the current visual structure while making the logo frame a button.
- `AppHeader` header meta row: add the timer pill when `isSmallMode` and `countdownDisplay` are present.
- Header/logo CSS near `.brand-logo-frame`, `.header-meta`, and `.header-pill`.
- Seven-segment CSS can be reused, but header-specific sizing should live on `.header-small-timer-display`.

Do not touch in this slice:

- `PanelWorkspace` visibility.
- `StatusFooter` visibility.
- Discord/offline banner visibility.
- Floating panel visibility.
- Panel layout reducer/state.
- Layout storage.
- Debug command semantics beyond using the already-existing `isSmallMode` state.

### Type And Import Notes

Use the existing countdown display type:

```ts
import type { CountdownDisplayState } from "../types/session";
```

Use the existing segmented timer component:

```ts
import { SevenSegmentDisplay, isSegmentDisplayValue } from "./SevenSegmentDisplay";
```

`AppHeader` lives in `src/components`, so the relative import for session types should stay:

```ts
import type { CountdownDisplayState, SessionInfo, SyncStatus } from "../types/session";
```

`countdownDisplay.headline` is the correct header timer source. It gives `00:50`, `ARMED`, `LOBBY`, and related phase-friendly headline values.

### Phase 4 Implementation Notes

Keep Phase 4 visually inert.

Tasks:

- Add optional props to `AppHeaderProps`: `isSmallMode`, `countdownDisplay`, and `onToggleSmallMode`.
- Destructure them in `AppHeader`.
- Pass those props from `MainScreen`.
- Use an inline callback in `MainScreen`: `onToggleSmallMode={() => setIsSmallMode((current) => !current)}`.
- Do not render the timer pill yet.
- Do not make the logo clickable yet.

Done when:

- App builds.
- `AppHeader` has the data needed for later phases.
- Header DOM remains effectively unchanged.

### Phase 5 Implementation Notes

Make only the logo toggle interactive.

Recommended markup approach:

```tsx
const logoFrameContent = (
  <>
    <span className="brand-logo-frame-inner" aria-hidden="true" />
    <img src={syncSeshLogo} alt="Sync Sesh logo" className="brand-logo" />
  </>
);
```

Then render:

```tsx
{onToggleSmallMode ? (
  <button
    className="brand-logo-frame brand-logo-button"
    type="button"
    onClick={onToggleSmallMode}
    aria-pressed={isSmallMode}
    aria-label={isSmallMode ? "Exit small mode" : "Enter small mode"}
  >
    {logoFrameContent}
  </button>
) : (
  <div className="brand-logo-frame">{logoFrameContent}</div>
)}
```

CSS notes:

- Add `.brand-logo-button` to reset default button styling.
- Preserve the existing `.brand-logo-frame` dimensions, border, background, and shadows.
- Add `cursor: pointer`.
- Add a visible `.brand-logo-button:focus-visible` style.
- Avoid changing `.brand-lockup` or title sizing.

Done when:

- The logo can be clicked to toggle `isSmallMode`.
- Keyboard users can tab to the logo button and activate it.
- The logo looks the same at rest.

### Phase 6 Implementation Notes

Render the timer pill only while Small Mode is active.

Recommended render shape inside `.header-meta`:

```tsx
{isSmallMode && countdownDisplay ? (
  <div className="header-pill header-pill-small-timer">
    <span className="meta-label">Timer</span>
    {isSegmentDisplayValue(countdownDisplay.headline) ? (
      <SevenSegmentDisplay value={countdownDisplay.headline} className="header-small-timer-display" />
    ) : (
      <strong className="header-small-timer-text">{countdownDisplay.headline}</strong>
    )}
  </div>
) : null}
```

Placement:

- Put the timer pill near the front of the meta row, preferably after `Sync` or before `Session`.
- If visual priority matters, use `Timer`, `Session`, `Round`, `Phase`, `Sync`, `Zoom`, `Windows`.
- Do not hide any other header pills in this phase.

Done when:

- `small` makes the timer pill appear.
- `normal` makes the timer pill disappear.
- Countdown values use `SevenSegmentDisplay`.
- Text states like `ARMED` use the fallback text style.

### Phase 7 Implementation Notes

Polish the compact header timer and logo button behavior.

Important current decision:

- The Small Mode timer should be a small status-panel value, not the same size as the `SYNC SESH` title.
- It must fit inside its own header pill without overlapping `Session`, `Round`, `Phase`, `Sync`, or `Zoom`.
- The timer is a compact status signal while the full dashboard is still visible.

Current code status before Phase 7:

- `.brand-logo-button` and `.brand-logo-button:focus-visible` already exist.
- `.header-pill-small-timer`, `.header-small-timer-display`, and `.header-small-timer-text` already exist.
- The timer pill is currently rendered first in `.header-meta`.
- Numeric timer values already use `SevenSegmentDisplay`.
- Text timer values like `ARMED` already use `.header-small-timer-text`.

Primary Phase 7 goal:

- Make the compact timer look intentional and stable in the header at normal desktop widths.
- Keep the existing dashboard visible; this phase is still not a hide-workspace phase.

CSS to review and adjust:

```css
.brand-logo-button {
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.brand-logo-button:focus-visible {
  outline: 2px solid rgba(119, 255, 115, 0.78);
  outline-offset: 4px;
}

.header-pill-small-timer {
  min-width: 132px;
  flex: 1 1 132px;
  align-content: center;
}

.seven-segment-display.header-small-timer-display {
  --segment-width: 0.14rem;
  --segment-length: 0.58rem;
  --segment-off-color: rgba(79, 139, 153, 0.18);
  gap: 0.1rem;
  width: max-content;
  max-width: 100%;
}

.header-small-timer-text {
  font-family: var(--font-display);
  font-size: 1.08rem;
  line-height: 1;
  color: var(--cyan);
}
```

Implementation details:

- Compare the timer height against other status pill values, not against the `SYNC SESH` title.
- Keep segment sizing header-specific and small. Do not use the large Countdown Engine panel `cqw` sizing here.
- Make the header timer selector at least as specific as `.seven-segment-display`, because the generic segment display rule is declared later in the stylesheet.
- Check both numeric (`00:50`) and text (`ARMED`, `LOBBY`) timer states.
- If numeric values overflow the pill, reduce `--segment-length` before widening the timer pill.
- If text states wrap, reduce `.header-small-timer-text` font size before widening the timer pill.
- Keep `.header-pill-small-timer` in the existing header meta flow; do not create a nested card.
- Avoid responsive hiding in this phase unless the compact timer still causes overlap at normal desktop width.
- If header crowding is obvious, document that Phase 11 should hide lower-priority `Zoom` and `Windows` pills in Small Mode.

Done when:

- The header timer is visibly small and contained inside its status pill.
- The timer pill looks deliberate, not like a large Countdown Engine duplicate.
- Existing header pills still fit at the normal app width.
- Logo focus styling is still visible and does not shift layout.
- No visible dashboard areas are hidden yet.

### Verification

Required for each code phase:

- `npm.cmd run build`

Manual checks after Phase 7:

- Run `small`; the timer pill appears.
- Run `normal`; the timer pill disappears.
- Click the Sync Sesh logo; Small Mode toggles on.
- Click the Sync Sesh logo again; Small Mode toggles off.
- Run `resetlayout` while Small Mode is on; Small Mode exits.
- Confirm Lobby, Countdown Engine, footer, and banners are still visible after this slice.
- Confirm keyboard focus is visible on the logo button.

### Changelog

Each code phase should add its own top changelog entry.

Suggested phase titles:

```md
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode Header Prop Plumbing`
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode Logo Toggle`
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode Header Timer Pill`
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode Header Timer Styling`
```

## Implementation Prep - Phase 8

Phase 8 is the first true compact-view render phase. It should hide only the main dock workspace while Small Mode is active, leaving the footer, banners, and floating panels for later phases.

### Scope

This slice changes rendering only. It must not change panel layout state, panel storage, empty cells, dock ratios, floating rects, panel visibility flags, or reset behavior.

Expected user-visible behavior after this slice:

- Typing `small` or clicking the logo hides the Lobby/Countdown/dock workspace.
- The header stays visible with the compact timer pill.
- Existing sync/Discord banners remain visible for now.
- The bottom `StatusFooter` remains visible for now.
- Floating windows remain visible for now.
- Typing `normal` or clicking the logo again restores the exact previous dock workspace.

### Code Touch Points

Primary file:

- `src/screens/MainScreen.tsx`

Known render location:

- `PanelWorkspace` is rendered directly after the sync/Discord banners, around the main return body.
- `StatusFooter`, floating windows, and debug console rendering are separate below the workspace and should not be gated in this phase.

Recommended shape:

```tsx
{!isSmallMode ? (
  <PanelWorkspace
    dockRoot={corePanelLayout.dockRoot}
    ...
  />
) : null}
```

Alternative if the JSX wrapper becomes noisy:

```tsx
const shouldShowPanelWorkspace = !isSmallMode;
```

Then use:

```tsx
{shouldShowPanelWorkspace ? (
  <PanelWorkspace ... />
) : null}
```

Use the local boolean only if it makes the large return block easier to read.

### Guardrails

Do not call any layout reducer action when entering or leaving Small Mode.

Do not touch:

- `corePanelLayout`
- `corePanelLayoutRef`
- `persistCorePanelLayout`
- `PANEL_LAYOUT_STORAGE_KEY`
- `panelLayoutReducer`
- `PanelWorkspace` internals
- `StatusFooter`
- Sync/Discord banners
- Floating `DebugConsoleWindow`
- Floating `Globe`, `Admin`, or `SoundCloud` windows

Reason:

- Small Mode is a temporary presentation mode. The user should get their exact dock tree back after leaving it.

### Manual Verification

Recommended manual pass:

- Start from reset layout.
- Create an empty cell beside Countdown Engine.
- Enter Small Mode with `small`; confirm the workspace disappears.
- Exit Small Mode with `normal`; confirm the empty cell is still there.
- Enter Small Mode with the logo; confirm the workspace disappears.
- Exit Small Mode with the logo; confirm the workspace returns.
- Enter Small Mode and run `resetlayout`; confirm Small Mode exits and the default Lobby/Timer workspace returns.
- Confirm footer and banners are still visible in Small Mode until Phase 9.

### Build And Changelog

Required:

- `npm.cmd run build`
- Top changelog entry.

Suggested changelog title:

```md
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode Workspace Hide`
```

## Implementation Prep - Phase 9

Phase 9 removes the remaining dashboard chrome around the compact header: sync/Discord banners and the bottom status footer. Floating panels are still out of scope until Phase 10.

### Scope

This slice should make Small Mode feel header-only plus any existing floating windows. It should not change layout state, close panels, change sync state, suppress debug logging, or alter Discord SDK behavior. It only gates visible dashboard chrome.

Expected user-visible behavior after this slice:

- Typing `small` or clicking the logo hides the dock workspace, sync/Discord banners, and bottom footer.
- The header remains visible with the compact timer pill.
- Floating windows, including the debug console, remain visible for now.
- Typing `normal` or clicking the logo again restores banners/footer according to the same conditions they used before Small Mode.

### Code Touch Points

Primary file:

- `src/screens/MainScreen.tsx`

Known render locations:

- Sync warming banner:
  - `state.syncStatus.connection === "connecting"`
- Sync unavailable banner:
  - `state.syncStatus.connection === "offline" || state.syncStatus.connection === "error"`
- Discord identity degraded/unavailable banner:
  - `sdkState.enabled && (...)`
- Discord SDK startup failed banner:
  - `!sdkState.enabled && sdkState.startupError`
- Footer:
  - `<StatusFooter syncStatus={state.syncStatus} sdkState={sdkState} />`

Recommended shape:

```tsx
{!isSmallMode && state.syncStatus.connection === "connecting" ? (
  <div className="panel sync-banner">...</div>
) : null}
```

Use the same pattern for each banner.

For the footer:

```tsx
{!isSmallMode ? <StatusFooter syncStatus={state.syncStatus} sdkState={sdkState} /> : null}
```

### Guardrails

Do not touch:

- `state.syncStatus`
- `sdkState`
- `retryDiscordProfile`
- `StatusFooter` internals
- Banner copy or class names
- Floating `DebugConsoleWindow`
- Floating `Globe`, `Admin`, or `SoundCloud` windows
- `PanelWorkspace` beyond the already-existing Phase 8 gate
- Any layout persistence or reducer paths

Reason:

- This phase is visual hiding only. Hidden banners/footer should reappear normally when Small Mode is off and their original conditions are still true.

### Manual Verification

Recommended manual pass:

- In the current fallback/offline browser state, enter Small Mode and confirm the Discord SDK startup/offline banners disappear.
- Confirm the bottom footer disappears in Small Mode.
- Confirm the header and compact timer remain visible.
- Exit Small Mode and confirm the banners/footer return if their underlying conditions still apply.
- Confirm floating debug console still appears if it was open before Small Mode.

### Build And Changelog

Required:

- `npm.cmd run build`
- Top changelog entry.

Suggested changelog title:

```md
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode Chrome Hide`
```

## Implementation Prep - Phase 10

Phase 10 hides floating dashboard/editor surfaces while Small Mode is active. This should be a render-only gate, the same pattern as Phase 8 and Phase 9.

### Scope

This slice hides floating panels/popups that belong to the dashboard workspace surface. It must not close them, undock them, reset their rects, remove them from `corePanelLayout.floating`, or change display modes. Leaving Small Mode should restore every floating surface exactly as it was.

Expected user-visible behavior after this slice:

- Enter Small Mode and floating Globe/Admin/SoundCloud panels disappear.
- Enter Small Mode and floating or fullscreen debug console disappears.
- Exit Small Mode and the floating/fullscreen panels return in their previous mode and position.
- The compact header remains visible.
- The dock workspace, banners, and footer remain hidden from Phases 8-9.

### Code Touch Points

Primary file:

- `src/screens/MainScreen.tsx`

Known render locations:

- 3D SoundCloud standby:
  - `isThreeDModeOpen && (!isSoundCloudPanelEnabled || soundCloudPanelMode !== "decks")`
- Floating Globe:
  - `isGlobePanelVisible && !isGlobeDocked && globeFloatingPanel`
- Floating Admin:
  - `isAdminOpen && lobbyState.canUseAdminTools && !isAdminDocked && adminFloatingPanel`
- Floating SoundCloud:
  - `isSoundCloudPanelEnabled && !isActiveSoundCloudDocked && activeSoundCloudFloatingPanel`
- Debug console floating/fullscreen switch:
  - `debugConsoleDisplayMode === "float" ? (...) : debugConsoleDisplayMode === "fullscreen2" ? (...) : (...)`

Recommended render helper:

```ts
const shouldShowFloatingDashboardPanels = !isSmallMode;
```

Use it to gate:

```tsx
{shouldShowFloatingDashboardPanels && isGlobePanelVisible && !isGlobeDocked && globeFloatingPanel ? (
  <FloatingWindow ... />
) : null}
```

For debug console:

```tsx
{shouldShowFloatingDashboardPanels ? (
  debugConsoleDisplayMode === "float" ? (
    ...
  ) : debugConsoleDisplayMode === "fullscreen2" ? (
    ...
  ) : (
    ...
  )
) : null}
```

### Decision: 3D SoundCloud Standby

The `soundcloud-deck-standby` render is tied to `isThreeDModeOpen`, not the dashboard dock workspace. Treat it as out of scope unless it visibly overlaps the compact Small Mode header during manual checks.

Recommended first pass:

- Do not gate `soundcloud-deck-standby` in Phase 10.
- Only gate user-manageable floating dashboard windows and debug console surfaces.

### Guardrails

Do not touch:

- `corePanelLayout`
- `corePanelLayout.floating`
- `debugConsoleDisplayMode`
- `isDebugConsoleOpen`
- Floating rect refs
- Floating rect handlers
- Close handlers
- Dock handlers
- Reset handlers
- 3D mode shell overlays

Reason:

- Small Mode should temporarily hide floating surfaces, not change whether they exist.

### Manual Verification

Recommended manual pass:

- Open Debug Console in float mode.
- Enable Small Mode; confirm it disappears.
- Disable Small Mode; confirm it returns in float mode.
- If possible, float Globe/Admin/SoundCloud, enable Small Mode, then disable Small Mode and confirm position/mode returns.
- Confirm no layout storage changes are needed for floating panels to reappear.

### Build And Changelog

Required:

- `npm.cmd run build`
- Top changelog entry.

Suggested changelog title:

```md
## [next-id] - YYYY-MM-DD HH:mm - `codex/merge-ui-and-3d-world / Small Mode Floating Panel Hide`
```

### Phase 1 - Small Mode State Flag

Purpose:

- Introduce Small Mode state without changing visible UI yet.

Primary files:

- `src/screens/MainScreen.tsx`

Tasks:

- Add `const [isSmallMode, setIsSmallMode] = useState(false);`.
- Add a root class or data attribute on the main dashboard wrapper, for example `data-small-mode={isSmallMode ? "true" : undefined}`.
- Do not hide panels yet.
- Do not touch `AppHeader` yet.
- Do not persist the flag to local storage.

Done when:

- App builds.
- No visible dashboard behavior changes while `isSmallMode` remains false.
- The state is available for later phases.

Suggested verification:

- `npm.cmd run build`

### Phase 2 - Debug Commands

Purpose:

- Let debug commands enable and disable Small Mode.

Primary files:

- `src/screens/MainScreen.tsx`

Tasks:

- Add `small` command to set `isSmallMode` to true.
- Add `normal` command to set `isSmallMode` to false.
- Update `DEBUG_CONSOLE_COMMAND_HELP` to list `small` and `normal`.
- Append short debug command output for both commands.
- Keep the existing `resetlayout` behavior unchanged in this phase unless the implementation is trivial.

Done when:

- Typing `small` changes `isSmallMode` to true.
- Typing `normal` changes `isSmallMode` to false.
- Help text lists both commands.
- No panels are hidden yet.

Suggested verification:

- `npm.cmd run build`
- Manual: open debug console and run `small`, `normal`, and `help`.

### Phase 3 - Reset Layout Exits Small Mode

Purpose:

- Make the existing reset command clear the temporary compact view.

Primary files:

- `src/screens/MainScreen.tsx`

Tasks:

- Add `setIsSmallMode(false)` to the `resetlayout` command path.
- Keep layout reset semantics exactly as they are.
- Update the `resetlayout` command output if useful, but do not over-expand it.

Done when:

- If Small Mode is on, `resetlayout` turns it off.
- The default Lobby/Timer workspace reset still behaves the same.

Suggested verification:

- `npm.cmd run build`
- Manual: enable Small Mode, run `resetlayout`, confirm normal dashboard returns.

### Phase 4 - Header Prop Plumbing

Purpose:

- Pass Small Mode state and timer data into `AppHeader` without changing header visuals yet.

Primary files:

- `src/screens/MainScreen.tsx`
- `src/components/AppHeader.tsx`

Tasks:

- Add optional `isSmallMode`, `countdownDisplay`, and `onToggleSmallMode` props to `AppHeader`.
- Import `CountdownDisplayState` type if needed.
- Pass `isSmallMode`, `countdownDisplay`, and a toggle handler from `MainScreen`.
- Do not render the timer pill yet.
- Do not make the logo clickable yet unless it can be done without visual changes.

Done when:

- App builds.
- `AppHeader` receives the data it will need for the timer pill and logo toggle.
- Header output remains visually unchanged.

Suggested verification:

- `npm.cmd run build`

### Phase 5 - Logo Toggle

Purpose:

- Let clicking the top-left Sync Sesh logo toggle Small Mode.

Primary files:

- `src/components/AppHeader.tsx`
- `src/styles/global.css`

Tasks:

- Convert the logo frame into a `button` when `onToggleSmallMode` exists, or use a button styled like the existing frame.
- Preserve current logo visuals.
- Add `type="button"`.
- Add `aria-label="Toggle small mode"`.
- Add focus-visible styling compatible with the header.
- Ensure the logo image alt text remains.

Done when:

- Clicking the logo toggles `isSmallMode`.
- Keyboard focus can reach the logo control.
- The header still looks the same at rest.

Suggested verification:

- `npm.cmd run build`
- Manual: click logo twice and confirm Small Mode state toggles, even before hide rules are added.

### Phase 6 - Header Timer Pill Markup

Purpose:

- Add the new timer status panel to the title bar while Small Mode is active.

Primary files:

- `src/components/AppHeader.tsx`

Tasks:

- Import `SevenSegmentDisplay` and `isSegmentDisplayValue`.
- Render a `Timer` header pill only when `isSmallMode` and `countdownDisplay` are present.
- Use `countdownDisplay.headline`.
- Render `SevenSegmentDisplay` for numeric/colon values.
- Render text fallback for non-segment values.
- Keep existing header status pills visible for now.

Done when:

- In Small Mode, the header has a new timer pill.
- Outside Small Mode, header output is unchanged.
- Timer value updates when `countdownDisplay.headline` changes.

Suggested verification:

- `npm.cmd run build`
- Manual: enable Small Mode and confirm the timer pill appears.

### Phase 7 - Header Timer Pill Styling

Purpose:

- Make the timer pill compact and readable in the header.

Primary files:

- `src/styles/global.css`

Tasks:

- Add `.header-pill-small-timer`.
- Add `.header-small-timer-display`.
- Add fallback text styling for non-segment timer values.
- Use fixed/header-friendly segment variables, not the large `TimerPanel` values.
- Confirm it does not significantly increase header height.

Done when:

- The timer pill reads clearly.
- The timer pill does not overlap neighboring header pills.
- The header remains usable at common desktop widths.

Suggested verification:

- `npm.cmd run build`
- Manual: inspect header at normal and narrower app widths.

### Phase 8 - Hide Main Workspace

Purpose:

- Hide the Lobby/Countdown/dock workspace while Small Mode is active.

Primary files:

- `src/screens/MainScreen.tsx`

Tasks:

- Wrap `PanelWorkspace` so it renders only when `!isSmallMode`.
- Keep layout state untouched.
- Do not remove or reset dock state.
- Do not hide the footer yet in this phase.

Done when:

- In Small Mode, the dock workspace is not visible.
- Exiting Small Mode restores the exact previous dock layout.
- No layout persistence changes happen just from entering/exiting Small Mode.

Suggested verification:

- `npm.cmd run build`
- Manual: create an empty cell, enable Small Mode, exit Small Mode, confirm empty cell is still there.

### Phase 9 - Hide Footer And Dashboard Banners

Purpose:

- Make Small Mode truly compact by hiding lower dashboard chrome.

Primary files:

- `src/screens/MainScreen.tsx`

Tasks:

- Hide `StatusFooter` while `isSmallMode`.
- Hide Discord SDK failure/offline banner while `isSmallMode`, if the compact target is header-only.
- Review any other dashboard-only banners near the workspace and hide them if they create vertical clutter.

Done when:

- Small Mode shows the header and timer pill without the bottom footer.
- Normal mode still shows footer and banners as before.

Suggested verification:

- `npm.cmd run build`
- Manual: compare normal mode and Small Mode in offline/fallback state.

### Phase 10 - Floating Panel Behavior

Purpose:

- Decide what to do with floating dashboard panels during Small Mode.

Primary files:

- `src/screens/MainScreen.tsx`

Recommended first behavior:

- Do not render floating dashboard panels while `isSmallMode`.
- Do not close them.
- Do not remove them from `corePanelLayout.floating`.
- Restore them automatically when leaving Small Mode.

Tasks:

- Gate floating Debug Console, Globe, Admin, and SoundCloud workspace-managed floating renders behind `!isSmallMode`.
- Leave non-dashboard internal popouts alone only if they cannot exist without their parent panel.

Done when:

- Floating panels disappear in Small Mode.
- Exiting Small Mode restores floating panels exactly where they were.

Suggested verification:

- `npm.cmd run build`
- Manual: float a panel, enable Small Mode, disable Small Mode, confirm it returns.

### Phase 11 - Responsive Header Cleanup

Purpose:

- Prevent header crowding once the timer pill exists.
- Hide all non-timer status pills in Small Mode so the compact header shows only logo/title and timer.

Primary files:

- `src/components/AppHeader.tsx`
- `src/styles/global.css`

Tasks:

- Hide `Session`, `Round`, `Phase`, `Sync`, `Zoom`, and `Windows` while `isSmallMode`.
- Add CSS for `.app-header[data-small-mode="true"]` or equivalent.
- Ensure title, logo, and timer remain visible.
- Keep text inside each header pill from overflowing.

Done when:

- Header does not overlap at common small app widths.
- Timer remains readable.
- Small Mode does not show `Session`, `Round`, `Phase`, `Sync`, `Zoom`, or `Windows`.
- Normal mode header remains unchanged.

Suggested verification:

- `npm.cmd run build`
- Manual browser resize checks.

### Phase 12 - Final Manual Verification Pass

Purpose:

- Verify the full Small Mode workflow end to end.

Primary files:

- No planned code ownership. Fix only issues found during verification.

Checklist:

- Type `small`; Small Mode appears.
- Type `normal`; normal dashboard returns.
- Click logo; Small Mode toggles on/off.
- Run `resetlayout`; Small Mode exits and default layout returns.
- Create a custom dock layout, enter Small Mode, exit Small Mode, and confirm layout is unchanged.
- Float a panel, enter Small Mode, exit Small Mode, and confirm floating panel returns.
- Start or arm countdown and confirm header timer updates.
- Check the header at narrow width and confirm no text overlap.

Suggested verification:

- `npm.cmd run build`
- Manual browser pass.

## Test Recommendations

Add or update tests where practical:

- If command handling has an easy test seam, cover `small`, `normal`, and `resetlayout`.
- If not, rely on build plus manual browser verification for the first implementation.

Manual checklist:

- Type `small`; header-only timer mode appears.
- Click logo; Small Mode toggles.
- Type `normal`; full dashboard returns.
- Create a custom dock layout, enter Small Mode, exit Small Mode, and confirm the layout is unchanged.
- Start/arm countdown state and confirm the header timer updates.
- Check small viewport/header width and ensure timer status does not overlap other header pills.
