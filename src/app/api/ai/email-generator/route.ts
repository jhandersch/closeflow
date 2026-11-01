import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedAzureOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";
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
        const goal = typeof body.goal === "string" ? body.goal : isGerman ? "Follow-up" : "Follow up";
        const tone = typeof body.tone === "string" ? body.tone : "professional";
        const openai = createTrackedAzureOpenAIClient(
            access.supabase,
            access.workspaceId,
            access.userId,
            "ai_email_generator",
            "gpt-4.1-mini",
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Create a sales email. Return JSON with subject and body. Write the email in ${isGerman ? "German" : "English"}. Tone: ${tone}. Goal: ${goal}. Use any provided deal-cost context only to guide commercially sound wording; do not disclose the user's internal costs or margins to the customer.${aiTerminologyRules(language)}`,
                },
                {
                    role: "user",
                    content: JSON.stringify(leadWithCosts),
                },
            ],
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Azure OpenAI returned an empty email response.");
        const result = JSON.parse(content);
        if (
            typeof result.subject !== "string" ||
            !result.subject.trim() ||
            typeof result.body !== "string" ||
            !result.body.trim()
        ) {
            throw new Error("Azure OpenAI returned an invalid email response.");
        }
        return NextResponse.json({
            subject: result.subject,
            body: result.body,
        });
    }
    catch (error) {
        console.error(error);
        return NextResponse.json({ error: language === "de" ? "Die KI-Anfrage ist fehlgeschlagen." : "AI failed" }, { status: 500 });
    }
}
