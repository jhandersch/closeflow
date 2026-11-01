import { translateText } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
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
    const { user, error } = await getRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await request.json();
    const { lead } = payload;
    language = normalizeLanguage(payload.language ?? user.user_metadata?.language);
    const responseLanguage = language === "de" ? "German" : "English";

    const model = "gpt-4o-mini";
    const azureConfig = getAzureOpenAIConfig(model);
    const trackedFetch = createTrackedAzureOpenAIFetch(
      access.supabase,
      access.workspaceId,
      access.userId,
      "follow_up_ai",
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
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content: `
You are an expert B2B sales assistant.
${aiTerminologyRules(language)}

Create a professional follow-up email.

Use the user's listed deal costs to guide commercially sound recommendations, but do not disclose internal costs or margins to the customer.

Consider:
- customer name
- company
- deal value
- pipeline stage
- notes
- user-entered costs for this deal and their effect on estimated profitability

Return ONLY JSON:

{
  "subject": "email subject",
  "email": "email body"
}

Keep it concise and human.
Write subject and email in ${responseLanguage}.
`,
            },
            {
              role: "user",
              content: JSON.stringify({
                ...lead,
                personal_deal_costs: formatPersonalDealCostsForLead(
                  user.user_metadata?.personal_deal_costs,
                  String(lead?.id || ""),
                  Number(lead?.value || 0),
                ),
              }),
            },
          ],
        }),
      },
    );

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(translateText("Azure OpenAI returned no content."));
    }

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: language === "de" ? "Die E-Mail konnte nicht erstellt werden." : "Unable to generate email." },
      { status: 502 },
    );
  }
}
