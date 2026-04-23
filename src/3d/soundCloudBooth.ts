import type {
  JukeboxActions,
  JukeboxDisplayState,
  SoundCloudBpmActions,
  SoundCloudHotCueActions,
  SoundCloudHotCueState,
  SoundCloudSeekActions,
} from "../hooks/useSoundCloudPlayer";

export type SoundCloudBoothDeckId = "A" | "B";
export type SoundCloudBoothConsoleEventKind =
  | "deck"
  | "mixer"
  | "cue"
  | "bpm"
  | "seek"
  | "sync"
  | "system"
  | "error";

export interface SoundCloudBoothConsoleEvent {
  id: string;
  timestamp: number;
  kind: SoundCloudBoothConsoleEventKind;
  deckId?: SoundCloudBoothDeckId;
  label: string;
  detail?: string;
}

export type SoundCloudBoothConsoleEventInput = Omit<SoundCloudBoothConsoleEvent, "id" | "timestamp">;

export interface SoundCloudBoothDeck {
  id: SoundCloudBoothDeckId;
  label: string;
  display: JukeboxDisplayState;
  actions: JukeboxActions;
  seekActions: SoundCloudSeekActions;
  bpmActions: SoundCloudBpmActions;
  hotCueState: SoundCloudHotCueState;
  hotCueActions: SoundCloudHotCueActions;
  trimPercent: number;
  outputPercent: number;
  isMuted?: boolean;
  syncLabel?: string;
  onSetTrimPercent?: (value: number) => void;
  onToggleMute?: () => void;
  onSyncToOtherDeck?: () => string | void;
}

export interface SoundCloudBoothMixer {
  crossfader: number;
  masterVolume: number;
  deckAOutputPercent: number;
  deckBOutputPercent: number;
  onSetCrossfader?: (value: number) => void;
  onSetMasterVolume?: (value: number) => void;
}

export interface SoundCloudBoothState {
  decks: [SoundCloudBoothDeck, SoundCloudBoothDeck];
  mixer: SoundCloudBoothMixer;
  consoleEvents?: SoundCloudBoothConsoleEvent[];
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
}
