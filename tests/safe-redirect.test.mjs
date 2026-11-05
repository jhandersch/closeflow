import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeNextPath } from "../src/lib/safeRedirect.ts";

test("allows normal in-app paths", () => {
  for (const p of ["/dashboard", "/billing", "/leads?id=1&x=%2F", "/login?mode=reset", "/a/b#c"]) {
    assert.equal(sanitizeNextPath(p), p);
  }
});

test("rejects external and ambiguous targets", () => {
  const bad = [
    null,
    undefined,
    "",
    "dashboard",
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/%0d%0a" + "x".repeat(3000),
    "/\tevil",
    "/\nhttps://evil.com",
    "/\u0000",
  ];
  for (const p of bad) {
    assert.equal(sanitizeNextPath(p), null, String(p).slice(0, 30));
  }
});
