import { NextResponse } from "next/server"
import OpenAI from "openai"
import { getRouteUser } from "@/lib/supabase/route"

export async function POST(request: Request) {
  try {
    const { user, error } = await getRouteUser(request)

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const lead = body.lead || {}
    const goal = typeof body.goal === "string" ? body.goal : "Follow up"
    const tone = typeof body.tone === "string" ? body.tone : "professional"
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        subject: `${goal} - ${lead.company || lead.name || "Lead"}`,
        body: `Hello${lead.name ? ` ${lead.name}` : ""},\n\nI wanted to ${goal.toLowerCase()} regarding ${lead.company || "your company"}.\n\nBest regards`,
      })
    }

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Create a sales email generator. Return JSON with subject and body. Tone: ${tone}. Goal: ${goal}.`,
        },
        {
          role: "user",
          content: JSON.stringify(lead),
        },
      ],
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")

    return NextResponse.json({
      subject: typeof result.subject === "string" ? result.subject : `${goal}`,
      body: typeof result.body === "string" ? result.body : "",
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "AI failed" }, { status: 500 })
  }
}
