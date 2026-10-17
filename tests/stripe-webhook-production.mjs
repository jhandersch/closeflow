import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error(
    "Refusing production DB fixture writes without explicit authorization.",
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
const businessPriceId = process.env.STRIPE_BUSINESS_PRICE_ID;
const baseUrl = process.env.BASE_URL;
if (
  !supabaseUrl ||
  !serviceRoleKey ||
  !stripeSecretKey ||
  !webhookSecret ||
  !proPriceId ||
  !businessPriceId ||
  !baseUrl
) {
  throw new Error("Required Supabase, Stripe test-mode, or local app configuration is missing.");
}
if (!stripeSecretKey.startsWith("sk_test_")) {
  throw new Error("Refusing webhook fixture tests unless Stripe is in test mode.");
}
const parsedBaseUrl = new URL(baseUrl);
const explicitHost = process.env.CLOSEFLOW_WEBHOOK_TARGET_HOST;
const isLoopback =
  parsedBaseUrl.protocol === "http:" &&
  ["127.0.0.1", "localhost", "[::1]"].includes(parsedBaseUrl.hostname);
const isExplicitHttps =
  parsedBaseUrl.protocol === "https:" && explicitHost && parsedBaseUrl.hostname === explicitHost;
if (!isLoopback && !isExplicitHttps) {
  throw new Error(
    "Stripe webhook fixture tests may only call a loopback app or the host named in CLOSEFLOW_WEBHOOK_TARGET_HOST.",
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stripe = new Stripe(stripeSecretKey, {});
const marker = `CLOSEFLOW-STRIPE-WEBHOOK-${randomUUID()}`;
const userEmail = `closeflow-stripe-smoke-${randomUUID()}@example.invalid`;
const userPassword = `Cf_${randomUUID()}_R8!`;
const customerId = `cus_${randomUUID().replaceAll("-", "")}`;
const subscriptionId = `sub_${randomUUID().replaceAll("-", "")}`;
const startedAt = new Date().toISOString();
let userId;
let workspaceId;
let failure;

const postEvent = async (event) => {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  return fetch(new URL("/api/stripe/webhook", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
};

const eventEnvelope = (id, type, object) => ({
  id,
  object: "event",
  api_version: "2025-02-24.acacia",
  created: Math.floor(Date.now() / 1000),
  data: { object },
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  type,
});

const readSubscription = async () => {
  const { data, error } = await admin
    .from("subscriptions")
    .select("workspace_id,stripe_customer_id,stripe_subscription_id,plan,status,current_period_end")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error("Could not read synthetic subscription fixture.");
  return data;
};

const assertReceived = async (event) => {
  const response = await postEvent(event);
  assert.equal(response.status, 200, `${event.type} webhook was not accepted.`);
  const body = await response.json();
  assert.deepEqual(body, { received: true });
};

const run = async () => {
  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
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
  console.log(`Fixture started ${startedAt}; marker=${marker}; workspace=${workspaceId}; synthetic user=${userEmail}.`);

  const invalidSignature = await fetch(new URL("/api/stripe/webhook", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": "invalid" },
    body: JSON.stringify(eventEnvelope(
      `evt_${randomUUID().replaceAll("-", "")}`,
      "checkout.session.completed",
      {},
    )),
  });
  assert.equal(invalidSignature.status, 400, "Webhook accepted an invalid signature.");
  assert.equal(await readSubscription(), null, "Invalid webhook mutated the fixture.");

  const checkoutEvent = eventEnvelope(
    `evt_${randomUUID().replaceAll("-", "")}`,
    "checkout.session.completed",
    {
      id: `cs_test_${randomUUID().replaceAll("-", "")}`,
      object: "checkout.session",
      mode: "subscription",
      payment_status: "paid",
      customer: customerId,
      subscription: subscriptionId,
      metadata: { workspace_id: workspaceId, plan: "pro" },
    },
  );
  await assertReceived(checkoutEvent);
  let subscription = await readSubscription();
  assert.equal(subscription?.plan, "pro");
  assert.equal(subscription?.status, "active");
  assert.equal(subscription?.stripe_customer_id, customerId);
  assert.equal(subscription?.stripe_subscription_id, subscriptionId);

  await assertReceived(checkoutEvent);
  const { count: replayRows, error: replayError } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (replayError) throw new Error("Could not verify webhook replay state.");
  assert.equal(replayRows, 1, "Exact checkout replay created a duplicate subscription row.");

  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const subscriptionUpdated = (status, priceId, cancelAt = null) =>
    eventEnvelope(
      `evt_${randomUUID().replaceAll("-", "")}`,
      "customer.subscription.updated",
      {
        id: subscriptionId,
        object: "subscription",
        customer: customerId,
        status,
        cancel_at: cancelAt,
        items: {
          object: "list",
          data: [{
            id: `si_${randomUUID().replaceAll("-", "")}`,
            object: "subscription_item",
            current_period_end: periodEnd,
            price: { id: priceId, object: "price" },
          }],
          has_more: false,
          url: `/v1/subscription_items?subscription=${subscriptionId}`,
        },
      },
    );

  await assertReceived(subscriptionUpdated("active", businessPriceId));
  subscription = await readSubscription();
  assert.equal(subscription?.plan, "business");
  assert.equal(subscription?.status, "active");
  assert.equal(
    new Date(subscription.current_period_end).toISOString(),
    new Date(periodEnd * 1000).toISOString(),
  );

  await assertReceived(subscriptionUpdated("past_due", businessPriceId));
  subscription = await readSubscription();
  assert.equal(subscription?.plan, "business");
  assert.equal(subscription?.status, "past_due");

  await assertReceived(subscriptionUpdated("active", businessPriceId, periodEnd));
  subscription = await readSubscription();
  assert.equal(subscription?.status, "canceled");

  const deleted = subscriptionUpdated("canceled", businessPriceId);
  deleted.id = `evt_${randomUUID().replaceAll("-", "")}`;
  deleted.type = "customer.subscription.deleted";
  await assertReceived(deleted);
  subscription = await readSubscription();
  assert.equal(subscription?.status, "canceled");
  assert.equal(subscription?.plan, "business");

  console.log("PASS invalid signature rejected without DB mutation.");
  console.log("PASS checkout completion created a subscription; exact event replay stayed one row.");
  console.log("PASS subscription update, past_due, scheduled cancellation, and deletion persisted expected plan/status.");
  console.log("No Stripe API, Checkout Session, payment, email, or live Stripe event was sent.");
};

const cleanup = async () => {
  if (workspaceId) {
    const { data: workspace, error: lookupError } = await admin
      .from("workspaces")
      .select("id,name")
      .eq("id", workspaceId)
      .maybeSingle();
    if (lookupError) throw new Error("Could not verify fixture workspace before cleanup.");
    if (workspace && workspace.name !== marker) {
      throw new Error("Fixture workspace identity check failed; refusing cleanup.");
    }
    if (workspace) {
      const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw new Error("Could not delete marked webhook workspace.");
      const { data: remaining, error: verifyError } = await admin
        .from("workspaces")
        .select("id")
        .eq("id", workspaceId)
        .maybeSingle();
      if (verifyError || remaining) throw new Error("Webhook workspace cleanup failed verification.");
    }
  }
  if (userId) {
    const { data, error: lookupError } = await admin.auth.admin.getUserById(userId);
    if (lookupError) throw new Error("Could not verify fixture user before cleanup.");
    if (data.user && data.user.user_metadata?.closeflow_test_marker !== marker) {
      throw new Error("Fixture user identity check failed; refusing cleanup.");
    }
    if (data.user) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error("Could not delete marked webhook test user.");
    }
    const { data: remainingUser, error: verifyError } =
      await admin.auth.admin.getUserById(userId);
    if (remainingUser.user || (verifyError && verifyError.status !== 404)) {
      throw new Error("Webhook Auth fixture cleanup failed verification.");
    }
  }
  if (workspaceId || userId) console.log("PASS marked webhook fixtures deleted and cleanup verified.");
};

try {
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    await cleanup();
  } catch (cleanupError) {
    failure = failure || cleanupError;
  }
}

if (failure) {
  console.error("Stripe webhook fixture run failed.");
  console.error(failure instanceof Error ? failure.message : "Unknown test error.");
  process.exitCode = 1;
}
