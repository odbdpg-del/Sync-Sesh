# Secret 3D World Vision 28 - Studio Monitor Power Management

## Purpose

Vision 28 plans a small performance and usability pass for the standalone Recording Studio.

The studio still feels sluggish compared with the Control Room. One likely contributor is that the studio overview monitors are always "live": they keep building canvas textures and rendering animated/readout-heavy surfaces even when the player may not need them.

The goal of this vision is to add a simple monitor power system that lets the room run darker and cheaper:

- one global monitor power switch for the studio
- per-monitor `E` interaction to turn a monitor off
- real render bypass when a monitor is off, not just dimmed styling

This is a monitor-power and render-budget vision, not a studio redesign.

## Product Recommendation

Treat the studio monitors like powered hardware, not permanent HUD surfaces.

- Add one obvious studio control that turns all overview monitors on or off.
- Let the player aim at an individual studio monitor and press `E` to turn that monitor off.
- If the global power is off, all overview monitors should stay off regardless of individual state.
- If the global power is on, per-monitor off states should still be respected.
- A powered-off monitor should look intentionally dark and inactive.
- A powered-off monitor should skip expensive canvas generation work whenever possible.

Recommended user feel:

```text
Global switch ON
  overview monitors can render normally
  player can press E on a single monitor to darken only that one

Global switch OFF
  all overview monitors go dark
  studio wall reads quieter / cheaper
  monitor canvas work is bypassed
```

## Why This Change

The standalone studio is feature-rich, but it also concentrates a lot of always-on visual systems in one room.

That creates two practical issues:

- the room can feel visually noisy when every monitor is always active
- the room may be doing unnecessary work for screens the player is not using

Giving the studio monitor power controls is useful both as a player affordance and as a performance valve.

## Code Facts

Read-only findings from 2026-04-27:

- The main studio overview screens are assembled in `overviewScreens` inside `src/3d/Level1RecordingStudioRoom.tsx`.
- Those overview screens cover the status, transport, sequence, arrangement, track list, device rack, mixer, and patch/signal monitors.
- All of those screens render through the shared `StudioOverviewScreen(...)` component in `src/3d/Level1RecordingStudioRoom.tsx`.
- `StudioOverviewScreen(...)` always builds a canvas texture with `useMemo(() => createStudioOverviewScreenCanvas(screen), [screen])`.
- The monitor layout already has stable station ids like `monitor-studio-status`, `monitor-transport`, `monitor-sequence-grid`, and so on.
- Overview monitor shells are already wrapped in `StudioLayoutStationGroup`, so they have a known grouping and transform identity.
- The layout station group itself is currently registered mainly for layout targeting, not for a dedicated monitor power interaction.

## Root Cause

The current monitor rendering model assumes every overview monitor is always powered and always worth drawing.

That means:

1. monitor canvases are generated unconditionally
2. off-screen or unwanted overview displays still participate in render/update work
3. there is no player-facing way to quiet the studio visually

The missing capability is monitor power state:

- a global "all monitors" power state
- a per-monitor power state
- a render path that can short-circuit expensive screen canvas work when powered off

## Proposed Technical Direction

Start with the overview monitor bank only.

Recommended implementation shape:

1. Add studio monitor power state in `Level1RecordingStudioRoom.tsx`.
2. Separate global power from per-monitor power.
3. Teach `StudioOverviewScreen(...)` to render a cheap dark/off panel variant when powered off.
4. Only build the expensive monitor canvas when the screen is actually powered on.
5. Add one dedicated studio control for global monitor power.
6. Add direct `E` interaction on each overview monitor to toggle that single screen.

## Scope Recommendation

Keep this vision intentionally narrow.

In scope:

- overview monitor bank only
- global monitor power switch
- per-monitor `E` power toggle
- visual "off" treatment
- render bypass for powered-off overview monitors

Out of scope:

- computer stations in the Control Room
- jukebox screens
- range displays
- SoundCloud booth monitor controls in the first pass
- persistence across sessions unless later requested
- deep profiling or renderer architecture changes

## Phase Plan

### V28-1 - Monitor Power State Plumbing

Add local state for studio overview monitor power:

- one global boolean like `areStudioOverviewMonitorsPowered`
- one per-monitor map keyed by overview monitor id or station id

Acceptance:

- studio overview monitor power state exists in one place
- code can answer "is this monitor effectively on?"
- no visual behavior changes yet

Status: Complete on 2026-04-27.

Implementation notes:

