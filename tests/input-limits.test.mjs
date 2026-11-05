import assert from "node:assert/strict";
import test from "node:test";

import { isOversizedApiRequest } from "../src/lib/inputLimits.ts";

test("rejects oversized write requests on regular API routes", () => {
  assert.equal(isOversizedApiRequest("POST", "/api/leads", String(2 * 1024 * 1024)), true);
  assert.equal(isOversizedApiRequest("PUT", "/api/activity", "1048577"), true);
});

test("allows normal sizes, reads, non-API paths and missing length", () => {
  assert.equal(isOversizedApiRequest("POST", "/api/leads", "2048"), false);
  assert.equal(isOversizedApiRequest("POST", "/api/leads", "1048576"), false);
  assert.equal(isOversizedApiRequest("GET", "/api/leads", "99999999"), false);
  assert.equal(isOversizedApiRequest("POST", "/login", "99999999"), false);
  assert.equal(isOversizedApiRequest("POST", "/api/leads", null), false);
  assert.equal(isOversizedApiRequest("POST", "/api/leads", "abc"), false);
});

test("exempts import, file, avatar and webhook routes", () => {
  for (const path of ["/api/leads/import", "/api/customers/import", "/api/files", "/api/profile/avatar", "/api/stripe/webhook"]) {
    assert.equal(isOversizedApiRequest("POST", path, String(4 * 1024 * 1024)), false, path);
  }
  assert.equal(isOversizedApiRequest("POST", "/api/leads/importer-evil", String(4 * 1024 * 1024)), true);
});
