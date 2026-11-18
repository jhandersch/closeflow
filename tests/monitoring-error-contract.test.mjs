import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("monitoring errors validate payloads and rate-limit reads and writes", async () => {
  const source = await readFile(
    new URL("../src/app/api/monitoring/errors/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /readJsonObject\(request\)/);
  assert.match(source, /Invalid request\./);
  assert.match(source, /errorLevels/);
  assert.match(source, /errorSources/);
  assert.match(source, /monitoring:errors:read:/);
  assert.match(source, /monitoring:errors:\$\{user\.id\}/);
  assert.match(source, /rateLimitResponse/);
});
