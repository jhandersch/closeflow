import { NextResponse } from "next/server";
import { getRouteUser, slugifyWorkspaceName } from "@/lib/supabase/route";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`workspace:create:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited);
    let body: { name?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
        return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }
    const { data, error: createError } = await supabase.rpc(
        "create_workspace_with_limit",
        {
            p_name: name,
            p_slug: slugifyWorkspaceName(name),
            p_industry: null,
            p_size: null,
        },
    );
    if (createError) {
        if (createError.code === "22023") {
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }
        if (createError.code === "23514") {
            return NextResponse.json({ error: createError.message }, { status: 409 });
        }
        if (createError.code === "23505") {
            return NextResponse.json({ error: "A workspace with this name already exists." }, { status: 409 });
        }
        console.error("CREATE WORKSPACE RPC ERROR:", createError);
        return NextResponse.json({ error: "Could not create workspace." }, { status: 500 });
    }
    const workspace = Array.isArray(data) ? data[0] : null;
    if (!workspace?.workspace_id) {
        console.error("CREATE WORKSPACE RPC RETURNED NO WORKSPACE:", user.id);
        return NextResponse.json({ error: "Workspace creation returned no workspace." }, { status: 500 });
    }
    return NextResponse.json({
        workspace: {
            id: workspace.workspace_id,
            name: workspace.name,
            owner_id: workspace.owner_id,
            plan: workspace.plan,
            created_at: workspace.created_at,
            slug: workspace.slug,
        },
    });
}
