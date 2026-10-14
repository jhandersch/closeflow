import assert from "node:assert/strict";
import test from "node:test";
import { consumeWorkspaceUsage } from "../src/lib/usageQuota.ts";

const response = (allowed, currentCount, alreadyCounted = false) => ({
  allowed,
  current_count: currentCount,
  usage_limit: 10,
  plan: "free",
  already_counted: alreadyCounted,
});

const fakeSupabase = (result) => ({
  rpc: async (functionName, args) => {
    assert.equal(functionName, "consume_workspace_usage");
    assert.equal(args.p_workspace_id, "workspace-1");
    assert.equal(args.p_bucket, "ai");
    return result;
  },
});

test("reserves usage and preserves the server response", async () => {
  const result = await consumeWorkspaceUsage(
    fakeSupabase({ data: response(true, 1), error: null }),
    "workspace-1",
    "ai",
    "request-1",
    "2026-10",
  );

  assert.deepEqual(result, {
    ok: true,
    currentCount: 1,
    limit: 10,
    plan: "free",
    alreadyCounted: false,
  });
});

test("returns a quota denial without success-shaped fallback", async () => {
  const result = await consumeWorkspaceUsage(
    fakeSupabase({ data: response(false, 10), error: null }),
    "workspace-1",
    "ai",
    "request-11",
    "2026-10",
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 429);
});

test("fails closed when the usage RPC returns a database error", async () => {
  const result = await consumeWorkspaceUsage(
    fakeSupabase({ data: null, error: { message: "database unavailable" } }),
    "workspace-1",
    "ai",
    "request-1",
    "2026-10",
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});

test("fails closed when the usage RPC response is malformed", async () => {
  const result = await consumeWorkspaceUsage(
    fakeSupabase({ data: { allowed: true }, error: null }),
    "workspace-1",
    "ai",
    "request-1",
    "2026-10",
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});

test("preserves idempotent retry status returned by the RPC", async () => {
  const result = await consumeWorkspaceUsage(
    fakeSupabase({ data: response(true, 3, true), error: null }),
    "workspace-1",
    "ai",
    "request-2",
    "2026-10",
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.alreadyCounted, true);
    assert.equal(result.currentCount, 3);
  }
});

test("fails closed when the usage RPC throws", async () => {
  const result = await consumeWorkspaceUsage(
    {
      rpc: async () => {
        throw new Error("connection reset");
      },
    },
    "workspace-1",
    "ai",
    "request-1",
    "2026-10",
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});
