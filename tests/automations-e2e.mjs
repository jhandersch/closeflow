import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error("Refusing DB fixture writes without explicit authorization.");
}

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pub, SUPABASE_SERVICE_ROLE_KEY: svc, BASE_URL: base } = process.env;
assert(url && pub && svc && base, "Required Supabase or application configuration is missing.");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, svc, opts);
const pubc = createClient(url, pub, opts);
const marker = `CLOSEFLOW-AUTOMATION-E2E-${randomUUID()}`;
const email = `closeflow-auto-${randomUUID()}@example.invalid`;
const password = `Cf_${randomUUID()}_R8!`;
let userId, workspaceId, token, failure;

const api = (method, path, body) =>
  fetch(new URL(path, base), {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const must = (label, { error }) => { if (error) throw new Error(`${label}: ${error.message}`); };
const notices = async () => {
  const r = await api("GET", "/api/notifications");
  assert.equal(r.status, 200, "notifications status");
  return (await r.json()).filter((n) => n.id.startsWith("automation-"));
};
const log = (s) => console.log("PASS", s);

const run = async () => {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { closeflow_test_marker: marker } });
  must("user", { error: ue });
  userId = u.user.id;
  const { data: w, error: we } = await admin.from("workspaces").insert({ name: marker, owner_id: userId, plan: "free" }).select("id").single();
  must("workspace", { error: we });
  workspaceId = w.id;
  must("member", await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" }));
  must("usage", await admin.from("usage").insert({ workspace_id: workspaceId, month: new Date().toISOString().slice(0, 7), ai_requests: 0, exports_count: 0, updated_at: new Date().toISOString() }));
  const { data: s, error: se } = await pubc.auth.signInWithPassword({ email, password });
  must("signin", { error: se });
  token = s.session.access_token;

  // Inserted directly because the automations API requires MFA for workspace roles.
  const auto = (name, trigger_event, actions) => ({ workspace_id: workspaceId, name, trigger_event, actions, enabled: true });
  must("automations", await admin.from("automations").insert([
    auto("E2E created", "lead.created", [{ type: "task.create", payload: { title: "E2E call new lead" } }]),
    auto("E2E contacted", "lead.stage.contacted", [{ type: "notify.user", payload: { message: "E2E contacted notice" } }]),
    auto("E2E proposal", "lead.stage.proposal", [{ type: "lead.status.update", payload: { status: "won" } }]),
    auto("E2E overdue", "task.overdue", [{ type: "notify.user", payload: { message: "E2E overdue notice" } }]),
  ]));

  const created = await api("POST", "/api/leads", { name: `Lead ${marker}`, company: `Co ${marker}`, status: "new", value: 1000, notes: marker });
  assert.equal(created.status, 200, "lead create");
  const lead = await created.json();
  const { data: tasks } = await admin.from("tasks").select("id,title").eq("workspace_id", workspaceId).eq("lead_id", lead.id);
  assert(tasks.some((t) => t.title === "E2E call new lead"), "task from lead.created missing");
  let n = await notices();
  assert(n.some((x) => /E2E created/.test(x.title) && /Task created: E2E call new lead/.test(x.message)), "notification for lead.created missing");
  log("lead.created -> task + notification");

  const c = await api("PUT", "/api/leads", { id: lead.id, status: "contacted" });
  assert.equal(c.status, 200, "contacted");
  n = await notices();
  assert(n.some((x) => /E2E contacted/.test(x.title) && x.message === "E2E contacted notice"), "contacted notification missing");
  log("lead.stage.contacted -> notification");

  const p = await api("PUT", "/api/leads", { id: lead.id, status: "proposal" });
  assert.equal(p.status, 200, "proposal");
  const { data: after } = await admin.from("leads").select("status").eq("id", lead.id).single();
  assert.equal(after.status, "won", "status.update did not set won");
  const { data: tl } = await admin.from("activities").select("metadata").eq("lead_id", lead.id).eq("type", "status_changed");
  assert(tl.some((a) => a.metadata?.trigger === "automation"), "timeline entry missing");
  log("lead.status.update -> won + timeline entry");

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  must("overdue task", await admin.from("tasks").insert({ workspace_id: workspaceId, user_id: userId, title: `Overdue ${marker}`, due_date: yesterday, completed: false, priority: "medium" }));
  n = await notices();
  assert(n.some((x) => /E2E overdue/.test(x.title)), "overdue notification missing");
  log("task.overdue -> notification");

  const before = (await notices()).length;
  await notices();
  assert.equal((await notices()).length, before, "duplicate notifications after reload");
  log("repeated loads do not duplicate");
};

try { await run(); } catch (e) { failure = e; } finally {
  try {
    if (workspaceId) {
      const { data } = await admin.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
      if (data?.name === marker) await admin.from("workspaces").delete().eq("id", workspaceId);
    }
    if (userId) {
      const { data } = await admin.auth.admin.getUserById(userId);
      if (data.user?.user_metadata?.closeflow_test_marker === marker) await admin.auth.admin.deleteUser(userId);
    }
    console.log("cleanup done");
  } catch (e) { failure = failure || e; }
}
if (failure) { console.error("FAIL:", failure.message); process.exitCode = 1; }
