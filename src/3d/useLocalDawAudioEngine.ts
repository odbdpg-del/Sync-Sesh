import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type LocalDawAudioEngineStatus = "idle" | "unsupported" | "ready" | "suspended" | "closed" | "error";
export type LocalDawFmSynthEnvelopePreset = "pluck" | "stab" | "pad";
export type LocalDawDrumVoiceKind = "kick" | "snare" | "hat";
export type LocalDawBassWaveform = "sawtooth" | "square";
export type LocalDawPianoLiveTarget = "fm-synth" | "bass";

export interface LocalDawFmSynthPatch {
  carrierFrequency: number;
  modulationRatio: number;
  modulationIndex: number;
  envelopePreset: LocalDawFmSynthEnvelopePreset;
  gain: number;
}

export interface LocalDawFmSynthNote {
  label: string;
  frequency: number;
  durationSeconds?: number;
  gainScale?: number;
  fmSynthPatch?: LocalDawFmSynthPatch;
}

export interface LocalDawDrumHit {
  kind: LocalDawDrumVoiceKind;
  label: string;
  gainScale?: number;
}

export interface LocalDawBassMachinePatch {
  waveform: LocalDawBassWaveform;
  cutoffFrequency: number;
  resonance: number;
  envelopeAmount: number;
  decaySeconds: number;
  gain: number;
}

export interface LocalDawFilterEffectPatch {
  cutoffFrequency: number;
  resonance: number;
}

export interface LocalDawAutopanEffectPatch {
  rateHz: number;
  depth: number;
}

export interface LocalDawEchoEffectPatch {
  delayTimeSeconds: number;
  feedback: number;
  wetMix: number;
}

export interface LocalDawReverbEffectPatch {
  decaySeconds: number;
  wetMix: number;
}

export interface LocalDawBassNote {
  label: string;
  frequency: number;
  durationSeconds?: number;
  gainScale?: number;
  bassMachinePatch?: LocalDawBassMachinePatch;
}

export interface LocalDawPianoLiveNote {
  label: string;
  frequency: number;
  durationSeconds?: number;
  gainScale?: number;
  fmSynthPatch?: LocalDawFmSynthPatch;
  bassMachinePatch?: LocalDawBassMachinePatch;
}

export interface LocalDawGeneratedSoundOptions {
  allowSound?: boolean;
}

export interface LocalDawAudioEngineState {
  status: LocalDawAudioEngineStatus;
  isInitialized: boolean;
  isMuted: boolean;
  masterVolume: number;
  errorMessage: string | null;
  fmSynthPatch: LocalDawFmSynthPatch;
  lastFmSynthNoteLabel: string | null;
  activeFmSynthVoiceCount: number;
  lastDrumHitLabel: string | null;
  activeDrumVoiceCount: number;
  bassMachinePatch: LocalDawBassMachinePatch;
  lastBassNoteLabel: string | null;
  activeBassVoiceCount: number;
  isBassPatternAuditioning: boolean;
  filterEffectPatch: LocalDawFilterEffectPatch;
  autopanEffectPatch: LocalDawAutopanEffectPatch;
  echoEffectPatch: LocalDawEchoEffectPatch;
  reverbEffectPatch: LocalDawReverbEffectPatch;
  lastPianoLiveNoteLabel: string | null;
  lastPianoLiveTarget: LocalDawPianoLiveTarget | null;
}

export interface LocalDawAudioEngineActions {
  initialize: () => Promise<void>;
  setMuted: (isMuted: boolean) => void;
  toggleMuted: () => void;
  setMasterVolume: (volume: number) => void;
  playMetronomeTick: (isAccent?: boolean) => void;
  playFmSynthNote: (note: LocalDawFmSynthNote) => void;
  adjustFmSynthPatch: (patchDelta: Partial<LocalDawFmSynthPatch>) => void;
  stopFmSynthVoices: () => void;
  playDrumVoice: (hit: LocalDawDrumHit, options?: LocalDawGeneratedSoundOptions) => void;
  stopDrumVoices: () => void;
  playBassNote: (note: LocalDawBassNote) => void;
  adjustBassMachinePatch: (patchDelta: Partial<LocalDawBassMachinePatch>) => void;
  playBassPatternAudition: (gainScale?: number, bassMachinePatch?: LocalDawBassMachinePatch) => void;
  stopBassVoices: () => void;
  adjustFilterEffectPatch: (patchDelta: Partial<LocalDawFilterEffectPatch>) => void;
  adjustAutopanEffectPatch: (patchDelta: Partial<LocalDawAutopanEffectPatch>) => void;
  adjustEchoEffectPatch: (patchDelta: Partial<LocalDawEchoEffectPatch>) => void;
  adjustReverbEffectPatch: (patchDelta: Partial<LocalDawReverbEffectPatch>) => void;
  playPianoLiveNote: (note: LocalDawPianoLiveNote, target?: LocalDawPianoLiveTarget, options?: LocalDawGeneratedSoundOptions) => void;
  cleanup: () => void;
}

