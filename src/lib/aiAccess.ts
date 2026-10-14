import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enforceAndTrackUsageLimit } from "@/lib/usageLimits";
import { getRouteUser, loadWorkspaceForUser } from "@/lib/supabase/route";

export type AiAccessResult =
    | {
          ok: true;
          userId: string;
          workspaceId: string;
          supabase: SupabaseClient;
      }
    | {
          ok: false;
          response: NextResponse;
      };

export async function requireAiWorkspaceQuota(
    request: Request,
): Promise<AiAccessResult> {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const preferredWorkspaceId = request.headers.get("x-closeflow-workspace-id");
    const { workspace, error: workspaceError } = await loadWorkspaceForUser(
        supabase,
        user.id,
        preferredWorkspaceId,
    );
    if (workspaceError) {
        console.error("AI workspace authorization failed:", workspaceError.message);
        return {
            ok: false,
            response: NextResponse.json(
                { error: "Could not verify workspace access." },
                { status: 503 },
            ),
        };
    }
    if (!workspace) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: "A workspace is required to use AI features." },
                { status: 403 },
            ),
        };
    }

    const limit = await enforceAndTrackUsageLimit(
        supabase,
        user.id,
        "ai",
        workspace.id,
        crypto.randomUUID(),
    );
    if (!limit.ok) {
        return {
            ok: false,
            response: NextResponse.json({ error: limit.message }, { status: limit.status }),
        };
    }

    return {
        ok: true,
        userId: user.id,
        workspaceId: workspace.id,
        supabase,
    };
}
