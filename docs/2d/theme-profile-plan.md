# Theme Profile Plan

## Purpose

Create a small theme profile system for Sync Sesh so the startup console and main dashboard can share named visual presets without losing their current identities.

The current startup console has a green terminal / simulation vibe. Save that profile as `green`.

The current dashboard has a blue sci-fi control-panel vibe. Save that profile as `blue`.

On first load, the app should use `default`, which means:

- Console surfaces use `green`.
- Dashboard surfaces use `blue`.

Users can later switch the app theme to `default`, `green`, or `blue`.

## Current Code Facts

- Most visual styling lives in `src/styles/global.css`.
- Dashboard colors already use root-level CSS variables such as `--bg-shell`, `--bg-panel`, `--cyan`, `--green`, and related shadows.
- Startup console styling is more hard-coded and scoped around `.loading-screen`, `.loading-screen-*`, `.debug-console-fullscreen*`, and `.debug-console-fullscreen2*`.
- `MainScreen` owns app-level UI state and debug console command handling.
- There is no formal user-facing theme setting yet.

## Theme Model

Theme selector values:

- `default`
- `green`
- `blue`

Resolved surface themes:

| Theme selector | Console theme | Dashboard theme |
| --- | --- | --- |
| `default` | `green` | `blue` |
| `green` | `green` | `green` |
| `blue` | `blue` | `blue` |

Theme profile names:

- `green`: Matrix-style terminal language: black base, green type, green borders, scanlines, terminal bars.
- `blue`: Halo-style dashboard language: dark blue shell, cyan/blue panels, blue glows, current dashboard feel.

The implementation should avoid using movie/game names in code. Use `green`, `blue`, `console`, and `dashboard` naming.

## Goals

- Preserve the current startup console as the canonical `green` console theme.
- Preserve the current dashboard as the canonical `blue` dashboard theme.
- Add a single app-level theme selector with `default`, `green`, and `blue`.
- Let future themes map console and dashboard surfaces independently.
- Keep the first implementation CSS-driven and low-risk.

## Non-Goals

- Do not redesign layout or component structure.
- Do not add new background art or licensed visual assets.
- Do not theme the 3D hidden world in this pass.
- Do not persist per-component theme settings separately.
- Do not replace all CSS variables at once if a smaller semantic layer works.

## Phase Status

- [~] TP-1: Define Theme Profile Contract
- [ ] TP-2: Wire Theme Selector State And DOM Attributes
- [ ] TP-3: Add Console Theme Variables
- [ ] TP-4: Apply Console Variables To Startup Screen
- [ ] TP-5: Apply Console Variables To Debug Consoles
- [ ] TP-6: Add Blue Console Overrides
- [ ] TP-7: Add Dashboard Theme Variables
- [ ] TP-8: Add Green Dashboard Core Overrides
- [ ] TP-9: Extend Green Dashboard Secondary Overrides
- [ ] TP-10: Add Debug Theme Commands
- [ ] TP-11: Add Visible Theme Selector
- [ ] TP-12: Add Theme Persistence
- [ ] TP-13: Theme Snapshot And Verification Polish

## TP-1: Define Theme Profile Contract

Status: `[~]` implementation prepared, awaiting review.

### Summary

Add a tiny theme model that separates the user's selected theme from the resolved console/dashboard themes.

### Expected Work

- Add `src/lib/theme/themeProfiles.ts`.
- Define:
  - `ThemeSelection = "default" | "green" | "blue"`
  - `SurfaceTheme = "green" | "blue"`
  - `ResolvedThemeProfile = { selection; console; dashboard }`
- Add a pure resolver:

```ts
resolveThemeProfile("default") // { selection: "default", console: "green", dashboard: "blue" }
resolveThemeProfile("green")   // { selection: "green", console: "green", dashboard: "green" }
resolveThemeProfile("blue")    // { selection: "blue", console: "blue", dashboard: "blue" }
```

### Acceptance Criteria

- Theme selection logic is centralized and testable.
- Future themes can add new console/dashboard mappings without rewriting components.
- No UI behavior or styling changes yet.

### Prepared Implementation

- Added the pure theme profile contract and resolver in `src/lib/theme/themeProfiles.ts`.
- Added focused tests for `default`, `green`, and `blue` mappings.
- Verification passed locally:
  - `npx.cmd tsx --test tests/themeProfiles.test.ts`
  - `npm.cmd run build`

