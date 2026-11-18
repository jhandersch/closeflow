import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("production rate limiting fails closed when the shared limiter is unavailable", async () => {
  const source = await readFile(
    new URL("../src/lib/rateLimit.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /process\.env\.NODE_ENV === "production"/);
  assert.match(source, /unavailableRateLimitResult/);
  assert.match(source, /success: false/);
});
