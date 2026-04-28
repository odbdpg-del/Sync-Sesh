export type SoundCloudBpmSource =
  | "soundcloud"
  | "override"
  | "waveform"
  | "estimated"
  | "none";

export interface SoundCloudBpmAnalysis {
  bpm: number | null;
  confidence: number;
  source: SoundCloudBpmSource;
  debug?: {
    candidateCount: number;
    peakCount: number;
    topCandidates: Array<{ bpm: number; score: number }>;
  };
}

export interface SoundCloudBpmState {
  bpm: number | null;
  source: SoundCloudBpmSource;
  confidence: number;
  label: string;
}

interface EnvelopePeak {
  index: number;
  timeMs: number;
  value: number;
}

interface BpmCandidate {
  bpm: number;
  score: number;
}

const DEFAULT_MIN_BPM = 70;
const DEFAULT_MAX_BPM = 180;
const DEFAULT_BPM_STEP = 0.5;
const DEFAULT_ACCEPTED_CONFIDENCE = 0.62;
const MIN_SAMPLE_COUNT = 24;
const MIN_DURATION_MS = 10_000;
const MAX_DEBUG_CANDIDATES = 5;

export function estimateBpmFromWaveform(
  samples: readonly number[],
  durationMs: number,
): SoundCloudBpmAnalysis {
  if (samples.length < MIN_SAMPLE_COUNT || !Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS) {
    return createEmptyAnalysis();
  }

  const envelope = normalizeAndSmooth(samples, durationMs);
  if (envelope.length === 0 || getSignalRange(envelope) < 0.08) {
    return createEmptyAnalysis();
  }

  const peaks = detectEnvelopePeaks(envelope, durationMs);
  if (peaks.length < 6) {
    return createEmptyAnalysis(peaks.length);
  }

  const candidates = scoreBpmCandidates(envelope, peaks, durationMs);
  const topCandidates = candidates
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_DEBUG_CANDIDATES);

  const bestCandidate = topCandidates[0];
  const runnerUpScore = topCandidates[1]?.score ?? 0;
  const normalizedBest = normalizeBestCandidate(bestCandidate, topCandidates);
  const confidence = clamp01(
    normalizedBest.score * 1.22 + Math.max(0, normalizedBest.score - runnerUpScore) * 0.5,
  );

  return {
    bpm: confidence >= DEFAULT_ACCEPTED_CONFIDENCE ? roundBpm(normalizedBest.bpm) : null,
    confidence,
    source: confidence >= DEFAULT_ACCEPTED_CONFIDENCE ? "waveform" : "none",
    debug: {
      candidateCount: candidates.length,
      peakCount: peaks.length,
      topCandidates: topCandidates.map((candidate) => ({
        bpm: roundBpm(candidate.bpm),
        score: clamp01(candidate.score),
      })),
    },
  };
}

function createEmptyAnalysis(peakCount = 0): SoundCloudBpmAnalysis {
  return {
    bpm: null,
    confidence: 0,
    source: "none",
    debug: {
      candidateCount: 0,
      peakCount,
      topCandidates: [],
    },
  };
}

function normalizeAndSmooth(samples: readonly number[], durationMs: number): number[] {
  const finiteSamples = samples.map((sample) => (Number.isFinite(sample) ? sample : 0));
  const min = Math.min(...finiteSamples);
  const max = Math.max(...finiteSamples);
  const range = max - min;

  if (range <= 0) {
    return [];
  }

  const normalized = finiteSamples.map((sample) => clamp01((sample - min) / range));
  const samplesPerMs = samples.length / durationMs;
  const windowSize = Math.max(3, Math.round(samplesPerMs * 85));

  return smoothSamples(smoothSamples(normalized, windowSize), Math.max(3, Math.round(windowSize * 0.65)));
}

function smoothSamples(samples: readonly number[], windowSize: number): number[] {
  const radius = Math.max(1, Math.floor(windowSize / 2));
  const smoothed: number[] = [];
  let total = 0;
  let count = 0;

  for (let index = -radius; index < samples.length + radius; index += 1) {
    const addIndex = index + radius;
    const removeIndex = index - radius - 1;

    if (addIndex >= 0 && addIndex < samples.length) {
      total += samples[addIndex];
      count += 1;
    }

    if (removeIndex >= 0 && removeIndex < samples.length) {
      total -= samples[removeIndex];
      count -= 1;
    }

    if (index >= 0 && index < samples.length) {
      smoothed[index] = count > 0 ? total / count : 0;
    }
  }

  return smoothed;
}

