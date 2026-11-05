import assert from "node:assert/strict";
import test from "node:test";
import { detectErrorSpike, parseThreshold } from "../src/lib/alerting.ts";

const sample = (type, n) => Array.from({ length: n }, () => ({ event_type: type, created_at: "2026-11-05T10:00:00Z" }));

test("no spike below the threshold", () => {
  assert.equal(detectErrorSpike(sample("error.api", 4), 5, 24), null);
});

test("spike counts only error events and groups by type", () => {
  const spike = detectErrorSpike([...sample("error.api", 3), ...sample("error.client", 2), ...sample("ai.usage", 50)], 5, 24);
  assert.equal(spike?.total, 5);
  assert.deepEqual(spike?.byType, { "error.api": 3, "error.client": 2 });
});

test("threshold falls back to the default for invalid values", () => {
  assert.equal(parseThreshold(undefined), 25);
  assert.equal(parseThreshold("abc"), 25);
  assert.equal(parseThreshold("0"), 25);
  assert.equal(parseThreshold("10"), 10);
});
