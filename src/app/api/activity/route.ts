import { NextResponse } from "next/server"
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route"

const allowedTypes = new Set([
    "created",
    "status_changed",
    "note_added",
    "email_sent",
    "call_completed",
    "task_created",
    "task_completed",
    "meeting_created",
    "meeting_updated",
    "meeting_completed",
    "meeting_deleted",
    "ai",
    "other",
])

const getFromDate = (filter: string) => {
    const now = new Date()
    const from = new Date(now)

    if (filter === "today") {
        from.setHours(0, 0, 0, 0)
        return from
    }

    if (filter === "week") {
        from.setDate(now.getDate() - 7)
        return from
    }

    from.setDate(now.getDate() - 30)
    return from
}

export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request)

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { workspace } = await loadWorkspaceForUser(supabase, user.id)
    if (!workspace?.id) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 })
    }

    try {
        const body = await request.json()

        const leadId =
            typeof body.lead_id === "string"
                ? body.lead_id.trim()
                : typeof body.leadId === "string"
                    ? body.leadId.trim()
                    : ""

        const type =
            typeof body.type === "string" && allowedTypes.has(body.type)
                ? body.type
                : "other"

        const title =
            typeof body.title === "string" && body.title.trim()
                ? body.title.trim()
                : typeof body.action === "string" && body.action.trim()
                    ? body.action.trim()
                    : "Activity updated"

        const description =
            typeof body.description === "string" && body.description.trim()
                ? body.description.trim()
                : null

        const metadata =
            typeof body.metadata === "object" && body.metadata !== null
                ? body.metadata
                : {}

        if (!leadId) {
            return NextResponse.json({ error: "lead_id is required" }, { status: 400 })
        }

        const { data: lead, error: leadError } = await supabase
            .from("leads")
            .select("id, workspace_id")
            .eq("id", leadId)
            .eq("workspace_id", workspace.id)
            .single()

        if (leadError || !lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 })
        }

        const { data: created, error: createError } = await supabase
            .from("activities")
            .insert({
                workspace_id: workspace.id,
                lead_id: leadId,
                user_id: user.id,
                type,
                title,
                description,
                action: title,
                metadata,
            })
            .select("id, workspace_id, user_id, lead_id, type, title, description, action, metadata, created_at")
            .single()

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json(created, { status: 201 })
    } catch (requestError) {
        console.error(requestError)
        return NextResponse.json({ error: "Activity failed" }, { status: 500 })
    }
}

export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request)

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { workspace } = await loadWorkspaceForUser(supabase, user.id)
    if (!workspace?.id) {
        return NextResponse.json([])
    }

    try {
        const url = new URL(request.url)
        const filter = url.searchParams.get("filter") || "month"
        const from = getFromDate(filter)

        const { data, error: queryError } = await supabase
            .from("activities")
            .select("id, workspace_id, user_id, lead_id, type, title, description, action, metadata, created_at")
            .eq("workspace_id", workspace.id)
            .gte("created_at", from.toISOString())
            .order("created_at", { ascending: false })

        if (queryError) {
            return NextResponse.json({ error: queryError.message }, { status: 500 })
        }

        const normalized = (data || []).map((row) => ({
            ...row,
            title: row.title || row.action || "Activity updated",
            description: row.description || null,
        }))

        return NextResponse.json(normalized)
    } catch (requestError) {
        console.error(requestError)
        return NextResponse.json({ error: "Activity load failed" }, { status: 500 })
    }
}