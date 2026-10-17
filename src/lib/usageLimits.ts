import type { SupabaseClient } from "@supabase/supabase-js";
import { loadWorkspaceForUser } from "@/lib/supabase/route";
import { resolveWorkspacePlan } from "@/lib/workspaceCapacity";
import { planDetails, type Plan } from "@/lib/planDetails";
import { consumeWorkspaceUsage, type UsageBucket } from "@/lib/usageQuota";
type PlanTier = Plan;
type Limits = {
    aiRequestsMonthly: number | null;
    exportsMonthly: number | null;
    teamSeats: number | null;
    leadCapacity: number | null;
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
    free: planDetails.free.limits,
    pro: planDetails.pro.limits,
    business: planDetails.business.limits,
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
const readUsage = async (supabase: SupabaseClient, workspaceId: string, month: string): Promise<UsageSnapshot> => {
    const primary = await supabase
        .from("usage")
        .select("ai_requests, exports_count")
        .eq("workspace_id", workspaceId)
        .eq("month", month)
        .maybeSingle();
    if (primary.error) {
        throw new Error(`Could not read workspace usage: ${primary.error.message}`);
    }
    return {
        aiRequests: primary.data?.ai_requests || 0,
        exports: primary.data?.exports_count || 0,
        month,
    };
};
export async function getWorkspaceUsageContext(
    supabase: SupabaseClient,
    userId: string,
    preferredWorkspaceId?: string | null,
): Promise<WorkspaceUsageContext | null> {
    const { workspace, error } =
        await loadWorkspaceForUser(
            supabase,
            userId,
            preferredWorkspaceId,
        );

    if (error) {
        throw new Error(`Could not verify workspace membership: ${error.message}`);
    }
    if (!workspace) {
        return null;
    }

    const month = monthKey();

    const [
        { data: subscription, error: subscriptionError },
        usage,
        membersCountRes,
        invitesCountRes,
    ] = await Promise.all([
        supabase
            .from("subscriptions")
            .select("plan, status, current_period_end")
            .eq("workspace_id", workspace.id)
            .maybeSingle(),
        readUsage(
            supabase,
            workspace.id,
            month,
        ),
        supabase
            .from("workspace_members")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("workspace_id", workspace.id),
        supabase
            .from("workspace_invites")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("workspace_id", workspace.id)
            .is("accepted_at", null),
    ]);

    if (subscriptionError || membersCountRes.error || invitesCountRes.error) {
        throw new Error(
            subscriptionError?.message ||
                membersCountRes.error?.message ||
                invitesCountRes.error?.message ||
                "Could not verify workspace limits.",
        );
    }

    const plan = normalizePlan(
        resolveWorkspacePlan(
            typeof workspace.plan === "string" ? workspace.plan : "free",
            subscription,
        ),
    );

    return {
        workspaceId: workspace.id,
        plan,
        limits: PLAN_LIMITS[plan],
        usage,
        memberCount:
            membersCountRes.count || 0,
        pendingInvites:
            invitesCountRes.count || 0,
    };
}
export async function enforceAndTrackUsageLimit(
    supabase: SupabaseClient,
    userId: string,
    bucket: UsageBucket,
    preferredWorkspaceId?: string | null,
    requestKey = crypto.randomUUID(),
): Promise<
    | {
          ok: true;
          context: WorkspaceUsageContext | null;
      }
    | {
          ok: false;
          status: number;
          message: string;
      }
> {
    try {
        const { workspace, error } = await loadWorkspaceForUser(
            supabase,
            userId,
            preferredWorkspaceId,
        );
        if (error) {
            throw new Error(error.message);
        }
        if (!workspace) {
            return {
                ok: false,
                status: 403,
                message: "A workspace is required to use this feature.",
            };
        }

        const month = monthKey();
        const context = await getWorkspaceUsageContext(
            supabase,
            userId,
            workspace.id,
        );
        if (!context) {
            return {
                ok: false,
                status: 503,
                message: "Could not verify workspace limits. Please try again later.",
            };
        }

        const reservation = await consumeWorkspaceUsage(
            supabase,
            workspace.id,
            bucket,
            requestKey,
            month,
        );
        if (!reservation.ok) {
            return reservation;
        }

        return {
            ok: true,
            context: {
                ...context,
                plan: reservation.plan,
                limits: PLAN_LIMITS[reservation.plan],
                usage: {
                    ...context.usage,
                    aiRequests: bucket === "ai" ? reservation.currentCount : context.usage.aiRequests,
                    exports: bucket === "export" ? reservation.currentCount : context.usage.exports,
                },
            },
        };
    } catch (error) {
        console.error(
            "Workspace usage check failed:",
            error instanceof Error ? error.message : "Unknown error",
        );
        return {
            ok: false,
            status: 503,
            message: "Could not verify workspace usage. Please try again later.",
        };
    }
}
export async function enforceTeamSeatLimit(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string,
): Promise<
    | { ok: true }
    | {
          ok: false;
          status: number;
          message: string;
      }
> {
    const context =
        await getWorkspaceUsageContext(
            supabase,
            userId,
            workspaceId,
        );

    if (!context) {
        return {
            ok: false,
            status: 503,
            message: "Could not verify workspace seat limits.",
        };
    }

    const seatLimit =
        context.limits.teamSeats;

    if (seatLimit === null) {
        return { ok: true };
    }

    const projectedSeats =
        context.memberCount +
        context.pendingInvites +
        1;

    if (projectedSeats > seatLimit) {
        return {
            ok: false,
            status: 429,
            message: `Team seat limit reached for ${context.plan.toUpperCase()} plan (${context.memberCount + context.pendingInvites}/${seatLimit}).`,
        };
    }

    return { ok: true };
}

export async function enforceLeadCapacityLimit(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string,
) {
    const context = await getWorkspaceUsageContext(supabase, userId, workspaceId);

    if (!context) {
        return {
            ok: false,
            status: 503,
            message: "Could not verify workspace lead limits.",
        } as const;
    }
    if (context.limits.leadCapacity === null) {
        return { ok: true } as const;
    }

    const { count, error } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["new", "contacted", "proposal"])
        .is("deleted_at", null);

    if (error) {
        return {
            ok: false,
            status: 500,
            message: "Could not verify lead capacity.",
        } as const;
    }

    const currentCount = count ?? 0;

    if (currentCount >= context.limits.leadCapacity) {
        return {
            ok: false,
            status: 429,
            message: `Lead limit reached for ${context.plan.toUpperCase()} plan (${currentCount}/${context.limits.leadCapacity}). Upgrade your plan to add more leads.`,
        } as const;
    }

    return { ok: true } as const;
}

export async function getLeadCapacitySnapshot(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string,
) {
    const context = await getWorkspaceUsageContext(supabase, userId, workspaceId);

    if (!context) {
        return {
            ok: false,
            status: 503,
            message: "Could not verify workspace lead limits.",
        } as const;
    }
    if (context.limits.leadCapacity === null) {
        return { ok: true, available: null } as const;
    }

    const { count, error } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["new", "contacted", "proposal"])
        .is("deleted_at", null);

    if (error) {
        return {
            ok: false,
            status: 500,
            message: "Could not verify lead capacity.",
        } as const;
    }

    return {
        ok: true,
        available: Math.max(0, context.limits.leadCapacity - (count ?? 0)),
    } as const;
}
