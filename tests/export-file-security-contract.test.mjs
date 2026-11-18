import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("exports and file operations have abuse controls", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/app/api/leads/export/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/customers/export/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/files/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(sources[0], /checkRateLimit\(`leads:export:/);
  assert.match(sources[1], /checkRateLimit\(`customers:export:/);
  assert.match(sources[2], /checkRateLimit\(`files:read:/);
  assert.match(sources[2], /checkRateLimit\(`files:delete:/);
  assert.match(sources[2], /MAX_FILE_SIZE = 20 \* 1024 \* 1024/);
});
