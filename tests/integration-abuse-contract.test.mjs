import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("demo seeding and Google and feedback reads have server-side abuse limits", async () => {
  const [demo, googleImport, feedback] = await Promise.all([
    readFile(new URL("../src/app/api/demo/seed/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/integrations/google/import/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/feedback/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(demo, /readJsonObject\(request\)/);
  assert.match(demo, /Invalid request\./);
  assert.match(demo, /checkRateLimit\(`demo:seed:/);
  assert.match(demo, /rateLimitResponse/);
  assert.match(googleImport, /checkRateLimit\(`google:calendar-import:/);
  assert.match(googleImport, /rateLimitResponse/);
  assert.match(feedback, /checkRateLimit\(`feedback:read:/);
  assert.match(feedback, /rateLimitResponse/);
});
