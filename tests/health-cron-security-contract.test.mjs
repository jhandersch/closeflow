import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("public health checks are rate-limited and cron routes require shared-secret authorization", async () => {
  const [health, alerts, automations, notifications] = await Promise.all([
    readFile(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/cron/alerts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/cron/automations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/cron/notifications/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(health, /health:read:/);
  assert.match(health, /getClientIp/);
  for (const source of [alerts, automations, notifications]) {
    assert.match(source, /timingSafeEqual/);
    assert.match(source, /CRON_SECRET/);
    assert.match(source, /if \(!isAuthorized\(request\)\)/);
  }
});
