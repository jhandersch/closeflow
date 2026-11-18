import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("remaining destructive and security mutations have limits and object validation", async () => {
  const [google, trash, avatar, recovery] = await Promise.all([
    readFile(new URL("../src/app/api/integrations/google/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/leads/trash/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/profile/avatar/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/security/recovery-codes/verify/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(google, /checkRateLimit\(`google:disconnect:/);
  assert.match(google, /rateLimitResponse/);
  assert.match(trash, /checkRateLimit\(`leads:trash-empty:/);
  assert.match(trash, /rateLimitResponse/);
  assert.match(avatar, /checkRateLimit\(`profile:avatar:/);
  assert.match(avatar, /readJsonObject\(request\)/);
  assert.match(recovery, /readJsonObject\(request\)/);
  assert.match(recovery, /Invalid request\./);
});
