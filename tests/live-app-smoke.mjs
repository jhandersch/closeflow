// Live smoke test of the deployed app (HTTP routes) with throwaway, marked fixtures.
// Covers: account deletion route (aal2), workspace invite/accept routes + role rules,
// Stripe checkout session creation (Stripe TEST mode only), webhook stale-event guard.
// Required env: CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES=YES, BASE_URL (https), CLOSEFLOW_LIVE_HOST (must equal BASE_URL host).
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") throw new Error("Refusing production DB fixture writes without explicit authorization.");
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const e = process.env;
const url = e.NEXT_PUBLIC_SUPABASE_URL, pub = e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, svc = e.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = e.STRIPE_SECRET_KEY, whSecret = e.STRIPE_WEBHOOK_SECRET, proPrice = e.STRIPE_PRO_PRICE_ID, bizPrice = e.STRIPE_BUSINESS_PRICE_ID;
const BASE_URL = e.BASE_URL;
if (![url, pub, svc, stripeKey, whSecret, proPrice, bizPrice, BASE_URL].every(Boolean)) throw new Error("Missing configuration.");
if (!stripeKey.startsWith("sk_test_")) throw new Error("Refusing: Stripe is not in test mode.");
if (!new URL(url).hostname.endsWith(".supabase.co")) throw new Error("Unexpected Supabase host.");
const base = new URL(BASE_URL);
if (base.protocol !== "https:" || base.hostname !== e.CLOSEFLOW_LIVE_HOST) throw new Error("BASE_URL host must equal CLOSEFLOW_LIVE_HOST.");

const o = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, svc, o);
const stripe = new Stripe(stripeKey, {});
const marker = `CLOSEFLOW-LIVE-SMOKE-${randomUUID()}`;
const userIds = [], workspaceIds = [];
let failures = 0;
const check = async (n, f) => { try { await f(); console.log(`PASS ${n}`); } catch (err) { failures++; console.log(`FAIL ${n}: ${err.message}`); } };
const info = (m) => console.log(`INFO ${m}`);

