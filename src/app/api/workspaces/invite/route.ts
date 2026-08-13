import { NextResponse } from "next/server"
import {
  getRouteUser,
  requireAal2,
} from "@/lib/supabase/route"
import { enforceTeamSeatLimit } from "@/lib/usageLimits"
import { sendWorkspaceInviteEmail } from "@/lib/email"
import {
  getWorkspaceUserRole,
} from "@/lib/supabase/workspaceAuth"

const rolePattern =
  /^(owner|admin|member|viewer)$/i

export async function POST(request: Request) {
  const {
    supabase,
    user,
    error,
  } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await request.json()

  const workspaceId =
    typeof body.workspace_id === "string"
      ? body.workspace_id.trim()
      : ""

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : ""

  const role =
    typeof body.role === "string" &&
    rolePattern.test(body.role)
      ? body.role.toLowerCase()
      : "member"

  if (!workspaceId || !email) {
    return NextResponse.json(
      {
        error:
          "workspace_id and email are required",
      },
      { status: 400 }
    )
  }

  /*
   * Sensible Workspace-Aktion:
   * AAL2 erforderlich.
   */
  const authz = await requireAal2(
    request,
    supabase
  )

  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.message },
      { status: authz.status }
    )
  }

  /*
   * Prüfen, ob der eingeloggte User
   * überhaupt Mitglied dieses Workspaces ist
   * und welche Rolle er besitzt.
   */
  const workspaceRole =
    await getWorkspaceUserRole(
      supabase,
      workspaceId,
      user.id
    )

  if (!workspaceRole.ok) {
    return NextResponse.json(
      { error: workspaceRole.message },
      { status: workspaceRole.status }
    )
  }

  /*
   * Nur Owner und Admin dürfen
   * Workspace-Mitglieder einladen.
   */
  if (
    workspaceRole.role !== "owner" &&
    workspaceRole.role !== "admin"
  ) {
    return NextResponse.json(
      {
        error:
          "Only workspace owners and admins can invite members.",
      },
      { status: 403 }
    )
  }

  /*
   * Team-Sitzplatzlimit prüfen.
   */
  const seatLimit =
    await enforceTeamSeatLimit(
      supabase,
      user.id,
      workspaceId
    )

  if (!seatLimit.ok) {
    return NextResponse.json(
      {
        error: seatLimit.message,
      },
      {
        status: seatLimit.status,
      }
    )
  }

  /*
   * Einladung erstellen.
   */
  const token =
    crypto.randomUUID()

  const expiresAt =
    new Date(
      Date.now() +
        7 *
          24 *
          60 *
          60 *
          1000
    ).toISOString()

  const {
    error: inviteError,
  } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email,
      role,
      token,
      expires_at: expiresAt,
    })

  if (inviteError) {
    console.error(
      "CREATE WORKSPACE INVITE ERROR:",
      inviteError
    )

    return NextResponse.json(
      {
        error:
          inviteError.message,
      },
      { status: 500 }
    )
  }

  /*
   * Einladung-Link erzeugen.
   */
  const inviteUrl =
    `${new URL(request.url).origin}/team?invite=${encodeURIComponent(token)}`

  /*
   * Einladung per E-Mail verschicken.
   */
  try {
    await sendWorkspaceInviteEmail({
      to: email,
      inviteUrl,
      workspaceName: "CloseFlow",
    })
  } catch (emailError) {
    console.error(
      "INVITE EMAIL ERROR:",
      emailError
    )

    return NextResponse.json(
      {
        error:
          "Invitation was created, but the email could not be sent.",
      },
      {
        status: 500,
      }
    )
  }

  return NextResponse.json({
    ok: true,
    inviteUrl,
  })
}