const MAX_MASTER_VOLUME = 1.5;
const MIN_FM_FREQUENCY = 55;
const MAX_FM_FREQUENCY = 1760;
const MIN_FM_RATIO = 0.25;
const MAX_FM_RATIO = 8;
const MIN_FM_INDEX = 0;
const MAX_FM_INDEX = 2.5;
const MIN_FM_GAIN = 0;
const MAX_FM_GAIN = 0.18;
const MIN_FM_DURATION_SECONDS = 0.08;
const MAX_FM_DURATION_SECONDS = 1.2;
const MAX_ACTIVE_FM_VOICES = 4;
const MAX_ACTIVE_DRUM_VOICES = 6;
const MAX_ACTIVE_BASS_VOICES = 3;
const FM_SYNTH_C3_FREQUENCY = 130.81;
const MIN_BASS_FREQUENCY = 41.2;
const MAX_BASS_FREQUENCY = 220;
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
const MIN_BASS_DURATION_SECONDS = 0.08;
const MAX_BASS_DURATION_SECONDS = 1.4;
const MIN_FILTER_CUTOFF_FREQUENCY = 120;
const MAX_FILTER_CUTOFF_FREQUENCY = 12000;
const MIN_FILTER_RESONANCE = 0.3;
const MAX_FILTER_RESONANCE = 10;
const MIN_AUTOPAN_RATE_HZ = 0.05;
const MAX_AUTOPAN_RATE_HZ = 8;
const MIN_AUTOPAN_DEPTH = 0;
const MAX_AUTOPAN_DEPTH = 1;
const MIN_ECHO_DELAY_TIME_SECONDS = 0.06;
const MAX_ECHO_DELAY_TIME_SECONDS = 0.75;
const MIN_ECHO_FEEDBACK = 0;
const MAX_ECHO_FEEDBACK = 0.45;
const MIN_ECHO_WET_MIX = 0;
const MAX_ECHO_WET_MIX = 0.35;
const MIN_REVERB_DECAY_SECONDS = 0.2;
const MAX_REVERB_DECAY_SECONDS = 2.2;
const MIN_REVERB_WET_MIX = 0;
const MAX_REVERB_WET_MIX = 0.3;
const INITIAL_FM_SYNTH_PATCH: LocalDawFmSynthPatch = {
  carrierFrequency: 220,
  modulationRatio: 2,
  modulationIndex: 0.7,
  envelopePreset: "pluck",
  gain: 0.08,
};
const INITIAL_BASS_MACHINE_PATCH: LocalDawBassMachinePatch = {
  waveform: "sawtooth",
  cutoffFrequency: 420,
  resonance: 2.4,
  envelopeAmount: 760,
  decaySeconds: 0.42,
  gain: 0.08,
};
const INITIAL_FILTER_EFFECT_PATCH: LocalDawFilterEffectPatch = {
  cutoffFrequency: 12000,
  resonance: 0.7,
};
const INITIAL_AUTOPAN_EFFECT_PATCH: LocalDawAutopanEffectPatch = {
  rateHz: 0.5,
  depth: 0,
};
const INITIAL_ECHO_EFFECT_PATCH: LocalDawEchoEffectPatch = {
  delayTimeSeconds: 0.25,
  feedback: 0.18,
  wetMix: 0,
};
const INITIAL_REVERB_EFFECT_PATCH: LocalDawReverbEffectPatch = {
  decaySeconds: 0.8,
  wetMix: 0,
};
const ENGINE_START_MASTER_VOLUME = 0.36;
const INITIAL_AUDIO_ENGINE_STATE: LocalDawAudioEngineState = {
  status: "idle",
  isInitialized: false,
  isMuted: true,
  masterVolume: 0,
  errorMessage: null,
  fmSynthPatch: INITIAL_FM_SYNTH_PATCH,
  lastFmSynthNoteLabel: null,
  activeFmSynthVoiceCount: 0,
  lastDrumHitLabel: null,
  activeDrumVoiceCount: 0,
  bassMachinePatch: INITIAL_BASS_MACHINE_PATCH,
  lastBassNoteLabel: null,
  activeBassVoiceCount: 0,
  isBassPatternAuditioning: false,
  filterEffectPatch: INITIAL_FILTER_EFFECT_PATCH,
  autopanEffectPatch: INITIAL_AUTOPAN_EFFECT_PATCH,
  echoEffectPatch: INITIAL_ECHO_EFFECT_PATCH,
  reverbEffectPatch: INITIAL_REVERB_EFFECT_PATCH,
  lastPianoLiveNoteLabel: null,
  lastPianoLiveTarget: null,
};

function getAudioContextClass() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function getStatusFromAudioContext(audioContext: AudioContext): LocalDawAudioEngineStatus {
  if (audioContext.state === "closed") {
    return "closed";
  }

  if (audioContext.state === "suspended") {
    return "suspended";
  }

  return "ready";
}

