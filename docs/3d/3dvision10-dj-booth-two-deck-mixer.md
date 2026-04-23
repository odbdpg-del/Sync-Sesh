# Secret 3D World Vision 10 - DJ Booth Two-Deck SoundCloud Mixer

## Purpose

Vision 10 turns the DJ booth into a usable two-deck SoundCloud mixer.

The app currently has one SoundCloud player in the normal 2D UI and a separate in-world DJ booth that looks like A/B decks but only controls local DAW clip sources. The next useful step is to make the booth match a simple DJ mental model:

- Deck A can play one SoundCloud song.
- Deck B can play another SoundCloud song.
- Each deck can shuffle to a different song.
- A crossfader fades between Deck A and Deck B like a DJ table.
- The 2D UI and 3D booth tell the truth that this is local browser SoundCloud audio, not raw Discord voice streaming.

## North Star

A user should be able to stand at the DJ booth or use the 2D panel and understand it in ten seconds:

- left deck is A.
- right deck is B.
- center fader controls the blend.
- each deck has Play/Pause and Shuffle.
- track names, waveforms, deck volumes, and current mix are visible.
- friends understand they need their own app audio if they want to hear SoundCloud locally.

## Product Boundary

In scope:

- two independent local SoundCloud widget/player instances.
- Deck A and Deck B controls in the normal 2D app.
- shuffle/play/pause/playlist/waveform/volume per deck.
- one crossfader and master volume.
- crossfader volume math applied to the two SoundCloud widgets.
- 3D DJ booth screens and controls that map to the real SoundCloud decks.
- readable in-world layout cleanup for the DJ table.
- local-audio/friend/Discord truth labels.

Out of scope:

- raw Discord voice or app-audio streaming.
- server-side audio mixing.
- synchronized SoundCloud playback between browsers.
- SoundCloud recording into the local DAW.
- beat matching, BPM detection, cue points, loops, or pitch controls.
- new npm audio packages.
- replacing the Recording Studio DAW instruments.

## Manager Read

Start by proving two actual SoundCloud widgets can run together in the 2D app. Then add the crossfader. Only after the real audio path works should the 3D booth be cleaned up and wired to those decks.

The room already has a visual DJ table. Do not make a second competing DJ metaphor. Use Deck A, Deck B, and the center crossfader everywhere.

## Phase Status

Status markers:

- `[ ]` not started.
- `[~]` currently in progress.
- `[x]` completed and manager-verified.
- `[hold]` intentionally delayed until a later design phase.

Only one phase should be `[~]` at a time.

## DJ Booth Phases

- [x] V10-1: Two Local SoundCloud Decks.
- [x] V10-2: Crossfader And Master Mixer.
- [x] V10-3: 2D DJ Panel Usability Pass.
- [x] V10-4: 3D DJ Booth Wiring.
- [x] V10-5: 3D DJ Table Layout Cleanup.
- [x] V10-6: Friend Testing Truth And Final QA.
- [hold] V10-7: Shared DJ Transport / Remote Deck Sync.
- [x] V10-8: 3D Deck Crate Browser Screens.

## Wishlist Mapping

- "wire up 2 instances of SoundCloud" -> V10-1 two independent `useSoundCloudPlayer` instances.
- "fade between the two different songs playing" -> V10-2 crossfader and master mixer.
- "shuffle to next song on either deck" -> V10-1 per-deck shuffle actions.
- "drag a fader left and right for volume like a real DJ table" -> V10-2 2D crossfader, V10-4/V10-5 in-world fader control.
- "clean up pass on the DJ table to make it usable" -> V10-3 through V10-5 readability and control cleanup.
- "two big screens for Deck A and Deck B with playlist songs" -> V10-8 in-world crate browser screens.
- "click to scroll, click the row to switch the song" -> V10-8 per-deck scroll controls and row-click song loading.

## V10-1: Two Local SoundCloud Decks

Status: `[x]` completed and manager-verified.

### Goal

Create two independent local SoundCloud decks in the normal 2D app.

Deck A and Deck B should each have:

- playlist selector.
- Play/Pause.
- Shuffle.
- track title and artist.
- waveform/progress.
- deck volume.
- independent widget/iframe state.

### Implementation Spec

Approved manager scope:

- Add two independent local SoundCloud deck instances to the normal 2D app.
- Keep each deck backed by its own `useSoundCloudPlayer(...)` controller.
- Each deck can select/load a playlist, play/pause, shuffle to a random next song, show track details, show waveform/progress, seek its waveform, and hold independent volume state.
- Preserve existing random-next behavior when a track finishes.
- Preserve the existing hidden 3D jukebox fallback by wiring it to Deck A only for this phase.
- Avoid crossfader state, crossfader math, master mixer behavior, shared/session events, 3D DJ booth wiring, and 3D booth layout changes.

Expected files:

- `src/hooks/useSoundCloudPlayer.ts`
- `src/components/SoundCloudPanel.tsx`
- `src/screens/MainScreen.tsx`
- `src/styles/global.css`
- `src/components/AdminPanel.tsx` only if the existing admin SoundCloud debug seam needs a small Deck A/primary-deck wording or prop adjustment.
- `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`
- `changelog.md` during implementation if code changes are made.

Files to avoid:

- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/useLocalDawState.ts`
- `src/3d/Level1RoomShell.tsx`
- `src/3d/ThreeDModeShell.tsx`
- `src/types/session.ts`
- `src/lib/daw/*`
- `src/lib/lobby/*`
- sync reducers, session schemas, shared events, and audio-engine code.

Existing helpers, types, and state to reuse:

- `useSoundCloudPlayer({ waveformBarCount })` as the per-deck controller.
- `PlaylistOption`, `SoundCloudPlayerController`, `SoundCloudPlayerState`, `SoundCloudPlayerActions`.
- Existing SoundCloud widget helpers: `loadWidgetScript`, `getResolvedWidgetSrc`, `safeWidgetCall`, `pickRandomIndex`, waveform generation, and real waveform fetch logic.
- Existing display/action slices: `jukeboxDisplay` and `jukeboxActions`.
- Existing `SoundCloudWaveformView`, including seek, progress, current time/duration, and waveform popout support.
- Existing `.soundcloud-*` CSS class family, extending rather than replacing.

Implementation shape:

1. Update `useSoundCloudPlayer` so it is explicitly reusable as a deck controller.

   Add optional initial values:

   ```ts
   interface UseSoundCloudPlayerOptions {
     waveformBarCount: number;
     initialPlaylistId?: string;
     initialVolume?: number;
   }
   ```

   Add a small clamp/default helper:

   ```ts
   const DEFAULT_SOUNDCLOUD_VOLUME = 70;

   function clampSoundCloudVolume(volume: number) {
     return Math.max(0, Math.min(100, Math.round(volume)));
   }
   ```

   Initialize playlist and volume per hook instance:

   ```ts
   const initialVolumeRef = useRef(clampSoundCloudVolume(initialVolume ?? DEFAULT_SOUNDCLOUD_VOLUME));
   const volumeRef = useRef(initialVolumeRef.current);

   const [selectedPlaylistId, setSelectedPlaylistId] = useState(() => (
     PLAYLISTS.some((playlist) => playlist.id === initialPlaylistId)
       ? initialPlaylistId
       : PLAYLISTS[0].id
   ));
   const [volume, setVolumeState] = useState(volumeRef.current);
   ```

   Preserve deck volume during widget reloads and retry. The current hook resets volume to `70` during widget setup/retry; replace those resets with the deck's remembered `volumeRef.current`.

   On widget `READY`, apply the remembered deck volume:

   ```ts
   widget.bind(window.SC.Widget.Events.READY, () => {
     window.clearTimeout(readyTimeoutId);
     setIsWidgetReady(true);
     setErrorMessage(null);
     safeWidgetCall(() => widget.setVolume(volumeRef.current));
     setVolumeState(volumeRef.current);
     updatePlaybackTiming();
     refreshTrackList();
   });
   ```

   Keep `shufflePlay`, `FINISH`, `togglePlayback`, playlist loading, waveform fetching, and seeking per hook instance. Their refs/state are already local to each hook call.

2. Instantiate two controllers in `MainScreen`.

   Replace the single player with Deck A and Deck B:

   ```ts
   const soundCloudDeckA = useSoundCloudPlayer({
     waveformBarCount: soundCloudWaveformBarCount,
     initialPlaylistId: "spaceships-2",
     initialVolume: 70,
   });

   const soundCloudDeckB = useSoundCloudPlayer({
     waveformBarCount: soundCloudWaveformBarCount,
     initialPlaylistId: "spaceships-1",
     initialVolume: 70,
   });
   ```

   Pass both to the 2D panel:

   ```tsx
   <SoundCloudPanel
     decks={[
       { id: "A", label: "Deck A", player: soundCloudDeckA },
       { id: "B", label: "Deck B", player: soundCloudDeckB },
     ]}
   />
   ```

   Keep the existing 3D jukebox props pointed at Deck A only:

   ```tsx
   jukeboxDisplay={soundCloudDeckA.jukeboxDisplay}
   jukeboxActions={soundCloudDeckA.jukeboxActions}
   ```

   Keep `AdminPanel` pointed at Deck A for this phase unless a tiny wording/prop seam is needed.

3. Reshape `SoundCloudPanel` into a two-deck renderer.

   Add deck prop types:

   ```ts
   type SoundCloudDeckId = "A" | "B";

   interface SoundCloudDeckPanelConfig {
     id: SoundCloudDeckId;
     label: string;
     player: SoundCloudPlayerController;
   }

   interface SoundCloudPanelProps {
     decks: SoundCloudDeckPanelConfig[];
   }
   ```

   Split the current single-player JSX into a helper component:

   ```tsx
   function SoundCloudDeckCard({ deck }: { deck: SoundCloudDeckPanelConfig }) {
     const { iframeRef, state, actions } = deck.player;

     return (
       <article className={`soundcloud-deck soundcloud-deck-${deck.id.toLowerCase()}`}>
         ...
       </article>
     );
   }
   ```

   Each deck card should keep the existing controls and display surface, but make labels deck-aware:

   - Header label: `Deck A` or `Deck B`.
   - Status pill uses that deck's `state.isPlaying`.
   - Track count uses that deck's `state.trackCount`.
   - Playlist select calls that deck's `actions.changePlaylist`.
   - Play/pause calls that deck's `actions.togglePlayback`.
   - Shuffle calls that deck's `actions.shufflePlay`.
   - Volume slider uses that deck's `state.volume` and `actions.setVolume`.
   - Waveform and waveform popout use that deck's state/actions.
   - Iframe title includes the deck label.
   - Floating waveform window title includes the deck label.

   The exported panel should render both decks:

   ```tsx
   export function SoundCloudPanel({ decks }: SoundCloudPanelProps) {
     const totalTracks = decks.reduce((sum, deck) => sum + deck.player.state.trackCount, 0);
     const activeCount = decks.filter((deck) => deck.player.state.isPlaying).length;

     return (
       <section className="panel soundcloud-panel">
         ...
         <div className="soundcloud-deck-grid">
           {decks.map((deck) => (
             <SoundCloudDeckCard key={deck.id} deck={deck} />
           ))}
         </div>
       </section>
     );
   }
   ```

4. Extend CSS for a two-deck layout.

   Add a responsive deck grid:

   ```css
   .soundcloud-deck-grid {
     display: grid;
     grid-template-columns: repeat(2, minmax(0, 1fr));
     gap: 16px;
   }

   .soundcloud-deck {
     min-width: 0;
   }

   .soundcloud-deck .soundcloud-player {
     height: 100%;
   }

   @media (max-width: 900px) {
     .soundcloud-deck-grid {
       grid-template-columns: 1fr;
     }
   }
   ```

   If the existing artwork-plus-controls layout becomes too cramped, tune only the deck-local `.soundcloud-player` grid columns. Do not redesign the full panel in V10-1; V10-3 owns the usability/layout cleanup.

### Checklist Items Achieved

- [x] Two SoundCloud player hook instances exist.
- [x] Deck A and Deck B render separately in 2D.
- [x] Each deck can play/pause.
- [x] Each deck can shuffle independently.
- [x] Each deck keeps independent track, waveform, progress, and volume.
- [x] Existing 3D room still receives a valid jukebox display/action fallback.
- [x] Build passes.

### Completed Implementation

Added Deck A and Deck B as independent local SoundCloud player controllers in the normal 2D app. The shared hook now accepts per-deck initial playlist and volume options, preserves each deck's volume through widget reloads/retry, and applies remembered volume on widget ready. The 2D SoundCloud panel now renders two separate deck cards with per-deck playlist, play/pause, shuffle, waveform/progress, popout, track metadata, hidden widget iframe, and volume controls. Existing 3D jukebox props remain wired to Deck A only for this phase.

### Acceptance Criteria

- Deck A and Deck B can load independently.
- Deck A and Deck B can play different SoundCloud songs at the same time.
- Shuffle on Deck A does not shuffle Deck B.
- Shuffle on Deck B does not shuffle Deck A.
- Per-deck volume controls do not overwrite the other deck.
- Changing or retrying a playlist does not collapse both deck volumes back into one shared value.
- Each deck shows its own track title, artist, artwork/open links, waveform, elapsed time, duration, progress, loading/error state, and track count.
- Existing random-next behavior on track finish still works per deck.
- Existing 3D jukebox behavior remains wired to Deck A only.
- The normal 2D app remains clean and usable.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual check: both decks render in the normal 2D app.
- [ ] Manual check: Deck A play/pause.
- [ ] Manual check: Deck B play/pause.
- [ ] Manual check: Deck A shuffle while Deck B keeps playing.
- [ ] Manual check: Deck B shuffle while Deck A keeps playing.
- [ ] Manual check: changing Deck A playlist does not reload Deck B.
- [ ] Manual check: changing Deck B playlist does not reload Deck A.
- [ ] Manual check: Deck A and Deck B volume sliders remain independent after playlist changes/retry.
- [ ] Manual check: each deck waveform can seek independently.
- [ ] Manual check: each deck waveform popout title and track state match the correct deck.
- [ ] Manual check: admin SoundCloud debug still works for the primary Deck A controller or has clear primary-deck wording.
- [ ] Manual check: existing hidden room still opens with `syncsesh`.
- [ ] Manual check: existing 3D jukebox surfaces still show Deck A state.

### Risks

- SoundCloud widget readiness can be flaky inside Discord if URL mappings are incomplete.
- Two iframes may be heavier than one.
- The existing 3D jukebox props currently expect one display/action pair.
- SoundCloud may still enforce browser/widget-level behavior around simultaneous playback despite `single_active=false`.
- Browser autoplay rules may require user interaction per deck before playback.
- Two widgets double the waveform fetch and widget event surface.
- Mobile layout can get dense quickly with two full deck cards.

### Non-Goals

- No crossfader math yet.
- No crossfader state.
- No master mixer behavior.
- No 3D booth rewiring yet.
- No 3D booth layout changes.
- No integration between 2D SoundCloud decks and the existing 3D local DAW DJ decks.
- No shared playback sync.
- No session/schema/reducer changes.
- No Discord audio streaming.
- No SoundCloud recording into the local DAW.
- No beat matching, BPM detection, cue points, loops, or pitch controls.

## V10-2: Crossfader And Master Mixer

Status: `[x]` completed and manager-verified.

### Goal

Add a center mixer between Deck A and Deck B.

The user should be able to drag one horizontal fader:

- left = Deck A loud, Deck B quiet.
- center = both audible.
- right = Deck B loud, Deck A quiet.

### Implementation Spec

Approved V10-2 spec:

1. Keep this phase 2D/local only.
   - Do not touch 3D room files, session schemas, reducers, sync clients, local DAW recording, or imported packages.
   - Keep the existing 3D jukebox fallback wired to Deck A.

2. Separate deck trim from mixer output.
   - In `src/hooks/useSoundCloudPlayer.ts`, keep `state.volume` and `actions.setVolume` as the user-facing deck base trim.
   - Add mixer output state such as `outputLevel` and `effectiveVolume`.
   - Add `actions.setOutputLevel(level)` where `level` is clamped from `0` to `1`.
   - Apply the actual SoundCloud widget volume as `base trim * output level`, clamped to `0..100`.
   - On widget ready/retry/reload, preserve base trim and mixer output and apply the effective volume, not raw trim.

3. Add local mixer state in `src/screens/MainScreen.tsx`.
   - Add `soundCloudCrossfader` where `-1` is Deck A, `0` is center, and `1` is Deck B.
   - Add `soundCloudMasterVolume` from `0..100`.
   - Compute equal-power crossfade levels:
     - Deck A: `Math.cos(position * Math.PI * 0.5)`.
     - Deck B: `Math.sin(position * Math.PI * 0.5)`.
     - `position = (crossfader + 1) / 2`.
   - Apply `master * crossfade` to each deck through `setOutputLevel`.

4. Add a compact mixer section to `src/components/SoundCloudPanel.tsx`.
   - Accept mixer props for crossfader, master volume, output readout, and setters.
   - Render one horizontal crossfader with left `A`, center label/readout, and right `B`.
   - Render one master volume slider.
   - Show clear chips/readout for `A OUT`, `B OUT`, `XFADE`, and `MASTER`.
   - Rename each deck's existing `Volume` slider label to `Trim` so friends understand it is the base deck level.

5. Add minimal CSS in `src/styles/global.css`.
   - Add compact mixer panel, readout chips, and slider row styles.
   - Keep responsive behavior simple; V10-3 owns broader DJ panel cleanup.

6. Update `changelog.md` when code changes.

### Checklist Items Achieved

- [x] Crossfader state exists.
- [x] Master volume state exists.
- [x] Crossfader updates both deck widget volumes.
- [x] 2D UI shows A/B mix percentage.
- [x] Build passes.

### Completed Implementation

Added local 2D SoundCloud mixer state for crossfader and master volume. The SoundCloud player hook now separates deck base trim from mixer output level, exposes effective widget volume, and applies the actual widget volume as base trim times output level. MainScreen computes an equal-power Deck A/Deck B crossfade and scales it through master volume before applying output levels to each deck. The 2D SoundCloud panel now includes a compact mixer section with A/B output chips, crossfader readout, master readout, crossfader slider, and master slider. Deck sliders are labeled `Trim` to distinguish base deck level from mixer output.

### Acceptance Criteria

- Dragging the crossfader left emphasizes Deck A.
- Dragging the crossfader right emphasizes Deck B.
- Center blend keeps both decks audible.
- Master volume scales both decks.
- Deck-level controls still work.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual A-only check.
- [ ] Manual B-only check.
- [ ] Manual center blend check.
- [ ] Manual master volume check.

### Risks

- Updating widget volume too often while dragging could feel laggy.
- Linear fade can feel quiet in the center; constant-power fade is preferred if stable.

### Non-Goals

- No beat matching.
- No EQ.
- No shared playback sync.
- No 3D controls yet.

## V10-3: 2D DJ Panel Usability Pass

Status: `[x]` completed and manager-verified.

### Goal

Make the 2D SoundCloud DJ panel feel like a real compact DJ table.

Target layout:

```text
DECK A             MIXER              DECK B
track/waveform     crossfader         track/waveform
play shuffle vol   master             play shuffle vol
```

### Implementation Spec

Approved V10-3 spec:

1. Keep this phase layout/readability only.
   - Do not change SoundCloud playback behavior, crossfader math, hook state semantics, 3D files, sync/session/schema/reducer files, DAW recording, or packages.
   - Prefer `src/components/SoundCloudPanel.tsx`, `src/styles/global.css`, this V10 doc, and root `changelog.md`.

2. Make the panel read like a compact DJ table.
   - Render a wide layout as `Deck A | Mixer | Deck B`.
   - Derive Deck A and Deck B from the existing `decks` prop without changing the prop contract.
   - Keep Deck A and Deck B player controls independent.
   - Keep the existing mixer controls and readout values unchanged.

3. Improve labels and grouping.
   - Add deck headings that say `Left Deck / Deck A` and `Right Deck / Deck B`.
   - Change the track meta label inside each deck from the deck name to `Now playing`.
   - Move `Open` and `Artist` links into a dedicated row/cluster so long track titles have room.
   - Keep deck sliders labeled `Trim`.
   - Add a mixer heading such as `Mixer / Crossfader + Master`.
   - Add one concise local-audio truth note at the panel level. Full Discord expectation guidance remains V10-6.

4. Update CSS for readability.
   - Add `.soundcloud-dj-table` with three columns: Deck A, Mixer, Deck B.
   - Use a generous medium breakpoint around `1180px` to stack as Deck A, Mixer, Deck B.
   - Add styles for deck headings, deck status, track action row, panel note, and mixer heading.
   - Preserve waveform, playlist, play/shuffle, retry, trim, mixer slider, and hidden iframe styling.

5. Update docs and changelog.
   - Mark V10-3 checklist items after implementation.
   - Add a V10-3 root `changelog.md` entry.

### Checklist Items Achieved

- [x] Deck A and B are visually balanced.
- [x] Mixer is centered and obvious.
- [x] Labels explain local audio.
- [x] Mobile layout remains usable.
- [x] Build passes.

### Completed Implementation

Reworked the normal 2D SoundCloud panel into a compact DJ table layout with Deck A on the left, the mixer centered, and Deck B on the right on wide screens. The layout now stacks as Deck A, Mixer, Deck B around the medium breakpoint so controls have room on narrower screens. Added clear deck headings, a mixer heading, a dedicated Open/Artist link row, and one concise local-browser-audio note at the panel level. Existing deck playlist, play/pause, shuffle, waveform, trim, crossfader, master, output readout, and Deck A 3D fallback behavior were preserved.

### Acceptance Criteria

- User can tell which controls affect Deck A, Deck B, or the mix.
- Text does not overlap on desktop or mobile.
- Existing admin SoundCloud debug remains useful.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Desktop layout check.
- [ ] Mobile/narrow layout check.
- [ ] Discord embedded layout check if available.

### Risks

- Two full waveforms can make the panel too tall.
- Labels can become noisy if every control explains itself.

### Non-Goals

- No new player behavior beyond layout/readability.
- No 3D work.

## V10-4: 3D DJ Booth Wiring

Status: `[x]` completed and manager-verified.

### Goal

Wire the in-world DJ booth to the real SoundCloud deck controllers.

The booth should show:

- Deck A SoundCloud status.
- Deck B SoundCloud status.
- Play/Pause for each deck.
- Shuffle for each deck.
- current crossfader mix.

### Implementation Spec

Approved V10-4 spec:

1. Add a local-only 3D SoundCloud booth prop path.
   - `MainScreen` should pass Deck A and Deck B display/action bundles plus mixer readout into `ThreeDModeShell`.
   - `ThreeDModeShell` should pass that bundle through to `Level1RoomShell`.
   - `Level1RoomShell` should pass it to `Level1RecordingStudioRoom`.
   - Keep the existing single `jukeboxDisplay` / `jukeboxActions` Deck A fallback for the control-room jukebox.

2. Use lightweight 3D-facing types.
   - Deck bundle: id `A`/`B`, label, `JukeboxDisplayState`, `JukeboxActions`, trim percent, output percent.
   - Mixer bundle: crossfader `-1..1`, master volume `0..100`, A/B output percent, optional `onSetCrossfader`.
   - Keep this local to the 3D shell/room files or a nearby type alias; do not change session types.

3. Add a recording-studio SoundCloud DJ surface.
   - In `Level1RecordingStudioRoom.tsx`, add a new `StudioSoundCloudDjControls` component near the existing `StudioDjControls`.
   - If `soundCloudBooth` exists, render the SoundCloud surface at the existing DJ desk position.
   - If `soundCloudBooth` is absent, keep rendering the existing local DAW `StudioDjControls` fallback.
   - Do not wire SoundCloud into `localDawState.dj`, `localDawActions`, shared clips, or recording.

4. Required in-world behavior.
   - Show Deck A and Deck B SoundCloud status, track/artist, playing/loading/error state, trim, output, and progress.
   - Add Deck A Play/Pause and Shuffle controls that call Deck A actions only.
   - Add Deck B Play/Pause and Shuffle controls that call Deck B actions only.
   - Show current crossfader position, master volume, A output, and B output.
   - Add discrete A / MID / B crossfader buttons that call the existing 2D crossfader setter. Continuous drag stays out of scope.
   - Label the surface `LOCAL SOUNDCLOUD` so it does not imply Discord voice/app-audio transport or DAW recording.

5. Scope guardrails.
   - Do not edit session/sync/schema/reducer/server files.
   - Do not add packages.
   - Do not add SoundCloud recording or shared playback sync.
   - Do not do broad physical spacing cleanup; V10-5 owns 3D layout polish.

6. Update docs and changelog after implementation.

### Checklist Items Achieved

- [x] 3D shell accepts both deck displays/actions.
- [x] 3D booth screens show Deck A and Deck B SoundCloud state.
- [x] In-world Play/Pause controls call the matching deck.
- [x] In-world Shuffle controls call the matching deck.
- [x] Crossfader display uses real mixer state.
- [x] Build passes.

### Completed Implementation

Added a local-only SoundCloud booth prop bundle from `MainScreen` through `ThreeDModeShell` and `Level1RoomShell` into the recording-studio room. The recording-studio DJ desk now renders a SoundCloud surface when the booth bundle exists, with Deck A and Deck B status, track/artist summary, progress, trim/output readouts, Play/Pause and Shuffle controls per deck, a real crossfader/master/A OUT/B OUT mixer display, discrete A/MID/B crossfader buttons, and a `LOCAL SOUNDCLOUD` truth label. The old local DAW DJ clip controls remain as the fallback when SoundCloud booth props are absent, and the control-room jukebox remains wired to Deck A as the compatibility fallback.

### Acceptance Criteria

- Clicking Deck A Play affects SoundCloud Deck A only.
- Clicking Deck B Play affects SoundCloud Deck B only.
- Clicking Deck A Shuffle affects Deck A only.
- Clicking Deck B Shuffle affects Deck B only.
- The old single jukebox display remains compatible enough for other room screens or is intentionally replaced.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person booth control check.
- [ ] Manual top-down/free-cam booth control check.
- [ ] Manual check that existing DAW clip DJ controls are not misrepresented.

### Risks

- The room currently has local DAW DJ source controls; real SoundCloud controls must not pretend they record into the DAW.
- Prop plumbing can touch several 3D shell files.

### Non-Goals

- No shared SoundCloud playback sync.
- No SoundCloud recording into DAW clips.

## V10-5: 3D DJ Table Layout Cleanup

Status: `[x]` completed and manager-verified.

### Goal

Make the DJ booth physically readable and usable in 3D.

Focus:

- Deck A left.
- Deck B right.
- center crossfader rail.
- no overlapping tiny buttons.
- readable track/mix screens.
- obvious `LOCAL SOUNDCLOUD` truth.

### Implementation Spec

Approved V10-5 spec:

1. Keep this phase physical layout/readability only.
   - Prefer `src/3d/Level1RecordingStudioRoom.tsx`, this V10 doc, and root `changelog.md`.
   - Do not change SoundCloud actions, mixer math, prop plumbing, hook state, 2D UI, session/sync/schema/reducer files, DAW recording, packages, or shared playback.

2. Widen and organize the 3D DJ surface.
   - Keep the same parent DJ desk position and rotation.
   - Increase the DJ desk shell footprint enough to make the SoundCloud table readable.
   - Add local layout constants inside/near `StudioSoundCloudDjControls` so Deck A, mixer, Deck B positions are named and easy to tune.

3. Spatial layout target.
   - Deck A clearly left.
   - Deck B clearly right.
   - Center mixer lane clear.
   - Crossfader rail and knob in the center lane.
   - A/MID/B crossfader buttons separated from deck Play/Shuffle controls.
   - Play/Shuffle controls placed in deck-local rows.
   - Mix display larger and centered behind the fader.
   - `LOCAL SOUNDCLOUD` truth label larger and visible near the front edge.

4. Improve readout readability.
   - Add a small SoundCloud-specific canvas helper for deck/mix/truth readout planes if needed.
   - Truncate long SoundCloud titles aggressively.
   - Prioritize status, output percent, trim, crossfader, and master over full track titles.
   - Do not alter existing local DAW DJ control rendering.

5. Preserve behavior.
   - Deck A Play/Pause still calls Deck A `togglePlayback`.
   - Deck B Play/Pause still calls Deck B `togglePlayback`.
   - Deck A/B Shuffle still calls matching `shufflePlay`.
   - A/MID/B crossfader buttons still call the existing local SoundCloud crossfader setter.
   - Existing local DAW DJ controls remain the fallback when `soundCloudBooth` is absent.

6. Update docs and changelog after implementation.

### Checklist Items Achieved

- [x] Decks are spatially separated.
- [x] Controls do not overlap.
- [x] Crossfader rail is visually clear.
- [x] Labels are readable from first-person.
- [x] Build passes.

### Completed Implementation

Widened the recording-studio DJ desk footprint and reorganized the SoundCloud table into a clearer Deck A / Mixer / Deck B surface. Added named SoundCloud table layout constants, moved Deck A and Deck B farther apart, placed Play/Pause and Shuffle controls into deck-local rows, gave the center mixer lane its own crossfader rail, knob, and separated A/MID/B buttons, and replaced cramped deck/mix/truth readouts with larger SoundCloud-specific canvas readouts. The booth now presents a larger `LOCAL SOUNDCLOUD` truth label at the front edge while preserving all existing Deck A/B Play/Pause, Shuffle, and crossfader action wiring.

### Acceptance Criteria

- User can identify Deck A, Deck B, and crossfader without guessing.
- Buttons are not stacked or hidden.
- SoundCloud local-audio status is visible.
- Existing recording-room instruments remain accessible.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual first-person readability check.
- [ ] Manual top-down/free-cam readability check.
- [ ] Manual collision/overlap check near the DJ booth.

Manager review: source review confirmed the phase stayed physical/readability scoped, Deck A/B action wiring and crossfader callbacks were preserved, and a manager-run `npm.cmd run build` passed with only the existing Vite large chunk warning. Live in-room camera and hit-target checks remain manual.

Top-down feedback pass: after live testing, the SoundCloud DJ surface was widened again, Deck A/B were nudged farther outward, deck-local Play/Shuffle buttons were spread apart, and A/MID/B crossfader buttons were spaced across a wider center lane. Behavior and wiring were unchanged.

Second top-down feedback pass: flattened the Deck A/B turntable platters, moved the `LOCAL SOUNDCLOUD` truth label farther toward the front edge, moved Play/Shuffle controls down toward the deck fronts, and moved the crossfader rail/preset controls up toward the mixer screen. Behavior and wiring were unchanged.

Third top-down feedback pass: expanded the DJ table into a larger row-based controller so controls stop stacking in the same strip. The mixer screen and fader now sit in the back lane, turntables sit in the middle deck lanes, deck readouts sit in their own front lane, Play/Shuffle controls sit on the table front edge, and the `LOCAL SOUNDCLOUD` truth plate sits beyond the controls as a separate placard. Behavior and wiring were unchanged.

### Risks

- The DJ booth is physically small compared with the amount of information needed.
- Layout changes can hide neighboring studio props.

### Non-Goals

- No new audio behavior.
- No new 2D behavior.

## V10-6: Friend Testing Truth And Final QA

Status: `[x]` completed and manager-verified.

### Goal

Finish the DJ booth with honest testing guidance.

The app should clearly state:

- SoundCloud decks are local browser audio.
- Friends do not hear your SoundCloud through Discord voice by default.
- Each friend can use their own app SoundCloud audio.
- The crossfader mixes the current browser's two SoundCloud widgets.

### Implementation Spec

Approved V10-6 spec:

1. Keep this phase as final truth copy and QA closure only.
   - Expected files: `src/components/SoundCloudPanel.tsx`, `src/3d/Level1RecordingStudioRoom.tsx`, this V10 doc, and root `changelog.md`.
   - Touch `src/styles/global.css` only if a compact existing note style needs a tiny readability adjustment.

2. Preserve all behavior.
   - Do not change SoundCloud hook state, widget URLs, mixer math, `MainScreen` deck wiring, `soundCloudBooth` prop types, session/sync/schema/reducer/server files, DAW recording, or packages.
   - Deck A/B Play/Pause, Shuffle, trim, master, and crossfader behavior must remain unchanged.

3. Tighten 2D friend-facing truth.
   - Reuse `SoundCloudPanel` `localAudioNote` and `isDiscordProxyHost()`.
   - Normal browser copy should clearly say the mixer blends this browser's Deck A/B and friends need their own app audio.
   - Discord/proxy copy should clearly say Discord voice will not carry these decks and friends need their own app audio.
   - Do not repeat friend guidance on every deck card.

4. Tighten 3D booth truth.
   - Reuse `StudioSoundCloudTruthLabel` and `createStudioSoundCloudReadoutCanvas`.
   - Keep the title `LOCAL SOUNDCLOUD`.
   - Prefer very short lines such as `THIS BROWSER MIX ONLY` and `FRIENDS NEED OWN APP AUDIO`.
   - Do not imply raw Discord voice/app-audio streaming, shared transport, or DAW recording.

5. Update final QA documentation.
   - Add/check manual checks for one-browser deck playback, per-deck shuffle, crossfader left/mid/right, master, visible 2D/3D truth copy, control-room jukebox Deck A fallback, two-browser local independence, and Discord expectation.
   - Distinguish build-verified checks from manual checks still not run.

6. Add a V10-6 changelog entry when code copy changes.

### Checklist Items Achieved

- [x] 2D panel has compact local-audio truth.
- [x] 3D booth has compact local-audio truth.
- [x] Manual test checklist is updated.
- [x] Build passes.

### Completed Implementation

Tightened the final friend-facing SoundCloud truth copy without changing deck behavior, mixer math, prop plumbing, sync, session state, DAW recording, or packages. The 2D SoundCloud panel now states that the mixer blends this browser's Deck A/B and that friends need their own app audio, with Discord-host wording explicitly saying Discord voice will not carry these decks. The 3D booth truth readout keeps `LOCAL SOUNDCLOUD` and now uses shorter in-world lines: `THIS BROWSER MIX ONLY` and `FRIENDS NEED OWN APP AUDIO`. The final QA checklist now distinguishes the build-verified closure from live one-browser, two-browser, and Discord expectation checks that still need manual testing.

### Acceptance Criteria

- Friend testing confusion is reduced, not increased.
- Copy does not imply raw app audio streaming through Discord.
- Two-deck/crossfader flow is documented in the vision completion notes.
- Build passes.

### Build And Manual Checks

- [x] `npm.cmd run build`.
- [ ] Manual one-browser check: Deck A/B play/pause, per-deck shuffle, crossfader left/mid/right, master volume, and visible 2D/3D truth copy.
- [ ] Manual 3D check: recording-studio booth controls remain readable/clickable and the control-room jukebox remains Deck A fallback.
- [ ] Manual two-browser check if possible: each browser keeps independent local SoundCloud widgets and local mixer state.
- [ ] Manual Discord expectation check: copy does not imply raw app-audio streaming through Discord voice.

Manager review: source review confirmed this phase only changed concise truth copy and V10 closure docs/changelog. Deck behavior, SoundCloud hook state, mixer math, sync/session files, DAW behavior, and packages were not changed. A manager-run `npm.cmd run build` passed with only the existing Vite large chunk warning. Live one-browser, two-browser, 3D booth, and Discord expectation checks remain manual.

### Risks

- Too much warning copy can make the DJ booth feel broken.
- Too little truth copy can recreate the recording-room confusion.

### Non-Goals

- No actual Discord audio transport.
- No shared deck sync.

## V10-7: Shared DJ Transport / Remote Deck Sync

Status: `[hold]` on hold.

### Goal

Consider shared DJ deck state later.

Possible future ideas:

- shared selected playlist.
- shared deck track index.
- host-controlled play/pause.
- shared crossfader position.
- friend-readiness indicators.

### Hold Reason

Do not add shared SoundCloud deck sync until the local two-deck mixer is usable and friend testing proves what should sync.

## V10-8: 3D Deck Crate Browser Screens

Status: `[x]` completed and manager-verified.

### Goal

Add two large in-world crate browser screens for Deck A and Deck B so the DJ can see playlist songs, scroll through them with click controls, and click a song row to load that song into the matching deck.

The screens should make the SoundCloud workflow feel like picking from a deck crate instead of blindly shuffling.

### Requested Behavior

- Place one large Deck A browser screen near the front-left side of the DJ stage.
- Place one large Deck B browser screen near the front-right side of the DJ stage.
- Each screen shows a readable slice of the deck playlist, current loaded song, deck status, and local-audio truth label.
- Add clickable `UP` and `DOWN` controls for scrolling the visible playlist rows.
- Clicking `UP` or `DOWN` changes the visible rows without changing the loaded song.
- Clicking a song row loads/switches that song into the correct deck.
- Keep `SHUF` available as the fast random-pick action.
- Highlight the currently loaded song and, where practical, the hovered or selected row.
- Prefer click controls over mouse-wheel scrolling in the first pass so the feature does not fight browser scroll, pointer lock, or camera controls.

### Acceptance Criteria

- Deck A screen controls Deck A only.
- Deck B screen controls Deck B only.
- Up/down clicks scroll the visible playlist rows without changing the current deck song.
- Row clicks load the clicked song into the matching deck.
- Existing Play/Pause, Shuffle, crossfader, hot cues, and local-audio truth copy still work.
- The hidden 3D room still opens with `syncsesh`.
- `npm.cmd run build` passes.

### Likely Files

- `src/3d/Level1RecordingStudioRoom.tsx`
- `src/3d/soundCloudBooth.ts`
- `src/hooks/useSoundCloudPlayer.ts` if the current hook does not expose direct track loading or playlist row data cleanly enough.
- `src/screens/MainScreen.tsx` if the 3D booth prop bundle needs deck row-load or scroll actions.
- `docs/3d/3dvision10-dj-booth-two-deck-mixer.md`
- `changelog.md` when code changes are implemented.

### Non-Goals

- No shared or remote DJ sync.
- No mouse-wheel scrolling in the first pass.
- No SoundCloud search, favorites, categories, saved crates, or external playlist editor.
- No raw audio streaming through Discord voice.

### Completed Implementation

- Added real SoundCloud playlist row data to the per-deck player display state.
- Added a per-deck `loadTrackByIndex` action that skips to the clicked row and starts playback locally.
- Added two in-world crate browser screens on the DJ booth, one for Deck A and one for Deck B.
- Added click targets for `UP`, `DOWN`, and each visible song row.
- Kept the flow local-only: no shared DJ sync, no Discord voice streaming, no mouse-wheel scrolling, and no playlist editor.

### Manager Review

- Source review confirmed Deck A and Deck B use their own deck object, own scroll offset, and own row-load action.
- Source review confirmed scroll controls only change the visible row window and row clicks call `loadTrackByIndex`.
- `npm.cmd run build` passed with the existing Vite large chunk warning.
- Manual in-room checks remain recommended for first-person row hit targets, top-down readability, and SoundCloud widget behavior after row load.

## Manager Loop Plan

Use this doc as the active roadmap for DJ booth work and `docs/Agents/agent.md` as the operating loop.

Loop rules:

- Keep only one phase marked `[~]`.
- Start with V10-1 because two working local SoundCloud widgets are the foundation.
- Before implementation, require a worker preparation spec covering likely files, files to avoid, reused helpers, acceptance checks, risks, and non-goals.
- Do not implement a phase until the approved spec is written into that phase section.
- Every implementation phase runs `npm.cmd run build`.
- Close a phase only after manager review, build confirmation, doc updates, and changelog entry when code changed.
- Push only when the user explicitly says `push update`.

Recommended order:

1. V10-1 proves two independent SoundCloud decks.
2. V10-2 adds the crossfader and master mixer.
3. V10-3 cleans the 2D DJ panel.
4. V10-4 wires the 3D DJ booth to the real SoundCloud decks.
5. V10-5 cleans up the 3D DJ table layout.
6. V10-6 closes friend-testing truth and final QA.
7. V10-7 stays on hold until local DJ flow is stable.
8. V10-8 can run before shared sync if the local DJ flow needs clearer song picking from inside the 3D booth.

## Test Plan

Every implementation phase:

- run `npm.cmd run build`.
- confirm normal 2D app remains clean and usable.
- confirm hidden 3D room still opens with `syncsesh`.
- confirm existing guitar, piano, drums, looper, timeline, monitors, and shared transport are not regressed.

DJ-specific manual checks:

- Deck A can play/pause.
- Deck B can play/pause.
- Deck A shuffle does not affect Deck B.
- Deck B shuffle does not affect Deck A.
- Deck A crate browser row-click loads Deck A only.
- Deck B crate browser row-click loads Deck B only.
- Deck crate browser up/down controls scroll rows without loading a song.
- Both decks can be audible at once.
- Crossfader left emphasizes Deck A.
- Crossfader right emphasizes Deck B.
- Center blend keeps both decks audible.
- 3D booth labels and controls are readable in first-person and top-down/free-cam.
- Discord/friend copy does not imply raw app-audio streaming.

## Assumptions

- SoundCloud audio stays local to each browser.
- The current SoundCloud widget embed can support two iframes because its widget URL already uses `single_active=false`.
- The existing `useSoundCloudPlayer` hook can remain the per-deck engine.
- Existing in-world local DAW DJ source controls are not the same as SoundCloud deck playback and must be labeled carefully if they remain visible.
- `docs/Agents/agent.md` remains the authority for manager/worker loop behavior.
