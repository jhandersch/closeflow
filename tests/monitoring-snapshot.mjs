// Read-only production monitoring snapshot for the release monitoring window.
// Usage: node tests/monitoring-snapshot.mjs [hours=24]
// Reads .env.local (service key stays in memory, never printed). Performs only GET/SELECT.
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const hours = Number(process.argv[2] ?? 24);
const since = new Date(Date.now() - hours * 3600_000).toISOString();
const site = process.env.MONITOR_URL ?? "https://www.closeflowapp.de";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !svc || !new URL(url).hostname.endsWith(".supabase.co")) throw new Error("Missing or unexpected Supabase configuration.");
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

const findings = [];
const row = (name, ok, detail) => {
  console.log(`${ok ? "OK  " : "WARN"} ${name}: ${detail}`);
  if (!ok) findings.push(name);
};

for (const path of ["/api/health", "/login"]) {
  const started = Date.now();
  try {
    const res = await fetch(site + path, { redirect: "follow" });
    row(`GET ${path}`, res.status === 200, `${res.status} in ${Date.now() - started} ms`);
  } catch (err) {
    row(`GET ${path}`, false, err.message);
  }
}

const events = await db.from("audit_logs").select("event_type, payload, created_at").gte("created_at", since).limit(5000);
if (events.error) row("audit_logs", false, events.error.message);
else {
  const byType = {};
  for (const e of events.data) byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
  const errors = events.data.filter((e) => /error/i.test(e.event_type) || ["error"].includes(e.payload?.level));
  row("error events", errors.length === 0, `${errors.length} in last ${hours}h`);
  const kinds = {};
  for (const e of errors) kinds[e.payload?.message ?? e.event_type] = (kinds[e.payload?.message ?? e.event_type] ?? 0) + 1;
  for (const [k, n] of Object.entries(kinds).slice(0, 10)) console.log(`     ${n}x ${String(k).slice(0, 120)}`);
  console.log(`INFO audit event types: ${JSON.stringify(byType)}`);
}

const fixtures = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (fixtures.error) row("test fixtures", false, fixtures.error.message);
else {
  const leftovers = fixtures.data.users.filter((u) => /@example\.invalid$/.test(u.email ?? ""));
  row("leftover test users", leftovers.length === 0, String(leftovers.length));
  console.log(`INFO total users: ${fixtures.data.users.length}`);
}

const limitedWs = await db.from("workspaces").select("id", { count: "exact", head: true });
row("database reachable", !limitedWs.error, limitedWs.error?.message ?? `${limitedWs.count} workspaces`);

console.log(findings.length ? `RESULT: ${findings.length} warning(s): ${findings.join(", ")}` : "RESULT: no findings");
process.exit(findings.length ? 1 : 0);
