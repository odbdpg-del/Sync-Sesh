# Secret 3D World Vision 29 - Frontend And 3D Merge Plan

## Purpose

Vision 29 is a planning doc for merging the active frontend polish branch with the active 3D world branch without losing either person's work.

The desired end state is:

- keep the newer timer/frontend/auth polish from `origin/codex/session-ui-sync-polish`
- keep the major 3D world expansion from `origin/DJ-branch`
- preserve the newer control-room and shooting-range work already present on the frontend polish branch
- bring in the standalone Recording Studio systems and related 3D additions from the DJ branch

This is a merge-planning vision, not an implementation phase by itself.

## Product Recommendation

Treat `origin/codex/session-ui-sync-polish` as the merge base branch and integrate the 3D world work into it deliberately.

Recommended merge direction:

- start from `origin/codex/session-ui-sync-polish`
- create a dedicated integration branch for the combined work
- merge `origin/DJ-branch` into that integration branch
- resolve conflicts by preserving frontend polish from the polish branch and preserving Recording Studio / 3D world expansion from the DJ branch
- manually review the shared state, sync, and shell files instead of accepting one side wholesale

Recommended intent:

```text
Base branch:
  codex/session-ui-sync-polish
    owns the timer/frontend/auth polish
    also owns the newer control-room / shooting-range refinements

Merged in:
  DJ-branch
    owns the deeper 3D world expansion
    owns the standalone Recording Studio systems and related docs
```

## Why This Merge Needs A Plan

This is not a clean "frontend branch versus 3D branch" split.

The two branches overlap in several important files:

- timer and session UI files
- shared sync/state files
- 3D shell entry files
- some 3D world files

A blind merge risks one of two bad outcomes:

- the frontend polish branch loses timer/auth/UI improvements
- the DJ branch loses the Recording Studio and deeper 3D systems

There is also one important nuance from branch inspection:

- some files that feel like "3D world files" are actually newer on `origin/codex/session-ui-sync-polish` than on `origin/DJ-branch`

That means the merge strategy cannot simply be "take his branch for 2D and your branch for 3D by folder."

## Code Facts

Read-only branch findings from 2026-04-27:

- `origin/DJ-branch` and `origin/codex/session-ui-sync-polish` share merge base commit `a620a093c997abd70ae320e6108cff272fe7a88a`.
- `origin/codex/session-ui-sync-polish` is the stronger candidate for the current frontend/timer/auth branch.
- `origin/DJ-branch` contains the major Recording Studio and hidden-world expansion work.
- `origin/codex/session-ui-sync-polish` has newer commits in some existing 3D world files tied to the control room, range, and timer presentation.

Important branch-specific ownership findings:

### Files strongly associated with frontend polish branch

- `src/components/TimerPanel.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `src/components/LobbyPanel.tsx`
- `src/components/AdminPanel.tsx`
- `src/hooks/useReadyHold.ts`
- `src/hooks/useSecretCodeUnlock.ts`
- `src/lib/countdown/engine.ts`
- `src/lib/lobby/sessionState.ts`

### Files strongly associated with DJ / 3D world expansion branch

- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/levels/level3RecordingStudio.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/3d/useLocalDawState.ts`
- `src/3d/soundCloudBooth.ts`
- `src/3d/patchPortRegistration.ts`
- `src/3d/PlayerAvatar.tsx`
- `src/hooks/useSoundCloudGridController.ts`
- `src/lib/daw/sharedDaw.ts`
- `src/lib/soundcloud/bpmAnalysis.ts`
- `src/lib/soundcloud/bpmLengthEstimate.ts`
- related standalone-studio and DJ workflow docs under `docs/3d/`

### Files that are newer on the frontend polish branch and should not be blindly replaced by DJ branch versions

- `src/3d/ControlRoomWallDisplays.tsx`
- `src/3d/Level1RangeRoom.tsx`
- `src/3d/ShootingRangePrototype.tsx`
- `src/3d/WorldTimerDisplay.tsx`

## Merge Ownership Recommendation

The combined branch should follow these ownership rules during conflict resolution.

### Prefer `origin/codex/session-ui-sync-polish`

Use the frontend polish branch as the source of truth for:

