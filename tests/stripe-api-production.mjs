import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

if (
  process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES" ||
  process.env.CLOSEFLOW_ALLOW_STRIPE_TEST_MODE_WRITES !== "YES"
) {
  throw new Error("Refusing Stripe/Supabase fixture writes without both explicit safety flags.");
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
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
const businessPriceId = process.env.STRIPE_BUSINESS_PRICE_ID;
const baseUrl = process.env.BASE_URL;
if (
  !supabaseUrl ||
  !publishableKey ||
  !serviceRoleKey ||
  !stripeSecretKey ||
  !proPriceId ||
  !businessPriceId ||
  !baseUrl
) {
  throw new Error("Required Supabase, Stripe test-mode, or local application configuration is missing.");
}
if (!stripeSecretKey.startsWith("sk_test_")) {
  throw new Error("Refusing Stripe API fixture tests unless the configured key is test-mode.");
}
const parsedSupabaseUrl = new URL(supabaseUrl);
if (
  parsedSupabaseUrl.protocol !== "https:" ||
  !parsedSupabaseUrl.hostname.endsWith(".supabase.co")
) {
  throw new Error("The Stripe API suite requires the configured remote Supabase project.");
}
const parsedBaseUrl = new URL(baseUrl);
if (
  parsedBaseUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(parsedBaseUrl.hostname)
) {
  throw new Error("The Stripe API suite may only call a local loopback application.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stripe = new Stripe(stripeSecretKey, {});
const marker = `CLOSEFLOW-STRIPE-API-${randomUUID()}`;
const email = `closeflow-stripe-api-${randomUUID()}@example.invalid`;
const password = `Cf_${randomUUID()}_R8!`;
let userId;
let workspaceId;
let stripeCustomerId;
let stripeSubscriptionId;
let checkoutSessionId;
let failure;

const base32Decode = (value) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let buffer = 0;
  let bits = 0;
  const bytes = [];
  for (const character of value.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret encoding.");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
};

const totp = (secret) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1_000_000;
  return String(code).padStart(6, "0");
};

const apiPost = async (path, body) => {
  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  return { response, result };
};

let accessToken;

const run = async () => {
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

  const { data: createdWorkspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({ name: marker, owner_id: userId, plan: "free" })
    .select("id")
    .single();
  if (workspaceError || !createdWorkspace?.id) {
    throw new Error(`Could not create marked workspace (${workspaceError?.code || "unknown"}).`);
  }
  workspaceId = createdWorkspace.id;

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  if (memberError) throw new Error(`Could not assign fixture owner (${memberError.code || "unknown"}).`);

  const { data: authData, error: authError } =
    await publicClient.auth.signInWithPassword({ email, password });
  if (authError || !authData.session?.access_token) {
    throw new Error(`Could not authenticate fixture user (${authError?.code || "unknown"}).`);
  }

  const { data: factorData, error: enrollError } =
    await publicClient.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `CloseFlow release fixture ${marker}`,
    });
  if (enrollError || !factorData.id || !factorData.totp?.secret) {
    throw new Error(`Could not enroll fixture TOTP (${enrollError?.code || "unknown"}).`);
  }
  const { data: challengeData, error: challengeError } =
    await publicClient.auth.mfa.challenge({ factorId: factorData.id });
  if (challengeError || !challengeData.id) {
    throw new Error(`Could not challenge fixture TOTP (${challengeError?.code || "unknown"}).`);
  }
  const { data: verifiedData, error: verifyError } =
    await publicClient.auth.mfa.verify({
      factorId: factorData.id,
      challengeId: challengeData.id,
      code: totp(factorData.totp.secret),
    });
  if (verifyError || !verifiedData.access_token) {
    throw new Error(`Could not verify fixture TOTP (${verifyError?.code || "unknown"}).`);
  }
  accessToken = verifiedData.access_token;
  const tokenPayload = JSON.parse(
    Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"),
  );
  assert.equal(tokenPayload.aal, "aal2", "Fixture token did not reach AAL2.");

  const { response: checkoutResponse, result: checkoutResult } = await apiPost(
    "/api/stripe/create-checkout",
    { plan: "pro" },
  );
  assert.equal(checkoutResponse.status, 200, "Checkout session API request failed.");
  assert.match(checkoutResult.checkoutUrl || "", /^https:\/\/checkout\.stripe\.com\//);
  const checkoutMatch = checkoutResult.checkoutUrl.match(/(cs_test_[A-Za-z0-9]+)/);
  assert(checkoutMatch, "Checkout URL did not contain a test-mode session ID.");
  checkoutSessionId = checkoutMatch[1];
  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  assert.equal(checkoutSession.mode, "subscription");
  assert.equal(checkoutSession.livemode, false);
  assert.equal(checkoutSession.metadata?.workspace_id, workspaceId);
  assert.equal(checkoutSession.metadata?.plan, "pro");
  const checkoutLineItems = await stripe.checkout.sessions.listLineItems(checkoutSessionId);
  assert.equal(checkoutLineItems.data[0]?.price?.id, proPriceId);

  const customer = await stripe.customers.create({
    email,
    metadata: { closeflow_test_marker: marker },
  });
  stripeCustomerId = customer.id;

  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: proPriceId }],
    trial_period_days: 7,
    metadata: { closeflow_test_marker: marker, workspace_id: workspaceId },
  });
  stripeSubscriptionId = subscription.id;
  assert.equal(subscription.status, "trialing");
  assert.equal(subscription.livemode, false);

  const { error: subscriptionRowError } = await admin
    .from("subscriptions")
    .insert({
      workspace_id: workspaceId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      plan: "pro",
      status: "trialing",
    });
  if (subscriptionRowError) {
    throw new Error(`Could not attach marked test subscription (${subscriptionRowError.code || "unknown"}).`);
  }

  const { response: portalResponse, result: portalResult } = await apiPost(
    "/api/stripe/create-portal",
    {},
  );
  assert.equal(portalResponse.status, 200, "Billing portal API request failed.");
  assert.match(portalResult.portalUrl || "", /^https:\/\/billing\.stripe\.com\//);

  const { response: upgradeResponse, result: upgradeResult } = await apiPost(
    "/api/stripe/change-plan",
    { plan: "business" },
  );
  assert.equal(upgradeResponse.status, 200, "Business plan change API request failed.");
  assert.equal(upgradeResult.success, true);
  assert.equal(upgradeResult.plan, "business");
  let currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  assert.equal(currentSubscription.items.data[0]?.price.id, businessPriceId);
  assert.equal(currentSubscription.cancel_at_period_end, false);

  const { response: cancelResponse, result: cancelResult } = await apiPost(
    "/api/stripe/change-plan",
    { plan: "free" },
  );
  assert.equal(cancelResponse.status, 200, "Scheduled cancellation API request failed.");
  assert.equal(cancelResult.success, true);
  assert.equal(cancelResult.plan, "free");
  currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  assert.equal(currentSubscription.cancel_at_period_end, true);

  const { response: deleteWorkspaceResponse, result: deleteWorkspaceResult } =
    await apiPost("/api/workspaces/delete", {
      workspace_id: workspaceId,
    });
  assert.equal(
    deleteWorkspaceResponse.status,
    200,
    `Workspace deletion API request failed: ${deleteWorkspaceResult.error || "unknown error"}.`,
  );
  assert.equal(deleteWorkspaceResult.ok, true);
  const { data: deletedWorkspace, error: deletedWorkspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (deletedWorkspaceError) {
    throw new Error("Could not verify fixture workspace deletion.");
  }
  assert.equal(deletedWorkspace, null, "Workspace deletion API left the workspace behind.");
  const { data: deletedSubscription, error: deletedSubscriptionError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (deletedSubscriptionError) {
    throw new Error("Could not verify fixture subscription deletion.");
  }
  assert.equal(
    deletedSubscription,
    null,
    "Workspace deletion API left its subscription behind.",
  );

  console.log("PASS real Stripe test-mode Checkout API created a Pro subscription session with correct workspace/plan metadata.");
  console.log("PASS authenticated AAL2 owner received a Stripe Billing Portal session.");
  console.log("PASS test-trial subscription changed Pro → Business and scheduled Free cancellation via the application API.");
  console.log("PASS authenticated AAL2 owner deleted the workspace and cascaded its subscription row.");
  console.log("No live-mode Stripe API, payment method, charge, or email was used; the trial subscription and checkout are removed during cleanup.");
};

const cleanup = async () => {
  const cleanupErrors = [];
  if (checkoutSessionId) {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      if (checkout.status === "open") {
        await stripe.checkout.sessions.expire(checkoutSessionId);
      }
      const verified = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      if (verified.status === "open") throw new Error("Checkout remains open.");
    } catch {
      cleanupErrors.push("Stripe Checkout session expiration");
    }
  }
  if (stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (!["canceled", "incomplete_expired"].includes(subscription.status)) {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      }
      const verified = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (verified.status !== "canceled") throw new Error("Subscription remains active.");
    } catch {
      cleanupErrors.push("Stripe test subscription cancellation");
    }
  }
  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (!customer.deleted) {
        await stripe.customers.del(stripeCustomerId);
      }
      const verified = await stripe.customers.retrieve(stripeCustomerId);
      if (!verified.deleted) throw new Error("Customer remains active.");
    } catch {
      cleanupErrors.push("Stripe test customer deletion");
    }
  }
  if (workspaceId) {
    try {
      const { error: subscriptionDeleteError } = await admin
        .from("subscriptions")
        .delete()
        .eq("workspace_id", workspaceId);
      if (subscriptionDeleteError) {
        throw new Error("Could not delete marked subscription row.");
      }
      const { data: remainingSubscription, error: subscriptionVerifyError } =
        await admin
          .from("subscriptions")
          .select("id")
          .eq("workspace_id", workspaceId)
          .maybeSingle();
      if (subscriptionVerifyError || remainingSubscription) {
        throw new Error("Marked subscription row remains.");
      }
      const { data: workspace, error } = await admin
        .from("workspaces")
        .select("id,name")
        .eq("id", workspaceId)
        .maybeSingle();
      if (error) throw new Error("Workspace lookup failed.");
      if (workspace && workspace.name !== marker) {
        throw new Error("Workspace identity mismatch.");
      }
      if (workspace) {
        const { error: deleteError } = await admin
          .from("workspaces")
          .delete()
          .eq("id", workspaceId);
        if (deleteError) throw new Error("Workspace deletion failed.");
        const { data: remaining, error: verifyError } = await admin
          .from("workspaces")
          .select("id")
          .eq("id", workspaceId)
          .maybeSingle();
        if (verifyError || remaining) throw new Error("Workspace remains.");
      }
    } catch {
      cleanupErrors.push("marked workspace deletion");
    }
  }
  if (userId) {
    try {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw new Error("Auth user lookup failed.");
      if (data.user && data.user.user_metadata?.closeflow_test_marker !== marker) {
        throw new Error("Auth user identity mismatch.");
      }
      if (data.user) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
        if (deleteError) throw new Error("Auth user deletion failed.");
      }
      const { data: remainingUser, error: verifyError } =
        await admin.auth.admin.getUserById(userId);
      if (remainingUser.user || (verifyError && verifyError.status !== 404)) {
        throw new Error("Auth user remains.");
      }
    } catch {
      cleanupErrors.push("marked Auth-user deletion");
    }
  }
  if (workspaceId || userId || stripeCustomerId || checkoutSessionId) {
    console.log("PASS marked Stripe/Auth/workspace fixtures cleaned up and verified.");
  }
  if (cleanupErrors.length) {
    throw new Error(`Fixture cleanup incomplete: ${cleanupErrors.join(", ")}.`);
  }
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
  console.error("Stripe API fixture run failed.");
  console.error(failure instanceof Error ? failure.message : "Unknown test error.");
  process.exitCode = 1;
}
