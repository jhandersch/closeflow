import { createAdminClient } from "../supabase/admin";
import { decryptJson, encryptJson, isEncryptionConfigured } from "./crypto";
import {
  getGoogleAccessToken,
  getGoogleConfig,
  type GoogleCredentials,
} from "./google";

export type IntegrationProvider = "google" | "slack";

export async function saveIntegration(
  userId: string,
  provider: IntegrationProvider,
  credentials: unknown,
  accountLabel: string | null,
  scopes: string[] = [],
) {
  const { error } = await createAdminClient()
    .from("user_integrations")
    .upsert({
      user_id: userId,
      provider,
      encrypted_credentials: encryptJson(credentials),
      account_label: accountLabel,
      scopes,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

export async function loadIntegration<T>(userId: string, provider: IntegrationProvider) {
  const { data, error } = await createAdminClient()
    .from("user_integrations")
    .select("encrypted_credentials, account_label, scopes")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    credentials: decryptJson<T>(data.encrypted_credentials),
    accountLabel: data.account_label as string | null,
    scopes: (data.scopes ?? []) as string[],
  };
}

export async function loadIntegrationStatus(userId: string) {
  const { data, error } = await createAdminClient()
    .from("user_integrations")
    .select("provider, account_label, scopes")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteIntegration(userId: string, provider: IntegrationProvider) {
  const { error } = await createAdminClient()
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw new Error(error.message);
}

/** Returns a usable Google access token if the user granted the scope, otherwise null. */
export async function getGoogleAccessForUser(userId: string, scope: string) {
  const config = getGoogleConfig();
  if (!config || !isEncryptionConfigured()) return null;
  const integration = await loadIntegration<GoogleCredentials>(userId, "google");
  if (!integration || !integration.credentials.scopes.includes(scope)) return null;
  return getGoogleAccessToken(integration.credentials, config);
}
