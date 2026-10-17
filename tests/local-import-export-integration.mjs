// Route-level integration test against a LOCAL Supabase stack and a LOCAL Next.js server.
// Required env: LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL.
// Refuses to run unless both targets are loopback. Never reads .env.local.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL } =
  process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !LOCAL_SUPABASE_PUBLIC_KEY || !BASE_URL) {
  throw new Error("Missing local test configuration.");
}
for (const u of [LOCAL_SUPABASE_URL, BASE_URL]) {
  const { hostname } = new URL(u);
  if (!["127.0.0.1", "localhost"].includes(hostname)) {
    throw new Error("Refusing to run against a non-loopback target.");
  }
}

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, authOpts);

let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
};

const makeTenant = async (tag) => {
  const email = `closeflow-local-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  const userId = data.user.id;
  const ws = await admin
    .from("workspaces")
    .insert({ name: `LOCAL-${tag}`, owner_id: userId, plan: "free" })
    .select("id")
    .single();
  assert.ifError(ws.error);
  const mem = await admin
    .from("workspace_members")
    .insert({ workspace_id: ws.data.id, user_id: userId, role: "owner" });
  assert.ifError(mem.error);
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, authOpts);
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signInError);
  return { userId, workspaceId: ws.data.id, token: session.session.access_token };
};

const call = (tenant, method, path, body, raw) =>
  fetch(new URL(path, BASE_URL), {
    method,
    headers: {
      ...(tenant ? { authorization: `Bearer ${tenant.token}` } : {}),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
  });

const counts = async (tenant) => {
  const [leads, acts, customers] = await Promise.all([
    admin.from("leads").select("id,name").eq("workspace_id", tenant.workspaceId),
    admin.from("activities").select("id,lead_id,type").eq("workspace_id", tenant.workspaceId),
    admin.from("customers").select("id,contact").eq("workspace_id", tenant.workspaceId),
  ]);
  for (const r of [leads, acts, customers]) assert.ifError(r.error);
  return { leads: leads.data, acts: acts.data, customers: customers.data };
};

const csv = [
  "name,company,status,value,notes",
  'Alice Muster,Acme GmbH,new,1000,"Zeile 1\nZeile 2"',
  "Bob Beispiel,Beta AG,contacted,\"2,5\",=HYPERLINK(\"http://x\")",
].join("\r\n");

const created = [];
try {
  const A = await makeTenant("a");
  const B = await makeTenant("b");
  created.push(A, B);

  await check("lead import: unauthenticated -> 401", async () => {
    const r = await call(null, "POST", "/api/leads/import", { csv });
    assert.equal(r.status, 401);
  });

  await check("lead import: invalid JSON -> 400", async () => {
    const r = await call(A, "POST", "/api/leads/import", "{not json", true);
    assert.equal(r.status, 400);
  });

  await check("lead import: unterminated quote -> 400 and nothing written", async () => {
    const r = await call(A, "POST", "/api/leads/import", { csv: 'name,company\r\n"Open,Quote' });
    assert.equal(r.status, 400);
    assert.equal((await counts(A)).leads.length, 0);
  });

  await check("lead import A: 2 inserted, newline preserved, one 'created' activity each", async () => {
    const r = await call(A, "POST", "/api/leads/import", { csv });
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.equal(j.inserted, 2, JSON.stringify(j));
    const c = await counts(A);
    assert.equal(c.leads.length, 2);
    assert.equal(c.acts.filter((a) => a.type === "created").length, 2);
    const alice = await admin
      .from("leads")
      .select("notes,value")
      .eq("workspace_id", A.workspaceId)
      .eq("name", "Alice Muster")
      .single();
    assert.equal(alice.data.notes, "Zeile 1\nZeile 2");
  });

  await check("lead import A retry: no duplicate leads, no new activities", async () => {
    const before = await counts(A);
    const r = await call(A, "POST", "/api/leads/import", { csv });
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.equal(j.inserted, 0, JSON.stringify(j));
    const after = await counts(A);
    assert.equal(after.leads.length, before.leads.length);
    assert.equal(after.acts.length, before.acts.length);
  });

  await check("tenant isolation: B sees no A leads; B import of same names creates B-only rows", async () => {
    assert.equal((await counts(B)).leads.length, 0);
    const r = await call(B, "POST", "/api/leads/import", { csv });
    const j = await r.json();
    assert.equal(j.inserted, 2, JSON.stringify(j));
    assert.equal((await counts(A)).leads.length, 2);
    assert.equal((await counts(B)).leads.length, 2);
  });

  await check("lead export A: only A rows, formula escaped, workspace-scoped", async () => {
    const r = await call(A, "GET", "/api/leads/export");
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.match(text, /Alice Muster/);
    assert.match(text, /Bob Beispiel/);
    assert.ok(!/(^|;)"?=HYPERLINK/m.test(text), "formula cell must be neutralised");
    assert.match(text, /'=HYPERLINK/);
    const rows = text.split("\r\n").length;
    assert.ok(rows >= 3);
  });

  await check("lead export: unauthenticated -> 401", async () => {
    assert.equal((await call(null, "GET", "/api/leads/export")).status, 401);
  });

  await check("customer import: unterminated quote -> 400; valid import is workspace-scoped", async () => {
    const bad = await call(A, "POST", "/api/customers/import", { csv: 'contact,company\r\n"Open' });
    assert.equal(bad.status, 400);
    const good = await call(A, "POST", "/api/customers/import", {
      csv: "contact,company,email\r\nCarla Kunde,Gamma GmbH,carla@example.invalid",
    });
    const j = await good.json();
    assert.equal(good.status, 200, JSON.stringify(j));
    assert.equal((await counts(A)).customers.length >= 1, true);
    assert.equal((await counts(B)).customers.length, 0);
  });
} finally {
  for (const t of created) {
    await admin.from("workspaces").delete().eq("id", t.workspaceId);
    await admin.auth.admin.deleteUser(t.userId);
  }
}
console.log(failures ? `FAILED: ${failures}` : "ALL PASS");
process.exit(failures ? 1 : 0);
