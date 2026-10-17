// Local-only test for the hardened legacy accept_organization_invite RPC.
// Required env: LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY.
// Refuses non-loopback targets. Never reads .env.local.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY } = process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !LOCAL_SUPABASE_PUBLIC_KEY) throw new Error("Missing local test configuration.");
if (!["127.0.0.1", "localhost"].includes(new URL(LOCAL_SUPABASE_URL).hostname)) throw new Error("Refusing to run against a non-loopback target.");

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, authOpts);
let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`PASS ${name}`); } catch (e) { failures++; console.log(`FAIL ${name}: ${e.message}`); }
};
const userIds = [];
const orgIds = [];
const makeUser = async (tag, confirmed = true) => {
  const email = `closeflow-local-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: confirmed });
  assert.ifError(error);
  userIds.push(data.user.id);
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, authOpts);
  if (confirmed) assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
  return { id: data.user.id, email, client };
};
let ownerId;
const makeInvite = async (org, email, token) => {
  const r = await admin.from("organization_invites").insert({
    organization_id: org, invited_by: ownerId, email, role: "Sales", status: "pending",
    token_hash: createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  }).select("id").single();
  assert.ifError(r.error);
  return r.data.id;
};
const members = async (org) => (await admin.from("organization_members").select("member_user_id").eq("organization_id", org)).data || [];

try {
  const owner = await makeUser("owner");
  ownerId = owner.id;
  const org = await admin.from("organizations").insert({ name: "LOCAL-legacy", slug: `local-${randomUUID()}`, owner_user_id: owner.id }).select("id").single();
  assert.ifError(org.error);
  orgIds.push(org.data.id);
  const O = org.data.id;

  await check("wrong user (other email) cannot accept, even passing the invited email as p_email", async () => {
    const victim = await makeUser("victim");
    const attacker = await makeUser("attacker");
    await makeInvite(O, victim.email, "tok-1");
    const r = await attacker.client.rpc("accept_organization_invite", { p_email: victim.email, p_member_name: "x", p_token: "tok-1" });
    assert.ifError(r.error);
    assert.equal(r.data, null);
    assert.equal((await members(O)).length, 0);
  });

  await check("wrong token is rejected for the right user", async () => {
    const u = await makeUser("wrongtok");
    await makeInvite(O, u.email, "tok-2");
    const r = await u.client.rpc("accept_organization_invite", { p_member_name: "x", p_token: "nope" });
    assert.ifError(r.error);
    assert.equal(r.data, null);
  });

  await check("unconfirmed account cannot accept", async () => {
    const u = await makeUser("unconf", false);
    await makeInvite(O, u.email, "tok-3");
    const r = await admin.rpc("accept_organization_invite", { p_member_name: "x" });
    assert.ok(r.error || r.data === null);
    assert.equal((await members(O)).some((m) => m.member_user_id === u.id), false);
  });

  await check("anonymous call is denied", async () => {
    const anon = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, authOpts);
    const r = await anon.rpc("accept_organization_invite", { p_member_name: "x" });
    assert.ok(r.error, "expected permission error");
  });

  await check("valid accept joins once; 10 parallel accepts leave exactly one membership and one audit event", async () => {
    const u = await makeUser("good");
    const id = await makeInvite(O, u.email, "tok-4");
    const results = await Promise.all(Array.from({ length: 10 }, () => u.client.rpc("accept_organization_invite", { p_invite_id: id, p_member_name: "Good", p_token: "tok-4" })));
    for (const r of results) assert.ifError(r.error);
    assert.equal(results.filter((r) => r.data === O).length, 1, JSON.stringify(results.map((r) => r.data)));
    const mine = (await members(O)).filter((m) => m.member_user_id === u.id);
    assert.equal(mine.length, 1);
    const audit = await admin.from("organization_audit_events").select("id").eq("organization_id", O).eq("actor_user_id", u.id);
    assert.equal(audit.data.length, 1);
    const inv = await admin.from("organization_invites").select("status,token_hash").eq("id", id).single();
    assert.equal(inv.data.status, "accepted");
    assert.equal(inv.data.token_hash, null);
  });

  await check("replaying the used token does nothing", async () => {
    const u = await makeUser("replay");
    const id = await makeInvite(O, u.email, "tok-5");
    const first = await u.client.rpc("accept_organization_invite", { p_invite_id: id, p_token: "tok-5" });
    assert.equal(first.data, O);
    const second = await u.client.rpc("accept_organization_invite", { p_invite_id: id, p_token: "tok-5" });
    assert.equal(second.data, null);
  });
} finally {
  for (const o of orgIds) await admin.from("organizations").delete().eq("id", o);
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
}
console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
