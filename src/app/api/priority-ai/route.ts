import { translateText } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { getPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import {
  createTrackedAzureOpenAIFetch,
  getAzureChatCompletionsUrl,
  getAzureOpenAIConfig,
} from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";
import { readJsonObject } from "@/lib/requestValidation";

const isPriorityResponse = (value: unknown): value is {
  headline: string;
  explanation: string;
  nextAction: string;
  priorityReason: string;
  riskLevel: "Low" | "Medium" | "High";
} => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.headline === "string" && result.headline.trim().length > 0 && result.headline.length <= 500 &&
    typeof result.explanation === "string" && result.explanation.length <= 4000 &&
    typeof result.nextAction === "string" && result.nextAction.length <= 1000 &&
    typeof result.priorityReason === "string" && result.priorityReason.length <= 2000 &&
    (result.riskLevel === "Low" || result.riskLevel === "Medium" || result.riskLevel === "High")
  );
};

export async function POST(request: NextRequest) {
  const access = await requireAiWorkspaceQuota(request);
  if (!access.ok) return access.response;
  let language = normalizeLanguage(undefined);
  try {
    const { user, error } = await getRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await readJsonObject(request);
    if (!payload) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const leads = Array.isArray(payload.leads) ? payload.leads : [];
    language = normalizeLanguage(
      payload.language ?? user.user_metadata?.language,
    );
    const responseLanguage = language === "de" ? "German" : "English";
    const leadsWithCosts = Array.isArray(leads)
      ? leads.map((lead) => {
          if (!lead || typeof lead !== "object" || Array.isArray(lead)) return null;
          const leadRecord = lead as Record<string, unknown>;
          return {
          ...leadRecord,
          personal_deal_costs: getPersonalDealCostsForLead(
            user.user_metadata?.personal_deal_costs,
            String(leadRecord.id || ""),
          ),
        };
        }).filter((lead) => lead !== null)
      : [];


    /*
     * =========================
     * FALLBACK
     * =========================
     */
    /*
     * =========================
     * AZURE OPENAI REQUEST
     * =========================
     */
    const model = "gpt-4o-mini";
    const azureConfig = getAzureOpenAIConfig(model);
    const trackedFetch = createTrackedAzureOpenAIFetch(
      access.supabase,
      access.workspaceId,
      access.userId,
      "priority_ai",
      model,
    );
    const response = await trackedFetch(
      getAzureChatCompletionsUrl(model),
      {
        method: "POST",
        headers: {
          "api-key": azureConfig.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: azureConfig.deployment,
          temperature: 0.25,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: `
You are an AI sales strategist inside a professional CRM.
${aiTerminologyRules(language)}

Your job:
Analyze the provided opportunities and identify the single most important deal to focus on.

Use these signals:

- Deal value
- User-entered deal costs and estimated net value after those costs
- Pipeline stage
- Priority score
- Health score
- Close probability
- Urgency
- Customer notes
- Next action
- Activity freshness

Rules:

1. Focus on actionable sales advice.
2. Prefer deals with high revenue potential.
   Evaluate revenue potential using deal value after subtracting any listed user-entered costs.
3. Consider risks from inactivity.
4. Recommend one specific next step.
5. Do not invent customer information.
6. Only use information explicitly provided in the input.
7. If a next_action exists, consider it when recommending the next step.
8. Do not describe a deal as at-risk unless the provided risk/health/activity data supports it.
9. Do not claim that a deal needs attention because of a missing next action unless the data actually shows that the next action is missing.
10. Select the single most relevant opportunity from the provided leads.

CURRENCY RULE:

All deal values are stored in EURO.

Always display monetary values using the EUR symbol (€).

NEVER use "$", "USD", "US dollars", or any other currency.

Examples:

18500 -> €18,500
5000 -> €5,000
24300 -> €24,300

Language:

${responseLanguage}

Every user-visible text value must be written entirely in ${responseLanguage}. Do not mix languages. Keep JSON keys and the riskLevel enum in English.

Return ONLY valid JSON:

{
  "headline": "short title",
  "explanation": "clear sales analysis",
  "nextAction": "specific action",
  "priorityReason": "why this opportunity matters",
  "riskLevel": "Low | Medium | High"
}

Keep answers concise.
`,
            },
            {
              role: "user",
              content: JSON.stringify(leadsWithCosts, null, 2),
            },
          ],
        }),
      },
    );

    /*
     * =========================
     * AZURE OPENAI ERROR
     * =========================
     */
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      throw new Error(errorData?.error?.message || `Azure OpenAI request failed with status ${response.status}`);
    }

    /*
     * =========================
     * PARSE RESPONSE
     * =========================
     */
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(translateText("No AI response"));
    }

    const parsed = JSON.parse(content);

    /*
     * =========================
     * VALIDATE RESPONSE
     * =========================
     */
    if (!isPriorityResponse(parsed)) {
      throw new Error("Azure OpenAI returned an invalid priority response.");
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("PRIORITY AI ERROR:", error);

    /*
     * =========================
     * SAFE FALLBACK
     * =========================
     */
    return NextResponse.json(
      { error: language === "de" ? "Die KI-Priorisierung ist fehlgeschlagen." : "AI prioritization failed." },
      { status: 502 },
    );
  }
}
