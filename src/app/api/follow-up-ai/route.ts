import { NextRequest, NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { formatPersonalDealCostsForLead } from "@/lib/personalDealCosts";

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { lead } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        subject: "Follow up",
        email:
          "Hello, I wanted to follow up regarding our previous conversation.",
      });
    }

    const response = await fetch(
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
Write subject and email in English.
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
      throw new Error("OpenAI returned no content.");
    }

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      subject: "Follow up",
      email: "Unable to generate email.",
    });
  }
}
