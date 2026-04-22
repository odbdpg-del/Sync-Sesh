# Agents

This file is the repo-level instruction sheet for Codex and other agents working in Sync Sesh.

## Default Workflow

- Read the relevant docs before changing code.
- Keep changes scoped to the user's request.
- Prefer existing project patterns over new abstractions.
- Do not touch unrelated files or revert work you did not make.
- For 3D hidden-world work, follow the manager/worker flow in `docs/Agents/agent.md`.

## Phase Status Rule

For vision phase work, use these status markers:

- `[ ]` means not started.
- `[~]` means currently in progress.
- `[x]` means completed and manager-verified.

Only one phase should be `[~]` at a time. Mark the phase `[~]` before preparation starts, and mark it `[x]` only after review, verification, docs cleanup, and changelog requirements are complete.

## Changelog Rule

If an agent makes code changes, it must add an entry to `changelog.md` in the same turn.

The changelog entry should include:

- A foldable `##` heading.
- A short numeric entry id in square brackets.
- Local date and 24-hour time.
- Branch name and phase/title in backticks.
- A short summary of the change.
- Files or areas touched.
- Build/test command run, or a clear note if not run.

New changelog entries must be added at the top of `changelog.md`, above older entries.

Heading format:

```md
## [1613] - 2026-04-21 00:25 - `Catalog-Gen2-12 / Phase 2 - Source Options Real ZIP Listing`
```

Docs-only changes do not require a changelog entry unless the user asks for one.

## Build Rule

For implementation work, run the narrowest useful verification command. For normal app or 3D implementation changes, default to:

```powershell
npm.cmd run build
```

If verification is skipped or blocked, say why in the final response.
