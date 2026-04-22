import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimerPanel } from "../src/components/TimerPanel";
import { attachLocalProfile, createSessionSnapshot, deriveLobbyState } from "../src/lib/lobby/sessionState";
import { SevenSegmentDisplay, isSegmentDisplayValue } from "../src/components/SevenSegmentDisplay";
import type { CountdownDisplayState } from "../src/types/session";

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

test("00:00 renders four digits, one colon, and active segments", () => {
  const markup = renderToStaticMarkup(<SevenSegmentDisplay value="00:00" />);

  assert.equal(countMatches(markup, /class="segment-digit"/g), 4);
  assert.equal(countMatches(markup, /data-separator="colon"/g), 1);
  assert.equal(countMatches(markup, /data-active="true"/g), 24);
  assert.match(markup, /aria-label="00:00"/);
});

test("single-digit pre-count values render as one centered segment digit", () => {
  const markup = renderToStaticMarkup(<SevenSegmentDisplay value="3" />);

  assert.equal(countMatches(markup, /class="segment-digit"/g), 1);
  assert.equal(countMatches(markup, /data-active="true"/g), 5);
  assert.doesNotMatch(markup, /data-separator="colon"/);
});

test("numeric detection accepts digits and rejects special text states", () => {
  assert.equal(isSegmentDisplayValue("00:45"), true);
  assert.equal(isSegmentDisplayValue("3"), true);
  assert.equal(isSegmentDisplayValue("GO"), false);
  assert.equal(isSegmentDisplayValue("ARMED"), false);
});

test("TimerPanel keeps GO as text instead of broken segments", () => {
  const state = attachLocalProfile(createSessionSnapshot(), {
    id: "host-1",
    displayName: "NeonPilot",
    avatarSeed: "NP",
  });
  const countdownDisplay: CountdownDisplayState = {
    phase: "precount",
    headline: "GO",
    subheadline: "Synchronized pre-count",
    accentText: "Main timer is about to begin",
    timerText: "00:50",
    isUrgent: true,
  };

  const markup = renderToStaticMarkup(
    <TimerPanel
      state={state}
      lobbyState={deriveLobbyState(state)}
      countdownDisplay={countdownDisplay}
      onStartReadyHold={() => {}}
      onEndReadyHold={() => {}}
      onSetTimerDuration={() => {}}
      onSetPrecountDuration={() => {}}
      onResetRound={() => {}}
    />,
  );

  assert.match(markup, /timer-value-text/);
  assert.doesNotMatch(markup, /seven-segment-display/);
  assert.match(markup, />GO</);
});
