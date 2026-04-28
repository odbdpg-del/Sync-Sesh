# Secret 3D World Vision 7 - Recording Room Guitar

## Purpose

Vision 7 adds a simple physical guitar to the Recording Studio so friends can understand an instrument without learning the full patch-cable room first.

The guitar should be immediate:

- see the guitar in the room.
- click it to pick it up.
- walk around while carrying it.
- click to strum a note.
- press number row or numpad `1-9` to play different notes.
- click the guitar stand again to drop it.

This is intentionally simpler than the piano, looper, and patch graph. The first pass should prove that handheld instruments feel good before adding deeper recording or routing behavior.

## North Star

The guitar should feel like a toy everyone understands in five seconds.

Target feeling:

- a friend walks into the Recording Studio.
- the guitar is visibly available.
- the reticle says it can be picked up.
- once picked up, the guitar appears in first person.
- clicking makes sound if that user enabled ENGINE.
- number keys make different notes without needing to aim at tiny keys.
- no one has to understand patch cables to test it.

## Product Boundary

In scope:

- local in-room guitar pickup/drop state.
- first-person carried guitar visual.
- simple click strum behavior.
- `1-9` and numpad `1-9` note input.
- existing local Web Audio engine output.
- short in-room labels that explain pickup and note keys.

Out of scope:

- shared guitar ownership state.
- guitar animations synced to other players.
- raw microphone/audio streaming.
- guitar recording into clips.
- patch-cable routing for guitar.
- new sound engine libraries.
- normal 2D dashboard UI changes.

## Manager Read

Friends are struggling with the Recording Studio because too many controls require DAW knowledge. A handheld guitar gives the room a clear success path: press ENGINE, pick up guitar, click or press a number, hear sound.

This vision should not replace the V6 cleanup. It is a small playable instrument layer that can make friend testing feel less broken while the larger routing work continues.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## Guitar Phases

- [x] V7-1: Simple Handheld Guitar.
- [x] V7-2: Guitar Room Feedback.
- [x] V7-3: Shared Guitar Ownership.
- [x] V7-4: Guitar Recording And Routing.
- [x] V7-5: Guitar Note Banks.

## Guitar Wishlist

- [x] Guitar note banks: while holding the guitar, `Q` should shift the active `1-9` note bank down by 9 notes and `E` should shift it up by 9 notes. Number row and numpad `1-9` should then play the selected note inside the active bank. The room and first-person feedback should show the active bank/range so friends understand why the same number key changed pitch.

## V7-1: Simple Handheld Guitar

Status: `[x]` completed and manager-verified.

### Goal

Add the full simple guitar request as one small playable pass: pick up the guitar, carry it while walking, click to strum, and use `1-9` or numpad `1-9` for notes.

### Implementation Spec

Approved manager scope:

