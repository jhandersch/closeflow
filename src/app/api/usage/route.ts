import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { getWorkspaceUsageContext } from "@/lib/usageLimits";
import { summarizeWorkspaceAiUsage } from "@/lib/aiCost";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const preferredWorkspaceId =
        request.headers.get(
            "x-closeflow-workspace-id",
        );

    let context: Awaited<ReturnType<typeof getWorkspaceUsageContext>>;
    try {
        context = await getWorkspaceUsageContext(
            supabase,
            user.id,
            preferredWorkspaceId,
        );
    } catch (usageError) {
        console.error(
            "Could not verify workspace usage:",
            usageError instanceof Error ? usageError.message : "Unknown error",
        );
        return NextResponse.json(
            { error: "Could not verify workspace usage. Please try again later." },
            { status: 503 },
        );
    }
    if (!context) {
        return NextResponse.json({
            workspace_id: null,
            plan: "free",
            month: new Date().toISOString().slice(0, 7),
            usage: {
                ai_requests: 0,
                exports: 0,
                active_leads: 0,
                ai_tokens: {
                    prompt: 0,
                    completion: 0,
                    total: 0,
                    cost_usd: 0,
                    calls: 0,
                    by_feature: {},
                },
            },
            limits: {
                ai_requests: 10,
                exports: 5,
                team_seats: 1,
                active_leads: 50,
            },
            remaining: {
                ai_requests: 10,
                exports: 5,
                team_seats: 1,
                active_leads: 50,
            },
            seats: {
                members: 0,
                pending_invites: 0,
            },
        });
    }
    let aiUsage: Awaited<ReturnType<typeof summarizeWorkspaceAiUsage>>;
    try {
        aiUsage = await summarizeWorkspaceAiUsage(
            supabase,
            context.workspaceId,
            context.usage.month,
        );
    } catch (usageError) {
        console.error(
            "Could not summarize AI usage:",
            usageError instanceof Error ? usageError.message : "Unknown error",
        );
        return NextResponse.json(
            { error: "Could not verify AI usage. Please try again later." },
            { status: 503 },
        );
    }
    const { count: activeLeadsCount, error: activeLeadsError } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", context.workspaceId)
        .in("status", ["new", "contacted", "proposal"])
        .is("deleted_at", null);
    if (activeLeadsError) {
        console.error("Could not count active leads:", activeLeadsError.message);
        return NextResponse.json(
            { error: "Could not verify lead usage. Please try again later." },
            { status: 503 },
        );
    }
    return NextResponse.json({
        workspace_id: context.workspaceId,
        plan: context.plan,
        month: context.usage.month,
        usage: {
            ai_requests: context.usage.aiRequests,
            exports: context.usage.exports,
            active_leads: activeLeadsCount || 0,
            ai_tokens: {
                prompt: aiUsage.prompt_tokens,
                completion: aiUsage.completion_tokens,
                total: aiUsage.total_tokens,
                cost_usd: aiUsage.cost_usd,
                calls: aiUsage.calls,
                by_feature: aiUsage.by_feature,
            },
        },
        limits: {
            ai_requests: context.limits.aiRequestsMonthly,
            exports: context.limits.exportsMonthly,
            team_seats: context.limits.teamSeats,
            active_leads: context.limits.leadCapacity,
        },
        remaining: {
            ai_requests: context.limits.aiRequestsMonthly === null
                ? null
                : Math.max(context.limits.aiRequestsMonthly - context.usage.aiRequests, 0),
            exports: context.limits.exportsMonthly === null
                ? null
                : Math.max(context.limits.exportsMonthly - context.usage.exports, 0),
            team_seats: context.limits.teamSeats === null
                ? null
                : Math.max(context.limits.teamSeats - (context.memberCount + context.pendingInvites), 0),
            active_leads: context.limits.leadCapacity === null
                ? null
                : Math.max(context.limits.leadCapacity - (activeLeadsCount || 0), 0),
        },
        seats: {
            members: context.memberCount,
            pending_invites: context.pendingInvites,
        },
    });
}
