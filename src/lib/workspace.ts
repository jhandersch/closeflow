import { SupabaseClient } from "@supabase/supabase-js";

export type UserWorkspace = {
    workspaceId: string;
    role: string;
};

export const ACTIVE_WORKSPACE_STORAGE_KEY =
    "closeflow_active_workspace";

export async function getUserWorkspace(
    supabase: SupabaseClient,
    userId: string,
    preferredWorkspaceId?: string | null,
): Promise<UserWorkspace> {
    const { data: memberships, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, created_at")
        .eq("user_id", userId)
        .order("created_at", {
            ascending: true,
        });

    if (error) {
        throw error;
    }

    if (!memberships || memberships.length === 0) {
        throw new Error("No workspace found");
    }

    const preferredMembership = preferredWorkspaceId
        ? memberships.find(
              (membership) =>
                  membership.workspace_id ===
                  preferredWorkspaceId,
          )
        : null;

    const membership =
        preferredMembership || memberships[0];

    return {
        workspaceId: membership.workspace_id,
        role: membership.role,
    };
}

export async function getWorkspaceId(
    supabase: SupabaseClient,
    userId: string,
    preferredWorkspaceId?: string | null,
): Promise<string> {
    const workspace = await getUserWorkspace(
        supabase,
        userId,
        preferredWorkspaceId,
    );

    return workspace.workspaceId;
}

export async function getWorkspaceRole(
    supabase: SupabaseClient,
    userId: string,
    preferredWorkspaceId?: string | null,
): Promise<string> {
    const workspace = await getUserWorkspace(
        supabase,
        userId,
        preferredWorkspaceId,
    );

    return workspace.role;
}