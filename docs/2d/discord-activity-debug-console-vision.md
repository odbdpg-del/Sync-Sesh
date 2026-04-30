# Discord Activity Debug Console Vision

## Purpose

This vision adds a hidden in-app debug console so Sync Sesh can expose live Discord Activity diagnostics without needing browser devtools or guesswork.

The console should help us answer:

- Did the Discord SDK start?
- Which build and environment are we actually running?
- Did authorization start, stall, fail, or succeed?
- Are we using authenticated Discord identity, participant-only Discord identity, or local fallback?
- Did token exchange happen?
- Did sync connect?
- What happened immediately before the user saw the current error?

This is a debug tool first. It is not a player-facing feature.

## Product Recommendation

Build a hidden floating debug console that behaves like a live app-side log window.

Recommended behavior:

- The user types `console` anywhere in the app to open the debug console.
- When the console is open, it shows:
  - a pinned snapshot/status panel
  - a live append-only log stream
  - an input field for debug commands
- When the user types `hide` into the console command input, the console closes.

Recommended first debug commands:

- `hide`
- `clear`
- `help`
- `copy`
- `snapshot`
- `filter auth`
- `filter sdk`
- `filter sync`
- `filter profile`
- `filter network`
- `filter all`

The first version should optimize for clarity and live signal, not command depth.

## Why Now

We are actively debugging Discord Activity identity behavior that depends on:

- Discord runtime context
- embedded SDK state
- env config
- OAuth stage transitions
- token exchange routing
- profile fallback logic

This has already proven hard to reason about from screenshots alone. A hidden console will let us see the real event sequence inside the Activity runtime.

## Code Facts

Facts from code review on 2026-04-28:

- `src/hooks/useSecretCodeUnlock.ts` already implements hidden typed-sequence detection for `syncsesh`.
- `useSecretCodeUnlock` ignores typing while the target is an input/textarea/select/content-editable element.
- `src/components/FloatingWindow.tsx` already provides a reusable draggable/resizable floating window shell with close support.
- `src/screens/MainScreen.tsx` already owns the top-level app shell, hidden-world unlock flow, Discord identity banner, sync banners, and other global overlays.
- `src/hooks/useDabSyncSession.ts` is the central place where Discord startup, auth progress, sync client, and identity state are coordinated.
- `src/lib/discord/embeddedApp.ts` already tracks:
  - `buildId`
  - `attemptId`
  - `identitySource`
  - `startupStage`
  - `authStage`
  - `authError`
  - `startupError`
  - `channelId`
  - `guildId`
  - `instanceId`
- `src/components/StatusFooter.tsx` already displays a compact operational summary of sync and Discord identity state.

## Desired Debug Console Contract

The console should expose two layers:

```text
1. Snapshot layer
   - current state summary
   - useful static/durable facts

2. Event log layer
   - append-only timestamped entries
   - live updates as events happen
```

### Snapshot Layer

Recommended snapshot data:

- build id
- current page URL
- current host
- whether Discord proxy host was detected
- resolved auth endpoint
- resolved redirect URI
- whether `VITE_ENABLE_DISCORD_SDK` is enabled
- whether `VITE_DISCORD_CLIENT_ID` exists
- current `attemptId`
- current `identitySource`
- current `startupStage`
- current `authStage`
- current `authError`
- current `startupError`
- SDK enabled
- SDK `channelId`
- SDK `guildId`
- SDK `instanceId`
- sync mode
- sync transport state
- sync latency
- local profile id
- local profile display name
- whether avatar URL exists

### Event Log Layer

Each log entry should include:

- timestamp
- level: `info | warn | error`
- category: `sdk | auth | profile | sync | network | command | ui`
- short label
- optional structured detail payload

Examples:

- `sdk:init:start`
- `sdk:init:success`
- `sdk:ready:start`
- `sdk:ready:success`
- `profile:best-effort:start`
- `profile:best-effort:success`
- `auth:silent:start`
- `auth:silent:failed`
- `auth:interactive:start`
- `auth:interactive:success`
- `auth:token-exchange:start`
- `auth:token-exchange:success`
- `auth:authenticate:start`
- `auth:authenticate:failed`
- `identity:participant_discord`
- `identity:authenticated_discord`
- `identity:local_fallback`
- `sync:connect:start`
- `sync:connect:success`
- `sync:disconnect`
- `command:hide`
- `command:clear`

