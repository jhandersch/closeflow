import { translateText } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";
import { requireAiWorkspaceQuota } from "@/lib/aiAccess";
import { createTrackedOpenAIFetch } from "@/lib/aiCost";
import { normalizeLanguage } from "@/lib/i18n";

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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        subject: language === "de" ? "Rückfrage" : "Follow up",
        email: language === "de"
          ? "Guten Tag, ich möchte mich zu unserem letzten Gespräch erkundigen."
          : "Hello, I wanted to follow up regarding our previous conversation.",
      });
    }

    const trackedFetch = createTrackedOpenAIFetch(
      access.supabase,
      access.workspaceId,
      access.userId,
      "follow_up_ai",
    );
    const response = await trackedFetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content: `
You are an expert B2B sales assistant.

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
      throw new Error(translateText("OpenAI returned no content."));
    }

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      subject: language === "de" ? "Rückfrage" : "Follow up",
      email: language === "de" ? "Die E-Mail konnte nicht erstellt werden." : "Unable to generate email.",
    });
  }
}
