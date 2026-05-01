# Text To Voice Lobby Vision

## Purpose

This vision plans a lobby text-to-voice feature for Sync Sesh:

- the user types a short message into a lobby text box
- pressing `Enter` sends that message to the shared session
- each connected Activity client speaks the message out loud locally
- the lobby shows who sent it and gives users clear mute/volume control

The goal is a lightweight social utility: a typed message can become a quick spoken callout for everyone in the Activity without requiring microphone use.

## Product Recommendation

Build the first version as synced browser TTS, not as Discord voice-channel injection.

Use the debug console as the first playable prototype before adding dedicated lobby UI.

Console prototype:

```text
say-speak example 1
  -> speaks "speak example 1" locally in the app
```

This keeps the first slice tiny and lets us test Discord Activity audio behavior before designing the final lobby control.

Recommended MVP:

```text
User types message
  -> local client validates length/rate limits
  -> sync event broadcasts text + sender metadata
  -> every receiving client queues the line
  -> each client uses Web Speech API SpeechSynthesis to speak locally
```

This keeps the feature inside the current web Activity architecture. It avoids new backend audio generation, bot hosting, audio streaming, and Discord voice pipeline assumptions.

Important wording:

- Users hear the spoken line through their own Activity/browser audio output.
- This should not be described as the app speaking into the Discord voice channel unless a later Discord-supported voice/bot architecture is deliberately built.

## Research Notes

Current findings from 2026-04-30:

- Discord Activities are web apps hosted in an iframe and communicate with Discord through the Embedded App SDK.
- The Embedded App SDK is already installed in this repo as `@discord/embedded-app-sdk`.
- Discord's SDK docs expose events for voice state and speaking start/stop, but the reviewed docs do not show a supported client-side command for injecting generated Activity audio into a user's Discord voice channel.
- The browser Web Speech API provides `SpeechSynthesis` and `SpeechSynthesisUtterance`.
- MDN marks `SpeechSynthesis` as widely available and says it can retrieve voices, speak utterances, pause, resume, and cancel.
- Available voices are device/browser dependent, so different users may hear different voices unless a later server-generated audio path is added.
- Chrome-like browsers can require waiting for `voiceschanged` before the voice list is complete.

Useful references:

- Discord Activities overview: https://docs.discord.com/developers/activities/overview
- Discord Embedded App SDK reference: https://docs.discord.com/developers/developer-tools/embedded-app-sdk
- MDN SpeechSynthesis: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- MDN Using the Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API

## Existing Code Facts

Read-only findings from code review:

- `src/types/session.ts` owns the `SessionEvent` union and shared `SessionSnapshot` shape.
- `src/lib/sync/wsSyncClient.ts` sends session events over the existing WebSocket client.
- `server/sync-server.ts` receives `event` messages, reduces them through `reduceSessionEvent(...)`, then broadcasts the room snapshot.
- `src/lib/lobby/sessionState.ts` owns session reducer behavior.
- `src/hooks/useDabSyncSession.ts` exposes lobby actions by wrapping `syncClient.send(...)`.
- `src/components/LobbyPanel.tsx` is the likely first UI surface for the text input and recent spoken lines.
- The current reducer is snapshot-first; ephemeral one-shot audio events need special care so a new joiner does not replay old spoken messages unintentionally.

## UX Direction

The control should feel like a small comms strip, not a full chat app.

Recommended UI:

- add a compact input near the lobby/player deck
- placeholder: `Type voice line...`
- `Enter` sends
- `Shift+Enter` is not needed for MVP because messages should stay single-line
- show a small status row for the most recent spoken line
- add a speaker/mute toggle for incoming TTS
- add a self-preview option later, not in MVP

Recommended guardrails:

- max message length: 120 characters
- trim and collapse whitespace
- no empty messages
- local cooldown: 2 seconds between sends
- receiving clients queue only a small number of lines, such as 3
- incoming speech should stop or skip if the user has muted TTS
- do not speak while the user has opted out
- do not speak messages from blocked/unknown users if that concept is added later

## Architecture Recommendation

Prefer a dedicated TTS event stream instead of storing spoken text permanently in the room snapshot.

The current sync server broadcasts snapshots after reducing events. That is great for durable lobby state, but TTS is ephemeral. If TTS becomes part of `SessionSnapshot`, new joiners could accidentally receive and speak old messages.

Recommended path:

1. Add a lightweight server broadcast message for ephemeral TTS events.
2. Keep the durable session reducer mostly untouched.
3. Let each client decide whether to speak the received message.

Possible message shape:

```ts
type TextVoiceEvent = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};
```

Possible wire behavior:

```text
client -> server:
  { type: "text_voice", sessionId, event, localProfile }

server -> clients in room:
  { type: "text_voice", event, serverNow }
```

The server should validate the same basic constraints as the client: text length, non-empty text, and conservative cooldown per socket/user.

## Risk Notes

- Browser TTS quality and voice availability vary by platform.
- Some browsers may require user activation before audio can play reliably.
- Discord mobile Activity behavior needs manual testing; the iframe can be more restrictive than a normal browser tab.
- Speech can become annoying fast, so mute and cooldown controls are part of the MVP, not polish.
- This feature can be abused if messages are too long or too frequent.
- Server-generated TTS would produce consistent voice quality but adds cost, latency, moderation, storage/streaming, and API/provider decisions.
- Discord voice-channel output likely requires a separate supported bot/audio architecture, not just the Embedded App SDK.

## Phase Plan

- [x] TV-0: Add Local Debug Console `say-...` Prototype.
- [x] TV-1: Broadcast Debug Console `say-...` To The Lobby.
- [x] TV-2: Add Text Voice Panel With Input, Log, And Replay.
- [x] TV-2.1: Mark Local Replay Activity In The Text Voice Log.
- [x] TV-2.2: Add Synced Replay Attribution Events.
- [x] TV-2.3: Add Local Browser Voice Picker.
- [x] TV-2.4: Add Local Browser Voice Style Presets.
- [x] TV-2.5: Add Expandable Custom Voice Style Sliders.
- [ ] TV-3: Optional Lobby Shortcut Or Header Entry Point.
- [ ] TV-4: Add Mute And Queue Controls.
- [ ] TV-5: Add Server-Side Validation, Cooldown, And Manual Discord Checks.
- [ ] TV-6: Optional Voice Settings And Polish.

## [x] TV-0 - Add Local Debug Console `say-...` Prototype

### Summary

Add the first playable prototype through the debug console.

### Completed Implementation

Status: Completed on 2026-04-30.

- `src/screens/MainScreen.tsx` recognizes debug console commands starting with `say-`.
- The app treats `say-` as command syntax and speaks only the text after the prefix.
- The command uses browser `SpeechSynthesis` and logs a warning when TTS is unavailable.
- The debug console help text includes `say-your message`.
- Build passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- Typing `say-speak example 1` in any debug console surface speaks `speak example 1` locally.
- The command does not require Discord voice-channel access.
- The command does not broadcast to other clients yet.

## [x] TV-1 - Broadcast Debug Console `say-...` To The Lobby

### Summary

