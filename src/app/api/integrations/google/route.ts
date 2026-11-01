import { NextResponse } from "next/server";

import { isEncryptionConfigured, signOAuthState } from "@/lib/integrations/crypto";
import { buildGoogleAuthUrl, getGoogleConfig, revokeGoogleToken, type GoogleCredentials } from "@/lib/integrations/google";
import { deleteIntegration, loadIntegration } from "@/lib/integrations/store";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(request: Request) {
  const { user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = getGoogleConfig();
  if (!config || !isEncryptionConfigured()) {
    return NextResponse.json({ error: "Google integration is not configured." }, { status: 503 });
  }
  return NextResponse.json({ url: buildGoogleAuthUrl(config, signOAuthState(user.id)) });
}

export async function DELETE(request: Request) {
  const { user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const existing = await loadIntegration<GoogleCredentials>(user.id, "google");
    if (existing) await revokeGoogleToken(existing.credentials.refreshToken);
    await deleteIntegration(user.id, "google");
  } catch (deleteError) {
    console.error("Google integration delete failed:", deleteError);
    return NextResponse.json({ error: "Could not disconnect Google." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
