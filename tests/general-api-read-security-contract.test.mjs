import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("general API reads and OAuth callback have abuse controls", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/app/api/leads/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/activity/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/me/permissions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/integrations/google/callback/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(sources[0], /leads:read:/);
  assert.match(sources[1], /activity:read:/);
  assert.match(sources[2], /permissions:read:/);
  assert.match(sources[3], /google:callback:/);
  assert.match(sources[3], /google_rate_limited/);
});