- timer panel behavior and timer UI polish
- auth fallback and retry flow
- general dashboard layout and styling polish
- lobby/admin/dashboard behavior that is unrelated to standalone studio systems
- the newer Control Room / Shooting Range / world timer refinements already present there

### Prefer `origin/DJ-branch`

Use the DJ branch as the source of truth for:

- standalone Recording Studio world rendering
- standalone Recording Studio level config and room systems
- SoundCloud booth / grid controller / DAW helper additions
- studio monitor, patching, arrangement, and audio-engine work
- the related 3D vision docs and planning material that support this world expansion

### Require manual merge instead of one-side wins

Do not accept one side wholesale for:

- session state
- sync transport
- main shell wiring
- shared screen composition
- CSS areas where new frontend polish and new 3D support both landed

## Main Conflict Zones

These files should be treated as explicit merge-review files:

- `server/sync-server.ts`
- `src/components/SoundCloudPanel.tsx`
- `src/components/TimerPanel.tsx`
- `src/hooks/useDabSyncSession.ts`
- `src/lib/countdown/engine.ts`
- `src/lib/lobby/sessionState.ts`
- `src/lib/sync/createSyncClient.ts`
- `src/lib/sync/wsSyncClient.ts`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `src/types/session.ts`
- `src/3d/ComputerStation.tsx`
- `src/3d/FreeRoamPresenceMarker.tsx`
- `src/3d/LevelExitDoor.tsx`
- `src/3d/SimBotRoamingMarker.tsx`

These files are risky because they likely contain intertwined concerns:

- 2D shell state and auth fallback behavior
- hidden-world entry and shell integration
- shared session typing/state changes
- styling that touches both timer UI and 3D shell surfaces

## Recommended Merge Strategy

## Phase Plan

- [x] V29-1: Create A Dedicated Integration Branch.
- [x] V29-2: Merge DJ Branch Into The Integration Branch.
- [x] V29-3: Resolve Conflicts Using Ownership Rules.
- [x] V29-4: Smoke-Test The Combined Build.
- [x] V29-5: Do A Focused Post-Merge Cleanup Pass.
- [ ] V29-6: Run Manual Hidden-World And Frontend Smoke Checks.

### V29-1: Create A Dedicated Integration Branch

Start from `origin/codex/session-ui-sync-polish`.

Recommended intent:

- create a new branch specifically for the combined work
- do not merge directly into the polish branch or DJ branch first

Suggested branch role:

```text
codex/merge-ui-and-3d-world
```

Acceptance:

- integration work has an isolated branch
- neither contributor branch is used as the direct conflict playground

#### Status

`[x]` completed and manager-prepared.

#### Summary

Create the safe branch where the combined frontend-and-3D merge work will happen.

#### Expected Files

- No product code files should change in this phase.
- `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`

#### Manager-Prepared Implementation Spec

Approved scope for `V29-1`:

- Fetch the latest remote refs before branch creation so the integration branch starts from the current `origin/codex/session-ui-sync-polish`.
- Create a new integration branch from `origin/codex/session-ui-sync-polish`.
- Preferred branch name: `codex/merge-ui-and-3d-world`.
- Do not merge `origin/DJ-branch` yet in this phase.
- Do not resolve conflicts yet in this phase.
- Do not edit app, server, test, or style files in this phase.
- Update this vision doc after the branch exists so Phase 1 can be marked complete and Phase 2 can become the next active phase.

Working assumptions for this phase:

- The integration branch is disposable working space, not the final publish branch.
- `origin/codex/session-ui-sync-polish` remains the source branch for timer/frontend/auth behavior.
- `origin/DJ-branch` remains untouched until `V29-2`.

Files to avoid in `V29-1`:

- all `src/**` files
- `server/**`
- `tests/**`
- unrelated docs
- `main`
- direct edits to `origin/codex/session-ui-sync-polish` or `origin/DJ-branch`

#### Acceptance Criteria

- A dedicated local branch exists for the merge work.
- That branch is based on the current `origin/codex/session-ui-sync-polish`.
- No merge from `origin/DJ-branch` has been attempted yet.
- No app behavior has changed in this phase.

#### Risks

