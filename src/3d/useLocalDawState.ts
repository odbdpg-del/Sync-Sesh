import { useCallback, useMemo, useRef, useState } from "react";
import { getSharedDawClipSlotId } from "../lib/daw/sharedDaw";
import { SHARED_DAW_LOOP_LENGTH_BARS } from "../types/session";
import type { SharedDawClip, SharedDawClipPublishPayload, SharedDawClipsState, SharedDawTrackId } from "../types/session";

export type DawTransportState = "stopped" | "playing" | "paused";
export type DawStationId = "daw" | "piano-midi" | "looper" | "dj" | "instrument-rack" | "effects-rack";
export type DawTrackId = SharedDawTrackId;
export type DawDeviceKind = "instrument" | "filter" | "echo" | "reverb";
export type DawClipState = "empty" | "armed" | "stopped" | "queued" | "playing" | "recording";
export type LocalDawNoteSource = "piano-live" | "guitar-live" | "shared-import";
export type LocalDawDjDeckId = "A" | "B";
export type LocalDawDjDeckVisualState = "empty" | "cued" | "playing";
export type LocalDawDjDeckSourceKind = "local-clip";
export type PatchNodeKind =
  | "instrument"
  | "microphone"
  | "submixer"
  | "audio-interface"
  | "speaker";
export type PatchPortKind = "input" | "output";
export type PatchCableState = "plugged" | "dragging" | "loose";
export type PatchGatedDrumKind = "kick" | "snare" | "hat";

export interface LocalDawTransport {
  state: DawTransportState;
  bpm: number;
  timeSignature: "4 / 4";
  bar: number;
  beat: number;
}

export interface LocalDawClip {
  id: string;
  trackId: DawTrackId;
  sceneIndex: number;
  label: string;
  state: DawClipState;
  lengthBars: number;
  shared?: LocalDawSharedClipMetadata;
}

export interface LocalDawDevice {
  id: string;
  trackId: DawTrackId;
  kind: DawDeviceKind;
  label: string;
  enabled: boolean;
  placeholder: true;
}

export interface LocalDawNoteInput {
  label: string;
  frequency: number;
  durationSeconds?: number;
  source?: LocalDawNoteSource;
}

export interface LocalDawNoteRecordTarget {
  trackId: DawTrackId;
  sceneIndex: number;
}

export interface LocalDawMidiNoteEvent {
  id: string;
  clipId: string;
  trackId: DawTrackId;
  sceneIndex: number;
  label: string;
  frequency: number;
  startBar: number;
  startBeat: number;
  stepIndex: number;
  durationBeats: number;
  velocity: number;
  source: LocalDawNoteSource;
  recordedAtBpm: number;
}

export interface LocalDawPlaybackTrigger {
  clipId: string;
  noteId: string;
  trackId: DawTrackId;
  label: string;
  bar: number;
  beat: number;
}

export interface LocalDawSharedTransportSnapshot {
  state: Exclude<DawTransportState, "paused">;
  bpm: number;
  bar: number;
  beat: number;
}

export interface LocalDawSharedClipMetadata {
  ownerUserId: string;
  updatedByUserId: string;
  revision: number;
  checksum: string;
  importStatus: "synced" | "conflict";
}

export interface LocalDawTrack {
  id: DawTrackId;
  label: string;
  color: string;
  muted: boolean;
  armed: boolean;
  volume: number;
  clipIds: string[];
  deviceIds: string[];
}

export interface LocalDawDjDeckState {
  id: LocalDawDjDeckId;
  visualState: LocalDawDjDeckVisualState;
  label: string;
  sourceId: string | null;
}

export interface LocalDawDjDeckSource {
  id: string;
  kind: LocalDawDjDeckSourceKind;
  label: string;
  trackId: DawTrackId;
  clipId: string;
  sceneIndex: number;
}

export interface LocalDawDjState {
  selectedDeckId: LocalDawDjDeckId;
  crossfader: number;
  decks: LocalDawDjDeckState[];
  sources: LocalDawDjDeckSource[];
}

export interface LocalPatchNode {
  id: string;
  kind: PatchNodeKind;
  label: string;
}

export interface LocalPatchPort {
  id: string;
  nodeId: string;
  kind: PatchPortKind;
  label: string;
  accepts?: PatchNodeKind[];
}

export interface LocalPatchCable {
  id: string;
  label: string;
  fromPortId: string | null;
  toPortId: string | null;
  state: PatchCableState;
  color: string;
}

export interface LocalPatchState {
  nodes: LocalPatchNode[];
  ports: LocalPatchPort[];
  cables: LocalPatchCable[];
  activeCableId: string | null;
}

export interface PatchPortConnectionStatus {
  port: LocalPatchPort;
  cable: LocalPatchCable;
  peerPort: LocalPatchPort | null;
  peerNode: LocalPatchNode | null;
}

export interface LocalDawState {
  transport: LocalDawTransport;
  tracks: LocalDawTrack[];
  clips: LocalDawClip[];
  midiNotes: LocalDawMidiNoteEvent[];
  devices: LocalDawDevice[];
  selectedStationId: DawStationId;
  selectedTrackId: DawTrackId;
  selectedDeviceId: string | null;
  selectedSceneIndex: number;
  lastRecordedNoteId: string | null;
  lastPlaybackTrigger: LocalDawPlaybackTrigger | null;
  dj: LocalDawDjState;
  patch: LocalPatchState;
}

export interface LocalDawActions {
  toggleTransport: () => void;
  stopTransport: () => void;
  adjustTempo: (deltaBpm: number) => void;
  advanceTransportBeat: () => void;
  applySharedTransportSnapshot: (snapshot: LocalDawSharedTransportSnapshot) => void;
  applySharedClipsSnapshot: (sharedDawClips: SharedDawClipsState) => void;
  createSharedClipPublishPayloadForSelectedClip: () => SharedDawClipPublishPayload | null;
  selectClip: (clipId: string) => void;
  activateClipVisualState: (clipId: string) => void;
  toggleSelectedClipRecording: () => void;
  setClipRecording: (trackId: DawTrackId, sceneIndex: number, isRecording: boolean) => void;
  recordDawNoteEvent: (note: LocalDawNoteInput, target?: LocalDawNoteRecordTarget) => void;
  markClipNotePlayback: (trigger: LocalDawPlaybackTrigger) => void;
  stopAllClipPlayback: () => void;
  setSelectedClipLoopLengthBars: (lengthBars: number) => void;
  selectDjDeck: (deckId: LocalDawDjDeckId) => void;
  toggleDjDeckCue: (deckId: LocalDawDjDeckId) => void;
  toggleDjDeckPlay: (deckId: LocalDawDjDeckId) => void;
  nudgeDjCrossfader: (delta: number) => void;
  setDjCrossfader: (value: number) => void;
  selectDjDeckSource: (deckId: LocalDawDjDeckId, sourceId: string | null) => void;
  cycleDjDeckSource: (deckId: LocalDawDjDeckId, direction: -1 | 1) => void;
  clearDjDeckSource: (deckId: LocalDawDjDeckId) => void;
  selectDevice: (deviceId: string) => void;
  toggleDeviceEnabled: (deviceId: string) => void;
  setTrackVolume: (trackId: DawTrackId, volume: number) => void;
  adjustTrackVolume: (trackId: DawTrackId, delta: number) => void;
  toggleTrackMute: (trackId: DawTrackId) => void;
  resetPatchToDefaults: () => void;
  unplugPatchCableEnd: (cableId: string, portId: string) => void;
  connectActivePatchCableToPort: (portId: string) => void;
}