Turn the local console prototype into a shared lobby prototype: when a user submits a `say-...` command, every connected client in the same sync room receives the line and speaks it locally.

### Implementation Spec

Status: Prepared for implementation on 2026-04-30.

Code seams verified:

- `src/screens/MainScreen.tsx` currently handles all debug console commands in `handleDebugConsoleCommand(...)`.
- `src/screens/MainScreen.tsx` already has `speakDebugConsoleLine(text)` for local browser TTS.
- `src/hooks/useDabSyncSession.ts` owns sync actions and exposes them to `MainScreen`.
- `src/lib/sync/types.ts` defines the `SyncClient` interface.
- `src/lib/sync/wsSyncClient.ts` owns browser WebSocket send/receive behavior and currently receives only `snapshot`, `pong`, and `error` server messages.
- `src/lib/sync/mockSyncClient.ts` should keep local/offline behavior usable when no WebSocket server is active.
- `server/sync-server.ts` owns the WebSocket `ClientMessage` and `ServerMessage` unions and room broadcast logic.
- `src/types/session.ts` is the right home for a shared `TextVoiceEvent` type so client and server agree on shape.

Implementation steps:

1. In `src/types/session.ts`, add an exported `TextVoiceEvent` type:

   ```ts
   export interface TextVoiceEvent {
     id: string;
     senderId: string;
     senderName: string;
     text: string;
     createdAt: string;
   }
   ```

2. In `src/lib/sync/types.ts`, extend `SyncClient` with optional text voice support:

   ```ts
   sendTextVoice: (text: string) => void;
   subscribeTextVoice: (listener: (event: TextVoiceEvent) => void) => () => void;
   ```

   Import `TextVoiceEvent` from `src/types/session.ts`.

3. In `src/lib/sync/wsSyncClient.ts`:

   - import `TextVoiceEvent`
   - add a `textVoiceListeners` set
   - add `sendTextVoice(text)` that sends:

     ```ts
     {
       type: "text_voice",
       sessionId: this.sessionId,
       text,
       localProfile: this.localProfile
     }
     ```

   - block send with the same disconnected-warning behavior as `send(event)`
   - extend `ServerMessage` with `{ type: "text_voice"; event: TextVoiceEvent; serverNow: number }`
   - on receiving `text_voice`, emit the event to `textVoiceListeners`
   - do not mutate `snapshot` for text voice events

4. In `src/lib/sync/mockSyncClient.ts`:

   - add `textVoiceListeners`
   - implement `sendTextVoice(text)` by creating a local `TextVoiceEvent` using the current local profile and immediately notifying listeners
   - implement `subscribeTextVoice(...)`
   - keep this local-only for mock mode

5. In `server/sync-server.ts`:

   - import `TextVoiceEvent`
   - extend `ClientMessage` with `{ type: "text_voice"; sessionId: string; text: string; localProfile: LocalProfile }`
   - extend `ServerMessage` with `{ type: "text_voice"; event: TextVoiceEvent; serverNow: number }`
   - add a helper to normalize/validate text:
     - trim
     - collapse whitespace
     - reject empty
     - reject over 180 characters for this prototype
   - add a conservative per-socket cooldown map, roughly `1500ms`, to reduce accidental spam
   - when valid, create a `TextVoiceEvent` from the assigned/current socket profile and broadcast it to all sockets in the same room
   - do not call `reduceSessionEvent(...)`
   - do not add text voice events to `SessionSnapshot`

6. In `src/hooks/useDabSyncSession.ts`:

   - expose `sendTextVoice(text)` by calling `syncClient.sendTextVoice(text)`
   - expose `subscribeTextVoice(listener)` or bridge incoming events through a hook callback option such as `onTextVoiceEvent`
   - prefer an `onTextVoiceEvent` option for this phase so `MainScreen` can speak incoming events without extra state plumbing
   - subscribe/unsubscribe inside an effect next to the existing sync client subscription

7. In `src/screens/MainScreen.tsx`:

   - when `say-...` is submitted, strip the prefix and call the new `sendTextVoice(sayText)` instead of speaking immediately
   - speak incoming `TextVoiceEvent.text` from the hook callback using `speakDebugConsoleLine(...)`
   - log incoming events to the debug console with label `command:say:received` and detail including sender name and text
   - avoid double-speak by relying on the server echo; the sender should hear the message when their own echoed event returns
   - if `sendTextVoice(...)` is unavailable or disconnected, leave the existing sync warning behavior to surface through sync status and log a warning command output if useful

Recommended helper behavior:

- Treat `say-` as command syntax. Strip the prefix before speaking or broadcasting.
- Preserve the text after the prefix exactly except for trimming leading/trailing whitespace.
- Do not add a visible lobby input yet.
- Do not add persistent history yet.
- Do not add voice selection yet.
- Do not add Discord voice-channel behavior.

### Checklist Items Achieved

- Added a shared `TextVoiceEvent` type.
- Added `sendTextVoice(...)` and `subscribeTextVoice(...)` to the sync client interface.
- Added WebSocket text voice send/receive support without mutating session snapshots.
- Added mock-mode text voice support for local testing.
- Added server validation, cooldown, and ephemeral room broadcast.
- Connected incoming text voice events to local browser TTS in `MainScreen`.
- Kept `say-` as command syntax and broadcast only the stripped message text.

### Completed Implementation

Status: Completed on 2026-04-30.

- `src/types/session.ts` now exports `TextVoiceEvent`.
- `src/lib/sync/types.ts`, `src/lib/sync/wsSyncClient.ts`, and `src/lib/sync/mockSyncClient.ts` support ephemeral text voice events.
- `server/sync-server.ts` accepts `text_voice` client messages, validates text, rate-limits per socket, and broadcasts `text_voice` server messages to the room.
- `server/sync-server.ts` sends non-fatal `text_voice_error` messages for validation/rate-limit failures instead of marking the whole sync connection as failed.
- `src/hooks/useDabSyncSession.ts` exposes `sendTextVoice(...)` and subscribes to incoming text voice events through `onTextVoiceEvent`.
- `src/screens/MainScreen.tsx` sends stripped `say-` text through sync and speaks received text voice events locally.
- Build passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- With two connected clients in the same room, typing `say-speak example 1` in one debug console makes both clients speak `speak example 1`.
- The sender hears the line once, not twice.
- A newly joined client does not replay previous `say-...` lines.
- Local mock mode still speaks the line on the submitting client.
- Normal snapshot sync, ready flow, name rolling, and debug console commands continue to work.
- Over-length or empty text voice payloads are rejected by the server.
- Rapid repeated text voice sends are rate-limited by the server.
- `npm.cmd run build` passes.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manual direct-browser check with two tabs connected to the same sync server:
  - open console in tab A
  - run `say-speak example 1`
  - confirm tab A and tab B speak once
  - confirm the spoken line omits the `say-` prefix
  - reload tab B and confirm old lines do not replay
- Manual Discord Activity check if available:
  - launch with two users or one user plus a second client where possible
  - run `say-funny sounds funny voice;lkajsd;lfkja;df poooooooooop popopopopo`
  - confirm both clients hear local app audio

