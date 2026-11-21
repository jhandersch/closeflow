import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { purgeExpiredAuditLogs } from "../src/lib/auditLogRetention.ts";

test("purges expired audit logs in bounded batches and stops at a short batch", async () => {
  const calls = [];
  const counts = [1000, 1000, 27];
  const result = await purgeExpiredAuditLogs(
    {
      rpc: async (name, args) => {
        calls.push({ name, args });
        return { data: counts[calls.length - 1], error: null };
      },
    },
  );

  assert.deepEqual(result, { deleted: 2027, batches: 3 });
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ name, args }) =>
    name === "purge_expired_audit_logs" && args.p_batch_size === 1000
  ));
});

test("caps work per invocation to twenty batches", async () => {
  let calls = 0;
  const result = await purgeExpiredAuditLogs({
    rpc: async () => {
      calls += 1;
      return { data: 1000, error: null };
    },
  });

  assert.deepEqual(result, { deleted: 20000, batches: 20 });
  assert.equal(calls, 20);
});

test("fails explicitly on RPC errors and malformed counts", async () => {
  await assert.rejects(
    purgeExpiredAuditLogs({
      rpc: async () => ({ data: null, error: { message: "database unavailable" } }),
    }),
    /Audit log retention failed: database unavailable/,
  );
  await assert.rejects(
    purgeExpiredAuditLogs({
      rpc: async () => ({ data: "1000", error: null }),
    }),
    /invalid deletion count/,
  );
});

test("rejects unsafe batch configuration before making an RPC", async () => {
  let called = false;
  await assert.rejects(
    purgeExpiredAuditLogs(
      { rpc: async () => { called = true; return { data: 0, error: null }; } },
      { batchSize: 1001 },
    ),
    /Invalid audit log retention batch limits/,
  );
  assert.equal(called, false);
});

test("database purge enforces the approved cutoff and service-role-only execution", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261121170000_audit_log_retention_12_months.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /created_at < now\(\) - interval '12 months'/i);
  assert.match(migration, /limit p_batch_size\s+for update skip locked/i);
  assert.match(
    migration,
    /revoke all on function public\.purge_expired_audit_logs\(integer\)\s+from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.purge_expired_audit_logs\(integer\)\s+to service_role/i,
  );
});
