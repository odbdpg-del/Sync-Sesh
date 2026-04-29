# Changelog

Use this file to record code changes made by Codex or other agents.

Add a new entry whenever an agent changes application, server, style, config, or test code. Docs-only changes do not need an entry unless requested.

Entries must be in reverse chronological order. New entries go at the top, above older entries.

Use a level-two heading for every entry so the editor can fold each change.

## [2403] - 2026-04-29 00:18 - `codex/merge-ui-and-3d-world / Header-Spanning Loading Speed Rail`

- Moved the loading-screen speed control onto its own terminal header row so it spans the full Room Link Protocol window width.
- Touched `src/components/LoadingScreen.tsx`, `src/styles/global.css`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2402] - 2026-04-29 00:16 - `codex/merge-ui-and-3d-world / Full Width Loading Speed Rail`

- Expanded the loading-screen speed control to fill the available Room Link Protocol header width.
- Touched `src/styles/global.css` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2401] - 2026-04-29 00:14 - `codex/merge-ui-and-3d-world / Matrix Speed Control Styling`

- Removed the visible text labels from the loading-screen speed control and restyled the range input as a retro Matrix terminal rail.
- Touched `src/components/LoadingScreen.tsx`, `src/styles/global.css`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2400] - 2026-04-29 00:11 - `codex/merge-ui-and-3d-world / Loading Boost Step Tuning`

- Reduced each loading-screen input boost from `10` to `2` slider points, requiring 25 interactions to move from the default speed to maximum speed.
- Touched `src/components/LoadingScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2399] - 2026-04-29 00:10 - `codex/merge-ui-and-3d-world / Loading Slider Minimum Print Delay`

- Lowered the fastest loading terminal slider delay from `25ms` to `5ms` between printed entries.
- Touched `src/components/LoadingScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2398] - 2026-04-29 00:08 - `codex/merge-ui-and-3d-world / Loading Boost Space Exclusion`

- Updated loading-screen keyboard speed boosts to ignore Space while keeping other non-repeated keys and pointer presses active.
- Touched `src/components/LoadingScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2397] - 2026-04-29 00:07 - `codex/merge-ui-and-3d-world / Loading Input Speed Boost Phase 1`

- Added loading-screen key and pointer input listeners that boost the visual terminal speed by 10 slider points per interaction.
- Ignored repeated keydown events and interactions originating from the speed slider so manual slider control remains clean.
- Marked Phase 1 complete in `docs/loading-screen-input-boost-plan.md`.
- Touched `src/components/LoadingScreen.tsx`, `docs/loading-screen-input-boost-plan.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2396] - 2026-04-29 00:03 - `codex/merge-ui-and-3d-world / Loading Speed Slider`

- Added a Room Link Protocol header slider for controlling the paced loading terminal print speed.
- Defaulted the slider to the middle at the current `100ms` print delay, with faster output to the right and slower output to the left.
- Touched `src/components/LoadingScreen.tsx`, `src/styles/global.css`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2395] - 2026-04-29 00:00 - `codex/merge-ui-and-3d-world / Faster Loading Terminal Pace`

- Reduced the loading terminal visual print delay from `0.2s` to `0.1s` per entry.
- Kept actual startup behavior unchanged; only the paced loading-screen presentation is faster.
- Touched `src/components/LoadingScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2394] - 2026-04-28 23:59 - `codex/merge-ui-and-3d-world / Close Loading Log Capture`

- Closed loading-screen visual log capture after the first non-blocking startup snapshot so late diagnostics cannot keep extending the paced output queue.
- Kept the final ready/pass batch eligible to print, then let the queue drain normally so the intro can release.
- Touched `src/components/LoadingScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2393] - 2026-04-28 23:57 - `codex/merge-ui-and-3d-world / Remove Discord Context Loading Line`

- Removed the extra `DISCORD_CONTEXT` loading diagnostic from the paced startup terminal to reduce noisy Discord boot output.
- Kept Discord SDK, auth, and identity diagnostics in place for the meaningful startup state.
- Touched `src/screens/MainScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2392] - 2026-04-28 23:55 - `codex/merge-ui-and-3d-world / Loading Completion Hold Release`

- Fixed a loading-screen completion hold race where the visual queue could report empty before the parent entered hold mode, leaving the intro mounted indefinitely.
- The completion hold now starts only while the visual console is actively draining and releases whenever startup is ready and the queue is empty.
- Touched `src/screens/MainScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2391] - 2026-04-28 23:54 - `codex/merge-ui-and-3d-world / Stable Loading Diagnostics`

- Stabilized the loading terminal `SYNC_CLOCK` diagnostic so offset jitter does not keep adding paced output while latency is still pending.
- Fixed pending host and Discord context diagnostics to report `0%` instead of defaulting to `100%`.
- Touched `src/screens/MainScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2390] - 2026-04-28 23:47 - `codex/merge-ui-and-3d-world / Expanded Loading Diagnostics`

- Added extra real startup diagnostics to the paced loading terminal for session route, capacity, local profile, host ownership, Discord runtime/auth/context, sync transport/clock/debug, lobby permissions, ready manifest, auto-join, and media mount state.
- Passed diagnostic events from `MainScreen` into `LoadingScreen` so they print through the same 0.2-second queue and Matrix background fill as the core startup phases.
- Touched `src/components/LoadingScreen.tsx`, `src/screens/MainScreen.tsx`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2389] - 2026-04-28 23:45 - `codex/merge-ui-and-3d-world / Paced Loading Terminal Output`

- Added a paced loading terminal queue so startup events can arrive immediately but print to the visible console and Matrix background one entry every 0.2 seconds.
- Kept the loading screen mounted after real startup completes until the visual terminal queue finishes draining.
- Touched `src/components/LoadingScreen.tsx`, `src/screens/MainScreen.tsx`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2388] - 2026-04-28 23:42 - `codex/merge-ui-and-3d-world / Natural Matrix Overlay Fill`

- Changed the full-screen Matrix overlay to stop repeating console history across the background.
- The overlay now fills naturally from accumulated loading terminal events, capped to the visible row count.
- Touched `src/components/LoadingScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2387] - 2026-04-28 23:40 - `codex/merge-ui-and-3d-world / Loading Console Event Buffer`

- Changed the loading-screen console from a repeated current-state list into a terminal-style event buffer that starts empty and appends entries when startup phase snapshots change.
- Updated the Matrix background overlay to draw from the accumulated terminal events instead of repeating the same seven source lines immediately.
- Touched `src/components/LoadingScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2386] - 2026-04-28 23:36 - `codex/merge-ui-and-3d-world / Matrix Overlay Alignment`

- Aligned the full-screen Matrix text overlay to the viewport instead of offsetting rows left for drift.
- Switched the overlay to 42 equal-height rows with each line clipped inside `100vw`, so the text accounts for the visible left-to-right and top-to-bottom bounds.
- Touched `src/styles/global.css` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2385] - 2026-04-28 23:35 - `codex/merge-ui-and-3d-world / Loading Pause Hotkey`

- Added a `P` hotkey that freezes the loading screen on its current startup-progress snapshot while the real sync startup continues underneath.
- Kept the paused loading overlay mounted until `P` is pressed again, and added visible `PAUSED`/`debug_pause=true` terminal readouts.
- Touched `src/screens/MainScreen.tsx`, `src/components/LoadingScreen.tsx`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2384] - 2026-04-28 23:29 - `codex/merge-ui-and-3d-world / Loading Matrix Text Overlay`

- Added a full-screen Matrix text overlay that reprints the loading console feed across the viewport as an aesthetic layer.
- Reused the same console-line formatter for the bottom debug feed and overlay so startup status text stays synchronized.
- Touched `src/components/LoadingScreen.tsx`, `src/styles/global.css`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2383] - 2026-04-28 23:26 - `codex/merge-ui-and-3d-world / Loading Console Output Feed`

- Added a bottom `console_output` panel to the Matrix-style loading screen that prints every startup phase with status, detail, progress percent, and a mini progress trace.
- Kept the existing loading bars above while giving the marked lower area a scrolling terminal-style event feed.
- Touched `src/components/LoadingScreen.tsx`, `src/styles/global.css`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2382] - 2026-04-28 23:23 - `codex/merge-ui-and-3d-world / LS-5.1 Matrix Loading Console`

- Restyled the startup loading screen into a Matrix-style boot console with compact terminal header, required-progress readout, on-screen log rows, and metadata footer.
- Rendered every startup phase as a terminal log line with status, phase label, detail text, and a thin per-line progress bar.
- Replaced the previous glossy card look with black/green terminal styling, scanline treatment, and responsive terminal row layout without changing loading behavior.
- Marked LS-5.1 complete in the loading screen plan.
- Touched `src/components/LoadingScreen.tsx`, `src/styles/global.css`, `docs/sync-sesh-loading-screen-plan.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed; `npx.cmd tsx --test tests/startupProgress.test.ts` passed.

## [2381] - 2026-04-28 23:13 - `codex/merge-ui-and-3d-world / LS-4 Startup Auto Join`

- Added default startup auto-join after mock sync is ready or the WebSocket client receives its first server snapshot.
- Replaced the old `timerConfig.autoJoinOnLoad` startup gate with a session/user/sync-readiness attempt key so startup join requests do not double-send.
- Switched loading screen visibility back to the startup progress model now that lobby join can complete automatically.
- Marked LS-4 complete in the loading screen plan.
- Touched `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `docs/sync-sesh-loading-screen-plan.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed; `npx.cmd tsx --test tests/startupProgress.test.ts` passed. Manual two-window WebSocket verification not run in this pass.

## [2380] - 2026-04-28 23:11 - `codex/merge-ui-and-3d-world / LS-3 Startup Milestones`

- Added sync startup milestones so the loading screen can distinguish opening socket, socket open, snapshot received, and error states.
- Updated WebSocket and mock sync clients to populate the milestone without changing session behavior or debug event labels.
- Refined startup progress mapping so WebSocket sync is model-complete only after the first snapshot, while preserving the pre-LS-4 loading-screen dismissal guard.
- Expanded startup progress tests for the sync milestone sequence and marked LS-3 complete in the loading screen plan.
- Touched `src/types/session.ts`, `src/lib/sync/wsSyncClient.ts`, `src/lib/sync/mockSyncClient.ts`, `src/lib/startup/startupProgress.ts`, `src/screens/MainScreen.tsx`, `tests/startupProgress.test.ts`, `docs/sync-sesh-loading-screen-plan.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed; `npx.cmd tsx --test tests/startupProgress.test.ts` passed.

## [2379] - 2026-04-28 23:08 - `codex/merge-ui-and-3d-world / Loading Screen Text Fit`

- Fixed the startup loading headline and content sizing so the loading card wraps within the viewport instead of creating horizontal scroll.
- Added local loading-screen overrides for global `h1` nowrap and letter-spacing behavior, plus overflow guards on the shell and rows.
- Touched `src/styles/global.css` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2378] - 2026-04-28 23:05 - `codex/merge-ui-and-3d-world / LS-2 Loading Screen UI`

- Added a full-screen startup loading screen component that renders the LS-1 startup progress contract with overall and per-phase progress bars.
- Styled the loading screen for the existing Sync Sesh neon/control-room theme with responsive mobile behavior.
- Mounted the loading screen during blocking startup transport states while avoiding a lobby-join deadlock before LS-4 auto-join work lands.
- Marked LS-2 complete in the loading screen plan.
- Touched `src/components/LoadingScreen.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, `docs/sync-sesh-loading-screen-plan.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed; `npx.cmd tsx --test tests/startupProgress.test.ts` passed.

## [2377] - 2026-04-28 23:03 - `codex/merge-ui-and-3d-world / LS-1 Startup Progress Model`

- Added a pure startup progress model for app shell, Discord SDK, Discord identity, sync server, lobby join, and media loading rows.
- Exposed `startupProgress` from `useDabSyncSession()` so the upcoming loading screen can consume one derived contract.
- Added focused startup progress tests and marked LS-1 complete in the loading screen plan.
- Touched `src/lib/startup/startupProgress.ts`, `src/hooks/useDabSyncSession.ts`, `tests/startupProgress.test.ts`, `docs/sync-sesh-loading-screen-plan.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed; `npx.cmd tsx --test tests/startupProgress.test.ts` passed; `npm.cmd test` still fails in existing unrelated tests (`tests/discordAuthState.test.ts` `.txt` loader issue and `tests/sessionState.test.ts` ready-hold strict reference assertion).

## [2376] - 2026-04-28 22:48 - `codex/merge-ui-and-3d-world / Discord Name Default`

- Updated first-join sync server profile assignment to keep the actor's current profile display name by default when it is available and not already taken.
- Kept generated nickname assignment as the fallback and preserved explicit Roll behavior as the opt-in generated nickname path.
- Touched `server/sync-server.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2375] - 2026-04-28 22:43 - `codex/merge-ui-and-3d-world / Explicit Discord Name Selection`

- Added an explicit `source` field to display-name selection events so the sync server can distinguish generated nickname picks from Discord identity restores.
- Updated Discord-name restore to send `source: "discord"` and kept generated name picker events on `source: "generated"`.
- Made display-name debug settling wait for a fresh sync snapshot instead of the local optimistic profile update.
- Touched `src/types/session.ts`, `src/hooks/useDabSyncSession.ts`, `server/sync-server.ts`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2374] - 2026-04-28 22:40 - `codex/merge-ui-and-3d-world / Display Name Debug Events`

- Added debug console events for rolled, picked, and Discord display-name requests so live tests show the requested name and current lobby name.
- Added synced-name settle and timeout diagnostics to reveal whether the server accepted the display-name change or kept the existing nickname.
- Touched `src/hooks/useDabSyncSession.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2373] - 2026-04-28 22:36 - `codex/merge-ui-and-3d-world / Discord Name Restore Server Path`

- Updated the sync server display-name assignment so `select_display_name` can restore the actor's authenticated Discord display name, not only names from the generated nickname pool.
- Preserved duplicate-name protection and kept generated nickname selection behavior unchanged.
- Touched `server/sync-server.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2372] - 2026-04-28 22:33 - `codex/merge-ui-and-3d-world / Discord Name Toggle`

- Added a local lobby control that lets authenticated Discord users switch back to their Discord display name after rolling a generated nickname.
- Reused the existing display-name sync event path so nickname rolls and Discord-name restores stay synchronized across the session.
- Touched `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `src/components/LobbyPanel.tsx`, `src/styles/global.css`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2371] - 2026-04-28 22:27 - `codex/merge-ui-and-3d-world / Prefer Same-Origin Activity WebSocket`

