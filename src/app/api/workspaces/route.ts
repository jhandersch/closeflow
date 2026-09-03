import { NextResponse } from "next/server";
import { getRouteUser, getWorkspacePayload } from "@/lib/supabase/route";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: memberships, error: membershipsError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);
    if (membershipsError) {
        return NextResponse.json({ error: membershipsError.message }, { status: 500 });
    }
    const workspaces = await Promise.all((memberships || []).map(async (membership) => getWorkspacePayload(supabase, membership.workspace_id)));
    return NextResponse.json(workspaces.map(({ workspace, members, invites }) => ({ workspace, members, invites })));
}
