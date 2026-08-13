import { NextResponse } from "next/server"
import {
  getRouteUser,
  requireMfaForWorkspaceRole,
} from "@/lib/supabase/route"
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

  const userId =
    typeof body.user_id === "string"
      ? body.user_id.trim()
      : ""

  const role =
    typeof body.role === "string"
      ? body.role.trim().toLowerCase()
      : ""

  if (
    !workspaceId ||
    !userId ||
    !role
  ) {
    return NextResponse.json(
      {
        error:
          "workspace_id, user_id and role are required",
      },
      { status: 400 }
    )
  }

  if (!rolePattern.test(role)) {
    return NextResponse.json(
      {
        error:
          "Invalid workspace role.",
      },
      { status: 400 }
    )
  }

  /*
   * Aktuelle Rolle des eingeloggten Users
   * prüfen.
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
   * Rollen ändern.
   */
  if (
    workspaceRole.role !== "owner" &&
    workspaceRole.role !== "admin"
  ) {
    return NextResponse.json(
      {
        error:
          "Only workspace owners and admins can change member roles.",
      },
      { status: 403 }
    )
  }

  /*
   * Owner/Admin-Aktionen benötigen AAL2.
   */
  const authz =
    await requireMfaForWorkspaceRole(
      request,
      supabase,
      workspaceId,
      user.id
    )

  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.message },
      { status: authz.status }
    )
  }

  /*
   * Zielmitglied laden.
   */
  const {
    data: targetMember,
    error: targetError,
  } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (targetError) {
    return NextResponse.json(
      { error: targetError.message },
      { status: 500 }
    )
  }

  if (!targetMember) {
    return NextResponse.json(
      {
        error:
          "Workspace member not found.",
      },
      { status: 404 }
    )
  }

  /*
   * Owner-Rolle darf nicht verändert werden.
   */
  if (targetMember.role === "owner") {
    return NextResponse.json(
      {
        error:
          "The workspace owner's role cannot be changed.",
      },
      { status: 403 }
    )
  }

  /*
   * Nur der Owner darf jemanden zum
   * Admin machen oder Admins verwalten.
   */
  if (
    workspaceRole.role === "admin" &&
    (targetMember.role === "admin" ||
      role === "admin" ||
      role === "owner")
  ) {
    return NextResponse.json(
      {
        error:
          "Admins cannot manage admin roles.",
      },
      { status: 403 }
    )
  }

  /*
   * Niemand darf über diese API
   * einen zweiten Owner erzeugen.
   */
  if (role === "owner") {
    return NextResponse.json(
      {
        error:
          "The workspace owner role cannot be assigned.",
      },
      { status: 403 }
    )
  }

  /*
   * Rolle aktualisieren.
   */
  const {
    error: memberError,
  } = await supabase
    .from("workspace_members")
    .update({
      role,
    })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)

  if (memberError) {
    return NextResponse.json(
      { error: memberError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
  })
}