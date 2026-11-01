import { NextResponse } from "next/server";
import { GOOGLE_SCOPES, sendGmail } from "@/lib/integrations/google";
import { getGoogleAccessForUser } from "@/lib/integrations/store";
import {
    getRouteUser,
    isReadOnlyRole,
    loadWorkspaceForUser,
    READ_ONLY_ERROR,
} from "@/lib/supabase/route";
export async function POST(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace, role, error: workspaceError } = await loadWorkspaceForUser(
        supabase,
        user.id,
        request.headers.get("x-closeflow-workspace-id"),
    );
    if (workspaceError) {
        console.error("Email activity workspace authorization failed:", workspaceError.message);
        return NextResponse.json({ error: "Could not verify workspace access." }, { status: 503 });
    }
    if (!workspace) {
        return NextResponse.json({ error: "A workspace is required." }, { status: 403 });
    }
    if (isReadOnlyRole(role)) {
        return NextResponse.json({ error: READ_ONLY_ERROR }, { status: 403 });
    }
    const { id: leadId } = await params;
    if (!leadId) {
        return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }
    const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id")
        .eq("id", leadId)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
    if (leadError) {
        console.error("Email activity lead authorization failed:", leadError.message);
        return NextResponse.json({ error: "Could not verify lead access." }, { status: 503 });
    }
    if (!lead) {
        return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    const body = await request.json();
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const bodyText = typeof body.body === "string" ? body.body.trim() : "";
    if (!to || !subject || !bodyText) {
        return NextResponse.json({ error: "to, subject and body are required" }, { status: 400 });
    }
    let sentViaGmail = false;
    try {
        const accessToken = await getGoogleAccessForUser(user.id, GOOGLE_SCOPES.gmail);
        if (accessToken) {
            await sendGmail(accessToken, { to, subject, body: bodyText });
            sentViaGmail = true;
        }
    }
    catch (gmailError) {
        console.error("Gmail send failed:", gmailError instanceof Error ? gmailError.message : gmailError);
        return NextResponse.json({ error: "The email could not be sent via Gmail. Reconnect Google in Settings and try again." }, { status: 502 });
    }
    // Log email as an activity on the lead
    const { error: activityError } = await supabase.from("activities").insert({
        lead_id: leadId,
        workspace_id: workspace.id,
        user_id: user.id,
        action: `Email sent to ${to}: "${subject}"`,
        type: "email_sent",
        title: subject,
        description: bodyText,
        created_at: new Date().toISOString(),
    });
    if (activityError) {
        return NextResponse.json({ error: activityError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, to, subject, sentViaGmail });
}
