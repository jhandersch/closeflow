import { NextResponse } from "next/server";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { createTrackedAzureOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";

export async function POST(req: Request) {
    const access = await requireAiWorkspaceQuota(req);
    if (!access.ok) return access.response;
  let language = normalizeLanguage(undefined);
  try {
    const { user, error: authError } = await getRouteUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await req.json();
    const { lead, activities } = payload;
    language = normalizeLanguage(payload.language ?? user.user_metadata?.language);
    const responseLanguage = language === "de" ? "German" : "English";

    const history = (activities || [])
      .map(
        (activity: any) =>
          `${activity.created_at}: ${activity.action}`,
      )
      .join("\n");

    const prompt = `
You are an AI sales assistant inside a CRM.

Analyze this lead:

Lead:
Name: ${lead.name}
Company: ${lead.company}
Status: ${lead.status}
Value: €${lead.value}
User-entered deal costs:
${formatPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, String(lead.id || ""), Number(lead.value || 0))}
Notes:
${lead.notes || "No notes"}

Activity history:
${history || "No activity yet"}

Return JSON only:

{
  "summary": "Short summary of the customer situation and buying context.",
  "risk": "Describe possible risks, objections, or concerns.",
  "nextAction": "The single best next sales action.",
  "confidence": 0.65
}

Focus on:
- customer buying intent
- sales risks
- objections
- engagement level
- pipeline movement
- next best action
- probability of conversion
- estimated profitability after the listed user-entered deal costs

Consider that:
- returning from a later stage to an earlier stage can indicate hesitation
- but returning back to a later stage can indicate continued buying interest
- Write all text values in ${responseLanguage}
`;

    const openai = createTrackedAzureOpenAIClient(
      access.supabase,
      access.workspaceId,
      access.userId,
      "lead_memory_ai",
      "gpt-4.1-mini",
    );

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              `You are an expert B2B sales assistant. Return valid JSON only and write all text values in ${responseLanguage}.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
      });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Azure OpenAI returned an empty lead analysis.");
    const result = JSON.parse(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: language === "de" ? "Die Lead-Analyse ist fehlgeschlagen." : "Lead analysis failed." },
      { status: 502 },
    );
  }
}
