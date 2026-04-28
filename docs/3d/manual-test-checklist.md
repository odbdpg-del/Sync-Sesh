# 3D Hidden World Manual Test Checklist

## Vision 25 - Interaction Raycast Performance

- Enter the 3D world, open the escape menu, enable Show FPS, and verify the overlay shows FPS plus `IR` interaction stats and `GL` renderer stats.
- Stand in the control room and verify the `IR` object count is lower than when standing inside the recording studio.
- Enter the recording studio, aim across dense studio controls, and verify `IR` raycast duration remains stable without large repeated spikes.
- Click several piano keys and verify each note sounds promptly and the piano latency trace still includes pointer, activation, frame, and raycast timing fields.
- Click Deck A/B Play, Cue, hot cues, grid pads, and seek controls; verify they activate from the click and still add expected console/booth feedback.
- Drag the SoundCloud crossfader, deck waveform scrubber, grid clamp handles, and platter scrub control; verify drag starts, updates, and ends normally.
- Use the studio layout movement flow to pick up, rotate, place, and reset at least one movable studio station.
- Aim at the local station monitor and press E; verify dashboard return still works.
- Use Level 1 RANGE and Level 2 BACK doors; verify level exits still activate.
- In Level 2 range, click once to focus controls, then shoot range targets; verify shootable fallback still works and top-down mode disables shooting.
- Toggle Show FPS off and verify interaction/render performance stats disappear and no normal 2D UI affordance was added.
- Repeat the piano, DJ click, and range shooting checks inside Discord Activity with a friend when available.

## Vision 3 Final Manual Test And Recovery Pass

### Normal 2D Baseline

- Open the app without query params and verify the normal Sync Sesh dashboard loads.
- Verify no visible 3D button, level selector, range selector, world selector, menu item, settings control, or hint appears in the normal 2D UI.
- Verify the normal timer, lobby, SoundCloud panel, admin controls, and dashboard layout remain usable before unlocking.
- Click around the normal dashboard and verify failed or partial secret-code entry can be cleared by normal hidden reset behavior.

### Secret Unlock And Recovery

- Type `syncsesh` and verify the hidden 3D shell opens.
- Click Exit and verify the normal 2D dashboard remains usable.
- Type `syncsesh` again after Exit and verify the hidden 3D shell can re-open.
- Verify the hidden world remains secret and optional: no normal-app affordance appears after entering or exiting.

### Station Reveal And Return

- Without joining the session, type `syncsesh` and verify the reveal starts from a temporary local-only desk computer, not the big wall monitor.
- Verify the unjoined temporary station does not add the local user to the session, change ready/idle/spectator counts, or create a seated occupant marker.
- Exit, join the session, type `syncsesh`, and verify the reveal starts from the joined user's assigned computer station.
- Verify the joined reveal does not start from the big wall monitor when station computers exist.
- After reveal completion, click once in the 3D view and verify the first click focuses movement instead of returning to the dashboard.
- Aim at the local station monitor and press E; verify it animates/returns to the 2D dashboard.
- Re-enter and verify primary-clicking the local station monitor does not return to the dashboard.
- Aim at another user's station monitor and press E; verify it does not return to the dashboard.

### Movement, Views, And Body

- After reveal, click the 3D canvas and verify the focus hint disappears.
- Verify W/A/S/D movement works in first-person and follows the current camera direction.
- Verify mouse look works with pointer lock where supported.
- If pointer lock is unavailable or rejected, verify drag-look fallback works.
- Press Escape and verify pointer lock releases without closing the hidden world.
- Press Tab once and verify top-down view appears.
- Press Tab again and verify first-person view returns.
- Verify W/A/S/D does not move during reveal or while top-down is active.
- Verify the FPV body is hidden during reveal, before first focus, top-down, return animation, and fallback/loading states.
- In focused first-person, look down and verify the local body is visible without blocking the reticle, station targeting, or range shooting.

### Expanded Control Room

- Verify Level 1 opens into the expanded Control Room.
- Verify Level 1 no longer renders the attached Recording Studio footprint west of the Control Room.
- Verify the hero monitor wall renders with the large main dashboard, side/status screens, timer ribbon, and smaller surrounding monitors.
- Verify wall monitors do not show obvious overlap, z-fighting, doubled screens, or backwards-facing screen content.
- Aim at the configured session/status wall panel and press E; verify it cycles only the existing session panel behavior.
- Verify other hero wall monitors are not clickable unless explicitly intended.
- Verify assigned user stations, RGB workstation props, lounge props, kitchen/island props, balcony, and stairs remain visually readable.
- Verify decorative workstation, lounge, and kitchen props are not clickable and do not return to the dashboard.
- Verify movement lanes remain usable around the Control Room.

