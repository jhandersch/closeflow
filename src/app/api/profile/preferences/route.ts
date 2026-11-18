import { NextResponse } from "next/server";

import { getRouteUser } from "@/lib/supabase/route";
import { normalizeLanguage } from "@/lib/i18n";
import { readJsonObject } from "@/lib/requestValidation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function PATCH(request: Request) {
  const { supabase, user, error } = await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const limited = await checkRateLimit(`profile:preferences:${user.id}`, { limit: 60, windowMs: 10 * 60 * 1000 });
  if (!limited.success) return rateLimitResponse(limited);

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }

  const phone =
    typeof body.phone === "string"
      ? body.phone.trim()
      : typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : "";

  const timezone =
    typeof body.timezone === "string" &&
    body.timezone.trim()
      ? body.timezone.trim()
      : "Europe/Berlin";

  const language = normalizeLanguage(body.language ?? user.user_metadata?.language);
  const metadata: Record<string, unknown> = {
    phone,
    timezone,
    language,
  };
  for (const key of ["theme", "notifications", "integrations", "session_count"] as const) {
    if (body[key] !== undefined) metadata[key] = body[key];
  }

  const { error: authError } =
    await supabase.auth.updateUser({
      data: metadata,
    });

  if (authError) {
    console.error("PROFILE PREFERENCES AUTH UPDATE ERROR:", authError.message);
    return NextResponse.json(
      { error: "Could not update preferences." },
      { status: 500 },
    );
  }

  const { error: profileError } =
    await supabase
      .from("profiles")
      .update({ language })
      .eq("id", user.id);

  if (profileError) {
    console.error("PROFILE PREFERENCES PROFILE UPDATE ERROR:", profileError.message);
    return NextResponse.json(
      { error: "Could not update preferences." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    preferences: {
      phone,
      timezone,
      language,
    },
  });
}
