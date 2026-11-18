import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import {
    hasUnsupportedProfileAvatarUrl,
    PROFILE_AVATAR_DISABLED_ERROR,
} from "@/lib/profileAvatar";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { readJsonObject } from "@/lib/requestValidation";
export async function PATCH(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`profile:avatar:${user.id}`, { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited);
    const body = await readJsonObject(request);
    if (!body) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : typeof body.avatar === "string" ? body.avatar.trim() : "";
    if (hasUnsupportedProfileAvatarUrl(avatarUrl)) {
        return NextResponse.json({ error: PROFILE_AVATAR_DISABLED_ERROR }, { status: 400 });
    }
    const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
        id: user.id,
        avatar_url: avatarUrl,
    });
    if (profileError) {
        console.error("PROFILE AVATAR UPDATE ERROR:", profileError.message);
        return NextResponse.json({ error: "Could not update profile avatar." }, { status: 500 });
    }
    const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
    });
    if (authError) {
        console.error("PROFILE AVATAR AUTH UPDATE ERROR:", authError.message);
        return NextResponse.json({ error: "Could not update profile avatar." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, avatar_url: avatarUrl });
}
