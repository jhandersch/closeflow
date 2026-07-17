import { NextResponse } from "next/server"
import OpenAI from "openai"
import { getRouteUser } from "@/lib/supabase/route"
import { captureWorkspaceError } from "@/lib/errorMonitoring"
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits"
import { recordAiUsageEvent } from "@/lib/aiCost"

export async function POST(request: Request) {
  let userId: string | null = null

  try {
    const { supabase, user, error } = await getRouteUser(request)

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    const limitCheck = await enforceAndTrackUsageLimit(supabase, user.id, "ai")
    if (!limitCheck.ok) {
      return NextResponse.json({ error: limitCheck.message }, { status: limitCheck.status })
    }

    const body = await request.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const mode = typeof body.mode === "string" ? body.mode.trim() : "sales-coach"
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : null

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    const apiKey = process.env.OPENAI_API_KEY

    const fallback = {
      answer: `AI (${mode}): ${message}`,
      sources: [],
    }

    if (!apiKey) {
      return NextResponse.json(fallback)
    }

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are CloseFlow AI. Return JSON with answer and sources. Mode: ${mode}. Write concise, practical sales guidance.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")
    const payload = {
      answer: typeof result.answer === "string" ? result.answer : fallback.answer,
      sources: Array.isArray(result.sources) ? result.sources : [],
    }

    if (membership?.workspace_id) {
      await recordAiUsageEvent(
        supabase,
        membership.workspace_id,
        user.id,
        "ai_chat",
        "gpt-4.1-mini",
        completion.usage?.prompt_tokens || 0,
        completion.usage?.completion_tokens || 0
      )

      await supabase.from("ai_conversations").insert({
        workspace_id: membership.workspace_id,
        user_id: user.id,
        lead_id: leadId,
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: payload.answer },
        ],
      })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error(error)

    if (userId) {
      const { supabase } = await getRouteUser(request)
      await captureWorkspaceError(supabase, userId, {
        source: "api",
        level: "error",
        message: "AI chat route failed",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        pathname: "/api/ai/chat",
      })
    }

    return NextResponse.json({ error: "AI failed" }, { status: 500 })
  }
}
