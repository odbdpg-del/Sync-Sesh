# Sync Sesh Discord Token Worker

This Worker replaces the temporary quick Cloudflare Tunnel for Discord Activity OAuth token exchange.

It handles:

- `POST /api/discord/token`
- `POST /api/token`
- `GET /health`

The Render sync backend should still handle `/ws` and `/sync`.

## Local Setup

Copy the example dev vars file:

```powershell
Copy-Item workers\discord-token-exchange\.dev.vars.example workers\discord-token-exchange\.dev.vars
```

Edit `.dev.vars` and set the real Discord client secret:

```text
DISCORD_CLIENT_SECRET=<current Discord app secret>
```

Run locally:

```powershell
npx.cmd wrangler dev --config workers/discord-token-exchange/wrangler.jsonc
```

## Deploy

Set the production secret:

```powershell
npx.cmd wrangler secret put DISCORD_CLIENT_SECRET --config workers/discord-token-exchange/wrangler.jsonc
```

The Worker config declares `DISCORD_CLIENT_SECRET` as a required secret, so deploys will fail clearly until that secret exists.

Deploy:

```powershell
npx.cmd wrangler deploy --config workers/discord-token-exchange/wrangler.jsonc
```

Open the Worker health route:

```text
https://<worker-host>/health
```

Expected shape:

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

## Discord Activity URL Mappings

After deploy, update the Discord Developer Portal Activity mappings:

```text
/      -> sync-sesh-front-test.onrender.com
/api   -> <worker-host>/api
/ws    -> sync-sesh-1.onrender.com
/sync  -> sync-sesh-1.onrender.com
```

Do not include `https://` in the Discord mapping target.

## Verification

Relaunch the Activity, open the debug console, and run:

```text
snapshot
filter auth
```

Expected auth path:

```text
auth:silent:success
auth:token-exchange:success
auth:authenticate:success
identity:authenticated_discord
```

Sync should continue using Render:

```text
sync:connect:success
```
