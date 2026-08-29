import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

import {
  slugifyWorkspaceName,
  loadWorkspaceForUser,
} from "@/lib/supabase/route"

type QuickStartMode = "lead" | "demo"

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("ONBOARDING AUTH ERROR:", userError)

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  console.log("ONBOARDING USER:", user.id)

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

    const quickStartMode: QuickStartMode =
      body.quickStartMode === "demo"
        ? "demo"
        : "lead"

    const leadName =
      typeof body.leadName === "string"
        ? body.leadName.trim()
        : ""

    const leadCompany =
      typeof body.leadCompany === "string"
        ? body.leadCompany.trim()
        : ""

    const leadValueRaw =
      typeof body.leadValue === "string"
        ? body.leadValue.trim()
        : ""

    const leadStatus =
      typeof body.leadStatus === "string"
        ? body.leadStatus.trim()
        : "new"

    if (!companyName) {
      return NextResponse.json(
        { error: "Company name required" },
        { status: 400 }
      )
    }

    if (quickStartMode === "lead") {
      if (!leadName || !leadCompany) {
        return NextResponse.json(
          {
            error: "Lead name and company are required",
          },
          { status: 400 }
        )
      }

      if (
        leadValueRaw &&
        Number.isNaN(Number(leadValueRaw))
      ) {
        return NextResponse.json(
          {
            error: "Lead value must be a valid number",
          },
          { status: 400 }
        )
      }
    }

    // --------------------------------------------------
    // Workspace bereits vorhanden?
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
        quick_start_mode: quickStartMode,
      })
    }

    // --------------------------------------------------
    // Admin Client
    // --------------------------------------------------

    const admin = createAdminClient()

    const slug =
      slugifyWorkspaceName(companyName)

    // --------------------------------------------------
    // Workspace erstellen
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
    // Owner als Member hinzufügen
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

    // --------------------------------------------------
    // Profil
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
    // Quick Start: erster Lead
    // --------------------------------------------------

    if (quickStartMode === "lead") {
      const parsedLeadValue =
        leadValueRaw
          ? Number(leadValueRaw)
          : 0

      const {
        error: leadError,
      } = await admin
        .from("leads")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          name: leadName,
          company: leadCompany,
          status: leadStatus,
          value: parsedLeadValue,
          notes: null,
          stage_changed_at:
            new Date().toISOString(),
          last_activity_at:
            new Date().toISOString(),
        })

      if (leadError) {
        console.error(
          "ONBOARDING LEAD ERROR:",
          leadError
        )

        throw leadError
      }

      console.log(
        "FIRST LEAD CREATED:",
        leadName
      )
    }

    // --------------------------------------------------
    // Quick Start: Demo-Daten
    // --------------------------------------------------

    if (quickStartMode === "demo") {
      const authorization =
        request.headers.get("authorization") ??
        request.headers.get("Authorization")

      if (!authorization) {
        throw new Error(
          "Authorization header missing for demo seed"
        )
      }

      const origin =
        new URL(request.url).origin

      const demoResponse =
        await fetch(
          `${origin}/api/demo/seed`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                authorization,
            },
            body: JSON.stringify({
              mode: "load",
            }),
            cache: "no-store",
          }
        )

      const demoResult =
        await demoResponse
          .json()
          .catch(() => null)

      if (!demoResponse.ok) {
        console.error(
          "ONBOARDING DEMO ERROR:",
          demoResult
        )

        throw new Error(
          demoResult?.error ||
          "Failed to load demo data"
        )
      }

      console.log(
        "DEMO DATA LOADED:",
        demoResult
      )
    }

    // --------------------------------------------------
    // Onboarding abschließen
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

    console.log(
      "ONBOARDING COMPLETED:",
      workspace.id
    )

    return NextResponse.json({
      ok: true,
      workspace_id: workspace.id,
      quick_start_mode: quickStartMode,
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
      { status: 500 }
    )
  }
}
