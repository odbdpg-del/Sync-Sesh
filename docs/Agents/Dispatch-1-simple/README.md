# Dispatch 1: Simple 3D Phase Flow

This dispatch setup is intentionally small. The main Codex session is the manager. A single worker is used only when there is a clear phase to prepare or implement.

## Roles

Manager:

- Vision reader.
- Phase cutter.
- Spec reviewer.
- Code reviewer.
- Verifier.
- Doc closer.

Worker:

- Prepares one phase for implementation, or
- Implements one approved phase and runs `npm.cmd run build`.

## When The User Gives A Vision Idea

The manager should:

1. Read `docs/3d/3dvision3.md` and any directly relevant docs.
2. Research the likely code path.
3. Turn the user's idea into wishlist items.
4. Cut the wishlist into small phase candidates.
5. Add or update phase skeletons in the relevant vision doc if the direction is clear.
6. Dispatch the worker to prepare the first phase.

## Prepare Phase Dispatch

Use this when the phase needs code research before implementation.

Worker output should include:

- Phase name.
- User-facing goal.
- Expected implementation files.
- Files and systems to avoid.
- Existing seams/helpers to reuse.
- Proposed implementation spec.
- Acceptance criteria.
- Build and manual checks.
- Risks.
- Wishlist mapping.
- Non-goals.

The worker should not edit files during preparation unless the manager later asks it to write the approved spec into the doc.

## Approval Step

The manager reviews the worker's proposed spec and either:

- Approves it as-is.
- Revises it in chat.
- Sends it back for a narrower version.

Only after approval should the spec be written into the vision doc.

## Write Spec Dispatch

After approval, the worker can update the relevant phase section in the vision doc.

The worker should:

- Write only the approved spec.
- Preserve existing phase history.
- Keep placeholders for `Checklist Items Achieved` and `Completed Implementation` if implementation has not happened yet.
- Avoid code changes.

## Implement Phase Dispatch

After the spec is in the doc, the manager can dispatch implementation.

The worker should:

- Implement only the approved phase.
- Avoid unrelated cleanup.
- Avoid unapproved sync, reducer, session, package, level-selector, normal 2D UI, or gameplay changes.
- Run `npm.cmd run build`.
- Fix build failures caused by the phase.
- Report changed files and build status.

## Manager While Worker Implements

While the worker implements, the manager can:

- Review the approved spec against the codebase.
- Prepare doc cleanup.
- Check whether the phase is drifting from the original goal.
- Review returned changes.
- Update completion notes after verification.

The manager should not duplicate the worker's implementation work in parallel.

## Closeout

At closeout, the manager should make sure:

- The phase doc has completed implementation notes.
- Checklist items achieved are accurate.
- Deferred work is explicit.
- `npm.cmd run build` result is recorded.
- Manual checks are listed if they were not performed.
- The final response tells the user what changed and what remains.
