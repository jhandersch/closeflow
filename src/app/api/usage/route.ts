import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"
import { getWorkspaceUsageContext } from "@/lib/usageLimits"
import { summarizeWorkspaceAiUsage } from "@/lib/aiCost"

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const context = await getWorkspaceUsageContext(supabase, user.id)

  if (!context) {
    return NextResponse.json({
      workspace_id: null,
      plan: "free",
      month: new Date().toISOString().slice(0, 7),
      usage: {
        ai_requests: 0,
        exports: 0,
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
      },
      remaining: {
        ai_requests: 10,
        exports: 5,
        team_seats: 1,
      },
      seats: {
        members: 0,
        pending_invites: 0,
      },
    })
  }

  const aiUsage = await summarizeWorkspaceAiUsage(supabase, context.workspaceId, context.usage.month)

  return NextResponse.json({
    workspace_id: context.workspaceId,
    plan: context.plan,
    month: context.usage.month,
    usage: {
      ai_requests: context.usage.aiRequests,
      exports: context.usage.exports,
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
    },
    remaining: {
      ai_requests:
        context.limits.aiRequestsMonthly === null
          ? null
          : Math.max(context.limits.aiRequestsMonthly - context.usage.aiRequests, 0),
      exports:
        context.limits.exportsMonthly === null
          ? null
          : Math.max(context.limits.exportsMonthly - context.usage.exports, 0),
      team_seats:
        context.limits.teamSeats === null
          ? null
          : Math.max(context.limits.teamSeats - (context.memberCount + context.pendingInvites), 0),
    },
    seats: {
      members: context.memberCount,
      pending_invites: context.pendingInvites,
    },
  })
}
