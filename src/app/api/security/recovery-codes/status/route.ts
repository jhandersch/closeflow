import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { count, error: countError } = await supabase
        .from("mfa_recovery_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);
    if (countError) {
        console.error("MFA RECOVERY CODE STATUS ERROR:", countError.message);
        return NextResponse.json({ error: "Could not load recovery-code status." }, { status: 500 });
    }
    return NextResponse.json({ remaining: count || 0 });
}
