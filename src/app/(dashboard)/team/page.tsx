"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"

import AuthGuard from "@/components/AuthGuard"
import InviteMemberModal from "@/components/team/InviteMemberModal"
import MemberTable from "@/components/team/MemberTable"
import WorkspaceSwitcher from "@/components/team/WorkspaceSwitcher"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"

import type {
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceRole,
} from "@/types"

type WorkspaceBundle = {
  workspace: Workspace
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
}

export default function TeamPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [acceptingInvite, setAcceptingInvite] = useState(false)


  const [workspaces, setWorkspaces] = useState<WorkspaceBundle[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [workspaceName, setWorkspaceName] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const readApiError = async (
    response: Response,
    fallback: string
  ) => {
    try {
      const data = (await response.json()) as {
        error?: string
      }

      return data.error || fallback
    } catch {
      try {
        const text = await response.text()
        return text || fallback
      } catch {
        return fallback
      }
    }
  }

  const showActionError = (message: string) => {
    if (
      message
        .toLowerCase()
        .includes("two-factor authentication required")
    ) {
      toast.error(
        isDe
          ? "2FA ist für diese Aktion erforderlich. Prüfe 2FA in Einstellungen -> Sicherheit."
          : "2FA required for this action. Verify 2FA in Settings -> Security."
      )

      return
    }

    toast.error(message)
  }

  /*
   * Workspaces laden.
   *
   * preferredWorkspaceId wird verwendet, wenn wir
   * gerade eine Einladung angenommen haben.
   */
  const load = async (
    preferredWorkspaceId?: string
  ) => {
    setLoading(true)

    try {
      const response = await fetch(
        "/api/workspaces",
        {
          cache: "no-store",
        }
      )

      if (!response.ok) {
        toast.error(
          isDe
            ? "Workspaces konnten nicht geladen werden"
            : "Could not load workspaces"
        )

        return
      }

      const data =
        (await response.json()) as WorkspaceBundle[]

      setWorkspaces(data)

      setSelectedWorkspaceId((current) => {
        /*
         * 1. Invite-Workspace hat höchste Priorität.
         */
        if (
          preferredWorkspaceId &&
          data.some(
            (bundle) =>
              bundle.workspace.id ===
              preferredWorkspaceId
          )
        ) {
          return preferredWorkspaceId
        }

        /*
         * 2. Aktuell ausgewählten Workspace behalten,
         * sofern er noch vorhanden ist.
         */
        if (
          current &&
          data.some(
            (bundle) =>
              bundle.workspace.id === current
          )
        ) {
          return current
        }

        /*
         * 3. Fallback auf ersten Workspace.
         */
        return data[0]?.workspace.id || null
      })
    } catch (error) {
      console.error(
        "LOAD WORKSPACES ERROR:",
        error
      )

      toast.error(
        isDe
          ? "Workspaces konnten nicht geladen werden"
          : "Could not load workspaces"
      )
    } finally {
      setLoading(false)
    }
  }


const acceptInvite = async () => {
  if (!inviteToken) {
    return
  }

  setAcceptingInvite(true)

  try {
    const response = await fetch(
      "/api/workspaces/invite/accept",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: inviteToken,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      toast.error(
        data.error ||
          (isDe
            ? "Einladung konnte nicht angenommen werden."
            : "Could not accept invitation.")
      )

      return
    }

    const invitedWorkspaceId =
      data.workspaceId

    toast.success(
      isDe
        ? "Einladung angenommen"
        : "Invitation accepted"
    )

    setInviteToken(null)

    window.history.replaceState(
      {},
      "",
      "/team"
    )

    await load(invitedWorkspaceId)
  } catch (error) {
    console.error(
      "ACCEPT INVITE ERROR:",
      error
    )

    toast.error(
      isDe
        ? "Einladung konnte nicht angenommen werden."
        : "Could not accept invitation."
    )
  } finally {
    setAcceptingInvite(false)
  }
}

  /*
   * Einladung akzeptieren.
   *
   * URL:
   * /team?invite=TOKEN
   */
useEffect(() => {
  const acceptInvite = async () => {
    const params = new URLSearchParams(
      window.location.search
    )

    const token = params.get("invite")

    if (!token) {
      return
    }

    setAcceptingInvite(true)

    try {
      const response = await fetch(
        "/api/workspaces/invite/accept",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(
          data.error ||
            (isDe
              ? "Einladung konnte nicht angenommen werden."
              : "Could not accept invitation.")
        )

        return
      }

      const invitedWorkspaceId =
        data.workspaceId

      toast.success(
        isDe
          ? "Einladung angenommen"
          : "Invitation accepted"
      )

      /*
       * Token aus URL entfernen
       */
      window.history.replaceState(
        {},
        "",
        "/team"
      )

      /*
       * Workspaces neu laden.
       * Der eingeladene Workspace wird
       * anschließend automatisch ausgewählt.
       */
      await load(
        invitedWorkspaceId
      )
    } catch (error) {
      console.error(
        "ACCEPT INVITE ERROR:",
        error
      )

      toast.error(
        isDe
          ? "Einladung konnte nicht angenommen werden."
          : "Could not accept invitation."
      )
    } finally {
      setAcceptingInvite(false)
    }
  }

  void acceptInvite()
}, [isDe])


  /*
   * Normales Laden der Workspaces.
   *
   * Wenn ein Invite vorhanden ist, kümmert sich
   * der andere Effect um den Invite-Flow.
   */
  useEffect(() => {
    void load()
  }, [])


  /*
   * 2FA Status laden.
   */
  useEffect(() => {
    const loadSecurityState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setTwoFactorEnabled(
        Boolean(
          user?.user_metadata
            ?.two_factor_enabled
        )
      )
    }

    void loadSecurityState()
  }, [])

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find(
        (bundle) =>
          bundle.workspace.id ===
          selectedWorkspaceId
      ) ||
      workspaces[0] ||
      null,
    [selectedWorkspaceId, workspaces]
  )

  /*
   * Workspace erstellen
   */
  const createWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast.error(
        isDe
          ? "Workspace-Name ist erforderlich"
          : "Workspace name is required"
      )

      return
    }

    setCreating(true)

    try {
      const response = await fetch(
        "/api/workspaces/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: workspaceName,
          }),
        }
      )

      if (response.ok) {
        setWorkspaceName("")

        toast.success(
          isDe
            ? "Workspace erstellt"
            : "Workspace created"
        )

        await load()
      } else {
        showActionError(
          await readApiError(
            response,
            isDe
              ? "Workspace konnte nicht erstellt werden"
              : "Could not create workspace"
          )
        )
      }
    } catch (error) {
      console.error(
        "CREATE WORKSPACE ERROR:",
        error
      )

      toast.error(
        isDe
          ? "Workspace konnte nicht erstellt werden"
          : "Could not create workspace"
      )
    } finally {
      setCreating(false)
    }
  }

  /*
   * Mitglied einladen
   */
  const inviteMember = async ({
    email,
    role,
  }: {
    email: string
    role: WorkspaceRole
  }) => {
    if (!selectedWorkspace) {
      return
    }

    try {
      const response = await fetch(
        "/api/workspaces/invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id:
              selectedWorkspace.workspace.id,
            email,
            role,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()

        if (data.inviteUrl) {
          try {
            await navigator.clipboard.writeText(
              data.inviteUrl
            )
          } catch {
            // Clipboard darf fehlschlagen.
            // Die E-Mail wurde trotzdem versendet.
          }
        }

        toast.success(
          isDe
            ? "Einladung erstellt"
            : "Invite created"
        )

        setInviteOpen(false)

        await load(
          selectedWorkspace.workspace.id
        )
      } else {
        showActionError(
          await readApiError(
            response,
            isDe
              ? "Einladung konnte nicht erstellt werden"
              : "Could not create invite"
          )
        )
      }
    } catch (error) {
      console.error(
        "INVITE MEMBER ERROR:",
        error
      )

      toast.error(
        isDe
          ? "Einladung konnte nicht erstellt werden"
          : "Could not create invite"
      )
    }
  }

  /*
   * Rolle ändern
   */
  const updateRole = async (
    userId: string,
    role: WorkspaceRole
  ) => {
    if (!selectedWorkspace) {
      return
    }

    const response = await fetch(
      "/api/workspaces/update-role",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id:
            selectedWorkspace.workspace.id,
          user_id: userId,
          role,
        }),
      }
    )

    if (response.ok) {
      toast.success(
        isDe
          ? "Rolle aktualisiert"
          : "Role updated"
      )

      await load(
        selectedWorkspace.workspace.id
      )
    } else {
      showActionError(
        await readApiError(
          response,
          isDe
            ? "Rolle konnte nicht aktualisiert werden"
            : "Could not update role"
        )
      )
    }
  }

  /*
   * Mitglied entfernen
   */
  const removeMember = async (
    userId: string
  ) => {
    if (!selectedWorkspace) {
      return
    }

    const response = await fetch(
      "/api/workspaces/remove-member",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id:
            selectedWorkspace.workspace.id,
          user_id: userId,
        }),
      }
    )

    if (response.ok) {
      toast.success(
        isDe
          ? "Mitglied entfernt"
          : "Member removed"
      )

      await load(
        selectedWorkspace.workspace.id
      )
    } else {
      showActionError(
        await readApiError(
          response,
          isDe
            ? "Mitglied konnte nicht entfernt werden"
            : "Could not remove member"
        )
      )
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isDe ? "Workspace" : "Workspace"}
          </h1>

          <p className="mt-1 text-foreground/60">
            {isDe
              ? "Mitglieder, Einladungen und Workspaces verwalten."
              : "Manage members, invitations, and workspaces."}
          </p>
        </div>

