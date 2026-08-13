import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

import {
  slugifyWorkspaceName,
  loadWorkspaceForUser,
} from "@/lib/supabase/route"

export async function POST(request: Request) {
  const supabase = await createClient()

  // --------------------------------------------------
  // 1. Authentifizierten User holen
  // --------------------------------------------------

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error(
      "ONBOARDING AUTH ERROR:",
      userError
    )

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  console.log(
    "ONBOARDING USER:",
    user.id
  )

  console.log(
    "ONBOARDING AUTH UID:",
    user.id
  )

  try {
    // --------------------------------------------------
    // 2. Request Body
    // --------------------------------------------------

    const body = await request.json()

    const companyName =
      typeof body.companyName === "string"
        ? body.companyName.trim()
        : ""

    const industry =
      typeof body.industry === "string"
        ? body.industry.trim()
        : ""

    const teamSize =
      typeof body.teamSize === "string"
        ? body.teamSize.trim()
        : ""

    if (!companyName) {
      return NextResponse.json(
        {
          error: "Company name required",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------------------------
    // 3. Prüfen, ob bereits Workspace existiert
    // --------------------------------------------------

    const {
      workspace: existingWorkspace,
    } = await loadWorkspaceForUser(
      supabase,
      user.id
    )

    if (existingWorkspace?.id) {
      console.log(
        "EXISTING WORKSPACE:",
        existingWorkspace.id
      )

      return NextResponse.json({
        ok: true,
        workspace_id: existingWorkspace.id,
      })
    }

    // --------------------------------------------------
    // 4. Admin Client erstellen
    // --------------------------------------------------

    const admin = createAdminClient()

    const slug =
      slugifyWorkspaceName(companyName)

    // --------------------------------------------------
    // 5. Workspace erstellen
    // --------------------------------------------------

    const {
      data: workspace,
      error: workspaceError,
    } = await admin
      .from("workspaces")
      .insert({
        name: companyName,
        slug,
        industry,
        size: teamSize,
        owner_id: user.id,
        plan: "free",
      })
      .select()
      .single()

    if (workspaceError) {
      console.error(
        "ONBOARDING WORKSPACE ERROR:",
        workspaceError
      )

      throw workspaceError
    }

    if (!workspace) {
      throw new Error(
        "Workspace creation returned no workspace"
      )
    }

    console.log(
      "WORKSPACE CREATED:",
      workspace.id
    )

    // --------------------------------------------------
    // 6. Owner als Workspace Member hinzufügen
    // --------------------------------------------------

    const {
      error: memberError,
    } = await admin
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
        permissions: {},
      })

    if (memberError) {
      console.error(
        "ONBOARDING MEMBER ERROR:",
        memberError
      )

      throw memberError
    }

    console.log(
      "WORKSPACE OWNER CREATED:",
      user.id
    )

    // --------------------------------------------------
    // 7. Profil aktualisieren
    // --------------------------------------------------

    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        company_name: companyName,
      })

    if (profileError) {
      console.error(
        "ONBOARDING PROFILE ERROR:",
        profileError
      )

      throw profileError
    }

    // --------------------------------------------------
    // 8. Onboarding abschließen
    // --------------------------------------------------

    const {
      error: metadataError,
    } = await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        workspace_id: workspace.id,
      },
    })

    if (metadataError) {
      console.error(
        "ONBOARDING METADATA ERROR:",
        metadataError
      )

      throw metadataError
    }

    // --------------------------------------------------
    // 9. Fertig
    // --------------------------------------------------

    console.log(
      "ONBOARDING COMPLETED:",
      workspace.id
    )

    return NextResponse.json({
      ok: true,
      workspace_id: workspace.id,
    })

  } catch (err) {
    console.error(
      "ONBOARDING FAILED:",
      err
    )

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Onboarding failed",
      },
      {
        status: 500,
      }
    )
  }
}