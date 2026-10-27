// Local-only concurrency test for the database lead identity lock and RPCs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const connection = {
  host: "127.0.0.1",
  port: 54322,
  user: "postgres",
  password: "postgres",
  database: "postgres",
};
const admin = new pg.Client(connection);
const clients = [new pg.Client(connection), new pg.Client(connection), new pg.Client(connection)];
const userId = randomUUID();
const viewerId = randomUUID();
const workspaceId = randomUUID();
const email = `closeflow-duplicate-${userId}@example.invalid`;

const report = (name, passed) => {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  assert.ok(passed, name);
};

const createLead = (client, name, company, allowDuplicate = false, actorId = userId) =>
  client.query(
    `select * from public.create_lead_with_duplicate_check(
      $1, $2, $3::jsonb, $4
    )`,
    [
      workspaceId,
      actorId,
      JSON.stringify({ name, company, status: "new", value: 1 }),
      allowDuplicate,
    ],
  );

const countByIdentity = async (name, company) => {
  const { rows } = await admin.query(
    `select count(*)::integer as count
     from public.leads
     where workspace_id = $1
       and lower(btrim(name)) = lower(btrim($2))
       and lower(btrim(coalesce(company, ''))) = lower(btrim($3))
       and deleted_at is null`,
    [workspaceId, name, company],
  );
  return rows[0].count;
};

await admin.connect();
for (const client of clients) await client.connect();

try {
  await admin.query(
    `insert into auth.users (id, instance_id, aud, role, email)
     values ($1, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', $2)`,
    [userId, email],
  );
  await admin.query(
    `insert into auth.users (id, instance_id, aud, role, email)
     values ($1, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', $2)`,
    [viewerId, `closeflow-viewer-${viewerId}@example.invalid`],
  );
  await admin.query(
    "insert into public.workspaces (id, name, owner_id, plan) values ($1, $2, $3, 'free')",
    [workspaceId, `CLOSEFLOW-DUPLICATE-${userId}`, userId],
  );
  await admin.query(
    "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner')",
    [workspaceId, userId],
  );
  await admin.query(
    "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'viewer')",
    [workspaceId, viewerId],
  );

  for (const client of clients) {
    await client.query("set role authenticated");
  }
  for (const [client, actorId] of [[clients[0], userId], [clients[1], userId], [clients[2], viewerId]]) {
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [actorId]);
    await client.query(
      "select set_config('request.jwt.claims', $1, false)",
      [JSON.stringify({ sub: actorId, role: "authenticated" })],
    );
  }

  const concurrentCreates = await Promise.all([
    createLead(clients[0], " Concurrent Lead ", "Atomic Co"),
    createLead(clients[1], "concurrent lead", " atomic co "),
  ]);
  const outcomes = concurrentCreates.map((result) => result.rows[0]);
  report(
    "concurrent manual RPC creates exactly one lead",
    outcomes.filter((outcome) => outcome.created).length === 1 &&
      outcomes.filter((outcome) => !outcome.created && outcome.duplicate_id).length === 1 &&
      (await countByIdentity("Concurrent Lead", "Atomic Co")) === 1,
  );

  const override = await createLead(clients[0], "Concurrent Lead", "Atomic Co", true);
  report(
    "explicit duplicate override creates the second lead",
    override.rows[0].created === true &&
      (await countByIdentity("Concurrent Lead", "Atomic Co")) === 2,
  );

  let viewerWriteCode = null;
  try {
    await createLead(clients[2], "Viewer Attempt", "Atomic Co", false, viewerId);
  } catch (error) {
    viewerWriteCode = error.code;
  }
  report(
    "security-definer create RPC denies viewers",
    viewerWriteCode === "42501" &&
      (await countByIdentity("Viewer Attempt", "Atomic Co")) === 0,
  );

  await createLead(clients[0], "Direct Insert", "Atomic Co");
  let duplicateInsertCode = null;
  try {
    await clients[1].query(
      `insert into public.leads
        (workspace_id, user_id, created_by, name, company, status, value)
       values ($1, $2, $2, ' direct insert ', 'atomic co', 'new', 1)`,
      [workspaceId, userId],
    );
  } catch (error) {
    duplicateInsertCode = error.code;
  }
  report(
    "database trigger rejects duplicate direct inserts",
    duplicateInsertCode === "23505" &&
      (await countByIdentity("Direct Insert", "Atomic Co")) === 1,
  );

  const mixedName = "Mixed Import";
  const importRows = JSON.stringify([{
    rowNumber: 1,
    name: mixedName.toLowerCase(),
    company: "Atomic Co",
    status: "new",
    value: 2,
    tags: [],
    stageChangedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  }]);
  const mixed = await Promise.all([
    createLead(clients[0], mixedName, "Atomic Co"),
    clients[1].query(
      "select * from public.import_leads_with_activity($1, $2, $3::jsonb, 'insert')",
      [workspaceId, userId, importRows],
    ),
  ]);
  const manualWon = mixed[0].rows[0].created;
  const importWon = Boolean(mixed[1].rows[0].lead_id);
  report(
    "concurrent manual create and import never create duplicate leads",
    manualWon !== importWon &&
      (await countByIdentity(mixedName, "Atomic Co")) === 1,
  );
} finally {
  for (const client of clients) await client.end();
  await admin.query("delete from public.workspaces where id = $1", [workspaceId]);
  await admin.query("delete from auth.users where id in ($1, $2)", [userId, viewerId]);
  await admin.end();
}

console.log("ALL PASS");
