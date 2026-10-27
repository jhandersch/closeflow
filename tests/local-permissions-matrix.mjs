// Role and workspace-switching matrix against a LOCAL Supabase stack and a LOCAL Next.js server.
// Covers smoke-run B22 (permissions matrix, server side) and B23 (workspace switching, data isolation).
// Required env: LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL.
// Refuses to run unless both targets are loopback. Never reads .env.local.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_KEY, LOCAL_SUPABASE_PUBLIC_KEY, BASE_URL } = process.env;
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_SERVICE_KEY || !LOCAL_SUPABASE_PUBLIC_KEY || !BASE_URL) {
  throw new Error("Missing local test configuration.");
}
for (const u of [LOCAL_SUPABASE_URL, BASE_URL]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(u).hostname)) {
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

const userIds = [];
const workspaceIds = [];
const makeUser = async (tag) => {
  const email = `closeflow-local-${tag}-${randomUUID()}@example.invalid`;
  const password = `Cf_${randomUUID()}_R8!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  userIds.push(data.user.id);
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_PUBLIC_KEY, authOpts);
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signInError);
  return { id: data.user.id, token: session.session.access_token, db: client };
};
const makeWorkspace = async (owner, tag, plan = "business") => {
  const ws = await admin.from("workspaces").insert({ name: `LOCAL-${tag}`, owner_id: owner.id, plan }).select("id").single();
  assert.ifError(ws.error);
  workspaceIds.push(ws.data.id);
  return ws.data.id;
};
const join = async (workspaceId, user, role) => {
  const r = await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: user.id, role });
  assert.ifError(r.error);
};
const call = (user, method, path, body, cookie) =>
  fetch(new URL(path, BASE_URL), {
    method,
    headers: {
      ...(user ? { authorization: `Bearer ${user.token}` } : {}),
      ...(cookie ? { cookie: `closeflow_active_workspace=${cookie}` } : {}),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const leadNames = async (user, cookie) => {
  const r = await call(user, "GET", "/api/leads?includeCompleted=true", undefined, cookie);
  assert.equal(r.status, 200);
  return (await r.json()).map((l) => l.name).sort();
};
const seedLead = async (workspaceId, userId, name) => {
  const r = await admin.from("leads").insert({ workspace_id: workspaceId, user_id: userId, name, company: `${name} Co`, status: "new", value: 1 });
  assert.ifError(r.error);
};

try {
  const owner = await makeUser("owner");
  const adminUser = await makeUser("admin");
  const salesManager = await makeUser("salesmgr");
  const member = await makeUser("member");
  const viewer = await makeUser("viewer");
  const outsider = await makeUser("outsider");
  const W1 = await makeWorkspace(owner, "w1");
  await join(W1, owner, "owner");
  await join(W1, adminUser, "admin");
  await join(W1, salesManager, "sales_manager");
  await join(W1, member, "member");
  await join(W1, viewer, "viewer");
  const W2 = await makeWorkspace(outsider, "w2");
  await join(W2, outsider, "owner");

  // B22: permissions matrix
  await check("owner, admin and member may create leads; viewer may only read", async () => {
    for (const [label, user, expected] of [["owner", owner, 200], ["admin", adminUser, 200], ["member", member, 200], ["viewer", viewer, 403]]) {
      const r = await call(user, "POST", "/api/leads", { name: `Role ${label}`, company: `Role ${label} Co`, status: "new", value: 1 }, W1);
      assert.equal(r.status, expected, `${label}: ${r.status} ${await r.text()}`);
    }
    for (const user of [owner, adminUser, member, viewer]) assert.equal((await call(user, "GET", "/api/leads", undefined, W1)).status, 200);
  });

  await check("only the owner may change workspace settings (admin, sales manager, member, viewer cannot)", async () => {
    for (const [label, user, shouldChange] of [["admin", adminUser, false], ["sales_manager", salesManager, false], ["member", member, false], ["viewer", viewer, false], ["owner", owner, true]]) {
      const r = await user.db.from("workspaces").update({ name: `LOCAL-w1-${label}` }).eq("id", W1).select("id");
      assert.ifError(r.error);
      assert.equal(r.data.length, shouldChange ? 1 : 0, `${label} rows changed: ${r.data.length}`);
    }
    const takeover = await adminUser.db.from("workspaces").update({ owner_id: adminUser.id }).eq("id", W1).select("id");
    assert.ok(takeover.error || takeover.data.length === 0, "admin must not take over ownership");
    const stored = await admin.from("workspaces").select("owner_id").eq("id", W1).single();
    assert.equal(stored.data.owner_id, owner.id);
  });

  await check("invitations: owner may invite any role, admin only non-privileged roles, member/viewer none", async () => {
    const invite = (user, role) =>
      user.db.rpc("create_workspace_invite_with_limit", {
        p_workspace_id: W1,
        p_email: `${randomUUID()}@example.invalid`,
        p_role: role,
        p_token: randomUUID(),
        p_expires_at: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.ifError((await invite(owner, "owner")).error, "owner -> owner");
    assert.ifError((await invite(owner, "admin")).error, "owner -> admin");
    assert.ok((await invite(adminUser, "owner")).error, "admin must not invite owner");
    assert.ok((await invite(adminUser, "admin")).error, "admin must not invite admin");
    assert.ifError((await invite(adminUser, "member")).error, "admin -> member");
    assert.ok((await invite(member, "viewer")).error, "member must not invite");
    assert.ok((await invite(viewer, "viewer")).error, "viewer must not invite");
    const direct = await member.db.from("workspace_invites").insert({ workspace_id: W1, email: "x@example.invalid", role: "owner", token: randomUUID() });
    assert.ok(direct.error, "direct invite insert by member must be blocked");
    for (const [label, user] of [["admin", adminUser], ["sales_manager", salesManager]]) {
      const bypass = await user.db.from("workspace_invites").insert({ workspace_id: W1, email: `${label}@example.invalid`, role: "owner", token: randomUUID() });
      assert.ok(bypass.error, `${label} must not insert invites directly (bypasses role checks and seat limit)`);
    }
    const leftover = await admin.from("workspace_invites").select("id").eq("workspace_id", W1).in("email", ["admin@example.invalid", "sales_manager@example.invalid", "x@example.invalid"]);
    assert.equal(leftover.data.length, 0);
  });

  await check("memberships: nobody can add members, promote to owner or touch the owner directly", async () => {
    for (const [label, user] of [["owner", owner], ["admin", adminUser], ["sales_manager", salesManager], ["member", member]]) {
      const ins = await user.db.from("workspace_members").insert({ workspace_id: W1, user_id: outsider.id, role: "member" });
      assert.ok(ins.error, `${label} must not insert memberships directly`);
    }
    const ownerRow = await admin.from("workspace_members").select("role").eq("workspace_id", W1).eq("user_id", owner.id).single();
    assert.equal(ownerRow.data.role, "owner");
    for (const [label, user] of [["admin", adminUser], ["sales_manager", salesManager]]) {
      const demote = await user.db.from("workspace_members").update({ role: "viewer" }).eq("workspace_id", W1).eq("user_id", owner.id).select("role");
      assert.ok(demote.error || demote.data.length === 0, `${label} must not demote the owner`);
      const kick = await user.db.from("workspace_members").delete().eq("workspace_id", W1).eq("user_id", owner.id).select("role");
      assert.ok(kick.error || kick.data.length === 0, `${label} must not remove the owner`);
    }
    const sm = await salesManager.db.from("workspace_members").update({ role: "viewer" }).eq("workspace_id", W1).eq("user_id", member.id).select("role");
    assert.ok(sm.error || sm.data.length === 0, "sales_manager must not change roles directly");
    const stillOwner = await admin.from("workspace_members").select("role").eq("workspace_id", W1).eq("user_id", owner.id).single();
    assert.equal(stillOwner.data.role, "owner");
  });

  await check("admins manage only non-admin members; the owner may manage admins but never assign owner", async () => {
    const setRole = (user, target, role) =>
      user.db.from("workspace_members").update({ role }).eq("workspace_id", W1).eq("user_id", target.id).select("role");
    const asAdmin = await setRole(adminUser, member, "viewer");
    assert.ifError(asAdmin.error);
    assert.equal(asAdmin.data.length, 1, "admin may demote a member");
    const promote = await setRole(adminUser, member, "admin");
    assert.ok(promote.error || promote.data.length === 0, "admin must not create admins");
    const toOwner = await setRole(owner, member, "owner");
    assert.ok(toOwner.error || toOwner.data.length === 0, "nobody may assign owner");
    const ownerPromotes = await setRole(owner, member, "admin");
    assert.ifError(ownerPromotes.error);
    assert.equal(ownerPromotes.data.length, 1, "owner may create admins");
    const adminOnAdmin = await setRole(adminUser, member, "viewer");
    assert.ok(adminOnAdmin.error || adminOnAdmin.data.length === 0, "admin must not touch other admins");
    const selfEscalate = await setRole(adminUser, adminUser, "owner");
    assert.ok(selfEscalate.error || selfEscalate.data.length === 0, "admin must not escalate self");
    const ownerRestores = await setRole(owner, member, "member");
    assert.ifError(ownerRestores.error);
    const rows = await admin.from("workspace_members").select("user_id").eq("workspace_id", W1);
    assert.ok(rows.data.some((r) => r.user_id === owner.id));
  });

  await check("members cannot escalate their own role or add members directly", async () => {
    for (const [label, user] of [["member", member], ["viewer", viewer], ["admin", adminUser]]) {
      const up = await user.db.from("workspace_members").update({ role: "owner" }).eq("workspace_id", W1).eq("user_id", user.id).select("role");
      assert.ok(up.error || up.data.length === 0, `${label} escalated own role`);
    }
    const ins = await member.db.from("workspace_members").insert({ workspace_id: W1, user_id: outsider.id, role: "owner" });
    assert.ok(ins.error, "member must not add members");
    const stored = await admin.from("workspace_members").select("role").eq("workspace_id", W1).eq("user_id", member.id).single();
    assert.equal(stored.data.role, "member");
  });

  await check("admin pages: platform admin API is forbidden for workspace owner, admin and member", async () => {
    for (const user of [owner, adminUser, salesManager, member, viewer]) {
      for (const path of ["/api/admin/overview", "/api/admin/users"]) {
        const r = await call(user, "GET", path);
        assert.ok([401, 403].includes(r.status), `${path} returned ${r.status}`);
      }
    }
    assert.equal((await call(null, "GET", "/api/admin/overview")).status, 401);
  });

  await check("member API authorization: privileged workspace routes refuse members and outsiders", async () => {
    for (const [path, body] of [
      ["/api/workspaces/invite", { workspace_id: W1, email: "n@example.invalid", role: "member" }],
      ["/api/workspaces/update-role", { workspace_id: W1, user_id: viewer.id, role: "admin" }],
      ["/api/workspaces/remove-member", { workspace_id: W1, user_id: viewer.id }],
      ["/api/workspaces/delete", { workspace_id: W1 }],
    ]) {
      for (const user of [member, viewer, outsider]) {
        const r = await call(user, "POST", path, body);
        assert.ok([400, 401, 403, 404].includes(r.status), `${path} as non-manager returned ${r.status}`);
      }
    }
    const members = await admin.from("workspace_members").select("user_id").eq("workspace_id", W1);
    assert.equal(members.data.length, 5, "membership must be unchanged");
  });

  // B23: workspace switching and data isolation
  const dual = await makeUser("dual");
  const WA = await makeWorkspace(dual, "wa");
  await join(WA, dual, "owner");
  const WB = await makeWorkspace(outsider, "wb");
  await join(WB, outsider, "owner");
  await join(WB, dual, "member");
  await seedLead(WA, dual.id, "Alpha Lead");
  await seedLead(WB, outsider.id, "Beta Lead");
  await seedLead(W2, outsider.id, "Foreign Lead");

  await check("switching workspace changes the lead list; no cookie uses the oldest membership", async () => {
    assert.deepEqual(await leadNames(dual, WA), ["Alpha Lead"]);
    assert.deepEqual(await leadNames(dual, WB), ["Beta Lead"]);
    assert.deepEqual(await leadNames(dual), ["Alpha Lead"]);
    assert.deepEqual(await leadNames(dual, WA), ["Alpha Lead"], "switching back and refreshing stays stable");
  });

  await check("a cookie for a workspace the user is not a member of never leaks its data", async () => {
    const names = await leadNames(dual, W2);
    assert.ok(!names.includes("Foreign Lead"), `leaked: ${names}`);
    assert.deepEqual(names, ["Alpha Lead"]);
    const forged = await call(dual, "GET", "/api/leads?includeCompleted=true", undefined, "not-a-uuid");
    assert.ok([200, 403, 500].includes(forged.status));
    if (forged.status === 200) assert.ok(!(await forged.json()).some((l) => l.name === "Foreign Lead"));
  });

  await check("direct database reads are isolated per workspace for the same user", async () => {
    const own = await dual.db.from("leads").select("name");
    assert.ifError(own.error);
    assert.deepEqual(own.data.map((l) => l.name).sort(), ["Alpha Lead", "Beta Lead"]);
    const foreign = await dual.db.from("leads").select("name").eq("workspace_id", W2);
    assert.deepEqual(foreign.data, []);
  });

  await check("customers export and calendar events follow the active workspace", async () => {
    const resA = await call(dual, "GET", "/api/customers/export", undefined, WA);
    const resB = await call(dual, "GET", "/api/customers/export", undefined, WB);
    const exportA = await resA.text();
    const exportB = await resB.text();
    assert.equal(resA.status, 200, exportA);
    assert.equal(resB.status, 200, exportB);
    assert.match(exportA, /Alpha Lead Co/);
    assert.ok(!/Beta Lead Co/.test(exportA));
    assert.match(exportB, /Beta Lead Co/);
    assert.ok(!/Alpha Lead Co/.test(exportB));
    for (const ws of [WA, WB]) assert.equal((await call(dual, "GET", "/api/calendar/events", undefined, ws)).status, 200);
  });

  await check("writes after switching land in the active workspace only", async () => {
    const r = await call(dual, "POST", "/api/leads", { name: "Switched Write", company: "Switched Co", status: "new", value: 1 }, WB);
    assert.equal(r.status, 200, await r.text());
    const inA = await admin.from("leads").select("id").eq("workspace_id", WA).eq("name", "Switched Write");
    const inB = await admin.from("leads").select("id").eq("workspace_id", WB).eq("name", "Switched Write");
    assert.equal(inA.data.length, 0);
    assert.equal(inB.data.length, 1);
  });
} finally {
  for (const id of workspaceIds) await admin.from("workspaces").delete().eq("id", id);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}

console.log(failures ? `FAILED: ${failures}` : "ALL PASS");
process.exit(failures ? 1 : 0);
