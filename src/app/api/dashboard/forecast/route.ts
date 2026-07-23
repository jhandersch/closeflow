import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)
  if (!workspace?.id) {
    return NextResponse.json({ pipelineValue: 0, weightedRevenue: 0, winRate: 0 })
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("value, status")
    .eq("workspace_id", workspace.id)

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 })
  }

  const pipelineValue = (leads || []).reduce((sum, lead) => sum + (lead.value || 0), 0)
  const weightedRevenue = (leads || []).reduce((sum, lead) => {
    const weight = lead.status === "won" ? 1 : lead.status === "proposal" ? 0.7 : lead.status === "contacted" ? 0.3 : lead.status === "new" ? 0.1 : 0
    return sum + (lead.value || 0) * weight
  }, 0)
  const won = (leads || []).filter((lead) => lead.status === "won").length
  const open = (leads || []).filter((lead) => lead.status !== "won" && lead.status !== "lost").length
  const winRate = won + open > 0 ? Math.round((won / (won + open)) * 100) : 0

  return NextResponse.json({
    pipelineValue: Math.round(pipelineValue),
    weightedRevenue: Math.round(weightedRevenue),
    winRate,
  })
}