// Local-only onboarding and account-deletion route tests (two synthetic tenants).
// Required env: LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY,
// LOCAL_JWT_SECRET, BASE_URL. Refuses non-loopback targets. Never reads .env.local.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, LOCAL_JWT_SECRET, BASE_URL } =
  process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !LOCAL_SUPABASE_PUBLIC_KEY || !LOCAL_JWT_SECRET || !BASE_URL) {
  throw new Error("Missing local test configuration.");
}
for (const u of [LOCAL_SUPABASE_URL, BASE_URL]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(u).hostname)) {
    throw new Error("Refusing to run against a non-loopback target.");
  }
}

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, authOpts);
const totp = (secretB32) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretB32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, "0");
};
// Real aal2 session: enroll a TOTP factor locally and verify it.
const upgradeToAal2 = async (u) => {
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, authOpts);
  const { error: e1 } = await client.auth.signInWithPassword({ email: u.email, password: u.password });
  assert.ifError(e1);
  const enr = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: randomUUID() });
  assert.ifError(enr.error);
  const ch = await client.auth.mfa.challenge({ factorId: enr.data.id });
  assert.ifError(ch.error);
  const ver = await client.auth.mfa.verify({ factorId: enr.data.id, challengeId: ch.data.id, code: totp(enr.data.totp.secret) });
  assert.ifError(ver.error);
  return ver.data.access_token;
};
const aal2Token = async (u) => u.aal2 ?? (u.aal2 = await upgradeToAal2(u));

