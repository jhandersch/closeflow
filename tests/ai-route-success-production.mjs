import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (
  process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES" ||
  process.env.CLOSEFLOW_ALLOW_PRODUCTION_AI_CALL !== "YES"
) {
  throw new Error(
    "Refusing production writes/provider calls without both explicit safety flags.",
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
const openAiKey = process.env.OPENAI_API_KEY;
if (
  !supabaseUrl ||
  !publishableKey ||
  !serviceRoleKey ||
  !baseUrl ||
  !openAiKey
) {
  throw new Error("Required Supabase, OpenAI, or local application configuration is missing.");
}

const parsedSupabaseUrl = new URL(supabaseUrl);
if (
  parsedSupabaseUrl.protocol !== "https:" ||
  !parsedSupabaseUrl.hostname.endsWith(".supabase.co")
) {
  throw new Error("The configured database is not a remote Supabase project.");
}
const parsedBaseUrl = new URL(baseUrl);
if (
  parsedBaseUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(parsedBaseUrl.hostname)
) {
  throw new Error("The AI success test may only call a local loopback application.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const marker = `CLOSEFLOW-AI-SUCCESS-${randomUUID()}`;
const email = `closeflow-ai-smoke-${randomUUID()}@example.invalid`;
const password = `Cf_${randomUUID()}_R8!`;
const month = new Date().toISOString().slice(0, 7);
const runStartedAt = new Date().toISOString();
const feature = "ai_email_generator";
let userId;
let workspaceId;
let routeRequestStarted = false;
let failure;

const run = async () => {
  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { closeflow_test_marker: marker },
    });
  if (createUserError || !createdUser.user?.id) {
    throw new Error(
      `Could not create marked Auth fixture (${createUserError?.code || "unknown"}).`,
    );
  }
  userId = createdUser.user.id;

  const { data: createdWorkspace, error: createWorkspaceError } = await admin
    .from("workspaces")
    .insert({ name: marker, owner_id: userId, plan: "free" })
    .select("id")
    .single();
  if (createWorkspaceError || !createdWorkspace?.id) {
    throw new Error(
      `Could not create marked workspace (${createWorkspaceError?.code || "unknown"}).`,
    );
  }
  workspaceId = createdWorkspace.id;

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  if (memberError) {
    throw new Error(
      `Could not assign fixture owner (${memberError.code || "unknown"}).`,
    );
  }

  const { error: usageError } = await admin.from("usage").insert({
    workspace_id: workspaceId,
    month,
    ai_requests: 0,
    exports_count: 0,
    updated_at: new Date().toISOString(),
  });
  if (usageError) {
    throw new Error(
      `Could not initialize fixture quota (${usageError.code || "unknown"}).`,
    );
  }

  const { data: sessionData, error: signInError } =
    await publicClient.auth.signInWithPassword({ email, password });
  const session = sessionData.session;
  if (signInError || !session?.access_token) {
    throw new Error(
      `Could not authenticate fixture user (${signInError?.code || "unknown"}).`,
    );
  }

  const { data: initialUsage, error: initialUsageError } = await admin
    .from("usage")
    .select("ai_requests")
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .single();
  if (initialUsageError || initialUsage?.ai_requests !== 0) {
    throw new Error("Fixture quota did not start at zero; refusing the provider call.");
  }

  const projectRef = parsedSupabaseUrl.hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const requestStartedAt = new Date().toISOString();

  routeRequestStarted = true;
  const response = await fetch(new URL("/api/ai/email-generator", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.access_token}`,
      "x-closeflow-workspace-id": workspaceId,
      cookie: `${cookieName}=${cookieValue}`,
    },
    body: JSON.stringify({
      goal: "Prepare a short follow-up",
      tone: "professional",
      lead: {
        id: randomUUID(),
        name: "Synthetic smoke-test contact",
        company: "CloseFlow synthetic test",
        status: "proposal",
        value: 0,
      },
    }),
  });

  assert.equal(response.status, 200, "AI route did not return success.");
  const payload = await response.json();
  assert.equal(typeof payload.subject, "string");
  assert.ok(payload.subject.trim().length > 0, "AI route returned no subject.");
  assert.equal(typeof payload.body, "string");
  assert.ok(payload.body.trim().length > 0, "AI route returned no email body.");

  const { data: finalUsage, error: finalUsageError } = await admin
    .from("usage")
    .select("ai_requests")
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .single();
  if (finalUsageError || !finalUsage) {
    throw new Error("Could not verify persisted AI quota usage.");
  }
  assert.equal(finalUsage.ai_requests, 1, "AI quota did not increase exactly once.");

  const { count: quotaEventCount, error: quotaEventError } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .eq("bucket", "ai");
  if (quotaEventError) {
    throw new Error("Could not verify persisted AI quota event.");
  }
  assert.equal(quotaEventCount, 1, "Expected exactly one persisted AI quota event.");

  const { data: auditEvents, error: auditError } = await admin
    .from("audit_logs")
    .select("id, actor_user_id, event_type, payload, created_at")
    .eq("workspace_id", workspaceId)
    .eq("actor_user_id", userId)
    .eq("event_type", "ai.usage")
    .contains("payload", { feature })
    .gte("created_at", requestStartedAt)
    .limit(2);
  if (auditError) {
    throw new Error("Could not read the persisted AI usage audit event.");
  }
  assert.equal(auditEvents?.length, 1, "Expected exactly one AI usage audit event.");

  const usage = auditEvents[0].payload;
  assert.equal(typeof usage.model, "string");
  assert.ok(usage.model.startsWith("gpt-4.1-mini"));
  assert.ok(Number.isSafeInteger(usage.prompt_tokens) && usage.prompt_tokens > 0);
  assert.ok(Number.isSafeInteger(usage.completion_tokens) && usage.completion_tokens > 0);
  assert.equal(
    usage.total_tokens,
    usage.prompt_tokens + usage.completion_tokens,
  );
  assert.equal(typeof usage.cost_usd, "number");
  assert.ok(Number.isFinite(usage.cost_usd) && usage.cost_usd >= 0);

  const outputCost =
    (usage.prompt_tokens / 1_000_000) * 0.4 +
    (usage.completion_tokens / 1_000_000) * 1.6;
  const expectedCost = Math.round(outputCost * 1_000_000) / 1_000_000;
  assert.equal(usage.cost_usd, expectedCost, "Persisted model cost did not match configured pricing.");

  console.log(`PASS AI route returned a non-empty synthetic email; HTTP ${response.status}.`);
  console.log("PASS exactly one AI quota event and one usage/cost audit event persisted.");
  console.log(
    `Evidence: started=${runStartedAt}; workspace=${workspaceId}; user=${userId}; account=${email}; model=${usage.model}; input_tokens=${usage.prompt_tokens}; output_tokens=${usage.completion_tokens}; cost_usd=${usage.cost_usd}.`,
  );
  console.log("The explicitly authorized synthetic workspace/account and one quota/audit event are retained.");
};

try {
  await run();
} catch (error) {
  failure = error;
} finally {
  if (!routeRequestStarted && (workspaceId || userId)) {
    try {
      if (workspaceId) {
        const { data: workspace, error: lookupError } = await admin
          .from("workspaces")
          .select("id,name")
          .eq("id", workspaceId)
          .maybeSingle();
        if (lookupError) throw new Error("Could not verify fixture before cleanup.");
        if (workspace && workspace.name !== marker) {
          throw new Error("Fixture identity check failed; refusing cleanup.");
        }
        if (workspace) {
          const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);
          if (error) throw new Error("Could not remove pre-call workspace fixture.");
        }
      }
      if (userId) {
        const { data, error: lookupError } = await admin.auth.admin.getUserById(userId);
        if (lookupError) throw new Error("Could not verify fixture user before cleanup.");
        if (
          data.user &&
          data.user.user_metadata?.closeflow_test_marker !== marker
        ) {
          throw new Error("Fixture user identity check failed; refusing cleanup.");
        }
        if (data.user) {
          const { error } = await admin.auth.admin.deleteUser(userId);
          if (error) throw new Error("Could not remove pre-call Auth fixture.");
        }
      }
      console.log("PASS pre-call fixture cleanup verified; no provider request was started.");
    } catch (cleanupError) {
      failure = failure || cleanupError;
    }
  } else if (routeRequestStarted && failure) {
    console.error(
      "The single route request was started; fixtures are retained to preserve any provider/audit outcome.",
    );
  }
}

if (failure) {
  console.error("AI route success fixture run failed.");
  console.error(failure instanceof Error ? failure.message : "Unknown test error.");
  process.exitCode = 1;
}
