/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID?: string;
  readonly VITE_ENABLE_DISCORD_SDK?: string;
  readonly VITE_3D_SECRET_CODE?: string;
  readonly VITE_SYNC_MODE?: "mock" | "ws";
  readonly VITE_SYNC_SERVER_URL?: string;
  readonly VITE_SYNC_SESSION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface SoundCloudWidgetSound {
  artwork_url?: string | null;
  duration?: number;
  metadata_artist?: string | null;
  permalink_url?: string;
  title?: string;
  user?: {
    permalink_url?: string;
    username?: string;
  };
}

interface SoundCloudWidgetInstance {
  bind(eventName: string, listener: (...args: unknown[]) => void): void;
  unbind(eventName: string): void;
  getDuration(callback: (duration: number) => void): void;
  getPosition(callback: (position: number) => void): void;
  getVolume(callback: (volume: number) => void): void;
  load(url: string, options?: Record<string, unknown>): void;
  play(): void;
  pause(): void;
  seekTo(milliseconds: number): void;
  setVolume(volume: number): void;
  toggle(): void;
  skip(soundIndex: number): void;
  getSounds(callback: (sounds: SoundCloudWidgetSound[]) => void): void;
  getCurrentSound(callback: (sound: SoundCloudWidgetSound | null) => void): void;
}

interface SoundCloudWidgetStatic {
  (target: HTMLIFrameElement | string): SoundCloudWidgetInstance;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
    ERROR: string;
  };
}

interface Window {
  SC?: {
    Widget: SoundCloudWidgetStatic;
  };
}