## Hidden Entry Rules

The console should be hidden by default and should not be visible through normal UI navigation.

Open behavior:

- Typing `console` outside interactive inputs opens the debug console.
- This should work similarly to the existing hidden-code detection pattern.

Close behavior:

- Typing `hide` into the debug console command input closes the console.
- The regular window close button should also close it.

Input safety rules:

- Typing `console` should not trigger while the user is focused in a normal text input.
- Once the debug console command input is focused, hidden global open-sequence detection should not accidentally re-trigger.

## Design Direction

This should feel like an internal operator console, not a polished consumer feature.

Visual direction:

- Reuse `FloatingWindow`.
- Dense but readable monospaced content.
- Compact rows.
- Clear category tags.
- Scrollable log.
- Lightweight status chips for snapshot fields.

The first version should favor utility over visual ambition.

## Command Model

Minimum command set:

- `hide` closes the console
- `clear` clears the current log buffer
- `help` prints available commands into the log
- `copy` copies visible log output to clipboard
- `snapshot` prints the current snapshot into the log

Recommended filter commands:

- `filter all`
- `filter auth`
- `filter sdk`
- `filter profile`
- `filter sync`
- `filter network`
- `filter ui`

Optional later commands:

- `pause`
- `resume`
- `export`
- `mark <label>`

## Logging Strategy

Use an in-memory log buffer in the first version.

Recommended constraints:

- cap total entries, for example 200 to 400
- preserve newest entries
- avoid infinite growth
- collapse repeated spam only in a later phase, not the first one

Do not log:

- access tokens
- client secrets
- raw sensitive secrets from env

Do log:

- stage transitions
- endpoint names
- status codes
- non-secret payload summaries
- profile source changes

## Target Architecture

Suggested first shape:

```ts
type DebugLogLevel = "info" | "warn" | "error";
type DebugLogCategory = "sdk" | "auth" | "profile" | "sync" | "network" | "command" | "ui";

interface DebugLogEntry {
  id: string;
  timestamp: number;
  level: DebugLogLevel;
  category: DebugLogCategory;
  label: string;
  detail?: string;
}
```

Suggested high-level ownership:

```text
MainScreen
  - owns console open/close state
  - mounts the floating debug console

useDebugConsoleTrigger
  - listens for hidden `console` sequence

DebugConsoleWindow
  - renders snapshot panel
  - renders log list
  - owns command input UX

DebugConsoleStore or hook
  - append log entries
  - clear/filter/copy helpers

Discord/sync instrumentation
  - emits structured debug entries
```

## Phase Plan

- [x] DAC-1: Add Hidden `console` Trigger And Floating Debug Window Shell.
- [x] DAC-2: Add Snapshot Panel And In-Memory Log Store.
- [x] DAC-3: Instrument Discord Identity And Sync Lifecycle Events.
- [ ] DAC-4: Add Command Input With `hide`, `clear`, `help`, `copy`, And `snapshot`.
- [x] DAC-5: Add Category Filters And Readability Polish.

## Manager Execution Plan

Run one debug-console phase at a time.

Recommended order:

1. DAC-1 first to establish the hidden entry path and shell.
2. DAC-2 second so the console can display stable state before deep instrumentation lands.
3. DAC-3 third because that is the core debugging payoff.
4. DAC-4 fourth so the console can operate like a real tool.
5. DAC-5 last for filter polish and usability cleanup.

Expected implementation files across the whole vision:

- `src/screens/MainScreen.tsx`
- `src/components/FloatingWindow.tsx`
- new debug console component/hook files under `src/components` or `src/hooks`
- `src/hooks/useDabSyncSession.ts`
- `src/lib/discord/embeddedApp.ts`
- `src/components/StatusFooter.tsx` only if helpful for shared summary helpers
- `src/styles/global.css`

Files to avoid unless a phase explicitly requires them:

- 3D world implementation files
- session reducer logic
- SoundCloud and DAW systems
- backend server code, unless a later phase intentionally mirrors client-side debug events

## DAC-1: Add Hidden `console` Trigger And Floating Debug Window Shell

Status: `[x]` completed.

### Summary

