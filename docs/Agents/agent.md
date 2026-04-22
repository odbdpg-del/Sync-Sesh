# Simple Agent Flow

This repo uses a simple manager/worker flow for 3D vision work.

The manager is the main Codex session. The manager reads the vision docs, cuts ideas into small phases, approves or revises worker output, reviews implementation, and closes the docs.

The worker has two modes:

- Prepare the phase for implementation.
- Implement the approved phase and run `npm.cmd run build`.

Use this flow for 3D hidden-world work unless the user asks for a different process.

## Manager Responsibilities

The manager owns the shape of the work.

- Receive the user's vision idea.
- Read the relevant vision docs, usually `docs/3d/3dvision3.md`.
- Research the code enough to understand likely boundaries.
- Extract wishlist items from the idea.
- Cut the work into phases small enough for one Codex implementation pass.
- Block out phase headings and placeholders in the vision doc when useful.
- Dispatch one worker at a time for phase preparation or implementation.
- Approve, revise, or reject the worker's implementation spec.
- Ask the worker to write the approved spec into the vision doc.
- During implementation, review code boundaries, check whether the work is staying on task, and prepare doc cleanup.
- After implementation, verify build status, review changed files, and close the phase docs.

The manager does not let implementation start until the phase has an approved implementation spec.

## Worker Mode: Prepare The Phase

Use this mode after the manager has selected a phase but before code changes.

Worker task:

- Read the relevant phase skeleton and surrounding vision doc context.
- Research the code seams needed for the phase.
- Identify likely files to touch.
- Identify files that should not be touched.
- Identify existing helpers, types, state, hooks, and rendering paths to reuse.
- Draft the implementation spec in chat.
- Include acceptance criteria, build/manual checks, risks, wishlist mapping, and non-goals.
- Do not edit files unless the manager explicitly asks you to write the approved spec into the doc.

The worker's preparation output should be specific enough that another Codex pass can implement it without re-discovering the whole codebase.

## Worker Mode: Implement The Phase

Use this mode only after the manager approves the implementation spec and the spec has been written into the vision doc.

Worker task:

- Implement only the approved phase.
- Stay inside the approved file and behavior boundaries.
- Reuse existing code patterns.
- Avoid unrelated cleanup.
- Avoid new sync, reducer, session, package, or normal 2D UI changes unless the approved phase explicitly includes them.
- Run `npm.cmd run build`.
- Fix build errors caused by the phase.
- Report changed files, build result, and any unresolved manual checks.

If the implementation uncovers a scope problem, stop and report it instead of expanding the phase.

## Standard Loop

1. User gives a vision idea.
2. Manager reads the 3D docs and researches the code.
3. Manager turns the idea into one or more small phase skeletons in the vision doc.
4. Manager marks the selected phase as `[~]` before worker preparation starts.
5. Manager tells the worker: prepare the phase for implementation.
6. Worker researches code seams and writes the proposed implementation spec in chat.
7. Manager approves or revises the spec.
8. Manager tells the worker to write the approved spec into the vision doc.
9. Manager tells the worker to implement the phase.
10. Worker implements, runs `npm.cmd run build`, and fixes phase-caused build failures.
11. Manager reviews the changed files, confirms scope, and closes the docs.
12. Manager marks the completed phase as `[x]` and leaves future phases as `[ ]`.

## Phase Status Markers

Use explicit checkbox markers in vision docs so progress is easy to scan and fold.

- `[ ]` means not started.
- `[~]` means currently in progress.
- `[x]` means completed and manager-verified.

Only one phase should be marked `[~]` at a time.

When starting a phase, the manager changes that phase from `[ ]` to `[~]` before asking the worker to prepare it.

When closing a phase, the manager changes `[~]` to `[x]` only after implementation review, build verification, docs cleanup, and any required changelog entry.

## Phase Sections

Use these sections for new phases:

- Summary
- Implementation Spec
- Checklist Items Achieved
- Completed Implementation
- Acceptance Criteria
- Build And Manual Checks
- Risks
- Wishlist Mapping
- Non-Goals

Before implementation, `Checklist Items Achieved` and `Completed Implementation` can be placeholders. After implementation, update them with the real outcome.

## Guardrails

- One phase at a time.
- One worker at a time unless the user explicitly asks for parallel work.
- No implementation before an approved spec.
- Keep phases small enough for one build-verified pass.
- Keep the normal 2D app free of visible 3D affordances unless a phase explicitly changes that.
- Keep shared sync changes behind explicit reducer-owned event design.
- Prefer local-only behavior until shared behavior is intentionally designed.
- Keep level configs plain and inspectable.
- Preserve `Exit`, WebGL fallback, recovery behavior, and normal app usability.
- Run `npm.cmd run build` for implementation phases.

## Dispatch Prompts

Prepare prompt:

```text
Prepare this phase for implementation. Read the phase skeleton and surrounding vision doc context, then research the code seams. Do not edit files. Return a proposed implementation spec in chat with expected files, files to avoid, existing helpers to reuse, acceptance criteria, build/manual checks, risks, wishlist mapping, and non-goals.
```

Write-spec prompt:

```text
Write the approved implementation spec into the phase section of the vision doc. Do not implement code. Keep the spec scoped to the approved phase and preserve surrounding completed phase history.
```

Implement prompt:

```text
Implement the approved phase exactly as written in the vision doc. Stay within the approved boundaries, run `npm.cmd run build`, fix phase-caused build errors, and report changed files plus build status.
```
