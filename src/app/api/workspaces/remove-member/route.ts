import { NextResponse } from "next/server";
import { getRouteUser, requireMfaForWorkspaceRole, } from "@/lib/supabase/route";
import { getWorkspaceUserRole, } from "@/lib/supabase/workspaceAuth";
export async function POST(request: Request) {
    const { supabase, user, error, } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const workspaceId = typeof body.workspace_id === "string"
        ? body.workspace_id.trim()
        : "";
    const userId = typeof body.user_id === "string"
        ? body.user_id.trim()
        : "";
    if (!workspaceId || !userId) {
        return NextResponse.json({
            error: "workspace_id and user_id are required",
        }, { status: 400 });
    }
    /*
    * Check whether the signed-in user
    * is a member of the workspace.
     */
    const workspaceRole = await getWorkspaceUserRole(supabase, workspaceId, user.id);
    if (!workspaceRole.ok) {
        return NextResponse.json({ error: workspaceRole.message }, { status: workspaceRole.status });
    }
    /*
    * Only owners and admins may
    * remove members.
     */
    if (workspaceRole.role !== "owner" &&
        workspaceRole.role !== "admin") {
        return NextResponse.json({
            error: "Only workspace owners and admins can remove members.",
        }, { status: 403 });
    }
    /*
    * Owner and admin actions require AAL2.
     */
    const authz = await requireMfaForWorkspaceRole(request, supabase, workspaceId, user.id);
    if (!authz.ok) {
        return NextResponse.json({ error: authz.message }, { status: authz.status });
    }
    /*
     * Owner darf nicht entfernt werden.
     */
    const { data: targetMember, error: targetError, } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
    if (targetError) {
        return NextResponse.json({ error: targetError.message }, { status: 500 });
    }
    if (!targetMember) {
        return NextResponse.json({
            error: "Workspace member not found.",
        }, { status: 404 });
    }
    if (targetMember.role === "owner") {
        return NextResponse.json({
            error: "The workspace owner cannot be removed.",
        }, { status: 403 });
    }
    /*
     * Admin darf keinen anderen Admin entfernen.
     * Nur der Owner darf Admins verwalten.
     */
    if (workspaceRole.role === "admin" &&
        targetMember.role === "admin") {
        return NextResponse.json({
            error: "Admins cannot remove other admins.",
        }, { status: 403 });
    }
    /*
     * Mitglied entfernen.
     */
    const { error: memberError, } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
    if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
    return NextResponse.json({
        ok: true,
    });
}
