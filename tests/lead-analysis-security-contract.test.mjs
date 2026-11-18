import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("lead analysis endpoints hide internal errors and limit repeated calculations", async () => {
  const [analysis, nextAction, score] = await Promise.all([
    readFile(new URL("../src/app/api/leads/[id]/ai-analysis/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/leads/[id]/next-action/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/leads/[id]/score/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(analysis, /checkRateLimit\(`lead:ai-analysis:/);
  assert.match(analysis, /Lead analysis failed\./);
  assert.doesNotMatch(analysis, /error\.message/);
  assert.match(nextAction, /checkRateLimit\(`lead:next-action:/);
  assert.match(nextAction, /rateLimitResponse/);
  assert.match(score, /checkRateLimit\(`lead:score:/);
  assert.match(score, /rateLimitResponse/);
});
