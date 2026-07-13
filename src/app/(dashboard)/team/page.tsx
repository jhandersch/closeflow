"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import AuthGuard from "@/components/AuthGuard"
import { useTeamWorkspace } from "@/hooks/useTeamWorkspace"
import type { TeamRole } from "@/types"

const roleOptions: TeamRole[] = ["Owner", "Admin", "Sales Manager", "Sales", "Viewer", "Sales Rep"]

const getInviteExpiryMeta = (expiresAt?: string | null) => {
  if (!expiresAt) {
    return {
      label: "No expiry",
      tone: "neutral" as const,
    }
  }

  const expiryDate = new Date(expiresAt)
  if (Number.isNaN(expiryDate.getTime())) {
    return {
      label: "No expiry",
      tone: "neutral" as const,
    }
  }

  const now = Date.now()
  const diffMs = expiryDate.getTime() - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const formattedDate = expiryDate.toLocaleDateString()

  if (diffDays < 0) {
    return {
      label: `Expired on ${formattedDate}`,
      tone: "expired" as const,
    }
  }

  if (diffDays === 0) {
    return {
      label: `Expires today (${formattedDate})`,
      tone: "soon" as const,
    }
  }

  if (diffDays === 1) {
    return {
      label: `Expires in 1 day (${formattedDate})`,
      tone: "soon" as const,
    }
  }

  if (diffDays <= 2) {
    return {
      label: `Expires in ${diffDays} days (${formattedDate})`,
      tone: "soon" as const,
    }
  }

  return {
    label: `Expires in ${diffDays} days (${formattedDate})`,
    tone: "neutral" as const,
  }
}

const getInviteSortKey = (expiresAt?: string | null) => {
  if (!expiresAt) {
    return {
      group: 2,
      time: Number.MAX_SAFE_INTEGER,
    }
  }

  const expiryDate = new Date(expiresAt)
  if (Number.isNaN(expiryDate.getTime())) {
    return {
      group: 2,
      time: Number.MAX_SAFE_INTEGER,
    }
  }

  const now = Date.now()
  const diffMs = expiryDate.getTime() - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      group: 0,
      time: expiryDate.getTime(),
    }
  }

  if (diffDays <= 2) {
    return {
      group: 1,
      time: expiryDate.getTime(),
    }
  }

  return {
    group: 2,
    time: expiryDate.getTime(),
  }
}

