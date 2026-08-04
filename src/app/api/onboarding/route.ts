import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"
import { slugifyWorkspaceName } from "@/lib/supabase/route"
import { loadWorkspaceForUser } from "@/lib/supabase/route"

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
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
        { error: "Company name required" },
        { status: 400 }
      )
    }


    const { workspace: existingWorkspace } = await loadWorkspaceForUser(supabase, user.id)

    if (existingWorkspace?.id) {
      return NextResponse.json({
        ok: true,
        workspace_id: existingWorkspace.id,
      })
    }



    // Workspace erstellen
    const { data: workspace, error: workspaceError } =
      await supabase
        .from("workspaces")
        .insert({
          name: companyName,
          slug: slugifyWorkspaceName(companyName),
          industry,
          size: teamSize,
          owner_id: user.id,
          plan: "free",
        })
        .select()
        .single()


    if (workspaceError) {
      throw workspaceError
    }



    // Owner hinzufügen
    const { error: memberError } =
      await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "owner",
          permissions: {},
        })


    if (memberError) {
      throw memberError
    }



    // Profil aktualisieren
    const { error: profileError } =
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          company_name: companyName,
        })


    if (profileError) {
      throw profileError
    }



    // Onboarding abschließen
    await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        workspace_id: workspace.id,
      },
    })



    return NextResponse.json({
      ok: true,
      workspace_id: workspace.id,
    })


  } catch (err) {

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