Create the hidden entry path and a minimal floating debug console window.

### Implementation Spec

Expected files:

- `src/screens/MainScreen.tsx`
- new `src/hooks/useDebugConsoleTrigger.ts` or equivalent
- new `src/components/DebugConsoleWindow.tsx`
- `src/components/FloatingWindow.tsx` only if a tiny shell enhancement is truly required
- `src/styles/global.css`

Expected work:

- Add hidden typed-sequence detection for `console`.
- Reuse the same safety behavior as the existing secret-code system: do not trigger while the user is typing in a normal input.
- Add top-level state in `MainScreen` to open/close the debug console.
- Render a `FloatingWindow`-based debug console shell.
- Include a title bar and standard close button.
- Add a placeholder body with:
  - snapshot placeholder
  - log placeholder
  - command input placeholder

Code seams to reuse:

- `src/hooks/useSecretCodeUnlock.ts`
  - reuse the same input-safety logic pattern
  - likely duplicate/adapt the hidden typed-sequence buffer behavior rather than overloading the 3D unlock hook
- `src/components/FloatingWindow.tsx`
  - reuse as-is if possible
  - avoid broad window-system changes in this phase
- `src/screens/MainScreen.tsx`
  - own the open/close state
  - mount the new debug window near the other top-level overlays
- `src/styles/global.css`
  - add a minimal debug-console shell style only

Expected implementation boundaries:

- Keep DAC-1 focused on open/close mechanics and the visual shell only.
- Do not add real logging state yet.
- Do not instrument Discord or sync events yet.
- Do not add command parsing yet; the command input is visual-only in this phase.
- Do not alter the existing `syncsesh` hidden-world unlock behavior.

Suggested implementation shape:

```text
useDebugConsoleTrigger("console", onMatch)
  -> manages hidden typed-sequence detection
  -> ignores interactive targets

MainScreen
  -> const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false)
  -> useDebugConsoleTrigger(() => setIsDebugConsoleOpen(true))
  -> render <DebugConsoleWindow isOpen=... onClose=... />

DebugConsoleWindow
  -> wraps FloatingWindow
  -> placeholder snapshot section
  -> placeholder log section
  -> placeholder command input
```

Recommended default window rect:

- x: 72
- y: 96
- width: 560
- height: 420

Recommended placeholder content:

- Snapshot section title: `Snapshot`
- Log section title: `Log`
- A few static placeholder rows such as:
  - `Console shell ready`
  - `Live event logging arrives in DAC-2/DAC-3`
- Command input placeholder text:
  - `Commands unlock in DAC-4`

Acceptance criteria:

- Typing `console` opens the window.
- The close button hides it.
- Normal text inputs do not accidentally trigger it.
- No actual logging behavior is required yet.
- The shell renders without disturbing the hidden 3D world unlock flow.
- The debug console can be opened and closed multiple times in one session.

Build and manual checks:

- `npm.cmd run build`
- Open app and type `console`
- Confirm the debug window appears
- Confirm typing in a normal input does not trigger it
- Confirm the existing `syncsesh` secret path still works
- Confirm closing the window and typing `console` again reopens it

Non-goals:

- No real log data yet
- No command behavior yet
- No persisted window state

Risks:

- Global hidden-key listeners can conflict with existing hidden-code listeners if event filtering is inconsistent.
- If the trigger hook is mounted too low in the tree, it may miss the intended global behavior.
- Reusing `FloatingWindow` should stay zero-risk; modifying it unnecessarily could create unrelated window regressions.

## DAC-2: Add Snapshot Panel And In-Memory Log Store

Status: `[x]` completed.

### Summary

Add the basic data model and render a live snapshot plus append-only log list.

### Implementation Spec

Expected files:

- new debug console state/store hook
- `src/components/DebugConsoleWindow.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`

Expected work:

- Add an in-memory log store with capped entry count.
- Add a snapshot object or selectors for current app/Discord/sync state.
- Render the snapshot panel above the log list.
- Render timestamped log rows in a scrollable body.
- Seed the log with initial app-open/debug-open events.

### Implementation Prep

Recommended ownership for DAC-2:

- Keep DAC-2 store ownership in `MainScreen` first.
- `MainScreen` should create the debug console store/hook once and pass snapshot/log props into `DebugConsoleWindow`.
- Avoid introducing app-wide context in DAC-2 unless later phases prove it is necessary.
- This keeps the console lifecycle close to the hidden open/close state and avoids broad tree churn before instrumentation lands.

Recommended new first-pass files:

- `src/hooks/useDebugConsoleState.ts`
  - owns append-only in-memory log buffer
  - owns `clearLogs`
  - owns capped retention
  - derives the current snapshot from passed inputs
- `src/components/DebugConsoleWindow.tsx`
  - becomes render-only for snapshot rows and log rows
- `src/screens/MainScreen.tsx`
  - creates the debug console state hook
  - passes `sdkState` and `state.syncStatus` plus local profile inputs into the hook or directly into the window

Recommended first snapshot contract:

```ts
interface DebugConsoleSnapshot {
  buildId: string;
  pageUrl: string;
  host: string;
  isDiscordProxyHost: boolean;
  authEndpoint: string;
  redirectUri: string;
  discordSdkEnabledByEnv: boolean;
  hasDiscordClientId: boolean;
  attemptId?: string;
  identitySource?: EmbeddedIdentitySource;
  startupStage?: EmbeddedAppState["startupStage"];
  authStage?: EmbeddedAppState["authStage"];
  authError?: string;
  startupError?: string;
  sdkEnabled: boolean;
  channelId?: string;
  guildId?: string;
  instanceId?: string;
  syncMode: SyncStatus["mode"];
  syncConnection: SyncStatus["connection"];
  syncLatencyMs?: number;
  syncWarning?: string;
  localProfileId: string;
  localProfileDisplayName: string;
  hasAvatarUrl: boolean;
}
```

Recommended DAC-2 snapshot sources from current code:

- `sdkState.buildId`, `attemptId`, `identitySource`, `startupStage`, `authStage`, `authError`, `startupError`, `enabled`, `channelId`, `guildId`, and `instanceId` already exist in `useDabSyncSession` via `EmbeddedAppState`.
- `state.syncStatus.mode`, `connection`, `latencyMs`, and `warning` already exist on `DabSyncState`.
- `state.localProfile.id`, `displayName`, and `avatarUrl` already exist on `DabSyncState`.
- `window.location.href` and `window.location.host` should provide URL and host snapshot fields.
- `src/lib/discord/embeddedApp.ts` already contains the logic for:
  - Discord proxy host detection
  - resolved auth endpoint
  - resolved redirect URI
  - env-enabled SDK flag
  - presence of Discord client ID

Recommended export prep from `embeddedApp.ts` for DAC-2:

- Export a tiny read-only helper such as `getDiscordDebugConfigSnapshot()`.
- That helper should return:
  - `isDiscordProxyHost`
  - `authEndpoint`
  - `redirectUri`
  - `discordSdkEnabledByEnv`
  - `hasDiscordClientId`
- Do not duplicate this resolution logic inside `MainScreen`.

Recommended first log store behavior:

- Keep entries in memory only.
- Cap at `250` entries for DAC-2.
- Preserve newest entries and drop oldest entries.
- Store `detail` as a short string in DAC-2; structured object payloads can wait until DAC-3 if needed.
- Seed on first mount with a small number of deterministic events:
  - `ui:console:store-ready`
  - `ui:console:opened` when the window opens
  - `ui:console:closed` when the window closes

Recommended DAC-2 render model:

- Snapshot should render as a compact definition-list or two-column grid of chips/rows.
- Log should render newest-last in a scrollable container.
- DAC-2 should not add category filtering yet, but each row should already render timestamp, level, category, and label so DAC-5 does not need markup churn.

Recommended boundaries to keep DAC-2 small:

- Do not instrument Discord lifecycle internals yet.
- Do not parse commands yet.
- Do not add clipboard/export helpers yet.
- Do not persist logs across reloads.
- Do not move `sdkState` ownership out of `useDabSyncSession`.

Prep checklist before coding DAC-2:

- Export the small Discord config snapshot helper from `src/lib/discord/embeddedApp.ts`.
- Define `DebugConsoleSnapshot`, `DebugLogEntry`, `DebugLogLevel`, and `DebugLogCategory` in one place.
- Decide whether log ids use `Date.now` plus random suffix or a monotonic counter in the hook.
- Decide whether the hook appends `opened` and `closed` events itself or whether `MainScreen` does it from `isDebugConsoleOpen` transitions.
- Reuse `StatusFooter` wording only where helpful; do not couple the console snapshot rendering to footer markup.

