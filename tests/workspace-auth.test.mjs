import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorkspaceUserRole,
  requireWorkspaceAdmin,
} from "../src/lib/supabase/workspaceAuth.ts";

const supabaseWithRole = (role) => ({
  from(table) {
    assert.equal(table, "workspace_members");
    return {
      select(columns) {
        assert.equal(columns, "role");
        return {
          eq(column, value) {
            assert.equal(column, "workspace_id");
            assert.equal(value, "workspace-id");
            return {
              eq(userColumn, userId) {
                assert.equal(userColumn, "user_id");
                assert.equal(userId, "user-id");
                return {
                  maybeSingle: async () => ({
                    data: role ? { role } : null,
                    error: null,
                  }),
                };
              },
            };
          },
        };
      },
    };
  },
});

test("workspace role lookup recognizes each persisted role", async () => {
  for (const role of [
    "owner",
    "admin",
    "sales_manager",
    "sales_rep",
    "member",
    "viewer",
  ]) {
    const result = await getWorkspaceUserRole(
      supabaseWithRole(role),
      "workspace-id",
      "user-id",
    );
    assert.deepEqual(result, { ok: true, role });
  }
});

test("sales managers can be resolved without broadening admin authorization", async () => {
  const result = await requireWorkspaceAdmin(
    supabaseWithRole("sales_manager"),
    "workspace-id",
    "user-id",
  );

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    message: "Only workspace owners and admins can perform this action.",
  });
});