function clampMasterVolume(volume: number) {
  return Math.min(MAX_MASTER_VOLUME, Math.max(0, volume));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getEffectiveGain({ isMuted, masterVolume }: Pick<LocalDawAudioEngineState, "isMuted" | "masterVolume">) {
  return isMuted ? 0 : clampMasterVolume(masterVolume);
}

function getClampedVoiceGainScale(gainScale = 1) {
  return clamp(gainScale, 0, 1);
}

function isFmEnvelopePreset(value: unknown): value is LocalDawFmSynthEnvelopePreset {
  return value === "pluck" || value === "stab" || value === "pad";
}

function isBassWaveform(value: unknown): value is LocalDawBassWaveform {
  return value === "sawtooth" || value === "square";
}

function getClampedFmSynthPatch(patch: LocalDawFmSynthPatch): LocalDawFmSynthPatch {
  return {
    carrierFrequency: clamp(patch.carrierFrequency, MIN_FM_FREQUENCY, MAX_FM_FREQUENCY),
    modulationRatio: clamp(patch.modulationRatio, MIN_FM_RATIO, MAX_FM_RATIO),
    modulationIndex: clamp(patch.modulationIndex, MIN_FM_INDEX, MAX_FM_INDEX),
    envelopePreset: isFmEnvelopePreset(patch.envelopePreset) ? patch.envelopePreset : "pluck",
    gain: clamp(patch.gain, MIN_FM_GAIN, MAX_FM_GAIN),
  };
}

function getClampedBassMachinePatch(patch: LocalDawBassMachinePatch): LocalDawBassMachinePatch {
  return {
    waveform: isBassWaveform(patch.waveform) ? patch.waveform : "sawtooth",
    cutoffFrequency: clamp(patch.cutoffFrequency, MIN_BASS_CUTOFF_FREQUENCY, MAX_BASS_CUTOFF_FREQUENCY),
    resonance: clamp(patch.resonance, MIN_BASS_RESONANCE, MAX_BASS_RESONANCE),
    envelopeAmount: clamp(patch.envelopeAmount, MIN_BASS_ENVELOPE_AMOUNT, MAX_BASS_ENVELOPE_AMOUNT),
    decaySeconds: clamp(patch.decaySeconds, MIN_BASS_DECAY_SECONDS, MAX_BASS_DECAY_SECONDS),
    gain: clamp(patch.gain, MIN_BASS_GAIN, MAX_BASS_GAIN),
  };
}

function getClampedFilterEffectPatch(patch: LocalDawFilterEffectPatch): LocalDawFilterEffectPatch {
  return {
    cutoffFrequency: clamp(patch.cutoffFrequency, MIN_FILTER_CUTOFF_FREQUENCY, MAX_FILTER_CUTOFF_FREQUENCY),
    resonance: clamp(patch.resonance, MIN_FILTER_RESONANCE, MAX_FILTER_RESONANCE),
  };
}

function getClampedAutopanEffectPatch(patch: LocalDawAutopanEffectPatch): LocalDawAutopanEffectPatch {
  return {
    rateHz: clamp(patch.rateHz, MIN_AUTOPAN_RATE_HZ, MAX_AUTOPAN_RATE_HZ),
    depth: clamp(patch.depth, MIN_AUTOPAN_DEPTH, MAX_AUTOPAN_DEPTH),
  };
}

function getClampedEchoEffectPatch(patch: LocalDawEchoEffectPatch): LocalDawEchoEffectPatch {
  return {
    delayTimeSeconds: clamp(patch.delayTimeSeconds, MIN_ECHO_DELAY_TIME_SECONDS, MAX_ECHO_DELAY_TIME_SECONDS),
    feedback: clamp(patch.feedback, MIN_ECHO_FEEDBACK, MAX_ECHO_FEEDBACK),
    wetMix: clamp(patch.wetMix, MIN_ECHO_WET_MIX, MAX_ECHO_WET_MIX),
  };
}

function getClampedReverbEffectPatch(patch: LocalDawReverbEffectPatch): LocalDawReverbEffectPatch {
  return {
    decaySeconds: clamp(patch.decaySeconds, MIN_REVERB_DECAY_SECONDS, MAX_REVERB_DECAY_SECONDS),
    wetMix: clamp(patch.wetMix, MIN_REVERB_WET_MIX, MAX_REVERB_WET_MIX),
  };
}

function getFmEnvelopeTimings(preset: LocalDawFmSynthEnvelopePreset, requestedDurationSeconds?: number) {
  const defaultDuration = preset === "pad" ? 0.85 : preset === "stab" ? 0.32 : 0.46;
  const durationSeconds = clamp(requestedDurationSeconds ?? defaultDuration, MIN_FM_DURATION_SECONDS, MAX_FM_DURATION_SECONDS);

  if (preset === "pad") {
    return {
      attackSeconds: 0.06,
      decaySeconds: 0.18,
      sustainLevel: 0.42,
      releaseSeconds: 0.18,
      durationSeconds,
    };
  }

  if (preset === "stab") {
    return {
      attackSeconds: 0.01,
      decaySeconds: 0.08,
      sustainLevel: 0.18,
      releaseSeconds: 0.08,
      durationSeconds,
    };
  }

  return {
    attackSeconds: 0.008,
    decaySeconds: 0.12,
    sustainLevel: 0.08,
    releaseSeconds: 0.12,
    durationSeconds,
  };
}

function isAudioEngineAudibleReady(
  audioContext: AudioContext | null,
  masterGain: GainNode | null,
  state: LocalDawAudioEngineState,
) {
  return Boolean(
    audioContext &&
      masterGain &&
      state.isInitialized &&
      state.status === "ready" &&
      !state.isMuted &&
      state.masterVolume > 0 &&
      audioContext.state === "running",
  );
}

function createPercussionNoiseBuffer(audioContext: AudioContext, durationSeconds: number) {
  const sampleCount = Math.max(1, Math.floor(audioContext.sampleRate * durationSeconds));
  const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createReverbImpulseBuffer(audioContext: AudioContext, decaySeconds: number) {
  const impulseSeconds = clamp(decaySeconds, MIN_REVERB_DECAY_SECONDS, MAX_REVERB_DECAY_SECONDS);
  const sampleCount = Math.max(1, Math.floor(audioContext.sampleRate * impulseSeconds));
  const buffer = audioContext.createBuffer(2, sampleCount, audioContext.sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);

    for (let index = 0; index < sampleCount; index += 1) {
      const progress = index / sampleCount;
      const envelope = (1 - progress) ** 2.4;

      data[index] = (Math.random() * 2 - 1) * envelope * 0.45;
    }
  }

  return buffer;
}

export function useLocalDawAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const autopanNodeRef = useRef<StereoPannerNode | null>(null);
  const autopanLfoRef = useRef<OscillatorNode | null>(null);
  const autopanDepthGainRef = useRef<GainNode | null>(null);
  const echoInputRef = useRef<GainNode | null>(null);
  const echoDryGainRef = useRef<GainNode | null>(null);
  const echoWetGainRef = useRef<GainNode | null>(null);
  const echoDelayRef = useRef<DelayNode | null>(null);
  const echoFeedbackGainRef = useRef<GainNode | null>(null);
  const echoOutputRef = useRef<GainNode | null>(null);
  const reverbInputRef = useRef<GainNode | null>(null);
  const reverbDryGainRef = useRef<GainNode | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const reverbConvolverRef = useRef<ConvolverNode | null>(null);
  const reverbOutputRef = useRef<GainNode | null>(null);
  const fmSynthVoiceCleanupsRef = useRef(new Set<() => void>());
  const drumVoiceCleanupsRef = useRef(new Set<() => void>());
  const bassVoiceCleanupsRef = useRef(new Set<() => void>());
  const bassPatternTimeoutsRef = useRef<number[]>([]);
  const [state, setState] = useState<LocalDawAudioEngineState>(INITIAL_AUDIO_ENGINE_STATE);
  const stateRef = useRef(state);
  const setActiveFmSynthVoiceCount = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      activeFmSynthVoiceCount: fmSynthVoiceCleanupsRef.current.size,
    }));
  }, []);
  const setActiveDrumVoiceCount = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      activeDrumVoiceCount: drumVoiceCleanupsRef.current.size,
    }));
  }, []);
  const setActiveBassVoiceCount = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      activeBassVoiceCount: bassVoiceCleanupsRef.current.size,
    }));
  }, []);
  const stopFmSynthVoices = useCallback(() => {
    const cleanupCallbacks = Array.from(fmSynthVoiceCleanupsRef.current);

    cleanupCallbacks.forEach((cleanupVoice) => cleanupVoice());
    fmSynthVoiceCleanupsRef.current.clear();
    setActiveFmSynthVoiceCount();
  }, [setActiveFmSynthVoiceCount]);
  const stopDrumVoices = useCallback(() => {
    const cleanupCallbacks = Array.from(drumVoiceCleanupsRef.current);

    cleanupCallbacks.forEach((cleanupVoice) => cleanupVoice());
    drumVoiceCleanupsRef.current.clear();
    setActiveDrumVoiceCount();
  }, [setActiveDrumVoiceCount]);
  const stopBassVoices = useCallback(() => {
    const cleanupCallbacks = Array.from(bassVoiceCleanupsRef.current);

    bassPatternTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    bassPatternTimeoutsRef.current = [];
    cleanupCallbacks.forEach((cleanupVoice) => cleanupVoice());
    bassVoiceCleanupsRef.current.clear();
    setActiveBassVoiceCount();
    setState((currentState) => ({
      ...currentState,
      isBassPatternAuditioning: false,
    }));
  }, [setActiveBassVoiceCount]);
  const closeAudioContext = useCallback(() => {
    const audioContext = audioContextRef.current;

    stopFmSynthVoices();
    stopDrumVoices();
    stopBassVoices();

    try {
      autopanLfoRef.current?.stop();
    } catch {
      // Cleanup should never block shell exit.
    }

    try {
      autopanLfoRef.current?.disconnect();
      autopanDepthGainRef.current?.disconnect();
      autopanNodeRef.current?.disconnect();
    } catch {
      // Cleanup should never block shell exit.
    }

    try {
      echoInputRef.current?.disconnect();
      echoDryGainRef.current?.disconnect();
      echoWetGainRef.current?.disconnect();
      echoDelayRef.current?.disconnect();
      echoFeedbackGainRef.current?.disconnect();
      echoOutputRef.current?.disconnect();
    } catch {
      // Cleanup should never block shell exit.
    }

    try {
      reverbInputRef.current?.disconnect();
      reverbDryGainRef.current?.disconnect();
      reverbWetGainRef.current?.disconnect();
      reverbConvolverRef.current?.disconnect();
      reverbOutputRef.current?.disconnect();
    } catch {
      // Cleanup should never block shell exit.
    }

    try {
      filterNodeRef.current?.disconnect();
    } catch {
      // Cleanup should never block shell exit.
    }

    try {
      masterGainRef.current?.disconnect();
    } catch {
      // Cleanup should never block shell exit.
    }

    filterNodeRef.current = null;
    autopanNodeRef.current = null;
    autopanLfoRef.current = null;
    autopanDepthGainRef.current = null;
    echoInputRef.current = null;
    echoDryGainRef.current = null;
    echoWetGainRef.current = null;
    echoDelayRef.current = null;
    echoFeedbackGainRef.current = null;
    echoOutputRef.current = null;
    reverbInputRef.current = null;
    reverbDryGainRef.current = null;
    reverbWetGainRef.current = null;
    reverbConvolverRef.current = null;
    reverbOutputRef.current = null;
    masterGainRef.current = null;
    audioContextRef.current = null;

    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }
  }, [stopBassVoices, stopDrumVoices, stopFmSynthVoices]);
  const applyGain = useCallback((nextState: Pick<LocalDawAudioEngineState, "isMuted" | "masterVolume">) => {
    const masterGain = masterGainRef.current;

    if (!masterGain) {
      return;
    }

    masterGain.gain.value = getEffectiveGain(nextState);
  }, []);
  const applyFilterEffectPatch = useCallback((patch: LocalDawFilterEffectPatch) => {
    const filterNode = filterNodeRef.current;
    const audioContext = audioContextRef.current;

    if (!filterNode || !audioContext) {
      return;
    }

    const nextPatch = getClampedFilterEffectPatch(patch);
    const now = audioContext.currentTime;

    filterNode.frequency.setValueAtTime(nextPatch.cutoffFrequency, now);
    filterNode.Q.setValueAtTime(nextPatch.resonance, now);
  }, []);
  const applyAutopanEffectPatch = useCallback((patch: LocalDawAutopanEffectPatch) => {
    const autopanLfo = autopanLfoRef.current;
    const autopanDepthGain = autopanDepthGainRef.current;
    const audioContext = audioContextRef.current;

    if (!autopanLfo || !autopanDepthGain || !audioContext) {
      return;
    }

    const nextPatch = getClampedAutopanEffectPatch(patch);
    const now = audioContext.currentTime;

    autopanLfo.frequency.setValueAtTime(nextPatch.rateHz, now);
    autopanDepthGain.gain.setValueAtTime(nextPatch.depth, now);
  }, []);
  const applyEchoEffectPatch = useCallback((patch: LocalDawEchoEffectPatch) => {
    const audioContext = audioContextRef.current;
    const echoDryGain = echoDryGainRef.current;
    const echoWetGain = echoWetGainRef.current;
    const echoDelay = echoDelayRef.current;
    const echoFeedbackGain = echoFeedbackGainRef.current;

    if (!audioContext || !echoDryGain || !echoWetGain || !echoDelay || !echoFeedbackGain) {
      return;
    }

    const nextPatch = getClampedEchoEffectPatch(patch);
    const now = audioContext.currentTime;

    echoDelay.delayTime.setValueAtTime(nextPatch.delayTimeSeconds, now);
    echoFeedbackGain.gain.setValueAtTime(nextPatch.feedback, now);
    echoWetGain.gain.setValueAtTime(nextPatch.wetMix, now);
    echoDryGain.gain.setValueAtTime(1 - nextPatch.wetMix, now);
  }, []);
  const applyReverbEffectPatch = useCallback((patch: LocalDawReverbEffectPatch, shouldRegenerateImpulse = false) => {
    const audioContext = audioContextRef.current;
    const reverbDryGain = reverbDryGainRef.current;
    const reverbWetGain = reverbWetGainRef.current;
    const reverbConvolver = reverbConvolverRef.current;

    if (!audioContext || !reverbDryGain || !reverbWetGain || !reverbConvolver) {
      return;
    }

    const nextPatch = getClampedReverbEffectPatch(patch);
    const now = audioContext.currentTime;

    reverbWetGain.gain.setValueAtTime(nextPatch.wetMix, now);
    reverbDryGain.gain.setValueAtTime(1 - nextPatch.wetMix, now);

    if (shouldRegenerateImpulse) {
      reverbConvolver.buffer = createReverbImpulseBuffer(audioContext, nextPatch.decaySeconds);
    }
  }, []);
  const getAppOwnedTrackOutputNode = useCallback((masterGain: GainNode) => (
    filterNodeRef.current ?? autopanNodeRef.current ?? echoInputRef.current ?? reverbInputRef.current ?? masterGain
  ), []);
  const initialize = useCallback(async () => {
    const existingAudioContext = audioContextRef.current;

    if (existingAudioContext && existingAudioContext.state !== "closed") {
      try {
        if (existingAudioContext.state === "suspended") {
          await existingAudioContext.resume();
        }

        setState((currentState) => {
          const nextState = {
            ...currentState,
            status: getStatusFromAudioContext(existingAudioContext),
            isInitialized: true,
            isMuted: false,
            masterVolume: currentState.masterVolume > 0 ? currentState.masterVolume : ENGINE_START_MASTER_VOLUME,
            errorMessage: null,
          };

          applyGain(nextState);
          return nextState;
        });
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unable to resume local audio engine.",
        }));
      }

      return;
    }

    const AudioContextClass = getAudioContextClass();

    if (!AudioContextClass) {
      setState((currentState) => ({
        ...currentState,
        status: "unsupported",
        errorMessage: "Web Audio is unavailable in this browser.",
      }));
      return;
    }

    try {
      const audioContext = new AudioContextClass();
      const masterGain = audioContext.createGain();
      const filterNode = audioContext.createBiquadFilter();
      const filterPatch = getClampedFilterEffectPatch(stateRef.current.filterEffectPatch);
      const autopanNode = audioContext.createStereoPanner();
      const autopanLfo = audioContext.createOscillator();
      const autopanDepthGain = audioContext.createGain();
      const autopanPatch = getClampedAutopanEffectPatch(stateRef.current.autopanEffectPatch);
      const echoInput = audioContext.createGain();
      const echoDryGain = audioContext.createGain();
      const echoWetGain = audioContext.createGain();
      const echoDelay = audioContext.createDelay(MAX_ECHO_DELAY_TIME_SECONDS);
      const echoFeedbackGain = audioContext.createGain();
      const echoOutput = audioContext.createGain();
      const echoPatch = getClampedEchoEffectPatch(stateRef.current.echoEffectPatch);
      const reverbInput = audioContext.createGain();
      const reverbDryGain = audioContext.createGain();
      const reverbWetGain = audioContext.createGain();
      const reverbConvolver = audioContext.createConvolver();
      const reverbOutput = audioContext.createGain();
      const reverbPatch = getClampedReverbEffectPatch(stateRef.current.reverbEffectPatch);

      masterGain.gain.value = ENGINE_START_MASTER_VOLUME;
      filterNode.type = "lowpass";
      filterNode.frequency.value = filterPatch.cutoffFrequency;
      filterNode.Q.value = filterPatch.resonance;
      autopanNode.pan.value = 0;
      autopanLfo.type = "sine";
      autopanLfo.frequency.value = autopanPatch.rateHz;
      autopanDepthGain.gain.value = autopanPatch.depth;
      echoDryGain.gain.value = 1 - echoPatch.wetMix;
      echoWetGain.gain.value = echoPatch.wetMix;
      echoDelay.delayTime.value = echoPatch.delayTimeSeconds;
      echoFeedbackGain.gain.value = echoPatch.feedback;
      reverbDryGain.gain.value = 1 - reverbPatch.wetMix;
      reverbWetGain.gain.value = reverbPatch.wetMix;
      reverbConvolver.buffer = createReverbImpulseBuffer(audioContext, reverbPatch.decaySeconds);
      autopanLfo.connect(autopanDepthGain);
      autopanDepthGain.connect(autopanNode.pan);
      echoInput.connect(echoDryGain);
      echoDryGain.connect(echoOutput);
      echoInput.connect(echoDelay);
      echoDelay.connect(echoWetGain);
      echoWetGain.connect(echoOutput);
      echoDelay.connect(echoFeedbackGain);
      echoFeedbackGain.connect(echoDelay);
      reverbInput.connect(reverbDryGain);
      reverbDryGain.connect(reverbOutput);
      reverbInput.connect(reverbConvolver);
      reverbConvolver.connect(reverbWetGain);
      reverbWetGain.connect(reverbOutput);
      filterNode.connect(autopanNode);
      autopanNode.connect(echoInput);
      echoOutput.connect(reverbInput);
      reverbOutput.connect(masterGain);
      masterGain.connect(audioContext.destination);
      audioContextRef.current = audioContext;
      masterGainRef.current = masterGain;
      filterNodeRef.current = filterNode;
      autopanNodeRef.current = autopanNode;
      autopanLfoRef.current = autopanLfo;
      autopanDepthGainRef.current = autopanDepthGain;
      echoInputRef.current = echoInput;
      echoDryGainRef.current = echoDryGain;
      echoWetGainRef.current = echoWetGain;
      echoDelayRef.current = echoDelay;
      echoFeedbackGainRef.current = echoFeedbackGain;
      echoOutputRef.current = echoOutput;
      reverbInputRef.current = reverbInput;
      reverbDryGainRef.current = reverbDryGain;
      reverbWetGainRef.current = reverbWetGain;
      reverbConvolverRef.current = reverbConvolver;
      reverbOutputRef.current = reverbOutput;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      autopanLfo.start();

      setState((currentState) => ({
        ...currentState,
        status: getStatusFromAudioContext(audioContext),
        isInitialized: true,
        isMuted: false,
        masterVolume: ENGINE_START_MASTER_VOLUME,
        errorMessage: null,
      }));
    } catch (error) {
      closeAudioContext();
      setState((currentState) => ({
        ...currentState,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unable to initialize local audio engine.",
      }));
    }
  }, [applyGain, closeAudioContext]);
  const setMuted = useCallback((isMuted: boolean) => {
    setState((currentState) => {
      const nextState = {
        ...currentState,
        isMuted,
      };

      applyGain(nextState);
      return nextState;
    });
  }, [applyGain]);
  const toggleMuted = useCallback(() => {
    setState((currentState) => {
      const nextState = {
        ...currentState,
        isMuted: !currentState.isMuted,
      };

      applyGain(nextState);
      return nextState;
    });
  }, [applyGain]);
  const setMasterVolume = useCallback((volume: number) => {
    setState((currentState) => {
      const nextState = {
        ...currentState,
        masterVolume: clampMasterVolume(volume),
      };

      applyGain(nextState);
      return nextState;
    });
  }, [applyGain]);
  const adjustFmSynthPatch = useCallback((patchDelta: Partial<LocalDawFmSynthPatch>) => {
    setState((currentState) => ({
      ...currentState,
      fmSynthPatch: getClampedFmSynthPatch({
        ...currentState.fmSynthPatch,
        ...patchDelta,
      }),
    }));
  }, []);
  const adjustBassMachinePatch = useCallback((patchDelta: Partial<LocalDawBassMachinePatch>) => {
    setState((currentState) => ({
      ...currentState,
      bassMachinePatch: getClampedBassMachinePatch({
        ...currentState.bassMachinePatch,
        ...patchDelta,
      }),
    }));
  }, []);
  const adjustFilterEffectPatch = useCallback((patchDelta: Partial<LocalDawFilterEffectPatch>) => {
    setState((currentState) => {
      const filterEffectPatch = getClampedFilterEffectPatch({
        ...currentState.filterEffectPatch,
        ...patchDelta,
      });

      applyFilterEffectPatch(filterEffectPatch);

      return {
        ...currentState,
        filterEffectPatch,
      };
    });
  }, [applyFilterEffectPatch]);
  const adjustAutopanEffectPatch = useCallback((patchDelta: Partial<LocalDawAutopanEffectPatch>) => {
    setState((currentState) => {
      const autopanEffectPatch = getClampedAutopanEffectPatch({
        ...currentState.autopanEffectPatch,
        ...patchDelta,
      });

      applyAutopanEffectPatch(autopanEffectPatch);

      return {
        ...currentState,
        autopanEffectPatch,
      };
    });
  }, [applyAutopanEffectPatch]);
  const adjustEchoEffectPatch = useCallback((patchDelta: Partial<LocalDawEchoEffectPatch>) => {
    setState((currentState) => {
      const echoEffectPatch = getClampedEchoEffectPatch({
        ...currentState.echoEffectPatch,
        ...patchDelta,
      });

      applyEchoEffectPatch(echoEffectPatch);

      return {
        ...currentState,
        echoEffectPatch,
      };
    });
  }, [applyEchoEffectPatch]);
  const adjustReverbEffectPatch = useCallback((patchDelta: Partial<LocalDawReverbEffectPatch>) => {
    setState((currentState) => {
      const reverbEffectPatch = getClampedReverbEffectPatch({
        ...currentState.reverbEffectPatch,
        ...patchDelta,
      });
      const shouldRegenerateImpulse = reverbEffectPatch.decaySeconds !== currentState.reverbEffectPatch.decaySeconds;

      applyReverbEffectPatch(reverbEffectPatch, shouldRegenerateImpulse);

      return {
        ...currentState,
        reverbEffectPatch,
      };
    });
  }, [applyReverbEffectPatch]);
  const playMetronomeTick = useCallback((isAccent = false) => {
    const audioContext = audioContextRef.current;
    const masterGain = masterGainRef.current;
    const currentState = stateRef.current;

    if (!audioContext || !masterGain || !isAudioEngineAudibleReady(audioContext, masterGain, currentState)) {
      return;
    }

    try {
      const oscillator = audioContext.createOscillator();
      const tickGain = audioContext.createGain();
      const now = audioContext.currentTime;
      const tickDuration = 0.045;

      oscillator.type = "square";
      oscillator.frequency.value = isAccent ? 1320 : 880;
      tickGain.gain.setValueAtTime(0.0001, now);
      tickGain.gain.exponentialRampToValueAtTime(isAccent ? 0.026 : 0.018, now + 0.006);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + tickDuration);
      oscillator.connect(tickGain);
      tickGain.connect(masterGain);
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          tickGain.disconnect();
        } catch {
          // A missed tick cleanup must not disturb the local room shell.
        }
      };
      oscillator.start(now);
      oscillator.stop(now + tickDuration + 0.01);
    } catch {
      // Metronome preview is best-effort and must stay non-blocking.
    }
  }, []);
  const playFmSynthNote = useCallback((note: LocalDawFmSynthNote) => {
    const audioContext = audioContextRef.current;
    const masterGain = masterGainRef.current;
    const currentState = stateRef.current;

    if (!audioContext || !masterGain || !isAudioEngineAudibleReady(audioContext, masterGain, currentState)) {
      return;
    }

    const gainScale = getClampedVoiceGainScale(note.gainScale);

    if (gainScale <= 0) {
      return;
    }

    const oldestCleanup = fmSynthVoiceCleanupsRef.current.values().next().value as (() => void) | undefined;

    if (fmSynthVoiceCleanupsRef.current.size >= MAX_ACTIVE_FM_VOICES && oldestCleanup) {
      oldestCleanup();
    }

    try {
      const patch = getClampedFmSynthPatch(note.fmSynthPatch ?? currentState.fmSynthPatch);
      const noteFrequencyRatio = (note.frequency || FM_SYNTH_C3_FREQUENCY) / FM_SYNTH_C3_FREQUENCY;
      const frequency = clamp(patch.carrierFrequency * noteFrequencyRatio, MIN_FM_FREQUENCY, MAX_FM_FREQUENCY);
      const envelope = getFmEnvelopeTimings(patch.envelopePreset, note.durationSeconds);
      const now = audioContext.currentTime;
      const carrier = audioContext.createOscillator();
      const modulator = audioContext.createOscillator();
      const modulationGain = audioContext.createGain();
      const voiceGain = audioContext.createGain();
      let didCleanup = false;

      carrier.type = "sine";
      carrier.frequency.setValueAtTime(frequency, now);
      modulator.type = "sine";
      modulator.frequency.setValueAtTime(frequency * patch.modulationRatio, now);
      modulationGain.gain.setValueAtTime(frequency * patch.modulationIndex, now);
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, patch.gain * gainScale), now + envelope.attackSeconds);
      voiceGain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, patch.gain * gainScale * envelope.sustainLevel),
        now + envelope.attackSeconds + envelope.decaySeconds,
      );
      voiceGain.gain.setValueAtTime(
        Math.max(0.0001, patch.gain * gainScale * envelope.sustainLevel),
        now + Math.max(envelope.attackSeconds + envelope.decaySeconds, envelope.durationSeconds - envelope.releaseSeconds),
      );
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + envelope.durationSeconds);
      modulator.connect(modulationGain);
      modulationGain.connect(carrier.frequency);
      carrier.connect(voiceGain);
      voiceGain.connect(getAppOwnedTrackOutputNode(masterGain));

      const cleanupVoice = () => {
        if (didCleanup) {
          return;
        }

        didCleanup = true;

        try {
          carrier.stop();
        } catch {
          // Voice may already be stopped by its scheduled envelope.
        }

        try {
          modulator.stop();
        } catch {
          // Voice may already be stopped by its scheduled envelope.
        }

        try {
          carrier.disconnect();
          modulator.disconnect();
          modulationGain.disconnect();
          voiceGain.disconnect();
        } catch {
          // Cleanup must stay safe during shell exit/unmount.
        }

        fmSynthVoiceCleanupsRef.current.delete(cleanupVoice);
        setActiveFmSynthVoiceCount();
      };

      fmSynthVoiceCleanupsRef.current.add(cleanupVoice);
      carrier.onended = cleanupVoice;
      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + envelope.durationSeconds + 0.02);
      modulator.stop(now + envelope.durationSeconds + 0.02);
      setState((nextState) => ({
        ...nextState,
        activeFmSynthVoiceCount: fmSynthVoiceCleanupsRef.current.size,
        lastFmSynthNoteLabel: note.label,
      }));
    } catch {
      // FM audition is best-effort and must not interrupt the local shell.
    }
  }, [getAppOwnedTrackOutputNode, setActiveFmSynthVoiceCount]);
  const playDrumVoice = useCallback((hit: LocalDawDrumHit, options?: LocalDawGeneratedSoundOptions) => {
    const audioContext = audioContextRef.current;
    const masterGain = masterGainRef.current;
    const currentState = stateRef.current;
    const shouldAllowSound = options?.allowSound ?? true;

    if (!shouldAllowSound || !audioContext || !masterGain || !isAudioEngineAudibleReady(audioContext, masterGain, currentState)) {
      setState((nextState) => ({
        ...nextState,
        lastDrumHitLabel: hit.label,
      }));
      return;
    }

    const gainScale = getClampedVoiceGainScale(hit.gainScale);

    if (gainScale <= 0) {
      return;
    }

    const oldestCleanup = drumVoiceCleanupsRef.current.values().next().value as (() => void) | undefined;

    if (drumVoiceCleanupsRef.current.size >= MAX_ACTIVE_DRUM_VOICES && oldestCleanup) {
      oldestCleanup();
    }

    try {
      const now = audioContext.currentTime;
      let cleanupVoice: () => void;

      if (hit.kind === "kick") {
        const oscillator = audioContext.createOscillator();
        const voiceGain = audioContext.createGain();
        let didCleanup = false;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(132, now);
        oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.16);
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(0.1 * gainScale, now + 0.006);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        oscillator.connect(voiceGain);
        voiceGain.connect(getAppOwnedTrackOutputNode(masterGain));

        cleanupVoice = () => {
          if (didCleanup) {
            return;
          }

          didCleanup = true;

          try {
            oscillator.stop();
          } catch {
            // Voice may already be stopped by its scheduled envelope.
          }

          try {
            oscillator.disconnect();
            voiceGain.disconnect();
          } catch {
            // Cleanup must stay safe during shell exit/unmount.
          }

          drumVoiceCleanupsRef.current.delete(cleanupVoice);
          setActiveDrumVoiceCount();
        };
        drumVoiceCleanupsRef.current.add(cleanupVoice);
        oscillator.onended = cleanupVoice;
        oscillator.start(now);
        oscillator.stop(now + 0.22);
      } else if (hit.kind === "snare") {
        const noiseSource = audioContext.createBufferSource();
        const noiseFilter = audioContext.createBiquadFilter();
        const noiseGain = audioContext.createGain();
        const toneOscillator = audioContext.createOscillator();
        const toneGain = audioContext.createGain();
        let didCleanup = false;

        noiseSource.buffer = createPercussionNoiseBuffer(audioContext, 0.14);
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(1800, now);
        noiseFilter.Q.setValueAtTime(0.85, now);
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.068 * gainScale, now + 0.004);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
        toneOscillator.type = "triangle";
        toneOscillator.frequency.setValueAtTime(185, now);
        toneGain.gain.setValueAtTime(0.0001, now);
        toneGain.gain.exponentialRampToValueAtTime(0.024 * gainScale, now + 0.006);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(getAppOwnedTrackOutputNode(masterGain));
        toneOscillator.connect(toneGain);
        toneGain.connect(getAppOwnedTrackOutputNode(masterGain));

        cleanupVoice = () => {
          if (didCleanup) {
            return;
          }

          didCleanup = true;

          try {
            noiseSource.stop();
          } catch {
            // Voice may already be stopped by its scheduled envelope.
          }

          try {
            toneOscillator.stop();
          } catch {
            // Voice may already be stopped by its scheduled envelope.
          }

          try {
            noiseSource.disconnect();
            noiseFilter.disconnect();
            noiseGain.disconnect();
            toneOscillator.disconnect();
            toneGain.disconnect();
          } catch {
            // Cleanup must stay safe during shell exit/unmount.
          }

          drumVoiceCleanupsRef.current.delete(cleanupVoice);
          setActiveDrumVoiceCount();
        };
        drumVoiceCleanupsRef.current.add(cleanupVoice);
        noiseSource.onended = cleanupVoice;
        noiseSource.start(now);
        toneOscillator.start(now);
        noiseSource.stop(now + 0.14);
        toneOscillator.stop(now + 0.12);
      } else {
        const noiseSource = audioContext.createBufferSource();
        const noiseFilter = audioContext.createBiquadFilter();
        const voiceGain = audioContext.createGain();
        let didCleanup = false;

        noiseSource.buffer = createPercussionNoiseBuffer(audioContext, 0.07);
        noiseFilter.type = "highpass";
        noiseFilter.frequency.setValueAtTime(6500, now);
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(0.044 * gainScale, now + 0.003);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(voiceGain);
        voiceGain.connect(getAppOwnedTrackOutputNode(masterGain));

        cleanupVoice = () => {
          if (didCleanup) {
            return;
          }

          didCleanup = true;

          try {
            noiseSource.stop();
          } catch {
            // Voice may already be stopped by its scheduled envelope.
          }

          try {
            noiseSource.disconnect();
            noiseFilter.disconnect();
            voiceGain.disconnect();
          } catch {
            // Cleanup must stay safe during shell exit/unmount.
          }

          drumVoiceCleanupsRef.current.delete(cleanupVoice);
          setActiveDrumVoiceCount();
        };
        drumVoiceCleanupsRef.current.add(cleanupVoice);
        noiseSource.onended = cleanupVoice;
        noiseSource.start(now);
        noiseSource.stop(now + 0.07);
      }

      setState((nextState) => ({
        ...nextState,
        activeDrumVoiceCount: drumVoiceCleanupsRef.current.size,
        lastDrumHitLabel: hit.label,
      }));
    } catch {
      // Drum audition is best-effort and must not interrupt the local shell.
    }
  }, [getAppOwnedTrackOutputNode, setActiveDrumVoiceCount]);
  const playBassNote = useCallback((note: LocalDawBassNote) => {
    const audioContext = audioContextRef.current;
    const masterGain = masterGainRef.current;
    const currentState = stateRef.current;

    if (!audioContext || !masterGain || !isAudioEngineAudibleReady(audioContext, masterGain, currentState)) {
      return;
    }

    const gainScale = getClampedVoiceGainScale(note.gainScale);

    if (gainScale <= 0) {
      return;
    }

    const oldestCleanup = bassVoiceCleanupsRef.current.values().next().value as (() => void) | undefined;

    if (bassVoiceCleanupsRef.current.size >= MAX_ACTIVE_BASS_VOICES && oldestCleanup) {
      oldestCleanup();
    }

    try {
      const patch = getClampedBassMachinePatch(note.bassMachinePatch ?? currentState.bassMachinePatch);
      const frequency = clamp(note.frequency, MIN_BASS_FREQUENCY, MAX_BASS_FREQUENCY);
      const durationSeconds = clamp(note.durationSeconds ?? patch.decaySeconds + 0.16, MIN_BASS_DURATION_SECONDS, MAX_BASS_DURATION_SECONDS);
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const filter = audioContext.createBiquadFilter();
      const voiceGain = audioContext.createGain();
      const decayEndTime = now + patch.decaySeconds;
      let didCleanup = false;

      oscillator.type = patch.waveform;
      oscillator.frequency.setValueAtTime(frequency, now);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(clamp(patch.cutoffFrequency + patch.envelopeAmount, MIN_BASS_CUTOFF_FREQUENCY, MAX_BASS_CUTOFF_FREQUENCY), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(1, patch.cutoffFrequency), decayEndTime);
      filter.Q.setValueAtTime(patch.resonance, now);
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, patch.gain * gainScale), now + 0.008);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
      oscillator.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(getAppOwnedTrackOutputNode(masterGain));

      const cleanupVoice = () => {
        if (didCleanup) {
          return;
        }

        didCleanup = true;

        try {
          oscillator.stop();
        } catch {
          // Voice may already be stopped by its scheduled envelope.
        }

        try {
          oscillator.disconnect();
          filter.disconnect();
          voiceGain.disconnect();
        } catch {
          // Cleanup must stay safe during shell exit/unmount.
        }

        bassVoiceCleanupsRef.current.delete(cleanupVoice);
        setActiveBassVoiceCount();
      };

      bassVoiceCleanupsRef.current.add(cleanupVoice);
      oscillator.onended = cleanupVoice;
      oscillator.start(now);
      oscillator.stop(now + durationSeconds + 0.02);
      setState((nextState) => ({
        ...nextState,
        activeBassVoiceCount: bassVoiceCleanupsRef.current.size,
        lastBassNoteLabel: note.label,
      }));
    } catch {
      // Bass audition is best-effort and must not interrupt the local shell.
    }
  }, [getAppOwnedTrackOutputNode, setActiveBassVoiceCount]);
  const playPianoLiveNote = useCallback((note: LocalDawPianoLiveNote, target: LocalDawPianoLiveTarget = "fm-synth", options?: LocalDawGeneratedSoundOptions) => {
    const audioContext = audioContextRef.current;
    const masterGain = masterGainRef.current;
    const currentState = stateRef.current;
    const resolvedTarget: LocalDawPianoLiveTarget = target === "bass" ? "bass" : "fm-synth";
    const shouldAllowSound = options?.allowSound ?? true;

    if (!shouldAllowSound || !audioContext || !masterGain || !isAudioEngineAudibleReady(audioContext, masterGain, currentState)) {
      setState((nextState) => ({
        ...nextState,
        lastPianoLiveNoteLabel: note.label,
        lastPianoLiveTarget: resolvedTarget,
      }));
      return;
    }

    if (resolvedTarget === "bass") {
      playBassNote({
        label: note.label,
        frequency: clamp(note.frequency / 2, MIN_BASS_FREQUENCY, MAX_BASS_FREQUENCY),
        durationSeconds: note.durationSeconds ?? 0.34,
        gainScale: note.gainScale,
        bassMachinePatch: note.bassMachinePatch,
      });
    } else {
      playFmSynthNote({
        label: note.label,
        frequency: note.frequency,
        durationSeconds: note.durationSeconds ?? 0.38,
        gainScale: note.gainScale,
        fmSynthPatch: note.fmSynthPatch,
      });
    }

    setState((nextState) => ({
      ...nextState,
      lastPianoLiveNoteLabel: note.label,
      lastPianoLiveTarget: resolvedTarget,
    }));
  }, [playBassNote, playFmSynthNote]);
  const playBassPatternAudition = useCallback((gainScaleInput = 1, bassMachinePatch?: LocalDawBassMachinePatch) => {
    const audioContext = audioContextRef.current;
    const masterGain = masterGainRef.current;
    const currentState = stateRef.current;

    if (!audioContext || !masterGain || !isAudioEngineAudibleReady(audioContext, masterGain, currentState)) {
      return;
    }

    const gainScale = getClampedVoiceGainScale(gainScaleInput);

    if (gainScale <= 0) {
      return;
    }

    bassPatternTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    bassPatternTimeoutsRef.current = [];
    setState((nextState) => ({
      ...nextState,
      isBassPatternAuditioning: true,
    }));

    const riffNotes: LocalDawBassNote[] = [
      { label: "E1", frequency: 41.2, durationSeconds: 0.22, gainScale, bassMachinePatch },
      { label: "G1", frequency: 49, durationSeconds: 0.22, gainScale, bassMachinePatch },
      { label: "A1", frequency: 55, durationSeconds: 0.22, gainScale, bassMachinePatch },
      { label: "B1", frequency: 61.74, durationSeconds: 0.3, gainScale, bassMachinePatch },
    ];

    riffNotes.forEach((note, index) => {
      const timeoutId = window.setTimeout(() => {
        bassPatternTimeoutsRef.current = bassPatternTimeoutsRef.current.filter((currentTimeoutId) => currentTimeoutId !== timeoutId);
        playBassNote(note);
      }, index * 170);

      bassPatternTimeoutsRef.current.push(timeoutId);
    });

    const resetTimeoutId = window.setTimeout(() => {
      bassPatternTimeoutsRef.current = bassPatternTimeoutsRef.current.filter((timeoutId) => timeoutId !== resetTimeoutId);
      setState((nextState) => ({
        ...nextState,
        isBassPatternAuditioning: false,
      }));
    }, riffNotes.length * 170 + 280);

    bassPatternTimeoutsRef.current.push(resetTimeoutId);
  }, [playBassNote]);
  const cleanup = useCallback(() => {
    closeAudioContext();
    setState({
      ...INITIAL_AUDIO_ENGINE_STATE,
      status: "closed",
    });
  }, [closeAudioContext]);
  const actions = useMemo<LocalDawAudioEngineActions>(() => ({
    cleanup,
    adjustAutopanEffectPatch,
    adjustBassMachinePatch,
    adjustEchoEffectPatch,
    adjustFilterEffectPatch,
    adjustFmSynthPatch,
    adjustReverbEffectPatch,
    initialize,
    playBassNote,
    playBassPatternAudition,
    playDrumVoice,
    playFmSynthNote,
    playMetronomeTick,
    playPianoLiveNote,
    setMasterVolume,
    setMuted,
    stopBassVoices,
    stopDrumVoices,
    stopFmSynthVoices,
    toggleMuted,
  }), [
    adjustAutopanEffectPatch,
    adjustBassMachinePatch,
    adjustEchoEffectPatch,
    adjustFilterEffectPatch,
    adjustFmSynthPatch,
    adjustReverbEffectPatch,
    cleanup,
    initialize,
    playBassNote,
    playBassPatternAudition,
    playDrumVoice,
    playFmSynthNote,
    playMetronomeTick,
    playPianoLiveNote,
    setMasterVolume,
    setMuted,
    stopBassVoices,
    stopDrumVoices,
    stopFmSynthVoices,
    toggleMuted,
  ]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => () => {
    closeAudioContext();
  }, [closeAudioContext]);

  return { state, actions };
}
