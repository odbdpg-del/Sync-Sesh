export type UserPresenceState = "idle" | "ready" | "spectating";
export type SessionPhase = "idle" | "lobby" | "armed" | "precount" | "countdown" | "completed";
export type SyncTransportMode = "mock" | "ws";
export type SyncConnectionState = "offline" | "connecting" | "connected" | "error";

export interface SessionUser {
  id: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
  presence: UserPresenceState;
  isHost: boolean;
  isTestUser?: boolean;
  joinedAt: string;
}

export interface LocalProfile {
  id: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
}

export interface TimerConfig {
  durationSeconds: number;
  preCountSeconds: number;
  countdownPrecisionDigits: number;
  allowLateJoinSpectators: boolean;
  lateJoinersJoinReady: boolean;
  autoJoinOnLoad: boolean;
  presets: number[];
  preCountPresets: number[];
}

export interface CountdownTimeline {
  preCountStartAt?: string;
  countdownStartAt?: string;
  countdownEndAt?: string;
  completedAt?: string;
  triggeredByUserId?: string;
}

export interface SessionInfo {
  id: string;
  code: string;
  phase: SessionPhase;
  roundNumber: number;
  ownerId: string;
  capacity: {
    min: number;
    max: number;
  };
}

export interface SessionMetrics {
  readyCount: number;
  spectatorCount: number;
  activeCount: number;
  idleCount: number;
}

export interface RangeScoreSubmission {
  levelId: string;
  score: number;
  shots: number;
  hits: number;
  misses: number;
  accuracy: number;
  durationMs: number;
}

export interface RangeScoreResult extends RangeScoreSubmission {
  roundNumber: number;
  completedAt: string;
  userId: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
  isTestUser?: boolean;
}

export interface FreeRoamPresenceUpdate {
  levelId: string;
  areaId?: string | null;
  position: readonly [number, number, number];
  yaw: number;
}

export interface FreeRoamPresenceState extends FreeRoamPresenceUpdate {
  userId: string;
  updatedAt: string;
}

export type SharedDawTransportState = "stopped" | "playing";

export interface SharedDawTransport {
  state: SharedDawTransportState;
  bpm: number;
  timeSignature: "4 / 4";
  anchorBar: number;
  anchorBeat: number;
  startedAt?: string;
  stoppedAt?: string;
  updatedAt: string;
  updatedByUserId: string;
  revision: number;
}

export const SHARED_DAW_TRACK_IDS = ["drums", "bass", "fm-synth", "piano", "looper"] as const;
export const SHARED_DAW_LOOP_LENGTH_BARS = [1, 2, 4, 8] as const;

export type SharedDawTrackId = (typeof SHARED_DAW_TRACK_IDS)[number];
export type SharedDawLoopLengthBars = (typeof SHARED_DAW_LOOP_LENGTH_BARS)[number];
export type SharedDawClipKind = "midi" | "control" | "mixed";
export type SharedDawClipState = "recorded";
export type SharedDawControlTarget = "clip-length" | "track-volume" | "track-mute" | "device-enabled";

export interface SharedDawMidiNote {
  pitch: number;
  label: string;
  startStep: number;
  durationSteps: number;
  velocity: number;
}

export interface SharedDawControlEvent {
  target: SharedDawControlTarget;
  step: number;
  value: number | boolean;
}

export interface SharedDawClipPublishPayload {
  trackId: SharedDawTrackId;
  sceneIndex: number;
  label: string;
  kind: SharedDawClipKind;
  lengthBars: SharedDawLoopLengthBars;
  midiNotes: SharedDawMidiNote[];
  controlEvents: SharedDawControlEvent[];
}

export interface SharedDawClipSummary {
  id: string;
  trackId: SharedDawTrackId;
  sceneIndex: number;
  label: string;
  kind: SharedDawClipKind;
  state: SharedDawClipState;
  lengthBars: SharedDawLoopLengthBars;
  noteCount: number;
  controlEventCount: number;
  ownerUserId: string;
  updatedByUserId: string;
  updatedAt: string;
  revision: number;
  checksum: string;
}

export interface SharedDawClip {
  summary: SharedDawClipSummary;
  midiNotes: SharedDawMidiNote[];
  controlEvents: SharedDawControlEvent[];
}

export interface SharedDawClipsState {
  clips: SharedDawClip[];
  revision: number;
  updatedAt: string;
}

export type SharedDawLiveSoundKind = "fm-synth" | "bass" | "bass-pattern" | "drum" | "piano";
export type SharedDawLiveDrumKind = "kick" | "snare" | "hat";
export type SharedDawLivePianoTarget = "fm-synth" | "bass";
export type SharedDawLiveFmSynthEnvelopePreset = "pluck" | "stab" | "pad";
export type SharedDawLiveBassWaveform = "sawtooth" | "square";