### Risks

- Browser speech may require a recent user gesture in some embedded contexts; the console Enter key should usually count, but Discord mobile needs testing.
- Audio output and voice quality may differ per client.
- Server broadcast payloads are ephemeral, so debug logs are the only history in this phase.
- If the sync server is not restarted after server code changes, clients will not understand the new `text_voice` route.

### Wishlist Mapping

- Supports the user's requested console syntax: `say-...`.
- Moves from local-only app speech toward "everyone in the Discord Activity/lobby hears it," while staying out of Discord voice-channel injection.

### Non-Goals

- Dedicated lobby text input.
- Mute/volume controls.
- Persistent chat or spoken-line history.
- Server-generated audio.
- Discord bot or voice-channel audio output.

## [x] TV-2 - Add Text Voice Panel With Input, Log, And Replay

### Summary

Add a dedicated dockable/floating Text Voice panel instead of putting the first user-facing UI directly into the Lobby panel.

The panel must stay hidden by default. Users open it by typing `showt2v` in the debug console.

The panel should let users:

- type a spoken line without the `say-` prefix
- press `Enter` to send it through the existing `text_voice` sync path
- see a local log of text voice lines received during the current app session
- click a replay button on a log row to hear that line locally again

### Implementation Spec

Status: Completed on 2026-04-30.

Code seams verified:

- `src/lib/panels/panelLayout.ts` owns the `PANEL_IDS` tuple, `PanelId` type, default layout helpers, min size map, and persisted layout validation.
- `src/lib/panels/panelRegistry.ts` owns panel metadata and adapter keys.
- `src/screens/MainScreen.tsx` owns layout visibility, `restorePanelInLayout(...)`, `removePanelFromLayout(...)`, docked/floating rendering, and debug console commands.
- `src/screens/MainScreen.tsx` already receives `sendTextVoice(...)` from `useDabSyncSession`.
- `src/screens/MainScreen.tsx` already receives incoming `TextVoiceEvent` through `handleTextVoiceEvent`.
- `src/screens/MainScreen.tsx` already has `speakDebugConsoleLine(text)` for local TTS/replay.
- `src/components` is the right place for a new `TextVoicePanel.tsx`.
- `src/styles/global.css` holds panel styles. Existing SoundCloud and lobby panel styles provide reusable patterns.
- Current `TV-1` text voice events are ephemeral and not stored in `SessionSnapshot`, so the panel log must be local UI state only.

Implementation steps:

1. Add a local UI log type in `MainScreen.tsx`, near nearby local types:

   ```ts
   interface TextVoiceLogEntry extends TextVoiceEvent {
     receivedAt: string;
     replayCount: number;
   }
   ```

2. Add a local state buffer in `MainScreen.tsx`:

   ```ts
   const [textVoiceLog, setTextVoiceLog] = useState<TextVoiceLogEntry[]>([]);
   ```

   Keep the buffer bounded to the latest 30 entries.

3. Update `handleTextVoiceEvent(event)` in `MainScreen.tsx`:

   - speak `event.text` locally through `speakDebugConsoleLine(...)`
   - append the event to `textVoiceLog`
   - use event `id` as the stable key
   - if a duplicate id arrives, do not duplicate the row
   - keep existing debug console logging

4. Add a `handleReplayTextVoice(id)` callback in `MainScreen.tsx`:

   - find the matching log entry
   - call `speakDebugConsoleLine(entry.text)`
   - increment that entry's `replayCount`
   - append/log a debug console command output such as `command:say:replay`

5. Add a `handleSubmitTextVoice(text)` callback in `MainScreen.tsx`:

   - trim the text
   - reject empty text locally
   - enforce the same 180-character max as server validation
   - call `sendTextVoice(cleanText)`
   - leave speaking to the server echo, same as the console command

6. Add a new panel id:

   - In `src/lib/panels/panelLayout.ts`, add `"text-voice"` to `PANEL_IDS`.
   - Add `"text-voice": { minWidth: 1, minHeight: 1 }` to `PANEL_MIN_SIZES`.
   - Do not add it to `createDefaultPanelLayout()`. This panel should be optional for now.
   - Do not auto-open this panel during app startup.

7. Add a registry definition:

   - In `src/lib/panels/panelRegistry.ts`, add:

     ```ts
     "text-voice": {
       id: "text-voice",
       title: "Text Voice",
       defaultDock: "bottom",
       defaultFloatingRect: { x: 180, y: 140, width: 520, height: 420 },
       minWidth: 1,
       minHeight: 1,
       canClose: true,
       canFloat: true,
       canDock: true,
       adapterKey: "text-voice-panel",
     }
     ```

8. Add `src/components/TextVoicePanel.tsx`:

   Props:

   ```ts
   interface TextVoicePanelProps {
     entries: TextVoiceLogEntry[];
     syncConnection: SyncConnectionState;
     maxLength: number;
     onSubmitText: (text: string) => boolean;
     onReplay: (id: string) => void;
   }
   ```

   Component behavior:

   - render as `<section className="panel text-voice-panel">`
   - header title: `Text Voice`
   - status pill: connected/standby using `syncConnection`
   - single-line controlled input
   - pressing `Enter` sends
   - button sends the current input too
   - clear input after successful local submit
   - show latest entries newest-last or newest-first; recommended newest-first so replay stays visible
   - each row shows sender name, message text, local received time, and a replay icon/text button
   - empty state should be short and functional, such as `No voice lines yet.`

   Import `SyncConnectionState` from `src/types/session`.

9. Wire the panel in `MainScreen.tsx`:

   - import `TextVoicePanel`
   - create `TEXT_VOICE_PANEL_DEFINITION = getPanelDefinition("text-voice")`
   - add `const textVoiceFloatingPanel = corePanelLayout.floating.find((panel) => panel.panelId === "text-voice");`
   - add `const isTextVoiceDocked = dockTreeHasPanel(corePanelLayout.dockRoot, "text-voice");`
   - add `handleTextVoicePanelClose`, `handleTextVoiceFloat`, `handleTextVoiceDock`, `handleTextVoiceReset`, `handleTextVoiceFloatingRectChange`, and `handleTextVoiceFloatingFocus` following the Globe/Admin/SoundCloud patterns
   - update `getLastFloatingRectForPanel(...)`, `setLastFloatingRectForPanel(...)`, and `ensurePanelVisibleForDockedDrag(...)` for `"text-voice"`
   - add a `case "text-voice"` inside `PanelWorkspace` render switch
   - add floating render block following the Globe/Admin pattern

10. Add a debug console command so testers can open it before a visible nav entry exists:

    - command: `showt2v`
    - action: restore/open `"text-voice"` panel
    - update `DEBUG_CONSOLE_COMMAND_HELP`
    - output label: `command:showt2v`

11. Style in `src/styles/global.css`:

    - `.text-voice-panel`
    - `.text-voice-composer`
    - `.text-voice-input`
    - `.text-voice-send-button`
    - `.text-voice-log`
    - `.text-voice-entry`
    - `.text-voice-entry-meta`
    - `.text-voice-replay-button`
    - `.text-voice-empty`

    Keep the visual language aligned with existing panels: dark elevated surfaces, cyan borders, compact typography, no large marketing copy.

