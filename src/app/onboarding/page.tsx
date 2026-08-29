import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

import {
  slugifyWorkspaceName,
  loadWorkspaceForUser,
} from "@/lib/supabase/route"

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    // --------------------------------------------------
    // 1. User
    // --------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("ONBOARDING STEP 1 - AUTH:", userError)

      return NextResponse.json(
        {
          error: "Unauthorized",
          step: "auth",
          details: userError?.message ?? "No user",
        },
        { status: 401 }
      )
    }

    console.log("ONBOARDING USER:", user.id)

    // --------------------------------------------------
    // 2. Request
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
          step: "validation",
        },
        { status: 400 }
      )
    }

    console.log("ONBOARDING DATA:", {
      companyName,
      industry,
      teamSize,
    })

    // --------------------------------------------------
    // 3. Existing workspace
    // --------------------------------------------------

    const {
      workspace: existingWorkspace,
      error: existingWorkspaceError,
    } = await loadWorkspaceForUser(
      supabase,
      user.id
    )

    if (existingWorkspaceError) {
      console.error(
        "ONBOARDING STEP 3 - LOAD WORKSPACE:",
        existingWorkspaceError
      )

      return NextResponse.json(
        {
          error: existingWorkspaceError.message,
          step: "load_workspace",
        },
        { status: 500 }
      )
    }

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
    // 4. Admin client
    // --------------------------------------------------

    console.log("ONBOARDING STEP 4 - CREATE ADMIN")

    const admin = createAdminClient()

    // --------------------------------------------------
    // 5. Workspace
    // --------------------------------------------------

    const slug = slugifyWorkspaceName(companyName)

    console.log("ONBOARDING STEP 5 - CREATE WORKSPACE:", {
      name: companyName,
      slug,
      industry,
      size: teamSize,
      owner_id: user.id,
    })

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
        "ONBOARDING STEP 5 - WORKSPACE ERROR:",
        workspaceError
      )

      return NextResponse.json(
        {
          error: workspaceError.message,
          code: workspaceError.code,
          details: workspaceError.details,
          hint: workspaceError.hint,
          step: "workspace_insert",
        },
        { status: 500 }
      )
    }

    if (!workspace) {
      return NextResponse.json(
        {
          error: "Workspace creation returned no workspace",
          step: "workspace_insert",
        },
        { status: 500 }
      )
    }

    console.log(
      "WORKSPACE CREATED:",
      workspace.id
    )

    // --------------------------------------------------
    // 6. Workspace member
    // --------------------------------------------------

    console.log(
      "ONBOARDING STEP 6 - CREATE MEMBER"
    )

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
        "ONBOARDING STEP 6 - MEMBER ERROR:",
        memberError
      )

      return NextResponse.json(
        {
          error: memberError.message,
          code: memberError.code,
          details: memberError.details,
          hint: memberError.hint,
          step: "workspace_member_insert",
        },
        { status: 500 }
      )
    }

    console.log(
      "WORKSPACE MEMBER CREATED:",
      user.id
    )

    // --------------------------------------------------
    // 7. Profile
    // --------------------------------------------------

    console.log(
      "ONBOARDING STEP 7 - UPDATE PROFILE"
    )

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
        "ONBOARDING STEP 7 - PROFILE ERROR:",
        profileError
      )

      return NextResponse.json(
        {
          error: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
          step: "profile_upsert",
        },
        { status: 500 }
      )
    }

    console.log(
      "PROFILE UPDATED:",
      user.id
    )

    // --------------------------------------------------
    // 8. Auth metadata
    // --------------------------------------------------

    console.log(
      "ONBOARDING STEP 8 - UPDATE AUTH METADATA"
    )

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
        "ONBOARDING STEP 8 - METADATA ERROR:",
        metadataError
      )

      return NextResponse.json(
        {
          error: metadataError.message,
          step: "auth_metadata",
        },
        { status: 500 }
      )
    }

    console.log(
      "ONBOARDING COMPLETED:",
      workspace.id
    )

    return NextResponse.json({
      ok: true,
      workspace_id: workspace.id,
    })

  } catch (error) {
    console.error(
      "ONBOARDING UNEXPECTED ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown onboarding error",
        step: "unexpected",
      },
      { status: 500 }
    )
  }
}