- Changed `VITE_SYNC_DIRECT_URL` so it is ignored inside Discord's Activity proxy host, keeping live Activity tests on the same-origin `/ws` websocket route.
- Included `/ws` in explicit remote Activity mapping patches for hosted sync targets while preserving local Developer Portal mappings in `auto` mode.
- Touched `src/lib/sync/createSyncClient.ts`, `src/lib/discord/embeddedApp.ts`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2370] - 2026-04-28 22:24 - `codex/merge-ui-and-3d-world / Test Repo Style WebSocket Path`

- Switched the default Discord Activity websocket URL from `/sync` to `/ws` to match the proven Discord-Test-Farding synced timer pattern.
- Added a Vite `/ws` websocket proxy alias to the local sync server while keeping the existing `/sync` proxy path for compatibility.
- Touched `src/lib/sync/createSyncClient.ts`, `vite.config.ts`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2369] - 2026-04-28 22:19 - `codex/merge-ui-and-3d-world / Direct Cloudflare Sync WebSocket`

- Added `VITE_SYNC_DIRECT_URL` for local Discord Activity testing so the sync websocket can connect directly to a Cloudflare tunnel when Discord's `/sync` proxy mapping times out.
- Normalized configured HTTP(S) sync URLs into WS(S) websocket URLs and defaulted root paths to `/sync` while keeping the existing Activity proxy websocket behavior for `auto`.
- Touched `src/lib/sync/createSyncClient.ts`, `src/env.d.ts`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2368] - 2026-04-28 22:15 - `codex/merge-ui-and-3d-world / Discord Token Exchange Timeout Diagnostics`

- Added explicit frontend and sync-server timeouts for Discord token exchange so stalled local Cloudflare tests report a clear token exchange network failure instead of hanging until the auth watchdog fires.
- Added sync-server logs before forwarding the OAuth code to Discord and when that upstream token request fails, including timeout and redirect URI context.
- Touched `src/lib/discord/embeddedApp.ts`, `server/sync-server.ts`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2367] - 2026-04-28 22:10 - `codex/merge-ui-and-3d-world / Sync WebSocket Diagnostics`

- Added sync transport debug details for websocket open, timeout, error, close, snapshot, and pong events so Discord Activity console logs show the exact `/sync` URL and failure shape during local Cloudflare testing.
- Updated the debug console connection event bridge to prefer those sync transport details when reporting connect, success, failure, and disconnect events.
- Touched `src/types/session.ts`, `src/lib/sync/wsSyncClient.ts`, `src/hooks/useDabSyncSession.ts`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2366] - 2026-04-28 22:04 - `codex/merge-ui-and-3d-world / Local Cloudflare Sync Mapping`

- Changed Discord Activity URL mapping patching so `VITE_SYNC_SERVER_URL=auto` preserves the Developer Portal `/api` and `/sync` mappings instead of overriding them to a hosted sync target during local Cloudflare tests.
- Kept explicit remote sync targets supported: when `VITE_SYNC_SERVER_URL` is a non-local URL, runtime mapping still patches `/api` and `/sync` to that host.
- Touched `src/lib/discord/embeddedApp.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2365] - 2026-04-28 21:53 - `codex/merge-ui-and-3d-world / Discord Auth Single Launch In Dev`

- Removed the React StrictMode wrapper from the app entry so Vite dev testing no longer double-runs Discord SDK and OAuth startup effects inside the Activity.
- This prevents simultaneous silent/consent authorization attempts from poisoning local Cloudflare Discord Activity tests while keeping the existing auth flow unchanged.
- Touched `src/main.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2364] - 2026-04-28 21:46 - `codex/merge-ui-and-3d-world / Bug 1 SDK Ready Timeout`

- Added a 30 second timeout around `sdk.ready()` so Discord Activity tests report `sdk:ready:failed` instead of hanging indefinitely at `sdk:ready:start`.
- Preserved the auth flow; this makes the current Discord SDK handshake blocker visible before authorization begins.
- Touched `src/lib/discord/embeddedApp.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2363] - 2026-04-28 21:34 - `codex/merge-ui-and-3d-world / Debug Console Retry Command`

- Added a `retry` command to the hidden debug console so live Discord Activity tests can rerun Discord identity bootstrap without needing a visible retry banner.
- Updated debug console help and unknown-command guidance to include the new retry command.
- Touched `src/screens/MainScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2362] - 2026-04-28 21:32 - `codex/merge-ui-and-3d-world / Bug 1 SDK Startup Visibility`

- Set Discord SDK state to `sdk_init` immediately before initial and retry identity bootstrap calls so the debug snapshot no longer stays at `n/a` when startup is in progress or early logs are missed.
- Kept the auth flow unchanged; this is an observability patch to make the live Discord Activity test distinguish "not started" from "stuck during SDK startup."
- Touched `src/hooks/useDabSyncSession.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2361] - 2026-04-28 20:31 - `codex/merge-ui-and-3d-world / Bug 1 Recovery Chunk 3 Authorize Redirect Cleanup`

- Verified the live Discord authorize path uses the clean request shape without a frontend `redirect_uri`, and aligned the diagnostic harness authorize request with that same frontend payload.
- Renamed redirect diagnostics to `backend redirect` / `Backend Redirect URI` so debug output describes the server token-exchange configuration instead of implying a frontend authorize field.
- Ignored the local `tools/cloudflared.exe` testing binary and local `.env` files so Cloudflare tunnel testing does not accidentally add a large executable or secrets to future commits.
- Touched `.gitignore`, `src/lib/discord/embeddedApp.ts`, `src/hooks/useDebugConsoleState.ts`, `src/screens/AuthHarnessScreen.tsx`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2360] - 2026-04-28 20:27 - `codex/merge-ui-and-3d-world / Bug 1 Recovery Chunk 2 Silent Then Consent Auth`

- Wired Discord identity authorization through the clean helper so the default flow now tries silent `prompt: "none"` first and falls back once to runtime consent `prompt: "consent"` when silent authorization fails.
- Added safe `auth:silent:*` and `auth:consent:*` debug events while preserving token exchange, `authenticate()`, profile creation, subscriptions, endpoint resolution, scopes, and local fallback behavior.
- Touched `src/lib/discord/embeddedApp.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2358] - 2026-04-28 20:23 - `codex/merge-ui-and-3d-world / Bug 1 Recovery Chunk 1 Clean Auth Helper`

- Added an isolated clean Discord authorization helper based on the working Discord-Test-Farding flow, supporting silent `prompt: "none"` and runtime consent `prompt: "consent"` modes behind one narrow SDK type cast.
- Kept the helper scoped to the minimal `identify` authorize request, omitted frontend `redirect_uri`, and preserved the existing timeout/code-extraction failure behavior for the next recovery chunk to wire in.
- Touched `src/lib/discord/embeddedApp.ts` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2357] - 2026-04-28 14:43 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 8 Embed Diagnostics`

- Implemented Attempt 8 as a standalone `public/embed-diagnostics.html` page that reports iframe/runtime context and same-origin response headers for the root page, static probe page, and diagnostics page without using React, the app bundle, or the Discord SDK.
- Extended the bug tracker notes with the exact Attempt 8 implementation and test URL so the next Discord override run can focus on embed/runtime evidence instead of more OAuth experimentation.
- Touched `docs/bugs/bug_1.md`, `public/embed-diagnostics.html`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2356] - 2026-04-28 14:31 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 7 Static Probe`

- Documented Attempt 7 in the bug tracker and added a standalone `public/static-probe.html` page with no React, no app bundle, and no Discord SDK so the next Activity override test can isolate whether Discord can render any static HTML from this deployment at all.
- The static probe includes a visible attempt label, explanatory text, and simple query/timestamp markers so Discord launches can confirm fresh content without depending on the normal app startup path.
- Touched `docs/bugs/bug_1.md`, `public/static-probe.html`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2355] - 2026-04-28 14:20 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 6 HTML Boot Probe`

- Added an Attempt 6 HTML-level boot probe in `index.html` so the Discord harness can report raw pre-React execution phases, top-level script errors, and pre-mount timeouts before the Vite bundle or Discord SDK startup path takes over.
- Wired `src/main.tsx` to forward its earliest boot phases into the same probe so we can distinguish `index.html loaded`, `main.tsx start`, and React render startup when the Activity is launched inside Discord.
- Touched `index.html`, `src/main.tsx`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2354] - 2026-04-28 14:08 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 5 Visible Harness Bootstrap`

- Hardened the Discord auth harness so Attempt 5 can no longer fail as a silent white box in Discord: the harness route now has a visible bootstrap status panel, a React error boundary, and runtime `window error` plus `unhandledrejection` reporting.
- Updated the harness copy and bug tracker notes so Attempt 5 is explicitly about making the minimal Discord auth page observable inside the real Activity runtime before drawing more OAuth conclusions.
- Touched `src/App.tsx`, `src/main.tsx`, `src/screens/AuthHarnessScreen.tsx`, `src/screens/AuthHarnessErrorBoundary.tsx`, `src/styles/global.css`, `docs/bugs/bug_1.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2353] - 2026-04-28 13:33 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 3 Harness One-Shot Fix`

- Fixed the Attempt 3 auth harness so it no longer auto-runs in a loop after each completed authorization attempt; it now runs once on load and only reruns from the explicit button press.
- Replaced the rerun-sensitive `isRunning` callback dependency with a ref-backed guard so the one-shot debug flow stays stable without changing the visible harness behavior.
- Touched `src/screens/AuthHarnessScreen.tsx` and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2352] - 2026-04-28 13:24 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 3 Harness Finalization`

- Finalized the minimal Discord authorize harness by fixing the SDK `authorize()` input typing so the isolated `?authHarness=1` / `/auth-harness` route compiles cleanly without changing the normal Sync Sesh launch path.
- Clarified the bug tracker notes for Attempt 3 so the harness entry points and non-destructive isolation goal are explicit for future debugging passes.
- Touched `src/screens/AuthHarnessScreen.tsx`, `docs/bugs/bug_1.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2351] - 2026-04-28 13:10 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 3 Auth Harness`

- Added a non-destructive `?authHarness=1` / `/auth-harness` mode that bypasses the normal Sync Sesh app and runs only a minimal Discord SDK ready-plus-authorize harness with an on-screen log.
- Exported the existing Discord URL-mapping helper for reuse, documented the Attempt 3 harness activation and behavior in `docs/bugs/bug_1.md`, and kept the default app path unchanged.
- Touched `src/lib/discord/embeddedApp.ts`, `src/screens/AuthHarnessScreen.tsx`, `src/App.tsx`, `src/styles/global.css`, `docs/bugs/bug_1.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2350] - 2026-04-28 13:02 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 2 Skip Silent Auth`

- Reverted the unsupported explicit-consent prompt idea, documented Attempt 1 as blocked by the embedded SDK contract, and switched the default Discord identity bootstrap path to start directly with the supported interactive auth request instead of trying silent auth first.
- This Attempt 2 experiment isolates whether the silent-first path was contributing to the immediate OAuth `5000` authorize failure while staying fully inside the Discord SDK’s supported authorize input shape.
- Touched `src/lib/discord/embeddedApp.ts`, `docs/bugs/bug_1.md`, and `changelog.md`.
- Build/test: `npm.cmd run build` passed.

## [2349] - 2026-04-28 12:49 - `codex/merge-ui-and-3d-world / Bug 1 Attempt 1 Explicit Consent Prompt`

- Documented Bug 1 Attempt 1 in `docs/bugs/bug_1.md` and changed the Discord Activity interactive authorize request to explicitly send `prompt: "consent"` instead of relying on an omitted prompt field.
- Kept silent auth on `prompt: "none"` so the next runtime test can isolate whether explicit consent prompting changes the immediate OAuth `5000` failure behavior.
- Touched `src/lib/discord/embeddedApp.ts` and `docs/bugs/bug_1.md`.
- Build/test: `npm.cmd run build` passed.

## [2348] - 2026-04-28 11:56 - `codex/merge-ui-and-3d-world / DAV-4 Identify-Only Scope Probe`

- Temporarily reduced the Discord Activity OAuth scope request from `identify` plus `guilds.members.read` down to `identify` only so the next runtime test can isolate whether `guilds.members.read` is triggering the immediate OAuth `5000` authorize failure.
- Recorded the scope-reduction experiment in the authorization vision doc so the next Discord console trace can be interpreted against a clear hypothesis.
- Touched `src/lib/discord/embeddedApp.ts` and `docs/discord-activity-authorization-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2347] - 2026-04-28 11:46 - `codex/merge-ui-and-3d-world / Retry SDK Ready Timeout Fix`

- Fixed the Discord identity retry state machine so it no longer marks itself as `authorizing` before the SDK is actually ready, preventing `sdk.ready()` stalls from being mislabeled as OAuth authorization failures.
- Added a dedicated retry watchdog for `sdk.ready()` during identity refresh, with an SDK-specific timeout message and debug-console event when the refresh stalls before auth ever starts.
- Touched `src/hooks/useDabSyncSession.ts`.
- Build/test: `npm.cmd run build` passed.

## [2346] - 2026-04-28 11:11 - `codex/merge-ui-and-3d-world / DAV-3 Authorize Diagnostics`

- Expanded Discord Activity authorize diagnostics so immediate `sdk.commands.authorize(...)` failures now capture safe raw SDK error fields plus runtime hints like auth mode, attempt suffix, redirect URI, auth endpoint, host mode, build id, and Discord context identifiers.
- Kept the player-facing authorize error readable while making the debug console detail string much more actionable, including an explicit note when the SDK returns no extra safe error fields.
- Touched `src/lib/discord/embeddedApp.ts` and `docs/discord-activity-authorization-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2345] - 2026-04-28 10:58 - `codex/merge-ui-and-3d-world / DAV-2 Retry Timeout Alignment`

- Removed the shorter client-side retry race from Discord identity refresh so retry now waits for the SDK bootstrap/auth flow instead of failing early on a competing 20-second timer.
- Replaced the generic stalled-stage watchdog with stage-aware timeouts, giving `authorizing` a longer 60-second window and keeping clearer timeout messages for later stages like token exchange and SDK authentication.
- Touched `src/hooks/useDabSyncSession.ts` and `docs/discord-activity-authorization-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2344] - 2026-04-28 10:42 - `codex/merge-ui-and-3d-world / Terminal-Style Debug Console`

