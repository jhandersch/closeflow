import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser, requireMfaForWorkspaceRole } from "@/lib/supabase/route"

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)

  if (!workspace) {
    return NextResponse.json([])
  }

  const { data, error: queryError } = await supabase
    .from("automations")
    .select("id, workspace_id, name, trigger_event, actions, enabled, created_at, updated_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
  }

  const authz = await requireMfaForWorkspaceRole(request, supabase, workspace.id, user.id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const body = await request.json()
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const triggerEvent = typeof body.trigger_event === "string" ? body.trigger_event.trim() : "lead.created"
  const actions = Array.isArray(body.actions) ? body.actions : []
  const enabled = body.enabled !== false

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const { data, error: insertError } = await supabase
    .from("automations")
    .insert({
      workspace_id: workspace.id,
      name,
      trigger_event: triggerEvent,
      actions,
      enabled,
    })
    .select("id, workspace_id, name, trigger_event, actions, enabled, created_at, updated_at")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
  }

  const authz = await requireMfaForWorkspaceRole(request, supabase, workspace.id, user.id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const body = await request.json()
  const id = typeof body.id === "string" ? body.id.trim() : ""
  const enabled = Boolean(body.enabled)

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const { data, error: updateError } = await supabase
    .from("automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("id, workspace_id, name, trigger_event, actions, enabled, created_at, updated_at")
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspace } = await loadWorkspaceForUser(supabase, user.id)

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
  }

  const authz = await requireMfaForWorkspaceRole(request, supabase, workspace.id, user.id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const body = await request.json()
  const id = typeof body.id === "string" ? body.id.trim() : ""

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from("automations")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