function getSignalRange(samples: readonly number[]): number {
  return Math.max(...samples) - Math.min(...samples);
}

function detectEnvelopePeaks(envelope: readonly number[], durationMs: number): EnvelopePeak[] {
  const samplesPerMs = envelope.length / durationMs;
  const localRadius = Math.max(4, Math.round(samplesPerMs * 850));
  const minimumGap = Math.max(2, Math.round(samplesPerMs * 185));
  const peaks: EnvelopePeak[] = [];
  let lastPeakIndex = -minimumGap;

  for (let index = 1; index < envelope.length - 1; index += 1) {
    const value = envelope[index];
    if (value <= envelope[index - 1] || value < envelope[index + 1]) {
      continue;
    }

    const start = Math.max(0, index - localRadius);
    const end = Math.min(envelope.length - 1, index + localRadius);
    const localMean = averageRange(envelope, start, end);
    const localThreshold = Math.max(0.18, localMean + 0.1);

    if (value < localThreshold) {
      continue;
    }

    if (index - lastPeakIndex < minimumGap) {
      const previous = peaks[peaks.length - 1];
      if (previous && value > previous.value) {
        previous.index = index;
        previous.timeMs = (index / Math.max(1, envelope.length - 1)) * durationMs;
        previous.value = value;
        lastPeakIndex = index;
      }
      continue;
    }

    peaks.push({
      index,
      timeMs: (index / Math.max(1, envelope.length - 1)) * durationMs,
      value,
    });
    lastPeakIndex = index;
  }

  return peaks;
}

function averageRange(samples: readonly number[], start: number, end: number): number {
  let total = 0;
  let count = 0;

  for (let index = start; index <= end; index += 1) {
    total += samples[index];
    count += 1;
  }

  return count > 0 ? total / count : 0;
}

function scoreBpmCandidates(
  envelope: readonly number[],
  peaks: readonly EnvelopePeak[],
  durationMs: number,
): BpmCandidate[] {
  const candidates: BpmCandidate[] = [];

  for (let bpm = DEFAULT_MIN_BPM; bpm <= DEFAULT_MAX_BPM; bpm += DEFAULT_BPM_STEP) {
    const beatMs = 60_000 / bpm;
    const phaseScore = scoreBeatGrid(peaks, beatMs);
    const intervalScore = scorePeakIntervals(peaks, beatMs);
    const lengthScore = scoreDurationGrid(durationMs, beatMs);
    const rangeScore = scoreDjRangePreference(bpm);
    const densityScore = scoreBeatDensity(envelope, durationMs, beatMs);
    const score =
      phaseScore * 0.44 +
      intervalScore * 0.3 +
      lengthScore * 0.08 +
      rangeScore * 0.05 +
      densityScore * 0.13;

    candidates.push({ bpm, score: clamp01(score) });
  }

  return candidates;
}

function scoreBeatGrid(peaks: readonly EnvelopePeak[], beatMs: number): number {
  const phaseBinCount = 32;
  const phaseBins = Array.from({ length: phaseBinCount }, () => 0);
  let totalPeakWeight = 0;

  for (const peak of peaks) {
    const phase = positiveModulo(peak.timeMs, beatMs);
    const bin = Math.round((phase / beatMs) * phaseBinCount) % phaseBinCount;
    const weight = 0.3 + peak.value;
    phaseBins[bin] += weight;
    totalPeakWeight += weight;
  }

  if (totalPeakWeight <= 0) {
    return 0;
  }

  const bestBin = phaseBins.reduce(
    (best, value, index) => (value > phaseBins[best] ? index : best),
    0,
  );
  const bestPhase = (bestBin / phaseBinCount) * beatMs;
  const toleranceMs = Math.max(35, beatMs * 0.14);
  let alignedWeight = 0;

  for (const peak of peaks) {
    const phaseDistance = getCircularDistance(positiveModulo(peak.timeMs - bestPhase, beatMs), beatMs);
    const proximity = clamp01(1 - phaseDistance / toleranceMs);
    alignedWeight += proximity * (0.3 + peak.value);
  }

  return clamp01(alignedWeight / totalPeakWeight);
}