- Reworked the Discord Activity debug console from a card-style event panel into a denser terminal-style live stream with inline command echoes, collapsed snapshot header, and live versus paused auto-scroll behavior.
- Added command-store helpers for terminal output formatting plus snapshot/log text export, and expanded the command handler so `hide`, `clear`, `help`, `copy`, `snapshot`, and filter commands all behave like inline console operations.
- Touched `src/lib/debug/debugConsole.ts`, `src/hooks/useDebugConsoleState.ts`, `src/components/DebugConsoleWindow.tsx`, `src/screens/MainScreen.tsx`, and `src/styles/global.css`.
- Build/test: `npm.cmd run build` passed.

## [2343] - 2026-04-28 10:14 - `codex/merge-ui-and-3d-world / DAC-5 Filter Commands And Readability`

- Added category filter handling for the debug console so `filter all`, `filter auth`, `filter sdk`, `filter profile`, `filter sync`, `filter network`, `filter ui`, and `filter command` narrow the visible log stream without mutating the underlying buffer.
- Upgraded the console window with a real command input, category-colored log tags, improved scroll/readability polish, and auto-scroll-to-newest behavior for active debugging sessions.
- Touched `src/hooks/useDebugConsoleState.ts`, `src/components/DebugConsoleWindow.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, and `docs/discord-activity-debug-console-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2342] - 2026-04-28 10:14 - `codex/merge-ui-and-3d-world / DAC-3 Lifecycle Instrumentation`

- Threaded debug-event callbacks from `MainScreen` through `useDabSyncSession` into the Discord embedded-app bootstrap so the console now captures real SDK, auth, profile, identity, retry, and sync lifecycle events.
- Added a shared debug-event contract module, instrumented the Discord bootstrap with sanitized stage labels and details, and deduped identity/sync transition logging on the session side.
- Touched `src/lib/debug/debugConsole.ts`, `src/hooks/useDebugConsoleState.ts`, `src/lib/discord/embeddedApp.ts`, `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, and `docs/discord-activity-debug-console-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2341] - 2026-04-28 10:14 - `codex/merge-ui-and-3d-world / DAC-2 Snapshot And Log Store`

- Replaced the debug console shell placeholders with a live snapshot panel and a capped in-memory log list, including seeded console lifecycle events and a render-only window fed from `MainScreen`.
- Exported a small Discord debug-config snapshot helper so the console can reuse the real auth-endpoint, redirect, env-flag, and proxy-host resolution logic without duplicating it.
- Touched `src/hooks/useDebugConsoleState.ts`, `src/lib/discord/embeddedApp.ts`, `src/components/DebugConsoleWindow.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, and `docs/discord-activity-debug-console-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2340] - 2026-04-28 10:02 - `codex/merge-ui-and-3d-world / DAC-1 Debug Console Shell`

- Added a hidden global `console` typed-sequence trigger that mirrors the existing secret-code input safety rules and opens a new floating Discord Activity debug console shell from the main app screen.
- Added the first-pass `FloatingWindow`-based console UI with placeholder Snapshot, Log, and Command sections, then marked DAC-1 complete in the vision doc.
- Touched `src/hooks/useDebugConsoleTrigger.ts`, `src/components/DebugConsoleWindow.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, and `docs/discord-activity-debug-console-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2339] - 2026-04-28 08:09 - `codex/merge-ui-and-3d-world / DAI-3 Identity Source Split`

- Split the Discord identity state into explicit `authenticated_discord`, `participant_discord`, and `local_fallback` modes so the app no longer treats every Discord-derived profile as equally healthy.
- Threaded the real identity source through the Discord bootstrap callbacks, updated the main identity banner to distinguish degraded participant-only identity from full local fallback, and updated the footer readout to show the actual identity mode directly.
- Touched `src/lib/discord/embeddedApp.ts`, `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `src/components/StatusFooter.tsx`, and `docs/discord-activity-identity-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2338] - 2026-04-28 08:02 - `codex/merge-ui-and-3d-world / DAI-2 OAuth Diagnostics Tightening`

- Tightened Discord Activity auth diagnostics by making the frontend surface missing `VITE_DISCORD_CLIENT_ID` and token-exchange failures with clearer endpoint, build, attempt, missing-config, and redirect-mismatch context.
- Expanded the sync server's OAuth diagnostics so `/api/discord/token` and `/health` report missing server-side config more explicitly without exposing secrets.
- Rewrote the README Discord setup section so the frontend Activity env and sync-server env responsibilities are documented separately and match the implemented code paths.
- Touched `src/lib/discord/embeddedApp.ts`, `server/sync-server.ts`, `README.md`, and `docs/discord-activity-identity-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2337] - 2026-04-28 07:56 - `codex/merge-ui-and-3d-world / DAI-1 First-Run Discord Consent`

- Fixed the Discord Activity identity bootstrap so startup now tries silent authorization first and escalates to interactive consent when the silent authorize step fails, matching the expected first-run Activity flow.
- Updated the manual Discord identity retry path to request interactive consent directly instead of repeating the same silent-only authorization attempt.
- Touched `src/lib/discord/embeddedApp.ts`, `src/hooks/useDabSyncSession.ts`, and `docs/discord-activity-identity-vision.md`.
- Build/test: `npm.cmd run build` passed.

## [2336] - 2026-04-28 01:00 - `codex/merge-ui-and-3d-world / Header Shrink Before Wrap`

- Tuned the top header so the status cards shrink narrower before the whole stats block wraps to a second row, keeping the title and data on one line longer.
- Reduced the brand and stats flex bases and lowered the header card minimum widths so wrapping happens later without letting the cards collapse into unusable labels.
- Touched `src/styles/global.css`.
- Build/test: `npm.cmd run build` passed.

## [2335] - 2026-04-28 00:52 - `codex/merge-ui-and-3d-world / Skinny Header Pill Height Fix`

- Fixed the very skinny-layout header regression where the status pill block kept its wide-layout flex basis after the header switched to a vertical stack, causing oversized tall cards.
- The stacked mobile header now clears that flex sizing so the status panels keep compact heights while still wrapping cleanly.
- Touched `src/styles/global.css`.
- Build/test: `npm.cmd run build` passed.

## [2334] - 2026-04-28 00:46 - `codex/merge-ui-and-3d-world / Responsive Header Row Wrap`

- Let the top app header wrap between the brand lockup and the right-side status pills so mid-width layouts stop overlapping the `SYNC SESH` title.
- Gave the title block and the header data block flexible row bases, and added an earlier responsive handoff that moves the data pills onto their own row before collision starts.
- Touched `src/styles/global.css`.
- Build/test: `npm.cmd run build` passed.

## [2333] - 2026-04-28 00:36 - `codex/merge-ui-and-3d-world / 3D Shell Scroll Lock`

- Locked page scrolling while the hidden 3D shell is open so the fullscreen overlay no longer inherits the underlying app page scrollbar.
- Applied the lock at the document root and restore previous overflow settings on shell cleanup, keeping the canvas fullscreen while returning normal page scroll after exit.
- Touched `src/3d/ThreeDModeShell.tsx`.
- Build/test: `npm.cmd run build` passed.

## [2332] - 2026-04-28 00:27 - `codex/merge-ui-and-3d-world / Radio Mode Hidden Widget Fix`

- Kept the SoundCloud iframe mounted for Shuffle Radio control plumbing, but stopped promoting it to the visible embed surface during normal `Radio` mode playback.
- Radio mode now only reveals the embedded widget as an error fallback, preserving the separation between `Radio` and the dedicated `Widget` mode.
- Touched `src/components/SoundCloudPanel.tsx`.
- Build/test: `npm.cmd run build` passed.

## [2331] - 2026-04-28 00:20 - `codex/merge-ui-and-3d-world / Three-Way SoundCloud Mode Toggle`

- Added a shared three-way `Radio / Widget / DJ Decks` mode toggle so the front end can switch between the custom shuffle radio, a plain SoundCloud embed, and the full deck booth from one consistent control.
- Added a lightweight embedded-widget panel that reuses the existing front-end SoundCloud player state instead of mounting the heavier deck workspace.
- Updated the main screen SoundCloud mode wiring so the deck workspace still mounts only for `DJ Decks` or hidden-world needs, while the new widget mode stays front-end only.
- Touched `src/components/SoundCloudModeToggle.tsx`, `src/components/SoundCloudWidgetPanel.tsx`, `src/components/SoundCloudPanel.tsx`, `src/components/SoundCloudDeckPanel.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`.
- Build/test: `npm.cmd run build` passed.

## [2330] - 2026-04-27 23:46 - `codex/merge-ui-and-3d-world / DJ Decks Cleanup Pass`

- Summary: Reworked the `DJ Decks` presentation into clearer vertical deck sections, reduced mixer dominance, added a stronger standby state for unloaded decks, and replaced the deck transport icon regressions with plain readable labels.
- Areas touched: `src/components/SoundCloudDeckPanel.tsx` and `src/styles/global.css`.
- Verification: `npm.cmd run build`.

## [2329] - 2026-04-27 23:30 - `codex/merge-ui-and-3d-world / Vision 29 Phase 5 - Radio-First SoundCloud Toggle`

- Summary: Restored the frontend-polish shuffle radio as the default SoundCloud front-end, split the heavier DJ booth into a separate toggleable panel, and stopped mounting the booth's four SoundCloud widget iframes during the normal default load path.
- Areas touched: `src/components/SoundCloudPanel.tsx`, `src/components/SoundCloudDeckPanel.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, and `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`.
- Verification: `npm.cmd run build`.

## [2328] - 2026-04-27 23:28 - `codex/merge-ui-and-3d-world / Vision 29 Phase 4 - Build Smoke Test`

- Summary: Verified the merged integration branch with `npm.cmd run build`; the first attempt failed because the local workspace was missing declared `@fontsource` packages, and after restoring dependencies with `npm.cmd install` the production build passed with only the existing Vite large-chunk warning.
- Areas touched: local dependency install state plus `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`.
- Verification: `npm.cmd install`; `npm.cmd run build`.

## [2319] - 2026-04-27 23:19 - `codex/merge-ui-and-3d-world / Vision 29 Phase 3 - Resolve Merge Ownership Conflicts`

- Summary: Resolved the integration-branch merge conflicts by keeping the frontend polish branch's richer shell, Discord identity retry flow, and timer-facing UI polish while preserving the DJ branch's standalone Recording Studio, dual-deck SoundCloud workflow, shared DAW/studio systems, and avatar-based roaming markers.
- Areas touched: `server/sync-server.ts`, `src/3d/FreeRoamPresenceMarker.tsx`, `src/3d/SimBotRoamingMarker.tsx`, `src/components/AdminPanel.tsx`, `src/components/LobbyPanel.tsx`, `src/components/SoundCloudPanel.tsx`, `src/components/TimerPanel.tsx`, `src/hooks/useDabSyncSession.ts`, `src/lib/lobby/sessionState.ts`, `src/lib/sync/wsSyncClient.ts`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, `src/types/session.ts`, and `docs/3d/3dvision29-frontend-and-3d-merge-plan.md`.
- Verification: Conflict markers cleared and resolved files staged for the in-progress merge; `npm.cmd run build` not run in this phase because build verification belongs to Vision 29 Phase 4.

## [2312] - 2026-04-27 23:12 - `codex/merge-ui-and-3d-world / Vision 29 Phase 2 - Surface Merge Conflicts`

- Summary: Attempted the first integration-branch merge of `origin/DJ-branch` into `codex/merge-ui-and-3d-world`, which intentionally surfaced the real conflict set for the frontend polish, shared state/sync, and 3D shell overlap areas without resolving them yet.
- Areas touched: in-progress merge state across the integration branch, including `server/sync-server.ts`, `src/components/TimerPanel.tsx`, `src/components/SoundCloudPanel.tsx`, `src/hooks/useDabSyncSession.ts`, `src/lib/lobby/sessionState.ts`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, `src/types/session.ts`, and related 3D support files.
- Verification: Merge attempt run with `git merge --no-ff origin/DJ-branch`; build not run in this phase because conflict resolution belongs to Vision 29 Phase 3.

## [2255] - 2026-04-27 22:55 - `DJ-branch / Keyboard-Only Monitor Return`

- Summary: Removed left-click monitor re-entry on the local computer station by making the dashboard return interaction keyboard-only, while preserving the existing `E` activation path.
- Areas touched: `src/3d/ComputerStation.tsx`, `src/3d/interactions.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite chunk-size warning.

## [2254] - 2026-04-27 22:54 - `DJ-branch / Reveal Spacebar Skip`

- Summary: Added a `Space` keyboard shortcut that skips the initial 3D camera pullback reveal by reusing the existing reveal-complete path while the intro animation is still playing.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite chunk-size warning.

## [2251] - 2026-04-27 22:51 - `DJ-branch / Studio Area Feedback Flicker Fix`

- Summary: Stopped the standalone Recording Studio area banner from re-triggering during pure camera-look updates by limiting area detection to meaningful position changes instead of every local pose refresh.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite chunk-size warning.

## [0910] - 2026-04-23 09:10 - `DJ-branch / Vision 25 Interaction Raycast Performance`

- Summary: Optimized 3D interaction raycasting with cached active targets, parent-chain hit resolution, fresh pointerdown activation, current-area filtering, deduped child hits, and FPS-overlay interaction/render diagnostics.
- Areas touched: `src/3d/interactions.tsx`, `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision25-interaction-raycast-performance.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual local/Discord Activity interaction QA remains pending.

## [0750] - 2026-04-23 07:50 - `DJ-branch / Vision 24 Phase 5 - SoundCloud Seek Diagnostics`

- Summary: Added dev-only SoundCloud seek diagnostics around widget cue/seek requests, including immediate, delayed, and optional play-progress position reporting.
- Areas touched: `src/env.d.ts`, `src/hooks/useSoundCloudPlayer.ts`, `docs/3d/3dvision24-audio-latency-and-sync.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0748] - 2026-04-23 07:48 - `DJ-branch / Vision 24 Phase 4 - Remote Piano Scheduling`

- Summary: Added live piano timing metadata and receiver-side scheduled Web Audio playback so remote piano notes use a shared-time lookahead instead of raw packet arrival.
- Areas touched: `src/types/session.ts`, `src/lib/lobby/sessionState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/ThreeDModeShell.tsx`, `src/3d/useLocalDawAudioEngine.ts`, `docs/3d/3dvision24-audio-latency-and-sync.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0743] - 2026-04-23 07:43 - `DJ-branch / Vision 24 Phase 3 - Interaction Timing`