Acceptance criteria:

- Console shows a snapshot panel.
- Console shows a log list.
- New log entries can be appended and rendered.
- Buffer does not grow without limit.

Build and manual checks:

- `npm.cmd run build`
- Open console and verify snapshot fields render
- Trigger a few seeded log events and verify they appear

Non-goals:

- No Discord/sync instrumentation yet
- No command parsing yet

## DAC-3: Instrument Discord Identity And Sync Lifecycle Events

Status: `[x]` completed.

### Summary

Wire the console into the real Discord and sync lifecycle so it becomes useful for debugging.

### Implementation Spec

Expected files:

- `src/hooks/useDabSyncSession.ts`
- `src/lib/discord/embeddedApp.ts`
- debug console store/hook files

Expected work:

- Emit structured log entries for:
  - SDK startup
  - SDK ready
  - best-effort profile attempts
  - silent auth start/fail/success
  - interactive auth start/fail/success
  - token exchange start/fail/success
  - authenticate start/fail/success
  - identity source changes
  - sync connect/disconnect
  - retry button clicks
- Add enough detail to diagnose stage and message without exposing secrets.
- Reflect current identity source and auth state into the snapshot panel.

### Implementation Prep

Recommended ownership for DAC-3:

- Keep the debug log buffer in `useDebugConsoleState`.
- Add an `appendLog` callback seam that `MainScreen` can pass down into `useDabSyncSession`.
- Keep Discord SDK internals responsible only for emitting structured lifecycle events, not for storing or rendering them.
- Keep `DebugConsoleWindow` render-only in DAC-3.

Recommended first DAC-3 plumbing shape:

```ts
interface DebugConsoleEventInput {
  level: DebugLogLevel;
  category: DebugLogCategory;
  label: string;
  detail?: string;
}
```

```text
MainScreen
  -> const debugConsole = useDebugConsoleState(...)
  -> useDabSyncSession({ onDebugEvent: debugConsole.appendLog })

useDabSyncSession
  -> emits sync/ui/profile events it directly owns
  -> forwards onDebugEvent into initializeEmbeddedApp

embeddedApp
  -> emits sdk/auth/profile/network events at source
```

Recommended `useDabSyncSession` signature prep:

- Extend the hook with an optional argument:

```ts
interface UseDabSyncSessionOptions {
  onDebugEvent?: (event: DebugConsoleEventInput) => void;
}
```

- Default it to `undefined` so non-debug call sites stay unchanged.

Recommended stable DAC-3 event labels:

- `sdk:init:start`
- `sdk:init:failed`
- `sdk:init:success`
- `sdk:ready:start`
- `sdk:ready:failed`
- `sdk:ready:success`
- `profile:best-effort:start`
- `profile:best-effort:success`
- `profile:best-effort:miss`
- `profile:best-effort:failed`
- `auth:silent:start`
- `auth:silent:failed`
- `auth:silent:escalated`
- `auth:interactive:start`
- `auth:interactive:failed`
- `auth:interactive:success`
- `auth:token-exchange:start`
- `auth:token-exchange:failed`
- `auth:token-exchange:success`
- `auth:authenticate:start`
- `auth:authenticate:failed`
- `auth:authenticate:success`
- `auth:subscribe:start`
- `auth:subscribe:success`
- `identity:participant_discord`
- `identity:authenticated_discord`
- `identity:local_fallback`
- `sync:connect:start`
- `sync:connect:success`
- `sync:connect:failed`
- `sync:disconnect`
- `ui:retry-discord-profile`

Recommended event ownership by file:

- `src/lib/discord/embeddedApp.ts`
  - `sdk:init:*`
  - `sdk:ready:*`
  - `profile:best-effort:*`
  - `auth:silent:*`
  - `auth:interactive:*`
  - `auth:token-exchange:*`
  - `auth:authenticate:*`
  - `auth:subscribe:*`
- `src/hooks/useDabSyncSession.ts`
  - `identity:*`
  - `sync:connect:*`
  - `sync:disconnect`
  - `ui:retry-discord-profile`

