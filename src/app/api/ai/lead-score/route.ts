import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { sumPersonalDealCosts } from "@/lib/personalDealCosts";
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const lead = body.lead || body;
    if (!lead) {
        return NextResponse.json({ error: "lead is required" }, { status: 400 });
    }
    const value = Number(lead.value || 0);
    const personalDealCosts = sumPersonalDealCosts(user.user_metadata?.personal_deal_costs, String(lead.id || ""));
    const estimatedNetValue = value - personalDealCosts;
    const status = String(lead.status || "new");
    const lastContactAt = lead.last_contact_at ? new Date(lead.last_contact_at).getTime() : 0;
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at || lead.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
    const contactDays = lastContactAt ? Math.floor((Date.now() - lastContactAt) / (1000 * 60 * 60 * 24)) : 99;
    const stageScore: Record<string, number> = { new: 15, contacted: 50, proposal: 80, won: 100, lost: 0 };
    const score = clamp(Math.round((stageScore[status] || 20) + (estimatedNetValue >= 50000 ? 12 : estimatedNetValue >= 20000 ? 8 : estimatedNetValue >= 10000 ? 5 : 2) + (contactDays <= 2 ? 15 : contactDays <= 7 ? 8 : -10) + (ageDays <= 7 ? 5 : -5)));
    const confidence = clamp(score >= 75 ? 90 : score >= 50 ? 75 : 60);
    const reason = score >= 75
        ? "Strong opportunity with recent activity and healthy value"
        : score >= 50
            ? "Promising lead that still needs consistent follow-up"
            : "Lead is stale or too early to forecast confidently";
    const costAdjustedReason = personalDealCosts > 0
        ? `${reason}. Estimated deal costs of €${personalDealCosts.toFixed(2)} leave €${estimatedNetValue.toFixed(2)} before other expenses.`
        : reason;
    const payload = {
        score,
        confidence,
        reason: costAdjustedReason,
        estimated_net_value: estimatedNetValue,
        estimated_personal_costs: personalDealCosts,
    };
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (workspace?.id && lead.id) {
        await supabase.from("lead_scores").insert({
            lead_id: lead.id,
            score,
            confidence,
            reason: costAdjustedReason,
        });
    }
    return NextResponse.json(payload);
}
