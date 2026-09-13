import { NextResponse } from "next/server";
import {
    getRouteUser,
    loadWorkspaceForUser,
} from "@/lib/supabase/route";
import { getWorkspaceUserRole } from "@/lib/supabase/workspaceAuth";

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
        return NextResponse.json(
            {
                error: workspaceError.message,
            },
            { status: 500 },
        );
    }

    if (!workspace) {
        return NextResponse.json(
            {
                workspace_id: null,
                plan: "free",
                status: "inactive",
                current_period_end: null,
                stripe_subscription_id: null,
            },
        );
    }

    /*
     * Billing may only be viewed by the
     * owner of the currently active workspace.
     */
    const workspaceRole =
        await getWorkspaceUserRole(
            supabase,
            workspace.id,
            user.id,
        );

    if (!workspaceRole.ok) {
        return NextResponse.json(
            {
                error: workspaceRole.message,
            },
            {
                status: workspaceRole.status,
            },
        );
    }

    if (workspaceRole.role !== "owner") {
        return NextResponse.json(
            {
                error:
                    "Only the workspace owner can view billing.",
            },
            { status: 403 },
        );
    }

    const {
        data: subscription,
        error: subscriptionError,
    } = await supabase
        .from("subscriptions")
        .select(
            "workspace_id, plan, status, current_period_end, stripe_subscription_id",
        )
        .eq(
            "workspace_id",
            workspace.id,
        )
        .maybeSingle();

    if (subscriptionError) {
        return NextResponse.json(
            {
                error: subscriptionError.message,
            },
            { status: 500 },
        );
    }

    return NextResponse.json({
        workspace_id: workspace.id,
        plan: subscription?.plan || "free",
        status:
            subscription?.status || "active",
        current_period_end:
            subscription?.current_period_end || null,
        stripe_subscription_id:
            subscription?.stripe_subscription_id ||
            null,
    });
}