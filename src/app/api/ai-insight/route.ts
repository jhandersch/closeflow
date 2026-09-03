import { NextRequest, NextResponse } from "next/server";
type Locale = "en";
type InsightResponse = {
    headline: string;
    detail: string;
    actions: string[];
    confidence: "High" | "Medium" | "Low";
};
export async function POST(request: NextRequest) {
    let locale: Locale = "en";
    try {
        const payload = await request.json();
        locale =
            "en";
        const apiKey = process.env.OPENAI_API_KEY;
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
        const averageProbability = Number(payload?.forecast?.averageProbability || 0);
        const revenueAtRisk = Number(payload?.forecast?.revenueAtRisk || 0);
        const nextActionCoverage = activeDeals > 0
            ? Math.round((Number(payload?.forecast
                ?.dealsWithNextAction || 0) /
                activeDeals) * 100)
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
        }
        /*
         * AT RISK
         */
        else if (atRiskDeals > 0 ||
            revenueAtRisk > 0) {
            fallback = {
                headline: "Several opportunities need attention.",
                detail: `${atRiskDeals} active ${atRiskDeals === 1
                    ? "opportunity shows"
                    : "opportunities show"} elevated risk.`,
                actions: [
                    `Review the ${atRiskDeals} ${atRiskDeals === 1
                        ? "at-risk deal"
                        : "at-risk deals"}.`,
                    "Define concrete next steps.",
                    "Prioritize at-risk deals with high revenue potential.",
                ],
                confidence: "High",
            };
        }
        /*
         * LOW NEXT ACTION COVERAGE
         */
        else if (nextActionCoverage < 50) {
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
        }
        /*
         * PROPOSAL STAGE
         */
        else if (proposalLeads > 0) {
            fallback = {
                headline: "Proposal-stage opportunities need follow-up.",
                detail: `${proposalLeads} active ${proposalLeads === 1
                    ? "opportunity is"
                    : "opportunities are"} in the proposal stage within a €${pipelineValue.toLocaleString("en-US")} pipeline.`,
                actions: [
                    "Follow up on the proposal-stage opportunities.",
                    "Define the next concrete closing step.",
                    "Monitor proposal progression closely.",
                ],
                confidence: "High",
            };
        }
        /*
         * HEALTHY PIPELINE
         */
        else {
            fallback = {
                headline: "Pipeline momentum is steady.",
                detail: `Your pipeline contains ${activeDeals} active deals worth €${pipelineValue.toLocaleString("en-US")}, with an average health of ${averageHealth}% and close probability of ${averageProbability}%.`,
                actions: [
                    "Keep active opportunities moving.",
                    "Define clear next steps for important deals.",
                ],
                confidence: averageHealth >= 75 &&
                    averageProbability >= 60
                    ? "High"
                    : "Medium",
            };
        }
        /*
         * =========================
         * NO OPENAI KEY
         * =========================
         */
        if (!apiKey) {
            return NextResponse.json(fallback);
        }
        /*
         * =========================
         * OPENAI
         * =========================
         */
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-5.5-mini",
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
${"English"}
`,
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            ...payload,
                            derived_metrics: {
                                nextActionCoverage,
                            },
                            fallback_reference: fallback,
                        }, null, 2),
                    },
                ],
            }),
        });
        /*
         * =========================
         * OPENAI ERROR
         * =========================
         */
        if (!response.ok) {
            throw new Error(`OpenAI request failed with status ${response.status}`);
        }
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No AI response");
        }
        const parsed = JSON.parse(content);
        /*
         * =========================
         * VALIDATE AI RESPONSE
         * =========================
         */
        const validConfidence = [
            "High",
            "Medium",
            "Low",
        ];
        const confidence = validConfidence.includes(parsed?.confidence)
            ? parsed.confidence
            : fallback.confidence;
        const actions = Array.isArray(parsed?.actions)
            ? parsed.actions
                .filter((action: unknown) => typeof action ===
                "string")
                .slice(0, 3)
            : fallback.actions;
        /*
         * Safety check:
         * If there are no at-risk deals,
         * remove any AI recommendation
         * that incorrectly mentions risk.
         */
        const safeActions = atRiskDeals === 0 &&
            revenueAtRisk === 0
            ? actions.filter((action: string) => !/at.?risk|risiko|risk/i.test(action))
            : actions;
        /*
         * If the AI returned no usable
         * actions after validation,
         * use our deterministic fallback.
         */
        if (!parsed?.headline ||
            !parsed?.detail ||
            safeActions.length === 0) {
            return NextResponse.json(fallback);
        }
        return NextResponse.json({
            headline: String(parsed.headline),
            detail: String(parsed.detail),
            actions: safeActions,
            confidence,
        });
    }
    catch (error) {
        console.error("AI INSIGHT ERROR:", error);
        /*
         * Minimal safe fallback
         */
        return NextResponse.json({
            headline: "Pipeline analysis available",
            detail: "Your current CRM data has been analyzed.",
            actions: [
                "Review your most important active opportunities.",
                "Define clear next steps.",
            ],
            confidence: "Medium",
        });
    }
}
