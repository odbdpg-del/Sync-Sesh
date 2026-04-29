# Discord Auth Current Architecture

Date: 2026-04-29

This is the source-of-truth overview for the current Sync Sesh Discord Activity deployment.

## Current Hosted Shape

Discord Activity URL mappings:

```text
/      -> sync-sesh-front-test.onrender.com
/api   -> sync-sesh-discord-token.syncseshtest.workers.dev/api
/ws    -> sync-sesh-1.onrender.com
/sync  -> sync-sesh-1.onrender.com
```

Service ownership:

```text
Render Static Site
  Serves the Vite frontend.

Cloudflare Worker
  Handles Discord OAuth token exchange.
  Exposes /api/discord/token, /api/token, and /health.

Render Web Service
  Handles WebSocket sync.
  Exposes /ws, /sync-compatible behavior, generated names, and /health.
```

No local terminal, local sync server, or quick Cloudflare Tunnel is required for the current hosted proof.

## Why The Split Exists

Render worked for:

- frontend hosting
- WebSocket sync
- Discord Activity `/ws` and `/sync` proxy mappings

Render did not work for Discord OAuth token exchange. Discord/Cloudflare returned `429` / access-denied responses when the Render backend tried to call Discord's OAuth token endpoint.

The Cloudflare Worker owns `/api` because it successfully completes the token exchange without depending on a local machine or the Render outbound path.

## Runtime Flow

1. A user launches the Discord Activity.
2. Discord loads the frontend through the root mapping:

```text
1498715120480682155.discordsays.com -> sync-sesh-front-test.onrender.com
```

3. The frontend initializes the Discord Embedded App SDK.
4. The frontend requests Discord authorization:
   - silent auth first
   - consent fallback if needed
5. Discord returns an authorization code.
6. The frontend posts the code to:

```text
/api/discord/token
```

7. Discord's Activity proxy routes `/api` to:

```text
sync-sesh-discord-token.syncseshtest.workers.dev/api
```

8. The Worker exchanges the code with Discord using:

```text
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI=https://127.0.0.1
```

9. The Worker returns the Discord access token to the frontend.
10. The frontend calls SDK `authenticate`.
11. The app uses the authenticated Discord identity.
12. Separately, the frontend connects WebSocket sync through:

```text
/ws -> sync-sesh-1.onrender.com
```

## Environment Ownership

### Render Frontend

Current important env:

```text
VITE_ENABLE_DISCORD_SDK=true
VITE_DISCORD_CLIENT_ID=1498715120480682155
VITE_DISCORD_REDIRECT_URI=https://127.0.0.1
VITE_SYNC_MODE=ws
VITE_SYNC_SERVER_URL=https://discord-test-rwbv.onrender.com
```

Inside Discord, the app uses same-origin Activity proxy routes for `/api` and `/ws`, so `VITE_SYNC_SERVER_URL` is mostly for non-Discord diagnostics/direct browser behavior.

### Cloudflare Worker

Worker name:

```text
sync-sesh-discord-token
```

Worker URL:

```text
https://sync-sesh-discord-token.syncseshtest.workers.dev
```

Worker vars:

```text
DISCORD_CLIENT_ID=1498715120480682155
DISCORD_REDIRECT_URI=https://127.0.0.1
BUILD_ID=worker-dev
```

Worker secret:

```text
DISCORD_CLIENT_SECRET
```

Health check:

```text
https://sync-sesh-discord-token.syncseshtest.workers.dev/health
```

Expected health:

```json
{
  "ok": true,
  "service": "sync-sesh-discord-token",
  "discord_oauth": {
    "has_client_id": true,
    "has_client_secret": true,
    "redirect_uri": "https://127.0.0.1",
    "missing": []
  }
}
```

### Render Sync Backend

Current backend URL:

```text
https://sync-sesh-1.onrender.com
```

Render handles:

- `/ws`
- `/sync`
- `/health`
- shared session state

The backend may still contain `/api/discord/token`, but Discord Activity production mapping should not use Render for `/api` unless the Render outbound block is resolved.

## Discord Developer Portal

Activity URL mappings should be:

```text
Root Mapping:
/      -> sync-sesh-front-test.onrender.com

Proxy Path Mappings:
/api   -> sync-sesh-discord-token.syncseshtest.workers.dev/api
/ws    -> sync-sesh-1.onrender.com
/sync  -> sync-sesh-1.onrender.com
```

Portal notes:

- Do not include `https://`.
- Keep `/api` in the target path.
- Do not point `/api` to Render unless testing a new backend provider.
- Keep `/sync` for compatibility.
- Keep `/ws` for the active WebSocket transport.

## What Friends Need To Do

Friends should only need to launch the Discord Activity.

They do not need:

- local terminals
- `cloudflared`
- Render access
- Cloudflare access
- Discord Developer Portal access

If nobody has used the app recently, the first launch can be slow because the free Render Web Service may spin down. The first user may need to wait while `/ws` wakes up.

If the first launch appears stuck:

1. Wait about a minute.
2. Relaunch the Activity.
3. Check the debug console if available.

## Expected Debug Console Success

Run:

```text
snapshot
filter auth
```

Good auth path:

```text
auth:silent:success
auth:token-exchange:success
auth:authenticate:success
identity:authenticated_discord
```

Good sync path:

```text
sync:connect:success
Received snapshot
Joined shared session
```

## Common Failure Meanings

### `invalid_client`

The active `/api` backend has the wrong Discord client secret for app `1498715120480682155`.

Fix:

```powershell
npx.cmd wrangler secret put DISCORD_CLIENT_SECRET --config workers/discord-token-exchange/wrangler.jsonc
npx.cmd wrangler deploy --config workers/discord-token-exchange/wrangler.jsonc
```

Use the current Discord app secret from the Discord Developer Portal.

### `invalid_grant`

The Discord code or redirect URI is invalid.

Check:

```text
DISCORD_REDIRECT_URI=https://127.0.0.1
```

and confirm that exact redirect URI exists in the Discord Developer Portal.

### `Identity Source: local_fallback`

The app is showing a fallback/local profile. It may still show the user's name/avatar, but that does not prove OAuth succeeded.

Check `filter auth` for token exchange and authenticate failures.

### Sync Fails But Auth Works

Check Render:

```text
https://sync-sesh-1.onrender.com/health
```

Then check Discord mappings:

```text
/ws   -> sync-sesh-1.onrender.com
/sync -> sync-sesh-1.onrender.com
```

### Slow First Load

Likely Render free-tier cold start. The Worker is not the slow part; `/ws` wake-up is the likely delay.

## Deploy Commands

Deploy Worker:

```powershell
npx.cmd wrangler deploy --config workers/discord-token-exchange/wrangler.jsonc
```

Update Worker secret:

```powershell
npx.cmd wrangler secret put DISCORD_CLIENT_SECRET --config workers/discord-token-exchange/wrangler.jsonc
```

Render frontend/backend deploy from GitHub branch as configured in Render.

## Related Docs

- `docs/Discord-Auth/render-cloudflare-poc-notes.md`
- `docs/bugs/bug_1_discord_auth_recovery_plan.md`
- `workers/discord-token-exchange/README.md`
