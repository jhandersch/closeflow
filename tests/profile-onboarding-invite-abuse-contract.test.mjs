import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("onboarding, profile updates and invite acceptance are rate-limited", async () => {
  const [onboarding, profile, preferences, inviteAccept] = await Promise.all([
    readFile(new URL("../src/app/api/onboarding/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/profile/preferences/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/workspaces/invite/accept/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(onboarding, /checkRateLimit\(`onboarding:write:/);
  assert.match(onboarding, /rateLimitResponse/);
  assert.match(profile, /checkRateLimit\(`profile:update:/);
  assert.match(profile, /rateLimitResponse/);
  assert.match(preferences, /checkRateLimit\(`profile:preferences:/);
  assert.match(preferences, /rateLimitResponse/);
  assert.match(inviteAccept, /checkRateLimit\(`workspace:invite-accept:/);
  assert.match(inviteAccept, /rateLimitResponse/);
});
