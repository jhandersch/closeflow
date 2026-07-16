import { NextResponse } from "next/server"
import { getRouteUser, getWorkspacePayload } from "@/lib/supabase/route"

export async function GET(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const workspaceId = url.searchParams.get("workspace_id")

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id is required" }, { status: 400 })
  }

  const payload = await getWorkspacePayload(supabase, workspaceId)
  return NextResponse.json({ members: payload.members, invites: payload.invites })
}