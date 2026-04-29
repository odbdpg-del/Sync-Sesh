# Matrix Debug Console Curtain Plan

## Purpose

This plan extends the existing hidden debug console into a Matrix-style full-screen operator console.

The goal is to let a user type `console` and temporarily replace the normal Sync Sesh UI with a full-screen green terminal view. The user can keep reading and entering console commands, switch the console back to the existing floating window with `float`, or drag the full-screen console down like a curtain to reveal the Sync Sesh UI underneath.

This is a debug/operator feature, not a normal player-facing workflow.

## Current Code Facts

- `src/hooks/useDebugConsoleTrigger.ts` already detects the typed `console` sequence outside interactive inputs.
- `src/screens/MainScreen.tsx` owns `isDebugConsoleOpen`, command handling, and the debug console mount.
- `src/components/DebugConsoleWindow.tsx` renders the current floating debug console inside `FloatingWindow`.
- `src/hooks/useDebugConsoleState.ts` owns the snapshot, log buffer, filters, and command output helpers.
- `src/components/LoadingScreen.tsx` and `src/styles/global.css` already contain the Matrix visual language used by the startup terminal.
- The debug console log stream and loading screen terminal stream are currently separate visual systems.

## Target Behavior

- Typing `console` opens the debug console in full-screen Matrix mode by default.
- Full-screen Matrix mode hides the Room Link Protocol/startup card and shows the actual debug console stream.
- The normal Sync Sesh UI remains mounted behind the console overlay.
- The command input is usable in full-screen mode.
- `float` switches from full-screen Matrix mode to the existing floating debug window.
- `fullscreen` switches from the floating debug window back to full-screen Matrix mode.
- `hide` closes the console in either mode.
- The user can drag the full-screen console down from a grab rail to reveal the Sync Sesh UI underneath.
- When the console is partially dragged open, only the revealed area should be interactive with Sync Sesh; covered areas should still belong to the console.

## Open Design Decisions

- Whether the drag rail should live at the top edge, bottom edge, or both.
- Whether releasing the drag should snap to full-screen, partial curtain, hidden, or floating mode.
- Whether the console should become more transparent while dragged.
- Whether startup loading-screen terminal events should be bridged into the debug console log stream.

Recommendation:

- Start with a top grab rail that drags the console downward.
- Let dropped curtain height persist, with only near-top snap-back and near-bottom hide behavior.
- Add `float`/`fullscreen` commands before drag mechanics.
- Bridge startup logs later only if we need exact parity between the loading terminal and debug console.

## Phase Status

- [x] MDC-1: Add Console Display Modes And Commands.
- [x] MDC-2: Build Full-Screen Matrix Debug Console View.
- [x] MDC-3: Add Draggable Curtain Reveal.
- [ ] MDC-4: Polish Interaction, Accessibility, And Startup Log Bridge Decision.

## MDC-1: Add Console Display Modes And Commands

### Goal

Teach the app that the debug console can be displayed as either the existing floating window or the new full-screen Matrix console.

### Scope

- Add display mode state in `src/screens/MainScreen.tsx`:
  - `debugConsoleDisplayMode: "fullscreen" | "float"`
- Change the hidden `console` trigger to:
  - open the console
  - set display mode to `"fullscreen"`
- Add command handling:
  - `float`: set display mode to `"float"`
  - `fullscreen`: set display mode to `"fullscreen"`
- Update `help` and unknown-command text to include `float` and `fullscreen`.

### Out Of Scope

- No new full-screen UI yet.
- No drag/curtain behavior yet.
- No startup log stream bridge yet.

### Verification

- Typing `console` still opens the debug console.
- Running `float` and `fullscreen` commands writes command output without breaking existing commands.
- `hide`, `clear`, `copy`, `snapshot`, `retry`, and filters still work.
- Run `npm.cmd run build`.

### Implementation Summary

Status: `[x]` completed.

- Added `DebugConsoleDisplayMode` state in `MainScreen`.
- Changed the hidden `console` trigger to select `"fullscreen"` mode before opening.
- Added `float` and `fullscreen` commands.
- Updated help and unknown-command output to list the new commands.
- Kept the current floating console renderer as the MDC-1 fallback until MDC-2 adds the real full-screen Matrix renderer.
- Verification: `npm.cmd run build` passed.

### Prep Notes

Current implementation points:

- `MainScreen` currently has only `isDebugConsoleOpen`; MDC-1 should add display mode beside it.
- `openDebugConsole` currently only calls `setIsDebugConsoleOpen(true)`; update it to also set full-screen mode.
- `DebugConsoleWindow` can keep rendering for both modes during MDC-1. Until MDC-2 exists, `"fullscreen"` can still fall back to the floating renderer.
- `handleDebugConsoleCommand` is the right place to add `float` and `fullscreen`.
- The command help text currently lists: `hide`, `clear`, `help`, `copy`, `snapshot`, `retry`, and filters. Add `float` and `fullscreen` to both help and unknown-command detail.
- Use a local union type near `MainScreen` such as:

