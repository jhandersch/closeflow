import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.BASE_URL;
const poolerPath = "supabase/.temp/pooler-url";

if (!supabaseUrl || !publishableKey || !serviceRoleKey || !baseUrl) {
  throw new Error("Required Supabase or local application configuration is missing.");
}
const parsedBaseUrl = new URL(baseUrl);
if (
  parsedBaseUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(parsedBaseUrl.hostname)
) {
  throw new Error("AI route quota tests may only call a local loopback application.");
}
if (!existsSync(poolerPath)) {
  throw new Error("Linked Supabase pooler configuration is missing.");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const poolerUrl = new URL(readFileSync(poolerPath, "utf8").trim());
if (decodeURIComponent(poolerUrl.username).split(".").at(-1) !== projectRef) {
  throw new Error("Pooler project reference does not match the configured Supabase project.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const marker = `CLOSEFLOW-AI-QUOTA-${randomUUID()}`;
const password = `Cf_${randomUUID()}_R8!`;
const month = new Date().toISOString().slice(0, 7);
const startedAt = new Date().toISOString();
let userId;
let workspaceId;
let failure;

const cases = [
  ["/api/activity-ai", {}],
  ["/api/ai-insight", {}],
  ["/api/ai/chat", { message: "Synthetic quota probe" }],
  ["/api/ai/email-generator", {}],
  ["/api/ai/email-rewrite", { text: "Synthetic email", tone: "professional" }],
  ["/api/ai/lead-score", {}],
  ["/api/ai/meeting-prep", {}],
  ["/api/follow-up-ai", {}],
  [
    "/api/follow-up-ai/forecast-ai",
    {
      pipelineValue: 0,
      weightedRevenue: 0,
      revenueAtRisk: 0,
      pipelineCoverage: 0,
      leads: [],
    },
  ],
  ["/api/lead-memory-ai", {}],
  ["/api/leads/00000000-0000-4000-8000-000000000001/ai-analysis", {}],
  ["/api/leads/00000000-0000-4000-8000-000000000001/follow-up-ai", {}],
  ["/api/priority-ai", {}],
  ["/api/priority-analysis", {}],
  [
    "/api/revenue-forecast-ai",
    {
      leads: [{ id: "synthetic-lead", name: "Synthetic", status: "new", value: 100 }],
      forecast: {},
    },
  ],
  ["/api/sales-copilot", {}],
];

const run = async () => {
  const email = `ai-quota-${randomUUID()}@example.invalid`;
  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { closeflow_test_marker: marker },
    });
  if (createUserError || !createdUser.user?.id) {
    throw new Error(`Could not create marked Auth fixture (${createUserError?.code || "unknown"}).`);
  }
  userId = createdUser.user.id;

  const { data: createdWorkspace, error: createWorkspaceError } = await admin
    .from("workspaces")
    .insert({ name: marker, owner_id: userId, plan: "free" })
    .select("id")
    .single();
  if (createWorkspaceError || !createdWorkspace?.id) {
    throw new Error(`Could not create marked workspace (${createWorkspaceError?.code || "unknown"}).`);
  }
  workspaceId = createdWorkspace.id;
  console.log(
    `Fixture started ${startedAt}; marker=${marker}; workspace=${workspaceId}; plan=free; account=synthetic confirmed test user.`,
  );

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  if (memberError) {
    throw new Error(`Could not assign fixture owner (${memberError.code || "unknown"}).`);
  }

  const { error: usageError } = await admin.from("usage").upsert(
    {
      workspace_id: workspaceId,
      month,
      ai_requests: 10,
      exports_count: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,month" },
  );
  if (usageError) {
    throw new Error(`Could not seed fixture quota (${usageError.code || "unknown"}).`);
  }

  const { data: sessionData, error: signInError } =
    await publicClient.auth.signInWithPassword({ email, password });
  const session = sessionData.session;
  if (signInError || !session?.access_token) {
    throw new Error(`Could not authenticate fixture user (${signInError?.code || "unknown"}).`);
  }

  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const results = [];

  for (const [path, body] of cases) {
    const headers = {
      "content-type": "application/json",
      "x-closeflow-workspace-id": workspaceId,
    };
    if (path === "/api/revenue-forecast-ai") {
      headers.cookie = `${cookieName}=${cookieValue}`;
    } else {
      headers.authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    results.push({ path, status: response.status });
    assert.equal(response.status, 429, `${path} did not deny exhausted quota`);
  }

  const { data: usage, error: readUsageError } = await admin
    .from("usage")
    .select("ai_requests")
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .single();
  if (readUsageError || !usage) {
    throw new Error("Could not verify persisted fixture usage.");
  }
  assert.equal(usage.ai_requests, 10, "denied AI route calls changed the quota counter");

  const { count: eventCount, error: eventError } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .eq("bucket", "ai");
  if (eventError) {
    throw new Error("Could not verify quota event state.");
  }
  assert.equal(eventCount, 0, "denied AI route calls created usage events");

  for (const result of results) {
    console.log(`PASS ${result.status} ${result.path}`);
  }
  console.log(
    `PASS ${results.length}/${cases.length} AI routes denied at the exhausted Free quota; usage remained 10 and no usage event was created.`,
  );
};

const cleanup = async () => {
  if (workspaceId) {
    const { data: workspace, error: lookupError } = await admin
      .from("workspaces")
      .select("id,name")
      .eq("id", workspaceId)
      .maybeSingle();
    if (lookupError) {
      throw new Error("Could not verify fixture workspace before cleanup.");
    }
    if (workspace && workspace.name !== marker) {
      throw new Error("Fixture workspace identity check failed; refusing cleanup.");
    }
    if (workspace) {
      const { error: deleteError } = await admin
        .from("workspaces")
        .delete()
        .eq("id", workspaceId);
      if (deleteError) {
        throw new Error(`Could not delete fixture workspace (${deleteError.code || "unknown"}).`);
      }
      const { data: remaining, error: verifyError } = await admin
        .from("workspaces")
        .select("id")
        .eq("id", workspaceId)
        .maybeSingle();
      if (verifyError || remaining) {
        throw new Error("Fixture workspace cleanup could not be verified.");
      }
    }
  }

  if (userId) {
    const { data: authUser, error: lookupError } =
      await admin.auth.admin.getUserById(userId);
    if (lookupError) {
      throw new Error("Could not verify fixture user before cleanup.");
    }
    if (
      authUser.user &&
      authUser.user.user_metadata?.closeflow_test_marker !== marker
    ) {
      throw new Error("Fixture user identity check failed; refusing cleanup.");
    }
    if (authUser.user) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) {
        throw new Error(`Could not delete fixture user (${deleteError.code || "unknown"}).`);
      }
    }
  }
};

try {
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    await cleanup();
    if (workspaceId || userId) console.log("PASS marker-scoped fixture cleanup verified.");
  } catch (error) {
    failure = failure || error;
  }
}

if (failure) {
  console.error("AI route quota fixture run failed.");
  console.error(failure instanceof Error ? failure.message : "Unknown test error.");
  process.exitCode = 1;
}
