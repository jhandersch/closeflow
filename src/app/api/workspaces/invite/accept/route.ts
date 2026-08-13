import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

export async function POST(request: Request) {
  try {
    const {
      supabase,
      user,
      error: authError,
    } = await getRouteUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : ""

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 }
      )
    }

    /*
     * Invite anhand des Tokens laden
     */
    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from("workspace_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle()

    if (inviteError) {
      console.error(
        "LOAD INVITE ERROR:",
        inviteError
      )

      return NextResponse.json(
        { error: inviteError.message },
        { status: 500 }
      )
    }

    if (!invite) {
      return NextResponse.json(
        {
          error:
            "Invitation not found or invalid",
        },
        { status: 404 }
      )
    }

    /*
     * Ablaufdatum prüfen
     */
    if (
      invite.expires_at &&
      new Date(invite.expires_at).getTime() <
        Date.now()
    ) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      )
    }

    /*
     * Einladung muss an die aktuell
     * eingeloggte E-Mail-Adresse gerichtet sein.
     */
    const userEmail =
      user.email?.trim().toLowerCase()

    const inviteEmail =
      typeof invite.email === "string"
        ? invite.email.trim().toLowerCase()
        : ""

    if (
      !userEmail ||
      !inviteEmail ||
      userEmail !== inviteEmail
    ) {
      return NextResponse.json(
        {
          error:
            "This invitation was sent to a different email address.",
        },
        { status: 403 }
      )
    }

    /*
     * Prüfen, ob der User bereits Mitglied ist
     */
    const {
      data: existingMember,
      error: memberCheckError,
    } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq(
        "workspace_id",
        invite.workspace_id
      )
      .eq("user_id", user.id)
      .maybeSingle()

    if (memberCheckError) {
      console.error(
        "CHECK MEMBER ERROR:",
        memberCheckError
      )

      return NextResponse.json(
        { error: memberCheckError.message },
        { status: 500 }
      )
    }

    /*
     * Wenn bereits Mitglied:
     * Einladung trotzdem entfernen.
     */
    if (existingMember) {
      const { error: deleteInviteError } =
        await supabase
          .from("workspace_invites")
          .delete()
          .eq("id", invite.id)

      if (deleteInviteError) {
        console.error(
          "DELETE INVITE ERROR:",
          deleteInviteError
        )

        return NextResponse.json(
          {
            error:
              deleteInviteError.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        ok: true,
        alreadyMember: false,
        workspaceId:
          invite.workspace_id,
      })
    }

    /*
     * User als Workspace-Mitglied hinzufügen
     */
    const {
      error: insertError,
    } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id:
          invite.workspace_id,
        user_id: user.id,
        role: invite.role,
      })

    if (insertError) {
      console.error(
        "ADD WORKSPACE MEMBER ERROR:",
        insertError
      )

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    /*
     * Einladung nach erfolgreicher
     * Annahme löschen.
     */
    const {
      error: deleteInviteError,
    } = await supabase
      .from("workspace_invites")
      .delete()
      .eq("id", invite.id)

    if (deleteInviteError) {
      console.error(
        "DELETE INVITE ERROR:",
        deleteInviteError
      )

      return NextResponse.json(
        {
          error:
            "User was added to the workspace, but the invitation could not be removed.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      alreadyMember: false,
      workspaceId:
        invite.workspace_id,
    })
  } catch (error) {
    console.error(
      "ACCEPT INVITE CRASH:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}
