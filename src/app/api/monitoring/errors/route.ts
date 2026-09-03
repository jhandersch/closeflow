import { NextResponse } from "next/server";
import { captureWorkspaceError, listWorkspaceErrors } from "@/lib/errorMonitoring";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace) {
        return NextResponse.json({ items: [] });
    }
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const items = await listWorkspaceErrors(supabase, workspace.id, limit);
    return NextResponse.json({ items });
}
export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: {
        message?: string;
        stack?: string;
        digest?: string;
        pathname?: string;
        level?: "error" | "warning" | "info";
        source?: "client" | "server" | "api";
        details?: Record<string, unknown>;
    } = {};
    try {
        body = (await request.json()) as typeof body;
    }
    catch {
        body = {};
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
        return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    await captureWorkspaceError(supabase, user.id, {
        source: body.source || "client",
        level: body.level || "error",
        message,
        stack: body.stack || null,
        digest: body.digest || null,
        pathname: body.pathname || null,
        details: body.details || null,
    });
    return NextResponse.json({ ok: true });
}
