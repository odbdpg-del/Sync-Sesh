import { useCallback, useMemo, useRef } from "react";
import type { LevelAreaConfig, LevelOpeningConfig } from "./levels";
import type { PhaseVisuals } from "./phaseVisuals";
import { useInteractionRegistry, useRegisterInteractable } from "./interactions";
import { getSharedDawClipSlotId } from "../lib/daw/sharedDaw";
import {
  AUDIO_INTERFACE_INPUT_PORT_IDS,
  canDrumHitPatchReachSpeakers,
  canConnectActivePatchCableToPort,
  canPianoLivePatchReachSpeakers,
  getActivePatchCable,
  getPatchPortPeerLabel,
  isPatchCablePluggedBetween,
  isPatchPortConnected,
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
  SharedDawTrackId,
  SharedDawTransport,
  SessionUser,
} from "../types/session";

const WALL_THICKNESS = 0.18;

type Vec3 = [number, number, number];
type StudioRoleId = "daw" | "piano-midi" | "drum-kit" | "looper" | "dj" | "instrument-rack" | "effects-rack";

type StudioOverviewScreenKind = "text" | "clip-grid";

interface StudioOverviewScreenSpec {
  id: string;
  title: string;
  lines: string[];
  accentColor: string;
  position: Vec3;
  rotation: Vec3;
  size: [number, number];
  kind?: StudioOverviewScreenKind;
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
  isActive?: boolean;
  onActivate: () => void;
}

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
const STUDIO_DRUM_KIT_POSITION: Vec3 = [-14.35, 0, 1.42];
const STUDIO_DISPLAY_MAX_MASTER_VOLUME = 0.5;
const FM_SYNTH_UI_GAIN_MAX = 0.16;
const FM_SYNTH_UI_GAIN_STEP = 0.04;
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
    badgePosition: [-14.35, 1.42, 2.18],
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
    anchorPosition: [-12.0, 0, -1.2],
    badgePosition: [-12.55, 1.45, -2.05],
    badgeRotation: [0, -0.55, 0],
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

  return Math.max(0.04, Math.min(1, trackPeak * (localDawAudioState.masterVolume / 0.5)));
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
        localDawAudioActions?.setMasterVolume(masterVolume - 0.05);
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
        localDawAudioActions?.setMasterVolume(masterVolume + 0.05);
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
          volume={masterVolume / 0.5}
          x={1.18}
        />
      ) : null}
    </group>
  );
}

