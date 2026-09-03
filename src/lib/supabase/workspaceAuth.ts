import type { SupabaseClient } from "@supabase/supabase-js";
export type WorkspaceAccessRole = "owner" | "admin" | "member" | "viewer";
type WorkspaceRoleResult = {
    ok: true;
    role: WorkspaceAccessRole;
} | {
    ok: false;
    status: number;
    message: string;
};
export async function getWorkspaceUserRole(supabase: SupabaseClient, workspaceId: string, userId: string): Promise<WorkspaceRoleResult> {
    const { data: member, error } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
    if (error) {
        console.error("WORKSPACE ROLE ERROR:", error);
        return {
            ok: false,
            status: 500,
            message: error.message,
        };
    }
    if (!member) {
        return {
            ok: false,
            status: 403,
            message: "You are not a member of this workspace.",
        };
    }
    const role = String(member.role).toLowerCase();
    if (role !== "owner" &&
        role !== "admin" &&
        role !== "member" &&
        role !== "viewer") {
        return {
            ok: false,
            status: 403,
            message: "Invalid workspace role.",
        };
    }
    return {
        ok: true,
        role,
    };
}
export async function requireWorkspaceAdmin(supabase: SupabaseClient, workspaceId: string, userId: string): Promise<WorkspaceRoleResult> {
    const result = await getWorkspaceUserRole(supabase, workspaceId, userId);
    if (!result.ok) {
        return result;
    }
    if (result.role !== "owner" &&
        result.role !== "admin") {
        return {
            ok: false,
            status: 403,
            message: "Only workspace owners and admins can perform this action.",
        };
    }
    return result;
}
export async function requireWorkspaceOwner(supabase: SupabaseClient, workspaceId: string, userId: string): Promise<WorkspaceRoleResult> {
    const result = await getWorkspaceUserRole(supabase, workspaceId, userId);
    if (!result.ok) {
        return result;
    }
    if (result.role !== "owner") {
        return {
            ok: false,
            status: 403,
            message: "Only the workspace owner can perform this action.",
        };
    }
    return result;
}
