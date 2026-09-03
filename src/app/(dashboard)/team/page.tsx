"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";
import InviteMemberModal from "@/components/team/InviteMemberModal";
import MemberTable from "@/components/team/MemberTable";
import WorkspaceSwitcher from "@/components/team/WorkspaceSwitcher";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
import type { Workspace, WorkspaceInvite, WorkspaceMember, WorkspaceRole, } from "@/types";
type WorkspaceBundle = {
    workspace: Workspace;
    members: WorkspaceMember[];
    invites: WorkspaceInvite[];
};
export default function TeamPage() {
    const { language } = useAppPreferences();
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [acceptingInvite, setAcceptingInvite] = useState(false);
    const [workspaces, setWorkspaces] = useState<WorkspaceBundle[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [workspaceName, setWorkspaceName] = useState("");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const readApiError = async (response: Response, fallback: string) => {
        try {
            const data = (await response.json()) as {
                error?: string;
            };
            return data.error || fallback;
        }
        catch {
            try {
                const text = await response.text();
                return text || fallback;
            }
            catch {
                return fallback;
            }
        }
    };
    const showActionError = (message: string) => {
        if (message
            .toLowerCase()
            .includes("two-factor authentication required")) {
            toast.error("2FA required for this action. Verify 2FA in Settings -> Security.");
            return;
        }
        toast.error(message);
    };
    /*
    * Load workspaces.
     *
     * preferredWorkspaceId wird verwendet, wenn wir
     * gerade eine Einladung angenommen haben.
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
                /*
                 * 1. The invite workspace has highest priority.
                 */
                if (preferredWorkspaceId &&
                    data.some((bundle) => bundle.workspace.id ===
                        preferredWorkspaceId)) {
                    return preferredWorkspaceId;
                }
                /*
                 * 2. Keep the currently selected workspace
                 * if it is still available.
                 */
                if (current &&
                    data.some((bundle) => bundle.workspace.id === current)) {
                    return current;
                }
                /*
                 * 3. Fall back to the first workspace.
                 */
                return data[0]?.workspace.id || null;
            });
        }
        catch (error) {
            console.error("LOAD WORKSPACES ERROR:", error);
            toast.error("Could not load workspaces");
        }
        finally {
            setLoading(false);
        }
    };
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
                toast.error(data.error ||
                    ("Could not accept invitation."));
                return;
            }
            const invitedWorkspaceId = data.workspaceId;
            toast.success("Invitation accepted");
            setInviteToken(null);
            window.history.replaceState({}, "", "/team");
            await load(invitedWorkspaceId);
        }
        catch (error) {
            console.error("ACCEPT INVITE ERROR:", error);
            toast.error("Could not accept invitation.");
        }
        finally {
            setAcceptingInvite(false);
        }
    };
    /*
    * Accept an invitation.
     *
     * URL:
     * /team?invite=TOKEN
     */
    useEffect(() => {
        const acceptInvite = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get("invite");
            if (!token) {
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
                        token,
                    }),
                });
                const data = await response.json();
                if (!response.ok) {
                    toast.error(data.error ||
                        ("Could not accept invitation."));
                    return;
                }
                const invitedWorkspaceId = data.workspaceId;
                toast.success("Invitation accepted");
                /*
                 * Remove the token from the URL.
                 */
                window.history.replaceState({}, "", "/team");
                /*
                 * Reload workspaces. The invited workspace
                 * is then selected automatically.
                 */
                await load(invitedWorkspaceId);
            }
            catch (error) {
                console.error("ACCEPT INVITE ERROR:", error);
                toast.error("Could not accept invitation.");
            }
            finally {
                setAcceptingInvite(false);
            }
        };
        void acceptInvite();
    }, []);
    /*
    * Normal workspace loading.
     *
    * When an invite is present, the other effect
    * handles the invitation flow.
     */
    useEffect(() => {
        void load();
    }, []);
    /*
    * Load the 2FA status.
     */
    useEffect(() => {
        const loadSecurityState = async () => {
            const { data: { user }, } = await supabase.auth.getUser();
            setTwoFactorEnabled(Boolean(user?.user_metadata
                ?.two_factor_enabled));
        };
        void loadSecurityState();
    }, []);
    const selectedWorkspace = useMemo(() => workspaces.find((bundle) => bundle.workspace.id ===
        selectedWorkspaceId) ||
        workspaces[0] ||
        null, [selectedWorkspaceId, workspaces]);
    /*
    * Create workspace
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
                setWorkspaceName("");
                toast.success("Workspace created");
                await load();
            }
            else {
                showActionError(await readApiError(response, "Could not create workspace"));
            }
        }
        catch (error) {
            console.error("CREATE WORKSPACE ERROR:", error);
            toast.error("Could not create workspace");
        }
        finally {
            setCreating(false);
        }
    };
    /*
     * Mitglied einladen
     */
    const inviteMember = async ({ email, role, }: {
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
                        await navigator.clipboard.writeText(data.inviteUrl);
                    }
                    catch {
                        // Clipboard darf fehlschlagen.
                        // The email was sent anyway.
                    }
                }
                toast.success("Invite created");
                setInviteOpen(false);
                await load(selectedWorkspace.workspace.id);
            }
            else {
                showActionError(await readApiError(response, "Could not create invite"));
            }
        }
        catch (error) {
            console.error("INVITE MEMBER ERROR:", error);
            toast.error("Could not create invite");
        }
    };
    /*
    * Change role
     */
    const updateRole = async (userId: string, role: WorkspaceRole) => {
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
        }
        else {
            showActionError(await readApiError(response, "Could not update role"));
        }
    };
    /*
     * Mitglied entfernen
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
        }
        else {
            showActionError(await readApiError(response, "Could not remove member"));
        }
    };
    return (<AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {"Workspace"}
          </h1>

          <p className="mt-1 text-foreground/60">
            {"Manage members, invitations, and workspaces."}
          </p>
        </div>

        {inviteToken ? (<div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
    <p className="text-lg font-semibold text-foreground">
      {"You have been invited"}
    </p>

    <p className="mt-2 text-sm text-foreground/70">
      {"You have been invited to join a workspace on CloseFlow."}
    </p>

    <button onClick={() => void acceptInvite()} disabled={acceptingInvite} className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
      {acceptingInvite
                ?
                    "Accepting..."
                :
                    "Accept invitation"}
    </button>
  </div>) : null}

        {!twoFactorEnabled ? (<div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-300">
              {"Security recommendation: enable 2FA before managing workspace members."}
            </p>

            <p className="mt-1 text-sm text-amber-100/80">
              {"Sensitive actions can be blocked until your session reaches AAL2."}
            </p>

            <Link href="/settings#security" className="mt-3 inline-flex rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
              {"Open Security Settings"}
            </Link>
          </div>) : null}

        {loading ? (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 text-foreground">
            {"Loading workspace..."}
          </div>) : (<>
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <WorkspaceSwitcher workspaces={workspaces.map((bundle) => bundle.workspace)} selectedWorkspaceId={selectedWorkspace?.workspace
                .id || null} onSelect={(workspaceId) => setSelectedWorkspaceId(workspaceId)}/>

              <div className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
                <p className="text-sm text-foreground/65">
                  {"Create workspace"}
                </p>

                <div className="mt-3 flex gap-3">
                  <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder={"New workspace name"} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"/>

                  <button onClick={() => void createWorkspace()} disabled={creating} className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black disabled:opacity-60">
                    {creating
                ?
                    "Creating..."
                :
                    "Create"}
                  </button>
                </div>
              </div>
            </div>

            {selectedWorkspace ? (<>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Plan" value={selectedWorkspace.workspace
                    .plan}/>

                  <StatCard label={"Members"} value={String(selectedWorkspace.members
                    .length)}/>

                  <StatCard label={"Invites"} value={String(selectedWorkspace.invites
                    .length)}/>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setInviteOpen(true)} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                    {"Invite User"}
                  </button>
                </div>

                <MemberTable members={selectedWorkspace.members} currentUserId={null} onUpdateRole={updateRole} onRemoveMember={removeMember}/>

                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {"Pending invites"}
                  </h2>

                  <div className="mt-4 space-y-2">
                    {selectedWorkspace.invites
                    .length === 0 ? (<p className="text-sm text-foreground/55">
                        {"No pending invites."}
                      </p>) : (selectedWorkspace.invites.map((invite) => (<div key={invite.id} className="rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-sm text-foreground/80">
                            {invite.email} ·{" "}
                            {invite.role}
                          </div>)))}
                  </div>
                </div>
              </>) : null}
          </>)}

        <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={inviteMember}/>
      </div>
    </AuthGuard>);
}
function StatCard({ label, value, }: {
    label: string;
    value: string;
}) {
    return (<div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <p className="text-sm text-foreground/60">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-foreground">
        {value}
      </p>
    </div>);
}
