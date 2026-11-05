import { NextResponse } from "next/server";
import {
    getRouteUser,
    loadWorkspaceForUser,
} from "@/lib/supabase/route";
import { isPlatformAdminUser } from "@/lib/platformAdmin";

export async function GET(request: Request) {
    const {
        supabase,
        user,
        error,
    } = await getRouteUser(request);

    if (error || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    const preferredWorkspaceId =
        request.headers.get(
            "x-closeflow-workspace-id",
        );

    const {
        workspace,
        error: workspaceError,
    } = await loadWorkspaceForUser(
        supabase,
        user.id,
        preferredWorkspaceId,
    );

    if (workspaceError) {
        console.error(
            "WORKSPACE PERMISSIONS ERROR:",
            workspaceError,
        );

        return NextResponse.json(
            {
                error:
                    "Workspace lookup failed",
            },
            { status: 500 },
        );
    }

    if (!workspace) {
        return NextResponse.json({
            role: null,
            workspaceId: null,
            isPlatformAdmin: isPlatformAdminUser(user),
            canManageWorkspace: false,
            canManageBilling: false,
            readOnly: false,
        });
    }

    const {
        data: membership,
        error: membershipError,
    } = await supabase
        .from("workspace_members")
        .select("role")
        .eq(
            "workspace_id",
            workspace.id,
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
        console.error(
            "WORKSPACE MEMBERSHIP ERROR:",
            membershipError,
        );

        return NextResponse.json(
            {
                error:
                    "Workspace membership lookup failed",
            },
            { status: 500 },
        );
    }

    const rawRole =
        typeof membership?.role === "string"
            ? membership.role.toLowerCase()
            : null;

    const role =
        rawRole === "owner" ||
        rawRole === "admin" ||
        rawRole === "member" ||
        rawRole === "viewer"
            ? rawRole
            : null;

    const isPlatformAdmin =
        isPlatformAdminUser(user);

    return NextResponse.json({
        role,
        workspaceId: workspace.id,
        isPlatformAdmin,
        canManageWorkspace:
            role === "owner" ||
            role === "admin",
        canManageBilling:
            role === "owner",
        readOnly: rawRole === "viewer",
    });
}