- Creating the branch from stale remote refs would start the merge from the wrong base.
- Creating the branch from the current local `DJ-branch` by mistake would defeat the ownership plan.
- Doing more than branch creation in this phase would blur the conflict surface and make later review harder.

#### Non-Goals

- Do not merge branches yet.
- Do not resolve conflicts yet.
- Do not run the full app verification yet.
- Do not change `main`.

#### Build And Manual Checks

- Confirm the created branch name matches the chosen integration branch.
- Confirm the integration branch points at the current `origin/codex/session-ui-sync-polish` tip before any merge work begins.

#### Checklist Items Achieved

- [x] Latest remote refs confirmed before branch creation.
- [x] Integration branch `codex/merge-ui-and-3d-world` created from `origin/codex/session-ui-sync-polish`.
- [x] No merge performed yet.
- [x] Vision doc updated to close `V29-1` and activate `V29-2`.

#### Completed Implementation

Created local integration branch `codex/merge-ui-and-3d-world` from the current `origin/codex/session-ui-sync-polish` tip after confirming the remote ref. No merge from `origin/DJ-branch` has been attempted yet, so the conflict surface for `V29-2` remains clean and isolated to the new integration branch.

### V29-2: Merge DJ Branch Into The Integration Branch

Perform one explicit merge from `origin/DJ-branch` into the integration branch.

Recommended intent:

- let Git surface the real overlap areas
- do not try to reconstruct the merge manually file-by-file before seeing the actual conflicts

Acceptance:

- merge conflict set is visible
- conflict work is limited to the integration branch

#### Status

`[x]` completed.

#### Summary

Attempt the first real branch merge so Git can reveal the exact overlap surface between the frontend polish branch and the DJ branch.

#### Expected Files

- The integration branch working tree
- `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`
- `changelog.md`

#### Manager-Prepared Implementation Spec

Approved scope for `V29-2`:

- Run one merge from `origin/DJ-branch` while checked out on `codex/merge-ui-and-3d-world`.
- Do not start conflict resolution inside this phase.
- Capture the exact conflict list produced by Git.
- Keep the merge in-progress on the integration branch so `V29-3` can resolve the surfaced conflicts in place.
- Record the actual merge outcome in this vision doc before moving on.

Files to avoid in `V29-2`:

- manual edits to conflicted app files
- ad hoc refactors unrelated to the merge surface
- `main`
- direct edits to `origin/codex/session-ui-sync-polish` or `origin/DJ-branch`

#### Acceptance Criteria

- The merge has been attempted from the integration branch.
- The conflict set is now concrete instead of hypothetical.
- No conflict has been manually resolved yet.
- The merge remains isolated to `codex/merge-ui-and-3d-world`.

#### Build And Manual Checks

- Confirm the merge was started from `codex/merge-ui-and-3d-world`.
- Confirm `origin/DJ-branch` was the merge input.
- Confirm the unresolved conflict list is recorded for `V29-3`.

#### Checklist Items Achieved

- [x] Merge attempted from `codex/merge-ui-and-3d-world`.
- [x] Merge input was `origin/DJ-branch`.
- [x] Real conflict surface captured for the next phase.
- [x] No manual conflict resolutions performed yet.

#### Completed Implementation

Started `git merge --no-ff origin/DJ-branch` from `codex/merge-ui-and-3d-world`. The merge did not complete automatically, which is the expected outcome for this phase because it exposed the real conflict surface for `V29-3`.

Git reported direct content conflicts in these files:

- `server/sync-server.ts`
- `src/3d/FreeRoamPresenceMarker.tsx`
- `src/3d/SimBotRoamingMarker.tsx`
- `src/components/AdminPanel.tsx`
- `src/components/LobbyPanel.tsx`
- `src/components/SoundCloudPanel.tsx`
- `src/components/TimerPanel.tsx`
- `src/hooks/useDabSyncSession.ts`
- `src/lib/lobby/sessionState.ts`
- `src/lib/sync/wsSyncClient.ts`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `src/types/session.ts`

Non-conflicting additions and merges from `origin/DJ-branch` are now staged in the in-progress merge, but no conflict-resolution choices have been made yet. `V29-3` is now the active phase.

### V29-3: Resolve Conflicts Using Ownership Rules