- Summary: Added frame delta, raycast duration, and raycast object count to piano latency traces so Discord Activity input delay can be separated from render/raycast pressure.
- Areas touched: `src/3d/interactions.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/useLocalDawAudioEngine.ts`, `docs/3d/3dvision24-audio-latency-and-sync.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0742] - 2026-04-23 07:42 - `DJ-branch / Vision 24 Phase 2 - Local Piano Latency`

- Summary: Added DAW audio context latency telemetry, a silent engine warmup after initialize/resume, and a compact Studio-tab latency readout for base/output latency.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision24-audio-latency-and-sync.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0738] - 2026-04-23 07:38 - `DJ-branch / Vision 24 Phase 1 - Piano Latency Instrumentation`

- Summary: Added dev-only piano latency tracing from 3D pointer activation through the local DAW audio engine, plus low-latency `AudioContext` construction for the DAW engine.
- Areas touched: `src/3d/interactions.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/ThreeDModeShell.tsx`, `src/3d/useLocalDawAudioEngine.ts`, `docs/3d/3dvision24-audio-latency-and-sync.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0112] - 2026-04-23 01:12 - `DJ-branch / Waveform Clamp Nudge Controls`

- Summary: Moved the 3D continuous clamp nudge controls out of the grid settings row and up beside the waveform, and added timeline-only `S-`/`S+` and `E-`/`E+` waveform buttons for independently nudging the start and end clamps.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0102] - 2026-04-23 01:02 - `DJ-branch / Grid Clamp Nudge Buttons`

- Summary: Added Grid A/B `CL-` and `CL+` controls in the 2D and 3D grid controller settings rows so timeline/continuous clamp windows can be nudged in fine burst-length-based steps without dragging.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `src/components/SoundCloudPanel.tsx`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0053] - 2026-04-23 00:53 - `DJ-branch / Grid Clamp Drag Stabilizer`

- Summary: Stabilized Grid A/B waveform clamp dragging by switching clamp movement to pointer-delta-only dragging during the active gesture, with dead-zone filtering and per-frame movement clamping to prevent raycast hit jitter from snapping the bar left and right.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0046] - 2026-04-23 00:46 - `DJ-branch / Grid Continuous Chop Mode`

- Summary: Added a third Grid A/B pad mode, `CONT`, that maps the 64 pads into burst-length-spaced chops inside a fixed-width waveform window and lets the clamps move that whole window across the track.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `src/components/SoundCloudPanel.tsx`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0039] - 2026-04-23 00:39 - `DJ-branch / Grid Clamp Drag Reliability`

- Summary: Enlarged the Grid A/B timeline clamp hit targets and added movement-based drag fallback so clamps continue moving even when the ray leaves the narrow waveform handle during a click-hold drag.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0033] - 2026-04-23 00:33 - `DJ-branch / Movable Grid Timeline Clamps`

- Summary: Made the Grid A/B timeline waveform start and end clamps draggable in 3D, storing clamp ranges per grid controller and regenerating timeline pads inside the selected sampling window.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0025] - 2026-04-23 00:25 - `DJ-branch / Grid Aux Autoplay Guard`

- Summary: Added a burst-arm playback guard to hidden grid SoundCloud widgets so refresh/sync autoplay is immediately paused while intentional pad bursts still play for their configured length.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0018] - 2026-04-23 00:18 - `DJ-branch / Grid Controller Waveform Map`

- Summary: Added a top waveform map to the 3D grid controller screen, marking all 64 burst slice positions in random mode and showing timeline mode's start/end sampling clamps.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0011] - 2026-04-23 00:11 - `DJ-branch / Grid Controller Timeline Mode`

- Summary: Added a per-grid `RAND/TIME` mode toggle so pad bursts can either scatter randomly or map A1 through H8 evenly across the current deck track, with lock-aware controls and console logging.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `src/components/SoundCloudPanel.tsx`, `src/styles/global.css`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2359] - 2026-04-22 23:59 - `DJ-branch / Movable Deck A Crate`

- Summary: Made the Deck A SoundCloud crate browser an independent movable layout station while preserving crate row loading, scrolling, and booth console load-request logging.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual move/place/reset checks are still pending.

## [2332] - 2026-04-22 23:32 - `DJ-branch / Vision 23 Grid Controller QA Pass`

- Summary: Completed Vision 23 active work by tuning grid controller screen hit targets, preserving the screen-first movable controller design, and adding manual QA coverage for Grid A/B bursts, settings, movement, reset, and deck binding.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Live first-person/audio QA remains a manual checklist item.

## [2324] - 2026-04-22 23:24 - `DJ-branch / Vision 23 Movable Grid Controllers`

- Summary: Continued Vision 23 by making Grid A and Grid B independent movable layout stations while preserving their fixed deck bindings and screen-controller interactions.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual movement/audio checks are still pending.

## [2316] - 2026-04-22 23:16 - `DJ-branch / Vision 23 Grid Controller Screen Hardware`

- Summary: Continued Vision 23 by rendering fixed Grid A/B controller hardware in the 3D SoundCloud booth as screen-first slabs, with one canvas-drawn settings/pad surface and aligned invisible hit zones for playable cells.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual first-person/browser checks are still pending.

## [2304] - 2026-04-22 23:04 - `DJ-branch / Vision 23 Grid Booth Boundary`

- Summary: Continued Vision 23 by adding Grid A/B controller surfaces to the SoundCloud booth state boundary and wrapping grid actions with concise booth console logging.
- Areas touched: `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2255] - 2026-04-22 22:55 - `DJ-branch / Vision 23 2D Grid Controller`

- Summary: Continued Vision 23 by expanding the SoundCloud grid feasibility strip into a compact 2D Grid A/B controller with a settings row, full 8x8 pad matrix, pad burst triggers, last-pad highlighting, and grid readouts.
- Areas touched: `src/components/SoundCloudPanel.tsx`, `src/styles/global.css`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual browser/audio checks are still pending.

## [2246] - 2026-04-22 22:46 - `DJ-branch / Vision 23 Pad Burst Hook`

- Summary: Continued Vision 23 by adding monophonic `triggerPad` burst playback to the SoundCloud grid controller hook, using stored random pad timestamps, stale-pad guards, voice-stealing burst timers, and last-triggered pad state.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2238] - 2026-04-22 22:38 - `DJ-branch / Vision 23 Grid Pad State`

- Summary: Continued Vision 23 by adding the local 64-pad grid controller state model, random roll generation, track-keyed pad maps, lock behavior, and burst-length-aware pad regeneration behind the SoundCloud grid controller hook.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2228] - 2026-04-22 22:28 - `DJ-branch / Vision 23 Grid Controller Aux Feasibility`

- Summary: Started Vision 23 by adding one hidden auxiliary SoundCloud grid controller widget per deck, with compact 2D feasibility controls for test bursts, burst length, independent grid volume, and grid mute.
- Areas touched: `src/hooks/useSoundCloudGridController.ts`, `src/components/SoundCloudPanel.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, `docs/3d/3dvision23-soundcloud-grid-controllers.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual browser/audio checks for auxiliary burst behavior are still pending.

## [2027] - 2026-04-22 20:27 - `DJ-branch / Vision 22 SoundCloud Booth Console`

- Summary: Completed Vision 22 by adding a local SoundCloud booth console event model, bounded event queue, direct/passive DJ booth logging, and a live `BOOTH CONSOLE` section in the shared in-world deck monitor.
- Areas touched: `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision22-soundcloud-booth-console.md`, `docs/3d/manual-test-checklist.md`.
- Follow-up: Changed the shared SoundCloud deck monitor to a 32:9 ultrawide face with a `1792 x 504` console texture, then moved the console into a dedicated right-side rail.
- Follow-up: Swapped the SoundCloud draggable crossfader rail with the A/Mid/B preset buttons so the presets sit side by side in the center upper bank and the drag rail sits in the center slot.
- Follow-up: Added Deck A and Deck B waveform strips with playhead progress to the SoundCloud deck monitor.
- Follow-up: Added clickable monitor waveform hit targets so Deck A/B can seek by clicking directly on their waveform strips.
- Follow-up: Extended monitor waveform hit targets to support hold-drag scrubbing with a committed release log.
- Follow-up: Added on-monitor SoundCloud waveform resolution `-` / `+` buttons that change monitor waveform density from `x1` to `x4`.
- Follow-up: Replaced the visible 3D waveform resolution button boxes with invisible hit targets over the screen-drawn controls.
- Follow-up: Mirrored Deck B's main SoundCloud button row so Sync, Play, Mute/Open, and Shuffle match Deck A's intended symmetry.
- Follow-up: Pushed Deck A/B Sync buttons farther outward from the Play/Mute/Shuffle row.
- Follow-up: Mirrored Deck B's BPM tool cluster outward so it no longer overlaps the Deck B cue pad section.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2012] - 2026-04-22 20:12 - `DJ-branch / Restore SoundCloud Booth Purple`

- Summary: Recolored the active SoundCloud DJ tabletop and table body toward the previous pink-purple booth look without bringing back the old placeholder shell.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2009] - 2026-04-22 20:09 - `DJ-branch / Remove SoundCloud DJ Placeholder Shell`

- Summary: Removed the old generic DJ placeholder shell from the active SoundCloud booth render path so the purple box no longer sits over the DJ placeholder/table area.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2004] - 2026-04-22 20:04 - `DJ-branch / Wide Deck Monitor Height`

- Summary: Nudged the consolidated SoundCloud deck monitor upward slightly for better visibility over the booth.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2003] - 2026-04-22 20:03 - `DJ-branch / Wide Deck Monitor Consolidation`

- Summary: Rebuilt the SoundCloud deck monitor as a wide 32:9-style center monitor, moved crossfader/master/A out/B out data onto it, and removed the extra DJ status, mixer, and browser-mix placards from the booth.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1956] - 2026-04-22 19:56 - `DJ-branch / BPM Utility Button Layout`

- Summary: Repositioned the SoundCloud deck utility row so Sync sits left of Play, Mute sits between Play and Shuffle, and each deck's six BPM tool buttons shift left and up as a grouped cluster.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1949] - 2026-04-22 19:49 - `DJ-branch / Vision 21 Trusted BPM Tools`

- Summary: Completed Vision 21 by adding a length-based BPM estimator, per-deck accepted BPM state/actions, trusted sync that uses accepted monitor BPM only, and six new BPM tool buttons per SoundCloud deck.
- Areas touched: `src/lib/soundcloud/bpmLengthEstimate.ts`, `src/lib/soundcloud/bpmLengthEstimate.test.ts`, `src/hooks/useSoundCloudPlayer.ts`, `src/screens/MainScreen.tsx`, `src/3d/soundCloudBooth.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision21-soundcloud-bpm-tools-and-trusted-sync.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npx.cmd tsx src/lib/soundcloud/bpmLengthEstimate.test.ts` passed; `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` passed; `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1932] - 2026-04-22 19:32 - `DJ-branch / Honest SoundCloud BPM Sync`

- Summary: Removed the fake 120 BPM fallback from SoundCloud deck BPM state, prevented sync from using non-real BPM values, capped waveform BPM analysis samples, and removed stale `SYNC EST` button styling.
- Areas touched: `src/hooks/useSoundCloudPlayer.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` passed; `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1929] - 2026-04-22 19:29 - `DJ-branch / SoundCloud Deck Readout Face`

- Summary: Converted the Deck A/B SoundCloud readouts into upright monitor faces with the time canvas mounted in front of the dark housing so the readout text is visible.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1926] - 2026-04-22 19:26 - `DJ-branch / SoundCloud Deck Monitor Housings`

- Summary: Changed the Deck A/B SoundCloud readout housings from deck-accent glow blocks to the same dark monitor-style material used by the main deck monitor, with a brighter screen plane.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1907] - 2026-04-22 19:07 - `DJ-branch / SoundCloud Deck Time Readouts`

- Summary: Enlarged the Deck A/B SoundCloud readout screens and added current/total track time to each deck monitor.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1826] - 2026-04-22 18:26 - `DJ-branch / Vision 20 Platter Scrub Minigame`

- Summary: Added draggable SoundCloud platter scrub controls that pause visual auto-spin while held, scrub the track with left/right camera movement, and show a floating needle meter over the grabbed platter.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision20-soundcloud-platter-scrub-minigame.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. V20-5 manual booth QA is pending user testing.

## [1813] - 2026-04-22 18:13 - `DJ-branch / Rail Click Snap For SoundCloud Faders`

- Summary: Updated reusable SoundCloud DJ faders so clicking anywhere on a rail immediately snaps the slider value to that position before continuing held-drag control.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1809] - 2026-04-22 18:09 - `DJ-branch / Draggable SoundCloud Progress Seek`

- Summary: Converted each SoundCloud deck song-progress bar into a held-drag seek control with a backing rail, growing fill, and playhead marker that seeks and starts playback at the aimed song position.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1802] - 2026-04-22 18:02 - `DJ-branch / SoundCloud Deck Progress Bar Placement`

- Summary: Moved the SoundCloud deck song-progress bar into the lane between the deck trim fader and the deck volume controls.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1758] - 2026-04-22 17:58 - `DJ-branch / SoundCloud Utility Button Placement`

- Summary: Moved the SoundCloud DJ booth Mute/Open and Sync buttons to the lower/front row directly below each deck's Play and Shuffle buttons.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1752] - 2026-04-22 17:52 - `DJ-branch / Vision 19 SoundCloud BPM Mute Sync`

- Summary: Completed Vision 19 by adding waveform-based BPM analysis, BPM source labels, per-deck mute, per-deck phase-sync seeking, and 3D mute/sync utility buttons for the SoundCloud DJ booth.
- Areas touched: `src/lib/soundcloud/bpmAnalysis.ts`, `src/lib/soundcloud/bpmAnalysis.test.ts`, `src/hooks/useSoundCloudPlayer.ts`, `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision19-soundcloud-waveform-bpm-and-sync.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npx.cmd tsx src/lib/soundcloud/bpmAnalysis.test.ts` passed; `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1731] - 2026-04-22 17:31 - `DJ-branch / SoundCloud BPM Fallback Display`

