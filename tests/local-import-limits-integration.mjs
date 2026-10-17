// Local-only import quota / concurrency / XLSX tests.
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
const call = (t, method, path, body) =>
  fetch(new URL(path, BASE_URL), {
    method,
    headers: { authorization: `Bearer ${t.token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const csvOf = (prefix, n, status = "new") =>
  ["name,company,status,value", ...Array.from({ length: n }, (_, i) => `${prefix}${i},Co ${prefix}${i},${status},1`)].join("\r\n");
const stats = async (t) => {
  const leads = await admin.from("leads").select("id,status,deleted_at").eq("workspace_id", t.workspaceId);
  const acts = await admin.from("activities").select("id,lead_id,type").eq("workspace_id", t.workspaceId);
  assert.ifError(leads.error); assert.ifError(acts.error);
  const active = leads.data.filter((l) => !l.deleted_at && ["new", "contacted", "proposal"].includes(l.status)).length;
  const ids = new Set(leads.data.map((l) => l.id));
  const created = acts.data.filter((a) => a.type === "created");
  return { total: leads.data.length, active, created: created.length, orphanActs: created.filter((a) => !ids.has(a.lead_id)).length };
};

try {
  const A = await makeTenant("quota");
  await check("import quota: 55 active leads on FREE -> exactly 50 inserted, 5 reported as limit-skipped", async () => {
    const r = await call(A, "POST", "/api/leads/import", { csv: csvOf("Q", 55) });
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.equal(j.inserted, 50, JSON.stringify({ inserted: j.inserted, skipped: j.skipped }));
    assert.equal(j.skipped, 5);
    assert.ok(j.issues.some((i) => /limit/i.test(i.reason)));
    const s = await stats(A);
    assert.equal(s.active, 50);
    assert.equal(s.created, 50);
  });
  await check("import quota: at capacity, further active import adds nothing; won/lost status still allowed", async () => {
    const r = await call(A, "POST", "/api/leads/import", { csv: csvOf("W", 3, "won") + "\r\n" + "Extra,Co Extra,new,1" });
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    const s = await stats(A);
    assert.equal(s.active, 50, "active lead cap exceeded");
    assert.equal(s.total, 53, `expected 3 won leads added, got total ${s.total}`);
  });

  const C = await makeTenant("race");
  await check("concurrent imports (30+30 distinct, cap 50): cap never exceeded, no orphan or missing activities", async () => {
    const [r1, r2] = await Promise.all([
      call(C, "POST", "/api/leads/import", { csv: csvOf("R1-", 30) }),
      call(C, "POST", "/api/leads/import", { csv: csvOf("R2-", 30) }),
    ]);
    const [j1, j2] = [await r1.json(), await r2.json()];
    assert.ok(r1.status === 200 && r2.status === 200, `${r1.status}/${r2.status} ${JSON.stringify([j1, j2]).slice(0, 300)}`);
    const s = await stats(C);
    assert.ok(s.active <= 50, `active ${s.active} > 50`);
    assert.equal(s.created, s.active, `activities ${s.created} != leads ${s.active}`);
    assert.equal(s.orphanActs, 0);
    assert.equal(j1.inserted + j2.inserted, s.total, "reported inserted does not match stored leads");
  });
  await check("concurrent identical imports (same 20 rows twice): no duplicate leads", async () => {
    const D = await makeTenant("dup");
    const body = { csv: csvOf("DUP-", 20) };
    const [r1, r2] = await Promise.all([call(D, "POST", "/api/leads/import", body), call(D, "POST", "/api/leads/import", body)]);
    assert.ok(r1.status === 200 && r2.status === 200);
    const s = await stats(D);
    assert.equal(s.total, 20, `duplicates created: ${s.total} leads for 20 unique rows`);
  });

  await check("lead export xlsx: valid workbook, only own workspace rows", async () => {
    const E = await makeTenant("xlsx");
    await call(E, "POST", "/api/leads/import", { csv: "name,company,status,value\r\nXlsx One,Co,new,5" });
    const r = await call(E, "GET", "/api/leads/export?format=xlsx");
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") || "", /spreadsheetml/);
    const buf = Buffer.from(await r.arrayBuffer());
    assert.equal(buf.subarray(0, 2).toString(), "PK");
    assert.ok(buf.length > 500);
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets["Leads"]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Xlsx One");
  });
} finally {
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  await admin.from("workspaces").delete().like("name", "LOCAL-%");
}
console.log(failures ? `FAILED: ${failures}` : "ALL PASS");
process.exit(failures ? 1 : 0);
