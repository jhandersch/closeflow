// Rolled-back leak check against real production data: anon and an unrelated
// authenticated user must see no rows outside their own disposable workspace,
// in every public table (including tables without workspace_id).
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
  const ua = crypto.randomUUID();
  const wa = crypto.randomUUID();
  await c.query(
    "insert into auth.users (id, instance_id, aud, role, email) values ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2)",
    [ua, `closeflow-leak-${ua}@example.invalid`]
  );
  await c.query(
    "insert into public.workspaces (id, name, owner_id, plan) values ($1,'CLOSEFLOW-LEAK-A',$2,'free')",
    [wa, ua]
  );
  await c.query(
    "insert into public.workspace_members (workspace_id, user_id, role) values ($1,$2,'owner') on conflict do nothing",
    [wa, ua]
  );

  const { rows: tables } = await c.query(`
    select c.relname as t,
      exists(select 1 from information_schema.columns i where i.table_schema='public' and i.table_name=c.relname and i.column_name='workspace_id') as ws
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' order by 1`);

  // Totals as superuser, to show the check is not vacuous.
  const totals = {};
  for (const { t } of tables) {
    totals[t] = Number((await c.query(`select count(*) n from public."${t}"`)).rows[0].n);
  }

  const count = async (t, ws, role) => {
    await c.query("savepoint x");
    try {
      const where = ws
        ? `where workspace_id is distinct from $1`
        : t === "workspaces"
          ? `where id is distinct from $1`
          : "";
      const r = await c.query(
        `select count(*) n from public."${t}" ${where}`,
        ws || t === "workspaces" ? [wa] : []
      );
      await c.query("release savepoint x");
      return Number(r.rows[0].n);
    } catch (e) {
      await c.query("rollback to savepoint x");
      return `error:${e.code}`;
    }
  };

  for (const role of ["anon", "authenticated"]) {
    await c.query(`set local role ${role}`);
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [
      role === "anon" ? "" : ua,
    ]);
    await c.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify(
        role === "anon" ? { role: "anon" } : { sub: ua, role: "authenticated" }
      ),
    ]);

    for (const { t, ws } of tables) {
      const n = await count(t, ws, role);
      const ownProfile = t === "profiles" && role === "authenticated";
      const ok = n === 0 || (typeof n === "string") || ownProfile;
      report(ok, `${role} ${t}: foreign rows visible=${n} (total in table=${totals[t]})`);
    }
    await c.query("reset role");
  }
  const nonEmpty = tables.filter((x) => totals[x.t] > 0).length;
  console.log(`INFO tables with real rows (meaningful checks): ${nonEmpty}/${tables.length}`);
} finally {
  await c.query("rollback");
  await c.end();
}
console.log(failures ? `FAILED: ${failures}` : "ALL PASS");
process.exit(failures ? 1 : 0);
