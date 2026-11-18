import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Supabase storage and local API/realtime configuration are fail-closed", async () => {
  const [storageMigration, config] = await Promise.all([
    readFile(new URL("../supabase/migrations/20261001_workspace_file_storage.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/config.toml", import.meta.url), "utf8"),
  ]);
  assert.match(storageMigration, /public = false/);
  assert.match(storageMigration, /file_size_limit\)\s*values\s*\('closeflow-files', 'closeflow-files', false, 20971520\)/i);
  assert.match(storageMigration, /grant execute on function public\.can_access_workspace_file_folder\(text\) to authenticated/);
  assert.match(storageMigration, /to authenticated\s+using \(/);
  assert.match(storageMigration, /bucket_id = 'closeflow-files'/);
  assert.match(config, /max_rows = 1000/);
  assert.match(config, /\[realtime\]\s*enabled = true/);
  assert.match(config, /\[storage\]\s*enabled = true/);
});
