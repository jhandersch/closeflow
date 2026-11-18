import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  "src/app/api/security/recovery-codes/verify/route.ts",
  "utf8",
);
const regenerate = readFileSync(
  "src/app/api/security/recovery-codes/regenerate/route.ts",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20261109220000_atomic_mfa_recovery_code_consume.sql",
  "utf8",
);

test("recovery verification uses an atomic server-side consume RPC", () => {
  assert.match(route, /\.rpc\(\s*"consume_mfa_recovery_code"/);
  assert.doesNotMatch(route, /\.from\("mfa_recovery_codes"\)\s*[\s\S]*?\.select/);
  assert.doesNotMatch(route, /\.from\("mfa_recovery_codes"\)\s*[\s\S]*?\.update/);
  assert.match(migration, /where user_id = auth\.uid\(\)/);
  assert.match(migration, /and used_at is null/);
  assert.match(migration, /grant execute on function public\.consume_mfa_recovery_code\(text\) to authenticated/);
});

test("recovery-code regeneration is rate-limited and does not expose database errors", () => {
  assert.match(regenerate, /security:recovery-regenerate/);
  assert.match(regenerate, /limit: 3/);
  assert.doesNotMatch(regenerate, /error:\s*deleteError\.message/);
  assert.doesNotMatch(regenerate, /error:\s*insertError\.message/);
});
