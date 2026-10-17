// Local-only customer import concurrency / limits tests.
// Required env: LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL.
// Refuses non-loopback targets. Never reads .env.local.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL } = process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !LOCAL_SUPABASE_PUBLIC_KEY || !BASE_URL) {
  throw new Error("Missing local test configuration.");
}
for (const u of [LOCAL_SUPABASE_URL, BASE_URL]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(u).hostname)) {
    throw new Error("Refusing to run against a non-loopback target.");
  }
}

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, authOpts);
let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.message}`); }
};
const userIds = [];
const makeTenant = async (tag) => {
  const email = `closeflow-local-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  userIds.push(data.user.id);
  const ws = await admin.from("workspaces").insert({ name: `LOCAL-${tag}`, owner_id: data.user.id, plan: "free" }).select("id").single();
  assert.ifError(ws.error);
  assert.ifError((await admin.from("workspace_members").insert({ workspace_id: ws.data.id, user_id: data.user.id, role: "owner" })).error);
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, authOpts);
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(e2);
  return { userId: data.user.id, workspaceId: ws.data.id, token: s.session.access_token };
};
const call = (t, path, body) =>
  fetch(new URL(path, BASE_URL), {
    method: "POST",
    headers: { authorization: `Bearer ${t.token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const csvOf = (prefix, n) =>
  ["contact,company,revenue", ...Array.from({ length: n }, (_, i) => `${prefix}${i},Co ${prefix}${i},10`)].join("\r\n");
const stats = async (t) => {
  const leads = await admin.from("leads").select("id,status").eq("workspace_id", t.workspaceId);
  const custs = await admin.from("customers").select("id,lead_id").eq("workspace_id", t.workspaceId);
  const acts = await admin.from("activities").select("id,lead_id,type").eq("workspace_id", t.workspaceId);
  assert.ifError(leads.error); assert.ifError(custs.error); assert.ifError(acts.error);
  const leadIds = new Set(leads.data.map((l) => l.id));
  const created = acts.data.filter((a) => a.type === "created");
  return {
    leads: leads.data.length,
    customers: custs.data.length,
    created: created.length,
    customersWithoutLead: custs.data.filter((c) => !leadIds.has(c.lead_id)).length,
    leadsWithoutCustomer: leads.data.filter((l) => !custs.data.some((c) => c.lead_id === l.id)).length,
  };
};

try {
  const A = await makeTenant("cust-par");
  await check("parallel customer imports (distinct 30+30): all 60 saved, 1:1 lead/customer/activity", async () => {
    const [r1, r2] = await Promise.all([
      call(A, "/api/customers/import", { csv: csvOf("P", 30) }),
      call(A, "/api/customers/import", { csv: csvOf("Q", 30) }),
    ]);
    const [j1, j2] = [await r1.json(), await r2.json()];
    assert.equal(r1.status, 200, JSON.stringify(j1));
    assert.equal(r2.status, 200, JSON.stringify(j2));
    assert.equal(j1.inserted + j2.inserted, 60, JSON.stringify([j1, j2]));
    const s = await stats(A);
    assert.deepEqual(s, { leads: 60, customers: 60, created: 60, customersWithoutLead: 0, leadsWithoutCustomer: 0 });
  });

  await check("customer import at FREE active-lead capacity still works (customers are won, not active)", async () => {
    const B = await makeTenant("cust-cap");
    const rows = Array.from({ length: 50 }, (_, i) => ({
      workspace_id: B.workspaceId, user_id: B.userId, name: `Act${i}`, company: `ActCo${i}`, status: "new", value: 1,
    }));
    assert.ifError((await admin.from("leads").insert(rows)).error);
    const r = await call(B, "/api/customers/import", { csv: csvOf("K", 5) });
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.equal(j.inserted, 5, JSON.stringify(j));
    const s = await stats(B);
    assert.equal(s.customers, 5);
    assert.equal(s.leads, 55);
  });

  await check("parallel IDENTICAL customer imports (20 rows each) must not create duplicates", async () => {
    const C = await makeTenant("cust-dup");
    const csv = csvOf("D", 20);
    const rs = await Promise.all([call(C, "/api/customers/import", { csv }), call(C, "/api/customers/import", { csv })]);
    for (const r of rs) assert.equal(r.status, 200);
    const s = await stats(C);
    assert.equal(s.customers, 20, `expected 20 customers, got ${s.customers} (leads ${s.leads})`);
    assert.equal(s.leads, 20);
  });

  await check("sequential retry of same customer import adds nothing", async () => {
    const D = await makeTenant("cust-retry");
    const csv = csvOf("R", 10);
    const first = await (await call(D, "/api/customers/import", { csv })).json();
    const second = await (await call(D, "/api/customers/import", { csv })).json();
    assert.equal(first.inserted, 10);
    assert.equal(second.inserted, 0);
    assert.equal(second.skipped, 10);
    const s = await stats(D);
    assert.deepEqual(s, { leads: 10, customers: 10, created: 10, customersWithoutLead: 0, leadsWithoutCustomer: 0 });
  });
} finally {
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
}

console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
