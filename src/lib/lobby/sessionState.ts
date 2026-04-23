import {
  getAllowedSharedDawLoopLengthBars,
  getSharedDawClipSlotId,
  isSharedDawTrackId,
} from "../daw/sharedDaw";
import { SHARED_DAW_LOOP_LENGTH_BARS } from "../../types/session";
import type {
  CountdownTimeline,
  DabSyncState,
  DerivedLobbyState,
  FreeRoamPresenceState,
  FreeRoamPresenceUpdate,
  LocalProfile,
  RangeScoreResult,
  RangeScoreSubmission,
  SessionEvent,
  SessionMetrics,
  SessionPhase,
  SessionSnapshot,
  SessionUser,
  SharedDawClip,
  SharedDawClipKind,
  SharedDawClipPublishPayload,
  SharedDawControlEvent,
  SharedDawLiveSoundPayload,
  SharedDawMidiNote,
  SharedStudioGuitarState,
} from "../../types/session";

export const DEFAULT_TIMER_SECONDS = 50;
export const DEFAULT_PRECOUNT_SECONDS = 3;
export const TIMER_PRESETS = [30, 45, 60];
export const PRECOUNT_PRESETS = [3, 5];
export const MAX_COUNTDOWN_PRECISION_DIGITS = 5;
const MAX_RANGE_SCORE_RESULTS = 32;
const FREE_ROAM_PRESENCE_TTL_MS = 10_000;
const DEFAULT_DAW_BPM = 120;
const MIN_DAW_BPM = 60;
const MAX_DAW_BPM = 180;
const INITIAL_SHARED_DAW_TRANSPORT_AT = "2026-04-19T19:00:00.000Z";
const MAX_SHARED_DAW_CLIPS = 20;
const MAX_SHARED_CLIP_NOTES = 128;
const MAX_SHARED_CLIP_CONTROL_EVENTS = 64;
const MAX_SHARED_CLIP_JSON_CHARS = 16000;
const SHARED_DAW_SCENE_COUNT = 4;
const MAX_DAW_LIVE_SOUND_LABEL_LENGTH = 16;
const MIN_FM_FREQUENCY = 55;
const MAX_FM_FREQUENCY = 1760;
const MIN_FM_RATIO = 0.25;
const MAX_FM_RATIO = 8;
const MIN_FM_INDEX = 0;
const MAX_FM_INDEX = 2.5;
const MIN_FM_GAIN = 0;
const MAX_FM_GAIN = 0.18;
const MIN_BASS_CUTOFF_FREQUENCY = 120;
const MAX_BASS_CUTOFF_FREQUENCY = 2400;
const MIN_BASS_RESONANCE = 0.4;
const MAX_BASS_RESONANCE = 8;
const MIN_BASS_ENVELOPE_AMOUNT = 0;
const MAX_BASS_ENVELOPE_AMOUNT = 1800;
const MIN_BASS_DECAY_SECONDS = 0.12;
const MAX_BASS_DECAY_SECONDS = 1.2;
const MIN_BASS_GAIN = 0;
const MAX_BASS_GAIN = 0.16;

function createEmptyCountdown(): CountdownTimeline {
  return {};
}

function clampTimerDuration(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TIMER_SECONDS;
  }

  return Math.min(600, Math.max(5, Math.round(value)));
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function normalizeYaw(yaw: number) {
  if (!Number.isFinite(yaw)) {
    return 0;
  }

  let normalizedYaw = yaw;

  while (normalizedYaw > Math.PI) {
    normalizedYaw -= Math.PI * 2;
  }

  while (normalizedYaw < -Math.PI) {
    normalizedYaw += Math.PI * 2;
  }

  return roundTo(normalizedYaw, 3);
}

function sanitizeFreeRoamPresenceUpdate(presence: FreeRoamPresenceUpdate) {
  if (
    typeof presence.levelId !== "string" ||
    !Array.isArray(presence.position) ||
    presence.position.length !== 3
  ) {
    return null;
  }

  const levelId = presence.levelId.trim();

  if (!/^[a-z0-9-]{1,48}$/i.test(levelId)) {
    return null;
  }

  const areaId = typeof presence.areaId === "string" && /^[a-z0-9-]{1,48}$/i.test(presence.areaId.trim())
    ? presence.areaId.trim()
    : null;

  return {
    levelId,
    areaId,
    position: [
      roundTo(clampNumber(presence.position[0], -100, 100), 2),
      roundTo(clampNumber(presence.position[1], 0, 20), 2),
      roundTo(clampNumber(presence.position[2], -100, 100), 2),
    ] as const,
    yaw: normalizeYaw(presence.yaw),
  };
}

function upsertFreeRoamPresence(
  presenceEntries: FreeRoamPresenceState[],
  nextPresence: FreeRoamPresenceState,
  maxEntries: number,
) {
  const entriesWithoutActor = presenceEntries.filter((presence) => presence.userId !== nextPresence.userId);

  return [...entriesWithoutActor, nextPresence].slice(-maxEntries);
}

function pruneFreeRoamPresence(presenceEntries: FreeRoamPresenceState[], nowMs: number) {
  return presenceEntries.filter((presence) => {
    const updatedAtMs = Date.parse(presence.updatedAt);
    return Number.isFinite(updatedAtMs) && nowMs - updatedAtMs <= FREE_ROAM_PRESENCE_TTL_MS;
  });
}

function sanitizeRangeScoreSubmission(submission: RangeScoreSubmission) {
  const levelId = submission.levelId.trim();

  if (!levelId) {
    return null;
  }

  const score = clampInteger(submission.score, 0, 999999);
  const shots = clampInteger(submission.shots, 0, 999);
  const hits = Math.min(clampInteger(submission.hits, 0, 999), shots);
  const misses = Math.min(clampInteger(submission.misses, 0, 999), Math.max(0, shots - hits));
  const accuracy = shots === 0 ? 0 : clampInteger((hits / shots) * 100, 0, 100);
  const durationMs = clampInteger(submission.durationMs, 5000, 120000);

  if (shots <= 0) {
    return null;
  }

  return {
    levelId,
    score,
    shots,
    hits,
    misses,
    accuracy,
    durationMs,
  };
}

function isBetterRangeScore(nextResult: RangeScoreResult, currentResult: RangeScoreResult) {
  if (nextResult.score !== currentResult.score) {
    return nextResult.score > currentResult.score;
  }

  if (nextResult.accuracy !== currentResult.accuracy) {
    return nextResult.accuracy > currentResult.accuracy;
  }

  if (nextResult.durationMs !== currentResult.durationMs) {
    return nextResult.durationMs < currentResult.durationMs;
  }

  return false;
}

