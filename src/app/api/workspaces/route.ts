import { NextResponse } from "next/server";
import { getRouteUser, getWorkspacePayload } from "@/lib/supabase/route";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`workspaces:read:${user.id}`, { limit: 60, windowMs: 10 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited);
    const { data: memberships, error: membershipsError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);
    if (membershipsError) {
        console.error("WORKSPACE MEMBERSHIP LOAD ERROR:", membershipsError.message);
        return NextResponse.json({ error: "Could not load workspaces." }, { status: 500 });
    }
    const workspaces = await Promise.all((memberships || []).map(async (membership) => getWorkspacePayload(supabase, membership.workspace_id)));
    return NextResponse.json(workspaces.map(({ workspace, members, invites }) => ({ workspace, members, invites })));
}
