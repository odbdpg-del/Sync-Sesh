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
  artwork_url?: string;
  title?: string;
  permalink_url?: string;
  waveform_url?: string;
  user?: {
    username?: string;
  };
}

interface SoundCloudWidgetInstance {
  bind(eventName: string, listener: (...args: unknown[]) => void): void;
  unbind(eventName: string): void;
  load(url: string, options?: Record<string, unknown>): void;
  play(): void;
  pause(): void;
  toggle(): void;
  skip(soundIndex: number): void;
  seekTo(milliseconds: number): void;
  getSounds(callback: (sounds: SoundCloudWidgetSound[]) => void): void;
  getCurrentSound(callback: (sound: SoundCloudWidgetSound | null) => void): void;
  getDuration(callback: (duration: number) => void): void;
  getPosition(callback: (position: number) => void): void;
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
