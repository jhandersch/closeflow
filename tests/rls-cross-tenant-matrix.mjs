// Rolled-back RLS matrix: user A (member of workspace A only) must not read,
// update, delete or insert into workspace B for every table with workspace_id.
import pg from "pg";
import fs from "node:fs";
import crypto from "node:crypto";

// CLOSEFLOW_LOCAL_DB=1 targets only the local Supabase stack and never reads .env.local.
const useLocal = process.env.CLOSEFLOW_LOCAL_DB === "1";
let c;
if (useLocal) {
  c = new pg.Client({
    host: "127.0.0.1",
    port: 54322,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  });
} else {
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
  c = new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: "postgres",
    password: env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
}

let failures = 0;
const report = (ok, msg) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
};

await c.connect();
try {
  await c.query("begin");
  if (process.env.CLOSEFLOW_TEST_PENDING_RLS_MIGRATION === "YES") {
    const migration = fs.readFileSync(
      new URL(
        "../supabase/migrations/20261017193000_remove_legacy_owner_only_crm_policies.sql",
        import.meta.url
      ),
      "utf8"
    );
    await c.query(migration);
    console.log("INFO tested pending CRM RLS migration transactionally");
  }
  const ua = crypto.randomUUID();
  const ub = crypto.randomUUID();
  const wa = crypto.randomUUID();
  const wb = crypto.randomUUID();

  for (const [u, tag] of [[ua, "a"], [ub, "b"]]) {
    await c.query(
      "insert into auth.users (id, instance_id, aud, role, email) values ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2)",
      [u, `closeflow-rls-${tag}-${u}@example.invalid`]
    );
  }
  for (const [w, u, n] of [[wa, ua, "A"], [wb, ub, "B"]]) {
    await c.query(
      "insert into public.workspaces (id, name, owner_id, plan) values ($1,$2,$3,'free')",
      [w, `CLOSEFLOW-RLS-${n}`, u]
    );
    await c.query(
      "insert into public.workspace_members (workspace_id, user_id, role) values ($1,$2,'owner') on conflict do nothing",
      [w, u]
    );
  }

  const { rows: tables } = await c.query(`
    select c.table_name from information_schema.columns c
    join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name
    where c.table_schema='public' and c.column_name='workspace_id' and t.table_type='BASE TABLE'
    order by 1`);

  // Seed one row in workspace B per table, filling required columns generically.
  const refs = { user_id: ub, owner_id: ub, created_by: ub, actor_user_id: ub, workspace_id: wb };
  const lead = await c.query(
    "insert into public.leads (workspace_id,user_id,name,status) values ($1,$2,'CLOSEFLOW-RLS-LEAD','new') returning id",
    [wb, ub]
  );
  refs.lead_id = lead.rows[0].id;
  const automation = await c.query(
    "insert into public.automations (workspace_id,name,trigger_event) values ($1,'CLOSEFLOW-RLS','lead.created') returning id",
    [wb]
  );
  refs.automation_id = automation.rows[0].id;
  const makeInsert = (cols, workspaceId, userId) => {
    const names = [];
    const vals = [];
    let hasWorkspaceId = false;
    for (const col of cols) {
      let v = refs[col.column_name];
      if (col.column_name === "workspace_id") {
        v = workspaceId;
        hasWorkspaceId = true;
      }
      else if (col.column_name === "user_id") v = userId;
      if (v === undefined) {
        if (col.column_name === "role") v = "member";
        else if (col.column_name === "type") v = "won";
        else if (col.column_name === "bucket") v = "ai";
        else if (col.column_name === "month") v = "2099-01";
        else if (col.column_name === "request_key" || col.column_name === "trigger_key") {
          v = `CLOSEFLOW-RLS-${crypto.randomUUID()}`;
        } else if (col.column_name === "email") {
          v = `closeflow-rls-${crypto.randomUUID()}@example.invalid`;
        } else if (col.column_name === "token") v = crypto.randomUUID();
        else if (col.column_name === "actions") v = "[]";
        else if (/char|text/.test(col.data_type)) v = "CLOSEFLOW-RLS";
        else if (/int|numeric|double|real/.test(col.data_type)) v = 0;
        else if (col.data_type === "boolean") v = false;
        else if (/timestamp|date/.test(col.data_type)) v = new Date().toISOString();
        else if (/json/.test(col.data_type)) v = "{}";
        else continue;
      }
      names.push(`"${col.column_name}"`);
      vals.push(v);
    }
    if (!hasWorkspaceId) {
      names.push('"workspace_id"');
      vals.push(workspaceId);
    }
    return { names, vals };
  };
  const seeded = [];
  const insertSpecs = new Map();
  for (const { table_name: t } of tables) {
    const { rows: cols } = await c.query(
      `select column_name, data_type from information_schema.columns
       where table_schema='public' and table_name=$1 and is_nullable='NO'
       and column_default is null and is_generated='NEVER'`,
      [t]
    );
    insertSpecs.set(t, cols);
    if (t === "workspace_members") {
      seeded.push(t);
      continue;
    }
    const { names, vals } = makeInsert(cols, wb, ub);
    await c.query("savepoint seed");
    try {
      const r = await c.query(
        `insert into public."${t}" (${names.join(",")}) values (${vals.map((_, i) => `$${i + 1}`).join(",")}) returning 1`,
        vals
      );
      if (r.rowCount) seeded.push(t);
      await c.query("release savepoint seed");
    } catch {
      await c.query("rollback to savepoint seed");
    }
  }
  console.log(`INFO tenant tables: ${tables.length}, seeded: ${seeded.length} (${seeded.join(",")})`);
  console.log(`INFO unseeded: ${tables.map((x) => x.table_name).filter((x) => !seeded.includes(x)).join(",")}`);

  await c.query("set local role authenticated");
  await c.query("select set_config('request.jwt.claim.sub',$1,true)", [ua]);
  await c.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: ua, role: "authenticated" }),
  ]);

  const attempt = async (sql, params) => {
    await c.query("savepoint a");
    try {
      const r = await c.query(sql, params);
      await c.query("rollback to savepoint a");
      return { rows: r.rowCount, error: null };
    } catch (e) {
      await c.query("rollback to savepoint a");
      return { rows: 0, error: e.code };
    }
  };

  for (const t of ["activities", "leads"]) {
    const { names, vals } = makeInsert(insertSpecs.get(t), wa, ua);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(",");
    const ownInsert = await attempt(
      `insert into public."${t}" (${names.join(",")}) values (${placeholders})`,
      vals
    );
    report(
      ownInsert.rows === 1 && !ownInsert.error,
      `${t}: workspace A owner can insert own workspace row`
    );
  }

  const foreignWorkspaceDelete = await attempt(
    "delete from public.workspaces where id=$1",
    [wb]
  );
  report(foreignWorkspaceDelete.rows === 0, "workspaces: delete of foreign workspace affects 0");

  const ownedWorkspaceDelete = await attempt(
    "delete from public.workspaces where id=$1",
    [wa]
  );
  report(ownedWorkspaceDelete.rows === 1, "workspaces: owner can delete own workspace");

  for (const { table_name: t } of tables) {
    const sel = await attempt(`select 1 from public."${t}" where workspace_id=$1`, [wb]);
    report(sel.rows === 0, `${t}: read of workspace B rows leaks 0 (${sel.error || "ok"})`);

    const del = await attempt(`delete from public."${t}" where workspace_id=$1`, [wb]);
    report(del.rows === 0, `${t}: delete in workspace B affects 0`);

    const upd = await attempt(`update public."${t}" set workspace_id=workspace_id where workspace_id=$1`, [wb]);
    report(upd.rows === 0, `${t}: update in workspace B affects 0`);

    const { names, vals } = makeInsert(insertSpecs.get(t), wb, ua);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(",");
    const ins = await attempt(
      `insert into public."${t}" (${names.join(",")}) values (${placeholders})`,
      vals
    );
    report(
      ins.rows === 0 && (!ins.error || ins.error === "42501"),
      `${t}: insert into workspace B blocked (${ins.error || "no-op"})`
    );
  }
} finally {
  await c.query("rollback");
  await c.end();
}
console.log(failures ? `FAILED: ${failures}` : "ALL PASS");
process.exit(failures ? 1 : 0);
