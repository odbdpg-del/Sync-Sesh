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
VITE_ENABLE_DISCORD_SDK=false
VITE_DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://127.0.0.1
VITE_SYNC_MODE=mock
VITE_SYNC_SERVER_URL=ws://localhost:8787
VITE_SYNC_SESSION_ID=dabsync-room
```

Notes:
- `VITE_ENABLE_DISCORD_SDK` defaults to `false` for browser-only local work.
- `DISCORD_CLIENT_SECRET` is read only by the sync server for OAuth token exchange. Do not expose it publicly.
- `DISCORD_REDIRECT_URI` should match the placeholder Redirect URI configured in the Discord Developer Portal. Discord’s Activity guide uses `https://127.0.0.1`.
- Set `VITE_SYNC_MODE=ws` to use the local WebSocket sync server.
- `VITE_SYNC_SESSION_ID` lets multiple browser windows join the same room.
- In hosted environments, the frontend now derives the Discord token-exchange endpoint from `VITE_SYNC_SERVER_URL`, so your deployed sync server should be the service that exposes `/api/discord/token`.

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
