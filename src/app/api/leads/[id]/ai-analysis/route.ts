import { NextRequest, NextResponse } from "next/server"
import {
  getRouteUser,
  loadWorkspaceForUser,
} from "@/lib/supabase/route"

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: "Missing lead id" },
        { status: 400 }
      )
    }

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

    const {
      workspace,
      error: workspaceError,
    } = await loadWorkspaceForUser(
      supabase,
      user.id
    )

    if (workspaceError || !workspace?.id) {
      return NextResponse.json(
        { error: "Workspace required" },
        { status: 403 }
      )
    }

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .single()

    if (leadError || !lead) {
      console.error(
        "AI LEAD LOOKUP ERROR:",
        leadError
      )

      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      )
    }

    const analysis = `
AI Deal Analysis

Lead:
${lead.name}

Company:
${lead.company ?? "—"}

Deal Value:
€${lead.value ?? 0}

Current Stage:
${lead.status}

Recommendation:

- Follow up with this lead based on the current pipeline stage.
- Review deal risks and next actions.
- Keep activity history updated.
- Prioritize communication if the deal is valuable.

Risk Level:
${
  lead.status === "new"
    ? "Medium"
    : "Low"
}

Opportunity:
This lead has potential and should remain actively managed.
`

    return NextResponse.json({
      analysis,
    })
  } catch (error) {
    console.error(
      "AI ANALYSIS ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    )
  }
}
