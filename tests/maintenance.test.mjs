import assert from "node:assert/strict";
import test from "node:test";

import {
  hasBypass,
  isAllowedDuringMaintenance,
  isMaintenanceEnabled,
  bypassToken,
} from "../src/lib/maintenance.ts";

const secret = "a-long-enough-secret-for-testing-1234";

test("maintenance flag parsing", () => {
  assert.equal(isMaintenanceEnabled("on"), true);
  assert.equal(isMaintenanceEnabled("1"), true);
  assert.equal(isMaintenanceEnabled("off"), false);
  assert.equal(isMaintenanceEnabled(undefined), false);
});

test("only monitoring, cron and webhook stay open", () => {
  for (const path of ["/api/health", "/api/stripe/webhook", "/api/cron/automations"]) {
    assert.equal(isAllowedDuringMaintenance(path), true, path);
  }
  for (const path of ["/", "/login", "/dashboard", "/api/leads", "/api/integrations/google/callback"]) {
    assert.equal(isAllowedDuringMaintenance(path), false, path);
  }
});

test("bypass requires a valid secret", async () => {
  const token = await bypassToken(secret);
  assert.equal(await hasBypass({ cookie: token }, secret), true);
  assert.equal(await hasBypass({ header: secret }, secret), true);
  assert.equal(await hasBypass({ cookie: "x" }, secret), false);
  assert.equal(await hasBypass({ header: "wrong" }, secret), false);
  assert.equal(await hasBypass({ cookie: token }, "short"), false);
  assert.equal(await hasBypass({ cookie: token }, undefined), false);
});
