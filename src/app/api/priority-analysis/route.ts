import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        explanation:
          "Focus on high-value deals and opportunities that are close to conversion.",
        nextAction:
          "Review priority leads and schedule follow-ups.",
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
        "Review the highest priority opportunities first.",
      nextAction:
        "Contact deals with high value and low activity.",
    })

  }
}