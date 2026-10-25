"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import InviteMemberModal from "@/components/team/InviteMemberModal";
import MemberTable from "@/components/team/MemberTable";
import WorkspaceSwitcher from "@/components/team/WorkspaceSwitcher";
import { supabase } from "@/lib/supabase/client";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getOwnedWorkspaceCapacity } from "@/lib/workspaceCapacity";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import type {
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceRole,
} from "@/types";

type WorkspaceBundle = {
  workspace: Workspace;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
};

export default function TeamPage() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceBundle[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );

  const workspaceIds = useMemo(
    () => workspaces.map((bundle) => bundle.workspace.id),
    [workspaces],
  );

  const { activeWorkspaceId, selectWorkspace } =
    useActiveWorkspace(workspaceIds);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const readApiError = async (
    response: Response,
    fallback: string,
  ): Promise<string> => {
    try {
      const data = (await response.json()) as {
        error?: string;
      };

      return data.error || fallback;
    } catch {
      try {
        const text = await response.text();
        return text || fallback;
      } catch {
        return fallback;
      }
    }
  };

  const showActionError = (message: string) => {
    if (
      message
        .toLowerCase()
        .includes("two-factor authentication required")
    ) {
      toast.error(
        "2FA required for this action. Verify 2FA in Settings -> Security.",
      );
      return;
    }

    toast.error(message);
  };

  /**
   * Load all workspaces.
   *
   * preferredWorkspaceId is used after accepting an invitation so the
   * newly joined workspace can be selected automatically.
   */
  const load = async (preferredWorkspaceId?: string) => {
    setLoading(true);

    try {
      const response = await fetch("/api/workspaces", {
        cache: "no-store",
      });

      if (!response.ok) {
        toast.error("Could not load workspaces");
        return;
      }

      const data = (await response.json()) as WorkspaceBundle[];

      setWorkspaces(data);

      setSelectedWorkspaceId((current) => {
        if (
          preferredWorkspaceId &&
          data.some(
            (bundle) => bundle.workspace.id === preferredWorkspaceId,
          )
        ) {
          selectWorkspace(preferredWorkspaceId);
          return preferredWorkspaceId;
        }

        if (
          activeWorkspaceId &&
          data.some((bundle) => bundle.workspace.id === activeWorkspaceId)
        ) {
          return activeWorkspaceId;
        }

        if (
          current &&
          data.some((bundle) => bundle.workspace.id === current)
        ) {
          return current;
        }

        const fallback = data[0]?.workspace.id || null;

        if (fallback) {
          selectWorkspace(fallback);
        }

        return fallback;
      });
    } catch (error) {
      console.error("LOAD WORKSPACES ERROR:", error);
      toast.error("Could not load workspaces");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Accept an invitation using the token currently stored in state.
   */
  const acceptInvite = async () => {
    if (!inviteToken) {
      return;
    }

    setAcceptingInvite(true);

    try {
      const response = await fetch("/api/workspaces/invite/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: inviteToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Could not accept invitation.");
        return;
      }

      const invitedWorkspaceId = data.workspaceId;

      toast.success("Invitation accepted");
      setInviteToken(null);

      window.history.replaceState({}, "", "/team");

      await load(invitedWorkspaceId);
    } catch (error) {
      console.error("ACCEPT INVITE ERROR:", error);
      toast.error("Could not accept invitation.");
    } finally {
      setAcceptingInvite(false);
    }
  };

  /**
   * Accept an invitation when the page is opened with:
   * /team?invite=TOKEN
   */
  useEffect(() => {
    const acceptInviteFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invite");

      if (!token) {
        return;
      }

      setInviteToken(token);
      setAcceptingInvite(true);

      try {
        const response = await fetch("/api/workspaces/invite/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Could not accept invitation.");
          return;
        }

        const invitedWorkspaceId = data.workspaceId;

        toast.success("Invitation accepted");

        window.history.replaceState({}, "", "/team");

        await load(invitedWorkspaceId);
      } catch (error) {
        console.error("ACCEPT INVITE ERROR:", error);
        toast.error("Could not accept invitation.");
      } finally {
        setAcceptingInvite(false);
        setInviteToken(null);
      }
    };

    void acceptInviteFromUrl();
  }, []);

  /**
   * Normal workspace loading.
   */
  useEffect(() => {
    void load();
  }, []);

  /**
   * Load the current 2FA status.
   */
  useEffect(() => {
    const loadSecurityState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id || "");
      setTwoFactorEnabled(
        Boolean(user?.user_metadata?.two_factor_enabled),
      );
    };

    void loadSecurityState();
  }, []);

  const effectiveWorkspaceId =
    activeWorkspaceId || selectedWorkspaceId;

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find(
        (bundle) => bundle.workspace.id === effectiveWorkspaceId,
      ) ||
      workspaces[0] ||
      null,
    [effectiveWorkspaceId, workspaces],
  );

  const workspaceCapacity = useMemo(
    () =>
      getOwnedWorkspaceCapacity(
        workspaces.map((bundle) => bundle.workspace),
        userId,
      ),
    [userId, workspaces],
  );

  /**
   * Create a new workspace.
   */
  const createWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workspaceName,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          workspace?: { id?: string };
        };
        setWorkspaceName("");
        toast.success("Workspace created");
        await load(data.workspace?.id);
      } else {
        showActionError(
          await readApiError(
            response,
            "Could not create workspace",
          ),
        );
      }
    } catch (error) {
      console.error("CREATE WORKSPACE ERROR:", error);
      toast.error("Could not create workspace");
    } finally {
      setCreating(false);
    }
  };

  /**
   * Invite a workspace member.
   */
  const inviteMember = async ({
    email,
    role,
  }: {
    email: string;
    role: WorkspaceRole;
  }) => {
    if (!selectedWorkspace) {
      return;
    }

    try {
      const response = await fetch("/api/workspaces/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: selectedWorkspace.workspace.id,
          email,
          role,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.inviteUrl) {
          try {
            await copyTextToClipboard(data.inviteUrl);
          } catch {
            toast.error("Invite created, but its link could not be copied.");
          }
        }

        toast.success("Invite created");
        setInviteOpen(false);

        await load(selectedWorkspace.workspace.id);
      } else {
        showActionError(
          await readApiError(
            response,
            "Could not create invite",
          ),
        );
      }
    } catch (error) {
      console.error("INVITE MEMBER ERROR:", error);
      toast.error("Could not create invite");
    }
  };

  /**
   * Change a member's workspace role.
   */
  const updateRole = async (
    userId: string,
    role: WorkspaceRole,
  ) => {
    if (!selectedWorkspace) {
      return;
    }

    const response = await fetch("/api/workspaces/update-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspace_id: selectedWorkspace.workspace.id,
        user_id: userId,
        role,
      }),
    });

    if (response.ok) {
      toast.success("Role updated");
      await load(selectedWorkspace.workspace.id);
    } else {
      showActionError(
        await readApiError(
          response,
          "Could not update role",
        ),
      );
    }
  };

  /**
   * Remove a member from the workspace.
   */
  const removeMember = async (userId: string) => {
    if (!selectedWorkspace) {
      return;
    }

    const response = await fetch("/api/workspaces/remove-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspace_id: selectedWorkspace.workspace.id,
        user_id: userId,
      }),
    });

    if (response.ok) {
      toast.success("Member removed");
      await load(selectedWorkspace.workspace.id);
    } else {
      showActionError(
        await readApiError(
          response,
          "Could not remove member",
        ),
      );
    }
  };

  /**
   * Revoke a pending invitation.
   */
  const revokeInvite = async (inviteId: string) => {
    if (!selectedWorkspace) {
      return;
    }

    const response = await fetch("/api/workspaces/invite/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspace_id: selectedWorkspace.workspace.id,
        invite_id: inviteId,
      }),
    });

    if (response.ok) {
      toast.success("Invite revoked");
      await load(selectedWorkspace.workspace.id);
    } else {
      showActionError(
        await readApiError(
          response,
          "Could not revoke invite",
        ),
      );
    }
  };

  const currentRole =
    selectedWorkspace?.members.find((member) => member.user_id === userId)
      ?.role ?? null;
  const canManageMembers = currentRole === "owner" || currentRole === "admin";
  const canInvite = canManageMembers || (currentRole as string | null) === "sales_manager";

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
            Team
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Members and invitations
          </h1>

          <p className="mt-2 text-sm text-foreground/65">
            Manage members, invitations, and workspaces.
          </p>
        </div>

        {inviteToken ? (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
            <p className="text-lg font-semibold text-foreground">
              You have been invited
            </p>

            <p className="mt-2 text-sm text-foreground/70">
              You have been invited to join a workspace on CloseFlow.
            </p>

            <button
              onClick={() => void acceptInvite()}
              disabled={acceptingInvite}
              className="cf-btn-primary mt-4"
            >
              {acceptingInvite
                ? "Accepting..."
                : "Accept invitation"}
            </button>
          </div>
        ) : null}

        {!twoFactorEnabled ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-300">
              Security recommendation: enable 2FA before managing workspace
              members.
            </p>

            <p className="mt-1 text-sm text-amber-100/80">
              Sensitive actions can be blocked until your session reaches AAL2.
            </p>

            <Link
              href="/settings#security"
              className="mt-3 inline-flex rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200"
            >
              Open Security Settings
            </Link>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">
            Loading workspace...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <WorkspaceSwitcher
                workspaces={workspaces.map(
                  (bundle) => bundle.workspace,
                )}
                selectedWorkspaceId={
                  selectedWorkspace?.workspace.id || null
                }
                onSelect={(workspaceId) => {
                  selectWorkspace(workspaceId);
                  setSelectedWorkspaceId(workspaceId);
                }}
              />

              <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                <p className="text-sm text-foreground/65">
                  Create workspace
                </p>
                <p className="mt-2 text-xs text-foreground/55">
                  Owned workspaces: {workspaceCapacity.ownedCount}/{workspaceCapacity.limit}.
                  Each workspace starts on Free and has separate plan billing.
                </p>

                <div className="mt-3 flex gap-3">
                  <input
                    value={workspaceName}
                    onChange={(event) =>
                      setWorkspaceName(event.target.value)
                    }
                    placeholder="New workspace name"
                    disabled={!workspaceCapacity.canCreate}
                    className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
                  />

                  <button
                    onClick={() => void createWorkspace()}
                    disabled={creating || !userId || !workspaceCapacity.canCreate}
                    className="cf-btn-primary"
                  >
                    {creating
                      ? "Creating..."
                      : workspaceCapacity.canCreate
                        ? "Create"
                        : "Limit reached"}
                  </button>
                </div>
              </div>
            </div>

            {selectedWorkspace ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard
                    label="Plan"
                    value={selectedWorkspace.workspace.plan}
                  />

                  <StatCard
                    label="Members"
                    value={String(
                      selectedWorkspace.members.length,
                    )}
                  />

                  <StatCard
                    label="Invites"
                    value={String(
                      selectedWorkspace.invites.length,
                    )}
                  />
                </div>

                {canInvite ? (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setInviteOpen(true)}
                      className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
                    >
                      Invite User
                    </button>
                  </div>
                ) : null}

                <MemberTable
                  members={selectedWorkspace.members}
                  currentUserId={userId}
                  canManage={canManageMembers}
                  onUpdateRole={updateRole}
                  onRemoveMember={removeMember}
                />

                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Pending invites
                  </h2>

                  <div className="mt-4 space-y-2">
                    {selectedWorkspace.invites.length === 0 ? (
                      <p className="text-sm text-foreground/55">
                        No pending invites.
                      </p>
                    ) : (
                      selectedWorkspace.invites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-sm text-foreground/80"
                        >
                          <span>
                            {invite.email} · {invite.role}
                          </span>
                          {canInvite ? (
                            <button
                              type="button"
                              onClick={() => void revokeInvite(invite.id)}
                              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-300"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        <InviteMemberModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvite={inviteMember}
        />
      </div>
    </AuthGuard>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-sm text-foreground/60">{label}</p>

      <p className="mt-2 text-2xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