12. Update this doc after implementation:

    - mark TV-2 `[x]`
    - fill checklist/completed sections
    - keep TV-3 as optional visible entry point work

13. Update `changelog.md` and run `npm.cmd run build`.

### Checklist Items Achieved

- Added the optional `"text-voice"` panel id, min sizes, and panel registry definition without adding it to the default startup layout.
- Added `TextVoicePanel.tsx` with a compact input, connection status pill, current-session log, and row-level replay action.
- Wired `showt2v` into the debug console to restore/open the hidden panel on demand.
- Stored received text voice events in a bounded local log and deduped rows by event id.
- Kept sending through the existing `text_voice` sync path so the sender hears the server echo once.
- Added local replay through `speakDebugConsoleLine(...)` without rebroadcasting.
- Added dock, float, reset, focus, close, and layout persistence branches for the new panel.
- Styled the panel in the existing dark/cyan panel language.

### Completed Implementation

TV-2 now gives testers a hidden-by-default Text Voice panel opened by `showt2v`. The panel can send plain text voice lines without the `say-` prefix, logs received lines for the current app session, and replays a selected row locally. Build verification passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- Text Voice panel is not visible by default on fresh load.
- Running debug console command `showt2v` opens the Text Voice panel.
- The Text Voice panel can be docked, floated, reset, and closed like other optional panels.
- Typing `note to chat` in the panel and pressing `Enter` sends the same text voice event used by console `say-note to chat`.
- The sender hears the message once through the server echo, not once locally and once through echo.
- Received text voice events appear in the panel log for the current app session.
- Clicking replay on a log row speaks that row locally only and does not broadcast.
- Empty text is rejected locally.
- Over 180 characters is rejected locally.
- Existing console `say-...` still works.
- Existing panel layout persistence remains valid when older saved layouts do not include `"text-voice"`.
- `npm.cmd run build` passes.

### Build And Manual Checks

- Run `npm.cmd run build`.
- Manual single-client mock check:
  - open debug console
  - run `showt2v`
  - type `note to chat` in the panel
  - confirm the app speaks `note to chat`
  - confirm the row appears in the log
  - click replay and confirm it speaks locally again
- Manual two-client WebSocket check:
  - open the panel in both clients
  - submit from client A
  - confirm both clients speak once
  - confirm both logs receive the same line
  - click replay on client B and confirm only client B speaks again

### Risks

- The panel system has several helper branches for optional panels; missing `"text-voice"` in one branch could make dock/float behavior inconsistent.
- Existing saved panel layouts may be parsed against the updated `PANEL_IDS`; validation should remain permissive for layouts that simply do not include the new panel.
- Browser TTS may still require user activation on receiving clients.

### Wishlist Mapping

- Turns the console-only feature into a user-facing panel.
- Adds a current-session log of what everyone has said.
- Adds local replay without rebroadcasting.

### Non-Goals

- Mute button.
- Voice picker.
- Volume/rate controls.
- Persistent log across reloads.
- Discord voice-channel output.

## [x] TV-2.1 - Mark Local Replay Activity In The Text Voice Log

### Summary

Make replay status clearer without changing sync behavior.

Right now replay increments a local `replayCount`, but the row needs to stay clear about two separate facts:

- who wrote/spoke the original message
- whether the current user replayed that message locally

This phase should keep the original author as the canonical row identity and make any replay marker explicitly local/private to the current user.

### Implementation Spec

Status: Completed on 2026-04-30.

Recommended implementation:

- Keep replay local-only.
- Do not add server messages.
- Keep the original message author visually primary, using `entry.senderName`.
- Suggested row structure: `Written by Sean Brown` or `Sean Brown said`, then the message text, then an optional local marker like `You replayed 1x`.
- Rename the displayed replay label from `Replay 1` to something like `You replayed 1x`.
- Optionally add a short tooltip or `aria-label` on the Replay button that says replay is local only.
- Keep `TextVoiceLogEntry.replayCount` as local UI state.
- Do not replace the original sender label with replay information.

### Completed Implementation

- Text voice rows now render the original author as `{senderName} said`.
- Local replay status now renders separately as `You replayed {count}x`.
- The Replay button now has an accessible label and tooltip that clarify replay is local.
- No sync or server behavior changed.
- Build passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- Clicking Replay still speaks only on the current client.
- Each text voice row clearly marks who wrote the original message.
- The row visibly marks local replay activity as `You replayed 1x`, `You replayed 2x`, or similar.
- Replay information does not obscure or replace the original author.
- Other connected clients do not see the replay count change.
- No new sync/server event is added.
- `npm.cmd run build` passes.

### Non-Goals

- Showing which remote user replayed a line.
- Broadcasting replay clicks.
- Persisting replay history.

## [x] TV-2.2 - Add Synced Replay Attribution Events

### Summary

Add an optional shared room event for replay attribution, so the log can show who replayed a line.

This is intentionally separate from TV-2.1 because it changes replay from private/local UI state into a canonical room activity. The original spoken line should remain the canonical `TextVoiceEvent`; replay attribution should be a separate ephemeral event that references the original line id.

### Implementation Spec

Status: Completed on 2026-04-30.

Code seams verified:

- `src/types/session.ts` already exports `TextVoiceEvent`; replay attribution should live beside it as another shared ephemeral event type.
- `src/lib/sync/types.ts` owns the `SyncClient` contract and currently exposes `sendTextVoice(...)` plus `subscribeTextVoice(...)`.
- `src/lib/sync/wsSyncClient.ts` owns browser WebSocket text voice send/receive behavior and should add a second listener set for replay attribution.
- `src/lib/sync/mockSyncClient.ts` should mirror replay attribution locally for offline/direct testing.
- `server/sync-server.ts` already broadcasts ephemeral `text_voice` messages and can add a parallel `text_voice_replay` route without touching `SessionSnapshot`.
- `src/hooks/useDabSyncSession.ts` bridges sync client events into `MainScreen` through callback options.
- `src/screens/MainScreen.tsx` owns `textVoiceLog`, `handleReplayTextVoice(...)`, and incoming text voice event handling.
- `src/components/TextVoicePanel.tsx` renders the author, message text, local replay marker, and Replay button.
- `src/styles/global.css` owns the Text Voice row styling.

Recommended event shape:

```ts
export interface TextVoiceReplayEvent {
  id: string;
  textVoiceEventId: string;
  replayerId: string;
  replayerName: string;
  createdAt: string;
}
```

Implementation steps:

1. In `src/types/session.ts`, add:

   ```ts
   export interface TextVoiceReplayEvent {
     id: string;
     textVoiceEventId: string;
     replayerId: string;
     replayerName: string;
     createdAt: string;
   }
   ```

2. In `src/lib/sync/types.ts`, extend `SyncClient`:

   ```ts
   sendTextVoiceReplay: (textVoiceEventId: string) => void;
   subscribeTextVoiceReplay: (listener: (event: TextVoiceReplayEvent) => void) => () => void;
   ```

   Import `TextVoiceReplayEvent` beside `TextVoiceEvent`.

