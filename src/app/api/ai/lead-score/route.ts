import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { sumPersonalDealCosts } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { readJsonObject } from "@/lib/requestValidation";
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export async function POST(request: Request) {
    const access = await requireAiWorkspaceQuota(request);
    if (!access.ok) return access.response;
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await readJsonObject(request);
    if (!body) {
        return NextResponse.json({ error: "A JSON object is required." }, { status: 400 });
    }
    const lead = body.lead && typeof body.lead === "object" && !Array.isArray(body.lead)
        ? body.lead as Record<string, unknown>
        : body;
    if (!lead || typeof lead !== "object") {
        return NextResponse.json({ error: "lead is required" }, { status: 400 });
    }
    const value = typeof lead.value === "number" && Number.isFinite(lead.value) ? lead.value : 0;
    const personalDealCosts = sumPersonalDealCosts(user.user_metadata?.personal_deal_costs, String(lead.id || ""));
    const estimatedNetValue = value - personalDealCosts;
    const status = typeof lead.status === "string" ? lead.status : "new";
    const lastContactAt = typeof lead.last_contact_at === "string" ? new Date(lead.last_contact_at).getTime() : 0;
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(typeof lead.stage_changed_at === "string" ? lead.stage_changed_at : typeof lead.created_at === "string" ? lead.created_at : Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
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
    const { workspace } = await loadWorkspaceForUser(
        supabase,
        user.id,
        access.workspaceId,
    );
    if (lead.id) {
        const { data: authorizedLead, error: leadError } = await supabase
            .from("leads")
            .select("id")
            .eq("id", lead.id)
            .eq("workspace_id", access.workspaceId)
            .maybeSingle();
        if (leadError) {
            console.error("AI lead-score ownership check failed:", leadError.message);
            return NextResponse.json({ error: "Could not verify lead access." }, { status: 503 });
        }
        if (!authorizedLead) {
            return NextResponse.json({ error: "Lead not found." }, { status: 404 });
        }
    }
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
