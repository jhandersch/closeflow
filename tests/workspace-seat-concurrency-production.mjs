import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error(
    "Refusing DB writes. Set CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES=YES only after explicit authorization.",
  );
}

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databasePassword = process.env.SUPABASE_DB_PASSWORD;
const poolerPath = "supabase/.temp/pooler-url";

if (!supabaseUrl || !publishableKey || !serviceRoleKey || !databasePassword) {
  throw new Error("Required Supabase or PostgreSQL configuration is missing.");
}
if (!existsSync(poolerPath)) {
  throw new Error("Linked Supabase pooler configuration is missing.");
}

const poolerUrl = new URL(readFileSync(poolerPath, "utf8").trim());
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const poolerProjectRef = poolerUrl.username.split(".").at(-1);
if (poolerProjectRef !== projectRef) {
  throw new Error("Pooler project reference does not match the configured Supabase project.");
}

const marker = `CLOSEFLOW-SEAT-RACE-${randomUUID()}`;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const createdUsers = [];
const createdWorkspaces = [];
const results = [];
let failure;

const record = (name, detail) => {
  results.push({ name, detail });
  console.log(`PASS ${name}: ${detail}`);
};

const createUser = async (label) => {
  const email = `${label}.${randomUUID()}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Cf_${randomUUID()}_C8!`,
    email_confirm: true,
    user_metadata: { closeflow_test_marker: marker },
  });
  if (error || !data.user?.id) {
    throw new Error(`Could not create a marked Auth fixture (${error?.code || "unknown"}).`);
  }
  createdUsers.push(data.user.id);
  return { id: data.user.id, email };
};

