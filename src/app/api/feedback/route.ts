import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { createFeedbackToken, verifyFeedbackToken } from "@/lib/feedbackToken";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
        return NextResponse.json({ error: "Feedback collection not configured" }, { status: 500 });
    }
    let body: {
        workspace_id?: unknown;
        feedback_token?: unknown;
        rating?: unknown;
        comment?: unknown;
        contact_email?: unknown;
        contact_name?: unknown;
    };
    try {
        const parsed: unknown = await request.json();
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
        }
        body = parsed;
    }
    catch {
        return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
    }
    const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
    const feedbackToken = typeof body.feedback_token === "string" ? body.feedback_token : "";
    const rating = body.rating;
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
    const contactEmail = typeof body.contact_email === "string" ? body.contact_email.trim().toLowerCase().slice(0, 254) : null;
    const contactName = typeof body.contact_name === "string" ? body.contact_name.trim().slice(0, 120) : null;
    if (!workspaceId) {
        return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
        return NextResponse.json({ error: "Invalid workspace_id" }, { status: 400 });
    }
    if (!verifyFeedbackToken(workspaceId, feedbackToken, serviceRole)) {
        return NextResponse.json({ error: "Invalid feedback link" }, { status: 403 });
    }
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 10) {
        return NextResponse.json({ error: "rating must be between 1 and 10" }, { status: 400 });
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return NextResponse.json({ error: "contact_email must be a valid email address" }, { status: 400 });
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
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRole) {
        return NextResponse.json({ error: "Feedback links are not configured" }, { status: 500 });
    }
    const { data, error: feedbackError } = await supabase
        .from("audit_logs")
        .select("id, payload, created_at")
        .eq("workspace_id", workspace.id)
        .eq("event_type", "feedback.submitted")
        .order("created_at", { ascending: false })
        .limit(100);
    if (feedbackError) {
        console.error("FEEDBACK INBOX LOAD ERROR:", feedbackError);
        return NextResponse.json({ error: "Could not load feedback" }, { status: 500 });
    }
    return NextResponse.json({
        items: (data || []).map((row) => ({ id: row.id, ...(row.payload as object), submitted_at: row.created_at })),
        workspace_id: workspace.id,
        feedback_token: createFeedbackToken(workspace.id, serviceRole),
    });
}
