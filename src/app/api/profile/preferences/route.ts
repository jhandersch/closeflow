import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
export async function PATCH(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
    const language = typeof body.language === "string" ? body.language.trim() : "";
    const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
        id: user.id,
        phone,
        timezone,
        language,
    });
    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
    await supabase.auth.updateUser({
        data: { phone, timezone, language },
    });
    return NextResponse.json({ ok: true, preferences: { phone, timezone, language } });
}
