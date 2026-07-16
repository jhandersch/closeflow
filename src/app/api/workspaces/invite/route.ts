import { NextResponse } from "next/server"
import { getRouteUser, requireMfaForWorkspaceRole } from "@/lib/supabase/route"

const rolePattern = /^(owner|admin|member|viewer)$/i

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const role = typeof body.role === "string" && rolePattern.test(body.role) ? body.role.toLowerCase() : "member"

  if (!workspaceId || !email) {
    return NextResponse.json({ error: "workspace_id and email are required" }, { status: 400 })
  }

  const authz = await requireMfaForWorkspaceRole(request, supabase, workspaceId, user.id)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await supabase.from("workspace_invites").insert({
    workspace_id: workspaceId,
    email,
    role,
    token,
    expires_at: expiresAt,
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    token,
    inviteUrl: `${new URL(request.url).origin}/team?invite=${encodeURIComponent(token)}`,
  })
}