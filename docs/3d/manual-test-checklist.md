# 3D Hidden World Manual Test Checklist

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

## Movement And Top-Down

- After reveal, move with W/A/S/D.
- Verify movement is clamped to room/station bounds.
- Hold Tab; verify top-down view appears.
- Release Tab; verify first-person view returns.
- Verify Space ready-hold still works outside the shell.

## Presence And Phase Feedback

- Add/toggle sim users with host tools.
- Verify occupied stations and statuses update.
- Trigger armed/precount/countdown/completed and verify room feedback changes.

## Fallback Recovery

- Test on a browser/device with WebGL disabled if available.
- Verify fallback panel appears after unlock.
- Click Exit and verify normal timer app is still usable.
- Verify no new 3D affordance appears in default UI.