const totp = (secretB32) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretB32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const off = h[h.length - 1] & 0xf;
  return String((((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3]) % 1000000).padStart(6, "0");
};
const makeUser = async (tag, mfa = true) => {
  const email = `closeflow-live-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { closeflow_test_marker: marker } });
  assert.ifError(error);
  userIds.push(data.user.id);
  const client = createClient(url, pub, o);
  const s = await client.auth.signInWithPassword({ email, password });
  assert.ifError(s.error);
  const u = { id: data.user.id, email, aal1: s.data.session.access_token, aal2: null };
  if (mfa) {
    const enr = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: randomUUID() });
    assert.ifError(enr.error);
    const ch = await client.auth.mfa.challenge({ factorId: enr.data.id });
    const ver = await client.auth.mfa.verify({ factorId: enr.data.id, challengeId: ch.data.id, code: totp(enr.data.totp.secret) });
    assert.ifError(ver.error);
    u.aal2 = ver.data.access_token;
  }
  return u;
};
const asUser = (token) => createClient(url, pub, { ...o, global: { headers: { authorization: `Bearer ${token}` } } });
const makeWorkspace = async (tag, owner, plan = "free") => {
  const ws = await admin.from("workspaces").insert({ name: `${marker}-${tag}`, owner_id: owner.id, plan }).select("id").single();
  assert.ifError(ws.error);
  workspaceIds.push(ws.data.id);
  assert.ifError((await admin.from("workspace_members").insert({ workspace_id: ws.data.id, user_id: owner.id, role: "owner" })).error);
  return ws.data.id;
};
const addMember = async (W, u, role) => assert.ifError((await admin.from("workspace_members").insert({ workspace_id: W, user_id: u.id, role })).error);
const proSubscription = async (W) =>
  assert.ifError((await admin.from("subscriptions").insert({
    workspace_id: W, stripe_customer_id: `cus_${randomUUID().replaceAll("-", "")}`, stripe_subscription_id: `sub_${randomUUID().replaceAll("-", "")}`,
    plan: "pro", status: "active", current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
  })).error);
const call = (path, token, body, headers = {}) =>
  fetch(new URL(path, base), { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body ?? {}) });
const exists = async (table, col, val) => (await admin.from(table).select("*", { count: "exact", head: true }).eq(col, val)).count;
const inviteRows = async (W, email) => (await admin.from("workspace_invites").select("id,role").eq("workspace_id", W).eq("email", email)).data ?? [];
const userExists = async (id) => Boolean((await admin.auth.admin.getUserById(id)).data.user);

try {
  // ---------- Invite / accept routes ----------
  const O = await makeUser("owner"), AD = await makeUser("admin"), SM = await makeUser("salesmgr"), MEM = await makeUser("member");
  const I = await makeUser("invitee", false), X = await makeUser("stranger", false);
  const W = await makeWorkspace("team", O, "pro");
  await proSubscription(W);
  await addMember(W, AD, "admin");
  await addMember(W, SM, "sales_manager");
  await addMember(W, MEM, "sales_rep");
  const H = { "x-closeflow-workspace-id": W };

  await check("invite route: unauthenticated -> 401; aal1 owner -> 403; plain member (aal2) -> 403", async () => {
    assert.equal((await call("/api/workspaces/invite", null, { workspace_id: W, email: "a@example.invalid" })).status, 401);
    assert.equal((await call("/api/workspaces/invite", O.aal1, { workspace_id: W, email: "a@example.invalid" })).status, 403);
    assert.equal((await call("/api/workspaces/invite", MEM.aal2, { workspace_id: W, email: "a@example.invalid" })).status, 403);
    assert.equal((await inviteRows(W, "a@example.invalid")).length, 0);
  });
  await check("invite route: sales_manager cannot invite admin/owner (no invite row created)", async () => {
    for (const role of ["admin", "owner"]) {
      const email = `sm-${role}@example.invalid`;
      const r = await call("/api/workspaces/invite", SM.aal2, { workspace_id: W, email, role });
      assert.notEqual(r.status, 200);
      assert.equal((await inviteRows(W, email)).length, 0);
    }
  });
  await check("invite route: admin cannot invite someone as OWNER (privilege escalation)", async () => {
    const email = "ad-owner@example.invalid";
    const r = await call("/api/workspaces/invite", AD.aal2, { workspace_id: W, email, role: "owner" });
    const rows = await inviteRows(W, email);
    assert.ok(r.status !== 200 && rows.length === 0, `status ${r.status}, invite rows with role: ${rows.map((x) => x.role)}`);
  });
  await check("invite route: owner invite -> either 200 with row, or email failure (500) with the invite rolled back", async () => {
    const r = await call("/api/workspaces/invite", O.aal2, { workspace_id: W, email: I.email, role: "member" });
    const rows = await inviteRows(W, I.email);
    if (r.status === 200) { info("invite email was accepted by the mail provider"); assert.equal(rows.length, 1); }
    else { info(`invite email failed as expected without a verified domain (status ${r.status})`); assert.equal(r.status, 500); assert.equal(rows.length, 0, "invite not rolled back after mail failure"); }
    await admin.from("workspace_invites").delete().eq("workspace_id", W).eq("email", I.email);
  });
  const mkInvite = async (email, token, role = "member", expires = new Date(Date.now() + 864e5).toISOString()) =>
    assert.ifError((await admin.from("workspace_invites").insert({ workspace_id: W, email, role, token, expires_at: expires })).error);
  await check("accept route: unauthenticated 401, missing token 400, unknown token 404", async () => {
    assert.equal((await call("/api/workspaces/invite/accept", null, { token: "x" })).status, 401);
    assert.equal((await call("/api/workspaces/invite/accept", I.aal1, {})).status, 400);
    assert.equal((await call("/api/workspaces/invite/accept", I.aal1, { token: "does-not-exist" })).status, 404);
  });
  await check("accept route: right email joins once with the invited role; replay -> 404", async () => {
    const tok = `tok-${randomUUID()}`;
    await mkInvite(I.email, tok);
    const ok = await call("/api/workspaces/invite/accept", I.aal1, { token: tok });
    assert.equal(ok.status, 200, await ok.text());
    const mem = await admin.from("workspace_members").select("role").eq("workspace_id", W).eq("user_id", I.id);
    assert.deepEqual(mem.data.map((x) => x.role), ["member"]);
    assert.equal((await call("/api/workspaces/invite/accept", I.aal1, { token: tok })).status, 404);
  });
  await check("accept route: wrong-email user is refused (403) and gets no membership", async () => {
    const tok = `tok-${randomUUID()}`;
    await mkInvite(`other-${randomUUID()}@example.invalid`, tok);
    const bad = await call("/api/workspaces/invite/accept", X.aal1, { token: tok });
    assert.equal(bad.status, 403, String(bad.status));
    assert.equal((await admin.from("workspace_members").select("id").eq("workspace_id", W).eq("user_id", X.id)).data.length, 0);
  });
  await check("accept route: expired invite is refused (410) and gives no membership", async () => {
    const tok = `tok-${randomUUID()}`;
    await mkInvite(X.email, tok, "member", new Date(Date.now() - 3600e3).toISOString());
    const r = await call("/api/workspaces/invite/accept", X.aal1, { token: tok });
    assert.equal(r.status, 410, String(r.status));
    assert.equal((await admin.from("workspace_members").select("id").eq("workspace_id", W).eq("user_id", X.id)).data.length, 0);
  });

  // ---------- Stripe checkout (test mode) ----------
  await check("create-checkout (Stripe TEST): owner gets a checkout.stripe.com URL; member -> 403", async () => {
    const r = await call("/api/stripe/create-checkout", O.aal2, { plan: "business" }, H);
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.match(j.checkoutUrl, /^https:\/\/checkout\.stripe\.com\//);
    assert.equal((await call("/api/stripe/create-checkout", MEM.aal2, { plan: "pro" }, H)).status, 403);
  });
  await check("create-portal with unknown Stripe customer -> JSON error, never an empty/500 crash", async () => {
    const r = await call("/api/stripe/create-portal", O.aal2, {}, H);
    const t = await r.text();
    assert.notEqual(r.status, 200);
    assert.doesNotThrow(() => JSON.parse(t), `non-JSON body (status ${r.status}): ${t.slice(0, 80)}`);
  });

  // ---------- Account deletion route ----------
  const D = await makeUser("solo");
  const DW = await makeWorkspace("solo", D);
  const lead = await admin.from("leads").insert({ workspace_id: DW, user_id: D.id, name: `${marker}-lead`, status: "new" }).select("id").single();
  assert.ifError(lead.error);
  await check("delete route: unauth 401, aal1 403, wrong confirmation 400 (nothing deleted)", async () => {
    assert.equal((await call("/api/profile/delete", null, { confirmation: "DELETE" })).status, 401);
    assert.equal((await call("/api/profile/delete", D.aal1, { confirmation: "DELETE" })).status, 403);
    assert.equal((await call("/api/profile/delete", D.aal2, { confirmation: "nope" })).status, 400);
    assert.ok(await userExists(D.id));
    assert.equal(await exists("workspaces", "id", DW), 1);
  });
  await check("delete route: solo owner (aal2) -> 200, user, workspace and leads removed", async () => {
    const r = await call("/api/profile/delete", D.aal2, { confirmation: "DELETE" });
    assert.equal(r.status, 200, await r.text());
    assert.equal(await userExists(D.id), false);
    assert.equal(await exists("workspaces", "id", DW), 0);
    assert.equal(await exists("leads", "id", lead.data.id), 0);
  });
  await check("delete route: owner of a team workspace -> 409, nothing deleted", async () => {
    const r = await call("/api/profile/delete", O.aal2, { confirmation: "DELETE" });
    assert.equal(r.status, 409, await r.text());
    assert.ok(await userExists(O.id));
    assert.equal(await exists("workspaces", "id", W), 1);
  });
  await check("delete route: team member (aal2) -> 200, membership gone, their lead handed to the owner", async () => {
    const l = await admin.from("leads").insert({ workspace_id: W, user_id: MEM.id, name: `${marker}-memlead`, status: "new" }).select("id").single();
    assert.ifError(l.error);
    const r = await call("/api/profile/delete", MEM.aal2, { confirmation: "DELETE" });
    assert.equal(r.status, 200, await r.text());
    assert.equal(await userExists(MEM.id), false);
    assert.equal((await admin.from("workspace_members").select("id").eq("workspace_id", W).eq("user_id", MEM.id)).data.length, 0);
    const after = await admin.from("leads").select("user_id").eq("id", l.data.id).maybeSingle();
    assert.equal(after.data?.user_id, O.id, `lead state: ${JSON.stringify(after.data)}`);
  });

  // ---------- Webhook stale-event guard (signed locally, live endpoint) ----------
  const S = await makeUser("stale", false);
  const SW = await makeWorkspace("stale", S);
  const cus = `cus_${randomUUID().replaceAll("-", "")}`, sub = `sub_${randomUUID().replaceAll("-", "")}`;
  const t0 = Math.floor(Date.now() / 1000);
  const send = (type, object, created) => {
    const evt = { id: `evt_${randomUUID().replaceAll("-", "")}`, object: "event", api_version: "2025-02-24.acacia", created, data: { object }, livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, type };
    const payload = JSON.stringify(evt);
    return fetch(new URL("/api/stripe/webhook", base), { method: "POST", headers: { "content-type": "application/json", "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: whSecret }) }, body: payload });
  };
  const subObj = (status, price) => ({ id: sub, object: "subscription", customer: cus, status, cancel_at: null, items: { object: "list", has_more: false, url: "/", data: [{ id: `si_${randomUUID().replaceAll("-", "")}`, object: "subscription_item", current_period_end: t0 + 30 * 86400, price: { id: price, object: "price" } }] } });
  const state = async () => (await admin.from("subscriptions").select("status,plan").eq("workspace_id", SW).maybeSingle()).data;
  await check("webhook (live): stale 'updated' after a newer 'deleted' does not reactivate; a newer one does", async () => {
    assert.equal((await send("checkout.session.completed", { id: `cs_test_${randomUUID().replaceAll("-", "")}`, object: "checkout.session", mode: "subscription", payment_status: "paid", customer: cus, subscription: sub, metadata: { workspace_id: SW, plan: "pro" } }, t0)).status, 200);
    assert.equal((await state())?.status, "active");
    assert.equal((await send("customer.subscription.deleted", subObj("canceled", proPrice), t0 + 20)).status, 200);
    assert.equal((await state())?.status, "canceled");
    assert.equal((await send("customer.subscription.updated", subObj("active", proPrice), t0 + 5)).status, 200);
    assert.equal((await state())?.status, "canceled", "stale event reactivated a canceled subscription");
    assert.equal((await send("customer.subscription.updated", subObj("active", bizPrice), t0 + 40)).status, 200);
    const s = await state();
    assert.equal(s?.status, "active");
    assert.equal(s?.plan, "business");
  });
} finally {
  for (const W of workspaceIds) await admin.from("workspaces").delete().eq("id", W);
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  const left = await admin.from("workspaces").select("id", { count: "exact", head: true }).like("name", `${marker}%`);
  let users = 0;
  for (const id of userIds) if (await userExists(id)) users++;
  console.log(`CLEANUP leftover workspaces: ${left.count}, users: ${users}`);
}
console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
