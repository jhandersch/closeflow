import { NextResponse } from "next/server";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";

const WAIT_TOTAL_MS = 30_000;
const WAIT_STEP_MS = 250;

/**
 * Runs an import handler while holding a per-workspace lease lock, so two
 * concurrent imports cannot both pass the duplicate check and insert the same rows.
 * Auth failures keep the handler's own 401/403 behaviour.
 */
export async function withWorkspaceImportLock(
    request: Request,
    handler: (request: Request) => Promise<Response>,
): Promise<Response> {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspace } = await loadWorkspaceForUser(supabase, user.id);
    if (!workspace?.id) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 });
    }

    let token: string | null = null;
    const deadline = Date.now() + WAIT_TOTAL_MS;
    while (!token) {
        const { data, error: lockError } = await supabase.rpc("acquire_workspace_import_lock", {
            p_workspace_id: workspace.id,
            p_ttl_seconds: 120,
        });
        if (lockError) {
            console.error("IMPORT LOCK ERROR:", lockError);
            return NextResponse.json({ error: "Import is temporarily unavailable." }, { status: 503 });
        }
        if (data) {
            token = data as string;
            break;
        }
        if (Date.now() >= deadline) {
            return NextResponse.json(
                { error: "Another import is already running in this workspace. Please try again shortly." },
                { status: 409 },
            );
        }
        await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
    }

    try {
        return await handler(request);
    }
    finally {
        const { error: releaseError } = await supabase.rpc("release_workspace_import_lock", {
            p_workspace_id: workspace.id,
            p_token: token,
        });
        if (releaseError) {
            console.error("IMPORT LOCK RELEASE ERROR:", releaseError);
        }
    }
}