3. In `src/lib/sync/wsSyncClient.ts`:

   - add a `textVoiceReplayListeners` set
   - add `sendTextVoiceReplay(textVoiceEventId)` that sends:

     ```ts
     {
       type: "text_voice_replay",
       sessionId: this.sessionId,
       textVoiceEventId,
       localProfile: this.localProfile
     }
     ```

   - block disconnected sends the same way `sendTextVoice(...)` does
   - extend `ServerMessage` with `{ type: "text_voice_replay"; event: TextVoiceReplayEvent; serverNow: number }`
   - emit incoming replay events to subscribers
   - do not speak audio or mutate snapshots on receipt

4. In `src/lib/sync/mockSyncClient.ts`:

   - add `textVoiceReplayListeners`
   - implement `sendTextVoiceReplay(textVoiceEventId)` by creating a local `TextVoiceReplayEvent`
   - implement `subscribeTextVoiceReplay(...)`
   - keep this local-only in mock mode

5. In `server/sync-server.ts`:

   - import `TextVoiceReplayEvent`
   - extend `ClientMessage` with `{ type: "text_voice_replay"; sessionId: string; textVoiceEventId: string; localProfile: LocalProfile }`
   - extend `ServerMessage` with `{ type: "text_voice_replay"; event: TextVoiceReplayEvent; serverNow: number }`
   - add a helper to validate `textVoiceEventId`:
     - trim
     - reject empty
     - reject over 120 characters
   - optionally add a small replay cooldown per socket, roughly `500ms`, to prevent rapid spam
   - create a `TextVoiceReplayEvent` from the assigned/current socket profile and broadcast it to all sockets in the same room
   - do not verify the referenced `textVoiceEventId` against server history; text voice rows are intentionally ephemeral
   - do not call `reduceSessionEvent(...)`
   - do not add replay attribution to `SessionSnapshot`

6. In `src/hooks/useDabSyncSession.ts`:

   - accept a new callback option, `onTextVoiceReplayEvent?: (event: TextVoiceReplayEvent) => void`
   - expose `sendTextVoiceReplay(textVoiceEventId)` from the hook result
   - subscribe/unsubscribe to `syncClient.subscribeTextVoiceReplay(...)` near the existing text voice subscription

7. In `src/components/TextVoicePanel.tsx`:

   - update `TextVoiceLogEntry` to include replay attribution rows:

     ```ts
     replayAttributions: TextVoiceReplayEvent[];
     ```

   - keep `replayCount` if useful for the local count, or derive display from attribution rows
   - add enough local profile context to render `You` for the current user's replays, either by passing `localProfileId` or preformatted labels from `MainScreen`
   - render attribution separately from the original author, such as:
     - `Replayed by You`
     - `Replayed by Action Lonson`
     - `Replayed by You + 2`
   - keep the existing `{senderName} said` author label

8. In `src/screens/MainScreen.tsx`:

   - destructure `sendTextVoiceReplay` from `useDabSyncSession`
   - add `handleTextVoiceReplayEvent(event)` before the hook call, similar to `handleTextVoiceEvent(...)`
   - on incoming replay attribution, update the matching `textVoiceLog` row by `event.textVoiceEventId`
   - if the original row is not present locally, ignore the attribution; new joiners should not reconstruct old rows
   - dedupe replay attribution rows by replay event `id`
   - update `handleReplayTextVoice(id)` so it:
     - speaks the row locally immediately
     - sends `sendTextVoiceReplay(id)` after local speech is attempted
     - does not increment local replay state directly unless needed for instant optimistic UI
   - avoid speaking audio when receiving a remote replay attribution
   - log replay attribution to the debug console with a label like `command:say:replay:received`

9. In `src/styles/global.css`:

   - add a compact replay attribution style, for example `.text-voice-replay-attribution`
   - keep it visually secondary to the original author and message text

10. Update this doc after implementation:

    - mark TV-2.2 `[x]`
    - add a completed implementation section
    - leave TV-3 as the next optional user-facing entry point

11. Update `changelog.md` and run `npm.cmd run build`.

### Completed Implementation

- Added shared `TextVoiceReplayEvent` typing.
- Added `sendTextVoiceReplay(...)` and `subscribeTextVoiceReplay(...)` to the sync client contract.
- Added WebSocket and mock-client support for ephemeral `text_voice_replay` events.
- Added server-side `text_voice_replay` handling with replay id validation, per-socket cooldown, and room broadcast.
- Added hook wiring through `onTextVoiceReplayEvent`.
- Updated the Text Voice panel log entries to store replay attributions.
- Updated Replay so it still speaks only on the clicking client, then sends attribution to the room.
- Rendered local replay counts as `You replayed Nx` and remote replay attribution as `Also replayed by Name`.
- Build passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- Clicking Replay still speaks locally for the clicking user.
- Connected clients receive replay attribution for that row.
- The text voice log can show which user replayed a line.
- Replay attribution does not cause other clients to speak the line again.
- New joiners do not receive old replay attributions.
- Existing `text_voice` send/receive behavior still works.
- `npm.cmd run build` passes.

### Non-Goals

- Persisting replay history across reloads.
- Replaying audio on every client when one user clicks Replay.
- Turning the panel into a durable chat transcript.

## [x] TV-2.3 - Add Local Browser Voice Picker

### Summary

Let each user choose which browser-provided text-to-speech voice they hear locally.

This phase should stay fully client-side. It should not add server-generated audio, API keys, cloud TTS, or shared voice synchronization. Because browser voices are device-dependent, each user may see and hear a different list of voices.

### Implementation Spec

Status: Completed on 2026-04-30.

Code seams:

- `src/screens/MainScreen.tsx` owns `speakDebugConsoleLine(...)`, which currently creates `SpeechSynthesisUtterance` with default voice, rate, pitch, and volume.
- `src/components/TextVoicePanel.tsx` is the first UI surface for a compact local voice selector.
- Local preferences should use `localStorage`, similar to other local-only UI preferences.
- `TextVoicePanel` is rendered twice from `MainScreen.tsx`, once docked and once floating; both call sites need the same voice props.
- Existing TTS calls flow through `handleTextVoiceEvent(...)` and `handleReplayTextVoice(...)`, so changing the shared helper changes both received lines and local replays.

Implementation steps:

1. Add local constants/types near the other Text Voice constants in `src/screens/MainScreen.tsx`:

   ```ts
   const TEXT_VOICE_SELECTED_VOICE_URI_STORAGE_KEY = "sync_sesh_text_voice_selected_voice_uri";

   interface TextVoiceBrowserVoice {
     name: string;
     lang: string;
     voiceURI: string;
     default: boolean;
   }
   ```

   Use `voiceURI` as the stable selection key because browser `SpeechSynthesisVoice` objects are not serializable.