```ts
type DebugConsoleDisplayMode = "fullscreen" | "float";
```

Recommended MDC-1 patch order:

1. Add `DebugConsoleDisplayMode` type and `debugConsoleDisplayMode` state.
2. Update `openDebugConsole` to set `"fullscreen"` before opening.
3. Add command branches for `float` and `fullscreen`.
4. Keep render output unchanged except for any temporary mode prop/comment needed for phase 2.
5. Run `npm.cmd run build`.

## MDC-2: Build Full-Screen Matrix Debug Console View

### Goal

Render the debug console as a full-screen Matrix terminal when display mode is `"fullscreen"`.

### Scope

- Create `src/components/DebugConsoleFullscreen.tsx` or add a variant component if that stays cleaner.
- Reuse the existing debug console props:
  - `snapshot`
  - `logs`
  - `activeFilter`
  - `onSubmitCommand`
  - `onClose`
- Show:
  - Matrix background layer
  - compact snapshot/status strip
  - large scrollable log stream
  - command input pinned near the bottom
- Keep command input focused when the full-screen console opens.
- Keep full-screen console styles near the existing debug/loading console CSS.

### Out Of Scope

- No drag/curtain behavior yet.
- No `FloatingWindow` behavior inside full-screen mode.
- No changes to actual debug event collection.

### Verification

- Typing `console` opens the full-screen console.
- `float` switches to the current floating debug console.
- `fullscreen` switches back.
- Log filtering and command input work in both modes.
- Run `npm.cmd run build`.

### Implementation Summary

Status: `[x]` completed.

- Added `src/components/DebugConsoleFullscreen.tsx` as a sibling renderer to the existing floating console.
- Branched `MainScreen` rendering so `"fullscreen"` uses the Matrix full-screen console and `"float"` keeps using `DebugConsoleWindow`.
- Removed the MDC-1 fallback wording from the `fullscreen` command output.
- Added Matrix full-screen styles with operator header, compact snapshot strip, large live log stream, and bottom command input.
- Full-screen command input focuses when the console opens.
- Verification: `npm.cmd run build` passed.

### Prep Notes

Current implementation points:

- `MainScreen` now owns `debugConsoleDisplayMode`.
- `DebugConsoleWindow` should remain the current `FloatingWindow` implementation for `"float"`.
- MDC-2 should add a new sibling renderer instead of forcing full-screen behavior through `FloatingWindow`.
- Recommended new file:
  - `src/components/DebugConsoleFullscreen.tsx`
- Recommended shared prop shape:

```ts
interface DebugConsoleFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: DebugConsoleSnapshot;
  logs: DebugLogEntry[];
  activeFilter: DebugConsoleFilter;
  onSubmitCommand: (command: string) => void;
}
```

Implementation details:

- Copy only the small reusable render helpers from `DebugConsoleWindow` if needed:
  - `formatSnapshotValue`
  - command submit handling
  - auto-scroll behavior
- Do not import or use `FloatingWindow` in the full-screen component.
- The component should return `null` when `isOpen` is false.
- Add an input ref and focus the command input whenever full-screen mode opens.
- Use current `formatDebugConsoleTimestamp`, `DEBUG_CONSOLE_SNAPSHOT_ROWS`, `DebugConsoleFilter`, and `DebugConsoleSnapshot` from `useDebugConsoleState`.
- Reuse `DebugLogEntry` from `debugConsole`.
- Full-screen layout should prioritize the live log:
  - top operator header with title, close button, active filter, log count
  - compact snapshot/status strip
  - large `role="log"` scrolling stream
  - bottom command input
- Matrix styling should reuse the startup screen language:
  - dark green/black fixed overlay
  - subtle grid/scanline background
  - low-opacity full-screen text/noise layer if cheap
  - monospace green terminal rows
- `MainScreen` render rule:

```tsx
{debugConsoleDisplayMode === "float" ? (
  <DebugConsoleWindow ... />
) : (
  <DebugConsoleFullscreen ... />
)}
```

Recommended MDC-2 patch order:

1. Create `DebugConsoleFullscreen.tsx`.
2. Add full-screen styles in `src/styles/global.css`.
3. Import and branch render in `MainScreen`.
4. Update `fullscreen` command output to remove the MDC-2 fallback note.
5. Run `npm.cmd run build`.

Manual checks after build:

- Type `console`; the Matrix full-screen debug console appears.
- Type `float`; the current floating window appears.
- Type `fullscreen`; full-screen mode returns.
- Use `help`, `filter auth`, `filter all`, `snapshot`, and `hide` in full-screen mode.
- Confirm the full-screen command input is focused on open.

## MDC-3: Add Draggable Curtain Reveal

### Goal

Let the user drag the full-screen Matrix console downward to reveal the Sync Sesh UI behind it.

### Scope

- Add curtain state to the full-screen console:
  - current vertical offset
  - drag active/inactive
  - snap state if needed
- Add a visible Matrix-styled grab rail.
- Use pointer events to drag the console down.
- Clamp movement between fully covering the app and mostly hidden.
- On release, settle to sensible states:
  - near top: full-screen
  - middle: user-selected dropped height
  - near bottom: hidden or close
