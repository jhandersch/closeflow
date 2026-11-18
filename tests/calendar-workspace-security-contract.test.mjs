import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("calendar, automation, and workspace member reads are bounded", async () => {
  const [calendar, automations, members] = await Promise.all([
    readFile(new URL("../src/app/api/calendar/events/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/automations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/workspaces/members/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(calendar, /calendar:read:/);
  assert.match(automations, /automations:read:/);
  assert.match(members, /workspace:members-read:/);
  assert.match(members, /isUuid\(workspaceId\)/);
  assert.match(calendar, /rateLimitResponse/);
  assert.match(automations, /rateLimitResponse/);
});
