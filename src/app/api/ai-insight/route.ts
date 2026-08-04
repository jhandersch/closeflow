import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  let locale: "de" | "en" = "de"

  try {
    const payload = await request.json()
    locale = payload?.language === "en" ? "en" : "de"
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        headline: locale === "de" ? "Die Pipeline entwickelt sich stabil." : "Pipeline momentum is steady.",
        detail: payload?.detail ?? (locale === "de" ? "Deine aktuellen Daten zeigen eine aktive und gesunde Pipeline." : "Your current data suggests a healthy, active pipeline."),
        actions: payload?.actions ?? [],
        confidence: "Medium",
      })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.5-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `
        You are an expert B2B sales strategist.

        Analyze the CRM data.

        Always return ONLY valid JSON.

        Format:

        {
          "headline":"...",
          "detail":"...",
          "actions":[
            "...",
            "...",
            "..."
          ],
          "confidence":"High"
        }

        confidence must be one of:

        High
        Medium
        Low

        No markdown.
        No explanations.
        Only JSON.
        Keep confidence enum values exactly as High, Medium, Low.
        Write headline/detail/actions in ${locale === "de" ? "German" : "English"}.
        `,
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error("OpenAI request failed")
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? ""
    let parsed

    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error("Invalid AI JSON")
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({
      headline: locale === "de" ? "Die Pipeline entwickelt sich stabil." : "Pipeline momentum is steady.",
      detail: locale === "de" ? "Deine CRM-Daten sind gesund und bereit für Follow-ups." : "Your CRM data looks healthy and ready for follow-up.",
      actions:
        locale === "de"
          ? ["Fasse Leads in der Angebotsphase nach.", "Prüfe risikobehaftete Deals mit niedrigem Health-Score."]
          : ["Follow up on leads in the proposal stage.", "Review at-risk deals with a low health score."],
      confidence: "Medium",
    })
  }
}
