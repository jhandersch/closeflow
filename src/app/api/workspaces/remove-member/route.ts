import { NextResponse } from "next/server"
import { getRouteUser, requireMfaForWorkspaceRole } from "@/lib/supabase/route"

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : ""
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : ""

  if (!workspaceId || !userId) {
    return NextResponse.json({ error: "workspace_id and user_id are required" }, { status: 400 })
  }

  const authz = await requireMfaForWorkspaceRole(request, supabase, workspaceId, user.id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}