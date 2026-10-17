// Local-only Stripe webhook integration test (signed with a local test secret).
// Server must run with STRIPE_WEBHOOK_SECRET=whsec_local_test, STRIPE_PRO_PRICE_ID=price_local_pro,
// STRIPE_BUSINESS_PRICE_ID=price_local_business. Never contacts Stripe.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, BASE_URL } = process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !BASE_URL) throw new Error("Missing local test configuration.");
for (const u of [LOCAL_SUPABASE_URL, BASE_URL]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(u).hostname)) throw new Error("Refusing to run against a non-loopback target.");
}
const SECRET = "whsec_local_test";
const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const stripe = new Stripe("sk_test_dummy", {});
let failures = 0;
const check = async (n, f) => { try { await f(); console.log(`PASS ${n}`); } catch (e) { failures++; console.log(`FAIL ${n}: ${e.message}`); } };
const userIds = [];
const makeWs = async (tag) => {
  const u = await admin.auth.admin.createUser({ email: `closeflow-local-${tag}-${randomUUID()}@example.invalid`, password: `Cf_${randomUUID()}_R8!`, email_confirm: true });
  assert.ifError(u.error); userIds.push(u.data.user.id);
  const ws = await admin.from("workspaces").insert({ name: `LOCAL-${tag}`, owner_id: u.data.user.id, plan: "free" }).select("id").single();
  assert.ifError(ws.error);
  return ws.data.id;
};
const post = (event, { sign = true, secret = SECRET, header } = {}) => {
  const payload = JSON.stringify(event);
  const h = {};
  if (header !== undefined) h["stripe-signature"] = header;
  else if (sign) h["stripe-signature"] = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return fetch(new URL("/api/stripe/webhook", BASE_URL), { method: "POST", headers: { "content-type": "application/json", ...h }, body: payload });
};
const evt = (type, object) => ({ id: `evt_${randomUUID()}`, object: "event", api_version: "2025-01-01", created: Math.floor(Date.now() / 1000), type, data: { object }, livemode: false });
const sub = (id, customer, price, extra = {}) => ({ id, object: "subscription", customer, status: "active", items: { object: "list", data: [{ price: { id: price }, current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30 }] }, ...extra });
const row = async (ws) => (await admin.from("subscriptions").select("*").eq("workspace_id", ws)).data || [];

try {
  const A = await makeWs("stripeA");
  const B = await makeWs("stripeB");
  const cusA = `cus_${randomUUID()}`, subA = `sub_${randomUUID()}`;
  const cusB = `cus_${randomUUID()}`, subB = `sub_${randomUUID()}`;

  await check("missing signature -> 400; wrong secret -> 400; nothing written", async () => {
    const e = evt("checkout.session.completed", { id: "cs_1", object: "checkout.session", customer: cusA, subscription: subA, metadata: { workspace_id: A, plan: "pro" } });
    assert.equal((await post(e, { sign: false })).status, 400);
    assert.equal((await post(e, { secret: "whsec_wrong" })).status, 400);
    assert.equal((await post(e, { header: "t=1,v1=deadbeef" })).status, 400);
    assert.equal((await row(A)).length, 0);
  });

  await check("tampered body (valid signature for different payload) -> 400", async () => {
    const e = evt("checkout.session.completed", { id: "cs_2", object: "checkout.session", customer: cusA, subscription: subA, metadata: { workspace_id: A, plan: "business" } });
    const other = JSON.stringify({ ...e, id: "evt_other" });
    const header = stripe.webhooks.generateTestHeaderString({ payload: other, secret: SECRET });
    const r = await fetch(new URL("/api/stripe/webhook", BASE_URL), { method: "POST", headers: { "stripe-signature": header, "content-type": "application/json" }, body: JSON.stringify(e) });
    assert.equal(r.status, 400);
    assert.equal((await row(A)).length, 0);
  });

  await check("checkout.session.completed -> workspace A active pro; B untouched; replay creates no duplicate", async () => {
    const e = evt("checkout.session.completed", { id: "cs_3", object: "checkout.session", customer: cusA, subscription: subA, metadata: { workspace_id: A, plan: "pro" } });
    assert.equal((await post(e)).status, 200);
    assert.equal((await post(e)).status, 200);
    const a = await row(A);
    assert.equal(a.length, 1);
    assert.equal(a[0].plan, "pro");
    assert.equal(a[0].status, "active");
    assert.equal((await row(B)).length, 0);
  });

  await check("subscription.updated with known business price upgrades only the matching subscription", async () => {
    assert.equal((await post(evt("checkout.session.completed", { id: "cs_4", object: "checkout.session", customer: cusB, subscription: subB, metadata: { workspace_id: B, plan: "pro" } }))).status, 200);
    assert.equal((await post(evt("customer.subscription.updated", sub(subA, cusA, "price_local_business")))).status, 200);
    assert.equal((await row(A))[0].plan, "business");
    assert.equal((await row(B))[0].plan, "pro", "other tenant must not change");
  });

  await check("subscription.deleted -> canceled for A only", async () => {
    assert.equal((await post(evt("customer.subscription.deleted", sub(subA, cusA, "price_local_business", { status: "canceled" })))).status, 200);
    assert.equal((await row(A))[0].status, "canceled");
    assert.equal((await row(B))[0].status, "active");
  });

  await check("unknown price id downgrades to free (does not grant a paid plan)", async () => {
    assert.equal((await post(evt("customer.subscription.updated", sub(subB, cusB, "price_unknown")))).status, 200);
    assert.equal((await row(B))[0].plan, "free");
  });

  await check("out-of-order: stale 'updated' after 'deleted' must not reactivate (ORDERING)", async () => {
    const stale = evt("customer.subscription.updated", sub(subA, cusA, "price_local_business"));
    stale.created = Math.floor(Date.now() / 1000) - 3600;
    assert.equal((await post(stale)).status, 200);
    assert.equal((await row(A))[0].status, "canceled", "stale event reactivated a canceled subscription");
  });

  await check("checkout.session.completed without workspace_id metadata writes nothing", async () => {
    const before = (await admin.from("subscriptions").select("id")).data.length;
    assert.equal((await post(evt("checkout.session.completed", { id: "cs_5", object: "checkout.session", customer: "cus_x", subscription: "sub_x", metadata: {} }))).status, 200);
    assert.equal((await admin.from("subscriptions").select("id")).data.length, before);
  });
} finally {
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
}
console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
