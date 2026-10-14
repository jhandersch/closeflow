import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error("Refusing production Auth fixture writes without explicit authorization.");
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
if (!supabaseUrl || !publishableKey || !serviceRoleKey || !baseUrl) {
  throw new Error("Required Supabase or local application configuration is missing.");
}
const projectUrl = new URL(supabaseUrl);
if (projectUrl.protocol !== "https:" || !projectUrl.hostname.endsWith(".supabase.co")) {
  throw new Error("The recovery suite requires the configured remote Supabase project.");
}
const localAppUrl = new URL(baseUrl);
if (
  localAppUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(localAppUrl.hostname)
) {
  throw new Error("The recovery suite only accepts a local loopback BASE_URL.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const marker = `CLOSEFLOW-AUTH-RECOVERY-${randomUUID()}`;
const email = `closeflow-recovery-${randomUUID()}@example.invalid`;
const oldPassword = `Cf_${randomUUID()}_R8!`;
const newPassword = `Cf_${randomUUID()}_R9!`;
let userId;
let failure;

const run = async () => {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: oldPassword,
      email_confirm: true,
      user_metadata: { closeflow_test_marker: marker },
    });
  if (createError || !created.user?.id) {
    throw new Error(`Could not create marked recovery user (${createError?.code || "unknown"}).`);
  }
  userId = created.user.id;

  const { data: initialSession, error: initialSignInError } =
    await publicClient.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
  if (initialSignInError || !initialSession.session?.access_token) {
    throw new Error(`Initial password sign-in failed (${initialSignInError?.code || "unknown"}).`);
  }
  await publicClient.auth.signOut();

  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || baseUrl;
  const redirectTo = new URL("/login?mode=reset", redirectBase).toString();
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(`Could not generate synthetic recovery link (${linkError?.code || "unknown"}).`);
  }

  const { data: recoveryData, error: recoveryError } =
    await publicClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "recovery",
    });
  if (recoveryError || !recoveryData.session?.access_token) {
    throw new Error(`Synthetic recovery token was not accepted (${recoveryError?.code || "unknown"}).`);
  }

  const { error: passwordUpdateError } =
    await publicClient.auth.updateUser({ password: newPassword });
  if (passwordUpdateError) {
    throw new Error(`Password update with recovery session failed (${passwordUpdateError.code || "unknown"}).`);
  }
  await publicClient.auth.signOut({ scope: "global" });

  const { data: finalSession, error: finalSignInError } =
    await publicClient.auth.signInWithPassword({
      email,
      password: newPassword,
    });
  if (finalSignInError || !finalSession.session?.access_token) {
    throw new Error(`New password sign-in failed (${finalSignInError?.code || "unknown"}).`);
  }
  await publicClient.auth.signOut({ scope: "global" });

  const { data: replayData, error: replayError } =
    await publicClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "recovery",
    });
  assert.equal(replayData.session, null, "Consumed recovery token unexpectedly created another session.");
  assert(replayError, "Consumed recovery token was unexpectedly accepted.");

  console.log("PASS marked user signed in with its initial password.");
  console.log("PASS synthetic recovery token established a recovery session and changed the password.");
  console.log("PASS new password authenticated and consumed recovery token could not be replayed.");
  console.log("No recovery email was sent; the harness generated and verified the token directly.");
};

const cleanup = async () => {
  if (!userId) return;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error("Could not verify recovery fixture before cleanup.");
  if (data.user && data.user.user_metadata?.closeflow_test_marker !== marker) {
    throw new Error("Recovery fixture identity check failed; refusing cleanup.");
  }
  if (data.user) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error("Could not delete marked recovery user.");
  }
  const { data: remainingUser, error: verifyError } =
    await admin.auth.admin.getUserById(userId);
  if (remainingUser.user || (verifyError && verifyError.status !== 404)) {
    throw new Error("Recovery Auth fixture cleanup failed verification.");
  }
  console.log("PASS marked recovery Auth fixture deleted and cleanup verified.");
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
  console.error("Auth recovery fixture run failed.");
  console.error(failure instanceof Error ? failure.message : "Unknown test error.");
  process.exitCode = 1;
}