- Add one visible in-world guitar on a stand in the Recording Studio.
- Register the guitar/stand as a clickable 3D interactable.
- Keep guitar ownership local to the current browser session.
- Clicking the in-world guitar toggles pick up/drop.
- While held in first person, render a simple guitar model attached to the camera/body view.
- While held, left-click strums the current guitar note when the click is not already activating another clickable object.
- While held, number row `1-9` and numpad `1-9` select and play guitar notes.
- Use the existing local Web Audio engine and FM synth note path with a short plucked patch.
- Broadcast guitar notes through the existing shared live sound path as `fm-synth` events so friends with ENGINE enabled in the room can hear them.
- Keep ENGINE off by default; if audio is off, note presses should update local state/visual feedback but browser audio should stay silent.
- Add compact in-world text on/near the stand explaining `PICK UP`, `CLICK STRUM`, and `1-9 NOTES`.

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision7-recording-room-guitar.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawState.ts`
- `src/lib/lobby/sessionState.ts`
- `src/types/session.ts`
- package files
- normal 2D dashboard screens

Existing helpers to reuse:

- `useRegisterInteractable` for the guitar stand.
- `useInteractionRegistry().subscribeToShot` for click-strum when the held guitar receives an empty click/shot event.
- `localDawAudioActions.playFmSynthNote` for local sound.
- `onBroadcastDawLiveSound` with existing `fm-synth` payloads for friend playback.
- `createStudioTransportControlCanvas` for readable in-room labels.
- `FirstPersonBody` camera attachment pattern for the held guitar visual.

Acceptance criteria:

- The guitar appears in the Recording Studio and is readable as a guitar/stand.
- Clicking the guitar picks it up; clicking it again drops it.
- While held in first person, the guitar appears in the player's view and moves with them.
- While held, left-click plays the current guitar note when not clicking another interactable.
- While held, `1-9` and numpad `1-9` play nine different guitar notes.
- Existing Recording Studio controls still work.
- Existing louder-audio changes remain intact.
- Build passes.

Build and manual checks:

- Run `npm.cmd run build`.
- Manually verify the hidden room opens with `syncsesh`.
- Press ENGINE, pick up guitar, walk, click-strum, and press number row/numpad notes.
- Verify the guitar does not play before pickup.
- Verify existing piano/drum controls still respond.
- Verify friends only hear broadcast guitar notes if their own ENGINE is enabled.

Risks:

- Pointer-lock click handling may conflict with aimed clickable objects; preserve clickable priority.
- Top-down/free-cam view should not show the first-person held guitar.
- The guitar sound is an FM pluck, not a sampled guitar.

Wishlist mapping:

- "make a guitar" -> visible guitar object and guitar-shaped first-person prop.
- "if some1 picks up the guitar they can walk around with it" -> local held state plus camera-attached prop.
- "when they click it plays a note" -> held click strum.
- "numbers 1-9 different notes on the keyboard & numpad" -> digit and numpad key note input.

Non-goals:

- No shared pickup locking.
- No inventory system.
- No patch routing.
- No clip recording.
- No new multiplayer events beyond existing live sound broadcast.

### Checklist Items Achieved

- [x] Added visible guitar and stand.
- [x] Added local pickup/drop.
- [x] Added first-person held visual.
- [x] Added click strum.
- [x] Added number row/numpad notes.
- [x] Reused existing audio/broadcast paths.
- [x] Build passed.

### Completed Implementation

The Recording Studio now has a visible guitar stand near the instrument area. Clicking the guitar picks it up locally; clicking the stand while holding it drops it back.

When held in active first-person control, a simple guitar appears in the player's view. Empty left-click strums the selected note, while number row `1-9` and numpad `1-9` select and play nine guitar notes through the existing FM synth pluck path.

Guitar notes also use the existing shared live sound `fm-synth` path so friends in the Recording Studio can hear them when their own browser ENGINE is enabled.

### Build And Manual Checks

- [x] `npm.cmd run build` passed.
- [x] Build still reports the existing Vite large chunk warning.
- [ ] Manual hidden-room guitar pickup and strum pass.
- [ ] Manual friend/Discord pass.

## V7-2: Guitar Room Feedback

Status: `[x]` completed and manager-verified.

### Goal

Make it obvious from inside the room whether the guitar is held, what note is selected, and why it may be silent.

### Implementation Spec

Approved manager scope:

- Keep V7-2 UI/state-local only.
- Track the latest local guitar strum or number-key note attempt in `ThreeDModeShell`.
- Show selected note and held state on the guitar stand.
- Show a compact `1-9` note strip near the stand with the selected number highlighted.
- Show selected note and silent reason on the first-person held guitar.
- Derive guitar audio readiness only from local audio engine state:
  - `ENGINE OFF`.
  - `MUTED`.
  - `VOLUME 0`.
  - `ENGINE READY`.
- Keep all guitar feedback language free of patch/routing requirements.

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision7-recording-room-guitar.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawAudioEngine.ts`
- `src/3d/useLocalDawState.ts`
- `src/lib/lobby/sessionState.ts`
- `src/types/session.ts`
- normal 2D dashboard screens

Acceptance criteria:

- Guitar stand shows available/held state.
- Guitar stand and first-person guitar show the selected note.
- Number row and numpad `1-9` update visible note feedback immediately.
- Click strum produces visible feedback even if the audio engine is off, muted, or volume zero.
- Silent feedback explains the local reason without patch language.
- No shared ownership, recording, routing, or session schema changes are added.
- Build passes.

### Checklist Items Achieved

- [x] Added held/available stand feedback.
- [x] Added selected-note stand feedback.
- [x] Added `1-9` note strip.
- [x] Added first-person note/silent feedback.
- [x] Kept feedback local-only.
- [x] Build passed.

### Completed Implementation

The guitar stand now shows available or held state, the selected note, the selected `1-9` key, and a compact local audio readiness badge. The stand also includes a small `1-9` note strip with the selected slot highlighted.

The first-person held guitar now shows the selected note and the local silent reason, using only local audio engine state. Silent reasons are limited to `ENGINE OFF`, `MUTED`, and `VOLUME 0`; ready audio shows `ENGINE READY`.

### Build And Manual Checks

- [x] `npm.cmd run build` passed.
- [x] Build still reports the existing Vite large chunk warning.
- [ ] Manual hidden-room feedback pass.

## V7-3: Shared Guitar Ownership

