import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("organization RLS helper functions are not executable by anonymous clients", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261111100000_restrict_organization_rls_helper_grants.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /revoke all on function public\.is_organization_member\(uuid\) from public, anon/);
  assert.match(migration, /revoke all on function public\.is_organization_manager\(uuid\) from public, anon/);
  assert.match(migration, /grant execute on function public\.is_organization_member\(uuid\) to authenticated/);
  assert.match(migration, /grant execute on function public\.is_organization_manager\(uuid\) to authenticated/);
});

test("workspace RLS and application functions are not executable by anonymous clients", async () => {
  const workspaceMigration = await readFile(
    new URL("../supabase/migrations/20261109221000_restrict_workspace_rls_helper_grants.sql", import.meta.url),
    "utf8",
  );
  const remainingMigration = await readFile(
    new URL("../supabase/migrations/20261112100000_restrict_remaining_function_grants.sql", import.meta.url),
    "utf8",
  );

  assert.match(workspaceMigration, /revoke all on function public\.is_workspace_member\(uuid\) from public, anon/);
  assert.match(workspaceMigration, /revoke all on function public\.is_workspace_manager\(uuid\) from public, anon/);
  assert.match(workspaceMigration, /grant execute on function public\.is_workspace_member\(uuid\) to authenticated/);
  assert.match(workspaceMigration, /grant execute on function public\.is_workspace_manager\(uuid\) to authenticated/);

  assert.match(remainingMigration, /revoke all on function public\.can_write_workspace\(uuid\) from public, anon/);
  assert.match(
    remainingMigration,
    /revoke all on function public\.create_onboarding_workspace\(text, text, text, text\) from public, anon/,
  );
  assert.match(remainingMigration, /revoke all on function public\.update_updated_at_column\(\) from public, anon/);
  assert.match(remainingMigration, /grant execute on function public\.can_write_workspace\(uuid\) to authenticated/);
  assert.match(
    remainingMigration,
    /grant execute on function public\.create_onboarding_workspace\(text, text, text, text\) to authenticated/,
  );
  assert.match(remainingMigration, /grant execute on function public\.update_updated_at_column\(\) to authenticated/);
});

test("viewer read-only migration keeps CRM writes behind workspace write access", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261118120000_enforce_viewer_read_only_contract.sql", import.meta.url),
    "utf8",
  );

  for (const table of ["customers", "ai_conversations", "revenue_events", "usage"]) {
    const legacyWritePolicy =
      table === "customers" ? "customers_member_mutation" : `${table}_member_access`;
    assert.match(
      migration,
      new RegExp(`drop policy if exists ${legacyWritePolicy} on public\\.${table};`, "i"),
    );
    assert.match(
      migration,
      new RegExp(
        `create policy ${table}_member_select on public\\.${table} for select\\s+using \\(public\\.is_workspace_member\\(workspace_id\\)\\);`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `create policy ${table}_member_insert on public\\.${table} for insert\\s+with check \\(public\\.can_write_workspace\\(workspace_id\\)\\);`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `create policy ${table}_member_update on public\\.${table} for update\\s+using \\(public\\.can_write_workspace\\(workspace_id\\)\\)\\s+with check \\(public\\.can_write_workspace\\(workspace_id\\)\\);`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `create policy ${table}_member_delete on public\\.${table} for delete\\s+using \\(public\\.can_write_workspace\\(workspace_id\\)\\);`,
        "i",
      ),
    );
  }

  assert.match(
    migration,
    /revoke all on function public\.consume_workspace_usage\(uuid, text, text, text\)\s+from public, anon;/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.consume_workspace_usage\(uuid, text, text, text\)\s+to authenticated;/i,
  );
  assert.match(
    migration,
    /if p_bucket = 'ai' and not public\.can_write_workspace\(p_workspace_id\) then\s+raise exception[\s\S]*?using errcode = '42501';/i,
  );

  for (const name of [
    "soft_delete_lead_dependents",
    "restore_lead_dependents",
    "soft_delete_lead_tasks",
    "restore_lead_tasks",
  ]) {
    const functionStart = migration.search(
      new RegExp(`create or replace function public\\.${name}\\(`, "i"),
    );
    assert.notEqual(functionStart, -1, `${name} function exists`);
    const functionEnd = migration.indexOf("\n$$;", functionStart);
    assert.notEqual(functionEnd, -1, `${name} function has a complete body`);
    const functionSql = migration.slice(functionStart, functionEnd);
    assert.match(functionSql, /security definer/i);
    assert.match(functionSql, /auth\.uid\(\) is null or not public\.can_write_workspace\(p_workspace_id\)/i);
    assert.match(
      functionSql,
      /not exists\s*\(\s*select 1 from public\.leads\s+where id = p_lead_id and workspace_id = p_workspace_id/i,
    );
  }

  const softDeleteTaskStart = migration.search(
    /create or replace function public\.soft_delete_task\(/i,
  );
  assert.notEqual(softDeleteTaskStart, -1, "soft_delete_task function exists");
  const softDeleteTaskEnd = migration.indexOf("\n$$;", softDeleteTaskStart);
  assert.notEqual(softDeleteTaskEnd, -1, "soft_delete_task function has a complete body");
  const softDeleteTaskSql = migration.slice(softDeleteTaskStart, softDeleteTaskEnd);
  assert.match(softDeleteTaskSql, /security definer/i);
  assert.match(softDeleteTaskSql, /auth\.uid\(\) is null/i);
  assert.match(softDeleteTaskSql, /public\.can_write_workspace\(p_workspace_id\)/i);
});
