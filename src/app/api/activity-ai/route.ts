import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedOpenAIClient } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";

const fallbackResponse = (language: "en" | "de") => ({
  health: language === "de" ? "Unbekannt" : "unknown",
  risk: language === "de" ? "Unbekannt" : "unknown",
  summary: language === "de" ? "KI-Analyse fehlgeschlagen" : "AI failed",
  recommendation: language === "de" ? "Manuell prüfen" : "Review manually",
  confidence: 0,
});

export async function POST(req: Request) {
  const access = await requireAiWorkspaceQuota(req);
  if (!access.ok) return access.response;
  let language = normalizeLanguage(undefined);
  try {
    const { user, error } = await getRouteUser(req);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await req.json();
    const { lead, activities } = payload;
    language = normalizeLanguage(payload.language ?? user.user_metadata?.language);
    const responseLanguage = language === "de" ? "German" : "English";

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallbackResponse(language));
    }

    const history = activities
      .map((a: any) => `${a.created_at}: ${a.action}`)
      .join("\n");

    const prompt = `
You are an AI sales analyst.

Analyze CRM activity.

Lead:

Name:
${lead.name}

Company:
${lead.company}

Stage:
${lead.status}

Value:
€${lead.value}

User-entered costs for this deal:
${formatPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, String(lead.id || ""), Number(lead.value || 0))}

Activities:

${history || "No activity"}

Return JSON only:

{
  "health": "string",
  "risk": "string",
  "summary": "string",
  "recommendation": "string",
  "confidence": 0.0
}

Analyze:

- inactivity
- momentum
- pipeline movement
- customer engagement
- sales risk
- next action
- profitability after the listed deal costs
- Write all text values in ${responseLanguage}
`;

    const openai = createTrackedOpenAIClient(
      apiKey,
      access.supabase,
      access.workspaceId,
      access.userId,
      "activity_ai",
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            `You are an expert sales operations AI. Return valid JSON only and write all text values in ${responseLanguage}.`,
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

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    const openAiLikeError = error as
      | {
          status?: number;
          code?: string;
          type?: string;
        }
      | undefined;

    const recoverable =
      openAiLikeError?.status === 429 ||
      openAiLikeError?.status === 401 ||
      openAiLikeError?.code === "insufficient_quota" ||
      openAiLikeError?.type === "insufficient_quota" ||
      openAiLikeError?.code === "rate_limit_exceeded";

    if (recoverable) {
      return NextResponse.json(fallbackResponse(language));
    }

    return NextResponse.json(fallbackResponse(language), {
      status: 500,
    });
  }
}