## TP-2: Wire Theme Selector State And DOM Attributes

### Summary

Expose the resolved theme profile at app level and mark the DOM with stable data attributes.

### Expected Work

- Store `themeSelection` in `MainScreen`, defaulting to `default`.
- Derive `themeProfile` with `resolveThemeProfile(themeSelection)`.
- Add data attributes on `.app-stage` or a nearby top-level wrapper:
  - `data-theme-selection`
  - `data-console-theme`
  - `data-dashboard-theme`
- Keep default behavior unchanged visually:
  - `data-console-theme="green"`
  - `data-dashboard-theme="blue"`

### Acceptance Criteria

- App loads in `default`.
- DOM exposes the resolved console and dashboard themes for CSS.
- No visible change in default mode.

## TP-3: Add Console Theme Variables

### Summary

Add semantic console CSS variables with current green values as the default.

### Expected Work

- Add console semantic variables near the global theme variables in `src/styles/global.css`.
- Suggested variables:
  - `--console-bg`
  - `--console-bg-strong`
  - `--console-line`
  - `--console-text`
  - `--console-text-muted`
  - `--console-accent`
  - `--console-accent-strong`
  - `--console-error`
  - `--console-warning`
  - `--console-glow`
- Keep the variable values aligned with the current green console look.
- Do not convert selectors in this phase beyond adding variables.

### Acceptance Criteria

- Build passes.
- No visible UI change.
- Variables exist for later console conversion phases.

## TP-4: Apply Console Variables To Startup Screen

### Summary

Move the Room Link Protocol startup screen and minimized widget from hard-coded green values to console semantic variables.

### Expected Work

- Update `.loading-screen`, `.loading-screen-shell`, `.loading-screen-minimized-widget`, and related `.loading-screen-*` selectors to use console variables.
- Preserve the current green appearance in `default` mode.
- Preserve minimize, drag, resize, scroll, speed slider, and full-screen background console behavior.

### Acceptance Criteria

- Startup Room Link Protocol looks unchanged in default mode.
- Minimized widget looks unchanged in default mode.
- Build passes.

## TP-5: Apply Console Variables To Debug Consoles

### Summary

Move debug console surfaces from hard-coded green values to console semantic variables.

### Expected Work

- Update floating debug console selectors where practical:
  - `.debug-console-window`
  - `.debug-console-panel`
  - `.debug-console-*`
- Update legacy/fullscreen console selectors:
  - `.debug-console-fullscreen*`
- Update background console selectors:
  - `.debug-console-fullscreen2*`
- Preserve current green appearance in `default` mode.

### Acceptance Criteria

- Floating, fullscreen, and background consoles look unchanged in default mode.
- Console commands and curtain/minimize behavior are unchanged.
- Build passes.

## TP-6: Add Blue Console Overrides

### Summary

Add the first real visual console theme switch by overriding console variables for `data-console-theme="blue"`.

### Expected Work

- Add `[data-console-theme="blue"]` CSS variable overrides.
- Make the console blue/cyan while keeping terminal scanlines and operator-console identity.
- Verify that `default` and `green` remain green.

### Acceptance Criteria

- `data-console-theme="blue"` changes startup and debug console surfaces to blue/cyan.
- `data-console-theme="green"` and default variables keep the console green.
- Text contrast remains readable.
- Build passes.

## TP-7: Add Dashboard Theme Variables

### Summary

Create a dashboard theme variable layer using the current dashboard as the blue baseline.

### Expected Work

- Identify the existing root variables that represent dashboard surfaces, accents, shadows, and borders.
- Add semantic dashboard variables where useful, or document which existing variables are the dashboard theme contract.
- Keep current values as the blue/default baseline.
- Do not add green overrides yet.

### Acceptance Criteria

- Dashboard visual output is unchanged.
- Theme contract for dashboard variables is clear for later green overrides.
- Build passes.

## TP-8: Add Green Dashboard Core Overrides

### Summary

Add green-mode dashboard overrides for the core app shell and primary dashboard panels.

### Expected Work

- Add `[data-dashboard-theme="green"]` overrides for core dashboard variables.
- Target the main app shell, header, lobby panel, timer panel, buttons, and primary status panels.
- Keep warning/error colors distinct.

