# Discord Auth Render And Cloudflare Proof Notes

Date: 2026-04-29

## Purpose

This document records the current Discord Activity auth migration work for Sync Sesh: where the recovery started, what we tried, what failed, what worked, and what the next production direction should be.

The short version:

- Render works for the frontend.
- Render works for WebSocket sync.
- Render did not work for Discord OAuth token exchange.
- Cloudflare Tunnel worked as a proof of concept for the token exchange path.
- The likely production shape is Render for app/sync plus an always-on Cloudflare-hosted or otherwise non-Render token exchange endpoint.

## Starting Point

Sync Sesh already had a Discord Activity auth recovery plan in:

- `docs/bugs/bug_1_discord_auth_recovery_plan.md`

The recovery goal was to bring Sync Sesh back to the known-good Discord Activity flow proven in the clean test repo:

1. Initialize the Discord Embedded App SDK.
2. Wait for `sdk.ready()`.
3. Request authorization with silent auth first.
4. Fall back to consent auth if needed.
5. Send the authorization code to a backend token route.
6. Exchange the code server-side using:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI`
7. Authenticate the SDK with the returned access token.
8. Use the authenticated Discord identity instead of a local fallback profile.

The frontend intentionally does not send `redirect_uri` in the SDK authorize request. The redirect URI is backend exchange configuration only.

## Render Migration Goal

The first hosted migration goal was:

- Host the frontend as a Render Static Site.
- Host the sync and token-exchange backend as a Render Web Service.
- Point Discord Activity URL mappings at Render.

The intended Discord Activity mapping shape was:

```text
/      -> sync-sesh-front-test.onrender.com
/api   -> discord-test-rwbv.onrender.com/api
/ws    -> discord-test-rwbv.onrender.com
/sync  -> discord-test-rwbv.onrender.com
```

Later, a second Render Web Service was tested:

```text
/api   -> sync-sesh-1.onrender.com/api
/ws    -> sync-sesh-1.onrender.com
/sync  -> sync-sesh-1.onrender.com
```

The `/api` target includes `/api` because the Discord Activity proxy mapping behavior used here effectively needs the target path to preserve the API prefix.

## Confirmed Render Setup

The backend environment was confirmed with `/health`:

```json
{
  "ok": true,
  "service": "sync-sesh-sync",
  "discord_oauth": {
    "has_client_id": true,
    "has_client_secret": true,
    "redirect_uri": "https://127.0.0.1",
    "missing": []
  }
}
```

The Render backend env shape:

```text
DISCORD_CLIENT_ID=1498715120480682155
DISCORD_CLIENT_SECRET=<Discord app secret>
DISCORD_REDIRECT_URI=https://127.0.0.1
```

The Render frontend env shape:

```text
VITE_DISCORD_CLIENT_ID=1498715120480682155
VITE_DISCORD_REDIRECT_URI=https://127.0.0.1
VITE_ENABLE_DISCORD_SDK=true
VITE_SYNC_MODE=ws
VITE_SYNC_SERVER_URL=https://discord-test-rwbv.onrender.com
```

## What Worked On Render

The frontend loaded inside Discord Activity.

The Discord SDK initialized:

```text
sdk:ready:success
```

Silent authorization returned an authorization code:

```text
auth:silent:success
```

WebSocket sync connected through Render:

```text
sync:connect:success
Received snapshot
Joined shared session
```

This proved:

- The Discord root mapping worked.
- The SDK launch context worked.
- The `/ws` mapping worked.
- The app could leave the loading screen.
- The Render sync server was viable for shared-session transport.

## What Failed On Render

The backend token exchange failed when Render tried to call Discord's OAuth token endpoint.

Render logs showed:

```text
Discord token exchange failed.
status: 429
response_preview: Access denied | discord.com used Cloudflare to restrict access
retry_after: 81671
```

A second Render Web Service produced the same failure shape:

```text
status: 429
Access denied | discord.com used Cloudflare to restrict access
retry_after: 75379
```

This showed the problem was not the Discord URL mappings, frontend env, backend env, or client secret. The request reached the Sync Sesh backend, but Discord/Cloudflare rejected Render's outbound request to Discord.

Conclusion:

```text
Render should not currently be used for /api/discord/token.
```

## Local Cloudflare Tunnel Proof

To isolate the failing part, `/api` was moved off Render and onto a Cloudflare Tunnel pointing at the local sync server.

Local backend:

```powershell
npm run dev:sync-server
```

Cloudflare Tunnel:

```powershell
cloudflared tunnel --url http://localhost:8787
```

Proof-of-concept Discord mapping:

```text
/      -> sync-sesh-front-test.onrender.com
/api   -> <trycloudflare-host>.trycloudflare.com/api
/ws    -> sync-sesh-1.onrender.com
/sync  -> sync-sesh-1.onrender.com
```

The `/api` request reached the local backend. This was confirmed because frontend errors referenced:

```text
build 0.1.0-dev
```

instead of the deployed Render build id.

## Cloudflare Tunnel Debug Steps

The first local tunnel attempt proved routing but failed with a backend-to-Discord upstream error:

```text
status: 503
upstream connect error or disconnect/reset before headers
```

Local checks then proved the machine and Node could reach Discord's token endpoint with a fake request, receiving a normal Discord `400` response.

After retrying, the failure changed to:

```text
{"error": "invalid_client"}
```

That proved the network path was working and the remaining issue was the local backend's Discord client credentials.

The local `.env` was checked and corrected:

```text
VITE_DISCORD_CLIENT_ID=1498715120480682155
DISCORD_CLIENT_ID=1498715120480682155
DISCORD_CLIENT_SECRET=<current 32-character Discord app secret>
DISCORD_REDIRECT_URI=https://127.0.0.1
```

The local sync server had to be restarted after fixing `.env` because the server keeps env values in memory after startup.

After restarting the visible PowerShell sync-server process, the proof of concept worked.

## Current Working Proof-Of-Concept Shape

Current proven architecture:

```text
Discord Activity
  -> / root mapping
  -> Render frontend

