import { NextResponse } from "next/server";
import { createTrackedAzureOpenAIClient } from "@/lib/aiCost";
import { createClient } from "@/lib/supabase/server";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { normalizeLanguage, type AppLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";
type LeadPayload = {
  id?: string;
  name?: string;
  company?: string;
  status?: string;
  value?: number;
  created_at?: string;
  stage_changed_at?: string | null;
  notes?: string | null;
  next_action?: string | null;
  next_action_due?: string | null;
};
type ForecastPayload = {
  pipelineValue?: number;
  weightedRevenue?: number;
  revenueAtRisk?: number;
  commitRevenue?: number;
  bestCaseRevenue?: number;
  confidence?: number;
  averageHealth?: number;
  averageProbability?: number;
  activeDeals?: number;
  singleDealRisk?: number;
  dealsWithNextAction?: number;
  dealsWithoutNextAction?: number;
  nextActionCoverage?: number;
  pipelineCoverage?: number;
};
type RevenueForecastAIResponse = {
  confidence: number;
  health: "Excellent" | "Healthy" | "Warning" | "Critical";
  headline: string;
  summary: string;
  topDrivers: string[];
  risks: string[];
  recommendations: string[];
  pipelineComment: string;
  singleDealRisk: number;
};
function normalizeResponse(
  value: Partial<RevenueForecastAIResponse>,
  locale: AppLanguage,
  forecastConfidence?: number,
  forecastSingleDealRisk?: number,
): RevenueForecastAIResponse {
  const validHealth =
    value.health === "Excellent" ||
    value.health === "Healthy" ||
    value.health === "Warning" ||
    value.health === "Critical"
      ? value.health
      : "Warning";
  return {
    /*
     * Confidence is authoritative from calculateForecast();
     * the model's own confidence guess is never used when
     * a forecast confidence value was supplied.
     */
    confidence:
      typeof forecastConfidence === "number"
        ? Math.max(0, Math.min(100, Math.round(forecastConfidence)))
        : typeof value.confidence === "number"
          ? Math.max(0, Math.min(100, value.confidence))
          : 50,
    health: validHealth,
    headline:
      typeof value.headline === "string" && value.headline.trim()
        ? value.headline.trim()
        : "Pipeline analysis completed.",
    summary:
      typeof value.summary === "string" && value.summary.trim()
        ? value.summary.trim()
        : "No summary available.",
    topDrivers: Array.isArray(value.topDrivers)
      ? value.topDrivers.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    risks: Array.isArray(value.risks)
      ? value.risks.filter((item): item is string => typeof item === "string")
      : [],
    recommendations: Array.isArray(value.recommendations)
      ? value.recommendations.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    pipelineComment:
      typeof value.pipelineComment === "string" ? value.pipelineComment : "",
    singleDealRisk:
      typeof forecastSingleDealRisk === "number"
        ? Math.max(0, Math.min(100, Math.round(forecastSingleDealRisk)))
        : typeof value.singleDealRisk === "number"
          ? Math.max(0, Math.min(100, Math.round(value.singleDealRisk)))
          : 0,
  };
}
export async function POST(req: Request) {
  const supabase = await createClient();
  let locale: AppLanguage = "en";
  /*
   * AUTHENTICATION
   */
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }
    /*
     * REQUEST
     */
    const body = (await req.json()) as {
      leads?: LeadPayload[];
      forecast?: ForecastPayload;
      language?: AppLanguage;
    };
    locale = normalizeLanguage(body.language ?? user.user_metadata?.language);
    const responseLanguage = locale === "de" ? "German" : "English";
    const leads = body.leads ?? [];
    const forecast = body.forecast ?? {};
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        {
          error: "No leads available for forecast analysis.",
        },
        {
          status: 400,
        },
      );
    }
    /*
     * AI USAGE LIMIT
     *
     * This checks the user's workspace and
     * monthly AI allowance.
     */
    const usageCheck = await enforceAndTrackUsageLimit(
      supabase,
      user.id,
      "ai",
      req.headers.get("x-closeflow-workspace-id"),
    );
    if (!usageCheck.ok) {
      return NextResponse.json(
        {
          error: usageCheck.message,
        },
        {
          status: usageCheck.status,
        },
      );
    }
    if (!usageCheck.context) {
      return NextResponse.json(
        { error: "A workspace is required to use AI forecasting." },
        { status: 403 },
      );
    }
    /*
     * LIMIT INPUT SIZE
     *
     * Prevent unnecessarily large AI requests.
     */
    const formatLead = (lead: LeadPayload) =>
      [
        `Lead: ${lead.name ?? "Unknown"}`,
        `Company: ${lead.company ?? "Unknown"}`,
        `Stage: ${lead.status ?? "Unknown"}`,
        `Value: €${Number(lead.value ?? 0)}`,
        `User-entered costs and estimated net value: ${formatPersonalDealCostsForLead(user.user_metadata?.personal_deal_costs, String(lead.id || ""), Number(lead.value ?? 0))}`,
        `Notes: ${lead.notes ?? "None"}`,
        `Next action: ${lead.next_action ?? "None"}`,
      ].join("\n");
    /*
     * Won/lost deals are closed revenue, not
     * active opportunities. Keep them separate
     * so the AI cannot call a won deal an
     * "opportunity".
     */
    const activeLeads = leads
      .slice(0, 20)
      .filter((lead) => lead.status !== "won" && lead.status !== "lost");
    const closedLeads = leads
      .slice(0, 20)
      .filter((lead) => lead.status === "won" || lead.status === "lost");
    const activeLeadSummary =
      activeLeads.length > 0
        ? activeLeads.map(formatLead).join("\n\n")
        : "None";
    const closedLeadSummary =
      closedLeads.length > 0
        ? closedLeads.map(formatLead).join("\n\n")
        : "None";
    /*
     * PROMPT
     */
    const prompt = `
You are an enterprise CRM Revenue Intelligence AI.

Analyze this sales pipeline like a VP of Sales.

Evaluate:

- pipeline health
- revenue concentration
- deal quality
- inactivity risk
- proposal maturity
- forecast confidence
- biggest opportunities
- biggest threats
- recommended actions

The FORECAST numbers below are pre-calculated by the
system and are ground truth. They are not estimates for
you to re-derive. Your analysis must be consistent with
them in every field you return (summary, headline, risks,
recommendations, pipelineComment). Never state a different
number of active deals, a different probability, or a
different health level than what is provided. If
Active deals is 0, say there are no active deals; if it is
greater than 0, you must acknowledge that active deals
exist and reference the given Average health / Average
probability instead of inventing your own.

FORECAST

Pipeline value:
€${Number(forecast.pipelineValue ?? 0)}

Weighted revenue:
€${Number(forecast.weightedRevenue ?? 0)}

Revenue at risk:
€${Number(forecast.revenueAtRisk ?? 0)}

Commit revenue:
€${Number(forecast.commitRevenue ?? 0)}

Best case revenue:
€${Number(forecast.bestCaseRevenue ?? 0)}

Forecast confidence:
${Number(forecast.confidence ?? 0)}%

Average health:
${Number(forecast.averageHealth ?? 0)}%

Average probability:
${Number(forecast.averageProbability ?? 0)}%

Active deals:
${Number(forecast.activeDeals ?? 0)}

Deals with next action:
${Number(forecast.dealsWithNextAction ?? 0)}

Deals without next action:
${Number(forecast.dealsWithoutNextAction ?? 0)}

Next action coverage:
${Number(forecast.nextActionCoverage ?? 0)}%

  Single deal concentration risk:
${Number(forecast.singleDealRisk ?? 0)}%

ACTIVE OPPORTUNITIES (open, not won or lost)

${activeLeadSummary}

CLOSED DEALS (won or lost — reference only, these are
NOT active opportunities and must never be described as
"the largest opportunity" or similar)

${closedLeadSummary}

Return ONLY valid JSON with exactly this structure:

{
  "confidence": 0,
  "health": "Excellent",
  "headline": "",
  "summary": "",
  "topDrivers": [],
  "risks": [],
  "recommendations": [],
  "pipelineComment": "",
  "singleDealRisk": 0
}

Rules:

- confidence must be between 0 and 100
- singleDealRisk must be between 0 and 100
- health must be exactly one of:
  Excellent, Healthy, Warning, Critical
- topDrivers must be an array of strings
- risks must be an array of strings
- recommendations must be an array of strings
- Keep the response concise
- Do not invent deals or numbers
- Use each deal's user-entered costs when assessing profitability and prioritization. Distinguish gross values from estimated value after listed costs.
- Base the analysis only on the supplied data
- Never contradict the FORECAST values above (active deals, average health, average probability, revenue figures); treat them as factual
- confidence must equal the FORECAST confidence value above; never calculate or report a different confidence
- Only deals listed under ACTIVE OPPORTUNITIES may be referred to as an "opportunity", "biggest opportunity", or similar; deals listed under CLOSED DEALS are closed revenue and must only be described as such (e.g. "closed won revenue")
- singleDealRisk must equal the supplied FORECAST singleDealRisk value
- Never invent or calculate a different singleDealRisk
- Never invent or calculate a different nextActionCoverage
- Never invent or calculate a different number of deals with or without next actions
- If nextActionCoverage is provided, all statements about next actions must be consistent with it

Language:
${responseLanguage}
`;
    /*
     * AZURE OPENAI REQUEST
     */
    const openai = createTrackedAzureOpenAIClient(
      supabase,
      usageCheck.context.workspaceId,
      user.id,
      "revenue_forecast",
      "gpt-4.1-mini",
    );
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a CRM revenue intelligence assistant. Return valid JSON only." + aiTerminologyRules(locale),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
        temperature: 0.2,
      });
    } catch (azureError) {
      console.error("Revenue Forecast AI: Azure OpenAI request failed", azureError);
      return NextResponse.json(
        { error: "AI is temporarily unavailable. Please try again later." },
        { status: 502 },
      );
    }
    /*
     * RESPONSE
     */
    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.error("Revenue Forecast AI: empty response");
      return NextResponse.json({ error: "Azure OpenAI returned an empty response." }, { status: 502 });
    }
    /*
     * JSON PARSING
     */
    let parsed: Partial<RevenueForecastAIResponse>;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("Revenue Forecast AI: invalid JSON", {
        parseError,
      });
      return NextResponse.json({ error: "Azure OpenAI returned invalid JSON." }, { status: 502 });
    }
    /*
     * NORMALIZE
     */
    const result = normalizeResponse(
      parsed,
      locale,
      forecast.confidence,
      forecast.singleDealRisk,
    );
    console.log("Revenue Forecast AI: response received");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Revenue forecast AI failed:", error);
    return NextResponse.json(
      { error: "AI is temporarily unavailable. Please try again later." },
      { status: 502 },
    );
  }
}
