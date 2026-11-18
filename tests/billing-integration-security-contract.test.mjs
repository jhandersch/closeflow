import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("billing portal and Google OAuth endpoints are rate-limited without database error leaks", async () => {
  const [portal, google] = await Promise.all([
    readFile(new URL("../src/app/api/stripe/create-portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/integrations/google/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(portal, /checkRateLimit\(`billing:portal:/);
  assert.match(portal, /rateLimitResponse/);
  assert.doesNotMatch(portal, /error:\s*subscriptionError\.message/);
  assert.match(portal, /Could not load billing details\./);
  assert.match(google, /checkRateLimit\(`google:connect:/);
  assert.match(google, /checkRateLimit\(`google:disconnect:/);
  assert.match(google, /rateLimitResponse/);
});