### Range Separation And Challenge

- Verify the old Control Room east range opening is sealed or physically blocked in Level 1.
- Verify Level 1 does not render range lanes, targets, HITS display, or local range challenge UI.
- Locate the Level 1 east-wall RANGE door/panel and verify it is readable in first-person and top-down views.
- Locate the Level 1 west-wall STUDIO door/panel and verify it is readable in first-person and top-down views.
- Click once to focus controls and verify this does not activate the RANGE door.
- Click once to focus controls and verify this does not activate the STUDIO door.
- Aim at the Level 1 RANGE door and press E; verify the shell switches to `data-level-id="level-2-range"`.
- Aim at the Level 1 STUDIO door and press E; verify the shell switches to `data-level-id="level-3-recording-studio"`.
- Verify the Level 1 STUDIO door now switches instantly with no reveal fly-in.
- Verify Level 3 control focus works immediately after the instant studio transfer.
- In Level 3, aim at the BACK door and press E; verify returning to Level 1 still works.
- Verify the Level 3 BACK door now switches instantly with no reveal fly-in.
- Verify returning from Level 3 lands just inside Level 1 in front of the west-wall STUDIO door, facing into the Control Room.
- In Level 3, locate the `MONITORS` power control and press E; verify the overview monitor bank goes dark.
- While global monitor power is off, aim at an individual overview monitor and verify it does not toggle independently.
- Press E on the global monitor power control again and verify overview monitors come back on.
- Aim at one overview monitor and press E; verify only that monitor turns off.
- Aim at a different overview monitor and verify it remains on.
- Turn global monitor power off and back on again; verify the individually disabled monitor stays off while the others restore.
- Verify layout move targeting for overview monitor stations still works after using the monitor power controls.
- Return to Level 1 from the Level 2 BACK door and verify the Level 1 east wall remains a blocked wall with only the door interaction active.
- Verify Level 1 now uses the west-wall STUDIO door to reach the standalone studio instead of a walk-through attached room.
- Open with `?level=level-2-range`, type `syncsesh`, and verify the standalone range loads.
- Click once to focus controls and verify this does not immediately fire a target.
- Aim at targets and primary-click; verify shooting still works in Level 2.
- Verify target hit feedback, score/hits/miss/accuracy behavior, and challenge reset/completion still work in Level 2.
- Press Tab during range use and verify top-down disables shooting and reticle interaction.
- Aim at the Level 2 BACK door and press E; verify returning to Level 1 still works.

### Presence And Sim Roaming

- In a single-client/mock check, verify local movement, station occupants, and idle sim visuals remain stable.
- With idle sim users available, verify idle sims roam when no `simRoam` query param is present.
- Open with `?simRoam=0` and verify idle sims remain station-based and no roaming sim markers render.
- Verify ready sims, spectating sims, and real users do not use the local-only sim roaming path.
- In WebSocket mode with two clients, verify real free-roam presence appears for a remote user in the same level.
- Verify remote free-roam presence clears or returns to station-based presence after Exit, level change, or stale timeout.
- Verify sim roaming sends no sync events, reducer events, `freeRoamPresence` writes, or network traffic.

### Jukebox

- Verify the SoundCloud panel still works in the normal 2D dashboard.
- Enter the 3D world and verify the Level 1 jukebox renders from its configured cabinet, screen, speaker, and control-zone data.
- Verify jukebox screens show safe standby placeholders when player data is missing.
- Verify jukebox screens show track title, artist/source, playlist label, track count, status, progress, and waveform/equalizer-style data when available.
- Verify screen glow, cabinet accent pulse, and speaker/equalizer polish appear when music is playing and calm down in standby.
- Aim at the jukebox toggle playback control and press E; verify it calls the existing play/pause behavior.
- Aim at the jukebox shuffle control and press E; verify it calls the existing shuffle behavior.
- Aim at the jukebox retry control and press E; verify it calls the existing retry behavior.
- Verify `next`, `playlist-change`, `page-up`, and `page-down` remain visual-only and unregistered.
- Verify jukebox controls do not interfere with range shooting, local monitor return, movement focus, pointer lock, or normal SoundCloud behavior.

### SoundCloud DJ Booth Enrichment

