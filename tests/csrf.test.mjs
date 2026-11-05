import assert from "node:assert/strict";
import test from "node:test";
import { isCrossSiteApiWrite } from "../src/lib/csrf.ts";

const base = { method: "POST", pathname: "/api/leads", origin: null, host: "www.closeflowapp.de", secFetchSite: null, hasAuthorizationHeader: false };

test("same-origin and header-less writes pass", () => {
  assert.equal(isCrossSiteApiWrite({ ...base, origin: "https://www.closeflowapp.de", secFetchSite: "same-origin" }), false);
  assert.equal(isCrossSiteApiWrite(base), false);
});

test("cross-site writes are rejected", () => {
  assert.equal(isCrossSiteApiWrite({ ...base, secFetchSite: "cross-site" }), true);
  assert.equal(isCrossSiteApiWrite({ ...base, origin: "https://evil.example" }), true);
  assert.equal(isCrossSiteApiWrite({ ...base, origin: "not a url" }), true);
});

test("reads, non-api paths, bearer calls, webhook and cron are not checked", () => {
  const evil = { ...base, origin: "https://evil.example", secFetchSite: "cross-site" };
  assert.equal(isCrossSiteApiWrite({ ...evil, method: "GET" }), false);
  assert.equal(isCrossSiteApiWrite({ ...evil, pathname: "/login" }), false);
  assert.equal(isCrossSiteApiWrite({ ...evil, hasAuthorizationHeader: true }), false);
  assert.equal(isCrossSiteApiWrite({ ...evil, pathname: "/api/stripe/webhook" }), false);
  assert.equal(isCrossSiteApiWrite({ ...evil, pathname: "/api/cron/alerts" }), false);
});
