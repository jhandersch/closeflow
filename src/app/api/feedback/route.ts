import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { createClient } from "@supabase/supabase-js";
// Public POST — no auth required, uses service role for insert
export async function POST(request: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
        return NextResponse.json({ error: "Feedback collection not configured" }, { status: 500 });
    }
    const body = await request.json();
    const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
    const contactEmail = typeof body.contact_email === "string" ? body.contact_email.trim().toLowerCase() : null;
    const contactName = typeof body.contact_name === "string" ? body.contact_name.trim() : null;
    if (!workspaceId) {
        return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
        return NextResponse.json({ error: "rating must be between 1 and 10" }, { status: 400 });
    }
    const admin = createClient(url, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: insertError } = await admin.from("audit_logs").insert({
        workspace_id: workspaceId,
        actor_user_id: null,
        event_type: "feedback.submitted",
        payload: {
            rating,
            comment,
            contact_email: contactEmail,
            contact_name: contactName,
            submitted_at: new Date().toISOString(),
        },
    });
    if (insertError) {
        return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
// Authenticated GET — returns workspace feedback
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace) {
        return NextResponse.json({ items: [] });
    }
    const { data } = await supabase
        .from("audit_logs")
        .select("id, payload, created_at")
        .eq("workspace_id", workspace.id)
        .eq("event_type", "feedback.submitted")
        .order("created_at", { ascending: false })
        .limit(100);
    return NextResponse.json({
        items: (data || []).map((row) => ({ id: row.id, ...(row.payload as object), submitted_at: row.created_at })),
        workspace_id: workspace.id,
    });
}