const MIN_BPM = 60;
const MAX_BPM = 180;
const ALLOWED_LOOP_LENGTH_BARS = SHARED_DAW_LOOP_LENGTH_BARS;
export const AUDIO_INTERFACE_INPUT_PORT_IDS = [
  "audio-interface-input-1",
  "audio-interface-input-2",
  "audio-interface-input-3",
  "audio-interface-input-4",
] as const;
const TRACK_DEFINITIONS: Array<Pick<LocalDawTrack, "id" | "label" | "color">> = [
  { id: "drums", label: "Drums", color: "#f8d36a" },
  { id: "bass", label: "Bass", color: "#73ff4c" },
  { id: "fm-synth", label: "FM Synth", color: "#57f3ff" },
  { id: "piano", label: "Piano", color: "#f64fff" },
  { id: "looper", label: "Looper", color: "#9fb7cc" },
];

const DEVICE_DEFINITIONS: Array<Omit<LocalDawDevice, "id" | "placeholder">> = [
  { trackId: "drums", kind: "instrument", label: "Instrument", enabled: true },
  { trackId: "drums", kind: "filter", label: "Filter", enabled: true },
  { trackId: "bass", kind: "instrument", label: "Instrument", enabled: true },
  { trackId: "bass", kind: "filter", label: "Filter", enabled: true },
  { trackId: "fm-synth", kind: "instrument", label: "Instrument", enabled: true },
  { trackId: "fm-synth", kind: "echo", label: "Echo", enabled: true },
  { trackId: "piano", kind: "instrument", label: "Instrument", enabled: true },
  { trackId: "piano", kind: "reverb", label: "Reverb", enabled: true },
  { trackId: "looper", kind: "filter", label: "Filter", enabled: true },
  { trackId: "looper", kind: "echo", label: "Echo", enabled: true },
];

const SCENE_COUNT = 4;

function clampBpm(bpm: number) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}

function clampTrackVolume(volume: number) {
  return Math.min(1, Math.max(0, volume));
}

function getNextVisualClipState(state: DawClipState): DawClipState {
  if (state === "empty") {
    return "armed";
  }

  if (state === "armed") {
    return "playing";
  }

  if (state === "playing") {
    return "stopped";
  }

  return "armed";
}

function clampBeat(beat: number) {
  return Math.min(4, Math.max(1, Math.round(beat)));
}

function clampBar(bar: number) {
  return Math.max(1, Math.round(bar));
}

function getQuantizedNotePosition(transport: LocalDawTransport, clip: LocalDawClip) {
  const relativeBar = ((transport.bar - 1) % clip.lengthBars) + 1;
  const startBeat = clampBeat(transport.beat);

  return {
    startBar: relativeBar,
    startBeat,
    stepIndex: (relativeBar - 1) * 16 + (startBeat - 1) * 4,
  };
}

function getDurationBeats(note: LocalDawNoteInput, bpm: number) {
  const durationSeconds = note.durationSeconds ?? 0.35;
  const rawBeats = durationSeconds / (60 / bpm);
  const quarterBeatSteps = Math.max(1, Math.round(rawBeats * 4));

  return Math.min(4, quarterBeatSteps / 4);
}

function getAllowedLoopLengthBars(lengthBars: number) {
  return ALLOWED_LOOP_LENGTH_BARS.reduce((closestLength, candidateLength) => (
    Math.abs(candidateLength - lengthBars) < Math.abs(closestLength - lengthBars) ? candidateLength : closestLength
  ), ALLOWED_LOOP_LENGTH_BARS[0]);
}

function frequencyToMidiPitch(frequency: number) {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return 60;
  }

  return Math.min(127, Math.max(0, Math.round(69 + 12 * Math.log2(frequency / 440))));
}

function midiPitchToFrequency(pitch: number) {
  const safePitch = Math.min(127, Math.max(0, Math.round(pitch)));
  return 440 * (2 ** ((safePitch - 69) / 12));
}

function getSharedNoteDurationSteps(note: LocalDawMidiNoteEvent, clip: LocalDawClip) {
  const stepsPerClip = clip.lengthBars * 16;
  const rawDurationSteps = Math.max(1, Math.round(note.durationBeats * 4));

  return Math.max(1, Math.min(Math.max(1, stepsPerClip - note.stepIndex), rawDurationSteps));
}

function createLocalMidiNoteFromSharedClip(sharedClip: SharedDawClip, noteIndex: number): LocalDawMidiNoteEvent {
  const sharedNote = sharedClip.midiNotes[noteIndex];
  const startBar = Math.floor(sharedNote.startStep / 16) + 1;
  const startBeat = Math.floor((sharedNote.startStep % 16) / 4) + 1;

  return {
    id: `shared-${sharedClip.summary.id}-note-${noteIndex + 1}`,
    clipId: sharedClip.summary.id,
    trackId: sharedClip.summary.trackId,
    sceneIndex: sharedClip.summary.sceneIndex,
    label: sharedNote.label,
    frequency: midiPitchToFrequency(sharedNote.pitch),
    startBar,
    startBeat,
    stepIndex: sharedNote.startStep,
    durationBeats: Math.max(0.25, sharedNote.durationSteps / 4),
    velocity: sharedNote.velocity,
    source: "shared-import",
    recordedAtBpm: 120,
  };
}

function clampDjCrossfader(value: number) {
  return Math.min(1, Math.max(-1, value));
}