2. Add a helper in `MainScreen.tsx` to normalize voices:

   ```ts
   function getTextVoiceBrowserVoices(): TextVoiceBrowserVoice[] {
     if (typeof window === "undefined" || !("speechSynthesis" in window)) {
       return [];
     }

     return window.speechSynthesis.getVoices().map((voice) => ({
       name: voice.name,
       lang: voice.lang,
       voiceURI: voice.voiceURI,
       default: voice.default,
     }));
   }
   ```

   Deduplicate by `voiceURI` if needed.

3. Add local state in `MainScreen.tsx`:

   ```ts
   const [availableTextVoiceVoices, setAvailableTextVoiceVoices] = useState<TextVoiceBrowserVoice[]>([]);
   const [selectedTextVoiceURI, setSelectedTextVoiceURI] = useState(() => {
     if (typeof window === "undefined") {
       return "";
     }

     return window.localStorage.getItem(TEXT_VOICE_SELECTED_VOICE_URI_STORAGE_KEY) ?? "";
   });
   ```

4. Add a `useEffect` in `MainScreen.tsx` that loads voices:

   - call `setAvailableTextVoiceVoices(getTextVoiceBrowserVoices())` on mount
   - listen for `voiceschanged`
   - remove the listener on cleanup
   - handle browsers that expose `speechSynthesis.onvoiceschanged` instead of `addEventListener` if TypeScript complains

5. Add a selected voice lookup in `MainScreen.tsx`:

   ```ts
   const selectedTextVoice = useMemo(() => (
     availableTextVoiceVoices.find((voice) => voice.voiceURI === selectedTextVoiceURI)
   ), [availableTextVoiceVoices, selectedTextVoiceURI]);
   ```

   Note: the speech helper ultimately needs the real `SpeechSynthesisVoice`, not only the normalized object. Either:

   - look up the real voice from `window.speechSynthesis.getVoices()` inside the helper using `voiceURI`, or
   - store both normalized UI voices and a ref/map of actual `SpeechSynthesisVoice` objects.

   Prefer looking up the real voice inside the helper for a smaller patch.

6. Replace `speakDebugConsoleLine(text)` with a configurable helper:

   ```ts
   function speakDebugConsoleLine(text: string, options?: { voiceURI?: string }) {
     ...
     const utterance = new SpeechSynthesisUtterance(text);
     const selectedVoice = options?.voiceURI
       ? window.speechSynthesis.getVoices().find((voice) => voice.voiceURI === options.voiceURI)
       : undefined;

     if (selectedVoice) {
       utterance.voice = selectedVoice;
     }
     ...
   }
   ```

   Keep rate, pitch, and volume at `1` for this phase.

7. Update both call sites in `MainScreen.tsx`:

   - `handleTextVoiceEvent(...)`
   - `handleReplayTextVoice(...)`

   Pass `{ voiceURI: selectedTextVoiceURI }`.

8. Add a handler in `MainScreen.tsx`:

   ```ts
   const handleTextVoiceVoiceChange = useCallback((voiceURI: string) => {
     setSelectedTextVoiceURI(voiceURI);

     try {
       if (voiceURI) {
         window.localStorage.setItem(TEXT_VOICE_SELECTED_VOICE_URI_STORAGE_KEY, voiceURI);
       } else {
         window.localStorage.removeItem(TEXT_VOICE_SELECTED_VOICE_URI_STORAGE_KEY);
       }
     } catch {
       // Local preference persistence is best-effort.
     }
   }, []);
   ```

9. Update `TextVoicePanelProps` in `src/components/TextVoicePanel.tsx`:

   ```ts
   browserVoices: Array<{
     name: string;
     lang: string;
     voiceURI: string;
     default: boolean;
   }>;
   selectedVoiceURI: string;
   onVoiceChange: (voiceURI: string) => void;
   ```

10. Add a compact selector to `TextVoicePanel.tsx` near the composer note or directly under the input:

    - label: `Voice`
    - first option: `Browser default`
    - each browser voice option: `${voice.name} (${voice.lang})`
    - append `default` to the label for the browser default voice if useful
    - if no voices are available, disable the select and show only `Browser default`

    Suggested class names:

    - `.text-voice-controls`
    - `.text-voice-control`
    - `.text-voice-select`

11. Pass the new props at both `TextVoicePanel` render sites in `MainScreen.tsx`.

12. Add styles in `src/styles/global.css`:

    - keep the selector compact
    - match the Text Voice input styling
    - avoid widening the panel
    - make long voice names truncate cleanly

13. Update this doc after implementation:

    - mark TV-2.3 `[x]`
    - add a completed implementation section
    - leave TV-2.4 as the next style-preset phase

14. Update `changelog.md` and run `npm.cmd run build`.

### Completed Implementation

- Added browser voice discovery through `speechSynthesis.getVoices()` and `voiceschanged`.
- Added local `voiceURI` selection state with best-effort `localStorage` persistence.
- Updated Text Voice playback to look up the selected live `SpeechSynthesisVoice` at speak time.
- Added a compact `Voice` selector to the Text Voice panel with `Browser default` fallback.
- Passed voice picker props through both docked and floating Text Voice panel render paths.
- Kept voice selection local-only with no sync/server payload changes.
- Build passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- The Text Voice panel exposes a local browser voice selector.
- Selecting a voice changes future local TTS playback on that client.
- The selected voice persists across reloads on the same browser.
- If a selected voice is missing on a future load, playback falls back to browser default.
- No sync/server payloads change.
- `npm.cmd run build` passes.

### Non-Goals

- Shared voice selection for the whole room.
- Cloud/server TTS.
- Custom AI voice models.
- Voice cloning.

## [x] TV-2.4 - Add Local Browser Voice Style Presets

### Summary

Add simple local voice style presets using browser TTS controls.

This phase should make the feature more playful without adding cloud TTS. Styles should be implemented through `SpeechSynthesisUtterance` settings like `rate`, `pitch`, and `volume`, plus small text-prep transforms only if needed.

### Implementation Spec

Status: Completed on 2026-05-01.

Code seams:

- `src/screens/MainScreen.tsx` already owns `speakDebugConsoleLine(text, { voiceURI })`; this phase should extend that options object with a style preset id.
- `src/screens/MainScreen.tsx` already persists `TEXT_VOICE_SELECTED_VOICE_URI_STORAGE_KEY`; add a parallel local storage key for style.
- `src/components/TextVoicePanel.tsx` already renders a compact `Voice` selector in `.text-voice-controls`; add the `Style` selector beside or below it using the same visual pattern.
- `src/styles/global.css` already has `.text-voice-controls`, `.text-voice-control`, and `.text-voice-select`.
- This phase must not change `TextVoiceEvent`, `TextVoiceReplayEvent`, `SyncClient`, WebSocket messages, or server code.

Recommended presets:

- `Normal`: rate `1`, pitch `1`, volume `1`
- `Fast`: higher rate, normal pitch
- `Tiny`: higher pitch, slightly faster rate
- `Deep`: lower pitch, slightly slower rate
- `Announcer`: slightly slower, strong/default volume
- `Robot`: flatter feel using lower pitch plus punctuation/text transform if useful

Implementation steps:

1. Add a local storage key near the other Text Voice constants in `src/screens/MainScreen.tsx`:

   ```ts
   const TEXT_VOICE_SELECTED_STYLE_STORAGE_KEY = "sync_sesh_text_voice_selected_style";
   ```