export interface SharedDawLiveFmSynthPatch {
  carrierFrequency: number;
  modulationRatio: number;
  modulationIndex: number;
  envelopePreset: SharedDawLiveFmSynthEnvelopePreset;
  gain: number;
}

export interface SharedDawLiveBassMachinePatch {
  waveform: SharedDawLiveBassWaveform;
  cutoffFrequency: number;
  resonance: number;
  envelopeAmount: number;
  decaySeconds: number;
  gain: number;
}

export interface SharedDawLiveSoundPayload {
  areaId: "recording-studio";
  kind: SharedDawLiveSoundKind;
  label: string;
  clientTriggeredAt?: string;
  scheduledAt?: string;
  frequency?: number;
  durationSeconds?: number;
  gainScale?: number;
  drumKind?: SharedDawLiveDrumKind;
  pianoTarget?: SharedDawLivePianoTarget;
  fmSynthPatch?: SharedDawLiveFmSynthPatch;
  bassMachinePatch?: SharedDawLiveBassMachinePatch;
}

export interface SharedDawLiveSoundEvent extends SharedDawLiveSoundPayload {
  id: string;
  triggeredAt: string;
  triggeredByUserId: string;
  revision: number;
}

export interface SharedStudioGuitarState {
  holderUserId: string | null;
  updatedAt: string;
  updatedByUserId: string | null;
  revision: number;
}

export interface SyncStatus {
  mode: SyncTransportMode;
  connection: SyncConnectionState;
  debugDetail?: string;
  lastEventAt?: string;
  latencyMs?: number;
  serverTimeOffsetMs?: number;
  warning?: string;
}

export interface SessionSnapshot {
  session: SessionInfo;
  users: SessionUser[];
  timerConfig: TimerConfig;
  countdown: CountdownTimeline;
  rangeScoreboard: RangeScoreResult[];
  freeRoamPresence: FreeRoamPresenceState[];
  dawTransport: SharedDawTransport;
  dawClips: SharedDawClipsState;
  dawLiveSound: SharedDawLiveSoundEvent | null;
  studioGuitar: SharedStudioGuitarState;
}

export interface DabSyncState extends SessionSnapshot {
  syncStatus: SyncStatus;
  localProfile: LocalProfile;
}

export interface DerivedLobbyState {
  localUser?: SessionUser;
  metrics: SessionMetrics;
  isJoined: boolean;
  isLocalHost: boolean;
  canUseAdminTools: boolean;
  isLocalUserReady: boolean;
  isLocalUserSpectating: boolean;
  canJoinSession: boolean;
  canHoldToReady: boolean;
  canEditTimer: boolean;
  canResetRound: boolean;
  isArmed: boolean;
  releaseStartsCountdown: boolean;
  lateJoinersSpectating: boolean;
  instructions: string[];
}

export interface CountdownDisplayState {
  phase: SessionPhase;
  headline: string;
  subheadline: string;
  timerText: string;
  accentText?: string;
  isUrgent: boolean;
}

export type SessionEvent =
  | { type: "join_session" }
  | { type: "leave_session" }
  | { type: "roll_display_name"; rollKey: string }
  | { type: "select_display_name"; displayName: string; source?: "generated" | "discord" }
  | { type: "ready_hold_start" }
  | { type: "ready_hold_end" }
  | { type: "set_timer_duration"; durationSeconds: number }
  | { type: "set_precount_duration"; preCountSeconds: number }
  | { type: "reset_round" }
  | { type: "admin_force_start_round" }
  | { type: "admin_force_complete_round" }
  | { type: "admin_reset_session" }
  | { type: "admin_add_test_participant" }
  | { type: "admin_toggle_test_participants_ready" }
  | { type: "admin_clear_test_participants" }
  | { type: "admin_set_late_joiners_join_ready"; enabled: boolean }
  | { type: "admin_set_auto_join_on_load"; enabled: boolean }
  | { type: "admin_set_countdown_precision_digits"; digits: number }
  | { type: "range_score_submit"; result: RangeScoreSubmission }
  | { type: "free_roam_presence_update"; presence: FreeRoamPresenceUpdate }
  | { type: "free_roam_presence_clear" }
  | { type: "daw_transport_set_tempo"; bpm: number }
  | { type: "daw_transport_play" }
  | { type: "daw_transport_stop" }
  | { type: "daw_clip_publish"; clip: SharedDawClipPublishPayload }
  | { type: "daw_clip_clear"; trackId: SharedDawTrackId; sceneIndex: number }
  | { type: "daw_live_sound"; sound: SharedDawLiveSoundPayload }
  | { type: "studio_guitar_pickup" }
  | { type: "studio_guitar_drop" };
