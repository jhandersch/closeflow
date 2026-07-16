import { NextResponse } from "next/server"
import { getRouteUser, slugifyWorkspaceName } from "@/lib/supabase/route"

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 })
  }

  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (existingMembership?.workspace_id) {
    return NextResponse.json({ error: "Workspace already exists for user" }, { status: 400 })
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name,
      owner_id: user.id,
      plan: "free",
    })
    .select("id, name, owner_id, plan, created_at")
    .single()

  if (workspaceError) {
    return NextResponse.json({ error: workspaceError.message }, { status: 500 })
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  const nextSlug = slugifyWorkspaceName(name)

  return NextResponse.json({
    workspace: {
      ...workspace,
      slug: nextSlug,
    },
  })
}