let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.message}`); }
};
const known = [];
const makeUser = async (tag) => {
  const email = `closeflow-local-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  known.push(data.user.id);
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, authOpts);
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(e2);
  return { id: data.user.id, email, password, token: s.session.access_token, session: s.session };
};
const cookieHeader = (session) => {
  const name = `sb-${new URL(LOCAL_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const parts = value.match(/.{1,3000}/g);
  return parts.length === 1 ? `${name}=${value}` : parts.map((p, i) => `${name}.${i}=${p}`).join("; ");
};
const bearer = (token, body) => ({
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify(body),
});
const post = (path, init) => fetch(new URL(path, BASE_URL), init);
const mkWorkspace = async (owner, name) => {
  const ws = await admin.from("workspaces").insert({ name, owner_id: owner, plan: "free" }).select("id").single();
  assert.ifError(ws.error);
  assert.ifError((await admin.from("workspace_members").insert({ workspace_id: ws.data.id, user_id: owner, role: "owner" })).error);
  return ws.data.id;
};
const addLead = async (ws, user, name) => {
  const r = await admin.from("leads").insert({ workspace_id: ws, user_id: user, name, company: "X", status: "new" }).select("id").single();
  assert.ifError(r.error);
  return r.data.id;
};
const userExists = async (id) => !(await admin.auth.admin.getUserById(id)).error;

try {
  // ---------- Onboarding ----------
  const U = await makeUser("onb");
  const onb = (body, withCookie = true) =>
    post("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json", ...(withCookie ? { cookie: cookieHeader(U.session) } : {}) },
      body: JSON.stringify(body),
    });

  await check("onboarding: unauthenticated -> 401", async () => {
    assert.equal((await onb({ companyName: "X" }, false)).status, 401);
  });
  await check("onboarding: missing company -> 400", async () => {
    assert.equal((await onb({ companyName: "" })).status, 400);
  });
  await check("onboarding: lead mode without lead -> 400", async () => {
    assert.equal((await onb({ companyName: "Agentur", quickStartMode: "lead" })).status, 400);
  });
  await check("onboarding: partial failure (demo seed w/o Authorization) -> 500", async () => {
    const r = await onb({ companyName: "Agentur Eins", quickStartMode: "demo" });
    assert.equal(r.status, 500, await r.text());
  });
  await check("onboarding: retry after partial failure completes onboarding (metadata set)", async () => {
    const r = await onb({ companyName: "Agentur Eins", quickStartMode: "lead", leadName: "Erster", leadCompany: "Kunde" });
    assert.equal(r.status, 200, await r.text());
    const u = await admin.auth.admin.getUserById(U.id);
    assert.equal(u.data.user.user_metadata?.onboarding_completed, true, "onboarding_completed was never set");
  });
  await check("onboarding: exactly one workspace and member for user", async () => {
    const m = await admin.from("workspace_members").select("workspace_id").eq("user_id", U.id);
    assert.equal(m.data.length, 1);
  });

  // ---------- Account deletion ----------
  const O = await makeUser("owner");
  const M = await makeUser("member");
  const X = await makeUser("other");
  const wsShared = await mkWorkspace(O.id, "LOCAL-SHARED");
  assert.ifError((await admin.from("workspace_members").insert({ workspace_id: wsShared, user_id: M.id, role: "member" })).error);
  const wsX = await mkWorkspace(X.id, "LOCAL-OTHER");
  const leadO = await addLead(wsShared, O.id, "Owner Lead");
  const leadM = await addLead(wsShared, M.id, "Member Lead");
const evM = await admin.from("calendar_events").insert({ workspace_id: wsShared, user_id: M.id, title: "Shared meeting", scheduled_at: new Date().toISOString() }).select("id").single();
assert.ifError(evM.error);
  const leadX = await addLead(wsX, X.id, "Other Lead");
  const del = async (u, aal2, body) => post("/api/profile/delete", bearer(aal2 ? await aal2Token(u) : u.token, body));

  await check("delete: unauthenticated -> 401", async () => {
    assert.equal((await post("/api/profile/delete", { method: "POST", body: "{}" })).status, 401);
  });
  await check("delete: aal1 session -> 403 and user intact", async () => {
    assert.equal((await del(M, false, { confirmation: "DELETE" })).status, 403);
    assert.equal(await userExists(M.id), true);
  });
  await check("delete: wrong confirmation (aal2) -> 400 and user intact", async () => {
    assert.equal((await del(M, true, { confirmation: "delete me" })).status, 400);
    assert.equal(await userExists(M.id), true);
  });
  await check("delete member (aal2): own user removed, other tenant untouched", async () => {
    const r = await del(M, true, { confirmation: "DELETE" });
    assert.equal(r.status, 200, await r.text());
    assert.equal(await userExists(M.id), false);
    const lx = await admin.from("leads").select("id").eq("id", leadX);
    assert.equal(lx.data.length, 1, "unrelated tenant lead lost");
  });
  await check("delete member: shared workspace and OWNER's leads survive", async () => {
    const w = await admin.from("workspaces").select("id").eq("id", wsShared);
    assert.equal(w.data.length, 1, "shared workspace was destroyed by a member deleting their account");
    const lo = await admin.from("leads").select("id").eq("id", leadO);
    assert.equal(lo.data.length, 1, "owner's lead was lost");
  });
  await check("delete member: member's team-visible leads are retained for the workspace (reported if not)", async () => {
    const lm = await admin.from("leads").select("id").eq("id", leadM);
    assert.equal(lm.data.length, 1, "member's leads in the shared workspace were hard-deleted");
  });

  await check("delete member: calendar event in shared workspace retained and reassigned to owner", async () => {
    const ev = await admin.from("calendar_events").select("id,user_id").eq("id", evM.data.id);
    assert.equal(ev.data.length, 1, "calendar event was cascade-deleted");
    assert.equal(ev.data[0].user_id, O.id);
    const lm = await admin.from("leads").select("user_id").eq("id", leadM).single();
    assert.equal(lm.data.user_id, O.id);
  });

  const M2 = await makeUser("member2");
  assert.ifError((await admin.from("workspace_members").insert({ workspace_id: wsShared, user_id: M2.id, role: "member" })).error);
  const leadM2 = await addLead(wsShared, M2.id, "Member2 Lead");
  await check("delete OWNER (aal2): shared workspace with other members must not be silently destroyed", async () => {
    const r = await del(O, true, { confirmation: "DELETE" });
    const w = await admin.from("workspaces").select("id").eq("id", wsShared);
    const l2 = await admin.from("leads").select("id").eq("id", leadM2);
    assert.ok(
      r.status === 409 && w.data.length === 1 && l2.data.length === 1,
      `status ${r.status}; workspace survives=${w.data.length === 1}; remaining member's lead survives=${l2.data.length === 1}`,
    );
    assert.equal(await userExists(O.id), true, "owner account must remain after refused deletion");
  });

  await check("delete solo owner (aal2): own workspace and leads removed, user removed", async () => {
    const S = await makeUser("solo");
    const wsS = await mkWorkspace(S.id, "LOCAL-SOLO");
    const leadS = await addLead(wsS, S.id, "Solo Lead");
    const r = await del(S, true, { confirmation: "DELETE" });
    assert.equal(r.status, 200, await r.text());
    assert.equal(await userExists(S.id), false);
    assert.equal((await admin.from("leads").select("id").eq("id", leadS)).data.length, 0);
    assert.equal((await admin.from("workspaces").select("id").eq("id", wsS)).data.length, 0);
    assert.equal((await admin.from("leads").select("id").eq("id", leadX)).data.length, 1, "other tenant lead lost");
  });
} finally {
  for (const id of known) await admin.auth.admin.deleteUser(id).catch(() => {});
  await admin.from("workspaces").delete().like("name", "LOCAL-%");
  await admin.from("workspaces").delete().eq("name", "Agentur Eins");
}
console.log(failures ? `FAILED: ${failures}` : "ALL PASS");
process.exit(failures ? 1 : 0);
