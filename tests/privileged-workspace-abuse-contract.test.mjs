import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("privileged workspace and restore mutations have abuse limits and UUID guards", async () => {
  const files = [
    "../src/app/api/workspaces/delete/route.ts",
    "../src/app/api/workspaces/invite/revoke/route.ts",
    "../src/app/api/workspaces/update-role/route.ts",
    "../src/app/api/workspaces/remove-member/route.ts",
    "../src/app/api/calendar/events/restore/route.ts",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  for (const source of sources) {
    assert.match(source, /checkRateLimit/);
    assert.match(source, /rateLimitResponse/);
    assert.match(source, /isUuid/);
  }
});