- Summary: Changed the SoundCloud deck BPM label to show the existing 120 BPM estimated visual fallback for loaded tracks when the SoundCloud widget does not provide `sound.bpm`, instead of leaving the monitor at `BPM --`.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1728] - 2026-04-22 17:28 - `DJ-branch / Top-Down Booth Cleanup`

- Summary: Cleaned up the SoundCloud DJ booth top-down layout by moving the crossfader off the edit/seek controls, moving A/Mid/B snap buttons one row above it, placing deck readouts behind the platters, enlarging the BPM/deck monitor, and adding a second booth status monitor near the DJ OPEN sign.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1722] - 2026-04-22 17:22 - `DJ-branch / Slider Backing Plates`

- Summary: Added thin black backing plates under SoundCloud held slider rails so each fader sits on a visible hardware-style rectangle sized to the slider area.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1720] - 2026-04-22 17:20 - `DJ-branch / Crossfader Front Lane Swap`

- Summary: Swapped the SoundCloud crossfader and master volume slider lanes so the crossfader is closest to the player-facing side of the DJ booth.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1715] - 2026-04-22 17:15 - `DJ-branch / Player-Facing Fader Layout`

- Summary: Moved the SoundCloud Deck A/B trim faders and master volume slider forward into the user-facing DJ booth lane so the held sliders are easier to reach from the standing position.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1712] - 2026-04-22 17:12 - `DJ-branch / Fader Rail Hit Mapping`

- Summary: Changed held DJ fader movement to prefer ray hit-point mapping on the grabbed rail so the knob follows the physical track, with movement-delta updates only as fallback when the rail is temporarily missed.
- Areas touched: `src/3d/interactions.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1709] - 2026-04-22 17:09 - `DJ-branch / Held Fader Camera Follow`

- Summary: Changed held DJ fader behavior so camera look continues while a slider/fader is grabbed, with the active draggable control staying latched until click release.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1703] - 2026-04-22 17:03 - `DJ-branch / V18 Held DJ Faders`

- Summary: Added reusable 3D draggable interactables, suppressed camera look while held controls are active, converted the SoundCloud crossfader into a continuous held drag fader, and added held drag faders for Deck A trim, Deck B trim, and master volume with manual QA/docs updates.
- Areas touched: `src/3d/interactions.tsx`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1658] - 2026-04-22 16:58 - `DJ-branch / Cue Pad Time Readability`

- Summary: Changed SoundCloud cue time labels to hundredths precision and doubled the 3D cue pad timestamp font size so saved cue times are readable from the booth view.
- Areas touched: `src/hooks/useSoundCloudPlayer.ts`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1651] - 2026-04-22 16:51 - `DJ-branch / SoundCloud Cue Panel Stack Layout`

- Summary: Moved the 3D SoundCloud cue shelves and cue button hitboxes directly below their matching center seek panels so each deck's seek and cue-edit controls read as one vertical workflow.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1648] - 2026-04-22 16:48 - `DJ-branch / Empty Cue Quick Save`

- Summary: Changed normal SoundCloud cue pad behavior so clicking an empty cue saves the current playhead time into that cue instead of only reporting the slot as empty.
- Areas touched: `src/hooks/useSoundCloudPlayer.ts`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1647] - 2026-04-22 16:47 - `DJ-branch / V18 SoundCloud Seek And Cue Editor`

- Summary: Added per-deck SoundCloud seek-by/seek-to actions, local cue edit mode with selected-cue nudging, 2D seek/nudge controls, and two 3D center-table seek panels that switch between playhead seek and cue timestamp editing.
- Areas touched: `src/hooks/useSoundCloudPlayer.ts`, `src/components/SoundCloudPanel.tsx`, `src/styles/global.css`, `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision18-soundcloud-seek-and-cue-editor.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1633] - 2026-04-22 16:33 - `DJ-branch / First-Person Look Pitch Range`

- Summary: Expanded the hidden 3D first-person camera pitch clamp to approximately -89 degrees down and +89 degrees up so users can look much farther toward their own body and overhead scene.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1631] - 2026-04-22 16:31 - `DJ-branch / First-Person Body Camera Attach Fix`

- Summary: Fixed the first-person body so it attaches to the active Three.js camera when first-person controls become enabled, allowing the local user to see their camera-attached body after focusing the 3D world.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1626] - 2026-04-22 16:26 - `DJ-branch / V17-6 Persist Local Avatar Settings`

- Summary: Added versioned localStorage persistence for the local-only avatar appearance state, with lazy load, field-level sanitization, clamped scale, and accent/head color normalization so the preview and world-space bodies restore safely after refresh.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1622] - 2026-04-22 16:22 - `DJ-branch / V17-5 Escape Menu Avatar Customization`

- Summary: Added a local-only Avatar tab to the 3D Escape menu with a live primitive avatar preview, body/accent swatches, suit preset segments, nameplate toggle, and scale slider, feeding changes immediately into the local top-down avatar and a minimal first-person body color pass.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `src/styles/global.css`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1619] - 2026-04-22 16:19 - `DJ-branch / V17-4 Local Top-Down Player Avatar`

- Summary: Rendered the local user through the shared `PlayerAvatar` in top-down player-cam and top-down free-cam only, driven directly from the current local player pose ref with the local nameplate hidden by default and the existing camera-attached first-person body preserved.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1615] - 2026-04-22 16:15 - `DJ-branch / V17-3 Shared Friend And Sim Avatars`

- Summary: Routed real free-roam presence markers and local sim roaming markers through the shared `PlayerAvatar` component, preserving existing caller filtering and sim-roam enablement semantics while adding render-only damping for remote free-roam movement and yaw between presence updates.
- Areas touched: `src/3d/FreeRoamPresenceMarker.tsx`, `src/3d/SimBotRoamingMarker.tsx`, `src/3d/PlayerAvatar.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1613] - 2026-04-22 16:13 - `DJ-branch / V17-2 Shared Primitive Player Avatar`

- Summary: Added a reusable primitive `PlayerAvatar` renderer with feet-origin pose props, identity/status modes, deterministic seed-based default appearance, host/ready/sim/local visual cues, and memoized canvas nameplates for later marker replacement phases.
- Areas touched: `src/3d/PlayerAvatar.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1608] - 2026-04-22 16:08 - `DJ-branch / V17-1 Avatar Floor Origin`

- Summary: Grounded the existing free-roam and sim roaming markers to a feet/floor avatar origin by converting remote camera-height presence locally at render time and moving sim route waypoints off the old `y = 1.7` group origin.
- Areas touched: `src/3d/simBotRoaming.ts`, `src/3d/FreeRoamPresenceMarker.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; manual sim/friend floor checks remain recommended.

## [1558] - 2026-04-22 15:58 - `DJ-branch / V16-5 Lazy Hidden 3D Shell`

- Summary: Lazy-loaded the hidden `ThreeDModeShell` and `RenderingStackSpike` paths from `MainScreen` so the normal app shell no longer eagerly imports the full 3D runtime; added a compact Suspense loading overlay for requested hidden-world chunks.
- Areas touched: `src/screens/MainScreen.tsx`, `docs/3d/3dvision16-world-cleanup-and-level-doors.md`.
- Verification: `npm.cmd run build` passed; Vite now emits separate async chunks for `ThreeDModeShell`, `RenderingStackSpike`, and `react-three-fiber.esm`, with the main app bundle at 373.69 kB / gzip 113.69 kB. The remaining large-chunk warning is the async React Three Fiber vendor chunk.

## [1555] - 2026-04-22 15:55 - `DJ-branch / V16-4 Level Transition Pointer Lock Reset`

- Summary: Released browser pointer lock at the start of in-world level transitions so moving through the Level 1 range door or Level 2 BACK door resets cleanly into the next reveal without leaving captured mouse state behind.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision16-world-cleanup-and-level-doors.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1554] - 2026-04-22 15:54 - `DJ-branch / V16-3 Level 1 Range Door`

- Summary: Added the Level 1 east-wall `RANGE` exit door targeting `level-2-range` through the existing `LevelExitDoor` interaction flow, keeping the sealed east wall collision intact and avoiding any normal-app range selector.
- Areas touched: `src/3d/levels/level1.ts`, `docs/3d/3dvision16-world-cleanup-and-level-doors.md`, `docs/3d/manual-test-checklist.md`, `changelog.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1552] - 2026-04-22 15:52 - `DJ-branch / V16-2 Level 1 Range Extraction`

- Summary: Removed the embedded shooting range from Level 1 so the hidden world hub no longer renders range lanes, targets, or Level 1 range challenge UI; sealed the old east-side range opening with matching collision while preserving the standalone `level-2-range` shooting range path.
- Areas touched: `src/3d/levels/level1.ts`, `src/3d/Level1RoomShell.tsx`, `docs/3d/3dvision16-world-cleanup-and-level-doors.md`, `docs/3d/manual-test-checklist.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1515] - 2026-04-22 15:15 - `DJ-branch / First-Person Space Jump`

- Summary: Added a grounded first-person Space jump in the 3D world now that Space no longer triggers lobby ready-hold. Jump height follows the current floor/platform height and top-down freecam keeps its existing Space-to-rise behavior.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person jump feel check remains recommended.

## [1509] - 2026-04-22 15:09 - `DJ-branch / Disable Ready Spacebar In 3D`

- Summary: Disabled the Space-key ready-hold hotkey while the 3D world is open, while keeping the normal 2D hold button behavior intact. If Space was already being held when 3D opens, the ready hold now releases cleanly.
- Areas touched: `src/hooks/useReadyHold.ts`, `src/components/TimerPanel.tsx`, `src/screens/MainScreen.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live 3D Space-key movement/freecam check remains recommended.

## [1504] - 2026-04-22 15:04 - `DJ-branch / SoundCloud Booth Tiered Controls`

- Summary: Reworked the 3D SoundCloud DJ booth control tiers so volume controls sit in a clearer middle lane, Play/Shuffle sits farther forward, and hot cue pads sit on a lower shelf instead of blocking deck readouts and labels.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down/first-person overlap checks remain recommended.

## [1459] - 2026-04-22 14:59 - `DJ-branch / SoundCloud Deck Volume Buttons`

- Summary: Added per-deck `Vol -` and `Vol +` controls to the 3D SoundCloud DJ booth, wired to Deck A and Deck B's real SoundCloud trim volume controls.
- Areas touched: `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live booth spacing and per-deck volume checks remain recommended.

## [1455] - 2026-04-22 14:55 - `DJ-branch / V10-8 Crate Hitbox Visibility Fix`

- Summary: Made the 3D SoundCloud crate browser row and scroll hitboxes fully transparent so they remain clickable without drawing teal blocks over the playlist screens.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live DJ crate screen visibility check remains recommended.

## [1451] - 2026-04-22 14:51 - `DJ-branch / V10-8 Deck Crate Browser Screens`

- Summary: Added local SoundCloud crate browser support for the 3D DJ booth: each deck now exposes its loaded track list and direct row-load action, and the booth renders separate Deck A/Deck B playlist screens with clickable up/down scroll controls and clickable song rows.
- Areas touched: `src/hooks/useSoundCloudPlayer.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person/top-down crate readability and row-hit checks remain recommended.

## [1434] - 2026-04-22 14:34 - `DJ-branch / Recording Studio Length Match`

- Summary: Extended the recording studio south edge to match the control room depth, deepened the raised DJ platform into the new space, moved the default DJ booth/platform center south, and bumped the local studio layout storage version so the new default stage placement appears instead of stale saved positions.
- Areas touched: `src/3d/levels/level1.ts`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down room-length and DJ platform clearance checks remain recommended.

## [1406] - 2026-04-22 14:06 - `DJ-branch / V15 3D Escape Menu And Studio Controls`

- Summary: Added a hidden-world Escape menu with Visual, Movement, Graphics, and Studio tabs; wired local brightness/contrast/saturation/gamma filters, first-person walk-speed scaling, grab-box visibility, FPS display, and quick studio controls for audio engine, master volume, transport/BPM, instrument test sounds, guitar recording, and grab-box reveal.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `src/styles/global.css`, `docs/3d/3dvision15-3d-escape-menu-and-studio-controls.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live pointer-lock/menu, visual filter, walk-speed, grab-box, FPS, and studio audio checks remain recommended.

## [1335] - 2026-04-22 13:35 - `DJ-branch / V14 Individual Monitor Move Targets`

- Summary: Split the movable monitor wall into individual movable monitor stations for Studio Status, Transport, Sequence View, Arrangement Timeline, Track List, Device Rack, Mixer View, and Patch Signal; each screen now has its own layout transform, hitbox, persistence entry, reset behavior, and `F` grab target.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision14-recording-room-layout-editor.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live per-monitor grab/place/reset checks remain recommended.

## [1331] - 2026-04-22 13:31 - `DJ-branch / V14 Station Wrapper Visibility Fix`

- Summary: Fixed the movable station wrapper transform order so rotated default stations like the DAW table render in their intended position, and changed layout hitboxes to wireframe-only with near-invisible idle opacity so they no longer cover the station geometry.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live DAW visibility and station targeting checks remain recommended.

## [1325] - 2026-04-22 13:25 - `DJ-branch / V14 Local Studio Layout Editor`

- Summary: Added a local recording-room layout editor with movable station registry, versioned localStorage layout state, station wrappers for DAW, DJ booth, drums, piano, guitar, looper, audio interface, and monitors, `F` grab/place behavior, click placement, `Esc` cancel, `Q/E` rotation, `G` floor lock, `H` height reset, Backspace reset controls, station highlight hitboxes, and an in-world Move Mode status label.
- Areas touched: `src/3d/interactions.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision14-recording-room-layout-editor.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person movement, top-down movement, refresh persistence, reset controls, and patch cable/port follow-up checks remain manual.

## [1300] - 2026-04-22 13:00 - `DJ-branch / Transport Monitor South Move`

- Summary: Moved the recording-room `Transport` monitor 4.6 world units toward global south on the left wall, shifting it from `z -4.62` to `z -0.02`.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live wall-placement check remains recommended.

## [1256] - 2026-04-22 12:56 - `DJ-branch / V13 Left-Wall Monitor Move`

- Summary: Moved the recording-room `Studio Status` and `Track List` monitors from the stage/drum sightline onto the global-left wall behind the DAW/station area while preserving their existing contents.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision13-recording-room-dj-platform.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person and top-down wall placement checks remain recommended.

## [1253] - 2026-04-22 12:53 - `DJ-branch / V13 Centered Stage And Raised Monitors`

