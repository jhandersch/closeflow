import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, company_name, phone, timezone, language, created_at")
        .eq("id", user.id)
        .maybeSingle();
    const metadata = user.user_metadata || {};
    return NextResponse.json({
        id: user.id,
        email: user.email,
        name: profile?.full_name || metadata.name || metadata.full_name || "",
        username: metadata.username || "",
        company: profile?.company_name || metadata.company_name || "",
        avatar: profile?.avatar_url || metadata.avatar_url || "",
        phone: profile?.phone || "",
        timezone: profile?.timezone || "",
        language: "en",
    });
}
export async function PATCH(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : typeof body.name === "string" ? body.name.trim() : "";
    const avatar = typeof body.avatar_url === "string" ? body.avatar_url.trim() : typeof body.avatar === "string" ? body.avatar.trim() : "";
    const company = typeof body.company_name === "string" ? body.company_name.trim() : typeof body.company === "string" ? body.company.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
    const language = "en";
    const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
        id: user.id,
        full_name: fullName,
        avatar_url: avatar,
        company_name: company,
        phone,
        timezone,
        language,
    });
    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    await supabase.auth.updateUser({
        data: {
            name: fullName,
            full_name: fullName,
            avatar_url: avatar,
            company_name: company,
            phone,
            timezone,
            language,
        },
    });
    return NextResponse.json({
        ok: true,
        profile: {
            full_name: fullName,
            company_name: company,
            avatar_url: avatar,
            phone,
            timezone,
            language,
        },
    });
}
