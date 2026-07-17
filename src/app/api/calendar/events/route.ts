import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get("from") || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const to = url.searchParams.get("to") || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)

  let [activitiesRes, tasksRes] = await Promise.all([
    supabase
      .from("activities")
      .select("id, lead_id, type, title, action, description, created_at")
      .eq("user_id", user.id)
      .in("type", ["meeting", "call_completed", "email_sent"])
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`)
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, lead_id, title, due_date, priority, completed")
      .eq("user_id", user.id)
      .not("due_date", "is", null)
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_date", { ascending: true }),
  ])

  if (activitiesRes.error && /column .* does not exist/i.test(activitiesRes.error.message || "")) {
    const fallbackActivitiesRes = await supabase
      .from("activities")
      .select("id, lead_id, type, action, created_at")
      .eq("user_id", user.id)
      .in("type", ["meeting", "call_completed", "email_sent"])
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`)
      .order("created_at", { ascending: true })

    activitiesRes = fallbackActivitiesRes as typeof activitiesRes
  }

  const activities = (activitiesRes.data || []).map((a) => ({
    id: a.id,
    type: "activity" as const,
    activityType: a.type,
    title: a.title || a.action || "",
    description: a.description || null,
    date: a.created_at,
    leadId: a.lead_id,
  }))

  const tasks = (tasksRes.data || []).map((t) => ({
    id: t.id,
    type: "task" as const,
    activityType: "task",
    title: t.title,
    description: null,
    date: `${t.due_date}T00:00:00Z`,
    leadId: t.lead_id,
    priority: t.priority,
    completed: t.completed,
  }))

  return NextResponse.json({ events: [...activities, ...tasks], workspace_id: workspace?.id || null })
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const leadId = typeof body.lead_id === "string" ? body.lead_id.trim() : null
  const scheduledAt = typeof body.scheduled_at === "string" ? body.scheduled_at.trim() : null
  const description = typeof body.description === "string" ? body.description.trim() : ""

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  let { data, error: insertError } = await supabase
    .from("activities")
    .insert({
      lead_id: leadId,
      user_id: user.id,
      type: "meeting",
      action: title,
      title,
      description: description || null,
      created_at: scheduledAt || new Date().toISOString(),
    })
    .select("id, lead_id, type, title, action, description, created_at")
    .single()

  if (insertError && /column .* does not exist/i.test(insertError.message || "")) {
    const fallbackInsert = await supabase
      .from("activities")
      .insert({
        lead_id: leadId,
        user_id: user.id,
        type: "meeting",
        action: title,
        created_at: scheduledAt || new Date().toISOString(),
      })
      .select("id, lead_id, type, action, created_at")
      .single()

    data = fallbackInsert.data as typeof data
    insertError = fallbackInsert.error
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