- Enter the 3D world and verify the SoundCloud DJ booth renders Deck A, Deck B, the seek/cue panels, and the center mixer.
- Verify BPM labels distinguish accepted metadata, accepted waveform, accepted length, manual trim, and unloaded state.
- Verify Deck A/B mute, sync, and BPM tool buttons are readable, reachable, and do not overlap existing DJ controls.
- Verify Deck B's Sync, Play, Mute/Open, and Shuffle buttons mirror Deck A's correct row layout instead of drifting toward the center.
- Verify Deck A/B Sync buttons sit farther outward than the Play/Mute/Shuffle row while remaining reachable.
- Verify Deck B's BPM buttons are mirrored outward and no longer overlap the Deck B cue pad section.
- Verify a track with no SoundCloud BPM can show `BPM WAVE` after waveform analysis when confidence is high enough.
- Verify tracks with low-confidence waveform analysis show `BPM --` until the user accepts another BPM method or manually trims BPM.
- Aim at Deck A/B `META`, `WAVE`, and `LEN` BPM buttons and verify the deck monitor accepts that BPM source or shows useful feedback such as `NO META`, `NO WAVE`, or `NO LENGTH`.
- Aim at Deck A/B `BPM-` and `BPM+` buttons and verify the deck monitor changes by 0.1 BPM and labels the source as `MANUAL`.
- Aim at Deck A/B `CLEAR` and verify the deck monitor returns to `BPM --`.
- Aim at Deck A Mute and press E; verify Deck A goes silent, Deck B stays audible, and Deck A trim is preserved.
- Aim at Deck A Open and press E; verify Deck A audio returns at the previous trim/crossfader/master level.
- Repeat mute/open for Deck B.
- With both decks loaded, aim at Deck A Sync and press E; verify Deck A seeks toward Deck B's beat phase and starts playing.
- With both decks loaded, aim at Deck B Sync and press E; verify Deck B seeks toward Deck A's beat phase and starts playing.
- Verify sync blocked states display readable labels such as `NO MASTER`, `LOAD TRACK`, or `NO BPM`.
- Aim at Deck A platter, hold left click, and verify the platter enters scrub mode and stops auto-spinning.
- While holding Deck A platter, drag/look right and verify the song seeks forward.
- While holding Deck A platter, drag/look left and verify the song seeks backward.
- Verify the floating platter meter appears only while the platter is held, with a clear center target and moving needle.
- Release Deck A platter and verify platter scrub control stops and normal visual spin resumes.
- Repeat platter scrub on Deck B.
- Aim at the SoundCloud crossfader rail, hold left click, and move the mouse/look left; verify the crossfader moves toward Deck A.
- Continue holding and move the mouse/look right; verify the crossfader moves toward Deck B.
- Verify the crossfader knob follows the aimed point along the rail instead of feeling like loose incremental nudges.
- Release left click and verify crossfader movement stops.
- While holding the crossfader, verify camera look continues and the fader remains controlled until release.
- While holding the crossfader, verify the center display shows grab feedback such as `XFADE GRAB`.
- Press Escape while a fader is held and verify pointer lock/fader drag releases cleanly.
- Aim at Deck A trim, hold left click, and move left/right; verify Deck A trim/output changes continuously.
- Aim at Deck B trim, hold left click, and move left/right; verify Deck B trim/output changes continuously.
- Aim at master volume, hold left click, and move left/right; verify master volume changes continuously.
- Verify each held slider has a thin black backing plate sized to the slider area.
- Verify the draggable crossfader rail sits in the center slot below the A/Mid/B snap buttons and does not block seek, cue, play, or shuffle controls.
- Verify the A/Mid/B snap buttons sit side by side in the center upper crossfader bank and no longer overlap the draggable crossfader rail in top-down view.
- Verify Deck A/B readout screens sit on the far side of their platters instead of in front of the disks.
- Verify the BPM/deck monitor is larger and readable.
- Verify the BPM/deck monitor uses a 32:9 ultrawide shape and does not collide with nearby booth controls.
- Verify the BPM/deck monitor shows separate Deck A and Deck B waveform strips with visible playhead progress.
- Verify clicking Deck A and Deck B waveform strips on the BPM/deck monitor seeks the matching track to the clicked position.
- Verify holding and dragging across Deck A and Deck B waveform strips scrubs the matching track until release.
- Verify the on-monitor SoundCloud waveform `-` and `+` buttons reduce/increase monitor waveform density from `x1` through `x4`.
- Verify the on-monitor SoundCloud waveform `-` and `+` buttons do not have visible floating 3D button boxes over the screen.
- Verify the BPM/deck monitor includes a readable right-side `BOOTH CONSOLE` section.
- Verify Deck A/B Play, Pause, Shuffle, Mute/Open, Sync, BPM buttons, cue buttons, and seek buttons each add a concise console line.
- Verify waveform resolution button presses add concise `WAVE RES` console lines.
- Verify crate row loading adds a load request line and the eventual track change line remains readable.
- Verify progress seek and platter scrub add one committed console line instead of spamming every drag frame.
- Verify monitor waveform clicks add one `WAVE SEEK` console line with the target time.
- Verify monitor waveform drags add one committed `WAVE SCRUB` console line on release instead of spamming every drag frame.
- Verify Deck A/B trim, crossfader, and master fader drags add final value lines on release.
- Verify widget ready and SoundCloud error lines appear once per transition/message when testable.
- Verify loaded SoundCloud tracks without accepted BPM show `BPM --` instead of a fake 120 BPM.
- Verify two small status monitors appear near the DJ OPEN sign area.
- Verify the center upper crossfader A/Mid/B snap controls still work as fallback.
- Verify the old Deck A/B Vol - and Vol + controls still work as fallback.
- Verify held fader controls do not block Play, Shuffle, seek, cue, crate, or station move interactions.
- Verify the same held fader controls behave safely in first-person, top-down player camera, and top-down freecam.
- Verify Grid Controller A and Grid Controller B appear as movable screen-style controller slabs near the SoundCloud DJ booth.
- Verify each grid controller screen shows a settings strip, all 64 `A1` through `H8` pad cells, deck id, status, pad count, burst length, volume, mute, and lock state.
- Verify unavailable grid pads appear dim/blocked and do not trigger audio.
- Load a track on Deck A and verify Grid A rolls 64 random pad positions for that track.
- Load a track on Deck B and verify Grid B rolls 64 random pad positions for that track.
- Aim at Grid A `ROLL`, `LEN-`, `LEN+`, `VOL-`, `VOL+`, `MUTE`, `LOCK`, and `TEST`; verify each action updates the grid state and adds concise booth console feedback.
- Repeat the settings strip check for Grid B.
- Aim at several Grid A pad cells and verify each triggers a short monophonic burst through the auxiliary Grid A SoundCloud widget while Deck A's main playback continues.
- Aim at several Grid B pad cells and verify each triggers a short monophonic burst through the auxiliary Grid B SoundCloud widget while Deck B's main playback continues.
- Rapidly hit two pads on the same grid and verify the newer burst steals/restarts the previous burst instead of overlapping.
- Verify Grid A's screen flash follows the last triggered Grid A pad and Grid B's screen flash follows the last triggered Grid B pad.
- Use the studio layout movement flow to pick up, rotate, place, and reset Grid A independently of the DJ booth.
- Use the studio layout movement flow to pick up, rotate, place, and reset Grid B independently of the DJ booth.
- Move Grid A and verify it still controls Deck A only; move Grid B and verify it still controls Deck B only.
- Verify grid controller movement hitboxes do not block core deck buttons, faders, monitor waveform controls, crate rows, or booth console interactions.

