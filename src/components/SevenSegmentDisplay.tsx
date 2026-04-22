import React from "react";

void React;

const SEGMENT_KEYS = ["a", "b", "c", "d", "e", "f", "g"] as const;

const DIGIT_SEGMENTS: Record<string, ReadonlySet<(typeof SEGMENT_KEYS)[number]>> = {
  "0": new Set(["a", "b", "c", "d", "e", "f"]),
  "1": new Set(["b", "c"]),
  "2": new Set(["a", "b", "d", "e", "g"]),
  "3": new Set(["a", "b", "c", "d", "g"]),
  "4": new Set(["b", "c", "f", "g"]),
  "5": new Set(["a", "c", "d", "f", "g"]),
  "6": new Set(["a", "c", "d", "e", "f", "g"]),
  "7": new Set(["a", "b", "c"]),
  "8": new Set(["a", "b", "c", "d", "e", "f", "g"]),
  "9": new Set(["a", "b", "c", "d", "f", "g"]),
};

export function isSegmentDisplayValue(value: string) {
  return /^[0-9:]+$/.test(value) && /\d/.test(value);
}

interface SevenSegmentDisplayProps {
  value: string;
  className?: string;
}

function SevenSegmentDigit({ digit }: { digit: string }) {
  const activeSegments = DIGIT_SEGMENTS[digit];

  return (
    <span className="segment-digit" data-digit={digit} aria-hidden="true">
      {SEGMENT_KEYS.map((segmentKey) => (
        <span
          key={segmentKey}
          className={`segment segment-${segmentKey} ${activeSegments.has(segmentKey) ? "segment-on" : "segment-off"}`}
          data-segment={segmentKey}
          data-active={activeSegments.has(segmentKey) ? "true" : "false"}
        />
      ))}
    </span>
  );
}

function SegmentSeparator() {
  return (
    <span className="segment-separator" data-separator="colon" aria-hidden="true">
      <span className="segment-separator-dot" />
      <span className="segment-separator-dot" />
    </span>
  );
}

export function SevenSegmentDisplay({ value, className }: SevenSegmentDisplayProps) {
  return (
    <span
      className={className ? `seven-segment-display ${className}` : "seven-segment-display"}
      role="img"
      aria-label={value}
      data-value={value}
    >
      <span className="seven-segment-sr">{value}</span>
      {value.split("").map((character, index) => (
        character === ":"
          ? <SegmentSeparator key={`separator-${index}`} />
          : <SevenSegmentDigit key={`digit-${index}-${character}`} digit={character} />
      ))}
    </span>
  );
}
