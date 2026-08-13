import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

const isAdminEmail = (
  email: string | null | undefined
) => {
  if (!email) return false

  const admins = (
    process.env.CLOSEFLOW_ADMIN_EMAILS || ""
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  return admins.includes(
    email.toLowerCase()
  )
}

export async function GET(
  request: Request
) {
  const {
    supabase,
    user,
    error,
  } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }

  /*
   * Workspace-Mitgliedschaft des Users laden.
   *
   * workspace_members ist die zentrale
   * Berechtigungsquelle für CloseFlow.
   */
  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("workspace_members")
    .select(
      "workspace_id, role, created_at"
    )
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    )

  if (membershipError) {
    console.error(
      "WORKSPACE PERMISSIONS ERROR:",
      membershipError
    )

    return NextResponse.json(
      {
        error:
          "Workspace membership lookup failed",
      },
      {
        status: 500,
      }
    )
  }

  /*
   * Aktuell verwenden wir den ersten Workspace
   * als aktiven Workspace.
   *
   * Später kann hier ein expliziter
   * Active-Workspace-State verwendet werden.
   */
  const membership =
    memberships?.[0] ?? null

  const rawRole =
    typeof membership?.role === "string"
      ? membership.role.toLowerCase()
      : null

  const role =
    rawRole === "owner" ||
    rawRole === "admin" ||
    rawRole === "member" ||
    rawRole === "viewer"
      ? rawRole
      : null

  /*
   * Workspace-Berechtigungen
   */
  const canManageWorkspace =
    role === "owner" ||
    role === "admin"

  /*
   * Billing darf ausschließlich
   * vom Workspace Owner verwaltet werden.
   */
  const canManageBilling =
    role === "owner"

  /*
   * Platform Admin bleibt unabhängig
   * von der Workspace-Rolle.
   */
  const isPlatformAdmin =
    isAdminEmail(user.email)

  return NextResponse.json({
    role,

    workspaceId:
      membership?.workspace_id ?? null,

    isPlatformAdmin,

    canManageWorkspace,

    canManageBilling,
  })
}