### Exit, Fallback, And Stability

- Click Exit from the ready 3D shell and verify the normal 2D dashboard remains usable.
- Re-enter with `syncsesh` after Exit and verify reveal/control recovery still works.
- If available, test with WebGL disabled or unsupported and verify the fallback panel appears after unlock.
- From the fallback panel, click Exit and verify the normal 2D dashboard remains usable.
- Verify no normal 2D level selector, 3D button, range selector, or debug control appears after fallback or Exit.
- Verify `?spike3d=1` still opens the rendering spike independently, if that legacy debug path is still expected.
- Verify no source-level recovery fix was needed for this manual pass.

## Entry And Exit

- Open normal app and verify no visible 3D affordance.
- Type `syncsesh`; verify shell opens.
- Click Exit; verify normal timer app remains usable.
- Re-enter with `syncsesh` only if current unlock flow allows transition testing.

## Reveal And Timer

- Enter shell and allow reveal to complete.
- Repeat entry and click Skip.
- Verify central timer text matches normal timer state.
- Change/start/reset timer from normal controls and verify 3D timer updates while shell is open.

## Station Reveal Fallback

- Open the app without joining session, type `syncsesh`, and verify the reveal starts from a desk computer instead of the big wall monitor.
- Verify the unjoined reveal does not add the local user to the lobby/session list.
- Verify ready, idle, and spectator counts do not change from the unjoined reveal.
- After unjoined reveal completes, click once to focus controls and verify it does not return to the 2D dashboard.
- Aim at the same local fallback monitor and press E; verify it returns to the 2D dashboard.
- Exit, click Join Session, type `syncsesh`, and verify the reveal starts from the joined user's assigned computer.
- Verify the joined user's local monitor-return station is the same station used for reveal.
- Verify joined reveal does not use the big wall monitor when station computers exist.
- Verify Exit returns to the normal 2D dashboard.
- Verify no visible 3D button, hint, or level selector appears in the normal 2D UI.