- `Level1RecordingStudioRoom.tsx` now owns one global overview-monitor power boolean and one per-monitor power-state map.
- The room now has a shared helper that can answer whether a given overview monitor is effectively powered on.
- This phase does not change monitor visuals or interactions yet; it only establishes the state model for later phases.

### V28-2 - Powered-Off Screen Render Path

Teach `StudioOverviewScreen(...)` to support an explicit powered-off render mode.

Acceptance:

- a powered-off overview monitor renders as an intentional dark/off panel
- the powered-off path uses a cheap static visual
- the expensive overview canvas is not created when the monitor is off

Status: Complete on 2026-04-27.

Implementation notes:

- `StudioOverviewScreen(...)` now branches between a live canvas-texture path and a cheap powered-off panel path.
- When a monitor is off, the overview canvas is not created at all.
- Powered-off monitors now use reduced bezel emissive intensity, a dark panel surface, and a dimmed accent bar so the off state reads clearly without live content.

### V28-3 - Global Monitor Power Switch

Add one studio interactable that toggles all overview monitors on/off.

Acceptance:

- player can aim at the global switch and press `E`
- turning the switch off darkens all overview monitors
- turning the switch on restores monitors that are not individually disabled
- the switch communicates current power state clearly

Status: Complete on 2026-04-27.

Implementation notes:

- The studio now has a dedicated global `MONITORS ON/OFF` interactable control near the overview monitor wall.
- The control reuses the existing studio rectangular control style and updates its accent color/readout with the current power state.
- The global toggle is wired only to the overview monitor bank in this phase; per-monitor toggles remain for `V28-4`.

### V28-4 - Per-Monitor `E` Toggle

Add direct interaction to each overview monitor so pressing `E` on that monitor toggles only that screen.

Acceptance:

- each overview monitor has its own interactable target
- pressing `E` on one monitor toggles only that monitor
- monitor interaction does not accidentally trigger layout movement behavior
- individual off state is visually obvious

Status: Complete on 2026-04-27.

Implementation notes:

- Each overview monitor now registers its own clickable/interactable target on the screen plane itself.
- Pressing `E` on a monitor toggles only that screen's power state.
- The monitor-level interaction is attached to the visible screen surface rather than the broader layout move hitbox so it can coexist more safely with layout editing.

### V28-5 - Validation And Cleanup

Verify the monitor power system behaves predictably and does not conflict with studio layout editing.

Acceptance:

- global and per-monitor states compose correctly
- layout interaction still works
- no stuck monitor state after level transitions
- studio still builds cleanly and non-studio levels are unchanged

Status: Complete on 2026-04-27.

Implementation notes:

- Individual overview monitor toggles are now disabled while the global monitor power switch is off, which keeps the power model easier to understand.
- The manual checklist now includes explicit checks for global-off behavior, per-monitor toggles, state composition, and layout-edit coexistence.
- Monitor power state remains local to the studio room session and resets naturally on remount/level re-entry.

## Suggested Order

This one is intentionally split so Codex can do it safely in narrow passes:

1. `V28-1`
2. `V28-2`
3. `V28-3`
4. `V28-4`
5. `V28-5`

`V28-2` is the key performance phase. Even before the interaction passes land, that phase creates the real "off means cheaper" behavior.

## Implementation Notes

Recommended state model:

- global switch should default to on
- per-monitor entries can default to on implicitly by absence from the map
- effective monitor power should be:
  global on AND individual monitor on

Recommended interaction model:

- use the stable overview monitor ids already present in the studio layout specs
- register monitor-specific interactables on the actual screen mesh or a narrow screen hitbox
- avoid attaching the monitor toggle to the broader layout station move target if that would create conflicts

Recommended visual model for "off":

- keep the bezel/frame visible
- replace live canvas content with a dark panel or very faint standby tint
- avoid emissive/glow-heavy materials while off

Recommended non-goal for the first pass:

- do not try to solve every studio display in one go
- focus on the shared overview monitor bank first because it has the cleanest abstraction seam

## Risks

- Monitor toggles could conflict with layout editing if both interactions target the same geometry carelessly.
- If "off" is implemented only as a different material while still generating the live canvas, the performance gain may be small.
- If too many display types are included in the first pass, the implementation could sprawl far beyond the overview monitor bank.

These are manageable risks if the scope stays tight.

## Success Criteria

Vision 28 is successful when:

- the player can shut down all studio overview monitors with one control
- the player can turn off a single overview monitor by aiming at it and pressing `E`
- powered-off overview monitors visibly look off
- powered-off overview monitors skip their expensive live screen canvas path
- the studio feels quieter and potentially lighter without changing its core tools