Discord Activity
  -> /ws and /sync mappings
  -> Render Web Service
  -> WebSocket shared session

Discord Activity
  -> /api mapping
  -> Cloudflare Tunnel
  -> local sync server
  -> Discord OAuth token exchange
```

This proves that splitting the token exchange route away from Render solves the Render egress block.

## Important Identity Interpretation

Seeing the user's name and avatar in the UI does not by itself prove Discord OAuth succeeded.

The debug snapshot must be checked.

Good sign:

```text
auth:token-exchange:success
Identity Source: discord
```

Fallback sign:

```text
auth:token-exchange:failed
Identity Source: local_fallback
```

The local fallback can still show a name and avatar, so the app UI alone is not enough to verify authenticated Discord identity.

## Temporary Vs Production

The Cloudflare Tunnel proof is not production-ready when using a quick tunnel:

```powershell
cloudflared tunnel --url http://localhost:8787
```

That tunnel only works while the local computer and terminal process stay online. The trycloudflare URL can also change whenever the tunnel restarts.

The production direction should be one of:

1. A Cloudflare Worker that implements only `POST /api/discord/token`.
2. A named Cloudflare Tunnel running on always-on infrastructure.
3. A different backend host or VPS whose outbound requests to Discord are not blocked.

The most practical next production step is likely:

```text
/      -> Render frontend
/ws    -> Render sync backend
/sync  -> Render sync backend
/api   -> Cloudflare Worker token exchange
```

## Next Goal

Replace the temporary local Cloudflare Tunnel with an always-on `/api/discord/token` service.

Recommended next implementation:

1. Build a small Cloudflare Worker token endpoint.
2. Store `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI` as Worker secrets/env.
3. Support `POST /api/discord/token`.
4. Optionally support `POST /api/token` as a compatibility alias.
5. Keep the same safe diagnostic response style as `server/sync-server.ts`.
6. Point Discord Activity `/api` to the Worker route.
7. Keep `/ws` and `/sync` on Render unless sync shows a separate problem.

