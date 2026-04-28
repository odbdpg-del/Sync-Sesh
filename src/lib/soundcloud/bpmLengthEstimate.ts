export interface SoundCloudBpmLengthReference {
  bpm: number | null | undefined;
  source: "metadata" | "waveform" | "manual" | "other";
  weight?: number;
}

export interface SoundCloudBpmLengthEstimateOptions {
  minBpm?: number;
  maxBpm?: number;
  metadataBpm?: number | null;
  waveformBpm?: number | null;
  references?: readonly SoundCloudBpmLengthReference[];
}

export interface SoundCloudBpmLengthCandidate {
  bpm: number;
  beatCount: number;
  barCount: number;
  confidence: number;
  score: number;
  source: "LENGTH";
  debug: {
    rangeScore: number;
    phraseScore: number;
    referenceScore: number;
    ambiguityPenalty: number;
  };
}

export interface SoundCloudBpmLengthEstimate {
  bpm: number | null;
  confidence: number;
  source: "LENGTH" | "none";
  beatCount: number | null;
  barCount: number | null;
  candidates: SoundCloudBpmLengthCandidate[];
  debug: {
    durationMs: number;
    minBpm: number;
    maxBpm: number;
    candidateCount: number;
  };
}

interface NormalizedSoundCloudBpmLengthReference {
  bpm: number;
  source: SoundCloudBpmLengthReference["source"];
  weight: number;
}

const DEFAULT_MIN_BPM = 70;
const DEFAULT_MAX_BPM = 180;
const MIN_DURATION_MS = 30_000;
const MAX_REFERENCE_DISTANCE_BPM = 8;

const FOUR_FOUR_BEAT_COUNTS = [
  64,
  128,
  192,
  256,
  384,
  512,
  768,
  1024,
  1536,
  2048,
] as const;

const PHRASE_WEIGHTS = new Map<number, number>([
  [64, 0.38],
  [128, 0.5],
  [192, 0.58],
  [256, 0.72],
  [384, 0.7],
  [512, 0.95],
  [768, 0.86],
  [1024, 0.9],
  [1536, 0.68],
  [2048, 0.56],
]);

export function estimateBpmFromLength(
  durationMs: number,
  options: SoundCloudBpmLengthEstimateOptions = {},
): SoundCloudBpmLengthEstimate {
  const minBpm = options.minBpm ?? DEFAULT_MIN_BPM;
  const maxBpm = options.maxBpm ?? DEFAULT_MAX_BPM;

  if (!Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS || minBpm <= 0 || maxBpm <= minBpm) {
    return createEmptyEstimate(durationMs, minBpm, maxBpm);
  }

  const references = normalizeReferences(options);
  const rawCandidates = FOUR_FOUR_BEAT_COUNTS
    .map((beatCount) => createCandidate(durationMs, beatCount, minBpm, maxBpm, references))
    .filter((candidate): candidate is SoundCloudBpmLengthCandidate => candidate !== null);

  if (rawCandidates.length === 0) {
    return createEmptyEstimate(durationMs, minBpm, maxBpm);
  }

  const candidates = applyAmbiguityPenalty(rawCandidates).sort((left, right) => right.score - left.score);
  const best = candidates[0];

  return {
    bpm: best.bpm,
    confidence: best.confidence,
    source: "LENGTH",
    beatCount: best.beatCount,
    barCount: best.barCount,
    candidates,
    debug: {
      durationMs,
      minBpm,
      maxBpm,
      candidateCount: candidates.length,
    },
  };
}

