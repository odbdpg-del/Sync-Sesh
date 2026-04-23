import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { LevelAreaConfig, LevelOpeningConfig } from "./levels";
import type { PhaseVisuals } from "./phaseVisuals";
import type {
  SoundCloudBoothConsoleEvent,
  SoundCloudBoothConsoleEventInput,
  SoundCloudBoothDeck,
  SoundCloudBoothGridController,
  SoundCloudBoothGridPadId,
  SoundCloudBoothMixer,
  SoundCloudBoothState,
} from "./soundCloudBooth";
import { useInteractionRegistry, useRegisterInteractable } from "./interactions";
import { getSharedDawClipSlotId } from "../lib/daw/sharedDaw";
import {
  AUDIO_INTERFACE_INPUT_PORT_IDS,
  canDrumMixerPatchReachInterface,
  canDrumHitPatchReachSpeakers,
  canConnectActivePatchCableToPort,
  canPianoLivePatchReachSpeakers,
  getActivePatchCable,
  getPatchPortPeerLabel,
  isAudioInterfaceOutputPatchedToSpeakers,
  isPatchCablePluggedBetween,
  isPatchPortConnected,
  isPortPatchedToAudioInterfaceInput,
} from "./useLocalDawState";
import type {
  LocalDawAudioEngineActions,
  LocalDawAudioEngineState,
  LocalDawBassNote,
  LocalDawDrumHit,
  LocalDawFmSynthEnvelopePreset,
  LocalDawFmSynthNote,
  LocalDawPianoLiveNote,
  LocalDawPianoLiveTarget,
} from "./useLocalDawAudioEngine";
import type {
  DawTrackId,
  DawClipState,
  LocalDawActions,
  LocalDawClip,
  LocalDawDevice,
  LocalDawDjDeckState,
  LocalDawDjDeckSource,
  LocalPatchCable,
  LocalDawMidiNoteEvent,
  LocalDawState,
  LocalDawTrack,
} from "./useLocalDawState";
import {
  LEVEL1_PATCH_PORT_REGISTRATIONS,
  LEVEL1_PATCH_PORT_REGISTRATION_MAP,
  getPatchCableWorldEndpoints,
} from "./patchPortRegistration";
import type {
  PatchPortRegistration,
  PatchPortWorldPosition,
} from "./patchPortRegistration";
import type {
  FreeRoamPresenceState,
  SharedDawClipPublishPayload,
  SharedDawClipsState,
  SharedDawLiveSoundPayload,
  SharedStudioGuitarState,
  SharedDawTrackId,
  SharedDawTransport,
  SessionUser,
} from "../types/session";

const WALL_THICKNESS = 0.18;

type Vec3 = [number, number, number];
type HeldStudioInstrument = "guitar" | null;
type StudioGuitarAudioReadiness = { label: "AUDIBLE" | "SILENT"; reason: string };
type StudioGuitarRecordingStatus = {
  caption: string;
  isEnabled: boolean;
  label: string;
};
type StudioRoleId = "daw" | "piano-midi" | "drum-kit" | "looper" | "dj" | "instrument-rack" | "effects-rack";
type StudioLayoutStationId =
  | "daw"
  | "dj"
  | "deck-a-crate"
  | "grid-a"
  | "grid-b"
  | "drums"
  | "piano"
  | "audio-interface"
  | "looper"
  | "guitar"
  | "monitor-studio-status"
  | "monitor-transport"
  | "monitor-sequence-grid"
  | "monitor-arrangement-timeline"
  | "monitor-track-list"
  | "monitor-device-rack"
  | "monitor-mixer-view"
  | "monitor-patch-signal";

interface StudioLayoutTransform {
  position: Vec3;
  rotation: Vec3;
}

type StudioLayoutState = Record<StudioLayoutStationId, StudioLayoutTransform>;

interface StudioLayoutStationSpec {
  id: StudioLayoutStationId;
  label: string;
  defaultTransform: StudioLayoutTransform;
  hitboxSize: Vec3;
  hitboxOffset?: Vec3;
  followDistance: number;
  floorHeight: number;
  defaultFloorLock: boolean;
}

interface StudioLayoutMoveState {
  stationId: StudioLayoutStationId;
  startTransform: StudioLayoutTransform;
  distanceFromCamera: number;
  floorLock: boolean;
}

type StudioOverviewScreenKind = "text" | "clip-grid" | "sequence-grid" | "arrangement-grid" | "mixer-grid";
type StudioOverviewScreenId =
  | "big-status"
  | "transport"
  | "sequence-grid"
  | "arrangement-timeline"
  | "track-list"
  | "device-rack"
  | "mixer-view"
  | "studio-truth";

interface StudioMixerStripSpec {
  accentColor: string;
  label: string;
  meterLevel: number;
  muteLabel: string;
  volumeLabel: string;
}

interface StudioMixerMonitorSpec {
  engineLine: string;
  lastSoundLine: string;
  lines: string[];
  masterMeterLevel: number;
  masterMuteLabel: string;
  masterVolumeLabel: string;
  silenceLine: string;
  strips: StudioMixerStripSpec[];
}

interface StudioSequenceGridCellSpec {
  clip: LocalDawClip;
  track: LocalDawTrack;
  noteCount: number;
  noteDensityMarkers: number;
  hasGuitarLabel: boolean;
  isSelected: boolean;
  isLastPlayback: boolean;
  lastPlaybackNoteId: string | null;
  stateLabel: string;
}

interface StudioSequenceGridSpec {
  tracks: Array<Pick<LocalDawTrack, "id" | "label" | "color">>;
  scenes: number[];
  cells: StudioSequenceGridCellSpec[];
}

interface StudioSequenceMonitorSpec {
  lines: string[];
  sequence: StudioSequenceGridSpec | null;
}

interface StudioArrangementTimelineBlockSpec {
  clip: LocalDawClip;
  track: Pick<LocalDawTrack, "id" | "label" | "color">;
  laneIndex: number;
  label: string;
  noteCount: number;
  noteDensityMarkers: number;
  startBar: number;
  endBar: number;
  hasGuitarLabel: boolean;
  sourceLabel: string;
  stateLabel: string;
}

interface StudioArrangementTimelineSpec {
  bars: number[];
  blocks: StudioArrangementTimelineBlockSpec[];
  playheadBeat: number;
  playheadBar: number;
  playheadIsMoving: boolean;
  tracks: Array<Pick<LocalDawTrack, "id" | "label" | "color"> & { sourceLabel: string }>;
  transportScopeLabel: "LOCAL" | "SHARED";
}

interface StudioOverviewScreenSpec {
  id: StudioOverviewScreenId;
  title: string;
  lines: string[];
  accentColor: string;
  position: Vec3;
  rotation: Vec3;
  size: [number, number];
  kind?: StudioOverviewScreenKind;
  sequence?: StudioSequenceGridSpec | null;
  arrangement?: StudioArrangementTimelineSpec | null;
  mixer?: StudioMixerMonitorSpec | null;
}

type StudioAudioControlId = "mute" | "volume-down" | "volume-up";

interface StudioTransportControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  isEnabled?: boolean;
  onActivate: () => void;
}

interface StudioAudioControlSpec {
  id: StudioAudioControlId;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioFmSynthControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioDrumControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioDrumKitPieceSpec {
  id: string;
  label: string;
  hit: LocalDawDrumHit;
  position: Vec3;
  radius: number;
  depth: number;
  accentColor: string;
  bodyColor: string;
  axis?: "vertical" | "front";
  kind?: "drum" | "cymbal";
}

interface StudioBassControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioFilterControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioAutopanControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioEchoControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioReverbControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioMixerControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioLooperControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  isActive?: boolean;
  onActivate: () => void;
}

interface StudioDjControlSpec {
  id: string;
  label: string;
  caption: string;
  position: Vec3;
  size: Vec3;
  accentColor: string;
  captionFontSize?: number;
  isActive?: boolean;
  enabled?: boolean;
  onActivate: () => void;
}

interface StudioSoundCloudGridControllerProps {
  accentColor: string;
  grid: SoundCloudBoothGridController;
  position: Vec3;
}

interface StudioSoundCloudDragFaderProps {
  accentColor: string;
  id: string;
  label: string;
  position: Vec3;
  railSize: Vec3;
  value: number;
  min: number;
  max: number;
  sensitivity: number;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
}

interface StudioSoundCloudProgressSeekBarProps {
  accentColor: string;
  deck: SoundCloudBoothDeck;
  id: string;
  position: Vec3;
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
}

interface StudioSoundCloudMonitorWaveformHitTargetProps {
  caption: string;
  deck: SoundCloudBoothDeck;
  id: string;
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
  position: Vec3;
  size: Vec3;
}

type StudioSoundCloudPlatterScrubLabel = "GRAB" | "SCRUB BACK" | "ON BEAT" | "PUSHING" | "OVERSPEED";

interface StudioPianoKeySpec extends LocalDawPianoLiveNote {
  whiteKeyIndex?: number;
}

interface StudioClipGridCellSpec {
  clip: LocalDawClip;
  track: LocalDawTrack;
  columnIndex: number;
  rowIndex: number;
  isSelected: boolean;
  isLastRecorded: boolean;
  isLastPlayback: boolean;
  lastPlaybackNoteId: string | null;
  notes: LocalDawMidiNoteEvent[];
  playbackStepIndex: number;
}

interface StudioRoleSpec {
  id: StudioRoleId;
  label: string;
  accentColor: string;
  anchorPosition: Vec3;
  badgePosition: Vec3;
  badgeRotation: Vec3;
}

interface StudioRoleOccupant {
  user: SessionUser;
  distance: number;
  isHost: boolean;
}

const FM_SYNTH_NOTE_SPECS: LocalDawFmSynthNote[] = [
  { label: "C3", frequency: 130.81 },
  { label: "D#3", frequency: 155.56 },
  { label: "F3", frequency: 174.61 },
  { label: "G3", frequency: 196 },
  { label: "A#3", frequency: 233.08 },
];
const DRUM_HIT_SPECS: LocalDawDrumHit[] = [
  { kind: "kick", label: "Kick" },
  { kind: "snare", label: "Snare" },
  { kind: "hat", label: "Hat" },
];
const BASS_NOTE_SPECS: LocalDawBassNote[] = [
  { label: "E1", frequency: 41.2 },
  { label: "G1", frequency: 49 },
  { label: "A1", frequency: 55 },
  { label: "B1", frequency: 61.74 },
];
const PIANO_WHITE_KEY_SPECS: StudioPianoKeySpec[] = [
  { label: "C3", frequency: 130.81 },
  { label: "D3", frequency: 146.83 },
  { label: "E3", frequency: 164.81 },
  { label: "F3", frequency: 174.61 },
  { label: "G3", frequency: 196 },
  { label: "A3", frequency: 220 },
  { label: "B3", frequency: 246.94 },
  { label: "C4", frequency: 261.63 },
  { label: "D4", frequency: 293.66 },
  { label: "E4", frequency: 329.63 },
  { label: "F4", frequency: 349.23 },
  { label: "G4", frequency: 392 },
  { label: "A4", frequency: 440 },
  { label: "B4", frequency: 493.88 },
];
const PIANO_BLACK_KEY_SPECS: StudioPianoKeySpec[] = [
  { label: "C#3", frequency: 138.59, whiteKeyIndex: 0 },
  { label: "D#3", frequency: 155.56, whiteKeyIndex: 1 },
  { label: "F#3", frequency: 185, whiteKeyIndex: 3 },
  { label: "G#3", frequency: 207.65, whiteKeyIndex: 4 },
  { label: "A#3", frequency: 233.08, whiteKeyIndex: 5 },
  { label: "C#4", frequency: 277.18, whiteKeyIndex: 7 },
  { label: "D#4", frequency: 311.13, whiteKeyIndex: 8 },
  { label: "F#4", frequency: 369.99, whiteKeyIndex: 10 },
  { label: "G#4", frequency: 415.3, whiteKeyIndex: 11 },
  { label: "A#4", frequency: 466.16, whiteKeyIndex: 12 },
];
const STUDIO_ROLE_PROXIMITY_RADIUS = 2.15;
const STUDIO_PIANO_POSITION: Vec3 = [-17.2, 0, -1.35];
const STUDIO_DRUM_KIT_POSITION: Vec3 = [-16.5, 0, 1.42];
const STUDIO_DJ_PLATFORM_CENTER: Vec3 = [-16.5, 0.68, 6.05];
const STUDIO_DJ_PLATFORM_SIZE: Vec3 = [11.3, 1.36, 5.4];
const STUDIO_DJ_PLATFORM_FLOOR_Y = 1.36;
const STUDIO_DJ_PLATFORM_RAMP_SIZE: Vec3 = [3.3, 0.055, 1.14];
const STUDIO_DJ_PLATFORM_LEFT_RAMP_POSITION: Vec3 = [-20.2, 0.68, 2.8];
const STUDIO_DJ_PLATFORM_RIGHT_RAMP_POSITION: Vec3 = [-12.8, 0.68, 2.8];
const STUDIO_SOUNDCLOUD_DJ_POSITION: Vec3 = [-16.5, STUDIO_DJ_PLATFORM_FLOOR_Y, 6.05];
const STUDIO_SOUNDCLOUD_DJ_ROTATION: Vec3 = [0, 0, 0];
const STUDIO_SOUNDCLOUD_DJ_DESK_SIZE: Vec3 = [2.82, 0.52, 1.58];
const STUDIO_SOUNDCLOUD_CRATE_DEFAULT_X = 1.88;
const STUDIO_SOUNDCLOUD_CRATE_DEFAULT_Y = 0.742;
const STUDIO_SOUNDCLOUD_CRATE_DEFAULT_Z = 1.72;
const STUDIO_SOUNDCLOUD_DECK_A_CRATE_POSITION: Vec3 = [
  STUDIO_SOUNDCLOUD_DJ_POSITION[0] - STUDIO_SOUNDCLOUD_CRATE_DEFAULT_X,
  STUDIO_SOUNDCLOUD_DJ_POSITION[1] + STUDIO_SOUNDCLOUD_CRATE_DEFAULT_Y,
  STUDIO_SOUNDCLOUD_DJ_POSITION[2] + STUDIO_SOUNDCLOUD_CRATE_DEFAULT_Z,
];
const STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_OFFSET_X = 2.22;
const STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_Y = 0.622;
const STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_Z = 0.42;
const STUDIO_SOUNDCLOUD_GRID_A_POSITION: Vec3 = [
  STUDIO_SOUNDCLOUD_DJ_POSITION[0] - STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_OFFSET_X,
  STUDIO_SOUNDCLOUD_DJ_POSITION[1] + STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_Y,
  STUDIO_SOUNDCLOUD_DJ_POSITION[2] + STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_Z,
];
const STUDIO_SOUNDCLOUD_GRID_B_POSITION: Vec3 = [
  STUDIO_SOUNDCLOUD_DJ_POSITION[0] + STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_OFFSET_X,
  STUDIO_SOUNDCLOUD_DJ_POSITION[1] + STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_Y,
  STUDIO_SOUNDCLOUD_DJ_POSITION[2] + STUDIO_SOUNDCLOUD_GRID_CONTROLLER_DEFAULT_Z,
];
const STUDIO_DAW_POSITION: Vec3 = [-21.25, 0, -4.6];
const STUDIO_DAW_ROTATION: Vec3 = [0, Math.PI / 2, 0];
const STUDIO_LOOPER_POSITION: Vec3 = [-17.0, 0, -8.1];
const STUDIO_LOOPER_ROTATION: Vec3 = [0, 0, 0];
const STUDIO_AUDIO_INTERFACE_POSITION: Vec3 = [-22.07, 0, -2.35];
const STUDIO_AUDIO_INTERFACE_ROTATION: Vec3 = [0, Math.PI / 2, 0];
const STUDIO_GUITAR_STAND_POSITION: Vec3 = [-18.92, 0, 1.82];
const STUDIO_GUITAR_STAND_ROTATION: Vec3 = [0, -0.34, 0];
const STUDIO_DISPLAY_MAX_MASTER_VOLUME = 1.5;
const STUDIO_MASTER_VOLUME_STEP = 0.15;
const FM_SYNTH_UI_GAIN_MAX = 0.16;
const FM_SYNTH_UI_GAIN_STEP = 0.04;
const STUDIO_LAYOUT_STORAGE_KEY = "sync-sesh:recording-studio-layout:v14";
const STUDIO_LAYOUT_STORAGE_VERSION = 3;
const STUDIO_LAYOUT_STATION_PREFIX = "studio-layout-station-";
const STUDIO_LAYOUT_STATION_SPECS: Record<StudioLayoutStationId, StudioLayoutStationSpec> = {
  daw: {
    id: "daw",
    label: "DAW Table",
    defaultTransform: { position: STUDIO_DAW_POSITION, rotation: STUDIO_DAW_ROTATION },
    hitboxSize: [3.0, 1.5, 2.7],
    hitboxOffset: [0, 0.75, 0],
    followDistance: 3.4,
    floorHeight: 0,
    defaultFloorLock: false,
  },
  "audio-interface": {
    id: "audio-interface",
    label: "Audio Interface",
    defaultTransform: { position: STUDIO_AUDIO_INTERFACE_POSITION, rotation: STUDIO_AUDIO_INTERFACE_ROTATION },
    hitboxSize: [1.35, 1.2, 1.0],
    hitboxOffset: [0, 0.6, 0],
    followDistance: 2.6,
    floorHeight: 0,
    defaultFloorLock: false,
  },
  piano: {
    id: "piano",
    label: "Piano",
    defaultTransform: { position: STUDIO_PIANO_POSITION, rotation: [0, 0, 0] },
    hitboxSize: [2.5, 1.0, 1.2],
    hitboxOffset: [0, 0.52, 0],
    followDistance: 3.0,
    floorHeight: 0,
    defaultFloorLock: false,
  },
  guitar: {
    id: "guitar",
    label: "Guitar Stand",
    defaultTransform: { position: STUDIO_GUITAR_STAND_POSITION, rotation: STUDIO_GUITAR_STAND_ROTATION },
    hitboxSize: [1.2, 1.7, 1.0],
    hitboxOffset: [0, 0.85, 0],
    followDistance: 2.5,
    floorHeight: 0,
    defaultFloorLock: false,
  },
  looper: {
    id: "looper",
    label: "Looper",
    defaultTransform: { position: STUDIO_LOOPER_POSITION, rotation: STUDIO_LOOPER_ROTATION },
    hitboxSize: [2.5, 1.5, 1.5],
    hitboxOffset: [0, 0.74, 0],
    followDistance: 3.0,
    floorHeight: 0,
    defaultFloorLock: false,
  },
  drums: {
    id: "drums",
    label: "Drum Station",
    defaultTransform: { position: STUDIO_DRUM_KIT_POSITION, rotation: [0, 0, 0] },
    hitboxSize: [3.1, 2.2, 2.6],
    hitboxOffset: [0, 1.05, 0],
    followDistance: 3.2,
    floorHeight: 0,
    defaultFloorLock: false,
  },
  dj: {
    id: "dj",
    label: "DJ Booth",
    defaultTransform: { position: STUDIO_SOUNDCLOUD_DJ_POSITION, rotation: STUDIO_SOUNDCLOUD_DJ_ROTATION },
    hitboxSize: [3.2, 1.6, 2.2],
    hitboxOffset: [0, 0.82, 0],
    followDistance: 3.4,
    floorHeight: STUDIO_DJ_PLATFORM_FLOOR_Y,
    defaultFloorLock: false,
  },
  "deck-a-crate": {
    id: "deck-a-crate",
    label: "Deck A Crate",
    defaultTransform: { position: STUDIO_SOUNDCLOUD_DECK_A_CRATE_POSITION, rotation: STUDIO_SOUNDCLOUD_DJ_ROTATION },
    hitboxSize: [1.82, 0.46, 0.88],
    hitboxOffset: [0, 0.14, 0],
    followDistance: 2.8,
    floorHeight: STUDIO_SOUNDCLOUD_DECK_A_CRATE_POSITION[1],
    defaultFloorLock: false,
  },
  "grid-a": {
    id: "grid-a",
    label: "Grid A",
    defaultTransform: { position: STUDIO_SOUNDCLOUD_GRID_A_POSITION, rotation: STUDIO_SOUNDCLOUD_DJ_ROTATION },
    hitboxSize: [1.5, 0.5, 1.45],
    hitboxOffset: [0, 0.2, 0],
    followDistance: 2.8,
    floorHeight: STUDIO_SOUNDCLOUD_GRID_A_POSITION[1],
    defaultFloorLock: false,
  },
  "grid-b": {
    id: "grid-b",
    label: "Grid B",
    defaultTransform: { position: STUDIO_SOUNDCLOUD_GRID_B_POSITION, rotation: STUDIO_SOUNDCLOUD_DJ_ROTATION },
    hitboxSize: [1.5, 0.5, 1.45],
    hitboxOffset: [0, 0.2, 0],
    followDistance: 2.8,
    floorHeight: STUDIO_SOUNDCLOUD_GRID_B_POSITION[1],
    defaultFloorLock: false,
  },
  "monitor-studio-status": {
    id: "monitor-studio-status",
    label: "Studio Status Monitor",
    defaultTransform: { position: [-22.18, 3.56, -5.25], rotation: [0, Math.PI / 2, 0] },
    hitboxSize: [4.3, 1.34, 0.24],
    followDistance: 3.2,
    floorHeight: 3.56,
    defaultFloorLock: false,
  },
  "monitor-transport": {
    id: "monitor-transport",
    label: "Transport Monitor",
    defaultTransform: { position: [-22.18, 2.76, -0.02], rotation: [0, Math.PI / 2, 0] },
    hitboxSize: [2.28, 0.82, 0.24],
    followDistance: 2.8,
    floorHeight: 2.76,
    defaultFloorLock: false,
  },
  "monitor-sequence-grid": {
    id: "monitor-sequence-grid",
    label: "Sequence View Monitor",
    defaultTransform: { position: [-22.18, 1.66, -6.86], rotation: [0, Math.PI / 2, 0] },
    hitboxSize: [2.84, 1.26, 0.24],
    followDistance: 3.0,
    floorHeight: 1.66,
    defaultFloorLock: false,
  },
  "monitor-arrangement-timeline": {
    id: "monitor-arrangement-timeline",
    label: "Arrangement Timeline Monitor",
    defaultTransform: { position: [-16.88, 5.04, -8.58], rotation: [0, 0, 0] },
    hitboxSize: [5.38, 2.16, 0.24],
    followDistance: 4.0,
    floorHeight: 5.04,
    defaultFloorLock: false,
  },
  "monitor-track-list": {
    id: "monitor-track-list",
    label: "Track List Monitor",
    defaultTransform: { position: [-22.18, 2.58, -2.86], rotation: [0, Math.PI / 2, 0] },
    hitboxSize: [2.32, 0.84, 0.24],
    followDistance: 2.8,
    floorHeight: 2.58,
    defaultFloorLock: false,
  },
  "monitor-device-rack": {
    id: "monitor-device-rack",
    label: "Device Rack Monitor",
    defaultTransform: { position: [-16.88, 2.24, -8.58], rotation: [0, 0, 0] },
    hitboxSize: [2.4, 0.84, 0.24],
    followDistance: 3.0,
    floorHeight: 2.24,
    defaultFloorLock: false,
  },
  "monitor-mixer-view": {
    id: "monitor-mixer-view",
    label: "Mixer View Monitor",
    defaultTransform: { position: [-16.88, 3.18, -8.58], rotation: [0, 0, 0] },
    hitboxSize: [3.38, 1.3, 0.24],
    followDistance: 3.2,
    floorHeight: 3.18,
    defaultFloorLock: false,
  },
  "monitor-patch-signal": {
    id: "monitor-patch-signal",
    label: "Patch Signal Monitor",
    defaultTransform: { position: [-22.18, 1.44, -2.88], rotation: [0, Math.PI / 2, 0] },
    hitboxSize: [2.34, 0.96, 0.24],
    followDistance: 2.8,
    floorHeight: 1.44,
    defaultFloorLock: false,
  },
};
const STUDIO_LAYOUT_STATION_IDS = Object.keys(STUDIO_LAYOUT_STATION_SPECS) as StudioLayoutStationId[];
const STUDIO_ROLE_SPECS: StudioRoleSpec[] = [
  {
    id: "daw",
    label: "DAW",
    accentColor: "#57f3ff",
    anchorPosition: [-21.25, 0, -4.6],
    badgePosition: [-22.0, 1.42, -3.0],
    badgeRotation: [0, Math.PI / 2, 0],
  },
  {
    id: "piano-midi",
    label: "PIANO",
    accentColor: "#73ff4c",
    anchorPosition: STUDIO_PIANO_POSITION,
    badgePosition: [-17.2, 1.5, -2.13],
    badgeRotation: [0, Math.PI, 0],
  },
  {
    id: "drum-kit",
    label: "DRUM KIT",
    accentColor: "#f8d36a",
    anchorPosition: STUDIO_DRUM_KIT_POSITION,
    badgePosition: [-16.5, 1.42, 2.18],
    badgeRotation: [0, Math.PI, 0],
  },
  {
    id: "looper",
    label: "LOOPER",
    accentColor: "#f8d36a",
    anchorPosition: [-17.0, 0, -8.1],
    badgePosition: [-17.0, 1.35, -7.38],
    badgeRotation: [0, 0, 0],
  },
  {
    id: "dj",
    label: "DJ",
    accentColor: "#f64fff",
    anchorPosition: STUDIO_SOUNDCLOUD_DJ_POSITION,
    badgePosition: [-16.5, 2.8, 4.78],
    badgeRotation: [0, 0, 0],
  },
  {
    id: "instrument-rack",
    label: "DRUMS/BASS",
    accentColor: "#9fb7cc",
    anchorPosition: [-20.1, 0, -8.32],
    badgePosition: [-20.1, 2.03, -7.56],
    badgeRotation: [0, 0, 0],
  },
  {
    id: "effects-rack",
    label: "EFFECTS",
    accentColor: "#ff8c42",
    anchorPosition: [-13.8, 0, -8.32],
    badgePosition: [-13.8, 2.03, -7.56],
    badgeRotation: [0, 0, 0],
  },
];

function cloneStudioLayoutTransform(transform: StudioLayoutTransform): StudioLayoutTransform {
  return {
    position: [...transform.position] as Vec3,
    rotation: [...transform.rotation] as Vec3,
  };
}

function createDefaultStudioLayoutState(): StudioLayoutState {
  return STUDIO_LAYOUT_STATION_IDS.reduce((state, stationId) => ({
    ...state,
    [stationId]: cloneStudioLayoutTransform(STUDIO_LAYOUT_STATION_SPECS[stationId].defaultTransform),
  }), {} as StudioLayoutState);
}

function isStudioLayoutStationId(value: string): value is StudioLayoutStationId {
  return STUDIO_LAYOUT_STATION_IDS.includes(value as StudioLayoutStationId);
}

function isStudioLayoutInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function getStationIdFromLayoutHitId(hitId?: string): StudioLayoutStationId | null {
  if (!hitId?.startsWith(STUDIO_LAYOUT_STATION_PREFIX)) {
    return null;
  }

  const stationId = hitId.slice(STUDIO_LAYOUT_STATION_PREFIX.length);
  return isStudioLayoutStationId(stationId) ? stationId : null;
}

function getStudioOverviewScreenStationId(screenId: StudioOverviewScreenId): StudioLayoutStationId {
  switch (screenId) {
    case "big-status":
      return "monitor-studio-status";
    case "transport":
      return "monitor-transport";
    case "sequence-grid":
      return "monitor-sequence-grid";
    case "arrangement-timeline":
      return "monitor-arrangement-timeline";
    case "track-list":
      return "monitor-track-list";
    case "device-rack":
      return "monitor-device-rack";
    case "mixer-view":
      return "monitor-mixer-view";
    case "studio-truth":
      return "monitor-patch-signal";
  }
}

function normalizeStudioLayoutTransform(stationId: StudioLayoutStationId, value: unknown): StudioLayoutTransform {
  const defaultTransform = STUDIO_LAYOUT_STATION_SPECS[stationId].defaultTransform;

  if (!value || typeof value !== "object") {
    return cloneStudioLayoutTransform(defaultTransform);
  }

  const candidate = value as Partial<StudioLayoutTransform>;
  const position = Array.isArray(candidate.position) && candidate.position.length >= 3
    ? candidate.position.map((entry, index) => Number.isFinite(Number(entry)) ? Number(entry) : defaultTransform.position[index]) as Vec3
    : [...defaultTransform.position] as Vec3;
  const rotation = Array.isArray(candidate.rotation) && candidate.rotation.length >= 3
    ? candidate.rotation.map((entry, index) => Number.isFinite(Number(entry)) ? Number(entry) : defaultTransform.rotation[index]) as Vec3
    : [...defaultTransform.rotation] as Vec3;

  return { position, rotation };
}

function loadStudioLayoutState(): StudioLayoutState {
  if (typeof window === "undefined") {
    return createDefaultStudioLayoutState();
  }

  try {
    const rawState = window.localStorage.getItem(STUDIO_LAYOUT_STORAGE_KEY);

    if (!rawState) {
      return createDefaultStudioLayoutState();
    }

    const parsed = JSON.parse(rawState) as ({
      stations?: Partial<Record<StudioLayoutStationId, StudioLayoutTransform>>;
      version?: number;
    } | Partial<Record<StudioLayoutStationId, StudioLayoutTransform>>) | null;
    const storedStations: Partial<Record<StudioLayoutStationId, StudioLayoutTransform>> | undefined =
      parsed && typeof parsed === "object" && "stations" in parsed && parsed.version === STUDIO_LAYOUT_STORAGE_VERSION
        ? parsed.stations
        : parsed && typeof parsed === "object"
          ? parsed as Partial<Record<StudioLayoutStationId, StudioLayoutTransform>>
          : undefined;

    return STUDIO_LAYOUT_STATION_IDS.reduce((state, stationId) => ({
      ...state,
      [stationId]: normalizeStudioLayoutTransform(stationId, storedStations?.[stationId]),
    }), {} as StudioLayoutState);
  } catch {
    return createDefaultStudioLayoutState();
  }
}

function saveStudioLayoutState(layoutState: StudioLayoutState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STUDIO_LAYOUT_STORAGE_KEY, JSON.stringify({
    version: STUDIO_LAYOUT_STORAGE_VERSION,
    stations: layoutState,
  }));
}

function areStudioLayoutTransformsEqual(first: StudioLayoutTransform, second: StudioLayoutTransform) {
  return (
    first.position.every((value, index) => Math.abs(value - second.position[index]) < 0.001) &&
    first.rotation.every((value, index) => Math.abs(value - second.rotation[index]) < 0.001)
  );
}

function rotateStudioLayoutPoint(point: Vec3, yaw: number): Vec3 {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  return [
    point[0] * cos + point[2] * sin,
    point[1],
    -point[0] * sin + point[2] * cos,
  ];
}

function transformStudioLayoutPoint(point: Vec3, stationId: StudioLayoutStationId, layoutState: StudioLayoutState): Vec3 {
  const spec = STUDIO_LAYOUT_STATION_SPECS[stationId];
  const transform = layoutState[stationId] ?? spec.defaultTransform;
  const relativePoint: Vec3 = [
    point[0] - spec.defaultTransform.position[0],
    point[1] - spec.defaultTransform.position[1],
    point[2] - spec.defaultTransform.position[2],
  ];
  const defaultLocal = rotateStudioLayoutPoint(relativePoint, -spec.defaultTransform.rotation[1]);
  const transformedLocal = rotateStudioLayoutPoint(defaultLocal, transform.rotation[1]);

  return [
    transform.position[0] + transformedLocal[0],
    transform.position[1] + transformedLocal[1],
    transform.position[2] + transformedLocal[2],
  ];
}

function getLayoutAdjustedStudioRoleSpec(role: StudioRoleSpec, layoutState: StudioLayoutState): StudioRoleSpec {
  const stationIdByRoleId: Partial<Record<StudioRoleId, StudioLayoutStationId>> = {
    daw: "daw",
    "piano-midi": "piano",
    "drum-kit": "drums",
    looper: "looper",
    dj: "dj",
  };
  const stationId = stationIdByRoleId[role.id];

  if (!stationId) {
    return role;
  }

  const spec = STUDIO_LAYOUT_STATION_SPECS[stationId];
  const transform = layoutState[stationId] ?? spec.defaultTransform;
  const rotationDelta = transform.rotation[1] - spec.defaultTransform.rotation[1];

  return {
    ...role,
    anchorPosition: transformStudioLayoutPoint(role.anchorPosition, stationId, layoutState),
    badgePosition: transformStudioLayoutPoint(role.badgePosition, stationId, layoutState),
    badgeRotation: [
      role.badgeRotation[0],
      role.badgeRotation[1] + rotationDelta,
      role.badgeRotation[2],
    ],
  };
}

function getNextFmEnvelopePreset(preset: LocalDawFmSynthEnvelopePreset): LocalDawFmSynthEnvelopePreset {
  if (preset === "pluck") {
    return "stab";
  }

  if (preset === "stab") {
    return "pad";
  }

  return "pluck";
}

function Wall({
  position,
  args,
  color,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial args={[{ color, roughness: 0.84, metalness: 0.03 }]} />
    </mesh>
  );
}

function getClipStateColors(state: DawClipState) {
  if (state === "armed") {
    return {
      color: "#4a3415",
      emissive: "#f8d36a",
      emissiveIntensity: 0.2,
      opacity: 0.5,
    };
  }

  if (state === "playing") {
    return {
      color: "#123a3c",
      emissive: "#57f3ff",
      emissiveIntensity: 0.34,
      opacity: 0.68,
    };
  }

  if (state === "recording") {
    return {
      color: "#3a1421",
      emissive: "#ff667c",
      emissiveIntensity: 0.34,
      opacity: 0.66,
    };
  }

  if (state === "stopped") {
    return {
      color: "#17243a",
      emissive: "#6f86a3",
      emissiveIntensity: 0.12,
      opacity: 0.42,
    };
  }

  return {
    color: "#07111f",
    emissive: "#16243a",
    emissiveIntensity: 0.08,
    opacity: 0.26,
  };
}

function StudioClipGridCell({
  cell,
  localDawActions,
}: {
  cell: StudioClipGridCellSpec;
  localDawActions: LocalDawActions;
}) {
  const cellRef = useRef<React.ElementRef<"mesh">>(null);
  const stateColors = getClipStateColors(cell.clip.state);
  const visibleNotes = cell.notes.slice(-5);
  const position: Vec3 = [
    (cell.columnIndex - 2) * 0.22,
    0.766,
    -0.53 + cell.rowIndex * 0.112,
  ];

  useRegisterInteractable(useMemo(() => ({
    id: `studio-clip-${cell.clip.id}`,
    label: `${cell.track.label} Scene ${cell.clip.sceneIndex + 1}`,
    objectRef: cellRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: () => {
      localDawActions.activateClipVisualState(cell.clip.id);
    },
  }), [cell.clip.id, cell.clip.sceneIndex, cell.track.label, localDawActions]));

  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      <mesh ref={cellRef}>
        <boxGeometry args={[0.17, 0.04, 0.082]} />
        <meshStandardMaterial args={[{
          color: stateColors.color,
          emissive: stateColors.emissive,
          emissiveIntensity: stateColors.emissiveIntensity,
          roughness: 0.66,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, 0.023, 0]}>
        <boxGeometry args={[0.15, 0.008, 0.058]} />
        <meshBasicMaterial args={[{ color: cell.track.color, transparent: true, opacity: stateColors.opacity, toneMapped: false }]} />
      </mesh>
      {visibleNotes.map((note, index) => {
        const totalSteps = Math.max(1, cell.clip.lengthBars * 16);
        const x = -0.062 + (Math.min(totalSteps - 1, note.stepIndex) / Math.max(1, totalSteps - 1)) * 0.124;

        return (
          <mesh key={`${cell.clip.id}-note-tick-${note.id}-${index}`} position={[x, 0.035 + index * 0.002, 0.022]}>
            <boxGeometry args={[0.012, 0.01, 0.026]} />
            <meshBasicMaterial args={[{
              color: note.id === cell.lastPlaybackNoteId ? "#57f3ff" : cell.isLastRecorded ? "#f8d36a" : cell.track.color,
              transparent: true,
              opacity: note.id === cell.lastPlaybackNoteId ? 0.82 : 0.58,
              toneMapped: false,
            }]} />
          </mesh>
        );
      })}
      {cell.clip.state === "playing" ? (
        <mesh position={[-0.062 + (cell.playbackStepIndex / Math.max(1, cell.clip.lengthBars * 16 - 1)) * 0.124, 0.046, -0.024]}>
          <boxGeometry args={[0.018, 0.014, 0.026]} />
          <meshBasicMaterial args={[{ color: "#57f3ff", transparent: true, opacity: 0.78, toneMapped: false }]} />
        </mesh>
      ) : null}
      {cell.isSelected || cell.clip.state === "recording" || cell.clip.state === "playing" ? (
        <>
          <mesh position={[0, 0.031, 0]}>
            <boxGeometry args={[0.205, 0.01, 0.112]} />
            <meshBasicMaterial args={[{
              color: cell.clip.state === "recording" ? "#ff667c" : cell.clip.state === "playing" ? "#57f3ff" : "#e9fbff",
              transparent: true,
              opacity: cell.clip.state === "recording" || cell.clip.state === "playing" ? 0.36 : 0.3,
              toneMapped: false,
            }]} />
          </mesh>
          <mesh position={[0, 0.039, 0]}>
            <boxGeometry args={[0.18, 0.012, 0.09]} />
            <meshBasicMaterial args={[{
              color: cell.isLastPlayback ? "#f8d36a" : cell.isLastRecorded ? "#f8d36a" : cell.track.color,
              transparent: true,
              opacity: cell.isLastPlayback || cell.isLastRecorded ? 0.72 : 0.55,
              wireframe: true,
              toneMapped: false,
            }]} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function StudioClipGridControls({
  localDawActions,
  localDawState,
  phaseVisuals,
}: {
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const cells = useMemo<StudioClipGridCellSpec[]>(() => {
    if (!localDawState) {
      return [];
    }

    const notesByClipId = new Map<string, LocalDawMidiNoteEvent[]>();

    localDawState.midiNotes.forEach((note) => {
      notesByClipId.set(note.clipId, [...(notesByClipId.get(note.clipId) ?? []), note]);
    });

    const transportRelativeBar = (clip: LocalDawClip) => ((localDawState.transport.bar - 1) % clip.lengthBars) + 1;

    return localDawState.tracks.flatMap((track, columnIndex) => (
      localDawState.clips
        .filter((clip) => clip.trackId === track.id)
        .sort((firstClip, secondClip) => firstClip.sceneIndex - secondClip.sceneIndex)
        .slice(0, 4)
        .map((clip) => ({
          clip,
          track,
          columnIndex,
          rowIndex: clip.sceneIndex,
          isSelected: localDawState.selectedTrackId === clip.trackId && localDawState.selectedSceneIndex === clip.sceneIndex,
          isLastRecorded: notesByClipId.get(clip.id)?.some((note) => note.id === localDawState.lastRecordedNoteId) ?? false,
          isLastPlayback: localDawState.lastPlaybackTrigger?.clipId === clip.id,
          lastPlaybackNoteId: localDawState.lastPlaybackTrigger?.clipId === clip.id ? localDawState.lastPlaybackTrigger.noteId : null,
          notes: notesByClipId.get(clip.id) ?? [],
          playbackStepIndex: (transportRelativeBar(clip) - 1) * 16 + (localDawState.transport.beat - 1) * 4,
        }))
    ));
  }, [localDawState]);

  if (!localDawState || !localDawActions) {
    return null;
  }

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.736, -0.362]}>
        <boxGeometry args={[1.3, 0.026, 0.56]} />
        <meshStandardMaterial args={[{ color: "#050914", emissive: "#07111f", emissiveIntensity: 0.18, roughness: 0.72, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[0, 0.754, -0.68]}>
        <boxGeometry args={[1.18, 0.018, 0.035]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary, transparent: true, opacity: 0.34, toneMapped: false }]} />
      </mesh>
      {localDawState.tracks.slice(0, 5).map((track, columnIndex) => (
        <mesh key={`studio-clip-track-${track.id}`} position={[(columnIndex - 2) * 0.22, 0.76, -0.665]}>
          <boxGeometry args={[0.14, 0.014, 0.035]} />
          <meshBasicMaterial args={[{ color: track.color, transparent: true, opacity: 0.42, toneMapped: false }]} />
        </mesh>
      ))}
      {Array.from({ length: 4 }, (_, sceneIndex) => (
        <mesh key={`studio-clip-scene-${sceneIndex}`} position={[-0.68, 0.759, -0.53 + sceneIndex * 0.112]}>
          <boxGeometry args={[0.045, 0.012, 0.056]} />
          <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary, transparent: true, opacity: 0.28, toneMapped: false }]} />
        </mesh>
      ))}
      {cells.map((cell) => (
        <StudioClipGridCell key={cell.clip.id} cell={cell} localDawActions={localDawActions} />
      ))}
    </group>
  );
}

function createStudioSharedClipStatusCanvas(lines: string[], accentColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 160;
  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "rgba(4, 10, 18, 0.9)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.5;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.globalAlpha = 1;
  context.fillStyle = accentColor;
  context.font = "700 18px monospace";
  context.fillText("SHARED SLOT", 22, 36);
  context.fillStyle = "#e9fbff";
  context.font = "600 16px monospace";
  lines.slice(0, 4).forEach((line, index) => {
    context.fillText(line.toUpperCase(), 22, 68 + index * 24);
  });

  return canvas;
}

function StudioSharedClipControl({
  control,
}: {
  control: StudioTransportControlSpec;
}) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: control.id,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: control.isEnabled ?? true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.isEnabled, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.014, 0]}>
        <boxGeometry args={[control.size[0] + 0.04, 0.018, control.size[2] + 0.04]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isEnabled === false ? 0.05 : 0.14, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isEnabled === false ? "#111722" : "#10192b",
          emissive: control.accentColor,
          emissiveIntensity: control.isEnabled === false ? 0.05 : 0.14,
          roughness: 0.7,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.8, control.size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.82, toneMapped: false }]}>
          <canvasTexture key={`studio-shared-clip-control-${control.id}-${control.label}-${control.isEnabled === false ? "disabled" : "enabled"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioSharedClipControls({
  canAdminSharedDawClips = false,
  localDawActions,
  localDawState,
  localUserIdForSharedDawClips,
  onClearSharedDawClip,
  onPublishSharedDawClip,
  phaseVisuals,
  sharedDawClips,
}: {
  canAdminSharedDawClips?: boolean;
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  localUserIdForSharedDawClips?: string;
  onClearSharedDawClip?: (trackId: SharedDawTrackId, sceneIndex: number) => void;
  onPublishSharedDawClip?: (clip: SharedDawClipPublishPayload) => void;
  phaseVisuals: PhaseVisuals;
  sharedDawClips?: SharedDawClipsState;
}) {
  const selectedSharedClip = getSelectedSharedDawClip(localDawState, sharedDawClips);
  const selectedLocalClip = localDawState?.clips.find((clip) => (
    clip.trackId === localDawState.selectedTrackId &&
    clip.sceneIndex === localDawState.selectedSceneIndex
  ));
  const publishPayload = localDawActions?.createSharedClipPublishPayloadForSelectedClip() ?? null;
  const canPublish = Boolean(publishPayload && onPublishSharedDawClip);
  const canClear = Boolean(
    selectedSharedClip &&
    onClearSharedDawClip &&
    (canAdminSharedDawClips || selectedSharedClip.summary.ownerUserId === localUserIdForSharedDawClips),
  );
  const handlePublish = useCallback(() => {
    const nextPayload = localDawActions?.createSharedClipPublishPayloadForSelectedClip();

    if (nextPayload) {
      onPublishSharedDawClip?.(nextPayload);
    }
  }, [localDawActions, onPublishSharedDawClip]);
  const handleClear = useCallback(() => {
    if (!localDawState || !selectedSharedClip) {
      return;
    }

    onClearSharedDawClip?.(localDawState.selectedTrackId, selectedSharedClip.summary.sceneIndex);
  }, [localDawState, onClearSharedDawClip, selectedSharedClip]);
  const statusLines = useMemo(() => {
    const sharedCount = sharedDawClips?.clips.length ?? 0;
    const ownerLabel = !selectedSharedClip
      ? "OWNER NONE"
      : selectedSharedClip.summary.ownerUserId === localUserIdForSharedDawClips
        ? "OWNER YOU"
        : canAdminSharedDawClips
          ? "OWNER PEER / HOST"
          : "OWNER PEER";
    const importStatus = selectedLocalClip?.shared?.importStatus === "conflict"
      ? "CONFLICT LOCAL KEPT"
      : selectedLocalClip?.shared?.importStatus === "synced"
        ? "SYNCED"
        : "LOCAL ONLY";

    return [
      `${sharedCount} POPULATED`,
      ownerLabel,
      selectedSharedClip ? `REV ${selectedSharedClip.summary.revision}` : "REV --",
      importStatus,
    ];
  }, [canAdminSharedDawClips, localUserIdForSharedDawClips, selectedLocalClip?.shared?.importStatus, selectedSharedClip, sharedDawClips?.clips.length]);
  const statusCanvas = useMemo(
    () => createStudioSharedClipStatusCanvas(statusLines, phaseVisuals.gridPrimary),
    [phaseVisuals.gridPrimary, statusLines],
  );
  const controls = useMemo<StudioTransportControlSpec[]>(() => [
    {
      id: "studio-shared-clip-publish",
      label: "Share",
      caption: canPublish ? "Publish Shared Clip" : "No Clip To Share",
      position: [-0.34, 0.812, -0.42],
      size: [0.44, 0.05, 0.16],
      accentColor: phaseVisuals.gridPrimary,
      isEnabled: canPublish,
      onActivate: handlePublish,
    },
    {
      id: "studio-shared-clip-clear",
      label: "Clear",
      caption: canClear ? "Clear Shared Clip" : "Cannot Clear Shared",
      position: [0.34, 0.812, -0.42],
      size: [0.44, 0.05, 0.16],
      accentColor: phaseVisuals.timerAccent,
      isEnabled: canClear,
      onActivate: handleClear,
    },
  ], [canClear, canPublish, handleClear, handlePublish, phaseVisuals.gridPrimary, phaseVisuals.timerAccent]);

  if (!localDawState || !localDawActions) {
    return null;
  }

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      {controls.map((control) => (
        <StudioSharedClipControl key={control.id} control={control} />
      ))}
      <mesh position={[0, 1.035, -0.43]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.86, 0.32]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.78, toneMapped: false }]}>
          <canvasTexture key={`studio-shared-clip-status-${statusLines.join("-")}`} attach="map" args={[statusCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function getSelectedDawTrack(localDawState: LocalDawState) {
  return localDawState.tracks.find((track) => track.id === localDawState.selectedTrackId) ?? localDawState.tracks[0];
}

function getSelectedSharedDawClip(localDawState?: LocalDawState, sharedDawClips?: SharedDawClipsState) {
  if (!localDawState || !sharedDawClips) {
    return null;
  }

  const slotId = getSharedDawClipSlotId(localDawState.selectedTrackId, localDawState.selectedSceneIndex);

  return sharedDawClips.clips.find((clip) => clip.summary.id === slotId) ?? null;
}

function getTrackDevices(localDawState: LocalDawState, track: LocalDawTrack) {
  const devicesById = new Map(localDawState.devices.map((device) => [device.id, device]));

  return track.deviceIds
    .map((deviceId) => devicesById.get(deviceId))
    .filter((device): device is LocalDawDevice => Boolean(device));
}

function getSelectedDawDevice(localDawState: LocalDawState, devices: LocalDawDevice[]) {
  return devices.find((device) => device.id === localDawState.selectedDeviceId) ?? devices[0] ?? null;
}

function getTrackGainScale(localDawState: LocalDawState | undefined, trackId: DawTrackId) {
  const track = localDawState?.tracks.find((candidate) => candidate.id === trackId);

  if (!track || track.muted) {
    return 0;
  }

  return Math.max(0, Math.min(1, track.volume));
}

function StudioDeviceChainDevice({
  device,
  index,
  isSelected,
  localDawActions,
  phaseVisuals,
  trackColor,
  totalDevices,
}: {
  device: LocalDawDevice;
  index: number;
  isSelected: boolean;
  localDawActions: LocalDawActions;
  phaseVisuals: PhaseVisuals;
  trackColor: string;
  totalDevices: number;
}) {
  const selectRef = useRef<React.ElementRef<"mesh">>(null);
  const toggleRef = useRef<React.ElementRef<"mesh">>(null);
  const accentColor = isSelected ? trackColor : device.enabled ? phaseVisuals.gridSecondary : "#6f86a3";
  const position: Vec3 = [(index - (totalDevices - 1) / 2) * 0.42, 0.802, 0.48];
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption: `${device.kind.toUpperCase()} ${device.enabled ? "ON" : "OFF"}`,
    isActive: isSelected || device.enabled,
    label: device.label,
  }), [accentColor, device.enabled, device.kind, device.label, isSelected]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-device-chain-select-${device.id}`,
    label: `Select ${device.label}`,
    objectRef: selectRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: () => {
      localDawActions.selectDevice(device.id);
    },
  }), [device.id, device.label, localDawActions]));

  useRegisterInteractable(useMemo(() => ({
    id: `studio-device-chain-toggle-${device.id}`,
    label: `Toggle ${device.label}`,
    objectRef: toggleRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: () => {
      localDawActions.toggleDeviceEnabled(device.id);
    },
  }), [device.id, device.label, localDawActions]));

  return (
    <group position={position}>
      <mesh ref={selectRef}>
        <boxGeometry args={[0.34, 0.04, 0.16]} />
        <meshStandardMaterial args={[{
          color: device.enabled ? "#0b1525" : "#070b12",
          emissive: accentColor,
          emissiveIntensity: isSelected ? 0.22 : device.enabled ? 0.09 : 0.03,
          roughness: 0.72,
          metalness: 0.05,
        }]} />
      </mesh>
      <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.27, 0.105]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: device.enabled ? 0.62 : 0.34, toneMapped: false }]}>
          <canvasTexture key={`studio-device-chain-${device.id}-${device.enabled ? "on" : "off"}-${isSelected ? "selected" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh ref={toggleRef} position={[0, 0.038, 0.105]}>
        <boxGeometry args={[0.18, 0.026, 0.052]} />
        <meshBasicMaterial args={[{ color: device.enabled ? trackColor : "#6f86a3", transparent: true, opacity: device.enabled ? 0.42 : 0.2, toneMapped: false }]} />
      </mesh>
      {isSelected ? (
        <mesh position={[0, 0.033, 0]}>
          <boxGeometry args={[0.39, 0.012, 0.2]} />
          <meshBasicMaterial args={[{ color: trackColor, transparent: true, opacity: 0.48, wireframe: true, toneMapped: false }]} />
        </mesh>
      ) : null}
    </group>
  );
}

function StudioDeviceChainControls({
  localDawActions,
  localDawState,
  phaseVisuals,
}: {
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const selectedTrack = localDawState ? getSelectedDawTrack(localDawState) : undefined;
  const devices = localDawState && selectedTrack ? getTrackDevices(localDawState, selectedTrack) : [];
  const selectedDevice = localDawState ? getSelectedDawDevice(localDawState, devices) : null;
  const statusCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: selectedTrack?.color ?? phaseVisuals.timerAccent,
    caption: selectedDevice ? `${selectedDevice.label} ${selectedDevice.enabled ? "ON" : "OFF"}` : "NO DEVICE",
    isActive: Boolean(selectedDevice?.enabled),
    label: selectedTrack ? `${selectedTrack.label} Chain` : "Device Chain",
  }), [phaseVisuals.timerAccent, selectedDevice, selectedTrack]);

  if (!localDawState || !localDawActions || !selectedTrack) {
    return null;
  }

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.778, 0.48]}>
        <boxGeometry args={[1.36, 0.024, 0.34]} />
        <meshStandardMaterial args={[{ color: "#050914", emissive: "#07111f", emissiveIntensity: 0.12, roughness: 0.72, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[0, 0.828, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.86, 0.16]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-device-chain-status-${selectedTrack.id}-${selectedDevice?.id ?? "none"}-${selectedDevice?.enabled ? "on" : "off"}`} attach="map" args={[statusCanvas]} />
        </meshBasicMaterial>
      </mesh>
      {devices.slice(0, -1).map((device, index) => (
        <mesh key={`studio-device-chain-link-${device.id}`} position={[((index + 0.5) - (devices.length - 1) / 2) * 0.42, 0.81, 0.48]}>
          <boxGeometry args={[0.13, 0.012, 0.025]} />
          <meshBasicMaterial args={[{ color: selectedTrack.color, transparent: true, opacity: 0.34, toneMapped: false }]} />
        </mesh>
      ))}
      {devices.map((device, index) => (
        <StudioDeviceChainDevice
          key={device.id}
          device={device}
          index={index}
          isSelected={device.id === selectedDevice?.id}
          localDawActions={localDawActions}
          phaseVisuals={phaseVisuals}
          trackColor={selectedTrack.color}
          totalDevices={devices.length}
        />
      ))}
    </group>
  );
}

function getTrackMeterLevel(localDawState: LocalDawState, localDawAudioState: LocalDawAudioEngineState | undefined, track: LocalDawTrack) {
  if (track.muted || track.volume <= 0) {
    return 0.02;
  }

  const hasPlayingClip = localDawState.clips.some((clip) => clip.trackId === track.id && clip.state === "playing");
  const hasRecordingClip = localDawState.clips.some((clip) => clip.trackId === track.id && clip.state === "recording");
  const isLastPlaybackTrack = localDawState.lastPlaybackTrigger?.trackId === track.id;
  let eventLevel = hasPlayingClip ? 0.34 : 0.12;

  if (hasRecordingClip) {
    eventLevel = Math.max(eventLevel, 0.42);
  }

  if (isLastPlaybackTrack) {
    eventLevel = Math.max(eventLevel, 0.88);
  }

  if (track.id === "drums" && (localDawAudioState?.activeDrumVoiceCount || localDawAudioState?.lastDrumHitLabel)) {
    eventLevel = Math.max(eventLevel, 0.78);
  }

  if (track.id === "bass" && (
    localDawAudioState?.activeBassVoiceCount ||
    localDawAudioState?.lastBassNoteLabel ||
    localDawAudioState?.isBassPatternAuditioning
  )) {
    eventLevel = Math.max(eventLevel, 0.74);
  }

  if (track.id === "fm-synth" && (localDawAudioState?.activeFmSynthVoiceCount || localDawAudioState?.lastFmSynthNoteLabel)) {
    eventLevel = Math.max(eventLevel, 0.72);
  }

  if (track.id === "piano" && localDawAudioState?.lastPianoLiveNoteLabel) {
    eventLevel = Math.max(eventLevel, 0.58);
  }

  return Math.max(0.04, Math.min(1, eventLevel * track.volume));
}

function getMasterMeterLevel(localDawState: LocalDawState, localDawAudioState: LocalDawAudioEngineState | undefined) {
  if (!localDawAudioState || localDawAudioState.isMuted || localDawAudioState.masterVolume <= 0) {
    return 0.02;
  }

  const trackPeak = localDawState.tracks.reduce((peak, track) => (
    Math.max(peak, getTrackMeterLevel(localDawState, localDawAudioState, track))
  ), 0);

  return Math.max(0.04, Math.min(1, trackPeak * (localDawAudioState.masterVolume / STUDIO_DISPLAY_MAX_MASTER_VOLUME)));
}

function StudioMixerButton({
  control,
}: {
  control: StudioMixerControlSpec;
}) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: control.id,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#241324" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.18 : 0.07,
          roughness: 0.7,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.78, control.size[2] * 0.68]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-mixer-control-${control.id}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioMixerStrip({
  controls,
  label,
  meterLevel,
  muted,
  trackColor,
  volume,
  x,
}: {
  controls: StudioMixerControlSpec[];
  label: string;
  meterLevel: number;
  muted: boolean;
  trackColor: string;
  volume: number;
  x: number;
}) {
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: muted ? "#6f86a3" : trackColor,
    caption: `${muted ? "MUTE" : "V"}${muted ? "" : Math.round(volume * 100)}`,
    isActive: !muted && volume > 0,
    label,
  }), [label, meterLevel, muted, trackColor, volume]);
  const meterDepth = Math.max(0.018, Math.min(0.26, meterLevel * 0.26));

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.828, 0.93]}>
        <boxGeometry args={[0.36, 0.024, 0.48]} />
        <meshStandardMaterial args={[{ color: "#050914", emissive: "#07111f", emissiveIntensity: 0.12, roughness: 0.74, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[0, 0.876, 0.715]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.29, 0.12]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-mixer-strip-${label}-${Math.round(volume * 100)}-${muted ? "mute" : "on"}-${Math.round(meterLevel * 100)}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[-0.12, 0.872, 0.96 - (0.26 - meterDepth) / 2]}>
        <boxGeometry args={[0.07, 0.025, meterDepth]} />
        <meshBasicMaterial args={[{ color: muted ? "#6f86a3" : trackColor, transparent: true, opacity: muted ? 0.22 : 0.48 + meterLevel * 0.28, toneMapped: false }]} />
      </mesh>
      <mesh position={[-0.12, 0.858, 0.96]}>
        <boxGeometry args={[0.09, 0.01, 0.29]} />
        <meshBasicMaterial args={[{ color: trackColor, transparent: true, opacity: 0.2, wireframe: true, toneMapped: false }]} />
      </mesh>
      {controls.map((control) => (
        <StudioMixerButton key={control.id} control={control} />
      ))}
    </group>
  );
}

function StudioMixerControls({
  localDawActions,
  localDawAudioActions,
  localDawAudioState,
  localDawState,
  phaseVisuals,
}: {
  localDawActions?: LocalDawActions;
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const trackStrips = useMemo(() => {
    if (!localDawState || !localDawActions) {
      return [];
    }

    return localDawState.tracks.map((track, index) => {
      const x = (index - (localDawState.tracks.length - 1) / 2) * 0.38;
      const volumePercent = Math.round(track.volume * 100);
      const controls: StudioMixerControlSpec[] = [
        {
          id: `studio-mixer-${track.id}-mute`,
          label: track.muted ? "Mute" : "On",
          caption: `${track.label} ${track.muted ? "Muted" : "On"}`,
          position: [0.1, 0.87, 0.84],
          size: [0.16, 0.03, 0.07],
          accentColor: track.muted ? phaseVisuals.timerAccent : track.color,
          isActive: track.muted,
          onActivate: () => {
            localDawActions.toggleTrackMute(track.id);
          },
        },
        {
          id: `studio-mixer-${track.id}-volume-down`,
          label: "Vol -",
          caption: `${track.label} Volume Down`,
          position: [0.03, 0.87, 1.08],
          size: [0.13, 0.028, 0.065],
          accentColor: phaseVisuals.gridSecondary,
          onActivate: () => {
            localDawActions.adjustTrackVolume(track.id, -0.1);
          },
        },
        {
          id: `studio-mixer-${track.id}-volume-up`,
          label: "Vol +",
          caption: `${track.label} Volume Up`,
          position: [0.17, 0.87, 1.08],
          size: [0.13, 0.028, 0.065],
          accentColor: phaseVisuals.gridSecondary,
          onActivate: () => {
            localDawActions.adjustTrackVolume(track.id, 0.1);
          },
        },
      ];

      return {
        controls,
        label: track.label,
        meterLevel: getTrackMeterLevel(localDawState, localDawAudioState, track),
        muted: track.muted,
        trackColor: track.color,
        volume: track.volume,
        volumePercent,
        x,
      };
    });
  }, [
    localDawActions,
    localDawAudioState,
    localDawState,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);
  const masterVolume = localDawAudioState?.masterVolume ?? 0;
  const masterMuted = localDawAudioState?.isMuted ?? true;
  const masterMeterLevel = localDawState ? getMasterMeterLevel(localDawState, localDawAudioState) : 0.02;
  const masterControls = useMemo<StudioMixerControlSpec[]>(() => [
    {
      id: "studio-mixer-master-mute",
      label: masterMuted ? "Mute" : "On",
      caption: masterMuted ? "Master Muted" : "Master On",
      position: [0.1, 0.87, 0.84],
      size: [0.16, 0.03, 0.07],
      accentColor: masterMuted ? phaseVisuals.timerAccent : "#e9fbff",
      isActive: masterMuted,
      onActivate: () => {
        localDawAudioActions?.toggleMuted();
      },
    },
    {
      id: "studio-mixer-master-volume-down",
      label: "Vol -",
      caption: "Master Volume Down",
      position: [0.03, 0.87, 1.08],
      size: [0.13, 0.028, 0.065],
      accentColor: phaseVisuals.gridSecondary,
      onActivate: () => {
        localDawAudioActions?.setMasterVolume(masterVolume - STUDIO_MASTER_VOLUME_STEP);
      },
    },
    {
      id: "studio-mixer-master-volume-up",
      label: "Vol +",
      caption: "Master Volume Up",
      position: [0.17, 0.87, 1.08],
      size: [0.13, 0.028, 0.065],
      accentColor: phaseVisuals.gridSecondary,
      onActivate: () => {
        localDawAudioActions?.setMasterVolume(masterVolume + STUDIO_MASTER_VOLUME_STEP);
      },
    },
  ], [
    localDawAudioActions,
    masterMuted,
    masterVolume,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);

  if (!localDawState || !localDawActions) {
    return null;
  }

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0.08, 0.818, 0.93]}>
        <boxGeometry args={[2.55, 0.018, 0.58]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary, transparent: true, opacity: 0.055, toneMapped: false }]} />
      </mesh>
      {trackStrips.map((strip) => (
        <StudioMixerStrip
          key={strip.label}
          controls={strip.controls}
          label={strip.label}
          meterLevel={strip.meterLevel}
          muted={strip.muted}
          trackColor={strip.trackColor}
          volume={strip.volume}
          x={strip.x}
        />
      ))}
      {localDawAudioActions ? (
        <StudioMixerStrip
          controls={masterControls}
          label="Master"
          meterLevel={masterMeterLevel}
          muted={masterMuted}
          trackColor="#e9fbff"
          volume={masterVolume / STUDIO_DISPLAY_MAX_MASTER_VOLUME}
          x={1.18}
        />
      ) : null}
    </group>
  );
}

function createStudioTransportControlCanvas({
  accentColor,
  caption,
  captionFontSize = 22,
  enabled,
  isActive,
  label,
}: {
  accentColor: string;
  caption: string;
  captionFontSize?: number;
  enabled?: boolean;
  isActive?: boolean;
  label: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 192;
  const isEnabled = enabled ?? true;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#050914";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.globalAlpha = isEnabled ? (isActive ? 0.62 : 0.38) : 0.18;
  context.lineWidth = 8;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.globalAlpha = 1;

  context.fillStyle = accentColor;
  context.globalAlpha = isEnabled ? (isActive ? 0.86 : 0.68) : 0.32;
  context.font = "700 46px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), canvas.width / 2, 78);
  context.fillStyle = isEnabled ? "#a9bdc9" : "#6f86a3";
  context.globalAlpha = isEnabled ? (captionFontSize > 22 ? 0.72 : 0.48) : 0.24;
  context.font = `700 ${captionFontSize}px monospace`;
  context.fillText(caption.toUpperCase(), canvas.width / 2, 124);
  context.globalAlpha = 1;

  return canvas;
}

function createStudioStatusLightLabelCanvas(label: string, accentColor: string, isActive: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 72;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#050914";
  context.globalAlpha = 0.82;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = isActive ? 0.58 : 0.3;
  context.strokeStyle = accentColor;
  context.lineWidth = 6;
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  context.globalAlpha = 1;
  context.fillStyle = isActive ? accentColor : "#9aacbd";
  context.font = "700 30px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2 + 1);

  return canvas;
}

function StudioTransportControl({ control }: { control: StudioTransportControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-transport-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: control.isEnabled ?? true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.isEnabled, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.018, 0]}>
        <boxGeometry args={[control.size[0] + 0.06, 0.02, control.size[2] + 0.05]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isEnabled === false ? 0.05 : control.isActive ? 0.24 : 0.12, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isEnabled === false ? "#111722" : control.isActive ? "#17243a" : "#10192b",
          emissive: control.accentColor,
          emissiveIntensity: control.isEnabled === false ? 0.06 : control.isActive ? 0.24 : 0.12,
          roughness: 0.68,
          metalness: 0.05,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.78, control.size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.78, toneMapped: false }]}>
          <canvasTexture key={`studio-transport-control-${control.id}-${control.label}-${control.isActive ? "active" : "idle"}-${control.isEnabled === false ? "disabled" : "enabled"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioAudioSafetyControl({ control }: { control: StudioAudioControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-audio-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.014, 0]}>
        <boxGeometry args={[control.size[0] + 0.04, 0.014, control.size[2] + 0.035]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.18 : 0.09, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#132b27" : "#0d1727",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.18 : 0.08,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.8, control.size[2] * 0.68]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-audio-control-${control.id}-${control.label}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioMasterVolumeBar({
  localDawAudioState,
  phaseVisuals,
}: {
  localDawAudioState?: LocalDawAudioEngineState;
  phaseVisuals: PhaseVisuals;
}) {
  const masterVolume = localDawAudioState?.masterVolume ?? 0;
  const normalizedVolume = Math.min(1, Math.max(0, masterVolume / STUDIO_DISPLAY_MAX_MASTER_VOLUME));
  const displayPercent = Math.round(normalizedVolume * 100);
  const isMuted = localDawAudioState?.isMuted ?? true;
  const accentColor = isMuted ? phaseVisuals.timerAccent : "#73ff4c";
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption: isMuted ? "Muted" : "Master",
    isActive: !isMuted && normalizedVolume > 0,
    label: `Vol ${displayPercent}%`,
  }), [accentColor, displayPercent, isMuted, normalizedVolume]);
  const fillWidth = 0.62 * normalizedVolume;

  return (
    <group position={[-1.03, 0.79, -0.5]}>
      <mesh>
        <boxGeometry args={[0.74, 0.024, 0.11]} />
        <meshStandardMaterial args={[{ color: "#071219", emissive: "#0b2830", emissiveIntensity: 0.35, roughness: 0.6 }]} />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.66, 0.014, 0.045]} />
        <meshStandardMaterial args={[{ color: "#102337", emissive: "#17324d", emissiveIntensity: 0.25, roughness: 0.5 }]} />
      </mesh>
      {fillWidth > 0 ? (
        <mesh position={[-0.31 + fillWidth / 2, 0.027, 0]}>
          <boxGeometry args={[fillWidth, 0.018, 0.058]} />
          <meshBasicMaterial args={[{
            color: accentColor,
            opacity: isMuted ? 0.4 : 0.9,
            toneMapped: false,
            transparent: true,
          }]} />
        </mesh>
      ) : null}
      <mesh position={[0, 0.047, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.52, 0.1]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.92, toneMapped: false }]}>
          <canvasTexture key={`studio-master-volume-${displayPercent}-${isMuted ? "muted" : "live"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioFmSynthControl({ control }: { control: StudioFmSynthControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-fm-synth-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[control.size[0] + 0.035, 0.014, control.size[2] + 0.032]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.18 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#132b27" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.18 : 0.07,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.7]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.56, toneMapped: false }]}>
          <canvasTexture key={`studio-fm-synth-control-${control.id}-${control.label}-${control.caption}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioFmSynthControls({
  localDawAudioActions,
  localDawAudioState,
  localDawState,
  onBroadcastDawLiveSound,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  phaseVisuals: PhaseVisuals;
}) {
  const patch = localDawAudioState?.fmSynthPatch;
  const gainScale = getTrackGainScale(localDawState, "fm-synth");
  const handlePatchCarrier = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFmSynthPatch({
      carrierFrequency: patch.carrierFrequency >= 440 ? 110 : patch.carrierFrequency + 55,
    });
  }, [localDawAudioActions, patch]);
  const handlePatchRatio = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFmSynthPatch({
      modulationRatio: patch.modulationRatio >= 4 ? 0.5 : patch.modulationRatio + 0.5,
    });
  }, [localDawAudioActions, patch]);
  const handlePatchIndex = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFmSynthPatch({
      modulationIndex: patch.modulationIndex >= 2.2 ? 0.2 : patch.modulationIndex + 0.35,
    });
  }, [localDawAudioActions, patch]);
  const handlePatchEnvelope = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFmSynthPatch({
      envelopePreset: getNextFmEnvelopePreset(patch.envelopePreset),
    });
  }, [localDawAudioActions, patch]);
  const handlePatchGain = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFmSynthPatch({
      gain: patch.gain >= FM_SYNTH_UI_GAIN_MAX ? FM_SYNTH_UI_GAIN_STEP : patch.gain + FM_SYNTH_UI_GAIN_STEP,
    });
  }, [localDawAudioActions, patch]);
  const controls = useMemo<StudioFmSynthControlSpec[]>(() => {
    if (!patch) {
      return [];
    }

    const noteControls = FM_SYNTH_NOTE_SPECS.map((note, index) => ({
      id: `note-${note.label.toLowerCase().replace("#", "s")}`,
      label: note.label,
      caption: `FM Synth ${note.label}`,
      position: [-0.58 + index * 0.29, 0.755, 0.68] as Vec3,
      size: [0.22, 0.035, 0.12] as Vec3,
      accentColor: phaseVisuals.gridPrimary,
      isActive: localDawAudioState?.lastFmSynthNoteLabel === note.label,
      onActivate: () => {
        localDawAudioActions?.playFmSynthNote({
          ...note,
          gainScale,
        });
        if (gainScale > 0) {
          onBroadcastDawLiveSound?.({
            areaId: "recording-studio",
            kind: "fm-synth",
            label: note.label,
            frequency: note.frequency,
            gainScale,
            fmSynthPatch: patch,
          });
        }
      },
    }));
    const patchControls: StudioFmSynthControlSpec[] = [
      {
        id: "carrier",
        label: "Car",
        caption: `${Math.round(patch.carrierFrequency)} Hz`,
        position: [-0.7, 0.998, -0.43],
        size: [0.24, 0.032, 0.12],
        accentColor: "#73ff4c",
        onActivate: handlePatchCarrier,
      },
      {
        id: "ratio",
        label: "Ratio",
        caption: `${patch.modulationRatio.toFixed(1)} Ratio`,
        position: [-0.35, 0.998, -0.43],
        size: [0.24, 0.032, 0.12],
        accentColor: phaseVisuals.gridSecondary,
        onActivate: handlePatchRatio,
      },
      {
        id: "index",
        label: "Index",
        caption: `${patch.modulationIndex.toFixed(1)} Index`,
        position: [0, 0.998, -0.43],
        size: [0.24, 0.032, 0.12],
        accentColor: phaseVisuals.gridSecondary,
        onActivate: handlePatchIndex,
      },
      {
        id: "envelope",
        label: "Env",
        caption: `${patch.envelopePreset} Envelope`,
        position: [0.35, 0.998, -0.43],
        size: [0.24, 0.032, 0.12],
        accentColor: phaseVisuals.timerAccent,
        onActivate: handlePatchEnvelope,
      },
      {
        id: "gain",
        label: "Gain",
        caption: `${Math.min(100, Math.round((patch.gain / FM_SYNTH_UI_GAIN_MAX) * 100))}% Gain`,
        position: [0.7, 0.998, -0.43],
        size: [0.24, 0.032, 0.12],
        accentColor: phaseVisuals.timerAccent,
        onActivate: handlePatchGain,
      },
    ];

    return [...noteControls, ...patchControls];
  }, [
    handlePatchCarrier,
    handlePatchEnvelope,
    handlePatchGain,
    handlePatchIndex,
    handlePatchRatio,
    localDawAudioActions,
    localDawAudioState?.lastFmSynthNoteLabel,
    gainScale,
    onBroadcastDawLiveSound,
    patch,
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);

  if (!localDawAudioActions || !patch) {
    return null;
  }

  return (
    <group position={STUDIO_PIANO_POSITION}>
      <mesh position={[0, 0.735, 0.68]}>
        <boxGeometry args={[1.74, 0.018, 0.24]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary, transparent: true, opacity: 0.08, toneMapped: false }]} />
      </mesh>
      {controls.map((control) => (
        <StudioFmSynthControl key={control.id} control={control} />
      ))}
    </group>
  );
}

function StudioDrumControl({ control }: { control: StudioDrumControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-drum-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.014, 0]}>
        <boxGeometry args={[control.size[0] + 0.045, 0.015, control.size[2] + 0.04]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.2 : 0.09, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#2a2411" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.2 : 0.08,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.78, control.size[2] * 0.68]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-drum-control-${control.id}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioDrumMachineControls({
  localDawAudioActions,
  localDawAudioState,
  localDawState,
  onBroadcastDawLiveSound,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  phaseVisuals: PhaseVisuals;
}) {
  const gainScale = getTrackGainScale(localDawState, "drums");
  const controls = useMemo<StudioDrumControlSpec[]>(() => DRUM_HIT_SPECS.map((hit, index) => {
    const allowSound = localDawState
      ? canDrumHitPatchReachSpeakers(localDawState.patch, hit.kind)
      : false;

    return {
      id: hit.kind,
      label: hit.kind.toUpperCase(),
      caption: `${hit.label} Drum`,
      position: [-0.38 + index * 0.38, 0.648, 0.34],
      size: [0.28, 0.04, 0.18],
      accentColor: hit.kind === "kick" ? "#f8d36a" : hit.kind === "snare" ? phaseVisuals.gridSecondary : phaseVisuals.gridPrimary,
      isActive: localDawAudioState?.lastDrumHitLabel === hit.label,
      onActivate: () => {
        localDawAudioActions?.playDrumVoice({
          ...hit,
          gainScale,
        }, { allowSound });
        if (allowSound && gainScale > 0) {
          onBroadcastDawLiveSound?.({
            areaId: "recording-studio",
            kind: "drum",
            label: hit.label,
            drumKind: hit.kind,
            gainScale,
          });
        }
      },
    };
  }), [
    gainScale,
    localDawAudioActions,
    localDawAudioState?.lastDrumHitLabel,
    localDawState,
    onBroadcastDawLiveSound,
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
  ]);

  if (!localDawAudioActions) {
    return null;
  }

  return (
    <group position={[-17.0, 0, -8.1]}>
      <mesh position={[0, 0.615, 0.34]}>
        <boxGeometry args={[1.24, 0.02, 0.32]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent, transparent: true, opacity: 0.08, toneMapped: false }]} />
      </mesh>
      {controls.map((control) => (
        <StudioDrumControl key={control.id} control={control} />
      ))}
    </group>
  );
}

interface StudioDrumMixerInputSpec {
  id: string;
  label: string;
  accentColor: string;
  position: Vec3;
  isActive: boolean;
  isConnected?: boolean;
}

interface StudioDrumMicSpec {
  id: string;
  label: string;
  position: Vec3;
  rotation: Vec3;
  standHeight: number;
  boomLength: number;
  accentColor: string;
}

interface StudioStaticCableSpec {
  id: string;
  color: string;
  points: Vec3[];
  radius?: number;
}

const STUDIO_DEFAULT_PATCH_CABLE_BENDS: Record<string, Vec3[]> = {
  "kick-mic-to-drum-mixer": [[-14.05, 0.18, 0.82]],
  "snare-mic-to-drum-mixer": [[-14.45, 0.42, 1.04]],
  "hat-mic-to-drum-mixer": [[-14.88, 0.58, 1.1]],
  "overhead-left-to-drum-mixer": [[-14.4, 1.52, 1.88]],
  "overhead-right-to-drum-mixer": [[-13.45, 1.42, 1.85]],
  "drum-mixer-out-to-interface-one": [
    [-14.1, 0.12, 0.2],
    [-18.5, 0.12, -3.2],
  ],
  "piano-out-to-interface-two": [
    [-16.8, 0.12, -2.6],
    [-19.2, 0.12, -4.4],
  ],
  "interface-out-to-speakers": [
    [-19, 0.12, -3.6],
    [-15.6, 0.12, 1.2],
  ],
};

function getMutableStudioVec3(position: PatchPortWorldPosition): Vec3 {
  return [position[0], position[1], position[2]];
}

function getFallbackPatchCablePoints(from: Vec3, to: Vec3): Vec3[] {
  const floorY = 0.12;
  const horizontalDistance = Math.hypot(to[0] - from[0], to[2] - from[2]);

  if (horizontalDistance < 1.4) {
    return [
      from,
      [(from[0] + to[0]) / 2, Math.max(from[1], to[1], 0.72), (from[2] + to[2]) / 2],
      to,
    ];
  }

  return [
    from,
    [from[0], floorY, from[2]],
    [to[0], floorY, to[2]],
    to,
  ];
}

function getLoosePatchCablePreviewPoint(origin: Vec3, direction: Vec3, distance = 1.75): Vec3 | null {
  const directionLength = Math.hypot(direction[0], direction[1], direction[2]);

  if (!Number.isFinite(directionLength) || directionLength < 0.001) {
    return null;
  }

  const safeDistance = Math.max(0.6, Math.min(distance, 2.4));

  return [
    origin[0] + (direction[0] / directionLength) * safeDistance,
    origin[1] + (direction[1] / directionLength) * safeDistance,
    origin[2] + (direction[2] / directionLength) * safeDistance,
  ];
}

function getStudioPatchCablePoints(cable: LocalPatchCable): Vec3[] | null {
  const endpoints = getPatchCableWorldEndpoints(cable);

  if (!endpoints) {
    return null;
  }

  const from = getMutableStudioVec3(endpoints.from);
  const to = getMutableStudioVec3(endpoints.to);
  const defaultBends = STUDIO_DEFAULT_PATCH_CABLE_BENDS[cable.id];

  return defaultBends ? [from, ...defaultBends, to] : getFallbackPatchCablePoints(from, to);
}

function StudioDrumMixerInput({
  input,
}: {
  input: StudioDrumMixerInputSpec;
}) {
  const lightColor = input.isConnected ? input.accentColor : "#ff9f4a";
  return (
    <group position={input.position}>
      <StudioAudioInterfacePort accentColor={input.accentColor} label={input.label} position={[0, 0, 0]} />
      <mesh position={[0.072, 0.02, -0.002]}>
        <cylinderGeometry args={[0.018, 0.018, 0.014, 14]} />
        <meshBasicMaterial args={[{
          color: lightColor,
          opacity: input.isConnected ? input.isActive ? 0.88 : 0.5 : 0.24,
          toneMapped: false,
          transparent: true,
        }]} />
      </mesh>
    </group>
  );
}

function StudioDrumMic({
  mic,
}: {
  mic: StudioDrumMicSpec;
}) {
  const labelCanvas = useMemo(() => createStudioInterfacePortLabelCanvas(mic.label, mic.accentColor), [mic.accentColor, mic.label]);

  return (
    <group position={mic.position} rotation={mic.rotation}>
      <mesh position={[0, -mic.standHeight / 2, 0]}>
        <cylinderGeometry args={[0.016, 0.016, mic.standHeight, 10]} />
        <meshStandardMaterial args={[{ color: "#657489", metalness: 0.26, roughness: 0.44 }]} />
      </mesh>
      <mesh position={[0, -mic.standHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.025, 18]} />
        <meshStandardMaterial args={[{ color: "#10192b", emissive: mic.accentColor, emissiveIntensity: 0.08, roughness: 0.68 }]} />
      </mesh>
      <mesh position={[0, -0.02, -mic.boomLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, mic.boomLength, 10]} />
        <meshStandardMaterial args={[{ color: "#6f7f94", metalness: 0.28, roughness: 0.42 }]} />
      </mesh>
      <mesh position={[0, -0.02, -mic.boomLength]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.038, 0.16, 18]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: mic.accentColor, emissiveIntensity: 0.14, roughness: 0.58, metalness: 0.08 }]} />
      </mesh>
      <mesh position={[0, -0.02, -mic.boomLength - 0.095]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.036, 0.006, 8, 18]} />
        <meshBasicMaterial args={[{ color: mic.accentColor, opacity: 0.44, toneMapped: false, transparent: true }]} />
      </mesh>
      <mesh position={[0, 0.1, -mic.boomLength * 0.48]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, 0.07]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.72, toneMapped: false }]}>
          <canvasTexture key={`studio-drum-mic-label-${mic.id}-${mic.label}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioDrumMixerAndMics({
  localDawAudioState,
  localDawState,
  phaseVisuals,
}: {
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const lastDrumHitLabel = localDawAudioState?.lastDrumHitLabel;
  const patch = localDawState?.patch;
  const connectedMicInputCount = patch
    ? [
      "drum-mixer-kick-in",
      "drum-mixer-snare-in",
      "drum-mixer-hat-in",
      "drum-mixer-overhead-left-in",
      "drum-mixer-overhead-right-in",
    ].filter((portId) => isPatchPortConnected(patch, portId)).length
    : 0;
  const isMixerOutConnected = patch ? isPatchPortConnected(patch, "drum-mixer-out") : false;
  const mixerOutDestination = patch ? getPatchPortPeerLabel(patch, "drum-mixer-out") : null;
  const mixerLabelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: "#f8d36a",
    caption: "Mics -> Mix",
    isActive: Boolean(lastDrumHitLabel),
    label: "Drum Mixer",
  }), [lastDrumHitLabel]);
  const outputLabelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: phaseVisuals.gridPrimary,
    caption: "Out -> Interface",
    isActive: Boolean(lastDrumHitLabel),
    label: "Mix Out",
  }), [lastDrumHitLabel, phaseVisuals.gridPrimary]);
  const micPatchCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: connectedMicInputCount === 5 ? phaseVisuals.gridPrimary : phaseVisuals.timerAccent,
    caption: isMixerOutConnected ? `Out ${mixerOutDestination ?? "Patched"}` : "No Out",
    isActive: connectedMicInputCount === 5 && isMixerOutConnected,
    label: `Mics ${connectedMicInputCount}/5`,
  }), [connectedMicInputCount, isMixerOutConnected, mixerOutDestination, phaseVisuals.gridPrimary, phaseVisuals.timerAccent]);
  const inputs = useMemo<StudioDrumMixerInputSpec[]>(() => [
    {
      id: "kick",
      label: "Kick",
      accentColor: "#f8d36a",
      position: [-0.24, 0.16, -0.08],
      isActive: lastDrumHitLabel === "Kick",
      isConnected: patch ? isPatchPortConnected(patch, "drum-mixer-kick-in") : false,
    },
    {
      id: "snare",
      label: "Snare",
      accentColor: phaseVisuals.gridSecondary,
      position: [0, 0.16, -0.08],
      isActive: lastDrumHitLabel === "Snare",
      isConnected: patch ? isPatchPortConnected(patch, "drum-mixer-snare-in") : false,
    },
    {
      id: "hat",
      label: "Hat",
      accentColor: phaseVisuals.gridPrimary,
      position: [0.24, 0.16, -0.08],
      isActive: lastDrumHitLabel === "Hat",
      isConnected: patch ? isPatchPortConnected(patch, "drum-mixer-hat-in") : false,
    },
    {
      id: "overhead-left",
      label: "OH L",
      accentColor: "#e9fbff",
      position: [-0.13, 0.16, 0.095],
      isActive: Boolean(lastDrumHitLabel),
      isConnected: patch ? isPatchPortConnected(patch, "drum-mixer-overhead-left-in") : false,
    },
    {
      id: "overhead-right",
      label: "OH R",
      accentColor: "#e9fbff",
      position: [0.13, 0.16, 0.095],
      isActive: Boolean(lastDrumHitLabel),
      isConnected: patch ? isPatchPortConnected(patch, "drum-mixer-overhead-right-in") : false,
    },
  ], [lastDrumHitLabel, patch, phaseVisuals.gridPrimary, phaseVisuals.gridSecondary]);
  const mics = useMemo<StudioDrumMicSpec[]>(() => [
    {
      id: "kick",
      label: "Kick Mic",
      position: [0, 0.52, -0.58],
      rotation: [-0.18, 0, 0],
      standHeight: 0.2,
      boomLength: 0.26,
      accentColor: "#f8d36a",
    },
    {
      id: "snare",
      label: "Snare Mic",
      position: [-0.55, 0.86, -0.7],
      rotation: [-0.45, -0.28, 0],
      standHeight: 0.4,
      boomLength: 0.34,
      accentColor: phaseVisuals.gridSecondary,
    },
    {
      id: "hat",
      label: "Hat Mic",
      position: [-1.05, 1.15, -0.62],
      rotation: [-0.52, 0.34, 0],
      standHeight: 0.52,
      boomLength: 0.34,
      accentColor: phaseVisuals.gridPrimary,
    },
    {
      id: "overhead-left",
      label: "OH L",
      position: [-0.62, 1.78, -0.12],
      rotation: [0.95, -0.12, 0],
      standHeight: 1.06,
      boomLength: 0.3,
      accentColor: "#e9fbff",
    },
    {
      id: "overhead-right",
      label: "OH R",
      position: [0.62, 1.78, -0.12],
      rotation: [0.95, 0.12, 0],
      standHeight: 1.06,
      boomLength: 0.3,
      accentColor: "#e9fbff",
    },
  ], [phaseVisuals.gridPrimary, phaseVisuals.gridSecondary]);
  const meterSegments = [0.2, 0.4, 0.6, 0.8];
  const displayLevel = lastDrumHitLabel ? 0.74 : 0.18;

  return (
    <>
      {mics.map((mic) => (
        <StudioDrumMic key={mic.id} mic={mic} />
      ))}
      <group position={[1.25, 0.52, 0.42]} rotation={[0, -0.32, 0]}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.78, 0.2, 0.46]} />
          <meshStandardMaterial args={[{ color: "#10110f", emissive: "#f8d36a", emissiveIntensity: 0.08, roughness: 0.7, metalness: 0.06 }]} />
        </mesh>
        <mesh position={[0, 0.19, -0.145]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.48, 0.14]} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.8, toneMapped: false }]}>
            <canvasTexture key={`studio-drum-mixer-label-${lastDrumHitLabel ?? "idle"}`} attach="map" args={[mixerLabelCanvas]} />
          </meshBasicMaterial>
        </mesh>
        <mesh position={[0, 0.19, 0.165]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.42, 0.1]} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.68, toneMapped: false }]}>
            <canvasTexture key={`studio-drum-mixer-output-${lastDrumHitLabel ?? "idle"}`} attach="map" args={[outputLabelCanvas]} />
          </meshBasicMaterial>
        </mesh>
        {inputs.map((input) => (
          <StudioDrumMixerInput key={input.id} input={input} />
        ))}
        <StudioAudioInterfacePort accentColor={phaseVisuals.gridPrimary} label="OUT" position={[0.34, 0.16, 0.13]} />
        <mesh position={[0.345, 0.188, 0.215]}>
          <cylinderGeometry args={[0.024, 0.024, 0.016, 16]} />
          <meshBasicMaterial args={[{ color: isMixerOutConnected ? phaseVisuals.gridPrimary : phaseVisuals.timerAccent, opacity: isMixerOutConnected ? 0.74 : 0.28, toneMapped: false, transparent: true }]} />
        </mesh>
        <mesh position={[-0.02, 0.205, 0.245]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.46, 0.11]} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.7, toneMapped: false }]}>
            <canvasTexture key={`studio-drum-patch-${connectedMicInputCount}-${isMixerOutConnected ? mixerOutDestination ?? "out" : "none"}`} attach="map" args={[micPatchCanvas]} />
          </meshBasicMaterial>
        </mesh>
        {meterSegments.map((threshold, index) => (
          <mesh key={`studio-drum-mixer-meter-${threshold}`} position={[-0.32 + index * 0.055, 0.17, 0.18]}>
            <boxGeometry args={[0.035, 0.028 + index * 0.008, 0.026]} />
            <meshBasicMaterial args={[{
              color: displayLevel >= threshold ? phaseVisuals.gridPrimary : "#283241",
              opacity: displayLevel >= threshold ? 0.76 : 0.26,
              toneMapped: false,
              transparent: true,
            }]} />
          </mesh>
        ))}
      </group>
    </>
  );
}

function StudioStaticPatchCable({ cable }: { cable: StudioStaticCableSpec }) {
  const radius = cable.radius ?? 0.024;
  const segments = cable.points.slice(0, -1).flatMap((start, pointIndex) => {
    const end = cable.points[pointIndex + 1];
    const axisSegments: Array<{ center: Vec3; length: number; rotation: Vec3 }> = [];
    const xDelta = end[0] - start[0];
    const yDelta = end[1] - start[1];
    const zDelta = end[2] - start[2];

    if (Math.abs(xDelta) > 0.001) {
      axisSegments.push({
        center: [start[0] + xDelta / 2, start[1], start[2]],
        length: Math.abs(xDelta),
        rotation: [0, 0, Math.PI / 2],
      });
    }

    if (Math.abs(yDelta) > 0.001) {
      axisSegments.push({
        center: [end[0], start[1] + yDelta / 2, start[2]],
        length: Math.abs(yDelta),
        rotation: [0, 0, 0],
      });
    }

    if (Math.abs(zDelta) > 0.001) {
      axisSegments.push({
        center: [end[0], end[1], start[2] + zDelta / 2],
        length: Math.abs(zDelta),
        rotation: [Math.PI / 2, 0, 0],
      });
    }

    return axisSegments.map((segment, segmentIndex) => ({
      ...segment,
      id: `${pointIndex}-${segmentIndex}`,
    }));
  });

  return (
    <group>
      {segments.map((segment) => (
        <mesh key={`${cable.id}-segment-${segment.id}`} position={segment.center} rotation={segment.rotation}>
          <cylinderGeometry args={[radius, radius, segment.length, 12]} />
          <meshStandardMaterial args={[{
            color: "#050914",
            emissive: cable.color,
            emissiveIntensity: 0.32,
            metalness: 0.04,
            opacity: 0.62,
            roughness: 0.72,
            transparent: true,
          }]} />
        </mesh>
      ))}
      {cable.points.map((point, index) => (
        <mesh key={`${cable.id}-plug-${index}`} position={point}>
          <sphereGeometry args={[index === 0 || index === cable.points.length - 1 ? radius * 1.75 : radius * 1.25, 12, 8]} />
          <meshBasicMaterial args={[{ color: cable.color, opacity: index === 0 || index === cable.points.length - 1 ? 0.78 : 0.48, toneMapped: false, transparent: true }]} />
        </mesh>
      ))}
    </group>
  );
}

function StudioStaticPatchCables({
  localDawState,
}: {
  localDawState?: LocalDawState;
}) {
  const cables = useMemo<StudioStaticCableSpec[]>(() => {
    if (!localDawState) {
      return [];
    }

    return localDawState.patch.cables.reduce<StudioStaticCableSpec[]>((cableSpecs, cable) => {
      if (cable.state !== "plugged") {
        return cableSpecs;
      }

      const points = getStudioPatchCablePoints(cable);

      if (!points) {
        return cableSpecs;
      }

      cableSpecs.push({
        id: cable.id,
        color: cable.color,
        points,
        radius: cable.id.startsWith("overhead-") ? 0.018 : 0.026,
      });

      return cableSpecs;
    }, []);
  }, [localDawState]);

  return (
    <>
      {cables.map((cable) => (
        <StudioStaticPatchCable key={cable.id} cable={cable} />
      ))}
    </>
  );
}

function StudioLoosePatchCablePreview({
  localDawState,
}: {
  localDawState?: LocalDawState;
}) {
  const { activeHit, aimContext } = useInteractionRegistry();
  const cable = localDawState ? getActivePatchCable(localDawState.patch) : undefined;
  const previewCable = useMemo<StudioStaticCableSpec | null>(() => {
    if (!cable || cable.state !== "loose" || !aimContext) {
      return null;
    }

    const connectedPortId = cable.fromPortId ?? cable.toPortId;
    const looseEndpointCount = Number(cable.fromPortId === null) + Number(cable.toPortId === null);

    if (!connectedPortId || looseEndpointCount !== 1) {
      return null;
    }

    const connectedPort = LEVEL1_PATCH_PORT_REGISTRATION_MAP[connectedPortId];

    if (!connectedPort) {
      return null;
    }

    const from = getMutableStudioVec3(connectedPort.worldPosition);
    const portTargetPoint = activeHit?.id.startsWith("studio-patch-port-target-")
      ? activeHit.point
      : null;
    const to = portTargetPoint
      ? getMutableStudioVec3(portTargetPoint)
      : getLoosePatchCablePreviewPoint(aimContext.origin, aimContext.direction);

    if (!to || to.some((value) => !Number.isFinite(value))) {
      return null;
    }

    return {
      id: `${cable.id}-loose-preview`,
      color: cable.color,
      points: getFallbackPatchCablePoints(from, to),
      radius: cable.id.startsWith("overhead-") ? 0.018 : 0.024,
    };
  }, [activeHit, aimContext, cable]);

  return previewCable ? <StudioStaticPatchCable cable={previewCable} /> : null;
}

interface StudioPatchCableEndTargetSpec {
  cable: LocalPatchCable;
  port: PatchPortRegistration;
}

function StudioPatchCableEndTarget({
  cable,
  localDawActions,
  port,
}: {
  cable: LocalPatchCable;
  localDawActions?: LocalDawActions;
  port: PatchPortRegistration;
}) {
  const targetRef = useRef<React.ElementRef<"mesh">>(null);
  const position = getMutableStudioVec3(port.worldPosition);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-patch-cable-end-${cable.id}-${port.portId}`,
    label: `Unplug ${cable.label}`,
    objectRef: targetRef,
    modes: ["clickable" as const],
    enabled: Boolean(localDawActions),
    onActivate: () => {
      localDawActions?.unplugPatchCableEnd(cable.id, port.portId);
    },
  }), [cable.id, cable.label, localDawActions, port.portId]));

  return (
    <mesh ref={targetRef} position={position}>
      <sphereGeometry args={[Math.max(port.visualRadius, 0.07), 12, 8]} />
      <meshBasicMaterial args={[{ color: cable.color, opacity: 0.52, toneMapped: false, transparent: true }]} />
    </mesh>
  );
}

function StudioPatchPortTarget({
  localDawActions,
  phaseVisuals,
  port,
}: {
  localDawActions?: LocalDawActions;
  phaseVisuals: PhaseVisuals;
  port: PatchPortRegistration;
}) {
  const targetRef = useRef<React.ElementRef<"mesh">>(null);
  const position = getMutableStudioVec3(port.worldPosition);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-patch-port-target-${port.portId}`,
    label: `Connect to ${port.label}`,
    objectRef: targetRef,
    modes: ["clickable" as const],
    enabled: Boolean(localDawActions),
    onActivate: () => {
      localDawActions?.connectActivePatchCableToPort(port.portId);
    },
  }), [localDawActions, port.label, port.portId]));

  return (
    <mesh ref={targetRef} position={position}>
      <sphereGeometry args={[Math.max(port.visualRadius * 1.18, 0.075), 14, 10]} />
      <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary, opacity: 0.46, toneMapped: false, transparent: true }]} />
    </mesh>
  );
}

function StudioPatchInteractionTargets({
  localDawActions,
  localDawState,
  phaseVisuals,
}: {
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const cableEndTargets = useMemo<StudioPatchCableEndTargetSpec[]>(() => {
    if (!localDawState) {
      return [];
    }

    return localDawState.patch.cables
      .filter((cable) => cable.state === "plugged")
      .flatMap((cable) => (
        [cable.fromPortId, cable.toPortId]
          .map((portId) => {
            if (!portId) {
              return null;
            }

            const port = LEVEL1_PATCH_PORT_REGISTRATION_MAP[portId];

            return port ? { cable, port } : null;
          })
          .filter((target): target is StudioPatchCableEndTargetSpec => Boolean(target))
      ));
  }, [localDawState]);

  const connectablePorts = useMemo(() => {
    if (!localDawState?.patch.activeCableId) {
      return [];
    }

    return LEVEL1_PATCH_PORT_REGISTRATIONS.filter((port) => (
      canConnectActivePatchCableToPort(localDawState.patch, port.portId)
    ));
  }, [localDawState]);

  if (!localDawState || !localDawActions) {
    return null;
  }

  return (
    <>
      {cableEndTargets.map((target) => (
        <StudioPatchCableEndTarget
          key={`${target.cable.id}-${target.port.portId}`}
          cable={target.cable}
          localDawActions={localDawActions}
          port={target.port}
        />
      ))}
      {connectablePorts.map((port) => (
        <StudioPatchPortTarget
          key={port.portId}
          localDawActions={localDawActions}
          phaseVisuals={phaseVisuals}
          port={port}
        />
      ))}
    </>
  );
}

function StudioDrumKitPiece({
  allowSound,
  gainScale,
  isActive,
  localDawAudioActions,
  onBroadcastDawLiveSound,
  piece,
}: {
  allowSound: boolean;
  gainScale: number;
  isActive: boolean;
  localDawAudioActions?: LocalDawAudioEngineActions;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  piece: StudioDrumKitPieceSpec;
}) {
  const triggerRef = useRef<React.ElementRef<"mesh">>(null);
  const isFrontFacing = piece.axis === "front";
  const cylinderRotation: Vec3 = isFrontFacing ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  const headPosition: Vec3 = isFrontFacing ? [0, 0, -piece.depth / 2 - 0.008] : [0, piece.depth / 2 + 0.008, 0];
  const headColor = piece.kind === "cymbal" ? "#f8d36a" : "#dce8ed";

  useRegisterInteractable(useMemo(() => ({
    id: `studio-drum-kit-${piece.id}`,
    label: `Drum Kit ${piece.label}`,
    objectRef: triggerRef,
    modes: ["clickable" as const],
    enabled: Boolean(localDawAudioActions),
    onActivate: () => {
      localDawAudioActions?.playDrumVoice({
        ...piece.hit,
        gainScale,
      }, { allowSound });
      if (allowSound && gainScale > 0) {
        onBroadcastDawLiveSound?.({
          areaId: "recording-studio",
          kind: "drum",
          label: piece.hit.label,
          drumKind: piece.hit.kind,
          gainScale,
        });
      }
    },
  }), [allowSound, gainScale, localDawAudioActions, onBroadcastDawLiveSound, piece.hit, piece.id, piece.label]));

  return (
    <group position={piece.position}>
      <mesh rotation={cylinderRotation}>
        <cylinderGeometry args={[piece.radius, piece.radius * 0.94, piece.depth, 36]} />
        <meshStandardMaterial args={[{
          color: piece.bodyColor,
          emissive: piece.accentColor,
          emissiveIntensity: isActive ? 0.2 : 0.08,
          roughness: piece.kind === "cymbal" ? 0.42 : 0.7,
          metalness: piece.kind === "cymbal" ? 0.2 : 0.04,
        }]} />
      </mesh>
      <mesh ref={triggerRef} position={headPosition} rotation={cylinderRotation}>
        <cylinderGeometry args={[piece.radius * 0.95, piece.radius * 0.95, 0.024, 36]} />
        <meshBasicMaterial args={[{
          color: isActive ? piece.accentColor : headColor,
          opacity: isActive ? 0.82 : 0.58,
          toneMapped: false,
          transparent: true,
        }]} />
      </mesh>
    </group>
  );
}

function StudioDrumKit({
  localDawAudioActions,
  localDawAudioState,
  localDawState,
  onBroadcastDawLiveSound,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  phaseVisuals: PhaseVisuals;
}) {
  const gainScale = getTrackGainScale(localDawState, "drums");
  const pieces = useMemo<StudioDrumKitPieceSpec[]>(() => [
    {
      id: "kick",
      label: "Kick",
      hit: { kind: "kick", label: "Kick" },
      position: [0, 0.42, -0.08],
      radius: 0.36,
      depth: 0.36,
      accentColor: "#f8d36a",
      bodyColor: "#17101b",
      axis: "front",
    },
    {
      id: "snare",
      label: "Snare",
      hit: { kind: "snare", label: "Snare" },
      position: [-0.48, 0.58, -0.42],
      radius: 0.24,
      depth: 0.16,
      accentColor: phaseVisuals.gridSecondary,
      bodyColor: "#131f31",
    },
    {
      id: "hat",
      label: "Hat",
      hit: { kind: "hat", label: "Hat" },
      position: [-0.9, 0.92, -0.36],
      radius: 0.24,
      depth: 0.026,
      accentColor: phaseVisuals.gridPrimary,
      bodyColor: "#4a3a16",
      kind: "cymbal",
    },
  ], [phaseVisuals.gridPrimary, phaseVisuals.gridSecondary]);

  return (
    <group position={STUDIO_DRUM_KIT_POSITION}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, -0.08]}>
        <planeGeometry args={[2.4, 1.72]} />
        <meshBasicMaterial args={[{ color: "#0b1525", transparent: true, opacity: 0.46, toneMapped: false }]} />
      </mesh>
      <StudioStationLabel
        accentColor="#f8d36a"
        label="Drum Kit"
        position={[0, 1.34, 0.72]}
        rotation={[0, Math.PI, 0]}
        size={[1.02, 0.3]}
      />
      <mesh position={[0.62, 0.23, 0.42]}>
        <cylinderGeometry args={[0.18, 0.22, 0.16, 20]} />
        <meshStandardMaterial args={[{ color: "#111b2d", emissive: "#07111f", emissiveIntensity: 0.18, roughness: 0.74 }]} />
      </mesh>
      <mesh position={[0.62, 0.53, 0.42]}>
        <cylinderGeometry args={[0.035, 0.035, 0.58, 12]} />
        <meshStandardMaterial args={[{ color: "#657489", metalness: 0.22, roughness: 0.48 }]} />
      </mesh>
      {[[-0.48, -0.42, 0.58], [-0.9, -0.36, 0.92], [0.74, -0.38, 1.02]].map(([x, z, height], index) => (
        <mesh key={`drum-kit-stand-${index}`} position={[x, height / 2, z]}>
          <cylinderGeometry args={[0.018, 0.018, height, 10]} />
          <meshStandardMaterial args={[{ color: "#6f7f94", metalness: 0.28, roughness: 0.44 }]} />
        </mesh>
      ))}
      {pieces.map((piece) => (
        <StudioDrumKitPiece
          key={piece.id}
          allowSound={localDawState ? canDrumHitPatchReachSpeakers(localDawState.patch, piece.hit.kind) : false}
          gainScale={gainScale}
          isActive={localDawAudioState?.lastDrumHitLabel === piece.hit.label}
          localDawAudioActions={localDawAudioActions}
          onBroadcastDawLiveSound={onBroadcastDawLiveSound}
          piece={piece}
        />
      ))}
      <StudioDrumMixerAndMics localDawAudioState={localDawAudioState} localDawState={localDawState} phaseVisuals={phaseVisuals} />
      <mesh position={[0.35, 0.64, -0.42]}>
        <cylinderGeometry args={[0.22, 0.2, 0.18, 32]} />
        <meshStandardMaterial args={[{ color: "#0f1a2b", emissive: "#57f3ff", emissiveIntensity: 0.06, roughness: 0.68 }]} />
      </mesh>
      <mesh position={[0.66, 0.54, -0.1]}>
        <cylinderGeometry args={[0.26, 0.24, 0.2, 32]} />
        <meshStandardMaterial args={[{ color: "#10192b", emissive: "#73ff4c", emissiveIntensity: 0.05, roughness: 0.68 }]} />
      </mesh>
      <mesh position={[0.74, 1.02, -0.38]} rotation={[0.12, 0, -0.08]}>
        <cylinderGeometry args={[0.31, 0.31, 0.024, 36]} />
        <meshStandardMaterial args={[{ color: "#7a6223", emissive: "#f8d36a", emissiveIntensity: 0.12, metalness: 0.18, roughness: 0.42 }]} />
      </mesh>
      <mesh position={[0.04, 0.16, -0.38]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.22, 0.035, 0.32]} />
        <meshStandardMaterial args={[{ color: "#121a27", emissive: "#f8d36a", emissiveIntensity: 0.1, roughness: 0.72 }]} />
      </mesh>
    </group>
  );
}

function StudioBassControl({ control }: { control: StudioBassControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-bass-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[control.size[0] + 0.04, 0.014, control.size[2] + 0.034]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.2 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#132b27" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.2 : 0.08,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.78, control.size[2] * 0.68]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-bass-control-${control.id}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioBassMachineControls({
  localDawAudioActions,
  localDawAudioState,
  localDawState,
  onBroadcastDawLiveSound,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  phaseVisuals: PhaseVisuals;
}) {
  const patch = localDawAudioState?.bassMachinePatch;
  const gainScale = getTrackGainScale(localDawState, "bass");
  const handleWaveform = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustBassMachinePatch({
      waveform: patch.waveform === "sawtooth" ? "square" : "sawtooth",
    });
  }, [localDawAudioActions, patch]);
  const handleCutoff = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustBassMachinePatch({
      cutoffFrequency: patch.cutoffFrequency >= 1200 ? 180 : patch.cutoffFrequency + 180,
    });
  }, [localDawAudioActions, patch]);
  const handleResonance = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustBassMachinePatch({
      resonance: patch.resonance >= 6 ? 0.8 : patch.resonance + 0.8,
    });
  }, [localDawAudioActions, patch]);
  const handleEnvelope = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustBassMachinePatch({
      envelopeAmount: patch.envelopeAmount >= 1600 ? 120 : patch.envelopeAmount + 240,
    });
  }, [localDawAudioActions, patch]);
  const handleGain = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustBassMachinePatch({
      gain: patch.gain >= 0.15 ? 0.04 : patch.gain + 0.02,
    });
  }, [localDawAudioActions, patch]);
  const controls = useMemo<StudioBassControlSpec[]>(() => {
    if (!patch) {
      return [];
    }

    const noteControls = BASS_NOTE_SPECS.map((note, index) => ({
      id: `note-${note.label.toLowerCase()}`,
      label: note.label,
      caption: `Bass ${note.label}`,
      position: [-0.34 + index * 0.23, 0.72, 0.33] as Vec3,
      size: [0.17, 0.033, 0.105] as Vec3,
      accentColor: "#73ff4c",
      isActive: localDawAudioState?.lastBassNoteLabel === note.label,
      onActivate: () => {
        localDawAudioActions?.playBassNote({
          ...note,
          gainScale,
        });
        if (gainScale > 0) {
          onBroadcastDawLiveSound?.({
            areaId: "recording-studio",
            kind: "bass",
            label: note.label,
            frequency: note.frequency,
            gainScale,
            bassMachinePatch: patch,
          });
        }
      },
    }));
    const patchControls: StudioBassControlSpec[] = [
      {
        id: "wave",
        label: "Wave",
        caption: patch.waveform,
        position: [-0.44, 0.72, 0.12],
        size: [0.2, 0.03, 0.095],
        accentColor: phaseVisuals.gridPrimary,
        onActivate: handleWaveform,
      },
      {
        id: "cutoff",
        label: "Cut",
        caption: `${Math.round(patch.cutoffFrequency)} Hz`,
        position: [-0.22, 0.72, 0.12],
        size: [0.2, 0.03, 0.095],
        accentColor: phaseVisuals.gridSecondary,
        onActivate: handleCutoff,
      },
      {
        id: "res",
        label: "Res",
        caption: `${patch.resonance.toFixed(1)} Res`,
        position: [0, 0.72, 0.12],
        size: [0.2, 0.03, 0.095],
        accentColor: phaseVisuals.gridSecondary,
        onActivate: handleResonance,
      },
      {
        id: "env",
        label: "Env",
        caption: `${Math.round(patch.envelopeAmount)} Env`,
        position: [0.22, 0.72, 0.12],
        size: [0.2, 0.03, 0.095],
        accentColor: phaseVisuals.timerAccent,
        onActivate: handleEnvelope,
      },
      {
        id: "gain",
        label: "Gain",
        caption: `${Math.round(patch.gain * 100)}% Gain`,
        position: [0.44, 0.72, 0.12],
        size: [0.2, 0.03, 0.095],
        accentColor: phaseVisuals.timerAccent,
        onActivate: handleGain,
      },
      {
        id: "riff",
        label: "Riff",
        caption: "Bass Riff",
        position: [0, 0.72, -0.08],
        size: [0.34, 0.034, 0.105],
        accentColor: "#f8d36a",
        isActive: localDawAudioState?.isBassPatternAuditioning,
        onActivate: () => {
          localDawAudioActions?.playBassPatternAudition(gainScale);
          if (gainScale > 0) {
            onBroadcastDawLiveSound?.({
              areaId: "recording-studio",
              kind: "bass-pattern",
              label: "Bass Riff",
              gainScale,
              bassMachinePatch: patch,
            });
          }
        },
      },
    ];

    return [...noteControls, ...patchControls];
  }, [
    handleCutoff,
    handleEnvelope,
    handleGain,
    handleResonance,
    handleWaveform,
    gainScale,
    localDawAudioActions,
    localDawAudioState?.isBassPatternAuditioning,
    localDawAudioState?.lastBassNoteLabel,
    onBroadcastDawLiveSound,
    patch,
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);

  if (!localDawAudioActions || !patch) {
    return null;
  }

  return (
    <group position={[-20.1, 0, -8.32]}>
      <mesh position={[0, 0.69, 0.25]}>
        <boxGeometry args={[1.24, 0.02, 0.68]} />
        <meshBasicMaterial args={[{ color: "#73ff4c", transparent: true, opacity: 0.075, toneMapped: false }]} />
      </mesh>
      {controls.map((control) => (
        <StudioBassControl key={control.id} control={control} />
      ))}
    </group>
  );
}

function StudioFilterControl({ control }: { control: StudioFilterControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-filter-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[control.size[0] + 0.04, 0.014, control.size[2] + 0.034]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.2 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#241a14" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.18 : 0.07,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-filter-control-${control.id}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioFilterEffectStatus({
  cutoffFrequency,
  phaseVisuals,
  resonance,
}: {
  cutoffFrequency: number;
  phaseVisuals: PhaseVisuals;
  resonance: number;
}) {
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: phaseVisuals.timerAccent,
    caption: `CUT ${Math.round(cutoffFrequency)} Q ${resonance.toFixed(1)}`,
    isActive: cutoffFrequency < 12000 || resonance > 0.7,
    label: "Filter Local",
  }), [cutoffFrequency, phaseVisuals.timerAccent, resonance]);

  return (
    <mesh position={[0, 1.02, 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.82, 0.2]} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
        <canvasTexture key={`studio-filter-status-${Math.round(cutoffFrequency)}-${resonance.toFixed(1)}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function StudioFilterEffectControls({
  localDawAudioActions,
  localDawAudioState,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  phaseVisuals: PhaseVisuals;
}) {
  const patch = localDawAudioState?.filterEffectPatch;
  const handleCutoffDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFilterEffectPatch({
      cutoffFrequency: patch.cutoffFrequency - 600,
    });
  }, [localDawAudioActions, patch]);
  const handleCutoffUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFilterEffectPatch({
      cutoffFrequency: patch.cutoffFrequency + 600,
    });
  }, [localDawAudioActions, patch]);
  const handleResonanceDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFilterEffectPatch({
      resonance: patch.resonance - 0.5,
    });
  }, [localDawAudioActions, patch]);
  const handleResonanceUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustFilterEffectPatch({
      resonance: patch.resonance + 0.5,
    });
  }, [localDawAudioActions, patch]);
  const controls = useMemo<StudioFilterControlSpec[]>(() => {
    if (!patch) {
      return [];
    }

    return [
      {
        id: "cutoff-down",
        label: "Cut -",
        caption: `${Math.round(patch.cutoffFrequency)} Hz`,
        position: [-0.32, 0.74, 0.28],
        size: [0.23, 0.034, 0.11],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.cutoffFrequency < 12000,
        onActivate: handleCutoffDown,
      },
      {
        id: "cutoff-up",
        label: "Cut +",
        caption: `${Math.round(patch.cutoffFrequency)} Hz`,
        position: [-0.06, 0.74, 0.28],
        size: [0.23, 0.034, 0.11],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.cutoffFrequency < 12000,
        onActivate: handleCutoffUp,
      },
      {
        id: "resonance-down",
        label: "Q -",
        caption: `${patch.resonance.toFixed(1)} Q`,
        position: [0.2, 0.74, 0.28],
        size: [0.2, 0.034, 0.11],
        accentColor: phaseVisuals.timerAccent,
        isActive: patch.resonance > 0.7,
        onActivate: handleResonanceDown,
      },
      {
        id: "resonance-up",
        label: "Q +",
        caption: `${patch.resonance.toFixed(1)} Q`,
        position: [0.44, 0.74, 0.28],
        size: [0.2, 0.034, 0.11],
        accentColor: phaseVisuals.timerAccent,
        isActive: patch.resonance > 0.7,
        onActivate: handleResonanceUp,
      },
    ];
  }, [
    handleCutoffDown,
    handleCutoffUp,
    handleResonanceDown,
    handleResonanceUp,
    patch,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);

  if (!localDawAudioActions || !patch) {
    return null;
  }

  return (
    <group position={[-13.8, 0, -8.32]}>
      <mesh position={[0.06, 0.73, 0.25]}>
        <boxGeometry args={[1.1, 0.018, 0.42]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent, transparent: true, opacity: 0.075, toneMapped: false }]} />
      </mesh>
      <StudioFilterEffectStatus cutoffFrequency={patch.cutoffFrequency} phaseVisuals={phaseVisuals} resonance={patch.resonance} />
      {controls.map((control) => (
        <StudioFilterControl key={control.id} control={control} />
      ))}
      <StudioPianoVisualControl
        accentColor={phaseVisuals.gridSecondary}
        caption="OWNED ONLY"
        label="APP TRACKS"
        position={[0.06, 0.74, 0.08]}
        size={[0.52, 0.03, 0.095]}
      />
    </group>
  );
}

function StudioAutopanControl({ control }: { control: StudioAutopanControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-autopan-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[control.size[0] + 0.04, 0.014, control.size[2] + 0.034]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.2 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#142126" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.18 : 0.07,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-autopan-control-${control.id}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioAutopanEffectStatus({
  depth,
  phaseVisuals,
  rateHz,
}: {
  depth: number;
  phaseVisuals: PhaseVisuals;
  rateHz: number;
}) {
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: phaseVisuals.gridPrimary,
    caption: `RATE ${rateHz.toFixed(2)} DEPTH ${depth.toFixed(1)}`,
    isActive: depth > 0,
    label: "Pan Local",
  }), [depth, phaseVisuals.gridPrimary, rateHz]);

  return (
    <mesh position={[0, 0.45, 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.82, 0.2]} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
        <canvasTexture key={`studio-autopan-status-${rateHz.toFixed(2)}-${depth.toFixed(1)}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function StudioAutopanEffectControls({
  localDawAudioActions,
  localDawAudioState,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  phaseVisuals: PhaseVisuals;
}) {
  const patch = localDawAudioState?.autopanEffectPatch;
  const handleRateDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustAutopanEffectPatch({
      rateHz: patch.rateHz - 0.25,
    });
  }, [localDawAudioActions, patch]);
  const handleRateUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustAutopanEffectPatch({
      rateHz: patch.rateHz + 0.25,
    });
  }, [localDawAudioActions, patch]);
  const handleDepthDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustAutopanEffectPatch({
      depth: patch.depth - 0.1,
    });
  }, [localDawAudioActions, patch]);
  const handleDepthUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustAutopanEffectPatch({
      depth: patch.depth + 0.1,
    });
  }, [localDawAudioActions, patch]);
  const controls = useMemo<StudioAutopanControlSpec[]>(() => {
    if (!patch) {
      return [];
    }

    return [
      {
        id: "rate-down",
        label: "Rate -",
        caption: `${patch.rateHz.toFixed(2)} Hz`,
        position: [-0.32, 0.46, 0.28],
        size: [0.23, 0.034, 0.11],
        accentColor: phaseVisuals.gridPrimary,
        isActive: patch.depth > 0,
        onActivate: handleRateDown,
      },
      {
        id: "rate-up",
        label: "Rate +",
        caption: `${patch.rateHz.toFixed(2)} Hz`,
        position: [-0.06, 0.46, 0.28],
        size: [0.23, 0.034, 0.11],
        accentColor: phaseVisuals.gridPrimary,
        isActive: patch.depth > 0,
        onActivate: handleRateUp,
      },
      {
        id: "depth-down",
        label: "Dep -",
        caption: `${Math.round(patch.depth * 100)}% Depth`,
        position: [0.2, 0.46, 0.28],
        size: [0.2, 0.034, 0.11],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.depth > 0,
        onActivate: handleDepthDown,
      },
      {
        id: "depth-up",
        label: "Dep +",
        caption: `${Math.round(patch.depth * 100)}% Depth`,
        position: [0.44, 0.46, 0.28],
        size: [0.2, 0.034, 0.11],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.depth > 0,
        onActivate: handleDepthUp,
      },
    ];
  }, [
    handleDepthDown,
    handleDepthUp,
    handleRateDown,
    handleRateUp,
    patch,
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
  ]);

  if (!localDawAudioActions || !patch) {
    return null;
  }

  return (
    <group position={[-13.8, 0, -8.32]}>
      <mesh position={[0.06, 0.45, 0.25]}>
        <boxGeometry args={[1.1, 0.018, 0.42]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary, transparent: true, opacity: 0.07, toneMapped: false }]} />
      </mesh>
      <StudioAutopanEffectStatus depth={patch.depth} phaseVisuals={phaseVisuals} rateHz={patch.rateHz} />
      {controls.map((control) => (
        <StudioAutopanControl key={control.id} control={control} />
      ))}
    </group>
  );
}

function StudioEchoControl({ control }: { control: StudioEchoControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-echo-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[control.size[0] + 0.035, 0.014, control.size[2] + 0.03]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.2 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#251821" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.18 : 0.07,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.58, toneMapped: false }]}>
          <canvasTexture key={`studio-echo-control-${control.id}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioEchoEffectStatus({
  delayTimeSeconds,
  feedback,
  phaseVisuals,
  wetMix,
}: {
  delayTimeSeconds: number;
  feedback: number;
  phaseVisuals: PhaseVisuals;
  wetMix: number;
}) {
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: phaseVisuals.timerAccent,
    caption: `T ${Math.round(delayTimeSeconds * 1000)}MS FB ${Math.round(feedback * 100)} MIX ${Math.round(wetMix * 100)}`,
    isActive: wetMix > 0,
    label: "Echo Local",
  }), [delayTimeSeconds, feedback, phaseVisuals.timerAccent, wetMix]);

  return (
    <mesh position={[0, 0.31, 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.82, 0.18]} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.56, toneMapped: false }]}>
        <canvasTexture key={`studio-echo-status-${delayTimeSeconds.toFixed(2)}-${feedback.toFixed(2)}-${wetMix.toFixed(2)}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function StudioEchoEffectControls({
  localDawAudioActions,
  localDawAudioState,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  phaseVisuals: PhaseVisuals;
}) {
  const patch = localDawAudioState?.echoEffectPatch;
  const handleTimeDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustEchoEffectPatch({
      delayTimeSeconds: patch.delayTimeSeconds - 0.05,
    });
  }, [localDawAudioActions, patch]);
  const handleTimeUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustEchoEffectPatch({
      delayTimeSeconds: patch.delayTimeSeconds + 0.05,
    });
  }, [localDawAudioActions, patch]);
  const handleFeedbackDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustEchoEffectPatch({
      feedback: patch.feedback - 0.05,
    });
  }, [localDawAudioActions, patch]);
  const handleFeedbackUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustEchoEffectPatch({
      feedback: patch.feedback + 0.05,
    });
  }, [localDawAudioActions, patch]);
  const handleMixDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustEchoEffectPatch({
      wetMix: patch.wetMix - 0.05,
    });
  }, [localDawAudioActions, patch]);
  const handleMixUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustEchoEffectPatch({
      wetMix: patch.wetMix + 0.05,
    });
  }, [localDawAudioActions, patch]);
  const controls = useMemo<StudioEchoControlSpec[]>(() => {
    if (!patch) {
      return [];
    }

    return [
      {
        id: "time-down",
        label: "T -",
        caption: `${Math.round(patch.delayTimeSeconds * 1000)} ms`,
        position: [-0.45, 0.19, 0.28],
        size: [0.14, 0.032, 0.1],
        accentColor: phaseVisuals.timerAccent,
        isActive: patch.wetMix > 0,
        onActivate: handleTimeDown,
      },
      {
        id: "time-up",
        label: "T +",
        caption: `${Math.round(patch.delayTimeSeconds * 1000)} ms`,
        position: [-0.28, 0.19, 0.28],
        size: [0.14, 0.032, 0.1],
        accentColor: phaseVisuals.timerAccent,
        isActive: patch.wetMix > 0,
        onActivate: handleTimeUp,
      },
      {
        id: "feedback-down",
        label: "Fb -",
        caption: `${Math.round(patch.feedback * 100)}% Feedback`,
        position: [-0.1, 0.19, 0.28],
        size: [0.14, 0.032, 0.1],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.wetMix > 0,
        onActivate: handleFeedbackDown,
      },
      {
        id: "feedback-up",
        label: "Fb +",
        caption: `${Math.round(patch.feedback * 100)}% Feedback`,
        position: [0.08, 0.19, 0.28],
        size: [0.14, 0.032, 0.1],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.wetMix > 0,
        onActivate: handleFeedbackUp,
      },
      {
        id: "mix-down",
        label: "Mix -",
        caption: `${Math.round(patch.wetMix * 100)}% Wet`,
        position: [0.27, 0.19, 0.28],
        size: [0.15, 0.032, 0.1],
        accentColor: phaseVisuals.gridPrimary,
        isActive: patch.wetMix > 0,
        onActivate: handleMixDown,
      },
      {
        id: "mix-up",
        label: "Mix +",
        caption: `${Math.round(patch.wetMix * 100)}% Wet`,
        position: [0.46, 0.19, 0.28],
        size: [0.15, 0.032, 0.1],
        accentColor: phaseVisuals.gridPrimary,
        isActive: patch.wetMix > 0,
        onActivate: handleMixUp,
      },
    ];
  }, [
    handleFeedbackDown,
    handleFeedbackUp,
    handleMixDown,
    handleMixUp,
    handleTimeDown,
    handleTimeUp,
    patch,
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);

  if (!localDawAudioActions || !patch) {
    return null;
  }

  return (
    <group position={[-13.8, 0, -8.32]}>
      <mesh position={[0.06, 0.19, 0.25]}>
        <boxGeometry args={[1.1, 0.016, 0.42]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent, transparent: true, opacity: 0.065, toneMapped: false }]} />
      </mesh>
      <StudioEchoEffectStatus
        delayTimeSeconds={patch.delayTimeSeconds}
        feedback={patch.feedback}
        phaseVisuals={phaseVisuals}
        wetMix={patch.wetMix}
      />
      {controls.map((control) => (
        <StudioEchoControl key={control.id} control={control} />
      ))}
    </group>
  );
}

function StudioReverbControl({ control }: { control: StudioReverbControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-reverb-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.011, 0]}>
        <boxGeometry args={[control.size[0] + 0.035, 0.014, control.size[2] + 0.03]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.18 : 0.07, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#1f1b2a" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.16 : 0.06,
          roughness: 0.74,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.55, toneMapped: false }]}>
          <canvasTexture key={`studio-reverb-control-${control.id}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioReverbEffectStatus({
  decaySeconds,
  phaseVisuals,
  wetMix,
}: {
  decaySeconds: number;
  phaseVisuals: PhaseVisuals;
  wetMix: number;
}) {
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: phaseVisuals.gridSecondary,
    caption: `DECAY ${decaySeconds.toFixed(1)}S MIX ${Math.round(wetMix * 100)}%`,
    isActive: wetMix > 0,
    label: "Reverb Local",
  }), [decaySeconds, phaseVisuals.gridSecondary, wetMix]);

  return (
    <mesh position={[0, 0.075, 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.82, 0.15]} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.52, toneMapped: false }]}>
        <canvasTexture key={`studio-reverb-status-${decaySeconds.toFixed(1)}-${wetMix.toFixed(2)}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function StudioReverbEffectControls({
  localDawAudioActions,
  localDawAudioState,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  phaseVisuals: PhaseVisuals;
}) {
  const patch = localDawAudioState?.reverbEffectPatch;
  const handleDecayDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustReverbEffectPatch({
      decaySeconds: patch.decaySeconds - 0.2,
    });
  }, [localDawAudioActions, patch]);
  const handleDecayUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustReverbEffectPatch({
      decaySeconds: patch.decaySeconds + 0.2,
    });
  }, [localDawAudioActions, patch]);
  const handleMixDown = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustReverbEffectPatch({
      wetMix: patch.wetMix - 0.05,
    });
  }, [localDawAudioActions, patch]);
  const handleMixUp = useCallback(() => {
    if (!patch) {
      return;
    }

    localDawAudioActions?.adjustReverbEffectPatch({
      wetMix: patch.wetMix + 0.05,
    });
  }, [localDawAudioActions, patch]);
  const controls = useMemo<StudioReverbControlSpec[]>(() => {
    if (!patch) {
      return [];
    }

    return [
      {
        id: "decay-down",
        label: "Dec -",
        caption: `${patch.decaySeconds.toFixed(1)}s Decay`,
        position: [-0.32, 0.025, 0.28],
        size: [0.23, 0.03, 0.095],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.wetMix > 0,
        onActivate: handleDecayDown,
      },
      {
        id: "decay-up",
        label: "Dec +",
        caption: `${patch.decaySeconds.toFixed(1)}s Decay`,
        position: [-0.06, 0.025, 0.28],
        size: [0.23, 0.03, 0.095],
        accentColor: phaseVisuals.gridSecondary,
        isActive: patch.wetMix > 0,
        onActivate: handleDecayUp,
      },
      {
        id: "mix-down",
        label: "Mix -",
        caption: `${Math.round(patch.wetMix * 100)}% Wet`,
        position: [0.2, 0.025, 0.28],
        size: [0.2, 0.03, 0.095],
        accentColor: phaseVisuals.timerAccent,
        isActive: patch.wetMix > 0,
        onActivate: handleMixDown,
      },
      {
        id: "mix-up",
        label: "Mix +",
        caption: `${Math.round(patch.wetMix * 100)}% Wet`,
        position: [0.44, 0.025, 0.28],
        size: [0.2, 0.03, 0.095],
        accentColor: phaseVisuals.timerAccent,
        isActive: patch.wetMix > 0,
        onActivate: handleMixUp,
      },
    ];
  }, [
    handleDecayDown,
    handleDecayUp,
    handleMixDown,
    handleMixUp,
    patch,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);

  if (!localDawAudioActions || !patch) {
    return null;
  }

  return (
    <group position={[-13.8, 0, -8.32]}>
      <mesh position={[0.06, 0.025, 0.25]}>
        <boxGeometry args={[1.1, 0.014, 0.4]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary, transparent: true, opacity: 0.06, toneMapped: false }]} />
      </mesh>
      <StudioReverbEffectStatus decaySeconds={patch.decaySeconds} phaseVisuals={phaseVisuals} wetMix={patch.wetMix} />
      {controls.map((control) => (
        <StudioReverbControl key={control.id} control={control} />
      ))}
    </group>
  );
}

function StudioLooperControl({ control }: { control: StudioLooperControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-looper-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: true,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.014, 0]}>
        <boxGeometry args={[control.size[0] + 0.045, 0.015, control.size[2] + 0.04]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.2 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#192236" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.2 : 0.08,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.7]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.6, toneMapped: false }]}>
          <canvasTexture key={`studio-looper-control-${control.id}-${control.label}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioLooperStatusDisplay({
  accentColor,
  lines,
}: {
  accentColor: string;
  lines: [string, string];
}) {
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption: lines[1],
    isActive: true,
    label: lines[0],
  }), [accentColor, lines]);

  return (
    <mesh position={[0, 1.16, -0.74]}>
      <planeGeometry args={[1.2, 0.3]} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.72, toneMapped: false }]}>
        <canvasTexture key={`studio-looper-status-${lines[0]}-${lines[1]}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function StudioLooperControls({
  localDawActions,
  localDawState,
  phaseVisuals,
}: {
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const looperTrack = localDawState?.tracks.find((track) => track.id === "looper");
  const looperClips = useMemo(() => (
    localDawState?.clips
      .filter((clip) => clip.trackId === "looper")
      .sort((firstClip, secondClip) => firstClip.sceneIndex - secondClip.sceneIndex)
      .slice(0, 4) ?? []
  ), [localDawState?.clips]);
  const selectedLooperClip = looperClips.find((clip) => (
    localDawState?.selectedTrackId === "looper" &&
    clip.sceneIndex === localDawState.selectedSceneIndex
  ));
  const fallbackLooperClip = looperClips[0];
  const activeLooperClip = selectedLooperClip ?? fallbackLooperClip;
  const activeClipNoteCount = activeLooperClip && localDawState
    ? localDawState.midiNotes.filter((note) => note.clipId === activeLooperClip.id).length
    : 0;
  const selectDefaultLooperClip = useCallback(() => {
    if (!fallbackLooperClip) {
      return;
    }

    localDawActions?.selectClip(fallbackLooperClip.id);
  }, [fallbackLooperClip, localDawActions]);
  const clipControls = useMemo<StudioLooperControlSpec[]>(() => looperClips.map((clip, index) => {
    const stateColors = getClipStateColors(clip.state);
    const noteCount = localDawState?.midiNotes.filter((note) => note.clipId === clip.id).length ?? 0;
    const isSelected = localDawState?.selectedTrackId === "looper" && localDawState.selectedSceneIndex === clip.sceneIndex;

    return {
      id: `clip-${clip.sceneIndex + 1}`,
      label: `S${clip.sceneIndex + 1}`,
      caption: `${noteCount} Notes`,
      position: [-0.78 + index * 0.52, 0.65, 0.08] as Vec3,
      size: [0.42, 0.045, 0.17] as Vec3,
      accentColor: isSelected ? "#e9fbff" : clip.state === "empty" ? (looperTrack?.color ?? phaseVisuals.gridSecondary) : stateColors.emissive,
      isActive: isSelected || clip.state === "playing" || clip.state === "recording",
      onActivate: () => {
        localDawActions?.selectClip(clip.id);
        localDawActions?.activateClipVisualState(clip.id);
      },
    };
  }), [
    localDawActions,
    localDawState?.midiNotes,
    localDawState?.selectedSceneIndex,
    localDawState?.selectedTrackId,
    looperClips,
    looperTrack?.color,
    phaseVisuals.gridSecondary,
  ]);
  const lengthControls = useMemo<StudioLooperControlSpec[]>(() => ([1, 2, 4, 8].map((lengthBars, index) => ({
    id: `length-${lengthBars}`,
    label: `${lengthBars}`,
    caption: `${lengthBars} Bar`,
    position: [-0.69 + index * 0.46, 0.95, -0.52] as Vec3,
    size: [0.3, 0.04, 0.12] as Vec3,
    accentColor: activeLooperClip?.lengthBars === lengthBars ? "#f8d36a" : phaseVisuals.gridSecondary,
    isActive: activeLooperClip?.lengthBars === lengthBars,
    onActivate: () => {
      if (!selectedLooperClip) {
        selectDefaultLooperClip();
      }

      localDawActions?.setSelectedClipLoopLengthBars(lengthBars);
    },
  }))), [
    activeLooperClip?.lengthBars,
    localDawActions,
    phaseVisuals.gridSecondary,
    selectDefaultLooperClip,
    selectedLooperClip,
  ]);

  if (!localDawState || !localDawActions || !looperTrack || !activeLooperClip) {
    return null;
  }

  return (
    <group position={[-17.0, 0, -8.1]}>
      <mesh position={[0, 0.632, 0.06]}>
        <boxGeometry args={[2.02, 0.02, 0.62]} />
        <meshBasicMaterial args={[{ color: looperTrack.color, transparent: true, opacity: 0.075, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.895, -0.52]}>
        <boxGeometry args={[1.82, 0.1, 0.28]} />
        <meshStandardMaterial args={[{ color: "#151319", emissive: looperTrack.color, emissiveIntensity: 0.08, roughness: 0.74, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, 1.12, -0.77]}>
        <boxGeometry args={[1.36, 0.5, 0.06]} />
        <meshStandardMaterial args={[{ color: "#101827", emissive: looperTrack.color, emissiveIntensity: 0.06, roughness: 0.78, metalness: 0.03 }]} />
      </mesh>
      {clipControls.map((control) => (
        <StudioLooperControl key={control.id} control={control} />
      ))}
      {lengthControls.map((control) => (
        <StudioLooperControl key={control.id} control={control} />
      ))}
      <StudioLooperStatusDisplay
        accentColor={looperTrack.color}
        lines={[
          `S${activeLooperClip.sceneIndex + 1} ${activeLooperClip.lengthBars} BAR`,
          `${activeClipNoteCount} Notes Local MIDI`,
        ]}
      />
    </group>
  );
}

function StudioDjControl({ control }: { control: StudioDjControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const isEnabled = control.enabled ?? true;
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-dj-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: isEnabled,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate, isEnabled]));

  return (
    <group position={control.position}>
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[control.size[0] + 0.035, 0.014, control.size[2] + 0.032]} />
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: isEnabled ? control.isActive ? 0.2 : 0.08 : 0.03, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: isEnabled ? control.isActive ? "#22172f" : "#0b1525" : "#101722",
          emissive: control.accentColor,
          emissiveIntensity: isEnabled ? control.isActive ? 0.2 : 0.08 : 0.03,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.7]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: isEnabled ? 0.6 : 0.28, toneMapped: false }]}>
          <canvasTexture key={`studio-dj-control-${control.id}-${control.label}-${control.caption}-${control.captionFontSize ?? 22}-${control.isActive ? "active" : "idle"}-${isEnabled ? "enabled" : "disabled"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioSoundCloudInvisibleButton({ control }: { control: StudioDjControlSpec }) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const isEnabled = control.enabled ?? true;

  useRegisterInteractable(useMemo(() => ({
    id: `studio-dj-${control.id}`,
    label: control.caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: isEnabled,
    onActivate: control.onActivate,
  }), [control.caption, control.id, control.onActivate, isEnabled]));

  return (
    <mesh ref={controlRef} position={control.position}>
      <boxGeometry args={control.size} />
      <meshBasicMaterial args={[{ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }]} />
    </mesh>
  );
}

function StudioSoundCloudMonitorWaveformHitTarget({
  caption,
  deck,
  id,
  onPushConsoleEvent,
  position,
  size,
}: StudioSoundCloudMonitorWaveformHitTargetProps) {
  const targetRef = useRef<React.ElementRef<"mesh">>(null);
  const seekStartPositionRef = useRef(deck.display.playbackPosition);
  const seekTargetPositionRef = useRef(deck.display.playbackPosition);
  const enabled = deck.display.isWidgetReady && deck.display.playbackDuration > 0;

  useEffect(() => {
    seekTargetPositionRef.current = deck.display.playbackPosition;
  }, [deck.display.playbackPosition]);

  const seekFromPoint = useCallback((point: [number, number, number], shouldLog = true) => {
    if (!targetRef.current || deck.display.playbackDuration <= 0) {
      return;
    }

    const worldMatrixElements = (targetRef.current as unknown as { matrixWorld?: { elements?: ArrayLike<number> } }).matrixWorld?.elements;
    const worldX = Number(worldMatrixElements?.[12] ?? position[0]);
    const localX = point[0] - worldX;
    const ratio = clampNumber((localX / size[0]) + 0.5, 0, 1);
    const targetPosition = ratio * deck.display.playbackDuration;

    seekTargetPositionRef.current = targetPosition;
    if (shouldLog) {
      pushSoundCloudBoothConsoleEvent(onPushConsoleEvent, {
        kind: "seek",
        deckId: deck.id,
        label: "WAVE SEEK",
        detail: formatSoundCloudDeckTime(targetPosition),
      });
    }
    deck.seekActions.seekTo(targetPosition, { playAfterSeek: deck.display.isPlaying });
  }, [
    deck.display.isPlaying,
    deck.display.playbackDuration,
    deck.id,
    deck.seekActions,
    onPushConsoleEvent,
    position,
    size,
  ]);

  useRegisterInteractable(useMemo(() => ({
    id,
    label: caption,
    objectRef: targetRef,
    modes: ["clickable" as const, "draggable" as const],
    enabled,
    onActivate: (activation) => {
      seekStartPositionRef.current = deck.display.playbackPosition;
      seekFromPoint(activation.point);
    },
    onDragStart: (activation) => {
      seekStartPositionRef.current = deck.display.playbackPosition;
      seekFromPoint(activation.point, false);
    },
    onDragMove: ({ point }) => {
      if (point) {
        seekFromPoint(point, false);
      }
    },
    onDragEnd: () => {
      if (Math.abs(seekTargetPositionRef.current - seekStartPositionRef.current) >= 500) {
        pushSoundCloudBoothConsoleEvent(onPushConsoleEvent, {
          kind: "seek",
          deckId: deck.id,
          label: "WAVE SCRUB",
          detail: `${formatSoundCloudDeckTime(seekStartPositionRef.current)} -> ${formatSoundCloudDeckTime(seekTargetPositionRef.current)}`,
        });
      }
    },
  }), [
    caption,
    deck.display.isWidgetReady,
    deck.display.playbackPosition,
    deck.display.playbackDuration,
    deck.id,
    enabled,
    id,
    onPushConsoleEvent,
    seekFromPoint,
  ]));

  return (
    <mesh ref={targetRef} position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial args={[{ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }]} />
    </mesh>
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function StudioSoundCloudDragFader({
  accentColor,
  id,
  label,
  position,
  railSize,
  value,
  min,
  max,
  sensitivity,
  onChange,
  onCommit,
}: StudioSoundCloudDragFaderProps) {
  const groupRef = useRef<React.ElementRef<"group">>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const valueRef = useRef(value);
  const enabled = Boolean(onChange);
  const valueRange = max - min;
  const normalizedValue = valueRange > 0 ? (value - min) / valueRange : 0.5;
  const knobX = (normalizedValue - 0.5) * railSize[0];
  const backingPlateSize: Vec3 = [railSize[0] + 0.14, 0.01, railSize[2] + 0.14];

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const setValueFromRailPoint = useCallback((point: [number, number, number]) => {
    if (!onChange || !groupRef.current) {
      return false;
    }

    const worldMatrixElements = (groupRef.current as unknown as { matrixWorld?: { elements?: ArrayLike<number> } }).matrixWorld?.elements;
    const worldX = Number(worldMatrixElements?.[12] ?? 0);
    const localX = point[0] - worldX;
    const trackRatio = clampNumber((localX / railSize[0]) + 0.5, 0, 1);
    const nextValue = clampNumber(min + trackRatio * (max - min), min, max);

    valueRef.current = nextValue;
    onChange(nextValue);
    return true;
  }, [max, min, onChange, railSize]);

  useRegisterInteractable(useMemo(() => ({
    id,
    label,
    objectRef: groupRef,
    modes: ["draggable" as const],
    enabled,
    onDragStart: (activation) => {
      setIsGrabbed(true);
      setValueFromRailPoint(activation.point);
    },
    onDragMove: ({ movementX, point }) => {
      if (!onChange) {
        return;
      }

      let nextValue: number;

      if (point && setValueFromRailPoint(point)) {
        return;
      }

      nextValue = valueRef.current + movementX * sensitivity;
      nextValue = clampNumber(nextValue, min, max);
      valueRef.current = nextValue;
      onChange(nextValue);
    },
    onDragEnd: () => {
      setIsGrabbed(false);
      onCommit?.(valueRef.current);
    },
  }), [enabled, id, label, max, min, onChange, onCommit, setValueFromRailPoint, sensitivity]));

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <boxGeometry args={[railSize[0] + 0.12, railSize[1] + 0.045, railSize[2] + 0.12]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: enabled ? (isGrabbed ? 0.16 : 0.055) : 0.025, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.004, 0]}>
        <boxGeometry args={backingPlateSize} />
        <meshBasicMaterial args={[{ color: "#05070d", transparent: true, opacity: enabled ? 0.86 : 0.48, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.016, 0]}>
        <boxGeometry args={railSize} />
        <meshBasicMaterial args={[{ color: "#8da1b8", transparent: true, opacity: enabled ? (isGrabbed ? 0.62 : 0.36) : 0.16, toneMapped: false }]} />
      </mesh>
      <mesh position={[knobX, 0.043, 0]}>
        <boxGeometry args={[0.12, 0.048, 0.092]} />
        <meshBasicMaterial args={[{ color: isGrabbed ? accentColor : "#e9fbff", transparent: true, opacity: enabled ? (isGrabbed ? 0.9 : 0.68) : 0.3, toneMapped: false }]} />
      </mesh>
    </group>
  );
}

function StudioSoundCloudProgressSeekBar({
  accentColor,
  deck,
  id,
  onPushConsoleEvent,
  position,
}: StudioSoundCloudProgressSeekBarProps) {
  const groupRef = useRef<React.ElementRef<"group">>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const seekStartPositionRef = useRef(deck.display.playbackPosition);
  const seekTargetPositionRef = useRef(deck.display.playbackPosition);
  const progress = Math.max(0, Math.min(1, deck.display.progress));
  const enabled = deck.display.isWidgetReady && deck.display.playbackDuration > 0;
  const trackWidth = 0.44;
  const trackDepth = 0.04;
  const backingPlateSize: Vec3 = [trackWidth + 0.1, 0.01, trackDepth + 0.1];

  const seekToPoint = useCallback((point?: [number, number, number]) => {
    if (!enabled || !point || !groupRef.current) {
      return;
    }

    const worldMatrixElements = (groupRef.current as unknown as { matrixWorld?: { elements?: ArrayLike<number> } }).matrixWorld?.elements;
    const worldX = Number(worldMatrixElements?.[12] ?? 0);
    const localX = point[0] - worldX;
    const nextProgress = clampNumber((localX / trackWidth) + 0.5, 0, 1);

    const nextPosition = deck.display.playbackDuration * nextProgress;
    seekTargetPositionRef.current = nextPosition;
    deck.seekActions.seekTo(nextPosition, { playAfterSeek: true });
  }, [deck.display.playbackDuration, deck.seekActions, enabled, trackWidth]);

  useRegisterInteractable(useMemo(() => ({
    id,
    label: `${deck.label} Song Progress Seek`,
    objectRef: groupRef,
    modes: ["draggable" as const],
    enabled,
    onDragStart: (activation) => {
      seekStartPositionRef.current = deck.display.playbackPosition;
      seekTargetPositionRef.current = deck.display.playbackPosition;
      setIsGrabbed(true);
      seekToPoint(activation.point);
    },
    onDragMove: ({ point }) => {
      seekToPoint(point);
    },
    onDragEnd: () => {
      setIsGrabbed(false);
      if (Math.abs(seekTargetPositionRef.current - seekStartPositionRef.current) >= 500) {
        pushSoundCloudBoothConsoleEvent(onPushConsoleEvent, {
          kind: "seek",
          deckId: deck.id,
          label: "SEEK",
          detail: `${formatSoundCloudDeckTime(seekStartPositionRef.current)} -> ${formatSoundCloudDeckTime(seekTargetPositionRef.current)}`,
        });
      }
    },
  }), [deck.display.playbackPosition, deck.id, deck.label, enabled, id, onPushConsoleEvent, seekToPoint]));

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <boxGeometry args={[trackWidth + 0.12, 0.052, trackDepth + 0.11]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: enabled ? (isGrabbed ? 0.16 : 0.05) : 0.025, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.004, 0]}>
        <boxGeometry args={backingPlateSize} />
        <meshBasicMaterial args={[{ color: "#05070d", transparent: true, opacity: enabled ? 0.84 : 0.45, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.016, 0]}>
        <boxGeometry args={[trackWidth, 0.012, trackDepth]} />
        <meshBasicMaterial args={[{ color: "#8da1b8", transparent: true, opacity: enabled ? (isGrabbed ? 0.64 : 0.34) : 0.16, toneMapped: false }]} />
      </mesh>
      <mesh position={[-trackWidth / 2 + (progress * trackWidth) / 2, 0.034, 0]}>
        <boxGeometry args={[Math.max(0.03, progress * trackWidth), 0.03, trackDepth + 0.018]} />
        <meshBasicMaterial args={[{ color: isGrabbed ? "#e9fbff" : accentColor, transparent: true, opacity: enabled ? (isGrabbed ? 0.86 : 0.58) : 0.26, toneMapped: false }]} />
      </mesh>
      <mesh position={[-trackWidth / 2 + progress * trackWidth, 0.054, 0]}>
        <boxGeometry args={[0.028, 0.044, trackDepth + 0.036]} />
        <meshBasicMaterial args={[{ color: isGrabbed ? accentColor : "#e9fbff", transparent: true, opacity: enabled ? 0.72 : 0.28, toneMapped: false }]} />
      </mesh>
    </group>
  );
}

function getDjDeckAccent(deck: LocalDawDjDeckState, phaseVisuals: PhaseVisuals) {
  if (deck.visualState === "playing") {
    return phaseVisuals.gridPrimary;
  }

  if (deck.visualState === "cued") {
    return "#f8d36a";
  }

  return "#6f86a3";
}

function getDjSourceDeckLabel(deck: LocalDawDjDeckState, source?: LocalDawDjDeckSource) {
  if (!source) {
    return `${deck.id} NO SRC`;
  }

  const shortLabel = source.label
    .replace("FM Synth", "FM")
    .replace("Looper", "Loop")
    .replace("Piano", "Pno");

  return `${deck.id} ${shortLabel}`;
}

function getDjSourceStatusLabel(source?: LocalDawDjDeckSource) {
  if (!source) {
    return "NO SRC";
  }

  return source.label
    .replace("FM Synth", "FM")
    .replace("Looper", "Loop")
    .replace("Piano", "Pno");
}

function trimStudioSoundCloudText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function getSoundCloudDeckAccent(deck: SoundCloudBoothDeck, phaseVisuals: PhaseVisuals) {
  if (deck.display.errorMessage) {
    return "#f8d36a";
  }

  if (deck.display.isPlaying) {
    return phaseVisuals.gridPrimary;
  }

  if (deck.display.isWidgetReady) {
    return "#73ff4c";
  }

  return "#6f86a3";
}

function getSoundCloudDeckStatusLabel(deck: SoundCloudBoothDeck) {
  if (deck.display.errorMessage) {
    return "ERROR";
  }

  if (!deck.display.isScriptReady || !deck.display.isWidgetReady) {
    return "LOADING";
  }

  return deck.display.isPlaying ? "PLAYING" : "STANDBY";
}

function getSoundCloudDeckBpmLabel(deck: SoundCloudBoothDeck) {
  return deck.display.currentTrackAcceptedBpmState.label;
}

function getSoundCloudDeckVisualBpm(deck: SoundCloudBoothDeck) {
  return deck.display.currentTrackAcceptedBpmState.bpm ?? deck.display.currentTrackBpmState.bpm ?? STUDIO_SOUNDCLOUD_FALLBACK_VISUAL_BPM;
}

function getSoundCloudCrossfaderLabel(crossfader: number) {
  if (Math.abs(crossfader) < 0.05) {
    return "MID";
  }

  return crossfader < 0 ? `A ${Math.round(Math.abs(crossfader) * 100)}%` : `B ${Math.round(crossfader * 100)}%`;
}

function getSoundCloudCueSetCaption(deck: SoundCloudBoothDeck) {
  if (!deck.hotCueState.activeTrackKey || deck.display.playbackDuration <= 0 || !deck.display.isWidgetReady) {
    return "LOAD TRACK";
  }

  return deck.hotCueState.lastCueActionLabel ?? (deck.hotCueState.isSettingCue ? "SET CUE ON" : "CUE READY");
}

function getSoundCloudCueEditCaption(deck: SoundCloudBoothDeck) {
  if (!deck.hotCueState.activeTrackKey || deck.display.playbackDuration <= 0 || !deck.display.isWidgetReady) {
    return "LOAD TRACK";
  }

  return deck.hotCueState.lastCueEditActionLabel ?? (deck.hotCueState.isEditingCue ? "SELECT CUE" : "EDIT CUE");
}

function getSoundCloudCuePadCaption(deck: SoundCloudBoothDeck, cue: SoundCloudBoothDeck["hotCueState"]["cues"][number]) {
  if (!deck.hotCueState.activeTrackKey || deck.display.playbackDuration <= 0 || !deck.display.isWidgetReady) {
    return "LOAD TRACK";
  }

  return cue.label.replace(`${cue.id} `, "");
}

function formatSoundCloudSeekStepLabel(seconds: number) {
  const absoluteSeconds = Math.abs(seconds);

  if (absoluteSeconds < 1) {
    return absoluteSeconds.toFixed(2).replace(/^0/, "");
  }

  return absoluteSeconds.toString();
}

function getSoundCloudSeekCaption(deck: SoundCloudBoothDeck, deltaSeconds: number) {
  if (!deck.hotCueState.activeTrackKey || deck.display.playbackDuration <= 0 || !deck.display.isWidgetReady) {
    return "LOAD TRACK";
  }

  const direction = deltaSeconds < 0 ? "BACK" : "FWD";
  const target = deck.hotCueState.isEditingCue ? deck.hotCueState.selectedCueId ?? "SELECT CUE" : "TRACK";

  return `${target} ${direction} ${formatSoundCloudSeekStepLabel(deltaSeconds)}S`;
}

function formatSoundCloudDeckTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getSoundCloudDeckTimeLabel(deck: SoundCloudBoothDeck) {
  if (!deck.display.isWidgetReady || deck.display.playbackDuration <= 0) {
    return "TIME --:-- / --:--";
  }

  return `TIME ${formatSoundCloudDeckTime(deck.display.playbackPosition)} / ${formatSoundCloudDeckTime(deck.display.playbackDuration)}`;
}

function formatSoundCloudBoothConsoleTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
    date.getSeconds().toString().padStart(2, "0"),
  ].join(":");
}

function getSoundCloudBoothConsoleEventColor(event: SoundCloudBoothConsoleEvent) {
  if (event.kind === "error") {
    return "#ff5a6b";
  }

  if (event.kind === "seek") {
    return "#73ff4c";
  }

  if (event.kind === "cue" || event.kind === "bpm") {
    return "#f8d36a";
  }

  if (event.kind === "sync" || event.kind === "mixer") {
    return "#f64fff";
  }

  return "#57f3ff";
}

function formatSoundCloudBoothConsoleLine(event: SoundCloudBoothConsoleEvent) {
  const deckPrefix = event.deckId ? `${event.deckId} ` : "";
  const detail = event.detail ? ` ${event.detail}` : "";

  return `${deckPrefix}${event.label}${detail}`;
}

function pushSoundCloudBoothConsoleEvent(
  pushEvent: SoundCloudBoothState["onPushConsoleEvent"] | undefined,
  event: SoundCloudBoothConsoleEventInput,
) {
  pushEvent?.(event);
}

interface StudioSoundCloudReadoutCanvasSpec {
  accentColor: string;
  isActive?: boolean;
  lineA: string;
  lineB: string;
  lineC?: string;
  title: string;
}

interface StudioSoundCloudGridScreenCanvasSpec {
  accentColor: string;
  burstLengthLabel: string;
  feedbackLabel: string;
  padCountLabel: string;
  state: SoundCloudBoothGridController["state"];
}

const STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE: Vec3 = [3.1, 0.022, 1.78];
const STUDIO_SOUNDCLOUD_TABLE_EDGE_HEIGHT = 0.34;
const STUDIO_SOUNDCLOUD_TABLE_EDGE_THICKNESS = 0.08;
const STUDIO_SOUNDCLOUD_TABLE_LEG_SIZE: Vec3 = [0.16, 0.44, 0.16];
const STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_X = 1.28;
const STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_Z = 0.75;
const STUDIO_SOUNDCLOUD_STATION_GRID = {
  leftX: -1.02,
  centerX: 0,
  rightX: 1.02,
  backZ: -0.72,
  midZ: -0.12,
  frontZ: 0.66,
} as const;
const STUDIO_SOUNDCLOUD_DECK_STATION_BASE_SIZE: Vec3 = [0.9, 0.06, 0.9];
const STUDIO_SOUNDCLOUD_DECK_STATION_BASE_Y = 0.585;
const STUDIO_SOUNDCLOUD_DECK_PLATTER_BASE_RADIUS = 0.31;
const STUDIO_SOUNDCLOUD_DECK_PLATTER_MID_RADIUS = 0.245;
const STUDIO_SOUNDCLOUD_DECK_PLATTER_TOP_RADIUS = 0.105;
const STUDIO_SOUNDCLOUD_DECK_PLATTER_Y = 0.69;
const STUDIO_SOUNDCLOUD_PLATTER_SCRUB_SEEK_MS_PER_PIXEL = 180;
const STUDIO_SOUNDCLOUD_PLATTER_SCRUB_ROTATION_PER_PIXEL = 0.018;
const STUDIO_SOUNDCLOUD_PLATTER_SCRUB_NEEDLE_TARGET_SPEED = 8;
const STUDIO_SOUNDCLOUD_FALLBACK_VISUAL_BPM = 120;
const STUDIO_SOUNDCLOUD_DECK_PROGRESS_BAR_Z = 0.40;
const STUDIO_SOUNDCLOUD_DECK_SLIDER_BAR_SIZE: Vec3 = [0.3, 0.01, 0.028];
const STUDIO_SOUNDCLOUD_DECK_SLIDER_TICK_COUNT = 5;
const STUDIO_SOUNDCLOUD_DECK_SLIDER_Y = 0.725;
const STUDIO_SOUNDCLOUD_DECK_READOUT_POSITION: Vec3 = [0, 0.855, -0.34];
const STUDIO_SOUNDCLOUD_DECK_READOUT_BACKING_SIZE: Vec3 = [0.66, 0.24, 0.052];
const STUDIO_SOUNDCLOUD_DECK_READOUT_SIZE: [number, number] = [0.64, 0.24];
const STUDIO_SOUNDCLOUD_DECK_BUTTON_POD_SIZE: Vec3 = [0.54, 0.016, 0.2];
const STUDIO_SOUNDCLOUD_DECK_BUTTON_POD_Y = 0.686;
const STUDIO_SOUNDCLOUD_DECK_OFFSET_X = 0.94;
const STUDIO_SOUNDCLOUD_DECK_Z = 0.04;
const STUDIO_SOUNDCLOUD_DECK_BUTTON_Z = 0.78;
const STUDIO_SOUNDCLOUD_DECK_VOLUME_BUTTON_OFFSET_X = 0.28;
const STUDIO_SOUNDCLOUD_DECK_VOLUME_BUTTON_Z = 0.35;
const STUDIO_SOUNDCLOUD_DECK_VOLUME_STEP = 10;
const STUDIO_SOUNDCLOUD_DECK_TRIM_FADER_Z = 0.54;
const STUDIO_SOUNDCLOUD_DECK_TRIM_FADER_SIZE: Vec3 = [0.38, 0.014, 0.034];
const STUDIO_SOUNDCLOUD_DECK_UTILITY_BUTTON_SIZE: Vec3 = [0.16, 0.032, 0.08];
const STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_Z = 1.14;
const STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_ROW_OFFSET_Z = 0.09;
const STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_SIZE: Vec3 = [0.15, 0.03, 0.064];
const STUDIO_SOUNDCLOUD_VOLUME_DRAG_SENSITIVITY = 0.35;
const STUDIO_SOUNDCLOUD_SEEK_STEPS = [0.01, 0.1, 1, 10, 30] as const;
const STUDIO_SOUNDCLOUD_SEEK_PANEL_Y = 0.688;
const STUDIO_SOUNDCLOUD_SEEK_CONTROL_Y = 0.724;
const STUDIO_SOUNDCLOUD_SEEK_PANEL_SIZE: Vec3 = [0.64, 0.016, 0.3];
const STUDIO_SOUNDCLOUD_SEEK_PANEL_CENTER_Z = 0.73;
const STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X = 0.36;
const STUDIO_SOUNDCLOUD_SEEK_BUTTON_SIZE: Vec3 = [0.09, 0.03, 0.062];
const STUDIO_SOUNDCLOUD_SEEK_EDIT_BUTTON_SIZE: Vec3 = [0.18, 0.032, 0.07];
const STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z = 1.03;
const STUDIO_SOUNDCLOUD_CUE_SHELF_Y = 0.606;
const STUDIO_SOUNDCLOUD_CUE_CONTROL_Y = 0.638;
const STUDIO_SOUNDCLOUD_CUE_SHELF_SIZE: Vec3 = [0.64, 0.04, 0.31];
const STUDIO_SOUNDCLOUD_CUE_SHELF_ROW_Z_OFFSET = 0.05;
const STUDIO_SOUNDCLOUD_CUE_BUTTON_SIZE: Vec3 = [0.15, 0.032, 0.09];
const STUDIO_SOUNDCLOUD_CUE_SET_BUTTON_SIZE: Vec3 = [0.18, 0.032, 0.09];
const STUDIO_SOUNDCLOUD_DECK_MONITOR_POSITION: Vec3 = [0, 1.1, -0.98];
const STUDIO_SOUNDCLOUD_DECK_MONITOR_ROTATION: Vec3 = [0, 0, 0];
const STUDIO_SOUNDCLOUD_DECK_MONITOR_BACKING_SIZE: Vec3 = [3.58, 1.04, 0.08];
const STUDIO_SOUNDCLOUD_DECK_MONITOR_PLANE_SIZE: [number, number] = [3.2, 0.9];
const STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Y = 0.365;
const STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Z = 0.058;
const STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_DOWN_X = 0.239;
const STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_UP_X = 0.409;
const STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_SIZE: Vec3 = [0.13, 0.075, 0.026];
const STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_X = -0.506;
const STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_WIDTH = 1.982;
const STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_A_Y = 0.069;
const STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_B_Y = -0.056;
const STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_HIT_SIZE: Vec3 = [STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_WIDTH, 0.082, 0.026];
const STUDIO_SOUNDCLOUD_CONSOLE_VISIBLE_EVENT_COUNT = 9;
const STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MIN = 1;
const STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MAX = 4;
const STUDIO_SOUNDCLOUD_CROSSFADER_RAIL_POSITION: Vec3 = [0, 0.726, 0.26];
const STUDIO_SOUNDCLOUD_UPPER_FADER_RAIL_SIZE: Vec3 = [0.86, 0.018, 0.045];
const STUDIO_SOUNDCLOUD_CROSSFADER_DRAG_SENSITIVITY = 0.006;
const STUDIO_SOUNDCLOUD_UPPER_FADER_TICK_COUNT = 7;
const STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_OFFSET_X = 0.24;
const STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Y = 0.765;
const STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Z = 0.42;
const STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_SIZE: Vec3 = [0.22, 0.034, 0.095];
const STUDIO_SOUNDCLOUD_CROSSFADER_MID_BUTTON_SIZE: Vec3 = [0.24, 0.034, 0.095];
const STUDIO_SOUNDCLOUD_LOWER_RAIL_POSITION: Vec3 = [0, 0.704, -0.52];
const STUDIO_SOUNDCLOUD_LOWER_RAIL_SIZE: Vec3 = [0.88, 0.014, 0.03];
const STUDIO_SOUNDCLOUD_CRATE_VISIBLE_ROWS = 5;
const STUDIO_SOUNDCLOUD_CRATE_SCREEN_SIZE: Vec3 = [1.62, 0.055, 0.72];
const STUDIO_SOUNDCLOUD_CRATE_PLANE_SIZE: [number, number] = [1.46, 0.56];
const STUDIO_SOUNDCLOUD_CRATE_SCREEN_Z = STUDIO_SOUNDCLOUD_CRATE_DEFAULT_Z;
const STUDIO_SOUNDCLOUD_CRATE_SCREEN_X = STUDIO_SOUNDCLOUD_CRATE_DEFAULT_X;
const STUDIO_SOUNDCLOUD_CRATE_SCREEN_Y = STUDIO_SOUNDCLOUD_CRATE_DEFAULT_Y;
const STUDIO_SOUNDCLOUD_CRATE_ROW_HIT_SIZE: Vec3 = [1.28, 0.035, 0.066];
const STUDIO_SOUNDCLOUD_CRATE_SCROLL_HIT_SIZE: Vec3 = [0.2, 0.035, 0.07];
const STUDIO_SOUNDCLOUD_CRATE_SCROLL_UP_POSITION: Vec3 = [-0.11, STUDIO_SOUNDCLOUD_CRATE_SCREEN_SIZE[1] / 2 + 0.028, 0.218];
const STUDIO_SOUNDCLOUD_CRATE_SCROLL_DOWN_POSITION: Vec3 = [0.11, STUDIO_SOUNDCLOUD_CRATE_SCREEN_SIZE[1] / 2 + 0.028, 0.218];
const STUDIO_SOUNDCLOUD_GRID_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const STUDIO_SOUNDCLOUD_GRID_COLUMNS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
const STUDIO_SOUNDCLOUD_GRID_PAD_IDS = STUDIO_SOUNDCLOUD_GRID_ROWS.flatMap((row) =>
  STUDIO_SOUNDCLOUD_GRID_COLUMNS.map((column) => `${row}${column}` as SoundCloudBoothGridPadId),
);
const STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE: Vec3 = [1.26, 0.072, 1.28];
const STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE: [number, number] = [1.14, 1.16];
const STUDIO_SOUNDCLOUD_GRID_SCREEN_BACKING_SIZE: Vec3 = [1.18, 0.018, 1.2];
const STUDIO_SOUNDCLOUD_GRID_SETTING_BUTTON_SIZE: Vec3 = [0.108, 0.024, 0.076];
const STUDIO_SOUNDCLOUD_GRID_PAD_BUTTON_SIZE: Vec3 = [0.116, 0.024, 0.08];
const STUDIO_SOUNDCLOUD_GRID_SETTING_PITCH_X = 0.118;
const STUDIO_SOUNDCLOUD_GRID_PAD_PITCH_X = 0.128;
const STUDIO_SOUNDCLOUD_GRID_PAD_PITCH_Z = 0.086;
const STUDIO_SOUNDCLOUD_GRID_SETTING_Z = -0.381;
const STUDIO_SOUNDCLOUD_GRID_PAD_START_Z = -0.276;
const STUDIO_SOUNDCLOUD_GRID_HIT_TARGET_Y_OFFSET = 0.038;
const STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_WIDTH = (500 / 1024) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[0];
const STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_DEPTH = (50 / 1024) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[1];
const STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_CENTER_X = (((304 + 250) / 1024) - 0.5) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[0];
const STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_CENTER_Z = (((46 + 25) / 1024) - 0.5) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[1];
const STUDIO_SOUNDCLOUD_GRID_CLAMP_HIT_SIZE: Vec3 = [0.11, 0.03, Math.max(0.13, STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_DEPTH * 1.8)];
const STUDIO_SOUNDCLOUD_GRID_WAVEFORM_BUTTON_CANVAS_SIZE = 38;
const STUDIO_SOUNDCLOUD_GRID_WAVEFORM_BUTTON_SIZE: Vec3 = [
  (STUDIO_SOUNDCLOUD_GRID_WAVEFORM_BUTTON_CANVAS_SIZE / 1024) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[0],
  0.024,
  (STUDIO_SOUNDCLOUD_GRID_WAVEFORM_BUTTON_CANVAS_SIZE / 1024) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[1],
];

function mapStudioSoundCloudGridScreenPointToLocal(canvasX: number, canvasY: number): Vec3 {
  return [
    ((canvasX / 1024) - 0.5) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[0],
    STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[1] / 2 + STUDIO_SOUNDCLOUD_GRID_HIT_TARGET_Y_OFFSET,
    ((canvasY / 1024) - 0.5) * STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE[1],
  ];
}

function createStudioSoundCloudReadoutCanvas({
  accentColor,
  isActive,
  lineA,
  lineB,
  lineC,
  title,
}: StudioSoundCloudReadoutCanvasSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 240;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#050914";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.globalAlpha = isActive ? 0.72 : 0.48;
  context.lineWidth = 10;
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  context.globalAlpha = 1;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = accentColor;
  context.globalAlpha = isActive ? 0.9 : 0.72;
  context.font = "800 44px monospace";
  context.fillText(title.toUpperCase(), canvas.width / 2, 70);

  if (lineC) {
    context.fillStyle = "#e9fbff";
    context.globalAlpha = 0.76;
    context.font = "700 27px monospace";
    context.fillText(lineA.toUpperCase(), canvas.width / 2, 116);

    context.fillStyle = "#a9bdc9";
    context.globalAlpha = 0.66;
    context.font = "700 22px monospace";
    context.fillText(lineB.toUpperCase(), canvas.width / 2, 162);

    context.fillStyle = accentColor;
    context.globalAlpha = 0.82;
    context.font = "800 24px monospace";
    context.fillText(lineC.toUpperCase(), canvas.width / 2, 202);
  } else {
    context.fillStyle = "#e9fbff";
    context.globalAlpha = 0.76;
    context.font = "700 30px monospace";
    context.fillText(lineA.toUpperCase(), canvas.width / 2, 128);

    context.fillStyle = "#a9bdc9";
    context.globalAlpha = 0.62;
    context.font = "700 24px monospace";
    context.fillText(lineB.toUpperCase(), canvas.width / 2, 178);
  }
  context.globalAlpha = 1;

  return canvas;
}

function drawStudioSoundCloudGridWaveform({
  accentColor,
  context,
  state,
  x,
  y,
  width,
  height,
}: {
  accentColor: string;
  context: CanvasRenderingContext2D;
  state: SoundCloudBoothGridController["state"];
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const duration = Number.isFinite(state.playbackDuration) && state.playbackDuration > 0 ? state.playbackDuration : 0;
  const latestStart = duration > 0 ? Math.max(0, duration - state.burstLengthMs) : 0;
  const startClampRatio = duration > 0 ? clampNumber(state.sampleStartMs / duration, 0, 1) : 0;
  const endClampRatio = duration > 0 ? clampNumber(state.sampleEndMs / duration, 0, 1) : 0;
  const hasClampWindow = state.padMode === "timeline" || state.padMode === "continuous";
  const waveformBars = state.waveformBars.length > 0 ? state.waveformBars : [0.22, 0.5, 0.32, 0.66, 0.42, 0.72, 0.34, 0.58];

  context.fillStyle = "rgba(5, 9, 20, 0.78)";
  context.fillRect(x, y, width, height);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.48;
  context.lineWidth = 3;
  context.strokeRect(x, y, width, height);
  context.globalAlpha = 1;

  const innerX = x + 12;
  const innerY = y + 8;
  const innerW = width - 24;
  const innerH = height - 16;
  const barCount = Math.min(96, waveformBars.length);
  const stride = innerW / Math.max(1, barCount);

  context.fillStyle = accentColor;
  context.globalAlpha = 0.22;
  for (let index = 0; index < barCount; index += 1) {
    const sampleIndex = Math.floor((index / Math.max(1, barCount - 1)) * (waveformBars.length - 1));
    const barLevel = clampNumber(waveformBars[sampleIndex] ?? 0.2, 0.08, 1);
    const barHeight = Math.max(3, innerH * barLevel);
    const barX = innerX + index * stride;
    context.fillRect(barX, innerY + (innerH - barHeight) / 2, Math.max(1, stride * 0.52), barHeight);
  }
  context.globalAlpha = 1;

  if (duration > 0 && hasClampWindow) {
    const startX = innerX + innerW * startClampRatio;
    const endX = innerX + innerW * endClampRatio;

    context.fillStyle = "rgba(248, 211, 106, 0.1)";
    context.fillRect(startX, innerY, Math.max(0, endX - startX), innerH);
    context.fillStyle = "rgba(255, 110, 150, 0.08)";
    context.fillRect(innerX, innerY, Math.max(0, startX - innerX), innerH);
    context.fillRect(endX, innerY, Math.max(0, innerX + innerW - endX), innerH);

    [
      { label: "START", clampX: startX },
      { label: "END", clampX: endX },
    ].forEach((clamp) => {
      context.strokeStyle = "#f8d36a";
      context.globalAlpha = 0.88;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(clamp.clampX, y + 3);
      context.lineTo(clamp.clampX, y + height - 3);
      context.stroke();

      context.fillStyle = "#f8d36a";
      context.globalAlpha = 0.92;
      context.beginPath();
      context.moveTo(clamp.clampX, y + 2);
      context.lineTo(clamp.clampX - 8, y + 13);
      context.lineTo(clamp.clampX + 8, y + 13);
      context.closePath();
      context.fill();

      context.font = "800 11px monospace";
      context.textAlign = clamp.label === "START" ? "left" : "right";
      context.fillText(clamp.label, clamp.clampX + (clamp.label === "START" ? 7 : -7), y + height - 8);
    });
    context.globalAlpha = 1;
  }

  state.pads.forEach((pad, index) => {
    if (duration <= 0) {
      return;
    }

    const padRatio = clampNumber(pad.positionMs / duration, 0, 1);
    const markerX = innerX + innerW * padRatio;
    const isLastTriggered = state.lastTriggeredPadId === pad.id;

    context.strokeStyle = isLastTriggered ? "#f8d36a" : hasClampWindow ? "#c9fbff" : accentColor;
    context.globalAlpha = isLastTriggered ? 0.95 : hasClampWindow ? 0.34 : 0.28;
    context.lineWidth = isLastTriggered ? 4 : 2;
    context.beginPath();
    context.moveTo(markerX, innerY - 2);
    context.lineTo(markerX, innerY + innerH + 2);
    context.stroke();

    if (index === 0 || index === state.pads.length - 1 || isLastTriggered) {
      context.fillStyle = isLastTriggered ? "#f8d36a" : "#e9fbff";
      context.globalAlpha = isLastTriggered ? 0.96 : 0.62;
      context.font = "800 10px monospace";
      context.textAlign = index === state.pads.length - 1 ? "right" : "left";
      context.fillText(pad.id, markerX + (index === state.pads.length - 1 ? -4 : 4), innerY + 10);
    }
  });
  context.globalAlpha = 1;

  context.fillStyle = hasClampWindow ? "#f8d36a" : "#a9bdc9";
  context.globalAlpha = 0.8;
  context.font = "800 12px monospace";
  context.textAlign = "center";
  const clampLabel = `CLAMP ${formatSoundCloudDeckTime(state.sampleStartMs)} TO ${formatSoundCloudDeckTime(state.sampleEndMs || latestStart)}`;
  context.fillText(state.padMode === "continuous" ? `CONT ${clampLabel}` : state.padMode === "timeline" ? clampLabel : "RANDOM SLICES", x + width / 2, y + 12);
  context.globalAlpha = 1;
}

function drawStudioSoundCloudGridWaveformButton(
  context: CanvasRenderingContext2D,
  label: string,
  centerX: number,
  centerY: number,
  accentColor: string,
  isEnabled: boolean,
) {
  const size = STUDIO_SOUNDCLOUD_GRID_WAVEFORM_BUTTON_CANVAS_SIZE;
  const x = centerX - size / 2;
  const y = centerY - size / 2;

  context.fillStyle = isEnabled ? "rgba(87, 243, 255, 0.16)" : "rgba(111, 134, 163, 0.08)";
  context.fillRect(x, y, size, size);
  context.strokeStyle = isEnabled ? accentColor : "#3b4b60";
  context.globalAlpha = isEnabled ? 0.74 : 0.42;
  context.lineWidth = 3;
  context.strokeRect(x, y, size, size);
  context.globalAlpha = 1;
  context.fillStyle = isEnabled ? "#e9fbff" : "#6f86a3";
  context.textAlign = "center";
  context.font = "900 18px monospace";
  context.fillText(label, centerX, centerY + 1);
}

function createStudioSoundCloudGridScreenCanvas({
  accentColor,
  burstLengthLabel,
  feedbackLabel,
  padCountLabel,
  state,
}: StudioSoundCloudGridScreenCanvasSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const padsById = new Map(state.pads.map((pad) => [pad.id, pad]));
  const isReady = state.isAuxWidgetReady && state.pads.length > 0;
  const screenGlow = state.isBurstPlaying ? 0.82 : isReady ? 0.58 : 0.34;
  const modeLabel = state.padMode === "continuous" ? "CONT" : state.padMode === "timeline" ? "TIME" : "RAND";
  const settingLabels = ["ROLL", modeLabel, "LEN-", "LEN+", "VOL-", "VOL+", "MUTE", "LOCK", "TEST"];

  context.fillStyle = "#050914";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(87, 243, 255, 0.12)");
  gradient.addColorStop(0.46, "rgba(5, 9, 20, 0.08)");
  gradient.addColorStop(1, "rgba(246, 79, 255, 0.12)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = accentColor;
  context.globalAlpha = screenGlow;
  context.lineWidth = 10;
  context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  context.globalAlpha = 1;

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = accentColor;
  context.font = "900 42px monospace";
  context.fillText(`GRID ${state.deckId}`, 54, 72);

  context.textAlign = "right";
  context.fillStyle = state.isBurstPlaying ? "#f8d36a" : "#e9fbff";
  context.globalAlpha = state.isBurstPlaying ? 0.94 : 0.74;
  context.font = "800 24px monospace";
  context.fillText(state.isBurstPlaying ? "BURST PLAYING" : isReady ? "READY" : "BLOCKED", 970, 72);
  context.globalAlpha = 1;

  drawStudioSoundCloudGridWaveform({
    accentColor,
    context,
    state,
    x: 304,
    y: 46,
    width: 500,
    height: 50,
  });

  const canNudgeClamps = !state.isLocked && state.playbackDuration > state.burstLengthMs;
  if (state.padMode === "continuous") {
    drawStudioSoundCloudGridWaveformButton(context, "CL-", 266, 72, accentColor, canNudgeClamps);
    drawStudioSoundCloudGridWaveformButton(context, "CL+", 842, 72, accentColor, canNudgeClamps);
  } else if (state.padMode === "timeline") {
    drawStudioSoundCloudGridWaveformButton(context, "S-", 230, 72, accentColor, canNudgeClamps);
    drawStudioSoundCloudGridWaveformButton(context, "S+", 272, 72, accentColor, canNudgeClamps);
    drawStudioSoundCloudGridWaveformButton(context, "E-", 836, 72, accentColor, canNudgeClamps);
    drawStudioSoundCloudGridWaveformButton(context, "E+", 878, 72, accentColor, canNudgeClamps);
  }

  context.textAlign = "left";
  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.72;
  context.font = "700 22px monospace";
  context.fillText(trimStudioSoundCloudText(feedbackLabel, 46).toUpperCase(), 54, 112);
  context.globalAlpha = 1;

  const settingX = 54;
  const settingY = 146;
  const settingGap = 10;
  const settingW = (canvas.width - settingX * 2 - settingGap * (settingLabels.length - 1)) / settingLabels.length;
  const settingH = 60;
  settingLabels.forEach((label, index) => {
    const x = settingX + index * (settingW + settingGap);
    const isActive = (label === modeLabel && state.padMode !== "random") || (label === "MUTE" && state.isMuted) || (label === "LOCK" && state.isLocked) || (label === "TEST" && state.isBurstPlaying);
    const isBlocked = state.isLocked && !["MUTE", "LOCK", "TEST"].includes(label);

    context.fillStyle = isActive ? "rgba(248, 211, 106, 0.22)" : isBlocked ? "rgba(111, 134, 163, 0.08)" : "rgba(87, 243, 255, 0.12)";
    context.fillRect(x, settingY, settingW, settingH);
    context.strokeStyle = isActive ? "#f8d36a" : isBlocked ? "#3b4b60" : accentColor;
    context.globalAlpha = isBlocked ? 0.42 : 0.7;
    context.lineWidth = 3;
    context.strokeRect(x, settingY, settingW, settingH);
    context.globalAlpha = 1;
    context.fillStyle = isBlocked ? "#6f86a3" : isActive ? "#f8d36a" : "#e9fbff";
    context.textAlign = "center";
    context.font = "900 24px monospace";
    context.fillText(label, x + settingW / 2, settingY + settingH / 2);
  });

  const gridX = 54;
  const gridY = 234;
  const cellGap = 8;
  const cellW = (canvas.width - gridX * 2 - cellGap * 7) / 8;
  const cellH = 68;
  STUDIO_SOUNDCLOUD_GRID_PAD_IDS.forEach((padId, index) => {
    const pad = padsById.get(padId);
    const rowIndex = Math.floor(index / STUDIO_SOUNDCLOUD_GRID_COLUMNS.length);
    const columnIndex = index % STUDIO_SOUNDCLOUD_GRID_COLUMNS.length;
    const x = gridX + columnIndex * (cellW + cellGap);
    const y = gridY + rowIndex * (cellH + cellGap);
    const isLastTriggered = state.lastTriggeredPadId === padId;
    const isFlashing = isLastTriggered && state.isBurstPlaying;

    context.fillStyle = pad
      ? isFlashing
        ? "rgba(248, 211, 106, 0.34)"
        : isLastTriggered
          ? "rgba(87, 243, 255, 0.22)"
          : "rgba(87, 243, 255, 0.1)"
      : "rgba(111, 134, 163, 0.08)";
    context.fillRect(x, y, cellW, cellH);

    context.strokeStyle = pad ? (isFlashing ? "#f8d36a" : accentColor) : "#334256";
    context.globalAlpha = pad ? (isLastTriggered ? 0.9 : 0.54) : 0.35;
    context.lineWidth = isLastTriggered ? 5 : 3;
    context.strokeRect(x, y, cellW, cellH);
    context.globalAlpha = 1;

    context.fillStyle = pad ? (isFlashing ? "#f8d36a" : "#e9fbff") : "#53657c";
    context.textAlign = "center";
    context.font = "900 26px monospace";
    context.fillText(padId, x + cellW / 2, y + cellH / 2 - 7);

    context.fillStyle = pad ? "#a9bdc9" : "#53657c";
    context.globalAlpha = pad ? 0.72 : 0.48;
    context.font = "700 15px monospace";
    context.fillText(pad ? formatSoundCloudDeckTime(pad.positionMs) : "BLOCK", x + cellW / 2, y + cellH / 2 + 18);
    context.globalAlpha = 1;
  });

  const readoutY = 884;
  context.fillStyle = "rgba(5, 9, 20, 0.78)";
  context.fillRect(54, readoutY, canvas.width - 108, 86);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.46;
  context.lineWidth = 3;
  context.strokeRect(54, readoutY, canvas.width - 108, 86);
  context.globalAlpha = 1;

  context.textAlign = "left";
  context.fillStyle = "#e9fbff";
  context.font = "800 23px monospace";
  context.fillText(`DECK ${state.deckId} | ${trimStudioSoundCloudText(feedbackLabel, 34).toUpperCase()}`, 78, readoutY + 29);
  context.fillStyle = accentColor;
  context.font = "800 21px monospace";
  context.fillText(`PADS ${padCountLabel} | ${modeLabel} | LEN ${burstLengthLabel} | VOL ${Math.round(state.volume)}`, 78, readoutY + 61);

  context.textAlign = "right";
  context.fillStyle = state.isMuted || state.isLocked ? "#f8d36a" : "#a9bdc9";
  context.font = "800 21px monospace";
  context.fillText(`${state.isMuted ? "MUTE" : "OPEN"} | ${state.isLocked ? "LOCK" : "UNLOCK"}`, 946, readoutY + 61);

  return canvas;
}

function StudioSoundCloudGridClampHandle({
  accentColor,
  clamp,
  grid,
}: {
  accentColor: string;
  clamp: "start" | "end";
  grid: SoundCloudBoothGridController;
}) {
  const handleRef = useRef<React.ElementRef<"mesh">>(null);
  const clampPositionRef = useRef(0);
  const isDraggingRef = useRef(false);
  const { actions, state } = grid;
  const duration = Number.isFinite(state.playbackDuration) && state.playbackDuration > 0 ? state.playbackDuration : 0;
  const latestStart = duration > 0 ? Math.max(0, duration - state.burstLengthMs) : 0;
  const clampPositionMs = clamp === "start" ? state.sampleStartMs : state.sampleEndMs || latestStart;
  const clampRatio = duration > 0 ? clampNumber(clampPositionMs / duration, 0, 1) : 0;
  const clampX = STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_CENTER_X - STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_WIDTH / 2 + clampRatio * STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_WIDTH;
  const enabled = (state.padMode === "timeline" || state.padMode === "continuous") && duration > state.burstLengthMs;

  useEffect(() => {
    if (!isDraggingRef.current) {
      clampPositionRef.current = clampPositionMs;
    }
  }, [clampPositionMs]);

  const moveClampByPixels = useCallback((movementX: number) => {
    if (duration <= 0) {
      return;
    }

    const effectiveMovementX = Math.abs(movementX) < 0.2 ? 0 : clampNumber(movementX, -18, 18);
    const pixelsForFullStrip = 500;
    const nextPosition = clampNumber(clampPositionRef.current + effectiveMovementX * (duration / pixelsForFullStrip), 0, duration);

    clampPositionRef.current = nextPosition;
    actions.setSampleClamp(clamp, nextPosition);
  }, [actions, clamp, duration]);

  useRegisterInteractable(useMemo(() => ({
    id: `soundcloud-grid-${state.deckId.toLowerCase()}-${clamp}-clamp`,
    label: `${state.deckId} Grid ${clamp === "start" ? "Start" : "End"} Clamp`,
    objectRef: handleRef,
    modes: ["draggable" as const],
    enabled,
    onDragStart: () => {
      isDraggingRef.current = true;
      clampPositionRef.current = clampPositionMs;
    },
    onDragMove: ({ movementX }) => {
      moveClampByPixels(movementX);
    },
    onDragEnd: () => {
      isDraggingRef.current = false;
    },
  }), [
    clamp,
    clampPositionMs,
    enabled,
    moveClampByPixels,
    state.deckId,
  ]));

  return (
    <mesh
      ref={handleRef}
      position={[
        clampX,
        STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[1] / 2 + STUDIO_SOUNDCLOUD_GRID_HIT_TARGET_Y_OFFSET,
        STUDIO_SOUNDCLOUD_GRID_WAVEFORM_HIT_CENTER_Z,
      ]}
    >
      <boxGeometry args={STUDIO_SOUNDCLOUD_GRID_CLAMP_HIT_SIZE} />
      <meshBasicMaterial args={[{ color: accentColor, depthWrite: false, transparent: true, opacity: enabled ? 0.08 : 0, toneMapped: false }]} />
    </mesh>
  );
}

function StudioSoundCloudSpinningPlatter({
  accentColor,
  deck,
  onPushConsoleEvent,
}: {
  accentColor: string;
  deck: SoundCloudBoothDeck;
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
}) {
  const scrubTargetRef = useRef<React.ElementRef<"group">>(null);
  const platterSpinRef = useRef<React.ElementRef<"group">>(null);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [needlePosition, setNeedlePosition] = useState(0);
  const [scrubLabel, setScrubLabel] = useState<StudioSoundCloudPlatterScrubLabel>("GRAB");
  const scrubStartPositionRef = useRef(deck.display.playbackPosition);
  const scrubPositionRef = useRef(deck.display.playbackPosition);
  const wasPlayingOnGrabRef = useRef(deck.display.isPlaying);
  const visualBpm = getSoundCloudDeckVisualBpm(deck);
  const canScrub = deck.display.isWidgetReady && deck.display.playbackDuration > 0;

  useEffect(() => {
    if (!isGrabbed) {
      scrubPositionRef.current = deck.display.playbackPosition;
    }
  }, [deck.display.playbackPosition, isGrabbed]);

  useEffect(() => {
    if (!isGrabbed) {
      wasPlayingOnGrabRef.current = deck.display.isPlaying;
    }
  }, [deck.display.isPlaying, isGrabbed]);

  useFrame((_, delta) => {
    if (isGrabbed) {
      setNeedlePosition((current) => {
        const nextNeedle = current * Math.pow(0.08, delta);
        return Math.abs(nextNeedle) < 0.01 ? 0 : nextNeedle;
      });
      return;
    }

    if (!platterSpinRef.current || !deck.display.isPlaying) {
      return;
    }

    platterSpinRef.current.rotation.y += (visualBpm / 60) * Math.PI * 2 * delta;
  });

  const updateScrubLabel = useCallback((needle: number) => {
    if (needle < -0.65) {
      setScrubLabel("SCRUB BACK");
      return;
    }

    if (needle > 0.78) {
      setScrubLabel("OVERSPEED");
      return;
    }

    if (needle > 0.24) {
      setScrubLabel("PUSHING");
      return;
    }

    setScrubLabel("ON BEAT");
  }, []);

  const scrubByMovement = useCallback((movementX: number) => {
    if (!canScrub) {
      return;
    }

    const effectiveMovementX = Math.abs(movementX) < 0.25 ? 0 : clampNumber(movementX, -24, 24);
    const nextNeedle = clampNumber(effectiveMovementX / STUDIO_SOUNDCLOUD_PLATTER_SCRUB_NEEDLE_TARGET_SPEED, -1, 1);
    const nextPosition = clampNumber(
      scrubPositionRef.current + effectiveMovementX * STUDIO_SOUNDCLOUD_PLATTER_SCRUB_SEEK_MS_PER_PIXEL,
      0,
      deck.display.playbackDuration,
    );

    if (platterSpinRef.current) {
      platterSpinRef.current.rotation.y += effectiveMovementX * STUDIO_SOUNDCLOUD_PLATTER_SCRUB_ROTATION_PER_PIXEL;
    }

    scrubPositionRef.current = nextPosition;
    setNeedlePosition((current) => current * 0.55 + nextNeedle * 0.45);
    updateScrubLabel(nextNeedle);
    deck.seekActions.seekTo(nextPosition, { playAfterSeek: wasPlayingOnGrabRef.current });
  }, [canScrub, deck.display.playbackDuration, deck.seekActions, updateScrubLabel]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-dj-soundcloud-deck-${deck.id.toLowerCase()}-platter-scrub`,
    label: `${deck.label} Platter Scrub`,
    objectRef: scrubTargetRef,
    modes: ["draggable" as const],
    enabled: canScrub,
    onDragStart: () => {
      wasPlayingOnGrabRef.current = deck.display.isPlaying;
      scrubStartPositionRef.current = deck.display.playbackPosition;
      scrubPositionRef.current = deck.display.playbackPosition;
      setNeedlePosition(0);
      setScrubLabel("GRAB");
      setIsGrabbed(true);
    },
    onDragMove: ({ movementX }) => {
      scrubByMovement(movementX);
    },
    onDragEnd: () => {
      setNeedlePosition(0);
      setScrubLabel("GRAB");
      setIsGrabbed(false);
      if (Math.abs(scrubPositionRef.current - scrubStartPositionRef.current) >= 500) {
        pushSoundCloudBoothConsoleEvent(onPushConsoleEvent, {
          kind: "seek",
          deckId: deck.id,
          label: "SCRUB",
          detail: `${formatSoundCloudDeckTime(scrubStartPositionRef.current)} -> ${formatSoundCloudDeckTime(scrubPositionRef.current)}`,
        });
      }
    },
  }), [
    canScrub,
    deck.display.isPlaying,
    deck.display.playbackPosition,
    deck.id,
    deck.label,
    onPushConsoleEvent,
    scrubByMovement,
  ]));

  const meterNeedleColor = needlePosition < -0.24 ? "#f8d36a" : needlePosition > 0.24 ? "#f64fff" : accentColor;
  const meterNeedleX = needlePosition * 0.23;

  return (
    <group ref={scrubTargetRef}>
      <group ref={platterSpinRef}>
        <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y - 0.016, 0]}>
          <cylinderGeometry args={[STUDIO_SOUNDCLOUD_DECK_PLATTER_BASE_RADIUS, STUDIO_SOUNDCLOUD_DECK_PLATTER_BASE_RADIUS, 0.026, 40]} />
          <meshStandardMaterial args={[{ color: "#10192b", emissive: accentColor, emissiveIntensity: isGrabbed ? 0.28 : deck.display.isPlaying ? 0.18 : 0.07, roughness: 0.54, metalness: 0.1 }]} />
        </mesh>
        <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y, 0]}>
          <cylinderGeometry args={[STUDIO_SOUNDCLOUD_DECK_PLATTER_MID_RADIUS, STUDIO_SOUNDCLOUD_DECK_PLATTER_MID_RADIUS, 0.014, 40]} />
          <meshStandardMaterial args={[{ color: "#18243b", emissive: accentColor, emissiveIntensity: isGrabbed ? 0.34 : deck.display.isPlaying ? 0.22 : 0.08, roughness: 0.48, metalness: 0.12 }]} />
        </mesh>
        <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y + 0.018, 0]}>
          <cylinderGeometry args={[STUDIO_SOUNDCLOUD_DECK_PLATTER_TOP_RADIUS, STUDIO_SOUNDCLOUD_DECK_PLATTER_TOP_RADIUS, 0.016, 32]} />
          <meshBasicMaterial args={[{ color: isGrabbed ? "#e9fbff" : accentColor, transparent: true, opacity: deck.display.isWidgetReady ? (isGrabbed ? 0.82 : 0.62) : 0.24, toneMapped: false }]} />
        </mesh>
        <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y + 0.042, -0.22]}>
          <boxGeometry args={[0.035, 0.018, 0.16]} />
          <meshBasicMaterial args={[{ color: "#e9fbff", transparent: true, opacity: isGrabbed ? 0.9 : deck.display.isPlaying ? 0.74 : 0.32, toneMapped: false }]} />
        </mesh>
        <mesh position={[0.18, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y + 0.045, 0]}>
          <boxGeometry args={[0.12, 0.014, 0.026]} />
          <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: isGrabbed ? 0.84 : deck.display.isPlaying ? 0.66 : 0.28, toneMapped: false }]} />
        </mesh>
      </group>
      <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y + 0.02, 0]}>
        <cylinderGeometry args={[STUDIO_SOUNDCLOUD_DECK_PLATTER_BASE_RADIUS + 0.035, STUDIO_SOUNDCLOUD_DECK_PLATTER_BASE_RADIUS + 0.035, 0.06, 40]} />
        <meshBasicMaterial args={[{ color: accentColor, depthWrite: false, transparent: true, opacity: canScrub ? (isGrabbed ? 0.1 : 0.0) : 0.0, toneMapped: false }]} />
      </mesh>
      {isGrabbed ? (
        <group position={[0, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y + 0.16, -0.02]}>
          <mesh>
            <boxGeometry args={[0.62, 0.012, 0.12]} />
            <meshBasicMaterial args={[{ color: "#05070d", transparent: true, opacity: 0.88, toneMapped: false }]} />
          </mesh>
          <mesh position={[0, 0.014, 0]}>
            <boxGeometry args={[0.52, 0.012, 0.035]} />
            <meshBasicMaterial args={[{ color: "#8da1b8", transparent: true, opacity: 0.34, toneMapped: false }]} />
          </mesh>
          <mesh position={[0, 0.032, 0]}>
            <boxGeometry args={[0.07, 0.04, 0.068]} />
            <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.36, toneMapped: false }]} />
          </mesh>
          <mesh position={[meterNeedleX, 0.056, 0]}>
            <boxGeometry args={[0.035, 0.06, 0.085]} />
            <meshBasicMaterial args={[{ color: meterNeedleColor, transparent: true, opacity: 0.9, toneMapped: false }]} />
          </mesh>
          <mesh position={[0, 0.082, -0.072]}>
            <boxGeometry args={[0.28, 0.016, 0.03]} />
            <meshBasicMaterial args={[{ color: meterNeedleColor, transparent: true, opacity: scrubLabel === "ON BEAT" ? 0.7 : 0.46, toneMapped: false }]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function StudioSoundCloudDeckPanel({
  deck,
  onPushConsoleEvent,
  phaseVisuals,
  position,
}: {
  deck: SoundCloudBoothDeck;
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
  phaseVisuals: PhaseVisuals;
  position: Vec3;
}) {
  const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);
  const title = trimStudioSoundCloudText(deck.display.currentTrackTitle || "No Track Loaded", 20);
  const artist = trimStudioSoundCloudText(deck.display.currentTrackArtist || "SoundCloud", 18);
  const status = getSoundCloudDeckStatusLabel(deck);
  const timeLabel = getSoundCloudDeckTimeLabel(deck);
  const bpmLabel = getSoundCloudDeckBpmLabel(deck);
  const readoutCanvas = useMemo(() => createStudioSoundCloudReadoutCanvas({
    accentColor,
    isActive: deck.display.isPlaying,
    lineA: `${bpmLabel} / ${deck.display.lastBpmActionLabel ?? status}`,
    lineB: `${title} / ${artist}`,
    lineC: timeLabel,
    title: `${deck.label} SOUNDCLOUD`,
  }), [
    accentColor,
    artist,
    deck.display.isPlaying,
    deck.display.isWidgetReady,
    deck.display.currentTrackAcceptedBpmState.label,
    deck.display.lastBpmActionLabel,
    deck.display.playbackDuration,
    deck.display.playbackPosition,
    deck.label,
    deck.outputPercent,
    deck.trimPercent,
    status,
    timeLabel,
    title,
  ]);

  return (
    <group position={position}>
      <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_STATION_BASE_Y, 0]}>
        <boxGeometry args={STUDIO_SOUNDCLOUD_DECK_STATION_BASE_SIZE} />
        <meshStandardMaterial args={[{ color: "#14102a", emissive: "#371466", emissiveIntensity: deck.display.isPlaying ? 0.12 : 0.05, roughness: 0.8, metalness: 0.04 }]} />
      </mesh>
      <StudioSoundCloudSpinningPlatter accentColor={accentColor} deck={deck} onPushConsoleEvent={onPushConsoleEvent} />
      <StudioSoundCloudProgressSeekBar
        accentColor={accentColor}
        deck={deck}
        id={`studio-dj-soundcloud-deck-${deck.id.toLowerCase()}-progress-seek`}
        onPushConsoleEvent={onPushConsoleEvent}
        position={[0, STUDIO_SOUNDCLOUD_DECK_PLATTER_Y + 0.036, STUDIO_SOUNDCLOUD_DECK_PROGRESS_BAR_Z]}
      />
      <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_SLIDER_Y, 0.22]}>
        <boxGeometry args={STUDIO_SOUNDCLOUD_DECK_SLIDER_BAR_SIZE} />
        <meshBasicMaterial args={[{ color: "#6f86a3", transparent: true, opacity: 0.34, toneMapped: false }]} />
      </mesh>
      {Array.from({ length: STUDIO_SOUNDCLOUD_DECK_SLIDER_TICK_COUNT }, (_, index) => {
        const x = -0.12 + index * 0.06;

        return (
          <mesh key={`${deck.id}-slider-tick-${index}`} position={[x, STUDIO_SOUNDCLOUD_DECK_SLIDER_Y + 0.014, 0.22]}>
            <boxGeometry args={[0.012, 0.03, 0.01]} />
            <meshBasicMaterial args={[{ color: index === 2 ? accentColor : "#a9bdc9", transparent: true, opacity: index === 2 ? 0.58 : 0.26, toneMapped: false }]} />
          </mesh>
        );
      })}
      <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_SLIDER_Y + 0.016, 0.22]}>
        <boxGeometry args={[0.028, 0.034, 0.016]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.7, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, STUDIO_SOUNDCLOUD_DECK_BUTTON_POD_Y, STUDIO_SOUNDCLOUD_DECK_BUTTON_Z]}>
        <boxGeometry args={STUDIO_SOUNDCLOUD_DECK_BUTTON_POD_SIZE} />
        <meshStandardMaterial args={[{ color: "#10192b", emissive: accentColor, emissiveIntensity: 0.06, roughness: 0.76, metalness: 0.04 }]} />
      </mesh>
      <group position={STUDIO_SOUNDCLOUD_DECK_READOUT_POSITION}>
        <mesh>
          <boxGeometry args={STUDIO_SOUNDCLOUD_DECK_READOUT_BACKING_SIZE} />
          <meshStandardMaterial args={[{ color: "#0a101c", emissive: "#17304d", emissiveIntensity: 0.16, roughness: 0.72, metalness: 0.05 }]} />
        </mesh>
        <mesh position={[0, 0.012, 0.032]}>
          <planeGeometry args={STUDIO_SOUNDCLOUD_DECK_READOUT_SIZE} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.82, toneMapped: false }]}>
            <canvasTexture key={`studio-soundcloud-deck-${deck.id}-${status}-${Math.round(deck.outputPercent)}-${Math.round(deck.trimPercent)}-${Math.round(deck.display.playbackPosition)}-${Math.round(deck.display.playbackDuration)}-${title}-${artist}`} attach="map" args={[readoutCanvas]} />
          </meshBasicMaterial>
        </mesh>
      </group>
    </group>
  );
}

function createStudioSoundCloudDeckMonitorCanvas({
  accentColor,
  consoleEvents,
  deckA,
  deckB,
  mixer,
  waveformResolution,
}: {
  accentColor: string;
  consoleEvents: SoundCloudBoothConsoleEvent[];
  deckA: SoundCloudBoothDeck;
  deckB: SoundCloudBoothDeck;
  mixer: SoundCloudBoothMixer;
  waveformResolution: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1792;
  canvas.height = 504;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const consolePanelX = 1242;
  const consolePanelWidth = canvas.width - consolePanelX - 58;
  const drawDeckWaveform = (deck: SoundCloudBoothDeck, x: number, y: number, width: number, height: number) => {
    const bars = deck.display.waveformBars;
    const resolution = Math.round(clampNumber(waveformResolution, STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MIN, STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MAX));
    const sourceBarCount = Math.max(1, bars.length);
    const barCount = sourceBarCount * resolution;
    const progress = clampNumber(deck.display.progress, 0, 1);
    const accent = deck.id === "A" ? "#73ff4c" : "#62d8ff";
    const activeWidth = width * progress;

    context.fillStyle = "#05070d";
    context.globalAlpha = 0.72;
    context.fillRect(x, y, width, height);

    context.strokeStyle = accent;
    context.globalAlpha = deck.display.isWidgetReady ? 0.32 : 0.16;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);

    context.fillStyle = "#8da1b8";
    context.globalAlpha = 0.2;
    context.fillRect(x + 8, y + height / 2, width - 16, 2);

    Array.from({ length: barCount }, (_, index) => {
      const sourcePosition = barCount <= 1 ? 0 : (index / (barCount - 1)) * Math.max(0, sourceBarCount - 1);
      const leftIndex = Math.floor(sourcePosition);
      const rightIndex = Math.min(sourceBarCount - 1, leftIndex + 1);
      const blend = sourcePosition - leftIndex;
      const leftBar = bars[leftIndex] ?? 50;
      const rightBar = bars[rightIndex] ?? leftBar;
      const bar = leftBar + (rightBar - leftBar) * blend;
      const ratio = clampNumber(bar / 100, 0.08, 1);
      const barWidth = Math.max(2, (width - 24) / barCount - 2);
      const barX = x + 12 + index * ((width - 24) / barCount);
      const barHeight = Math.max(6, ratio * (height - 18));
      const barY = y + (height - barHeight) / 2;
      const isPlayed = barX - x <= activeWidth;

      context.fillStyle = isPlayed ? accent : "#a9bdc9";
      context.globalAlpha = deck.display.isWidgetReady ? (isPlayed ? 0.78 : 0.32) : 0.16;
      context.fillRect(barX, barY, barWidth, barHeight);
    });

    context.fillStyle = "#e9fbff";
    context.globalAlpha = deck.display.isWidgetReady ? 0.86 : 0.26;
    context.fillRect(x + activeWidth - 2, y + 4, 4, height - 8);

    context.fillStyle = accent;
    context.globalAlpha = 0.78;
    context.font = "900 15px monospace";
    context.textAlign = "left";
    context.fillText(`${deck.id} WAVE`, x + 12, y - 11);
    context.textAlign = "right";
    context.fillStyle = "#a9bdc9";
    context.globalAlpha = 0.56;
    context.font = "800 14px monospace";
    context.fillText(`${getSoundCloudDeckTimeLabel(deck).replace("TIME ", "")}  RES x${resolution}`, x + width - 10, y - 11);
  };
  const drawDeckLine = (deck: SoundCloudBoothDeck, y: number) => {
    const status = getSoundCloudDeckStatusLabel(deck);
    const output = `${Math.round(deck.outputPercent)}%`;
    const timeLabel = getSoundCloudDeckTimeLabel(deck).replace("TIME ", "");
    const title = trimStudioSoundCloudText(deck.display.currentTrackTitle || "NO TRACK", 34).toUpperCase();

    context.fillStyle = deck.display.isPlaying ? "#73ff4c" : "#a9bdc9";
    context.globalAlpha = deck.display.isWidgetReady ? 0.88 : 0.52;
    context.font = "800 34px monospace";
    context.textAlign = "left";
    context.fillText(`${deck.id} ${getSoundCloudDeckBpmLabel(deck)}`, 58, y);

    context.fillStyle = "#e9fbff";
    context.globalAlpha = 0.72;
    context.font = "700 24px monospace";
    context.fillText(`${status} OUT ${output}`, 450, y);

    context.fillStyle = "#a9bdc9";
    context.globalAlpha = 0.62;
    context.font = "700 22px monospace";
    context.fillText(`${timeLabel}  ${title}`, 720, y);
  };
  const crossfaderLabel = getSoundCloudCrossfaderLabel(mixer.crossfader);

  context.fillStyle = "#050914";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.6;
  context.lineWidth = 10;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = accentColor;
  context.globalAlpha = 0.88;
  context.font = "800 42px monospace";
  context.fillText("SOUNDCLOUD DECK MONITOR", 625, 50);

  drawDeckLine(deckA, 104);
  drawDeckLine(deckB, 150);
  drawDeckWaveform(deckA, 58, 194, 1110, 42);
  drawDeckWaveform(deckB, 58, 264, 1110, 42);

  context.fillStyle = "#e9fbff";
  context.globalAlpha = 0.78;
  context.font = "800 30px monospace";
  context.textAlign = "left";
  context.fillText(`XFADE ${crossfaderLabel}`, 58, 363);
  context.fillText(`MASTER ${mixer.masterVolume}%`, 402, 363);

  context.fillStyle = accentColor;
  context.globalAlpha = 0.82;
  context.fillText(`A OUT ${Math.round(mixer.deckAOutputPercent)}%`, 705, 363);
  context.fillText(`B OUT ${Math.round(mixer.deckBOutputPercent)}%`, 965, 363);

  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.54;
  context.font = "700 22px monospace";
  context.textAlign = "center";
  context.fillText("BPM ACCEPTED FROM META / WAVE / LENGTH / MANUAL", 625, 420);

  context.textAlign = "right";
  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.62;
  context.font = "800 17px monospace";
  context.fillText(`WAVE RES x${Math.round(clampNumber(waveformResolution, STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MIN, STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MAX))}`, 965, 50);

  [
    { label: "-", x: 994, enabled: waveformResolution > STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MIN },
    { label: "+", x: 1089, enabled: waveformResolution < STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MAX },
  ].forEach((button) => {
    context.fillStyle = button.enabled ? accentColor : "#273246";
    context.globalAlpha = button.enabled ? 0.18 : 0.1;
    context.fillRect(button.x, 27, 72, 42);
    context.strokeStyle = button.enabled ? accentColor : "#6f86a3";
    context.globalAlpha = button.enabled ? 0.58 : 0.24;
    context.lineWidth = 3;
    context.strokeRect(button.x, 27, 72, 42);
    context.fillStyle = button.enabled ? "#e9fbff" : "#8da1b8";
    context.globalAlpha = button.enabled ? 0.86 : 0.34;
    context.font = "900 30px monospace";
    context.textAlign = "center";
    context.fillText(button.label, button.x + 36, 49);
  });

  context.strokeStyle = accentColor;
  context.globalAlpha = 0.36;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(consolePanelX - 28, 56);
  context.lineTo(consolePanelX - 28, canvas.height - 52);
  context.stroke();

  context.fillStyle = accentColor;
  context.globalAlpha = 0.1;
  context.fillRect(consolePanelX, 58, consolePanelWidth, canvas.height - 116);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.32;
  context.lineWidth = 3;
  context.strokeRect(consolePanelX, 58, consolePanelWidth, canvas.height - 116);

  context.textAlign = "left";
  context.fillStyle = accentColor;
  context.globalAlpha = 0.86;
  context.font = "900 27px monospace";
  context.fillText("BOOTH CONSOLE", consolePanelX + 28, 102);

  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.6;
  context.font = "800 18px monospace";
  context.fillText(`LIVE  ${consoleEvents.length.toString().padStart(2, "0")} EVENTS`, consolePanelX + 30, 136);

  const visibleEvents = consoleEvents.slice(0, STUDIO_SOUNDCLOUD_CONSOLE_VISIBLE_EVENT_COUNT);

  if (visibleEvents.length === 0) {
    context.fillStyle = "#a9bdc9";
    context.globalAlpha = 0.58;
    context.font = "700 21px monospace";
    context.fillText("> waiting for deck events", consolePanelX + 30, 206);
  } else {
    visibleEvents.forEach((event, index) => {
      const y = 184 + index * 31;
      const color = getSoundCloudBoothConsoleEventColor(event);
      const timestamp = formatSoundCloudBoothConsoleTimestamp(event.timestamp);
      const line = formatSoundCloudBoothConsoleLine(event).toUpperCase();

      context.fillStyle = color;
      context.globalAlpha = Math.max(0.34, 0.86 - index * 0.06);
      context.font = "900 15px monospace";
      context.textAlign = "left";
      context.fillText(timestamp, consolePanelX + 30, y);
      context.fillRect(consolePanelX + 118, y - 8, 10, 10);

      context.fillStyle = "#dcecff";
      context.globalAlpha = Math.max(0.3, 0.78 - index * 0.055);
      context.font = "800 17px monospace";
      context.fillText(fitCanvasText(context, line, consolePanelWidth - 162), consolePanelX + 144, y);
    });
  }
  context.globalAlpha = 1;

  return canvas;
}

function StudioSoundCloudDeckMonitor({
  consoleEvents = [],
  deckA,
  deckB,
  mixer,
  onDecreaseWaveformResolution,
  onIncreaseWaveformResolution,
  onPushConsoleEvent,
  phaseVisuals,
  waveformResolution,
}: {
  consoleEvents?: SoundCloudBoothConsoleEvent[];
  deckA: SoundCloudBoothDeck;
  deckB: SoundCloudBoothDeck;
  mixer: SoundCloudBoothMixer;
  onDecreaseWaveformResolution?: () => void;
  onIncreaseWaveformResolution?: () => void;
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
  phaseVisuals: PhaseVisuals;
  waveformResolution: number;
}) {
  const labelCanvas = useMemo(() => createStudioSoundCloudDeckMonitorCanvas({
    accentColor: phaseVisuals.gridPrimary,
    consoleEvents,
    deckA,
    deckB,
    mixer,
    waveformResolution,
  }), [
    consoleEvents,
    deckA.display.currentTrackAcceptedBpmState.label,
    deckA.display.currentTrackBpm,
    deckA.display.currentTrackBpmState.label,
    deckA.display.currentTrackTitle,
    deckA.display.playbackDuration,
    deckA.display.playbackPosition,
    deckA.display.progress,
    deckA.display.waveformBars,
    deckA.display.isPlaying,
    deckA.display.isWidgetReady,
    deckA.outputPercent,
    deckA.display.errorMessage,
    deckB.display.currentTrackAcceptedBpmState.label,
    deckB.display.currentTrackBpm,
    deckB.display.currentTrackBpmState.label,
    deckB.display.currentTrackTitle,
    deckB.display.playbackDuration,
    deckB.display.playbackPosition,
    deckB.display.progress,
    deckB.display.waveformBars,
    deckB.display.isPlaying,
    deckB.display.isWidgetReady,
    deckB.outputPercent,
    deckB.display.errorMessage,
    mixer.crossfader,
    mixer.deckAOutputPercent,
    mixer.deckBOutputPercent,
    mixer.masterVolume,
    phaseVisuals.gridPrimary,
    waveformResolution,
  ]);
  const waveformResolutionControls = useMemo<StudioDjControlSpec[]>(() => [
    {
      id: "soundcloud-monitor-waveform-resolution-down",
      label: "-",
      caption: "SoundCloud Monitor Waveform Resolution Down",
      position: [STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_DOWN_X, STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Y, STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Z],
      size: STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_SIZE,
      accentColor: phaseVisuals.gridSecondary,
      enabled: waveformResolution > STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MIN,
      onActivate: () => onDecreaseWaveformResolution?.(),
    },
    {
      id: "soundcloud-monitor-waveform-resolution-up",
      label: "+",
      caption: "SoundCloud Monitor Waveform Resolution Up",
      position: [STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_UP_X, STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Y, STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Z],
      size: STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_SIZE,
      accentColor: phaseVisuals.gridPrimary,
      enabled: waveformResolution < STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MAX,
      onActivate: () => onIncreaseWaveformResolution?.(),
    },
  ], [
    onDecreaseWaveformResolution,
    onIncreaseWaveformResolution,
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    waveformResolution,
  ]);

  return (
    <group position={STUDIO_SOUNDCLOUD_DECK_MONITOR_POSITION} rotation={STUDIO_SOUNDCLOUD_DECK_MONITOR_ROTATION}>
      <mesh>
        <boxGeometry args={STUDIO_SOUNDCLOUD_DECK_MONITOR_BACKING_SIZE} />
        <meshStandardMaterial args={[{ color: "#0a101c", emissive: "#17304d", emissiveIntensity: 0.18, roughness: 0.72, metalness: 0.05 }]} />
      </mesh>
      <mesh position={[0, 0.012, 0.045]}>
        <planeGeometry args={STUDIO_SOUNDCLOUD_DECK_MONITOR_PLANE_SIZE} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.82, toneMapped: false }]}>
          <canvasTexture key={`studio-soundcloud-deck-monitor-${deckA.display.currentTrackAcceptedBpmState.label}-${deckA.display.isPlaying}-${Math.round(deckA.outputPercent)}-${Math.round(deckA.display.progress * 1000)}-${deckA.display.waveformBars.length}-${deckA.display.waveformBars[0] ?? 0}-${deckB.display.currentTrackAcceptedBpmState.label}-${deckB.display.isPlaying}-${Math.round(deckB.outputPercent)}-${Math.round(deckB.display.progress * 1000)}-${deckB.display.waveformBars.length}-${deckB.display.waveformBars[0] ?? 0}-${waveformResolution}-${mixer.crossfader}-${mixer.masterVolume}-${consoleEvents.map((event) => event.id).join("|")}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      {waveformResolutionControls.map((control) => (
        <StudioSoundCloudInvisibleButton key={control.id} control={control} />
      ))}
      <StudioSoundCloudMonitorWaveformHitTarget
        caption="Deck A Monitor Waveform Seek"
        deck={deckA}
        id="studio-dj-soundcloud-monitor-waveform-a-seek"
        onPushConsoleEvent={onPushConsoleEvent}
        position={[STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_X, STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_A_Y, STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Z]}
        size={STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_HIT_SIZE}
      />
      <StudioSoundCloudMonitorWaveformHitTarget
        caption="Deck B Monitor Waveform Seek"
        deck={deckB}
        id="studio-dj-soundcloud-monitor-waveform-b-seek"
        onPushConsoleEvent={onPushConsoleEvent}
        position={[STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_X, STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_B_Y, STUDIO_SOUNDCLOUD_MONITOR_WAVE_BUTTON_Z]}
        size={STUDIO_SOUNDCLOUD_MONITOR_WAVEFORM_HIT_SIZE}
      />
    </group>
  );
}

function formatSoundCloudCrateDuration(durationMs: number | null) {
  if (!durationMs || durationMs <= 0 || !Number.isFinite(durationMs)) {
    return "--:--";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function createStudioSoundCloudCrateCanvas({
  accentColor,
  deck,
  scrollOffset,
}: {
  accentColor: string;
  deck: SoundCloudBoothDeck;
  scrollOffset: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const tracks = deck.display.trackList;
  const maxOffset = Math.max(0, tracks.length - STUDIO_SOUNDCLOUD_CRATE_VISIBLE_ROWS);
  const effectiveOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
  const visibleTracks = tracks.slice(effectiveOffset, effectiveOffset + STUDIO_SOUNDCLOUD_CRATE_VISIBLE_ROWS);
  const status = getSoundCloudDeckStatusLabel(deck);
  const loadedIndex = deck.display.currentTrackIndex;

  context.fillStyle = "#050914";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.64;
  context.lineWidth = 10;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  context.globalAlpha = 1;

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = accentColor;
  context.font = "900 38px monospace";
  context.fillText(`${deck.label.toUpperCase()} CRATE`, 48, 58);

  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.86;
  context.font = "700 20px monospace";
  context.fillText(`${status} | ${deck.display.playlistLabel.toUpperCase()}`, 50, 100);
  context.textAlign = "right";
  context.fillText(`${tracks.length} SONGS`, canvas.width - 50, 100);

  const rowTop = 142;
  const rowHeight = 56;

  context.textAlign = "left";
  visibleTracks.forEach((track, rowIndex) => {
    const y = rowTop + rowIndex * rowHeight;
    const isLoaded = track.index === loadedIndex;
    context.fillStyle = isLoaded ? accentColor : "rgba(99, 122, 148, 0.28)";
    context.globalAlpha = isLoaded ? 0.26 : 0.42;
    context.fillRect(48, y - 20, canvas.width - 170, 44);
    context.globalAlpha = 1;
    context.fillStyle = isLoaded ? "#e9fbff" : "#c9d5df";
    context.font = isLoaded ? "900 24px monospace" : "800 23px monospace";
    context.fillText(`${track.index + 1}`.padStart(2, "0"), 70, y + 2);
    context.fillText(fitCanvasText(context, track.title.toUpperCase(), 520), 126, y - 4);
    context.fillStyle = isLoaded ? accentColor : "#8ea1b4";
    context.font = "700 16px monospace";
    context.fillText(fitCanvasText(context, track.artist.toUpperCase(), 500), 126, y + 20);
    context.textAlign = "right";
    context.fillStyle = "#a9bdc9";
    context.font = "700 18px monospace";
    context.fillText(formatSoundCloudCrateDuration(track.durationMs), canvas.width - 152, y + 2);
    context.textAlign = "left";
  });

  if (visibleTracks.length === 0) {
    context.fillStyle = "#a9bdc9";
    context.globalAlpha = 0.7;
    context.font = "800 26px monospace";
    context.textAlign = "center";
    context.fillText(deck.display.isWidgetReady ? "NO TRACKS LOADED" : "LOADING PLAYLIST", canvas.width / 2, 270);
    context.textAlign = "left";
    context.globalAlpha = 1;
  }

  const scrollButtonY = 432;
  [
    { label: "UP", x: canvas.width / 2 - 70, active: effectiveOffset > 0 },
    { label: "DOWN", x: canvas.width / 2 + 70, active: effectiveOffset < maxOffset },
  ].forEach((control) => {
    context.fillStyle = control.active ? accentColor : "#314256";
    context.globalAlpha = control.active ? 0.32 : 0.22;
    context.fillRect(control.x - 54, scrollButtonY - 22, 108, 40);
    context.globalAlpha = control.active ? 0.92 : 0.52;
    context.fillStyle = "#e9fbff";
    context.font = "900 20px monospace";
    context.textAlign = "center";
    context.fillText(control.label, control.x, scrollButtonY - 1);
  });

  context.textAlign = "center";
  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.66;
  context.font = "700 18px monospace";
  context.fillText("CLICK ROW TO LOAD | SCROLL BUTTONS BELOW ROWS", canvas.width / 2, 480);
  context.globalAlpha = 1;

  return canvas;
}

function StudioSoundCloudCrateHitTarget({
  accentColor,
  caption,
  enabled = true,
  id,
  position,
  size,
  onActivate,
}: {
  accentColor: string;
  caption: string;
  enabled?: boolean;
  id: string;
  position: Vec3;
  size: Vec3;
  onActivate: () => void;
}) {
  const targetRef = useRef<React.ElementRef<"mesh">>(null);

  useRegisterInteractable(useMemo(() => ({
    id,
    label: caption,
    objectRef: targetRef,
    modes: ["clickable" as const],
    enabled,
    onActivate,
  }), [caption, enabled, id, onActivate]));

  return (
    <mesh ref={targetRef} position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial args={[{ color: accentColor, depthWrite: false, transparent: true, opacity: 0, toneMapped: false }]} />
    </mesh>
  );
}

function StudioSoundCloudCrateBrowser({
  deck,
  onPushConsoleEvent,
  phaseVisuals,
  position,
  scrollOffset,
  onSetScrollOffset,
}: {
  deck: SoundCloudBoothDeck;
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
  phaseVisuals: PhaseVisuals;
  position: Vec3;
  scrollOffset: number;
  onSetScrollOffset: (deckId: SoundCloudBoothDeck["id"], offset: number) => void;
}) {
  const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);
  const maxOffset = Math.max(0, deck.display.trackList.length - STUDIO_SOUNDCLOUD_CRATE_VISIBLE_ROWS);
  const effectiveOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
  const visibleTracks = deck.display.trackList.slice(effectiveOffset, effectiveOffset + STUDIO_SOUNDCLOUD_CRATE_VISIBLE_ROWS);
  const labelCanvas = useMemo(() => createStudioSoundCloudCrateCanvas({
    accentColor,
    deck,
    scrollOffset: effectiveOffset,
  }), [
    accentColor,
    deck.display.currentTrackIndex,
    deck.display.isPlaying,
    deck.display.isWidgetReady,
    deck.display.playlistLabel,
    deck.display.trackList,
    deck.display.trackCount,
    deck.display.errorMessage,
    effectiveOffset,
  ]);

  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={STUDIO_SOUNDCLOUD_CRATE_SCREEN_SIZE} />
        <meshStandardMaterial args={[{ color: "#07101d", emissive: accentColor, emissiveIntensity: 0.1, roughness: 0.76, metalness: 0.05 }]} />
      </mesh>
      <mesh position={[0, STUDIO_SOUNDCLOUD_CRATE_SCREEN_SIZE[1] / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={STUDIO_SOUNDCLOUD_CRATE_PLANE_SIZE} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.84, toneMapped: false }]} >
          <canvasTexture key={`studio-soundcloud-crate-${deck.id}-${deck.display.playlistId}-${effectiveOffset}-${deck.display.currentTrackIndex ?? "none"}-${deck.display.trackCount}-${deck.display.isPlaying}-${deck.display.isWidgetReady}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <StudioSoundCloudCrateHitTarget
        accentColor={accentColor}
        caption={`${deck.label} Crate Scroll Up`}
        enabled={effectiveOffset > 0}
        id={`studio-soundcloud-crate-${deck.id.toLowerCase()}-up`}
        position={STUDIO_SOUNDCLOUD_CRATE_SCROLL_UP_POSITION}
        size={STUDIO_SOUNDCLOUD_CRATE_SCROLL_HIT_SIZE}
        onActivate={() => onSetScrollOffset(deck.id, Math.max(0, effectiveOffset - 1))}
      />
      <StudioSoundCloudCrateHitTarget
        accentColor={accentColor}
        caption={`${deck.label} Crate Scroll Down`}
        enabled={effectiveOffset < maxOffset}
        id={`studio-soundcloud-crate-${deck.id.toLowerCase()}-down`}
        position={STUDIO_SOUNDCLOUD_CRATE_SCROLL_DOWN_POSITION}
        size={STUDIO_SOUNDCLOUD_CRATE_SCROLL_HIT_SIZE}
        onActivate={() => onSetScrollOffset(deck.id, Math.min(maxOffset, effectiveOffset + 1))}
      />
      {visibleTracks.map((track, rowIndex) => (
        <StudioSoundCloudCrateHitTarget
          key={`${deck.id}-${track.index}`}
          accentColor={accentColor}
          caption={`${deck.label} Load ${track.title}`}
          enabled={deck.display.isWidgetReady}
          id={`studio-soundcloud-crate-${deck.id.toLowerCase()}-row-${track.index}`}
          position={[-0.08, STUDIO_SOUNDCLOUD_CRATE_SCREEN_SIZE[1] / 2 + 0.03, -0.188 + rowIndex * 0.077]}
          size={STUDIO_SOUNDCLOUD_CRATE_ROW_HIT_SIZE}
          onActivate={() => {
            pushSoundCloudBoothConsoleEvent(onPushConsoleEvent, {
              kind: "deck",
              deckId: deck.id,
              label: "LOAD REQUEST",
              detail: trimStudioSoundCloudText(track.title, 30),
            });
            deck.actions.loadTrackByIndex(track.index);
          }}
        />
      ))}
    </group>
  );
}

function StudioSoundCloudDeckCrateStation({
  deck,
  onPushConsoleEvent,
  phaseVisuals,
  position,
}: {
  deck: SoundCloudBoothDeck;
  onPushConsoleEvent?: (event: SoundCloudBoothConsoleEventInput) => void;
  phaseVisuals: PhaseVisuals;
  position: Vec3;
}) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const handleSetScrollOffset = useCallback((_deckId: SoundCloudBoothDeck["id"], offset: number) => {
    setScrollOffset(offset);
  }, []);

  return (
    <StudioSoundCloudCrateBrowser
      deck={deck}
      onPushConsoleEvent={onPushConsoleEvent}
      onSetScrollOffset={handleSetScrollOffset}
      phaseVisuals={phaseVisuals}
      position={position}
      scrollOffset={scrollOffset}
    />
  );
}

function getSoundCloudGridBurstLengthLabel(milliseconds: number) {
  return milliseconds >= 1000 ? `${milliseconds / 1000}S` : `${milliseconds}MS`;
}

function StudioSoundCloudGridController({
  accentColor,
  grid,
  position,
}: StudioSoundCloudGridControllerProps) {
  const { actions, state } = grid;
  const controllerRef = useRef<React.ElementRef<"group">>(null);
  const padsById = useMemo(() => new Map(state.pads.map((pad) => [pad.id, pad])), [state.pads]);
  const feedbackLabel = state.lastActionLabel ?? state.statusLabel;
  const burstLengthLabel = getSoundCloudGridBurstLengthLabel(state.burstLengthMs);
  const padCountLabel = `${state.pads.length}/64`;
  const isReady = state.isAuxWidgetReady && state.pads.length > 0;
  const padScreenSignature = useMemo(() => (
    state.pads.map((pad) => `${pad.id}:${Math.round(pad.positionMs)}`).join("|")
  ), [state.pads]);
  const screenCanvas = useMemo(() => createStudioSoundCloudGridScreenCanvas({
    accentColor,
    burstLengthLabel,
    feedbackLabel,
    padCountLabel,
    state,
  }), [
    accentColor,
    burstLengthLabel,
    feedbackLabel,
    padCountLabel,
    state,
  ]);
  const settingControls = useMemo<StudioDjControlSpec[]>(() => {
    const modeLabel = state.padMode === "continuous" ? "CONT" : state.padMode === "timeline" ? "TIME" : "RAND";
    const modeCaption = state.padMode === "continuous" ? "MODE CONTINUOUS" : state.padMode === "timeline" ? "MODE TIMELINE" : "MODE RANDOM";
    const controls = [
      {
        id: "roll",
        label: "ROLL",
        caption: state.isLocked ? "LOCK" : "ROLL GRID",
        enabled: !state.isLocked,
        isActive: false,
        onActivate: actions.rollPads,
      },
      {
        id: "mode",
        label: modeLabel,
        caption: state.isLocked ? "LOCK" : modeCaption,
        enabled: !state.isLocked,
        isActive: state.padMode !== "random",
        onActivate: actions.togglePadMode,
      },
      {
        id: "len-down",
        label: "LEN-",
        caption: `LEN ${burstLengthLabel}`,
        enabled: !state.isLocked,
        isActive: false,
        onActivate: () => actions.stepBurstLength(-1),
      },
      {
        id: "len-up",
        label: "LEN+",
        caption: `LEN ${burstLengthLabel}`,
        enabled: !state.isLocked,
        isActive: false,
        onActivate: () => actions.stepBurstLength(1),
      },
      {
        id: "vol-down",
        label: "VOL-",
        caption: `VOL ${Math.round(state.volume)}`,
        enabled: !state.isLocked,
        isActive: false,
        onActivate: () => actions.stepVolume(-1),
      },
      {
        id: "vol-up",
        label: "VOL+",
        caption: `VOL ${Math.round(state.volume)}`,
        enabled: !state.isLocked,
        isActive: false,
        onActivate: () => actions.stepVolume(1),
      },
      {
        id: "mute",
        label: "MUTE",
        caption: state.isMuted ? "MUTE ON" : "MUTE OFF",
        enabled: true,
        isActive: state.isMuted,
        onActivate: actions.toggleMute,
      },
      {
        id: "lock",
        label: "LOCK",
        caption: state.isLocked ? "LOCK ON" : "LOCK OFF",
        enabled: true,
        isActive: state.isLocked,
        onActivate: actions.toggleLock,
      },
      {
        id: "test",
        label: "TEST",
        caption: state.isAuxWidgetReady ? "TEST BURST" : "GRID LOAD",
        enabled: state.isAuxWidgetReady,
        isActive: state.isBurstPlaying,
        onActivate: actions.triggerTestBurst,
      },
    ];

    const centerOffset = (controls.length - 1) / 2;

    return controls.map((control, index) => ({
      id: `soundcloud-grid-${state.deckId.toLowerCase()}-${control.id}`,
      label: control.label,
      caption: control.caption,
      captionFontSize: 18,
      position: [
        (index - centerOffset) * STUDIO_SOUNDCLOUD_GRID_SETTING_PITCH_X,
        STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[1] / 2 + STUDIO_SOUNDCLOUD_GRID_HIT_TARGET_Y_OFFSET,
        STUDIO_SOUNDCLOUD_GRID_SETTING_Z,
      ] as Vec3,
      size: STUDIO_SOUNDCLOUD_GRID_SETTING_BUTTON_SIZE,
      accentColor: control.isActive ? "#f8d36a" : accentColor,
      enabled: control.enabled,
      isActive: control.isActive,
      onActivate: control.onActivate,
    }));
  }, [
    accentColor,
    actions,
    burstLengthLabel,
    state.deckId,
    state.isAuxWidgetReady,
    state.isBurstPlaying,
    state.isLocked,
    state.isMuted,
    state.padMode,
    state.volume,
  ]);
  const waveformNudgeControls = useMemo<StudioDjControlSpec[]>(() => {
    const canNudgeClamps = !state.isLocked && state.playbackDuration > state.burstLengthMs;
    const controlBase = {
      captionFontSize: 16,
      size: STUDIO_SOUNDCLOUD_GRID_WAVEFORM_BUTTON_SIZE,
      accentColor,
      enabled: canNudgeClamps,
      isActive: false,
    };

    if (state.padMode === "continuous") {
      return [
        {
          ...controlBase,
          id: `soundcloud-grid-${state.deckId.toLowerCase()}-cont-clamp-down`,
          label: "CL-",
          caption: "CLAMP -",
          position: mapStudioSoundCloudGridScreenPointToLocal(266, 72),
          onActivate: () => actions.stepSampleWindow(-1),
        },
        {
          ...controlBase,
          id: `soundcloud-grid-${state.deckId.toLowerCase()}-cont-clamp-up`,
          label: "CL+",
          caption: "CLAMP +",
          position: mapStudioSoundCloudGridScreenPointToLocal(842, 72),
          onActivate: () => actions.stepSampleWindow(1),
        },
      ];
    }

    if (state.padMode === "timeline") {
      return [
        {
          ...controlBase,
          id: `soundcloud-grid-${state.deckId.toLowerCase()}-start-clamp-down`,
          label: "S-",
          caption: "START -",
          position: mapStudioSoundCloudGridScreenPointToLocal(230, 72),
          onActivate: () => actions.stepSampleClamp("start", -1),
        },
        {
          ...controlBase,
          id: `soundcloud-grid-${state.deckId.toLowerCase()}-start-clamp-up`,
          label: "S+",
          caption: "START +",
          position: mapStudioSoundCloudGridScreenPointToLocal(272, 72),
          onActivate: () => actions.stepSampleClamp("start", 1),
        },
        {
          ...controlBase,
          id: `soundcloud-grid-${state.deckId.toLowerCase()}-end-clamp-down`,
          label: "E-",
          caption: "END -",
          position: mapStudioSoundCloudGridScreenPointToLocal(836, 72),
          onActivate: () => actions.stepSampleClamp("end", -1),
        },
        {
          ...controlBase,
          id: `soundcloud-grid-${state.deckId.toLowerCase()}-end-clamp-up`,
          label: "E+",
          caption: "END +",
          position: mapStudioSoundCloudGridScreenPointToLocal(878, 72),
          onActivate: () => actions.stepSampleClamp("end", 1),
        },
      ];
    }

    return [];
  }, [
    accentColor,
    actions,
    state.burstLengthMs,
    state.deckId,
    state.isLocked,
    state.padMode,
    state.playbackDuration,
  ]);

  return (
    <group ref={controllerRef} position={position}>
      <mesh>
        <boxGeometry args={STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE} />
        <meshStandardMaterial args={[{
          color: "#0a1322",
          emissive: accentColor,
          emissiveIntensity: state.isBurstPlaying ? 0.18 : isReady ? 0.09 : 0.04,
          roughness: 0.78,
          metalness: 0.08,
        }]} />
      </mesh>
      <mesh position={[0, STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[1] / 2 + 0.003, 0]}>
        <boxGeometry args={[STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[0] + 0.045, 0.008, STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[2] + 0.045]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: state.isBurstPlaying ? 0.16 : 0.07, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[1] / 2 + 0.012, 0]}>
        <boxGeometry args={STUDIO_SOUNDCLOUD_GRID_SCREEN_BACKING_SIZE} />
        <meshBasicMaterial args={[{ color: "#050914", transparent: true, opacity: 0.92, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[1] / 2 + 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={STUDIO_SOUNDCLOUD_GRID_SCREEN_SIZE} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.92, toneMapped: false }]}>
          <canvasTexture key={`studio-soundcloud-grid-screen-${state.deckId}-${feedbackLabel}-${padCountLabel}-${state.padMode}-${Math.round(state.playbackDuration)}-${Math.round(state.sampleStartMs)}-${Math.round(state.sampleEndMs)}-${state.waveformBars.length}-${state.waveformBars[0] ?? 0}-${burstLengthLabel}-${state.volume}-${state.isMuted ? "mute" : "open"}-${state.isLocked ? "lock" : "unlock"}-${state.lastTriggeredPadId ?? "none"}-${state.isBurstPlaying ? "burst" : "idle"}-${padScreenSignature}`} attach="map" args={[screenCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <StudioSoundCloudGridClampHandle
        accentColor={accentColor}
        clamp="start"
        grid={grid}
      />
      <StudioSoundCloudGridClampHandle
        accentColor={accentColor}
        clamp="end"
        grid={grid}
      />
      {settingControls.map((control) => (
        <StudioSoundCloudInvisibleButton key={control.id} control={control} />
      ))}
      {waveformNudgeControls.map((control) => (
        <StudioSoundCloudInvisibleButton key={control.id} control={control} />
      ))}
      {STUDIO_SOUNDCLOUD_GRID_PAD_IDS.map((padId, index) => {
        const pad = padsById.get(padId);
        const rowIndex = Math.floor(index / STUDIO_SOUNDCLOUD_GRID_COLUMNS.length);
        const columnIndex = index % STUDIO_SOUNDCLOUD_GRID_COLUMNS.length;

        return (
          <StudioSoundCloudInvisibleButton
            key={`soundcloud-grid-${state.deckId}-${padId}`}
            control={{
              id: `soundcloud-grid-${state.deckId.toLowerCase()}-pad-${padId.toLowerCase()}`,
              label: padId,
              caption: pad ? `${state.deckId} Grid Pad ${padId}` : `${state.deckId} Grid Pad ${padId} Blocked`,
              captionFontSize: 18,
              position: [
                (columnIndex - 3.5) * STUDIO_SOUNDCLOUD_GRID_PAD_PITCH_X,
                STUDIO_SOUNDCLOUD_GRID_CONTROLLER_SIZE[1] / 2 + STUDIO_SOUNDCLOUD_GRID_HIT_TARGET_Y_OFFSET,
                STUDIO_SOUNDCLOUD_GRID_PAD_START_Z + rowIndex * STUDIO_SOUNDCLOUD_GRID_PAD_PITCH_Z,
              ],
              size: STUDIO_SOUNDCLOUD_GRID_PAD_BUTTON_SIZE,
              accentColor,
              enabled: Boolean(pad),
              isActive: state.lastTriggeredPadId === padId,
              onActivate: () => {
                if (pad) {
                  actions.triggerPad(pad.id);
                }
              },
            }}
          />
        );
      })}
    </group>
  );
}

function StudioSoundCloudDjControls({
  phaseVisuals,
  soundCloudBooth,
}: {
  phaseVisuals: PhaseVisuals;
  soundCloudBooth: SoundCloudBoothState;
}) {
  const [deckA, deckB] = soundCloudBooth.decks;
  const { activeDragId } = useInteractionRegistry();
  const isCrossfaderGrabbed = activeDragId === "studio-dj-soundcloud-crossfader-drag";
  const isMasterGrabbed = activeDragId === "studio-dj-soundcloud-master-drag";
  const pushConsoleEvent = soundCloudBooth.onPushConsoleEvent;
  const [crateScrollOffsets, setCrateScrollOffsets] = useState<Record<SoundCloudBoothDeck["id"], number>>({ A: 0, B: 0 });
  const [waveformResolution, setWaveformResolution] = useState(1);
  const handleSetCrateScrollOffset = useCallback((deckId: SoundCloudBoothDeck["id"], offset: number) => {
    setCrateScrollOffsets((current) => ({
      ...current,
      [deckId]: offset,
    }));
  }, []);
  const setSoundCloudWaveformResolution = useCallback((delta: number) => {
    setWaveformResolution((current) => {
      const nextResolution = Math.round(clampNumber(
        current + delta,
        STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MIN,
        STUDIO_SOUNDCLOUD_WAVEFORM_RESOLUTION_MAX,
      ));

      if (nextResolution !== current) {
        pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
          kind: "system",
          label: "WAVE RES",
          detail: `x${nextResolution}`,
        });
      }

      return nextResolution;
    });
  }, [pushConsoleEvent]);
  const deckControls = useMemo<StudioDjControlSpec[]>(() => (
    soundCloudBooth.decks.flatMap((deck, deckIndex) => {
      const deckOffsetX = deckIndex === 0 ? -STUDIO_SOUNDCLOUD_DECK_OFFSET_X : STUDIO_SOUNDCLOUD_DECK_OFFSET_X;
      const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);
      const isBpmToolEnabled = deck.display.isWidgetReady && Boolean(deck.display.currentTrackUrl) && deck.display.playbackDuration > 0;
      const deckButtonMirror = deckIndex === 0 ? 1 : -1;
      const syncButtonX = -0.58;
      const playButtonX = -0.2;
      const muteButtonX = 0;
      const shuffleButtonX = 0.2;
      const bpmToolCenterX = -0.18 * deckButtonMirror;
      const bpmToolZ = STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_Z - STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_ROW_OFFSET_Z;
      const bpmXOffsets = [-0.18, 0, 0.18] as const;

      return [
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-play`,
          label: deck.display.isPlaying ? "Pause" : "Play",
          caption: `${deck.label} SoundCloud ${deck.display.isPlaying ? "Pause" : "Play"}`,
          position: [deckOffsetX + playButtonX * deckButtonMirror, 0.724, STUDIO_SOUNDCLOUD_DECK_BUTTON_Z] as Vec3,
          size: [0.19, 0.034, 0.095] as Vec3,
          accentColor,
          isActive: deck.display.isPlaying,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "deck",
              deckId: deck.id,
              label: deck.display.isPlaying ? "PAUSE" : "PLAY",
              detail: trimStudioSoundCloudText(deck.display.currentTrackTitle || "No Track", 30),
            });
            deck.actions.togglePlayback();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-shuffle`,
          label: "Shuf",
          caption: `${deck.label} SoundCloud Shuffle`,
          position: [deckOffsetX + shuffleButtonX * deckButtonMirror, 0.724, STUDIO_SOUNDCLOUD_DECK_BUTTON_Z] as Vec3,
          size: [0.19, 0.034, 0.095] as Vec3,
          accentColor,
          isActive: false,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "deck",
              deckId: deck.id,
              label: "SHUFFLE",
              detail: deck.display.playlistLabel,
            });
            deck.actions.shufflePlay();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-mute`,
          label: deck.isMuted ? "Open" : "Mute",
          caption: deck.isMuted ? `${deck.label} Unmute` : `${deck.label} Mute`,
          position: [deckOffsetX + muteButtonX * deckButtonMirror, 0.724, STUDIO_SOUNDCLOUD_DECK_BUTTON_Z] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_UTILITY_BUTTON_SIZE,
          accentColor: deck.isMuted ? "#f8d36a" : accentColor,
          enabled: Boolean(deck.onToggleMute),
          isActive: Boolean(deck.isMuted),
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "mixer",
              deckId: deck.id,
              label: "MUTE",
              detail: deck.isMuted ? "OFF" : "ON",
            });
            deck.onToggleMute?.();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-sync`,
          label: deck.syncLabel ?? "SYNC",
          caption: `${deck.label} ${deck.syncLabel ?? "SYNC"}`,
          position: [deckOffsetX + syncButtonX * deckButtonMirror, 0.724, STUDIO_SOUNDCLOUD_DECK_BUTTON_Z] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_UTILITY_BUTTON_SIZE,
          accentColor: deck.syncLabel === "SYNC LOW" ? "#f8d36a" : phaseVisuals.gridPrimary,
          enabled: Boolean(deck.onSyncToOtherDeck),
          isActive: deck.syncLabel === "SYNCED" || deck.syncLabel === "SYNC LOW",
          onActivate: () => {
            const resultLabel = deck.onSyncToOtherDeck?.();
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "sync",
              deckId: deck.id,
              label: "SYNC",
              detail: resultLabel || deck.syncLabel || "REQUESTED",
            });
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-bpm-meta`,
          label: "Meta",
          caption: `${deck.label} Accept Metadata BPM`,
          position: [deckOffsetX + bpmToolCenterX + bpmXOffsets[0], 0.724, bpmToolZ] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_SIZE,
          accentColor,
          enabled: isBpmToolEnabled,
          isActive: deck.display.currentTrackAcceptedBpmState.source === "meta",
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "bpm",
              deckId: deck.id,
              label: "BPM META",
              detail: deck.display.currentTrackBpm ? deck.display.currentTrackBpm.toFixed(1) : "NO META",
            });
            deck.bpmActions.acceptMetadataBpm();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-bpm-wave`,
          label: "Wave",
          caption: `${deck.label} Accept Waveform BPM`,
          position: [deckOffsetX + bpmToolCenterX + bpmXOffsets[1], 0.724, bpmToolZ] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_SIZE,
          accentColor,
          enabled: isBpmToolEnabled,
          isActive: deck.display.currentTrackAcceptedBpmState.source === "wave",
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "bpm",
              deckId: deck.id,
              label: "BPM WAVE",
              detail: deck.display.currentTrackBpmState.bpm ? deck.display.currentTrackBpmState.bpm.toFixed(1) : "NO WAVE",
            });
            deck.bpmActions.acceptWaveformBpm();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-bpm-length`,
          label: "Len",
          caption: `${deck.label} Accept Length BPM`,
          position: [deckOffsetX + bpmToolCenterX + bpmXOffsets[2], 0.724, bpmToolZ] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_SIZE,
          accentColor,
          enabled: isBpmToolEnabled,
          isActive: deck.display.currentTrackAcceptedBpmState.source === "length",
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "bpm",
              deckId: deck.id,
              label: "BPM LENGTH",
              detail: "ACCEPT",
            });
            deck.bpmActions.acceptLengthBpm();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-bpm-down`,
          label: "BPM-",
          caption: `${deck.label} BPM Down 0.1`,
          position: [deckOffsetX + bpmToolCenterX + bpmXOffsets[0], 0.724, bpmToolZ + STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_ROW_OFFSET_Z] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_SIZE,
          accentColor: phaseVisuals.timerAccent,
          enabled: isBpmToolEnabled,
          isActive: deck.display.currentTrackAcceptedBpmState.source === "manual",
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "bpm",
              deckId: deck.id,
              label: "BPM MANUAL",
              detail: "-0.1",
            });
            deck.bpmActions.adjustAcceptedBpm(-0.1);
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-bpm-up`,
          label: "BPM+",
          caption: `${deck.label} BPM Up 0.1`,
          position: [deckOffsetX + bpmToolCenterX + bpmXOffsets[1], 0.724, bpmToolZ + STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_ROW_OFFSET_Z] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_SIZE,
          accentColor: phaseVisuals.timerAccent,
          enabled: isBpmToolEnabled,
          isActive: deck.display.currentTrackAcceptedBpmState.source === "manual",
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "bpm",
              deckId: deck.id,
              label: "BPM MANUAL",
              detail: "+0.1",
            });
            deck.bpmActions.adjustAcceptedBpm(0.1);
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-bpm-clear`,
          label: "Clear",
          caption: `${deck.label} Clear BPM`,
          position: [deckOffsetX + bpmToolCenterX + bpmXOffsets[2], 0.724, bpmToolZ + STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_ROW_OFFSET_Z] as Vec3,
          size: STUDIO_SOUNDCLOUD_DECK_BPM_BUTTON_SIZE,
          accentColor: "#f8d36a",
          enabled: isBpmToolEnabled,
          isActive: deck.display.currentTrackAcceptedBpmState.source === "none",
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "bpm",
              deckId: deck.id,
              label: "BPM CLEAR",
            });
            deck.bpmActions.clearAcceptedBpm();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-volume-down`,
          label: "Vol -",
          caption: `${deck.label} Volume Down`,
          position: [deckOffsetX - STUDIO_SOUNDCLOUD_DECK_VOLUME_BUTTON_OFFSET_X, 0.724, STUDIO_SOUNDCLOUD_DECK_VOLUME_BUTTON_Z] as Vec3,
          size: [0.17, 0.032, 0.085] as Vec3,
          accentColor,
          enabled: Boolean(deck.onSetTrimPercent),
          isActive: deck.trimPercent <= 0,
          onActivate: () => {
            const nextValue = clampNumber(deck.trimPercent - STUDIO_SOUNDCLOUD_DECK_VOLUME_STEP, 0, 100);
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "mixer",
              deckId: deck.id,
              label: "TRIM",
              detail: `${Math.round(nextValue)}%`,
            });
            deck.onSetTrimPercent?.(nextValue);
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-volume-up`,
          label: "Vol +",
          caption: `${deck.label} Volume Up`,
          position: [deckOffsetX + STUDIO_SOUNDCLOUD_DECK_VOLUME_BUTTON_OFFSET_X, 0.724, STUDIO_SOUNDCLOUD_DECK_VOLUME_BUTTON_Z] as Vec3,
          size: [0.17, 0.032, 0.085] as Vec3,
          accentColor,
          enabled: Boolean(deck.onSetTrimPercent),
          isActive: deck.trimPercent >= 100,
          onActivate: () => {
            const nextValue = clampNumber(deck.trimPercent + STUDIO_SOUNDCLOUD_DECK_VOLUME_STEP, 0, 100);
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "mixer",
              deckId: deck.id,
              label: "TRIM",
              detail: `${Math.round(nextValue)}%`,
            });
            deck.onSetTrimPercent?.(nextValue);
          },
        },
      ];
    })
  ), [phaseVisuals, pushConsoleEvent, soundCloudBooth.decks]);
  const deckButtonPods = useMemo(() => (
    soundCloudBooth.decks.map((deck, deckIndex) => {
      const deckOffsetX = deckIndex === 0 ? -STUDIO_SOUNDCLOUD_DECK_OFFSET_X : STUDIO_SOUNDCLOUD_DECK_OFFSET_X;
      const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);

      return {
        id: `soundcloud-deck-${deck.id.toLowerCase()}-pod`,
          position: [deckOffsetX, STUDIO_SOUNDCLOUD_DECK_BUTTON_POD_Y, STUDIO_SOUNDCLOUD_DECK_BUTTON_Z] as Vec3,
        accentColor,
      };
    })
  ), [phaseVisuals, soundCloudBooth.decks]);
  const cueShelfBases = useMemo(() => (
    soundCloudBooth.decks.map((deck, deckIndex) => {
      const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);

      return {
        id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-shelf`,
        position: [deckIndex === 0 ? -STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X : STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X, STUDIO_SOUNDCLOUD_CUE_SHELF_Y, STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z] as Vec3,
        accentColor,
        enabled: !deck.hotCueState.activeTrackKey || deck.display.playbackDuration <= 0 || !deck.display.isWidgetReady ? false : true,
        isActive: (deck.hotCueState.isSettingCue || deck.hotCueState.isEditingCue) && Boolean(deck.hotCueState.activeTrackKey) && deck.display.playbackDuration > 0 && deck.display.isWidgetReady,
      };
    })
  ), [phaseVisuals, soundCloudBooth.decks]);
  const seekPanelBases = useMemo(() => (
    soundCloudBooth.decks.map((deck, deckIndex) => {
      const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);

      return {
        id: `soundcloud-deck-${deck.id.toLowerCase()}-seek-panel`,
        position: [deckIndex === 0 ? -STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X : STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X, STUDIO_SOUNDCLOUD_SEEK_PANEL_Y, STUDIO_SOUNDCLOUD_SEEK_PANEL_CENTER_Z] as Vec3,
        accentColor,
        enabled: Boolean(deck.hotCueState.activeTrackKey) && deck.display.playbackDuration > 0 && deck.display.isWidgetReady,
        isActive: deck.hotCueState.isEditingCue,
      };
    })
  ), [phaseVisuals, soundCloudBooth.decks]);
  const cueControls = useMemo<StudioDjControlSpec[]>(() => (
    soundCloudBooth.decks.flatMap((deck, deckIndex) => {
      const cuePanelCenterX = deckIndex === 0 ? -STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X : STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X;
      const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);
      const isCueBlocked = !deck.hotCueState.activeTrackKey || deck.display.playbackDuration <= 0 || !deck.display.isWidgetReady;
      const xOffsets = [-0.21, 0, 0.21] as const;

      return [
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-set`,
          label: "SET CUE",
          caption: getSoundCloudCueSetCaption(deck),
          position: [cuePanelCenterX + xOffsets[0], STUDIO_SOUNDCLOUD_CUE_CONTROL_Y, STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z - STUDIO_SOUNDCLOUD_CUE_SHELF_ROW_Z_OFFSET] as Vec3,
          size: STUDIO_SOUNDCLOUD_CUE_SET_BUTTON_SIZE,
          accentColor,
          enabled: !isCueBlocked,
          isActive: deck.hotCueState.isSettingCue && !isCueBlocked,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "cue",
              deckId: deck.id,
              label: "CUE SET",
              detail: deck.hotCueState.isSettingCue ? "OFF" : "ON",
            });
            deck.hotCueActions.toggleSetCueMode();
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-c1`,
          label: "C1",
          caption: getSoundCloudCuePadCaption(deck, deck.hotCueState.cues[0]),
          captionFontSize: 44,
          position: [cuePanelCenterX + xOffsets[1], STUDIO_SOUNDCLOUD_CUE_CONTROL_Y, STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z - STUDIO_SOUNDCLOUD_CUE_SHELF_ROW_Z_OFFSET] as Vec3,
          size: STUDIO_SOUNDCLOUD_CUE_BUTTON_SIZE,
          accentColor,
          enabled: !isCueBlocked,
          isActive: (deck.hotCueState.isEditingCue ? deck.hotCueState.selectedCueId === deck.hotCueState.cues[0].id : deck.hotCueState.cues[0].isValid) && !isCueBlocked,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "cue",
              deckId: deck.id,
              label: deck.hotCueState.isEditingCue ? "CUE EDIT" : deck.hotCueState.isSettingCue ? "CUE SET" : "CUE TRIGGER",
              detail: deck.hotCueState.cues[0].id,
            });
            deck.hotCueActions.triggerCue(deck.hotCueState.cues[0].id);
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-c2`,
          label: "C2",
          caption: getSoundCloudCuePadCaption(deck, deck.hotCueState.cues[1]),
          captionFontSize: 44,
          position: [cuePanelCenterX + xOffsets[2], STUDIO_SOUNDCLOUD_CUE_CONTROL_Y, STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z - STUDIO_SOUNDCLOUD_CUE_SHELF_ROW_Z_OFFSET] as Vec3,
          size: STUDIO_SOUNDCLOUD_CUE_BUTTON_SIZE,
          accentColor,
          enabled: !isCueBlocked,
          isActive: (deck.hotCueState.isEditingCue ? deck.hotCueState.selectedCueId === deck.hotCueState.cues[1].id : deck.hotCueState.cues[1].isValid) && !isCueBlocked,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "cue",
              deckId: deck.id,
              label: deck.hotCueState.isEditingCue ? "CUE EDIT" : deck.hotCueState.isSettingCue ? "CUE SET" : "CUE TRIGGER",
              detail: deck.hotCueState.cues[1].id,
            });
            deck.hotCueActions.triggerCue(deck.hotCueState.cues[1].id);
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-c3`,
          label: "C3",
          caption: getSoundCloudCuePadCaption(deck, deck.hotCueState.cues[2]),
          captionFontSize: 44,
          position: [cuePanelCenterX + xOffsets[0], STUDIO_SOUNDCLOUD_CUE_CONTROL_Y, STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z + STUDIO_SOUNDCLOUD_CUE_SHELF_ROW_Z_OFFSET] as Vec3,
          size: STUDIO_SOUNDCLOUD_CUE_BUTTON_SIZE,
          accentColor,
          enabled: !isCueBlocked,
          isActive: (deck.hotCueState.isEditingCue ? deck.hotCueState.selectedCueId === deck.hotCueState.cues[2].id : deck.hotCueState.cues[2].isValid) && !isCueBlocked,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "cue",
              deckId: deck.id,
              label: deck.hotCueState.isEditingCue ? "CUE EDIT" : deck.hotCueState.isSettingCue ? "CUE SET" : "CUE TRIGGER",
              detail: deck.hotCueState.cues[2].id,
            });
            deck.hotCueActions.triggerCue(deck.hotCueState.cues[2].id);
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-c4`,
          label: "C4",
          caption: getSoundCloudCuePadCaption(deck, deck.hotCueState.cues[3]),
          captionFontSize: 44,
          position: [cuePanelCenterX + xOffsets[1], STUDIO_SOUNDCLOUD_CUE_CONTROL_Y, STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z + STUDIO_SOUNDCLOUD_CUE_SHELF_ROW_Z_OFFSET] as Vec3,
          size: STUDIO_SOUNDCLOUD_CUE_BUTTON_SIZE,
          accentColor,
          enabled: !isCueBlocked,
          isActive: (deck.hotCueState.isEditingCue ? deck.hotCueState.selectedCueId === deck.hotCueState.cues[3].id : deck.hotCueState.cues[3].isValid) && !isCueBlocked,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "cue",
              deckId: deck.id,
              label: deck.hotCueState.isEditingCue ? "CUE EDIT" : deck.hotCueState.isSettingCue ? "CUE SET" : "CUE TRIGGER",
              detail: deck.hotCueState.cues[3].id,
            });
            deck.hotCueActions.triggerCue(deck.hotCueState.cues[3].id);
          },
        },
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-c5`,
          label: "C5",
          caption: getSoundCloudCuePadCaption(deck, deck.hotCueState.cues[4]),
          captionFontSize: 44,
          position: [cuePanelCenterX + xOffsets[2], STUDIO_SOUNDCLOUD_CUE_CONTROL_Y, STUDIO_SOUNDCLOUD_CUE_SHELF_CENTER_Z + STUDIO_SOUNDCLOUD_CUE_SHELF_ROW_Z_OFFSET] as Vec3,
          size: STUDIO_SOUNDCLOUD_CUE_BUTTON_SIZE,
          accentColor,
          enabled: !isCueBlocked,
          isActive: (deck.hotCueState.isEditingCue ? deck.hotCueState.selectedCueId === deck.hotCueState.cues[4].id : deck.hotCueState.cues[4].isValid) && !isCueBlocked,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "cue",
              deckId: deck.id,
              label: deck.hotCueState.isEditingCue ? "CUE EDIT" : deck.hotCueState.isSettingCue ? "CUE SET" : "CUE TRIGGER",
              detail: deck.hotCueState.cues[4].id,
            });
            deck.hotCueActions.triggerCue(deck.hotCueState.cues[4].id);
          },
        },
      ];
    })
  ), [phaseVisuals, pushConsoleEvent, soundCloudBooth.decks]);
  const seekControls = useMemo<StudioDjControlSpec[]>(() => (
    soundCloudBooth.decks.flatMap((deck, deckIndex) => {
      const panelCenterX = deckIndex === 0 ? -STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X : STUDIO_SOUNDCLOUD_SEEK_PANEL_OFFSET_X;
      const accentColor = getSoundCloudDeckAccent(deck, phaseVisuals);
      const isSeekBlocked = !deck.hotCueState.activeTrackKey || deck.display.playbackDuration <= 0 || !deck.display.isWidgetReady;
      const xOffsets = [-0.24, -0.12, 0, 0.12, 0.24] as const;
      const stepControls = STUDIO_SOUNDCLOUD_SEEK_STEPS.flatMap((step, stepIndex) => {
        const label = formatSoundCloudSeekStepLabel(step);
        const reverseDelta = -step;
        const forwardDelta = step;
        const canNudgeCue = !deck.hotCueState.isEditingCue || Boolean(deck.hotCueState.selectedCueId);

        return [
          {
            id: `soundcloud-deck-${deck.id.toLowerCase()}-seek-rev-${label}`,
            label: `-${label}`,
            caption: getSoundCloudSeekCaption(deck, reverseDelta),
            position: [panelCenterX + xOffsets[stepIndex], STUDIO_SOUNDCLOUD_SEEK_CONTROL_Y, STUDIO_SOUNDCLOUD_SEEK_PANEL_CENTER_Z - 0.044] as Vec3,
            size: STUDIO_SOUNDCLOUD_SEEK_BUTTON_SIZE,
            accentColor,
            enabled: !isSeekBlocked && canNudgeCue,
            isActive: false,
            onActivate: () => {
              if (deck.hotCueState.isEditingCue) {
                pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
                  kind: "cue",
                  deckId: deck.id,
                  label: "CUE NUDGE",
                  detail: `${deck.hotCueState.selectedCueId ?? "SELECT"} ${formatSoundCloudSeekStepLabel(reverseDelta)}S BACK`,
                });
                deck.hotCueActions.nudgeSelectedCue(reverseDelta);
                return;
              }

              pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
                kind: "seek",
                deckId: deck.id,
                label: "SEEK BACK",
                detail: `${formatSoundCloudSeekStepLabel(reverseDelta)}S`,
              });
              deck.seekActions.seekBy(reverseDelta);
            },
          },
          {
            id: `soundcloud-deck-${deck.id.toLowerCase()}-seek-fwd-${label}`,
            label: `+${label}`,
            caption: getSoundCloudSeekCaption(deck, forwardDelta),
            position: [panelCenterX + xOffsets[stepIndex], STUDIO_SOUNDCLOUD_SEEK_CONTROL_Y, STUDIO_SOUNDCLOUD_SEEK_PANEL_CENTER_Z + 0.044] as Vec3,
            size: STUDIO_SOUNDCLOUD_SEEK_BUTTON_SIZE,
            accentColor,
            enabled: !isSeekBlocked && canNudgeCue,
            isActive: false,
            onActivate: () => {
              if (deck.hotCueState.isEditingCue) {
                pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
                  kind: "cue",
                  deckId: deck.id,
                  label: "CUE NUDGE",
                  detail: `${deck.hotCueState.selectedCueId ?? "SELECT"} +${formatSoundCloudSeekStepLabel(forwardDelta)}S`,
                });
                deck.hotCueActions.nudgeSelectedCue(forwardDelta);
                return;
              }

              pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
                kind: "seek",
                deckId: deck.id,
                label: "SEEK FWD",
                detail: `+${formatSoundCloudSeekStepLabel(forwardDelta)}S`,
              });
              deck.seekActions.seekBy(forwardDelta);
            },
          },
        ];
      });

      return [
        {
          id: `soundcloud-deck-${deck.id.toLowerCase()}-cue-edit`,
          label: deck.hotCueState.isEditingCue ? "Edit On" : "Edit",
          caption: getSoundCloudCueEditCaption(deck),
          position: [panelCenterX, STUDIO_SOUNDCLOUD_SEEK_CONTROL_Y, STUDIO_SOUNDCLOUD_SEEK_PANEL_CENTER_Z - 0.13] as Vec3,
          size: STUDIO_SOUNDCLOUD_SEEK_EDIT_BUTTON_SIZE,
          accentColor,
          enabled: !isSeekBlocked,
          isActive: deck.hotCueState.isEditingCue && !isSeekBlocked,
          onActivate: () => {
            pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
              kind: "cue",
              deckId: deck.id,
              label: "CUE EDIT",
              detail: deck.hotCueState.isEditingCue ? "OFF" : "ON",
            });
            deck.hotCueActions.toggleEditCueMode();
          },
        },
        ...stepControls,
      ];
    })
  ), [phaseVisuals, pushConsoleEvent, soundCloudBooth.decks]);
  const crossfaderControls = useMemo<StudioDjControlSpec[]>(() => [
    {
      id: "soundcloud-crossfader-a",
      label: "A",
      caption: "SoundCloud Crossfader A",
      position: [-STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_OFFSET_X, STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Y, STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Z],
      size: STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_SIZE,
      accentColor: phaseVisuals.gridPrimary,
      isActive: soundCloudBooth.mixer.crossfader <= -0.5,
      onActivate: () => {
        pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
          kind: "mixer",
          label: "XFADE",
          detail: "A",
        });
        soundCloudBooth.mixer.onSetCrossfader?.(-1);
      },
    },
    {
      id: "soundcloud-crossfader-mid",
      label: "Mid",
      caption: "SoundCloud Crossfader Mid",
      position: [0, STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Y, STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Z],
      size: STUDIO_SOUNDCLOUD_CROSSFADER_MID_BUTTON_SIZE,
      accentColor: phaseVisuals.gridSecondary,
      isActive: Math.abs(soundCloudBooth.mixer.crossfader) < 0.5,
      onActivate: () => {
        pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
          kind: "mixer",
          label: "XFADE",
          detail: "MID",
        });
        soundCloudBooth.mixer.onSetCrossfader?.(0);
      },
    },
    {
      id: "soundcloud-crossfader-b",
      label: "B",
      caption: "SoundCloud Crossfader B",
      position: [STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_OFFSET_X, STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Y, STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_Z],
      size: STUDIO_SOUNDCLOUD_CROSSFADER_BUTTON_SIZE,
      accentColor: phaseVisuals.timerAccent,
      isActive: soundCloudBooth.mixer.crossfader >= 0.5,
      onActivate: () => {
        pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
          kind: "mixer",
          label: "XFADE",
          detail: "B",
        });
        soundCloudBooth.mixer.onSetCrossfader?.(1);
      },
    },
  ], [
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
    soundCloudBooth.mixer,
    pushConsoleEvent,
  ]);
  return (
    <group position={STUDIO_SOUNDCLOUD_DJ_POSITION} rotation={STUDIO_SOUNDCLOUD_DJ_ROTATION}>
      <mesh position={[0, 0.63, 0]}>
        <boxGeometry args={STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE} />
        <meshBasicMaterial args={[{ color: "#a336d6", transparent: true, opacity: 0.22, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.315, 0]}>
        <boxGeometry args={[STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[0] + STUDIO_SOUNDCLOUD_TABLE_EDGE_THICKNESS * 2, STUDIO_SOUNDCLOUD_TABLE_EDGE_HEIGHT, STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[2] + STUDIO_SOUNDCLOUD_TABLE_EDGE_THICKNESS * 2]} />
        <meshStandardMaterial args={[{ color: "#5b1c73", emissive: "#f64fff", emissiveIntensity: 0.09, roughness: 0.76, metalness: 0.04 }]} />
      </mesh>
      {[
        [-STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_X, -STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_Z],
        [STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_X, -STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_Z],
        [-STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_X, STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_Z],
        [STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_X, STUDIO_SOUNDCLOUD_TABLE_LEG_INSET_Z],
      ].map(([x, z]) => (
        <mesh key={`soundcloud-table-leg-${x}-${z}`} position={[x, 0.13, z]}>
          <boxGeometry args={STUDIO_SOUNDCLOUD_TABLE_LEG_SIZE} />
          <meshStandardMaterial args={[{ color: "#1a1330", emissive: "#0c0716", emissiveIntensity: 0.12, roughness: 0.88, metalness: 0.02 }]} />
        </mesh>
      ))}
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[0] - 0.1, 0.014, STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[2] - 0.1]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary, transparent: true, opacity: 0.06, toneMapped: false }]} />
      </mesh>
      <mesh position={[STUDIO_SOUNDCLOUD_STATION_GRID.leftX, 0.448, STUDIO_SOUNDCLOUD_STATION_GRID.backZ]}>
        <boxGeometry args={[0.08, 0.006, STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[2] - 0.24]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary, transparent: true, opacity: 0.07, toneMapped: false }]} />
      </mesh>
      <mesh position={[STUDIO_SOUNDCLOUD_STATION_GRID.rightX, 0.448, STUDIO_SOUNDCLOUD_STATION_GRID.backZ]}>
        <boxGeometry args={[0.08, 0.006, STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[2] - 0.24]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary, transparent: true, opacity: 0.07, toneMapped: false }]} />
      </mesh>
      <mesh position={[STUDIO_SOUNDCLOUD_STATION_GRID.centerX, 0.448, STUDIO_SOUNDCLOUD_STATION_GRID.midZ]}>
        <boxGeometry args={[STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[0] - 0.36, 0.006, 0.08]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary, transparent: true, opacity: 0.05, toneMapped: false }]} />
      </mesh>
      <mesh position={[STUDIO_SOUNDCLOUD_STATION_GRID.centerX, 0.448, STUDIO_SOUNDCLOUD_STATION_GRID.frontZ]}>
        <boxGeometry args={[STUDIO_SOUNDCLOUD_TABLE_SURFACE_SIZE[0] - 0.52, 0.006, 0.08]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent, transparent: true, opacity: 0.04, toneMapped: false }]} />
      </mesh>
      <StudioSoundCloudDeckMonitor
        consoleEvents={soundCloudBooth.consoleEvents}
        deckA={deckA}
        deckB={deckB}
        mixer={soundCloudBooth.mixer}
        onDecreaseWaveformResolution={() => setSoundCloudWaveformResolution(-1)}
        onIncreaseWaveformResolution={() => setSoundCloudWaveformResolution(1)}
        onPushConsoleEvent={soundCloudBooth.onPushConsoleEvent}
        phaseVisuals={phaseVisuals}
        waveformResolution={waveformResolution}
      />
      <mesh position={[0, 0.652, -0.24]}>
        <boxGeometry args={[0.44, 0.018, 0.84]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary, transparent: true, opacity: 0.08, toneMapped: false }]} />
      </mesh>
      {cueShelfBases.map((shelf) => (
        <mesh key={shelf.id} position={shelf.position}>
          <boxGeometry args={STUDIO_SOUNDCLOUD_CUE_SHELF_SIZE} />
          <meshBasicMaterial args={[{ color: shelf.accentColor, transparent: true, opacity: shelf.enabled ? (shelf.isActive ? 0.13 : 0.08) : 0.04, toneMapped: false }]} />
        </mesh>
      ))}
      {seekPanelBases.map((panel) => (
        <mesh key={panel.id} position={panel.position}>
          <boxGeometry args={STUDIO_SOUNDCLOUD_SEEK_PANEL_SIZE} />
          <meshBasicMaterial args={[{ color: panel.accentColor, transparent: true, opacity: panel.enabled ? (panel.isActive ? 0.14 : 0.07) : 0.035, toneMapped: false }]} />
        </mesh>
      ))}
      <StudioSoundCloudDeckPanel deck={deckA} onPushConsoleEvent={soundCloudBooth.onPushConsoleEvent} phaseVisuals={phaseVisuals} position={[-STUDIO_SOUNDCLOUD_DECK_OFFSET_X, 0, STUDIO_SOUNDCLOUD_DECK_Z]} />
      <StudioSoundCloudDeckPanel deck={deckB} onPushConsoleEvent={soundCloudBooth.onPushConsoleEvent} phaseVisuals={phaseVisuals} position={[STUDIO_SOUNDCLOUD_DECK_OFFSET_X, 0, STUDIO_SOUNDCLOUD_DECK_Z]} />
      {soundCloudBooth.decks.map((deck, deckIndex) => {
        const deckOffsetX = deckIndex === 0 ? -STUDIO_SOUNDCLOUD_DECK_OFFSET_X : STUDIO_SOUNDCLOUD_DECK_OFFSET_X;
        const trimDragId = `studio-dj-soundcloud-deck-${deck.id.toLowerCase()}-trim-drag`;

        return (
          <StudioSoundCloudDragFader
            key={trimDragId}
            accentColor={activeDragId === trimDragId ? phaseVisuals.gridPrimary : getSoundCloudDeckAccent(deck, phaseVisuals)}
            id={trimDragId}
            label={`Hold Drag ${deck.label} Trim`}
            max={100}
            min={0}
            onChange={deck.onSetTrimPercent}
            onCommit={(value) => {
              pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
                kind: "mixer",
                deckId: deck.id,
                label: "TRIM",
                detail: `${Math.round(value)}%`,
              });
            }}
            position={[deckOffsetX, 0.753, STUDIO_SOUNDCLOUD_DECK_Z + STUDIO_SOUNDCLOUD_DECK_TRIM_FADER_Z]}
            railSize={STUDIO_SOUNDCLOUD_DECK_TRIM_FADER_SIZE}
            sensitivity={STUDIO_SOUNDCLOUD_VOLUME_DRAG_SENSITIVITY}
            value={deck.trimPercent}
          />
        );
      })}
      <StudioSoundCloudCrateBrowser
        deck={deckB}
        onPushConsoleEvent={soundCloudBooth.onPushConsoleEvent}
        onSetScrollOffset={handleSetCrateScrollOffset}
        phaseVisuals={phaseVisuals}
        position={[STUDIO_SOUNDCLOUD_CRATE_SCREEN_X, STUDIO_SOUNDCLOUD_CRATE_SCREEN_Y, STUDIO_SOUNDCLOUD_CRATE_SCREEN_Z]}
        scrollOffset={crateScrollOffsets.B}
      />
      {deckButtonPods.map((pod) => (
        <mesh key={pod.id} position={pod.position}>
          <boxGeometry args={[0.56, 0.015, 0.18]} />
          <meshBasicMaterial args={[{ color: pod.accentColor, transparent: true, opacity: 0.06, toneMapped: false }]} />
        </mesh>
      ))}
      <StudioSoundCloudDragFader
        accentColor={isCrossfaderGrabbed ? phaseVisuals.gridPrimary : phaseVisuals.gridSecondary}
        id="studio-dj-soundcloud-crossfader-drag"
        label="Hold Drag SoundCloud Crossfader"
        max={1}
        min={-1}
        onChange={soundCloudBooth.mixer.onSetCrossfader}
        onCommit={(value) => {
          pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
            kind: "mixer",
            label: "XFADE",
            detail: getSoundCloudCrossfaderLabel(value),
          });
        }}
        position={STUDIO_SOUNDCLOUD_CROSSFADER_RAIL_POSITION}
        railSize={STUDIO_SOUNDCLOUD_UPPER_FADER_RAIL_SIZE}
        sensitivity={STUDIO_SOUNDCLOUD_CROSSFADER_DRAG_SENSITIVITY}
        value={soundCloudBooth.mixer.crossfader}
      />
      {Array.from({ length: STUDIO_SOUNDCLOUD_UPPER_FADER_TICK_COUNT }, (_, index) => {
        const x = -0.3 + index * 0.1;

        return (
          <mesh key={`soundcloud-upper-fader-tick-${index}`} position={[x, STUDIO_SOUNDCLOUD_CROSSFADER_RAIL_POSITION[1] + 0.016, STUDIO_SOUNDCLOUD_CROSSFADER_RAIL_POSITION[2]]}>
            <boxGeometry args={[0.01, index % 2 === 0 ? 0.034 : 0.022, 0.012]} />
            <meshBasicMaterial args={[{ color: index === 3 ? phaseVisuals.gridPrimary : "#a9bdc9", transparent: true, opacity: index === 3 ? 0.68 : 0.3, toneMapped: false }]} />
          </mesh>
        );
      })}
      <mesh position={STUDIO_SOUNDCLOUD_LOWER_RAIL_POSITION}>
        <boxGeometry args={STUDIO_SOUNDCLOUD_LOWER_RAIL_SIZE} />
        <meshBasicMaterial args={[{ color: "#6f86a3", transparent: true, opacity: 0.2, toneMapped: false }]} />
      </mesh>
      <StudioSoundCloudDragFader
        accentColor={isMasterGrabbed ? phaseVisuals.timerAccent : phaseVisuals.gridSecondary}
        id="studio-dj-soundcloud-master-drag"
        label="Hold Drag SoundCloud Master"
        max={100}
        min={0}
        onChange={soundCloudBooth.mixer.onSetMasterVolume}
        onCommit={(value) => {
          pushSoundCloudBoothConsoleEvent(pushConsoleEvent, {
            kind: "mixer",
            label: "MASTER",
            detail: `${Math.round(value)}%`,
          });
        }}
        position={[0, STUDIO_SOUNDCLOUD_LOWER_RAIL_POSITION[1] + 0.016, STUDIO_SOUNDCLOUD_LOWER_RAIL_POSITION[2]]}
        railSize={[0.5, 0.014, 0.034]}
        sensitivity={STUDIO_SOUNDCLOUD_VOLUME_DRAG_SENSITIVITY}
        value={soundCloudBooth.mixer.masterVolume}
      />
      {deckControls.map((control) => (
        <StudioDjControl key={control.id} control={control} />
      ))}
      {cueControls.map((control) => (
        <StudioDjControl key={control.id} control={control} />
      ))}
      {seekControls.map((control) => (
        <StudioDjControl key={control.id} control={control} />
      ))}
      {crossfaderControls.map((control) => (
        <StudioDjControl key={control.id} control={control} />
      ))}
    </group>
  );
}

function StudioDjDeckPanel({
  deck,
  isSelected,
  noteCount,
  phaseVisuals,
  position,
  source,
}: {
  deck: LocalDawDjDeckState;
  isSelected: boolean;
  noteCount: number;
  phaseVisuals: PhaseVisuals;
  position: Vec3;
  source?: LocalDawDjDeckSource;
}) {
  const accentColor = getDjDeckAccent(deck, phaseVisuals);

  return (
    <group position={position}>
      <mesh position={[0, 0.63, 0]}>
        <boxGeometry args={[0.54, 0.026, 0.5]} />
        <meshStandardMaterial args={[{ color: "#08111f", emissive: accentColor, emissiveIntensity: isSelected ? 0.16 : 0.06, roughness: 0.72, metalness: 0.06 }]} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.028, 32]} />
        <meshStandardMaterial args={[{ color: "#111b2d", emissive: accentColor, emissiveIntensity: deck.visualState === "playing" ? 0.22 : 0.08, roughness: 0.52, metalness: 0.12 }]} />
      </mesh>
      <mesh position={[0, 0.682, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.02, 24]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: deck.visualState === "empty" ? 0.22 : 0.58, toneMapped: false }]} />
      </mesh>
      <StudioPianoVisualControl
        accentColor={accentColor}
        caption={source ? `LOCAL CLIP ${noteCount} NOTES` : "SOURCE ONLY"}
        isActive={isSelected}
        label={getDjSourceDeckLabel(deck, source)}
        position={[0, 0.705, -0.22]}
        size={[0.42, 0.03, 0.095]}
      />
    </group>
  );
}

function StudioDjStatusDisplay({
  crossfader,
  decks,
  phaseVisuals,
  sourceLabels,
}: {
  crossfader: number;
  decks: LocalDawDjDeckState[];
  phaseVisuals: PhaseVisuals;
  sourceLabels: { deckA: string; deckB: string };
}) {
  const deckA = decks.find((deck) => deck.id === "A");
  const deckB = decks.find((deck) => deck.id === "B");
  const crossfaderLabel = crossfader <= -0.5 ? "XF A" : crossfader >= 0.5 ? "XF B" : "XF MID";
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: phaseVisuals.gridSecondary,
    caption: `${crossfaderLabel} A ${sourceLabels.deckA} B ${sourceLabels.deckB}`,
    isActive: true,
    label: "SOURCE ONLY",
  }), [crossfaderLabel, phaseVisuals.gridSecondary, sourceLabels.deckA, sourceLabels.deckB]);

  return (
    <mesh position={[0, 0.735, -0.34]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.86, 0.2]} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.62, toneMapped: false }]}>
        <canvasTexture key={`studio-dj-status-${crossfaderLabel}-${deckA?.visualState}-${deckB?.visualState}-${sourceLabels.deckA}-${sourceLabels.deckB}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function StudioDjControls({
  localDawActions,
  localDawState,
  phaseVisuals,
}: {
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const djState = localDawState?.dj;
  const deckA = djState?.decks.find((deck) => deck.id === "A");
  const deckB = djState?.decks.find((deck) => deck.id === "B");
  const deckASource = djState?.sources.find((source) => source.id === deckA?.sourceId);
  const deckBSource = djState?.sources.find((source) => source.id === deckB?.sourceId);
  const deckASourceNoteCount = localDawState?.midiNotes.filter((note) => note.clipId === deckASource?.clipId).length ?? 0;
  const deckBSourceNoteCount = localDawState?.midiNotes.filter((note) => note.clipId === deckBSource?.clipId).length ?? 0;
  const sourceLabels = useMemo(() => ({
    deckA: getDjSourceStatusLabel(deckASource),
    deckB: getDjSourceStatusLabel(deckBSource),
  }), [deckASource, deckBSource]);
  const deckControls = useMemo<StudioDjControlSpec[]>(() => {
    if (!djState) {
      return [];
    }

    return djState.decks.flatMap((deck, deckIndex) => {
      const deckOffsetX = deckIndex === 0 ? -0.38 : 0.38;
      const accentColor = getDjDeckAccent(deck, phaseVisuals);

      return [
        {
          id: `deck-${deck.id.toLowerCase()}-cue`,
          label: "Cue",
          caption: `Deck ${deck.id} Cue`,
          position: [deckOffsetX - 0.14, 0.722, 0.27] as Vec3,
          size: [0.2, 0.032, 0.095] as Vec3,
          accentColor,
          isActive: deck.visualState === "cued",
          onActivate: () => {
            localDawActions?.toggleDjDeckCue(deck.id);
          },
        },
        {
          id: `deck-${deck.id.toLowerCase()}-play`,
          label: "Play",
          caption: `Deck ${deck.id} Play`,
          position: [deckOffsetX + 0.14, 0.722, 0.27] as Vec3,
          size: [0.2, 0.032, 0.095] as Vec3,
          accentColor,
          isActive: deck.visualState === "playing",
          onActivate: () => {
            localDawActions?.toggleDjDeckPlay(deck.id);
          },
        },
      ];
    });
  }, [djState, localDawActions, phaseVisuals]);
  const sourceControls = useMemo<StudioDjControlSpec[]>(() => {
    if (!djState) {
      return [];
    }

    return djState.decks.flatMap((deck, deckIndex) => {
      const deckOffsetX = deckIndex === 0 ? -0.38 : 0.38;
      const accentColor = getDjDeckAccent(deck, phaseVisuals);

      return [
        {
          id: `deck-${deck.id.toLowerCase()}-source-prev`,
          label: "Prev",
          caption: `Deck ${deck.id} Source Prev`,
          position: [deckOffsetX - 0.19, 0.722, -0.31] as Vec3,
          size: [0.14, 0.03, 0.085] as Vec3,
          accentColor,
          isActive: false,
          onActivate: () => {
            localDawActions?.cycleDjDeckSource(deck.id, -1);
          },
        },
        {
          id: `deck-${deck.id.toLowerCase()}-source-next`,
          label: "Next",
          caption: `Deck ${deck.id} Source Next`,
          position: [deckOffsetX, 0.722, -0.31] as Vec3,
          size: [0.15, 0.03, 0.085] as Vec3,
          accentColor,
          isActive: Boolean(deck.sourceId),
          onActivate: () => {
            localDawActions?.cycleDjDeckSource(deck.id, 1);
          },
        },
        {
          id: `deck-${deck.id.toLowerCase()}-source-clear`,
          label: "Clear",
          caption: `Deck ${deck.id} Source Clear`,
          position: [deckOffsetX + 0.19, 0.722, -0.31] as Vec3,
          size: [0.16, 0.03, 0.085] as Vec3,
          accentColor,
          isActive: false,
          onActivate: () => {
            localDawActions?.clearDjDeckSource(deck.id);
          },
        },
      ];
    });
  }, [djState, localDawActions, phaseVisuals]);
  const crossfaderControls = useMemo<StudioDjControlSpec[]>(() => [
    {
      id: "crossfader-a",
      label: "A",
      caption: "Crossfader A",
      position: [-0.3, 0.724, -0.04],
      size: [0.2, 0.032, 0.09],
      accentColor: phaseVisuals.gridPrimary,
      isActive: (djState?.crossfader ?? 0) <= -0.5,
      onActivate: () => {
        localDawActions?.setDjCrossfader(-1);
      },
    },
    {
      id: "crossfader-mid",
      label: "Mid",
      caption: "Crossfader Mid",
      position: [0, 0.724, -0.04],
      size: [0.22, 0.032, 0.09],
      accentColor: phaseVisuals.gridSecondary,
      isActive: Math.abs(djState?.crossfader ?? 0) < 0.5,
      onActivate: () => {
        localDawActions?.setDjCrossfader(0);
      },
    },
    {
      id: "crossfader-b",
      label: "B",
      caption: "Crossfader B",
      position: [0.3, 0.724, -0.04],
      size: [0.2, 0.032, 0.09],
      accentColor: phaseVisuals.timerAccent,
      isActive: (djState?.crossfader ?? 0) >= 0.5,
      onActivate: () => {
        localDawActions?.setDjCrossfader(1);
      },
    },
  ], [djState?.crossfader, localDawActions, phaseVisuals.gridPrimary, phaseVisuals.gridSecondary, phaseVisuals.timerAccent]);

  if (!djState || !deckA || !deckB || !localDawActions) {
    return null;
  }

  return (
    <group position={[-12.0, 0, -1.2]} rotation={[0, -0.55, 0]}>
      <mesh position={[0, 0.63, 0]}>
        <boxGeometry args={[1.34, 0.02, 0.78]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent, transparent: true, opacity: 0.075, toneMapped: false }]} />
      </mesh>
      <StudioDjDeckPanel deck={deckA} isSelected={djState.selectedDeckId === "A"} noteCount={deckASourceNoteCount} phaseVisuals={phaseVisuals} position={[-0.38, 0, 0.02]} source={deckASource} />
      <StudioDjDeckPanel deck={deckB} isSelected={djState.selectedDeckId === "B"} noteCount={deckBSourceNoteCount} phaseVisuals={phaseVisuals} position={[0.38, 0, 0.02]} source={deckBSource} />
      <mesh position={[0, 0.696, -0.15]}>
        <boxGeometry args={[0.78, 0.018, 0.035]} />
        <meshBasicMaterial args={[{ color: "#6f86a3", transparent: true, opacity: 0.32, toneMapped: false }]} />
      </mesh>
      <mesh position={[djState.crossfader * 0.32, 0.711, -0.15]}>
        <boxGeometry args={[0.1, 0.035, 0.07]} />
        <meshBasicMaterial args={[{ color: "#e9fbff", transparent: true, opacity: 0.62, toneMapped: false }]} />
      </mesh>
      {deckControls.map((control) => (
        <StudioDjControl key={control.id} control={control} />
      ))}
      {sourceControls.map((control) => (
        <StudioDjControl key={control.id} control={control} />
      ))}
      {crossfaderControls.map((control) => (
        <StudioDjControl key={control.id} control={control} />
      ))}
      <StudioDjStatusDisplay crossfader={djState.crossfader} decks={djState.decks} phaseVisuals={phaseVisuals} sourceLabels={sourceLabels} />
    </group>
  );
}

function StudioTransportControls({
  localDawActions,
  localDawState,
  phaseVisuals,
  sharedDawTransport,
  canControlSharedDawTransport = true,
  onSetSharedDawTempo,
  onPlaySharedDawTransport,
  onStopSharedDawTransport,
}: {
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
  sharedDawTransport?: SharedDawTransport;
  canControlSharedDawTransport?: boolean;
  onSetSharedDawTempo?: (bpm: number) => void;
  onPlaySharedDawTransport?: () => void;
  onStopSharedDawTransport?: () => void;
}) {
  const isSharedTransportEnabled = Boolean(sharedDawTransport && onSetSharedDawTempo && onPlaySharedDawTransport && onStopSharedDawTransport);
  const transportBpm = sharedDawTransport?.bpm ?? localDawState?.transport.bpm ?? 120;
  const isPlaying = sharedDawTransport ? sharedDawTransport.state === "playing" : localDawState?.transport.state === "playing";
  const canActivateTransport = isSharedTransportEnabled ? canControlSharedDawTransport : Boolean(localDawActions);
  const disabledCaption = "Host Only";
  const transportScopeLabel = isSharedTransportEnabled ? "Shared" : "Local";
  const handlePlayStop = useCallback(() => {
    if (isSharedTransportEnabled) {
      if (!canControlSharedDawTransport) {
        return;
      }

      if (isPlaying) {
        onStopSharedDawTransport?.();
        return;
      }

      onPlaySharedDawTransport?.();
      return;
    }

    if (!localDawActions) {
      return;
    }

    if (isPlaying) {
      localDawActions.stopTransport();
      return;
    }

    localDawActions.toggleTransport();
  }, [canControlSharedDawTransport, isPlaying, isSharedTransportEnabled, localDawActions, onPlaySharedDawTransport, onStopSharedDawTransport]);
  const handleTempoDown = useCallback(() => {
    if (isSharedTransportEnabled) {
      if (canControlSharedDawTransport) {
        onSetSharedDawTempo?.(transportBpm - 1);
      }

      return;
    }

    localDawActions?.adjustTempo(-1);
  }, [canControlSharedDawTransport, isSharedTransportEnabled, localDawActions, onSetSharedDawTempo, transportBpm]);
  const handleTempoUp = useCallback(() => {
    if (isSharedTransportEnabled) {
      if (canControlSharedDawTransport) {
        onSetSharedDawTempo?.(transportBpm + 1);
      }

      return;
    }

    localDawActions?.adjustTempo(1);
  }, [canControlSharedDawTransport, isSharedTransportEnabled, localDawActions, onSetSharedDawTempo, transportBpm]);
  const controls = useMemo<StudioTransportControlSpec[]>(() => [
    {
      id: "play-stop",
      label: isPlaying ? "Stop" : "Play",
      caption: canActivateTransport ? (isPlaying ? `Stop ${transportScopeLabel} Transport` : `Play ${transportScopeLabel} Transport`) : disabledCaption,
      position: [0, 0.748, -0.09],
      size: [0.58, 0.06, 0.27],
      accentColor: isPlaying ? phaseVisuals.timerAccent : phaseVisuals.gridPrimary,
      isActive: isPlaying,
      isEnabled: canActivateTransport,
      onActivate: handlePlayStop,
    },
    {
      id: "tempo-down",
      label: "- BPM",
      caption: canActivateTransport ? `Tempo Down ${transportBpm}` : disabledCaption,
      position: [-0.53, 0.742, 0.22],
      size: [0.38, 0.055, 0.22],
      accentColor: phaseVisuals.gridSecondary,
      isEnabled: canActivateTransport,
      onActivate: handleTempoDown,
    },
    {
      id: "tempo-up",
      label: "+ BPM",
      caption: canActivateTransport ? `Tempo Up ${transportBpm}` : disabledCaption,
      position: [0.53, 0.742, 0.22],
      size: [0.38, 0.055, 0.22],
      accentColor: phaseVisuals.gridSecondary,
      isEnabled: canActivateTransport,
      onActivate: handleTempoUp,
    },
  ], [
    canActivateTransport,
    handlePlayStop,
    handleTempoDown,
    handleTempoUp,
    isPlaying,
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
    transportScopeLabel,
    transportBpm,
  ]);

  if (!localDawActions && !isSharedTransportEnabled) {
    return null;
  }

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      {controls.map((control) => (
        <StudioTransportControl key={control.id} control={control} />
      ))}
    </group>
  );
}

function formatAudioEngineControlCaption(localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawAudioState || localDawAudioState.status === "idle") {
    return "Audio Init";
  }

  if (localDawAudioState.status === "ready") {
    return "Audio Ready";
  }

  if (localDawAudioState.status === "suspended") {
    return "Audio Suspended";
  }

  if (localDawAudioState.status === "unsupported") {
    return "Audio Unsupported";
  }

  if (localDawAudioState.status === "error") {
    return "Audio Error";
  }

  return "Audio Closed";
}

function createStudioInterfacePortLabelCanvas(label: string, accentColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "rgba(5, 9, 20, 0.92)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.34;
  context.lineWidth = 6;
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.globalAlpha = 1;
  context.fillStyle = accentColor;
  context.font = "800 34px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2);

  return canvas;
}

function StudioAudioInterfacePort({
  accentColor,
  label,
  position,
}: {
  accentColor: string;
  label: string;
  position: Vec3;
}) {
  const labelCanvas = useMemo(() => createStudioInterfacePortLabelCanvas(label, accentColor), [accentColor, label]);

  return (
    <group position={position}>
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
        <meshStandardMaterial args={[{ color: "#02050b", emissive: accentColor, emissiveIntensity: 0.08, roughness: 0.58, metalness: 0.2 }]} />
      </mesh>
      <mesh position={[0, 0.022, 0]}>
        <torusGeometry args={[0.048, 0.006, 8, 24]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.44, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.025, -0.066]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.17, 0.064]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.78, toneMapped: false }]}>
          <canvasTexture key={`studio-audio-interface-port-${label}-${accentColor}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioAudioInterfaceStatusLight({
  color,
  isActive,
  label,
  position,
}: {
  color: string;
  isActive: boolean;
  label: string;
  position: Vec3;
}) {
  const labelCanvas = useMemo(() => createStudioInterfacePortLabelCanvas(label, color), [color, label]);

  return (
    <group position={position}>
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.027, 0.027, 0.018, 18]} />
        <meshBasicMaterial args={[{ color, transparent: true, opacity: isActive ? 0.86 : 0.22, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <torusGeometry args={[0.035, 0.004, 8, 18]} />
        <meshBasicMaterial args={[{ color, transparent: true, opacity: isActive ? 0.36 : 0.12, toneMapped: false }]} />
      </mesh>
      <mesh position={[0, 0.024, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.13, 0.048]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.68, toneMapped: false }]} >
          <canvasTexture key={`studio-audio-interface-status-${label}-${color}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioAudioInterface({
  localDawAudioState,
  localDawState,
  phaseVisuals,
}: {
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const isReady = localDawAudioState?.status === "ready";
  const isMuted = localDawAudioState?.isMuted ?? true;
  const hasVolume = (localDawAudioState?.masterVolume ?? 0) > 0;
  const patch = localDawState?.patch;
  const connectedInputCount = patch
    ? AUDIO_INTERFACE_INPUT_PORT_IDS.filter((portId) => isPatchPortConnected(patch, portId)).length
    : 0;
  const isInterfaceOutConnected = patch ? isPatchPortConnected(patch, "audio-interface-out") : false;
  const accentColor = isReady ? "#73ff4c" : phaseVisuals.gridSecondary;
  const mutedColor = isMuted ? phaseVisuals.timerAccent : "#5f7186";
  const volumeColor = hasVolume ? phaseVisuals.gridPrimary : "#5f7186";
  const engineCaption = formatAudioEngineControlCaption(localDawAudioState);
  const patchAccentColor = connectedInputCount > 0 && isInterfaceOutConnected ? phaseVisuals.gridPrimary : phaseVisuals.timerAccent;
  const mainLabelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption: "Interface -> DAW",
    isActive: isReady,
    label: "Audio Interface",
  }), [accentColor, isReady]);
  const statusCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption: `${engineCaption} / ${isMuted ? "Muted" : hasVolume ? "Vol Ready" : "Vol 0"}`,
    isActive: isReady && !isMuted && hasVolume,
    label: "Status",
  }), [accentColor, engineCaption, hasVolume, isMuted, isReady]);
  const patchLabelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: patchAccentColor,
    caption: `PATCH ${connectedInputCount} IN / ${isInterfaceOutConnected ? "OUT" : "NO OUT"}`,
    isActive: connectedInputCount > 0 && isInterfaceOutConnected,
    label: "Patch",
  }), [connectedInputCount, isInterfaceOutConnected, patchAccentColor]);
  const inputPorts = AUDIO_INTERFACE_INPUT_PORT_IDS.map((id, index) => ({
    id,
    label: `IN ${index + 1}`,
    position: [-0.27 + index * 0.18, 0.096, -0.035] as Vec3,
  }));

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      <group position={[-2.25, 0.79, -0.82]}>
        <mesh position={[0, -0.065, 0]}>
          <boxGeometry args={[1.16, 0.07, 0.62]} />
          <meshStandardMaterial args={[{ color: "#07111f", emissive: accentColor, emissiveIntensity: 0.05, roughness: 0.78, metalness: 0.04 }]} />
        </mesh>
        {[
          [-0.48, -0.38, -0.22],
          [0.48, -0.38, -0.22],
          [-0.48, -0.38, 0.22],
          [0.48, -0.38, 0.22],
        ].map((legPosition, index) => (
          <mesh key={`studio-audio-interface-table-leg-${index}`} position={legPosition as Vec3}>
            <boxGeometry args={[0.06, 0.62, 0.06]} />
            <meshStandardMaterial args={[{ color: "#081321", emissive: accentColor, emissiveIntensity: 0.025, roughness: 0.82 }]} />
          </mesh>
        ))}
        <mesh position={[0, -0.006, 0.315]}>
          <boxGeometry args={[1.0, 0.025, 0.04]} />
          <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.34, toneMapped: false }]} />
        </mesh>
        <mesh position={[0, 0.025, 0]}>
          <boxGeometry args={[0.84, 0.05, 0.38]} />
          <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: isReady ? 0.12 : 0.07, toneMapped: false }]} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.78, 0.16, 0.34]} />
          <meshStandardMaterial args={[{ color: "#091321", emissive: accentColor, emissiveIntensity: isReady ? 0.12 : 0.05, roughness: 0.72, metalness: 0.08 }]} />
        </mesh>
        <mesh position={[0, 0.18, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.48, 0.14]} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.82, toneMapped: false }]}>
            <canvasTexture key={`studio-audio-interface-main-${isReady ? "ready" : "idle"}`} attach="map" args={[mainLabelCanvas]} />
          </meshBasicMaterial>
        </mesh>
        <mesh position={[0, 0.18, 0.116]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.48, 0.12]} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.66, toneMapped: false }]}>
            <canvasTexture key={`studio-audio-interface-status-${engineCaption}-${isMuted ? "muted" : "open"}-${hasVolume ? "volume" : "zero"}`} attach="map" args={[statusCanvas]} />
          </meshBasicMaterial>
        </mesh>
        {inputPorts.map((port) => (
          <group key={port.label}>
            <StudioAudioInterfacePort accentColor={phaseVisuals.gridSecondary} label={port.label} position={port.position} />
            <mesh position={[port.position[0] + 0.055, port.position[1] + 0.004, port.position[2] + 0.05]}>
              <cylinderGeometry args={[0.014, 0.014, 0.01, 12]} />
              <meshBasicMaterial args={[{ color: patch && isPatchPortConnected(patch, port.id) ? phaseVisuals.gridPrimary : phaseVisuals.timerAccent, opacity: patch && isPatchPortConnected(patch, port.id) ? 0.72 : 0.24, toneMapped: false, transparent: true }]} />
            </mesh>
          </group>
        ))}
        <StudioAudioInterfacePort accentColor={phaseVisuals.gridPrimary} label="OUT" position={[0.37, 0.096, 0.115]} />
        <mesh position={[0.435, 0.1, 0.165]}>
          <cylinderGeometry args={[0.016, 0.016, 0.01, 12]} />
          <meshBasicMaterial args={[{ color: isInterfaceOutConnected ? phaseVisuals.gridPrimary : phaseVisuals.timerAccent, opacity: isInterfaceOutConnected ? 0.76 : 0.24, toneMapped: false, transparent: true }]} />
        </mesh>
        <StudioAudioInterfaceStatusLight color={isReady ? "#73ff4c" : phaseVisuals.timerAccent} isActive={isReady} label="PWR" position={[-0.31, 0.096, 0.115]} />
        <StudioAudioInterfaceStatusLight color={mutedColor} isActive={isMuted} label="MUTE" position={[-0.15, 0.096, 0.115]} />
        <StudioAudioInterfaceStatusLight color={volumeColor} isActive={hasVolume} label="VOL" position={[0.01, 0.096, 0.115]} />
        <mesh position={[0, 0.215, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.58, 0.1]} />
          <meshBasicMaterial args={[{ transparent: true, opacity: 0.68, toneMapped: false }]}>
            <canvasTexture key={`studio-audio-interface-patch-${connectedInputCount}-${isInterfaceOutConnected ? "out" : "no-out"}`} attach="map" args={[patchLabelCanvas]} />
          </meshBasicMaterial>
        </mesh>
      </group>
    </group>
  );
}

function StudioPatchResetControl({
  localDawActions,
  localDawState,
  phaseVisuals,
}: {
  localDawActions?: LocalDawActions;
  localDawState?: LocalDawState;
  phaseVisuals: PhaseVisuals;
}) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const defaultPatchReady = useMemo(() => {
    const patch = localDawState?.patch;

    return Boolean(
      patch &&
      isPatchCablePluggedBetween(patch, "kick-mic-out", "drum-mixer-kick-in") &&
      isPatchCablePluggedBetween(patch, "snare-mic-out", "drum-mixer-snare-in") &&
      isPatchCablePluggedBetween(patch, "hat-mic-out", "drum-mixer-hat-in") &&
      isPatchCablePluggedBetween(patch, "overhead-left-mic-out", "drum-mixer-overhead-left-in") &&
      isPatchCablePluggedBetween(patch, "overhead-right-mic-out", "drum-mixer-overhead-right-in") &&
      isPatchCablePluggedBetween(patch, "drum-mixer-out", "audio-interface-input-1") &&
      isPatchCablePluggedBetween(patch, "piano-out", "audio-interface-input-2") &&
      isPatchCablePluggedBetween(patch, "audio-interface-out", "speaker-system-input")
    );
  }, [localDawState?.patch]);
  const accentColor = isConfirmingReset
    ? "#73ff4c"
    : defaultPatchReady
      ? "#f8d36a"
      : phaseVisuals.timerAccent;
  const caption = isConfirmingReset
    ? "Defaults Restored"
    : defaultPatchReady
      ? "Default Ready"
      : "Default Routing";
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption,
    isActive: isConfirmingReset || defaultPatchReady,
    label: "Reset Patch",
  }), [accentColor, caption, defaultPatchReady, isConfirmingReset]);
  const handleResetPatch = useCallback(() => {
    localDawActions?.resetPatchToDefaults();
    setIsConfirmingReset(true);
  }, [localDawActions]);

  useEffect(() => {
    if (!isConfirmingReset) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsConfirmingReset(false);
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isConfirmingReset]);

  useRegisterInteractable(useMemo(() => ({
    id: "studio-patch-reset-defaults",
    label: caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: Boolean(localDawActions),
    onActivate: handleResetPatch,
  }), [caption, handleResetPatch, localDawActions]));

  if (!localDawActions) {
    return null;
  }

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[-2.25, 0.832, -0.38]}>
        <boxGeometry args={[0.72, 0.035, 0.26]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: isConfirmingReset ? 0.22 : 0.12, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef} position={[-2.25, 0.875, -0.38]}>
        <boxGeometry args={[0.62, 0.052, 0.19]} />
        <meshStandardMaterial args={[{
          color: isConfirmingReset ? "#132b27" : "#10192b",
          emissive: accentColor,
          emissiveIntensity: isConfirmingReset ? 0.22 : 0.12,
          roughness: 0.68,
          metalness: 0.05,
        }]} />
      </mesh>
      <mesh position={[-2.25, 0.908, -0.38]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.48, 0.14]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.78, toneMapped: false }]} >
          <canvasTexture key={`studio-patch-reset-${caption}-${defaultPatchReady ? "ready" : "dirty"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[-1.89, 0.891, -0.38]}>
        <cylinderGeometry args={[0.024, 0.024, 0.014, 16]} />
        <meshBasicMaterial args={[{ color: accentColor, opacity: defaultPatchReady || isConfirmingReset ? 0.82 : 0.46, toneMapped: false, transparent: true }]} />
      </mesh>
    </group>
  );
}

function StudioAudioEngineControl({
  localDawAudioActions,
  localDawAudioState,
  phaseVisuals,
}: {
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  phaseVisuals: PhaseVisuals;
}) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const caption = formatAudioEngineControlCaption(localDawAudioState);
  const isReady = localDawAudioState?.status === "ready";
  const accentColor = isReady ? "#73ff4c" : phaseVisuals.timerAccent;
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption,
    isActive: isReady,
    label: "Engine",
  }), [accentColor, caption, isReady]);
  const handleToggleMute = useCallback(() => {
    localDawAudioActions?.toggleMuted();
  }, [localDawAudioActions]);
  const handleVolumeDown = useCallback(() => {
    localDawAudioActions?.setMasterVolume((localDawAudioState?.masterVolume ?? 0) - STUDIO_MASTER_VOLUME_STEP);
  }, [localDawAudioActions, localDawAudioState?.masterVolume]);
  const handleVolumeUp = useCallback(() => {
    localDawAudioActions?.setMasterVolume((localDawAudioState?.masterVolume ?? 0) + STUDIO_MASTER_VOLUME_STEP);
  }, [localDawAudioActions, localDawAudioState?.masterVolume]);
  const audioControls = useMemo<StudioAudioControlSpec[]>(() => [
    {
      id: "mute",
      label: "Mute",
      caption: localDawAudioState?.isMuted === false ? "Unmuted" : "Muted",
      position: [-1.03, 0.742, -0.08],
      size: [0.34, 0.045, 0.15],
      accentColor: localDawAudioState?.isMuted ? phaseVisuals.timerAccent : "#73ff4c",
      isActive: localDawAudioState?.isMuted === false,
      onActivate: handleToggleMute,
    },
    {
      id: "volume-down",
      label: "Vol -",
      caption: "Volume Down",
      position: [-1.22, 0.738, -0.3],
      size: [0.26, 0.04, 0.14],
      accentColor: phaseVisuals.gridSecondary,
      onActivate: handleVolumeDown,
    },
    {
      id: "volume-up",
      label: "Vol +",
      caption: "Volume Up",
      position: [-0.84, 0.738, -0.3],
      size: [0.26, 0.04, 0.14],
      accentColor: phaseVisuals.gridSecondary,
      onActivate: handleVolumeUp,
    },
  ], [
    handleToggleMute,
    handleVolumeDown,
    handleVolumeUp,
    localDawAudioState?.isMuted,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
  ]);

  useRegisterInteractable(useMemo(() => ({
    id: "studio-audio-init",
    label: caption,
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: Boolean(localDawAudioActions),
    onActivate: () => {
      void localDawAudioActions?.initialize();
    },
  }), [caption, localDawAudioActions]));

  if (!localDawAudioActions) {
    return null;
  }

  return (
    <group position={[-21.25, 0, -4.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[-1.03, 0.742, 0.22]}>
        <boxGeometry args={[0.34, 0.055, 0.22]} />
        <meshStandardMaterial args={[{
          color: isReady ? "#132b27" : "#10192b",
          emissive: accentColor,
          emissiveIntensity: isReady ? 0.2 : 0.1,
          roughness: 0.68,
          metalness: 0.05,
        }]} />
      </mesh>
      <mesh ref={controlRef} position={[-1.03, 0.786, 0.22]}>
        <boxGeometry args={[0.4, 0.035, 0.27]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: isReady ? 0.32 : 0.18, toneMapped: false }]} />
      </mesh>
      <mesh position={[-1.03, 0.811, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.18]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.76, toneMapped: false }]}>
          <canvasTexture key={`studio-audio-engine-${caption}-${isReady ? "ready" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      {audioControls.map((control) => (
        <StudioAudioSafetyControl key={control.id} control={control} />
      ))}
      <StudioMasterVolumeBar localDawAudioState={localDawAudioState} phaseVisuals={phaseVisuals} />
    </group>
  );
}

function createStudioStationLabelCanvas(label: string, accentColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#050914";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(233, 251, 255, 0.18)";
  context.lineWidth = 8;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.strokeStyle = accentColor;
  context.globalAlpha = 0.45;
  context.lineWidth = 4;
  context.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
  context.globalAlpha = 1;

  context.fillStyle = accentColor;
  context.globalAlpha = 0.72;
  context.font = "700 42px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), canvas.width / 2, 78);
  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.5;
  context.font = "700 24px monospace";
  context.fillText("PLACEHOLDER", canvas.width / 2, 126);
  context.globalAlpha = 1;

  return canvas;
}

function truncateStudioRoleText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function createStudioRoleBadgeCanvas({
  accentColor,
  extraCount,
  isLocal,
  label,
  occupant,
}: {
  accentColor: string;
  extraCount: number;
  isLocal: boolean;
  label: string;
  occupant?: StudioRoleOccupant;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 224;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  const hasOccupant = isLocal || Boolean(occupant);
  const resolvedAccent = isLocal ? "#57f3ff" : occupant?.isHost ? "#f8d36a" : hasOccupant ? accentColor : "#5f7186";
  const occupantLabel = isLocal ? "YOU" : occupant ? truncateStudioRoleText(occupant.user.displayName, 15).toUpperCase() : "OPEN";
  const statusLabels = [];

  if (isLocal) {
    statusLabels.push("LOCAL");
  } else if (occupant?.isHost) {
    statusLabels.push("HOST");
  } else if (occupant?.user.isTestUser) {
    statusLabels.push("SIM");
  } else if (occupant) {
    statusLabels.push("REMOTE");
  } else {
    statusLabels.push("READY");
  }

  if (extraCount > 0) {
    statusLabels.push(`+${extraCount}`);
  }

  context.fillStyle = "rgba(3, 6, 12, 0.82)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = resolvedAccent;
  context.globalAlpha = hasOccupant ? 0.84 : 0.42;
  context.lineWidth = 10;
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.globalAlpha = 1;

  context.fillStyle = resolvedAccent;
  context.globalAlpha = hasOccupant ? 0.28 : 0.12;
  context.fillRect(30, 30, canvas.width - 60, 44);
  context.globalAlpha = 1;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = resolvedAccent;
  context.font = "700 36px monospace";
  context.fillText(label, canvas.width / 2, 52);
  context.fillStyle = hasOccupant ? "#f4f7ff" : "#92a4b6";
  context.font = "700 54px monospace";
  context.fillText(occupantLabel, canvas.width / 2, 118);
  context.fillStyle = resolvedAccent;
  context.globalAlpha = hasOccupant ? 0.84 : 0.56;
  context.font = "700 25px monospace";
  context.fillText(statusLabels.join(" | "), canvas.width / 2, 174);
  context.globalAlpha = 1;

  return canvas;
}

function getStudioRoleDistanceSquared(position: readonly [number, number, number], role: StudioRoleSpec) {
  const xDistance = position[0] - role.anchorPosition[0];
  const zDistance = position[2] - role.anchorPosition[2];

  return xDistance * xDistance + zDistance * zDistance;
}

function isPresenceNearStudioArea(presence: FreeRoamPresenceState, area: LevelAreaConfig) {
  const margin = 0.6;

  return (
    presence.position[0] >= area.bounds.min[0] - margin &&
    presence.position[0] <= area.bounds.max[0] + margin &&
    presence.position[2] >= area.bounds.min[2] - margin &&
    presence.position[2] <= area.bounds.max[2] + margin
  );
}

function getLocalStudioRoleId(localDawState?: LocalDawState): StudioRoleId | undefined {
  return localDawState?.selectedStationId;
}

function StudioRoleBadge({
  extraCount,
  isLocal,
  occupant,
  role,
}: {
  extraCount: number;
  isLocal: boolean;
  occupant?: StudioRoleOccupant;
  role: StudioRoleSpec;
}) {
  const labelCanvas = useMemo(() => createStudioRoleBadgeCanvas({
    accentColor: role.accentColor,
    extraCount,
    isLocal,
    label: role.label,
    occupant,
  }), [extraCount, isLocal, occupant?.isHost, occupant?.user.displayName, occupant?.user.id, occupant?.user.isTestUser, role.accentColor, role.label]);
  const textureKey = [
    "studio-role",
    role.id,
    isLocal ? "local" : "remote",
    occupant?.user.id ?? "open",
    occupant?.user.displayName ?? "open",
    occupant?.isHost ? "host" : "peer",
    occupant?.user.isTestUser ? "sim" : "user",
    extraCount,
  ].join("-");
  const hasOccupant = isLocal || Boolean(occupant);

  return (
    <group position={role.badgePosition} rotation={role.badgeRotation}>
      <mesh position={[0, 0, -0.018]}>
        <boxGeometry args={[1.02, 0.46, 0.035]} />
        <meshStandardMaterial args={[{
          color: "#050914",
          emissive: role.accentColor,
          emissiveIntensity: hasOccupant ? 0.13 : 0.045,
          roughness: 0.7,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[0.92, 0.4]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: hasOccupant ? 0.9 : 0.64, toneMapped: false }]}>
          <canvasTexture key={textureKey} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, -0.3, -0.02]}>
        <boxGeometry args={[0.045, 0.2, 0.045]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: role.accentColor, emissiveIntensity: hasOccupant ? 0.35 : 0.12, roughness: 0.64 }]} />
      </mesh>
    </group>
  );
}

function StudioRoleBadges({
  area,
  freeRoamPresence,
  localDawState,
  localUserId,
  layoutState,
  ownerId,
  users,
}: {
  area: LevelAreaConfig;
  freeRoamPresence: FreeRoamPresenceState[];
  localDawState?: LocalDawState;
  localUserId: string;
  layoutState: StudioLayoutState;
  ownerId: string;
  users: SessionUser[];
}) {
  const localRoleId = getLocalStudioRoleId(localDawState);
  const remoteOccupantsByRole = useMemo(() => {
    const usersById = new Map(users.map((user) => [user.id, user]));
    const occupantsByRole = new Map<StudioRoleId, StudioRoleOccupant[]>();

    freeRoamPresence
      .filter((presence) => presence.userId !== localUserId && isPresenceNearStudioArea(presence, area))
      .forEach((presence) => {
        const user = usersById.get(presence.userId);

        if (!user) {
          return;
        }

        const nearestRole = STUDIO_ROLE_SPECS
          .map((role) => getLayoutAdjustedStudioRoleSpec(role, layoutState))
          .map((role) => ({
            role,
            distanceSquared: getStudioRoleDistanceSquared(presence.position, role),
          }))
          .sort((firstRole, secondRole) => firstRole.distanceSquared - secondRole.distanceSquared)[0];

        if (!nearestRole || nearestRole.distanceSquared > STUDIO_ROLE_PROXIMITY_RADIUS * STUDIO_ROLE_PROXIMITY_RADIUS) {
          return;
        }

        const occupants = occupantsByRole.get(nearestRole.role.id) ?? [];

        occupantsByRole.set(nearestRole.role.id, [
          ...occupants,
          {
            user,
            distance: Math.sqrt(nearestRole.distanceSquared),
            isHost: user.isHost || user.id === ownerId,
          },
        ].sort((firstOccupant, secondOccupant) => firstOccupant.distance - secondOccupant.distance));
      });

    return occupantsByRole;
  }, [area, freeRoamPresence, layoutState, localUserId, ownerId, users]);

  return (
    <>
      {STUDIO_ROLE_SPECS.map((role) => {
        const adjustedRole = getLayoutAdjustedStudioRoleSpec(role, layoutState);
        const remoteOccupants = remoteOccupantsByRole.get(role.id) ?? [];
        const isLocal = localRoleId !== undefined && role.id === localRoleId;
        const visibleRemoteOccupant = isLocal ? undefined : remoteOccupants[0];
        const extraCount = isLocal ? remoteOccupants.length : Math.max(0, remoteOccupants.length - 1);

        return (
          <StudioRoleBadge
            key={role.id}
            role={adjustedRole}
            isLocal={isLocal}
            occupant={visibleRemoteOccupant}
            extraCount={extraCount}
          />
        );
      })}
    </>
  );
}

function StudioStationLabel({
  accentColor,
  label,
  position,
  rotation = [-Math.PI / 2, 0, 0],
  size = [1.08, 0.34],
}: {
  accentColor: string;
  label: string;
  position: Vec3;
  rotation?: Vec3;
  size?: [number, number];
}) {
  const labelCanvas = useMemo(() => createStudioStationLabelCanvas(label, accentColor), [accentColor, label]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.72, toneMapped: false }]}>
        <canvasTexture key={`studio-station-label-${label}-${accentColor}`} attach="map" args={[labelCanvas]} />
      </meshBasicMaterial>
    </mesh>
  );
}

function StudioLayoutStationGroup({
  children,
  isMoving,
  isTargeted,
  stationId,
  transform,
  showGrabBox,
}: {
  children: ReactNode;
  isMoving: boolean;
  isTargeted: boolean;
  stationId: StudioLayoutStationId;
  transform: StudioLayoutTransform;
  showGrabBox: boolean;
}) {
  const spec = STUDIO_LAYOUT_STATION_SPECS[stationId];
  const targetRef = useRef<React.ElementRef<"mesh">>(null);
  const hitboxOffset = spec.hitboxOffset ?? [0, 0, 0];
  const hitboxOpacity = isMoving ? 0.3 : showGrabBox ? (isTargeted ? 0.14 : 0.035) : 0.001;
  const inversePosition: Vec3 = [
    -spec.defaultTransform.position[0],
    -spec.defaultTransform.position[1],
    -spec.defaultTransform.position[2],
  ];
  const inverseRotation: Vec3 = [
    -spec.defaultTransform.rotation[0],
    -spec.defaultTransform.rotation[1],
    -spec.defaultTransform.rotation[2],
  ];

  useRegisterInteractable(useMemo(() => ({
    id: `${STUDIO_LAYOUT_STATION_PREFIX}${stationId}`,
    label: `Move ${spec.label}`,
    objectRef: targetRef,
    modes: ["movable" as const],
    enabled: true,
    onActivate: () => undefined,
  }), [spec.label, stationId]));

  return (
    <group position={transform.position} rotation={transform.rotation}>
      <mesh ref={targetRef} position={hitboxOffset}>
        <boxGeometry args={spec.hitboxSize} />
        <meshBasicMaterial args={[{
          color: isMoving ? "#f8d36a" : "#57f3ff",
          depthWrite: false,
          opacity: hitboxOpacity,
          toneMapped: false,
          transparent: true,
          wireframe: true,
        }]} />
      </mesh>
      <group rotation={inverseRotation}>
        <group position={inversePosition}>
          {children}
        </group>
      </group>
    </group>
  );
}

function StudioLayoutMoveStatus({
  moveState,
  transform,
}: {
  moveState: StudioLayoutMoveState | null;
  transform?: StudioLayoutTransform;
}) {
  const spec = moveState ? STUDIO_LAYOUT_STATION_SPECS[moveState.stationId] : null;
  const statusCanvas = useMemo(() => {
    if (!moveState || !spec) {
      return null;
    }

    return createStudioTransportControlCanvas({
      accentColor: moveState.floorLock ? "#73ff4c" : "#f8d36a",
      caption: `${moveState.floorLock ? "FLOOR LOCK" : "MOUSE HEIGHT"} / Q-E ROTATE`,
      isActive: true,
      label: `MOVING ${spec.label}`,
    });
  }, [moveState, spec]);

  if (!moveState || !spec || !transform || !statusCanvas) {
    return null;
  }

  return (
    <group position={[transform.position[0], transform.position[1] + spec.hitboxSize[1] + 0.35, transform.position[2]]} rotation={[0, transform.rotation[1], 0]}>
      <mesh>
        <planeGeometry args={[1.9, 0.54]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.86, toneMapped: false }]} >
          <canvasTexture key={`studio-layout-move-status-${moveState.stationId}-${moveState.floorLock ? "floor" : "free"}`} attach="map" args={[statusCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.42, 32]} />
        <meshBasicMaterial args={[{ color: moveState.floorLock ? "#73ff4c" : "#f8d36a", opacity: 0.42, toneMapped: false, transparent: true }]} />
      </mesh>
    </group>
  );
}

function StudioDeskShell({
  accentColor,
  label,
  position,
  rotation,
  showLabel = true,
  size,
  variant,
}: {
  accentColor: string;
  label: string;
  position: Vec3;
  rotation: Vec3;
  showLabel?: boolean;
  size: [number, number, number];
  variant: "daw" | "looper" | "dj";
}) {
  const [width, height, depth] = size;
  const padCount = variant === "daw" ? 10 : variant === "looper" ? 6 : 4;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial args={[{ color: "#091321", emissive: "#03070f", emissiveIntensity: 0.2, roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, height + 0.045, 0]}>
        <boxGeometry args={[width + 0.16, 0.09, depth + 0.1]} />
        <meshStandardMaterial args={[{ color: "#111b2d", emissive: accentColor, emissiveIntensity: 0.06, roughness: 0.76, metalness: 0.06 }]} />
      </mesh>
      {showLabel ? (
        <StudioStationLabel accentColor={accentColor} label={label} position={[0, height + 0.105, -depth * 0.12]} size={[Math.min(width * 0.74, 1.45), 0.32]} />
      ) : null}
      <mesh position={[0, height + 0.13, depth * 0.28]}>
        <boxGeometry args={[width * 0.72, 0.026, 0.08]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.34, toneMapped: false }]} />
      </mesh>
      {Array.from({ length: padCount }, (_, index) => {
        const row = index % 2;
        const column = Math.floor(index / 2);
        const columnCount = Math.ceil(padCount / 2);
        const x = (column - (columnCount - 1) / 2) * Math.min(0.22, width / (columnCount + 2));
        const z = depth * 0.2 + row * 0.14;

        return (
          <mesh key={`${label}-pad-${index}`} position={[x, height + 0.115, z]}>
            <boxGeometry args={[0.12, 0.018, 0.08]} />
            <meshStandardMaterial args={[{ color: "#17243a", emissive: accentColor, emissiveIntensity: 0.08, roughness: 0.7 }]} />
          </mesh>
        );
      })}
      <mesh position={[-width / 2 + 0.08, height / 2, depth / 2 + 0.03]}>
        <boxGeometry args={[0.04, height * 0.72, 0.035]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.36 }]} />
      </mesh>
      <mesh position={[width / 2 - 0.08, height / 2, depth / 2 + 0.03]}>
        <boxGeometry args={[0.04, height * 0.72, 0.035]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.28 }]} />
      </mesh>
    </group>
  );
}

function StudioPianoShell({
  accentColor,
  localDawActions,
  localDawAudioActions,
  localDawAudioState,
  localDawState,
  onBroadcastDawLiveSound,
  position,
}: {
  accentColor: string;
  localDawActions?: LocalDawActions;
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  position: Vec3;
}) {
  const whiteKeySpacing = 0.172;
  const targetTrack = localDawState?.tracks.find((track) => track.id === localDawState.selectedTrackId);
  const selectedClip = localDawState?.clips.find((clip) => (
    clip.trackId === localDawState.selectedTrackId &&
    clip.sceneIndex === localDawState.selectedSceneIndex
  ));
  const selectedClipNotes = selectedClip && localDawState
    ? localDawState.midiNotes.filter((note) => note.clipId === selectedClip.id)
    : [];
  const liveTarget: LocalDawPianoLiveTarget = localDawState?.selectedTrackId === "bass" ? "bass" : "fm-synth";
  const targetTrackLabel = liveTarget === "bass" ? "Live Bass" : "Live FM";
  const pianoGainScale = getTrackGainScale(localDawState, "piano");
  const lastLiveNoteLabel = localDawAudioState?.lastPianoLiveNoteLabel ?? "Idle";
  const isSelectedClipRecording = selectedClip?.state === "recording";
  const isTargetArmed = isSelectedClipRecording || selectedClip?.state === "armed" || targetTrack?.armed === true;
  const recordLabel = isSelectedClipRecording ? "Rec" : "Arm";
  const recordCaption = selectedClip ? `Notes ${selectedClipNotes.length}` : "No Clip";
  const pianoOutLabelCanvas = useMemo(() => createStudioInterfacePortLabelCanvas("Piano Out", accentColor), [accentColor]);
  const isPianoOutConnected = localDawState ? isPatchPortConnected(localDawState.patch, "piano-out") : false;
  const pianoDestination = localDawState ? getPatchPortPeerLabel(localDawState.patch, "piano-out") : null;
  const canPianoLiveSound = localDawState ? canPianoLivePatchReachSpeakers(localDawState.patch) : false;
  const pianoPatchCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: isPianoOutConnected ? accentColor : "#ff9f4a",
    caption: isPianoOutConnected ? `To ${pianoDestination ?? "Patch"}` : "Not Patched",
    isActive: isPianoOutConnected,
    label: "Patch",
  }), [accentColor, isPianoOutConnected, pianoDestination]);

  return (
    <group position={position}>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[3.1, 0.68, 0.66]} />
        <meshStandardMaterial args={[{ color: "#091321", emissive: "#03070f", emissiveIntensity: 0.18, roughness: 0.82, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[3.28, 0.08, 0.84]} />
        <meshStandardMaterial args={[{ color: "#111b2d", emissive: accentColor, emissiveIntensity: 0.05, roughness: 0.76, metalness: 0.06 }]} />
      </mesh>
      <StudioStationLabel accentColor={accentColor} label="Piano / MIDI" position={[0, 0.792, -0.32]} size={[1.32, 0.28]} />
      <mesh position={[0, 0.79, 0.23]}>
        <boxGeometry args={[2.62, 0.035, 0.38]} />
        <meshStandardMaterial args={[{ color: "#040914", roughness: 0.68, metalness: 0.03 }]} />
      </mesh>
      <mesh position={[1.55, 0.842, 0]}>
        <cylinderGeometry args={[0.046, 0.046, 0.022, 24]} />
        <meshStandardMaterial args={[{ color: "#02050b", emissive: accentColor, emissiveIntensity: 0.1, metalness: 0.18, roughness: 0.58 }]} />
      </mesh>
      <mesh position={[1.55, 0.858, 0]}>
        <torusGeometry args={[0.05, 0.006, 8, 24]} />
        <meshBasicMaterial args={[{ color: accentColor, opacity: 0.5, toneMapped: false, transparent: true }]} />
      </mesh>
      <mesh position={[1.32, 0.864, -0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.24, 0.08]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.76, toneMapped: false }]}>
          <canvasTexture key={`studio-piano-out-label-${accentColor}`} attach="map" args={[pianoOutLabelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[1.68, 0.858, -0.11]}>
        <cylinderGeometry args={[0.025, 0.025, 0.014, 16]} />
        <meshBasicMaterial args={[{ color: isPianoOutConnected ? accentColor : "#ff9f4a", opacity: isPianoOutConnected ? 0.78 : 0.28, toneMapped: false, transparent: true }]} />
      </mesh>
      <mesh position={[1.44, 0.868, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.42, 0.09]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.7, toneMapped: false }]}>
          <canvasTexture key={`studio-piano-patch-${isPianoOutConnected ? pianoDestination ?? "connected" : "none"}`} attach="map" args={[pianoPatchCanvas]} />
        </meshBasicMaterial>
      </mesh>
      {PIANO_WHITE_KEY_SPECS.map((note, index) => (
        <StudioPianoKey
          key={`piano-white-key-${note.label}`}
          accentColor={accentColor}
          allowSound={canPianoLiveSound}
          isActive={localDawAudioState?.lastPianoLiveNoteLabel === note.label}
          isBlack={false}
          localDawActions={localDawActions}
          localDawAudioActions={localDawAudioActions}
          localDawAudioState={localDawAudioState}
          note={note}
          onBroadcastDawLiveSound={onBroadcastDawLiveSound}
          position={[-1.12 + index * whiteKeySpacing, 0.83, 0.26]}
          size={[0.13, 0.024, 0.31]}
          target={liveTarget}
          gainScale={pianoGainScale}
        />
      ))}
      {PIANO_BLACK_KEY_SPECS.map((note) => (
        <StudioPianoKey
          key={`piano-black-key-${note.label}`}
          accentColor={accentColor}
          allowSound={canPianoLiveSound}
          isActive={localDawAudioState?.lastPianoLiveNoteLabel === note.label}
          isBlack
          localDawActions={localDawActions}
          localDawAudioActions={localDawAudioActions}
          localDawAudioState={localDawAudioState}
          note={note}
          onBroadcastDawLiveSound={onBroadcastDawLiveSound}
          position={[-1.12 + ((note.whiteKeyIndex ?? 0) + 0.5) * whiteKeySpacing, 0.852, 0.19]}
          size={[0.088, 0.03, 0.18]}
          target={liveTarget}
          gainScale={pianoGainScale}
        />
      ))}
      <StudioPianoVisualControl
        accentColor={accentColor}
        caption="Octave Down"
        label="Oct -"
        position={[-1.05, 0.858, -0.11]}
        size={[0.34, 0.034, 0.16]}
      />
      <StudioPianoVisualControl
        accentColor={accentColor}
        caption="Octave Up"
        label="Oct +"
        position={[-0.62, 0.858, -0.11]}
        size={[0.34, 0.034, 0.16]}
      />
      <StudioPianoRecordToggle
        accentColor={isTargetArmed ? "#ff667c" : "#8b3948"}
        caption={recordCaption}
        isActive={isTargetArmed}
        label={recordLabel}
        localDawActions={localDawActions}
        position={[1.21, 0.858, -0.11]}
        size={[0.34, 0.034, 0.16]}
      />
      <StudioPianoVisualControl
        accentColor={accentColor}
        caption={targetTrackLabel}
        label="Target"
        position={[0.12, 0.861, -0.11]}
        size={[0.44, 0.034, 0.16]}
      />
      <StudioPianoVisualControl
        accentColor={localDawAudioState?.lastPianoLiveTarget === liveTarget ? accentColor : "#6f86a3"}
        caption={lastLiveNoteLabel}
        isActive={Boolean(localDawAudioState?.lastPianoLiveNoteLabel)}
        label="Last"
        position={[0.67, 0.861, -0.11]}
        size={[0.42, 0.034, 0.16]}
      />
      <mesh position={[0, 0.802, 0.49]}>
        <boxGeometry args={[2.28, 0.02, 0.04]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.26, toneMapped: false }]} />
      </mesh>
      <StudioPianoRecordedNoteStrip
        accentColor={isSelectedClipRecording ? "#ff667c" : accentColor}
        notes={selectedClipNotes}
        stepCount={(selectedClip?.lengthBars ?? 4) * 16}
      />
    </group>
  );
}

function StudioPianoKey({
  accentColor,
  allowSound,
  gainScale,
  isActive,
  isBlack,
  localDawActions,
  localDawAudioActions,
  localDawAudioState,
  note,
  onBroadcastDawLiveSound,
  position,
  size,
  target,
}: {
  accentColor: string;
  allowSound: boolean;
  gainScale: number;
  isActive: boolean;
  isBlack: boolean;
  localDawActions?: LocalDawActions;
  localDawAudioActions?: LocalDawAudioEngineActions;
  localDawAudioState?: LocalDawAudioEngineState;
  note: LocalDawPianoLiveNote;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  position: Vec3;
  size: Vec3;
  target: LocalDawPianoLiveTarget;
}) {
  const keyRef = useRef<React.ElementRef<"mesh">>(null);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-piano-key-${note.label.toLowerCase().replace("#", "s")}`,
    label: `Piano ${note.label}`,
    objectRef: keyRef,
    modes: ["clickable" as const],
    enabled: Boolean(localDawAudioActions || localDawActions),
    onActivate: () => {
      localDawAudioActions?.playPianoLiveNote({
        ...note,
        gainScale,
      }, target, { allowSound });
      localDawActions?.recordDawNoteEvent(note);
      if (allowSound && gainScale > 0) {
        onBroadcastDawLiveSound?.({
          areaId: "recording-studio",
          kind: "piano",
          label: note.label,
          frequency: note.frequency,
          durationSeconds: note.durationSeconds,
          gainScale,
          pianoTarget: target,
          bassMachinePatch: target === "bass" ? localDawAudioState?.bassMachinePatch : undefined,
          fmSynthPatch: target === "fm-synth" ? localDawAudioState?.fmSynthPatch : undefined,
        });
      }
    },
  }), [
    allowSound,
    gainScale,
    localDawActions,
    localDawAudioActions,
    localDawAudioState?.bassMachinePatch,
    localDawAudioState?.fmSynthPatch,
    note,
    onBroadcastDawLiveSound,
    target,
  ]));

  return (
    <group position={position}>
      {isActive ? (
        <mesh position={[0, 0.018, 0]}>
          <boxGeometry args={[size[0] + 0.035, 0.01, size[2] + 0.03]} />
          <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.4, wireframe: true, toneMapped: false }]} />
        </mesh>
      ) : null}
      <mesh ref={keyRef}>
        <boxGeometry args={size} />
        <meshBasicMaterial args={[{
          color: isBlack ? "#29354d" : "#d5e1e8",
          transparent: true,
          opacity: isActive ? (isBlack ? 0.94 : 0.82) : (isBlack ? 0.78 : 0.6),
          toneMapped: false,
        }]} />
      </mesh>
      {isActive ? (
        <mesh position={[0, size[1] / 2 + 0.005, 0]}>
          <boxGeometry args={[size[0] * 0.58, 0.008, size[2] * 0.24]} />
          <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.58, toneMapped: false }]} />
        </mesh>
      ) : null}
    </group>
  );
}

function StudioPianoRecordedNoteStrip({
  accentColor,
  notes,
  stepCount,
}: {
  accentColor: string;
  notes: LocalDawMidiNoteEvent[];
  stepCount: number;
}) {
  const visibleNotes = notes.slice(-12);

  if (!visibleNotes.length) {
    return null;
  }

  return (
    <group position={[0, 0.848, 0.49]}>
      {visibleNotes.map((note) => {
        const x = -1.1 + (Math.min(stepCount - 1, note.stepIndex) / Math.max(1, stepCount - 1)) * 2.2;

        return (
          <mesh key={`piano-recorded-note-${note.id}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.035, 0.014, 0.052]} />
            <meshBasicMaterial args={[{
              color: note.id === notes[notes.length - 1]?.id ? "#f8d36a" : accentColor,
              transparent: true,
              opacity: 0.62,
              toneMapped: false,
            }]} />
          </mesh>
        );
      })}
    </group>
  );
}

function StudioPianoRecordToggle({
  accentColor,
  caption,
  isActive,
  label,
  localDawActions,
  position,
  size,
}: {
  accentColor: string;
  caption: string;
  isActive?: boolean;
  label: string;
  localDawActions?: LocalDawActions;
  position: Vec3;
  size: Vec3;
}) {
  const controlRef = useRef<React.ElementRef<"mesh">>(null);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption,
    isActive,
    label,
  }), [accentColor, caption, isActive, label]);

  useRegisterInteractable(useMemo(() => ({
    id: "studio-piano-record-toggle",
    label: "Piano Record Toggle",
    objectRef: controlRef,
    modes: ["clickable" as const],
    enabled: Boolean(localDawActions),
    onActivate: () => {
      localDawActions?.toggleSelectedClipRecording();
    },
  }), [localDawActions]));

  return (
    <group position={position}>
      <mesh position={[0, -0.011, 0]}>
        <boxGeometry args={[size[0] + 0.04, 0.014, size[2] + 0.034]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: isActive ? 0.2 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={size} />
        <meshStandardMaterial args={[{
          color: isActive ? "#281620" : "#0b1525",
          emissive: accentColor,
          emissiveIntensity: isActive ? 0.2 : 0.07,
          roughness: 0.74,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] * 0.84, size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.62, toneMapped: false }]}>
          <canvasTexture key={`studio-piano-record-toggle-${label}-${caption}-${isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioPianoVisualControl({
  accentColor,
  caption,
  isActive,
  label,
  position,
  size,
}: {
  accentColor: string;
  caption: string;
  isActive?: boolean;
  label: string;
  position: Vec3;
  size: Vec3;
}) {
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption,
    isActive,
    label,
  }), [accentColor, caption, isActive, label]);

  return (
    <group position={position}>
      <mesh position={[0, -0.011, 0]}>
        <boxGeometry args={[size[0] + 0.04, 0.014, size[2] + 0.034]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: isActive ? 0.18 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial args={[{
          color: isActive ? "#241423" : "#0b1525",
          emissive: accentColor,
          emissiveIntensity: isActive ? 0.16 : 0.06,
          roughness: 0.74,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] * 0.84, size[2] * 0.72]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.54, toneMapped: false }]}>
          <canvasTexture key={`studio-piano-control-${label}-${caption}-${accentColor}-${isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

function StudioRackShell({
  accentColor,
  label,
  position,
}: {
  accentColor: string;
  label: string;
  position: Vec3;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[1.08, 1.84, 0.38]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: "#03070f", emissiveIntensity: 0.22, roughness: 0.82, metalness: 0.05 }]} />
      </mesh>
      <mesh position={[0, 1.67, 0.205]}>
        <boxGeometry args={[0.94, 0.06, 0.035]} />
        <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.3 }]} />
      </mesh>
      <StudioStationLabel accentColor={accentColor} label={label} position={[0, 1.42, 0.222]} rotation={[0, 0, 0]} size={[0.9, 0.3]} />
      {[-0.5, -0.24, 0.02, 0.28].map((y, index) => (
        <mesh key={`${label}-module-${index}`} position={[0, 0.94 + y, 0.22]}>
          <boxGeometry args={[0.78, 0.14, 0.045]} />
          <meshStandardMaterial args={[{ color: "#10192b", emissive: accentColor, emissiveIntensity: 0.07, roughness: 0.68 }]} />
        </mesh>
      ))}
      {[-0.32, 0, 0.32].map((x) => (
        <mesh key={`${label}-port-${x}`} position={[x, 0.72, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.026, 16]} />
          <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.38 }]} />
        </mesh>
      ))}
    </group>
  );
}

function getStudioOverviewScreenCanvasSize(screen: StudioOverviewScreenSpec) {
  const minWidth = screen.kind === "sequence-grid"
    ? 1024
    : screen.kind === "arrangement-grid"
      ? 1500
      : screen.kind === "mixer-grid"
        ? 1120
        : 768;
  const minHeight = screen.kind === "sequence-grid"
    ? 512
    : screen.kind === "arrangement-grid"
      ? 700
      : screen.kind === "mixer-grid"
        ? 480
        : 384;
  const pixelsPerUnit = screen.kind === "sequence-grid"
    ? 260
    : screen.kind === "arrangement-grid"
      ? 286
      : screen.kind === "mixer-grid"
        ? 240
        : 220;

  return {
    height: Math.max(minHeight, Math.round(screen.size[1] * pixelsPerUnit)),
    width: Math.max(minWidth, Math.round(screen.size[0] * pixelsPerUnit)),
  };
}

function createStudioOverviewScreenCanvas(screen: StudioOverviewScreenSpec) {
  const canvas = document.createElement("canvas");
  const isSequenceGrid = screen.kind === "sequence-grid";
  const isArrangementGrid = screen.kind === "arrangement-grid";
  const isMixerGrid = screen.kind === "mixer-grid";
  const isPatchSignalTruth = screen.id === "studio-truth";
  const canvasSize = getStudioOverviewScreenCanvasSize(screen);
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#040914";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(233, 251, 255, 0.14)";
  context.lineWidth = 10;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.strokeStyle = screen.accentColor;
  context.globalAlpha = 0.36;
  context.lineWidth = 5;
  context.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);
  context.globalAlpha = 1;

  const titleFontSize = Math.round(Math.max(
    38,
    Math.min(54, canvas.width * (isSequenceGrid ? 0.043 : isArrangementGrid ? 0.036 : isMixerGrid ? 0.04 : 0.046)),
  ));
  const lineFontSize = Math.round(Math.max(
    20,
    Math.min(32, canvas.width * (isSequenceGrid ? 0.028 : isArrangementGrid ? 0.022 : isMixerGrid ? 0.024 : isPatchSignalTruth ? 0.027 : 0.032)),
  ));
  const lineStartY = Math.round(canvas.height * (isSequenceGrid ? 0.26 : isArrangementGrid ? 0.24 : isMixerGrid ? 0.25 : isPatchSignalTruth ? 0.31 : 0.33));
  const lineStep = Math.round(Math.max(
    28,
    Math.min(44, canvas.height * (isSequenceGrid ? 0.066 : isArrangementGrid ? 0.058 : isMixerGrid ? 0.064 : isPatchSignalTruth ? 0.072 : 0.084)),
  ));

  context.fillStyle = screen.accentColor;
  context.globalAlpha = 0.68;
  context.font = `700 ${titleFontSize}px monospace`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(screen.title.toUpperCase(), 62, 54);
  context.globalAlpha = 1;

  context.fillStyle = "rgba(233, 251, 255, 0.64)";
  context.font = `700 ${lineFontSize}px monospace`;
  screen.lines.forEach((line, index) => {
    context.fillText(line, 72, lineStartY + index * lineStep);
  });

  if (screen.kind === "sequence-grid") {
    const sequence = screen.sequence;
    const gridX = 468;
    const gridY = 122;
    const columnCount = 5;
    const rowCount = 4;
    const cellWidth = 84;
    const cellHeight = 56;
    const columnGap = 10;
    const rowGap = 12;
    const trackHeaderY = 88;
    const sceneHeaderX = 430;

    context.fillStyle = "rgba(233, 251, 255, 0.22)";
    context.fillRect(sceneHeaderX - 6, gridY - 10, 2, rowCount * cellHeight + (rowCount - 1) * rowGap + 16);

    const drawTrackHeader = (label: string, color: string, x: number) => {
      context.fillStyle = color;
      context.globalAlpha = 0.86;
      context.font = "700 20px monospace";
      context.textAlign = "center";
      context.fillText(label.toUpperCase(), x + cellWidth / 2, trackHeaderY);
      context.globalAlpha = 1;
    };

    const drawSceneHeader = (label: string, isSelected: boolean, y: number) => {
      context.fillStyle = isSelected ? screen.accentColor : "rgba(233, 251, 255, 0.58)";
      context.globalAlpha = isSelected ? 0.96 : 0.68;
      context.font = isSelected ? "700 18px monospace" : "700 16px monospace";
      context.textAlign = "right";
      context.fillText(label, sceneHeaderX, y + 19);
      context.globalAlpha = 1;
    };

    const statePalette: Record<DawClipState, { fill: string; text: string; border: string }> = {
      empty: { fill: "rgba(9, 15, 25, 0.82)", text: "rgba(169, 189, 201, 0.72)", border: "rgba(95, 113, 134, 0.34)" },
      armed: { fill: "rgba(120, 86, 16, 0.78)", text: "#ffe7a6", border: "rgba(248, 211, 106, 0.72)" },
      queued: { fill: "rgba(83, 63, 18, 0.8)", text: "#f8d36a", border: "rgba(248, 211, 106, 0.6)" },
      stopped: { fill: "rgba(17, 30, 50, 0.86)", text: "#c6d7e6", border: "rgba(111, 134, 163, 0.58)" },
      playing: { fill: "rgba(16, 58, 64, 0.88)", text: "#bff7ff", border: "rgba(87, 243, 255, 0.84)" },
      recording: { fill: "rgba(87, 25, 42, 0.9)", text: "#ffd1da", border: "rgba(255, 102, 124, 0.9)" },
    };

    const getStateLabel = (state: DawClipState) => {
      switch (state) {
        case "armed":
          return "ARM";
        case "queued":
          return "QED";
        case "playing":
          return "PLAY";
        case "recording":
          return "REC";
        case "stopped":
          return "STOP";
        case "empty":
        default:
          return "EMPTY";
      }
    };

    if (!sequence) {
      for (let row = 0; row < rowCount; row += 1) {
        for (let column = 0; column < columnCount; column += 1) {
          const x = gridX + column * (cellWidth + columnGap);
          const y = gridY + row * (cellHeight + rowGap);
          context.fillStyle = "rgba(87, 243, 255, 0.06)";
          context.fillRect(x, y, cellWidth, cellHeight);
          context.strokeStyle = "rgba(87, 243, 255, 0.22)";
          context.lineWidth = 2;
          context.strokeRect(x, y, cellWidth, cellHeight);
        }
      }
    } else {
      sequence.tracks.slice(0, columnCount).forEach((track, columnIndex) => {
        drawTrackHeader(track.label, track.color, gridX + columnIndex * (cellWidth + columnGap));
      });

      sequence.scenes.slice(0, rowCount).forEach((scene, rowIndex) => {
        const rowTop = gridY + rowIndex * (cellHeight + rowGap);
        drawSceneHeader(String(scene).padStart(2, "0"), sequence.cells.some((cell) => cell.clip.sceneIndex === rowIndex && cell.isSelected), rowTop);
      });

      sequence.cells.forEach((cell) => {
        const columnIndex = sequence.tracks.findIndex((track) => track.id === cell.track.id);
        const rowIndex = cell.clip.sceneIndex;

        if (columnIndex < 0 || rowIndex < 0 || columnIndex >= columnCount || rowIndex >= rowCount) {
          return;
        }

        const x = gridX + columnIndex * (cellWidth + columnGap);
        const y = gridY + rowIndex * (cellHeight + rowGap);
        const palette = statePalette[cell.clip.state];
        const isSelected = cell.isSelected;
        const noteDensityMarkers = Math.max(0, Math.min(4, cell.noteDensityMarkers));
        const cellGlowAlpha = isSelected ? 0.24 : cell.clip.state === "playing" || cell.clip.state === "recording" ? 0.18 : 0.08;

        context.fillStyle = palette.fill;
        context.fillRect(x, y, cellWidth, cellHeight);
        context.fillStyle = cell.track.color;
        context.globalAlpha = cellGlowAlpha;
        context.fillRect(x, y, cellWidth, 4);
        context.globalAlpha = 1;

        context.strokeStyle = isSelected ? screen.accentColor : palette.border;
        context.lineWidth = isSelected ? 4 : 2;
        context.strokeRect(x + (isSelected ? 0.5 : 1), y + (isSelected ? 0.5 : 1), cellWidth - (isSelected ? 1 : 2), cellHeight - (isSelected ? 1 : 2));

        if (isSelected) {
          context.fillStyle = "rgba(233, 251, 255, 0.14)";
          context.fillRect(x + 3, y + 3, cellWidth - 6, cellHeight - 6);
        }

        context.fillStyle = palette.text;
        context.globalAlpha = cell.clip.state === "empty" ? 0.7 : 0.95;
        context.font = isSelected ? "700 20px monospace" : "700 18px monospace";
        context.textAlign = "left";
        context.fillText(getStateLabel(cell.clip.state), x + 8, y + 8);
        context.globalAlpha = 1;

        if (cell.noteCount > 0) {
          context.fillStyle = "rgba(233, 251, 255, 0.72)";
          context.font = "600 12px monospace";
          context.textAlign = "right";
          context.fillText(`${String(cell.noteCount).padStart(2, "0")} N`, x + cellWidth - 7, y + 10);
        }

        for (let markerIndex = 0; markerIndex < noteDensityMarkers; markerIndex += 1) {
          context.fillStyle = markerIndex === 0 && cell.clip.state === "recording"
            ? "#ff667c"
            : markerIndex === 0 && cell.clip.state === "playing"
              ? "#57f3ff"
              : cell.track.color;
          context.globalAlpha = 0.86 - markerIndex * 0.08;
          context.fillRect(x + 7 + markerIndex * 10, y + cellHeight - 12, 6, 7);
        }
        context.globalAlpha = 1;

        if (cell.hasGuitarLabel) {
          context.fillStyle = "#f8d36a";
          context.globalAlpha = 0.92;
          context.font = "800 14px monospace";
          context.textAlign = "left";
          context.fillText("GTR", x + 8, y + cellHeight - 15);
          context.globalAlpha = 1;
        }

        if (cell.clip.state === "playing" && cell.lastPlaybackNoteId) {
          context.fillStyle = "#57f3ff";
          context.globalAlpha = 0.85;
          context.fillRect(x + cellWidth - 14, y + cellHeight - 16, 6, 10);
          context.globalAlpha = 1;
        }
      });
    }
  } else if (screen.kind === "arrangement-grid") {
    const arrangement = screen.arrangement;
    const laneTracks = arrangement?.tracks ?? [];
    const bars = arrangement?.bars ?? [1, 2, 3, 4, 5, 6, 7, 8];
    const blocks = arrangement?.blocks ?? [];
    const gridLeft = 218;
    const gridTop = 120;
    const gridRight = 58;
    const gridBottom = 80;
    const laneCount = Math.max(1, laneTracks.length);
    const contentWidth = canvas.width - gridLeft - gridRight;
    const contentHeight = canvas.height - gridTop - gridBottom;
    const laneHeight = contentHeight / laneCount;
    const barWidth = contentWidth / Math.max(1, bars.length);
    const statePalette: Record<DawClipState, { fill: string; text: string; border: string }> = {
      empty: { fill: "rgba(9, 15, 25, 0.82)", text: "rgba(169, 189, 201, 0.72)", border: "rgba(95, 113, 134, 0.34)" },
      armed: { fill: "rgba(120, 86, 16, 0.78)", text: "#ffe7a6", border: "rgba(248, 211, 106, 0.72)" },
      queued: { fill: "rgba(83, 63, 18, 0.8)", text: "#f8d36a", border: "rgba(248, 211, 106, 0.6)" },
      stopped: { fill: "rgba(17, 30, 50, 0.86)", text: "#c6d7e6", border: "rgba(111, 134, 163, 0.58)" },
      playing: { fill: "rgba(16, 58, 64, 0.88)", text: "#bff7ff", border: "rgba(87, 243, 255, 0.84)" },
      recording: { fill: "rgba(87, 25, 42, 0.9)", text: "#ffd1da", border: "rgba(255, 102, 124, 0.9)" },
    };

    context.fillStyle = "rgba(233, 251, 255, 0.18)";
    context.fillRect(gridLeft - 18, gridTop - 8, 2, laneCount * laneHeight + 10);

    bars.forEach((bar) => {
      const x = gridLeft + (bar - 1) * barWidth;
      context.fillStyle = bar % 2 === 1 ? "rgba(87, 243, 255, 0.08)" : "rgba(233, 251, 255, 0.04)";
      context.fillRect(x + 1, gridTop - 24, barWidth - 2, contentHeight + 24);
      context.strokeStyle = bar === 1 ? screen.accentColor : "rgba(233, 251, 255, 0.16)";
      context.globalAlpha = bar === 1 ? 0.62 : 0.28;
      context.lineWidth = bar === 1 ? 3 : 1.5;
      context.beginPath();
      context.moveTo(x, gridTop - 10);
      context.lineTo(x, gridTop + contentHeight);
      context.stroke();
      context.globalAlpha = 1;

      context.fillStyle = bar === 1 ? screen.accentColor : "rgba(233, 251, 255, 0.62)";
      context.font = bar === 1 ? "800 24px monospace" : "700 20px monospace";
      context.textAlign = "center";
      context.fillText(String(bar), x + barWidth / 2, gridTop - 50);
      context.fillStyle = "rgba(233, 251, 255, 0.48)";
      context.font = "700 14px monospace";
      context.fillText(`BAR ${String(bar).padStart(2, "0")}`, x + barWidth / 2, gridTop - 24);
    });

    laneTracks.forEach((track, laneIndex) => {
      const laneTop = gridTop + laneIndex * laneHeight;
      const laneCenterY = laneTop + laneHeight / 2;
      context.fillStyle = track.color;
      context.globalAlpha = 0.22;
      context.fillRect(gridLeft - 18, laneTop + 2, contentWidth + 16, Math.max(1, laneHeight - 4));
      context.globalAlpha = 1;
      context.strokeStyle = "rgba(233, 251, 255, 0.08)";
      context.lineWidth = 1;
      context.strokeRect(gridLeft - 18.5, laneTop + 0.5, contentWidth + 16, laneHeight - 1);

      context.fillStyle = track.color;
      context.font = "800 24px monospace";
      context.textAlign = "right";
      context.fillText(fitCanvasText(context, track.label.toUpperCase(), gridLeft - 84), gridLeft - 28, laneCenterY - 8);
      context.fillStyle = "rgba(233, 251, 255, 0.74)";
      context.font = "700 14px monospace";
      context.fillText(fitCanvasText(context, track.sourceLabel, gridLeft - 84), gridLeft - 28, laneCenterY + 16);
    });

    blocks.forEach((block) => {
      const laneTop = gridTop + block.laneIndex * laneHeight;
      const x = gridLeft + (block.startBar - 1) * barWidth + 6;
      const blockWidth = Math.max(24, (block.endBar - block.startBar + 1) * barWidth - 12);
      const blockHeight = Math.max(34, laneHeight - 22);
      const blockY = laneTop + (laneHeight - blockHeight) / 2;
      const palette = statePalette[block.clip.state];
      const clipStateColors = getClipStateColors(block.clip.state);
      const isFmGuitarBlock = block.hasGuitarLabel;

      context.fillStyle = palette.fill;
      context.fillRect(x, blockY, blockWidth, blockHeight);
      context.fillStyle = block.track.color;
      context.globalAlpha = block.clip.state === "playing" || block.clip.state === "recording" ? 0.28 : 0.18;
      context.fillRect(x, blockY, blockWidth, 5);
      context.globalAlpha = 1;

      context.strokeStyle = block.clip.state === "playing" || block.clip.state === "recording" ? clipStateColors.emissive : palette.border;
      context.lineWidth = block.clip.state === "playing" || block.clip.state === "recording" ? 4 : 2;
      context.strokeRect(
        x + (block.clip.state === "playing" || block.clip.state === "recording" ? 0.5 : 1),
        blockY + (block.clip.state === "playing" || block.clip.state === "recording" ? 0.5 : 1),
        blockWidth - (block.clip.state === "playing" || block.clip.state === "recording" ? 1 : 2),
        blockHeight - (block.clip.state === "playing" || block.clip.state === "recording" ? 1 : 2),
      );

      context.fillStyle = palette.text;
      context.globalAlpha = 0.98;
      context.font = "800 18px monospace";
      context.textAlign = "left";
      context.fillText(block.stateLabel, x + 9, blockY + 7);

      context.fillStyle = "rgba(233, 251, 255, 0.76)";
      context.font = "700 13px monospace";
      context.textAlign = "right";
      context.fillText(`${String(block.noteCount).padStart(2, "0")} N`, x + blockWidth - 8, blockY + 10);

      context.fillStyle = isFmGuitarBlock ? "#f8d36a" : block.track.color;
      context.font = "800 15px monospace";
      context.textAlign = "left";
      context.fillText(fitCanvasText(context, block.label, blockWidth - 18), x + 9, blockY + blockHeight - 29);

      context.fillStyle = isFmGuitarBlock ? "#f8d36a" : "rgba(233, 251, 255, 0.82)";
      context.font = "700 13px monospace";
      context.fillText(fitCanvasText(context, block.sourceLabel, blockWidth - 18), x + 9, blockY + blockHeight - 12);

      const markerCount = Math.max(0, Math.min(4, block.noteDensityMarkers));
      for (let markerIndex = 0; markerIndex < markerCount; markerIndex += 1) {
        context.fillStyle = markerIndex === 0 && block.clip.state === "recording"
          ? "#ff667c"
          : markerIndex === 0 && block.clip.state === "playing"
            ? "#57f3ff"
            : block.track.color;
        context.globalAlpha = 0.9 - markerIndex * 0.08;
        context.fillRect(x + 8 + markerIndex * 11, blockY + blockHeight - 12, 7, 6);
      }
      context.globalAlpha = 1;
    });

    const playheadBar = Math.max(1, Math.min(bars.length, arrangement?.playheadBar ?? 1));
    const playheadBeat = Math.max(1, arrangement?.playheadBeat ?? 1);
    const beatOffset = Math.max(0, Math.min(0.75, (playheadBeat - 1) / 4));
    const playheadX = gridLeft + ((playheadBar - 1) + beatOffset) * barWidth;
    const playheadMoving = arrangement?.playheadIsMoving ?? false;
    const playheadColor = playheadMoving ? screen.accentColor : "rgba(169, 189, 201, 0.76)";

    context.fillStyle = playheadMoving ? "rgba(87, 243, 255, 0.12)" : "rgba(169, 189, 201, 0.08)";
    context.fillRect(playheadX - 2, gridTop - 18, 4, contentHeight + 18);
    context.strokeStyle = playheadColor;
    context.globalAlpha = playheadMoving ? 0.96 : 0.72;
    context.lineWidth = playheadMoving ? 4 : 3;
    context.beginPath();
    context.moveTo(playheadX, gridTop - 12);
    context.lineTo(playheadX, gridTop + contentHeight);
    context.stroke();
    context.globalAlpha = 1;

    context.fillStyle = playheadColor;
    context.globalAlpha = playheadMoving ? 0.96 : 0.8;
    context.beginPath();
    context.moveTo(playheadX - 8, gridTop - 18);
    context.lineTo(playheadX + 8, gridTop - 18);
    context.lineTo(playheadX, gridTop - 4);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
  } else if (screen.kind === "mixer-grid") {
    const mixer = screen.mixer;
    const strips = mixer?.strips ?? [];
    const trackStripX = 468;
    const trackStripY = 140;
    const stripWidth = 86;
    const stripHeight = 200;
    const stripGap = 14;

    context.fillStyle = "rgba(233, 251, 255, 0.22)";
    context.fillRect(trackStripX - 18, trackStripY - 24, 2, stripHeight + 26);
    context.fillRect(canvas.width - 188, trackStripY - 24, 2, stripHeight + 26);

    const drawStrip = (strip: StudioMixerStripSpec, index: number) => {
      const x = trackStripX + index * (stripWidth + stripGap);
      const meterFillHeight = Math.max(6, Math.round((stripHeight - 74) * Math.max(0, Math.min(1, strip.meterLevel))));
      const meterY = trackStripY + stripHeight - 42 - meterFillHeight;

      context.fillStyle = "rgba(9, 16, 28, 0.9)";
      context.fillRect(x, trackStripY, stripWidth, stripHeight);
      context.strokeStyle = strip.accentColor;
      context.globalAlpha = 0.42;
      context.lineWidth = 2;
      context.strokeRect(x + 1, trackStripY + 1, stripWidth - 2, stripHeight - 2);
      context.globalAlpha = 1;

      context.fillStyle = strip.accentColor;
      context.globalAlpha = 0.8;
      context.fillRect(x, trackStripY, stripWidth, 6);
      context.globalAlpha = 1;

      context.fillStyle = strip.accentColor;
      context.font = "700 18px monospace";
      context.textAlign = "center";
      context.fillText(strip.label, x + stripWidth / 2, trackStripY + 18);

      context.fillStyle = "rgba(233, 251, 255, 0.9)";
      context.font = "700 15px monospace";
      context.fillText(strip.volumeLabel, x + stripWidth / 2, trackStripY + 44);

      context.fillStyle = strip.muteLabel === "MUTE" ? "#ff667c" : "#73ff4c";
      context.font = "700 15px monospace";
      context.fillText(strip.muteLabel, x + stripWidth / 2, trackStripY + 64);

      context.fillStyle = "rgba(9, 16, 28, 0.95)";
      context.fillRect(x + 28, trackStripY + 80, 30, stripHeight - 104);
      context.strokeStyle = "rgba(233, 251, 255, 0.16)";
      context.strokeRect(x + 28.5, trackStripY + 80.5, 29, stripHeight - 105);

      context.fillStyle = strip.muteLabel === "MUTE" ? "#ff667c" : strip.accentColor;
      context.fillRect(x + 30, meterY, 26, meterFillHeight);

      context.fillStyle = "rgba(233, 251, 255, 0.46)";
      context.font = "600 12px monospace";
      context.fillText(Math.round(strip.meterLevel * 100).toString().padStart(2, "0"), x + stripWidth / 2, trackStripY + stripHeight - 28);
    };

    strips.slice(0, 5).forEach(drawStrip);

    const masterX = canvas.width - 148;
    const masterHeight = 258;
    const masterMeterFillHeight = Math.max(8, Math.round((masterHeight - 92) * Math.max(0, Math.min(1, mixer?.masterMeterLevel ?? 0.02))));
    const masterMeterY = trackStripY + masterHeight - 52 - masterMeterFillHeight;

    context.fillStyle = "rgba(9, 16, 28, 0.96)";
    context.fillRect(masterX, trackStripY, 98, masterHeight);
    context.strokeStyle = screen.accentColor;
    context.globalAlpha = 0.56;
    context.lineWidth = 3;
    context.strokeRect(masterX + 1.5, trackStripY + 1.5, 95, masterHeight - 3);
    context.globalAlpha = 1;

    context.fillStyle = screen.accentColor;
    context.font = "700 18px monospace";
    context.textAlign = "center";
    context.fillText("MASTER", masterX + 49, trackStripY + 18);

    context.fillStyle = "rgba(233, 251, 255, 0.9)";
    context.font = "700 15px monospace";
    context.fillText(mixer?.masterVolumeLabel ?? "V00", masterX + 49, trackStripY + 44);

    context.fillStyle = mixer?.masterMuteLabel === "MUTE" ? "#ff667c" : "#73ff4c";
    context.fillText(mixer?.masterMuteLabel ?? "MUTE", masterX + 49, trackStripY + 64);

    context.fillStyle = "rgba(9, 16, 28, 0.95)";
    context.fillRect(masterX + 34, trackStripY + 80, 30, masterHeight - 104);
    context.strokeStyle = "rgba(233, 251, 255, 0.16)";
    context.strokeRect(masterX + 34.5, trackStripY + 80.5, 29, masterHeight - 105);
    context.fillStyle = screen.accentColor;
    context.fillRect(masterX + 36, masterMeterY, 26, masterMeterFillHeight);
    context.fillStyle = "rgba(233, 251, 255, 0.46)";
    context.font = "600 12px monospace";
    context.fillText(Math.round((mixer?.masterMeterLevel ?? 0.02) * 100).toString().padStart(2, "0"), masterX + 49, trackStripY + masterHeight - 28);

    context.fillStyle = "rgba(233, 251, 255, 0.58)";
    context.font = "700 19px monospace";
    context.textAlign = "left";
    context.fillText("ENGINE", 70, 300);
    context.fillStyle = screen.accentColor;
    context.font = "800 22px monospace";
    context.fillText(mixer?.engineLine ?? "ENGINE OFF", 70, 330);
    context.fillStyle = "rgba(233, 251, 255, 0.58)";
    context.font = "700 19px monospace";
    context.fillText("SILENCE", 70, 370);
    context.fillStyle = "#f8d36a";
    context.font = "800 20px monospace";
    context.fillText(mixer?.silenceLine ?? "SILENCE ENGINE OFF", 70, 398);
    context.fillStyle = "rgba(233, 251, 255, 0.58)";
    context.font = "700 19px monospace";
    context.fillText("LAST SOUND", 70, 438);
    context.fillStyle = "#57f3ff";
    context.font = "800 20px monospace";
    context.fillText(mixer?.lastSoundLine ?? "LAST SOUND --", 70, 466);
  } else if (screen.kind === "clip-grid") {
    const gridX = 442;
    const gridY = 128;
    const cellWidth = 42;
    const cellHeight = 28;

    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        context.fillStyle = "rgba(87, 243, 255, 0.08)";
        context.fillRect(gridX + column * 50, gridY + row * 38, cellWidth, cellHeight);
        context.strokeStyle = screen.accentColor;
        context.globalAlpha = 0.22;
        context.lineWidth = 2;
        context.strokeRect(gridX + column * 50, gridY + row * 38, cellWidth, cellHeight);
        context.globalAlpha = 1;
      }
    }
  }

  context.fillStyle = "rgba(169, 189, 201, 0.46)";
  context.font = "700 22px monospace";
  context.textAlign = "right";
  context.fillText(
    screen.kind === "sequence-grid"
      ? "5X4 SESSION VIEW"
      : screen.kind === "arrangement-grid"
        ? "8 BAR ARRANGEMENT"
      : screen.kind === "mixer-grid"
        ? "5 STRIP MIXER"
        : screen.id === "studio-truth"
          ? "PATCH / SIGNAL"
          : "STATIC PLAN",
      canvas.width - 62,
      canvas.height - 62,
    );

  return canvas;
}

function StudioOverviewScreen({ screen }: { screen: StudioOverviewScreenSpec }) {
  const screenCanvas = useMemo(() => createStudioOverviewScreenCanvas(screen), [screen]);

  return (
    <group position={screen.position} rotation={screen.rotation}>
      <mesh position={[0, 0, -0.026]}>
        <boxGeometry args={[screen.size[0] + 0.14, screen.size[1] + 0.12, 0.05]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: "#03070f", emissiveIntensity: 0.16, roughness: 0.72, metalness: 0.08 }]} />
      </mesh>
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={screen.size} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.78, toneMapped: false }]}>
          <canvasTexture key={`studio-overview-${screen.id}`} attach="map" args={[screenCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, -screen.size[1] / 2 + 0.06, 0.02]}>
        <boxGeometry args={[screen.size[0] * 0.72, 0.026, 0.018]} />
        <meshBasicMaterial args={[{ color: screen.accentColor, transparent: true, opacity: 0.22, toneMapped: false }]} />
      </mesh>
    </group>
  );
}

function formatDawTransportLines(localDawState?: LocalDawState) {
  if (!localDawState) {
    return ["120 BPM", "4 / 4", "STOPPED", "LOCAL PREVIEW LATER"];
  }

  return [
    `${localDawState.transport.bpm} BPM`,
    localDawState.transport.timeSignature,
    localDawState.transport.state.toUpperCase(),
    `BAR ${localDawState.transport.bar}.${localDawState.transport.beat}`,
  ];
}

function formatArrangementTransportBarBeat(bar: number, beat: number) {
  return `B${String(bar).padStart(2, "0")}.${String(beat).padStart(2, "0")}`;
}

function formatArrangementTransportState(state?: LocalDawState["transport"]["state"] | SharedDawTransport["state"]) {
  if (state === "playing") {
    return "PLAY";
  }

  if (state === "paused") {
    return "PAUSE";
  }

  return "STOP";
}

function formatDawTrackLines(localDawState?: LocalDawState) {
  return (localDawState?.tracks.map((track) => (
    `${track.label.toUpperCase()} V${String(Math.round(track.volume * 100)).padStart(2, "0")} ${track.muted ? "MUTE" : "ON"}`
  )) ?? [
    "DRUMS",
    "BASS",
    "FM SYNTH",
    "PIANO",
    "LOOPER",
  ]).slice(0, 5);
}

function getStudioStatusEngineLine(localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return "ENGINE OFF";
  }

  if (localDawAudioState.isMuted) {
    return "ENGINE MUTED";
  }

  if (localDawAudioState.masterVolume <= 0) {
    return "ENGINE VOL 0";
  }

  return "ENGINE READY";
}

function getStudioStatusMasterLine(localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return "MASTER --";
  }

  const displayPercent = Math.round((localDawAudioState.masterVolume / STUDIO_DISPLAY_MAX_MASTER_VOLUME) * 100);

  return `MASTER ${Math.max(0, Math.min(100, displayPercent))}%`;
}

function getStudioStatusGuitarLine({
  guitarHolderLabel,
  isLocalHoldingGuitar,
  isGuitarHeldByAnyone,
  recordingStatus,
}: {
  guitarHolderLabel: string | null;
  isLocalHoldingGuitar: boolean;
  isGuitarHeldByAnyone: boolean;
  recordingStatus?: StudioGuitarRecordingStatus;
}) {
  if (isLocalHoldingGuitar && recordingStatus?.isEnabled) {
    return `GTR REC ${recordingStatus.caption}`;
  }

  if (isLocalHoldingGuitar) {
    return "GTR HELD BY YOU / LIVE";
  }

  if (isGuitarHeldByAnyone) {
    return `GTR HELD BY ${guitarHolderLabel ?? "FRIEND"}`;
  }

  return "GTR AVAILABLE";
}

function getStudioStatusActivityLine(localDawState?: LocalDawState, localDawAudioState?: LocalDawAudioEngineState) {
  const recordingClip = localDawState?.clips.find((clip) => clip.state === "recording");
  const playingClip = localDawState?.clips.find((clip) => clip.state === "playing");
  const trackLabel = (trackId: DawTrackId) => (
    localDawState?.tracks.find((track) => track.id === trackId)?.label.toUpperCase() ?? trackId.toUpperCase()
  );

  if (recordingClip) {
    return `NOW REC ${trackLabel(recordingClip.trackId)} S${recordingClip.sceneIndex + 1}`;
  }

  if (playingClip) {
    return `NOW PLAY ${trackLabel(playingClip.trackId)} S${playingClip.sceneIndex + 1}`;
  }

  if (localDawAudioState?.lastFmSynthNoteLabel) {
    return `LIVE FM ${localDawAudioState.lastFmSynthNoteLabel}`;
  }

  if (localDawAudioState?.lastPianoLiveNoteLabel) {
    return `LIVE PIANO ${localDawAudioState.lastPianoLiveNoteLabel}`;
  }

  if (localDawAudioState?.lastDrumHitLabel) {
    return `LIVE DRUM ${localDawAudioState.lastDrumHitLabel}`;
  }

  if (localDawAudioState?.lastBassNoteLabel) {
    return `LIVE BASS ${localDawAudioState.lastBassNoteLabel}`;
  }

  return "NOW IDLE";
}

function getStudioStatusNextAction({
  isGuitarHeldByAnyone,
  isLocalHoldingGuitar,
  localDawAudioState,
  localDawState,
  recordingStatus,
}: {
  isGuitarHeldByAnyone: boolean;
  isLocalHoldingGuitar: boolean;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  recordingStatus?: StudioGuitarRecordingStatus;
}) {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return "NEXT: PRESS ENGINE";
  }

  if (localDawAudioState.isMuted) {
    return "NEXT: UNMUTE";
  }

  if (localDawAudioState.masterVolume <= 0) {
    return "NEXT: TURN UP MASTER";
  }

  if (!isGuitarHeldByAnyone) {
    return "NEXT: PICK GUITAR";
  }

  if (isLocalHoldingGuitar && recordingStatus?.isEnabled) {
    return "NEXT: STRUM TO RECORD";
  }

  if (isLocalHoldingGuitar) {
    return "NEXT: CLICK STRUM / 1-9";
  }

  if (localDawState?.clips.some((clip) => clip.state === "recording")) {
    return "NEXT: PLAY OR STOP REC";
  }

  if (localDawState?.clips.some((clip) => clip.state === "playing")) {
    return "NEXT: LISTEN OR MIX";
  }

  return "NEXT: ARM REC OR PLAY CLIP";
}

function formatBigStudioStatusLines({
  guitarHolderLabel,
  isGuitarHeldByAnyone,
  isLocalHoldingGuitar,
  localDawAudioState,
  localDawState,
  recordingStatus,
}: {
  guitarHolderLabel: string | null;
  isGuitarHeldByAnyone: boolean;
  isLocalHoldingGuitar: boolean;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  recordingStatus?: StudioGuitarRecordingStatus;
}) {
  return [
    getStudioStatusEngineLine(localDawAudioState),
    getStudioStatusMasterLine(localDawAudioState),
    getStudioStatusGuitarLine({
      guitarHolderLabel,
      isGuitarHeldByAnyone,
      isLocalHoldingGuitar,
      recordingStatus,
    }),
    getStudioStatusActivityLine(localDawState, localDawAudioState),
    getStudioStatusNextAction({
      isGuitarHeldByAnyone,
      isLocalHoldingGuitar,
      localDawAudioState,
      localDawState,
      recordingStatus,
    }),
  ];
}

function getStudioMixerSilenceLine(localDawState?: LocalDawState, localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return "SILENCE ENGINE OFF";
  }

  if (localDawAudioState.isMuted) {
    return "SILENCE ENGINE MUTED";
  }

  if (localDawAudioState.masterVolume <= 0) {
    return "SILENCE MASTER 0";
  }

  if (!localDawState?.tracks.some((track) => !track.muted && track.volume > 0)) {
    return "SILENCE ALL TRACKS MUTED";
  }

  return "SILENCE NO ACTIVE VOICE";
}

function getStudioMixerLastSoundLine(localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawAudioState) {
    return "LAST SOUND --";
  }

  if (localDawAudioState.lastPianoLiveNoteLabel) {
    return `LAST LIVE PN ${localDawAudioState.lastPianoLiveNoteLabel}`;
  }

  if (localDawAudioState.lastDrumHitLabel) {
    return `LAST GEN DR ${localDawAudioState.lastDrumHitLabel}`;
  }

  if (localDawAudioState.lastFmSynthNoteLabel) {
    return `LAST GEN FM ${localDawAudioState.lastFmSynthNoteLabel}`;
  }

  if (localDawAudioState.lastBassNoteLabel) {
    return `LAST GEN BA ${localDawAudioState.lastBassNoteLabel}`;
  }

  return "LAST SOUND --";
}

function createStudioMixerMonitor(localDawState?: LocalDawState, localDawAudioState?: LocalDawAudioEngineState): StudioMixerMonitorSpec {
  const strips = (localDawState?.tracks.slice(0, 5) ?? []).map((track) => ({
    accentColor: track.color,
    label: track.label.toUpperCase(),
    meterLevel: localDawState ? getTrackMeterLevel(localDawState, localDawAudioState, track) : 0.02,
    muteLabel: track.muted ? "MUTE" : "OPEN",
    volumeLabel: `V${String(Math.round(track.volume * 100)).padStart(2, "0")}`,
  }));
  const masterVolume = localDawAudioState?.masterVolume ?? 0;
  const masterMuted = localDawAudioState?.isMuted ?? true;
  const masterMeterLevel = localDawState ? getMasterMeterLevel(localDawState, localDawAudioState) : 0.02;
  const engineLine = getStudioStatusEngineLine(localDawAudioState);
  const silenceLine = getStudioMixerSilenceLine(localDawState, localDawAudioState);
  const lastSoundLine = getStudioMixerLastSoundLine(localDawAudioState);

  return {
    engineLine,
    lastSoundLine,
    lines: [
      engineLine,
      `MASTER ${Math.max(0, Math.min(100, Math.round((masterVolume / STUDIO_DISPLAY_MAX_MASTER_VOLUME) * 100)))}% ${masterMuted ? "MUTE" : "OPEN"}`,
      silenceLine,
      lastSoundLine,
      "5 TRACK STRIPS",
    ],
    masterMeterLevel,
    masterMuteLabel: masterMuted ? "MUTE" : "OPEN",
    masterVolumeLabel: `V${String(Math.round(masterVolume * 100)).padStart(2, "0")}`,
    silenceLine,
    strips,
  };
}

function getSequenceClipStateLabel(state: DawClipState) {
  switch (state) {
    case "armed":
      return "ARM";
    case "queued":
      return "QED";
    case "playing":
      return "PLAY";
    case "recording":
      return "REC";
    case "stopped":
      return "STOP";
    case "empty":
    default:
      return "EMPTY";
  }
}

function getArrangementNoteSourceLabel(source: LocalDawMidiNoteEvent["source"]) {
  switch (source) {
    case "piano-live":
      return "PNO LIVE";
    case "guitar-live":
      return "GTR LIVE";
    case "shared-import":
      return "IMPORT";
    default:
      return "LIVE";
  }
}

function getArrangementTrackSourceLabel(trackId: DawTrackId) {
  switch (trackId) {
    case "drums":
      return "DRUM LOOPS";
    case "bass":
      return "BASS PATTERN";
    case "fm-synth":
      return "FM SYNTH / GTR";
    case "piano":
      return "PIANO NOTES";
    case "looper":
      return "LOOPER CLIPS";
    default:
      return "TRACK CLIPS";
  }
}

function getArrangementClipSourceLabel(clip: LocalDawClip, hasGuitarNotes: boolean) {
  const sceneLabel = `S${String(clip.sceneIndex + 1).padStart(2, "0")}`;

  if (clip.trackId === "fm-synth" && hasGuitarNotes) {
    return clip.state === "recording" ? `GTR REC FM ${sceneLabel}` : `GTR IN FM ${sceneLabel}`;
  }

  switch (clip.trackId) {
    case "drums":
      return `DRUM LOOP ${sceneLabel}`;
    case "bass":
      return `BASS LINE ${sceneLabel}`;
    case "fm-synth":
      return `FM CLIP ${sceneLabel}`;
    case "piano":
      return `PIANO NOTES ${sceneLabel}`;
    case "looper":
      return `LOOPER ${clip.lengthBars} BAR ${sceneLabel}`;
    default:
      return clip.label.toUpperCase();
  }
}

function getArrangementSourceSummaryLabel(
  notes: LocalDawMidiNoteEvent[],
  trackId: DawTrackId,
  clipState?: DawClipState,
) {
  const sourceSet = new Set(notes.map((note) => note.source));

  if (sourceSet.size === 0) {
    return getArrangementTrackSourceLabel(trackId);
  }

  const labels: string[] = [];

  if (trackId === "fm-synth" && sourceSet.has("guitar-live")) {
    labels.push(clipState === "recording" ? "GTR REC FM" : "GTR IN FM");
    sourceSet.delete("guitar-live");
  }

  const sourcePriority: LocalDawMidiNoteEvent["source"][] = ["piano-live", "shared-import", "guitar-live"];

  sourcePriority.forEach((source) => {
    if (sourceSet.has(source)) {
      labels.push(getArrangementNoteSourceLabel(source));
      sourceSet.delete(source);
    }
  });

  sourceSet.forEach((source) => {
    labels.push(getArrangementNoteSourceLabel(source));
  });

  return labels.join(labels.length > 1 ? " + " : "");
}

function fitCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;

  while (trimmed.length > 1 && context.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
}

function getArrangementPlaybackGuidanceLine(
  localDawState: LocalDawState | undefined,
  localDawAudioState: LocalDawAudioEngineState | undefined,
  sharedDawTransport: SharedDawTransport | undefined,
) {
  const engineLine = getStudioStatusEngineLine(localDawAudioState);
  const localTransportState = localDawState?.transport.state;
  const sharedTransportState = sharedDawTransport?.state;

  if (engineLine === "ENGINE OFF") {
    return "ENGINE OFF: SILENT HERE | DISCORD NOT APP AUDIO";
  }

  if (engineLine === "ENGINE MUTED") {
    return "ENGINE MUTED: SILENT HERE | DISCORD NOT APP AUDIO";
  }

  if (engineLine === "ENGINE VOL 0") {
    return "ENGINE VOL 0: SILENT HERE | DISCORD NOT APP AUDIO";
  }

  if (sharedTransportState === "playing") {
    return "SHARED PLAY: EACH ENGINE ON | DISCORD NOT APP AUDIO";
  }

  if (localTransportState === "playing") {
    return "LOCAL LIVE: THIS BROWSER | DISCORD NOT APP AUDIO";
  }

  if (sharedTransportState) {
    return "SHARED PLAY STOPPED | ENGINE ON TO HEAR HERE";
  }

  return "LOCAL LIVE: THIS BROWSER | DISCORD NOT APP AUDIO";
}

function createStudioArrangementTimelineMonitor(
  localDawState?: LocalDawState,
  localDawAudioState?: LocalDawAudioEngineState,
  sharedDawTransport?: SharedDawTransport,
): StudioArrangementTimelineSpec & { lines: string[] } {
  if (!localDawState) {
    return {
      bars: [1, 2, 3, 4, 5, 6, 7, 8],
      blocks: [],
      playheadBeat: 1,
      playheadBar: 1,
      playheadIsMoving: false,
      lines: [
        "8 BAR MAP",
        "5 REAL LANES / 0 CLIPS / 0 NOTES / 0 SOURCE BLOCKS",
        sharedDawTransport ? `SHARED ${formatArrangementTransportState(sharedDawTransport.state)} ${formatArrangementTransportBarBeat(sharedDawTransport.anchorBar, sharedDawTransport.anchorBeat)}` : "SHARED LOCAL ONLY",
        "LANES DRUMS BASS FM SYNTH PIANO LOOPER",
        "SCOPE LOCAL | PLAYHEAD B01.01",
        getArrangementPlaybackGuidanceLine(localDawState, localDawAudioState, sharedDawTransport),
      ],
      tracks: [],
      transportScopeLabel: sharedDawTransport ? "SHARED" : "LOCAL",
    };
  }

  const notesByClipId = new Map<string, LocalDawMidiNoteEvent[]>();

  localDawState.midiNotes.forEach((note) => {
    notesByClipId.set(note.clipId, [...(notesByClipId.get(note.clipId) ?? []), note]);
  });

  const tracks = localDawState.tracks.slice(0, 5).map((track) => {
    const trackNotes = localDawState.midiNotes.filter((note) => (
      localDawState.clips.some((clip) => clip.id === note.clipId && clip.trackId === track.id)
    ));

    return {
      id: track.id,
      label: track.label,
      color: track.color,
      sourceLabel: getArrangementSourceSummaryLabel(trackNotes, track.id),
    };
  });

  const blocks = tracks.flatMap((track, laneIndex) => (
    localDawState.clips
      .filter((clip) => clip.trackId === track.id)
      .sort((firstClip, secondClip) => firstClip.sceneIndex - secondClip.sceneIndex)
      .map((clip) => {
        const notes = notesByClipId.get(clip.id) ?? [];
        const guitarNotes = notes.filter((note) => note.source === "guitar-live");
        const noteDensityMarkers = notes.length === 0 ? 0 : Math.min(4, Math.ceil(notes.length / 4));
        const startBar = Math.min(8, clip.sceneIndex * 2 + 1);
        const endBar = Math.min(8, startBar + Math.max(1, clip.lengthBars) - 1);

        return {
          clip,
          hasGuitarLabel: clip.trackId === "fm-synth" && guitarNotes.length > 0,
          label: getArrangementClipSourceLabel(clip, guitarNotes.length > 0),
          laneIndex,
          noteCount: notes.length,
          noteDensityMarkers,
          startBar,
          endBar,
          sourceLabel: getArrangementSourceSummaryLabel(notes, track.id, clip.state),
          stateLabel: getSequenceClipStateLabel(clip.state),
          track,
        };
      })
  ));

  const guitarFmBlockCount = blocks.filter((block) => block.hasGuitarLabel).length;
  const totalNotes = localDawState.midiNotes.length;
  const playheadBar = Math.max(1, localDawState.transport.bar);
  const playheadBeat = Math.max(1, localDawState.transport.beat);
  const playheadIsMoving = sharedDawTransport?.state === "playing" || localDawState.transport.state === "playing";

  return {
    bars: [1, 2, 3, 4, 5, 6, 7, 8],
    blocks,
    lines: [
      "8 BAR MAP",
      `${tracks.length} LANES / ${blocks.length} CLIPS / ${totalNotes} NOTES / ${guitarFmBlockCount} GTR FM`,
      `LOCAL ${formatArrangementTransportState(localDawState.transport.state)} ${formatArrangementTransportBarBeat(playheadBar, playheadBeat)}`,
      sharedDawTransport
        ? `SHARED ${formatArrangementTransportState(sharedDawTransport.state)} ${formatArrangementTransportBarBeat(sharedDawTransport.anchorBar, sharedDawTransport.anchorBeat)}`
        : "SHARED LOCAL ONLY",
      `SCOPE ${sharedDawTransport ? "SHARED" : "LOCAL"} | PLAYHEAD ${formatArrangementTransportBarBeat(playheadBar, playheadBeat)}`,
      getArrangementPlaybackGuidanceLine(localDawState, localDawAudioState, sharedDawTransport),
    ],
    playheadBeat,
    playheadBar,
    playheadIsMoving,
    tracks,
    transportScopeLabel: sharedDawTransport ? "SHARED" : "LOCAL",
  };
}

function createStudioSequenceMonitor(localDawState?: LocalDawState): StudioSequenceMonitorSpec {
  if (!localDawState) {
    return {
      lines: [
        "SCENES 01-04",
        "5 TRACKS",
        "WAITING FOR CLIPS",
        "SELECT A LANE",
        "GTR LATER",
      ],
      sequence: null,
    };
  }

  const noteCountsByClipId = new Map<string, LocalDawMidiNoteEvent[]>();

  localDawState.midiNotes.forEach((note) => {
    noteCountsByClipId.set(note.clipId, [...(noteCountsByClipId.get(note.clipId) ?? []), note]);
  });

  const tracks = localDawState.tracks.slice(0, 5).map((track) => ({
    id: track.id,
    label: track.label,
    color: track.color,
  }));
  const scenes = [1, 2, 3, 4];
  const cells: StudioSequenceGridCellSpec[] = localDawState.tracks.slice(0, 5).flatMap((track) => {
    return scenes.map((sceneNumber) => {
      const sceneIndex = sceneNumber - 1;
      const clip = (localDawState.clips.find((candidate) => candidate.trackId === track.id && candidate.sceneIndex === sceneIndex) ?? {
        id: `sequence-empty-${track.id}-${sceneIndex}`,
        label: "",
        lengthBars: 1,
        sceneIndex,
        state: "empty" as const,
        trackId: track.id,
      }) as LocalDawClip;
      const notes = noteCountsByClipId.get(clip.id) ?? [];
      const guitarNotes = notes.filter((note) => note.source === "guitar-live");
      const noteDensityMarkers = notes.length === 0 ? 0 : Math.min(4, Math.ceil(notes.length / 3));

      return {
        clip,
        hasGuitarLabel: clip.trackId === "fm-synth" && guitarNotes.length > 0,
        isLastPlayback: localDawState.lastPlaybackTrigger?.clipId === clip.id,
        isSelected: localDawState.selectedTrackId === clip.trackId && localDawState.selectedSceneIndex === clip.sceneIndex,
        lastPlaybackNoteId: localDawState.lastPlaybackTrigger?.clipId === clip.id ? localDawState.lastPlaybackTrigger.noteId : null,
        noteCount: notes.length,
        noteDensityMarkers,
        stateLabel: getSequenceClipStateLabel(clip.state),
        track,
      };
    });
  });
  const selectedTrack = localDawState.tracks.find((track) => track.id === localDawState.selectedTrackId) ?? localDawState.tracks[0];
  const selectedTrackLabel = selectedTrack?.label.toUpperCase() ?? "TRACK";
  const selectedClip = localDawState.clips.find((clip) => (
    clip.trackId === localDawState.selectedTrackId &&
    clip.sceneIndex === localDawState.selectedSceneIndex
  ));
  const selectedClipNotes = selectedClip ? noteCountsByClipId.get(selectedClip.id) ?? [] : [];
  const selectedClipLabel = selectedClip ? getSequenceClipStateLabel(selectedClip.state) : "EMPTY";
  const playingClipCount = localDawState.clips.filter((clip) => clip.state === "playing").length;
  const recordingClipCount = localDawState.clips.filter((clip) => clip.state === "recording").length;
  const armedClipCount = localDawState.clips.filter((clip) => clip.state === "armed").length;
  const guitarNotesInFmCount = localDawState.clips.reduce((count, clip) => (
    clip.trackId === "fm-synth" ? count + (noteCountsByClipId.get(clip.id)?.some((note) => note.source === "guitar-live") ? 1 : 0) : count
  ), 0);
  const selectedScene = localDawState.selectedSceneIndex + 1;

  return {
    lines: [
      `SEL ${selectedTrackLabel} S${String(selectedScene).padStart(2, "0")} ${selectedClipLabel}`,
      `${playingClipCount} PLAY ${recordingClipCount} REC ${armedClipCount} ARM`,
      guitarNotesInFmCount > 0 ? `FM GUITAR ${guitarNotesInFmCount} CLIPS` : "FM SYNTH READY",
      selectedClip ? `${selectedClipNotes.length} NOTES SELECTED` : "NO CLIP SELECTED",
      "5X4 SESSION VIEW",
    ],
    sequence: {
      cells,
      scenes,
      tracks,
    },
  };
}

function formatDawDeviceLines(localDawState?: LocalDawState) {
  if (!localDawState) {
    return ["SELECT TRACK", "DEVICE CHAIN", "LOCAL VISUAL", "NO ROUTE EDIT"];
  }

  const selectedTrack = getSelectedDawTrack(localDawState);
  const devices = getTrackDevices(localDawState, selectedTrack);
  const selectedDevice = getSelectedDawDevice(localDawState, devices);
  const deviceLines = devices.slice(0, 3).map((device) => (
    `${device.id === selectedDevice?.id ? "> " : ""}${device.label.toUpperCase()} ${device.enabled ? "ON" : "OFF"}`
  ));

  return [
    `TRACK ${selectedTrack.label.toUpperCase()}`,
    ...deviceLines,
    "LOCAL SELECT ONLY",
    "NO ROUTE EDIT",
  ].slice(0, 6);
}

function getStudioTruthEngineLine(localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return "ENGINE OFF";
  }

  if (localDawAudioState.isMuted) {
    return "MUTED";
  }

  if (localDawAudioState.masterVolume <= 0) {
    return "ENGINE VOL 0";
  }

  return "ENGINE READY";
}

function getStudioTruthState(localDawState?: LocalDawState, localDawAudioState?: LocalDawAudioEngineState) {
  const patch = localDawState?.patch;
  const engineLine = getStudioTruthEngineLine(localDawAudioState);
  const isEngineReady = engineLine === "ENGINE READY";
  const isPianoPatched = patch ? isPortPatchedToAudioInterfaceInput(patch, "piano-out") : false;
  const isDrumMixPatched = patch ? canDrumMixerPatchReachInterface(patch) : false;
  const areSpeakersPatched = patch ? isAudioInterfaceOutputPatchedToSpeakers(patch) : false;

  return {
    areSpeakersPatched,
    engineLine,
    isDrumMixPatched,
    isEngineReady,
    isPianoPatched,
    isReady: isEngineReady && isPianoPatched && isDrumMixPatched && areSpeakersPatched,
  };
}

function getStudioPatchSignalLine(localDawState?: LocalDawState, localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return "SIGNAL OFF";
  }

  if (localDawAudioState.isMuted || localDawAudioState.masterVolume <= 0) {
    return "SIGNAL SILENT";
  }

  if (!localDawState?.patch) {
    return "SIGNAL LOCAL ONLY";
  }

  const hasRouteToSpeakers = (
    canPianoLivePatchReachSpeakers(localDawState.patch) ||
    (
      canDrumMixerPatchReachInterface(localDawState.patch) &&
      isAudioInterfaceOutputPatchedToSpeakers(localDawState.patch)
    )
  );

  return hasRouteToSpeakers ? "SIGNAL READY" : "SIGNAL LOCAL ONLY";
}

function formatStudioPatchSignalTruthLines({
  guitarHolderLabel,
  isGuitarHeldByAnyone,
  isLocalHoldingGuitar,
  localDawAudioState,
  localDawState,
  recordingStatus,
  sharedDawClips,
  sharedDawTransport,
}: {
  guitarHolderLabel: string | null;
  isGuitarHeldByAnyone: boolean;
  isLocalHoldingGuitar: boolean;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
  recordingStatus?: StudioGuitarRecordingStatus;
  sharedDawClips?: SharedDawClipsState;
  sharedDawTransport?: SharedDawTransport;
}) {
  const patch = localDawState?.patch;
  const pianoToSpeakers = patch ? canPianoLivePatchReachSpeakers(patch) : false;
  const drumMixToInterface = patch ? canDrumMixerPatchReachInterface(patch) : false;
  const interfaceToSpeakers = patch ? isAudioInterfaceOutputPatchedToSpeakers(patch) : false;
  const sharedClipCount = sharedDawClips?.clips.length ?? 0;
  const liveAppState = sharedDawTransport?.state === "playing" ? "PLAY" : sharedDawTransport?.state === "stopped" ? "STOP" : "LOCAL";

  return [
    getStudioStatusEngineLine(localDawAudioState),
    getStudioStatusMasterLine(localDawAudioState),
    `PATCH PIANO SPK ${pianoToSpeakers ? "Y" : "N"} / DRUM IF ${drumMixToInterface ? "Y" : "N"} / IF SPK ${interfaceToSpeakers ? "Y" : "N"}`,
    getStudioPatchSignalLine(localDawState, localDawAudioState),
    getStudioStatusGuitarLine({
      guitarHolderLabel,
      isGuitarHeldByAnyone,
      isLocalHoldingGuitar,
      recordingStatus,
    }),
    sharedDawTransport
      ? `LIVE APP ${liveAppState} ${sharedClipCount} CLIPS | FRIENDS NEED OWN ENGINE`
      : "LIVE APP LOCAL ONLY | FRIENDS NEED OWN ENGINE",
  ];
}

function getStudioTruthPanelAccentColor(localDawState?: LocalDawState, localDawAudioState?: LocalDawAudioEngineState) {
  const truth = getStudioTruthState(localDawState, localDawAudioState);

  if (truth.isReady) {
    return "#73ff4c";
  }

  if (!truth.isPianoPatched || !truth.isDrumMixPatched || !truth.areSpeakersPatched) {
    return "#ff9f4a";
  }

  return "#f8d36a";
}

function getStudioSoundActivity(localDawAudioState: LocalDawAudioEngineState | undefined, hasSpeakerPatch: boolean) {
  if (!localDawAudioState) {
    return {
      accentColor: "#5f7186",
      caption: "No Engine",
      engineLabel: "ENGINE OFF",
      hasGeneratedEvent: false,
      hasSpeakerPatch,
      isAudibleReady: false,
      isDisplayAudible: false,
      isLive: false,
      label: "Sound",
      level: 0.04,
      patchLabel: hasSpeakerPatch ? "PATCH OK" : "NO PATCH",
    };
  }

  const voiceCount = localDawAudioState.activeDrumVoiceCount + localDawAudioState.activeFmSynthVoiceCount + localDawAudioState.activeBassVoiceCount;
  const isAudibleReady = localDawAudioState.status === "ready" && !localDawAudioState.isMuted && localDawAudioState.masterVolume > 0;
  const hasActiveGeneratedVoice = voiceCount > 0 || localDawAudioState.isBassPatternAuditioning;
  const lastGeneratedLabel = localDawAudioState.lastDrumHitLabel
    ? `DR ${localDawAudioState.lastDrumHitLabel}`
    : localDawAudioState.lastPianoLiveNoteLabel
      ? `PN ${localDawAudioState.lastPianoLiveNoteLabel}`
      : localDawAudioState.lastFmSynthNoteLabel
        ? `FM ${localDawAudioState.lastFmSynthNoteLabel}`
        : localDawAudioState.lastBassNoteLabel
          ? `BA ${localDawAudioState.lastBassNoteLabel}`
          : null;
  const hasGeneratedEvent = Boolean(lastGeneratedLabel || hasActiveGeneratedVoice);
  const engineLabel = localDawAudioState.status !== "ready"
    ? "ENGINE OFF"
    : localDawAudioState.isMuted
      ? "MUTED"
      : localDawAudioState.masterVolume <= 0
        ? "VOL 0"
        : hasGeneratedEvent
          ? "ENGINE OK"
          : "NO EVENT";
  const isDisplayAudible = hasGeneratedEvent && hasSpeakerPatch && isAudibleReady;
  const level = isDisplayAudible
    ? 1
    : hasGeneratedEvent
      ? 0.34
      : hasSpeakerPatch && isAudibleReady
        ? 0.12
        : 0.06;

  return {
    accentColor: isDisplayAudible ? "#73ff4c" : hasGeneratedEvent ? "#f8d36a" : hasSpeakerPatch ? "#57f3ff" : "#5f7186",
    caption: lastGeneratedLabel ?? engineLabel,
    engineLabel: isDisplayAudible ? "AUDIBLE" : engineLabel,
    hasGeneratedEvent,
    hasSpeakerPatch,
    isAudibleReady,
    isDisplayAudible,
    isLive: isDisplayAudible,
    label: "Sound",
    level,
    patchLabel: hasSpeakerPatch ? "PATCH OK" : "NO PATCH",
  };
}

function StudioSoundActivitySpeakers({
  localDawAudioState,
  localDawState,
}: {
  localDawAudioState?: LocalDawAudioEngineState;
  localDawState?: LocalDawState;
}) {
  const hasSpeakerPatch = localDawState
    ? isPatchCablePluggedBetween(localDawState.patch, "audio-interface-out", "speaker-system-input")
    : false;
  const activity = getStudioSoundActivity(localDawAudioState, hasSpeakerPatch);
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: activity.accentColor,
    caption: activity.caption,
    isActive: activity.hasGeneratedEvent,
    label: activity.label,
  }), [activity.accentColor, activity.caption, activity.hasGeneratedEvent, activity.label]);
  const patchCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: activity.hasSpeakerPatch ? "#73ff4c" : "#ff9f4a",
    caption: `${activity.patchLabel} / ${activity.engineLabel}`,
    isActive: activity.hasSpeakerPatch,
    label: "Speaker In",
  }), [activity.engineLabel, activity.hasSpeakerPatch, activity.patchLabel]);
  const meterSegments = [0.18, 0.34, 0.5, 0.66, 0.82];
  const waveRadii = [0.22, 0.34, 0.46];
  const statusLights = useMemo(() => [
    { id: "evt", label: "EVT", isActive: activity.hasGeneratedEvent, color: "#f8d36a" },
    { id: "patch", label: "PATCH", isActive: activity.hasSpeakerPatch, color: "#57f3ff" },
    { id: "aud", label: "AUD", isActive: activity.isDisplayAudible, color: "#73ff4c" },
  ].map((light) => ({
    ...light,
    labelCanvas: createStudioStatusLightLabelCanvas(light.label, light.color, light.isActive),
  })), [activity.hasGeneratedEvent, activity.hasSpeakerPatch, activity.isDisplayAudible]);

  return (
    <group position={[-14.35, 0, 2.48]} rotation={[0, 0, 0]}>
      <mesh position={[0, 1.18, -0.035]}>
        <boxGeometry args={[2.28, 1.02, 0.07]} />
        <meshStandardMaterial args={[{ color: "#06101d", emissive: activity.accentColor, emissiveIntensity: activity.isLive ? 0.04 : 0.02, roughness: 0.72 }]} />
      </mesh>
      <mesh position={[0, 1.78, -0.08]}>
        <planeGeometry args={[1.12, 0.28]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: activity.hasGeneratedEvent ? 0.88 : 0.62, toneMapped: false }]}>
          <canvasTexture key={`studio-sound-activity-${activity.caption}-${activity.isLive ? "live" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, 0.78, -0.12]}>
        <planeGeometry args={[0.72, 0.18]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.68, toneMapped: false }]}>
          <canvasTexture key={`studio-speaker-patch-${activity.hasSpeakerPatch ? "in" : "none"}-${activity.engineLabel}`} attach="map" args={[patchCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0.48, 0.58, -0.11]}>
        <cylinderGeometry args={[0.028, 0.028, 0.016, 16]} />
        <meshBasicMaterial args={[{ color: activity.hasSpeakerPatch ? "#73ff4c" : "#ff9f4a", opacity: activity.hasSpeakerPatch ? 0.72 : 0.26, toneMapped: false, transparent: true }]} />
      </mesh>
      {statusLights.map((light, index) => (
        <group key={`studio-speaker-status-${light.id}`} position={[-0.36 + index * 0.36, 0.39, -0.12]}>
          <mesh>
            <cylinderGeometry args={[0.032, 0.032, 0.018, 16]} />
            <meshBasicMaterial args={[{ color: light.isActive ? light.color : "#273246", opacity: light.isActive ? 0.78 : 0.24, toneMapped: false, transparent: true }]} />
          </mesh>
          <mesh position={[0, -0.09, -0.002]}>
            <planeGeometry args={[0.26, 0.08]} />
            <meshBasicMaterial args={[{ transparent: true, opacity: light.isActive ? 0.82 : 0.54, toneMapped: false }]}>
              <canvasTexture key={`studio-speaker-status-label-${light.id}-${light.isActive ? "on" : "off"}`} attach="map" args={[light.labelCanvas]} />
            </meshBasicMaterial>
          </mesh>
        </group>
      ))}
      {[-0.62, 0.62].map((speakerX) => (
        <group key={`studio-speaker-${speakerX}`} position={[speakerX, 1.14, -0.09]}>
          <mesh>
            <boxGeometry args={[0.48, 0.62, 0.12]} />
            <meshStandardMaterial args={[{ color: "#0b1525", emissive: activity.accentColor, emissiveIntensity: activity.isDisplayAudible ? 0.05 : 0.02, roughness: 0.68 }]} />
          </mesh>
          <mesh position={[0, 0, -0.075]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.035, 32]} />
            <meshBasicMaterial args={[{ color: activity.accentColor, transparent: true, opacity: 0.26 + activity.level * 0.42, toneMapped: false }]} />
          </mesh>
          {waveRadii.map((radius, index) => (
            <mesh key={`studio-speaker-wave-${speakerX}-${radius}`} position={[0, 0, -0.105 - index * 0.018]}>
              <torusGeometry args={[radius, 0.008, 8, 32]} />
              <meshBasicMaterial args={[{
                color: activity.accentColor,
                opacity: activity.isDisplayAudible ? 0.42 - index * 0.1 : activity.hasGeneratedEvent ? 0.13 - index * 0.03 : 0.03,
                toneMapped: false,
                transparent: true,
              }]} />
            </mesh>
          ))}
        </group>
      ))}
      {meterSegments.map((threshold, index) => (
        <mesh key={`studio-sound-meter-${threshold}`} position={[-0.48 + index * 0.24, 0.58, -0.11]}>
          <boxGeometry args={[0.16, 0.08 + index * 0.035, 0.04]} />
          <meshBasicMaterial args={[{
            color: activity.level >= threshold ? activity.accentColor : "#1b2a3d",
            opacity: activity.level >= threshold ? 0.86 : 0.28,
            toneMapped: false,
            transparent: true,
          }]} />
        </mesh>
      ))}
    </group>
  );
}

function MarkerPost({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.12, 0.34, 0.12]} />
      <meshStandardMaterial args={[{ color: "#07111f", emissive: color, emissiveIntensity: 0.55, roughness: 0.58 }]} />
    </mesh>
  );
}

function StudioDjPlatform({ phaseVisuals }: { phaseVisuals: PhaseVisuals }) {
  const rampStepSpecs = [
    { z: 2.34, height: 0.16, depth: 0.16, opacity: 0.08 },
    { z: 2.52, height: 0.34, depth: 0.17, opacity: 0.1 },
    { z: 2.72, height: 0.56, depth: 0.18, opacity: 0.12 },
    { z: 2.94, height: 0.82, depth: 0.19, opacity: 0.14 },
    { z: 3.17, height: 1.1, depth: 0.2, opacity: 0.16 },
    { z: 3.34, height: 1.32, depth: 0.18, opacity: 0.18 },
  ];
  const rampXPositions = [STUDIO_DJ_PLATFORM_LEFT_RAMP_POSITION[0], STUDIO_DJ_PLATFORM_RIGHT_RAMP_POSITION[0]];

  return (
    <group>
      <mesh position={STUDIO_DJ_PLATFORM_CENTER}>
        <boxGeometry args={STUDIO_DJ_PLATFORM_SIZE} />
        <meshStandardMaterial args={[{ color: "#17102d", emissive: "#3b1464", emissiveIntensity: 0.2, roughness: 0.78, metalness: 0.04 }]} />
      </mesh>
      <mesh position={[STUDIO_DJ_PLATFORM_CENTER[0], STUDIO_DJ_PLATFORM_FLOOR_Y + 0.014, STUDIO_DJ_PLATFORM_CENTER[2]]}>
        <boxGeometry args={[STUDIO_DJ_PLATFORM_SIZE[0] - 0.18, 0.018, STUDIO_DJ_PLATFORM_SIZE[2] - 0.18]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent, transparent: true, opacity: 0.12, toneMapped: false }]} />
      </mesh>
      {[
        [STUDIO_DJ_PLATFORM_CENTER[0], STUDIO_DJ_PLATFORM_CENTER[2] - STUDIO_DJ_PLATFORM_SIZE[2] / 2],
        [STUDIO_DJ_PLATFORM_CENTER[0], STUDIO_DJ_PLATFORM_CENTER[2] + STUDIO_DJ_PLATFORM_SIZE[2] / 2],
      ].map(([x, z]) => (
        <mesh key={`studio-dj-platform-z-trim-${z}`} position={[x, STUDIO_DJ_PLATFORM_FLOOR_Y + 0.034, z]}>
          <boxGeometry args={[STUDIO_DJ_PLATFORM_SIZE[0], 0.036, 0.045]} />
          <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary, transparent: true, opacity: 0.42, toneMapped: false }]} />
        </mesh>
      ))}
      {[
        [STUDIO_DJ_PLATFORM_CENTER[0] - STUDIO_DJ_PLATFORM_SIZE[0] / 2, STUDIO_DJ_PLATFORM_CENTER[2]],
        [STUDIO_DJ_PLATFORM_CENTER[0] + STUDIO_DJ_PLATFORM_SIZE[0] / 2, STUDIO_DJ_PLATFORM_CENTER[2]],
      ].map(([x, z]) => (
        <mesh key={`studio-dj-platform-x-trim-${x}`} position={[x, STUDIO_DJ_PLATFORM_FLOOR_Y + 0.034, z]}>
          <boxGeometry args={[0.045, 0.036, STUDIO_DJ_PLATFORM_SIZE[2]]} />
          <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary, transparent: true, opacity: 0.34, toneMapped: false }]} />
        </mesh>
      ))}
      {rampXPositions.flatMap((x) => (
        rampStepSpecs.map((step, index) => (
          <mesh key={`studio-dj-platform-ramp-${x}-${index}`} position={[x, step.height / 2, step.z]}>
            <boxGeometry args={[STUDIO_DJ_PLATFORM_RAMP_SIZE[0], step.height, step.depth]} />
            <meshStandardMaterial args={[{ color: "#151f35", emissive: phaseVisuals.gridSecondary, emissiveIntensity: step.opacity, roughness: 0.82, metalness: 0.02 }]} />
          </mesh>
        ))
      ))}
      <mesh position={[STUDIO_DJ_PLATFORM_CENTER[0], STUDIO_DJ_PLATFORM_FLOOR_Y + 0.042, STUDIO_DJ_PLATFORM_CENTER[2] - STUDIO_DJ_PLATFORM_SIZE[2] / 2 - 0.16]}>
        <boxGeometry args={[1.18, 0.022, 0.08]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.timerAccent, transparent: true, opacity: 0.36, toneMapped: false }]} />
      </mesh>
    </group>
  );
}

function getStudioGuitarAudioReadiness(localDawAudioState?: LocalDawAudioEngineState): StudioGuitarAudioReadiness {
  if (!localDawAudioState || localDawAudioState.status !== "ready") {
    return { label: "SILENT", reason: "ENGINE OFF" };
  }

  if (localDawAudioState.isMuted) {
    return { label: "SILENT", reason: "MUTED" };
  }

  if (localDawAudioState.masterVolume <= 0) {
    return { label: "SILENT", reason: "VOLUME 0" };
  }

  return { label: "AUDIBLE", reason: "ENGINE READY" };
}

function StudioGuitarNoteStrip({
  accentColor,
  feedbackKey,
  selectedIndex,
}: {
  accentColor: string;
  feedbackKey: number;
  selectedIndex: number;
}) {
  return (
    <group position={[0, 0.095, 0.62]}>
      {Array.from({ length: 9 }, (_, index) => {
        const isSelected = index === selectedIndex;
        const opacity = isSelected ? (feedbackKey > 0 ? 0.86 : 0.68) : 0.22;

        return (
          <group key={index} position={[(index - 4) * 0.105, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.07, 0.028, 0.13]} />
              <meshBasicMaterial args={[{ color: isSelected ? accentColor : "#9aacbd", transparent: true, opacity, toneMapped: false }]} />
            </mesh>
            <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.055, 0.052]} />
              <meshBasicMaterial args={[{ color: isSelected ? "#050914" : "#16243a", transparent: true, opacity: 0.66, toneMapped: false }]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function StudioGuitarStand({
  holderLabel,
  isHeldByAnyone,
  isHeldByLocal,
  isHeldByAnother,
  localDawAudioState,
  onDrop,
  onPickup,
  onToggleRecording,
  studioGuitarBankLabel = "B1 E2-B3",
  recordingStatus,
  studioGuitarFeedbackKey = 0,
  studioGuitarNoteIndex = 0,
  studioGuitarNoteLabel = "E2",
  studioGuitarSlotIndex = 0,
}: {
  holderLabel?: string | null;
  isHeldByAnyone: boolean;
  isHeldByLocal: boolean;
  isHeldByAnother: boolean;
  localDawAudioState?: LocalDawAudioEngineState;
  onDrop?: () => void;
  onPickup?: () => void;
  onToggleRecording?: () => void;
  studioGuitarBankLabel?: string;
  recordingStatus?: StudioGuitarRecordingStatus;
  studioGuitarFeedbackKey?: number;
  studioGuitarNoteIndex?: number;
  studioGuitarNoteLabel?: string;
  studioGuitarSlotIndex?: number;
}) {
  const guitarRef = useRef<React.ElementRef<"mesh">>(null);
  const recordRef = useRef<React.ElementRef<"mesh">>(null);
  const effectiveRecordingStatus = recordingStatus ?? { caption: "REC OFF", isEnabled: false, label: "LIVE" };
  const accentColor = isHeldByLocal ? "#f8d36a" : isHeldByAnother ? "#ff8c5a" : "#57f3ff";
  const audioReadiness = getStudioGuitarAudioReadiness(localDawAudioState);
  const ownershipLabel = isHeldByLocal
    ? `HELD ${studioGuitarNoteLabel}`
    : isHeldByAnother
      ? `HELD BY ${holderLabel ?? "SOMEONE"}`
      : "GUITAR";
  const ownershipCaption = isHeldByLocal ? "CLICK DROP" : isHeldByAnother ? "WAIT" : "CLICK PICKUP";
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption: ownershipCaption,
    isActive: isHeldByLocal,
    label: ownershipLabel,
  }), [accentColor, isHeldByLocal, ownershipCaption, ownershipLabel]);
  const helpCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: "#e9fbff",
    caption: isHeldByAnother ? "ONE HOLDER" : "Q/E BANK",
    isActive: !isHeldByAnother,
    label: isHeldByAnother ? "IN USE" : "1-9 NOTES",
  }), [isHeldByAnother]);
  const noteCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor,
    caption: `${studioGuitarSlotIndex + 1} / ${studioGuitarBankLabel}`,
    isActive: isHeldByLocal,
    label: `NOTE ${studioGuitarNoteLabel}`,
  }), [accentColor, isHeldByLocal, studioGuitarBankLabel, studioGuitarNoteLabel, studioGuitarSlotIndex]);
  const audioCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: audioReadiness.label === "AUDIBLE" ? "#73ff4c" : "#f8d36a",
    caption: audioReadiness.reason,
    isActive: audioReadiness.label === "AUDIBLE",
    label: audioReadiness.label,
  }), [audioReadiness.label, audioReadiness.reason]);
  const recordingCanvas = useMemo(() => createStudioTransportControlCanvas({
    accentColor: effectiveRecordingStatus.isEnabled ? "#ff667c" : "#57f3ff",
    caption: isHeldByLocal ? effectiveRecordingStatus.caption : isHeldByAnother ? "Holder Only" : "Pick Up First",
    isActive: isHeldByLocal && effectiveRecordingStatus.isEnabled,
    label: isHeldByLocal ? effectiveRecordingStatus.label : "REC LOCK",
  }), [effectiveRecordingStatus.caption, effectiveRecordingStatus.isEnabled, effectiveRecordingStatus.label, isHeldByAnother, isHeldByLocal]);

  useRegisterInteractable(useMemo(() => ({
    id: "studio-guitar-stand",
    label: isHeldByLocal ? "Drop Guitar" : isHeldByAnother ? `Guitar Held By ${holderLabel ?? "Someone"}` : "Pick Up Guitar",
    objectRef: guitarRef,
    modes: ["clickable" as const],
    enabled: Boolean(isHeldByLocal ? onDrop : !isHeldByAnother && onPickup),
    onActivate: () => {
      if (isHeldByLocal) {
        onDrop?.();
        return;
      }

      if (!isHeldByAnother) {
        onPickup?.();
      }
    },
  }), [holderLabel, isHeldByAnother, isHeldByLocal, onDrop, onPickup]));

  useRegisterInteractable(useMemo(() => ({
    id: "studio-guitar-record-toggle",
    label: effectiveRecordingStatus.isEnabled ? "Stop Guitar Recording" : "Record Guitar",
    objectRef: recordRef,
    modes: ["clickable" as const],
    enabled: Boolean(isHeldByLocal && onToggleRecording),
    onActivate: () => {
      onToggleRecording?.();
    },
  }), [effectiveRecordingStatus.isEnabled, isHeldByLocal, onToggleRecording]));

  return (
    <group position={[-18.92, 0, 1.82]} rotation={[0, -0.34, 0]}>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.72, 0.055, 0.58]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: accentColor, emissiveIntensity: 0.12, roughness: 0.72, metalness: 0.05 }]} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.055, 0.82, 0.055]} />
        <meshStandardMaterial args={[{ color: "#101c2e", emissive: accentColor, emissiveIntensity: 0.14, roughness: 0.62, metalness: 0.08 }]} />
      </mesh>
      <mesh position={[0, 0.88, -0.05]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.08]} />
        <meshStandardMaterial args={[{ color: "#16243a", emissive: accentColor, emissiveIntensity: 0.12, roughness: 0.62, metalness: 0.06 }]} />
      </mesh>
      <group position={[0, 0.82, -0.06]} rotation={[0.16, 0, -0.18]} visible={!isHeldByAnyone}>
        <mesh ref={guitarRef} position={[0, 0, 0]} scale={[1.04, 0.7, 0.16]}>
          <sphereGeometry args={[0.25, 28, 18]} />
          <meshStandardMaterial args={[{ color: "#8b4b25", emissive: "#301307", emissiveIntensity: 0.18, roughness: 0.56, metalness: 0.03 }]} />
        </mesh>
        <mesh position={[0.12, 0.01, -0.02]} scale={[0.52, 0.36, 0.03]}>
          <sphereGeometry args={[0.13, 20, 12]} />
          <meshBasicMaterial args={[{ color: "#14090a", transparent: true, opacity: 0.75, toneMapped: false }]} />
        </mesh>
        <mesh position={[0.42, 0.025, -0.045]} rotation={[0, 0, -0.03]}>
          <boxGeometry args={[0.68, 0.08, 0.055]} />
          <meshStandardMaterial args={[{ color: "#5b321d", emissive: "#1b0c06", emissiveIntensity: 0.12, roughness: 0.52 }]} />
        </mesh>
        <mesh position={[0.82, 0.035, -0.045]} rotation={[0, 0, -0.03]}>
          <boxGeometry args={[0.17, 0.15, 0.065]} />
          <meshStandardMaterial args={[{ color: "#32170e", roughness: 0.5, metalness: 0.02 }]} />
        </mesh>
        {[-0.05, -0.032, -0.014, 0.004, 0.022, 0.04].map((y, index) => (
          <mesh key={index} position={[0.44, y + 0.025, -0.078]} rotation={[0, 0, -0.03]}>
            <boxGeometry args={[0.86, 0.004, 0.004]} />
            <meshBasicMaterial args={[{ color: "#d8efff", transparent: true, opacity: 0.62, toneMapped: false }]} />
          </mesh>
        ))}
      </group>
      {isHeldByAnyone ? (
        <mesh ref={guitarRef} position={[0, 0.82, -0.06]}>
          <boxGeometry args={[0.56, 0.5, 0.08]} />
          <meshBasicMaterial args={[{ color: accentColor, transparent: true, opacity: 0.16, wireframe: true, toneMapped: false }]} />
        </mesh>
      ) : null}
      <mesh position={[0, 1.28, -0.18]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[0.92, 0.46]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.72, toneMapped: false }]} >
          <canvasTexture key={`studio-guitar-label-${isHeldByLocal ? "local" : isHeldByAnother ? "remote" : "ready"}-${holderLabel ?? "none"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, 0.22, 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.82, 0.4]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.5, toneMapped: false }]} >
          <canvasTexture key="studio-guitar-help" attach="map" args={[helpCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[-0.56, 0.78, 0.04]} rotation={[0, 0.36, 0]}>
        <planeGeometry args={[0.62, 0.3]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.62, toneMapped: false }]} >
          <canvasTexture key={`studio-guitar-note-${studioGuitarNoteLabel}-${studioGuitarNoteIndex}-${studioGuitarFeedbackKey}`} attach="map" args={[noteCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0.56, 0.78, 0.04]} rotation={[0, -0.36, 0]}>
        <planeGeometry args={[0.62, 0.3]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: audioReadiness.label === "AUDIBLE" ? 0.54 : 0.72, toneMapped: false }]} >
          <canvasTexture key={`studio-guitar-audio-${audioReadiness.label}-${audioReadiness.reason}`} attach="map" args={[audioCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh ref={recordRef} position={[0, 0.53, 0.39]}>
        <boxGeometry args={[0.6, 0.045, 0.18]} />
        <meshStandardMaterial args={[{
          color: isHeldByLocal ? "#10192b" : "#101722",
          emissive: effectiveRecordingStatus.isEnabled ? "#ff667c" : "#57f3ff",
          emissiveIntensity: isHeldByLocal ? 0.18 : 0.06,
          roughness: 0.7,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, 0.562, 0.39]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.13]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: isHeldByLocal ? 0.76 : 0.45, toneMapped: false }]} >
          <canvasTexture key={`studio-guitar-rec-${effectiveRecordingStatus.label}-${effectiveRecordingStatus.caption}-${isHeldByLocal ? "local" : "locked"}`} attach="map" args={[recordingCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <StudioGuitarNoteStrip accentColor={accentColor} feedbackKey={studioGuitarFeedbackKey} selectedIndex={studioGuitarSlotIndex} />
    </group>
  );
}

export function Level1RecordingStudioRoom({
  area,
  opening,
  phaseVisuals,
  users,
  localUserId,
  ownerId,
  freeRoamPresence,
  localDawState,
  localDawActions,
  localDawAudioState,
  localDawAudioActions,
  sharedDawTransport,
  sharedDawClips,
  canControlSharedDawTransport,
  canAdminSharedDawClips,
  onSetSharedDawTempo,
  onPlaySharedDawTransport,
  onStopSharedDawTransport,
  localUserIdForSharedDawClips,
  onPublishSharedDawClip,
  onClearSharedDawClip,
  onBroadcastDawLiveSound,
  soundCloudBooth,
  studioGuitar,
  onPickupStudioGuitar,
  onDropStudioGuitar,
  heldStudioInstrument,
  studioGuitarBankLabel,
  studioGuitarRecordingStatus,
  onToggleStudioGuitarRecording,
  studioGuitarFeedbackKey,
  studioGuitarNoteIndex,
  studioGuitarNoteLabel,
  studioGuitarSlotIndex,
  showLayoutGrabBoxes = true,
}: {
  area: LevelAreaConfig;
  opening: LevelOpeningConfig;
  phaseVisuals: PhaseVisuals;
  users: SessionUser[];
  localUserId: string;
  ownerId: string;
  freeRoamPresence: FreeRoamPresenceState[];
  localDawState?: LocalDawState;
  localDawActions?: LocalDawActions;
  localDawAudioState?: LocalDawAudioEngineState;
  localDawAudioActions?: LocalDawAudioEngineActions;
  sharedDawTransport?: SharedDawTransport;
  sharedDawClips?: SharedDawClipsState;
  canControlSharedDawTransport?: boolean;
  canAdminSharedDawClips?: boolean;
  onSetSharedDawTempo?: (bpm: number) => void;
  onPlaySharedDawTransport?: () => void;
  onStopSharedDawTransport?: () => void;
  localUserIdForSharedDawClips?: string;
  onPublishSharedDawClip?: (clip: SharedDawClipPublishPayload) => void;
  onClearSharedDawClip?: (trackId: SharedDawTrackId, sceneIndex: number) => void;
  onBroadcastDawLiveSound?: (sound: SharedDawLiveSoundPayload) => void;
  soundCloudBooth?: SoundCloudBoothState;
  studioGuitar?: SharedStudioGuitarState;
  onPickupStudioGuitar?: () => void;
  onDropStudioGuitar?: () => void;
  heldStudioInstrument?: HeldStudioInstrument;
  studioGuitarBankLabel?: string;
  studioGuitarRecordingStatus?: StudioGuitarRecordingStatus;
  onToggleStudioGuitarRecording?: () => void;
  studioGuitarFeedbackKey?: number;
  studioGuitarNoteIndex?: number;
  studioGuitarNoteLabel?: string;
  studioGuitarSlotIndex?: number;
  showLayoutGrabBoxes?: boolean;
}) {
  const { activeHit, aimContext } = useInteractionRegistry();
  const { gl } = useThree();
  const width = area.bounds.max[0] - area.bounds.min[0];
  const depth = area.bounds.max[2] - area.bounds.min[2];
  const height = area.bounds.max[1] - area.bounds.min[1];
  const centerX = area.bounds.min[0] + width / 2;
  const centerZ = area.bounds.min[2] + depth / 2;
  const centerY = area.bounds.min[1] + height / 2;
  const doorwayHalfWidth = opening.size.width / 2;
  const doorwayMinZ = opening.position[2] - doorwayHalfWidth;
  const doorwayMaxZ = opening.position[2] + doorwayHalfWidth;
  const eastLowerDepth = doorwayMinZ - area.bounds.min[2];
  const eastUpperDepth = area.bounds.max[2] - doorwayMaxZ;
  const thresholdMinX = opening.clearanceBounds?.min[0] ?? area.bounds.max[0];
  const thresholdMaxX = opening.clearanceBounds?.max[0] ?? opening.position[0];
  const thresholdWidth = thresholdMaxX - thresholdMinX;
  const thresholdCenterX = thresholdMinX + thresholdWidth / 2;
  const guitarHolderUser = users.find((user) => user.id === studioGuitar?.holderUserId);
  const guitarHolderLabel = guitarHolderUser?.displayName ?? (studioGuitar?.holderUserId ? "Someone" : null);
  const isLocalHoldingGuitar = studioGuitar?.holderUserId === localUserId;
  const isGuitarHeldByAnother = Boolean(studioGuitar?.holderUserId && !isLocalHoldingGuitar);
  const isGuitarHeldByAnyone = Boolean(studioGuitar?.holderUserId);
  const sequenceMonitor = useMemo(() => createStudioSequenceMonitor(localDawState), [localDawState]);
  const arrangementMonitor = useMemo(
    () => createStudioArrangementTimelineMonitor(localDawState, localDawAudioState, sharedDawTransport),
    [localDawAudioState, localDawState, sharedDawTransport],
  );
  const mixerMonitor = useMemo(() => createStudioMixerMonitor(localDawState, localDawAudioState), [localDawAudioState, localDawState]);
  const [layoutState, setLayoutState] = useState<StudioLayoutState>(() => loadStudioLayoutState());
  const [layoutMoveState, setLayoutMoveState] = useState<StudioLayoutMoveState | null>(null);
  const layoutMoveStateRef = useRef<StudioLayoutMoveState | null>(null);
  const aimContextRef = useRef(aimContext);
  const activeLayoutStationId = getStationIdFromLayoutHitId(activeHit?.id);
  const movingLayoutStationId = layoutMoveState?.stationId ?? null;

  useEffect(() => {
    layoutMoveStateRef.current = layoutMoveState;
  }, [layoutMoveState]);

  useEffect(() => {
    aimContextRef.current = aimContext;
  }, [aimContext]);

  useEffect(() => {
    saveStudioLayoutState(layoutState);
  }, [layoutState]);

  const updateStationTransform = useCallback((stationId: StudioLayoutStationId, transform: StudioLayoutTransform) => {
    setLayoutState((currentState) => {
      const currentTransform = currentState[stationId];

      if (areStudioLayoutTransformsEqual(currentTransform, transform)) {
        return currentState;
      }

      return {
        ...currentState,
        [stationId]: cloneStudioLayoutTransform(transform),
      };
    });
  }, []);

  const resetLayoutStation = useCallback((stationId: StudioLayoutStationId) => {
    updateStationTransform(stationId, STUDIO_LAYOUT_STATION_SPECS[stationId].defaultTransform);
  }, [updateStationTransform]);

  const resetAllLayoutStations = useCallback(() => {
    setLayoutState(createDefaultStudioLayoutState());
    setLayoutMoveState(null);
  }, []);

  const beginMoveStation = useCallback((stationId: StudioLayoutStationId) => {
    const spec = STUDIO_LAYOUT_STATION_SPECS[stationId];
    const currentTransform = layoutState[stationId] ?? spec.defaultTransform;
    const currentAimContext = aimContextRef.current;
    const distanceFromCamera = currentAimContext
      ? Math.max(1.35, Math.min(8, Math.hypot(
        currentTransform.position[0] - currentAimContext.origin[0],
        currentTransform.position[1] - currentAimContext.origin[1],
        currentTransform.position[2] - currentAimContext.origin[2],
      ) || spec.followDistance))
      : spec.followDistance;

    setLayoutMoveState({
      stationId,
      startTransform: cloneStudioLayoutTransform(currentTransform),
      distanceFromCamera,
      floorLock: spec.defaultFloorLock,
    });
  }, [layoutState]);

  const placeMovingStation = useCallback(() => {
    setLayoutMoveState(null);
  }, []);

  const cancelMovingStation = useCallback(() => {
    const currentMoveState = layoutMoveStateRef.current;

    if (!currentMoveState) {
      return;
    }

    updateStationTransform(currentMoveState.stationId, currentMoveState.startTransform);
    setLayoutMoveState(null);
  }, [updateStationTransform]);

  const rotateMovingStation = useCallback((direction: -1 | 1, isFine = false) => {
    const currentMoveState = layoutMoveStateRef.current;

    if (!currentMoveState) {
      return;
    }

    const step = isFine ? 0.04 : 0.16;

    setLayoutState((currentState) => {
      const currentTransform = currentState[currentMoveState.stationId];

      return {
        ...currentState,
        [currentMoveState.stationId]: {
          position: [...currentTransform.position],
          rotation: [
            currentTransform.rotation[0],
            currentTransform.rotation[1] + step * direction,
            currentTransform.rotation[2],
          ],
        },
      };
    });
  }, []);

  const resetMovingStationHeight = useCallback(() => {
    const currentMoveState = layoutMoveStateRef.current;

    if (!currentMoveState) {
      return;
    }

    const spec = STUDIO_LAYOUT_STATION_SPECS[currentMoveState.stationId];

    setLayoutState((currentState) => {
      const currentTransform = currentState[currentMoveState.stationId];

      return {
        ...currentState,
        [currentMoveState.stationId]: {
          ...cloneStudioLayoutTransform(currentTransform),
          position: [currentTransform.position[0], spec.floorHeight, currentTransform.position[2]],
        },
      };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isStudioLayoutInteractiveTarget(event.target)) {
        return;
      }

      const currentMoveState = layoutMoveStateRef.current;

      if (currentMoveState) {
        if (event.code === "KeyF") {
          event.preventDefault();
          event.stopImmediatePropagation();
          placeMovingStation();
          return;
        }

        if (event.code === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          cancelMovingStation();
          return;
        }

        if (event.code === "KeyQ" || event.code === "KeyE") {
          event.preventDefault();
          event.stopImmediatePropagation();
          rotateMovingStation(event.code === "KeyQ" ? -1 : 1, event.shiftKey);
          return;
        }

        if (event.code === "KeyG") {
          event.preventDefault();
          event.stopImmediatePropagation();
          setLayoutMoveState((currentState) => currentState ? { ...currentState, floorLock: !currentState.floorLock } : currentState);
          return;
        }

        if (event.code === "KeyH") {
          event.preventDefault();
          event.stopImmediatePropagation();
          resetMovingStationHeight();
          return;
        }
      }

      if (event.code === "KeyF" && activeLayoutStationId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        beginMoveStation(activeLayoutStationId);
        return;
      }

      if (event.code === "Backspace") {
        const stationIdToReset = currentMoveState?.stationId ?? activeLayoutStationId;

        if (event.shiftKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
          resetAllLayoutStations();
          return;
        }

        if (stationIdToReset) {
          event.preventDefault();
          event.stopImmediatePropagation();
          resetLayoutStation(stationIdToReset);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [
    activeLayoutStationId,
    beginMoveStation,
    cancelMovingStation,
    placeMovingStation,
    resetAllLayoutStations,
    resetLayoutStation,
    resetMovingStationHeight,
    rotateMovingStation,
  ]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handlePointerDown = (event: PointerEvent) => {
      if (!layoutMoveStateRef.current || event.button !== 0 || isStudioLayoutInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      placeMovingStation();
    };

    canvas.addEventListener("pointerdown", handlePointerDown, { capture: true });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, [gl, placeMovingStation]);

  useFrame(() => {
    const currentMoveState = layoutMoveStateRef.current;

    if (!currentMoveState) {
      return;
    }

    const spec = STUDIO_LAYOUT_STATION_SPECS[currentMoveState.stationId];
    const currentAimContext = aimContextRef.current;

    if (!currentAimContext) {
      return;
    }

    const target: Vec3 = [
      currentAimContext.origin[0] + currentAimContext.direction[0] * currentMoveState.distanceFromCamera,
      currentAimContext.origin[1] + currentAimContext.direction[1] * currentMoveState.distanceFromCamera,
      currentAimContext.origin[2] + currentAimContext.direction[2] * currentMoveState.distanceFromCamera,
    ];

    const nextPosition: Vec3 = [
      target[0],
      currentMoveState.floorLock ? spec.floorHeight : Math.max(-0.2, Math.min(7.5, target[1])),
      target[2],
    ];

    setLayoutState((currentState) => {
      const currentTransform = currentState[currentMoveState.stationId];
      const nextTransform: StudioLayoutTransform = {
        position: nextPosition,
        rotation: [...currentTransform.rotation],
      };

      if (areStudioLayoutTransformsEqual(currentTransform, nextTransform)) {
        return currentState;
      }

      return {
        ...currentState,
        [currentMoveState.stationId]: nextTransform,
      };
    });
  });

  const overviewScreens = useMemo<StudioOverviewScreenSpec[]>(() => [
    {
      id: "big-status",
      title: "Studio Status",
      lines: formatBigStudioStatusLines({
        guitarHolderLabel,
        isGuitarHeldByAnyone,
        isLocalHoldingGuitar,
        localDawAudioState,
        localDawState,
        recordingStatus: studioGuitarRecordingStatus,
      }),
      accentColor: getStudioTruthPanelAccentColor(localDawState, localDawAudioState),
      position: [-22.18, 3.56, -5.25],
      rotation: [0, Math.PI / 2, 0],
      size: [4.3, 1.34],
    },
    {
      id: "transport",
      title: "Transport",
      lines: formatDawTransportLines(localDawState),
      accentColor: phaseVisuals.gridSecondary,
      position: [-22.18, 2.76, -0.02],
      rotation: [0, Math.PI / 2, 0],
      size: [2.28, 0.82],
    },
    {
      id: "sequence-grid",
      title: "Sequence View",
      lines: sequenceMonitor.lines,
      accentColor: phaseVisuals.gridPrimary,
      position: [-22.18, 1.66, -6.86],
      rotation: [0, Math.PI / 2, 0],
      size: [2.84, 1.26],
      kind: "sequence-grid",
      sequence: sequenceMonitor.sequence,
    },
    {
      id: "arrangement-timeline",
      title: "Arrangement Timeline",
      lines: arrangementMonitor.lines,
      accentColor: phaseVisuals.gridPrimary,
      position: [-16.88, 5.04, -8.58],
      rotation: [0, 0, 0],
      size: [5.38, 2.16],
      kind: "arrangement-grid",
      arrangement: arrangementMonitor,
    },
    {
      id: "track-list",
      title: "Track List",
      lines: formatDawTrackLines(localDawState),
      accentColor: "#73ff4c",
      position: [-22.18, 2.58, -2.86],
      rotation: [0, Math.PI / 2, 0],
      size: [2.32, 0.84],
    },
    {
      id: "device-rack",
      title: "Device Rack",
      lines: formatDawDeviceLines(localDawState),
      accentColor: phaseVisuals.timerAccent,
      position: [-16.88, 2.24, -8.58],
      rotation: [0, 0, 0],
      size: [2.4, 0.84],
    },
    {
      id: "mixer-view",
      title: "Mixer View",
      lines: mixerMonitor.lines,
      accentColor: phaseVisuals.gridSecondary,
      position: [-16.88, 3.18, -8.58],
      rotation: [0, 0, 0],
      size: [3.38, 1.3],
      kind: "mixer-grid",
      mixer: mixerMonitor,
    },
    {
      id: "studio-truth",
      title: "Patch / Signal",
      lines: formatStudioPatchSignalTruthLines({
        guitarHolderLabel,
        isGuitarHeldByAnyone,
        isLocalHoldingGuitar,
        localDawAudioState,
        localDawState,
        recordingStatus: studioGuitarRecordingStatus,
        sharedDawClips,
        sharedDawTransport,
      }),
      accentColor: getStudioTruthPanelAccentColor(localDawState, localDawAudioState),
      position: [-22.18, 1.44, -2.88],
      rotation: [0, Math.PI / 2, 0],
      size: [2.34, 0.96],
    },
  ], [
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
    arrangementMonitor,
    localDawState,
    localDawAudioState,
    sharedDawClips,
    sharedDawTransport,
    guitarHolderLabel,
    isGuitarHeldByAnyone,
    isLocalHoldingGuitar,
    mixerMonitor.lines,
    mixerMonitor.lastSoundLine,
    mixerMonitor.silenceLine,
    mixerMonitor.engineLine,
    studioGuitarRecordingStatus,
    sequenceMonitor.lines,
    sequenceMonitor.sequence,
    mixerMonitor,
  ]);

  return (
    <group>
      <pointLight color={phaseVisuals.timerGlow} intensity={0.58} distance={10} position={[centerX, 3.1, centerZ]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0.002, centerZ]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial args={[{ color: "#0c1828", roughness: 0.88, metalness: 0.02 }]} />
      </mesh>

      <gridHelper args={[Math.max(width, depth), 10, phaseVisuals.gridSecondary, "#16243a"]} position={[centerX, 0.016, centerZ]} />

      <Wall position={[centerX, centerY, area.bounds.min[2]]} args={[width, height, WALL_THICKNESS]} color="#08111f" />
      <Wall position={[centerX, centerY, area.bounds.max[2]]} args={[width, height, WALL_THICKNESS]} color="#08111f" />
      <Wall position={[area.bounds.min[0], centerY, centerZ]} args={[WALL_THICKNESS, height, depth]} color="#08111f" />
      <Wall
        position={[area.bounds.max[0], centerY, area.bounds.min[2] + eastLowerDepth / 2]}
        args={[WALL_THICKNESS, height, eastLowerDepth]}
        color="#08111f"
      />
      <Wall
        position={[area.bounds.max[0], centerY, doorwayMaxZ + eastUpperDepth / 2]}
        args={[WALL_THICKNESS, height, eastUpperDepth]}
        color="#08111f"
      />
      <Wall
        position={[area.bounds.max[0], opening.size.height + (height - opening.size.height) / 2, opening.position[2]]}
        args={[WALL_THICKNESS, height - opening.size.height, opening.size.width]}
        color="#08111f"
      />

      <mesh position={[thresholdCenterX, 0.024, opening.position[2]]}>
        <boxGeometry args={[thresholdWidth, 0.048, opening.size.width]} />
        <meshStandardMaterial args={[{ color: "#101f33", emissive: "#07111f", emissiveIntensity: 0.18, roughness: 0.8 }]} />
      </mesh>
      <mesh position={[thresholdCenterX, 0.07, doorwayMinZ]}>
        <boxGeometry args={[thresholdWidth, 0.05, 0.045]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>
      <mesh position={[thresholdCenterX, 0.07, doorwayMaxZ]}>
        <boxGeometry args={[thresholdWidth, 0.05, 0.045]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridPrimary }]} />
      </mesh>

      <mesh position={[centerX, 3.72, centerZ]}>
        <boxGeometry args={[2.35, 0.055, 0.08]} />
        <meshBasicMaterial args={[{ color: phaseVisuals.gridSecondary }]} />
      </mesh>
      <StudioLayoutStationGroup stationId="daw" transform={layoutState.daw} isMoving={movingLayoutStationId === "daw"} isTargeted={activeLayoutStationId === "daw"} showGrabBox={showLayoutGrabBoxes}>
        <StudioDeskShell
          accentColor={phaseVisuals.gridSecondary}
          label="DAW"
          position={STUDIO_DAW_POSITION}
          rotation={STUDIO_DAW_ROTATION}
          showLabel={false}
          size={[2.65, 0.58, 0.58]}
          variant="daw"
        />
        <StudioTransportControls
          localDawState={localDawState}
          localDawActions={localDawActions}
          phaseVisuals={phaseVisuals}
          sharedDawTransport={sharedDawTransport}
          canControlSharedDawTransport={canControlSharedDawTransport}
          onSetSharedDawTempo={onSetSharedDawTempo}
          onPlaySharedDawTransport={onPlaySharedDawTransport}
          onStopSharedDawTransport={onStopSharedDawTransport}
        />
        <StudioClipGridControls localDawState={localDawState} localDawActions={localDawActions} phaseVisuals={phaseVisuals} />
        <StudioSharedClipControls
          localDawState={localDawState}
          localDawActions={localDawActions}
          sharedDawClips={sharedDawClips}
          localUserIdForSharedDawClips={localUserIdForSharedDawClips}
          canAdminSharedDawClips={canAdminSharedDawClips}
          onPublishSharedDawClip={onPublishSharedDawClip}
          onClearSharedDawClip={onClearSharedDawClip}
          phaseVisuals={phaseVisuals}
        />
        <StudioDeviceChainControls localDawState={localDawState} localDawActions={localDawActions} phaseVisuals={phaseVisuals} />
        <StudioMixerControls
          localDawState={localDawState}
          localDawActions={localDawActions}
          localDawAudioState={localDawAudioState}
          localDawAudioActions={localDawAudioActions}
          phaseVisuals={phaseVisuals}
        />
        <StudioAudioEngineControl localDawAudioState={localDawAudioState} localDawAudioActions={localDawAudioActions} phaseVisuals={phaseVisuals} />
        <StudioPatchResetControl localDawActions={localDawActions} localDawState={localDawState} phaseVisuals={phaseVisuals} />
      </StudioLayoutStationGroup>
      <StudioLayoutStationGroup stationId="audio-interface" transform={layoutState["audio-interface"]} isMoving={movingLayoutStationId === "audio-interface"} isTargeted={activeLayoutStationId === "audio-interface"} showGrabBox={showLayoutGrabBoxes}>
        <StudioAudioInterface localDawAudioState={localDawAudioState} localDawState={localDawState} phaseVisuals={phaseVisuals} />
      </StudioLayoutStationGroup>
      <StudioLayoutStationGroup stationId="piano" transform={layoutState.piano} isMoving={movingLayoutStationId === "piano"} isTargeted={activeLayoutStationId === "piano"} showGrabBox={showLayoutGrabBoxes}>
        <StudioPianoShell
          accentColor="#73ff4c"
          localDawState={localDawState}
          localDawActions={localDawActions}
          localDawAudioState={localDawAudioState}
          localDawAudioActions={localDawAudioActions}
          onBroadcastDawLiveSound={onBroadcastDawLiveSound}
          position={STUDIO_PIANO_POSITION}
        />
      </StudioLayoutStationGroup>
      <StudioLayoutStationGroup stationId="guitar" transform={layoutState.guitar} isMoving={movingLayoutStationId === "guitar"} isTargeted={activeLayoutStationId === "guitar"} showGrabBox={showLayoutGrabBoxes}>
        <StudioGuitarStand
          holderLabel={guitarHolderLabel}
          isHeldByAnyone={isGuitarHeldByAnyone || heldStudioInstrument === "guitar"}
          isHeldByLocal={isLocalHoldingGuitar || heldStudioInstrument === "guitar"}
          isHeldByAnother={isGuitarHeldByAnother}
          localDawAudioState={localDawAudioState}
          onDrop={onDropStudioGuitar}
          onPickup={onPickupStudioGuitar}
          onToggleRecording={onToggleStudioGuitarRecording}
          studioGuitarBankLabel={studioGuitarBankLabel}
          recordingStatus={studioGuitarRecordingStatus}
          studioGuitarFeedbackKey={studioGuitarFeedbackKey}
          studioGuitarNoteIndex={studioGuitarNoteIndex}
          studioGuitarNoteLabel={studioGuitarNoteLabel}
          studioGuitarSlotIndex={studioGuitarSlotIndex}
        />
      </StudioLayoutStationGroup>
      <StudioFmSynthControls
        localDawState={localDawState}
        localDawAudioState={localDawAudioState}
        localDawAudioActions={localDawAudioActions}
        onBroadcastDawLiveSound={onBroadcastDawLiveSound}
        phaseVisuals={phaseVisuals}
      />
      <StudioLayoutStationGroup stationId="looper" transform={layoutState.looper} isMoving={movingLayoutStationId === "looper"} isTargeted={activeLayoutStationId === "looper"} showGrabBox={showLayoutGrabBoxes}>
        <StudioDeskShell
          accentColor="#f8d36a"
          label="Looper"
          position={STUDIO_LOOPER_POSITION}
          rotation={STUDIO_LOOPER_ROTATION}
          size={[2.28, 0.5, 1.02]}
          variant="looper"
        />
        <StudioLooperControls localDawState={localDawState} localDawActions={localDawActions} phaseVisuals={phaseVisuals} />
        <StudioDrumMachineControls
          localDawState={localDawState}
          localDawAudioState={localDawAudioState}
          localDawAudioActions={localDawAudioActions}
          onBroadcastDawLiveSound={onBroadcastDawLiveSound}
          phaseVisuals={phaseVisuals}
        />
      </StudioLayoutStationGroup>
      <StudioLayoutStationGroup stationId="drums" transform={layoutState.drums} isMoving={movingLayoutStationId === "drums"} isTargeted={activeLayoutStationId === "drums"} showGrabBox={showLayoutGrabBoxes}>
        <StudioDrumKit
          localDawState={localDawState}
          localDawAudioState={localDawAudioState}
          localDawAudioActions={localDawAudioActions}
          onBroadcastDawLiveSound={onBroadcastDawLiveSound}
          phaseVisuals={phaseVisuals}
        />
      </StudioLayoutStationGroup>
      <StudioDjPlatform phaseVisuals={phaseVisuals} />
      <StudioLayoutStationGroup stationId="dj" transform={layoutState.dj} isMoving={movingLayoutStationId === "dj"} isTargeted={activeLayoutStationId === "dj"} showGrabBox={showLayoutGrabBoxes}>
        {soundCloudBooth ? (
          <StudioSoundCloudDjControls soundCloudBooth={soundCloudBooth} phaseVisuals={phaseVisuals} />
        ) : (
          <>
            <StudioDeskShell
              accentColor="#f64fff"
              label="DJ"
              position={STUDIO_SOUNDCLOUD_DJ_POSITION}
              rotation={STUDIO_SOUNDCLOUD_DJ_ROTATION}
              size={STUDIO_SOUNDCLOUD_DJ_DESK_SIZE}
              variant="dj"
            />
            <StudioDjControls localDawState={localDawState} localDawActions={localDawActions} phaseVisuals={phaseVisuals} />
          </>
        )}
      </StudioLayoutStationGroup>
      {soundCloudBooth ? (
        <StudioLayoutStationGroup stationId="deck-a-crate" transform={layoutState["deck-a-crate"]} isMoving={movingLayoutStationId === "deck-a-crate"} isTargeted={activeLayoutStationId === "deck-a-crate"} showGrabBox={showLayoutGrabBoxes}>
          <StudioSoundCloudDeckCrateStation
            deck={soundCloudBooth.decks[0]}
            onPushConsoleEvent={soundCloudBooth.onPushConsoleEvent}
            phaseVisuals={phaseVisuals}
            position={STUDIO_SOUNDCLOUD_DECK_A_CRATE_POSITION}
          />
        </StudioLayoutStationGroup>
      ) : null}
      {soundCloudBooth ? (
        <>
          <StudioLayoutStationGroup stationId="grid-a" transform={layoutState["grid-a"]} isMoving={movingLayoutStationId === "grid-a"} isTargeted={activeLayoutStationId === "grid-a"} showGrabBox={showLayoutGrabBoxes}>
            <StudioSoundCloudGridController
              accentColor={phaseVisuals.gridPrimary}
              grid={soundCloudBooth.gridControllers.A}
              position={STUDIO_SOUNDCLOUD_GRID_A_POSITION}
            />
          </StudioLayoutStationGroup>
          <StudioLayoutStationGroup stationId="grid-b" transform={layoutState["grid-b"]} isMoving={movingLayoutStationId === "grid-b"} isTargeted={activeLayoutStationId === "grid-b"} showGrabBox={showLayoutGrabBoxes}>
            <StudioSoundCloudGridController
              accentColor={phaseVisuals.timerAccent}
              grid={soundCloudBooth.gridControllers.B}
              position={STUDIO_SOUNDCLOUD_GRID_B_POSITION}
            />
          </StudioLayoutStationGroup>
        </>
      ) : null}
      <StudioRackShell accentColor={phaseVisuals.gridPrimary} label="Instrument Rack" position={[-20.1, 0, -8.32]} />
      <StudioBassMachineControls
        localDawState={localDawState}
        localDawAudioState={localDawAudioState}
        localDawAudioActions={localDawAudioActions}
        onBroadcastDawLiveSound={onBroadcastDawLiveSound}
        phaseVisuals={phaseVisuals}
      />
      <StudioRackShell accentColor={phaseVisuals.timerAccent} label="Effects Rack" position={[-13.8, 0, -8.32]} />
      <StudioFilterEffectControls localDawAudioState={localDawAudioState} localDawAudioActions={localDawAudioActions} phaseVisuals={phaseVisuals} />
      <StudioAutopanEffectControls localDawAudioState={localDawAudioState} localDawAudioActions={localDawAudioActions} phaseVisuals={phaseVisuals} />
      <StudioEchoEffectControls localDawAudioState={localDawAudioState} localDawAudioActions={localDawAudioActions} phaseVisuals={phaseVisuals} />
      <StudioReverbEffectControls localDawAudioState={localDawAudioState} localDawAudioActions={localDawAudioActions} phaseVisuals={phaseVisuals} />
      <StudioSoundActivitySpeakers localDawAudioState={localDawAudioState} localDawState={localDawState} />
      <StudioStaticPatchCables localDawState={localDawState} />
      <StudioLoosePatchCablePreview localDawState={localDawState} />
      <StudioPatchInteractionTargets localDawState={localDawState} localDawActions={localDawActions} phaseVisuals={phaseVisuals} />

      {overviewScreens.map((screen) => {
        const stationId = getStudioOverviewScreenStationId(screen.id);

        return (
          <StudioLayoutStationGroup
            key={screen.id}
            stationId={stationId}
            transform={layoutState[stationId]}
            isMoving={movingLayoutStationId === stationId}
            isTargeted={activeLayoutStationId === stationId}
            showGrabBox={showLayoutGrabBoxes}
          >
            <StudioOverviewScreen screen={screen} />
          </StudioLayoutStationGroup>
        );
      })}

      <StudioLayoutMoveStatus
        moveState={layoutMoveState}
        transform={layoutMoveState ? layoutState[layoutMoveState.stationId] : undefined}
      />

      <StudioRoleBadges
        area={area}
        freeRoamPresence={freeRoamPresence}
        layoutState={layoutState}
        localDawState={localDawState}
        localUserId={localUserId}
        ownerId={ownerId}
        users={users}
      />

      <MarkerPost position={[area.bounds.min[0] + 0.48, 0.17, area.bounds.min[2] + 0.48]} color={phaseVisuals.gridPrimary} />
      <MarkerPost position={[area.bounds.min[0] + 0.48, 0.17, area.bounds.max[2] - 0.48]} color={phaseVisuals.gridSecondary} />
      <MarkerPost position={[area.bounds.max[0] - 0.48, 0.17, doorwayMinZ - 0.32]} color="#f8d36a" />
      <MarkerPost position={[area.bounds.max[0] - 0.48, 0.17, doorwayMaxZ + 0.32]} color="#f64fff" />
    </group>
  );
}
