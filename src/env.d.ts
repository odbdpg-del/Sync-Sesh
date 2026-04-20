/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID?: string;
  readonly VITE_ENABLE_DISCORD_SDK?: string;
  readonly VITE_SYNC_MODE?: "mock" | "ws";
  readonly VITE_SYNC_SERVER_URL?: string;
  readonly VITE_SYNC_SESSION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
