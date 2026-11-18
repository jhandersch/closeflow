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
import { readJsonObject } from "@/lib/requestValidation";

const isPriorityAnalysisResponse = (
  value: unknown,
): value is { explanation: string; nextAction: string } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.explanation === "string" &&
    response.explanation.trim().length > 0 &&
    response.explanation.length <= 4000 &&
    typeof response.nextAction === "string" &&
    response.nextAction.trim().length > 0 &&
    response.nextAction.length <= 1000
  );
};

export async function POST(request: NextRequest) {
  const access = await requireAiWorkspaceQuota(request);
  if (!access.ok) return access.response;
  let language = normalizeLanguage(undefined);
  try {
    const payload = await readJsonObject(request);
    if (!payload) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
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
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Priority analysis returned no content.");
    }
    const parsed: unknown = JSON.parse(content);
    if (!isPriorityAnalysisResponse(parsed)) {
      throw new Error("Priority analysis returned an invalid response.");
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Priority analysis failed:", error);
    return NextResponse.json(
      { error: language === "de" ? "Die KI-Analyse ist fehlgeschlagen." : "AI analysis failed." },
      { status: 502 },
    );
  }
}
