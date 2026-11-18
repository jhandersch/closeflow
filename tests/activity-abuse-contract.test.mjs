import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("activity writes are rate-limited and accept only object payloads", async () => {
  const source = await readFile(
    new URL("../src/app/api/activity/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /checkRateLimit\(`activity:write:/);
  assert.match(source, /rateLimitResponse/);
  assert.match(source, /readJsonObject\(request\)/);
  assert.match(source, /Invalid request\./);
  assert.match(source, /!Array\.isArray\(body\.metadata\)/);
});
