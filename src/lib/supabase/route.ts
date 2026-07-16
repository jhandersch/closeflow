import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Workspace, WorkspaceInvite, WorkspaceMember, WorkspaceRole, UserProfile } from "@/types"

type RouteRequest = Request

type RouteAuthzResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

export async function createRouteSupabase(request: RouteRequest) {
  const cookieSupabase = await createClient()
  const authorization = request.headers.get("authorization") ?? request.headers.get("Authorization")
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null

  if (!bearerToken) {
    return cookieSupabase
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

export async function getRouteUser(request: RouteRequest) {
  const supabase = await createRouteSupabase(request)
  const { data: { user }, error } = await supabase.auth.getUser()

  return {
    supabase,
    user,
    error,
  }
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".")

  if (parts.length < 2) {
    return null
  }

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=")
    const decoded = Buffer.from(padded, "base64").toString("utf8")
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function getRequestAal(
  request: RouteRequest,
  supabase: Awaited<ReturnType<typeof createRouteSupabase>>
): Promise<"aal1" | "aal2"> {
  const authorization = request.headers.get("authorization") ?? request.headers.get("Authorization")
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null

  let token = bearerToken

  if (!token) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    token = session?.access_token || null
  }

  if (!token) {
    return "aal1"
  }

  const payload = decodeJwtPayload(token)
  const aal = typeof payload?.aal === "string" ? payload.aal : "aal1"

  return aal === "aal2" ? "aal2" : "aal1"
}

export async function requireMfaForWorkspaceRole(
  request: RouteRequest,
  supabase: Awaited<ReturnType<typeof createRouteSupabase>>,
  workspaceId: string,
  userId: string,
  privilegedRoles: string[] = ["owner", "admin"]
): Promise<RouteAuthzResult> {
  const { data: member, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (error || !member?.role) {
    return { ok: false, status: 403, message: "Forbidden" }
  }

  if (!privilegedRoles.includes(member.role)) {
    return { ok: true }
  }

  const aal = await getRequestAal(request, supabase)

  if (aal !== "aal2") {
    return { ok: false, status: 403, message: "Two-factor authentication required for this action" }
  }

  return { ok: true }
}

export async function requireAal2(
  request: RouteRequest,
  supabase: Awaited<ReturnType<typeof createRouteSupabase>>
): Promise<RouteAuthzResult> {
  const aal = await getRequestAal(request, supabase)

  if (aal !== "aal2") {
    return { ok: false, status: 403, message: "Two-factor authentication required for this action" }
  }

  return { ok: true }
}

export const slugifyWorkspaceName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export type WorkspacePayload = {
  workspace: Workspace
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
  profile: UserProfile | null
}

export async function loadWorkspaceForUser(
  supabase: Awaited<ReturnType<typeof createRouteSupabase>>,
  userId: string
) {
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, created_at")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    return { error: membershipError, workspace: null as Workspace | null }
  }

  if (!membership?.workspace_id) {
    return { error: null, workspace: null as Workspace | null }
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, plan, created_at")
    .eq("id", membership.workspace_id)
    .single()

  if (workspaceError) {
    return { error: workspaceError, workspace: null as Workspace | null }
  }

  return { error: null, workspace: workspace as Workspace }
}

export async function getWorkspacePayload(
  supabase: Awaited<ReturnType<typeof createRouteSupabase>>,
  workspaceId: string
): Promise<WorkspacePayload> {
  const [{ data: workspace, error: workspaceError }, { data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
    supabase.from("workspaces").select("id, name, owner_id, plan, created_at").eq("id", workspaceId).single(),
    supabase.from("workspace_members").select("id, workspace_id, user_id, role, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
    supabase.from("workspace_invites").select("id, workspace_id, email, role, token, expires_at, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
  ])

  if (workspaceError) throw workspaceError
  if (membersError) throw membersError
  if (invitesError) throw invitesError

  const memberIds = (members || []).map((member) => member.user_id)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, company_name, phone, timezone, language, created_at")
    .in("id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"])

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile as UserProfile]))

  return {
    workspace: workspace as Workspace,
    members: (members || []).map((member) => ({
      id: member.id,
      workspace_id: member.workspace_id,
      user_id: member.user_id,
      role: member.role as WorkspaceRole,
      created_at: member.created_at,
      profile: profileMap.get(member.user_id) || null,
    })),
    invites: (invites || []).map((invite) => ({
      id: invite.id,
      workspace_id: invite.workspace_id,
      email: invite.email,
      role: invite.role as WorkspaceRole,
      token: invite.token,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
    })),
    profile: profileMap.get((profiles || [])[0]?.id || "") || null,
  }
}