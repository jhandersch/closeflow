import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

const clamp = (value: number) => Math.max(0, Math.min(100, value))

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const stageScores: Record<string, number> = {
    new: 12,
    contacted: 28,
    qualified: 48,
    proposal: 72,
    won: 92,
    lost: 10,
  }

  const valueScore = lead.value >= 50000 ? 12 : lead.value >= 20000 ? 8 : lead.value >= 10000 ? 5 : 2
  const stageScore = stageScores[lead.status] ?? 20
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24)))
  const freshnessScore = ageDays <= 2 ? 15 : ageDays <= 7 ? 8 : ageDays <= 14 ? 0 : -10
  const noteScore = lead.notes ? 5 : 0

  const score = clamp(Math.round(stageScore + valueScore + freshnessScore + noteScore))
  const risk = score >= 75 ? "low" : score >= 45 ? "medium" : "high"
  const reason =
    score >= 75
      ? "High activity and proposal stage"
      : score >= 45
        ? "Lead is active but still needs progress"
        : "Lead is stale or early-stage"

  return NextResponse.json({ score, risk, reason })
}