import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("workspace invite acceptance requires confirmed email and consumes the invite", async () => {
  const source = await readFile(
    new URL(
      "../supabase/migrations/20261109222000_require_confirmed_email_for_workspace_invites.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /u\.email_confirmed_at/);
  assert.match(source, /Email confirmation required/);
  assert.match(source, /where wi\.token = p_token/);
  assert.match(source, /for update/);
  assert.match(source, /delete from public\.workspace_invites/);
});