function getValidatedDjSourceId(sources: LocalDawDjDeckSource[], sourceId: string | null) {
  if (!sourceId) {
    return null;
  }

  return sources.some((source) => source.id === sourceId) ? sourceId : null;
}

function getNextDjSourceId(sources: LocalDawDjDeckSource[], currentSourceId: string | null, direction: -1 | 1) {
  if (sources.length === 0) {
    return null;
  }

  const currentIndex = sources.findIndex((source) => source.id === currentSourceId);
  const nextIndex = currentIndex === -1
    ? direction > 0 ? 0 : sources.length - 1
    : (currentIndex + direction + sources.length) % sources.length;

  return sources[nextIndex].id;
}

export function createInitialLocalPatchState(): LocalPatchState {
  return {
    nodes: [
      { id: "piano", kind: "instrument", label: "Piano" },
      { id: "kick-mic", kind: "microphone", label: "Kick Mic" },
      { id: "snare-mic", kind: "microphone", label: "Snare Mic" },
      { id: "hat-mic", kind: "microphone", label: "Hat Mic" },
      { id: "overhead-left-mic", kind: "microphone", label: "Overhead L Mic" },
      { id: "overhead-right-mic", kind: "microphone", label: "Overhead R Mic" },
      { id: "drum-mixer", kind: "submixer", label: "Drum Mixer" },
      { id: "audio-interface", kind: "audio-interface", label: "Audio Interface" },
      { id: "speaker-system", kind: "speaker", label: "Speaker System" },
    ],
    ports: [
      { id: "piano-out", nodeId: "piano", kind: "output", label: "Piano Out" },
      { id: "kick-mic-out", nodeId: "kick-mic", kind: "output", label: "Kick Out" },
      { id: "snare-mic-out", nodeId: "snare-mic", kind: "output", label: "Snare Out" },
      { id: "hat-mic-out", nodeId: "hat-mic", kind: "output", label: "Hat Out" },
      { id: "overhead-left-mic-out", nodeId: "overhead-left-mic", kind: "output", label: "OH L Out" },
      { id: "overhead-right-mic-out", nodeId: "overhead-right-mic", kind: "output", label: "OH R Out" },
      { id: "drum-mixer-kick-in", nodeId: "drum-mixer", kind: "input", label: "Kick", accepts: ["microphone"] },
      { id: "drum-mixer-snare-in", nodeId: "drum-mixer", kind: "input", label: "Snare", accepts: ["microphone"] },
      { id: "drum-mixer-hat-in", nodeId: "drum-mixer", kind: "input", label: "Hat", accepts: ["microphone"] },
      { id: "drum-mixer-overhead-left-in", nodeId: "drum-mixer", kind: "input", label: "OH L", accepts: ["microphone"] },
      { id: "drum-mixer-overhead-right-in", nodeId: "drum-mixer", kind: "input", label: "OH R", accepts: ["microphone"] },
      { id: "drum-mixer-out", nodeId: "drum-mixer", kind: "output", label: "Mix Out" },
      { id: "audio-interface-input-1", nodeId: "audio-interface", kind: "input", label: "IN 1", accepts: ["instrument", "submixer", "microphone"] },
      { id: "audio-interface-input-2", nodeId: "audio-interface", kind: "input", label: "IN 2", accepts: ["instrument", "submixer", "microphone"] },
      { id: "audio-interface-input-3", nodeId: "audio-interface", kind: "input", label: "IN 3", accepts: ["instrument", "submixer", "microphone"] },
      { id: "audio-interface-input-4", nodeId: "audio-interface", kind: "input", label: "IN 4", accepts: ["instrument", "submixer", "microphone"] },
      { id: "audio-interface-out", nodeId: "audio-interface", kind: "output", label: "OUT" },
      { id: "speaker-system-input", nodeId: "speaker-system", kind: "input", label: "Speaker In", accepts: ["audio-interface"] },
    ],
    cables: [
      {
        id: "kick-mic-to-drum-mixer",
        label: "Kick Mic -> Drum Mixer",
        fromPortId: "kick-mic-out",
        toPortId: "drum-mixer-kick-in",
        state: "plugged",
        color: "#f8d36a",
      },
      {
        id: "snare-mic-to-drum-mixer",
        label: "Snare Mic -> Drum Mixer",
        fromPortId: "snare-mic-out",
        toPortId: "drum-mixer-snare-in",
        state: "plugged",
        color: "#57f3ff",
      },
      {
        id: "hat-mic-to-drum-mixer",
        label: "Hat Mic -> Drum Mixer",
        fromPortId: "hat-mic-out",
        toPortId: "drum-mixer-hat-in",
        state: "plugged",
        color: "#73ff4c",
      },
      {
        id: "overhead-left-to-drum-mixer",
        label: "Overhead L -> Drum Mixer",
        fromPortId: "overhead-left-mic-out",
        toPortId: "drum-mixer-overhead-left-in",
        state: "plugged",
        color: "#e9fbff",
      },
      {
        id: "overhead-right-to-drum-mixer",
        label: "Overhead R -> Drum Mixer",
        fromPortId: "overhead-right-mic-out",
        toPortId: "drum-mixer-overhead-right-in",
        state: "plugged",
        color: "#e9fbff",
      },
      {
        id: "drum-mixer-out-to-interface-one",
        label: "Drum Mixer Out -> Interface IN 1",
        fromPortId: "drum-mixer-out",
        toPortId: "audio-interface-input-1",
        state: "plugged",
        color: "#57f3ff",
      },
      {
        id: "piano-out-to-interface-two",
        label: "Piano Out -> Interface IN 2",
        fromPortId: "piano-out",
        toPortId: "audio-interface-input-2",
        state: "plugged",
        color: "#73ff4c",
      },
      {
        id: "interface-out-to-speakers",
        label: "Interface Out -> Speakers",
        fromPortId: "audio-interface-out",
        toPortId: "speaker-system-input",
        state: "plugged",
        color: "#e9fbff",
      },
    ],
    activeCableId: null,
  };
}

export function getPatchPortById(patch: LocalPatchState, portId: string) {
  return patch.ports.find((port) => port.id === portId);
}

export function getPatchCableById(patch: LocalPatchState, cableId: string) {
  return patch.cables.find((cable) => cable.id === cableId);
}

export function getPatchCableForPort(patch: LocalPatchState, portId: string) {
  return patch.cables.find((cable) => cable.fromPortId === portId || cable.toPortId === portId);
}

