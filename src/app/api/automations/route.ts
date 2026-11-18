import { NextResponse } from "next/server";
import { denyReadOnlyWrite, getRouteUser, loadWorkspaceForUser, requireMfaForWorkspaceRole } from "@/lib/supabase/route";
import { recordAuditEvent } from "@/lib/auditLog";
import { isUuid, readJsonObject } from "@/lib/requestValidation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`automations:read:${user.id}`, {
        limit: 120,
        windowMs: 10 * 60 * 1000,
    });
    if (!limited.success) return rateLimitResponse(limited);
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace) {
        return NextResponse.json([]);
    }
    const { data, error: queryError } = await supabase
        .from("automations")
        .select("id, workspace_id, name, trigger_event, actions, enabled, created_at, updated_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });
    if (queryError) {
        console.error("AUTOMATIONS LOAD ERROR:", queryError.message);
        return NextResponse.json({ error: "Could not load automations." }, { status: 500 });
    }
    return NextResponse.json(data || []);
}
export async function POST(request: Request) {
    const denied = await denyReadOnlyWrite(request);
    if (denied) return denied;
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`automations:write:${user.id}`, {
        limit: 30,
        windowMs: 10 * 60 * 1000,
    });
    if (!limited.success) return rateLimitResponse(limited);
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
    }
    const authz = await requireMfaForWorkspaceRole(request, supabase, workspace.id, user.id);
    if (!authz.ok) {
        return NextResponse.json({ error: authz.message }, { status: authz.status });
    }
    const body = await readJsonObject(request);
    if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const triggerEvent = typeof body.trigger_event === "string" ? body.trigger_event.trim() : "lead.created";
    const actions = Array.isArray(body.actions) ? body.actions : [];
    const enabled = body.enabled !== false;
    if (!name || name.length > 200 || triggerEvent.length > 100 || actions.length > 50) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const { data, error: insertError } = await supabase
        .from("automations")
        .insert({
        workspace_id: workspace.id,
        name,
        trigger_event: triggerEvent,
        actions,
        enabled,
    })
        .select("id, workspace_id, name, trigger_event, actions, enabled, created_at, updated_at")
        .single();
    if (insertError) {
        console.error("AUTOMATION CREATE ERROR:", insertError.message);
        return NextResponse.json({ error: "Could not create automation." }, { status: 500 });
    }
    await recordAuditEvent({
        workspaceId: workspace.id,
        actorUserId: user.id,
        eventType: "automation.created",
        payload: { automation_id: data.id, name, trigger_event: triggerEvent },
    });
    return NextResponse.json(data);
}
export async function PATCH(request: Request) {
    const denied = await denyReadOnlyWrite(request);
    if (denied) return denied;
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`automations:write:${user.id}`, {
        limit: 30,
        windowMs: 10 * 60 * 1000,
    });
    if (!limited.success) return rateLimitResponse(limited);
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
    }
    const authz = await requireMfaForWorkspaceRole(request, supabase, workspace.id, user.id);
    if (!authz.ok) {
        return NextResponse.json({ error: authz.message }, { status: authz.status });
    }
    const body = await readJsonObject(request);
    if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const enabled = Boolean(body.enabled);
    if (!isUuid(id)) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const { data, error: updateError } = await supabase
        .from("automations")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .select("id, workspace_id, name, trigger_event, actions, enabled, created_at, updated_at")
        .single();
    if (updateError) {
        console.error("AUTOMATION UPDATE ERROR:", updateError.message);
        return NextResponse.json({ error: "Could not update automation." }, { status: 500 });
    }
    await recordAuditEvent({
        workspaceId: workspace.id,
        actorUserId: user.id,
        eventType: "automation.updated",
        payload: { automation_id: id, enabled },
    });
    return NextResponse.json(data);
}
export async function DELETE(request: Request) {
    const denied = await denyReadOnlyWrite(request);
    if (denied) return denied;
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`automations:write:${user.id}`, {
        limit: 30,
        windowMs: 10 * 60 * 1000,
    });
    if (!limited.success) return rateLimitResponse(limited);
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
    }
    const authz = await requireMfaForWorkspaceRole(request, supabase, workspace.id, user.id);
    if (!authz.ok) {
        return NextResponse.json({ error: authz.message }, { status: authz.status });
    }
    const body = await readJsonObject(request);
    if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!isUuid(id)) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const { error: deleteError } = await supabase
        .from("automations")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspace.id);
    if (deleteError) {
        console.error("AUTOMATION DELETE ERROR:", deleteError.message);
        return NextResponse.json({ error: "Could not delete automation." }, { status: 500 });
    }
    await recordAuditEvent({
        workspaceId: workspace.id,
        actorUserId: user.id,
        eventType: "automation.deleted",
        payload: { automation_id: id },
    });
    return NextResponse.json({ ok: true });
}