- Summary: Centered the recording-room SoundCloud DJ booth and drum kit on the shared stage/room axis, moved the matching role badges to that centerline, and raised the `Studio Status` plus `Track List` monitors so their bottom edges clear the top-of-wall sightline.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision13-recording-room-dj-platform.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down centerline and first-person monitor-height checks remain recommended.

## [1247] - 2026-04-22 12:47 - `DJ-branch / V13 Full-Width Higher DJ Stage`

- Summary: Widened the recording-room DJ platform to span nearly the full room width, raised the stage and SoundCloud DJ booth to roughly four times the prior platform height, and expanded the platform/ramp traversal surfaces plus visual side steps to match the taller stage.
- Areas touched: `src/3d/levels/level1.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision13-recording-room-dj-platform.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down and first-person stage-height checks remain recommended.

## [1240] - 2026-04-22 12:40 - `DJ-branch / V13 Recording Room DJ Platform`

- Summary: Expanded the recording room southward, moved the recording-studio south/west/east wall collision bounds, added a raised DJ platform with visible trim and left/right approach steps, registered platform/ramp traversal surfaces, and relocated the SoundCloud DJ booth plus DJ role marker onto the new stage so it no longer overlaps the drum kit cluster.
- Areas touched: `src/3d/levels/level1.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision13-recording-room-dj-platform.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down and first-person wall/platform clearance checks remain recommended.

## [1230] - 2026-04-22 12:30 - `DJ-branch / SoundCloud Booth Wall Clearance`

- Summary: Rotated the 3D SoundCloud DJ booth to face back into the room with a 135-degree counterclockwise orientation and nudged the station away from the wall so the table, monitors, and controls are less likely to be cut off.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down and first-person wall-clearance checks remain recommended.

## [1223] - 2026-04-22 12:23 - `DJ-branch / SoundCloud Deck BPM Monitor And Spin`

- Summary: Added optional SoundCloud BPM metadata to the local deck state, made the 3D SoundCloud platters spin while playing using BPM when available with an honest visual fallback, and added a dedicated DJ deck monitor showing Deck A/B BPM, play state, and output levels.
- Areas touched: `src/env.d.ts`, `src/hooks/useSoundCloudPlayer.ts`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live visual confirmation in the 3D booth is still recommended.

## [1161] - 2026-04-22 11:54 - `DJ-branch / V12-5 Friend-Readable Cue Feedback`

- Summary: Added compact cue-status copy to the 3D SoundCloud deck readouts so Deck A/B now surface cue state and last action directly, and clarified the 2D cue note so cue state is explicitly local to this browser without implying shared audio or Discord transport.
- Areas touched: `src/components/SoundCloudPanel.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision12-soundcloud-hot-cues.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; one-browser, two-browser, Discord expectation, and cue readability checks remain manual.

## [1154] - 2026-04-22 11:54 - `DJ-branch / V12-4 3D Booth Cue Pads`

- Summary: Added local SoundCloud hot cue shelves to the 3D DJ booth for Deck A and Deck B, threading hot cue state/actions through the booth state surface, adding an optional enabled path for blocked 3D controls, and mirroring the readable cue states from the 2D phase without disturbing the V11 deck, mixer, or truth layout.
- Areas touched: `src/screens/MainScreen.tsx`, `src/3d/soundCloudBooth.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision12-soundcloud-hot-cues.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; top-down readability, first-person clickability, no-overlap, and blocked-state dim/disabled checks remain manual.

## [1147] - 2026-04-22 11:54 - `DJ-branch / V12-3 2D SoundCloud Cue Controls`

- Summary: Added a compact cue strip to each normal 2D SoundCloud deck card with a `SET CUE` toggle, five `C1`-`C5` pads, hook-backed cue state/action wiring, load-track blocking, and responsive cue styling while preserving the existing waveform, transport, mixer, and proxy behavior.
- Areas touched: `src/components/SoundCloudPanel.tsx`, `src/styles/global.css`, `docs/3d/3dvision12-soundcloud-hot-cues.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; manual Deck A/B cue save-jump, empty cue no-op, `LOAD TRACK` blocked-state, and responsive layout checks remain pending.

## [1141] - 2026-04-22 11:41 - `DJ-branch / V12-2 Local Hot Cue Controller`

- Summary: Added deck-local hot cue controller state to `useSoundCloudPlayer` with five `C1`-`C5` slots, `SET CUE` mode toggling, save/jump cue actions, real-track-only cue keys, stale-track invalidation, and a separate `hotCueState` / `hotCueActions` surface while preserving the existing jukebox actions and SoundCloud transport behavior.
- Areas touched: `src/hooks/useSoundCloudPlayer.ts`, `docs/3d/3dvision12-soundcloud-hot-cues.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; manual Deck A/B cue save-jump, empty cue, and track-change invalidation checks remain pending until cue UI lands.

## [1124] - 2026-04-22 11:24 - `DJ-branch / V11-4 Monitors, Placards, And Final Readability`

- Summary: Added the back-left angled `DJ / OPEN / READY` status monitor, detached the front-center `LOCAL SOUNDCLOUD` placard from the controls, and tuned the final booth label/readout balance for the mockup while preserving all deck and mixer behavior.
- Areas touched: `docs/3d/3dvision11-dj-booth-mockup-redesign.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1118] - 2026-04-22 11:18 - `DJ-branch / V11-3 Mixer Rails And Center Controls`

- Summary: Rebuilt the 3D SoundCloud booth center into a clearer mixer section with a backed mixer screen, upper fader rail and chunky knob, tidy A/MID/B preset row, readable center `DJ / PLACEHOLDER` panel, and a subtle lower cue shelf while preserving the existing crossfader callbacks and mixer state display.
- Areas touched: `docs/3d/3dvision11-dj-booth-mockup-redesign.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1112] - 2026-04-22 11:12 - `DJ-branch / V11-2 Deck Stations And Turntables`

- Summary: Reshaped the 3D SoundCloud DJ booth into clearer left/right deck stations with larger square bases, layered platters, center spindle caps, mini slider strips, attached readouts, and grouped Play/Pause + Shuffle pods while preserving existing deck action wiring.
- Areas touched: `docs/3d/3dvision11-dj-booth-mockup-redesign.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1105] - 2026-04-22 11:05 - `DJ-branch / V11-1 Table Shell And Station Grid`

- Summary: Expanded the 3D SoundCloud DJ booth into a larger supported table shell with a wider tabletop, thicker under-shell mass, visible legs, and faint named station-zone guide bands while preserving all current SoundCloud behavior and action wiring.
- Areas touched: `docs/3d/3dvision11-dj-booth-mockup-redesign.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1055] - 2026-04-22 10:55 - `DJ-branch / V10 DJ Table Row Layout`

- Summary: Expanded the 3D SoundCloud DJ table into a larger row-based surface so mixer, crossfader, turntables, deck readouts, Play/Shuffle controls, and the local SoundCloud truth placard no longer crowd the same foreground strip, while preserving existing SoundCloud behavior and control wiring.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down overlap confirmation remains manual.

## [1048] - 2026-04-22 10:48 - `DJ-branch / V10 DJ Top-Down Layout Tuning`

- Summary: Tuned the 3D SoundCloud DJ booth from annotated top-down feedback by flattening the turntable platters, moving the local SoundCloud truth plate and deck Play/Shuffle controls toward the front edge, and moving the crossfader rail plus A/MID/B presets up toward the mixer screen without changing audio or control behavior.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down visual confirmation remains manual.

## [1042] - 2026-04-22 10:42 - `DJ-branch / V10 DJ Button Spacing`

- Summary: Spread out the 3D SoundCloud DJ booth controls from top-down feedback by widening the table surface, moving Deck A/B farther apart, separating deck Play/Shuffle buttons, and widening the A/MID/B crossfader button lane without changing audio or control behavior.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live top-down hit-target confirmation remains manual.

## [1036] - 2026-04-22 10:36 - `DJ-branch / V10-6 Friend Testing Truth`

- Summary: Tightened the 2D and 3D SoundCloud DJ truth copy so the final QA pass clearly says the mixer is local to this browser, Discord voice will not carry the decks, and friends need their own app audio while preserving all deck, mixer, sync, and DAW behavior.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/components/SoundCloudPanel.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live one-browser, two-browser, 3D booth, and Discord expectation checks remain manual.

## [1024] - 2026-04-22 10:24 - `DJ-branch / V10-5 3D SoundCloud DJ Table Layout`

- Summary: Widened and reorganized the recording-studio SoundCloud DJ table so Deck A sits left, Deck B sits right, the mixer/crossfader lane is centered, deck Play/Shuffle controls are separated, and the mix plus `LOCAL SOUNDCLOUD` readouts are larger and clearer while preserving existing SoundCloud action wiring.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person/top-down readability and click-target checks remain manual.

## [1011] - 2026-04-22 10:11 - `DJ-branch / V10-4 3D SoundCloud DJ Booth Wiring`

- Summary: Added a local SoundCloud booth prop bundle from the 2D deck/mixer state into the 3D recording-studio DJ desk, rendering Deck A/B status, per-deck Play/Pause and Shuffle controls, mixer readouts, discrete A/MID/B crossfader controls, and a local-browser-audio truth label while keeping the control-room jukebox on Deck A.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/3d/soundCloudBooth.ts`, `src/screens/MainScreen.tsx`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person/top-down booth controls and SoundCloud audio checks remain manual.

## [1005] - 2026-04-22 10:05 - `DJ-branch / V10-3 SoundCloud DJ Panel Usability`

- Summary: Reworked the local 2D SoundCloud panel into a Deck A / Mixer / Deck B DJ table layout with responsive stacking, clearer deck and mixer headings, a dedicated Open/Artist link row, and one concise local-browser-audio note while preserving existing deck and mixer behavior.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/components/SoundCloudPanel.tsx`, `src/styles/global.css`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live desktop/mobile layout and SoundCloud audio checks remain manual.

## [1001] - 2026-04-22 10:01 - `DJ-branch / V10-2 SoundCloud Crossfader Mixer`

- Summary: Added a local 2D SoundCloud mixer with Deck A/B base trims, equal-power crossfader output, master volume scaling, effective widget volume application, and compact A/B output readouts while keeping the 3D jukebox fallback on Deck A.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/hooks/useSoundCloudPlayer.ts`, `src/components/SoundCloudPanel.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live mixer/audio checks remain manual.

## [0955] - 2026-04-22 09:55 - `DJ-branch / V10-1 Two SoundCloud Decks`

- Summary: Added independent Deck A and Deck B SoundCloud player controllers in the normal 2D app, with per-deck playlist, play/pause, shuffle, waveform/progress, popout, metadata, hidden widget iframe, and volume state while keeping the existing 3D jukebox fallback on Deck A.
- Areas touched: `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`, `src/hooks/useSoundCloudPlayer.ts`, `src/components/SoundCloudPanel.tsx`, `src/components/AdminPanel.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live two-deck SoundCloud playback and hidden-room checks remain manual.

## [0946] - 2026-04-22 09:46 - `DJ-branch / Name Picker Overlay Fix`

- Summary: Moved the right-click Roll name picker into a fixed portal overlay, clamped it to the viewport, and added outside-click, scroll, resize, and Escape dismissal so it no longer clips behind the lobby panel or rules card.
- Areas touched: `src/components/LobbyPanel.tsx`, `src/styles/global.css`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0932] - 2026-04-22 09:32 - `DJ-branch / Editable Generated Names Data`

- Summary: Moved generated display names into `src/data/generatedNames.txt` so the browser bundle and sync server share the editable app-owned list, while keeping the right-click picker usable when the sync endpoint is offline.
- Areas touched: `src/data/generatedNames.txt`, `src/lib/session/generatedNames.ts`, `src/lib/session/generatedNamesCore.ts`, `server/sync-server.ts`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; parser smoke check loaded 67 names; temporary WebSocket smoke test selected `Blumie Goode` through the server-validated picker path.

## [0927] - 2026-04-22 09:27 - `DJ-branch / Right-Click Name Picker`

- Summary: Added a right-click picker to the lobby Roll button, loading generated names from the sync server when available, filtering out names already used by other joined users, and adding a server-validated `select_display_name` event for explicit name selection.
- Areas touched: `src/types/session.ts`, `src/lib/lobby/sessionState.ts`, `src/hooks/useDabSyncSession.ts`, `src/components/LobbyPanel.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, `server/sync-server.ts`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; generated-name helper smoke check passed.

## [0917] - 2026-04-22 09:17 - `DJ-branch / Roll Display Name Button`

- Summary: Added a lobby Roll button for the local user, a shared `roll_display_name` session event, client-side profile persistence, and server-side reroll assignment that avoids duplicate generated names in the room.
- Areas touched: `src/types/session.ts`, `src/lib/session/generatedNames.ts`, `src/lib/lobby/sessionState.ts`, `src/hooks/useDabSyncSession.ts`, `src/components/LobbyPanel.tsx`, `src/screens/MainScreen.tsx`, `src/styles/global.css`, `server/sync-server.ts`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; `tsx` generated-name reroll smoke check passed.

## [0911] - 2026-04-22 09:11 - `DJ-branch / Generated Join Names`

- Summary: Added generated profile names from the DJ archive list for new local profiles and server-side WebSocket join assignment, with stable per-user selection, duplicate avoidance inside a room, and fallback names when the list is exhausted.
- Areas touched: `src/lib/session/generatedNames.ts`, `src/lib/session/localProfile.ts`, `server/sync-server.ts`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; `tsx` helper smoke check passed. Standalone server type-check was blocked because the repo does not include `@types/node`.

## [0905] - 2026-04-22 09:05 - `DJ-branch / Recording Room Speaker Facing Fix`

- Summary: Flipped the recording-room sound activity speaker station so the visible speaker rings face into the room instead of hiding behind the cabinet, and reduced the cabinet glow so it no longer reads as a giant green blocking panel.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning; live visual confirmation in the room is still recommended.

## [0901] - 2026-04-22 09:01 - `DJ-branch / V9-5 Timeline Layout Readability`

- Summary: Completed the Vision 9 layout/readability pass by raising and enlarging the Arrangement Timeline monitor and tightening the arrangement canvas spacing so it reads as the primary in-room song map while preserving the Vision 8 monitor set and controls.
- Areas touched: `docs/3d/3dvision9-recording-room-arrangement-timeline.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Worker and manager `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person, guitar-area, top-down, and overlap checks remain manual.

## [0856] - 2026-04-22 08:56 - `DJ-branch / V9-4 Timeline Friend Playback Guidance`

