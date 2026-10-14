import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const marker = `CLOSEFLOW-INVITE-CHECK-${randomUUID()}`;

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error(
    "Refusing DB writes. Set CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES=YES only after explicit authorization.",
  );
}

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env || match[1].startsWith("#")) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error("Required Supabase configuration is missing.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [];
const workspaces = [];
const results = [];
const password = `Cf_${randomUUID()}_A7!`;

const record = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}: ${detail}`);
};

const createTestUser = async (label) => {
  const email = `${label}.${randomUUID()}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { closeflow_test_marker: marker },
  });
  if (error || !data.user?.id) {
    throw new Error(`Could not create marked test user (${error?.code || "unknown"}).`);
  }
  users.push(data.user.id);

  const { data: sessionData, error: signInError } =
    await publicClient.auth.signInWithPassword({ email, password });
  if (signInError || !sessionData.session?.access_token) {
    throw new Error(`Could not authenticate marked test user (${signInError?.code || "unknown"}).`);
  }

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    },
  });

  return { id: data.user.id, email, client };
};

const createWorkspace = async (name, owner, plan) => {
  const { data, error } = await admin
    .from("workspaces")
    .insert({ name: `${marker}-${name}`, owner_id: owner.id, plan })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(`Could not create marked test workspace (${error?.code || "unknown"}).`);
  }
  workspaces.push(data.id);
  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: data.id,
    user_id: owner.id,
    role: "owner",
  });
  if (memberError) {
    throw new Error(`Could not assign test workspace owner (${memberError.code || "unknown"}).`);
  }

  if (plan !== "free") {
    const { error: subscriptionError } = await admin.from("subscriptions").insert({
      workspace_id: data.id,
      plan,
      status: "active",
      current_period_end: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    if (subscriptionError) {
      throw new Error(`Could not set test workspace plan (${subscriptionError.code || "unknown"}).`);
    }
  }
  return data.id;
};

const invokeCreateInvite = (actor, workspaceId, recipient, token = randomUUID()) =>
  actor.client.rpc("create_workspace_invite_with_limit", {
    p_workspace_id: workspaceId,
    p_email: recipient,
    p_role: "member",
    p_token: token,
    p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

const countRows = async (table, workspaceId) => {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(`Could not verify fixture row count (${table}).`);
  return count ?? 0;
};

const run = async () => {
  console.log(`Test marker: ${marker}`);
  console.log(`Test start: ${new Date().toISOString()}`);
  console.log("Writes are restricted to newly created marker-owned fixtures; no email API is called.");

  const roles = ["owner", "admin", "sales_manager", "sales_rep", "member", "viewer"];
  const actors = {};
  for (const role of roles) actors[role] = await createTestUser(`actor-${role}`);
  const invitee = await createTestUser("invitee");
  const expiredInvitee = await createTestUser("expired");
  const foreignOwner = await createTestUser("foreign-owner");

  const roleWorkspaceId = await createWorkspace("role-matrix", actors.owner, "business");
  const membershipRows = roles
    .filter((role) => role !== "owner")
    .map((role) => ({
      workspace_id: roleWorkspaceId,
      user_id: actors[role].id,
      role,
    }));
  const { error: membershipError } = await admin
    .from("workspace_members")
    .insert(membershipRows);
  if (membershipError) {
    throw new Error(`Could not seed role matrix (${membershipError.code || "unknown"}).`);
  }

  const roleResults = [];
  for (const role of roles) {
    const { data, error } = await invokeCreateInvite(
      actors[role],
      roleWorkspaceId,
      `recipient-${role}-${randomUUID()}@example.invalid`,
    );
    const allowed = !error && typeof data === "string";
    const expectedAllowed = ["owner", "admin", "sales_manager"].includes(role);
    roleResults.push({ role, allowed, expectedAllowed, code: error?.code || null });
    assert.equal(allowed, expectedAllowed, `Unexpected SQL invite permission for ${role}`);
  }
  record(
    "SQL invite RPC role matrix",
    true,
    roleResults.map((r) => `${r.role}=${r.allowed ? "allowed" : `denied(${r.code})`}`).join(", "),
  );

  const validInviteToken = randomUUID();
  const { data: validInviteId, error: validInviteError } = await invokeCreateInvite(
    actors.owner,
    roleWorkspaceId,
    invitee.email,
    validInviteToken,
  );
  assert.equal(validInviteError, null, "Owner should create a valid invite");
  assert.equal(typeof validInviteId, "string");

  const { data: accepted, error: acceptError } = await invitee.client.rpc(
    "accept_workspace_invite_with_limit",
    { p_token: validInviteToken },
  );
  assert.equal(acceptError, null, "Valid invite acceptance should succeed");
  const acceptedRow = Array.isArray(accepted) ? accepted[0] : accepted;
  assert.equal(acceptedRow?.workspace_id, roleWorkspaceId);
  const { data: persistedMember, error: persistedMemberError } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", roleWorkspaceId)
    .eq("user_id", invitee.id)
    .maybeSingle();
  assert.equal(persistedMemberError, null);
  assert.equal(persistedMember?.role, "member");
  const remainingInviteCount = await countRows("workspace_invites", roleWorkspaceId);
  record(
    "Valid invitation acceptance and persisted state",
    !!persistedMember && remainingInviteCount === roleResults.filter((r) => r.allowed).length,
    `member persisted=${!!persistedMember}; accepted invite removed; remaining invites=${remainingInviteCount}`,
  );

  const expiredToken = randomUUID();
  const { error: expiredInsertError } = await admin.from("workspace_invites").insert({
    workspace_id: roleWorkspaceId,
    email: expiredInvitee.email,
    role: "member",
    token: expiredToken,
    expires_at: new Date(Date.now() - 60000).toISOString(),
  });
  assert.equal(expiredInsertError, null, "Could not seed marked expired invite");
  const { data: expiredResult, error: expiredError } = await expiredInvitee.client.rpc(
    "accept_workspace_invite_with_limit",
    { p_token: expiredToken },
  );
  assert.equal(expiredResult, null);
  assert.equal(expiredError?.code, "22023");
  record("Expired invitation acceptance denied", true, `database error code=${expiredError.code}`);

  const freeWorkspaceId = await createWorkspace("free-capacity", actors.viewer, "free");
  const { data: fullResult, error: fullError } = await invokeCreateInvite(
    actors.viewer,
    freeWorkspaceId,
    `full-${randomUUID()}@example.invalid`,
  );
  assert.equal(fullResult, null);
  assert.equal(fullError?.code, "23514");
  record("Free workspace at seat limit", true, `invite denied with database error code=${fullError.code}`);

  const expiredSeatWorkspaceId = await createWorkspace(
    "expired-invite-seats",
    actors.owner,
    "pro",
  );
  for (let index = 0; index < 3; index += 1) {
    const { error } = await admin.from("workspace_invites").insert({
      workspace_id: expiredSeatWorkspaceId,
      email: `expired-seat-${index}-${randomUUID()}@example.invalid`,
      role: "member",
      token: randomUUID(),
      expires_at: new Date(Date.now() - 60000).toISOString(),
    });
    assert.equal(error, null, "Could not seed marked expired seat invitation");
  }
  const { data: expiredSeatRows, error: expiredSeatReadError } = await admin
    .from("workspace_invites")
    .select("expires_at,accepted_at")
    .eq("workspace_id", expiredSeatWorkspaceId);
  assert.equal(expiredSeatReadError, null);
  assert.equal(expiredSeatRows.length, 3);
  assert.ok(
    expiredSeatRows.every(
      (invite) =>
        invite.accepted_at === null && new Date(invite.expires_at) <= new Date(),
    ),
    "Expired seat fixtures were not persisted with expired timestamps",
  );
  const { data: quotaPlanData, error: quotaPlanError } = await actors.owner.client.rpc(
    "consume_workspace_usage",
    {
      p_workspace_id: expiredSeatWorkspaceId,
      p_month: new Date().toISOString().slice(0, 7),
      p_bucket: "ai",
      p_request_key: `invite-seat-check-${randomUUID()}`,
    },
  );
  assert.equal(quotaPlanError, null);
  const quotaPlan = Array.isArray(quotaPlanData) ? quotaPlanData[0] : quotaPlanData;
  assert.equal(quotaPlan?.plan, "pro");
  assert.equal(quotaPlan?.usage_limit, 500);
  assert.equal(await countRows("workspace_members", expiredSeatWorkspaceId), 1);
  assert.equal(await countRows("workspace_invites", expiredSeatWorkspaceId), 3);
  let seatLimitErrorCode = null;
  for (let index = 0; index < 8; index += 1) {
    const { error } = await invokeCreateInvite(
      actors.owner,
      expiredSeatWorkspaceId,
      `seat-probe-${index}-${randomUUID()}@example.invalid`,
    );
    if (error) {
      seatLimitErrorCode = error.code;
      break;
    }
  }
  const { data: seatInvites, error: seatInviteReadError } = await admin
    .from("workspace_invites")
    .select("expires_at,accepted_at")
    .eq("workspace_id", expiredSeatWorkspaceId);
  assert.equal(seatInviteReadError, null);
  const activeSeatInvites = seatInvites.filter(
    (invite) => invite.accepted_at === null && new Date(invite.expires_at) > new Date(),
  ).length;
  assert.equal(seatLimitErrorCode, "23514");
  assert.equal(
    activeSeatInvites,
    4,
    "Expired invitations must not consume Pro workspace seats",
  );
  console.log(
    `PASS expired invitations do not consume seats: 1 member + ${activeSeatInvites} active invites; cap=5.`,
  );

  const foreignWorkspaceId = await createWorkspace("foreign", foreignOwner, "business");
  const beforeForeignInvites = await countRows("workspace_invites", foreignWorkspaceId);
  const { data: foreignResult, error: foreignError } = await invokeCreateInvite(
    actors.owner,
    foreignWorkspaceId,
    `foreign-attempt-${randomUUID()}@example.invalid`,
  );
  assert.equal(foreignResult, null);
  assert.equal(foreignError?.code, "42501");
  assert.equal(await countRows("workspace_invites", foreignWorkspaceId), beforeForeignInvites);
  record("Cross-workspace invite creation denied", true, "foreign workspace invite count unchanged");

  const foreignTargetToken = randomUUID();
  const { error: foreignInviteError } = await invokeCreateInvite(
    foreignOwner,
    foreignWorkspaceId,
    actors.owner.email,
    foreignTargetToken,
  );
  assert.equal(foreignInviteError, null);
  const { data: wrongWorkspaceResult, error: wrongWorkspaceError } = await actors.admin.client.rpc(
    "accept_workspace_invite_with_limit",
    { p_token: foreignTargetToken },
  );
  assert.equal(wrongWorkspaceResult, null);
  assert.equal(wrongWorkspaceError?.code, "42501");
  assert.equal(await countRows("workspace_members", foreignWorkspaceId), 1);
  record("Cross-workspace invitation acceptance denied", true, "foreign workspace member count unchanged");

  console.log("Functional invitation checks passed. No concurrency assertion was run by this script.");
};

let failure;
try {
  await run();
} catch (error) {
  failure = error;
  console.error(
    "Functional invitation checks failed:",
    error instanceof Error ? error.message : "Unknown failure",
  );
} finally {
  for (const workspaceId of [...workspaces].reverse()) {
    try {
      const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw error;
    } catch {
      failure ||= new Error(`Fixture workspace cleanup failed (${workspaceId}).`);
      console.error(`CLEANUP REQUIRED for test workspace id=${workspaceId}`);
    }
  }
  for (const userId of [...users].reverse()) {
    try {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    } catch {
      failure ||= new Error(`Fixture user cleanup failed (${userId}).`);
      console.error(`CLEANUP REQUIRED for test user id=${userId}`);
    }
  }
  if (!failure) console.log("Fixture cleanup: PASS (all marked workspaces and users deleted).");
}

if (failure) process.exitCode = 1;