Recommended concrete emit points in `embeddedApp.ts`:

- Before `new DiscordSDK(clientId)`:
  - emit `sdk:init:start`
- Inside the `new DiscordSDK` failure catch:
  - emit `sdk:init:failed`
- Immediately after successful construction:
  - emit `sdk:init:success`
- Before `await sdk.ready()`:
  - emit `sdk:ready:start`
- Inside the `sdk.ready()` catch:
  - emit `sdk:ready:failed`
- Immediately after `sdk.ready()` resolves:
  - emit `sdk:ready:success`
- Before `resolveBestEffortDiscordProfile(sdk)`:
  - emit `profile:best-effort:start`
- If best-effort profile resolves:
  - emit `profile:best-effort:success`
- If best-effort profile returns nothing:
  - emit `profile:best-effort:miss`
- If best-effort profile throws:
  - emit `profile:best-effort:failed`
- Before `requestDiscordAuthorization(...)`:
  - emit `auth:silent:start` or `auth:interactive:start` based on prompt
- In authorize failure path:
  - emit matching `auth:silent:failed` or `auth:interactive:failed`
- When silent auth falls through to interactive retry:
  - emit `auth:silent:escalated`
- After interactive authorize returns a code:
  - emit `auth:interactive:success`
- Before `exchangeDiscordAuthCode(...)`:
  - emit `auth:token-exchange:start`
- On exchange failure:
  - emit `auth:token-exchange:failed`
- After successful exchange:
  - emit `auth:token-exchange:success`
- Before `sdk.commands.authenticate(...)`:
  - emit `auth:authenticate:start`
- On authenticate failure:
  - emit `auth:authenticate:failed`
- After authenticate succeeds:
  - emit `auth:authenticate:success`
- Before wiring subscriptions:
  - emit `auth:subscribe:start`
- After initial authenticated profile push and subscription setup:
  - emit `auth:subscribe:success`

Recommended concrete emit points in `useDabSyncSession.ts`:

- Right before the first `initializeEmbeddedApp(...)` call:
  - emit `sync:connect:start` only for sync client connect if we want strict naming separation
  - do not overload this with SDK startup; that belongs to `embeddedApp.ts`
- Right before `syncClient.connect()` in the initialization path:
  - emit `sync:connect:start`
- After `syncClient.connect()` resolves:
  - emit `sync:connect:success`
- If initial Discord bootstrap falls to the `.catch(...)` path before sync connect:
  - still emit `identity:local_fallback` if that becomes the settled identity
- In effect cleanup before `syncClient.disconnect()`:
  - emit `sync:disconnect`
- At the start of `retryDiscordProfile`:
  - emit `ui:retry-discord-profile`
- Whenever `setSdkState` or profile update handlers settle into:
  - `participant_discord` -> emit `identity:participant_discord`
  - `authenticated_discord` -> emit `identity:authenticated_discord`
  - `local_fallback` -> emit `identity:local_fallback`

Recommended identity-change guard:

- Track the last emitted identity source in a ref inside `useDabSyncSession`.
- Emit `identity:*` only when the source actually changes.
- This avoids noisy repeated events from unrelated `setSdkState` updates.

Recommended detail payload rules:

- Use `detail` for short human-readable summaries only.
- Good detail examples:
  - auth prompt mode
  - attempt id suffix
  - startup/auth stage names
  - endpoint path or host
  - HTTP status code
  - missing config keys
  - fallback reason text
  - sync warning text
- Avoid structured objects in DAC-3 unless they are first converted to short strings.

Redaction and safety rules for DAC-3:

- Never log:
  - raw OAuth authorization codes
  - raw access tokens
  - raw `Authorization` header values
  - client secrets
  - full env dumps
- Safe to log:
  - auth endpoint URL or pathname
  - redirect URI
  - HTTP status codes
  - build id
  - attempt id suffix or full attempt id if desired
  - missing env key names such as `VITE_DISCORD_CLIENT_ID`
  - Discord error names and descriptions if they do not contain tokens

Recommended severity mapping:

- `info`
  - normal stage starts
  - normal stage successes
  - identity upgrades
  - sync connect/disconnect
- `warn`
  - best-effort profile miss
  - silent auth escalation to interactive
  - degraded participant-only identity
  - sync warning states