function upsertRangeScoreResult(results: RangeScoreResult[], nextResult: RangeScoreResult) {
  const existingIndex = results.findIndex((result) => (
    result.userId === nextResult.userId &&
    result.levelId === nextResult.levelId &&
    result.roundNumber === nextResult.roundNumber
  ));

  if (existingIndex >= 0) {
    const currentResult = results[existingIndex];

    if (!isBetterRangeScore(nextResult, currentResult)) {
      return results;
    }

    return [
      ...results.slice(0, existingIndex),
      nextResult,
      ...results.slice(existingIndex + 1),
    ];
  }

  return [...results, nextResult]
    .sort((firstResult, secondResult) => (
      secondResult.roundNumber - firstResult.roundNumber ||
      secondResult.score - firstResult.score ||
      secondResult.accuracy - firstResult.accuracy ||
      firstResult.durationMs - secondResult.durationMs ||
      firstResult.completedAt.localeCompare(secondResult.completedAt)
    ))
    .slice(0, MAX_RANGE_SCORE_RESULTS);
}

function releaseStudioGuitar(studioGuitar: SharedStudioGuitarState, updatedAt: string, updatedByUserId: string | null) {
  if (!studioGuitar.holderUserId) {
    return studioGuitar;
  }

  return {
    holderUserId: null,
    updatedAt,
    updatedByUserId,
    revision: studioGuitar.revision + 1,
  };
}

function releaseStudioGuitarIfHeldBy(
  studioGuitar: SharedStudioGuitarState,
  userId: string,
  updatedAt: string,
  updatedByUserId: string | null = userId,
) {
  if (studioGuitar.holderUserId !== userId) {
    return studioGuitar;
  }

  return releaseStudioGuitar(studioGuitar, updatedAt, updatedByUserId);
}

function releaseStudioGuitarIfHolderMissing(studioGuitar: SharedStudioGuitarState, users: SessionUser[], updatedAt: string) {
  if (!studioGuitar.holderUserId || users.some((user) => user.id === studioGuitar.holderUserId)) {
    return studioGuitar;
  }

  return releaseStudioGuitar(studioGuitar, updatedAt, "system");
}

function clampPrecountDuration(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_PRECOUNT_SECONDS;
  }

  return PRECOUNT_PRESETS.includes(Math.round(value)) ? Math.round(value) : DEFAULT_PRECOUNT_SECONDS;
}

function clampCountdownPrecisionDigits(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_COUNTDOWN_PRECISION_DIGITS, Math.max(0, Math.round(value)));
}

function clampDawBpm(value: number) {
  return clampInteger(value, MIN_DAW_BPM, MAX_DAW_BPM);
}