## Movement And Top-Down

- After reveal, move with W/A/S/D.
- Click inside the 3D view and verify mouse look activates where pointer lock is supported.
- Press Escape and verify pointer lock releases without closing the hidden world.
- In a browser or iframe where pointer lock is unavailable, drag inside the 3D view and verify fallback look works.
- Verify movement is clamped to room/station bounds.
- Press Tab once; verify top-down view appears.
- Press Tab again; verify first-person view returns.
- Verify W/A/S/D movement follows the current camera direction.
- Verify W/A/S/D does not move during reveal or while top-down view is active.
- Verify Space ready-hold still works outside the shell.

## First-Person Controls Hardening

- Unlock with `syncsesh`.
- Complete reveal or click Skip.
- Verify focus hint appears: `Click view to move`.
- Press W/A/S/D before clicking the canvas; verify camera does not move.
- Click the 3D canvas; verify hint disappears and `data-control-state` becomes `focused`, `pointer-locked`, or `pointer-lock-unavailable`.
- If pointer lock succeeds, move mouse without holding a button; verify camera looks around.
- Press Escape; verify pointer lock releases, active movement stops, and the shell remains open.
- If pointer lock is unavailable or rejected, drag inside the canvas; verify drag-look works.
- Verify W/A/S/D movement follows the current camera direction.
- Verify movement remains clamped by room bounds and blockers.
- Press Tab; verify top-down toggles on.
- Press Tab again; verify top-down toggles off and first-person look/position are restored.
- Verify W/A/S/D is paused while top-down is active.
- Click Exit; verify normal timer app remains usable.
- Verify typing in inputs/admin controls does not move the camera.
- Verify Space ready-hold still works outside the shell.
- Repeat in Discord Activity iframe if available.

## Station Return Interaction Hardening

- Join session, type `syncsesh`, and wait for the reveal to complete.
- First-click the 3D view and verify it focuses controls instead of returning to the dashboard.
- Verify W/A/S/D movement works after focus.
- If pointer lock succeeds, verify mouse look works without holding a button.
- If pointer lock is unavailable or rejected, verify drag-look fallback still works.
- Aim at the local resolved station monitor and press E; verify the return animation closes to the 2D dashboard.
- Re-enter, aim at the local monitor, and primary-click; verify it does not return to the dashboard.
- Aim at another station monitor and press E; verify it does not return to the dashboard.
- Enter or face the shooting range, aim at a target, and primary-click; verify shooting still works.
- Press Tab and verify top-down view disables the reticle, monitor return, and shooting.
- Click Exit and verify normal timer app remains usable.

## First-Person Body Polish

- Join session, type `syncsesh`, and wait for the reveal to complete.
- Verify the body is hidden before the first focus click while the focus hint is visible.
- Click to focus controls and verify the body appears only in first-person view.
- Look down and verify torso, legs, and feet are visible.
- Look forward and verify the body does not block the reticle or main movement view.
- Move with W/A/S/D and verify body bob is subtle.
- Aim at the local monitor and press E; verify dashboard return works and the body hides during return.
- Re-enter, press Tab, and verify the body hides in top-down view.
- Press Tab again and verify the body appears again in focused first-person view.
- Aim and shoot in the range; verify the body does not interfere with targeting.
- Click Exit and verify normal timer app remains usable.

## Interaction Primitive

- Unlock with `syncsesh`.
- Complete reveal or click Skip.
- Click the 3D canvas and verify controls activate.
- Verify the small center reticle appears only after controls are active.
- Press E with no production interactables and verify there is no visible side effect or console error.
- Press Tab and verify the top-down view toggles on while the reticle and interaction are inactive.
- Press Tab again and verify first-person view returns.
- Press Escape and verify pointer lock releases without closing the hidden world.
- Click Exit and verify normal timer app remains usable.
- Open with `?spike3d=1` and verify the rendering spike remains independent.

