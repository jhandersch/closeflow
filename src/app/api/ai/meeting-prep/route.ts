import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
export async function POST(request: Request) {
    const access = await requireAiWorkspaceQuota(request);
    if (!access.ok) return access.response;
    let language = normalizeLanguage(undefined);
    try {
        const { user, error } = await getRouteUser(request);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        language = normalizeLanguage(body.language ?? user.user_metadata?.language);
        const isGerman = language === "de";
        const lead = body.lead || {};
        const leadWithCosts = {
            ...lead,
            personal_deal_costs: formatPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, String(lead.id || ""), Number(lead.value || 0)),
        };
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                customer_summary: isGerman ? `${lead.name || "Lead"} bei ${lead.company || "Unbekanntes Unternehmen"}` : `${lead.name || "Lead"} at ${lead.company || "Unknown company"}`,
                important_points: isGerman ? ["Aktuelle Vertriebsphase prüfen", "Entscheidungsträger klären", "Budget und Zeitplan bestätigen"] : ["Review the current pipeline stage", "Clarify decision makers", "Confirm budget and timeline"],
                questions: isGerman ? ["Was hat sich seit dem letzten Gespräch geändert?", "Wer trifft die Entscheidung?"] : ["What changed since the last conversation?", "Who owns the decision?"],
                risks: isGerman ? ["Wenig Aktivität", "Kein klarer nächster Schritt"] : ["Limited activity", "No clear next step"],
                next_steps: isGerman ? ["Einen konkreten Termin zum Nachfassen festlegen", "Eine Gesprächszusammenfassung senden"] : ["Set a clear follow-up date", "Send a recap email"],
            });
        }
        const openai = createTrackedOpenAIClient(
            apiKey,
            access.supabase,
            access.workspaceId,
            access.userId,
            "ai_meeting_prep",
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Prepare a concise meeting brief for a sales rep. Use provided deal costs when discussing profitability, negotiation limits, or risks. Do not recommend disclosing internal costs or margins to the customer. Write all text values in ${isGerman ? "German" : "English"}. Return JSON with customer_summary, important_points, questions, risks, next_steps.`,
                },
                {
                    role: "user",
                content: JSON.stringify(leadWithCosts),
                },
            ],
        });
        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json({
            customer_summary: result.customer_summary || "",
            important_points: Array.isArray(result.important_points) ? result.important_points : [],
            questions: Array.isArray(result.questions) ? result.questions : [],
            risks: Array.isArray(result.risks) ? result.risks : [],
            next_steps: Array.isArray(result.next_steps) ? result.next_steps : [],
        });
    }
    catch (error) {
        console.error(error);
        return NextResponse.json({ error: language === "de" ? "Die KI-Anfrage ist fehlgeschlagen." : "AI failed" }, { status: 500 });
    }
}
