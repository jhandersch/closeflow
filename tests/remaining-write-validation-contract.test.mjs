import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("calendar, automation, billing, and file writes validate payloads", async () => {
  const files = [
    "../src/app/api/calendar/events/route.ts",
    "../src/app/api/automations/route.ts",
    "../src/app/api/stripe/create-checkout/route.ts",
    "../src/app/api/files/route.ts",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  assert.match(sources[0], /readJsonObject\(request\)/);
  assert.match(sources[0], /title\.length > 200/);
  assert.match(sources[1], /isUuid\(id\)/);
  assert.match(sources[2], /Invalid billing plan/);
  assert.match(sources[3], /path\.length > 500/);
});