Use the ownership guidance from this doc.

Resolution priorities:

1. keep timer/frontend/auth polish from `origin/codex/session-ui-sync-polish`
2. keep newer Control Room / Shooting Range / world timer changes from `origin/codex/session-ui-sync-polish`
3. bring in standalone Recording Studio and deeper studio systems from `origin/DJ-branch`
4. manually combine shared state/sync/shell files where both branches added meaningful behavior

Acceptance:

- timer and frontend polish still behave like the polish branch
- Recording Studio systems still exist after conflict resolution
- control room and shooting range do not regress to older DJ-branch versions

#### Status

`[x]` completed.

#### Summary

Resolve the surfaced merge conflicts by hand so the integration branch keeps the intended frontend polish behavior while also preserving the standalone Recording Studio and deeper hidden-world systems.

#### Expected Files

- `server/sync-server.ts`
- `src/3d/FreeRoamPresenceMarker.tsx`
- `src/3d/SimBotRoamingMarker.tsx`
- `src/components/AdminPanel.tsx`
- `src/components/LobbyPanel.tsx`
- `src/components/SoundCloudPanel.tsx`
- `src/components/TimerPanel.tsx`
- `src/hooks/useDabSyncSession.ts`
- `src/lib/lobby/sessionState.ts`
- `src/lib/sync/wsSyncClient.ts`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `src/types/session.ts`
- `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`
- `changelog.md`

#### Manager-Prepared Implementation Spec

Approved scope for `V29-3`:

- Resolve the direct content conflicts surfaced by `V29-2`.
- Preserve frontend/auth polish behavior from the integration branch base where it was the newer source of truth.
- Preserve standalone Recording Studio, shared DAW, SoundCloud booth, avatar, and deeper hidden-world support from `origin/DJ-branch`.
- Combine the shared shell/state/sync files manually instead of taking one side wholesale.
- Stage the resolved files so the merge can advance to build verification in `V29-4`.

Conflict-resolution rules applied in this phase:

- Keep the newer Discord identity retry and polished shell/banner/header flow from the frontend polish branch.
- Keep the dual-deck SoundCloud, grid controller, SoundCloud booth, shared DAW, and studio-guitar plumbing from the DJ branch.
- Keep the frontend polish branch as the source of truth for the newer control-room/range ownership guidance, while accepting the DJ branch's avatar-based roaming markers.
- Merge the session event/state types so both display-name selection and leave-session/shared-studio behavior remain available.
- Merge the sync-server and websocket client behavior so generated profile assignment, snapshot normalization, and Discord token endpoints all survive together.

#### Acceptance Criteria

- All direct conflict markers are removed from the previously conflicted files.
- The integration branch now contains one coherent merged version of the shell, timer, lobby, sync, and hidden-world support files.
- The merge remains uncommitted but staged and ready for build verification.

#### Build And Manual Checks

- Confirm `git diff --name-only --diff-filter=U` is empty after staging the resolved files.
- Build intentionally deferred to `V29-4`.

#### Checklist Items Achieved

- [x] Resolved direct content conflicts in the surfaced overlap files.
- [x] Kept frontend polish flow for Discord identity, shell presentation, and timer-facing UI where it was the newer source of truth.
- [x] Kept DJ-branch standalone studio, dual-deck SoundCloud, shared DAW, and avatar-based roaming systems.
- [x] Combined shared sync/state/type files instead of taking one side wholesale.
- [x] Staged the resolved files so `V29-4` can run verification next.

#### Completed Implementation

Resolved the merge conflicts by combining both branches' intended ownership areas instead of choosing one side globally. The integration branch now keeps the frontend polish branch's richer app shell, background video treatment, Discord identity retry path, opacity controls, and timer-facing UI polish, while also preserving the DJ branch's dual-deck SoundCloud workflow, SoundCloud booth console/grid features, standalone Recording Studio wiring, shared DAW transport/clip/live-sound plumbing, avatar-based free-roam markers, and generated-name sync support. The merge is still in progress but all direct conflicts have been staged, which makes `V29-4` the next active phase.

### V29-4: Smoke-Test The Combined Build

After conflict resolution, verify the merged branch with targeted checks.