### Acceptance Criteria

- `data-dashboard-theme="green"` makes core dashboard surfaces feel green/terminal-inspired.
- `default` and `blue` keep the current blue dashboard look.
- Main dashboard text remains readable.
- Build passes.

## TP-9: Extend Green Dashboard Secondary Overrides

### Summary

Extend green dashboard styling to secondary app surfaces.

### Expected Work

- Review and tune secondary surfaces:
  - SoundCloud panels
  - Admin panel
  - status footer
  - banners
  - non-3D utility panels
- Avoid changing 3D hidden-world styling.

### Acceptance Criteria

- Green dashboard mode feels consistent beyond the first viewport.
- Default and blue remain visually unchanged.
- Build passes.

## TP-10: Add Debug Theme Commands

### Summary

Let the operator switch themes from the debug console before adding visible UI controls.

### Expected Work

- Add debug console commands:
  - `theme`
  - `theme default`
  - `theme green`
  - `theme blue`
- Update console help and unknown-command guidance.
- Log resolved mapping on success, for example:
  - `theme=default console=green dashboard=blue`

### Acceptance Criteria

- Theme commands work from floating, fullscreen, and background consoles.
- Invalid theme names produce helpful guidance.
- Build passes.

## TP-11: Add Visible Theme Selector

### Summary

Add a user-facing way to switch among `default`, `green`, and `blue`.

### Expected Work

- Add a small theme selector to the app header if it fits cleanly.
- If header placement is too crowded, add it to the admin/settings area first.
- Use a compact segmented control or select-style control.
- Keep labels exactly:
  - `Default`
  - `Green`
  - `Blue`

### Acceptance Criteria

- Users can switch themes without using debug commands.
- The control reflects the current selected theme.
- Layout remains clean on desktop and narrow viewports.
- Build passes.

## TP-12: Add Theme Persistence

### Summary

Persist the selected theme locally.

### Expected Work

- Store `themeSelection` in `localStorage`.
- Fall back to `default` if storage is missing or invalid.
- Avoid syncing theme choice to other users or the room in this phase.

### Acceptance Criteria

- Refresh keeps the selected theme.
- Invalid stored values reset safely to `default`.
- Build passes.

## TP-13: Theme Snapshot And Verification Polish

### Summary

Add final observability and verification polish for the first theme system.

### Expected Work

- Consider adding theme selection and resolved console/dashboard themes to the debug snapshot.
- Run focused tests and build.
- Manually verify the full matrix:

| Selection | Expected console | Expected dashboard |
| --- | --- | --- |
| `default` | green | blue |
| `green` | green | green |
| `blue` | blue | blue |

Manual checks:

- Startup Room Link Protocol window.
- Minimized startup widget.
- Background console / console2.
- Floating debug console.
- Main dashboard panels.
- Lobby and timer panels.
- Theme selector.
- Mobile/narrow viewport.

### Acceptance Criteria

- Theme state is visible in debug/operator diagnostics if added.
- All three theme selections match the expected mapping.
- No obvious contrast or overflow regressions.

## Suggested Implementation Notes

- Start with CSS custom properties rather than duplicating component markup.
- Keep data attributes near the app root so both startup overlay and dashboard can inherit variables.
- Use semantic names like `console` and `dashboard`; avoid `matrix` and `halo` in code.
- Prefer gradual variable migration. It is acceptable for a conversion phase to leave minor hard-coded colors if they do not block the main visible theme switch.
- Do not theme the background video in the first pass unless it clashes badly with green dashboard mode.

## Open Questions

- Should the visible theme selector live in the header, admin panel, or both?
- Should theme selection persist only locally, or eventually sync per room/user?
- Should `blue` console mode keep terminal scanlines, or become a cleaner blue operator console?

## Recommended Defaults

- Put the first visible control in the app header if it can fit cleanly; otherwise put it in the admin/settings area first and rely on console commands during development.
- Persist locally only for the first version.
- Keep console scanlines in both green and blue so the console identity remains consistent.

## Changelog Requirement

Implementation phases that change app code, styling, tests, or config must add a top entry to `changelog.md`.

Docs-only edits to this plan do not require a changelog entry unless explicitly requested.