- Summary: Added compact state-aware playback guidance to the Arrangement Timeline, explaining per-browser ENGINE requirements, local browser playback, shared play state, and that Discord voice is not app-audio transport.
- Areas touched: `docs/3d/3dvision9-recording-room-arrangement-timeline.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live ENGINE on/off and wording checks remain manual.

## [0852] - 2026-04-22 08:52 - `DJ-branch / V9-3 Arrangement Source Labels`

- Summary: Improved the Arrangement Timeline monitor with friend-readable lane and block source labels, including honest guitar-in-FM wording for guitar-recorded FM Synth material and clear empty-lane purposes.
- Areas touched: `docs/3d/3dvision9-recording-room-arrangement-timeline.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live readability and overlap checks remain manual.

## [0846] - 2026-04-22 08:46 - `DJ-branch / V9-2 Timeline Playhead Transport Truth`

- Summary: Added a visible playhead plus compact local/shared transport truth to the Arrangement Timeline monitor, showing scope, state, and bar/beat without adding new sync events or audio behavior.
- Areas touched: `docs/3d/3dvision9-recording-room-arrangement-timeline.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live playhead readability checks remain manual.

## [0836] - 2026-04-22 08:36 - `DJ-branch / V9-1 Arrangement Timeline Monitor`

- Summary: Started Vision 9 by adding a read-only in-room Arrangement Timeline monitor with an approximate 8-bar map, source lanes, clip/note blocks, note-density markers, and honest `GTR IN FM` labels for guitar-recorded FM Synth material.
- Areas touched: `docs/3d/3dvision9-recording-room-arrangement-timeline.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live readability and overlap checks remain manual.

## [0137] - 2026-04-22 01:37 - `DJ-branch / V8-5 Monitor Layout Readability`

- Summary: Completed the Vision 8 layout pass by spreading the in-room monitor set, increasing key screen proportions, and scaling overview canvas textures from monitor size for crisper text without changing monitor content or behavior.
- Areas touched: `docs/3d/3dvision8-recording-room-monitors.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person/top-down readability and overlap checks still need eyeballing in the room.

## [0134] - 2026-04-22 01:34 - `DJ-branch / V8-4 Patch And Signal Truth Monitor`

- Summary: Completed the Vision 8 patch/signal monitor by turning the Studio Truth screen into a plain-language local patch, guitar/live-state, and friend ENGINE expectation readout without implying raw Discord or microphone audio streaming.
- Areas touched: `docs/3d/3dvision8-recording-room-monitors.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live readability and friend-wording checks remain queued for the V8 monitor layout pass.

## [0127] - 2026-04-22 01:27 - `DJ-branch / V8-3 Mixer View Monitor`

- Summary: Completed the Vision 8 mixer monitor with a read-only in-room Mixer View showing five track strips, volume/mute/meter state, master and ENGINE status, a conservative silence reason, and the latest live/generated sound.
- Areas touched: `docs/3d/3dvision8-recording-room-monitors.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live readability and overlap checks remain queued for the V8 monitor layout pass.

## [0122] - 2026-04-22 01:22 - `DJ-branch / V8-2 Sequence View Monitor`

- Summary: Completed the Vision 8 sequence monitor with a read-only 5-by-4 in-room session grid, clip-state colors, selected-cell highlight, note-density ticks, and guitar tags for guitar-recorded FM Synth clips.
- Areas touched: `docs/3d/3dvision8-recording-room-monitors.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person/top-down readability remains queued for the V8 monitor layout pass.

## [0115] - 2026-04-22 01:15 - `DJ-branch / V8-1 Big Studio Status Monitor`

- Summary: Added the first Vision 8 monitor: a wide in-room Studio Status screen that reports ENGINE/master state, guitar ownership/live/recording state, current studio activity, and one conservative next action.
- Areas touched: `docs/3d/3dvision8-recording-room-monitors.md`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning; live first-person readability remains queued for the V8 monitor layout pass.

## [0055] - 2026-04-22 00:55 - `DJ-branch / Shared Countdown Precision Display`

- Summary: Added a shared admin countdown precision setting so the host can step the live timer display from whole seconds up to five decimal places for every connected user.
- Areas touched: `src/types/session.ts`, `src/lib/lobby/sessionState.ts`, `src/hooks/useCountdownDisplay.ts`, `src/lib/countdown/engine.ts`, `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `src/components/AdminPanel.tsx`, `src/components/TimerPanel.tsx`, `src/styles/global.css`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0048] - 2026-04-22 00:48 - `DJ-branch / Guitar Note Banks`

- Summary: Completed V7-5 by expanding the handheld guitar into three nine-note banks, adding held-guitar `Q`/`E` bank shifts, keeping number row/numpad `1-9` inside the active bank, and showing bank/range feedback in first person and on the guitar stand.
- Areas touched: `docs/3d/3dvision7-recording-room-guitar.md`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0044] - 2026-04-22 00:44 - `DJ-branch / Guitar Recording And Routing`

- Summary: Completed V7-4 by adding a holder-only guitar REC route, recording `GTR` notes into the local FM Synth scene 1 clip while preserving direct live guitar playback, and showing LIVE versus REC feedback on the stand and first-person guitar.
- Areas touched: `docs/3d/3dvision7-recording-room-guitar.md`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/useLocalDawState.ts`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0038] - 2026-04-22 00:38 - `DJ-branch / Shared Recording Room Guitar Ownership`

- Summary: Completed V7-3 by moving guitar pickup/drop into shared session ownership, showing held-by-you/held-by-friend state on the guitar stand, and releasing the guitar on exit, presence clear, reset, holder removal, or stale free-roam presence.
- Areas touched: `docs/3d/3dvision7-recording-room-guitar.md`, `src/types/session.ts`, `src/lib/lobby/sessionState.ts`, `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `src/lib/sync/mockSyncClient.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0024] - 2026-04-22 00:24 - `DJ-branch / Guitar Room Feedback`

- Summary: Completed V7-2 by adding guitar held/available feedback, selected-note readouts, a `1-9` note strip, and local silent-reason badges for ENGINE off, muted, or volume zero.
- Areas touched: `docs/3d/3dvision7-recording-room-guitar.md`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0015] - 2026-04-22 00:15 - `DJ-branch / Simple Recording Room Guitar`

- Summary: Added Vision 7 and shipped the first simple handheld guitar pass: visible studio guitar stand, local pickup/drop, first-person carried guitar visual, left-click strum, and number row/numpad `1-9` guitar notes through the existing FM synth/shared live sound path.
- Areas touched: `docs/3d/3dvision7-recording-room-guitar.md`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2359] - 2026-04-21 23:59 - `DJ-branch / Louder Recording Room Audio Engine`

- Summary: Raised the Recording Studio audio engine master volume ceiling from 0.5 to 1.5, doubled the ENGINE startup volume, and updated in-room master volume controls/meters for the new range.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2352] - 2026-04-21 23:52 - `DJ-branch / Free-Cam Click Interactions`

- Summary: Enabled aimed click interactions while the Tab top-down camera is in free-fly mode, while keeping normal top-down player-cam interactions disabled.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2350] - 2026-04-21 23:50 - `DJ-branch / V6-2 Recording Room Truth Panel`

- Summary: Replaced the Recording Studio room-status screen with a Studio Truth panel that reports engine state, piano route, drum mixer route, speaker route, and local-only patch behavior.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision6-recording-room-cleanup.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2347] - 2026-04-21 23:47 - `DJ-branch / V6-1 Recording Room Patch Reset`

- Summary: Added a Recording Studio in-world Reset Patch control near the Audio Interface that restores the local patch graph to default routing and briefly confirms the reset.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision6-recording-room-cleanup.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2328] - 2026-04-21 23:28 - `DJ-branch / Tiered Looper Control Spacing`

- Summary: Reworked the Recording Studio looper into a tiered layout with scene pads on the front deck, bar-length controls on a raised rear shelf, and the local MIDI status display on a back panel.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2321] - 2026-04-21 23:21 - `DJ-branch / Discord 3D Presence And Piano Audio Recovery`

- Summary: Made Discord-enabled builds default to WebSocket sync when no explicit sync mode is set, auto-joined users when opening the hidden 3D shell so friends render as room occupants, and made the Recording Studio audio engine become audible at a low master level after the user clicks ENGINE.
- Areas touched: `src/lib/sync/createSyncClient.ts`, `src/screens/MainScreen.tsx`, `src/3d/useLocalDawAudioEngine.ts`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2025] - 2026-04-21 20:25 - `DJ-branch / FM Synth Gain Display Scale`

- Summary: Changed the Recording Studio FM Synth gain control to present a normal 0-100% scale while keeping the underlying WebAudio gain in the safer existing range.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2022] - 2026-04-21 20:22 - `DJ-branch / Canonical Recording Studio Sounds`

- Summary: Added canonical recording-studio sound events so local synth, drum, bass, and piano triggers broadcast through room session state with sender patch snapshots and play for other users currently in the Recording Studio.
- Areas touched: `src/types/session.ts`, `src/lib/lobby/sessionState.ts`, `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `src/3d/useLocalDawAudioEngine.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `src/lib/sync/mockSyncClient.ts`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [2001] - 2026-04-21 20:01 - `DJ-branch / V5-12 - Audio Interface Downward Nudge`

- Summary: Nudged the Recording Studio Audio Interface side table down relative to the user's screenshot view and shifted the interface patch port registrations with it.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/patchPortRegistration.ts`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1959] - 2026-04-21 19:59 - `DJ-branch / V5-12 - Audio Interface Further Left`

- Summary: Shifted the Recording Studio Audio Interface side table farther left toward the wall and moved the interface patch port registrations with it so cables and click targets stay aligned.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/patchPortRegistration.ts`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1954] - 2026-04-21 19:54 - `DJ-branch / V5-12 - Live DAW Role Badge Wall Placement`

- Summary: Removed the temporary DAW placeholder wall label and moved the live cyan `DAW / YOU / LOCAL` role badge into that wall position.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1951] - 2026-04-21 19:51 - `DJ-branch / V5-12 - DAW Wall Sign Cleanup`

- Summary: Removed the blue wall slab near the DAW, moved the DAW label into that wall position, and hid the duplicate DAW label on the desk surface.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1948] - 2026-04-21 19:48 - `DJ-branch / V5-12 - Audio Interface Side Table`

- Summary: Put the Recording Studio Audio Interface on its own small side table to the left of the DAW and moved the audio-interface patch registrations again so cables and click targets follow the separate table placement.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/patchPortRegistration.ts`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1946] - 2026-04-21 19:46 - `DJ-branch / V5-12 - Audio Interface Left-Side Layout`

- Summary: Moved the Recording Studio Audio Interface to the opposite side of the DAW desk and shifted all audio-interface patch port registrations to keep cables and click targets aligned with the new position.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `src/3d/patchPortRegistration.ts`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1940] - 2026-04-21 19:40 - `DJ-branch / V5-12 - True Free-Fly Camera`

- Summary: Converted top-down free-cam into a true free-fly camera with independent 3D position, drag-to-look, pitch-aware WASD movement, and vertical rise/drop controls.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1757] - 2026-04-21 17:57 - `DJ-branch / V5-12 - Free-Cam Feedback And Key Detection`

- Summary: Made top-down free-cam state visible in the HUD, exposed camera mode on the shell, and broadened the toggle to accept the Backquote code plus typed backquote/tilde key values.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `src/styles/global.css`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1754] - 2026-04-21 17:54 - `DJ-branch / V5-12 - Top-Down Free-Cam Toggle`

- Summary: Added a Backquote free-cam toggle while top-down mode is active; free-cam makes WASD move the overhead camera without moving the player, and toggling it off returns to normal follow-player top-down movement.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1752] - 2026-04-21 17:52 - `DJ-branch / V5-12 - Top-Down WASD Player Movement`

- Summary: Added WASD movement while top-down mode is active; the overhead camera now follows the moved player marker while arrow-key screenshot panning remains camera-only.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1748] - 2026-04-21 17:48 - `DJ-branch / V5-12 - Top-Down Screenshot Camera Pan`

- Summary: Added arrow-key panning while top-down mode is active so the Recording Studio overview can be reframed for manual screenshots, then clears the pan when returning to first-person.
- Areas touched: `src/3d/ThreeDModeShell.tsx`, `docs/3d/3dvision5.md`.
- Verification: Manager `npm.cmd run build` passed with the existing Vite large chunk warning.

## [1210] - 2026-04-21 12:10 - `DJ-branch / V5-11 - Local Piano And Drum Patch Gating`

- Summary: Added local patch-path helpers and optional generated-sound gating for Piano-live and Drum voices while preserving event feedback for disconnected, muted, and volume-zero attempts.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser interaction checks are pending.

## [1202] - 2026-04-21 12:02 - `DJ-branch / V5-9 - Speaker Patch And Audibility Status`

- Summary: Added exact speaker patch truth plus compact `EVT`, `PATCH`, and `AUD` speaker panel indicators so generated events, patch state, and display-audible state are readable separately.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser interaction checks are pending.

## [1155] - 2026-04-21 11:55 - `DJ-branch / V5-8 - Patch Connection Status Lights`

- Summary: Added read-only local patch status helpers and visual connection/not-patched labels for Piano Out, Drum Mixer mic inputs, Drum Mixer Out, Audio Interface ports, and Speaker In.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser interaction checks are pending.

## [1149] - 2026-04-21 11:49 - `DJ-branch / V5-7 - Loose Cable Reticle Preview`

- Summary: Added a visual loose-cable preview that follows the reticle for the active local patch cable and snaps only to patch port target hits.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser interaction checks are pending.

## [1145] - 2026-04-21 11:45 - `DJ-branch / V5-6 - Local Cable Click Interactions`

- Summary: Added local click-to-unplug/reconnect patch cable interactions, validation helpers, visible cable-end/port targets, and state-aware cable rendering that hides loose cables until the reticle preview phase.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser interaction checks are pending.

## [1137] - 2026-04-21 11:37 - `DJ-branch / V5-5 - Patch Port Registration Helpers`

- Summary: Added a pure Level 1 patch port registration module mapping studio patch port IDs to stable world positions for later dynamic cables and port hit targets.
- Areas touched: `src/3d/patchPortRegistration.ts`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser visual checks are pending.

## [1131] - 2026-04-21 11:31 - `DJ-branch / V5-4 - Local Patch State Model`

