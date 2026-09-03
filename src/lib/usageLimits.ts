import type { SupabaseClient } from "@supabase/supabase-js";
import { loadWorkspaceForUser } from "@/lib/supabase/route";
type PlanTier = "free" | "pro" | "business";
type Limits = {
    aiRequestsMonthly: number | null;
    exportsMonthly: number | null;
    teamSeats: number | null;
};
type UsageSnapshot = {
    aiRequests: number;
    exports: number;
    month: string;
};
type WorkspaceUsageContext = {
    workspaceId: string;
    plan: PlanTier;
    limits: Limits;
    usage: UsageSnapshot;
    memberCount: number;
    pendingInvites: number;
};
const PLAN_LIMITS: Record<PlanTier, Limits> = {
    free: {
        aiRequestsMonthly: 10,
        exportsMonthly: 5,
        teamSeats: 1,
    },
    pro: {
        aiRequestsMonthly: 500,
        exportsMonthly: 200,
        teamSeats: 5,
    },
    business: {
        aiRequestsMonthly: 5000,
        exportsMonthly: 2000,
        teamSeats: 20,
    },
};
const normalizePlan = (value: unknown): PlanTier => {
    const plan = typeof value === "string" ? value.toLowerCase() : "free";
    if (plan === "business")
        return "business";
    if (plan === "pro")
        return "pro";
    return "free";
};
const monthKey = () => new Date().toISOString().slice(0, 7);
const missingColumn = (message: string) => /column .* does not exist|schema cache/i.test(message);
const readUsage = async (supabase: SupabaseClient, workspaceId: string, month: string): Promise<UsageSnapshot> => {
    const primary = await supabase
        .from("usage")
        .select("ai_requests, exports_count")
        .eq("workspace_id", workspaceId)
        .eq("month", month)
        .maybeSingle();
    if (!primary.error) {
        return {
            aiRequests: primary.data?.ai_requests || 0,
            exports: primary.data?.exports_count || 0,
            month,
        };
    }
    if (missingColumn(primary.error.message || "")) {
        const fallback = await supabase
            .from("usage")
            .select("ai_requests")
            .eq("workspace_id", workspaceId)
            .eq("month", month)
            .maybeSingle();
        if (!fallback.error) {
            return {
                aiRequests: fallback.data?.ai_requests || 0,
                exports: 0,
                month,
            };
        }
    }
    return {
        aiRequests: 0,
        exports: 0,
        month,
    };
};
export async function getWorkspaceUsageContext(supabase: SupabaseClient, userId: string): Promise<WorkspaceUsageContext | null> {
    const { workspace, error } = await loadWorkspaceForUser(supabase, userId);
    if (error || !workspace) {
        return null;
    }
    const month = monthKey();
    const [{ data: subscription }, usage, membersCountRes, invitesCountRes] = await Promise.all([
        supabase
            .from("subscriptions")
            .select("plan")
            .eq("workspace_id", workspace.id)
            .maybeSingle(),
        readUsage(supabase, workspace.id, month),
        supabase
            .from("workspace_members")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspace.id),
        supabase
            .from("workspace_invites")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspace.id)
            .is("accepted_at", null),
    ]);
    const plan = normalizePlan(subscription?.plan);
    return {
        workspaceId: workspace.id,
        plan,
        limits: PLAN_LIMITS[plan],
        usage,
        memberCount: membersCountRes.count || 0,
        pendingInvites: invitesCountRes.count || 0,
    };
}
const incrementUsage = async (supabase: SupabaseClient, workspaceId: string, month: string, field: "ai_requests" | "exports_count") => {
    const current = await supabase
        .from("usage")
        .select("ai_requests, exports_count")
        .eq("workspace_id", workspaceId)
        .eq("month", month)
        .maybeSingle();
    if (current.error && !missingColumn(current.error.message || "")) {
        return;
    }
    const aiRequests = (current.data?.ai_requests || 0) + (field === "ai_requests" ? 1 : 0);
    const exportsCount = (current.data?.exports_count || 0) + (field === "exports_count" ? 1 : 0);
    const payload: Record<string, unknown> = {
        workspace_id: workspaceId,
        month,
        ai_requests: aiRequests,
        updated_at: new Date().toISOString(),
    };
    if (!current.error || !missingColumn(current.error.message || "")) {
        payload.exports_count = exportsCount;
    }
    await supabase.from("usage").upsert(payload, { onConflict: "workspace_id,month" });
};
export async function enforceAndTrackUsageLimit(supabase: SupabaseClient, userId: string, bucket: "ai" | "export"): Promise<{
    ok: true;
    context: WorkspaceUsageContext | null;
} | {
    ok: false;
    status: number;
    message: string;
}> {
    const context = await getWorkspaceUsageContext(supabase, userId);
    if (!context) {
        return { ok: true, context: null };
    }
    if (bucket === "ai") {
        const limit = context.limits.aiRequestsMonthly;
        if (limit !== null && context.usage.aiRequests >= limit) {
            return {
                ok: false,
                status: 429,
                message: `AI request limit reached for ${context.plan.toUpperCase()} plan (${limit}/${limit}).`,
            };
        }
        await incrementUsage(supabase, context.workspaceId, context.usage.month, "ai_requests");
        return { ok: true, context };
    }
    const exportLimit = context.limits.exportsMonthly;
    if (exportLimit !== null && context.usage.exports >= exportLimit) {
        return {
            ok: false,
            status: 429,
            message: `Export limit reached for ${context.plan.toUpperCase()} plan (${exportLimit}/${exportLimit}).`,
        };
    }
    await incrementUsage(supabase, context.workspaceId, context.usage.month, "exports_count");
    return { ok: true, context };
}
export async function enforceTeamSeatLimit(supabase: SupabaseClient, userId: string, workspaceId: string): Promise<{
    ok: true;
} | {
    ok: false;
    status: number;
    message: string;
}> {
    const context = await getWorkspaceUsageContext(supabase, userId);
    if (!context || context.workspaceId !== workspaceId) {
        return { ok: true };
    }
    const seatLimit = context.limits.teamSeats;
    if (seatLimit === null) {
        return { ok: true };
    }
    const projectedSeats = context.memberCount + context.pendingInvites + 1;
    if (projectedSeats > seatLimit) {
        return {
            ok: false,
            status: 429,
            message: `Team seat limit reached for ${context.plan.toUpperCase()} plan (${context.memberCount + context.pendingInvites}/${seatLimit}).`,
        };
    }
    return { ok: true };
}