export function getPatchPortConnectionStatus(patch: LocalPatchState, portId: string): PatchPortConnectionStatus | null {
  const port = getPatchPortById(patch, portId);

  if (!port) {
    return null;
  }

  const cable = patch.cables.find((candidate) => (
    candidate.state === "plugged" &&
    candidate.fromPortId !== null &&
    candidate.toPortId !== null &&
    (candidate.fromPortId === portId || candidate.toPortId === portId)
  ));

  if (!cable) {
    return null;
  }

  const peerPortId = cable.fromPortId === portId ? cable.toPortId : cable.fromPortId;
  const peerPort = peerPortId ? getPatchPortById(patch, peerPortId) ?? null : null;
  const peerNode = peerPort ? patch.nodes.find((node) => node.id === peerPort.nodeId) ?? null : null;

  return {
    port,
    cable,
    peerPort,
    peerNode,
  };
}

export function isPatchPortConnected(patch: LocalPatchState, portId: string) {
  return getPatchPortConnectionStatus(patch, portId) !== null;
}

export function getPatchPortPeerLabel(patch: LocalPatchState, portId: string) {
  const status = getPatchPortConnectionStatus(patch, portId);

  if (!status?.peerPort) {
    return null;
  }

  return status.peerPort.label || status.peerNode?.label || null;
}

export function getPatchNodeConnectedPortCount(patch: LocalPatchState, nodeId: string) {
  return patch.ports.filter((port) => (
    port.nodeId === nodeId && isPatchPortConnected(patch, port.id)
  )).length;
}

export function isPatchCablePluggedBetween(patch: LocalPatchState, firstPortId: string, secondPortId: string) {
  return patch.cables.some((cable) => (
    cable.state === "plugged" &&
    cable.fromPortId !== null &&
    cable.toPortId !== null &&
    (
      (cable.fromPortId === firstPortId && cable.toPortId === secondPortId) ||
      (cable.fromPortId === secondPortId && cable.toPortId === firstPortId)
    )
  ));
}

export function isPatchCablePluggedToAny(patch: LocalPatchState, sourcePortId: string, targetPortIds: readonly string[]) {
  return targetPortIds.some((targetPortId) => (
    isPatchCablePluggedBetween(patch, sourcePortId, targetPortId)
  ));
}

export function isAudioInterfaceOutputPatchedToSpeakers(patch: LocalPatchState) {
  return isPatchCablePluggedBetween(patch, "audio-interface-out", "speaker-system-input");
}

export function isPortPatchedToAudioInterfaceInput(patch: LocalPatchState, sourcePortId: string) {
  return isPatchCablePluggedToAny(patch, sourcePortId, AUDIO_INTERFACE_INPUT_PORT_IDS);
}

export function canPianoLivePatchReachSpeakers(patch: LocalPatchState) {
  return (
    isPortPatchedToAudioInterfaceInput(patch, "piano-out") &&
    isAudioInterfaceOutputPatchedToSpeakers(patch)
  );
}

export function canDrumMixerPatchReachInterface(patch: LocalPatchState) {
  return isPortPatchedToAudioInterfaceInput(patch, "drum-mixer-out");
}

export function canDrumHitPatchReachSpeakers(patch: LocalPatchState, kind: PatchGatedDrumKind) {
  const micPath = kind === "kick"
    ? isPatchCablePluggedBetween(patch, "kick-mic-out", "drum-mixer-kick-in")
    : kind === "snare"
      ? isPatchCablePluggedBetween(patch, "snare-mic-out", "drum-mixer-snare-in")
      : isPatchCablePluggedBetween(patch, "hat-mic-out", "drum-mixer-hat-in");

  return (
    micPath &&
    canDrumMixerPatchReachInterface(patch) &&
    isAudioInterfaceOutputPatchedToSpeakers(patch)
  );
}

export function isPatchPortOccupied(patch: LocalPatchState, portId: string, ignoredCableId?: string) {
  return patch.cables.some((cable) => (
    cable.id !== ignoredCableId &&
    (cable.fromPortId === portId || cable.toPortId === portId)
  ));
}

export function getActivePatchCable(patch: LocalPatchState) {
  return patch.activeCableId ? getPatchCableById(patch, patch.activeCableId) : undefined;
}

export function isPatchOutputPort(port: LocalPatchPort) {
  return port.kind === "output";
}

export function isPatchInputPort(port: LocalPatchPort) {
  return port.kind === "input";
}

export function canConnectPatchPorts(patch: LocalPatchState, fromPortId: string, toPortId: string) {
  const firstPort = getPatchPortById(patch, fromPortId);
  const secondPort = getPatchPortById(patch, toPortId);

  if (!firstPort || !secondPort || firstPort.nodeId === secondPort.nodeId) {
    return false;
  }

  const outputPort = isPatchOutputPort(firstPort) ? firstPort : isPatchOutputPort(secondPort) ? secondPort : null;
  const inputPort = isPatchInputPort(firstPort) ? firstPort : isPatchInputPort(secondPort) ? secondPort : null;

  if (!outputPort || !inputPort) {
    return false;
  }

  const outputNode = patch.nodes.find((node) => node.id === outputPort.nodeId);

  if (!outputNode) {
    return false;
  }

  return !inputPort.accepts || inputPort.accepts.includes(outputNode.kind);
}

export function canConnectActivePatchCableToPort(patch: LocalPatchState, portId: string) {
  const activeCable = getActivePatchCable(patch);

  if (!activeCable) {
    return false;
  }

  const connectedPortId = activeCable.fromPortId ?? activeCable.toPortId;
  const looseEndpointCount = Number(activeCable.fromPortId === null) + Number(activeCable.toPortId === null);

  if (!connectedPortId || looseEndpointCount !== 1 || isPatchPortOccupied(patch, portId, activeCable.id)) {
    return false;
  }

  return canConnectPatchPorts(patch, connectedPortId, portId);
}

