// Local-only Stripe billing route authorization tests (paths that never reach Stripe).
// Server must run WITHOUT STRIPE_PRO_PRICE_ID / STRIPE_BUSINESS_PRICE_ID / STRIPE_SECRET_KEY real values.
// Required env: LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL } = process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !LOCAL_SUPABASE_PUBLIC_KEY || !BASE_URL) throw new Error("Missing local test configuration.");
for (const u of [LOCAL_SUPABASE_URL, BASE_URL]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(u).hostname)) throw new Error("Refusing to run against a non-loopback target.");
}
const o = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, o);
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
let failures = 0;
const check = async (n, f) => { try { await f(); console.log(`PASS ${n}`); } catch (e) { failures++; console.log(`FAIL ${n}: ${e.message}`); } };
const ids = [];
const makeUser = async (tag) => {
  const email = `closeflow-local-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error); ids.push(data.user.id);
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, o);
  const s = await client.auth.signInWithPassword({ email, password });
  assert.ifError(s.error);
  const enr = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: randomUUID() });
  assert.ifError(enr.error);
  const ch = await client.auth.mfa.challenge({ factorId: enr.data.id });
  const ver = await client.auth.mfa.verify({ factorId: enr.data.id, challengeId: ch.data.id, code: totp(enr.data.totp.secret) });
  assert.ifError(ver.error);
  return { id: data.user.id, aal1: s.data.session.access_token, aal2: ver.data.access_token };
};
const post = (path, token, body, headers = {}) =>
  fetch(new URL(path, BASE_URL), { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body ?? {}) });

try {
  const owner = await makeUser("bill-owner");
  const member = await makeUser("bill-member");
  const outsider = await makeUser("bill-out");
  const ws = await admin.from("workspaces").insert({ name: "LOCAL-bill", owner_id: owner.id, plan: "free" }).select("id").single();
  assert.ifError(ws.error);
  const W = ws.data.id;
  assert.ifError((await admin.from("workspace_members").insert([{ workspace_id: W, user_id: owner.id, role: "owner" }, { workspace_id: W, user_id: member.id, role: "sales_rep" }])).error);
  await admin.from("subscriptions").delete().eq("workspace_id", W);

  for (const path of ["/api/stripe/create-checkout", "/api/stripe/change-plan", "/api/stripe/create-portal"]) {
    await check(`${path}: unauthenticated -> 401`, async () => assert.equal((await post(path, null, { plan: "pro" })).status, 401));
    await check(`${path}: aal1 session -> 403`, async () => assert.equal((await post(path, owner.aal1, { plan: "pro" })).status, 403));
    await check(`${path}: non-owner member (aal2) -> 403`, async () => {
      const r = await post(path, member.aal2, { plan: "pro" }, { "x-closeflow-workspace-id": W });
      assert.equal(r.status, 403, await r.text());
    });
    await check(`${path}: foreign workspace id header cannot be used by an outsider`, async () => {
      const r = await post(path, outsider.aal2, { plan: "pro" }, { "x-closeflow-workspace-id": W });
      const t = await r.text();
      assert.ok(![200].includes(r.status) || !/checkoutUrl":"http|url":"http/.test(t), t);
      assert.ok(!t.includes(W), "response must not reveal the foreign workspace id");
    });
  }
  await check("change-plan: invalid plan -> 400 (owner, aal2)", async () => assert.equal((await post("/api/stripe/change-plan", owner.aal2, { plan: "enterprise" }, { "x-closeflow-workspace-id": W })).status, 400));
  await check("change-plan: owner without Stripe subscription -> 400, plan unchanged", async () => {
    const r = await post("/api/stripe/change-plan", owner.aal2, { plan: "business" }, { "x-closeflow-workspace-id": W });
    assert.ok([400, 500].includes(r.status), String(r.status));
    assert.equal((await admin.from("workspaces").select("plan").eq("id", W).single()).data.plan, "free");
  });
  await check("create-checkout: Stripe failure (dummy key, configured price) -> JSON 502, not an empty 500", async () => {
    const r = await post("/api/stripe/create-checkout", owner.aal2, { plan: "pro" }, { "x-closeflow-workspace-id": W });
    const j = await r.json();
    assert.ok([200, 502].includes(r.status), String(r.status));
    if (r.status === 502) assert.ok(j.error);
    else assert.equal(j.checkoutUrl, null);
  });
} finally {
  for (const id of ids) await admin.auth.admin.deleteUser(id).catch(() => {});
}
console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