export default function TeamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")

  const {
    loading,
    saving,
    source,
    inviteTokenStatus,
    workspace,
    currentMemberId,
    stats,
    updateOrganization: persistOrganization,
    inviteMember: createInvite,
    removeInvite: deleteInvite,
    updateRole: persistRole,
    reload,
  } = useTeamWorkspace(inviteToken)

  const [organizationName, setOrganizationName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("Sales")
  const [showExpiredOnly, setShowExpiredOnly] = useState(false)

  const sortedInvites = useMemo(() => {
    if (!workspace) return []

    return [...workspace.invites].sort((a, b) => {
      const aKey = getInviteSortKey(a.expires_at)
      const bKey = getInviteSortKey(b.expires_at)

      if (aKey.group !== bKey.group) {
        return aKey.group - bKey.group
      }

      if (aKey.time !== bKey.time) {
        return aKey.time - bKey.time
      }

      return a.email.localeCompare(b.email)
    })
  }, [workspace])

  const filteredInvites = useMemo(() => {
    if (!showExpiredOnly) return sortedInvites

    return sortedInvites.filter((invite) => getInviteExpiryMeta(invite.expires_at).tone === "expired")
  }, [showExpiredOnly, sortedInvites])

  const inviteAnalytics = useMemo(() => {
    const expired = sortedInvites.filter((invite) => getInviteExpiryMeta(invite.expires_at).tone === "expired").length
    const total = sortedInvites.length
    const open = total - expired

    return {
      total,
      open,
      expired,
    }
  }, [sortedInvites])

  useEffect(() => {
    if (workspace) {
      setOrganizationName(workspace.organization_name)
    }
  }, [workspace])

  useEffect(() => {
    if (inviteTokenStatus === "accepted") {
      toast.success("Invite accepted. You are now part of this workspace.")
      router.replace("/team")
      return
    }

    if (inviteTokenStatus === "invalid") {
      toast.error("Invite link is invalid or expired.")
      router.replace("/team")
    }
  }, [inviteTokenStatus, router])

  const handleUpdateOrganization = async () => {
    if (!workspace) return

    const result = await persistOrganization(organizationName)
    if (result.ok) {
      toast.success("Organization updated")
    } else {
      toast.error(result.message || "Could not update organization")
    }
  }

  const handleInviteMember = async () => {
    if (!workspace) return

    const result = await createInvite(inviteEmail, inviteRole)
    if (result.ok) {
      setInviteEmail("")
      setInviteRole("Sales")
      const inviteUrl = "inviteUrl" in result ? result.inviteUrl : undefined
      const replacedInvite = "replacedInvite" in result ? result.replacedInvite : false

      if (inviteUrl) {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteUrl)
          toast.success(replacedInvite ? "Updated invite link copied to clipboard" : "Invite link copied to clipboard")
        } else {
          toast.success(replacedInvite ? `Updated invite link: ${inviteUrl}` : `Invite link: ${inviteUrl}`)
        }
      } else {
        toast.success(replacedInvite ? "Invite updated" : "Invite saved")
      }

      await reload()
    } else {
      toast.error(result.message || "Could not create invite")
    }
  }

  const handleCopyInviteLink = async (email: string, role: TeamRole, isExpired: boolean) => {
    const result = await createInvite(email, role)
    if (result.ok) {
      const inviteUrl = "inviteUrl" in result ? result.inviteUrl : undefined

      if (inviteUrl) {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteUrl)
          toast.success(isExpired ? "Invite link refreshed and copied" : "Invite link copied to clipboard")
        } else {
          toast.success(isExpired ? `Refreshed invite link: ${inviteUrl}` : `Invite link: ${inviteUrl}`)
        }
      } else {
        toast.success(isExpired ? "Invite refreshed" : "Invite updated")
      }

      await reload()
    } else {
      toast.error(result.message || "Could not refresh invite link")
    }
  }

  const handleRemoveInvite = async (email: string) => {
    const result = await deleteInvite(email)
    if (result.ok) {
      toast.success("Invite removed")
      await reload()
    } else {
      toast.error(result.message || "Could not remove invite")
    }
  }

  const handleUpdateRole = async (memberId: string, role: TeamRole) => {
    const result = await persistRole(memberId, role)
    if (result.ok) {
      toast.success("Role updated")
      await reload()
    } else {
      toast.error(result.message || "Could not update role")
    }
  }

  if (loading || !workspace) {
    return (
      <AuthGuard>
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">Loading team workspace...</div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Team</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Team workspace</h1>
          <p className="mt-2 text-sm text-foreground/65">
            Set organization details, prepare team invites, and assign roles (Owner/Admin/Sales Manager/Sales/Viewer).
          </p>
          <p className="mt-2 text-xs text-foreground/55">Data source: {source === "database" ? "Supabase tables" : "user metadata fallback"}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-xs text-foreground/65">Active members</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.activeMembers}</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-xs text-foreground/65">Pending invites</p>
            <p className="mt-2 text-3xl font-semibold text-amber-300">{stats.pendingInvites}</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-xs text-foreground/65">Owners</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">{stats.owners}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="text-xl font-semibold text-foreground">Organization</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
              placeholder="Organization name"
            />
            <button onClick={() => void handleUpdateOrganization()} disabled={saving} className="rounded-xl bg-foreground px-5 py-3 font-semibold text-background disabled:opacity-60">
              Save
            </button>
          </div>
          <p className="mt-2 text-xs text-foreground/55">Slug: {workspace.organization_slug}</p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="text-xl font-semibold text-foreground">Invite members</h2>
          <p className="mt-2 text-sm text-foreground/65">Invites are stored as pending entries until email delivery is connected.</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowExpiredOnly((current) => !current)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                showExpiredOnly
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                  : "border-border-subtle bg-surface-2/70 text-foreground/80 hover:text-foreground"
              }`}
            >
              {showExpiredOnly ? "Show all invites" : "Show expired only"}
            </button>
            <p className="text-xs text-foreground/55">Open: {inviteAnalytics.open}</p>
            <p className="text-xs text-foreground/55">Expired: {inviteAnalytics.expired}</p>
            <p className="text-xs text-foreground/55">Total: {inviteAnalytics.total}</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="user@company.com"
              className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as TeamRole)}
              className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button onClick={() => void handleInviteMember()} disabled={saving} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 font-semibold text-cyan-300 disabled:opacity-60">
              Add invite
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {filteredInvites.length === 0 ? (
              <p className="text-sm text-foreground/55">{showExpiredOnly ? "No expired invites." : "No pending invites."}</p>
            ) : (
              filteredInvites.map((invite) => {
                const expiry = getInviteExpiryMeta(invite.expires_at)
                const isExpired = expiry.tone === "expired"

                return (
                  <div key={invite.email} className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-sm">
                    <div>
                      <p className="text-foreground">{invite.email}</p>
                      <p className="text-xs text-foreground/55">{invite.role} • pending</p>
                      <p
                        className={`text-xs ${
                          expiry.tone === "expired"
                            ? "text-rose-300"
                            : expiry.tone === "soon"
                              ? "text-amber-300"
                              : "text-foreground/55"
                        }`}
                      >
                        {expiry.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void handleCopyInviteLink(invite.email, invite.role, isExpired)}
                        disabled={saving}
                        className={`${isExpired ? "text-amber-300 hover:text-amber-200" : "text-cyan-300 hover:text-cyan-200"} transition disabled:opacity-50`}
                      >
                        {isExpired ? "Refresh link" : "Copy link"}
                      </button>
                      <button onClick={() => void handleRemoveInvite(invite.email)} className="text-rose-300 transition hover:text-rose-200">
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="text-xl font-semibold text-foreground">Members and roles</h2>
          <div className="mt-4 space-y-2">
            {workspace.members.map((member) => {
              const isCurrentOwner = member.id === currentMemberId && member.role === "Owner"

              return (
                <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{member.name || "Team member"}</p>
                    <p className="text-xs text-foreground/55">{member.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground/55">{member.status}</span>
                    <select
                      value={member.role}
                      onChange={(event) => void handleUpdateRole(member.id, event.target.value as TeamRole)}
                      disabled={saving || isCurrentOwner}
                      className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400 disabled:opacity-50"
                    >
                      {roleOptions.map((role) => (
                        <option key={`${member.id}-${role}`} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