Minimum verification goals:

- normal timer UI still works
- frontend/auth fallback still works
- `syncsesh` still opens the hidden world
- Control Room still loads correctly
- Shooting Range still loads correctly
- Recording Studio still exists and is reachable
- instant room switching still works where already implemented
- timer displays still render correctly in normal UI and in-world surfaces

Build/test command:

```powershell
npm.cmd run build
```

#### Status

`[x]` completed.

#### Summary

Run the narrowest useful verification for the merged branch so the integration work is proven buildable before any final cleanup or merge-to-`main` discussion.

#### Expected Files

- `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`
- `changelog.md`
- local dependency install state under `node_modules`

#### Manager-Prepared Implementation Spec

Approved scope for `V29-4`:

- Run `npm.cmd run build` on the integration branch.
- If the build fails because the local workspace install is stale rather than because the merged code is broken, restore the local dependency install and rerun the build.
- Treat Vite chunk-size warnings as warnings, not automatic failure, unless they reveal a functional regression.
- Record the exact build outcome in this vision doc before moving on.

#### Acceptance Criteria

- The merged branch completes `npm.cmd run build`.
- Any build blocker encountered during the first attempt is diagnosed and either fixed or explicitly documented.
- The integration branch is now technically build-verified.

#### Build And Manual Checks

- [x] `npm.cmd run build`
- [ ] Manual app smoke checks are still recommended:
- [ ] Timer UI load check.
- [ ] `syncsesh` hidden-world entry check.
- [ ] Control Room / Shooting Range / Recording Studio spot checks.

#### Checklist Items Achieved

- [x] Ran `npm.cmd run build`.
- [x] Diagnosed the first failure as a missing local install of declared font packages rather than a merge-code regression.
- [x] Ran `npm.cmd install` to restore the local dependency install.
- [x] Re-ran `npm.cmd run build` successfully.
- [x] Confirmed the merged branch is buildable with only the existing Vite large-chunk warning.

#### Completed Implementation

Phase 4 completed with a successful production build. The first build attempt failed because local `node_modules` did not contain the declared `@fontsource` packages referenced by `src/main.tsx`, even though those dependencies were already present in `package.json` and `package-lock.json`. After restoring the workspace install with `npm.cmd install`, `npm.cmd run build` passed successfully. No new merge-code failure surfaced in this phase; the remaining recommended checks are manual app/world smoke tests rather than compile-time fixes.

### V29-5: Do A Focused Post-Merge Cleanup Pass

#### Status

`[x]` completed.

#### Summary

Restore the frontend-polish branch's lightweight shuffle radio as the default front-end SoundCloud surface while keeping the DJ booth workflow available behind an explicit toggle and keeping the heavier deck widgets off the normal first load.

#### Expected Files

- `src/components/SoundCloudPanel.tsx`
- `src/components/SoundCloudDeckPanel.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`
- `changelog.md`

#### Manager-Prepared Implementation Spec

Approved scope for `V29-5`:

- Restore the simple radio-oriented SoundCloud front-end panel from the frontend polish branch as the normal default load path.
- Keep the merged DJ booth deck panel available, but make it opt-in from the normal front-end via an explicit toggle.
- Avoid mounting the deck panel's four SoundCloud widget iframes during the normal default load path.
- Preserve the deck workspace for the hidden 3D world by mounting it when the user switches to DJ mode or opens the 3D shell.
- Keep the change scoped to SoundCloud UI wiring and related presentation styles; do not redesign the timer, session, or hidden-world systems.

#### Acceptance Criteria

- The normal front-end load shows the lightweight UI-polish radio instead of the full deck booth.
- The front-end exposes a clear toggle to switch from the radio view into the deck booth view and back.
- The deck booth SoundCloud widgets are not mounted during the normal default radio load.
- The merged branch still completes `npm.cmd run build`.

#### Build And Manual Checks

- [x] `npm.cmd run build`
- [ ] Recommended manual follow-up:
- [ ] Confirm the default front-end load shows only the radio player.
- [ ] Confirm switching to DJ Decks mounts the dual-deck booth and hidden grid widgets.
- [ ] Confirm entering `syncsesh` from the default radio view still leaves the 3D booth functional.