function createStudioTransportControlCanvas({
  accentColor,
  caption,
  isActive,
  label,
}: {
  accentColor: string;
  caption: string;
  isActive?: boolean;
  label: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 192;

  const context = canvas.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#050914";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.globalAlpha = isActive ? 0.62 : 0.38;
  context.lineWidth = 8;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.globalAlpha = 1;

  context.fillStyle = accentColor;
  context.globalAlpha = isActive ? 0.86 : 0.68;
  context.font = "700 46px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), canvas.width / 2, 78);
  context.fillStyle = "#a9bdc9";
  context.globalAlpha = 0.48;
  context.font = "700 22px monospace";
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
    <mesh position={[0, 0.73, -0.33]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.72, 0.18]} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0.6, toneMapped: false }]}>
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
      position: [-0.33 + (index % 2) * 0.66, 0.65, 0.18 + Math.floor(index / 2) * 0.18] as Vec3,
      size: [0.46, 0.045, 0.13] as Vec3,
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
    position: [-0.48 + index * 0.32, 0.718, -0.08] as Vec3,
    size: [0.22, 0.032, 0.1] as Vec3,
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
      <mesh position={[0, 0.632, 0.2]}>
        <boxGeometry args={[1.36, 0.02, 0.56]} />
        <meshBasicMaterial args={[{ color: looperTrack.color, transparent: true, opacity: 0.075, toneMapped: false }]} />
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
  const labelCanvas = useMemo(() => createStudioTransportControlCanvas(control), [control]);

  useRegisterInteractable(useMemo(() => ({
    id: `studio-dj-${control.id}`,
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
        <meshBasicMaterial args={[{ color: control.accentColor, transparent: true, opacity: control.isActive ? 0.2 : 0.08, toneMapped: false }]} />
      </mesh>
      <mesh ref={controlRef}>
        <boxGeometry args={control.size} />
        <meshStandardMaterial args={[{
          color: control.isActive ? "#22172f" : "#0b1525",
          emissive: control.accentColor,
          emissiveIntensity: control.isActive ? 0.2 : 0.08,
          roughness: 0.72,
          metalness: 0.04,
        }]} />
      </mesh>
      <mesh position={[0, control.size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[control.size[0] * 0.82, control.size[2] * 0.7]} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.6, toneMapped: false }]}>
          <canvasTexture key={`studio-dj-control-${control.id}-${control.label}-${control.caption}-${control.isActive ? "active" : "idle"}`} attach="map" args={[labelCanvas]} />
        </meshBasicMaterial>
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
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.78, toneMapped: false }]} >
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
    localDawAudioActions?.setMasterVolume((localDawAudioState?.masterVolume ?? 0) - 0.05);
  }, [localDawAudioActions, localDawAudioState?.masterVolume]);
  const handleVolumeUp = useCallback(() => {
    localDawAudioActions?.setMasterVolume((localDawAudioState?.masterVolume ?? 0) + 0.05);
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
  ownerId,
  users,
}: {
  area: LevelAreaConfig;
  freeRoamPresence: FreeRoamPresenceState[];
  localDawState?: LocalDawState;
  localUserId: string;
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
  }, [area, freeRoamPresence, localUserId, ownerId, users]);

  return (
    <>
      {STUDIO_ROLE_SPECS.map((role) => {
        const remoteOccupants = remoteOccupantsByRole.get(role.id) ?? [];
        const isLocal = localRoleId !== undefined && role.id === localRoleId;
        const visibleRemoteOccupant = isLocal ? undefined : remoteOccupants[0];
        const extraCount = isLocal ? remoteOccupants.length : Math.max(0, remoteOccupants.length - 1);

        return (
          <StudioRoleBadge
            key={role.id}
            role={role}
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
      localDawActions?.recordPianoNoteEvent(note);
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

function createStudioOverviewScreenCanvas(screen: StudioOverviewScreenSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;

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

  context.fillStyle = screen.accentColor;
  context.globalAlpha = 0.68;
  context.font = "700 44px monospace";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(screen.title.toUpperCase(), 62, 54);
  context.globalAlpha = 1;

  context.fillStyle = "rgba(233, 251, 255, 0.64)";
  context.font = "700 32px monospace";
  screen.lines.forEach((line, index) => {
    context.fillText(line, 72, 128 + index * 42);
  });

  if (screen.kind === "clip-grid") {
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
  context.fillText("STATIC PLAN", canvas.width - 62, canvas.height - 62);

  return canvas;
}

function StudioOverviewScreen({ screen }: { screen: StudioOverviewScreenSpec }) {
  const screenCanvas = useMemo(() => createStudioOverviewScreenCanvas(screen), [screen]);

  return (
    <group position={screen.position} rotation={screen.rotation}>
      <mesh position={[0, 0, -0.024]}>
        <boxGeometry args={[screen.size[0] + 0.12, screen.size[1] + 0.1, 0.045]} />
        <meshStandardMaterial args={[{ color: "#07111f", emissive: "#03070f", emissiveIntensity: 0.16, roughness: 0.72, metalness: 0.08 }]} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={screen.size} />
        <meshBasicMaterial args={[{ transparent: true, opacity: 0.78, toneMapped: false }]}>
          <canvasTexture key={`studio-overview-${screen.id}`} attach="map" args={[screenCanvas]} />
        </meshBasicMaterial>
      </mesh>
      <mesh position={[0, -screen.size[1] / 2 + 0.055, 0.018]}>
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

function formatDawClipGridLines(
  localDawState?: LocalDawState,
  sharedDawClips?: SharedDawClipsState,
  localUserIdForSharedDawClips?: string,
  canAdminSharedDawClips?: boolean,
) {
  if (!localDawState) {
    return ["SCENES 01-04", "EMPTY CLIPS", "LAUNCH LATER"];
  }

  const selectedScene = localDawState.selectedSceneIndex + 1;
  const selectedClip = localDawState.clips.find((clip) => (
    clip.trackId === localDawState.selectedTrackId &&
    clip.sceneIndex === localDawState.selectedSceneIndex
  ));
  const selectedClipNoteCount = selectedClip
    ? localDawState.midiNotes.filter((note) => note.clipId === selectedClip.id).length
    : 0;
  const playingClipCount = localDawState.clips.filter((clip) => clip.state === "playing").length;
  const armedClipCount = localDawState.clips.filter((clip) => clip.state === "armed").length;
  const recordingClipCount = localDawState.clips.filter((clip) => clip.state === "recording").length;
  const selectedSharedClip = getSelectedSharedDawClip(localDawState, sharedDawClips);
  const selectedSharedStatus = selectedClip?.shared?.importStatus === "conflict"
    ? "SHARED CONFLICT"
    : selectedClip?.shared?.importStatus === "synced"
      ? "SHARED SYNCED"
      : selectedSharedClip
        ? "SHARED AVAILABLE"
        : "LOCAL ONLY";
  const ownerLine = !selectedSharedClip
    ? `${sharedDawClips?.clips.length ?? 0} SHARED SLOTS`
    : selectedSharedClip.summary.ownerUserId === localUserIdForSharedDawClips
      ? "OWNER YOU"
      : canAdminSharedDawClips
        ? "OWNER PEER / HOST"
        : "OWNER PEER";

  return [
    `SCENE ${String(selectedScene).padStart(2, "0")} SELECTED`,
    `${selectedClipNoteCount} NOTES`,
    selectedSharedStatus,
    ownerLine,
    `${recordingClipCount} REC ${playingClipCount} PLAY`,
    `${armedClipCount} ARMED`,
  ];
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

function formatDawAudioStatus(localDawAudioState: LocalDawAudioEngineState) {
  if (localDawAudioState.status === "idle") {
    return "AUDIO: OFF";
  }

  return `AUDIO: ${localDawAudioState.status.toUpperCase()}`;
}

function formatDawRoomStatusLines(localDawState?: LocalDawState, localDawAudioState?: LocalDawAudioEngineState) {
  if (!localDawState && !localDawAudioState) {
    return ["STUDIO PLAN", "VISUAL ONLY", "NO AUDIO ENGINE", "NO SYNC"];
  }

  if (localDawAudioState) {
    return [
      formatDawAudioStatus(localDawAudioState),
      `${localDawAudioState.isMuted ? "MUTED" : "UNMUTED"} M${Math.round(localDawAudioState.masterVolume * 100)}%`,
      `PN ${localDawAudioState.lastPianoLiveNoteLabel ?? "IDLE"} ${(localDawAudioState.lastPianoLiveTarget ?? "fm-synth").toUpperCase()}`,
      `FM ${localDawAudioState.lastFmSynthNoteLabel ?? "IDLE"} V${localDawAudioState.activeFmSynthVoiceCount}`,
      `DR ${localDawAudioState.lastDrumHitLabel ?? "IDLE"} BA ${localDawAudioState.lastBassNoteLabel ?? "IDLE"}${localDawAudioState.isBassPatternAuditioning ? " RIFF" : ""}`,
      "NO SYNC",
    ];
  }

  return [
    "STUDIO PLAN",
    `SELECTED: ${localDawState?.selectedStationId.toUpperCase() ?? "DAW"}`,
    "NO AUDIO ENGINE",
    "NO SYNC",
  ];
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
    <group position={[-14.35, 0, 2.48]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 1.18, -0.035]}>
        <boxGeometry args={[2.28, 1.02, 0.07]} />
        <meshStandardMaterial args={[{ color: "#06101d", emissive: activity.accentColor, emissiveIntensity: activity.isLive ? 0.18 : 0.06, roughness: 0.72 }]} />
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
            <meshStandardMaterial args={[{ color: "#0b1525", emissive: activity.accentColor, emissiveIntensity: activity.isDisplayAudible ? 0.12 : 0.04, roughness: 0.68 }]} />
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
}) {
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
  const overviewScreens = useMemo<StudioOverviewScreenSpec[]>(() => [
    {
      id: "transport",
      title: "Transport",
      lines: formatDawTransportLines(localDawState),
      accentColor: phaseVisuals.gridSecondary,
      position: [-22.28, 2.72, -4.6],
      rotation: [0, Math.PI / 2, 0],
      size: [2.15, 0.78],
    },
    {
      id: "clip-grid",
      title: "Clip Grid",
      lines: formatDawClipGridLines(localDawState, sharedDawClips, localUserIdForSharedDawClips, canAdminSharedDawClips),
      accentColor: phaseVisuals.gridPrimary,
      position: [-22.28, 1.78, -6.75],
      rotation: [0, Math.PI / 2, 0],
      size: [1.65, 0.9],
      kind: "clip-grid",
    },
    {
      id: "track-list",
      title: "Track List",
      lines: formatDawTrackLines(localDawState),
      accentColor: "#73ff4c",
      position: [-17.2, 2.05, 0.69],
      rotation: [0, Math.PI, 0],
      size: [2.15, 0.78],
    },
    {
      id: "device-rack",
      title: "Device Rack",
      lines: formatDawDeviceLines(localDawState),
      accentColor: phaseVisuals.timerAccent,
      position: [-16.95, 2.2, -8.68],
      rotation: [0, 0, 0],
      size: [2.25, 0.78],
    },
    {
      id: "room-status",
      title: "Room Status",
      lines: formatDawRoomStatusLines(localDawState, localDawAudioState),
      accentColor: "#f8d36a",
      position: [-10.62, 2.45, -7.0],
      rotation: [0, -Math.PI / 2, 0],
      size: [1.55, 0.72],
    },
  ], [
    phaseVisuals.gridPrimary,
    phaseVisuals.gridSecondary,
    phaseVisuals.timerAccent,
    localDawState,
    localDawAudioState,
    sharedDawClips,
    localUserIdForSharedDawClips,
    canAdminSharedDawClips,
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
      <StudioDeskShell
        accentColor={phaseVisuals.gridSecondary}
        label="DAW"
        position={[-21.25, 0, -4.6]}
        rotation={[0, Math.PI / 2, 0]}
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
      <StudioAudioInterface localDawAudioState={localDawAudioState} localDawState={localDawState} phaseVisuals={phaseVisuals} />
      <StudioPianoShell
        accentColor="#73ff4c"
        localDawState={localDawState}
        localDawActions={localDawActions}
        localDawAudioState={localDawAudioState}
        localDawAudioActions={localDawAudioActions}
        onBroadcastDawLiveSound={onBroadcastDawLiveSound}
        position={STUDIO_PIANO_POSITION}
      />
      <StudioFmSynthControls
        localDawState={localDawState}
        localDawAudioState={localDawAudioState}
        localDawAudioActions={localDawAudioActions}
        onBroadcastDawLiveSound={onBroadcastDawLiveSound}
        phaseVisuals={phaseVisuals}
      />
      <StudioDeskShell
        accentColor="#f8d36a"
        label="Looper"
        position={[-17.0, 0, -8.1]}
        rotation={[0, 0, 0]}
        size={[1.62, 0.5, 0.54]}
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
      <StudioDrumKit
        localDawState={localDawState}
        localDawAudioState={localDawAudioState}
        localDawAudioActions={localDawAudioActions}
        onBroadcastDawLiveSound={onBroadcastDawLiveSound}
        phaseVisuals={phaseVisuals}
      />
      <StudioDeskShell
        accentColor="#f64fff"
        label="DJ"
        position={[-12.0, 0, -1.2]}
        rotation={[0, -0.55, 0]}
        size={[1.48, 0.52, 0.62]}
        variant="dj"
      />
      <StudioDjControls localDawState={localDawState} localDawActions={localDawActions} phaseVisuals={phaseVisuals} />
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

      {overviewScreens.map((screen) => (
        <StudioOverviewScreen key={screen.id} screen={screen} />
      ))}

      <StudioRoleBadges
        area={area}
        freeRoamPresence={freeRoamPresence}
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
