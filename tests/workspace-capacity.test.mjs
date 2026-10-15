import assert from "node:assert/strict";
import test from "node:test";
import {
  getOwnedWorkspaceCapacity,
  resolveWorkspacePlan,
} from "../src/lib/workspaceCapacity.ts";

test("Free and Pro owners are limited to one owned workspace", () => {
  for (const plan of ["free", "pro"]) {
    assert.deepEqual(
      getOwnedWorkspaceCapacity(
        [{ owner_id: "user-1", plan }],
        "user-1",
      ),
      { ownedCount: 1, limit: 1, canCreate: false },
    );
  }
});

test("an owned Business workspace allows up to five separately billed workspaces", () => {
  const workspaces = [
    { owner_id: "user-1", plan: "business" },
    { owner_id: "user-1", plan: "free" },
    { owner_id: "user-1", plan: "free" },
    { owner_id: "user-1", plan: "free" },
  ];

  assert.deepEqual(getOwnedWorkspaceCapacity(workspaces, "user-1"), {
    ownedCount: 4,
    limit: 5,
    canCreate: true,
  });
  assert.deepEqual(
    getOwnedWorkspaceCapacity(
      [...workspaces, { owner_id: "user-1", plan: "free" }],
      "user-1",
    ),
    { ownedCount: 5, limit: 5, canCreate: false },
  );
});

test("membership in someone else's Business workspace does not increase owned capacity", () => {
  assert.deepEqual(
    getOwnedWorkspaceCapacity(
      [
        { owner_id: "user-2", plan: "business" },
        { owner_id: "user-1", plan: "free" },
      ],
      "user-1",
    ),
    { ownedCount: 1, limit: 1, canCreate: false },
  );
});

test("workspace plan resolution matches subscription access status", () => {
  const now = Date.parse("2026-10-15T00:00:00Z");

  assert.equal(
    resolveWorkspacePlan(
      "free",
      { plan: "business", status: "active", current_period_end: null },
      now,
    ),
    "business",
  );
  assert.equal(
    resolveWorkspacePlan(
      "free",
      {
        plan: "business",
        status: "canceled",
        current_period_end: "2026-10-16T00:00:00Z",
      },
      now,
    ),
    "business",
  );
  assert.equal(
    resolveWorkspacePlan(
      "business",
      {
        plan: "business",
        status: "canceled",
        current_period_end: "2026-10-14T00:00:00Z",
      },
      now,
    ),
    "free",
  );
});
