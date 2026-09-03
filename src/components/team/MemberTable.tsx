"use client";
import RoleSelector from "@/components/team/RoleSelector";
import type { WorkspaceMember, WorkspaceRole } from "@/types";
type MemberTableProps = {
    members: WorkspaceMember[];
    currentUserId?: string | null;
    onUpdateRole: (userId: string, role: WorkspaceRole) => Promise<void> | void;
    onRemoveMember: (userId: string) => Promise<void> | void;
};
export default function MemberTable({ members, currentUserId, onUpdateRole, onRemoveMember }: MemberTableProps) {
    return (<div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="text-xl font-semibold text-foreground">Members</h2>
      </div>

      <div className="divide-y divide-border-subtle">
        {members.map((member) => {
            const profile = member.profile;
            const isOwner = member.role === "owner";
            const isCurrentUser = member.user_id === currentUserId;
            return (<div key={member.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-sm font-semibold text-foreground">
                  {profile?.full_name?.slice(0, 1)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profile?.full_name || "Team member"}</p>
                  <p className="text-xs text-foreground/55">{profile?.company_name || member.user_id}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/65">{member.role}</span>
                <RoleSelector value={member.role} onChange={(role) => void onUpdateRole(member.user_id, role)} disabled={isOwner || isCurrentUser}/>
                <button type="button" onClick={() => void onRemoveMember(member.user_id)} disabled={isOwner || isCurrentUser} className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 disabled:opacity-50">
                  Remove
                </button>
              </div>
            </div>);
        })}
      </div>
    </div>);
}
