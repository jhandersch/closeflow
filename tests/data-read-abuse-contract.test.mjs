import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("data-intensive reads have bounded result sets or rate limits", async () => {
  const sources = await Promise.all([
    ["search", "../src/app/api/search/route.ts"],
    ["forecast", "../src/app/api/dashboard/forecast/route.ts"],
    ["workspaces", "../src/app/api/workspaces/route.ts"],
    ["admin overview", "../src/app/api/admin/overview/route.ts"],
    ["admin users", "../src/app/api/admin/users/route.ts"],
  ].map(async ([name, path]) => [name, await readFile(new URL(path, import.meta.url), "utf8")]));

  for (const [name, source] of sources) {
    assert.match(source, /checkRateLimit/, `${name} must use a read rate limit`);
    assert.match(source, /rateLimitResponse/, `${name} must return the standard limit response`);
  }
  assert.match(sources[0][1], /const MAX_SEARCH_RESULTS = 100;/);
});
