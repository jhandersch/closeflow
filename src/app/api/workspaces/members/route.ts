import { NextResponse } from "next/server";
import { getRouteUser, getWorkspacePayload } from "@/lib/supabase/route";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { isUuid } from "@/lib/requestValidation";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`workspace:members-read:${user.id}`, {
        limit: 60,
        windowMs: 10 * 60 * 1000,
    });
    if (!limited.success) return rateLimitResponse(limited);
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspace_id");
    if (!workspaceId || !isUuid(workspaceId)) {
        return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
    }
    const payload = await getWorkspacePayload(supabase, workspaceId);
    return NextResponse.json({ members: payload.members, invites: payload.invites });
}
