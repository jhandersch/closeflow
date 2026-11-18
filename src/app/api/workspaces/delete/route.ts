import { NextResponse } from "next/server";
import { getRouteUser, requireAal2, } from "@/lib/supabase/route";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { isUuid, readJsonObject } from "@/lib/requestValidation";
export async function POST(request: Request) {
    try {
        const { supabase, user, error } = await getRouteUser(request);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const limited = await checkRateLimit(`workspace:delete:${user.id}`, {
            limit: 5,
            windowMs: 60 * 60 * 1000,
        });
        if (!limited.success) return rateLimitResponse(limited);
        const body = await readJsonObject(request);
        if (!body) {
            return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }
        const workspaceId = typeof body.workspace_id === "string"
            ? body.workspace_id.trim()
            : "";
        if (!isUuid(workspaceId)) {
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
            return NextResponse.json({ error: "Could not load workspace." }, { status: 500 });
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
         * Delete the workspace itself.
         */
        const { data: deletedWorkspace, error: workspaceDeleteError, } = await supabase
            .from("workspaces")
            .delete()
            .eq("id", workspaceId)
            .eq("owner_id", user.id)
            .select("id")
            .maybeSingle();
        if (workspaceDeleteError) {
            console.error("DELETE WORKSPACE ERROR:", workspaceDeleteError);
            return NextResponse.json({ error: "Could not delete workspace." }, { status: 500 });
        }
        if (!deletedWorkspace) {
            return NextResponse.json({
                error: "Workspace could not be deleted with current permissions.",
            }, { status: 403 });
        }
        return NextResponse.json({
            ok: true,
            workspaceId,
        });
    }
    catch (error) {
        console.error("DELETE WORKSPACE CRASH:", error);
        return NextResponse.json({
            error: "Could not delete workspace.",
        }, { status: 500 });
    }
}
