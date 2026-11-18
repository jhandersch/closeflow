import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedAzureOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";
import { readJsonObject } from "@/lib/requestValidation";

const isStringList = (value: unknown, maxItemLength: number): value is string[] =>
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every((item) => typeof item === "string" && item.length <= maxItemLength);

const isMeetingPrepResponse = (value: unknown): value is {
    customer_summary: string;
    important_points: string[];
    questions: string[];
    risks: string[];
    next_steps: string[];
} => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const result = value as Record<string, unknown>;
    return (
        typeof result.customer_summary === "string" &&
        result.customer_summary.length <= 4000 &&
        isStringList(result.important_points, 1000) &&
        isStringList(result.questions, 1000) &&
        isStringList(result.risks, 1000) &&
        isStringList(result.next_steps, 1000)
    );
};

export async function POST(request: Request) {
    const access = await requireAiWorkspaceQuota(request);
    if (!access.ok) return access.response;
    let language = normalizeLanguage(undefined);
    try {
        const { user, error } = await getRouteUser(request);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await readJsonObject(request);
        if (!body) {
            return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }
        language = normalizeLanguage(body.language ?? user.user_metadata?.language);
        const isGerman = language === "de";
        const lead = body.lead && typeof body.lead === "object" && !Array.isArray(body.lead)
            ? body.lead as Record<string, unknown>
            : null;
        if (!lead) {
            return NextResponse.json({ error: "lead is required" }, { status: 400 });
        }
        const leadWithCosts = {
            ...lead,
            personal_deal_costs: formatPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, String(lead.id || ""), Number(lead.value || 0)),
        };
        const openai = createTrackedAzureOpenAIClient(
            access.supabase,
            access.workspaceId,
            access.userId,
            "ai_meeting_prep",
            "gpt-4.1-mini",
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Prepare a concise meeting brief for a sales rep. Use provided deal costs when discussing profitability, negotiation limits, or risks. Do not recommend disclosing internal costs or margins to the customer. Write all text values in ${isGerman ? "German" : "English"}. Return JSON with customer_summary, important_points, questions, risks, next_steps.${aiTerminologyRules(language)}`,
                },
                {
                    role: "user",
                content: JSON.stringify(leadWithCosts),
                },
            ],
        });
        const result: unknown = JSON.parse(completion.choices[0].message.content || "{}");
        if (!isMeetingPrepResponse(result)) {
            throw new Error("Azure OpenAI returned an invalid meeting brief.");
        }
        return NextResponse.json(result);
    }
    catch (error) {
        console.error(error);
        return NextResponse.json({ error: language === "de" ? "Die KI-Anfrage ist fehlgeschlagen." : "AI failed" }, { status: 500 });
    }
}
