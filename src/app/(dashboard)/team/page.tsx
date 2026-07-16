"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import AuthGuard from "@/components/AuthGuard"
import InviteMemberModal from "@/components/team/InviteMemberModal"
import MemberTable from "@/components/team/MemberTable"
import WorkspaceSwitcher from "@/components/team/WorkspaceSwitcher"
import { supabase } from "@/lib/supabase/client"
import type { Workspace, WorkspaceInvite, WorkspaceMember, WorkspaceRole } from "@/types"

type WorkspaceBundle = {
  workspace: Workspace
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
}

export default function TeamPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceBundle[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const readApiError = async (response: Response, fallback: string) => {
    try {
      const data = (await response.json()) as { error?: string }
      return data.error || fallback
    } catch {
      const text = await response.text()
      return text || fallback
    }
  }

  const showActionError = (message: string) => {
    if (message.toLowerCase().includes("two-factor authentication required")) {
      toast.error("2FA required for this action. Verify 2FA in Settings -> Security.")
      return
    }

    toast.error(message)
  }

  const load = async () => {
    setLoading(true)
    const response = await fetch("/api/workspaces")
    if (response.ok) {
      const data = (await response.json()) as WorkspaceBundle[]
      setWorkspaces(data)
      setSelectedWorkspaceId((current) => current || data[0]?.workspace.id || null)
    } else {
      toast.error("Could not load workspaces")
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const loadSecurityState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setTwoFactorEnabled(Boolean(user?.user_metadata?.two_factor_enabled))
    }

    void loadSecurityState()
  }, [])

  const selectedWorkspace = useMemo(
    () => workspaces.find((bundle) => bundle.workspace.id === selectedWorkspaceId) || workspaces[0] || null,
    [selectedWorkspaceId, workspaces]
  )

  const createWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast.error("Workspace name is required")
      return
    }

    setCreating(true)
    const response = await fetch("/api/workspaces/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: workspaceName }),
    })

    if (response.ok) {
      setWorkspaceName("")
      toast.success("Workspace created")
      await load()
    } else {
      showActionError(await readApiError(response, "Could not create workspace"))
    }

    setCreating(false)
  }

  const inviteMember = async ({ email, role }: { email: string; role: WorkspaceRole }) => {
    if (!selectedWorkspace) return

    const response = await fetch("/api/workspaces/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: selectedWorkspace.workspace.id, email, role }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl)
      }
      toast.success("Invite created")
      setInviteOpen(false)
      await load()
    } else {
      showActionError(await readApiError(response, "Could not create invite"))
    }
  }

  const updateRole = async (userId: string, role: WorkspaceRole) => {
    if (!selectedWorkspace) return

    const response = await fetch("/api/workspaces/update-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: selectedWorkspace.workspace.id, user_id: userId, role }),
    })

    if (response.ok) {
      toast.success("Role updated")
      await load()
    } else {
      showActionError(await readApiError(response, "Could not update role"))
    }
  }

  const removeMember = async (userId: string) => {
    if (!selectedWorkspace) return

    const response = await fetch("/api/workspaces/remove-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: selectedWorkspace.workspace.id, user_id: userId }),
    })

    if (response.ok) {
      toast.success("Member removed")
      await load()
    } else {
      showActionError(await readApiError(response, "Could not remove member"))
    }
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Members</h1>
          <p className="mt-2 text-sm text-foreground/65">Invite users, assign roles, and switch between workspaces.</p>
        </div>

        {!twoFactorEnabled ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-300">Security recommendation: enable 2FA before managing workspace members.</p>
            <p className="mt-1 text-sm text-amber-100/80">Sensitive actions can be blocked until your session reaches AAL2.</p>
            <Link href="/settings#security" className="mt-3 inline-flex rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
              Open Security Settings
            </Link>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">Loading workspace...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <WorkspaceSwitcher
                workspaces={workspaces.map((bundle) => bundle.workspace)}
                selectedWorkspaceId={selectedWorkspace?.workspace.id || null}
                onSelect={(workspaceId) => setSelectedWorkspaceId(workspaceId)}
              />

              <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                <p className="text-sm text-foreground/65">Create workspace</p>
                <div className="mt-3 flex gap-3">
                  <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="New workspace name" className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400" />
                  <button onClick={() => void createWorkspace()} disabled={creating} className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black disabled:opacity-60">
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>

            {selectedWorkspace ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Plan" value={selectedWorkspace.workspace.plan} />
                  <StatCard label="Members" value={String(selectedWorkspace.members.length)} />
                  <StatCard label="Invites" value={String(selectedWorkspace.invites.length)} />
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setInviteOpen(true)} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                    Invite User
                  </button>
                </div>

                <MemberTable
                  members={selectedWorkspace.members}
                  currentUserId={null}
                  onUpdateRole={updateRole}
                  onRemoveMember={removeMember}
                />

                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                  <h2 className="text-xl font-semibold text-foreground">Pending invites</h2>
                  <div className="mt-4 space-y-2">
                    {selectedWorkspace.invites.length === 0 ? (
                      <p className="text-sm text-foreground/55">No pending invites.</p>
                    ) : (
                      selectedWorkspace.invites.map((invite) => (
                        <div key={invite.id} className="rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-sm text-foreground/80">
                          {invite.email} · {invite.role}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={inviteMember} />
      </div>
    </AuthGuard>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-xs text-foreground/65">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  )
}