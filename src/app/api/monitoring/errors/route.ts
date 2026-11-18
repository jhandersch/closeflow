import { NextResponse } from "next/server";
import { captureWorkspaceError, listWorkspaceErrors } from "@/lib/errorMonitoring";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { readJsonObject } from "@/lib/requestValidation";

const errorLevels = new Set(["error", "warning", "info"]);
const errorSources = new Set(["client", "server", "api"]);

export async function GET(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`monitoring:errors:read:${user.id}`, { limit: 60, windowMs: 10 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited);
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
    const limited = await checkRateLimit(`monitoring:errors:${user.id}`, { limit: 60, windowMs: 10 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited);
    const body = await readJsonObject(request);
    if (!body) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
        return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const level = typeof body.level === "string" && errorLevels.has(body.level)
        ? body.level as "error" | "warning" | "info"
        : "error";
    const source = typeof body.source === "string" && errorSources.has(body.source)
        ? body.source as "client" | "server" | "api"
        : "client";
    const details = body.details && typeof body.details === "object" && !Array.isArray(body.details)
        ? body.details as Record<string, unknown>
        : null;
    await captureWorkspaceError(supabase, user.id, {
        source,
        level,
        message,
        stack: typeof body.stack === "string" ? body.stack : null,
        digest: typeof body.digest === "string" ? body.digest : null,
        pathname: typeof body.pathname === "string" ? body.pathname : null,
        details,
    });
    return NextResponse.json({ ok: true });
}
