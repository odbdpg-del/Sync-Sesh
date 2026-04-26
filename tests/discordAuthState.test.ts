import assert from "node:assert/strict";
import test from "node:test";
import { createDiscordAuthAttemptId, extractDiscordAuthorizationCode, shouldApplyDiscordAuthAttemptResult } from "../src/lib/discord/embeddedApp";

test("createDiscordAuthAttemptId creates a stable-at-format attempt id", () => {
  const attemptId = createDiscordAuthAttemptId(1234567890, 0.5);

  assert.match(attemptId, /^auth-[a-z0-9]+-[a-z0-9]+$/);
});

test("shouldApplyDiscordAuthAttemptResult ignores stale attempts", () => {
  assert.equal(shouldApplyDiscordAuthAttemptResult("auth-new", "auth-new"), true);
  assert.equal(shouldApplyDiscordAuthAttemptResult("auth-new", "auth-old"), false);
  assert.equal(shouldApplyDiscordAuthAttemptResult(undefined, "auth-any"), true);
});

test("extractDiscordAuthorizationCode keeps a valid code", () => {
  const result = extractDiscordAuthorizationCode({ code: "fresh-auth-code" });

  assert.equal(result.code, "fresh-auth-code");
  assert.match(result.debugSummary, /authorize result keys: code/);
});

test("extractDiscordAuthorizationCode rejects missing codes", () => {
  const missingCodeResult = extractDiscordAuthorizationCode({ state: "abc123" });
  const invalidTypeResult = extractDiscordAuthorizationCode(null);

  assert.equal(missingCodeResult.code, undefined);
  assert.match(missingCodeResult.debugSummary, /authorize result keys: state/);
  assert.equal(invalidTypeResult.code, undefined);
  assert.match(invalidTypeResult.debugSummary, /unexpected authorize result type: object/);
});
