import assert from "node:assert/strict";
import test from "node:test";
import { createDiscordAuthAttemptId, shouldApplyDiscordAuthAttemptResult } from "../src/lib/discord/embeddedApp";

test("createDiscordAuthAttemptId creates a stable-at-format attempt id", () => {
  const attemptId = createDiscordAuthAttemptId(1234567890, 0.5);

  assert.match(attemptId, /^auth-[a-z0-9]+-[a-z0-9]+$/);
});

test("shouldApplyDiscordAuthAttemptResult ignores stale attempts", () => {
  assert.equal(shouldApplyDiscordAuthAttemptResult("auth-new", "auth-new"), true);
  assert.equal(shouldApplyDiscordAuthAttemptResult("auth-new", "auth-old"), false);
  assert.equal(shouldApplyDiscordAuthAttemptResult(undefined, "auth-any"), true);
});
