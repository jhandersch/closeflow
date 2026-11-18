import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("calendar and automation mutations have server-side abuse limits", async () => {
  const [calendar, automations] = await Promise.all([
    readFile(new URL("../src/app/api/calendar/events/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/automations/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(calendar, /checkRateLimit\(`calendar:write:/);
  assert.match(calendar, /limit: 60/);
  assert.match(automations, /checkRateLimit\(`automations:write:/);
  assert.match(automations, /limit: 30/);
  assert.match(calendar, /rateLimitResponse/);
  assert.match(automations, /rateLimitResponse/);
});