{inviteToken ? (
  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
    <p className="text-lg font-semibold text-foreground">
      {isDe
        ? "Du wurdest eingeladen"
        : "You have been invited"}
    </p>

    <p className="mt-2 text-sm text-foreground/70">
      {isDe
        ? "Du wurdest eingeladen, einem Workspace auf CloseFlow beizutreten."
        : "You have been invited to join a workspace on CloseFlow."}
    </p>

    <button
      onClick={() => void acceptInvite()}
      disabled={acceptingInvite}
      className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {acceptingInvite
        ? isDe
          ? "Wird angenommen..."
          : "Accepting..."
        : isDe
          ? "Einladung annehmen"
          : "Accept invitation"}
    </button>
  </div>
) : null}

        {!twoFactorEnabled ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-300">
              {isDe
                ? "Sicherheitsempfehlung: Aktiviere 2FA, bevor du Workspace-Mitglieder verwaltest."
                : "Security recommendation: enable 2FA before managing workspace members."}
            </p>

            <p className="mt-1 text-sm text-amber-100/80">
              {isDe
                ? "Sensible Aktionen können blockiert werden, bis deine Sitzung AAL2 erreicht."
                : "Sensitive actions can be blocked until your session reaches AAL2."}
            </p>

            <Link
              href="/settings#security"
              className="mt-3 inline-flex rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200"
            >
              {isDe
                ? "Sicherheitseinstellungen öffnen"
                : "Open Security Settings"}
            </Link>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">
            {isDe
              ? "Workspace wird geladen..."
              : "Loading workspace..."}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <WorkspaceSwitcher
                workspaces={workspaces.map(
                  (bundle) =>
                    bundle.workspace
                )}
                selectedWorkspaceId={
                  selectedWorkspace?.workspace
                    .id || null
                }
                onSelect={(workspaceId) =>
                  setSelectedWorkspaceId(
                    workspaceId
                  )
                }
              />

              <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                <p className="text-sm text-foreground/65">
                  {isDe
                    ? "Workspace erstellen"
                    : "Create workspace"}
                </p>

                <div className="mt-3 flex gap-3">
                  <input
                    value={workspaceName}
                    onChange={(event) =>
                      setWorkspaceName(
                        event.target.value
                      )
                    }
                    placeholder={
                      isDe
                        ? "Neuer Workspace-Name"
                        : "New workspace name"
                    }
                    className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
                  />

                  <button
                    onClick={() =>
                      void createWorkspace()
                    }
                    disabled={creating}
                    className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black disabled:opacity-60"
                  >
                    {creating
                      ? isDe
                        ? "Erstelle..."
                        : "Creating..."
                      : isDe
                        ? "Erstellen"
                        : "Create"}
                  </button>
                </div>
              </div>
            </div>

            {selectedWorkspace ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard
                    label="Plan"
                    value={
                      selectedWorkspace.workspace
                        .plan
                    }
                  />

                  <StatCard
                    label={
                      isDe
                        ? "Mitglieder"
                        : "Members"
                    }
                    value={String(
                      selectedWorkspace.members
                        .length
                    )}
                  />

                  <StatCard
                    label={
                      isDe
                        ? "Einladungen"
                        : "Invites"
                    }
                    value={String(
                      selectedWorkspace.invites
                        .length
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      setInviteOpen(true)
                    }
                    className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
                  >
                    {isDe
                      ? "Nutzer einladen"
                      : "Invite User"}
                  </button>
                </div>

                <MemberTable
                  members={
                    selectedWorkspace.members
                  }
                  currentUserId={null}
                  onUpdateRole={updateRole}
                  onRemoveMember={removeMember}
                />

                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {isDe
                      ? "Ausstehende Einladungen"
                      : "Pending invites"}
                  </h2>

                  <div className="mt-4 space-y-2">
                    {selectedWorkspace.invites
                      .length === 0 ? (
                      <p className="text-sm text-foreground/55">
                        {isDe
                          ? "Keine ausstehenden Einladungen."
                          : "No pending invites."}
                      </p>
                    ) : (
                      selectedWorkspace.invites.map(
                        (invite) => (
                          <div
                            key={invite.id}
                            className="rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-sm text-foreground/80"
                          >
                            {invite.email} ·{" "}
                            {invite.role}
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        <InviteMemberModal
          open={inviteOpen}
          onClose={() =>
            setInviteOpen(false)
          }
          onInvite={inviteMember}
        />
      </div>
    </AuthGuard>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-sm text-foreground/60">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-foreground">
        {value}
      </p>
    </div>
  )
}