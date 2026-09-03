import { NextRequest, NextResponse } from "next/server";
type Locale = "en";
export async function POST(request: NextRequest) {
    let locale: Locale = "en";
    try {
        const { leads, language, } = await request.json();
        locale = "en";
        const apiKey = process.env.OPENAI_API_KEY;
        /*
         * =========================
         * FALLBACK
         * =========================
         */
        if (!apiKey) {
            return NextResponse.json({
                headline: "Priority analysis ready",
                explanation: "The most important deals are prioritized using value, pipeline stage, activity and close probability.",
                nextAction: "Start with high-value deals in advanced stages.",
                priorityReason: "High-value opportunities with strong closing potential should be handled first.",
                riskLevel: "Medium",
            });
        }
        /*
         * =========================
         * OPENAI REQUEST
         * =========================
         */
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0.25,
                response_format: {
                    type: "json_object",
                },
                messages: [
                    {
                        role: "system",
                        content: `
You are an AI sales strategist inside a professional CRM.

Your job:
Analyze the provided opportunities and identify the single most important deal to focus on.

Use these signals:

- Deal value
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

${"English"}

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
                        content: JSON.stringify(leads, null, 2),
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
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error?.message ||
                `OpenAI request failed with status ${response.status}`);
        }
        /*
         * =========================
         * PARSE RESPONSE
         * =========================
         */
        const result = await response.json();
        const content = result?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No AI response");
        }
        const parsed = JSON.parse(content);
        /*
         * =========================
         * VALIDATE RESPONSE
         * =========================
         */
        const validRiskLevels = [
            "Low",
            "Medium",
            "High",
        ];
        const riskLevel = validRiskLevels.includes(parsed?.riskLevel)
            ? parsed.riskLevel
            : "Medium";
        return NextResponse.json({
            headline: typeof parsed?.headline === "string"
                ? parsed.headline
                :
                    "Deals need attention",
            explanation: typeof parsed?.explanation === "string"
                ? parsed.explanation
                : "",
            nextAction: typeof parsed?.nextAction === "string"
                ? parsed.nextAction
                : "",
            priorityReason: typeof parsed?.priorityReason === "string"
                ? parsed.priorityReason
                : "",
            riskLevel,
        });
    }
    catch (error) {
        console.error("PRIORITY AI ERROR:", error);
        /*
         * =========================
         * SAFE FALLBACK
         * =========================
         */
        return NextResponse.json({
            headline: "Deals need attention",
            explanation: "The pipeline should be reviewed using value, activity and closing probability.",
            nextAction: "Review your highest-value opportunities.",
            priorityReason: "High-potential opportunities should be handled first.",
            riskLevel: "Medium",
        });
    }
}
