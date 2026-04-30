# Loading Screen Input Boost Plan

## Goal

Make the loading screen feel responsive while it is visually printing startup logs:

- Any keyboard press or mouse/pointer press during the loading screen increases the visual console print speed a bit.
- The existing loading speed slider moves with that boosted speed.
- The real app/auth/sync loading speed is not changed.
- Hold-to-ready keyboard and mouse controls stay disabled until the loading screen is gone.

## Phase 1 - Loading Screen Input Boost

Status: `[x]`

Add input-driven speed boosting inside `src/components/LoadingScreen.tsx`.

Tasks:

- Add a constant such as `LOADING_SPEED_INPUT_BOOST = 10`.
- Listen for `keydown` and `pointerdown` while `LoadingScreen` is mounted.
- On input, increment `loadingSpeed` up to `100`.
- Ignore repeated keyboard events.
- Ignore inputs that originate from the speed slider so slider drag/click does not double-count.
- Keep the existing slider as a manual override.
- Confirm the terminal delay still comes from `getTerminalLogPrintDelay(loadingSpeed)`.

Verification:

- `npm.cmd run build`
- Manually confirm pressing keys/clicking during the loading screen moves the slider right and prints lines faster.

## Phase 2 - Disable Ready Controls While Loading

Status: `[ ]`

Prevent hold-to-ready from responding before the loading screen is gone.

Tasks:

- In `src/screens/MainScreen.tsx`, pass `readyHotkeyEnabled={!isThreeDModeOpen && !shouldShowLoadingScreen}` to `TimerPanel`.
- Add a `readyControlDisabled?: boolean` prop to `TimerPanel`.
- Pass `readyControlDisabled={shouldShowLoadingScreen}` from `MainScreen`.
- In `src/components/TimerPanel.tsx`, include `readyControlDisabled` in:
  - `useReadyHold({ enabled: ... })`
  - The hold button `disabled` condition
  - The disabled title/reason copy.

Verification:

- `npm.cmd run build`
- Manual check: while loading screen is up, keyboard and mouse hold-to-ready do nothing.
- Manual check: after loading screen is gone, hold-to-ready works as before.

## Phase 3 - Polish And Safety Check

Status: `[ ]`

Review the experience and edge cases.

Tasks:

- Confirm loading-screen click/keypress boosting does not interfere with pressing `P` to pause.
- Confirm slider remains usable on mobile layout.
- Confirm pointer events do not leak to underlying controls while loading screen is visible.
- Confirm the loading screen still releases after the paced queue drains.
- Add a changelog entry for the implementation work.

Verification:

- `npm.cmd run build`
- If practical, test Activity startup through the Cloudflare/Discord route and normal browser route.
