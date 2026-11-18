import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("audit-log access is bounded and does not expose database errors", async () => {
  const source = await readFile(
    new URL("../src/app/api/audit-logs/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /checkRateLimit\(`audit-logs:read:/);
  assert.match(source, /limit\(limit\)/);
  assert.match(source, /AUDIT LOG LOAD ERROR/);
  assert.doesNotMatch(source, /error:\s*queryError\.message/);
});
