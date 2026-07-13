import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {

  let locale: "de" | "en" = "de"

  try {
    const payload = await request.json()
    locale = payload?.language === "en" ? "en" : "de"

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        explanation:
          locale === "de"
            ? "Konzentriere dich auf hochwertige Deals und Chancen kurz vor dem Abschluss."
            : "Focus on high-value deals and opportunities that are close to conversion.",
        nextAction:
          locale === "de"
            ? "Prüfe priorisierte Leads und plane Follow-ups."
            : "Review priority leads and schedule follow-ups.",
      })
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
          model: "gpt-5.5",
          temperature: 0.3,

          messages: [
            {
              role: "system",
              content:
                `
                You are an expert B2B sales manager.

                Analyze CRM deals.

                Return JSON only:
                {
                  "explanation": string,
                  "nextAction": string
                }

                Be concise and practical.
                Write explanation and nextAction in ${locale === "de" ? "German" : "English"}.
                `,
            },

            {
              role: "user",
              content: JSON.stringify(payload),
            },
          ],
        }),
      }
    )


    if (!response.ok) {
      throw new Error("AI request failed")
    }


    const data = await response.json()

    return NextResponse.json(
      JSON.parse(data.choices[0].message.content)
    )


  } catch {

    return NextResponse.json({
      explanation:
        locale === "de" ? "Prüfe zuerst die wichtigsten Opportunities." : "Review the highest priority opportunities first.",
      nextAction:
        locale === "de" ? "Kontaktiere Deals mit hohem Wert und niedriger Aktivität." : "Contact deals with high value and low activity.",
    })

  }
}