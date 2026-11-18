import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("all scheduled cron routes fail closed and compare secrets safely", async () => {
  const files = [
    "../src/app/api/cron/alerts/route.ts",
    "../src/app/api/cron/automations/route.ts",
    "../src/app/api/cron/notifications/route.ts",
  ];
  const sources = await Promise.all(
    files.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  for (const source of sources) {
    assert.match(source, /process\.env\.CRON_SECRET/);
    assert.match(source, /if \(!secret\) return false/);
    assert.match(source, /timingSafeEqual/);
    assert.match(source, /actual\.length === expected\.length/);
    assert.match(source, /status: 401/);
  }
});
