// Rolled-back production check for automation_runs RLS and idempotency.
import pg from "pg";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const isLocal = process.env.CLOSEFLOW_LOCAL_DB === "1";
let client;
if (isLocal) {
  client = new pg.Client({
    host: process.env.LOCAL_PG_HOST || "127.0.0.1",
    port: Number(process.env.LOCAL_PG_PORT || "54322"),
    user: process.env.LOCAL_PG_USER || "postgres",
    password: process.env.LOCAL_PG_PASSWORD || "postgres",
    database: process.env.LOCAL_PG_DATABASE || "postgres",
  });
} else {
  if (process.env.CLOSEFLOW_ALLOW_REMOTE_RLS_TEST !== "YES") {
    throw new Error(
      "Refusing remote automation idempotency check. Set CLOSEFLOW_ALLOW_REMOTE_RLS_TEST=YES only for an authorized remote test.",
    );
  }

  const env = Object.fromEntries(
    fs
      .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
      })
  );
  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  client = new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: "postgres",
    password: env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`);
};

await client.connect();
try {
  await client.query("begin");
  let { rows } = await client.query(
    "select workspace_id, user_id from public.workspace_members where role='owner' limit 1"
  );
  if (isLocal && rows.length === 0) {
    const uid = randomUUID();
    const ws = randomUUID();
    const otherWs = randomUUID();
    await client.query(
      "insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ($1, 'authenticated', 'authenticated', $2, now(), '{}', '{}', now(), now())",
      [uid, `closeflow-automation-${uid}@example.invalid`]
    );
    await client.query(
      "insert into public.workspaces (id, name, owner_id) values ($1, 'Automation Test Workspace', $2), ($3, 'Automation Other Workspace', $2)",
      [ws, uid, otherWs]
    );
    await client.query(
      "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner'), ($3, $2, 'owner')",
      [ws, uid, otherWs]
    );
    rows = [{ workspace_id: ws, user_id: uid }];
  }
  const { workspace_id: ws, user_id: uid } = rows[0] || {};
  if (!ws || !uid) throw new Error("No local automation fixture is available.");
  const other = await client.query(
    "select id from public.workspaces where id <> $1 limit 1",
    [ws]
  );
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
  await client.query(
    "select set_config('request.jwt.claims', $1, true)",
    [JSON.stringify({ sub: uid, role: "authenticated" })]
  );

  const a = await client.query(
    "insert into public.automations (workspace_id,name,trigger_event,actions) values ($1,'CLOSEFLOW-TEST','lead.created','[]') returning id",
    [ws]
  );
  const aid = a.rows[0].id;
  const ins = () =>
    client.query(
      "insert into public.automation_runs (workspace_id,automation_id,status,dedupe_key) values ($1,$2,'running','k1')",
      [ws, aid]
    );
  await ins();
  check("run insert as member", true);

  await client.query("savepoint s");
  let code = null;
  try {
    await ins();
  } catch (e) {
    code = e.code;
  }
  await client.query("rollback to savepoint s");
  check("duplicate dedupe_key rejected", code === "23505", code || "");

  const up = await client.query(
    "update public.automation_runs set status='success' where automation_id=$1 and dedupe_key='k1'",
    [aid]
  );
  check("run status update", up.rowCount === 1);

  if (other.rows[0]) {
    await client.query("savepoint s2");
    let blocked = false;
    try {
      await client.query(
        "insert into public.automation_runs (workspace_id,automation_id,status,dedupe_key) values ($1,$2,'running','x')",
        [other.rows[0].id, aid]
      );
    } catch {
      blocked = true;
    }
    await client.query("rollback to savepoint s2");
    check("cross-workspace run insert blocked", blocked);
  }
} finally {
  await client.query("rollback");
  await client.end();
}
process.exit(results.every(Boolean) ? 0 : 1);