const createWorkspace = async (label, owner, plan = "pro") => {
  const { data, error } = await admin
    .from("workspaces")
    .insert({
      name: `${marker}-${label}`,
      owner_id: owner.id,
      plan,
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(`Could not create a marked workspace (${error?.code || "unknown"}).`);
  }
  createdWorkspaces.push(data.id);

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: data.id,
    user_id: owner.id,
    role: "owner",
  });
  if (memberError) {
    throw new Error(`Could not add test owner (${memberError.code || "unknown"}).`);
  }

  if (plan !== "free") {
    const { error: subscriptionError } = await admin.from("subscriptions").insert({
      workspace_id: data.id,
      plan,
      status: "active",
      current_period_end: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    if (subscriptionError) {
      throw new Error(`Could not set test plan (${subscriptionError.code || "unknown"}).`);
    }
  }
  console.log(`Fixture workspace (${label}): ${data.id}`);
  return data.id;
};

const newPgClient = () =>
  new Client({
    host: poolerUrl.hostname,
    port: Number(poolerUrl.port || 5432),
    user: decodeURIComponent(poolerUrl.username),
    password: databasePassword,
    database: decodeURIComponent(poolerUrl.pathname.slice(1)) || "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    application_name: "closeflow-authorized-seat-race-test",
  });

const prepareAuthenticatedTransaction = async (client, user) => {
  await client.query("begin");
  await client.query("set local role authenticated");
  await client.query(
    "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)",
    [user.id, JSON.stringify({ sub: user.id, email: user.email, role: "authenticated" })],
  );
  const { rows } = await client.query("select pg_backend_pid() as pid, auth.uid()::text as uid");
  assert.equal(rows[0].uid, user.id, "JWT identity was not recognized by auth.uid()");
  return rows[0].pid;
};

const countRows = async (table, workspaceId) => {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(`Could not verify ${table} fixture state.`);
  return count ?? 0;
};

const runInviteCreationRace = async (owner, workspaceId) => {
  const connectionCount = 8;
  const clients = Array.from({ length: connectionCount }, newPgClient);
  const pids = [];
  try {
    await Promise.all(clients.map((client) => client.connect()));
    const prepared = await Promise.all(
      clients.map(async (client) => ({
        client,
        pid: await prepareAuthenticatedTransaction(client, owner),
      })),
    );
    pids.push(...prepared.map(({ pid }) => pid));
    assert.equal(new Set(pids).size, connectionCount, "PostgreSQL backend PIDs must be distinct");

    const outcomes = await Promise.all(
      prepared.map(async ({ client }, index) => {
        try {
          const { rows } = await client.query(
            "select public.create_workspace_invite_with_limit($1, $2, 'member', $3, now() + interval '7 days') as invite_id",
            [
              workspaceId,
              `invite-race-${index}-${randomUUID()}@example.invalid`,
              randomUUID(),
            ],
          );
          await client.query("commit");
          return { allowed: true, errorCode: null, inviteId: rows[0].invite_id };
        } catch (error) {
          await client.query("rollback").catch(() => {});
          return { allowed: false, errorCode: error.code || "unknown" };
        }
      }),
    );

    const accepted = outcomes.filter((outcome) => outcome.allowed);
    const denied = outcomes.filter((outcome) => !outcome.allowed);
    assert.equal(accepted.length, 4, "Four Pro seats are available after the owner");
    assert.equal(denied.length, 4, "Remaining concurrent invite requests must be rejected");
    assert.ok(denied.every((outcome) => outcome.errorCode === "23514"));
    assert.equal(await countRows("workspace_members", workspaceId), 1);
    assert.equal(await countRows("workspace_invites", workspaceId), 4);
    record(
      "Concurrent invite creation",
      `connections=${connectionCount}; distinct PostgreSQL PIDs=${pids.join(",")}; accepted=${accepted.length}; rejected=${denied.length}; final seats=5/5`,
    );
  } finally {
    await Promise.all(clients.map((client) => client.end().catch(() => {})));
  }
};

const runUsageQuotaRace = async (owner, workspaceId) => {
  const month = new Date().toISOString().slice(0, 7);
  const { error: seedError } = await admin.from("usage").upsert({
    workspace_id: workspaceId,
    month,
    ai_requests: 497,
    exports_count: 0,
  });
  if (seedError) throw new Error(`Could not seed test quota counter (${seedError.code || "unknown"}).`);

  const idempotencyKey = `quota-idempotency-${randomUUID()}`;
  const original = await consumeQuota(owner, workspaceId, month, idempotencyKey);
  const retry = await consumeQuota(owner, workspaceId, month, idempotencyKey);
  assert.equal(original.allowed, true);
  assert.equal(original.already_counted, false);
  assert.equal(retry.allowed, true);
  assert.equal(retry.already_counted, true);
  assert.equal(await countUsage(workspaceId, month), 498);
  record("Quota request idempotency", "same key retried twice; usage incremented exactly once");

  const connectionCount = 8;
  const clients = Array.from({ length: connectionCount }, newPgClient);
  const pids = [];
  try {
    await Promise.all(clients.map((client) => client.connect()));
    const prepared = await Promise.all(
      clients.map(async (client) => ({
        client,
        pid: await prepareAuthenticatedTransaction(client, owner),
      })),
    );
    pids.push(...prepared.map(({ pid }) => pid));
    assert.equal(new Set(pids).size, connectionCount, "PostgreSQL backend PIDs must be distinct");

    const outcomes = await Promise.all(
      prepared.map(async ({ client }) => {
        try {
          const { rows } = await client.query(
            "select allowed, current_count, usage_limit, already_counted from public.consume_workspace_usage($1, $2, 'ai', $3)",
            [workspaceId, month, randomUUID()],
          );
          await client.query("commit");
          return rows[0];
        } catch (error) {
          await client.query("rollback").catch(() => {});
          return { allowed: false, current_count: -1, errorCode: error.code || "unknown" };
        }
      }),
    );
    const allowed = outcomes.filter((outcome) => outcome.allowed);
    assert.equal(allowed.length, 2);
    assert.deepEqual(
      allowed.map((outcome) => outcome.current_count).sort((a, b) => a - b),
      [499, 500],
    );
    assert.ok(outcomes.every((outcome) => outcome.current_count !== -1));
    assert.equal(await countUsage(workspaceId, month), 500);
    assert.equal(await countRows("usage_events", workspaceId), 3);
    record(
      "Concurrent AI quota reservation",
      `connections=${connectionCount}; distinct PostgreSQL PIDs=${pids.join(",")}; allowed=${allowed.length}; denied=${connectionCount - allowed.length}; final usage=500/500`,
    );
  } finally {
    await Promise.all(clients.map((client) => client.end().catch(() => {})));
  }

};

const countUsage = async (workspaceId, month) => {
  const { data, error } = await admin
    .from("usage")
    .select("ai_requests")
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .single();
  if (error || !data) throw new Error("Could not verify the persisted quota counter.");
  return data.ai_requests;
};

const consumeQuota = async (user, workspaceId, month, requestKey) => {
  const client = newPgClient();
  try {
    await client.connect();
    await prepareAuthenticatedTransaction(client, user);
    const { rows } = await client.query(
      "select allowed, current_count, usage_limit, already_counted from public.consume_workspace_usage($1, $2, 'ai', $3)",
      [workspaceId, month, requestKey],
    );
    await client.query("commit");
    return rows[0];
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw new Error(`Quota RPC failed (${error.code || "unknown"}).`);
  } finally {
    await client.end().catch(() => {});
  }
};

const runLeadCapacityRace = async (owner, workspaceId) => {
  const seedClient = newPgClient();
  try {
    await seedClient.connect();
    await seedClient.query("begin");
    for (let index = 0; index < 49; index += 1) {
      await seedClient.query(
        "insert into public.leads (user_id, name, status, workspace_id, owner_id, created_by) values ($1, $2, 'new', $3, $1, $1)",
        [owner.id, `${marker}-seed-lead-${index}`, workspaceId],
      );
    }
    await seedClient.query("commit");
  } catch (error) {
    await seedClient.query("rollback").catch(() => {});
    throw new Error(`Could not seed active lead fixtures (${error.code || "unknown"}).`);
  } finally {
    await seedClient.end().catch(() => {});
  }

  assert.equal(await countRows("leads", workspaceId), 49);
  const clients = Array.from({ length: 8 }, newPgClient);
  const pids = [];
  try {
    await Promise.all(clients.map((client) => client.connect()));
    const prepared = await Promise.all(
      clients.map(async (client) => ({
        client,
        pid: await prepareAuthenticatedTransaction(client, owner),
      })),
    );
    pids.push(...prepared.map(({ pid }) => pid));
    assert.equal(new Set(pids).size, clients.length, "PostgreSQL backend PIDs must be distinct");

    const outcomes = await Promise.all(
      prepared.map(async ({ client }, index) => {
        try {
          await client.query(
            "insert into public.leads (user_id, name, status, workspace_id, owner_id, created_by) values ($1, $2, 'new', $3, $1, $1)",
            [owner.id, `${marker}-race-lead-${index}`, workspaceId],
          );
          await client.query("commit");
          return { created: true, errorCode: null };
        } catch (error) {
          await client.query("rollback").catch(() => {});
          return { created: false, errorCode: error.code || "unknown" };
        }
      }),
    );
    const created = outcomes.filter((outcome) => outcome.created);
    const rejected = outcomes.filter((outcome) => !outcome.created);
    assert.equal(created.length, 1);
    assert.equal(rejected.length, 7);
    assert.ok(rejected.every((outcome) => outcome.errorCode === "23514"));
    assert.equal(await countRows("leads", workspaceId), 50);
    record(
      "Concurrent Free lead capacity",
      `connections=${clients.length}; distinct PostgreSQL PIDs=${pids.join(",")}; created=${created.length}; rejected=${rejected.length}; final active leads=50/50`,
    );
  } finally {
    await Promise.all(clients.map((client) => client.end().catch(() => {})));
  }
};

const createInviteForAcceptance = async (owner, workspaceId, invitee) => {
  const client = newPgClient();
  const token = randomUUID();
  try {
    await client.connect();
    await prepareAuthenticatedTransaction(client, owner);
    const { rows } = await client.query(
      "select public.create_workspace_invite_with_limit($1, $2, 'member', $3, now() + interval '7 days') as invite_id",
      [workspaceId, invitee.email, token],
    );
    await client.query("commit");
    return { inviteId: rows[0].invite_id, token };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw new Error(`Could not create acceptance fixture (${error.code || "unknown"}).`);
  } finally {
    await client.end().catch(() => {});
  }
};

const runAcceptanceRace = async (owner, workspaceId, invitees) => {
  const invitations = await Promise.all(
    invitees.map((invitee) => createInviteForAcceptance(owner, workspaceId, invitee)),
  );

  const clients = invitees.map(() => newPgClient());
  const pids = [];
  try {
    await Promise.all(clients.map((client) => client.connect()));
    const prepared = await Promise.all(
      clients.map(async (client, index) => ({
        client,
        invitee: invitees[index],
        invitation: invitations[index],
        pid: await prepareAuthenticatedTransaction(client, invitees[index]),
      })),
    );
    pids.push(...prepared.map(({ pid }) => pid));
    assert.equal(new Set(pids).size, invitees.length, "PostgreSQL backend PIDs must be distinct");

    const outcomes = await Promise.all(
      prepared.map(async ({ client, invitation }) => {
        try {
          const { rows } = await client.query(
            "select workspace_id::text from public.accept_workspace_invite_with_limit($1)",
            [invitation.token],
          );
          await client.query("commit");
          return { accepted: rows.length === 1, errorCode: null };
        } catch (error) {
          await client.query("rollback").catch(() => {});
          return { accepted: false, errorCode: error.code || "unknown" };
        }
      }),
    );
    const accepted = outcomes.filter((outcome) => outcome.accepted);
    assert.equal(accepted.length, invitees.length);
    assert.equal(await countRows("workspace_members", workspaceId), 5);
    assert.equal(await countRows("workspace_invites", workspaceId), 0);
    record(
      "Concurrent invite acceptance",
      `connections=${clients.length}; distinct PostgreSQL PIDs=${pids.join(",")}; accepted=${accepted.length}; final seats=5/5`,
    );
  } finally {
    await Promise.all(clients.map((client) => client.end().catch(() => {})));
  }
};

const run = async () => {
  console.log(`Fixture marker: ${marker}`);
  console.log(`Test start: ${new Date().toISOString()}`);
  console.log("Only newly created Auth users, workspaces, memberships, subscriptions, and invites are written.");
  const inviteOwner = await createUser("invite-owner");
  const inviteWorkspace = await createWorkspace("invite-race", inviteOwner);
  await runInviteCreationRace(inviteOwner, inviteWorkspace);

  const quotaOwner = await createUser("quota-owner");
  const quotaWorkspace = await createWorkspace("quota-race", quotaOwner);
  await runUsageQuotaRace(quotaOwner, quotaWorkspace);

  const leadOwner = await createUser("lead-owner");
  const leadWorkspace = await createWorkspace("lead-race", leadOwner, "free");
  await runLeadCapacityRace(leadOwner, leadWorkspace);

  const acceptanceOwner = await createUser("accept-owner");
  const acceptanceWorkspace = await createWorkspace("accept-race", acceptanceOwner);
  const invitees = await Promise.all(
    Array.from({ length: 4 }, (_, index) => createUser(`accept-invitee-${index}`)),
  );
  await runAcceptanceRace(acceptanceOwner, acceptanceWorkspace, invitees);
};

try {
  await run();
} catch (error) {
  failure = error;
  console.error(
    "Concurrency checks failed:",
    error instanceof Error ? error.message : "Unknown failure",
  );
} finally {
  for (const workspaceId of [...createdWorkspaces].reverse()) {
    try {
      const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw error;
    } catch {
      failure ||= new Error(`Fixture workspace cleanup failed (${workspaceId}).`);
      console.error(`CLEANUP REQUIRED for test workspace id=${workspaceId}`);
    }
  }
  for (const userId of [...createdUsers].reverse()) {
    try {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    } catch {
      failure ||= new Error(`Fixture user cleanup failed (${userId}).`);
      console.error(`CLEANUP REQUIRED for test user id=${userId}`);
    }
  }
  if (!failure) {
    console.log("Fixture cleanup: PASS (all marked workspaces and Auth users deleted).");
  }
}

if (failure) process.exitCode = 1;
