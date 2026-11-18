import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const loginPage = new URL("../src/app/(auth)/login/page.tsx", import.meta.url);
const settingsPage = new URL("../src/app/(dashboard)/settings/page.tsx", import.meta.url);

test("password recovery globally signs out after password update", async () => {
  const source = await readFile(loginPage, "utf8");
  const updateMatch = source.match(/supabase\.auth\.updateUser\(\{\s*password,/);
  const updateIndex = updateMatch?.index ?? -1;
  assert.notEqual(updateIndex, -1);
  const signOutIndex = source.indexOf('supabase.auth.signOut({', updateIndex);
  const globalScopeIndex = source.indexOf('scope: "global"', signOutIndex);
  assert.notEqual(signOutIndex, -1);
  assert.ok(globalScopeIndex > signOutIndex);
});

test("settings password change globally signs out after password update", async () => {
  const source = await readFile(settingsPage, "utf8");
  const updateMatch = source.match(/supabase\.auth\.updateUser\(\{\s*password: newPassword,/);
  const updateIndex = updateMatch?.index ?? -1;
  assert.notEqual(updateIndex, -1);
  const signOutIndex = source.indexOf('supabase.auth.signOut({', updateIndex);
  const globalScopeIndex = source.indexOf('scope: "global"', signOutIndex);
  assert.notEqual(signOutIndex, -1);
  assert.ok(globalScopeIndex > signOutIndex);
});
