import { translateText } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedOpenAIFetch } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
export async function POST(request: NextRequest) {
    const access = await requireAiWorkspaceQuota(request);
    if (!access.ok) return access.response;
    let language = normalizeLanguage(undefined);
    try {
        const payload = await request.json();
        language = normalizeLanguage(payload?.language);
        const responseLanguage = language === "de" ? "German" : "English";
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                explanation: language === "de" ? "Konzentriere dich auf hochwertige Abschlüsse mit hoher Abschlusschance." : "Focus on high-value deals and opportunities that are close to conversion.",
                nextAction: language === "de" ? "Prüfe priorisierte Leads und plane Nachfassaktionen." : "Review priority leads and schedule follow-ups.",
            });
        }
        const trackedFetch = createTrackedOpenAIFetch(
          access.supabase,
          access.workspaceId,
          access.userId,
          "priority_analysis",
        );
        const response = await trackedFetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4.1-mini",
                temperature: 0.3,
                messages: [
                    {
                        role: "system",
                        content: `
                You are an expert B2B sales manager.

                Analyze CRM deals.

                Return JSON only:
                {
                  "explanation": string,
                  "nextAction": string
                }

                Be concise and practical.
                Write explanation and nextAction in ${responseLanguage}.
                `,
                    },
                    {
                        role: "user",
                        content: JSON.stringify(payload),
                    },
                ],
            }),
        });
        if (!response.ok) {
            throw new Error(translateText("AI request failed"));
        }
        const data = await response.json();
        return NextResponse.json(JSON.parse(data.choices[0].message.content));
    }
    catch {
        return NextResponse.json({
            explanation: language === "de" ? "Prüfe zuerst die Verkaufschancen mit höchster Priorität." : "Review the highest priority opportunities first.",
            nextAction: language === "de" ? "Kontaktiere Abschlüsse mit hohem Wert und geringer Aktivität." : "Contact deals with high value and low activity.",
        });
    }
}
