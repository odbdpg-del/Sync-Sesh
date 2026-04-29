# DabSync

Discord Activity MVP foundation for a synchronized social countdown experience.

## Run locally

1. Install dependencies: `npm install`
2. Start the frontend: `npm run dev`
3. Open the Vite URL in your browser

For multi-client local sync testing:

1. Start the sync server in another terminal: `npm run dev:sync-server`
2. Create `.env.local`
3. Start the frontend with `npm run dev`

## Environment variables

```bash
VITE_ENABLE_DISCORD_SDK=true
VITE_DISCORD_CLIENT_ID=your_discord_application_id
VITE_DISCORD_REDIRECT_URI=https://127.0.0.1
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://127.0.0.1
VITE_SYNC_MODE=mock
VITE_SYNC_SERVER_URL=ws://localhost:8787
VITE_SYNC_SESSION_ID=dabsync-room
```

Notes:

- `VITE_ENABLE_DISCORD_SDK` defaults to `false` for browser-only local work.
- `VITE_DISCORD_CLIENT_ID` is read by the frontend Discord Activity runtime.
- `VITE_DISCORD_REDIRECT_URI` is retained for diagnostics and local parity, but the live frontend authorize request does not send `redirect_uri`.
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are read by the sync server for OAuth code exchange.
- `DISCORD_CLIENT_SECRET` is read only by the sync server for OAuth token exchange. Do not expose it publicly.
- `DISCORD_REDIRECT_URI` should match the placeholder Redirect URI configured in the Discord Developer Portal exactly. Discord's Activity guide uses `https://127.0.0.1`.
- The sync server falls back from `DISCORD_CLIENT_ID` to `VITE_DISCORD_CLIENT_ID`, and from `DISCORD_REDIRECT_URI` to `VITE_DISCORD_REDIRECT_URI`, but production setup should still provide the server-side variables explicitly.
- Set `VITE_SYNC_MODE=ws` to use the local WebSocket sync server.
- `VITE_SYNC_SESSION_ID` lets multiple browser windows join the same room.
- In the current hosted Discord Activity deployment, `/api` is routed through Discord Activity URL mappings to the Cloudflare Worker token exchange endpoint. Render still handles frontend hosting and WebSocket sync.

Recommended split:

- Frontend Activity env:
  - `VITE_ENABLE_DISCORD_SDK`
  - `VITE_DISCORD_CLIENT_ID`
  - `VITE_DISCORD_REDIRECT_URI`
  - `VITE_SYNC_SERVER_URL`
- Sync server env:
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `DISCORD_REDIRECT_URI`

## Discord Activity setup

1. Create or open your Discord application in the Discord Developer Portal.
2. Copy the Discord application ID into both:
   - `VITE_DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_ID`
3. Add the redirect URI in the Developer Portal exactly as configured in:
   - `VITE_DISCORD_REDIRECT_URI`
   - `DISCORD_REDIRECT_URI`
4. Set `DISCORD_CLIENT_SECRET` only on the backend that owns token exchange. In the current hosted deployment, that is the Cloudflare Worker.
5. Make sure Discord Activity URL mappings send `/api` to the token Worker and `/ws` to the Render sync server.
6. Start the Activity with `VITE_ENABLE_DISCORD_SDK=true`.

## Current hosted Discord Activity deployment

The current hosted architecture is documented in:

- `docs/Discord-Auth/current-architecture.md`

Current Discord Activity URL mappings:

```text
/      -> sync-sesh-front-test.onrender.com
/api   -> sync-sesh-discord-token.syncseshtest.workers.dev/api
/ws    -> sync-sesh-1.onrender.com
/sync  -> sync-sesh-1.onrender.com
```

Render hosts the frontend and WebSocket sync backend. Cloudflare Worker handles Discord OAuth token exchange because Render outbound requests to Discord's OAuth token endpoint were blocked by Discord/Cloudflare during testing.

## Render sync server deployment

The sync server is ready to run as a Render Web Service. It still contains token-exchange routes for local/testing compatibility, but the current hosted Discord Activity maps `/api` to Cloudflare Worker rather than Render.

1. Create a new Render Blueprint from `render.yaml`, or create a Node Web Service manually.
2. Use `npm ci` as the build command.
3. Use `npm run start:sync-server` as the start command.
4. Set Discord OAuth Render variables only if you are testing Render token exchange directly:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI=https://127.0.0.1`
5. After deploy, open `https://your-service.onrender.com/health` and confirm `discord_oauth.missing` is empty.
6. Set the frontend Activity env `VITE_SYNC_SERVER_URL` to the Render service origin, for example `https://your-service.onrender.com`.
7. In the Discord Developer Portal Activity URL mappings, point `/ws` and `/sync` at the Render service host.

Inside Discord, Sync Sesh uses same-origin `/api/discord/token` and `/ws` paths through the Activity proxy mappings. The sync server also accepts `/api/token` as a compatibility alias for token exchange diagnostics. Outside Discord, `VITE_SYNC_SERVER_URL` can still point directly at the Render service for browser testing.

## Cloudflare Worker token exchange

The current hosted `/api` token exchange lives in:

- `workers/discord-token-exchange`

Deploy/update it with:

```powershell
npx.cmd wrangler deploy --config workers/discord-token-exchange/wrangler.jsonc
```

Update the Discord client secret with:

```powershell
npx.cmd wrangler secret put DISCORD_CLIENT_SECRET --config workers/discord-token-exchange/wrangler.jsonc
```

## GitHub Pages legal pages

This repo includes simple hosted-ready legal pages in `docs/`:

- `docs/terms.html`
- `docs/privacy.html`
- `docs/index.html`

To publish them with GitHub Pages:

1. Push this repo to GitHub.
2. In GitHub, open `Settings -> Pages`.
3. Under `Build and deployment`, choose `Deploy from a branch`.
4. Select your default branch.
5. Select `/docs` as the folder.
6. Save.

Your URLs will look like:

- `https://<your-github-username>.github.io/<repo-name>/terms.html`
- `https://<your-github-username>.github.io/<repo-name>/privacy.html`

## Discord Activity wiring

- The app boots the Discord Embedded App SDK only when `VITE_ENABLE_DISCORD_SDK=true` and a valid `VITE_DISCORD_CLIENT_ID` is present.
- In Discord, this frontend is expected to run inside the embedded activity iframe, while the sync layer continues to provide shared room state.
- The current local sync server is separate from Discord and is only for MVP testing.

## Sync layer

- `mock` mode keeps everything local for solo development.
- `ws` mode connects clients to a lightweight in-memory WebSocket room server.
- The server is authoritative for session events and countdown timestamps.
- Clients render time using the shared timestamps plus estimated server clock offset.

## Manual test checklist

- Start in `mock` mode and confirm lobby, ready hold, ARMED, pre-count, countdown, completed, and replay all work.
- Change the timer with presets and numeric input, then verify the chosen duration is used for the next round.
- Join during `precount`, `countdown`, and `completed`, and confirm the late joiner stays spectating until replay.
- Run in `ws` mode with two browser windows and confirm both windows show the same countdown progression.
- Stop the sync server during a session and confirm disconnected messaging appears and controls are blocked.

## Roadmap

- Reactions
- GIF support if it still fits the lightweight activity model
- Per-server stats
- Crews
- Optional Discord bot helpers