#### Checklist Items Achieved

- [x] Split the front-end SoundCloud presentation into a default radio panel and a separate deck booth panel.
- [x] Restored the frontend-polish radio view as the normal front-end default.
- [x] Added a front-end mode toggle between `Radio` and `DJ Decks`.
- [x] Stopped mounting the deck booth panel during the normal default load path.
- [x] Kept the deck booth mount available for DJ mode and hidden-world entry.
- [x] Re-ran `npm.cmd run build` successfully after the wiring change.

#### Completed Implementation

Phase 5 restored the frontend polish branch's simple shuffle radio as the normal SoundCloud surface and moved the heavier two-deck booth into its own front-end panel. `MainScreen` now tracks a radio-versus-decks mode, the lightweight radio player is the default panel on load, and the deck booth panel only mounts when the user explicitly switches to `DJ Decks` or when the 3D hidden world needs that deck runtime available. This keeps the default first load aligned with the UI-polish branch and avoids mounting the booth panel's four SoundCloud widget iframes during the normal radio-first path.

Only after the merge is stable:

- remove accidental duplicate logic if the merge introduced it
- tighten shared types if both branches extended the same payloads differently
- clean up styling collisions only where they materially hurt the merged experience

Non-goal:

- do not turn the merge phase into a broad refactor of the app or the 3D world

### V29-6: Run Manual Hidden-World And Frontend Smoke Checks

Follow-up manual checks should still confirm that the default radio view, the front-end DJ deck toggle, and the hidden-world booth all behave correctly together in the browser.

## File-Level Merge Guidance

### Keep frontend polish branch versions unless a conflict proves otherwise

- `src/components/TimerPanel.tsx`
- `src/components/LobbyPanel.tsx`
- `src/components/AdminPanel.tsx`
- `src/hooks/useReadyHold.ts`
- `src/hooks/useSecretCodeUnlock.ts`
- `src/3d/ControlRoomWallDisplays.tsx`
- `src/3d/Level1RangeRoom.tsx`
- `src/3d/ShootingRangePrototype.tsx`
- `src/3d/WorldTimerDisplay.tsx`

### Bring over DJ branch additions unless they conflict with proven newer behavior

- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/levels/level3RecordingStudio.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- `src/3d/useLocalDawState.ts`
- `src/3d/soundCloudBooth.ts`
- `src/3d/patchPortRegistration.ts`
- `src/3d/PlayerAvatar.tsx`
- `src/hooks/useSoundCloudGridController.ts`
- `src/lib/daw/sharedDaw.ts`
- `src/lib/soundcloud/bpmAnalysis.ts`
- `src/lib/soundcloud/bpmLengthEstimate.ts`

### Hand-merge with extra care

- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `src/lib/lobby/sessionState.ts`
- `src/hooks/useDabSyncSession.ts`
- `src/components/SoundCloudPanel.tsx`
- `src/lib/countdown/engine.ts`
- `src/types/session.ts`
- `src/lib/sync/createSyncClient.ts`
- `src/lib/sync/wsSyncClient.ts`

## Success Criteria

Vision 29 is successful when:

- the merged branch keeps the frontend polish branch's timer and UI/auth improvements
- the merged branch keeps the DJ branch's Recording Studio and deeper 3D systems
- the merged branch does not regress the newer Control Room / Shooting Range changes already present on the polish branch
- `npm.cmd run build` passes on the combined branch
- the hidden-world flow still feels coherent from Control Room to Shooting Range to Recording Studio

## Non-Goals

- Do not use this merge to redesign the timer UI.
- Do not use this merge to redesign the Recording Studio.
- Do not refactor unrelated 3D files just because they are nearby.
- Do not replace manual review of shared state/sync files with wholesale one-side conflict resolution.
- Do not merge directly into `main` before the integration branch is build-verified.

## Recommended Next Step

When implementation starts, the manager should treat this as one active merge phase and use this doc as the conflict-resolution guide.

Suggested working order:

1. branch from `origin/codex/session-ui-sync-polish`
2. merge `origin/DJ-branch`
3. resolve conflicts using this doc
4. run `npm.cmd run build`
5. perform targeted hidden-world/manual smoke checks
