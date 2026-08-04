import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { TeamInvite, TeamMember, TeamRole, TeamWorkspace } from "@/types"

type UserMetadata = {
  name?: string
  company_name?: string
  team_workspace?: TeamWorkspace
}

type DataSource = "database" | "metadata"
type InviteTokenStatus = "accepted" | "invalid" | null

type DbOrganization = {
  id: string
  name: string
  slug: string
}

type DbMemberRow = {
  id: string
  member_user_id: string | null
  member_email: string
  member_name: string | null
  role: TeamRole
  status: "active" | "invited"
}

type DbInviteRow = {
  id: string
  email: string
  role: TeamRole
  status: "pending" | "accepted" | "expired" | "revoked"
  created_at: string
  expires_at: string | null
}

const roleOptions: TeamRole[] = ["owner", "admin", "sales_manager", "sales", "viewer"]

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const isSchemaError = (message?: string) =>
  /relation .* does not exist|column .* does not exist|function .* does not exist|could not find the function/i.test(message || "")

const metadataWorkspaceFallback = (organizationName: string, member: TeamMember): TeamWorkspace => ({
  organization_name: organizationName,
  organization_slug: slugify(organizationName) || "my-organization",
  members: [member],
  invites: [],
})

export function useTeamWorkspace(inviteToken?: string | null) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [source, setSource] = useState<DataSource>("metadata")
  const [inviteTokenStatus, setInviteTokenStatus] = useState<InviteTokenStatus>(null)

  const [organizationId, setOrganizationId] = useState<string | null>(null)

  const normalizeFromDatabase = (
    organization: DbOrganization,
    members: DbMemberRow[],
    invites: DbInviteRow[]
  ): TeamWorkspace => {
    const normalizedMembers: TeamMember[] = members.map((member) => ({
      id: member.member_user_id || member.id,
      email: member.member_email,
      name: member.member_name || member.member_email,
      role: member.role,
      status: member.status,
    }))

    const normalizedInvites: TeamInvite[] = invites
      .filter((invite) => invite.status === "pending")
      .map((invite) => ({
        email: invite.email,
        role: invite.role,
        status: "pending",
        created_at: invite.created_at,
        expires_at: invite.expires_at,
      }))

    return {
      organization_name: organization.name,
      organization_slug: organization.slug,
      members: normalizedMembers,
      invites: normalizedInvites,
    }
  }

  const saveMetadataWorkspace = async (nextWorkspace: TeamWorkspace) => {
    const { error } = await supabase.auth.updateUser({
      data: {
        team_workspace: nextWorkspace,
      },
    })

    if (error) {
      throw error
    }

    setWorkspace(nextWorkspace)
  }

  const ensureDatabaseWorkspace = async (
    userId: string,
    email: string,
    displayName: string,
    metadata: UserMetadata,
    token?: string | null
  ) => {
    const membershipResult = await supabase
      .from("organization_members")
      .select("organization_id, role, status")
      .eq("member_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (membershipResult.error) {
      if (isSchemaError(membershipResult.error.message)) {
        return null
      }
      throw membershipResult.error
    }

    let orgId = membershipResult.data?.organization_id || null

    if (orgId && token && token.trim()) {
      setInviteTokenStatus("accepted")
    }

    if (!orgId) {
      const acceptParams: {
        p_email: string
        p_member_name: string
        p_token?: string
      } = {
        p_email: email,
        p_member_name: displayName,
      }

      if (token && token.trim()) {
        acceptParams.p_token = token.trim()
      }

      const acceptResult = await supabase.rpc("accept_organization_invite", acceptParams)

      if (acceptResult.error) {
        if (isSchemaError(acceptResult.error.message)) {
          return null
        }
        throw acceptResult.error
      }

      orgId = acceptResult.data || null

      if (token && token.trim()) {
        setInviteTokenStatus(orgId ? "accepted" : "invalid")
      }
    }

    if (!orgId && token && token.trim()) {
      return null
    }

    if (!orgId) {
      const fallbackName = metadata.company_name || "My Organization"
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: fallbackName,
          slug: slugify(fallbackName) || `org-${Date.now()}`,
          owner_user_id: userId,
        })
        .select("id, name, slug")
        .single()

      if (orgError) {
        if (isSchemaError(orgError.message)) {
          return null
        }
        throw orgError
      }

      const { error: memberError } = await supabase.from("organization_members").insert({
        organization_id: organization.id,
        member_user_id: userId,
        member_email: email.trim().toLowerCase(),
        member_name: displayName,
        role: "owner",
        status: "active",
      })

      if (memberError) {
        throw memberError
      }

      orgId = organization.id
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", orgId)
      .single()

    if (organizationError) {
      throw organizationError
    }

    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("id, member_user_id, member_email, member_name, role, status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true })

    if (membersError) {
      throw membersError
    }

    const { data: invites, error: invitesError } = await supabase
      .from("organization_invites")
      .select("id, email, role, status, created_at, expires_at")
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (invitesError) {
      throw invitesError
    }

    setOrganizationId(orgId)
    setSource("database")

    return normalizeFromDatabase(
      organization as DbOrganization,
      (members || []) as DbMemberRow[],
      (invites || []) as DbInviteRow[]
    )
  }

  const load = useCallback(async () => {
    setLoading(true)

    if (!inviteToken || !inviteToken.trim()) {
      setInviteTokenStatus(null)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setWorkspace(null)
      setCurrentMemberId(null)
      setLoading(false)
      return
    }

    const metadata = (user.user_metadata || {}) as UserMetadata
    const email = (user.email || "unknown@example.com").trim().toLowerCase()
    const displayName = metadata.name || metadata.company_name || "Workspace Owner"

    const currentMember: TeamMember = {
      id: user.id,
      email,
      name: displayName,
      role: "owner",
      status: "active",
    }

    try {
      const databaseWorkspace = await ensureDatabaseWorkspace(user.id, email, displayName, metadata, inviteToken)

      if (databaseWorkspace) {
        setWorkspace(databaseWorkspace)
      } else {
        setSource("metadata")
        setOrganizationId(null)
        const metadataWorkspace = metadata.team_workspace || metadataWorkspaceFallback(metadata.company_name || "My Organization", currentMember)
        const includesCurrentUser = metadataWorkspace.members.some((member) => member.id === user.id)
        setWorkspace(
          includesCurrentUser
            ? metadataWorkspace
            : {
                ...metadataWorkspace,
                members: [...metadataWorkspace.members, currentMember],
              }
        )
      }
    } catch {
      setSource("metadata")
      setOrganizationId(null)
      const metadataWorkspace = metadata.team_workspace || metadataWorkspaceFallback(metadata.company_name || "My Organization", currentMember)
      setWorkspace(metadataWorkspace)
    }

    setCurrentMemberId(user.id)
    setLoading(false)
  }, [inviteToken])

  useEffect(() => {
    void load()
  }, [load])

  const updateOrganization = async (name: string) => {
    if (!workspace) return { ok: false as const, message: "Workspace not loaded" }

    const trimmed = name.trim()
    if (!trimmed) return { ok: false as const, message: "Organization name is required" }

    const nextWorkspace: TeamWorkspace = {
      ...workspace,
      organization_name: trimmed,
      organization_slug: slugify(trimmed) || workspace.organization_slug,
    }

    setSaving(true)

    try {
      if (source === "database" && organizationId) {
        const { error } = await supabase
          .from("organizations")
          .update({
            name: nextWorkspace.organization_name,
            slug: nextWorkspace.organization_slug,
            updated_at: new Date().toISOString(),
          })
          .eq("id", organizationId)

        if (error) throw error

        setWorkspace(nextWorkspace)
      } else {
        await saveMetadataWorkspace(nextWorkspace)
      }

      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Could not update organization" }
    } finally {
      setSaving(false)
    }
  }

  const inviteMember = async (email: string, role: TeamRole) => {
    if (!workspace) return { ok: false as const, message: "Workspace not loaded" }

    const normalizedEmail = email.trim().toLowerCase()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(normalizedEmail)) {
      return { ok: false as const, message: "Enter a valid email" }
    }

    if (!roleOptions.includes(role)) {
      return { ok: false as const, message: "Invalid role" }
    }

    const existsAsMember = workspace.members.some((member) => member.email.toLowerCase() === normalizedEmail)
    const existingInvite = workspace.invites.find((invite) => invite.email.toLowerCase() === normalizedEmail)

    if (existsAsMember) {
      return { ok: false as const, message: "This user is already a team member" }
    }

    const nextInvite: TeamInvite = {
      email: normalizedEmail,
      role,
      status: "pending",
      created_at: new Date().toISOString(),
    }

    const nextWorkspace: TeamWorkspace = {
      ...workspace,
      invites: existingInvite
        ? workspace.invites.map((invite) => (invite.email.toLowerCase() === normalizedEmail ? nextInvite : invite))
        : [nextInvite, ...workspace.invites],
    }

    setSaving(true)

    try {
      if (source === "database" && organizationId) {
        const inviteResult = await supabase.rpc("create_organization_invite", {
          p_organization_id: organizationId,
          p_email: normalizedEmail,
          p_role: role,
        })

        if (inviteResult.error) {
          if (isSchemaError(inviteResult.error.message)) {
            const {
              data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
              return { ok: false as const, message: "Not authenticated" }
            }

            const { error } = await supabase.from("organization_invites").insert({
              organization_id: organizationId,
              email: normalizedEmail,
              role,
              status: "pending",
              invited_by: user.id,
            })

            if (error) throw error

            setWorkspace(nextWorkspace)
            return { ok: true as const, replacedInvite: Boolean(existingInvite) }
          }

          throw inviteResult.error
        }

        const token = typeof inviteResult.data === "string" ? inviteResult.data : null
        const inviteUrl = token ? `${window.location.origin}/team?invite=${encodeURIComponent(token)}` : undefined

        setWorkspace(nextWorkspace)
        return { ok: true as const, inviteUrl, replacedInvite: Boolean(existingInvite) }
      } else {
        await saveMetadataWorkspace(nextWorkspace)
      }

      return { ok: true as const, replacedInvite: Boolean(existingInvite) }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Could not create invite" }
    } finally {
      setSaving(false)
    }
  }

  const removeInvite = async (email: string) => {
    if (!workspace) return { ok: false as const, message: "Workspace not loaded" }

    const nextWorkspace: TeamWorkspace = {
      ...workspace,
      invites: workspace.invites.filter((invite) => invite.email !== email),
    }

    setSaving(true)

    try {
      if (source === "database" && organizationId) {
        const { error } = await supabase
          .from("organization_invites")
          .delete()
          .eq("organization_id", organizationId)
          .eq("email", email.toLowerCase())
          .eq("status", "pending")

        if (error) throw error

        setWorkspace(nextWorkspace)
      } else {
        await saveMetadataWorkspace(nextWorkspace)
      }

      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Could not remove invite" }
    } finally {
      setSaving(false)
    }
  }

  const updateRole = async (memberId: string, role: TeamRole) => {
    if (!workspace) return { ok: false as const, message: "Workspace not loaded" }

    if (!roleOptions.includes(role)) {
      return { ok: false as const, message: "Invalid role" }
    }

    const nextWorkspace: TeamWorkspace = {
      ...workspace,
      members: workspace.members.map((member) =>
        member.id === memberId
          ? {
              ...member,
              role,
            }
          : member
      ),
    }

    setSaving(true)

    try {
      if (source === "database" && organizationId) {
        const targetMember = workspace.members.find((member) => member.id === memberId)
        if (!targetMember) {
          return { ok: false as const, message: "Member not found" }
        }

        const { error } = await supabase
          .from("organization_members")
          .update({ role })
          .eq("organization_id", organizationId)
          .eq("member_email", targetMember.email.toLowerCase())

        if (error) throw error

        setWorkspace(nextWorkspace)
      } else {
        await saveMetadataWorkspace(nextWorkspace)
      }

      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Could not update role" }
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    if (!workspace) {
      return {
        activeMembers: 0,
        pendingInvites: 0,
        owners: 0,
      }
    }

    return {
      activeMembers: workspace.members.length,
      pendingInvites: workspace.invites.length,
      owners: workspace.members.filter((member) => member.role === "owner").length,
    }
  }, [workspace])

  return {
    loading,
    saving,
    source,
    inviteTokenStatus,
    workspace,
    currentMemberId,
    stats,
    reload: load,
    updateOrganization,
    inviteMember,
    removeInvite,
    updateRole,
  }
}
