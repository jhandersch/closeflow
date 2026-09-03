import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace, error: workspaceError } = await loadWorkspaceForUser(supabase, user.id);
    if (workspaceError) {
        if (/workspace_members|workspaces/i.test(workspaceError.message || "")) {
            return NextResponse.json({
                workspace_id: null,
                plan: "free",
                status: "inactive",
                current_period_end: null,
                stripe_subscription_id: null,
            });
        }
        return NextResponse.json({ error: workspaceError.message }, { status: 500 });
    }
    if (!workspace) {
        return NextResponse.json({
            workspace_id: null,
            plan: "free",
            status: "inactive",
            current_period_end: null,
            stripe_subscription_id: null,
        });
    }
    const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("workspace_id, plan, status, current_period_end, stripe_subscription_id")
        .eq("workspace_id", workspace.id)
        .maybeSingle();
    if (subscriptionError) {
        return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }
    return NextResponse.json({
        workspace_id: workspace.id,
        plan: subscription?.plan || "free",
        status: subscription?.status || "active",
        current_period_end: subscription?.current_period_end || null,
        stripe_subscription_id: subscription?.stripe_subscription_id || null,
    });
}
