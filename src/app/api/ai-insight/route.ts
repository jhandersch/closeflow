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

type InsightResponse = {
  headline: string;
  detail: string;
  actions: string[];
  confidence: "High" | "Medium" | "Low";
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
    const payload = await request.json();
    language = normalizeLanguage(
      payload?.language ?? user.user_metadata?.language,
    );
    const responseLanguage = language === "de" ? "German" : "English";
    const leadsWithCosts = Array.isArray(payload?.leads)
      ? payload.leads.map((lead: any) => ({
          ...lead,
          personal_deal_costs: getPersonalDealCostsForLead(
            user.user_metadata?.personal_deal_costs,
            String(lead.id || ""),
          ),
        }))
      : [];
    /*
     * =========================
     * FALLBACK
     * =========================
     */
    const atRiskDeals = Number(payload?.atRiskDeals || 0);
    const proposalLeads = Number(payload?.proposalLeads || 0);
    const activeDeals = Number(payload?.forecast?.activeDeals || 0);
    const pipelineValue = Number(payload?.forecast?.pipelineValue || 0);
    const averageHealth = Number(payload?.forecast?.averageHealth || 0);
    const averageProbability = Number(
      payload?.forecast?.averageProbability || 0,
    );
    const revenueAtRisk = Number(payload?.forecast?.revenueAtRisk || 0);
    const nextActionCoverage =
      activeDeals > 0
        ? Math.round(
            (Number(payload?.forecast?.dealsWithNextAction || 0) /
              activeDeals) *
              100,
          )
        : 0;
    let fallback: InsightResponse;
    /*
     * NO ACTIVE DEALS
     */
    if (activeDeals === 0) {
      fallback = {
        headline: "No active opportunities.",
        detail: "Your pipeline currently contains no open deals.",
        actions: [
          "Create new leads.",
          "Define clear next steps for new opportunities.",
        ],
        confidence: "High",
      };
    } else if (atRiskDeals > 0 || revenueAtRisk > 0) {
      /*
       * AT RISK
       */
      fallback = {
        headline: "Several opportunities need attention.",
        detail: `${atRiskDeals} active ${
          atRiskDeals === 1 ? "opportunity shows" : "opportunities show"
        } elevated risk.`,
        actions: [
          `Review the ${atRiskDeals} ${
            atRiskDeals === 1 ? "at-risk deal" : "at-risk deals"
          }.`,
          "Define concrete next steps.",
          "Prioritize at-risk deals with high revenue potential.",
        ],
        confidence: "High",
      };
    } else if (nextActionCoverage < 50) {
      /*
       * LOW NEXT ACTION COVERAGE
       */
      fallback = {
        headline: "Your pipeline needs clearer next actions.",
        detail: `Only ${nextActionCoverage}% of active deals currently have a defined next action. The pipeline is healthy, but missing follow-ups increase inactivity risk.`,
        actions: [
          "Define next actions for deals without follow-ups.",
          "Prioritize active deals with high revenue potential.",
          proposalLeads > 0
            ? "Follow up on deals currently in the proposal stage."
            : "Keep active opportunities moving.",
        ],
        confidence: "High",
      };
    } else if (proposalLeads > 0) {
      /*
       * PROPOSAL STAGE
       */
      fallback = {
        headline: "Proposal-stage opportunities need follow-up.",
        detail: `${proposalLeads} active ${
          proposalLeads === 1 ? "opportunity is" : "opportunities are"
        } in the proposal stage within a €${pipelineValue.toLocaleString("en-US")} pipeline.`,
        actions: [
          "Follow up on the proposal-stage opportunities.",
          "Define the next concrete closing step.",
          "Monitor proposal progression closely.",
        ],
        confidence: "High",
      };
    } else {
      /*
       * HEALTHY PIPELINE
       */
      fallback = {
        headline: "Pipeline momentum is steady.",
        detail: `Your pipeline contains ${activeDeals} active deals worth €${pipelineValue.toLocaleString("en-US")}, with an average health of ${averageHealth}% and close probability of ${averageProbability}%.`,
        actions: [
          "Keep active opportunities moving.",
          "Define clear next steps for important deals.",
        ],
        confidence:
          averageHealth >= 75 && averageProbability >= 60 ? "High" : "Medium",
      };
    }
    /*
     * =========================
     * AZURE OPENAI
     * =========================
     */
    const model = "gpt-4.1-mini";
    const azureConfig = getAzureOpenAIConfig(model);
    const trackedFetch = createTrackedAzureOpenAIFetch(
      access.supabase,
      access.workspaceId,
      access.userId,
      "ai_insight",
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
          temperature: 0.2,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: `
You are the AI sales intelligence engine inside a professional CRM.

Analyze the provided CRM data and produce a concise dashboard insight.

IMPORTANT:
You must base every statement and recommendation strictly on the provided data.

NEVER invent customers, deals, values, risks, activities or probabilities.

CRITICAL BUSINESS RULES:

When a lead includes user-entered deal costs, consider their effect on estimated deal profitability and prioritization. Distinguish gross deal values from estimated value after those listed costs, and never treat them as verified accounting figures.

1. Only describe deals as "at risk" when atRiskDeals > 0 OR revenueAtRisk > 0.

2. If atRiskDeals = 0 AND revenueAtRisk = 0:
   NEVER recommend reviewing at-risk deals.

3. If next action coverage is low:
   recommend defining next actions and follow-ups.

4. If proposalLeads > 0:
   proposal-stage deals may be recommended for follow-up.

5. If there are no active deals:
   recommend creating new opportunities.

6. Prefer actionable recommendations over generic statements.

7. Do not contradict the numerical CRM data.

8. All monetary values are in EURO.
   ALWAYS use the € symbol.
   NEVER use "$", "USD", or any other currency.

9. Keep the insight concise.

10. Return ONLY valid JSON.

Required format:

{
  "headline": "...",
  "detail": "...",
  "actions": [
    "...",
    "...",
    "..."
  ],
  "confidence": "High | Medium | Low"
}

Confidence must be exactly one of:

High
Medium
Low

Language:
${responseLanguage}

Write every user-visible value entirely in ${responseLanguage}. Do not mix languages. Keep JSON keys and confidence values in English.
`,
            },
            {
              role: "user",
              content: JSON.stringify(
                {
                  ...payload,
                  leads: leadsWithCosts,
                  derived_metrics: {
                    nextActionCoverage,
                  },
                  fallback_reference: fallback,
                },
                null,
                2,
              ),
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
      throw new Error(`Azure OpenAI request failed with status ${response.status}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(translateText("No AI response"));
    }
    const parsed = JSON.parse(content);
    /*
     * =========================
     * VALIDATE AI RESPONSE
     * =========================
     */
    const validConfidence = ["High", "Medium", "Low"];
    if (!validConfidence.includes(parsed?.confidence)) {
      throw new Error("Azure OpenAI returned an invalid confidence value.");
    }
    const actions = Array.isArray(parsed?.actions)
      ? parsed.actions
          .filter((action: unknown) => typeof action === "string")
          .slice(0, 3)
      : [];
    /*
     * Safety check:
     * If there are no at-risk deals,
     * remove any AI recommendation
     * that incorrectly mentions risk.
     */
    const safeActions =
      atRiskDeals === 0 && revenueAtRisk === 0
        ? actions.filter(
            (action: string) => !/at.?risk|risiko|risk/i.test(action),
          )
        : actions;
    if (
      typeof parsed?.headline !== "string" ||
      !parsed.headline.trim() ||
      typeof parsed?.detail !== "string" ||
      !parsed.detail.trim() ||
      safeActions.length === 0
    ) {
      throw new Error("Azure OpenAI returned an incomplete insight.");
    }
    return NextResponse.json({
      headline: parsed.headline,
      detail: parsed.detail,
      actions: safeActions,
      confidence: parsed.confidence,
    });
  } catch (error) {
    console.error("AI INSIGHT ERROR:", error);
    return NextResponse.json(
      { error: language === "de" ? "Die Pipeline-Analyse ist fehlgeschlagen." : "Pipeline analysis failed." },
      { status: 502 },
    );
  }
}
