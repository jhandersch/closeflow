import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";

const fallbackResponse = () => ({
  summary: "AI analysis is currently unavailable.",
  risk: "Unknown",
  nextAction:
    "Review the lead manually and define the next action.",
  confidence: 0,
});

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getRouteUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { lead, activities } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallbackResponse());
    }

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
- Write all text values in English
`;

    const openai = new OpenAI({ apiKey });

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert B2B sales assistant. Return valid JSON only and write all text values in English.",
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

    const result = JSON.parse(
      completion.choices[0].message.content || "{}",
    );

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
      return NextResponse.json(fallbackResponse());
    }

    return NextResponse.json(
      fallbackResponse(),
      {
        status: 500,
      },
    );
  }
}
