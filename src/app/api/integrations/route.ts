import { NextResponse } from "next/server";

import { GOOGLE_SCOPES, getGoogleConfig } from "@/lib/integrations/google";
import { isEncryptionConfigured } from "@/lib/integrations/crypto";
import { loadIntegrationStatus } from "@/lib/integrations/store";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(request: Request) {
  const { user, error } = await getRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = isEncryptionConfigured();
  let rows: Awaited<ReturnType<typeof loadIntegrationStatus>> = [];
  if (configured) {
    try {
      rows = await loadIntegrationStatus(user.id);
    } catch (statusError) {
      console.error("Integration status failed:", statusError);
      return NextResponse.json({ error: "Could not load integrations." }, { status: 503 });
    }
  }

  const google = rows.find((row) => row.provider === "google");
  const scopes: string[] = google?.scopes ?? [];

  return NextResponse.json({
    google: {
      available: configured && Boolean(getGoogleConfig()),
      connected: Boolean(google),
      email: google?.account_label ?? null,
      gmail: scopes.includes(GOOGLE_SCOPES.gmail),
      calendar: scopes.includes(GOOGLE_SCOPES.calendar),
    },
  });
}
