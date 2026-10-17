// Smoke test of a Vercel PREVIEW deployment against the configured Supabase project.
// Creates two throwaway users/workspaces (example.invalid), exercises the app API, and removes them via
// delete_account_data. Production Supabase data is only touched by these marked fixtures.
// Required env: CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES=YES, PREVIEW_URL, VERCEL_BYPASS (protection bypass secret).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") throw new Error("Refusing production DB fixture writes without explicit authorization.");
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub, SUPABASE_SERVICE_ROLE_KEY: svc, PREVIEW_URL, VERCEL_BYPASS } = process.env;
if (!url || !pub || !svc || !PREVIEW_URL || !VERCEL_BYPASS) throw new Error("Missing configuration.");
if (!new URL(url).hostname.endsWith(".supabase.co")) throw new Error("Unexpected Supabase host.");
const host = new URL(PREVIEW_URL).hostname;
if (!host.endsWith(".vercel.app") || host === "closeflow-green.vercel.app") throw new Error("PREVIEW_URL must be a preview deployment URL, not the production alias.");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, svc, opts);
let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`PASS ${name}`); } catch (e) { failures++; console.log(`FAIL ${name}: ${e.message}`); }
};
const tenants = [];
const makeTenant = async (tag) => {
  const email = `closeflow-preview-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  const t = { userId: data.user.id };
  tenants.push(t);
  const ws = await admin.from("workspaces").insert({ name: `PREVIEW-${tag}`, owner_id: t.userId, plan: "free" }).select("id").single();
  assert.ifError(ws.error);
  t.workspaceId = ws.data.id;
  assert.ifError((await admin.from("workspace_members").insert({ workspace_id: t.workspaceId, user_id: t.userId, role: "owner" })).error);
  const client = createClient(url, pub, opts);
  const s = await client.auth.signInWithPassword({ email, password });
  assert.ifError(s.error);
  t.token = s.data.session.access_token;
  return t;
};
const call = (t, method, path, body) =>
  fetch(new URL(path, PREVIEW_URL), {
    method,
    headers: { "x-vercel-protection-bypass": VERCEL_BYPASS, "content-type": "application/json", ...(t ? { authorization: `Bearer ${t.token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const count = async (table, t) => {
  const r = await admin.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", t.workspaceId);
  assert.ifError(r.error);
  return r.count;
};

const leadsCsv = ["name,company,status,value", "Alice Muster,Acme GmbH,new,1000", "Bob Beispiel,Beta AG,contacted,500"].join("\r\n");
const custCsv = ["contact,company,email", ...Array.from({ length: 8 }, (_, i) => `Kunde ${i},Firma ${i},k${i}@example.invalid`)].join("\r\n");

try {
  await check("preview serves /login", async () => assert.equal((await call(null, "GET", "/login")).status, 200));
  for (const [m, p] of [["GET", "/api/leads/export"], ["POST", "/api/leads/import"], ["POST", "/api/customers/import"], ["POST", "/api/profile/delete"], ["POST", "/api/stripe/create-checkout"]]) {
    await check(`${m} ${p} unauthenticated -> 401`, async () => assert.equal((await call(null, m, p, m === "POST" ? {} : undefined)).status, 401));
  }
  await check("stripe webhook without signature is rejected (500 'not configured' is expected: Preview has no Stripe vars)", async () => {
    const r = await call(null, "POST", "/api/stripe/webhook", {});
    assert.ok([400, 401, 500].includes(r.status), String(r.status));
    assert.notEqual(r.status, 200);
  });

  const A = await makeTenant("a");
  const B = await makeTenant("b");

  await check("lead import: 2 inserted, retry adds nothing, B isolated", async () => {
    const r1 = await call(A, "POST", "/api/leads/import", { csv: leadsCsv });
    const j1 = await r1.json();
    assert.equal(r1.status, 200, JSON.stringify(j1));
    assert.equal(j1.inserted, 2, JSON.stringify(j1));
    const j2 = await (await call(A, "POST", "/api/leads/import", { csv: leadsCsv })).json();
    assert.equal(j2.inserted, 0, JSON.stringify(j2));
    assert.equal(await count("leads", A), 2);
    assert.equal(await count("leads", B), 0);
  });

  await check("lead export: only own workspace rows", async () => {
    const ra = await call(A, "GET", "/api/leads/export");
    assert.equal(ra.status, 200);
    const ta = await ra.text();
    assert.ok(ta.includes("Alice Muster"));
    const rb = await call(B, "GET", "/api/leads/export");
    assert.ok(!(await rb.text()).includes("Alice Muster"));
  });

  await check("customer import: 3 parallel identical imports -> exactly 8 customers (import lock)", async () => {
    const rs = await Promise.all([1, 2, 3].map(() => call(B, "POST", "/api/customers/import", { csv: custCsv })));
    for (const r of rs) assert.ok([200, 409].includes(r.status), String(r.status));
    assert.equal(await count("customers", B), 8);
  });

  await check("cross-tenant: A cannot select B customers with its own token", async () => {
    const c = createClient(url, pub, { ...opts, global: { headers: { authorization: `Bearer ${A.token}` } } });
    const r = await c.from("customers").select("id").eq("workspace_id", B.workspaceId);
    assert.ok(!r.error && r.data.length === 0);
  });

  await check("lock table not readable by users", async () => {
    const c = createClient(url, pub, { ...opts, global: { headers: { authorization: `Bearer ${A.token}` } } });
    const r = await c.from("workspace_import_locks").select("*");
    assert.ok(r.error || r.data.length === 0);
  });
} finally {
  for (const t of tenants) {
    const r = await admin.rpc("delete_account_data", { p_user_id: t.userId });
    if (r.error) console.log(`CLEANUP delete_account_data failed: ${r.error.message}`);
    await admin.auth.admin.deleteUser(t.userId).catch(() => {});
    const left = await admin.from("workspaces").select("id", { count: "exact", head: true }).eq("id", t.workspaceId);
    console.log(`CLEANUP workspace leftover: ${left.count}`);
  }
}
console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
