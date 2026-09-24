import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { sumPersonalDealCosts } from "@/lib/personalDealCosts";
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export async function POST(request: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace?.id) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 });
    }
    const { id } = await context.params;
    const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .single();
    if (leadError || !lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const stageScores: Record<string, number> = {
        new: 12,
        contacted: 28,
        proposal: 72,
        won: 92,
        lost: 10,
    };
    const personalDealCosts = sumPersonalDealCosts(user.user_metadata?.personal_deal_costs, id);
    const estimatedNetValue = Number(lead.value || 0) - personalDealCosts;
    const valueScore = estimatedNetValue >= 50000 ? 12 : estimatedNetValue >= 20000 ? 8 : estimatedNetValue >= 10000 ? 5 : 2;
    const stageScore = stageScores[lead.status] ?? 20;
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    const freshnessScore = ageDays <= 2 ? 15 : ageDays <= 7 ? 8 : ageDays <= 14 ? 0 : -10;
    const noteScore = lead.notes ? 5 : 0;
    const score = clamp(Math.round(stageScore + valueScore + freshnessScore + noteScore));
    const risk = score >= 75 ? "low" : score >= 45 ? "medium" : "high";
    const baseReason = score >= 75
        ? "High activity and proposal stage"
        : score >= 45
            ? "Lead is active but still needs progress"
            : "Lead is stale or early-stage";
    const reason = personalDealCosts > 0
        ? `${baseReason}. Estimated costs: €${personalDealCosts.toFixed(2)}; estimated value after these costs: €${estimatedNetValue.toFixed(2)}.`
        : baseReason;
    return NextResponse.json({ score, risk, reason, estimatedNetValue, personalDealCosts });
}
