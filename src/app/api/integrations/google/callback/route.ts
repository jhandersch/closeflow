import { NextResponse } from "next/server";

import { isEncryptionConfigured, verifyOAuthState } from "@/lib/integrations/crypto";
import { exchangeGoogleCode, getGoogleConfig } from "@/lib/integrations/google";
import { saveIntegration } from "@/lib/integrations/store";
import { getRouteUser } from "@/lib/supabase/route";

const settingsUrl = (request: Request, result: string) =>
  new URL(`/settings?integration=${result}#integrations`, request.url);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const config = getGoogleConfig();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (searchParams.get("error") || !code) {
    return NextResponse.redirect(settingsUrl(request, "google_denied"));
  }
  if (!config || !isEncryptionConfigured() || !state || !verifyOAuthState(state, user.id)) {
    return NextResponse.redirect(settingsUrl(request, "google_failed"));
  }

  try {
    const credentials = await exchangeGoogleCode(config, code);
    await saveIntegration(user.id, "google", credentials, credentials.email, credentials.scopes);
  } catch (callbackError) {
    console.error("Google OAuth callback failed:", callbackError);
    return NextResponse.redirect(settingsUrl(request, "google_failed"));
  }

  return NextResponse.redirect(settingsUrl(request, "google_connected"));
}
