import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage, translateText } from "@/lib/i18n";
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
        const goal = typeof body.goal === "string" ? body.goal : isGerman ? "Nachfassen" : "Follow up";
        const goalLabel = translateText(goal, language);
        const tone = typeof body.tone === "string" ? body.tone : "professional";
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                subject: `${goalLabel} – ${lead.company || lead.name || "Lead"}`,
                body: isGerman ? `Guten Tag${lead.name ? ` ${lead.name}` : ""},\n\nich möchte mich bezüglich ${lead.company || "Ihres Unternehmens"} bei Ihnen melden.\n\nMit freundlichen Grüßen` : `Hello${lead.name ? ` ${lead.name}` : ""},\n\nI wanted to ${goal.toLowerCase()} regarding ${lead.company || "your company"}.\n\nBest regards`,
            });
        }
        const openai = createTrackedOpenAIClient(
            apiKey,
            access.supabase,
            access.workspaceId,
            access.userId,
            "ai_email_generator",
        );
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Create a sales email. Return JSON with subject and body. Write the email in ${isGerman ? "German" : "English"}. Tone: ${tone}. Goal: ${goal}. Use any provided deal-cost context only to guide commercially sound wording; do not disclose the user's internal costs or margins to the customer.`,
                },
                {
                    role: "user",
                    content: JSON.stringify(leadWithCosts),
                },
            ],
        });
        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json({
            subject: typeof result.subject === "string" ? result.subject : goalLabel,
            body: typeof result.body === "string" ? result.body : "",
        });
    }
    catch (error) {
        console.error(error);
        return NextResponse.json({ error: language === "de" ? "Die KI-Anfrage ist fehlgeschlagen." : "AI failed" }, { status: 500 });
    }
}