function sanitizeSharedLabel(label: string, maxLength: number) {
  return label.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

function sanitizeSharedDawMidiNote(note: SharedDawMidiNote, stepsPerClip: number): SharedDawMidiNote | null {
  if (
    !Number.isFinite(note.pitch) ||
    !Number.isFinite(note.startStep) ||
    !Number.isFinite(note.durationSteps) ||
    !Number.isFinite(note.velocity)
  ) {
    return null;
  }

  const startStep = Math.round(note.startStep);

  if (startStep < 0 || startStep >= stepsPerClip) {
    return null;
  }

  const durationSteps = Math.min(stepsPerClip - startStep, Math.max(1, Math.round(note.durationSteps)));
  const label = sanitizeSharedLabel(note.label, 8);

  if (!label) {
    return null;
  }

  return {
    pitch: clampInteger(note.pitch, 0, 127),
    label,
    startStep,
    durationSteps,
    velocity: clampNumber(note.velocity, 0, 1),
  };
}

function sanitizeSharedDawControlEvent(event: SharedDawControlEvent, stepsPerClip: number): SharedDawControlEvent | null {
  if (!["clip-length", "track-volume", "track-mute", "device-enabled"].includes(event.target)) {
    return null;
  }

  if (!Number.isFinite(event.step)) {
    return null;
  }

  const step = Math.round(event.step);

  if (step < 0 || step >= stepsPerClip) {
    return null;
  }

  if (event.target === "track-mute" || event.target === "device-enabled") {
    if (typeof event.value !== "boolean") {
      return null;
    }

    return {
      target: event.target,
      step,
      value: event.value,
    };
  }

  if (typeof event.value !== "number" || !Number.isFinite(event.value)) {
    return null;
  }

  return {
    target: event.target,
    step,
    value: event.target === "clip-length"
      ? getAllowedSharedDawLoopLengthBars(event.value) ?? SHARED_DAW_LOOP_LENGTH_BARS[2]
      : clampNumber(event.value, 0, 1),
  };
}

function createSharedDawClipChecksum(payload: SharedDawClipPublishPayload) {
  const canonicalJson = JSON.stringify(payload);
  let hash = 0;

  for (let index = 0; index < canonicalJson.length; index += 1) {
    hash = (hash * 31 + canonicalJson.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function sanitizeSharedDawClipPublishPayload(payload: SharedDawClipPublishPayload): SharedDawClipPublishPayload | null {
  const serializedPayload = JSON.stringify(payload);

  if (serializedPayload.length > MAX_SHARED_CLIP_JSON_CHARS) {
    return null;
  }

  if (!isSharedDawTrackId(payload.trackId)) {
    return null;
  }

  const sceneIndex = Math.round(payload.sceneIndex);

  if (sceneIndex < 0 || sceneIndex >= SHARED_DAW_SCENE_COUNT) {
    return null;
  }

  if (!["midi", "control", "mixed"].includes(payload.kind)) {
    return null;
  }

  const lengthBars = getAllowedSharedDawLoopLengthBars(payload.lengthBars);

  if (!lengthBars) {
    return null;
  }

  if (!Array.isArray(payload.midiNotes) || !Array.isArray(payload.controlEvents)) {
    return null;
  }

  const stepsPerClip = lengthBars * 16;
  const midiNotes = payload.midiNotes
    .slice(0, MAX_SHARED_CLIP_NOTES)
    .map((note) => sanitizeSharedDawMidiNote(note, stepsPerClip))
    .filter((note): note is SharedDawMidiNote => Boolean(note));
  const controlEvents = payload.controlEvents
    .slice(0, MAX_SHARED_CLIP_CONTROL_EVENTS)
    .map((event) => sanitizeSharedDawControlEvent(event, stepsPerClip))
    .filter((event): event is SharedDawControlEvent => Boolean(event));

  if (midiNotes.length === 0 && controlEvents.length === 0) {
    return null;
  }

  const label = sanitizeSharedLabel(payload.label, 24);

  if (!label) {
    return null;
  }

  let kind: SharedDawClipKind = payload.kind;

  if (midiNotes.length > 0 && controlEvents.length > 0) {
    kind = "mixed";
  } else if (midiNotes.length > 0) {
    kind = "midi";
  } else {
    kind = "control";
  }

  return {
    trackId: payload.trackId,
    sceneIndex,
    label,
    kind,
    lengthBars,
    midiNotes,
    controlEvents,
  };
}

function isEligibleDawClipActor(snapshot: SessionSnapshot, actor: LocalProfile) {
  const actorUser = snapshot.users.find((user) => user.id === actor.id);

  return Boolean(actorUser && actorUser.presence !== "spectating");
}

function isSharedDawLiveSoundKind(kind: string): kind is SharedDawLiveSoundPayload["kind"] {
  return kind === "fm-synth" || kind === "bass" || kind === "bass-pattern" || kind === "drum" || kind === "piano";
}

function isSharedDawLiveDrumKind(kind: unknown): kind is NonNullable<SharedDawLiveSoundPayload["drumKind"]> {
  return kind === "kick" || kind === "snare" || kind === "hat";
}

function isSharedDawLivePianoTarget(target: unknown): target is NonNullable<SharedDawLiveSoundPayload["pianoTarget"]> {
  return target === "fm-synth" || target === "bass";
}

function isSharedDawLiveFmSynthEnvelopePreset(preset: unknown): preset is NonNullable<SharedDawLiveSoundPayload["fmSynthPatch"]>["envelopePreset"] {
  return preset === "pluck" || preset === "stab" || preset === "pad";
}

function isSharedDawLiveBassWaveform(waveform: unknown): waveform is NonNullable<SharedDawLiveSoundPayload["bassMachinePatch"]>["waveform"] {
  return waveform === "sawtooth" || waveform === "square";
}

function sanitizeSharedDawLiveFmSynthPatch(patch: SharedDawLiveSoundPayload["fmSynthPatch"]) {
  if (!patch || typeof patch !== "object") {
    return undefined;
  }

  return {
    carrierFrequency: clampNumber(patch.carrierFrequency, MIN_FM_FREQUENCY, MAX_FM_FREQUENCY),
    modulationRatio: clampNumber(patch.modulationRatio, MIN_FM_RATIO, MAX_FM_RATIO),
    modulationIndex: clampNumber(patch.modulationIndex, MIN_FM_INDEX, MAX_FM_INDEX),
    envelopePreset: isSharedDawLiveFmSynthEnvelopePreset(patch.envelopePreset) ? patch.envelopePreset : "pluck",
    gain: clampNumber(patch.gain, MIN_FM_GAIN, MAX_FM_GAIN),
  };
}

function sanitizeSharedDawLiveBassMachinePatch(patch: SharedDawLiveSoundPayload["bassMachinePatch"]) {
  if (!patch || typeof patch !== "object") {
    return undefined;
  }

  return {
    waveform: isSharedDawLiveBassWaveform(patch.waveform) ? patch.waveform : "sawtooth",
    cutoffFrequency: clampNumber(patch.cutoffFrequency, MIN_BASS_CUTOFF_FREQUENCY, MAX_BASS_CUTOFF_FREQUENCY),
    resonance: clampNumber(patch.resonance, MIN_BASS_RESONANCE, MAX_BASS_RESONANCE),
    envelopeAmount: clampNumber(patch.envelopeAmount, MIN_BASS_ENVELOPE_AMOUNT, MAX_BASS_ENVELOPE_AMOUNT),
    decaySeconds: clampNumber(patch.decaySeconds, MIN_BASS_DECAY_SECONDS, MAX_BASS_DECAY_SECONDS),
    gain: clampNumber(patch.gain, MIN_BASS_GAIN, MAX_BASS_GAIN),
  };
}

function isActorFreshInArea(snapshot: SessionSnapshot, actor: LocalProfile, areaId: string, nowMs: number) {
  const actorPresence = snapshot.freeRoamPresence.find((presence) => presence.userId === actor.id);

  if (!actorPresence || actorPresence.areaId !== areaId) {
    return false;
  }

  const updatedAtMs = Date.parse(actorPresence.updatedAt);
  return Number.isFinite(updatedAtMs) && nowMs - updatedAtMs <= FREE_ROAM_PRESENCE_TTL_MS;
}

function sanitizeSharedDawLiveSoundPayload(sound: SharedDawLiveSoundPayload): SharedDawLiveSoundPayload | null {
  if (sound.areaId !== "recording-studio" || !isSharedDawLiveSoundKind(sound.kind)) {
    return null;
  }

  const label = sanitizeSharedLabel(sound.label, MAX_DAW_LIVE_SOUND_LABEL_LENGTH);
  const fmSynthPatch = sanitizeSharedDawLiveFmSynthPatch(sound.fmSynthPatch);
  const bassMachinePatch = sanitizeSharedDawLiveBassMachinePatch(sound.bassMachinePatch);

  if (!label) {
    return null;
  }

  const gainScale = sound.gainScale === undefined ? undefined : clampNumber(sound.gainScale, 0, 1);
  const durationSeconds = sound.durationSeconds === undefined ? undefined : clampNumber(sound.durationSeconds, 0.05, 2);

  if (sound.kind === "drum") {
    if (!isSharedDawLiveDrumKind(sound.drumKind)) {
      return null;
    }

    return {
      areaId: sound.areaId,
      kind: "drum",
      label,
      drumKind: sound.drumKind,
      gainScale,
    };
  }

  if (sound.kind === "bass-pattern") {
    return {
      areaId: sound.areaId,
      kind: "bass-pattern",
      label,
      gainScale,
      bassMachinePatch,
    };
  }

  if (typeof sound.frequency !== "number" || !Number.isFinite(sound.frequency)) {
    return null;
  }

  const frequency = clampNumber(sound.frequency, 20, 20_000);

  if (sound.kind === "piano") {
    return {
      areaId: sound.areaId,
      kind: "piano",
      label,
      frequency,
      durationSeconds,
      gainScale,
      pianoTarget: isSharedDawLivePianoTarget(sound.pianoTarget) ? sound.pianoTarget : "fm-synth",
      fmSynthPatch,
      bassMachinePatch,
    };
  }

  const patchFields = sound.kind === "bass"
    ? { bassMachinePatch }
    : { fmSynthPatch };

  return {
    areaId: sound.areaId,
    kind: sound.kind,
    label,
    frequency,
    durationSeconds,
    gainScale,
    ...patchFields,
  };
}

function parseTimestamp(value?: string) {
  return value ? Date.parse(value) : undefined;
}

function setUserPresence(users: SessionUser[], userId: string, presence: SessionUser["presence"]) {
  return users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    return {
      ...user,
      presence,
    };
  });
}

function moveUsersToLobby(users: SessionUser[]) {
  return users.map((user) => ({
    ...user,
    presence: "idle" as const,
  }));
}

function removeTestUsers(users: SessionUser[]) {
  return users.filter((user) => !user.isTestUser);
}

function setAllTestUsersPresence(users: SessionUser[], presence: SessionUser["presence"]) {
  return users.map((user) => {
    if (!user.isTestUser || user.presence === "spectating") {
      return user;
    }

    return {
      ...user,
      presence,
    };
  });
}

function hasRealHost(snapshot: SessionSnapshot) {
  return snapshot.users.some((user) => user.id === snapshot.session.ownerId && !user.isTestUser);
}

function isActorHost(snapshot: SessionSnapshot, actor: LocalProfile) {
  const actorUser = snapshot.users.find((user) => user.id === actor.id);
  if (snapshot.session.ownerId === actor.id || actorUser?.isHost === true) {
    return true;
  }

  return !hasRealHost(snapshot) && actorUser !== undefined;
}

function transferOwnershipToActor(users: SessionUser[], actor: LocalProfile, joinedAt: string) {
  let actorFound = false;
  const nextUsers: SessionUser[] = users.map((user) => {
    if (user.id === actor.id) {
      actorFound = true;
        return {
          ...user,
          displayName: actor.displayName,
          avatarSeed: actor.avatarSeed,
          avatarUrl: actor.avatarUrl,
          isHost: true,
          isTestUser: false,
        };
    }

    return {
      ...user,
      isHost: false,
    };
  });

  if (actorFound) {
    return nextUsers;
  }

  return [
    ...nextUsers,
    {
      id: actor.id,
      displayName: actor.displayName,
      avatarSeed: actor.avatarSeed,
      avatarUrl: actor.avatarUrl,
      presence: "idle" as const,
      isHost: true,
      joinedAt,
    },
  ];
}

function hasValidCountdownTimeline(snapshot: SessionSnapshot) {
  const hasPrecount = Boolean(snapshot.countdown.preCountStartAt && snapshot.countdown.countdownStartAt && snapshot.countdown.countdownEndAt);
  const hasCompletion = Boolean(snapshot.countdown.countdownEndAt);

  if (snapshot.session.phase === "precount") {
    return hasPrecount;
  }

  if (snapshot.session.phase === "countdown" || snapshot.session.phase === "completed") {
    return hasCompletion;
  }

  return true;
}

function getBaseLobbyPhase(users: SessionUser[]): SessionPhase {
  const activeUsers = users.filter((user) => user.presence !== "spectating");

  if (activeUsers.length === 0) {
    return "idle";
  }

  return activeUsers.every((user) => user.presence === "ready") ? "armed" : "lobby";
}

function beginPrecount(snapshot: SessionSnapshot, triggerUserId: string, nowMs: number): SessionSnapshot {
  const preCountStartAt = new Date(nowMs).toISOString();
  const countdownStartAt = new Date(nowMs + snapshot.timerConfig.preCountSeconds * 1000).toISOString();
  const countdownEndAt = new Date(
    nowMs + snapshot.timerConfig.preCountSeconds * 1000 + snapshot.timerConfig.durationSeconds * 1000,
  ).toISOString();

  return {
    ...snapshot,
    session: {
      ...snapshot.session,
      phase: "precount",
    },
    countdown: {
      preCountStartAt,
      countdownStartAt,
      countdownEndAt,
      triggeredByUserId: triggerUserId,
    },
  };
}

export function createSessionSnapshot(overrides?: Partial<SessionSnapshot>): SessionSnapshot {
  const base: SessionSnapshot = {
    session: {
      id: "session-arcade-01",
      code: "DAB-2049",
      phase: "lobby",
      roundNumber: 3,
      ownerId: "host-1",
      capacity: {
        min: 2,
        max: 8,
      },
    },
    users: [
      {
        id: "host-1",
        displayName: "NeonPilot",
        avatarSeed: "NP",
        presence: "idle",
        isHost: true,
        isTestUser: true,
        joinedAt: "2026-04-19T19:00:00.000Z",
      },
      {
        id: "user-2",
        displayName: "CRT_Kat",
        avatarSeed: "CK",
        presence: "idle",
        isHost: false,
        isTestUser: true,
        joinedAt: "2026-04-19T19:00:06.000Z",
      },
    ],
    timerConfig: {
      durationSeconds: DEFAULT_TIMER_SECONDS,
      preCountSeconds: DEFAULT_PRECOUNT_SECONDS,
      countdownPrecisionDigits: 0,
      allowLateJoinSpectators: true,
      lateJoinersJoinReady: false,
      autoJoinOnLoad: false,
      presets: TIMER_PRESETS,
      preCountPresets: PRECOUNT_PRESETS,
    },
    countdown: createEmptyCountdown(),
    rangeScoreboard: [],
    freeRoamPresence: [],
    dawTransport: createInitialSharedDawTransport(),
    dawClips: createInitialSharedDawClipsState(),
    dawLiveSound: null,
    studioGuitar: createInitialSharedStudioGuitarState(),
  };

  return {
    ...base,
    ...overrides,
    session: {
      ...base.session,
      ...overrides?.session,
    },
    timerConfig: {
      ...base.timerConfig,
      ...overrides?.timerConfig,
    },
    countdown: {
      ...base.countdown,
      ...overrides?.countdown,
    },
    dawTransport: {
      ...base.dawTransport,
      ...overrides?.dawTransport,
    },
    dawClips: {
      ...base.dawClips,
      ...overrides?.dawClips,
      clips: overrides?.dawClips?.clips ?? base.dawClips.clips,
    },
    dawLiveSound: overrides?.dawLiveSound ?? base.dawLiveSound,
    studioGuitar: {
      ...base.studioGuitar,
      ...overrides?.studioGuitar,
    },
    users: overrides?.users ?? base.users,
  };
}

export function createInitialSharedDawTransport(updatedAt = INITIAL_SHARED_DAW_TRANSPORT_AT): SessionSnapshot["dawTransport"] {
  return {
    state: "stopped",
    bpm: DEFAULT_DAW_BPM,
    timeSignature: "4 / 4",
    anchorBar: 1,
    anchorBeat: 1,
    stoppedAt: updatedAt,
    updatedAt,
    updatedByUserId: "system",
    revision: 0,
  };
}

export function createInitialSharedDawClipsState(updatedAt = INITIAL_SHARED_DAW_TRANSPORT_AT): SessionSnapshot["dawClips"] {
  return {
    clips: [],
    revision: 0,
    updatedAt,
  };
}

export function createInitialSharedStudioGuitarState(updatedAt = INITIAL_SHARED_DAW_TRANSPORT_AT): SessionSnapshot["studioGuitar"] {
  return {
    holderUserId: null,
    updatedAt,
    updatedByUserId: null,
    revision: 0,
  };
}

export function normalizeSessionSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  const studioGuitar = snapshot.studioGuitar ?? createInitialSharedStudioGuitarState();
  const timerConfig = snapshot.timerConfig ?? {
    durationSeconds: DEFAULT_TIMER_SECONDS,
    preCountSeconds: DEFAULT_PRECOUNT_SECONDS,
    countdownPrecisionDigits: 0,
    allowLateJoinSpectators: true,
    lateJoinersJoinReady: false,
    autoJoinOnLoad: false,
    presets: TIMER_PRESETS,
    preCountPresets: PRECOUNT_PRESETS,
  };

  return {
    ...snapshot,
    timerConfig: {
      durationSeconds: clampTimerDuration(timerConfig.durationSeconds),
      preCountSeconds: clampPrecountDuration(timerConfig.preCountSeconds),
      countdownPrecisionDigits: clampCountdownPrecisionDigits(timerConfig.countdownPrecisionDigits ?? 0),
      allowLateJoinSpectators: timerConfig.allowLateJoinSpectators ?? true,
      lateJoinersJoinReady: timerConfig.lateJoinersJoinReady ?? false,
      autoJoinOnLoad: timerConfig.autoJoinOnLoad ?? false,
      presets: timerConfig.presets ?? TIMER_PRESETS,
      preCountPresets: timerConfig.preCountPresets ?? PRECOUNT_PRESETS,
    },
    dawTransport: snapshot.dawTransport ?? createInitialSharedDawTransport(),
    dawClips: snapshot.dawClips ?? createInitialSharedDawClipsState(),
    dawLiveSound: snapshot.dawLiveSound ?? null,
    studioGuitar: {
      ...studioGuitar,
      holderUserId: studioGuitar.holderUserId ?? null,
      updatedByUserId: studioGuitar.updatedByUserId ?? null,
    },
  };
}

export function attachLocalProfile(
  snapshot: SessionSnapshot,
  localProfile: LocalProfile,
  state?: Partial<DabSyncState>,
): DabSyncState {
  const normalizedSnapshot = normalizeSessionSnapshot(snapshot);
  const normalizedTimerConfig = {
    ...normalizedSnapshot.timerConfig,
    durationSeconds: clampTimerDuration(normalizedSnapshot.timerConfig.durationSeconds),
    preCountSeconds: clampPrecountDuration(normalizedSnapshot.timerConfig.preCountSeconds),
    countdownPrecisionDigits: clampCountdownPrecisionDigits(normalizedSnapshot.timerConfig.countdownPrecisionDigits ?? 0),
    presets: normalizedSnapshot.timerConfig.presets ?? TIMER_PRESETS,
    preCountPresets: normalizedSnapshot.timerConfig.preCountPresets ?? PRECOUNT_PRESETS,
  };

  return {
    ...normalizedSnapshot,
    timerConfig: normalizedTimerConfig,
    syncStatus: state?.syncStatus ?? {
      mode: "mock",
      connection: "offline",
    },
    localProfile,
  };
}

export function getSessionMetrics(users: SessionUser[]): SessionMetrics {
  const readyCount = users.filter((user) => user.presence === "ready").length;
  const spectatorCount = users.filter((user) => user.presence === "spectating").length;
  const activeCount = users.filter((user) => user.presence !== "spectating").length;

  return {
    readyCount,
    spectatorCount,
    activeCount,
    idleCount: activeCount - readyCount,
  };
}

export function getLocalUser(state: DabSyncState) {
  return state.users.find((user) => user.id === state.localProfile.id);
}

export function deriveLobbyState(state: DabSyncState): DerivedLobbyState {
  const localUser = getLocalUser(state);
  const metrics = getSessionMetrics(state.users);
  const isJoined = Boolean(localUser);
  const isLocalHost = isJoined && (
    state.session.ownerId === state.localProfile.id ||
    localUser?.isHost === true ||
    !hasRealHost(state)
  );
  const isLocalUserReady = localUser?.presence === "ready";
  const isLocalUserSpectating = localUser?.presence === "spectating";
  const canJoinSession = !isJoined && state.users.length < state.session.capacity.max;
  const canHoldToReady = isJoined && !isLocalUserSpectating && (state.session.phase === "lobby" || state.session.phase === "armed");
  const isArmed = state.session.phase === "armed";
  const releaseStartsCountdown = isArmed && isLocalUserReady;
  const canResetRound = state.session.phase === "completed";
  const canEditTimer =
    state.session.phase === "idle" ||
    state.session.phase === "lobby" ||
    state.session.phase === "armed" ||
    state.session.phase === "completed";

  const instructions = !isJoined
    ? ["Join session", "Hold SPACE or the on-screen button to ready", "Release to start once armed"]
    : isLocalUserSpectating
      ? ["You are spectating this round", "Late joiners stay out until replay", "Reset the session to re-enter the lobby"]
      : state.session.phase === "completed"
        ? ["Round complete", "Adjust the timer if needed", "Replay to return everyone to the lobby"]
        : ["Hold SPACE to ready", "Use the hold button on mouse or touch", "Release to start once all active users are armed"];

  return {
    localUser,
    metrics,
    isJoined,
    isLocalHost,
    canUseAdminTools: isLocalHost,
    isLocalUserReady,
    isLocalUserSpectating,
    canJoinSession,
    canHoldToReady,
    canEditTimer,
    canResetRound,
    isArmed,
    releaseStartsCountdown,
    lateJoinersSpectating: state.timerConfig.allowLateJoinSpectators,
    instructions,
  };
}

export function reduceSessionEvent(snapshot: SessionSnapshot, event: SessionEvent, actor: LocalProfile, nowMs = Date.now()): SessionSnapshot {
  snapshot = normalizeSessionSnapshot(snapshot);

  switch (event.type) {
    case "join_session": {
      const existingUser = snapshot.users.find((user) => user.id === actor.id);

      if (existingUser) {
        return snapshot;
      }

      const nextJoinedAt = new Date(nowMs).toISOString();
      const shouldClaimOwnership = !hasRealHost(snapshot);
      const availableUsers = shouldClaimOwnership ? removeTestUsers(snapshot.users) : snapshot.users;

      if (availableUsers.length >= snapshot.session.capacity.max) {
        return snapshot;
      }

      const isActiveCountdownJoin = snapshot.session.phase === "precount" || snapshot.session.phase === "countdown";
      const isCompletedJoin = snapshot.session.phase === "completed";
      const joinedPresence: SessionUser["presence"] = isActiveCountdownJoin
        ? snapshot.timerConfig.lateJoinersJoinReady
          ? "ready"
          : "spectating"
        : isCompletedJoin
          ? "spectating"
          : "idle";
      const nextUser: SessionUser = {
        id: actor.id,
        displayName: actor.displayName,
        avatarSeed: actor.avatarSeed,
        avatarUrl: actor.avatarUrl,
        presence: joinedPresence,
        isHost: false,
        joinedAt: nextJoinedAt,
      };
      const nextUsers = shouldClaimOwnership
        ? transferOwnershipToActor(availableUsers, actor, nextJoinedAt).map((user): SessionUser =>
            user.id === actor.id
              ? {
                  ...user,
                  presence: joinedPresence,
                }
              : user,
          )
        : [
            ...snapshot.users,
            nextUser,
          ];

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          ownerId: shouldClaimOwnership ? actor.id : snapshot.session.ownerId,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "roll_display_name":
    case "select_display_name": {
      const localUser = snapshot.users.find((user) => user.id === actor.id);

      if (!localUser) {
        return snapshot;
      }

      return {
        ...snapshot,
        users: snapshot.users.map((user) => (
          user.id === actor.id
            ? {
                ...user,
                displayName: actor.displayName,
                avatarSeed: actor.avatarSeed,
                avatarUrl: actor.avatarUrl,
              }
            : user
        )),
      };
    }
    case "ready_hold_start": {
      const localUser = snapshot.users.find((user) => user.id === actor.id);

      if (!localUser || localUser.presence === "spectating" || (snapshot.session.phase !== "lobby" && snapshot.session.phase !== "armed")) {
        return snapshot;
      }

      const nextUsers = setUserPresence(snapshot.users, localUser.id, "ready");

      return {
        ...snapshot,
        users: nextUsers,
        studioGuitar: releaseStudioGuitarIfHolderMissing(snapshot.studioGuitar, nextUsers, new Date(nowMs).toISOString()),
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "ready_hold_end": {
      const localUser = snapshot.users.find((user) => user.id === actor.id);

      if (!localUser || localUser.presence === "spectating" || (snapshot.session.phase !== "lobby" && snapshot.session.phase !== "armed")) {
        return snapshot;
      }

      if (snapshot.session.phase === "armed" && localUser.presence === "ready") {
        return beginPrecount(snapshot, localUser.id, nowMs);
      }

      const nextUsers = setUserPresence(snapshot.users, localUser.id, "idle");

      return {
        ...snapshot,
        users: nextUsers,
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "set_timer_duration": {
      if (snapshot.session.phase === "precount" || snapshot.session.phase === "countdown") {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          durationSeconds: clampTimerDuration(event.durationSeconds),
        },
      };
    }
    case "set_precount_duration": {
      if (snapshot.session.phase === "precount" || snapshot.session.phase === "countdown") {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          preCountSeconds: clampPrecountDuration(event.preCountSeconds),
        },
      };
    }
    case "reset_round": {
      if (snapshot.session.phase !== "completed") {
        return snapshot;
      }

      const nextUsers = moveUsersToLobby(snapshot.users);

      return {
        ...snapshot,
        users: nextUsers,
        countdown: createEmptyCountdown(),
        rangeScoreboard: [],
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
          roundNumber: snapshot.session.roundNumber + 1,
        },
      };
    }
    case "admin_force_start_round": {
      if (!isActorHost(snapshot, actor) || snapshot.session.phase === "precount" || snapshot.session.phase === "countdown") {
        return snapshot;
      }

      const actorExists = snapshot.users.some((user) => user.id === actor.id);

      if (!actorExists) {
        return snapshot;
      }

      const nextUsers = snapshot.users.map((user) => {
        if (user.presence === "spectating") {
          return user;
        }

        return {
          ...user,
          presence: user.id === actor.id ? "ready" as const : "idle" as const,
        };
      });

      return beginPrecount(
        {
          ...snapshot,
          users: nextUsers,
          countdown: createEmptyCountdown(),
        },
        actor.id,
        nowMs,
      );
    }
    case "admin_force_complete_round": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      return {
        ...snapshot,
        session: {
          ...snapshot.session,
          phase: "completed",
        },
        countdown: {
          ...snapshot.countdown,
          countdownEndAt: snapshot.countdown.countdownEndAt ?? new Date(nowMs).toISOString(),
          completedAt: new Date(nowMs).toISOString(),
          triggeredByUserId: snapshot.countdown.triggeredByUserId ?? actor.id,
        },
      };
    }
    case "admin_reset_session": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const nextUsers = moveUsersToLobby(snapshot.users);

      return {
        ...snapshot,
        users: nextUsers,
        countdown: createEmptyCountdown(),
        rangeScoreboard: [],
        freeRoamPresence: [],
        dawClips: createInitialSharedDawClipsState(new Date(nowMs).toISOString()),
        dawLiveSound: null,
        studioGuitar: createInitialSharedStudioGuitarState(new Date(nowMs).toISOString()),
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
          roundNumber: snapshot.session.phase === "completed" ? snapshot.session.roundNumber + 1 : snapshot.session.roundNumber,
        },
      };
    }
    case "admin_add_test_participant": {
      if (!isActorHost(snapshot, actor) || snapshot.users.length >= snapshot.session.capacity.max) {
        return snapshot;
      }

      const nextIndex =
        snapshot.users
          .filter((user) => user.isTestUser)
          .reduce((highest, user) => {
            const match = user.id.match(/test-user-(\d+)/);
            return match ? Math.max(highest, Number(match[1])) : highest;
          }, 0) + 1;

      const nextUsers = [
        ...snapshot.users,
        {
          id: `test-user-${nextIndex}`,
          displayName: `SimUser ${nextIndex}`,
          avatarSeed: `S${nextIndex.toString().slice(-1)}`.padEnd(2, "X"),
          presence:
            snapshot.session.phase === "precount" || snapshot.session.phase === "countdown" || snapshot.session.phase === "completed"
              ? "spectating"
              : "idle",
          isHost: false,
          isTestUser: true,
          joinedAt: new Date(nowMs).toISOString(),
        } satisfies SessionUser,
      ];

      return {
        ...snapshot,
        users: nextUsers,
        freeRoamPresence: snapshot.freeRoamPresence.filter((presence) => nextUsers.some((user) => user.id === presence.userId)),
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "admin_toggle_test_participants_ready": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const hasReadyTestUser = snapshot.users.some((user) => user.isTestUser && user.presence === "ready");
      const nextUsers = setAllTestUsersPresence(snapshot.users, hasReadyTestUser ? "idle" : "ready");

      return {
        ...snapshot,
        users: nextUsers,
        studioGuitar: releaseStudioGuitarIfHolderMissing(snapshot.studioGuitar, nextUsers, new Date(nowMs).toISOString()),
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "admin_clear_test_participants": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const nextUsers = removeTestUsers(snapshot.users);
      const updatedAt = new Date(nowMs).toISOString();

      return {
        ...snapshot,
        users: nextUsers,
        studioGuitar: releaseStudioGuitarIfHolderMissing(snapshot.studioGuitar, nextUsers, updatedAt),
        session: {
          ...snapshot.session,
          phase: getBaseLobbyPhase(nextUsers),
        },
      };
    }
    case "admin_set_late_joiners_join_ready": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          lateJoinersJoinReady: event.enabled,
        },
      };
    }
    case "admin_set_auto_join_on_load": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          autoJoinOnLoad: event.enabled,
        },
      };
    }
    case "admin_set_countdown_precision_digits": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      return {
        ...snapshot,
        timerConfig: {
          ...snapshot.timerConfig,
          countdownPrecisionDigits: clampCountdownPrecisionDigits(event.digits),
        },
      };
    }
    case "range_score_submit": {
      const sanitizedResult = sanitizeRangeScoreSubmission(event.result);

      if (!sanitizedResult) {
        return snapshot;
      }

      const actorUser = snapshot.users.find((user) => user.id === actor.id);
      const nextResult: RangeScoreResult = {
        ...sanitizedResult,
        roundNumber: snapshot.session.roundNumber,
        completedAt: new Date(nowMs).toISOString(),
        userId: actor.id,
        displayName: actor.displayName,
        avatarSeed: actor.avatarSeed,
        avatarUrl: actor.avatarUrl,
        isTestUser: actorUser?.isTestUser,
      };
      const nextRangeScoreboard = upsertRangeScoreResult(snapshot.rangeScoreboard, nextResult);

      if (nextRangeScoreboard === snapshot.rangeScoreboard) {
        return snapshot;
      }

      return {
        ...snapshot,
        rangeScoreboard: nextRangeScoreboard,
      };
    }
    case "free_roam_presence_update": {
      const sanitizedPresence = sanitizeFreeRoamPresenceUpdate(event.presence);

      if (!sanitizedPresence) {
        return snapshot;
      }

      const nextPresence: FreeRoamPresenceState = {
        ...sanitizedPresence,
        userId: actor.id,
        updatedAt: new Date(nowMs).toISOString(),
      };
      const maxEntries = Math.max(snapshot.session.capacity.max, snapshot.users.length, 1);

      return {
        ...snapshot,
        freeRoamPresence: upsertFreeRoamPresence(snapshot.freeRoamPresence, nextPresence, maxEntries),
      };
    }
    case "free_roam_presence_clear": {
      const nextFreeRoamPresence = snapshot.freeRoamPresence.filter((presence) => presence.userId !== actor.id);
      const nextStudioGuitar = releaseStudioGuitarIfHeldBy(snapshot.studioGuitar, actor.id, new Date(nowMs).toISOString());

      if (nextFreeRoamPresence.length === snapshot.freeRoamPresence.length && nextStudioGuitar === snapshot.studioGuitar) {
        return snapshot;
      }

      return {
        ...snapshot,
        freeRoamPresence: nextFreeRoamPresence,
        studioGuitar: nextStudioGuitar,
      };
    }
    case "daw_live_sound": {
      if (!isEligibleDawClipActor(snapshot, actor)) {
        return snapshot;
      }

      const sound = sanitizeSharedDawLiveSoundPayload(event.sound);

      if (!sound) {
        return snapshot;
      }

      if (!isActorFreshInArea(snapshot, actor, sound.areaId, nowMs)) {
        return snapshot;
      }

      const triggeredAt = new Date(nowMs).toISOString();
      const revision = (snapshot.dawLiveSound?.revision ?? 0) + 1;

      return {
        ...snapshot,
        dawLiveSound: {
          ...sound,
          id: `${actor.id}-${nowMs}-${revision}`,
          triggeredAt,
          triggeredByUserId: actor.id,
          revision,
        },
      };
    }
    case "studio_guitar_pickup": {
      if (!isEligibleDawClipActor(snapshot, actor) || !isActorFreshInArea(snapshot, actor, "recording-studio", nowMs)) {
        return snapshot;
      }

      if (snapshot.studioGuitar.holderUserId && snapshot.studioGuitar.holderUserId !== actor.id) {
        return snapshot;
      }

      if (snapshot.studioGuitar.holderUserId === actor.id) {
        return snapshot;
      }

      const updatedAt = new Date(nowMs).toISOString();

      return {
        ...snapshot,
        studioGuitar: {
          holderUserId: actor.id,
          updatedAt,
          updatedByUserId: actor.id,
          revision: snapshot.studioGuitar.revision + 1,
        },
      };
    }
    case "studio_guitar_drop": {
      if (snapshot.studioGuitar.holderUserId !== actor.id) {
        return snapshot;
      }

      return {
        ...snapshot,
        studioGuitar: releaseStudioGuitar(snapshot.studioGuitar, new Date(nowMs).toISOString(), actor.id),
      };
    }
    case "daw_transport_set_tempo": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const updatedAt = new Date(nowMs).toISOString();

      return {
        ...snapshot,
        dawTransport: {
          ...snapshot.dawTransport,
          bpm: clampDawBpm(event.bpm),
          updatedAt,
          updatedByUserId: actor.id,
          revision: snapshot.dawTransport.revision + 1,
        },
      };
    }
    case "daw_transport_play": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const updatedAt = new Date(nowMs).toISOString();

      return {
        ...snapshot,
        dawTransport: {
          ...snapshot.dawTransport,
          state: "playing",
          anchorBar: 1,
          anchorBeat: 1,
          startedAt: updatedAt,
          stoppedAt: undefined,
          updatedAt,
          updatedByUserId: actor.id,
          revision: snapshot.dawTransport.revision + 1,
        },
      };
    }
    case "daw_transport_stop": {
      if (!isActorHost(snapshot, actor)) {
        return snapshot;
      }

      const updatedAt = new Date(nowMs).toISOString();

      return {
        ...snapshot,
        dawTransport: {
          ...snapshot.dawTransport,
          state: "stopped",
          anchorBar: 1,
          anchorBeat: 1,
          startedAt: undefined,
          stoppedAt: updatedAt,
          updatedAt,
          updatedByUserId: actor.id,
          revision: snapshot.dawTransport.revision + 1,
        },
      };
    }
    case "daw_clip_publish": {
      if (!isEligibleDawClipActor(snapshot, actor)) {
        return snapshot;
      }

      const sanitizedClip = sanitizeSharedDawClipPublishPayload(event.clip);

      if (!sanitizedClip) {
        return snapshot;
      }

      const slotId = getSharedDawClipSlotId(sanitizedClip.trackId, sanitizedClip.sceneIndex);
      const existingClipIndex = snapshot.dawClips.clips.findIndex((clip) => clip.summary.id === slotId);
      const existingClip = existingClipIndex >= 0 ? snapshot.dawClips.clips[existingClipIndex] : null;
      const canEditExistingClip = !existingClip || existingClip.summary.ownerUserId === actor.id || isActorHost(snapshot, actor);

      if (!canEditExistingClip || (!existingClip && snapshot.dawClips.clips.length >= MAX_SHARED_DAW_CLIPS)) {
        return snapshot;
      }

      const updatedAt = new Date(nowMs).toISOString();
      const nextRevision = (existingClip?.summary.revision ?? 0) + 1;
      const nextClip: SharedDawClip = {
        summary: {
          id: slotId,
          trackId: sanitizedClip.trackId,
          sceneIndex: sanitizedClip.sceneIndex,
          label: sanitizedClip.label,
          kind: sanitizedClip.kind,
          state: "recorded",
          lengthBars: sanitizedClip.lengthBars,
          noteCount: sanitizedClip.midiNotes.length,
          controlEventCount: sanitizedClip.controlEvents.length,
          ownerUserId: existingClip?.summary.ownerUserId ?? actor.id,
          updatedByUserId: actor.id,
          updatedAt,
          revision: nextRevision,
          checksum: createSharedDawClipChecksum(sanitizedClip),
        },
        midiNotes: sanitizedClip.midiNotes,
        controlEvents: sanitizedClip.controlEvents,
      };
      const nextClips = existingClipIndex >= 0
        ? snapshot.dawClips.clips.map((clip, index) => (index === existingClipIndex ? nextClip : clip))
        : [...snapshot.dawClips.clips, nextClip];

      return {
        ...snapshot,
        dawClips: {
          clips: nextClips,
          revision: snapshot.dawClips.revision + 1,
          updatedAt,
        },
      };
    }
    case "daw_clip_clear": {
      if (!isEligibleDawClipActor(snapshot, actor) || !isSharedDawTrackId(event.trackId)) {
        return snapshot;
      }

      const sceneIndex = Math.round(event.sceneIndex);

      if (sceneIndex < 0 || sceneIndex >= SHARED_DAW_SCENE_COUNT) {
        return snapshot;
      }

      const slotId = getSharedDawClipSlotId(event.trackId, sceneIndex);
      const existingClip = snapshot.dawClips.clips.find((clip) => clip.summary.id === slotId);

      if (!existingClip || (existingClip.summary.ownerUserId !== actor.id && !isActorHost(snapshot, actor))) {
        return snapshot;
      }

      const updatedAt = new Date(nowMs).toISOString();

      return {
        ...snapshot,
        dawClips: {
          clips: snapshot.dawClips.clips.filter((clip) => clip.summary.id !== slotId),
          revision: snapshot.dawClips.revision + 1,
          updatedAt,
        },
      };
    }
    default:
      return snapshot;
  }
}