2. Add a local `TextVoiceStylePreset` type near the TTS helper:

   ```ts
   type TextVoiceStylePreset = "normal" | "fast" | "tiny" | "deep" | "announcer" | "robot";
   ```

3. Add a preset config map near the TTS helper:

   ```ts
   const TEXT_VOICE_STYLE_PRESETS: Record<TextVoiceStylePreset, {
     label: string;
     rate: number;
     pitch: number;
     volume: number;
     transformText?: (text: string) => string;
   }> = {
     normal: { label: "Normal", rate: 1, pitch: 1, volume: 1 },
     fast: { label: "Fast", rate: 1.35, pitch: 1, volume: 1 },
     tiny: { label: "Tiny", rate: 1.15, pitch: 1.55, volume: 1 },
     deep: { label: "Deep", rate: 0.9, pitch: 0.65, volume: 1 },
     announcer: { label: "Announcer", rate: 0.92, pitch: 0.95, volume: 1 },
     robot: {
       label: "Robot",
       rate: 0.95,
       pitch: 0.8,
       volume: 1,
       transformText: (text) => text.replace(/[.!?]+/g, "."),
     },
   };
   ```

   Keep transforms conservative. If the text transform feels risky, skip it and rely on rate/pitch only.

4. Add helpers in `MainScreen.tsx`:

   ```ts
   function isTextVoiceStylePreset(value: string): value is TextVoiceStylePreset {
     return value in TEXT_VOICE_STYLE_PRESETS;
   }
   ```

5. Add local state in `MainScreen.tsx`:

   ```ts
   const [selectedTextVoiceStyle, setSelectedTextVoiceStyle] = useState<TextVoiceStylePreset>(() => {
     if (typeof window === "undefined") {
       return "normal";
     }

     try {
       const savedStyle = window.localStorage.getItem(TEXT_VOICE_SELECTED_STYLE_STORAGE_KEY);
       return savedStyle && isTextVoiceStylePreset(savedStyle) ? savedStyle : "normal";
     } catch {
       return "normal";
     }
   });
   ```

6. Update `speakDebugConsoleLine(...)` in `MainScreen.tsx`:

   ```ts
   function speakDebugConsoleLine(
     text: string,
     options?: {
       voiceURI?: string;
       style?: TextVoiceStylePreset;
     },
   ) {
     ...
     const style = TEXT_VOICE_STYLE_PRESETS[options?.style ?? "normal"];
     const spokenText = style.transformText ? style.transformText(text) : text;
     const utterance = new SpeechSynthesisUtterance(spokenText);
     ...
     utterance.rate = style.rate;
     utterance.pitch = style.pitch;
     utterance.volume = style.volume;
     ...
   }
   ```

   Keep the debug detail as the original text, not transformed text, unless debugging the transform becomes necessary.

7. Update both TTS call sites in `MainScreen.tsx`:

   - `handleTextVoiceEvent(...)`
   - `handleReplayTextVoice(...)`

   Pass `{ voiceURI: selectedTextVoiceURI, style: selectedTextVoiceStyle }`.

8. Add a handler in `MainScreen.tsx`:

   ```ts
   const handleTextVoiceStyleChange = useCallback((style: TextVoiceStylePreset) => {
     setSelectedTextVoiceStyle(style);

     try {
       window.localStorage.setItem(TEXT_VOICE_SELECTED_STYLE_STORAGE_KEY, style);
     } catch {
       // Local preference persistence is best-effort.
     }
   }, []);
   ```

9. Update `TextVoicePanelProps` in `src/components/TextVoicePanel.tsx`:

   ```ts
   voiceStyleOptions: Array<{ id: string; label: string }>;
   selectedVoiceStyle: string;
   onVoiceStyleChange: (style: string) => void;
   ```

   Keep `TextVoicePanel` generic and avoid importing the `TextVoiceStylePreset` type from `MainScreen.tsx`.

10. Add a compact `Style` selector to `TextVoicePanel.tsx` inside `.text-voice-controls`:

    - render next to the `Voice` selector when width allows
    - render below it on narrow widths using CSS grid
    - use the same `.text-voice-control` and `.text-voice-select` classes

11. Pass style props at both `TextVoicePanel` render sites in `MainScreen.tsx`:

    ```ts
    voiceStyleOptions={Object.entries(TEXT_VOICE_STYLE_PRESETS).map(([id, preset]) => ({ id, label: preset.label }))}
    selectedVoiceStyle={selectedTextVoiceStyle}
    onVoiceStyleChange={(style) => {
      if (isTextVoiceStylePreset(style)) {
        handleTextVoiceStyleChange(style);
      }
    }}
    ```

    Prefer memoizing `voiceStyleOptions` with `useMemo` to avoid rebuilding the array every render.

12. Update `src/styles/global.css`:

    - make `.text-voice-controls` a responsive grid:

      ```css
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      ```

    - keep both selectors from making the panel wider
    - preserve current styling for `.text-voice-control` and `.text-voice-select`

13. Update this doc after implementation:

    - mark TV-2.4 `[x]`
    - add a completed implementation section
    - leave TV-3 as the next optional visible entry point phase

14. Update `changelog.md` and run `npm.cmd run build`.

### Completed Implementation

- Added local Text Voice style presets: Normal, Fast, Tiny, Deep, Announcer, and Robot.
- Added best-effort local storage persistence for the selected style.
- Extended Text Voice playback options so selected browser voice and selected style work together.
- Applied preset rate, pitch, volume, and the conservative Robot punctuation transform during local speech only.
- Added a compact `Style` selector next to the existing `Voice` selector in the Text Voice panel.
- Kept style selection local-only with no sync/server payload changes.
- Build passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- The Text Voice panel exposes local style presets.
- Selecting a style changes future local TTS playback on that client.
- Style choice persists across reloads on the same browser.
- Voice picker and style preset can be used together.
- Other users are not affected by the local style choice.
- No sync/server payloads change.
- `npm.cmd run build` passes.

### Non-Goals

- Server-generated audio.
- Cloud TTS voice models.
- Per-message synced style selection.
- Guaranteed identical playback across all clients.

## [x] TV-2.5 - Add Expandable Custom Voice Style Sliders

### Summary

Add a small triangle button next to the `Style` label in the Text Voice panel.

Clicking the triangle expands a compact advanced style area with three sliders:

- `Rate`
- `Pitch`
- `Volume`

When the user changes any slider, the style selector should switch to `Custom`. Custom settings should affect future local TTS playback and persist in the same browser.

### Implementation Spec

Status: Completed on 2026-05-01.

Code seams:

- `src/components/TextVoicePanel.tsx` currently renders the `Style` selector in `.text-voice-controls`.
- `src/screens/MainScreen.tsx` owns `TextVoiceStylePreset`, selected style state, persistence, and TTS playback options.
- `src/styles/global.css` owns the Text Voice panel control styling.
- This phase must not change `TextVoiceEvent`, `TextVoiceReplayEvent`, sync clients, WebSocket messages, or server code.

