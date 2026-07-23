import { SupabaseClient } from "@supabase/supabase-js"

export type UserWorkspace = {
  workspaceId: string
  role: string
}

export async function getUserWorkspace(
  supabase: SupabaseClient,
  userId: string
): Promise<UserWorkspace> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("No workspace found")
  }

  return {
    workspaceId: data.workspace_id,
    role: data.role,
  }
}

export async function getWorkspaceId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const workspace = await getUserWorkspace(supabase, userId)
  return workspace.workspaceId
}

export async function getWorkspaceRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const workspace = await getUserWorkspace(supabase, userId)
  return workspace.role
}