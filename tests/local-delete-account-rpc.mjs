// Local-only: delete_account_data is service_role only and rolls back as a whole on failure.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY } = process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !LOCAL_SUPABASE_PUBLIC_KEY) throw new Error("Missing local test configuration.");
if (!["127.0.0.1", "localhost"].includes(new URL(LOCAL_SUPABASE_URL).hostname)) throw new Error("Refusing to run against a non-loopback target.");
const o = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, o);
let failures = 0;
const check = async (n, f) => { try { await f(); console.log(`PASS ${n}`); } catch (e) { failures++; console.log(`FAIL ${n}: ${e.message}`); } };
const ids = [];
try {
  const email = `closeflow-local-del-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error); ids.push(data.user.id);
  const uid = data.user.id;
  const ws = await admin.from("workspaces").insert({ name: "LOCAL-del", owner_id: uid, plan: "free" }).select("id").single();
  assert.ifError(ws.error);
  assert.ifError((await admin.from("workspace_members").insert({ workspace_id: ws.data.id, user_id: uid, role: "owner" })).error);
  assert.ifError((await admin.from("leads").insert({ workspace_id: ws.data.id, user_id: uid, name: "L1", company: "C", status: "new" })).error);
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, o);
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error);

  await check("authenticated and anon cannot execute delete_account_data", async () => {
    const r = await client.rpc("delete_account_data", { p_user_id: uid });
    assert.ok(r.error, "authenticated call must be denied");
    const anon = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, o);
    assert.ok((await anon.rpc("delete_account_data", { p_user_id: uid })).error);
    const still = await admin.from("leads").select("id").eq("user_id", uid);
    assert.equal(still.data.length, 1);
  });

  await check("service_role run removes solo data completely", async () => {
    const r = await admin.rpc("delete_account_data", { p_user_id: uid });
    assert.ifError(r.error);
    assert.equal(r.data, "ok");
    assert.equal((await admin.from("leads").select("id").eq("user_id", uid)).data.length, 0);
    assert.equal((await admin.from("workspace_members").select("user_id").eq("user_id", uid)).data.length, 0);
  });
  await check("forced failure mid-function rolls back everything (no partial deletion)", async () => {
    const e2 = `closeflow-local-rb-${randomUUID()}@example.invalid`;
    const u2 = await admin.auth.admin.createUser({ email: e2, password: `Cf_${randomUUID()}_R8!`, email_confirm: true });
    assert.ifError(u2.error); ids.push(u2.data.user.id);
    const id2 = u2.data.user.id;
    const w2 = await admin.from("workspaces").insert({ name: "LOCAL-rb", owner_id: id2, plan: "free" }).select("id").single();
    assert.ifError(w2.error);
    assert.ifError((await admin.from("workspace_members").insert({ workspace_id: w2.data.id, user_id: id2, role: "owner" })).error);
    assert.ifError((await admin.from("leads").insert({ workspace_id: w2.data.id, user_id: id2, name: "RB", company: "C", status: "new" })).error);
    const pgc = new pg.Client({ host: "127.0.0.1", port: 54322, user: "postgres", password: "postgres", database: "postgres" });
    await pgc.connect();
    try {
      await pgc.query("create or replace function public.tmp_fail_member_delete() returns trigger language plpgsql as $$ begin raise exception 'forced failure'; end $$");
      await pgc.query("create trigger tmp_fail_member_delete before delete on public.workspace_members for each row execute function public.tmp_fail_member_delete()");
      const r = await admin.rpc("delete_account_data", { p_user_id: id2 });
      assert.ok(r.error && /forced failure/.test(r.error.message), "expected forced failure");
      const leads = await admin.from("leads").select("id").eq("user_id", id2);
      assert.equal(leads.data.length, 1, "lead must survive the rolled-back call");
      const mem = await admin.from("workspace_members").select("user_id").eq("user_id", id2);
      assert.equal(mem.data.length, 1);
    } finally {
      await pgc.query("drop trigger if exists tmp_fail_member_delete on public.workspace_members");
      await pgc.query("drop function if exists public.tmp_fail_member_delete()");
      await pgc.end();
    }
    const ok = await admin.rpc("delete_account_data", { p_user_id: id2 });
    assert.equal(ok.data, "ok");
  });
} finally {
  for (const id of ids) await admin.auth.admin.deleteUser(id).catch(() => {});
}
console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
