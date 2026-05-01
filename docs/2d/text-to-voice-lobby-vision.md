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
- [ ] TV-2: Add Lobby Text-To-Voice Input UI.
- [ ] TV-3: Add Ephemeral Sync Wire Message For Text Voice UI Path.
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

## [ ] TV-2 - Add Lobby Text-To-Voice Input UI

### Summary

Add a compact input to the lobby UI so users can type a voice line and submit with `Enter`.

### Implementation Spec

Pending.

### Acceptance Criteria

- The input appears in the lobby without crowding the player cards.
- `Enter` submits a trimmed single-line message.
- Empty messages do not submit.
- The UI shows unsupported/muted/cooldown status without blocking normal lobby controls.

## [ ] TV-3 - Add Ephemeral Sync Wire Message For Text Voice UI Path

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