export function createInitialLocalDawState(): LocalDawState {
  const clips = TRACK_DEFINITIONS.flatMap((track) => (
    Array.from({ length: SCENE_COUNT }, (_, sceneIndex) => ({
      id: `${track.id}-scene-${sceneIndex + 1}`,
      trackId: track.id,
      sceneIndex,
      label: `${track.label} ${sceneIndex + 1}`,
      state: "empty" as const,
      lengthBars: 4,
    }))
  ));
  const devices = DEVICE_DEFINITIONS.map((device, index) => ({
    ...device,
    id: `${device.trackId}-${device.kind}-${index + 1}`,
    placeholder: true as const,
  }));
  const tracks = TRACK_DEFINITIONS.map((track) => ({
    ...track,
    muted: false,
    armed: false,
    volume: 0.8,
    clipIds: clips.filter((clip) => clip.trackId === track.id).map((clip) => clip.id),
    deviceIds: devices.filter((device) => device.trackId === track.id).map((device) => device.id),
  }));
  const selectedTrackId: DawTrackId = "drums";
  const djSources = clips.map((clip) => {
    const track = tracks.find((trackDefinition) => trackDefinition.id === clip.trackId);

    return {
      id: `dj-source-${clip.id}`,
      kind: "local-clip" as const,
      label: `${track?.label ?? clip.trackId} ${clip.sceneIndex + 1}`,
      trackId: clip.trackId,
      clipId: clip.id,
      sceneIndex: clip.sceneIndex,
    };
  });

  return {
    transport: {
      state: "stopped",
      bpm: 120,
      timeSignature: "4 / 4",
      bar: 1,
      beat: 1,
    },
    tracks,
    clips,
    midiNotes: [],
    devices,
    selectedStationId: "daw",
    selectedTrackId,
    selectedDeviceId: tracks.find((track) => track.id === selectedTrackId)?.deviceIds[0] ?? null,
    selectedSceneIndex: 0,
    lastRecordedNoteId: null,
    lastPlaybackTrigger: null,
    dj: {
      selectedDeckId: "A",
      crossfader: 0,
      decks: [
        { id: "A", visualState: "empty", label: "Deck A", sourceId: null },
        { id: "B", visualState: "empty", label: "Deck B", sourceId: null },
      ],
      sources: djSources,
    },
    patch: createInitialLocalPatchState(),
  };
}