## Interaction Aim Context

- Unlock with `syncsesh`.
- Complete reveal or click Skip.
- Click the 3D canvas and verify controls activate.
- Verify the center reticle still appears only after controls are active.
- Press E with no production interactables and verify there is no visible side effect or console error.
- Verify no shooting targets, score, hit feedback, or Level 2 selector appears.
- Press Tab and verify top-down view disables the reticle and interaction behavior.
- Press Escape and verify pointer lock releases without closing the hidden world.
- Click Exit and verify normal timer app remains usable.

## Shooting Range Prototype

- Unlock with `syncsesh`.
- Complete reveal or click Skip.
- Click the 3D canvas once and verify this activates controls rather than firing a target.
- Turn toward the temporary south-wall prototype targets.
- Aim at a target and primary-click after controls are active.
- Verify the aimed target flashes briefly.
- Verify the local HITS display increments.
- Aim away from targets and click; verify no target flashes and HITS does not increment.
- Press Tab and verify top-down view disables shooting.
- Press Tab again and verify first-person view returns.
- Press Escape and verify pointer lock releases without closing the hidden world.
- Verify no Level 2 selector, synced scoreboard, challenge timer, or host controls appear in Level 1.
- Click Exit and verify normal timer app remains usable.

## Shooting Range Level Config

- Open the app without query params, type `syncsesh`, and verify the hidden shell opens Level 1.
- Verify Level 1 no longer shows shooting targets or the HITS display.
- Open the app with `?level=level-2-range`, type `syncsesh`, and verify the hidden shell opens the range.
- Verify the shell has `data-level-id="level-2-range"`.
- Complete reveal or click Skip.
- Click the 3D canvas to activate controls.
- Verify Level 2 shows lane strips, range targets, the timer display, and the local HITS display.
- Aim at range targets and primary-click; verify target flash and HITS increment.
- Press Tab and verify top-down still works and shooting is disabled while top-down is active.
- Press Escape and verify pointer lock releases without closing the hidden world.
- Click Exit, re-enter Level 2, and verify local HITS resets.
- Open with `?level=bad`, type `syncsesh`, and verify the shell falls back to Level 1.
- Verify no visible level selector, host range controls, synced scoreboard, challenge timer, or persistence appears.

## Range Challenge Mode

- Open with `?level=level-2-range`, type `syncsesh`, and enter Level 2.
- Complete reveal or click Skip.
- Click the 3D canvas once and verify this activates controls without starting the challenge.
- Verify the range display shows READY or FIRE TO START.
- Aim at a target and primary-click; verify the challenge starts and the timer begins near 30 seconds.
- Verify the hit target flashes and temporarily dims/disables before resetting.
- Verify SCORE and HITS increment on target hits.
- Aim away from targets and click during the challenge; verify MISS increments and accuracy changes.
- Continue until the timer reaches zero; verify the display shows DONE and final stats remain visible.
- Primary-click again after DONE; verify a fresh local challenge starts and stats reset.
- Press Tab during a run; verify top-down mode disables shooting.
- Press Escape and verify pointer lock releases without closing the hidden world.
- Click Exit and re-enter Level 2; verify challenge state resets.
- Open without query params and verify Level 1 has no range challenge UI.
- Verify no synced scoreboard, host controls, visible level selector, or persistence appears.

## Synced Scoreboard

- Open without query params, type `syncsesh`, and verify the hidden shell opens Level 1 with no range scoreboard.
- Open with `?level=level-2-range`, type `syncsesh`, and enter Level 2.
- Complete reveal or click Skip.
- Click the 3D canvas once and verify controls activate without starting the challenge.
- Complete a challenge and verify the local result appears on the range scoreboard.
- In mock mode, verify the local reducer and range display path in one browser instance only.
- For shared scoreboard verification, run the sync server and use WebSocket mode; mock mode will not share state between separate browser windows.
- In WebSocket mode, open a second client in the same session and verify the first client's completed result appears there.
- Complete a challenge on the second client and verify both rows appear on both clients.
- Improve one client's score and verify its row updates instead of duplicating.
- Fire during a challenge and verify shots are not reflected on the other client before challenge completion.
- Reset or replay the normal session round and verify old scoreboard rows clear or no longer display.
- Press Tab and verify top-down still disables shooting.
- Press Escape and verify pointer lock releases without closing the hidden world.
- Click Exit and verify the normal timer app remains usable.
- Open with `?spike3d=1` and verify the rendering spike remains independent and above the shell.

