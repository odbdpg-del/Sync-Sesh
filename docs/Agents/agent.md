# Simple Agent Flow

This repo uses a simple manager/worker flow for 3D vision work.

The manager is the main Codex session. The manager reads the vision docs, researches the code, cuts ideas into small phases, prepares the implementation spec from the actual code seams, approves or revises worker output, reviews implementation, and closes the docs.

The worker has two modes:

- Implement the approved phase and run `npm.cmd run build`.
- Review or prepare a phase only when the manager explicitly decides a second read-only opinion is useful.

Use this flow for 3D hidden-world work unless the user asks for a different process.

## Manager Responsibilities

The manager owns the shape of the work.

- Receive the user's vision idea.
- Read the relevant vision docs, usually `docs/3d/3dvision3.md`.
- Research the code enough to understand likely boundaries.
- Extract wishlist items from the idea.
- Cut the work into phases small enough for one Codex implementation pass.
- Block out phase headings and placeholders in the vision doc when useful.
- Prepare the implementation spec directly from code before dispatching implementation work.
- Write the approved implementation spec into the active phase section before implementation starts.
- Dispatch one worker at a time for implementation by default.
- Dispatch a worker for read-only preparation/review only when a second code read is likely to save time or reduce risk.
- Approve, revise, or reject the worker's implementation spec.
- During implementation, review code boundaries, check whether the work is staying on task, and prepare doc cleanup.
- After implementation, verify build status, review changed files, and close the phase docs.

The manager does not let implementation start until the phase has an approved implementation spec.

## Manager Mode: Prepare The Phase

Use this mode after the manager has selected a phase but before code changes.

Manager task:

- Read the relevant phase skeleton and surrounding vision doc context.
- Research the code seams needed for the phase.
- Identify likely files to touch.
- Identify files that should not be touched.
- Identify existing helpers, types, state, hooks, and rendering paths to reuse.
- Draft the implementation spec directly in the vision doc.
- Include acceptance criteria, build/manual checks, risks, wishlist mapping, and non-goals.
- Mark the selected phase `[~]` only when the manager is ready to run the phase.
- Do not dispatch implementation until this spec is written into the doc.

The manager-prepared spec should be specific enough that a worker can implement it without re-discovering the whole codebase.

## Worker Mode: Review Or Prepare The Phase

This mode is optional. Use it only when a second read-only pass is likely to save time or catch risk.

Worker task:

- Read the phase skeleton, approved spec, and relevant code.
- Do not edit files.
- Return scope corrections, expected files, files to avoid, reused helpers, acceptance checks, risks, and unresolved questions.
- Do not duplicate manager research unless asked.

The manager can approve, revise, or ignore the worker's review. The manager still owns the final spec.

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
4. Manager selects one active phase and marks it `[~]`.
5. Manager prepares the implementation spec from code and writes it into the phase section.
6. Optional: Manager dispatches a read-only review/prep worker if a second opinion is useful.
7. Manager revises the spec if needed.
8. Manager dispatches a worker to implement the approved phase, or implements directly for a small phase.
9. Worker implements, runs `npm.cmd run build`, and fixes phase-caused build failures.
10. Manager reviews the changed files, confirms scope, and closes the docs.
11. Manager marks the completed phase as `[x]` and leaves future phases as `[ ]`.

## Worker Lifecycle And Token Efficiency

The manager may choose between reusing one worker and spawning a fresh worker.

Reuse the same worker when:

- The next task depends on the worker's immediate prior context.
- The worker is continuing the same phase.
- The worker has just implemented code and needs to answer a narrow follow-up.

Spawn a fresh worker when:

- A new phase has a different code area or mental model.
- The old worker has accumulated too much irrelevant context.
- A clean implementation pass would be cheaper than making the old worker reorient.
- The manager has already prepared a narrow spec and the worker only needs that spec plus a few file paths.

Close workers when:

- Their implementation or review is complete.
- Their context is no longer needed.
- The phase changes and a fresh worker would be more token-efficient.

Default preference:

- Manager prepares the phase spec.
- Spawn a fresh worker for implementation when the phase is non-trivial.
- Keep one worker alive only while it is actively useful.

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
- One worker at a time unless the user explicitly asks for parallel work or the manager has independent, disjoint subtasks.
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
Review this phase before implementation. Read the approved phase spec and relevant code seams. Do not edit files. Return scope corrections, expected files, files to avoid, existing helpers to reuse, acceptance criteria, build/manual checks, risks, wishlist mapping, and unresolved questions.
```

Write-spec prompt:

```text
No worker prompt is normally needed. The manager writes the approved implementation spec into the phase section of the vision doc before implementation.
```

Implement prompt:

```text
Implement the approved phase exactly as written in the vision doc. Stay within the approved boundaries, run `npm.cmd run build`, fix phase-caused build errors, and report changed files plus build status.
```
