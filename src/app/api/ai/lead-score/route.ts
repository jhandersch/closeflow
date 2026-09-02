import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"

const clamp = (value: number) => Math.max(0, Math.min(100, value))

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const lead = body.lead || body

  if (!lead) {
    return NextResponse.json({ error: "lead is required" }, { status: 400 })
  }

  const value = Number(lead.value || 0)
  const status = String(lead.status || "new")
  const lastContactAt = lead.last_contact_at ? new Date(lead.last_contact_at).getTime() : 0
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(lead.stage_changed_at || lead.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
  const contactDays = lastContactAt ? Math.floor((Date.now() - lastContactAt) / (1000 * 60 * 60 * 24)) : 99

  const stageScore: Record<string, number> = { new: 15, contacted: 50, proposal: 80, won: 100, lost: 0 }
  const score = clamp(
    Math.round((stageScore[status] || 20) + (value >= 50000 ? 12 : value >= 20000 ? 8 : value >= 10000 ? 5 : 2) + (contactDays <= 2 ? 15 : contactDays <= 7 ? 8 : -10) + (ageDays <= 7 ? 5 : -5))
  )

  const confidence = clamp(score >= 75 ? 90 : score >= 50 ? 75 : 60)
  const reason =
    score >= 75
      ? "Strong opportunity with recent activity and healthy value"
      : score >= 50
        ? "Promising lead that still needs consistent follow-up"
        : "Lead is stale or too early to forecast confidently"

  const payload = {
    score,
    confidence,
    reason,
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)

  if (workspace?.id && lead.id) {
    await supabase.from("lead_scores").insert({
      lead_id: lead.id,
      score,
      confidence,
      reason,
    })
  }

  return NextResponse.json(payload)
}
