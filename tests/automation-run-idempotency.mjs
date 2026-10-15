// Rolled-back production check for automation_runs RLS and idempotency.
import pg from "pg";
import fs from "node:fs";

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
const client = new pg.Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: "postgres",
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`);
};

await client.connect();
try {
  await client.query("begin");
  const { rows } = await client.query(
    "select workspace_id, user_id from public.workspace_members where role='owner' limit 1"
  );
  const { workspace_id: ws, user_id: uid } = rows[0];
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