Status: `[x]` completed and manager-verified.

### Goal

Design shared ownership only after the local guitar feels good.

### Implementation Spec

Approved manager scope:

- Add reducer-owned shared guitar ownership state with one holder at a time.
- Add pickup/drop session events.
- Normalize older snapshots with a default released guitar state.
- Pickup succeeds only for joined non-spectator users who are fresh in the Recording Studio.
- Pickup is blocked while another user holds the guitar.
- Drop succeeds only for the current holder.
- Release the guitar on explicit free-roam presence clear, admin reset, removed holder, and free-roam TTL pruning.
- Thread shared guitar state through the app into the Recording Studio.
- Derive local first-person held guitar from shared holder id, not local-only state.
- Show available, held by you, and held by another user on the guitar stand.
- Do not add recording, routing, patch state, audio-engine changes, or normal 2D UI.

Expected files:

- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- `src/hooks/useDabSyncSession.ts`
- `src/screens/MainScreen.tsx`
- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision7-recording-room-guitar.md`
- `changelog.md`

Acceptance criteria:

- Session snapshot includes shared guitar ownership state.
- Only one user can hold the guitar at a time.
- Available guitar can be picked up.
- Holder can drop it.
- Other users cannot steal it.
- Stand displays the holder name.
- Local first-person guitar and note controls work only for the local holder.
- Exiting 3D or clearing presence releases the guitar.
- Hard disconnect releases after free-roam presence TTL pruning.
- Build passes.

### Checklist Items Achieved

- [x] Added shared guitar ownership state.
- [x] Added pickup/drop events and hook actions.
- [x] Threaded ownership through 3D shell/room.
- [x] Limited held visuals/input to the holder.
- [x] Added holder display and blocked-steal state.
- [x] Added release on exit/presence cleanup.
- [x] Build passed.

### Completed Implementation

The session snapshot now includes `studioGuitar` ownership state with one holder at a time. Pickup/drop events flow through the shared session reducer and the React hook layer into the hidden 3D room.

The Recording Studio guitar stand now reflects shared ownership: available, held by the local player, or held by another user. The local first-person guitar and note controls are derived from the shared holder id, so only the current holder can strum.

The reducer releases the guitar on holder drop, admin reset, holder removal, explicit free-roam presence clear, and free-roam TTL pruning after a hard disconnect.

### Build And Manual Checks

- [x] `npm.cmd run build` passed.
- [x] Build still reports the existing Vite large chunk warning.
- [ ] Manual single-client ownership pass.
- [ ] Manual two-client ownership pass.

## V7-4: Guitar Recording And Routing

Status: `[x]` completed and manager-verified.

### Goal

Consider patch routing and clip recording only after the simple handheld guitar is proven useful in friend testing.

### Implementation Spec

Approved manager scope:

- Keep the current live guitar pickup, drop, click-strum, and `1-9` flow untouched.
- Add one explicit holder-only opt-in recording route near the guitar; default is off.
- Route recorded guitar notes into the existing local DAW clip model using an FM-pluck/guitar-labeled note path.
- Keep live guitar audio direct and immediate even when recording is off.
- Make room and first-person feedback distinguish `LIVE` guitar from `REC`/`LOOPED` guitar notes.
- Reuse the existing clip arm/record/playback model and quantized MIDI note storage.
- Keep shared ownership from V7-3 intact; only the current guitar holder can toggle guitar recording or record guitar notes.
- Keep the `Q`/`E` 9-note bank feature in wishlist for a separate pass.
- Do not add a new audio package, broad DAW rewrite, normal 2D dashboard UI, raw audio streaming, or session-persisted guitar routing.

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/useLocalDawState.ts`
- `docs/3d/3dvision7-recording-room-guitar.md`
- `changelog.md`

Files to avoid:

- `src/3d/useLocalDawAudioEngine.ts` unless playback cannot reuse the existing FM synth voice.
- `src/types/session.ts` and `src/lib/lobby/sessionState.ts` unless the local recording route unexpectedly needs shared state.
- `src/hooks/useSoundCloudPlayer.ts`
- unrelated 2D screens and non-studio 3D scenes.

Existing helpers to reuse:

- `useInteractionRegistry().subscribeToShot` for held guitar click-strum.
- `localDawAudioActions.playFmSynthNote` and existing shared live sound broadcast for live guitar.
- Existing clip recording state, quantized MIDI note events, and clip playback in `useLocalDawState`.
- `createStudioTransportControlCanvas` for compact in-world labels.

Acceptance criteria:

- Guitar remains instantly playable live after pickup with no recording setup.
- A holder-only guitar recording route can be toggled on/off from the room.
- When recording is on, guitar notes are written into the local clip flow with guitar-readable labels/source.
- Recorded guitar notes can play back through the existing transport/clip playback path.
- The guitar stand and first-person guitar clearly show live-only versus recording-on state.
- Existing piano, drums, looper, patch reset, Studio Truth panel, and shared guitar ownership still work.
- Build passes.

Risks:

- The existing DAW recorder is named around piano; generalize it carefully without breaking piano.
- If guitar recording selects or arms a clip silently, users may think live guitar is broken.
- Reusing the FM synth lane may blur guitar identity unless labels and feedback say `GTR`/`REC`.
- Pointer-lock click behavior must keep interactable priority over empty click-strums.

### Checklist Items Achieved

- [x] Added holder-only guitar record route control.
- [x] Generalized local DAW note recording for guitar-labeled notes.
- [x] Recorded guitar notes into the local clip model.
- [x] Preserved direct live guitar playback.
- [x] Added live versus recording feedback.
- [x] Build passed.

### Completed Implementation

The held guitar stays live by default. A holder-only `REC` route control now appears on the guitar stand; when enabled, strums continue to play immediately and also record `GTR` notes into the FM Synth scene 1 clip.

The local DAW recorder now accepts generic DAW note events and a direct clip target, preserving the piano flow while letting the guitar record into a known clip lane. Guitar clip playback uses the same FM pluck patch and labels playback as looped guitar.

The first-person guitar and room stand now distinguish `LIVE` from `REC GTR`, and the stand reports the target clip and recorded guitar note count.

### Build And Manual Checks

- [x] `npm.cmd run build` passed.
- [x] Build still reports the existing Vite large chunk warning.
- [ ] Manual live guitar still works with recording off.
- [ ] Manual guitar recording and clip playback pass.
- [ ] Manual existing piano/drum/looper regression pass.

## V7-5: Guitar Note Banks

Status: `[x]` completed and manager-verified.

### Goal

Let the held guitar reach more than nine notes without making the controls harder: `Q` shifts the active note bank down by 9 notes, `E` shifts it up by 9 notes, and number row/numpad `1-9` play notes inside the active bank.

### Implementation Spec

Approved manager scope:

- Add held-guitar `Q`/`E` note-bank shifting only.
- `Q` shifts the active `1-9` note window down by 9 notes.
- `E` shifts the active `1-9` note window up by 9 notes.
- Number row and numpad `1-9` play the note in the active bank.
- Click-strum uses the currently selected banked note.
- Show the current bank/range in first-person and room feedback.
- Keep shared ownership, pickup/drop, live playback, recording route, and clip playback unchanged.
- Do not add session state, audio engine changes, 2D dashboard changes, or broader DAW changes.

Expected files:

- `src/3d/ThreeDModeShell.tsx`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/Level1RecordingStudioRoom.tsx`
- `docs/3d/3dvision7-recording-room-guitar.md`
- `changelog.md`

Files to avoid:

- `src/types/session.ts`
- `src/lib/lobby/sessionState.ts`
- `src/3d/useLocalDawState.ts`
- `src/3d/useLocalDawAudioEngine.ts`
- unrelated 2D screens.

Acceptance criteria:

- While holding the guitar, `Q` and `E` shift the selected note by exactly 9 note slots and clamp at valid bounds.
- `1-9` and numpad `1-9` use the active bank instead of always using the first nine notes.
- Click-strum uses the selected banked note.
- Room and first-person feedback show the active bank/range immediately.
- Existing shared ownership, recording route, live broadcast, and other studio instruments still work.
- Build passes.

### Checklist Items Achieved

- [x] Added Q/E bank shifting.
- [x] Expanded guitar note pool beyond the first nine notes.
- [x] Updated room/first-person bank feedback.
- [x] Preserved click strum and number/numpad behavior.
- [x] Build passed.

### Completed Implementation

The held guitar now has three nine-note banks. `Q` shifts the selected note down by 9 slots, `E` shifts it up by 9 slots, and both directions clamp at the available note range.

Number row and numpad `1-9` now play notes inside the active bank instead of always targeting the first nine guitar notes. Empty click-strum uses the currently selected banked note, and recording keeps using the same selected note path.

The first-person held guitar and the in-room guitar stand now show compact bank/range feedback such as `B2 C4-G5`, with the selected slot shown as `1-9` inside that bank.

### Build And Manual Checks

- [x] `npm.cmd run build` passed.
- [x] Build still reports the existing Vite large chunk warning.
- [ ] Manual Q/E bank shift pass.
- [ ] Manual live and recorded guitar note pass.