function scorePeakIntervals(peaks: readonly EnvelopePeak[], beatMs: number): number {
  let totalScore = 0;
  let intervalCount = 0;

  for (let leftIndex = 0; leftIndex < peaks.length; leftIndex += 1) {
    const leftPeak = peaks[leftIndex];
    const maxRightIndex = Math.min(peaks.length - 1, leftIndex + 8);

    for (let rightIndex = leftIndex + 1; rightIndex <= maxRightIndex; rightIndex += 1) {
      const interval = peaks[rightIndex].timeMs - leftPeak.timeMs;
      if (interval < beatMs * 0.45 || interval > beatMs * 8.25) {
        continue;
      }

      const nearestBeatMultiple = Math.max(1, Math.round(interval / beatMs));
      const expectedInterval = nearestBeatMultiple * beatMs;
      const errorRatio = Math.abs(interval - expectedInterval) / beatMs;
      const weight = (leftPeak.value + peaks[rightIndex].value) * (1 / nearestBeatMultiple);
      totalScore += clamp01(1 - errorRatio * 3.2) * weight;
      intervalCount += weight;
    }
  }

  return intervalCount > 0 ? clamp01(totalScore / intervalCount) : 0;
}

function scoreDurationGrid(durationMs: number, beatMs: number): number {
  const totalBeats = durationMs / beatMs;
  const groupingScores = [4, 8, 16, 32].map((groupSize) => {
    const nearestGroup = Math.round(totalBeats / groupSize) * groupSize;
    const distance = Math.abs(totalBeats - nearestGroup);
    return clamp01(1 - distance / (groupSize * 0.5));
  });

  return Math.max(...groupingScores);
}

function scoreDjRangePreference(bpm: number): number {
  const distanceFromCenter = Math.abs(bpm - 128);
  return clamp01(1 - distanceFromCenter / 58);
}

function scoreBeatDensity(envelope: readonly number[], durationMs: number, beatMs: number): number {
  const beatCount = Math.max(1, Math.floor(durationMs / beatMs));
  const samplesPerMs = envelope.length / durationMs;
  const searchRadius = Math.max(1, Math.round(samplesPerMs * beatMs * 0.12));
  let bestPhaseScore = 0;

  for (let phaseStep = 0; phaseStep < 16; phaseStep += 1) {
    const phaseMs = (phaseStep / 16) * beatMs;
    let total = 0;

    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
      const centerIndex = Math.round((phaseMs + beatIndex * beatMs) * samplesPerMs);
      total += getWindowMax(envelope, centerIndex, searchRadius);
    }

    bestPhaseScore = Math.max(bestPhaseScore, total / beatCount);
  }

  return clamp01(bestPhaseScore);
}

function getWindowMax(samples: readonly number[], centerIndex: number, radius: number): number {
  const start = Math.max(0, centerIndex - radius);
  const end = Math.min(samples.length - 1, centerIndex + radius);
  let max = 0;

  for (let index = start; index <= end; index += 1) {
    max = Math.max(max, samples[index]);
  }

  return max;
}

function normalizeBestCandidate(best: BpmCandidate, topCandidates: readonly BpmCandidate[]): BpmCandidate {
  let normalized = best;

  for (const candidate of topCandidates) {
    if (candidate.score < best.score * 0.92) {
      continue;
    }

    const candidateIsNearDjCenter = Math.abs(candidate.bpm - 128) < Math.abs(normalized.bpm - 128);
    const candidateIsInCoreRange = candidate.bpm >= 90 && candidate.bpm <= 150;

    if (candidateIsInCoreRange && candidateIsNearDjCenter) {
      normalized = candidate;
    }
  }

  return normalized;
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

function getCircularDistance(phase: number, beatMs: number): number {
  return Math.min(phase, beatMs - phase);
}

function roundBpm(bpm: number): number {
  return Math.round(bpm * 10) / 10;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
