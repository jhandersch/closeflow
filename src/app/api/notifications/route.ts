import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"

type Notification = {
  id: string
  title: string
  message: string
  level: "info" | "warning" | "critical"
  leadId: string
  createdAt: string
}

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)
  if (!workspace?.id) {
    return NextResponse.json([])
  }

  const [{ data: leads, error: leadsError }, { data: activities, error: activitiesError }] = await Promise.all([
    supabase.from("leads").select("id, name, company, created_at, stage_changed_at").eq("workspace_id", workspace.id).is("deleted_at", null),
    supabase.from("activities").select("lead_id, created_at").eq("workspace_id", workspace.id),
  ])

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 })
  }

  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 500 })
  }

  const latestActivityByLead = new Map<string, string>()
  for (const activity of activities || []) {
    const current = latestActivityByLead.get(activity.lead_id)
    if (!current || new Date(activity.created_at).getTime() > new Date(current).getTime()) {
      latestActivityByLead.set(activity.lead_id, activity.created_at)
    }
  }

  const notifications: Notification[] = (leads || [])
    .map((lead) => {
      const latest = latestActivityByLead.get(lead.id) || lead.stage_changed_at || lead.created_at
      const idleDays = Math.floor((Date.now() - new Date(latest).getTime()) / (1000 * 60 * 60 * 24))

      if (idleDays < 7) {
        return null
      }

      return {
        id: lead.id,
        title: `Lead ${lead.name || lead.company || "Unknown"} needs attention`,
        message: `${idleDays} days without activity`,
        level: idleDays >= 14 ? "critical" : "warning",
        leadId: lead.id,
        createdAt: new Date().toISOString(),
      }
    })
    .filter(Boolean) as Notification[]

  return NextResponse.json(notifications)
}