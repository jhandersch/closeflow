import assert from "node:assert/strict";
import test from "node:test";
import { buildCsp, generateNonce } from "../src/lib/csp.ts";

test("script-src is nonce-based without unsafe-inline or unsafe-eval in production", () => {
  const csp = buildCsp({ nonce: "abc123", supabaseUrl: "https://proj.supabase.co" });
  const script = csp.split("; ").find((d) => d.startsWith("script-src"));
  assert.ok(script.includes("'nonce-abc123'"));
  assert.ok(script.includes("'strict-dynamic'"));
  assert.ok(!script.includes("unsafe-inline"));
  assert.ok(!script.includes("unsafe-eval"));
});

test("keeps framing, base and object restrictions and allows Supabase", () => {
  const csp = buildCsp({ nonce: "n", supabaseUrl: "https://proj.supabase.co/" });
  for (const d of ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'", "upgrade-insecure-requests"]) {
    assert.ok(csp.includes(d), d);
  }
  assert.ok(csp.includes("connect-src 'self' https://proj.supabase.co wss://proj.supabase.co"));
});

test("dev mode adds unsafe-eval only in dev", () => {
  assert.ok(buildCsp({ nonce: "n", isDev: true }).includes("'unsafe-eval'"));
  assert.ok(!buildCsp({ nonce: "n" }).includes("'unsafe-eval'"));
});

test("ignores an invalid Supabase URL and nonces are unique", () => {
  assert.ok(buildCsp({ nonce: "n", supabaseUrl: "not a url" }).includes("connect-src 'self';"));
  assert.notEqual(generateNonce(), generateNonce());
});
