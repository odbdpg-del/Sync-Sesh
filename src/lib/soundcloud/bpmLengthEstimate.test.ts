import { estimateBpmFromLength } from "./bpmLengthEstimate";

interface TestCase {
  name: string;
  run: () => void;
}

const tests: TestCase[] = [
  {
    name: "invalid duration returns no BPM",
    run: () => {
      const result = estimateBpmFromLength(Number.NaN);

      assert(result.bpm === null, `expected null BPM, got ${result.bpm}`);
      assert(result.confidence === 0, `expected 0 confidence, got ${result.confidence}`);
      assert(result.source === "none", `expected none source, got ${result.source}`);
      assert(result.candidates.length === 0, `expected no candidates, got ${result.candidates.length}`);
    },
  },
  {
    name: "tiny duration returns no BPM",
    run: () => {
      const result = estimateBpmFromLength(12_000);

      assert(result.bpm === null, `expected null BPM, got ${result.bpm}`);
      assert(result.candidates.length === 0, `expected no candidates, got ${result.candidates.length}`);
    },
  },
  {
    name: "four minute clean phrase estimate prefers 128 BPM",
    run: () => {
      const result = estimateBpmFromLength(240_000);

      assertBpmNear(result.bpm, 128, 0.1);
      assert(result.source === "LENGTH", `expected LENGTH source, got ${result.source}`);
      assert(result.beatCount === 512, `expected 512 beats, got ${result.beatCount}`);
      assert(result.barCount === 128, `expected 128 bars, got ${result.barCount}`);
      assert(result.confidence > 0 && result.confidence < 0.75, `unexpected confidence ${result.confidence}`);
    },
  },
  {
    name: "five minute duration can estimate from common 640-ish unavailable phrase by selecting nearest useful candidate",
    run: () => {
      const result = estimateBpmFromLength(300_000);

      assert(result.bpm !== null, "expected a duration BPM candidate");
      assert(result.bpm >= 70 && result.bpm <= 180, `expected BPM in range, got ${result.bpm}`);
      assert(result.candidates.length > 0, "expected candidate list");
    },
  },
  {
    name: "metadata reference can promote a lower-ranked duration candidate",
    run: () => {
      const result = estimateBpmFromLength(240_000, { metadataBpm: 96 });

      assertBpmNear(result.bpm, 96, 0.1);
      assert(result.beatCount === 384, `expected 384 beats, got ${result.beatCount}`);
      assert(result.candidates[0].debug.referenceScore > 0.9, "expected strong reference score");
    },
  },
  {
    name: "waveform reference accepts half-time and double-time relationships",
    run: () => {
      const result = estimateBpmFromLength(240_000, { waveformBpm: 64 });

      assertBpmNear(result.bpm, 128, 0.1);
      assert(result.candidates[0].debug.referenceScore > 0.9, "expected normalized reference score");
    },
  },
  {
    name: "custom range clamps candidates",
    run: () => {
      const result = estimateBpmFromLength(240_000, { minBpm: 90, maxBpm: 110 });

      assertBpmNear(result.bpm, 96, 0.1);
      assert(
        result.candidates.every((candidate) => candidate.bpm >= 90 && candidate.bpm <= 110),
        "expected every candidate inside custom range",
      );
    },
  },
  {
    name: "candidate debug exposes BPM, beats, bars, confidence, score, and LENGTH source",
    run: () => {
      const result = estimateBpmFromLength(180_000, { waveformBpm: 128 });
      const candidate = result.candidates[0];

      assert(candidate !== undefined, "expected top candidate");
      assert(typeof candidate.bpm === "number", "expected candidate BPM number");
      assert(typeof candidate.beatCount === "number", "expected candidate beat count");
      assert(typeof candidate.barCount === "number", "expected candidate bar count");
      assert(typeof candidate.confidence === "number", "expected candidate confidence");
      assert(typeof candidate.score === "number", "expected candidate score");
      assert(candidate.source === "LENGTH", `expected LENGTH source, got ${candidate.source}`);
      assert(result.debug.candidateCount === result.candidates.length, "expected debug candidate count to match");
    },
  },
];

runTests(tests);

function runTests(testCases: readonly TestCase[]): void {
  for (const testCase of testCases) {
    testCase.run();
  }

  console.log(`bpmLengthEstimate: ${testCases.length} tests passed`);
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