Recommended slider ranges:

- `Rate`: `0.5` to `2`, step `0.05`, default `1`
- `Pitch`: `0` to `2`, step `0.05`, default `1`
- `Volume`: `0` to `1`, step `0.05`, default `1`

These ranges are intentionally narrower than some browser limits so the control stays useful instead of chaotic.

Implementation steps:

1. In `src/screens/MainScreen.tsx`, add local storage keys near the existing Text Voice keys:

   ```ts
   const TEXT_VOICE_CUSTOM_STYLE_STORAGE_KEY = "sync_sesh_text_voice_custom_style";
   const TEXT_VOICE_STYLE_PANEL_EXPANDED_STORAGE_KEY = "sync_sesh_text_voice_style_panel_expanded";
   ```

2. Add a shared local type:

   ```ts
   interface TextVoiceStyleSettings {
     rate: number;
     pitch: number;
     volume: number;
   }
   ```

3. Extend `TextVoiceStylePreset` to include `custom`:

   ```ts
   type TextVoiceStylePreset = "normal" | "fast" | "tiny" | "deep" | "announcer" | "robot" | "custom";
   ```

4. Keep built-in preset config separate from dynamic custom values. Recommended shape:

   ```ts
   type BuiltInTextVoiceStylePreset = Exclude<TextVoiceStylePreset, "custom">;
   ```

   Then use `Record<BuiltInTextVoiceStylePreset, ...>` for `TEXT_VOICE_STYLE_PRESETS`.

5. Add `Custom` to the style options passed into `TextVoicePanel`.

   Keep `Custom` as a selectable style even before the sliders are opened.

6. Add helpers in `MainScreen.tsx`:

   - `isTextVoiceStylePreset(value)`
   - `sanitizeTextVoiceStyleSettings(value)`
   - `getTextVoiceStyleConfig(style, customStyleSettings)`

   `getTextVoiceStyleConfig(...)` should return the selected built-in preset or the persisted custom settings.

7. Add state in `MainScreen.tsx`:

   - `customTextVoiceStyle`
   - `isTextVoiceStyleControlsExpanded`

   Both should hydrate from local storage with safe fallbacks.

8. Add handlers in `MainScreen.tsx`:

   - `handleTextVoiceStylePanelToggle()`
   - `handleTextVoiceCustomStyleChange(key, value)`

   Changing any slider must:

   - clamp/sanitize the value
   - update and persist custom settings
   - set selected style to `custom`
   - persist selected style as `custom`

9. Update `speakDebugConsoleLine(...)` so playback options include:

   ```ts
   {
     voiceURI?: string;
     style?: TextVoiceStylePreset;
     customStyle?: TextVoiceStyleSettings;
   }
   ```

   Use `getTextVoiceStyleConfig(...)` before creating the utterance. Custom style should not use the Robot text transform.

10. Update both TTS call sites in `MainScreen.tsx`:

    - `handleTextVoiceEvent(...)`
    - `handleReplayTextVoice(...)`

    Pass the selected style and custom style settings.

11. Update `TextVoicePanelProps` in `src/components/TextVoicePanel.tsx`:

    ```ts
    customVoiceStyle: TextVoiceStyleSettings;
    isVoiceStyleControlsExpanded: boolean;
    onToggleVoiceStyleControls: () => void;
    onCustomVoiceStyleChange: (key: keyof TextVoiceStyleSettings, value: number) => void;
    ```

    Keep the component generic by defining/exporting `TextVoiceStyleSettings` in `TextVoicePanel.tsx` or by using an equivalent local prop type.

12. Update the `Style` label area in `TextVoicePanel.tsx`:

    - keep the visible text `Style`
    - add a small icon button beside it
    - use `aria-expanded`
    - use `aria-label` such as `Show custom voice style controls`
    - render the triangle with CSS borders so it rotates open without relying on a text glyph

13. When expanded, render the three sliders below the style selector:

    - each slider should show a compact numeric value
    - each slider should use the recommended min, max, and step
    - sliders must not widen the panel
    - moving a slider immediately sets the style selector to `Custom`

14. Update `src/styles/global.css`:

    - add styling for the style label row, triangle button, expanded slider stack, range inputs, and values
    - preserve the current compact panel look
    - keep controls usable on narrow widths

15. After implementation:

    - mark TV-2.5 `[x]`
    - add a completed implementation section
    - update `changelog.md`
    - run `npm.cmd run build`

### Completed Implementation

- Added a CSS triangle toggle beside the Text Voice `Style` label.
- Added an expandable custom style control area with `Rate`, `Pitch`, and `Volume` sliders.
- Added local custom style state with sanitized values and best-effort `localStorage` persistence.
- Added a `Custom` style option and automatically select it when any slider changes.
- Updated Text Voice playback so received lines and local replays use the selected built-in style or custom slider values.
- Kept custom style local-only with no sync/server payload changes.
- Build passed with the existing Vite large-chunk warning.

### Acceptance Criteria

- A small triangle button appears next to the `Style` text.
- Clicking the triangle expands and collapses custom style sliders.
- Expanded controls show `Rate`, `Pitch`, and `Volume`.
- Moving any slider switches the selected style to `Custom`.
- Custom slider values affect future local speech playback.
- Custom slider values persist across reloads in the same browser.
- Built-in style presets still work.
- Browser voice selection still works together with custom style.
- No sync/server payloads change.
- `npm.cmd run build` passes.

### Non-Goals

- Syncing custom style settings to other users.
- Adding more than three sliders.
- Cloud TTS voices or voice cloning.
- A mute button or larger settings UI.

## [ ] TV-3 - Optional Lobby Shortcut Or Header Entry Point

### Summary

Connect the lobby UI path to the same ephemeral text voice wire message.

### Implementation Spec

Pending.

### Acceptance Criteria

- Sending a valid text voice event from the lobby UI broadcasts it to all clients in the room.
- New joiners do not replay old text voice events.
- Existing snapshot/session events keep working unchanged.

## [ ] TV-4 - Add Mute And Queue Controls

### Summary

Add local controls so users can manage incoming text voice playback.

### Implementation Spec

Pending.

### Acceptance Criteria

- Incoming events speak locally when TTS is enabled.
- Users can mute incoming TTS.
- The queue is bounded so spam cannot create a long backlog.
- The sender's own message can either speak locally immediately or be handled through the echoed server event, but it should not double-speak.

## [ ] TV-5 - Add Server-Side Validation, Cooldown, And Manual Discord Checks

### Summary

Harden the feature enough for shared lobbies.

### Implementation Spec

Pending.

### Acceptance Criteria

- The server rejects empty or over-length text voice events.
- The server rate-limits per socket/user.
- Manual checks cover direct browser, Discord desktop Activity, and Discord mobile Activity if available.
- Build passes.

## [ ] TV-6 - Optional Voice Settings And Polish

### Summary

Add user-facing voice preferences after the core flow works.

### Implementation Spec

Pending.

### Acceptance Criteria

- Users can pick a local voice when multiple voices are available.
- Users can adjust local TTS volume/rate if the UX still feels clean.
- Preferences persist locally only.
