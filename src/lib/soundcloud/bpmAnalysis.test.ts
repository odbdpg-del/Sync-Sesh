import { estimateBpmFromWaveform } from "./bpmAnalysis";

interface PulseFixtureOptions {
  bpm: number;
  durationMs?: number;
  sampleCount?: number;
  amplitude?: number;
  noise?: number;
  skipEvery?: number;
  introSilenceMs?: number;
}

interface TestCase {
  name: string;
  run: () => void;
}

const tests: TestCase[] = [
  {
    name: "120 BPM four-on-floor estimates near 120",
    run: () => {
      const { samples, durationMs } = createPulseFixture({ bpm: 120 });
      const result = estimateBpmFromWaveform(samples, durationMs);

      assertBpmNear(result.bpm, 120, 1.2);
      assert(result.confidence >= 0.62, `expected confident 120 BPM result, got ${result.confidence}`);
      assert(result.source === "waveform", `expected waveform source, got ${result.source}`);
    },
  },
  {
    name: "128 BPM four-on-floor estimates near 128",
    run: () => {
      const { samples, durationMs } = createPulseFixture({ bpm: 128 });
      const result = estimateBpmFromWaveform(samples, durationMs);

      assertBpmNear(result.bpm, 128, 1.2);
      assert(result.confidence >= 0.62, `expected confident 128 BPM result, got ${result.confidence}`);
    },
  },
  {
    name: "140 BPM with missing kicks estimates near 140",
    run: () => {
      const { samples, durationMs } = createPulseFixture({ bpm: 140, skipEvery: 8, noise: 0.025 });
      const result = estimateBpmFromWaveform(samples, durationMs);

      assertBpmNear(result.bpm, 140, 1.8);
    },
  },
  {
    name: "64 BPM half-time trap stays near its target-range double",
    run: () => {
      const { samples, durationMs } = createPulseFixture({ bpm: 64, durationMs: 96_000, noise: 0.02 });
      const result = estimateBpmFromWaveform(samples, durationMs);

      assertBpmNear(result.bpm, 128, 1.8);
    },
  },
  {
    name: "double-time peaks normalize into the target range",
    run: () => {
      const { samples, durationMs } = createPulseFixture({ bpm: 256, durationMs: 96_000, noise: 0.015 });
      const result = estimateBpmFromWaveform(samples, durationMs);

      assertBpmNear(result.bpm, 128, 1.8);
    },
  },
  {
    name: "silence returns no BPM",
    run: () => {
      const result = estimateBpmFromWaveform(Array.from({ length: 2048 }, () => 0), 90_000);

      assert(result.bpm === null, `expected silence BPM null, got ${result.bpm}`);
      assert(result.confidence === 0, `expected silence confidence 0, got ${result.confidence}`);
      assert(result.source === "none", `expected silence source none, got ${result.source}`);
    },
  },
  {
    name: "deterministic random noise returns no confident BPM",
    run: () => {
      const random = createSeededRandom(19);
      const samples = Array.from({ length: 4096 }, () => random());
      const result = estimateBpmFromWaveform(samples, 120_000);

      assert(result.bpm === null || result.confidence < 0.62, `expected low-confidence noise, got ${result.bpm}`);
    },
  },
  {
    name: "intro silence then beat still estimates the pulse",
    run: () => {
      const { samples, durationMs } = createPulseFixture({
        bpm: 128,
        durationMs: 120_000,
        introSilenceMs: 18_000,
        noise: 0.015,
      });
      const result = estimateBpmFromWaveform(samples, durationMs);

      assertBpmNear(result.bpm, 128, 1.8);
    },
  },
];

runTests(tests);

function createPulseFixture(options: PulseFixtureOptions): { samples: number[]; durationMs: number } {
  const durationMs = options.durationMs ?? 90_000;
  const sampleCount = options.sampleCount ?? 4096;
  const samples = Array.from({ length: sampleCount }, () => 0);
  const beatMs = 60_000 / options.bpm;
  const amplitude = options.amplitude ?? 1;
  const noise = options.noise ?? 0;
  const introSilenceMs = options.introSilenceMs ?? 0;
  const random = createSeededRandom(Math.round(options.bpm * 100));
  const pulseWidthMs = Math.max(28, beatMs * 0.055);
  let beatNumber = 0;

  for (let beatTime = introSilenceMs; beatTime < durationMs; beatTime += beatMs) {
    beatNumber += 1;
    if (options.skipEvery && beatNumber % options.skipEvery === 0) {
      continue;
    }

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const sampleTime = (sampleIndex / (sampleCount - 1)) * durationMs;
      const distance = Math.abs(sampleTime - beatTime);
      const pulse = Math.max(0, 1 - distance / pulseWidthMs);
      samples[sampleIndex] += pulse * pulse * amplitude;
    }
  }

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const sampleTime = (sampleIndex / (sampleCount - 1)) * durationMs;
    const slowBed = sampleTime < introSilenceMs ? 0 : 0.08 + 0.035 * Math.sin(sampleTime / 1900);
    samples[sampleIndex] = Math.max(0, samples[sampleIndex] + slowBed + random() * noise);
  }

  return { samples, durationMs };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x100000000;
  };
}

function runTests(testCases: readonly TestCase[]): void {
  for (const testCase of testCases) {
    testCase.run();
  }

  console.log(`bpmAnalysis: ${testCases.length} tests passed`);
}

function assertBpmNear(actual: number | null, expected: number, tolerance: number): void {
  assert(actual !== null, `expected BPM near ${expected}, got null`);
  assert(
    Math.abs(actual - expected) <= tolerance,
    `expected BPM near ${expected} +/- ${tolerance}, got ${actual}`,
  );
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
