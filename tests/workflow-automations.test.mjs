import assert from "node:assert/strict";
import test from "node:test";
import { runWorkflowAutomations } from "../src/lib/workflowAutomations.ts";

const makeSupabase = (responses) => {
  const calls = [];

  return {
    calls,
    from(table) {
      const call = { table, filters: [], operation: null, payload: null };
      calls.push(call);
      const builder = {
        select() {
          call.operation = "select";
          return builder;
        },
        insert(payload) {
          call.operation = "insert";
          call.payload = payload;
          return builder;
        },
        update(payload) {
          call.operation = "update";
          call.payload = payload;
          return builder;
        },
        eq(column, value) {
          call.filters.push([column, value]);
          return builder;
        },
        limit() {
          return builder;
        },
        then(resolve, reject) {
          return Promise.resolve(responses(table, call)).then(resolve, reject);
        },
      };
      return builder;
    },
  };
};

test("workflow automation load errors are propagated", async () => {
  const supabase = makeSupabase(() => ({
    data: null,
    error: new Error("automation query failed"),
  }));

  await assert.rejects(
    runWorkflowAutomations(
      supabase,
      "user-a",
      "workspace-a",
      { id: "lead-a" },
      "task.overdue",
    ),
    /automation query failed/,
  );
  assert.ok(
    supabase.calls[0].filters.some(
      ([column, value]) => column === "workspace_id" && value === "workspace-a",
    ),
  );
});

test("workflow task lookup failures mark the run failed instead of proceeding", async () => {
  const supabase = makeSupabase((table) => {
    if (table === "automations") {
      return {
        data: [{
          id: "automation-a",
          name: "Follow up",
          actions: [{ type: "task.create", payload: { title: "Call lead" } }],
        }],
        error: null,
      };
    }
    if (table === "automation_runs") {
      return { data: null, error: null };
    }
    if (table === "tasks") {
      return { data: null, error: new Error("task lookup failed") };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  const results = await runWorkflowAutomations(
    supabase,
    "user-a",
    "workspace-a",
    { id: "lead-a" },
    "task.overdue",
    { dedupeKey: "overdue:lead-a" },
  );

  assert.deepEqual(results, [{ automationId: "automation-a", status: "failed" }]);
  const runUpdate = supabase.calls.find(
    (call) => call.table === "automation_runs" && call.operation === "update",
  );
  assert.equal(runUpdate.payload.status, "failed");
  assert.match(runUpdate.payload.payload.error, /task lookup failed/);
});

test("duplicate workflow claims remain idempotently skipped", async () => {
  const supabase = makeSupabase((table, call) => {
    if (table === "automations") {
      return {
        data: [{ id: "automation-a", name: "Follow up", actions: [] }],
        error: null,
      };
    }
    if (table === "automation_runs" && call.operation === "insert") {
      return { data: null, error: { code: "23505" } };
    }
    throw new Error(`Unexpected query for ${table}`);
  });

  assert.deepEqual(
    await runWorkflowAutomations(
      supabase,
      "user-a",
      "workspace-a",
      { id: "lead-a" },
      "task.overdue",
      { dedupeKey: "overdue:lead-a" },
    ),
    [],
  );
  assert.equal(
    supabase.calls.filter(
      (call) => call.table === "automation_runs" && call.operation === "update",
    ).length,
    0,
  );
});