## Secret Door From Level 1

- Open the app without query params and verify no normal-app range selector, menu, button, or 3D hint appears.
- Type `syncsesh` and verify the hidden shell opens Level 1.
- Complete reveal or click Skip.
- Click the 3D canvas to activate controls.
- Locate the Level 1 east-wall RANGE door/panel.
- Aim at the RANGE door and press E.
- Verify the shell switches to `data-level-id="level-2-range"`.
- Verify reveal/control focus reset after the transition.
- Click the 3D canvas again and verify controls activate in Level 2.
- Verify range targets, challenge display, and synced scoreboard still work.
- Locate the Level 2 BACK door/panel.
- Aim at the BACK door and press E.
- Verify the shell switches back to `data-level-id="level-1"`.
- Open directly with `?level=level-2-range` and verify the dev shortcut still opens Level 2.
- Open with `?level=bad` and verify the shell falls back to Level 1.
- Open with `?spike3d=1` and verify the rendering spike remains independent and above the shell.
- Verify no synced free-roam presence, visible level selector, or normal-app range affordance appears.

## Synced Free-Roam Presence

- Start the sync server and run the app in WebSocket mode.
- Open two clients in the same session.
- Unlock both with `syncsesh`.
- In client A, complete reveal, click to focus controls, and walk in Level 1.
- Verify client B sees client A as a simple free-roam marker in Level 1.
- Verify client B does not see duplicate seated station presence for client A while A has fresh free-roam presence.
- Stop moving client A and verify the marker remains briefly without obvious jitter.
- Click Exit in client A and verify client B falls back to station presence after clear or stale timeout.
- Use the Level 1 RANGE door in client A and verify client B no longer sees A in Level 1 once A is in Level 2.
- Enter Level 2 in client B and verify A appears as a simple free-roam marker there.
- Verify range challenge and synced scoreboard still work in Level 2.
- Press Tab in one client and verify top-down camera position is not published as that user's free-roam pose.
- Open with `?level=level-2-range` and verify direct Level 2 entry still publishes Level 2 presence.
- Open with `?level=bad` and verify fallback to Level 1 still works.
- Confirm no normal-app presence controls, level selector, or new menus appear.

## Presence And Phase Feedback

- Add/toggle sim users with host tools.
- Verify occupied stations and statuses update.
- Trigger armed/precount/countdown/completed and verify room feedback changes.

## Sim Bot Roaming Render

- Add or keep idle sim users in the session.
- Enter the 3D world and verify idle sims appear as roaming markers instead of seated station occupants.
- Verify roaming sim labels read as `SIM ROAM` or equivalent.
- Toggle sim users ready and verify they return to station-based visuals.
- Set or observe spectating sims and verify they do not roam.
- Verify real local user movement and FPV body still work.
- Verify real remote free-roam presence still renders normally if available.
- Verify no new sync/network traffic is sent for sim movement.
- Verify range shooting still works.
- Verify local monitor return with E still works.
- Review `Level1RoomShell` and confirm there is no per-frame React state update for roaming.

## Sim Bot Roaming Toggle

- Open the 3D world with no `simRoam` query param and verify idle sim users roam as `SIM ROAM` markers.
- Open the 3D world with `?simRoam=0` and verify idle sim users remain station-based.
- With `?simRoam=0`, verify no `SimBotRoamingMarker`/`SIM ROAM` marker renders for idle sims.
- With `?simRoam=0`, verify ready and spectating sims remain station-based or otherwise non-roaming.
- With `?simRoam=1` or an unknown `simRoam` value, verify idle sims still roam.
- Verify the toggle has no visible normal 2D UI, settings control, button, menu, or hint.
- Verify real local movement, FPV body, local monitor return, and range shooting still work.
- Verify real remote free-roam markers still render normally if available.
- Review the implementation and confirm there are no sync events, reducer events, `freeRoamPresence` writes, `onUpdateFreeRoamPresence` calls, localStorage writes, or new network traffic for the toggle.

## Hero Monitor Wall

- Enter the hidden world with `syncsesh` and verify Level 1 renders the configured hero wall.
- Verify the large blue main dashboard is visible on the balcony/north wall.
- Verify the old hard-coded main dashboard and timer wall screens do not render on top of the configured hero wall.
- Verify the green side/status screens, timer ribbon, and smaller surrounding monitors are visible.
- Aim at the configured session/status screen and press E; verify it cycles modes using the existing session panel behavior.
- Verify other hero wall monitors do not become clickable.
- Verify local station monitor return with E still works.
- Verify the old east range opening is visually resolved/blocked, and direct Level 2 range loading still works.
- Verify WASD, pointer lock, Tab top-down, FPV body, hidden unlock, sim roaming, jukebox, and the normal 2D dashboard remain unchanged.