- `error`
  - SDK construction failure
  - SDK ready failure
  - auth/token/authenticate failures
  - settled local fallback due to failure

Recommended Phase 3 boundaries:

- Do not instrument every `syncClient.send(...)` action yet; DAC-3 should stay focused on Discord identity and sync lifecycle.
- Do not add command logging yet beyond retry-button related `ui` events.
- Do not add backend persistence or server mirroring.
- Do not widen the snapshot model unless lifecycle debugging proves a field is missing.

Prep checklist before coding DAC-3:

- Add optional debug-event callback plumbing from `MainScreen` -> `useDabSyncSession` -> `initializeEmbeddedApp`.
- Add one helper in `embeddedApp.ts` to emit sanitized debug events without repeating prompt-mode branching logic everywhere.
- Add a small identity-source dedupe ref in `useDabSyncSession`.
- Decide whether sync connect failure can be observed from `syncClient.connect()` directly or whether it must be inferred from later `state.syncStatus.connection === "error"` transitions.
- Keep all new event labels aligned with the list above so DAC-4/DAC-5 can depend on stable names and categories.

Acceptance criteria:

- Opening the console during Activity startup reveals a useful event timeline.
- Identity transitions are visible in the log.
- Sync transitions are visible in the log.
- No secrets are logged.

Build and manual checks:

- `npm.cmd run build`
- Launch Activity and confirm auth lifecycle events appear
- Click Retry and confirm retry events appear

Non-goals:

- No command system yet

## DAC-4: Add Command Input With `hide`, `clear`, `help`, `copy`, And `snapshot`

Status: `[x]` completed.

### Summary

Turn the console into an operator tool with a simple command input.

### Implementation Spec

Expected files:

- `src/components/DebugConsoleWindow.tsx`
- debug console command/parser helpers
- `src/styles/global.css`

Expected work:

- Add a command input at the bottom of the console.
- Parse the minimum command set:
  - `hide`
  - `clear`
  - `help`
  - `copy`
  - `snapshot`
- Log command execution results into the console.
- Keep command history optional unless it is very cheap.

### Implementation Prep

Recommended ownership for DAC-4:

- Keep command execution owned by `MainScreen` plus `useDebugConsoleState`.
- Keep `DebugConsoleWindow` focused on command input UX and render-only output props.
- Do not let `DebugConsoleWindow` mutate logs directly; it should submit raw command strings upward.

Recommended first DAC-4 plumbing shape:

```ts
interface DebugConsoleCommandResult {
  closeConsole?: boolean;
}
```

```text
DebugConsoleWindow
  -> owns command input text state
  -> calls onSubmitCommand(rawCommand)

MainScreen
  -> handleDebugConsoleCommand(rawCommand)
  -> uses debugConsoleState helpers
  -> closes window when command result requests it

useDebugConsoleState
  -> appendLog
  -> clearLogs
  -> format/copy helpers
  -> snapshot-to-text helper
```

Recommended new `useDebugConsoleState` helpers for DAC-4:

- `appendLog(event)`
- `clearLogs()`
- `getVisibleLogText(): string`
- `getSnapshotText(): string`
- optionally `appendSystemMessage(label, detail, level?, category?)` if that keeps command handlers terse

Recommended command normalization rules:

- Trim leading and trailing whitespace.
- Collapse repeated internal whitespace for matching only.
- Match commands case-insensitively.
- Preserve the user’s original input string when echoing a command into the log if helpful.

Recommended command contract for DAC-4:

- `hide`
  - close the console
  - append `command:hide`
- `clear`
  - clear the log buffer
  - immediately append a fresh `command:clear` confirmation entry after clearing so the console is never visually blank without explanation
- `help`
  - append a command list entry
  - append `command:help`
- `copy`
  - copy the visible log text to clipboard with `navigator.clipboard.writeText`
  - append `command:copy` success or failure
- `snapshot`
  - append a text dump of the current snapshot into the log
  - append `command:snapshot`

Recommended first command labels:

- `command:hide`
- `command:clear`
- `command:help`
- `command:copy`
- `command:copy:failed`
- `command:snapshot`
- `command:unknown`

Recommended command categories and levels:

- category: always `command` for direct command execution results in DAC-4
- level:
  - `info` for normal command success
  - `warn` for unknown command
  - `error` for clipboard failure or unexpected command execution error