function createCandidate(
  durationMs: number,
  beatCount: number,
  minBpm: number,
  maxBpm: number,
  references: readonly NormalizedSoundCloudBpmLengthReference[],
): SoundCloudBpmLengthCandidate | null {
  const bpm = (60_000 * beatCount) / durationMs;

  if (!Number.isFinite(bpm) || bpm < minBpm || bpm > maxBpm) {
    return null;
  }

  const phraseScore = PHRASE_WEIGHTS.get(beatCount) ?? 0.45;
  const rangeScore = scoreDjRangePreference(bpm, minBpm, maxBpm);
  const referenceScore = scoreReferenceFit(bpm, references);
  const hasReference = references.length > 0;
  const baseScore = hasReference
    ? phraseScore * 0.32 + rangeScore * 0.22 + referenceScore * 0.46
    : phraseScore * 0.62 + rangeScore * 0.38;

  return {
    bpm: roundBpm(bpm),
    beatCount,
    barCount: beatCount / 4,
    confidence: clamp01(hasReference ? baseScore * 0.92 : baseScore * 0.68),
    score: clamp01(baseScore),
    source: "LENGTH",
    debug: {
      rangeScore: clamp01(rangeScore),
      phraseScore: clamp01(phraseScore),
      referenceScore: clamp01(referenceScore),
      ambiguityPenalty: 0,
    },
  };
}

function applyAmbiguityPenalty(
  candidates: readonly SoundCloudBpmLengthCandidate[],
): SoundCloudBpmLengthCandidate[] {
  return candidates.map((candidate) => {
    const similarCandidateCount = candidates.filter(
      (other) => other !== candidate && Math.abs(other.score - candidate.score) <= 0.08,
    ).length;
    const ambiguityPenalty = Math.min(0.18, similarCandidateCount * 0.045);
    const score = clamp01(candidate.score - ambiguityPenalty);

    return {
      ...candidate,
      confidence: clamp01(candidate.confidence - ambiguityPenalty * 0.75),
      score,
      debug: {
        ...candidate.debug,
        ambiguityPenalty,
      },
    };
  });
}

function normalizeReferences(
  options: SoundCloudBpmLengthEstimateOptions,
): NormalizedSoundCloudBpmLengthReference[] {
  const references: SoundCloudBpmLengthReference[] = [
    { bpm: options.metadataBpm, source: "metadata", weight: 1 },
    { bpm: options.waveformBpm, source: "waveform", weight: 0.9 },
    ...(options.references ?? []),
  ];

  return references
    .filter((reference) => Number.isFinite(reference.bpm) && (reference.bpm ?? 0) > 0)
    .map((reference) => ({
      bpm: reference.bpm as number,
      source: reference.source,
      weight: Math.max(0.05, reference.weight ?? 1),
    }));
}

function scoreReferenceFit(
  bpm: number,
  references: readonly NormalizedSoundCloudBpmLengthReference[],
): number {
  if (references.length === 0) {
    return 0;
  }

  let totalScore = 0;
  let totalWeight = 0;

  for (const reference of references) {
    const normalizedReference = normalizeReferenceBpm(reference.bpm, bpm);
    const distance = Math.abs(bpm - normalizedReference);
    const score = clamp01(1 - distance / MAX_REFERENCE_DISTANCE_BPM);

    totalScore += score * reference.weight;
    totalWeight += reference.weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function normalizeReferenceBpm(referenceBpm: number, targetBpm: number): number {
  const variants = [referenceBpm, referenceBpm / 2, referenceBpm * 2];
  return variants.reduce((best, variant) =>
    Math.abs(variant - targetBpm) < Math.abs(best - targetBpm) ? variant : best,
  );
}

function scoreDjRangePreference(bpm: number, minBpm: number, maxBpm: number): number {
  const center = clamp(128, minBpm, maxBpm);
  const halfRange = Math.max(1, Math.max(center - minBpm, maxBpm - center));

  return clamp01(1 - Math.abs(bpm - center) / halfRange);
}

function createEmptyEstimate(durationMs: number, minBpm: number, maxBpm: number): SoundCloudBpmLengthEstimate {
  return {
    bpm: null,
    confidence: 0,
    source: "none",
    beatCount: null,
    barCount: null,
    candidates: [],
    debug: {
      durationMs,
      minBpm,
      maxBpm,
      candidateCount: 0,
    },
  };
}

function roundBpm(bpm: number): number {
  return Math.round(bpm * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