## RGB Workstation Props

- Enter the hidden world with `syncsesh` and verify Level 1 renders decorative RGB workstation rigs around the Control Room edges.
- Verify each decorative rig reads as a desk with a monitor, glowing keyboard, RGB PC tower, and small desktop detail.
- Verify the decorative rigs do not replace or alter assigned user stations.
- Verify local station monitor return with E still works from the assigned/local station monitor.
- Verify the decorative workstation monitors are not clickable return targets.
- Verify the hero wall remains readable and unobstructed.
- Verify balcony/stairs remain readable.
- Verify the old east range opening is visually resolved/blocked, and direct Level 2 range loading still works.
- Verify movement lanes remain usable and no new collision blockers were added.
- Verify sim roaming markers remain visible and are not obviously hidden inside decorative props.

## Lounge Props

- Enter the hidden world with `syncsesh` and verify Level 1 renders a decorative lounge/couch area.
- Verify the lounge includes a couch-like base, back, arms, cushions, and a small low table/detail.
- Verify the lounge does not include kitchen, island, bar, countertop, or lighter props.
- Verify the lounge is not clickable and does not return to the dashboard.
- Verify assigned stations and local monitor return still work.
- Verify the hero wall remains readable and unobstructed.
- Verify RGB workstation props remain visible.
- Verify balcony/stairs remain readable.
- Verify the old east range opening is visually resolved/blocked, and direct Level 2 range loading still works.
- Verify movement lanes remain usable and no new collision blockers were added.
- Verify sim roaming markers remain visible and are not obviously hidden inside the lounge.

## Kitchen Island Props

- Enter the hidden world with `syncsesh` and verify Level 1 renders a decorative kitchen/bar island area.
- Verify the island has a readable base and countertop form.
- Verify at least two small countertop props are visible.
- Verify the blow torch lighter prop is visible on the countertop and reads as distinct from generic props.
- Verify the kitchen/island is not clickable and does not return to the dashboard.
- Verify no smoking/cooking mechanics, pickup behavior, inventory, or new UI appears.
- Verify assigned stations and local monitor return still work.
- Verify the hero wall remains readable and unobstructed.
- Verify RGB workstation props and lounge props remain visible.
- Verify balcony/stairs remain readable.
- Verify the old east range opening is visually resolved/blocked, and direct Level 2 range loading still works.
- Verify movement lanes remain usable and no new collision blockers were added.
- Verify sim roaming markers remain visible and are not obviously hidden inside kitchen props.

## Expanded Control Room Readability

- Enter the hidden world with `syncsesh` and walk around the expanded Control Room in first-person.
- Verify the east wall is visually closed except for the readable RANGE door treatment.
- Verify the old range opening is not walk-through in Level 1.
- Verify the hero wall remains readable and unobstructed.
- Verify RGB workstations, lounge, and kitchen island are visually distinct.
- Press Tab and verify top-down framing still gives a useful overview of Level 1.
- Verify assigned stations and local monitor return still work.
- Verify range shooting still works.
- Verify sim roaming markers remain visible enough and are not obviously hidden inside props.
- Verify no new props, interactions, collision blockers, movement mechanics, jukebox behavior, normal UI, or sync behavior were added.

## Jukebox State Extraction

- Load the app and verify the SoundCloud panel still appears normally.
- Verify the SoundCloud iframe loads inside the normal React panel.
- Verify the playlist selector still changes playlist.
- Verify Play/Pause still works after the widget is ready.
- Verify Shuffle still starts or changes playback.
- If an error state can be triggered, verify Retry still resets/reloads the player.
- Verify waveform progress still updates.
- Verify clicking the waveform still seeks in the 2D panel.
- Verify the waveform popout still opens and closes.
- Type `syncsesh` and verify entering/exiting 3D still works.
- Verify no 3D jukebox appears yet.
- Verify no 3D jukebox controls appear yet.
- Verify normal timer, range, sim roaming, Control Room props, hero wall, hidden unlock, and normal recovery remain unchanged.

## Fallback Recovery

- Test on a browser/device with WebGL disabled if available.
- Verify fallback panel appears after unlock.
- Click Exit and verify normal timer app is still usable.
- Verify no new 3D affordance appears in default UI.
