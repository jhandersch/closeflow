import { NextResponse } from "next/server";
import { getRouteUser, requireAal2, } from "@/lib/supabase/route";
export async function POST(request: Request) {
    try {
        const { supabase, user, error } = await getRouteUser(request);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const workspaceId = typeof body.workspace_id === "string"
            ? body.workspace_id.trim()
            : "";
        if (!workspaceId) {
            return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
        }
        /*
         * Load workspace
         */
        const { data: workspace, error: workspaceError, } = await supabase
            .from("workspaces")
            .select("id, owner_id")
            .eq("id", workspaceId)
            .maybeSingle();
        if (workspaceError) {
            console.error("LOAD WORKSPACE FOR DELETE ERROR:", workspaceError);
            return NextResponse.json({ error: workspaceError.message }, { status: 500 });
        }
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }
        /*
         * Only the workspace owner may delete.
         */
        if (workspace.owner_id !== user.id) {
            return NextResponse.json({
                error: "Only the workspace owner can delete this workspace.",
            }, { status: 403 });
        }
        /*
         * Workspace deletion requires AAL2 / 2FA.
         */
        const authz = await requireAal2(request, supabase);
        if (!authz.ok) {
            return NextResponse.json({ error: authz.message }, { status: authz.status });
        }
        /*
         * Delete associated invitations.
         */
        const { error: inviteDeleteError, } = await supabase
            .from("workspace_invites")
            .delete()
            .eq("workspace_id", workspaceId);
        if (inviteDeleteError) {
            console.error("DELETE WORKSPACE INVITES ERROR:", inviteDeleteError);
            return NextResponse.json({ error: inviteDeleteError.message }, { status: 500 });
        }
        /*
         * Delete associated members.
         */
        const { error: memberDeleteError, } = await supabase
            .from("workspace_members")
            .delete()
            .eq("workspace_id", workspaceId);
        if (memberDeleteError) {
            console.error("DELETE WORKSPACE MEMBERS ERROR:", memberDeleteError);
            return NextResponse.json({ error: memberDeleteError.message }, { status: 500 });
        }
        /*
         * Delete the workspace itself.
         */
        const { error: workspaceDeleteError, } = await supabase
            .from("workspaces")
            .delete()
            .eq("id", workspaceId)
            .eq("owner_id", user.id);
        if (workspaceDeleteError) {
            console.error("DELETE WORKSPACE ERROR:", workspaceDeleteError);
            return NextResponse.json({ error: workspaceDeleteError.message }, { status: 500 });
        }
        return NextResponse.json({
            ok: true,
            workspaceId,
        });
    }
    catch (error) {
        console.error("DELETE WORKSPACE CRASH:", error);
        return NextResponse.json({
            error: error instanceof Error
                ? error.message
                : "Internal Server Error",
        }, { status: 500 });
    }
}
