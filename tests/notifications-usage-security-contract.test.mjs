import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("notification and usage reads hide internal errors and limit repeated requests", async () => {
  const [notifications, usage] = await Promise.all([
    readFile(new URL("../src/app/api/notifications/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/usage/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(notifications, /checkRateLimit\(`notifications:read:/);
  assert.match(notifications, /Could not load notifications\./);
  assert.doesNotMatch(notifications, /loadError\.message/);
  assert.match(usage, /checkRateLimit\(`usage:read:/);
  assert.match(usage, /rateLimitResponse/);
});
