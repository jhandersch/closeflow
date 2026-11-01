import { translateText } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import {
  createTrackedAzureOpenAIFetch,
  getAzureChatCompletionsUrl,
  getAzureOpenAIConfig,
} from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";
import { aiTerminologyRules } from "@/lib/aiLanguage";
export async function POST(request: NextRequest) {
  const access = await requireAiWorkspaceQuota(request);
  if (!access.ok) return access.response;
  let language = normalizeLanguage(undefined);
  try {
    const payload = await request.json();
    language = normalizeLanguage(payload?.language);
    const responseLanguage = language === "de" ? "German" : "English";
    const model = "gpt-4.1-mini";
    const azureConfig = getAzureOpenAIConfig(model);
    const trackedFetch = createTrackedAzureOpenAIFetch(
      access.supabase,
      access.workspaceId,
      access.userId,
      "priority_analysis",
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
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `
                You are an expert B2B sales manager.
${aiTerminologyRules(language)}

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
      },
    );
    if (!response.ok) throw new Error(translateText("Azure OpenAI request failed."));
    const data = await response.json();
    return NextResponse.json(JSON.parse(data.choices[0].message.content));
  } catch (error) {
    console.error("Priority analysis failed:", error);
    return NextResponse.json(
      { error: language === "de" ? "Die KI-Analyse ist fehlgeschlagen." : "AI analysis failed." },
      { status: 502 },
    );
  }
}
