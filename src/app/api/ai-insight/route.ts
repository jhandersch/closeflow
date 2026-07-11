import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        headline: "Pipeline momentum is steady.",
        detail: payload?.detail ?? "Your current data suggests a healthy, active pipeline.",
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
        model: "gpt-5.5",
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
    const parsed = JSON.parse(content)

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({
      headline: "Pipeline momentum is steady.",
      detail: "Your CRM data is healthy and ready for follow-up.",
      actions: ["Follow up with proposal-stage leads.", "Review at-risk deals with low health scores."],
      confidence: "Medium",
    })
  }
}
