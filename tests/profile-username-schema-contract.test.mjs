import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("profile username API field is present in the database migration", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261115182300_add_profile_username.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const route = await readFile(
    new URL("../src/app/api/profile/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    migration,
    /alter table public\.profiles\s+add column if not exists username text;/i,
  );
  const selectedColumns = route.match(/\.select\(\s*"([^"]+)"\s*,?\s*\)/)?.[1];
  assert.ok(selectedColumns);
  assert.ok(selectedColumns.split(/,\s*/).includes("username"));
  assert.ok(!selectedColumns.split(/,\s*/).includes("role"));
  assert.match(route, /username,\s*avatar_url:\s*avatar/);
  assert.match(route, /user\.app_metadata\?\.role/);
});