export function useLocalDawState() {
  const [state, setState] = useState(createInitialLocalDawState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toggleTransport = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      transport: {
        ...currentState.transport,
        state: currentState.transport.state === "playing" ? "stopped" : "playing",
      },
    }));
  }, []);
  const stopTransport = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      transport: {
        ...currentState.transport,
        state: "stopped",
        bar: 1,
        beat: 1,
      },
      lastPlaybackTrigger: null,
    }));
  }, []);
  const adjustTempo = useCallback((deltaBpm: number) => {
    setState((currentState) => ({
      ...currentState,
      transport: {
        ...currentState.transport,
        bpm: clampBpm(currentState.transport.bpm + deltaBpm),
      },
    }));
  }, []);
  const advanceTransportBeat = useCallback(() => {
    setState((currentState) => {
      if (currentState.transport.state !== "playing") {
        return currentState;
      }

      const isBarComplete = currentState.transport.beat >= 4;

      return {
        ...currentState,
        transport: {
          ...currentState.transport,
          bar: isBarComplete ? currentState.transport.bar + 1 : currentState.transport.bar,
          beat: isBarComplete ? 1 : currentState.transport.beat + 1,
        },
      };
    });
  }, []);
  const applySharedTransportSnapshot = useCallback((snapshot: LocalDawSharedTransportSnapshot) => {
    setState((currentState) => ({
      ...currentState,
      transport: {
        ...currentState.transport,
        state: snapshot.state,
        bpm: clampBpm(snapshot.bpm),
        bar: clampBar(snapshot.bar),
        beat: clampBeat(snapshot.beat),
      },
      lastPlaybackTrigger: snapshot.state === "stopped" ? null : currentState.lastPlaybackTrigger,
    }));
  }, []);
  const applySharedClipsSnapshot = useCallback((sharedDawClips: SharedDawClipsState) => {
    setState((currentState) => {
      const sharedClipsBySlotId = new Map(sharedDawClips.clips.map((clip) => [clip.summary.id, clip]));
      const nextClips = currentState.clips.map((clip) => {
        const slotId = getSharedDawClipSlotId(clip.trackId, clip.sceneIndex);
        const sharedClip = sharedClipsBySlotId.get(slotId);

        if (!sharedClip) {
          return clip.shared
            ? {
                ...clip,
                shared: undefined,
              }
            : clip;
        }

        const clipNotes = currentState.midiNotes.filter((note) => note.clipId === clip.id);
        const hasLocalUnsyncedNotes = clipNotes.some((note) => note.source !== "shared-import");
        const isKnownSharedImport = clip.shared?.checksum === sharedClip.summary.checksum || clipNotes.every((note) => note.source === "shared-import");
        const importStatus: LocalDawSharedClipMetadata["importStatus"] = hasLocalUnsyncedNotes && !isKnownSharedImport ? "conflict" : "synced";

        return {
          ...clip,
          lengthBars: importStatus === "conflict" ? clip.lengthBars : sharedClip.summary.lengthBars,
          state: importStatus === "conflict"
            ? clip.state
            : clip.state === "empty" && !hasLocalUnsyncedNotes ? "stopped" : clip.state,
          shared: {
            ownerUserId: sharedClip.summary.ownerUserId,
            updatedByUserId: sharedClip.summary.updatedByUserId,
            revision: sharedClip.summary.revision,
            checksum: sharedClip.summary.checksum,
            importStatus,
          },
        };
      });
      const nextMidiNotes = currentState.midiNotes
        .filter((note) => {
          const clip = currentState.clips.find((candidate) => candidate.id === note.clipId);

          if (!clip || note.source !== "shared-import") {
            return true;
          }

          const sharedClip = sharedClipsBySlotId.get(getSharedDawClipSlotId(clip.trackId, clip.sceneIndex));
          const clipNotes = currentState.midiNotes.filter((candidate) => candidate.clipId === clip.id);
          const hasLocalUnsyncedNotes = clipNotes.some((candidate) => candidate.source !== "shared-import");

          return Boolean(sharedClip && hasLocalUnsyncedNotes);
        });

      sharedDawClips.clips.forEach((sharedClip) => {
        const targetClip = currentState.clips.find((clip) => (
          clip.trackId === sharedClip.summary.trackId &&
          clip.sceneIndex === sharedClip.summary.sceneIndex
        ));

        if (!targetClip) {
          return;
        }

        const targetNotes = currentState.midiNotes.filter((note) => note.clipId === targetClip.id);
        const hasLocalUnsyncedNotes = targetNotes.some((note) => note.source !== "shared-import");
        const isKnownSharedImport = targetClip.shared?.checksum === sharedClip.summary.checksum || targetNotes.every((note) => note.source === "shared-import");

        if (hasLocalUnsyncedNotes && !isKnownSharedImport) {
          return;
        }

        nextMidiNotes.push(...sharedClip.midiNotes.map((_, noteIndex) => createLocalMidiNoteFromSharedClip(sharedClip, noteIndex)));
      });

      return {
        ...currentState,
        clips: nextClips,
        midiNotes: nextMidiNotes,
      };
    });
  }, []);
  const createSharedClipPublishPayloadForSelectedClip = useCallback((): SharedDawClipPublishPayload | null => {
    const currentState = stateRef.current;
    const selectedClip = currentState.clips.find((clip) => (
      clip.trackId === currentState.selectedTrackId &&
      clip.sceneIndex === currentState.selectedSceneIndex
    ));

    if (!selectedClip || selectedClip.state === "recording") {
      return null;
    }

    const selectedNotes = currentState.midiNotes.filter((note) => note.clipId === selectedClip.id && note.source !== "shared-import");
    const controlEvents: SharedDawClipPublishPayload["controlEvents"] = [
      {
        target: "clip-length",
        step: 0,
        value: selectedClip.lengthBars,
      },
    ];
    const midiNotes: SharedDawClipPublishPayload["midiNotes"] = selectedNotes.map((note) => ({
      pitch: frequencyToMidiPitch(note.frequency),
      label: note.label,
      startStep: note.stepIndex,
      durationSteps: getSharedNoteDurationSteps(note, selectedClip),
      velocity: note.velocity,
    }));

    if (midiNotes.length === 0 && controlEvents.length === 0) {
      return null;
    }

    return {
      trackId: selectedClip.trackId,
      sceneIndex: selectedClip.sceneIndex,
      label: selectedClip.label,
      kind: midiNotes.length > 0 && controlEvents.length > 0 ? "mixed" : midiNotes.length > 0 ? "midi" : "control",
      lengthBars: getAllowedLoopLengthBars(selectedClip.lengthBars),
      midiNotes,
      controlEvents,
    };
  }, []);
  const selectClip = useCallback((clipId: string) => {
    setState((currentState) => {
      const selectedClip = currentState.clips.find((clip) => clip.id === clipId);

      if (!selectedClip) {
        return currentState;
      }

      return {
        ...currentState,
        selectedStationId: "daw",
        selectedTrackId: selectedClip.trackId,
        selectedSceneIndex: selectedClip.sceneIndex,
      };
    });
  }, []);
  const activateClipVisualState = useCallback((clipId: string) => {
    setState((currentState) => {
      const selectedClip = currentState.clips.find((clip) => clip.id === clipId);

      if (!selectedClip) {
        return currentState;
      }

      const nextState = getNextVisualClipState(selectedClip.state);
      const clips = currentState.clips.map((clip) => {
        if (clip.id === clipId) {
          return {
            ...clip,
            state: nextState,
          };
        }

        if (nextState === "playing" && clip.trackId === selectedClip.trackId && clip.state === "playing") {
          return {
            ...clip,
            state: "stopped" as const,
          };
        }

        return clip;
      });

      return {
        ...currentState,
        clips,
        selectedStationId: "daw",
        selectedTrackId: selectedClip.trackId,
        selectedSceneIndex: selectedClip.sceneIndex,
      };
    });
  }, []);
  const toggleSelectedClipRecording = useCallback(() => {
    setState((currentState) => {
      const selectedClip = currentState.clips.find((clip) => (
        clip.trackId === currentState.selectedTrackId &&
        clip.sceneIndex === currentState.selectedSceneIndex
      ));

      if (!selectedClip) {
        return currentState;
      }

      const isRecording = selectedClip.state === "recording";
      const selectedClipNoteCount = currentState.midiNotes.filter((note) => note.clipId === selectedClip.id).length;
      const nextSelectedClipState: DawClipState = isRecording
        ? selectedClipNoteCount > 0 ? "stopped" : "armed"
        : "recording";

      return {
        ...currentState,
        clips: currentState.clips.map((clip) => {
          if (clip.id === selectedClip.id) {
            return {
              ...clip,
              state: nextSelectedClipState,
            };
          }

          if (!isRecording && clip.trackId === selectedClip.trackId && clip.state === "recording") {
            return {
              ...clip,
              state: "stopped" as const,
            };
          }

          return clip;
        }),
        tracks: currentState.tracks.map((track) => (
          track.id === selectedClip.trackId
            ? { ...track, armed: !isRecording || nextSelectedClipState === "armed" }
            : track
        )),
      };
    });
  }, []);
  const setClipRecording = useCallback((trackId: DawTrackId, sceneIndex: number, isRecording: boolean) => {
    setState((currentState) => {
      const targetClip = currentState.clips.find((clip) => clip.trackId === trackId && clip.sceneIndex === sceneIndex);

      if (!targetClip) {
        return currentState;
      }

      const targetClipNoteCount = currentState.midiNotes.filter((note) => note.clipId === targetClip.id).length;
      const nextTargetClipState: DawClipState = isRecording
        ? "recording"
        : targetClipNoteCount > 0 ? "stopped" : "empty";
      const clips = currentState.clips.map((clip) => {
        if (clip.id === targetClip.id) {
          return {
            ...clip,
            state: nextTargetClipState,
          };
        }

        if (isRecording && clip.trackId === targetClip.trackId && clip.state === "recording") {
          return {
            ...clip,
            state: "stopped" as const,
          };
        }

        return clip;
      });
      const isTrackStillArmed = clips.some((clip) => (
        clip.trackId === targetClip.trackId &&
        (clip.state === "armed" || clip.state === "recording")
      ));

      return {
        ...currentState,
        clips,
        tracks: currentState.tracks.map((track) => (
          track.id === targetClip.trackId ? { ...track, armed: isTrackStillArmed } : track
        )),
        selectedStationId: "daw",
        selectedTrackId: targetClip.trackId,
        selectedSceneIndex: targetClip.sceneIndex,
      };
    });
  }, []);
  const recordDawNoteEvent = useCallback((note: LocalDawNoteInput, target?: LocalDawNoteRecordTarget) => {
    setState((currentState) => {
      const targetTrackId = target?.trackId ?? currentState.selectedTrackId;
      const targetSceneIndex = target?.sceneIndex ?? currentState.selectedSceneIndex;
      const selectedClip = currentState.clips.find((clip) => (
        clip.trackId === targetTrackId &&
        clip.sceneIndex === targetSceneIndex
      ));

      if (!selectedClip || (selectedClip.state !== "armed" && selectedClip.state !== "recording")) {
        return currentState;
      }

      const notePosition = getQuantizedNotePosition(currentState.transport, selectedClip);
      const noteId = `${selectedClip.id}-note-${currentState.midiNotes.length + 1}`;
      const nextNote: LocalDawMidiNoteEvent = {
        id: noteId,
        clipId: selectedClip.id,
        trackId: selectedClip.trackId,
        sceneIndex: selectedClip.sceneIndex,
        label: note.label,
        frequency: note.frequency,
        ...notePosition,
        durationBeats: getDurationBeats(note, currentState.transport.bpm),
        velocity: 0.82,
        source: note.source ?? "piano-live",
        recordedAtBpm: currentState.transport.bpm,
      };

      return {
        ...currentState,
        clips: currentState.clips.map((clip) => {
          if (clip.id === selectedClip.id) {
            return {
              ...clip,
              state: "recording" as const,
            };
          }

          if (clip.trackId === selectedClip.trackId && clip.state === "recording") {
            return {
              ...clip,
              state: "stopped" as const,
            };
          }

          return clip;
        }),
        tracks: currentState.tracks.map((track) => (
          track.id === selectedClip.trackId ? { ...track, armed: true } : track
        )),
        midiNotes: [...currentState.midiNotes, nextNote],
        lastRecordedNoteId: noteId,
        selectedStationId: "daw",
        selectedTrackId: selectedClip.trackId,
        selectedSceneIndex: selectedClip.sceneIndex,
      };
    });
  }, []);
  const markClipNotePlayback = useCallback((trigger: LocalDawPlaybackTrigger) => {
    setState((currentState) => ({
      ...currentState,
      lastPlaybackTrigger: trigger,
    }));
  }, []);
  const stopAllClipPlayback = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      clips: currentState.clips.map((clip) => (
        clip.state === "playing" ? { ...clip, state: "stopped" as const } : clip
      )),
      lastPlaybackTrigger: null,
    }));
  }, []);
  const setSelectedClipLoopLengthBars = useCallback((lengthBars: number) => {
    setState((currentState) => {
      const selectedClip = currentState.clips.find((clip) => (
        clip.trackId === currentState.selectedTrackId &&
        clip.sceneIndex === currentState.selectedSceneIndex
      ));
      const targetClip = selectedClip?.trackId === "looper"
        ? selectedClip
        : currentState.clips.find((clip) => clip.trackId === "looper" && clip.sceneIndex === 0);

      if (!targetClip) {
        return currentState;
      }

      const nextLengthBars = getAllowedLoopLengthBars(lengthBars);

      return {
        ...currentState,
        clips: currentState.clips.map((clip) => (
          clip.id === targetClip.id ? { ...clip, lengthBars: nextLengthBars } : clip
        )),
        selectedStationId: "looper",
        selectedTrackId: targetClip.trackId,
        selectedSceneIndex: targetClip.sceneIndex,
      };
    });
  }, []);
  const selectDjDeck = useCallback((deckId: LocalDawDjDeckId) => {
    setState((currentState) => ({
      ...currentState,
      selectedStationId: "dj",
      dj: {
        ...currentState.dj,
        selectedDeckId: deckId,
      },
    }));
  }, []);
  const toggleDjDeckCue = useCallback((deckId: LocalDawDjDeckId) => {
    setState((currentState) => ({
      ...currentState,
      selectedStationId: "dj",
      dj: {
        ...currentState.dj,
        selectedDeckId: deckId,
        decks: currentState.dj.decks.map((deck) => {
          if (deck.id !== deckId) {
            return deck;
          }

          return {
            ...deck,
            visualState: deck.visualState === "cued" ? "empty" : "cued",
          };
        }),
      },
    }));
  }, []);
  const toggleDjDeckPlay = useCallback((deckId: LocalDawDjDeckId) => {
    setState((currentState) => ({
      ...currentState,
      selectedStationId: "dj",
      dj: {
        ...currentState.dj,
        selectedDeckId: deckId,
        decks: currentState.dj.decks.map((deck) => {
          if (deck.id !== deckId) {
            return deck;
          }

          return {
            ...deck,
            visualState: deck.visualState === "playing" || deck.visualState === "empty" ? "cued" : "playing",
          };
        }),
      },
    }));
  }, []);
  const setDjCrossfader = useCallback((value: number) => {
    setState((currentState) => ({
      ...currentState,
      selectedStationId: "dj",
      dj: {
        ...currentState.dj,
        crossfader: clampDjCrossfader(value),
      },
    }));
  }, []);
  const nudgeDjCrossfader = useCallback((delta: number) => {
    setState((currentState) => ({
      ...currentState,
      selectedStationId: "dj",
      dj: {
        ...currentState.dj,
        crossfader: clampDjCrossfader(currentState.dj.crossfader + delta),
      },
    }));
  }, []);
  const selectDjDeckSource = useCallback((deckId: LocalDawDjDeckId, sourceId: string | null) => {
    setState((currentState) => {
      const nextSourceId = getValidatedDjSourceId(currentState.dj.sources, sourceId);

      return {
        ...currentState,
        selectedStationId: "dj",
        dj: {
          ...currentState.dj,
          selectedDeckId: deckId,
          decks: currentState.dj.decks.map((deck) => (
            deck.id === deckId ? { ...deck, sourceId: nextSourceId } : deck
          )),
        },
      };
    });
  }, []);
  const cycleDjDeckSource = useCallback((deckId: LocalDawDjDeckId, direction: -1 | 1) => {
    setState((currentState) => {
      const selectedDeck = currentState.dj.decks.find((deck) => deck.id === deckId);
      const nextSourceId = getNextDjSourceId(currentState.dj.sources, selectedDeck?.sourceId ?? null, direction);

      return {
        ...currentState,
        selectedStationId: "dj",
        dj: {
          ...currentState.dj,
          selectedDeckId: deckId,
          decks: currentState.dj.decks.map((deck) => (
            deck.id === deckId ? { ...deck, sourceId: nextSourceId } : deck
          )),
        },
      };
    });
  }, []);
  const clearDjDeckSource = useCallback((deckId: LocalDawDjDeckId) => {
    setState((currentState) => ({
      ...currentState,
      selectedStationId: "dj",
      dj: {
        ...currentState.dj,
        selectedDeckId: deckId,
        decks: currentState.dj.decks.map((deck) => (
          deck.id === deckId ? { ...deck, sourceId: null } : deck
        )),
      },
    }));
  }, []);
  const selectDevice = useCallback((deviceId: string) => {
    setState((currentState) => {
      const selectedDevice = currentState.devices.find((device) => device.id === deviceId);

      if (!selectedDevice) {
        return currentState;
      }

      return {
        ...currentState,
        selectedStationId: "daw",
        selectedTrackId: selectedDevice.trackId,
        selectedDeviceId: selectedDevice.id,
      };
    });
  }, []);
  const toggleDeviceEnabled = useCallback((deviceId: string) => {
    setState((currentState) => {
      const selectedDevice = currentState.devices.find((device) => device.id === deviceId);

      if (!selectedDevice) {
        return currentState;
      }

      return {
        ...currentState,
        devices: currentState.devices.map((device) => (
          device.id === deviceId ? { ...device, enabled: !device.enabled } : device
        )),
        selectedStationId: "daw",
        selectedTrackId: selectedDevice.trackId,
        selectedDeviceId: selectedDevice.id,
      };
    });
  }, []);
  const setTrackVolume = useCallback((trackId: DawTrackId, volume: number) => {
    setState((currentState) => {
      if (!currentState.tracks.some((track) => track.id === trackId)) {
        return currentState;
      }

      return {
        ...currentState,
        selectedStationId: "daw",
        selectedTrackId: trackId,
        tracks: currentState.tracks.map((track) => (
          track.id === trackId ? { ...track, volume: clampTrackVolume(volume) } : track
        )),
      };
    });
  }, []);
  const adjustTrackVolume = useCallback((trackId: DawTrackId, delta: number) => {
    setState((currentState) => {
      if (!currentState.tracks.some((track) => track.id === trackId)) {
        return currentState;
      }

      return {
        ...currentState,
        selectedStationId: "daw",
        selectedTrackId: trackId,
        tracks: currentState.tracks.map((track) => (
          track.id === trackId ? { ...track, volume: clampTrackVolume(track.volume + delta) } : track
        )),
      };
    });
  }, []);
  const toggleTrackMute = useCallback((trackId: DawTrackId) => {
    setState((currentState) => {
      if (!currentState.tracks.some((track) => track.id === trackId)) {
        return currentState;
      }

      return {
        ...currentState,
        selectedStationId: "daw",
        selectedTrackId: trackId,
        tracks: currentState.tracks.map((track) => (
          track.id === trackId ? { ...track, muted: !track.muted } : track
        )),
      };
    });
  }, []);
  const resetPatchToDefaults = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      patch: createInitialLocalPatchState(),
    }));
  }, []);
  const unplugPatchCableEnd = useCallback((cableId: string, portId: string) => {
    setState((currentState) => {
      let didUnplugCable = false;
      const cables = currentState.patch.cables.map((cable) => {
        if (cable.id !== cableId) {
          return cable;
        }

        if (cable.fromPortId === portId && cable.toPortId !== null) {
          didUnplugCable = true;
          return {
            ...cable,
            fromPortId: null,
            state: "loose" as const,
          };
        }

        if (cable.toPortId === portId && cable.fromPortId !== null) {
          didUnplugCable = true;
          return {
            ...cable,
            toPortId: null,
            state: "loose" as const,
          };
        }

        return cable;
      });

      if (!didUnplugCable) {
        return currentState;
      }

      return {
        ...currentState,
        patch: {
          ...currentState.patch,
          activeCableId: cableId,
          cables,
        },
      };
    });
  }, []);
  const connectActivePatchCableToPort = useCallback((portId: string) => {
    setState((currentState) => {
      const activeCable = getActivePatchCable(currentState.patch);

      if (!activeCable || !canConnectActivePatchCableToPort(currentState.patch, portId)) {
        return currentState;
      }

      const connectedPortId = activeCable.fromPortId ?? activeCable.toPortId;
      const connectedPort = connectedPortId ? getPatchPortById(currentState.patch, connectedPortId) : undefined;
      const targetPort = getPatchPortById(currentState.patch, portId);

      if (!connectedPort || !targetPort) {
        return currentState;
      }

      const outputPort = isPatchOutputPort(connectedPort) ? connectedPort : isPatchOutputPort(targetPort) ? targetPort : null;
      const inputPort = isPatchInputPort(connectedPort) ? connectedPort : isPatchInputPort(targetPort) ? targetPort : null;

      if (!outputPort || !inputPort) {
        return currentState;
      }

      return {
        ...currentState,
        patch: {
          ...currentState.patch,
          activeCableId: null,
          cables: currentState.patch.cables.map((cable) => (
            cable.id === activeCable.id
              ? {
                ...cable,
                fromPortId: outputPort.id,
                toPortId: inputPort.id,
                state: "plugged" as const,
              }
              : cable
          )),
        },
      };
    });
  }, []);
  const actions = useMemo<LocalDawActions>(() => ({
    activateClipVisualState,
    advanceTransportBeat,
    applySharedClipsSnapshot,
    applySharedTransportSnapshot,
    adjustTrackVolume,
    adjustTempo,
    clearDjDeckSource,
    createSharedClipPublishPayloadForSelectedClip,
    cycleDjDeckSource,
    connectActivePatchCableToPort,
    markClipNotePlayback,
    nudgeDjCrossfader,
    recordDawNoteEvent,
    resetPatchToDefaults,
    selectDevice,
    selectDjDeck,
    selectDjDeckSource,
    setDjCrossfader,
    setSelectedClipLoopLengthBars,
    setClipRecording,
    setTrackVolume,
    selectClip,
    stopTransport,
    stopAllClipPlayback,
    toggleDjDeckCue,
    toggleDjDeckPlay,
    toggleDeviceEnabled,
    toggleSelectedClipRecording,
    toggleTrackMute,
    toggleTransport,
    unplugPatchCableEnd,
  }), [
    activateClipVisualState,
    advanceTransportBeat,
    applySharedClipsSnapshot,
    applySharedTransportSnapshot,
    adjustTrackVolume,
    adjustTempo,
    clearDjDeckSource,
    createSharedClipPublishPayloadForSelectedClip,
    cycleDjDeckSource,
    connectActivePatchCableToPort,
    markClipNotePlayback,
    nudgeDjCrossfader,
    recordDawNoteEvent,
    resetPatchToDefaults,
    selectDevice,
    selectDjDeck,
    selectDjDeckSource,
    setDjCrossfader,
    setSelectedClipLoopLengthBars,
    setClipRecording,
    setTrackVolume,
    selectClip,
    stopTransport,
    stopAllClipPlayback,
    toggleDjDeckCue,
    toggleDjDeckPlay,
    toggleDeviceEnabled,
    toggleSelectedClipRecording,
    toggleTrackMute,
    toggleTransport,
    unplugPatchCableEnd,
  ]);

  return { state, actions };
}