export function advanceSessionTime(snapshot: SessionSnapshot, nowMs = Date.now()): SessionSnapshot {
  snapshot = normalizeSessionSnapshot(snapshot);

  const prunedFreeRoamPresence = pruneFreeRoamPresence(snapshot.freeRoamPresence, nowMs);
  const studioGuitarAfterPresence = snapshot.studioGuitar.holderUserId && !prunedFreeRoamPresence.some((presence) => presence.userId === snapshot.studioGuitar.holderUserId)
    ? releaseStudioGuitar(snapshot.studioGuitar, new Date(nowMs).toISOString(), "system")
    : snapshot.studioGuitar;
  const snapshotWithFreshPresence = prunedFreeRoamPresence.length === snapshot.freeRoamPresence.length && studioGuitarAfterPresence === snapshot.studioGuitar
    ? snapshot
    : {
      ...snapshot,
      freeRoamPresence: prunedFreeRoamPresence,
      studioGuitar: studioGuitarAfterPresence,
    };

  if (!hasValidCountdownTimeline(snapshotWithFreshPresence)) {
    const nextUsers = moveUsersToLobby(snapshotWithFreshPresence.users);

    return {
      ...snapshotWithFreshPresence,
      users: nextUsers,
      countdown: createEmptyCountdown(),
      session: {
        ...snapshotWithFreshPresence.session,
        phase: getBaseLobbyPhase(nextUsers),
      },
    };
  }

  if (snapshotWithFreshPresence.session.phase === "precount") {
    const countdownStartMs = parseTimestamp(snapshotWithFreshPresence.countdown.countdownStartAt);

    if (countdownStartMs !== undefined && nowMs >= countdownStartMs) {
      return {
        ...snapshotWithFreshPresence,
        session: {
          ...snapshotWithFreshPresence.session,
          phase: "countdown",
        },
      };
    }
  }

  if (snapshotWithFreshPresence.session.phase === "countdown") {
    const countdownEndMs = parseTimestamp(snapshotWithFreshPresence.countdown.countdownEndAt);

    if (countdownEndMs !== undefined && nowMs >= countdownEndMs) {
      return {
        ...snapshotWithFreshPresence,
        session: {
          ...snapshotWithFreshPresence.session,
          phase: "completed",
        },
        countdown: {
          ...snapshotWithFreshPresence.countdown,
          completedAt: new Date(nowMs).toISOString(),
        },
      };
    }
  }

  return snapshotWithFreshPresence;
}