- Ensure covered areas still intercept pointer events.
- Ensure revealed areas can be clicked/used in Sync Sesh.

### Out Of Scope

- No major redesign of the debug log contents.
- No 3D scene or Sync Sesh layout changes.
- No mobile gesture over-optimization beyond usable touch dragging.

### Verification

- Full-screen console can be dragged down and snapped.
- Sync Sesh UI is visible and usable in revealed areas.
- Console command input still works after dragging.
- `float`, `fullscreen`, and `hide` still work.
- Run `npm.cmd run build`.

### Implementation Summary

Status: `[x]` completed.

- Added local curtain offset and drag state to `DebugConsoleFullscreen`.
- Added a Matrix-styled drag rail at the top of the full-screen console.
- Added pointer capture based drag handling with snap-back, arbitrary-height reveal, and hide thresholds.
- Moved the full-screen Matrix visual treatment onto the draggable shell so revealed Sync Sesh UI areas are visible.
- Updated pointer-event behavior so the revealed area can receive clicks while the console shell remains interactive.
- Verification: `npm.cmd run build` passed.

### Prep Notes

Current implementation points:

- `src/components/DebugConsoleFullscreen.tsx` owns the full-screen Matrix overlay.
- `src/styles/global.css` owns `.debug-console-fullscreen*` styles.
- `MainScreen` should not need new state for MDC-3 unless we decide the curtain offset must persist across mode switches.
- Keep curtain behavior local to `DebugConsoleFullscreen` for now.

Recommended state:

```ts
const [curtainOffset, setCurtainOffset] = useState(0);
const [isDraggingCurtain, setIsDraggingCurtain] = useState(false);
const dragStartRef = useRef<{ pointerId: number; startY: number; startOffset: number } | null>(null);
```

Recommended constants:

```ts
const HIDE_CURTAIN_OFFSET_RATIO = 0.78;
```

Implementation details:

- Add a top grab rail inside the full-screen console shell.
- Use `pointerdown` on the rail to start dragging.
- On `pointermove`, set `curtainOffset` to the clamped drag distance from `0` to `window.innerHeight`.
- On `pointerup`/`pointercancel`, settle:
  - `< 22%` viewport height: `0` full-screen.
  - `22%` to `< 70%`: keep the user-selected dropped height.
  - `>= 70%`: call `onClose()`.
- While offset is greater than `0`, move the entire console down with `transform: translateY(var(--debug-console-curtain-offset))`.
- The fixed overlay root should allow pointer events only on the moved console panel, so the revealed app area above it remains clickable:

```css
.debug-console-fullscreen {
  pointer-events: none;
}

.debug-console-fullscreen-shell {
  pointer-events: auto;
}
```

- Keep the console fully interactive inside its covered area.
- Avoid using document-wide mouse events; pointer capture on the rail is enough.
- Reset `curtainOffset` to `0` each time full-screen mode opens so typing `console` always starts full-screen.
- Do not add animation during active drag. Add a short snap transition only when not dragging.

Recommended MDC-3 patch order:

1. Add curtain state, pointer handlers, and offset reset in `DebugConsoleFullscreen`.
2. Add the rail markup at the top of the full-screen shell.
3. Add CSS custom property for translate offset and pointer-event behavior.
4. Add snap transition and rail styling.
5. Run `npm.cmd run build`.

Manual checks after build:

- Type `console`; full-screen console opens at offset `0`.
- Drag the rail downward a small amount and release; it snaps back full-screen.
- Drag to the middle and release; it keeps the dropped height.
- Click the revealed Sync Sesh UI above the curtain; it receives clicks.
- Continue typing commands in the partially revealed console.
- Drag near the bottom and release; console hides.
- `float`, `fullscreen`, and `hide` still work.

## MDC-4: Polish Interaction, Accessibility, And Startup Log Bridge Decision

### Goal

Make the full-screen console feel intentional and decide whether startup loading logs should feed the same debug console stream.

### Scope

- Add keyboard affordances if useful:
  - `Escape` hides the full-screen console when command input is focused.
  - optional double-click rail to snap full-screen/partial.
- Add reduced-motion safe behavior for any animation.
- Tune opacity while dragging.
- Audit focus handling when switching between fullscreen and float.
- Decide whether to bridge startup loading events into debug console logs.
- If bridging is approved:
  - route loading/status events into `debugConsoleState.appendLog`
  - avoid duplicate spam
  - keep the loading screen visual queue separate only where needed for animation pacing

Startup bridge decision:

- Approved and implemented as a shared startup console event formatter.
- The debug console is now the canonical app-side operator log for load-in events.
- The loading screen still keeps its paced visual terminal feed, but it is fed from the same startup event shape instead of a separate message definition.

### Out Of Scope

- No new backend logging.
- No token/API usage.
- No persistent log storage.

### Verification

- Console remains keyboard usable.
- Focus does not get trapped after switching modes.
- No duplicate event spam appears in normal debug console usage.
- Run `npm.cmd run build`.
