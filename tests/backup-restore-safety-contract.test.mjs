import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("backup and restore scripts keep destructive operations guarded", async () => {
  const [backup, verify, fresh, publicRestore] = await Promise.all([
    readFile(new URL("../scripts/backup-supabase.ps1", import.meta.url), "utf8"),
    readFile(new URL("../scripts/verify-supabase-backup.ps1", import.meta.url), "utf8"),
    readFile(new URL("../scripts/restore-supabase-fresh.ps1", import.meta.url), "utf8"),
    readFile(new URL("../scripts/restore-supabase-public.ps1", import.meta.url), "utf8"),
  ]);
  assert.match(backup, /Remove-Item Env:PGPASSWORD/);
  assert.match(backup, /SHA256SUMS\.txt/);
  assert.match(backup, /Storage enthaelt/);
  assert.match(verify, /Get-FileHash.*SHA256/);
  assert.match(fresh, /Das ist das Production-Projekt/);
  assert.match(fresh, /Ziel ist nicht leer/);
  assert.match(publicRestore, /pre-restore-public\.sql/);
  assert.match(publicRestore, /single-transaction/);
});