- Summary: Added a local-only patch node/port/cable state model with deterministic default studio connections, pure lookup/validation helpers, and a reset-to-defaults action.
- Areas touched: `src/3d/useLocalDawState.ts`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser visual checks are pending.

## [1126] - 2026-04-21 11:26 - `DJ-branch / V5-3 - Static Default Patch Cables`

- Summary: Added visual-only starter patch cables for drum mics, Drum Mixer, Piano Out, Audio Interface inputs, and speaker output, with decorative plug beads and a static Piano Out jack.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser visual checks are pending.

## [1119] - 2026-04-21 11:19 - `DJ-branch / V5-2 - Static Drum Mixer And Mics`

- Summary: Added static Recording Studio Drum Mixer and drum mic visuals around the kit, with labeled mic inputs, a mixer output, display-only recent-hit lights, a display-only output meter, and visible mic output jacks.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: Worker and manager `npm.cmd run build` passes completed with the existing Vite large chunk warning. Browser visual checks are pending.

## [1113] - 2026-04-21 11:13 - `DJ-branch / V5-1 - Static Audio Interface`

- Summary: Added a static Recording Studio Audio Interface near the DAW table with four labeled inputs, one output, display-only PWR/MUTE/VOL lights, and an Interface -> DAW label to seed the patchable studio workflow.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision5.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Browser visual checks are pending.

## [1042] - 2026-04-21 10:42 - `DJ-branch / Recording Studio - Sound Activity Speakers`

- Summary: Added a Recording Studio speaker/meter display that lights up, shows the last generated piano/drum/synth event, and draws speaker wave rings when generated audio is live.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0932] - 2026-04-21 09:32 - `DJ-branch / Recording Studio - Clickable Drum Kit`

- Summary: Expanded the Recording Studio south side and added a physical clickable drum kit pocket with kick, snare, and hat pieces routed to the existing generated drum voices.
- Areas touched: `src/3d/levels/level1.ts`, `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0926] - 2026-04-21 09:26 - `DJ-branch / Piano Station - FM Pad Clearance`

- Summary: Moved the FM synth note-pad shelf down and forward from the Piano/MIDI keys so it no longer visually covers the playable piano area.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0922] - 2026-04-21 09:22 - `DJ-branch / DAW Table - Backdrop Clearance`

- Summary: Moved the Recording Studio DAW backdrop slab upward and farther back from the table so it no longer blocks the DAW controls visually.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0911] - 2026-04-21 09:11 - `DJ-branch / Audio Controls - Master Volume Bar`

- Summary: Added a visible Recording Studio master volume bar and percent readout beside the Engine/Mute/Vol controls so volume clicks have immediate feedback.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0904] - 2026-04-21 09:04 - `DJ-branch / Piano Station - Walkable Rear Gap`

- Summary: Moved the Recording Studio Piano/MIDI station inward from the south wall and aligned its instrument controls and role marker so users can walk behind it.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0902] - 2026-04-21 09:02 - `DJ-branch / Piano Station - Face Room Center`

- Summary: Rotated the Recording Studio Piano/MIDI station so its playable keys and controls face inward toward the room instead of toward the wall.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0901] - 2026-04-21 09:01 - `DJ-branch / Camera Zoom - Smooth Inspect Fix`

- Summary: Stopped the inactive top-down camera controller from resetting first-person FOV every frame and made Shift zoom clearing respect separately held Shift keys.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0858] - 2026-04-21 08:58 - `DJ-branch / Camera Zoom - Shift Mouse Wheel Inspect`

- Summary: Added temporary first-person camera zoom in the 3D world when holding Shift and using the mouse wheel, with zoom reset on Shift release, blur, disabled controls, or pointer-lock cleanup.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0849] - 2026-04-21 08:49 - `DJ-branch / Camera Pitch - Looser Downward Look`

- Summary: Loosened the first-person camera's downward pitch limit so near-floor Recording Studio controls are easier to aim at without allowing camera flip-over.
- Areas touched: `src/3d/ThreeDModeShell.tsx`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0412] - 2026-04-21 04:12 - `DJ-branch / Phase V4-31 - Studio Presence And Roles`

- Summary: Added visual-only Recording Studio role badges derived from existing local selected station and fresh free-roam presence, without adding sync events, interactables, audio, or SoundCloud changes.
- Areas touched: `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world role badge/proximity checks are pending.

## [0406] - 2026-04-21 04:06 - `DJ-branch / Phase V4-30 - Shared MIDI Clip Implementation`

- Summary: Added compact reducer-owned shared DAW clip publish/clear sync, local selected-clip export/import with synced/conflict metadata, and two DAW-station shared clip controls while preserving local generated playback boundaries.
- Areas touched: `src/types/session.ts`, `src/lib/lobby/sessionState.ts`, `src/lib/sync/mockSyncClient.ts`, `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `src/3d/useLocalDawState.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual shared clip/multi-client checks are pending.

## [0352] - 2026-04-21 03:52 - `DJ-branch / Phase V4-28 - Shared Transport Implementation`

- Summary: Added reducer-owned shared DAW transport state and sparse host-authoritative tempo/play/stop events, then mirrored the shared snapshot into local DAW transport controls without syncing audio or high-frequency beats.
- Areas touched: `src/types/session.ts`, `src/lib/lobby/sessionState.ts`, `src/lib/sync/wsSyncClient.ts`, `src/lib/sync/mockSyncClient.ts`, `src/hooks/useDabSyncSession.ts`, `src/screens/MainScreen.tsx`, `src/3d/useLocalDawState.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual shared transport/in-world checks are pending.

## [0338] - 2026-04-21 03:38 - `DJ-branch / Phase V4-26 - Mixer And Meters`

- Summary: Added local track mixer volume/mute controls, generated-voice gain scaling, DAW-station mixer strips, master mixer controls, and event-derived meters while preserving the fixed generated-audio chain.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/useLocalDawAudioEngine.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world mixer/audio checks are pending.

## [0331] - 2026-04-21 03:31 - `DJ-branch / Phase V4-25 - Device Chain Visuals`

- Summary: Added local selected-device state/actions and compact DAW-station device chain cards/toggles while keeping device enabled state visual-only with no audio routing changes.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world device-chain checks are pending.

## [0324] - 2026-04-21 03:24 - `DJ-branch / Phase V4-24 - Reverb Effect`

- Summary: Added a local generated-impulse reverb for app-owned/generated DAW audio, composed it after echo in the fixed chain, and added Effects Rack decay/mix controls while preserving SoundCloud and metronome bypass behavior.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world reverb/audio checks are pending.

## [0319] - 2026-04-21 03:19 - `DJ-branch / Phase V4-23 - Echo Effect`

- Summary: Added a conservative local echo/delay effect for app-owned/generated DAW audio, composed it after filter/autopan in the fixed chain, and added Effects Rack time/feedback/mix controls while preserving SoundCloud and metronome bypass behavior.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world echo/audio checks are pending.

## [0313] - 2026-04-21 03:13 - `DJ-branch / Phase V4-22 - Autopan Effect`

- Summary: Added local autopan patch/nodes for app-owned/generated DAW audio, composed the fixed filter-to-autopan chain, and added Effects Rack rate/depth controls while preserving SoundCloud and metronome bypass behavior.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world autopan/audio checks are pending.

## [0310] - 2026-04-21 03:10 - `DJ-branch / Phase V4-21 - Filter Effect`

- Summary: Added a local low-pass filter effect for app-owned/generated DAW audio, routed generated voices through it, and added Effects Rack cutoff/resonance controls while preserving SoundCloud and metronome behavior.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world filter/audio checks are pending.

## [0305] - 2026-04-21 03:05 - `DJ-branch / Phase V4-20 - App-Owned Deck Sources`

- Summary: Added local app-owned DJ deck sources from existing clips, source-only Deck A/B selection controls, and DJ status labels that avoid audio or SoundCloud playback.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world DJ source checks are pending.

## [0301] - 2026-04-21 03:01 - `DJ-branch / Phase V4-19 - DJ Station Visual And Local Controls`

- Summary: Added local DJ visual state plus Deck A/B cue/play controls, A/MID/B crossfader controls, platter visuals, and DJ status display without audio or SoundCloud integration.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world DJ checks are pending.

## [0255] - 2026-04-21 02:55 - `DJ-branch / Phase V4-18 - Simple Looper Station`

- Summary: Added Looper station clip pads, loop length controls, and local loop-length state updates that only affect Looper clips while reusing existing MIDI/control clip playback.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world Looper checks are pending.

## [0251] - 2026-04-21 02:51 - `DJ-branch / Phase V4-17 - Clip Playback`

- Summary: Added local beat-based playback for recorded MIDI-style clip notes, routed through existing generated voices with bounded duplicate-trigger protection and clip-grid playback visuals.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/audio/playback checks are pending.

## [0247] - 2026-04-21 02:47 - `DJ-branch / Phase V4-16 - MIDI Clip Recording`

- Summary: Added local-only MIDI-style note recording from piano key clicks into selected armed/recording clips, with coarse beat quantization and compact recorded-note visuals.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/audio/recording checks are pending.

## [0242] - 2026-04-21 02:42 - `DJ-branch / Phase V4-15 - Piano Live Input`

- Summary: Added clickable in-world piano keys that route short live notes to FM Synth by default or Bass when selected, with local status displays and no recording or clip writes.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/audio checks are pending.

## [0237] - 2026-04-21 02:37 - `DJ-branch / Phase V4-14 - Piano Station Render`

- Summary: Upgraded the Piano / MIDI station with a fuller visual keyboard, octave buttons, ARM indicator, target-track display, and adjusted FM control layout while keeping the phase render-only.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world visual checks are pending.

## [0232] - 2026-04-21 02:32 - `DJ-branch / Phase V4-13 - Bass Machine Voice`

- Summary: Added a local generated bass machine with note pads, patch controls, and a hardcoded local RIFF audition routed through the existing safe audio engine.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/audio checks are pending.

## [0228] - 2026-04-21 02:28 - `DJ-branch / Phase V4-12 - Drum Machine Voice`

- Summary: Added local procedural kick, snare, and hat audition voices plus tiny Looper-area drum pads, routed through the existing safe audio engine and Room Status.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/audio checks are pending.

## [0224] - 2026-04-21 02:24 - `DJ-branch / Phase V4-11 - FM Synth Voice`

- Summary: Added a local FM synth voice, tiny Piano / MIDI audition pads, local carrier/ratio/index/envelope/gain patch controls, and Room Status FM summaries routed through the existing safe audio engine.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/audio checks are pending.

## [0218] - 2026-04-21 02:18 - `DJ-branch / Phase V4-10 - Metronome And Clock`

- Summary: Added a local DAW clock controller, visual transport beat advancement, gated quiet metronome ticks, and local Mute/Volume controls for safe testing.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/useLocalDawAudioEngine.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/audio checks are pending.

## [0212] - 2026-04-21 02:12 - `DJ-branch / Phase V4-9 - Web Audio Engine Bootstrap`

- Summary: Added a local silent Web Audio engine bootstrap with explicit in-world initialization, muted-safe master gain, Room Status reporting, and cleanup on shell exit/unmount.
- Areas touched: `src/3d/useLocalDawAudioEngine.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world/browser audio checks are pending.

## [0207] - 2026-04-21 02:07 - `DJ-branch / Phase V4-8 - Clip Grid Visual State`

- Summary: Added local-only DAW clip grid actions and a clickable 5x4 visual clip grid with selected, armed, playing, stopped, and empty states.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world checks are pending.

## [0203] - 2026-04-21 02:03 - `DJ-branch / Phase V4-7 - Local Transport Controls`

- Summary: Added local DAW transport actions and three clickable DAW station controls for play/stop and tempo adjustment, updating the in-world transport screen without audio or sync.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world checks are pending.

## [0158] - 2026-04-21 01:58 - `DJ-branch / Phase V4-6 - Local DAW State Model`

- Summary: Added a local-only DAW state hook for transport, tracks, clips, devices, and selection, then fed it read-only into Recording Studio overview screens.
- Areas touched: `src/3d/useLocalDawState.ts`, `src/3d/ThreeDModeShell.tsx`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world checks are pending.

## [0154] - 2026-04-21 01:54 - `DJ-branch / Phase V4-5 - Studio Overview Screens`

- Summary: Added static read-only Recording Studio overview panels for transport, track list, clip grid, device rack, and room status.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world checks are pending.

## [0139] - 2026-04-21 01:39 - `DJ-branch / Phase V4-4 - Studio Station Blockout`

- Summary: Added visual-only Recording Studio station placeholders for DAW, Piano / MIDI, Looper, DJ, Instrument Rack, and Effects Rack with static labels and no behavior.
- Areas touched: `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world checks are pending.

## [0135] - 2026-04-21 01:35 - `DJ-branch / Phase V4-3 - Recording Studio Shell Render`

- Summary: Activated and rendered the Level 1 Recording Studio as a walkable connected shell behind the Audio Workbench, with matching wall collision and updated top-down framing.
- Areas touched: `src/3d/levels/level1.ts`, `src/3d/Level1RoomShell.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning. Manual in-world checks are pending.

## [0118] - 2026-04-21 01:18 - `DJ-branch / Phase V4-2 - Recording Studio Area Config`

- Summary: Added planned Level 1 Recording Studio metadata and a planned Control Room opening behind the Audio Workbench without making the room visible or walkable yet.
- Areas touched: `src/3d/levels/types.ts`, `src/3d/levels/level1.ts`, `docs/3d/3dvision4.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## [0100] - 2026-04-21 01:00 - `Phase V3-48 - Audio Workbench Shell`

- Summary: Added a non-audible in-world audio workbench shell to the Level 1 Control Room with static patchbay, FM voice, transport, and sequencer visual language.
- Areas touched: `src/3d/Level1RoomShell.tsx`, `docs/3d/3dvision3.md`.
- Verification: `npm.cmd run build` passed with the existing Vite large chunk warning.

## Entry Format

```md
## [1613] - 2026-04-21 00:25 - `Catalog-Gen2-12 / Phase 2 - Source Options Real ZIP Listing`

- Summary: Short description of the change.
- Areas touched: Key files or systems changed.
- Verification: Command run, or why verification was not run.
```

Format notes:

- `##` is required.
- `[1613]` is a short numeric entry id.
- Timestamp uses local time in `YYYY-MM-DD HH:mm` format.
- Put branch and phase/title inside backticks.
- Keep newest entries first.
