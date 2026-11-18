import { NextResponse } from "next/server";

import { getRouteUser } from "@/lib/supabase/route";
import { normalizeLanguage } from "@/lib/i18n";
import {
  hasUnsupportedProfileAvatarUrl,
  PROFILE_AVATAR_DISABLED_ERROR,
} from "@/lib/profileAvatar";
import { readJsonObject } from "@/lib/requestValidation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const { supabase, user, error } =
    await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(
        "id, full_name, username, company_name, language, created_at, updated_at",
      )
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error("PROFILE LOAD ERROR:", profileError.message);
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 500 },
    );
  }

  const metadata = user.user_metadata || {};

  return NextResponse.json({
    id: user.id,
    email: user.email || "",
    name: profile?.full_name || "",
    username:
      profile?.username ||
      metadata.username ||
      "",
    company: profile?.company_name || "",
    avatar: "",
    role:
      typeof user.app_metadata?.role === "string"
        ? user.app_metadata.role
        : "",
    phone: metadata.phone || "",
    timezone:
      typeof metadata.timezone === "string" &&
      metadata.timezone.trim()
        ? metadata.timezone
        : "Europe/Berlin",
    language: normalizeLanguage(profile?.language ?? metadata.language),
    created_at:
      profile?.created_at || null,
    updated_at:
      profile?.updated_at || null,
  });
}

export async function PATCH(request: Request) {
  const { supabase, user, error } =
    await getRouteUser(request);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const limited = await checkRateLimit(`profile:update:${user.id}`, { limit: 60, windowMs: 10 * 60 * 1000 });
  if (!limited.success) return rateLimitResponse(limited);

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }

  const fullName =
    typeof body.full_name === "string"
      ? body.full_name.trim()
      : typeof body.name === "string"
        ? body.name.trim()
        : "";

  const username =
    typeof body.username === "string"
      ? body.username.trim()
      : "";

  const avatar =
    typeof body.avatar_url === "string"
      ? body.avatar_url.trim()
      : typeof body.avatar === "string"
        ? body.avatar.trim()
        : "";

  if (hasUnsupportedProfileAvatarUrl(avatar)) {
    return NextResponse.json(
      { error: PROFILE_AVATAR_DISABLED_ERROR },
      { status: 400 },
    );
  }

  const company =
    typeof body.company_name === "string"
      ? body.company_name.trim()
      : typeof body.company === "string"
        ? body.company.trim()
        : "";

  const phone =
    typeof body.phone === "string"
      ? body.phone.trim()
      : "";

  if (
    fullName.length > 200 ||
    username.length > 100 ||
    company.length > 200 ||
    phone.length > 50
  ) {
    return NextResponse.json(
      { error: "Profile fields exceed the allowed length." },
      { status: 400 },
    );
  }

  const timezone =
    typeof body.timezone === "string" &&
    body.timezone.trim()
      ? body.timezone.trim()
      : "Europe/Berlin";

  const language = normalizeLanguage(body.language ?? user.user_metadata?.language);

  const { error: updateError } =
    await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        username,
        avatar_url: avatar,
        company_name: company,
        language,
      });

  if (updateError) {
    console.error("PROFILE UPDATE ERROR:", updateError.message);
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 },
    );
  }

  const { error: authUpdateError } =
    await supabase.auth.updateUser({
      data: {
        name: fullName,
        full_name: fullName,
        username,
        avatar_url: avatar,
        company_name: company,
        phone,
        timezone,
        language,
      },
    });

  if (authUpdateError) {
    console.error("PROFILE AUTH METADATA UPDATE ERROR:", authUpdateError.message);
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    profile: {
      full_name: fullName,
      username,
      company_name: company,
      avatar_url: avatar,
      phone,
      timezone,
      language,
    },
  });
}