Recommended help output for DAC-4:

- Keep it short and log-friendly:
  - `hide`
  - `clear`
  - `help`
  - `copy`
  - `snapshot`
- Mention that filter commands arrive in DAC-5 only if you want to reduce confusion.

Recommended snapshot dump format:

- Reuse the existing snapshot row order from `DebugConsoleWindow`.
- Produce a newline-delimited plain-text block:

```text
Snapshot
Build: ...
Page URL: ...
Host: ...
...
```

- Keep it text-only so `copy` can reuse the same formatter later.

Recommended copy behavior:

- Copy visible log rows only in DAC-4.
- Do not include the full snapshot automatically in `copy`.
- Use a plain-text format such as:

```text
[10:14:21] [info] [ui] ui:console:opened - Debug console window opened.
```

- On clipboard API failure, append an error entry instead of silently failing.

Recommended `DebugConsoleWindow` UI changes for DAC-4:

- Replace the read-only placeholder command input with a real controlled input.
- Submit on `Enter`.
- Keep the close button behavior unchanged.
- Clear the input after successful command handling.
- Keep command history out of scope unless it stays tiny and truly free.

Recommended boundaries to keep DAC-4 small:

- No filter parsing yet.
- No pause/resume.
- No export/download file behavior.
- No multiline command language.
- No persistent command history.

Prep checklist before coding DAC-4:

- Add stateful command input props to `DebugConsoleWindow`:
  - `onSubmitCommand`
  - optional `isCommandBusy` only if needed
- Add formatting helpers in `useDebugConsoleState` for snapshot and visible log text.
- Decide whether command confirmation entries should be appended before or after side effects; recommended:
  - `clear`: clear first, then append confirmation
  - `copy`: attempt copy first, then append success/failure
  - `hide`: append confirmation first, then close
  - `snapshot`: append the snapshot dump entry, then append command confirmation only if a separate confirmation still feels useful
- Keep command parsing in one small helper so DAC-5 can extend it with `filter ...` without rewriting the whole switch.

Acceptance criteria:

- Typing `hide` closes the console.
- Typing `clear` clears the log.
- Typing `help` prints available commands.
- Typing `copy` copies visible log text.
- Typing `snapshot` prints current snapshot info into the log.

Build and manual checks:

- `npm.cmd run build`
- Open console and verify each command works

Non-goals:

- No advanced filtering yet

## DAC-5: Add Category Filters And Readability Polish

Status: `[ ]` not started.

### Summary

Make the console easier to use during longer debugging sessions.

### Implementation Spec

Expected files:

- `src/components/DebugConsoleWindow.tsx`
- debug console store/hook files
- `src/styles/global.css`

Expected work:

- Add category filter commands:
  - `filter all`
  - `filter auth`
  - `filter sdk`
  - `filter profile`
  - `filter sync`
  - `filter network`
  - `filter ui`
- Add visual tags/colors for log level and category.
- Improve spacing, monospace readability, and scrolling behavior.
- Optionally add a “pinned newest” or auto-scroll behavior that can be paused when the user scrolls up.

Acceptance criteria:

- Filter commands reduce visible log output by category.
- Log rows are easier to scan under load.
- Console remains usable during rapid event bursts.

Build and manual checks:

- `npm.cmd run build`
- Verify filters work across mixed auth/sync events
- Verify console remains readable as log volume grows

Non-goals:

- No persistent log export format yet
- No backend log aggregation

## Non-Goals

- Do not expose secrets or tokens in the console.
- Do not make the console visible through normal UI navigation.
- Do not redesign the existing app shell.
- Do not add server-side persistence in the first pass.
- Do not turn this into a full scripting console.

## Open Questions

- Should the `console` hidden trigger be hardcoded, or env-configurable for internal builds?
- Should the debug console remain available in production builds, or only when a debug env flag is set?
- Should command history be included early, or left out until after the core logging is useful?
- Should we add a `mark <label>` command later so testers can annotate the log timeline during manual tests?

## Build And Manual Checks

- No build was run for this docs-only vision write-up.
- Implementation phases should use `npm.cmd run build`.
- Real validation must happen inside the Discord Activity runtime as well as in a normal browser when appropriate.
